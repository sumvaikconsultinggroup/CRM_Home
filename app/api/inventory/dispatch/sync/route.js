import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get sync status and pending invoices for dispatch
// UNIFIED: Uses flooring_dispatches as single source of truth
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    // UNIFIED: Use flooring_dispatches (same as module)
    const dispatchCollection = db.collection('flooring_dispatches')
    
    // Get invoices from Wooden Flooring module
    const invoicesCollection = db.collection('flooring_invoices')
    
    // Get all invoices that are not cancelled
    const allInvoices = await invoicesCollection.find({ 
      status: { $in: ['draft', 'sent', 'paid', 'partial', 'partially_paid'] }
    }).toArray()
    
    // Get existing dispatches with invoice references
    const existingDispatches = await dispatchCollection.find({
      invoiceId: { $ne: null }
    }).toArray()
    
    // Map by invoiceId to check which invoices have dispatches
    const dispatchedInvoiceIds = new Set(existingDispatches.map(d => d.invoiceId))
    
    // Find invoices without dispatches
    const pendingInvoices = allInvoices.filter(inv => !dispatchedInvoiceIds.has(inv.id))
    
    // Get last sync timestamp
    const syncConfig = await db.collection('dispatch_sync_config').findOne({ clientId: user.clientId })
    
    return successResponse({
      totalInvoices: allInvoices.length,
      dispatchedCount: existingDispatches.length,
      pendingCount: pendingInvoices.length,
      pendingInvoices: pendingInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        grandTotal: inv.grandTotal,
        status: inv.status,
        createdAt: inv.createdAt
      })),
      lastSyncAt: syncConfig?.lastSyncAt || null,
      autoSyncEnabled: syncConfig?.autoSyncEnabled ?? true
    })
  } catch (error) {
    console.error('Dispatch Sync GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch sync status', 500, error.message)
  }
}

