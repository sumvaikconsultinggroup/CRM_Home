/**
 * Centralized Audit Logger
 * Logs all important actions for compliance and debugging
 */

import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { v4 as uuidv4 } from 'uuid'

// Audit event types
export const AUDIT_EVENTS = {
  // Entity operations
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // State transitions
  STAGE_TRANSITION: 'stage_transition',
  STATUS_CHANGE: 'status_change',
  
  // Financial
  PAYMENT_RECORDED: 'payment_recorded',
  INVOICE_GENERATED: 'invoice_generated',
  QUOTE_APPROVED: 'quote_approved',
  
  // Inventory
  STOCK_RESERVED: 'stock_reserved',
  STOCK_DEDUCTED: 'stock_deducted',
  STOCK_RETURNED: 'stock_returned',
  
  // Integration
  INTEGRATION_CALL: 'integration_call',
  WEBHOOK_RECEIVED: 'webhook_received',
  
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // Admin
  ADMIN_ACCESS: 'admin_access',
  DATA_EXPORT: 'data_export',
  DATA_RESET: 'data_reset'
}

// Entity types
export const ENTITY_TYPES = {
  LEAD: 'lead',
  PROJECT: 'project',
  TASK: 'task',
  CONTACT: 'contact',
  QUOTE: 'quote',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  DISPATCH: 'dispatch',
  INSTALLATION: 'installation',
  INVENTORY: 'inventory',
  USER: 'user',
  CLIENT: 'client',
  INTEGRATION: 'integration'
}

/**
 * Create an audit log entry
 * @param {object} params - Audit log parameters
 */
export async function createAuditLog({
  clientId,
  userId,
  userName,
  eventType,
  entityType,
  entityId,
  entityName,
  action,
  previousState,
  newState,
  metadata = {},
  requestId,
  ipAddress,
  userAgent
}) {
  try {
    const auditEntry = {
      id: uuidv4(),
      clientId,
      userId,
      userName,
      eventType,
      entityType,
      entityId,
      entityName,
      action,
      previousState,
      newState,
      metadata,
      requestId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      createdAt: new Date()
    }

    // Log to client-specific database if clientId provided
    if (clientId) {
      const clientDb = await getClientDb(clientId)
      const auditCollection = clientDb.collection('audit_logs')
      await auditCollection.insertOne(auditEntry)
    }

    // Also log to main database for cross-tenant queries (admin)
    const mainDb = await getMainDb()
    const globalAuditCollection = mainDb.collection('global_audit_logs')
    await globalAuditCollection.insertOne(auditEntry)

    return auditEntry
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break business logic
    return null
  }
}

/**
 * Log entity creation
 */
export async function logCreate(clientId, userId, userName, entityType, entityId, entityData, requestId) {
  return createAuditLog({
    clientId,
    userId,
    userName,
    eventType: AUDIT_EVENTS.CREATE,
    entityType,
    entityId,
    entityName: entityData.name || entityData.title || entityData.invoiceNumber || entityId,
    action: `Created ${entityType}`,
    newState: entityData,
    requestId
  })
}

/**
 * Log entity update
 */
export async function logUpdate(clientId, userId, userName, entityType, entityId, previousState, newState, requestId) {
  return createAuditLog({
    clientId,
    userId,
    userName,
    eventType: AUDIT_EVENTS.UPDATE,
    entityType,
    entityId,
    entityName: newState.name || newState.title || entityId,
    action: `Updated ${entityType}`,
    previousState,
    newState,
    requestId
  })
}

/**
 * Log entity deletion
 */
export async function logDelete(clientId, userId, userName, entityType, entityId, entityData, requestId) {
  return createAuditLog({
    clientId,
    userId,
    userName,
    eventType: AUDIT_EVENTS.DELETE,
    entityType,
    entityId,
    entityName: entityData?.name || entityData?.title || entityId,
    action: `Deleted ${entityType}`,
    previousState: entityData,
    requestId
  })
}

/**
 * Log stage/status transition
 */
export async function logTransition(clientId, userId, userName, entityType, entityId, fromStage, toStage, requestId) {
  return createAuditLog({
    clientId,
    userId,
    userName,
    eventType: AUDIT_EVENTS.STAGE_TRANSITION,
    entityType,
    entityId,
    action: `${entityType} stage changed: ${fromStage} → ${toStage}`,
    previousState: { stage: fromStage },
    newState: { stage: toStage },
    requestId
  })
}

/**
 * Log payment
 */
export async function logPayment(clientId, userId, userName, invoiceId, paymentData, requestId) {
  return createAuditLog({
    clientId,
    userId,
    userName,
    eventType: AUDIT_EVENTS.PAYMENT_RECORDED,
    entityType: ENTITY_TYPES.PAYMENT,
    entityId: paymentData.id,
    action: `Payment recorded for invoice ${invoiceId}`,
    newState: paymentData,
    metadata: { invoiceId, amount: paymentData.amount },
    requestId
  })
}

/**
 * Log integration call
 */
export async function logIntegration(clientId, integrationType, payload, response, status, requestId) {
  return createAuditLog({
    clientId,
    eventType: AUDIT_EVENTS.INTEGRATION_CALL,
    entityType: ENTITY_TYPES.INTEGRATION,
    entityId: integrationType,
    action: `Integration call: ${integrationType}`,
    metadata: {
      integrationType,
      payload: JSON.stringify(payload).substring(0, 1000), // Truncate large payloads
      response: JSON.stringify(response).substring(0, 1000),
      status
    },
    requestId
  })
}

/**
 * Log admin access
 */
export async function logAdminAccess(adminUserId, adminUserName, targetClientId, action, requestId) {
  const mainDb = await getMainDb()
  const adminAuditCollection = mainDb.collection('admin_audit_logs')
  
  const entry = {
    id: uuidv4(),
    adminUserId,
    adminUserName,
    targetClientId,
    action,
    requestId,
    timestamp: new Date()
  }
  
  await adminAuditCollection.insertOne(entry)
  return entry
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(clientId, filters = {}, options = {}) {
  const { limit = 100, skip = 0, sortBy = 'timestamp', sortDir = -1 } = options
  
  const db = await getClientDb(clientId)
  const auditCollection = db.collection('audit_logs')
  
  const query = {}
  
  if (filters.entityType) query.entityType = filters.entityType
  if (filters.entityId) query.entityId = filters.entityId
  if (filters.eventType) query.eventType = filters.eventType
  if (filters.userId) query.userId = filters.userId
  if (filters.startDate) query.timestamp = { $gte: new Date(filters.startDate) }
  if (filters.endDate) query.timestamp = { ...query.timestamp, $lte: new Date(filters.endDate) }
  
  const logs = await auditCollection
    .find(query)
    .sort({ [sortBy]: sortDir })
    .skip(skip)
    .limit(limit)
    .toArray()
  
  const total = await auditCollection.countDocuments(query)
  
  return { logs, total, limit, skip }
}

export default {
  AUDIT_EVENTS,
  ENTITY_TYPES,
  createAuditLog,
  logCreate,
  logUpdate,
  logDelete,
  logTransition,
  logPayment,
  logIntegration,
  logAdminAccess,
  queryAuditLogs
}
