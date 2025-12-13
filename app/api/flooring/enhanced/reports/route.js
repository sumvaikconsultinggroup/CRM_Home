import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Generate reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const period = parseInt(searchParams.get('period')) || 30
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Collections
    const products = db.collection('flooring_products')
    const quotes = db.collection('flooring_quotes_v2')
    const invoices = db.collection('flooring_invoices')
    const payments = db.collection('flooring_payments')
    const inventory = db.collection('flooring_inventory_v2')
    const installations = db.collection('flooring_installations')
    const projects = db.collection('flooring_projects')
    const customers = db.collection('flooring_customers')
    const leads = db.collection('leads')

    const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - period * 24 * 60 * 60 * 1000)
    const periodEnd = endDate ? new Date(endDate) : new Date()

    const dateFilter = {
      createdAt: { $gte: periodStart.toISOString(), $lte: periodEnd.toISOString() }
    }

    switch (type) {
      case 'summary': {
        const [allQuotes, allInvoices, allPayments, allProducts, allInstallations, allProjects] = await Promise.all([
          quotes.find({}).toArray(),
          invoices.find({}).toArray(),
          payments.find({}).toArray(),
          products.find({}).toArray(),
          installations.find({}).toArray(),
          projects.find({}).toArray()
        ])

        const periodQuotes = allQuotes.filter(q => new Date(q.createdAt) >= periodStart && new Date(q.createdAt) <= periodEnd)
        const periodInvoices = allInvoices.filter(i => new Date(i.createdAt) >= periodStart && new Date(i.createdAt) <= periodEnd)
        const periodPayments = allPayments.filter(p => new Date(p.createdAt) >= periodStart && new Date(p.createdAt) <= periodEnd)

        return successResponse({
          type: 'summary',
          period: { start: periodStart, end: periodEnd, days: period },
          overview: {
            totalQuotes: allQuotes.length,
            periodQuotes: periodQuotes.length,
            totalQuoteValue: allQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
            periodQuoteValue: periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
            approvedQuotes: allQuotes.filter(q => q.status === 'approved').length,
            conversionRate: allQuotes.length > 0 ? Math.round((allQuotes.filter(q => q.status === 'approved').length / allQuotes.length) * 100) : 0,
            totalInvoices: allInvoices.length,
            periodInvoices: periodInvoices.length,
            totalInvoiceValue: allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
            periodInvoiceValue: periodInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
            totalCollected: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
            periodCollected: periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
            pendingAmount: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
            totalProducts: allProducts.length,
            activeInstallations: allInstallations.filter(i => ['scheduled', 'in_progress'].includes(i.status)).length,
            completedInstallations: allInstallations.filter(i => i.status === 'completed').length,
            totalProjects: allProjects.length
          },
          quotesByStatus: {
            draft: allQuotes.filter(q => q.status === 'draft').length,
            sent: allQuotes.filter(q => q.status === 'sent').length,
            approved: allQuotes.filter(q => q.status === 'approved').length,
            rejected: allQuotes.filter(q => q.status === 'rejected').length,
            converted: allQuotes.filter(q => q.status === 'converted').length
          },
          invoicesByStatus: {
            draft: allInvoices.filter(i => i.status === 'draft').length,
            sent: allInvoices.filter(i => i.status === 'sent').length,
            partially_paid: allInvoices.filter(i => i.status === 'partially_paid').length,
            paid: allInvoices.filter(i => i.status === 'paid').length,
            overdue: allInvoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'paid').length
          }
        })
      }

      case 'sales': {
        const allQuotes = await quotes.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()

        // Group by month
        const monthlyData = {}
        allInvoices.forEach(inv => {
          const month = inv.createdAt.substring(0, 7)
          if (!monthlyData[month]) monthlyData[month] = { quotes: 0, quoteValue: 0, invoices: 0, revenue: 0 }
          monthlyData[month].invoices++
          monthlyData[month].revenue += inv.paidAmount || 0
        })
        allQuotes.forEach(q => {
          const month = q.createdAt.substring(0, 7)
          if (!monthlyData[month]) monthlyData[month] = { quotes: 0, quoteValue: 0, invoices: 0, revenue: 0 }
          monthlyData[month].quotes++
          monthlyData[month].quoteValue += q.grandTotal || 0
        })

        return successResponse({
          type: 'sales',
          monthlyTrend: Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0])).map(([month, data]) => ({ month, ...data })),
          topProducts: [],
          salesByCategory: []
        })
      }

      case 'quotes': {
        const allQuotes = await quotes.find({}).toArray()
        const periodQuotes = allQuotes.filter(q => new Date(q.createdAt) >= periodStart)

        // Conversion funnel
        const funnel = {
          created: periodQuotes.length,
          sent: periodQuotes.filter(q => q.sentAt).length,
          viewed: periodQuotes.filter(q => q.viewedAt).length,
          approved: periodQuotes.filter(q => q.status === 'approved' || q.status === 'converted').length,
          converted: periodQuotes.filter(q => q.status === 'converted').length
        }

        // Average values
        const avgQuoteValue = periodQuotes.length > 0 ? periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / periodQuotes.length : 0
        const avgTimeToApprove = 0 // Would need to calculate from timestamps

        return successResponse({
          type: 'quotes',
          funnel,
          averageQuoteValue: avgQuoteValue,
          quotesCreated: periodQuotes.length,
          quotesApproved: funnel.approved,
          quotesRejected: periodQuotes.filter(q => q.status === 'rejected').length,
          conversionRate: periodQuotes.length > 0 ? Math.round((funnel.approved / periodQuotes.length) * 100) : 0
        })
      }

      case 'invoices': {
        const allInvoices = await invoices.find({}).toArray()
        const periodInvoices = allInvoices.filter(i => new Date(i.createdAt) >= periodStart)

        return successResponse({
          type: 'invoices',
          totalInvoiced: periodInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
          totalCollected: periodInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
          totalPending: periodInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          invoiceCount: periodInvoices.length,
          paidCount: periodInvoices.filter(i => i.status === 'paid').length,
          overdueCount: periodInvoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'paid').length,
          overdueAmount: periodInvoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'paid').reduce((sum, i) => sum + (i.balanceAmount || 0), 0)
        })
      }

      case 'aging': {
        const allInvoices = await invoices.find({ status: { $ne: 'paid' } }).toArray()
        const now = new Date()

        const aging = {
          current: { count: 0, amount: 0 },
          '1-30': { count: 0, amount: 0 },
          '31-60': { count: 0, amount: 0 },
          '61-90': { count: 0, amount: 0 },
          '90+': { count: 0, amount: 0 }
        }

        allInvoices.forEach(inv => {
          const dueDate = new Date(inv.dueDate)
          const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
          const balance = inv.balanceAmount || 0

          if (daysPastDue < 0) {
            aging.current.count++
            aging.current.amount += balance
          } else if (daysPastDue <= 30) {
            aging['1-30'].count++
            aging['1-30'].amount += balance
          } else if (daysPastDue <= 60) {
            aging['31-60'].count++
            aging['31-60'].amount += balance
          } else if (daysPastDue <= 90) {
            aging['61-90'].count++
            aging['61-90'].amount += balance
          } else {
            aging['90+'].count++
            aging['90+'].amount += balance
          }
        })

        return successResponse({
          type: 'aging',
          aging,
          totalOutstanding: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0)
        })
      }

      case 'inventory': {
        const allInventory = await inventory.find({}).toArray()
        const allProducts = await products.find({}).toArray()
        const productMap = new Map(allProducts.map(p => [p.id, p]))

        const summary = {
          totalProducts: allInventory.length,
          totalQuantity: allInventory.reduce((sum, i) => sum + (i.quantity || 0), 0),
          totalValue: allInventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.avgCostPrice || 0)), 0),
          lowStock: allInventory.filter(i => i.availableQty <= (i.reorderLevel || 100) && i.availableQty > 0).length,
          outOfStock: allInventory.filter(i => i.availableQty <= 0).length
        }

        // By category
        const byCategory = {}
        allInventory.forEach(item => {
          const product = productMap.get(item.productId)
          const cat = product?.category || 'unknown'
          if (!byCategory[cat]) byCategory[cat] = { quantity: 0, value: 0 }
          byCategory[cat].quantity += item.quantity || 0
          byCategory[cat].value += (item.quantity || 0) * (item.avgCostPrice || 0)
        })

        return successResponse({
          type: 'inventory',
          summary,
          byCategory
        })
      }

      case 'products': {
        const allProducts = await products.find({}).toArray()
        const allQuotes = await quotes.find({}).toArray()

        // Calculate product popularity from quotes
        const productSales = {}
        allQuotes.forEach(q => {
          (q.items || []).forEach(item => {
            if (item.productId) {
              if (!productSales[item.productId]) productSales[item.productId] = { quantity: 0, revenue: 0 }
              productSales[item.productId].quantity += item.area || 0
              productSales[item.productId].revenue += item.totalPrice || 0
            }
          })
        })

        const topProducts = allProducts.map(p => ({
          ...p,
          sales: productSales[p.id] || { quantity: 0, revenue: 0 }
        })).sort((a, b) => b.sales.revenue - a.sales.revenue).slice(0, 10)

        return successResponse({
          type: 'products',
          totalProducts: allProducts.length,
          topProducts,
          byCategory: allProducts.reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1
            return acc
          }, {})
        })
      }

      case 'installations': {
        const allInstallations = await installations.find({}).toArray()
        const periodInstallations = allInstallations.filter(i => new Date(i.createdAt) >= periodStart)

        return successResponse({
          type: 'installations',
          total: periodInstallations.length,
          scheduled: periodInstallations.filter(i => i.status === 'scheduled').length,
          inProgress: periodInstallations.filter(i => i.status === 'in_progress').length,
          completed: periodInstallations.filter(i => i.status === 'completed').length,
          onHold: periodInstallations.filter(i => i.status === 'on_hold').length,
          totalAreaInstalled: periodInstallations.filter(i => i.status === 'completed').reduce((sum, i) => sum + (i.totalArea || 0), 0)
        })
      }

      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('Reports GET Error:', error)
    return errorResponse('Failed to generate report', 500, error.message)
  }
}
