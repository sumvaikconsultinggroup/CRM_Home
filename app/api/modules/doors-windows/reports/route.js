import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Generate reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'sales-funnel'
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : new Date()
    const format = searchParams.get('format') || 'json' // json, csv

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } }

    let reportData = {}
    let csvContent = ''

    switch (reportType) {
      case 'sales-funnel': {
        const surveys = await db.collection('dw_surveys').find(dateFilter).toArray()
        const quotations = await db.collection('dw_quotations').find(dateFilter).toArray()
        const orders = await db.collection('dw_orders').find(dateFilter).toArray()

        reportData = {
          title: 'Sales Funnel Report',
          period: { start: startDate, end: endDate },
          summary: {
            surveys: surveys.length,
            quotations: quotations.length,
            orders: orders.length,
            surveyToQuoteRate: surveys.length > 0 ? Math.round(quotations.length / surveys.length * 100) : 0,
            quoteToOrderRate: quotations.length > 0 ? Math.round(orders.length / quotations.length * 100) : 0,
            overallConversion: surveys.length > 0 ? Math.round(orders.length / surveys.length * 100) : 0
          },
          byProductType: {},
          byLocation: {},
          details: {
            surveys: surveys.map(s => ({ id: s.id, siteName: s.siteName, openings: s.openingsCount, date: s.createdAt })),
            quotations: quotations.map(q => ({ id: q.id, number: q.quoteNumber, value: q.grandTotal, status: q.status, date: q.createdAt })),
            orders: orders.map(o => ({ id: o.id, number: o.orderNumber, value: o.grandTotal, status: o.status, date: o.createdAt }))
          }
        }
        break
      }

      case 'quotation-analysis': {
        const quotations = await db.collection('dw_quotations').find(dateFilter).toArray()

        const winLossReasons = {
          won: quotations.filter(q => q.status === 'approved').length,
          lost: quotations.filter(q => q.status === 'rejected').length,
          pending: quotations.filter(q => !['approved', 'rejected', 'expired'].includes(q.status)).length,
          expired: quotations.filter(q => q.status === 'expired').length
        }

        const avgTurnaroundTime = quotations.length > 0
          ? quotations.reduce((sum, q) => {
              if (q.sentAt && q.createdAt) {
                return sum + (new Date(q.sentAt) - new Date(q.createdAt)) / (1000 * 60 * 60)
              }
              return sum
            }, 0) / quotations.length
          : 0

        reportData = {
          title: 'Quotation Analysis Report',
          period: { start: startDate, end: endDate },
          summary: {
            total: quotations.length,
            totalValue: quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
            avgValue: quotations.length > 0 ? quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / quotations.length : 0,
            winRate: quotations.length > 0 ? Math.round(winLossReasons.won / quotations.length * 100) : 0
          },
          winLossAnalysis: winLossReasons,
          avgTurnaroundHours: Math.round(avgTurnaroundTime),
          byPriceList: {},
          versionHistory: quotations.filter(q => q.version > 1).length
        }
        break
      }

      case 'production-efficiency': {
        const workOrders = await db.collection('dw_work_orders').find(dateFilter).toArray()
        const qcRecords = await db.collection('dw_qc_records').find(dateFilter).toArray()

        const completed = workOrders.filter(w => w.status === 'completed')
        const avgCycleTime = completed.length > 0
          ? completed.reduce((sum, w) => {
              if (w.actualEnd && w.actualStart) {
                return sum + (new Date(w.actualEnd) - new Date(w.actualStart)) / (1000 * 60 * 60 * 24)
              }
              return sum
            }, 0) / completed.length
          : 0

        reportData = {
          title: 'Production Efficiency Report',
          period: { start: startDate, end: endDate },
          summary: {
            totalWorkOrders: workOrders.length,
            completed: completed.length,
            inProgress: workOrders.filter(w => w.status === 'in-progress').length,
            reworkCount: workOrders.reduce((sum, w) => sum + (w.reworkCount || 0), 0)
          },
          avgCycleDays: Math.round(avgCycleTime * 10) / 10,
          byStage: {
            cutting: workOrders.filter(w => w.currentStage === 'cutting').length,
            machining: workOrders.filter(w => w.currentStage === 'machining').length,
            assembly: workOrders.filter(w => w.currentStage === 'assembly').length,
            glazing: workOrders.filter(w => w.currentStage === 'glazing').length,
            qc: workOrders.filter(w => w.currentStage === 'qc').length,
            packing: workOrders.filter(w => w.currentStage === 'packing').length
          },
          qcMetrics: {
            totalInspections: qcRecords.length,
            passRate: qcRecords.length > 0 ? Math.round(qcRecords.filter(q => q.result === 'pass').length / qcRecords.length * 100) : 0,
            reworkRate: qcRecords.length > 0 ? Math.round(qcRecords.filter(q => q.result === 'rework').length / qcRecords.length * 100) : 0
          }
        }
        break
      }

      case 'dispatch-performance': {
        const dispatches = await db.collection('dw_dispatches').find(dateFilter).toArray()

        const delivered = dispatches.filter(d => d.status === 'delivered')
        const onTime = delivered.filter(d => {
          if (d.actualDeliveryDate && d.scheduledDate) {
            return new Date(d.actualDeliveryDate) <= new Date(d.scheduledDate)
          }
          return false
        })

        reportData = {
          title: 'Dispatch Performance Report',
          period: { start: startDate, end: endDate },
          summary: {
            totalDispatches: dispatches.length,
            delivered: delivered.length,
            scheduled: dispatches.filter(d => d.status === 'scheduled').length,
            inTransit: dispatches.filter(d => d.status === 'in-transit').length
          },
          onTimeDeliveryRate: delivered.length > 0 ? Math.round(onTime.length / delivered.length * 100) : 0,
          partialDeliveries: dispatches.filter(d => d.isPartial).length,
          avgItemsPerDispatch: dispatches.length > 0 ? Math.round(dispatches.reduce((sum, d) => sum + (d.totalItems || 0), 0) / dispatches.length) : 0
        }
        break
      }

      case 'installation-performance': {
        const installations = await db.collection('dw_installations').find(dateFilter).toArray()
        const snags = await db.collection('dw_snags').find(dateFilter).toArray()

        const completed = installations.filter(i => i.status === 'completed')

        // Group by installer
        const byInstaller = {}
        installations.forEach(i => {
          const installer = i.leadInstaller || 'Unassigned'
          if (!byInstaller[installer]) {
            byInstaller[installer] = { total: 0, completed: 0, snags: 0, openings: 0 }
          }
          byInstaller[installer].total++
          if (i.status === 'completed') byInstaller[installer].completed++
          byInstaller[installer].snags += i.totalSnags || 0
          byInstaller[installer].openings += i.completedOpenings || 0
        })

        reportData = {
          title: 'Installation Performance Report',
          period: { start: startDate, end: endDate },
          summary: {
            totalInstallations: installations.length,
            completed: completed.length,
            inProgress: installations.filter(i => i.status === 'in-progress').length,
            scheduled: installations.filter(i => i.status === 'scheduled').length
          },
          completionRate: installations.length > 0 ? Math.round(completed.length / installations.length * 100) : 0,
          snagMetrics: {
            totalSnags: snags.length,
            resolved: snags.filter(s => s.status === 'resolved').length,
            open: snags.filter(s => s.status === 'open').length,
            avgSnagsPerSite: installations.length > 0 ? Math.round(snags.length / installations.length * 10) / 10 : 0
          },
          byInstaller: Object.entries(byInstaller).map(([name, data]) => ({ name, ...data }))
        }
        break
      }

      case 'service-sla': {
        const tickets = await db.collection('dw_service_tickets').find(dateFilter).toArray()

        const resolved = tickets.filter(t => t.status === 'resolved')
        const breached = tickets.filter(t => t.slaBreached)

        const byCategory = {}
        tickets.forEach(t => {
          byCategory[t.category] = (byCategory[t.category] || 0) + 1
        })

        reportData = {
          title: 'Service SLA Performance Report',
          period: { start: startDate, end: endDate },
          summary: {
            totalTickets: tickets.length,
            resolved: resolved.length,
            open: tickets.filter(t => ['open', 'in-progress', 'assigned'].includes(t.status)).length,
            warrantyTickets: tickets.filter(t => t.isWarranty).length,
            chargeableTickets: tickets.filter(t => !t.isWarranty).length
          },
          slaMetrics: {
            breachCount: breached.length,
            complianceRate: tickets.length > 0 ? Math.round((tickets.length - breached.length) / tickets.length * 100) : 100,
            avgResolutionHours: resolved.length > 0 ? Math.round(resolved.reduce((sum, t) => sum + (t.resolutionTime || 0), 0) / resolved.length) : 0
          },
          byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
          costAnalysis: {
            totalCost: resolved.reduce((sum, t) => sum + (t.cost?.total || 0), 0),
            warrantyClaimsCost: resolved.filter(t => t.isWarranty).reduce((sum, t) => sum + (t.cost?.total || 0), 0),
            chargeableRevenue: resolved.filter(t => !t.isWarranty).reduce((sum, t) => sum + (t.cost?.total || 0), 0)
          }
        }
        break
      }

      case 'project-profitability': {
        const orders = await db.collection('dw_orders').find(dateFilter).toArray()
        const workOrders = await db.collection('dw_work_orders').find(dateFilter).toArray()

        reportData = {
          title: 'Project Profitability Report',
          period: { start: startDate, end: endDate },
          summary: {
            totalProjects: orders.length,
            totalQuotedValue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
            totalCollected: orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0),
            pendingCollection: orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0)
          },
          marginAnalysis: {
            estimatedMargin: 25, // Placeholder
            actualMargin: 22, // Placeholder - calculate from actual costs
            variance: -3
          },
          byProject: orders.map(o => ({
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            quotedValue: o.grandTotal,
            collected: o.paidAmount,
            pending: o.balanceAmount,
            status: o.status
          }))
        }
        break
      }

      case 'inventory-analysis': {
        const catalog = await db.collection('dw_catalog_system').find({}).toArray()
        const materials = await db.collection('dw_material_issues').find(dateFilter).toArray()

        const lowStock = catalog.filter(c => c.quantity <= (c.reorderLevel || 10))

        reportData = {
          title: 'Inventory Analysis Report',
          period: { start: startDate, end: endDate },
          summary: {
            totalSKUs: catalog.length,
            totalValue: catalog.reduce((sum, c) => sum + ((c.quantity || 0) * (c.costPrice || 0)), 0),
            lowStockItems: lowStock.length,
            outOfStock: catalog.filter(c => (c.quantity || 0) <= 0).length
          },
          lowStockAlerts: lowStock.slice(0, 20).map(c => ({
            sku: c.sku,
            name: c.name,
            quantity: c.quantity,
            reorderLevel: c.reorderLevel
          })),
          consumptionTrend: {
            totalIssued: materials.reduce((sum, m) => sum + (m.quantityIssued || 0), 0),
            avgDailyConsumption: materials.length / 30 // Simplified
          }
        }
        break
      }

      default:
        return errorResponse('Invalid report type', 400)
    }

    // Generate CSV if requested
    if (format === 'csv' && reportData.details) {
      const details = reportData.details[Object.keys(reportData.details)[0]] || []
      if (details.length > 0) {
        const headers = Object.keys(details[0])
        csvContent = [
          headers.join(','),
          ...details.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n')
      }
    }

    if (format === 'csv') {
      return successResponse({
        csv: csvContent,
        filename: `${reportType}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`
      })
    }

    return successResponse({ report: reportData })
  } catch (error) {
    console.error('DW Reports GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to generate report', 500, error.message)
  }
}
