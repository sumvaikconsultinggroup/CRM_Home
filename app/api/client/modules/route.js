import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const clientId = user.clientId

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const modulesCollection = await getCollection(Collections.MODULES)
    const moduleRequestsCollection = await getCollection(Collections.MODULE_REQUESTS)

    const clientDoc = await clientsCollection.findOne({ id: clientId })
    // Get all modules where active is true OR active is not set (for backward compatibility)
    const allModules = await modulesCollection.find({ active: { $ne: false } }).toArray()
    const pendingRequests = await moduleRequestsCollection.find({ 
      clientId, 
      status: 'pending' 
    }).toArray()

    const modulesWithStatus = allModules.map(m => ({
      ...sanitizeDocument(m),
      enabled: clientDoc.modules?.includes(m.id) || false,
      requestPending: pendingRequests.some(r => r.moduleId === m.id)
    }))

    return successResponse(modulesWithStatus)
  } catch (error) {
    console.error('Client Modules API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch modules', 500, error.message)
  }
}
