import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate quote number
const generateQuoteNumber = async (db) => {
  const quotes = db.collection('furniture_quotations')
  const count = await quotes.countDocuments() + 1
  const year = new Date().getFullYear()
  return `FQ-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch quotations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const requirementId = searchParams.get('requirementId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('furniture_quotations')

    if (id) {
      const quote = await quotes.findOne({ id })
      if (!quote) return errorResponse('Quotation not found', 404)
      return successResponse(sanitizeDocument(quote))
    }

    const query = { isActive: true }
    if (requirementId) query.requirementId = requirementId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { quoteNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts] = await Promise.all([
      quotes.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      quotes.countDocuments(query),
      quotes.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$grandTotal' } } }
      ]).toArray()
    ])

    return successResponse({
      quotations: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, value: s.value } }), {})
    })
  } catch (error) {
    console.error('Furniture Quotations GET Error:', error)
    return errorResponse('Failed to fetch quotations', 500, error.message)
  }
}

// POST - Create quotation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('furniture_quotations')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const quoteId = uuidv4()
    const quoteNumber = await generateQuoteNumber(db)

    // Get requirement info if linked
    let requirementInfo = {}
    if (body.requirementId) {
      const req = await db.collection('furniture_requirements').findOne({ id: body.requirementId })
      if (req) {
        requirementInfo = {
          requirementNumber: req.requirementNumber,
          customer: req.customer
        }
      }
    }

    // Calculate line items
    const lineItems = (body.lineItems || []).map((item, idx) => {
      const materialCost = item.materialCost || 0
      const laborCost = item.laborCost || 0
      const hardwareCost = item.hardwareCost || 0
      const baseCost = materialCost + laborCost + hardwareCost
      const markup = item.markupPercent ? (baseCost * item.markupPercent / 100) : 0
      const unitPrice = baseCost + markup
      const lineTotal = unitPrice * (item.quantity || 1)

      return {
        id: uuidv4(),
        lineNumber: idx + 1,
        // Product info
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        category: item.category,
        // Specs
        description: item.description || '',
        dimensions: item.dimensions || {},
        specifications: item.specifications || {},
        customizations: item.customizations || [],
        // Costing breakdown
        materialCost,
        laborCost,
        hardwareCost,
        baseCost,
        markupPercent: item.markupPercent || 25,
        markup,
        // Pricing
        unitPrice,
        quantity: item.quantity || 1,
        unitOfMeasure: item.unitOfMeasure || 'piece',
        lineTotal,
        // Lead time
        leadTime: item.leadTime || 15
      }
    })

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const discountPercent = body.discountPercent || 0
    const discountAmount = subtotal * discountPercent / 100
    const afterDiscount = subtotal - discountAmount
    const taxPercent = body.taxPercent || 18 // GST
    const taxAmount = afterDiscount * taxPercent / 100
    const grandTotal = afterDiscount + taxAmount

    const quote = {
      id: quoteId,
      quoteNumber,
      version: 1,
      // Links
      requirementId: body.requirementId || null,
      projectId: body.projectId || null,
      designBriefId: body.designBriefId || null,
      // Customer
      customer: body.customer || requirementInfo.customer || {},
      // Line items
      lineItems,
      // Summary
      subtotal,
      discountPercent,
      discountAmount,
      afterDiscount,
      taxPercent,
      taxAmount,
      grandTotal,
      // Terms
      validUntil: body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: body.paymentTerms || {
        advance: 50,
        onDelivery: 40,
        afterInstallation: 10
      },
      deliveryTerms: body.deliveryTerms || '',
      warrantyTerms: body.warrantyTerms || '1 year manufacturing defect warranty',
      terms: body.terms || [],
      // Status
      status: 'draft', // draft, internal_review, sent, negotiation, accepted, rejected, expired, converted
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      // Tracking
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Quotation created'
      }],
      versionHistory: [],
      // Assignment
      preparedBy: body.preparedBy || user.id,
      approvers: body.approvers || [],
      // Attachments
      attachments: body.attachments || [],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await quotes.insertOne(quote)

    await events.insertOne({
      id: uuidv4(),
      type: 'quotation.created',
      entityType: 'quotation',
      entityId: quoteId,
      data: { quoteNumber, grandTotal, customer: quote.customer?.name },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(quote), 201)
  } catch (error) {
    console.error('Furniture Quotations POST Error:', error)
    return errorResponse('Failed to create quotation', 500, error.message)
  }
}

// PUT - Update quotation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Quote ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('furniture_quotations')
    const requirements = db.collection('furniture_requirements')
    const events = db.collection('furniture_events')

    const quote = await quotes.findOne({ id })
    if (!quote) return errorResponse('Quotation not found', 404)

    const now = new Date().toISOString()

    // Handle actions
    if (action === 'submit_for_review') {
      await quotes.updateOne(
        { id },
        {
          $set: { status: 'internal_review', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'internal_review',
              timestamp: now,
              by: user.id,
              notes: 'Submitted for internal review'
            }
          }
        }
      )
      return successResponse({ message: 'Submitted for review', status: 'internal_review' })
    }

    if (action === 'approve') {
      await quotes.updateOne(
        { id },
        {
          $set: { status: 'approved', approvedAt: now, approvedBy: user.id, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'approved',
              timestamp: now,
              by: user.id,
              notes: body.notes || 'Internally approved'
            }
          }
        }
      )
      return successResponse({ message: 'Quote approved', status: 'approved' })
    }

    if (action === 'send_to_customer') {
      await quotes.updateOne(
        { id },
        {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'sent',
              timestamp: now,
              by: user.id,
              notes: 'Sent to customer'
            }
          }
        }
      )

      // Update requirement status
      if (quote.requirementId) {
        await requirements.updateOne(
          { id: quote.requirementId },
          {
            $set: { status: 'quote_sent', updatedAt: now },
            $push: {
              statusHistory: {
                status: 'quote_sent',
                timestamp: now,
                by: user.id,
                notes: `Quote ${quote.quoteNumber} sent`
              }
            }
          }
        )
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'quotation.sent',
        entityType: 'quotation',
        entityId: id,
        data: { quoteNumber: quote.quoteNumber },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Quote sent', status: 'sent' })
    }

    if (action === 'accept') {
      await quotes.updateOne(
        { id },
        {
          $set: { status: 'accepted', acceptedAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'accepted',
              timestamp: now,
              by: user.id,
              notes: body.notes || 'Customer accepted'
            }
          }
        }
      )

      // Update requirement status
      if (quote.requirementId) {
        await requirements.updateOne(
          { id: quote.requirementId },
          {
            $set: { status: 'approved', updatedAt: now },
            $push: {
              statusHistory: {
                status: 'approved',
                timestamp: now,
                by: user.id,
                notes: `Quote ${quote.quoteNumber} accepted by customer`
              }
            }
          }
        )
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'quotation.accepted',
        entityType: 'quotation',
        entityId: id,
        data: { quoteNumber: quote.quoteNumber, grandTotal: quote.grandTotal },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Quote accepted', status: 'accepted' })
    }

    if (action === 'reject') {
      await quotes.updateOne(
        { id },
        {
          $set: { status: 'rejected', rejectedAt: now, rejectionReason: body.reason || '', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'rejected',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Quote rejected'
            }
          }
        }
      )
      return successResponse({ message: 'Quote rejected', status: 'rejected' })
    }

    if (action === 'create_revision') {
      // Save current version
      const newVersion = quote.version + 1
      const versionSnapshot = { ...quote, versionNumber: quote.version, savedAt: now }
      delete versionSnapshot.versionHistory

      // Update with new values
      await quotes.updateOne(
        { id },
        {
          $set: { 
            ...updateData, 
            version: newVersion, 
            status: 'draft',
            updatedAt: now 
          },
          $push: {
            versionHistory: versionSnapshot,
            statusHistory: {
              status: 'draft',
              timestamp: now,
              by: user.id,
              notes: `Revision ${newVersion} created`
            }
          }
        }
      )

      return successResponse({ message: 'Revision created', version: newVersion })
    }

    // Regular update (only for draft quotes)
    if (!['draft', 'internal_review'].includes(quote.status)) {
      return errorResponse('Cannot edit quote in current status', 400)
    }

    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await quotes.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Quotations PUT Error:', error)
    return errorResponse('Failed to update quotation', 500, error.message)
  }
}

// DELETE - Delete quotation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Quote ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('furniture_quotations')

    const quote = await quotes.findOne({ id })
    if (!quote) return errorResponse('Quotation not found', 404)

    if (!['draft', 'rejected'].includes(quote.status)) {
      return errorResponse('Cannot delete quote in current status', 400)
    }

    await quotes.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Quotation deleted' })
  } catch (error) {
    console.error('Furniture Quotations DELETE Error:', error)
    return errorResponse('Failed to delete quotation', 500, error.message)
  }
}
