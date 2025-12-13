import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get chat messages/conversations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const type = searchParams.get('type') // 'conversations' or 'messages'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'conversations' || !conversationId) {
      // Get all conversations
      const conversationsCollection = db.collection('conversations')
      const conversations = await conversationsCollection
        .find({})
        .sort({ updatedAt: -1 })
        .toArray()
      return successResponse(sanitizeDocuments(conversations))
    }

    // Get messages for a specific conversation
    const messagesCollection = db.collection('chat_messages')
    const messages = await messagesCollection
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray()

    return successResponse(sanitizeDocuments(messages))
  } catch (error) {
    console.error('Chat GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch chat data', 500, error.message)
  }
}

// Create new message or conversation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { type, conversationId, content, attachments, participants, name } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'conversation') {
      // Create new conversation
      const conversationsCollection = db.collection('conversations')
      
      const conversation = {
        id: uuidv4(),
        clientId: user.clientId,
        name: name || 'New Conversation',
        participants: participants || [user.id],
        lastMessage: null,
        lastMessageAt: null,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await conversationsCollection.insertOne(conversation)
      return successResponse(sanitizeDocument(conversation), 201)
    }

    // Create new message
    if (!conversationId) {
      return errorResponse('Conversation ID is required', 400)
    }

    const messagesCollection = db.collection('chat_messages')
    const conversationsCollection = db.collection('conversations')

    const message = {
      id: uuidv4(),
      clientId: user.clientId,
      conversationId,
      senderId: user.id,
      senderName: user.name || user.email,
      content: content || '',
      attachments: attachments || [],
      readBy: [user.id],
      createdAt: new Date()
    }

    await messagesCollection.insertOne(message)

    // Update conversation's last message
    await conversationsCollection.updateOne(
      { id: conversationId },
      {
        $set: {
          lastMessage: content,
          lastMessageAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    return successResponse(sanitizeDocument(message), 201)
  } catch (error) {
    console.error('Chat POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to create chat message', 500, error.message)
  }
}

// Update message (mark as read, edit, etc.)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { messageId, conversationId, action, content } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (action === 'markRead' && conversationId) {
      // Mark all messages in conversation as read
      const messagesCollection = db.collection('chat_messages')
      await messagesCollection.updateMany(
        { conversationId },
        { $addToSet: { readBy: user.id } }
      )
      return successResponse({ message: 'Messages marked as read' })
    }

    if (messageId && content) {
      // Edit message
      const messagesCollection = db.collection('chat_messages')
      const result = await messagesCollection.findOneAndUpdate(
        { id: messageId, senderId: user.id },
        { $set: { content, editedAt: new Date() } },
        { returnDocument: 'after' }
      )

      if (!result) {
        return errorResponse('Message not found or you cannot edit this message', 404)
      }

      return successResponse(sanitizeDocument(result))
    }

    return errorResponse('Invalid request', 400)
  } catch (error) {
    console.error('Chat PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to update chat', 500, error.message)
  }
}

// Delete message or conversation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const conversationId = searchParams.get('conversationId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (conversationId && !messageId) {
      // Delete entire conversation and its messages
      const conversationsCollection = db.collection('conversations')
      const messagesCollection = db.collection('chat_messages')

      await messagesCollection.deleteMany({ conversationId })
      await conversationsCollection.deleteOne({ id: conversationId })

      return successResponse({ message: 'Conversation deleted successfully' })
    }

    if (messageId) {
      // Delete single message
      const messagesCollection = db.collection('chat_messages')
      const result = await messagesCollection.deleteOne({ id: messageId, senderId: user.id })

      if (result.deletedCount === 0) {
        return errorResponse('Message not found or you cannot delete this message', 404)
      }

      return successResponse({ message: 'Message deleted successfully' })
    }

    return errorResponse('Message ID or Conversation ID is required', 400)
  } catch (error) {
    console.error('Chat DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to delete chat', 500, error.message)
  }
}
