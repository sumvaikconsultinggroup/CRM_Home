import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate project number
const generateProjectNumber = async (db) => {
  const projects = db.collection('flooring_projects')
  const count = await projects.countDocuments()
  const year = new Date().getFullYear()
  return `FLP-${year}-${String(count + 1).padStart(4, '0')}`
}

// GET - Fetch projects
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit')) || 100

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projects = db.collection('flooring_projects')
    const crmProjects = db.collection('projects')
    const rooms = db.collection('flooring_rooms')

    if (id) {
      const project = await projects.findOne({ id })
      if (!project) return errorResponse('Project not found', 404)
      
      // Get rooms for this project
      const projectRooms = await rooms.find({ projectId: id }).toArray()
      
      return successResponse(sanitizeDocument({ ...project, rooms: projectRooms }))
    }

    // Build query
    const query = {}
    if (customerId) query.customerId = customerId
    if (status) query.status = status

    const allProjects = await projects.find(query).sort({ createdAt: -1 }).limit(limit).toArray()

    // Enrich with room counts
    const enrichedProjects = await Promise.all(allProjects.map(async (p) => {
      const roomCount = await rooms.countDocuments({ projectId: p.id })
      return { ...p, roomCount }
    }))

    // Also get CRM projects with flooring module
    const crmFlooringProjects = await crmProjects.find({ modules: 'flooring' }).toArray()

    return successResponse({
      projects: sanitizeDocuments(enrichedProjects),
      crmProjects: sanitizeDocuments(crmFlooringProjects),
      total: enrichedProjects.length
    })
  } catch (error) {
    console.error('Projects GET Error:', error)
    return errorResponse('Failed to fetch projects', 500, error.message)
  }
}

// POST - Create project (syncs with CRM)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projects = db.collection('flooring_projects')
    const crmProjects = db.collection('projects')
    const leads = db.collection('leads')

    const projectNumber = await generateProjectNumber(db)
    const projectId = uuidv4()
    const now = new Date().toISOString()

    // Create flooring project
    const project = {
      id: projectId,
      projectNumber,
      name: body.name || `${body.customerName || 'Customer'} - ${projectNumber}`,
      customerId: body.customerId,
      customerName: body.customerName,
      crmLeadId: body.leadId,
      site: {
        address: body.siteAddress || '',
        city: body.siteCity || '',
        state: body.siteState || '',
        pincode: body.sitePincode || '',
        contactPerson: body.siteContactPerson || '',
        contactPhone: body.siteContactPhone || ''
      },
      type: body.type || 'residential', // residential, commercial, renovation
      flooringType: body.flooringType || 'hardwood',
      totalArea: body.totalArea || 0,
      estimatedValue: body.estimatedValue || 0,
      status: 'site_visit_pending', // site_visit_pending, measurement_done, quote_sent, approved, in_progress, completed, cancelled
      statusHistory: [{
        status: 'site_visit_pending',
        timestamp: now,
        by: user.id,
        notes: 'Project created'
      }],
      notes: body.notes || '',
      attachments: [],
      assignedTo: body.assignedTo || user.id,
      expectedStartDate: body.expectedStartDate || null,
      expectedEndDate: body.expectedEndDate || null,
      actualStartDate: null,
      actualEndDate: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await projects.insertOne(project)

    // Sync to CRM Projects
    if (body.syncToCRM !== false) {
      const crmProject = {
        id: uuidv4(),
        name: project.name,
        leadId: body.leadId,
        type: project.type,
        status: 'planning',
        budget: project.estimatedValue,
        progress: 0,
        modules: ['flooring'],
        flooringProjectId: projectId,
        description: `Flooring project: ${project.flooringType}, ${project.totalArea} sqft`,
        startDate: project.expectedStartDate,
        endDate: project.expectedEndDate,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await crmProjects.insertOne(crmProject)
      
      // Update flooring project with CRM link
      await projects.updateOne({ id: projectId }, { $set: { crmProjectId: crmProject.id } })
      project.crmProjectId = crmProject.id

      // Update lead status if linked
      if (body.leadId) {
        await leads.updateOne(
          { id: body.leadId },
          { 
            $set: { 
              flooringStatus: 'site_visit_pending',
              flooringProjectId: projectId,
              updatedAt: now
            },
            $addToSet: { modules: 'flooring' }
          }
        )
      }
    }

    return successResponse(sanitizeDocument(project), 201)
  } catch (error) {
    console.error('Projects POST Error:', error)
    return errorResponse('Failed to create project', 500, error.message)
  }
}

// PUT - Update project (syncs with CRM)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Project ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projects = db.collection('flooring_projects')
    const crmProjects = db.collection('projects')
    const leads = db.collection('leads')

    const project = await projects.findOne({ id })
    if (!project) return errorResponse('Project not found', 404)

    const now = new Date().toISOString()

    // Handle status changes
    if (action === 'update_status' && body.status) {
      const statusUpdate = {
        status: body.status,
        statusHistory: [
          ...project.statusHistory,
          {
            status: body.status,
            timestamp: now,
            by: user.id,
            notes: body.statusNotes || ''
          }
        ],
        updatedAt: now
      }

      // Map flooring status to CRM status
      const crmStatusMap = {
        'site_visit_pending': 'planning',
        'measurement_done': 'planning',
        'quote_sent': 'planning',
        'approved': 'in_progress',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'cancelled': 'cancelled'
      }

      await projects.updateOne({ id }, { $set: statusUpdate })

      // Sync status to CRM project
      if (project.crmProjectId) {
        await crmProjects.updateOne(
          { id: project.crmProjectId },
          { $set: { status: crmStatusMap[body.status] || 'planning', updatedAt: now } }
        )
      }

      // Update lead flooring status
      if (project.crmLeadId) {
        await leads.updateOne(
          { id: project.crmLeadId },
          { $set: { flooringStatus: body.status, updatedAt: now } }
        )
      }

      return successResponse({ message: 'Status updated', status: body.status })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    console.log('Updating project with ID:', id)
    console.log('Update data keys:', Object.keys(updateData))

    const result = await projects.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    console.log('Update result:', result ? 'Document found' : 'No document returned')

    // Handle case where findOneAndUpdate returns null or unexpected structure
    const updatedDoc = result?.value || result
    
    if (!updatedDoc) {
      console.error('Project update failed - no document returned for ID:', id)
      return errorResponse('Project update failed - document not found', 404)
    }

    // Sync to CRM project
    if (project.crmProjectId) {
      await crmProjects.updateOne(
        { id: project.crmProjectId },
        {
          $set: {
            name: updateData.name || updatedDoc.name,
            budget: updateData.estimatedValue || updatedDoc.estimatedValue,
            updatedAt: now
          }
        }
      )
    }

    return successResponse(sanitizeDocument(updatedDoc))
  } catch (error) {
    console.error('Projects PUT Error:', error)
    return errorResponse('Failed to update project', 500, error.message)
  }
}
