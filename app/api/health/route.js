import { seedDatabase } from '@/lib/db/seed'
import { successResponse, errorResponse } from '@/lib/utils/response'

export async function GET() {
  try {
    await seedDatabase()
    return successResponse({
      status: 'healthy',
      message: 'BuildCRM API v2.0',
      timestamp: new Date().toISOString(),
      features: [
        'Multi-tenant Architecture',
        'Clerk Authentication',
        'Industry Modules',
        'White Labeling',
        'Advanced Analytics'
      ]
    })
  } catch (error) {
    return errorResponse('Health check failed', 500, error.message)
  }
}
