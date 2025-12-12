import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const usersCollection = await getCollection(Collections.USERS)
    const plansCollection = await getCollection(Collections.PLANS)

    const clients = await clientsCollection.find({}).sort({ createdAt: -1 }).toArray()
    const plans = await plansCollection.find({}).toArray()

    // Enrich client data with user count and plan details
    const enrichedClients = await Promise.all(clients.map(async (client) => {
      const userCount = await usersCollection.countDocuments({ clientId: client.id })
      const plan = plans.find(p => p.id === client.planId)
      return {
        ...sanitizeDocument(client),
        userCount,
        planName: plan?.name || client.planId,
        planPrice: plan?.price || 0
      }
    }))

    return successResponse(enrichedClients)
  } catch (error) {
    console.error('Admin Clients API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch clients', 500, error.message)
  }
}
