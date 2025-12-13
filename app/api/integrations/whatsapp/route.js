import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get WhatsApp integration status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const whatsappIntegration = await integrationsCollection.findOne({ type: 'whatsapp' })

    // Don't expose sensitive credentials
    if (whatsappIntegration) {
      const safeIntegration = {
        ...whatsappIntegration,
        accessToken: whatsappIntegration.accessToken ? '••••••••' : null,
        phoneNumberId: whatsappIntegration.phoneNumberId ? '****' + whatsappIntegration.phoneNumberId.slice(-4) : null
      }
      return successResponse(sanitizeDocument(safeIntegration))
    }

    return successResponse(null)
  } catch (error) {
    console.error('WhatsApp GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch WhatsApp integration', 500, error.message)
  }
}

// POST - Connect WhatsApp or send message
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, phoneNumberId, accessToken, businessAccountId, message, to, templateName, config } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')

    // Connect WhatsApp Business API
    if (action === 'connect') {
      if (!phoneNumberId || !accessToken) {
        return errorResponse('Phone Number ID and Access Token are required', 400)
      }

      // Test the credentials
      try {
        const testResponse = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )

        if (!testResponse.ok) {
          return errorResponse('Invalid WhatsApp credentials. Please check your Phone Number ID and Access Token.', 400)
        }

        const phoneData = await testResponse.json()

        // Remove existing WhatsApp integration
        await integrationsCollection.deleteMany({ type: 'whatsapp' })

        // Save new integration
        const integration = {
          id: uuidv4(),
          type: 'whatsapp',
          name: 'WhatsApp Business',
          phoneNumberId,
          accessToken, // In production, encrypt this
          businessAccountId: businessAccountId || '',
          verifiedName: phoneData.verified_name || '',
          phoneNumber: phoneData.display_phone_number || '',
          qualityRating: phoneData.quality_rating || 'unknown',
          notifications: {
            newLead: true,
            leadFollowUp: true,
            projectUpdate: false,
            paymentReminder: false
          },
          templates: [],
          active: true,
          connectedBy: user.id,
          connectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await integrationsCollection.insertOne(integration)
        
        return successResponse({
          ...sanitizeDocument(integration),
          accessToken: '••••••••',
          phoneNumberId: '****' + phoneNumberId.slice(-4)
        }, 201)
      } catch (err) {
        console.error('WhatsApp connection error:', err)
        return errorResponse('Failed to connect to WhatsApp. Please check your credentials.', 400)
      }
    }

    // Send a text message
    if (action === 'send-message') {
      const whatsappIntegration = await integrationsCollection.findOne({ type: 'whatsapp', active: true })
      
      if (!whatsappIntegration) {
        return errorResponse('WhatsApp is not connected', 400)
      }

      if (!to || !message) {
        return errorResponse('Recipient phone number and message are required', 400)
      }

      // Format phone number (remove + and spaces)
      const formattedTo = to.replace(/[^\d]/g, '')

      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappIntegration.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${whatsappIntegration.accessToken}`
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedTo,
              type: 'text',
              text: { body: message }
            })
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('WhatsApp send error:', errorData)
          return errorResponse('Failed to send WhatsApp message', 500)
        }

        const result = await response.json()

        // Log the message
        const messagesCollection = db.collection('whatsapp_messages')
        await messagesCollection.insertOne({
          id: uuidv4(),
          messageId: result.messages?.[0]?.id,
          to: formattedTo,
          message,
          type: 'text',
          status: 'sent',
          sentBy: user.id,
          sentAt: new Date()
        })

        return successResponse({
          messageId: result.messages?.[0]?.id,
          status: 'sent'
        })
      } catch (err) {
        console.error('WhatsApp message error:', err)
        return errorResponse('Failed to send WhatsApp message', 500)
      }
    }

    // Send a template message
    if (action === 'send-template') {
      const whatsappIntegration = await integrationsCollection.findOne({ type: 'whatsapp', active: true })
      
      if (!whatsappIntegration) {
        return errorResponse('WhatsApp is not connected', 400)
      }

      if (!to || !templateName) {
        return errorResponse('Recipient phone number and template name are required', 400)
      }

      const formattedTo = to.replace(/[^\d]/g, '')

      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappIntegration.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${whatsappIntegration.accessToken}`
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedTo,
              type: 'template',
              template: {
                name: templateName,
                language: { code: 'en' },
                components: config?.components || []
              }
            })
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('WhatsApp template error:', errorData)
          return errorResponse('Failed to send WhatsApp template message', 500)
        }

        const result = await response.json()

        return successResponse({
          messageId: result.messages?.[0]?.id,
          status: 'sent'
        })
      } catch (err) {
        console.error('WhatsApp template error:', err)
        return errorResponse('Failed to send WhatsApp template message', 500)
      }
    }

    // Test connection
    if (action === 'test') {
      const whatsappIntegration = await integrationsCollection.findOne({ type: 'whatsapp', active: true })
      
      if (!whatsappIntegration) {
        return errorResponse('WhatsApp is not connected', 400)
      }

      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappIntegration.phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${whatsappIntegration.accessToken}`
            }
          }
        )

        if (!response.ok) {
          return errorResponse('WhatsApp connection test failed', 500)
        }

        return successResponse({ message: 'WhatsApp connection is active' })
      } catch (err) {
        return errorResponse('WhatsApp connection test failed', 500)
      }
    }

    // Update notification settings
    if (action === 'update-settings') {
      const result = await integrationsCollection.updateOne(
        { type: 'whatsapp' },
        { 
          $set: { 
            notifications: config?.notifications || {},
            updatedAt: new Date() 
          } 
        }
      )

      if (result.matchedCount === 0) {
        return errorResponse('WhatsApp integration not found', 404)
      }

      return successResponse({ message: 'Settings updated successfully' })
    }

    // Get message history
    if (action === 'get-history') {
      const messagesCollection = db.collection('whatsapp_messages')
      const messages = await messagesCollection
        .find({})
        .sort({ sentAt: -1 })
        .limit(50)
        .toArray()

      return successResponse(messages)
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('WhatsApp POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process WhatsApp request', 500, error.message)
  }
}

// DELETE - Disconnect WhatsApp
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const result = await integrationsCollection.deleteMany({ type: 'whatsapp' })

    if (result.deletedCount === 0) {
      return errorResponse('WhatsApp integration not found', 404)
    }

    return successResponse({ message: 'WhatsApp disconnected successfully' })
  } catch (error) {
    console.error('WhatsApp DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect WhatsApp', 500, error.message)
  }
}

// Helper function to send WhatsApp notification (can be imported by other modules)
export async function sendWhatsAppNotification(db, notification) {
  try {
    const integrationsCollection = db.collection('integrations')
    const whatsappIntegration = await integrationsCollection.findOne({ type: 'whatsapp', active: true })
    
    if (!whatsappIntegration) return false

    const { type, to, message } = notification

    // Check if this notification type is enabled
    if (whatsappIntegration.notifications && !whatsappIntegration.notifications[type]) {
      return false
    }

    const formattedTo = to.replace(/[^\d]/g, '')

    await fetch(
      `https://graph.facebook.com/v18.0/${whatsappIntegration.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappIntegration.accessToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: { body: message }
        })
      }
    )

    return true
  } catch (error) {
    console.error('WhatsApp notification error:', error)
    return false
  }
}
