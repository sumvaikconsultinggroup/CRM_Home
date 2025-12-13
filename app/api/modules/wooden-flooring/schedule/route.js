import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const type = searchParams.get('type')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_schedule')

    let query = {}
    
    if (month) {
      const [year, monthNum] = month.split('-')
      const startDate = new Date(year, parseInt(monthNum) - 1, 1)
      const endDate = new Date(year, parseInt(monthNum), 0, 23, 59, 59)
      query.scheduledDate = { $gte: startDate, $lte: endDate }
    }
    
    if (type) query.type = type

    const schedules = await collection.find(query).sort({ scheduledDate: 1 }).toArray()
    
    // Get team members from main database
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')
    const teamMembers = await usersCollection.find({ clientId: user.clientId }).toArray()

    return successResponse({ 
      schedules: sanitizeDocuments(schedules),
      teamMembers: teamMembers.map(t => ({ id: t.id, name: t.name, role: t.role }))
    })
  } catch (error) {
    console.error('Schedule GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch schedule', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_schedule')

    const schedule = {
      id: uuidv4(),
      clientId: user.clientId,
      type: body.type || 'installation',
      title: body.title || '',
      description: body.description || '',
      projectId: body.projectId || null,
      orderId: body.orderId || null,
      customerId: body.customerId || null,
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      address: body.address || '',
      city: body.city || '',
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '18:00',
      duration: body.duration || 480,
      assignedTo: body.assignedTo || [],
      teamLead: body.teamLead || null,
      status: 'scheduled',
      priority: body.priority || 'normal',
      reminderSent: false,
      customerNotified: false,
      completedAt: null,
      completionNotes: '',
      photos: [],
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(schedule)
    return successResponse(sanitizeDocument(schedule), 201)
  } catch (error) {
    console.error('Schedule POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create schedule', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Schedule ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_schedule')
    const schedule = await collection.findOne({ id })
    
    if (!schedule) return errorResponse('Schedule not found', 404)

    if (action === 'complete') {
      updates.status = 'completed'
      updates.completedAt = new Date()
      updates.completionNotes = body.completionNotes || ''
    }

    if (action === 'reschedule') {
      updates.status = 'rescheduled'
      updates.scheduledDate = new Date(body.newDate)
      updates.startTime = body.newStartTime || schedule.startTime
      updates.endTime = body.newEndTime || schedule.endTime
    }

    if (action === 'cancel') {
      updates.status = 'cancelled'
      updates.cancellationReason = body.cancellationReason || ''
    }

    if (action === 'add_photo') {
      updates.photos = [...(schedule.photos || []), {
        id: uuidv4(),
        url: body.photoUrl,
        caption: body.photoCaption || '',
        uploadedAt: new Date()
      }]
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Schedule PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update schedule', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Schedule ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_schedule')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Schedule not found', 404)
    return successResponse({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Schedule DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete schedule', 500, error.message)
  }
}
