import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const mainDb = await getMainDb()
    const modulesCollection = mainDb.collection('modules')
    const clientsCollection = mainDb.collection('clients')

    const modules = await modulesCollection.find({}).toArray()
    
    // Get usage count for each module
    const modulesWithUsage = await Promise.all(modules.map(async (module) => {
      const usageCount = await clientsCollection.countDocuments({ modules: module.id })
      return {
        ...sanitizeDocument(module),
        usageCount
      }
    }))

    return successResponse(modulesWithUsage)
  } catch (error) {
    console.error('Admin Modules API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch modules', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { name, description, price, icon, category, features } = body

    if (!name) {
      return errorResponse('Module name is required', 400)
    }

    const mainDb = await getMainDb()
    const modulesCollection = mainDb.collection('modules')

    const newModule = {
      id: uuidv4(),
      name,
      description: description || '',
      price: price || 999,
      icon: icon || 'Package',
      category: category || 'general',
      features: features || [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await modulesCollection.insertOne(newModule)

    return successResponse(sanitizeDocument(newModule), 201)
  } catch (error) {
    console.error('Admin Module Create API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create module', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Module ID is required', 400)
    }

    const mainDb = await getMainDb()
    const modulesCollection = mainDb.collection('modules')

    await modulesCollection.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: new Date() } }
    )

    return successResponse({ message: 'Module updated successfully' })
  } catch (error) {
    console.error('Admin Module Update API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update module', 500, error.message)
  }
}
