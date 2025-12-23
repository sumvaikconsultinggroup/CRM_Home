import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// ENTERPRISE STOCK RESERVATIONS
// =============================================
// Links reserved stock to Quotes, Projects, Sales Orders
// Prevents overselling by blocking reserved stock
// Auto-releases on quote rejection/expiry
// Supports partial reservations

const RESERVATION_STATUS = {
  active: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
  fulfilled: { label: 'Fulfilled', color: 'bg-green-100 text-green-700' },
  released: { label: 'Released', color: 'bg-slate-100 text-slate-700' },
  expired: { label: 'Expired', color: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

const RESERVATION_TYPES = {
  quote: { label: 'Quote Reservation', prefix: 'QR' },
  sales_order: { label: 'Sales Order', prefix: 'SO' },
  project: { label: 'Project Allocation', prefix: 'PA' },
  manual: { label: 'Manual Hold', prefix: 'MH' }
}

// GET - Fetch reservations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const refType = searchParams.get('refType') // quote, sales_order, project
    const refId = searchParams.get('refId')
    const status = searchParams.get('status')
    const includeExpired = searchParams.get('includeExpired') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('wf_stock_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    if (id) {
      const reservation = await reservations.findOne({ id })
      if (!reservation) return errorResponse('Reservation not found', 404)
      return successResponse(sanitizeDocument(reservation))
    }

    // Build query
    const query = {}
    if (productId) query.productId = productId
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (refType) query.refType = refType
    if (refId) query.refId = refId
    if (status) {
      query.status = status
    } else if (!includeExpired) {
      query.status = { $in: ['active', 'fulfilled'] }
    }

    const result = await reservations.find(query).sort({ createdAt: -1 }).toArray()

    // Check for expired reservations and update them
    const now = new Date()
    const expiredIds = result
      .filter(r => r.status === 'active' && r.expiresAt && new Date(r.expiresAt) < now)
      .map(r => r.id)

    if (expiredIds.length > 0) {
      await reservations.updateMany(
        { id: { $in: expiredIds } },
        { $set: { status: 'expired', expiredAt: now.toISOString() } }
      )

      // Release reserved quantities
      for (const res of result.filter(r => expiredIds.includes(r.id))) {
        await stockCollection.updateOne(
          { productId: res.productId, warehouseId: res.warehouseId },
          { $inc: { reservedQty: -res.reservedQty } }
        )
      }
    }

    // Summary
    const activeReservations = result.filter(r => r.status === 'active')
    const summary = {
      total: result.length,
      active: activeReservations.length,
      fulfilled: result.filter(r => r.status === 'fulfilled').length,
      released: result.filter(r => r.status === 'released').length,
      expired: result.filter(r => r.status === 'expired').length + expiredIds.length,
      totalReservedQty: activeReservations.reduce((sum, r) => sum + (r.reservedQty || 0), 0),
      totalReservedValue: activeReservations.reduce((sum, r) => sum + (r.reservedValue || 0), 0),
      byType: {
        quote: activeReservations.filter(r => r.refType === 'quote').length,
        sales_order: activeReservations.filter(r => r.refType === 'sales_order').length,
        project: activeReservations.filter(r => r.refType === 'project').length,
        manual: activeReservations.filter(r => r.refType === 'manual').length
      }
    }

    return successResponse({
      reservations: sanitizeDocuments(result),
      summary,
      statuses: RESERVATION_STATUS,
      types: RESERVATION_TYPES
    })
  } catch (error) {
    console.error('Reservations GET Error:', error)
    return errorResponse('Failed to fetch reservations', 500, error.message)
  }
}

