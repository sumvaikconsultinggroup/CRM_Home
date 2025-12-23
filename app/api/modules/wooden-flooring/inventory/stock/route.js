import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { checkPermission, logAccess } from '@/lib/middleware/rbac'
import { COLLECTIONS } from '@/lib/db/flooring-collections'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch stock with warehouse filter
export async function GET(request) {
  try {
    // RBAC Check - stock.view permission
    const authCheck = await checkPermission(request, 'stock.view')
    if (!authCheck.authorized) return authCheck.error
    const user = authCheck.user

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const outOfStock = searchParams.get('outOfStock') === 'true'
    const search = searchParams.get('search')
    const includeBatches = searchParams.get('includeBatches') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection(COLLECTIONS.INVENTORY_STOCK)
    const batchCollection = db.collection(COLLECTIONS.INVENTORY_BATCHES)
    const warehouseCollection = db.collection(COLLECTIONS.WAREHOUSES)
    const productCollection = db.collection(COLLECTIONS.PRODUCTS)

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (productId) query.productId = productId
    if (category) query.category = category
    if (lowStock) query.$expr = { $lte: ['$quantity', '$reorderLevel'] }
    if (outOfStock) query.quantity = { $lte: 0 }

    // Get stock records from all sources
    let stocks = await stockCollection.find(query).sort({ productName: 1 }).toArray()
    
    // Also get from flooring_inventory_v2 for completeness
    const v2Stocks = await db.collection(COLLECTIONS.INVENTORY).find({}).toArray()
    
    // Combine all stock sources
    const allStocks = [...stocks]
    for (const v2 of v2Stocks) {
      // Add v2 stocks with proper field mapping
      allStocks.push({
        ...v2,
        reservedQty: v2.reservedQty || 0,
        source: 'flooring_inventory_v2'
      })
    }
    
    // CONSOLIDATE: Remove duplicates by keeping the best entry per productId
    // This fixes the issue of same product appearing twice
    const consolidatedMap = new Map()
    for (const stock of allStocks) {
      if (!stock.productId) continue
      
      const existing = consolidatedMap.get(stock.productId)
      const stockQty = stock.quantity || 0
      const stockReserved = stock.reservedQty || stock.reservedQuantity || 0
      const stockAvailable = stockQty - stockReserved
      const hasRealWarehouse = stock.warehouseId && !['default', 'main'].includes(stock.warehouseId)
      const hasSku = !!stock.sku
      
      if (existing) {
        const existingQty = existing.quantity || 0
        const existingAvailable = existingQty - (existing.reservedQty || existing.reservedQuantity || 0)
        const existingHasRealWarehouse = existing.warehouseId && !['default', 'main'].includes(existing.warehouseId)
        
        // Replace if: better quantity, or better warehouse, or has SKU
        let shouldReplace = false
        if (stockAvailable > existingAvailable) {
          shouldReplace = true
        } else if (stockAvailable === existingAvailable && hasRealWarehouse && !existingHasRealWarehouse) {
          shouldReplace = true
        } else if (stockQty > 0 && existingQty === 0) {
          shouldReplace = true
        } else if (hasSku && !existing.sku) {
          shouldReplace = true
        }
        
        if (shouldReplace) {
          consolidatedMap.set(stock.productId, stock)
        }
      } else {
        consolidatedMap.set(stock.productId, stock)
      }
    }
    
    // Filter out entries with 0 stock and no real warehouse (orphan entries)
    stocks = Array.from(consolidatedMap.values()).filter(stock => {
      const qty = stock.quantity || 0
      const hasRealWarehouse = stock.warehouseId && !['default', 'main'].includes(stock.warehouseId)
      // Keep if has stock OR has a proper warehouse assignment
      return qty > 0 || hasRealWarehouse
    })

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      stocks = stocks.filter(s => 
        s.productName?.toLowerCase().includes(searchLower) ||
        s.sku?.toLowerCase().includes(searchLower) ||
        s.batchNumber?.toLowerCase().includes(searchLower)
      )
    }

    // Get warehouses for reference
    const warehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]))

    // Enrich stock data
    for (const stock of stocks) {
      stock.warehouse = warehouseMap.get(stock.warehouseId) || null
      
      // Get batches if requested
      if (includeBatches) {
        stock.batches = await batchCollection.find({ 
          productId: stock.productId, 
          warehouseId: stock.warehouseId,
          quantity: { $gt: 0 }
        }).sort({ receivedDate: 1 }).toArray()
      }
    }

    // Calculate summary
    const summary = {
      totalProducts: [...new Set(stocks.map(s => s.productId))].length,
      totalQuantity: stocks.reduce((sum, s) => sum + (s.quantity || 0), 0),
      reservedQuantity: stocks.reduce((sum, s) => sum + (s.reservedQty || 0), 0),
      availableQuantity: stocks.reduce((sum, s) => sum + ((s.quantity || 0) - (s.reservedQty || 0)), 0),
      totalValue: stocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0),
      lowStockCount: stocks.filter(s => s.quantity <= (s.reorderLevel || 10)).length,
      outOfStockCount: stocks.filter(s => s.quantity <= 0).length,
      warehouseCount: warehouses.length
    }

    // Group by warehouse for summary
    const byWarehouse = {}
    for (const stock of stocks) {
      const whId = stock.warehouseId || 'unassigned'
      if (!byWarehouse[whId]) {
        byWarehouse[whId] = {
          warehouse: stock.warehouse,
          totalQuantity: 0,
          totalValue: 0,
          productCount: 0
        }
      }
      byWarehouse[whId].totalQuantity += stock.quantity || 0
      byWarehouse[whId].totalValue += (stock.quantity || 0) * (stock.avgCostPrice || 0)
      byWarehouse[whId].productCount++
    }

    return successResponse({
      stocks: sanitizeDocuments(stocks),
      warehouses: sanitizeDocuments(warehouses),
      summary,
      byWarehouse
    })
  } catch (error) {
    console.error('Stock GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch stock', 500, error.message)
  }
}

