import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

// Movement Types
const MOVEMENT_TYPES = {
  GOODS_RECEIPT: 'goods_receipt',      // Stock IN from purchase
  GOODS_ISSUE: 'goods_issue',          // Stock OUT for sales/dispatch
  TRANSFER_OUT: 'transfer_out',        // Stock OUT for inter-warehouse transfer
  TRANSFER_IN: 'transfer_in',          // Stock IN from inter-warehouse transfer
  ADJUSTMENT_PLUS: 'adjustment_plus',  // Positive adjustment
  ADJUSTMENT_MINUS: 'adjustment_minus',// Negative adjustment
  DAMAGE: 'damage',                    // Damaged/scrapped stock
  RETURN_IN: 'return_in',              // Customer return
  RETURN_OUT: 'return_out',            // Return to supplier
  RESERVATION: 'reservation',          // Reserve for order
  RELEASE: 'release'                   // Release reservation
}

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch movement history
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const movementType = searchParams.get('type')
    const batchNumber = searchParams.get('batchNumber')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const limit = parseInt(searchParams.get('limit')) || 100
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const movementCollection = db.collection('wf_inventory_movements')

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (productId) query.productId = productId
    if (movementType) query.movementType = movementType
    if (batchNumber) query.batchNumber = batchNumber
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = new Date(fromDate)
      if (toDate) query.createdAt.$lte = new Date(toDate)
    }

    const total = await movementCollection.countDocuments(query)
    const movements = await movementCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Summary stats
    const allMovements = await movementCollection.find(query).toArray()
    const summary = {
      totalMovements: total,
      totalIn: allMovements.filter(m => ['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in'].includes(m.movementType))
        .reduce((sum, m) => sum + (m.quantity || 0), 0),
      totalOut: allMovements.filter(m => ['goods_issue', 'transfer_out', 'adjustment_minus', 'damage', 'return_out'].includes(m.movementType))
        .reduce((sum, m) => sum + (m.quantity || 0), 0)
    }

    return successResponse({
      movements: sanitizeDocuments(movements),
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Movement GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch movements', 500, error.message)
  }
}

