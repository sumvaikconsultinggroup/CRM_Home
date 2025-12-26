import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// D&W DELIVERY CHALLANS - SINGLE SOURCE OF TRUTH
// =============================================
// Challans are created after Order is confirmed, before Installation
// Flow: Quote → Order → Challan (Delivery) → Installation → Warranty

// GET - Fetch Delivery Challans
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const challanId = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('dw_challans')

    if (challanId) {
      const challan = await challanCollection.findOne({ id: challanId })
      if (!challan) return errorResponse('Challan not found', 404)
      return successResponse(sanitizeDocument(challan))
    }

    // Build query
    let query = {}
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (customerId) query.customerId = customerId

    const challans = await challanCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Summary stats
    const summary = {
      total: challans.length,
      draft: challans.filter(c => c.status === 'draft').length,
      dispatched: challans.filter(c => c.status === 'dispatched').length,
      delivered: challans.filter(c => c.status === 'delivered').length,
      cancelled: challans.filter(c => c.status === 'cancelled').length,
      totalValue: challans.reduce((sum, c) => sum + (c.totalValue || 0), 0)
    }

    return successResponse({ challans: sanitizeDocuments(challans), summary })
  } catch (error) {
    console.error('DW Challan GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch challans', 500, error.message)
  }
}

// POST - Create new Delivery Challan from Order
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      orderId,
      orderNumber,
      customerId,
      customerName,
      customerPhone,
      deliveryAddress,
      contactPerson,
      contactPhone,
      items,
      vehicleNumber,
      driverName,
      driverPhone,
      notes,
      expectedDeliveryDate,
      warehouseId,
      warehouseName
    } = body

    if (!orderId) return errorResponse('Order ID is required', 400)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('At least one item is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('dw_challans')
    const ordersCollection = db.collection('dw_orders')

    // Verify order exists
    const order = await ordersCollection.findOne({ id: orderId })
    if (!order) return errorResponse('Order not found', 404)

    // Generate Challan number
    const challanCount = await challanCollection.countDocuments({}) + 1
    const challanNumber = `DC-DW-${new Date().getFullYear()}${String(challanCount).padStart(5, '0')}`

    // Process items with validation
    const validatedItems = items.map(item => ({
      productId: item.productId || null,
      productName: item.productName || item.description || '',
      sku: item.sku || '',
      description: item.description || '',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'pcs',
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalPrice: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
      dimensions: item.dimensions || {},
      notes: item.notes || ''
    }))

    // Calculate totals
    const totalQuantity = validatedItems.reduce((sum, i) => sum + i.quantity, 0)
    const totalValue = validatedItems.reduce((sum, i) => sum + i.totalPrice, 0)

    const challan = {
      id: uuidv4(),
      clientId: user.clientId,
      challanNumber,
      
      // Order Link
      orderId,
      orderNumber: orderNumber || order.orderNumber,
      
      // Customer Info (from Order)
      customerId: customerId || order.customerId || null,
      customerName: customerName || order.customerName || '',
      customerPhone: customerPhone || order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      
      // Delivery Info
      deliveryAddress: deliveryAddress || order.siteAddress || '',
      contactPerson: contactPerson || order.customerName || '',
      contactPhone: contactPhone || order.customerPhone || '',
      
      // Warehouse
      warehouseId: warehouseId || 'default',
      warehouseName: warehouseName || 'Main Warehouse',
      
      // Items
      items: validatedItems,
      totalQuantity,
      totalValue,
      totalItems: validatedItems.length,
      
      // Vehicle & Driver
      vehicleNumber: vehicleNumber || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      
      // Status
      status: 'draft', // draft, dispatched, in-transit, delivered, cancelled
      
      // Dates
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      actualDeliveryDate: null,
      dispatchedAt: null,
      deliveredAt: null,
      
      // Proof of Delivery
      proofOfDelivery: null,
      receivedBy: '',
      receiverSignature: '',
      deliveryPhotos: [],
      
      // Status History
      statusHistory: [{
        status: 'draft',
        changedBy: user.id,
        changedByName: user.name || user.email,
        changedAt: new Date(),
        notes: 'Delivery Challan created'
      }],
      
      notes: notes || '',
      
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await challanCollection.insertOne(challan)

    // Update order to mark challan created
    await ordersCollection.updateOne(
      { id: orderId },
      { 
        $set: { 
          challanId: challan.id,
          challanNumber: challan.challanNumber,
          updatedAt: new Date()
        }
      }
    )

    return successResponse(sanitizeDocument(challan), 201)
  } catch (error) {
    console.error('DW Challan POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create challan', 500, error.message)
  }
}

