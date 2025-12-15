import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Generate inventory reports
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const warehouseId = searchParams.get('warehouseId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const productId = searchParams.get('productId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')
    const movementCollection = db.collection('wf_inventory_movements')
    const batchCollection = db.collection('wf_inventory_batches')
    const warehouseCollection = db.collection('wf_warehouses')
    const productCollection = db.collection('wf_inventory')

    // Base queries
    let stockQuery = {}
    let movementQuery = {}
    let batchQuery = {}

    if (warehouseId && warehouseId !== 'all') {
      stockQuery.warehouseId = warehouseId
      movementQuery.warehouseId = warehouseId
      batchQuery.warehouseId = warehouseId
    }
    if (productId) {
      stockQuery.productId = productId
      movementQuery.productId = productId
      batchQuery.productId = productId
    }
    if (fromDate || toDate) {
      movementQuery.createdAt = {}
      if (fromDate) movementQuery.createdAt.$gte = new Date(fromDate)
      if (toDate) movementQuery.createdAt.$lte = new Date(toDate)
    }

    const warehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]))

    let reportData = {}

    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(stockCollection, movementCollection, batchCollection, warehouses, stockQuery)
        break

      case 'valuation':
        reportData = await generateValuationReport(stockCollection, batchCollection, warehouseMap, stockQuery)
        break

      case 'movement':
        reportData = await generateMovementReport(movementCollection, warehouseMap, movementQuery)
        break

      case 'dead_stock':
        reportData = await generateDeadStockReport(stockCollection, movementCollection, warehouseMap, stockQuery)
        break

      case 'aging':
        reportData = await generateAgingReport(batchCollection, warehouseMap, batchQuery)
        break

      case 'warehouse_summary':
        reportData = await generateWarehouseSummaryReport(stockCollection, batchCollection, warehouses)
        break

      case 'turnover':
        reportData = await generateTurnoverReport(stockCollection, movementCollection, warehouseMap, stockQuery, movementQuery)
        break

      case 'reorder':
        reportData = await generateReorderReport(stockCollection, productCollection, warehouseMap, stockQuery)
        break

      default:
        return errorResponse('Invalid report type', 400)
    }

    return successResponse({
      reportType,
      generatedAt: new Date().toISOString(),
      filters: { warehouseId, fromDate, toDate, productId },
      ...reportData
    })
  } catch (error) {
    console.error('Report GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to generate report', 500, error.message)
  }
}

// =============================================
// REPORT GENERATORS
// =============================================

async function generateSummaryReport(stockCollection, movementCollection, batchCollection, warehouses, stockQuery) {
  const stocks = await stockCollection.find(stockQuery).toArray()
  const batches = await batchCollection.find({ quantity: { $gt: 0 } }).toArray()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get movements for last 30 days
  const recentMovements = await movementCollection.find({
    createdAt: { $gte: thirtyDaysAgo }
  }).toArray()

  const totalQuantity = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const totalValue = stocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0)
  const reservedQty = stocks.reduce((sum, s) => sum + (s.reservedQty || 0), 0)

  const inwardMovements = recentMovements.filter(m => ['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in'].includes(m.movementType))
  const outwardMovements = recentMovements.filter(m => ['goods_issue', 'transfer_out', 'adjustment_minus', 'damage', 'return_out'].includes(m.movementType))

  return {
    summary: {
      totalWarehouses: warehouses.length,
      totalProducts: [...new Set(stocks.map(s => s.productId))].length,
      totalQuantity,
      reservedQuantity: reservedQty,
      availableQuantity: totalQuantity - reservedQty,
      totalValue,
      lowStockCount: stocks.filter(s => (s.quantity - (s.reservedQty || 0)) <= (s.reorderLevel || 10)).length,
      outOfStockCount: stocks.filter(s => s.quantity <= 0).length
    },
    last30Days: {
      totalInward: inwardMovements.reduce((sum, m) => sum + (m.quantity || 0), 0),
      totalOutward: outwardMovements.reduce((sum, m) => sum + (m.quantity || 0), 0),
      movementCount: recentMovements.length,
      avgDailyInward: inwardMovements.reduce((sum, m) => sum + (m.quantity || 0), 0) / 30,
      avgDailyOutward: outwardMovements.reduce((sum, m) => sum + (m.quantity || 0), 0) / 30
    },
    expiryAlerts: {
      expired: batches.filter(b => b.expiryDate && new Date(b.expiryDate) < now).length,
      expiringSoon: batches.filter(b => {
        if (!b.expiryDate) return false
        const exp = new Date(b.expiryDate)
        return exp >= now && exp <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      }).length
    }
  }
}

