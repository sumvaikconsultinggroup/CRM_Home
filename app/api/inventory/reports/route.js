import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get comprehensive inventory reports with 15+ graphical metrics
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'comprehensive'
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
    const challanCollection = db.collection('delivery_challans')
    const receiptCollection = db.collection('delivery_receipts')

    let report = {}

    switch (reportType) {
      case 'comprehensive':
      case 'summary':
        report = await generateComprehensiveReport(db, user.clientId, warehouseId)
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

      case 'reservation_analysis':
        report = await generateReservationAnalysis(db, user.clientId)
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

// COMPREHENSIVE REPORT with 15+ visualizations
async function generateComprehensiveReport(db, clientId, warehouseId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')
  const dispatchCollection = db.collection('inventory_dispatches')
  const reservationCollection = db.collection('inventory_reservations')
  const movementsCollection = db.collection('wf_inventory_movements')
  const challanCollection = db.collection('delivery_challans')

  const products = await productsCollection.find({ clientId }).toArray()
  let stockQuery = {}
  if (warehouseId) stockQuery.warehouseId = warehouseId
  const stock = await stockCollection.find(stockQuery).toArray()
  const dispatches = await dispatchCollection.find({ clientId }).sort({ createdAt: -1 }).toArray()
  const reservations = await reservationCollection.find({ clientId }).toArray()
  const movements = await movementsCollection.find({}).sort({ createdAt: -1 }).toArray()
  const challans = await challanCollection.find({ clientId }).toArray()

  // =====================
  // 1. SUMMARY CARDS (4 key metrics)
  // =====================
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

  const totalReservedValue = reservations
    .filter(r => r.status === 'active')
    .reduce((sum, r) => {
      const product = products.find(p => p.id === r.productId)
      return sum + ((r.quantity || 0) * (product?.sellingPrice || 0))
    }, 0)

  const summaryCards = [
    { id: 'total_stock_value', title: 'Total Stock Value', value: totalStockValue, format: 'currency', icon: 'IndianRupee', color: 'emerald' },
    { id: 'low_stock_items', title: 'Items Below Reorder', value: 0, format: 'number', icon: 'AlertTriangle', color: 'amber' },
    { id: 'blocked_inventory', title: 'Blocked Inventory Value', value: totalReservedValue, format: 'currency', icon: 'Lock', color: 'purple' },
    { id: 'monthly_turnover', title: 'Monthly Turnover', value: 0, format: 'currency', icon: 'TrendingUp', color: 'blue' }
  ]

  // Count low stock items
  let lowStockCount = 0
  for (const s of stock) {
    const product = products.find(p => p.id === s.productId)
    if (product && s.quantity <= (product.reorderLevel || 10)) {
      lowStockCount++
    }
  }
  summaryCards[1].value = lowStockCount

  // Calculate monthly turnover from dispatches
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const monthDispatches = dispatches.filter(d => new Date(d.createdAt) >= startOfMonth)
  const monthlyTurnover = monthDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0)
  summaryCards[3].value = monthlyTurnover

  // =====================
  // 2. STOCK LEVELS BY CATEGORY (Bar Chart)
  // =====================
  const categoryStock = {}
  for (const product of products) {
    const cat = product.category || 'Uncategorized'
    if (!categoryStock[cat]) {
      categoryStock[cat] = { category: cat, quantity: 0, value: 0, products: 0 }
    }
    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
    categoryStock[cat].quantity += totalQty
    categoryStock[cat].value += totalQty * (product.costPrice || 0)
    categoryStock[cat].products++
  }
  const stockByCategory = Object.values(categoryStock).sort((a, b) => b.value - a.value)

  // =====================
  // 3. INVENTORY MOVEMENT TREND (Line Chart - Last 6 months)
  // =====================
  const movementTrend = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    const monthMovements = movements.filter(m => {
      const mDate = new Date(m.createdAt)
      return mDate >= monthStart && mDate <= monthEnd
    })
    
    const inward = monthMovements
      .filter(m => ['goods_receipt', 'transfer_in', 'release'].includes(m.movementType))
      .reduce((sum, m) => sum + (m.quantity || 0), 0)
    const outward = monthMovements
      .filter(m => ['goods_issue', 'reservation', 'dispatch'].includes(m.movementType))
      .reduce((sum, m) => sum + (m.quantity || 0), 0)
    
    movementTrend.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      inward,
      outward,
      net: inward - outward
    })
  }

  // =====================
  // 4. TOP 10 FAST-MOVING ITEMS (Horizontal Bar)
  // =====================
  const productMovements = {}
  for (const dispatch of dispatches) {
    for (const item of (dispatch.items || [])) {
      if (!productMovements[item.productId]) {
        productMovements[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          totalQty: 0,
          totalValue: 0,
          dispatchCount: 0
        }
      }
      productMovements[item.productId].totalQty += (item.quantity || 0)
      productMovements[item.productId].totalValue += (item.totalPrice || 0)
      productMovements[item.productId].dispatchCount++
    }
  }
  const fastMovingItems = Object.values(productMovements)
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 10)

  // =====================
  // 5. TOP 10 SLOW-MOVING ITEMS (Horizontal Bar)
  // =====================
  const slowMovingItems = products
    .filter(p => {
      const movement = productMovements[p.id]
      return !movement || movement.totalQty < 10
    })
    .map(p => {
      const productStock = stock.filter(s => s.productId === p.id)
      return {
        productId: p.id,
        productName: p.name,
        category: p.category,
        stockQty: productStock.reduce((sum, s) => sum + (s.quantity || 0), 0),
        lastMovement: movements.find(m => m.productId === p.id)?.createdAt || null
      }
    })
    .sort((a, b) => b.stockQty - a.stockQty)
    .slice(0, 10)

  // =====================
  // 6. STOCK DISTRIBUTION BY LOCATION (Pie Chart)
  // =====================
  const locationStock = {}
  for (const s of stock) {
    const loc = s.warehouseId || 'default'
    if (!locationStock[loc]) {
      locationStock[loc] = { location: loc, quantity: 0, value: 0 }
    }
    const product = products.find(p => p.id === s.productId)
    locationStock[loc].quantity += (s.quantity || 0)
    locationStock[loc].value += (s.quantity || 0) * (product?.costPrice || 0)
  }
  const stockByLocation = Object.values(locationStock)

  // =====================
  // 7. DISPATCH STATUS BREAKDOWN (Donut Chart)
  // =====================
  const dispatchByStatus = [
    { status: 'pending', label: 'Pending', count: dispatches.filter(d => d.status === 'pending').length, color: '#F59E0B' },
    { status: 'loaded', label: 'Loaded', count: dispatches.filter(d => d.status === 'loaded').length, color: '#3B82F6' },
    { status: 'in_transit', label: 'In Transit', count: dispatches.filter(d => d.status === 'in_transit').length, color: '#8B5CF6' },
    { status: 'delivered', label: 'Delivered', count: dispatches.filter(d => d.status === 'delivered').length, color: '#10B981' },
    { status: 'cancelled', label: 'Cancelled', count: dispatches.filter(d => d.status === 'cancelled').length, color: '#EF4444' }
  ].filter(d => d.count > 0)

  // =====================
  // 8. QUOTE-TO-INVOICE CONVERSION (Gauge)
  // =====================
  const totalQuoteReservations = reservations.length
  const convertedReservations = reservations.filter(r => r.status === 'converted').length
  const conversionRate = totalQuoteReservations > 0 
    ? Math.round((convertedReservations / totalQuoteReservations) * 100) 
    : 0
  const quoteConversion = {
    totalQuotes: totalQuoteReservations,
    converted: convertedReservations,
    conversionRate,
    pending: reservations.filter(r => r.status === 'active').length,
    expired: reservations.filter(r => r.status === 'expired').length
  }

  // =====================
  // 9. BLOCKED VS AVAILABLE STOCK (Stacked Bar)
  // =====================
  const stockComparison = []
  const topProducts = products.slice(0, 10)
  for (const product of topProducts) {
    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
    const reservedQty = productStock.reduce((sum, s) => sum + (s.reservedQuantity || 0), 0)
    stockComparison.push({
      product: product.name?.substring(0, 20) || 'Unknown',
      available: totalQty - reservedQty,
      blocked: reservedQty,
      total: totalQty
    })
  }

  // =====================
  // 10. DAILY DISPATCH VOLUME (Area Chart - Last 30 days)
  // =====================
  const dailyDispatchVolume = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const dayDispatches = dispatches.filter(d => {
      const dDate = new Date(d.createdAt)
      return dDate >= date && dDate < nextDate
    })
    
    dailyDispatchVolume.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: dayDispatches.length,
      value: dayDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0)
    })
  }

  // =====================
  // 11. CATEGORY-WISE STOCK VALUE (Treemap)
  // =====================
  const categoryTreemap = stockByCategory.map(cat => ({
    name: cat.category,
    value: cat.value,
    quantity: cat.quantity,
    products: cat.products
  }))

  // =====================
  // 12. STOCK AGE DISTRIBUTION (Bar Chart)
  // =====================
  const ageDistribution = [
    { range: '0-30 days', count: 0, value: 0 },
    { range: '31-60 days', count: 0, value: 0 },
    { range: '61-90 days', count: 0, value: 0 },
    { range: '90+ days', count: 0, value: 0 }
  ]
  const now = new Date()
  for (const s of stock) {
    if (!s.lastReceiptDate) continue
    const receiptDate = new Date(s.lastReceiptDate)
    const daysDiff = Math.floor((now - receiptDate) / (1000 * 60 * 60 * 24))
    const product = products.find(p => p.id === s.productId)
    const value = (s.quantity || 0) * (product?.costPrice || 0)
    
    if (daysDiff <= 30) {
      ageDistribution[0].count += (s.quantity || 0)
      ageDistribution[0].value += value
    } else if (daysDiff <= 60) {
      ageDistribution[1].count += (s.quantity || 0)
      ageDistribution[1].value += value
    } else if (daysDiff <= 90) {
      ageDistribution[2].count += (s.quantity || 0)
      ageDistribution[2].value += value
    } else {
      ageDistribution[3].count += (s.quantity || 0)
      ageDistribution[3].value += value
    }
  }

  // =====================
  // 13. WEEKLY DISPATCH TREND (Bar Chart)
  // =====================
  const weeklyDispatch = []
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (i * 7))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    
    const weekDispatches = dispatches.filter(d => {
      const dDate = new Date(d.createdAt)
      return dDate >= weekStart && dDate < weekEnd
    })
    
    weeklyDispatch.push({
      week: `W${12 - i}`,
      pending: weekDispatches.filter(d => d.status === 'pending').length,
      delivered: weekDispatches.filter(d => d.status === 'delivered').length,
      total: weekDispatches.length
    })
  }

  // =====================
  // 14. TOP CUSTOMERS BY DISPATCH VALUE (Bar Chart)
  // =====================
  const customerDispatches = {}
  for (const d of dispatches) {
    const key = d.customerName || 'Unknown'
    if (!customerDispatches[key]) {
      customerDispatches[key] = { customer: key, dispatches: 0, value: 0 }
    }
    customerDispatches[key].dispatches++
    customerDispatches[key].value += (d.totalValue || 0)
  }
  const topCustomers = Object.values(customerDispatches)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // =====================
  // 15. RESERVATION STATUS (Pie Chart)
  // =====================
  const reservationStatus = [
    { status: 'active', label: 'Active (Blocked)', count: reservations.filter(r => r.status === 'active').length, color: '#8B5CF6' },
    { status: 'converted', label: 'Converted to Invoice', count: reservations.filter(r => r.status === 'converted').length, color: '#10B981' },
    { status: 'expired', label: 'Expired', count: reservations.filter(r => r.status === 'expired').length, color: '#EF4444' },
    { status: 'released', label: 'Released', count: reservations.filter(r => r.status === 'released').length, color: '#6B7280' }
  ].filter(r => r.count > 0)

  // =====================
  // MONTHLY STATS
  // =====================
  const monthlyStats = {
    totalDispatches: monthDispatches.length,
    dispatchValue: monthlyTurnover,
    delivered: monthDispatches.filter(d => d.status === 'delivered').length,
    pending: monthDispatches.filter(d => d.status === 'pending').length,
    inTransit: monthDispatches.filter(d => d.status === 'in_transit').length,
    challansGenerated: challans.filter(c => new Date(c.createdAt) >= startOfMonth).length
  }

  // =====================
  // STOCK HEALTH METRICS
  // =====================
  const outOfStockCount = stock.filter(s => (s.quantity || 0) <= 0).length
  const stockHealth = {
    lowStockCount,
    outOfStockCount,
    healthyStock: products.length - lowStockCount - outOfStockCount,
    activeReservations: reservations.filter(r => r.status === 'active').length,
    totalReservedQty: reservations
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + (r.quantity || 0), 0)
  }

  // =====================
  // LOW STOCK ITEMS LIST
  // =====================
  const lowStockItems = []
  for (const s of stock) {
    const product = products.find(p => p.id === s.productId)
    if (product && s.quantity <= (product.reorderLevel || 10)) {
      lowStockItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: s.quantity,
        reorderLevel: product.reorderLevel || 10,
        deficit: (product.reorderLevel || 10) - s.quantity
      })
    }
  }

  return {
    // Summary Section
    overview: {
      totalProducts,
      activeProducts,
      totalStockValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalStockValue,
      profitMargin: totalStockValue > 0 ? ((totalRetailValue - totalStockValue) / totalStockValue * 100).toFixed(2) : 0
    },
    
    // Key Metrics Cards
    summaryCards,
    
    // Monthly Stats
    monthlyStats,
    
    // Stock Health
    stockHealth,
    
    // LOW STOCK ALERTS
    lowStockItems: lowStockItems.slice(0, 10),
    
    // CHARTS DATA (15 visualizations)
    charts: {
      // 1. Stock by Category (Bar Chart)
      stockByCategory,
      
      // 2. Movement Trend (Line Chart)
      movementTrend,
      
      // 3. Fast Moving Items (Horizontal Bar)
      fastMovingItems,
      
      // 4. Slow Moving Items (Horizontal Bar)
      slowMovingItems,
      
      // 5. Stock by Location (Pie Chart)
      stockByLocation,
      
      // 6. Dispatch by Status (Donut Chart)
      dispatchByStatus,
      
      // 7. Quote Conversion (Gauge)
      quoteConversion,
      
      // 8. Available vs Blocked Stock (Stacked Bar)
      stockComparison,
      
      // 9. Daily Dispatch Volume (Area Chart)
      dailyDispatchVolume,
      
      // 10. Category Treemap
      categoryTreemap,
      
      // 11. Stock Age Distribution (Bar Chart)
      ageDistribution,
      
      // 12. Weekly Dispatch Trend (Bar Chart)
      weeklyDispatch,
      
      // 13. Top Customers (Bar Chart)
      topCustomers,
      
      // 14. Reservation Status (Pie Chart)
      reservationStatus,
      
      // 15. Revenue vs Dispatch (Combined Line Chart)
      revenueVsDispatch: dailyDispatchVolume.map(d => ({
        date: d.date,
        dispatchValue: d.value,
        dispatchCount: d.count
      }))
    }
  }
}

