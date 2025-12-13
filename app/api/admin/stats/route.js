import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    // Admin stats use main database (platform-level data)
    const mainDb = await getMainDb()
    
    const clientsCollection = mainDb.collection('clients')
    const usersCollection = mainDb.collection('users')
    const plansCollection = mainDb.collection('plans')
    const moduleRequestsCollection = mainDb.collection('module_requests')

    const totalClients = await clientsCollection.countDocuments()
    const activeClients = await clientsCollection.countDocuments({ subscriptionStatus: 'active' })
    const totalUsers = await usersCollection.countDocuments({ role: { $ne: 'super_admin' } })
    const pendingModuleRequests = await moduleRequestsCollection.countDocuments({ status: 'pending' })

    // Calculate revenue
    const clients = await clientsCollection.find({}).toArray()
    const plans = await plansCollection.find({}).toArray()
    
    let monthlyRevenue = 0
    let moduleRevenue = 0
    let totalLeads = 0
    let totalProjects = 0
    
    clients.forEach(c => {
      const plan = plans.find(p => p.id === c.planId)
      if (plan && c.subscriptionStatus === 'active') {
        monthlyRevenue += plan.price
      }
      moduleRevenue += (c.modules?.length || 0) * 999
    })

    // Monthly growth data (mock for demo)
    const monthlyGrowth = [
      { month: 'Jan', clients: 5, revenue: 25000, leads: 120 },
      { month: 'Feb', clients: 8, revenue: 42000, leads: 180 },
      { month: 'Mar', clients: 12, revenue: 65000, leads: 250 },
      { month: 'Apr', clients: 15, revenue: 85000, leads: 320 },
      { month: 'May', clients: 20, revenue: 110000, leads: 400 },
      { month: 'Jun', clients: totalClients, revenue: monthlyRevenue + moduleRevenue, leads: totalLeads }
    ]

    // Client distribution by plan
    const planDistribution = await clientsCollection.aggregate([
      { $group: { _id: '$planId', count: { $sum: 1 } } }
    ]).toArray()

    return successResponse({
      overview: {
        totalClients,
        activeClients,
        pausedClients: totalClients - activeClients,
        totalUsers,
        totalLeads,
        totalProjects,
        pendingModuleRequests,
        monthlyRevenue: monthlyRevenue + moduleRevenue,
        annualRevenue: (monthlyRevenue + moduleRevenue) * 12,
        moduleRevenue
      },
      charts: {
        monthlyGrowth,
        planDistribution: planDistribution.map(p => ({ plan: p._id, count: p.count }))
      }
    })
  } catch (error) {
    console.error('Admin Stats API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch stats', 500, error.message)
  }
}
