import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const leadId = params.leadId
    const leadsCollection = await getCollection(Collections.LEADS)

    const lead = await leadsCollection.findOne({ id: leadId, clientId: user.clientId })
    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    return successResponse(sanitizeDocument(lead))
  } catch (error) {
    console.error('Lead GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch lead', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const leadId = params.leadId
    const body = await request.json()
    const leadsCollection = await getCollection(Collections.LEADS)

    const result = await leadsCollection.updateOne(
      { id: leadId, clientId: user.clientId },
      { $set: { ...body, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return errorResponse('Lead not found', 404)
    }

    return successResponse({ message: 'Lead updated successfully' })
  } catch (error) {
    console.error('Lead PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update lead', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const leadId = params.leadId
    const leadsCollection = await getCollection(Collections.LEADS)

    const result = await leadsCollection.deleteOne({ id: leadId, clientId: user.clientId })

    if (result.deletedCount === 0) {
      return errorResponse('Lead not found', 404)
    }

    return successResponse({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Lead DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete lead', 500, error.message)
  }
}
