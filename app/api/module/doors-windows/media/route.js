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
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const mediaType = searchParams.get('mediaType')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('doors_windows_media')

    if (id) {
      const item = await media.findOne({ id })
      if (!item) return errorResponse('Media not found', 404)
      return successResponse(sanitizeDocument(item))
    }

    const query = { isActive: true }
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = entityId
    if (mediaType) query.mediaType = mediaType

    const items = await media.find(query).sort({ createdAt: -1 }).toArray()

    return successResponse({
      media: sanitizeDocuments(items),
      counts: {
        total: items.length,
        images: items.filter(i => i.mediaType === 'image').length,
        models3d: items.filter(i => i.mediaType === '3d_model').length,
        documents: items.filter(i => i.mediaType === 'document').length
      }
    })
  } catch (error) {
    console.error('Doors-Windows Media GET Error:', error)
    return errorResponse('Failed to fetch media', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('doors_windows_media')

    const now = new Date().toISOString()

    const mediaItem = {
      id: uuidv4(),
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      thumbnailUrl: body.thumbnailUrl,
      mediaType: body.mediaType || 'image',
      category: body.category || 'general',
      entityType: body.entityType,
      entityId: body.entityId,
      title: body.title || '',
      description: body.description || '',
      tags: body.tags || [],
      isActive: true,
      uploadedBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await media.insertOne(mediaItem)
    return successResponse(sanitizeDocument(mediaItem), 201)
  } catch (error) {
    console.error('Doors-Windows Media POST Error:', error)
    return errorResponse('Failed to upload media', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Media ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const media = db.collection('doors_windows_media')

    await media.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Media deleted' })
  } catch (error) {
    console.error('Doors-Windows Media DELETE Error:', error)
    return errorResponse('Failed to delete media', 500, error.message)
  }
}
