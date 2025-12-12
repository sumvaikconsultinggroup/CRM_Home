import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const sourcesCollection = await getCollection('lead_sources')
    
    // Get client's custom sources
    const customSources = await sourcesCollection
      .find({ clientId: user.clientId })
      .toArray()

    // Default sources
    const defaultSources = [
      { id: 'website', name: 'Website', isDefault: true },
      { id: 'referral', name: 'Referral', isDefault: true },
      { id: 'social_media', name: 'Social Media', isDefault: true },
      { id: 'cold_call', name: 'Cold Call', isDefault: true },
      { id: 'email', name: 'Email Campaign', isDefault: true },
      { id: 'import', name: 'Import', isDefault: true },
      { id: 'other', name: 'Other', isDefault: true }
    ]

    return successResponse({
      sources: [...defaultSources, ...sanitizeDocuments(customSources)]
    })
  } catch (error) {
    console.error('Lead Sources GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch lead sources', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { name } = body

    if (!name) {
      return errorResponse('Source name is required', 400)
    }

    const sourcesCollection = await getCollection('lead_sources')

    const source = {
      id: uuidv4(),
      clientId: user.clientId,
      name,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await sourcesCollection.insertOne(source)

    return successResponse(sanitizeDocument(source), 201)
  } catch (error) {
    console.error('Lead Sources POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create lead source', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('id')

    if (!sourceId) {
      return errorResponse('Source ID is required', 400)
    }

    const sourcesCollection = await getCollection('lead_sources')

    await sourcesCollection.deleteOne({
      id: sourceId,
      clientId: user.clientId
    })

    return successResponse({ message: 'Lead source deleted' })
  } catch (error) {
    console.error('Lead Sources DELETE Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete lead source', 500, error.message)
  }
}
