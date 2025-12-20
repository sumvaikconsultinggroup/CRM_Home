import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// ============================================
// INVENTORY RESERVATION MANAGEMENT
// ============================================

// Reserve inventory when quote is created/approved
const reserveInventoryForQuote = async (db, quote, action = 'reserve') => {
  try {
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const now = new Date().toISOString()
    
    const items = quote.items || []
    const materialItems = items.filter(i => i.itemType === 'material' && i.productId)
    
    if (materialItems.length === 0) {
      return { success: true, reserved: 0, message: 'No material items to reserve' }
    }
    
    let reservedCount = 0
    let reservationDetails = []
    
    for (const item of materialItems) {
      const warehouseId = item.warehouseId || 'default'
      const quantityToReserve = item.quantity || item.area || 0
      
      if (quantityToReserve <= 0) continue
      
      // Check existing stock
      let stock = await stockCollection.findOne({ 
        productId: item.productId, 
        warehouseId 
      })
      
      // Create stock record if doesn't exist
      if (!stock) {
        stock = {
          id: uuidv4(),
          productId: item.productId,
          productName: item.productName || item.name,
          warehouseId,
          quantity: 0,
          reservedQuantity: 0,
          createdAt: now,
          updatedAt: now
        }
        await stockCollection.insertOne(stock)
      }
      
      const availableQty = (stock.quantity || 0) - (stock.reservedQuantity || 0)
      
      // Check if already reserved for this quote
      const existingReservation = await reservationCollection.findOne({
        quotationId: quote.id,
        productId: item.productId,
        status: 'active'
      })
      
      if (existingReservation) {
        // Already reserved, skip
        reservationDetails.push({
          productId: item.productId,
          productName: item.productName || item.name,
          status: 'already_reserved',
          quantity: existingReservation.quantity
        })
        continue
      }
      
      // Create reservation record
      const reservation = {
        id: uuidv4(),
        quotationId: quote.id,
        quoteNumber: quote.quoteNumber,
        projectId: quote.projectId,
        productId: item.productId,
        productName: item.productName || item.name,
        warehouseId,
        quantity: quantityToReserve,
        unit: item.unit || 'sqft',
        status: 'active',
        reservedAt: now,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiry
        createdBy: quote.createdBy,
        createdAt: now,
        updatedAt: now
      }
      
      await reservationCollection.insertOne(reservation)
      
      // Update stock - increase reserved quantity
      await stockCollection.updateOne(
        { productId: item.productId, warehouseId },
        {
          $inc: { reservedQuantity: quantityToReserve },
          $set: { updatedAt: now }
        }
      )
      
      reservedCount++
      reservationDetails.push({
        productId: item.productId,
        productName: item.productName || item.name,
        status: availableQty >= quantityToReserve ? 'reserved' : 'reserved_insufficient',
        quantity: quantityToReserve,
        availableBeforeReserve: availableQty
      })
    }
    
    return { 
      success: true, 
      reserved: reservedCount, 
      details: reservationDetails,
      message: `${reservedCount} items reserved for quote ${quote.quoteNumber}`
    }
  } catch (error) {
    console.error('Reserve inventory error:', error)
    return { success: false, error: error.message }
  }
}

