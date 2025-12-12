import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const supplierId = params.supplierId
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    const ordersCollection = await getCollection(FlooringCollections.SUPPLIER_ORDERS)
    
    const supplier = await suppliersCollection.findOne({ id: supplierId, clientId: user.clientId })
    if (!supplier) {
      return errorResponse('Supplier not found', 404)
    }
    
    // Get recent orders from this supplier
    const recentOrders = await ordersCollection.find({ supplierId, clientId: user.clientId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()
    
    return successResponse({
      ...sanitizeDocument(supplier),
      recentOrders: sanitizeDocuments(recentOrders)
    })
  } catch (error) {
    console.error('Flooring Supplier GET Error:', error)
    return errorResponse('Failed to fetch supplier', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const supplierId = params.supplierId
    const body = await request.json()
    
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    
    const { id, clientId, createdAt, createdBy, ...updateData } = body
    updateData.updatedAt = new Date()
    
    const result = await suppliersCollection.updateOne(
      { id: supplierId, clientId: user.clientId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return errorResponse('Supplier not found', 404)
    }
    
    return successResponse({ message: 'Supplier updated successfully' })
  } catch (error) {
    console.error('Flooring Supplier PUT Error:', error)
    return errorResponse('Failed to update supplier', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const supplierId = params.supplierId
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    
    const result = await suppliersCollection.updateOne(
      { id: supplierId, clientId: user.clientId },
      { $set: { active: false, updatedAt: new Date() } }
    )
    
    if (result.matchedCount === 0) {
      return errorResponse('Supplier not found', 404)
    }
    
    return successResponse({ message: 'Supplier deleted successfully' })
  } catch (error) {
    console.error('Flooring Supplier DELETE Error:', error)
    return errorResponse('Failed to delete supplier', 500, error.message)
  }
}
