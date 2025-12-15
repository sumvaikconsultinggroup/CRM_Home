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
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_invoices')

    let query = {}
    if (status && status !== 'all') query.status = status
    if (clientId) query.clientId = clientId

    const invoices = await collection.find(query).sort({ createdAt: -1 }).toArray()

    // Calculate summary
    const summary = {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'paid').length,
      pending: invoices.filter(i => i.status === 'pending').length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
      totalAmount: invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    }

    return successResponse({ invoices: sanitizeDocuments(invoices), summary })
  } catch (error) {
    console.error('Finance Invoices GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      clientId, clientName, invoiceDate, dueDate,
      items, subTotal, gstRate, gstAmount, totalAmount,
      notes, terms
    } = body

    if (!clientId || !clientName) {
      return errorResponse('Client is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_invoices')

    // Generate invoice number
    const count = await collection.countDocuments()
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const invoice = {
      id: uuidv4(),
      invoiceNumber,
      clientId,
      clientName,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items || [],
      subTotal: parseFloat(subTotal) || 0,
      gstRate: parseFloat(gstRate) || 18,
      gstAmount: parseFloat(gstAmount) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      paidAmount: 0,
      status: 'pending',
      notes: notes || '',
      terms: terms || 'Payment due within 15 days',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(invoice)
    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Finance Invoices POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponse('Invoice ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_invoices')

    delete updates.createdAt
    delete updates.createdBy
    updates.updatedAt = new Date()
    updates.updatedBy = user.id

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Invoice not found', 404)
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Finance Invoices PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}

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
    const collection = db.collection('finance_invoices')

    const invoice = await collection.findOne({ id })
    if (!invoice) {
      return errorResponse('Invoice not found', 404)
    }

    if (invoice.status === 'paid') {
      return errorResponse('Cannot delete paid invoice', 400)
    }

    await collection.deleteOne({ id })
    return successResponse({ message: 'Invoice deleted' })
  } catch (error) {
    console.error('Finance Invoices DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete invoice', 500, error.message)
  }
}
