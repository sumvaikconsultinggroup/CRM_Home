import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch all settings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('settings')
    const apiKeysCollection = db.collection('api_keys')
    const webhooksCollection = db.collection('webhooks')

    // Get or create settings document
    let settings = await settingsCollection.findOne({ clientId: user.clientId })

    if (!settings) {
      settings = {
        id: uuidv4(),
        clientId: user.clientId,
        regional: {
          timezone: 'UTC',
          language: 'en',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          firstDayOfWeek: 'sunday',
          numberFormat: 'thousand-comma'
        },
        notifications: {
          email: {
            enabled: true,
            leads: true,
            projects: true,
            tasks: true,
            payments: true,
            reports: false,
            marketing: false
          },
          push: {
            enabled: true,
            mentions: true,
            reminders: true,
            updates: true
          },
          sms: {
            enabled: false,
            urgent: false
          },
          digest: {
            enabled: true,
            frequency: 'daily'
          }
        },
        security: {
          twoFactorEnabled: false,
          twoFactorMethod: 'app',
          sessionTimeout: 30,
          passwordExpiry: 90,
          ipWhitelist: [],
          loginNotifications: true,
          deviceManagement: true,
          auditLog: true
        },
        api: {
          apiEnabled: false,
          webhooksEnabled: false,
          rateLimit: 1000,
          allowedOrigins: []
        },
        data: {
          autoBackup: true,
          backupFrequency: 'daily',
          retentionPeriod: 90,
          exportFormat: 'csv'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await settingsCollection.insertOne(settings)
    }

    // Get API keys
    const apiKeys = await apiKeysCollection
      .find({ clientId: user.clientId, revoked: { $ne: true } })
      .toArray()

    // Get webhooks
    const webhooks = await webhooksCollection
      .find({ clientId: user.clientId, deleted: { $ne: true } })
      .toArray()

    return successResponse({
      ...sanitizeDocument(settings),
      apiKeys: apiKeys.map(k => ({
        id: k.id,
        name: k.name,
        prefix: k.key?.substring(0, 8),
        suffix: k.key?.substring(k.key.length - 4),
        scope: k.scope,
        createdAt: k.createdAt,
        lastUsed: k.lastUsed
      })),
      webhooks: webhooks.map(w => sanitizeDocument(w))
    })
  } catch (error) {
    console.error('Settings GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch settings', 500, error.message)
  }
}

// PUT - Update settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('settings')

    const now = new Date()

    const updateData = {
      updatedAt: now,
      updatedBy: user.id
    }

    // Update specific sections
    if (body.regional) updateData.regional = body.regional
    if (body.notifications) updateData.notifications = body.notifications
    if (body.security) updateData.security = body.security
    if (body.api) updateData.api = body.api
    if (body.data) updateData.data = body.data

    await settingsCollection.updateOne(
      { clientId: user.clientId },
      { 
        $set: updateData,
        $setOnInsert: {
          id: uuidv4(),
          clientId: user.clientId,
          createdAt: now
        }
      },
      { upsert: true }
    )

    const updated = await settingsCollection.findOne({ clientId: user.clientId })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('Settings PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update settings', 500, error.message)
  }
}
