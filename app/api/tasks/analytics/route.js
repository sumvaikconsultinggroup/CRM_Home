import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get team analytics and metrics
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // week, month, all
    const userId = searchParams.get('userId') // Optional: filter by specific user

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const tasksCollection = db.collection('tasks')
    const usersCollection = db.collection('users')
    const timeEntriesCollection = db.collection('time_entries')

    // Calculate date range
    const now = new Date()
    let startDate
    if (period === 'week') {
      startDate = subDays(now, 7)
    } else if (period === 'month') {
      startDate = subDays(now, 30)
    } else {
      startDate = subDays(now, 365)
    }

    // Build task filter
    const taskFilter = { parentId: { $exists: false } }
    if (userId) {
      taskFilter.assignees = userId
    }

    // Fetch all tasks
    const allTasks = await tasksCollection.find(taskFilter).toArray()
    
    // Fetch tasks created in period
    const periodTasks = await tasksCollection.find({
      ...taskFilter,
      createdAt: { $gte: startDate }
    }).toArray()

    // Fetch completed tasks in period
    const completedInPeriod = allTasks.filter(t => {
      if (t.status !== 'completed') return false
      const completedAt = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt)
      return completedAt >= startDate
    })

    // Fetch users
    const users = await usersCollection.find({}).toArray()

    // Fetch time entries
    const timeEntries = await timeEntriesCollection.find({
      date: { $gte: startDate }
    }).toArray()

    // Calculate status distribution
    const statusCounts = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      cancelled: 0
    }
    allTasks.forEach(t => {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++
      }
    })

    // Calculate priority distribution
    const priorityCounts = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    }
    allTasks.forEach(t => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++
      }
    })

    // Calculate overdue tasks
    const overdueTasks = allTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false
      const dueDate = new Date(t.dueDate)
      return dueDate < startOfDay(now)
    })

    // Calculate average completion time
    let avgCompletionTime = 0
    if (completedInPeriod.length > 0) {
      const totalDays = completedInPeriod.reduce((acc, t) => {
        const created = new Date(t.createdAt)
        const completed = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt)
        return acc + differenceInDays(completed, created)
      }, 0)
      avgCompletionTime = Math.round((totalDays / completedInPeriod.length) * 10) / 10
    }

    // Team workload breakdown
    const teamWorkload = users.map(u => {
      const userTasks = allTasks.filter(t => t.assignees?.includes(u.id))
      const completed = userTasks.filter(t => t.status === 'completed').length
      const inProgress = userTasks.filter(t => t.status === 'in_progress').length
      const overdue = userTasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false
        return new Date(t.dueDate) < startOfDay(now)
      }).length
      
      // Calculate time logged
      const userTimeEntries = timeEntries.filter(e => e.userId === u.id)
      const totalMinutesLogged = userTimeEntries.reduce((acc, e) => 
        acc + (e.hours || 0) * 60 + (e.minutes || 0), 0
      )

      return {
        userId: u.id,
        userName: u.name || u.email,
        userEmail: u.email,
        avatar: u.avatar,
        totalTasks: userTasks.length,
        completedTasks: completed,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
        completionRate: userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0,
        totalHoursLogged: Math.round((totalMinutesLogged / 60) * 10) / 10
      }
    }).sort((a, b) => b.totalTasks - a.totalTasks)

    // Daily completion trend (last 7 days)
    const completionTrend = []
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i)
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const createdOnDay = allTasks.filter(t => {
        const created = new Date(t.createdAt)
        return created >= dayStart && created <= dayEnd
      }).length

      const completedOnDay = allTasks.filter(t => {
        if (t.status !== 'completed') return false
        const completed = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt)
        return completed >= dayStart && completed <= dayEnd
      }).length

      completionTrend.push({
        date: day.toISOString(),
        created: createdOnDay,
        completed: completedOnDay
      })
    }

    // Calculate total time logged in period
    const totalTimeLogged = timeEntries.reduce((acc, e) => 
      acc + (e.hours || 0) * 60 + (e.minutes || 0), 0
    )

    // Top performers (by completion rate, min 3 tasks)
    const topPerformers = teamWorkload
      .filter(w => w.totalTasks >= 3)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)

    return successResponse({
      period,
      summary: {
        totalTasks: allTasks.length,
        tasksCreatedInPeriod: periodTasks.length,
        completedInPeriod: completedInPeriod.length,
        inProgress: statusCounts.in_progress,
        overdue: overdueTasks.length,
        avgCompletionTimeDays: avgCompletionTime,
        completionRate: allTasks.length > 0 
          ? Math.round((statusCounts.completed / allTasks.length) * 100) 
          : 0,
        totalHoursLogged: Math.round((totalTimeLogged / 60) * 10) / 10
      },
      distribution: {
        byStatus: statusCounts,
        byPriority: priorityCounts
      },
      teamWorkload,
      topPerformers,
      completionTrend
    })
  } catch (error) {
    console.error('Analytics GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch analytics', 500, error.message)
  }
}
