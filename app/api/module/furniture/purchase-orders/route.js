import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate PO number
const generatePONumber = async (db) => {
  const pos = db.collection('furniture_purchase_orders')
  const count = await pos.countDocuments() + 1
  const year = new Date().getFullYear()
  return `PO-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch purchase orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pos = db.collection('furniture_purchase_orders')

    if (id) {
      const po = await pos.findOne({ id })
      if (!po) return errorResponse('Purchase order not found', 404)
      
      // Get supplier details
      const supplier = await db.collection('furniture_suppliers').findOne({ id: po.supplierId })
      
      return successResponse({ ...sanitizeDocument(po), supplier })
    }

    const query = { isActive: true }
    if (supplierId) query.supplierId = supplierId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts] = await Promise.all([
      pos.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      pos.countDocuments(query),
      pos.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } }
      ]).toArray()
    ])

    return successResponse({
      purchaseOrders: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, value: s.value } }), {})
    })
  } catch (error) {
    console.error('Furniture PO GET Error:', error)
    return errorResponse('Failed to fetch purchase orders', 500, error.message)
  }
}

// POST - Create purchase order
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pos = db.collection('furniture_purchase_orders')
    const suppliers = db.collection('furniture_suppliers')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const poId = uuidv4()
    const poNumber = await generatePONumber(db)

    // Get supplier info
    let supplierInfo = {}
    if (body.supplierId) {
      const supplier = await suppliers.findOne({ id: body.supplierId })
      if (supplier) {
        supplierInfo = {
          supplierName: supplier.name,
          supplierEmail: supplier.email,
          supplierPhone: supplier.phone,
          supplierAddress: supplier.address
        }
      }
    }

    // Calculate totals
    const items = body.items || []
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const taxAmount = body.taxRate ? (subtotal * body.taxRate / 100) : 0
    const totalAmount = subtotal + taxAmount - (body.discount || 0)

    const po = {
      id: poId,
      poNumber,
      supplierId: body.supplierId,
      ...supplierInfo,
      // Order details
      items: items.map((item, idx) => ({
        id: uuidv4(),
        lineNumber: idx + 1,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        description: item.description || '',
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure || 'piece',
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        receivedQty: 0,
        pendingQty: item.quantity
      })),
      // Amounts
      subtotal,
      taxRate: body.taxRate || 0,
      taxAmount,
      discount: body.discount || 0,
      totalAmount,
      // Dates
      orderDate: body.orderDate || now,
      expectedDelivery: body.expectedDelivery || null,
      // Delivery
      deliveryAddress: body.deliveryAddress || {},
      warehouseId: body.warehouseId || null,
      // Payment
      paymentTerms: body.paymentTerms || 'net_30',
      // Status
      status: 'draft', // draft, sent, acknowledged, partial, received, closed, cancelled
      // Linked entities
      linkedRequirementId: body.linkedRequirementId || null,
      linkedWorkOrderId: body.linkedWorkOrderId || null,
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      // Tracking
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Purchase order created'
      }],
      receiptHistory: [],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await pos.insertOne(po)

    await events.insertOne({
      id: uuidv4(),
      type: 'purchase_order.created',
      entityType: 'purchase_order',
      entityId: poId,
      data: { poNumber, supplier: supplierInfo.supplierName, totalAmount },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(po), 201)
  } catch (error) {
    console.error('Furniture PO POST Error:', error)
    return errorResponse('Failed to create purchase order', 500, error.message)
  }
}

// PUT - Update purchase order
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('PO ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pos = db.collection('furniture_purchase_orders')
    const events = db.collection('furniture_events')

    const po = await pos.findOne({ id })
    if (!po) return errorResponse('Purchase order not found', 404)

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'send') {
      if (po.status !== 'draft') {
        return errorResponse('Can only send draft orders', 400)
      }

      await pos.updateOne(
        { id },
        {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'sent',
              timestamp: now,
              by: user.id,
              notes: 'Purchase order sent to supplier'
            }
          }
        }
      )

      return successResponse({ message: 'PO sent', status: 'sent' })
    }

    if (action === 'receive') {
      const { itemId, receivedQty, batchNumber, notes } = body

      const itemIndex = po.items.findIndex(i => i.id === itemId)
      if (itemIndex === -1) return errorResponse('Item not found', 404)

      const item = po.items[itemIndex]
      const newReceivedQty = (item.receivedQty || 0) + receivedQty
      const newPendingQty = item.quantity - newReceivedQty

      po.items[itemIndex] = {
        ...item,
        receivedQty: newReceivedQty,
        pendingQty: newPendingQty
      }

      // Check if all items received
      const allReceived = po.items.every(i => i.receivedQty >= i.quantity)
      const partialReceived = po.items.some(i => i.receivedQty > 0)

      const newStatus = allReceived ? 'received' : (partialReceived ? 'partial' : po.status)

      await pos.updateOne(
        { id },
        {
          $set: { items: po.items, status: newStatus, updatedAt: now },
          $push: {
            receiptHistory: {
              id: uuidv4(),
              itemId,
              quantity: receivedQty,
              batchNumber: batchNumber || null,
              receivedAt: now,
              receivedBy: user.id,
              notes: notes || ''
            },
            statusHistory: newStatus !== po.status ? {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: allReceived ? 'All items received' : 'Partial receipt recorded'
            } : null
          }
        }
      )

      // Update stock if we have a warehouse
      if (po.warehouseId) {
        const stockLedger = db.collection('furniture_stock_ledger')
        const material = po.items[itemIndex]

        await stockLedger.updateOne(
          { materialId: material.materialId, warehouseId: po.warehouseId },
          {
            $inc: { quantity: receivedQty },
            $set: { updatedAt: now },
            $setOnInsert: {
              id: uuidv4(),
              materialId: material.materialId,
              materialCode: material.materialCode,
              materialName: material.materialName,
              warehouseId: po.warehouseId,
              avgCost: material.unitPrice,
              createdAt: now
            }
          },
          { upsert: true }
        )
      }

      return successResponse({ message: 'Receipt recorded', status: newStatus })
    }

    if (action === 'cancel') {
      if (['received', 'closed', 'cancelled'].includes(po.status)) {
        return errorResponse('Cannot cancel this order', 400)
      }

      await pos.updateOne(
        { id },
        {
          $set: { status: 'cancelled', cancelledAt: now, cancelReason: body.reason || '', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'cancelled',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Order cancelled'
            }
          }
        }
      )

      return successResponse({ message: 'PO cancelled', status: 'cancelled' })
    }

    // Regular update (only for draft orders)
    if (po.status !== 'draft') {
      return errorResponse('Can only edit draft orders', 400)
    }

    updateData.updatedAt = now
    updateData.updatedBy = user.id

    // Recalculate totals if items changed
    if (updateData.items) {
      const subtotal = updateData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const taxAmount = (updateData.taxRate || po.taxRate || 0) * subtotal / 100
      updateData.subtotal = subtotal
      updateData.taxAmount = taxAmount
      updateData.totalAmount = subtotal + taxAmount - (updateData.discount || po.discount || 0)
    }

    const result = await pos.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture PO PUT Error:', error)
    return errorResponse('Failed to update purchase order', 500, error.message)
  }
}

// DELETE - Delete purchase order
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('PO ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pos = db.collection('furniture_purchase_orders')

    const po = await pos.findOne({ id })
    if (!po) return errorResponse('Purchase order not found', 404)

    if (po.status !== 'draft') {
      return errorResponse('Can only delete draft orders', 400)
    }

    await pos.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Purchase order deleted' })
  } catch (error) {
    console.error('Furniture PO DELETE Error:', error)
    return errorResponse('Failed to delete purchase order', 500, error.message)
  }
}
