import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { checkPermission, logAccess } from '@/lib/middleware/rbac'
import { COLLECTIONS } from '@/lib/db/flooring-collections'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch products with advanced filtering
export async function GET(request) {
  try {
    // RBAC Check - products.view permission
    const authCheck = await checkPermission(request, 'products.view')
    if (!authCheck.authorized) return authCheck.error
    const user = authCheck.user

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const categoryId = searchParams.get('categoryId')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy')
    const sortDir = (searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const limit = parseInt(searchParams.get('limit')) || 100
    const skip = parseInt(searchParams.get('skip')) || 0

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection(COLLECTIONS.PRODUCTS)

    // Single product
    if (id) {
      const product = await products.findOne({ id })
      if (!product) return errorResponse('Product not found', 404)
      return successResponse(sanitizeDocument(product))
    }

    // Build query
    const query = { status: { $ne: 'deleted' } }
    if (category) query.category = category // backward compatible
    if (categoryId) query.categoryId = categoryId
    if (brand) query.brand = brand
    if (status) query.status = status
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ]
    }

    const sort = sortBy ? { [sortBy]: sortDir } : { createdAt: -1 }

    const [result, total] = await Promise.all([
      products.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      products.countDocuments(query)
    ])
    
    // Also get products from wf_inventory that might not be in flooring_products
    const wfInventory = db.collection('wf_inventory')
    const wfProducts = await wfInventory.find({ status: { $ne: 'deleted' } }).toArray()
    
    // Merge: add wf_inventory products that are not already in flooring_products
    const existingIds = new Set(result.map(p => p.id))
    const existingSkus = new Set(result.filter(p => p.sku).map(p => p.sku.toLowerCase()))
    
    const additionalProducts = wfProducts.filter(wp => {
      // Skip if same ID exists
      if (existingIds.has(wp.id)) return false
      // Skip if same SKU exists (case insensitive)
      if (wp.sku && existingSkus.has(wp.sku.toLowerCase())) return false
      // Apply search filter if present
      if (search) {
        const searchLower = search.toLowerCase()
        const nameMatch = wp.name?.toLowerCase().includes(searchLower)
        const skuMatch = wp.sku?.toLowerCase().includes(searchLower)
        const brandMatch = wp.brand?.toLowerCase().includes(searchLower)
        if (!nameMatch && !skuMatch && !brandMatch) return false
      }
      return true
    })
    
    // Merge results
    const mergedProducts = [...result, ...additionalProducts]

    // Get categories summary (new: categoryId, backward compatible: category)
    const categorySummary = await products.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$categoryId', '$category'] },
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    return successResponse({
      products: sanitizeDocuments(mergedProducts),
      total: total + additionalProducts.length,
      categories: categorySummary.map(c => ({ categoryId: c._id, count: c.count }))
    })
  } catch (error) {
    console.error('Products GET Error:', error)
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// POST - Create product with CRM sync
export async function POST(request) {
  try {
    // RBAC Check - products.create permission
    const authCheck = await checkPermission(request, 'products.create')
    if (!authCheck.authorized) return authCheck.error
    const user = authCheck.user

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection(COLLECTIONS.PRODUCTS)
    const inventory = db.collection(COLLECTIONS.INVENTORY)

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
      collection: body.collection || '',
      categoryId: body.categoryId || '',
      // backward compatible
      category: body.category || '',
      subcategory: body.subcategory || '',
      description: body.description || '',
      specs: body.specs || {},
      installation: body.installation || {},
      compliance: body.compliance || {},
      pack: body.pack || {},
      pricing: body.pricing || { costPrice: 0, mrp: 0, dealerPrice: 0, sellingPrice: 0, unit: 'sqft' },
      tax: body.tax || { hsnCode: body.hsnCode || '4418', gstRate: body.gstRate || 18 },
      // keep legacy fields
      hsnCode: body.hsnCode || body.tax?.hsnCode || '4418',
      gstRate: body.gstRate || body.tax?.gstRate || 18,
      images: body.images || [],
      status: body.status || 'active',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await products.insertOne(product)

    // Initialize inventory record (legacy)
    await inventory.insertOne({
      id: uuidv4(),
      productId,
      warehouseId: 'main',
      quantity: body.stockQuantity || 0,
      reservedQty: 0,
      availableQty: body.stockQuantity || 0,
      avgCostPrice: product.pricing?.costPrice || 0,
      reorderLevel: 100,
      batches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // === SYNC DISABLED - Module is Self-Contained ===
    // The Flooring module now manages its own inventory independently.
    // Products remain in flooring_products and wf_inventory_stock only.
    // No sync to Build Inventory (inventory_products) or sync records.
    // This eliminates sync bugs and makes the module standalone.
    // === END SYNC DISABLED ===

    return successResponse(sanitizeDocument(product), 201)
  } catch (error) {
    console.error('Products POST Error:', error)
    return errorResponse('Failed to create product', 500, error.message)
  }
}

// PUT - Update product
export async function PUT(request) {
  try {
    // RBAC Check - products.edit permission
    const authCheck = await checkPermission(request, 'products.edit')
    if (!authCheck.authorized) return authCheck.error
    const user = authCheck.user

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Product ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection(COLLECTIONS.PRODUCTS)

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await products.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Product not found', 404)
    
    // === SYNC DISABLED - Module is Self-Contained ===
    // No sync to Build Inventory. Products are managed within flooring_products only.
    // === END SYNC DISABLED ===
    
    // Log access for audit
    await logAccess(user, 'products.edit', `product:${id}`, 'success')
    
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Products PUT Error:', error)
    return errorResponse('Failed to update product', 500, error.message)
  }
}

// DELETE - Delete product
export async function DELETE(request) {
  try {
    // RBAC Check - products.delete permission
    const authCheck = await checkPermission(request, 'products.delete')
    if (!authCheck.authorized) return authCheck.error
    const user = authCheck.user

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Product ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection(COLLECTIONS.PRODUCTS)

    // Soft delete
    await products.updateOne(
      { id },
      { $set: { status: 'deleted', deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    // Log access for audit
    await logAccess(user, 'products.delete', `product:${id}`, 'success')

    return successResponse({ message: 'Product deleted' })
  } catch (error) {
    console.error('Products DELETE Error:', error)
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
