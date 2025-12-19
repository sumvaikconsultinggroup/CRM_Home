import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get current sync configuration
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configCollection = db.collection('inventory_sync_config')

    const config = await configCollection.findOne({ clientId: user.clientId })

    return successResponse({ config: config ? sanitizeDocument(config) : null })
  } catch (error) {
    console.error('Sync Config GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch sync config', 500, error.message)
  }
}

// POST - Set/Update sync configuration (lock to a module)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { moduleId, moduleName } = body

    if (!moduleId) {
      return errorResponse('Module ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configCollection = db.collection('inventory_sync_config')

    // Check if already locked to another module
    const existingConfig = await configCollection.findOne({ clientId: user.clientId })
    if (existingConfig && existingConfig.syncedModuleId && existingConfig.syncedModuleId !== moduleId) {
      return errorResponse(
        `Inventory is already synced with ${existingConfig.syncedModuleName}. Disconnect first to sync with another module.`,
        400
      )
    }

    // Get module name from main db if not provided
    let syncedModuleName = moduleName
    if (!syncedModuleName) {
      const mainDb = await getMainDb()
      const moduleDoc = await mainDb.collection('modules').findOne({ id: moduleId })
      syncedModuleName = moduleDoc?.name || moduleId
    }

    const config = {
      id: existingConfig?.id || uuidv4(),
      clientId: user.clientId,
      syncedModuleId: moduleId,
      syncedModuleName,
      twoWaySync: true,
      autoSync: false,
      syncFrequency: 'manual', // manual, hourly, daily
      lastSyncAt: new Date(),
      createdAt: existingConfig?.createdAt || new Date(),
      updatedAt: new Date(),
      updatedBy: user.id
    }

    await configCollection.updateOne(
      { clientId: user.clientId },
      { $set: config },
      { upsert: true }
    )

    return successResponse({ config: sanitizeDocument(config), message: 'Sync configuration saved' })
  } catch (error) {
    console.error('Sync Config POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to save sync config', 500, error.message)
  }
}

// PUT - Update sync settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { autoSync, syncFrequency, twoWaySync } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configCollection = db.collection('inventory_sync_config')

    const existingConfig = await configCollection.findOne({ clientId: user.clientId })
    if (!existingConfig) {
      return errorResponse('No sync configuration found', 404)
    }

    const updates = {
      updatedAt: new Date(),
      updatedBy: user.id
    }
    if (autoSync !== undefined) updates.autoSync = autoSync
    if (syncFrequency !== undefined) updates.syncFrequency = syncFrequency
    if (twoWaySync !== undefined) updates.twoWaySync = twoWaySync

    await configCollection.updateOne(
      { clientId: user.clientId },
      { $set: updates }
    )

    return successResponse({ message: 'Sync settings updated' })
  } catch (error) {
    console.error('Sync Config PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update sync settings', 500, error.message)
  }
}

// DELETE - Disconnect sync (remove module lock)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const keepProducts = searchParams.get('keepProducts') !== 'false' // Default: keep products

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configCollection = db.collection('inventory_sync_config')
    const productsCollection = db.collection('inventory_products')
    const syncRecordsCollection = db.collection('inventory_product_sync')

    const existingConfig = await configCollection.findOne({ clientId: user.clientId })
    if (!existingConfig || !existingConfig.syncedModuleId) {
      return successResponse({ message: 'No sync to disconnect' })
    }

    const disconnectedModuleId = existingConfig.syncedModuleId
    const disconnectedModuleName = existingConfig.syncedModuleName

    // Handle synced products based on user preference
    let productsAffected = 0
    
    if (keepProducts) {
      // Option A: Keep products but mark as "disconnected" - preserves inventory data
      const result = await productsCollection.updateMany(
        { sourceModuleId: disconnectedModuleId },
        { 
          $set: {
            syncStatus: 'disconnected',
            previousSourceModuleId: disconnectedModuleId,
            previousSourceModuleName: disconnectedModuleName,
            disconnectedAt: new Date(),
            sourceModuleId: null,
            sourceModuleName: null,
            sourceType: 'disconnected_module',
            updatedAt: new Date()
          }
        }
      )
      productsAffected = result.modifiedCount
    } else {
      // Option B: Remove synced products entirely (data loss warning!)
      const result = await productsCollection.deleteMany({
        sourceModuleId: disconnectedModuleId
      })
      productsAffected = result.deletedCount
    }

    // Mark sync records as disconnected
    await syncRecordsCollection.updateMany(
      { sourceModuleId: disconnectedModuleId },
      {
        $set: {
          syncStatus: 'disconnected',
          disconnectedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    // Clear the config
    await configCollection.updateOne(
      { clientId: user.clientId },
      { 
        $set: {
          syncedModuleId: null,
          syncedModuleName: null,
          disconnectedAt: new Date(),
          disconnectedBy: user.id,
          disconnectedModuleId,
          disconnectedModuleName,
          updatedAt: new Date()
        }
      }
    )

    return successResponse({ 
      message: 'Sync disconnected successfully',
      disconnectedModule: disconnectedModuleName,
      productsAffected,
      productsKept: keepProducts,
      note: keepProducts 
        ? 'Products marked as disconnected. You can delete them manually or they will remain as standalone products.'
        : 'Synced products have been removed from Build Inventory.'
    })
  } catch (error) {
    console.error('Sync Config DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to disconnect sync', 500, error.message)
  }
}