async function generateValuationReport(stockCollection, batchCollection, warehouseMap, stockQuery) {
  const stocks = await stockCollection.find(stockQuery).toArray()
  const batches = await batchCollection.find({ quantity: { $gt: 0 } }).toArray()

  // Group batches by product and warehouse for FIFO calculation
  const batchesByProductWarehouse = {}
  for (const batch of batches) {
    const key = `${batch.productId}_${batch.warehouseId}`
    if (!batchesByProductWarehouse[key]) batchesByProductWarehouse[key] = []
    batchesByProductWarehouse[key].push(batch)
  }

  // Sort batches by received date (FIFO)
  for (const key of Object.keys(batchesByProductWarehouse)) {
    batchesByProductWarehouse[key].sort((a, b) => new Date(a.receivedDate) - new Date(b.receivedDate))
  }

  const valuationDetails = []
  let totalFIFOValue = 0
  let totalWeightedAvgValue = 0

  for (const stock of stocks) {
    const key = `${stock.productId}_${stock.warehouseId}`
    const productBatches = batchesByProductWarehouse[key] || []

    // FIFO Valuation
    let fifoValue = 0
    let remainingQty = stock.quantity
    for (const batch of productBatches) {
      if (remainingQty <= 0) break
      const useQty = Math.min(batch.quantity, remainingQty)
      fifoValue += useQty * (batch.unitCost || 0)
      remainingQty -= useQty
    }
    // If no batches, use avg cost
    if (remainingQty > 0) {
      fifoValue += remainingQty * (stock.avgCostPrice || 0)
    }

    // Weighted Average Valuation
    const weightedAvgValue = (stock.quantity || 0) * (stock.avgCostPrice || 0)

    totalFIFOValue += fifoValue
    totalWeightedAvgValue += weightedAvgValue

    valuationDetails.push({
      productId: stock.productId,
      productName: stock.productName,
      sku: stock.sku,
      warehouseId: stock.warehouseId,
      warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
      quantity: stock.quantity || 0,
      avgCostPrice: stock.avgCostPrice || 0,
      fifoValue,
      weightedAvgValue,
      batchCount: productBatches.length
    })
  }

  // Group by warehouse
  const byWarehouse = {}
  for (const item of valuationDetails) {
    if (!byWarehouse[item.warehouseId]) {
      byWarehouse[item.warehouseId] = {
        warehouseName: item.warehouseName,
        totalQuantity: 0,
        fifoValue: 0,
        weightedAvgValue: 0,
        productCount: 0
      }
    }
    byWarehouse[item.warehouseId].totalQuantity += item.quantity
    byWarehouse[item.warehouseId].fifoValue += item.fifoValue
    byWarehouse[item.warehouseId].weightedAvgValue += item.weightedAvgValue
    byWarehouse[item.warehouseId].productCount++
  }

  return {
    totals: {
      fifoValue: totalFIFOValue,
      weightedAvgValue: totalWeightedAvgValue,
      variance: totalFIFOValue - totalWeightedAvgValue,
      variancePercent: totalWeightedAvgValue > 0 ? ((totalFIFOValue - totalWeightedAvgValue) / totalWeightedAvgValue * 100).toFixed(2) : 0
    },
    byWarehouse,
    details: valuationDetails
  }
}

