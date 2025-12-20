import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    // Get all products
    const products = await db.collection('flooring_products').find({}).toArray()
    
    // Get all inventory from all sources
    const wfStock = await db.collection('wf_inventory_stock').find({}).toArray()
    const v2Stock = await db.collection('flooring_inventory_v2').find({}).toArray()
    const v1Stock = await db.collection('flooring_inventory').find({}).toArray()
    
    return NextResponse.json({
      products: products.map(p => ({ id: p.id, name: p.name, sku: p.sku })),
      wf_inventory_stock: wfStock.map(i => ({ 
        id: i.id, 
        productId: i.productId, 
        productName: i.productName, 
        sku: i.sku, 
        quantity: i.quantity,
        warehouseId: i.warehouseId
      })),
      flooring_inventory_v2: v2Stock.map(i => ({ 
        id: i.id, 
        productId: i.productId, 
        quantity: i.quantity 
      })),
      flooring_inventory: v1Stock.map(i => ({ 
        id: i.id, 
        productId: i.productId, 
        quantity: i.quantity 
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Fix inventory by removing orphans and linking properly
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    const products = await db.collection('flooring_products').find({}).toArray()
    const wfStockCol = db.collection('wf_inventory_stock')
    
    // Build lookup maps
    const productById = new Map(products.map(p => [p.id, p]))
    const productBySku = new Map(products.filter(p => p.sku).map(p => [p.sku.toLowerCase(), p]))
    const productByName = new Map(products.filter(p => p.name).map(p => [p.name.toLowerCase(), p]))
    
    // Get all inventory
    const wfStock = await wfStockCol.find({}).toArray()
    
    const results = { fixed: 0, removed: 0, details: [] }
    
    for (const inv of wfStock) {
      // Try to find matching product
      let product = productById.get(inv.productId)
      
      if (!product && inv.sku && inv.sku !== '-') {
        product = productBySku.get(inv.sku.toLowerCase())
      }
      
      if (!product && inv.productName) {
        product = productByName.get(inv.productName.toLowerCase())
      }
      
      if (product) {
        // Fix productId if it doesn't match
        if (inv.productId !== product.id) {
          await wfStockCol.updateOne(
            { _id: inv._id },
            { 
              $set: { 
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                updatedAt: new Date().toISOString()
              }
            }
          )
          results.fixed++
          results.details.push({
            action: 'fixed_productId',
            oldProductId: inv.productId,
            newProductId: product.id,
            productName: product.name
          })
        }
      } else {
        // No matching product found - this is an orphan entry
        // Check if it has valid data (quantity > 0 and proper SKU)
        if (!inv.quantity || inv.quantity <= 0 || !inv.sku || inv.sku === '-') {
          // Remove orphan
          await wfStockCol.deleteOne({ _id: inv._id })
          results.removed++
          results.details.push({
            action: 'removed_orphan',
            productId: inv.productId,
            productName: inv.productName,
            sku: inv.sku,
            reason: 'No matching product and invalid data'
          })
        }
      }
    }
    
    // Now consolidate duplicates
    const finalStock = await wfStockCol.find({}).toArray()
    const byProductId = new Map()
    
    for (const inv of finalStock) {
      const key = `${inv.productId}-${inv.warehouseId || 'default'}`
      const existing = byProductId.get(key)
      
      if (existing) {
        // Keep the one with higher quantity, merge
        if ((inv.quantity || 0) > (existing.quantity || 0)) {
          // Update the new one with merged data
          await wfStockCol.updateOne(
            { _id: inv._id },
            { $set: { quantity: (inv.quantity || 0) + (existing.quantity || 0) } }
          )
          await wfStockCol.deleteOne({ _id: existing._id })
        } else {
          // Update existing with merged data
          await wfStockCol.updateOne(
            { _id: existing._id },
            { $set: { quantity: (inv.quantity || 0) + (existing.quantity || 0) } }
          )
          await wfStockCol.deleteOne({ _id: inv._id })
        }
        results.removed++
        results.details.push({
          action: 'merged_duplicate',
          productId: inv.productId
        })
      } else {
        byProductId.set(key, inv)
      }
    }
    
    return NextResponse.json({
      message: `Fixed ${results.fixed}, removed ${results.removed}`,
      results
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
