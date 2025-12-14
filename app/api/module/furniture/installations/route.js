import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate installation number
const generateInstallationNumber = async (db) => {
  const installations = db.collection('furniture_installations')
  const count = await installations.countDocuments() + 1
  const year = new Date().getFullYear()
  return `INS-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch installations and delivery schedules
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const type = searchParams.get('type') // delivery, installation, both
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') || 'scheduledDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('furniture_installations')

    if (id) {
      const installation = await installations.findOne({ id })
      if (!installation) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(installation))
    }

    const query = { isActive: true }
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (type) query.type = type
    if (search) {
      query.$or = [
        { installationNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ]
    }
    if (dateFrom || dateTo) {
      query.scheduledDate = {}
      if (dateFrom) query.scheduledDate.$gte = dateFrom
      if (dateTo) query.scheduledDate.$lte = dateTo
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts] = await Promise.all([
      installations.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      installations.countDocuments(query),
      installations.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray()
    ])

    // Get upcoming schedule summary
    const today = new Date().toISOString().split('T')[0]
    const upcoming = await installations.aggregate([
      { $match: { isActive: true, status: { $nin: ['completed', 'cancelled'] }, scheduledDate: { $gte: today } } },
      { $group: { _id: '$scheduledDate', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 7 }
    ]).toArray()

    return successResponse({
      installations: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      upcomingSchedule: upcoming
    })
  } catch (error) {
    console.error('Furniture Installations GET Error:', error)
    return errorResponse('Failed to fetch installations', 500, error.message)
  }
}

// POST - Create installation/delivery schedule
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('furniture_installations')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const installationId = uuidv4()
    const installationNumber = await generateInstallationNumber(db)

    // Get order info if linked
    let orderInfo = {}
    if (body.orderId) {
      const order = await db.collection('furniture_orders').findOne({ id: body.orderId })
      if (order) {
        orderInfo = {
          orderNumber: order.orderNumber,
          customer: order.customer,
          lineItems: order.lineItems
        }
      }
    }

    const installation = {
      id: installationId,
      installationNumber,
      type: body.type || 'installation', // delivery, installation, both
      // Links
      orderId: body.orderId || null,
      orderNumber: orderInfo.orderNumber || body.orderNumber || null,
      requirementId: body.requirementId || null,
      // Customer
      customer: body.customer || orderInfo.customer || {},
      // Address
      address: body.address || {},
      accessInstructions: body.accessInstructions || '',
      // Items
      items: body.items || orderInfo.lineItems || [],
      // Schedule
      scheduledDate: body.scheduledDate || null,
      scheduledTime: body.scheduledTime || null,
      estimatedDuration: body.estimatedDuration || 4, // hours
      // Team
      assignedTeam: body.assignedTeam || [],
      leadInstaller: body.leadInstaller || null,
      // Vehicle
      vehicleId: body.vehicleId || null,
      vehicleNumber: body.vehicleNumber || '',
      // Status
      status: 'scheduled', // scheduled, confirmed, in_transit, on_site, in_progress, completed, rescheduled, cancelled
      // Checklist
      checklist: body.checklist || [
        { id: 'packing', name: 'All items packed', completed: false },
        { id: 'loaded', name: 'Loaded in vehicle', completed: false },
        { id: 'customer_confirmed', name: 'Customer confirmed', completed: false },
        { id: 'delivered', name: 'Items delivered', completed: false },
        { id: 'unpacked', name: 'Items unpacked', completed: false },
        { id: 'installed', name: 'Installation complete', completed: false },
        { id: 'cleaned', name: 'Site cleaned', completed: false },
        { id: 'signed_off', name: 'Customer sign-off', completed: false }
      ],
      // Photos
      beforePhotos: [],
      afterPhotos: [],
      // Issues
      issues: [],
      // Customer feedback
      customerRating: null,
      customerFeedback: '',
      customerSignature: null,
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      // Status history
      statusHistory: [{
        status: 'scheduled',
        timestamp: now,
        by: user.id,
        notes: 'Installation/delivery scheduled'
      }],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await installations.insertOne(installation)

    await events.insertOne({
      id: uuidv4(),
      type: 'installation.scheduled',
      entityType: 'installation',
      entityId: installationId,
      data: { installationNumber, scheduledDate: installation.scheduledDate, type: installation.type },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(installation), 201)
  } catch (error) {
    console.error('Furniture Installations POST Error:', error)
    return errorResponse('Failed to create installation', 500, error.message)
  }
}

// PUT - Update installation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Installation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('furniture_installations')
    const orders = db.collection('furniture_orders')
    const events = db.collection('furniture_events')

    const installation = await installations.findOne({ id })
    if (!installation) return errorResponse('Installation not found', 404)

    const now = new Date().toISOString()

    // Handle status changes
    if (action === 'change_status') {
      const { newStatus, notes } = body

      await installations.updateOne(
        { id },
        {
          $set: { status: newStatus, updatedAt: now },
          $push: {
            statusHistory: {
              status: newStatus,
              timestamp: now,
              by: user.id,
              notes: notes || `Status changed to ${newStatus}`
            }
          }
        }
      )

      // Update order status if applicable
      if (installation.orderId) {
        let orderStatus = null
        if (newStatus === 'in_transit') orderStatus = 'dispatched'
        else if (newStatus === 'completed' && installation.type === 'delivery') orderStatus = 'delivered'
        else if (newStatus === 'completed' && installation.type === 'installation') orderStatus = 'installed'

        if (orderStatus) {
          await orders.updateOne(
            { id: installation.orderId },
            {
              $set: { status: orderStatus, updatedAt: now },
              $push: {
                statusHistory: {
                  status: orderStatus,
                  timestamp: now,
                  by: user.id,
                  notes: `Updated via installation ${installation.installationNumber}`
                }
              }
            }
          )
        }
      }

      return successResponse({ message: 'Status updated', newStatus })
    }

    // Update checklist item
    if (action === 'update_checklist') {
      const { checklistId, completed } = body

      const checklistIndex = installation.checklist.findIndex(c => c.id === checklistId)
      if (checklistIndex === -1) return errorResponse('Checklist item not found', 404)

      installation.checklist[checklistIndex].completed = completed
      installation.checklist[checklistIndex].completedAt = completed ? now : null
      installation.checklist[checklistIndex].completedBy = completed ? user.id : null

      await installations.updateOne(
        { id },
        { $set: { checklist: installation.checklist, updatedAt: now } }
      )

      return successResponse({ message: 'Checklist updated' })
    }

    // Add photo
    if (action === 'add_photo') {
      const { photoType, url, caption } = body // photoType: 'before' or 'after'

      const photo = {
        id: uuidv4(),
        url,
        caption: caption || '',
        uploadedBy: user.id,
        uploadedAt: now
      }

      const field = photoType === 'before' ? 'beforePhotos' : 'afterPhotos'

      await installations.updateOne(
        { id },
        { $push: { [field]: photo }, $set: { updatedAt: now } }
      )

      return successResponse({ message: 'Photo added', photo })
    }

    // Report issue
    if (action === 'report_issue') {
      const { issueType, description, severity, photos } = body

      const issue = {
        id: uuidv4(),
        type: issueType || 'general',
        description,
        severity: severity || 'medium',
        photos: photos || [],
        status: 'open',
        reportedBy: user.id,
        reportedAt: now
      }

      await installations.updateOne(
        { id },
        { $push: { issues: issue }, $set: { updatedAt: now } }
      )

      return successResponse({ message: 'Issue reported', issue })
    }

    // Record customer feedback
    if (action === 'customer_feedback') {
      const { rating, feedback, signature } = body

      await installations.updateOne(
        { id },
        {
          $set: {
            customerRating: rating,
            customerFeedback: feedback || '',
            customerSignature: signature || null,
            feedbackRecordedAt: now,
            updatedAt: now
          }
        }
      )

      return successResponse({ message: 'Feedback recorded' })
    }

    // Reschedule
    if (action === 'reschedule') {
      const { newDate, newTime, reason } = body

      await installations.updateOne(
        { id },
        {
          $set: { 
            scheduledDate: newDate, 
            scheduledTime: newTime,
            status: 'rescheduled',
            updatedAt: now 
          },
          $push: {
            statusHistory: {
              status: 'rescheduled',
              timestamp: now,
              by: user.id,
              notes: reason || `Rescheduled to ${newDate}`
            }
          }
        }
      )

      return successResponse({ message: 'Rescheduled', newDate, newTime })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await installations.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Installations PUT Error:', error)
    return errorResponse('Failed to update installation', 500, error.message)
  }
}

// DELETE - Delete/cancel installation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Installation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('furniture_installations')

    await installations.updateOne(
      { id },
      {
        $set: { 
          isActive: false, 
          status: 'cancelled',
          deletedAt: new Date().toISOString(), 
          deletedBy: user.id 
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            by: user.id,
            notes: 'Installation cancelled'
          }
        }
      }
    )

    return successResponse({ message: 'Installation cancelled' })
  } catch (error) {
    console.error('Furniture Installations DELETE Error:', error)
    return errorResponse('Failed to cancel installation', 500, error.message)
  }
}
