import { getMainDb } from '@/lib/db/multitenancy'
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

    // Use main database for users and clients (platform-level data)
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')
    const clientsCollection = mainDb.collection('clients')

    console.log('Login attempt for:', email)
    const foundUser = await usersCollection.findOne({ email })
    console.log('Found user:', foundUser ? foundUser.email : 'NOT FOUND')
    
    if (!foundUser) {
      console.log('User not found in database')
      return errorResponse('Invalid credentials', 401)
    }
    
    const passwordMatch = verifyPassword(password, foundUser.password)
    console.log('Password match:', passwordMatch)
    
    if (!passwordMatch) {
      console.log('Password mismatch')
      return errorResponse('Invalid credentials', 401)
    }

    // Update last login
    await usersCollection.updateOne(
      { id: foundUser.id },
      { $set: { lastLogin: new Date() } }
    )

    let clientData = null
    let databaseName = null

    // Find client data - support both old (id field) and new (clientId field) formats
    if (foundUser.clientId) {
      // First try to find by the new clientId format (CL-XXXXXX)
      let clientDoc = await clientsCollection.findOne({ clientId: foundUser.clientId })
      
      // If not found, try to find by old id format
      if (!clientDoc) {
        clientDoc = await clientsCollection.findOne({ id: foundUser.clientId })
      }
      
      if (clientDoc) {
        clientData = sanitizeDocument(clientDoc)
        // Get the database name from the client document (new format)
        databaseName = clientDoc.databaseName || clientDoc.clientId || foundUser.clientId
      } else {
        // Fallback to user's stored databaseName or clientId
        databaseName = foundUser.databaseName || foundUser.clientId
      }
    }

    // Generate token with databaseName included
    const userForToken = {
      ...foundUser,
      databaseName: databaseName
    }
    const token = generateToken(userForToken)

    return successResponse({
      token,
      user: { 
        id: foundUser.id, 
        email: foundUser.email, 
        name: foundUser.name, 
        role: foundUser.role, 
        clientId: foundUser.clientId,
        databaseName: databaseName,
        avatar: foundUser.avatar 
      },
      client: clientData
    })
  } catch (error) {
    console.error('Login API Error:', error)
    return errorResponse('Login failed', 500, error.message)
  }
}
