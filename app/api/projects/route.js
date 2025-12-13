import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { validateProjectData } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const filter = {}
    if (status) filter.status = status

    const projects = await projectsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(projects))
  } catch (error) {
    console.error('Projects GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch projects', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const validation = validateProjectData(body)
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const project = {
      id: uuidv4(),
      clientId: user.clientId,
      ...body,
      status: body.status || 'planning',
      progress: body.progress || 0,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await projectsCollection.insertOne(project)

    return successResponse(sanitizeDocument(project), 201)
  } catch (error) {
    console.error('Projects POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create project', 500, error.message)
  }
}
