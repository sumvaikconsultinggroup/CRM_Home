import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // handle, lock, hinge, etc.

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('doors_windows_hardware')

    if (id) {
      const item = await hardware.findOne({ id })
      if (!item) return errorResponse('Hardware not found', 404)
      return successResponse(sanitizeDocument(item))
    }

    const query = { isActive: true }
    if (type) query.hardwareType = type

    const hardwareList = await hardware.find(query).sort({ hardwareType: 1, name: 1 }).toArray()
    return successResponse({ hardware: sanitizeDocuments(hardwareList) })
  } catch (error) {
    console.error('Doors-Windows Hardware GET Error:', error)
    return errorResponse('Failed to fetch hardware', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('doors_windows_hardware')

    const now = new Date().toISOString()
    const hardwareId = uuidv4()

    const item = {
      id: hardwareId,
      sku: body.sku || `HW-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      description: body.description || '',
      hardwareType: body.hardwareType, // handle, lock, hinge, cylinder, closer, seal
      subType: body.subType,
      
      // Brand
      brand: body.brand, // Assa Abloy, Yale, Dorma, etc.
      model: body.model,
      
      // Compatibility
      compatibleWith: body.compatibleWith || [], // upvc, aluminum, wood
      forProductTypes: body.forProductTypes || [], // window, door
      
      // Specifications
      material: body.material, // stainless steel, zinc, brass
      finish: body.finish, // chrome, satin, gold, black
      
      // Pricing
      unitOfMeasure: body.unitOfMeasure || 'piece',
      costPrice: body.costPrice || 0,
      sellingPrice: body.sellingPrice || 0,
      
      // Inventory
      currentStock: body.currentStock || 0,
      minStock: body.minStock || 5,
      
      // Images
      images: body.images || [],
      
      // Status
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await hardware.insertOne(item)
    return successResponse(sanitizeDocument(item), 201)
  } catch (error) {
    console.error('Doors-Windows Hardware POST Error:', error)
    return errorResponse('Failed to create hardware', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Hardware ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('doors_windows_hardware')

    updateData.updatedAt = new Date().toISOString()

    const result = await hardware.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Hardware not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Hardware PUT Error:', error)
    return errorResponse('Failed to update hardware', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Hardware ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const hardware = db.collection('doors_windows_hardware')

    await hardware.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Hardware deleted' })
  } catch (error) {
    console.error('Doors-Windows Hardware DELETE Error:', error)
    return errorResponse('Failed to delete hardware', 500, error.message)
  }
}
