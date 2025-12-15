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
    const leadsCollection = db.collection('leads')

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Basic counts
    const totalLeads = await leadsCollection.countDocuments({})
    const wonLeads = await leadsCollection.countDocuments({ status: 'won' })
    const lostLeads = await leadsCollection.countDocuments({ status: 'lost' })
    const newLeads = await leadsCollection.countDocuments({ status: 'new' })
    const activeLeads = await leadsCollection.countDocuments({ 
      status: { $nin: ['won', 'lost'] } 
    })

    // Pipeline value (active leads)
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

    // Lost value
    const lostValueAgg = await leadsCollection.aggregate([
      { $match: { status: 'lost' } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]).toArray()
    const lostValue = lostValueAgg[0]?.total || 0

    // Leads by status
    const leadsByStatus = await leadsCollection.aggregate([
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 }, 
          value: { $sum: '$value' }
        } 
      }
    ]).toArray()

    // Leads by source
    const leadsBySource = await leadsCollection.aggregate([
      { 
        $group: { 
          _id: '$source', 
          count: { $sum: 1 }, 
          value: { $sum: '$value' },
          won: { 
            $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
          }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Leads by priority
    const leadsByPriority = await leadsCollection.aggregate([
      { 
        $group: { 
          _id: '$priority', 
          count: { $sum: 1 }, 
          value: { $sum: '$value' }
        } 
      }
    ]).toArray()

    // Hot leads (high priority or high value)
    const hotLeads = await leadsCollection.countDocuments({
      status: { $nin: ['won', 'lost'] },
      $or: [
        { priority: { $in: ['urgent', 'high'] } },
        { value: { $gte: 200000 } }
      ]
    })

    // Follow-up analytics
    const overdueFollowUps = await leadsCollection.countDocuments({
      status: { $nin: ['won', 'lost'] },
      followUpDate: { $lt: now }
    })

    const todayFollowUps = await leadsCollection.countDocuments({
      status: { $nin: ['won', 'lost'] },
      followUpDate: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    })

    const weekFollowUps = await leadsCollection.countDocuments({
      status: { $nin: ['won', 'lost'] },
      followUpDate: {
        $gte: today,
        $lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    // Conversion rate
    const conversionRate = totalLeads > 0 
      ? ((wonLeads / (wonLeads + lostLeads || 1)) * 100).toFixed(1) 
      : 0

    // Average deal size (won)
    const avgDealSize = wonLeads > 0 ? Math.round(wonValue / wonLeads) : 0

    // Recent activity (leads with conversations in last 7 days)
    const activeConversations = await leadsCollection.countDocuments({
      status: { $nin: ['won', 'lost'] },
      'conversations.timestamp': { $gte: weekAgo.toISOString() }
    })

    // Monthly trends
    const monthlyTrends = await leadsCollection.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          value: { $sum: '$value' },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]).toArray()

    // Lost reasons analysis
    const lostReasons = await leadsCollection.aggregate([
      { $match: { status: 'lost', lostReason: { $exists: true, $ne: null } } },
      { 
        $group: { 
          _id: '$lostReason', 
          count: { $sum: 1 },
          value: { $sum: '$value' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray()

    // Engagement metrics (based on conversations)
    const engagementMetrics = await leadsCollection.aggregate([
      { $match: { status: { $nin: ['won', 'lost'] } } },
      {
        $project: {
          conversationCount: { $size: { $ifNull: ['$conversations', []] } },
          value: 1,
          status: 1
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $gte: ['$conversationCount', 5] }, 'high',
              { $cond: [
                { $gte: ['$conversationCount', 2] }, 'medium', 'low'
              ]}
            ]
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray()

    return successResponse({
      overview: {
        totalLeads,
        activeLeads,
        wonLeads,
        lostLeads,
        newLeads,
        hotLeads,
        conversionRate: parseFloat(conversionRate),
        avgDealSize,
        pipelineValue,
        wonValue,
        lostValue
      },
      followUps: {
        overdue: overdueFollowUps,
        today: todayFollowUps,
        thisWeek: weekFollowUps,
        activeConversations
      },
      distribution: {
        byStatus: leadsByStatus.map(s => ({
          status: s._id || 'Unknown',
          count: s.count,
          value: s.value
        })),
        bySource: leadsBySource.map(s => ({
          source: s._id || 'Unknown',
          count: s.count,
          value: s.value,
          won: s.won,
          conversionRate: s.count > 0 ? ((s.won / s.count) * 100).toFixed(0) : 0
        })),
        byPriority: leadsByPriority.map(p => ({
          priority: p._id || 'Unknown',
          count: p.count,
          value: p.value
        }))
      },
      trends: {
        monthly: monthlyTrends.map(t => ({
          month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
          count: t.count,
          value: t.value,
          won: t.won,
          lost: t.lost
        })).reverse()
      },
      insights: {
        lostReasons: lostReasons.map(r => ({
          reason: r._id,
          count: r.count,
          value: r.value
        })),
        engagement: engagementMetrics.map(e => ({
          level: e._id,
          count: e.count,
          value: e.totalValue
        }))
      }
    })
  } catch (error) {
    console.error('Lead Analytics API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch lead analytics', 500, error.message)
  }
}
