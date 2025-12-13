import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Pabbly Connect Webhook Handler
export async function POST(request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')
    const secret = searchParams.get('secret')

    console.log('Pabbly Webhook received:', { webhookId, hasSecret: !!secret })

    if (webhookId) {
      const integrationsCollection = await getCollection('integrations')
      const webhook = await integrationsCollection.findOne({
        id: webhookId,
        type: 'pabbly',
        active: true
      })

      if (!webhook) {
        return errorResponse('Invalid webhook', 401)
      }

      if (secret && webhook.secret !== secret) {
        return errorResponse('Invalid webhook secret', 401)
      }

      // Process incoming data
      const event = body.event || body.action || 'lead.create'
      const data = body.data || body.payload || body

      if (event === 'lead.create' || event === 'new_lead') {
        const leadsCollection = await getCollection(Collections.LEADS)
        const newLead = {
          id: uuidv4(),
          clientId: webhook.clientId,
          name: data.name || data.lead_name || data.contact_name || 'Unknown',
          email: data.email || data.lead_email || '',
          phone: data.phone || data.mobile || data.contact_phone || '',
          company: data.company || data.business_name || '',
          source: 'Pabbly Connect',
          status: 'new',
          value: parseFloat(data.value || data.deal_value) || 0,
          notes: data.notes || data.description || '',
          tags: data.tags || ['pabbly-import'],
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await leadsCollection.insertOne(newLead)
        console.log('Lead created from Pabbly:', newLead.id)
        return successResponse({ success: true, leadId: newLead.id, message: 'Lead created successfully' })
      }

      // Log the webhook
      const logsCollection = await getCollection('webhook_logs')
      await logsCollection.insertOne({
        id: uuidv4(),
        webhookId,
        source: 'pabbly',
        event,
        data: body,
        processedAt: new Date()
      })

      return successResponse({ success: true, message: 'Webhook processed' })
    }

    return errorResponse('Webhook ID is required', 400)
  } catch (error) {
    console.error('Pabbly Webhook Error:', error)
    return errorResponse('Failed to process webhook', 500, error.message)
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get('id')

  if (!webhookId) {
    return successResponse({ 
      status: 'active',
      integration: 'pabbly',
      version: '1.0',
      supportedEvents: ['lead.create', 'new_lead', 'contact.create', 'task.create']
    })
  }

  try {
    const integrationsCollection = await getCollection('integrations')
    const webhook = await integrationsCollection.findOne({
      id: webhookId,
      type: 'pabbly'
    })

    if (!webhook) {
      return errorResponse('Webhook not found', 404)
    }

    return successResponse({
      status: webhook.active ? 'active' : 'inactive',
      integration: 'pabbly',
      connectedAt: webhook.createdAt
    })
  } catch (error) {
    return errorResponse('Failed to verify webhook', 500)
  }
}
