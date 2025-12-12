import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections, ProjectStages } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')
    
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    
    const filter = { clientId: user.clientId }
    if (stage) filter.stage = stage
    if (status) filter.status = status
    
    const projects = await projectsCollection.find(filter).sort({ createdAt: -1 }).toArray()
    
    // Group by stage for pipeline view
    const pipeline = {}
    ProjectStages.forEach(stage => {
      pipeline[stage.id] = {
        ...stage,
        projects: projects.filter(p => p.stage === stage.id)
      }
    })
    
    return successResponse({
      projects: sanitizeDocuments(projects),
      pipeline,
      stages: ProjectStages
    })
  } catch (error) {
    console.error('Flooring Projects GET Error:', error)
    return errorResponse('Failed to fetch projects', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { 
      title, customerName, customerEmail, customerPhone, customerAddress,
      leadId, quotationId, siteAddress, siteArea, flooringType, products,
      estimatedStartDate, estimatedEndDate, estimatedCost, notes, assignedTo
    } = body
    
    if (!title || !customerName) {
      return errorResponse('Title and customer name are required', 400)
    }
    
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    
    // Generate project number
    const count = await projectsCollection.countDocuments({ clientId: user.clientId })
    const projectNumber = `PRJ-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`
    
    const project = {
      id: uuidv4(),
      clientId: user.clientId,
      projectNumber,
      title,
      customerName,
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      leadId: leadId || null,
      quotationId: quotationId || null,
      siteAddress: siteAddress || customerAddress || '',
      siteArea: siteArea || 0,
      flooringType: flooringType || '',
      products: products || [],
      stage: 'inquiry',
      status: 'active',
      progress: 0,
      estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
      actualStartDate: null,
      actualEndDate: null,
      estimatedCost: estimatedCost || 0,
      actualCost: 0,
      materialsUsed: [],
      milestones: ProjectStages.map(stage => ({
        stageId: stage.id,
        name: stage.name,
        completed: false,
        completedAt: null,
        notes: ''
      })),
      notes: notes || '',
      assignedTo: assignedTo || [],
      attachments: [],
      timeline: [{
        id: uuidv4(),
        action: 'Project Created',
        stage: 'inquiry',
        performedBy: user.id,
        timestamp: new Date(),
        notes: 'Project initiated'
      }],
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await projectsCollection.insertOne(project)
    
    return successResponse(sanitizeDocument(project), 201)
  } catch (error) {
    console.error('Flooring Projects POST Error:', error)
    return errorResponse('Failed to create project', 500, error.message)
  }
}
