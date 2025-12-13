import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch dashboard data
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // week, month, quarter, year
    const widget = searchParams.get('widget') // specific widget data

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Date range calculation
    const now = new Date()
    let startDate = new Date()
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Fetch all collections data
    const [surveys, quotations, orders, workOrders, dispatches, installations, serviceTickets, warranties] = await Promise.all([
      db.collection('dw_surveys').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_quotations').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_orders').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_work_orders').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_dispatches').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_installations').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_service_tickets').find({ createdAt: { $gte: startDate } }).toArray(),
      db.collection('dw_warranties').find({}).toArray()
    ])

    // Build dashboard data
    const dashboard = {
      period,
      dateRange: { start: startDate, end: now },

      // Overview Stats
      overview: {
        totalSurveys: surveys.length,
        totalQuotations: quotations.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
        pendingPayments: orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0),
        activeProduction: workOrders.filter(w => w.status === 'in-progress').length,
        pendingInstallations: installations.filter(i => i.status !== 'completed').length,
        openTickets: serviceTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length
      },

      // Pipeline - Openings flow
      pipeline: {
        surveyed: surveys.reduce((sum, s) => sum + (s.openingsCount || 0), 0),
        quoted: quotations.filter(q => q.status !== 'draft').reduce((sum, q) => sum + (q.itemsCount || 0), 0),
        ordered: orders.reduce((sum, o) => sum + (o.itemsCount || 0), 0),
        inProduction: workOrders.filter(w => w.status === 'in-progress').reduce((sum, w) => sum + (w.itemsCount || 0), 0),
        dispatched: dispatches.filter(d => d.status === 'delivered').reduce((sum, d) => sum + (d.totalItems || 0), 0),
        installed: installations.filter(i => i.status === 'completed').reduce((sum, i) => sum + (i.totalOpenings || 0), 0)
      },

      // Lead Conversion
      leadConversion: {
        totalLeads: surveys.length,
        convertedToQuote: quotations.length,
        convertedToOrder: orders.length,
        conversionRate: surveys.length > 0 ? Math.round((orders.length / surveys.length) * 100) : 0
      },

      // Production Load by Stage
      productionLoad: {
        cutting: workOrders.filter(w => w.currentStage === 'cutting').length,
        machining: workOrders.filter(w => w.currentStage === 'machining').length,
        assembly: workOrders.filter(w => w.currentStage === 'assembly').length,
        glazing: workOrders.filter(w => w.currentStage === 'glazing').length,
        qc: workOrders.filter(w => w.currentStage === 'qc').length,
        packing: workOrders.filter(w => w.currentStage === 'packing').length,
        ready: workOrders.filter(w => w.currentStage === 'ready').length
      },

      // Dispatch Schedule (next 7 days)
      dispatchSchedule: dispatches
        .filter(d => d.status === 'scheduled' && new Date(d.scheduledDate) >= now)
        .slice(0, 10)
        .map(d => ({
          id: d.id,
          orderNumber: d.orderNumber,
          customerName: d.customerName,
          scheduledDate: d.scheduledDate,
          items: d.totalItems
        })),

      // Installation Schedule
      installationSchedule: installations
        .filter(i => i.status === 'scheduled')
        .slice(0, 10)
        .map(i => ({
          id: i.id,
          customerName: i.customerName,
          siteAddress: i.siteAddress,
          scheduledDate: i.scheduledDate,
          openings: i.totalOpenings
        })),

      // QC Metrics
      qcMetrics: {
        totalInspected: workOrders.filter(w => w.stages?.qc?.completedAt).length,
        passRate: 85, // Placeholder - calculate from actual QC records
        reworkRate: workOrders.filter(w => w.reworkCount > 0).length / (workOrders.length || 1) * 100,
        avgReworkCount: workOrders.length > 0 
          ? workOrders.reduce((sum, w) => sum + (w.reworkCount || 0), 0) / workOrders.length 
          : 0
      },

      // Service Tickets
      serviceMetrics: {
        total: serviceTickets.length,
        open: serviceTickets.filter(t => t.status === 'open').length,
        inProgress: serviceTickets.filter(t => t.status === 'in-progress').length,
        resolved: serviceTickets.filter(t => t.status === 'resolved').length,
        warrantyTickets: serviceTickets.filter(t => t.isWarranty).length,
        avgResolutionTime: 24, // Placeholder - calculate actual
        topIssues: Object.entries(
          serviceTickets.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1
            return acc
          }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 5)
      },

      // Warranty Stats
      warrantyStats: {
        active: warranties.filter(w => w.status === 'active').length,
        expiringSoon: warranties.filter(w => {
          const exp = new Date(w.expiresAt)
          const thirtyDays = new Date()
          thirtyDays.setDate(thirtyDays.getDate() + 30)
          return w.status === 'active' && exp <= thirtyDays
        }).length,
        totalClaims: warranties.reduce((sum, w) => sum + (w.claimsCount || 0), 0)
      },

      // Revenue Breakdown
      revenueBreakdown: {
        total: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
        collected: orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0),
        pending: orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0),
        byMonth: [] // Placeholder for monthly breakdown
      },

      // Quote Performance
      quotePerformance: {
        total: quotations.length,
        sent: quotations.filter(q => q.status === 'sent').length,
        approved: quotations.filter(q => q.status === 'approved').length,
        rejected: quotations.filter(q => q.status === 'rejected').length,
        avgValue: quotations.length > 0 
          ? quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / quotations.length 
          : 0,
        winRate: quotations.length > 0 
          ? Math.round(quotations.filter(q => q.status === 'approved').length / quotations.length * 100)
          : 0
      }
    }

    return successResponse({ dashboard })
  } catch (error) {
    console.error('DW Dashboard GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch dashboard data', 500, error.message)
  }
}
