import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Reserve stock for project/order
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('id')
    const projectId = searchParams.get('projectId')
    const warehouseId = searchParams.get('warehouseId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('wf_inventory_reservations')

    if (reservationId) {
      const reservation = await reservationCollection.findOne({ id: reservationId })
      if (!reservation) return errorResponse('Reservation not found', 404)
      return successResponse(sanitizeDocument(reservation))
    }

    // Build query
    let query = { status: { $ne: 'released' } } // Don't show released by default
    if (projectId) query.projectId = projectId
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (status) query.status = status

    const reservations = await reservationCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Summary
    const summary = {
      total: reservations.length,
      active: reservations.filter(r => r.status === 'active').length,
      pending: reservations.filter(r => r.status === 'pending').length,
      totalQuantity: reservations.reduce((sum, r) => sum + (r.quantity || 0), 0)
    }

    return successResponse({ reservations: sanitizeDocuments(reservations), summary })
  } catch (error) {
    console.error('Reservation GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch reservations', 500, error.message)
  }
}

// POST - Create stock reservation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      productId,
      warehouseId,
      quantity,
      projectId,
      projectName,
      orderId,
      orderNumber,
      customerId,
      customerName,
      notes,
      expiryDate
    } = body

    if (!productId || !warehouseId || !quantity || quantity <= 0) {
      return errorResponse('Product, warehouse, and positive quantity required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('wf_inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const movementCollection = db.collection('wf_inventory_movements')
    const productCollection = db.collection('wf_inventory')
    const warehouseCollection = db.collection('wf_warehouses')

    // Verify product and warehouse
    const product = await productCollection.findOne({ id: productId })
    if (!product) return errorResponse('Product not found', 404)

    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    // Check available stock
    const stock = await stockCollection.findOne({ productId, warehouseId })
    const availableQty = stock ? (stock.quantity - (stock.reservedQty || 0)) : 0

    if (availableQty < quantity) {
      return errorResponse(`Insufficient available stock. Available: ${availableQty}`, 400)
    }

    // Generate reservation number
    const reservationCount = await reservationCollection.countDocuments({}) + 1
    const reservationNumber = `RES-${new Date().getFullYear()}${String(reservationCount).padStart(5, '0')}`

    const reservation = {
      id: uuidv4(),
      clientId: user.clientId,
      reservationNumber,
      productId,
      productName: product.name,
      sku: product.sku,
      warehouseId,
      warehouseName: warehouse.name,
      quantity: parseFloat(quantity),
      projectId: projectId || null,
      projectName: projectName || null,
      orderId: orderId || null,
      orderNumber: orderNumber || null,
      customerId: customerId || null,
      customerName: customerName || null,
      status: 'active',
      notes: notes || '',
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await reservationCollection.insertOne(reservation)

    // Update stock reserved quantity
    await stockCollection.updateOne(
      { productId, warehouseId },
      {
        $inc: { reservedQty: quantity },
        $set: {
          availableQty: (stock.quantity || 0) - (stock.reservedQty || 0) - quantity,
          updatedAt: new Date()
        }
      }
    )

    // Create reservation movement
    const movementCount = await movementCollection.countDocuments({}) + 1
    const movement = {
      id: uuidv4(),
      clientId: user.clientId,
      movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
      movementType: 'reservation',
      productId,
      productName: product.name,
      sku: product.sku,
      warehouseId,
      warehouseName: warehouse.name,
      quantity,
      quantityChange: 0, // Reservation doesn't change actual quantity
      referenceType: 'reservation',
      referenceId: reservation.id,
      referenceNumber: reservationNumber,
      notes: `Reserved for ${projectName || customerName || 'Order'}`,
      reservedBefore: stock.reservedQty || 0,
      reservedAfter: (stock.reservedQty || 0) + quantity,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date()
    }
    await movementCollection.insertOne(movement)

    return successResponse(sanitizeDocument(reservation), 201)
  } catch (error) {
    console.error('Reservation POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create reservation', 500, error.message)
  }
}

// PUT - Update or release reservation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, notes } = body

    if (!id) return errorResponse('Reservation ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('wf_inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const movementCollection = db.collection('wf_inventory_movements')

    const reservation = await reservationCollection.findOne({ id })
    if (!reservation) return errorResponse('Reservation not found', 404)

    let updateData = { updatedAt: new Date() }

    switch (action) {
      case 'release':
        if (reservation.status === 'released') {
          return errorResponse('Reservation already released', 400)
        }

        // Update stock to release reserved quantity
        const stock = await stockCollection.findOne({ 
          productId: reservation.productId, 
          warehouseId: reservation.warehouseId 
        })

        await stockCollection.updateOne(
          { productId: reservation.productId, warehouseId: reservation.warehouseId },
          {
            $inc: { reservedQty: -reservation.quantity },
            $set: {
              availableQty: (stock?.quantity || 0) - (stock?.reservedQty || 0) + reservation.quantity,
              updatedAt: new Date()
            }
          }
        )

        // Create release movement
        const movementCount = await movementCollection.countDocuments({}) + 1
        const movement = {
          id: uuidv4(),
          clientId: user.clientId,
          movementNumber: `MV-${new Date().getFullYear()}${String(movementCount).padStart(6, '0')}`,
          movementType: 'release',
          productId: reservation.productId,
          productName: reservation.productName,
          sku: reservation.sku,
          warehouseId: reservation.warehouseId,
          warehouseName: reservation.warehouseName,
          quantity: reservation.quantity,
          quantityChange: 0,
          referenceType: 'reservation_release',
          referenceId: reservation.id,
          referenceNumber: reservation.reservationNumber,
          notes: `Released reservation ${reservation.reservationNumber}`,
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: new Date()
        }
        await movementCollection.insertOne(movement)

        updateData.status = 'released'
        updateData.releasedAt = new Date()
        updateData.releasedBy = user.id
        updateData.releaseReason = notes || ''
        break

      case 'fulfill':
        // Mark as fulfilled (used when order is dispatched)
        if (reservation.status !== 'active') {
          return errorResponse('Only active reservations can be fulfilled', 400)
        }
        updateData.status = 'fulfilled'
        updateData.fulfilledAt = new Date()
        updateData.fulfilledBy = user.id
        break

      default:
        return errorResponse('Invalid action. Use release or fulfill', 400)
    }

    const result = await reservationCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Reservation PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update reservation', 500, error.message)
  }
}

// DELETE - Cancel/delete pending reservation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Reservation ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('wf_inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    const reservation = await reservationCollection.findOne({ id })
    if (!reservation) return errorResponse('Reservation not found', 404)

    if (reservation.status === 'fulfilled') {
      return errorResponse('Cannot delete fulfilled reservation', 400)
    }

    // Release the reserved quantity if still active
    if (reservation.status === 'active') {
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId },
        {
          $inc: { reservedQty: -reservation.quantity },
          $set: { updatedAt: new Date() }
        }
      )
    }

    await reservationCollection.deleteOne({ id })
    return successResponse({ message: 'Reservation deleted successfully' })
  } catch (error) {
    console.error('Reservation DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete reservation', 500, error.message)
  }
}
