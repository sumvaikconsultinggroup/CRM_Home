import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

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

    const now = new Date()
    
    // Track completion
    if (body.status === 'completed' && existingTask.status !== 'completed') {
      body.completedAt = now
      body.completedBy = user.id
    }

    const updatedTask = {
      ...existingTask,
      ...body,
      id: taskId,
      updatedAt: now
    }

    await tasksCollection.updateOne(
      { id: taskId },
      { $set: updatedTask }
    )

    // Update project progress if task is linked to a project
    if (updatedTask.projectId) {
      const projectsCollection = db.collection('projects')
      const project = await projectsCollection.findOne({ id: updatedTask.projectId })
      
      if (project && project.settings?.autoProgressFromTasks) {
        // Get all tasks for this project
        const projectTasks = await tasksCollection.find({ projectId: updatedTask.projectId }).toArray()
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length
        const totalTasks = projectTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        await projectsCollection.updateOne(
          { id: updatedTask.projectId },
          { 
            $set: { 
              progress,
              updatedAt: now
            },
            $push: {
              activityLog: {
                id: uuidv4(),
                action: 'task_updated',
                description: `Task "${updatedTask.title}" ${body.status === 'completed' ? 'completed' : 'updated'}. Progress: ${progress}%`,
                userId: user.id,
                userName: user.name || user.email,
                timestamp: now
              }
            }
          }
        )
      }
    }

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

    const task = await tasksCollection.findOne({ id: taskId })
    if (!task) {
      return errorResponse('Task not found', 404)
    }

    await tasksCollection.deleteOne({ id: taskId })

    // Update project progress if task was linked
    if (task.projectId) {
      const projectsCollection = db.collection('projects')
      const project = await projectsCollection.findOne({ id: task.projectId })
      
      if (project && project.settings?.autoProgressFromTasks) {
        const projectTasks = await tasksCollection.find({ projectId: task.projectId }).toArray()
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length
        const totalTasks = projectTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        await projectsCollection.updateOne(
          { id: task.projectId },
          { 
            $set: { 
              progress,
              updatedAt: new Date()
            }
          }
        )
      }
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
