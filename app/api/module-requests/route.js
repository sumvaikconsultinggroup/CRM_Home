import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
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

    // Module requests are in main database (platform-level)
    const mainDb = await getMainDb()
    const moduleRequestsCollection = mainDb.collection('module_requests')
    const clientsCollection = mainDb.collection('clients')
    const modulesCollection = mainDb.collection('modules')

    let filter = {}
    if (user.role !== 'super_admin') {
      filter.clientId = user.clientId
    }

    const requests = await moduleRequestsCollection.find(filter).sort({ createdAt: -1 }).toArray()

    // Enrich with client and module details
    const enrichedRequests = await Promise.all(requests.map(async (req) => {
      // Find client by new clientId or old id
      let client = await clientsCollection.findOne({ clientId: req.clientId })
      if (!client) {
        client = await clientsCollection.findOne({ id: req.clientId })
      }
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

    const mainDb = await getMainDb()
    const moduleRequestsCollection = mainDb.collection('module_requests')
    const modulesCollection = mainDb.collection('modules')
    const clientsCollection = mainDb.collection('clients')

    // Check if module exists
    const module = await modulesCollection.findOne({ id: moduleId })
    if (!module) {
      return errorResponse('Module not found', 404)
    }

    // Find client by new clientId or old id
    let client = await clientsCollection.findOne({ clientId: user.clientId })
    if (!client) {
      client = await clientsCollection.findOne({ id: user.clientId })
    }
    
    if (client?.modules?.includes(moduleId)) {
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

    const mainDb = await getMainDb()
    const moduleRequestsCollection = mainDb.collection('module_requests')
    const clientsCollection = mainDb.collection('clients')

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
      // Try to find by new clientId first, then by old id
      const updateResult = await clientsCollection.updateOne(
        { clientId: requestDoc.clientId },
        { 
          $addToSet: { modules: requestDoc.moduleId },
          $set: { updatedAt: new Date() }
        }
      )
      
      // If no match, try by old id field
      if (updateResult.matchedCount === 0) {
        await clientsCollection.updateOne(
          { id: requestDoc.clientId },
          { 
            $addToSet: { modules: requestDoc.moduleId },
            $set: { updatedAt: new Date() }
          }
        )
      }
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
