import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { validateTaskData } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('projectId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const filter = {}
    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (projectId) filter.projectId = projectId

    const tasks = await tasksCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(tasks))
  } catch (error) {
    console.error('Tasks GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch tasks', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const validation = validateTaskData(body)
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const task = {
      id: uuidv4(),
      clientId: user.clientId,
      ...body,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await tasksCollection.insertOne(task)

    return successResponse(sanitizeDocument(task), 201)
  } catch (error) {
    console.error('Tasks POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create task', 500, error.message)
  }
}
