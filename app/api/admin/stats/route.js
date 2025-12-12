import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const usersCollection = await getCollection(Collections.USERS)
    const leadsCollection = await getCollection(Collections.LEADS)
    const projectsCollection = await getCollection(Collections.PROJECTS)
    const plansCollection = await getCollection(Collections.PLANS)
    const moduleRequestsCollection = await getCollection(Collections.MODULE_REQUESTS)

    const totalClients = await clientsCollection.countDocuments()
    const activeClients = await clientsCollection.countDocuments({ subscriptionStatus: 'active' })
    const totalUsers = await usersCollection.countDocuments({ role: { $ne: 'super_admin' } })
    const totalLeads = await leadsCollection.countDocuments()
    const totalProjects = await projectsCollection.countDocuments()
    const pendingModuleRequests = await moduleRequestsCollection.countDocuments({ status: 'pending' })

    // Calculate revenue
    const clients = await clientsCollection.find({}).toArray()
    const plans = await plansCollection.find({}).toArray()
    
    let monthlyRevenue = 0
    let moduleRevenue = 0
    
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
