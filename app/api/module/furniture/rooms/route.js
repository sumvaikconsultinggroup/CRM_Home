import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch rooms from measurements
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const measurementId = searchParams.get('measurementId')
    const roomId = searchParams.get('roomId')
    const projectId = searchParams.get('projectId')
    const roomType = searchParams.get('roomType')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')

    if (measurementId && roomId) {
      const measurement = await measurements.findOne({ id: measurementId })
      if (!measurement) return errorResponse('Measurement not found', 404)
      
      const room = measurement.rooms?.find(r => r.id === roomId)
      if (!room) return errorResponse('Room not found', 404)
      
      return successResponse(room)
    }

    if (measurementId) {
      const measurement = await measurements.findOne({ id: measurementId })
      if (!measurement) return errorResponse('Measurement not found', 404)
      
      return successResponse({ rooms: measurement.rooms || [] })
    }

    // Get all rooms across measurements for a project
    if (projectId) {
      const projectMeasurements = await measurements.find({ projectId, isActive: true }).toArray()
      const allRooms = []
      
      for (const m of projectMeasurements) {
        for (const room of (m.rooms || [])) {
          allRooms.push({
            ...room,
            measurementId: m.id,
            measurementNumber: m.measurementNumber
          })
        }
      }

      if (roomType) {
        return successResponse({ rooms: allRooms.filter(r => r.roomType === roomType) })
      }

      return successResponse({ rooms: allRooms })
    }

    return errorResponse('measurementId or projectId required', 400)
  } catch (error) {
    console.error('Furniture Rooms GET Error:', error)
    return errorResponse('Failed to fetch rooms', 500, error.message)
  }
}

// POST - Add room to measurement
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { measurementId } = body

    if (!measurementId) return errorResponse('Measurement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')

    const measurement = await measurements.findOne({ id: measurementId })
    if (!measurement) return errorResponse('Measurement not found', 404)

    const now = new Date().toISOString()
    const roomId = uuidv4()

    const room = {
      id: roomId,
      name: body.name || '',
      roomType: body.roomType || 'other',
      floor: body.floor || 0,
      // Dimensions
      dimensions: {
        length: body.dimensions?.length || 0,
        width: body.dimensions?.width || 0,
        height: body.dimensions?.height || 0,
        unit: body.dimensions?.unit || 'ft',
        area: body.dimensions?.area || 0,
        shape: body.dimensions?.shape || 'rectangular'
      },
      // Wall measurements
      walls: body.walls || [],
      // Features
      features: {
        windows: body.features?.windows || [],
        doors: body.features?.doors || [],
        beams: body.features?.beams || [],
        pillars: body.features?.pillars || [],
        niches: body.features?.niches || [],
        other: body.features?.other || []
      },
      // Service points
      servicePoints: {
        electrical: body.servicePoints?.electrical || [],
        plumbing: body.servicePoints?.plumbing || [],
        ac: body.servicePoints?.ac || [],
        other: body.servicePoints?.other || []
      },
      // Furniture planned for this room
      plannedFurniture: body.plannedFurniture || [],
      // Media
      photos: body.photos || [],
      sketches: body.sketches || [],
      // Notes
      notes: body.notes || '',
      specialConsiderations: body.specialConsiderations || '',
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await measurements.updateOne(
      { id: measurementId },
      {
        $push: { rooms: room },
        $set: { updatedAt: now }
      }
    )

    return successResponse(room, 201)
  } catch (error) {
    console.error('Furniture Rooms POST Error:', error)
    return errorResponse('Failed to add room', 500, error.message)
  }
}

// PUT - Update room
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { measurementId, roomId, ...updateData } = body

    if (!measurementId || !roomId) {
      return errorResponse('Measurement ID and Room ID required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')

    const measurement = await measurements.findOne({ id: measurementId })
    if (!measurement) return errorResponse('Measurement not found', 404)

    const roomIndex = measurement.rooms?.findIndex(r => r.id === roomId)
    if (roomIndex === -1) return errorResponse('Room not found', 404)

    const now = new Date().toISOString()
    const updatedRoom = {
      ...measurement.rooms[roomIndex],
      ...updateData,
      id: roomId,
      updatedAt: now,
      updatedBy: user.id
    }

    await measurements.updateOne(
      { id: measurementId },
      {
        $set: {
          [`rooms.${roomIndex}`]: updatedRoom,
          updatedAt: now
        }
      }
    )

    return successResponse(updatedRoom)
  } catch (error) {
    console.error('Furniture Rooms PUT Error:', error)
    return errorResponse('Failed to update room', 500, error.message)
  }
}

// DELETE - Remove room
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const measurementId = searchParams.get('measurementId')
    const roomId = searchParams.get('roomId')

    if (!measurementId || !roomId) {
      return errorResponse('Measurement ID and Room ID required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const measurements = db.collection('furniture_measurements')

    await measurements.updateOne(
      { id: measurementId },
      {
        $pull: { rooms: { id: roomId } },
        $set: { updatedAt: new Date().toISOString() }
      }
    )

    return successResponse({ message: 'Room removed' })
  } catch (error) {
    console.error('Furniture Rooms DELETE Error:', error)
    return errorResponse('Failed to remove room', 500, error.message)
  }
}
