/**
 * Audit Logs API
 * Query and view audit logs for a client
 */

import { queryAuditLogs, AUDIT_EVENTS, ENTITY_TYPES } from '@/lib/observability/audit-logger'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { verifyToken } from '@/lib/utils/auth'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * GET - Query audit logs
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }
    
    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || !user.clientId) {
      return errorResponse('Invalid token', 401)
    }
    
    const { searchParams } = new URL(request.url)
    
    const filters = {
      entityType: searchParams.get('entityType'),
      entityId: searchParams.get('entityId'),
      eventType: searchParams.get('eventType'),
      userId: searchParams.get('userId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    }
    
    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key]
    })
    
    const options = {
      limit: parseInt(searchParams.get('limit') || '100'),
      skip: parseInt(searchParams.get('skip') || '0'),
      sortBy: searchParams.get('sortBy') || 'timestamp',
      sortDir: searchParams.get('sortDir') === 'asc' ? 1 : -1
    }
    
    const result = await queryAuditLogs(user.clientId, filters, options)
    
    return successResponse({
      ...result,
      availableEventTypes: Object.values(AUDIT_EVENTS),
      availableEntityTypes: Object.values(ENTITY_TYPES)
    })
    
  } catch (error) {
    console.error('Audit Logs API Error:', error)
    return errorResponse('Failed to query audit logs', 500, error.message)
  }
}
