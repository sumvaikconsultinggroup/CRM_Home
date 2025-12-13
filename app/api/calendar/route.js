import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get calendar events
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const eventId = searchParams.get('id')
    const view = searchParams.get('view') // day, week, month

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('calendar_events')

    // Get single event by ID
    if (eventId) {
      const event = await collection.findOne({ id: eventId })
      if (!event) return errorResponse('Event not found', 404)
      return successResponse(sanitizeDocument(event))
    }

    let query = {}
    
    // Filter by month
    if (month) {
      const [year, monthNum] = month.split('-')
      const startDate = new Date(year, parseInt(monthNum) - 1, 1)
      const endDate = new Date(year, parseInt(monthNum), 0, 23, 59, 59)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const events = await collection.find(query).sort({ date: 1, startTime: 1 }).toArray()

    // Get tasks from tasks collection
    const tasksCollection = db.collection('tasks')
    let tasksQuery = {}
    
    if (month) {
      const [year, monthNum] = month.split('-')
      const startDate = new Date(year, parseInt(monthNum) - 1, 1)
      const endDate = new Date(year, parseInt(monthNum), 0, 23, 59, 59)
      tasksQuery.dueDate = { $gte: startDate, $lte: endDate }
    }

    const tasks = await tasksCollection.find(tasksQuery).toArray()

    // Convert tasks to calendar events format
    const taskEvents = tasks.map(task => ({
      id: task.id,
      clientId: task.clientId,
      title: task.title,
      description: task.description || '',
      date: task.dueDate,
      startTime: '09:00',
      endTime: '10:00',
      type: 'task',
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e',
      isTask: true,
      originalTask: task
    }))

    // Combine events and task events
    const allEvents = [...sanitizeDocuments(events), ...taskEvents]
    
    // Sort by date
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Calculate stats
    const stats = {
      totalEvents: allEvents.length,
      tasks: taskEvents.length,
      meetings: events.filter(e => e.type === 'meeting').length,
      reminders: events.filter(e => e.type === 'reminder').length,
      deadlines: events.filter(e => e.type === 'deadline').length
    }

    return successResponse({ events: allEvents, stats })
  } catch (error) {
    console.error('Calendar GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch calendar events', 500, error.message)
  }
}

// Create calendar event
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('calendar_events')

    const event = {
      id: uuidv4(),
      clientId: user.clientId,
      title: body.title,
      description: body.description || '',
      date: body.date ? new Date(body.date) : new Date(),
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '10:00',
      allDay: body.allDay || false,
      type: body.type || 'event',
      location: body.location || '',
      attendees: body.attendees || [],
      recurring: body.recurring || false,
      recurrencePattern: body.recurrencePattern || null,
      recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
      reminder: body.reminder || 30,
      reminderSent: false,
      projectId: body.projectId || null,
      customerId: body.customerId || null,
      leadId: body.leadId || null,
      status: body.status || 'scheduled',
      color: body.color || '#6366f1',
      priority: body.priority || 'medium',
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(event)
    return successResponse(sanitizeDocument(event), 201)
  } catch (error) {
    console.error('Calendar POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create calendar event', 500, error.message)
  }
}

// Update calendar event
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Event ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('calendar_events')
    const event = await collection.findOne({ id })
    
    if (!event) return errorResponse('Event not found', 404)

    // Handle special actions
    if (action === 'complete') {
      updates.status = 'completed'
      updates.completedAt = new Date()
    }

    if (action === 'cancel') {
      updates.status = 'cancelled'
      updates.cancelledAt = new Date()
    }

    if (action === 'reschedule') {
      updates.date = new Date(body.newDate)
      if (body.newStartTime) updates.startTime = body.newStartTime
      if (body.newEndTime) updates.endTime = body.newEndTime
    }

    // Convert date if provided
    if (updates.date) {
      updates.date = new Date(updates.date)
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Calendar PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update calendar event', 500, error.message)
  }
}

// Delete calendar event
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Event ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('calendar_events')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Event not found', 404)
    return successResponse({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Calendar DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete calendar event', 500, error.message)
  }
}
