import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Hardware categories
const HARDWARE_CATEGORIES = {
  hinge: { name: 'Hinges', types: ['soft_close', 'standard', 'concealed', 'piano', 'pivot'] },
  channel: { name: 'Channels/Slides', types: ['soft_close', 'ball_bearing', 'roller', 'undermount', 'side_mount'] },
  lock: { name: 'Locks', types: ['cam_lock', 'cylinder_lock', 'digital_lock', 'multipurpose'] },
  handle: { name: 'Handles', types: ['pull', 'knob', 'recessed', 'profile', 'bar'] },
  connector: { name: 'Connectors', types: ['cam', 'minifix', 'dowel', 'biscuit', 'corner_bracket'] },
  support: { name: 'Supports', types: ['shelf_support', 'wardrobe_lift', 'flap_stay', 'gas_strut'] },
  leg: { name: 'Legs/Feet', types: ['adjustable', 'fixed', 'caster', 'glide'] },
  accessory: { name: 'Accessories', types: ['basket', 'tray', 'organizer', 'hook', 'rod'] },
  fitting: { name: 'Fittings', types: ['screw', 'bolt', 'nut', 'washer', 'anchor'] }
}

// GET - Fetch hardware
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const limit = parseInt(searchParams.get('limit')) || 100
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('furniture_hardware')

    if (id) {
      const item = await hardware.findOne({ id })
      if (!item) return errorResponse('Hardware not found', 404)
      return successResponse(sanitizeDocument(item))
    }

    const query = {}
    if (category) query.category = category
    if (type) query.type = type
    if (isActive !== null && isActive !== undefined) query.isActive = isActive === 'true'
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      hardware.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      hardware.countDocuments(query)
    ])

    return successResponse({
      hardware: sanitizeDocuments(items),
      categories: HARDWARE_CATEGORIES,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Furniture Hardware GET Error:', error)
    return errorResponse('Failed to fetch hardware', 500, error.message)
  }
}

// POST - Create hardware
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('furniture_hardware')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const hardwareId = uuidv4()

    const item = {
      id: hardwareId,
      code: body.code || `HW-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      category: body.category,
      type: body.type,
      brand: body.brand || '',
      specifications: body.specifications || {},
      size: body.size || '',
      finish: body.finish || '',
      loadCapacity: body.loadCapacity,
      unitOfMeasure: body.unitOfMeasure || 'piece',
      unitPrice: body.unitPrice || 0,
      packSize: body.packSize || 1,
      reorderLevel: body.reorderLevel || 0,
      supplier: body.supplier || '',
      images: body.images || [],
      isActive: body.isActive !== false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await hardware.insertOne(item)

    await events.insertOne({
      id: uuidv4(),
      type: 'hardware.created',
      entityType: 'hardware',
      entityId: hardwareId,
      data: { code: item.code, name: item.name, category: item.category },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(item), 201)
  } catch (error) {
    console.error('Furniture Hardware POST Error:', error)
    return errorResponse('Failed to create hardware', 500, error.message)
  }
}

// PUT - Update hardware
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Hardware ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('furniture_hardware')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await hardware.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Hardware not found', 404)

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Hardware PUT Error:', error)
    return errorResponse('Failed to update hardware', 500, error.message)
  }
}

// DELETE - Delete hardware
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Hardware ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('furniture_hardware')

    await hardware.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Hardware deleted successfully' })
  } catch (error) {
    console.error('Furniture Hardware DELETE Error:', error)
    return errorResponse('Failed to delete hardware', 500, error.message)
  }
}
