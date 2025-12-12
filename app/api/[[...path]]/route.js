import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { generateToken, verifyToken, hashPassword, verifyPassword } from '@/lib/auth'
import { industryModules, subscriptionPlans, createSuperAdmin, generateDummyLeads, generateDummyProjects, generateDummyTasks, generateDummyExpenses } from '@/lib/seedData'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
    await seedDatabase()
  }
  return db
}

async function seedDatabase() {
  // Seed modules if not exists
  const modulesCount = await db.collection('modules').countDocuments()
  if (modulesCount === 0) {
    await db.collection('modules').insertMany(industryModules)
  }
  
  // Seed plans if not exists
  const plansCount = await db.collection('plans').countDocuments()
  if (plansCount === 0) {
    await db.collection('plans').insertMany(subscriptionPlans)
  }
  
  // Create super admin if not exists
  const adminExists = await db.collection('users').findOne({ role: 'super_admin' })
  if (!adminExists) {
    await db.collection('users').insertOne(createSuperAdmin())
  }
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token)
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()
    const user = getAuthUser(request)

    // ============ PUBLIC ROUTES ============
    
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'BuildCRM API v1.0', status: 'running' }))
    }

    // Get subscription plans
    if (route === '/plans' && method === 'GET') {
      const plans = await db.collection('plans').find({}).toArray()
      return handleCORS(NextResponse.json(plans.map(({ _id, ...rest }) => rest)))
    }

    // Get available modules
    if (route === '/modules/public' && method === 'GET') {
      const modules = await db.collection('modules').find({ active: true }).toArray()
      return handleCORS(NextResponse.json(modules.map(({ _id, ...rest }) => rest)))
    }

    // ============ AUTH ROUTES ============
    
    // Register new client
    if (route === '/auth/register' && method === 'POST') {
      const body = await request.json()
      const { businessName, email, password, phone, planId = 'basic' } = body
      
      if (!businessName || !email || !password) {
        return handleCORS(NextResponse.json({ error: 'Business name, email and password are required' }, { status: 400 }))
      }
      
      const existingUser = await db.collection('users').findOne({ email })
      if (existingUser) {
        return handleCORS(NextResponse.json({ error: 'Email already registered' }, { status: 400 }))
      }
      
      const clientId = uuidv4()
      const userId = uuidv4()
      
      // Create client organization
      const client = {
        id: clientId,
        businessName,
        email,
        phone: phone || '',
        planId,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        modules: [],
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Create admin user for the client
      const newUser = {
        id: userId,
        clientId,
        email,
        password: hashPassword(password),
        name: businessName,
        role: 'client_admin',
        permissions: ['all'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('clients').insertOne(client)
      await db.collection('users').insertOne(newUser)
      
      // Generate dummy data for the new client
      const leads = generateDummyLeads(clientId)
      const projects = generateDummyProjects(clientId)
      const tasks = generateDummyTasks(clientId)
      const expenses = generateDummyExpenses(clientId)
      
      await db.collection('leads').insertMany(leads)
      await db.collection('projects').insertMany(projects)
      await db.collection('tasks').insertMany(tasks)
      await db.collection('expenses').insertMany(expenses)
      
      const token = generateToken(newUser)
      
      return handleCORS(NextResponse.json({
        token,
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, clientId },
        client: { id: client.id, businessName: client.businessName, planId: client.planId }
      }))
    }

    // Login
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body
      
      if (!email || !password) {
        return handleCORS(NextResponse.json({ error: 'Email and password are required' }, { status: 400 }))
      }
      
      const foundUser = await db.collection('users').findOne({ email })
      if (!foundUser || !verifyPassword(password, foundUser.password)) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }))
      }
      
      const token = generateToken(foundUser)
      let clientData = null
      
      if (foundUser.clientId) {
        const clientDoc = await db.collection('clients').findOne({ id: foundUser.clientId })
        if (clientDoc) {
          const { _id, ...rest } = clientDoc
          clientData = rest
        }
      }
      
      return handleCORS(NextResponse.json({
        token,
        user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, role: foundUser.role, clientId: foundUser.clientId },
        client: clientData
      }))
    }

    // Get current user
    if (route === '/auth/me' && method === 'GET') {
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const foundUser = await db.collection('users').findOne({ id: user.id })
      if (!foundUser) {
        return handleCORS(NextResponse.json({ error: 'User not found' }, { status: 404 }))
      }
      
      let clientData = null
      if (foundUser.clientId) {
        const clientDoc = await db.collection('clients').findOne({ id: foundUser.clientId })
        if (clientDoc) {
          const { _id, ...rest } = clientDoc
          clientData = rest
        }
      }
      
      return handleCORS(NextResponse.json({
        user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, role: foundUser.role, clientId: foundUser.clientId },
        client: clientData
      }))
    }

    // ============ SUPER ADMIN ROUTES ============
    
    // Get all clients (Super Admin only)
    if (route === '/admin/clients' && method === 'GET') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const clients = await db.collection('clients').find({}).toArray()
      return handleCORS(NextResponse.json(clients.map(({ _id, ...rest }) => rest)))
    }

    // Get single client details (Super Admin only)
    if (route.startsWith('/admin/clients/') && method === 'GET') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const clientId = path[2]
      const clientDoc = await db.collection('clients').findOne({ id: clientId })
      if (!clientDoc) {
        return handleCORS(NextResponse.json({ error: 'Client not found' }, { status: 404 }))
      }
      
      const users = await db.collection('users').find({ clientId }).toArray()
      const { _id, ...clientData } = clientDoc
      
      return handleCORS(NextResponse.json({
        ...clientData,
        users: users.map(({ _id, password, ...rest }) => rest)
      }))
    }

    // Update client subscription (Super Admin only)
    if (route.startsWith('/admin/clients/') && route.endsWith('/subscription') && method === 'PUT') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const clientId = path[2]
      const body = await request.json()
      const { planId, status } = body
      
      const updateData = { updatedAt: new Date() }
      if (planId) updateData.planId = planId
      if (status) updateData.subscriptionStatus = status
      
      await db.collection('clients').updateOne({ id: clientId }, { $set: updateData })
      
      return handleCORS(NextResponse.json({ message: 'Subscription updated successfully' }))
    }

    // Toggle client subscription status (Super Admin only)
    if (route.startsWith('/admin/clients/') && route.endsWith('/toggle-status') && method === 'POST') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const clientId = path[2]
      const clientDoc = await db.collection('clients').findOne({ id: clientId })
      if (!clientDoc) {
        return handleCORS(NextResponse.json({ error: 'Client not found' }, { status: 404 }))
      }
      
      const newStatus = clientDoc.subscriptionStatus === 'active' ? 'paused' : 'active'
      await db.collection('clients').updateOne({ id: clientId }, { $set: { subscriptionStatus: newStatus, updatedAt: new Date() } })
      
      return handleCORS(NextResponse.json({ message: 'Status toggled', newStatus }))
    }

    // Assign/Remove module for client (Super Admin only)
    if (route.startsWith('/admin/clients/') && route.endsWith('/modules') && method === 'POST') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const clientId = path[2]
      const body = await request.json()
      const { moduleId, action } = body
      
      if (action === 'add') {
        await db.collection('clients').updateOne({ id: clientId }, { $addToSet: { modules: moduleId }, $set: { updatedAt: new Date() } })
      } else if (action === 'remove') {
        await db.collection('clients').updateOne({ id: clientId }, { $pull: { modules: moduleId }, $set: { updatedAt: new Date() } })
      }
      
      return handleCORS(NextResponse.json({ message: 'Module updated successfully' }))
    }

    // Get all modules (Super Admin only)
    if (route === '/admin/modules' && method === 'GET') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const modules = await db.collection('modules').find({}).toArray()
      return handleCORS(NextResponse.json(modules.map(({ _id, ...rest }) => rest)))
    }

    // Update module (Super Admin only)
    if (route.startsWith('/admin/modules/') && method === 'PUT') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const moduleId = path[2]
      const body = await request.json()
      
      await db.collection('modules').updateOne({ id: moduleId }, { $set: { ...body, updatedAt: new Date() } })
      
      return handleCORS(NextResponse.json({ message: 'Module updated successfully' }))
    }

    // Get admin dashboard stats (Super Admin only)
    if (route === '/admin/stats' && method === 'GET') {
      if (!user || user.role !== 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const totalClients = await db.collection('clients').countDocuments()
      const activeClients = await db.collection('clients').countDocuments({ subscriptionStatus: 'active' })
      const totalUsers = await db.collection('users').countDocuments({ role: { $ne: 'super_admin' } })
      const totalLeads = await db.collection('leads').countDocuments()
      const totalProjects = await db.collection('projects').countDocuments()
      
      // Calculate revenue (mock)
      const clients = await db.collection('clients').find({}).toArray()
      const plans = await db.collection('plans').find({}).toArray()
      let monthlyRevenue = 0
      clients.forEach(c => {
        const plan = plans.find(p => p.id === c.planId)
        if (plan && c.subscriptionStatus === 'active') {
          monthlyRevenue += plan.price
        }
        monthlyRevenue += (c.modules?.length || 0) * 999
      })
      
      return handleCORS(NextResponse.json({
        totalClients,
        activeClients,
        pausedClients: totalClients - activeClients,
        totalUsers,
        totalLeads,
        totalProjects,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12
      }))
    }

    // ============ CLIENT ROUTES ============
    
    // Get client dashboard stats
    if (route === '/client/stats' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const totalLeads = await db.collection('leads').countDocuments({ clientId: user.clientId })
      const wonLeads = await db.collection('leads').countDocuments({ clientId: user.clientId, status: 'won' })
      const totalProjects = await db.collection('projects').countDocuments({ clientId: user.clientId })
      const activeProjects = await db.collection('projects').countDocuments({ clientId: user.clientId, status: 'in_progress' })
      const totalTasks = await db.collection('tasks').countDocuments({ clientId: user.clientId })
      const completedTasks = await db.collection('tasks').countDocuments({ clientId: user.clientId, status: 'completed' })
      const totalExpenses = await db.collection('expenses').aggregate([{ $match: { clientId: user.clientId } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray()
      
      const leads = await db.collection('leads').find({ clientId: user.clientId }).toArray()
      const pipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)
      
      return handleCORS(NextResponse.json({
        totalLeads,
        wonLeads,
        conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
        totalExpenses: totalExpenses[0]?.total || 0,
        pipelineValue
      }))
    }

    // ============ LEADS ROUTES ============
    
    if (route === '/leads' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const leads = await db.collection('leads').find({ clientId: user.clientId }).sort({ createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json(leads.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/leads' && method === 'POST') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const body = await request.json()
      const lead = {
        id: uuidv4(),
        clientId: user.clientId,
        ...body,
        status: body.status || 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('leads').insertOne(lead)
      const { _id, ...leadData } = lead
      return handleCORS(NextResponse.json(leadData))
    }

    if (route.startsWith('/leads/') && method === 'PUT') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const leadId = path[1]
      const body = await request.json()
      
      await db.collection('leads').updateOne(
        { id: leadId, clientId: user.clientId },
        { $set: { ...body, updatedAt: new Date() } }
      )
      
      return handleCORS(NextResponse.json({ message: 'Lead updated successfully' }))
    }

    if (route.startsWith('/leads/') && method === 'DELETE') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const leadId = path[1]
      await db.collection('leads').deleteOne({ id: leadId, clientId: user.clientId })
      
      return handleCORS(NextResponse.json({ message: 'Lead deleted successfully' }))
    }

    // ============ PROJECTS ROUTES ============
    
    if (route === '/projects' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const projects = await db.collection('projects').find({ clientId: user.clientId }).sort({ createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json(projects.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/projects' && method === 'POST') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const body = await request.json()
      const project = {
        id: uuidv4(),
        clientId: user.clientId,
        ...body,
        status: body.status || 'planning',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('projects').insertOne(project)
      const { _id, ...projectData } = project
      return handleCORS(NextResponse.json(projectData))
    }

    if (route.startsWith('/projects/') && method === 'PUT') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const projectId = path[1]
      const body = await request.json()
      
      await db.collection('projects').updateOne(
        { id: projectId, clientId: user.clientId },
        { $set: { ...body, updatedAt: new Date() } }
      )
      
      return handleCORS(NextResponse.json({ message: 'Project updated successfully' }))
    }

    if (route.startsWith('/projects/') && method === 'DELETE') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const projectId = path[1]
      await db.collection('projects').deleteOne({ id: projectId, clientId: user.clientId })
      
      return handleCORS(NextResponse.json({ message: 'Project deleted successfully' }))
    }

    // ============ TASKS ROUTES ============
    
    if (route === '/tasks' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const tasks = await db.collection('tasks').find({ clientId: user.clientId }).sort({ createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json(tasks.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/tasks' && method === 'POST') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const body = await request.json()
      const task = {
        id: uuidv4(),
        clientId: user.clientId,
        ...body,
        status: body.status || 'todo',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('tasks').insertOne(task)
      const { _id, ...taskData } = task
      return handleCORS(NextResponse.json(taskData))
    }

    if (route.startsWith('/tasks/') && method === 'PUT') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const taskId = path[1]
      const body = await request.json()
      
      await db.collection('tasks').updateOne(
        { id: taskId, clientId: user.clientId },
        { $set: { ...body, updatedAt: new Date() } }
      )
      
      return handleCORS(NextResponse.json({ message: 'Task updated successfully' }))
    }

    if (route.startsWith('/tasks/') && method === 'DELETE') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const taskId = path[1]
      await db.collection('tasks').deleteOne({ id: taskId, clientId: user.clientId })
      
      return handleCORS(NextResponse.json({ message: 'Task deleted successfully' }))
    }

    // ============ EXPENSES ROUTES ============
    
    if (route === '/expenses' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const expenses = await db.collection('expenses').find({ clientId: user.clientId }).sort({ date: -1 }).toArray()
      return handleCORS(NextResponse.json(expenses.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/expenses' && method === 'POST') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const body = await request.json()
      const expense = {
        id: uuidv4(),
        clientId: user.clientId,
        ...body,
        approved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('expenses').insertOne(expense)
      const { _id, ...expenseData } = expense
      return handleCORS(NextResponse.json(expenseData))
    }

    if (route.startsWith('/expenses/') && method === 'PUT') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const expenseId = path[1]
      const body = await request.json()
      
      await db.collection('expenses').updateOne(
        { id: expenseId, clientId: user.clientId },
        { $set: { ...body, updatedAt: new Date() } }
      )
      
      return handleCORS(NextResponse.json({ message: 'Expense updated successfully' }))
    }

    if (route.startsWith('/expenses/') && method === 'DELETE') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const expenseId = path[1]
      await db.collection('expenses').deleteOne({ id: expenseId, clientId: user.clientId })
      
      return handleCORS(NextResponse.json({ message: 'Expense deleted successfully' }))
    }

    // ============ USER MANAGEMENT ROUTES ============
    
    // Get users for a client (client admin only)
    if (route === '/users' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const users = await db.collection('users').find({ clientId: user.clientId }).toArray()
      return handleCORS(NextResponse.json(users.map(({ _id, password, ...rest }) => rest)))
    }

    // Create user for a client
    if (route === '/users' && method === 'POST') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const body = await request.json()
      const { email, password, name, role = 'sales_rep' } = body
      
      // Check user limit based on plan
      const clientDoc = await db.collection('clients').findOne({ id: user.clientId })
      const plan = await db.collection('plans').findOne({ id: clientDoc.planId })
      const currentUsers = await db.collection('users').countDocuments({ clientId: user.clientId })
      
      if (plan.userLimit !== -1 && currentUsers >= plan.userLimit) {
        return handleCORS(NextResponse.json({ error: `User limit reached. Your plan allows ${plan.userLimit} users.` }, { status: 400 }))
      }
      
      const existingUser = await db.collection('users').findOne({ email })
      if (existingUser) {
        return handleCORS(NextResponse.json({ error: 'Email already exists' }, { status: 400 }))
      }
      
      const newUser = {
        id: uuidv4(),
        clientId: user.clientId,
        email,
        password: hashPassword(password),
        name,
        role,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('users').insertOne(newUser)
      const { password: _, _id, ...userData } = newUser
      
      return handleCORS(NextResponse.json(userData))
    }

    // Update user
    if (route.startsWith('/users/') && method === 'PUT') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const userId = path[1]
      const body = await request.json()
      
      const updateData = { updatedAt: new Date() }
      if (body.name) updateData.name = body.name
      if (body.role) updateData.role = body.role
      if (body.password) updateData.password = hashPassword(body.password)
      
      await db.collection('users').updateOne(
        { id: userId, clientId: user.clientId },
        { $set: updateData }
      )
      
      return handleCORS(NextResponse.json({ message: 'User updated successfully' }))
    }

    // Delete user
    if (route.startsWith('/users/') && method === 'DELETE') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const userId = path[1]
      
      // Prevent deleting yourself
      if (userId === user.id) {
        return handleCORS(NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 }))
      }
      
      await db.collection('users').deleteOne({ id: userId, clientId: user.clientId })
      
      return handleCORS(NextResponse.json({ message: 'User deleted successfully' }))
    }

    // ============ REPORTS ROUTES ============
    
    if (route === '/reports/sales' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const leads = await db.collection('leads').find({ clientId: user.clientId }).toArray()
      
      // Group by status
      const byStatus = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {})
      
      // Group by source
      const bySource = leads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1
        return acc
      }, {})
      
      // Monthly data
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStr = date.toLocaleString('default', { month: 'short' })
        const monthLeads = leads.filter(l => {
          const leadDate = new Date(l.createdAt)
          return leadDate.getMonth() === date.getMonth() && leadDate.getFullYear() === date.getFullYear()
        })
        monthlyData.push({
          month: monthStr,
          leads: monthLeads.length,
          value: monthLeads.reduce((sum, l) => sum + (l.value || 0), 0)
        })
      }
      
      return handleCORS(NextResponse.json({ byStatus, bySource, monthlyData }))
    }

    if (route === '/reports/expenses' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const expenses = await db.collection('expenses').find({ clientId: user.clientId }).toArray()
      
      // Group by category
      const byCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount
        return acc
      }, {})
      
      // Monthly data
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStr = date.toLocaleString('default', { month: 'short' })
        const monthExpenses = expenses.filter(e => {
          const expDate = new Date(e.date)
          return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear()
        })
        monthlyData.push({
          month: monthStr,
          total: monthExpenses.reduce((sum, e) => sum + e.amount, 0)
        })
      }
      
      return handleCORS(NextResponse.json({ byCategory, monthlyData }))
    }

    // ============ CLIENT MODULES ROUTES ============
    
    if (route === '/client/modules' && method === 'GET') {
      if (!user || !user.clientId) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      
      const clientDoc = await db.collection('clients').findOne({ id: user.clientId })
      const allModules = await db.collection('modules').find({ active: true }).toArray()
      
      const modulesWithStatus = allModules.map(({ _id, ...m }) => ({
        ...m,
        enabled: clientDoc.modules?.includes(m.id) || false
      }))
      
      return handleCORS(NextResponse.json(modulesWithStatus))
    }

    // ============ WEBHOOK ENDPOINT FOR LEAD INTEGRATIONS (Mock) ============
    
    if (route === '/webhook/leads' && method === 'POST') {
      const body = await request.json()
      const { clientId, source, leadData } = body
      
      if (!clientId) {
        return handleCORS(NextResponse.json({ error: 'Client ID required' }, { status: 400 }))
      }
      
      const lead = {
        id: uuidv4(),
        clientId,
        name: leadData?.name || 'Unknown',
        email: leadData?.email || '',
        phone: leadData?.phone || '',
        source: source || 'Webhook',
        status: 'new',
        value: 0,
        notes: leadData?.message || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('leads').insertOne(lead)
      
      // Mock WhatsApp notification
      console.log(`[WhatsApp Mock] New lead notification sent for client ${clientId}`)
      
      return handleCORS(NextResponse.json({ message: 'Lead received', leadId: lead.id }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
