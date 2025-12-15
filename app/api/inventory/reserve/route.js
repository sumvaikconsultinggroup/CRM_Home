import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get all reservations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const quotationId = searchParams.get('quotationId')
    const productId = searchParams.get('productId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('inventory_reservations')

    let query = { clientId: user.clientId }
    if (status) query.status = status
    if (quotationId) query.quotationId = quotationId
    if (productId) query.productId = productId

    const reservations = await reservationCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Get summary
    const stats = {
      total: reservations.length,
      active: reservations.filter(r => r.status === 'active').length,
      expired: reservations.filter(r => r.status === 'expired').length,
      released: reservations.filter(r => r.status === 'released').length,
      converted: reservations.filter(r => r.status === 'converted').length,
      totalQuantityReserved: reservations.filter(r => r.status === 'active').reduce((sum, r) => sum + (r.quantity || 0), 0)
    }

    return successResponse({ reservations: sanitizeDocuments(reservations), stats })
  } catch (error) {
    console.error('Reservation GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch reservations', 500, error.message)
  }
}

// POST - Create inventory reservation (when quote is created)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      quotationId,
      quotationNumber,
      customerId,
      customerName,
      items, // Array of { productId, productName, quantity, unit, warehouseId }
      expiresAt, // When the reservation expires
      notes
    } = body

    if (!items || items.length === 0) {
      return errorResponse('Items are required for reservation', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    // Calculate expiry (default 7 days if not specified)
    const expiryDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const reservations = []
    const errors = []

    for (const item of items) {
      // Check available stock
      const stock = await stockCollection.findOne({
        productId: item.productId,
        warehouseId: item.warehouseId || 'default'
      })

      const availableQty = stock?.availableQuantity || 0

      if (availableQty < item.quantity) {
        errors.push({
          productId: item.productId,
          productName: item.productName,
          requested: item.quantity,
          available: availableQty,
          error: 'Insufficient stock'
        })
        continue
      }

      // Create reservation
      const reservation = {
        id: uuidv4(),
        clientId: user.clientId,
        reservationNumber: `RSV-${Date.now().toString(36).toUpperCase()}`,
        // Reference
        quotationId: quotationId || null,
        quotationNumber: quotationNumber || null,
        // Customer
        customerId: customerId || null,
        customerName: customerName || null,
        // Product
        productId: item.productId,
        productName: item.productName,
        sku: item.sku || null,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        warehouseId: item.warehouseId || 'default',
        // Status
        status: 'active',
        expiresAt: expiryDate,
        // Timestamps
        notes: notes || null,
        createdBy: user.id,
        createdByName: user.name || user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await reservationCollection.insertOne(reservation)

      // Update stock - decrease available quantity (but not total quantity)
      await stockCollection.updateOne(
        { productId: item.productId, warehouseId: item.warehouseId || 'default' },
        {
          $inc: { availableQuantity: -item.quantity, reservedQuantity: item.quantity },
          $set: { updatedAt: new Date() }
        }
      )

      reservations.push(reservation)
    }

    return successResponse({
      message: `${reservations.length} items reserved`,
      reservations: sanitizeDocuments(reservations),
      errors: errors.length > 0 ? errors : undefined
    }, 201)
  } catch (error) {
    console.error('Reservation POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create reservation', 500, error.message)
  }
}

// PUT - Update reservation (release, convert, expire)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, quotationId, action, notes } = body
    // action: 'release', 'convert', 'expire', 'extend'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    let query = {}
    if (id) {
      query.id = id
    } else if (quotationId) {
      query.quotationId = quotationId
      query.status = 'active'
    } else {
      return errorResponse('Reservation ID or Quotation ID required', 400)
    }

    const reservations = await reservationCollection.find(query).toArray()
    if (reservations.length === 0) {
      return errorResponse('Reservation not found', 404)
    }

    for (const reservation of reservations) {
      const updates = {
        updatedAt: new Date(),
        updatedBy: user.id,
        updatedByName: user.name || user.email
      }

      switch (action) {
        case 'release':
          updates.status = 'released'
          updates.releasedAt = new Date()
          // Restore available quantity
          await stockCollection.updateOne(
            { productId: reservation.productId, warehouseId: reservation.warehouseId },
            {
              $inc: { availableQuantity: reservation.quantity, reservedQuantity: -reservation.quantity },
              $set: { updatedAt: new Date() }
            }
          )
          break

        case 'convert':
          updates.status = 'converted'
          updates.convertedAt = new Date()
          // Deduct from total quantity (reservation was already deducted from available)
          await stockCollection.updateOne(
            { productId: reservation.productId, warehouseId: reservation.warehouseId },
            {
              $inc: { quantity: -reservation.quantity, reservedQuantity: -reservation.quantity },
              $set: { updatedAt: new Date() }
            }
          )
          break

        case 'expire':
          updates.status = 'expired'
          updates.expiredAt = new Date()
          // Restore available quantity
          await stockCollection.updateOne(
            { productId: reservation.productId, warehouseId: reservation.warehouseId },
            {
              $inc: { availableQuantity: reservation.quantity, reservedQuantity: -reservation.quantity },
              $set: { updatedAt: new Date() }
            }
          )
          break

        case 'extend':
          // Extend reservation by 7 more days
          updates.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          updates.extendedAt = new Date()
          break

        default:
          return errorResponse('Invalid action', 400)
      }

      if (notes) updates.notes = notes

      await reservationCollection.updateOne({ id: reservation.id }, { $set: updates })
    }

    return successResponse({ message: `${reservations.length} reservation(s) ${action}d` })
  } catch (error) {
    console.error('Reservation PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update reservation', 500, error.message)
  }
}

// DELETE - Delete/Cancel reservation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Reservation ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    const reservation = await reservationCollection.findOne({ id })
    if (!reservation) {
      return errorResponse('Reservation not found', 404)
    }

    if (reservation.status === 'active') {
      // Restore stock
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId },
        {
          $inc: { availableQuantity: reservation.quantity, reservedQuantity: -reservation.quantity },
          $set: { updatedAt: new Date() }
        }
      )
    }

    await reservationCollection.deleteOne({ id })

    return successResponse({ message: 'Reservation deleted' })
  } catch (error) {
    console.error('Reservation DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete reservation', 500, error.message)
  }
}
