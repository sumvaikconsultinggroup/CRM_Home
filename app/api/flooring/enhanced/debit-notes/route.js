/**
 * =====================================================
 * FLOORING MODULE - DEBIT NOTES API
 * =====================================================
 * 
 * Issue debit notes to vendors for returns, defective goods,
 * or other adjustments. Links to vendor bills/POs.
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

const DEBIT_NOTE_REASONS = [
  'goods_returned', 'defective_goods', 'price_difference', 'short_shipment',
  'quality_rejection', 'wrong_delivery', 'settlement', 'other'
]

// GET - Fetch debit notes
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const vendorId = searchParams.get('vendorId')
    const vendorBillId = searchParams.get('vendorBillId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const debitNotes = db.collection('flooring_debit_notes')

    if (id) {
      const dn = await debitNotes.findOne({ id })
      if (!dn) return errorResponse('Debit note not found', 404)
      return successResponse(sanitizeDocument(dn))
    }

    const query = {}
    if (vendorId) query.vendorId = vendorId
    if (vendorBillId) query.vendorBillId = vendorBillId
    if (status) query.status = status

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      debitNotes.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      debitNotes.countDocuments(query)
    ])

    const summary = {
      total,
      totalAmount: result.reduce((sum, dn) => sum + (dn.amount || 0), 0),
      settled: result.filter(dn => dn.status === 'settled').length,
      pending: result.filter(dn => dn.status === 'pending').length
    }

    return successResponse({
      debitNotes: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary
    })
  } catch (error) {
    console.error('Debit Notes GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch debit notes', 500, error.message)
  }
}

// POST - Create debit note
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { vendorId, vendorName, vendorBillId, purchaseOrderId, amount, reason, description, items } = body

    if (!vendorId && !vendorName) {
      return errorResponse('Vendor information required', 400)
    }

    if (!amount || amount <= 0) {
      return errorResponse('Valid amount is required', 400)
    }

    if (!DEBIT_NOTE_REASONS.includes(reason)) {
      return errorResponse(`Invalid reason. Valid: ${DEBIT_NOTE_REASONS.join(', ')}`, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const debitNotes = db.collection('flooring_debit_notes')

    // Generate DN number
    const count = await debitNotes.countDocuments()
    const year = new Date().getFullYear()
    const dnNumber = `DN-${year}-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const debitNote = {
      id: uuidv4(),
      dnNumber,
      vendorId: vendorId || null,
      vendorName: vendorName || '',
      vendorBillId: vendorBillId || null,
      purchaseOrderId: purchaseOrderId || null,
      amount: parseFloat(amount),
      reason,
      description: description || '',
      items: items || [],
      status: 'pending', // pending, settled, cancelled
      settledAmount: 0,
      balanceAmount: parseFloat(amount),
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await debitNotes.insertOne(debitNote)
    await logAccess(user, 'create', 'debit_note', { dnId: debitNote.id, vendorId, amount })

    return successResponse(sanitizeDocument(debitNote), 201)
  } catch (error) {
    console.error('Debit Notes POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create debit note', 500, error.message)
  }
}

// PUT - Update/Settle debit note
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Debit note ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const debitNotes = db.collection('flooring_debit_notes')
    const vendorBills = db.collection('flooring_vendor_bills')

    const dn = await debitNotes.findOne({ id })
    if (!dn) return errorResponse('Debit note not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'settle':
        // Settle against vendor bill or as cash refund
        const { settleAmount, settleAgainstBillId, settlementMethod } = updates
        
        if (!settleAmount || settleAmount <= 0) {
          return errorResponse('Valid settlement amount required', 400)
        }

        const effectiveAmount = Math.min(settleAmount, dn.balanceAmount)
        if (effectiveAmount <= 0) {
          return errorResponse('No balance available', 400)
        }

        // If settling against a vendor bill
        if (settleAgainstBillId) {
          const bill = await vendorBills.findOne({ id: settleAgainstBillId })
          if (bill) {
            const newBillBalance = Math.max(0, (bill.balanceAmount || bill.totalAmount) - effectiveAmount)
            await vendorBills.updateOne({ id: settleAgainstBillId }, {
              $set: {
                balanceAmount: newBillBalance,
                status: newBillBalance <= 0 ? 'paid' : 'partial',
                updatedAt: now
              },
              $push: {
                debitNotesApplied: {
                  dnId: dn.id,
                  dnNumber: dn.dnNumber,
                  amount: effectiveAmount,
                  settledAt: now
                }
              }
            })
          }
        }

        // Update debit note
        const newSettled = (dn.settledAmount || 0) + effectiveAmount
        const newDnBalance = dn.amount - newSettled
        const dnStatus = newDnBalance <= 0 ? 'settled' : 'partial'

        await debitNotes.updateOne({ id }, {
          $set: {
            settledAmount: newSettled,
            balanceAmount: Math.max(0, newDnBalance),
            status: dnStatus,
            updatedAt: now
          },
          $push: {
            settlements: {
              amount: effectiveAmount,
              method: settlementMethod || 'adjustment',
              billId: settleAgainstBillId || null,
              settledAt: now,
              settledBy: user.id
            }
          }
        })

        return successResponse({
          message: 'Debit note settled',
          settledAmount: effectiveAmount,
          newBalance: newDnBalance,
          status: dnStatus
        })

      case 'cancel':
        if (dn.status === 'settled') {
          return errorResponse('Cannot cancel fully settled debit note', 400)
        }
        await debitNotes.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Debit note cancelled' })

      default:
        updates.updatedAt = now
        updates.updatedBy = user.id
        await debitNotes.updateOne({ id }, { $set: updates })
        const updated = await debitNotes.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Debit Notes PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update debit note', 500, error.message)
  }
}

// DELETE - Delete debit note (only pending)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Debit note ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const debitNotes = db.collection('flooring_debit_notes')

    const dn = await debitNotes.findOne({ id })
    if (!dn) return errorResponse('Debit note not found', 404)

    if (dn.status !== 'pending') {
      return errorResponse('Can only delete pending debit notes', 400)
    }

    await debitNotes.deleteOne({ id })
    await logAccess(user, 'delete', 'debit_note', { dnId: id })

    return successResponse({ message: 'Debit note deleted' })
  } catch (error) {
    console.error('Debit Notes DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete debit note', 500, error.message)
  }
}
