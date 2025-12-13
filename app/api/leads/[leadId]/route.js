import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { leadId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const lead = await leadsCollection.findOne({ id: leadId })

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

    const { leadId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const existingLead = await leadsCollection.findOne({ id: leadId })
    if (!existingLead) {
      return errorResponse('Lead not found', 404)
    }

    const updatedLead = {
      ...existingLead,
      ...body,
      id: leadId, // Preserve ID
      updatedAt: new Date()
    }

    await leadsCollection.updateOne(
      { id: leadId },
      { $set: updatedLead }
    )

    return successResponse(sanitizeDocument(updatedLead))
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

    const { leadId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const result = await leadsCollection.deleteOne({ id: leadId })

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
