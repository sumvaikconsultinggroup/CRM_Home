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

    const projectId = params.projectId
    const projectsCollection = await getCollection(Collections.PROJECTS)
    const tasksCollection = await getCollection(Collections.TASKS)

    const project = await projectsCollection.findOne({ id: projectId, clientId: user.clientId })
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    // Get associated tasks
    const tasks = await tasksCollection.find({ projectId, clientId: user.clientId }).toArray()

    return successResponse({
      ...sanitizeDocument(project),
      tasks: tasks.map(t => sanitizeDocument(t))
    })
  } catch (error) {
    console.error('Project GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch project', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const projectId = params.projectId
    const body = await request.json()
    const projectsCollection = await getCollection(Collections.PROJECTS)

    const result = await projectsCollection.updateOne(
      { id: projectId, clientId: user.clientId },
      { $set: { ...body, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return errorResponse('Project not found', 404)
    }

    return successResponse({ message: 'Project updated successfully' })
  } catch (error) {
    console.error('Project PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update project', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const projectId = params.projectId
    const projectsCollection = await getCollection(Collections.PROJECTS)
    const tasksCollection = await getCollection(Collections.TASKS)

    const result = await projectsCollection.deleteOne({ id: projectId, clientId: user.clientId })

    if (result.deletedCount === 0) {
      return errorResponse('Project not found', 404)
    }

    // Also delete associated tasks
    await tasksCollection.deleteMany({ projectId, clientId: user.clientId })

    return successResponse({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Project DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete project', 500, error.message)
  }
}
