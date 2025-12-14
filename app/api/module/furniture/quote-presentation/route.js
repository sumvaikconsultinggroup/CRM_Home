import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get quote presentation data (rich formatted quote for PDF/display)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quoteId')
    const format = searchParams.get('format') || 'full' // full, summary, pdf

    if (!quoteId) return errorResponse('Quote ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('furniture_quotations')
    const media = db.collection('furniture_media')
    const settings = db.collection('furniture_settings')

    const quote = await quotes.findOne({ id: quoteId })
    if (!quote) return errorResponse('Quote not found', 404)

    // Get all media for this quote
    const quoteMedia = await media.find({
      entityType: 'quotation',
      entityId: quoteId,
      isActive: true
    }).sort({ quoteSection: 1, sortOrder: 1 }).toArray()

    // Get company settings
    const companySettings = await settings.findOne({ clientId: user.clientId })

    // Organize media by section
    const mediaBySection = quoteMedia.reduce((acc, m) => {
      const section = m.quoteSection || 'general'
      if (!acc[section]) acc[section] = []
      acc[section].push(m)
      return acc
    }, {})

    // Build presentation structure
    const presentation = {
      // Quote metadata
      quoteNumber: quote.quoteNumber,
      version: quote.version,
      status: quote.status,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      
      // Company branding
      company: {
        name: companySettings?.general?.companyName || 'Furniture Company',
        logo: companySettings?.general?.logo || null,
        primaryColor: companySettings?.general?.primaryColor || '#6366f1',
        secondaryColor: companySettings?.general?.secondaryColor || '#8b5cf6',
        address: companySettings?.general?.address || {},
        phone: companySettings?.general?.contactPhone || '',
        email: companySettings?.general?.contactEmail || '',
        gstNumber: companySettings?.general?.gstNumber || ''
      },

      // Customer info
      customer: quote.customer,

      // Sections for the presentation
      sections: {
        // 1. Cover page
        cover: {
          title: quote.lineItems?.[0]?.productName || 'Custom Furniture Quote',
          subtitle: `Quotation ${quote.quoteNumber}`,
          heroImage: mediaBySection.cover?.[0] || mediaBySection.hero?.[0] || null,
          date: quote.createdAt
        },

        // 2. Introduction/Project Overview
        introduction: {
          greeting: `Dear ${quote.customer?.name || 'Valued Customer'},`,
          message: quote.notes || 'Thank you for considering us for your custom furniture needs. We are pleased to present this quotation for your review.',
          designerVideo: mediaBySection.designer_video?.[0] || null,
          voiceNote: mediaBySection.voice_note?.[0] || null
        },

        // 3. Mood Board / Design Inspiration
        moodBoard: {
          images: mediaBySection.mood_board || [],
          referenceImages: mediaBySection.reference || [],
          colorPalette: quote.lineItems?.flatMap(item => item.customizations?.filter(c => c.type === 'color') || []) || []
        },

        // 4. Design Renders / 3D Models
        designShowcase: {
          renders: mediaBySection.design_render || [],
          models3d: quoteMedia.filter(m => m.mediaType === '3d_model'),
          arEnabled: quoteMedia.some(m => m.arEnabled),
          roomPlacements: mediaBySection.room_placement || []
        },

        // 5. Product Details
        products: quote.lineItems?.map(item => ({
          ...item,
          gallery: mediaBySection[`product_${item.id}`] || [],
          materialSwatches: mediaBySection.material_swatch?.filter(m => 
            m.tags?.includes(item.productId) || m.tags?.includes(item.id)
          ) || [],
          specifications: {
            dimensions: item.dimensions,
            materials: item.specifications?.materials || [],
            finish: item.specifications?.finish || '',
            fabric: item.specifications?.fabric || '',
            hardware: item.specifications?.hardware || []
          }
        })) || [],

        // 6. Material Library
        materials: {
          swatches: mediaBySection.material_swatch || [],
          woodSamples: mediaBySection.wood_sample || [],
          fabricSamples: mediaBySection.fabric_sample || [],
          finishOptions: mediaBySection.finish_option || []
        },

        // 7. Site Photos (with measurements/annotations)
        siteDocumentation: {
          photos: mediaBySection.site_photo || [],
          measurements: mediaBySection.measurement || [],
          floorPlan: mediaBySection.floor_plan?.[0] || null
        },

        // 8. Pricing breakdown
        pricing: {
          lineItems: quote.lineItems?.map(item => ({
            name: item.productName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.lineTotal,
            breakdown: {
              materials: item.materialCost,
              labor: item.laborCost,
              hardware: item.hardwareCost
            }
          })) || [],
          subtotal: quote.subtotal,
          discount: {
            percent: quote.discountPercent,
            amount: quote.discountAmount
          },
          tax: {
            percent: quote.taxPercent,
            amount: quote.taxAmount
          },
          grandTotal: quote.grandTotal
        },

        // 9. Timeline visualization
        timeline: {
          estimatedDays: quote.lineItems?.reduce((max, item) => Math.max(max, item.leadTime || 15), 0),
          milestones: [
            { name: 'Order Confirmation', day: 0 },
            { name: 'Design Finalization', day: 3 },
            { name: 'Material Procurement', day: 7 },
            { name: 'Production Start', day: 10 },
            { name: 'Quality Check', day: quote.lineItems?.[0]?.leadTime - 5 || 15 },
            { name: 'Delivery & Installation', day: quote.lineItems?.[0]?.leadTime || 21 }
          ]
        },

        // 10. Payment terms
        paymentTerms: {
          terms: quote.paymentTerms,
          schedule: [
            { milestone: 'Advance', percent: quote.paymentTerms?.advance || 50, description: 'On order confirmation' },
            { milestone: 'On Delivery', percent: quote.paymentTerms?.onDelivery || 40, description: 'Before dispatch' },
            { milestone: 'After Installation', percent: quote.paymentTerms?.afterInstallation || 10, description: 'Post installation sign-off' }
          ],
          bankDetails: companySettings?.bankDetails || {}
        },

        // 11. Terms & Warranty
        terms: {
          deliveryTerms: quote.deliveryTerms,
          warrantyTerms: quote.warrantyTerms,
          additionalTerms: quote.terms || []
        },

        // 12. Call to action
        callToAction: {
          validUntil: quote.validUntil,
          acceptButton: true,
          scheduleCallButton: true,
          viewInARButton: quoteMedia.some(m => m.arEnabled)
        }
      },

      // Configuration options for display
      displayConfig: {
        theme: 'luxury', // luxury, modern, minimal, classic
        showPricingBreakdown: true,
        show3DViewer: quoteMedia.some(m => m.mediaType === '3d_model'),
        showTimeline: true,
        showMaterialLibrary: true,
        enableAR: quoteMedia.some(m => m.arEnabled),
        enableComments: true
      },

      // All media for reference
      allMedia: sanitizeDocuments(quoteMedia)
    }

    return successResponse(presentation)
  } catch (error) {
    console.error('Quote Presentation GET Error:', error)
    return errorResponse('Failed to build presentation', 500, error.message)
  }
}

