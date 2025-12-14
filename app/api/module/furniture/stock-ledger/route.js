import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Transaction types
const TRANSACTION_TYPES = {
  IN: ['purchase', 'return', 'transfer_in', 'adjustment_in', 'production_return'],
  OUT: ['sale', 'consumption', 'transfer_out', 'adjustment_out', 'wastage', 'production_issue']
}

// GET - Fetch stock ledger
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('itemType') // material, hardware, product
    const itemId = searchParams.get('itemId')
    const warehouseId = searchParams.get('warehouseId')
    const lowStock = searchParams.get('lowStock')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 100
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockLedger = db.collection('furniture_stock_ledger')
    const transactions = db.collection('furniture_stock_transactions')

    // If specific item requested, get detailed view
    if (itemId) {
      const stock = await stockLedger.findOne({ itemId, warehouseId: warehouseId || { $exists: true } })
      const txnHistory = await transactions.find({ itemId }).sort({ createdAt: -1 }).limit(50).toArray()
      
      return successResponse({
        stock: stock ? sanitizeDocument(stock) : null,
        transactions: sanitizeDocuments(txnHistory)
      })
    }

    const query = { isActive: true }
    if (itemType) query.itemType = itemType
    if (warehouseId) query.warehouseId = warehouseId
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] }
    }
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      stockLedger.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      stockLedger.countDocuments(query)
    ])

    // Get summary stats
    const summary = await stockLedger.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$itemType',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$avgCost'] } },
        lowStockItems: { $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] } }
      }}
    ]).toArray()

    return successResponse({
      stock: sanitizeDocuments(items),
      summary: summary.reduce((acc, s) => ({ ...acc, [s._id]: s }), {}),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Furniture Stock Ledger GET Error:', error)
    return errorResponse('Failed to fetch stock', 500, error.message)
  }
}

