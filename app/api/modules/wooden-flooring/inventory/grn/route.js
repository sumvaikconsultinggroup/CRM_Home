import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch GRNs (Goods Receipt Notes)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const grnId = searchParams.get('id')
    const warehouseId = searchParams.get('warehouseId')
    const vendorId = searchParams.get('vendorId')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const grnCollection = db.collection('wf_inventory_grn')

    if (grnId) {
      const grn = await grnCollection.findOne({ id: grnId })
      if (!grn) return errorResponse('GRN not found', 404)
      return successResponse(sanitizeDocument(grn))
    }

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (vendorId) query.vendorId = vendorId
    if (status) query.status = status
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = new Date(fromDate)
      if (toDate) query.createdAt.$lte = new Date(toDate)
    }

    const grns = await grnCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Summary
    const summary = {
      total: grns.length,
      draft: grns.filter(g => g.status === 'draft').length,
      received: grns.filter(g => g.status === 'received').length,
      totalValue: grns.filter(g => g.status === 'received').reduce((sum, g) => sum + (g.totalValue || 0), 0)
    }

    return successResponse({ grns: sanitizeDocuments(grns), summary })
  } catch (error) {
    console.error('GRN GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch GRNs', 500, error.message)
  }
}

// POST - Create new GRN
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { 
      warehouseId, 
      vendorId, 
      vendorName, 
      purchaseOrderNumber,
      invoiceNumber,
      invoiceDate,
      items, 
      notes,
      receivedDate 
    } = body

    if (!warehouseId) return errorResponse('Warehouse is required', 400)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('At least one item is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const grnCollection = db.collection('wf_inventory_grn')
    const warehouseCollection = db.collection('wf_warehouses')
    // Check both product collections - flooring_products is the primary catalog
    const flooringProductsCollection = db.collection('flooring_products')
    const wfInventoryCollection = db.collection('wf_inventory')

    // Verify warehouse
    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    // Validate and enrich items
    const validatedItems = []
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return errorResponse('Each item must have productId and positive quantity', 400)
      }

      // Try to find product in flooring_products first, then wf_inventory
      let product = await flooringProductsCollection.findOne({ id: item.productId })
      if (!product) {
        product = await wfInventoryCollection.findOne({ id: item.productId })
      }
      if (!product) return errorResponse(`Product not found: ${item.productId}`, 404)

      // Get cost price from product pricing structure
      const costPrice = product.pricing?.costPrice || product.costPrice || 0

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: parseFloat(item.quantity),
        unitCost: parseFloat(item.unitCost) || costPrice,
        totalCost: parseFloat(item.quantity) * (parseFloat(item.unitCost) || costPrice),
        batchNumber: item.batchNumber || null,
        lotNumber: item.lotNumber || null,
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        notes: item.notes || ''
      })
    }

    // Generate GRN number
    const grnCount = await grnCollection.countDocuments({}) + 1
    const grnNumber = `GRN-${new Date().getFullYear()}${String(grnCount).padStart(5, '0')}`

    // Calculate totals
    const totalQuantity = validatedItems.reduce((sum, i) => sum + i.quantity, 0)
    const totalValue = validatedItems.reduce((sum, i) => sum + i.totalCost, 0)

    const grn = {
      id: uuidv4(),
      clientId: user.clientId,
      grnNumber,
      warehouseId,
      warehouseName: warehouse.name,
      vendorId: vendorId || null,
      vendorName: vendorName || null,
      purchaseOrderNumber: purchaseOrderNumber || null,
      invoiceNumber: invoiceNumber || null,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      items: validatedItems,
      totalQuantity,
      totalValue,
      status: 'draft',
      notes: notes || '',
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      statusHistory: [{
        status: 'draft',
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: 'GRN created'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await grnCollection.insertOne(grn)
    return successResponse(sanitizeDocument(grn), 201)
  } catch (error) {
    console.error('GRN POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create GRN', 500, error.message)
  }
}

// PUT - Update GRN status (receive goods)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, notes } = body

    if (!id) return errorResponse('GRN ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const grnCollection = db.collection('wf_inventory_grn')
    const movementCollection = db.collection('wf_inventory_movements')
    const stockCollection = db.collection('wf_inventory_stock')
    const batchCollection = db.collection('wf_inventory_batches')
    const productCollection = db.collection('wf_inventory')

    const grn = await grnCollection.findOne({ id })
    if (!grn) return errorResponse('GRN not found', 404)

    let updateData = { updatedAt: new Date() }
    let newStatus = grn.status

    switch (action) {
      case 'receive':
        if (grn.status !== 'draft') {
          return errorResponse('Only draft GRNs can be received', 400)
        }

        // Create stock movements for each item
        for (const item of grn.items) {
          // Create goods receipt movement
          const movementCount = await movementCollection.countDocuments({}) + 1
          const movement = {
            id: uuidv4(),
            clientId: user.clientId,
            movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
            movementType: 'goods_receipt',
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            warehouseId: grn.warehouseId,
            warehouseName: grn.warehouseName,
            quantity: item.quantity,
            quantityChange: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            batchNumber: item.batchNumber,
            lotNumber: item.lotNumber,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
            referenceType: 'grn',
            referenceId: grn.id,
            referenceNumber: grn.grnNumber,
            vendorId: grn.vendorId,
            vendorName: grn.vendorName,
            notes: `GRN: ${grn.grnNumber}${grn.invoiceNumber ? ` | Invoice: ${grn.invoiceNumber}` : ''}`,
            createdBy: user.id,
            createdByName: user.name || user.email,
            createdAt: new Date()
          }

          // Get or create stock record
          let stock = await stockCollection.findOne({ productId: item.productId, warehouseId: grn.warehouseId })
          const product = await productCollection.findOne({ id: item.productId })
          
          if (!stock) {
            stock = {
              id: uuidv4(),
              clientId: user.clientId,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              category: product?.category,
              warehouseId: grn.warehouseId,
              warehouseName: grn.warehouseName,
              quantity: 0,
              reservedQty: 0,
              avgCostPrice: item.unitCost,
              lastCostPrice: item.unitCost,
              sellingPrice: product?.sellingPrice || 0,
              reorderLevel: product?.reorderLevel || 10,
              safetyStock: 5,
              maxStock: 1000,
              unit: product?.unit || 'sqft',
              createdAt: new Date(),
              updatedAt: new Date()
            }
            await stockCollection.insertOne(stock)
          }

          movement.stockBefore = stock.quantity
          movement.stockAfter = stock.quantity + item.quantity

          // Calculate new weighted average cost
          const totalValue = (stock.quantity * stock.avgCostPrice) + (item.quantity * item.unitCost)
          const newTotalQty = stock.quantity + item.quantity
          const newAvgCost = newTotalQty > 0 ? totalValue / newTotalQty : item.unitCost

          // Update stock
          await stockCollection.updateOne(
            { productId: item.productId, warehouseId: grn.warehouseId },
            {
              $inc: { quantity: item.quantity },
              $set: {
                availableQty: (stock.quantity + item.quantity) - (stock.reservedQty || 0),
                avgCostPrice: newAvgCost,
                lastCostPrice: item.unitCost,
                lastMovementDate: new Date(),
                updatedAt: new Date()
              }
            }
          )

          await movementCollection.insertOne(movement)

          // Create batch record if batch/lot number provided
          if (item.batchNumber || item.lotNumber) {
            const batch = {
              id: uuidv4(),
              clientId: user.clientId,
              productId: item.productId,
              productName: item.productName,
              warehouseId: grn.warehouseId,
              warehouseName: grn.warehouseName,
              batchNumber: item.batchNumber || item.lotNumber,
              lotNumber: item.lotNumber,
              quantity: item.quantity,
              originalQuantity: item.quantity,
              unitCost: item.unitCost,
              manufacturingDate: item.manufacturingDate,
              expiryDate: item.expiryDate,
              receivedDate: new Date(),
              grnId: grn.id,
              grnNumber: grn.grnNumber,
              vendorId: grn.vendorId,
              vendorName: grn.vendorName,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            }
            await batchCollection.insertOne(batch)
          }
        }

        newStatus = 'received'
        updateData.receivedDate = updateData.receivedDate || new Date()
        updateData.receivedBy = user.id
        updateData.receivedByName = user.name || user.email
        break

      case 'cancel':
        if (grn.status === 'received') {
          return errorResponse('Cannot cancel a received GRN', 400)
        }
        newStatus = 'cancelled'
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
      ...grn.statusHistory,
      {
        status: newStatus,
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: notes || `Status changed to ${newStatus}`
      }
    ]

    const result = await grnCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('GRN PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update GRN', 500, error.message)
  }
}

// DELETE - Delete draft GRN
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('GRN ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const grnCollection = db.collection('wf_inventory_grn')

    const grn = await grnCollection.findOne({ id })
    if (!grn) return errorResponse('GRN not found', 404)
    if (grn.status !== 'draft') {
      return errorResponse('Only draft GRNs can be deleted', 400)
    }

    await grnCollection.deleteOne({ id })
    return successResponse({ message: 'GRN deleted successfully' })
  } catch (error) {
    console.error('GRN DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete GRN', 500, error.message)
  }
}
