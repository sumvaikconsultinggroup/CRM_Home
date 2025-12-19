/**
 * Reset and Seed Database
 * Provides clean slate for testing and demo purposes
 */

import { getClientDb, getMainDb, initializeClientDatabase, generateUniqueClientId } from '@/lib/db/multitenancy'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword } from '@/lib/utils/auth'

// Sample lead sources
const LEAD_SOURCES = ['Meta Ads', 'Google Ads', 'IndiaMART', 'JustDial', 'Website', 'Referral', 'Walk-in']

// Sample data generators
function generatePhone() {
  return `+91${Math.floor(9000000000 + Math.random() * 999999999)}`
}

function generateEmail(name) {
  const domain = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'][Math.floor(Math.random() * 4)]
  return `${name.toLowerCase().replace(/\s+/g, '.')}${Math.floor(Math.random() * 100)}@${domain}`
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateAddress() {
  const areas = ['Andheri', 'Bandra', 'Powai', 'Juhu', 'Worli', 'Lower Parel', 'Malad', 'Goregaon']
  return `${Math.floor(100 + Math.random() * 900)}, ${randomFromArray(areas)}, Mumbai - ${400000 + Math.floor(Math.random() * 100)}`
}

/**
 * Reset all data for a client
 */
export async function resetClientData(clientId) {
  const db = await getClientDb(clientId)
  
  // List of collections to clear
  const collectionsToReset = [
    'leads', 'projects', 'tasks', 'expenses', 'contacts', 'notes',
    'flooring_projects', 'flooring_quotes', 'flooring_invoices', 'flooring_installations',
    'flooring_dispatches', 'flooring_customers', 'flooring_payments',
    'wf_inventory_stock', 'inventory_reservations', 'inventory_movements',
    'dw_quotes', 'dw_invoices', 'dw_orders',
    'audit_logs', 'activity_logs', 'events_queue', 'processed_events', 'dead_letter_queue',
    'integrity_reports', 'whatsapp_logs'
  ]
  
  const results = []
  
  for (const collName of collectionsToReset) {
    try {
      const collection = db.collection(collName)
      const deleteResult = await collection.deleteMany({})
      results.push({ collection: collName, deletedCount: deleteResult.deletedCount })
    } catch (error) {
      results.push({ collection: collName, error: error.message })
    }
  }
  
  return results
}

/**
 * Seed sample leads
 */
async function seedLeads(db, count = 10) {
  const leadsCollection = db.collection('leads')
  const leads = []
  
  const names = [
    'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Reddy', 'Vikram Singh',
    'Neha Gupta', 'Arjun Nair', 'Kavita Joshi', 'Rohit Verma', 'Ananya Iyer',
    'Sanjay Mehta', 'Pooja Desai', 'Kiran Rao', 'Deepak Chaudhary', 'Lakshmi Menon'
  ]
  
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation']
  
  for (let i = 0; i < count; i++) {
    const name = names[i % names.length]
    leads.push({
      id: uuidv4(),
      name,
      email: generateEmail(name),
      phone: generatePhone(),
      source: randomFromArray(LEAD_SOURCES),
      status: randomFromArray(statuses),
      address: generateAddress(),
      budget: (Math.floor(Math.random() * 50) + 5) * 100000, // 5L to 55L
      requirement: randomFromArray(['Wooden Flooring', 'Door & Windows', 'Interior Design', 'Kitchen']),
      notes: `Interested in ${randomFromArray(['premium', 'mid-range', 'budget'])} solutions`,
      assignedTo: null,
      tags: [randomFromArray(['hot', 'warm', 'cold'])],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      updatedAt: new Date()
    })
  }
  
  await leadsCollection.insertMany(leads)
  return leads
}

/**
 * Seed sample projects
 */
async function seedProjects(db, count = 3) {
  const projectsCollection = db.collection('projects')
  const projects = []
  
  const projectTypes = [
    { name: 'Sharma Residence - Wooden Flooring', segment: 'B2C', status: 'completed' },
    { name: 'Patel Villa - Premium Flooring', segment: 'B2C', status: 'in_progress' },
    { name: 'ABC Builders - Commercial Project', segment: 'B2B', status: 'planning' }
  ]
  
  for (let i = 0; i < Math.min(count, projectTypes.length); i++) {
    const pt = projectTypes[i]
    projects.push({
      id: uuidv4(),
      projectNumber: `PRJ-${String(i + 1).padStart(4, '0')}`,
      name: pt.name,
      segment: pt.segment,
      status: pt.status,
      clientName: pt.name.split(' - ')[0],
      clientPhone: generatePhone(),
      clientEmail: generateEmail(pt.name.split(' ')[0]),
      address: generateAddress(),
      budget: (Math.floor(Math.random() * 30) + 10) * 100000,
      startDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      expectedEndDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
      description: `${pt.segment} project for ${pt.name}`,
      modules: ['wooden-flooring'],
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
  
  await projectsCollection.insertMany(projects)
  return projects
}

/**
 * Seed sample tasks
 */
async function seedTasks(db, projects, userIds) {
  const tasksCollection = db.collection('tasks')
  const tasks = []
  
  const taskTemplates = [
    { title: 'Initial Site Visit', status: 'completed', priority: 'high' },
    { title: 'Prepare Measurement Report', status: 'completed', priority: 'medium' },
    { title: 'Generate Quotation', status: 'in_progress', priority: 'high' },
    { title: 'Follow up with Client', status: 'todo', priority: 'medium' },
    { title: 'Material Procurement', status: 'backlog', priority: 'low' },
    { title: 'Schedule Installation', status: 'backlog', priority: 'medium' }
  ]
  
  for (const project of projects) {
    for (const template of taskTemplates) {
      tasks.push({
        id: uuidv4(),
        title: `${template.title} - ${project.name.split(' - ')[0]}`,
        description: `Task for ${project.name}`,
        status: template.status,
        priority: template.priority,
        taskType: 'task',
        projectId: project.id,
        assignees: userIds.length > 0 ? [randomFromArray(userIds)] : [],
        dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000),
        labels: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }
  
  await tasksCollection.insertMany(tasks)
  return tasks
}

/**
 * Seed flooring module data
 */
async function seedFlooringData(db, projects) {
  // Seed flooring products
  const productsCollection = db.collection('flooring_products')
  const products = [
    {
      id: uuidv4(),
      sku: 'WF-OAK-001',
      name: 'Premium Oak Engineered Wood',
      category: 'Engineered Wood',
      brand: 'Pergo',
      unit: 'sqft',
      price: 450,
      costPrice: 320,
      thickness: '12mm',
      finish: 'Matt',
      warranty: '25 years',
      inStock: true,
      stockQuantity: 5000,
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      sku: 'WF-WAL-002',
      name: 'American Walnut Solid Wood',
      category: 'Solid Wood',
      brand: 'Greenply',
      unit: 'sqft',
      price: 680,
      costPrice: 480,
      thickness: '18mm',
      finish: 'Glossy',
      warranty: '30 years',
      inStock: true,
      stockQuantity: 3000,
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      sku: 'WF-LAM-003',
      name: 'Budget Laminate Flooring',
      category: 'Laminate',
      brand: 'Kronotex',
      unit: 'sqft',
      price: 180,
      costPrice: 120,
      thickness: '8mm',
      finish: 'Wood Grain',
      warranty: '10 years',
      inStock: true,
      stockQuantity: 10000,
      createdAt: new Date()
    }
  ]
  await productsCollection.insertMany(products)
  
  // Seed inventory stock
  const stockCollection = db.collection('wf_inventory_stock')
  const stockItems = products.map(p => ({
    id: uuidv4(),
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    quantity: p.stockQuantity,
    reservedQuantity: 0,
    unit: p.unit,
    unitCost: p.costPrice,
    location: 'Main Warehouse',
    lastUpdated: new Date()
  }))
  await stockCollection.insertMany(stockItems)
  
  // Seed quotes for completed project
  const completedProject = projects.find(p => p.status === 'completed')
  if (completedProject) {
    const quotesCollection = db.collection('flooring_quotes')
    const quote = {
      id: uuidv4(),
      quotationNumber: 'FLQ-0001',
      projectId: completedProject.id,
      projectName: completedProject.name,
      customerName: completedProject.clientName,
      customerPhone: completedProject.clientPhone,
      customerEmail: completedProject.clientEmail,
      customerAddress: completedProject.address,
      projectSegment: completedProject.segment,
      status: 'converted',
      items: [
        {
          productId: products[0].id,
          productName: products[0].name,
          quantity: 500,
          unit: 'sqft',
          rate: products[0].price,
          amount: 500 * products[0].price
        }
      ],
      subtotal: 225000,
      taxRate: 18,
      taxAmount: 40500,
      grandTotal: 265500,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
    await quotesCollection.insertOne(quote)
    
    // Seed invoice for completed project
    const invoicesCollection = db.collection('flooring_invoices')
    const invoice = {
      id: uuidv4(),
      invoiceNumber: 'INV-0001',
      quotationId: quote.id,
      projectId: completedProject.id,
      projectName: completedProject.name,
      projectSegment: completedProject.segment,
      customerName: completedProject.clientName,
      customerPhone: completedProject.clientPhone,
      customerEmail: completedProject.clientEmail,
      customerAddress: completedProject.address,
      status: 'paid',
      items: quote.items,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      grandTotal: quote.grandTotal,
      paidAmount: quote.grandTotal,
      balance: 0,
      dispatched: true,
      dispatchedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
    await invoicesCollection.insertOne(invoice)
  }
  
  // Seed quote for in-progress project
  const inProgressProject = projects.find(p => p.status === 'in_progress')
  if (inProgressProject) {
    const quotesCollection = db.collection('flooring_quotes')
    const quote = {
      id: uuidv4(),
      quotationNumber: 'FLQ-0002',
      projectId: inProgressProject.id,
      projectName: inProgressProject.name,
      customerName: inProgressProject.clientName,
      customerPhone: inProgressProject.clientPhone,
      customerEmail: inProgressProject.clientEmail,
      customerAddress: inProgressProject.address,
      projectSegment: inProgressProject.segment,
      status: 'approved',
      items: [
        {
          productId: products[1].id,
          productName: products[1].name,
          quantity: 800,
          unit: 'sqft',
          rate: products[1].price,
          amount: 800 * products[1].price
        }
      ],
      subtotal: 544000,
      taxRate: 18,
      taxAmount: 97920,
      grandTotal: 641920,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
    await quotesCollection.insertOne(quote)
    
    // Create invoice with partial payment
    const invoicesCollection = db.collection('flooring_invoices')
    const invoice = {
      id: uuidv4(),
      invoiceNumber: 'INV-0002',
      quotationId: quote.id,
      projectId: inProgressProject.id,
      projectName: inProgressProject.name,
      projectSegment: inProgressProject.segment,
      customerName: inProgressProject.clientName,
      customerPhone: inProgressProject.clientPhone,
      customerEmail: inProgressProject.clientEmail,
      customerAddress: inProgressProject.address,
      status: 'partial',
      items: quote.items,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      grandTotal: quote.grandTotal,
      paidAmount: 300000,
      balance: quote.grandTotal - 300000,
      dispatched: false,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
    await invoicesCollection.insertOne(invoice)
  }
  
  return { products, stockItems }
}

/**
 * Seed sample expenses
 */
async function seedExpenses(db) {
  const expensesCollection = db.collection('expenses')
  const expenses = [
    {
      id: uuidv4(),
      description: 'Office Supplies',
      amount: 5000,
      category: 'Office',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      paymentMethod: 'UPI',
      status: 'approved',
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      description: 'Transportation - Site Visit',
      amount: 1500,
      category: 'Travel',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      paymentMethod: 'Cash',
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      description: 'Material Samples',
      amount: 8000,
      category: 'Materials',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      paymentMethod: 'Bank Transfer',
      status: 'approved',
      createdAt: new Date()
    }
  ]
  
  await expensesCollection.insertMany(expenses)
  return expenses
}

/**
 * Seed WhatsApp automation templates
 */
async function seedWhatsAppTemplates(db) {
  const templatesCollection = db.collection('whatsapp_templates')
  const templates = [
    {
      id: uuidv4(),
      name: 'Welcome Lead',
      trigger: 'lead.created',
      message: 'Hi {{name}}, thank you for your interest in our flooring solutions! Our team will contact you shortly.',
      enabled: true,
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      name: 'Quote Sent',
      trigger: 'quote.sent',
      message: 'Dear {{name}}, your quotation {{quotationNumber}} has been sent. Total: \u20b9{{total}}. Valid until {{validUntil}}.',
      enabled: true,
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      name: 'Payment Reminder',
      trigger: 'payment.reminder',
      message: 'Hi {{name}}, friendly reminder about your pending payment of \u20b9{{balance}} for invoice {{invoiceNumber}}.',
      enabled: true,
      createdAt: new Date()
    }
  ]
  
  await templatesCollection.insertMany(templates)
  
  // Seed sample triggered messages (mocked)
  const messagesCollection = db.collection('whatsapp_logs')
  const messages = [
    {
      id: uuidv4(),
      templateId: templates[0].id,
      recipientPhone: '+919876543210',
      recipientName: 'Rajesh Kumar',
      message: 'Hi Rajesh Kumar, thank you for your interest in our flooring solutions! Our team will contact you shortly.',
      status: 'delivered',
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000)
    },
    {
      id: uuidv4(),
      templateId: templates[1].id,
      recipientPhone: '+919876543211',
      recipientName: 'Priya Sharma',
      message: 'Dear Priya Sharma, your quotation FLQ-0001 has been sent. Total: \u20b9265500. Valid until 15-Jan-2025.',
      status: 'delivered',
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3000)
    }
  ]
  
  await messagesCollection.insertMany(messages)
  return { templates, messages }
}

/**
 * Create sample tenant with full data
 */
export async function createSampleTenant(tenantConfig) {
  const {
    businessName,
    email,
    password,
    moduleType // 'flooring' or 'doors-windows'
  } = tenantConfig
  
  const mainDb = await getMainDb()
  
  // Generate client ID
  const clientId = await generateUniqueClientId()
  const databaseName = clientId
  
  // Create client record
  const clientsCollection = mainDb.collection('clients')
  const client = {
    id: uuidv4(),
    clientId,
    databaseName,
    businessName,
    email,
    phone: generatePhone(),
    password: hashPassword(password),
    role: 'client_admin',
    planId: 'enterprise',
    planName: 'Enterprise',
    subscriptionStatus: 'active',
    modules: moduleType === 'flooring' 
      ? ['wooden-flooring', 'build-inventory', 'build-finance']
      : ['doors-and-windows', 'build-inventory', 'build-finance'],
    userCount: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  await clientsCollection.insertOne(client)
  
  // Create admin user
  const usersCollection = mainDb.collection('users')
  const adminUser = {
    id: uuidv4(),
    email,
    name: `${businessName} Admin`,
    password: hashPassword(password),
    role: 'client_admin',
    clientId,
    databaseName,
    createdAt: new Date()
  }
  await usersCollection.insertOne(adminUser)
  
  // Create additional team member
  const teamMember = {
    id: uuidv4(),
    email: `sales@${businessName.toLowerCase().replace(/\s+/g, '')}.com`,
    name: `${businessName} Sales`,
    password: hashPassword('sales123'),
    role: 'user',
    clientId,
    databaseName,
    createdAt: new Date()
  }
  await usersCollection.insertOne(teamMember)
  
  // Initialize client database
  await initializeClientDatabase(clientId)
  
  // Seed data
  const db = await getClientDb(clientId)
  
  const leads = await seedLeads(db, 10)
  const projects = await seedProjects(db, 3)
  const tasks = await seedTasks(db, projects, [adminUser.id, teamMember.id])
  const expenses = await seedExpenses(db)
  const whatsapp = await seedWhatsAppTemplates(db)
  
  let moduleData = null
  if (moduleType === 'flooring') {
    moduleData = await seedFlooringData(db, projects)
  }
  
  return {
    client,
    users: [adminUser, teamMember],
    data: {
      leads: leads.length,
      projects: projects.length,
      tasks: tasks.length,
      expenses: expenses.length,
      whatsappTemplates: whatsapp.templates.length,
      whatsappMessages: whatsapp.messages.length,
      moduleData: moduleData ? { products: moduleData.products.length, stockItems: moduleData.stockItems.length } : null
    }
  }
}

/**
 * Full reset and seed for testing
 */
export async function resetAndSeedAll() {
  const results = {
    tenants: [],
    errors: []
  }
  
  try {
    // Create Tenant A: Wooden Flooring
    const tenantA = await createSampleTenant({
      businessName: 'FloorMasters India',
      email: 'admin@floormasters.com',
      password: 'floor123',
      moduleType: 'flooring'
    })
    results.tenants.push({
      name: 'FloorMasters India (Wooden Flooring)',
      clientId: tenantA.client.clientId,
      credentials: { email: 'admin@floormasters.com', password: 'floor123' },
      ...tenantA.data
    })
    
    // Create Tenant B: Doors & Windows
    const tenantB = await createSampleTenant({
      businessName: 'WindowWorld',
      email: 'admin@windowworld.com',
      password: 'window123',
      moduleType: 'doors-windows'
    })
    results.tenants.push({
      name: 'WindowWorld (Doors & Windows)',
      clientId: tenantB.client.clientId,
      credentials: { email: 'admin@windowworld.com', password: 'window123' },
      ...tenantB.data
    })
    
  } catch (error) {
    results.errors.push(error.message)
  }
  
  return results
}

export default {
  resetClientData,
  createSampleTenant,
  resetAndSeedAll
}
