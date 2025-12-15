import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Surface condition options
const SURFACE_CONDITIONS = [
  { id: 'good', label: 'Good Condition', severity: 0 },
  { id: 'minor_cracks', label: 'Minor Cracks', severity: 1 },
  { id: 'major_cracks', label: 'Major Cracks', severity: 3 },
  { id: 'dampness', label: 'Dampness', severity: 2 },
  { id: 'seepage', label: 'Active Seepage', severity: 4 },
  { id: 'fungal', label: 'Fungal/Mold Growth', severity: 3 },
  { id: 'peeling', label: 'Paint Peeling', severity: 2 },
  { id: 'efflorescence', label: 'Efflorescence', severity: 2 },
  { id: 'chalking', label: 'Chalking', severity: 1 }
]

// GET - Fetch surveys
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
    const surveys = db.collection('paints_surveys')

    // Single survey fetch
    if (id) {
      const survey = await surveys.findOne({ id })
      if (!survey) {
        return errorResponse('Survey not found', 404)
      }
      return successResponse({ survey: sanitizeDocument(survey), conditions: SURFACE_CONDITIONS })
    }

    // Build filter
    const filter = {}
    if (leadId) filter.leadId = leadId
    if (projectId) filter.projectId = projectId
    if (status) filter.status = status

    const result = await surveys.find(filter).sort({ createdAt: -1 }).toArray()

    return successResponse({ 
      surveys: sanitizeDocuments(result),
      conditions: SURFACE_CONDITIONS
    })
  } catch (error) {
    console.error('Surveys GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch surveys', 500, error.message)
  }
}

