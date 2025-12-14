import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // window, door
    const category = searchParams.get('category')
    const frameMaterial = searchParams.get('frameMaterial')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('doors_windows_products')

    if (id) {
      const product = await products.findOne({ id })
      if (!product) return errorResponse('Product not found', 404)
      return successResponse(sanitizeDocument(product))
    }

    const query = { isActive: true }
    if (type) query.productType = type
    if (category) query.category = category
    if (frameMaterial) query.frameMaterial = frameMaterial

    const productList = await products.find(query).sort({ sortOrder: 1, createdAt: -1 }).toArray()
    return successResponse({ products: sanitizeDocuments(productList) })
  } catch (error) {
    console.error('Doors-Windows Products GET Error:', error)
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('doors_windows_products')

    const now = new Date().toISOString()
    const productId = uuidv4()

    const product = {
      id: productId,
      sku: body.sku || `DW-${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      description: body.description || '',
      productType: body.productType, // window, door
      category: body.category, // casement, sliding, fixed, etc.
      
      // Frame specifications
      frameMaterial: body.frameMaterial, // upvc, aluminum, wood
      frameProfile: body.frameProfile, // profile series
      profileColor: body.profileColor || 'white',
      profileColorInside: body.profileColorInside,
      profileColorOutside: body.profileColorOutside,
      
      // Glass specifications
      glassType: body.glassType || 'clear',
      glassThickness: body.glassThickness || 5,
      glassColor: body.glassColor,
      glassBrand: body.glassBrand,
      
      // Configuration
      configuration: body.configuration || {
        panels: 1,
        openingType: 'inward',
        openingDirection: 'left',
        hasGrill: false,
        hasMesh: false,
        hasShutter: false
      },
      
      // Dimensions (default/standard)
      standardDimensions: body.standardDimensions || {
        width: 1200,
        height: 1500,
        unit: 'mm'
      },
      
      // Dimension limits
      minWidth: body.minWidth || 300,
      maxWidth: body.maxWidth || 6000,
      minHeight: body.minHeight || 300,
      maxHeight: body.maxHeight || 4000,
      
      // Pricing
      pricePerSqft: body.pricePerSqft || 0,
      basePrice: body.basePrice || 0,
      laborPerSqft: body.laborPerSqft || 150,
      
      // Hardware included
      includedHardware: body.includedHardware || [],
      
      // Images
      images: body.images || [],
      thumbnail: body.thumbnail || null,
      drawing3d: body.drawing3d || null,
      
      // Features
      features: body.features || [],
      specifications: body.specifications || {},
      
      // Status
      isActive: true,
      sortOrder: body.sortOrder || 0,
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await products.insertOne(product)
    return successResponse(sanitizeDocument(product), 201)
  } catch (error) {
    console.error('Doors-Windows Products POST Error:', error)
    return errorResponse('Failed to create product', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Product ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('doors_windows_products')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await products.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Product not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Products PUT Error:', error)
    return errorResponse('Failed to update product', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Product ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const products = db.collection('doors_windows_products')

    await products.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Product deleted' })
  } catch (error) {
    console.error('Doors-Windows Products DELETE Error:', error)
    return errorResponse('Failed to delete product', 500, error.message)
  }
}
