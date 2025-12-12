import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections, InvoiceStatus } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const overdue = searchParams.get('overdue')
    
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    
    const filter = { clientId: user.clientId }
    if (status) filter.status = status
    if (customerId) filter.customerId = customerId
    
    let invoices = await invoicesCollection.find(filter).sort({ createdAt: -1 }).toArray()
    
    // Filter overdue invoices
    if (overdue === 'true') {
      invoices = invoices.filter(inv => 
        inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.dueDate) < new Date()
      )
    }
    
    // Calculate summary
    const summary = {
      total: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      paidAmount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.grandTotal, 0),
      pendingAmount: invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + (inv.grandTotal - (inv.paidAmount || 0)), 0),
      overdueCount: invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.dueDate) < new Date()).length
    }
    
    return successResponse({
      invoices: sanitizeDocuments(invoices),
      summary,
      statusOptions: InvoiceStatus
    })
  } catch (error) {
    console.error('Flooring Invoices GET Error:', error)
    return errorResponse('Failed to fetch invoices', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { 
      customerName, customerEmail, customerPhone, customerAddress, customerId,
      quotationId, projectId, items, installationCost, deliveryCost, 
      discount, taxRate, notes, paymentTerms, dueDate
    } = body
    
    if (!customerName || !items || items.length === 0) {
      return errorResponse('Customer name and at least one item are required', 400)
    }
    
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    
    // If created from quotation, get quotation data
    let quotationData = null
    if (quotationId) {
      quotationData = await quotationsCollection.findOne({ id: quotationId, clientId: user.clientId })
    }
    
    // Calculate totals
    let subtotal = 0
    const processedItems = items.map(item => {
      const itemTotal = (item.quantity || 0) * (item.pricePerUnit || 0)
      subtotal += itemTotal
      return { ...item, total: itemTotal }
    })
    
    const installationTotal = installationCost || quotationData?.installationCost || 0
    const deliveryTotal = deliveryCost || quotationData?.deliveryCost || 0
    const discountAmount = discount || quotationData?.discount || 0
    const tax = taxRate || quotationData?.taxRate || 18
    
    const taxableAmount = subtotal + installationTotal + deliveryTotal - discountAmount
    const taxAmount = taxableAmount * (tax / 100)
    const grandTotal = taxableAmount + taxAmount
    
    // Generate invoice number
    const count = await invoicesCollection.countDocuments({ clientId: user.clientId })
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`
    
    const invoice = {
      id: uuidv4(),
      clientId: user.clientId,
      invoiceNumber,
      customerName,
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerId: customerId || null,
      quotationId: quotationId || null,
      projectId: projectId || null,
      items: processedItems,
      subtotal,
      installationCost: installationTotal,
      deliveryCost: deliveryTotal,
      discount: discountAmount,
      taxRate: tax,
      taxAmount,
      grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
      status: 'draft',
      paymentTerms: paymentTerms || 'Net 30',
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      payments: [],
      notes: notes || '',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await invoicesCollection.insertOne(invoice)
    
    // Update quotation status if linked
    if (quotationId) {
      await quotationsCollection.updateOne(
        { id: quotationId },
        { $set: { status: 'accepted', invoiceId: invoice.id, updatedAt: new Date() } }
      )
    }
    
    return successResponse(sanitizeDocument(invoice), 201)
  } catch (error) {
    console.error('Flooring Invoices POST Error:', error)
    return errorResponse('Failed to create invoice', 500, error.message)
  }
}
