import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory movements
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit')) || 100

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_inventory_movements')
    
    let query = {}
    if (itemId) query.itemId = itemId
    if (type) query.type = type
    
    const movements = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray()
    
    return successResponse({ movements: sanitizeDocuments(movements) })
  } catch (error) {
    console.error('D&W Inventory Movements GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch movements', 500, error.message)
  }
}

// POST - Create inventory movement
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const movementsCollection = db.collection('dw_inventory_movements')
    const inventoryCollection = db.collection('dw_inventory')
    const now = new Date().toISOString()

    // Generate movement number
    const count = await movementsCollection.countDocuments()
    const movementNo = `MOV-DW-${Date.now().toString().slice(-8)}`

    const movement = {
      id: uuidv4(),
      clientId: user.clientId,
      movementNo,
      itemId: body.itemId,
      itemName: body.itemName,
      itemSku: body.itemSku,
      type: body.type, // goods_receipt, goods_issue, transfer_in, transfer_out, adjustment_plus, adjustment_minus, damage, return_in, return_out
      quantity: parseFloat(body.quantity) || 0,
      unit: body.unit || 'pcs',
      fromWarehouse: body.fromWarehouse || null,
      toWarehouse: body.toWarehouse || null,
      referenceType: body.referenceType || null, // po, grn, order, challan, etc.
      referenceId: body.referenceId || null,
      referenceNo: body.referenceNo || null,
      reason: body.reason || '',
      notes: body.notes || '',
      batchNo: body.batchNo || null,
      costPrice: parseFloat(body.costPrice) || 0,
      createdBy: user.id,
      createdAt: now
    }

    // Update inventory quantity based on movement type
    const inTypes = ['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in']
    const outTypes = ['goods_issue', 'transfer_out', 'adjustment_minus', 'damage', 'return_out']
    
    if (body.itemId) {
      const qtyChange = inTypes.includes(body.type) ? movement.quantity : (outTypes.includes(body.type) ? -movement.quantity : 0)
      
      if (qtyChange !== 0) {
        await inventoryCollection.updateOne(
          { id: body.itemId },
          { 
            $inc: { quantity: qtyChange },
            $set: { updatedAt: now }
          }
        )
      }
    }

    await movementsCollection.insertOne(movement)
    return successResponse(sanitizeDocument(movement), 201)
  } catch (error) {
    console.error('D&W Inventory Movements POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create movement', 500, error.message)
  }
}
