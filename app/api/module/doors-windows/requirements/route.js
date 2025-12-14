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
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('doors_windows_requirements')

    if (id) {
      const requirement = await requirements.findOne({ id })
      if (!requirement) return errorResponse('Requirement not found', 404)
      return successResponse(sanitizeDocument(requirement))
    }

    const query = { isActive: true }
    if (status) query.status = status
    if (customerId) query['customer.id'] = customerId

    const reqList = await requirements.find(query).sort({ createdAt: -1 }).toArray()
    return successResponse({ requirements: sanitizeDocuments(reqList) })
  } catch (error) {
    console.error('Doors-Windows Requirements GET Error:', error)
    return errorResponse('Failed to fetch requirements', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('doors_windows_requirements')
    const counters = db.collection('counters')

    // Generate requirement number
    const counter = await counters.findOneAndUpdate(
      { _id: 'doors_windows_requirement' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
    const reqNumber = `DW-REQ-${String(counter.seq || 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const reqId = uuidv4()

    const requirement = {
      id: reqId,
      requirementNumber: reqNumber,
      title: body.title || `Requirement ${reqNumber}`,
      
      // Customer
      customer: body.customer || {},
      
      // Site details
      siteAddress: body.siteAddress || {},
      propertyType: body.propertyType, // residential, commercial, industrial
      constructionType: body.constructionType, // new, renovation, replacement
      
      // Items required
      items: body.items || [], // Array of windows/doors with dimensions
      
      // Preferences
      preferences: body.preferences || {
        frameMaterial: null,
        glassType: null,
        color: null,
        brand: null
      },
      
      // Budget & Timeline
      estimatedBudget: body.estimatedBudget || 0,
      expectedDelivery: body.expectedDelivery || null,
      
      // Status
      status: 'new',
      priority: body.priority || 'normal',
      
      // Source
      source: body.source || 'direct', // direct, referral, website, crm
      sourceRef: body.sourceRef,
      
      // Assigned
      assignedTo: body.assignedTo || null,
      
      // Site visit
      siteVisitScheduled: null,
      siteVisitCompleted: null,
      
      // Measurement
      measurementDate: null,
      measurementBy: null,
      measurementData: null,
      
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      
      // AI Suggestions
      aiSuggestions: null,
      
      // Linked
      linkedProjectId: body.linkedProjectId || null,
      linkedQuotationIds: [],
      linkedOrderIds: [],
      
      // Status
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await requirements.insertOne(requirement)
    return successResponse(sanitizeDocument(requirement), 201)
  } catch (error) {
    console.error('Doors-Windows Requirements POST Error:', error)
    return errorResponse('Failed to create requirement', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Requirement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('doors_windows_requirements')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const result = await requirements.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Requirement not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Requirements PUT Error:', error)
    return errorResponse('Failed to update requirement', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Requirement ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const requirements = db.collection('doors_windows_requirements')

    await requirements.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Requirement deleted' })
  } catch (error) {
    console.error('Doors-Windows Requirements DELETE Error:', error)
    return errorResponse('Failed to delete requirement', 500, error.message)
  }
}
