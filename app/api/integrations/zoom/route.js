import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get Zoom integration status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const zoomIntegration = await integrationsCollection.findOne({ type: 'zoom' })

    // Don't expose sensitive credentials
    if (zoomIntegration) {
      const safeIntegration = {
        ...zoomIntegration,
        accountId: zoomIntegration.accountId ? '****' + zoomIntegration.accountId.slice(-4) : null,
        clientId: zoomIntegration.clientId ? '****' + zoomIntegration.clientId.slice(-4) : null,
        clientSecret: zoomIntegration.clientSecret ? '••••••••' : null
      }
      return successResponse(sanitizeDocument(safeIntegration))
    }

    return successResponse(null)
  } catch (error) {
    console.error('Zoom GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch Zoom integration', 500, error.message)
  }
}

// POST - Connect Zoom or create meeting
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, accountId, clientId, clientSecret, meeting, config } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')

    // Connect Zoom via Server-to-Server OAuth
    if (action === 'connect') {
      if (!accountId || !clientId || !clientSecret) {
        return errorResponse('Account ID, Client ID, and Client Secret are required', 400)
      }

      // Test the credentials by getting an access token
      try {
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
          },
          body: `grant_type=account_credentials&account_id=${accountId}`
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}))
          console.error('Zoom auth error:', errorData)
          return errorResponse('Invalid Zoom credentials. Please check your Account ID, Client ID, and Client Secret.', 400)
        }

        const tokenData = await tokenResponse.json()

        // Remove existing Zoom integration
        await integrationsCollection.deleteMany({ type: 'zoom' })

        // Save new integration
        const integration = {
          id: uuidv4(),
          type: 'zoom',
          name: 'Zoom',
          accountId,
          clientId,
          clientSecret, // In production, encrypt this
          accessToken: tokenData.access_token,
          tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
          settings: {
            defaultDuration: 30,
            enableWaitingRoom: true,
            enableRecording: false,
            autoCreateForProjects: false
          },
          active: true,
          connectedBy: user.id,
          connectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await integrationsCollection.insertOne(integration)
        
        // Return sanitized version
        return successResponse({
          ...sanitizeDocument(integration),
          accountId: '****' + accountId.slice(-4),
          clientId: '****' + clientId.slice(-4),
          clientSecret: '••••••••',
          accessToken: undefined
        }, 201)
      } catch (err) {
        console.error('Zoom connection error:', err)
        return errorResponse('Failed to connect to Zoom. Please check your credentials.', 400)
      }
    }

    // Create a Zoom meeting
    if (action === 'create-meeting') {
      const zoomIntegration = await integrationsCollection.findOne({ type: 'zoom', active: true })
      
      if (!zoomIntegration) {
        return errorResponse('Zoom is not connected', 400)
      }

      if (!meeting?.topic) {
        return errorResponse('Meeting topic is required', 400)
      }

      // Refresh token if expired
      let accessToken = zoomIntegration.accessToken
      if (new Date() >= new Date(zoomIntegration.tokenExpiresAt)) {
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${zoomIntegration.clientId}:${zoomIntegration.clientSecret}`).toString('base64')}`
          },
          body: `grant_type=account_credentials&account_id=${zoomIntegration.accountId}`
        })

        if (!tokenResponse.ok) {
          return errorResponse('Failed to refresh Zoom access token', 500)
        }

        const tokenData = await tokenResponse.json()
        accessToken = tokenData.access_token

        // Update stored token
        await integrationsCollection.updateOne(
          { type: 'zoom' },
          { 
            $set: { 
              accessToken,
              tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
              updatedAt: new Date()
            } 
          }
        )
      }

      try {
        const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            topic: meeting.topic,
            type: meeting.type || 2, // Scheduled meeting
            start_time: meeting.startTime || new Date().toISOString(),
            duration: meeting.duration || zoomIntegration.settings?.defaultDuration || 30,
            timezone: meeting.timezone || 'Asia/Kolkata',
            agenda: meeting.agenda || '',
            settings: {
              host_video: true,
              participant_video: true,
              join_before_host: false,
              mute_upon_entry: true,
              waiting_room: zoomIntegration.settings?.enableWaitingRoom ?? true,
              auto_recording: zoomIntegration.settings?.enableRecording ? 'cloud' : 'none'
            }
          })
        })

        if (!meetingResponse.ok) {
          const errorData = await meetingResponse.json().catch(() => ({}))
          console.error('Zoom meeting creation error:', errorData)
          return errorResponse('Failed to create Zoom meeting', 500)
        }

        const meetingData = await meetingResponse.json()

        // Store meeting record
        const meetingsCollection = db.collection('zoom_meetings')
        await meetingsCollection.insertOne({
          id: uuidv4(),
          zoomMeetingId: meetingData.id,
          topic: meetingData.topic,
          joinUrl: meetingData.join_url,
          startUrl: meetingData.start_url,
          password: meetingData.password,
          startTime: meetingData.start_time,
          duration: meetingData.duration,
          createdBy: user.id,
          relatedTo: meeting.relatedTo || null, // Can link to project/lead
          relatedType: meeting.relatedType || null,
          createdAt: new Date()
        })

        return successResponse({
          meetingId: meetingData.id,
          topic: meetingData.topic,
          joinUrl: meetingData.join_url,
          password: meetingData.password,
          startTime: meetingData.start_time,
          duration: meetingData.duration
        }, 201)
      } catch (err) {
        console.error('Zoom meeting error:', err)
        return errorResponse('Failed to create Zoom meeting', 500)
      }
    }

    // Get recent meetings
    if (action === 'list-meetings') {
      const meetingsCollection = db.collection('zoom_meetings')
      const meetings = await meetingsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray()

      return successResponse(meetings.map(m => ({
        id: m.id,
        topic: m.topic,
        joinUrl: m.joinUrl,
        startTime: m.startTime,
        duration: m.duration,
        createdAt: m.createdAt
      })))
    }

    // Update settings
    if (action === 'update-settings') {
      const result = await integrationsCollection.updateOne(
        { type: 'zoom' },
        { 
          $set: { 
            settings: config?.settings || {},
            updatedAt: new Date() 
          } 
        }
      )

      if (result.matchedCount === 0) {
        return errorResponse('Zoom integration not found', 404)
      }

      return successResponse({ message: 'Settings updated successfully' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Zoom POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process Zoom request', 500, error.message)
  }
}

// DELETE - Disconnect Zoom
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const result = await integrationsCollection.deleteMany({ type: 'zoom' })

    if (result.deletedCount === 0) {
      return errorResponse('Zoom integration not found', 404)
    }

    return successResponse({ message: 'Zoom disconnected successfully' })
  } catch (error) {
    console.error('Zoom DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect Zoom', 500, error.message)
  }
}
