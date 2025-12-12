import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { v4 as uuidv4 } from 'uuid'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { clientId } = params
    const { password } = await request.json()

    if (!clientId || !password) {
      return errorResponse('Client ID and new password are required', 400)
    }

    const usersCollection = await getCollection(Collections.USERS)
    
    // Find the admin user for this client (or all users for this client?)
    // Typically, you'd reset a specific user's password. But if we are resetting "Client Password",
    // we likely mean the main admin user for that client.
    // For this MVP, let's reset the password for ALL users associated with this client ID
    // OR, better, find the user with role 'admin' for this client.
    
    const result = await usersCollection.updateMany(
      { clientId: clientId, role: 'admin' },
      { $set: { password: password } }
    )

    if (result.matchedCount === 0) {
      return errorResponse('No admin user found for this client', 404)
    }

    return successResponse({ message: 'Client admin password updated successfully' })
  } catch (error) {
    console.error('Admin Password Reset API Error:', error)
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 403)
    }
    return errorResponse('Failed to reset password', 500)
  }
}
