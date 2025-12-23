import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { COLLECTIONS } from '@/lib/db/flooring-collections'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// INVENTORY CHALLANS - READ-ONLY STOCK IMPACT VIEW
// =============================================
// This API provides a stock-focused view of challans
// The primary challan management is in /api/flooring/enhanced/challans
// Both use the same collection: flooring_challans (SINGLE SOURCE OF TRUTH)

// GET - Fetch Delivery Challans (Stock Impact View)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const challanId = searchParams.get('id')
    const warehouseId = searchParams.get('warehouseId')
    const projectId = searchParams.get('projectId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    // Use flooring_challans as single source of truth
    const challanCollection = db.collection(COLLECTIONS.CHALLANS)

    if (challanId) {
      const challan = await challanCollection.findOne({ id: challanId })
      if (!challan) return errorResponse('Challan not found', 404)
      return successResponse(sanitizeDocument(challan))
    }

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (projectId) query.projectId = projectId
    if (customerId) query.customerId = customerId
    if (status) query.status = status

    const challans = await challanCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Summary
    const summary = {
      total: challans.length,
      draft: challans.filter(c => c.status === 'draft').length,
      dispatched: challans.filter(c => c.status === 'dispatched').length,
      delivered: challans.filter(c => c.status === 'delivered').length,
      totalValue: challans.reduce((sum, c) => sum + (c.totalValue || 0), 0)
    }

    return successResponse({ challans: sanitizeDocuments(challans), summary })
  } catch (error) {
    console.error('Challan GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch challans', 500, error.message)
  }
}

