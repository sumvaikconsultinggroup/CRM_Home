import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// ==================================================================================
// SYNC TO CENTRAL BUILD FINANCE - DISABLED
// ==================================================================================
// The D&W module is now SELF-CONTAINED and manages its own finance data.
// All invoices, payments, and quotes stay within D&W-specific collections:
// - dw_invoices
// - dw_quotations
// - dw_payment_collections
// 
// NO data is synced to central Build Finance (finance_invoices, finance_payments)
// This eliminates sync bugs and keeps the module standalone.
// ==================================================================================

// POST - Handle sync requests (returns success without central sync)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, type } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date()

    // QUOTE SYNC - Disabled, mark locally as managed
    if (action === 'sync-quote' || type === 'quote') {
      const dwQuotes = db.collection('dw_quotations')
      const quote = await dwQuotes.findOne({ id: body.quoteId })
      if (!quote) return errorResponse('Quote not found', 404)
      
      await dwQuotes.updateOne(
        { id: body.quoteId },
        { $set: { financeManaged: true, localFinanceAt: now, updatedAt: now } }
      )
      return successResponse({ 
        message: 'Quote managed locally within D&W module',
        note: 'Module is self-contained - no central finance sync',
        quoteId: body.quoteId
      })
    }

    // INVOICE SYNC - Disabled, mark locally as managed
    if (action === 'sync-invoice' || type === 'invoice') {
      const dwInvoices = db.collection('dw_invoices')
      const invoice = await dwInvoices.findOne({ id: body.invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)
      
      await dwInvoices.updateOne(
        { id: body.invoiceId },
        { $set: { financeManaged: true, localFinanceAt: now, updatedAt: now } }
      )
      return successResponse({ 
        message: 'Invoice managed locally within D&W module',
        note: 'Module is self-contained - no central finance sync',
        invoiceId: body.invoiceId
      })
    }

    // PAYMENT SYNC - Disabled, mark locally as managed  
    if (action === 'sync-payment' || type === 'payment') {
      const dwPayments = db.collection('dw_payment_collections')
      const payment = await dwPayments.findOne({ id: body.paymentId })
      if (!payment) return errorResponse('Payment not found', 404)
      
      await dwPayments.updateOne(
        { id: body.paymentId },
        { $set: { financeManaged: true, localFinanceAt: now, updatedAt: now } }
      )
      return successResponse({ 
        message: 'Payment managed locally within D&W module',
        note: 'Module is self-contained - no central finance sync',
        paymentId: body.paymentId
      })
    }

    // BULK SYNC - Disabled, mark all as locally managed
    if (action === 'bulk-sync') {
      const dwQuotes = db.collection('dw_quotations')
      const dwInvoices = db.collection('dw_invoices')
      const dwPayments = db.collection('dw_payment_collections')
      
      // Mark all as locally managed
      const quoteResult = await dwQuotes.updateMany(
        { financeManaged: { $ne: true } },
        { $set: { financeManaged: true, localFinanceAt: now } }
      )
      
      const invoiceResult = await dwInvoices.updateMany(
        { financeManaged: { $ne: true } },
        { $set: { financeManaged: true, localFinanceAt: now } }
      )
      
      const paymentResult = await dwPayments.updateMany(
        { financeManaged: { $ne: true } },
        { $set: { financeManaged: true, localFinanceAt: now } }
      )

      return successResponse({ 
        message: 'All items marked as locally managed',
        note: 'D&W module is self-contained - no central finance sync',
        marked: {
          quotes: quoteResult.modifiedCount,
          invoices: invoiceResult.modifiedCount,
          payments: paymentResult.modifiedCount
        }
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Finance Sync Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to process', 500, error.message)
  }
}

// GET - Get local finance status (no central sync status)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'quote' && id) {
      const quote = await db.collection('dw_quotations').findOne({ id })
      return successResponse({
        managed: !!quote?.financeManaged,
        managedAt: quote?.localFinanceAt,
        note: 'D&W module manages finance locally - no central sync'
      })
    }

    if (type === 'invoice' && id) {
      const invoice = await db.collection('dw_invoices').findOne({ id })
      return successResponse({
        managed: !!invoice?.financeManaged,
        managedAt: invoice?.localFinanceAt,
        note: 'D&W module manages finance locally - no central sync'
      })
    }

    // Get overall status
    const dwQuotes = db.collection('dw_quotations')
    const dwInvoices = db.collection('dw_invoices')
    const dwPayments = db.collection('dw_payment_collections')

    const totalQuotes = await dwQuotes.countDocuments()
    const totalInvoices = await dwInvoices.countDocuments()
    const totalPayments = await dwPayments.countDocuments()

    return successResponse({
      note: 'D&W module is SELF-CONTAINED - all finance data managed locally',
      localData: {
        quotes: totalQuotes,
        invoices: totalInvoices,
        payments: totalPayments
      },
      centralSync: {
        enabled: false,
        reason: 'Module manages own inventory and finance independently'
      }
    })
  } catch (error) {
    console.error('DW Finance Sync GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to get status', 500, error.message)
  }
}
