import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Clean up inventory issues
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')

    const results = {
      removed: 0,
      fixed: 0,
      details: []
    }

    switch (action) {
      case 'remove_negative':
        // Remove stock records with negative or zero quantity and no proper product info
        const negativeStocks = await stockCollection.find({
          $or: [
            { quantity: { $lt: 0 } },
            { quantity: { $lte: 0 }, productName: { $exists: false } },
            { sku: '-' },
            { sku: { $exists: false }, productName: { $exists: false } }
          ]
        }).toArray()

        for (const stock of negativeStocks) {
          // Only remove if it looks like a ghost record
          if (!stock.productName || stock.sku === '-' || stock.quantity < 0) {
            await stockCollection.deleteOne({ _id: stock._id })
            results.removed++
            results.details.push({
              action: 'removed',
              productId: stock.productId,
              quantity: stock.quantity,
              reason: 'Negative/invalid stock record'
            })
          }
        }
        break

      case 'fix_negative_to_zero':
        // Set negative quantities to 0
        const negStocks = await stockCollection.find({ quantity: { $lt: 0 } }).toArray()
        for (const stock of negStocks) {
          await stockCollection.updateOne(
            { _id: stock._id },
            { $set: { quantity: 0, updatedAt: new Date().toISOString() } }
          )
          results.fixed++
          results.details.push({
            action: 'fixed',
            productId: stock.productId,
            oldQuantity: stock.quantity,
            newQuantity: 0
          })
        }
        break

      case 'remove_duplicates':
        // Find and remove duplicate stock entries (keeping the one with highest quantity)
        const allStocks = await stockCollection.find({}).toArray()
        const stocksByProduct = {}
        
        for (const stock of allStocks) {
          const key = `${stock.productId}-${stock.warehouseId || 'default'}`
          if (!stocksByProduct[key]) {
            stocksByProduct[key] = []
          }
          stocksByProduct[key].push(stock)
        }

        for (const [key, stocks] of Object.entries(stocksByProduct)) {
          if (stocks.length > 1) {
            // Sort by quantity descending, keep the first (highest)
            stocks.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
            
            // Consolidate quantities into the first record
            const primary = stocks[0]
            let totalQuantity = stocks.reduce((sum, s) => sum + Math.max(0, s.quantity || 0), 0)
            let totalReserved = stocks.reduce((sum, s) => sum + Math.max(0, s.reservedQuantity || 0), 0)
            
            // Update primary record with consolidated values
            await stockCollection.updateOne(
              { _id: primary._id },
              { 
                $set: { 
                  quantity: totalQuantity,
                  reservedQuantity: totalReserved,
                  updatedAt: new Date().toISOString() 
                } 
              }
            )
            
            // Remove duplicates
            for (let i = 1; i < stocks.length; i++) {
              await stockCollection.deleteOne({ _id: stocks[i]._id })
              results.removed++
              results.details.push({
                action: 'removed_duplicate',
                productId: stocks[i].productId,
                quantity: stocks[i].quantity
              })
            }
            
            results.fixed++
            results.details.push({
              action: 'consolidated',
              productId: primary.productId,
              newQuantity: totalQuantity
            })
          }
        }
        break

      case 'reset_reserved':
        // Reset all reserved quantities to 0 (use when reservations are out of sync)
        const updateResult = await stockCollection.updateMany(
          { reservedQuantity: { $gt: 0 } },
          { $set: { reservedQuantity: 0, updatedAt: new Date().toISOString() } }
        )
        results.fixed = updateResult.modifiedCount
        results.details.push({
          action: 'reset_reserved',
          recordsUpdated: updateResult.modifiedCount
        })
        break

      case 'consolidate_all':
        // Comprehensive cleanup across ALL inventory collections
        // This merges wf_inventory_stock, flooring_inventory_v2, flooring_inventory into one
        const wfStockCol = db.collection('wf_inventory_stock')
        const v2Col = db.collection('flooring_inventory_v2')
        const v1Col = db.collection('flooring_inventory')
        const productsCol = db.collection('flooring_products')
        
        // Get all products for reference
        const productsForCleanup = await productsCol.find({}).toArray()
        const productIdSet = new Set(productsForCleanup.map(p => p.id))
        
        // Collect all inventory from all sources
        const wfItems = await wfStockCol.find({}).toArray()
        const v2Items = await v2Col.find({}).toArray()
        const v1Items = await v1Col.find({}).toArray()
        
        // Build consolidated map by productId
        const consolidated = new Map()
        
        const processItem = (item, source) => {
          if (!item.productId) return // Skip orphan entries
          
          const key = `${item.productId}-${item.warehouseId || 'default'}`
          const existing = consolidated.get(key)
          
          if (existing) {
            // Merge quantities - take the entry with more data, higher quantity, or newer update
            if ((item.quantity || 0) > (existing.quantity || 0)) {
              consolidated.set(key, { ...item, source, mergedFrom: [...(existing.mergedFrom || []), existing.source] })
            }
          } else {
            consolidated.set(key, { ...item, source, mergedFrom: [] })
          }
        }
        
        // Process all items (priority: wf_inventory_stock > flooring_inventory_v2 > flooring_inventory)
        v1Items.forEach(i => processItem(i, 'flooring_inventory'))
        v2Items.forEach(i => processItem(i, 'flooring_inventory_v2'))
        wfItems.forEach(i => processItem(i, 'wf_inventory_stock'))
        
        // Remove orphan entries (productId not in products collection)
        for (const [key, item] of consolidated) {
          if (!productIdSet.has(item.productId)) {
            // Remove from all collections
            await wfStockCol.deleteMany({ productId: item.productId })
            await v2Col.deleteMany({ productId: item.productId })
            await v1Col.deleteMany({ productId: item.productId })
            results.removed++
            results.details.push({
              action: 'removed_orphan',
              productId: item.productId,
              reason: 'Product no longer exists'
            })
            consolidated.delete(key)
          }
        }
        
        // Clear wf_inventory_stock and rebuild with consolidated data
        await wfStockCol.deleteMany({})
        
        for (const [key, item] of consolidated) {
          const product = productsForCleanup.find(p => p.id === item.productId)
          await wfStockCol.insertOne({
            id: item.id || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId: item.productId,
            productName: product?.name || item.productName,
            sku: product?.sku || item.sku,
            warehouseId: item.warehouseId || 'default',
            quantity: Math.max(0, item.quantity || 0),
            reservedQuantity: Math.max(0, item.reservedQuantity || item.reservedQty || 0),
            reorderLevel: item.reorderLevel || 100,
            avgCostPrice: item.avgCostPrice || item.costPrice || 0,
            batches: item.batches || [],
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          results.fixed++
        }
        
        results.details.push({
          action: 'consolidate_all',
          totalRecords: consolidated.size,
          message: 'All inventory consolidated into wf_inventory_stock'
        })
        break

      default:
        return errorResponse('Invalid action. Use: remove_negative, fix_negative_to_zero, remove_duplicates, reset_reserved, consolidate_all', 400)
    }

    return successResponse({
      message: `Cleanup completed: ${results.removed} removed, ${results.fixed} fixed`,
      results
    })
  } catch (error) {
    console.error('Inventory Cleanup Error:', error)
    return errorResponse('Failed to cleanup inventory', 500, error.message)
  }
}

