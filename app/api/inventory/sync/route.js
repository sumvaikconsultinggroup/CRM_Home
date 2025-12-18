import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get sync status and synced products
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const syncCollection = db.collection('inventory_product_sync')

    let query = {}
    if (moduleId) query.sourceModuleId = moduleId
    if (status) query.syncStatus = status

    const syncedProducts = await syncCollection.find(query).sort({ lastSyncAt: -1 }).toArray()

    // Get summary
    const summary = {
      totalSynced: syncedProducts.length,
      pendingSync: syncedProducts.filter(p => p.syncStatus === 'pending').length,
      lastSync: syncedProducts[0]?.lastSyncAt || null,
      byModule: {}
    }

    // Group by module
    for (const product of syncedProducts) {
      if (!summary.byModule[product.sourceModuleId]) {
        summary.byModule[product.sourceModuleId] = {
          moduleName: product.sourceModuleName,
          count: 0
        }
      }
      summary.byModule[product.sourceModuleId].count++
    }

    return successResponse({ syncedProducts: sanitizeDocuments(syncedProducts), summary })
  } catch (error) {
    console.error('Product Sync GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch sync status', 500, error.message)
  }
}

// POST - Trigger sync from CRM module to Inventory
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { moduleId, productIds, syncAll } = body

    if (!moduleId) {
      return errorResponse('Module ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const mainDb = await getMainDb()

    // Check sync configuration - only allow ONE module
    const configCollection = db.collection('inventory_sync_config')
    const existingConfig = await configCollection.findOne({ clientId: user.clientId })
    
    if (existingConfig && existingConfig.syncedModuleId && existingConfig.syncedModuleId !== moduleId) {
      return errorResponse(
        `Inventory can only sync with ONE module. Currently synced with: ${existingConfig.syncedModuleName}. Disconnect first to sync with another module.`,
        400
      )
    }

    // Get module info
    const modulesCollection = mainDb.collection('modules')
    const moduleDoc = await modulesCollection.findOne({ id: moduleId })
    if (!moduleDoc) {
      return errorResponse('Module not found', 404)
    }
    
    // Save/Update sync configuration to lock to this module
    const syncConfig = {
      id: existingConfig?.id || uuidv4(),
      clientId: user.clientId,
      syncedModuleId: moduleId,
      syncedModuleName: moduleDoc.name,
      twoWaySync: true,
      autoSync: existingConfig?.autoSync || false,
      syncFrequency: existingConfig?.syncFrequency || 'manual',
      lastSyncAt: new Date(),
      createdAt: existingConfig?.createdAt || new Date(),
      updatedAt: new Date(),
      updatedBy: user.id
    }
    
    await configCollection.updateOne(
      { clientId: user.clientId },
      { $set: syncConfig },
      { upsert: true }
    )

    // Determine product collection based on module
    // IMPORTANT: wooden-flooring uses flooring_products, NOT wf_inventory
    const moduleProductCollections = {
      'wooden-flooring': 'flooring_products',
      'paints-coatings': 'pc_inventory',
      'furniture': 'furniture_products',
      'tiles': 'tiles_inventory',
      'electrical': 'electrical_inventory',
      'plumbing': 'plumbing_inventory',
      'kitchens': 'kitchen_inventory',
      'doors-windows': 'dw_inventory'
    }

    const productCollectionName = moduleProductCollections[moduleId] || `${moduleId}_inventory`
    const productCollection = db.collection(productCollectionName)
    const syncCollection = db.collection('inventory_product_sync')
    const inventoryProductsCollection = db.collection('inventory_products')

    // Get products to sync
    let productsQuery = {}
    if (!syncAll && productIds && productIds.length > 0) {
      productsQuery = { id: { $in: productIds } }
    }

    const moduleProducts = await productCollection.find(productsQuery).toArray()

    if (moduleProducts.length === 0) {
      return successResponse({ message: 'No products to sync', synced: 0 })
    }

    let syncedCount = 0
    let updatedCount = 0
    const syncResults = []

    for (const product of moduleProducts) {
      // Check if already synced
      const existingSync = await syncCollection.findOne({
        sourceProductId: product.id,
        sourceModuleId: moduleId
      })

      // Extract pricing from nested object or flat fields
      const pricing = product.pricing || {}
      const costPrice = product.costPrice || pricing.costPrice || product.pricePerSqft || product.price || 0
      const sellingPrice = product.sellingPrice || pricing.sellingPrice || pricing.dealerPrice || product.price || 0
      const mrp = product.mrp || pricing.mrp || sellingPrice || 0
      
      // Extract stock quantity
      const stockQuantity = product.stockQuantity || product.quantity || product.stock || 0
      
      // Create or update inventory product
      const inventoryProduct = {
        id: existingSync?.inventoryProductId || uuidv4(),
        clientId: user.clientId,
        
        // Product Info (from CRM module)
        name: product.name,
        sku: product.sku || generateSKU(moduleId, product),
        barcode: product.barcode || null,
        description: product.description || '',
        category: product.category || product.specs?.construction || moduleDoc.name,
        subCategory: product.subCategory || product.type || product.brand || '',
        
        // Pricing (handle nested pricing object)
        costPrice,
        sellingPrice,
        mrp,
        
        // Stock (sync from module)
        stockQuantity,
        reservedQuantity: product.reservedQuantity || 0,
        
        // Units
        unit: product.unit || getDefaultUnit(moduleId),
        secondaryUnit: product.secondaryUnit || null,
        conversionRate: product.conversionRate || 1,
        
        // Tax (handle nested tax object)
        gstRate: product.gstRate || product.tax?.gstRate || product.taxRate || 18,
        hsnCode: product.hsnCode || product.tax?.hsnCode || '',
        
        // Inventory Settings
        trackInventory: true,
        allowNegativeStock: false,
        reorderLevel: product.reorderLevel || 10,
        reorderQuantity: product.reorderQuantity || 50,
        
        // Source Info
        sourceType: 'crm_module',
        sourceModuleId: moduleId,
        sourceModuleName: moduleDoc.name,
        sourceProductId: product.id,
        
        // Attributes (module-specific)
        attributes: extractAttributes(moduleId, product),
        
        // Status
        active: product.active !== false && product.status !== 'inactive',
        createdAt: existingSync ? undefined : new Date(),
        updatedAt: new Date(),
        lastSyncAt: new Date()
      }

      // Remove undefined fields
      Object.keys(inventoryProduct).forEach(key => {
        if (inventoryProduct[key] === undefined) delete inventoryProduct[key]
      })

      if (existingSync) {
        // Update existing
        await inventoryProductsCollection.updateOne(
          { id: existingSync.inventoryProductId },
          { $set: inventoryProduct }
        )
        updatedCount++
      } else {
        // Insert new
        await inventoryProductsCollection.insertOne(inventoryProduct)
        syncedCount++
      }

      // Update/create sync record
      const syncRecord = {
        id: existingSync?.id || uuidv4(),
        clientId: user.clientId,
        sourceModuleId: moduleId,
        sourceModuleName: moduleDoc.name,
        sourceProductId: product.id,
        sourceProductName: product.name,
        inventoryProductId: inventoryProduct.id,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        syncedBy: user.id,
        syncedByName: user.name || user.email,
        createdAt: existingSync?.createdAt || new Date(),
        updatedAt: new Date()
      }

      await syncCollection.updateOne(
        { sourceProductId: product.id, sourceModuleId: moduleId },
        { $set: syncRecord },
        { upsert: true }
      )

      syncResults.push({
        productId: product.id,
        productName: product.name,
        status: existingSync ? 'updated' : 'synced'
      })
    }

    return successResponse({
      message: `Sync completed: ${syncedCount} new, ${updatedCount} updated`,
      synced: syncedCount,
      updated: updatedCount,
      total: moduleProducts.length,
      results: syncResults
    })
  } catch (error) {
    console.error('Product Sync POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to sync products', 500, error.message)
  }
}

