import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Generate comprehensive reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const period = parseInt(searchParams.get('period')) || 30
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month

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
    const contacts = db.collection('contacts')
    const leads = db.collection('leads')
    const users = db.collection('users')

    const now = new Date()
    const periodDays = period // Store period in days for comparison report
    const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - period * 24 * 60 * 60 * 1000)
    const periodEnd = endDate ? new Date(endDate) : new Date()

    // Helper to check if date is in period
    const inPeriod = (dateStr) => {
      if (!dateStr) return false
      const date = new Date(dateStr)
      return date >= periodStart && date <= periodEnd
    }

    // Helper to get month key
    const getMonthKey = (dateStr) => {
      if (!dateStr) return null
      return dateStr.substring(0, 7) // YYYY-MM format
    }

    // Helper to calculate percentage change
    const calcChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? '+100%' : '0%'
      const change = ((current - previous) / previous) * 100
      return (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
    }

    switch (type) {
      case 'summary': {
        // Fetch all data in parallel
        const [allQuotes, allInvoices, allPayments, allProducts, allInstallations, allProjects, allCustomers] = await Promise.all([
          quotes.find({}).toArray(),
          invoices.find({}).toArray(),
          payments.find({}).toArray(),
          products.find({}).toArray(),
          installations.find({}).toArray(),
          projects.find({}).toArray(),
          customers.find({}).toArray()
        ])

        // Period filtered data
        const periodQuotes = allQuotes.filter(q => inPeriod(q.createdAt))
        const periodInvoices = allInvoices.filter(i => inPeriod(i.createdAt))
        const periodPayments = allPayments.filter(p => inPeriod(p.createdAt))
        const periodInstallations = allInstallations.filter(i => inPeriod(i.createdAt))

        // Previous period data for comparison
        const prevPeriodStart = new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime()))
        const prevPeriodEnd = periodStart
        
        const prevQuotes = allQuotes.filter(q => {
          const d = new Date(q.createdAt)
          return d >= prevPeriodStart && d < prevPeriodEnd
        })
        const prevInvoices = allInvoices.filter(i => {
          const d = new Date(i.createdAt)
          return d >= prevPeriodStart && d < prevPeriodEnd
        })
        const prevPayments = allPayments.filter(p => {
          const d = new Date(p.createdAt)
          return d >= prevPeriodStart && d < prevPeriodEnd
        })

        // Calculate metrics
        const periodQuoteValue = periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
        const prevQuoteValue = prevQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
        
        const periodInvoiceValue = periodInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0)
        const prevInvoiceValue = prevInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0)
        
        const periodCollected = periodPayments.filter(p => (p.amount || 0) > 0).reduce((sum, p) => sum + (p.amount || 0), 0)
        const prevCollected = prevPayments.filter(p => (p.amount || 0) > 0).reduce((sum, p) => sum + (p.amount || 0), 0)

        const approvedQuotes = periodQuotes.filter(q => ['approved', 'invoiced'].includes(q.status)).length
        const conversionRate = periodQuotes.length > 0 ? Math.round((approvedQuotes / periodQuotes.length) * 100) : 0

        return successResponse({
          type: 'summary',
          period: { 
            start: periodStart.toISOString(), 
            end: periodEnd.toISOString(), 
            days: period 
          },
          overview: {
            // Total counts
            totalQuotes: allQuotes.length,
            totalInvoices: allInvoices.length,
            totalProducts: allProducts.length,
            totalCustomers: allCustomers.length,
            totalProjects: allProjects.length,
            
            // Period metrics
            periodQuotes: periodQuotes.length,
            periodQuoteValue: periodQuoteValue,
            quoteValueChange: calcChange(periodQuoteValue, prevQuoteValue),
            
            periodInvoices: periodInvoices.length,
            periodInvoiceValue: periodInvoiceValue,
            invoiceValueChange: calcChange(periodInvoiceValue, prevInvoiceValue),
            
            // Revenue
            totalCollected: allPayments.filter(p => (p.amount || 0) > 0).reduce((sum, p) => sum + (p.amount || 0), 0),
            periodCollected: periodCollected,
            collectedChange: calcChange(periodCollected, prevCollected),
            
            // Pending
            pendingAmount: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
            overdueAmount: allInvoices
              .filter(i => new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status))
              .reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
            
            // Conversion
            approvedQuotes: approvedQuotes,
            conversionRate: conversionRate,
            
            // Installations
            activeInstallations: allInstallations.filter(i => ['scheduled', 'in_progress'].includes(i.status)).length,
            completedInstallations: allInstallations.filter(i => i.status === 'completed').length,
            periodInstallations: periodInstallations.length
          },
          quotesByStatus: {
            draft: allQuotes.filter(q => q.status === 'draft').length,
            sent: allQuotes.filter(q => q.status === 'sent').length,
            approved: allQuotes.filter(q => q.status === 'approved').length,
            rejected: allQuotes.filter(q => q.status === 'rejected').length,
            invoiced: allQuotes.filter(q => q.status === 'invoiced').length,
            revised: allQuotes.filter(q => q.status === 'revised').length
          },
          invoicesByStatus: {
            draft: allInvoices.filter(i => i.status === 'draft').length,
            sent: allInvoices.filter(i => i.status === 'sent').length,
            partially_paid: allInvoices.filter(i => i.status === 'partially_paid').length,
            paid: allInvoices.filter(i => i.status === 'paid').length,
            cancelled: allInvoices.filter(i => i.status === 'cancelled').length,
            overdue: allInvoices.filter(i => new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status)).length
          },
          projectsByStatus: {
            pending: allProjects.filter(p => p.status === 'pending').length,
            measurement_done: allProjects.filter(p => p.status === 'measurement_done').length,
            quote_sent: allProjects.filter(p => p.status === 'quote_sent').length,
            invoice_sent: allProjects.filter(p => p.status === 'invoice_sent').length,
            completed: allProjects.filter(p => p.status === 'completed').length
          }
        })
      }

      case 'sales': {
        const allQuotes = await quotes.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()
        const allPayments = await payments.filter(p => (p.amount || 0) > 0).find({}).toArray()

        // Group by month
        const monthlyData = {}
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthlyData[key] = { 
            month: key,
            quotes: 0, 
            quoteValue: 0, 
            invoices: 0, 
            invoiceValue: 0,
            revenue: 0 
          }
        }

        allInvoices.forEach(inv => {
          const month = getMonthKey(inv.createdAt)
          if (monthlyData[month]) {
            monthlyData[month].invoices++
            monthlyData[month].invoiceValue += inv.grandTotal || 0
            monthlyData[month].revenue += inv.paidAmount || 0
          }
        })

        allQuotes.forEach(q => {
          const month = getMonthKey(q.createdAt)
          if (monthlyData[month]) {
            monthlyData[month].quotes++
            monthlyData[month].quoteValue += q.grandTotal || 0
          }
        })

        // Calculate top products from invoice items
        const productSales = {}
        allInvoices.forEach(inv => {
          (inv.items || []).forEach(item => {
            const key = item.productId || item.productName || 'Unknown'
            if (!productSales[key]) {
              productSales[key] = { 
                productId: item.productId,
                name: item.productName || item.name || key, 
                quantity: 0, 
                revenue: 0,
                category: item.category || 'Other'
              }
            }
            productSales[key].quantity += item.quantity || item.area || 0
            productSales[key].revenue += item.totalPrice || 0
          })
        })

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)

        return successResponse({
          type: 'sales',
          monthlyTrend: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
          topProducts,
          totalRevenue: allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
          totalQuoteValue: allQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
          averageOrderValue: allInvoices.length > 0 
            ? allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0) / allInvoices.length 
            : 0
        })
      }

      case 'quotes': {
        const allQuotes = await quotes.find({}).toArray()
        const periodQuotes = allQuotes.filter(q => inPeriod(q.createdAt))

        // Conversion funnel
        const funnel = {
          created: periodQuotes.length,
          sent: periodQuotes.filter(q => q.sentAt).length,
          viewed: periodQuotes.filter(q => q.viewedAt).length,
          approved: periodQuotes.filter(q => ['approved', 'invoiced'].includes(q.status)).length,
          invoiced: periodQuotes.filter(q => q.status === 'invoiced').length
        }

        // Average values
        const avgQuoteValue = periodQuotes.length > 0 
          ? periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / periodQuotes.length 
          : 0

        // Average time to approve (for approved quotes)
        const approvedQuotes = periodQuotes.filter(q => ['approved', 'invoiced'].includes(q.status) && q.createdAt)
        let avgTimeToApprove = 0
        if (approvedQuotes.length > 0) {
          const totalDays = approvedQuotes.reduce((sum, q) => {
            const approvalEntry = (q.statusHistory || []).find(h => h.status === 'approved')
            if (approvalEntry) {
              const created = new Date(q.createdAt)
              const approved = new Date(approvalEntry.timestamp)
              return sum + Math.ceil((approved - created) / (1000 * 60 * 60 * 24))
            }
            return sum
          }, 0)
          avgTimeToApprove = Math.round(totalDays / approvedQuotes.length)
        }

        return successResponse({
          type: 'quotes',
          funnel,
          averageQuoteValue: avgQuoteValue,
          averageTimeToApprove: avgTimeToApprove,
          quotesCreated: periodQuotes.length,
          quotesApproved: funnel.approved,
          quotesRejected: periodQuotes.filter(q => q.status === 'rejected').length,
          conversionRate: periodQuotes.length > 0 ? Math.round((funnel.approved / periodQuotes.length) * 100) : 0,
          byStatus: {
            draft: periodQuotes.filter(q => q.status === 'draft').length,
            sent: periodQuotes.filter(q => q.status === 'sent').length,
            approved: periodQuotes.filter(q => q.status === 'approved').length,
            rejected: periodQuotes.filter(q => q.status === 'rejected').length,
            invoiced: periodQuotes.filter(q => q.status === 'invoiced').length
          }
        })
      }

      case 'invoices': {
        const allInvoices = await invoices.find({}).toArray()
        const periodInvoices = allInvoices.filter(i => inPeriod(i.createdAt))

        // Calculate averages
        const avgDaysToPay = (() => {
          const paidInvoices = allInvoices.filter(i => i.status === 'paid' && i.paidAt && i.sentAt)
          if (paidInvoices.length === 0) return 0
          const totalDays = paidInvoices.reduce((sum, i) => {
            const sent = new Date(i.sentAt)
            const paid = new Date(i.paidAt)
            return sum + Math.ceil((paid - sent) / (1000 * 60 * 60 * 24))
          }, 0)
          return Math.round(totalDays / paidInvoices.length)
        })()

        return successResponse({
          type: 'invoices',
          totalInvoiced: periodInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
          totalCollected: periodInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
          totalPending: periodInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          invoiceCount: periodInvoices.length,
          paidCount: periodInvoices.filter(i => i.status === 'paid').length,
          partiallyPaidCount: periodInvoices.filter(i => i.status === 'partially_paid').length,
          overdueCount: periodInvoices.filter(i => new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status)).length,
          overdueAmount: periodInvoices
            .filter(i => new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status))
            .reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          averageDaysToPay: avgDaysToPay,
          collectionRate: periodInvoices.length > 0 
            ? Math.round((periodInvoices.filter(i => i.status === 'paid').length / periodInvoices.length) * 100) 
            : 0
        })
      }

      case 'aging': {
        const allInvoices = await invoices.find({ 
          status: { $nin: ['paid', 'cancelled'] } 
        }).toArray()

        const aging = {
          current: { count: 0, amount: 0, invoices: [] },
          '1-30': { count: 0, amount: 0, invoices: [] },
          '31-60': { count: 0, amount: 0, invoices: [] },
          '61-90': { count: 0, amount: 0, invoices: [] },
          '90+': { count: 0, amount: 0, invoices: [] }
        }

        allInvoices.forEach(inv => {
          const dueDate = new Date(inv.dueDate)
          const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
          const balance = inv.balanceAmount || 0
          
          const invoiceInfo = {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customer?.name,
            amount: balance,
            dueDate: inv.dueDate,
            daysPastDue
          }

          if (daysPastDue < 0) {
            aging.current.count++
            aging.current.amount += balance
            aging.current.invoices.push(invoiceInfo)
          } else if (daysPastDue <= 30) {
            aging['1-30'].count++
            aging['1-30'].amount += balance
            aging['1-30'].invoices.push(invoiceInfo)
          } else if (daysPastDue <= 60) {
            aging['31-60'].count++
            aging['31-60'].amount += balance
            aging['31-60'].invoices.push(invoiceInfo)
          } else if (daysPastDue <= 90) {
            aging['61-90'].count++
            aging['61-90'].amount += balance
            aging['61-90'].invoices.push(invoiceInfo)
          } else {
            aging['90+'].count++
            aging['90+'].amount += balance
            aging['90+'].invoices.push(invoiceInfo)
          }
        })

        // Sort invoices within each bucket by days past due
        Object.keys(aging).forEach(key => {
          aging[key].invoices.sort((a, b) => b.daysPastDue - a.daysPastDue)
        })

        return successResponse({
          type: 'aging',
          aging,
          totalOutstanding: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          overduePercentage: allInvoices.length > 0 
            ? Math.round((allInvoices.filter(i => new Date(i.dueDate) < now).length / allInvoices.length) * 100) 
            : 0
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
          if (!byCategory[cat]) byCategory[cat] = { quantity: 0, value: 0, items: 0 }
          byCategory[cat].quantity += item.quantity || 0
          byCategory[cat].value += (item.quantity || 0) * (item.avgCostPrice || 0)
          byCategory[cat].items++
        })

        // Low stock items
        const lowStockItems = allInventory
          .filter(i => i.availableQty <= (i.reorderLevel || 100))
          .map(i => {
            const product = productMap.get(i.productId)
            return {
              ...i,
              productName: product?.name || 'Unknown',
              category: product?.category
            }
          })
          .sort((a, b) => a.availableQty - b.availableQty)
          .slice(0, 20)

        return successResponse({
          type: 'inventory',
          summary,
          byCategory,
          lowStockItems
        })
      }

      case 'products': {
        const allProducts = await products.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()

        // Calculate product sales from invoices
        const productSales = {}
        allInvoices.forEach(inv => {
          (inv.items || []).forEach(item => {
            const key = item.productId || 'unknown'
            if (!productSales[key]) {
              productSales[key] = { 
                quantity: 0, 
                revenue: 0, 
                invoiceCount: 0 
              }
            }
            productSales[key].quantity += item.quantity || item.area || 0
            productSales[key].revenue += item.totalPrice || 0
            productSales[key].invoiceCount++
          })
        })

        const topProducts = allProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          price: p.price,
          sales: productSales[p.id] || { quantity: 0, revenue: 0, invoiceCount: 0 }
        })).sort((a, b) => b.sales.revenue - a.sales.revenue).slice(0, 20)

        return successResponse({
          type: 'products',
          totalProducts: allProducts.length,
          topProducts,
          byCategory: allProducts.reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1
            return acc
          }, {}),
          totalRevenue: Object.values(productSales).reduce((sum, s) => sum + s.revenue, 0)
        })
      }

      case 'customers': {
        const allCustomers = await customers.find({}).toArray()
        const allContacts = await contacts.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()

        // Calculate customer metrics
        const customerMetrics = {}
        allInvoices.forEach(inv => {
          const customerId = inv.customer?.id || inv.customer?.contactId
          if (customerId) {
            if (!customerMetrics[customerId]) {
              customerMetrics[customerId] = {
                name: inv.customer?.name,
                invoiceCount: 0,
                totalValue: 0,
                paidAmount: 0,
                pendingAmount: 0
              }
            }
            customerMetrics[customerId].invoiceCount++
            customerMetrics[customerId].totalValue += inv.grandTotal || 0
            customerMetrics[customerId].paidAmount += inv.paidAmount || 0
            customerMetrics[customerId].pendingAmount += inv.balanceAmount || 0
          }
        })

        const topCustomers = Object.entries(customerMetrics)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 20)

        return successResponse({
          type: 'customers',
          totalCustomers: allCustomers.length + allContacts.length,
          topCustomers,
          totalCustomerValue: Object.values(customerMetrics).reduce((sum, c) => sum + c.totalValue, 0),
          averageCustomerValue: Object.keys(customerMetrics).length > 0 
            ? Object.values(customerMetrics).reduce((sum, c) => sum + c.totalValue, 0) / Object.keys(customerMetrics).length
            : 0
        })
      }

      case 'installations': {
        const allInstallations = await installations.find({}).toArray()
        const periodInstallations = allInstallations.filter(i => inPeriod(i.createdAt))

        return successResponse({
          type: 'installations',
          total: periodInstallations.length,
          scheduled: periodInstallations.filter(i => i.status === 'scheduled').length,
          inProgress: periodInstallations.filter(i => i.status === 'in_progress').length,
          completed: periodInstallations.filter(i => i.status === 'completed').length,
          onHold: periodInstallations.filter(i => i.status === 'on_hold').length,
          cancelled: periodInstallations.filter(i => i.status === 'cancelled').length,
          totalAreaInstalled: periodInstallations
            .filter(i => i.status === 'completed')
            .reduce((sum, i) => sum + (i.totalArea || 0), 0),
          averageCompletionTime: (() => {
            const completed = allInstallations.filter(i => i.status === 'completed' && i.completedDate && i.scheduledDate)
            if (completed.length === 0) return 0
            const totalDays = completed.reduce((sum, i) => {
              const scheduled = new Date(i.scheduledDate)
              const completedDate = new Date(i.completedDate)
              return sum + Math.ceil((completedDate - scheduled) / (1000 * 60 * 60 * 24))
            }, 0)
            return Math.round(totalDays / completed.length)
          })()
        })
      }

      case 'revenue': {
        const allInvoices = await invoices.find({}).toArray()
        const allPayments = await payments.find({}).toArray()

        // Monthly revenue trend
        const monthlyRevenue = {}
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthlyRevenue[key] = { 
            month: key,
            invoiced: 0,
            collected: 0,
            pending: 0
          }
        }

        allInvoices.forEach(inv => {
          const month = getMonthKey(inv.createdAt)
          if (monthlyRevenue[month]) {
            monthlyRevenue[month].invoiced += inv.grandTotal || 0
            monthlyRevenue[month].collected += inv.paidAmount || 0
            monthlyRevenue[month].pending += inv.balanceAmount || 0
          }
        })

        return successResponse({
          type: 'revenue',
          monthlyTrend: Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month)),
          totalInvoiced: allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
          totalCollected: allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
          totalPending: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          collectionRate: allInvoices.length > 0
            ? Math.round((allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0) / allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0)) * 100)
            : 0
        })
      }

      case 'tax': {
        const periodInvoices = (await invoices.find({}).toArray()).filter(i => inPeriod(i.createdAt))
        
        // GST Summary
        const gstSummary = {
          totalCGST: periodInvoices.reduce((sum, i) => sum + (i.cgst || 0), 0),
          totalSGST: periodInvoices.reduce((sum, i) => sum + (i.sgst || 0), 0),
          totalIGST: periodInvoices.reduce((sum, i) => sum + (i.igst || 0), 0),
          totalTax: periodInvoices.reduce((sum, i) => sum + (i.totalTax || 0), 0),
          taxableValue: periodInvoices.reduce((sum, i) => sum + (i.taxableAmount || 0), 0),
          invoiceCount: periodInvoices.length
        }

        // By tax rate
        const byTaxRate = {}
        periodInvoices.forEach(inv => {
          const rate = inv.isInterstate ? (inv.igstRate || 18) : ((inv.cgstRate || 9) + (inv.sgstRate || 9))
          const key = `${rate}%`
          if (!byTaxRate[key]) byTaxRate[key] = { taxableValue: 0, taxAmount: 0, count: 0 }
          byTaxRate[key].taxableValue += inv.taxableAmount || 0
          byTaxRate[key].taxAmount += inv.totalTax || 0
          byTaxRate[key].count++
        })

        return successResponse({
          type: 'tax',
          period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
          gstSummary,
          byTaxRate,
          interstateInvoices: periodInvoices.filter(i => i.isInterstate).length,
          intrastateInvoices: periodInvoices.filter(i => !i.isInterstate).length
        })
      }

      case 'payments': {
        const allPayments = await payments.find({}).toArray()
        const periodPayments = allPayments.filter(p => inPeriod(p.createdAt))
        
        // Payment methods breakdown
        const byMethod = {}
        periodPayments.forEach(p => {
          const method = p.paymentMethod || 'other'
          if (!byMethod[method]) byMethod[method] = { count: 0, amount: 0 }
          byMethod[method].count++
          byMethod[method].amount += p.amount || 0
        })
        
        // Daily collection trend
        const dailyCollection = {}
        periodPayments.forEach(p => {
          const day = new Date(p.createdAt).toISOString().split('T')[0]
          if (!dailyCollection[day]) dailyCollection[day] = 0
          dailyCollection[day] += p.amount || 0
        })
        
        return successResponse({
          type: 'payments',
          totalCollected: periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          paymentCount: periodPayments.length,
          averagePayment: periodPayments.length > 0 ? Math.round(periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / periodPayments.length) : 0,
          byMethod,
          dailyTrend: Object.entries(dailyCollection).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date))
        })
      }

      case 'pipeline': {
        const allQuotes = await quotes.find({}).toArray()
        const periodQuotes = allQuotes.filter(q => inPeriod(q.createdAt))
        
        // Pipeline stages
        const pipeline = {
          draft: { count: 0, value: 0 },
          sent: { count: 0, value: 0 },
          viewed: { count: 0, value: 0 },
          negotiation: { count: 0, value: 0 },
          approved: { count: 0, value: 0 },
          rejected: { count: 0, value: 0 },
          invoiced: { count: 0, value: 0 }
        }
        
        periodQuotes.forEach(q => {
          const status = q.status || 'draft'
          if (pipeline[status]) {
            pipeline[status].count++
            pipeline[status].value += q.grandTotal || 0
          }
        })
        
        return successResponse({
          type: 'pipeline',
          totalQuotes: periodQuotes.length,
          totalValue: periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
          pipeline,
          avgDealSize: periodQuotes.length > 0 ? Math.round(periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / periodQuotes.length) : 0
        })
      }

      case 'conversion': {
        const allQuotes = await quotes.find({}).toArray()
        const periodQuotes = allQuotes.filter(q => inPeriod(q.createdAt))
        
        const total = periodQuotes.length
        const sent = periodQuotes.filter(q => ['sent', 'viewed', 'negotiation', 'approved', 'invoiced'].includes(q.status)).length
        const approved = periodQuotes.filter(q => ['approved', 'invoiced'].includes(q.status)).length
        const invoiced = periodQuotes.filter(q => q.status === 'invoiced').length
        
        return successResponse({
          type: 'conversion',
          funnel: [
            { stage: 'Created', count: total, rate: 100 },
            { stage: 'Sent', count: sent, rate: total > 0 ? Math.round((sent / total) * 100) : 0 },
            { stage: 'Approved', count: approved, rate: total > 0 ? Math.round((approved / total) * 100) : 0 },
            { stage: 'Invoiced', count: invoiced, rate: total > 0 ? Math.round((invoiced / total) * 100) : 0 }
          ],
          conversionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
          avgTimeToApproval: 0 // Would need date tracking for this
        })
      }

      case 'profitability': {
        const allInvoices = await invoices.find({}).toArray()
        const periodInvoices = allInvoices.filter(i => inPeriod(i.createdAt))
        
        // Calculate profitability from line items if cost data is available
        let totalRevenue = 0
        let totalCost = 0
        
        periodInvoices.forEach(inv => {
          const revenue = inv.grandTotal || 0
          totalRevenue += revenue
          // Estimate cost as 60% of revenue if no cost data (typical margin)
          const cost = inv.items?.reduce((sum, item) => sum + ((item.costPrice || item.unitPrice * 0.6) * (item.quantity || 1)), 0) || revenue * 0.6
          totalCost += cost
        })
        
        const grossProfit = totalRevenue - totalCost
        const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0
        
        return successResponse({
          type: 'profitability',
          totalRevenue,
          totalCost,
          grossProfit,
          grossMargin,
          invoiceCount: periodInvoices.length,
          avgMarginPerDeal: periodInvoices.length > 0 ? Math.round(grossProfit / periodInvoices.length) : 0
        })
      }

      case 'team': {
        // Get all users for this client
        const allUsers = await users.find({}).toArray()
        const teamMembers = allUsers.filter(u => ['client_admin', 'employee', 'sales', 'project_manager'].includes(u.role))
        
        const allQuotes = await quotes.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()
        const periodQuotes = allQuotes.filter(q => inPeriod(q.createdAt))
        const periodInvoices = allInvoices.filter(i => inPeriod(i.createdAt))
        
        // Team performance by user
        const teamPerformance = teamMembers.map(member => {
          const memberQuotes = periodQuotes.filter(q => q.createdBy === member.id || q.salesPerson === member.id)
          const memberInvoices = periodInvoices.filter(i => i.createdBy === member.id)
          
          return {
            userId: member.id,
            name: member.name || member.email,
            role: member.role,
            quotesCreated: memberQuotes.length,
            quoteValue: memberQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
            invoicesGenerated: memberInvoices.length,
            revenue: memberInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
            conversionRate: memberQuotes.length > 0 ? Math.round((memberQuotes.filter(q => ['approved', 'invoiced'].includes(q.status)).length / memberQuotes.length) * 100) : 0
          }
        }).sort((a, b) => b.revenue - a.revenue)
        
        return successResponse({
          type: 'team',
          teamMembers: teamPerformance,
          totalTeamRevenue: teamPerformance.reduce((sum, m) => sum + m.revenue, 0),
          topPerformer: teamPerformance[0] || null
        })
      }

      case 'forecast': {
        const allQuotes = await quotes.find({}).toArray()
        const activeQuotes = allQuotes.filter(q => ['sent', 'viewed', 'negotiation'].includes(q.status))
        
        // Weighted pipeline based on status
        const weightings = { sent: 0.2, viewed: 0.4, negotiation: 0.6 }
        const weightedPipeline = activeQuotes.reduce((sum, q) => sum + (q.grandTotal || 0) * (weightings[q.status] || 0.2), 0)
        
        // Historical conversion rate
        const historicalQuotes = allQuotes.filter(q => ['approved', 'invoiced', 'rejected'].includes(q.status))
        const historicalConversion = historicalQuotes.length > 0 
          ? historicalQuotes.filter(q => ['approved', 'invoiced'].includes(q.status)).length / historicalQuotes.length 
          : 0.3
        
        return successResponse({
          type: 'forecast',
          activePipeline: activeQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
          weightedForecast: Math.round(weightedPipeline),
          activeDeals: activeQuotes.length,
          historicalConversionRate: Math.round(historicalConversion * 100),
          expectedClosures: Math.round(activeQuotes.length * historicalConversion)
        })
      }

      case 'comparison': {
        // Compare current period with previous period
        const allQuotes = await quotes.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()
        
        const currentQuotes = allQuotes.filter(q => inPeriod(q.createdAt))
        const currentInvoices = allInvoices.filter(i => inPeriod(i.createdAt))
        
        // Previous period
        const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000)
        const prevPeriodEnd = new Date(periodStart.getTime())
        const inPrevPeriod = (date) => {
          if (!date) return false
          const d = new Date(date)
          return d >= prevPeriodStart && d <= prevPeriodEnd
        }
        
        const prevQuotes = allQuotes.filter(q => inPrevPeriod(q.createdAt))
        const prevInvoices = allInvoices.filter(i => inPrevPeriod(i.createdAt))
        
        const currentRevenue = currentInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0)
        const prevRevenue = prevInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0)
        
        return successResponse({
          type: 'comparison',
          current: {
            quotes: currentQuotes.length,
            quoteValue: currentQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
            invoices: currentInvoices.length,
            revenue: currentRevenue
          },
          previous: {
            quotes: prevQuotes.length,
            quoteValue: prevQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
            invoices: prevInvoices.length,
            revenue: prevRevenue
          },
          changes: {
            quotesChange: prevQuotes.length > 0 ? Math.round(((currentQuotes.length - prevQuotes.length) / prevQuotes.length) * 100) : 0,
            revenueChange: prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0
          }
        })
      }

      case 'stock': {
        const allProducts = await products.find({}).toArray()
        
        // Stock levels
        const lowStock = allProducts.filter(p => (p.inventory?.quantity || 0) > 0 && (p.inventory?.quantity || 0) <= (p.inventory?.reorderLevel || 50))
        const outOfStock = allProducts.filter(p => (p.inventory?.quantity || 0) === 0)
        const inStock = allProducts.filter(p => (p.inventory?.quantity || 0) > (p.inventory?.reorderLevel || 50))
        
        // Total inventory value
        const totalValue = allProducts.reduce((sum, p) => sum + ((p.inventory?.quantity || 0) * (p.pricing?.costPrice || p.pricing?.sellingPrice || 0)), 0)
        
        return successResponse({
          type: 'stock',
          totalProducts: allProducts.length,
          totalValue,
          inStock: inStock.length,
          lowStock: lowStock.length,
          outOfStock: outOfStock.length,
          lowStockProducts: lowStock.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock: p.inventory?.quantity || 0,
            reorderLevel: p.inventory?.reorderLevel || 50
          })),
          outOfStockProducts: outOfStock.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku
          }))
        })
      }

      case 'wastage': {
        // Wastage would be tracked in a separate collection - for now provide structure
        const allInvoices = await invoices.find({}).toArray()
        const periodInvoices = allInvoices.filter(i => inPeriod(i.createdAt))
        
        // Estimate wastage as 5-10% of material used (typical for flooring)
        const totalMaterialUsed = periodInvoices.reduce((sum, inv) => {
          return sum + (inv.items?.reduce((itemSum, item) => itemSum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0)
        }, 0)
        
        const estimatedWastage = totalMaterialUsed * 0.07 // 7% average wastage
        
        return successResponse({
          type: 'wastage',
          estimatedWastageValue: Math.round(estimatedWastage),
          wastageRate: 7,
          totalMaterialValue: totalMaterialUsed,
          note: 'Wastage is estimated at 7% of material value. Track actual wastage for accurate reporting.',
          recommendations: [
            'Implement cutting optimization software',
            'Track actual wastage per project',
            'Train installers on material efficiency'
          ]
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
