import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Zapier Webhook Handler
// Receives data from Zapier and creates leads/contacts in BuildCRM
export async function POST(request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')
    const secret = searchParams.get('secret')

    console.log('Zapier Webhook received:', { webhookId, hasSecret: !!secret })

    // Verify webhook if secret is provided
    if (webhookId) {
      const integrationsCollection = await getCollection('integrations')
      const webhook = await integrationsCollection.findOne({
        id: webhookId,
        type: 'zapier',
        active: true
      })

      if (!webhook) {
        return errorResponse('Invalid webhook', 401)
      }

      if (secret && webhook.secret !== secret) {
        return errorResponse('Invalid webhook secret', 401)
      }

      // Process incoming data based on event type
      const event = body.event || 'lead.create'
      const data = body.data || body

      if (event === 'lead.create' || !event) {
        const leadsCollection = await getCollection(Collections.LEADS)
        const newLead = {
          id: uuidv4(),
          clientId: webhook.clientId,
          name: data.name || data.full_name || 'Unknown',
          email: data.email || '',
          phone: data.phone || data.mobile || '',
          company: data.company || data.business || '',
          source: 'Zapier',
          status: 'new',
          value: parseFloat(data.value) || 0,
          notes: data.notes || data.message || '',
          tags: data.tags || ['zapier-import'],
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await leadsCollection.insertOne(newLead)
        console.log('Lead created from Zapier:', newLead.id)
        return successResponse({ success: true, leadId: newLead.id, message: 'Lead created successfully' })
      }

      // Log the webhook data
      const logsCollection = await getCollection('webhook_logs')
      await logsCollection.insertOne({
        id: uuidv4(),
        webhookId,
        source: 'zapier',
        event,
        data: body,
        processedAt: new Date()
      })

      return successResponse({ success: true, message: 'Webhook processed' })
    }

    return errorResponse('Webhook ID is required', 400)
  } catch (error) {
    console.error('Zapier Webhook Error:', error)
    return errorResponse('Failed to process webhook', 500, error.message)
  }
}

// GET endpoint for Zapier to verify the webhook
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get('id')

  if (!webhookId) {
    return successResponse({ 
      status: 'active',
      integration: 'zapier',
      version: '1.0',
      supportedEvents: ['lead.create', 'contact.create', 'task.create']
    })
  }

  try {
    const integrationsCollection = await getCollection('integrations')
    const webhook = await integrationsCollection.findOne({
      id: webhookId,
      type: 'zapier'
    })

    if (!webhook) {
      return errorResponse('Webhook not found', 404)
    }

    return successResponse({
      status: webhook.active ? 'active' : 'inactive',
      integration: 'zapier',
      connectedAt: webhook.createdAt
    })
  } catch (error) {
    return errorResponse('Failed to verify webhook', 500)
  }
}
