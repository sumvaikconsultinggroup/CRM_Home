import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate SKU
const generateSKU = (categoryCode, name) => {
  const prefix = categoryCode ? categoryCode.substring(0, 3).toUpperCase() : 'PRD'
  const namePart = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${namePart}-${random}`
}

// GET - Fetch products with filters
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const categoryId = searchParams.get('categoryId')
    const familyId = searchParams.get('familyId')
    const finishType = searchParams.get('finishType')
    const baseType = searchParams.get('baseType')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortDir = searchParams.get('sortDir') || 'desc'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('paints_products')

    // Single product fetch
    if (id) {
      const product = await products.findOne({ id })
      if (!product) {
        return errorResponse('Product not found', 404)
      }
      return successResponse({ product: sanitizeDocument(product) })
    }

    // Build filter
    const filter = {}
    if (categoryId) filter.categoryId = categoryId
    if (familyId) filter.familyId = familyId
    if (finishType) filter.finishType = finishType
    if (baseType) filter.baseType = baseType
    if (isActive !== null && isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    // Get total count
    const total = await products.countDocuments(filter)

    // Fetch products with pagination
    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 }

    const result = await products
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()

    return successResponse({
      products: sanitizeDocuments(result),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Products GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// POST - Create product
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      name,
      categoryId,
      familyId,
      description,
      finishType,
      baseType,
      packSizes,
      colors,
      technicalProperties,
      tintingSupported,
      tintingFormulas,
      documents,
      images,
      pricing,
      manufacturer,
      brand,
      warranty
    } = body

    if (!name) {
      return errorResponse('Product name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('paints_products')

    const now = new Date().toISOString()
    const sku = generateSKU(categoryId, name)

    const product = {
      id: uuidv4(),
      sku,
      name,
      categoryId: categoryId || null,
      familyId: familyId || null,
      description: description || '',
      finishType: finishType || 'matte',
      baseType: baseType || 'water_based',
      
      // Pack sizes with individual pricing
      packSizes: packSizes || [
        { size: '1L', unit: 'litre', mrp: 0, dealerPrice: 0, projectPrice: 0 },
        { size: '4L', unit: 'litre', mrp: 0, dealerPrice: 0, projectPrice: 0 },
        { size: '10L', unit: 'litre', mrp: 0, dealerPrice: 0, projectPrice: 0 },
        { size: '20L', unit: 'litre', mrp: 0, dealerPrice: 0, projectPrice: 0 }
      ],
      
      // Colors available for this product
      colors: colors || [],
      
      // Technical specifications
      technicalProperties: technicalProperties || {
        coverage: null, // sqft per litre per coat
        recommendedCoats: 2,
        dryingTime: null, // minutes
        recoatTime: null, // hours
        voc: null, // g/L
        washability: null, // cycles
        warrantyYears: 0,
        applicationMethods: ['brush', 'roller'],
        surfaceCompatibility: [],
        dilution: null // percentage
      },
      
      // Tinting support
      tintingSupported: tintingSupported || false,
      tintingFormulas: tintingFormulas || [],
      
      // Documents (TDS, MSDS, Warranty)
      documents: documents || {
        tds: null, // Technical Data Sheet URL
        msds: null, // Material Safety Data Sheet URL
        warranty: null, // Warranty document URL
        brochure: null
      },
      
      // Images
      images: images || [],
      
      // Pricing tiers
      pricing: pricing || {
        retailMarkup: 0,
        dealerDiscount: 0,
        distributorDiscount: 0,
        projectDiscount: 0
      },
      
      // Brand/Manufacturer info
      manufacturer: manufacturer || '',
      brand: brand || '',
      warranty: warranty || '',
      
      // Metadata
      clientId: user.clientId,
      isActive: true,
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await products.insertOne(product)

    return successResponse({ product: sanitizeDocument(product) }, 201)
  } catch (error) {
    console.error('Products POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create product', 500, error.message)
  }
}

// PUT - Update product
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Product ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('paints_products')

    const existing = await products.findOne({ id })
    if (!existing) {
      return errorResponse('Product not found', 404)
    }

    const now = new Date().toISOString()
    await products.updateOne(
      { id },
      { 
        $set: { 
          ...updateData, 
          updatedAt: now,
          updatedBy: user.id
        }
      }
    )

    const updated = await products.findOne({ id })
    return successResponse({ product: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Products PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update product', 500, error.message)
  }
}

// DELETE - Delete product
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const softDelete = searchParams.get('soft') !== 'false'

    if (!id) {
      return errorResponse('Product ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('paints_products')

    if (softDelete) {
      await products.updateOne(
        { id },
        { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
      )
    } else {
      await products.deleteOne({ id })
    }

    return successResponse({ message: 'Product deleted' })
  } catch (error) {
    console.error('Products DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
