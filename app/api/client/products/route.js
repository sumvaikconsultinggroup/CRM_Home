import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Build Suite Products Definition (shared)
const BUILD_PRODUCTS = {
  'build-crm': {
    id: 'build-crm',
    name: 'Build CRM',
    description: 'Enterprise CRM with industry-specific modules',
    icon: 'building2',
    color: '#3B82F6',
    subdomain: 'crm'
  },
  'build-inventory': {
    id: 'build-inventory',
    name: 'Build Inventory',
    description: 'Enterprise inventory management',
    icon: 'package',
    color: '#10B981',
    subdomain: 'inventory'
  },
  'build-finance': {
    id: 'build-finance',
    name: 'Build Finance',
    description: 'Enterprise accounting & finance',
    icon: 'indian-rupee',
    color: '#F59E0B',
    subdomain: 'finance',
    comingSoon: true
  }
}

// GET - Get client's assigned products
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const clientId = user.clientId

    const mainDb = await getMainDb()
    const clientProductsCollection = mainDb.collection('client_products')
    const clientsCollection = mainDb.collection('clients')

    // Get client info
    let client = await clientsCollection.findOne({ clientId })
    if (!client) {
      client = await clientsCollection.findOne({ id: clientId })
    }

    // Get assigned products
    const assignments = await clientProductsCollection.find({
      clientId: client?.clientId || clientId,
      status: 'active'
    }).toArray()

    // Enrich with product details
    const enrichedProducts = assignments.map(assignment => {
      const productInfo = BUILD_PRODUCTS[assignment.productId] || {}
      return {
        ...assignment,
        ...productInfo,
        planTier: assignment.planTier,
        syncEnabled: assignment.syncEnabled
      }
    })

    // Also include products that are always available (Build CRM is default)
    const hascrm = enrichedProducts.some(p => p.productId === 'build-crm')
    if (!hascrm) {
      // CRM is always available as the base product
      enrichedProducts.unshift({
        ...BUILD_PRODUCTS['build-crm'],
        productId: 'build-crm',
        planTier: client?.planId || 'starter',
        status: 'active',
        isDefault: true
      })
    }

    return successResponse({
      products: enrichedProducts,
      currentProduct: detectCurrentProduct(request),
      client: {
        clientId: client?.clientId,
        businessName: client?.businessName
      }
    })
  } catch (error) {
    console.error('Client Products API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// Helper to detect current product from request
function detectCurrentProduct(request) {
  const host = request.headers.get('host') || ''
  
  if (host.includes('inventory.')) return 'build-inventory'
  if (host.includes('finance.')) return 'build-finance'
  return 'build-crm' // Default
}
