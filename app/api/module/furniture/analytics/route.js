import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get comprehensive analytics and reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo') || new Date().toISOString()
    const period = searchParams.get('period') || 'month' // day, week, month, quarter, year

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const dateFilter = dateFrom ? { $gte: dateFrom, $lte: dateTo } : {}

    // Overview Dashboard
    if (reportType === 'overview') {
      const [reqStats, orderStats, prodStats, invStats] = await Promise.all([
        // Requirements pipeline
        db.collection('furniture_requirements').aggregate([
          { $match: { isActive: true } },
          { $group: { 
            _id: '$status', 
            count: { $sum: 1 }, 
            value: { $sum: '$estimatedBudget' } 
          }}
        ]).toArray(),
        // Order stats
        db.collection('furniture_orders').aggregate([
          { $match: { isActive: true } },
          { $group: {
            _id: '$status',
            count: { $sum: 1 },
            value: { $sum: '$grandTotal' },
            paid: { $sum: '$totalPaid' }
          }}
        ]).toArray(),
        // Product stats
        db.collection('furniture_products').aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } }}
        ]).toArray(),
        // Inventory value
        db.collection('furniture_stock_ledger').aggregate([
          { $match: { isActive: { $ne: false } } },
          { $group: { 
            _id: null, 
            totalValue: { $sum: { $multiply: ['$quantity', '$avgCost'] } },
            totalItems: { $sum: '$quantity' }
          }}
        ]).toArray()
      ])

      // Calculate totals
      const totalPipeline = reqStats.reduce((sum, s) => sum + s.value, 0)
      const totalRevenue = orderStats.reduce((sum, s) => sum + s.value, 0)
      const totalCollected = orderStats.reduce((sum, s) => sum + s.paid, 0)

      return successResponse({
        requirements: {
          byStatus: reqStats.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, value: s.value } }), {}),
          totalPipeline
        },
        orders: {
          byStatus: orderStats.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, value: s.value, paid: s.paid } }), {}),
          totalRevenue,
          totalCollected,
          outstandingAmount: totalRevenue - totalCollected
        },
        products: {
          byCategory: prodStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
          totalProducts: prodStats.reduce((sum, s) => sum + s.count, 0)
        },
        inventory: invStats[0] || { totalValue: 0, totalItems: 0 }
      })
    }

    // Sales Report
    if (reportType === 'sales') {
      const sales = await db.collection('furniture_orders').aggregate([
        { $match: { isActive: true, status: { $nin: ['cancelled'] } } },
        { $addFields: { createdDate: { $substr: ['$createdAt', 0, 10] } } },
        { $group: {
          _id: '$createdDate',
          orders: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          collected: { $sum: '$totalPaid' }
        }},
        { $sort: { _id: 1 } }
      ]).toArray()

      const topProducts = await db.collection('furniture_orders').aggregate([
        { $match: { isActive: true, status: { $nin: ['cancelled'] } } },
        { $unwind: '$lineItems' },
        { $group: {
          _id: '$lineItems.productName',
          quantity: { $sum: '$lineItems.quantity' },
          revenue: { $sum: '$lineItems.lineTotal' }
        }},
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]).toArray()

      const topCustomers = await db.collection('furniture_orders').aggregate([
        { $match: { isActive: true, status: { $nin: ['cancelled'] } } },
        { $group: {
          _id: '$customer.name',
          orders: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' }
        }},
        { $sort: { totalValue: -1 } },
        { $limit: 10 }
      ]).toArray()

      return successResponse({
        daily: sales,
        topProducts,
        topCustomers,
        totals: {
          totalOrders: sales.reduce((sum, d) => sum + d.orders, 0),
          totalRevenue: sales.reduce((sum, d) => sum + d.revenue, 0),
          totalCollected: sales.reduce((sum, d) => sum + d.collected, 0)
        }
      })
    }

    // Conversion Funnel
    if (reportType === 'funnel') {
      const [requirements, quotes, orders] = await Promise.all([
        db.collection('furniture_requirements').countDocuments({ isActive: true }),
        db.collection('furniture_quotations').countDocuments({ isActive: true }),
        db.collection('furniture_orders').countDocuments({ isActive: true })
      ])

      const quoteSent = await db.collection('furniture_quotations').countDocuments({ status: 'sent', isActive: true })
      const quoteAccepted = await db.collection('furniture_quotations').countDocuments({ status: { $in: ['accepted', 'converted'] }, isActive: true })

      return successResponse({
        funnel: [
          { stage: 'Requirements', count: requirements },
          { stage: 'Quotes Created', count: quotes },
          { stage: 'Quotes Sent', count: quoteSent },
          { stage: 'Quotes Accepted', count: quoteAccepted },
          { stage: 'Orders', count: orders }
        ],
        conversionRates: {
          reqToQuote: quotes > 0 ? ((quotes / requirements) * 100).toFixed(1) : 0,
          quoteToOrder: quoteSent > 0 ? ((quoteAccepted / quoteSent) * 100).toFixed(1) : 0,
          overall: requirements > 0 ? ((orders / requirements) * 100).toFixed(1) : 0
        }
      })
    }

    // Inventory Report
    if (reportType === 'inventory') {
      const [stockByCategory, lowStock, stockMovement] = await Promise.all([
        db.collection('furniture_stock_ledger').aggregate([
          { $match: { isActive: { $ne: false } } },
          { $group: {
            _id: '$category',
            items: { $sum: 1 },
            totalQty: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$avgCost'] } }
          }}
        ]).toArray(),
        // This would need material reorder levels joined
        db.collection('furniture_stock_ledger').find({ quantity: { $lte: 10 } }).toArray(),
        db.collection('furniture_stock_transactions').aggregate([
          { $addFields: { txDate: { $substr: ['$performedAt', 0, 10] } } },
          { $group: {
            _id: { date: '$txDate', type: '$type' },
            count: { $sum: 1 },
            quantity: { $sum: '$quantity' }
          }},
          { $sort: { '_id.date': -1 } },
          { $limit: 30 }
        ]).toArray()
      ])

      return successResponse({
        byCategory: stockByCategory,
        lowStock: sanitizeDocuments(lowStock),
        movement: stockMovement
      })
    }

    // Service/Warranty Report
    if (reportType === 'service') {
      const [ticketsByStatus, ticketsByType, avgResolution, slaBreaches] = await Promise.all([
        db.collection('furniture_service_tickets').aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$status', count: { $sum: 1 } }}
        ]).toArray(),
        db.collection('furniture_service_tickets').aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$ticketType', count: { $sum: 1 } }}
        ]).toArray(),
        db.collection('furniture_service_tickets').aggregate([
          { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
          { $addFields: {
            resolutionTime: { $subtract: [{ $dateFromString: { dateString: '$resolvedAt' } }, { $dateFromString: { dateString: '$createdAt' } }] }
          }},
          { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } }}
        ]).toArray(),
        db.collection('furniture_service_tickets').countDocuments({
          status: { $nin: ['resolved', 'closed'] },
          slaDeadline: { $lt: new Date().toISOString() }
        })
      ])

      return successResponse({
        byStatus: ticketsByStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byType: ticketsByType.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        avgResolutionHours: avgResolution[0] ? Math.round(avgResolution[0].avgTime / (1000 * 60 * 60)) : 0,
        slaBreaches
      })
    }

    // Financial Report
    if (reportType === 'financial') {
      const [revenue, expenses, payments] = await Promise.all([
        db.collection('furniture_orders').aggregate([
          { $match: { isActive: true, status: { $nin: ['cancelled'] } } },
          { $group: {
            _id: null,
            totalOrders: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$totalPaid' },
            totalPending: { $sum: '$balanceDue' }
          }}
        ]).toArray(),
        db.collection('furniture_purchase_orders').aggregate([
          { $match: { isActive: true, status: { $nin: ['cancelled'] } } },
          { $group: {
            _id: null,
            totalPO: { $sum: '$totalAmount' }
          }}
        ]).toArray(),
        db.collection('furniture_orders').aggregate([
          { $unwind: '$payments' },
          { $addFields: { payDate: { $substr: ['$payments.recordedAt', 0, 10] } } },
          { $group: {
            _id: '$payDate',
            amount: { $sum: '$payments.amount' },
            count: { $sum: 1 }
          }},
          { $sort: { _id: -1 } },
          { $limit: 30 }
        ]).toArray()
      ])

      return successResponse({
        revenue: revenue[0] || { totalOrders: 0, totalPaid: 0, totalPending: 0 },
        expenses: expenses[0] || { totalPO: 0 },
        paymentsReceived: payments,
        profitMargin: revenue[0] && expenses[0] 
          ? (((revenue[0].totalPaid - expenses[0].totalPO) / revenue[0].totalPaid) * 100).toFixed(1) 
          : 0
      })
    }

    return errorResponse('Invalid report type', 400)
  } catch (error) {
    console.error('Furniture Analytics GET Error:', error)
    return errorResponse('Failed to fetch analytics', 500, error.message)
  }
}
