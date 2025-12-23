import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// ENTERPRISE STOCK VALUATION
// =============================================
// Supports FIFO, LIFO, Weighted Average costing
// Generates valuation reports by period
// Tracks inventory value changes over time
// COGS calculation

const COSTING_METHODS = {
  weighted_average: {
    label: 'Weighted Average',
    description: 'Average cost across all units',
    formula: '(Total Value / Total Quantity)'
  },
  fifo: {
    label: 'FIFO',
    description: 'First In, First Out',
    formula: 'Oldest cost first'
  },
  lifo: {
    label: 'LIFO',
    description: 'Last In, First Out',
    formula: 'Newest cost first'
  },
  specific: {
    label: 'Specific Identification',
    description: 'Track each unit individually',
    formula: 'Lot/Batch specific cost'
  }
}

// GET - Generate valuation report
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'current' // current, period, movement, cogs
    const warehouseId = searchParams.get('warehouseId')
    const categoryId = searchParams.get('categoryId')
    const productId = searchParams.get('productId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const costingMethod = searchParams.get('costingMethod') || 'weighted_average'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')
    const stockLedger = db.collection('wf_stock_ledger')
    const batchCollection = db.collection('wf_inventory_batches')
    const reservations = db.collection('wf_stock_reservations')

    const now = new Date()

    switch (reportType) {
      case 'current':
        // Current stock valuation
        const stockQuery = {}
        if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId
        if (categoryId) stockQuery.category = categoryId
        if (productId) stockQuery.productId = productId

        const stocks = await stockCollection.find(stockQuery).toArray()

        // Get reservations for each product
        const reservationsMap = {}
        const activeReservations = await reservations.find({ status: 'active' }).toArray()
        for (const res of activeReservations) {
          const key = `${res.productId}_${res.warehouseId}`
          if (!reservationsMap[key]) reservationsMap[key] = { qty: 0, value: 0, details: [] }
          reservationsMap[key].qty += res.reservedQty || 0
          reservationsMap[key].value += res.reservedValue || 0
          reservationsMap[key].details.push({
            reservationNumber: res.reservationNumber,
            refType: res.refType,
            refNumber: res.refNumber,
            qty: res.reservedQty,
            expiresAt: res.expiresAt
          })
        }

        // Calculate valuation for each stock item
        const valuationItems = stocks.map(stock => {
          const key = `${stock.productId}_${stock.warehouseId}`
          const reserved = reservationsMap[key] || { qty: 0, value: 0, details: [] }
          const avgCost = stock.avgCostPrice || stock.avgCost || 0
          const totalValue = (stock.quantity || 0) * avgCost
          const availableQty = (stock.quantity || 0) - (stock.reservedQty || 0)

          return {
            productId: stock.productId,
            productName: stock.productName,
            sku: stock.sku,
            warehouseId: stock.warehouseId,
            warehouseName: stock.warehouseName,
            category: stock.category,
            
            // Quantities
            totalQty: stock.quantity || 0,
            reservedQty: stock.reservedQty || 0,
            availableQty,
            unit: stock.unit || 'sqft',
            
            // Costing
            avgCost,
            lastCost: stock.lastCostPrice || stock.lastCost || avgCost,
            sellingPrice: stock.sellingPrice || 0,
            
            // Valuation
            totalValue,
            reservedValue: reserved.value,
            availableValue: availableQty * avgCost,
            
            // Margins
            grossMargin: stock.sellingPrice > 0 ? ((stock.sellingPrice - avgCost) / stock.sellingPrice * 100).toFixed(1) : 0,
            markup: avgCost > 0 ? ((stock.sellingPrice - avgCost) / avgCost * 100).toFixed(1) : 0,
            
            // Reserved details
            reservations: reserved.details,
            
            // Status
            status: stock.quantity <= 0 ? 'out_of_stock' : 
                    stock.quantity <= (stock.reorderLevel || 0) ? 'low_stock' : 'in_stock'
          }
        })

        // Summary
        const summary = {
          totalProducts: valuationItems.length,
          totalQuantity: valuationItems.reduce((sum, i) => sum + i.totalQty, 0),
          totalValue: valuationItems.reduce((sum, i) => sum + i.totalValue, 0),
          reservedQuantity: valuationItems.reduce((sum, i) => sum + i.reservedQty, 0),
          reservedValue: valuationItems.reduce((sum, i) => sum + i.reservedValue, 0),
          availableQuantity: valuationItems.reduce((sum, i) => sum + i.availableQty, 0),
          availableValue: valuationItems.reduce((sum, i) => sum + i.availableValue, 0),
          avgMargin: valuationItems.length > 0 
            ? (valuationItems.reduce((sum, i) => sum + parseFloat(i.grossMargin || 0), 0) / valuationItems.length).toFixed(1)
            : 0,
          lowStockItems: valuationItems.filter(i => i.status === 'low_stock').length,
          outOfStockItems: valuationItems.filter(i => i.status === 'out_of_stock').length,
          costingMethod,
          reportDate: now.toISOString()
        }

        // Top items by value
        const topByValue = [...valuationItems]
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 10)

        return successResponse({
          items: sanitizeDocuments(valuationItems),
          summary,
          topByValue: sanitizeDocuments(topByValue),
          costingMethods: COSTING_METHODS
        })

      case 'period':
        // Period comparison (opening vs closing)
        if (!fromDate || !toDate) {
          return errorResponse('From and To dates required for period report', 400)
        }

        const periodQuery = {
          createdAt: { $gte: fromDate, $lte: toDate }
        }
        if (warehouseId && warehouseId !== 'all') periodQuery.warehouseId = warehouseId
        if (productId) periodQuery.productId = productId

        const periodEntries = await stockLedger.find(periodQuery).sort({ createdAt: 1 }).toArray()

        // Group by product
        const productMovements = {}
        for (const entry of periodEntries) {
          if (!productMovements[entry.productId]) {
            productMovements[entry.productId] = {
              productId: entry.productId,
              productName: entry.productName,
              sku: entry.sku,
              warehouseId: entry.warehouseId,
              warehouseName: entry.warehouseName,
              openingQty: entry.balanceBefore,
              openingValue: entry.balanceBefore * entry.avgCostBefore,
              closingQty: entry.balanceAfter,
              closingValue: entry.balanceAfter * entry.avgCostAfter,
              totalIn: 0,
              totalOut: 0,
              totalInValue: 0,
              totalOutValue: 0,
              movements: []
            }
          }

          const pm = productMovements[entry.productId]
          pm.closingQty = entry.balanceAfter
          pm.closingValue = entry.balanceAfter * entry.avgCostAfter

          if (entry.direction === 'IN') {
            pm.totalIn += entry.quantity
            pm.totalInValue += entry.totalValue
          } else {
            pm.totalOut += entry.quantity
            pm.totalOutValue += entry.totalValue
          }

          pm.movements.push({
            date: entry.createdAt,
            type: entry.movementType,
            direction: entry.direction,
            qty: entry.quantity,
            value: entry.totalValue,
            refDoc: entry.refDocNumber
          })
        }

        const periodItems = Object.values(productMovements)
        const periodSummary = {
          fromDate,
          toDate,
          totalProducts: periodItems.length,
          openingValue: periodItems.reduce((sum, i) => sum + i.openingValue, 0),
          closingValue: periodItems.reduce((sum, i) => sum + i.closingValue, 0),
          totalInValue: periodItems.reduce((sum, i) => sum + i.totalInValue, 0),
          totalOutValue: periodItems.reduce((sum, i) => sum + i.totalOutValue, 0),
          netChange: periodItems.reduce((sum, i) => sum + (i.closingValue - i.openingValue), 0)
        }

        return successResponse({
          items: sanitizeDocuments(periodItems),
          summary: periodSummary
        })

      case 'cogs':
        // Cost of Goods Sold report
        const cogsQuery = {
          direction: 'OUT',
          movementType: { $in: ['challan_dispatch', 'sales_issue', 'goods_issue'] }
        }
        if (fromDate) cogsQuery.createdAt = { $gte: fromDate }
        if (toDate) cogsQuery.createdAt = { ...cogsQuery.createdAt, $lte: toDate }
        if (warehouseId && warehouseId !== 'all') cogsQuery.warehouseId = warehouseId

        const cogsEntries = await stockLedger.find(cogsQuery).sort({ createdAt: -1 }).toArray()

        // Group by product
        const cogsProducts = {}
        for (const entry of cogsEntries) {
          if (!cogsProducts[entry.productId]) {
            cogsProducts[entry.productId] = {
              productId: entry.productId,
              productName: entry.productName,
              sku: entry.sku,
              totalQtySold: 0,
              totalCOGS: 0,
              avgCostAtSale: 0,
              transactions: 0
            }
          }

          cogsProducts[entry.productId].totalQtySold += entry.quantity
          cogsProducts[entry.productId].totalCOGS += entry.totalValue
          cogsProducts[entry.productId].transactions++
        }

        // Calculate avg cost at sale
        const cogsItems = Object.values(cogsProducts).map(p => ({
          ...p,
          avgCostAtSale: p.totalQtySold > 0 ? (p.totalCOGS / p.totalQtySold).toFixed(2) : 0
        }))

        const cogsSummary = {
          fromDate,
          toDate,
          totalProducts: cogsItems.length,
          totalQtySold: cogsItems.reduce((sum, i) => sum + i.totalQtySold, 0),
          totalCOGS: cogsItems.reduce((sum, i) => sum + i.totalCOGS, 0),
          totalTransactions: cogsItems.reduce((sum, i) => sum + i.transactions, 0)
        }

        return successResponse({
          items: sanitizeDocuments(cogsItems),
          summary: cogsSummary
        })

      case 'fifo_layers':
        // FIFO inventory layers (cost layers)
        if (!productId) {
          return errorResponse('Product ID required for FIFO layers', 400)
        }

        // Get all IN entries for this product (these form the cost layers)
        const fifoQuery = {
          productId,
          direction: 'IN'
        }
        if (warehouseId && warehouseId !== 'all') fifoQuery.warehouseId = warehouseId

        const fifoEntries = await stockLedger.find(fifoQuery).sort({ createdAt: 1 }).toArray()

        // Get all OUT entries to calculate remaining layers
        const outEntries = await stockLedger.find({
          productId,
          direction: 'OUT',
          warehouseId: warehouseId || { $exists: true }
        }).sort({ createdAt: 1 }).toArray()

        // Calculate FIFO layers
        let layers = fifoEntries.map(e => ({
          date: e.createdAt,
          refDoc: e.refDocNumber,
          originalQty: e.quantity,
          remainingQty: e.quantity,
          unitCost: e.unitCost,
          value: e.quantity * e.unitCost
        }))

        // Consume layers with OUT entries (FIFO order)
        for (const out of outEntries) {
          let qtyToConsume = out.quantity
          for (const layer of layers) {
            if (qtyToConsume <= 0) break
            if (layer.remainingQty <= 0) continue

            const consumed = Math.min(layer.remainingQty, qtyToConsume)
            layer.remainingQty -= consumed
            layer.value = layer.remainingQty * layer.unitCost
            qtyToConsume -= consumed
          }
        }

        // Filter out fully consumed layers
        const activeLayers = layers.filter(l => l.remainingQty > 0)

        const fifoSummary = {
          productId,
          totalLayers: activeLayers.length,
          totalQty: activeLayers.reduce((sum, l) => sum + l.remainingQty, 0),
          totalValue: activeLayers.reduce((sum, l) => sum + l.value, 0),
          weightedAvgCost: activeLayers.length > 0 
            ? (activeLayers.reduce((sum, l) => sum + l.value, 0) / activeLayers.reduce((sum, l) => sum + l.remainingQty, 0)).toFixed(2)
            : 0,
          oldestLayerDate: activeLayers[0]?.date,
          newestLayerDate: activeLayers[activeLayers.length - 1]?.date
        }

        return successResponse({
          layers: activeLayers,
          summary: fifoSummary
        })

      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('Valuation GET Error:', error)
    return errorResponse('Failed to generate valuation report', 500, error.message)
  }
}

