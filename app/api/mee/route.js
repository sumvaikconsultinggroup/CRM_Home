import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

// Initialize OpenAI client with Emergent LLM Key
const getAIClient = () => {
  const apiKey = process.env.EMERGENT_LLM_KEY
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.emergentmethods.ai/v1'
  })
}

// Get model based on provider preference
const getModel = (provider = 'openai') => {
  const models = {
    openai: 'gpt-4o',
    claude: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash'
  }
  return models[provider] || models.openai
}

// ========================================
// ENTERPRISE DATA FETCHING FUNCTIONS
// ========================================

/**
 * Fetch comprehensive CRM data for AI context
 */
async function fetchCRMContext(db, mainDb, user) {
  const context = {
    timestamp: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  }

  try {
    // Parallel fetch all data for performance
    const [
      leads, projects, tasks, expenses, contacts, 
      calendarEvents, notes, inventory, customers,
      wfProjects, quotations, orders, invoices, vendors
    ] = await Promise.all([
      // Core CRM Data
      db.collection('leads').find({}).sort({ createdAt: -1 }).limit(100).toArray(),
      db.collection('projects').find({}).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection('tasks').find({}).sort({ dueDate: 1 }).limit(100).toArray(),
      db.collection('expenses').find({}).sort({ date: -1 }).limit(100).toArray(),
      db.collection('contacts').find({}).sort({ createdAt: -1 }).limit(100).toArray(),
      db.collection('calendar_events').find({}).sort({ date: 1 }).limit(50).toArray(),
      db.collection('notes').find({}).sort({ updatedAt: -1 }).limit(50).toArray(),
      // Wooden Flooring Module Data
      db.collection('wf_inventory').find({}).toArray(),
      db.collection('wf_customers').find({}).toArray(),
      db.collection('wf_projects').find({}).toArray(),
      db.collection('wf_quotations').find({}).toArray(),
      db.collection('wf_orders').find({}).toArray(),
      db.collection('wf_invoices').find({}).toArray(),
      db.collection('wf_vendors').find({}).toArray()
    ])

    // ========================================
    // LEADS ANALYTICS
    // ========================================
    context.leads = {
      total: leads.length,
      byStatus: groupBy(leads, 'status'),
      bySource: groupBy(leads, 'source'),
      totalValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),
      hotLeads: leads.filter(l => l.score >= 70 || l.priority === 'high'),
      newThisWeek: leads.filter(l => isWithinDays(l.createdAt, 7)),
      requiresFollowUp: leads.filter(l => {
        if (!l.nextFollowUp) return l.status === 'new' || l.status === 'contacted'
        return new Date(l.nextFollowUp) <= new Date()
      }),
      topLeads: leads.sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5).map(l => ({
        name: l.name, company: l.company, value: l.value, status: l.status, source: l.source
      })),
      conversionFunnel: {
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        qualified: leads.filter(l => l.status === 'qualified').length,
        proposal: leads.filter(l => l.status === 'proposal').length,
        negotiation: leads.filter(l => l.status === 'negotiation').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost').length
      }
    }

    // ========================================
    // PROJECTS ANALYTICS
    // ========================================
    context.projects = {
      total: projects.length,
      byStatus: groupBy(projects, 'status'),
      active: projects.filter(p => p.status === 'in_progress'),
      completed: projects.filter(p => p.status === 'completed'),
      overdue: projects.filter(p => p.endDate && new Date(p.endDate) < new Date() && p.status !== 'completed'),
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      avgProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0,
      recentProjects: projects.slice(0, 5).map(p => ({
        name: p.name, status: p.status, progress: p.progress, budget: p.budget
      }))
    }

    // ========================================
    // TASKS ANALYTICS
    // ========================================
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    context.tasks = {
      total: tasks.length,
      byStatus: groupBy(tasks, 'status'),
      byPriority: groupBy(tasks, 'priority'),
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed'),
      dueToday: tasks.filter(t => {
        if (!t.dueDate) return false
        const due = new Date(t.dueDate)
        return due >= today && due < tomorrow
      }),
      dueThisWeek: tasks.filter(t => {
        if (!t.dueDate) return false
        const due = new Date(t.dueDate)
        return due >= today && due < nextWeek
      }),
      highPriority: tasks.filter(t => t.priority === 'high' && t.status !== 'completed'),
      completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
      urgentTasks: tasks.filter(t => t.priority === 'high' || (t.dueDate && new Date(t.dueDate) <= tomorrow))
        .slice(0, 10).map(t => ({ title: t.title, priority: t.priority, dueDate: t.dueDate, status: t.status }))
    }

    // ========================================
    // EXPENSES ANALYTICS
    // ========================================
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    context.expenses = {
      total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      thisMonth: expenses.filter(e => new Date(e.date) >= thisMonth).reduce((sum, e) => sum + (e.amount || 0), 0),
      byCategory: Object.entries(groupBy(expenses, 'category')).map(([cat, items]) => ({
        category: cat, count: items.length, total: items.reduce((sum, e) => sum + (e.amount || 0), 0)
      })),
      pending: expenses.filter(e => !e.approved),
      recentExpenses: expenses.slice(0, 10).map(e => ({
        description: e.description, amount: e.amount, category: e.category, date: e.date, approved: e.approved
      }))
    }

    // ========================================
    // CONTACTS ANALYTICS
    // ========================================
    context.contacts = {
      total: contacts.length,
      byType: groupBy(contacts, 'type'),
      recentlyAdded: contacts.filter(c => isWithinDays(c.createdAt, 30)),
      topContacts: contacts.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).slice(0, 5).map(c => ({
        name: c.name, company: c.company, type: c.type, totalRevenue: c.totalRevenue
      }))
    }

    // ========================================
    // CALENDAR & SCHEDULE
    // ========================================
    const upcomingEvents = calendarEvents.filter(e => new Date(e.date) >= today).slice(0, 10)
    context.calendar = {
      totalEvents: calendarEvents.length,
      upcomingEvents: upcomingEvents.map(e => ({
        title: e.title, date: e.date, time: e.startTime, type: e.type, location: e.location
      })),
      todayEvents: calendarEvents.filter(e => {
        const eventDate = new Date(e.date)
        return eventDate >= today && eventDate < tomorrow
      }),
      thisWeekEvents: calendarEvents.filter(e => {
        const eventDate = new Date(e.date)
        return eventDate >= today && eventDate < nextWeek
      })
    }

    // ========================================
    // WOODEN FLOORING MODULE
    // ========================================
    context.woodenFlooring = {
      inventory: {
        totalItems: inventory.length,
        totalValue: inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.costPrice || 0)), 0),
        lowStock: inventory.filter(i => (i.quantity || 0) <= (i.reorderLevel || 10)),
        byCategory: groupBy(inventory, 'category'),
        topProducts: inventory.sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, 5).map(i => ({
          name: i.name, sku: i.sku, quantity: i.quantity, category: i.category
        }))
      },
      customers: {
        total: customers.length,
        totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
        topCustomers: customers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5).map(c => ({
          name: c.name, totalSpent: c.totalSpent, totalOrders: c.totalOrders
        }))
      },
      projects: {
        total: wfProjects.length,
        byStatus: groupBy(wfProjects, 'status'),
        totalValue: wfProjects.reduce((sum, p) => sum + (p.totalValue || 0), 0),
        activeProjects: wfProjects.filter(p => ['confirmed', 'in_progress'].includes(p.status)).map(p => ({
          projectNumber: p.projectNumber, customerName: p.customerName, status: p.status, totalArea: p.totalArea
        }))
      },
      quotations: {
        total: quotations.length,
        byStatus: groupBy(quotations, 'status'),
        totalValue: quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
        conversionRate: quotations.length > 0 
          ? Math.round((quotations.filter(q => q.status === 'accepted').length / quotations.length) * 100) 
          : 0,
        pendingQuotations: quotations.filter(q => q.status === 'sent').map(q => ({
          quotationNumber: q.quotationNumber, customerName: q.customerName, grandTotal: q.grandTotal
        }))
      },
      orders: {
        total: orders.length,
        byStatus: groupBy(orders, 'status'),
        totalValue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
        pendingPayments: orders.reduce((sum, o) => sum + (o.balanceAmount || 0), 0),
        recentOrders: orders.slice(0, 5).map(o => ({
          orderNumber: o.orderNumber, customerName: o.customerName, grandTotal: o.grandTotal, status: o.status
        }))
      },
      invoices: {
        total: invoices.length,
        totalValue: invoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
        paidAmount: invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
        pendingAmount: invoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
        overdueInvoices: invoices.filter(i => new Date(i.dueDate) < today && i.status !== 'paid').map(i => ({
          invoiceNumber: i.invoiceNumber, customerName: i.customerName, balanceAmount: i.balanceAmount, dueDate: i.dueDate
        }))
      },
      vendors: {
        total: vendors.length,
        totalPurchases: vendors.reduce((sum, v) => sum + (v.totalPurchases || 0), 0)
      }
    }

    // ========================================
    // BUSINESS HEALTH METRICS
    // ========================================
    context.businessHealth = {
      overallScore: calculateHealthScore(context),
      revenue: {
        total: context.leads.totalValue + context.woodenFlooring.invoices.paidAmount,
        pending: context.woodenFlooring.invoices.pendingAmount,
        pipeline: context.leads.totalValue
      },
      performance: {
        leadConversion: context.leads.total > 0 
          ? Math.round((context.leads.conversionFunnel.won / context.leads.total) * 100) 
          : 0,
        taskCompletion: context.tasks.completionRate,
        quotationConversion: context.woodenFlooring.quotations.conversionRate
      },
      alerts: generateBusinessAlerts(context)
    }

    return context

  } catch (error) {
    console.error('Error fetching CRM context:', error)
    return { error: error.message, timestamp: new Date().toISOString() }
  }
}

