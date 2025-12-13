import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Fetch all relevant data
    const [inventory, customers, projects, quotations, orders, invoices, vendors] = await Promise.all([
      db.collection('wf_inventory').find({}).toArray(),
      db.collection('wf_customers').find({}).toArray(),
      db.collection('wf_projects').find({}).toArray(),
      db.collection('wf_quotations').find({}).toArray(),
      db.collection('wf_orders').find({}).toArray(),
      db.collection('wf_invoices').find({}).toArray(),
      db.collection('wf_vendors').find({}).toArray()
    ])

    if (reportType === 'overview') {
      const report = {
        summary: {
          totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.grandTotal || 0), 0),
          pendingPayments: invoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          activeProjects: projects.filter(p => ['in_progress', 'confirmed'].includes(p.status)).length,
          totalCustomers: customers.length,
          inventoryValue: inventory.reduce((sum, i) => sum + (i.quantity * i.costPrice || 0), 0),
          lowStockItems: inventory.filter(i => i.quantity <= i.reorderLevel).length
        },
        projectPipeline: {
          inquiry: projects.filter(p => p.status === 'inquiry').length,
          siteVisit: projects.filter(p => p.status === 'site_visit').length,
          quotationSent: projects.filter(p => p.status === 'quotation_sent').length,
          confirmed: projects.filter(p => p.status === 'confirmed').length,
          inProgress: projects.filter(p => p.status === 'in_progress').length,
          completed: projects.filter(p => p.status === 'completed').length
        },
        quotationStats: {
          total: quotations.length,
          sent: quotations.filter(q => q.status === 'sent').length,
          accepted: quotations.filter(q => q.status === 'accepted').length,
          rejected: quotations.filter(q => q.status === 'rejected').length,
          conversionRate: quotations.length > 0 
            ? ((quotations.filter(q => q.status === 'accepted').length / quotations.length) * 100).toFixed(1)
            : 0,
          totalValue: quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
        },
        orderStats: {
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          processing: orders.filter(o => o.status === 'processing').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          installed: orders.filter(o => o.status === 'installed').length,
          totalValue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0)
        },
        revenueTrends: getMonthlyRevenue(invoices, 6),
        topProducts: getTopProducts(orders),
        recentProjects: projects.slice(0, 5).map(p => ({
          id: p.id,
          projectNumber: p.projectNumber,
          customerName: p.customerName,
          status: p.status,
          totalValue: p.totalValue,
          createdAt: p.createdAt
        }))
      }
      return successResponse(report)
    }

    if (reportType === 'inventory') {
      const report = {
        summary: {
          totalItems: inventory.length,
          totalValue: inventory.reduce((sum, i) => sum + (i.quantity * i.costPrice || 0), 0),
          lowStockItems: inventory.filter(i => i.quantity <= i.reorderLevel).length,
          outOfStock: inventory.filter(i => i.quantity === 0).length
        },
        byCategory: getCategoryBreakdown(inventory),
        lowStockAlert: inventory.filter(i => i.quantity <= i.reorderLevel).map(i => ({
          id: i.id, name: i.name, sku: i.sku, quantity: i.quantity, reorderLevel: i.reorderLevel, category: i.category
        })),
        inventoryTurnover: calculateInventoryTurnover(inventory, orders)
      }
      return successResponse(report)
    }

    if (reportType === 'sales') {
      const report = {
        summary: {
          totalSales: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.grandTotal || 0), 0),
          totalInvoices: invoices.length,
          paidInvoices: invoices.filter(i => i.status === 'paid').length,
          pendingAmount: invoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          averageOrderValue: orders.length > 0 
            ? (orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0) / orders.length).toFixed(2)
            : 0
        },
        monthlyRevenue: getMonthlyRevenue(invoices, 12),
        salesByProduct: getSalesByProduct(orders),
        topCustomers: getTopCustomers(invoices, customers)
      }
      return successResponse(report)
    }

    if (reportType === 'projects') {
      const report = {
        summary: {
          totalProjects: projects.length,
          completedProjects: projects.filter(p => p.status === 'completed').length,
          activeProjects: projects.filter(p => ['in_progress', 'confirmed'].includes(p.status)).length,
          totalProjectValue: projects.reduce((sum, p) => sum + (p.totalValue || 0), 0),
          averageProjectValue: projects.length > 0
            ? (projects.reduce((sum, p) => sum + (p.totalValue || 0), 0) / projects.length).toFixed(2)
            : 0
        },
        byStatus: {
          inquiry: projects.filter(p => p.status === 'inquiry').length,
          site_visit: projects.filter(p => p.status === 'site_visit').length,
          quotation_sent: projects.filter(p => p.status === 'quotation_sent').length,
          confirmed: projects.filter(p => p.status === 'confirmed').length,
          in_progress: projects.filter(p => p.status === 'in_progress').length,
          completed: projects.filter(p => p.status === 'completed').length
        },
        byPropertyType: getProjectsByPropertyType(projects),
        projectTimeline: projects.map(p => ({
          id: p.id, projectNumber: p.projectNumber, customerName: p.customerName, status: p.status,
          inquiryDate: p.inquiryDate, expectedEndDate: p.expectedEndDate, totalArea: p.totalArea
        }))
      }
      return successResponse(report)
    }

    return successResponse({ message: 'Invalid report type' })
  } catch (error) {
    console.error('Reports GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to generate report', 500, error.message)
  }
}

