import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch quotations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('id')
    const surveyId = searchParams.get('surveyId')
    const leadId = searchParams.get('leadId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_quotations')
    
    let query = {}
    if (quoteId) query.id = quoteId
    if (surveyId) query.surveyId = surveyId
    if (leadId) query.leadId = leadId
    if (status) query.status = status

    const quotations = await collection.find(query).sort({ createdAt: -1 }).toArray()

    // If single quote requested, include line items
    if (quoteId && quotations.length > 0) {
      const lineItemsCollection = db.collection('dw_quote_items')
      const items = await lineItemsCollection.find({ quoteId }).toArray()
      quotations[0].lineItems = sanitizeDocuments(items)
    }

    const stats = {
      total: quotations.length,
      draft: quotations.filter(q => q.status === 'draft').length,
      sent: quotations.filter(q => q.status === 'sent').length,
      approved: quotations.filter(q => q.status === 'approved').length,
      rejected: quotations.filter(q => q.status === 'rejected').length,
      totalValue: quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      avgValue: quotations.length > 0 ? quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / quotations.length : 0
    }

    return successResponse({ quotations: sanitizeDocuments(quotations), stats })
  } catch (error) {
    console.error('DW Quotations GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch quotations', 500, error.message)
  }
}

// POST - Create quotation or add line item
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Add line item to quotation
    if (action === 'add-item') {
      const itemsCollection = db.collection('dw_quote_items')
      const quotesCollection = db.collection('dw_quotations')

      const area = (parseFloat(body.width) || 0) * (parseFloat(body.height) || 0) / 144 // sq.ft

      const item = {
        id: uuidv4(),
        quoteId: body.quoteId,
        openingId: body.openingId || null,
        clientId: user.clientId,
        
        // Item details
        itemType: body.itemType || 'product', // product, fabrication, installation, transport, scaffolding, amc
        description: body.description || '',
        
        // Opening details (if product)
        room: body.room || '',
        openingRef: body.openingRef || '',
        type: body.type || 'window',
        category: body.category || 'sliding',
        
        // Dimensions
        width: parseFloat(body.width) || 0,
        height: parseFloat(body.height) || 0,
        area: area,
        quantity: parseInt(body.quantity) || 1,
        
        // Configuration
        systemSeries: body.systemSeries || '',
        frame: body.frame || '',
        sash: body.sash || '',
        glass: body.glass || '',
        hardwareSet: body.hardwareSet || '',
        finish: body.finish || '',
        accessories: body.accessories || [],
        
        // Calculations
        profileLength: parseFloat(body.profileLength) || 0,
        glassArea: parseFloat(body.glassArea) || area * 0.85,
        hardwareCount: parseInt(body.hardwareCount) || 1,
        wastePercent: parseFloat(body.wastePercent) || 10,
        
        // Pricing
        unitPrice: parseFloat(body.unitPrice) || 0,
        pricePerSqft: parseFloat(body.pricePerSqft) || 0,
        baseAmount: 0,
        discount: parseFloat(body.discount) || 0,
        discountType: body.discountType || 'percent', // percent, fixed
        taxRate: parseFloat(body.taxRate) || 18,
        taxAmount: 0,
        totalAmount: 0,
        
        notes: body.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Calculate amounts
      const baseAmount = item.pricePerSqft > 0 
        ? item.area * item.pricePerSqft * item.quantity
        : item.unitPrice * item.quantity
      
      const discountAmount = item.discountType === 'percent' 
        ? baseAmount * (item.discount / 100)
        : item.discount
      
      const afterDiscount = baseAmount - discountAmount
      const taxAmount = afterDiscount * (item.taxRate / 100)
      
      item.baseAmount = baseAmount
      item.discountAmount = discountAmount
      item.taxAmount = taxAmount
      item.totalAmount = afterDiscount + taxAmount

      await itemsCollection.insertOne(item)

      // Recalculate quote totals
      await recalculateQuoteTotals(db, body.quoteId)

      return successResponse(sanitizeDocument(item), 201)
    }

    // Generate quote from survey
    if (action === 'generate-from-survey') {
      const surveysCollection = db.collection('dw_surveys')
      const openingsCollection = db.collection('dw_openings')
      const quotesCollection = db.collection('dw_quotations')

      const survey = await surveysCollection.findOne({ id: body.surveyId })
      if (!survey) return errorResponse('Survey not found', 404)

      const openings = await openingsCollection.find({ surveyId: body.surveyId }).toArray()

      // Create quote
      const quote = {
        id: uuidv4(),
        clientId: user.clientId,
        quoteNumber: `QT-${Date.now()}`,
        version: 1,
        parentQuoteId: null,
        
        surveyId: body.surveyId,
        leadId: survey.leadId,
        projectId: survey.projectId,
        
        customerName: survey.contactPerson || '',
        customerPhone: survey.contactPhone || '',
        customerEmail: body.customerEmail || '',
        siteAddress: survey.siteAddress || '',
        
        priceList: body.priceList || 'retail',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        
        // Totals
        itemsCount: openings.length,
        totalArea: openings.reduce((sum, o) => sum + (o.area || 0), 0),
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        grandTotal: 0,
        
        // Additional charges
        fabricationCharge: parseFloat(body.fabricationCharge) || 0,
        installationCharge: parseFloat(body.installationCharge) || 0,
        transportCharge: parseFloat(body.transportCharge) || 0,
        scaffoldingCharge: parseFloat(body.scaffoldingCharge) || 0,
        
        // Discount approval
        discountRequested: 0,
        discountApproved: false,
        discountApprovedBy: null,
        discountReason: '',
        
        // Status
        status: 'draft', // draft, pending-approval, sent, viewed, approved, rejected, expired
        sentAt: null,
        viewedAt: null,
        approvedAt: null,
        
        // Terms
        paymentTerms: body.paymentTerms || 'As per company policy',
        warranty: body.warranty || 'As per product warranty terms',
        exclusions: body.exclusions || [],
        notes: body.notes || '',
        
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await quotesCollection.insertOne(quote)
      return successResponse(sanitizeDocument(quote), 201)
    }

    // Request discount approval
    if (action === 'request-discount') {
      const collection = db.collection('dw_quotations')
      const result = await collection.findOneAndUpdate(
        { id: body.quoteId },
        {
          $set: {
            discountRequested: parseFloat(body.discountPercent) || 0,
            discountReason: body.reason || '',
            status: 'pending-approval',
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Quotation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Create new version
    if (action === 'create-version') {
      const quotesCollection = db.collection('dw_quotations')
      const itemsCollection = db.collection('dw_quote_items')

      const originalQuote = await quotesCollection.findOne({ id: body.quoteId })
      if (!originalQuote) return errorResponse('Original quotation not found', 404)

      const originalItems = await itemsCollection.find({ quoteId: body.quoteId }).toArray()

      // Create new version
      const newQuoteId = uuidv4()
      const newQuote = {
        ...originalQuote,
        _id: undefined,
        id: newQuoteId,
        quoteNumber: `${originalQuote.quoteNumber}-V${originalQuote.version + 1}`,
        version: originalQuote.version + 1,
        parentQuoteId: originalQuote.id,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await quotesCollection.insertOne(newQuote)

      // Copy line items
      for (const item of originalItems) {
        await itemsCollection.insertOne({
          ...item,
          _id: undefined,
          id: uuidv4(),
          quoteId: newQuoteId,
          createdAt: new Date()
        })
      }

      return successResponse(sanitizeDocument(newQuote), 201)
    }

    // Create new quotation
    const collection = db.collection('dw_quotations')

    const quotation = {
      id: uuidv4(),
      clientId: user.clientId,
      quoteNumber: `QT-${Date.now()}`,
      version: 1,
      parentQuoteId: null,
      
      surveyId: body.surveyId || null,
      leadId: body.leadId || null,
      projectId: body.projectId || null,
      
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      siteAddress: body.siteAddress || '',
      
      priceList: body.priceList || 'retail',
      validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      
      itemsCount: 0,
      totalArea: 0,
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 0,
      
      fabricationCharge: parseFloat(body.fabricationCharge) || 0,
      installationCharge: parseFloat(body.installationCharge) || 0,
      transportCharge: parseFloat(body.transportCharge) || 0,
      scaffoldingCharge: parseFloat(body.scaffoldingCharge) || 0,
      
      discountRequested: 0,
      discountApproved: false,
      discountApprovedBy: null,
      discountReason: '',
      
      status: 'draft',
      sentAt: null,
      viewedAt: null,
      approvedAt: null,
      
      paymentTerms: body.paymentTerms || '',
      warranty: body.warranty || '',
      exclusions: body.exclusions || [],
      notes: body.notes || '',
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(quotation)
    return successResponse(sanitizeDocument(quotation), 201)
  } catch (error) {
    console.error('DW Quotations POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create quotation', 500, error.message)
  }
}

// PUT - Update quotation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_quotations')

    // Approve discount
    if (action === 'approve-discount') {
      const result = await collection.findOneAndUpdate(
        { id },
        {
          $set: {
            discountApproved: true,
            discountApprovedBy: user.id,
            status: 'draft',
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Quotation not found', 404)
      await recalculateQuoteTotals(db, id)
      const updated = await collection.findOne({ id })
      return successResponse(sanitizeDocument(updated))
    }

    // Send quote
    if (action === 'send') {
      const result = await collection.findOneAndUpdate(
        { id },
        {
          $set: {
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Quotation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Mark as approved
    if (action === 'approve') {
      const result = await collection.findOneAndUpdate(
        { id },
        {
          $set: {
            status: 'approved',
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Quotation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Regular update
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Quotation not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Quotations PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update quotation', 500, error.message)
  }
}

// DELETE - Delete quotation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const itemId = searchParams.get('itemId')

    if (!id && !itemId) return errorResponse('ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Delete single line item
    if (itemId) {
      const itemsCollection = db.collection('dw_quote_items')
      const item = await itemsCollection.findOne({ id: itemId })
      if (!item) return errorResponse('Item not found', 404)
      
      await itemsCollection.deleteOne({ id: itemId })
      await recalculateQuoteTotals(db, item.quoteId)
      
      return successResponse({ message: 'Item deleted successfully' })
    }

    // Delete quotation and all items
    const quotesCollection = db.collection('dw_quotations')
    const itemsCollection = db.collection('dw_quote_items')

    await itemsCollection.deleteMany({ quoteId: id })
    const result = await quotesCollection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Quotation not found', 404)
    return successResponse({ message: 'Quotation deleted successfully' })
  } catch (error) {
    console.error('DW Quotations DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete', 500, error.message)
  }
}

// Helper function to recalculate quote totals
async function recalculateQuoteTotals(db, quoteId) {
  const itemsCollection = db.collection('dw_quote_items')
  const quotesCollection = db.collection('dw_quotations')

  const items = await itemsCollection.find({ quoteId }).toArray()
  
  const totals = items.reduce((acc, item) => {
    acc.itemsCount++
    acc.totalArea += item.area || 0
    acc.subtotal += item.baseAmount || 0
    acc.totalDiscount += item.discountAmount || 0
    acc.totalTax += item.taxAmount || 0
    acc.grandTotal += item.totalAmount || 0
    return acc
  }, { itemsCount: 0, totalArea: 0, subtotal: 0, totalDiscount: 0, totalTax: 0, grandTotal: 0 })

  await quotesCollection.updateOne(
    { id: quoteId },
    { $set: { ...totals, updatedAt: new Date() } }
  )
}
