import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Material categories with properties
const MATERIAL_CATEGORIES = {
  board: { name: 'Boards/Sheets', unit: 'sheet', properties: ['thickness', 'sheetSize', 'grade'] },
  laminate: { name: 'Laminates', unit: 'sheet', properties: ['thickness', 'sheetSize', 'finish', 'pattern'] },
  veneer: { name: 'Veneers', unit: 'sqft', properties: ['thickness', 'woodType', 'grain'] },
  paint: { name: 'Paints/Polish', unit: 'liter', properties: ['type', 'finish', 'coverage'] },
  polish: { name: 'Polish', unit: 'liter', properties: ['type', 'finish', 'coverage'] },
  edge_band: { name: 'Edge Bands', unit: 'meter', properties: ['width', 'thickness', 'material'] },
  adhesive: { name: 'Adhesives', unit: 'kg', properties: ['type', 'coverage'] },
  hardware: { name: 'Hardware', unit: 'piece', properties: ['type', 'size', 'finish'] },
  fabric: { name: 'Fabrics', unit: 'meter', properties: ['width', 'pattern', 'composition'] },
  leather: { name: 'Leather', unit: 'sqft', properties: ['type', 'thickness', 'finish'] },
  foam: { name: 'Foam', unit: 'sheet', properties: ['density', 'thickness', 'type'] },
  consumable: { name: 'Consumables', unit: 'piece', properties: [] },
  packaging: { name: 'Packaging', unit: 'piece', properties: [] }
}

// GET - Fetch materials
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const limit = parseInt(searchParams.get('limit')) || 100
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('furniture_materials')

    if (id) {
      const material = await materials.findOne({ id })
      if (!material) return errorResponse('Material not found', 404)
      return successResponse(sanitizeDocument(material))
    }

    const query = {}
    if (category) query.category = category
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
      materials.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      materials.countDocuments(query)
    ])

    // Get category counts
    const categoryCounts = await materials.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray()

    return successResponse({
      materials: sanitizeDocuments(items),
      categories: MATERIAL_CATEGORIES,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      categoryCounts: categoryCounts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {})
    })
  } catch (error) {
    console.error('Furniture Materials GET Error:', error)
    return errorResponse('Failed to fetch materials', 500, error.message)
  }
}

// POST - Create material
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('furniture_materials')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const materialId = uuidv4()

    // Check for duplicate code
    if (body.code) {
      const existing = await materials.findOne({ code: body.code })
      if (existing) return errorResponse('Material code already exists', 400)
    }

    const categoryConfig = MATERIAL_CATEGORIES[body.category] || {}

    const material = {
      id: materialId,
      code: body.code || `MAT-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      category: body.category,
      brand: body.brand || '',
      specifications: body.specifications || {},
      thickness: body.thickness,
      sheetSize: body.sheetSize || { length: 0, width: 0, unit: 'mm' },
      rollWidth: body.rollWidth,
      unitOfMeasure: body.unitOfMeasure || categoryConfig.unit || 'piece',
      unitPrice: body.unitPrice || 0,
      wastagePercent: body.wastagePercent || 10,
      reorderLevel: body.reorderLevel || 0,
      leadTime: body.leadTime || 7,
      supplier: body.supplier || '',
      images: body.images || [],
      isActive: body.isActive !== false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await materials.insertOne(material)

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'material.created',
      entityType: 'material',
      entityId: materialId,
      data: { code: material.code, name: material.name, category: material.category },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(material), 201)
  } catch (error) {
    console.error('Furniture Materials POST Error:', error)
    return errorResponse('Failed to create material', 500, error.message)
  }
}

// PUT - Update material
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Material ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('furniture_materials')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await materials.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Material not found', 404)

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Materials PUT Error:', error)
    return errorResponse('Failed to update material', 500, error.message)
  }
}

// DELETE - Delete material
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Material ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('furniture_materials')

    await materials.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Material deleted successfully' })
  } catch (error) {
    console.error('Furniture Materials DELETE Error:', error)
    return errorResponse('Failed to delete material', 500, error.message)
  }
}
