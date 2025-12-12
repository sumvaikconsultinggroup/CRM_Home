import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action, leadIds, data } = body

    if (!action || !leadIds || !Array.isArray(leadIds)) {
      return errorResponse('Invalid request: action and leadIds required', 400)
    }

    const leadsCollection = await getCollection(Collections.LEADS)

    let result
    switch (action) {
      case 'delete':
        result = await leadsCollection.deleteMany({
          clientId: user.clientId,
          id: { $in: leadIds }
        })
        break

      case 'updateStatus':
        if (!data?.status) {
          return errorResponse('Status required for updateStatus action', 400)
        }
        result = await leadsCollection.updateMany(
          { clientId: user.clientId, id: { $in: leadIds } },
          { $set: { status: data.status, updatedAt: new Date() } }
        )
        break

      case 'assign':
        if (!data?.assignedTo) {
          return errorResponse('assignedTo required for assign action', 400)
        }
        result = await leadsCollection.updateMany(
          { clientId: user.clientId, id: { $in: leadIds } },
          { $set: { assignedTo: data.assignedTo, updatedAt: new Date() } }
        )
        break

      case 'addTags':
        if (!data?.tags || !Array.isArray(data.tags)) {
          return errorResponse('tags array required for addTags action', 400)
        }
        result = await leadsCollection.updateMany(
          { clientId: user.clientId, id: { $in: leadIds } },
          { $addToSet: { tags: { $each: data.tags } }, $set: { updatedAt: new Date() } }
        )
        break

      case 'removeTags':
        if (!data?.tags || !Array.isArray(data.tags)) {
          return errorResponse('tags array required for removeTags action', 400)
        }
        result = await leadsCollection.updateMany(
          { clientId: user.clientId, id: { $in: leadIds } },
          { $pull: { tags: { $in: data.tags } }, $set: { updatedAt: new Date() } }
        )
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    return successResponse({
      success: true,
      modified: result.modifiedCount || result.deletedCount || 0,
      message: `Bulk ${action} completed`
    })
  } catch (error) {
    console.error('Bulk Action Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to perform bulk action', 500, error.message)
  }
}
