import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Create inventory holds for approved quote
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { quoteId, holds } = body

    if (!quoteId || !holds || holds.length === 0) {
      return errorResponse('Quote ID and holds are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const holdsCollection = db.collection('dw_inventory_holds')
    const now = new Date().toISOString()

    const holdRecords = holds.map(hold => ({
      id: uuidv4(),
      quoteId,
      quoteNumber: hold.quoteNumber,
      customerName: hold.customerName,
      itemType: hold.itemType,
      material: hold.material,
      dimensions: hold.dimensions,
      areaSqft: hold.areaSqft,
      quantity: hold.quantity,
      status: 'held',
      heldAt: now,
      heldBy: user.id,
      createdAt: now
    }))

    await holdsCollection.insertMany(holdRecords)

    // Log event
    const events = db.collection('dw_events')
    await events.insertOne({
      id: uuidv4(),
      type: 'inventory.hold',
      entityType: 'quote',
      entityId: quoteId,
      data: { holdsCount: holdRecords.length },
      userId: user.id,
      timestamp: now
    })

    return successResponse({ 
      message: `${holdRecords.length} items held in inventory`,
      holds: holdRecords 
    })
  } catch (error) {
    console.error('D&W Inventory Hold Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to hold inventory', 500, error.message)
  }
}
