import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from './mongodb'

// Use stable IDs for modules so they can be referenced consistently
export const industryModules = [
  { id: 'wooden-flooring', name: 'Wooden Flooring', description: 'Project management for flooring installation, sales pipeline, order tracking, invoicing', price: 999, icon: 'Layers', category: 'flooring', active: true, features: ['Project Tracking', 'Order Management', 'Invoicing', 'Material Calculator'] },
  { id: 'kitchens', name: 'Kitchens', description: 'Sales pipeline, supplier management, design approval workflow, project tracking', price: 999, icon: 'ChefHat', category: 'kitchen', active: true, features: ['Design Workflow', 'Supplier Portal', '3D Visualization', 'Quote Generator'] },
  { id: 'tiles', name: 'Tiles', description: 'Client inquiries, quotes, order management, delivery scheduling', price: 999, icon: 'Grid3X3', category: 'tiles', active: true, features: ['Quote Builder', 'Delivery Tracking', 'Inventory Sync', 'Pattern Matcher'] },
  { id: 'furniture', name: 'Furniture', description: 'Custom furniture orders, design management, production tracking', price: 999, icon: 'Sofa', category: 'furniture', active: true, features: ['Custom Orders', 'Design Gallery', 'Production Timeline', 'Delivery Management'] },
  { id: 'contractors', name: 'Contractors', description: 'Contractor management, scheduling, payments, compliance tracking', price: 999, icon: 'HardHat', category: 'contractors', active: true, features: ['Contractor Portal', 'Schedule Management', 'Payment Tracking', 'Compliance Docs'] },
  { id: 'painting', name: 'Painting', description: 'Color consultation, project estimates, material tracking', price: 999, icon: 'Paintbrush', category: 'painting', active: true, features: ['Color Visualizer', 'Estimate Builder', 'Material Calculator', 'Before/After Gallery'] },
  { id: 'plumbing', name: 'Plumbing', description: 'Service requests, inventory management, technician scheduling', price: 999, icon: 'Wrench', category: 'plumbing', active: true, features: ['Service Tickets', 'Technician App', 'Parts Inventory', 'Route Optimization'] },
  { id: 'electrical', name: 'Electrical', description: 'Electrical projects, safety compliance, equipment tracking', price: 999, icon: 'Zap', category: 'electrical', active: true, features: ['Safety Checklists', 'Permit Tracking', 'Equipment Management', 'Compliance Reports'] },
  { id: 'doors-windows', name: 'Doors and Windows', description: 'Door and window installation, custom designs, measurement tracking, supplier coordination', price: 999, icon: 'DoorOpen', category: 'doors-windows', active: true, features: ['Measurement Tools', 'Design Catalog', 'Installation Scheduling', 'Supplier Management'] },
  { id: 'architects', name: 'Architects', description: 'Architectural project management, blueprint tracking, client presentations, regulatory compliance', price: 999, icon: 'Building2', category: 'architects', active: true, features: ['Blueprint Management', 'Client Portal', 'Regulatory Docs', 'Project Timeline'] },
  { id: 'interior-designers', name: 'Interior Designers', description: 'Interior design projects, mood boards, material selection, vendor coordination', price: 999, icon: 'Palette', category: 'interior-designers', active: true, features: ['Mood Boards', 'Material Library', 'Vendor Network', '3D Visualization'] },
  { id: 'real-estate-brokers', name: 'Real Estate Brokers', description: 'Property listings, client matching, deal tracking, document management', price: 999, icon: 'Building', category: 'real-estate', active: true, features: ['Property Listings', 'Client Matching', 'Deal Pipeline', 'Document Vault'] }
]

export const subscriptionPlans = [
  { 
    id: 'basic', 
    name: 'Basic', 
    price: 2999, 
    billingCycle: 'monthly', 
    userLimit: 5, 
    storageGB: 5,
    features: ['5 Users', 'Basic CRM', 'Task Management', 'Email Support', '5GB Storage'],
    whitelabel: false,
    customDomain: false,
    apiAccess: false
  },
  { 
    id: 'professional', 
    name: 'Professional', 
    price: 5999, 
    billingCycle: 'monthly', 
    userLimit: 15, 
    storageGB: 25,
    features: ['15 Users', 'Advanced CRM', 'Project Management', 'Reports & Analytics', 'Priority Support', '25GB Storage', 'API Access'],
    whitelabel: false,
    customDomain: false,
    apiAccess: true
  },
  { 
    id: 'enterprise', 
    name: 'Enterprise', 
    price: 9999, 
    billingCycle: 'monthly', 
    userLimit: -1, 
    storageGB: 100,
    features: ['Unlimited Users', 'Full CRM Suite', 'Custom Modules', 'API Access', 'Dedicated Support', '100GB Storage', 'White Labeling', 'Custom Domain'],
    whitelabel: true,
    customDomain: true,
    apiAccess: true
  }
]

