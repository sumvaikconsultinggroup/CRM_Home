/**
 * =====================================================
 * FLOORING MODULE - VENDOR BILLS API (Accounts Payable)
 * =====================================================
 * 
 * Track vendor bills/invoices and accounts payable.
 * Links to vendors, POs, GRNs, and payments.
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

const BILL_STATUS = ['draft', 'pending', 'approved', 'partial', 'paid', 'overdue', 'disputed', 'cancelled']

// GET - Fetch vendor bills
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const vendorId = searchParams.get('vendorId')
    const purchaseOrderId = searchParams.get('purchaseOrderId')
    const status = searchParams.get('status')
    const overdue = searchParams.get('overdue')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorBills = db.collection('flooring_vendor_bills')
    const vendors = db.collection('flooring_vendors')
    const vendorPayments = db.collection('flooring_vendor_payments')

    if (id) {
      const bill = await vendorBills.findOne({ id })
      if (!bill) return errorResponse('Vendor bill not found', 404)

      // Enrich with vendor and payment details
      if (bill.vendorId) {
        const vendor = await vendors.findOne({ id: bill.vendorId })
        bill.vendor = vendor
      }

      const payments = await vendorPayments.find({ billId: id }).sort({ date: -1 }).toArray()
      bill.payments = payments

      return successResponse(sanitizeDocument(bill))
    }

    // Build query
    const query = {}
    if (vendorId) query.vendorId = vendorId
    if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId
    if (status && status !== 'all') query.status = status
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date().toISOString() }
      query.status = { $nin: ['paid', 'cancelled'] }
    }
    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { vendorBillNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ]
    }
    if (startDate || endDate) {
      query.billDate = {}
      if (startDate) query.billDate.$gte = startDate
      if (endDate) query.billDate.$lte = endDate
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      vendorBills.find(query).sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      vendorBills.countDocuments(query)
    ])

    // Calculate summary (Accounts Payable Summary)
    const now = new Date().toISOString()
    const allBills = await vendorBills.find({ status: { $nin: ['cancelled'] } }).toArray()
    
    const summary = {
      totalBills: allBills.length,
      totalPayable: allBills.reduce((sum, b) => sum + (b.balanceAmount || b.totalAmount || 0), 0),
      totalPaid: allBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0),
      overdueAmount: allBills
        .filter(b => b.dueDate < now && !['paid', 'cancelled'].includes(b.status))
        .reduce((sum, b) => sum + (b.balanceAmount || b.totalAmount || 0), 0),
      overdueCount: allBills.filter(b => b.dueDate < now && !['paid', 'cancelled'].includes(b.status)).length,
      thisMonthDue: allBills
        .filter(b => {
          const dueDate = new Date(b.dueDate)
          const thisMonth = new Date()
          return dueDate.getMonth() === thisMonth.getMonth() && 
                 dueDate.getFullYear() === thisMonth.getFullYear() &&
                 !['paid', 'cancelled'].includes(b.status)
        })
        .reduce((sum, b) => sum + (b.balanceAmount || b.totalAmount || 0), 0),
      byStatus: BILL_STATUS.reduce((acc, s) => {
        const statusBills = allBills.filter(b => b.status === s)
        acc[s] = {
          count: statusBills.length,
          amount: statusBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
        }
        return acc
      }, {})
    }

    // Aging analysis
    const aging = {
      current: { count: 0, amount: 0 },
      '1-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 }
    }

    allBills.filter(b => !['paid', 'cancelled'].includes(b.status)).forEach(b => {
      const daysPastDue = Math.floor((new Date() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24))
      const balance = b.balanceAmount || b.totalAmount || 0
      
      if (daysPastDue <= 0) {
        aging.current.count++
        aging.current.amount += balance
      } else if (daysPastDue <= 30) {
        aging['1-30'].count++
        aging['1-30'].amount += balance
      } else if (daysPastDue <= 60) {
        aging['31-60'].count++
        aging['31-60'].amount += balance
      } else if (daysPastDue <= 90) {
        aging['61-90'].count++
        aging['61-90'].amount += balance
      } else {
        aging['90+'].count++
        aging['90+'].amount += balance
      }
    })

    return successResponse({
      bills: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary,
      aging,
      statuses: BILL_STATUS
    })
  } catch (error) {
    console.error('Vendor Bills GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch vendor bills', 500, error.message)
  }
}

// POST - Create vendor bill
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { vendorId, vendorName, vendorBillNumber, billDate, dueDate,
            purchaseOrderId, grnId, items, notes } = body

    if (!vendorId && !vendorName) {
      return errorResponse('Vendor information required', 400)
    }

    if (!vendorBillNumber) {
      return errorResponse('Vendor bill/invoice number required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorBills = db.collection('flooring_vendor_bills')
    const vendors = db.collection('flooring_vendors')
    const purchaseOrders = db.collection('flooring_purchase_orders')

    // Get vendor details
    let vendor = null
    if (vendorId) {
      vendor = await vendors.findOne({ id: vendorId })
    }

    // Get PO details if linked
    let po = null
    if (purchaseOrderId) {
      po = await purchaseOrders.findOne({ id: purchaseOrderId })
    }

    // Check for duplicate vendor bill number
    const existing = await vendorBills.findOne({ 
      vendorId: vendorId || null,
      vendorBillNumber 
    })
    if (existing) {
      return errorResponse('Bill with this number already exists for this vendor', 400)
    }

    // Generate internal bill number
    const count = await vendorBills.countDocuments()
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const billNumber = `BILL-${year}${month}-${String(count + 1).padStart(4, '0')}`

    // Calculate totals from items
    const processedItems = (items || []).map((item, idx) => {
      const quantity = parseFloat(item.quantity) || 0
      const rate = parseFloat(item.rate) || 0
      const amount = quantity * rate
      const gstRate = parseFloat(item.gstRate) || 18
      const gstAmount = (amount * gstRate) / 100
      
      return {
        id: uuidv4(),
        lineNumber: idx + 1,
        productId: item.productId || null,
        productName: item.productName || item.name || item.description,
        description: item.description || '',
        quantity,
        unit: item.unit || 'sqft',
        rate,
        amount,
        gstRate,
        gstAmount,
        totalAmount: amount + gstAmount
      }
    })

    const subtotal = processedItems.reduce((sum, i) => sum + i.amount, 0) || parseFloat(body.subtotal) || 0
    const gstAmount = processedItems.reduce((sum, i) => sum + i.gstAmount, 0) || parseFloat(body.gstAmount) || 0
    const totalAmount = subtotal + gstAmount + (parseFloat(body.otherCharges) || 0) - (parseFloat(body.discount) || 0)

    // Calculate due date based on payment terms
    const paymentTermsDays = {
      'advance': 0, 'cod': 0, 'net7': 7, 'net15': 15, 
      'net30': 30, 'net45': 45, 'net60': 60
    }
    const termsDays = paymentTermsDays[vendor?.paymentTerms] || 30
    const calculatedDueDate = dueDate || new Date(Date.now() + termsDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const now = new Date().toISOString()
    const bill = {
      id: uuidv4(),
      billNumber,
      vendorBillNumber,
      billDate: billDate || now.split('T')[0],
      dueDate: calculatedDueDate,
      vendorId: vendorId || null,
      vendorCode: vendor?.code || '',
      vendorName: vendor?.name || vendorName,
      vendorGst: vendor?.gstNumber || body.vendorGst || '',
      purchaseOrderId: purchaseOrderId || null,
      purchaseOrderNumber: po?.poNumber || null,
      grnId: grnId || null,
      items: processedItems,
      subtotal,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0,
      gstAmount,
      tdsRate: parseFloat(body.tdsRate) || 0,
      tdsAmount: parseFloat(body.tdsAmount) || 0,
      otherCharges: parseFloat(body.otherCharges) || 0,
      discount: parseFloat(body.discount) || 0,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: 'pending',
      notes: notes || '',
      attachments: body.attachments || [],
      paymentHistory: [],
      debitNotesApplied: [],
      statusHistory: [{
        status: 'pending',
        timestamp: now,
        by: user.id,
        notes: 'Bill created'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await vendorBills.insertOne(bill)

    // Update vendor balance
    if (vendorId) {
      await vendors.updateOne({ id: vendorId }, {
        $inc: { currentBalance: totalAmount, totalPurchases: totalAmount },
        $set: { lastPurchaseDate: now, updatedAt: now }
      })
    }

    // Link to PO
    if (purchaseOrderId && po) {
      await purchaseOrders.updateOne({ id: purchaseOrderId }, {
        $inc: { billedValue: totalAmount },
        $push: { linkedBills: { billId: bill.id, billNumber, date: now, amount: totalAmount } },
        $set: { updatedAt: now }
      })
    }

    await logAccess(user, 'create', 'vendor_bill', { billId: bill.id, billNumber, vendorId, amount: totalAmount })

    return successResponse(sanitizeDocument(bill), 201)
  } catch (error) {
    console.error('Vendor Bills POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create vendor bill', 500, error.message)
  }
}

// PUT - Update vendor bill / Record payment
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Bill ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorBills = db.collection('flooring_vendor_bills')
    const vendors = db.collection('flooring_vendors')
    const vendorPayments = db.collection('flooring_vendor_payments')

    const bill = await vendorBills.findOne({ id })
    if (!bill) return errorResponse('Vendor bill not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'approve':
        await vendorBills.updateOne({ id }, {
          $set: { status: 'approved', approvedAt: now, approvedBy: user.id, updatedAt: now },
          $push: { statusHistory: { status: 'approved', timestamp: now, by: user.id, notes: 'Approved for payment' } }
        })
        return successResponse({ message: 'Bill approved' })

      case 'record_payment':
        // Internal action called by vendor-payments API
        const { paymentId, paymentAmount, paymentDate, paymentMethod, reference } = updates

        const newPaidAmount = (bill.paidAmount || 0) + paymentAmount
        const newBalance = bill.totalAmount - newPaidAmount
        const newStatus = newBalance <= 0 ? 'paid' : 'partial'

        await vendorBills.updateOne({ id }, {
          $set: {
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalance),
            status: newStatus,
            lastPaymentDate: paymentDate || now,
            updatedAt: now
          },
          $push: {
            paymentHistory: {
              paymentId,
              amount: paymentAmount,
              date: paymentDate || now,
              method: paymentMethod,
              reference,
              recordedBy: user.id
            },
            statusHistory: {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: `Payment of ₹${paymentAmount.toLocaleString()} recorded`
            }
          }
        })

        // Update vendor balance
        if (bill.vendorId) {
          await vendors.updateOne({ id: bill.vendorId }, {
            $inc: { currentBalance: -paymentAmount, totalPayments: paymentAmount },
            $set: { lastPaymentDate: now, updatedAt: now }
          })
        }

        return successResponse({
          message: 'Payment recorded',
          newStatus,
          newBalance: Math.max(0, newBalance)
        })

      case 'dispute':
        await vendorBills.updateOne({ id }, {
          $set: { status: 'disputed', disputeReason: updates.reason, disputedAt: now, disputedBy: user.id, updatedAt: now },
          $push: { statusHistory: { status: 'disputed', timestamp: now, by: user.id, notes: updates.reason } }
        })
        return successResponse({ message: 'Bill marked as disputed' })

      case 'resolve_dispute':
        await vendorBills.updateOne({ id }, {
          $set: { status: 'pending', disputeResolution: updates.resolution, resolvedAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'pending', timestamp: now, by: user.id, notes: `Dispute resolved: ${updates.resolution}` } }
        })
        return successResponse({ message: 'Dispute resolved' })

      case 'cancel':
        if (['paid', 'partial'].includes(bill.status)) {
          return errorResponse('Cannot cancel bill with payments', 400)
        }

        // Reverse vendor balance update
        if (bill.vendorId) {
          await vendors.updateOne({ id: bill.vendorId }, {
            $inc: { currentBalance: -bill.totalAmount, totalPurchases: -bill.totalAmount },
            $set: { updatedAt: now }
          })
        }

        await vendorBills.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, cancelReason: updates.reason, updatedAt: now },
          $push: { statusHistory: { status: 'cancelled', timestamp: now, by: user.id, notes: updates.reason } }
        })
        return successResponse({ message: 'Bill cancelled' })

      case 'mark_overdue':
        // Batch action to mark overdue bills
        const overdueQuery = {
          dueDate: { $lt: now },
          status: { $in: ['pending', 'approved', 'partial'] }
        }
        const overdueResult = await vendorBills.updateMany(overdueQuery, {
          $set: { status: 'overdue', updatedAt: now }
        })
        return successResponse({ message: `${overdueResult.modifiedCount} bills marked as overdue` })

      default:
        // Regular update (only for pending/draft bills)
        if (!['pending', 'draft'].includes(bill.status)) {
          return errorResponse('Can only edit pending bills', 400)
        }

        updates.updatedAt = now
        updates.updatedBy = user.id

        // Recalculate totals if items changed
        if (updates.items) {
          const subtotal = updates.items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.rate || 0)), 0)
          const gstAmount = updates.items.reduce((sum, i) => {
            const amount = (i.quantity || 0) * (i.rate || 0)
            return sum + (amount * (i.gstRate || 18) / 100)
          }, 0)
          updates.subtotal = subtotal
          updates.gstAmount = gstAmount
          updates.totalAmount = subtotal + gstAmount + (updates.otherCharges || bill.otherCharges || 0) - (updates.discount || bill.discount || 0)
          updates.balanceAmount = updates.totalAmount - (bill.paidAmount || 0)
        }

        await vendorBills.updateOne({ id }, { $set: updates })
        const updated = await vendorBills.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Vendor Bills PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update vendor bill', 500, error.message)
  }
}

// DELETE - Delete vendor bill (only draft/pending)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Bill ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendorBills = db.collection('flooring_vendor_bills')
    const vendors = db.collection('flooring_vendors')

    const bill = await vendorBills.findOne({ id })
    if (!bill) return errorResponse('Vendor bill not found', 404)

    if (!['draft', 'pending'].includes(bill.status)) {
      return errorResponse('Can only delete draft or pending bills', 400)
    }

    // Reverse vendor balance
    if (bill.vendorId) {
      await vendors.updateOne({ id: bill.vendorId }, {
        $inc: { currentBalance: -bill.totalAmount, totalPurchases: -bill.totalAmount }
      })
    }

    await vendorBills.deleteOne({ id })
    await logAccess(user, 'delete', 'vendor_bill', { billId: id })

    return successResponse({ message: 'Vendor bill deleted' })
  } catch (error) {
    console.error('Vendor Bills DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete vendor bill', 500, error.message)
  }
}
