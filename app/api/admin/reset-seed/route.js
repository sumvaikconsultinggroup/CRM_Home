/**
 * Reset and Seed API
 * For testing and demo purposes - creates clean test data
 */

import { resetClientData, resetAndSeedAll } from '@/lib/db/reset-and-seed'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { verifyToken } from '@/lib/utils/auth'
import { logAdminAccess } from '@/lib/observability/audit-logger'
import { getMainDb } from '@/lib/db/multitenancy'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * POST - Reset data or seed new test tenants
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }
    
    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user) {
      return errorResponse('Invalid token', 401)
    }
    
    const body = await request.json()
    const { action, confirmReset, clientId } = body
    
    // Reset single client data
    if (action === 'reset_client') {
      const targetClientId = clientId || user.clientId
      
      if (!targetClientId) {
        return errorResponse('Client ID required', 400)
      }
      
      if (confirmReset !== 'CONFIRM_RESET') {
        return errorResponse('Confirmation required: set confirmReset to "CONFIRM_RESET"', 400)
      }
      
      // Only allow self-reset or admin reset
      if (user.role !== 'super_admin' && targetClientId !== user.clientId) {
        return errorResponse('Cannot reset other client data', 403)
      }
      
      // Log admin access
      await logAdminAccess(
        user.id,
        user.name || user.email,
        targetClientId,
        'reset_client_data',
        request.headers.get('x-request-id')
      )
      
      const results = await resetClientData(targetClientId)
      
      return successResponse({
        message: 'Client data reset successfully',
        clientId: targetClientId,
        results
      })
    }
    
    // Create new sample tenants (super admin only)
    if (action === 'seed_tenants') {
      if (user.role !== 'super_admin') {
        return errorResponse('Super admin access required', 403)
      }
      
      if (confirmReset !== 'CONFIRM_SEED') {
        return errorResponse('Confirmation required: set confirmReset to "CONFIRM_SEED"', 400)
      }
      
      await logAdminAccess(
        user.id,
        user.name || user.email,
        'SYSTEM',
        'seed_sample_tenants',
        request.headers.get('x-request-id')
      )
      
      const results = await resetAndSeedAll()
      
      return successResponse({
        message: 'Sample tenants created',
        ...results
      })
    }
    
    return errorResponse('Invalid action. Use "reset_client" or "seed_tenants"', 400)
    
  } catch (error) {
    console.error('Reset/Seed API Error:', error)
    return errorResponse('Failed to execute reset/seed', 500, error.message)
  }
}

/**
 * GET - Get seed report (what test data exists)
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }
    
    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || user.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403)
    }
    
    // Get list of sample tenants
    const mainDb = await getMainDb()
    const clientsCollection = mainDb.collection('clients')
    
    const sampleClients = await clientsCollection.find({
      email: { $in: ['admin@floormasters.com', 'admin@windowworld.com'] }
    }).toArray()
    
    return successResponse({
      sampleTenants: sampleClients.map(c => ({
        clientId: c.clientId,
        businessName: c.businessName,
        email: c.email,
        modules: c.modules,
        createdAt: c.createdAt
      })),
      seedInstructions: {
        flooringTenant: {
          email: 'admin@floormasters.com',
          password: 'floor123',
          description: 'Wooden Flooring specialist with full workflow data'
        },
        doorsWindowsTenant: {
          email: 'admin@windowworld.com',
          password: 'window123',
          description: 'Doors & Windows fabricator with sample projects'
        }
      }
    })
    
  } catch (error) {
    console.error('Seed Report API Error:', error)
    return errorResponse('Failed to get seed report', 500, error.message)
  }
}
