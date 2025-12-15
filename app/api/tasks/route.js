import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { validateTaskData } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('projectId')
    const assigneeId = searchParams.get('assigneeId')
    const taskType = searchParams.get('taskType')
    const parentId = searchParams.get('parentId')
    const label = searchParams.get('label')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeStats = searchParams.get('includeStats') === 'true'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit')) || 500
    const page = parseInt(searchParams.get('page')) || 1

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')
    const usersCollection = db.collection('users')
    const projectsCollection = db.collection('projects')

    // Build filter
    const filter = {}
    if (status) {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') }
      } else {
        filter.status = status
      }
    }
    if (priority) {
      if (priority.includes(',')) {
        filter.priority = { $in: priority.split(',') }
      } else {
        filter.priority = priority
      }
    }
    if (projectId) filter.projectId = projectId
    if (assigneeId) filter.assignees = assigneeId
    if (taskType) filter.taskType = taskType
    if (parentId) filter.parentId = parentId
    if (label) filter.labels = label
    
    // Date range filter
    if (startDate || endDate) {
      filter.dueDate = {}
      if (startDate) filter.dueDate.$gte = new Date(startDate)
      if (endDate) filter.dueDate.$lte = new Date(endDate)
    }
    
    // Search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { taskNumber: { $regex: search, $options: 'i' } }
      ]
    }

    // Sorting
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1

    // Pagination
    const skip = (page - 1) * limit
    const total = await tasksCollection.countDocuments(filter)

    const tasks = await tasksCollection
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray()

    // Get users and projects for enrichment
    const users = await usersCollection.find({}).toArray()
    const projects = await projectsCollection.find({}).toArray()

    const userMap = {}
    users.forEach(u => { userMap[u.id] = u })
    const projectMap = {}
    projects.forEach(p => { projectMap[p.id] = p })

    // Enrich tasks with user and project details
    const enrichedTasks = tasks.map(task => ({
      ...task,
      assigneeDetails: (task.assignees || []).map(id => userMap[id]).filter(Boolean).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar
      })),
      reporterDetails: userMap[task.reporter] ? {
        id: userMap[task.reporter].id,
        name: userMap[task.reporter].name,
        email: userMap[task.reporter].email
      } : null,
      projectDetails: projectMap[task.projectId] ? {
        id: projectMap[task.projectId].id,
        name: projectMap[task.projectId].name,
        projectNumber: projectMap[task.projectId].projectNumber
      } : null
    }))

    // Calculate stats if requested
    let stats = null
    if (includeStats) {
      const allTasks = await tasksCollection.find({}).toArray()
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - today.getDay())

      stats = {
        total: allTasks.length,
        byStatus: {
          backlog: allTasks.filter(t => t.status === 'backlog').length,
          todo: allTasks.filter(t => t.status === 'todo').length,
          in_progress: allTasks.filter(t => t.status === 'in_progress').length,
          review: allTasks.filter(t => t.status === 'review').length,
          completed: allTasks.filter(t => t.status === 'completed').length,
          cancelled: allTasks.filter(t => t.status === 'cancelled').length
        },
        byPriority: {
          urgent: allTasks.filter(t => t.priority === 'urgent').length,
          high: allTasks.filter(t => t.priority === 'high').length,
          medium: allTasks.filter(t => t.priority === 'medium').length,
          low: allTasks.filter(t => t.priority === 'low').length
        },
        byType: {
          task: allTasks.filter(t => t.taskType === 'task').length,
          bug: allTasks.filter(t => t.taskType === 'bug').length,
          feature: allTasks.filter(t => t.taskType === 'feature').length,
          story: allTasks.filter(t => t.taskType === 'story').length,
          epic: allTasks.filter(t => t.taskType === 'epic').length
        },
        overdue: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'cancelled').length,
        dueToday: allTasks.filter(t => {
          if (!t.dueDate) return false
          const due = new Date(t.dueDate)
          return due.toDateString() === today.toDateString() && t.status !== 'completed' && t.status !== 'cancelled'
        }).length,
        dueThisWeek: allTasks.filter(t => {
          if (!t.dueDate) return false
          const due = new Date(t.dueDate)
          return due >= thisWeekStart && due <= new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000) && t.status !== 'completed' && t.status !== 'cancelled'
        }).length,
        unassigned: allTasks.filter(t => !t.assignees || t.assignees.length === 0).length,
        completedThisWeek: allTasks.filter(t => {
          if (t.status !== 'completed' || !t.completedAt) return false
          return new Date(t.completedAt) >= thisWeekStart
        }).length
      }
    }

    return successResponse({
      tasks: sanitizeDocuments(enrichedTasks),
      stats,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Tasks GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch tasks', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    // Handle bulk operations
    if (body.action === 'bulk_update') {
      const { taskIds, updates } = body
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return errorResponse('Task IDs required for bulk update', 400)
      }

      const dbName = getUserDatabaseName(user)
      const db = await getClientDb(dbName)
      const tasksCollection = db.collection('tasks')
      const now = new Date()

      const updateData = { ...updates, updatedAt: now }
      
      // Track completion for bulk updates
      if (updates.status === 'completed') {
        updateData.completedAt = now
        updateData.completedBy = user.id
      }

      await tasksCollection.updateMany(
        { id: { $in: taskIds } },
        { $set: updateData }
      )

      return successResponse({ message: `${taskIds.length} tasks updated`, updated: taskIds.length })
    }

    // Handle bulk delete
    if (body.action === 'bulk_delete') {
      const { taskIds } = body
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return errorResponse('Task IDs required for bulk delete', 400)
      }

      const dbName = getUserDatabaseName(user)
      const db = await getClientDb(dbName)
      const tasksCollection = db.collection('tasks')

      await tasksCollection.deleteMany({ id: { $in: taskIds } })

      return successResponse({ message: `${taskIds.length} tasks deleted`, deleted: taskIds.length })
    }
    
    const validation = validateTaskData(body)
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    // Generate task number
    const count = await tasksCollection.countDocuments()
    const taskNumber = `TASK-${String(count + 1).padStart(4, '0')}`

    const now = new Date()
    const task = {
      id: uuidv4(),
      taskNumber,
      clientId: user.clientId,
      
      // Basic info
      title: body.title,
      description: body.description || '',
      
      // Type and categorization
      taskType: body.taskType || 'task', // task, bug, feature, story, epic
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      
      // Relationships
      projectId: body.projectId || null,
      parentId: body.parentId || null, // For subtasks
      sprintId: body.sprintId || null,
      milestoneId: body.milestoneId || null,
      
      // People
      assignees: body.assignees || [],
      reporter: body.reporter || user.id,
      watchers: body.watchers || [user.id],
      
      // Dates
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      completedAt: null,
      completedBy: null,
      
      // Time tracking
      estimatedHours: body.estimatedHours || null,
      loggedHours: 0,
      timeEntries: [],
      
      // Organization
      labels: body.labels || [],
      tags: body.tags || [],
      customFields: body.customFields || {},
      
      // Progress
      progress: 0,
      subtasks: [],
      checklist: body.checklist || [],
      
      // Dependencies
      blockedBy: body.blockedBy || [], // Task IDs that block this task
      blocks: body.blocks || [], // Task IDs that this task blocks
      relatedTo: body.relatedTo || [], // Related task IDs
      
      // Attachments and comments
      attachments: body.attachments || [],
      comments: [],
      
      // Activity
      activityLog: [{
        id: uuidv4(),
        action: 'created',
        description: `Task created by ${user.name || user.email}`,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      }],
      
      // Source (for tasks created from other modules like Teams)
      sourceType: body.sourceType || null, // 'teams_message', 'lead', 'email', etc.
      sourceMessageId: body.sourceMessageId || null,
      sourceChannelId: body.sourceChannelId || null,
      sourceLeadId: body.sourceLeadId || null,
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await tasksCollection.insertOne(task)

    // If this is a subtask, update parent's subtasks array
    if (task.parentId) {
      await tasksCollection.updateOne(
        { id: task.parentId },
        { 
          $push: { subtasks: task.id },
          $set: { updatedAt: now }
        }
      )
    }

    return successResponse(sanitizeDocument(task), 201)
  } catch (error) {
    console.error('Tasks POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create task', 500, error.message)
  }
}
