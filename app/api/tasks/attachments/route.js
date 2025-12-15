import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - List attachments for a task
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return errorResponse('Task ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const attachmentsCollection = db.collection('task_attachments')

    const attachments = await attachmentsCollection
      .find({ taskId })
      .sort({ createdAt: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(attachments))
  } catch (error) {
    console.error('Attachments GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch attachments', 500, error.message)
  }
}

// POST - Upload attachment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const formData = await request.formData()
    const file = formData.get('file')
    const taskId = formData.get('taskId')

    if (!file || !taskId) {
      return errorResponse('File and Task ID are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const attachmentsCollection = db.collection('task_attachments')
    const tasksCollection = db.collection('tasks')

    // Verify task exists
    const task = await tasksCollection.findOne({ id: taskId })
    if (!task) {
      return errorResponse('Task not found', 404)
    }

    // Get file info
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name
    const fileSize = buffer.length
    const mimeType = file.type
    const fileExtension = path.extname(fileName).toLowerCase()

    // Generate unique filename
    const uniqueFileName = `${uuidv4()}${fileExtension}`
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tasks', taskId)
    await mkdir(uploadDir, { recursive: true })
    
    // Save file
    const filePath = path.join(uploadDir, uniqueFileName)
    await writeFile(filePath, buffer)

    // Check for existing versions
    const existingVersions = await attachmentsCollection
      .find({ taskId, originalName: fileName })
      .sort({ version: -1 })
      .limit(1)
      .toArray()

    const version = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1

    const now = new Date()
    const attachment = {
      id: uuidv4(),
      clientId: user.clientId,
      taskId,
      
      // File info
      originalName: fileName,
      storedName: uniqueFileName,
      url: `/uploads/tasks/${taskId}/${uniqueFileName}`,
      mimeType,
      size: fileSize,
      extension: fileExtension,
      
      // Versioning
      version,
      isLatest: true,
      
      // Preview
      hasPreview: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(mimeType),
      thumbnailUrl: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType) 
        ? `/uploads/tasks/${taskId}/${uniqueFileName}` 
        : null,
      
      // Metadata
      uploadedBy: user.id,
      uploadedByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    // Mark previous versions as not latest
    if (version > 1) {
      await attachmentsCollection.updateMany(
        { taskId, originalName: fileName },
        { $set: { isLatest: false } }
      )
    }

    await attachmentsCollection.insertOne(attachment)

    // Update task's attachments array
    await tasksCollection.updateOne(
      { id: taskId },
      { 
        $push: { 
          attachments: attachment.id,
          activityLog: {
            id: uuidv4(),
            action: 'attachment_added',
            description: `${user.name || user.email} attached "${fileName}"`,
            userId: user.id,
            userName: user.name || user.email,
            metadata: { attachmentId: attachment.id, fileName },
            timestamp: now
          }
        },
        $set: { updatedAt: now }
      }
    )

    return successResponse(sanitizeDocument(attachment), 201)
  } catch (error) {
    console.error('Attachments POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to upload attachment', 500, error.message)
  }
}

// DELETE - Remove attachment
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return errorResponse('Attachment ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const attachmentsCollection = db.collection('task_attachments')
    const tasksCollection = db.collection('tasks')

    const attachment = await attachmentsCollection.findOne({ id: attachmentId })
    if (!attachment) {
      return errorResponse('Attachment not found', 404)
    }

    const now = new Date()

    // Remove from task's attachments array
    await tasksCollection.updateOne(
      { id: attachment.taskId },
      { 
        $pull: { attachments: attachmentId },
        $push: {
          activityLog: {
            id: uuidv4(),
            action: 'attachment_removed',
            description: `${user.name || user.email} removed "${attachment.originalName}"`,
            userId: user.id,
            userName: user.name || user.email,
            metadata: { fileName: attachment.originalName },
            timestamp: now
          }
        },
        $set: { updatedAt: now }
      }
    )

    // Soft delete the attachment (keep for audit)
    await attachmentsCollection.updateOne(
      { id: attachmentId },
      { $set: { deleted: true, deletedAt: now, deletedBy: user.id } }
    )

    return successResponse({ message: 'Attachment deleted successfully' })
  } catch (error) {
    console.error('Attachments DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete attachment', 500, error.message)
  }
}
