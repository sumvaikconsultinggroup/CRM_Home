import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get conversations for current user
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    const conversationsCollection = await getCollection('conversations')
    const messagesCollection = await getCollection('messages')
    const usersCollection = await getCollection(Collections.USERS)

    // If conversationId provided, get messages for that conversation
    if (conversationId) {
      const messages = await messagesCollection
        .find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(100)
        .toArray()
      
      return successResponse(sanitizeDocuments(messages))
    }

    // Get all conversations for this user's client
    const conversations = await conversationsCollection
      .find({ 
        clientId: user.clientId,
        participants: user.id
      })
      .sort({ updatedAt: -1 })
      .toArray()

    // Enrich with participant info and last message
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await usersCollection
          .find({ id: { $in: conv.participants } })
          .project({ id: 1, name: 1, email: 1, avatar: 1 })
          .toArray()
        
        const lastMessage = await messagesCollection
          .findOne({ conversationId: conv.id }, { sort: { createdAt: -1 } })
        
        const unreadCount = await messagesCollection.countDocuments({
          conversationId: conv.id,
          senderId: { $ne: user.id },
          readBy: { $nin: [user.id] }
        })

        return {
          ...sanitizeDocument(conv),
          participants: sanitizeDocuments(participants),
          lastMessage: lastMessage ? sanitizeDocument(lastMessage) : null,
          unreadCount
        }
      })
    )

    return successResponse(enrichedConversations)
  } catch (error) {
    console.error('Chat GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch conversations', 500, error.message)
  }
}

// Create new conversation or send message
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, conversationId, participants, name, message, isGroup } = body

    const conversationsCollection = await getCollection('conversations')
    const messagesCollection = await getCollection('messages')

    if (action === 'create-conversation') {
      // Create new conversation
      const newConversation = {
        id: uuidv4(),
        clientId: user.clientId,
        name: name || null, // For group chats
        isGroup: isGroup || false,
        participants: [...new Set([user.id, ...(participants || [])])],
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await conversationsCollection.insertOne(newConversation)
      return successResponse(sanitizeDocument(newConversation), 201)
    }

    if (action === 'send-message') {
      if (!conversationId || !message) {
        return errorResponse('Conversation ID and message are required', 400)
      }

      // Verify user is participant
      const conversation = await conversationsCollection.findOne({ 
        id: conversationId,
        participants: user.id
      })

      if (!conversation) {
        return errorResponse('Conversation not found', 404)
      }

      const newMessage = {
        id: uuidv4(),
        conversationId,
        senderId: user.id,
        senderName: user.name,
        content: message,
        type: 'text',
        readBy: [user.id],
        createdAt: new Date()
      }

      await messagesCollection.insertOne(newMessage)
      
      // Update conversation's updatedAt
      await conversationsCollection.updateOne(
        { id: conversationId },
        { $set: { updatedAt: new Date() } }
      )

      return successResponse(sanitizeDocument(newMessage), 201)
    }

    if (action === 'mark-read') {
      if (!conversationId) {
        return errorResponse('Conversation ID is required', 400)
      }

      await messagesCollection.updateMany(
        { 
          conversationId,
          readBy: { $nin: [user.id] }
        },
        { $addToSet: { readBy: user.id } }
      )

      return successResponse({ message: 'Messages marked as read' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Chat POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process chat action', 500, error.message)
  }
}
