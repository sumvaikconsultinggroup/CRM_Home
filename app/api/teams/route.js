import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch teams and channels
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // teams, channels, messages, threads
    const teamId = searchParams.get('teamId')
    const channelId = searchParams.get('channelId')
    const threadId = searchParams.get('threadId')
    const limit = parseInt(searchParams.get('limit')) || 50
    const before = searchParams.get('before') // for pagination

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    switch (type) {
      case 'teams': {
        const teamsCollection = db.collection('teams')
        // Get teams user is a member of
        const teams = await teamsCollection
          .find({ 
            $or: [
              { 'members.userId': user.id },
              { createdBy: user.id },
              { isPublic: true }
            ]
          })
          .sort({ createdAt: -1 })
          .toArray()
        
        return successResponse(sanitizeDocuments(teams))
      }

      case 'channels': {
        if (!teamId) return errorResponse('Team ID required', 400)
        
        const channelsCollection = db.collection('channels')
        const channels = await channelsCollection
          .find({ 
            teamId,
            $or: [
              { isPrivate: false },
              { 'members.userId': user.id },
              { createdBy: user.id }
            ]
          })
          .sort({ name: 1 })
          .toArray()
        
        return successResponse(sanitizeDocuments(channels))
      }

      case 'messages': {
        if (!channelId) return errorResponse('Channel ID required', 400)
        
        const messagesCollection = db.collection('messages')
        const filter = { channelId, threadId: null }
        if (before) filter.createdAt = { $lt: new Date(before) }
        
        const messages = await messagesCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray()
        
        // Get thread reply counts
        const messageIds = messages.map(m => m.id)
        const threadCounts = await messagesCollection.aggregate([
          { $match: { threadId: { $in: messageIds } } },
          { $group: { _id: '$threadId', count: { $sum: 1 } } }
        ]).toArray()
        
        const threadCountMap = {}
        threadCounts.forEach(t => { threadCountMap[t._id] = t.count })
        
        const messagesWithThreads = messages.map(m => ({
          ...m,
          replyCount: threadCountMap[m.id] || 0
        }))
        
        return successResponse(sanitizeDocuments(messagesWithThreads.reverse()))
      }

      case 'threads': {
        if (!threadId) return errorResponse('Thread ID required', 400)
        
        const messagesCollection = db.collection('messages')
        
        // Get parent message
        const parentMessage = await messagesCollection.findOne({ id: threadId })
        
        // Get replies
        const replies = await messagesCollection
          .find({ threadId })
          .sort({ createdAt: 1 })
          .toArray()
        
        return successResponse({
          parent: parentMessage ? sanitizeDocument(parentMessage) : null,
          replies: sanitizeDocuments(replies)
        })
      }

      case 'dms': {
        // Get direct message channels for user
        const channelsCollection = db.collection('channels')
        const dmChannels = await channelsCollection
          .find({ 
            isDM: true,
            'members.userId': user.id
          })
          .sort({ lastMessageAt: -1 })
          .toArray()
        
        // Get the main database to fetch user details
        const mainDb = await getMainDb()
        const usersCollection = mainDb.collection('users')
        
        // Enrich DM channels with other user's info
        const enrichedDMChannels = await Promise.all(dmChannels.map(async (dm) => {
          // Find the other user in the DM (not the current user)
          const otherMember = dm.members.find(m => m.userId !== user.id)
          
          if (otherMember) {
            // Fetch the other user's details
            const otherUser = await usersCollection.findOne({ id: otherMember.userId })
            
            return {
              ...dm,
              otherUser: otherUser ? {
                id: otherUser.id,
                name: otherUser.name,
                email: otherUser.email,
                avatar: otherUser.avatar,
                status: otherUser.status || 'offline'
              } : {
                id: otherMember.userId,
                name: otherMember.name || 'Unknown User',
                email: '',
                avatar: null,
                status: 'offline'
              },
              displayName: otherUser?.name || otherMember.name || 'Unknown User'
            }
          }
          
          return {
            ...dm,
            otherUser: null,
            displayName: dm.name || 'Unknown Conversation'
          }
        }))
        
        return successResponse(sanitizeDocuments(enrichedDMChannels))
      }

      case 'unread': {
        // Get unread message counts
        const channelsCollection = db.collection('channels')
        const userChannels = await channelsCollection
          .find({ 'members.userId': user.id })
          .toArray()
        
        const unreadCounts = {}
        for (const channel of userChannels) {
          const memberData = channel.members.find(m => m.userId === user.id)
          const lastRead = memberData?.lastReadAt || new Date(0)
          
          const messagesCollection = db.collection('messages')
          const unreadCount = await messagesCollection.countDocuments({
            channelId: channel.id,
            createdAt: { $gt: lastRead },
            senderId: { $ne: user.id }
          })
          
          if (unreadCount > 0) {
            unreadCounts[channel.id] = unreadCount
          }
        }
        
        return successResponse(unreadCounts)
      }

      case 'search': {
        const query = searchParams.get('q')
        if (!query) return errorResponse('Search query required', 400)
        
        const messagesCollection = db.collection('messages')
        const messages = await messagesCollection
          .find({
            $or: [
              { content: { $regex: query, $options: 'i' } },
              { 'attachments.name': { $regex: query, $options: 'i' } }
            ]
          })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray()
        
        return successResponse(sanitizeDocuments(messages))
      }

      case 'announcements': {
        // Get team announcements
        const announcementsCollection = db.collection('announcements')
        const filter = {}
        if (teamId) filter.teamId = teamId
        
        const announcements = await announcementsCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray()
        
        return successResponse(sanitizeDocuments(announcements))
      }

      default:
        return errorResponse('Invalid type parameter', 400)
    }
  } catch (error) {
    console.error('Teams GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch teams data', 500, error.message)
  }
}

