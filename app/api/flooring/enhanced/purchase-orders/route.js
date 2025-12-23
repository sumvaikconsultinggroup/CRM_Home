/**
 * =====================================================
 * FLOORING MODULE - PURCHASE ORDERS API
 * =====================================================
 * 
 * Create and manage purchase orders to vendors.
 * Links to vendors, GRNs, and vendor bills.
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

const PO_STATUS = [
  'draft', 'pending_approval', 'approved', 'sent', 'acknowledged',
  'partially_received', 'received', 'billed', 'closed', 'cancelled'
]

// GET - Fetch purchase orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'grn.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const vendorId = searchParams.get('vendorId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const purchaseOrders = db.collection('flooring_purchase_orders')
    const vendors = db.collection('flooring_vendors')

    if (id) {
      const po = await purchaseOrders.findOne({ id })
      if (!po) return errorResponse('Purchase order not found', 404)

      // Enrich with vendor details
      if (po.vendorId) {
        const vendor = await vendors.findOne({ id: po.vendorId })
        po.vendor = vendor
      }

      return successResponse(sanitizeDocument(po))
    }

    // Build query
    const query = {}
    if (vendorId) query.vendorId = vendorId
    if (status && status !== 'all') query.status = status
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ]
    }
    if (startDate || endDate) {
      query.poDate = {}
      if (startDate) query.poDate.$gte = startDate
      if (endDate) query.poDate.$lte = endDate
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      purchaseOrders.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      purchaseOrders.countDocuments(query)
    ])

    // Calculate summary
    const allPOs = await purchaseOrders.find({}).toArray()
    const summary = {
      totalOrders: allPOs.length,
      totalValue: allPOs.reduce((sum, po) => sum + (po.grandTotal || 0), 0),
      pendingApproval: allPOs.filter(po => po.status === 'pending_approval').length,
      pendingDelivery: allPOs.filter(po => ['approved', 'sent', 'acknowledged', 'partially_received'].includes(po.status)).length,
      byStatus: PO_STATUS.reduce((acc, s) => {
        acc[s] = allPOs.filter(po => po.status === s).length
        return acc
      }, {})
    }

    return successResponse({
      purchaseOrders: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary,
      statuses: PO_STATUS
    })
  } catch (error) {
    console.error('Purchase Orders GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch purchase orders', 500, error.message)
  }
}

// POST - Create purchase order
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'grn.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { vendorId, vendorName, items, notes, deliveryAddress, 
            expectedDeliveryDate, paymentTerms, shippingMethod } = body

    if (!vendorId && !vendorName) {
      return errorResponse('Vendor information required', 400)
    }

    if (!items || !items.length) {
      return errorResponse('At least one item is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const purchaseOrders = db.collection('flooring_purchase_orders')
    const vendors = db.collection('flooring_vendors')

    // Get vendor details
    let vendor = null
    if (vendorId) {
      vendor = await vendors.findOne({ id: vendorId })
    }

    // Generate PO number
    const count = await purchaseOrders.countDocuments()
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const poNumber = `PO-${year}${month}-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    const processedItems = items.map((item, idx) => {
      const quantity = parseFloat(item.quantity) || 0
      const rate = parseFloat(item.rate) || 0
      const amount = quantity * rate
      const gstRate = parseFloat(item.gstRate) || 18
      const gstAmount = (amount * gstRate) / 100
      
      return {
        id: uuidv4(),
        lineNumber: idx + 1,
        productId: item.productId || null,
        productName: item.productName || item.name,
        sku: item.sku || '',
        description: item.description || '',
        quantity,
        unit: item.unit || 'sqft',
        rate,
        amount,
        gstRate,
        gstAmount,
        totalAmount: amount + gstAmount,
        receivedQuantity: 0,
        pendingQuantity: quantity,
        status: 'pending'
      }
    })

    const subtotal = processedItems.reduce((sum, i) => sum + i.amount, 0)
    const totalGst = processedItems.reduce((sum, i) => sum + i.gstAmount, 0)
    const grandTotal = subtotal + totalGst + (parseFloat(body.shippingCost) || 0) + (parseFloat(body.otherCharges) || 0)

    const now = new Date().toISOString()
    const po = {
      id: uuidv4(),
      poNumber,
      poDate: body.poDate || now.split('T')[0],
      vendorId: vendorId || null,
      vendorCode: vendor?.code || '',
      vendorName: vendor?.name || vendorName,
      vendorEmail: vendor?.email || '',
      vendorPhone: vendor?.phone || '',
      vendorGst: vendor?.gstNumber || '',
      vendorAddress: vendor?.address || {},
      items: processedItems,
      subtotal,
      gstAmount: totalGst,
      shippingCost: parseFloat(body.shippingCost) || 0,
      otherCharges: parseFloat(body.otherCharges) || 0,
      discount: parseFloat(body.discount) || 0,
      grandTotal,
      currency: body.currency || 'INR',
      exchangeRate: body.exchangeRate || 1,
      deliveryAddress: deliveryAddress || {},
      expectedDeliveryDate: expectedDeliveryDate || null,
      paymentTerms: paymentTerms || vendor?.paymentTerms || 'net30',
      shippingMethod: shippingMethod || '',
      notes: notes || '',
      internalNotes: body.internalNotes || '',
      termsAndConditions: body.termsAndConditions || '',
      status: body.status || 'draft',
      approvalStatus: 'pending',
      receivedValue: 0,
      billedValue: 0,
      linkedGRNs: [],
      linkedBills: [],
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Purchase order created'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await purchaseOrders.insertOne(po)
    await logAccess(user, 'create', 'purchase_order', { poId: po.id, poNumber, vendorId })

    return successResponse(sanitizeDocument(po), 201)
  } catch (error) {
    console.error('Purchase Orders POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create purchase order', 500, error.message)
  }
}

// PUT - Update purchase order
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'grn.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Purchase order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const purchaseOrders = db.collection('flooring_purchase_orders')

    const po = await purchaseOrders.findOne({ id })
    if (!po) return errorResponse('Purchase order not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'submit_for_approval':
        if (po.status !== 'draft') {
          return errorResponse('Only draft POs can be submitted', 400)
        }
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'pending_approval', submittedAt: now, submittedBy: user.id, updatedAt: now },
          $push: { statusHistory: { status: 'pending_approval', timestamp: now, by: user.id, notes: 'Submitted for approval' } }
        })
        return successResponse({ message: 'PO submitted for approval' })

      case 'approve':
        if (po.status !== 'pending_approval') {
          return errorResponse('PO is not pending approval', 400)
        }
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'approved', approvalStatus: 'approved', approvedAt: now, approvedBy: user.id, updatedAt: now },
          $push: { statusHistory: { status: 'approved', timestamp: now, by: user.id, notes: updates.approvalNotes || 'Approved' } }
        })
        return successResponse({ message: 'PO approved' })

      case 'reject':
        if (po.status !== 'pending_approval') {
          return errorResponse('PO is not pending approval', 400)
        }
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'draft', approvalStatus: 'rejected', rejectedAt: now, rejectedBy: user.id, rejectionReason: updates.reason, updatedAt: now },
          $push: { statusHistory: { status: 'rejected', timestamp: now, by: user.id, notes: updates.reason || 'Rejected' } }
        })
        return successResponse({ message: 'PO rejected' })

      case 'send':
        if (!['approved', 'draft'].includes(po.status)) {
          return errorResponse('PO must be approved before sending', 400)
        }
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'sent', sentAt: now, sentBy: user.id, updatedAt: now },
          $push: { statusHistory: { status: 'sent', timestamp: now, by: user.id, notes: 'Sent to vendor' } }
        })
        return successResponse({ message: 'PO sent to vendor' })

      case 'acknowledge':
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'acknowledged', acknowledgedAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'acknowledged', timestamp: now, by: user.id, notes: 'Vendor acknowledged' } }
        })
        return successResponse({ message: 'Vendor acknowledgment recorded' })

      case 'receive_partial':
        // Called by GRN API when goods are received
        const { grnId, grnNumber, receivedItems, receivedValue } = updates
        
        // Update item quantities
        const updatedItems = po.items.map(item => {
          const receivedItem = receivedItems?.find(r => r.lineNumber === item.lineNumber)
          if (receivedItem) {
            const newReceived = (item.receivedQuantity || 0) + receivedItem.quantity
            return {
              ...item,
              receivedQuantity: newReceived,
              pendingQuantity: item.quantity - newReceived,
              status: newReceived >= item.quantity ? 'received' : 'partial'
            }
          }
          return item
        })

        const allReceived = updatedItems.every(i => i.status === 'received')
        const newReceivedValue = (po.receivedValue || 0) + (receivedValue || 0)

        await purchaseOrders.updateOne({ id }, {
          $set: {
            items: updatedItems,
            receivedValue: newReceivedValue,
            status: allReceived ? 'received' : 'partially_received',
            updatedAt: now
          },
          $push: {
            linkedGRNs: { grnId, grnNumber, date: now, value: receivedValue },
            statusHistory: { status: allReceived ? 'received' : 'partially_received', timestamp: now, by: user.id, notes: `GRN ${grnNumber} received` }
          }
        })

        return successResponse({ message: 'PO updated with GRN', fullyReceived: allReceived })

      case 'link_bill':
        // Called by Vendor Bills API
        const { billId, billNumber, billAmount } = updates
        const newBilledValue = (po.billedValue || 0) + (billAmount || 0)
        const fullyBilled = newBilledValue >= po.grandTotal

        await purchaseOrders.updateOne({ id }, {
          $set: {
            billedValue: newBilledValue,
            status: fullyBilled ? 'billed' : po.status,
            updatedAt: now
          },
          $push: {
            linkedBills: { billId, billNumber, date: now, amount: billAmount }
          }
        })

        return successResponse({ message: 'Bill linked to PO' })

      case 'close':
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'closed', closedAt: now, closedBy: user.id, closeReason: updates.reason, updatedAt: now },
          $push: { statusHistory: { status: 'closed', timestamp: now, by: user.id, notes: updates.reason || 'Closed' } }
        })
        return successResponse({ message: 'PO closed' })

      case 'cancel':
        if (['received', 'billed', 'closed'].includes(po.status)) {
          return errorResponse('Cannot cancel PO in current status', 400)
        }
        await purchaseOrders.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, cancelReason: updates.reason, updatedAt: now },
          $push: { statusHistory: { status: 'cancelled', timestamp: now, by: user.id, notes: updates.reason || 'Cancelled' } }
        })
        return successResponse({ message: 'PO cancelled' })

      default:
        // Regular update (only for draft POs)
        if (po.status !== 'draft') {
          return errorResponse('Can only edit draft POs', 400)
        }
        
        updates.updatedAt = now
        updates.updatedBy = user.id

        await purchaseOrders.updateOne({ id }, { $set: updates })
        const updated = await purchaseOrders.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Purchase Orders PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update purchase order', 500, error.message)
  }
}

// DELETE - Delete purchase order (only draft)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'grn.create')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Purchase order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const purchaseOrders = db.collection('flooring_purchase_orders')

    const po = await purchaseOrders.findOne({ id })
    if (!po) return errorResponse('Purchase order not found', 404)

    if (po.status !== 'draft') {
      return errorResponse('Only draft POs can be deleted', 400)
    }

    await purchaseOrders.deleteOne({ id })
    await logAccess(user, 'delete', 'purchase_order', { poId: id })

    return successResponse({ message: 'Purchase order deleted' })
  } catch (error) {
    console.error('Purchase Orders DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete purchase order', 500, error.message)
  }
}
