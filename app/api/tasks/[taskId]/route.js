import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { taskId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const task = await tasksCollection.findOne({ id: taskId })

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

    const { taskId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const existingTask = await tasksCollection.findOne({ id: taskId })
    if (!existingTask) {
      return errorResponse('Task not found', 404)
    }

    const updatedTask = {
      ...existingTask,
      ...body,
      id: taskId,
      updatedAt: new Date()
    }

    await tasksCollection.updateOne(
      { id: taskId },
      { $set: updatedTask }
    )

    return successResponse(sanitizeDocument(updatedTask))
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

    const { taskId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const result = await tasksCollection.deleteOne({ id: taskId })

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