// POST - Create teams, channels, messages
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date()

    switch (action) {
      case 'create_team': {
        const { name, description, isPublic } = body
        if (!name) return errorResponse('Team name required', 400)

        const teamsCollection = db.collection('teams')
        
        const team = {
          id: uuidv4(),
          clientId: user.clientId,
          name,
          description: description || '',
          icon: body.icon || '👥',
          color: body.color || '#6366f1',
          isPublic: isPublic !== false,
          
          members: [{
            userId: user.id,
            userName: user.name || user.email,
            role: 'owner',
            joinedAt: now
          }],
          
          settings: {
            allowMemberInvite: true,
            allowChannelCreation: true,
            defaultChannelId: null
          },
          
          stats: {
            memberCount: 1,
            channelCount: 0,
            messageCount: 0
          },
          
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await teamsCollection.insertOne(team)

        // Create default #general channel
        const channelsCollection = db.collection('channels')
        const generalChannel = {
          id: uuidv4(),
          clientId: user.clientId,
          teamId: team.id,
          name: 'general',
          description: 'General discussions',
          topic: 'Welcome to the team!',
          isPrivate: false,
          isDM: false,
          
          members: [{
            userId: user.id,
            userName: user.name || user.email,
            role: 'admin',
            joinedAt: now,
            lastReadAt: now
          }],
          
          pinnedMessages: [],
          
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now
        }

        await channelsCollection.insertOne(generalChannel)

        // Update team with default channel
        await teamsCollection.updateOne(
          { id: team.id },
          { $set: { 'settings.defaultChannelId': generalChannel.id, 'stats.channelCount': 1 } }
        )

        return successResponse({ team: sanitizeDocument(team), defaultChannel: sanitizeDocument(generalChannel) }, 201)
      }

      case 'create_channel': {
        const { teamId, name, description, isPrivate, memberIds } = body
        if (!teamId || !name) return errorResponse('Team ID and channel name required', 400)

        const channelsCollection = db.collection('channels')
        
        // Check for duplicate name
        const existing = await channelsCollection.findOne({ teamId, name: name.toLowerCase().replace(/\s+/g, '-') })
        if (existing) return errorResponse('Channel name already exists', 400)

        const channel = {
          id: uuidv4(),
          clientId: user.clientId,
          teamId,
          name: name.toLowerCase().replace(/\s+/g, '-'),
          displayName: name,
          description: description || '',
          topic: '',
          isPrivate: isPrivate === true,
          isDM: false,
          
          members: [{
            userId: user.id,
            userName: user.name || user.email,
            role: 'admin',
            joinedAt: now,
            lastReadAt: now
          }],
          
          pinnedMessages: [],
          
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now
        }

        // Add additional members if specified
        if (memberIds && memberIds.length > 0) {
          const usersCollection = db.collection('users')
          for (const memberId of memberIds) {
            const memberUser = await usersCollection.findOne({ id: memberId })
            if (memberUser && memberId !== user.id) {
              channel.members.push({
                userId: memberId,
                userName: memberUser.name || memberUser.email,
                role: 'member',
                joinedAt: now,
                lastReadAt: now
              })
            }
          }
        }

        await channelsCollection.insertOne(channel)

        // Update team stats
        const teamsCollection = db.collection('teams')
        await teamsCollection.updateOne(
          { id: teamId },
          { $inc: { 'stats.channelCount': 1 } }
        )

        return successResponse(sanitizeDocument(channel), 201)
      }

      case 'create_dm': {
        const { targetUserId, targetUserName, targetUserEmail } = body
        if (!targetUserId) return errorResponse('Target user ID required', 400)

        const channelsCollection = db.collection('channels')
        
        // Check if DM already exists
        const existingDM = await channelsCollection.findOne({
          isDM: true,
          $and: [
            { 'members.userId': user.id },
            { 'members.userId': targetUserId }
          ]
        })

        if (existingDM) {
          return successResponse(sanitizeDocument(existingDM))
        }

        // Get target user info - try DB first, then use provided info
        const usersCollection = db.collection('users')
        let targetUser = await usersCollection.findOne({ id: targetUserId })
        
        // If not in DB, use provided info or create placeholder
        if (!targetUser) {
          targetUser = {
            id: targetUserId,
            name: targetUserName || targetUserEmail || 'User',
            email: targetUserEmail || `${targetUserId}@placeholder.com`
          }
        }

        const dmChannel = {
          id: uuidv4(),
          clientId: user.clientId,
          teamId: null,
          name: `dm-${user.id}-${targetUserId}`,
          displayName: targetUser.name || targetUser.email,
          isDM: true,
          isPrivate: true,
          
          members: [
            {
              userId: user.id,
              userName: user.name || user.email,
              role: 'member',
              joinedAt: now,
              lastReadAt: now
            },
            {
              userId: targetUserId,
              userName: targetUser.name || targetUser.email,
              role: 'member',
              joinedAt: now,
              lastReadAt: null
            }
          ],
          
          pinnedMessages: [],
          
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: null
        }

        await channelsCollection.insertOne(dmChannel)

        return successResponse(sanitizeDocument(dmChannel), 201)
      }

      case 'send_message': {
        const { channelId, content, attachments, mentions, replyTo } = body
        if (!channelId || !content) return errorResponse('Channel ID and content required', 400)

        const messagesCollection = db.collection('messages')
        const channelsCollection = db.collection('channels')

        // Verify channel access
        const channel = await channelsCollection.findOne({ 
          id: channelId,
          $or: [
            { isPrivate: false },
            { 'members.userId': user.id }
          ]
        })
        if (!channel) return errorResponse('Channel not found or access denied', 404)

        const message = {
          id: uuidv4(),
          clientId: user.clientId,
          channelId,
          teamId: channel.teamId,
          threadId: replyTo || null,
          
          senderId: user.id,
          senderName: user.name || user.email,
          senderAvatar: user.avatar || null,
          
          content,
          contentType: 'text',
          
          attachments: attachments || [],
          mentions: mentions || [],
          reactions: [],
          
          isEdited: false,
          isPinned: false,
          isDeleted: false,
          
          createdAt: now,
          updatedAt: now
        }

        await messagesCollection.insertOne(message)

        // Update channel last message time
        await channelsCollection.updateOne(
          { id: channelId },
          { $set: { lastMessageAt: now, updatedAt: now } }
        )

        // Update team message count
        if (channel.teamId) {
          const teamsCollection = db.collection('teams')
          await teamsCollection.updateOne(
            { id: channel.teamId },
            { $inc: { 'stats.messageCount': 1 } }
          )
        }

        // Create notifications for mentions
        if (mentions && mentions.length > 0) {
          const notificationsCollection = db.collection('notifications')
          for (const mentionedUserId of mentions) {
            if (mentionedUserId !== user.id) {
              await notificationsCollection.insertOne({
                id: uuidv4(),
                clientId: user.clientId,
                userId: mentionedUserId,
                type: 'mention',
                title: `${user.name || user.email} mentioned you`,
                message: content.substring(0, 100),
                channelId,
                messageId: message.id,
                read: false,
                createdAt: now
              })
            }
          }
        }

        return successResponse(sanitizeDocument(message), 201)
      }

      case 'add_reaction': {
        const { messageId, emoji } = body
        if (!messageId || !emoji) return errorResponse('Message ID and emoji required', 400)

        const messagesCollection = db.collection('messages')
        const message = await messagesCollection.findOne({ id: messageId })
        if (!message) return errorResponse('Message not found', 404)

        const reactions = message.reactions || []
        const existingReaction = reactions.find(r => r.emoji === emoji)

        if (existingReaction) {
          // Check if user already reacted
          if (existingReaction.users.includes(user.id)) {
            // Remove reaction
            existingReaction.users = existingReaction.users.filter(u => u !== user.id)
            existingReaction.count = existingReaction.users.length
            if (existingReaction.count === 0) {
              const idx = reactions.indexOf(existingReaction)
              reactions.splice(idx, 1)
            }
          } else {
            // Add user to reaction
            existingReaction.users.push(user.id)
            existingReaction.count++
          }
        } else {
          // New reaction
          reactions.push({
            emoji,
            users: [user.id],
            count: 1
          })
        }

        await messagesCollection.updateOne(
          { id: messageId },
          { $set: { reactions, updatedAt: now } }
        )

        return successResponse({ reactions })
      }

      case 'pin_message': {
        const { messageId, channelId } = body
        if (!messageId || !channelId) return errorResponse('Message ID and channel ID required', 400)

        const messagesCollection = db.collection('messages')
        const channelsCollection = db.collection('channels')

        const message = await messagesCollection.findOne({ id: messageId })
        if (!message) return errorResponse('Message not found', 404)

        const isPinned = !message.isPinned

        await messagesCollection.updateOne(
          { id: messageId },
          { $set: { isPinned, updatedAt: now } }
        )

        // Update channel pinned messages
        if (isPinned) {
          await channelsCollection.updateOne(
            { id: channelId },
            { $addToSet: { pinnedMessages: messageId } }
          )
        } else {
          await channelsCollection.updateOne(
            { id: channelId },
            { $pull: { pinnedMessages: messageId } }
          )
        }

        return successResponse({ isPinned })
      }

      case 'mark_read': {
        const { channelId } = body
        if (!channelId) return errorResponse('Channel ID required', 400)

        const channelsCollection = db.collection('channels')
        
        await channelsCollection.updateOne(
          { id: channelId, 'members.userId': user.id },
          { $set: { 'members.$.lastReadAt': now } }
        )

        return successResponse({ success: true })
      }

      case 'join_team': {
        const { teamId } = body
        if (!teamId) return errorResponse('Team ID required', 400)

        const teamsCollection = db.collection('teams')
        const team = await teamsCollection.findOne({ id: teamId })
        if (!team) return errorResponse('Team not found', 404)
        if (!team.isPublic) return errorResponse('Cannot join private team', 403)

        // Check if already a member
        if (team.members.find(m => m.userId === user.id)) {
          return errorResponse('Already a member', 400)
        }

        await teamsCollection.updateOne(
          { id: teamId },
          {
            $push: {
              members: {
                userId: user.id,
                userName: user.name || user.email,
                role: 'member',
                joinedAt: now
              }
            },
            $inc: { 'stats.memberCount': 1 }
          }
        )

        // Also add to default channel
        if (team.settings?.defaultChannelId) {
          const channelsCollection = db.collection('channels')
          await channelsCollection.updateOne(
            { id: team.settings.defaultChannelId },
            {
              $push: {
                members: {
                  userId: user.id,
                  userName: user.name || user.email,
                  role: 'member',
                  joinedAt: now,
                  lastReadAt: now
                }
              }
            }
          )
        }

        return successResponse({ success: true })
      }

      case 'invite_member': {
        const { teamId, userIds } = body
        if (!teamId || !userIds || userIds.length === 0) {
          return errorResponse('Team ID and user IDs required', 400)
        }

        const teamsCollection = db.collection('teams')
        const team = await teamsCollection.findOne({ id: teamId })
        if (!team) return errorResponse('Team not found', 404)

        // Check if user has permission to invite
        const currentMember = team.members.find(m => m.userId === user.id)
        if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
          if (!team.settings?.allowMemberInvite) {
            return errorResponse('Not authorized to invite members', 403)
          }
        }

        const usersCollection = db.collection('users')
        const channelsCollection = db.collection('channels')
        const added = []

        for (const userId of userIds) {
          // Check if already a member
          if (team.members.find(m => m.userId === userId)) continue

          const invitedUser = await usersCollection.findOne({ id: userId })
          if (!invitedUser) continue

          const newMember = {
            userId,
            userName: invitedUser.name || invitedUser.email,
            role: 'member',
            joinedAt: now,
            invitedBy: user.id
          }

          await teamsCollection.updateOne(
            { id: teamId },
            {
              $push: { members: newMember },
              $inc: { 'stats.memberCount': 1 }
            }
          )

          // Add to default channel
          if (team.settings?.defaultChannelId) {
            await channelsCollection.updateOne(
              { id: team.settings.defaultChannelId },
              {
                $push: {
                  members: {
                    ...newMember,
                    lastReadAt: now
                  }
                }
              }
            )
          }

          added.push(newMember)
        }

        return successResponse({ added })
      }

      case 'create_announcement': {
        const { title, content, priority, teamId: annTeamId } = body
        if (!title || !content) return errorResponse('Title and content required', 400)

        const announcementsCollection = db.collection('announcements')
        
        const announcement = {
          id: uuidv4(),
          clientId: user.clientId,
          teamId: annTeamId || null,
          
          title,
          content,
          priority: priority || 'medium', // high, medium, low
          
          authorId: user.id,
          authorName: user.name || user.email,
          
          reactions: [],
          readBy: [],
          dismissed: false,
          
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          
          createdAt: now,
          updatedAt: now
        }

        await announcementsCollection.insertOne(announcement)
        
        // Create notifications for team members if teamId provided
        if (annTeamId) {
          const teamsCollection = db.collection('teams')
          const team = await teamsCollection.findOne({ id: annTeamId })
          
          if (team && team.members) {
            const notificationsCollection = db.collection('notifications')
            for (const member of team.members) {
              if (member.userId !== user.id) {
                await notificationsCollection.insertOne({
                  id: uuidv4(),
                  clientId: user.clientId,
                  userId: member.userId,
                  type: 'announcement',
                  title: `📢 ${title}`,
                  message: content.substring(0, 100),
                  announcementId: announcement.id,
                  teamId: annTeamId,
                  read: false,
                  createdAt: now
                })
              }
            }
          }
        }

        return successResponse(sanitizeDocument(announcement), 201)
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Teams POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to process request', 500, error.message)
  }
}

