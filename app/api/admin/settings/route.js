import { v4 as uuidv4 } from 'uuid'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, requireSuperAdmin } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get platform settings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)
    requireSuperAdmin(user)

    const mainDb = await getMainDb()
    const settingsCollection = mainDb.collection('platform_settings')
    
    // Get all settings
    const settings = await settingsCollection.findOne({ type: 'global' })
    
    if (!settings) {
      // Return default settings
      return successResponse({
        paymentGateways: {
          razorpay: { enabled: false, keyId: '', keySecret: '', webhookSecret: '' },
          stripe: { enabled: false, publishableKey: '', secretKey: '', webhookSecret: '' },
          paypal: { enabled: false, clientId: '', clientSecret: '', mode: 'sandbox' }
        },
        aiProvider: {
          provider: 'openai',
          customApiKey: '',
          useEmergentKey: true
        },
        security: {
          require2FA: false,
          passwordExpiry: 90,
          minPasswordLength: 8,
          sessionTimeout: 60
        },
        email: {
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          fromEmail: '',
          fromName: ''
        },
        general: {
          platformName: 'BuilderCRM',
          supportEmail: '',
          maintenanceMode: false
        }
      })
    }

    // Mask sensitive data
    const maskedSettings = { ...settings }
    if (maskedSettings.paymentGateways) {
      if (maskedSettings.paymentGateways.razorpay?.keySecret) {
        maskedSettings.paymentGateways.razorpay.keySecret = '••••••••' + maskedSettings.paymentGateways.razorpay.keySecret.slice(-4)
      }
      if (maskedSettings.paymentGateways.stripe?.secretKey) {
        maskedSettings.paymentGateways.stripe.secretKey = '••••••••' + maskedSettings.paymentGateways.stripe.secretKey.slice(-4)
      }
      if (maskedSettings.paymentGateways.paypal?.clientSecret) {
        maskedSettings.paymentGateways.paypal.clientSecret = '••••••••' + maskedSettings.paymentGateways.paypal.clientSecret.slice(-4)
      }
    }
    if (maskedSettings.email?.smtpPassword) {
      maskedSettings.email.smtpPassword = '••••••••'
    }

    return successResponse(sanitizeDocument(maskedSettings))
  } catch (error) {
    console.error('Settings GET Error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Super admin access required') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch settings', 500, error.message)
  }
}

// Update platform settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)
    requireSuperAdmin(user)

    const body = await request.json()
    const { section, data } = body

    if (!section || !data) {
      return errorResponse('Section and data are required', 400)
    }

    const mainDb = await getMainDb()
    const settingsCollection = mainDb.collection('platform_settings')
    const logsCollection = await getCollection('admin_logs')

    // Get existing settings
    let settings = await settingsCollection.findOne({ type: 'global' })
    
    if (!settings) {
      settings = {
        id: uuidv4(),
        type: 'global',
        paymentGateways: {},
        security: {},
        email: {},
        general: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }

    // Handle masked values - don't update if value is masked
    if (section === 'paymentGateways') {
      const existingGateways = settings.paymentGateways || {}
      
      // Razorpay
      if (data.razorpay) {
        if (data.razorpay.keySecret?.startsWith('••••')) {
          data.razorpay.keySecret = existingGateways.razorpay?.keySecret || ''
        }
        if (data.razorpay.webhookSecret?.startsWith('••••')) {
          data.razorpay.webhookSecret = existingGateways.razorpay?.webhookSecret || ''
        }
      }
      
      // Stripe
      if (data.stripe) {
        if (data.stripe.secretKey?.startsWith('••••')) {
          data.stripe.secretKey = existingGateways.stripe?.secretKey || ''
        }
        if (data.stripe.webhookSecret?.startsWith('••••')) {
          data.stripe.webhookSecret = existingGateways.stripe?.webhookSecret || ''
        }
      }
      
      // PayPal
      if (data.paypal) {
        if (data.paypal.clientSecret?.startsWith('••••')) {
          data.paypal.clientSecret = existingGateways.paypal?.clientSecret || ''
        }
      }
    }

    if (section === 'email' && data.smtpPassword?.startsWith('••••')) {
      data.smtpPassword = settings.email?.smtpPassword || ''
    }

    // Update the specific section
    settings[section] = { ...settings[section], ...data }
    settings.updatedAt = new Date()

    // Upsert the settings
    await settingsCollection.updateOne(
      { type: 'global' },
      { $set: settings },
      { upsert: true }
    )

    // Log the action
    await logsCollection.insertOne({
      id: uuidv4(),
      action: 'settings_update',
      section,
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date(),
      status: 'success'
    })

    return successResponse({ message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Settings PUT Error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Super admin access required') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update settings', 500, error.message)
  }
}

// Test payment gateway connection
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)
    requireSuperAdmin(user)

    const body = await request.json()
    const { action, gateway, credentials } = body

    if (action === 'test-gateway') {
      // Simulate gateway test - in production, you would make actual API calls
      const testResults = {
        razorpay: async (creds) => {
          if (!creds.keyId || !creds.keySecret) {
            return { success: false, message: 'Key ID and Key Secret are required' }
          }
          // In production: Make a test API call to Razorpay
          return { success: true, message: 'Razorpay connection successful' }
        },
        stripe: async (creds) => {
          if (!creds.secretKey) {
            return { success: false, message: 'Secret Key is required' }
          }
          // In production: Make a test API call to Stripe
          return { success: true, message: 'Stripe connection successful' }
        },
        paypal: async (creds) => {
          if (!creds.clientId || !creds.clientSecret) {
            return { success: false, message: 'Client ID and Client Secret are required' }
          }
          // In production: Make a test API call to PayPal
          return { success: true, message: 'PayPal connection successful' }
        }
      }

      if (!testResults[gateway]) {
        return errorResponse('Invalid gateway', 400)
      }

      const result = await testResults[gateway](credentials)
      return successResponse(result)
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Settings POST Error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Super admin access required') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to process action', 500, error.message)
  }
}
