import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Clear all data from CRM and Flooring modules
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { modules = ['crm', 'flooring'], confirm } = body

    if (confirm !== 'DELETE_ALL_DATA') {
      return errorResponse('Please confirm by sending confirm: "DELETE_ALL_DATA"', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const results = {}

    // CRM Collections
    if (modules.includes('crm')) {
      const crmCollections = [
        'leads',
        'contacts',
        'projects',
        'tasks',
        'customers'
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
