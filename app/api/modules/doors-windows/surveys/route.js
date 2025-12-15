import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch surveys and openings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const surveyId = searchParams.get('id')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_surveys')
    
    let query = {}
    if (leadId) query.leadId = leadId
    if (projectId) query.projectId = projectId
    if (status) query.status = status
    if (surveyId) query.id = surveyId

    const surveys = await collection.find(query).sort({ createdAt: -1 }).toArray()

    // If single survey requested, include openings
    if (surveyId && surveys.length > 0) {
      const openingsCollection = db.collection('dw_openings')
      const openings = await openingsCollection.find({ surveyId }).toArray()
      surveys[0].openings = sanitizeDocuments(openings)
    }

    const stats = {
      total: surveys.length,
      pending: surveys.filter(s => s.status === 'pending').length,
      completed: surveys.filter(s => s.status === 'completed').length,
      remeasureRequired: surveys.filter(s => s.remeasureRequired).length,
      totalOpenings: surveys.reduce((sum, s) => sum + (s.openingsCount || 0), 0)
    }

    return successResponse({ surveys: sanitizeDocuments(surveys), stats })
  } catch (error) {
    console.error('DW Surveys GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch surveys', 500, error.message)
  }
}

// POST - Create survey or add opening
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Add opening to existing survey
    if (action === 'add-opening') {
      const openingsCollection = db.collection('dw_openings')
      const surveysCollection = db.collection('dw_surveys')

      const opening = {
        id: uuidv4(),
        surveyId: body.surveyId,
        clientId: user.clientId,
        
        // Location
        floor: body.floor || 'Ground',
        unit: body.unit || '',
        room: body.room || '',
        openingId: body.openingId || `OP-${Date.now()}`,
        
        // Dimensions
        width: parseFloat(body.width) || 0,
        height: parseFloat(body.height) || 0,
        sillHeight: parseFloat(body.sillHeight) || 0,
        area: (parseFloat(body.width) || 0) * (parseFloat(body.height) || 0) / 144, // sq.ft from inches
        
        // Configuration
        type: body.type || 'window', // window, door
        category: body.category || 'sliding', // sliding, casement, fixed, etc.
        configuration: body.configuration || '', // 2-track, 3-track, etc.
        handing: body.handing || '', // L, R
        panels: parseInt(body.panels) || 2,
        
        // Specifications
        systemSeries: body.systemSeries || '',
        glassType: body.glassType || 'single',
        glassThickness: body.glassThickness || '5mm',
        mesh: body.mesh || false,
        grill: body.grill || false,
        hardwareSet: body.hardwareSet || '',
        finish: body.finish || '',
        
        // Notes & Photos
        specialNotes: body.specialNotes || '',
        photos: body.photos || [],
        
        // Geo data
        geoTag: body.geoTag || null,
        measuredAt: new Date(),
        measuredBy: user.id,
        
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await openingsCollection.insertOne(opening)

      // Update survey openings count
      await surveysCollection.updateOne(
        { id: body.surveyId },
        { 
          $inc: { openingsCount: 1 },
          $set: { updatedAt: new Date() }
        }
      )

      return successResponse(sanitizeDocument(opening), 201)
    }

    // Create new survey
    const collection = db.collection('dw_surveys')

    // Generate 6-digit site code if not provided
    const siteCode = body.siteCode || Math.floor(100000 + Math.random() * 900000).toString()

    const survey = {
      id: uuidv4(),
      clientId: user.clientId,
      surveyNumber: `SRV-${Date.now()}`,
      siteCode, // 6-digit site code
      
      // Link to lead/project
      leadId: body.leadId || null,
      projectId: body.projectId || null,
      
      // Basic Info
      siteName: body.siteName || '',
      siteAddress: body.siteAddress || '',
      city: body.city || '',
      pincode: body.pincode || '',
      landmark: body.landmark || '',
      gpsCoordinates: body.gpsCoordinates || '',
      
      // Contact Info
      contactPerson: body.contactPerson || '',
      contactPhone: body.contactPhone || '',
      contactEmail: body.contactEmail || '',
      alternateContact: body.alternateContact || '',
      siteIncharge: body.siteIncharge || '',
      siteInchargePhone: body.siteInchargePhone || '',
      
      // Building Details
      buildingType: body.buildingType || '',
      buildingAge: body.buildingAge || '',
      totalFloors: parseInt(body.totalFloors) || parseInt(body.floors) || 1,
      basementFloors: parseInt(body.basementFloors) || 0,
      buildingOrientation: body.buildingOrientation || '',
      plotArea: body.plotArea || '',
      builtUpArea: body.builtUpArea || '',
      
      // Surveyor Details
      surveyDate: body.surveyDate ? new Date(body.surveyDate) : new Date(),
      surveyStartTime: body.surveyStartTime || '',
      surveyEndTime: body.surveyEndTime || '',
      surveyorId: body.surveyorId || user.id,
      surveyorName: body.surveyorName || user.name || '',
      surveyorPhone: body.surveyorPhone || '',
      surveyorEmail: body.surveyorEmail || '',
      
      // Site Assessment
      siteConditions: body.siteConditions || '',
      accessRestrictions: body.accessRestrictions || '',
      existingFrameType: body.existingFrameType || '',
      existingFrameCondition: body.existingFrameCondition || '',
      demolitionRequired: body.demolitionRequired || false,
      demolitionNotes: body.demolitionNotes || '',
      
      // Environmental
      environmentalFactors: body.environmentalFactors || [],
      noiseLevel: body.noiseLevel || 'normal',
      sunExposure: body.sunExposure || 'moderate',
      
      // Infrastructure
      powerAvailable: body.powerAvailable !== false,
      powerDetails: body.powerDetails || '',
      waterAvailable: body.waterAvailable !== false,
      waterDetails: body.waterDetails || '',
      liftAvailable: body.liftAvailable || false,
      liftDetails: body.liftDetails || '',
      craneLiftRequired: body.craneLiftRequired || false,
      scaffoldingRequired: body.scaffoldingRequired || false,
      parkingAvailable: body.parkingAvailable !== false,
      parkingNotes: body.parkingNotes || '',
      materialStorageSpace: body.materialStorageSpace !== false,
      storageNotes: body.storageNotes || '',
      
      // Work Permissions
      workingHoursRestriction: body.workingHoursRestriction || false,
      workingHoursDetails: body.workingHoursDetails || '',
      weekendWorkAllowed: body.weekendWorkAllowed !== false,
      societyPermission: body.societyPermission || false,
      societyPermissionDetails: body.societyPermissionDetails || '',
      noiseRestrictions: body.noiseRestrictions || false,
      noiseRestrictionTimes: body.noiseRestrictionTimes || '',
      
      // Client Requirements
      primaryRequirement: body.primaryRequirement || '',
      budgetRange: body.budgetRange || '',
      expectedTimeline: body.expectedTimeline || '',
      priorityFeatures: body.priorityFeatures || [],
      aestheticPreference: body.aestheticPreference || '',
      brandPreference: body.brandPreference || '',
      
      // Competition
      competitorQuotes: body.competitorQuotes || false,
      competitorDetails: body.competitorDetails || '',
      
      // Scope
      scopeSummary: body.scopeSummary || '',
      specialInstructions: body.specialInstructions || '',
      
      // Status
      status: body.status || 'pending',
      remeasureRequired: false,
      
      // Counts & Estimates
      openingsCount: 0,
      totalWindowOpenings: 0,
      totalDoorOpenings: 0,
      estimatedArea: 0,
      estimatedValue: 0,
      
      // Photos & Docs
      sitePhotos: body.sitePhotos || body.photos || [],
      documents: body.documents || [],
      
      // Geo
      geoLocation: body.geoLocation || null,
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(survey)
    return successResponse({ survey: sanitizeDocument(survey), id: survey.id, siteCode: survey.siteCode }, 201)
  } catch (error) {
    console.error('DW Surveys POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create survey', 500, error.message)
  }
}

