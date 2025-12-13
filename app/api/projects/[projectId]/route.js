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

    const { projectId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const project = await projectsCollection.findOne({ id: projectId })

    if (!project) {
      return errorResponse('Project not found', 404)
    }

    return successResponse(sanitizeDocument(project))
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

    const { projectId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const existingProject = await projectsCollection.findOne({ id: projectId })
    if (!existingProject) {
      return errorResponse('Project not found', 404)
    }

    const updatedProject = {
      ...existingProject,
      ...body,
      id: projectId,
      updatedAt: new Date()
    }

    await projectsCollection.updateOne(
      { id: projectId },
      { $set: updatedProject }
    )

    return successResponse(sanitizeDocument(updatedProject))
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

    const { projectId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const result = await projectsCollection.deleteOne({ id: projectId })

    if (result.deletedCount === 0) {
      return errorResponse('Project not found', 404)
    }

    return successResponse({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Project DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete project', 500, error.message)
  }
}
