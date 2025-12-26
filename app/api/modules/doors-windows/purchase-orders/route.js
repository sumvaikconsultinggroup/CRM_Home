import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch purchase orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_purchase_orders')
    
    let query = {}
    if (status) query.status = status
    if (supplierId) query.supplierId = supplierId
    
    const orders = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    return successResponse({ orders: sanitizeDocuments(orders) })
  } catch (error) {
    console.error('D&W Purchase Orders GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch purchase orders', 500, error.message)
  }
}

// POST - Create purchase order
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_purchase_orders')
    const now = new Date().toISOString()

    // Generate PO number
    const count = await collection.countDocuments()
    const poNumber = `PO-DW-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

    const order = {
      id: uuidv4(),
      clientId: user.clientId,
      poNumber,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      warehouseId: body.warehouseId || 'default',
      items: body.items || [],
      subtotal: parseFloat(body.subtotal) || 0,
      taxAmount: parseFloat(body.taxAmount) || 0,
      discount: parseFloat(body.discount) || 0,
      total: parseFloat(body.total) || 0,
      status: 'draft',
      expectedDate: body.expectedDate || null,
      notes: body.notes || '',
      terms: body.terms || '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await collection.insertOne(order)
    return successResponse(sanitizeDocument(order), 201)
  } catch (error) {
    console.error('D&W Purchase Orders POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create purchase order', 500, error.message)
  }
}

// PUT - Update purchase order
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body
    
    if (!id) return errorResponse('Purchase Order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_purchase_orders')

    // Handle status actions
    if (action === 'approve') {
      updates.status = 'approved'
      updates.approvedBy = user.id
      updates.approvedAt = new Date().toISOString()
    } else if (action === 'send') {
      updates.status = 'sent'
      updates.sentAt = new Date().toISOString()
    } else if (action === 'cancel') {
      updates.status = 'cancelled'
      updates.cancelledBy = user.id
      updates.cancelledAt = new Date().toISOString()
    }

    updates.updatedAt = new Date().toISOString()
    await collection.updateOne({ id }, { $set: updates })

    const updated = await collection.findOne({ id })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('D&W Purchase Orders PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update purchase order', 500, error.message)
  }
}

// DELETE - Cancel purchase order
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) return errorResponse('Purchase Order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_purchase_orders')

    await collection.updateOne({ id }, { 
      $set: { 
        status: 'cancelled', 
        cancelledBy: user.id,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      } 
    })
    return successResponse({ message: 'Purchase order cancelled' })
  } catch (error) {
    console.error('D&W Purchase Orders DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to cancel purchase order', 500, error.message)
  }
}
