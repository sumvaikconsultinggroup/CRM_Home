import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory items and holds
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'items'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'holds') {
      // Get inventory holds
      const holds = db.collection('dw_inventory_holds')
      const items = await holds.find({ status: 'held' }).sort({ heldAt: -1 }).toArray()
      return successResponse({ holds: sanitizeDocuments(items) })
    }

    // Get inventory items
    const inventory = db.collection('dw_inventory')
    const items = await inventory.find({}).sort({ createdAt: -1 }).toArray()
    
    return successResponse({ inventory: sanitizeDocuments(items) })
  } catch (error) {
    console.error('D&W Inventory GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch inventory', 500, error.message)
  }
}

// POST - Create inventory item or hold
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Handle inventory holds for approved quotes
    if (body.quoteId && body.holds) {
      const holdsCollection = db.collection('dw_inventory_holds')
      const now = new Date().toISOString()

      const holdRecords = body.holds.map(hold => ({
        id: uuidv4(),
        quoteId: body.quoteId,
        ...hold,
        status: 'held',
        createdBy: user.id,
        createdAt: now
      }))

      if (holdRecords.length > 0) {
        await holdsCollection.insertMany(holdRecords)
      }

      return successResponse({ 
        message: `${holdRecords.length} inventory holds created`,
        holds: holdRecords 
      })
    }

    // Create regular inventory item
    const inventory = db.collection('dw_inventory')
    const now = new Date().toISOString()
    const sku = `DW-${body.material?.substring(0,3).toUpperCase() || 'MAT'}-${Date.now().toString().slice(-6)}`

    const newItem = {
      id: uuidv4(),
      sku,
      name: body.name,
      description: body.description,
      category: body.category || 'Raw Material',
      material: body.material,
      unit: body.unit || 'piece',
      quantity: parseFloat(body.quantity) || 0,
      minStock: parseFloat(body.minStock) || 10,
      maxStock: parseFloat(body.maxStock) || 1000,
      unitPrice: parseFloat(body.unitPrice) || 0,
      supplier: body.supplier,
      location: body.location,
      status: 'active',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await inventory.insertOne(newItem)
    return successResponse({ item: sanitizeDocument(newItem) }, 201)
  } catch (error) {
    console.error('D&W Inventory POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create inventory item', 500, error.message)
  }
}

// PUT - Update inventory item or release hold
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date().toISOString()

    // Release inventory hold
    if (body.action === 'release-hold' && body.quoteId) {
      const holdsCollection = db.collection('dw_inventory_holds')
      await holdsCollection.updateMany(
        { quoteId: body.quoteId },
        { $set: { status: 'released', releasedAt: now, releasedBy: user.id } }
      )
      return successResponse({ message: 'Inventory holds released' })
    }

    // Convert hold to committed (when order is placed)
    if (body.action === 'commit-hold' && body.quoteId) {
      const holdsCollection = db.collection('dw_inventory_holds')
      await holdsCollection.updateMany(
        { quoteId: body.quoteId },
        { $set: { status: 'committed', committedAt: now, committedBy: user.id } }
      )
      return successResponse({ message: 'Inventory committed for production' })
    }

    // Update regular inventory item
    if (body.id) {
      const inventory = db.collection('dw_inventory')
      const { id, ...updateData } = body
      
      await inventory.updateOne(
        { id },
        { $set: { ...updateData, updatedAt: now } }
      )
      return successResponse({ message: 'Inventory item updated' })
    }

    return errorResponse('Invalid request', 400)
  } catch (error) {
    console.error('D&W Inventory PUT Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update inventory', 500, error.message)
  }
}

// DELETE - Delete inventory item
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Item ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const inventory = db.collection('dw_inventory')

    await inventory.deleteOne({ id })
    return successResponse({ message: 'Inventory item deleted' })
  } catch (error) {
    console.error('D&W Inventory DELETE Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete inventory item', 500, error.message)
  }
}
