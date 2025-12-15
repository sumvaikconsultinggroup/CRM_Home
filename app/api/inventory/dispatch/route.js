import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get all dispatches
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const invoiceId = searchParams.get('invoiceId')
    const customerId = searchParams.get('customerId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')

    // Build query
    let query = { clientId: user.clientId }
    if (status) query.status = status
    if (invoiceId) query.invoiceId = invoiceId
    if (customerId) query.customerId = customerId
    if (fromDate || toDate) {
      query.dispatchDate = {}
      if (fromDate) query.dispatchDate.$gte = new Date(fromDate)
      if (toDate) query.dispatchDate.$lte = new Date(toDate)
    }

    const dispatches = await dispatchCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Get summary stats
    const stats = {
      total: dispatches.length,
      pending: dispatches.filter(d => d.status === 'pending').length,
      inTransit: dispatches.filter(d => d.status === 'in_transit').length,
      delivered: dispatches.filter(d => d.status === 'delivered').length,
      totalValue: dispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0)
    }

    return successResponse({ dispatches: sanitizeDocuments(dispatches), stats })
  } catch (error) {
    console.error('Dispatch GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch dispatches', 500, error.message)
  }
}

// POST - Create a new dispatch
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      // Invoice/Order Reference
      invoiceId,
      invoiceNumber,
      orderId,
      orderNumber,
      // Customer Details
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      // Products
      items,
      // Transporter Details
      transporterName,
      transporterCompany,
      vehicleNumber,
      driverName,
      driverPhone,
      // Delivery Info
      estimatedDeliveryDate,
      estimatedDeliveryTime,
      deliveryCost,
      paymentMode, // COD, Prepaid, Partial
      paymentAmount, // Amount to collect on delivery
      // Additional
      packageCount,
      totalWeight,
      specialInstructions,
      dispatchImage,
      warehouseId,
      notes
    } = body

    if (!customerName || !items || items.length === 0) {
      return errorResponse('Customer name and items are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')
    const stockCollection = db.collection('wf_inventory_stock')

    // Generate dispatch number
    const dispatchCount = await dispatchCollection.countDocuments({ clientId: user.clientId })
    const dispatchNumber = `DSP-${String(dispatchCount + 1).padStart(5, '0')}`

    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0)

    // Create dispatch record
    const dispatch = {
      id: uuidv4(),
      clientId: user.clientId,
      dispatchNumber,
      // Reference
      invoiceId: invoiceId || null,
      invoiceNumber: invoiceNumber || null,
      orderId: orderId || null,
      orderNumber: orderNumber || null,
      // Customer
      customerId: customerId || null,
      customerName,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      deliveryAddress: deliveryAddress || null,
      // Items
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        unitPrice: item.unitPrice || 0,
        totalPrice: item.quantity * (item.unitPrice || 0),
        batchNumber: item.batchNumber || null,
        serialNumbers: item.serialNumbers || []
      })),
      totalValue,
      // Transporter
      transporter: {
        name: transporterName || null,
        company: transporterCompany || null,
        vehicleNumber: vehicleNumber || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null
      },
      // Delivery
      estimatedDelivery: {
        date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
        time: estimatedDeliveryTime || null
      },
      deliveryCost: deliveryCost || 0,
      payment: {
        mode: paymentMode || 'prepaid',
        amountToCollect: paymentAmount || 0
      },
      // Package Info
      packageCount: packageCount || 1,
      totalWeight: totalWeight || null,
      specialInstructions: specialInstructions || null,
      // Images
      dispatchImage: dispatchImage || null,
      deliveryImage: null,
      podImage: null, // Proof of delivery
      // Location
      warehouseId: warehouseId || null,
      // Status & Tracking
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        updatedBy: user.id,
        updatedByName: user.name || user.email,
        notes: 'Dispatch created'
      }],
      // WhatsApp Notification
      whatsappNotification: {
        sent: false,
        sentAt: null,
        messageId: null
      },
      // Timestamps
      dispatchDate: new Date(),
      deliveredAt: null,
      notes: notes || null,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await dispatchCollection.insertOne(dispatch)

    // Deduct stock for each item
    for (const item of items) {
      if (item.productId) {
        await stockCollection.updateOne(
          { productId: item.productId, warehouseId: warehouseId || 'default' },
          {
            $inc: { quantity: -item.quantity, availableQuantity: -item.quantity },
            $set: { updatedAt: new Date() }
          }
        )
      }
    }

    return successResponse(sanitizeDocument(dispatch), 201)
  } catch (error) {
    console.error('Dispatch POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create dispatch', 500, error.message)
  }
}

