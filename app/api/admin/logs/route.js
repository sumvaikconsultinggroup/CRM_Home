import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get admin activity logs
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)
    requireSuperAdmin(user)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const action = searchParams.get('action')

    const mainDb = await getMainDb()
    const logsCollection = mainDb.collection('admin_logs')
    
    let query = {}
    if (action) {
      query.action = action
    }

    const total = await logsCollection.countDocuments(query)
    const logs = await logsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return successResponse({
      logs: sanitizeDocuments(logs),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Logs GET Error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Super admin access required') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch logs', 500, error.message)
  }
}
