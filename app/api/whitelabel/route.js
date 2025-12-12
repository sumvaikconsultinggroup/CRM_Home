import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const whitelabelCollection = await getCollection(Collections.WHITELABEL)
    const clientsCollection = await getCollection(Collections.CLIENTS)
    const plansCollection = await getCollection(Collections.PLANS)

    // Check if client has whitelabel access
    const clientDoc = await clientsCollection.findOne({ id: user.clientId })
    const plan = await plansCollection.findOne({ id: clientDoc.planId })

    if (!plan.whitelabel) {
      return errorResponse('White labeling is not available on your plan. Upgrade to Enterprise.', 403)
    }

    const settings = await whitelabelCollection.findOne({ clientId: user.clientId })

    return successResponse(sanitizeDocument(settings) || {
      logo: null,
      favicon: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      companyName: clientDoc.businessName,
      customDomain: null,
      customCSS: '',
      enabled: false
    })
  } catch (error) {
    console.error('Whitelabel GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch whitelabel settings', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { logo, favicon, primaryColor, secondaryColor, companyName, customDomain, customCSS, enabled } = body

    const whitelabelCollection = await getCollection(Collections.WHITELABEL)
    const clientsCollection = await getCollection(Collections.CLIENTS)
    const plansCollection = await getCollection(Collections.PLANS)

    // Check if client has whitelabel access
    const clientDoc = await clientsCollection.findOne({ id: user.clientId })
    const plan = await plansCollection.findOne({ id: clientDoc.planId })

    if (!plan.whitelabel) {
      return errorResponse('White labeling is not available on your plan. Upgrade to Enterprise.', 403)
    }

    // Check custom domain permission
    if (customDomain && !plan.customDomain) {
      return errorResponse('Custom domain is not available on your plan.', 403)
    }

    const updateData = {
      updatedAt: new Date()
    }

    if (logo !== undefined) updateData.logo = logo
    if (favicon !== undefined) updateData.favicon = favicon
    if (primaryColor) updateData.primaryColor = primaryColor
    if (secondaryColor) updateData.secondaryColor = secondaryColor
    if (companyName) updateData.companyName = companyName
    if (customDomain !== undefined) updateData.customDomain = customDomain
    if (customCSS !== undefined) updateData.customCSS = customCSS
    if (enabled !== undefined) updateData.enabled = enabled

    await whitelabelCollection.updateOne(
      { clientId: user.clientId },
      { $set: updateData },
      { upsert: true }
    )

    return successResponse({ message: 'White label settings updated successfully' })
  } catch (error) {
    console.error('Whitelabel PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update whitelabel settings', 500, error.message)
  }
}
