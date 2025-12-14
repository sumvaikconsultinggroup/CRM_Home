import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Helper function to calculate area in sqft from mm dimensions
function calculateArea(widthMm, heightMm) {
  const widthFt = widthMm / 304.8
  const heightFt = heightMm / 304.8
  return (widthFt * heightFt).toFixed(2)
}

// Helper to generate SVG drawing data for a window/door
function generateDrawingConfig(item) {
  const { width, height, type, configuration, panels, openingType } = item
  
  // Default configuration based on type
  const drawingConfig = {
    width: width || 1200,
    height: height || 1500,
    type: type || 'casement',
    viewDirection: 'inside', // viewed from inside/outside
    frameThickness: 60, // mm
    sashThickness: 50,
    panels: panels || [],
    annotations: [],
    showDimensions: true,
    showLabels: true
  }
  
  // Generate panel configuration if not provided
  if (!drawingConfig.panels.length) {
    const numPanels = configuration?.panels || 1
    const panelWidth = (width - (drawingConfig.frameThickness * 2)) / numPanels
    
    for (let i = 0; i < numPanels; i++) {
      drawingConfig.panels.push({
        id: `panel-${i}`,
        x: drawingConfig.frameThickness + (panelWidth * i),
        y: drawingConfig.frameThickness,
        width: panelWidth,
        height: height - (drawingConfig.frameThickness * 2),
        type: configuration?.panelTypes?.[i] || (i === 0 ? 'fixed' : 'openable'),
        openingDirection: configuration?.openingDirections?.[i] || 'left',
        hasHandle: configuration?.panelTypes?.[i] !== 'fixed'
      })
    }
  }
  
  // Add dimension annotations
  drawingConfig.annotations = [
    { type: 'dimension', position: 'bottom', value: width, label: `${width}w` },
    { type: 'dimension', position: 'right', value: height, label: `${height}h` },
    { type: 'area', value: calculateArea(width, height), label: `(${calculateArea(width, height)} sqft)` }
  ]
  
  return drawingConfig
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const requirementId = searchParams.get('requirementId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotations = db.collection('doors_windows_quotations')

    if (id) {
      const quotation = await quotations.findOne({ id })
      if (!quotation) return errorResponse('Quotation not found', 404)
      return successResponse(sanitizeDocument(quotation))
    }

    const query = { isActive: true }
    if (status) query.status = status
    if (customerId) query['customer.id'] = customerId
    if (requirementId) query.requirementId = requirementId

    const quoteList = await quotations.find(query).sort({ createdAt: -1 }).toArray()
    return successResponse({ quotations: sanitizeDocuments(quoteList) })
  } catch (error) {
    console.error('Doors-Windows Quotations GET Error:', error)
    return errorResponse('Failed to fetch quotations', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotations = db.collection('doors_windows_quotations')
    const counters = db.collection('counters')

    // Generate quote number
    const counter = await counters.findOneAndUpdate(
      { _id: 'doors_windows_quotation' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
    const quoteNumber = `DW-QT-${String(counter.seq || 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const quoteId = uuidv4()

    // Process line items and generate drawings
    const lineItems = (body.lineItems || []).map((item, index) => {
      const areaSqft = parseFloat(calculateArea(item.width, item.height))
      const amount = item.rate || (areaSqft * (item.pricePerSqft || 500))
      
      return {
        id: uuidv4(),
        lineNumber: String(index + 1).padStart(4, '0'),
        // Product info
        productType: item.productType || 'window', // window, door
        category: item.category || 'casement', // casement, fixed, sliding
        name: item.name || `${item.category || 'Casement'} ${item.productType || 'Window'}`,
        description: item.description || '',
        location: item.location || '', // e.g., "FF Front Right", "GF Kitchen"
        
        // Dimensions (in mm)
        width: item.width || 1200,
        height: item.height || 1500,
        areaSqft: areaSqft,
        
        // Configuration
        configuration: item.configuration || {
          panels: 1,
          panelTypes: ['openable'],
          openingDirections: ['left'],
          hasTransom: false,
          hasMullion: false
        },
        
        // Drawing configuration for SVG rendering
        drawingConfig: generateDrawingConfig(item),
        
        // Specifications
        frameMaterial: item.frameMaterial || 'upvc',
        frameProfile: item.frameProfile || 'KM01',
        profileColor: item.profileColor || 'white',
        glassType: item.glassType || '12mm Reflective T',
        glassThickness: item.glassThickness || 12,
        hardware: item.hardware || [],
        
        // Pricing
        quantity: item.quantity || 1,
        pricePerSqft: item.pricePerSqft || 500,
        rate: amount,
        amount: amount * (item.quantity || 1),
        
        // Custom notes
        notes: item.notes || '',
        
        // Status
        status: 'pending'
      }
    })

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const totalArea = lineItems.reduce((sum, item) => sum + (item.areaSqft * item.quantity), 0)
    const totalUnits = lineItems.reduce((sum, item) => sum + item.quantity, 0)
    const taxRate = body.taxRate || 18
    const sgst = subtotal * (taxRate / 2 / 100)
    const cgst = subtotal * (taxRate / 2 / 100)
    const grandTotal = subtotal + sgst + cgst

    const quotation = {
      id: quoteId,
      quoteNumber: quoteNumber,
      
      // Customer
      customer: body.customer || {},
      
      // Linked requirement
      requirementId: body.requirementId || null,
      
      // Delivery
      deliveryAddress: body.deliveryAddress || {},
      
      // Line items with drawings
      lineItems: lineItems,
      
      // Summary
      totalArea: totalArea.toFixed(2),
      totalUnits: totalUnits,
      
      // Pricing
      subtotal: subtotal,
      discountPercent: body.discountPercent || 0,
      discountAmount: body.discountAmount || 0,
      taxRate: taxRate,
      sgst: sgst,
      cgst: cgst,
      grandTotal: grandTotal,
      
      // Payment terms
      paymentTerms: body.paymentTerms || 'CWO',
      paymentSchedule: body.paymentSchedule || [
        { milestone: 'Advance', percent: 50 },
        { milestone: 'Before Delivery', percent: 40 },
        { milestone: 'After Installation', percent: 10 }
      ],
      
      // Terms & Conditions
      terms: body.terms || [],
      
      // Validity
      validDays: body.validDays || 15,
      validUntil: new Date(Date.now() + (body.validDays || 15) * 24 * 60 * 60 * 1000).toISOString(),
      
      // Branding
      companyInfo: body.companyInfo || {},
      
      // Status
      status: 'draft', // draft, sent, viewed, negotiation, approved, rejected, expired
      
      // Assigned
      responsible: body.responsible || user.id,
      
      // AI Generated narrative
      aiNarrative: null,
      
      // Revision tracking
      version: 1,
      previousVersions: [],
      
      // Metadata
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await quotations.insertOne(quotation)
    return successResponse(sanitizeDocument(quotation), 201)
  } catch (error) {
    console.error('Doors-Windows Quotations POST Error:', error)
    return errorResponse('Failed to create quotation', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Quotation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotations = db.collection('doors_windows_quotations')

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'send') {
      await quotations.updateOne(
        { id },
        { $set: { status: 'sent', sentAt: now, updatedAt: now } }
      )
      return successResponse({ message: 'Quotation sent' })
    }

    if (action === 'approve') {
      await quotations.updateOne(
        { id },
        { $set: { status: 'approved', approvedAt: now, approvedBy: body.approvedBy, updatedAt: now } }
      )
      return successResponse({ message: 'Quotation approved' })
    }

    if (action === 'reject') {
      await quotations.updateOne(
        { id },
        { $set: { status: 'rejected', rejectedAt: now, rejectionReason: body.reason, updatedAt: now } }
      )
      return successResponse({ message: 'Quotation rejected' })
    }

    if (action === 'revise') {
      // Create new version
      const current = await quotations.findOne({ id })
      if (!current) return errorResponse('Quotation not found', 404)

      const previousVersion = {
        version: current.version,
        lineItems: current.lineItems,
        grandTotal: current.grandTotal,
        savedAt: now
      }

      // Regenerate drawings for updated items
      if (updateData.lineItems) {
        updateData.lineItems = updateData.lineItems.map(item => ({
          ...item,
          drawingConfig: generateDrawingConfig(item)
        }))
      }

      await quotations.updateOne(
        { id },
        {
          $set: { ...updateData, version: current.version + 1, status: 'draft', updatedAt: now },
          $push: { previousVersions: previousVersion }
        }
      )

      return successResponse({ message: 'Revision created', version: current.version + 1 })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    // Regenerate drawings if line items changed
    if (updateData.lineItems) {
      updateData.lineItems = updateData.lineItems.map(item => ({
        ...item,
        drawingConfig: generateDrawingConfig(item)
      }))
    }

    const result = await quotations.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Quotation not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Quotations PUT Error:', error)
    return errorResponse('Failed to update quotation', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Quotation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotations = db.collection('doors_windows_quotations')

    await quotations.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Quotation deleted' })
  } catch (error) {
    console.error('Doors-Windows Quotations DELETE Error:', error)
    return errorResponse('Failed to delete quotation', 500, error.message)
  }
}
