import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

// Cycle Count Status
const CYCLE_COUNT_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch cycle counts
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const cycleCountId = searchParams.get('id')
    const warehouseId = searchParams.get('warehouseId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const cycleCountCollection = db.collection('wf_inventory_cycle_counts')

    if (cycleCountId) {
      const cycleCount = await cycleCountCollection.findOne({ id: cycleCountId })
      if (!cycleCount) return errorResponse('Cycle count not found', 404)
      return successResponse(sanitizeDocument(cycleCount))
    }

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (status) query.status = status

    const cycleCounts = await cycleCountCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Summary
    const summary = {
      total: cycleCounts.length,
      draft: cycleCounts.filter(c => c.status === 'draft').length,
      inProgress: cycleCounts.filter(c => c.status === 'in_progress').length,
      pendingApproval: cycleCounts.filter(c => c.status === 'pending_approval').length,
      completed: cycleCounts.filter(c => c.status === 'completed').length
    }

    return successResponse({ cycleCounts: sanitizeDocuments(cycleCounts), summary })
  } catch (error) {
    console.error('Cycle Count GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch cycle counts', 500, error.message)
  }
}

// POST - Create new cycle count
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { warehouseId, countType, productIds, notes, scheduledDate } = body

    if (!warehouseId) {
      return errorResponse('Warehouse is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const cycleCountCollection = db.collection('wf_inventory_cycle_counts')
    const stockCollection = db.collection('wf_inventory_stock')
    const warehouseCollection = db.collection('wf_warehouses')

    // Verify warehouse
    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    // Get products to count
    let stockQuery = { warehouseId }
    if (productIds && productIds.length > 0) {
      stockQuery.productId = { $in: productIds }
    }

    const stocks = await stockCollection.find(stockQuery).toArray()

    if (stocks.length === 0) {
      return errorResponse('No products found in this warehouse to count', 400)
    }

    // Create count items
    const countItems = stocks.map(stock => ({
      productId: stock.productId,
      productName: stock.productName,
      sku: stock.sku,
      systemQuantity: stock.quantity || 0,
      countedQuantity: null,
      variance: null,
      varianceValue: null,
      avgCostPrice: stock.avgCostPrice || 0,
      notes: '',
      countedAt: null,
      countedBy: null
    }))

    // Generate cycle count number
    const countNumber = await cycleCountCollection.countDocuments({}) + 1
    const cycleCountNumber = `CC-${new Date().getFullYear()}${String(countNumber).padStart(5, '0')}`

    const cycleCount = {
      id: uuidv4(),
      clientId: user.clientId,
      cycleCountNumber,
      warehouseId,
      warehouseName: warehouse.name,
      countType: countType || 'full', // full, partial, abc
      status: CYCLE_COUNT_STATUS.DRAFT,
      items: countItems,
      totalItems: countItems.length,
      countedItems: 0,
      totalSystemQty: countItems.reduce((sum, i) => sum + i.systemQuantity, 0),
      totalCountedQty: 0,
      totalVariance: 0,
      totalVarianceValue: 0,
      notes: notes || '',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      statusHistory: [{
        status: CYCLE_COUNT_STATUS.DRAFT,
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: 'Cycle count created'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await cycleCountCollection.insertOne(cycleCount)
    return successResponse(sanitizeDocument(cycleCount), 201)
  } catch (error) {
    console.error('Cycle Count POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create cycle count', 500, error.message)
  }
}

// PUT - Update cycle count (record counts, change status)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, countedItems, notes } = body

    if (!id) return errorResponse('Cycle count ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const cycleCountCollection = db.collection('wf_inventory_cycle_counts')
    const movementCollection = db.collection('wf_inventory_movements')
    const stockCollection = db.collection('wf_inventory_stock')

    const cycleCount = await cycleCountCollection.findOne({ id })
    if (!cycleCount) return errorResponse('Cycle count not found', 404)

    let updateData = { updatedAt: new Date() }
    let newStatus = cycleCount.status

    switch (action) {
      case 'start':
        if (cycleCount.status !== CYCLE_COUNT_STATUS.DRAFT) {
          return errorResponse('Only draft cycle counts can be started', 400)
        }
        newStatus = CYCLE_COUNT_STATUS.IN_PROGRESS
        updateData.startedAt = new Date()
        updateData.startedBy = user.id
        break

      case 'record_counts':
        if (cycleCount.status !== CYCLE_COUNT_STATUS.IN_PROGRESS) {
          return errorResponse('Cycle count must be in progress to record counts', 400)
        }
        
        if (!countedItems || !Array.isArray(countedItems)) {
          return errorResponse('Counted items are required', 400)
        }

        // Update counted items
        const updatedItems = [...cycleCount.items]
        for (const counted of countedItems) {
          const itemIndex = updatedItems.findIndex(i => i.productId === counted.productId)
          if (itemIndex === -1) continue

          const countedQty = parseFloat(counted.quantity) || 0
          const systemQty = updatedItems[itemIndex].systemQuantity
          const variance = countedQty - systemQty
          const varianceValue = variance * (updatedItems[itemIndex].avgCostPrice || 0)

          updatedItems[itemIndex].countedQuantity = countedQty
          updatedItems[itemIndex].variance = variance
          updatedItems[itemIndex].varianceValue = varianceValue
          updatedItems[itemIndex].notes = counted.notes || ''
          updatedItems[itemIndex].countedAt = new Date()
          updatedItems[itemIndex].countedBy = user.id
          updatedItems[itemIndex].countedByName = user.name || user.email
        }

        updateData.items = updatedItems
        updateData.countedItems = updatedItems.filter(i => i.countedQuantity !== null).length
        updateData.totalCountedQty = updatedItems.reduce((sum, i) => sum + (i.countedQuantity || 0), 0)
        updateData.totalVariance = updatedItems.reduce((sum, i) => sum + (i.variance || 0), 0)
        updateData.totalVarianceValue = updatedItems.reduce((sum, i) => sum + (i.varianceValue || 0), 0)
        break

      case 'submit_for_approval':
        if (cycleCount.status !== CYCLE_COUNT_STATUS.IN_PROGRESS) {
          return errorResponse('Cycle count must be in progress to submit', 400)
        }
        
        // Check all items are counted
        const uncountedItems = cycleCount.items.filter(i => i.countedQuantity === null)
        if (uncountedItems.length > 0) {
          return errorResponse(`${uncountedItems.length} items not yet counted`, 400)
        }

        newStatus = CYCLE_COUNT_STATUS.PENDING_APPROVAL
        updateData.submittedAt = new Date()
        updateData.submittedBy = user.id
        break

      case 'approve':
        if (cycleCount.status !== CYCLE_COUNT_STATUS.PENDING_APPROVAL) {
          return errorResponse('Cycle count must be pending approval', 400)
        }
        newStatus = CYCLE_COUNT_STATUS.APPROVED
        updateData.approvedAt = new Date()
        updateData.approvedBy = user.id
        break

      case 'apply_adjustments':
        if (cycleCount.status !== CYCLE_COUNT_STATUS.APPROVED) {
          return errorResponse('Cycle count must be approved to apply adjustments', 400)
        }

        // Create adjustment movements for variances
        for (const item of cycleCount.items) {
          if (item.variance === 0 || item.variance === null) continue

          const movementType = item.variance > 0 ? 'adjustment_plus' : 'adjustment_minus'
          const movementCount = await movementCollection.countDocuments({}) + 1
          const movement = {
            id: uuidv4(),
            clientId: user.clientId,
            movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
            movementType,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            warehouseId: cycleCount.warehouseId,
            warehouseName: cycleCount.warehouseName,
            quantity: Math.abs(item.variance),
            quantityChange: item.variance,
            unitCost: item.avgCostPrice,
            totalCost: Math.abs(item.variance) * item.avgCostPrice,
            referenceType: 'cycle_count',
            referenceId: cycleCount.id,
            referenceNumber: cycleCount.cycleCountNumber,
            reason: `Cycle count adjustment: ${cycleCount.cycleCountNumber}`,
            notes: item.notes || '',
            stockBefore: item.systemQuantity,
            stockAfter: item.countedQuantity,
            createdBy: user.id,
            createdByName: user.name || user.email,
            createdAt: new Date()
          }

          await movementCollection.insertOne(movement)

          // Update stock
          await stockCollection.updateOne(
            { productId: item.productId, warehouseId: cycleCount.warehouseId },
            {
              $set: {
                quantity: item.countedQuantity,
                availableQty: item.countedQuantity - (await stockCollection.findOne({ productId: item.productId, warehouseId: cycleCount.warehouseId }))?.reservedQty || 0,
                lastMovementDate: new Date(),
                updatedAt: new Date()
              }
            }
          )
        }

        newStatus = CYCLE_COUNT_STATUS.COMPLETED
        updateData.completedAt = new Date()
        updateData.completedBy = user.id
        break

      case 'cancel':
        if (cycleCount.status === CYCLE_COUNT_STATUS.COMPLETED) {
          return errorResponse('Completed cycle counts cannot be cancelled', 400)
        }
        newStatus = CYCLE_COUNT_STATUS.CANCELLED
        updateData.cancelledAt = new Date()
        updateData.cancelledBy = user.id
        updateData.cancellationReason = notes || ''
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    // Update status and history
    if (newStatus !== cycleCount.status) {
      updateData.status = newStatus
      updateData.statusHistory = [
        ...cycleCount.statusHistory,
        {
          status: newStatus,
          changedBy: user.id,
          changedByName: user.name || user.email,
          changedAt: new Date(),
          notes: notes || `Status changed to ${newStatus}`
        }
      ]
    }

    const result = await cycleCountCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Cycle Count PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update cycle count', 500, error.message)
  }
}

// DELETE - Delete draft cycle count
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Cycle count ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const cycleCountCollection = db.collection('wf_inventory_cycle_counts')

    const cycleCount = await cycleCountCollection.findOne({ id })
    if (!cycleCount) return errorResponse('Cycle count not found', 404)
    if (cycleCount.status !== CYCLE_COUNT_STATUS.DRAFT) {
      return errorResponse('Only draft cycle counts can be deleted', 400)
    }

    await cycleCountCollection.deleteOne({ id })
    return successResponse({ message: 'Cycle count deleted successfully' })
  } catch (error) {
    console.error('Cycle Count DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete cycle count', 500, error.message)
  }
}