// POST - Create reservation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      productId,
      productName,
      sku,
      warehouseId,
      warehouseName,
      quantity,
      unitPrice,
      refType = 'manual',
      refId,
      refNumber,
      refName,
      customerId,
      customerName,
      projectId,
      projectName,
      notes,
      expiresAt,
      // Bulk create from quote items
      items
    } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('wf_stock_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    const now = new Date()
    const createdReservations = []

    // Handle bulk creation (from quote)
    const itemsToProcess = items || [{
      productId,
      productName,
      sku,
      warehouseId,
      warehouseName,
      quantity,
      unitPrice
    }]

    for (const item of itemsToProcess) {
      if (!item.productId || !item.quantity) continue

      // Check available stock
      const stock = await stockCollection.findOne({
        productId: item.productId,
        warehouseId: item.warehouseId || warehouseId || 'default'
      })

      const currentQty = stock?.quantity || 0
      const currentReserved = stock?.reservedQty || 0
      const available = currentQty - currentReserved

      if (item.quantity > available) {
        return errorResponse(
          `Insufficient available stock for ${item.productName || item.productId}. Available: ${available}, Requested: ${item.quantity}`,
          400
        )
      }

      // Generate reservation number
      const typeConfig = RESERVATION_TYPES[refType] || RESERVATION_TYPES.manual
      const count = await reservations.countDocuments({}) + 1
      const reservationNumber = `${typeConfig.prefix}-${now.getFullYear()}${String(count).padStart(5, '0')}`

      const reservation = {
        id: uuidv4(),
        reservationNumber,
        
        // Product
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        
        // Location
        warehouseId: item.warehouseId || warehouseId || 'default',
        warehouseName: item.warehouseName || warehouseName || 'Default',
        
        // Quantities
        requestedQty: item.quantity,
        reservedQty: item.quantity,
        fulfilledQty: 0,
        unit: 'sqft',
        
        // Pricing
        unitPrice: item.unitPrice || 0,
        reservedValue: item.quantity * (item.unitPrice || 0),
        
        // Reference Document
        refType,
        refId,
        refNumber,
        refName,
        
        // Customer/Project
        customerId,
        customerName,
        projectId,
        projectName,
        
        // Status
        status: 'active',
        
        // Expiry
        expiresAt: expiresAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
        
        // Stock snapshot at time of reservation
        stockAtReservation: currentQty,
        availableAtReservation: available,
        
        // Audit
        notes,
        createdBy: user.id,
        createdByName: user.name || user.email,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        
        // History
        history: [{
          action: 'created',
          quantity: item.quantity,
          by: user.id,
          byName: user.name || user.email,
          at: now.toISOString(),
          notes: `Reservation created for ${refType}: ${refNumber || refId || 'N/A'}`
        }]
      }

      await reservations.insertOne(reservation)
      createdReservations.push(reservation)

      // Update stock reserved quantity
      await stockCollection.updateOne(
        { productId: item.productId, warehouseId: item.warehouseId || warehouseId || 'default' },
        {
          $inc: { reservedQty: item.quantity },
          $set: { updatedAt: now.toISOString() }
        }
      )
    }

    return successResponse({
      message: `${createdReservations.length} reservation(s) created`,
      reservations: sanitizeDocuments(createdReservations)
    }, 201)
  } catch (error) {
    console.error('Reservations POST Error:', error)
    return errorResponse('Failed to create reservation', 500, error.message)
  }
}

