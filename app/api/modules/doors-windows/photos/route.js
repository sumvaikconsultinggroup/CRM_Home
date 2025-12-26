import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Upload photo for opening
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const formData = await request.formData()
    const file = formData.get('file')
    const surveyId = formData.get('surveyId')
    const openingRef = formData.get('openingRef')
    const caption = formData.get('caption') || ''

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('Invalid file type. Only JPEG, PNG, WebP, HEIC are allowed', 400)
    }

    // Max file size 10MB
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return errorResponse('File too large. Maximum size is 10MB', 400)
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${uuidv4()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dw-photos')
    
    // Create directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {
      // Directory may already exist
    }

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Create photo record
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const photosCollection = db.collection('dw_opening_photos')

    const photo = {
      id: uuidv4(),
      clientId: user.clientId,
      surveyId: surveyId || null,
      openingRef: openingRef || null,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/dw-photos/${filename}`,
      caption,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    await photosCollection.insertOne(photo)

    return successResponse({ 
      photo: sanitizeDocument(photo),
      message: 'Photo uploaded successfully'
    }, 201)

  } catch (error) {
    console.error('D&W Photo Upload Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to upload photo', 500, error.message)
  }
}

// GET - Get photos for an opening or survey
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const surveyId = searchParams.get('surveyId')
    const openingRef = searchParams.get('openingRef')
    const openingId = searchParams.get('openingId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const photosCollection = db.collection('dw_opening_photos')

    const query = {}
    if (surveyId) query.surveyId = surveyId
    if (openingRef) query.openingRef = openingRef
    if (openingId) query.openingId = openingId

    const photos = await photosCollection.find(query).sort({ uploadedAt: -1 }).toArray()

    return successResponse({ photos })

  } catch (error) {
    console.error('D&W Photos GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch photos', 500, error.message)
  }
}

// DELETE - Delete a photo
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('id')

    if (!photoId) {
      return errorResponse('Photo ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const photosCollection = db.collection('dw_opening_photos')

    // Delete from database
    const result = await photosCollection.deleteOne({ id: photoId })

    if (result.deletedCount === 0) {
      return errorResponse('Photo not found', 404)
    }

    // Note: In production, also delete the file from disk/storage

    return successResponse({ message: 'Photo deleted successfully' })

  } catch (error) {
    console.error('D&W Photo Delete Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete photo', 500, error.message)
  }
}
