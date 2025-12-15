import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get delivery challans
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const challanId = searchParams.get('id')
    const dispatchId = searchParams.get('dispatchId')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challanCollection = db.collection('delivery_challans')

    // Single challan
    if (challanId) {
      const challan = await challanCollection.findOne({ id: challanId, clientId: user.clientId })
      if (!challan) {
        return errorResponse('Challan not found', 404)
      }
      return successResponse({ challan: sanitizeDocument(challan) })
    }

    // Query challans
    let query = { clientId: user.clientId }
    if (dispatchId) query.dispatchId = dispatchId
    if (status) query.status = status
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = new Date(fromDate)
      if (toDate) query.createdAt.$lte = new Date(toDate)
    }

    const challans = await challanCollection.find(query).sort({ createdAt: -1 }).toArray()

    // Stats
    const stats = {
      total: challans.length,
      generated: challans.filter(c => c.status === 'generated').length,
      dispatched: challans.filter(c => c.status === 'dispatched').length,
      delivered: challans.filter(c => c.status === 'delivered').length,
      totalValue: challans.reduce((sum, c) => sum + (c.totalValue || 0), 0)
    }

    return successResponse({ 
      challans: sanitizeDocuments(challans),
      stats
    })
  } catch (error) {
    console.error('Challan GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch challans', 500, error.message)
  }
}
