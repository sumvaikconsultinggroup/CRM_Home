import { getMainDb, getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { clientId } = await params
    
    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')
    const usersCollection = mainDb.collection('users')
    const modulesCollection = mainDb.collection('modules')
    const whitelabelCollection = mainDb.collection('whitelabel_settings')

    // Support both old id and new clientId format
    let clientDoc = await clientsCollection.findOne({ id: clientId })
    if (!clientDoc) {
      clientDoc = await clientsCollection.findOne({ clientId: clientId })
    }
    if (!clientDoc) {
      return errorResponse('Client not found', 404)
    }

    // Find users for this client
    const users = await usersCollection.find({ 
      $or: [
        { clientId: clientDoc.clientId },
        { clientId: clientDoc.id }
      ]
    }).toArray()
    
    const allModules = await modulesCollection.find({ active: { $ne: false } }).toArray()
    const whitelabel = await whitelabelCollection.findOne({ 
      $or: [
        { clientId: clientDoc.clientId },
        { clientId: clientDoc.id }
      ]
    })

    // Get counts from client's database
    let leadsCount = 0
    let projectsCount = 0
    try {
      const dbName = clientDoc.databaseName || clientDoc.clientId
      const clientDb = await getClientDb(dbName)
      leadsCount = await clientDb.collection('leads').countDocuments({})
      projectsCount = await clientDb.collection('projects').countDocuments({})
    } catch (e) {
      console.log('Could not get client stats:', e.message)
    }

    const modulesWithStatus = allModules.map(m => ({
      ...sanitizeDocument(m),
      enabled: clientDoc.modules?.includes(m.id) || false
    }))

    return successResponse({
      ...sanitizeDocument(clientDoc),
      users: users.map(u => {
        const { password, _id, ...rest } = u
        return rest
      }),
      modules: modulesWithStatus,
      whitelabel: whitelabel ? sanitizeDocument(whitelabel) : null,
      stats: {
        leadsCount,
        projectsCount,
        usersCount: users.length
      }
    })
  } catch (error) {
    console.error('Admin Client Detail API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch client', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { clientId } = await params
    const body = await request.json()
    const { planId, subscriptionStatus, settings } = body

    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')

    const updateData = { updatedAt: new Date() }
    if (planId) updateData.planId = planId
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus
    if (settings) updateData.settings = settings

    // Support both old id and new clientId format
    const result = await clientsCollection.updateOne(
      { $or: [{ id: clientId }, { clientId: clientId }] },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return errorResponse('Client not found', 404)
    }

    return successResponse({ message: 'Client updated successfully' })
  } catch (error) {
    console.error('Admin Client Update API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update client', 500, error.message)
  }
}

export async function POST(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { clientId } = await params
    const body = await request.json()
    const { action, moduleId } = body

    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')

    // Support both old id and new clientId format
    const filter = { $or: [{ id: clientId }, { clientId: clientId }] }

    if (action === 'toggle-status') {
      const clientDoc = await clientsCollection.findOne(filter)
      if (!clientDoc) {
        return errorResponse('Client not found', 404)
      }

      const newStatus = clientDoc.subscriptionStatus === 'active' ? 'paused' : 'active'
      await clientsCollection.updateOne(
        filter,
        { $set: { subscriptionStatus: newStatus, updatedAt: new Date() } }
      )

      return successResponse({ message: 'Status toggled', newStatus })
    }

    if (action === 'add-module' && moduleId) {
      await clientsCollection.updateOne(
        filter,
        { $addToSet: { modules: moduleId }, $set: { updatedAt: new Date() } }
      )
      return successResponse({ message: 'Module added successfully' })
    }

    if (action === 'remove-module' && moduleId) {
      await clientsCollection.updateOne(
        filter,
        { $pull: { modules: moduleId }, $set: { updatedAt: new Date() } }
      )
      return successResponse({ message: 'Module removed successfully' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Admin Client Action API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to perform action', 500, error.message)
  }
}
