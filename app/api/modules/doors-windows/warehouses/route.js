import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch warehouses
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warehouses')
    
    const warehouses = await collection.find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray()
    
    // If no warehouses, return default warehouse
    if (warehouses.length === 0) {
      const defaultWarehouse = {
        id: 'default',
        name: 'Main Warehouse',
        code: 'MAIN',
        type: 'main',
        address: '',
        city: '',
        isDefault: true,
        isActive: true
      }
      return successResponse({ warehouses: [defaultWarehouse] })
    }
    
    return successResponse({ warehouses: sanitizeDocuments(warehouses) })
  } catch (error) {
    console.error('D&W Warehouses GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch warehouses', 500, error.message)
  }
}

// POST - Create warehouse
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warehouses')
    const now = new Date().toISOString()

    const warehouse = {
      id: uuidv4(),
      clientId: user.clientId,
      name: body.name,
      code: body.code || body.name?.substring(0, 4).toUpperCase(),
      type: body.type || 'branch',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      contactPerson: body.contactPerson || '',
      phone: body.phone || '',
      email: body.email || '',
      isDefault: body.isDefault || false,
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await collection.insertOne(warehouse)
    return successResponse(sanitizeDocument(warehouse), 201)
  } catch (error) {
    console.error('D&W Warehouses POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create warehouse', 500, error.message)
  }
}

// PUT - Update warehouse
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) return errorResponse('Warehouse ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warehouses')

    updates.updatedAt = new Date().toISOString()
    await collection.updateOne({ id }, { $set: updates })

    const updated = await collection.findOne({ id })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('D&W Warehouses PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update warehouse', 500, error.message)
  }
}

// DELETE - Deactivate warehouse
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) return errorResponse('Warehouse ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warehouses')

    await collection.updateOne({ id }, { $set: { isActive: false, updatedAt: new Date().toISOString() } })
    return successResponse({ message: 'Warehouse deactivated' })
  } catch (error) {
    console.error('D&W Warehouses DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete warehouse', 500, error.message)
  }
}
