import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch suppliers
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_suppliers')
    
    const suppliers = await collection.find({ isActive: { $ne: false } }).sort({ name: 1 }).toArray()
    
    return successResponse({ suppliers: sanitizeDocuments(suppliers) })
  } catch (error) {
    console.error('D&W Suppliers GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch suppliers', 500, error.message)
  }
}

// POST - Create supplier
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_suppliers')
    const now = new Date().toISOString()

    const supplier = {
      id: uuidv4(),
      clientId: user.clientId,
      name: body.name,
      code: body.code || `SUP-${Date.now().toString().slice(-6)}`,
      category: body.category || 'general',
      contactPerson: body.contactPerson || '',
      phone: body.phone || '',
      email: body.email || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      gst: body.gst || '',
      pan: body.pan || '',
      bankName: body.bankName || '',
      accountNo: body.accountNo || '',
      ifsc: body.ifsc || '',
      creditDays: parseInt(body.creditDays) || 30,
      creditLimit: parseFloat(body.creditLimit) || 0,
      products: body.products || [],
      rating: body.rating || 0,
      notes: body.notes || '',
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await collection.insertOne(supplier)
    return successResponse(sanitizeDocument(supplier), 201)
  } catch (error) {
    console.error('D&W Suppliers POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create supplier', 500, error.message)
  }
}

// PUT - Update supplier
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) return errorResponse('Supplier ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_suppliers')

    updates.updatedAt = new Date().toISOString()
    await collection.updateOne({ id }, { $set: updates })

    const updated = await collection.findOne({ id })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('D&W Suppliers PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update supplier', 500, error.message)
  }
}

// DELETE - Deactivate supplier
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) return errorResponse('Supplier ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_suppliers')

    await collection.updateOne({ id }, { $set: { isActive: false, updatedAt: new Date().toISOString() } })
    return successResponse({ message: 'Supplier deactivated' })
  } catch (error) {
    console.error('D&W Suppliers DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete supplier', 500, error.message)
  }
}
