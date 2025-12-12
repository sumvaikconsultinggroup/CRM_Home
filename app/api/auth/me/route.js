import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return errorResponse('Unauthorized', 401)
    }

    const usersCollection = await getCollection(Collections.USERS)
    const clientsCollection = await getCollection(Collections.CLIENTS)
    const whitelabelCollection = await getCollection(Collections.WHITELABEL)

    const foundUser = await usersCollection.findOne({ id: user.id })
    if (!foundUser) {
      return errorResponse('User not found', 404)
    }

    let clientData = null
    let whitelabelData = null

    if (foundUser.clientId) {
      const clientDoc = await clientsCollection.findOne({ id: foundUser.clientId })
      if (clientDoc) {
        clientData = sanitizeDocument(clientDoc)
      }

      // Get white label settings
      const whitelabelDoc = await whitelabelCollection.findOne({ clientId: foundUser.clientId })
      if (whitelabelDoc) {
        whitelabelData = sanitizeDocument(whitelabelDoc)
      }
    }

    return successResponse({
      user: { 
        id: foundUser.id, 
        email: foundUser.email, 
        name: foundUser.name, 
        role: foundUser.role, 
        clientId: foundUser.clientId,
        avatar: foundUser.avatar,
        permissions: foundUser.permissions 
      },
      client: clientData,
      whitelabel: whitelabelData
    })
  } catch (error) {
    console.error('Me API Error:', error)
    return errorResponse('Failed to get user', 500, error.message)
  }
}
