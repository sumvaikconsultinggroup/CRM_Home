import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate order number
const generateOrderNumber = async (db) => {
  const orders = db.collection('furniture_orders')
  const count = await orders.countDocuments() + 1
  const year = new Date().getFullYear()
  return `FO-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const orderType = searchParams.get('orderType')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('furniture_orders')

    if (id) {
      const order = await orders.findOne({ id })
      if (!order) return errorResponse('Order not found', 404)
      return successResponse(sanitizeDocument(order))
    }

    const query = { isActive: true }
    if (status) query.status = status
    if (orderType) query.orderType = orderType
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts] = await Promise.all([
      orders.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      orders.countDocuments(query),
      orders.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$grandTotal' } } }
      ]).toArray()
    ])

    return successResponse({
      orders: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, value: s.value } }), {})
    })
  } catch (error) {
    console.error('Furniture Orders GET Error:', error)
    return errorResponse('Failed to fetch orders', 500, error.message)
  }
}

// POST - Create order (from quotation or direct)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('furniture_orders')
    const quotes = db.collection('furniture_quotations')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const orderId = uuidv4()
    const orderNumber = await generateOrderNumber(db)

    let orderData = {}

    // Create from quotation
    if (body.quotationId) {
      const quote = await quotes.findOne({ id: body.quotationId })
      if (!quote) return errorResponse('Quotation not found', 404)
      if (quote.status !== 'accepted') {
        return errorResponse('Can only create order from accepted quotation', 400)
      }

      orderData = {
        quotationId: quote.id,
        quoteNumber: quote.quoteNumber,
        requirementId: quote.requirementId,
        projectId: quote.projectId,
        designBriefId: quote.designBriefId,
        customer: quote.customer,
        lineItems: quote.lineItems,
        subtotal: quote.subtotal,
        discountPercent: quote.discountPercent,
        discountAmount: quote.discountAmount,
        afterDiscount: quote.afterDiscount,
        taxPercent: quote.taxPercent,
        taxAmount: quote.taxAmount,
        grandTotal: quote.grandTotal,
        paymentTerms: quote.paymentTerms,
        deliveryTerms: quote.deliveryTerms,
        warrantyTerms: quote.warrantyTerms,
        terms: quote.terms
      }

      // Update quote status
      await quotes.updateOne(
        { id: body.quotationId },
        {
          $set: { status: 'converted', convertedToOrderId: orderId, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'converted',
              timestamp: now,
              by: user.id,
              notes: `Converted to Order ${orderNumber}`
            }
          }
        }
      )
    } else {
      // Direct order
      orderData = {
        customer: body.customer || {},
        lineItems: (body.lineItems || []).map((item, idx) => ({
          id: uuidv4(),
          lineNumber: idx + 1,
          ...item,
          lineTotal: (item.unitPrice || 0) * (item.quantity || 1)
        })),
        subtotal: body.subtotal || 0,
        discountPercent: body.discountPercent || 0,
        discountAmount: body.discountAmount || 0,
        afterDiscount: body.afterDiscount || 0,
        taxPercent: body.taxPercent || 18,
        taxAmount: body.taxAmount || 0,
        grandTotal: body.grandTotal || 0,
        paymentTerms: body.paymentTerms || {},
        deliveryTerms: body.deliveryTerms || '',
        warrantyTerms: body.warrantyTerms || ''
      }
    }

    const order = {
      id: orderId,
      orderNumber,
      orderType: body.orderType || 'manufacturing', // manufacturing, trading, both
      ...orderData,
      // Delivery
      deliveryAddress: body.deliveryAddress || orderData.customer?.address || '',
      expectedDelivery: body.expectedDelivery || null,
      actualDelivery: null,
      // Payment tracking
      paymentStatus: 'pending', // pending, partial, paid, refunded
      payments: [],
      totalPaid: 0,
      balanceDue: orderData.grandTotal || 0,
      // Production (for manufacturing orders)
      productionStatus: body.orderType === 'trading' ? 'na' : 'not_started',
      workOrders: [],
      // Status
      status: 'created', // created, confirmed, advance_received, in_production, ready, dispatched, delivered, installed, closed, cancelled
      priority: body.priority || 'normal',
      // Assignment
      assignedTo: body.assignedTo || user.id,
      salesPerson: body.salesPerson || user.id,
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      // Tracking
      statusHistory: [{
        status: 'created',
        timestamp: now,
        by: user.id,
        notes: body.quotationId ? `Created from quotation ${orderData.quoteNumber}` : 'Direct order created'
      }],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await orders.insertOne(order)

    await events.insertOne({
      id: uuidv4(),
      type: 'order.created',
      entityType: 'order',
      entityId: orderId,
      data: { orderNumber, grandTotal: order.grandTotal, customer: order.customer?.name },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(order), 201)
  } catch (error) {
    console.error('Furniture Orders POST Error:', error)
    return errorResponse('Failed to create order', 500, error.message)
  }
}

// PUT - Update order
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('furniture_orders')
    const events = db.collection('furniture_events')

    const order = await orders.findOne({ id })
    if (!order) return errorResponse('Order not found', 404)

    const now = new Date().toISOString()

    // Handle status changes
    if (action === 'change_status') {
      const { newStatus, notes } = body
      
      await orders.updateOne(
        { id },
        {
          $set: { status: newStatus, updatedAt: now },
          $push: {
            statusHistory: {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: notes || `Status changed to ${newStatus}`
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: `order.${newStatus}`,
        entityType: 'order',
        entityId: id,
        data: { orderNumber: order.orderNumber, previousStatus: order.status, newStatus },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Status updated', newStatus })
    }

    // Record payment
    if (action === 'record_payment') {
      const { amount, paymentMethod, reference, notes } = body

      const payment = {
        id: uuidv4(),
        amount,
        paymentMethod: paymentMethod || 'bank_transfer',
        reference: reference || '',
        notes: notes || '',
        recordedBy: user.id,
        recordedAt: now
      }

      const newTotalPaid = (order.totalPaid || 0) + amount
      const newBalanceDue = order.grandTotal - newTotalPaid
      const newPaymentStatus = newBalanceDue <= 0 ? 'paid' : (newTotalPaid > 0 ? 'partial' : 'pending')

      // Determine order status based on payment
      let newOrderStatus = order.status
      if (order.status === 'created' && newTotalPaid > 0) {
        newOrderStatus = 'advance_received'
      }

      await orders.updateOne(
        { id },
        {
          $push: { 
            payments: payment,
            statusHistory: newOrderStatus !== order.status ? {
              status: newOrderStatus,
              timestamp: now,
              by: user.id,
              notes: `Payment of ₹${amount.toLocaleString()} received`
            } : null
          },
          $set: { 
            totalPaid: newTotalPaid, 
            balanceDue: newBalanceDue, 
            paymentStatus: newPaymentStatus,
            status: newOrderStatus,
            updatedAt: now 
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'order.payment_received',
        entityType: 'order',
        entityId: id,
        data: { orderNumber: order.orderNumber, amount, totalPaid: newTotalPaid, paymentStatus: newPaymentStatus },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: 'Payment recorded', 
        payment,
        totalPaid: newTotalPaid,
        balanceDue: newBalanceDue,
        paymentStatus: newPaymentStatus
      })
    }

    // Cancel order
    if (action === 'cancel') {
      if (['delivered', 'installed', 'closed', 'cancelled'].includes(order.status)) {
        return errorResponse('Cannot cancel order in current status', 400)
      }

      await orders.updateOne(
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

      return successResponse({ message: 'Order cancelled', status: 'cancelled' })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await orders.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Orders PUT Error:', error)
    return errorResponse('Failed to update order', 500, error.message)
  }
}

// DELETE - Delete order
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('furniture_orders')

    const order = await orders.findOne({ id })
    if (!order) return errorResponse('Order not found', 404)

    if (order.status !== 'created') {
      return errorResponse('Can only delete orders that have not been processed', 400)
    }

    await orders.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Order deleted' })
  } catch (error) {
    console.error('Furniture Orders DELETE Error:', error)
    return errorResponse('Failed to delete order', 500, error.message)
  }
}
