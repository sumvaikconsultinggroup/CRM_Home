import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const pinned = searchParams.get('pinned')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const notesCollection = db.collection('notes')
    
    let query = {}
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (pinned === 'true') {
      query.pinned = true
    }

    const notes = await notesCollection
      .find(query)
      .sort({ pinned: -1, updatedAt: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(notes))
  } catch (error) {
    console.error('Notes GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch notes', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { title, content, color, tags } = body

    if (!title) {
      return errorResponse('Title is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const notesCollection = db.collection('notes')

    const newNote = {
      id: uuidv4(),
      clientId: user.clientId,
      createdBy: user.id,
      title,
      content: content || '',
      color: color || '#FEF3C7',
      tags: tags || [],
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await notesCollection.insertOne(newNote)
    return successResponse(sanitizeDocument(newNote), 201)
  } catch (error) {
    console.error('Notes POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to create note', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponse('Note ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const notesCollection = db.collection('notes')

    const result = await notesCollection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Note not found', 404)
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Notes PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to update note', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Note ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const notesCollection = db.collection('notes')
    const result = await notesCollection.deleteOne({ id })

    if (result.deletedCount === 0) {
      return errorResponse('Note not found', 404)
    }

    return successResponse({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Notes DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to delete note', 500, error.message)
  }
}
