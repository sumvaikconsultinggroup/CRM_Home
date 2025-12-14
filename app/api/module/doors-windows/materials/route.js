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
    const category = searchParams.get('category') // glass, frame, accessory

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('doors_windows_materials')

    if (id) {
      const material = await materials.findOne({ id })
      if (!material) return errorResponse('Material not found', 404)
      return successResponse(sanitizeDocument(material))
    }

    const query = { isActive: true }
    if (category) query.category = category

    const materialList = await materials.find(query).sort({ category: 1, name: 1 }).toArray()
    return successResponse({ materials: sanitizeDocuments(materialList) })
  } catch (error) {
    console.error('Doors-Windows Materials GET Error:', error)
    return errorResponse('Failed to fetch materials', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('doors_windows_materials')

    const now = new Date().toISOString()
    const materialId = uuidv4()

    const material = {
      id: materialId,
      code: body.code || `MAT-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      description: body.description || '',
      category: body.category, // glass, frame_profile, sealant, reinforcement
      subCategory: body.subCategory,
      
      // For glass
      glassType: body.glassType,
      thickness: body.thickness,
      color: body.color,
      
      // For profiles
      profileSeries: body.profileSeries,
      profileType: body.profileType, // frame, sash, mullion, transom
      
      // Brand
      brand: body.brand,
      supplier: body.supplier,
      
      // Pricing
      unitOfMeasure: body.unitOfMeasure || 'sqft',
      costPrice: body.costPrice || 0,
      sellingPrice: body.sellingPrice || 0,
      
      // Inventory
      currentStock: body.currentStock || 0,
      minStock: body.minStock || 10,
      
      // Specifications
      specifications: body.specifications || {},
      
      // Status
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await materials.insertOne(material)
    return successResponse(sanitizeDocument(material), 201)
  } catch (error) {
    console.error('Doors-Windows Materials POST Error:', error)
    return errorResponse('Failed to create material', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Material ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('doors_windows_materials')

    updateData.updatedAt = new Date().toISOString()

    const result = await materials.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Material not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Materials PUT Error:', error)
    return errorResponse('Failed to update material', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Material ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('doors_windows_materials')

    await materials.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Material deleted' })
  } catch (error) {
    console.error('Doors-Windows Materials DELETE Error:', error)
    return errorResponse('Failed to delete material', 500, error.message)
  }
}
