import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate Invoice number
const generateInvoiceNumber = async (db) => {
  const invoices = db.collection('furniture_invoices')
  const count = await invoices.countDocuments() + 1
  const year = new Date().getFullYear()
  return `FINV-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch Invoices
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('furniture_invoices')

    if (id) {
      const invoice = await invoices.findOne({ id })
      if (!invoice) return errorResponse('Invoice not found', 404)
      return successResponse(sanitizeDocument(invoice))
    }

    const query = { isActive: true }
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ]
    }
    if (dateFrom || dateTo) {
      query.invoiceDate = {}
      if (dateFrom) query.invoiceDate.$gte = dateFrom
      if (dateTo) query.invoiceDate.$lte = dateTo
    }

    const items = await invoices.find(query).sort({ createdAt: -1 }).toArray()

    // Get summary stats
    const stats = await invoices.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$grandTotal' },
        paidAmount: { $sum: '$paidAmount' }
      }}
    ]).toArray()

    // Calculate totals
    const totalInvoiced = stats.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalPaid = stats.reduce((sum, s) => sum + s.paidAmount, 0)
    const totalPending = stats.filter(s => s._id !== 'paid').reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0)

    return successResponse({
      invoices: sanitizeDocuments(items),
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s }), {}),
      summary: { totalInvoiced, totalPaid, totalPending }
    })
  } catch (error) {
    console.error('Furniture Invoices GET Error:', error)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

// POST - Create Invoice
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('furniture_invoices')
    const orders = db.collection('furniture_orders')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const invoiceId = uuidv4()
    const invoiceNumber = await generateInvoiceNumber(db)

    // Get order info if creating from order
    let orderData = {}
    if (body.orderId) {
      const order = await orders.findOne({ id: body.orderId })
      if (order) {
        orderData = {
          orderNumber: order.orderNumber,
          customer: order.customer,
          lineItems: order.lineItems,
          subtotal: order.subtotal,
          discountPercent: order.discountPercent,
          discountAmount: order.discountAmount,
          taxPercent: order.taxPercent,
          taxAmount: order.taxAmount,
          grandTotal: order.grandTotal
        }
      }
    }

    const invoice = {
      id: invoiceId,
      invoiceNumber,
      invoiceType: body.invoiceType || 'final', // proforma, advance, progress, final
      // Links
      orderId: body.orderId || null,
      quotationId: body.quotationId || null,
      ...orderData,
      // Override with body data if provided
      customer: body.customer || orderData.customer || {},
      lineItems: body.lineItems || orderData.lineItems || [],
      subtotal: body.subtotal ?? orderData.subtotal ?? 0,
      discountPercent: body.discountPercent ?? orderData.discountPercent ?? 0,
      discountAmount: body.discountAmount ?? orderData.discountAmount ?? 0,
      taxPercent: body.taxPercent ?? orderData.taxPercent ?? 18,
      taxAmount: body.taxAmount ?? orderData.taxAmount ?? 0,
      grandTotal: body.grandTotal ?? orderData.grandTotal ?? 0,
      // Billing details
      billingAddress: body.billingAddress || orderData.customer?.address || {},
      shippingAddress: body.shippingAddress || body.billingAddress || {},
      // Dates
      invoiceDate: body.invoiceDate || now.split('T')[0],
      dueDate: body.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Payment
      paidAmount: 0,
      balanceDue: body.grandTotal ?? orderData.grandTotal ?? 0,
      payments: [],
      // Bank details
      bankDetails: body.bankDetails || {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountName: ''
      },
      // GST
      gstNumber: body.gstNumber || '',
      customerGstin: body.customerGstin || '',
      placeOfSupply: body.placeOfSupply || '',
      // Status
      status: 'draft', // draft, sent, partial, paid, overdue, cancelled
      // Terms
      paymentTerms: body.paymentTerms || 'Net 15',
      notes: body.notes || '',
      termsAndConditions: body.termsAndConditions || '',
      // Tracking
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Invoice created'
      }],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await invoices.insertOne(invoice)

    await events.insertOne({
      id: uuidv4(),
      type: 'invoice.created',
      entityType: 'invoice',
      entityId: invoiceId,
      data: { invoiceNumber, grandTotal: invoice.grandTotal },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Furniture Invoices POST Error:', error)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

// PUT - Update Invoice
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Invoice ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('furniture_invoices')
    const orders = db.collection('furniture_orders')
    const events = db.collection('furniture_events')

    const invoice = await invoices.findOne({ id })
    if (!invoice) return errorResponse('Invoice not found', 404)

    const now = new Date().toISOString()

    // Handle actions
    if (action === 'send') {
      if (invoice.status !== 'draft') {
        return errorResponse('Can only send draft invoices', 400)
      }

      await invoices.updateOne(
        { id },
        {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'sent',
              timestamp: now,
              by: user.id,
              notes: 'Invoice sent to customer'
            }
          }
        }
      )

      return successResponse({ message: 'Invoice sent', status: 'sent' })
    }

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

      const newPaidAmount = (invoice.paidAmount || 0) + amount
      const newBalanceDue = invoice.grandTotal - newPaidAmount
      const newStatus = newBalanceDue <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : invoice.status)

      await invoices.updateOne(
        { id },
        {
          $push: { 
            payments: payment,
            statusHistory: newStatus !== invoice.status ? {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: `Payment of ₹${amount.toLocaleString()} received`
            } : null
          },
          $set: { 
            paidAmount: newPaidAmount, 
            balanceDue: newBalanceDue, 
            status: newStatus,
            updatedAt: now 
          }
        }
      )

      // Update order payment if linked
      if (invoice.orderId) {
        await orders.updateOne(
          { id: invoice.orderId },
          {
            $inc: { totalPaid: amount },
            $set: { balanceDue: { $subtract: ['$grandTotal', { $add: ['$totalPaid', amount] }] } }
          }
        )
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'invoice.payment_received',
        entityType: 'invoice',
        entityId: id,
        data: { invoiceNumber: invoice.invoiceNumber, amount, paidAmount: newPaidAmount },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: 'Payment recorded',
        payment,
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus
      })
    }

    if (action === 'cancel') {
      if (['paid', 'cancelled'].includes(invoice.status)) {
        return errorResponse('Cannot cancel invoice in current status', 400)
      }

      await invoices.updateOne(
        { id },
        {
          $set: { status: 'cancelled', cancelledAt: now, cancelReason: body.reason || '', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'cancelled',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Invoice cancelled'
            }
          }
        }
      )

      return successResponse({ message: 'Invoice cancelled', status: 'cancelled' })
    }

    if (action === 'sync_to_crm') {
      // Push invoice data to CRM for accounting integration
      await events.insertOne({
        id: uuidv4(),
        type: 'invoice.synced_to_crm',
        entityType: 'invoice',
        entityId: id,
        data: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
        userId: user.id,
        timestamp: now
      })

      await invoices.updateOne(
        { id },
        { $set: { crmSyncedAt: now, updatedAt: now } }
      )

      return successResponse({ message: 'Invoice synced to CRM' })
    }

    // Regular update (only for draft invoices)
    if (invoice.status !== 'draft') {
      return errorResponse('Can only edit draft invoices', 400)
    }

    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await invoices.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Invoices PUT Error:', error)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}

// DELETE - Delete Invoice
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Invoice ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('furniture_invoices')

    const invoice = await invoices.findOne({ id })
    if (!invoice) return errorResponse('Invoice not found', 404)

    if (invoice.status !== 'draft') {
      return errorResponse('Can only delete draft invoices', 400)
    }

    await invoices.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Invoice deleted' })
  } catch (error) {
    console.error('Furniture Invoices DELETE Error:', error)
    return errorResponse('Failed to delete invoice', 500, error.message)
  }
}
