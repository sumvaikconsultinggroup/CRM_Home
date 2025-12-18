import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Convert inventory reservations when invoice is created from quote
// Also handles direct deduction if no reservation exists
const convertInventoryReservation = async (db, clientId, quotationId, invoiceItems = [], invoiceId, invoiceNumber) => {
  try {
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const movementCollection = db.collection('wf_inventory_movements')
    const now = new Date().toISOString()
    
    const reservations = await reservationCollection.find({ 
      quotationId, 
      status: 'active' 
    }).toArray()
    
    let convertedCount = 0
    let directDeductCount = 0
    const processedProductIds = new Set()
    
    // Process existing reservations first
    for (const reservation of reservations) {
      // Deduct from total stock (reservation was already from available)
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId || 'default' },
        {
          $inc: { 
            quantity: -reservation.quantity, 
            reservedQuantity: -reservation.quantity 
          },
          $set: { updatedAt: now }
        }
      )
      
      // Record inventory movement
      await movementCollection.insertOne({
        id: uuidv4(),
        productId: reservation.productId,
        productName: reservation.productName,
        type: 'sale',
        quantity: -reservation.quantity,
        warehouseId: reservation.warehouseId || 'default',
        invoiceId,
        invoiceNumber,
        quotationId,
        notes: `Sold via Invoice ${invoiceNumber} (from reservation)`,
        createdBy: 'system',
        createdAt: now
      })
      
      // Update reservation status to converted
      await reservationCollection.updateOne(
        { id: reservation.id },
        { 
          $set: { 
            status: 'converted', 
            invoiceId,
            invoiceNumber,
            convertedAt: now,
            updatedAt: now 
          } 
        }
      )
      
      processedProductIds.add(reservation.productId)
      convertedCount++
    }
    
    // For items NOT covered by reservations, deduct directly
    const materialItems = invoiceItems.filter(i => 
      i.itemType === 'material' && 
      i.productId && 
      !processedProductIds.has(i.productId)
    )
    
    for (const item of materialItems) {
      const warehouseId = item.warehouseId || 'default'
      const quantityToDeduct = item.quantity || item.area || 0
      
      if (quantityToDeduct <= 0) continue
      
      // Direct deduction from stock
      await stockCollection.updateOne(
        { productId: item.productId, warehouseId },
        {
          $inc: { quantity: -quantityToDeduct },
          $set: { updatedAt: now }
        },
        { upsert: false }
      )
      
      // Record inventory movement
      await movementCollection.insertOne({
        id: uuidv4(),
        productId: item.productId,
        productName: item.productName || item.name,
        type: 'sale',
        quantity: -quantityToDeduct,
        warehouseId,
        invoiceId,
        invoiceNumber,
        notes: `Sold via Invoice ${invoiceNumber} (direct deduction)`,
        createdBy: 'system',
        createdAt: now
      })
      
      directDeductCount++
    }
    
    const totalProcessed = convertedCount + directDeductCount
    return { 
      converted: convertedCount, 
      directDeducted: directDeductCount,
      total: totalProcessed,
      message: `Inventory updated: ${convertedCount} reservations converted, ${directDeductCount} direct deductions`
    }
  } catch (error) {
    console.error('Convert inventory reservation error:', error)
    return { converted: 0, directDeducted: 0, total: 0, error: error.message }
  }
}

