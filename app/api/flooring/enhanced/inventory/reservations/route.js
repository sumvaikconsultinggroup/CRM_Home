import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory reservations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const quotationId = searchParams.get('quotationId')
    const status = searchParams.get('status') || 'active'
    const includeExpired = searchParams.get('includeExpired') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('inventory_reservations')

    // Build query
    const query = {}
    if (productId) query.productId = productId
    if (quotationId) query.quotationId = quotationId
    if (status && status !== 'all') query.status = status

    // Exclude expired unless requested
    if (!includeExpired) {
      query.$or = [
        { expiresAt: { $gt: new Date().toISOString() } },
        { expiresAt: null },
        { expiresAt: { $exists: false } }
      ]
    }

    const allReservations = await reservations.find(query).sort({ createdAt: -1 }).toArray()

    // Calculate stats
    const stats = {
      total: allReservations.length,
      active: allReservations.filter(r => r.status === 'active').length,
      converted: allReservations.filter(r => r.status === 'converted').length,
      released: allReservations.filter(r => r.status === 'released').length,
      expired: allReservations.filter(r => r.status === 'expired').length,
      totalReservedQty: allReservations
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + (r.quantity || 0), 0)
    }

    // Group by product
    const byProduct = {}
    allReservations.filter(r => r.status === 'active').forEach(r => {
      if (!byProduct[r.productId]) {
        byProduct[r.productId] = {
          productId: r.productId,
          productName: r.productName,
          totalReserved: 0,
          reservations: []
        }
      }
      byProduct[r.productId].totalReserved += r.quantity || 0
      byProduct[r.productId].reservations.push({
        id: r.id,
        quoteNumber: r.quoteNumber,
        quantity: r.quantity,
        reservedAt: r.reservedAt,
        expiresAt: r.expiresAt
      })
    })

    return successResponse({
      reservations: sanitizeDocuments(allReservations),
      stats,
      byProduct: Object.values(byProduct)
    })
  } catch (error) {
    console.error('Reservations GET Error:', error)
    return errorResponse('Failed to fetch reservations', 500, error.message)
  }
}

// POST - Manually create or adjust reservation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { productId, productName, quantity, quotationId, quoteNumber, warehouseId, expiryDays } = body

    if (!productId || !quantity) {
      return errorResponse('Product ID and quantity are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const now = new Date().toISOString()

    // Create reservation
    const reservation = {
      id: uuidv4(),
      quotationId: quotationId || `MANUAL-${Date.now()}`,
      quoteNumber: quoteNumber || 'Manual Reservation',
      productId,
      productName: productName || productId,
      warehouseId: warehouseId || 'default',
      quantity,
      unit: 'sqft',
      status: 'active',
      reservedAt: now,
      expiresAt: new Date(Date.now() + (expiryDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
      isManual: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await reservations.insertOne(reservation)

    // Update stock reserved quantity
    await stockCollection.updateOne(
      { productId, warehouseId: warehouseId || 'default' },
      {
        $inc: { reservedQuantity: quantity },
        $set: { updatedAt: now }
      }
    )

    return successResponse({
      reservation: sanitizeDocument(reservation),
      message: 'Reservation created successfully'
    }, 201)
  } catch (error) {
    console.error('Reservations POST Error:', error)
    return errorResponse('Failed to create reservation', 500, error.message)
  }
}

// PUT - Update or release reservation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, reason } = body

    if (!id || !action) {
      return errorResponse('Reservation ID and action are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const now = new Date().toISOString()

    const reservation = await reservations.findOne({ id })
    if (!reservation) return errorResponse('Reservation not found', 404)

    switch (action) {
      case 'release':
        // Release reservation - restore available stock
        await stockCollection.updateOne(
          { productId: reservation.productId, warehouseId: reservation.warehouseId || 'default' },
          {
            $inc: { reservedQuantity: -reservation.quantity },
            $set: { updatedAt: now }
          }
        )

        await reservations.updateOne(
          { id },
          {
            $set: {
              status: 'released',
              releasedAt: now,
              releaseReason: reason || 'Manual release',
              releasedBy: user.id,
              updatedAt: now
            }
          }
        )
        return successResponse({ message: 'Reservation released, stock restored' })

      case 'extend':
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        await reservations.updateOne(
          { id },
          { $set: { expiresAt: newExpiry, updatedAt: now } }
        )
        return successResponse({ message: 'Reservation extended', newExpiry })

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Reservations PUT Error:', error)
    return errorResponse('Failed to update reservation', 500, error.message)
  }
}
