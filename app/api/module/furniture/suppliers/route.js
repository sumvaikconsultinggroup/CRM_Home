import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch suppliers
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const suppliers = db.collection('furniture_suppliers')

    if (id) {
      const supplier = await suppliers.findOne({ id })
      if (!supplier) return errorResponse('Supplier not found', 404)
      return successResponse(sanitizeDocument(supplier))
    }

    const query = {}
    if (category) query.categories = category
    if (isActive !== null && isActive !== undefined) query.isActive = isActive === 'true'
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ]
    }

    const items = await suppliers.find(query).sort({ name: 1 }).toArray()

    // Get purchase order stats per supplier
    const poStats = await db.collection('furniture_purchase_orders').aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$supplierId',
        totalOrders: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' },
        pendingOrders: {
          $sum: { $cond: [{ $in: ['$status', ['draft', 'sent', 'partial']] }, 1, 0] }
        }
      }}
    ]).toArray()

    const statsMap = poStats.reduce((acc, s) => ({ ...acc, [s._id]: s }), {})

    const suppliersWithStats = items.map(s => ({
      ...s,
      stats: statsMap[s.id] || { totalOrders: 0, totalValue: 0, pendingOrders: 0 }
    }))

    return successResponse({
      suppliers: sanitizeDocuments(suppliersWithStats)
    })
  } catch (error) {
    console.error('Furniture Suppliers GET Error:', error)
    return errorResponse('Failed to fetch suppliers', 500, error.message)
  }
}

// POST - Create supplier
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const suppliers = db.collection('furniture_suppliers')

    const now = new Date().toISOString()
    const supplierId = uuidv4()

    const supplier = {
      id: supplierId,
      code: body.code || `SUP-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      type: body.type || 'manufacturer', // manufacturer, distributor, dealer, importer
      categories: body.categories || [], // material categories they supply
      // Contact info
      contactPerson: body.contactPerson || '',
      email: body.email || '',
      phone: body.phone || '',
      alternatePhone: body.alternatePhone || '',
      website: body.website || '',
      // Address
      address: body.address || {},
      gstNumber: body.gstNumber || '',
      panNumber: body.panNumber || '',
      // Payment terms
      paymentTerms: body.paymentTerms || 'net_30',
      creditLimit: body.creditLimit || 0,
      creditDays: body.creditDays || 30,
      // Banking
      bankDetails: body.bankDetails || {},
      // Rating and notes
      rating: body.rating || 0,
      leadTime: body.leadTime || 7,
      minimumOrder: body.minimumOrder || 0,
      notes: body.notes || '',
      tags: body.tags || [],
      // Documents
      documents: body.documents || [],
      isActive: body.isActive !== false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await suppliers.insertOne(supplier)

    return successResponse(sanitizeDocument(supplier), 201)
  } catch (error) {
    console.error('Furniture Suppliers POST Error:', error)
    return errorResponse('Failed to create supplier', 500, error.message)
  }
}

// PUT - Update supplier
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Supplier ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const suppliers = db.collection('furniture_suppliers')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await suppliers.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Supplier not found', 404)

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Suppliers PUT Error:', error)
    return errorResponse('Failed to update supplier', 500, error.message)
  }
}

// DELETE - Delete supplier
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Supplier ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const suppliers = db.collection('furniture_suppliers')

    await suppliers.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Supplier deleted successfully' })
  } catch (error) {
    console.error('Furniture Suppliers DELETE Error:', error)
    return errorResponse('Failed to delete supplier', 500, error.message)
  }
}
