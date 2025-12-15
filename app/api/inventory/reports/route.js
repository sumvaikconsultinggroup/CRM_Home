import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get inventory reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const warehouseId = searchParams.get('warehouseId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const category = searchParams.get('category')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const productsCollection = db.collection('inventory_products')
    const stockCollection = db.collection('wf_inventory_stock')
    const movementsCollection = db.collection('wf_inventory_movements')
    const dispatchCollection = db.collection('inventory_dispatches')
    const reservationCollection = db.collection('inventory_reservations')
    const warehousesCollection = db.collection('wf_warehouses')

    let report = {}

    switch (reportType) {
      case 'summary':
        report = await generateSummaryReport(db, user.clientId, warehouseId)
        break

      case 'stock_levels':
        report = await generateStockLevelsReport(db, user.clientId, warehouseId, category)
        break

      case 'movements':
        report = await generateMovementReport(db, user.clientId, fromDate, toDate, warehouseId)
        break

      case 'dispatch_history':
        report = await generateDispatchReport(db, user.clientId, fromDate, toDate)
        break

      case 'low_stock':
        report = await generateLowStockReport(db, user.clientId, warehouseId)
        break

      case 'valuation':
        report = await generateValuationReport(db, user.clientId, warehouseId)
        break

      case 'category_analysis':
        report = await generateCategoryAnalysis(db, user.clientId)
        break

      case 'warehouse_utilization':
        report = await generateWarehouseUtilization(db, user.clientId)
        break

      default:
        return errorResponse('Invalid report type', 400)
    }

    return successResponse({
      reportType,
      generatedAt: new Date(),
      ...report
    })
  } catch (error) {
    console.error('Reports GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to generate report', 500, error.message)
  }
}

// Helper functions for report generation

async function generateSummaryReport(db, clientId, warehouseId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')
  const dispatchCollection = db.collection('inventory_dispatches')
  const reservationCollection = db.collection('inventory_reservations')

  const products = await productsCollection.find({ clientId }).toArray()
  
  let stockQuery = {}
  if (warehouseId) stockQuery.warehouseId = warehouseId
  const stock = await stockCollection.find(stockQuery).toArray()

  const totalProducts = products.length
  const activeProducts = products.filter(p => p.active !== false).length
  
  const totalStockValue = stock.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId)
    return sum + ((s.quantity || 0) * (product?.costPrice || 0))
  }, 0)

  const totalRetailValue = stock.reduce((sum, s) => {
    const product = products.find(p => p.id === s.productId)
    return sum + ((s.quantity || 0) * (product?.sellingPrice || 0))
  }, 0)

  // Get dispatch stats for current month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthDispatches = await dispatchCollection.find({
    clientId,
    dispatchDate: { $gte: startOfMonth }
  }).toArray()

  const activeReservations = await reservationCollection.countDocuments({
    clientId,
    status: 'active'
  })

  // Low stock items
  const lowStockItems = []
  for (const s of stock) {
    const product = products.find(p => p.id === s.productId)
    if (product && s.quantity <= (product.reorderLevel || 10)) {
      lowStockItems.push({
        productName: product.name,
        sku: product.sku,
        currentStock: s.quantity,
        reorderLevel: product.reorderLevel || 10
      })
    }
  }

  return {
    overview: {
      totalProducts,
      activeProducts,
      totalStockValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalStockValue,
      profitMargin: totalStockValue > 0 ? ((totalRetailValue - totalStockValue) / totalStockValue * 100).toFixed(2) : 0
    },
    monthlyStats: {
      totalDispatches: monthDispatches.length,
      dispatchValue: monthDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0),
      delivered: monthDispatches.filter(d => d.status === 'delivered').length,
      pending: monthDispatches.filter(d => d.status === 'pending').length
    },
    stockHealth: {
      lowStockCount: lowStockItems.length,
      outOfStockCount: stock.filter(s => (s.quantity || 0) <= 0).length,
      activeReservations
    },
    lowStockItems: lowStockItems.slice(0, 10) // Top 10
  }
}

