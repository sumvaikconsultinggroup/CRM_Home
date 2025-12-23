/**
 * =====================================================
 * FLOORING MODULE - VENDORS API (Consolidated)
 * =====================================================
 * 
 * Unified vendor management for the Flooring module.
 * Consolidates from wf_vendors to flooring_vendors.
 * Links vendors to POs, Bills, Payments, and GRNs.
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

// Vendor categories
const VENDOR_CATEGORIES = [
  'manufacturer', 'distributor', 'importer', 'wholesaler', 
  'transporter', 'contractor', 'installer', 'service_provider', 'other'
]

// Payment terms
const PAYMENT_TERMS = [
  { id: 'advance', name: 'Advance Payment', days: 0 },
  { id: 'cod', name: 'Cash on Delivery', days: 0 },
  { id: 'net7', name: 'Net 7 Days', days: 7 },
  { id: 'net15', name: 'Net 15 Days', days: 15 },
  { id: 'net30', name: 'Net 30 Days', days: 30 },
  { id: 'net45', name: 'Net 45 Days', days: 45 },
  { id: 'net60', name: 'Net 60 Days', days: 60 },
  { id: 'custom', name: 'Custom', days: null }
]

// GET - Fetch vendors
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'stock.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    const search = searchParams.get('search')
    const withStats = searchParams.get('withStats') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendors = db.collection('flooring_vendors')
    const vendorBills = db.collection('flooring_vendor_bills')
    const purchaseOrders = db.collection('flooring_purchase_orders')
    const vendorPayments = db.collection('flooring_vendor_payments')

    if (id) {
      const vendor = await vendors.findOne({ id })
      if (!vendor) return errorResponse('Vendor not found', 404)

      // Enrich with stats if requested
      if (withStats) {
        const [poCount, billsSum, paymentsSum] = await Promise.all([
          purchaseOrders.countDocuments({ vendorId: id }),
          vendorBills.aggregate([
            { $match: { vendorId: id } },
            { $group: { _id: null, total: { $sum: '$totalAmount' }, balance: { $sum: '$balanceAmount' } } }
          ]).toArray(),
          vendorPayments.aggregate([
            { $match: { vendorId: id } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).toArray()
        ])

        vendor.stats = {
          totalPurchaseOrders: poCount,
          totalBilled: billsSum[0]?.total || 0,
          totalOutstanding: billsSum[0]?.balance || 0,
          totalPaid: paymentsSum[0]?.total || 0
        }
      }

      return successResponse(sanitizeDocument(vendor))
    }

    // Build query
    const query = {}
    if (category) query.category = category
    if (active === 'true') query.active = true
    if (active === 'false') query.active = false
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      vendors.find(query).sort({ name: 1 }).skip(skip).limit(limit).toArray(),
      vendors.countDocuments(query)
    ])

    // Calculate summary
    const allVendors = await vendors.find({}).toArray()
    const summary = {
      totalVendors: allVendors.length,
      activeVendors: allVendors.filter(v => v.active !== false).length,
      byCategory: VENDOR_CATEGORIES.reduce((acc, cat) => {
        acc[cat] = allVendors.filter(v => v.category === cat).length
        return acc
      }, {})
    }

    return successResponse({
      vendors: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary,
      categories: VENDOR_CATEGORIES,
      paymentTerms: PAYMENT_TERMS
    })
  } catch (error) {
    console.error('Vendors GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch vendors', 500, error.message)
  }
}

// POST - Create vendor
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'stock.adjust')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { name, category, email, phone, address, gstNumber, panNumber,
            paymentTerms, bankDetails, contactPerson, notes } = body

    if (!name) {
      return errorResponse('Vendor name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendors = db.collection('flooring_vendors')

    // Check for duplicate
    const existing = await vendors.findOne({ 
      $or: [
        { name: { $regex: `^${name}$`, $options: 'i' } },
        ...(gstNumber ? [{ gstNumber }] : [])
      ]
    })
    if (existing) {
      return errorResponse('Vendor with this name or GST number already exists', 400)
    }

    // Generate vendor code
    const count = await vendors.countDocuments()
    const vendorCode = `VND-${String(count + 1).padStart(4, '0')}`

    const now = new Date().toISOString()
    const vendor = {
      id: uuidv4(),
      code: vendorCode,
      name,
      category: VENDOR_CATEGORIES.includes(category) ? category : 'other',
      email: email || '',
      phone: phone || '',
      address: address || {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      gstNumber: gstNumber || '',
      panNumber: panNumber || '',
      paymentTerms: paymentTerms || 'net30',
      creditLimit: body.creditLimit || 0,
      currentBalance: 0,
      bankDetails: bankDetails || {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountType: 'current',
        beneficiaryName: ''
      },
      contactPerson: contactPerson || {
        name: '',
        email: '',
        phone: '',
        designation: ''
      },
      notes: notes || '',
      rating: 0,
      active: true,
      tags: body.tags || [],
      // Financial summary (updated by triggers)
      totalPurchases: 0,
      totalPayments: 0,
      totalOutstanding: 0,
      lastPurchaseDate: null,
      lastPaymentDate: null,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await vendors.insertOne(vendor)
    await logAccess(user, 'create', 'vendor', { vendorId: vendor.id, vendorCode })

    return successResponse(sanitizeDocument(vendor), 201)
  } catch (error) {
    console.error('Vendors POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create vendor', 500, error.message)
  }
}

// PUT - Update vendor
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'stock.adjust')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Vendor ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendors = db.collection('flooring_vendors')

    const vendor = await vendors.findOne({ id })
    if (!vendor) return errorResponse('Vendor not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'deactivate':
        await vendors.updateOne({ id }, {
          $set: { active: false, deactivatedAt: now, deactivatedBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Vendor deactivated' })

      case 'activate':
        await vendors.updateOne({ id }, {
          $set: { active: true, updatedAt: now }
        })
        return successResponse({ message: 'Vendor activated' })

      case 'update_balance':
        // Called by vendor bills/payments APIs to update running balance
        const { adjustAmount, type } = updates
        const balanceChange = type === 'bill' ? adjustAmount : -adjustAmount
        await vendors.updateOne({ id }, {
          $inc: { 
            currentBalance: balanceChange,
            totalPurchases: type === 'bill' ? adjustAmount : 0,
            totalPayments: type === 'payment' ? adjustAmount : 0
          },
          $set: { 
            lastPurchaseDate: type === 'bill' ? now : vendor.lastPurchaseDate,
            lastPaymentDate: type === 'payment' ? now : vendor.lastPaymentDate,
            updatedAt: now 
          }
        })
        return successResponse({ message: 'Vendor balance updated' })

      case 'rate':
        const { rating } = updates
        if (rating < 1 || rating > 5) {
          return errorResponse('Rating must be between 1 and 5', 400)
        }
        await vendors.updateOne({ id }, {
          $set: { rating, ratedAt: now, ratedBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Vendor rated' })

      default:
        // Regular update
        if (updates.category && !VENDOR_CATEGORIES.includes(updates.category)) {
          return errorResponse('Invalid category', 400)
        }

        const updateData = {
          ...updates,
          updatedAt: now,
          updatedBy: user.id
        }
        // Don't allow updating financial fields directly
        delete updateData.totalPurchases
        delete updateData.totalPayments
        delete updateData.currentBalance

        await vendors.updateOne({ id }, { $set: updateData })
        const updated = await vendors.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Vendors PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update vendor', 500, error.message)
  }
}

// DELETE - Delete vendor (soft delete if has transactions)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'system.admin')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Vendor ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const vendors = db.collection('flooring_vendors')
    const purchaseOrders = db.collection('flooring_purchase_orders')
    const vendorBills = db.collection('flooring_vendor_bills')

    const vendor = await vendors.findOne({ id })
    if (!vendor) return errorResponse('Vendor not found', 404)

    // Check for transactions
    const [poCount, billCount] = await Promise.all([
      purchaseOrders.countDocuments({ vendorId: id }),
      vendorBills.countDocuments({ vendorId: id })
    ])

    if (poCount > 0 || billCount > 0) {
      // Soft delete
      await vendors.updateOne({ id }, {
        $set: { 
          active: false, 
          deleted: true, 
          deletedAt: new Date().toISOString(), 
          deletedBy: user.id 
        }
      })
      return successResponse({ message: 'Vendor deactivated (has transactions)' })
    }

    await vendors.deleteOne({ id })
    await logAccess(user, 'delete', 'vendor', { vendorId: id })

    return successResponse({ message: 'Vendor deleted' })
  } catch (error) {
    console.error('Vendors DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete vendor', 500, error.message)
  }
}