// Generate invoice number
const generateInvoiceNumber = async (db) => {
  const invoices = db.collection('flooring_invoices')
  const count = await invoices.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// Helper function to sync invoice status to CRM (contacts/leads)
const syncInvoiceToCRM = async (db, invoice, user) => {
  const now = new Date().toISOString()
  const syncResults = { contactUpdated: false, leadUpdated: false, projectUpdated: false }
  
  try {
    // Update contact if customer has contactId
    if (invoice.customer?.id || invoice.customer?.contactId) {
      const contactId = invoice.customer?.contactId || invoice.customer?.id
      const contacts = db.collection('contacts')
      
      const updateData = {
        lastInvoiceId: invoice.id,
        lastInvoiceNumber: invoice.invoiceNumber,
        lastInvoiceStatus: invoice.status,
        lastInvoiceAmount: invoice.grandTotal,
        lastInvoiceDate: invoice.createdAt,
        updatedAt: now
      }
      
      // Add payment info if paid
      if (invoice.status === 'paid') {
        updateData.totalPaidAmount = (updateData.totalPaidAmount || 0) + (invoice.paidAmount || 0)
        updateData.lastPaymentDate = invoice.lastPaymentDate || now
      }
      
      await contacts.updateOne(
        { id: contactId },
        { 
          $set: updateData,
          $addToSet: { 
            invoiceIds: invoice.id,
            modules: 'flooring'
          }
        }
      )
      syncResults.contactUpdated = true
    }
    
    // Update lead if leadId exists
    if (invoice.leadId) {
      const leads = db.collection('leads')
      
      const leadStatus = {
        'draft': 'invoice_created',
        'sent': 'invoice_sent',
        'partially_paid': 'partial_payment',
        'paid': 'payment_received',
        'cancelled': 'invoice_cancelled',
        'overdue': 'invoice_overdue'
      }
      
      await leads.updateOne(
        { id: invoice.leadId },
        { 
          $set: { 
            flooringStatus: leadStatus[invoice.status] || 'invoice_created',
            lastInvoiceId: invoice.id,
            lastInvoiceStatus: invoice.status,
            lastInvoiceAmount: invoice.grandTotal,
            updatedAt: now
          }
        }
      )
      syncResults.leadUpdated = true
    }
    
    // Update project if projectId exists
    if (invoice.projectId) {
      const projects = db.collection('flooring_projects')
      
      // First, get the project to check its segment
      const project = await projects.findOne({ id: invoice.projectId })
      
      // B2C projects have installation, B2B projects have dispatch/delivery
      const projectStatusB2C = {
        'sent': 'invoice_sent',
        'partially_paid': 'payment_received',
        'paid': 'payment_received'
      }
      
      const projectStatusB2B = {
        'sent': 'invoice_sent',
        'partially_paid': 'invoice_sent', // Stay at invoice_sent until fully paid
        'paid': 'in_transit' // After full payment, mark as in transit for delivery (no installation)
      }
      
      // Use appropriate status mapping based on segment
      const isB2B = project?.segment === 'b2b'
      const statusMapping = isB2B ? projectStatusB2B : projectStatusB2C
      
      if (statusMapping[invoice.status]) {
        await projects.updateOne(
          { id: invoice.projectId },
          { 
            $set: { 
              status: statusMapping[invoice.status],
              lastInvoiceId: invoice.id,
              lastInvoiceStatus: invoice.status,
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: statusMapping[invoice.status],
                timestamp: now,
                by: user.id,
                notes: `Invoice ${invoice.invoiceNumber} - ${invoice.status}${isB2B ? ' (B2B - Material dispatch)' : ''}`
              }
            }
          }
        )
        syncResults.projectUpdated = true
      }
    }
    
    return syncResults
  } catch (error) {
    console.error('CRM Sync Error:', error)
    return syncResults
  }
}

