import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const clientsCollection = await getCollection(Collections.CLIENTS)
    
    // Find the highest client code number
    const lastClient = await clientsCollection
      .find({ clientCode: { $exists: true, $regex: /^CL-\d+$/ } })
      .sort({ clientCode: -1 })
      .limit(1)
      .toArray()

    let nextNumber = 1
    if (lastClient.length > 0 && lastClient[0].clientCode) {
      const match = lastClient[0].clientCode.match(/CL-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const nextClientCode = `CL-${String(nextNumber).padStart(3, '0')}`
    return successResponse({ nextClientCode })
  } catch (error) {
    console.error('Next Client ID Error:', error)
    return errorResponse('Failed to get next client ID', 500)
  }
}