// GET - Analyze inventory issues
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const stockCollection = db.collection('wf_inventory_stock')

    const allStocks = await stockCollection.find({}).toArray()

    const issues = {
      negativeQuantity: [],
      missingProductInfo: [],
      duplicates: [],
      highReserved: []
    }

    // Check for negative quantities
    issues.negativeQuantity = allStocks.filter(s => s.quantity < 0).map(s => ({
      id: s.id,
      productId: s.productId,
      productName: s.productName,
      quantity: s.quantity
    }))

    // Check for missing product info
    issues.missingProductInfo = allStocks.filter(s => !s.productName || s.sku === '-').map(s => ({
      id: s.id,
      productId: s.productId,
      quantity: s.quantity
    }))

    // Check for duplicates
    const stocksByProduct = {}
    for (const stock of allStocks) {
      const key = `${stock.productId}-${stock.warehouseId || 'default'}`
      if (!stocksByProduct[key]) stocksByProduct[key] = []
      stocksByProduct[key].push(stock)
    }
    
    for (const [key, stocks] of Object.entries(stocksByProduct)) {
      if (stocks.length > 1) {
        issues.duplicates.push({
          key,
          count: stocks.length,
          records: stocks.map(s => ({ id: s.id, quantity: s.quantity }))
        })
      }
    }

    // Check for high reserved (more than available)
    issues.highReserved = allStocks
      .filter(s => (s.reservedQuantity || 0) > (s.quantity || 0))
      .map(s => ({
        id: s.id,
        productName: s.productName,
        quantity: s.quantity,
        reserved: s.reservedQuantity
      }))

    const summary = {
      totalRecords: allStocks.length,
      negativeCount: issues.negativeQuantity.length,
      missingInfoCount: issues.missingProductInfo.length,
      duplicateGroups: issues.duplicates.length,
      highReservedCount: issues.highReserved.length,
      hasIssues: issues.negativeQuantity.length > 0 || 
                 issues.missingProductInfo.length > 0 || 
                 issues.duplicates.length > 0 ||
                 issues.highReserved.length > 0
    }

    return successResponse({ summary, issues })
  } catch (error) {
    console.error('Inventory Analysis Error:', error)
    return errorResponse('Failed to analyze inventory', 500, error.message)
  }
}