// GET - Fetch invoices with advanced filtering
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const customerId = searchParams.get('customerId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const overdue = searchParams.get('overdue')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 100
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const payments = db.collection('flooring_payments')

    if (id) {
      const invoice = await invoices.findOne({ id })
      if (!invoice) return errorResponse('Invoice not found', 404)
      
      // Get payments for this invoice
      const invoicePayments = await payments.find({ invoiceId: id }).sort({ createdAt: -1 }).toArray()
      
      return successResponse(sanitizeDocument({ ...invoice, payments: invoicePayments }))
    }

    // Get projects for segment lookup
    const projects = db.collection('flooring_projects')
    const allProjects = await projects.find({}).toArray()
    const projectMap = new Map(allProjects.map(p => [p.id, p]))

    // Build query
    const query = {}
    if (customerId) query['customer.id'] = customerId
    if (projectId) query.projectId = projectId
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.dueDate = { $lt: new Date().toISOString() }
        query.status = { $nin: ['paid', 'cancelled'] }
      } else {
        query.status = status
      }
    }
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date().toISOString() }
      query.status = { $nin: ['paid', 'cancelled'] }
    }
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { quoteNumber: { $regex: search, $options: 'i' } }
      ]
    }
    if (startDate) {
      query.createdAt = { ...(query.createdAt || {}), $gte: startDate }
    }
    if (endDate) {
      query.createdAt = { ...(query.createdAt || {}), $lte: endDate }
    }

    // Sort configuration
    const sortConfig = {}
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1

    // Get all invoices for summary (before pagination)
    const allInvoices = await invoices.find(query).toArray()
    
    // Get paginated invoices
    const skip = (page - 1) * limit
    let paginatedInvoices = await invoices.find(query).sort(sortConfig).skip(skip).limit(limit).toArray()
    
    // Enrich invoices with correct projectSegment from project
    paginatedInvoices = paginatedInvoices.map(inv => {
      const project = inv.projectId ? projectMap.get(inv.projectId) : null
      const correctSegment = project?.segment || inv.projectSegment || 'b2c'
      return {
        ...inv,
        projectSegment: correctSegment,
        _projectName: project?.name || project?.projectNumber || null
      }
    })

    // Calculate comprehensive summary
    const now = new Date()
    const summary = {
      total: allInvoices.length,
      totalValue: allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
      paidAmount: allInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
      pendingAmount: allInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
      overdueCount: allInvoices.filter(i => new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status)).length,
      overdueAmount: allInvoices
        .filter(i => new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status))
        .reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
      byStatus: {
        draft: { count: 0, amount: 0 },
        sent: { count: 0, amount: 0 },
        partially_paid: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 }
      },
      thisMonth: {
        count: 0,
        totalValue: 0,
        collected: 0
      },
      lastMonth: {
        count: 0,
        totalValue: 0,
        collected: 0
      }
    }

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    allInvoices.forEach(i => {
      // By status
      const statusKey = i.status || 'draft'
      if (summary.byStatus[statusKey]) {
        summary.byStatus[statusKey].count++
        summary.byStatus[statusKey].amount += i.grandTotal || 0
      }
      
      // Check if overdue
      if (new Date(i.dueDate) < now && !['paid', 'cancelled'].includes(i.status)) {
        summary.byStatus.overdue.count++
        summary.byStatus.overdue.amount += i.balanceAmount || 0
      }

      // This month
      if (i.createdAt >= thisMonthStart) {
        summary.thisMonth.count++
        summary.thisMonth.totalValue += i.grandTotal || 0
        summary.thisMonth.collected += i.paidAmount || 0
      }

      // Last month
      if (i.createdAt >= lastMonthStart && i.createdAt <= lastMonthEnd) {
        summary.lastMonth.count++
        summary.lastMonth.totalValue += i.grandTotal || 0
        summary.lastMonth.collected += i.paidAmount || 0
      }
    })

    return successResponse({
      invoices: sanitizeDocuments(paginatedInvoices),
      summary,
      pagination: {
        total: allInvoices.length,
        page,
        limit,
        pages: Math.ceil(allInvoices.length / limit)
      }
    })
  } catch (error) {
    console.error('Invoices GET Error:', error)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

// POST - Create invoice from quote or manually
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const quotes = db.collection('flooring_quotes_v2')
    const leads = db.collection('leads')

    const invoiceNumber = await generateInvoiceNumber(db)
    const invoiceId = uuidv4()
    const now = new Date().toISOString()

    let invoice

    // Create from quote
    if (body.quoteId) {
      const quote = await quotes.findOne({ id: body.quoteId })
      if (!quote) return errorResponse('Quote not found', 404)

      // Check if quote already has an invoice
      if (quote.invoiceId && !body.force) {
        return errorResponse('Quote already has an invoice. Use force=true to create another.', 400)
      }

      invoice = {
        id: invoiceId,
        invoiceNumber,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        projectId: quote.projectId,
        projectSegment: quote.projectSegment || 'b2c',
        leadId: quote.leadId,
        customer: quote.customer,
        site: quote.site,
        rooms: quote.rooms,
        items: quote.items || [],
        template: body.template || 'standard',
        materialTotal: quote.materialTotal || 0,
        laborTotal: quote.laborTotal || 0,
        accessoryTotal: quote.accessoryTotal || 0,
        subtotal: quote.subtotal || 0,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountAmount: quote.discountAmount || 0,
        taxableAmount: quote.taxableAmount || 0,
        cgstRate: quote.cgstRate || 9,
        cgst: quote.cgst || 0,
        sgstRate: quote.sgstRate || 9,
        sgst: quote.sgst || 0,
        igstRate: quote.igstRate || 18,
        igst: quote.igst || 0,
        isInterstate: quote.isInterstate || false,
        totalTax: quote.totalTax || 0,
        grandTotal: quote.grandTotal || 0,
        currency: 'INR',
        dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        paidAmount: 0,
        balanceAmount: quote.grandTotal || 0,
        paymentTerms: quote.paymentTerms || 'Net 30',
        bankDetails: body.bankDetails || {
          bankName: '',
          accountName: '',
          accountNumber: '',
          ifscCode: '',
          upiId: ''
        },
        notes: body.notes || quote.notes || '',
        terms: quote.terms || '',
        statusHistory: [{
          status: 'draft',
          timestamp: now,
          by: user.id,
          notes: 'Invoice created from quote'
        }],
        payments: [],
        sentAt: null,
        viewedAt: null,
        paidAt: null,
        crmSynced: false,
        crmSyncedAt: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      // Update quote with invoice reference and status
      await quotes.updateOne(
        { id: body.quoteId },
        { 
          $set: { 
            invoiceId, 
            invoiceNumber,
            invoiceCreatedAt: now, 
            status: 'invoiced',
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'invoiced',
              timestamp: now,
              by: user.id,
              notes: `Invoice ${invoiceNumber} created`
            }
          }
        }
      )
    } else {
      // Create invoice manually
      const items = body.items || []
      const materialTotal = items.filter(i => i.itemType === 'material').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
      const laborTotal = items.filter(i => i.itemType === 'labor').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
      const accessoryTotal = items.filter(i => i.itemType === 'accessory').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
      const subtotal = materialTotal + laborTotal + accessoryTotal
      
      const discountAmount = body.discountType === 'percent' 
        ? subtotal * ((body.discountValue || 0) / 100)
        : (body.discountValue || 0)
      
      const taxableAmount = subtotal - discountAmount
      const cgst = taxableAmount * ((body.cgstRate || 9) / 100)
      const sgst = taxableAmount * ((body.sgstRate || 9) / 100)
      const igst = body.isInterstate ? taxableAmount * ((body.igstRate || 18) / 100) : 0
      const totalTax = body.isInterstate ? igst : (cgst + sgst)
      const grandTotal = taxableAmount + totalTax

      invoice = {
        id: invoiceId,
        invoiceNumber,
        projectId: body.projectId,
        projectSegment: body.projectSegment || 'b2c',
        leadId: body.leadId,
        customer: body.customer || {},
        site: body.site || {},
        items,
        template: body.template || 'standard',
        materialTotal,
        laborTotal,
        accessoryTotal,
        subtotal,
        discountType: body.discountType || 'fixed',
        discountValue: body.discountValue || 0,
        discountAmount,
        taxableAmount,
        cgstRate: body.cgstRate || 9,
        cgst,
        sgstRate: body.sgstRate || 9,
        sgst,
        igstRate: body.igstRate || 18,
        igst,
        isInterstate: body.isInterstate || false,
        totalTax,
        grandTotal,
        currency: 'INR',
        dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        paidAmount: 0,
        balanceAmount: grandTotal,
        paymentTerms: body.paymentTerms || 'Net 30',
        bankDetails: body.bankDetails || {},
        notes: body.notes || '',
        terms: body.terms || '',
        statusHistory: [{
          status: 'draft',
          timestamp: now,
          by: user.id,
          notes: 'Invoice created'
        }],
        payments: [],
        crmSynced: false,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }
    }

    await invoices.insertOne(invoice)

    // Update lead status
    if (invoice.leadId) {
      await leads.updateOne(
        { id: invoice.leadId },
        { $set: { flooringStatus: 'invoice_created', updatedAt: now } }
      )
    }

    // CONVERT INVENTORY RESERVATIONS when invoice is created from quote
    // This moves items from "blocked/reserved" to "sold/deducted" in inventory
    // Also handles direct deduction for items without reservations
    const inventoryResult = await convertInventoryReservation(
      db, 
      user.clientId, 
      body.quoteId || null,
      invoice.items || [],
      invoice.id,
      invoice.invoiceNumber
    )
    invoice.inventoryConversionResult = inventoryResult

    // Update invoice with inventory result
    await invoices.updateOne(
      { id: invoice.id },
      { $set: { inventoryDeducted: true, inventoryResult, updatedAt: now } }
    )

    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Invoices POST Error:', error)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}

// PUT - Update invoice or record action
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Invoice ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const payments = db.collection('flooring_payments')
    const leads = db.collection('leads')
    const quotes = db.collection('flooring_quotes_v2')

    const invoice = await invoices.findOne({ id })
    if (!invoice) return errorResponse('Invoice not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'send':
        await invoices.updateOne({ id }, {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'sent', timestamp: now, by: user.id, notes: 'Invoice sent to customer' } }
        })
        
        // Sync to CRM
        const sentInvoice = { ...invoice, status: 'sent' }
        await syncInvoiceToCRM(db, sentInvoice, user)
        
        return successResponse({ message: 'Invoice sent successfully', syncedToCRM: true })

      case 'record_payment':
        const paymentAmount = parseFloat(body.amount)
        if (!paymentAmount || paymentAmount <= 0) {
          return errorResponse('Valid payment amount required', 400)
        }
        if (paymentAmount > (invoice.balanceAmount || invoice.grandTotal)) {
          return errorResponse('Payment amount exceeds balance', 400)
        }

        const paymentId = uuidv4()
        const payment = {
          id: paymentId,
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber,
          amount: paymentAmount,
          method: body.method || 'bank_transfer',
          reference: body.reference || '',
          transactionId: body.transactionId || '',
          receivedDate: body.receivedDate || now,
          notes: body.paymentNotes || '',
          recordedBy: user.id,
          createdAt: now
        }

        await payments.insertOne(payment)

        const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount
        const newBalance = invoice.grandTotal - newPaidAmount
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid'

        const paymentUpdateData = {
          paidAmount: newPaidAmount,
          balanceAmount: Math.max(0, newBalance),
          status: newStatus,
          lastPaymentDate: now,
          lastPaymentAmount: paymentAmount,
          updatedAt: now
        }
        
        if (newStatus === 'paid') {
          paymentUpdateData.paidAt = now
        }

        await invoices.updateOne({ id }, {
          $set: paymentUpdateData,
          $push: {
            payments: payment,
            statusHistory: {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: `Payment of ₹${paymentAmount.toLocaleString()} received via ${body.method || 'bank_transfer'}`
            }
          }
        })

        // Sync to CRM
        const paidInvoice = { ...invoice, ...paymentUpdateData }
        const syncResult = await syncInvoiceToCRM(db, paidInvoice, user)

        return successResponse({ 
          message: 'Payment recorded successfully', 
          payment, 
          newStatus, 
          newBalance: Math.max(0, newBalance),
          syncedToCRM: syncResult
        })

      case 'mark_viewed':
        await invoices.updateOne({ id }, {
          $set: { viewedAt: invoice.viewedAt || now, updatedAt: now },
          $inc: { viewCount: 1 }
        })
        return successResponse({ message: 'Invoice marked as viewed' })

      case 'mark_dispatched':
        // B2B only - mark material as dispatched
        await invoices.updateOne({ id }, {
          $set: { 
            dispatchedAt: now,
            dispatchedBy: user.id,
            dispatchStatus: 'dispatched',
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'dispatched',
              timestamp: now,
              by: user.id,
              notes: 'Material dispatched for delivery'
            }
          }
        })
        return successResponse({ message: 'Invoice marked as dispatched' })

      case 'sync_crm':
        // Manual CRM sync
        const syncResults = await syncInvoiceToCRM(db, invoice, user)
        await invoices.updateOne({ id }, {
          $set: { crmSynced: true, crmSyncedAt: now, updatedAt: now }
        })
        return successResponse({ message: 'Invoice synced to CRM', results: syncResults })

      case 'cancel':
        // Validate - cannot cancel if payments exist
        if ((invoice.paidAmount || 0) > 0 && !body.force) {
          return errorResponse('Cannot cancel invoice with payments. Use force=true or refund payments first.', 400)
        }

        await invoices.updateOne({ id }, {
          $set: { 
            status: 'cancelled', 
            cancelledAt: now, 
            cancelReason: body.reason || 'Cancelled by user',
            updatedAt: now 
          },
          $push: { 
            statusHistory: { 
              status: 'cancelled', 
              timestamp: now, 
              by: user.id, 
              reason: body.reason || 'Cancelled by user'
            } 
          }
        })
        
        // If this invoice was created from a quote, revert the quote status back to 'approved'
        if (invoice.quoteId) {
          await quotes.updateOne(
            { id: invoice.quoteId },
            {
              $set: { status: 'approved', invoiceId: null, invoiceCancelledAt: now, updatedAt: now },
              $push: {
                statusHistory: {
                  status: 'approved',
                  timestamp: now,
                  by: user.id,
                  notes: `Invoice ${invoice.invoiceNumber} was cancelled. Quote can be re-invoiced.`
                }
              }
            }
          )
        }
        
        // Sync cancelled status to CRM
        const cancelledInvoice = { ...invoice, status: 'cancelled' }
        await syncInvoiceToCRM(db, cancelledInvoice, user)
        
        return successResponse({ message: 'Invoice cancelled', quoteReverted: !!invoice.quoteId })

      case 'refund':
        const refundAmount = parseFloat(body.refundAmount)
        if (!refundAmount || refundAmount <= 0 || refundAmount > (invoice.paidAmount || 0)) {
          return errorResponse('Invalid refund amount', 400)
        }

        const refundId = uuidv4()
        const refund = {
          id: refundId,
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber,
          amount: -refundAmount, // Negative for refund
          method: body.method || 'bank_transfer',
          reference: body.reference || '',
          reason: body.reason || 'Refund',
          processedBy: user.id,
          createdAt: now
        }

        await payments.insertOne(refund)

        const refundedPaidAmount = Math.max(0, (invoice.paidAmount || 0) - refundAmount)
        const refundedBalance = invoice.grandTotal - refundedPaidAmount
        const refundedStatus = refundedPaidAmount === 0 ? 'sent' : 'partially_paid'

        await invoices.updateOne({ id }, {
          $set: {
            paidAmount: refundedPaidAmount,
            balanceAmount: refundedBalance,
            status: refundedStatus,
            lastRefundDate: now,
            lastRefundAmount: refundAmount,
            updatedAt: now
          },
          $push: {
            payments: refund,
            statusHistory: {
              status: refundedStatus,
              timestamp: now,
              by: user.id,
              notes: `Refund of ₹${refundAmount.toLocaleString()} processed`
            }
          }
        })

        return successResponse({ 
          message: 'Refund processed successfully', 
          refund,
          newStatus: refundedStatus,
          newBalance: refundedBalance
        })

      case 'send_reminder':
        // Update reminder sent timestamp
        await invoices.updateOne({ id }, {
          $set: { lastReminderSent: now, updatedAt: now },
          $inc: { reminderCount: 1 },
          $push: {
            statusHistory: {
              status: invoice.status,
              timestamp: now,
              by: user.id,
              notes: 'Payment reminder sent'
            }
          }
        })
        return successResponse({ message: 'Reminder sent successfully' })

      case 'update_due_date':
        if (!body.newDueDate) {
          return errorResponse('New due date required', 400)
        }
        await invoices.updateOne({ id }, {
          $set: { dueDate: body.newDueDate, updatedAt: now },
          $push: {
            statusHistory: {
              status: invoice.status,
              timestamp: now,
              by: user.id,
              notes: `Due date updated to ${new Date(body.newDueDate).toLocaleDateString()}`
            }
          }
        })
        return successResponse({ message: 'Due date updated' })

      case 'add_note':
        if (!body.note) {
          return errorResponse('Note content required', 400)
        }
        await invoices.updateOne({ id }, {
          $push: { 
            internalNotes: {
              note: body.note,
              addedBy: user.id,
              addedAt: now
            }
          },
          $set: { updatedAt: now }
        })
        return successResponse({ message: 'Note added' })

      default:
        // Regular update
        updateData.updatedAt = now
        updateData.updatedBy = user.id

        const result = await invoices.findOneAndUpdate(
          { id },
          { $set: updateData },
          { returnDocument: 'after' }
        )
        return successResponse(sanitizeDocument(result))
    }
  } catch (error) {
    console.error('Invoices PUT Error:', error)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}

// DELETE - Delete invoice (only if draft)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Invoice ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('flooring_invoices')
    const quotes = db.collection('flooring_quotes_v2')

    const invoice = await invoices.findOne({ id })
    if (!invoice) return errorResponse('Invoice not found', 404)

    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      return errorResponse('Only draft invoices can be deleted. Cancel the invoice instead.', 400)
    }

    // If linked to quote, revert quote status
    if (invoice.quoteId) {
      await quotes.updateOne(
        { id: invoice.quoteId },
        { 
          $set: { 
            invoiceId: null, 
            status: 'approved',
            updatedAt: new Date().toISOString()
          }
        }
      )
    }

    await invoices.deleteOne({ id })

    return successResponse({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Invoices DELETE Error:', error)
    return errorResponse('Failed to delete invoice', 500, error.message)
  }
}
