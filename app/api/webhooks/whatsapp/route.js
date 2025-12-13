import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// WhatsApp Business API Webhook Handler
export async function POST(request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    console.log('WhatsApp Webhook received:', { webhookId, body: JSON.stringify(body).substring(0, 200) })

    // Handle WhatsApp Cloud API verification
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value

      if (value?.messages) {
        // Incoming message
        for (const message of value.messages) {
          const from = message.from
          const text = message.text?.body || message.caption || ''
          const messageType = message.type
          const timestamp = message.timestamp

          console.log('WhatsApp message from:', from, 'text:', text)

          // Find client based on webhook configuration
          if (webhookId) {
            const integrationsCollection = await getCollection('integrations')
            const webhook = await integrationsCollection.findOne({
              id: webhookId,
              type: 'whatsapp',
              active: true
            })

            if (webhook) {
              // Check if this is a new lead (first message from this number)
              const leadsCollection = await getCollection(Collections.LEADS)
              const existingLead = await leadsCollection.findOne({
                clientId: webhook.clientId,
                phone: { $regex: from.slice(-10) } // Match last 10 digits
              })

              if (!existingLead) {
                // Create new lead from WhatsApp
                const newLead = {
                  id: uuidv4(),
                  clientId: webhook.clientId,
                  name: `WhatsApp Lead (${from})`,
                  email: '',
                  phone: '+' + from,
                  source: 'WhatsApp',
                  status: 'new',
                  value: 0,
                  notes: `First message: ${text}\nMessage type: ${messageType}`,
                  tags: ['whatsapp-lead'],
                  lastContactDate: new Date(parseInt(timestamp) * 1000),
                  createdAt: new Date(),
                  updatedAt: new Date()
                }

                await leadsCollection.insertOne(newLead)
                console.log('Lead created from WhatsApp:', newLead.id)
              }

              // Store message in chat log
              const chatLogsCollection = await getCollection('whatsapp_chat_logs')
              await chatLogsCollection.insertOne({
                id: uuidv4(),
                clientId: webhook.clientId,
                from,
                messageType,
                text,
                timestamp: new Date(parseInt(timestamp) * 1000),
                raw: message,
                createdAt: new Date()
              })
            }
          }
        }
      }

      if (value?.statuses) {
        // Message status update (sent, delivered, read)
        for (const status of value.statuses) {
          console.log('WhatsApp status:', status.status, 'for message:', status.id)
        }
      }

      return successResponse({ success: true })
    }

    // Log webhook data
    const logsCollection = await getCollection('webhook_logs')
    await logsCollection.insertOne({
      id: uuidv4(),
      webhookId,
      source: 'whatsapp',
      data: body,
      processedAt: new Date()
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error)
    return errorResponse('Failed to process webhook', 500, error.message)
  }
}

// GET endpoint for WhatsApp webhook verification (Meta's verification challenge)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  
  // WhatsApp verification challenge
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token) {
    // Verify token against stored webhook verify token
    const webhookId = searchParams.get('id')
    
    if (webhookId) {
      try {
        const integrationsCollection = await getCollection('integrations')
        const webhook = await integrationsCollection.findOne({
          id: webhookId,
          type: 'whatsapp'
        })

        if (webhook && webhook.config?.verifyToken === token) {
          console.log('WhatsApp webhook verified successfully')
          return new Response(challenge, { status: 200 })
        }
      } catch (error) {
        console.error('WhatsApp verification error:', error)
      }
    }

    // Default verification (for testing)
    if (token === 'buildcrm_whatsapp_verify') {
      return new Response(challenge, { status: 200 })
    }

    return errorResponse('Verification failed', 403)
  }

  return successResponse({ 
    status: 'active',
    integration: 'whatsapp',
    version: '1.0',
    supportedEvents: ['message.received', 'message.status']
  })
}
