import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// ENTERPRISE STOCK LEDGER - DOUBLE-ENTRY SYSTEM
// =============================================
// Every stock movement creates a ledger entry with:
// - Reference document (GRN, Challan, Transfer, Adjustment)
// - Direction (IN/OUT)
// - Running balance
// - Cost tracking (FIFO/Weighted Avg)
// - Full audit trail

const MOVEMENT_TYPES = {
  // Inward Movements (Stock IN)
  grn_receipt: { direction: 'IN', label: 'GRN Receipt', docType: 'grn' },
  purchase_return_reversal: { direction: 'IN', label: 'Purchase Return Reversal', docType: 'purchase_return' },
  sales_return: { direction: 'IN', label: 'Sales Return', docType: 'sales_return' },
  transfer_in: { direction: 'IN', label: 'Transfer In', docType: 'transfer' },
  adjustment_plus: { direction: 'IN', label: 'Stock Adjustment (+)', docType: 'adjustment' },
  opening_stock: { direction: 'IN', label: 'Opening Stock', docType: 'opening' },
  production_output: { direction: 'IN', label: 'Production Output', docType: 'production' },
  
  // Outward Movements (Stock OUT)
  challan_dispatch: { direction: 'OUT', label: 'Challan Dispatch', docType: 'challan' },
  sales_issue: { direction: 'OUT', label: 'Sales Issue', docType: 'invoice' },
  transfer_out: { direction: 'OUT', label: 'Transfer Out', docType: 'transfer' },
  adjustment_minus: { direction: 'OUT', label: 'Stock Adjustment (-)', docType: 'adjustment' },
  damage_writeoff: { direction: 'OUT', label: 'Damage/Write-off', docType: 'writeoff' },
  sample_issue: { direction: 'OUT', label: 'Sample Issue', docType: 'sample' },
  production_consumption: { direction: 'OUT', label: 'Production Consumption', docType: 'production' }
}

// Calculate weighted average cost
const calculateWeightedAvgCost = (existingQty, existingCost, newQty, newCost) => {
  if (existingQty + newQty === 0) return 0
  return ((existingQty * existingCost) + (newQty * newCost)) / (existingQty + newQty)
}

// GET - Fetch stock ledger entries
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const movementType = searchParams.get('movementType')
    const refDocType = searchParams.get('refDocType')
    const refDocId = searchParams.get('refDocId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const ledger = db.collection('wf_stock_ledger')
    const stockCollection = db.collection('wf_inventory_stock')

    // Build query
    const query = {}
    if (productId) query.productId = productId
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (movementType) query.movementType = movementType
    if (refDocType) query.refDocType = refDocType
    if (refDocId) query.refDocId = refDocId
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = fromDate
      if (toDate) query.createdAt.$lte = toDate
    }

    // Get ledger entries
    const entries = await ledger
      .find(query)
      .sort({ createdAt: -1, sequence: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    const totalCount = await ledger.countDocuments(query)

    // Calculate summary
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $eq: ['$direction', 'IN'] }, '$quantity', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$quantity', 0] } },
          totalInValue: { $sum: { $cond: [{ $eq: ['$direction', 'IN'] }, '$totalValue', 0] } },
          totalOutValue: { $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$totalValue', 0] } },
          movementCount: { $sum: 1 }
        }
      }
    ]
    const summaryResult = await ledger.aggregate(summaryPipeline).toArray()
    const summary = summaryResult[0] || { totalIn: 0, totalOut: 0, totalInValue: 0, totalOutValue: 0, movementCount: 0 }

    // Get current stock position if productId is specified
    let currentStock = null
    if (productId) {
      const stockQuery = { productId }
      if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId
      currentStock = await stockCollection.findOne(stockQuery)
    }

    return successResponse({
      entries: sanitizeDocuments(entries),
      summary: {
        ...summary,
        netMovement: summary.totalIn - summary.totalOut,
        netValue: summary.totalInValue - summary.totalOutValue
      },
      currentStock: currentStock ? sanitizeDocument(currentStock) : null,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + entries.length < totalCount
      },
      movementTypes: MOVEMENT_TYPES
    })
  } catch (error) {
    console.error('Stock Ledger GET Error:', error)
    return errorResponse('Failed to fetch stock ledger', 500, error.message)
  }
}

