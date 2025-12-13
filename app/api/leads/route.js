import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { validateLeadData } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit')) || 100

    // Get client-specific database
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    // No need to filter by clientId - the entire database is for this client
    const filter = {}
    if (status) filter.status = status
    if (source) filter.source = source

    const leads = await leadsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return successResponse(sanitizeDocuments(leads))
  } catch (error) {
    console.error('Leads GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch leads', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const validation = validateLeadData(body)
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    // Get client-specific database
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const lead = {
      id: uuidv4(),
      clientId: user.clientId, // Keep for reference
      ...body,
      status: body.status || 'new',
      value: body.value || 0,
      probability: body.probability || 50,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await leadsCollection.insertOne(lead)

    return successResponse(sanitizeDocument(lead), 201)
  } catch (error) {
    console.error('Leads POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create lead', 500, error.message)
  }
}
