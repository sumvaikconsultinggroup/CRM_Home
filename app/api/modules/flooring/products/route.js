import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections, WoodTypes, FloorFinishes, FlooringSizes } from '@/lib/modules/flooring/constants'
import { initializeFlooringModule } from '@/lib/modules/flooring/utils'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const woodType = searchParams.get('woodType')
    const finish = searchParams.get('finish')
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    const inStock = searchParams.get('inStock')
    
    // Initialize module if needed
    await initializeFlooringModule(user.clientId)
    
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    
    const filter = { clientId: user.clientId, active: true }
    if (woodType) filter.woodType = woodType
    if (finish) filter.finish = finish
    if (category) filter.category = category
    if (featured === 'true') filter.featured = true
    if (inStock === 'true') filter.inStock = true
    
    const products = await productsCollection.find(filter).sort({ createdAt: -1 }).toArray()
    
    // Also return reference data
    return successResponse({
      products: sanitizeDocuments(products),
      referenceData: {
        woodTypes: WoodTypes,
        finishes: FloorFinishes,
        sizes: FlooringSizes
      }
    })
  } catch (error) {
    console.error('Flooring Products GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { name, woodType, finish, description, basePrice, pricePerSqFt, specifications, images, category, tags } = body
    
    if (!name || !woodType) {
      return errorResponse('Name and wood type are required', 400)
    }
    
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    
    const product = {
      id: uuidv4(),
      clientId: user.clientId,
      name,
      woodType,
      finish: finish || 'matte',
      description: description || '',
      basePrice: basePrice || 0,
      pricePerSqFt: pricePerSqFt || 0,
      specifications: specifications || {},
      images: images || [],
      category: category || 'solid',
      tags: tags || [],
      inStock: true,
      featured: false,
      active: true,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await productsCollection.insertOne(product)
    
    return successResponse(sanitizeDocument(product), 201)
  } catch (error) {
    console.error('Flooring Products POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create product', 500, error.message)
  }
}
