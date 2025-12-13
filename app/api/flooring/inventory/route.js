import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, generateFlooringId } from '@/lib/db/flooring-schema'

// GET - Fetch inventory
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const productId = searchParams.get('productId')
    const lowStock = searchParams.get('lowStock')

    const inventory = await getCollection(FlooringCollections.INVENTORY)
    const products = await getCollection(FlooringCollections.PRODUCTS)
    
    const query = {}
    if (clientId) query.clientId = clientId
    if (productId) query.productId = productId

    let result = await inventory.find(query).toArray()

    // Enrich with product details
    const productIds = [...new Set(result.map(i => i.productId))]
    const productList = await products.find({ id: { $in: productIds } }).toArray()
    const productMap = Object.fromEntries(productList.map(p => [p.id, p]))

    result = result.map(item => ({
      ...item,
      product: productMap[item.productId] || null
    }))

    // Filter low stock if requested
    if (lowStock === 'true') {
      result = result.filter(item => {
        const product = productMap[item.productId]
        return product && item.availableQty <= (product.stock?.reorderLevel || 100)
      })
    }

    // Calculate totals
    const totals = {
      totalProducts: result.length,
      totalValue: result.reduce((sum, item) => {
        const product = productMap[item.productId]
        return sum + (item.quantity * (product?.pricing?.costPrice || 0))
      }, 0),
      lowStockCount: result.filter(item => {
        const product = productMap[item.productId]
        return product && item.availableQty <= (product.stock?.reorderLevel || 100)
      }).length
    }
    
    return NextResponse.json({ inventory: result, totals })
  } catch (error) {
    console.error('Flooring Inventory GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

// POST - Add/Update inventory
export async function POST(request) {
  try {
    const body = await request.json()
    const inventory = await getCollection(FlooringCollections.INVENTORY)

    // Check if inventory record exists
    const existing = await inventory.findOne({ 
      productId: body.productId, 
      warehouseId: body.warehouseId || 'main',
      clientId: body.clientId 
    })

    if (existing) {
      // Update existing record
      const movement = {
        id: generateFlooringId('MOV'),
        type: body.type || 'in', // in, out, adjustment
        quantity: body.quantity,
        reason: body.reason || '',
        reference: body.reference || '',
        createdAt: new Date().toISOString(),
        createdBy: body.createdBy
      }

      const quantityChange = body.type === 'out' ? -body.quantity : body.quantity
      
      const result = await inventory.findOneAndUpdate(
        { id: existing.id },
        {
          $inc: { 
            quantity: quantityChange,
            availableQty: quantityChange
          },
          $push: { movements: movement },
          $set: { 
            lastUpdated: new Date().toISOString(),
            ...(body.type === 'in' ? { lastRestocked: new Date().toISOString() } : {}),
            ...(body.type === 'out' ? { lastSold: new Date().toISOString() } : {})
          }
        },
        { returnDocument: 'after' }
      )
      return NextResponse.json(result)
    } else {
      // Create new inventory record
      const record = {
        id: generateFlooringId('INV'),
        productId: body.productId,
        warehouseId: body.warehouseId || 'main',
        clientId: body.clientId,
        quantity: body.quantity,
        reservedQty: 0,
        availableQty: body.quantity,
        lastRestocked: new Date().toISOString(),
        lastSold: null,
        movements: [{
          id: generateFlooringId('MOV'),
          type: 'in',
          quantity: body.quantity,
          reason: 'Initial stock',
          reference: body.reference || '',
          createdAt: new Date().toISOString(),
          createdBy: body.createdBy
        }],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }

      await inventory.insertOne(record)
      return NextResponse.json(record, { status: 201 })
    }
  } catch (error) {
    console.error('Flooring Inventory POST Error:', error)
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
  }
}

// PUT - Reserve/Release inventory
export async function PUT(request) {
  try {
    const body = await request.json()
    const { productId, warehouseId, clientId, action, quantity, reference } = body

    const inventory = await getCollection(FlooringCollections.INVENTORY)
    
    const record = await inventory.findOne({ 
      productId, 
      warehouseId: warehouseId || 'main',
      clientId 
    })

    if (!record) {
      return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 })
    }

    let update = {}
    if (action === 'reserve') {
      if (record.availableQty < quantity) {
        return NextResponse.json({ error: 'Insufficient available quantity' }, { status: 400 })
      }
      update = {
        $inc: { reservedQty: quantity, availableQty: -quantity },
        $set: { lastUpdated: new Date().toISOString() }
      }
    } else if (action === 'release') {
      update = {
        $inc: { reservedQty: -quantity, availableQty: quantity },
        $set: { lastUpdated: new Date().toISOString() }
      }
    } else if (action === 'fulfill') {
      // Convert reserved to sold
      update = {
        $inc: { reservedQty: -quantity, quantity: -quantity },
        $set: { lastUpdated: new Date().toISOString(), lastSold: new Date().toISOString() },
        $push: {
          movements: {
            id: generateFlooringId('MOV'),
            type: 'out',
            quantity,
            reason: 'Order fulfilled',
            reference: reference || '',
            createdAt: new Date().toISOString()
          }
        }
      }
    }

    const result = await inventory.findOneAndUpdate(
      { id: record.id },
      update,
      { returnDocument: 'after' }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Inventory PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
  }
}
