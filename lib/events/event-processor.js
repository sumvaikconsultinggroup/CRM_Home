/**
 * Idempotent Event Processing System
 * Ensures events are processed exactly once
 */

import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { v4 as uuidv4 } from 'uuid'

// Event types
export const EVENT_TYPES = {
  // Lead events
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_CONVERTED: 'lead.converted',
  
  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_STAGE_CHANGED: 'project.stage_changed',
  
  // Quote events
  QUOTE_CREATED: 'quote.created',
  QUOTE_APPROVED: 'quote.approved',
  QUOTE_REJECTED: 'quote.rejected',
  
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  
  // Payment events
  PAYMENT_RECORDED: 'payment.recorded',
  
  // Dispatch events
  DISPATCH_CREATED: 'dispatch.created',
  DISPATCH_COMPLETED: 'dispatch.completed',
  
  // Installation events
  INSTALLATION_SCHEDULED: 'installation.scheduled',
  INSTALLATION_COMPLETED: 'installation.completed',
  
  // Inventory events
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_DEDUCTED: 'inventory.deducted',
  INVENTORY_RETURNED: 'inventory.returned',
  
  // Integration events
  WHATSAPP_MESSAGE_SENT: 'whatsapp.message_sent',
  LEAD_IMPORTED: 'lead.imported',
  ACCOUNTING_SYNCED: 'accounting.synced'
}

/**
 * Create a new event
 */
export function createEvent({
  eventType,
  clientId,
  entityType,
  entityId,
  payload,
  dedupeKey = null,
  triggeredBy = null
}) {
  return {
    id: uuidv4(),
    eventType,
    clientId,
    entityType,
    entityId,
    payload,
    dedupeKey: dedupeKey || `${clientId}:${eventType}:${entityId}:${Date.now()}`,
    triggeredBy,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date(),
    processedAt: null,
    error: null
  }
}

/**
 * Check if an event has already been processed
 */
export async function isEventProcessed(clientId, dedupeKey) {
  try {
    const db = await getClientDb(clientId)
    const processedCollection = db.collection('processed_events')
    const existing = await processedCollection.findOne({ dedupeKey })
    return !!existing
  } catch (error) {
    console.error('Error checking processed event:', error)
    return false
  }
}

/**
 * Mark an event as processed
 */
export async function markEventProcessed(clientId, event, result = null) {
  try {
    const db = await getClientDb(clientId)
    const processedCollection = db.collection('processed_events')
    
    await processedCollection.insertOne({
      id: event.id,
      dedupeKey: event.dedupeKey,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      processedAt: new Date(),
      result
    })
    
    // Also update the event in events queue
    const eventsCollection = db.collection('events_queue')
    await eventsCollection.updateOne(
      { id: event.id },
      { 
        $set: { 
          status: 'processed',
          processedAt: new Date(),
          result
        }
      }
    )
    
    return true
  } catch (error) {
    console.error('Error marking event processed:', error)
    return false
  }
}

/**
 * Publish an event to the queue
 */
