import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get Pabbly integration status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const pabblyIntegration = await integrationsCollection.findOne({ type: 'pabbly' })

    return successResponse(pabblyIntegration ? sanitizeDocument(pabblyIntegration) : null)
  } catch (error) {
    console.error('Pabbly GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch Pabbly integration', 500, error.message)
  }
}

// POST - Connect Pabbly or trigger webhook
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, webhookUrl, config } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')

    // Generate incoming webhook for Pabbly to send data TO BuildCRM
    if (action === 'generate-webhook') {
      const webhookId = uuidv4()
      const incomingWebhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/pabbly?id=${webhookId}`
      const webhookSecret = uuidv4().replace(/-/g, '')

      // Remove existing Pabbly integration
      await integrationsCollection.deleteMany({ type: 'pabbly' })

      const integration = {
        id: uuidv4(),
        type: 'pabbly',
        name: 'Pabbly Connect',
        webhookId,
        incomingWebhookUrl,
        outgoingWebhookUrl: webhookUrl || null, // URL to send data TO Pabbly
        webhookSecret,
        triggers: {
          onNewLead: true,
          onLeadStatusChange: true,
          onProjectCreated: true,
          onTaskCompleted: false,
          onExpenseAdded: false
        },
        active: true,
        connectedBy: user.id,
        connectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await integrationsCollection.insertOne(integration)
      return successResponse(sanitizeDocument(integration), 201)
    }

    // Connect outgoing webhook (send data FROM BuildCRM TO Pabbly)
    if (action === 'connect-outgoing') {
      if (!webhookUrl) {
        return errorResponse('Pabbly webhook URL is required', 400)
      }

      // Test the webhook
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'test',
            message: 'BuildCRM connection test',
            timestamp: new Date().toISOString()
          })
        })

        if (!testResponse.ok) {
          return errorResponse('Failed to connect to Pabbly webhook. Please check the URL.', 400)
        }
      } catch (err) {
        return errorResponse('Failed to reach Pabbly webhook. Please verify the URL.', 400)
      }

      const result = await integrationsCollection.updateOne(
        { type: 'pabbly' },
        { 
          $set: { 
            outgoingWebhookUrl: webhookUrl,
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      )

      return successResponse({ message: 'Pabbly outgoing webhook connected' })
    }

    // Trigger webhook manually (for testing)
    if (action === 'trigger-test') {
      const pabblyIntegration = await integrationsCollection.findOne({ type: 'pabbly', active: true })
      
      if (!pabblyIntegration?.outgoingWebhookUrl) {
        return errorResponse('Pabbly outgoing webhook is not configured', 400)
      }

      try {
        const response = await fetch(pabblyIntegration.outgoingWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'test',
            source: 'BuildCRM',
            data: {
              message: 'Test trigger from BuildCRM',
              timestamp: new Date().toISOString(),
              triggeredBy: user.name || user.email
            }
          })
        })

        if (!response.ok) {
          return errorResponse('Failed to trigger Pabbly webhook', 500)
        }

        return successResponse({ message: 'Test trigger sent successfully' })
      } catch (err) {
        return errorResponse('Failed to trigger Pabbly webhook', 500)
      }
    }

    // Update trigger settings
    if (action === 'update-settings') {
      const result = await integrationsCollection.updateOne(
        { type: 'pabbly' },
        { 
          $set: { 
            triggers: config?.triggers || {},
            updatedAt: new Date() 
          } 
        }
      )

      if (result.matchedCount === 0) {
        return errorResponse('Pabbly integration not found', 404)
      }

      return successResponse({ message: 'Settings updated successfully' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Pabbly POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process Pabbly request', 500, error.message)
  }
}

// DELETE - Disconnect Pabbly
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const result = await integrationsCollection.deleteMany({ type: 'pabbly' })

    if (result.deletedCount === 0) {
      return errorResponse('Pabbly integration not found', 404)
    }

    return successResponse({ message: 'Pabbly disconnected successfully' })
  } catch (error) {
    console.error('Pabbly DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect Pabbly', 500, error.message)
  }
}

// Helper function to trigger Pabbly webhook (can be imported by other modules)
export async function triggerPabblyWebhook(db, event, data) {
  try {
    const integrationsCollection = db.collection('integrations')
    const pabblyIntegration = await integrationsCollection.findOne({ type: 'pabbly', active: true })
    
    if (!pabblyIntegration?.outgoingWebhookUrl) return false

    // Check if this trigger is enabled
    const triggerMap = {
      'lead.created': 'onNewLead',
      'lead.updated': 'onLeadStatusChange',
      'project.created': 'onProjectCreated',
      'task.completed': 'onTaskCompleted',
      'expense.created': 'onExpenseAdded'
    }

    const triggerKey = triggerMap[event]
    if (triggerKey && pabblyIntegration.triggers && !pabblyIntegration.triggers[triggerKey]) {
      return false
    }

    await fetch(pabblyIntegration.outgoingWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        source: 'BuildCRM',
        timestamp: new Date().toISOString(),
        data
      })
    })

    return true
  } catch (error) {
    console.error('Pabbly webhook trigger error:', error)
    return false
  }
}
