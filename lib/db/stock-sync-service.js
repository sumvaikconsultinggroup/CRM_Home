/**
 * =====================================================
 * FLOORING MODULE - STOCK SYNCHRONIZATION SERVICE
 * =====================================================
 * 
 * This service ensures consistency between:
 * - Stock quantities (wf_inventory_stock)
 * - Stock Ledger entries (wf_stock_ledger)
 * - Inventory movements (wf_inventory_movements)
 * 
 * ALL stock-modifying operations should use this service.
 */

import { v4 as uuidv4 } from 'uuid'
import { COLLECTIONS } from './flooring-collections'

/**
 * Movement types with their stock direction
 */
export const MOVEMENT_TYPES = {
  // Inward (Stock increases)
  GRN_RECEIPT: { direction: 'IN', code: 'grn_receipt', label: 'GRN Receipt' },
  SALES_RETURN: { direction: 'IN', code: 'sales_return', label: 'Sales Return' },
  TRANSFER_IN: { direction: 'IN', code: 'transfer_in', label: 'Transfer In' },
  ADJUSTMENT_PLUS: { direction: 'IN', code: 'adjustment_plus', label: 'Stock Adjustment (+)' },
  OPENING_STOCK: { direction: 'IN', code: 'opening_stock', label: 'Opening Stock' },
  
  // Outward (Stock decreases)
  CHALLAN_DISPATCH: { direction: 'OUT', code: 'challan_dispatch', label: 'Challan Dispatch' },
  SALES_ISSUE: { direction: 'OUT', code: 'sales_issue', label: 'Sales Issue' },
  TRANSFER_OUT: { direction: 'OUT', code: 'transfer_out', label: 'Transfer Out' },
  ADJUSTMENT_MINUS: { direction: 'OUT', code: 'adjustment_minus', label: 'Stock Adjustment (-)' },
  DAMAGE_WRITEOFF: { direction: 'OUT', code: 'damage_writeoff', label: 'Damage/Write-off' },
}

/**
 * Create a stock movement with full audit trail
 * This is the SINGLE function that should be used for ALL stock changes
 * 
 * @param {Object} db - MongoDB database instance
 * @param {Object} params - Movement parameters
 * @param {string} params.productId - Product ID
 * @param {string} params.productName - Product name
 * @param {string} params.sku - Product SKU
 * @param {string} params.warehouseId - Warehouse ID
 * @param {string} params.warehouseName - Warehouse name
 * @param {number} params.quantity - Quantity to move (always positive)
 * @param {string} params.movementType - One of MOVEMENT_TYPES keys
 * @param {number} params.unitCost - Cost per unit
 * @param {string} params.refDocType - Reference document type (grn, challan, invoice, etc.)
 * @param {string} params.refDocId - Reference document ID
 * @param {string} params.refDocNumber - Reference document number
 * @param {string} params.notes - Optional notes
 * @param {Object} params.user - User performing the action
 * @param {string} params.clientId - Client ID
 * @param {string} [params.batchId] - Optional batch/lot ID
 * @param {string} [params.binLocationId] - Optional bin location
 * @returns {Object} Result with movement, ledgerEntry, and updated stock
 */
