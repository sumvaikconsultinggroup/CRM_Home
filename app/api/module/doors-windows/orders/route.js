import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('doors_windows_orders')

    if (id) {
      const order = await orders.findOne({ id })
      if (!order) return errorResponse('Order not found', 404)
      return successResponse(sanitizeDocument(order))
    }

    const query = { isActive: true }
    if (status) query.status = status

    const orderList = await orders.find(query).sort({ createdAt: -1 }).toArray()
    return successResponse({ orders: sanitizeDocuments(orderList) })
  } catch (error) {
    console.error('Doors-Windows Orders GET Error:', error)
    return errorResponse('Failed to fetch orders', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('doors_windows_orders')
    const counters = db.collection('counters')

    const counter = await counters.findOneAndUpdate(
      { _id: 'doors_windows_order' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
    const orderNumber = `DW-ORD-${String(counter.seq || 1).padStart(5, '0')}`

    const now = new Date().toISOString()

    const order = {
      id: uuidv4(),
      orderNumber,
      quotationId: body.quotationId,
      customer: body.customer || {},
      deliveryAddress: body.deliveryAddress || {},
      lineItems: body.lineItems || [],
      grandTotal: body.grandTotal || 0,
      paidAmount: body.paidAmount || 0,
      status: 'confirmed',
      expectedDelivery: body.expectedDelivery,
      productionStatus: 'pending',
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await orders.insertOne(order)
    return successResponse(sanitizeDocument(order), 201)
  } catch (error) {
    console.error('Doors-Windows Orders POST Error:', error)
    return errorResponse('Failed to create order', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Order ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const orders = db.collection('doors_windows_orders')

    updateData.updatedAt = new Date().toISOString()

    const result = await orders.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Order not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Orders PUT Error:', error)
    return errorResponse('Failed to update order', 500, error.message)
  }
}
