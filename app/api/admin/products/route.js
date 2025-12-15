import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Build Suite Products Definition
const BUILD_PRODUCTS = {
  'build-crm': {
    id: 'build-crm',
    name: 'Build CRM',
    description: 'Enterprise CRM with industry-specific modules',
    icon: 'building2',
    color: '#3B82F6',
    subdomain: 'crm',
    features: [
      'Lead Management',
      'Project Tracking',
      'Quote Generation',
      'Industry Modules',
      'Team Collaboration',
      'Reports & Analytics'
    ],
    pricing: {
      starter: 999,
      professional: 2499,
      enterprise: 4999
    }
  },
  'build-inventory': {
    id: 'build-inventory',
    name: 'Build Inventory',
    description: 'Enterprise inventory management like Zoho Inventory',
    icon: 'package',
    color: '#10B981',
    subdomain: 'inventory',
    features: [
      'Multi-Warehouse Management',
      'Stock Tracking & Batches',
      'GRN & Delivery Challans',
      'Stock Transfers',
      'Reservations',
      'Cycle Counts & Audits',
      'Inventory Reports',
      'Product Sync from CRM'
    ],
    pricing: {
      starter: 799,
      professional: 1999,
      enterprise: 3999
    }
  },
  'build-finance': {
    id: 'build-finance',
    name: 'Build Finance',
    description: 'Enterprise accounting & finance like Zoho Books/SAP',
    icon: 'indian-rupee',
    color: '#F59E0B',
    subdomain: 'finance',
    features: [
      'Invoicing & Billing',
      'Expense Management',
      'Payment Tracking',
      'GST & Tax Compliance',
      'Bank Reconciliation',
      'Multi-Currency Support',
      'Financial Reports',
      'P&L & Balance Sheet',
      'Cash Flow Management',
      'Budgeting & Forecasting'
    ],
    pricing: {
      starter: 1299,
      professional: 2999,
      enterprise: 5999
    }
  }
}

// GET - List all Build Suite products
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const mainDb = await getMainDb()
    const productsCollection = mainDb.collection('build_products')

    // Check if products are seeded
    const existingProducts = await productsCollection.find({}).toArray()
    
    if (existingProducts.length === 0) {
      // Seed default products
      const productsToInsert = Object.values(BUILD_PRODUCTS).map(p => ({
        ...p,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      await productsCollection.insertMany(productsToInsert)
      return successResponse(productsToInsert)
    }

    return successResponse(sanitizeDocuments(existingProducts))
  } catch (error) {
    console.error('Admin Products API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch products', 500, error.message)
  }
}

// POST - Assign product to client
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { clientId, productId, planTier } = body

    if (!clientId || !productId) {
      return errorResponse('Client ID and Product ID are required', 400)
    }

    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')
    const clientProductsCollection = mainDb.collection('client_products')

    // Verify client exists
    let client = await clientsCollection.findOne({ clientId })
    if (!client) {
      client = await clientsCollection.findOne({ id: clientId })
    }
    if (!client) {
      return errorResponse('Client not found', 404)
    }

    // Check if product is already assigned
    const existingAssignment = await clientProductsCollection.findOne({
      clientId: client.clientId,
      productId
    })

    if (existingAssignment) {
      // Update existing assignment
      await clientProductsCollection.updateOne(
        { clientId: client.clientId, productId },
        {
          $set: {
            planTier: planTier || existingAssignment.planTier,
            status: 'active',
            updatedAt: new Date()
          }
        }
      )
      return successResponse({ message: 'Product assignment updated' })
    }

    // Create new assignment
    const assignment = {
      id: uuidv4(),
      clientId: client.clientId,
      clientName: client.businessName,
      productId,
      productName: BUILD_PRODUCTS[productId]?.name || productId,
      planTier: planTier || 'starter',
      status: 'active',
      syncEnabled: productId === 'build-inventory', // Enable sync for inventory
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await clientProductsCollection.insertOne(assignment)

    // Also update client document with assigned products array
    await clientsCollection.updateOne(
      { clientId: client.clientId },
      {
        $addToSet: { assignedProducts: productId },
        $set: { updatedAt: new Date() }
      }
    )

    return successResponse(sanitizeDocument(assignment), 201)
  } catch (error) {
    console.error('Admin Assign Product API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to assign product', 500, error.message)
  }
}

// PUT - Update product assignment
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { clientId, productId, status, planTier, syncEnabled } = body

    if (!clientId || !productId) {
      return errorResponse('Client ID and Product ID are required', 400)
    }

    const mainDb = await getMainDb()
    const clientProductsCollection = mainDb.collection('client_products')
    const clientsCollection = mainDb.collection('clients')

    const updates = { updatedAt: new Date() }
    if (status !== undefined) updates.status = status
    if (planTier !== undefined) updates.planTier = planTier
    if (syncEnabled !== undefined) updates.syncEnabled = syncEnabled

    const result = await clientProductsCollection.findOneAndUpdate(
      { clientId, productId },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Product assignment not found', 404)
    }

    // If disabling, remove from client's assignedProducts
    if (status === 'inactive') {
      await clientsCollection.updateOne(
        { clientId },
        { $pull: { assignedProducts: productId } }
      )
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Admin Update Product Assignment API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update product assignment', 500, error.message)
  }
}

// DELETE - Remove product assignment
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const productId = searchParams.get('productId')

    if (!clientId || !productId) {
      return errorResponse('Client ID and Product ID are required', 400)
    }

    const mainDb = await getMainDb()
    const clientProductsCollection = mainDb.collection('client_products')
    const clientsCollection = mainDb.collection('clients')

    await clientProductsCollection.deleteOne({ clientId, productId })
    
    // Remove from client's assignedProducts
    await clientsCollection.updateOne(
      { clientId },
      { $pull: { assignedProducts: productId } }
    )

    return successResponse({ message: 'Product assignment removed' })
  } catch (error) {
    console.error('Admin Remove Product Assignment API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to remove product assignment', 500, error.message)
  }
}