// PUT - Update sync settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { moduleId, autoSync, syncFrequency } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const syncSettingsCollection = db.collection('inventory_sync_settings')

    await syncSettingsCollection.updateOne(
      { moduleId },
      {
        $set: {
          moduleId,
          autoSync: autoSync || false,
          syncFrequency: syncFrequency || 'manual', // manual, hourly, daily
          updatedAt: new Date(),
          updatedBy: user.id
        }
      },
      { upsert: true }
    )

    return successResponse({ message: 'Sync settings updated' })
  } catch (error) {
    console.error('Product Sync PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update sync settings', 500, error.message)
  }
}

// Helper functions
function generateSKU(moduleId, product) {
  const prefix = {
    'wooden-flooring': 'WF',
    'paints-coatings': 'PC',
    'furniture': 'FN',
    'tiles': 'TL',
    'electrical': 'EL',
    'plumbing': 'PL',
    'kitchens': 'KT',
    'doors-windows': 'DW'
  }[moduleId] || 'PR'
  
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${random}`
}

function getDefaultUnit(moduleId) {
  const units = {
    'wooden-flooring': 'sqft',
    'paints-coatings': 'ltr',
    'furniture': 'pcs',
    'tiles': 'sqft',
    'electrical': 'pcs',
    'plumbing': 'pcs',
    'kitchens': 'pcs',
    'doors-windows': 'pcs'
  }
  return units[moduleId] || 'pcs'
}

function extractAttributes(moduleId, product) {
  // Extract module-specific attributes
  const commonAttrs = ['brand', 'manufacturer', 'origin', 'warranty']
  const moduleAttrs = {
    'wooden-flooring': ['woodType', 'finish', 'thickness', 'width', 'length', 'grade', 'installation'],
    'paints-coatings': ['paintType', 'finish', 'coverage', 'dryingTime', 'coats'],
    'furniture': ['material', 'style', 'dimensions', 'color', 'assembly'],
    'tiles': ['tileType', 'finish', 'size', 'thickness', 'material']
  }

  const attrsToExtract = [...commonAttrs, ...(moduleAttrs[moduleId] || [])]
  const attributes = {}

  for (const attr of attrsToExtract) {
    if (product[attr] !== undefined) {
      attributes[attr] = product[attr]
    }
  }

  return attributes
}
