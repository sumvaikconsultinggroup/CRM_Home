import { getMainDb } from '@/lib/db/multitenancy'
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

    // Use main database for clients and modules (platform-level data)
    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')
    const modulesCollection = mainDb.collection('modules')
    const moduleRequestsCollection = mainDb.collection('module_requests')

    // Find client by new clientId format (CL-XXXXXX) or old id format
    let clientDoc = await clientsCollection.findOne({ clientId: clientId })
    if (!clientDoc) {
      clientDoc = await clientsCollection.findOne({ id: clientId })
    }

    // Get all modules where active is true OR active is not set (for backward compatibility)
    const allModules = await modulesCollection.find({ active: { $ne: false } }).toArray()
    const pendingRequests = await moduleRequestsCollection.find({ 
      clientId, 
      status: 'pending' 
    }).toArray()

    const modulesWithStatus = allModules.map(m => ({
      ...sanitizeDocument(m),
      enabled: clientDoc?.modules?.includes(m.id) || false,
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
