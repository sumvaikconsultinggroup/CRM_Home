import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Lead types for paints module
const LEAD_TYPES = {
  dealer_enquiry: { label: 'Dealer Enquiry', pipeline: 'channel', color: 'blue' },
  project_enquiry: { label: 'Project Enquiry', pipeline: 'project', color: 'purple' },
  service_job: { label: 'Service Job', pipeline: 'service', color: 'green' },
  product_inquiry: { label: 'Product Inquiry', pipeline: 'sales', color: 'amber' }
}

// Default pipelines
const PIPELINES = {
  channel: ['new', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'],
  project: ['new', 'site_visit_scheduled', 'surveyed', 'spec_in_progress', 'spec_approved', 'quoted', 'won', 'lost'],
  service: ['new', 'site_visit_scheduled', 'surveyed', 'quoted', 'approved', 'scheduled', 'in_progress', 'completed'],
  sales: ['new', 'contacted', 'sample_sent', 'follow_up', 'converted', 'lost']
}

// GET - Fetch paints leads
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const leadType = searchParams.get('leadType')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paintsLeads = db.collection('paints_leads')

    // Single lead fetch
    if (id) {
      const lead = await paintsLeads.findOne({ id })
      if (!lead) {
        return errorResponse('Lead not found', 404)
      }
      return successResponse({ lead: sanitizeDocument(lead) })
    }

    // Build filter
    const filter = {}
    if (leadType) filter.leadType = leadType
    if (status) filter.status = status
    if (assignedTo) filter.assignedTo = assignedTo
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { leadNumber: { $regex: search, $options: 'i' } }
      ]
    }

    // Get total count
    const total = await paintsLeads.countDocuments(filter)

    // Fetch leads
    const skip = (page - 1) * limit
    const leads = await paintsLeads
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Calculate stats by type and status
    const stats = {
      byType: {},
      byStatus: {},
      total: total
    }
    
    const allLeads = await paintsLeads.find({}).toArray()
    allLeads.forEach(lead => {
      stats.byType[lead.leadType] = (stats.byType[lead.leadType] || 0) + 1
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1
    })

    return successResponse({
      leads: sanitizeDocuments(leads),
      stats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      leadTypes: LEAD_TYPES,
      pipelines: PIPELINES
    })
  } catch (error) {
    console.error('Paints Leads GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch leads', 500, error.message)
  }
}

