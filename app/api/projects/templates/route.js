import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch all project templates
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const templatesCollection = db.collection('project_templates')

    const filter = {}
    if (type && type !== 'all') filter.projectType = type

    const templates = await templatesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(templates))
  } catch (error) {
    console.error('Templates GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch templates', 500, error.message)
  }
}

// POST - Create new template or create project from template
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Create project from template
    if (action === 'create-from-template') {
      const { templateId, projectData } = body
      
      const templatesCollection = db.collection('project_templates')
      const template = await templatesCollection.findOne({ id: templateId })
      
      if (!template) {
        return errorResponse('Template not found', 404)
      }

      const projectsCollection = db.collection('projects')
      const count = await projectsCollection.countDocuments()
      const projectNumber = `PRJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

      const now = new Date()
      
      // Create milestones from template
      const milestones = (template.milestones || []).map(m => ({
        id: uuidv4(),
        name: m.name,
        phase: m.phase,
        order: m.order,
        durationDays: m.durationDays,
        status: 'pending',
        completedAt: null,
        completedBy: null
      }))

      const newProject = {
        id: uuidv4(),
        projectNumber,
        clientId: user.clientId,
        
        // From template
        name: projectData.name || template.name,
        description: projectData.description || template.description,
        projectType: template.projectType,
        priority: projectData.priority || 'medium',
        
        // Source tracking
        sourceType: 'template',
        sourceId: templateId,
        templateId: templateId,
        templateName: template.name,
        
        // Client info from input
        clientName: projectData.clientName || '',
        clientEmail: projectData.clientEmail || '',
        clientPhone: projectData.clientPhone || '',
        siteAddress: projectData.siteAddress || '',
        
        // Status & Progress
        status: 'planning',
        progress: 0,
        
        // Dates
        startDate: projectData.startDate ? new Date(projectData.startDate) : now,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        actualStartDate: null,
        actualEndDate: null,
        
        // Budget from template or input
        budget: parseFloat(projectData.budget) || template.defaultBudget || 0,
        actualSpent: 0,
        estimatedCost: template.estimatedCost || 0,
        currency: 'INR',
        
        // Milestones from template
        milestones: milestones,
        currentPhase: 'planning',
        
        // Team
        team: template.defaultTeam || [],
        projectManager: user.id,
        
        // Tags from template
        tags: template.tags || [],
        category: template.category || '',
        
        // Settings from template
        settings: {
          autoProgressFromTasks: true,
          notifyOnMilestone: true,
          notifyOnOverdue: true,
          ...template.settings
        },
        
        // Activity log
        activityLog: [{
          id: uuidv4(),
          action: 'project_created',
          description: `Project created from template "${template.name}"`,
          userId: user.id,
          userName: user.name || user.email,
          timestamp: now
        }],
        
        // Metadata
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await projectsCollection.insertOne(newProject)

      // Create default tasks from template if exists
      if (template.defaultTasks && template.defaultTasks.length > 0) {
        const tasksCollection = db.collection('tasks')
        const tasks = template.defaultTasks.map(t => ({
          id: uuidv4(),
          clientId: user.clientId,
          projectId: newProject.id,
          title: t.title,
          description: t.description || '',
          status: 'todo',
          priority: t.priority || 'medium',
          assignedTo: null,
          dueDate: null,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }))
        
        if (tasks.length > 0) {
          await tasksCollection.insertMany(tasks)
        }
      }

      return successResponse(sanitizeDocument(newProject), 201)
    }

    // Create new template
    if (!body.name) {
      return errorResponse('Template name is required', 400)
    }

    const templatesCollection = db.collection('project_templates')

    const template = {
      id: uuidv4(),
      clientId: user.clientId,
      
      name: body.name,
      description: body.description || '',
      projectType: body.projectType || 'default',
      category: body.category || '',
      
      // Template configuration
      milestones: body.milestones || [],
      defaultTasks: body.defaultTasks || [],
      defaultTeam: body.defaultTeam || [],
      defaultBudget: parseFloat(body.defaultBudget) || 0,
      estimatedCost: parseFloat(body.estimatedCost) || 0,
      estimatedDuration: body.estimatedDuration || 30, // days
      
      tags: body.tags || [],
      settings: body.settings || {},
      
      // Stats
      usageCount: 0,
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await templatesCollection.insertOne(template)

    return successResponse(sanitizeDocument(template), 201)
  } catch (error) {
    console.error('Templates POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to process template request', 500, error.message)
  }
}

// PUT - Update template
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id } = body

    if (!id) {
      return errorResponse('Template ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const templatesCollection = db.collection('project_templates')

    const existingTemplate = await templatesCollection.findOne({ id })
    if (!existingTemplate) {
      return errorResponse('Template not found', 404)
    }

    const updatedTemplate = {
      ...existingTemplate,
      ...body,
      id,
      updatedAt: new Date()
    }

    await templatesCollection.updateOne(
      { id },
      { $set: updatedTemplate }
    )

    return successResponse(sanitizeDocument(updatedTemplate))
  } catch (error) {
    console.error('Templates PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update template', 500, error.message)
  }
}

// DELETE - Delete template
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Template ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const templatesCollection = db.collection('project_templates')

    const result = await templatesCollection.deleteOne({ id })

    if (result.deletedCount === 0) {
      return errorResponse('Template not found', 404)
    }

    return successResponse({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Templates DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete template', 500, error.message)
  }
}
