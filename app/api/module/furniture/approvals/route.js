import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch approvals
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const entityType = searchParams.get('entityType') // design_brief, quote, discount, etc.
    const entityId = searchParams.get('entityId')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const myApprovals = searchParams.get('myApprovals')
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const approvals = db.collection('furniture_approvals')

    if (id) {
      const approval = await approvals.findOne({ id })
      if (!approval) return errorResponse('Approval not found', 404)
      return successResponse(sanitizeDocument(approval))
    }

    const query = {}
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = entityId
    if (status) query.status = status
    if (assignedTo) query.assignedTo = assignedTo
    if (myApprovals === 'true') {
      query.$or = [
        { assignedTo: user.id },
        { 'approvers.userId': user.id }
      ]
    }

    const skip = (page - 1) * limit

    const [items, total, pendingCount] = await Promise.all([
      approvals.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      approvals.countDocuments(query),
      approvals.countDocuments({ status: 'pending', assignedTo: user.id })
    ])

    return successResponse({
      approvals: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      pendingForMe: pendingCount
    })
  } catch (error) {
    console.error('Furniture Approvals GET Error:', error)
    return errorResponse('Failed to fetch approvals', 500, error.message)
  }
}

// POST - Create approval request
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const approvals = db.collection('furniture_approvals')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const approvalId = uuidv4()

    const approval = {
      id: approvalId,
      // What is being approved
      entityType: body.entityType, // design_brief, quote, discount_request, order, work_order
      entityId: body.entityId,
      entityNumber: body.entityNumber || '',
      // Approval type
      approvalType: body.approvalType || 'standard', // standard, multi_level, parallel
      // Levels for multi-level approval
      levels: body.levels || [{
        level: 1,
        name: 'Primary Approval',
        approvers: body.approvers || [body.assignedTo],
        requiredCount: 1, // Number of approvers needed
        status: 'pending'
      }],
      currentLevel: 1,
      // Single approver (simple case)
      assignedTo: body.assignedTo || null,
      // Request details
      title: body.title || `Approval Request - ${body.entityType}`,
      description: body.description || '',
      requestedBy: user.id,
      requestedAt: now,
      // For discount approvals
      discountDetails: body.discountDetails || null,
      // Priority
      priority: body.priority || 'normal',
      dueDate: body.dueDate || null,
      // Status
      status: 'pending',
      // History
      history: [{
        action: 'created',
        by: user.id,
        at: now,
        notes: 'Approval request created'
      }],
      comments: [],
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await approvals.insertOne(approval)

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'approval.requested',
      entityType: body.entityType,
      entityId: body.entityId,
      data: { approvalId, assignedTo: approval.assignedTo, title: approval.title },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(approval), 201)
  } catch (error) {
    console.error('Furniture Approvals POST Error:', error)
    return errorResponse('Failed to create approval', 500, error.message)
  }
}