// POST - Create stock ledger entry (and update stock)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      productId,
      productName,
      sku,
      warehouseId,
      warehouseName,
      movementType,
      quantity,
      unit = 'sqft',
      unitCost,
      refDocType,
      refDocId,
      refDocNumber,
      batchId,
      batchNumber,
      lotNo,
      shade,
      grade,
      notes,
      // For bulk operations
      items
    } = body

    if (!movementType || !MOVEMENT_TYPES[movementType]) {
      return errorResponse('Invalid movement type', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const ledger = db.collection('wf_stock_ledger')
    const stockCollection = db.collection('wf_inventory_stock')

    const now = new Date().toISOString()
    const typeConfig = MOVEMENT_TYPES[movementType]
    const direction = typeConfig.direction

    // Handle bulk items (for GRN, Challan with multiple items)
    const itemsToProcess = items || [{
      productId,
      productName,
      sku,
      warehouseId,
      warehouseName,
      quantity,
      unit,
      unitCost,
      batchId,
      batchNumber,
      lotNo,
      shade,
      grade
    }]

    const createdEntries = []
    const stockUpdates = []

    for (const item of itemsToProcess) {
      if (!item.productId || !item.quantity) continue

      // Get next sequence number for this product
      const lastEntry = await ledger
        .find({ productId: item.productId, warehouseId: item.warehouseId || warehouseId })
        .sort({ sequence: -1 })
        .limit(1)
        .toArray()
      const sequence = (lastEntry[0]?.sequence || 0) + 1

      // Get current stock for running balance
      const currentStock = await stockCollection.findOne({
        productId: item.productId,
        warehouseId: item.warehouseId || warehouseId || 'default'
      })

      const currentQty = currentStock?.quantity || 0
      const currentCost = currentStock?.avgCost || item.unitCost || 0

      // Calculate new balance
      const qtyChange = direction === 'IN' ? item.quantity : -item.quantity
      const newBalance = currentQty + qtyChange

      // Prevent negative stock (configurable)
      if (newBalance < 0 && !body.allowNegative) {
        return errorResponse(`Insufficient stock for ${item.productName}. Available: ${currentQty}, Requested: ${item.quantity}`, 400)
      }

      // Calculate weighted average cost for IN movements
      let newAvgCost = currentCost
      if (direction === 'IN' && item.unitCost) {
        newAvgCost = calculateWeightedAvgCost(currentQty, currentCost, item.quantity, item.unitCost)
      }

      const totalValue = item.quantity * (item.unitCost || currentCost)

      // Create ledger entry
      const ledgerEntry = {
        id: uuidv4(),
        sequence,
        
        // Product Info
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        
        // Warehouse
        warehouseId: item.warehouseId || warehouseId || 'default',
        warehouseName: item.warehouseName || warehouseName || 'Default',
        
        // Movement Details
        movementType,
        movementLabel: typeConfig.label,
        direction,
        
        // Quantities
        quantity: item.quantity,
        unit: item.unit || unit,
        quantityChange: qtyChange,
        balanceBefore: currentQty,
        balanceAfter: newBalance,
        
        // Costing
        unitCost: item.unitCost || currentCost,
        totalValue,
        avgCostBefore: currentCost,
        avgCostAfter: newAvgCost,
        
        // Reference Document
        refDocType: refDocType || typeConfig.docType,
        refDocId,
        refDocNumber,
        
        // Batch/Lot Info
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        lotNo: item.lotNo,
        shade: item.shade,
        grade: item.grade,
        
        // Audit
        notes,
        createdBy: user.id,
        createdByName: user.name || user.email,
        createdAt: now,
        
        // Status
        status: 'posted',
        posted: true,
        postedAt: now
      }

      await ledger.insertOne(ledgerEntry)
      createdEntries.push(ledgerEntry)

      // Update stock
      stockUpdates.push({
        productId: item.productId,
        warehouseId: item.warehouseId || warehouseId || 'default',
        newQty: newBalance,
        newAvgCost,
        productName: item.productName,
        sku: item.sku,
        warehouseName: item.warehouseName || warehouseName || 'Default'
      })
    }

    // Batch update stock records
    for (const update of stockUpdates) {
      await stockCollection.updateOne(
        { productId: update.productId, warehouseId: update.warehouseId },
        {
          $set: {
            quantity: update.newQty,
            avgCost: update.newAvgCost,
            totalValue: update.newQty * update.newAvgCost,
            productName: update.productName,
            sku: update.sku,
            warehouseName: update.warehouseName,
            lastMovementAt: now,
            updatedAt: now
          },
          $setOnInsert: {
            id: uuidv4(),
            createdAt: now,
            reservedQty: 0,
            reorderLevel: 100,
            category: 'flooring'
          }
        },
        { upsert: true }
      )
    }

    return successResponse({
      message: `${createdEntries.length} ledger entries created`,
      entries: sanitizeDocuments(createdEntries),
      stockUpdates: stockUpdates.map(u => ({ productId: u.productId, newQty: u.newQty }))
    }, 201)
  } catch (error) {
    console.error('Stock Ledger POST Error:', error)
    return errorResponse('Failed to create ledger entry', 500, error.message)
  }
}