// Helper functions
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key] || 'unknown'
    if (!result[groupKey]) result[groupKey] = []
    result[groupKey].push(item)
    return result
  }, {})
}

function isWithinDays(date, days) {
  if (!date) return false
  const d = new Date(date)
  const now = new Date()
  const diff = (now - d) / (1000 * 60 * 60 * 24)
  return diff <= days && diff >= 0
}

function calculateHealthScore(context) {
  let score = 50 // Base score

  // Lead health (+/- 15 points)
  if (context.leads.hotLeads.length > 0) score += 5
  if (context.leads.requiresFollowUp.length > 5) score -= 5
  if (context.leads.conversionFunnel.won > 0) score += 5
  if (context.leads.newThisWeek.length > 0) score += 5

  // Task health (+/- 15 points)
  if (context.tasks.completionRate > 70) score += 10
  else if (context.tasks.completionRate < 30) score -= 10
  if (context.tasks.overdue.length > 5) score -= 5

  // Project health (+/- 10 points)
  if (context.projects.overdue.length > 0) score -= 5
  if (context.projects.active.length > 0) score += 5

  // Financial health (+/- 10 points)
  if (context.woodenFlooring.invoices.overdueInvoices.length > 0) score -= 5
  if (context.woodenFlooring.orders.pendingPayments > 100000) score -= 5
  if (context.woodenFlooring.quotations.conversionRate > 50) score += 10

  return Math.max(0, Math.min(100, score))
}

