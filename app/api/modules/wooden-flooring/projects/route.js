import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('id')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_projects')

    if (projectId) {
      const project = await collection.findOne({ id: projectId })
      if (!project) return errorResponse('Project not found', 404)
      return successResponse(sanitizeDocument(project))
    }

    let query = {}
    if (status) query.status = status

    const projects = await collection.find(query).sort({ createdAt: -1 }).toArray()
    
    const stats = {
      total: projects.length,
      inquiry: projects.filter(p => p.status === 'inquiry').length,
      siteVisit: projects.filter(p => p.status === 'site_visit').length,
      quotationSent: projects.filter(p => p.status === 'quotation_sent').length,
      confirmed: projects.filter(p => p.status === 'confirmed').length,
      inProgress: projects.filter(p => p.status === 'in_progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      totalValue: projects.reduce((sum, p) => sum + (p.totalValue || 0), 0)
    }

    return successResponse({ projects: sanitizeDocuments(projects), stats })
  } catch (error) {
    console.error('Projects GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch projects', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_projects')

    const project = {
      id: uuidv4(),
      clientId: user.clientId,
      projectNumber: `WFP-${Date.now().toString().slice(-8)}`,
      customerId: body.customerId,
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      title: body.title || 'New Flooring Project',
      description: body.description || '',
      siteAddress: body.siteAddress || '',
      siteCity: body.siteCity || '',
      propertyType: body.propertyType || 'Residential',
      totalArea: parseFloat(body.totalArea) || 0,
      rooms: body.rooms || [],
      selectedProducts: body.selectedProducts || [],
      flooringType: body.flooringType || '',
      woodType: body.woodType || '',
      finish: body.finish || '',
      estimatedValue: parseFloat(body.estimatedValue) || 0,
      quotationId: null,
      orderId: null,
      totalValue: 0,
      paidAmount: 0,
      status: body.status || 'inquiry',
      priority: body.priority || 'medium',
      source: body.source || 'Direct',
      inquiryDate: new Date(),
      siteVisitDate: body.siteVisitDate ? new Date(body.siteVisitDate) : null,
      expectedStartDate: body.expectedStartDate ? new Date(body.expectedStartDate) : null,
      expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : null,
      actualStartDate: null,
      actualEndDate: null,
      assignedTo: body.assignedTo || null,
      assignedTeam: body.assignedTeam || [],
      milestones: [
        { id: uuidv4(), name: 'Inquiry Received', status: 'completed', date: new Date() },
        { id: uuidv4(), name: 'Site Visit', status: 'pending', date: null },
        { id: uuidv4(), name: 'Measurement', status: 'pending', date: null },
        { id: uuidv4(), name: 'Quotation Sent', status: 'pending', date: null },
        { id: uuidv4(), name: 'Order Confirmed', status: 'pending', date: null },
        { id: uuidv4(), name: 'Material Procurement', status: 'pending', date: null },
        { id: uuidv4(), name: 'Installation Started', status: 'pending', date: null },
        { id: uuidv4(), name: 'Installation Complete', status: 'pending', date: null },
        { id: uuidv4(), name: 'Final Inspection', status: 'pending', date: null },
        { id: uuidv4(), name: 'Payment Complete', status: 'pending', date: null }
      ],
      photos: [],
      notes: body.notes || '',
      activityLog: [{
        id: uuidv4(),
        action: 'Project Created',
        by: user.name || user.email,
        date: new Date()
      }],
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(project)
    return successResponse(sanitizeDocument(project), 201)
  } catch (error) {
    console.error('Projects POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create project', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Project ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_projects')
    const project = await collection.findOne({ id })
    
    if (!project) return errorResponse('Project not found', 404)

    if (action === 'update_milestone') {
      const { milestoneId, status } = updates
      const milestones = project.milestones.map(m => 
        m.id === milestoneId ? { ...m, status, date: status === 'completed' ? new Date() : m.date } : m
      )
      updates.milestones = milestones
      updates.activityLog = [...(project.activityLog || []), {
        id: uuidv4(),
        action: `Milestone updated: ${milestones.find(m => m.id === milestoneId)?.name}`,
        by: user.name || user.email,
        date: new Date()
      }]
    }

    if (action === 'add_photo') {
      updates.photos = [...(project.photos || []), {
        id: uuidv4(),
        url: updates.photoUrl,
        caption: updates.photoCaption || '',
        uploadedBy: user.name || user.email,
        uploadedAt: new Date()
      }]
    }

    if (action === 'add_note') {
      updates.activityLog = [...(project.activityLog || []), {
        id: uuidv4(),
        action: `Note: ${updates.noteText}`,
        by: user.name || user.email,
        date: new Date()
      }]
    }

    if (updates.status && updates.status !== project.status) {
      updates.activityLog = [...(project.activityLog || []), {
        id: uuidv4(),
        action: `Status changed: ${project.status} → ${updates.status}`,
        by: user.name || user.email,
        date: new Date()
      }]
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Projects PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update project', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Project ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('wf_projects')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Project not found', 404)
    return successResponse({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Projects DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete project', 500, error.message)
  }
}
