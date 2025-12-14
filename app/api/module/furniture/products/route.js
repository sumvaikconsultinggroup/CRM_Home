import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate SKU
const generateSKU = async (db, category) => {
  const products = db.collection('furniture_products')
  const prefix = category?.substring(0, 3).toUpperCase() || 'FRN'
  const count = await products.countDocuments({ category }) + 1
  return `${prefix}-${String(count).padStart(5, '0')}`
}

// GET - Fetch products with advanced filtering
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const productType = searchParams.get('productType')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const tags = searchParams.get('tags')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 100
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('furniture_products')

    if (id) {
      const product = await products.findOne({ id })
      if (!product) return errorResponse('Product not found', 404)
      return successResponse(sanitizeDocument(product))
    }

    // Build query
    const query = {}
    if (category) query.category = category
    if (subcategory) query.subcategory = subcategory
    if (productType) query.productType = productType
    if (isActive !== null && isActive !== undefined) query.isActive = isActive === 'true'
    if (tags) query.tags = { $in: tags.split(',') }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      products.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      products.countDocuments(query)
    ])

    // Get category counts
    const categoryCounts = await products.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray()

    return successResponse({
      products: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      categoryCounts: categoryCounts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {})
    })
  } catch (error) {
    console.error('Furniture Products GET Error:', error)
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// POST - Create product
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('furniture_products')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const productId = uuidv4()
    const sku = body.sku || await generateSKU(db, body.category)

    // Check for duplicate SKU
    const existingSku = await products.findOne({ sku })
    if (existingSku) {
      return errorResponse('SKU already exists', 400)
    }

    const product = {
      id: productId,
      sku,
      name: body.name,
      category: body.category,
      subcategory: body.subcategory,
      productType: body.productType || 'standard',
      description: body.description || '',
      basePrice: body.basePrice || 0,
      dimensions: body.dimensions || { length: 0, width: 0, height: 0, unit: 'mm' },
      dimensionConstraints: body.dimensionConstraints || null,
      materials: body.materials || [],
      finishes: body.finishes || [],
      hardware: body.hardware || [],
      upholsteryOptions: body.upholsteryOptions || [],
      images: body.images || [],
      drawings: body.drawings || [],
      warranty: body.warranty || '',
      leadTime: body.leadTime || 15,
      tags: body.tags || [],
      bomTemplate: body.bomTemplate || null,
      configuratorModel: body.configuratorModel || null,
      isActive: body.isActive !== false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await products.insertOne(product)

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'product.created',
      entityType: 'product',
      entityId: productId,
      data: { sku, name: product.name, category: product.category },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(product), 201)
  } catch (error) {
    console.error('Furniture Products POST Error:', error)
    return errorResponse('Failed to create product', 500, error.message)
  }
}

// PUT - Update product
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Product ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('furniture_products')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await products.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Product not found', 404)

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'product.updated',
      entityType: 'product',
      entityId: id,
      data: { changes: Object.keys(updateData) },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Products PUT Error:', error)
    return errorResponse('Failed to update product', 500, error.message)
  }
}

// DELETE - Delete product
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Product ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('furniture_products')
    const events = db.collection('furniture_events')

    const product = await products.findOne({ id })
    if (!product) return errorResponse('Product not found', 404)

    // Soft delete
    await products.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'product.deleted',
      entityType: 'product',
      entityId: id,
      data: { sku: product.sku, name: product.name },
      userId: user.id,
      timestamp: new Date().toISOString()
    })

    return successResponse({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Furniture Products DELETE Error:', error)
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
