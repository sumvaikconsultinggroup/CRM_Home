import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate requirement number
const generateRequirementNumber = async (db) => {
  const requirements = db.collection('furniture_requirements')
  const count = await requirements.countDocuments() + 1
  const year = new Date().getFullYear()
  return `FRQ-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch requirements
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const leadId = searchParams.get('leadId')
    const projectId = searchParams.get('projectId')
    const contactId = searchParams.get('contactId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const assignedTo = searchParams.get('assignedTo')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('furniture_requirements')

    if (id) {
      const requirement = await requirements.findOne({ id })
      if (!requirement) return errorResponse('Requirement not found', 404)
      return successResponse(sanitizeDocument(requirement))
    }

    const query = { isActive: true }
    if (leadId) query.leadId = leadId
    if (projectId) query.projectId = projectId
    if (contactId) query.contactId = contactId
    if (status) query.status = status
    if (assignedTo) query.assignedTo = assignedTo
    if (search) {
      query.$or = [
        { requirementNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts] = await Promise.all([
      requirements.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      requirements.countDocuments(query),
      requirements.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$estimatedBudget' } } }
      ]).toArray()
    ])

    return successResponse({
      requirements: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, value: s.value } }), {})
    })
  } catch (error) {
    console.error('Furniture Requirements GET Error:', error)
    return errorResponse('Failed to fetch requirements', 500, error.message)
  }
}

// POST - Create requirement
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('furniture_requirements')
    const events = db.collection('furniture_events')
    const tasks = db.collection('tasks')

    const now = new Date().toISOString()
    const requirementId = uuidv4()
    const requirementNumber = await generateRequirementNumber(db)

    const requirement = {
      id: requirementId,
      requirementNumber,
      title: body.title || `Furniture Requirement - ${requirementNumber}`,
      // Core entity links
      leadId: body.leadId || null,
      projectId: body.projectId || null,
      accountId: body.accountId || null,
      contactId: body.contactId || null,
      // Customer info (denormalized for performance)
      customer: {
        name: body.customer?.name || '',
        email: body.customer?.email || '',
        phone: body.customer?.phone || '',
        address: body.customer?.address || ''
      },
      // Requirement details
      rooms: body.rooms || [], // Array of room requirements
      furnitureItems: body.furnitureItems || [],
      estimatedBudget: body.estimatedBudget || 0,
      budgetRange: body.budgetRange || { min: 0, max: 0 },
      timeline: body.timeline || 'flexible',
      expectedDeliveryDate: body.expectedDeliveryDate || null,
      stylePreferences: body.stylePreferences || [],
      siteConstraints: body.siteConstraints || '',
      specialRequirements: body.specialRequirements || '',
      // Attachments
      attachments: body.attachments || [],
      referenceImages: body.referenceImages || [],
      voiceNotes: body.voiceNotes || [],
      // Status
      status: 'new',
      priority: body.priority || 'medium',
      source: body.source || 'direct',
      // Assignment
      assignedTo: body.assignedTo || user.id,
      assignedTeam: body.assignedTeam || null,
      // Tracking
      statusHistory: [{
        status: 'new',
        timestamp: now,
        by: user.id,
        notes: 'Requirement created'
      }],
      notes: body.notes || '',
      tags: body.tags || [],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await requirements.insertOne(requirement)

    // Auto-create tasks based on configuration
    const autoTasks = [
      { title: 'Schedule Site Visit', type: 'site_visit', dueInDays: 2 },
      { title: 'Initial Consultation', type: 'consultation', dueInDays: 3 }
    ]

    for (const taskConfig of autoTasks) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + taskConfig.dueInDays)

      await tasks.insertOne({
        id: uuidv4(),
        title: `${taskConfig.title} - ${requirementNumber}`,
        description: `Auto-created task for requirement ${requirementNumber}`,
        type: taskConfig.type,
        status: 'todo',
        priority: requirement.priority,
        dueDate: dueDate.toISOString(),
        assignedTo: requirement.assignedTo,
        linkedEntity: {
          type: 'furniture_requirement',
          id: requirementId,
          number: requirementNumber
        },
        projectId: body.projectId,
        leadId: body.leadId,
        moduleSource: 'furniture',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      })
    }

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'requirement.created',
      entityType: 'requirement',
      entityId: requirementId,
      data: { requirementNumber, title: requirement.title, customer: requirement.customer.name },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(requirement), 201)
  } catch (error) {
    console.error('Furniture Requirements POST Error:', error)
    return errorResponse('Failed to create requirement', 500, error.message)
  }
}

// PUT - Update requirement
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Requirement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('furniture_requirements')
    const events = db.collection('furniture_events')

    const requirement = await requirements.findOne({ id })
    if (!requirement) return errorResponse('Requirement not found', 404)

    const now = new Date().toISOString()

    // Handle status change action
    if (action === 'change_status') {
      const { newStatus, notes } = body
      
      await requirements.updateOne(
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

      await events.insertOne({
        id: uuidv4(),
        type: 'requirement.status.changed',
        entityType: 'requirement',
        entityId: id,
        data: { previousStatus: requirement.status, newStatus },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Status updated', newStatus })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await requirements.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    await events.insertOne({
      id: uuidv4(),
      type: 'requirement.updated',
      entityType: 'requirement',
      entityId: id,
      data: { changes: Object.keys(updateData) },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Requirements PUT Error:', error)
    return errorResponse('Failed to update requirement', 500, error.message)
  }
}

// DELETE - Delete requirement
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Requirement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('furniture_requirements')

    await requirements.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Requirement deleted' })
  } catch (error) {
    console.error('Furniture Requirements DELETE Error:', error)
    return errorResponse('Failed to delete requirement', 500, error.message)
  }
}
