import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const collection = await getCollection('real_estate_properties')
    const properties = await collection.find({ clientId: user.clientId }).toArray()

    const stats = {
      totalProperties: properties.length,
      activeListings: properties.filter(p => p.status === 'active').length,
      soldProperties: properties.filter(p => p.status === 'sold').length,
      totalValue: properties.reduce((sum, p) => sum + (p.price || 0), 0)
    }

    return successResponse(stats)
  } catch (error) {
    console.error('Real Estate Dashboard Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch dashboard stats', 500, error.message)
  }
}