// POST - Create paint lead
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      name,
      email,
      phone,
      company,
      leadType,
      source,
      projectType,
      estimatedArea,
      budget,
      location,
      requirements,
      preferredProducts,
      timeline,
      assignedTo,
      notes,
      coreLeadId // Link to core CRM lead if exists
    } = body

    if (!name || !leadType) {
      return errorResponse('Name and lead type are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paintsLeads = db.collection('paints_leads')

    // Generate lead number
    const count = await paintsLeads.countDocuments()
    const leadNumber = `PNT-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const pipeline = PIPELINES[LEAD_TYPES[leadType]?.pipeline] || PIPELINES.service

    const lead = {
      id: uuidv4(),
      leadNumber,
      clientId: user.clientId,
      
      // Contact info
      name,
      email: email || '',
      phone: phone || '',
      company: company || '',
      
      // Lead classification
      leadType,
      source: source || 'direct',
      
      // Project details
      projectType: projectType || '', // residential, commercial, industrial
      estimatedArea: estimatedArea || 0,
      budget: budget || '',
      location: location || {
        address: '',
        city: '',
        state: '',
        pincode: ''
      },
      
      // Requirements
      requirements: requirements || '',
      preferredProducts: preferredProducts || [],
      timeline: timeline || '',
      
      // Pipeline
      status: 'new',
      pipeline: LEAD_TYPES[leadType]?.pipeline || 'service',
      pipelineStages: pipeline,
      
      // Assignment
      assignedTo: assignedTo || null,
      
      // Relations
      coreLeadId: coreLeadId || null,
      surveyId: null,
      specificationId: null,
      quoteId: null,
      orderId: null,
      jobId: null,
      
      // Notes & activity
      notes: notes || '',
      activities: [{
        id: uuidv4(),
        type: 'created',
        description: 'Lead created',
        by: user.id,
        byName: user.name || user.email,
        timestamp: now
      }],
      
      // Metadata
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await paintsLeads.insertOne(lead)

    // Emit event
    await emitEvent(db, 'paints.lead.created', lead, user)

    return successResponse({ lead: sanitizeDocument(lead) }, 201)
  } catch (error) {
    console.error('Paints Leads POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create lead', 500, error.message)
  }
}

// PUT - Update lead
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) {
      return errorResponse('Lead ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paintsLeads = db.collection('paints_leads')

    const existing = await paintsLeads.findOne({ id })
    if (!existing) {
      return errorResponse('Lead not found', 404)
    }

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'update_status') {
      const { status, notes } = updateData
      await paintsLeads.updateOne(
        { id },
        {
          $set: { status, updatedAt: now },
          $push: {
            activities: {
              id: uuidv4(),
              type: 'status_change',
              description: `Status changed from ${existing.status} to ${status}`,
              notes: notes || '',
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
      await emitEvent(db, 'paints.lead.status_changed', { id, oldStatus: existing.status, newStatus: status }, user)
      return successResponse({ message: 'Status updated' })
    }

    if (action === 'assign') {
      const { assignedTo, assignedToName } = updateData
      await paintsLeads.updateOne(
        { id },
        {
          $set: { assignedTo, updatedAt: now },
          $push: {
            activities: {
              id: uuidv4(),
              type: 'assigned',
              description: `Assigned to ${assignedToName || assignedTo}`,
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
      return successResponse({ message: 'Lead assigned' })
    }

    if (action === 'add_note') {
      const { note } = updateData
      await paintsLeads.updateOne(
        { id },
        {
          $set: { updatedAt: now },
          $push: {
            activities: {
              id: uuidv4(),
              type: 'note',
              description: note,
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
      return successResponse({ message: 'Note added' })
    }

    if (action === 'schedule_visit') {
      const { visitDate, visitTime, visitAddress, visitNotes } = updateData
      await paintsLeads.updateOne(
        { id },
        {
          $set: { 
            status: 'site_visit_scheduled',
            scheduledVisit: { date: visitDate, time: visitTime, address: visitAddress, notes: visitNotes },
            updatedAt: now 
          },
          $push: {
            activities: {
              id: uuidv4(),
              type: 'visit_scheduled',
              description: `Site visit scheduled for ${visitDate} at ${visitTime}`,
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
      return successResponse({ message: 'Visit scheduled' })
    }

    if (action === 'convert') {
      const { convertTo, dealerId, projectId, jobId } = updateData
      const conversionData = {
        status: 'won',
        convertedTo: convertTo,
        convertedAt: now,
        updatedAt: now
      }
      if (dealerId) conversionData.dealerId = dealerId
      if (projectId) conversionData.projectId = projectId
      if (jobId) conversionData.jobId = jobId

      await paintsLeads.updateOne(
        { id },
        {
          $set: conversionData,
          $push: {
            activities: {
              id: uuidv4(),
              type: 'converted',
              description: `Lead converted to ${convertTo}`,
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
      await emitEvent(db, 'paints.lead.converted', { id, convertTo }, user)
      return successResponse({ message: 'Lead converted' })
    }

    // Regular update
    await paintsLeads.updateOne(
      { id },
      { 
        $set: { ...updateData, updatedAt: now, updatedBy: user.id },
        $push: {
          activities: {
            id: uuidv4(),
            type: 'updated',
            description: 'Lead details updated',
            by: user.id,
            byName: user.name || user.email,
            timestamp: now
          }
        }
      }
    )

    const updated = await paintsLeads.findOne({ id })
    return successResponse({ lead: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Paints Leads PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update lead', 500, error.message)
  }
}

// DELETE - Delete lead
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Lead ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const paintsLeads = db.collection('paints_leads')

    await paintsLeads.deleteOne({ id })

    return successResponse({ message: 'Lead deleted' })
  } catch (error) {
    console.error('Paints Leads DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete lead', 500, error.message)
  }
}

// Helper to emit events
async function emitEvent(db, eventType, data, user) {
  try {
    const events = db.collection('paints_events')
    await events.insertOne({
      id: uuidv4(),
      type: eventType,
      data,
      userId: user.id,
      clientId: user.clientId,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Event emission error:', e)
  }
}
