import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('doors_windows_invoices')

    if (id) {
      const invoice = await invoices.findOne({ id })
      if (!invoice) return errorResponse('Invoice not found', 404)
      return successResponse(sanitizeDocument(invoice))
    }

    const query = { isActive: true }
    if (status) query.status = status

    const invoiceList = await invoices.find(query).sort({ createdAt: -1 }).toArray()
    return successResponse({ invoices: sanitizeDocuments(invoiceList) })
  } catch (error) {
    console.error('Doors-Windows Invoices GET Error:', error)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('doors_windows_invoices')
    const counters = db.collection('counters')

    const counter = await counters.findOneAndUpdate(
      { _id: 'doors_windows_invoice' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
    const invoiceNumber = `DW-INV-${String(counter.seq || 1).padStart(5, '0')}`

    const now = new Date().toISOString()

    const invoice = {
      id: uuidv4(),
      invoiceNumber,
      orderId: body.orderId,
      customer: body.customer || {},
      lineItems: body.lineItems || [],
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      grandTotal: body.grandTotal || 0,
      paidAmount: body.paidAmount || 0,
      balanceDue: (body.grandTotal || 0) - (body.paidAmount || 0),
      status: 'draft',
      dueDate: body.dueDate,
      payments: [],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await invoices.insertOne(invoice)
    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Doors-Windows Invoices POST Error:', error)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Invoice ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('doors_windows_invoices')

    const now = new Date().toISOString()

    if (action === 'record_payment') {
      const invoice = await invoices.findOne({ id })
      if (!invoice) return errorResponse('Invoice not found', 404)

      const payment = {
        id: uuidv4(),
        amount: body.amount,
        method: body.method || 'cash',
        reference: body.reference,
        date: body.date || now,
        recordedBy: user.id
      }

      const newPaidAmount = (invoice.paidAmount || 0) + body.amount
      const newStatus = newPaidAmount >= invoice.grandTotal ? 'paid' : 'partial'

      await invoices.updateOne(
        { id },
        {
          $push: { payments: payment },
          $set: {
            paidAmount: newPaidAmount,
            balanceDue: invoice.grandTotal - newPaidAmount,
            status: newStatus,
            updatedAt: now
          }
        }
      )

      return successResponse({ message: 'Payment recorded', payment })
    }

    updateData.updatedAt = now

    const result = await invoices.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Invoice not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Invoices PUT Error:', error)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}
