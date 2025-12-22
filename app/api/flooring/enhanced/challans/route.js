import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate DC number
const generateDCNumber = async (db) => {
  const challans = db.collection('flooring_challans')
  const count = await challans.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `DC-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// Get fulfillment settings
const getFulfillmentSettings = async (db) => {
  const settings = db.collection('flooring_settings')
  const config = await settings.findOne({ type: 'fulfillment' })
  return {
    requirePickListForDC: config?.requirePickListForDC !== false, // default true
    requirePickListForInvoice: config?.requirePickListForInvoice !== false, // default true
    hideSenderDefault: config?.hideSenderDefault || false,
    thirdPartyDeliveryDefault: config?.thirdPartyDeliveryDefault || false,
    allowPartialDispatch: config?.allowPartialDispatch !== false, // default true
    autoCreatePickListOnApproval: config?.autoCreatePickListOnApproval || false
  }
}

// Check if stock OUT already exists for this DC (idempotency)
const checkExistingStockOut = async (db, dcId) => {
  const movements = db.collection('wf_inventory_movements')
  const existing = await movements.findOne({
    referenceType: 'DC',
    referenceId: dcId,
    movementType: 'out'
  })
  return !!existing
}

// Perform idempotent stock OUT on DC issue
const performStockOut = async (db, challan, user) => {
  const movements = db.collection('wf_inventory_movements')
  const stockCollection = db.collection('wf_inventory_stock')
  const productsCollection = db.collection('flooring_products')
  const reservationsCollection = db.collection('inventory_reservations')
  const now = new Date().toISOString()

  // Check idempotency - prevent double deduction
  const alreadyDeducted = await checkExistingStockOut(db, challan.id)
  if (alreadyDeducted) {
    console.log(`Stock OUT already performed for DC ${challan.dcNo}. Skipping.`)
    return { skipped: true, reason: 'Already deducted' }
  }

  const results = []

  for (const item of (challan.items || [])) {
    const productId = item.productId
    const qtyToDeduct = item.qtyBoxes || item.qtyArea || 0

    if (!productId || qtyToDeduct <= 0) continue

    // Find stock record
    let stockRecord = await stockCollection.findOne({ productId })
    
    // Try to find product for fallback
    const product = await productsCollection.findOne({ id: productId })

    if (stockRecord) {
      // Deduct from stock
      await stockCollection.updateOne(
        { productId },
        {
          $inc: { 
            quantity: -qtyToDeduct,
            currentQty: -qtyToDeduct
          },
          $set: { updatedAt: now }
        }
      )
    } else if (product) {
      // Fallback: deduct from product stockQuantity
      await productsCollection.updateOne(
        { id: productId },
        {
          $inc: { stockQuantity: -qtyToDeduct },
          $set: { updatedAt: now }
        }
      )
    }

    // Release any reservations for this quote
    if (challan.quoteId) {
      await reservationsCollection.updateMany(
        { 
          quotationId: challan.quoteId,
          productId,
          status: 'active'
        },
        {
          $set: {
            status: 'released',
            releasedAt: now,
            releasedBy: 'DC_ISSUE',
            releasedReason: `Released on DC ${challan.dcNo} issue`
          },
          $inc: { releasedQuantity: qtyToDeduct }
        }
      )
    }

    // Record movement with DC reference
    await movements.insertOne({
      id: uuidv4(),
      productId,
      productName: item.productName || product?.name,
      type: 'dispatch',
      movementType: 'out',
      quantity: -qtyToDeduct,
      referenceType: 'DC',
      referenceId: challan.id,
      referenceNumber: challan.dcNo,
      quoteId: challan.quoteId,
      invoiceId: challan.invoiceId,
      warehouseId: item.warehouseId || 'default',
      lotNo: item.lotNo,
      notes: `Stock OUT - DC ${challan.dcNo}`,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now
    })

    results.push({
      productId,
      productName: item.productName,
      qtyDeducted: qtyToDeduct
    })
  }

  return { skipped: false, deducted: results }
}

// GET - Fetch challans
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const quoteId = searchParams.get('quoteId')
    const invoiceId = searchParams.get('invoiceId')
    const pickListId = searchParams.get('pickListId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')

    // Get single challan by ID
    if (id) {
      const challan = await challans.findOne({ id })
      if (!challan) return errorResponse('Challan not found', 404)
      
      // Get items
      const challanItems = db.collection('flooring_challan_items')
      const items = await challanItems.find({ challanId: id }).toArray()
      
      return successResponse(sanitizeDocument({ ...challan, items: sanitizeDocuments(items) }))
    }

    // Build query
    const query = {}
    if (quoteId) query.quoteId = quoteId
    if (invoiceId) query.invoiceId = invoiceId
    if (pickListId) query.pickListId = pickListId
    if (projectId) query.projectId = projectId
    if (status && status !== 'all') query.status = status
    if (type) query.type = type

    const allChallans = await challans.find(query).sort({ createdAt: -1 }).toArray()

    // Calculate stats
    const stats = {
      total: allChallans.length,
      draft: allChallans.filter(c => c.status === 'DRAFT').length,
      issued: allChallans.filter(c => c.status === 'ISSUED').length,
      delivered: allChallans.filter(c => c.status === 'DELIVERED').length,
      closed: allChallans.filter(c => c.status === 'CLOSED').length
    }

    return successResponse({
      challans: sanitizeDocuments(allChallans),
      stats
    })
  } catch (error) {
    console.error('Challans GET Error:', error)
    return errorResponse('Failed to fetch challans', 500, error.message)
  }
}

// POST - Create challan (from pick list, quote, or invoice)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { 
      source, // 'pick_list', 'quote', 'invoice'
      sourceId,
      // Delivery details
      billToAccountId,
      billToName,
      shipToName,
      shipToPhone,
      shipToAddress,
      receiverName,
      receiverPhone,
      thirdPartyDelivery,
      hideSenderOnPdf,
      // Transport
      transporterName,
      vehicleNo,
      driverName,
      driverPhone,
      lrNo,
      dispatchNotes,
      // Items override (for partial dispatch)
      items: overrideItems
    } = body

    if (!source || !sourceId) {
      return errorResponse('Source and sourceId are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')
    const challanItems = db.collection('flooring_challan_items')
    const pickLists = db.collection('flooring_pick_lists')
    const pickListItems = db.collection('flooring_pick_list_items')
    const quotes = db.collection('flooring_quotes_v2')
    const invoices = db.collection('flooring_invoices')
    const products = db.collection('flooring_products')

    const settings = await getFulfillmentSettings(db)
    const now = new Date().toISOString()

    let sourceData = null
    let pickList = null
    let quote = null
    let invoice = null
    let itemsToDispatch = []

    // Resolve source data
    switch (source) {
      case 'pick_list':
        pickList = await pickLists.findOne({ id: sourceId })
        if (!pickList) return errorResponse('Pick list not found', 404)
        
        if (pickList.status !== 'MATERIAL_READY' && settings.requirePickListForDC) {
          return errorResponse('Pick list must be MATERIAL_READY before creating DC', 400)
        }
        
        quote = await quotes.findOne({ id: pickList.quoteId })
        const plItems = await pickListItems.find({ pickListId: sourceId }).toArray()
        
        itemsToDispatch = plItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtyArea: item.confirmedQtyArea || item.quoteQtyArea,
          qtyBoxes: item.confirmedQtyBoxes || item.quoteQtyBoxes,
          coveragePerBoxSnapshot: item.coveragePerBoxSnapshot,
          lotNo: item.lotNo,
          notes: item.notes
        }))
        break

      case 'quote':
        quote = await quotes.findOne({ id: sourceId })
        if (!quote) return errorResponse('Quote not found', 404)
        
        if (quote.status !== 'approved') {
          return errorResponse('Quote must be approved before creating DC', 400)
        }

        // Check if pick list is required
        if (settings.requirePickListForDC) {
          pickList = await pickLists.findOne({ quoteId: sourceId, status: 'MATERIAL_READY' })
          if (!pickList) {
            return errorResponse('Pick list must be MATERIAL_READY before creating DC. Create a pick list first.', 400)
          }
          const plItems = await pickListItems.find({ pickListId: pickList.id }).toArray()
          itemsToDispatch = plItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            qtyArea: item.confirmedQtyArea || item.quoteQtyArea,
            qtyBoxes: item.confirmedQtyBoxes || item.quoteQtyBoxes,
            coveragePerBoxSnapshot: item.coveragePerBoxSnapshot,
            lotNo: item.lotNo
          }))
        } else {
          // No pick list required - use quote items directly
          itemsToDispatch = (quote.items || []).filter(i => i.itemType !== 'labor').map(item => {
            const coveragePerBox = item.coveragePerBox || 25
            const area = item.area || item.quantity || 0
            const wastage = item.wastagePercent || 10
            const boxes = Math.ceil(area * (1 + wastage/100) / coveragePerBox)
            return {
              productId: item.productId || item.id,
              productName: item.productName || item.name,
              sku: item.sku,
              qtyArea: area,
              qtyBoxes: boxes,
              coveragePerBoxSnapshot: coveragePerBox
            }
          })
        }
        break

      case 'invoice':
        invoice = await invoices.findOne({ id: sourceId })
        if (!invoice) return errorResponse('Invoice not found', 404)
        
        quote = invoice.quoteId ? await quotes.findOne({ id: invoice.quoteId }) : null
        
        // Check if pick list is required
        if (settings.requirePickListForDC && quote) {
          pickList = await pickLists.findOne({ quoteId: quote.id, status: 'MATERIAL_READY' })
          if (!pickList) {
            return errorResponse('Pick list must be MATERIAL_READY before creating DC', 400)
          }
        }

        itemsToDispatch = (invoice.items || []).filter(i => i.itemType !== 'labor').map(item => {
          const coveragePerBox = item.coveragePerBox || 25
          const area = item.area || item.quantity || 0
          return {
            productId: item.productId || item.id,
            productName: item.productName || item.name,
            sku: item.sku,
            qtyArea: area,
            qtyBoxes: item.boxes || Math.ceil(area / coveragePerBox),
            coveragePerBoxSnapshot: coveragePerBox
          }
        })
        break

      default:
        return errorResponse('Invalid source. Must be pick_list, quote, or invoice', 400)
    }

    // Apply override items if provided (for partial dispatch)
    if (overrideItems && Array.isArray(overrideItems) && overrideItems.length > 0) {
      itemsToDispatch = overrideItems
    }

    // Generate DC number
    const dcNo = await generateDCNumber(db)
    const challanId = uuidv4()

    // Get customer/bill-to info
    const customer = quote?.customer || invoice?.customer

    // Create challan
    const challan = {
      id: challanId,
      dcNo,
      type: 'delivery',
      quoteId: quote?.id || null,
      quoteNumber: quote?.quoteNumber || null,
      invoiceId: invoice?.id || null,
      invoiceNumber: invoice?.invoiceNumber || null,
      pickListId: pickList?.id || null,
      pickListNumber: pickList?.pickListNumber || null,
      projectId: quote?.projectId || invoice?.projectId || null,
      projectNumber: quote?.projectNumber || invoice?.projectNumber || null,
      // Bill To
      billToAccountId: billToAccountId || customer?.id,
      billToName: billToName || customer?.name,
      billToNameSnapshot: billToName || customer?.name, // Historical
      billToAddress: customer?.address,
      billToPhone: customer?.phone,
      billToEmail: customer?.email,
      billToGstin: customer?.gstin,
      // Ship To
      shipToName: shipToName || customer?.name,
      shipToPhone: shipToPhone || customer?.phone,
      shipToAddress: shipToAddress || customer?.address,
      // Receiver (can be different from ship-to)
      receiverName: receiverName || shipToName || customer?.name,
      receiverPhone: receiverPhone || shipToPhone || customer?.phone,
      // Third party delivery flags
      thirdPartyDelivery: thirdPartyDelivery || settings.thirdPartyDeliveryDefault,
      hideSenderOnPdf: hideSenderOnPdf !== undefined ? hideSenderOnPdf : settings.hideSenderDefault,
      // Transport
      transporterName: transporterName || '',
      vehicleNo: vehicleNo || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      lrNo: lrNo || '',
      dispatchNotes: dispatchNotes || '',
      // Totals
      totalItems: itemsToDispatch.length,
      totalArea: itemsToDispatch.reduce((sum, i) => sum + (i.qtyArea || 0), 0),
      totalBoxes: itemsToDispatch.reduce((sum, i) => sum + (i.qtyBoxes || 0), 0),
      // Status
      status: 'DRAFT',
      issuedBy: null,
      issuedAt: null,
      deliveredAt: null,
      podUrl: null,
      // Audit
      statusHistory: [{
        status: 'DRAFT',
        timestamp: now,
        by: user.id,
        userName: user.name || user.email,
        notes: `DC created from ${source}`
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    // Create challan items
    const dcItems = itemsToDispatch.map(item => ({
      id: uuidv4(),
      challanId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      qtyArea: item.qtyArea,
      qtyBoxes: item.qtyBoxes,
      coveragePerBoxSnapshot: item.coveragePerBoxSnapshot,
      lotNo: item.lotNo || null,
      notes: item.notes || '',
      createdAt: now
    }))

    // Insert challan and items
    await challans.insertOne(challan)
    if (dcItems.length > 0) {
      await challanItems.insertMany(dcItems)
    }

    // Update source references
    if (quote) {
      await quotes.updateOne(
        { id: quote.id },
        { 
          $set: { 
            dcId: challanId,
            dcNumber: dcNo,
            dcStatus: 'DRAFT',
            dispatchStatus: 'PENDING',
            updatedAt: now 
          } 
        }
      )
    }

    if (invoice) {
      await invoices.updateOne(
        { id: invoice.id },
        { 
          $push: { challanIds: challanId },
          $set: { 
            dispatchStatus: 'PENDING',
            updatedAt: now 
          } 
        }
      )
    }

    return successResponse({
      challan: sanitizeDocument({ ...challan, items: sanitizeDocuments(dcItems) }),
      message: 'Delivery Challan created successfully'
    }, 201)
  } catch (error) {
    console.error('Challans POST Error:', error)
    return errorResponse('Failed to create challan', 500, error.message)
  }
}

// PUT - Update challan (issue, mark delivered, update details)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, data } = body

    if (!id) {
      return errorResponse('Challan ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')
    const quotes = db.collection('flooring_quotes_v2')
    const invoices = db.collection('flooring_invoices')
    const projects = db.collection('flooring_projects')

    const challan = await challans.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)

    const now = new Date().toISOString()
    let updateData = { updatedAt: now }
    let statusHistoryEntry = null

    switch (action) {
      case 'update_details':
        // Update delivery/transport details
        if (data.shipToName !== undefined) updateData.shipToName = data.shipToName
        if (data.shipToPhone !== undefined) updateData.shipToPhone = data.shipToPhone
        if (data.shipToAddress !== undefined) updateData.shipToAddress = data.shipToAddress
        if (data.receiverName !== undefined) updateData.receiverName = data.receiverName
        if (data.receiverPhone !== undefined) updateData.receiverPhone = data.receiverPhone
        if (data.transporterName !== undefined) updateData.transporterName = data.transporterName
        if (data.vehicleNo !== undefined) updateData.vehicleNo = data.vehicleNo
        if (data.driverName !== undefined) updateData.driverName = data.driverName
        if (data.driverPhone !== undefined) updateData.driverPhone = data.driverPhone
        if (data.lrNo !== undefined) updateData.lrNo = data.lrNo
        if (data.dispatchNotes !== undefined) updateData.dispatchNotes = data.dispatchNotes
        if (data.thirdPartyDelivery !== undefined) updateData.thirdPartyDelivery = data.thirdPartyDelivery
        if (data.hideSenderOnPdf !== undefined) updateData.hideSenderOnPdf = data.hideSenderOnPdf
        break

      case 'issue':
        if (challan.status !== 'DRAFT') {
          return errorResponse('Can only issue a DRAFT challan', 400)
        }

        // Perform stock OUT (idempotent)
        const stockResult = await performStockOut(db, challan, user)
        
        updateData.status = 'ISSUED'
        updateData.issuedBy = user.id
        updateData.issuedByName = user.name || user.email
        updateData.issuedAt = now
        updateData.stockOutResult = stockResult

        statusHistoryEntry = {
          status: 'ISSUED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: stockResult.skipped 
            ? 'DC issued (stock already deducted)' 
            : `DC issued. Stock deducted: ${stockResult.deducted?.length || 0} items`
        }

        // Update quote dispatch status
        if (challan.quoteId) {
          // Check if this is full or partial dispatch
          const allChallansForQuote = await challans.find({ 
            quoteId: challan.quoteId, 
            status: 'ISSUED' 
          }).toArray()
          
          await quotes.updateOne(
            { id: challan.quoteId },
            { 
              $set: { 
                dcStatus: 'ISSUED',
                dispatchStatus: 'DISPATCHED',
                lastDispatchAt: now,
                updatedAt: now 
              } 
            }
          )
        }

        // Update invoice dispatch status
        if (challan.invoiceId) {
          await invoices.updateOne(
            { id: challan.invoiceId },
            { 
              $set: { 
                dispatchStatus: 'DISPATCHED',
                lastDispatchAt: now,
                updatedAt: now 
              } 
            }
          )
        }

        // Update project status
        if (challan.projectId) {
          await projects.updateOne(
            { id: challan.projectId },
            { $set: { status: 'in_transit', updatedAt: now } }
          )
        }
        break

      case 'mark_delivered':
        if (challan.status !== 'ISSUED') {
          return errorResponse('Can only mark ISSUED challan as delivered', 400)
        }

        updateData.status = 'DELIVERED'
        updateData.deliveredAt = now
        updateData.deliveredBy = user.id
        if (data?.podUrl) updateData.podUrl = data.podUrl
        if (data?.receiverSignature) updateData.receiverSignature = data.receiverSignature
        if (data?.deliveryNotes) updateData.deliveryNotes = data.deliveryNotes
        if (data?.deliveryPhoto) updateData.deliveryPhoto = data.deliveryPhoto

        statusHistoryEntry = {
          status: 'DELIVERED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: `Delivered. Receiver: ${data?.receiverName || challan.receiverName}`
        }

        // Update quote dcStatus to DELIVERED
        if (challan.quoteId) {
          await quotes.updateOne(
            { id: challan.quoteId },
            { 
              $set: { 
                dcStatus: 'DELIVERED',
                dispatchStatus: 'DELIVERED',
                deliveredAt: now,
                updatedAt: now 
              } 
            }
          )
        }

        // Update project status
        if (challan.projectId) {
          await projects.updateOne(
            { id: challan.projectId },
            { $set: { status: 'delivered', updatedAt: now } }
          )
        }
        break

      case 'close':
        updateData.status = 'CLOSED'
        updateData.closedAt = now
        updateData.closedBy = user.id
        updateData.closedReason = data?.reason || 'Completed'
        
        statusHistoryEntry = {
          status: 'CLOSED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: data?.reason || 'DC closed'
        }
        break

      case 'cancel':
        if (!['DRAFT'].includes(challan.status)) {
          return errorResponse('Can only cancel DRAFT challans. Issued challans must be reversed.', 400)
        }
        
        updateData.status = 'CANCELLED'
        updateData.cancelledAt = now
        updateData.cancelledBy = user.id
        updateData.cancellationReason = data?.reason || 'Cancelled'
        
        statusHistoryEntry = {
          status: 'CANCELLED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: data?.reason || 'DC cancelled'
        }
        break

      case 'reverse_issue':
        // Reverse an ISSUED DC - create stock IN entries to restore stock
        if (challan.status !== 'ISSUED') {
          return errorResponse('Can only reverse ISSUED challans', 400)
        }

        // Get challan items
        const challanItemsColl = db.collection('flooring_challan_items')
        const movements = db.collection('wf_inventory_movements')
        const stockCollection = db.collection('wf_inventory_stock')
        const productsCollection = db.collection('flooring_products')
        
        const itemsToReverse = await challanItemsColl.find({ challanId: id }).toArray()
        
        // Create reverse stock entries
        for (const item of itemsToReverse) {
          const qtyToRestore = item.qtyBoxes || 0
          if (qtyToRestore <= 0) continue

          // Create IN movement (reverse)
          await movements.insertOne({
            id: uuidv4(),
            productId: item.productId,
            productName: item.productName,
            type: 'reversal',
            movementType: 'in',
            quantity: qtyToRestore, // Positive = stock IN
            referenceType: 'DC_REVERSAL',
            referenceId: id,
            referenceNumber: challan.dcNo,
            quoteId: challan.quoteId,
            notes: `Stock reversal - DC ${challan.dcNo} cancelled`,
            createdBy: user.id,
            createdByName: user.name || user.email,
            createdAt: now
          })

          // Restore stock
          const stockRecord = await stockCollection.findOne({ productId: item.productId })
          if (stockRecord) {
            await stockCollection.updateOne(
              { productId: item.productId },
              {
                $inc: { quantity: qtyToRestore, currentQty: qtyToRestore },
                $set: { updatedAt: now }
              }
            )
          } else {
            // Restore to product directly
            await productsCollection.updateOne(
              { id: item.productId },
              {
                $inc: { stockQuantity: qtyToRestore },
                $set: { updatedAt: now }
              }
            )
          }
        }

        updateData.status = 'CANCELLED'
        updateData.cancelledAt = now
        updateData.cancelledBy = user.id
        updateData.cancellationReason = data?.reason || 'Reversed after issue'
        updateData.stockReversed = true
        updateData.stockReversedAt = now

        statusHistoryEntry = {
          status: 'CANCELLED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: `DC reversed and cancelled. Stock restored for ${itemsToReverse.length} items.`
        }

        // Update quote dispatch status
        if (challan.quoteId) {
          await quotes.updateOne(
            { id: challan.quoteId },
            { $set: { dispatchStatus: 'PENDING', updatedAt: now } }
          )
        }
        break

      case 'link_invoice':
        // Link an invoice to this DC
        if (!data?.invoiceId) {
          return errorResponse('Invoice ID is required', 400)
        }
        
        updateData.invoiceId = data.invoiceId
        updateData.invoiceNumber = data.invoiceNumber || null
        updateData.invoiceLinkedAt = now
        updateData.invoiceLinkedBy = user.id
        
        statusHistoryEntry = {
          status: challan.status, // Keep current status
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: `Invoice ${data.invoiceNumber || data.invoiceId} linked to this DC`
        }
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    // Build update query
    const updateQuery = { $set: updateData }
    if (statusHistoryEntry) {
      updateQuery.$push = { statusHistory: statusHistoryEntry }
    }

    await challans.updateOne({ id }, updateQuery)

    // Fetch updated challan
    const updatedChallan = await challans.findOne({ id })
    const challanItemsColl = db.collection('flooring_challan_items')
    const items = await challanItemsColl.find({ challanId: id }).toArray()

    return successResponse({
      challan: sanitizeDocument({ ...updatedChallan, items: sanitizeDocuments(items) }),
      message: `Challan ${action.replace('_', ' ')} successful`
    })
  } catch (error) {
    console.error('Challans PUT Error:', error)
    return errorResponse('Failed to update challan', 500, error.message)
  }
}

// DELETE - Cancel draft challan
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Challan ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')

    const challan = await challans.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)

    if (challan.status !== 'DRAFT') {
      return errorResponse('Can only delete DRAFT challans', 400)
    }

    const now = new Date().toISOString()

    // Soft delete
    await challans.updateOne(
      { id },
      { 
        $set: { 
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledBy: user.id,
          cancellationReason: 'Deleted',
          updatedAt: now
        },
        $push: {
          statusHistory: {
            status: 'CANCELLED',
            timestamp: now,
            by: user.id,
            userName: user.name || user.email,
            notes: 'Challan deleted'
          }
        }
      }
    )

    return successResponse({
      message: 'Challan cancelled successfully'
    })
  } catch (error) {
    console.error('Challans DELETE Error:', error)
    return errorResponse('Failed to delete challan', 500, error.message)
  }
}
