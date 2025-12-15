import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const includeTasks = searchParams.get('includeTasks') === 'true'
    const includeExpenses = searchParams.get('includeExpenses') === 'true'
    const includeDocuments = searchParams.get('includeDocuments') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const project = await projectsCollection.findOne({ id: projectId })

    if (!project) {
      return errorResponse('Project not found', 404)
    }

    let tasks = []
    let expenses = []
    let documents = []

    // Include related tasks
    if (includeTasks) {
      const tasksCollection = db.collection('tasks')
      tasks = await tasksCollection.find({ projectId }).sort({ createdAt: -1 }).toArray()
    }

    // Include related expenses
    if (includeExpenses) {
      const expensesCollection = db.collection('expenses')
      expenses = await expensesCollection.find({ projectId }).sort({ createdAt: -1 }).toArray()
    }

    // Include related documents
    if (includeDocuments) {
      const documentsCollection = db.collection('documents')
      documents = await documentsCollection.find({ projectId }).sort({ createdAt: -1 }).toArray()
    }

    // Calculate task-based progress if enabled
    if (project.settings?.autoProgressFromTasks && tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      project.calculatedProgress = Math.round((completedTasks / tasks.length) * 100)
    }

    // Calculate budget metrics
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    project.budgetMetrics = {
      budget: project.budget || 0,
      spent: totalExpenses,
      remaining: (project.budget || 0) - totalExpenses,
      percentUsed: project.budget ? Math.round((totalExpenses / project.budget) * 100) : 0
    }

    return successResponse({
      project: sanitizeDocument(project),
      tasks: sanitizeDocuments(tasks),
      expenses: sanitizeDocuments(expenses),
      documents: sanitizeDocuments(documents)
    })
  } catch (error) {
    console.error('Project GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch project', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { projectId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const existingProject = await projectsCollection.findOne({ id: projectId })
    if (!existingProject) {
      return errorResponse('Project not found', 404)
    }

    const now = new Date()
    const activityLog = existingProject.activityLog || []

    // Track status changes
    if (body.status && body.status !== existingProject.status) {
      activityLog.push({
        id: uuidv4(),
        action: 'status_changed',
        description: `Status changed from "${existingProject.status}" to "${body.status}"`,
        previousValue: existingProject.status,
        newValue: body.status,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      })

      // Set actual start date when moving to in_progress
      if (body.status === 'in_progress' && !existingProject.actualStartDate) {
        body.actualStartDate = now
      }

      // Set actual end date when completed
      if (body.status === 'completed' && !existingProject.actualEndDate) {
        body.actualEndDate = now
      }
    }

    // Track milestone completion
    if (body.milestones) {
      body.milestones.forEach((newMilestone, idx) => {
        const oldMilestone = existingProject.milestones?.[idx]
        if (oldMilestone && newMilestone.status === 'completed' && oldMilestone.status !== 'completed') {
          activityLog.push({
            id: uuidv4(),
            action: 'milestone_completed',
            description: `Milestone "${newMilestone.name}" completed`,
            milestoneId: newMilestone.id,
            userId: user.id,
            userName: user.name || user.email,
            timestamp: now
          })
          newMilestone.completedAt = now
          newMilestone.completedBy = user.id
        }
      })

      // Auto-calculate progress from milestones
      const completedMilestones = body.milestones.filter(m => m.status === 'completed').length
      body.progress = Math.round((completedMilestones / body.milestones.length) * 100)
    }

    // Track budget changes
    if (body.budget !== undefined && body.budget !== existingProject.budget) {
      activityLog.push({
        id: uuidv4(),
        action: 'budget_changed',
        description: `Budget changed from ₹${existingProject.budget?.toLocaleString()} to ₹${body.budget?.toLocaleString()}`,
        previousValue: existingProject.budget,
        newValue: body.budget,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      })
    }

    // Track team changes
    if (body.team && JSON.stringify(body.team) !== JSON.stringify(existingProject.team)) {
      activityLog.push({
        id: uuidv4(),
        action: 'team_updated',
        description: 'Team members updated',
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      })
    }

    const updatedProject = {
      ...existingProject,
      ...body,
      id: projectId,
      activityLog,
      updatedAt: now
    }

    await projectsCollection.updateOne(
      { id: projectId },
      { $set: updatedProject }
    )

    return successResponse(sanitizeDocument(updatedProject))
  } catch (error) {
    console.error('Project PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update project', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { projectId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const result = await projectsCollection.deleteOne({ id: projectId })

    if (result.deletedCount === 0) {
      return errorResponse('Project not found', 404)
    }

    // Also delete related tasks
    const tasksCollection = db.collection('tasks')
    await tasksCollection.deleteMany({ projectId })

    return successResponse({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Project DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete project', 500, error.message)
  }
}
