import { getCollection, Collections } from '@/lib/db/mongodb'
import { seedDatabase } from '@/lib/db/seed'
import { verifyPassword, generateToken } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'
import { validateRequired } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request) {
  try {
    await seedDatabase()
    const body = await request.json()
    const { email, password } = body

    // Validation
    const validation = validateRequired(body, ['email', 'password'])
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    const usersCollection = await getCollection(Collections.USERS)
    const clientsCollection = await getCollection(Collections.CLIENTS)

    const foundUser = await usersCollection.findOne({ email })
    if (!foundUser || !verifyPassword(password, foundUser.password)) {
      return errorResponse('Invalid credentials', 401)
    }

    // Update last login
    await usersCollection.updateOne(
      { id: foundUser.id },
      { $set: { lastLogin: new Date() } }
    )

    const token = generateToken(foundUser)
    let clientData = null

    if (foundUser.clientId) {
      const clientDoc = await clientsCollection.findOne({ id: foundUser.clientId })
      if (clientDoc) {
        clientData = sanitizeDocument(clientDoc)
      }
    }

    return successResponse({
      token,
      user: { 
        id: foundUser.id, 
        email: foundUser.email, 
        name: foundUser.name, 
        role: foundUser.role, 
        clientId: foundUser.clientId,
        avatar: foundUser.avatar 
      },
      client: clientData
    })
  } catch (error) {
    console.error('Login API Error:', error)
    return errorResponse('Login failed', 500, error.message)
  }
}
