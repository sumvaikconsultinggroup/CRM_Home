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

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    // No clientId filter needed - entire DB is for this client
    const byCategory = await expensesCollection.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]).toArray()

    // Monthly data (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyData = await expensesCollection.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray()

    // Approval stats
    const approvalStats = await expensesCollection.aggregate([
      { $group: {
        _id: '$approved',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }}
    ]).toArray()

    // Budget vs Actual (by project if available)
    const projectExpenses = await expensesCollection.aggregate([
      { $match: { projectId: { $ne: null } } },
      { $group: {
        _id: '$projectId',
        total: { $sum: '$amount' }
      }}
    ]).toArray()

    // Recent expenses
    const recentExpenses = await expensesCollection
      .find({})
      .sort({ date: -1 })
      .limit(10)
      .toArray()

    // Total calculations
    const totalExpenses = byCategory.reduce((sum, c) => sum + c.total, 0)
    const approvedExpenses = approvalStats.find(a => a._id === true)?.total || 0
    const pendingExpenses = approvalStats.find(a => a._id === false)?.total || 0

    return successResponse({
      summary: {
        totalExpenses,
        approvedExpenses,
        pendingExpenses,
        totalTransactions: byCategory.reduce((sum, c) => sum + c.count, 0)
      },
      byCategory: byCategory.map(c => ({ category: c._id || 'Other', total: c.total, count: c.count })),
      monthlyData: monthlyData.map(m => ({ month: m._id, total: m.total, count: m.count })),
      approvalStats: {
        approved: approvalStats.find(a => a._id === true) || { total: 0, count: 0 },
        pending: approvalStats.find(a => a._id === false) || { total: 0, count: 0 }
      },
      projectExpenses: projectExpenses.map(p => ({ projectId: p._id, total: p.total })),
      recentExpenses: recentExpenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date,
        approved: e.approved
      }))
    })
  } catch (error) {
    console.error('Expenses Report API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to generate expenses report', 500, error.message)
  }
}
