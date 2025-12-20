import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory with stock levels
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const lowStock = searchParams.get('lowStock')
    const category = searchParams.get('category')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('flooring_products')

    // Get all products first for lookup
    const allProducts = await products.find({}).toArray()
    const productMap = new Map(allProducts.map(p => [p.id, p]))

    // Build query
    const query = {}
    if (productId) query.productId = productId

    // Collect inventory from all sources
    const allInventoryItems = []
    
    // Get from wf_inventory_stock (primary source from Inventory > Stock Management)
    const wfStock = await db.collection('wf_inventory_stock').find(query).toArray()
    allInventoryItems.push(...wfStock.map(i => ({ ...i, source: 'wf_inventory_stock' })))
    
    // Get from flooring_inventory_v2
    const v2Stock = await db.collection('flooring_inventory_v2').find(query).toArray()
    allInventoryItems.push(...v2Stock.map(i => ({ ...i, source: 'flooring_inventory_v2' })))
    
    // Get from flooring_inventory
    const v1Stock = await db.collection('flooring_inventory').find(query).toArray()
    allInventoryItems.push(...v1Stock.map(i => ({ ...i, source: 'flooring_inventory' })))

    // CONSOLIDATE: Aggregate by productId + warehouseId
    // This prevents duplicate entries for the same product
    const consolidatedMap = new Map()
    
    for (const item of allInventoryItems) {
      if (!item.productId) continue // Skip entries without productId
      
      const key = `${item.productId}-${item.warehouseId || 'default'}`
      const existing = consolidatedMap.get(key)
      
      if (existing) {
        // Merge: take higher quantity (or sum them based on source)
        // For now, take the entry with the higher available quantity as the primary
        const existingQty = (existing.quantity || 0) - (existing.reservedQuantity || existing.reservedQty || 0)
        const newQty = (item.quantity || 0) - (item.reservedQuantity || item.reservedQty || 0)
        
        if (newQty > existingQty) {
          // Replace with better entry
          consolidatedMap.set(key, item)
        }
        // Could also sum: existing.quantity += item.quantity, but that may double-count
      } else {
        consolidatedMap.set(key, item)
      }
    }
    
    let inventoryItems = Array.from(consolidatedMap.values())
    
    // Sort by updatedAt
    inventoryItems.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

    // Build additional lookup maps for fallback matching
    const productBySkuMap = new Map()
    const productByNameMap = new Map()
    for (const p of allProducts) {
      if (p.sku) productBySkuMap.set(p.sku.toLowerCase(), p)
      if (p.name) productByNameMap.set(p.name.toLowerCase(), p)
    }

    // Enrich with product data - try multiple matching strategies
    inventoryItems = inventoryItems.map(item => {
      // Try direct productId match first
      let product = productMap.get(item.productId)
      
      // Fallback: try matching by SKU
      if (!product && item.sku) {
        product = productBySkuMap.get(item.sku.toLowerCase())
        if (product) {
          // Fix the productId to match
          item.productId = product.id
        }
      }
      
      // Fallback: try matching by product name
      if (!product && item.productName) {
        product = productByNameMap.get(item.productName.toLowerCase())
        if (product) {
          // Fix the productId to match
          item.productId = product.id
        }
      }
      
      return {
        ...item,
        product: product || null
      }
    })

    // Apply filters
    if (lowStock === 'true') {
      inventoryItems = inventoryItems.filter(i => i.availableQty <= (i.reorderLevel || 100))
    }

    if (category) {
      inventoryItems = inventoryItems.filter(i => i.product?.category === category)
    }

    // Normalize inventory items - ensure consistent field names
    inventoryItems = inventoryItems.map(item => {
      const reserved = item.reservedQuantity || item.reservedQty || 0
      const total = item.quantity || 0
      const available = total - reserved
      return {
        ...item,
        reservedQty: reserved,
        reservedQuantity: reserved,
        availableQty: Math.max(0, available)
      }
    })

    // Calculate summary
    const summary = {
      totalProducts: inventoryItems.length,
      totalQuantity: inventoryItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
      totalValue: inventoryItems.reduce((sum, i) => sum + ((i.quantity || 0) * (i.avgCostPrice || 0)), 0),
      reservedQuantity: inventoryItems.reduce((sum, i) => sum + (i.reservedQuantity || 0), 0),
      availableQuantity: inventoryItems.reduce((sum, i) => sum + (i.availableQty || 0), 0),
      lowStockCount: inventoryItems.filter(i => i.availableQty <= (i.reorderLevel || 100) && i.availableQty > 0).length,
      outOfStockCount: inventoryItems.filter(i => i.availableQty <= 0).length
    }

    // Group by category
    const byCategory = {}
    inventoryItems.forEach(i => {
      const cat = i.product?.category || 'unknown'
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, quantity: 0, value: 0 }
      }
      byCategory[cat].count++
      byCategory[cat].quantity += i.quantity || 0
      byCategory[cat].value += (i.quantity || 0) * (i.avgCostPrice || 0)
    })

    return successResponse({
      inventory: sanitizeDocuments(inventoryItems),
      summary,
      byCategory
    })
  } catch (error) {
    console.error('Inventory GET Error:', error)
    return errorResponse('Failed to fetch inventory', 500, error.message)
  }
}

