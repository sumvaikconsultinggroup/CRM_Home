import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Stock aging and ABC analysis report
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'aging' // aging, abc, slow_moving, dead_stock
    const warehouseId = searchParams.get('warehouseId')
    const categoryId = searchParams.get('categoryId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const lots = db.collection('flooring_lots')
    const inventory = db.collection('flooring_inventory_v2')
    const movements = db.collection('flooring_stock_movements')

    const now = new Date()

    const lotQuery = { status: { $in: ['available', 'partial', 'reserved'] } }
    if (warehouseId) lotQuery.warehouseId = warehouseId

    const allLots = await lots.find(lotQuery).toArray()

    switch (reportType) {
      case 'aging': {
        // Calculate age for each lot
        const agingBuckets = {
          '0-30': { days: '0-30 days', lots: [], sqft: 0, value: 0 },
          '31-60': { days: '31-60 days', lots: [], sqft: 0, value: 0 },
          '61-90': { days: '61-90 days', lots: [], sqft: 0, value: 0 },
          '91-180': { days: '91-180 days', lots: [], sqft: 0, value: 0 },
          '181-365': { days: '181-365 days', lots: [], sqft: 0, value: 0 },
          '365+': { days: '365+ days', lots: [], sqft: 0, value: 0 }
        }

        allLots.forEach(lot => {
          const receivedDate = new Date(lot.receivedDate || lot.createdAt)
          const ageDays = Math.floor((now - receivedDate) / (1000 * 60 * 60 * 24))
          const availableSqft = (lot.sqft || 0) - (lot.reservedQty || 0) - (lot.issuedQty || 0)
          const value = availableSqft * (lot.landedCostPerSqft || 0)
          
          let bucket
          if (ageDays <= 30) bucket = '0-30'
          else if (ageDays <= 60) bucket = '31-60'
          else if (ageDays <= 90) bucket = '61-90'
          else if (ageDays <= 180) bucket = '91-180'
          else if (ageDays <= 365) bucket = '181-365'
          else bucket = '365+'
          
          agingBuckets[bucket].lots.push({
            id: lot.id,
            lotNo: lot.lotNo,
            productName: lot.productName,
            sku: lot.sku,
            shade: lot.shade,
            ageDays,
            availableSqft,
            value
          })
          agingBuckets[bucket].sqft += availableSqft
          agingBuckets[bucket].value += value
        })

        const agingReport = Object.values(agingBuckets).map(bucket => ({
          ...bucket,
          count: bucket.lots.length,
          lots: bucket.lots.sort((a, b) => b.ageDays - a.ageDays).slice(0, 20) // Top 20 oldest
        }))

        const totalValue = agingReport.reduce((sum, b) => sum + b.value, 0)
        
        return successResponse({
          report: 'Stock Aging Analysis',
          generatedAt: now.toISOString(),
          buckets: agingReport,
          summary: {
            totalLots: allLots.length,
            totalSqft: agingReport.reduce((sum, b) => sum + b.sqft, 0),
            totalValue,
            oldStock30Plus: agingReport.slice(1).reduce((sum, b) => sum + b.count, 0),
            oldStock90Plus: agingReport.slice(3).reduce((sum, b) => sum + b.count, 0),
            oldStockValue90Plus: agingReport.slice(3).reduce((sum, b) => sum + b.value, 0),
            percentOld90Plus: totalValue > 0 
              ? Math.round((agingReport.slice(3).reduce((sum, b) => sum + b.value, 0) / totalValue) * 100)
              : 0
          }
        })
      }

      case 'abc': {
        // ABC Analysis based on movement/sales
        // Get last 6 months movements
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        
        const recentMovements = await movements.find({
          type: 'OUT',
          createdAt: { $gte: sixMonthsAgo.toISOString() }
        }).toArray()

        // Aggregate by product
        const productMovements = {}
        recentMovements.forEach(mov => {
          const key = mov.productId
          if (!productMovements[key]) {
            productMovements[key] = {
              productId: mov.productId,
              productName: mov.productName,
              sku: mov.sku,
              totalQtyMoved: 0,
              movementCount: 0,
              totalValue: 0
            }
          }
          productMovements[key].totalQtyMoved += mov.quantity || 0
          productMovements[key].movementCount++
          productMovements[key].totalValue += (mov.quantity || 0) * (mov.rate || 0)
        })

        // Sort by value (descending)
        const sortedProducts = Object.values(productMovements).sort((a, b) => b.totalValue - a.totalValue)

        // Calculate cumulative percentages and assign ABC
        const totalValue = sortedProducts.reduce((sum, p) => sum + p.totalValue, 0)
        let cumulativePercent = 0
        
        sortedProducts.forEach(product => {
          product.valuePercent = totalValue > 0 ? (product.totalValue / totalValue * 100) : 0
          cumulativePercent += product.valuePercent
          product.cumulativePercent = cumulativePercent
          
          if (cumulativePercent <= 80) product.category = 'A'
          else if (cumulativePercent <= 95) product.category = 'B'
          else product.category = 'C'
        })

        // Get current stock for each product
        const inventoryItems = await inventory.find({}).toArray()
        const inventoryMap = {}
        inventoryItems.forEach(item => {
          inventoryMap[item.productId] = item
        })

        sortedProducts.forEach(product => {
          const stock = inventoryMap[product.productId]
          product.currentStock = stock?.quantity || 0
          product.stockValue = (stock?.quantity || 0) * (stock?.avgCost || 0)
        })

        const categoryA = sortedProducts.filter(p => p.category === 'A')
        const categoryB = sortedProducts.filter(p => p.category === 'B')
        const categoryC = sortedProducts.filter(p => p.category === 'C')

        return successResponse({
          report: 'ABC Analysis',
          generatedAt: now.toISOString(),
          period: '6 months',
          categories: {
            A: {
              description: 'High value items (80% of value)',
              count: categoryA.length,
              totalValue: categoryA.reduce((sum, p) => sum + p.totalValue, 0),
              items: categoryA.slice(0, 20)
            },
            B: {
              description: 'Medium value items (15% of value)',
              count: categoryB.length,
              totalValue: categoryB.reduce((sum, p) => sum + p.totalValue, 0),
              items: categoryB.slice(0, 20)
            },
            C: {
              description: 'Low value items (5% of value)',
              count: categoryC.length,
              totalValue: categoryC.reduce((sum, p) => sum + p.totalValue, 0),
              items: categoryC.slice(0, 20)
            }
          },
          summary: {
            totalProducts: sortedProducts.length,
            totalValue,
            aItems: categoryA.length,
            bItems: categoryB.length,
            cItems: categoryC.length
          }
        })
      }

      case 'slow_moving': {
        // Products with no movement in last 90 days
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        
        const recentMovements = await movements.find({
          type: 'OUT',
          createdAt: { $gte: ninetyDaysAgo.toISOString() }
        }).toArray()

        const movedProductIds = new Set(recentMovements.map(m => m.productId))
        
        // Get all products with stock
        const inventoryItems = await inventory.find({ quantity: { $gt: 0 } }).toArray()
        
        const slowMoving = inventoryItems.filter(item => !movedProductIds.has(item.productId)).map(item => ({
          productId: item.productId,
          productName: item.productName || item.product?.name,
          sku: item.sku,
          currentStock: item.quantity,
          stockValue: item.quantity * (item.avgCost || 0),
          daysSinceLastMove: null, // Would need to calculate from last movement
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName
        }))

        // Sort by stock value descending
        slowMoving.sort((a, b) => b.stockValue - a.stockValue)

        return successResponse({
          report: 'Slow Moving Stock',
          generatedAt: now.toISOString(),
          threshold: '90 days without movement',
          items: slowMoving,
          summary: {
            totalSlowItems: slowMoving.length,
            totalStockValue: slowMoving.reduce((sum, i) => sum + i.stockValue, 0),
            percentOfInventory: inventoryItems.length > 0
              ? Math.round((slowMoving.length / inventoryItems.length) * 100)
              : 0
          }
        })
      }

      case 'dead_stock': {
        // Products with no movement in last 180 days
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        
        const recentMovements = await movements.find({
          type: 'OUT',
          createdAt: { $gte: sixMonthsAgo.toISOString() }
        }).toArray()

        const movedProductIds = new Set(recentMovements.map(m => m.productId))
        
        const inventoryItems = await inventory.find({ quantity: { $gt: 0 } }).toArray()
        
        const deadStock = inventoryItems.filter(item => !movedProductIds.has(item.productId)).map(item => ({
          productId: item.productId,
          productName: item.productName || item.product?.name,
          sku: item.sku,
          currentStock: item.quantity,
          stockValue: item.quantity * (item.avgCost || 0),
          warehouseId: item.warehouseId
        }))

        deadStock.sort((a, b) => b.stockValue - a.stockValue)

        const totalInventoryValue = inventoryItems.reduce((sum, i) => sum + (i.quantity * (i.avgCost || 0)), 0)
        const deadStockValue = deadStock.reduce((sum, i) => sum + i.stockValue, 0)

        return successResponse({
          report: 'Dead Stock Analysis',
          generatedAt: now.toISOString(),
          threshold: '180 days without movement',
          items: deadStock,
          summary: {
            totalDeadItems: deadStock.length,
            deadStockValue,
            percentOfValue: totalInventoryValue > 0
              ? Math.round((deadStockValue / totalInventoryValue) * 100)
              : 0,
            recommendations: [
              'Consider discount sales for dead stock',
              'Review reorder points to prevent future dead stock',
              'Evaluate product discontinuation'
            ]
          }
        })
      }

      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('StockAging GET Error:', error)
    return errorResponse('Failed to generate stock aging report', 500, error.message)
  }
}
