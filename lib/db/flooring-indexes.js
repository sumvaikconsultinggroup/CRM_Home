/**
 * =====================================================
 * DATABASE INDEX INITIALIZATION FOR FLOORING MODULE
 * =====================================================
 * 
 * This script creates all necessary indexes for optimal performance.
 * Run this on application startup or during deployment.
 */

import { COLLECTIONS, INDEXES } from './flooring-collections'

/**
 * Create indexes for a client database
 * @param {Object} db - MongoDB database instance
 */
export async function createFlooringIndexes(db) {
  const results = {
    created: [],
    errors: []
  }

  // Define all indexes
  const indexDefinitions = {
    // Stock - Critical for inventory queries
    [COLLECTIONS.INVENTORY_STOCK]: [
      { key: { productId: 1, warehouseId: 1 }, options: { unique: true, name: 'idx_stock_product_warehouse' } },
      { key: { warehouseId: 1 }, options: { name: 'idx_stock_warehouse' } },
      { key: { quantity: 1 }, options: { name: 'idx_stock_quantity' } },
      { key: { 'quantity': 1, 'reorderLevel': 1 }, options: { name: 'idx_stock_reorder' } }
    ],

    // Stock Ledger - Critical for audit trail
    [COLLECTIONS.STOCK_LEDGER]: [
      { key: { productId: 1, warehouseId: 1, createdAt: -1 }, options: { name: 'idx_ledger_product_warehouse_date' } },
      { key: { refDocType: 1, refDocId: 1 }, options: { name: 'idx_ledger_reference' } },
      { key: { createdAt: -1 }, options: { name: 'idx_ledger_date' } },
      { key: { sequence: -1 }, options: { name: 'idx_ledger_sequence' } }
    ],

    // Inventory Movements
    [COLLECTIONS.INVENTORY_MOVEMENTS]: [
      { key: { productId: 1, warehouseId: 1, createdAt: -1 }, options: { name: 'idx_movement_product_warehouse_date' } },
      { key: { referenceType: 1, referenceId: 1 }, options: { name: 'idx_movement_reference' } },
      { key: { movementType: 1, createdAt: -1 }, options: { name: 'idx_movement_type_date' } }
    ],

    // Challans
    [COLLECTIONS.CHALLANS]: [
      { key: { dcNo: 1 }, options: { unique: true, sparse: true, name: 'idx_challan_dcno' } },
      { key: { challanNumber: 1 }, options: { sparse: true, name: 'idx_challan_number' } },
      { key: { projectId: 1 }, options: { name: 'idx_challan_project' } },
      { key: { status: 1 }, options: { name: 'idx_challan_status' } },
      { key: { createdAt: -1 }, options: { name: 'idx_challan_date' } },
      { key: { invoiceId: 1 }, options: { sparse: true, name: 'idx_challan_invoice' } }
    ],

    // Invoices
    [COLLECTIONS.INVOICES]: [
      { key: { invoiceNumber: 1 }, options: { unique: true, name: 'idx_invoice_number' } },
      { key: { projectId: 1 }, options: { name: 'idx_invoice_project' } },
      { key: { status: 1 }, options: { name: 'idx_invoice_status' } },
      { key: { dueDate: 1 }, options: { name: 'idx_invoice_duedate' } },
      { key: { createdAt: -1 }, options: { name: 'idx_invoice_date' } }
    ],

    // Products
    [COLLECTIONS.PRODUCTS]: [
      { key: { sku: 1 }, options: { unique: true, sparse: true, name: 'idx_product_sku' } },
      { key: { category: 1 }, options: { name: 'idx_product_category' } },
      { key: { status: 1 }, options: { name: 'idx_product_status' } },
      { key: { name: 'text', sku: 'text', description: 'text' }, options: { name: 'idx_product_search' } }
    ],

    // Projects
    [COLLECTIONS.PROJECTS]: [
      { key: { projectNumber: 1 }, options: { sparse: true, name: 'idx_project_number' } },
      { key: { status: 1 }, options: { name: 'idx_project_status' } },
      { key: { customerId: 1 }, options: { name: 'idx_project_customer' } },
      { key: { createdAt: -1 }, options: { name: 'idx_project_date' } }
    ],

    // Quotes
    [COLLECTIONS.QUOTES]: [
      { key: { quoteNumber: 1 }, options: { unique: true, sparse: true, name: 'idx_quote_number' } },
      { key: { projectId: 1 }, options: { name: 'idx_quote_project' } },
      { key: { status: 1 }, options: { name: 'idx_quote_status' } },
      { key: { validUntil: 1 }, options: { name: 'idx_quote_validity' } }
    ],

    // GRN
    [COLLECTIONS.INVENTORY_GRN]: [
      { key: { grnNumber: 1 }, options: { unique: true, name: 'idx_grn_number' } },
      { key: { warehouseId: 1 }, options: { name: 'idx_grn_warehouse' } },
      { key: { status: 1 }, options: { name: 'idx_grn_status' } },
      { key: { createdAt: -1 }, options: { name: 'idx_grn_date' } }
    ],

    // Reservations
    [COLLECTIONS.INVENTORY_RESERVATIONS]: [
      { key: { productId: 1, warehouseId: 1 }, options: { name: 'idx_reservation_product_warehouse' } },
      { key: { quoteId: 1 }, options: { name: 'idx_reservation_quote' } },
      { key: { status: 1 }, options: { name: 'idx_reservation_status' } },
      { key: { expiresAt: 1 }, options: { name: 'idx_reservation_expiry' } }
    ],

    // User Roles (RBAC)
    [COLLECTIONS.USER_ROLES]: [
      { key: { userId: 1 }, options: { unique: true, name: 'idx_userrole_user' } },
      { key: { roleId: 1 }, options: { name: 'idx_userrole_role' } }
    ],

    // Access Audit
    [COLLECTIONS.ACCESS_AUDIT]: [
      { key: { createdAt: -1 }, options: { name: 'idx_accessaudit_date' } },
      { key: { performedBy: 1 }, options: { name: 'idx_accessaudit_performer' } },
      { key: { action: 1 }, options: { name: 'idx_accessaudit_action' } }
    ],

    // Installations
    [COLLECTIONS.INSTALLATIONS]: [
      { key: { projectId: 1 }, options: { name: 'idx_installation_project' } },
      { key: { status: 1 }, options: { name: 'idx_installation_status' } },
      { key: { scheduledDate: 1 }, options: { name: 'idx_installation_scheduled' } },
      { key: { installerId: 1 }, options: { name: 'idx_installation_installer' } }
    ]
  }

  // Create indexes for each collection
  for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
    const collection = db.collection(collectionName)
    
    for (const indexDef of indexes) {
      try {
        await collection.createIndex(indexDef.key, indexDef.options)
        results.created.push({
          collection: collectionName,
          index: indexDef.options.name || JSON.stringify(indexDef.key)
        })
      } catch (error) {
        // Index might already exist or there might be a conflict
        if (error.code !== 85 && error.code !== 86) { // IndexOptionsConflict, IndexKeySpecsConflict
          results.errors.push({
            collection: collectionName,
            index: indexDef.options.name || JSON.stringify(indexDef.key),
            error: error.message
          })
        }
      }
    }
  }

  return results
}

