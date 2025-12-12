import { getCollection, Collections } from '@/lib/db/mongodb'
import { seedDatabase } from '@/lib/db/seed'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET() {
  try {
    await seedDatabase()
    const modulesCollection = await getCollection(Collections.MODULES)
    const modules = await modulesCollection.find({ active: true }).toArray()
    return successResponse(sanitizeDocuments(modules))
  } catch (error) {
    console.error('Modules API Error:', error)
    return errorResponse('Failed to fetch modules', 500)
  }
}
