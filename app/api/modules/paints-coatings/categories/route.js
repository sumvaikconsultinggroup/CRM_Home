import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Default categories structure
const DEFAULT_CATEGORIES = [
  {
    id: 'interior',
    name: 'Interior Paints',
    icon: 'home',
    color: '#3B82F6',
    children: [
      { id: 'interior_premium', name: 'Premium Emulsion', parentId: 'interior' },
      { id: 'interior_economy', name: 'Economy Emulsion', parentId: 'interior' },
      { id: 'interior_luxury', name: 'Luxury Emulsion', parentId: 'interior' },
      { id: 'interior_distemper', name: 'Distemper', parentId: 'interior' }
    ]
  },
  {
    id: 'exterior',
    name: 'Exterior Paints',
    icon: 'building',
    color: '#10B981',
    children: [
      { id: 'exterior_weather', name: 'Weather Shield', parentId: 'exterior' },
      { id: 'exterior_textured', name: 'Textured Finish', parentId: 'exterior' },
      { id: 'exterior_elastomeric', name: 'Elastomeric', parentId: 'exterior' }
    ]
  },
  {
    id: 'primers',
    name: 'Primers & Sealers',
    icon: 'layers',
    color: '#8B5CF6',
    children: [
      { id: 'primer_interior', name: 'Interior Primer', parentId: 'primers' },
      { id: 'primer_exterior', name: 'Exterior Primer', parentId: 'primers' },
      { id: 'primer_metal', name: 'Metal Primer', parentId: 'primers' },
      { id: 'primer_wood', name: 'Wood Primer', parentId: 'primers' },
      { id: 'sealer', name: 'Sealers', parentId: 'primers' }
    ]
  },
  {
    id: 'putty',
    name: 'Putty & Fillers',
    icon: 'square',
    color: '#F59E0B',
    children: [
      { id: 'wall_putty', name: 'Wall Putty', parentId: 'putty' },
      { id: 'acrylic_putty', name: 'Acrylic Putty', parentId: 'putty' },
      { id: 'crack_filler', name: 'Crack Filler', parentId: 'putty' }
    ]
  },
  {
    id: 'wood',
    name: 'Wood Finishes',
    icon: 'tree',
    color: '#78350F',
    children: [
      { id: 'wood_polish', name: 'Wood Polish', parentId: 'wood' },
      { id: 'wood_stain', name: 'Wood Stain', parentId: 'wood' },
      { id: 'wood_varnish', name: 'Varnish', parentId: 'wood' },
      { id: 'pu_finish', name: 'PU Finish', parentId: 'wood' }
    ]
  },
  {
    id: 'specialty',
    name: 'Specialty Coatings',
    icon: 'sparkles',
    color: '#EC4899',
    children: [
      { id: 'epoxy', name: 'Epoxy Coatings', parentId: 'specialty' },
      { id: 'microcement', name: 'Microcement', parentId: 'specialty' },
      { id: 'metallic', name: 'Metallic Finishes', parentId: 'specialty' },
      { id: 'texture', name: 'Texture Paints', parentId: 'specialty' },
      { id: 'waterproofing', name: 'Waterproofing', parentId: 'specialty' }
    ]
  },
  {
    id: 'industrial',
    name: 'Industrial Coatings',
    icon: 'factory',
    color: '#6B7280',
    children: [
      { id: 'floor_coating', name: 'Floor Coatings', parentId: 'industrial' },
      { id: 'protective', name: 'Protective Coatings', parentId: 'industrial' },
      { id: 'anti_corrosive', name: 'Anti-Corrosive', parentId: 'industrial' }
    ]
  }
]

// GET - Fetch categories
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const tree = searchParams.get('tree') === 'true'
    const parentId = searchParams.get('parentId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('paints_categories')

    let result = await categories.find({}).toArray()

    // If no custom categories, return defaults
    if (result.length === 0) {
      // Flatten default categories for storage
      const flatCategories = []
      DEFAULT_CATEGORIES.forEach(cat => {
        flatCategories.push({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          parentId: null,
          isDefault: true
        })
        if (cat.children) {
          cat.children.forEach(child => {
            flatCategories.push({
              id: child.id,
              name: child.name,
              parentId: child.parentId,
              isDefault: true
            })
          })
        }
      })
      result = flatCategories
    }

    // Filter by parent if specified
    if (parentId) {
      result = result.filter(c => c.parentId === parentId)
    }

    // Build tree structure if requested
    if (tree) {
      const rootCategories = result.filter(c => !c.parentId)
      const treeResult = rootCategories.map(root => ({
        ...root,
        children: result.filter(c => c.parentId === root.id)
      }))
      return successResponse({ categories: treeResult })
    }

    return successResponse({ categories: sanitizeDocuments(result) })
  } catch (error) {
    console.error('Categories GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch categories', 500, error.message)
  }
}

// POST - Create category
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { name, parentId, icon, color, description } = body

    if (!name) {
      return errorResponse('Category name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('paints_categories')

    const now = new Date().toISOString()
    const category = {
      id: uuidv4(),
      name,
      parentId: parentId || null,
      icon: icon || 'folder',
      color: color || '#6B7280',
      description: description || '',
      clientId: user.clientId,
      isActive: true,
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await categories.insertOne(category)

    return successResponse({ category: sanitizeDocument(category) }, 201)
  } catch (error) {
    console.error('Categories POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create category', 500, error.message)
  }
}

// PUT - Update category
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Category ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('paints_categories')

    const now = new Date().toISOString()
    await categories.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now, updatedBy: user.id } }
    )

    return successResponse({ message: 'Category updated' })
  } catch (error) {
    console.error('Categories PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update category', 500, error.message)
  }
}

// DELETE - Delete category
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Category ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('paints_categories')

    // Check for children
    const children = await categories.countDocuments({ parentId: id })
    if (children > 0) {
      return errorResponse('Cannot delete category with subcategories', 400)
    }

    // Check for products using this category
    const products = db.collection('paints_products')
    const productCount = await products.countDocuments({ categoryId: id })
    if (productCount > 0) {
      return errorResponse(`Cannot delete category with ${productCount} products`, 400)
    }

    await categories.deleteOne({ id })

    return successResponse({ message: 'Category deleted' })
  } catch (error) {
    console.error('Categories DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete category', 500, error.message)
  }
}