/**
 * Drop all flooring indexes (for re-initialization)
 * @param {Object} db - MongoDB database instance
 */
export async function dropFlooringIndexes(db) {
  const collections = Object.values(COLLECTIONS)
  const results = { dropped: [], errors: [] }

  for (const collectionName of collections) {
    try {
      const collection = db.collection(collectionName)
      // Drop all indexes except _id
      await collection.dropIndexes()
      results.dropped.push(collectionName)
    } catch (error) {
      if (error.code !== 26) { // NamespaceNotFound
        results.errors.push({ collection: collectionName, error: error.message })
      }
    }
  }

  return results
}

/**
 * Get index statistics for monitoring
 * @param {Object} db - MongoDB database instance
 */
export async function getIndexStats(db) {
  const stats = {}
  const criticalCollections = [
    COLLECTIONS.INVENTORY_STOCK,
    COLLECTIONS.STOCK_LEDGER,
    COLLECTIONS.CHALLANS,
    COLLECTIONS.INVOICES,
    COLLECTIONS.PRODUCTS
  ]

  for (const collectionName of criticalCollections) {
    try {
      const collection = db.collection(collectionName)
      const indexes = await collection.indexes()
      const indexStats = await collection.aggregate([{ $indexStats: {} }]).toArray()
      
      stats[collectionName] = {
        indexCount: indexes.length,
        indexes: indexes.map(i => i.name),
        usage: indexStats.map(s => ({
          name: s.name,
          accesses: s.accesses?.ops || 0
        }))
      }
    } catch (error) {
      stats[collectionName] = { error: error.message }
    }
  }

  return stats
}

export default {
  createFlooringIndexes,
  dropFlooringIndexes,
  getIndexStats
}
