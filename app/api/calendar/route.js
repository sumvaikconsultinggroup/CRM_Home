import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: YYYY-MM
    const year = searchParams.get('year')

    const eventsCollection = await getCollection('calendar_events')
    
    let query = { clientId: user.clientId }
    
    if (month) {
      const startDate = new Date(`${month}-01`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      query.date = { $gte: startDate, $lt: endDate }
    }

    const events = await eventsCollection
      .find(query)
      .sort({ date: 1 })
      .toArray()

    return successResponse(sanitizeDocuments(events))
  } catch (error) {
    console.error('Calendar GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch events', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { title, description, date, time, type, color, reminder } = body

    if (!title || !date) {
      return errorResponse('Title and date are required', 400)
    }

    const eventsCollection = await getCollection('calendar_events')

    const newEvent = {
      id: uuidv4(),
      clientId: user.clientId,
      createdBy: user.id,
      title,
      description: description || '',
      date: new Date(date),
      time: time || null,
      type: type || 'event', // event, task, meeting, reminder
      color: color || '#3B82F6',
      reminder: reminder || false,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await eventsCollection.insertOne(newEvent)
    return successResponse(sanitizeDocument(newEvent), 201)
  } catch (error) {
    console.error('Calendar POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to create event', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponse('Event ID is required', 400)
    }

    const eventsCollection = await getCollection('calendar_events')

    const result = await eventsCollection.findOneAndUpdate(
      { id, clientId: user.clientId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Event not found', 404)
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Calendar PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to update event', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Event ID is required', 400)
    }

    const eventsCollection = await getCollection('calendar_events')
    const result = await eventsCollection.deleteOne({ id, clientId: user.clientId })

    if (result.deletedCount === 0) {
      return errorResponse('Event not found', 404)
    }

    return successResponse({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Calendar DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to delete event', 500, error.message)
  }
}