// Release inventory reservation when quote is cancelled/rejected
const releaseInventoryReservation = async (db, quoteId) => {
  try {
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const now = new Date().toISOString()
    
    const reservations = await reservationCollection.find({ 
      quotationId: quoteId, 
      status: 'active' 
    }).toArray()
    
    if (reservations.length === 0) {
      return { released: 0, message: 'No active reservations to release' }
    }
    
    let releasedCount = 0
    for (const reservation of reservations) {
      // Release reserved quantity from stock
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId || 'default' },
        {
          $inc: { reservedQuantity: -reservation.quantity },
          $set: { updatedAt: now }
        }
      )
      
      // Update reservation status
      await reservationCollection.updateOne(
        { id: reservation.id },
        { 
          $set: { 
            status: 'released', 
            releasedAt: now,
            updatedAt: now 
          } 
        }
      )
      releasedCount++
    }
    
    return { released: releasedCount, message: `${releasedCount} reservations released` }
  } catch (error) {
    console.error('Release inventory error:', error)
    return { released: 0, error: error.message }
  }
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

    // Get rooms for project and project details (for segment)
    let projectRooms = []
    let projectSegment = body.projectSegment || 'b2c'
    if (body.projectId) {
      projectRooms = await rooms.find({ projectId: body.projectId }).toArray()
      // Get project segment
      const project = await projects.findOne({ id: body.projectId })
      if (project) {
        projectSegment = project.segment || 'b2c'
      }
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
      projectSegment, // B2B or B2C from project
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

    // RESERVE INVENTORY for material items in quote
    const inventoryReservation = await reserveInventoryForQuote(db, quote)
    quote.inventoryReservation = inventoryReservation

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
          await projects.updateOne({ id: quote.projectId }, { $set: { status: 'quote_approved', updatedAt: now } })
        }
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_approved' } })
        }
        
        // Check fulfillment settings - auto-create pick list if enabled
        const settingsCollection = db.collection('flooring_settings')
        const fulfillmentSettings = await settingsCollection.findOne({ type: 'fulfillment' })
        
        if (fulfillmentSettings?.autoCreatePickListOnApproval) {
          try {
            // Auto-create pick list
            const pickLists = db.collection('flooring_pick_lists')
            const pickListItems = db.collection('flooring_pick_list_items')
            const products = db.collection('flooring_products')
            
            // Check if pick list already exists
            const existingPL = await pickLists.findOne({ quoteId: id, status: { $ne: 'CLOSED' } })
            
            if (!existingPL) {
              const plCount = await pickLists.countDocuments()
              const year = new Date().getFullYear()
              const month = String(new Date().getMonth() + 1).padStart(2, '0')
              const pickListNumber = `PL-${year}${month}-${String(plCount + 1).padStart(4, '0')}`
              const pickListId = uuidv4()
              
              // Get updated quote
              const updatedQuote = await quotes.findOne({ id })
              
              const pickList = {
                id: pickListId,
                pickListNumber,
                quoteId: id,
                quoteNumber: updatedQuote.quoteNumber,
                projectId: updatedQuote.projectId,
                projectNumber: updatedQuote.projectNumber,
                customer: updatedQuote.customer,
                status: 'CREATED',
                notes: 'Auto-created on quote approval',
                totalItems: 0,
                totalArea: 0,
                totalBoxes: 0,
                statusHistory: [{
                  status: 'CREATED',
                  timestamp: now,
                  by: user.id,
                  userName: user.name || user.email,
                  notes: 'Auto-created on quote approval'
                }],
                createdBy: user.id,
                createdByName: user.name || user.email,
                createdAt: now,
                updatedAt: now
              }
              
              // Create items from quote
              const materialItems = (updatedQuote.items || []).filter(item => item.itemType === 'material' || !item.itemType)
              const plItems = []
              let totalArea = 0, totalBoxes = 0
              
              for (const quoteItem of materialItems) {
                const product = await products.findOne({ id: quoteItem.productId || quoteItem.id })
                const coveragePerBox = product?.coveragePerBox || quoteItem.coveragePerBox || 25
                const wastagePercent = quoteItem.wastagePercent || product?.wastagePercent || 10
                const area = quoteItem.area || quoteItem.quantity || 0
                const boxes = Math.ceil(area * (1 + wastagePercent / 100) / coveragePerBox)
                
                plItems.push({
                  id: uuidv4(),
                  pickListId,
                  productId: quoteItem.productId || quoteItem.id,
                  productName: quoteItem.productName || quoteItem.name,
                  sku: quoteItem.sku || product?.sku,
                  quoteQtyArea: area,
                  quoteQtyBoxes: boxes,
                  confirmedQtyArea: null,
                  confirmedQtyBoxes: null,
                  coveragePerBoxSnapshot: coveragePerBox,
                  wastagePercentSnapshot: wastagePercent,
                  unitPriceSnapshot: quoteItem.rate || quoteItem.unitPrice,
                  createdAt: now,
                  updatedAt: now
                })
                totalArea += area
                totalBoxes += boxes
              }
              
              pickList.totalItems = plItems.length
              pickList.totalArea = totalArea
              pickList.totalBoxes = totalBoxes
              
              await pickLists.insertOne(pickList)
              if (plItems.length > 0) {
                await pickListItems.insertMany(plItems)
              }
              
              // Update quote with pick list reference
              await quotes.updateOne(
                { id },
                { $set: { pickListId, pickListNumber, pickListStatus: 'CREATED', updatedAt: now } }
              )
              
              return successResponse({ 
                message: 'Quote approved', 
                pickListCreated: true, 
                pickListId, 
                pickListNumber 
              })
            }
          } catch (plError) {
            console.error('Auto-create pick list error:', plError)
            // Continue even if pick list creation fails
          }
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
        // RELEASE INVENTORY RESERVATION when quote is rejected
        const releaseResultReject = await releaseInventoryReservation(db, id)
        return successResponse({ message: 'Quote rejected', inventoryReleased: releaseResultReject })
      
      case 'cancel':
        await quotes.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancellationReason: body.reason, updatedAt: now },
          $push: { statusHistory: { status: 'cancelled', timestamp: now, by: user.id, reason: body.reason } }
        })
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_cancelled' } })
        }
        // RELEASE INVENTORY RESERVATION when quote is cancelled
        const releaseResultCancel = await releaseInventoryReservation(db, id)
        return successResponse({ message: 'Quote cancelled', inventoryReleased: releaseResultCancel })

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

        // If status is being changed to 'revised', add to status history
        if (updateData.status === 'revised' && quote.status !== 'revised') {
          updateData.$push = {
            statusHistory: {
              status: 'revised',
              timestamp: now,
              by: user.id,
              notes: updateData.revisionNote || 'Quote revised for resubmission'
            }
          }
          delete updateData.revisionNote
        }

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

        // Build update operation
        const updateOp = { $set: {} }
        const pushData = updateData.$push
        delete updateData.$push
        
        // Copy all fields to $set
        Object.keys(updateData).forEach(key => {
          updateOp.$set[key] = updateData[key]
        })
        
        // Add $push if we have status history to add
        if (pushData) {
          updateOp.$push = pushData
        }

        const result = await quotes.findOneAndUpdate(
          { id },
          updateOp,
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