// STOCK LEVELS REPORT
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

// MOVEMENT REPORT
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

// DISPATCH REPORT
async function generateDispatchReport(db, clientId, fromDate, toDate) {
  const dispatchCollection = db.collection('inventory_dispatches')
  const challanCollection = db.collection('delivery_challans')
  const receiptCollection = db.collection('delivery_receipts')

  let query = { clientId }
  if (fromDate || toDate) {
    query.dispatchDate = {}
    if (fromDate) query.dispatchDate.$gte = new Date(fromDate)
    if (toDate) query.dispatchDate.$lte = new Date(toDate)
  }

  const dispatches = await dispatchCollection.find(query).sort({ dispatchDate: -1 }).toArray()
  const challans = await challanCollection.find({ clientId }).toArray()
  const receipts = await receiptCollection.find({ clientId }).toArray()

  const byStatus = {
    pending: dispatches.filter(d => d.status === 'pending'),
    loaded: dispatches.filter(d => d.status === 'loaded'),
    in_transit: dispatches.filter(d => d.status === 'in_transit'),
    delivered: dispatches.filter(d => d.status === 'delivered'),
    cancelled: dispatches.filter(d => d.status === 'cancelled')
  }

  // Calculate average delivery time
  const deliveredDispatches = dispatches.filter(d => d.status === 'delivered' && d.deliveredAt && d.createdAt)
  let avgDeliveryTime = 0
  if (deliveredDispatches.length > 0) {
    const totalHours = deliveredDispatches.reduce((sum, d) => {
      return sum + (new Date(d.deliveredAt) - new Date(d.createdAt)) / (1000 * 60 * 60)
    }, 0)
    avgDeliveryTime = Math.round(totalHours / deliveredDispatches.length)
  }

  return {
    totalDispatches: dispatches.length,
    totalValue: dispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0),
    totalChallans: challans.length,
    totalReceipts: receipts.length,
    avgDeliveryTimeHours: avgDeliveryTime,
    byStatus: {
      pending: { count: byStatus.pending.length, value: byStatus.pending.reduce((s, d) => s + (d.totalValue || 0), 0) },
      loaded: { count: byStatus.loaded.length, value: byStatus.loaded.reduce((s, d) => s + (d.totalValue || 0), 0) },
      in_transit: { count: byStatus.in_transit.length, value: byStatus.in_transit.reduce((s, d) => s + (d.totalValue || 0), 0) },
      delivered: { count: byStatus.delivered.length, value: byStatus.delivered.reduce((s, d) => s + (d.totalValue || 0), 0) },
      cancelled: { count: byStatus.cancelled.length, value: byStatus.cancelled.reduce((s, d) => s + (d.totalValue || 0), 0) }
    },
    recentDispatches: dispatches.slice(0, 20).map(d => ({
      id: d.id,
      dispatchNumber: d.dispatchNumber,
      invoiceNumber: d.invoiceNumber,
      customerName: d.customerName,
      status: d.status,
      totalValue: d.totalValue,
      itemCount: d.items?.length || 0,
      dispatchDate: d.dispatchDate,
      deliveredAt: d.deliveredAt
    }))
  }
}