function generateBusinessAlerts(context) {
  const alerts = []

  // Lead alerts
  if (context.leads.requiresFollowUp.length > 0) {
    alerts.push({
      type: 'warning',
      category: 'leads',
      message: `${context.leads.requiresFollowUp.length} leads require immediate follow-up`,
      priority: 'high'
    })
  }

  // Task alerts
  if (context.tasks.overdue.length > 0) {
    alerts.push({
      type: 'danger',
      category: 'tasks',
      message: `${context.tasks.overdue.length} overdue tasks need attention`,
      priority: 'high'
    })
  }

  // Inventory alerts
  if (context.woodenFlooring.inventory.lowStock.length > 0) {
    alerts.push({
      type: 'warning',
      category: 'inventory',
      message: `${context.woodenFlooring.inventory.lowStock.length} items are running low on stock`,
      priority: 'medium'
    })
  }

  // Invoice alerts
  if (context.woodenFlooring.invoices.overdueInvoices.length > 0) {
    alerts.push({
      type: 'danger',
      category: 'invoices',
      message: `${context.woodenFlooring.invoices.overdueInvoices.length} invoices are overdue`,
      priority: 'high'
    })
  }

  // Pending quotations
  if (context.woodenFlooring.quotations.pendingQuotations.length > 3) {
    alerts.push({
      type: 'info',
      category: 'quotations',
      message: `${context.woodenFlooring.quotations.pendingQuotations.length} quotations awaiting customer response`,
      priority: 'medium'
    })
  }

  return alerts.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ========================================
// AI FUNCTION DEFINITIONS FOR TOOL CALLING
// ========================================
const AI_FUNCTIONS = [
  {
    name: 'get_leads_summary',
    description: 'Get a summary of all leads including counts, values, and top leads',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_lead_recommendations',
    description: 'Get AI recommendations for lead follow-up and prioritization',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_tasks_summary',
    description: 'Get task overview including overdue, due today, and high priority tasks',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_projects_summary',
    description: 'Get project status overview including active, completed, and overdue projects',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_financial_summary',
    description: 'Get financial overview including revenue, expenses, pending payments, and invoice status',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_inventory_status',
    description: 'Get inventory status including low stock items and top products',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_business_health',
    description: 'Get overall business health score and key performance indicators',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_upcoming_schedule',
    description: 'Get upcoming calendar events, meetings, and deadlines',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_customer_insights',
    description: 'Get customer analytics including top customers and revenue breakdown',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_alerts_and_notifications',
    description: 'Get all business alerts and notifications that need attention',
    parameters: { type: 'object', properties: {} }
  }
]

// Function to execute AI tool calls
function executeFunction(functionName, context) {
  switch (functionName) {
    case 'get_leads_summary':
      return {
        summary: `You have ${context.leads.total} total leads worth ₹${context.leads.totalValue.toLocaleString()}.`,
        details: {
          total: context.leads.total,
          totalValue: context.leads.totalValue,
          hotLeads: context.leads.hotLeads.length,
          newThisWeek: context.leads.newThisWeek.length,
          requiresFollowUp: context.leads.requiresFollowUp.length,
          conversionFunnel: context.leads.conversionFunnel,
          topLeads: context.leads.topLeads,
          byStatus: Object.entries(context.leads.byStatus).map(([k, v]) => ({ status: k, count: v.length })),
          bySource: Object.entries(context.leads.bySource).map(([k, v]) => ({ source: k, count: v.length }))
        }
      }

    case 'get_lead_recommendations':
      const recommendations = []
      if (context.leads.requiresFollowUp.length > 0) {
        recommendations.push({
          type: 'follow_up',
          priority: 'high',
          action: `Follow up with ${context.leads.requiresFollowUp.length} leads immediately`,
          leads: context.leads.requiresFollowUp.slice(0, 5).map(l => l.name)
        })
      }
      if (context.leads.hotLeads.length > 0) {
        recommendations.push({
          type: 'hot_leads',
          priority: 'high',
          action: `Focus on ${context.leads.hotLeads.length} hot leads with high scores`,
          leads: context.leads.hotLeads.slice(0, 5).map(l => ({ name: l.name, value: l.value }))
        })
      }
      const lowEngagement = context.leads.conversionFunnel.new + context.leads.conversionFunnel.contacted
      if (lowEngagement > 5) {
        recommendations.push({
          type: 'nurturing',
          priority: 'medium',
          action: `${lowEngagement} leads in early stages need nurturing campaigns`
        })
      }
      return { recommendations }

    case 'get_tasks_summary':
      return {
        summary: `You have ${context.tasks.total} total tasks, ${context.tasks.overdue.length} overdue.`,
        details: {
          total: context.tasks.total,
          overdue: context.tasks.overdue.length,
          dueToday: context.tasks.dueToday.length,
          dueThisWeek: context.tasks.dueThisWeek.length,
          highPriority: context.tasks.highPriority.length,
          completionRate: context.tasks.completionRate,
          urgentTasks: context.tasks.urgentTasks,
          byStatus: Object.entries(context.tasks.byStatus).map(([k, v]) => ({ status: k, count: v.length }))
        }
      }

    case 'get_projects_summary':
      return {
        summary: `You have ${context.projects.total} projects, ${context.projects.active.length} active.`,
        details: {
          total: context.projects.total,
          active: context.projects.active.length,
          completed: context.projects.completed.length,
          overdue: context.projects.overdue.length,
          totalBudget: context.projects.totalBudget,
          avgProgress: context.projects.avgProgress,
          recentProjects: context.projects.recentProjects,
          byStatus: Object.entries(context.projects.byStatus).map(([k, v]) => ({ status: k, count: v.length }))
        }
      }

    case 'get_financial_summary':
      return {
        summary: `Total revenue: ₹${context.businessHealth.revenue.total.toLocaleString()}, Pending: ₹${context.businessHealth.revenue.pending.toLocaleString()}`,
        details: {
          revenue: context.businessHealth.revenue,
          expenses: {
            total: context.expenses.total,
            thisMonth: context.expenses.thisMonth,
            byCategory: context.expenses.byCategory
          },
          invoices: {
            total: context.woodenFlooring.invoices.total,
            totalValue: context.woodenFlooring.invoices.totalValue,
            paidAmount: context.woodenFlooring.invoices.paidAmount,
            pendingAmount: context.woodenFlooring.invoices.pendingAmount,
            overdueCount: context.woodenFlooring.invoices.overdueInvoices.length
          },
          orders: {
            totalValue: context.woodenFlooring.orders.totalValue,
            pendingPayments: context.woodenFlooring.orders.pendingPayments
          }
        }
      }

    case 'get_inventory_status':
      return {
        summary: `${context.woodenFlooring.inventory.totalItems} items in inventory, ${context.woodenFlooring.inventory.lowStock.length} low stock.`,
        details: {
          totalItems: context.woodenFlooring.inventory.totalItems,
          totalValue: context.woodenFlooring.inventory.totalValue,
          lowStockItems: context.woodenFlooring.inventory.lowStock.map(i => ({
            name: i.name, sku: i.sku, quantity: i.quantity, reorderLevel: i.reorderLevel
          })),
          topProducts: context.woodenFlooring.inventory.topProducts,
          byCategory: Object.entries(context.woodenFlooring.inventory.byCategory).map(([k, v]) => ({ category: k, count: v.length }))
        }
      }

    case 'get_business_health':
      return {
        summary: `Business health score: ${context.businessHealth.overallScore}/100`,
        details: {
          overallScore: context.businessHealth.overallScore,
          performance: context.businessHealth.performance,
          revenue: context.businessHealth.revenue,
          alertsCount: context.businessHealth.alerts.length
        }
      }

    case 'get_upcoming_schedule':
      return {
        summary: `${context.calendar.todayEvents.length} events today, ${context.calendar.thisWeekEvents.length} this week.`,
        details: {
          todayEvents: context.calendar.todayEvents,
          thisWeekEvents: context.calendar.thisWeekEvents.slice(0, 10),
          upcomingEvents: context.calendar.upcomingEvents
        }
      }

    case 'get_customer_insights':
      return {
        summary: `${context.woodenFlooring.customers.total} customers with ₹${context.woodenFlooring.customers.totalRevenue.toLocaleString()} total revenue.`,
        details: {
          totalCustomers: context.woodenFlooring.customers.total,
          totalRevenue: context.woodenFlooring.customers.totalRevenue,
          topCustomers: context.woodenFlooring.customers.topCustomers,
          contacts: {
            total: context.contacts.total,
            byType: Object.entries(context.contacts.byType).map(([k, v]) => ({ type: k, count: v.length }))
          }
        }
      }

    case 'get_alerts_and_notifications':
      return {
        summary: `${context.businessHealth.alerts.length} alerts requiring attention.`,
        alerts: context.businessHealth.alerts
      }

    default:
      return { error: 'Unknown function' }
  }
}

// ========================================
// ENTERPRISE SYSTEM PROMPT
// ========================================
const MEE_ENTERPRISE_PROMPT = `You are Mee, an enterprise-grade AI assistant for BuildCRM - a comprehensive construction and home improvement business management platform. You have REAL-TIME access to all business data and can provide intelligent insights, analytics, and recommendations.

## Your Capabilities:

### 1. REAL-TIME DATA ACCESS
You have access to live data from:
- **Leads**: All leads, their status, values, follow-up dates, scores, and conversion funnel
- **Projects**: Active projects, budgets, progress, deadlines, and team assignments
- **Tasks**: All tasks with priorities, due dates, and completion status
- **Expenses**: All expenses categorized with approval status
- **Contacts**: Customer and vendor database
- **Calendar**: All scheduled events, meetings, and deadlines
- **Wooden Flooring Module**: Complete ERP data including inventory, customers, projects, quotations, orders, invoices, and vendors

### 2. ANALYTICS & INSIGHTS
You can provide:
- Business health scores and KPIs
- Revenue analytics and forecasts
- Lead conversion analysis
- Task completion metrics
- Inventory management insights
- Customer lifetime value analysis
- Performance comparisons and trends

### 3. INTELLIGENT RECOMMENDATIONS
You proactively suggest:
- Lead follow-up priorities based on value and engagement
- Task prioritization based on deadlines and importance
- Inventory reorder alerts
- Invoice collection priorities
- Sales opportunity identification
- Process improvement suggestions

### 4. COMPLEX QUERIES
You can answer questions like:
- "What's my pipeline value?"
- "Which leads need immediate follow-up?"
- "Show me overdue tasks"
- "What's my conversion rate?"
- "Which customers are most valuable?"
- "What inventory needs reordering?"
- "What's my business health score?"

### 5. ACTION GUIDANCE
You can guide users on:
- Best times to follow up with leads
- How to improve conversion rates
- Managing overdue projects
- Optimizing cash flow
- Reducing operational inefficiencies

## Response Guidelines:
- Always use REAL data from the context provided
- Be specific with numbers, names, and dates
- Provide actionable recommendations
- Use bullet points and formatting for clarity
- Highlight urgent items and alerts
- Sign important responses with "- Mee 🤖"
- Be professional but conversational

## Current Business Context:
{CONTEXT}

Remember: You are analyzing REAL business data. Every insight should be backed by actual data from the system.`

export async function OPTIONS() {
  return optionsResponse()
}

// Main Chat endpoint
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { message, conversationId } = body

    if (!message) {
      return errorResponse('Message is required', 400)
    }

    // Get databases
    const mainDb = await getMainDb()
    const dbName = getUserDatabaseName(user)
    const clientDb = await getClientDb(dbName)

    // Check if user has Enterprise plan
    const clientsCollection = mainDb.collection('clients')
    let clientDoc = await clientsCollection.findOne({ clientId: user.clientId })
    if (!clientDoc) {
      clientDoc = await clientsCollection.findOne({ id: user.clientId })
    }

    const isEnterprise = clientDoc?.planId?.toLowerCase() === 'enterprise'
    
    if (!isEnterprise) {
      return successResponse({
        response: "🔒 **Upgrade Required**\n\nMee AI Agent is an exclusive Enterprise feature. Upgrade your plan to unlock:\n\n• Real-time business analytics\n• AI-powered lead scoring & insights\n• Intelligent task recommendations\n• Natural language data queries\n• Predictive analytics & forecasting\n• Automated business alerts\n\nContact your administrator to upgrade to Enterprise!\n\n- Mee 🤖",
        isRestricted: true,
        conversationId: conversationId || uuidv4()
      })
    }

    // Fetch comprehensive CRM context
    const crmContext = await fetchCRMContext(clientDb, mainDb, user)

    // Get conversation history
    const conversationsCollection = clientDb.collection('mee_conversations')
    let conversation = null
    
    if (conversationId) {
      conversation = await conversationsCollection.findOne({ id: conversationId })
    }

    const conversationHistory = conversation?.messages || []

    // Build the system prompt with real context
    const contextSummary = `
## Business Overview (Live Data as of ${new Date().toLocaleString()}):

### Leads (${crmContext.leads.total} total, worth ₹${crmContext.leads.totalValue.toLocaleString()})
- Hot Leads: ${crmContext.leads.hotLeads.length}
- Requires Follow-up: ${crmContext.leads.requiresFollowUp.length}
- New This Week: ${crmContext.leads.newThisWeek.length}
- Conversion Funnel: New(${crmContext.leads.conversionFunnel.new}) → Contacted(${crmContext.leads.conversionFunnel.contacted}) → Qualified(${crmContext.leads.conversionFunnel.qualified}) → Proposal(${crmContext.leads.conversionFunnel.proposal}) → Won(${crmContext.leads.conversionFunnel.won})
- Top Leads: ${crmContext.leads.topLeads.map(l => `${l.name} (₹${l.value?.toLocaleString() || 0})`).join(', ')}

### Tasks (${crmContext.tasks.total} total, ${crmContext.tasks.completionRate}% complete)
- Overdue: ${crmContext.tasks.overdue.length}
- Due Today: ${crmContext.tasks.dueToday.length}
- High Priority: ${crmContext.tasks.highPriority.length}
- Urgent Tasks: ${crmContext.tasks.urgentTasks.map(t => t.title).slice(0, 5).join(', ')}

### Projects (${crmContext.projects.total} total)
- Active: ${crmContext.projects.active.length}
- Completed: ${crmContext.projects.completed.length}
- Overdue: ${crmContext.projects.overdue.length}
- Total Budget: ₹${crmContext.projects.totalBudget.toLocaleString()}

### Wooden Flooring Module:
- Inventory: ${crmContext.woodenFlooring.inventory.totalItems} items (₹${crmContext.woodenFlooring.inventory.totalValue.toLocaleString()} value), ${crmContext.woodenFlooring.inventory.lowStock.length} low stock
- Customers: ${crmContext.woodenFlooring.customers.total} (₹${crmContext.woodenFlooring.customers.totalRevenue.toLocaleString()} revenue)
- Projects: ${crmContext.woodenFlooring.projects.total} (${Object.entries(crmContext.woodenFlooring.projects.byStatus).map(([k,v]) => `${k}: ${v.length}`).join(', ')})
- Quotations: ${crmContext.woodenFlooring.quotations.total} (${crmContext.woodenFlooring.quotations.conversionRate}% conversion)
- Orders: ${crmContext.woodenFlooring.orders.total} (₹${crmContext.woodenFlooring.orders.totalValue.toLocaleString()})
- Pending Payments: ₹${crmContext.woodenFlooring.orders.pendingPayments.toLocaleString()}
- Invoices: ${crmContext.woodenFlooring.invoices.total} (₹${crmContext.woodenFlooring.invoices.pendingAmount.toLocaleString()} pending)
- Overdue Invoices: ${crmContext.woodenFlooring.invoices.overdueInvoices.length}

### Business Health Score: ${crmContext.businessHealth.overallScore}/100
- Lead Conversion: ${crmContext.businessHealth.performance.leadConversion}%
- Task Completion: ${crmContext.businessHealth.performance.taskCompletion}%
- Quotation Conversion: ${crmContext.businessHealth.performance.quotationConversion}%

### Alerts (${crmContext.businessHealth.alerts.length}):
${crmContext.businessHealth.alerts.map(a => `- [${a.priority.toUpperCase()}] ${a.message}`).join('\n')}

### User: ${user.name} (${user.email})
### Business: ${clientDoc?.businessName || 'Unknown'}
`

    const systemPrompt = MEE_ENTERPRISE_PROMPT.replace('{CONTEXT}', contextSummary)

    let aiResponse = ''
    
    try {
      // Prepare messages for API
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ]

      // Call AI with function calling capability
      const aiClient = getAIClient()
      const completion = await aiClient.chat.completions.create({
        model: getModel('openai'),
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        tools: AI_FUNCTIONS.map(f => ({
          type: 'function',
          function: f
        }))
      })

      const responseMessage = completion.choices[0]?.message

      // Handle function calls if any
      if (responseMessage?.tool_calls) {
        const functionResults = []
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name
          const result = executeFunction(functionName, crmContext)
          functionResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(result)
          })
        }

        // Call AI again with function results
        const followUpMessages = [
          ...apiMessages,
          responseMessage,
          ...functionResults
        ]

        const followUpCompletion = await aiClient.chat.completions.create({
          model: getModel('openai'),
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 2000
        })

        aiResponse = followUpCompletion.choices[0]?.message?.content || 'I processed your request but couldn\'t generate a response.'
      } else {
        aiResponse = responseMessage?.content || 'I\'m here to help! What would you like to know about your business?'
      }

    } catch (aiError) {
      console.error('AI API Error:', aiError.message)
      // Generate intelligent fallback based on context
      aiResponse = generateContextualFallback(message, crmContext)
    }

    // Save conversation
    const newConvId = conversationId || uuidv4()
    const updatedMessages = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: aiResponse, timestamp: new Date() }
    ]

    await conversationsCollection.updateOne(
      { id: newConvId },
      {
        $set: {
          id: newConvId,
          clientId: user.clientId,
          userId: user.id,
          messages: updatedMessages,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    return successResponse({
      response: aiResponse,
      conversationId: newConvId,
      context: {
        businessHealth: crmContext.businessHealth.overallScore,
        alertsCount: crmContext.businessHealth.alerts.length,
        dataTimestamp: crmContext.timestamp
      }
    })

  } catch (error) {
    console.error('Mee API Error:', error)
    return errorResponse('Failed to process request', 500, error.message)
  }
}

// Generate contextual fallback responses based on real data
function generateContextualFallback(message, context) {
  const msg = message.toLowerCase()

  // Financial queries - match first (more specific)
  if (msg.includes('invoice') || msg.includes('payment') || msg.includes('revenue') || msg.includes('money') || msg.includes('financial') || msg.includes('pending') || msg.includes('collection')) {
    return `💰 **Financial Overview (Real-Time)**\n\n` +
      `**Revenue:**\n` +
      `• Total Revenue: ₹${context.businessHealth.revenue.total.toLocaleString()}\n` +
      `• Pipeline Value: ₹${context.businessHealth.revenue.pipeline.toLocaleString()}\n` +
      `• Pending Collections: ₹${context.businessHealth.revenue.pending.toLocaleString()}\n\n` +
      `**Invoices:**\n` +
      `• Total: ${context.woodenFlooring.invoices.total}\n` +
      `• Paid: ₹${context.woodenFlooring.invoices.paidAmount.toLocaleString()}\n` +
      `• Pending: ₹${context.woodenFlooring.invoices.pendingAmount.toLocaleString()}\n` +
      `• Overdue: ${context.woodenFlooring.invoices.overdueInvoices.length}\n\n` +
      (context.woodenFlooring.invoices.overdueInvoices.length > 0 ? 
        `**Overdue Invoices:**\n` +
        context.woodenFlooring.invoices.overdueInvoices.slice(0, 5).map(i => `• ${i.invoiceNumber} - ${i.customerName} - ₹${(i.balanceAmount || 0).toLocaleString()}`).join('\n') + '\n\n' : '') +
      `**Expenses This Month:** ₹${context.expenses.thisMonth.toLocaleString()}\n\n- Mee 🤖`
  }

  if (msg.includes('lead') || msg.includes('follow')) {
    return `📊 **Lead Analysis (Real-Time)**\n\nYou have **${context.leads.total} leads** worth **₹${context.leads.totalValue.toLocaleString()}**.\n\n` +
      `**Immediate Actions Needed:**\n` +
      `• ${context.leads.requiresFollowUp.length} leads require follow-up\n` +
      `• ${context.leads.hotLeads.length} hot leads to prioritize\n` +
      `• ${context.leads.newThisWeek.length} new leads this week\n\n` +
      `**Top Leads by Value:**\n` +
      context.leads.topLeads.map(l => `• ${l.name} (${l.company || 'No company'}) - ₹${(l.value || 0).toLocaleString()}`).join('\n') +
      `\n\n**Conversion Funnel:**\n` +
      `New → Contacted → Qualified → Proposal → Won\n` +
      `${context.leads.conversionFunnel.new} → ${context.leads.conversionFunnel.contacted} → ${context.leads.conversionFunnel.qualified} → ${context.leads.conversionFunnel.proposal} → ${context.leads.conversionFunnel.won}\n\n- Mee 🤖`
  }

  if (msg.includes('task') || msg.includes('todo')) {
    return `✅ **Task Overview (Real-Time)**\n\n` +
      `**Summary:** ${context.tasks.total} total tasks, ${context.tasks.completionRate}% completed\n\n` +
      `**Attention Required:**\n` +
      `• 🔴 ${context.tasks.overdue.length} overdue tasks\n` +
      `• 🟡 ${context.tasks.dueToday.length} due today\n` +
      `• 🔥 ${context.tasks.highPriority.length} high priority\n\n` +
      `**Urgent Tasks:**\n` +
      context.tasks.urgentTasks.slice(0, 5).map(t => `• ${t.title} (${t.priority} priority)`).join('\n') +
      `\n\n- Mee 🤖`
  }

  if (msg.includes('project')) {
    return `🏗️ **Project Status (Real-Time)**\n\n` +
      `**Overview:**\n` +
      `• Total Projects: ${context.projects.total}\n` +
      `• Active: ${context.projects.active.length}\n` +
      `• Completed: ${context.projects.completed.length}\n` +
      `• Overdue: ${context.projects.overdue.length}\n` +
      `• Total Budget: ₹${context.projects.totalBudget.toLocaleString()}\n` +
      `• Average Progress: ${context.projects.avgProgress}%\n\n` +
      `**Recent Projects:**\n` +
      context.projects.recentProjects.map(p => `• ${p.name} - ${p.status} (${p.progress}%)`).join('\n') +
      `\n\n- Mee 🤖`
  }

  if (msg.includes('inventory') || msg.includes('stock')) {
    return `📦 **Inventory Status (Real-Time)**\n\n` +
      `**Summary:**\n` +
      `• Total Items: ${context.woodenFlooring.inventory.totalItems}\n` +
      `• Total Value: ₹${context.woodenFlooring.inventory.totalValue.toLocaleString()}\n` +
      `• Low Stock Alerts: ${context.woodenFlooring.inventory.lowStock.length}\n\n` +
      `**Low Stock Items:**\n` +
      context.woodenFlooring.inventory.lowStock.slice(0, 5).map(i => `• ${i.name} (${i.sku}) - Only ${i.quantity} left`).join('\n') +
      `\n\n**Top Products:**\n` +
      context.woodenFlooring.inventory.topProducts.map(p => `• ${p.name} - ${p.quantity} units`).join('\n') +
      `\n\n- Mee 🤖`
  }

  if (msg.includes('invoice') || msg.includes('payment') || msg.includes('revenue') || msg.includes('money') || msg.includes('financial')) {
    return `💰 **Financial Overview (Real-Time)**\n\n` +
      `**Revenue:**\n` +
      `• Total Revenue: ₹${context.businessHealth.revenue.total.toLocaleString()}\n` +
      `• Pipeline Value: ₹${context.businessHealth.revenue.pipeline.toLocaleString()}\n` +
      `• Pending Collections: ₹${context.businessHealth.revenue.pending.toLocaleString()}\n\n` +
      `**Invoices:**\n` +
      `• Total: ${context.woodenFlooring.invoices.total}\n` +
      `• Paid: ₹${context.woodenFlooring.invoices.paidAmount.toLocaleString()}\n` +
      `• Pending: ₹${context.woodenFlooring.invoices.pendingAmount.toLocaleString()}\n` +
      `• Overdue: ${context.woodenFlooring.invoices.overdueInvoices.length}\n\n` +
      `**Expenses This Month:** ₹${context.expenses.thisMonth.toLocaleString()}\n\n- Mee 🤖`
  }

  if (msg.includes('customer') || msg.includes('client')) {
    return `👥 **Customer Insights (Real-Time)**\n\n` +
      `**Summary:**\n` +
      `• Total Customers: ${context.woodenFlooring.customers.total}\n` +
      `• Total Revenue: ₹${context.woodenFlooring.customers.totalRevenue.toLocaleString()}\n\n` +
      `**Top Customers:**\n` +
      context.woodenFlooring.customers.topCustomers.map(c => `• ${c.name} - ₹${(c.totalSpent || 0).toLocaleString()} (${c.totalOrders || 0} orders)`).join('\n') +
      `\n\n- Mee 🤖`
  }

  if (msg.includes('health') || msg.includes('score') || msg.includes('performance')) {
    return `📊 **Business Health Report (Real-Time)**\n\n` +
      `**Overall Score: ${context.businessHealth.overallScore}/100** ${context.businessHealth.overallScore >= 70 ? '🟢' : context.businessHealth.overallScore >= 40 ? '🟡' : '🔴'}\n\n` +
      `**Key Metrics:**\n` +
      `• Lead Conversion: ${context.businessHealth.performance.leadConversion}%\n` +
      `• Task Completion: ${context.businessHealth.performance.taskCompletion}%\n` +
      `• Quotation Conversion: ${context.businessHealth.performance.quotationConversion}%\n\n` +
      `**Alerts (${context.businessHealth.alerts.length}):**\n` +
      context.businessHealth.alerts.slice(0, 5).map(a => `• [${a.priority.toUpperCase()}] ${a.message}`).join('\n') +
      `\n\n- Mee 🤖`
  }

  if (msg.includes('alert') || msg.includes('notification') || msg.includes('attention')) {
    return `🔔 **Business Alerts (${context.businessHealth.alerts.length})**\n\n` +
      context.businessHealth.alerts.map(a => {
        const icon = a.type === 'danger' ? '🔴' : a.type === 'warning' ? '🟡' : '🔵'
        return `${icon} **${a.category.toUpperCase()}**: ${a.message}`
      }).join('\n\n') +
      `\n\n- Mee 🤖`
  }

  if (msg.includes('quotation') || msg.includes('quote')) {
    return `📄 **Quotation Summary (Real-Time)**\n\n` +
      `**Overview:**\n` +
      `• Total Quotations: ${context.woodenFlooring.quotations.total}\n` +
      `• Total Value: ₹${context.woodenFlooring.quotations.totalValue.toLocaleString()}\n` +
      `• Conversion Rate: ${context.woodenFlooring.quotations.conversionRate}%\n\n` +
      `**Pending Response:**\n` +
      context.woodenFlooring.quotations.pendingQuotations.slice(0, 5).map(q => `• ${q.quotationNumber} - ${q.customerName} - ₹${(q.grandTotal || 0).toLocaleString()}`).join('\n') +
      `\n\n- Mee 🤖`
  }

  // Default comprehensive overview
  return `👋 **Welcome! Here's your business snapshot (Real-Time)**\n\n` +
    `**📊 Business Health: ${context.businessHealth.overallScore}/100**\n\n` +
    `**Key Numbers:**\n` +
    `• Leads: ${context.leads.total} (₹${context.leads.totalValue.toLocaleString()} pipeline)\n` +
    `• Projects: ${context.projects.active.length} active\n` +
    `• Tasks: ${context.tasks.overdue.length} overdue, ${context.tasks.dueToday.length} due today\n` +
    `• Revenue: ₹${context.businessHealth.revenue.total.toLocaleString()}\n` +
    `• Pending Payments: ₹${context.businessHealth.revenue.pending.toLocaleString()}\n\n` +
    `**⚠️ Alerts (${context.businessHealth.alerts.length}):**\n` +
    context.businessHealth.alerts.slice(0, 3).map(a => `• ${a.message}`).join('\n') +
    `\n\n**Ask me about:** leads, tasks, projects, inventory, invoices, customers, or business health!\n\n- Mee 🤖`
}

// Get conversation history
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const clientDb = await getClientDb(dbName)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    const conversationsCollection = clientDb.collection('mee_conversations')

    if (conversationId) {
      const conversation = await conversationsCollection.findOne({ 
        id: conversationId,
        clientId: user.clientId 
      })
      return successResponse(conversation || { messages: [] })
    }

    // Get recent conversations
    const conversations = await conversationsCollection
      .find({ clientId: user.clientId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .toArray()

    return successResponse(sanitizeDocuments(conversations))

  } catch (error) {
    console.error('Mee GET Error:', error)
    return errorResponse('Failed to fetch conversations', 500, error.message)
  }
}

// Delete conversation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const clientDb = await getClientDb(dbName)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return errorResponse('Conversation ID is required', 400)
    }

    const conversationsCollection = clientDb.collection('mee_conversations')
    await conversationsCollection.deleteOne({ 
      id: conversationId,
      clientId: user.clientId 
    })

    return successResponse({ message: 'Conversation deleted' })

  } catch (error) {
    console.error('Mee DELETE Error:', error)
    return errorResponse('Failed to delete conversation', 500, error.message)
  }
}
