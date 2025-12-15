import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get delivery receipts
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const receiptId = searchParams.get('id')
    const dispatchId = searchParams.get('dispatchId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const receiptCollection = db.collection('delivery_receipts')

    // Single receipt
    if (receiptId) {
      const receipt = await receiptCollection.findOne({ id: receiptId, clientId: user.clientId })
      if (!receipt) {
        return errorResponse('Receipt not found', 404)
      }
      return successResponse({ receipt: sanitizeDocument(receipt) })
    }

    // Query receipts
    let query = { clientId: user.clientId }
    if (dispatchId) query.dispatchId = dispatchId
    if (fromDate || toDate) {
      query.deliveredAt = {}
      if (fromDate) query.deliveredAt.$gte = new Date(fromDate)
      if (toDate) query.deliveredAt.$lte = new Date(toDate)
    }

    const receipts = await receiptCollection.find(query).sort({ deliveredAt: -1 }).toArray()

    // Stats
    const stats = {
      total: receipts.length,
      goodCondition: receipts.filter(r => r.deliveryCondition === 'good').length,
      damaged: receipts.filter(r => r.deliveryCondition === 'damaged').length,
      partial: receipts.filter(r => r.deliveryCondition === 'partial').length,
      totalValue: receipts.reduce((sum, r) => sum + (r.totalValue || 0), 0)
    }

    return successResponse({ 
      receipts: sanitizeDocuments(receipts),
      stats
    })
  } catch (error) {
    console.error('Receipt GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch receipts', 500, error.message)
  }
}
