import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get Zapier integration status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const zapierIntegration = await integrationsCollection.findOne({ type: 'zapier' })

    return successResponse(zapierIntegration ? sanitizeDocument(zapierIntegration) : null)
  } catch (error) {
    console.error('Zapier GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch Zapier integration', 500, error.message)
  }
}

// POST - Connect Zapier or trigger webhook
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, webhookUrl, config } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')

    // Generate incoming webhook for Zapier to send data TO BuildCRM
    if (action === 'generate-webhook') {
      const webhookId = uuidv4()
      const incomingWebhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/zapier?id=${webhookId}`
      const webhookSecret = uuidv4().replace(/-/g, '')

      // Remove existing Zapier integration
      await integrationsCollection.deleteMany({ type: 'zapier' })

      const integration = {
        id: uuidv4(),
        type: 'zapier',
        name: 'Zapier',
        webhookId,
        incomingWebhookUrl,
        outgoingWebhookUrl: webhookUrl || null, // URL to send data TO Zapier (Catch Hook)
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

    // Connect outgoing webhook (Zapier Catch Hook)
    if (action === 'connect-outgoing') {
      if (!webhookUrl) {
        return errorResponse('Zapier webhook URL is required', 400)
      }

      // Validate Zapier webhook URL format
      if (!webhookUrl.includes('hooks.zapier.com')) {
        return errorResponse('Invalid Zapier webhook URL format', 400)
      }

      // Test the webhook
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'test',
            message: 'BuildCRM connection test',
            source: 'BuildCRM',
            timestamp: new Date().toISOString()
          })
        })

        // Zapier returns various responses, but we mainly want to ensure it doesn't error
        if (!testResponse.ok && testResponse.status !== 200) {
          console.log('Zapier test response:', testResponse.status)
        }
      } catch (err) {
        // Zapier webhooks sometimes don't return proper responses, so we'll proceed anyway
        console.log('Zapier webhook test note:', err.message)
      }

      const result = await integrationsCollection.updateOne(
        { type: 'zapier' },
        { 
          $set: { 
            outgoingWebhookUrl: webhookUrl,
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      )

      return successResponse({ message: 'Zapier Catch Hook connected' })
    }

    // Trigger webhook manually (for testing)
    if (action === 'trigger-test') {
      const zapierIntegration = await integrationsCollection.findOne({ type: 'zapier', active: true })
      
      if (!zapierIntegration?.outgoingWebhookUrl) {
        return errorResponse('Zapier Catch Hook is not configured', 400)
      }

      try {
        // Sample lead data for testing
        const sampleLead = {
          event: 'lead.created',
          source: 'BuildCRM',
          timestamp: new Date().toISOString(),
          data: {
            id: 'test-lead-123',
            name: 'John Doe (Test)',
            email: 'john.test@example.com',
            phone: '+91 98765 43210',
            company: 'Test Company',
            value: 50000,
            status: 'new',
            source: 'Website',
            notes: 'This is a test lead from BuildCRM',
            createdAt: new Date().toISOString()
          }
        }

        await fetch(zapierIntegration.outgoingWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleLead)
        })

        return successResponse({ message: 'Test trigger sent to Zapier' })
      } catch (err) {
        console.error('Zapier trigger error:', err)
        return errorResponse('Failed to trigger Zapier webhook', 500)
      }
    }

    // Update trigger settings
    if (action === 'update-settings') {
      const result = await integrationsCollection.updateOne(
        { type: 'zapier' },
        { 
          $set: { 
            triggers: config?.triggers || {},
            updatedAt: new Date() 
          } 
        }
      )

      if (result.matchedCount === 0) {
        return errorResponse('Zapier integration not found', 404)
      }

      return successResponse({ message: 'Settings updated successfully' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Zapier POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process Zapier request', 500, error.message)
  }
}

// DELETE - Disconnect Zapier
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const result = await integrationsCollection.deleteMany({ type: 'zapier' })

    if (result.deletedCount === 0) {
      return errorResponse('Zapier integration not found', 404)
    }

    return successResponse({ message: 'Zapier disconnected successfully' })
  } catch (error) {
    console.error('Zapier DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect Zapier', 500, error.message)
  }
}

// Helper function to trigger Zapier webhook (can be imported by other modules)
export async function triggerZapierWebhook(db, event, data) {
  try {
    const integrationsCollection = db.collection('integrations')
    const zapierIntegration = await integrationsCollection.findOne({ type: 'zapier', active: true })
    
    if (!zapierIntegration?.outgoingWebhookUrl) return false

    // Check if this trigger is enabled
    const triggerMap = {
      'lead.created': 'onNewLead',
      'lead.updated': 'onLeadStatusChange',
      'project.created': 'onProjectCreated',
      'task.completed': 'onTaskCompleted',
      'expense.created': 'onExpenseAdded'
    }

    const triggerKey = triggerMap[event]
    if (triggerKey && zapierIntegration.triggers && !zapierIntegration.triggers[triggerKey]) {
      return false
    }

    await fetch(zapierIntegration.outgoingWebhookUrl, {
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
    console.error('Zapier webhook trigger error:', error)
    return false
  }
}