export async function createStockMovement(db, params) {
  const {
    productId, productName, sku,
    warehouseId, warehouseName,
    quantity, movementType,
    unitCost = 0,
    refDocType, refDocId, refDocNumber,
    notes = '',
    user, clientId,
    batchId, binLocationId
  } = params

  // Validate movement type
  const movementConfig = MOVEMENT_TYPES[movementType]
  if (!movementConfig) {
    throw new Error(`Invalid movement type: ${movementType}`)
  }

  const now = new Date().toISOString()
  const collections = {
    stock: db.collection(COLLECTIONS.INVENTORY_STOCK),
    ledger: db.collection(COLLECTIONS.STOCK_LEDGER),
    movements: db.collection(COLLECTIONS.INVENTORY_MOVEMENTS)
  }

  // Get current stock
  let currentStock = await collections.stock.findOne({
    productId,
    warehouseId
  })

  const previousQty = currentStock?.quantity || 0
  const previousAvgCost = currentStock?.avgCostPrice || currentStock?.avgCost || 0
  
  // Calculate new values based on direction
  let newQty, newAvgCost, quantityChange
  
  if (movementConfig.direction === 'IN') {
    quantityChange = quantity
    newQty = previousQty + quantity
    // Weighted average cost calculation for incoming stock
    if (unitCost > 0) {
      newAvgCost = previousQty + quantity > 0
        ? ((previousQty * previousAvgCost) + (quantity * unitCost)) / (previousQty + quantity)
        : unitCost
    } else {
      newAvgCost = previousAvgCost
    }
  } else {
    // Validate sufficient stock for outgoing
    if (previousQty < quantity) {
      throw new Error(`Insufficient stock. Available: ${previousQty}, Required: ${quantity}`)
    }
    quantityChange = -quantity
    newQty = previousQty - quantity
    newAvgCost = previousAvgCost // Cost doesn't change on outward movement
  }

  // 1. Create Movement Record
  const movementCount = await collections.movements.countDocuments({}) + 1
  const movement = {
    id: uuidv4(),
    clientId,
    movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
    movementType: movementConfig.code,
    movementLabel: movementConfig.label,
    direction: movementConfig.direction,
    productId,
    productName,
    sku,
    warehouseId,
    warehouseName,
    quantity,
    quantityChange,
    unitCost,
    totalCost: quantity * unitCost,
    previousQuantity: previousQty,
    newQuantity: newQty,
    previousAvgCost,
    newAvgCost,
    referenceType: refDocType,
    referenceId: refDocId,
    referenceNumber: refDocNumber,
    batchId,
    binLocationId,
    notes,
    createdAt: now,
    createdBy: user.id,
    createdByName: user.name || user.email
  }
  await collections.movements.insertOne(movement)

  // 2. Create Ledger Entry (Double-Entry)
  const ledgerSequence = await collections.ledger
    .find({ productId, warehouseId })
    .sort({ sequence: -1 })
    .limit(1)
    .toArray()
  const nextSequence = (ledgerSequence[0]?.sequence || 0) + 1

  const ledgerEntry = {
    id: uuidv4(),
    clientId,
    sequence: nextSequence,
    productId,
    productName,
    sku,
    warehouseId,
    warehouseName,
    direction: movementConfig.direction,
    movementType: movementConfig.code,
    movementLabel: movementConfig.label,
    quantity,
    unitCost,
    totalValue: quantity * unitCost,
    runningBalance: newQty,
    runningValue: newQty * newAvgCost,
    avgCostAtTime: newAvgCost,
    refDocType,
    refDocId,
    refDocNumber,
    batchId,
    binLocationId,
    notes,
    createdAt: now,
    createdBy: user.id,
    createdByName: user.name || user.email
  }
  await collections.ledger.insertOne(ledgerEntry)

  // 3. Update Stock Quantity
  if (currentStock) {
    await collections.stock.updateOne(
      { productId, warehouseId },
      {
        $set: {
          quantity: newQty,
          avgCostPrice: newAvgCost,
          avgCost: newAvgCost, // Keep both for compatibility
          lastMovementAt: now,
          lastMovementType: movementConfig.code,
          lastMovementId: movement.id,
          updatedAt: now
        }
      }
    )
  } else {
    // Create new stock record
    await collections.stock.insertOne({
      id: uuidv4(),
      clientId,
      productId,
      productName,
      sku,
      warehouseId,
      warehouseName,
      quantity: newQty,
      reservedQuantity: 0,
      availableQuantity: newQty,
      avgCostPrice: newAvgCost,
      avgCost: newAvgCost,
      lastMovementAt: now,
      lastMovementType: movementConfig.code,
      lastMovementId: movement.id,
      createdAt: now,
      updatedAt: now
    })
  }

  // Get updated stock
  const updatedStock = await collections.stock.findOne({ productId, warehouseId })

  return {
    success: true,
    movement,
    ledgerEntry,
    stock: updatedStock,
    summary: {
      previousQty,
      quantityChange,
      newQty,
      previousAvgCost,
      newAvgCost
    }
  }
}

