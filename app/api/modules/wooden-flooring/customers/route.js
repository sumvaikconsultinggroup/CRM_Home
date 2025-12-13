import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const customerId = searchParams.get('id')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_customers')

    if (customerId) {
      const customer = await collection.findOne({ id: customerId })
      if (!customer) return errorResponse('Customer not found', 404)
      return successResponse(sanitizeDocument(customer))
    }

    let query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    const customers = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    const stats = {
      totalCustomers: customers.length,
      activeProjects: customers.reduce((sum, c) => sum + (c.activeProjects || 0), 0),
      totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
    }

    return successResponse({ customers: sanitizeDocuments(customers), stats })
  } catch (error) {
    console.error('Customers GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch customers', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_customers')

    const customer = {
      id: uuidv4(),
      clientId: user.clientId,
      customerId: `WFC-${Date.now().toString().slice(-6)}`,
      name: body.name,
      email: body.email || '',
      phone: body.phone || '',
      alternatePhone: body.alternatePhone || '',
      company: body.company || '',
      gstNumber: body.gstNumber || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      siteAddress: body.siteAddress || '',
      siteCity: body.siteCity || '',
      propertyType: body.propertyType || 'Residential',
      preferredWoodType: body.preferredWoodType || '',
      budgetRange: body.budgetRange || '',
      totalSpent: 0,
      totalOrders: 0,
      activeProjects: 0,
      whatsappOptIn: body.whatsappOptIn !== false,
      source: body.source || 'Direct',
      notes: body.notes || '',
      tags: body.tags || [],
      communications: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(customer)
    return successResponse(sanitizeDocument(customer), 201)
  } catch (error) {
    console.error('Customers POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create customer', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Customer ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_customers')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Customer not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Customers PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update customer', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Customer ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_customers')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Customer not found', 404)
    return successResponse({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Customers DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete customer', 500, error.message)
  }
}