async function generateMovementReport(movementCollection, warehouseMap, movementQuery) {
  const movements = await movementCollection.find(movementQuery).sort({ createdAt: -1 }).toArray()

  // Group by type
  const byType = {}
  const byDate = {}
  const byProduct = {}
  const byWarehouse = {}

  for (const mv of movements) {
    // By Type
    if (!byType[mv.movementType]) {
      byType[mv.movementType] = { count: 0, totalQty: 0, totalValue: 0 }
    }
    byType[mv.movementType].count++
    byType[mv.movementType].totalQty += mv.quantity || 0
    byType[mv.movementType].totalValue += mv.totalCost || 0

    // By Date (daily)
    const dateKey = new Date(mv.createdAt).toISOString().split('T')[0]
    if (!byDate[dateKey]) {
      byDate[dateKey] = { inward: 0, outward: 0, count: 0 }
    }
    byDate[dateKey].count++
    if (['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in'].includes(mv.movementType)) {
      byDate[dateKey].inward += mv.quantity || 0
    } else {
      byDate[dateKey].outward += mv.quantity || 0
    }

    // By Product
    if (!byProduct[mv.productId]) {
      byProduct[mv.productId] = { productName: mv.productName, sku: mv.sku, inward: 0, outward: 0, count: 0 }
    }
    byProduct[mv.productId].count++
    if (['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in'].includes(mv.movementType)) {
      byProduct[mv.productId].inward += mv.quantity || 0
    } else {
      byProduct[mv.productId].outward += mv.quantity || 0
    }

    // By Warehouse
    if (!byWarehouse[mv.warehouseId]) {
      byWarehouse[mv.warehouseId] = {
        warehouseName: warehouseMap.get(mv.warehouseId)?.name || 'Unknown',
        inward: 0,
        outward: 0,
        count: 0
      }
    }
    byWarehouse[mv.warehouseId].count++
    if (['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in'].includes(mv.movementType)) {
      byWarehouse[mv.warehouseId].inward += mv.quantity || 0
    } else {
      byWarehouse[mv.warehouseId].outward += mv.quantity || 0
    }
  }

  // Convert byDate to sorted array for charting
  const dailyTrend = Object.entries(byDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    summary: {
      totalMovements: movements.length,
      totalInward: movements.filter(m => ['goods_receipt', 'transfer_in', 'adjustment_plus', 'return_in'].includes(m.movementType))
        .reduce((sum, m) => sum + (m.quantity || 0), 0),
      totalOutward: movements.filter(m => ['goods_issue', 'transfer_out', 'adjustment_minus', 'damage', 'return_out'].includes(m.movementType))
        .reduce((sum, m) => sum + (m.quantity || 0), 0)
    },
    byType,
    byWarehouse,
    byProduct: Object.values(byProduct).sort((a, b) => (b.inward + b.outward) - (a.inward + a.outward)).slice(0, 20),
    dailyTrend
  }
}

async function generateDeadStockReport(stockCollection, movementCollection, warehouseMap, stockQuery) {
  const stocks = await stockCollection.find({ ...stockQuery, quantity: { $gt: 0 } }).toArray()
  const now = new Date()

  const deadStockItems = []
  const slowMovingItems = []

  for (const stock of stocks) {
    // Get last movement for this product in this warehouse
    const lastMovement = await movementCollection.findOne(
      { productId: stock.productId, warehouseId: stock.warehouseId },
      { sort: { createdAt: -1 } }
    )

    const lastMovementDate = lastMovement?.createdAt ? new Date(lastMovement.createdAt) : (stock.createdAt ? new Date(stock.createdAt) : now)
    const daysSinceLastMovement = Math.floor((now - lastMovementDate) / (1000 * 60 * 60 * 24))

    const item = {
      productId: stock.productId,
      productName: stock.productName,
      sku: stock.sku,
      warehouseId: stock.warehouseId,
      warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
      quantity: stock.quantity,
      value: (stock.quantity || 0) * (stock.avgCostPrice || 0),
      lastMovementDate,
      daysSinceLastMovement,
      lastMovementType: lastMovement?.movementType || 'none'
    }

    if (daysSinceLastMovement >= 90) {
      deadStockItems.push(item)
    } else if (daysSinceLastMovement >= 30) {
      slowMovingItems.push(item)
    }
  }

  // Sort by days (oldest first)
  deadStockItems.sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement)
  slowMovingItems.sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement)

  return {
    summary: {
      deadStockCount: deadStockItems.length,
      deadStockValue: deadStockItems.reduce((sum, i) => sum + i.value, 0),
      deadStockQuantity: deadStockItems.reduce((sum, i) => sum + i.quantity, 0),
      slowMovingCount: slowMovingItems.length,
      slowMovingValue: slowMovingItems.reduce((sum, i) => sum + i.value, 0)
    },
    deadStock: deadStockItems,
    slowMoving: slowMovingItems,
    thresholds: {
      deadStockDays: 90,
      slowMovingDays: 30
    }
  }
}

