import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch service tickets
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('id')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const warrantyId = searchParams.get('warrantyId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_service_tickets')
    
    let query = {}
    if (ticketId) query.id = ticketId
    if (status) query.status = status
    if (category) query.category = category
    if (priority) query.priority = priority
    if (warrantyId) query.warrantyId = warrantyId

    const tickets = await collection.find(query).sort({ createdAt: -1 }).toArray()

    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      warranty: tickets.filter(t => t.isWarranty).length,
      chargeable: tickets.filter(t => !t.isWarranty).length,
      byCategory: {},
      avgResolutionTime: 0,
      slaBreach: tickets.filter(t => t.slaBreached).length
    }

    // Count by category
    tickets.forEach(t => {
      stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1
    })

    return successResponse({ tickets: sanitizeDocuments(tickets), stats })
  } catch (error) {
    console.error('DW Service GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch service tickets', 500, error.message)
  }
}

// POST - Create service ticket or update
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Assign technician
    if (action === 'assign') {
      const collection = db.collection('dw_service_tickets')
      
      const result = await collection.findOneAndUpdate(
        { id: body.ticketId },
        {
          $set: {
            assignedTo: body.technicianId,
            assignedName: body.technicianName || '',
            status: 'assigned',
            assignedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Ticket not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Start work
    if (action === 'start-work') {
      const collection = db.collection('dw_service_tickets')
      
      const result = await collection.findOneAndUpdate(
        { id: body.ticketId },
        {
          $set: {
            status: 'in-progress',
            workStartedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Ticket not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Resolve ticket
    if (action === 'resolve') {
      const collection = db.collection('dw_service_tickets')
      
      const ticket = await collection.findOne({ id: body.ticketId })
      if (!ticket) return errorResponse('Ticket not found', 404)

      const resolutionTime = ticket.createdAt 
        ? Math.round((new Date() - new Date(ticket.createdAt)) / (1000 * 60 * 60))
        : 0

      const result = await collection.findOneAndUpdate(
        { id: body.ticketId },
        {
          $set: {
            status: 'resolved',
            resolution: {
              description: body.resolution || '',
              rca: body.rca || '', // manufacturing-defect, installation-issue, customer-misuse, wear-tear
              partsUsed: body.partsUsed || [],
              laborHours: parseFloat(body.laborHours) || 0,
              photos: {
                before: body.beforePhotos || [],
                after: body.afterPhotos || []
              }
            },
            cost: {
              parts: parseFloat(body.partsCost) || 0,
              labor: parseFloat(body.laborCost) || 0,
              total: (parseFloat(body.partsCost) || 0) + (parseFloat(body.laborCost) || 0),
              charged: !ticket.isWarranty,
              invoiced: false
            },
            resolutionTime: resolutionTime,
            resolvedAt: new Date(),
            resolvedBy: user.id,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      return successResponse(sanitizeDocument(result))
    }

    // Add update/comment
    if (action === 'add-update') {
      const collection = db.collection('dw_service_tickets')
      
      const update = {
        id: uuidv4(),
        message: body.message || '',
        photos: body.photos || [],
        addedBy: user.id,
        addedAt: new Date()
      }

      const result = await collection.findOneAndUpdate(
        { id: body.ticketId },
        {
          $push: { updates: update },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Ticket not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Create new service ticket
    const collection = db.collection('dw_service_tickets')
    const warrantyCollection = db.collection('dw_warranties')

    // Check if under warranty
    let isWarranty = false
    let warrantyDetails = null
    
    if (body.orderId || body.openingId) {
      const warranty = await warrantyCollection.findOne({
        $or: [
          { orderId: body.orderId },
          { openingId: body.openingId }
        ],
        status: 'active',
        expiresAt: { $gt: new Date() }
      })
      
      if (warranty) {
        isWarranty = true
        warrantyDetails = {
          warrantyId: warranty.id,
          warrantyType: warranty.warrantyType,
          expiresAt: warranty.expiresAt
        }
      }
    }

    // Calculate SLA deadline based on priority
    const slaDurations = {
      critical: 4, // hours
      high: 24,
      medium: 48,
      low: 72
    }
    const priority = body.priority || 'medium'
    const slaDeadline = new Date(Date.now() + (slaDurations[priority] || 48) * 60 * 60 * 1000)

    const ticket = {
      id: uuidv4(),
      clientId: user.clientId,
      ticketNumber: `SVC-${Date.now()}`,
      
      // Links
      orderId: body.orderId || null,
      orderNumber: body.orderNumber || '',
      openingId: body.openingId || null,
      installationId: body.installationId || null,
      
      // Customer
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      siteAddress: body.siteAddress || '',
      
      // Issue details
      category: body.category || 'general', // alignment, leakage, roller, handle-lock, glass-crack, seal-failure, other
      subCategory: body.subCategory || '',
      description: body.description || '',
      priority: priority,
      
      // Photos
      photos: body.photos || [],
      
      // Warranty
      isWarranty: isWarranty,
      warrantyDetails: warrantyDetails,
      
      // SLA
      slaDeadline: slaDeadline,
      slaBreached: false,
      
      // Assignment
      assignedTo: null,
      assignedName: '',
      assignedAt: null,
      
      // Status
      status: 'open', // open, assigned, in-progress, resolved, closed, cancelled
      
      // Timeline
      workStartedAt: null,
      resolvedAt: null,
      closedAt: null,
      
      // Resolution
      resolution: null,
      cost: null,
      resolutionTime: null,
      
      // Updates/Comments
      updates: [],
      
      // Feedback
      customerFeedback: null,
      rating: null,
      
      reportedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(ticket)
    return successResponse(sanitizeDocument(ticket), 201)
  } catch (error) {
    console.error('DW Service POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create service ticket', 500, error.message)
  }
}

// PUT - Update service ticket
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Ticket ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_service_tickets')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Ticket not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Service PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update ticket', 500, error.message)
  }
}

// DELETE - Close/cancel ticket
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action') || 'close'

    if (!id) return errorResponse('Ticket ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_service_tickets')
    
    const status = action === 'cancel' ? 'cancelled' : 'closed'
    const result = await collection.findOneAndUpdate(
      { id },
      { 
        $set: { 
          status,
          [`${status}At`]: new Date(),
          [`${status}By`]: user.id,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Ticket not found', 404)
    return successResponse({ message: `Ticket ${status} successfully` })
  } catch (error) {
    console.error('DW Service DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to close ticket', 500, error.message)
  }
}
