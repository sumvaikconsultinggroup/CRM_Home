import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const view = searchParams.get('view')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('doors_windows_work_orders')

    if (id) {
      const wo = await workOrders.findOne({ id })
      if (!wo) return errorResponse('Work order not found', 404)
      return successResponse(sanitizeDocument(wo))
    }

    const query = { isActive: true }
    if (status) query.status = status

    const woList = await workOrders.find(query).sort({ createdAt: -1 }).toArray()

    // Return kanban format if requested
    if (view === 'kanban') {
      const kanban = {
        pending: woList.filter(w => w.status === 'pending'),
        cutting: woList.filter(w => w.status === 'cutting'),
        welding: woList.filter(w => w.status === 'welding'),
        assembly: woList.filter(w => w.status === 'assembly'),
        glazing: woList.filter(w => w.status === 'glazing'),
        quality: woList.filter(w => w.status === 'quality'),
        completed: woList.filter(w => w.status === 'completed')
      }
      return successResponse({ workOrders: woList, kanban })
    }

    return successResponse({ workOrders: sanitizeDocuments(woList) })
  } catch (error) {
    console.error('Doors-Windows Work Orders GET Error:', error)
    return errorResponse('Failed to fetch work orders', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('doors_windows_work_orders')
    const counters = db.collection('counters')

    const counter = await counters.findOneAndUpdate(
      { _id: 'doors_windows_work_order' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
    const woNumber = `DW-WO-${String(counter.seq || 1).padStart(5, '0')}`

    const now = new Date().toISOString()

    const workOrder = {
      id: uuidv4(),
      workOrderNumber: woNumber,
      orderId: body.orderId,
      lineItemId: body.lineItemId,
      productType: body.productType,
      productName: body.productName,
      dimensions: body.dimensions,
      specifications: body.specifications,
      quantity: body.quantity || 1,
      status: 'pending',
      priority: body.priority || 'normal',
      assignedTo: body.assignedTo,
      startDate: body.startDate,
      dueDate: body.dueDate,
      stages: [
        { name: 'Cutting', status: 'pending', startedAt: null, completedAt: null },
        { name: 'Welding', status: 'pending', startedAt: null, completedAt: null },
        { name: 'Assembly', status: 'pending', startedAt: null, completedAt: null },
        { name: 'Glazing', status: 'pending', startedAt: null, completedAt: null },
        { name: 'Quality Check', status: 'pending', startedAt: null, completedAt: null }
      ],
      notes: body.notes || '',
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await workOrders.insertOne(workOrder)
    return successResponse(sanitizeDocument(workOrder), 201)
  } catch (error) {
    console.error('Doors-Windows Work Orders POST Error:', error)
    return errorResponse('Failed to create work order', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Work Order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('doors_windows_work_orders')

    const now = new Date().toISOString()

    if (action === 'update_stage') {
      const { stageName, status } = body
      const wo = await workOrders.findOne({ id })
      if (!wo) return errorResponse('Work order not found', 404)

      const stages = wo.stages.map(s => {
        if (s.name === stageName) {
          return {
            ...s,
            status,
            startedAt: status === 'in_progress' ? now : s.startedAt,
            completedAt: status === 'completed' ? now : s.completedAt
          }
        }
        return s
      })

      // Update overall status based on stages
      let overallStatus = 'pending'
      if (stages.some(s => s.status === 'in_progress')) {
        overallStatus = stageName.toLowerCase().replace(' ', '_')
      }
      if (stages.every(s => s.status === 'completed')) {
        overallStatus = 'completed'
      }

      await workOrders.updateOne(
        { id },
        { $set: { stages, status: overallStatus, updatedAt: now } }
      )

      return successResponse({ message: 'Stage updated' })
    }

    updateData.updatedAt = now

    const result = await workOrders.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Work order not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Work Orders PUT Error:', error)
    return errorResponse('Failed to update work order', 500, error.message)
  }
}
