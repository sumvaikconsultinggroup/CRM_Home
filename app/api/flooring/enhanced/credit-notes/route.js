/**
 * =====================================================
 * FLOORING MODULE - CREDIT NOTES API
 * =====================================================
 * 
 * Issue credit notes to customers for returns, price adjustments,
 * or other credits. Links to original invoices.
 */

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { checkPermission, logAccess } from '@/lib/middleware/rbac'

export async function OPTIONS() {
  return optionsResponse()
}

const CREDIT_NOTE_REASONS = [
  'goods_returned', 'price_adjustment', 'quality_issue', 'wrong_delivery',
  'duplicate_billing', 'discount_applied', 'settlement', 'other'
]

// GET - Fetch credit notes
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const invoiceId = searchParams.get('invoiceId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const creditNotes = db.collection('flooring_credit_notes')

    if (id) {
      const cn = await creditNotes.findOne({ id })
      if (!cn) return errorResponse('Credit note not found', 404)
      return successResponse(sanitizeDocument(cn))
    }

    const query = {}
    if (invoiceId) query.invoiceId = invoiceId
    if (customerId) query.customerId = customerId
    if (status) query.status = status

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      creditNotes.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      creditNotes.countDocuments(query)
    ])

    const summary = {
      total,
      totalAmount: result.reduce((sum, cn) => sum + (cn.amount || 0), 0),
      applied: result.filter(cn => cn.status === 'applied').length,
      pending: result.filter(cn => cn.status === 'pending').length
    }

    return successResponse({
      creditNotes: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary
    })
  } catch (error) {
    console.error('Credit Notes GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch credit notes', 500, error.message)
  }
}

// POST - Create credit note
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { invoiceId, customerId, customerName, amount, reason, description, items } = body

    if (!amount || amount <= 0) {
      return errorResponse('Valid amount is required', 400)
    }

    if (!CREDIT_NOTE_REASONS.includes(reason)) {
      return errorResponse(`Invalid reason. Valid: ${CREDIT_NOTE_REASONS.join(', ')}`, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const creditNotes = db.collection('flooring_credit_notes')
    const invoices = db.collection('flooring_invoices')

    // Validate invoice if provided
    let invoice = null
    if (invoiceId) {
      invoice = await invoices.findOne({ id: invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)
    }

    // Generate CN number
    const count = await creditNotes.countDocuments()
    const year = new Date().getFullYear()
    const cnNumber = `CN-${year}-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const creditNote = {
      id: uuidv4(),
      cnNumber,
      invoiceId: invoiceId || null,
      invoiceNumber: invoice?.invoiceNumber || null,
      customerId: customerId || invoice?.customerId || null,
      customerName: customerName || invoice?.customerName || invoice?.customer?.name || '',
      amount: parseFloat(amount),
      reason,
      description: description || '',
      items: items || [],
      status: 'pending', // pending, applied, cancelled
      appliedAmount: 0,
      balanceAmount: parseFloat(amount),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await creditNotes.insertOne(creditNote)
    await logAccess(user, 'create', 'credit_note', { cnId: creditNote.id, amount })

    return successResponse(sanitizeDocument(creditNote), 201)
  } catch (error) {
    console.error('Credit Notes POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create credit note', 500, error.message)
  }
}

// PUT - Update/Apply credit note
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Credit note ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const creditNotes = db.collection('flooring_credit_notes')
    const invoices = db.collection('flooring_invoices')

    const cn = await creditNotes.findOne({ id })
    if (!cn) return errorResponse('Credit note not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'apply':
        // Apply credit note to an invoice
        const { applyToInvoiceId, applyAmount } = updates
        if (!applyToInvoiceId || !applyAmount) {
          return errorResponse('Invoice ID and amount required', 400)
        }

        const targetInvoice = await invoices.findOne({ id: applyToInvoiceId })
        if (!targetInvoice) return errorResponse('Target invoice not found', 404)

        const effectiveAmount = Math.min(applyAmount, cn.balanceAmount)
        if (effectiveAmount <= 0) {
          return errorResponse('No balance available on credit note', 400)
        }

        // Update invoice
        const newPaidAmount = (targetInvoice.paidAmount || 0) + effectiveAmount
        const newBalance = (targetInvoice.grandTotal || 0) - newPaidAmount
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid'

        await invoices.updateOne({ id: applyToInvoiceId }, {
          $set: {
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalance),
            status: newStatus,
            updatedAt: now
          },
          $push: {
            creditNotesApplied: {
              cnId: cn.id,
              cnNumber: cn.cnNumber,
              amount: effectiveAmount,
              appliedAt: now,
              appliedBy: user.id
            }
          }
        })

        // Update credit note
        const newApplied = (cn.appliedAmount || 0) + effectiveAmount
        const newCnBalance = cn.amount - newApplied
        const cnStatus = newCnBalance <= 0 ? 'applied' : 'partial'

        await creditNotes.updateOne({ id }, {
          $set: {
            appliedAmount: newApplied,
            balanceAmount: Math.max(0, newCnBalance),
            status: cnStatus,
            updatedAt: now
          },
          $push: {
            applications: {
              invoiceId: applyToInvoiceId,
              invoiceNumber: targetInvoice.invoiceNumber,
              amount: effectiveAmount,
              appliedAt: now,
              appliedBy: user.id
            }
          }
        })

        return successResponse({
          message: 'Credit note applied',
          appliedAmount: effectiveAmount,
          invoiceNewStatus: newStatus,
          cnNewBalance: newCnBalance
        })

      case 'cancel':
        if (cn.status === 'applied') {
          return errorResponse('Cannot cancel fully applied credit note', 400)
        }
        await creditNotes.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Credit note cancelled' })

      default:
        updates.updatedAt = now
        updates.updatedBy = user.id
        await creditNotes.updateOne({ id }, { $set: updates })
        const updated = await creditNotes.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Credit Notes PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update credit note', 500, error.message)
  }
}

// DELETE - Delete credit note (only pending)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Credit note ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const creditNotes = db.collection('flooring_credit_notes')

    const cn = await creditNotes.findOne({ id })
    if (!cn) return errorResponse('Credit note not found', 404)

    if (cn.status !== 'pending') {
      return errorResponse('Can only delete pending credit notes', 400)
    }

    await creditNotes.deleteOne({ id })
    await logAccess(user, 'delete', 'credit_note', { cnId: id })

    return successResponse({ message: 'Credit note deleted' })
  } catch (error) {
    console.error('Credit Notes DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete credit note', 500, error.message)
  }
}
