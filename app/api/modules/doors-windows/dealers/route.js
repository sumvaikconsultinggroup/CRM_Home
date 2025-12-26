/**
 * =====================================================
 * D&W MODULE - DEALER NETWORK API
 * =====================================================
 * 
 * Enterprise-grade B2B dealer management for Manufacturers.
 * Dealers are onboarded from CRM customers with type='dealer'.
 * 
 * Features:
 * - Dealer onboarding with approval workflow
 * - Tiered pricing (Bronze, Silver, Gold, Platinum)
 * - Credit limits and credit utilization tracking
 * - Default price list assignment
 * - Dealer performance metrics
 * - Territory management
 * - Commission tracking
 */

import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Dealer Tiers with benefits
const DEALER_TIERS = [
  {
    id: 'bronze',
    name: 'Bronze',
    minOrderValue: 0,
    discountPercent: 5,
    creditDays: 15,
    creditLimitMultiplier: 1,
    prioritySupport: false,
    benefits: ['Basic support', '5% discount']
  },
  {
    id: 'silver',
    name: 'Silver',
    minOrderValue: 500000, // 5 Lakhs
    discountPercent: 10,
    creditDays: 30,
    creditLimitMultiplier: 1.5,
    prioritySupport: false,
    benefits: ['Standard support', '10% discount', '30 day credit']
  },
  {
    id: 'gold',
    name: 'Gold',
    minOrderValue: 2500000, // 25 Lakhs
    discountPercent: 15,
    creditDays: 45,
    creditLimitMultiplier: 2,
    prioritySupport: true,
    benefits: ['Priority support', '15% discount', '45 day credit', 'Dedicated account manager']
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minOrderValue: 10000000, // 1 Crore
    discountPercent: 20,
    creditDays: 60,
    creditLimitMultiplier: 3,
    prioritySupport: true,
    benefits: ['24/7 Priority support', '20% discount', '60 day credit', 'Dedicated team', 'Custom pricing']
  }
]

// Dealer Status
const DEALER_STATUS = ['pending_approval', 'active', 'suspended', 'terminated', 'inactive']

// GET - Fetch dealers
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const dealerId = searchParams.get('id')
    const tier = searchParams.get('tier')
    const status = searchParams.get('status')
    const territory = searchParams.get('territory')
    const search = searchParams.get('search')
    const withStats = searchParams.get('withStats') === 'true'
    const pendingApproval = searchParams.get('pendingApproval') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('dw_dealers')
    const orders = db.collection('dw_orders')
    const invoices = db.collection('dw_invoices')

    if (dealerId) {
      const dealer = await dealers.findOne({ id: dealerId })
      if (!dealer) return errorResponse('Dealer not found', 404)

      // Enrich with stats
      if (withStats) {
        const [orderStats, invoiceStats] = await Promise.all([
          orders.aggregate([
            { $match: { dealerId } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$grandTotal' } } }
          ]).toArray(),
          invoices.aggregate([
            { $match: { dealerId } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, paid: { $sum: '$paidAmount' } } }
          ]).toArray()
        ])

        dealer.stats = {
          totalOrders: orderStats[0]?.count || 0,
          totalOrderValue: orderStats[0]?.total || 0,
          totalInvoiced: invoiceStats[0]?.total || 0,
          totalPaid: invoiceStats[0]?.paid || 0,
          outstanding: (invoiceStats[0]?.total || 0) - (invoiceStats[0]?.paid || 0),
          creditUtilization: dealer.creditLimit > 0 
            ? Math.round(((invoiceStats[0]?.total || 0) - (invoiceStats[0]?.paid || 0)) / dealer.creditLimit * 100)
            : 0
        }
      }

      return successResponse({
        dealer: sanitizeDocument(dealer),
        tiers: DEALER_TIERS
      })
    }

    // Build query
    const query = {}
    if (tier) query.tier = tier
    if (status) query.status = status
    if (territory) query.territory = territory
    if (pendingApproval) query.status = 'pending_approval'
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { dealerCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      dealers.find(query).sort({ companyName: 1 }).skip(skip).limit(limit).toArray(),
      dealers.countDocuments(query)
    ])

    // Calculate summary
    const allDealers = await dealers.find({}).toArray()
    const summary = {
      totalDealers: allDealers.length,
      byTier: DEALER_TIERS.reduce((acc, t) => {
        acc[t.id] = allDealers.filter(d => d.tier === t.id).length
        return acc
      }, {}),
      byStatus: DEALER_STATUS.reduce((acc, s) => {
        acc[s] = allDealers.filter(d => d.status === s).length
        return acc
      }, {}),
      pendingApprovals: allDealers.filter(d => d.status === 'pending_approval').length,
      totalCreditLimit: allDealers.reduce((sum, d) => sum + (d.creditLimit || 0), 0),
      totalCreditUsed: allDealers.reduce((sum, d) => sum + (d.creditUsed || 0), 0)
    }

    return successResponse({
      dealers: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary,
      tiers: DEALER_TIERS,
      statuses: DEALER_STATUS
    })
  } catch (error) {
    console.error('DW Dealers GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch dealers', 500, error.message)
  }
}

