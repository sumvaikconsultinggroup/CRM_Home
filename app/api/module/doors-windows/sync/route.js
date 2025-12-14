import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Get sync status and recent syncs
    const syncLogs = db.collection('doors_windows_sync_logs')
    const recentSyncs = await syncLogs.find({}).sort({ timestamp: -1 }).limit(10).toArray()

    // Get counts
    const requirements = await db.collection('doors_windows_requirements').countDocuments({ isActive: true })
    const fromCrm = await db.collection('doors_windows_requirements').countDocuments({ isActive: true, source: 'crm' })

    return successResponse({
      lastSync: recentSyncs[0]?.timestamp || null,
      syncHistory: sanitizeDocuments(recentSyncs),
      stats: {
        totalRequirements: requirements,
        fromCrm: fromCrm,
        pendingSync: 0
      }
    })
  } catch (error) {
    console.error('Doors-Windows Sync GET Error:', error)
    return errorResponse('Failed to fetch sync status', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const syncLogs = db.collection('doors_windows_sync_logs')

    const now = new Date().toISOString()

    if (action === 'sync_leads') {
      // Simulate syncing leads from CRM
      await syncLogs.insertOne({
        id: uuidv4(),
        action: 'sync_leads',
        status: 'success',
        itemsSynced: 0,
        message: 'No new leads to sync',
        timestamp: now
      })
      return successResponse({ message: 'Leads synced', count: 0 })
    }

    if (action === 'push_to_crm') {
      const { entityId } = body
      // Simulate pushing to CRM
      await syncLogs.insertOne({
        id: uuidv4(),
        action: 'push_to_crm',
        entityId,
        status: 'success',
        message: 'Pushed to CRM successfully',
        timestamp: now
      })
      return successResponse({ message: 'Pushed to CRM', project: { projectNumber: `PRJ-${Date.now()}` } })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Doors-Windows Sync POST Error:', error)
    return errorResponse('Sync failed', 500, error.message)
  }
}
