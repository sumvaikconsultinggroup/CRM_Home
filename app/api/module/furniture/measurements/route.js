import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate measurement number
const generateMeasurementNumber = async (db) => {
  const measurements = db.collection('furniture_measurements')
  const count = await measurements.countDocuments() + 1
  const year = new Date().getFullYear()
  return `FMS-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch measurements
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const requirementId = searchParams.get('requirementId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')

    if (id) {
      const measurement = await measurements.findOne({ id })
      if (!measurement) return errorResponse('Measurement not found', 404)
      return successResponse(sanitizeDocument(measurement))
    }

    const query = { isActive: true }
    if (requirementId) query.requirementId = requirementId
    if (projectId) query.projectId = projectId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { measurementNumber: { $regex: search, $options: 'i' } },
        { 'site.address': { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      measurements.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      measurements.countDocuments(query)
    ])

    return successResponse({
      measurements: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Furniture Measurements GET Error:', error)
    return errorResponse('Failed to fetch measurements', 500, error.message)
  }
}

// POST - Create measurement session
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const measurementId = uuidv4()
    const measurementNumber = await generateMeasurementNumber(db)

    const measurement = {
      id: measurementId,
      measurementNumber,
      // Links
      requirementId: body.requirementId || null,
      projectId: body.projectId || null,
      leadId: body.leadId || null,
      contactId: body.contactId || null,
      // Site info
      site: {
        address: body.site?.address || '',
        city: body.site?.city || '',
        state: body.site?.state || '',
        pincode: body.site?.pincode || '',
        landmark: body.site?.landmark || '',
        accessInstructions: body.site?.accessInstructions || '',
        contactPerson: body.site?.contactPerson || '',
        contactPhone: body.site?.contactPhone || ''
      },
      // Scheduling
      scheduledDate: body.scheduledDate || null,
      scheduledTime: body.scheduledTime || null,
      actualVisitDate: body.actualVisitDate || null,
      // Rooms with measurements
      rooms: body.rooms || [],
      // Site conditions
      siteConditions: {
        ceilingHeight: body.siteConditions?.ceilingHeight || null,
        floorType: body.siteConditions?.floorType || '',
        wallCondition: body.siteConditions?.wallCondition || '',
        existingFurniture: body.siteConditions?.existingFurniture || '',
        accessDifficulty: body.siteConditions?.accessDifficulty || 'normal',
        elevatorAvailable: body.siteConditions?.elevatorAvailable || false,
        parkingAvailable: body.siteConditions?.parkingAvailable || false
      },
      // Service points
      servicePoints: body.servicePoints || [],
      // Media
      photos: body.photos || [],
      videos: body.videos || [],
      sketches: body.sketches || [],
      voiceNotes: body.voiceNotes || [],
      // Status
      status: body.status || 'scheduled',
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      // Assignment
      measuredBy: body.measuredBy || user.id,
      teamMembers: body.teamMembers || [],
      // Tracking
      statusHistory: [{
        status: body.status || 'scheduled',
        timestamp: now,
        by: user.id,
        notes: 'Measurement session created'
      }],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await measurements.insertOne(measurement)

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'measurement.created',
      entityType: 'measurement',
      entityId: measurementId,
      data: { measurementNumber, site: measurement.site.address },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(measurement), 201)
  } catch (error) {
    console.error('Furniture Measurements POST Error:', error)
    return errorResponse('Failed to create measurement', 500, error.message)
  }
}

// PUT - Update measurement
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Measurement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')
    const requirements = db.collection('furniture_requirements')
    const events = db.collection('furniture_events')

    const measurement = await measurements.findOne({ id })
    if (!measurement) return errorResponse('Measurement not found', 404)

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'complete') {
      await measurements.updateOne(
        { id },
        {
          $set: { 
            status: 'completed', 
            completedAt: now,
            actualVisitDate: now,
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'completed',
              timestamp: now,
              by: user.id,
              notes: body.notes || 'Measurement completed'
            }
          }
        }
      )

      // Update linked requirement status
      if (measurement.requirementId) {
        await requirements.updateOne(
          { id: measurement.requirementId },
          {
            $set: { status: 'measurement_done', updatedAt: now },
            $push: {
              statusHistory: {
                status: 'measurement_done',
                timestamp: now,
                by: user.id,
                notes: `Measurement ${measurement.measurementNumber} completed`
              }
            }
          }
        )
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'measurement.completed',
        entityType: 'measurement',
        entityId: id,
        data: { measurementNumber: measurement.measurementNumber, roomCount: measurement.rooms?.length },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Measurement completed', status: 'completed' })
    }

    if (action === 'add_room') {
      const room = {
        id: uuidv4(),
        ...body.room,
        addedAt: now,
        addedBy: user.id
      }

      await measurements.updateOne(
        { id },
        {
          $push: { rooms: room },
          $set: { updatedAt: now }
        }
      )

      return successResponse({ message: 'Room added', room })
    }

    if (action === 'update_room') {
      const { roomId, roomData } = body
      
      await measurements.updateOne(
        { id, 'rooms.id': roomId },
        {
          $set: {
            'rooms.$': { ...roomData, id: roomId, updatedAt: now },
            updatedAt: now
          }
        }
      )

      return successResponse({ message: 'Room updated' })
    }

    if (action === 'add_photo') {
      const photo = {
        id: uuidv4(),
        ...body.photo,
        uploadedAt: now,
        uploadedBy: user.id
      }

      await measurements.updateOne(
        { id },
        {
          $push: { photos: photo },
          $set: { updatedAt: now }
        }
      )

      return successResponse({ message: 'Photo added', photo })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await measurements.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Measurements PUT Error:', error)
    return errorResponse('Failed to update measurement', 500, error.message)
  }
}

// DELETE - Delete measurement
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Measurement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')

    await measurements.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Measurement deleted' })
  } catch (error) {
    console.error('Furniture Measurements DELETE Error:', error)
    return errorResponse('Failed to delete measurement', 500, error.message)
  }
}
