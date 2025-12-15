import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get subtasks for a parent task
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (!parentId) {
      return errorResponse('Parent task ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')
    const usersCollection = db.collection('users')

    const subtasks = await tasksCollection
      .find({ parentId })
      .sort({ order: 1, createdAt: 1 })
      .toArray()

    // Get users for assignee details
    const users = await usersCollection.find({}).toArray()
    const userMap = {}
    users.forEach(u => { userMap[u.id] = u })

    const enrichedSubtasks = subtasks.map(task => ({
      ...task,
      assigneeDetails: (task.assignees || []).map(id => userMap[id]).filter(Boolean).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar
      }))
    }))

    // Calculate parent progress
    const completed = subtasks.filter(t => t.status === 'completed').length
    const total = subtasks.length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return successResponse({
      subtasks: sanitizeDocuments(enrichedSubtasks),
      stats: {
        total,
        completed,
        progress
      }
    })
  } catch (error) {
    console.error('Subtasks GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch subtasks', 500, error.message)
  }
}

// POST - Create a subtask
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { parentId, title, description, priority, assignees, dueDate } = body

    if (!parentId || !title) {
      return errorResponse('Parent task ID and title are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    // Verify parent task exists
    const parentTask = await tasksCollection.findOne({ id: parentId })
    if (!parentTask) {
      return errorResponse('Parent task not found', 404)
    }

    // Get subtask count for ordering and numbering
    const subtaskCount = await tasksCollection.countDocuments({ parentId })
    const totalCount = await tasksCollection.countDocuments()
    const taskNumber = `TASK-${String(totalCount + 1).padStart(4, '0')}`

    const now = new Date()
    const subtask = {
      id: uuidv4(),
      taskNumber,
      clientId: user.clientId,
      
      // Parent reference
      parentId,
      isSubtask: true,
      order: subtaskCount,
      
      // Basic info
      title,
      description: description || '',
      
      // Inherit project from parent
      projectId: parentTask.projectId,
      
      // Type and status
      taskType: 'subtask',
      status: 'todo',
      priority: priority || parentTask.priority || 'medium',
      
      // People
      assignees: assignees || [],
      reporter: user.id,
      watchers: [user.id],
      
      // Dates
      startDate: null,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: null,
      completedBy: null,
      
      // Time tracking
      estimatedHours: null,
      loggedHours: 0,
      timeEntries: [],
      
      // Organization
      labels: parentTask.labels || [],
      tags: [],
      
      // Progress
      progress: 0,
      checklist: [],
      
      // Attachments and comments
      attachments: [],
      comments: [],
      
      // Activity
      activityLog: [{
        id: uuidv4(),
        action: 'created',
        description: `Subtask created by ${user.name || user.email}`,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      }],
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await tasksCollection.insertOne(subtask)

    // Update parent task
    await tasksCollection.updateOne(
      { id: parentId },
      { 
        $push: { 
          subtasks: subtask.id,
          activityLog: {
            id: uuidv4(),
            action: 'subtask_added',
            description: `${user.name || user.email} added subtask "${title}"`,
            userId: user.id,
            userName: user.name || user.email,
            metadata: { subtaskId: subtask.id, subtaskTitle: title },
            timestamp: now
          }
        },
        $set: { updatedAt: now }
      }
    )

    // Recalculate parent progress
    const allSubtasks = await tasksCollection.find({ parentId }).toArray()
    const completedSubtasks = allSubtasks.filter(t => t.status === 'completed').length
    const parentProgress = allSubtasks.length > 0 
      ? Math.round((completedSubtasks / allSubtasks.length) * 100) 
      : 0

    await tasksCollection.updateOne(
      { id: parentId },
      { $set: { progress: parentProgress } }
    )

    return successResponse(sanitizeDocument(subtask), 201)
  } catch (error) {
    console.error('Subtasks POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create subtask', 500, error.message)
  }
}

// PUT - Reorder subtasks
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { parentId, subtaskIds } = body

    if (!parentId || !subtaskIds || !Array.isArray(subtaskIds)) {
      return errorResponse('Parent ID and subtask IDs array required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    // Update order for each subtask
    const now = new Date()
    for (let i = 0; i < subtaskIds.length; i++) {
      await tasksCollection.updateOne(
        { id: subtaskIds[i], parentId },
        { $set: { order: i, updatedAt: now } }
      )
    }

    return successResponse({ message: 'Subtasks reordered successfully' })
  } catch (error) {
    console.error('Subtasks PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to reorder subtasks', 500, error.message)
  }
}
