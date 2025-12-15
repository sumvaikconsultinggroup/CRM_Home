import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch dealers/distributors
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const territory = searchParams.get('territory')
    const type = searchParams.get('type') // dealer, distributor, retailer
    const search = searchParams.get('search')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('paints_dealers')

    // Single dealer fetch
    if (id) {
      const dealer = await dealers.findOne({ id })
      if (!dealer) {
        return errorResponse('Dealer not found', 404)
      }
      return successResponse({ dealer: sanitizeDocument(dealer) })
    }

    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (territory) filter.territory = territory
    if (type) filter.type = type
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const result = await dealers.find(filter).sort({ name: 1 }).toArray()

    // Calculate summary stats
    const stats = {
      total: result.length,
      active: result.filter(d => d.status === 'active').length,
      inactive: result.filter(d => d.status !== 'active').length,
      totalCreditLimit: result.reduce((sum, d) => sum + (d.creditLimit || 0), 0),
      totalOutstanding: result.reduce((sum, d) => sum + (d.outstandingAmount || 0), 0)
    }

    return successResponse({ 
      dealers: sanitizeDocuments(result),
      stats
    })
  } catch (error) {
    console.error('Dealers GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch dealers', 500, error.message)
  }
}

// POST - Create dealer
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      name,
      code,
      type,
      contactPerson,
      email,
      phone,
      address,
      territory,
      gst,
      pan,
      creditLimit,
      paymentTerms,
      priceListId,
      schemeEligibility,
      bankDetails
    } = body

    if (!name) {
      return errorResponse('Dealer name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('paints_dealers')

    // Generate dealer code if not provided
    const dealerCode = code || `DLR-${Date.now().toString(36).toUpperCase()}`

    // Check for duplicate code
    const existing = await dealers.findOne({ code: dealerCode })
    if (existing) {
      return errorResponse('Dealer code already exists', 400)
    }

    const now = new Date().toISOString()
    const dealer = {
      id: uuidv4(),
      code: dealerCode,
      name,
      type: type || 'dealer', // dealer, distributor, retailer
      contactPerson: contactPerson || '',
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
      territory: territory || '',
      
      // Tax info
      gst: gst || '',
      pan: pan || '',
      
      // Credit & Payment
      creditLimit: creditLimit || 0,
      availableCredit: creditLimit || 0,
      outstandingAmount: 0,
      paymentTerms: paymentTerms || 30, // days
      
      // Pricing
      priceListId: priceListId || 'default',
      discountPercentage: 0,
      
      // Schemes
      schemeEligibility: schemeEligibility || [],
      earnedRebates: 0,
      claimedRebates: 0,
      
      // Bank details
      bankDetails: bankDetails || {
        bankName: '',
        accountNumber: '',
        ifsc: '',
        accountName: ''
      },
      
      // Performance tracking
      totalOrders: 0,
      totalOrderValue: 0,
      lastOrderDate: null,
      
      // Status
      status: 'active',
      
      // Metadata
      clientId: user.clientId,
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await dealers.insertOne(dealer)

    return successResponse({ dealer: sanitizeDocument(dealer) }, 201)
  } catch (error) {
    console.error('Dealers POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create dealer', 500, error.message)
  }
}

// PUT - Update dealer
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) {
      return errorResponse('Dealer ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('paints_dealers')

    const existing = await dealers.findOne({ id })
    if (!existing) {
      return errorResponse('Dealer not found', 404)
    }

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'adjust_credit') {
      const { amount, reason } = updateData
      const newAvailableCredit = (existing.availableCredit || 0) + amount
      
      await dealers.updateOne(
        { id },
        { 
          $set: { 
            availableCredit: newAvailableCredit,
            updatedAt: now 
          },
          $push: {
            creditHistory: {
              date: now,
              amount,
              reason,
              by: user.id,
              balanceAfter: newAvailableCredit
            }
          }
        }
      )
      return successResponse({ message: 'Credit adjusted', newBalance: newAvailableCredit })
    }

    if (action === 'update_outstanding') {
      const { amount, invoiceId, type } = updateData // type: 'add' or 'reduce'
      const newOutstanding = type === 'add' 
        ? (existing.outstandingAmount || 0) + amount
        : (existing.outstandingAmount || 0) - amount
      
      await dealers.updateOne(
        { id },
        { 
          $set: { 
            outstandingAmount: Math.max(0, newOutstanding),
            availableCredit: existing.creditLimit - Math.max(0, newOutstanding),
            updatedAt: now 
          }
        }
      )
      return successResponse({ message: 'Outstanding updated', newOutstanding: Math.max(0, newOutstanding) })
    }

    // Regular update
    await dealers.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now, updatedBy: user.id } }
    )

    const updated = await dealers.findOne({ id })
    return successResponse({ dealer: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Dealers PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update dealer', 500, error.message)
  }
}

// DELETE - Deactivate dealer
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Dealer ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dealers = db.collection('paints_dealers')

    // Check for outstanding amount
    const dealer = await dealers.findOne({ id })
    if (dealer?.outstandingAmount > 0) {
      return errorResponse(`Cannot deactivate dealer with outstanding amount of ₹${dealer.outstandingAmount}`, 400)
    }

    await dealers.updateOne(
      { id },
      { $set: { status: 'inactive', deactivatedAt: new Date().toISOString(), deactivatedBy: user.id } }
    )

    return successResponse({ message: 'Dealer deactivated' })
  } catch (error) {
    console.error('Dealers DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to deactivate dealer', 500, error.message)
  }
}