// PUT - Update teams, channels, messages
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { type, id } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date()

    switch (type) {
      case 'team': {
        const teamsCollection = db.collection('teams')
        const team = await teamsCollection.findOne({ id })
        if (!team) return errorResponse('Team not found', 404)

        // Check permission
        const member = team.members.find(m => m.userId === user.id)
        if (!member || !['owner', 'admin'].includes(member.role)) {
          return errorResponse('Not authorized', 403)
        }

        const updates = {}
        if (body.name) updates.name = body.name
        if (body.description !== undefined) updates.description = body.description
        if (body.icon) updates.icon = body.icon
        if (body.color) updates.color = body.color
        if (body.isPublic !== undefined) updates.isPublic = body.isPublic
        if (body.settings) updates.settings = { ...team.settings, ...body.settings }
        updates.updatedAt = now

        await teamsCollection.updateOne({ id }, { $set: updates })

        return successResponse({ success: true })
      }

      case 'channel': {
        const channelsCollection = db.collection('channels')
        const channel = await channelsCollection.findOne({ id })
        if (!channel) return errorResponse('Channel not found', 404)

        const updates = {}
        if (body.displayName) updates.displayName = body.displayName
        if (body.description !== undefined) updates.description = body.description
        if (body.topic !== undefined) updates.topic = body.topic
        updates.updatedAt = now

        await channelsCollection.updateOne({ id }, { $set: updates })

        return successResponse({ success: true })
      }

      case 'message': {
        const messagesCollection = db.collection('messages')
        const message = await messagesCollection.findOne({ id })
        if (!message) return errorResponse('Message not found', 404)

        // Only sender can edit
        if (message.senderId !== user.id) {
          return errorResponse('Not authorized', 403)
        }

        await messagesCollection.updateOne(
          { id },
          { 
            $set: { 
              content: body.content,
              isEdited: true,
              editedAt: now,
              updatedAt: now
            } 
          }
        )

        return successResponse({ success: true })
      }

      default:
        return errorResponse('Invalid type', 400)
    }
  } catch (error) {
    console.error('Teams PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update', 500, error.message)
  }
}