// LOW STOCK REPORT
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

// VALUATION REPORT
async function generateValuationReport(db, clientId, warehouseId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')
  const reservationCollection = db.collection('inventory_reservations')

  const products = await productsCollection.find({ clientId }).toArray()
  
  let stockQuery = {}
  if (warehouseId) stockQuery.warehouseId = warehouseId
  const stock = await stockCollection.find(stockQuery).toArray()
  const reservations = await reservationCollection.find({ clientId, status: 'active' }).toArray()

  let totalCostValue = 0
  let totalRetailValue = 0
  let totalReservedValue = 0
  const valuationDetails = []

  for (const product of products) {
    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
    const reservedQty = reservations
      .filter(r => r.productId === product.id)
      .reduce((sum, r) => sum + (r.quantity || 0), 0)
    
    if (totalQty > 0) {
      const costValue = totalQty * (product.costPrice || 0)
      const retailValue = totalQty * (product.sellingPrice || 0)
      const reservedValue = reservedQty * (product.sellingPrice || 0)
      
      totalCostValue += costValue
      totalRetailValue += retailValue
      totalReservedValue += reservedValue

      valuationDetails.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        quantity: totalQty,
        availableQty: totalQty - reservedQty,
        reservedQty,
        unit: product.unit,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        costValue,
        retailValue,
        reservedValue,
        margin: retailValue - costValue,
        marginPercent: costValue > 0 ? ((retailValue - costValue) / costValue * 100).toFixed(2) : 0
      })
    }
  }

  valuationDetails.sort((a, b) => b.costValue - a.costValue)

  return {
    summary: {
      totalCostValue,
      totalRetailValue,
      totalReservedValue,
      potentialProfit: totalRetailValue - totalCostValue,
      overallMargin: totalCostValue > 0 ? ((totalRetailValue - totalCostValue) / totalCostValue * 100).toFixed(2) : 0,
      productsWithStock: valuationDetails.length,
      availableStockValue: totalCostValue - totalReservedValue
    },
    topValueProducts: valuationDetails.slice(0, 20),
    allProducts: valuationDetails
  }
}

