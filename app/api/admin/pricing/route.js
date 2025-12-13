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
    const plansCollection = mainDb.collection('plans')
    const plans = await plansCollection.find({}).toArray()

    return successResponse(sanitizeDocuments(plans))
  } catch (error) {
    console.error('Admin Pricing API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch pricing plans', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { name, price, billingCycle, features, userLimit, storageGB, whitelabel, customDomain, apiAccess } = body

    if (!name || !price) {
      return errorResponse('Name and price are required', 400)
    }

    const mainDb = await getMainDb()
    const plansCollection = mainDb.collection('plans')

    const newPlan = {
      id: body.id || name.toLowerCase().replace(/\s+/g, '-'),
      name,
      price: Number(price),
      billingCycle: billingCycle || 'monthly',
      features: features || [],
      userLimit: userLimit || 5,
      storageGB: storageGB || 5,
      whitelabel: whitelabel || false,
      customDomain: customDomain || false,
      apiAccess: apiAccess || false,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await plansCollection.insertOne(newPlan)

    return successResponse(sanitizeDocument(newPlan), 201)
  } catch (error) {
    console.error('Admin Pricing Create API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create pricing plan', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Plan ID is required', 400)
    }

    const mainDb = await getMainDb()
    const plansCollection = mainDb.collection('plans')

    // Ensure price is a number if provided
    if (updateData.price) {
      updateData.price = Number(updateData.price)
    }

    await plansCollection.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: new Date() } }
    )

    return successResponse({ message: 'Plan updated successfully' })
  } catch (error) {
    console.error('Admin Pricing Update API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update pricing plan', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireSuperAdmin(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Plan ID is required', 400)
    }

    const mainDb = await getMainDb()
    const plansCollection = mainDb.collection('plans')
    const clientsCollection = mainDb.collection('clients')
    
    // Check if any clients are using this plan before deleting
    const clientsUsingPlan = await clientsCollection.countDocuments({ planId: id })

    if (clientsUsingPlan > 0) {
      return errorResponse(`Cannot delete plan. ${clientsUsingPlan} client(s) are currently using this plan.`, 400)
    }

    await plansCollection.deleteOne({ id })

    return successResponse({ message: 'Plan deleted successfully' })
  } catch (error) {
    console.error('Admin Pricing Delete API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete pricing plan', 500, error.message)
  }
}