// PUT - Update Challan status (dispatch, deliver, cancel)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, notes, deliveryPhotos, receivedBy, receiverSignature, vehicleNumber, driverName, driverPhone } = body

    if (!id) return errorResponse('Challan ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('dw_challans')
    const ordersCollection = db.collection('dw_orders')

    const challan = await challanCollection.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)

    let updateData = { updatedAt: new Date() }
    let newStatus = challan.status

    switch (action) {
      case 'dispatch':
        if (challan.status !== 'draft') {
          return errorResponse('Only draft challans can be dispatched', 400)
        }
        
        newStatus = 'dispatched'
        updateData.status = newStatus
        updateData.dispatchedAt = new Date()
        updateData.dispatchedBy = user.id
        updateData.dispatchedByName = user.name || user.email
        
        // Update vehicle details if provided
        if (vehicleNumber) updateData.vehicleNumber = vehicleNumber
        if (driverName) updateData.driverName = driverName
        if (driverPhone) updateData.driverPhone = driverPhone

        // Update order status to dispatched
        await ordersCollection.updateOne(
          { id: challan.orderId },
          { 
            $set: { 
              status: 'dispatched',
              dispatchedAt: new Date(),
              updatedAt: new Date()
            }
          }
        )
        break

      case 'in-transit':
        if (challan.status !== 'dispatched') {
          return errorResponse('Only dispatched challans can be marked in-transit', 400)
        }
        newStatus = 'in-transit'
        updateData.status = newStatus
        break

      case 'deliver':
        if (!['dispatched', 'in-transit'].includes(challan.status)) {
          return errorResponse('Only dispatched or in-transit challans can be marked as delivered', 400)
        }
        
        newStatus = 'delivered'
        updateData.status = newStatus
        updateData.deliveredAt = new Date()
        updateData.actualDeliveryDate = new Date()
        updateData.deliveredBy = user.id
        updateData.deliveredByName = user.name || user.email
        
        // Proof of delivery
        if (receivedBy) updateData.receivedBy = receivedBy
        if (receiverSignature) updateData.receiverSignature = receiverSignature
        if (deliveryPhotos) updateData.deliveryPhotos = deliveryPhotos
        updateData.proofOfDelivery = {
          receivedBy: receivedBy || '',
          signature: receiverSignature || '',
          photos: deliveryPhotos || [],
          receivedAt: new Date(),
          notes: notes || ''
        }

        // Update order status to delivered
        await ordersCollection.updateOne(
          { id: challan.orderId },
          { 
            $set: { 
              status: 'delivered',
              deliveredAt: new Date(),
              updatedAt: new Date()
            }
          }
        )
        break

      case 'cancel':
        if (challan.status === 'delivered') {
          return errorResponse('Cannot cancel a delivered challan', 400)
        }
        
        newStatus = 'cancelled'
        updateData.status = newStatus
        updateData.cancelledAt = new Date()
        updateData.cancelledBy = user.id
        updateData.cancellationReason = notes || ''

        // Reset order status if challan is cancelled
        if (challan.orderId) {
          await ordersCollection.updateOne(
            { id: challan.orderId },
            { 
              $set: { 
                status: 'confirmed',
                challanId: null,
                challanNumber: null,
                updatedAt: new Date()
              }
            }
          )
        }
        break

      case 'update':
        // General update - for editing draft challans
        if (challan.status !== 'draft') {
          return errorResponse('Only draft challans can be edited', 400)
        }
        
        const allowedUpdates = ['deliveryAddress', 'contactPerson', 'contactPhone', 
                               'vehicleNumber', 'driverName', 'driverPhone', 
                               'expectedDeliveryDate', 'notes', 'items']
        
        for (const key of allowedUpdates) {
          if (body[key] !== undefined) {
            updateData[key] = body[key]
          }
        }
        
        // Recalculate totals if items changed
        if (body.items) {
          updateData.totalQuantity = body.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
          updateData.totalValue = body.items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0)
          updateData.totalItems = body.items.length
        }
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    // Update status history
    if (newStatus !== challan.status) {
      updateData.statusHistory = [
        ...challan.statusHistory,
        {
          status: newStatus,
          changedBy: user.id,
          changedByName: user.name || user.email,
          changedAt: new Date(),
          notes: notes || `Status changed to ${newStatus}`
        }
      ]
    }

    const result = await challanCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Challan PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update challan', 500, error.message)
  }
}

// DELETE - Delete draft challan
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Challan ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('dw_challans')
    const ordersCollection = db.collection('dw_orders')

    const challan = await challanCollection.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)
    if (challan.status !== 'draft') {
      return errorResponse('Only draft challans can be deleted', 400)
    }

    // Reset order challan reference
    if (challan.orderId) {
      await ordersCollection.updateOne(
        { id: challan.orderId },
        { 
          $set: { 
            challanId: null,
            challanNumber: null,
            updatedAt: new Date()
          }
        }
      )
    }

    await challanCollection.deleteOne({ id })
    return successResponse({ message: 'Challan deleted successfully' })
  } catch (error) {
    console.error('DW Challan DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete challan', 500, error.message)
  }
}
