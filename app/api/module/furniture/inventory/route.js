import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory/stock ledger
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const warehouseId = searchParams.get('warehouseId')
    const materialId = searchParams.get('materialId')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'materialName'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stock = db.collection('furniture_stock_ledger')
    const materials = db.collection('furniture_materials')
    const hardware = db.collection('furniture_hardware')

    if (id) {
      const item = await stock.findOne({ id })
      if (!item) return errorResponse('Stock item not found', 404)
      return successResponse(sanitizeDocument(item))
    }

    const query = { isActive: { $ne: false } }
    if (warehouseId) query.warehouseId = warehouseId
    if (materialId) query.materialId = materialId
    if (category) query.category = category
    if (search) {
      query.$or = [
        { materialName: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } }
      ]
    }

    const items = await stock.find(query).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).toArray()

    // Get material reorder levels
    const [materialList, hardwareList] = await Promise.all([
      materials.find({}).toArray(),
      hardware.find({}).toArray()
    ])

    const reorderMap = [...materialList, ...hardwareList].reduce((acc, m) => {
      acc[m.id] = m.reorderLevel || 0
      return acc
    }, {})

    // Enhance items with low stock flag
    const enhancedItems = items.map(item => ({
      ...item,
      reorderLevel: reorderMap[item.materialId] || 0,
      isLowStock: item.quantity <= (reorderMap[item.materialId] || 0)
    }))

    // Filter low stock if requested
    const finalItems = lowStock === 'true' 
      ? enhancedItems.filter(i => i.isLowStock)
      : enhancedItems

    // Get summary stats
    const summary = await stock.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$quantity', '$avgCost'] } },
        totalQuantity: { $sum: '$quantity' }
      }}
    ]).toArray()

    // Get category-wise breakdown
    const categoryBreakdown = await stock.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalQty: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$avgCost'] } }
      }}
    ]).toArray()

    // Low stock count
    const lowStockCount = enhancedItems.filter(i => i.isLowStock).length

    return successResponse({
      inventory: sanitizeDocuments(finalItems),
      summary: summary[0] || { totalItems: 0, totalValue: 0, totalQuantity: 0 },
      categoryBreakdown: categoryBreakdown.reduce((acc, c) => ({ 
        ...acc, 
        [c._id || 'uncategorized']: { count: c.count, totalQty: c.totalQty, totalValue: c.totalValue } 
      }), {}),
      lowStockCount
    })
  } catch (error) {
    console.error('Furniture Inventory GET Error:', error)
    return errorResponse('Failed to fetch inventory', 500, error.message)
  }
}

// POST - Add/adjust stock
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stock = db.collection('furniture_stock_ledger')
    const transactions = db.collection('furniture_stock_transactions')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()

    // Stock adjustment
    if (action === 'adjust') {
      const { materialId, warehouseId, adjustmentType, quantity, reason, reference } = body

      const existingStock = await stock.findOne({ materialId, warehouseId })

      let newQty = quantity
      if (adjustmentType === 'add') {
        newQty = (existingStock?.quantity || 0) + quantity
      } else if (adjustmentType === 'remove') {
        newQty = (existingStock?.quantity || 0) - quantity
        if (newQty < 0) return errorResponse('Cannot reduce stock below zero', 400)
      } // else 'set' - use quantity as is

      if (existingStock) {
        await stock.updateOne(
          { id: existingStock.id },
          { $set: { quantity: newQty, updatedAt: now } }
        )
      } else {
        // Create new stock entry
        const material = await db.collection('furniture_materials').findOne({ id: materialId })
          || await db.collection('furniture_hardware').findOne({ id: materialId })

        await stock.insertOne({
          id: uuidv4(),
          materialId,
          materialCode: material?.code || body.materialCode,
          materialName: material?.name || body.materialName,
          category: material?.category || body.category,
          warehouseId,
          quantity: newQty,
          unitOfMeasure: material?.unitOfMeasure || body.unitOfMeasure || 'piece',
          avgCost: material?.unitPrice || body.unitCost || 0,
          isActive: true,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        })
      }

      // Record transaction
      await transactions.insertOne({
        id: uuidv4(),
        type: adjustmentType === 'add' ? 'in' : (adjustmentType === 'remove' ? 'out' : 'adjustment'),
        materialId,
        warehouseId,
        quantity,
        previousQty: existingStock?.quantity || 0,
        newQty,
        reason: reason || 'Manual adjustment',
        reference: reference || '',
        performedBy: user.id,
        performedAt: now
      })

      return successResponse({ message: 'Stock adjusted', newQuantity: newQty })
    }

    // Stock transfer between warehouses
    if (action === 'transfer') {
      const { materialId, fromWarehouseId, toWarehouseId, quantity, notes } = body

      const sourceStock = await stock.findOne({ materialId, warehouseId: fromWarehouseId })
      if (!sourceStock || sourceStock.quantity < quantity) {
        return errorResponse('Insufficient stock in source warehouse', 400)
      }

      // Reduce from source
      await stock.updateOne(
        { id: sourceStock.id },
        { $inc: { quantity: -quantity }, $set: { updatedAt: now } }
      )

      // Add to destination
      const destStock = await stock.findOne({ materialId, warehouseId: toWarehouseId })
      if (destStock) {
        await stock.updateOne(
          { id: destStock.id },
          { $inc: { quantity }, $set: { updatedAt: now } }
        )
      } else {
        await stock.insertOne({
          id: uuidv4(),
          materialId,
          materialCode: sourceStock.materialCode,
          materialName: sourceStock.materialName,
          category: sourceStock.category,
          warehouseId: toWarehouseId,
          quantity,
          unitOfMeasure: sourceStock.unitOfMeasure,
          avgCost: sourceStock.avgCost,
          isActive: true,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        })
      }

      // Record transfer transaction
      const transferId = uuidv4()
      await transactions.insertOne({
        id: transferId,
        type: 'transfer',
        materialId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        notes: notes || '',
        performedBy: user.id,
        performedAt: now
      })

      return successResponse({ message: 'Stock transferred', transferId })
    }

    // Bulk import
    if (action === 'bulk_import') {
      const { items } = body
      let imported = 0, errors = []

      for (const item of items) {
        try {
          await stock.updateOne(
            { materialId: item.materialId, warehouseId: item.warehouseId },
            {
              $set: {
                quantity: item.quantity,
                avgCost: item.avgCost || 0,
                updatedAt: now
              },
              $setOnInsert: {
                id: uuidv4(),
                materialCode: item.materialCode,
                materialName: item.materialName,
                category: item.category,
                unitOfMeasure: item.unitOfMeasure || 'piece',
                isActive: true,
                createdBy: user.id,
                createdAt: now
              }
            },
            { upsert: true }
          )
          imported++
        } catch (err) {
          errors.push({ item, error: err.message })
        }
      }

      return successResponse({ message: `Imported ${imported} items`, errors })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Furniture Inventory POST Error:', error)
    return errorResponse('Failed to update inventory', 500, error.message)
  }
}
