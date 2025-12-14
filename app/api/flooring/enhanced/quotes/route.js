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
  const quotes = db.collection('flooring_quotes_v2')
  const count = await quotes.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `FLQ-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// GET - Fetch quotes with filters
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const leadId = searchParams.get('leadId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit')) || 100

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('flooring_quotes_v2')
    const rooms = db.collection('flooring_rooms')

    // Single quote with details
    if (id) {
      const quote = await quotes.findOne({ id })
      if (!quote) return errorResponse('Quote not found', 404)

      // Get rooms if project linked
      let quoteRooms = []
      if (quote.projectId) {
        quoteRooms = await rooms.find({ projectId: quote.projectId }).toArray()
      }

      // Get revisions
      const revisions = await quotes.find({
        originalQuoteId: quote.originalQuoteId || quote.id
      }).sort({ version: -1 }).toArray()

      return successResponse(sanitizeDocument({ ...quote, rooms: quoteRooms, revisions }))
    }

    // Build query
    const query = {}
    if (leadId) query.leadId = leadId
    if (projectId) query.projectId = projectId
    if (status) query.status = status
    if (customerId) query['customer.id'] = customerId

    const allQuotes = await quotes.find(query).sort({ createdAt: -1 }).limit(limit).toArray()

    // Calculate summary
    const summary = {
      total: allQuotes.length,
      totalValue: allQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      byStatus: {}
    }
    allQuotes.forEach(q => {
      summary.byStatus[q.status] = (summary.byStatus[q.status] || 0) + 1
    })

    return successResponse(sanitizeDocuments(allQuotes))
  } catch (error) {
    console.error('Quotes GET Error:', error)
    return errorResponse('Failed to fetch quotes', 500, error.message)
  }
}

// POST - Create quote
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('flooring_quotes_v2')
    const rooms = db.collection('flooring_rooms')
    const projects = db.collection('flooring_projects')
    const leads = db.collection('leads')
    const inventory = db.collection('flooring_inventory_v2')

    const quoteNumber = await generateQuoteNumber(db)
    const quoteId = uuidv4()
    const now = new Date().toISOString()

    // Get rooms for project
    let projectRooms = []
    if (body.projectId) {
      projectRooms = await rooms.find({ projectId: body.projectId }).toArray()
    }

    // Calculate totals from items
    const items = body.items || []
    const materialTotal = items.filter(i => i.itemType === 'material').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    const laborTotal = items.filter(i => i.itemType === 'labor').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    const accessoryTotal = items.filter(i => i.itemType === 'accessory').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    const subtotal = materialTotal + laborTotal + accessoryTotal

    // Calculate discount
    const discountType = body.discountType || 'fixed'
    const discountValue = body.discountValue || 0
    const discountAmount = discountType === 'percent'
      ? subtotal * (discountValue / 100)
      : discountValue

    // Calculate tax
    const taxableAmount = subtotal - discountAmount
    const isInterstate = body.isInterstate || false
    const cgstRate = body.cgstRate || 9
    const sgstRate = body.sgstRate || 9
    const igstRate = body.igstRate || 18
    const cgst = isInterstate ? 0 : taxableAmount * (cgstRate / 100)
    const sgst = isInterstate ? 0 : taxableAmount * (sgstRate / 100)
    const igst = isInterstate ? taxableAmount * (igstRate / 100) : 0
    const totalTax = cgst + sgst + igst
    const grandTotal = taxableAmount + totalTax

    // Total area from items
    const totalArea = items.reduce((sum, i) => sum + (i.area || 0), 0)

    const quote = {
      id: quoteId,
      quoteNumber,
      projectId: body.projectId,
      leadId: body.leadId,
      customer: body.customer || {},
      site: body.site || {},
      rooms: projectRooms.map(r => ({
        id: r.id,
        roomName: r.roomName,
        netArea: r.netArea,
        productId: r.selectedProductId
      })),
      items,
      template: body.template || 'professional',
      totalArea,
      materialTotal,
      laborTotal,
      accessoryTotal,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxableAmount,
      cgstRate,
      cgst,
      sgstRate,
      sgst,
      igstRate,
      igst,
      isInterstate,
      totalTax,
      grandTotal,
      currency: 'INR',
      validUntil: body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      version: 1,
      originalQuoteId: null,
      paymentTerms: body.paymentTerms || 'Net 30',
      notes: body.notes || '',
      terms: body.terms || '',
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Quote created'
      }],
      sentAt: null,
      viewedAt: null,
      approvedAt: null,
      rejectedAt: null,
      invoiceId: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await quotes.insertOne(quote)

    // Update project status
    if (body.projectId) {
      await projects.updateOne(
        { id: body.projectId },
        {
          $set: { status: 'quote_created', latestQuoteId: quoteId, updatedAt: now },
          $push: { statusHistory: { status: 'quote_created', timestamp: now, by: user.id } }
        }
      )
    }

    // Update lead status if linked
    if (body.leadId) {
      await leads.updateOne(
        { id: body.leadId },
        { $set: { flooringStatus: 'quote_created', updatedAt: now } }
      )
    }

    return successResponse(sanitizeDocument(quote), 201)
  } catch (error) {
    console.error('Quotes POST Error:', error)
    return errorResponse('Failed to create quote', 500, error.message)
  }
}

// PUT - Update quote or perform actions
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Quote ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('flooring_quotes_v2')
    const invoices = db.collection('flooring_invoices')
    const leads = db.collection('leads')
    const projects = db.collection('flooring_projects')

    const quote = await quotes.findOne({ id })
    if (!quote) return errorResponse('Quote not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'send':
        await quotes.updateOne({ id }, {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'sent', timestamp: now, by: user.id } }
        })
        if (quote.projectId) {
          await projects.updateOne({ id: quote.projectId }, { $set: { status: 'quote_sent' } })
        }
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_sent' } })
        }
        return successResponse({ message: 'Quote sent' })

      case 'mark_viewed':
        await quotes.updateOne({ id }, {
          $set: { status: quote.status === 'sent' ? 'viewed' : quote.status, viewedAt: quote.viewedAt || now, updatedAt: now },
          $inc: { viewCount: 1 }
        })
        return successResponse({ message: 'Quote marked as viewed' })

      case 'approve':
        await quotes.updateOne({ id }, {
          $set: { status: 'approved', approvedAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'approved', timestamp: now, by: body.approvedBy || user.id, notes: body.approvalNotes || '' } }
        })
        if (quote.projectId) {
          await projects.updateOne({ id: quote.projectId }, { $set: { status: 'approved', updatedAt: now } })
        }
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_approved' } })
        }
        return successResponse({ message: 'Quote approved' })

      case 'reject':
        await quotes.updateOne({ id }, {
          $set: { status: 'rejected', rejectedAt: now, rejectionReason: body.reason, updatedAt: now },
          $push: { statusHistory: { status: 'rejected', timestamp: now, by: body.rejectedBy || user.id, reason: body.reason } }
        })
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_rejected' } })
        }
        return successResponse({ message: 'Quote rejected' })

      case 'revise':
        // Create new revision
        const newQuoteId = uuidv4()
        const newVersion = (quote.version || 1) + 1
        const revisedQuote = {
          ...quote,
          id: newQuoteId,
          quoteNumber: `${quote.quoteNumber}-R${newVersion}`,
          version: newVersion,
          originalQuoteId: quote.originalQuoteId || quote.id,
          status: 'draft',
          notes: body.revisionNotes || '',
          statusHistory: [{
            status: 'draft',
            timestamp: now,
            by: user.id,
            notes: `Revision ${newVersion} created`
          }],
          sentAt: null,
          viewedAt: null,
          approvedAt: null,
          rejectedAt: null,
          createdAt: now,
          updatedAt: now
        }
        delete revisedQuote._id

        // Apply any updates to the revision
        if (body.items) revisedQuote.items = body.items
        if (body.discountValue !== undefined) revisedQuote.discountValue = body.discountValue

        await quotes.insertOne(revisedQuote)

        // Mark old quote as revised
        await quotes.updateOne({ id }, {
          $set: { status: 'revised', updatedAt: now },
          $push: { statusHistory: { status: 'revised', timestamp: now, by: user.id, notes: `Revised to version ${newVersion}` } }
        })

        return successResponse({ message: 'Revision created', newQuoteId, newVersion })

      case 'create_invoice':
        if (quote.status !== 'approved') {
          return errorResponse('Only approved quotes can be converted to invoices', 400)
        }

        // Generate invoice number
        const invoiceCount = await invoices.countDocuments()
        const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(invoiceCount + 1).padStart(4, '0')}`
        const invoiceId = uuidv4()

        const invoice = {
          id: invoiceId,
          invoiceNumber,
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          projectId: quote.projectId,
          leadId: quote.leadId,
          customer: quote.customer,
          site: quote.site,
          rooms: quote.rooms,
          items: quote.items,
          template: body.invoiceTemplate || 'standard',
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
          paymentTerms: quote.paymentTerms,
          bankDetails: body.bankDetails || {},
          notes: body.invoiceNotes || '',
          terms: quote.terms,
          statusHistory: [{
            status: 'draft',
            timestamp: now,
            by: user.id,
            notes: 'Invoice created from quote'
          }],
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await invoices.insertOne(invoice)

        // Update quote with invoice reference - use 'invoiced' status for consistency
        await quotes.updateOne({ id }, {
          $set: { status: 'invoiced', invoiceId, invoiceCreatedAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'invoiced', timestamp: now, by: user.id, notes: `Invoice ${invoiceNumber} created` } }
        })

        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'invoice_created' } })
        }

        return successResponse({ message: 'Invoice created', invoiceId, invoiceNumber })

      default:
        // Regular update
        updateData.updatedAt = now
        updateData.updatedBy = user.id

        // Recalculate totals if items changed
        if (updateData.items) {
          const items = updateData.items
          updateData.materialTotal = items.filter(i => i.itemType === 'material').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
          updateData.laborTotal = items.filter(i => i.itemType === 'labor').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
          updateData.accessoryTotal = items.filter(i => i.itemType === 'accessory').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
          updateData.subtotal = updateData.materialTotal + updateData.laborTotal + updateData.accessoryTotal
          updateData.totalArea = items.reduce((sum, i) => sum + (i.area || 0), 0)

          const discountAmount = (updateData.discountType || quote.discountType) === 'percent'
            ? updateData.subtotal * ((updateData.discountValue || quote.discountValue || 0) / 100)
            : (updateData.discountValue || quote.discountValue || 0)
          updateData.discountAmount = discountAmount
          updateData.taxableAmount = updateData.subtotal - discountAmount

          const isInterstate = updateData.isInterstate !== undefined ? updateData.isInterstate : quote.isInterstate
          const cgstRate = updateData.cgstRate || quote.cgstRate
          const sgstRate = updateData.sgstRate || quote.sgstRate
          const igstRate = updateData.igstRate || quote.igstRate

          updateData.cgst = isInterstate ? 0 : updateData.taxableAmount * (cgstRate / 100)
          updateData.sgst = isInterstate ? 0 : updateData.taxableAmount * (sgstRate / 100)
          updateData.igst = isInterstate ? updateData.taxableAmount * (igstRate / 100) : 0
          updateData.totalTax = updateData.cgst + updateData.sgst + updateData.igst
          updateData.grandTotal = updateData.taxableAmount + updateData.totalTax
        }

        const result = await quotes.findOneAndUpdate(
          { id },
          { $set: updateData },
          { returnDocument: 'after' }
        )

        return successResponse(sanitizeDocument(result))
    }
  } catch (error) {
    console.error('Quotes PUT Error:', error)
    return errorResponse('Failed to update quote', 500, error.message)
  }
}

// DELETE - Delete quote (soft delete)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Quote ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('flooring_quotes_v2')

    const quote = await quotes.findOne({ id })
    if (!quote) return errorResponse('Quote not found', 404)

    // Only allow deleting draft quotes
    if (quote.status !== 'draft') {
      return errorResponse('Only draft quotes can be deleted', 400)
    }

    await quotes.updateOne(
      { id },
      { $set: { status: 'deleted', deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Quote deleted' })
  } catch (error) {
    console.error('Quotes DELETE Error:', error)
    return errorResponse('Failed to delete quote', 500, error.message)
  }
}
