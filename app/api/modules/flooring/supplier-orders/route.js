import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections, SupplierOrderStatus } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')
    
    const ordersCollection = await getCollection(FlooringCollections.SUPPLIER_ORDERS)
    
    const filter = { clientId: user.clientId }
    if (status) filter.status = status
    if (supplierId) filter.supplierId = supplierId
    
    const orders = await ordersCollection.find(filter).sort({ createdAt: -1 }).toArray()
    
    return successResponse({
      orders: sanitizeDocuments(orders),
      statusOptions: SupplierOrderStatus
    })
  } catch (error) {
    console.error('Flooring Supplier Orders GET Error:', error)
    return errorResponse('Failed to fetch supplier orders', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { 
      supplierId, items, projectId, deliveryAddress, 
      expectedDeliveryDate, notes, urgency
    } = body
    
    if (!supplierId || !items || items.length === 0) {
      return errorResponse('Supplier and items are required', 400)
    }
    
    const ordersCollection = await getCollection(FlooringCollections.SUPPLIER_ORDERS)
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    
    // Get supplier details
    const supplier = await suppliersCollection.findOne({ id: supplierId, clientId: user.clientId })
    if (!supplier) {
      return errorResponse('Supplier not found', 404)
    }
    
    // Calculate totals
    let subtotal = 0
    const processedItems = items.map(item => {
      const itemTotal = (item.quantity || 0) * (item.pricePerUnit || 0)
      subtotal += itemTotal
      return { ...item, total: itemTotal }
    })
    
    // Generate order number
    const count = await ordersCollection.countDocuments({ clientId: user.clientId })
    const orderNumber = `PO-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`
    
    const order = {
      id: uuidv4(),
      clientId: user.clientId,
      orderNumber,
      supplierId,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      supplierPhone: supplier.phone,
      items: processedItems,
      subtotal,
      taxRate: 18,
      taxAmount: subtotal * 0.18,
      grandTotal: subtotal * 1.18,
      projectId: projectId || null,
      deliveryAddress: deliveryAddress || '',
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : new Date(Date.now() + supplier.leadTime * 24 * 60 * 60 * 1000),
      actualDeliveryDate: null,
      status: 'pending',
      urgency: urgency || 'normal', // normal, urgent, critical
      notes: notes || '',
      trackingNumber: null,
      receivedItems: [],
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await ordersCollection.insertOne(order)
    
    return successResponse(sanitizeDocument(order), 201)
  } catch (error) {
    console.error('Flooring Supplier Orders POST Error:', error)
    return errorResponse('Failed to create supplier order', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { orderId, status, trackingNumber, receivedItems, notes } = body
    
    if (!orderId) {
      return errorResponse('Order ID is required', 400)
    }
    
    const ordersCollection = await getCollection(FlooringCollections.SUPPLIER_ORDERS)
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    
    const order = await ordersCollection.findOne({ id: orderId, clientId: user.clientId })
    if (!order) {
      return errorResponse('Order not found', 404)
    }
    
    const updateData = { updatedAt: new Date() }
    
    if (status) updateData.status = status
    if (trackingNumber) updateData.trackingNumber = trackingNumber
    if (notes) updateData.notes = notes
    
    // Handle delivery/receiving
    if (status === 'delivered' || receivedItems) {
      updateData.actualDeliveryDate = new Date()
      
      if (receivedItems && receivedItems.length > 0) {
        updateData.receivedItems = receivedItems
        
        // Update inventory for each received item
        for (const item of receivedItems) {
          if (item.productId && item.quantityReceived > 0) {
            await inventoryCollection.updateOne(
              { productId: item.productId, clientId: user.clientId },
              { 
                $inc: { quantity: item.quantityReceived },
                $set: { lastRestocked: new Date(), updatedAt: new Date() }
              }
            )
          }
        }
        
        // Check if all items received
        const allReceived = order.items.every(orderItem => {
          const received = receivedItems.find(r => r.productId === orderItem.productId)
          return received && received.quantityReceived >= orderItem.quantity
        })
        
        updateData.status = allReceived ? 'delivered' : 'partial'
      }
    }
    
    await ordersCollection.updateOne(
      { id: orderId, clientId: user.clientId },
      { $set: updateData }
    )
    
    return successResponse({ message: 'Order updated successfully' })
  } catch (error) {
    console.error('Flooring Supplier Order PUT Error:', error)
    return errorResponse('Failed to update order', 500, error.message)
  }
}
