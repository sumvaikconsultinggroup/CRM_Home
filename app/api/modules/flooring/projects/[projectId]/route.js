import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'
import { FlooringCollections, ProjectStages } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const projectId = params.projectId
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    const tasksCollection = await getCollection(FlooringCollections.PROJECT_TASKS)
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    
    const project = await projectsCollection.findOne({ id: projectId, clientId: user.clientId })
    if (!project) {
      return errorResponse('Project not found', 404)
    }
    
    // Get project tasks
    const tasks = await tasksCollection.find({ projectId, clientId: user.clientId }).toArray()
    
    // Get project invoices
    const invoices = await invoicesCollection.find({ projectId, clientId: user.clientId }).toArray()
    
    return successResponse({
      ...sanitizeDocument(project),
      tasks: sanitizeDocuments(tasks),
      invoices: sanitizeDocuments(invoices),
      stages: ProjectStages
    })
  } catch (error) {
    console.error('Flooring Project GET Error:', error)
    return errorResponse('Failed to fetch project', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const projectId = params.projectId
    const body = await request.json()
    
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    
    const project = await projectsCollection.findOne({ id: projectId, clientId: user.clientId })
    if (!project) {
      return errorResponse('Project not found', 404)
    }
    
    // Handle stage change
    if (body.stage && body.stage !== project.stage) {
      const oldStage = ProjectStages.find(s => s.id === project.stage)
      const newStage = ProjectStages.find(s => s.id === body.stage)
      
      // Calculate progress based on stage
      const stageIndex = ProjectStages.findIndex(s => s.id === body.stage)
      body.progress = Math.round((stageIndex / (ProjectStages.length - 1)) * 100)
      
      // Update milestone
      const milestones = project.milestones.map(m => {
        if (m.stageId === body.stage) {
          return { ...m, completed: true, completedAt: new Date() }
        }
        return m
      })
      body.milestones = milestones
      
      // Add timeline entry
      const timelineEntry = {
        id: uuidv4(),
        action: `Stage changed from ${oldStage?.name || project.stage} to ${newStage?.name || body.stage}`,
        stage: body.stage,
        performedBy: user.id,
        timestamp: new Date(),
        notes: body.stageNotes || ''
      }
      
      body.timeline = [...(project.timeline || []), timelineEntry]
      
      // Handle special stages
      if (body.stage === 'installation_progress' && !project.actualStartDate) {
        body.actualStartDate = new Date()
      }
      if (body.stage === 'completed') {
        body.actualEndDate = new Date()
        body.progress = 100
      }
      
      // Mock WhatsApp notification
      console.log(`[WhatsApp Mock] Project ${project.projectNumber} moved to ${newStage?.name}. Customer: ${project.customerPhone}`)
    }
    
    // Handle material tracking
    if (body.action === 'add_material') {
      const material = {
        id: uuidv4(),
        productId: body.productId,
        productName: body.productName,
        quantity: body.quantity,
        unit: body.unit || 'sq.ft',
        usedDate: new Date(),
        addedBy: user.id
      }
      
      body.materialsUsed = [...(project.materialsUsed || []), material]
      body.actualCost = (project.actualCost || 0) + (body.materialCost || 0)
      delete body.action
      delete body.productId
      delete body.productName
      delete body.quantity
      delete body.unit
      delete body.materialCost
    }
    
    const { id, clientId, createdAt, createdBy, ...updateData } = body
    updateData.updatedAt = new Date()
    
    await projectsCollection.updateOne(
      { id: projectId, clientId: user.clientId },
      { $set: updateData }
    )
    
    return successResponse({ message: 'Project updated successfully' })
  } catch (error) {
    console.error('Flooring Project PUT Error:', error)
    return errorResponse('Failed to update project', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const projectId = params.projectId
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    
    const project = await projectsCollection.findOne({ id: projectId, clientId: user.clientId })
    if (!project) {
      return errorResponse('Project not found', 404)
    }
    
    if (project.stage !== 'inquiry' && project.status !== 'cancelled') {
      return errorResponse('Can only delete projects in inquiry stage or cancelled projects', 400)
    }
    
    await projectsCollection.deleteOne({ id: projectId, clientId: user.clientId })
    
    return successResponse({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Flooring Project DELETE Error:', error)
    return errorResponse('Failed to delete project', 500, error.message)
  }
}