// PUT - Process approval (approve/reject)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, notes, conditions } = body

    if (!id) return errorResponse('Approval ID required', 400)
    if (!action || !['approve', 'reject', 'request_info', 'delegate', 'escalate'].includes(action)) {
      return errorResponse('Valid action required (approve, reject, request_info, delegate, escalate)', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const approvals = db.collection('furniture_approvals')
    const events = db.collection('furniture_events')

    const approval = await approvals.findOne({ id })
    if (!approval) return errorResponse('Approval not found', 404)

    if (approval.status !== 'pending') {
      return errorResponse('Approval already processed', 400)
    }

    const now = new Date().toISOString()
    let newStatus = approval.status
    let eventType = ''

    switch (action) {
      case 'approve':
        // Check if multi-level and more levels pending
        if (approval.approvalType === 'multi_level' && approval.currentLevel < approval.levels.length) {
          // Move to next level
          const updatedLevels = [...approval.levels]
          updatedLevels[approval.currentLevel - 1].status = 'approved'
          updatedLevels[approval.currentLevel - 1].approvedBy = user.id
          updatedLevels[approval.currentLevel - 1].approvedAt = now

          await approvals.updateOne(
            { id },
            {
              $set: {
                levels: updatedLevels,
                currentLevel: approval.currentLevel + 1,
                assignedTo: updatedLevels[approval.currentLevel]?.approvers?.[0] || null,
                updatedAt: now
              },
              $push: {
                history: {
                  action: 'level_approved',
                  level: approval.currentLevel,
                  by: user.id,
                  at: now,
                  notes: notes || `Level ${approval.currentLevel} approved`
                }
              }
            }
          )

          return successResponse({ message: 'Level approved, moved to next level', nextLevel: approval.currentLevel + 1 })
        }

        // Final approval
        newStatus = 'approved'
        eventType = 'approval.approved'
        break

      case 'reject':
        newStatus = 'rejected'
        eventType = 'approval.rejected'
        break

      case 'request_info':
        newStatus = 'info_requested'
        eventType = 'approval.info_requested'
        break

      case 'delegate':
        if (!body.delegateTo) return errorResponse('delegateTo required', 400)
        
        await approvals.updateOne(
          { id },
          {
            $set: { assignedTo: body.delegateTo, updatedAt: now },
            $push: {
              history: {
                action: 'delegated',
                from: user.id,
                to: body.delegateTo,
                at: now,
                notes: notes || 'Delegated'
              }
            }
          }
        )

        return successResponse({ message: 'Approval delegated' })

      case 'escalate':
        if (!body.escalateTo) return errorResponse('escalateTo required', 400)
        
        await approvals.updateOne(
          { id },
          {
            $set: { 
              assignedTo: body.escalateTo, 
              priority: 'high',
              escalated: true,
              escalatedAt: now,
              updatedAt: now 
            },
            $push: {
              history: {
                action: 'escalated',
                from: user.id,
                to: body.escalateTo,
                at: now,
                notes: notes || 'Escalated'
              }
            }
          }
        )

        return successResponse({ message: 'Approval escalated' })
    }

    // Update approval
    await approvals.updateOne(
      { id },
      {
        $set: {
          status: newStatus,
          processedBy: user.id,
          processedAt: now,
          approvalConditions: conditions || null,
          updatedAt: now
        },
        $push: {
          history: {
            action: action,
            by: user.id,
            at: now,
            notes: notes || `${action}`
          }
        }
      }
    )

    // Update the source entity
    const entityCollectionMap = {
      design_brief: 'furniture_design_briefs',
      quote: 'furniture_quotes',
      discount_request: 'furniture_discount_requests',
      order: 'furniture_orders',
      work_order: 'furniture_work_orders'
    }

    const entityCollection = entityCollectionMap[approval.entityType]
    if (entityCollection) {
      const statusMap = {
        approved: `${approval.entityType === 'design_brief' ? 'internal_approved' : 'approved'}`,
        rejected: 'rejected'
      }

      if (statusMap[newStatus]) {
        await db.collection(entityCollection).updateOne(
          { id: approval.entityId },
          {
            $set: {
              status: statusMap[newStatus],
              [`${action}At`]: now,
              [`${action}By`]: user.id,
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: statusMap[newStatus],
                timestamp: now,
                by: user.id,
                notes: notes || `${action} via approval ${id}`
              }
            }
          }
        )
      }
    }

    // Emit event
    if (eventType) {
      await events.insertOne({
        id: uuidv4(),
        type: eventType,
        entityType: approval.entityType,
        entityId: approval.entityId,
        data: { approvalId: id, action, processedBy: user.id },
        userId: user.id,
        timestamp: now
      })
    }

    return successResponse({ message: `Approval ${action}ed`, status: newStatus })
  } catch (error) {
    console.error('Furniture Approvals PUT Error:', error)
    return errorResponse('Failed to process approval', 500, error.message)
  }
}