async function generateStockLevelsReport(db, clientId, warehouseId, category) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')

  let productQuery = { clientId }
  if (category) productQuery.category = category

  const products = await productsCollection.find(productQuery).toArray()
  
  let stockQuery = {}
  if (warehouseId) stockQuery.warehouseId = warehouseId
  const stock = await stockCollection.find(stockQuery).toArray()

  const stockLevels = products.map(product => {
    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
    const availableQty = productStock.reduce((sum, s) => sum + (s.availableQuantity || s.quantity || 0), 0)
    const reservedQty = productStock.reduce((sum, s) => sum + (s.reservedQuantity || 0), 0)

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      totalQuantity: totalQty,
      availableQuantity: availableQty,
      reservedQuantity: reservedQty,
      reorderLevel: product.reorderLevel || 10,
      costPrice: product.costPrice || 0,
      sellingPrice: product.sellingPrice || 0,
      stockValue: totalQty * (product.costPrice || 0),
      status: totalQty <= 0 ? 'out_of_stock' : 
              totalQty <= (product.reorderLevel || 10) ? 'low_stock' : 'in_stock'
    }
  })

  return {
    products: stockLevels,
    summary: {
      totalProducts: stockLevels.length,
      inStock: stockLevels.filter(p => p.status === 'in_stock').length,
      lowStock: stockLevels.filter(p => p.status === 'low_stock').length,
      outOfStock: stockLevels.filter(p => p.status === 'out_of_stock').length,
      totalStockValue: stockLevels.reduce((sum, p) => sum + p.stockValue, 0)
    }
  }
}

async function generateMovementReport(db, clientId, fromDate, toDate, warehouseId) {
  const movementsCollection = db.collection('wf_inventory_movements')

  let query = {}
  if (warehouseId) query.warehouseId = warehouseId
  if (fromDate || toDate) {
    query.createdAt = {}
    if (fromDate) query.createdAt.$gte = new Date(fromDate)
    if (toDate) query.createdAt.$lte = new Date(toDate)
  }

  const movements = await movementsCollection.find(query).sort({ createdAt: -1 }).toArray()

  // Group by type
  const byType = {}
  for (const m of movements) {
    const type = m.movementType || 'unknown'
    if (!byType[type]) {
      byType[type] = { count: 0, totalQty: 0, movements: [] }
    }
    byType[type].count++
    byType[type].totalQty += m.quantity || 0
    if (byType[type].movements.length < 10) {
      byType[type].movements.push(m)
    }
  }

  // Calculate inward/outward
  const inwardTypes = ['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in', 'release']
  const outwardTypes = ['goods_issue', 'transfer_out', 'adjustment_minus', 'damage', 'return_out', 'reservation']

  const inward = movements.filter(m => inwardTypes.includes(m.movementType))
  const outward = movements.filter(m => outwardTypes.includes(m.movementType))

  return {
    totalMovements: movements.length,
    inward: {
      count: inward.length,
      totalQuantity: inward.reduce((sum, m) => sum + (m.quantity || 0), 0)
    },
    outward: {
      count: outward.length,
      totalQuantity: outward.reduce((sum, m) => sum + (m.quantity || 0), 0)
    },
    byType,
    recentMovements: movements.slice(0, 20)
  }
}

async function generateDispatchReport(db, clientId, fromDate, toDate) {
  const dispatchCollection = db.collection('inventory_dispatches')

  let query = { clientId }
  if (fromDate || toDate) {
    query.dispatchDate = {}
    if (fromDate) query.dispatchDate.$gte = new Date(fromDate)
    if (toDate) query.dispatchDate.$lte = new Date(toDate)
  }

  const dispatches = await dispatchCollection.find(query).sort({ dispatchDate: -1 }).toArray()

  const byStatus = {
    pending: dispatches.filter(d => d.status === 'pending'),
    in_transit: dispatches.filter(d => d.status === 'in_transit'),
    delivered: dispatches.filter(d => d.status === 'delivered'),
    cancelled: dispatches.filter(d => d.status === 'cancelled')
  }

  return {
    totalDispatches: dispatches.length,
    totalValue: dispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0),
    byStatus: {
      pending: { count: byStatus.pending.length, value: byStatus.pending.reduce((s, d) => s + (d.totalValue || 0), 0) },
      in_transit: { count: byStatus.in_transit.length, value: byStatus.in_transit.reduce((s, d) => s + (d.totalValue || 0), 0) },
      delivered: { count: byStatus.delivered.length, value: byStatus.delivered.reduce((s, d) => s + (d.totalValue || 0), 0) },
      cancelled: { count: byStatus.cancelled.length, value: byStatus.cancelled.reduce((s, d) => s + (d.totalValue || 0), 0) }
    },
    recentDispatches: dispatches.slice(0, 20).map(d => ({
      id: d.id,
      dispatchNumber: d.dispatchNumber,
      customerName: d.customerName,
      status: d.status,
      totalValue: d.totalValue,
      itemCount: d.items?.length || 0,
      dispatchDate: d.dispatchDate,
      deliveredAt: d.deliveredAt
    }))
  }
}

