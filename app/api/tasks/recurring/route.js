import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'
import { addDays, addWeeks, addMonths } from 'date-fns'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get recurring task configurations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    // Find all tasks with recurrence settings
    const recurringTasks = await tasksCollection
      .find({ 
        'recurrence.enabled': true,
        parentId: { $exists: false } // Only parent tasks
      })
      .toArray()

    return successResponse({
      recurringTasks: sanitizeDocuments(recurringTasks),
      total: recurringTasks.length
    })
  } catch (error) {
    console.error('Recurring Tasks GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch recurring tasks', 500, error.message)
  }
}

// POST - Manually trigger recurring task generation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return errorResponse('Task ID is required', 400)
    }

    // Get the recurring task template
    const templateTask = await tasksCollection.findOne({ 
      id: taskId,
      'recurrence.enabled': true 
    })

    if (!templateTask) {
      return errorResponse('Recurring task not found', 404)
    }

    // Calculate next occurrence date
    const lastOccurrence = templateTask.recurrence.lastOccurrence 
      ? new Date(templateTask.recurrence.lastOccurrence) 
      : new Date()
    
    let nextDate
    switch (templateTask.recurrence.frequency) {
      case 'daily':
        nextDate = addDays(lastOccurrence, 1)
        break
      case 'weekly':
        nextDate = addWeeks(lastOccurrence, 1)
        break
      case 'biweekly':
        nextDate = addWeeks(lastOccurrence, 2)
        break
      case 'monthly':
        nextDate = addMonths(lastOccurrence, 1)
        break
      default:
        return errorResponse('Invalid recurrence frequency', 400)
    }

    // Check if we've exceeded max occurrences
    const occurrenceCount = templateTask.recurrence.occurrenceCount || 0
    const maxOccurrences = templateTask.recurrence.occurrences 
      ? parseInt(templateTask.recurrence.occurrences) 
      : Infinity

    if (occurrenceCount >= maxOccurrences) {
      return errorResponse('Maximum occurrences reached', 400)
    }

    // Check if we've passed the end date
    if (templateTask.recurrence.endDate) {
      const endDate = new Date(templateTask.recurrence.endDate)
      if (nextDate > endDate) {
        return errorResponse('Recurrence end date reached', 400)
      }
    }

    // Create the new task occurrence
    const totalCount = await tasksCollection.countDocuments()
    const taskNumber = `TASK-${String(totalCount + 1).padStart(4, '0')}`
    const now = new Date()

    const newTask = {
      id: uuidv4(),
      taskNumber,
      clientId: user.clientId,
      
      // Copy from template
      title: templateTask.title,
      description: templateTask.description,
      taskType: templateTask.taskType,
      status: 'todo', // Always start as todo
      priority: templateTask.priority,
      projectId: templateTask.projectId,
      labels: templateTask.labels || [],
      assignees: templateTask.assignees || [],
      estimatedHours: templateTask.estimatedHours,
      checklist: templateTask.checklist?.map(c => ({ ...c, completed: false })) || [],
      
      // Set new due date relative to next occurrence
      dueDate: templateTask.dueDate 
        ? nextDate 
        : null,
      
      // Reference to parent recurring task
      recurringParentId: templateTask.id,
      occurrenceNumber: occurrenceCount + 1,
      
      // Metadata
      reporter: templateTask.reporter,
      watchers: templateTask.watchers || [],
      comments: [],
      attachments: [],
      activityLog: [{
        id: uuidv4(),
        action: 'created',
        description: `Recurring task created automatically (occurrence #${occurrenceCount + 1})`,
        userId: 'system',
        userName: 'System',
        timestamp: now
      }],
      
      createdBy: 'system',
      createdAt: now,
      updatedAt: now
    }

    await tasksCollection.insertOne(newTask)

    // Update the template's recurrence tracking
    await tasksCollection.updateOne(
      { id: taskId },
      { 
        $set: { 
          'recurrence.lastOccurrence': now,
          'recurrence.occurrenceCount': occurrenceCount + 1,
          updatedAt: now
        }
      }
    )

    return successResponse({
      task: sanitizeDocument(newTask),
      message: `Created occurrence #${occurrenceCount + 1}`
    }, 201)
  } catch (error) {
    console.error('Recurring Tasks POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create recurring task occurrence', 500, error.message)
  }
}

// PUT - Update recurring task settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { taskId, recurrence } = body

    if (!taskId) {
      return errorResponse('Task ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const task = await tasksCollection.findOne({ id: taskId })
    if (!task) {
      return errorResponse('Task not found', 404)
    }

    const now = new Date()
    await tasksCollection.updateOne(
      { id: taskId },
      { 
        $set: { 
          recurrence: {
            ...recurrence,
            lastOccurrence: task.recurrence?.lastOccurrence || null,
            occurrenceCount: task.recurrence?.occurrenceCount || 0
          },
          updatedAt: now 
        }
      }
    )

    return successResponse({ message: 'Recurring settings updated' })
  } catch (error) {
    console.error('Recurring Tasks PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update recurring settings', 500, error.message)
  }
}

// DELETE - Remove recurrence from a task
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return errorResponse('Task ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    await tasksCollection.updateOne(
      { id: taskId },
      { 
        $unset: { recurrence: '' },
        $set: { updatedAt: new Date() }
      }
    )

    return successResponse({ message: 'Recurrence removed' })
  } catch (error) {
    console.error('Recurring Tasks DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to remove recurrence', 500, error.message)
  }
}
