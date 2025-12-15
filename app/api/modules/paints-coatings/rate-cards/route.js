import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch rate cards (labor rates for service jobs)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // labor, material, package
    const surfaceType = searchParams.get('surfaceType')
    const isActive = searchParams.get('isActive')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rateCards = db.collection('paints_rate_cards')

    // Single rate card fetch
    if (id) {
      const rateCard = await rateCards.findOne({ id })
      if (!rateCard) {
        return errorResponse('Rate card not found', 404)
      }
      return successResponse({ rateCard: sanitizeDocument(rateCard) })
    }

    // Build filter
    const filter = {}
    if (type) filter.type = type
    if (surfaceType) filter.surfaceType = surfaceType
    if (isActive !== null && isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }

    const result = await rateCards.find(filter).sort({ name: 1 }).toArray()

    // If no custom rate cards, return defaults
    if (result.length === 0) {
      const defaults = getDefaultRateCards()
      return successResponse({ rateCards: defaults, isDefault: true })
    }

    return successResponse({ rateCards: sanitizeDocuments(result) })
  } catch (error) {
    console.error('Rate Cards GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch rate cards', 500, error.message)
  }
}

// POST - Create rate card
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      name,
      type,
      surfaceType,
      conditionGrade,
      rates,
      consumptionNorms,
      description,
      validFrom,
      validTo
    } = body

    if (!name || !type) {
      return errorResponse('Name and type are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rateCards = db.collection('paints_rate_cards')

    const now = new Date().toISOString()
    const rateCard = {
      id: uuidv4(),
      name,
      type, // labor, material, package, consumption
      surfaceType: surfaceType || 'all',
      conditionGrade: conditionGrade || 'good',
      description: description || '',
      
      // Rates (per sqft/sqm)
      rates: rates || {
        perSqft: 0,
        perSqm: 0,
        unit: 'sqft',
        currency: 'INR'
      },
      
      // Consumption norms (for materials)
      consumptionNorms: consumptionNorms || {
        coveragePerLitre: 0, // sqft
        recommendedCoats: 2,
        wastagePercentage: 5,
        dilutionPercentage: 0
      },
      
      // Validity
      validFrom: validFrom || now,
      validTo: validTo || null,
      
      // Metadata
      clientId: user.clientId,
      isActive: true,
      createdAt: now,
      createdBy: user.id,
      updatedAt: now
    }

    await rateCards.insertOne(rateCard)

    return successResponse({ rateCard: sanitizeDocument(rateCard) }, 201)
  } catch (error) {
    console.error('Rate Cards POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create rate card', 500, error.message)
  }
}

// PUT - Update rate card
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Rate card ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rateCards = db.collection('paints_rate_cards')

    const now = new Date().toISOString()
    await rateCards.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: now, updatedBy: user.id } }
    )

    const updated = await rateCards.findOne({ id })
    return successResponse({ rateCard: sanitizeDocument(updated) })
  } catch (error) {
    console.error('Rate Cards PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update rate card', 500, error.message)
  }
}

// DELETE - Delete rate card
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Rate card ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rateCards = db.collection('paints_rate_cards')

    await rateCards.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Rate card deleted' })
  } catch (error) {
    console.error('Rate Cards DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete rate card', 500, error.message)
  }
}

// Default rate cards
function getDefaultRateCards() {
  return [
    // Labor rates by work type
    {
      id: 'labor_prep_basic',
      name: 'Surface Preparation - Basic',
      type: 'labor',
      surfaceType: 'all',
      conditionGrade: 'good',
      rates: { perSqft: 3, perSqm: 32, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_prep_medium',
      name: 'Surface Preparation - Medium',
      type: 'labor',
      surfaceType: 'all',
      conditionGrade: 'minor_cracks',
      rates: { perSqft: 5, perSqm: 54, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_prep_heavy',
      name: 'Surface Preparation - Heavy',
      type: 'labor',
      surfaceType: 'all',
      conditionGrade: 'severe',
      rates: { perSqft: 8, perSqm: 86, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_primer',
      name: 'Primer Application',
      type: 'labor',
      surfaceType: 'all',
      rates: { perSqft: 2, perSqm: 22, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_putty',
      name: 'Putty Application (2 coats)',
      type: 'labor',
      surfaceType: 'all',
      rates: { perSqft: 6, perSqm: 65, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_paint_interior',
      name: 'Interior Paint Application',
      type: 'labor',
      surfaceType: 'interior',
      rates: { perSqft: 4, perSqm: 43, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_paint_exterior',
      name: 'Exterior Paint Application',
      type: 'labor',
      surfaceType: 'exterior',
      rates: { perSqft: 5, perSqm: 54, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_texture',
      name: 'Texture Paint Application',
      type: 'labor',
      surfaceType: 'all',
      rates: { perSqft: 12, perSqm: 129, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    {
      id: 'labor_wood_polish',
      name: 'Wood Polish/PU',
      type: 'labor',
      surfaceType: 'wood',
      rates: { perSqft: 25, perSqm: 269, unit: 'sqft', currency: 'INR' },
      isDefault: true
    },
    // Consumption norms
    {
      id: 'consumption_primer',
      name: 'Primer Consumption',
      type: 'consumption',
      consumptionNorms: {
        coveragePerLitre: 120,
        recommendedCoats: 1,
        wastagePercentage: 5,
        dilutionPercentage: 20
      },
      isDefault: true
    },
    {
      id: 'consumption_putty',
      name: 'Putty Consumption',
      type: 'consumption',
      consumptionNorms: {
        coveragePerKg: 20,
        recommendedCoats: 2,
        wastagePercentage: 10
      },
      isDefault: true
    },
    {
      id: 'consumption_emulsion',
      name: 'Emulsion Paint Consumption',
      type: 'consumption',
      consumptionNorms: {
        coveragePerLitre: 100,
        recommendedCoats: 2,
        wastagePercentage: 5,
        dilutionPercentage: 40
      },
      isDefault: true
    }
  ]
}