async function generateAgingReport(batchCollection, warehouseMap, batchQuery) {
  const batches = await batchCollection.find({ ...batchQuery, quantity: { $gt: 0 } }).toArray()
  const now = new Date()

  // Age buckets: 0-30, 31-60, 61-90, 91-180, 180+
  const ageBuckets = {
    '0-30': { count: 0, quantity: 0, value: 0, items: [] },
    '31-60': { count: 0, quantity: 0, value: 0, items: [] },
    '61-90': { count: 0, quantity: 0, value: 0, items: [] },
    '91-180': { count: 0, quantity: 0, value: 0, items: [] },
    '180+': { count: 0, quantity: 0, value: 0, items: [] }
  }

  for (const batch of batches) {
    const receivedDate = batch.receivedDate ? new Date(batch.receivedDate) : now
    const ageInDays = Math.floor((now - receivedDate) / (1000 * 60 * 60 * 24))
    const value = (batch.quantity || 0) * (batch.unitCost || 0)

    let bucket
    if (ageInDays <= 30) bucket = '0-30'
    else if (ageInDays <= 60) bucket = '31-60'
    else if (ageInDays <= 90) bucket = '61-90'
    else if (ageInDays <= 180) bucket = '91-180'
    else bucket = '180+'

    ageBuckets[bucket].count++
    ageBuckets[bucket].quantity += batch.quantity || 0
    ageBuckets[bucket].value += value
    ageBuckets[bucket].items.push({
      batchNumber: batch.batchNumber,
      productName: batch.productName,
      warehouseName: warehouseMap.get(batch.warehouseId)?.name || 'Unknown',
      quantity: batch.quantity,
      ageInDays,
      value
    })
  }

  // Limit items in each bucket to top 10 by value
  for (const bucket of Object.keys(ageBuckets)) {
    ageBuckets[bucket].items = ageBuckets[bucket].items
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }

  const totalValue = Object.values(ageBuckets).reduce((sum, b) => sum + b.value, 0)

  return {
    summary: {
      totalBatches: batches.length,
      totalQuantity: batches.reduce((sum, b) => sum + (b.quantity || 0), 0),
      totalValue,
      avgAge: batches.length > 0 ? Math.round(batches.reduce((sum, b) => {
        const age = Math.floor((now - new Date(b.receivedDate || now)) / (1000 * 60 * 60 * 24))
        return sum + age
      }, 0) / batches.length) : 0
    },
    ageBuckets,
    valueDistribution: Object.entries(ageBuckets).map(([bucket, data]) => ({
      bucket,
      value: data.value,
      percentage: totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0
    }))
  }
}

async function generateWarehouseSummaryReport(stockCollection, batchCollection, warehouses) {
  const warehouseSummaries = []

  for (const warehouse of warehouses) {
    const stocks = await stockCollection.find({ warehouseId: warehouse.id }).toArray()
    const batches = await batchCollection.find({ warehouseId: warehouse.id, quantity: { $gt: 0 } }).toArray()
    const now = new Date()

    const totalQuantity = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
    const totalValue = stocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0)
    const reservedQty = stocks.reduce((sum, s) => sum + (s.reservedQty || 0), 0)

    // Capacity utilization (if capacity is set)
    const capacityUsed = warehouse.capacity > 0 ? (totalQuantity / warehouse.capacity * 100).toFixed(1) : null

    warehouseSummaries.push({
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      warehouseCode: warehouse.code,
      location: `${warehouse.city || ''}${warehouse.state ? ', ' + warehouse.state : ''}`.trim() || '-',
      isDefault: warehouse.isDefault || false,
      metrics: {
        totalProducts: stocks.length,
        totalQuantity,
        reservedQuantity: reservedQty,
        availableQuantity: totalQuantity - reservedQty,
        totalValue,
        lowStockCount: stocks.filter(s => (s.quantity - (s.reservedQty || 0)) <= (s.reorderLevel || 10) && s.quantity > 0).length,
        outOfStockCount: stocks.filter(s => s.quantity <= 0).length
      },
      batches: {
        totalBatches: batches.length,
        expiredCount: batches.filter(b => b.expiryDate && new Date(b.expiryDate) < now).length,
        expiringSoonCount: batches.filter(b => {
          if (!b.expiryDate) return false
          const exp = new Date(b.expiryDate)
          return exp >= now && exp <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        }).length
      },
      capacity: {
        total: warehouse.capacity || 0,
        used: totalQuantity,
        utilization: capacityUsed
      }
    })
  }

  // Sort by value
  warehouseSummaries.sort((a, b) => b.metrics.totalValue - a.metrics.totalValue)

  return {
    warehouses: warehouseSummaries,
    totals: {
      totalWarehouses: warehouses.length,
      totalProducts: warehouseSummaries.reduce((sum, w) => sum + w.metrics.totalProducts, 0),
      totalQuantity: warehouseSummaries.reduce((sum, w) => sum + w.metrics.totalQuantity, 0),
      totalValue: warehouseSummaries.reduce((sum, w) => sum + w.metrics.totalValue, 0)
    }
  }
}

