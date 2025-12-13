import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, hashPassword } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { userId } = await params
    
    // Users are in main database (platform-level)
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')

    const foundUser = await usersCollection.findOne({ id: userId, clientId: user.clientId })
    if (!foundUser) {
      return errorResponse('User not found', 404)
    }

    const { password, _id, ...userData } = foundUser
    return successResponse(userData)
  } catch (error) {
    console.error('User GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch user', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { userId } = await params
    const body = await request.json()
    
    // Users are in main database (platform-level)
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')

    const updateData = { updatedAt: new Date() }
    if (body.name) updateData.name = body.name
    if (body.role) updateData.role = body.role
    if (body.permissions) updateData.permissions = body.permissions
    if (body.password) updateData.password = hashPassword(body.password)
    if (body.avatar !== undefined) updateData.avatar = body.avatar

    const result = await usersCollection.updateOne(
      { id: userId, clientId: user.clientId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return errorResponse('User not found', 404)
    }

    return successResponse({ message: 'User updated successfully' })
  } catch (error) {
    console.error('User PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update user', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { userId } = await params

    // Prevent self-deletion
    if (userId === user.id) {
      return errorResponse('Cannot delete your own account', 400)
    }

    // Users are in main database (platform-level)
    const mainDb = await getMainDb()
    const usersCollection = mainDb.collection('users')

    const result = await usersCollection.deleteOne({ id: userId, clientId: user.clientId })

    if (result.deletedCount === 0) {
      return errorResponse('User not found', 404)
    }

    return successResponse({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('User DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete user', 500, error.message)
  }
}
