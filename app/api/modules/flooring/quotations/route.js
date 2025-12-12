import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections, QuotationStatus } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const leadId = searchParams.get('leadId')
    
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    
    const filter = { clientId: user.clientId }
    if (status) filter.status = status
    if (leadId) filter.leadId = leadId
    
    const quotations = await quotationsCollection.find(filter).sort({ createdAt: -1 }).toArray()
    
    return successResponse({
      quotations: sanitizeDocuments(quotations),
      statusOptions: QuotationStatus
    })
  } catch (error) {
    console.error('Flooring Quotations GET Error:', error)
    return errorResponse('Failed to fetch quotations', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { 
      customerName, customerEmail, customerPhone, customerAddress,
      leadId, projectId, items, installationCost, deliveryCost, 
      discount, discountType, taxRate, notes, validUntil, terms
    } = body
    
    if (!customerName || !items || items.length === 0) {
      return errorResponse('Customer name and at least one item are required', 400)
    }
    
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    
    // Calculate totals
    let subtotal = 0
    const processedItems = items.map(item => {
      const itemTotal = (item.quantity || 0) * (item.pricePerUnit || 0)
      subtotal += itemTotal
      return {
        ...item,
        total: itemTotal
      }
    })
    
    // Add installation and delivery
    const installationTotal = installationCost || 0
    const deliveryTotal = deliveryCost || 0
    
    // Calculate discount
    let discountAmount = 0
    if (discount) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal + installationTotal + deliveryTotal) * (discount / 100)
      } else {
        discountAmount = discount
      }
    }
    
    // Calculate tax
    const taxableAmount = subtotal + installationTotal + deliveryTotal - discountAmount
    const taxAmount = taxableAmount * ((taxRate || 18) / 100)
    
    const grandTotal = taxableAmount + taxAmount
    
    // Generate quotation number
    const count = await quotationsCollection.countDocuments({ clientId: user.clientId })
    const quotationNumber = `QT-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`
    
    const quotation = {
      id: uuidv4(),
      clientId: user.clientId,
      quotationNumber,
      customerName,
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      leadId: leadId || null,
      projectId: projectId || null,
      items: processedItems,
      subtotal,
      installationCost: installationTotal,
      deliveryCost: deliveryTotal,
      discount: discountAmount,
      discountType: discountType || 'fixed',
      taxRate: taxRate || 18,
      taxAmount,
      grandTotal,
      status: 'draft',
      notes: notes || '',
      terms: terms || 'Standard terms and conditions apply. Quote valid for 15 days.',
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await quotationsCollection.insertOne(quotation)
    
    return successResponse(sanitizeDocument(quotation), 201)
  } catch (error) {
    console.error('Flooring Quotations POST Error:', error)
    return errorResponse('Failed to create quotation', 500, error.message)
  }
}
