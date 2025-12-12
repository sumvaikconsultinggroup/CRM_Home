import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const clientId = params.clientId
    const clientsCollection = await getCollection(Collections.CLIENTS)
    const usersCollection = await getCollection(Collections.USERS)
    const modulesCollection = await getCollection(Collections.MODULES)
    const whitelabelCollection = await getCollection(Collections.WHITELABEL)
    const leadsCollection = await getCollection(Collections.LEADS)
    const projectsCollection = await getCollection(Collections.PROJECTS)

    const clientDoc = await clientsCollection.findOne({ id: clientId })
    if (!clientDoc) {
      return errorResponse('Client not found', 404)
    }

    const users = await usersCollection.find({ clientId }).toArray()
    const allModules = await modulesCollection.find({ active: true }).toArray()
    const whitelabel = await whitelabelCollection.findOne({ clientId })
    const leadsCount = await leadsCollection.countDocuments({ clientId })
    const projectsCount = await projectsCollection.countDocuments({ clientId })

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
      whitelabel: sanitizeDocument(whitelabel),
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

    const clientId = params.clientId
    const body = await request.json()
    const { planId, subscriptionStatus, settings } = body

    const clientsCollection = await getCollection(Collections.CLIENTS)

    const updateData = { updatedAt: new Date() }
    if (planId) updateData.planId = planId
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus
    if (settings) updateData.settings = settings

    await clientsCollection.updateOne({ id: clientId }, { $set: updateData })

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

    const clientId = params.clientId
    const body = await request.json()
    const { action, moduleId } = body

    const clientsCollection = await getCollection(Collections.CLIENTS)

    if (action === 'toggle-status') {
      const clientDoc = await clientsCollection.findOne({ id: clientId })
      if (!clientDoc) {
        return errorResponse('Client not found', 404)
      }

      const newStatus = clientDoc.subscriptionStatus === 'active' ? 'paused' : 'active'
      await clientsCollection.updateOne(
        { id: clientId },
        { $set: { subscriptionStatus: newStatus, updatedAt: new Date() } }
      )

      return successResponse({ message: 'Status toggled', newStatus })
    }

    if (action === 'add-module' && moduleId) {
      await clientsCollection.updateOne(
        { id: clientId },
        { $addToSet: { modules: moduleId }, $set: { updatedAt: new Date() } }
      )
      return successResponse({ message: 'Module added successfully' })
    }

    if (action === 'remove-module' && moduleId) {
      await clientsCollection.updateOne(
        { id: clientId },
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
