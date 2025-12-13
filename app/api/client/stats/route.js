import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    // Get client-specific database
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const leadsCollection = db.collection('leads')
    const projectsCollection = db.collection('projects')
    const tasksCollection = db.collection('tasks')
    const expensesCollection = db.collection('expenses')

    // No clientId filter needed - entire database is for this client
    const totalLeads = await leadsCollection.countDocuments({})
    const wonLeads = await leadsCollection.countDocuments({ status: 'won' })
    const lostLeads = await leadsCollection.countDocuments({ status: 'lost' })
    const newLeads = await leadsCollection.countDocuments({ status: 'new' })

    const totalProjects = await projectsCollection.countDocuments({})
    const activeProjects = await projectsCollection.countDocuments({ status: 'in_progress' })
    const completedProjects = await projectsCollection.countDocuments({ status: 'completed' })

    const totalTasks = await tasksCollection.countDocuments({})
    const completedTasks = await tasksCollection.countDocuments({ status: 'completed' })
    const overdueTasks = await tasksCollection.countDocuments({ 
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() }
    })

    // Pipeline value
    const pipelineAgg = await leadsCollection.aggregate([
      { $match: { status: { $nin: ['won', 'lost'] } } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]).toArray()
    const pipelineValue = pipelineAgg[0]?.total || 0

    // Won value
    const wonValueAgg = await leadsCollection.aggregate([
      { $match: { status: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]).toArray()
    const wonValue = wonValueAgg[0]?.total || 0

    // Total expenses
    const expenseAgg = await expensesCollection.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()
    const totalExpenses = expenseAgg[0]?.total || 0

    // Monthly data for charts
    const monthlyLeads = await leadsCollection.aggregate([
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
        value: { $sum: '$value' }
      }},
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]).toArray()

    const monthlyExpenses = await expensesCollection.aggregate([
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        total: { $sum: '$amount' }
      }},
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]).toArray()

    // Lead sources distribution
    const leadSources = await leadsCollection.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]).toArray()

    // Lead status distribution
    const leadStatuses = await leadsCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } }
    ]).toArray()

    // Expense categories
    const expenseCategories = await expensesCollection.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]).toArray()

    return successResponse({
      overview: {
        totalLeads,
        wonLeads,
        lostLeads,
        newLeads,
        conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        overdueTasks,
        taskCompletionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
        totalExpenses,
        pipelineValue,
        wonValue
      },
      charts: {
        monthlyLeads: monthlyLeads.map(m => ({ month: m._id, leads: m.count, value: m.value })),
        monthlyExpenses: monthlyExpenses.map(m => ({ month: m._id, total: m.total })),
        leadSources: leadSources.map(s => ({ source: s._id || 'Unknown', count: s.count })),
        leadStatuses: leadStatuses.map(s => ({ status: s._id, count: s.count, value: s.value })),
        expenseCategories: expenseCategories.map(c => ({ category: c._id || 'Other', total: c.total }))
      }
    })
  } catch (error) {
    console.error('Client Stats API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch stats', 500, error.message)
  }
}