/**
 * Process multiple items in a single transaction (e.g., GRN with multiple items)
 * @param {Object} db - MongoDB database instance
 * @param {Array} items - Array of movement params
 * @param {Object} commonParams - Common parameters for all items
 * @returns {Object} Results for all items
 */
export async function createBulkStockMovement(db, items, commonParams) {
  const results = []
  const errors = []

  for (const item of items) {
    try {
      const result = await createStockMovement(db, {
        ...commonParams,
        ...item
      })
      results.push(result)
    } catch (error) {
      errors.push({
        item,
        error: error.message
      })
    }
  }

  return {
    success: errors.length === 0,
    processed: results.length,
    failed: errors.length,
    results,
    errors
  }
}

/**
 * Reverse a stock movement (e.g., for cancellations)
 * @param {Object} db - MongoDB database instance
 * @param {string} movementId - Original movement ID to reverse
 * @param {string} reason - Reason for reversal
 * @param {Object} user - User performing the reversal
 */
export async function reverseStockMovement(db, movementId, reason, user) {
  const movements = db.collection(COLLECTIONS.INVENTORY_MOVEMENTS)
  
  const originalMovement = await movements.findOne({ id: movementId })
  if (!originalMovement) {
    throw new Error(`Movement not found: ${movementId}`)
  }

  if (originalMovement.isReversed) {
    throw new Error('Movement has already been reversed')
  }

  // Determine the reverse movement type
  const reverseType = originalMovement.direction === 'IN' 
    ? 'ADJUSTMENT_MINUS' 
    : 'ADJUSTMENT_PLUS'

  // Create reverse movement
  const result = await createStockMovement(db, {
    productId: originalMovement.productId,
    productName: originalMovement.productName,
    sku: originalMovement.sku,
    warehouseId: originalMovement.warehouseId,
    warehouseName: originalMovement.warehouseName,
    quantity: originalMovement.quantity,
    movementType: reverseType,
    unitCost: originalMovement.unitCost,
    refDocType: 'reversal',
    refDocId: movementId,
    refDocNumber: `REV-${originalMovement.movementNumber}`,
    notes: `Reversal: ${reason}`,
    user,
    clientId: originalMovement.clientId,
    batchId: originalMovement.batchId,
    binLocationId: originalMovement.binLocationId
  })

  // Mark original as reversed
  await movements.updateOne(
    { id: movementId },
    {
      $set: {
        isReversed: true,
        reversedAt: new Date().toISOString(),
        reversedBy: user.id,
        reversalMovementId: result.movement.id,
        reversalReason: reason
      }
    }
  )

  return result
}

/**
 * Get stock summary for a product across all warehouses
 */
export async function getProductStockSummary(db, productId) {
  const stock = db.collection(COLLECTIONS.INVENTORY_STOCK)
  
  const pipeline = [
    { $match: { productId } },
    {
      $group: {
        _id: '$productId',
        totalQuantity: { $sum: '$quantity' },
        totalReserved: { $sum: { $ifNull: ['$reservedQuantity', 0] } },
        totalAvailable: { $sum: { $ifNull: ['$availableQuantity', '$quantity'] } },
        warehouseCount: { $sum: 1 },
        avgCost: { $avg: '$avgCostPrice' },
        totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$avgCostPrice', 0] }] } }
      }
    }
  ]

  const result = await stock.aggregate(pipeline).toArray()
  return result[0] || {
    totalQuantity: 0,
    totalReserved: 0,
    totalAvailable: 0,
    warehouseCount: 0,
    avgCost: 0,
    totalValue: 0
  }
}

export default {
  MOVEMENT_TYPES,
  createStockMovement,
  createBulkStockMovement,
  reverseStockMovement,
  getProductStockSummary
}
