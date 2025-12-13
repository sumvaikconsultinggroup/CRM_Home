import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch installation work orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const installationId = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const installerId = searchParams.get('installerId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_installations')
    
    let query = {}
    if (installationId) query.id = installationId
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (installerId) query['team.installerId'] = installerId

    const installations = await collection.find(query).sort({ scheduledDate: -1 }).toArray()

    // Include snags if single installation
    if (installationId && installations.length > 0) {
      const snagsCollection = db.collection('dw_snags')
      const snags = await snagsCollection.find({ installationId }).toArray()
      installations[0].snags = sanitizeDocuments(snags)
    }

    const stats = {
      total: installations.length,
      scheduled: installations.filter(i => i.status === 'scheduled').length,
      inProgress: installations.filter(i => i.status === 'in-progress').length,
      completed: installations.filter(i => i.status === 'completed').length,
      snagsOpen: installations.reduce((sum, i) => sum + (i.openSnags || 0), 0)
    }

    return successResponse({ installations: sanitizeDocuments(installations), stats })
  } catch (error) {
    console.error('DW Installation GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch installations', 500, error.message)
  }
}

// POST - Create installation work order or record snag/progress
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Record snag
    if (action === 'record-snag') {
      const snagsCollection = db.collection('dw_snags')
      const installationsCollection = db.collection('dw_installations')

      const snag = {
        id: uuidv4(),
        installationId: body.installationId,
        clientId: user.clientId,
        
        category: body.category || 'general', // alignment, leakage, hardware, glass, finish, other
        description: body.description || '',
        severity: body.severity || 'medium', // low, medium, high, critical
        location: body.location || '', // which opening/room
        
        photos: body.photos || [],
        
        status: 'open', // open, in-progress, resolved, deferred
        assignedTo: body.assignedTo || null,
        
        reportedBy: user.id,
        reportedAt: new Date(),
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: '',
        
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await snagsCollection.insertOne(snag)

      // Update installation snag count
      await installationsCollection.updateOne(
        { id: body.installationId },
        { 
          $inc: { openSnags: 1, totalSnags: 1 },
          $set: { updatedAt: new Date() }
        }
      )

      return successResponse(sanitizeDocument(snag), 201)
    }

    // Resolve snag
    if (action === 'resolve-snag') {
      const snagsCollection = db.collection('dw_snags')
      const installationsCollection = db.collection('dw_installations')

      const snag = await snagsCollection.findOne({ id: body.snagId })
      if (!snag) return errorResponse('Snag not found', 404)

      await snagsCollection.updateOne(
        { id: body.snagId },
        {
          $set: {
            status: 'resolved',
            resolvedAt: new Date(),
            resolvedBy: user.id,
            resolutionNotes: body.resolutionNotes || '',
            resolutionPhotos: body.photos || [],
            updatedAt: new Date()
          }
        }
      )

      await installationsCollection.updateOne(
        { id: snag.installationId },
        { 
          $inc: { openSnags: -1 },
          $set: { updatedAt: new Date() }
        }
      )

      return successResponse({ message: 'Snag resolved successfully' })
    }

    // Site check-in
    if (action === 'check-in') {
      const collection = db.collection('dw_installations')
      
      const result = await collection.findOneAndUpdate(
        { id: body.installationId },
        {
          $set: {
            status: 'in-progress',
            actualStartDate: new Date(),
            checkIn: {
              time: new Date(),
              location: body.location || null,
              photo: body.photo || null,
              checkedInBy: user.id
            },
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Site check-out
    if (action === 'check-out') {
      const collection = db.collection('dw_installations')
      
      const result = await collection.findOneAndUpdate(
        { id: body.installationId },
        {
          $set: {
            checkOut: {
              time: new Date(),
              location: body.location || null,
              photo: body.photo || null,
              checkedOutBy: user.id
            },
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Record daily progress
    if (action === 'record-progress') {
      const collection = db.collection('dw_installations')
      
      const progress = {
        date: new Date(),
        description: body.description || '',
        openingsCompleted: parseInt(body.openingsCompleted) || 0,
        photos: body.photos || [],
        issues: body.issues || '',
        recordedBy: user.id
      }

      const result = await collection.findOneAndUpdate(
        { id: body.installationId },
        {
          $push: { dailyProgress: progress },
          $inc: { completedOpenings: progress.openingsCompleted },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Complete installation with handover
    if (action === 'complete') {
      const collection = db.collection('dw_installations')
      
      const result = await collection.findOneAndUpdate(
        { id: body.installationId },
        {
          $set: {
            status: 'completed',
            actualEndDate: new Date(),
            handover: {
              certificate: body.certificate || '',
              customerSignature: body.signature || '',
              customerName: body.customerName || '',
              signedAt: new Date(),
              photos: body.photos || [],
              feedback: body.feedback || '',
              rating: parseInt(body.rating) || 0
            },
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Create installation work order
    const collection = db.collection('dw_installations')

    const installation = {
      id: uuidv4(),
      clientId: user.clientId,
      installationNumber: `INS-${Date.now()}`,
      
      // Links
      orderId: body.orderId,
      orderNumber: body.orderNumber || '',
      dispatchId: body.dispatchId || null,
      
      // Customer
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      siteAddress: body.siteAddress || '',
      siteContactPerson: body.siteContactPerson || '',
      siteContactPhone: body.siteContactPhone || '',
      
      // Items
      totalOpenings: parseInt(body.totalOpenings) || 0,
      completedOpenings: 0,
      
      // Team
      team: body.team || [], // [{ installerId, name, role }]
      leadInstaller: body.leadInstaller || '',
      
      // Schedule
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      scheduledDuration: body.scheduledDuration || '1 day',
      actualStartDate: null,
      actualEndDate: null,
      
      // Check in/out
      checkIn: null,
      checkOut: null,
      
      // Progress
      dailyProgress: [],
      
      // Snags
      totalSnags: 0,
      openSnags: 0,
      
      // Status
      status: 'scheduled', // scheduled, in-progress, completed, on-hold, cancelled
      
      // Handover
      handover: null,
      
      // Notes
      specialInstructions: body.specialInstructions || '',
      notes: body.notes || '',
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(installation)
    return successResponse(sanitizeDocument(installation), 201)
  } catch (error) {
    console.error('DW Installation POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create installation', 500, error.message)
  }
}

// PUT - Update installation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Installation ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_installations')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Installation not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Installation PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update installation', 500, error.message)
  }
}

// DELETE - Cancel installation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Installation ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_installations')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Installation not found', 404)
    return successResponse({ message: 'Installation cancelled successfully' })
  } catch (error) {
    console.error('DW Installation DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to cancel installation', 500, error.message)
  }
}
