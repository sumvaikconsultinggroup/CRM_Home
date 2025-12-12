import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Webhook endpoint for external lead sources (Meta, Google Ads, Indiamart, Justdial)
export async function POST(request) {
  try {
    const body = await request.json()
    const { clientId, source, leadData, apiKey } = body

    if (!clientId) {
      return errorResponse('Client ID is required', 400)
    }

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const leadsCollection = await getCollection(Collections.LEADS)

    // Verify client exists and is active
    const clientDoc = await clientsCollection.findOne({ id: clientId })
    if (!clientDoc) {
      return errorResponse('Invalid client ID', 404)
    }

    if (clientDoc.subscriptionStatus !== 'active') {
      return errorResponse('Client subscription is not active', 403)
    }

    // Create lead from webhook data
    const lead = {
      id: uuidv4(),
      clientId,
      name: leadData?.name || leadData?.full_name || 'Unknown Lead',
      email: leadData?.email || '',
      phone: leadData?.phone || leadData?.phone_number || '',
      company: leadData?.company || '',
      source: source || 'Webhook',
      status: 'new',
      value: leadData?.budget || 0,
      notes: leadData?.message || leadData?.inquiry || '',
      tags: ['webhook', source?.toLowerCase()].filter(Boolean),
      rawData: leadData, // Store raw data for reference
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await leadsCollection.insertOne(lead)

    // Log webhook receipt (mock WhatsApp notification)
    console.log(`[Webhook] New lead received for client ${clientId} from ${source}`)
    console.log(`[WhatsApp Mock] Notification sent: "New lead: ${lead.name} from ${source}"`)

    return successResponse({
      message: 'Lead received successfully',
      leadId: lead.id,
      source: source
    }, 201)
  } catch (error) {
    console.error('Webhook Leads API Error:', error)
    return errorResponse('Failed to process webhook', 500, error.message)
  }
}

export async function GET() {
  return successResponse({
    message: 'Lead Webhook Endpoint',
    version: '1.0',
    supportedSources: ['Meta Ads', 'Google Ads', 'Indiamart', 'Justdial', 'Custom'],
    requiredFields: ['clientId'],
    optionalFields: ['source', 'leadData', 'apiKey']
  })
}
