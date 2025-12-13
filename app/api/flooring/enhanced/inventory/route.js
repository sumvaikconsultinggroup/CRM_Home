import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { generateId, InventoryMovementTypes, ValuationMethods } from '@/lib/db/flooring-enhanced-schema'

// GET - Fetch inventory with advanced filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock')
    const outOfStock = searchParams.get('outOfStock')
    const batchId = searchParams.get('batchId')
    const view = searchParams.get('view') // 'summary', 'detailed', 'movements'

    const inventory = await getCollection('flooring_inventory_v2')
    const products = await getCollection('flooring_products')
    const warehouses = await getCollection('flooring_warehouses')

    const query = { clientId }
    if (warehouseId) query.warehouseId = warehouseId
    if (productId) query.productId = productId
    if (category) query['product.category'] = category

    // Get inventory records
    let records = await inventory.find(query).toArray()

    // Enrich with product and warehouse details
    const productIds = [...new Set(records.map(r => r.productId))]
    const warehouseIds = [...new Set(records.map(r => r.warehouseId))]
    
    const [productList, warehouseList] = await Promise.all([
      products.find({ id: { $in: productIds } }).toArray(),
      warehouses.find({ id: { $in: warehouseIds } }).toArray()
    ])
    
    const productMap = Object.fromEntries(productList.map(p => [p.id, p]))
    const warehouseMap = Object.fromEntries(warehouseList.map(w => [w.id, w]))

    records = records.map(record => ({
      ...record,
      product: productMap[record.productId],
      warehouse: warehouseMap[record.warehouseId]
    }))

    // Apply filters
    if (lowStock === 'true') {
      records = records.filter(r => r.availableQty <= (r.reorderLevel || productMap[r.productId]?.stock?.reorderLevel || 100))
    }
    if (outOfStock === 'true') {
      records = records.filter(r => r.availableQty <= 0)
    }

    // Calculate summary statistics
    const summary = {
      totalProducts: records.length,
      totalQuantity: records.reduce((sum, r) => sum + (r.quantity || 0), 0),
      totalValue: records.reduce((sum, r) => {
        const product = productMap[r.productId]
        return sum + ((r.quantity || 0) * (product?.pricing?.costPrice || 0))
      }, 0),
      lowStockCount: records.filter(r => r.availableQty <= (r.reorderLevel || 100)).length,
      outOfStockCount: records.filter(r => r.availableQty <= 0).length,
      warehouses: [...new Set(records.map(r => r.warehouseId))].length
    }

    // Calculate by category
    const byCategory = {}
    records.forEach(r => {
      const category = productMap[r.productId]?.category || 'unknown'
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, quantity: 0, value: 0 }
      }
      byCategory[category].count++
      byCategory[category].quantity += r.quantity || 0
      byCategory[category].value += (r.quantity || 0) * (productMap[r.productId]?.pricing?.costPrice || 0)
    })

    return NextResponse.json({
      inventory: records,
      summary,
      byCategory,
      warehouses: warehouseList
    })
  } catch (error) {
    console.error('Enhanced Inventory GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

// POST - Add inventory / Record movement
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body
    const inventory = await getCollection('flooring_inventory_v2')
    const movements = await getCollection('flooring_inventory_movements')
    const products = await getCollection('flooring_products')

    const now = new Date().toISOString()

    switch (action) {
      case 'goods_receipt': {
        // Goods Receipt Note (GRN)
        const { productId, warehouseId, clientId, quantity, batchNo, lotNo, 
                manufacturingDate, expiryDate, purchaseOrderId, supplierId, 
                costPrice, notes, createdBy } = body

        // Check if inventory record exists
        const existing = await inventory.findOne({ productId, warehouseId, clientId })
        
        const movement = {
          id: generateId('MOV'),
          clientId,
          productId,
          warehouseId,
          type: 'receipt',
          quantity,
          batchNo,
          lotNo,
          manufacturingDate,
          expiryDate,
          purchaseOrderId,
          supplierId,
          costPrice,
          totalValue: quantity * (costPrice || 0),
          reference: body.reference || `GRN-${Date.now()}`,
          notes,
          createdBy,
          createdAt: now
        }

        await movements.insertOne(movement)

        if (existing) {
          // Update existing record
          const newAvgCost = existing.quantity > 0
            ? ((existing.quantity * existing.avgCostPrice) + (quantity * costPrice)) / (existing.quantity + quantity)
            : costPrice

          await inventory.updateOne(
            { id: existing.id },
            {
              $inc: { quantity, availableQty: quantity },
              $set: { 
                avgCostPrice: newAvgCost,
                lastReceivedAt: now,
                lastReceivedQty: quantity,
                updatedAt: now
              },
              $push: {
                batches: {
                  batchNo,
                  lotNo,
                  quantity,
                  remainingQty: quantity,
                  costPrice,
                  manufacturingDate,
                  expiryDate,
                  receivedAt: now
                }
              }
            }
          )
          return NextResponse.json({ message: 'Stock updated', movement })
        } else {
          // Create new inventory record
          const record = {
            id: generateId('INV'),
            productId,
            warehouseId,
            clientId,
            quantity,
            reservedQty: 0,
            availableQty: quantity,
            avgCostPrice: costPrice,
            reorderLevel: body.reorderLevel || 100,
            maxStockLevel: body.maxStockLevel || 1000,
            valuationMethod: body.valuationMethod || 'weighted_avg',
            batches: [{
              batchNo,
              lotNo,
              quantity,
              remainingQty: quantity,
              costPrice,
              manufacturingDate,
              expiryDate,
              receivedAt: now
            }],
            lastReceivedAt: now,
            lastReceivedQty: quantity,
            lastIssuedAt: null,
            createdAt: now,
            updatedAt: now
          }
          await inventory.insertOne(record)
          return NextResponse.json({ message: 'Inventory created', record, movement }, { status: 201 })
        }
      }

      case 'goods_issue': {
        // Issue stock (for sales, projects, etc.)
        const { productId, warehouseId, clientId, quantity, reference, 
                reason, projectId, invoiceId, notes, createdBy } = body

        const record = await inventory.findOne({ productId, warehouseId, clientId })
        if (!record) {
          return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 })
        }
        if (record.availableQty < quantity) {
          return NextResponse.json({ error: 'Insufficient stock', available: record.availableQty }, { status: 400 })
        }

        const movement = {
          id: generateId('MOV'),
          clientId,
          productId,
          warehouseId,
          type: 'issue',
          quantity: -quantity,
          reference,
          reason,
          projectId,
          invoiceId,
          costPrice: record.avgCostPrice,
          totalValue: quantity * record.avgCostPrice,
          notes,
          createdBy,
          createdAt: now
        }

        await movements.insertOne(movement)

        await inventory.updateOne(
          { id: record.id },
          {
            $inc: { quantity: -quantity, availableQty: -quantity },
            $set: { 
              lastIssuedAt: now,
              lastIssuedQty: quantity,
              updatedAt: now
            }
          }
        )

        return NextResponse.json({ message: 'Stock issued', movement })
      }

      case 'transfer': {
        // Stock transfer between warehouses
        const { productId, fromWarehouseId, toWarehouseId, clientId, quantity, notes, createdBy } = body

        // Deduct from source
        const sourceRecord = await inventory.findOne({ productId, warehouseId: fromWarehouseId, clientId })
        if (!sourceRecord || sourceRecord.availableQty < quantity) {
          return NextResponse.json({ error: 'Insufficient stock in source warehouse' }, { status: 400 })
        }

        // Transfer movement
        const transferId = generateId('TRF')
        
        // Deduct from source
        await inventory.updateOne(
          { id: sourceRecord.id },
          { $inc: { quantity: -quantity, availableQty: -quantity }, $set: { updatedAt: now } }
        )
        await movements.insertOne({
          id: generateId('MOV'),
          clientId, productId,
          warehouseId: fromWarehouseId,
          type: 'transfer_out',
          quantity: -quantity,
          transferId,
          toWarehouseId,
          notes, createdBy, createdAt: now
        })

        // Add to destination
        const destRecord = await inventory.findOne({ productId, warehouseId: toWarehouseId, clientId })
        if (destRecord) {
          await inventory.updateOne(
            { id: destRecord.id },
            { $inc: { quantity, availableQty: quantity }, $set: { updatedAt: now } }
          )
        } else {
          await inventory.insertOne({
            id: generateId('INV'),
            productId, warehouseId: toWarehouseId, clientId,
            quantity, reservedQty: 0, availableQty: quantity,
            avgCostPrice: sourceRecord.avgCostPrice,
            reorderLevel: 100,
            batches: [],
            createdAt: now, updatedAt: now
          })
        }
        await movements.insertOne({
          id: generateId('MOV'),
          clientId, productId,
          warehouseId: toWarehouseId,
          type: 'transfer_in',
          quantity,
          transferId,
          fromWarehouseId,
          notes, createdBy, createdAt: now
        })

        return NextResponse.json({ message: 'Stock transferred', transferId })
      }

      case 'adjustment': {
        // Stock adjustment (physical count)
        const { productId, warehouseId, clientId, newQuantity, reason, notes, createdBy } = body

        const record = await inventory.findOne({ productId, warehouseId, clientId })
        if (!record) {
          return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 })
        }

        const difference = newQuantity - record.quantity
        const adjustmentType = difference >= 0 ? 'adjustment_plus' : 'adjustment_minus'

        await movements.insertOne({
          id: generateId('MOV'),
          clientId, productId, warehouseId,
          type: adjustmentType,
          quantity: difference,
          previousQty: record.quantity,
          newQty: newQuantity,
          reason,
          notes, createdBy, createdAt: now
        })

        await inventory.updateOne(
          { id: record.id },
          {
            $set: { 
              quantity: newQuantity,
              availableQty: newQuantity - record.reservedQty,
              lastAdjustedAt: now,
              updatedAt: now
            }
          }
        )

        return NextResponse.json({ message: 'Stock adjusted', difference })
      }

      case 'import': {
        // Bulk import inventory
        const { items, clientId, warehouseId, createdBy } = body
        const results = { success: 0, failed: 0, errors: [] }

        for (const item of items) {
          try {
            const product = await products.findOne({ 
              $or: [{ sku: item.sku }, { id: item.productId }],
              clientId 
            })
            
            if (!product) {
              results.failed++
              results.errors.push({ sku: item.sku, error: 'Product not found' })
              continue
            }

            const existing = await inventory.findOne({ 
              productId: product.id, 
              warehouseId: warehouseId || 'main', 
              clientId 
            })

            if (existing) {
              await inventory.updateOne(
                { id: existing.id },
                {
                  $set: {
                    quantity: item.quantity,
                    availableQty: item.quantity - (existing.reservedQty || 0),
                    avgCostPrice: item.costPrice || existing.avgCostPrice,
                    reorderLevel: item.reorderLevel || existing.reorderLevel,
                    updatedAt: now
                  }
                }
              )
            } else {
              await inventory.insertOne({
                id: generateId('INV'),
                productId: product.id,
                warehouseId: warehouseId || 'main',
                clientId,
                quantity: item.quantity,
                reservedQty: 0,
                availableQty: item.quantity,
                avgCostPrice: item.costPrice || product.pricing?.costPrice || 0,
                reorderLevel: item.reorderLevel || 100,
                batches: [],
                createdAt: now,
                updatedAt: now
              })
            }
            results.success++
          } catch (err) {
            results.failed++
            results.errors.push({ sku: item.sku, error: err.message })
          }
        }

        return NextResponse.json({ message: 'Import completed', results })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Enhanced Inventory POST Error:', error)
    return NextResponse.json({ error: 'Failed to process inventory' }, { status: 500 })
  }
}

// PUT - Update inventory settings
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return NextResponse.json({ error: 'Record ID required' }, { status: 400 })

    const inventory = await getCollection('flooring_inventory_v2')
    
    const result = await inventory.findOneAndUpdate(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Enhanced Inventory PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
  }
}
