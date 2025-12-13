import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch rooms for a project
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const projectId = searchParams.get('projectId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rooms = db.collection('flooring_rooms')

    if (id) {
      const room = await rooms.findOne({ id })
      if (!room) return errorResponse('Room not found', 404)
      return successResponse(sanitizeDocument(room))
    }

    if (!projectId) {
      return errorResponse('Project ID required', 400)
    }

    const projectRooms = await rooms.find({ projectId }).sort({ createdAt: 1 }).toArray()

    // Calculate totals
    const totalArea = projectRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)
    const totalGrossArea = projectRooms.reduce((sum, r) => sum + (r.grossArea || 0), 0)
    const totalDoorways = projectRooms.reduce((sum, r) => sum + (r.doorways || 1), 0)

    return successResponse({
      rooms: sanitizeDocuments(projectRooms),
      summary: {
        roomCount: projectRooms.length,
        totalArea,
        totalGrossArea,
        totalDoorways
      }
    })
  } catch (error) {
    console.error('Rooms GET Error:', error)
    return errorResponse('Failed to fetch rooms', 500, error.message)
  }
}

// POST - Add room to project
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    if (!body.projectId) {
      return errorResponse('Project ID required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rooms = db.collection('flooring_rooms')
    const projects = db.collection('flooring_projects')

    const roomId = uuidv4()
    const now = new Date().toISOString()

    // Calculate areas
    const length = parseFloat(body.length || body.dimensions?.length) || 0
    const width = parseFloat(body.width || body.dimensions?.width) || 0
    const grossArea = length * width

    // Calculate obstacles area
    const obstacles = body.obstacles || []
    const obstaclesArea = obstacles.reduce((sum, o) => {
      const oArea = (parseFloat(o.length) || 0) * (parseFloat(o.width) || 0)
      return sum + oArea
    }, 0)

    const netArea = grossArea - obstaclesArea
    const wastagePercent = parseFloat(body.wastagePercent) || 10
    const areaWithWastage = netArea * (1 + wastagePercent / 100)

    const room = {
      id: roomId,
      projectId: body.projectId,
      roomName: body.roomName || body.name || 'Room',
      roomType: body.roomType || 'living_room',
      floor: body.floor || 'ground',
      dimensions: {
        length,
        width,
        height: parseFloat(body.height || body.dimensions?.height) || 9
      },
      grossArea,
      obstacles: obstacles.map((o, i) => ({
        id: `OBS-${i + 1}`,
        name: o.name || 'Obstacle',
        length: parseFloat(o.length) || 0,
        width: parseFloat(o.width) || 0,
        area: (parseFloat(o.length) || 0) * (parseFloat(o.width) || 0)
      })),
      obstaclesArea,
      netArea,
      wastagePercent,
      areaWithWastage,
      doorways: parseInt(body.doorways) || 1,
      subfloorType: body.subfloorType || 'concrete',
      subfloorCondition: body.subfloorCondition || 'good', // good, fair, poor
      moistureLevel: body.moistureLevel || null,
      notes: body.notes || '',
      photos: body.photos || [],
      selectedProductId: body.selectedProductId || null,
      selectedProduct: null,
      measurementDate: body.measurementDate || now,
      measuredBy: body.measuredBy || user.name || user.id,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await rooms.insertOne(room)

    // Update project total area
    const allRooms = await rooms.find({ projectId: body.projectId }).toArray()
    const totalArea = allRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)

    await projects.updateOne(
      { id: body.projectId },
      { $set: { totalArea, roomCount: allRooms.length, updatedAt: now } }
    )

    return successResponse(sanitizeDocument(room), 201)
  } catch (error) {
    console.error('Rooms POST Error:', error)
    return errorResponse('Failed to create room', 500, error.message)
  }
}

// PUT - Update room
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Room ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rooms = db.collection('flooring_rooms')
    const projects = db.collection('flooring_projects')

    const room = await rooms.findOne({ id })
    if (!room) return errorResponse('Room not found', 404)

    const now = new Date().toISOString()

    // Recalculate areas if dimensions changed
    if (updateData.length || updateData.width || updateData.dimensions || updateData.obstacles) {
      const length = parseFloat(updateData.length || updateData.dimensions?.length || room.dimensions.length)
      const width = parseFloat(updateData.width || updateData.dimensions?.width || room.dimensions.width)
      const grossArea = length * width

      const obstacles = updateData.obstacles || room.obstacles
      const obstaclesArea = obstacles.reduce((sum, o) => {
        return sum + (parseFloat(o.area) || (parseFloat(o.length) || 0) * (parseFloat(o.width) || 0))
      }, 0)

      const netArea = grossArea - obstaclesArea
      const wastagePercent = parseFloat(updateData.wastagePercent || room.wastagePercent) || 10
      const areaWithWastage = netArea * (1 + wastagePercent / 100)

      updateData.dimensions = {
        length,
        width,
        height: parseFloat(updateData.height || updateData.dimensions?.height || room.dimensions.height)
      }
      updateData.grossArea = grossArea
      updateData.obstaclesArea = obstaclesArea
      updateData.netArea = netArea
      updateData.areaWithWastage = areaWithWastage
    }

    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await rooms.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    // Update project total area
    const allRooms = await rooms.find({ projectId: room.projectId }).toArray()
    const totalArea = allRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)

    await projects.updateOne(
      { id: room.projectId },
      { $set: { totalArea, updatedAt: now } }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Rooms PUT Error:', error)
    return errorResponse('Failed to update room', 500, error.message)
  }
}

// DELETE - Remove room
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Room ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rooms = db.collection('flooring_rooms')
    const projects = db.collection('flooring_projects')

    const room = await rooms.findOne({ id })
    if (!room) return errorResponse('Room not found', 404)

    await rooms.deleteOne({ id })

    // Update project total area
    const allRooms = await rooms.find({ projectId: room.projectId }).toArray()
    const totalArea = allRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)

    await projects.updateOne(
      { id: room.projectId },
      { $set: { totalArea, roomCount: allRooms.length, updatedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Room deleted' })
  } catch (error) {
    console.error('Rooms DELETE Error:', error)
    return errorResponse('Failed to delete room', 500, error.message)
  }
}
