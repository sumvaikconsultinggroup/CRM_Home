import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get Slack integration status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const slackIntegration = await integrationsCollection.findOne({ type: 'slack' })

    return successResponse(slackIntegration ? sanitizeDocument(slackIntegration) : null)
  } catch (error) {
    console.error('Slack GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch Slack integration', 500, error.message)
  }
}

// POST - Connect Slack or send message
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, webhookUrl, channel, message, config } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')

    // Connect Slack via Incoming Webhook
    if (action === 'connect') {
      if (!webhookUrl) {
        return errorResponse('Slack Webhook URL is required', 400)
      }

      // Validate webhook URL format
      if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        return errorResponse('Invalid Slack Webhook URL format', 400)
      }

      // Test the webhook
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '✅ BuildCRM connected successfully!',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*🎉 BuildCRM Integration Active*\nYou will now receive CRM notifications in this channel.'
                }
              }
            ]
          })
        })

        if (!testResponse.ok) {
          return errorResponse('Failed to connect to Slack. Please check your webhook URL.', 400)
        }
      } catch (err) {
        return errorResponse('Failed to reach Slack webhook. Please verify the URL.', 400)
      }

      // Remove existing Slack integration
      await integrationsCollection.deleteMany({ type: 'slack' })

      // Save new integration
      const integration = {
        id: uuidv4(),
        type: 'slack',
        name: 'Slack',
        webhookUrl,
        channel: channel || '#general',
        notifications: {
          newLead: true,
          leadConverted: true,
          projectCreated: true,
          taskCompleted: true,
          dailySummary: false
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

    // Send a test message
    if (action === 'test') {
      const slackIntegration = await integrationsCollection.findOne({ type: 'slack', active: true })
      
      if (!slackIntegration) {
        return errorResponse('Slack is not connected', 400)
      }

      try {
        const response = await fetch(slackIntegration.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '🔔 Test notification from BuildCRM',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*📋 Test Notification*\nThis is a test message from BuildCRM. Your integration is working correctly!'
                }
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `Sent by ${user.name || user.email} at ${new Date().toLocaleString()}`
                  }
                ]
              }
            ]
          })
        })

        if (!response.ok) {
          return errorResponse('Failed to send test message', 500)
        }

        return successResponse({ message: 'Test message sent successfully' })
      } catch (err) {
        return errorResponse('Failed to send test message', 500)
      }
    }

    // Send custom message
    if (action === 'send') {
      const slackIntegration = await integrationsCollection.findOne({ type: 'slack', active: true })
      
      if (!slackIntegration) {
        return errorResponse('Slack is not connected', 400)
      }

      if (!message) {
        return errorResponse('Message is required', 400)
      }

      try {
        const response = await fetch(slackIntegration.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        })

        if (!response.ok) {
          return errorResponse('Failed to send message', 500)
        }

        return successResponse({ message: 'Message sent successfully' })
      } catch (err) {
        return errorResponse('Failed to send message', 500)
      }
    }

    // Update notification settings
    if (action === 'update-settings') {
      const result = await integrationsCollection.updateOne(
        { type: 'slack' },
        { 
          $set: { 
            notifications: config?.notifications || {},
            updatedAt: new Date() 
          } 
        }
      )

      if (result.matchedCount === 0) {
        return errorResponse('Slack integration not found', 404)
      }

      return successResponse({ message: 'Settings updated successfully' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Slack POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process Slack request', 500, error.message)
  }
}

// DELETE - Disconnect Slack
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const result = await integrationsCollection.deleteMany({ type: 'slack' })

    if (result.deletedCount === 0) {
      return errorResponse('Slack integration not found', 404)
    }

    return successResponse({ message: 'Slack disconnected successfully' })
  } catch (error) {
    console.error('Slack DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect Slack', 500, error.message)
  }
}

// Helper function to send Slack notification (can be imported by other modules)
export async function sendSlackNotification(db, notification) {
  try {
    const integrationsCollection = db.collection('integrations')
    const slackIntegration = await integrationsCollection.findOne({ type: 'slack', active: true })
    
    if (!slackIntegration) return false

    const { type, title, message, fields = [] } = notification

    // Check if this notification type is enabled
    if (slackIntegration.notifications && !slackIntegration.notifications[type]) {
      return false
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\n${message}`
        }
      }
    ]

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: fields.map(f => ({
          type: 'mrkdwn',
          text: `*${f.label}:*\n${f.value}`
        }))
      })
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `BuildCRM • ${new Date().toLocaleString()}`
        }
      ]
    })

    await fetch(slackIntegration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    })

    return true
  } catch (error) {
    console.error('Slack notification error:', error)
    return false
  }
}
