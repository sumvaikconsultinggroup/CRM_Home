import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const productId = params.productId
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    
    const product = await productsCollection.findOne({ id: productId, clientId: user.clientId })
    if (!product) {
      return errorResponse('Product not found', 404)
    }
    
    // Get inventory info
    const inventory = await inventoryCollection.findOne({ productId, clientId: user.clientId })
    
    return successResponse({
      ...sanitizeDocument(product),
      inventory: inventory ? sanitizeDocument(inventory) : null
    })
  } catch (error) {
    console.error('Flooring Product GET Error:', error)
    return errorResponse('Failed to fetch product', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const productId = params.productId
    const body = await request.json()
    
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    
    const { id, clientId, createdAt, createdBy, ...updateData } = body
    updateData.updatedAt = new Date()
    
    const result = await productsCollection.updateOne(
      { id: productId, clientId: user.clientId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return errorResponse('Product not found', 404)
    }
    
    return successResponse({ message: 'Product updated successfully' })
  } catch (error) {
    console.error('Flooring Product PUT Error:', error)
    return errorResponse('Failed to update product', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const productId = params.productId
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    
    // Soft delete
    const result = await productsCollection.updateOne(
      { id: productId, clientId: user.clientId },
      { $set: { active: false, updatedAt: new Date() } }
    )
    
    if (result.matchedCount === 0) {
      return errorResponse('Product not found', 404)
    }
    
    return successResponse({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Flooring Product DELETE Error:', error)
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
