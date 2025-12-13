import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, RoomTypes, generateFlooringId, FlooringCalculations } from '@/lib/db/flooring-schema'

// GET - Fetch rooms for a project
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const clientId = searchParams.get('clientId')
    const roomId = searchParams.get('roomId')

    const rooms = await getCollection(FlooringCollections.ROOMS)
    
    if (roomId) {
      const room = await rooms.findOne({ id: roomId })
      return NextResponse.json(room || { error: 'Room not found' })
    }

    const query = {}
    if (projectId) query.projectId = projectId
    if (clientId) query.clientId = clientId

    const result = await rooms.find(query).sort({ createdAt: 1 }).toArray()
    
    // Calculate totals
    const totals = result.reduce((acc, room) => ({
      totalGrossArea: acc.totalGrossArea + (room.grossArea || 0),
      totalNetArea: acc.totalNetArea + (room.netArea || 0),
      roomCount: acc.roomCount + 1
    }), { totalGrossArea: 0, totalNetArea: 0, roomCount: 0 })

    return NextResponse.json({ rooms: result, totals })
  } catch (error) {
    console.error('Flooring Rooms GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

// POST - Create new room
export async function POST(request) {
  try {
    const body = await request.json()
    const rooms = await getCollection(FlooringCollections.ROOMS)

    // Calculate areas
    const grossArea = body.dimensions.length * body.dimensions.width
    const obstaclesArea = (body.obstacles || []).reduce((sum, obs) => 
      sum + (obs.length * obs.width), 0)
    const netArea = grossArea - obstaclesArea

    const room = {
      id: generateFlooringId('FLR'),
      projectId: body.projectId,
      leadId: body.leadId,
      clientId: body.clientId,
      roomName: body.roomName,
      roomType: body.roomType || 'other',
      floor: body.floor || 'ground',
      dimensions: {
        length: body.dimensions.length,
        width: body.dimensions.width,
        height: body.dimensions.height || 9,
        unit: body.dimensions.unit || 'ft'
      },
      shape: body.shape || 'rectangular',
      customShapePoints: body.customShapePoints || null,
      obstacles: (body.obstacles || []).map(obs => ({
        id: generateFlooringId('OBS'),
        type: obs.type, // closet, pillar, fireplace, etc.
        name: obs.name,
        length: obs.length,
        width: obs.width,
        area: obs.length * obs.width
      })),
      grossArea,
      netArea,
      perimeter: 2 * (body.dimensions.length + body.dimensions.width),
      doorways: body.doorways || 1,
      direction: body.direction || 'parallel', // parallel or perpendicular to main light
      subfloorType: body.subfloorType || 'concrete', // concrete, plywood, existing
      subfloorCondition: body.subfloorCondition || 'good',
      moistureLevel: body.moistureLevel || null,
      existingFlooring: body.existingFlooring || null,
      removalRequired: body.removalRequired || false,
      notes: body.notes || '',
      photos: body.photos || [],
      measurements: body.measurements || [], // Additional measurement points
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await rooms.insertOne(room)

    // Update project details with new total
    const projectDetails = await getCollection(FlooringCollections.PROJECT_DETAILS)
    await projectDetails.updateOne(
      { projectId: body.projectId },
      { 
        $inc: { totalRooms: 1, totalArea: netArea },
        $set: { updatedAt: new Date().toISOString() }
      },
      { upsert: true }
    )

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error('Flooring Rooms POST Error:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}

// PUT - Update room
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    const rooms = await getCollection(FlooringCollections.ROOMS)
    
    // Recalculate areas if dimensions changed
    if (updateData.dimensions) {
      const grossArea = updateData.dimensions.length * updateData.dimensions.width
      const obstaclesArea = (updateData.obstacles || []).reduce((sum, obs) => 
        sum + (obs.length * obs.width), 0)
      updateData.grossArea = grossArea
      updateData.netArea = grossArea - obstaclesArea
      updateData.perimeter = 2 * (updateData.dimensions.length + updateData.dimensions.width)
    }

    const result = await rooms.findOneAndUpdate(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Rooms PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}

// DELETE - Delete room
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    const rooms = await getCollection(FlooringCollections.ROOMS)
    
    const room = await rooms.findOne({ id })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    await rooms.deleteOne({ id })

    // Update project details
    const projectDetails = await getCollection(FlooringCollections.PROJECT_DETAILS)
    await projectDetails.updateOne(
      { projectId: room.projectId },
      { 
        $inc: { totalRooms: -1, totalArea: -(room.netArea || 0) },
        $set: { updatedAt: new Date().toISOString() }
      }
    )

    return NextResponse.json({ message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Flooring Rooms DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}