// POST - Record valuation adjustment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { productId, warehouseId, newCost, adjustmentType, reason, notes } = body

    if (!productId) return errorResponse('Product ID required', 400)
    if (!newCost && newCost !== 0) return errorResponse('New cost required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')
    const valuationHistory = db.collection('wf_valuation_history')

    const now = new Date()

    const stock = await stockCollection.findOne({
      productId,
      warehouseId: warehouseId || { $exists: true }
    })

    if (!stock) return errorResponse('Stock not found', 404)

    const oldCost = stock.avgCostPrice || stock.avgCost || 0
    const oldValue = (stock.quantity || 0) * oldCost
    const newValue = (stock.quantity || 0) * newCost
    const valueDifference = newValue - oldValue

    // Record valuation change
    const historyEntry = {
      id: uuidv4(),
      productId,
      productName: stock.productName,
      sku: stock.sku,
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouseName,
      adjustmentType: adjustmentType || 'cost_adjustment',
      quantity: stock.quantity || 0,
      oldCost,
      newCost,
      oldValue,
      newValue,
      valueDifference,
      reason,
      notes,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now.toISOString()
    }

    await valuationHistory.insertOne(historyEntry)

    // Update stock cost
    await stockCollection.updateOne(
      { productId, warehouseId: stock.warehouseId },
      {
        $set: {
          avgCostPrice: newCost,
          avgCost: newCost,
          totalValue: newValue,
          lastCostAdjustment: now.toISOString(),
          updatedAt: now.toISOString()
        }
      }
    )

    return successResponse({
      message: 'Valuation adjusted',
      adjustment: sanitizeDocument(historyEntry)
    }, 201)
  } catch (error) {
    console.error('Valuation POST Error:', error)
    return errorResponse('Failed to adjust valuation', 500, error.message)
  }
}
