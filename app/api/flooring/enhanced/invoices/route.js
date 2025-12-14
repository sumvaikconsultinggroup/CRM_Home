import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate invoice number
const generateInvoiceNumber = async (db) => {
  const invoices = db.collection('flooring_invoices')
  const count = await invoices.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// GET - Fetch invoices
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const customerId = searchParams.get('customerId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const overdue = searchParams.get('overdue')
    const limit = parseInt(searchParams.get('limit')) || 100

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const payments = db.collection('flooring_payments')

    if (id) {
      const invoice = await invoices.findOne({ id })
      if (!invoice) return errorResponse('Invoice not found', 404)
      
      // Get payments for this invoice
      const invoicePayments = await payments.find({ invoiceId: id }).toArray()
      
      return successResponse(sanitizeDocument({ ...invoice, payments: invoicePayments }))
    }

    // Build query
    const query = {}
    if (customerId) query['customer.id'] = customerId
    if (projectId) query.projectId = projectId
    if (status) query.status = status
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date().toISOString() }
      query.status = { $ne: 'paid' }
    }

    const allInvoices = await invoices.find(query).sort({ createdAt: -1 }).limit(limit).toArray()

    // Calculate summary
    const summary = {
      total: allInvoices.length,
      totalValue: allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
      paidAmount: allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
      pendingAmount: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
      overdueCount: allInvoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'paid').length,
      byStatus: {}
    }

    allInvoices.forEach(i => {
      if (!summary.byStatus[i.status]) summary.byStatus[i.status] = 0
      summary.byStatus[i.status]++
    })

    return successResponse({
      invoices: sanitizeDocuments(allInvoices),
      summary
    })
  } catch (error) {
    console.error('Invoices GET Error:', error)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

// POST - Create invoice from quote or manually
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const quotes = db.collection('flooring_quotes_v2')
    const leads = db.collection('leads')

    const invoiceNumber = await generateInvoiceNumber(db)
    const invoiceId = uuidv4()
    const now = new Date().toISOString()

    let invoice

    // Create from quote
    if (body.quoteId) {
      const quote = await quotes.findOne({ id: body.quoteId })
      if (!quote) return errorResponse('Quote not found', 404)

      invoice = {
        id: invoiceId,
        invoiceNumber,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        projectId: quote.projectId,
        leadId: quote.leadId,
        customer: quote.customer,
        site: quote.site,
        rooms: quote.rooms,
        items: [], // Will be populated from quote items
        template: body.template || 'standard',
        materialTotal: quote.materialTotal,
        laborTotal: quote.laborTotal,
        accessoryTotal: quote.accessoryTotal,
        subtotal: quote.subtotal,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountAmount: quote.discountAmount,
        taxableAmount: quote.taxableAmount,
        cgstRate: quote.cgstRate,
        cgst: quote.cgst,
        sgstRate: quote.sgstRate,
        sgst: quote.sgst,
        igstRate: quote.igstRate,
        igst: quote.igst,
        isInterstate: quote.isInterstate,
        totalTax: quote.totalTax,
        grandTotal: quote.grandTotal,
        currency: 'INR',
        dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        paidAmount: 0,
        balanceAmount: quote.grandTotal,
        paymentTerms: quote.paymentTerms || 'Net 30',
        bankDetails: body.bankDetails || {
          bankName: '',
          accountName: '',
          accountNumber: '',
          ifscCode: '',
          upiId: ''
        },
        notes: body.notes || quote.notes || '',
        terms: quote.terms,
        statusHistory: [{
          status: 'draft',
          timestamp: now,
          by: user.id,
          notes: 'Invoice created from quote'
        }],
        sentAt: null,
        viewedAt: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      // Update quote with invoice reference
      await quotes.updateOne(
        { id: body.quoteId },
        { $set: { invoiceId, invoiceCreatedAt: now, updatedAt: now } }
      )
    } else {
      // Create invoice manually
      const items = body.items || []
      const materialTotal = items.filter(i => i.itemType === 'material').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
      const laborTotal = items.filter(i => i.itemType === 'labor').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
      const accessoryTotal = items.filter(i => i.itemType === 'accessory').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
      const subtotal = materialTotal + laborTotal + accessoryTotal
      
      const discountAmount = body.discountType === 'percent' 
        ? subtotal * ((body.discountValue || 0) / 100)
        : (body.discountValue || 0)
      
      const taxableAmount = subtotal - discountAmount
      const cgst = taxableAmount * ((body.cgstRate || 9) / 100)
      const sgst = taxableAmount * ((body.sgstRate || 9) / 100)
      const igst = body.isInterstate ? taxableAmount * ((body.igstRate || 18) / 100) : 0
      const totalTax = body.isInterstate ? igst : (cgst + sgst)
      const grandTotal = taxableAmount + totalTax

      invoice = {
        id: invoiceId,
        invoiceNumber,
        projectId: body.projectId,
        leadId: body.leadId,
        customer: body.customer || {},
        site: body.site || {},
        items,
        template: body.template || 'standard',
        materialTotal,
        laborTotal,
        accessoryTotal,
        subtotal,
        discountType: body.discountType || 'fixed',
        discountValue: body.discountValue || 0,
        discountAmount,
        taxableAmount,
        cgstRate: body.cgstRate || 9,
        cgst,
        sgstRate: body.sgstRate || 9,
        sgst,
        igstRate: body.igstRate || 18,
        igst,
        isInterstate: body.isInterstate || false,
        totalTax,
        grandTotal,
        currency: 'INR',
        dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        paidAmount: 0,
        balanceAmount: grandTotal,
        paymentTerms: body.paymentTerms || 'Net 30',
        bankDetails: body.bankDetails || {},
        notes: body.notes || '',
        terms: body.terms || '',
        statusHistory: [{
          status: 'draft',
          timestamp: now,
          by: user.id,
          notes: 'Invoice created'
        }],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }
    }

    await invoices.insertOne(invoice)

    // Update lead status
    if (invoice.leadId) {
      await leads.updateOne(
        { id: invoice.leadId },
        { $set: { flooringStatus: 'invoice_created', updatedAt: now } }
      )
    }

    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Invoices POST Error:', error)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

// PUT - Update invoice or record action
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Invoice ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const payments = db.collection('flooring_payments')
    const leads = db.collection('leads')

    const invoice = await invoices.findOne({ id })
    if (!invoice) return errorResponse('Invoice not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'send':
        await invoices.updateOne({ id }, {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'sent', timestamp: now, by: user.id } }
        })
        if (invoice.leadId) {
          await leads.updateOne({ id: invoice.leadId }, { $set: { flooringStatus: 'invoice_sent' } })
        }
        return successResponse({ message: 'Invoice sent' })

      case 'record_payment':
        const paymentAmount = parseFloat(body.amount)
        if (!paymentAmount || paymentAmount <= 0) {
          return errorResponse('Valid payment amount required', 400)
        }

        const paymentId = uuidv4()
        const payment = {
          id: paymentId,
          invoiceId: id,
          amount: paymentAmount,
          method: body.method || 'bank_transfer', // bank_transfer, upi, cash, cheque, card
          reference: body.reference || '',
          receivedDate: body.receivedDate || now,
          notes: body.paymentNotes || '',
          createdBy: user.id,
          createdAt: now
        }

        await payments.insertOne(payment)

        const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount
        const newBalance = invoice.grandTotal - newPaidAmount
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid'

        await invoices.updateOne({ id }, {
          $set: {
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalance),
            status: newStatus,
            lastPaymentDate: now,
            updatedAt: now
          },
          $push: {
            statusHistory: {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: `Payment of ₹${paymentAmount.toLocaleString()} received`
            }
          }
        })

        if (invoice.leadId && newStatus === 'paid') {
          await leads.updateOne({ id: invoice.leadId }, { $set: { flooringStatus: 'payment_received' } })
        }

        return successResponse({ message: 'Payment recorded', payment, newStatus, newBalance })

      case 'mark_viewed':
        await invoices.updateOne({ id }, {
          $set: { viewedAt: invoice.viewedAt || now, updatedAt: now },
          $inc: { viewCount: 1 }
        })
        return successResponse({ message: 'Invoice marked as viewed' })

      case 'cancel':
        // Cancel invoice and revert quote status if this invoice was created from a quote
        await invoices.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelReason: body.reason, updatedAt: now },
          $push: { statusHistory: { status: 'cancelled', timestamp: now, by: user.id, reason: body.reason } }
        })
        
        // If this invoice was created from a quote, revert the quote status back to 'approved'
        if (invoice.quoteId) {
          const quotes = db.collection('flooring_quotes_v2')
          await quotes.updateOne(
            { id: invoice.quoteId },
            {
              $set: { status: 'approved', invoiceId: null, invoiceCancelledAt: now, updatedAt: now },
              $push: {
                statusHistory: {
                  status: 'approved',
                  timestamp: now,
                  by: user.id,
                  notes: `Invoice ${invoice.invoiceNumber} was cancelled. Quote can be re-invoiced.`
                }
              }
            }
          )
        }
        
        return successResponse({ message: 'Invoice cancelled', quoteReverted: !!invoice.quoteId })

      default:
        // Regular update
        updateData.updatedAt = now
        updateData.updatedBy = user.id

        const result = await invoices.findOneAndUpdate(
          { id },
          { $set: updateData },
          { returnDocument: 'after' }
        )
        return successResponse(sanitizeDocument(result))
    }
  } catch (error) {
    console.error('Invoices PUT Error:', error)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}
