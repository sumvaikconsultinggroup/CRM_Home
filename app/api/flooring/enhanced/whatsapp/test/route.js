import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Test WhatsApp connection
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const config = await request.json()
    const { provider, apiKey, apiSecret, phoneNumberId, webhookUrl } = config

    if (!provider || !apiKey) {
      return errorResponse('Provider and API key required', 400)
    }

    let testResult = { success: false, message: '' }

    switch (provider) {
      case 'interakt':
        // Test Interakt API
        try {
          const response = await fetch('https://api.interakt.ai/v1/public/track/users/', {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${apiKey}`,
              'Content-Type': 'application/json'
            }
          })
          if (response.ok || response.status === 401) {
            // 401 means auth worked but endpoint requires different permissions
            testResult = { success: response.ok, message: response.ok ? 'Connection successful' : 'API key may be invalid or missing permissions' }
          } else {
            testResult = { success: false, message: `API returned status ${response.status}` }
          }
        } catch (e) {
          testResult = { success: false, message: `Connection failed: ${e.message}` }
        }
        break

      case 'wati':
        // Test WATI API
        try {
          const baseUrl = apiSecret || 'https://live-server-9036.wati.io' // Use apiSecret as base URL for WATI
          const response = await fetch(`${baseUrl}/api/v1/getContacts?pageSize=1`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          })
          testResult = { 
            success: response.ok, 
            message: response.ok ? 'Connection successful' : `API returned status ${response.status}` 
          }
        } catch (e) {
          testResult = { success: false, message: `Connection failed: ${e.message}` }
        }
        break

      case 'gupshup':
        // Test Gupshup API
        try {
          const response = await fetch('https://api.gupshup.io/sm/api/v1/wallet/balance', {
            method: 'GET',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json'
            }
          })
          const data = await response.json()
          testResult = { 
            success: response.ok, 
            message: response.ok ? `Connection successful. Balance: ${data.balance || 'N/A'}` : 'Connection failed' 
          }
        } catch (e) {
          testResult = { success: false, message: `Connection failed: ${e.message}` }
        }
        break

      case 'meta':
        // Test Meta Cloud API
        if (!phoneNumberId) {
          return errorResponse('Phone Number ID required for Meta API', 400)
        }
        try {
          const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          })
          const data = await response.json()
          testResult = { 
            success: response.ok, 
            message: response.ok ? `Connection successful. Phone: ${data.display_phone_number || 'Connected'}` : (data.error?.message || 'Connection failed')
          }
        } catch (e) {
          testResult = { success: false, message: `Connection failed: ${e.message}` }
        }
        break

      case 'twilio':
        // Test Twilio API
        try {
          // apiKey = Account SID, apiSecret = Auth Token
          const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${apiKey}.json`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json'
            }
          })
          testResult = { 
            success: response.ok, 
            message: response.ok ? 'Connection successful' : 'Invalid credentials' 
          }
        } catch (e) {
          testResult = { success: false, message: `Connection failed: ${e.message}` }
        }
        break

      case 'custom':
        // Test custom endpoint
        if (!webhookUrl) {
          return errorResponse('Custom API endpoint URL required', 400)
        }
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: true })
          })
          testResult = { 
            success: response.ok, 
            message: response.ok ? 'Endpoint reachable' : `Endpoint returned status ${response.status}` 
          }
        } catch (e) {
          testResult = { success: false, message: `Connection failed: ${e.message}` }
        }
        break

      default:
        return errorResponse('Unknown provider', 400)
    }

    return successResponse(testResult)
  } catch (error) {
    console.error('WhatsApp Test Error:', error)
    return errorResponse('Test failed', 500, error.message)
  }
}
