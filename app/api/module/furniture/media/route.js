import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch media/attachments
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const entityType = searchParams.get('entityType') // requirement, quote, order, product, etc.
    const entityId = searchParams.get('entityId')
    const mediaType = searchParams.get('mediaType') // image, video, 3d_model, document, audio
    const category = searchParams.get('category') // design, reference, site_photo, material_swatch, render, etc.

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('furniture_media')

    if (id) {
      const item = await media.findOne({ id })
      if (!item) return errorResponse('Media not found', 404)
      return successResponse(sanitizeDocument(item))
    }

    const query = { isActive: true }
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = entityId
    if (mediaType) query.mediaType = mediaType
    if (category) query.category = category

    const items = await media.find(query).sort({ sortOrder: 1, createdAt: -1 }).toArray()

    // Group by category
    const grouped = items.reduce((acc, item) => {
      const cat = item.category || 'uncategorized'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})

    return successResponse({
      media: sanitizeDocuments(items),
      grouped,
      counts: {
        total: items.length,
        images: items.filter(i => i.mediaType === 'image').length,
        videos: items.filter(i => i.mediaType === 'video').length,
        models3d: items.filter(i => i.mediaType === '3d_model').length,
        documents: items.filter(i => i.mediaType === 'document').length
      }
    })
  } catch (error) {
    console.error('Furniture Media GET Error:', error)
    return errorResponse('Failed to fetch media', 500, error.message)
  }
}

// POST - Upload/create media entry
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('furniture_media')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const mediaId = uuidv4()

    // Determine media type from file extension or provided type
    let mediaType = body.mediaType
    if (!mediaType && body.fileName) {
      const ext = body.fileName.split('.').pop().toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) mediaType = 'image'
      else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) mediaType = 'video'
      else if (['glb', 'gltf', 'obj', 'fbx', '3ds', 'stl', 'skp'].includes(ext)) mediaType = '3d_model'
      else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) mediaType = 'audio'
      else mediaType = 'document'
    }

    const mediaItem = {
      id: mediaId,
      // File info
      fileName: body.fileName,
      originalName: body.originalName || body.fileName,
      fileUrl: body.fileUrl, // URL where file is stored
      thumbnailUrl: body.thumbnailUrl || null,
      fileSize: body.fileSize || 0,
      mimeType: body.mimeType || '',
      // Type and category
      mediaType, // image, video, 3d_model, document, audio
      category: body.category || 'general', // design_render, site_photo, reference, material_swatch, mood_board, cad_drawing, client_approval, etc.
      // Entity linking
      entityType: body.entityType, // requirement, quotation, order, product, design_brief
      entityId: body.entityId,
      // For quotes - specific section
      quoteSection: body.quoteSection || null, // cover, hero, product_gallery, specifications, mood_board
      // 3D Model specific
      model3dConfig: body.model3dConfig || {
        autoRotate: true,
        backgroundColor: '#f5f5f5',
        cameraPosition: [0, 0, 5],
        lighting: 'studio'
      },
      // Image specific
      imageConfig: body.imageConfig || {
        width: body.width || 0,
        height: body.height || 0,
        aspectRatio: body.aspectRatio || null
      },
      // Video specific
      videoConfig: body.videoConfig || {
        duration: body.duration || 0,
        hasAudio: body.hasAudio || false
      },
      // Annotations (for room photos with measurements, etc.)
      annotations: body.annotations || [],
      // Metadata
      title: body.title || '',
      description: body.description || '',
      tags: body.tags || [],
      altText: body.altText || '',
      // Designer notes (voice/text)
      designerNotes: body.designerNotes || '',
      voiceNoteUrl: body.voiceNoteUrl || null,
      // Display settings
      sortOrder: body.sortOrder || 0,
      showInGallery: body.showInGallery !== false,
      showInQuote: body.showInQuote !== false,
      isFeatured: body.isFeatured || false,
      isClientUploaded: body.isClientUploaded || false,
      // AR/VR
      arEnabled: body.arEnabled || false,
      arConfig: body.arConfig || null,
      // Version tracking (for design iterations)
      version: 1,
      previousVersions: [],
      // Approval
      approvalStatus: 'pending', // pending, approved, rejected, revision_requested
      approvedBy: null,
      approvedAt: null,
      clientFeedback: [],
      // Metadata
      isActive: true,
      uploadedBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await media.insertOne(mediaItem)

    await events.insertOne({
      id: uuidv4(),
      type: 'media.uploaded',
      entityType: body.entityType,
      entityId: body.entityId,
      data: { mediaId, mediaType, category: mediaItem.category, fileName: body.fileName },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(mediaItem), 201)
  } catch (error) {
    console.error('Furniture Media POST Error:', error)
    return errorResponse('Failed to upload media', 500, error.message)
  }
}

// PUT - Update media
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Media ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('furniture_media')

    const item = await media.findOne({ id })
    if (!item) return errorResponse('Media not found', 404)

    const now = new Date().toISOString()

    // Handle actions
    if (action === 'add_annotation') {
      const annotation = {
        id: uuidv4(),
        type: body.annotationType || 'measurement', // measurement, note, dimension, callout
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        content: body.content,
        style: body.style || {},
        createdBy: user.id,
        createdAt: now
      }

      await media.updateOne(
        { id },
        { $push: { annotations: annotation }, $set: { updatedAt: now } }
      )

      return successResponse({ message: 'Annotation added', annotation })
    }

    if (action === 'client_feedback') {
      const feedback = {
        id: uuidv4(),
        type: body.feedbackType || 'comment', // comment, approval, revision_request
        message: body.message,
        rating: body.rating || null,
        position: body.position || null, // x,y for pinned comments
        by: user.id,
        at: now
      }

      let newStatus = item.approvalStatus
      if (body.feedbackType === 'approval') newStatus = 'approved'
      if (body.feedbackType === 'revision_request') newStatus = 'revision_requested'

      await media.updateOne(
        { id },
        {
          $push: { clientFeedback: feedback },
          $set: { approvalStatus: newStatus, updatedAt: now }
        }
      )

      return successResponse({ message: 'Feedback recorded', feedback })
    }

    if (action === 'create_version') {
      // Save current as previous version
      const previousVersion = {
        version: item.version,
        fileUrl: item.fileUrl,
        thumbnailUrl: item.thumbnailUrl,
        savedAt: now,
        savedBy: user.id
      }

      await media.updateOne(
        { id },
        {
          $push: { previousVersions: previousVersion },
          $set: {
            version: item.version + 1,
            fileUrl: body.newFileUrl,
            thumbnailUrl: body.newThumbnailUrl || item.thumbnailUrl,
            updatedAt: now
          }
        }
      )

      return successResponse({ message: 'New version created', version: item.version + 1 })
    }

    if (action === 'reorder') {
      const { mediaIds } = body // Array of media IDs in new order
      
      for (let i = 0; i < mediaIds.length; i++) {
        await media.updateOne(
          { id: mediaIds[i] },
          { $set: { sortOrder: i, updatedAt: now } }
        )
      }

      return successResponse({ message: 'Media reordered' })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await media.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Media PUT Error:', error)
    return errorResponse('Failed to update media', 500, error.message)
  }
}

// DELETE - Delete media
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Media ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('furniture_media')

    await media.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Media deleted' })
  } catch (error) {
    console.error('Furniture Media DELETE Error:', error)
    return errorResponse('Failed to delete media', 500, error.message)
  }
}
