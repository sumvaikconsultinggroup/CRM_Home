import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch documents
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const documentsCollection = db.collection('documents')

    const filter = {}
    if (projectId) filter.projectId = projectId
    if (type) filter.type = type
    if (category) filter.category = category

    const documents = await documentsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(documents))
  } catch (error) {
    console.error('Documents GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch documents', 500, error.message)
  }
}

// POST - Create document record
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    if (!body.name) {
      return errorResponse('Document name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const documentsCollection = db.collection('documents')

    const now = new Date()
    const document = {
      id: uuidv4(),
      clientId: user.clientId,
      
      // Document info
      name: body.name,
      description: body.description || '',
      fileName: body.fileName || body.name,
      fileType: body.fileType || 'unknown',
      fileSize: body.fileSize || 0,
      fileUrl: body.fileUrl || '',
      
      // Categorization
      type: body.type || 'general', // contract, invoice, design, photo, permit, other
      category: body.category || '',
      tags: body.tags || [],
      
      // Linkage
      projectId: body.projectId || null,
      taskId: body.taskId || null,
      leadId: body.leadId || null,
      contactId: body.contactId || null,
      
      // Version control
      version: body.version || 1,
      parentDocumentId: body.parentDocumentId || null,
      isLatestVersion: true,
      
      // Status
      status: body.status || 'active', // active, archived, deleted
      
      // Metadata
      uploadedBy: user.id,
      uploadedByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await documentsCollection.insertOne(document)

    // Add to project activity log if linked
    if (body.projectId) {
      const projectsCollection = db.collection('projects')
      await projectsCollection.updateOne(
        { id: body.projectId },
        {
          $push: {
            activityLog: {
              id: uuidv4(),
              action: 'document_added',
              description: `Document "${body.name}" added`,
              documentId: document.id,
              userId: user.id,
              userName: user.name || user.email,
              timestamp: now
            }
          },
          $set: { updatedAt: now }
        }
      )
    }

    return successResponse(sanitizeDocument(document), 201)
  } catch (error) {
    console.error('Documents POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create document', 500, error.message)
  }
}

// PUT - Update document
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id } = body

    if (!id) {
      return errorResponse('Document ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const documentsCollection = db.collection('documents')

    const existingDocument = await documentsCollection.findOne({ id })
    if (!existingDocument) {
      return errorResponse('Document not found', 404)
    }

    // Handle new version upload
    if (body.newVersion) {
      // Mark current as not latest
      await documentsCollection.updateOne(
        { id },
        { $set: { isLatestVersion: false } }
      )

      // Create new version
      const newDocument = {
        id: uuidv4(),
        clientId: user.clientId,
        
        name: body.name || existingDocument.name,
        description: body.description || existingDocument.description,
        fileName: body.fileName,
        fileType: body.fileType,
        fileSize: body.fileSize,
        fileUrl: body.fileUrl,
        
        type: existingDocument.type,
        category: existingDocument.category,
        tags: existingDocument.tags,
        
        projectId: existingDocument.projectId,
        taskId: existingDocument.taskId,
        leadId: existingDocument.leadId,
        contactId: existingDocument.contactId,
        
        version: (existingDocument.version || 1) + 1,
        parentDocumentId: existingDocument.parentDocumentId || id,
        isLatestVersion: true,
        
        status: 'active',
        
        uploadedBy: user.id,
        uploadedByName: user.name || user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await documentsCollection.insertOne(newDocument)
      return successResponse(sanitizeDocument(newDocument))
    }

    // Regular update
    const updatedDocument = {
      ...existingDocument,
      ...body,
      id,
      updatedAt: new Date()
    }

    await documentsCollection.updateOne(
      { id },
      { $set: updatedDocument }
    )

    return successResponse(sanitizeDocument(updatedDocument))
  } catch (error) {
    console.error('Documents PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update document', 500, error.message)
  }
}

// DELETE - Delete/archive document
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const permanent = searchParams.get('permanent') === 'true'

    if (!id) {
      return errorResponse('Document ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const documentsCollection = db.collection('documents')

    if (permanent) {
      const result = await documentsCollection.deleteOne({ id })
      if (result.deletedCount === 0) {
        return errorResponse('Document not found', 404)
      }
    } else {
      // Soft delete - archive
      const result = await documentsCollection.updateOne(
        { id },
        { $set: { status: 'archived', updatedAt: new Date() } }
      )
      if (result.matchedCount === 0) {
        return errorResponse('Document not found', 404)
      }
    }

    return successResponse({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Documents DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete document', 500, error.message)
  }
}
