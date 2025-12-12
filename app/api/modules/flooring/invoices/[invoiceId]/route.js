import { v4 as uuidv4 } from 'uuid'
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
    
    const invoiceId = params.invoiceId
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    
    const invoice = await invoicesCollection.findOne({ id: invoiceId, clientId: user.clientId })
    if (!invoice) {
      return errorResponse('Invoice not found', 404)
    }
    
    return successResponse(sanitizeDocument(invoice))
  } catch (error) {
    console.error('Flooring Invoice GET Error:', error)
    return errorResponse('Failed to fetch invoice', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const invoiceId = params.invoiceId
    const body = await request.json()
    
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    
    const invoice = await invoicesCollection.findOne({ id: invoiceId, clientId: user.clientId })
    if (!invoice) {
      return errorResponse('Invoice not found', 404)
    }
    
    // Handle payment recording
    if (body.action === 'record_payment') {
      const { amount, paymentMethod, paymentDate, reference, notes } = body
      
      if (!amount || amount <= 0) {
        return errorResponse('Valid payment amount is required', 400)
      }
      
      if (amount > invoice.balanceDue) {
        return errorResponse('Payment amount exceeds balance due', 400)
      }
      
      const payment = {
        id: uuidv4(),
        amount,
        paymentMethod: paymentMethod || 'cash',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        reference: reference || '',
        notes: notes || '',
        recordedBy: user.id,
        recordedAt: new Date()
      }
      
      const newPaidAmount = invoice.paidAmount + amount
      const newBalanceDue = invoice.grandTotal - newPaidAmount
      const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid'
      
      await invoicesCollection.updateOne(
        { id: invoiceId },
        {
          $push: { payments: payment },
          $set: {
            paidAmount: newPaidAmount,
            balanceDue: newBalanceDue,
            status: newStatus,
            updatedAt: new Date()
          }
        }
      )
      
      return successResponse({ 
        message: 'Payment recorded successfully',
        payment,
        newBalance: newBalanceDue,
        status: newStatus
      })
    }
    
    // Handle status change
    if (body.status && body.status !== invoice.status) {
      const { id, clientId, createdAt, createdBy, payments, ...updateData } = body
      updateData.updatedAt = new Date()
      
      await invoicesCollection.updateOne(
        { id: invoiceId, clientId: user.clientId },
        { $set: updateData }
      )
      
      return successResponse({ message: 'Invoice updated successfully' })
    }
    
    // General update
    const { id, clientId, createdAt, createdBy, payments, ...updateData } = body
    updateData.updatedAt = new Date()
    
    await invoicesCollection.updateOne(
      { id: invoiceId, clientId: user.clientId },
      { $set: updateData }
    )
    
    return successResponse({ message: 'Invoice updated successfully' })
  } catch (error) {
    console.error('Flooring Invoice PUT Error:', error)
    return errorResponse('Failed to update invoice', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const invoiceId = params.invoiceId
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    
    const invoice = await invoicesCollection.findOne({ id: invoiceId, clientId: user.clientId })
    if (!invoice) {
      return errorResponse('Invoice not found', 404)
    }
    
    if (invoice.status !== 'draft') {
      return errorResponse('Can only delete draft invoices', 400)
    }
    
    await invoicesCollection.deleteOne({ id: invoiceId, clientId: user.clientId })
    
    return successResponse({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Flooring Invoice DELETE Error:', error)
    return errorResponse('Failed to delete invoice', 500, error.message)
  }
}
