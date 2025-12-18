import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Reset all flooring module data
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    // Only admin can reset data
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('Only admin can reset module data', 403)
    }

    const body = await request.json()
    const { confirmReset } = body

    if (confirmReset !== 'DELETE_ALL_FLOORING_DATA') {
      return errorResponse('Invalid confirmation. Send confirmReset: "DELETE_ALL_FLOORING_DATA"', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const results = {
      collectionsCleared: [],
      errors: []
    }

    // List of all flooring-related collections to clear
    const collectionsToDelete = [
      'flooring_projects',
      'flooring_quotes_v2',
      'flooring_invoices',
      'flooring_installations',
      'flooring_dispatches',
      'flooring_challans',
      'flooring_customers',
      'flooring_rooms',
      'flooring_payments',
      'inventory_reservations',
      'wf_inventory_movements',
      'wf_inventory_stock'
    ]

    for (const collectionName of collectionsToDelete) {
      try {
        const collection = db.collection(collectionName)
        const deleteResult = await collection.deleteMany({})
        results.collectionsCleared.push({
          collection: collectionName,
          deletedCount: deleteResult.deletedCount
        })
      } catch (error) {
        results.errors.push({
          collection: collectionName,
          error: error.message
        })
      }
    }

    return successResponse({
      message: 'Flooring module data reset complete',
      results
    })
  } catch (error) {
    console.error('Reset Error:', error)
    return errorResponse('Failed to reset flooring data', 500, error.message)
  }
}
