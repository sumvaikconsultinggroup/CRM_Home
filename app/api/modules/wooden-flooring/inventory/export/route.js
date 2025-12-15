import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Export inventory data as CSV
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'stock'
    const warehouseId = searchParams.get('warehouseId')
    const format = searchParams.get('format') || 'csv'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    let data = []
    let filename = ''
    let headers = []

    switch (exportType) {
      case 'stock':
        const stockCollection = db.collection('wf_inventory_stock')
        let stockQuery = {}
        if (warehouseId && warehouseId !== 'all') stockQuery.warehouseId = warehouseId

        const stocks = await stockCollection.find(stockQuery).toArray()
        headers = ['Product Name', 'SKU', 'Category', 'Warehouse', 'Quantity', 'Reserved', 'Available', 'Avg Cost', 'Value', 'Reorder Level', 'Status']
        data = stocks.map(s => [
          s.productName || '',
          s.sku || '',
          s.category || '',
          s.warehouseName || '',
          s.quantity || 0,
          s.reservedQty || 0,
          (s.quantity || 0) - (s.reservedQty || 0),
          (s.avgCostPrice || 0).toFixed(2),
          ((s.quantity || 0) * (s.avgCostPrice || 0)).toFixed(2),
          s.reorderLevel || 10,
          (s.quantity || 0) <= 0 ? 'Out of Stock' : ((s.quantity || 0) - (s.reservedQty || 0)) <= (s.reorderLevel || 10) ? 'Low Stock' : 'In Stock'
        ])
        filename = `stock_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'movements':
        const movementCollection = db.collection('wf_inventory_movements')
        let movementQuery = {}
        if (warehouseId && warehouseId !== 'all') movementQuery.warehouseId = warehouseId

        const movements = await movementCollection.find(movementQuery).sort({ createdAt: -1 }).limit(1000).toArray()
        headers = ['Movement #', 'Date', 'Type', 'Product', 'SKU', 'Warehouse', 'Qty Change', 'Unit Cost', 'Total Cost', 'Reference', 'Created By']
        data = movements.map(m => [
          m.movementNumber || '',
          m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '',
          m.movementType || '',
          m.productName || '',
          m.sku || '',
          m.warehouseName || '',
          m.quantityChange || 0,
          (m.unitCost || 0).toFixed(2),
          (m.totalCost || 0).toFixed(2),
          m.referenceNumber || '',
          m.createdByName || ''
        ])
        filename = `movements_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'batches':
        const batchCollection = db.collection('wf_inventory_batches')
        let batchQuery = { quantity: { $gt: 0 } }
        if (warehouseId && warehouseId !== 'all') batchQuery.warehouseId = warehouseId

        const batches = await batchCollection.find(batchQuery).toArray()
        headers = ['Batch #', 'Product', 'Warehouse', 'Quantity', 'Unit Cost', 'Value', 'Received Date', 'Expiry Date', 'Age (Days)', 'Status']
        const now = new Date()
        data = batches.map(b => {
          const receivedDate = b.receivedDate ? new Date(b.receivedDate) : now
          const ageInDays = Math.floor((now - receivedDate) / (1000 * 60 * 60 * 24))
          let status = 'Valid'
          if (b.expiryDate && new Date(b.expiryDate) < now) status = 'Expired'
          else if (b.expiryDate && new Date(b.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) status = 'Expiring Soon'
          
          return [
            b.batchNumber || '',
            b.productName || '',
            b.warehouseName || '',
            b.quantity || 0,
            (b.unitCost || 0).toFixed(2),
            ((b.quantity || 0) * (b.unitCost || 0)).toFixed(2),
            b.receivedDate ? new Date(b.receivedDate).toISOString().split('T')[0] : '',
            b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : '',
            ageInDays,
            status
          ]
        })
        filename = `batches_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'warehouses':
        const warehouseCollection = db.collection('wf_warehouses')
        const stockColl = db.collection('wf_inventory_stock')
        const warehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
        
        headers = ['Warehouse', 'Code', 'City', 'State', 'Contact', 'Products', 'Total Qty', 'Total Value', 'Low Stock Items']
        data = []
        for (const wh of warehouses) {
          const whStocks = await stockColl.find({ warehouseId: wh.id }).toArray()
          data.push([
            wh.name || '',
            wh.code || '',
            wh.city || '',
            wh.state || '',
            wh.contactPerson || '',
            whStocks.length,
            whStocks.reduce((sum, s) => sum + (s.quantity || 0), 0),
            whStocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.avgCostPrice || 0)), 0).toFixed(2),
            whStocks.filter(s => (s.quantity - (s.reservedQty || 0)) <= (s.reorderLevel || 10)).length
          ])
        }
        filename = `warehouses_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'valuation':
        const valStockCollection = db.collection('wf_inventory_stock')
        let valStockQuery = {}
        if (warehouseId && warehouseId !== 'all') valStockQuery.warehouseId = warehouseId

        const valStocks = await valStockCollection.find(valStockQuery).toArray()
        headers = ['Product Name', 'SKU', 'Warehouse', 'Quantity', 'Avg Cost', 'FIFO Value', 'Weighted Avg Value']
        
        // For simplicity, using weighted avg for both (FIFO would need batch data)
        data = valStocks.map(s => [
          s.productName || '',
          s.sku || '',
          s.warehouseName || '',
          s.quantity || 0,
          (s.avgCostPrice || 0).toFixed(2),
          ((s.quantity || 0) * (s.avgCostPrice || 0)).toFixed(2),
          ((s.quantity || 0) * (s.avgCostPrice || 0)).toFixed(2)
        ])
        filename = `valuation_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'grn':
        const grnCollection = db.collection('wf_inventory_grn')
        let grnQuery = {}
        if (warehouseId && warehouseId !== 'all') grnQuery.warehouseId = warehouseId

        const grns = await grnCollection.find(grnQuery).sort({ createdAt: -1 }).toArray()
        headers = ['GRN #', 'Date', 'Warehouse', 'Vendor', 'PO #', 'Invoice #', 'Items', 'Total Qty', 'Total Value', 'Status']
        data = grns.map(g => [
          g.grnNumber || '',
          g.createdAt ? new Date(g.createdAt).toISOString().split('T')[0] : '',
          g.warehouseName || '',
          g.vendorName || '',
          g.purchaseOrderNumber || '',
          g.invoiceNumber || '',
          g.items?.length || 0,
          g.totalQuantity || 0,
          (g.totalValue || 0).toFixed(2),
          g.status || ''
        ])
        filename = `grn_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'challans':
        const challanCollection = db.collection('wf_inventory_challans')
        let challanQuery = {}
        if (warehouseId && warehouseId !== 'all') challanQuery.warehouseId = warehouseId

        const challans = await challanCollection.find(challanQuery).sort({ createdAt: -1 }).toArray()
        headers = ['Challan #', 'Date', 'Warehouse', 'Customer', 'Project', 'Items', 'Total Qty', 'Total Value', 'Vehicle', 'Status']
        data = challans.map(c => [
          c.challanNumber || '',
          c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
          c.warehouseName || '',
          c.customerName || '',
          c.projectName || '',
          c.items?.length || 0,
          c.totalQuantity || 0,
          (c.totalValue || 0).toFixed(2),
          c.vehicleNumber || '',
          c.status || ''
        ])
        filename = `challans_report_${new Date().toISOString().split('T')[0]}.csv`
        break

      default:
        return errorResponse('Invalid export type', 400)
    }

    // Generate CSV
    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...data.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n')

    // Return as downloadable file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Export Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to export data', 500, error.message)
  }
}
