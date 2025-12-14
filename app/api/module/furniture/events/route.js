import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Event types for the furniture module
const EVENT_TYPES = [
  // Product events
  'product.created', 'product.updated', 'product.deleted',
  // Material events
  'material.created', 'material.updated', 'material.deleted',
  // Hardware events
  'hardware.created', 'hardware.updated', 'hardware.deleted',
  // Requirement events
  'requirement.created', 'requirement.updated', 'requirement.status.changed',
  // Measurement events
  'measurement.created', 'measurement.completed',
  // Design brief events
  'design_brief.created', 'design_brief.approved', 'design_brief.rejected', 'design_brief.locked',
  // Quote events
  'quote.created', 'quote.sent', 'quote.approved', 'quote.rejected', 'quote.expired',
  // Order events
  'order.created', 'order.status.changed', 'order.payment.received', 'order.cancelled',
  // Work order events
  'workorder.created', 'workorder.stage.changed', 'workorder.completed',
  // QC events
  'qc.passed', 'qc.failed', 'qc.rework.created',
  // Dispatch events
  'dispatch.scheduled', 'dispatch.completed', 'dispatch.pod.uploaded',
  // Installation events
  'installation.scheduled', 'installation.started', 'installation.completed', 'installation.snag.created',
  // Stock events
  'stock.in', 'stock.out', 'stock.transfer', 'stock.low',
  // Warehouse events
  'warehouse.created', 'warehouse.updated'
]

// GET - Fetch events with filtering
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const events = db.collection('furniture_events')

    const query = {}
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = entityId
    if (type) query.type = type
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = startDate
      if (endDate) query.timestamp.$lte = endDate
    }

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      events.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      events.countDocuments(query)
    ])

    return successResponse({
      events: sanitizeDocuments(items),
      eventTypes: EVENT_TYPES,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Furniture Events GET Error:', error)
    return errorResponse('Failed to fetch events', 500, error.message)
  }
}

// POST - Emit event
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { type, entityType, entityId, data, metadata } = body

    if (!type || !entityType || !entityId) {
      return errorResponse('Missing required fields: type, entityType, entityId', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const events = db.collection('furniture_events')
    const webhooks = db.collection('furniture_webhooks')
    const automationRules = db.collection('furniture_automation_rules')

    const now = new Date().toISOString()
    const eventId = uuidv4()

    const event = {
      id: eventId,
      type,
      entityType,
      entityId,
      data: data || {},
      metadata: metadata || {},
      userId: user.id,
      timestamp: now
    }

    await events.insertOne(event)

    // Process webhooks (async)
    const activeWebhooks = await webhooks.find({ 
      isActive: true, 
      $or: [
        { events: type },
        { events: '*' },
        { events: { $regex: type.split('.')[0] + '.*' } }
      ]
    }).toArray()

    // Queue webhook deliveries (in production, this would be a background job)
    if (activeWebhooks.length > 0) {
      const webhookDeliveries = db.collection('furniture_webhook_deliveries')
      for (const webhook of activeWebhooks) {
        await webhookDeliveries.insertOne({
          id: uuidv4(),
          webhookId: webhook.id,
          eventId,
          eventType: type,
          payload: event,
          status: 'pending',
          attempts: 0,
          createdAt: now
        })
      }
    }

    // Process automation rules
    const matchingRules = await automationRules.find({
      isActive: true,
      trigger: type
    }).toArray()

    // Queue automation actions (in production, this would be a background job)
    if (matchingRules.length > 0) {
      const automationQueue = db.collection('furniture_automation_queue')
      for (const rule of matchingRules) {
        await automationQueue.insertOne({
          id: uuidv4(),
          ruleId: rule.id,
          eventId,
          eventType: type,
          action: rule.action,
          params: rule.params,
          status: 'pending',
          createdAt: now
        })
      }
    }

    return successResponse({ 
      event: { id: eventId, type },
      webhooksTriggered: activeWebhooks.length,
      automationsTriggered: matchingRules.length
    }, 201)
  } catch (error) {
    console.error('Furniture Events POST Error:', error)
    return errorResponse('Failed to emit event', 500, error.message)
  }
}