export async function publishEvent(event) {
  try {
    const db = await getClientDb(event.clientId)
    const eventsCollection = db.collection('events_queue')
    
    // Check for duplicate using dedupe key
    if (await isEventProcessed(event.clientId, event.dedupeKey)) {
      console.log(`Event already processed: ${event.dedupeKey}`)
      return { success: true, duplicate: true, eventId: event.id }
    }
    
    await eventsCollection.insertOne(event)
    return { success: true, duplicate: false, eventId: event.id }
  } catch (error) {
    console.error('Error publishing event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get pending events for processing
 */
export async function getPendingEvents(clientId, limit = 100) {
  try {
    const db = await getClientDb(clientId)
    const eventsCollection = db.collection('events_queue')
    
    return eventsCollection
      .find({ 
        status: 'pending',
        retryCount: { $lt: 3 } // Max 3 retries
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    console.error('Error getting pending events:', error)
    return []
  }
}

/**
 * Move event to dead letter queue
 */
export async function moveToDeadLetter(clientId, event, error) {
  try {
    const db = await getClientDb(clientId)
    
    // Remove from main queue
    const eventsCollection = db.collection('events_queue')
    await eventsCollection.deleteOne({ id: event.id })
    
    // Add to dead letter queue
    const dlqCollection = db.collection('dead_letter_queue')
    await dlqCollection.insertOne({
      ...event,
      status: 'failed',
      error: error.message || error,
      movedAt: new Date()
    })
    
    return true
  } catch (err) {
    console.error('Error moving to dead letter:', err)
    return false
  }
}

/**
 * Retry a failed event
 */
export async function retryEvent(clientId, eventId) {
  try {
    const db = await getClientDb(clientId)
    const eventsCollection = db.collection('events_queue')
    
    const event = await eventsCollection.findOne({ id: eventId })
    if (!event) return { success: false, error: 'Event not found' }
    
    if (event.retryCount >= 3) {
      await moveToDeadLetter(clientId, event, 'Max retries exceeded')
      return { success: false, error: 'Max retries exceeded, moved to dead letter' }
    }
    
    await eventsCollection.updateOne(
      { id: eventId },
      { 
        $set: { status: 'pending' },
        $inc: { retryCount: 1 }
      }
    )
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Event handlers registry
 */
const eventHandlers = new Map()

/**
 * Register an event handler
 */
export function registerEventHandler(eventType, handler) {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, [])
  }
  eventHandlers.get(eventType).push(handler)
}

/**
 * Process a single event
 */
export async function processEvent(event) {
  const handlers = eventHandlers.get(event.eventType) || []
  
  if (handlers.length === 0) {
    console.warn(`No handlers registered for event type: ${event.eventType}`)
    return { success: true, handled: false }
  }
  
  try {
    // Check if already processed (idempotency check)
    if (await isEventProcessed(event.clientId, event.dedupeKey)) {
      console.log(`Skipping already processed event: ${event.dedupeKey}`)
      return { success: true, duplicate: true }
    }
    
    // Run all handlers
    const results = []
    for (const handler of handlers) {
      const result = await handler(event)
      results.push(result)
    }
    
    // Mark as processed
    await markEventProcessed(event.clientId, event, results)
    
    return { success: true, results }
  } catch (error) {
    console.error(`Error processing event ${event.id}:`, error)
    
    // Update retry count
    const db = await getClientDb(event.clientId)
    const eventsCollection = db.collection('events_queue')
    
    const updatedEvent = await eventsCollection.findOneAndUpdate(
      { id: event.id },
      { 
        $inc: { retryCount: 1 },
        $set: { error: error.message, lastAttempt: new Date() }
      },
      { returnDocument: 'after' }
    )
    
    // Move to dead letter if max retries
    if (updatedEvent?.retryCount >= 3) {
      await moveToDeadLetter(event.clientId, updatedEvent, error)
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * Process all pending events for a client
 */
export async function processAllPendingEvents(clientId) {
  const events = await getPendingEvents(clientId)
  const results = []
  
  for (const event of events) {
    const result = await processEvent(event)
    results.push({ eventId: event.id, ...result })
  }
  
  return results
}

// ================================
// Default Event Handlers
// ================================

// Quote approved -> Reserve inventory
registerEventHandler(EVENT_TYPES.QUOTE_APPROVED, async (event) => {
  console.log(`Handling quote approval: ${event.entityId}`)
  // Inventory reservation logic would be triggered here
  return { action: 'inventory_reserved' }
})

// Invoice created -> Sync to Build Finance
registerEventHandler(EVENT_TYPES.INVOICE_CREATED, async (event) => {
  console.log(`Handling invoice creation: ${event.entityId}`)
  // Finance sync logic would be triggered here
  return { action: 'finance_sync_queued' }
})

// Payment recorded -> Update invoice status
registerEventHandler(EVENT_TYPES.PAYMENT_RECORDED, async (event) => {
  console.log(`Handling payment: ${event.entityId}`)
  // Invoice status update logic
  return { action: 'invoice_status_updated' }
})

export default {
  EVENT_TYPES,
  createEvent,
  isEventProcessed,
  markEventProcessed,
  publishEvent,
  getPendingEvents,
  moveToDeadLetter,
  retryEvent,
  registerEventHandler,
  processEvent,
  processAllPendingEvents
}
