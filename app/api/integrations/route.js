import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const integrationsCollection = await getCollection('integrations')
    
    const integrations = await integrationsCollection
      .find({ clientId: user.clientId })
      .toArray()

    return successResponse(sanitizeDocuments(integrations))
  } catch (error) {
    console.error('Integrations GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch integrations', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, integrationType, config } = body

    const integrationsCollection = await getCollection('integrations')

    if (action === 'generate-webhook') {
      // Generate a unique webhook URL for the client
      const webhookId = uuidv4()
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/incoming/${webhookId}`
      
      const webhook = {
        id: webhookId,
        clientId: user.clientId,
        createdBy: user.id,
        type: 'webhook',
        name: integrationType || 'Custom Webhook',
        webhookUrl,
        secret: uuidv4().replace(/-/g, ''),
        active: true,
        events: ['lead.created', 'lead.updated', 'project.created', 'task.completed'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await integrationsCollection.insertOne(webhook)
      return successResponse(sanitizeDocument(webhook), 201)
    }

    if (action === 'generate-api-key') {
      // Generate API key for the client
      const apiKey = `bcrm_${uuidv4().replace(/-/g, '')}`
      
      const integration = {
        id: uuidv4(),
        clientId: user.clientId,
        createdBy: user.id,
        type: 'api_key',
        name: integrationType || 'API Key',
        apiKey,
        active: true,
        permissions: ['read', 'write'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await integrationsCollection.insertOne(integration)
      return successResponse(sanitizeDocument(integration), 201)
    }

    if (action === 'connect') {
      // Store integration connection
      const integration = {
        id: uuidv4(),
        clientId: user.clientId,
        createdBy: user.id,
        type: integrationType,
        name: integrationType,
        config: config || {},
        active: true,
        connectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await integrationsCollection.insertOne(integration)
      return successResponse(sanitizeDocument(integration), 201)
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Integrations POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process integration', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Integration ID is required', 400)
    }

    const integrationsCollection = await getCollection('integrations')
    const result = await integrationsCollection.deleteOne({ id, clientId: user.clientId })

    if (result.deletedCount === 0) {
      return errorResponse('Integration not found', 404)
    }

    return successResponse({ message: 'Integration disconnected successfully' })
  } catch (error) {
    console.error('Integrations DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect integration', 500, error.message)
  }
}
