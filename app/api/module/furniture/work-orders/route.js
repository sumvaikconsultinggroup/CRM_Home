import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate Work Order number
const generateWONumber = async (db) => {
  const workOrders = db.collection('furniture_work_orders')
  const count = await workOrders.countDocuments() + 1
  const year = new Date().getFullYear()
  return `WO-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch Work Orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const bomId = searchParams.get('bomId')
    const status = searchParams.get('status')
    const workCenter = searchParams.get('workCenter')
    const assignedTo = searchParams.get('assignedTo')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const view = searchParams.get('view') // kanban, list, calendar

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('furniture_work_orders')

    if (id) {
      const wo = await workOrders.findOne({ id })
      if (!wo) return errorResponse('Work Order not found', 404)
      return successResponse(sanitizeDocument(wo))
    }

    const query = { isActive: true }
    if (orderId) query.orderId = orderId
    if (bomId) query.bomId = bomId
    if (status) query.status = status
    if (workCenter) query.workCenter = workCenter
    if (assignedTo) query.assignedTo = assignedTo
    if (dateFrom || dateTo) {
      query.scheduledStart = {}
      if (dateFrom) query.scheduledStart.$gte = dateFrom
      if (dateTo) query.scheduledStart.$lte = dateTo
    }

    const items = await workOrders.find(query).sort({ priority: -1, scheduledStart: 1 }).toArray()

    // Get stats by status
    const statusStats = await workOrders.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } }}
    ]).toArray()

    // Get stats by work center
    const workCenterStats = await workOrders.aggregate([
      { $match: { isActive: true, status: { $nin: ['completed', 'cancelled'] } } },
      { $group: { _id: '$workCenter', count: { $sum: 1 }, totalHours: { $sum: '$estimatedHours' } }}
    ]).toArray()

    // For kanban view, group by status
    let kanbanData = null
    if (view === 'kanban') {
      kanbanData = {
        pending: items.filter(i => i.status === 'pending'),
        scheduled: items.filter(i => i.status === 'scheduled'),
        in_progress: items.filter(i => i.status === 'in_progress'),
        quality_check: items.filter(i => i.status === 'quality_check'),
        completed: items.filter(i => i.status === 'completed').slice(0, 10)
      }
    }

    return successResponse({
      workOrders: sanitizeDocuments(items),
      kanbanData,
      statusStats: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      workCenterStats: workCenterStats.reduce((acc, s) => ({ ...acc, [s._id]: s }), {})
    })
  } catch (error) {
    console.error('Furniture Work Orders GET Error:', error)
    return errorResponse('Failed to fetch work orders', 500, error.message)
  }
}

// POST - Create Work Order (typically from BOM)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('furniture_work_orders')
    const boms = db.collection('furniture_boms')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()

    // If creating from BOM, generate work orders for each operation
    if (body.fromBomId) {
      const bom = await boms.findOne({ id: body.fromBomId })
      if (!bom) return errorResponse('BOM not found', 404)
      if (bom.status !== 'approved' && bom.status !== 'in_production') {
        return errorResponse('BOM must be approved first', 400)
      }

      const createdWOs = []
      let scheduledDate = new Date(body.startDate || now)

      for (const operation of bom.operations) {
        const woId = uuidv4()
        const woNumber = await generateWONumber(db)

        const wo = {
          id: woId,
          woNumber,
          // Links
          bomId: bom.id,
          bomNumber: bom.bomNumber,
          orderId: bom.orderId,
          productId: bom.productId,
          productName: bom.productName,
          // Operation details
          operationId: operation.operationId,
          operationName: operation.operationName,
          operationSequence: operation.sequence,
          workCenter: operation.workCenter,
          description: operation.description,
          instructions: operation.instructions,
          qualityChecks: operation.qualityChecks,
          // Quantity
          quantity: bom.quantity,
          completedQty: 0,
          rejectedQty: 0,
          // Time
          estimatedHours: operation.estimatedHours * bom.quantity,
          actualHours: 0,
          setupTime: operation.setupTime,
          // Materials for this operation
          materials: body.allocateMaterials ? bom.materials.filter(m => m.operationId === operation.operationId) : [],
          // Scheduling
          scheduledStart: scheduledDate.toISOString(),
          scheduledEnd: new Date(scheduledDate.getTime() + operation.estimatedHours * bom.quantity * 60 * 60 * 1000).toISOString(),
          actualStart: null,
          actualEnd: null,
          // Assignment
          assignedTo: body.assignedTo || null,
          assignedTeam: body.assignedTeam || null,
          // Priority
          priority: body.priority || 'normal', // low, normal, high, urgent
          // Status
          status: 'pending', // pending, scheduled, in_progress, paused, quality_check, completed, cancelled
          // Progress tracking
          progressPercent: 0,
          checkpoints: [],
          // Issues
          issues: [],
          // Notes
          notes: '',
          // Status history
          statusHistory: [{
            status: 'pending',
            timestamp: now,
            by: user.id,
            notes: `Created from BOM ${bom.bomNumber}`
          }],
          isActive: true,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await workOrders.insertOne(wo)
        createdWOs.push(wo)

        // Move to next scheduled date
        scheduledDate = new Date(wo.scheduledEnd)
      }

      // Update BOM status
      await boms.updateOne(
        { id: body.fromBomId },
        {
          $set: { status: 'in_production', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'in_production',
              timestamp: now,
              by: user.id,
              notes: `${createdWOs.length} work orders created`
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'work_orders.batch_created',
        entityType: 'bom',
        entityId: body.fromBomId,
        data: { count: createdWOs.length, woNumbers: createdWOs.map(w => w.woNumber) },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: `Created ${createdWOs.length} work orders`,
        workOrders: sanitizeDocuments(createdWOs)
      }, 201)
    }

    // Create single work order
    const woId = uuidv4()
    const woNumber = await generateWONumber(db)

    const wo = {
      id: woId,
      woNumber,
      // Links
      bomId: body.bomId || null,
      orderId: body.orderId || null,
      productId: body.productId || null,
      productName: body.productName || '',
      // Operation
      operationName: body.operationName,
      workCenter: body.workCenter || 'general',
      description: body.description || '',
      instructions: body.instructions || '',
      qualityChecks: body.qualityChecks || [],
      // Quantity
      quantity: body.quantity || 1,
      completedQty: 0,
      rejectedQty: 0,
      // Time
      estimatedHours: body.estimatedHours || 0,
      actualHours: 0,
      // Scheduling
      scheduledStart: body.scheduledStart || null,
      scheduledEnd: body.scheduledEnd || null,
      actualStart: null,
      actualEnd: null,
      // Assignment
      assignedTo: body.assignedTo || null,
      assignedTeam: body.assignedTeam || null,
      priority: body.priority || 'normal',
      // Status
      status: 'pending',
      progressPercent: 0,
      checkpoints: [],
      issues: [],
      notes: body.notes || '',
      statusHistory: [{
        status: 'pending',
        timestamp: now,
        by: user.id,
        notes: 'Work order created'
      }],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await workOrders.insertOne(wo)

    return successResponse(sanitizeDocument(wo), 201)
  } catch (error) {
    console.error('Furniture Work Orders POST Error:', error)
    return errorResponse('Failed to create work order', 500, error.message)
  }
}

// PUT - Update Work Order
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Work Order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('furniture_work_orders')
    const events = db.collection('furniture_events')

    const wo = await workOrders.findOne({ id })
    if (!wo) return errorResponse('Work Order not found', 404)

    const now = new Date().toISOString()

    // Handle status transitions
    if (action === 'start') {
      if (!['pending', 'scheduled'].includes(wo.status)) {
        return errorResponse('Cannot start work order in current status', 400)
      }

      await workOrders.updateOne(
        { id },
        {
          $set: { status: 'in_progress', actualStart: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'in_progress',
              timestamp: now,
              by: user.id,
              notes: 'Work started'
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'work_order.started',
        entityType: 'work_order',
        entityId: id,
        data: { woNumber: wo.woNumber },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Work order started', status: 'in_progress' })
    }

    if (action === 'pause') {
      if (wo.status !== 'in_progress') {
        return errorResponse('Can only pause in-progress work orders', 400)
      }

      await workOrders.updateOne(
        { id },
        {
          $set: { status: 'paused', pausedAt: now, pauseReason: body.reason || '', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'paused',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Work paused'
            }
          }
        }
      )

      return successResponse({ message: 'Work order paused', status: 'paused' })
    }

    if (action === 'resume') {
      if (wo.status !== 'paused') {
        return errorResponse('Can only resume paused work orders', 400)
      }

      await workOrders.updateOne(
        { id },
        {
          $set: { status: 'in_progress', resumedAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'in_progress',
              timestamp: now,
              by: user.id,
              notes: 'Work resumed'
            }
          }
        }
      )

      return successResponse({ message: 'Work order resumed', status: 'in_progress' })
    }

    if (action === 'submit_for_qc') {
      if (wo.status !== 'in_progress') {
        return errorResponse('Work must be in progress', 400)
      }

      await workOrders.updateOne(
        { id },
        {
          $set: { 
            status: 'quality_check', 
            submittedForQC: now,
            completedQty: body.completedQty || wo.quantity,
            actualHours: body.actualHours || wo.actualHours,
            progressPercent: 100,
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'quality_check',
              timestamp: now,
              by: user.id,
              notes: `Submitted for QC: ${body.completedQty || wo.quantity} units`
            }
          }
        }
      )

      return successResponse({ message: 'Submitted for QC', status: 'quality_check' })
    }

    if (action === 'qc_pass') {
      if (wo.status !== 'quality_check') {
        return errorResponse('Work order must be in QC', 400)
      }

      await workOrders.updateOne(
        { id },
        {
          $set: { 
            status: 'completed', 
            actualEnd: now,
            qcResult: 'pass',
            qcNotes: body.notes || '',
            qcBy: user.id,
            qcAt: now,
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'completed',
              timestamp: now,
              by: user.id,
              notes: 'QC Passed'
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'work_order.completed',
        entityType: 'work_order',
        entityId: id,
        data: { woNumber: wo.woNumber, completedQty: wo.completedQty },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'QC Passed - Work order completed', status: 'completed' })
    }

    if (action === 'qc_fail') {
      if (wo.status !== 'quality_check') {
        return errorResponse('Work order must be in QC', 400)
      }

      await workOrders.updateOne(
        { id },
        {
          $set: { 
            status: 'in_progress',
            qcResult: 'fail',
            qcNotes: body.notes || '',
            qcBy: user.id,
            qcAt: now,
            rejectedQty: (wo.rejectedQty || 0) + (body.rejectedQty || 0),
            progressPercent: 80,
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'in_progress',
              timestamp: now,
              by: user.id,
              notes: `QC Failed: ${body.notes || 'Rework required'}`
            },
            issues: {
              id: uuidv4(),
              type: 'qc_failure',
              description: body.notes || 'QC failed - rework required',
              rejectedQty: body.rejectedQty || 0,
              reportedBy: user.id,
              reportedAt: now
            }
          }
        }
      )

      return successResponse({ message: 'QC Failed - Sent for rework', status: 'in_progress' })
    }

    if (action === 'update_progress') {
      const { progressPercent, completedQty, actualHours, notes } = body

      await workOrders.updateOne(
        { id },
        {
          $set: { 
            progressPercent: progressPercent || wo.progressPercent,
            completedQty: completedQty || wo.completedQty,
            actualHours: actualHours || wo.actualHours,
            updatedAt: now 
          },
          $push: {
            checkpoints: {
              timestamp: now,
              progressPercent,
              completedQty,
              actualHours,
              notes: notes || '',
              by: user.id
            }
          }
        }
      )

      return successResponse({ message: 'Progress updated' })
    }

    if (action === 'report_issue') {
      const issue = {
        id: uuidv4(),
        type: body.issueType || 'general',
        description: body.description,
        severity: body.severity || 'medium',
        photos: body.photos || [],
        status: 'open',
        reportedBy: user.id,
        reportedAt: now
      }

      await workOrders.updateOne(
        { id },
        {
          $push: { issues: issue },
          $set: { updatedAt: now }
        }
      )

      return successResponse({ message: 'Issue reported', issue })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await workOrders.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Work Orders PUT Error:', error)
    return errorResponse('Failed to update work order', 500, error.message)
  }
}

// DELETE - Cancel Work Order
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Work Order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('furniture_work_orders')

    const wo = await workOrders.findOne({ id })
    if (!wo) return errorResponse('Work Order not found', 404)

    if (wo.status === 'completed') {
      return errorResponse('Cannot cancel completed work order', 400)
    }

    await workOrders.updateOne(
      { id },
      {
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date().toISOString(), 
          cancelledBy: user.id,
          isActive: false
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            by: user.id,
            notes: 'Work order cancelled'
          }
        }
      }
    )

    return successResponse({ message: 'Work order cancelled' })
  } catch (error) {
    console.error('Furniture Work Orders DELETE Error:', error)
    return errorResponse('Failed to cancel work order', 500, error.message)
  }
}