// POST - Create stock entry or record transaction
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockLedger = db.collection('furniture_stock_ledger')
    const transactions = db.collection('furniture_stock_transactions')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()

    // Record a stock transaction
    if (action === 'transaction') {
      const { itemId, itemType, warehouseId, transactionType, quantity, unitCost, reference, notes } = body

      if (!itemId || !warehouseId || !transactionType || !quantity) {
        return errorResponse('Missing required fields', 400)
      }

      const isInward = TRANSACTION_TYPES.IN.includes(transactionType)
      const isOutward = TRANSACTION_TYPES.OUT.includes(transactionType)

      if (!isInward && !isOutward) {
        return errorResponse('Invalid transaction type', 400)
      }

      // Get or create stock entry
      let stock = await stockLedger.findOne({ itemId, warehouseId })

      if (!stock) {
        // Create new stock entry
        stock = {
          id: uuidv4(),
          itemId,
          itemType: itemType || 'material',
          itemName: body.itemName || '',
          itemCode: body.itemCode || '',
          warehouseId,
          quantity: 0,
          reservedQty: 0,
          availableQty: 0,
          avgCost: unitCost || 0,
          reorderLevel: body.reorderLevel || 0,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
        await stockLedger.insertOne(stock)
      }

      // Calculate new quantities and average cost
      const txnQty = isInward ? quantity : -quantity
      const newQuantity = stock.quantity + txnQty

      if (newQuantity < 0) {
        return errorResponse('Insufficient stock', 400)
      }

      // Update average cost for inward transactions
      let newAvgCost = stock.avgCost
      if (isInward && unitCost) {
        const totalOldValue = stock.quantity * stock.avgCost
        const newValue = quantity * unitCost
        newAvgCost = (totalOldValue + newValue) / (stock.quantity + quantity)
      }

      // Create transaction record
      const txnId = uuidv4()
      const transaction = {
        id: txnId,
        itemId,
        itemType: stock.itemType,
        warehouseId,
        transactionType,
        quantity: txnQty,
        unitCost: unitCost || stock.avgCost,
        totalValue: Math.abs(txnQty) * (unitCost || stock.avgCost),
        balanceBefore: stock.quantity,
        balanceAfter: newQuantity,
        reference: reference || '',
        notes: notes || '',
        createdBy: user.id,
        createdAt: now
      }

      await transactions.insertOne(transaction)

      // Update stock
      await stockLedger.updateOne(
        { id: stock.id },
        { $set: {
          quantity: newQuantity,
          availableQty: newQuantity - (stock.reservedQty || 0),
          avgCost: newAvgCost,
          lastTransactionId: txnId,
          lastTransactionType: transactionType,
          lastTransactionDate: now,
          updatedAt: now
        }}
      )

      // Emit event
      await events.insertOne({
        id: uuidv4(),
        type: `stock.${isInward ? 'in' : 'out'}`,
        entityType: 'stock',
        entityId: stock.id,
        data: { transactionType, quantity: txnQty, itemId },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ transaction: sanitizeDocument(transaction), newBalance: newQuantity })
    }

    // Reserve stock
    if (action === 'reserve') {
      const { itemId, warehouseId, quantity, reference } = body

      const stock = await stockLedger.findOne({ itemId, warehouseId })
      if (!stock) return errorResponse('Stock not found', 404)

      if (stock.availableQty < quantity) {
        return errorResponse('Insufficient available stock', 400)
      }

      await stockLedger.updateOne(
        { id: stock.id },
        { $set: {
          reservedQty: (stock.reservedQty || 0) + quantity,
          availableQty: stock.availableQty - quantity,
          updatedAt: now
        },
        $push: {
          reservations: {
            id: uuidv4(),
            quantity,
            reference,
            createdAt: now,
            createdBy: user.id
          }
        }}
      )

      return successResponse({ message: 'Stock reserved', reservedQty: quantity })
    }

    // Release reservation
    if (action === 'release_reservation') {
      const { itemId, warehouseId, reservationId, quantity } = body

      const stock = await stockLedger.findOne({ itemId, warehouseId })
      if (!stock) return errorResponse('Stock not found', 404)

      const releaseQty = quantity || stock.reservedQty

      await stockLedger.updateOne(
        { id: stock.id },
        { $set: {
          reservedQty: Math.max(0, (stock.reservedQty || 0) - releaseQty),
          availableQty: stock.availableQty + releaseQty,
          updatedAt: now
        }}
      )

      return successResponse({ message: 'Reservation released', releasedQty: releaseQty })
    }

    // Transfer stock between warehouses
    if (action === 'transfer') {
      const { itemId, fromWarehouseId, toWarehouseId, quantity, notes } = body

      // Create outward transaction from source
      const sourceStock = await stockLedger.findOne({ itemId, warehouseId: fromWarehouseId })
      if (!sourceStock || sourceStock.availableQty < quantity) {
        return errorResponse('Insufficient stock at source warehouse', 400)
      }

      const transferRef = `TRF-${Date.now().toString(36).toUpperCase()}`

      // Source - OUT
      await transactions.insertOne({
        id: uuidv4(),
        itemId,
        itemType: sourceStock.itemType,
        warehouseId: fromWarehouseId,
        transactionType: 'transfer_out',
        quantity: -quantity,
        unitCost: sourceStock.avgCost,
        reference: transferRef,
        notes,
        createdBy: user.id,
        createdAt: now
      })

      await stockLedger.updateOne(
        { id: sourceStock.id },
        { $set: {
          quantity: sourceStock.quantity - quantity,
          availableQty: sourceStock.availableQty - quantity,
          updatedAt: now
        }}
      )

      // Destination - IN
      let destStock = await stockLedger.findOne({ itemId, warehouseId: toWarehouseId })
      if (!destStock) {
        destStock = {
          id: uuidv4(),
          itemId,
          itemType: sourceStock.itemType,
          itemName: sourceStock.itemName,
          itemCode: sourceStock.itemCode,
          warehouseId: toWarehouseId,
          quantity: 0,
          reservedQty: 0,
          availableQty: 0,
          avgCost: sourceStock.avgCost,
          reorderLevel: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
        await stockLedger.insertOne(destStock)
      }

      await transactions.insertOne({
        id: uuidv4(),
        itemId,
        itemType: destStock.itemType,
        warehouseId: toWarehouseId,
        transactionType: 'transfer_in',
        quantity: quantity,
        unitCost: sourceStock.avgCost,
        reference: transferRef,
        notes,
        createdBy: user.id,
        createdAt: now
      })

      await stockLedger.updateOne(
        { id: destStock.id },
        { $set: {
          quantity: destStock.quantity + quantity,
          availableQty: destStock.availableQty + quantity,
          avgCost: sourceStock.avgCost,
          updatedAt: now
        }}
      )

      return successResponse({ message: 'Stock transferred', reference: transferRef })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Furniture Stock Ledger POST Error:', error)
    return errorResponse('Failed to process stock operation', 500, error.message)
  }
}
