import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch GRNs (Goods Receipt Notes)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')
    const poId = searchParams.get('poId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_grn')
    
    let query = {}
    if (status) query.status = status
    if (supplierId) query.supplierId = supplierId
    if (poId) query.poId = poId
    
    const grns = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    return successResponse({ grns: sanitizeDocuments(grns) })
  } catch (error) {
    console.error('D&W GRN GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch GRNs', 500, error.message)
  }
}

// POST - Create GRN
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const grnCollection = db.collection('dw_grn')
    const inventoryCollection = db.collection('dw_inventory')
    const movementsCollection = db.collection('dw_inventory_movements')
    const now = new Date().toISOString()

    // Generate GRN number
    const count = await grnCollection.countDocuments()
    const grnNumber = `GRN-DW-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

    const grn = {
      id: uuidv4(),
      clientId: user.clientId,
      grnNumber,
      poId: body.poId || null,
      poNumber: body.poNumber || null,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      warehouseId: body.warehouseId || 'default',
      warehouseName: body.warehouseName || 'Main Warehouse',
      invoiceNo: body.invoiceNo || '',
      invoiceDate: body.invoiceDate || null,
      challanNo: body.challanNo || '',
      challanDate: body.challanDate || null,
      items: body.items || [],
      subtotal: parseFloat(body.subtotal) || 0,
      taxAmount: parseFloat(body.taxAmount) || 0,
      total: parseFloat(body.total) || 0,
      status: body.status || 'draft', // draft, received, cancelled
      receivedBy: body.status === 'received' ? user.id : null,
      receivedAt: body.status === 'received' ? now : null,
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await grnCollection.insertOne(grn)

    // If GRN is received, update inventory and create movements
    if (grn.status === 'received' && grn.items?.length > 0) {
      for (const item of grn.items) {
        // Update or create inventory item
        const existingItem = await inventoryCollection.findOne({ sku: item.sku })
        
        if (existingItem) {
          await inventoryCollection.updateOne(
            { sku: item.sku },
            { 
              $inc: { quantity: item.receivedQty || item.quantity },
              $set: { updatedAt: now }
            }
          )
        } else {
          // Create new inventory item
          await inventoryCollection.insertOne({
            id: uuidv4(),
            clientId: user.clientId,
            sku: item.sku,
            name: item.name,
            category: item.category || 'general',
            unit: item.unit || 'pcs',
            quantity: item.receivedQty || item.quantity,
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || item.costPrice || 0,
            reorderLevel: 10,
            warehouseId: grn.warehouseId,
            createdAt: now,
            updatedAt: now
          })
        }

        // Create movement record
        await movementsCollection.insertOne({
          id: uuidv4(),
          clientId: user.clientId,
          movementNo: `MOV-${Date.now().toString().slice(-8)}`,
          itemId: existingItem?.id || item.sku,
          itemName: item.name,
          itemSku: item.sku,
          type: 'goods_receipt',
          quantity: item.receivedQty || item.quantity,
          unit: item.unit || 'pcs',
          toWarehouse: grn.warehouseId,
          referenceType: 'grn',
          referenceId: grn.id,
          referenceNo: grn.grnNumber,
          costPrice: item.costPrice || 0,
          createdBy: user.id,
          createdAt: now
        })
      }
    }

    return successResponse(sanitizeDocument(grn), 201)
  } catch (error) {
    console.error('D&W GRN POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create GRN', 500, error.message)
  }
}

// PUT - Update GRN
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body
    
    if (!id) return errorResponse('GRN ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_grn')

    if (action === 'receive') {
      updates.status = 'received'
      updates.receivedBy = user.id
      updates.receivedAt = new Date().toISOString()
    } else if (action === 'cancel') {
      updates.status = 'cancelled'
      updates.cancelledBy = user.id
      updates.cancelledAt = new Date().toISOString()
    }

    updates.updatedAt = new Date().toISOString()
    await collection.updateOne({ id }, { $set: updates })

    const updated = await collection.findOne({ id })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('D&W GRN PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update GRN', 500, error.message)
  }
}