// POST - Create dealer or perform actions
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('dw_dealers')

    const now = new Date().toISOString()

    // Onboard dealer from CRM customer
    if (action === 'onboard_from_crm') {
      const { customerId, customerData } = body

      // Check if already exists
      const existing = await dealers.findOne({ crmCustomerId: customerId })
      if (existing) {
        return errorResponse('Dealer already onboarded from this customer', 400)
      }

      // Generate dealer code
      const count = await dealers.countDocuments()
      const dealerCode = `DLR-${String(count + 1).padStart(4, '0')}`

      const dealer = {
        id: uuidv4(),
        dealerCode,
        clientId: user.clientId,
        crmCustomerId: customerId,
        
        // Company Info
        companyName: customerData.companyName || customerData.name,
        tradeName: customerData.tradeName || '',
        legalName: customerData.legalName || customerData.companyName,
        
        // Contact
        contactPerson: customerData.contactPerson || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        alternatePhone: customerData.alternatePhone || '',
        
        // Address
        address: customerData.address || {},
        territory: customerData.territory || customerData.address?.city || '',
        region: customerData.region || customerData.address?.state || '',
        
        // Tax & Legal
        gstNumber: customerData.gstNumber || '',
        panNumber: customerData.panNumber || '',
        cinNumber: customerData.cinNumber || '',
        
        // Tier & Pricing
        tier: 'bronze', // Start with bronze
        priceListId: null, // Will be assigned after approval
        customDiscountPercent: 0,
        
        // Credit
        creditLimit: parseFloat(body.initialCreditLimit) || 100000, // 1 Lakh default
        creditUsed: 0,
        creditAvailable: parseFloat(body.initialCreditLimit) || 100000,
        creditDays: DEALER_TIERS.find(t => t.id === 'bronze').creditDays,
        
        // Status & Workflow
        status: 'pending_approval',
        approvalWorkflow: {
          submittedAt: now,
          submittedBy: user.id,
          approvedAt: null,
          approvedBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null
        },
        
        // Documents (to be uploaded)
        documents: {
          gstCertificate: null,
          panCard: null,
          addressProof: null,
          bankDetails: null,
          authorizationLetter: null
        },
        
        // Bank Details
        bankDetails: customerData.bankDetails || {
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          accountType: 'current'
        },
        
        // Settings
        settings: {
          autoInvoice: false,
          requirePONumber: true,
          allowPartialPayment: true,
          sendInvoiceReminders: true,
          reminderDays: [7, 3, 1, 0] // Days before due
        },
        
        // Performance metrics (updated by triggers)
        metrics: {
          totalOrders: 0,
          totalOrderValue: 0,
          avgOrderValue: 0,
          lastOrderDate: null,
          onTimePaymentRate: 0,
          returnRate: 0
        },
        
        // Commission (if applicable)
        commissionRate: 0,
        commissionEarned: 0,
        commissionPaid: 0,
        
        notes: body.notes || '',
        tags: body.tags || [],
        
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await dealers.insertOne(dealer)

      return successResponse({
        dealer: sanitizeDocument(dealer),
        message: 'Dealer onboarded, pending approval'
      }, 201)
    }

    // Create dealer directly
    if (action === 'create' || !action) {
      const { companyName, email, phone, gstNumber } = body

      if (!companyName) {
        return errorResponse('Company name is required', 400)
      }

      // Check for duplicate
      const existing = await dealers.findOne({
        $or: [
          { companyName: { $regex: `^${companyName}$`, $options: 'i' } },
          ...(gstNumber ? [{ gstNumber }] : [])
        ]
      })
      if (existing) {
        return errorResponse('Dealer with this name or GST already exists', 400)
      }

      const count = await dealers.countDocuments()
      const dealerCode = `DLR-${String(count + 1).padStart(4, '0')}`

      const dealer = {
        id: uuidv4(),
        dealerCode,
        clientId: user.clientId,
        crmCustomerId: null,
        companyName,
        tradeName: body.tradeName || '',
        legalName: body.legalName || companyName,
        contactPerson: body.contactPerson || '',
        email: email || '',
        phone: phone || '',
        alternatePhone: body.alternatePhone || '',
        address: body.address || {},
        territory: body.territory || '',
        region: body.region || '',
        gstNumber: gstNumber || '',
        panNumber: body.panNumber || '',
        tier: body.tier || 'bronze',
        priceListId: body.priceListId || null,
        customDiscountPercent: parseFloat(body.customDiscountPercent) || 0,
        creditLimit: parseFloat(body.creditLimit) || 100000,
        creditUsed: 0,
        creditAvailable: parseFloat(body.creditLimit) || 100000,
        creditDays: DEALER_TIERS.find(t => t.id === (body.tier || 'bronze')).creditDays,
        status: body.autoApprove ? 'active' : 'pending_approval',
        approvalWorkflow: {
          submittedAt: now,
          submittedBy: user.id,
          approvedAt: body.autoApprove ? now : null,
          approvedBy: body.autoApprove ? user.id : null
        },
        documents: { gstCertificate: null, panCard: null, addressProof: null, bankDetails: null, authorizationLetter: null },
        bankDetails: body.bankDetails || { bankName: '', accountNumber: '', ifscCode: '', accountType: 'current' },
        settings: {
          autoInvoice: false,
          requirePONumber: true,
          allowPartialPayment: true,
          sendInvoiceReminders: true,
          reminderDays: [7, 3, 1, 0]
        },
        metrics: { totalOrders: 0, totalOrderValue: 0, avgOrderValue: 0, lastOrderDate: null, onTimePaymentRate: 0, returnRate: 0 },
        commissionRate: parseFloat(body.commissionRate) || 0,
        commissionEarned: 0,
        commissionPaid: 0,
        notes: body.notes || '',
        tags: body.tags || [],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await dealers.insertOne(dealer)

      return successResponse({
        dealer: sanitizeDocument(dealer),
        message: body.autoApprove ? 'Dealer created and approved' : 'Dealer created, pending approval'
      }, 201)
    }

    // Create dealer from D&W Project (Single Source of Truth)
    if (action === 'create_from_project') {
      const { projectId, companyName, contactPerson, email, phone, territory, tier, autoApprove } = body

      if (!projectId) {
        return errorResponse('Project ID is required', 400)
      }

      if (!companyName) {
        return errorResponse('Company name is required', 400)
      }

      // Check if project is already linked to a dealer
      const projects = db.collection('doors_windows_projects')
      const project = await projects.findOne({ id: projectId })
      
      if (!project) {
        return errorResponse('Project not found', 404)
      }

      if (project.dealerId) {
        return errorResponse('Project is already linked to a dealer', 400)
      }

      // Check for duplicate dealer
      const existingDealer = await dealers.findOne({
        $or: [
          { companyName: { $regex: `^${companyName}$`, $options: 'i' } },
          { sourceProjectId: projectId }
        ]
      })
      if (existingDealer) {
        // Link existing dealer to project
        await projects.updateOne({ id: projectId }, {
          $set: { 
            dealerId: existingDealer.id, 
            customerType: 'dealer',
            updatedAt: now 
          }
        })
        return successResponse({
          dealer: sanitizeDocument(existingDealer),
          message: 'Project linked to existing dealer',
          linked: true
        })
      }

      // Generate dealer code
      const count = await dealers.countDocuments()
      const dealerCode = `DLR-${String(count + 1).padStart(4, '0')}`
      const tierData = DEALER_TIERS.find(t => t.id === (tier || 'bronze'))

      const dealer = {
        id: uuidv4(),
        dealerCode,
        clientId: user.clientId,
        sourceProjectId: projectId, // Link to project
        crmCustomerId: project.crmCustomerId || project.syncedFrom?.crmId || null,
        companyName,
        tradeName: '',
        legalName: companyName,
        contactPerson: contactPerson || project.contactPerson || '',
        email: email || project.contactEmail || '',
        phone: phone || project.contactPhone || '',
        alternatePhone: '',
        address: project.siteAddress ? { line1: project.siteAddress } : {},
        territory: territory || '',
        region: '',
        gstNumber: '',
        panNumber: '',
        tier: tier || 'bronze',
        priceListId: null,
        customDiscountPercent: 0,
        creditLimit: 100000,
        creditUsed: 0,
        creditAvailable: 100000,
        creditDays: tierData.creditDays,
        status: autoApprove ? 'active' : 'pending_approval',
        approvalWorkflow: {
          submittedAt: now,
          submittedBy: user.id,
          approvedAt: autoApprove ? now : null,
          approvedBy: autoApprove ? user.id : null
        },
        documents: { gstCertificate: null, panCard: null, addressProof: null, bankDetails: null, authorizationLetter: null },
        bankDetails: { bankName: '', accountNumber: '', ifscCode: '', accountType: 'current' },
        settings: {
          autoInvoice: false,
          requirePONumber: true,
          allowPartialPayment: true,
          sendInvoiceReminders: true,
          reminderDays: [7, 3, 1, 0]
        },
        metrics: { totalOrders: 0, totalOrderValue: 0, avgOrderValue: 0, lastOrderDate: null, onTimePaymentRate: 0, returnRate: 0 },
        commissionRate: 0,
        commissionEarned: 0,
        commissionPaid: 0,
        notes: `Created from project: ${project.name || project.siteName}`,
        tags: ['from-project'],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await dealers.insertOne(dealer)

      // Update project with dealer link (Single Source of Truth)
      await projects.updateOne({ id: projectId }, {
        $set: {
          dealerId: dealer.id,
          customerType: 'dealer',
          updatedAt: now
        }
      })

      return successResponse({
        dealer: sanitizeDocument(dealer),
        message: autoApprove ? 'Dealer created from project and approved' : 'Dealer created from project, pending approval'
      }, 201)
    }

    // Approve dealer
    if (action === 'approve') {
      const { dealerId, priceListId, creditLimit, tier } = body

      if (!dealerId) return errorResponse('Dealer ID required', 400)

      const dealer = await dealers.findOne({ id: dealerId })
      if (!dealer) return errorResponse('Dealer not found', 404)

      if (dealer.status !== 'pending_approval') {
        return errorResponse('Dealer is not pending approval', 400)
      }

      const tierData = DEALER_TIERS.find(t => t.id === (tier || dealer.tier))
      const newCreditLimit = creditLimit || dealer.creditLimit

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          status: 'active',
          tier: tier || dealer.tier,
          priceListId: priceListId || null,
          creditLimit: newCreditLimit,
          creditAvailable: newCreditLimit - dealer.creditUsed,
          creditDays: tierData.creditDays,
          'approvalWorkflow.approvedAt': now,
          'approvalWorkflow.approvedBy': user.id,
          updatedAt: now
        }
      })

      return successResponse({ message: 'Dealer approved and activated' })
    }

    // Reject dealer
    if (action === 'reject') {
      const { dealerId, reason } = body

      if (!dealerId) return errorResponse('Dealer ID required', 400)

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          status: 'inactive',
          'approvalWorkflow.rejectedAt': now,
          'approvalWorkflow.rejectedBy': user.id,
          'approvalWorkflow.rejectionReason': reason || 'Not approved',
          updatedAt: now
        }
      })

      return successResponse({ message: 'Dealer application rejected' })
    }

    // Update credit limit
    if (action === 'update_credit') {
      const { dealerId, newCreditLimit, reason } = body

      if (!dealerId || newCreditLimit === undefined) {
        return errorResponse('Dealer ID and new credit limit required', 400)
      }

      const dealer = await dealers.findOne({ id: dealerId })
      if (!dealer) return errorResponse('Dealer not found', 404)

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          creditLimit: newCreditLimit,
          creditAvailable: newCreditLimit - dealer.creditUsed,
          updatedAt: now
        },
        $push: {
          creditHistory: {
            previousLimit: dealer.creditLimit,
            newLimit: newCreditLimit,
            changedAt: now,
            changedBy: user.id,
            reason: reason || 'Credit limit adjustment'
          }
        }
      })

      return successResponse({ message: 'Credit limit updated' })
    }

    // Upgrade/downgrade tier
    if (action === 'change_tier') {
      const { dealerId, newTier } = body

      if (!dealerId || !newTier) {
        return errorResponse('Dealer ID and new tier required', 400)
      }

      const tierData = DEALER_TIERS.find(t => t.id === newTier)
      if (!tierData) return errorResponse('Invalid tier', 400)

      const dealer = await dealers.findOne({ id: dealerId })
      if (!dealer) return errorResponse('Dealer not found', 404)

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          tier: newTier,
          creditDays: tierData.creditDays,
          updatedAt: now
        },
        $push: {
          tierHistory: {
            previousTier: dealer.tier,
            newTier,
            changedAt: now,
            changedBy: user.id
          }
        }
      })

      return successResponse({ 
        message: `Dealer upgraded to ${tierData.name}`,
        benefits: tierData.benefits
      })
    }

    // Suspend dealer
    if (action === 'suspend') {
      const { dealerId, reason } = body

      if (!dealerId) return errorResponse('Dealer ID required', 400)

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          status: 'suspended',
          suspendedAt: now,
          suspendedBy: user.id,
          suspensionReason: reason || 'Account suspended',
          updatedAt: now
        }
      })

      return successResponse({ message: 'Dealer suspended' })
    }

    // Reactivate dealer
    if (action === 'reactivate') {
      const { dealerId } = body

      if (!dealerId) return errorResponse('Dealer ID required', 400)

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          status: 'active',
          reactivatedAt: now,
          reactivatedBy: user.id,
          updatedAt: now
        },
        $unset: {
          suspendedAt: '',
          suspendedBy: '',
          suspensionReason: ''
        }
      })

      return successResponse({ message: 'Dealer reactivated' })
    }

    // Update credit usage (called by order/invoice APIs)
    if (action === 'update_credit_usage') {
      const { dealerId, amount, type } = body // type: 'use' or 'release'

      if (!dealerId || amount === undefined) {
        return errorResponse('Dealer ID and amount required', 400)
      }

      const dealer = await dealers.findOne({ id: dealerId })
      if (!dealer) return errorResponse('Dealer not found', 404)

      const changeAmount = type === 'use' ? amount : -amount
      const newUsed = Math.max(0, (dealer.creditUsed || 0) + changeAmount)
      const newAvailable = dealer.creditLimit - newUsed

      if (type === 'use' && newAvailable < 0) {
        return errorResponse('Insufficient credit available', 400)
      }

      await dealers.updateOne({ id: dealerId }, {
        $set: {
          creditUsed: newUsed,
          creditAvailable: newAvailable,
          updatedAt: now
        }
      })

      return successResponse({ 
        creditUsed: newUsed,
        creditAvailable: newAvailable
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Dealers POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to process dealer request', 500, error.message)
  }
}

// PUT - Update dealer
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Dealer ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('dw_dealers')

    const dealer = await dealers.findOne({ id })
    if (!dealer) return errorResponse('Dealer not found', 404)

    // Protect certain fields
    delete updates.creditUsed
    delete updates.metrics
    delete updates.approvalWorkflow

    updates.updatedAt = new Date().toISOString()
    updates.updatedBy = user.id

    await dealers.updateOne({ id }, { $set: updates })
    const updated = await dealers.findOne({ id })

    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('DW Dealers PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update dealer', 500, error.message)
  }
}

// DELETE - Terminate dealer
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Dealer ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('dw_dealers')
    const orders = db.collection('dw_orders')

    const dealer = await dealers.findOne({ id })
    if (!dealer) return errorResponse('Dealer not found', 404)

    // Check for active orders
    const activeOrders = await orders.countDocuments({
      dealerId: id,
      status: { $nin: ['completed', 'cancelled'] }
    })

    if (activeOrders > 0) {
      return errorResponse(`Cannot terminate dealer with ${activeOrders} active orders`, 400)
    }

    // Soft delete - mark as terminated
    await dealers.updateOne({ id }, {
      $set: {
        status: 'terminated',
        terminatedAt: new Date().toISOString(),
        terminatedBy: user.id
      }
    })

    return successResponse({ message: 'Dealer terminated' })
  } catch (error) {
    console.error('DW Dealers DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to terminate dealer', 500, error.message)
  }
}