// POST - Create new Delivery Challan
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      warehouseId,
      projectId,
      projectName,
      customerId,
      customerName,
      deliveryAddress,
      contactPerson,
      contactPhone,
      items,
      vehicleNumber,
      driverName,
      driverPhone,
      notes,
      expectedDeliveryDate
    } = body

    if (!warehouseId) return errorResponse('Warehouse is required', 400)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('At least one item is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('wf_inventory_challans')
    const warehouseCollection = db.collection('wf_warehouses')
    const stockCollection = db.collection('wf_inventory_stock')
    // Check both product collections - flooring_products is the primary catalog
    const flooringProductsCollection = db.collection('flooring_products')
    const wfInventoryCollection = db.collection('wf_inventory')

    // Verify warehouse
    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    // Validate items and check stock availability
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

      const stock = await stockCollection.findOne({ productId: item.productId, warehouseId })
      const availableQty = stock ? (stock.quantity - (stock.reservedQty || 0)) : 0

      if (availableQty < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}. Available: ${availableQty}`, 400)
      }

      // Get price from product pricing structure or stock
      const productPrice = product.pricing?.sellingPrice || product.sellingPrice || stock?.sellingPrice || 0
      
      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: parseFloat(item.quantity),
        unitPrice: item.unitPrice || productPrice,
        totalPrice: parseFloat(item.quantity) * (item.unitPrice || productPrice),
        batchNumber: item.batchNumber || null,
        notes: item.notes || ''
      })
    }

    // Generate Challan number
    const challanCount = await challanCollection.countDocuments({}) + 1
    const challanNumber = `DC-${new Date().getFullYear()}${String(challanCount).padStart(5, '0')}`

    // Calculate totals
    const totalQuantity = validatedItems.reduce((sum, i) => sum + i.quantity, 0)
    const totalValue = validatedItems.reduce((sum, i) => sum + i.totalPrice, 0)

    const challan = {
      id: uuidv4(),
      clientId: user.clientId,
      challanNumber,
      warehouseId,
      warehouseName: warehouse.name,
      projectId: projectId || null,
      projectName: projectName || null,
      customerId: customerId || null,
      customerName: customerName || null,
      deliveryAddress: deliveryAddress || '',
      contactPerson: contactPerson || '',
      contactPhone: contactPhone || '',
      items: validatedItems,
      totalQuantity,
      totalValue,
      vehicleNumber: vehicleNumber || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      status: 'draft',
      notes: notes || '',
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      statusHistory: [{
        status: 'draft',
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: 'Delivery Challan created'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await challanCollection.insertOne(challan)
    return successResponse(sanitizeDocument(challan), 201)
  } catch (error) {
    console.error('Challan POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create challan', 500, error.message)
  }
}

// PUT - Update Challan status
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, notes, deliveryProof, receivedBy } = body

    if (!id) return errorResponse('Challan ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('wf_inventory_challans')
    const movementCollection = db.collection('wf_inventory_movements')
    const stockCollection = db.collection('wf_inventory_stock')
    const stockLedger = db.collection('wf_stock_ledger') // Stock Ledger for double-entry

    const challan = await challanCollection.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)

    let updateData = { updatedAt: new Date() }
    let newStatus = challan.status

    switch (action) {
      case 'dispatch':
        if (challan.status !== 'draft') {
          return errorResponse('Only draft challans can be dispatched', 400)
        }

        // Create goods issue movements, ledger entries, and update stock
        for (const item of challan.items) {
          const stock = await stockCollection.findOne({ 
            productId: item.productId, 
            warehouseId: challan.warehouseId 
          })

          if (!stock || stock.quantity < item.quantity) {
            return errorResponse(`Insufficient stock for ${item.productName}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}`, 400)
          }

          // Create goods issue movement
          const movementCount = await movementCollection.countDocuments({}) + 1
          const movement = {
            id: uuidv4(),
            clientId: user.clientId,
            movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
            movementType: 'goods_issue',
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            warehouseId: challan.warehouseId,
            warehouseName: challan.warehouseName,
            quantity: item.quantity,
            quantityChange: -item.quantity,
            unitCost: stock.avgCostPrice || stock.avgCost || 0,
            totalCost: item.quantity * (stock.avgCostPrice || stock.avgCost || 0),
            referenceType: 'delivery_challan',
            referenceId: challan.id,
            referenceNumber: challan.challanNumber,
            notes: `Delivery to ${challan.customerName || challan.projectName || 'Customer'}`,
            stockBefore: stock.quantity,
            stockAfter: stock.quantity - item.quantity,
            createdBy: user.id,
            createdByName: user.name || user.email,
            createdAt: new Date()
          }

          await movementCollection.insertOne(movement)

          // ========================================
          // CREATE STOCK LEDGER ENTRY (DOUBLE-ENTRY)
          // ========================================
          const ledgerSequence = await stockLedger
            .find({ productId: item.productId, warehouseId: challan.warehouseId })
            .sort({ sequence: -1 })
            .limit(1)
            .toArray()
          const nextSequence = (ledgerSequence[0]?.sequence || 0) + 1

          const avgCost = stock.avgCostPrice || stock.avgCost || 0
          const ledgerEntry = {
            id: uuidv4(),
            sequence: nextSequence,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            warehouseId: challan.warehouseId,
            warehouseName: challan.warehouseName,
            movementType: 'challan_dispatch',
            movementLabel: 'Challan Dispatch',
            direction: 'OUT',
            quantity: item.quantity,
            unit: 'sqft',
            quantityChange: -item.quantity,
            balanceBefore: stock.quantity,
            balanceAfter: stock.quantity - item.quantity,
            unitCost: avgCost,
            totalValue: item.quantity * avgCost,
            avgCostBefore: avgCost,
            avgCostAfter: avgCost, // Cost stays same on OUT
            refDocType: 'challan',
            refDocId: challan.id,
            refDocNumber: challan.challanNumber,
            customerId: challan.customerId,
            customerName: challan.customerName,
            projectId: challan.projectId,
            projectName: challan.projectName,
            notes: `Challan Dispatch - ${challan.challanNumber} to ${challan.customerName || challan.projectName || 'Customer'}`,
            createdBy: user.id,
            createdByName: user.name || user.email,
            createdAt: new Date().toISOString(),
            status: 'posted',
            posted: true,
            postedAt: new Date().toISOString()
          }
          await stockLedger.insertOne(ledgerEntry)
          // ========================================

          // Update stock
          await stockCollection.updateOne(
            { productId: item.productId, warehouseId: challan.warehouseId },
            {
              $inc: { quantity: -item.quantity },
              $set: {
                availableQty: (stock.quantity - item.quantity) - (stock.reservedQty || 0),
                lastMovementDate: new Date(),
                lastLedgerEntryId: ledgerEntry.id,
                updatedAt: new Date()
              }
            }
          )
        }

        newStatus = 'dispatched'
        updateData.dispatchedAt = new Date()
        updateData.dispatchedBy = user.id
        updateData.dispatchedByName = user.name || user.email
        updateData.ledgerEntriesCreated = true
        break

      case 'deliver':
        if (challan.status !== 'dispatched') {
          return errorResponse('Only dispatched challans can be marked as delivered', 400)
        }
        newStatus = 'delivered'
        updateData.deliveredAt = new Date()
        updateData.deliveredBy = user.id
        updateData.deliveryProof = deliveryProof || null
        updateData.receivedBy = receivedBy || null
        break

      case 'cancel':
        if (challan.status === 'delivered') {
          return errorResponse('Cannot cancel a delivered challan', 400)
        }
        
        // If already dispatched, reverse the stock movements and create reversal ledger entries
        if (challan.status === 'dispatched') {
          for (const item of challan.items) {
            const stock = await stockCollection.findOne({ 
              productId: item.productId, 
              warehouseId: challan.warehouseId 
            })
            const currentQty = stock?.quantity || 0
            const avgCost = stock?.avgCostPrice || stock?.avgCost || 0

            await stockCollection.updateOne(
              { productId: item.productId, warehouseId: challan.warehouseId },
              {
                $inc: { quantity: item.quantity },
                $set: { updatedAt: new Date() }
              }
            )

            // Create reversal movement
            const movementCount = await movementCollection.countDocuments({}) + 1
            const movement = {
              id: uuidv4(),
              clientId: user.clientId,
              movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
              movementType: 'return_in',
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              warehouseId: challan.warehouseId,
              warehouseName: challan.warehouseName,
              quantity: item.quantity,
              quantityChange: item.quantity,
              referenceType: 'delivery_challan_cancel',
              referenceId: challan.id,
              referenceNumber: challan.challanNumber,
              notes: `Challan cancelled - stock returned`,
              createdBy: user.id,
              createdByName: user.name || user.email,
              createdAt: new Date()
            }
            await movementCollection.insertOne(movement)

            // Create reversal ledger entry
            const ledgerSequence = await stockLedger
              .find({ productId: item.productId, warehouseId: challan.warehouseId })
              .sort({ sequence: -1 })
              .limit(1)
              .toArray()
            const nextSequence = (ledgerSequence[0]?.sequence || 0) + 1

            const reversalLedgerEntry = {
              id: uuidv4(),
              sequence: nextSequence,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              warehouseId: challan.warehouseId,
              warehouseName: challan.warehouseName,
              movementType: 'challan_dispatch_reversal',
              movementLabel: 'Challan Dispatch (Reversal)',
              direction: 'IN',
              quantity: item.quantity,
              unit: 'sqft',
              quantityChange: item.quantity,
              balanceBefore: currentQty,
              balanceAfter: currentQty + item.quantity,
              unitCost: avgCost,
              totalValue: item.quantity * avgCost,
              avgCostBefore: avgCost,
              avgCostAfter: avgCost,
              refDocType: 'challan_reversal',
              refDocId: challan.id,
              refDocNumber: `REV-${challan.challanNumber}`,
              notes: `Reversal - Challan ${challan.challanNumber} cancelled`,
              createdBy: user.id,
              createdByName: user.name || user.email,
              createdAt: new Date().toISOString(),
              status: 'posted',
              posted: true,
              postedAt: new Date().toISOString()
            }
            await stockLedger.insertOne(reversalLedgerEntry)
          }
        }

        newStatus = 'cancelled'
        updateData.cancelledAt = new Date()
        updateData.cancelledBy = user.id
        updateData.cancellationReason = notes || ''
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    // Update status and history
    updateData.status = newStatus
    updateData.statusHistory = [
      ...challan.statusHistory,
      {
        status: newStatus,
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: notes || `Status changed to ${newStatus}`
      }
    ]

    const result = await challanCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Challan PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update challan', 500, error.message)
  }
}

// DELETE - Delete draft challan
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Challan ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('wf_inventory_challans')

    const challan = await challanCollection.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)
    if (challan.status !== 'draft') {
      return errorResponse('Only draft challans can be deleted', 400)
    }

    await challanCollection.deleteOne({ id })
    return successResponse({ message: 'Challan deleted successfully' })
  } catch (error) {
    console.error('Challan DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete challan', 500, error.message)
  }
}
