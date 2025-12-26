import { v4 as uuidv4 } from 'uuid'
import { getMainDb, getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Helper function to get date range
function getDateRange(period) {
  const now = new Date()
  let startDate, endDate = now

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0))
      break
    case 'yesterday':
      startDate = new Date(now.setDate(now.getDate() - 1))
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'this_week':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()))
      startDate.setHours(0, 0, 0, 0)
      break
    case 'last_week':
      const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay() - 1))
      endDate = new Date(lastWeekEnd)
      endDate.setHours(23, 59, 59, 999)
      startDate = new Date(lastWeekEnd.setDate(lastWeekEnd.getDate() - 6))
      startDate.setHours(0, 0, 0, 0)
      break
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'this_quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
      break
    case 'last_quarter':
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1
      startDate = new Date(now.getFullYear(), lastQuarter * 3, 1)
      endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0)
      break
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'last_year':
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31)
      break
    case 'last_30_days':
      startDate = new Date(now.setDate(now.getDate() - 30))
      break
    case 'last_90_days':
      startDate = new Date(now.setDate(now.getDate() - 90))
      break
    case 'last_6_months':
      startDate = new Date(now.setMonth(now.getMonth() - 6))
      break
    case 'last_12_months':
      startDate = new Date(now.setMonth(now.getMonth() - 12))
      break
    case 'all_time':
    default:
      startDate = new Date(2020, 0, 1)
      break
  }

  return { startDate, endDate: endDate || new Date() }
}

// Helper to calculate growth percentage
function calculateGrowth(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous * 100).toFixed(1)
}