// PUT - Update survey or opening
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Update opening
    if (action === 'update-opening') {
      const collection = db.collection('dw_openings')
      const result = await collection.findOneAndUpdate(
        { id },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Opening not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Mark survey complete
    if (action === 'complete') {
      const collection = db.collection('dw_surveys')
      const result = await collection.findOneAndUpdate(
        { id },
        { 
          $set: { 
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Survey not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Mark remeasure required
    if (action === 'remeasure') {
      const collection = db.collection('dw_surveys')
      const result = await collection.findOneAndUpdate(
        { id },
        { 
          $set: { 
            remeasureRequired: true,
            remeasureReason: updates.reason || '',
            status: 'pending',
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      )
      if (!result) return errorResponse('Survey not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Regular update
    const collection = db.collection('dw_surveys')
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Survey not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Surveys PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update survey', 500, error.message)
  }
}

// DELETE - Delete survey or opening
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'survey' // survey or opening

    if (!id) return errorResponse('ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'opening') {
      const openingsCollection = db.collection('dw_openings')
      const opening = await openingsCollection.findOne({ id })
      if (!opening) return errorResponse('Opening not found', 404)

      await openingsCollection.deleteOne({ id })

      // Update survey count
      const surveysCollection = db.collection('dw_surveys')
      await surveysCollection.updateOne(
        { id: opening.surveyId },
        { $inc: { openingsCount: -1 } }
      )

      return successResponse({ message: 'Opening deleted successfully' })
    }

    // Delete survey and all its openings
    const surveysCollection = db.collection('dw_surveys')
    const openingsCollection = db.collection('dw_openings')

    await openingsCollection.deleteMany({ surveyId: id })
    const result = await surveysCollection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Survey not found', 404)
    return successResponse({ message: 'Survey and all openings deleted successfully' })
  } catch (error) {
    console.error('DW Surveys DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete', 500, error.message)
  }
}