export async function seedDatabase() {
  try {
    const modulesCollection = await getCollection(Collections.MODULES)
    const plansCollection = await getCollection(Collections.PLANS)
    const usersCollection = await getCollection(Collections.USERS)

    // Seed modules
    const modulesCount = await modulesCollection.countDocuments()
    if (modulesCount === 0) {
      await modulesCollection.insertMany(industryModules.map(m => ({ ...m, createdAt: new Date(), updatedAt: new Date() })))
      console.log('Modules seeded successfully')
    }

    // Seed plans
    const plansCount = await plansCollection.countDocuments()
    if (plansCount === 0) {
      await plansCollection.insertMany(subscriptionPlans.map(p => ({ ...p, createdAt: new Date(), updatedAt: new Date() })))
      console.log('Plans seeded successfully')
    }

    // Create super admin if not exists
    const adminExists = await usersCollection.findOne({ role: 'super_admin' })
    if (!adminExists) {
      await usersCollection.insertOne({
        id: uuidv4(),
        email: 'admin@buildcrm.com',
        password: Buffer.from('admin123' + 'buildcrm_salt_2024').toString('base64'),
        name: 'Super Admin',
        role: 'super_admin',
        clientId: null,
        permissions: ['all'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log('Super admin created')
    }

    return true
  } catch (error) {
    console.error('Seed error:', error)
    return false
  }
}

export function generateDummyData(clientId) {
  const sources = ['Meta Ads', 'Google Ads', 'Indiamart', 'Justdial', 'Website', 'Referral', 'WhatsApp']
  const leadStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const projectStatuses = ['planning', 'in_progress', 'on_hold', 'completed']
  const taskStatuses = ['todo', 'in_progress', 'review', 'completed']
  const priorities = ['low', 'medium', 'high', 'urgent']
  const expenseCategories = ['Materials', 'Labor', 'Equipment', 'Marketing', 'Office', 'Travel', 'Software', 'Utilities']

  const leads = Array.from({ length: 15 }, (_, i) => ({
    id: uuidv4(),
    clientId,
    name: `Lead ${i + 1}`,
    email: `lead${i + 1}@example.com`,
    phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    company: `Company ${i + 1}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
    value: Math.floor(Math.random() * 500000) + 50000,
    probability: Math.floor(Math.random() * 100),
    notes: 'Interested in our services',
    assignedTo: null,
    tags: ['hot', 'priority'].slice(0, Math.floor(Math.random() * 2) + 1),
    lastContactDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    expectedCloseDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }))

  const projects = Array.from({ length: 8 }, (_, i) => ({
    id: uuidv4(),
    clientId,
    name: `Project ${i + 1}`,
    description: `Description for project ${i + 1}`,
    status: projectStatuses[Math.floor(Math.random() * projectStatuses.length)],
    budget: Math.floor(Math.random() * 1000000) + 100000,
    spent: Math.floor(Math.random() * 500000),
    startDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
    progress: Math.floor(Math.random() * 100),
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    assignedTo: [],
    milestones: [
      { name: 'Planning', completed: true },
      { name: 'Design', completed: Math.random() > 0.5 },
      { name: 'Execution', completed: Math.random() > 0.7 },
      { name: 'Review', completed: false }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }))

  const tasks = Array.from({ length: 20 }, (_, i) => ({
    id: uuidv4(),
    clientId,
    title: `Task ${i + 1}`,
    description: `Task description ${i + 1}`,
    status: taskStatuses[Math.floor(Math.random() * taskStatuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    estimatedHours: Math.floor(Math.random() * 8) + 1,
    actualHours: Math.floor(Math.random() * 8),
    assignedTo: null,
    projectId: projects[Math.floor(Math.random() * projects.length)]?.id || null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }))

  const expenses = Array.from({ length: 15 }, (_, i) => ({
    id: uuidv4(),
    clientId,
    description: `Expense ${i + 1}`,
    amount: Math.floor(Math.random() * 50000) + 1000,
    category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    vendor: `Vendor ${i + 1}`,
    receipt: null,
    approved: Math.random() > 0.3,
    approvedBy: null,
    projectId: projects[Math.floor(Math.random() * projects.length)]?.id || null,
    createdAt: new Date(),
    updatedAt: new Date()
  }))

  return { leads, projects, tasks, expenses }
}
