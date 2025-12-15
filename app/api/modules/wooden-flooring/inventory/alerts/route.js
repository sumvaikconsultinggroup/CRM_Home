import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch inventory alerts
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const alertType = searchParams.get('type') // low_stock, out_of_stock, expiring, expired, overstock

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')
    const batchCollection = db.collection('wf_inventory_batches')
    const warehouseCollection = db.collection('wf_warehouses')

    const alerts = []
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Build stock query
    let stockQuery = {}
    if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId

    const stocks = await stockCollection.find(stockQuery).toArray()
    const warehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]))

    // Low Stock Alerts
    if (!alertType || alertType === 'low_stock') {
      for (const stock of stocks) {
        const availableQty = (stock.quantity || 0) - (stock.reservedQty || 0)
        if (availableQty > 0 && availableQty <= (stock.reorderLevel || 10)) {
          alerts.push({
            id: `low_${stock.id}`,
            type: 'low_stock',
            severity: 'warning',
            productId: stock.productId,
            productName: stock.productName,
            sku: stock.sku,
            warehouseId: stock.warehouseId,
            warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
            currentQty: availableQty,
            reorderLevel: stock.reorderLevel || 10,
            suggestedOrder: Math.max((stock.maxStock || 100) - stock.quantity, 0),
            message: `Low stock: ${stock.productName} has only ${availableQty} units (reorder at ${stock.reorderLevel || 10})`,
            createdAt: new Date()
          })
        }
      }
    }

    // Out of Stock Alerts
    if (!alertType || alertType === 'out_of_stock') {
      for (const stock of stocks) {
        const availableQty = (stock.quantity || 0) - (stock.reservedQty || 0)
        if (availableQty <= 0) {
          alerts.push({
            id: `out_${stock.id}`,
            type: 'out_of_stock',
            severity: 'critical',
            productId: stock.productId,
            productName: stock.productName,
            sku: stock.sku,
            warehouseId: stock.warehouseId,
            warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
            currentQty: availableQty,
            suggestedOrder: stock.maxStock || 100,
            message: `Out of stock: ${stock.productName} has no available inventory`,
            createdAt: new Date()
          })
        }
      }
    }

    // Overstock Alerts
    if (!alertType || alertType === 'overstock') {
      for (const stock of stocks) {
        if (stock.maxStock && stock.quantity > stock.maxStock) {
          alerts.push({
            id: `over_${stock.id}`,
            type: 'overstock',
            severity: 'info',
            productId: stock.productId,
            productName: stock.productName,
            sku: stock.sku,
            warehouseId: stock.warehouseId,
            warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
            currentQty: stock.quantity,
            maxStock: stock.maxStock,
            excessQty: stock.quantity - stock.maxStock,
            message: `Overstock: ${stock.productName} exceeds max stock by ${stock.quantity - stock.maxStock} units`,
            createdAt: new Date()
          })
        }
      }
    }

    // Expiry Alerts from batches
    if (!alertType || alertType === 'expiring' || alertType === 'expired') {
      let batchQuery = { quantity: { $gt: 0 }, expiryDate: { $ne: null } }
      if (warehouseId && warehouseId !== 'all') batchQuery.warehouseId = warehouseId

      const batches = await batchCollection.find(batchQuery).toArray()

      for (const batch of batches) {
        const expiryDate = new Date(batch.expiryDate)
        
        if (expiryDate < now && (!alertType || alertType === 'expired')) {
          alerts.push({
            id: `exp_${batch.id}`,
            type: 'expired',
            severity: 'critical',
            productId: batch.productId,
            productName: batch.productName,
            batchNumber: batch.batchNumber,
            warehouseId: batch.warehouseId,
            warehouseName: warehouseMap.get(batch.warehouseId)?.name || 'Unknown',
            quantity: batch.quantity,
            expiryDate: batch.expiryDate,
            daysExpired: Math.floor((now - expiryDate) / (1000 * 60 * 60 * 24)),
            message: `Expired: Batch ${batch.batchNumber} of ${batch.productName} expired ${Math.floor((now - expiryDate) / (1000 * 60 * 60 * 24))} days ago`,
            createdAt: new Date()
          })
        } else if (expiryDate >= now && expiryDate <= thirtyDaysLater && (!alertType || alertType === 'expiring')) {
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
          alerts.push({
            id: `expiring_${batch.id}`,
            type: 'expiring',
            severity: daysUntilExpiry <= 7 ? 'warning' : 'info',
            productId: batch.productId,
            productName: batch.productName,
            batchNumber: batch.batchNumber,
            warehouseId: batch.warehouseId,
            warehouseName: warehouseMap.get(batch.warehouseId)?.name || 'Unknown',
            quantity: batch.quantity,
            expiryDate: batch.expiryDate,
            daysUntilExpiry,
            message: `Expiring soon: Batch ${batch.batchNumber} of ${batch.productName} expires in ${daysUntilExpiry} days`,
            createdAt: new Date()
          })
        }
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    // Summary
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      byType: {
        low_stock: alerts.filter(a => a.type === 'low_stock').length,
        out_of_stock: alerts.filter(a => a.type === 'out_of_stock').length,
        expiring: alerts.filter(a => a.type === 'expiring').length,
        expired: alerts.filter(a => a.type === 'expired').length,
        overstock: alerts.filter(a => a.type === 'overstock').length
      }
    }

    return successResponse({ alerts, summary })
  } catch (error) {
    console.error('Alerts GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch alerts', 500, error.message)
  }
}

// POST - Create reorder suggestion / purchase request
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, productIds, warehouseId } = body

    if (action !== 'generate_reorder') {
      return errorResponse('Invalid action', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')
    const productCollection = db.collection('wf_inventory')

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (productIds && productIds.length > 0) query.productId = { $in: productIds }

    // Only items below reorder level
    query.$expr = { $lte: [{ $subtract: ['$quantity', '$reservedQty'] }, '$reorderLevel'] }

    const lowStockItems = await stockCollection.find(query).toArray()

    const reorderSuggestions = []
    for (const stock of lowStockItems) {
      const product = await productCollection.findOne({ id: stock.productId })
      const suggestedQty = Math.max((stock.maxStock || 100) - stock.quantity, stock.reorderLevel * 2)
      
      reorderSuggestions.push({
        productId: stock.productId,
        productName: stock.productName,
        sku: stock.sku,
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        currentStock: stock.quantity,
        reservedQty: stock.reservedQty || 0,
        availableQty: stock.quantity - (stock.reservedQty || 0),
        reorderLevel: stock.reorderLevel,
        suggestedOrderQty: suggestedQty,
        estimatedCost: suggestedQty * (stock.lastCostPrice || product?.costPrice || 0),
        vendorId: product?.vendorId || null,
        vendorName: product?.vendorName || null,
        leadTimeDays: product?.leadTimeDays || 7
      })
    }

    // Calculate totals
    const totalItems = reorderSuggestions.length
    const totalQuantity = reorderSuggestions.reduce((sum, s) => sum + s.suggestedOrderQty, 0)
    const totalEstimatedCost = reorderSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0)

    return successResponse({
      reorderSuggestions,
      summary: {
        totalItems,
        totalQuantity,
        totalEstimatedCost
      }
    })
  } catch (error) {
    console.error('Reorder POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to generate reorder suggestions', 500, error.message)
  }
}