// POST - Sync dispatches from invoices (create dispatches for new invoices)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { invoiceIds, syncAll = false } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    // UNIFIED: Use flooring_dispatches (same as module)
    const dispatchCollection = db.collection('flooring_dispatches')
    const syncConfigCollection = db.collection('dispatch_sync_config')
    
    // Get invoices from Wooden Flooring module
    const invoicesCollection = db.collection('flooring_invoices')
    
    // Determine which invoices to sync
    let invoicesToSync = []
    
    if (syncAll) {
      // Get all invoices without dispatches
      const allInvoices = await invoicesCollection.find({ 
        status: { $in: ['draft', 'sent', 'paid', 'partial', 'partially_paid'] }
      }).toArray()
      
      const existingDispatches = await dispatchCollection.find({
        invoiceId: { $ne: null }
      }).toArray()
      
      const dispatchedInvoiceIds = new Set(existingDispatches.map(d => d.invoiceId))
      invoicesToSync = allInvoices.filter(inv => !dispatchedInvoiceIds.has(inv.id))
    } else if (invoiceIds && invoiceIds.length > 0) {
      invoicesToSync = await invoicesCollection.find({
        id: { $in: invoiceIds }
      }).toArray()
    }
    
    if (invoicesToSync.length === 0) {
      return successResponse({ 
        message: 'No invoices to sync',
        synced: 0,
        dispatches: []
      })
    }
    
    // Create dispatches from invoices
    const createdDispatches = []
    const errors = []
    
    for (const invoice of invoicesToSync) {
      try {
        // Check if dispatch already exists for this invoice
        const existingDispatch = await dispatchCollection.findOne({
          clientId: user.clientId,
          invoiceId: invoice.id
        })
        
        if (existingDispatch) {
          continue // Skip if already exists
        }
        
        // Generate dispatch number
        const dispatchCount = await dispatchCollection.countDocuments({ clientId: user.clientId })
        const dispatchNumber = `DSP-${String(dispatchCount + 1).padStart(5, '0')}`
        
        // Convert invoice items to dispatch items
        const dispatchItems = (invoice.items || []).map(item => ({
          productId: item.productId || item.id,
          productName: item.productName || item.name,
          sku: item.sku || '',
          quantity: item.quantity || 0,
          unit: item.unit || 'pcs',
          unitPrice: item.pricePerUnit || item.sellingPrice || 0,
          totalPrice: (item.quantity || 0) * (item.pricePerUnit || item.sellingPrice || 0),
          batchNumber: null,
          serialNumbers: []
        }))
        
        const totalValue = dispatchItems.reduce((sum, item) => sum + item.totalPrice, 0)
        
        // Create dispatch record
        const dispatch = {
          id: uuidv4(),
          clientId: user.clientId,
          dispatchNumber,
          // Invoice Reference
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          orderId: invoice.quotationId || null,
          orderNumber: invoice.quotationNumber || null,
          // Customer from Invoice
          customerId: invoice.customerId || null,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone || null,
          customerEmail: invoice.customerEmail || null,
          deliveryAddress: invoice.customerAddress || invoice.deliveryAddress || null,
          // Items
          items: dispatchItems,
          totalValue,
          // Transporter - to be filled later
          transporter: {
            name: null,
            company: null,
            vehicleNumber: null,
            driverName: null,
            driverPhone: null
          },
          // Delivery - to be filled later
          estimatedDelivery: {
            date: null,
            time: null
          },
          deliveryCost: invoice.deliveryCost || 0,
          payment: {
            mode: invoice.paymentTerms === 'COD' ? 'cod' : 'prepaid',
            amountToCollect: invoice.paymentTerms === 'COD' ? invoice.grandTotal - (invoice.paidAmount || 0) : 0
          },
          // Package Info
          packageCount: 1,
          totalWeight: null,
          specialInstructions: invoice.notes || null,
          // Images
          dispatchImage: null,
          deliveryImage: null,
          podImage: null,
          // Source tracking
          sourceType: 'invoice_sync',
          sourceModuleId: 'wooden-flooring',
          sourceModuleName: 'Wooden Flooring',
          // Status
          status: 'pending',
          statusHistory: [{
            status: 'pending',
            timestamp: new Date(),
            updatedBy: 'system',
            updatedByName: 'Auto Sync',
            notes: `Created from invoice ${invoice.invoiceNumber}`
          }],
          // WhatsApp Notification
          whatsappNotification: {
            sent: false,
            sentAt: null,
            messageId: null
          },
          // Timestamps
          dispatchDate: new Date(),
          deliveredAt: null,
          notes: `Auto-synced from invoice ${invoice.invoiceNumber}`,
          createdBy: 'system',
          createdByName: 'Auto Sync',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        await dispatchCollection.insertOne(dispatch)
        createdDispatches.push(dispatch)
      } catch (err) {
        errors.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          error: err.message
        })
      }
    }
    
    // Update last sync timestamp
    await syncConfigCollection.updateOne(
      { clientId: user.clientId },
      {
        $set: {
          clientId: user.clientId,
          lastSyncAt: new Date(),
          lastSyncBy: user.id,
          lastSyncCount: createdDispatches.length
        }
      },
      { upsert: true }
    )
    
    return successResponse({
      message: `Synced ${createdDispatches.length} dispatch(es) from invoices`,
      synced: createdDispatches.length,
      dispatches: createdDispatches,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Dispatch Sync POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to sync dispatches', 500, error.message)
  }
}

// PUT - Update sync configuration (enable/disable auto-sync)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { autoSyncEnabled, syncInterval = 3000 } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const syncConfigCollection = db.collection('dispatch_sync_config')
    
    await syncConfigCollection.updateOne(
      { clientId: user.clientId },
      {
        $set: {
          clientId: user.clientId,
          autoSyncEnabled: autoSyncEnabled ?? true,
          syncInterval: syncInterval,
          updatedAt: new Date(),
          updatedBy: user.id
        }
      },
      { upsert: true }
    )
    
    const config = await syncConfigCollection.findOne({ clientId: user.clientId })
    
    return successResponse({
      message: `Auto-sync ${config.autoSyncEnabled ? 'enabled' : 'disabled'}`,
      config
    })
  } catch (error) {
    console.error('Dispatch Sync Config PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update sync config', 500, error.message)
  }
}
