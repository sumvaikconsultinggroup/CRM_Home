import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const quotationId = params.quotationId
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    
    const quotation = await quotationsCollection.findOne({ id: quotationId, clientId: user.clientId })
    if (!quotation) {
      return errorResponse('Quotation not found', 404)
    }
    
    return successResponse(sanitizeDocument(quotation))
  } catch (error) {
    console.error('Flooring Quotation GET Error:', error)
    return errorResponse('Failed to fetch quotation', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const quotationId = params.quotationId
    const body = await request.json()
    
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    
    const quotation = await quotationsCollection.findOne({ id: quotationId, clientId: user.clientId })
    if (!quotation) {
      return errorResponse('Quotation not found', 404)
    }
    
    // Handle status changes
    if (body.status) {
      const validTransitions = {
        'draft': ['sent'],
        'sent': ['viewed', 'accepted', 'rejected', 'expired'],
        'viewed': ['accepted', 'rejected', 'expired'],
        'accepted': [],
        'rejected': [],
        'expired': []
      }
      
      if (!validTransitions[quotation.status]?.includes(body.status)) {
        return errorResponse(`Cannot change status from ${quotation.status} to ${body.status}`, 400)
      }
    }
    
    // Recalculate totals if items changed
    if (body.items) {
      let subtotal = 0
      body.items = body.items.map(item => {
        const itemTotal = (item.quantity || 0) * (item.pricePerUnit || 0)
        subtotal += itemTotal
        return { ...item, total: itemTotal }
      })
      body.subtotal = subtotal
      
      const installationTotal = body.installationCost || quotation.installationCost || 0
      const deliveryTotal = body.deliveryCost || quotation.deliveryCost || 0
      const discount = body.discount || quotation.discount || 0
      const taxRate = body.taxRate || quotation.taxRate || 18
      
      const taxableAmount = subtotal + installationTotal + deliveryTotal - discount
      body.taxAmount = taxableAmount * (taxRate / 100)
      body.grandTotal = taxableAmount + body.taxAmount
    }
    
    const { id, clientId, createdAt, createdBy, ...updateData } = body
    updateData.updatedAt = new Date()
    
    await quotationsCollection.updateOne(
      { id: quotationId, clientId: user.clientId },
      { $set: updateData }
    )
    
    return successResponse({ message: 'Quotation updated successfully' })
  } catch (error) {
    console.error('Flooring Quotation PUT Error:', error)
    return errorResponse('Failed to update quotation', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const quotationId = params.quotationId
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    
    const quotation = await quotationsCollection.findOne({ id: quotationId, clientId: user.clientId })
    if (!quotation) {
      return errorResponse('Quotation not found', 404)
    }
    
    if (quotation.status !== 'draft') {
      return errorResponse('Can only delete draft quotations', 400)
    }
    
    await quotationsCollection.deleteOne({ id: quotationId, clientId: user.clientId })
    
    return successResponse({ message: 'Quotation deleted successfully' })
  } catch (error) {
    console.error('Flooring Quotation DELETE Error:', error)
    return errorResponse('Failed to delete quotation', 500, error.message)
  }
}