// PUT - Update dispatch status
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      id,
      status,
      deliveryImage,
      podImage,
      actualDeliveryDate,
      receiverName,
      receiverSignature,
      notes,
      // For tracking updates
      currentLocation,
      trackingUpdate
    } = body

    if (!id) {
      return errorResponse('Dispatch ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')

    const dispatch = await dispatchCollection.findOne({ id })
    if (!dispatch) {
      return errorResponse('Dispatch not found', 404)
    }

    const updates = {
      updatedAt: new Date(),
      updatedBy: user.id
    }

    // Status update
    if (status && status !== dispatch.status) {
      updates.status = status
      updates.$push = {
        statusHistory: {
          status,
          timestamp: new Date(),
          updatedBy: user.id,
          updatedByName: user.name || user.email,
          notes: notes || `Status changed to ${status}`,
          location: currentLocation || null
        }
      }

      if (status === 'delivered') {
        updates.deliveredAt = actualDeliveryDate ? new Date(actualDeliveryDate) : new Date()
        updates.delivery = {
          receiverName: receiverName || null,
          receiverSignature: receiverSignature || null,
          actualDate: updates.deliveredAt
        }
      }
    }

    // Images
    if (deliveryImage) updates.deliveryImage = deliveryImage
    if (podImage) updates.podImage = podImage

    // Tracking update
    if (trackingUpdate) {
      updates.$push = updates.$push || {}
      updates.$push.trackingUpdates = {
        timestamp: new Date(),
        location: currentLocation,
        message: trackingUpdate,
        updatedBy: user.id
      }
    }

    // Handle $push separately
    const pushUpdates = updates.$push
    delete updates.$push

    const updateOps = { $set: updates }
    if (pushUpdates) {
      updateOps.$push = pushUpdates
    }

    const result = await dispatchCollection.findOneAndUpdate(
      { id },
      updateOps,
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Dispatch PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update dispatch', 500, error.message)
  }
}

// DELETE - Cancel dispatch
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Dispatch ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')
    const stockCollection = db.collection('wf_inventory_stock')

    const dispatch = await dispatchCollection.findOne({ id })
    if (!dispatch) {
      return errorResponse('Dispatch not found', 404)
    }

    if (dispatch.status === 'delivered') {
      return errorResponse('Cannot cancel a delivered dispatch', 400)
    }

    // Restore stock
    for (const item of dispatch.items) {
      if (item.productId) {
        await stockCollection.updateOne(
          { productId: item.productId, warehouseId: dispatch.warehouseId || 'default' },
          {
            $inc: { quantity: item.quantity, availableQuantity: item.quantity },
            $set: { updatedAt: new Date() }
          }
        )
      }
    }

    // Update status to cancelled
    await dispatchCollection.updateOne(
      { id },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: user.id,
          cancelledByName: user.name || user.email,
          updatedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            timestamp: new Date(),
            updatedBy: user.id,
            updatedByName: user.name || user.email,
            notes: 'Dispatch cancelled - Stock restored'
          }
        }
      }
    )

    return successResponse({ message: 'Dispatch cancelled and stock restored' })
  } catch (error) {
    console.error('Dispatch DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to cancel dispatch', 500, error.message)
  }
}