function getMonthlyRevenue(invoices, months) {
  const result = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate)
      return invDate >= monthStart && invDate <= monthEnd && inv.status === 'paid'
    })
    
    result.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: monthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
    })
  }
  
  return result
}

function getTopProducts(orders) {
  const productMap = {}
  
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      if (!productMap[item.name]) {
        productMap[item.name] = { name: item.name, quantity: 0, revenue: 0 }
      }
      productMap[item.name].quantity += item.quantity || 0
      productMap[item.name].revenue += item.total || 0
    })
  })
  
  return Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
}

function getCategoryBreakdown(inventory) {
  const categoryMap = {}
  
  inventory.forEach(item => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { category: item.category, items: 0, value: 0 }
    }
    categoryMap[item.category].items += 1
    categoryMap[item.category].value += (item.quantity * item.costPrice) || 0
  })
  
  return Object.values(categoryMap)
}

function calculateInventoryTurnover(inventory, orders) {
  const totalInventoryValue = inventory.reduce((sum, i) => sum + (i.quantity * i.costPrice || 0), 0)
  const totalSold = orders.reduce((sum, o) => {
    return sum + (o.items || []).filter(i => i.type === 'material').reduce((s, i) => s + (i.total || 0), 0)
  }, 0)
  
  return totalInventoryValue > 0 ? (totalSold / totalInventoryValue).toFixed(2) : 0
}

function getSalesByProduct(orders) {
  const productMap = {}
  
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      if (item.type !== 'labor') {
        if (!productMap[item.name]) {
          productMap[item.name] = { name: item.name, sales: 0 }
        }
        productMap[item.name].sales += item.total || 0
      }
    })
  })
  
  return Object.values(productMap).sort((a, b) => b.sales - a.sales).slice(0, 10)
}

function getTopCustomers(invoices, customers) {
  const customerMap = {}
  
  invoices.filter(i => i.status === 'paid').forEach(invoice => {
    if (!customerMap[invoice.customerId]) {
      const customer = customers.find(c => c.id === invoice.customerId)
      customerMap[invoice.customerId] = {
        id: invoice.customerId,
        name: invoice.customerName || customer?.name || 'Unknown',
        totalSpent: 0,
        invoiceCount: 0
      }
    }
    customerMap[invoice.customerId].totalSpent += invoice.grandTotal || 0
    customerMap[invoice.customerId].invoiceCount += 1
  })
  
  return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)
}

function getProjectsByPropertyType(projects) {
  const typeMap = {}
  
  projects.forEach(project => {
    const type = project.propertyType || 'Other'
    if (!typeMap[type]) {
      typeMap[type] = { type, count: 0, value: 0 }
    }
    typeMap[type].count += 1
    typeMap[type].value += project.totalValue || 0
  })
  
  return Object.values(typeMap)
}
