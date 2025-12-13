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
    const invoiceId = searchParams.get('id')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_invoices')

    if (invoiceId) {
      const invoice = await collection.findOne({ id: invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)
      return successResponse(sanitizeDocument(invoice))
    }

    let query = {}
    if (status) query.status = status

    const invoices = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    const stats = {
      total: invoices.length,
      draft: invoices.filter(i => i.status === 'draft').length,
      sent: invoices.filter(i => i.status === 'sent').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      partiallyPaid: invoices.filter(i => i.status === 'partially_paid').length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
      totalValue: invoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
      paidValue: invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
      pendingValue: invoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0)
    }

    return successResponse({ invoices: sanitizeDocuments(invoices), stats })
  } catch (error) {
    console.error('Invoices GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_invoices')

    const items = body.items || []
    let subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0)
    
    const discountAmount = body.discountType === 'percentage' 
      ? (subtotal * (body.discountValue || 0) / 100)
      : (body.discountValue || 0)
    
    const taxableAmount = subtotal - discountAmount
    const cgst = taxableAmount * ((body.cgstRate || 9) / 100)
    const sgst = taxableAmount * ((body.sgstRate || 9) / 100)
    const igst = body.isInterState ? taxableAmount * ((body.igstRate || 18) / 100) : 0
    const totalGst = body.isInterState ? igst : (cgst + sgst)
    const grandTotal = taxableAmount + totalGst

    const invoice = {
      id: uuidv4(),
      clientId: user.clientId,
      invoiceNumber: body.invoiceNumber || `WFI-${Date.now().toString().slice(-8)}`,
      orderId: body.orderId || null,
      quotationId: body.quotationId || null,
      projectId: body.projectId || null,
      customerId: body.customerId,
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      customerGst: body.customerGst || '',
      billingAddress: body.billingAddress || '',
      billingCity: body.billingCity || '',
      billingState: body.billingState || '',
      billingPincode: body.billingPincode || '',
      shippingAddress: body.shippingAddress || body.billingAddress || '',
      shippingCity: body.shippingCity || body.billingCity || '',
      shippingState: body.shippingState || body.billingState || '',
      shippingPincode: body.shippingPincode || body.billingPincode || '',
      items: items.map(item => ({
        ...item,
        total: (item.quantity || 0) * (item.rate || 0)
      })),
      subtotal,
      discountType: body.discountType || 'amount',
      discountValue: parseFloat(body.discountValue) || 0,
      discountAmount,
      taxableAmount,
      isInterState: body.isInterState || false,
      cgstRate: body.cgstRate || 9,
      sgstRate: body.sgstRate || 9,
      igstRate: body.igstRate || 18,
      cgst: body.isInterState ? 0 : cgst,
      sgst: body.isInterState ? 0 : sgst,
      igst: body.isInterState ? igst : 0,
      totalGst,
      grandTotal,
      paidAmount: 0,
      balanceAmount: grandTotal,
      payments: [],
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: body.status || 'draft',
      bankName: body.bankName || '',
      accountNumber: body.accountNumber || '',
      ifscCode: body.ifscCode || '',
      upiId: body.upiId || '',
      termsAndConditions: body.termsAndConditions || [
        'Payment due within 30 days',
        'Late payments subject to interest',
        'Goods once sold will not be taken back'
      ],
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(invoice)
    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Invoices POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Invoice ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_invoices')
    const invoice = await collection.findOne({ id })
    
    if (!invoice) return errorResponse('Invoice not found', 404)

    if (action === 'add_payment') {
      const payment = {
        id: uuidv4(),
        amount: parseFloat(updates.amount),
        method: updates.method || 'Cash',
        reference: updates.reference || '',
        date: new Date(),
        notes: updates.notes || ''
      }
      const newPaidAmount = (invoice.paidAmount || 0) + payment.amount
      const newBalanceAmount = invoice.grandTotal - newPaidAmount
      
      updates.payments = [...(invoice.payments || []), payment]
      updates.paidAmount = newPaidAmount
      updates.balanceAmount = newBalanceAmount
      updates.status = newBalanceAmount <= 0 ? 'paid' : 'partially_paid'
    }

    if (action === 'send') {
      updates.status = 'sent'
      updates.sentAt = new Date()
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Invoices PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Invoice ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_invoices')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Invoice not found', 404)
    return successResponse({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Invoices DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete invoice', 500, error.message)
  }
}
