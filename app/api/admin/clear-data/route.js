import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - List all collections in the database
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const collections = await db.listCollections().toArray()
    const collectionStats = []

    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments()
      collectionStats.push({ name: coll.name, count })
    }

    return successResponse({
      database: dbName,
      collections: collectionStats.sort((a, b) => b.count - a.count)
    })
  } catch (error) {
    console.error('List collections error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to list collections', 500, error.message)
  }
}

// POST - Clear all data from specified modules or ALL data
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { clearAll, modules = [], confirm } = body

    if (confirm !== 'DELETE_ALL_DATA') {
      return errorResponse('Please confirm by sending confirm: "DELETE_ALL_DATA"', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const results = {}

    // If clearAll is true, clear ALL collections except system collections
    if (clearAll === true) {
      const collections = await db.listCollections().toArray()
      const systemCollections = ['system.indexes', 'system.profile', 'system.users']
      
      results.all = {}
      for (const coll of collections) {
        if (systemCollections.includes(coll.name)) continue
        try {
          const result = await db.collection(coll.name).deleteMany({})
          results.all[coll.name] = result.deletedCount
        } catch (e) {
          results.all[coll.name] = `Error: ${e.message}`
        }
      }

      return successResponse({
        message: 'ALL data cleared successfully',
        results,
        database: dbName
      })
    }

    // Otherwise clear specific modules
    // CRM Collections
    if (modules.includes('crm')) {
      const crmCollections = [
        'leads',
        'contacts',
        'projects',
        'tasks',
        'customers',
        'deals',
        'activities',
        'notes',
        'quotes',
        'invoices',
        'payments',
        'expenses',
        'revenue',
        'pipeline',
        'stages'
      ]

      results.crm = {}
      for (const collName of crmCollections) {
        try {
          const result = await db.collection(collName).deleteMany({})
          results.crm[collName] = result.deletedCount
        } catch (e) {
          results.crm[collName] = `Error: ${e.message}`
        }
      }
    }

    // Flooring Module Collections
    if (modules.includes('flooring')) {
      const flooringCollections = [
        'flooring_products',
        'flooring_quotes_v2',
        'flooring_quotes',
        'flooring_invoices',
        'flooring_payments',
        'flooring_dispatches',
        'flooring_installations',
        'wf_inventory_stock',
        'wf_inventory_movements',
        'inventory_product_sync'
      ]

      results.flooring = {}
      for (const collName of flooringCollections) {
        try {
          const result = await db.collection(collName).deleteMany({})
          results.flooring[collName] = result.deletedCount
        } catch (e) {
          results.flooring[collName] = `Error: ${e.message}`
        }
      }
    }

    // Inventory Collections
    if (modules.includes('inventory')) {
      const inventoryCollections = [
        'inventory_products',
        'inventory_movements',
        'inventory_dispatches',
        'inventory_stock',
        'warehouses',
        'purchase_orders',
        'suppliers'
      ]

      results.inventory = {}
      for (const collName of inventoryCollections) {
        try {
          const result = await db.collection(collName).deleteMany({})
          results.inventory[collName] = result.deletedCount
        } catch (e) {
          results.inventory[collName] = `Error: ${e.message}`
        }
      }
    }

    // Finance Collections
    if (modules.includes('finance')) {
      const financeCollections = [
        'finance_invoices',
        'finance_payments',
        'finance_expenses',
        'finance_quotes',
        'credit_notes',
        'debit_notes'
      ]

      results.finance = {}
      for (const collName of financeCollections) {
        try {
          const result = await db.collection(collName).deleteMany({})
          results.finance[collName] = result.deletedCount
        } catch (e) {
          results.finance[collName] = `Error: ${e.message}`
        }
      }
    }

    // D&W Collections
    if (modules.includes('dw')) {
      const dwCollections = [
        'dw_products',
        'dw_inventory',
        'dw_inventory_holds',
        'dw_quotations',
        'dw_quote_items',
        'dw_orders',
        'dw_invoices',
        'dw_payment_collections',
        'dw_production_orders',
        'dw_installations',
        'dw_warranties'
      ]

      results.dw = {}
      for (const collName of dwCollections) {
        try {
          const result = await db.collection(collName).deleteMany({})
          results.dw[collName] = result.deletedCount
        } catch (e) {
          results.dw[collName] = `Error: ${e.message}`
        }
      }
    }

    return successResponse({
      message: 'Data cleared successfully',
      results,
      database: dbName
    })
  } catch (error) {
    console.error('Clear data error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to clear data', 500, error.message)
  }
}
