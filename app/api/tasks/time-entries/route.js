import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get time entries for a task
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const timeEntriesCollection = db.collection('time_entries')
    const usersCollection = db.collection('users')

    // Build filter
    const filter = {}
    if (taskId) filter.taskId = taskId
    if (userId) filter.userId = userId
    if (startDate || endDate) {
      filter.date = {}
      if (startDate) filter.date.$gte = new Date(startDate)
      if (endDate) filter.date.$lte = new Date(endDate)
    }

    const timeEntries = await timeEntriesCollection
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .toArray()

    // Get users for enrichment
    const users = await usersCollection.find({}).toArray()
    const userMap = {}
    users.forEach(u => { userMap[u.id] = u })

    const enrichedEntries = timeEntries.map(entry => ({
      ...entry,
      userDetails: userMap[entry.userId] ? {
        id: userMap[entry.userId].id,
        name: userMap[entry.userId].name,
        email: userMap[entry.userId].email,
        avatar: userMap[entry.userId].avatar
      } : null
    }))

    // Calculate totals
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0)
    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.minutes || 0), 0)
    const adjustedTotal = totalHours + Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    return successResponse({
      timeEntries: sanitizeDocuments(enrichedEntries),
      totals: {
        hours: adjustedTotal,
        minutes: remainingMinutes,
        totalMinutes: (totalHours * 60) + totalMinutes,
        formatted: `${adjustedTotal}h ${remainingMinutes}m`
      }
    })
  } catch (error) {
    console.error('Time Entries GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch time entries', 500, error.message)
  }
}

// POST - Log time entry
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { taskId, hours, minutes, description, date, startTime, endTime } = body

    if (!taskId) {
      return errorResponse('Task ID is required', 400)
    }

    if (!hours && !minutes && (!startTime || !endTime)) {
      return errorResponse('Either hours/minutes or start/end time is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const timeEntriesCollection = db.collection('time_entries')
    const tasksCollection = db.collection('tasks')

    // Verify task exists
    const task = await tasksCollection.findOne({ id: taskId })
    if (!task) {
      return errorResponse('Task not found', 404)
    }

    // Calculate duration if start/end time provided
    let totalHours = hours || 0
    let totalMinutes = minutes || 0
    
    if (startTime && endTime) {
      const start = new Date(`1970-01-01T${startTime}:00`)
      const end = new Date(`1970-01-01T${endTime}:00`)
      const diffMs = end - start
      const diffMinutes = Math.round(diffMs / 60000)
      totalHours = Math.floor(diffMinutes / 60)
      totalMinutes = diffMinutes % 60
    }

    const now = new Date()
    const timeEntry = {
      id: uuidv4(),
      clientId: user.clientId,
      taskId,
      projectId: task.projectId,
      
      // User
      userId: user.id,
      userName: user.name || user.email,
      
      // Time
      hours: totalHours,
      minutes: totalMinutes,
      totalMinutes: (totalHours * 60) + totalMinutes,
      
      // Time range (optional)
      startTime: startTime || null,
      endTime: endTime || null,
      
      // Details
      description: description || '',
      date: date ? new Date(date) : now,
      
      // Billing (for future use)
      billable: body.billable !== false,
      billed: false,
      hourlyRate: body.hourlyRate || null,
      
      // Metadata
      createdAt: now,
      updatedAt: now
    }

    await timeEntriesCollection.insertOne(timeEntry)

    // Update task's logged hours
    const newLoggedHours = (task.loggedHours || 0) + totalHours + (totalMinutes / 60)
    
    await tasksCollection.updateOne(
      { id: taskId },
      { 
        $set: { 
          loggedHours: Math.round(newLoggedHours * 100) / 100,
          updatedAt: now 
        },
        $push: { 
          timeEntries: timeEntry.id,
          activityLog: {
            id: uuidv4(),
            action: 'time_logged',
            description: `${user.name || user.email} logged ${totalHours}h ${totalMinutes}m`,
            userId: user.id,
            userName: user.name || user.email,
            metadata: { 
              timeEntryId: timeEntry.id, 
              hours: totalHours, 
              minutes: totalMinutes,
              description 
            },
            timestamp: now
          }
        }
      }
    )

    return successResponse(sanitizeDocument(timeEntry), 201)
  } catch (error) {
    console.error('Time Entries POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to log time', 500, error.message)
  }
}

// PUT - Update time entry
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, hours, minutes, description, date } = body

    if (!id) {
      return errorResponse('Time entry ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const timeEntriesCollection = db.collection('time_entries')
    const tasksCollection = db.collection('tasks')

    const existingEntry = await timeEntriesCollection.findOne({ id })
    if (!existingEntry) {
      return errorResponse('Time entry not found', 404)
    }

    // Calculate hours difference for task update
    const oldTotalMinutes = existingEntry.totalMinutes || 0
    const newHours = hours !== undefined ? hours : existingEntry.hours
    const newMinutes = minutes !== undefined ? minutes : existingEntry.minutes
    const newTotalMinutes = (newHours * 60) + newMinutes
    const diffMinutes = newTotalMinutes - oldTotalMinutes

    const now = new Date()
    const updates = {
      hours: newHours,
      minutes: newMinutes,
      totalMinutes: newTotalMinutes,
      description: description !== undefined ? description : existingEntry.description,
      date: date ? new Date(date) : existingEntry.date,
      updatedAt: now
    }

    await timeEntriesCollection.updateOne({ id }, { $set: updates })

    // Update task's logged hours
    if (diffMinutes !== 0) {
      const task = await tasksCollection.findOne({ id: existingEntry.taskId })
      const newLoggedHours = (task.loggedHours || 0) + (diffMinutes / 60)
      
      await tasksCollection.updateOne(
        { id: existingEntry.taskId },
        { $set: { loggedHours: Math.round(newLoggedHours * 100) / 100, updatedAt: now } }
      )
    }

    const updatedEntry = { ...existingEntry, ...updates }
    return successResponse(sanitizeDocument(updatedEntry))
  } catch (error) {
    console.error('Time Entries PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update time entry', 500, error.message)
  }
}

// DELETE - Remove time entry
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Time entry ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const timeEntriesCollection = db.collection('time_entries')
    const tasksCollection = db.collection('tasks')

    const entry = await timeEntriesCollection.findOne({ id })
    if (!entry) {
      return errorResponse('Time entry not found', 404)
    }

    // Update task's logged hours
    const task = await tasksCollection.findOne({ id: entry.taskId })
    const hoursToRemove = entry.hours + (entry.minutes / 60)
    const newLoggedHours = Math.max(0, (task.loggedHours || 0) - hoursToRemove)

    await tasksCollection.updateOne(
      { id: entry.taskId },
      { 
        $set: { loggedHours: Math.round(newLoggedHours * 100) / 100, updatedAt: new Date() },
        $pull: { timeEntries: id }
      }
    )

    await timeEntriesCollection.deleteOne({ id })

    return successResponse({ message: 'Time entry deleted successfully' })
  } catch (error) {
    console.error('Time Entries DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete time entry', 500, error.message)
  }
}
