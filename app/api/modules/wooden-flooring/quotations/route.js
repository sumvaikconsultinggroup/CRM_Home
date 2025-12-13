import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const quotationId = searchParams.get('id')

    const collection = await getCollection('wf_quotations')

    if (quotationId) {
      const quotation = await collection.findOne({ id: quotationId, clientId: user.clientId })
      if (!quotation) return errorResponse('Quotation not found', 404)
      return successResponse(sanitizeDocument(quotation))
    }

    let query = { clientId: user.clientId }
    if (status) query.status = status

    const quotations = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    const stats = {
      total: quotations.length,
      draft: quotations.filter(q => q.status === 'draft').length,
      sent: quotations.filter(q => q.status === 'sent').length,
      accepted: quotations.filter(q => q.status === 'accepted').length,
      rejected: quotations.filter(q => q.status === 'rejected').length,
      expired: quotations.filter(q => q.status === 'expired').length,
      totalValue: quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      acceptedValue: quotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.grandTotal || 0), 0)
    }

    return successResponse({ quotations: sanitizeDocuments(quotations), stats })
  } catch (error) {
    console.error('Quotations GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch quotations', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const collection = await getCollection('wf_quotations')

    // Calculate totals
    const lineItems = body.lineItems || []
    const roomItems = body.roomItems || []
    
    let subtotal = 0
    
    // Simple line items
    lineItems.forEach(item => {
      item.total = (item.quantity || 0) * (item.rate || 0)
      subtotal += item.total
    })
    
    // Room-wise items (advanced)
    roomItems.forEach(room => {
      room.items?.forEach(item => {
        item.total = (item.area || 0) * (item.ratePerSqFt || 0)
        subtotal += item.total
      })
      room.total = room.items?.reduce((sum, i) => sum + (i.total || 0), 0) || 0
    })

    const discountAmount = body.discountType === 'percentage' 
      ? (subtotal * (body.discountValue || 0) / 100)
      : (body.discountValue || 0)
    
    const taxableAmount = subtotal - discountAmount
    const gstAmount = taxableAmount * (body.gstRate || 18) / 100
    const grandTotal = taxableAmount + gstAmount

    const quotation = {
      id: uuidv4(),
      clientId: user.clientId,
      quotationNumber: `WFQ-${Date.now().toString().slice(-8)}`,
      // Customer & Project
      customerId: body.customerId,
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress || '',
      projectId: body.projectId || null,
      // Site Details
      siteAddress: body.siteAddress || '',
      totalArea: parseFloat(body.totalArea) || 0,
      // Quotation Type
      quotationType: body.quotationType || 'simple', // simple or advanced
      // Line Items (Simple)
      lineItems,
      // Room-wise Items (Advanced)
      roomItems,
      // Additional Items
      additionalItems: body.additionalItems || [],
      // Labor
      laborCharges: parseFloat(body.laborCharges) || 0,
      laborDescription: body.laborDescription || 'Installation charges',
      // Financials
      subtotal,
      discountType: body.discountType || 'amount',
      discountValue: parseFloat(body.discountValue) || 0,
      discountAmount,
      taxableAmount,
      gstRate: parseFloat(body.gstRate) || 18,
      gstAmount,
      grandTotal,
      // Terms
      validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      paymentTerms: body.paymentTerms || '50% advance, 50% on completion',
      deliveryTerms: body.deliveryTerms || '7-10 working days after confirmation',
      warranty: body.warranty || '1 year manufacturing warranty',
      termsAndConditions: body.termsAndConditions || [
        'Rates are subject to material availability',
        'Any additional work will be charged extra',
        'Quotation valid for 15 days from date of issue'
      ],
      notes: body.notes || '',
      // Status
      status: body.status || 'draft',
      sentAt: null,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: '',
      // Metadata
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(quotation)
    return successResponse(sanitizeDocument(quotation), 201)
  } catch (error) {
    console.error('Quotations POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create quotation', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Quotation ID is required', 400)

    const collection = await getCollection('wf_quotations')
    
    // Handle special actions
    if (action === 'send') {
      updates.status = 'sent'
      updates.sentAt = new Date()
    }
    if (action === 'accept') {
      updates.status = 'accepted'
      updates.acceptedAt = new Date()
    }
    if (action === 'reject') {
      updates.status = 'rejected'
      updates.rejectedAt = new Date()
      updates.rejectionReason = body.rejectionReason || ''
    }

    // Recalculate totals if items changed
    if (updates.lineItems || updates.roomItems) {
      let subtotal = 0
      
      (updates.lineItems || []).forEach(item => {
        item.total = (item.quantity || 0) * (item.rate || 0)
        subtotal += item.total
      })
      
      (updates.roomItems || []).forEach(room => {
        room.items?.forEach(item => {
          item.total = (item.area || 0) * (item.ratePerSqFt || 0)
          subtotal += item.total
        })
      })

      const discountAmount = updates.discountType === 'percentage' 
        ? (subtotal * (updates.discountValue || 0) / 100)
        : (updates.discountValue || 0)
      
      const taxableAmount = subtotal - discountAmount
      const gstAmount = taxableAmount * (updates.gstRate || 18) / 100
      
      updates.subtotal = subtotal
      updates.discountAmount = discountAmount
      updates.taxableAmount = taxableAmount
      updates.gstAmount = gstAmount
      updates.grandTotal = taxableAmount + gstAmount
    }

    const result = await collection.findOneAndUpdate(
      { id, clientId: user.clientId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Quotation not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Quotations PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update quotation', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Quotation ID is required', 400)

    const collection = await getCollection('wf_quotations')
    const result = await collection.deleteOne({ id, clientId: user.clientId })

    if (result.deletedCount === 0) return errorResponse('Quotation not found', 404)
    return successResponse({ message: 'Quotation deleted successfully' })
  } catch (error) {
    console.error('Quotations DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete quotation', 500, error.message)
  }
}
