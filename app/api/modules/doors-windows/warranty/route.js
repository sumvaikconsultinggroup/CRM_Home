import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch warranty records
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const warrantyId = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const expiringSoon = searchParams.get('expiringSoon')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warranties')
    
    let query = {}
    if (warrantyId) query.id = warrantyId
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    
    // Expiring in next 30 days
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      query.expiresAt = {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
      query.status = 'active'
    }

    const warranties = await collection.find(query).sort({ expiresAt: 1 }).toArray()

    const now = new Date()
    const stats = {
      total: warranties.length,
      active: warranties.filter(w => w.status === 'active' && new Date(w.expiresAt) > now).length,
      expired: warranties.filter(w => w.status === 'expired' || new Date(w.expiresAt) <= now).length,
      expiringSoon: warranties.filter(w => {
        const exp = new Date(w.expiresAt)
        const thirtyDays = new Date()
        thirtyDays.setDate(thirtyDays.getDate() + 30)
        return exp > now && exp <= thirtyDays
      }).length,
      claimsCount: warranties.reduce((sum, w) => sum + (w.claimsCount || 0), 0)
    }

    return successResponse({ warranties: sanitizeDocuments(warranties), stats })
  } catch (error) {
    console.error('DW Warranty GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch warranties', 500, error.message)
  }
}

// POST - Create or register warranty
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Register warranty from installation handover
    if (action === 'register-from-handover') {
      const installationsCollection = db.collection('dw_installations')
      const ordersCollection = db.collection('dw_orders')
      const warrantyCollection = db.collection('dw_warranties')

      const installation = await installationsCollection.findOne({ id: body.installationId })
      if (!installation) return errorResponse('Installation not found', 404)

      const order = await ordersCollection.findOne({ id: installation.orderId })

      // Get warranty terms from system series (simplified)
      const warrantyYears = body.warrantyYears || 10
      const handoverDate = installation.handover?.signedAt || new Date()
      const expiresAt = new Date(handoverDate)
      expiresAt.setFullYear(expiresAt.getFullYear() + warrantyYears)

      const warranty = {
        id: uuidv4(),
        clientId: user.clientId,
        warrantyNumber: `WRN-${Date.now()}`,
        
        // Links
        orderId: installation.orderId,
        orderNumber: order?.orderNumber || '',
        installationId: installation.id,
        
        // Customer
        customerName: installation.customerName || '',
        customerPhone: installation.customerPhone || '',
        customerEmail: body.customerEmail || '',
        siteAddress: installation.siteAddress || '',
        
        // Warranty details
        warrantyType: body.warrantyType || 'standard', // standard, extended, premium
        warrantyTerms: body.warrantyTerms || 'Standard warranty terms apply',
        
        // Coverage
        coverage: body.coverage || [
          'Manufacturing defects',
          'Hardware failure under normal use',
          'Seal and gasket failure',
          'Finish defects (limited)'
        ],
        exclusions: body.exclusions || [
          'Physical damage',
          'Improper installation (if not by us)',
          'Normal wear and tear',
          'Acts of nature'
        ],
        
        // Items covered
        itemsCovered: body.itemsCovered || installation.totalOpenings || 0,
        systemSeries: body.systemSeries || '',
        
        // Dates
        handoverDate: handoverDate,
        startDate: handoverDate,
        expiresAt: expiresAt,
        warrantyPeriod: `${warrantyYears} years`,
        
        // Status
        status: 'active', // active, expired, void
        
        // Claims
        claimsCount: 0,
        claims: [],
        
        // Documents
        warrantyDocument: body.warrantyDocument || null,
        
        registeredBy: user.id,
        registeredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await warrantyCollection.insertOne(warranty)
      return successResponse(sanitizeDocument(warranty), 201)
    }

    // Record warranty claim
    if (action === 'record-claim') {
      const collection = db.collection('dw_warranties')
      
      const claim = {
        id: uuidv4(),
        serviceTicketId: body.serviceTicketId || null,
        issue: body.issue || '',
        claimedAt: new Date(),
        status: 'pending', // pending, approved, rejected
        approvedBy: null,
        notes: body.notes || ''
      }

      const result = await collection.findOneAndUpdate(
        { id: body.warrantyId },
        {
          $push: { claims: claim },
          $inc: { claimsCount: 1 },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Warranty not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Create manual warranty
    const collection = db.collection('dw_warranties')

    const warrantyYears = parseInt(body.warrantyYears) || 10
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const expiresAt = new Date(startDate)
    expiresAt.setFullYear(expiresAt.getFullYear() + warrantyYears)

    const warranty = {
      id: uuidv4(),
      clientId: user.clientId,
      warrantyNumber: `WRN-${Date.now()}`,
      
      orderId: body.orderId || null,
      orderNumber: body.orderNumber || '',
      installationId: body.installationId || null,
      openingId: body.openingId || null,
      
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      siteAddress: body.siteAddress || '',
      
      warrantyType: body.warrantyType || 'standard',
      warrantyTerms: body.warrantyTerms || '',
      coverage: body.coverage || [],
      exclusions: body.exclusions || [],
      
      itemsCovered: parseInt(body.itemsCovered) || 1,
      systemSeries: body.systemSeries || '',
      
      handoverDate: startDate,
      startDate: startDate,
      expiresAt: expiresAt,
      warrantyPeriod: `${warrantyYears} years`,
      
      status: 'active',
      claimsCount: 0,
      claims: [],
      
      warrantyDocument: body.warrantyDocument || null,
      
      registeredBy: user.id,
      registeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(warranty)
    return successResponse(sanitizeDocument(warranty), 201)
  } catch (error) {
    console.error('DW Warranty POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create warranty', 500, error.message)
  }
}

// PUT - Update warranty
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Warranty ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warranties')

    // Void warranty
    if (action === 'void') {
      const result = await collection.findOneAndUpdate(
        { id },
        {
          $set: {
            status: 'void',
            voidReason: updates.reason || '',
            voidedBy: user.id,
            voidedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Warranty not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Extend warranty
    if (action === 'extend') {
      const warranty = await collection.findOne({ id })
      if (!warranty) return errorResponse('Warranty not found', 404)

      const newExpiry = new Date(warranty.expiresAt)
      newExpiry.setFullYear(newExpiry.getFullYear() + (parseInt(updates.extendYears) || 1))

      const result = await collection.findOneAndUpdate(
        { id },
        {
          $set: {
            expiresAt: newExpiry,
            warrantyPeriod: `Extended to ${newExpiry.toLocaleDateString()}`,
            extendedBy: user.id,
            extendedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )
      return successResponse(sanitizeDocument(result))
    }

    // Regular update
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Warranty not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Warranty PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update warranty', 500, error.message)
  }
}

// DELETE - Delete warranty record
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Warranty ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_warranties')
    
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Warranty not found', 404)
    return successResponse({ message: 'Warranty deleted successfully' })
  } catch (error) {
    console.error('DW Warranty DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete warranty', 500, error.message)
  }
}
