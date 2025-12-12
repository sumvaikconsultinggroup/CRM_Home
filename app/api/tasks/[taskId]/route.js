import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const taskId = params.taskId
    const tasksCollection = await getCollection(Collections.TASKS)

    const task = await tasksCollection.findOne({ id: taskId, clientId: user.clientId })
    if (!task) {
      return errorResponse('Task not found', 404)
    }

    return successResponse(sanitizeDocument(task))
  } catch (error) {
    console.error('Task GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch task', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const taskId = params.taskId
    const body = await request.json()
    const tasksCollection = await getCollection(Collections.TASKS)

    const result = await tasksCollection.updateOne(
      { id: taskId, clientId: user.clientId },
      { $set: { ...body, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return errorResponse('Task not found', 404)
    }

    return successResponse({ message: 'Task updated successfully' })
  } catch (error) {
    console.error('Task PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update task', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const taskId = params.taskId
    const tasksCollection = await getCollection(Collections.TASKS)

    const result = await tasksCollection.deleteOne({ id: taskId, clientId: user.clientId })

    if (result.deletedCount === 0) {
      return errorResponse('Task not found', 404)
    }

    return successResponse({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Task DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete task', 500, error.message)
  }
}
