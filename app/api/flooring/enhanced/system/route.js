import { NextResponse } from 'next/server'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { createFlooringIndexes, getIndexStats } from '@/lib/db/flooring-indexes'
import { COLLECTIONS } from '@/lib/db/flooring-collections'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * GET - Health check and system status
 * 
 * Query params:
 * - action: 'health' | 'indexes' | 'collections' | 'stats'
 */
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    switch (action) {
      case 'health':
        // Basic health check
        const healthChecks = {
          database: false,
          collections: {},
          timestamp: new Date().toISOString()
        }

        try {
          // Test database connection
          await db.command({ ping: 1 })
          healthChecks.database = true

          // Check critical collections
          const criticalCollections = [
            'flooring_products',
            'flooring_challans',
            'flooring_invoices',
            'wf_inventory_stock',
            'wf_stock_ledger'
          ]

          for (const collName of criticalCollections) {
            try {
              const count = await db.collection(collName).estimatedDocumentCount()
              healthChecks.collections[collName] = { status: 'ok', count }
            } catch (e) {
              healthChecks.collections[collName] = { status: 'error', error: e.message }
            }
          }
        } catch (e) {
          healthChecks.database = false
          healthChecks.error = e.message
        }

        return successResponse(healthChecks)

      case 'indexes':
        // Get index statistics
        const indexStats = await getIndexStats(db)
        return successResponse({ indexes: indexStats })

      case 'collections':
        // List all flooring collections with document counts
        const collectionStats = {}
        for (const [key, collName] of Object.entries(COLLECTIONS)) {
          try {
            const count = await db.collection(collName).estimatedDocumentCount()
            collectionStats[key] = { collection: collName, count }
          } catch (e) {
            collectionStats[key] = { collection: collName, error: e.message }
          }
        }
        return successResponse({ collections: collectionStats })

      case 'stats':
        // Get database statistics
        const dbStats = await db.stats()
        return successResponse({
          database: dbName,
          collections: dbStats.collections,
          documents: dbStats.objects,
          dataSize: Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100 + ' MB',
          indexSize: Math.round(dbStats.indexSize / 1024 / 1024 * 100) / 100 + ' MB',
          storageSize: Math.round(dbStats.storageSize / 1024 / 1024 * 100) / 100 + ' MB'
        })

      default:
        return errorResponse('Invalid action. Use: health, indexes, collections, stats', 400)
    }
  } catch (error) {
    console.error('System Status GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to get system status', 500, error.message)
  }
}

/**
 * POST - Administrative actions
 * 
 * Body:
 * - action: 'create_indexes' | 'verify_collections'
 */
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    // Only allow admins to perform these actions
    if (user.role !== 'super_admin' && user.role !== 'client_admin' && user.role !== 'admin') {
      return errorResponse('Admin access required', 403)
    }

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    switch (action) {
      case 'create_indexes':
        // Create all recommended indexes
        const indexResults = await createFlooringIndexes(db)
        return successResponse({
          message: 'Index creation completed',
          created: indexResults.created.length,
          errors: indexResults.errors.length,
          details: indexResults
        })

      case 'verify_collections':
        // Verify all collections exist and have correct structure
        const verificationResults = {
          verified: [],
          missing: [],
          errors: []
        }

        for (const [key, collName] of Object.entries(COLLECTIONS)) {
          try {
            const collections = await db.listCollections({ name: collName }).toArray()
            if (collections.length > 0) {
              verificationResults.verified.push({ key, collection: collName })
            } else {
              // Create collection if it doesn't exist
              await db.createCollection(collName)
              verificationResults.missing.push({ key, collection: collName, action: 'created' })
            }
          } catch (e) {
            verificationResults.errors.push({ key, collection: collName, error: e.message })
          }
        }

        return successResponse({
          message: 'Collection verification completed',
          verified: verificationResults.verified.length,
          created: verificationResults.missing.length,
          errors: verificationResults.errors.length,
          details: verificationResults
        })

      default:
        return errorResponse('Invalid action. Use: create_indexes, verify_collections', 400)
    }
  } catch (error) {
    console.error('System Admin POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to perform admin action', 500, error.message)
  }
}
