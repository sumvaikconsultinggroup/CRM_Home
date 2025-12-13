import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('id')
    const category = searchParams.get('category')

    const collection = await getCollection('wf_vendors')

    if (vendorId) {
      const vendor = await collection.findOne({ id: vendorId, clientId: user.clientId })
      if (!vendor) return errorResponse('Vendor not found', 404)
      return successResponse(sanitizeDocument(vendor))
    }

    let query = { clientId: user.clientId }
    if (category) query.category = category

    const vendors = await collection.find(query).sort({ name: 1 }).toArray()
    
    const stats = {
      totalVendors: vendors.length,
      activeVendors: vendors.filter(v => v.active).length,
      totalPurchases: vendors.reduce((sum, v) => sum + (v.totalPurchases || 0), 0),
      categories: [...new Set(vendors.map(v => v.category))]
    }

    return successResponse({ vendors: sanitizeDocuments(vendors), stats })
  } catch (error) {
    console.error('Vendors GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch vendors', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const collection = await getCollection('wf_vendors')

    const vendor = {
      id: uuidv4(),
      clientId: user.clientId,
      vendorCode: `WFV-${Date.now().toString().slice(-6)}`,
      name: body.name,
      company: body.company || body.name,
      email: body.email || '',
      phone: body.phone || '',
      alternatePhone: body.alternatePhone || '',
      // Address
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      // Business Details
      gstNumber: body.gstNumber || '',
      panNumber: body.panNumber || '',
      category: body.category || 'Flooring Materials',
      // Products/Services
      productsSupplied: body.productsSupplied || [],
      brands: body.brands || [],
      // Payment Terms
      paymentTerms: body.paymentTerms || 'Net 30',
      creditLimit: parseFloat(body.creditLimit) || 0,
      // Bank Details
      bankName: body.bankName || '',
      accountNumber: body.accountNumber || '',
      ifscCode: body.ifscCode || '',
      // Rating
      rating: body.rating || 0,
      // Rate Card
      rateCard: body.rateCard || [],
      // Stats
      totalPurchases: 0,
      totalOrders: 0,
      lastOrderDate: null,
      // Status
      active: true,
      verified: body.verified || false,
      notes: body.notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(vendor)
    return successResponse(sanitizeDocument(vendor), 201)
  } catch (error) {
    console.error('Vendors POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create vendor', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Vendor ID is required', 400)

    const collection = await getCollection('wf_vendors')
    
    const result = await collection.findOneAndUpdate(
      { id, clientId: user.clientId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Vendor not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Vendors PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update vendor', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Vendor ID is required', 400)

    const collection = await getCollection('wf_vendors')
    const result = await collection.deleteOne({ id, clientId: user.clientId })

    if (result.deletedCount === 0) return errorResponse('Vendor not found', 404)
    return successResponse({ message: 'Vendor deleted successfully' })
  } catch (error) {
    console.error('Vendors DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete vendor', 500, error.message)
  }
}
