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
    const invoiceId = searchParams.get('invoiceId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_payments')

    let query = {}
    if (invoiceId) query.invoiceId = invoiceId

    const payments = await collection.find(query).sort({ date: -1 }).toArray()

    const summary = {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    }

    return successResponse({ payments: sanitizeDocuments(payments), summary })
  } catch (error) {
    console.error('Finance Payments GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch payments', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      invoiceId, amount, date, paymentMode, referenceNumber, notes
    } = body

    if (!invoiceId || !amount) {
      return errorResponse('Invoice and amount are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paymentsCollection = db.collection('finance_payments')
    const invoicesCollection = db.collection('finance_invoices')

    // Get invoice
    const invoice = await invoicesCollection.findOne({ id: invoiceId })
    if (!invoice) {
      return errorResponse('Invoice not found', 404)
    }

    // Generate payment ID
    const count = await paymentsCollection.countDocuments()
    const paymentId = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const payment = {
      id: uuidv4(),
      paymentId,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      paymentMode: paymentMode || 'bank',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      createdBy: user.id,
      createdAt: new Date()
    }

    await paymentsCollection.insertOne(payment)

    // Update invoice paid amount and status
    const newPaidAmount = (invoice.paidAmount || 0) + parseFloat(amount)
    const newStatus = newPaidAmount >= invoice.totalAmount ? 'paid' : 
                      newPaidAmount > 0 ? 'partial' : 'pending'

    await invoicesCollection.updateOne(
      { id: invoiceId },
      {
        $set: {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: new Date()
        }
      }
    )

    return successResponse(sanitizeDocument(payment), 201)
  } catch (error) {
    console.error('Finance Payments POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to record payment', 500, error.message)
  }
}