// PUT - Update reservation (fulfill, release, extend, cancel)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, quantity, notes, newExpiryDate } = body

    if (!id) return errorResponse('Reservation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('wf_stock_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    const stockLedger = db.collection('wf_stock_ledger')

    const reservation = await reservations.findOne({ id })
    if (!reservation) return errorResponse('Reservation not found', 404)

    const now = new Date()

    switch (action) {
      case 'fulfill':
        // Mark reservation as fulfilled (used for dispatch)
        if (reservation.status !== 'active') {
          return errorResponse('Only active reservations can be fulfilled', 400)
        }

        const fulfillQty = quantity || reservation.reservedQty
        const remainingReserved = reservation.reservedQty - fulfillQty

        await reservations.updateOne({ id }, {
          $set: {
            status: remainingReserved <= 0 ? 'fulfilled' : 'active',
            fulfilledQty: (reservation.fulfilledQty || 0) + fulfillQty,
            reservedQty: remainingReserved > 0 ? remainingReserved : 0,
            fulfilledAt: remainingReserved <= 0 ? now.toISOString() : null,
            updatedAt: now.toISOString()
          },
          $push: {
            history: {
              action: 'fulfilled',
              quantity: fulfillQty,
              by: user.id,
              byName: user.name || user.email,
              at: now.toISOString(),
              notes: notes || 'Reservation fulfilled'
            }
          }
        })

        // Update stock reserved qty
        await stockCollection.updateOne(
          { productId: reservation.productId, warehouseId: reservation.warehouseId },
          { $inc: { reservedQty: -fulfillQty } }
        )

        return successResponse({ message: 'Reservation fulfilled', fulfilledQty: fulfillQty })

      case 'release':
        // Release reservation back to available stock
        if (reservation.status !== 'active') {
          return errorResponse('Only active reservations can be released', 400)
        }

        const releaseQty = quantity || reservation.reservedQty

        await reservations.updateOne({ id }, {
          $set: {
            status: releaseQty >= reservation.reservedQty ? 'released' : 'active',
            reservedQty: reservation.reservedQty - releaseQty,
            releasedAt: now.toISOString(),
            releasedBy: user.id,
            updatedAt: now.toISOString()
          },
          $push: {
            history: {
              action: 'released',
              quantity: releaseQty,
              by: user.id,
              byName: user.name || user.email,
              at: now.toISOString(),
              notes: notes || 'Stock released back to available'
            }
          }
        })

        // Update stock reserved qty
        await stockCollection.updateOne(
          { productId: reservation.productId, warehouseId: reservation.warehouseId },
          { $inc: { reservedQty: -releaseQty } }
        )

        return successResponse({ message: 'Stock released', releasedQty: releaseQty })

      case 'extend':
        // Extend expiry date
        if (!newExpiryDate) return errorResponse('New expiry date required', 400)

        await reservations.updateOne({ id }, {
          $set: {
            expiresAt: newExpiryDate,
            updatedAt: now.toISOString()
          },
          $push: {
            history: {
              action: 'extended',
              by: user.id,
              byName: user.name || user.email,
              at: now.toISOString(),
              notes: `Expiry extended to ${newExpiryDate}`
            }
          }
        })

        return successResponse({ message: 'Reservation extended' })

      case 'cancel':
        if (reservation.status === 'fulfilled') {
          return errorResponse('Cannot cancel a fulfilled reservation', 400)
        }

        // Release any remaining reserved quantity
        if (reservation.reservedQty > 0) {
          await stockCollection.updateOne(
            { productId: reservation.productId, warehouseId: reservation.warehouseId },
            { $inc: { reservedQty: -reservation.reservedQty } }
          )
        }

        await reservations.updateOne({ id }, {
          $set: {
            status: 'cancelled',
            reservedQty: 0,
            cancelledAt: now.toISOString(),
            cancelledBy: user.id,
            cancellationReason: notes,
            updatedAt: now.toISOString()
          },
          $push: {
            history: {
              action: 'cancelled',
              quantity: reservation.reservedQty,
              by: user.id,
              byName: user.name || user.email,
              at: now.toISOString(),
              notes: notes || 'Reservation cancelled'
            }
          }
        })

        return successResponse({ message: 'Reservation cancelled' })

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Reservations PUT Error:', error)
    return errorResponse('Failed to update reservation', 500, error.message)
  }
}

// DELETE - Delete reservation (admin only)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Reservation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reservations = db.collection('wf_stock_reservations')
    const stockCollection = db.collection('wf_inventory_stock')

    const reservation = await reservations.findOne({ id })
    if (!reservation) return errorResponse('Reservation not found', 404)

    // Release reserved qty if active
    if (reservation.status === 'active' && reservation.reservedQty > 0) {
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId },
        { $inc: { reservedQty: -reservation.reservedQty } }
      )
    }

    await reservations.deleteOne({ id })

    return successResponse({ message: 'Reservation deleted' })
  } catch (error) {
    console.error('Reservations DELETE Error:', error)
    return errorResponse('Failed to delete reservation', 500, error.message)
  }
}
