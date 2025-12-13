import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch catalog items (systems, profiles, glass, hardware, accessories)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // system, profile, glass, hardware, accessory, finish
    const category = searchParams.get('category') // aluminium, upvc, wood, steel
    const subCategory = searchParams.get('subCategory') // sliding, casement, etc.

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    let query = { active: true }
    if (type) query.type = type
    if (category) query.category = category
    if (subCategory) query.subCategory = subCategory

    // Fetch from respective collections based on type
    const collectionName = type ? `dw_catalog_${type}` : 'dw_catalog_systems'
    const collection = db.collection(collectionName)
    const items = await collection.find(query).sort({ name: 1 }).toArray()

    // Also fetch stats
    const stats = {
      totalItems: items.length,
      byCategory: {},
      byType: {}
    }

    items.forEach(item => {
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1
    })

    return successResponse({ items: sanitizeDocuments(items), stats })
  } catch (error) {
    console.error('DW Catalog GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch catalog', 500, error.message)
  }
}

// POST - Create catalog item
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const type = body.type || 'system'
    const collectionName = `dw_catalog_${type}`
    const collection = db.collection(collectionName)

    const item = {
      id: uuidv4(),
      clientId: user.clientId,
      type: body.type || 'system',
      sku: body.sku || `DW-${type.toUpperCase()}-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      
      // Category & Classification
      category: body.category || 'aluminium', // aluminium, upvc, wood, steel
      subCategory: body.subCategory || 'sliding', // sliding, casement, tilt-turn, fixed, folding, french, lift-slide, partition
      productFamily: body.productFamily || 'windows', // windows, doors
      
      // For Systems/Profiles
      seriesName: body.seriesName || '', // AL-100, uPVC-70mm
      profileType: body.profileType || '', // frame, sash, mullion, transom, bead, threshold
      dimensions: body.dimensions || {},
      weight: parseFloat(body.weight) || 0,
      
      // For Glass
      glassType: body.glassType || '', // single, double, DGU
      thickness: body.thickness || '',
      tint: body.tint || '',
      coating: body.coating || '', // Low-E, acoustic
      
      // For Hardware
      hardwareType: body.hardwareType || '', // handle, rollers, hinges, espagnolette, lock, stopper, track, friction-stay
      finish: body.finish || '', // anodized, powder-coat, wood-finish, laminate
      ralCode: body.ralCode || '',
      
      // Specifications
      specs: body.specs || {},
      uom: body.uom || 'piece',
      warranty: body.warranty || '10 years',
      
      // Compliance
      compliance: {
        windLoad: body.compliance?.windLoad || '',
        waterTightness: body.compliance?.waterTightness || '',
        acousticRating: body.compliance?.acousticRating || '',
        fireRating: body.compliance?.fireRating || ''
      },
      
      // Pricing
      costPrice: parseFloat(body.costPrice) || 0,
      sellingPrice: parseFloat(body.sellingPrice) || 0,
      mrp: parseFloat(body.mrp) || 0,
      pricePerSqft: parseFloat(body.pricePerSqft) || 0,
      pricePerSqm: parseFloat(body.pricePerSqm) || 0,
      gstRate: parseFloat(body.gstRate) || 18,
      
      // Price Lists
      priceLists: body.priceLists || {
        retail: 0,
        dealer: 0,
        project: 0,
        builder: 0,
        architect: 0,
        export: 0
      },
      
      // Media
      images: body.images || [],
      documents: body.documents || [],
      
      // Inventory tracking
      quantity: parseFloat(body.quantity) || 0,
      reorderLevel: parseFloat(body.reorderLevel) || 10,
      vendorId: body.vendorId || null,
      
      active: true,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(item)
    return successResponse(sanitizeDocument(item), 201)
  } catch (error) {
    console.error('DW Catalog POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create catalog item', 500, error.message)
  }
}

// PUT - Update catalog item
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, type, ...updates } = body

    if (!id) return errorResponse('Item ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collectionName = `dw_catalog_${type || 'system'}`
    const collection = db.collection(collectionName)
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Item not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Catalog PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update catalog item', 500, error.message)
  }
}

// DELETE - Delete catalog item
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'system'

    if (!id) return errorResponse('Item ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collectionName = `dw_catalog_${type}`
    const collection = db.collection(collectionName)
    
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Item not found', 404)
    return successResponse({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('DW Catalog DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete catalog item', 500, error.message)
  }
}