// DELETE - Remove teams, channels, messages, members
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const teamId = searchParams.get('teamId')
    const memberId = searchParams.get('memberId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    switch (type) {
      case 'team': {
        const teamsCollection = db.collection('teams')
        const team = await teamsCollection.findOne({ id })
        if (!team) return errorResponse('Team not found', 404)

        // Only owner can delete
        const member = team.members.find(m => m.userId === user.id)
        if (!member || member.role !== 'owner') {
          return errorResponse('Not authorized', 403)
        }

        // Delete all channels and messages
        const channelsCollection = db.collection('channels')
        const messagesCollection = db.collection('messages')
        
        await messagesCollection.deleteMany({ teamId: id })
        await channelsCollection.deleteMany({ teamId: id })
        await teamsCollection.deleteOne({ id })

        return successResponse({ success: true })
      }

      case 'channel': {
        const channelsCollection = db.collection('channels')
        const channel = await channelsCollection.findOne({ id })
        if (!channel) return errorResponse('Channel not found', 404)

        // Delete all messages in channel
        const messagesCollection = db.collection('messages')
        await messagesCollection.deleteMany({ channelId: id })
        await channelsCollection.deleteOne({ id })

        // Update team stats
        if (channel.teamId) {
          const teamsCollection = db.collection('teams')
          await teamsCollection.updateOne(
            { id: channel.teamId },
            { $inc: { 'stats.channelCount': -1 } }
          )
        }

        return successResponse({ success: true })
      }

      case 'message': {
        const messagesCollection = db.collection('messages')
        const message = await messagesCollection.findOne({ id })
        if (!message) return errorResponse('Message not found', 404)

        // Only sender can delete
        if (message.senderId !== user.id) {
          return errorResponse('Not authorized', 403)
        }

        // Soft delete - mark as deleted
        await messagesCollection.updateOne(
          { id },
          { $set: { isDeleted: true, content: 'This message was deleted', updatedAt: new Date() } }
        )

        return successResponse({ success: true })
      }

      case 'member': {
        if (!teamId || !memberId) return errorResponse('Team ID and member ID required', 400)

        const teamsCollection = db.collection('teams')
        const team = await teamsCollection.findOne({ id: teamId })
        if (!team) return errorResponse('Team not found', 404)

        // Check permission (owner/admin can remove, or user can leave)
        const currentMember = team.members.find(m => m.userId === user.id)
        const targetMember = team.members.find(m => m.userId === memberId)
        
        if (!targetMember) return errorResponse('Member not found', 404)

        const canRemove = 
          memberId === user.id || // User leaving
          (currentMember && ['owner', 'admin'].includes(currentMember.role) && targetMember.role !== 'owner')

        if (!canRemove) {
          return errorResponse('Not authorized', 403)
        }

        await teamsCollection.updateOne(
          { id: teamId },
          {
            $pull: { members: { userId: memberId } },
            $inc: { 'stats.memberCount': -1 }
          }
        )

        // Remove from all team channels
        const channelsCollection = db.collection('channels')
        await channelsCollection.updateMany(
          { teamId },
          { $pull: { members: { userId: memberId } } }
        )

        return successResponse({ success: true })
      }

      default:
        return errorResponse('Invalid type', 400)
    }
  } catch (error) {
    console.error('Teams DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete', 500, error.message)
  }
}