// PUT - Reverse/Void a ledger entry
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, reason } = body

    if (!id) return errorResponse('Ledger entry ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const ledger = db.collection('wf_stock_ledger')
    const stockCollection = db.collection('wf_inventory_stock')

    const entry = await ledger.findOne({ id })
    if (!entry) return errorResponse('Ledger entry not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'reverse':
        // Create a reversal entry
        if (entry.reversed) return errorResponse('Entry already reversed', 400)

        // Get current stock
        const currentStock = await stockCollection.findOne({
          productId: entry.productId,
          warehouseId: entry.warehouseId
        })
        const currentQty = currentStock?.quantity || 0

        // Reverse the quantity change
        const reversalQtyChange = -entry.quantityChange
        const newBalance = currentQty + reversalQtyChange

        // Get next sequence
        const lastEntry = await ledger
          .find({ productId: entry.productId, warehouseId: entry.warehouseId })
          .sort({ sequence: -1 })
          .limit(1)
          .toArray()
        const sequence = (lastEntry[0]?.sequence || 0) + 1

        // Create reversal entry
        const reversalEntry = {
          id: uuidv4(),
          sequence,
          productId: entry.productId,
          productName: entry.productName,
          sku: entry.sku,
          warehouseId: entry.warehouseId,
          warehouseName: entry.warehouseName,
          movementType: `${entry.movementType}_reversal`,
          movementLabel: `${entry.movementLabel} (Reversal)`,
          direction: entry.direction === 'IN' ? 'OUT' : 'IN',
          quantity: entry.quantity,
          unit: entry.unit,
          quantityChange: reversalQtyChange,
          balanceBefore: currentQty,
          balanceAfter: newBalance,
          unitCost: entry.unitCost,
          totalValue: entry.totalValue,
          refDocType: 'reversal',
          refDocId: entry.id,
          refDocNumber: `REV-${entry.refDocNumber || entry.id.slice(0, 8)}`,
          originalEntryId: entry.id,
          notes: reason || 'Reversal of original entry',
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now,
          status: 'posted',
          posted: true,
          postedAt: now
        }

        await ledger.insertOne(reversalEntry)

        // Mark original as reversed
        await ledger.updateOne({ id }, {
          $set: {
            reversed: true,
            reversedAt: now,
            reversedBy: user.id,
            reversalEntryId: reversalEntry.id,
            reversalReason: reason
          }
        })

        // Update stock
        await stockCollection.updateOne(
          { productId: entry.productId, warehouseId: entry.warehouseId },
          {
            $set: {
              quantity: newBalance,
              lastMovementAt: now,
              updatedAt: now
            }
          }
        )

        return successResponse({
          message: 'Entry reversed successfully',
          originalEntry: sanitizeDocument(entry),
          reversalEntry: sanitizeDocument(reversalEntry),
          newBalance
        })

      case 'void':
        // Void without creating reversal (for erroneous entries)
        if (entry.voided) return errorResponse('Entry already voided', 400)

        await ledger.updateOne({ id }, {
          $set: {
            voided: true,
            voidedAt: now,
            voidedBy: user.id,
            voidReason: reason,
            status: 'voided'
          }
        })

        return successResponse({ message: 'Entry voided', entry: sanitizeDocument(entry) })

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Stock Ledger PUT Error:', error)
    return errorResponse('Failed to update ledger entry', 500, error.message)
  }
}
