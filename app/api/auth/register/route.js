import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { seedDatabase, generateDummyData } from '@/lib/db/seed'
import { hashPassword, generateToken } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { validateEmail, validateRequired } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate next client code
async function generateClientCode() {
  const clientsCollection = await getCollection(Collections.CLIENTS)
  
  // Find the highest client code number
  const allClients = await clientsCollection
    .find({ clientCode: { $exists: true } })
    .toArray()
  
  let maxNumber = 0
  for (const client of allClients) {
    if (client.clientCode) {
      const match = client.clientCode.match(/CL-(\d+)/)
      if (match) {
        const num = parseInt(match[1])
        if (num > maxNumber) maxNumber = num
      }
    }
  }
  
  return `CL-${String(maxNumber + 1).padStart(3, '0')}`
}

export async function POST(request) {
  try {
    await seedDatabase()
    const body = await request.json()
    const { businessName, email, password, phone, planId = 'basic' } = body

    // Validation
    const validation = validateRequired(body, ['businessName', 'email', 'password'])
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400)
    }

    const usersCollection = await getCollection(Collections.USERS)
    const clientsCollection = await getCollection(Collections.CLIENTS)
    const leadsCollection = await getCollection(Collections.LEADS)
    const projectsCollection = await getCollection(Collections.PROJECTS)
    const tasksCollection = await getCollection(Collections.TASKS)
    const expensesCollection = await getCollection(Collections.EXPENSES)
    const whitelabelCollection = await getCollection(Collections.WHITELABEL)

    // Check if email exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return errorResponse('Email already registered', 400)
    }

    const clientId = uuidv4()
    const userId = uuidv4()
    
    // Generate unique client code
    const clientCode = await generateClientCode()

    // Create client organization
    const client = {
      id: clientId,
      clientCode, // Add unique client code
      businessName,
      email,
      phone: phone || '',
      planId,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      modules: [],
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY'
      },
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
      avatar: null,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create default white label settings
    const whitelabelSettings = {
      id: uuidv4(),
      clientId,
      logo: null,
      favicon: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      companyName: businessName,
      customDomain: null,
      customCSS: '',
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await clientsCollection.insertOne(client)
    await usersCollection.insertOne(newUser)
    await whitelabelCollection.insertOne(whitelabelSettings)

    // Generate dummy data
    const { leads, projects, tasks, expenses } = generateDummyData(clientId)
    await leadsCollection.insertMany(leads)
    await projectsCollection.insertMany(projects)
    await tasksCollection.insertMany(tasks)
    await expensesCollection.insertMany(expenses)

    const token = generateToken(newUser)

    return successResponse({
      token,
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role, 
        clientId 
      },
      client: { 
        id: client.id, 
        businessName: client.businessName, 
        planId: client.planId 
      }
    }, 201)
  } catch (error) {
    console.error('Register API Error:', error)
    return errorResponse('Registration failed', 500, error.message)
  }
}
