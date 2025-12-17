import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch challans
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const dispatchId = searchParams.get('dispatchId')
    const invoiceId = searchParams.get('invoiceId')
    const type = searchParams.get('type') // delivery, dispatch_note

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')

    // Get single challan by ID
    if (id) {
      const challan = await challans.findOne({ id })
      if (!challan) return errorResponse('Challan not found', 404)
      return successResponse(sanitizeDocument(challan))
    }

    // Get challan by dispatch
    if (dispatchId) {
      const challan = await challans.findOne({ dispatchId })
      return successResponse(sanitizeDocument(challan))
    }

    // Get challan by invoice
    if (invoiceId) {
      const challanList = await challans.find({ invoiceId }).toArray()
      return successResponse({ challans: sanitizeDocuments(challanList) })
    }

    // Build query
    const query = {}
    if (type) query.type = type

    const allChallans = await challans.find(query).sort({ createdAt: -1 }).toArray()

    return successResponse({
      challans: sanitizeDocuments(allChallans)
    })
  } catch (error) {
    console.error('Challans GET Error:', error)
    return errorResponse('Failed to fetch challans', 500, error.message)
  }
}

// PUT - Update challan (sign, mark delivered)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, data } = body

    if (!id) {
      return errorResponse('Challan ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')

    const challan = await challans.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)

    const now = new Date().toISOString()
    const updateData = { updatedAt: now }

    switch (action) {
      case 'sign':
        if (!data?.receiverName || !data?.signature) {
          return errorResponse('Receiver name and signature are required', 400)
        }
        updateData.signedByReceiver = true
        updateData.receiverName = data.receiverName
        updateData.receiverPhone = data.receiverPhone
        updateData.receiverSignature = data.signature
        updateData.signedAt = now
        updateData.status = 'signed'
        break

      case 'mark_delivered':
        updateData.status = 'delivered'
        updateData.deliveredAt = now
        updateData.deliveryPhoto = data?.deliveryPhoto
        updateData.deliveryNotes = data?.notes
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    await challans.updateOne({ id }, { $set: updateData })

    const updatedChallan = await challans.findOne({ id })

    return successResponse({
      challan: sanitizeDocument(updatedChallan),
      message: 'Challan updated successfully'
    })
  } catch (error) {
    console.error('Challans PUT Error:', error)
    return errorResponse('Failed to update challan', 500, error.message)
  }
}
