import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate design brief number
const generateBriefNumber = async (db) => {
  const briefs = db.collection('furniture_design_briefs')
  const count = await briefs.countDocuments() + 1
  const year = new Date().getFullYear()
  return `FDB-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch design briefs
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const requirementId = searchParams.get('requirementId')
    const projectId = searchParams.get('projectId')
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 50
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const briefs = db.collection('furniture_design_briefs')

    if (id) {
      const brief = await briefs.findOne({ id })
      if (!brief) return errorResponse('Design brief not found', 404)
      return successResponse(sanitizeDocument(brief))
    }

    const query = { isActive: true }
    if (requirementId) query.requirementId = requirementId
    if (projectId) query.projectId = projectId
    if (roomId) query.roomId = roomId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { briefNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ]
    }

    const sortConfig = { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    const skip = (page - 1) * limit

    const [items, total, statusCounts] = await Promise.all([
      briefs.find(query).sort(sortConfig).skip(skip).limit(limit).toArray(),
      briefs.countDocuments(query),
      briefs.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray()
    ])

    return successResponse({
      designBriefs: sanitizeDocuments(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
    })
  } catch (error) {
    console.error('Furniture Design Briefs GET Error:', error)
    return errorResponse('Failed to fetch design briefs', 500, error.message)
  }
}

// POST - Create design brief
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const briefs = db.collection('furniture_design_briefs')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const briefId = uuidv4()
    const briefNumber = await generateBriefNumber(db)

    const brief = {
      id: briefId,
      briefNumber,
      title: body.title || `Design Brief - ${briefNumber}`,
      // Links
      requirementId: body.requirementId || null,
      projectId: body.projectId || null,
      measurementId: body.measurementId || null,
      roomId: body.roomId || null,
      contactId: body.contactId || null,
      // Scope
      scope: body.scope || 'room', // room, item, project
      // Design details
      furnitureItems: body.furnitureItems || [], // Array of items with specs
      styleGuidelines: body.styleGuidelines || {
        primaryStyle: '',
        colorPalette: [],
        materialPreferences: [],
        avoidList: [],
        inspirationImages: []
      },
      functionalRequirements: body.functionalRequirements || [],
      spaceConstraints: body.spaceConstraints || '',
      specialFeatures: body.specialFeatures || [],
      // Budget
      budget: {
        total: body.budget?.total || 0,
        itemWise: body.budget?.itemWise || [],
        flexibility: body.budget?.flexibility || 'moderate' // strict, moderate, flexible
      },
      // Timeline
      expectedDelivery: body.expectedDelivery || null,
      milestones: body.milestones || [],
      // Attachments
      attachments: body.attachments || [],
      designFiles: body.designFiles || [],
      renders3D: body.renders3D || [],
      moodBoards: body.moodBoards || [],
      // Versions
      version: 1,
      versionHistory: [],
      // Status & Approval
      status: 'draft',
      approvalFlow: body.approvalFlow || [
        { stage: 'internal_review', assignedTo: null, status: 'pending' },
        { stage: 'customer_approval', assignedTo: null, status: 'pending' }
      ],
      approvals: [],
      comments: [],
      // Assignment
      designer: body.designer || user.id,
      reviewers: body.reviewers || [],
      // Status history
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Design brief created'
      }],
      notes: body.notes || '',
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await briefs.insertOne(brief)

    // Emit event
    await events.insertOne({
      id: uuidv4(),
      type: 'design_brief.created',
      entityType: 'design_brief',
      entityId: briefId,
      data: { briefNumber, title: brief.title },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(brief), 201)
  } catch (error) {
    console.error('Furniture Design Briefs POST Error:', error)
    return errorResponse('Failed to create design brief', 500, error.message)
  }
}

// PUT - Update design brief
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Design Brief ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const briefs = db.collection('furniture_design_briefs')
    const requirements = db.collection('furniture_requirements')
    const events = db.collection('furniture_events')

    const brief = await briefs.findOne({ id })
    if (!brief) return errorResponse('Design brief not found', 404)

    const now = new Date().toISOString()

    // Handle actions
    if (action === 'submit_for_review') {
      await briefs.updateOne(
        { id },
        {
          $set: { status: 'internal_review', submittedForReviewAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'internal_review',
              timestamp: now,
              by: user.id,
              notes: 'Submitted for internal review'
            }
          }
        }
      )
      return successResponse({ message: 'Submitted for review', status: 'internal_review' })
    }

    if (action === 'approve_internal') {
      await briefs.updateOne(
        { id },
        {
          $set: { status: 'internal_approved', internalApprovedAt: now, internalApprovedBy: user.id, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'internal_approved',
              timestamp: now,
              by: user.id,
              notes: body.notes || 'Internally approved'
            },
            approvals: {
              type: 'internal',
              approvedBy: user.id,
              approvedAt: now,
              notes: body.notes || ''
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'design_brief.approved',
        entityType: 'design_brief',
        entityId: id,
        data: { briefNumber: brief.briefNumber, approvalType: 'internal' },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Internally approved', status: 'internal_approved' })
    }

    if (action === 'send_to_customer') {
      await briefs.updateOne(
        { id },
        {
          $set: { status: 'sent_to_customer', sentToCustomerAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'sent_to_customer',
              timestamp: now,
              by: user.id,
              notes: 'Sent to customer for approval'
            }
          }
        }
      )
      return successResponse({ message: 'Sent to customer', status: 'sent_to_customer' })
    }

    if (action === 'customer_approve') {
      await briefs.updateOne(
        { id },
        {
          $set: { status: 'customer_approved', customerApprovedAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'customer_approved',
              timestamp: now,
              by: user.id,
              notes: body.notes || 'Customer approved'
            },
            approvals: {
              type: 'customer',
              approvedBy: body.customerName || 'Customer',
              approvedAt: now,
              signature: body.signature || null,
              notes: body.notes || ''
            }
          }
        }
      )

      // Update requirement status
      if (brief.requirementId) {
        await requirements.updateOne(
          { id: brief.requirementId },
          {
            $set: { status: 'design_approved', updatedAt: now },
            $push: {
              statusHistory: {
                status: 'design_approved',
                timestamp: now,
                by: user.id,
                notes: `Design brief ${brief.briefNumber} approved`
              }
            }
          }
        )
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'design_brief.approved',
        entityType: 'design_brief',
        entityId: id,
        data: { briefNumber: brief.briefNumber, approvalType: 'customer' },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Customer approved', status: 'customer_approved' })
    }

    if (action === 'request_revision') {
      await briefs.updateOne(
        { id },
        {
          $set: { status: 'revision_requested', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'revision_requested',
              timestamp: now,
              by: user.id,
              notes: body.revisionNotes || 'Revision requested'
            },
            comments: {
              id: uuidv4(),
              type: 'revision_request',
              content: body.revisionNotes || '',
              by: user.id,
              at: now
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'design_brief.rejected',
        entityType: 'design_brief',
        entityId: id,
        data: { briefNumber: brief.briefNumber, reason: body.revisionNotes },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Revision requested', status: 'revision_requested' })
    }

    if (action === 'lock') {
      if (brief.status !== 'customer_approved') {
        return errorResponse('Can only lock customer-approved briefs', 400)
      }

      await briefs.updateOne(
        { id },
        {
          $set: { status: 'locked', lockedAt: now, lockedBy: user.id, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'locked',
              timestamp: now,
              by: user.id,
              notes: 'Design brief locked for production'
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'design_brief.locked',
        entityType: 'design_brief',
        entityId: id,
        data: { briefNumber: brief.briefNumber },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'Design brief locked', status: 'locked' })
    }

    if (action === 'create_version') {
      // Save current version to history
      const newVersion = brief.version + 1
      const versionSnapshot = { ...brief, versionNumber: brief.version, savedAt: now }
      delete versionSnapshot.versionHistory

      await briefs.updateOne(
        { id },
        {
          $set: { ...updateData, version: newVersion, updatedAt: now },
          $push: {
            versionHistory: versionSnapshot,
            statusHistory: {
              status: brief.status,
              timestamp: now,
              by: user.id,
              notes: `Version ${newVersion} created`
            }
          }
        }
      )

      return successResponse({ message: 'New version created', version: newVersion })
    }

    if (action === 'add_comment') {
      const comment = {
        id: uuidv4(),
        type: body.commentType || 'general',
        content: body.comment,
        by: user.id,
        at: now
      }

      await briefs.updateOne(
        { id },
        {
          $push: { comments: comment },
          $set: { updatedAt: now }
        }
      )

      return successResponse({ message: 'Comment added', comment })
    }

    // Regular update (only if in editable status)
    if (['draft', 'revision_requested'].includes(brief.status)) {
      updateData.updatedAt = now
      updateData.updatedBy = user.id

      const result = await briefs.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      return successResponse(sanitizeDocument(result))
    }

    return errorResponse('Cannot edit brief in current status', 400)
  } catch (error) {
    console.error('Furniture Design Briefs PUT Error:', error)
    return errorResponse('Failed to update design brief', 500, error.message)
  }
}

// DELETE - Delete design brief
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Design Brief ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const briefs = db.collection('furniture_design_briefs')

    const brief = await briefs.findOne({ id })
    if (!brief) return errorResponse('Design brief not found', 404)

    if (brief.status === 'locked') {
      return errorResponse('Cannot delete locked design brief', 400)
    }

    await briefs.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Design brief deleted' })
  } catch (error) {
    console.error('Furniture Design Briefs DELETE Error:', error)
    return errorResponse('Failed to delete design brief', 500, error.message)
  }
}