// POST - Create survey
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      leadId,
      projectId,
      siteName,
      siteAddress,
      contactPerson,
      contactPhone,
      surveyDate,
      surveyor,
      areas,
      overallCondition,
      recommendations,
      photos,
      notes
    } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const surveys = db.collection('paints_surveys')

    // Generate survey number
    const count = await surveys.countDocuments()
    const surveyNumber = `SRV-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()

    // Calculate totals from areas
    let totalArea = 0
    let totalWallArea = 0
    let totalCeilingArea = 0
    let totalFloorArea = 0

    const processedAreas = (areas || []).map(area => {
      const areaTotal = (area.wallArea || 0) + (area.ceilingArea || 0) + (area.floorArea || 0)
      totalArea += areaTotal
      totalWallArea += area.wallArea || 0
      totalCeilingArea += area.ceilingArea || 0
      totalFloorArea += area.floorArea || 0

      return {
        id: area.id || uuidv4(),
        name: area.name || 'Area',
        type: area.type || 'room', // room, hall, bathroom, kitchen, exterior, etc.
        
        // Dimensions
        length: area.length || 0,
        width: area.width || 0,
        height: area.height || 0,
        
        // Calculated areas
        wallArea: area.wallArea || 0,
        ceilingArea: area.ceilingArea || 0,
        floorArea: area.floorArea || 0,
        
        // Surface details
        surfaceType: area.surfaceType || 'new_plaster',
        existingFinish: area.existingFinish || 'none',
        conditions: area.conditions || [],
        
        // Readings
        moistureReading: area.moistureReading || null,
        
        // Requirements
        workRequired: area.workRequired || [], // prep, primer, putty, paint, etc.
        recommendedSystem: area.recommendedSystem || null,
        
        // Photos
        photos: area.photos || [],
        
        // Notes
        notes: area.notes || ''
      }
    })

    const survey = {
      id: uuidv4(),
      surveyNumber,
      clientId: user.clientId,
      
      // Relations
      leadId: leadId || null,
      projectId: projectId || null,
      
      // Site info
      siteName: siteName || '',
      siteAddress: siteAddress || '',
      contactPerson: contactPerson || '',
      contactPhone: contactPhone || '',
      
      // Survey details
      surveyDate: surveyDate || now.split('T')[0],
      surveyor: surveyor || user.id,
      surveyorName: user.name || user.email,
      
      // Areas with detailed measurements
      areas: processedAreas,
      
      // Totals
      totalArea,
      totalWallArea,
      totalCeilingArea,
      totalFloorArea,
      
      // Overall assessment
      overallCondition: overallCondition || 'good',
      recommendations: recommendations || '',
      
      // Photos (site-level)
      photos: photos || [],
      
      // Notes
      notes: notes || '',
      
      // Status
      status: 'draft', // draft, completed, approved
      
      // Metadata
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await surveys.insertOne(survey)

    // Update lead with survey reference
    if (leadId) {
      const leads = db.collection('paints_leads')
      await leads.updateOne(
        { id: leadId },
        { 
          $set: { surveyId: survey.id, status: 'surveyed', updatedAt: now },
          $push: {
            activities: {
              id: uuidv4(),
              type: 'survey_created',
              description: `Survey ${surveyNumber} created`,
              by: user.id,
              byName: user.name || user.email,
              timestamp: now
            }
          }
        }
      )
    }

    return successResponse({ survey: sanitizeDocument(survey) }, 201)
  } catch (error) {
    console.error('Surveys POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create survey', 500, error.message)
  }
}

// PUT - Update survey
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) {
      return errorResponse('Survey ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const surveys = db.collection('paints_surveys')

    const existing = await surveys.findOne({ id })
    if (!existing) {
      return errorResponse('Survey not found', 404)
    }

    const now = new Date().toISOString()

    // Handle specific actions
    if (action === 'complete') {
      await surveys.updateOne(
        { id },
        { $set: { status: 'completed', completedAt: now, updatedAt: now } }
      )
      return successResponse({ message: 'Survey marked as completed' })
    }

    if (action === 'add_area') {
      const newArea = {
        id: uuidv4(),
        ...updateData.area
      }
      await surveys.updateOne(
        { id },
        { 
          $push: { areas: newArea },
          $set: { updatedAt: now }
        }
      )
      return successResponse({ message: 'Area added', areaId: newArea.id })
    }

    if (action === 'update_area') {
      const { areaId, areaData } = updateData
      await surveys.updateOne(
        { id, 'areas.id': areaId },
        { 
          $set: { 
            'areas.$': { id: areaId, ...areaData },
            updatedAt: now 
          }
        }
      )
      return successResponse({ message: 'Area updated' })
    }

    if (action === 'remove_area') {
      const { areaId } = updateData
      await surveys.updateOne(
        { id },
        { 
          $pull: { areas: { id: areaId } },
          $set: { updatedAt: now }
        }
      )
      return successResponse({ message: 'Area removed' })
    }

    if (action === 'add_photo') {
      const { areaId, photo } = updateData
      if (areaId) {
        await surveys.updateOne(
          { id, 'areas.id': areaId },
          { 
            $push: { 'areas.$.photos': photo },
            $set: { updatedAt: now }
          }
        )
      } else {
        await surveys.updateOne(
          { id },
          { 
            $push: { photos: photo },
            $set: { updatedAt: now }
          }
        )
      }
      return successResponse({ message: 'Photo added' })
    }

    // Recalculate totals if areas are updated
    if (updateData.areas) {
      let totalArea = 0
      let totalWallArea = 0
      let totalCeilingArea = 0
      let totalFloorArea = 0

      updateData.areas.forEach(area => {
        totalArea += (area.wallArea || 0) + (area.ceilingArea || 0) + (area.floorArea || 0)
        totalWallArea += area.wallArea || 0
        totalCeilingArea += area.ceilingArea || 0
        totalFloorArea += area.floorArea || 0
      })

      updateData.totalArea = totalArea
      updateData.totalWallArea = totalWallArea
      updateData.totalCeilingArea = totalCeilingArea
      updateData.totalFloorArea = totalFloorArea
    }

    // Regular update
    await surveys.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now, updatedBy: user.id } }
    )

    const updated = await surveys.findOne({ id })
    return successResponse({ survey: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Surveys PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update survey', 500, error.message)
  }
}

// DELETE - Delete survey
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Survey ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const surveys = db.collection('paints_surveys')

    await surveys.deleteOne({ id })

    return successResponse({ message: 'Survey deleted' })
  } catch (error) {
    console.error('Surveys DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete survey', 500, error.message)
  }
}
