import { getCollection } from '@/lib/db/mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
    },
  })
}

export async function POST(request, { params }) {
  try {
    const { webhookId } = params
    const body = await request.json()

    const integrationsCollection = await getCollection('integrations')
    const webhookLogsCollection = await getCollection('webhook_logs')

    // Find the webhook
    const webhook = await integrationsCollection.findOne({ 
      id: webhookId, 
      type: 'webhook',
      active: true 
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found or inactive' }, { status: 404 })
    }

    // Log the incoming webhook
    const log = {
      id: uuidv4(),
      webhookId,
      clientId: webhook.clientId,
      payload: body,
      headers: Object.fromEntries(request.headers),
      processedAt: new Date(),
      status: 'received'
    }

    await webhookLogsCollection.insertOne(log)

    // Process the webhook based on the event type
    const eventType = body.event || body.type || 'unknown'
    
    // Handle different event types
    if (eventType === 'lead' || eventType === 'lead.create') {
      const leadsCollection = await getCollection('leads')
      const leadData = {
        id: uuidv4(),
        clientId: webhook.clientId,
        name: body.name || body.lead_name || 'Webhook Lead',
        email: body.email || '',
        phone: body.phone || '',
        source: body.source || 'Webhook',
        status: 'new',
        value: body.value || 0,
        notes: body.notes || `Created via webhook: ${webhook.name}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await leadsCollection.insertOne(leadData)
      
      await webhookLogsCollection.updateOne(
        { id: log.id },
        { $set: { status: 'processed', result: { leadId: leadData.id } } }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received and processed',
      logId: log.id
    })
  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
