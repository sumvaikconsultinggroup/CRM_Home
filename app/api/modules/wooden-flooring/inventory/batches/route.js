import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch batches
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const batchNumber = searchParams.get('batchNumber')
    const expiringSoon = searchParams.get('expiringSoon') === 'true'
    const expired = searchParams.get('expired') === 'true'
    const hasStock = searchParams.get('hasStock') !== 'false' // Default to only showing batches with stock

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const batchCollection = db.collection('wf_inventory_batches')

    // Build query
    let query = {}
    if (warehouseId && warehouseId !== 'all') query.warehouseId = warehouseId
    if (productId) query.productId = productId
    if (batchNumber) query.batchNumber = { $regex: batchNumber, $options: 'i' }
    if (hasStock) query.quantity = { $gt: 0 }

    // Date filters
    const now = new Date()
    if (expired) {
      query.expiryDate = { $lt: now }
    } else if (expiringSoon) {
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      query.expiryDate = { $gte: now, $lte: thirtyDaysLater }
    }

    const batches = await batchCollection.find(query).sort({ receivedDate: 1 }).toArray()

    // Enrich with status
    for (const batch of batches) {
      if (batch.expiryDate) {
        const expiryDate = new Date(batch.expiryDate)
        if (expiryDate < now) {
          batch.expiryStatus = 'expired'
        } else if (expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          batch.expiryStatus = 'expiring_soon'
        } else {
          batch.expiryStatus = 'valid'
        }
        batch.daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
      }

      // Calculate age
      if (batch.receivedDate) {
        batch.ageInDays = Math.floor((now - new Date(batch.receivedDate)) / (1000 * 60 * 60 * 24))
      }
    }

    // Summary
    const summary = {
      totalBatches: batches.length,
      totalQuantity: batches.reduce((sum, b) => sum + (b.quantity || 0), 0),
      totalValue: batches.reduce((sum, b) => sum + ((b.quantity || 0) * (b.unitCost || 0)), 0),
      expiredCount: batches.filter(b => b.expiryStatus === 'expired').length,
      expiringSoonCount: batches.filter(b => b.expiryStatus === 'expiring_soon').length
    }

    return successResponse({ batches: sanitizeDocuments(batches), summary })
  } catch (error) {
    console.error('Batch GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch batches', 500, error.message)
  }
}

// PUT - Update batch (mainly for adjustments or corrections)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, expiryDate, manufacturingDate, notes, status } = body

    if (!id) return errorResponse('Batch ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const batchCollection = db.collection('wf_inventory_batches')

    const updates = { updatedAt: new Date() }
    if (expiryDate !== undefined) updates.expiryDate = expiryDate ? new Date(expiryDate) : null
    if (manufacturingDate !== undefined) updates.manufacturingDate = manufacturingDate ? new Date(manufacturingDate) : null
    if (notes !== undefined) updates.notes = notes
    if (status !== undefined) updates.status = status

    const result = await batchCollection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Batch not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Batch PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update batch', 500, error.message)
  }
}
