import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch sales orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')
    const quoteId = searchParams.get('quoteId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_orders')
    
    let query = {}
    if (orderId) query.id = orderId
    if (quoteId) query.quoteId = quoteId
    if (status) query.status = status

    const orders = await collection.find(query).sort({ createdAt: -1 }).toArray()

    // Include payments if single order
    if (orderId && orders.length > 0) {
      const paymentsCollection = db.collection('dw_payments')
      const payments = await paymentsCollection.find({ orderId }).toArray()
      orders[0].payments = sanitizeDocuments(payments)
    }

    const stats = {
      total: orders.length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      inProduction: orders.filter(o => o.status === 'in-production').length,
      dispatched: orders.filter(o => o.status === 'dispatched').length,
      installed: orders.filter(o => o.status === 'installed').length,
      totalValue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
      pendingPayment: orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0)
    }

    return successResponse({ orders: sanitizeDocuments(orders), stats })
  } catch (error) {
    console.error('DW Orders GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch orders', 500, error.message)
  }
}

// POST - Create order from quote or record payment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Record payment
    if (action === 'record-payment') {
      const paymentsCollection = db.collection('dw_payments')
      const ordersCollection = db.collection('dw_orders')

      const payment = {
        id: uuidv4(),
        orderId: body.orderId,
        clientId: user.clientId,
        
        milestone: body.milestone || '', // advance, mid, before-dispatch, after-installation
        amount: parseFloat(body.amount) || 0,
        paymentMethod: body.paymentMethod || 'bank-transfer',
        referenceNumber: body.referenceNumber || '',
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        notes: body.notes || '',
        
        status: 'confirmed',
        recordedBy: user.id,
        createdAt: new Date()
      }

      await paymentsCollection.insertOne(payment)

      // Update order paid amount
      const order = await ordersCollection.findOne({ id: body.orderId })
      if (order) {
        const totalPaid = (order.paidAmount || 0) + payment.amount
        const balance = (order.grandTotal || 0) - totalPaid
        
        await ordersCollection.updateOne(
          { id: body.orderId },
          {
            $set: {
              paidAmount: totalPaid,
              balanceAmount: balance,
              paymentStatus: balance <= 0 ? 'paid' : 'partial',
              updatedAt: new Date()
            }
          }
        )
      }

      return successResponse(sanitizeDocument(payment), 201)
    }

    // Convert quote to order
    if (action === 'convert-quote') {
      const quotesCollection = db.collection('dw_quotations')
      const quoteItemsCollection = db.collection('dw_quote_items')
      const ordersCollection = db.collection('dw_orders')

      const quote = await quotesCollection.findOne({ id: body.quoteId })
      if (!quote) return errorResponse('Quotation not found', 404)

      const quoteItems = await quoteItemsCollection.find({ quoteId: body.quoteId }).toArray()

      const order = {
        id: uuidv4(),
        clientId: user.clientId,
        orderNumber: `SO-${Date.now()}`,
        
        // Link to quote
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        surveyId: quote.surveyId,
        leadId: quote.leadId,
        projectId: quote.projectId,
        
        // Customer
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerEmail: quote.customerEmail,
        siteAddress: quote.siteAddress,
        
        // Amounts
        subtotal: quote.subtotal,
        totalDiscount: quote.totalDiscount,
        totalTax: quote.totalTax,
        fabricationCharge: quote.fabricationCharge,
        installationCharge: quote.installationCharge,
        transportCharge: quote.transportCharge,
        scaffoldingCharge: quote.scaffoldingCharge,
        grandTotal: quote.grandTotal + (quote.fabricationCharge || 0) + (quote.installationCharge || 0) + (quote.transportCharge || 0) + (quote.scaffoldingCharge || 0),
        
        // Payment tracking
        paidAmount: 0,
        balanceAmount: quote.grandTotal + (quote.fabricationCharge || 0) + (quote.installationCharge || 0) + (quote.transportCharge || 0) + (quote.scaffoldingCharge || 0),
        paymentStatus: 'pending', // pending, partial, paid
        
        // Payment milestones
        paymentMilestones: body.paymentMilestones || [
          { name: 'Advance', percent: 50, amount: 0, status: 'pending' },
          { name: 'Before Dispatch', percent: 40, amount: 0, status: 'pending' },
          { name: 'After Installation', percent: 10, amount: 0, status: 'pending' }
        ],
        
        // Items count
        itemsCount: quoteItems.length,
        totalArea: quote.totalArea,
        
        // Status
        status: 'confirmed', // confirmed, in-production, ready, dispatched, installed, completed, cancelled
        
        // Dates
        orderDate: new Date(),
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        actualDelivery: null,
        
        // Notes
        internalNotes: body.internalNotes || '',
        customerNotes: body.customerNotes || '',
        
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Calculate milestone amounts
      order.paymentMilestones = order.paymentMilestones.map(m => ({
        ...m,
        amount: order.grandTotal * (m.percent / 100)
      }))

      await ordersCollection.insertOne(order)

      // Update quote status
      await quotesCollection.updateOne(
        { id: body.quoteId },
        { $set: { status: 'converted', convertedToOrderId: order.id, updatedAt: new Date() } }
      )

      return successResponse(sanitizeDocument(order), 201)
    }

    // Create manual order
    const collection = db.collection('dw_orders')

    const order = {
      id: uuidv4(),
      clientId: user.clientId,
      orderNumber: `SO-${Date.now()}`,
      
      quoteId: body.quoteId || null,
      surveyId: body.surveyId || null,
      leadId: body.leadId || null,
      projectId: body.projectId || null,
      
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      siteAddress: body.siteAddress || '',
      
      subtotal: parseFloat(body.subtotal) || 0,
      totalDiscount: parseFloat(body.totalDiscount) || 0,
      totalTax: parseFloat(body.totalTax) || 0,
      fabricationCharge: parseFloat(body.fabricationCharge) || 0,
      installationCharge: parseFloat(body.installationCharge) || 0,
      transportCharge: parseFloat(body.transportCharge) || 0,
      grandTotal: parseFloat(body.grandTotal) || 0,
      
      paidAmount: 0,
      balanceAmount: parseFloat(body.grandTotal) || 0,
      paymentStatus: 'pending',
      paymentMilestones: body.paymentMilestones || [],
      
      itemsCount: parseInt(body.itemsCount) || 0,
      totalArea: parseFloat(body.totalArea) || 0,
      
      status: 'confirmed',
      orderDate: new Date(),
      expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
      
      internalNotes: body.internalNotes || '',
      customerNotes: body.customerNotes || '',
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(order)
    return successResponse(sanitizeDocument(order), 201)
  } catch (error) {
    console.error('DW Orders POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create order', 500, error.message)
  }
}

// PUT - Update order status
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_orders')

    // Update status with timestamp
    if (action === 'update-status') {
      const statusTimestamps = {
        'in-production': 'productionStartedAt',
        'ready': 'readyAt',
        'dispatched': 'dispatchedAt',
        'installed': 'installedAt',
        'completed': 'completedAt',
        'cancelled': 'cancelledAt'
      }

      const updateFields = {
        status: updates.status,
        updatedAt: new Date()
      }

      if (statusTimestamps[updates.status]) {
        updateFields[statusTimestamps[updates.status]] = new Date()
      }

      const result = await collection.findOneAndUpdate(
        { id },
        { $set: updateFields },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Order not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Regular update
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Order not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Orders PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update order', 500, error.message)
  }
}

// DELETE - Cancel order
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_orders')
    
    // Soft delete / cancel
    const result = await collection.findOneAndUpdate(
      { id },
      { 
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: user.id,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Order not found', 404)
    return successResponse({ message: 'Order cancelled successfully' })
  } catch (error) {
    console.error('DW Orders DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to cancel order', 500, error.message)
  }
}
