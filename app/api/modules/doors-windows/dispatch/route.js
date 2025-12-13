import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch dispatch records
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const dispatchId = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_dispatches')
    
    let query = {}
    if (dispatchId) query.id = dispatchId
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      query.scheduledDate = { $gte: startDate, $lt: endDate }
    }

    const dispatches = await collection.find(query).sort({ scheduledDate: -1 }).toArray()

    const stats = {
      total: dispatches.length,
      scheduled: dispatches.filter(d => d.status === 'scheduled').length,
      inTransit: dispatches.filter(d => d.status === 'in-transit').length,
      delivered: dispatches.filter(d => d.status === 'delivered').length,
      partial: dispatches.filter(d => d.isPartial).length
    }

    return successResponse({ dispatches: sanitizeDocuments(dispatches), stats })
  } catch (error) {
    console.error('DW Dispatch GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch dispatches', 500, error.message)
  }
}

// POST - Create dispatch
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Upload proof of delivery
    if (action === 'upload-pod') {
      const collection = db.collection('dw_dispatches')
      
      const result = await collection.findOneAndUpdate(
        { id: body.dispatchId },
        {
          $set: {
            proofOfDelivery: {
              photos: body.photos || [],
              signature: body.signature || '',
              receivedBy: body.receivedBy || '',
              receivedAt: new Date(),
              notes: body.notes || ''
            },
            status: 'delivered',
            actualDeliveryDate: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Dispatch not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Mark in transit
    if (action === 'start-transit') {
      const collection = db.collection('dw_dispatches')
      
      const result = await collection.findOneAndUpdate(
        { id: body.dispatchId },
        {
          $set: {
            status: 'in-transit',
            departureTime: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Dispatch not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Create dispatch
    const collection = db.collection('dw_dispatches')

    const dispatch = {
      id: uuidv4(),
      clientId: user.clientId,
      dispatchNumber: `DSP-${Date.now()}`,
      
      // Order link
      orderId: body.orderId,
      orderNumber: body.orderNumber || '',
      workOrderId: body.workOrderId || null,
      
      // Customer
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      deliveryAddress: body.deliveryAddress || '',
      
      // Items
      items: body.items || [], // { itemId, description, quantity, packed }
      totalItems: body.items?.length || 0,
      isPartial: body.isPartial || false,
      partialReason: body.partialReason || '',
      
      // Vehicle & Driver
      vehicleNumber: body.vehicleNumber || '',
      vehicleType: body.vehicleType || '',
      driverName: body.driverName || '',
      driverPhone: body.driverPhone || '',
      
      // Route
      route: body.route || '',
      estimatedDistance: parseFloat(body.estimatedDistance) || 0,
      estimatedDuration: body.estimatedDuration || '',
      
      // Schedule
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      scheduledTime: body.scheduledTime || '',
      actualDeliveryDate: null,
      
      // Status
      status: 'scheduled', // scheduled, loading, in-transit, delivered, returned
      departureTime: null,
      arrivalTime: null,
      
      // Packing list
      packingList: body.packingList || [],
      packingPhotos: body.packingPhotos || [],
      
      // POD
      proofOfDelivery: null,
      
      // Notes
      specialInstructions: body.specialInstructions || '',
      notes: body.notes || '',
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(dispatch)
    return successResponse(sanitizeDocument(dispatch), 201)
  } catch (error) {
    console.error('DW Dispatch POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create dispatch', 500, error.message)
  }
}

// PUT - Update dispatch
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Dispatch ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_dispatches')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Dispatch not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Dispatch PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update dispatch', 500, error.message)
  }
}

// DELETE - Cancel dispatch
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Dispatch ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_dispatches')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Dispatch not found', 404)
    return successResponse({ message: 'Dispatch cancelled successfully' })
  } catch (error) {
    console.error('DW Dispatch DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to cancel dispatch', 500, error.message)
  }
}