// POST - Inventory actions (goods receipt, adjustment, reservation, etc.)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action, productId, warehouseId = 'main' } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const inventory = db.collection('flooring_inventory_v2')
    const products = db.collection('flooring_products')
    const transactions = db.collection('flooring_inventory_transactions')

    const now = new Date().toISOString()

    // Get or create inventory record
    let inventoryRecord = await inventory.findOne({ productId, warehouseId })

    switch (action) {
      case 'goods_receipt': {
        // Receive new inventory
        const quantity = parseFloat(body.quantity) || 0
        const costPrice = parseFloat(body.costPrice) || 0
        const batchNo = body.batchNo || `BATCH-${Date.now()}`

        if (!productId || quantity <= 0) {
          return errorResponse('Product ID and quantity required', 400)
        }

        const batch = {
          id: uuidv4(),
          batchNo,
          quantity,
          costPrice,
          receivedDate: now,
          supplier: body.supplier || '',
          invoiceNo: body.invoiceNo || '',
          remainingQty: quantity,
          createdBy: user.id
        }

        if (inventoryRecord) {
          // Calculate new weighted average cost
          const totalOldValue = (inventoryRecord.quantity || 0) * (inventoryRecord.avgCostPrice || 0)
          const totalNewValue = quantity * costPrice
          const totalQty = (inventoryRecord.quantity || 0) + quantity
          const newAvgCost = totalQty > 0 ? (totalOldValue + totalNewValue) / totalQty : costPrice

          await inventory.updateOne(
            { id: inventoryRecord.id },
            {
              $inc: { quantity: quantity, availableQty: quantity },
              $set: { avgCostPrice: newAvgCost, updatedAt: now },
              $push: { batches: batch }
            }
          )
        } else {
          // Create new inventory record
          const newRecord = {
            id: uuidv4(),
            productId,
            warehouseId,
            quantity,
            reservedQty: 0,
            availableQty: quantity,
            avgCostPrice: costPrice,
            reorderLevel: parseFloat(body.reorderLevel) || 100,
            batches: [batch],
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          }
          await inventory.insertOne(newRecord)
          inventoryRecord = newRecord
        }

        // Record transaction
        await transactions.insertOne({
          id: uuidv4(),
          productId,
          warehouseId,
          type: 'goods_receipt',
          quantity,
          costPrice,
          batchNo,
          reference: body.invoiceNo || '',
          notes: body.notes || '',
          createdBy: user.id,
          createdAt: now
        })

        return successResponse({ message: 'Goods received', quantity, batchNo })
      }

      case 'adjustment': {
        // Inventory adjustment (positive or negative)
        const adjustmentQty = parseFloat(body.quantity) || 0
        const reason = body.reason || 'Manual adjustment'

        if (!inventoryRecord) {
          return errorResponse('Inventory record not found', 404)
        }

        const newQty = Math.max(0, (inventoryRecord.quantity || 0) + adjustmentQty)
        const newAvailable = Math.max(0, (inventoryRecord.availableQty || 0) + adjustmentQty)

        await inventory.updateOne(
          { id: inventoryRecord.id },
          {
            $set: {
              quantity: newQty,
              availableQty: newAvailable,
              updatedAt: now
            }
          }
        )

        await transactions.insertOne({
          id: uuidv4(),
          productId,
          warehouseId,
          type: 'adjustment',
          quantity: adjustmentQty,
          reason,
          notes: body.notes || '',
          createdBy: user.id,
          createdAt: now
        })

        return successResponse({ message: 'Adjustment recorded', newQty })
      }

      case 'reserve': {
        // Reserve inventory for a quote/order
        const reserveQty = parseFloat(body.quantity) || 0
        const orderId = body.orderId || body.quoteId

        if (!inventoryRecord) {
          return errorResponse('Inventory record not found', 404)
        }

        if (reserveQty > inventoryRecord.availableQty) {
          return errorResponse('Insufficient available quantity', 400)
        }

        await inventory.updateOne(
          { id: inventoryRecord.id },
          {
            $inc: { reservedQty: reserveQty, availableQty: -reserveQty },
            $set: { updatedAt: now }
          }
        )

        await transactions.insertOne({
          id: uuidv4(),
          productId,
          warehouseId,
          type: 'reservation',
          quantity: reserveQty,
          orderId,
          notes: body.notes || '',
          createdBy: user.id,
          createdAt: now
        })

        return successResponse({ message: 'Inventory reserved', quantity: reserveQty })
      }

      case 'release': {
        // Release reserved inventory
        const releaseQty = parseFloat(body.quantity) || 0

        if (!inventoryRecord) {
          return errorResponse('Inventory record not found', 404)
        }

        const actualRelease = Math.min(releaseQty, inventoryRecord.reservedQty || 0)

        await inventory.updateOne(
          { id: inventoryRecord.id },
          {
            $inc: { reservedQty: -actualRelease, availableQty: actualRelease },
            $set: { updatedAt: now }
          }
        )

        await transactions.insertOne({
          id: uuidv4(),
          productId,
          warehouseId,
          type: 'release',
          quantity: actualRelease,
          notes: body.notes || '',
          createdBy: user.id,
          createdAt: now
        })

        return successResponse({ message: 'Inventory released', quantity: actualRelease })
      }

      case 'consume': {
        // Consume inventory (for installation)
        const consumeQty = parseFloat(body.quantity) || 0
        const installationId = body.installationId

        if (!inventoryRecord) {
          return errorResponse('Inventory record not found', 404)
        }

        // First check reserved qty (if consuming from reservation)
        let fromReserved = Math.min(consumeQty, inventoryRecord.reservedQty || 0)
        let fromAvailable = consumeQty - fromReserved

        if (fromAvailable > (inventoryRecord.availableQty || 0)) {
          return errorResponse('Insufficient inventory', 400)
        }

        await inventory.updateOne(
          { id: inventoryRecord.id },
          {
            $inc: { 
              quantity: -consumeQty, 
              reservedQty: -fromReserved, 
              availableQty: -fromAvailable 
            },
            $set: { updatedAt: now }
          }
        )

        await transactions.insertOne({
          id: uuidv4(),
          productId,
          warehouseId,
          type: 'consumption',
          quantity: -consumeQty,
          installationId,
          notes: body.notes || '',
          createdBy: user.id,
          createdAt: now
        })

        return successResponse({ message: 'Inventory consumed', quantity: consumeQty })
      }

      case 'transfer': {
        // Transfer between warehouses
        const transferQty = parseFloat(body.quantity) || 0
        const toWarehouseId = body.toWarehouseId

        if (!toWarehouseId) {
          return errorResponse('Destination warehouse required', 400)
        }

        if (!inventoryRecord || transferQty > (inventoryRecord.availableQty || 0)) {
          return errorResponse('Insufficient available quantity', 400)
        }

        // Reduce from source
        await inventory.updateOne(
          { id: inventoryRecord.id },
          {
            $inc: { quantity: -transferQty, availableQty: -transferQty },
            $set: { updatedAt: now }
          }
        )

        // Add to destination
        let destRecord = await inventory.findOne({ productId, warehouseId: toWarehouseId })
        if (destRecord) {
          await inventory.updateOne(
            { id: destRecord.id },
            {
              $inc: { quantity: transferQty, availableQty: transferQty },
              $set: { updatedAt: now }
            }
          )
        } else {
          await inventory.insertOne({
            id: uuidv4(),
            productId,
            warehouseId: toWarehouseId,
            quantity: transferQty,
            reservedQty: 0,
            availableQty: transferQty,
            avgCostPrice: inventoryRecord.avgCostPrice,
            reorderLevel: 100,
            batches: [],
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
        }

        // Record transaction
        await transactions.insertOne({
          id: uuidv4(),
          productId,
          warehouseId,
          type: 'transfer_out',
          quantity: -transferQty,
          toWarehouseId,
          notes: body.notes || '',
          createdBy: user.id,
          createdAt: now
        })

        return successResponse({ message: 'Transfer completed', quantity: transferQty })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Inventory POST Error:', error)
    return errorResponse('Failed to process inventory action', 500, error.message)
  }
}

// PUT - Update inventory settings (reorder level, etc.)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, productId, warehouseId = 'main', ...updateData } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const inventory = db.collection('flooring_inventory_v2')

    const query = id ? { id } : { productId, warehouseId }
    
    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await inventory.findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Inventory record not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Inventory PUT Error:', error)
    return errorResponse('Failed to update inventory', 500, error.message)
  }
}
