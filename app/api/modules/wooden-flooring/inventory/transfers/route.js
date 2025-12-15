import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

// Transfer Status Flow: draft -> approved -> in_transit -> partial_received/received -> completed
const TRANSFER_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  IN_TRANSIT: 'in_transit',
  PARTIAL_RECEIVED: 'partial_received',
  RECEIVED: 'received',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch transfers
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const transferId = searchParams.get('id')
    const fromWarehouseId = searchParams.get('fromWarehouseId')
    const toWarehouseId = searchParams.get('toWarehouseId')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const transferCollection = db.collection('wf_inventory_transfers')

    if (transferId) {
      const transfer = await transferCollection.findOne({ id: transferId })
      if (!transfer) return errorResponse('Transfer not found', 404)
      return successResponse(sanitizeDocument(transfer))
    }

    // Build query
    let query = {}
    if (fromWarehouseId) query.fromWarehouseId = fromWarehouseId
    if (toWarehouseId) query.toWarehouseId = toWarehouseId
    if (status) query.status = status
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = new Date(fromDate)
      if (toDate) query.createdAt.$lte = new Date(toDate)
    }

    const transfers = await transferCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Summary
    const summary = {
      total: transfers.length,
      draft: transfers.filter(t => t.status === 'draft').length,
      inTransit: transfers.filter(t => t.status === 'in_transit').length,
      completed: transfers.filter(t => t.status === 'completed').length,
      totalQuantity: transfers.reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0)
    }

    return successResponse({ transfers: sanitizeDocuments(transfers), summary })
  } catch (error) {
    console.error('Transfer GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch transfers', 500, error.message)
  }
}

