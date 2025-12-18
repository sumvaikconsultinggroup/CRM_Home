/**
 * Request Context Management
 * Handles correlation IDs and request-level context
 */

import { v4 as uuidv4 } from 'uuid'

// Request context storage (using AsyncLocalStorage pattern)
let currentContext = null

/**
 * Generate a unique request ID
 */
export function generateRequestId() {
  return `req_${uuidv4()}`
}

/**
 * Create request context from incoming request
 */
export function createRequestContext(request, user = null) {
  const requestId = request.headers?.get('x-request-id') || generateRequestId()
  
  const context = {
    requestId,
    clientId: user?.clientId || user?.databaseName || null,
    userId: user?.id || null,
    userName: user?.name || user?.email || null,
    userRole: user?.role || null,
    ipAddress: request.headers?.get('x-forwarded-for') || 
               request.headers?.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers?.get('user-agent') || 'unknown',
    path: request.url || '',
    method: request.method || 'GET',
    timestamp: new Date()
  }
  
  currentContext = context
  return context
}

/**
 * Get current request context
 */
export function getRequestContext() {
  return currentContext || {
    requestId: generateRequestId(),
    clientId: null,
    userId: null,
    timestamp: new Date()
  }
}

/**
 * Clear request context (call at end of request)
 */
export function clearRequestContext() {
  currentContext = null
}

/**
 * Structured logger with context
 */
export function createLogger(context = null) {
  const ctx = context || getRequestContext()
  
  const formatLog = (level, message, data = {}) => {
    return {
      timestamp: new Date().toISOString(),
      level,
      requestId: ctx.requestId,
      clientId: ctx.clientId,
      userId: ctx.userId,
      message,
      ...data
    }
  }
  
  return {
    info: (message, data) => console.log(JSON.stringify(formatLog('INFO', message, data))),
    warn: (message, data) => console.warn(JSON.stringify(formatLog('WARN', message, data))),
    error: (message, data) => console.error(JSON.stringify(formatLog('ERROR', message, data))),
    debug: (message, data) => {
      if (process.env.DEBUG === 'true') {
        console.debug(JSON.stringify(formatLog('DEBUG', message, data)))
      }
    }
  }
}

/**
 * Error categorization
 */
export const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  BUSINESS_LOGIC: 'business_logic',
  INTEGRATION: 'integration',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  SYSTEM: 'system'
}

/**
 * Structured error creator
 */
export function createStructuredError(category, message, details = {}, originalError = null) {
  const ctx = getRequestContext()
  
  return {
    category,
    message,
    details,
    requestId: ctx.requestId,
    clientId: ctx.clientId,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
    stack: originalError?.stack || new Error().stack
  }
}

/**
 * Response with correlation ID
 */
export function addCorrelationHeaders(response) {
  const ctx = getRequestContext()
  response.headers.set('x-request-id', ctx.requestId)
  return response
}

export default {
  generateRequestId,
  createRequestContext,
  getRequestContext,
  clearRequestContext,
  createLogger,
  ERROR_CATEGORIES,
  createStructuredError,
  addCorrelationHeaders
}
