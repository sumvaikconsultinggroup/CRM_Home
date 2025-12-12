import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get module requests (Super Admin sees all, Client sees their own)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return errorResponse('Unauthorized', 401)
    }

    const moduleRequestsCollection = await getCollection(Collections.MODULE_REQUESTS)
    const clientsCollection = await getCollection(Collections.CLIENTS)
    const modulesCollection = await getCollection(Collections.MODULES)

    let filter = {}
    if (user.role !== 'super_admin') {
      filter.clientId = user.clientId
    }

    const requests = await moduleRequestsCollection.find(filter).sort({ createdAt: -1 }).toArray()

    // Enrich with client and module details
    const enrichedRequests = await Promise.all(requests.map(async (req) => {
      const client = await clientsCollection.findOne({ id: req.clientId })
      const module = await modulesCollection.findOne({ id: req.moduleId })
      return {
        ...sanitizeDocument(req),
        clientName: client?.businessName || 'Unknown',
        moduleName: module?.name || 'Unknown',
        modulePrice: module?.price || 0
      }
    }))

    return successResponse(enrichedRequests)
  } catch (error) {
    console.error('Module Requests API Error:', error)
    return errorResponse('Failed to fetch module requests', 500, error.message)
  }
}

// Create a module request (Client action)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { moduleId, message } = body

    if (!moduleId) {
      return errorResponse('Module ID is required', 400)
    }

    const moduleRequestsCollection = await getCollection(Collections.MODULE_REQUESTS)
    const modulesCollection = await getCollection(Collections.MODULES)
    const clientsCollection = await getCollection(Collections.CLIENTS)

    // Check if module exists
    const module = await modulesCollection.findOne({ id: moduleId })
    if (!module) {
      return errorResponse('Module not found', 404)
    }

    // Check if client already has this module
    const client = await clientsCollection.findOne({ id: user.clientId })
    if (client.modules?.includes(moduleId)) {
      return errorResponse('Module already active', 400)
    }

    // Check if there's already a pending request
    const existingRequest = await moduleRequestsCollection.findOne({
      clientId: user.clientId,
      moduleId,
      status: 'pending'
    })
    if (existingRequest) {
      return errorResponse('Request already pending', 400)
    }

    const newRequest = {
      id: uuidv4(),
      clientId: user.clientId,
      moduleId,
      requestedBy: user.id,
      message: message || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await moduleRequestsCollection.insertOne(newRequest)

    return successResponse({ 
      message: 'Module request submitted successfully',
      request: sanitizeDocument(newRequest)
    }, 201)
  } catch (error) {
    console.error('Module Request Create API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create module request', 500, error.message)
  }
}

// Update module request (Super Admin action - approve/reject)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { requestId, action, adminMessage } = body

    if (!requestId || !action) {
      return errorResponse('Request ID and action are required', 400)
    }

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse('Invalid action. Use approve or reject', 400)
    }

    const moduleRequestsCollection = await getCollection(Collections.MODULE_REQUESTS)
    const clientsCollection = await getCollection(Collections.CLIENTS)

    const requestDoc = await moduleRequestsCollection.findOne({ id: requestId })
    if (!requestDoc) {
      return errorResponse('Request not found', 404)
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    await moduleRequestsCollection.updateOne(
      { id: requestId },
      { 
        $set: { 
          status: newStatus, 
          adminMessage: adminMessage || '',
          processedBy: user.id,
          processedAt: new Date(),
          updatedAt: new Date() 
        } 
      }
    )

    // If approved, add module to client
    if (action === 'approve') {
      await clientsCollection.updateOne(
        { id: requestDoc.clientId },
        { 
          $addToSet: { modules: requestDoc.moduleId },
          $set: { updatedAt: new Date() }
        }
      )
    }

    return successResponse({ 
      message: `Module request ${newStatus}`,
      status: newStatus
    })
  } catch (error) {
    console.error('Module Request Update API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update module request', 500, error.message)
  }
}
