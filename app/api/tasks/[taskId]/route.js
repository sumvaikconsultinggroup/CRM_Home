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

    const { taskId } = await params
    const { searchParams } = new URL(request.url)
    const includeSubtasks = searchParams.get('includeSubtasks') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')
    const usersCollection = db.collection('users')
    const projectsCollection = db.collection('projects')

    const task = await tasksCollection.findOne({ id: taskId })

    if (!task) {
      return errorResponse('Task not found', 404)
    }

    // Get users for enrichment
    const users = await usersCollection.find({}).toArray()
    const userMap = {}
    users.forEach(u => { userMap[u.id] = u })

    // Enrich task with user details
    const enrichedTask = {
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
      createdByDetails: userMap[task.createdBy] ? {
        id: userMap[task.createdBy].id,
        name: userMap[task.createdBy].name,
        email: userMap[task.createdBy].email
      } : null,
      // Enrich comments with user details
      comments: (task.comments || []).map(comment => ({
        ...comment,
        userDetails: userMap[comment.userId] ? {
          id: userMap[comment.userId].id,
          name: userMap[comment.userId].name,
          email: userMap[comment.userId].email
        } : null
      }))
    }

    // Get project details if linked
    if (task.projectId) {
      const project = await projectsCollection.findOne({ id: task.projectId })
      if (project) {
        enrichedTask.projectDetails = {
          id: project.id,
          name: project.name,
          projectNumber: project.projectNumber,
          status: project.status
        }
      }
    }

    // Get subtasks if requested
    if (includeSubtasks && task.subtasks?.length > 0) {
      const subtasks = await tasksCollection.find({ id: { $in: task.subtasks } }).toArray()
      enrichedTask.subtaskDetails = subtasks.map(st => ({
        id: st.id,
        taskNumber: st.taskNumber,
        title: st.title,
        status: st.status,
        priority: st.priority,
        assignees: st.assignees
      }))
    }

    // Get parent task if this is a subtask
    if (task.parentId) {
      const parent = await tasksCollection.findOne({ id: task.parentId })
      if (parent) {
        enrichedTask.parentDetails = {
          id: parent.id,
          taskNumber: parent.taskNumber,
          title: parent.title,
          status: parent.status
        }
      }
    }

    // Get blocked by and blocks task details
    if (task.blockedBy?.length > 0) {
      const blockedByTasks = await tasksCollection.find({ id: { $in: task.blockedBy } }).toArray()
      enrichedTask.blockedByDetails = blockedByTasks.map(t => ({
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        status: t.status
      }))
    }

    if (task.blocks?.length > 0) {
      const blocksTasks = await tasksCollection.find({ id: { $in: task.blocks } }).toArray()
      enrichedTask.blocksDetails = blocksTasks.map(t => ({
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        status: t.status
      }))
    }

    return successResponse(sanitizeDocument(enrichedTask))
  } catch (error) {
    console.error('Task GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch task', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { taskId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const existingTask = await tasksCollection.findOne({ id: taskId })
    if (!existingTask) {
      return errorResponse('Task not found', 404)
    }

    const now = new Date()
    const activityLog = [...(existingTask.activityLog || [])]

    // Handle specific actions
    if (body.action === 'add_comment') {
      const comment = {
        id: uuidv4(),
        userId: user.id,
        userName: user.name || user.email,
        content: body.content,
        mentions: body.mentions || [],
        attachments: body.attachments || [],
        createdAt: now,
        updatedAt: now,
        reactions: []
      }
      
      await tasksCollection.updateOne(
        { id: taskId },
        { 
          $push: { 
            comments: comment,
            activityLog: {
              id: uuidv4(),
              action: 'comment_added',
              description: `${user.name || user.email} added a comment`,
              userId: user.id,
              userName: user.name || user.email,
              timestamp: now
            }
          },
          $set: { updatedAt: now }
        }
      )
      
      const updatedTask = await tasksCollection.findOne({ id: taskId })
      return successResponse(sanitizeDocument(updatedTask))
    }

    if (body.action === 'edit_comment') {
      const updatedComments = (existingTask.comments || []).map(c => 
        c.id === body.commentId 
          ? { ...c, content: body.content, updatedAt: now, edited: true }
          : c
      )
      
      await tasksCollection.updateOne(
        { id: taskId },
        { $set: { comments: updatedComments, updatedAt: now } }
      )
      
      const updatedTask = await tasksCollection.findOne({ id: taskId })
      return successResponse(sanitizeDocument(updatedTask))
    }

    if (body.action === 'delete_comment') {
      const updatedComments = (existingTask.comments || []).filter(c => c.id !== body.commentId)
      
      await tasksCollection.updateOne(
        { id: taskId },
        { $set: { comments: updatedComments, updatedAt: now } }
      )
      
      const updatedTask = await tasksCollection.findOne({ id: taskId })
      return successResponse(sanitizeDocument(updatedTask))
    }

    if (body.action === 'log_time') {
      const timeEntry = {
        id: uuidv4(),
        userId: user.id,
        userName: user.name || user.email,
        hours: body.hours,
        description: body.description || '',
        date: body.date ? new Date(body.date) : now,
        createdAt: now
      }
      
      const newLoggedHours = (existingTask.loggedHours || 0) + body.hours
      
      await tasksCollection.updateOne(
        { id: taskId },
        { 
          $push: { 
            timeEntries: timeEntry,
            activityLog: {
              id: uuidv4(),
              action: 'time_logged',
              description: `${user.name || user.email} logged ${body.hours}h`,
              userId: user.id,
              userName: user.name || user.email,
              timestamp: now
            }
          },
          $set: { loggedHours: newLoggedHours, updatedAt: now }
        }
      )
      
      const updatedTask = await tasksCollection.findOne({ id: taskId })
      return successResponse(sanitizeDocument(updatedTask))
    }

    if (body.action === 'update_checklist') {
      await tasksCollection.updateOne(
        { id: taskId },
        { 
          $set: { 
            checklist: body.checklist, 
            progress: body.progress || existingTask.progress,
            updatedAt: now 
          }
        }
      )
      
      const updatedTask = await tasksCollection.findOne({ id: taskId })
      return successResponse(sanitizeDocument(updatedTask))
    }

    // Track status change
    if (body.status && body.status !== existingTask.status) {
      activityLog.push({
        id: uuidv4(),
        action: 'status_changed',
        description: `Status changed from "${existingTask.status}" to "${body.status}"`,
        oldValue: existingTask.status,
        newValue: body.status,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      })

      // Track completion
      if (body.status === 'completed' && existingTask.status !== 'completed') {
        body.completedAt = now
        body.completedBy = user.id
      }
      // Track re-opening
      if (body.status !== 'completed' && existingTask.status === 'completed') {
        body.completedAt = null
        body.completedBy = null
      }
    }

    // Track priority change
    if (body.priority && body.priority !== existingTask.priority) {
      activityLog.push({
        id: uuidv4(),
        action: 'priority_changed',
        description: `Priority changed from "${existingTask.priority}" to "${body.priority}"`,
        oldValue: existingTask.priority,
        newValue: body.priority,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      })
    }

    // Track assignee changes
    if (body.assignees && JSON.stringify(body.assignees) !== JSON.stringify(existingTask.assignees)) {
      activityLog.push({
        id: uuidv4(),
        action: 'assignees_changed',
        description: `Assignees updated`,
        oldValue: existingTask.assignees,
        newValue: body.assignees,
        userId: user.id,
        userName: user.name || user.email,
        timestamp: now
      })
    }

    const updatedTask = {
      ...existingTask,
      ...body,
      id: taskId,
      activityLog,
      updatedAt: now
    }

    // Remove action from saved data
    delete updatedTask.action

    await tasksCollection.updateOne(
      { id: taskId },
      { $set: updatedTask }
    )

    // Update project progress if task is linked to a project
    if (updatedTask.projectId) {
      const projectsCollection = db.collection('projects')
      const project = await projectsCollection.findOne({ id: updatedTask.projectId })
      
      if (project && project.settings?.autoProgressFromTasks) {
        const projectTasks = await tasksCollection.find({ projectId: updatedTask.projectId }).toArray()
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length
        const totalTasks = projectTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        await projectsCollection.updateOne(
          { id: updatedTask.projectId },
          { 
            $set: { progress, updatedAt: now },
            $push: {
              activityLog: {
                id: uuidv4(),
                action: 'task_updated',
                description: `Task "${updatedTask.title}" ${body.status === 'completed' ? 'completed' : 'updated'}. Progress: ${progress}%`,
                userId: user.id,
                userName: user.name || user.email,
                timestamp: now
              }
            }
          }
        )
      }
    }

    // If parent task exists, update its progress based on subtasks
    if (updatedTask.parentId) {
      const parentTask = await tasksCollection.findOne({ id: updatedTask.parentId })
      if (parentTask && parentTask.subtasks?.length > 0) {
        const subtasks = await tasksCollection.find({ id: { $in: parentTask.subtasks } }).toArray()
        const completedSubtasks = subtasks.filter(t => t.status === 'completed').length
        const progress = Math.round((completedSubtasks / subtasks.length) * 100)
        
        await tasksCollection.updateOne(
          { id: updatedTask.parentId },
          { $set: { progress, updatedAt: now } }
        )
      }
    }

    return successResponse(sanitizeDocument(updatedTask))
  } catch (error) {
    console.error('Task PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update task', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { taskId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')

    const task = await tasksCollection.findOne({ id: taskId })
    if (!task) {
      return errorResponse('Task not found', 404)
    }

    // Remove from parent's subtasks array if this is a subtask
    if (task.parentId) {
      await tasksCollection.updateOne(
        { id: task.parentId },
        { 
          $pull: { subtasks: taskId },
          $set: { updatedAt: new Date() }
        }
      )
    }

    // Delete all subtasks if this task has any
    if (task.subtasks?.length > 0) {
      await tasksCollection.deleteMany({ id: { $in: task.subtasks } })
    }

    // Remove this task from any blockedBy/blocks arrays in other tasks
    await tasksCollection.updateMany(
      { $or: [{ blockedBy: taskId }, { blocks: taskId }] },
      { 
        $pull: { blockedBy: taskId, blocks: taskId },
        $set: { updatedAt: new Date() }
      }
    )

    await tasksCollection.deleteOne({ id: taskId })

    // Update project progress if task was linked
    if (task.projectId) {
      const projectsCollection = db.collection('projects')
      const project = await projectsCollection.findOne({ id: task.projectId })
      
      if (project && project.settings?.autoProgressFromTasks) {
        const projectTasks = await tasksCollection.find({ projectId: task.projectId }).toArray()
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length
        const totalTasks = projectTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        await projectsCollection.updateOne(
          { id: task.projectId },
          { $set: { progress, updatedAt: new Date() } }
        )
      }
    }

    return successResponse({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Task DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete task', 500, error.message)
  }
}
