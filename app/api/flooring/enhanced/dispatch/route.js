import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate dispatch number
const generateDispatchNumber = async (db) => {
  const dispatches = db.collection('flooring_dispatches')
  const count = await dispatches.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `DSP-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// Generate challan number
const generateChallanNumber = async (db) => {
  const challans = db.collection('flooring_challans')
  const count = await challans.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `DC-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// Check customer dues
const getCustomerDues = async (db, customerId) => {
  const invoices = db.collection('flooring_invoices')
  
  const pendingInvoices = await invoices.find({
    'customer.id': customerId,
    status: { $nin: ['paid', 'cancelled'] },
    balanceAmount: { $gt: 0 }
  }).toArray()
  
  const totalDue = pendingInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0)
  
  return {
    totalDue,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoices: pendingInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      grandTotal: inv.grandTotal,
      balanceAmount: inv.balanceAmount,
      dueDate: inv.dueDate,
      isOverdue: new Date(inv.dueDate) < new Date()
    }))
  }
}

// Check stock availability from Build Inventory
const checkStockAvailability = async (db, items) => {
  // Use Build Inventory's products collection
  const inventoryProducts = db.collection('inventory_products')
  const results = []
  let hasInsufficient = false
  
  for (const item of items) {
    // Skip items without productId or services
    if (!item.productId || item.isService) {
      results.push({
        productId: item.productId || null,
        productName: item.productName || 'Service/Unknown',
        requestedQty: item.quantity,
        availableQty: item.isService ? 99999 : 0,
        stockStatus: item.isService ? 'service' : 'not_tracked',
        shortfall: 0
      })
      continue
    }
    
    // Search Build Inventory by productId first
    let product = await inventoryProducts.findOne({ id: item.productId })
    
    // Fallback: search by sourceProductId (if synced from CRM module)
    if (!product) {
      product = await inventoryProducts.findOne({ sourceProductId: item.productId })
    }
    
    // Fallback: search by SKU
    if (!product && item.sku) {
      product = await inventoryProducts.findOne({ sku: item.sku })
    }
    
    // Fallback: search by product name (case-insensitive)
    if (!product && item.productName) {
      product = await inventoryProducts.findOne({ 
        name: { $regex: new RegExp(item.productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      })
    }
    
    // Calculate available stock
    const totalStock = product?.stockQuantity || product?.currentStock || 0
    const reservedStock = product?.reservedQuantity || 0
    const availableQty = totalStock - reservedStock
    
    // Services (like labor, installation) have unlimited availability
    if (product?.category?.toLowerCase() === 'service' || 
        product?.type === 'service' ||
        item.productName?.toLowerCase().includes('labor') ||
        item.productName?.toLowerCase().includes('installation')) {
      results.push({
        productId: item.productId,
        productName: item.productName,
        requestedQty: item.quantity,
        availableQty: 99999,
        stockStatus: 'service',
        shortfall: 0
      })
      continue
    }
    
    const isInsufficient = availableQty < item.quantity
    if (isInsufficient) hasInsufficient = true
    
    results.push({
      productId: item.productId,
      productName: item.productName,
      requestedQty: item.quantity,
      availableQty: Math.max(0, availableQty),
      stockStatus: isInsufficient ? 'insufficient' : 'available',
      shortfall: isInsufficient ? item.quantity - availableQty : 0,
      inventoryProductId: product?.id || null
    })
  }
  
  return { items: results, hasInsufficient }
}

// Deduct stock on dispatch - uses Build Inventory (inventory_products)
const deductStock = async (db, items, dispatchId) => {
  const inventoryProducts = db.collection('inventory_products')
  const movementCollection = db.collection('inventory_movements') // Use central movement log
  const now = new Date().toISOString()
  
  for (const item of items) {
    // Skip services or items without productId
    if (item.isService || !item.productId) continue
    
    // Find the product in Build Inventory using same logic as checkStockAvailability
    let product = await inventoryProducts.findOne({ id: item.productId })
    if (!product) {
      product = await inventoryProducts.findOne({ sourceProductId: item.productId })
    }
    if (!product && item.sku) {
      product = await inventoryProducts.findOne({ sku: item.sku })
    }
    if (!product && item.productName) {
      product = await inventoryProducts.findOne({ 
        name: { $regex: new RegExp(item.productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      })
    }
    
    if (!product) {
      console.warn(`Product not found in Build Inventory for deduction: ${item.productId} / ${item.productName}`)
      continue
    }
    
    // Deduct from Build Inventory stock
    // Support both stockQuantity and currentStock field names
    const stockField = product.stockQuantity !== undefined ? 'stockQuantity' : 'currentStock'
    await inventoryProducts.updateOne(
      { id: product.id },
      {
        $inc: { [stockField]: -item.quantity },
        $set: { updatedAt: now }
      }
    )
    
    // Record movement in central inventory movements
    await movementCollection.insertOne({
      id: uuidv4(),
      productId: product.id,
      sourceProductId: item.productId,
      productName: item.productName || product.name,
      type: 'dispatch',
      movementType: 'out',
      quantity: -item.quantity,
      dispatchId,
      reference: `Dispatch ${dispatchId}`,
      notes: `Dispatched - ${item.quantity} ${item.unit || 'units'}`,
      createdBy: 'system',
      createdAt: now
    })
  }
}

// GET - Fetch dispatches
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const invoiceId = searchParams.get('invoiceId')
    const status = searchParams.get('status')
    const checkDues = searchParams.get('checkDues')
    const customerId = searchParams.get('customerId')
    const checkStock = searchParams.get('checkStock')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatches = db.collection('flooring_dispatches')

    // Check customer dues
    if (checkDues === 'true' && customerId) {
      const dues = await getCustomerDues(db, customerId)
      return successResponse({ dues })
    }

    // Check stock availability
    if (checkStock === 'true') {
      const items = JSON.parse(searchParams.get('items') || '[]')
      const stockCheck = await checkStockAvailability(db, items)
      return successResponse({ stockCheck })
    }

    // Get single dispatch
    if (id) {
      const dispatch = await dispatches.findOne({ id })
      if (!dispatch) return errorResponse('Dispatch not found', 404)
      
      // Get related challan
      const challans = db.collection('flooring_challans')
      const challan = await challans.findOne({ dispatchId: id })
      
      return successResponse(sanitizeDocument({ ...dispatch, challan }))
    }

    // Get dispatch by invoice
    if (invoiceId) {
      const dispatch = await dispatches.findOne({ invoiceId })
      return successResponse(sanitizeDocument(dispatch))
    }

    // Build query
    const query = {}
    if (status && status !== 'all') query.status = status

    const allDispatches = await dispatches.find(query).sort({ createdAt: -1 }).toArray()

    // Calculate stats
    const stats = {
      total: allDispatches.length,
      pending: allDispatches.filter(d => d.status === 'pending').length,
      loaded: allDispatches.filter(d => d.status === 'loaded').length,
      inTransit: allDispatches.filter(d => d.status === 'in_transit').length,
      delivered: allDispatches.filter(d => d.status === 'delivered').length,
      totalValue: allDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0)
    }

    return successResponse({
      dispatches: sanitizeDocuments(allDispatches),
      stats
    })
  } catch (error) {
    console.error('Dispatch GET Error:', error)
    return errorResponse('Failed to fetch dispatches', 500, error.message)
  }
}

// POST - Create dispatch from invoice
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { invoiceId, driverDetails, dispatchPhoto, notes, forceDispatch } = body

    if (!invoiceId) {
      return errorResponse('Invoice ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatches = db.collection('flooring_dispatches')
    const invoices = db.collection('flooring_invoices')
    const challans = db.collection('flooring_challans')

    // Get invoice
    const invoice = await invoices.findOne({ id: invoiceId })
    if (!invoice) return errorResponse('Invoice not found', 404)

    // Check if dispatch already exists for this invoice
    const existingDispatch = await dispatches.findOne({ invoiceId })
    if (existingDispatch) {
      return errorResponse('Dispatch already exists for this invoice', 400)
    }

    // Check customer dues
    const customerDues = await getCustomerDues(db, invoice.customer?.id)

    // Prepare items for stock check
    const items = (invoice.items || []).map(item => ({
      productId: item.productId || item.id,
      productName: item.productName || item.name,
      quantity: item.quantity || item.area || 0,
      unit: item.unit || 'sqft',
      warehouseId: item.warehouseId || 'default'
    }))

    // Check stock availability
    const stockCheck = await checkStockAvailability(db, items)

    // If stock is insufficient and not admin/force, return warning
    if (stockCheck.hasInsufficient && !forceDispatch) {
      const isAdmin = user.role === 'admin' || user.role === 'super_admin'
      if (!isAdmin) {
        return errorResponse('Insufficient stock. Only admin can override.', 400, {
          stockCheck,
          requiresAdminOverride: true
        })
      }
    }

    const now = new Date().toISOString()
    const dispatchId = uuidv4()
    const dispatchNumber = await generateDispatchNumber(db)

    // Create dispatch record
    const dispatch = {
      id: dispatchId,
      dispatchNumber,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      projectId: invoice.projectId,
      projectSegment: invoice.projectSegment || 'b2b',
      customer: invoice.customer,
      customerDues: {
        totalDue: customerDues.totalDue,
        pendingInvoicesCount: customerDues.pendingInvoicesCount
      },
      items,
      totalValue: invoice.grandTotal || 0,
      totalQuantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
      driver: driverDetails || {},
      dispatchPhoto,
      notes,
      stockCheckResult: stockCheck,
      forcedDispatch: stockCheck.hasInsufficient && forceDispatch,
      forcedBy: stockCheck.hasInsufficient && forceDispatch ? user.id : null,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: now,
        by: user.id,
        notes: 'Dispatch created'
      }],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await dispatches.insertOne(dispatch)

    // Generate Delivery Challan
    const challanNumber = await generateChallanNumber(db)
    const challan = {
      id: uuidv4(),
      challanNumber,
      dispatchId,
      dispatchNumber,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      type: 'delivery',
      customer: invoice.customer,
      items: items.map(item => ({
        ...item,
        description: item.productName,
        hsnCode: item.hsnCode || '4418'
      })),
      totalQuantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
      totalValue: invoice.grandTotal,
      driver: driverDetails || {},
      vehicleNumber: driverDetails?.vehicleNumber || '',
      transporterName: driverDetails?.transporterName || '',
      status: 'generated',
      signedByReceiver: false,
      receiverSignature: null,
      receiverName: null,
      receiverPhone: null,
      deliveryPhoto: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await challans.insertOne(challan)

    // Update invoice with dispatch reference
    await invoices.updateOne(
      { id: invoiceId },
      {
        $set: {
          dispatchId,
          dispatchNumber,
          dispatchedAt: now,
          dispatchStatus: 'pending',
          updatedAt: now
        }
      }
    )

    // Deduct stock
    await deductStock(db, items, dispatchId)

    return successResponse({
      dispatch: sanitizeDocument(dispatch),
      challan: sanitizeDocument(challan),
      message: 'Dispatch created successfully'
    }, 201)
  } catch (error) {
    console.error('Dispatch POST Error:', error)
    return errorResponse('Failed to create dispatch', 500, error.message)
  }
}

// PUT - Update dispatch status/workflow
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, data } = body

    if (!id || !action) {
      return errorResponse('Dispatch ID and action are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatches = db.collection('flooring_dispatches')
    const challans = db.collection('flooring_challans')
    const invoices = db.collection('flooring_invoices')
    const projects = db.collection('flooring_projects')

    const dispatch = await dispatches.findOne({ id })
    if (!dispatch) return errorResponse('Dispatch not found', 404)

    const now = new Date().toISOString()
    let updateData = { updatedAt: now }
    let statusUpdate = null

    switch (action) {
      case 'update_driver':
        updateData.driver = { ...dispatch.driver, ...data }
        break

      case 'load_goods':
        if (!data?.loadingPhoto) {
          return errorResponse('Loading photo is required', 400)
        }
        updateData.status = 'loaded'
        updateData.loadingPhoto = data.loadingPhoto
        updateData.loadingNotes = data.notes
        updateData.loadedAt = now
        updateData.loadedBy = user.id
        statusUpdate = { status: 'loaded', timestamp: now, by: user.id, notes: 'Goods loaded' }
        break

      case 'start_transit':
        updateData.status = 'in_transit'
        updateData.transitStartedAt = now
        statusUpdate = { status: 'in_transit', timestamp: now, by: user.id, notes: 'Vehicle departed' }
        
        // Update project status
        if (dispatch.projectId) {
          await projects.updateOne(
            { id: dispatch.projectId },
            { $set: { status: 'in_transit', updatedAt: now } }
          )
        }
        break

      case 'mark_delivered':
        if (!data?.receiverName) {
          return errorResponse('Receiver name is required', 400)
        }
        if (!data?.deliveryPhoto) {
          return errorResponse('Delivery photo/signed receipt is required', 400)
        }
        
        updateData.status = 'delivered'
        updateData.deliveredAt = now
        updateData.delivery = {
          receiverName: data.receiverName,
          receiverPhone: data.receiverPhone,
          receiverDesignation: data.receiverDesignation,
          deliveryPhoto: data.deliveryPhoto,
          signedReceipt: data.signedReceipt,
          condition: data.condition || 'good',
          notes: data.notes
        }
        statusUpdate = { 
          status: 'delivered', 
          timestamp: now, 
          by: user.id, 
          notes: `Delivered to ${data.receiverName}` 
        }
        
        // Update challan
        await challans.updateOne(
          { dispatchId: id },
          {
            $set: {
              status: 'delivered',
              signedByReceiver: true,
              receiverName: data.receiverName,
              receiverPhone: data.receiverPhone,
              receiverSignature: data.signedReceipt,
              deliveryPhoto: data.deliveryPhoto,
              deliveredAt: now,
              updatedAt: now
            }
          }
        )
        
        // Update project status
        if (dispatch.projectId) {
          await projects.updateOne(
            { id: dispatch.projectId },
            { $set: { status: 'delivered', updatedAt: now } }
          )
        }
        
        // Update invoice
        await invoices.updateOne(
          { id: dispatch.invoiceId },
          { $set: { dispatchStatus: 'delivered', updatedAt: now } }
        )
        break

      case 'cancel':
        updateData.status = 'cancelled'
        updateData.cancelledAt = now
        updateData.cancellationReason = data?.reason
        statusUpdate = { status: 'cancelled', timestamp: now, by: user.id, notes: data?.reason }
        
        // TODO: Reverse stock deduction if needed
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    if (statusUpdate) {
      updateData.$push = { statusHistory: statusUpdate }
    }

    const { $push, ...setData } = updateData
    const updateQuery = { $set: setData }
    if ($push) updateQuery.$push = $push

    await dispatches.updateOne({ id }, updateQuery)

    const updatedDispatch = await dispatches.findOne({ id })

    // === SYNC STATUS TO INVOICE ===
    // Keep invoice dispatchStatus in sync with dispatch status
    if (updatedDispatch?.invoiceId && updatedDispatch?.status) {
      const invoicesCollection = db.collection('flooring_invoices')
      await invoicesCollection.updateOne(
        { id: updatedDispatch.invoiceId },
        { 
          $set: { 
            dispatchStatus: updatedDispatch.status,
            updatedAt: new Date().toISOString()
          } 
        }
      )
    }
    // === END SYNC ===

    return successResponse({
      dispatch: sanitizeDocument(updatedDispatch),
      message: `Dispatch ${action.replace('_', ' ')} successful`
    })
  } catch (error) {
    console.error('Dispatch PUT Error:', error)
    return errorResponse('Failed to update dispatch', 500, error.message)
  }
}
