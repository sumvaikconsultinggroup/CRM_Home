import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch products with advanced filtering
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit')) || 100
    const skip = parseInt(searchParams.get('skip')) || 0

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('flooring_products')

    // Single product
    if (id) {
      const product = await products.findOne({ id })
      if (!product) return errorResponse('Product not found', 404)
      return successResponse(sanitizeDocument(product))
    }

    // Build query
    const query = {}
    if (category) query.category = category
    if (brand) query.brand = brand
    if (status) query.status = status
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ]
    }

    const [result, total] = await Promise.all([
      products.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      products.countDocuments(query)
    ])

    // Get categories summary
    const categorySummary = await products.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray()

    return successResponse({
      products: sanitizeDocuments(result),
      total,
      categories: categorySummary.map(c => ({ category: c._id, count: c.count }))
    })
  } catch (error) {
    console.error('Products GET Error:', error)
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// POST - Create product with CRM sync
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('flooring_products')
    const inventory = db.collection('flooring_inventory_v2')

    // Handle bulk import
    if (action === 'import') {
      const { items } = body
      const results = { success: 0, failed: 0, errors: [] }

      for (const item of items) {
        try {
          const sku = item.sku || `FLP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
          const productId = uuidv4()

          const product = {
            id: productId,
            sku,
            name: item.name,
            brand: item.brand || '',
            category: item.category || 'hardwood',
            subcategory: item.subcategory || '',
            description: item.description || '',
            specifications: {
              thickness: item.thickness || '',
              width: item.width || '',
              length: item.length || '',
              finish: item.finish || '',
              grade: item.grade || '',
              color: item.color || '',
              texture: item.texture || '',
              hardnessRating: item.hardnessRating || '',
              moistureResistance: item.moistureResistance || false,
              warranty: item.warranty || ''
            },
            pricing: {
              costPrice: parseFloat(item.costPrice) || 0,
              sellingPrice: parseFloat(item.sellingPrice) || 0,
              mrp: parseFloat(item.mrp) || 0,
              sqftPerBox: parseFloat(item.sqftPerBox) || 20,
              unit: item.unit || 'sqft'
            },
            hsnCode: item.hsnCode || '4418',
            gstRate: parseFloat(item.gstRate) || 18,
            images: item.images || [],
            status: 'active',
            createdBy: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await products.insertOne(product)

          // Initialize inventory if quantity provided
          if (item.quantity) {
            await inventory.insertOne({
              id: uuidv4(),
              productId,
              warehouseId: 'main',
              quantity: parseFloat(item.quantity),
              reservedQty: 0,
              availableQty: parseFloat(item.quantity),
              avgCostPrice: product.pricing.costPrice,
              reorderLevel: parseFloat(item.reorderLevel) || 100,
              batches: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
          }

          results.success++
        } catch (err) {
          results.failed++
          results.errors.push({ sku: item.sku, error: err.message })
        }
      }

      return successResponse({ message: 'Import completed', results })
    }

    // Single product creation
    const sku = body.sku || `FLP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    const productId = uuidv4()

    const product = {
      id: productId,
      sku,
      name: body.name,
      brand: body.brand || '',
      category: body.category || 'hardwood',
      subcategory: body.subcategory || '',
      description: body.description || '',
      specifications: body.specifications || {},
      pricing: body.pricing || { costPrice: 0, sellingPrice: 0, sqftPerBox: 20, unit: 'sqft' },
      hsnCode: body.hsnCode || '4418',
      gstRate: body.gstRate || 18,
      images: body.images || [],
      status: 'active',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await products.insertOne(product)

    // Initialize inventory record
    await inventory.insertOne({
      id: uuidv4(),
      productId,
      warehouseId: 'main',
      quantity: 0,
      reservedQty: 0,
      availableQty: 0,
      avgCostPrice: product.pricing.costPrice,
      reorderLevel: 100,
      batches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return successResponse(sanitizeDocument(product), 201)
  } catch (error) {
    console.error('Products POST Error:', error)
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
    const products = db.collection('flooring_products')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await products.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Product not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Products PUT Error:', error)
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
    const products = db.collection('flooring_products')

    // Soft delete
    await products.updateOne(
      { id },
      { $set: { status: 'deleted', deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Product deleted' })
  } catch (error) {
    console.error('Products DELETE Error:', error)
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
