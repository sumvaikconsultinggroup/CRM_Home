import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orderId = searchParams.get('id')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_orders')

    if (orderId) {
      const order = await collection.findOne({ id: orderId })
      if (!order) return errorResponse('Order not found', 404)
      return successResponse(sanitizeDocument(order))
    }

    let query = {}
    if (status) query.status = status

    const orders = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      installed: orders.filter(o => o.status === 'installed').length,
      totalValue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
      paidAmount: orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0)
    }

    return successResponse({ orders: sanitizeDocuments(orders), stats })
  } catch (error) {
    console.error('Orders GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch orders', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_orders')

    let orderItems = body.items || []
    let grandTotal = body.grandTotal || 0

    if (body.quotationId) {
      const quotationsCollection = db.collection('wf_quotations')
      const quotation = await quotationsCollection.findOne({ id: body.quotationId })
      if (quotation) {
        orderItems = [
          ...quotation.lineItems.map(item => ({
            ...item,
            type: 'material'
          })),
          { name: quotation.laborDescription, quantity: 1, rate: quotation.laborCharges, total: quotation.laborCharges, type: 'labor' }
        ]
        grandTotal = quotation.grandTotal
      }
    }

    const order = {
      id: uuidv4(),
      clientId: user.clientId,
      orderNumber: `WFO-${Date.now().toString().slice(-8)}`,
      quotationId: body.quotationId || null,
      projectId: body.projectId || null,
      customerId: body.customerId,
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      deliveryAddress: body.deliveryAddress || '',
      deliveryCity: body.deliveryCity || '',
      deliveryPincode: body.deliveryPincode || '',
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      items: orderItems,
      subtotal: body.subtotal || grandTotal,
      discount: body.discount || 0,
      gstAmount: body.gstAmount || 0,
      grandTotal,
      paidAmount: parseFloat(body.advanceAmount) || 0,
      balanceAmount: grandTotal - (parseFloat(body.advanceAmount) || 0),
      payments: body.advanceAmount ? [{
        id: uuidv4(),
        amount: parseFloat(body.advanceAmount),
        method: body.paymentMethod || 'Cash',
        reference: body.paymentReference || '',
        date: new Date(),
        type: 'advance'
      }] : [],
      status: 'pending',
      installationDate: body.installationDate ? new Date(body.installationDate) : null,
      installationTeam: body.installationTeam || [],
      installationStatus: 'not_started',
      timeline: [{
        status: 'pending',
        date: new Date(),
        note: 'Order created',
        by: user.name || user.email
      }],
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(order)

    if (body.quotationId) {
      const quotationsCollection = db.collection('wf_quotations')
      await quotationsCollection.updateOne(
        { id: body.quotationId },
        { $set: { status: 'accepted', acceptedAt: new Date(), orderId: order.id } }
      )
    }

    return successResponse(sanitizeDocument(order), 201)
  } catch (error) {
    console.error('Orders POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create order', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_orders')
    const order = await collection.findOne({ id })
    
    if (!order) return errorResponse('Order not found', 404)

    if (action === 'add_payment') {
      const payment = {
        id: uuidv4(),
        amount: parseFloat(updates.amount),
        method: updates.method || 'Cash',
        reference: updates.reference || '',
        date: new Date(),
        type: updates.paymentType || 'partial'
      }
      const newPaidAmount = (order.paidAmount || 0) + payment.amount
      updates.payments = [...(order.payments || []), payment]
      updates.paidAmount = newPaidAmount
      updates.balanceAmount = order.grandTotal - newPaidAmount
      updates.timeline = [...(order.timeline || []), {
        status: order.status,
        date: new Date(),
        note: `Payment received: ₹${payment.amount}`,
        by: user.name || user.email
      }]
    }

    if (updates.status && updates.status !== order.status) {
      updates.timeline = [...(order.timeline || []), {
        status: updates.status,
        date: new Date(),
        note: `Status changed to ${updates.status}`,
        by: user.name || user.email
      }]
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Orders PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update order', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_orders')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Order not found', 404)
    return successResponse({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Orders DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete order', 500, error.message)
  }
}