// POST - Initialize stock for product in warehouse (usually done via movements)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { productId, warehouseId, reorderLevel, safetyStock, maxStock } = body

    if (!productId || !warehouseId) {
      return errorResponse('Product ID and Warehouse ID are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')
    const productCollection = db.collection('wf_inventory')
    const warehouseCollection = db.collection('wf_warehouses')

    // Verify product and warehouse exist
    const product = await productCollection.findOne({ id: productId })
    if (!product) return errorResponse('Product not found', 404)

    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    // Check if stock record already exists
    const existing = await stockCollection.findOne({ productId, warehouseId })
    if (existing) {
      // Update levels only
      const updated = await stockCollection.findOneAndUpdate(
        { productId, warehouseId },
        { 
          $set: { 
            reorderLevel: reorderLevel ?? existing.reorderLevel,
            safetyStock: safetyStock ?? existing.safetyStock,
            maxStock: maxStock ?? existing.maxStock,
            updatedAt: new Date()
          } 
        },
        { returnDocument: 'after' }
      )
      return successResponse(sanitizeDocument(updated))
    }

    // Create new stock record (quantity starts at 0, use movements to add stock)
    const stock = {
      id: uuidv4(),
      clientId: user.clientId,
      productId,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      warehouseId,
      warehouseName: warehouse.name,
      quantity: 0,
      reservedQty: 0,
      availableQty: 0,
      avgCostPrice: product.costPrice || 0,
      lastCostPrice: product.costPrice || 0,
      sellingPrice: product.sellingPrice || 0,
      reorderLevel: reorderLevel || 10,
      safetyStock: safetyStock || 5,
      maxStock: maxStock || 1000,
      unit: product.unit || 'sqft',
      lastMovementDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await stockCollection.insertOne(stock)
    return successResponse(sanitizeDocument(stock), 201)
  } catch (error) {
    console.error('Stock POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create stock record', 500, error.message)
  }
}

// PUT - Update stock levels (reorder, safety, max)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, productId, warehouseId, reorderLevel, safetyStock, maxStock } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')

    let query = {}
    if (id) query.id = id
    else if (productId && warehouseId) query = { productId, warehouseId }
    else return errorResponse('Stock ID or Product+Warehouse IDs required', 400)

    const updates = { updatedAt: new Date() }
    if (reorderLevel !== undefined) updates.reorderLevel = reorderLevel
    if (safetyStock !== undefined) updates.safetyStock = safetyStock
    if (maxStock !== undefined) updates.maxStock = maxStock

    const result = await stockCollection.findOneAndUpdate(
      query,
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Stock record not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Stock PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update stock', 500, error.message)
  }
}