async function generateLowStockReport(db, clientId, warehouseId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')

  const products = await productsCollection.find({ clientId, active: { $ne: false } }).toArray()
  
  let stockQuery = {}
  if (warehouseId) stockQuery.warehouseId = warehouseId
  const stock = await stockCollection.find(stockQuery).toArray()

  const lowStockItems = []
  const outOfStockItems = []

  for (const product of products) {
    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
    const reorderLevel = product.reorderLevel || 10

    if (totalQty <= 0) {
      outOfStockItems.push({
        ...product,
        currentStock: 0,
        reorderLevel,
        deficit: reorderLevel,
        reorderQuantity: product.reorderQuantity || 50
      })
    } else if (totalQty <= reorderLevel) {
      lowStockItems.push({
        ...product,
        currentStock: totalQty,
        reorderLevel,
        deficit: reorderLevel - totalQty,
        reorderQuantity: product.reorderQuantity || 50
      })
    }
  }

  return {
    lowStockItems,
    outOfStockItems,
    summary: {
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      totalAlerts: lowStockItems.length + outOfStockItems.length
    }
  }
}

async function generateValuationReport(db, clientId, warehouseId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')

  const products = await productsCollection.find({ clientId }).toArray()
  
  let stockQuery = {}
  if (warehouseId) stockQuery.warehouseId = warehouseId
  const stock = await stockCollection.find(stockQuery).toArray()

  let totalCostValue = 0
  let totalRetailValue = 0
  const valuationDetails = []

  for (const product of products) {
    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
    
    if (totalQty > 0) {
      const costValue = totalQty * (product.costPrice || 0)
      const retailValue = totalQty * (product.sellingPrice || 0)
      
      totalCostValue += costValue
      totalRetailValue += retailValue

      valuationDetails.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        quantity: totalQty,
        unit: product.unit,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        costValue,
        retailValue,
        margin: retailValue - costValue,
        marginPercent: costValue > 0 ? ((retailValue - costValue) / costValue * 100).toFixed(2) : 0
      })
    }
  }

  // Sort by value
  valuationDetails.sort((a, b) => b.costValue - a.costValue)

  return {
    summary: {
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      overallMargin: totalCostValue > 0 ? ((totalRetailValue - totalCostValue) / totalCostValue * 100).toFixed(2) : 0,
      productsWithStock: valuationDetails.length
    },
    topValueProducts: valuationDetails.slice(0, 20),
    allProducts: valuationDetails
  }
}

async function generateCategoryAnalysis(db, clientId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')

  const products = await productsCollection.find({ clientId }).toArray()
  const stock = await stockCollection.find({}).toArray()

  const categories = {}

  for (const product of products) {
    const cat = product.category || 'Uncategorized'
    if (!categories[cat]) {
      categories[cat] = {
        name: cat,
        productCount: 0,
        totalQuantity: 0,
        totalCostValue: 0,
        totalRetailValue: 0
      }
    }

    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)

    categories[cat].productCount++
    categories[cat].totalQuantity += totalQty
    categories[cat].totalCostValue += totalQty * (product.costPrice || 0)
    categories[cat].totalRetailValue += totalQty * (product.sellingPrice || 0)
  }

  const categoryList = Object.values(categories).sort((a, b) => b.totalCostValue - a.totalCostValue)

  return {
    categories: categoryList,
    summary: {
      totalCategories: categoryList.length,
      totalProducts: products.length,
      totalValue: categoryList.reduce((sum, c) => sum + c.totalCostValue, 0)
    }
  }
}

async function generateWarehouseUtilization(db, clientId) {
  const warehousesCollection = db.collection('wf_warehouses')
  const stockCollection = db.collection('wf_inventory_stock')

  const warehouses = await warehousesCollection.find({ clientId }).toArray()
  
  // If no warehouses, create a default summary
  if (warehouses.length === 0) {
    const allStock = await stockCollection.find({}).toArray()
    return {
      warehouses: [{
        id: 'default',
        name: 'Default Warehouse',
        productCount: new Set(allStock.map(s => s.productId)).size,
        totalQuantity: allStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
      }],
      summary: {
        totalWarehouses: 1,
        totalProducts: new Set(allStock.map(s => s.productId)).size
      }
    }
  }

  const warehouseStats = []

  for (const warehouse of warehouses) {
    const warehouseStock = await stockCollection.find({ warehouseId: warehouse.id }).toArray()
    
    warehouseStats.push({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      productCount: new Set(warehouseStock.map(s => s.productId)).size,
      totalQuantity: warehouseStock.reduce((sum, s) => sum + (s.quantity || 0), 0),
      reservedQuantity: warehouseStock.reduce((sum, s) => sum + (s.reservedQuantity || 0), 0),
      utilizationPercent: warehouse.capacity ? 
        (warehouseStock.reduce((sum, s) => sum + (s.quantity || 0), 0) / warehouse.capacity * 100).toFixed(2) : null
    })
  }

  return {
    warehouses: warehouseStats,
    summary: {
      totalWarehouses: warehouseStats.length,
      totalProducts: new Set(warehouseStats.flatMap(w => w.productCount)).size,
      totalQuantity: warehouseStats.reduce((sum, w) => sum + w.totalQuantity, 0)
    }
  }
}
