import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { ReportTypes } from '@/lib/db/flooring-enhanced-schema'

// GET - Generate reports
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const reportType = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') // day, week, month, quarter, year
    const format = searchParams.get('format') // json, csv

    if (!clientId || !reportType) {
      return NextResponse.json({ error: 'clientId and type required' }, { status: 400 })
    }

    // Date range
    const dateFilter = {}
    if (startDate) dateFilter.$gte = startDate
    if (endDate) dateFilter.$lte = endDate

    const quotes = await getCollection('flooring_quotes_v2')
    const invoices = await getCollection('flooring_invoices')
    const inventory = await getCollection('flooring_inventory_v2')
    const products = await getCollection('flooring_products')
    const leads = await getCollection('leads')
    const projects = await getCollection('projects')
    const movements = await getCollection('flooring_inventory_movements')

    let reportData = {}
    const reportInfo = ReportTypes[reportType.toUpperCase()]

    switch (reportType) {
      case 'sales_summary': {
        const allInvoices = await invoices.find({ clientId, status: 'paid' }).toArray()
        const allQuotes = await quotes.find({ clientId }).toArray()
        
        reportData = {
          totalRevenue: allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
          totalInvoices: allInvoices.length,
          totalQuotes: allQuotes.length,
          approvedQuotes: allQuotes.filter(q => q.status === 'approved').length,
          pendingQuotes: allQuotes.filter(q => q.status === 'sent').length,
          averageOrderValue: allInvoices.length > 0 
            ? allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0) / allInvoices.length 
            : 0,
          conversionRate: allQuotes.length > 0 
            ? ((allQuotes.filter(q => q.status === 'approved').length / allQuotes.length) * 100).toFixed(1)
            : 0
        }
        break
      }

      case 'sales_by_category': {
        const allInvoices = await invoices.find({ clientId, status: 'paid' }).toArray()
        const byCategory = {}
        
        for (const invoice of allInvoices) {
          const items = invoice.items || []
          for (const item of items) {
            const category = item.category || 'Other'
            if (!byCategory[category]) {
              byCategory[category] = { revenue: 0, quantity: 0, orders: 0 }
            }
            byCategory[category].revenue += item.totalPrice || 0
            byCategory[category].quantity += item.quantity || 0
            byCategory[category].orders++
          }
        }
        
        reportData = {
          byCategory: Object.entries(byCategory).map(([category, data]) => ({
            category,
            ...data,
            percentage: ((data.revenue / allInvoices.reduce((s, i) => s + i.grandTotal, 0)) * 100).toFixed(1)
          })).sort((a, b) => b.revenue - a.revenue)
        }
        break
      }

      case 'quote_conversion': {
        const allQuotes = await quotes.find({ clientId }).toArray()
        
        const byMonth = {}
        allQuotes.forEach(q => {
          const month = new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          if (!byMonth[month]) {
            byMonth[month] = { total: 0, approved: 0, rejected: 0, pending: 0 }
          }
          byMonth[month].total++
          if (q.status === 'approved') byMonth[month].approved++
          else if (q.status === 'rejected') byMonth[month].rejected++
          else byMonth[month].pending++
        })

        reportData = {
          overall: {
            total: allQuotes.length,
            approved: allQuotes.filter(q => q.status === 'approved').length,
            rejected: allQuotes.filter(q => q.status === 'rejected').length,
            pending: allQuotes.filter(q => ['sent', 'viewed', 'draft'].includes(q.status)).length,
            conversionRate: allQuotes.length > 0 
              ? ((allQuotes.filter(q => q.status === 'approved').length / allQuotes.length) * 100).toFixed(1)
              : 0
          },
          byMonth: Object.entries(byMonth).map(([month, data]) => ({
            month,
            ...data,
            conversionRate: data.total > 0 ? ((data.approved / data.total) * 100).toFixed(1) : 0
          }))
        }
        break
      }

      case 'quote_aging': {
        const pendingQuotes = await quotes.find({ 
          clientId, 
          status: { $in: ['sent', 'viewed', 'draft'] } 
        }).toArray()

        const now = new Date()
        const aging = {
          '0-7': [], '8-15': [], '16-30': [], '31-60': [], '60+': []
        }

        pendingQuotes.forEach(q => {
          const days = Math.floor((now - new Date(q.createdAt)) / (1000 * 60 * 60 * 24))
          if (days <= 7) aging['0-7'].push(q)
          else if (days <= 15) aging['8-15'].push(q)
          else if (days <= 30) aging['16-30'].push(q)
          else if (days <= 60) aging['31-60'].push(q)
          else aging['60+'].push(q)
        })

        reportData = {
          summary: Object.entries(aging).map(([range, quotes]) => ({
            range,
            count: quotes.length,
            value: quotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
          })),
          details: pendingQuotes.map(q => ({
            quoteNumber: q.quoteNumber,
            customer: q.customer?.name,
            amount: q.grandTotal,
            createdAt: q.createdAt,
            daysOld: Math.floor((now - new Date(q.createdAt)) / (1000 * 60 * 60 * 24)),
            status: q.status
          }))
        }
        break
      }

      case 'stock_level': {
        const allInventory = await inventory.find({ clientId }).toArray()
        const allProducts = await products.find({ clientId }).toArray()
        const productMap = Object.fromEntries(allProducts.map(p => [p.id, p]))

        reportData = {
          items: allInventory.map(inv => {
            const product = productMap[inv.productId]
            return {
              sku: product?.sku,
              name: product?.name,
              category: product?.category,
              warehouse: inv.warehouseId,
              quantity: inv.quantity,
              available: inv.availableQty,
              reserved: inv.reservedQty,
              reorderLevel: inv.reorderLevel,
              status: inv.availableQty <= 0 ? 'out_of_stock' 
                : inv.availableQty <= inv.reorderLevel ? 'low_stock' : 'in_stock',
              value: inv.quantity * (inv.avgCostPrice || 0)
            }
          }).sort((a, b) => a.available - b.available),
          summary: {
            totalItems: allInventory.length,
            totalValue: allInventory.reduce((sum, i) => sum + (i.quantity * (i.avgCostPrice || 0)), 0),
            outOfStock: allInventory.filter(i => i.availableQty <= 0).length,
            lowStock: allInventory.filter(i => i.availableQty > 0 && i.availableQty <= i.reorderLevel).length
          }
        }
        break
      }

      case 'stock_movement': {
        const query = { clientId }
        if (startDate || endDate) query.createdAt = dateFilter

        const allMovements = await movements.find(query).sort({ createdAt: -1 }).toArray()
        const allProducts = await products.find({ clientId }).toArray()
        const productMap = Object.fromEntries(allProducts.map(p => [p.id, p]))

        const byType = {}
        allMovements.forEach(m => {
          if (!byType[m.type]) byType[m.type] = { count: 0, quantity: 0, value: 0 }
          byType[m.type].count++
          byType[m.type].quantity += Math.abs(m.quantity)
          byType[m.type].value += m.totalValue || 0
        })

        reportData = {
          movements: allMovements.slice(0, 100).map(m => ({
            ...m,
            productName: productMap[m.productId]?.name,
            productSku: productMap[m.productId]?.sku
          })),
          byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
          summary: {
            totalMovements: allMovements.length,
            receipts: allMovements.filter(m => m.type === 'receipt').length,
            issues: allMovements.filter(m => m.type === 'issue' || m.type === 'sale').length,
            transfers: allMovements.filter(m => m.type.includes('transfer')).length,
            adjustments: allMovements.filter(m => m.type.includes('adjustment')).length
          }
        }
        break
      }

      case 'outstanding_payments': {
        const unpaidInvoices = await invoices.find({ 
          clientId, 
          status: { $in: ['sent', 'partial'] } 
        }).toArray()

        const now = new Date()
        const aging = { current: [], overdue30: [], overdue60: [], overdue90: [] }

        unpaidInvoices.forEach(inv => {
          const dueDate = new Date(inv.dueDate)
          const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
          
          if (daysOverdue <= 0) aging.current.push(inv)
          else if (daysOverdue <= 30) aging.overdue30.push(inv)
          else if (daysOverdue <= 60) aging.overdue60.push(inv)
          else aging.overdue90.push(inv)
        })

        reportData = {
          totalOutstanding: unpaidInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
          invoiceCount: unpaidInvoices.length,
          aging: {
            current: { count: aging.current.length, amount: aging.current.reduce((s, i) => s + i.balanceAmount, 0) },
            '1-30': { count: aging.overdue30.length, amount: aging.overdue30.reduce((s, i) => s + i.balanceAmount, 0) },
            '31-60': { count: aging.overdue60.length, amount: aging.overdue60.reduce((s, i) => s + i.balanceAmount, 0) },
            '60+': { count: aging.overdue90.length, amount: aging.overdue90.reduce((s, i) => s + i.balanceAmount, 0) }
          },
          details: unpaidInvoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customer?.name,
            total: inv.grandTotal,
            paid: inv.paidAmount,
            balance: inv.balanceAmount,
            dueDate: inv.dueDate,
            daysOverdue: Math.max(0, Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)))
          })).sort((a, b) => b.daysOverdue - a.daysOverdue)
        }
        break
      }

      case 'best_sellers': {
        const allInvoices = await invoices.find({ clientId, status: 'paid' }).toArray()
        const productSales = {}

        for (const invoice of allInvoices) {
          const items = invoice.items || []
          for (const item of items) {
            if (!item.productId) continue
            if (!productSales[item.productId]) {
              productSales[item.productId] = {
                productId: item.productId,
                name: item.name,
                category: item.category,
                revenue: 0,
                quantity: 0,
                orders: 0
              }
            }
            productSales[item.productId].revenue += item.totalPrice || 0
            productSales[item.productId].quantity += item.quantity || 0
            productSales[item.productId].orders++
          }
        }

        const sorted = Object.values(productSales).sort((a, b) => b.revenue - a.revenue)
        
        reportData = {
          byRevenue: sorted.slice(0, 20),
          byQuantity: [...sorted].sort((a, b) => b.quantity - a.quantity).slice(0, 20),
          byOrders: [...sorted].sort((a, b) => b.orders - a.orders).slice(0, 20)
        }
        break
      }

      case 'gst_tax': {
        const query = { clientId, status: 'paid' }
        if (startDate || endDate) query.createdAt = dateFilter
        
        const paidInvoices = await invoices.find(query).toArray()

        const byMonth = {}
        paidInvoices.forEach(inv => {
          const month = new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          if (!byMonth[month]) {
            byMonth[month] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
          }
          byMonth[month].taxable += inv.taxableAmount || 0
          byMonth[month].cgst += inv.cgst || 0
          byMonth[month].sgst += inv.sgst || 0
          byMonth[month].igst += inv.igst || 0
          byMonth[month].total += inv.totalTax || 0
        })

        reportData = {
          summary: {
            totalTaxable: paidInvoices.reduce((s, i) => s + (i.taxableAmount || 0), 0),
            totalCGST: paidInvoices.reduce((s, i) => s + (i.cgst || 0), 0),
            totalSGST: paidInvoices.reduce((s, i) => s + (i.sgst || 0), 0),
            totalIGST: paidInvoices.reduce((s, i) => s + (i.igst || 0), 0),
            totalTax: paidInvoices.reduce((s, i) => s + (i.totalTax || 0), 0)
          },
          byMonth: Object.entries(byMonth).map(([month, data]) => ({ month, ...data }))
        }
        break
      }

      default:
        // Return list of available reports
        return NextResponse.json({
          availableReports: Object.values(ReportTypes).map(r => ({
            id: r.id,
            name: r.name,
            category: r.category
          }))
        })
    }

    return NextResponse.json({
      reportType,
      reportName: reportInfo?.name || reportType,
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      data: reportData
    })
  } catch (error) {
    console.error('Reports GET Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
