import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Project reports and analytics
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    const projectsCollection = db.collection('projects')
    const tasksCollection = db.collection('tasks')
    const expensesCollection = db.collection('expenses')

    let dateFilter = {}
    if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) }
    if (endDate) dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate) }

    let report = {}

    switch (reportType) {
      case 'overview': {
        const projects = await projectsCollection.find(dateFilter).toArray()
        const tasks = await tasksCollection.find({}).toArray()
        const expenses = await expensesCollection.find({}).toArray()

        const now = new Date()

        report = {
          summary: {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => ['planning', 'in_progress', 'review'].includes(p.status)).length,
            completedProjects: projects.filter(p => p.status === 'completed').length,
            overdueProjects: projects.filter(p => p.endDate && new Date(p.endDate) < now && !['completed', 'closed'].includes(p.status)).length,
            onHoldProjects: projects.filter(p => p.status === 'on_hold').length
          },
          
          byStatus: {
            planning: projects.filter(p => p.status === 'planning').length,
            in_progress: projects.filter(p => p.status === 'in_progress').length,
            on_hold: projects.filter(p => p.status === 'on_hold').length,
            review: projects.filter(p => p.status === 'review').length,
            completed: projects.filter(p => p.status === 'completed').length,
            closed: projects.filter(p => p.status === 'closed').length
          },

          byType: projects.reduce((acc, p) => {
            const type = p.projectType || 'default'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {}),

          byPriority: {
            urgent: projects.filter(p => p.priority === 'urgent').length,
            high: projects.filter(p => p.priority === 'high').length,
            medium: projects.filter(p => p.priority === 'medium').length,
            low: projects.filter(p => p.priority === 'low').length
          },

          financial: {
            totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
            totalSpent: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
            averageBudget: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length) : 0,
            averageSpent: projects.length > 0 ? Math.round(expenses.reduce((sum, e) => sum + (e.amount || 0), 0) / projects.length) : 0
          },

          tasks: {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            pending: tasks.filter(t => t.status === 'todo' || t.status === 'pending').length,
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length
          },

          avgProgress: projects.length > 0 
            ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
            : 0,

          // Projects created per month (last 6 months)
          projectsOverTime: getMonthlyTrend(projects, 6),
          
          // Top projects by budget
          topProjectsByBudget: projects
            .sort((a, b) => (b.budget || 0) - (a.budget || 0))
            .slice(0, 5)
            .map(p => ({
              id: p.id,
              name: p.name,
              projectNumber: p.projectNumber,
              budget: p.budget,
              spent: expenses.filter(e => e.projectId === p.id).reduce((sum, e) => sum + (e.amount || 0), 0),
              progress: p.progress
            }))
        }
        break
      }

      case 'timeline': {
        const projects = await projectsCollection.find(dateFilter).toArray()
        
        report = {
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            projectNumber: p.projectNumber,
            status: p.status,
            progress: p.progress || 0,
            startDate: p.startDate,
            endDate: p.endDate,
            actualStartDate: p.actualStartDate,
            actualEndDate: p.actualEndDate,
            milestones: (p.milestones || []).map(m => ({
              id: m.id,
              name: m.name,
              status: m.status,
              phase: m.phase,
              completedAt: m.completedAt
            })),
            isOverdue: p.endDate && new Date(p.endDate) < new Date() && !['completed', 'closed'].includes(p.status)
          })),
          
          // Timeline events
          events: projects.flatMap(p => {
            const events = []
            if (p.startDate) events.push({ date: p.startDate, type: 'start', projectId: p.id, projectName: p.name })
            if (p.endDate) events.push({ date: p.endDate, type: 'due', projectId: p.id, projectName: p.name })
            if (p.actualEndDate) events.push({ date: p.actualEndDate, type: 'completed', projectId: p.id, projectName: p.name })
            return events
          }).sort((a, b) => new Date(a.date) - new Date(b.date))
        }
        break
      }

      case 'budget': {
        const projects = await projectsCollection.find(dateFilter).toArray()
        const expenses = await expensesCollection.find({}).toArray()

        const projectBudgets = projects.map(p => {
          const projectExpenses = expenses.filter(e => e.projectId === p.id)
          const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
          
          return {
            id: p.id,
            name: p.name,
            projectNumber: p.projectNumber,
            budget: p.budget || 0,
            spent,
            remaining: (p.budget || 0) - spent,
            percentUsed: p.budget ? Math.round((spent / p.budget) * 100) : 0,
            isOverBudget: spent > (p.budget || 0),
            expenseBreakdown: projectExpenses.reduce((acc, e) => {
              const cat = e.category || 'other'
              acc[cat] = (acc[cat] || 0) + (e.amount || 0)
              return acc
            }, {})
          }
        })

        report = {
          summary: {
            totalBudget: projectBudgets.reduce((sum, p) => sum + p.budget, 0),
            totalSpent: projectBudgets.reduce((sum, p) => sum + p.spent, 0),
            totalRemaining: projectBudgets.reduce((sum, p) => sum + p.remaining, 0),
            overBudgetCount: projectBudgets.filter(p => p.isOverBudget).length,
            avgBudgetUtilization: projectBudgets.length > 0 
              ? Math.round(projectBudgets.reduce((sum, p) => sum + p.percentUsed, 0) / projectBudgets.length)
              : 0
          },
          projects: projectBudgets.sort((a, b) => b.budget - a.budget),
          
          // Expense categories across all projects
          expenseCategories: expenses.reduce((acc, e) => {
            const cat = e.category || 'other'
            acc[cat] = (acc[cat] || 0) + (e.amount || 0)
            return acc
          }, {}),
          
          // Monthly spending trend
          monthlySpending: getMonthlySpending(expenses, 6)
        }
        break
      }

      case 'team': {
        const projects = await projectsCollection.find(dateFilter).toArray()
        const tasks = await tasksCollection.find({}).toArray()

        // Aggregate team workload
        const teamStats = {}
        
        projects.forEach(p => {
          (p.team || []).forEach(member => {
            if (!teamStats[member.userId]) {
              teamStats[member.userId] = {
                userId: member.userId,
                userName: member.userName,
                projectCount: 0,
                roles: [],
                taskCount: 0,
                completedTasks: 0
              }
            }
            teamStats[member.userId].projectCount++
            if (!teamStats[member.userId].roles.includes(member.role)) {
              teamStats[member.userId].roles.push(member.role)
            }
          })
        })

        // Add task stats
        tasks.forEach(t => {
          if (t.assignedTo && teamStats[t.assignedTo]) {
            teamStats[t.assignedTo].taskCount++
            if (t.status === 'completed') {
              teamStats[t.assignedTo].completedTasks++
            }
          }
        })

        report = {
          teamMembers: Object.values(teamStats).sort((a, b) => b.projectCount - a.projectCount),
          totalMembers: Object.keys(teamStats).length,
          avgProjectsPerMember: Object.keys(teamStats).length > 0
            ? Math.round(projects.length / Object.keys(teamStats).length * 10) / 10
            : 0,
          taskDistribution: Object.values(teamStats).map(m => ({
            name: m.userName,
            tasks: m.taskCount,
            completed: m.completedTasks
          }))
        }
        break
      }

      case 'single_project': {
        if (!projectId) {
          return errorResponse('Project ID required for single project report', 400)
        }

        const project = await projectsCollection.findOne({ id: projectId })
        if (!project) {
          return errorResponse('Project not found', 404)
        }

        const tasks = await tasksCollection.find({ projectId }).toArray()
        const expenses = await expensesCollection.find({ projectId }).toArray()

        const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        const completedMilestones = (project.milestones || []).filter(m => m.status === 'completed').length
        const totalMilestones = (project.milestones || []).length

        report = {
          project: {
            id: project.id,
            name: project.name,
            projectNumber: project.projectNumber,
            status: project.status,
            progress: project.progress || 0,
            startDate: project.startDate,
            endDate: project.endDate
          },
          
          progress: {
            overall: project.progress || 0,
            milestones: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
            tasks: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
          },

          budget: {
            budget: project.budget || 0,
            spent: totalSpent,
            remaining: (project.budget || 0) - totalSpent,
            percentUsed: project.budget ? Math.round((totalSpent / project.budget) * 100) : 0
          },

          milestones: {
            total: totalMilestones,
            completed: completedMilestones,
            pending: totalMilestones - completedMilestones,
            list: project.milestones || []
          },

          tasks: {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            pending: tasks.filter(t => t.status === 'todo' || t.status === 'pending').length,
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length
          },

          expenses: {
            total: totalSpent,
            count: expenses.length,
            byCategory: expenses.reduce((acc, e) => {
              const cat = e.category || 'other'
              acc[cat] = (acc[cat] || 0) + (e.amount || 0)
              return acc
            }, {}),
            recent: expenses.slice(0, 5)
          },

          team: project.team || [],

          activityLog: (project.activityLog || []).slice(-20).reverse()
        }
        break
      }

      default:
        return errorResponse('Invalid report type', 400)
    }

    return successResponse(report)
  } catch (error) {
    console.error('Project Reports API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to generate report', 500, error.message)
  }
}

// Helper: Get monthly trend for projects
function getMonthlyTrend(items, months) {
  const result = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const count = items.filter(item => {
      const createdAt = new Date(item.createdAt)
      return createdAt >= date && createdAt <= monthEnd
    }).length

    result.push({ month: monthName, count })
  }
  
  return result
}

// Helper: Get monthly spending trend
function getMonthlySpending(expenses, months) {
  const result = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const amount = expenses
      .filter(e => {
        const expDate = new Date(e.date || e.createdAt)
        return expDate >= date && expDate <= monthEnd
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    result.push({ month: monthName, amount })
  }
  
  return result
}
