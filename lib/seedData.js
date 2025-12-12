import { v4 as uuidv4 } from 'uuid'
import { hashPassword } from './auth'

export const industryModules = [
  { id: uuidv4(), name: 'Wooden Flooring', description: 'Project management for flooring installation, sales pipeline, order tracking, invoicing', price: 999, icon: 'Layers', active: true },
  { id: uuidv4(), name: 'Kitchens', description: 'Sales pipeline, supplier management, design approval workflow, project tracking', price: 999, icon: 'ChefHat', active: true },
  { id: uuidv4(), name: 'Tiles', description: 'Client inquiries, quotes, order management, delivery scheduling', price: 999, icon: 'Grid3X3', active: true },
  { id: uuidv4(), name: 'Furniture', description: 'Custom furniture orders, design management, production tracking', price: 999, icon: 'Sofa', active: true },
  { id: uuidv4(), name: 'Contractors', description: 'Contractor management, scheduling, payments, compliance tracking', price: 999, icon: 'HardHat', active: true },
  { id: uuidv4(), name: 'Painting', description: 'Color consultation, project estimates, material tracking', price: 999, icon: 'Paintbrush', active: true },
  { id: uuidv4(), name: 'Plumbing', description: 'Service requests, inventory management, technician scheduling', price: 999, icon: 'Wrench', active: true },
  { id: uuidv4(), name: 'Electrical', description: 'Electrical projects, safety compliance, equipment tracking', price: 999, icon: 'Zap', active: true }
]

export const subscriptionPlans = [
  { id: 'basic', name: 'Basic', price: 2999, billingCycle: 'monthly', userLimit: 5, features: ['5 Users', 'Basic CRM', 'Task Management', 'Email Support'] },
  { id: 'professional', name: 'Professional', price: 5999, billingCycle: 'monthly', userLimit: 15, features: ['15 Users', 'Advanced CRM', 'Project Management', 'Reports & Analytics', 'Priority Support'] },
  { id: 'enterprise', name: 'Enterprise', price: 9999, billingCycle: 'monthly', userLimit: -1, features: ['Unlimited Users', 'Full CRM Suite', 'Custom Modules', 'API Access', 'Dedicated Support', 'White Labeling'] }
]

export function createSuperAdmin() {
  return {
    id: uuidv4(),
    email: 'admin@buildcrm.com',
    password: hashPassword('admin123'),
    name: 'Super Admin',
    role: 'super_admin',
    clientId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function generateDummyLeads(clientId, count = 10) {
  const sources = ['Meta Ads', 'Google Ads', 'Indiamart', 'Justdial', 'Website', 'Referral']
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const leads = []
  
  for (let i = 0; i < count; i++) {
    leads.push({
      id: uuidv4(),
      clientId,
      name: `Lead ${i + 1}`,
      email: `lead${i + 1}@example.com`,
      phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      value: Math.floor(Math.random() * 500000) + 50000,
      notes: 'Interested in our services',
      assignedTo: null,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    })
  }
  return leads
}

export function generateDummyProjects(clientId, count = 5) {
  const statuses = ['planning', 'in_progress', 'on_hold', 'completed']
  const projects = []
  
  for (let i = 0; i < count; i++) {
    projects.push({
      id: uuidv4(),
      clientId,
      name: `Project ${i + 1}`,
      description: 'Sample project description',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      budget: Math.floor(Math.random() * 1000000) + 100000,
      spent: Math.floor(Math.random() * 500000),
      startDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
      progress: Math.floor(Math.random() * 100),
      assignedTo: [],
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
  return projects
}

export function generateDummyTasks(clientId, count = 15) {
  const statuses = ['todo', 'in_progress', 'review', 'completed']
  const priorities = ['low', 'medium', 'high', 'urgent']
  const tasks = []
  
  for (let i = 0; i < count; i++) {
    tasks.push({
      id: uuidv4(),
      clientId,
      title: `Task ${i + 1}`,
      description: 'Task description here',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      assignedTo: null,
      projectId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
  return tasks
}

export function generateDummyExpenses(clientId, count = 10) {
  const categories = ['Materials', 'Labor', 'Equipment', 'Marketing', 'Office', 'Travel']
  const expenses = []
  
  for (let i = 0; i < count; i++) {
    expenses.push({
      id: uuidv4(),
      clientId,
      description: `Expense ${i + 1}`,
      amount: Math.floor(Math.random() * 50000) + 1000,
      category: categories[Math.floor(Math.random() * categories.length)],
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      receipt: null,
      approved: Math.random() > 0.3,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
  return expenses
}
