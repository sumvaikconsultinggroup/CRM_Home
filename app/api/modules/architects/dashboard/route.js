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

    const collection = await getCollection('architects_projects')
    const projects = await collection.find({ clientId: user.clientId }).toArray()

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'in_progress').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      revenue: projects.reduce((sum, p) => sum + (p.value || 0), 0)
    }

    return successResponse(stats)
  } catch (error) {
    console.error('Architects Dashboard Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch dashboard stats', 500, error.message)
  }
}
