import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch colors/shades
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const shadeCardId = searchParams.get('shadeCardId')
    const productId = searchParams.get('productId')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const colors = db.collection('paints_colors')

    // Single color fetch
    if (id) {
      const color = await colors.findOne({ id })
      if (!color) {
        return errorResponse('Color not found', 404)
      }
      return successResponse({ color: sanitizeDocument(color) })
    }

    // Build filter
    const filter = {}
    if (shadeCardId) filter.shadeCardId = shadeCardId
    if (productId) filter.productIds = productId
    if (isActive !== null && isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { colorFamily: { $regex: search, $options: 'i' } }
      ]
    }

    const result = await colors.find(filter).sort({ name: 1 }).toArray()

    return successResponse({ colors: sanitizeDocuments(result) })
  } catch (error) {
    console.error('Colors GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch colors', 500, error.message)
  }
}

// POST - Create color
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      name,
      code,
      hex,
      rgb,
      colorFamily,
      shadeCardId,
      productIds,
      tintingFormula,
      availability,
      image
    } = body

    if (!name || !code) {
      return errorResponse('Color name and code are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const colors = db.collection('paints_colors')

    // Check for duplicate code
    const existing = await colors.findOne({ code })
    if (existing) {
      return errorResponse('Color code already exists', 400)
    }

    const now = new Date().toISOString()
    const color = {
      id: uuidv4(),
      name,
      code,
      hex: hex || '#FFFFFF',
      rgb: rgb || { r: 255, g: 255, b: 255 },
      colorFamily: colorFamily || 'neutral',
      shadeCardId: shadeCardId || null,
      productIds: productIds || [],
      
      // Tinting formula (if applicable)
      tintingFormula: tintingFormula || null,
      
      // Availability status
      availability: availability || 'available', // available, limited, discontinued
      
      // Preview image
      image: image || null,
      
      // Metadata
      clientId: user.clientId,
      isActive: true,
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await colors.insertOne(color)

    return successResponse({ color: sanitizeDocument(color) }, 201)
  } catch (error) {
    console.error('Colors POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create color', 500, error.message)
  }
}

// PUT - Update color
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Color ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const colors = db.collection('paints_colors')

    const existing = await colors.findOne({ id })
    if (!existing) {
      return errorResponse('Color not found', 404)
    }

    // Check for duplicate code if updating code
    if (updateData.code && updateData.code !== existing.code) {
      const duplicate = await colors.findOne({ code: updateData.code })
      if (duplicate) {
        return errorResponse('Color code already exists', 400)
      }
    }

    const now = new Date().toISOString()
    await colors.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now, updatedBy: user.id } }
    )

    const updated = await colors.findOne({ id })
    return successResponse({ color: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Colors PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update color', 500, error.message)
  }
}

// DELETE - Delete color
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Color ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const colors = db.collection('paints_colors')

    await colors.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Color deleted' })
  } catch (error) {
    console.error('Colors DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete color', 500, error.message)
  }
}