// CATEGORY ANALYSIS
async function generateCategoryAnalysis(db, clientId) {
  const productsCollection = db.collection('inventory_products')
  const stockCollection = db.collection('wf_inventory_stock')
  const dispatchCollection = db.collection('inventory_dispatches')

  const products = await productsCollection.find({ clientId }).toArray()
  const stock = await stockCollection.find({}).toArray()
  const dispatches = await dispatchCollection.find({ clientId }).toArray()

  const categories = {}

  for (const product of products) {
    const cat = product.category || 'Uncategorized'
    if (!categories[cat]) {
      categories[cat] = {
        name: cat,
        productCount: 0,
        totalQuantity: 0,
        totalCostValue: 0,
        totalRetailValue: 0,
        dispatched: 0,
        dispatchValue: 0
      }
    }

    const productStock = stock.filter(s => s.productId === product.id)
    const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)

    categories[cat].productCount++
    categories[cat].totalQuantity += totalQty
    categories[cat].totalCostValue += totalQty * (product.costPrice || 0)
    categories[cat].totalRetailValue += totalQty * (product.sellingPrice || 0)

    // Calculate dispatch stats
    for (const dispatch of dispatches) {
      for (const item of (dispatch.items || [])) {
        if (item.productId === product.id) {
          categories[cat].dispatched += (item.quantity || 0)
          categories[cat].dispatchValue += (item.totalPrice || 0)
        }
      }
    }
  }

  const categoryList = Object.values(categories).sort((a, b) => b.totalCostValue - a.totalCostValue)

  return {
    categories: categoryList,
    summary: {
      totalCategories: categoryList.length,
      totalProducts: products.length,
      totalValue: categoryList.reduce((sum, c) => sum + c.totalCostValue, 0),
      totalDispatched: categoryList.reduce((sum, c) => sum + c.dispatched, 0)
    }
  }
}

