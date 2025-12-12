import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'
import { initializeFlooringModule } from '@/lib/modules/flooring/utils'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get('lowStock')
    const location = searchParams.get('location')
    
    await initializeFlooringModule(user.clientId)
    
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    
    const filter = { clientId: user.clientId }
    if (location) filter.location = location
    
    let inventory = await inventoryCollection.find(filter).toArray()
    
    // Filter low stock items
    if (lowStock === 'true') {
      inventory = inventory.filter(item => item.quantity <= item.reorderLevel)
    }
    
    // Calculate summary stats
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0)
    const lowStockCount = inventory.filter(item => item.quantity <= item.reorderLevel).length
    const outOfStockCount = inventory.filter(item => item.quantity === 0).length
    
    return successResponse({
      inventory: sanitizeDocuments(inventory),
      summary: {
        totalItems,
        totalValue,
        lowStockCount,
        outOfStockCount,
        locations: [...new Set(inventory.map(i => i.location))]
      }
    })
  } catch (error) {
    console.error('Flooring Inventory GET Error:', error)
    return errorResponse('Failed to fetch inventory', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { productId, quantity, location, costPrice, sellingPrice, reorderLevel, reorderQuantity } = body
    
    if (!productId) {
      return errorResponse('Product ID is required', 400)
    }
    
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    
    // Verify product exists
    const product = await productsCollection.findOne({ id: productId, clientId: user.clientId })
    if (!product) {
      return errorResponse('Product not found', 404)
    }
    
    const inventoryItem = {
      id: uuidv4(),
      clientId: user.clientId,
      productId,
      productName: product.name,
      sku: `WF-${product.woodType?.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`,
      quantity: quantity || 0,
      unit: 'sq.ft',
      reorderLevel: reorderLevel || 50,
      reorderQuantity: reorderQuantity || 200,
      location: location || 'Warehouse A',
      costPrice: costPrice || product.basePrice * 0.6,
      sellingPrice: sellingPrice || product.basePrice,
      lastRestocked: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await inventoryCollection.insertOne(inventoryItem)
    
    return successResponse(sanitizeDocument(inventoryItem), 201)
  } catch (error) {
    console.error('Flooring Inventory POST Error:', error)
    return errorResponse('Failed to create inventory item', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { inventoryId, action, quantity, location, notes } = body
    
    if (!inventoryId) {
      return errorResponse('Inventory ID is required', 400)
    }
    
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    const movementsCollection = await getCollection(FlooringCollections.STOCK_MOVEMENTS)
    
    const inventoryItem = await inventoryCollection.findOne({ id: inventoryId, clientId: user.clientId })
    if (!inventoryItem) {
      return errorResponse('Inventory item not found', 404)
    }
    
    let updateData = { updatedAt: new Date() }
    let movementType = 'adjustment'
    let movementQuantity = 0
    
    switch (action) {
      case 'add':
        updateData.quantity = inventoryItem.quantity + quantity
        updateData.lastRestocked = new Date()
        movementType = 'restock'
        movementQuantity = quantity
        break
      case 'remove':
        if (inventoryItem.quantity < quantity) {
          return errorResponse('Insufficient stock', 400)
        }
        updateData.quantity = inventoryItem.quantity - quantity
        movementType = 'consumption'
        movementQuantity = -quantity
        break
      case 'transfer':
        if (!location) {
          return errorResponse('Destination location is required for transfer', 400)
        }
        updateData.location = location
        movementType = 'transfer'
        break
      case 'adjust':
        updateData.quantity = quantity
        movementType = 'adjustment'
        movementQuantity = quantity - inventoryItem.quantity
        break
      default:
        return errorResponse('Invalid action', 400)
    }
    
    await inventoryCollection.updateOne(
      { id: inventoryId, clientId: user.clientId },
      { $set: updateData }
    )
    
    // Record stock movement
    await movementsCollection.insertOne({
      id: uuidv4(),
      clientId: user.clientId,
      inventoryId,
      productId: inventoryItem.productId,
      type: movementType,
      quantity: movementQuantity,
      previousQuantity: inventoryItem.quantity,
      newQuantity: updateData.quantity || inventoryItem.quantity,
      location: location || inventoryItem.location,
      notes: notes || '',
      performedBy: user.id,
      createdAt: new Date()
    })
    
    return successResponse({ message: 'Inventory updated successfully', newQuantity: updateData.quantity })
  } catch (error) {
    console.error('Flooring Inventory PUT Error:', error)
    return errorResponse('Failed to update inventory', 500, error.message)
  }
}
