import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Check for challans that need to be synced from dispatch management
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    // Challans from dispatch management (Build Inventory dispatches)
    const dispatchChallansCollection = db.collection('delivery_challans')
    // Module-specific challans (e.g., wooden-flooring inventory)
    const moduleChallansCollection = db.collection('wf_inventory_challans')

    // Get all dispatch challans
    const dispatchChallans = await dispatchChallansCollection.find({ clientId: user.clientId }).toArray()
    
    // Get all module challans
    const moduleChallans = await moduleChallansCollection.find({}).toArray()
    
    // Find challans from dispatch that aren't yet in module inventory
    const moduleChallanDispatchIds = new Set(moduleChallans.map(c => c.sourceDispatchChallanId).filter(Boolean))
    const pendingSync = dispatchChallans.filter(dc => !moduleChallanDispatchIds.has(dc.id))

    return successResponse({
      status: 'ok',
      totalDispatchChallans: dispatchChallans.length,
      totalModuleChallans: moduleChallans.length,
      pendingSyncCount: pendingSync.length,
      pendingChallans: sanitizeDocuments(pendingSync)
    })
  } catch (error) {
    console.error('Challan Sync GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to check challan sync status', 500, error.message)
  }
}

// POST - Sync challans from dispatch management to module inventory
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { syncAll = true, challanIds = [] } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    const dispatchChallansCollection = db.collection('delivery_challans')
    const moduleChallansCollection = db.collection('wf_inventory_challans')
    const dispatchCollection = db.collection('inventory_dispatches')

    // Get existing module challans to avoid duplicates
    const existingModuleChallans = await moduleChallansCollection.find({}).toArray()
    const existingSourceIds = new Set(existingModuleChallans.map(c => c.sourceDispatchChallanId).filter(Boolean))

    // Get dispatch challans to sync
    let query = { clientId: user.clientId }
    if (!syncAll && challanIds.length > 0) {
      query.id = { $in: challanIds }
    }
    
    const dispatchChallans = await dispatchChallansCollection.find(query).toArray()
    
    const syncedChallans = []
    const errors = []

    for (const dc of dispatchChallans) {
      // Skip if already synced
      if (existingSourceIds.has(dc.id)) continue

      try {
        // Get the related dispatch for additional details
        const dispatch = dc.dispatchId ? await dispatchCollection.findOne({ id: dc.dispatchId }) : null

        // Create module challan from dispatch challan
        const moduleChallan = {
          id: uuidv4(),
          clientId: user.clientId,
          challanNumber: dc.challanNumber,
          sourceDispatchChallanId: dc.id,
          sourceDispatchId: dc.dispatchId,
          warehouseId: dispatch?.warehouseId || 'default',
          warehouseName: dispatch?.warehouseName || 'Default Warehouse',
          projectId: dc.projectId || null,
          projectName: dc.projectName || null,
          customerId: dc.customerId || null,
          customerName: dc.customerName || dispatch?.customerName || '',
          deliveryAddress: dc.deliveryAddress || dispatch?.deliveryAddress || '',
          contactPerson: dc.contactPerson || dispatch?.contactPerson || '',
          contactPhone: dc.contactPhone || dispatch?.customerPhone || '',
          items: (dc.items || dispatch?.items || []).map(item => ({
            productId: item.productId,
            productName: item.productName || item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice || item.rate,
            totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || item.rate || 0)),
            batchNumber: item.batchNumber || null,
            notes: item.notes || ''
          })),
          totalQuantity: dc.totalQuantity || (dc.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0),
          totalValue: dc.totalValue || (dc.items?.reduce((sum, i) => sum + (i.totalPrice || 0), 0) || 0),
          vehicleNumber: dc.vehicleNumber || dispatch?.vehicleNumber || '',
          driverName: dc.driverName || dispatch?.transporterDetails?.driverName || '',
          driverPhone: dc.driverPhone || dispatch?.transporterDetails?.driverPhone || '',
          status: mapDispatchStatusToChallanStatus(dc.status || dispatch?.status),
          notes: dc.notes || '',
          expectedDeliveryDate: dc.expectedDeliveryDate || null,
          statusHistory: [{
            status: mapDispatchStatusToChallanStatus(dc.status || dispatch?.status),
            changedBy: user.id,
            changedByName: user.name || user.email,
            changedAt: new Date(),
            notes: 'Synced from Dispatch Management'
          }],
          dispatchedAt: dc.dispatchedAt || dispatch?.dispatchStartedAt || null,
          deliveredAt: dc.deliveredAt || dispatch?.deliveredAt || null,
          syncedFromDispatch: true,
          syncedAt: new Date(),
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: dc.createdAt || new Date(),
          updatedAt: new Date()
        }

        await moduleChallansCollection.insertOne(moduleChallan)
        syncedChallans.push(moduleChallan)
      } catch (err) {
        errors.push({ challanId: dc.id, error: err.message })
      }
    }

    return successResponse({
      message: `Synced ${syncedChallans.length} challans`,
      synced: syncedChallans.length,
      errors: errors.length,
      errorDetails: errors
    })
  } catch (error) {
    console.error('Challan Sync POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to sync challans', 500, error.message)
  }
}

// Helper function to map dispatch status to challan status
function mapDispatchStatusToChallanStatus(dispatchStatus) {
  const statusMap = {
    'pending': 'draft',
    'started': 'draft',
    'loaded': 'draft',
    'in_transit': 'dispatched',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  }
  return statusMap[dispatchStatus] || 'draft'
}