// POST - Create stock movement
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      movementType,
      productId,
      warehouseId,
      quantity,
      unitCost,
      batchNumber,
      lotNumber,
      manufacturingDate,
      expiryDate,
      referenceType,  // 'purchase_order', 'sales_order', 'transfer', 'adjustment'
      referenceId,
      referenceNumber,
      vendorId,
      vendorName,
      notes,
      reason
    } = body

    // Validation
    if (!movementType || !Object.values(MOVEMENT_TYPES).includes(movementType)) {
      return errorResponse('Invalid movement type', 400)
    }
    if (!productId) return errorResponse('Product ID is required', 400)
    if (!warehouseId) return errorResponse('Warehouse ID is required', 400)
    if (!quantity || quantity <= 0) return errorResponse('Valid quantity is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const movementCollection = db.collection('wf_inventory_movements')
    const stockCollection = db.collection('wf_inventory_stock')
    const batchCollection = db.collection('wf_inventory_batches')
    const warehouseCollection = db.collection('wf_warehouses')
    
    // Check multiple product collections (flooring_products, wf_inventory, or inventory_products)
    let product = await db.collection('flooring_products').findOne({ id: productId })
    if (!product) {
      product = await db.collection('wf_inventory').findOne({ id: productId })
    }
    if (!product) {
      product = await db.collection('inventory_products').findOne({ id: productId })
    }
    // Also check stock collection - product might have been deleted but stock record exists
    if (!product) {
      const existingStock = await stockCollection.findOne({ productId })
      if (existingStock) {
        // Create a minimal product object from stock record
        product = {
          id: productId,
          name: existingStock.productName || 'Unknown Product',
          sku: existingStock.sku || '',
          category: existingStock.category || '',
          costPrice: existingStock.avgCostPrice || 0,
          sellingPrice: existingStock.sellingPrice || 0,
          unit: existingStock.unit || 'sqft'
        }
        console.log('Using product data from stock record:', productId)
      }
    }
    if (!product) {
      console.error('Product not found in any collection:', productId)
      return errorResponse('Product not found. Please ensure the product exists in the product catalog. If the product was deleted, please create it again.', 404)
    }

    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    // Get or create stock record
    let stock = await stockCollection.findOne({ productId, warehouseId })
    if (!stock) {
      // Auto-create stock record
      stock = {
        id: uuidv4(),
        clientId: user.clientId,
        productId,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        warehouseId,
        warehouseName: warehouse.name,
        quantity: 0,
        reservedQty: 0,
        avgCostPrice: product.costPrice || 0,
        lastCostPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        reorderLevel: product.reorderLevel || 10,
        safetyStock: 5,
        maxStock: 1000,
        unit: product.unit || 'sqft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await stockCollection.insertOne(stock)
    }

    // Calculate quantity change based on movement type
    let quantityChange = 0
    let reservedChange = 0
    let isInward = false

    switch (movementType) {
      case MOVEMENT_TYPES.GOODS_RECEIPT:
      case MOVEMENT_TYPES.TRANSFER_IN:
      case MOVEMENT_TYPES.ADJUSTMENT_PLUS:
      case MOVEMENT_TYPES.RETURN_IN:
        quantityChange = quantity
        isInward = true
        break
      case MOVEMENT_TYPES.GOODS_ISSUE:
      case MOVEMENT_TYPES.TRANSFER_OUT:
      case MOVEMENT_TYPES.ADJUSTMENT_MINUS:
      case MOVEMENT_TYPES.DAMAGE:
      case MOVEMENT_TYPES.RETURN_OUT:
        quantityChange = -quantity
        // Check sufficient stock
        if (stock.quantity < quantity) {
          return errorResponse(`Insufficient stock. Available: ${stock.quantity}`, 400)
        }
        break
      case MOVEMENT_TYPES.RESERVATION:
        reservedChange = quantity
        if ((stock.quantity - stock.reservedQty) < quantity) {
          return errorResponse(`Insufficient available stock for reservation. Available: ${stock.quantity - stock.reservedQty}`, 400)
        }
        break
      case MOVEMENT_TYPES.RELEASE:
        reservedChange = -quantity
        if (stock.reservedQty < quantity) {
          return errorResponse(`Cannot release more than reserved. Reserved: ${stock.reservedQty}`, 400)
        }
        break
    }

    // Generate movement number
    const movementCount = await movementCollection.countDocuments({}) + 1
    const movementNumber = `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`

    // Calculate new average cost for inward movements
    let newAvgCost = stock.avgCostPrice
    if (isInward && unitCost) {
      const totalValue = (stock.quantity * stock.avgCostPrice) + (quantity * unitCost)
      const newTotalQty = stock.quantity + quantity
      newAvgCost = newTotalQty > 0 ? totalValue / newTotalQty : unitCost
    }

    // Create movement record
    const movement = {
      id: uuidv4(),
      clientId: user.clientId,
      movementNumber,
      movementType,
      productId,
      productName: product.name,
      sku: product.sku,
      warehouseId,
      warehouseName: warehouse.name,
      quantity,
      quantityChange,
      unitCost: unitCost || stock.avgCostPrice,
      totalCost: quantity * (unitCost || stock.avgCostPrice),
      batchNumber: batchNumber || null,
      lotNumber: lotNumber || null,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      referenceNumber: referenceNumber || null,
      vendorId: vendorId || null,
      vendorName: vendorName || null,
      notes: notes || '',
      reason: reason || '',
      stockBefore: stock.quantity,
      stockAfter: stock.quantity + quantityChange,
      reservedBefore: stock.reservedQty,
      reservedAfter: stock.reservedQty + reservedChange,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date()
    }

    await movementCollection.insertOne(movement)

    // Update stock record
    const stockUpdate = {
      quantity: stock.quantity + quantityChange,
      reservedQty: stock.reservedQty + reservedChange,
      availableQty: (stock.quantity + quantityChange) - (stock.reservedQty + reservedChange),
      lastMovementDate: new Date(),
      updatedAt: new Date()
    }

    if (isInward) {
      stockUpdate.avgCostPrice = newAvgCost
      stockUpdate.lastCostPrice = unitCost || stock.lastCostPrice
    }

    await stockCollection.updateOne(
      { productId, warehouseId },
      { $set: stockUpdate }
    )

    // Handle batch tracking for inward movements
    if (isInward && (batchNumber || lotNumber)) {
      const existingBatch = await batchCollection.findOne({
        productId,
        warehouseId,
        batchNumber: batchNumber || lotNumber
      })

      if (existingBatch) {
        // Update existing batch
        await batchCollection.updateOne(
          { id: existingBatch.id },
          {
            $inc: { quantity: quantity },
            $set: { updatedAt: new Date() }
          }
        )
      } else {
        // Create new batch
        const batch = {
          id: uuidv4(),
          clientId: user.clientId,
          productId,
          productName: product.name,
          warehouseId,
          warehouseName: warehouse.name,
          batchNumber: batchNumber || lotNumber,
          lotNumber: lotNumber || null,
          quantity,
          originalQuantity: quantity,
          unitCost: unitCost || stock.avgCostPrice,
          manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          receivedDate: new Date(),
          vendorId: vendorId || null,
          vendorName: vendorName || null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await batchCollection.insertOne(batch)
      }
    }

    // For outward movements, reduce batch quantities (FIFO)
    if (!isInward && quantityChange < 0) {
      let remainingQty = quantity
      const batches = await batchCollection
        .find({ productId, warehouseId, quantity: { $gt: 0 } })
        .sort({ receivedDate: 1 }) // FIFO
        .toArray()

      for (const batch of batches) {
        if (remainingQty <= 0) break
        const deductQty = Math.min(batch.quantity, remainingQty)
        await batchCollection.updateOne(
          { id: batch.id },
          {
            $inc: { quantity: -deductQty },
            $set: { updatedAt: new Date() }
          }
        )
        remainingQty -= deductQty
      }
    }

    return successResponse({
      movement: sanitizeDocument(movement),
      updatedStock: {
        quantity: stockUpdate.quantity,
        reservedQty: stockUpdate.reservedQty,
        availableQty: stockUpdate.availableQty,
        avgCostPrice: stockUpdate.avgCostPrice || stock.avgCostPrice
      }
    }, 201)
  } catch (error) {
    console.error('Movement POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create movement', 500, error.message)
  }
}