// WAREHOUSE UTILIZATION
async function generateWarehouseUtilization(db, clientId) {
  const warehousesCollection = db.collection('wf_warehouses')
  const stockCollection = db.collection('wf_inventory_stock')
  const productsCollection = db.collection('inventory_products')

  const warehouses = await warehousesCollection.find({ clientId }).toArray()
  const products = await productsCollection.find({ clientId }).toArray()
  
  if (warehouses.length === 0) {
    const allStock = await stockCollection.find({}).toArray()
    let totalValue = 0
    for (const s of allStock) {
      const product = products.find(p => p.id === s.productId)
      totalValue += (s.quantity || 0) * (product?.costPrice || 0)
    }
    return {
      warehouses: [{
        id: 'default',
        name: 'Default Warehouse',
        productCount: new Set(allStock.map(s => s.productId)).size,
        totalQuantity: allStock.reduce((sum, s) => sum + (s.quantity || 0), 0),
        totalValue
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
    let totalValue = 0
    for (const s of warehouseStock) {
      const product = products.find(p => p.id === s.productId)
      totalValue += (s.quantity || 0) * (product?.costPrice || 0)
    }
    
    warehouseStats.push({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      productCount: new Set(warehouseStock.map(s => s.productId)).size,
      totalQuantity: warehouseStock.reduce((sum, s) => sum + (s.quantity || 0), 0),
      reservedQuantity: warehouseStock.reduce((sum, s) => sum + (s.reservedQuantity || 0), 0),
      totalValue,
      utilizationPercent: warehouse.capacity ? 
        (warehouseStock.reduce((sum, s) => sum + (s.quantity || 0), 0) / warehouse.capacity * 100).toFixed(2) : null
    })
  }

  return {
    warehouses: warehouseStats,
    summary: {
      totalWarehouses: warehouseStats.length,
      totalProducts: new Set(warehouseStats.flatMap(w => w.productCount)).size,
      totalQuantity: warehouseStats.reduce((sum, w) => sum + w.totalQuantity, 0),
      totalValue: warehouseStats.reduce((sum, w) => sum + w.totalValue, 0)
    }
  }
}

// RESERVATION ANALYSIS
async function generateReservationAnalysis(db, clientId) {
  const reservationCollection = db.collection('inventory_reservations')
  const productsCollection = db.collection('inventory_products')

  const reservations = await reservationCollection.find({ clientId }).sort({ createdAt: -1 }).toArray()
  const products = await productsCollection.find({ clientId }).toArray()

  const activeReservations = reservations.filter(r => r.status === 'active')
  const convertedReservations = reservations.filter(r => r.status === 'converted')
  const expiredReservations = reservations.filter(r => r.status === 'expired')

  let totalBlockedValue = 0
  for (const r of activeReservations) {
    const product = products.find(p => p.id === r.productId)
    totalBlockedValue += (r.quantity || 0) * (product?.sellingPrice || 0)
  }

  // Group by quote
  const byQuote = {}
  for (const r of activeReservations) {
    const key = r.quotationId || 'unknown'
    if (!byQuote[key]) {
      byQuote[key] = {
        quotationId: r.quotationId,
        quotationNumber: r.quotationNumber,
        customerName: r.customerName,
        items: [],
        totalValue: 0,
        expiresAt: r.expiresAt
      }
    }
    const product = products.find(p => p.id === r.productId)
    byQuote[key].items.push({
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity,
      value: (r.quantity || 0) * (product?.sellingPrice || 0)
    })
    byQuote[key].totalValue += (r.quantity || 0) * (product?.sellingPrice || 0)
  }

  return {
    summary: {
      totalReservations: reservations.length,
      active: activeReservations.length,
      converted: convertedReservations.length,
      expired: expiredReservations.length,
      totalBlockedValue,
      conversionRate: reservations.length > 0 
        ? ((convertedReservations.length / reservations.length) * 100).toFixed(2) 
        : 0
    },
    byStatus: [
      { status: 'active', label: 'Active (Blocked)', count: activeReservations.length },
      { status: 'converted', label: 'Converted', count: convertedReservations.length },
      { status: 'expired', label: 'Expired', count: expiredReservations.length }
    ],
    activeByQuote: Object.values(byQuote),
    recentReservations: reservations.slice(0, 20)
  }
}
