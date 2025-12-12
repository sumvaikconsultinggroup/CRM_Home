import { NextResponse } from 'next/server'
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

    const collection = await getCollection('real_estate_properties')
    const properties = await collection.find({ clientId: user.clientId }).toArray()
    
    return successResponse(sanitizeDocuments(properties))
  } catch (error) {
    console.error('Real Estate Properties GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch properties', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const collection = await getCollection('real_estate_properties')

    const newProperty = {
      id: uuidv4(),
      clientId: user.clientId,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(newProperty)
    return successResponse(sanitizeDocument(newProperty), 201)
  } catch (error) {
    console.error('Real Estate Properties POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create property', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Property ID is required', 400)
    }

    const collection = await getCollection('real_estate_properties')
    await collection.updateOne(
      { id, clientId: user.clientId },
      { $set: { ...updateData, updatedAt: new Date() } }
    )

    return successResponse({ message: 'Property updated successfully' })
  } catch (error) {
    console.error('Real Estate Properties PUT Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update property', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Property ID is required', 400)
    }

    const collection = await getCollection('real_estate_properties')
    await collection.deleteOne({ id, clientId: user.clientId })

    return successResponse({ message: 'Property deleted successfully' })
  } catch (error) {
    console.error('Real Estate Properties DELETE Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete property', 500, error.message)
  }
}
