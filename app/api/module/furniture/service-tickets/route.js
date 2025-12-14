import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate service ticket number
const generateTicketNumber = async (db) => {
  const tickets = db.collection('furniture_service_tickets')
  const count = await tickets.countDocuments() + 1
  const year = new Date().getFullYear()
  return `SRV-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch service/warranty tickets
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const ticketType = searchParams.get('ticketType')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tickets = db.collection('furniture_service_tickets')

    if (id) {
      const ticket = await tickets.findOne({ id })
      if (!ticket) return errorResponse('Ticket not found', 404)
      return successResponse(sanitizeDocument(ticket))
    }

    const query = { isActive: true }
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (ticketType) query.ticketType = ticketType
    if (priority) query.priority = priority
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts, priorityCounts] = await Promise.all([
      tickets.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      tickets.countDocuments(query),
      tickets.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      tickets.aggregate([
        { $match: { isActive: true, status: { $nin: ['resolved', 'closed'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]).toArray()
    ])

    return successResponse({
      tickets: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      priorityCounts: priorityCounts.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {})
    })
  } catch (error) {
    console.error('Furniture Service GET Error:', error)
    return errorResponse('Failed to fetch tickets', 500, error.message)
  }
}

// POST - Create service/warranty ticket
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tickets = db.collection('furniture_service_tickets')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const ticketId = uuidv4()
    const ticketNumber = await generateTicketNumber(db)

    // Get order info if linked
    let orderInfo = {}
    if (body.orderId) {
      const order = await db.collection('furniture_orders').findOne({ id: body.orderId })
      if (order) {
        orderInfo = {
          orderNumber: order.orderNumber,
          customer: order.customer,
          orderDate: order.createdAt
        }
      }
    }

    // Check warranty status
    let warrantyStatus = 'unknown'
    if (orderInfo.orderDate) {
      const orderDate = new Date(orderInfo.orderDate)
      const warrantyPeriod = body.warrantyPeriodMonths || 12
      const warrantyEnd = new Date(orderDate)
      warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyPeriod)
      warrantyStatus = new Date() <= warrantyEnd ? 'in_warranty' : 'out_of_warranty'
    }

    const ticket = {
      id: ticketId,
      ticketNumber,
      ticketType: body.ticketType || 'service', // service, warranty, complaint, feedback, exchange, return
      // Subject and description
      subject: body.subject,
      description: body.description,
      // Links
      orderId: body.orderId || null,
      orderNumber: orderInfo.orderNumber || body.orderNumber || null,
      installationId: body.installationId || null,
      // Customer
      customer: body.customer || orderInfo.customer || {},
      // Issue details
      affectedItems: body.affectedItems || [],
      issueCategory: body.issueCategory || 'general', // manufacturing_defect, damage_in_transit, installation_issue, wear_tear, customer_damage, other
      // Warranty
      warrantyStatus,
      isWarrantyClaim: body.isWarrantyClaim || false,
      // Priority and status
      priority: body.priority || 'medium', // low, medium, high, urgent
      status: 'open', // open, in_progress, awaiting_parts, awaiting_customer, resolved, closed, escalated
      // Assignment
      assignedTo: body.assignedTo || null,
      assignedTeam: body.assignedTeam || null,
      // Resolution
      resolutionType: null, // repair, replace, refund, none
      resolutionNotes: '',
      resolutionCost: 0,
      // SLA
      slaTarget: body.slaTarget || 48, // hours
      slaDeadline: new Date(Date.now() + (body.slaTarget || 48) * 60 * 60 * 1000).toISOString(),
      // Attachments and photos
      attachments: body.attachments || [],
      photos: body.photos || [],
      // Communication log
      communications: [{
        id: uuidv4(),
        type: 'created',
        message: `Ticket created: ${body.subject}`,
        by: user.id,
        at: now
      }],
      // Site visit
      siteVisitRequired: body.siteVisitRequired || false,
      siteVisitScheduled: null,
      // Notes
      notes: body.notes || '',
      // Status history
      statusHistory: [{
        status: 'open',
        timestamp: now,
        by: user.id,
        notes: 'Ticket created'
      }],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await tickets.insertOne(ticket)

    await events.insertOne({
      id: uuidv4(),
      type: 'service_ticket.created',
      entityType: 'service_ticket',
      entityId: ticketId,
      data: { ticketNumber, subject: ticket.subject, ticketType: ticket.ticketType },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(ticket), 201)
  } catch (error) {
    console.error('Furniture Service POST Error:', error)
    return errorResponse('Failed to create ticket', 500, error.message)
  }
}

// PUT - Update service ticket
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Ticket ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tickets = db.collection('furniture_service_tickets')
    const events = db.collection('furniture_events')

    const ticket = await tickets.findOne({ id })
    if (!ticket) return errorResponse('Ticket not found', 404)

    const now = new Date().toISOString()

    // Handle status changes
    if (action === 'change_status') {
      const { newStatus, notes } = body

      await tickets.updateOne(
        { id },
        {
          $set: { status: newStatus, updatedAt: now },
          $push: {
            statusHistory: {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: notes || `Status changed to ${newStatus}`
            },
            communications: {
              id: uuidv4(),
              type: 'status_change',
              message: `Status changed to ${newStatus}${notes ? ': ' + notes : ''}`,
              by: user.id,
              at: now
            }
          }
        }
      )

      return successResponse({ message: 'Status updated', newStatus })
    }

    // Assign ticket
    if (action === 'assign') {
      const { assignedTo, assignedTeam } = body

      await tickets.updateOne(
        { id },
        {
          $set: { assignedTo, assignedTeam, updatedAt: now },
          $push: {
            communications: {
              id: uuidv4(),
              type: 'assigned',
              message: `Ticket assigned to ${assignedTo || assignedTeam}`,
              by: user.id,
              at: now
            }
          }
        }
      )

      return successResponse({ message: 'Ticket assigned' })
    }

    // Add communication/note
    if (action === 'add_communication') {
      const { message, communicationType, isCustomerVisible } = body

      const comm = {
        id: uuidv4(),
        type: communicationType || 'note',
        message,
        isCustomerVisible: isCustomerVisible || false,
        by: user.id,
        at: now
      }

      await tickets.updateOne(
        { id },
        { $push: { communications: comm }, $set: { updatedAt: now } }
      )

      return successResponse({ message: 'Communication added', communication: comm })
    }

    // Schedule site visit
    if (action === 'schedule_site_visit') {
      const { visitDate, visitTime, assignedTechnician } = body

      await tickets.updateOne(
        { id },
        {
          $set: {
            siteVisitRequired: true,
            siteVisitScheduled: { date: visitDate, time: visitTime, technician: assignedTechnician },
            updatedAt: now
          },
          $push: {
            communications: {
              id: uuidv4(),
              type: 'site_visit_scheduled',
              message: `Site visit scheduled for ${visitDate} at ${visitTime}`,
              by: user.id,
              at: now
            }
          }
        }
      )

      return successResponse({ message: 'Site visit scheduled' })
    }

    // Resolve ticket
    if (action === 'resolve') {
      const { resolutionType, resolutionNotes, resolutionCost } = body

      await tickets.updateOne(
        { id },
        {
          $set: {
            status: 'resolved',
            resolutionType,
            resolutionNotes: resolutionNotes || '',
            resolutionCost: resolutionCost || 0,
            resolvedAt: now,
            resolvedBy: user.id,
            updatedAt: now
          },
          $push: {
            statusHistory: {
              status: 'resolved',
              timestamp: now,
              by: user.id,
              notes: `Resolved: ${resolutionType}`
            },
            communications: {
              id: uuidv4(),
              type: 'resolved',
              message: `Ticket resolved: ${resolutionType}. ${resolutionNotes || ''}`,
              by: user.id,
              at: now
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'service_ticket.resolved',
        entityType: 'service_ticket',
        entityId: id,
        data: { ticketNumber: ticket.ticketNumber, resolutionType },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Ticket resolved', status: 'resolved' })
    }

    // Escalate ticket
    if (action === 'escalate') {
      const { escalationReason, escalateTo } = body

      await tickets.updateOne(
        { id },
        {
          $set: { status: 'escalated', priority: 'urgent', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'escalated',
              timestamp: now,
              by: user.id,
              notes: escalationReason
            },
            communications: {
              id: uuidv4(),
              type: 'escalated',
              message: `Ticket escalated to ${escalateTo}: ${escalationReason}`,
              by: user.id,
              at: now
            }
          }
        }
      )

      return successResponse({ message: 'Ticket escalated', status: 'escalated' })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await tickets.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Service PUT Error:', error)
    return errorResponse('Failed to update ticket', 500, error.message)
  }
}

// DELETE - Delete/close ticket
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Ticket ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tickets = db.collection('furniture_service_tickets')

    await tickets.updateOne(
      { id },
      {
        $set: { 
          isActive: false, 
          status: 'closed',
          closedAt: new Date().toISOString(), 
          closedBy: user.id 
        },
        $push: {
          statusHistory: {
            status: 'closed',
            timestamp: new Date().toISOString(),
            by: user.id,
            notes: 'Ticket closed'
          }
        }
      }
    )

    return successResponse({ message: 'Ticket closed' })
  } catch (error) {
    console.error('Furniture Service DELETE Error:', error)
    return errorResponse('Failed to close ticket', 500, error.message)
  }
}
