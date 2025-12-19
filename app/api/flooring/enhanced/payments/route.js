import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch all payments for the flooring module
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const method = searchParams.get('method')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paymentsCollection = db.collection('flooring_payments')

    // Build query
    const query = {}
    if (invoiceId) query.invoiceId = invoiceId
    if (customerId) query.customerId = customerId
    if (method) query.method = method
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    // Fetch payments with pagination
    const skip = (page - 1) * limit
    const [payments, total] = await Promise.all([
      paymentsCollection.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      paymentsCollection.countDocuments(query)
    ])

    // Enrich with invoice details
    const invoicesCollection = db.collection('flooring_invoices')
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        if (payment.invoiceId) {
          const invoice = await invoicesCollection.findOne({ id: payment.invoiceId })
          return {
            ...payment,
            invoiceNumber: invoice?.invoiceNumber,
            customerName: invoice?.customer?.name || payment.customerName,
            customerPhone: invoice?.customer?.phone || payment.customerPhone
          }
        }
        return payment
      })
    )

    // Calculate summary
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalTds = payments.reduce((sum, p) => sum + (p.tdsDeducted || 0), 0)
    const methodBreakdown = payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + (p.amount || 0)
      return acc
    }, {})

    return successResponse({
      payments: enrichedPayments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalAmount,
        totalTds,
        netAmount: totalAmount - totalTds,
        count: payments.length,
        methodBreakdown
      }
    })
  } catch (error) {
    console.error('Flooring payments GET error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch payments', 500, error.message)
  }
}

// POST - Record a new payment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { invoiceId, amount, method, reference, date, notes, tdsDeducted, tdsRate, bankCharges, receivedBy } = body

    if (!invoiceId || !amount || amount <= 0) {
      return errorResponse('Invoice ID and valid amount are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paymentsCollection = db.collection('flooring_payments')
    const invoicesCollection = db.collection('flooring_invoices')

    // Get invoice details
    const invoice = await invoicesCollection.findOne({ id: invoiceId })
    if (!invoice) {
      return errorResponse('Invoice not found', 404)
    }

    const invoiceTotal = invoice.grandTotal || invoice.total || 0
    const existingPaid = invoice.paidAmount || 0
    const balance = invoiceTotal - existingPaid

    if (amount > balance) {
      return errorResponse(`Payment amount (₹${amount}) exceeds balance (₹${balance})`, 400)
    }

    const now = new Date().toISOString()
    const paymentId = uuidv4()
    
    // Generate receipt number
    const paymentCount = await paymentsCollection.countDocuments()
    const receiptNumber = `RCP-WF-${String(paymentCount + 1).padStart(5, '0')}`

    const payment = {
      id: paymentId,
      receiptNumber,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customer?.name,
      customerPhone: invoice.customer?.phone,
      amount: parseFloat(amount),
      method: method || 'cash',
      reference: reference || '',
      date: date || now.split('T')[0],
      notes: notes || '',
      tdsDeducted: parseFloat(tdsDeducted) || 0,
      tdsRate: parseFloat(tdsRate) || 0,
      bankCharges: parseFloat(bankCharges) || 0,
      receivedBy: receivedBy || user.name || user.email,
      netAmount: parseFloat(amount) - (parseFloat(tdsDeducted) || 0) - (parseFloat(bankCharges) || 0),
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await paymentsCollection.insertOne(payment)

    // Update invoice
    const newPaidAmount = existingPaid + parseFloat(amount)
    const newStatus = newPaidAmount >= invoiceTotal ? 'paid' : 'partial'

    await invoicesCollection.updateOne(
      { id: invoiceId },
      {
        $set: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paymentStatus: newStatus,
          lastPaymentDate: date || now.split('T')[0],
          updatedAt: now
        },
        $push: {
          paymentHistory: {
            paymentId,
            receiptNumber,
            amount: parseFloat(amount),
            method,
            date: date || now.split('T')[0],
            recordedAt: now
          }
        }
      }
    )

    return successResponse({
      payment,
      invoiceStatus: newStatus,
      newBalance: invoiceTotal - newPaidAmount,
      message: 'Payment recorded successfully'
    }, 201)
  } catch (error) {
    console.error('Flooring payments POST error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to record payment', 500, error.message)
  }
}

// PUT - Update a payment
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponse('Payment ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paymentsCollection = db.collection('flooring_payments')

    const existing = await paymentsCollection.findOne({ id })
    if (!existing) {
      return errorResponse('Payment not found', 404)
    }

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    }

    await paymentsCollection.updateOne({ id }, { $set: updateData })

    const updated = await paymentsCollection.findOne({ id })
    return successResponse({ payment: updated, message: 'Payment updated successfully' })
  } catch (error) {
    console.error('Flooring payments PUT error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update payment', 500, error.message)
  }
}

// DELETE - Delete a payment (soft delete or reverse)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Payment ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paymentsCollection = db.collection('flooring_payments')
    const invoicesCollection = db.collection('flooring_invoices')

    const payment = await paymentsCollection.findOne({ id })
    if (!payment) {
      return errorResponse('Payment not found', 404)
    }

    // Reverse the payment from invoice
    if (payment.invoiceId) {
      const invoice = await invoicesCollection.findOne({ id: payment.invoiceId })
      if (invoice) {
        const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.amount)
        const newStatus = newPaidAmount >= (invoice.grandTotal || invoice.total || 0) ? 'paid' : 
                          newPaidAmount > 0 ? 'partial' : 'pending'

        await invoicesCollection.updateOne(
          { id: payment.invoiceId },
          {
            $set: {
              paidAmount: newPaidAmount,
              status: newStatus,
              paymentStatus: newStatus,
              updatedAt: new Date().toISOString()
            }
          }
        )
      }
    }

    // Soft delete by marking as cancelled
    await paymentsCollection.updateOne(
      { id },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: user.id
        }
      }
    )

    return successResponse({ message: 'Payment cancelled successfully' })
  } catch (error) {
    console.error('Flooring payments DELETE error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete payment', 500, error.message)
  }
}
