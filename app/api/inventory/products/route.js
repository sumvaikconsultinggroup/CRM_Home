import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get all inventory products (synced from CRM + manually added)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sourceModule = searchParams.get('sourceModule')
    const active = searchParams.get('active')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const productsCollection = db.collection('inventory_products')

    // Build query
    let query = {}
    if (category) query.category = category
    if (sourceModule) query.sourceModuleId = sourceModule
    if (active !== null) query.active = active !== 'false'
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    const products = await productsCollection.find(query).sort({ name: 1 }).toArray()

    // Get categories for filtering
    const categories = await productsCollection.distinct('category')
    const sources = await productsCollection.distinct('sourceModuleId')

    // Summary
    const summary = {
      total: products.length,
      active: products.filter(p => p.active !== false).length,
      synced: products.filter(p => p.sourceType === 'crm_module').length,
      manual: products.filter(p => p.sourceType !== 'crm_module').length,
      categories: categories.filter(Boolean),
      sources: sources.filter(Boolean)
    }

    return successResponse({ products: sanitizeDocuments(products), summary })
  } catch (error) {
    console.error('Inventory Products GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// POST - Create a manual inventory product (not synced from CRM)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      name, sku, barcode, description, category, subCategory,
      costPrice, sellingPrice, mrp, unit, secondaryUnit, conversionRate,
      gstRate, hsnCode, reorderLevel, reorderQuantity, attributes
    } = body

    if (!name) {
      return errorResponse('Product name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const productsCollection = db.collection('inventory_products')

    // Check for duplicate SKU
    if (sku) {
      const existing = await productsCollection.findOne({ sku })
      if (existing) {
        return errorResponse('SKU already exists', 400)
      }
    }

    // Generate SKU if not provided
    const generatedSku = sku || `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const product = {
      id: uuidv4(),
      clientId: user.clientId,
      name,
      sku: generatedSku,
      barcode: barcode || null,
      description: description || '',
      category: category || 'General',
      subCategory: subCategory || '',
      costPrice: parseFloat(costPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      mrp: parseFloat(mrp) || parseFloat(sellingPrice) || 0,
      unit: unit || 'pcs',
      secondaryUnit: secondaryUnit || null,
      conversionRate: parseFloat(conversionRate) || 1,
      gstRate: parseFloat(gstRate) || 18,
      hsnCode: hsnCode || '',
      trackInventory: true,
      allowNegativeStock: false,
      reorderLevel: parseInt(reorderLevel) || 10,
      reorderQuantity: parseInt(reorderQuantity) || 50,
      attributes: attributes || {},
      sourceType: 'manual',
      sourceModuleId: null,
      active: true,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await productsCollection.insertOne(product)
    return successResponse(sanitizeDocument(product), 201)
  } catch (error) {
    console.error('Inventory Products POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create product', 500, error.message)
  }
}

// PUT - Update inventory product
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponse('Product ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const productsCollection = db.collection('inventory_products')

    // Remove fields that shouldn't be updated
    delete updates.clientId
    delete updates.sourceType
    delete updates.sourceModuleId
    delete updates.sourceProductId
    delete updates.createdAt
    delete updates.createdBy

    updates.updatedAt = new Date()
    updates.updatedBy = user.id

    const result = await productsCollection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Product not found', 404)
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Inventory Products PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update product', 500, error.message)
  }
}

// DELETE - Delete inventory product (only manual products)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Product ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const productsCollection = db.collection('inventory_products')
    const stockCollection = db.collection('wf_inventory_stock')

    // Check if product exists
    const product = await productsCollection.findOne({ id })
    if (!product) {
      return errorResponse('Product not found', 404)
    }

    // Don't delete synced products - just deactivate
    if (product.sourceType === 'crm_module') {
      await productsCollection.updateOne(
        { id },
        { $set: { active: false, updatedAt: new Date() } }
      )
      return successResponse({ message: 'Synced product deactivated' })
    }

    // Check if product has stock
    const hasStock = await stockCollection.findOne({ productId: id, quantity: { $gt: 0 } })
    if (hasStock) {
      return errorResponse('Cannot delete product with existing stock', 400)
    }

    await productsCollection.deleteOne({ id })
    return successResponse({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Inventory Products DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
