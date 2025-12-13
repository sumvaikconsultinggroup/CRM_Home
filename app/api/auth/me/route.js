import { getMainDb } from '@/lib/db/multitenancy'
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

    // Use main database for users, clients, and whitelabel settings
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')
    const clientsCollection = mainDb.collection('clients')
    const whitelabelCollection = mainDb.collection('whitelabel_settings')

    const foundUser = await usersCollection.findOne({ id: user.id })
    if (!foundUser) {
      return errorResponse('User not found', 404)
    }

    let clientData = null
    let whitelabelData = null
    let databaseName = null

    if (foundUser.clientId) {
      // First try to find by the new clientId format (CL-XXXXXX)
      let clientDoc = await clientsCollection.findOne({ clientId: foundUser.clientId })
      
      // If not found, try to find by old id format
      if (!clientDoc) {
        clientDoc = await clientsCollection.findOne({ id: foundUser.clientId })
      }
      
      if (clientDoc) {
        clientData = sanitizeDocument(clientDoc)
        // Get the database name from the client document
        databaseName = clientDoc.databaseName || clientDoc.clientId || foundUser.databaseName || foundUser.clientId
      } else {
        databaseName = foundUser.databaseName || foundUser.clientId
      }

      // Get white label settings - support both old and new clientId formats
      let whitelabelDoc = await whitelabelCollection.findOne({ clientId: foundUser.clientId })
      if (!whitelabelDoc && clientDoc) {
        whitelabelDoc = await whitelabelCollection.findOne({ clientId: clientDoc.clientId })
      }
      if (!whitelabelDoc && clientDoc) {
        whitelabelDoc = await whitelabelCollection.findOne({ clientId: clientDoc.id })
      }
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
        databaseName: databaseName,
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
