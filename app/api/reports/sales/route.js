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

    // Group by status
    const byStatus = await leadsCollection.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } }
    ]).toArray()

    // Group by source
    const bySource = await leadsCollection.aggregate([
      { $match: { clientId } },
      { $group: { _id: '$source', count: { $sum: 1 }, value: { $sum: '$value' } } }
    ]).toArray()

    // Monthly data (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyData = await leadsCollection.aggregate([
      { $match: { clientId, createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        leads: { $sum: 1 },
        value: { $sum: '$value' },
        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]).toArray()

    // Conversion funnel
    const funnel = await leadsCollection.aggregate([
      { $match: { clientId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        contacted: { $sum: { $cond: [{ $in: ['$status', ['contacted', 'qualified', 'proposal', 'negotiation', 'won']] }, 1, 0] } },
        qualified: { $sum: { $cond: [{ $in: ['$status', ['qualified', 'proposal', 'negotiation', 'won']] }, 1, 0] } },
        proposal: { $sum: { $cond: [{ $in: ['$status', ['proposal', 'negotiation', 'won']] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
      }}
    ]).toArray()

    // Top performers (mock for now)
    const topLeads = await leadsCollection
      .find({ clientId, status: 'won' })
      .sort({ value: -1 })
      .limit(5)
      .toArray()

    return successResponse({
      byStatus: byStatus.map(s => ({ status: s._id || 'unknown', count: s.count, value: s.value })),
      bySource: bySource.map(s => ({ source: s._id || 'Unknown', count: s.count, value: s.value })),
      monthlyData: monthlyData.map(m => ({ month: m._id, leads: m.leads, value: m.value, won: m.won })),
      funnel: funnel[0] || { total: 0, contacted: 0, qualified: 0, proposal: 0, won: 0 },
      topLeads: topLeads.map(l => ({ name: l.name, value: l.value, source: l.source }))
    })
  } catch (error) {
    console.error('Sales Report API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to generate sales report', 500, error.message)
  }
}
