import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireSuperAdmin, hashPassword } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    // Use main database for admin operations
    const mainDb = await getMainDb()
    
    const clientsCollection = mainDb.collection('clients')
    const usersCollection = mainDb.collection('users')
    const plansCollection = mainDb.collection('plans')

    const clients = await clientsCollection.find({}).sort({ createdAt: -1 }).toArray()
    const plans = await plansCollection.find({}).toArray()

    // Enrich client data with user count and plan details
    const enrichedClients = await Promise.all(clients.map(async (client) => {
      // Support both new clientId and old id format for user count
      const userCount = await usersCollection.countDocuments({ 
        $or: [
          { clientId: client.clientId },
          { clientId: client.id }
        ]
      })
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

// Create new client
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { businessName, email, phone, planId, password } = body

    if (!businessName || !email) {
      return errorResponse('Business name and email are required', 400)
    }

    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')
    const usersCollection = mainDb.collection('users')

    // Check if email already exists
    const existingClient = await clientsCollection.findOne({ email: email.toLowerCase() })
    if (existingClient) {
      return errorResponse('Email already registered', 400)
    }

    // Generate new 6-digit client ID
    const clientIdNumber = Math.floor(100000 + Math.random() * 900000).toString()
    const clientId = `CL-${clientIdNumber}`
    const databaseName = clientId

    const newClient = {
      id: uuidv4(),
      clientId,
      clientCode: clientId, // Keep in sync with clientId
      databaseName,
      businessName,
      email: email.toLowerCase(),
      phone: phone || '',
      planId: planId || 'starter',
      subscriptionStatus: 'active',
      modules: [],
      userCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await clientsCollection.insertOne(newClient)

    // Create default admin user for this client
    const adminUser = {
      id: uuidv4(),
      clientId,
      databaseName,
      email: email.toLowerCase(),
      password: hashPassword(password || 'password123'),
      name: businessName + ' Admin',
      role: 'client_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await usersCollection.insertOne(adminUser)

    return successResponse(sanitizeDocument(newClient), 201)
  } catch (error) {
    console.error('Admin Create Client API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create client', 500, error.message)
  }
}
