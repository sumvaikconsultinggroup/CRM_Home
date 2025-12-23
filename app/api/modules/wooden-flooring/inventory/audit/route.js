import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// ENTERPRISE AUDIT TRAIL
// =============================================
// Comprehensive audit logging for all inventory actions
// Tracks who, what, when, where for compliance
// Supports filtering by entity, user, action type
// Immutable log entries

const AUDIT_CATEGORIES = {
  stock: { label: 'Stock', color: 'bg-blue-100 text-blue-700' },
  grn: { label: 'GRN', color: 'bg-green-100 text-green-700' },
  challan: { label: 'Challan', color: 'bg-amber-100 text-amber-700' },
  transfer: { label: 'Transfer', color: 'bg-purple-100 text-purple-700' },
  adjustment: { label: 'Adjustment', color: 'bg-red-100 text-red-700' },
  reservation: { label: 'Reservation', color: 'bg-teal-100 text-teal-700' },
  valuation: { label: 'Valuation', color: 'bg-indigo-100 text-indigo-700' },
  system: { label: 'System', color: 'bg-slate-100 text-slate-700' }
}

const AUDIT_ACTIONS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  receive: 'Received',
  dispatch: 'Dispatched',
  deliver: 'Delivered',
  cancel: 'Cancelled',
  reverse: 'Reversed',
  reserve: 'Reserved',
  release: 'Released',
  fulfill: 'Fulfilled',
  adjust: 'Adjusted',
  transfer_out: 'Transferred Out',
  transfer_in: 'Transferred In',
  void: 'Voided',
  approve: 'Approved',
  reject: 'Rejected'
}

// GET - Fetch audit logs
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') // stock, grn, challan, transfer, etc.
    const entityId = searchParams.get('entityId')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const auditLog = db.collection('wf_inventory_audit')

    // Build query
    const query = {}
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = entityId
    if (action) query.action = action
    if (userId) query.userId = userId
    if (productId) query['metadata.productId'] = productId
    if (warehouseId && warehouseId !== 'all') query['metadata.warehouseId'] = warehouseId
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = fromDate
      if (toDate) query.createdAt.$lte = toDate
    }

    const logs = await auditLog
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    const totalCount = await auditLog.countDocuments(query)

    // Summary statistics
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          byCategory: { 
            $push: '$entityType' 
          },
          byAction: {
            $push: '$action'
          },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ]
    const summaryResult = await auditLog.aggregate(summaryPipeline).toArray()
    
    // Count by category and action
    const categoryCount = {}
    const actionCount = {}
    if (summaryResult[0]) {
      summaryResult[0].byCategory.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      })
      summaryResult[0].byAction.forEach(act => {
        actionCount[act] = (actionCount[act] || 0) + 1
      })
    }

    const summary = {
      total: totalCount,
      filtered: logs.length,
      byCategory: categoryCount,
      byAction: actionCount,
      uniqueUsers: summaryResult[0]?.uniqueUsers?.length || 0
    }

    return successResponse({
      logs: sanitizeDocuments(logs),
      summary,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + logs.length < totalCount
      },
      categories: AUDIT_CATEGORIES,
      actions: AUDIT_ACTIONS
    })
  } catch (error) {
    console.error('Audit GET Error:', error)
    return errorResponse('Failed to fetch audit logs', 500, error.message)
  }
}

// POST - Create audit log entry (internal use)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const {
      entityType,
      entityId,
      entityNumber,
      action,
      description,
      metadata = {},
      changes = {},
      ipAddress,
      userAgent
    } = body

    if (!entityType || !action) {
      return errorResponse('Entity type and action required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const auditLog = db.collection('wf_inventory_audit')

    const now = new Date()

    const entry = {
      id: uuidv4(),
      
      // Entity
      entityType,
      entityId,
      entityNumber,
      
      // Action
      action,
      actionLabel: AUDIT_ACTIONS[action] || action,
      description: description || `${AUDIT_ACTIONS[action] || action} ${entityType}`,
      
      // Changes (before/after for updates)
      changes,
      
      // Metadata
      metadata: {
        ...metadata,
        timestamp: now.toISOString()
      },
      
      // User
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role,
      
      // Request context
      ipAddress: ipAddress || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      
      // Timestamp
      createdAt: now.toISOString()
    }

    await auditLog.insertOne(entry)

    return successResponse({ message: 'Audit entry created', entry: sanitizeDocument(entry) }, 201)
  } catch (error) {
    console.error('Audit POST Error:', error)
    return errorResponse('Failed to create audit entry', 500, error.message)
  }
}
