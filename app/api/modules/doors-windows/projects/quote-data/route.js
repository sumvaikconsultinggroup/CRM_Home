import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch project with complete survey and measurement data for Quote Builder
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return errorResponse('Project ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    // Fetch the project
    const projectsCollection = db.collection('doors_windows_projects')
    const project = await projectsCollection.findOne({ id: projectId })
    
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    // Fetch surveys for this project
    const surveysCollection = db.collection('dw_surveys')
    const surveys = await surveysCollection.find({ projectId }).sort({ createdAt: -1 }).toArray()

    // Fetch openings for all surveys
    const openingsCollection = db.collection('dw_openings')
    let allOpenings = []
    
    // Get openings from each survey
    for (const survey of surveys) {
      const openings = await openingsCollection.find({ surveyId: survey.id }).toArray()
      allOpenings = [...allOpenings, ...openings.map(o => ({
        ...o,
        surveyId: survey.id,
        surveyNumber: survey.surveyNumber,
        surveyStatus: survey.status
      }))]
    }

    // Get the completed/latest survey for primary data
    const completedSurvey = surveys.find(s => s.status === 'completed') || surveys[0]

    // Transform openings to quote items format
    const quoteItems = allOpenings.map((opening, index) => ({
      id: `opening-${opening.id || index}`,
      surveyItemId: opening.id,
      surveyId: opening.surveyId,
      surveyNumber: opening.surveyNumber,
      
      // Type and category
      type: opening.type === 'window' ? 'Window' : opening.type === 'door' ? 'Door' : 'Window',
      category: formatCategory(opening.category || opening.configuration),
      
      // Location
      location: opening.openingId || '',
      floor: opening.floor || 'Ground Floor',
      room: opening.room || opening.unit || 'Living Room',
      
      // Dimensions (convert from inches to mm if needed, or use as-is)
      width: opening.width > 100 ? opening.width : Math.round(opening.width * 25.4), // If in inches, convert to mm
      height: opening.height > 100 ? opening.height : Math.round(opening.height * 25.4),
      
      // Specifications
      material: opening.systemSeries?.toLowerCase().includes('upvc') ? 'UPVC' : 
                opening.systemSeries?.toLowerCase().includes('aluminium') || 
                opening.systemSeries?.toLowerCase().includes('aluminum') ? 'Aluminium' : 'Aluminium',
      glassType: opening.glassType || 'single',
      finish: opening.finish || 'anodized',
      frameColor: opening.frameColor || 'white',
      panels: parseInt(opening.panels) || 2,
      mesh: opening.mesh || false,
      grill: opening.grill || false,
      
      // Quantity
      quantity: 1,
      
      // Notes
      notes: opening.specialNotes || '',
      
      // Source reference
      fromSurvey: true
    }))

    // Prepare the response
    const quoteData = {
      project: sanitizeDocument({
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        siteName: project.siteName,
        siteAddress: project.siteAddress,
        contactPerson: project.contactPerson,
        contactPhone: project.contactPhone,
        contactEmail: project.contactEmail,
        buildingType: project.buildingType,
        expectedValue: project.expectedValue,
        paymentTerms: project.paymentTerms,
        notes: project.notes
      }),
      surveys: sanitizeDocuments(surveys.map(s => ({
        id: s.id,
        surveyNumber: s.surveyNumber,
        status: s.status,
        openingsCount: s.openingsCount,
        completedAt: s.completedAt,
        surveyDate: s.surveyDate
      }))),
      primarySurvey: completedSurvey ? sanitizeDocument({
        id: completedSurvey.id,
        surveyNumber: completedSurvey.surveyNumber,
        status: completedSurvey.status,
        siteName: completedSurvey.siteName,
        siteAddress: completedSurvey.siteAddress,
        contactPerson: completedSurvey.contactPerson,
        contactPhone: completedSurvey.contactPhone
      }) : null,
      quoteItems,
      stats: {
        totalSurveys: surveys.length,
        completedSurveys: surveys.filter(s => s.status === 'completed').length,
        totalOpenings: allOpenings.length,
        windowOpenings: allOpenings.filter(o => o.type === 'window').length,
        doorOpenings: allOpenings.filter(o => o.type === 'door').length
      }
    }

    return successResponse(quoteData)
  } catch (error) {
    console.error('DW Project Quote Data GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch project quote data', 500, error.message)
  }
}

// Helper function to format category names
function formatCategory(category) {
  if (!category) return 'Sliding'
  
  const categoryMap = {
    'sliding': 'Sliding',
    '2-track': 'Sliding',
    '3-track': 'Sliding',
    '2-track sliding': 'Sliding',
    '3-track sliding': 'Sliding',
    'casement': 'Casement',
    'tilt-turn': 'Tilt & Turn',
    'tilt turn': 'Tilt & Turn',
    'fixed': 'Fixed',
    'awning': 'Awning',
    'pivot': 'Pivot',
    'bi-fold': 'Bi-fold',
    'bifold': 'Bi-fold',
    'lift-slide': 'Lift & Slide',
    'swing': 'Swing Door',
    'entrance': 'Entrance Door',
    'french': 'French Door'
  }
  
  const lowerCategory = category.toLowerCase()
  return categoryMap[lowerCategory] || category.charAt(0).toUpperCase() + category.slice(1)
}
