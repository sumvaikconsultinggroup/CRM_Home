/**
 * =====================================================
 * FLOORING MODULE - COLLECTION MAPPING (SINGLE SOURCE OF TRUTH)
 * =====================================================
 * 
 * This file defines the canonical collection names for the Flooring Module.
 * ALL APIs should import collection names from here to ensure consistency.
 * 
 * Migration Note: The system previously had two prefixes (flooring_* and wf_*).
 * This file consolidates them into a single namespace.
 */

// ======================
// COLLECTION NAMES
// ======================

export const COLLECTIONS = {
  // Core Business Entities
  PRODUCTS: 'flooring_products',
  PROJECTS: 'flooring_projects',
  CUSTOMERS: 'flooring_customers',
  
  // Sales & Quotes
  QUOTES: 'flooring_quotes_v2',
  QUOTES_LEGACY: 'flooring_quotes', // Deprecated - migrate to v2
  
  // Invoicing & Customer Payments
  INVOICES: 'flooring_invoices',
  PAYMENTS: 'flooring_payments', // Customer payments (receivables)
  
  // Dispatch & Delivery
  CHALLANS: 'flooring_challans',
  CHALLAN_ITEMS: 'flooring_challan_items',
  DISPATCHES: 'flooring_dispatches',
  PICK_LISTS: 'flooring_pick_lists',
  PICK_LIST_ITEMS: 'flooring_pick_list_items',
  
  // Inventory Management (Consolidated from wf_*)
  INVENTORY: 'flooring_inventory_v2',
  INVENTORY_STOCK: 'wf_inventory_stock', // Main stock quantities per warehouse
  INVENTORY_BATCHES: 'wf_inventory_batches', // Batch/Lot tracking
  INVENTORY_MOVEMENTS: 'wf_inventory_movements', // All stock movements
  INVENTORY_GRN: 'wf_inventory_grn', // Goods Receipt Notes
  INVENTORY_TRANSFERS: 'wf_inventory_transfers', // Inter-warehouse transfers
  INVENTORY_CYCLE_COUNTS: 'wf_inventory_cycle_counts', // Physical counts
  INVENTORY_RESERVATIONS: 'inventory_reservations', // Stock reservations
  
  // Stock Ledger (Double-Entry)
  STOCK_LEDGER: 'wf_stock_ledger', // Immutable transaction log
  VALUATION_HISTORY: 'wf_valuation_history', // Cost valuation snapshots
  
  // Warehouses & Locations
  WAREHOUSES: 'wf_warehouses',
  WAREHOUSE_ACCESS: 'wf_warehouse_access',
  BIN_LOCATIONS: 'flooring_bin_locations',
  
  // Product Attributes
  LOTS: 'flooring_lots',
  CATEGORIES: 'flooring_categories',
  PRICE_TIERS: 'flooring_price_tiers',
  LANDED_COSTS: 'flooring_landed_costs',
  SHIPMENTS: 'flooring_shipments',
  
  // Quality & Compliance
  QC_RECORDS: 'flooring_qc_records',
  BARCODES: 'flooring_barcodes',
  AUDIT_TRAIL: 'wf_inventory_audit',
  
  // Installations
  INSTALLATIONS: 'flooring_installations',
  INSTALLERS: 'flooring_installers',
  ROOMS: 'flooring_rooms',
  
  // ===== VENDOR & PROCUREMENT (NEW) =====
  VENDORS: 'flooring_vendors', // Consolidated vendor master
  PURCHASE_ORDERS: 'flooring_purchase_orders', // POs to vendors
  VENDOR_BILLS: 'flooring_vendor_bills', // Accounts Payable
  VENDOR_PAYMENTS: 'flooring_vendor_payments', // Payments to vendors
  
  // ===== FINANCE (NEW) =====
  EXPENSES: 'flooring_expenses', // Business expenses
  CREDIT_NOTES: 'flooring_credit_notes', // Credit notes to customers
  DEBIT_NOTES: 'flooring_debit_notes', // Debit notes to vendors
  PAYMENT_SCHEDULES: 'flooring_payment_schedules', // Milestone payments
  REMINDERS: 'flooring_reminders', // Payment reminders
  
  // Settings & Configuration
  SETTINGS: 'flooring_settings',
  SCHEMAS: 'flooring_schemas',
  
  // Access Control (Module-Level RBAC)
  ROLES: 'flooring_roles',
  USER_ROLES: 'flooring_user_roles',
  ACCESS_AUDIT: 'flooring_access_audit',
  
  // CRM Integration (Read from main DB)
  CRM_LEADS: 'leads',
  CRM_CONTACTS: 'contacts',
  CRM_PROJECTS: 'projects',
  CRM_USERS: 'users', // In main DB, not client DB
}

