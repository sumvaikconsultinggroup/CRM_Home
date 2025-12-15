import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Project statuses lifecycle
const PROJECT_STATUSES = ['planning', 'in_progress', 'on_hold', 'review', 'completed', 'closed']

// Default milestones based on project type
const DEFAULT_MILESTONES = {
  'interior_design': [
    { name: 'Initial Consultation', phase: 'planning', order: 1 },
    { name: 'Design Concept', phase: 'planning', order: 2 },
    { name: 'Design Approval', phase: 'planning', order: 3 },
    { name: 'Material Selection', phase: 'in_progress', order: 4 },
    { name: 'Procurement', phase: 'in_progress', order: 5 },
    { name: 'Installation', phase: 'in_progress', order: 6 },
    { name: 'Quality Check', phase: 'review', order: 7 },
    { name: 'Final Handover', phase: 'completed', order: 8 }
  ],
  'renovation': [
    { name: 'Site Survey', phase: 'planning', order: 1 },
    { name: 'Scope Definition', phase: 'planning', order: 2 },
    { name: 'Cost Estimation', phase: 'planning', order: 3 },
    { name: 'Demolition', phase: 'in_progress', order: 4 },
    { name: 'Construction', phase: 'in_progress', order: 5 },
    { name: 'Finishing', phase: 'in_progress', order: 6 },
    { name: 'Inspection', phase: 'review', order: 7 },
    { name: 'Handover', phase: 'completed', order: 8 }
  ],
  'new_construction': [
    { name: 'Land Survey', phase: 'planning', order: 1 },
    { name: 'Architectural Design', phase: 'planning', order: 2 },
    { name: 'Permits & Approvals', phase: 'planning', order: 3 },
    { name: 'Foundation', phase: 'in_progress', order: 4 },
    { name: 'Structure', phase: 'in_progress', order: 5 },
    { name: 'MEP Works', phase: 'in_progress', order: 6 },
    { name: 'Finishing', phase: 'in_progress', order: 7 },
    { name: 'Final Inspection', phase: 'review', order: 8 },
    { name: 'Handover', phase: 'completed', order: 9 }
  ],
  'default': [
    { name: 'Project Kickoff', phase: 'planning', order: 1 },
    { name: 'Requirements Gathering', phase: 'planning', order: 2 },
    { name: 'Execution', phase: 'in_progress', order: 3 },
    { name: 'Review', phase: 'review', order: 4 },
    { name: 'Completion', phase: 'completed', order: 5 }
  ]
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')
    const includeStats = searchParams.get('includeStats') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const filter = {}
    if (status && status !== 'all') filter.status = status
    if (type && type !== 'all') filter.projectType = type
    if (assignedTo) filter['team.userId'] = assignedTo
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { projectNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ]
    }

    const projects = await projectsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    // Calculate stats if requested
    let stats = null
    if (includeStats) {
      const allProjects = await projectsCollection.find({}).toArray()
      const tasksCollection = db.collection('tasks')
      const allTasks = await tasksCollection.find({}).toArray()
      const expensesCollection = db.collection('expenses')
      const allExpenses = await expensesCollection.find({}).toArray()

      stats = {
        total: allProjects.length,
        byStatus: {
          planning: allProjects.filter(p => p.status === 'planning').length,
          in_progress: allProjects.filter(p => p.status === 'in_progress').length,
          on_hold: allProjects.filter(p => p.status === 'on_hold').length,
          review: allProjects.filter(p => p.status === 'review').length,
          completed: allProjects.filter(p => p.status === 'completed').length,
          closed: allProjects.filter(p => p.status === 'closed').length
        },
        totalBudget: allProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
        totalSpent: allProjects.reduce((sum, p) => sum + (p.actualSpent || 0), 0),
        overdue: allProjects.filter(p => p.endDate && new Date(p.endDate) < new Date() && !['completed', 'closed'].includes(p.status)).length,
        tasksCompleted: allTasks.filter(t => t.status === 'completed').length,
        tasksPending: allTasks.filter(t => t.status !== 'completed').length
      }
    }

    return successResponse({ 
      projects: sanitizeDocuments(projects),
      stats 
    })
  } catch (error) {
    console.error('Projects GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch projects', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    if (!body.name) {
      return errorResponse('Project name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    // Generate project number
    const count = await projectsCollection.countDocuments()
    const projectNumber = `PRJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    // Get default milestones based on project type
    const projectType = body.projectType || 'default'
    const defaultMilestones = DEFAULT_MILESTONES[projectType] || DEFAULT_MILESTONES.default
    const milestones = body.milestones || defaultMilestones.map((m, idx) => ({
      id: uuidv4(),
      ...m,
      status: 'pending',
      completedAt: null,
      completedBy: null
    }))

    const now = new Date()
    const project = {
      id: uuidv4(),
      projectNumber,
      clientId: user.clientId,
      
      // Basic info
      name: body.name,
      description: body.description || '',
      projectType: projectType,
      priority: body.priority || 'medium',
      
      // Source tracking (for auto-created from leads)
      sourceType: body.sourceType || 'manual',
      sourceId: body.sourceId || null,
      leadId: body.leadId || null,
      
      // Client/Contact info
      clientName: body.clientName || '',
      clientEmail: body.clientEmail || '',
      clientPhone: body.clientPhone || '',
      contactId: body.contactId || null,
      siteAddress: body.siteAddress || '',
      
      // Status & Progress
      status: body.status || 'planning',
      progress: body.progress || 0,
      
      // Dates
      startDate: body.startDate ? new Date(body.startDate) : now,
      endDate: body.endDate ? new Date(body.endDate) : null,
      actualStartDate: null,
      actualEndDate: null,
      
      // Budget & Financials
      budget: parseFloat(body.budget) || 0,
      actualSpent: 0,
      estimatedCost: parseFloat(body.estimatedCost) || 0,
      currency: body.currency || 'INR',
      
      // Milestones & Phases
      milestones: milestones,
      currentPhase: 'planning',
      
      // Team
      team: body.team || [],
      projectManager: body.projectManager || user.id,
      
      // Tags & Categories
      tags: body.tags || [],
      category: body.category || '',
      
      // Settings
      settings: {
        autoProgressFromTasks: true,
        notifyOnMilestone: true,
        notifyOnOverdue: true,
        ...body.settings
      },
      
      // Activity log
      activityLog: [{
        id: uuidv4(),
        action: 'project_created',
        description: 'Project created',
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      }],
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await projectsCollection.insertOne(project)

    return successResponse(sanitizeDocument(project), 201)
  } catch (error) {
    console.error('Projects POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create project', 500, error.message)
  }
}
