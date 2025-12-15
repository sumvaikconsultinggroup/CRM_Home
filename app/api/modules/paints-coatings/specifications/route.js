import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch specifications
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const leadId = searchParams.get('leadId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const specs = db.collection('paints_specifications')

    // Single spec fetch
    if (id) {
      const spec = await specs.findOne({ id })
      if (!spec) {
        return errorResponse('Specification not found', 404)
      }
      return successResponse({ specification: sanitizeDocument(spec) })
    }

    // Build filter
    const filter = {}
    if (leadId) filter.leadId = leadId
    if (projectId) filter.projectId = projectId
    if (status) filter.status = status

    const result = await specs.find(filter).sort({ createdAt: -1 }).toArray()

    return successResponse({ specifications: sanitizeDocuments(result) })
  } catch (error) {
    console.error('Specifications GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch specifications', 500, error.message)
  }
}

// POST - Create specification
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      leadId,
      projectId,
      surveyId,
      projectName,
      clientName,
      architectName,
      builderName,
      surfaces,
      shadeSchedule,
      warrantyTerms,
      exclusions,
      specialInstructions,
      validUntil
    } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const specs = db.collection('paints_specifications')

    // Generate spec number
    const count = await specs.countDocuments()
    const specNumber = `SPEC-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()

    // Process surfaces with coating systems
    const processedSurfaces = (surfaces || []).map(surface => ({
      id: surface.id || uuidv4(),
      name: surface.name || 'Surface',
      area: surface.area || 0,
      surfaceType: surface.surfaceType || 'wall',
      
      // Surface preparation steps
      preparation: surface.preparation || [
        { step: 1, description: 'Clean surface thoroughly', completed: false },
        { step: 2, description: 'Sand and remove loose particles', completed: false },
        { step: 3, description: 'Apply primer', completed: false }
      ],
      
      // Coating system
      coatingSystem: surface.coatingSystem || {
        primer: {
          productId: null,
          productName: '',
          brand: '',
          coats: 1,
          coverage: 0
        },
        putty: {
          productId: null,
          productName: '',
          brand: '',
          coats: 2,
          coverage: 0
        },
        topcoat: {
          productId: null,
          productName: '',
          brand: '',
          coats: 2,
          coverage: 0,
          finish: 'matte'
        }
      },
      
      // Shade/Color
      shadeCode: surface.shadeCode || '',
      shadeName: surface.shadeName || '',
      
      // Notes
      notes: surface.notes || ''
    }))

    // Process shade schedule
    const processedShadeSchedule = (shadeSchedule || []).map(item => ({
      id: item.id || uuidv4(),
      location: item.location || '',
      surfaceType: item.surfaceType || 'wall',
      shadeCode: item.shadeCode || '',
      shadeName: item.shadeName || '',
      finish: item.finish || 'matte',
      notes: item.notes || ''
    }))

    const spec = {
      id: uuidv4(),
      specNumber,
      clientId: user.clientId,
      version: 1,
      
      // Relations
      leadId: leadId || null,
      projectId: projectId || null,
      surveyId: surveyId || null,
      
      // Project info
      projectName: projectName || '',
      clientName: clientName || '',
      architectName: architectName || '',
      builderName: builderName || '',
      
      // Surfaces with coating systems
      surfaces: processedSurfaces,
      
      // Shade schedule
      shadeSchedule: processedShadeSchedule,
      
      // Terms
      warrantyTerms: warrantyTerms || 'Standard warranty as per manufacturer terms',
      exclusions: exclusions || [
        'Structural repairs',
        'Plumbing and electrical work',
        'Furniture moving',
        'Scaffolding for heights above 10ft (charged extra)'
      ],
      specialInstructions: specialInstructions || '',
      
      // Validity
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // Approval workflow
      status: 'draft', // draft, pending_internal, pending_client, approved, rejected
      approvals: [],
      
      // Version history
      versionHistory: [{
        version: 1,
        createdAt: now,
        createdBy: user.id,
        changes: 'Initial version'
      }],
      
      // Metadata
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await specs.insertOne(spec)

    // Update lead with spec reference
    if (leadId) {
      const leads = db.collection('paints_leads')
      await leads.updateOne(
        { id: leadId },
        { 
          $set: { specificationId: spec.id, status: 'spec_in_progress', updatedAt: now },
          $push: {
            activities: {
              id: uuidv4(),
              type: 'spec_created',
              description: `Specification ${specNumber} created`,
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
    }

    return successResponse({ specification: sanitizeDocument(spec) }, 201)
  } catch (error) {
    console.error('Specifications POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create specification', 500, error.message)
  }
}

// PUT - Update specification
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) {
      return errorResponse('Specification ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const specs = db.collection('paints_specifications')

    const existing = await specs.findOne({ id })
    if (!existing) {
      return errorResponse('Specification not found', 404)
    }

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'submit_for_approval') {
      const { approvalType } = updateData // internal, client
      await specs.updateOne(
        { id },
        { 
          $set: { 
            status: approvalType === 'client' ? 'pending_client' : 'pending_internal',
            updatedAt: now 
          },
          $push: {
            approvals: {
              id: uuidv4(),
              type: approvalType,
              status: 'pending',
              submittedAt: now,
              submittedBy: user.id
            }
          }
        }
      )
      return successResponse({ message: 'Submitted for approval' })
    }

    if (action === 'approve') {
      const { approvalId, comments } = updateData
      await specs.updateOne(
        { id, 'approvals.id': approvalId },
        { 
          $set: { 
            'approvals.$.status': 'approved',
            'approvals.$.approvedAt': now,
            'approvals.$.approvedBy': user.id,
            'approvals.$.comments': comments || '',
            status: 'approved',
            approvedAt: now,
            updatedAt: now 
          }
        }
      )
      
      // Update lead status
      if (existing.leadId) {
        const leads = db.collection('paints_leads')
        await leads.updateOne(
          { id: existing.leadId },
          { $set: { status: 'spec_approved', updatedAt: now } }
        )
      }
      
      return successResponse({ message: 'Specification approved' })
    }

    if (action === 'reject') {
      const { approvalId, reason } = updateData
      await specs.updateOne(
        { id, 'approvals.id': approvalId },
        { 
          $set: { 
            'approvals.$.status': 'rejected',
            'approvals.$.rejectedAt': now,
            'approvals.$.rejectedBy': user.id,
            'approvals.$.reason': reason || '',
            status: 'rejected',
            updatedAt: now 
          }
        }
      )
      return successResponse({ message: 'Specification rejected' })
    }

    if (action === 'create_new_version') {
      const newVersion = (existing.version || 1) + 1
      await specs.updateOne(
        { id },
        { 
          $set: { 
            ...updateData,
            version: newVersion,
            status: 'draft',
            updatedAt: now 
          },
          $push: {
            versionHistory: {
              version: newVersion,
              createdAt: now,
              createdBy: user.id,
              changes: updateData.changeNotes || 'New version created'
            }
          }
        }
      )
      return successResponse({ message: 'New version created', version: newVersion })
    }

    if (action === 'add_surface') {
      const newSurface = {
        id: uuidv4(),
        ...updateData.surface
      }
      await specs.updateOne(
        { id },
        { 
          $push: { surfaces: newSurface },
          $set: { updatedAt: now }
        }
      )
      return successResponse({ message: 'Surface added', surfaceId: newSurface.id })
    }

    if (action === 'add_shade') {
      const newShade = {
        id: uuidv4(),
        ...updateData.shade
      }
      await specs.updateOne(
        { id },
        { 
          $push: { shadeSchedule: newShade },
          $set: { updatedAt: now }
        }
      )
      return successResponse({ message: 'Shade added' })
    }

    // Regular update
    await specs.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now, updatedBy: user.id } }
    )

    const updated = await specs.findOne({ id })
    return successResponse({ specification: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Specifications PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update specification', 500, error.message)
  }
}

// DELETE - Delete specification
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Specification ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const specs = db.collection('paints_specifications')

    await specs.deleteOne({ id })

    return successResponse({ message: 'Specification deleted' })
  } catch (error) {
    console.error('Specifications DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete specification', 500, error.message)
  }
}
