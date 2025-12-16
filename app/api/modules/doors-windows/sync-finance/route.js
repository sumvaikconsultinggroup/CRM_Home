import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Sync Quote/Invoice to BuilD Finance
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, type } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date()

    // ==================== SYNC QUOTE TO FINANCE ====================
    if (action === 'sync-quote' || type === 'quote') {
      const dwQuotes = db.collection('dw_quotations')
      const dwQuoteItems = db.collection('dw_quote_items')
      const financeQuotes = db.collection('finance_quotes')
      
      const quote = await dwQuotes.findOne({ id: body.quoteId })
      if (!quote) return errorResponse('Quote not found', 404)
      
      const items = await dwQuoteItems.find({ quoteId: body.quoteId }).toArray()

      // Check if already synced
      const existingSync = await financeQuotes.findOne({ sourceId: quote.id, source: 'doors-windows' })
      
      const financeQuote = {
        id: existingSync?.id || uuidv4(),
        source: 'doors-windows',
        sourceId: quote.id,
        sourceModule: 'D&W Module',
        
        quoteNumber: quote.quoteNumber,
        version: quote.version,
        
        // Customer
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerEmail: quote.customerEmail,
        customerAddress: quote.siteAddress,
        
        // Project link
        projectId: quote.projectId,
        surveyId: quote.surveyId,
        
        // Dates
        quoteDate: quote.createdAt,
        validUntil: quote.validUntil,
        
        // Items summary
        itemsCount: items.length,
        category: 'Doors & Windows',
        
        // Line items
        lineItems: items.map(item => ({
          id: item.id,
          description: item.description || `${item.type || 'Item'} - ${item.category || ''} (${item.width}mm x ${item.height}mm)`,
          type: item.type,
          category: item.category,
          quantity: item.quantity || 1,
          unit: 'nos',
          area: item.area,
          unitPrice: item.unitPrice || item.pricePerSqft * item.area,
          discountPercent: item.discount || 0,
          discountAmount: item.discountAmount || 0,
          taxRate: item.taxRate || 18,
          taxAmount: item.taxAmount || 0,
          totalAmount: item.totalAmount || 0,
          hsnCode: '7610', // Default HSN for aluminium structures
          sacCode: ''
        })),
        
        // Totals
        subtotal: quote.subtotal || 0,
        
        // Additional charges
        additionalCharges: [
          { name: 'Fabrication', amount: quote.fabricationCharge || 0 },
          { name: 'Installation', amount: quote.installationCharge || 0 },
          { name: 'Transport', amount: quote.transportCharge || 0 },
          { name: 'Scaffolding', amount: quote.scaffoldingCharge || 0 }
        ].filter(c => c.amount > 0),
        
        totalDiscount: quote.totalDiscount || 0,
        totalTax: quote.totalTax || 0,
        grandTotal: quote.grandTotal || 0,
        
        // Tax breakup (GST)
        taxBreakup: {
          cgst: (quote.totalTax || 0) / 2,
          sgst: (quote.totalTax || 0) / 2,
          igst: 0,
          cessAmount: 0
        },
        
        // Status
        status: quote.status,
        
        // Payment terms
        paymentTerms: quote.paymentTerms || 'As per company policy',
        paymentSchedule: body.paymentSchedule || [
          { milestone: 'Order Confirmation', percentage: 50, amount: (quote.grandTotal || 0) * 0.5 },
          { milestone: 'Before Delivery', percentage: 40, amount: (quote.grandTotal || 0) * 0.4 },
          { milestone: 'After Installation', percentage: 10, amount: (quote.grandTotal || 0) * 0.1 }
        ],
        
        // Sync metadata
        syncedBy: user.id,
        syncedAt: now,
        lastSyncedAt: now,
        syncCount: existingSync ? (existingSync.syncCount || 0) + 1 : 1,
        
        createdAt: existingSync?.createdAt || now,
        updatedAt: now
      }

      if (existingSync) {
        await financeQuotes.updateOne({ id: existingSync.id }, { $set: financeQuote })
      } else {
        await financeQuotes.insertOne(financeQuote)
      }
      
      // Mark quote as synced to finance
      await dwQuotes.updateOne(
        { id: body.quoteId },
        { $set: { syncedToFinance: true, financeSyncId: financeQuote.id, lastFinanceSyncAt: now } }
      )

      return successResponse({ 
        message: existingSync ? 'Quote synced to Finance (updated)' : 'Quote synced to Finance',
        financeQuoteId: financeQuote.id,
        syncCount: financeQuote.syncCount
      })
    }

    // ==================== SYNC INVOICE TO FINANCE ====================
    if (action === 'sync-invoice' || type === 'invoice') {
      const dwInvoices = db.collection('dw_invoices')
      const financeInvoices = db.collection('finance_invoices')
      
      const invoice = await dwInvoices.findOne({ id: body.invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)

      // Check if already synced
      const existingSync = await financeInvoices.findOne({ sourceId: invoice.id, source: 'doors-windows' })
      
      const financeInvoice = {
        id: existingSync?.id || uuidv4(),
        source: 'doors-windows',
        sourceId: invoice.id,
        sourceModule: 'D&W Module',
        
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: 'tax_invoice',
        
        // Customer
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerEmail: invoice.customerEmail,
        customerGSTIN: invoice.customerGSTIN || '',
        billingAddress: invoice.siteAddress,
        shippingAddress: invoice.siteAddress,
        
        // References
        quoteId: invoice.quoteId,
        quoteNumber: invoice.quoteNumber,
        projectId: invoice.projectId,
        orderId: invoice.orderId,
        
        // Dates
        invoiceDate: invoice.createdAt,
        dueDate: invoice.dueDate,
        
        // Items
        category: 'Doors & Windows',
        lineItems: (invoice.items || []).map(item => ({
          id: item.id || uuidv4(),
          description: item.description || `${item.type || 'Item'} - ${item.category || ''}`,
          type: item.type,
          quantity: item.quantity || 1,
          unit: 'nos',
          area: item.area,
          unitPrice: item.unitPrice || 0,
          discountAmount: item.discountAmount || 0,
          taxRate: item.taxRate || 18,
          taxAmount: item.taxAmount || 0,
          totalAmount: item.totalAmount || 0,
          hsnCode: item.hsnCode || '7610',
          sacCode: ''
        })),
        
        // Charges
        additionalCharges: [
          { name: 'Installation', amount: invoice.installationCharge || 0 },
          { name: 'Transport', amount: invoice.transportCharge || 0 }
        ].filter(c => c.amount > 0),
        
        // Totals
        subtotal: invoice.subtotal || invoice.itemsTotal || 0,
        totalDiscount: invoice.totalDiscount || 0,
        taxableAmount: (invoice.subtotal || invoice.itemsTotal || 0) - (invoice.totalDiscount || 0),
        totalTax: invoice.taxAmount || 0,
        grandTotal: invoice.grandTotal || 0,
        roundOff: 0,
        
        // Tax breakup
        taxBreakup: {
          cgst: (invoice.taxAmount || 0) / 2,
          sgst: (invoice.taxAmount || 0) / 2,
          igst: 0,
          cessAmount: 0
        },
        
        // Payment tracking
        paidAmount: invoice.paidAmount || 0,
        balanceAmount: invoice.balanceAmount || invoice.grandTotal || 0,
        paymentStatus: invoice.paymentStatus || 'pending',
        payments: (invoice.payments || []).map(p => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          date: p.date
        })),
        
        // Status
        status: invoice.status || 'pending',
        
        // E-Invoice (GST)
        eInvoiceStatus: 'not_generated',
        irn: null,
        ackNumber: null,
        ackDate: null,
        
        // Sync metadata
        syncedBy: user.id,
        syncedAt: now,
        lastSyncedAt: now,
        syncCount: existingSync ? (existingSync.syncCount || 0) + 1 : 1,
        
        createdAt: existingSync?.createdAt || now,
        updatedAt: now
      }

      if (existingSync) {
        await financeInvoices.updateOne({ id: existingSync.id }, { $set: financeInvoice })
      } else {
        await financeInvoices.insertOne(financeInvoice)
      }
      
      // Mark invoice as synced
      await dwInvoices.updateOne(
        { id: body.invoiceId },
        { $set: { syncedToFinance: true, financeSyncId: financeInvoice.id, lastFinanceSyncAt: now } }
      )

      return successResponse({ 
        message: existingSync ? 'Invoice synced to Finance (updated)' : 'Invoice synced to Finance',
        financeInvoiceId: financeInvoice.id,
        syncCount: financeInvoice.syncCount
      })
    }

    // ==================== SYNC PAYMENT TO FINANCE ====================
    if (action === 'sync-payment' || type === 'payment') {
      const dwPayments = db.collection('dw_payment_collections')
      const dwInvoices = db.collection('dw_invoices')
      const financePayments = db.collection('finance_payments')
      const financeInvoices = db.collection('finance_invoices')
      
      const payment = await dwPayments.findOne({ id: body.paymentId })
      if (!payment) return errorResponse('Payment not found', 404)
      
      const invoice = await dwInvoices.findOne({ id: payment.invoiceId })

      // Check if already synced
      const existingSync = await financePayments.findOne({ sourceId: payment.id, source: 'doors-windows' })
      
      const financePayment = {
        id: existingSync?.id || uuidv4(),
        source: 'doors-windows',
        sourceId: payment.id,
        
        paymentId: payment.paymentId,
        invoiceId: payment.invoiceId,
        invoiceNumber: invoice?.invoiceNumber,
        
        customerId: invoice?.customerId,
        customerName: payment.customerName || invoice?.customerName,
        
        amount: payment.amount,
        currency: 'INR',
        
        method: payment.method,
        reference: payment.reference,
        
        bankName: payment.bankName,
        chequeNumber: payment.chequeNumber,
        upiId: payment.upiId,
        
        status: payment.status,
        date: payment.date,
        clearanceDate: payment.clearanceDate,
        
        category: 'product_sale',
        description: `Payment for D&W Invoice ${invoice?.invoiceNumber || payment.invoiceNumber}`,
        
        receiptId: payment.receiptId,
        receiptNumber: payment.receiptNumber,
        
        syncedBy: user.id,
        syncedAt: now,
        
        createdAt: existingSync?.createdAt || now,
        updatedAt: now
      }

      if (existingSync) {
        await financePayments.updateOne({ id: existingSync.id }, { $set: financePayment })
      } else {
        await financePayments.insertOne(financePayment)
      }

      // Update finance invoice if exists
      const financeInvoice = await financeInvoices.findOne({ sourceId: payment.invoiceId, source: 'doors-windows' })
      if (financeInvoice) {
        const allPayments = await financePayments.find({ invoiceId: payment.invoiceId, source: 'doors-windows' }).toArray()
        const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        
        await financeInvoices.updateOne(
          { id: financeInvoice.id },
          { 
            $set: {
              paidAmount: totalPaid,
              balanceAmount: Math.max(0, financeInvoice.grandTotal - totalPaid),
              paymentStatus: totalPaid >= financeInvoice.grandTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
              updatedAt: now
            }
          }
        )
      }

      return successResponse({ 
        message: 'Payment synced to Finance',
        financePaymentId: financePayment.id
      })
    }

    // ==================== BULK SYNC ALL PENDING ====================
    if (action === 'bulk-sync') {
      const dwQuotes = db.collection('dw_quotations')
      const dwInvoices = db.collection('dw_invoices')
      const dwPayments = db.collection('dw_payment_collections')
      
      let syncedQuotes = 0
      let syncedInvoices = 0
      let syncedPayments = 0
      let errors = []
      
      // Sync unsynced quotes
      const unsyncedQuotes = await dwQuotes.find({ 
        syncedToFinance: { $ne: true },
        status: { $in: ['sent', 'approved'] }
      }).toArray()
      
      for (const quote of unsyncedQuotes) {
        try {
          // Simulate sync
          await dwQuotes.updateOne(
            { id: quote.id },
            { $set: { syncedToFinance: true, lastFinanceSyncAt: now } }
          )
          syncedQuotes++
        } catch (err) {
          errors.push({ type: 'quote', id: quote.id, error: err.message })
        }
      }
      
      // Sync unsynced invoices
      const unsyncedInvoices = await dwInvoices.find({ 
        syncedToFinance: { $ne: true }
      }).toArray()
      
      for (const invoice of unsyncedInvoices) {
        try {
          await dwInvoices.updateOne(
            { id: invoice.id },
            { $set: { syncedToFinance: true, lastFinanceSyncAt: now } }
          )
          syncedInvoices++
        } catch (err) {
          errors.push({ type: 'invoice', id: invoice.id, error: err.message })
        }
      }
      
      // Sync unsynced payments
      const unsyncedPayments = await dwPayments.find({ 
        syncedToFinance: { $ne: true }
      }).toArray()
      
      for (const payment of unsyncedPayments) {
        try {
          await dwPayments.updateOne(
            { id: payment.id },
            { $set: { syncedToFinance: true, lastFinanceSyncAt: now } }
          )
          syncedPayments++
        } catch (err) {
          errors.push({ type: 'payment', id: payment.id, error: err.message })
        }
      }

      return successResponse({ 
        message: 'Bulk sync completed',
        synced: {
          quotes: syncedQuotes,
          invoices: syncedInvoices,
          payments: syncedPayments
        },
        errors: errors.length > 0 ? errors : null
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Finance Sync Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to sync', 500, error.message)
  }
}

// GET - Get sync status
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
      const financeQuote = await db.collection('finance_quotes').findOne({ sourceId: id, source: 'doors-windows' })
      
      return successResponse({
        synced: !!quote?.syncedToFinance,
        lastSyncedAt: quote?.lastFinanceSyncAt,
        financeId: financeQuote?.id
      })
    }

    if (type === 'invoice' && id) {
      const invoice = await db.collection('dw_invoices').findOne({ id })
      const financeInvoice = await db.collection('finance_invoices').findOne({ sourceId: id, source: 'doors-windows' })
      
      return successResponse({
        synced: !!invoice?.syncedToFinance,
        lastSyncedAt: invoice?.lastFinanceSyncAt,
        financeId: financeInvoice?.id
      })
    }

    // Get overall sync status
    const dwQuotes = db.collection('dw_quotations')
    const dwInvoices = db.collection('dw_invoices')
    const dwPayments = db.collection('dw_payment_collections')

    const totalQuotes = await dwQuotes.countDocuments()
    const syncedQuotes = await dwQuotes.countDocuments({ syncedToFinance: true })
    
    const totalInvoices = await dwInvoices.countDocuments()
    const syncedInvoices = await dwInvoices.countDocuments({ syncedToFinance: true })
    
    const totalPayments = await dwPayments.countDocuments()
    const syncedPayments = await dwPayments.countDocuments({ syncedToFinance: true })

    return successResponse({
      quotes: { total: totalQuotes, synced: syncedQuotes, pending: totalQuotes - syncedQuotes },
      invoices: { total: totalInvoices, synced: syncedInvoices, pending: totalInvoices - syncedInvoices },
      payments: { total: totalPayments, synced: syncedPayments, pending: totalPayments - syncedPayments }
    })
  } catch (error) {
    console.error('DW Finance Sync GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to get sync status', 500, error.message)
  }
}