// POST - Create new transfer
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { fromWarehouseId, toWarehouseId, items, notes, expectedDate } = body

    // Validation
    if (!fromWarehouseId || !toWarehouseId) {
      return errorResponse('Source and destination warehouses are required', 400)
    }
    if (fromWarehouseId === toWarehouseId) {
      return errorResponse('Source and destination warehouses must be different', 400)
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('At least one item is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const transferCollection = db.collection('wf_inventory_transfers')
    const warehouseCollection = db.collection('wf_warehouses')
    const stockCollection = db.collection('wf_inventory_stock')
    const productCollection = db.collection('wf_inventory')

    // Verify warehouses
    const fromWarehouse = await warehouseCollection.findOne({ id: fromWarehouseId })
    const toWarehouse = await warehouseCollection.findOne({ id: toWarehouseId })
    if (!fromWarehouse) return errorResponse('Source warehouse not found', 404)
    if (!toWarehouse) return errorResponse('Destination warehouse not found', 404)

    // Validate items and check stock availability
    const validatedItems = []
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return errorResponse('Each item must have productId and positive quantity', 400)
      }

      const product = await productCollection.findOne({ id: item.productId })
      if (!product) return errorResponse(`Product not found: ${item.productId}`, 404)

      const stock = await stockCollection.findOne({ productId: item.productId, warehouseId: fromWarehouseId })
      const availableQty = stock ? (stock.quantity - (stock.reservedQty || 0)) : 0

      if (availableQty < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}. Available: ${availableQty}`, 400)
      }

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost: stock?.avgCostPrice || product.costPrice || 0,
        batchNumber: item.batchNumber || null,
        notes: item.notes || ''
      })
    }

    // Generate transfer number
    const transferCount = await transferCollection.countDocuments({}) + 1
    const transferNumber = `TRF-${new Date().getFullYear()}${String(transferCount).padStart(5, '0')}`

    // Calculate totals
    const totalQuantity = validatedItems.reduce((sum, i) => sum + i.quantity, 0)
    const totalValue = validatedItems.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0)

    const transfer = {
      id: uuidv4(),
      clientId: user.clientId,
      transferNumber,
      fromWarehouseId,
      fromWarehouseName: fromWarehouse.name,
      toWarehouseId,
      toWarehouseName: toWarehouse.name,
      items: validatedItems,
      totalQuantity,
      totalValue,
      status: TRANSFER_STATUS.DRAFT,
      notes: notes || '',
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      statusHistory: [{
        status: TRANSFER_STATUS.DRAFT,
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: 'Transfer created'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await transferCollection.insertOne(transfer)
    return successResponse(sanitizeDocument(transfer), 201)
  } catch (error) {
    console.error('Transfer POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create transfer', 500, error.message)
  }
}

// PUT - Update transfer status or receive items
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, receivedItems, notes } = body

    if (!id) return errorResponse('Transfer ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const transferCollection = db.collection('wf_inventory_transfers')
    const movementCollection = db.collection('wf_inventory_movements')
    const stockCollection = db.collection('wf_inventory_stock')

    const transfer = await transferCollection.findOne({ id })
    if (!transfer) return errorResponse('Transfer not found', 404)

    let updateData = { updatedAt: new Date() }
    let newStatus = transfer.status

    switch (action) {
      case 'approve':
        if (transfer.status !== TRANSFER_STATUS.DRAFT) {
          return errorResponse('Only draft transfers can be approved', 400)
        }
        newStatus = TRANSFER_STATUS.APPROVED
        updateData.approvedBy = user.id
        updateData.approvedAt = new Date()
        break

      case 'dispatch':
        if (transfer.status !== TRANSFER_STATUS.APPROVED) {
          return errorResponse('Only approved transfers can be dispatched', 400)
        }
        
        // Create TRANSFER_OUT movements for each item
        for (const item of transfer.items) {
          const movementCount = await movementCollection.countDocuments({}) + 1
          const movement = {
            id: uuidv4(),
            clientId: user.clientId,
            movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
            movementType: 'transfer_out',
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            warehouseId: transfer.fromWarehouseId,
            warehouseName: transfer.fromWarehouseName,
            quantity: item.quantity,
            quantityChange: -item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            referenceType: 'transfer',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            notes: `Transfer to ${transfer.toWarehouseName}`,
            createdBy: user.id,
            createdByName: user.name || user.email,
            createdAt: new Date()
          }

          // Get current stock
          const stock = await stockCollection.findOne({ 
            productId: item.productId, 
            warehouseId: transfer.fromWarehouseId 
          })

          if (stock) {
            movement.stockBefore = stock.quantity
            movement.stockAfter = stock.quantity - item.quantity
            
            // Update stock
            await stockCollection.updateOne(
              { productId: item.productId, warehouseId: transfer.fromWarehouseId },
              { 
                $inc: { quantity: -item.quantity },
                $set: { 
                  availableQty: (stock.quantity - item.quantity) - (stock.reservedQty || 0),
                  lastMovementDate: new Date(),
                  updatedAt: new Date() 
                }
              }
            )
          }

          await movementCollection.insertOne(movement)
        }

        newStatus = TRANSFER_STATUS.IN_TRANSIT
        updateData.dispatchedBy = user.id
        updateData.dispatchedAt = new Date()
        break

      case 'receive':
        if (transfer.status !== TRANSFER_STATUS.IN_TRANSIT && transfer.status !== TRANSFER_STATUS.PARTIAL_RECEIVED) {
          return errorResponse('Only in-transit transfers can be received', 400)
        }
        
        if (!receivedItems || !Array.isArray(receivedItems)) {
          return errorResponse('Received items are required', 400)
        }

        // Update received quantities and create TRANSFER_IN movements
        let allReceived = true
        const updatedItems = [...transfer.items]

        for (const received of receivedItems) {
          const itemIndex = updatedItems.findIndex(i => i.productId === received.productId)
          if (itemIndex === -1) continue

          const item = updatedItems[itemIndex]
          const newReceivedQty = (item.receivedQuantity || 0) + (received.quantity || 0)
          
          if (newReceivedQty > item.quantity) {
            return errorResponse(`Cannot receive more than transferred for ${item.productName}`, 400)
          }

          updatedItems[itemIndex].receivedQuantity = newReceivedQty

          if (received.quantity > 0) {
            // Create TRANSFER_IN movement
            const movementCount = await movementCollection.countDocuments({}) + 1
            const movement = {
              id: uuidv4(),
              clientId: user.clientId,
              movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
              movementType: 'transfer_in',
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              warehouseId: transfer.toWarehouseId,
              warehouseName: transfer.toWarehouseName,
              quantity: received.quantity,
              quantityChange: received.quantity,
              unitCost: item.unitCost,
              totalCost: received.quantity * item.unitCost,
              referenceType: 'transfer',
              referenceId: transfer.id,
              referenceNumber: transfer.transferNumber,
              notes: `Transfer from ${transfer.fromWarehouseName}`,
              createdBy: user.id,
              createdByName: user.name || user.email,
              createdAt: new Date()
            }

            // Get or create destination stock
            let destStock = await stockCollection.findOne({ 
              productId: item.productId, 
              warehouseId: transfer.toWarehouseId 
            })

            if (!destStock) {
              destStock = {
                id: uuidv4(),
                clientId: user.clientId,
                productId: item.productId,
                productName: item.productName,
                sku: item.sku,
                warehouseId: transfer.toWarehouseId,
                warehouseName: transfer.toWarehouseName,
                quantity: 0,
                reservedQty: 0,
                avgCostPrice: item.unitCost,
                lastCostPrice: item.unitCost,
                reorderLevel: 10,
                createdAt: new Date(),
                updatedAt: new Date()
              }
              await stockCollection.insertOne(destStock)
            }

            movement.stockBefore = destStock.quantity
            movement.stockAfter = destStock.quantity + received.quantity

            // Update destination stock
            await stockCollection.updateOne(
              { productId: item.productId, warehouseId: transfer.toWarehouseId },
              { 
                $inc: { quantity: received.quantity },
                $set: { 
                  availableQty: (destStock.quantity + received.quantity) - (destStock.reservedQty || 0),
                  lastMovementDate: new Date(),
                  updatedAt: new Date() 
                }
              }
            )

            await movementCollection.insertOne(movement)
          }

          if (newReceivedQty < item.quantity) allReceived = false
        }

        updateData.items = updatedItems
        updateData.receivedQuantity = updatedItems.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0)
        newStatus = allReceived ? TRANSFER_STATUS.RECEIVED : TRANSFER_STATUS.PARTIAL_RECEIVED
        updateData.receivedBy = user.id
        updateData.receivedAt = new Date()
        break

      case 'complete':
        if (transfer.status !== TRANSFER_STATUS.RECEIVED) {
          return errorResponse('Only fully received transfers can be completed', 400)
        }
        newStatus = TRANSFER_STATUS.COMPLETED
        updateData.completedBy = user.id
        updateData.completedAt = new Date()
        break

      case 'cancel':
        if (transfer.status === TRANSFER_STATUS.COMPLETED) {
          return errorResponse('Completed transfers cannot be cancelled', 400)
        }
        
        // If already dispatched, need to reverse the movements
        if (transfer.status === TRANSFER_STATUS.IN_TRANSIT || transfer.status === TRANSFER_STATUS.PARTIAL_RECEIVED) {
          // Reverse TRANSFER_OUT - add back to source
          for (const item of transfer.items) {
            await stockCollection.updateOne(
              { productId: item.productId, warehouseId: transfer.fromWarehouseId },
              { $inc: { quantity: item.quantity }, $set: { updatedAt: new Date() } }
            )
          }
          
          // Reverse any TRANSFER_IN - remove from destination
          for (const item of transfer.items) {
            if (item.receivedQuantity > 0) {
              await stockCollection.updateOne(
                { productId: item.productId, warehouseId: transfer.toWarehouseId },
                { $inc: { quantity: -item.receivedQuantity }, $set: { updatedAt: new Date() } }
              )
            }
          }
        }
        
        newStatus = TRANSFER_STATUS.CANCELLED
        updateData.cancelledBy = user.id
        updateData.cancelledAt = new Date()
        updateData.cancellationReason = notes || ''
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    // Update status and history
    updateData.status = newStatus
    updateData.statusHistory = [
      ...transfer.statusHistory,
      {
        status: newStatus,
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: notes || `Status changed to ${newStatus}`
      }
    ]

    const result = await transferCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Transfer PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update transfer', 500, error.message)
  }
}

// DELETE - Delete draft transfer
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Transfer ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const transferCollection = db.collection('wf_inventory_transfers')

    const transfer = await transferCollection.findOne({ id })
    if (!transfer) return errorResponse('Transfer not found', 404)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      return errorResponse('Only draft transfers can be deleted', 400)
    }

    await transferCollection.deleteOne({ id })
    return successResponse({ message: 'Transfer deleted successfully' })
  } catch (error) {
    console.error('Transfer DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete transfer', 500, error.message)
  }
}