// ======================
// HELPER FUNCTIONS
// ======================

/**
 * Get collection from client database
 * @param {Object} db - MongoDB database instance
 * @param {string} collectionKey - Key from COLLECTIONS constant
 */
export function getCollection(db, collectionKey) {
  const collectionName = COLLECTIONS[collectionKey]
  if (!collectionName) {
    throw new Error(`Unknown collection key: ${collectionKey}`)
  }
  return db.collection(collectionName)
}

/**
 * Get multiple collections at once
 * @param {Object} db - MongoDB database instance
 * @param {string[]} collectionKeys - Array of keys from COLLECTIONS constant
 */
export function getCollections(db, collectionKeys) {
  const result = {}
  for (const key of collectionKeys) {
    result[key] = getCollection(db, key)
  }
  return result
}

// ======================
// COLLECTION RELATIONSHIPS
// ======================

/**
 * Defines relationships between collections for referential integrity
 */
export const RELATIONSHIPS = {
  CHALLANS: {
    belongsTo: ['PROJECTS', 'CUSTOMERS'],
    hasMany: ['CHALLAN_ITEMS'],
    createsEntryIn: ['STOCK_LEDGER', 'INVENTORY_MOVEMENTS'],
    updatesStock: ['INVENTORY_STOCK']
  },
  GRN: {
    belongsTo: ['WAREHOUSES'],
    hasMany: ['INVENTORY_BATCHES'],
    createsEntryIn: ['STOCK_LEDGER', 'INVENTORY_MOVEMENTS'],
    updatesStock: ['INVENTORY_STOCK']
  },
  QUOTES: {
    belongsTo: ['PROJECTS', 'CUSTOMERS'],
    canBecomeA: ['INVOICES', 'CHALLANS'],
    reservesStock: ['INVENTORY_RESERVATIONS']
  },
  INVOICES: {
    belongsTo: ['PROJECTS', 'CUSTOMERS', 'QUOTES'],
    hasMany: ['PAYMENTS'],
    triggersDispatch: ['CHALLANS']
  }
}

// ======================
// INDEX DEFINITIONS
// ======================

/**
 * Recommended indexes for each collection
 * Should be created on application startup or migration
 */
export const INDEXES = {
  INVENTORY_STOCK: [
    { key: { productId: 1, warehouseId: 1 }, options: { unique: true } },
    { key: { warehouseId: 1 } },
    { key: { quantity: 1 } }
  ],
  STOCK_LEDGER: [
    { key: { productId: 1, warehouseId: 1, createdAt: -1 } },
    { key: { refDocType: 1, refDocId: 1 } },
    { key: { createdAt: -1 } }
  ],
  CHALLANS: [
    { key: { challanNumber: 1 }, options: { unique: true } },
    { key: { projectId: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: -1 } }
  ],
  INVOICES: [
    { key: { invoiceNumber: 1 }, options: { unique: true } },
    { key: { projectId: 1 } },
    { key: { status: 1 } },
    { key: { dueDate: 1 } }
  ],
  PRODUCTS: [
    { key: { sku: 1 }, options: { unique: true, sparse: true } },
    { key: { category: 1 } },
    { key: { status: 1 } }
  ]
}

export default COLLECTIONS
