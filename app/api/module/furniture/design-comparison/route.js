import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get design comparisons
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const comparisons = db.collection('furniture_design_comparisons')

    if (id) {
      const comparison = await comparisons.findOne({ id })
      if (!comparison) return errorResponse('Comparison not found', 404)
      return successResponse(sanitizeDocument(comparison))
    }

    const query = { isActive: true }
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = entityId

    const items = await comparisons.find(query).sort({ createdAt: -1 }).toArray()

    return successResponse({ comparisons: sanitizeDocuments(items) })
  } catch (error) {
    console.error('Design Comparison GET Error:', error)
    return errorResponse('Failed to fetch comparisons', 500, error.message)
  }
}

// POST - Create design comparison (side-by-side configurations)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const comparisons = db.collection('furniture_design_comparisons')

    const now = new Date().toISOString()
    const comparisonId = uuidv4()

    // Calculate price difference
    const options = body.options || []
    const basePriceOption = options[0]
    const optionsWithDiff = options.map((opt, idx) => ({
      ...opt,
      priceDifference: idx === 0 ? 0 : (opt.totalPrice || 0) - (basePriceOption?.totalPrice || 0),
      priceDifferencePercent: idx === 0 ? 0 : 
        basePriceOption?.totalPrice ? 
          (((opt.totalPrice || 0) - basePriceOption.totalPrice) / basePriceOption.totalPrice * 100).toFixed(1) : 0
    }))

    const comparison = {
      id: comparisonId,
      // Link to requirement/quote
      entityType: body.entityType, // requirement, quotation, design_brief
      entityId: body.entityId,
      // Comparison details
      title: body.title || 'Design Options Comparison',
      description: body.description || '',
      // Options to compare (2-4 typically)
      options: optionsWithDiff.map((opt, idx) => ({
        id: opt.id || uuidv4(),
        name: opt.name || `Option ${idx + 1}`,
        description: opt.description || '',
        // Visual
        thumbnail: opt.thumbnail,
        renderImage: opt.renderImage,
        model3dUrl: opt.model3dUrl,
        gallery: opt.gallery || [],
        // Specifications
        dimensions: opt.dimensions || {},
        materials: opt.materials || [],
        finish: opt.finish || '',
        fabric: opt.fabric || '',
        hardware: opt.hardware || [],
        customizations: opt.customizations || [],
        // Pricing
        materialCost: opt.materialCost || 0,
        laborCost: opt.laborCost || 0,
        hardwareCost: opt.hardwareCost || 0,
        totalPrice: opt.totalPrice || 0,
        priceDifference: opt.priceDifference,
        priceDifferencePercent: opt.priceDifferencePercent,
        // Lead time
        leadTimeDays: opt.leadTimeDays || 21,
        // Pros/Cons
        highlights: opt.highlights || [],
        considerations: opt.considerations || [],
        // Recommendation
        isRecommended: opt.isRecommended || false,
        recommendationReason: opt.recommendationReason || ''
      })),
      // Comparison criteria
      criteria: body.criteria || [
        { name: 'Price', weight: 30 },
        { name: 'Quality', weight: 25 },
        { name: 'Durability', weight: 20 },
        { name: 'Aesthetics', weight: 15 },
        { name: 'Lead Time', weight: 10 }
      ],
      // Client selection
      selectedOptionId: null,
      selectionDate: null,
      selectionNotes: '',
      // Designer recommendation
      recommendedOptionId: body.recommendedOptionId || null,
      recommendationNotes: body.recommendationNotes || '',
      // Status
      status: 'pending', // pending, client_reviewing, selected, expired
      // Sharing
      shareToken: uuidv4().replace(/-/g, ''),
      sharedAt: null,
      viewedAt: null,
      // Notes
      designerNotes: body.designerNotes || '',
      clientComments: [],
      // Metadata
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await comparisons.insertOne(comparison)

    return successResponse(sanitizeDocument(comparison), 201)
  } catch (error) {
    console.error('Design Comparison POST Error:', error)
    return errorResponse('Failed to create comparison', 500, error.message)
  }
}

// PUT - Update comparison (client selection, comments)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Comparison ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const comparisons = db.collection('furniture_design_comparisons')
    const events = db.collection('furniture_events')

    const comparison = await comparisons.findOne({ id })
    if (!comparison) return errorResponse('Comparison not found', 404)

    const now = new Date().toISOString()

    if (action === 'client_select') {
      const { optionId, notes } = body

      await comparisons.updateOne(
        { id },
        {
          $set: {
            selectedOptionId: optionId,
            selectionDate: now,
            selectionNotes: notes || '',
            status: 'selected',
            updatedAt: now
          }
        }
      )

      const selectedOption = comparison.options.find(o => o.id === optionId)

      await events.insertOne({
        id: uuidv4(),
        type: 'comparison.option_selected',
        entityType: comparison.entityType,
        entityId: comparison.entityId,
        data: { 
          comparisonId: id, 
          optionId, 
          optionName: selectedOption?.name,
          totalPrice: selectedOption?.totalPrice
        },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: 'Option selected',
        selectedOption: selectedOption?.name
      })
    }

    if (action === 'add_comment') {
      const { optionId, comment, position } = body

      const clientComment = {
        id: uuidv4(),
        optionId,
        comment,
        position, // {x, y} for pinned comments on images
        by: user.id,
        at: now
      }

      await comparisons.updateOne(
        { id },
        {
          $push: { clientComments: clientComment },
          $set: { updatedAt: now }
        }
      )

      return successResponse({ message: 'Comment added', comment: clientComment })
    }

    if (action === 'share') {
      await comparisons.updateOne(
        { id },
        {
          $set: { 
            sharedAt: now, 
            status: 'client_reviewing',
            updatedAt: now 
          }
        }
      )

      return successResponse({ 
        message: 'Comparison shared',
        shareUrl: `/compare/${comparison.shareToken}`
      })
    }

    // Regular update
    updateData.updatedAt = now

    const result = await comparisons.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Design Comparison PUT Error:', error)
    return errorResponse('Failed to update comparison', 500, error.message)
  }
}
