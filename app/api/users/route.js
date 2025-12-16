import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, hashPassword } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'
import { validateUserData } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    // Users are in main database (platform-level)
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')

    const users = await usersCollection
      .find({ clientId: user.clientId })
      .toArray()

    // Remove passwords from response
    const sanitizedUsers = users.map(u => {
      const { password, _id, ...rest } = u
      return rest
    })

    return successResponse(sanitizedUsers)
  } catch (error) {
    console.error('Users GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch users', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const validation = validateUserData(body)
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    // Users are in main database (platform-level)
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')
    const clientsCollection = mainDb.collection('clients')
    const plansCollection = mainDb.collection('plans')

    // Find client by new clientId format or old id format
    let clientDoc = await clientsCollection.findOne({ clientId: user.clientId })
    if (!clientDoc) {
      clientDoc = await clientsCollection.findOne({ id: user.clientId })
    }

    const plan = await plansCollection.findOne({ id: clientDoc?.planId })
    const currentUsers = await usersCollection.countDocuments({ clientId: user.clientId })

    if (plan?.userLimit !== -1 && currentUsers >= (plan?.userLimit || 1)) {
      return errorResponse(`User limit reached. Your plan allows ${plan?.userLimit || 1} users. Upgrade to add more.`, 400)
    }

    // Check if email exists
    const existingUser = await usersCollection.findOne({ email: body.email })
    if (existingUser) {
      return errorResponse('Email already exists', 400)
    }

    const newUser = {
      id: uuidv4(),
      clientId: user.clientId,
      databaseName: user.databaseName || user.clientId,
      email: body.email,
      password: hashPassword(body.password),
      name: body.name,
      role: body.role || 'sales_rep',
      status: body.status || 'active',
      phone: body.phone || null,
      department: body.department || null,
      permissions: body.permissions || null, // null means inherit from role
      avatar: null,
      lastLogin: null,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await usersCollection.insertOne(newUser)

    const { password, _id, ...userData } = newUser
    return successResponse(userData, 201)
  } catch (error) {
    console.error('Users POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create user', 500, error.message)
  }
}
