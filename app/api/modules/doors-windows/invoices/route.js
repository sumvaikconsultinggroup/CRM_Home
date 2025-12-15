import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch invoices
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('dw_invoices')

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const quoteId = searchParams.get('quoteId')

    let query = {}
    if (status) query.status = status
    if (quoteId) query.quoteId = quoteId

    const items = await invoices.find(query).sort({ createdAt: -1 }).toArray()
    
    return successResponse({ invoices: sanitizeDocuments(items) })
  } catch (error) {
    console.error('D&W Invoices GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

// POST - Create invoice from quote
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('dw_invoices')

    const now = new Date()
    const year = now.getFullYear()
    const count = await invoices.countDocuments() + 1
    const invoiceNumber = `INV-DW-${year}-${String(count).padStart(5, '0')}`

    const newInvoice = {
      id: uuidv4(),
      invoiceNumber,
      quoteId: body.quoteId,
      quoteNumber: body.quoteNumber,
      
      // Customer info
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      siteAddress: body.siteAddress,
      projectId: body.projectId,
      
      // Items and pricing
      items: body.items || [],
      accessories: body.accessories || [],
      itemsTotal: parseFloat(body.itemsTotal) || 0,
      accessoriesTotal: parseFloat(body.accessoriesTotal) || 0,
      subtotal: parseFloat(body.subtotal) || 0,
      installationCharge: parseFloat(body.installationCharge) || 0,
      taxAmount: parseFloat(body.taxAmount) || 0,
      grandTotal: parseFloat(body.grandTotal) || 0,
      
      // Payment
      paidAmount: 0,
      balanceAmount: parseFloat(body.grandTotal) || 0,
      paymentStatus: 'pending',
      payments: [],
      
      // Status
      status: 'pending',
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
      
      // Metadata
      createdBy: user.id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }

    await invoices.insertOne(newInvoice)

    // Log event
    const events = db.collection('dw_events')
    await events.insertOne({
      id: uuidv4(),
      type: 'invoice.created',
      entityType: 'invoice',
      entityId: newInvoice.id,
      data: { invoiceNumber, quoteId: body.quoteId, grandTotal: body.grandTotal },
      userId: user.id,
      timestamp: now.toISOString()
    })

    return successResponse({ invoice: sanitizeDocument(newInvoice) }, 201)
  } catch (error) {
    console.error('D&W Invoices POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

// PUT - Update invoice (add payment, change status)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) {
      return errorResponse('Invoice ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('dw_invoices')
    const now = new Date().toISOString()

    // Handle payment addition
    if (action === 'add-payment' && body.payment) {
      const invoice = await invoices.findOne({ id })
      if (!invoice) {
        return errorResponse('Invoice not found', 404)
      }

      const payment = {
        id: uuidv4(),
        amount: parseFloat(body.payment.amount),
        method: body.payment.method,
        reference: body.payment.reference,
        notes: body.payment.notes,
        date: body.payment.date || now,
        recordedBy: user.id,
        recordedAt: now
      }

      const newPaidAmount = (invoice.paidAmount || 0) + payment.amount
      const newBalanceAmount = invoice.grandTotal - newPaidAmount
      const newPaymentStatus = newBalanceAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending'

      await invoices.updateOne(
        { id },
        { 
          $push: { payments: payment },
          $set: { 
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            paymentStatus: newPaymentStatus,
            status: newPaymentStatus === 'paid' ? 'paid' : invoice.status,
            updatedAt: now
          }
        }
      )

      return successResponse({ message: 'Payment recorded', payment })
    }

    // Regular update
    await invoices.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now } }
    )

    return successResponse({ message: 'Invoice updated' })
  } catch (error) {
    console.error('D&W Invoices PUT Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}

// DELETE - Delete invoice
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Invoice ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('dw_invoices')

    await invoices.deleteOne({ id })
    return successResponse({ message: 'Invoice deleted' })
  } catch (error) {
    console.error('D&W Invoices DELETE Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete invoice', 500, error.message)
  }
}