// POST - Generate PDF or save presentation config
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action, quoteId } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const quotes = db.collection('furniture_quotations')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()

    if (action === 'save_presentation_config') {
      const { config } = body

      await quotes.updateOne(
        { id: quoteId },
        {
          $set: {
            presentationConfig: config,
            updatedAt: now
          }
        }
      )

      return successResponse({ message: 'Presentation config saved' })
    }

    if (action === 'generate_share_link') {
      const shareToken = uuidv4().replace(/-/g, '')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

      await quotes.updateOne(
        { id: quoteId },
        {
          $set: {
            shareToken,
            shareExpiresAt: expiresAt,
            updatedAt: now
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'quote.share_link_generated',
        entityType: 'quotation',
        entityId: quoteId,
        data: { expiresAt },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: 'Share link generated',
        shareToken,
        expiresAt,
        shareUrl: `/quote/view/${shareToken}`
      })
    }

    if (action === 'record_view') {
      await quotes.updateOne(
        { id: quoteId },
        {
          $inc: { viewCount: 1 },
          $push: {
            viewHistory: {
              timestamp: now,
              userAgent: body.userAgent || '',
              duration: body.duration || 0
            }
          }
        }
      )

      return successResponse({ message: 'View recorded' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Quote Presentation POST Error:', error)
    return errorResponse('Failed to process request', 500, error.message)
  }
}
