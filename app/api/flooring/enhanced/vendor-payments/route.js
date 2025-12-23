/**
 * =====================================================
 * FLOORING MODULE - VENDOR PAYMENTS API
 * =====================================================
 * 
 * Record and manage payments to vendors.
 * Links to vendor bills and updates accounts payable.
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

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', requiresReference: false },
  { id: 'cheque', name: 'Cheque', requiresReference: true },
  { id: 'neft', name: 'NEFT', requiresReference: true },
  { id: 'rtgs', name: 'RTGS', requiresReference: true },
  { id: 'imps', name: 'IMPS', requiresReference: true },
  { id: 'upi', name: 'UPI', requiresReference: true },
  { id: 'dd', name: 'Demand Draft', requiresReference: true },
  { id: 'lc', name: 'Letter of Credit', requiresReference: true },
  { id: 'adjustment', name: 'Adjustment', requiresReference: false }
]

// GET - Fetch vendor payments
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const vendorId = searchParams.get('vendorId')
    const billId = searchParams.get('billId')
    const method = searchParams.get('method')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorPayments = db.collection('flooring_vendor_payments')
    const vendors = db.collection('flooring_vendors')

    if (id) {
      const payment = await vendorPayments.findOne({ id })
      if (!payment) return errorResponse('Payment not found', 404)
      return successResponse(sanitizeDocument(payment))
    }

    // Build query
    const query = { status: { $ne: 'cancelled' } }
    if (vendorId) query.vendorId = vendorId
    if (billId) query.billId = billId
    if (method) query.method = method
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      vendorPayments.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      vendorPayments.countDocuments(query)
    ])

    // Calculate summary
    const allPayments = await vendorPayments.find({ status: { $ne: 'cancelled' } }).toArray()
    
    // Get this month's payments
    const thisMonth = new Date()
    const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString()
    const thisMonthPayments = allPayments.filter(p => p.date >= thisMonthStart)

    const summary = {
      totalPayments: allPayments.length,
      totalAmount: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalTds: allPayments.reduce((sum, p) => sum + (p.tdsAmount || 0), 0),
      thisMonthAmount: thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      thisMonthCount: thisMonthPayments.length,
      byMethod: PAYMENT_METHODS.reduce((acc, m) => {
        const methodPayments = allPayments.filter(p => p.method === m.id)
        acc[m.id] = {
          count: methodPayments.length,
          amount: methodPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        }
        return acc
      }, {})
    }

    // Top vendors by payment
    const vendorPaymentTotals = {}
    allPayments.forEach(p => {
      if (p.vendorId) {
        if (!vendorPaymentTotals[p.vendorId]) {
          vendorPaymentTotals[p.vendorId] = { vendorId: p.vendorId, vendorName: p.vendorName, total: 0, count: 0 }
        }
        vendorPaymentTotals[p.vendorId].total += p.amount || 0
        vendorPaymentTotals[p.vendorId].count++
      }
    })
    const topVendors = Object.values(vendorPaymentTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return successResponse({
      payments: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary,
      topVendors,
      paymentMethods: PAYMENT_METHODS
    })
  } catch (error) {
    console.error('Vendor Payments GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch vendor payments', 500, error.message)
  }
}

// POST - Record vendor payment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { vendorId, vendorName, billId, billIds, amount, method, date, 
            reference, tdsRate, tdsAmount, bankCharges, notes } = body

    if (!vendorId && !vendorName) {
      return errorResponse('Vendor information required', 400)
    }

    if (!amount || amount <= 0) {
      return errorResponse('Valid payment amount required', 400)
    }

    if (!method || !PAYMENT_METHODS.find(m => m.id === method)) {
      return errorResponse(`Invalid payment method. Valid: ${PAYMENT_METHODS.map(m => m.id).join(', ')}`, 400)
    }

    const methodConfig = PAYMENT_METHODS.find(m => m.id === method)
    if (methodConfig.requiresReference && !reference) {
      return errorResponse(`Reference/Transaction ID required for ${methodConfig.name}`, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorPayments = db.collection('flooring_vendor_payments')
    const vendorBills = db.collection('flooring_vendor_bills')
    const vendors = db.collection('flooring_vendors')

    // Get vendor details
    let vendor = null
    if (vendorId) {
      vendor = await vendors.findOne({ id: vendorId })
    }

    // Generate payment number
    const count = await vendorPayments.countDocuments()
    const year = new Date().getFullYear()
    const paymentNumber = `VP-${year}-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const effectiveTds = parseFloat(tdsAmount) || (parseFloat(amount) * (parseFloat(tdsRate) || 0) / 100)
    const netAmount = parseFloat(amount) - effectiveTds - (parseFloat(bankCharges) || 0)

    const payment = {
      id: uuidv4(),
      paymentNumber,
      vendorId: vendorId || null,
      vendorCode: vendor?.code || '',
      vendorName: vendor?.name || vendorName,
      billId: billId || null,
      billIds: billIds || (billId ? [billId] : []),
      amount: parseFloat(amount),
      method,
      date: date || now.split('T')[0],
      reference: reference || '',
      tdsRate: parseFloat(tdsRate) || 0,
      tdsAmount: effectiveTds,
      bankCharges: parseFloat(bankCharges) || 0,
      netAmount,
      notes: notes || '',
      status: 'completed',
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await vendorPayments.insertOne(payment)

    // Update vendor balance
    if (vendorId) {
      await vendors.updateOne({ id: vendorId }, {
        $inc: { currentBalance: -parseFloat(amount), totalPayments: parseFloat(amount) },
        $set: { lastPaymentDate: now, updatedAt: now }
      })
    }

    // Update linked bills
    const billIdsToUpdate = billIds || (billId ? [billId] : [])
    let remainingAmount = parseFloat(amount)
    const billUpdates = []

    for (const bId of billIdsToUpdate) {
      if (remainingAmount <= 0) break

      const bill = await vendorBills.findOne({ id: bId })
      if (!bill) continue

      const billBalance = bill.balanceAmount || bill.totalAmount
      const paymentForBill = Math.min(remainingAmount, billBalance)

      // Update bill
      const newPaidAmount = (bill.paidAmount || 0) + paymentForBill
      const newBillBalance = bill.totalAmount - newPaidAmount
      const newStatus = newBillBalance <= 0 ? 'paid' : 'partial'

      await vendorBills.updateOne({ id: bId }, {
        $set: {
          paidAmount: newPaidAmount,
          balanceAmount: Math.max(0, newBillBalance),
          status: newStatus,
          lastPaymentDate: now,
          updatedAt: now
        },
        $push: {
          paymentHistory: {
            paymentId: payment.id,
            paymentNumber,
            amount: paymentForBill,
            date: date || now.split('T')[0],
            method,
            reference,
            recordedBy: user.id,
            recordedAt: now
          }
        }
      })

      billUpdates.push({
        billId: bId,
        billNumber: bill.billNumber,
        amountApplied: paymentForBill,
        newStatus,
        newBalance: Math.max(0, newBillBalance)
      })

      remainingAmount -= paymentForBill
    }

    // If there's unapplied amount, it becomes advance
    if (remainingAmount > 0) {
      payment.advanceAmount = remainingAmount
      await vendorPayments.updateOne({ id: payment.id }, {
        $set: { advanceAmount: remainingAmount, isAdvance: true }
      })
    }

    await logAccess(user, 'create', 'vendor_payment', { paymentId: payment.id, vendorId, amount })

    return successResponse({
      payment: sanitizeDocument(payment),
      billUpdates,
      message: 'Payment recorded successfully'
    }, 201)
  } catch (error) {
    console.error('Vendor Payments POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to record payment', 500, error.message)
  }
}

// PUT - Update payment / Reverse payment
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Payment ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorPayments = db.collection('flooring_vendor_payments')
    const vendorBills = db.collection('flooring_vendor_bills')
    const vendors = db.collection('flooring_vendors')

    const payment = await vendorPayments.findOne({ id })
    if (!payment) return errorResponse('Payment not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'reverse':
      case 'cancel':
        // Reverse the payment
        if (payment.status === 'cancelled') {
          return errorResponse('Payment already cancelled', 400)
        }

        // Reverse vendor balance
        if (payment.vendorId) {
          await vendors.updateOne({ id: payment.vendorId }, {
            $inc: { currentBalance: payment.amount, totalPayments: -payment.amount },
            $set: { updatedAt: now }
          })
        }

        // Reverse bill updates
        for (const bId of (payment.billIds || [])) {
          const bill = await vendorBills.findOne({ id: bId })
          if (!bill) continue

          // Find the payment in history
          const paymentInHistory = bill.paymentHistory?.find(p => p.paymentId === id)
          if (!paymentInHistory) continue

          const newPaidAmount = Math.max(0, (bill.paidAmount || 0) - paymentInHistory.amount)
          const newBalance = bill.totalAmount - newPaidAmount
          const newStatus = newPaidAmount <= 0 ? 'pending' : 'partial'

          await vendorBills.updateOne({ id: bId }, {
            $set: {
              paidAmount: newPaidAmount,
              balanceAmount: newBalance,
              status: newStatus,
              updatedAt: now
            },
            $pull: {
              paymentHistory: { paymentId: id }
            }
          })
        }

        await vendorPayments.updateOne({ id }, {
          $set: {
            status: 'cancelled',
            cancelledAt: now,
            cancelledBy: user.id,
            cancelReason: updates.reason || 'Reversed',
            updatedAt: now
          }
        })

        return successResponse({ message: 'Payment reversed successfully' })

      case 'apply_to_bill':
        // Apply advance payment to a bill
        if (!payment.isAdvance || !payment.advanceAmount) {
          return errorResponse('No advance amount to apply', 400)
        }

        const { billIdToApply, applyAmount } = updates
        if (!billIdToApply || !applyAmount) {
          return errorResponse('Bill ID and amount required', 400)
        }

        const billToApply = await vendorBills.findOne({ id: billIdToApply })
        if (!billToApply) return errorResponse('Bill not found', 404)

        const effectiveApply = Math.min(applyAmount, payment.advanceAmount, billToApply.balanceAmount)

        // Update bill
        const newBillPaid = (billToApply.paidAmount || 0) + effectiveApply
        const newBillBal = billToApply.totalAmount - newBillPaid

        await vendorBills.updateOne({ id: billIdToApply }, {
          $set: {
            paidAmount: newBillPaid,
            balanceAmount: Math.max(0, newBillBal),
            status: newBillBal <= 0 ? 'paid' : 'partial',
            updatedAt: now
          },
          $push: {
            paymentHistory: {
              paymentId: id,
              paymentNumber: payment.paymentNumber,
              amount: effectiveApply,
              date: now.split('T')[0],
              method: 'advance_applied',
              reference: `Applied from advance ${payment.paymentNumber}`,
              recordedBy: user.id,
              recordedAt: now
            }
          }
        })

        // Update payment advance amount
        const newAdvance = payment.advanceAmount - effectiveApply
        await vendorPayments.updateOne({ id }, {
          $set: {
            advanceAmount: newAdvance,
            isAdvance: newAdvance > 0,
            updatedAt: now
          },
          $push: {
            billIds: billIdToApply
          }
        })

        return successResponse({
          message: 'Advance applied to bill',
          appliedAmount: effectiveApply,
          remainingAdvance: newAdvance
        })

      default:
        // Regular update (only for pending payments)
        updates.updatedAt = now
        updates.updatedBy = user.id

        await vendorPayments.updateOne({ id }, { $set: updates })
        const updated = await vendorPayments.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Vendor Payments PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update payment', 500, error.message)
  }
}

// DELETE - Delete payment (soft delete)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Payment ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorPayments = db.collection('flooring_vendor_payments')

    const payment = await vendorPayments.findOne({ id })
    if (!payment) return errorResponse('Payment not found', 404)

    // Soft delete - mark as cancelled
    // Use PUT with action=reverse for proper reversal
    await vendorPayments.updateOne({ id }, {
      $set: {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: user.id
      }
    })

    await logAccess(user, 'delete', 'vendor_payment', { paymentId: id })

    return successResponse({ message: 'Payment deleted (use reverse action to fully reverse)' })
  } catch (error) {
    console.error('Vendor Payments DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete payment', 500, error.message)
  }
}
