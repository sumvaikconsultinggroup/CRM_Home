import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch warehouses
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const isActive = searchParams.get('isActive')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const warehouses = db.collection('furniture_warehouses')

    if (id) {
      const warehouse = await warehouses.findOne({ id })
      if (!warehouse) return errorResponse('Warehouse not found', 404)
      return successResponse(sanitizeDocument(warehouse))
    }

    const query = {}
    if (isActive !== null && isActive !== undefined) query.isActive = isActive === 'true'

    const items = await warehouses.find(query).sort({ name: 1 }).toArray()

    // Get stock summary per warehouse
    const stockLedger = db.collection('furniture_stock_ledger')
    const stockSummary = await stockLedger.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: '$warehouseId', 
        totalItems: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$quantity', '$avgCost'] } }
      }}
    ]).toArray()

    const summaryMap = stockSummary.reduce((acc, s) => ({ ...acc, [s._id]: s }), {})

    const warehousesWithSummary = items.map(w => ({
      ...w,
      stockSummary: summaryMap[w.id] || { totalItems: 0, totalValue: 0 }
    }))

    return successResponse({
      warehouses: sanitizeDocuments(warehousesWithSummary)
    })
  } catch (error) {
    console.error('Furniture Warehouses GET Error:', error)
    return errorResponse('Failed to fetch warehouses', 500, error.message)
  }
}

// POST - Create warehouse
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const warehouses = db.collection('furniture_warehouses')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const warehouseId = uuidv4()

    const warehouse = {
      id: warehouseId,
      code: body.code || `WH-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      type: body.type || 'main', // main, production, dispatch, raw_material
      address: body.address || {},
      contactPerson: body.contactPerson || '',
      contactPhone: body.contactPhone || '',
      contactEmail: body.contactEmail || '',
      capacity: body.capacity || 0,
      capacityUnit: body.capacityUnit || 'sqft',
      isDefault: body.isDefault || false,
      zones: body.zones || [], // { id, name, type }
      isActive: body.isActive !== false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    // If this is default, unset other defaults
    if (warehouse.isDefault) {
      await warehouses.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      )
    }

    await warehouses.insertOne(warehouse)

    await events.insertOne({
      id: uuidv4(),
      type: 'warehouse.created',
      entityType: 'warehouse',
      entityId: warehouseId,
      data: { code: warehouse.code, name: warehouse.name },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(warehouse), 201)
  } catch (error) {
    console.error('Furniture Warehouses POST Error:', error)
    return errorResponse('Failed to create warehouse', 500, error.message)
  }
}

// PUT - Update warehouse
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Warehouse ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const warehouses = db.collection('furniture_warehouses')

    // Handle default flag
    if (updateData.isDefault) {
      await warehouses.updateMany(
        { isDefault: true, id: { $ne: id } },
        { $set: { isDefault: false } }
      )
    }

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await warehouses.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Warehouse not found', 404)

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Warehouses PUT Error:', error)
    return errorResponse('Failed to update warehouse', 500, error.message)
  }
}

// DELETE - Delete warehouse
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Warehouse ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const warehouses = db.collection('furniture_warehouses')
    const stockLedger = db.collection('furniture_stock_ledger')

    // Check if warehouse has stock
    const hasStock = await stockLedger.findOne({ warehouseId: id, quantity: { $gt: 0 } })
    if (hasStock) {
      return errorResponse('Cannot delete warehouse with existing stock. Transfer stock first.', 400)
    }

    await warehouses.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Warehouse deleted successfully' })
  } catch (error) {
    console.error('Furniture Warehouses DELETE Error:', error)
    return errorResponse('Failed to delete warehouse', 500, error.message)
  }
}
