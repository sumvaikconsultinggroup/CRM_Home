import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory reservations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_inventory_reservations')
    
    let query = {}
    if (itemId) query.itemId = itemId
    if (status) query.status = status
    
    const reservations = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    return successResponse({ reservations: sanitizeDocuments(reservations) })
  } catch (error) {
    console.error('D&W Inventory Reservations GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch reservations', 500, error.message)
  }
}

// POST - Create inventory reservation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_inventory_reservations')
    const now = new Date().toISOString()

    const reservation = {
      id: uuidv4(),
      clientId: user.clientId,
      itemId: body.itemId,
      itemName: body.itemName,
      itemSku: body.itemSku,
      quantity: parseFloat(body.quantity) || 0,
      unit: body.unit || 'pcs',
      referenceType: body.referenceType || 'order', // order, quote, project
      referenceId: body.referenceId,
      referenceNo: body.referenceNo,
      warehouseId: body.warehouseId || 'default',
      status: 'reserved', // reserved, released, fulfilled, expired
      expiresAt: body.expiresAt || null,
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await collection.insertOne(reservation)
    return successResponse(sanitizeDocument(reservation), 201)
  } catch (error) {
    console.error('D&W Inventory Reservations POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create reservation', 500, error.message)
  }
}

// PUT - Update/Release reservation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body
    
    if (!id) return errorResponse('Reservation ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_inventory_reservations')

    if (action === 'release') {
      updates.status = 'released'
      updates.releasedBy = user.id
      updates.releasedAt = new Date().toISOString()
    } else if (action === 'fulfill') {
      updates.status = 'fulfilled'
      updates.fulfilledBy = user.id
      updates.fulfilledAt = new Date().toISOString()
    }

    updates.updatedAt = new Date().toISOString()
    await collection.updateOne({ id }, { $set: updates })

    const updated = await collection.findOne({ id })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('D&W Inventory Reservations PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update reservation', 500, error.message)
  }
}

// DELETE - Cancel reservation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) return errorResponse('Reservation ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_inventory_reservations')

    await collection.updateOne({ id }, { 
      $set: { 
        status: 'released', 
        releasedBy: user.id,
        releasedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      } 
    })
    return successResponse({ message: 'Reservation released' })
  } catch (error) {
    console.error('D&W Inventory Reservations DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to release reservation', 500, error.message)
  }
}