// GET - Fetch reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const period = searchParams.get('period') || 'this_month'
    const groupBy = searchParams.get('groupBy') || 'day'
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')

    const mainDb = await getMainDb()
    const dbName = getUserDatabaseName(user)
    const clientDb = await getClientDb(dbName)

    // Use custom dates if provided, otherwise use period
    let dateRange
    if (customStartDate && customEndDate) {
      dateRange = {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate)
      }
    } else {
      dateRange = getDateRange(period)
    }
    const { startDate, endDate } = dateRange

    // Collections
    const leadsCollection = clientDb.collection('leads')
    const projectsCollection = clientDb.collection('projects')
    const tasksCollection = clientDb.collection('tasks')
    const expensesCollection = clientDb.collection('expenses')
    const contactsCollection = clientDb.collection('contacts')
    const invoicesCollection = clientDb.collection('invoices')
    const quotesCollection = clientDb.collection('quotes')
    const ordersCollection = clientDb.collection('orders')
    const productsCollection = clientDb.collection('products')
    const usersCollection = mainDb.collection('users')

    // Base date filter
    const dateFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    }

    // Report type handlers
    switch (reportType) {
      // ==================== OVERVIEW REPORTS ====================
      case 'overview': {
        const [
          totalLeads, wonLeads, lostLeads,
          totalProjects, completedProjects, activeProjects,
          totalTasks, completedTasks,
          totalExpenses, totalRevenue,
          totalContacts
        ] = await Promise.all([
          leadsCollection.countDocuments({ ...dateFilter }),
          leadsCollection.countDocuments({ ...dateFilter, status: 'won' }),
          leadsCollection.countDocuments({ ...dateFilter, status: 'lost' }),
          projectsCollection.countDocuments({ ...dateFilter }),
          projectsCollection.countDocuments({ ...dateFilter, status: 'completed' }),
          projectsCollection.countDocuments({ ...dateFilter, status: { $in: ['in_progress', 'planning'] } }),
          tasksCollection.countDocuments({ ...dateFilter }),
          tasksCollection.countDocuments({ ...dateFilter, status: 'completed' }),
          expensesCollection.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).toArray(),
          invoicesCollection.aggregate([
            { $match: { ...dateFilter, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).toArray(),
          contactsCollection.countDocuments({ ...dateFilter })
        ])

        // Get previous period for comparison
        const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000)
        const prevEndDate = new Date(startDate.getTime() - 1)
        const prevDateFilter = { createdAt: { $gte: prevStartDate, $lte: prevEndDate } }

        const [prevLeads, prevRevenue] = await Promise.all([
          leadsCollection.countDocuments({ ...prevDateFilter }),
          invoicesCollection.aggregate([
            { $match: { ...prevDateFilter, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).toArray()
        ])

        return successResponse({
          reportType: 'overview',
          period,
          dateRange: { startDate, endDate },
          metrics: {
            leads: {
              total: totalLeads,
              won: wonLeads,
              lost: lostLeads,
              conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
              growth: calculateGrowth(totalLeads, prevLeads)
            },
            projects: {
              total: totalProjects,
              completed: completedProjects,
              active: activeProjects,
              completionRate: totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : 0
            },
            tasks: {
              total: totalTasks,
              completed: completedTasks,
              completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
            },
            financial: {
              revenue: totalRevenue[0]?.total || 0,
              expenses: totalExpenses[0]?.total || 0,
              profit: (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0),
              revenueGrowth: calculateGrowth(totalRevenue[0]?.total || 0, prevRevenue[0]?.total || 0)
            },
            contacts: {
              total: totalContacts
            }
          }
        })
      }

      // ==================== SALES REPORTS ====================
      case 'lead_conversion': {
        const pipeline = [
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              value: { $sum: '$value' }
            }
          }
        ]
        const leadsByStatus = await leadsCollection.aggregate(pipeline).toArray()

        // Lead conversion funnel
        const funnelPipeline = [
          { $match: dateFilter },
          {
            $group: {
              _id: {
                month: { $month: '$createdAt' },
                year: { $year: '$createdAt' },
                status: '$status'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]
        const funnelData = await leadsCollection.aggregate(funnelPipeline).toArray()

        return successResponse({
          reportType: 'lead_conversion',
          period,
          dateRange: { startDate, endDate },
          data: {
            byStatus: leadsByStatus,
            funnel: funnelData,
            summary: {
              total: leadsByStatus.reduce((acc, s) => acc + s.count, 0),
              totalValue: leadsByStatus.reduce((acc, s) => acc + (s.value || 0), 0),
              conversionRate: (() => {
                const total = leadsByStatus.reduce((acc, s) => acc + s.count, 0)
                const won = leadsByStatus.find(s => s._id === 'won')?.count || 0
                return total > 0 ? ((won / total) * 100).toFixed(1) : 0
              })()
            }
          }
        })
      }

      case 'sales_pipeline': {
        const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
        const pipelineData = await Promise.all(
          stages.map(async (stage) => {
            const result = await leadsCollection.aggregate([
              { $match: { ...dateFilter, status: stage } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  value: { $sum: '$value' },
                  avgValue: { $avg: '$value' }
                }
              }
            ]).toArray()
            return {
              stage,
              count: result[0]?.count || 0,
              value: result[0]?.value || 0,
              avgValue: result[0]?.avgValue || 0
            }
          })
        )

        return successResponse({
          reportType: 'sales_pipeline',
          period,
          dateRange: { startDate, endDate },
          data: {
            stages: pipelineData,
            totalValue: pipelineData.reduce((acc, s) => acc + s.value, 0),
            weightedPipeline: pipelineData.reduce((acc, s, i) => {
              const weight = (i + 1) / stages.length
              return acc + (s.value * weight)
            }, 0)
          }
        })
      }

      case 'sales_by_team': {
        const users = await usersCollection.find({ clientId: user.clientId }).toArray()
        const salesByUser = await Promise.all(
          users.map(async (u) => {
            const result = await leadsCollection.aggregate([
              { $match: { ...dateFilter, assignedTo: u.id, status: 'won' } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  value: { $sum: '$value' }
                }
              }
            ]).toArray()
            return {
              userId: u.id,
              userName: u.name,
              deals: result[0]?.count || 0,
              revenue: result[0]?.value || 0
            }
          })
        )

        return successResponse({
          reportType: 'sales_by_team',
          period,
          dateRange: { startDate, endDate },
          data: salesByUser.sort((a, b) => b.revenue - a.revenue)
        })
      }

      case 'sales_forecast': {
        // Weighted pipeline forecast
        const weights = { new: 0.1, contacted: 0.2, qualified: 0.4, proposal: 0.6, negotiation: 0.8 }
        const forecastPipeline = await leadsCollection.aggregate([
          { $match: { status: { $in: Object.keys(weights) } } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalValue: { $sum: '$value' }
            }
          }
        ]).toArray()

        const forecast = forecastPipeline.map(stage => ({
          stage: stage._id,
          count: stage.count,
          totalValue: stage.totalValue,
          weightedValue: stage.totalValue * (weights[stage._id] || 0)
        }))

        return successResponse({
          reportType: 'sales_forecast',
          period,
          dateRange: { startDate, endDate },
          data: {
            byStage: forecast,
            totalPipeline: forecast.reduce((acc, s) => acc + s.totalValue, 0),
            weightedForecast: forecast.reduce((acc, s) => acc + s.weightedValue, 0),
            expectedCloseThisMonth: forecast
              .filter(s => ['proposal', 'negotiation'].includes(s.stage))
              .reduce((acc, s) => acc + s.weightedValue, 0)
          }
        })
      }

      case 'win_loss_analysis': {
        const [won, lost] = await Promise.all([
          leadsCollection.aggregate([
            { $match: { ...dateFilter, status: 'won' } },
            {
              $group: {
                _id: { $month: '$updatedAt' },
                count: { $sum: 1 },
                value: { $sum: '$value' }
              }
            },
            { $sort: { _id: 1 } }
          ]).toArray(),
          leadsCollection.aggregate([
            { $match: { ...dateFilter, status: 'lost' } },
            {
              $group: {
                _id: { $month: '$updatedAt' },
                count: { $sum: 1 },
                value: { $sum: '$value' }
              }
            },
            { $sort: { _id: 1 } }
          ]).toArray()
        ])

        // Loss reasons
        const lossReasons = await leadsCollection.aggregate([
          { $match: { ...dateFilter, status: 'lost', lossReason: { $exists: true } } },
          { $group: { _id: '$lossReason', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()

        return successResponse({
          reportType: 'win_loss_analysis',
          period,
          dateRange: { startDate, endDate },
          data: {
            won,
            lost,
            lossReasons,
            summary: {
              totalWon: won.reduce((acc, w) => acc + w.count, 0),
              totalLost: lost.reduce((acc, l) => acc + l.count, 0),
              wonValue: won.reduce((acc, w) => acc + w.value, 0),
              lostValue: lost.reduce((acc, l) => acc + l.value, 0),
              winRate: (() => {
                const totalW = won.reduce((acc, w) => acc + w.count, 0)
                const totalL = lost.reduce((acc, l) => acc + l.count, 0)
                return totalW + totalL > 0 ? ((totalW / (totalW + totalL)) * 100).toFixed(1) : 0
              })()
            }
          }
        })
      }

      // ==================== FINANCIAL REPORTS ====================
      case 'revenue': {
        const revenuePipeline = [
          { $match: { ...dateFilter, status: 'paid' } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: groupBy === 'day' ? { $dayOfMonth: '$createdAt' } : null
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]

        const revenueData = await invoicesCollection.aggregate(revenuePipeline).toArray()

        // Revenue by source/category
        const revenueByCategory = await invoicesCollection.aggregate([
          { $match: { ...dateFilter, status: 'paid' } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } }
        ]).toArray()

        return successResponse({
          reportType: 'revenue',
          period,
          dateRange: { startDate, endDate },
          data: {
            timeline: revenueData,
            byCategory: revenueByCategory,
            summary: {
              total: revenueData.reduce((acc, r) => acc + r.total, 0),
              invoiceCount: revenueData.reduce((acc, r) => acc + r.count, 0),
              average: revenueData.length > 0 
                ? (revenueData.reduce((acc, r) => acc + r.total, 0) / revenueData.reduce((acc, r) => acc + r.count, 0)).toFixed(2)
                : 0
            }
          }
        })
      }

      case 'expenses': {
        const expensesPipeline = [
          { $match: dateFilter },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                category: '$category'
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]

        const expensesData = await expensesCollection.aggregate(expensesPipeline).toArray()

        // Expenses by category
        const expensesByCategory = await expensesCollection.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } }
        ]).toArray()

        return successResponse({
          reportType: 'expenses',
          period,
          dateRange: { startDate, endDate },
          data: {
            timeline: expensesData,
            byCategory: expensesByCategory,
            summary: {
              total: expensesByCategory.reduce((acc, e) => acc + e.total, 0),
              expenseCount: expensesByCategory.reduce((acc, e) => acc + e.count, 0),
              topCategory: expensesByCategory[0]?._id || 'N/A'
            }
          }
        })
      }

      case 'profit_loss': {
        const [revenue, expenses] = await Promise.all([
          invoicesCollection.aggregate([
            { $match: { ...dateFilter, status: 'paid' } },
            {
              $group: {
                _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                total: { $sum: '$amount' }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]).toArray(),
          expensesCollection.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                total: { $sum: '$amount' }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]).toArray()
        ])

        // Combine into P&L
        const months = [...new Set([
          ...revenue.map(r => `${r._id.year}-${r._id.month}`),
          ...expenses.map(e => `${e._id.year}-${e._id.month}`)
        ])].sort()

        const plData = months.map(month => {
          const [year, m] = month.split('-').map(Number)
          const rev = revenue.find(r => r._id.year === year && r._id.month === m)?.total || 0
          const exp = expenses.find(e => e._id.year === year && e._id.month === m)?.total || 0
          return {
            month,
            revenue: rev,
            expenses: exp,
            profit: rev - exp,
            margin: rev > 0 ? ((rev - exp) / rev * 100).toFixed(1) : 0
          }
        })

        return successResponse({
          reportType: 'profit_loss',
          period,
          dateRange: { startDate, endDate },
          data: {
            timeline: plData,
            summary: {
              totalRevenue: plData.reduce((acc, p) => acc + p.revenue, 0),
              totalExpenses: plData.reduce((acc, p) => acc + p.expenses, 0),
              netProfit: plData.reduce((acc, p) => acc + p.profit, 0),
              avgMargin: plData.length > 0
                ? (plData.reduce((acc, p) => acc + parseFloat(p.margin), 0) / plData.length).toFixed(1)
                : 0
            }
          }
        })
      }

      case 'invoice_aging': {
        const now = new Date()
        const agingBuckets = [
          { name: 'Current', min: 0, max: 0 },
          { name: '1-30 days', min: 1, max: 30 },
          { name: '31-60 days', min: 31, max: 60 },
          { name: '61-90 days', min: 61, max: 90 },
          { name: '90+ days', min: 91, max: 9999 }
        ]

        const unpaidInvoices = await invoicesCollection.find({
          status: { $in: ['pending', 'overdue'] }
        }).toArray()

        const aging = agingBuckets.map(bucket => {
          const invoices = unpaidInvoices.filter(inv => {
            const dueDate = new Date(inv.dueDate || inv.createdAt)
            const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
            return daysOverdue >= bucket.min && daysOverdue <= bucket.max
          })
          return {
            bucket: bucket.name,
            count: invoices.length,
            total: invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0)
          }
        })

        return successResponse({
          reportType: 'invoice_aging',
          period,
          dateRange: { startDate, endDate },
          data: {
            buckets: aging,
            summary: {
              totalOutstanding: aging.reduce((acc, a) => acc + a.total, 0),
              overdueAmount: aging.filter(a => a.bucket !== 'Current').reduce((acc, a) => acc + a.total, 0),
              invoiceCount: aging.reduce((acc, a) => acc + a.count, 0)
            }
          }
        })
      }

      // ==================== PROJECT REPORTS ====================
      case 'project_status': {
        const statusData = await projectsCollection.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalBudget: { $sum: '$budget' }
            }
          }
        ]).toArray()

        const projectTimeline = await projectsCollection.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
              started: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]).toArray()

        return successResponse({
          reportType: 'project_status',
          period,
          dateRange: { startDate, endDate },
          data: {
            byStatus: statusData,
            timeline: projectTimeline,
            summary: {
              total: statusData.reduce((acc, s) => acc + s.count, 0),
              completed: statusData.find(s => s._id === 'completed')?.count || 0,
              inProgress: statusData.find(s => s._id === 'in_progress')?.count || 0,
              totalBudget: statusData.reduce((acc, s) => acc + (s.totalBudget || 0), 0)
            }
          }
        })
      }

      case 'project_profitability': {
        const projects = await projectsCollection.find(dateFilter).toArray()
        
        const profitabilityData = await Promise.all(
          projects.map(async (project) => {
            const projectExpenses = await expensesCollection.aggregate([
              { $match: { projectId: project.id } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray()
            
            const projectRevenue = await invoicesCollection.aggregate([
              { $match: { projectId: project.id, status: 'paid' } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray()

            const revenue = projectRevenue[0]?.total || 0
            const expenses = projectExpenses[0]?.total || 0
            
            return {
              projectId: project.id,
              projectName: project.name,
              budget: project.budget || 0,
              revenue,
              expenses,
              profit: revenue - expenses,
              margin: revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(1) : 0,
              budgetUtilization: project.budget > 0 ? ((expenses / project.budget) * 100).toFixed(1) : 0
            }
          })
        )

        return successResponse({
          reportType: 'project_profitability',
          period,
          dateRange: { startDate, endDate },
          data: {
            projects: profitabilityData.sort((a, b) => b.profit - a.profit),
            summary: {
              totalRevenue: profitabilityData.reduce((acc, p) => acc + p.revenue, 0),
              totalExpenses: profitabilityData.reduce((acc, p) => acc + p.expenses, 0),
              totalProfit: profitabilityData.reduce((acc, p) => acc + p.profit, 0),
              avgMargin: profitabilityData.length > 0
                ? (profitabilityData.reduce((acc, p) => acc + parseFloat(p.margin), 0) / profitabilityData.length).toFixed(1)
                : 0
            }
          }
        })
      }

      // ==================== TEAM REPORTS ====================
      case 'team_performance': {
        const users = await usersCollection.find({ clientId: user.clientId }).toArray()
        
        const performanceData = await Promise.all(
          users.map(async (u) => {
            const [tasks, leads, projects] = await Promise.all([
              tasksCollection.aggregate([
                { $match: { ...dateFilter, assignedTo: u.id } },
                {
                  $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                  }
                }
              ]).toArray(),
              leadsCollection.aggregate([
                { $match: { ...dateFilter, assignedTo: u.id } },
                {
                  $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    value: { $sum: '$value' }
                  }
                }
              ]).toArray(),
              projectsCollection.countDocuments({ ...dateFilter, managerId: u.id })
            ])

            const totalTasks = tasks.reduce((acc, t) => acc + t.count, 0)
            const completedTasks = tasks.find(t => t._id === 'completed')?.count || 0
            const wonLeads = leads.find(l => l._id === 'won')
            
            return {
              userId: u.id,
              userName: u.name,
              email: u.email,
              role: u.role,
              metrics: {
                tasks: {
                  total: totalTasks,
                  completed: completedTasks,
                  completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
                },
                leads: {
                  total: leads.reduce((acc, l) => acc + l.count, 0),
                  won: wonLeads?.count || 0,
                  revenue: wonLeads?.value || 0
                },
                projects: projects
              }
            }
          })
        )

        return successResponse({
          reportType: 'team_performance',
          period,
          dateRange: { startDate, endDate },
          data: performanceData.sort((a, b) => b.metrics.leads.revenue - a.metrics.leads.revenue)
        })
      }

      case 'activity_report': {
        const activityPipeline = [
          { $match: dateFilter },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                type: '$type'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]

        // Get activities from various collections
        const [leadActivities, taskActivities, projectActivities] = await Promise.all([
          leadsCollection.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            }
          ]).toArray(),
          tasksCollection.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            }
          ]).toArray(),
          projectsCollection.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            }
          ]).toArray()
        ])

        return successResponse({
          reportType: 'activity_report',
          period,
          dateRange: { startDate, endDate },
          data: {
            leads: leadActivities,
            tasks: taskActivities,
            projects: projectActivities,
            summary: {
              totalLeads: leadActivities.reduce((acc, a) => acc + a.count, 0),
              totalTasks: taskActivities.reduce((acc, a) => acc + a.count, 0),
              totalProjects: projectActivities.reduce((acc, a) => acc + a.count, 0)
            }
          }
        })
      }

      // ==================== CUSTOMER REPORTS ====================
      case 'customer_acquisition': {
        const acquisitionData = await contactsCollection.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                month: { $month: '$createdAt' },
                year: { $year: '$createdAt' },
                source: '$source'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]).toArray()

        const bySource = await contactsCollection.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()

        return successResponse({
          reportType: 'customer_acquisition',
          period,
          dateRange: { startDate, endDate },
          data: {
            timeline: acquisitionData,
            bySource,
            summary: {
              total: bySource.reduce((acc, s) => acc + s.count, 0),
              topSource: bySource[0]?._id || 'Direct'
            }
          }
        })
      }

      case 'customer_lifetime_value': {
        const contacts = await contactsCollection.find(dateFilter).toArray()
        
        const clvData = await Promise.all(
          contacts.slice(0, 100).map(async (contact) => { // Limit for performance
            const revenue = await invoicesCollection.aggregate([
              { $match: { contactId: contact.id, status: 'paid' } },
              { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]).toArray()

            return {
              contactId: contact.id,
              contactName: contact.name,
              company: contact.company,
              lifetimeValue: revenue[0]?.total || 0,
              totalOrders: revenue[0]?.count || 0,
              avgOrderValue: revenue[0]?.count > 0 
                ? (revenue[0].total / revenue[0].count).toFixed(2) 
                : 0
            }
          })
        )

        const sortedCLV = clvData.sort((a, b) => b.lifetimeValue - a.lifetimeValue)

        return successResponse({
          reportType: 'customer_lifetime_value',
          period,
          dateRange: { startDate, endDate },
          data: {
            customers: sortedCLV,
            summary: {
              avgCLV: clvData.length > 0 
                ? (clvData.reduce((acc, c) => acc + c.lifetimeValue, 0) / clvData.length).toFixed(2)
                : 0,
              topCustomerValue: sortedCLV[0]?.lifetimeValue || 0,
              totalCustomers: clvData.length
            }
          }
        })
      }

      // ==================== AVAILABLE REPORTS LIST ====================
      case 'list': {
        const reportCategories = [
          {
            category: 'Overview',
            icon: 'LayoutDashboard',
            reports: [
              { id: 'overview', name: 'Executive Summary', description: 'High-level overview of all key metrics' }
            ]
          },
          {
            category: 'Sales',
            icon: 'TrendingUp',
            reports: [
              { id: 'lead_conversion', name: 'Lead Conversion', description: 'Lead funnel and conversion rates' },
              { id: 'sales_pipeline', name: 'Sales Pipeline', description: 'Deal stages and pipeline value' },
              { id: 'sales_by_team', name: 'Sales by Team', description: 'Revenue and deals by team member' },
              { id: 'sales_forecast', name: 'Sales Forecast', description: 'Weighted pipeline and revenue forecast' },
              { id: 'win_loss_analysis', name: 'Win/Loss Analysis', description: 'Win rates and loss reasons' }
            ]
          },
          {
            category: 'Financial',
            icon: 'DollarSign',
            reports: [
              { id: 'revenue', name: 'Revenue Report', description: 'Revenue trends and breakdown' },
              { id: 'expenses', name: 'Expense Report', description: 'Expense tracking by category' },
              { id: 'profit_loss', name: 'Profit & Loss', description: 'P&L statement and margins' },
              { id: 'invoice_aging', name: 'Invoice Aging', description: 'Outstanding invoices by age' }
            ]
          },
          {
            category: 'Projects',
            icon: 'Briefcase',
            reports: [
              { id: 'project_status', name: 'Project Status', description: 'Project pipeline and completion rates' },
              { id: 'project_profitability', name: 'Project Profitability', description: 'Revenue vs expenses by project' }
            ]
          },
          {
            category: 'Team',
            icon: 'Users',
            reports: [
              { id: 'team_performance', name: 'Team Performance', description: 'Individual and team metrics' },
              { id: 'activity_report', name: 'Activity Report', description: 'Daily activity across the CRM' }
            ]
          },
          {
            category: 'Customers',
            icon: 'UserCheck',
            reports: [
              { id: 'customer_acquisition', name: 'Customer Acquisition', description: 'New customers by source and time' },
              { id: 'customer_lifetime_value', name: 'Customer Lifetime Value', description: 'CLV analysis and top customers' }
            ]
          }
        ]

        return successResponse({ categories: reportCategories })
      }

      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('Reports API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to generate report', 500, error.message)
  }
}
