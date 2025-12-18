import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Super Admin can view all feature requests
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const db = await getMainDb()
    const collection = db.collection('feature_requests')

    // Build query
    const query = {}
    if (status) query.status = status
    if (category) query.category = category

    // Build sort
    const sort = {}
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1

    const requests = await collection.find(query).sort(sort).toArray()

    // Get stats
    const stats = {
      total: await collection.countDocuments(),
      pending: await collection.countDocuments({ status: 'pending' }),
      reviewed: await collection.countDocuments({ status: 'reviewed' }),
      planned: await collection.countDocuments({ status: 'planned' }),
      implemented: await collection.countDocuments({ status: 'implemented' }),
      declined: await collection.countDocuments({ status: 'declined' })
    }

    return successResponse({ 
      requests: sanitizeDocuments(requests),
      stats 
    })
  } catch (error) {
    console.error('Feature Requests GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch feature requests', 500, error.message)
  }
}

// POST - Any authenticated user can submit a feature request
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { title, description, category, clientId, clientName, userName, userEmail } = body

    if (!title || !description) {
      return errorResponse('Title and description are required', 400)
    }

    const db = await getMainDb()
    const collection = db.collection('feature_requests')

    const featureRequest = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      category: category || 'feature',
      status: 'pending',
      priority: 'medium',
      votes: 0,
      
      // Submitter info
      submittedBy: {
        userId: user.id || user.userId,
        userName: userName || user.name,
        userEmail: userEmail || user.email,
        clientId: clientId || user.clientId,
        clientName: clientName || 'Unknown Client'
      },
      
      // Admin fields
      adminNotes: '',
      assignedTo: null,
      targetRelease: null,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await collection.insertOne(featureRequest)

    return successResponse(sanitizeDocument(featureRequest), 201)
  } catch (error) {
    console.error('Feature Request POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to submit feature request', 500, error.message)
  }
}

// PUT - Super Admin can update feature request status
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { id, status, priority, adminNotes, assignedTo, targetRelease } = body

    if (!id) {
      return errorResponse('Feature request ID is required', 400)
    }

    const db = await getMainDb()
    const collection = db.collection('feature_requests')

    const updates = {
      updatedAt: new Date().toISOString()
    }
    
    if (status) updates.status = status
    if (priority) updates.priority = priority
    if (adminNotes !== undefined) updates.adminNotes = adminNotes
    if (assignedTo !== undefined) updates.assignedTo = assignedTo
    if (targetRelease !== undefined) updates.targetRelease = targetRelease

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Feature request not found', 404)
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Feature Request PUT Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update feature request', 500, error.message)
  }
}

// DELETE - Super Admin can delete feature requests
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Feature request ID is required', 400)
    }

    const db = await getMainDb()
    const collection = db.collection('feature_requests')

    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) {
      return errorResponse('Feature request not found', 404)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('Feature Request DELETE Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete feature request', 500, error.message)
  }
}
