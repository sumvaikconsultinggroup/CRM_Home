import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch all warehouses or single warehouse
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('id')
    const includeStats = searchParams.get('includeStats') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const warehouseCollection = db.collection('wf_warehouses')
    const inventoryCollection = db.collection('wf_inventory_stock')

    if (warehouseId) {
      // Single warehouse
      const warehouse = await warehouseCollection.findOne({ id: warehouseId })
      if (!warehouse) return errorResponse('Warehouse not found', 404)
      
      if (includeStats) {
        const stocks = await inventoryCollection.find({ warehouseId }).toArray()
        warehouse.stats = {
          totalProducts: stocks.length,
          totalQuantity: stocks.reduce((sum, s) => sum + (s.quantity || 0), 0),
          totalValue: stocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0),
          lowStockCount: stocks.filter(s => s.quantity <= (s.reorderLevel || 10)).length
        }
      }
      
      return successResponse(sanitizeDocument(warehouse))
    }

    // All warehouses
    const warehouses = await warehouseCollection.find({ active: { $ne: false } }).sort({ isDefault: -1, name: 1 }).toArray()

    // Add stats if requested
    if (includeStats) {
      for (const wh of warehouses) {
        const stocks = await inventoryCollection.find({ warehouseId: wh.id }).toArray()
        wh.stats = {
          totalProducts: stocks.length,
          totalQuantity: stocks.reduce((sum, s) => sum + (s.quantity || 0), 0),
          totalValue: stocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0),
          lowStockCount: stocks.filter(s => s.quantity <= (s.reorderLevel || 10)).length
        }
      }
    }

    // Summary across all warehouses
    const allStocks = await inventoryCollection.find({}).toArray()
    const summary = {
      totalWarehouses: warehouses.length,
      totalProducts: [...new Set(allStocks.map(s => s.productId))].length,
      totalQuantity: allStocks.reduce((sum, s) => sum + (s.quantity || 0), 0),
      totalValue: allStocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0)
    }

    return successResponse({ warehouses: sanitizeDocuments(warehouses), summary })
  } catch (error) {
    console.error('Warehouse GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch warehouses', 500, error.message)
  }
}

// POST - Create new warehouse
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { name, code, address, city, state, pincode, contactPerson, contactPhone, contactEmail, capacity, capacityUnit, notes, isDefault } = body

    if (!name) return errorResponse('Warehouse name is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_warehouses')

    // Generate warehouse code if not provided
    const warehouseCode = code || `WH-${Date.now().toString(36).toUpperCase()}`

    // Check for duplicate code
    const existing = await collection.findOne({ $or: [{ code: warehouseCode }, { name }] })
    if (existing) return errorResponse('Warehouse with this name or code already exists', 400)

    // If this is default, unset other defaults
    if (isDefault) {
      await collection.updateMany({}, { $set: { isDefault: false } })
    }

    const warehouse = {
      id: uuidv4(),
      clientId: user.clientId,
      name,
      code: warehouseCode,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      contactPerson: contactPerson || '',
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      capacity: parseFloat(capacity) || 0,
      capacityUnit: capacityUnit || 'sqft',
      notes: notes || '',
      isDefault: isDefault || false,
      active: true,
      // Role-based access - empty means all users can access
      allowedUsers: [],
      allowedRoles: [],
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(warehouse)
    return successResponse(sanitizeDocument(warehouse), 201)
  } catch (error) {
    console.error('Warehouse POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create warehouse', 500, error.message)
  }
}

// PUT - Update warehouse
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, isDefault, ...updates } = body

    if (!id) return errorResponse('Warehouse ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_warehouses')

    // Check if warehouse exists
    const existing = await collection.findOne({ id })
    if (!existing) return errorResponse('Warehouse not found', 404)

    // If setting as default, unset others
    if (isDefault) {
      await collection.updateMany({ id: { $ne: id } }, { $set: { isDefault: false } })
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...updates, 
          isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
          updatedAt: new Date(),
          updatedBy: user.id
        } 
      },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Warehouse PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update warehouse', 500, error.message)
  }
}

// DELETE - Soft delete warehouse
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Warehouse ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const warehouseCollection = db.collection('wf_warehouses')
    const inventoryCollection = db.collection('wf_inventory_stock')

    // Check if warehouse has stock
    const stockCount = await inventoryCollection.countDocuments({ warehouseId: id, quantity: { $gt: 0 } })
    if (stockCount > 0) {
      return errorResponse('Cannot delete warehouse with existing stock. Transfer stock first.', 400)
    }

    // Soft delete
    const result = await warehouseCollection.findOneAndUpdate(
      { id },
      { $set: { active: false, deletedAt: new Date(), deletedBy: user.id } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Warehouse not found', 404)
    return successResponse({ message: 'Warehouse deleted successfully' })
  } catch (error) {
    console.error('Warehouse DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete warehouse', 500, error.message)
  }
}
