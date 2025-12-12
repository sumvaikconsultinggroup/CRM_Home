import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const clientId = user.clientId

    const leadsCollection = await getCollection(Collections.LEADS)
    const projectsCollection = await getCollection(Collections.PROJECTS)
    const tasksCollection = await getCollection(Collections.TASKS)
    const expensesCollection = await getCollection(Collections.EXPENSES)

    // Aggregate stats
    const totalLeads = await leadsCollection.countDocuments({ clientId })
    const wonLeads = await leadsCollection.countDocuments({ clientId, status: 'won' })
    const lostLeads = await leadsCollection.countDocuments({ clientId, status: 'lost' })
    const newLeads = await leadsCollection.countDocuments({ clientId, status: 'new' })

    const totalProjects = await projectsCollection.countDocuments({ clientId })
    const activeProjects = await projectsCollection.countDocuments({ clientId, status: 'in_progress' })
    const completedProjects = await projectsCollection.countDocuments({ clientId, status: 'completed' })

    const totalTasks = await tasksCollection.countDocuments({ clientId })
    const completedTasks = await tasksCollection.countDocuments({ clientId, status: 'completed' })
    const overdueTasks = await tasksCollection.countDocuments({ 
      clientId, 
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() }
    })

    // Pipeline value
    const pipelineAgg = await leadsCollection.aggregate([
      { $match: { clientId, status: { $nin: ['won', 'lost'] } } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]).toArray()
    const pipelineValue = pipelineAgg[0]?.total || 0

    // Won value
    const wonValueAgg = await leadsCollection.aggregate([
      { $match: { clientId, status: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]).toArray()
    const wonValue = wonValueAgg[0]?.total || 0

    // Total expenses
    const expenseAgg = await expensesCollection.aggregate([
      { $match: { clientId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()
    const totalExpenses = expenseAgg[0]?.total || 0

    // Monthly data for charts
    const monthlyLeads = await leadsCollection.aggregate([
      { $match: { clientId } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
        value: { $sum: '$value' }
      }},
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]).toArray()

    const monthlyExpenses = await expensesCollection.aggregate([
      { $match: { clientId } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        total: { $sum: '$amount' }
      }},
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]).toArray()

    // Lead sources distribution
    const leadSources = await leadsCollection.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]).toArray()

    // Lead status distribution
    const leadStatuses = await leadsCollection.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } }
    ]).toArray()

    // Expense categories
    const expenseCategories = await expensesCollection.aggregate([
      { $match: { clientId } },
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