async function generateTurnoverReport(stockCollection, movementCollection, warehouseMap, stockQuery, movementQuery) {
  const stocks = await stockCollection.find(stockQuery).toArray()
  const movements = await movementCollection.find(movementQuery).toArray()

  // Calculate turnover by product
  const turnoverByProduct = {}

  // Get outward movements (sales/issues)
  const outwardMovements = movements.filter(m => ['goods_issue', 'transfer_out'].includes(m.movementType))

  for (const mv of outwardMovements) {
    if (!turnoverByProduct[mv.productId]) {
      turnoverByProduct[mv.productId] = {
        productName: mv.productName,
        sku: mv.sku,
        totalSold: 0,
        totalValue: 0
      }
    }
    turnoverByProduct[mv.productId].totalSold += mv.quantity || 0
    turnoverByProduct[mv.productId].totalValue += mv.totalCost || 0
  }

  // Calculate turnover ratio
  const turnoverItems = []
  for (const stock of stocks) {
    const soldData = turnoverByProduct[stock.productId] || { totalSold: 0, totalValue: 0 }
    const avgInventory = stock.quantity / 2 // Simplified: assumes average is half of current
    const turnoverRatio = avgInventory > 0 ? (soldData.totalSold / avgInventory) : 0

    turnoverItems.push({
      productId: stock.productId,
      productName: stock.productName,
      sku: stock.sku,
      warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
      currentStock: stock.quantity,
      totalSold: soldData.totalSold,
      avgInventory,
      turnoverRatio: turnoverRatio.toFixed(2),
      daysOfStock: soldData.totalSold > 0 ? Math.round((stock.quantity / soldData.totalSold) * 30) : 999
    })
  }

  // Sort by turnover ratio
  turnoverItems.sort((a, b) => parseFloat(b.turnoverRatio) - parseFloat(a.turnoverRatio))

  return {
    summary: {
      avgTurnoverRatio: (turnoverItems.reduce((sum, i) => sum + parseFloat(i.turnoverRatio), 0) / turnoverItems.length || 0).toFixed(2),
      highTurnover: turnoverItems.filter(i => parseFloat(i.turnoverRatio) >= 2).length,
      lowTurnover: turnoverItems.filter(i => parseFloat(i.turnoverRatio) < 0.5).length
    },
    items: turnoverItems.slice(0, 50)
  }
}

async function generateReorderReport(stockCollection, productCollection, warehouseMap, stockQuery) {
  const stocks = await stockCollection.find(stockQuery).toArray()
  const reorderItems = []

  for (const stock of stocks) {
    const availableQty = (stock.quantity || 0) - (stock.reservedQty || 0)
    const reorderLevel = stock.reorderLevel || 10

    if (availableQty <= reorderLevel) {
      const product = await productCollection.findOne({ id: stock.productId })
      const suggestedQty = Math.max((stock.maxStock || 100) - stock.quantity, reorderLevel * 2)

      reorderItems.push({
        productId: stock.productId,
        productName: stock.productName,
        sku: stock.sku,
        warehouseId: stock.warehouseId,
        warehouseName: warehouseMap.get(stock.warehouseId)?.name || 'Unknown',
        currentStock: stock.quantity,
        availableStock: availableQty,
        reorderLevel,
        suggestedOrderQty: suggestedQty,
        estimatedCost: suggestedQty * (stock.lastCostPrice || stock.avgCostPrice || 0),
        vendorName: product?.vendorName || null,
        priority: availableQty <= 0 ? 'critical' : availableQty <= reorderLevel / 2 ? 'high' : 'normal'
      })
    }
  }

  // Sort by priority and then by available stock
  const priorityOrder = { critical: 0, high: 1, normal: 2 }
  reorderItems.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return a.availableStock - b.availableStock
  })

  return {
    summary: {
      totalItems: reorderItems.length,
      criticalCount: reorderItems.filter(i => i.priority === 'critical').length,
      highCount: reorderItems.filter(i => i.priority === 'high').length,
      totalEstimatedCost: reorderItems.reduce((sum, i) => sum + i.estimatedCost, 0)
    },
    items: reorderItems
  }
}
