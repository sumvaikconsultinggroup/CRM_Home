import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Search by SKU/Barcode or get lookup data
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')
    const barcode = searchParams.get('barcode')
    const warehouseId = searchParams.get('warehouseId')
    const search = searchParams.get('search')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const productCollection = db.collection('wf_inventory')
    const stockCollection = db.collection('wf_inventory_stock')
    const batchCollection = db.collection('wf_inventory_batches')
    const warehouseCollection = db.collection('wf_warehouses')

    // Quick lookup by SKU or Barcode
    if (sku || barcode) {
      const lookupValue = sku || barcode
      
      // Find product
      const product = await productCollection.findOne({
        $or: [
          { sku: lookupValue },
          { barcode: lookupValue },
          { sku: { $regex: lookupValue, $options: 'i' } }
        ]
      })

      if (!product) {
        return successResponse({ found: false, message: 'Product not found' })
      }

      // Get stock levels across warehouses
      let stockQuery = { productId: product.id }
      if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId

      const stocks = await stockCollection.find(stockQuery).toArray()
      const batches = await batchCollection.find({ productId: product.id, quantity: { $gt: 0 } }).toArray()
      const warehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
      const warehouseMap = new Map(warehouses.map(w => [w.id, w]))

      // Enrich stock data
      const stockByWarehouse = stocks.map(s => ({
        warehouseId: s.warehouseId,
        warehouseName: warehouseMap.get(s.warehouseId)?.name || 'Unknown',
        quantity: s.quantity || 0,
        reservedQty: s.reservedQty || 0,
        availableQty: (s.quantity || 0) - (s.reservedQty || 0),
        avgCostPrice: s.avgCostPrice || 0,
        reorderLevel: s.reorderLevel || 10
      }))

      const totalQuantity = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
      const totalAvailable = stocks.reduce((sum, s) => sum + ((s.quantity || 0) - (s.reservedQty || 0)), 0)

      return successResponse({
        found: true,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category: product.category,
          description: product.description,
          unit: product.unit,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          gstRate: product.gstRate
        },
        inventory: {
          totalQuantity,
          totalAvailable,
          warehouseCount: stocks.length,
          batchCount: batches.length,
          stockByWarehouse
        },
        batches: batches.slice(0, 10).map(b => ({
          batchNumber: b.batchNumber,
          warehouseName: warehouseMap.get(b.warehouseId)?.name || 'Unknown',
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          receivedDate: b.receivedDate
        }))
      })
    }

    // General search
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      
      const products = await productCollection.find({
        $or: [
          { name: searchRegex },
          { sku: searchRegex },
          { barcode: searchRegex },
          { description: searchRegex }
        ]
      }).limit(20).toArray()

      // Get stock for each product
      const results = []
      for (const product of products) {
        let stockQuery = { productId: product.id }
        if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId

        const stocks = await stockCollection.find(stockQuery).toArray()
        const totalQty = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
        const availableQty = stocks.reduce((sum, s) => sum + ((s.quantity || 0) - (s.reservedQty || 0)), 0)

        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category: product.category,
          totalQuantity: totalQty,
          availableQuantity: availableQty,
          warehouseCount: stocks.length,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice
        })
      }

      return successResponse({ results, count: results.length })
    }

    return errorResponse('SKU, barcode, or search term required', 400)
  } catch (error) {
    console.error('Lookup GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to perform lookup', 500, error.message)
  }
}

// POST - Bulk lookup for multiple SKUs
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { skus, barcodes, warehouseId } = body

    if ((!skus || !Array.isArray(skus) || skus.length === 0) && 
        (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0)) {
      return errorResponse('SKUs or barcodes array required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const productCollection = db.collection('wf_inventory')
    const stockCollection = db.collection('wf_inventory_stock')
    const warehouseCollection = db.collection('wf_warehouses')

    const lookupValues = [...(skus || []), ...(barcodes || [])]

    // Find all products
    const products = await productCollection.find({
      $or: [
        { sku: { $in: lookupValues } },
        { barcode: { $in: lookupValues } }
      ]
    }).toArray()

    const warehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]))

    const results = []
    const notFound = []

    for (const lookupValue of lookupValues) {
      const product = products.find(p => p.sku === lookupValue || p.barcode === lookupValue)
      
      if (!product) {
        notFound.push(lookupValue)
        continue
      }

      let stockQuery = { productId: product.id }
      if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId

      const stocks = await stockCollection.find(stockQuery).toArray()
      const totalQty = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
      const availableQty = stocks.reduce((sum, s) => sum + ((s.quantity || 0) - (s.reservedQty || 0)), 0)

      results.push({
        lookupValue,
        found: true,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category: product.category,
          unit: product.unit,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice
        },
        inventory: {
          totalQuantity: totalQty,
          availableQuantity: availableQty,
          stockByWarehouse: stocks.map(s => ({
            warehouseId: s.warehouseId,
            warehouseName: warehouseMap.get(s.warehouseId)?.name || 'Unknown',
            quantity: s.quantity || 0,
            availableQty: (s.quantity || 0) - (s.reservedQty || 0)
          }))
        }
      })
    }

    return successResponse({
      results,
      found: results.length,
      notFound,
      notFoundCount: notFound.length
    })
  } catch (error) {
    console.error('Bulk Lookup Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to perform bulk lookup', 500, error.message)
  }
}
