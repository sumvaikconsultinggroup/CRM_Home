import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get all inventory items
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock')

    const collection = await getCollection('wf_inventory')
    
    let query = { clientId: user.clientId }
    if (category) query.category = category
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] }
    }

    const items = await collection.find(query).sort({ name: 1 }).toArray()
    
    // Calculate stats
    const stats = {
      totalItems: items.length,
      totalValue: items.reduce((sum, i) => sum + (i.quantity * i.costPrice), 0),
      lowStockItems: items.filter(i => i.quantity <= i.reorderLevel).length,
      categories: [...new Set(items.map(i => i.category))]
    }

    return successResponse({ items: sanitizeDocuments(items), stats })
  } catch (error) {
    console.error('Inventory GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch inventory', 500, error.message)
  }
}

// Create inventory item
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const collection = await getCollection('wf_inventory')

    const item = {
      id: uuidv4(),
      clientId: user.clientId,
      sku: body.sku || `WF-${Date.now()}`,
      name: body.name,
      category: body.category || 'Engineered Wood',
      subCategory: body.subCategory || '',
      woodType: body.woodType || '',
      finish: body.finish || '',
      thickness: body.thickness || '',
      width: body.width || '',
      length: body.length || '',
      grade: body.grade || '',
      unit: body.unit || 'sq.ft',
      quantity: parseFloat(body.quantity) || 0,
      reorderLevel: parseFloat(body.reorderLevel) || 10,
      costPrice: parseFloat(body.costPrice) || 0,
      sellingPrice: parseFloat(body.sellingPrice) || 0,
      mrp: parseFloat(body.mrp) || 0,
      gstRate: parseFloat(body.gstRate) || 18,
      vendorId: body.vendorId || null,
      location: body.location || '',
      description: body.description || '',
      image: body.image || '',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(item)
    return successResponse(sanitizeDocument(item), 201)
  } catch (error) {
    console.error('Inventory POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create inventory item', 500, error.message)
  }
}

// Update inventory item
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Item ID is required', 400)

    const collection = await getCollection('wf_inventory')
    
    const result = await collection.findOneAndUpdate(
      { id, clientId: user.clientId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Item not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Inventory PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update inventory item', 500, error.message)
  }
}

// Delete inventory item
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Item ID is required', 400)

    const collection = await getCollection('wf_inventory')
    const result = await collection.deleteOne({ id, clientId: user.clientId })

    if (result.deletedCount === 0) return errorResponse('Item not found', 404)
    return successResponse({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Inventory DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete inventory item', 500, error.message)
  }
}
