import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch white label settings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('whitelabel_settings')

    let settings = await settingsCollection.findOne({ clientId: user.clientId })

    if (!settings) {
      // Return defaults
      settings = {
        id: uuidv4(),
        clientId: user.clientId,
        enabled: false,
        companyName: '',
        tagline: '',
        logo: '',
        logoDark: '',
        favicon: '',
        appleTouchIcon: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#10B981',
        successColor: '#22C55E',
        warningColor: '#F59E0B',
        errorColor: '#EF4444',
        headingFont: 'inter',
        bodyFont: 'inter',
        fontSize: 'medium',
        sidebarStyle: 'dark',
        buttonStyle: 'rounded-lg',
        cardStyle: 'shadow',
        borderRadius: 'medium',
        darkModeEnabled: true,
        darkModeDefault: false,
        customDomain: '',
        sslEnabled: true,
        loginBackgroundImage: '',
        loginBackgroundColor: '#f8fafc',
        loginWelcomeText: 'Welcome Back',
        loginTagline: 'Sign in to continue',
        loginShowLogo: true,
        loginShowSocialLinks: false,
        emailBrandingEnabled: false,
        emailHeaderLogo: '',
        emailHeaderBgColor: '#3B82F6',
        emailFooterText: '',
        emailSignature: '',
        emailFromName: '',
        emailReplyTo: '',
        pdfBrandingEnabled: false,
        pdfLogo: '',
        pdfHeaderColor: '#3B82F6',
        pdfFooterText: '',
        pdfShowWatermark: false,
        smsBrandingEnabled: false,
        smsPrefix: '',
        pushNotificationIcon: '',
        socialLinks: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: '',
          youtube: ''
        },
        footerText: '',
        copyrightText: '',
        privacyPolicyUrl: '',
        termsOfServiceUrl: '',
        customCSS: '',
        customJS: '',
        customMetaTags: '',
        googleAnalyticsId: '',
        facebookPixelId: '',
        intercomAppId: '',
        hideBuiltByBadge: false,
        customLoadingScreen: false,
        customErrorPages: false,
        customEmptyStates: false,
        defaultLanguage: 'en',
        defaultTimezone: 'UTC',
        defaultCurrency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }

    return successResponse(sanitizeDocument(settings))
  } catch (error) {
    console.error('WhiteLabel GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch white label settings', 500, error.message)
  }
}

// PUT - Update white label settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('whitelabel_settings')

    const now = new Date()

    // Check if settings exist
    const existing = await settingsCollection.findOne({ clientId: user.clientId })

    if (existing) {
      // Update existing
      const updateData = {
        ...body,
        clientId: user.clientId,
        updatedAt: now,
        updatedBy: user.id
      }
      delete updateData.id
      delete updateData._id
      delete updateData.createdAt

      await settingsCollection.updateOne(
        { clientId: user.clientId },
        { $set: updateData }
      )

      const updated = await settingsCollection.findOne({ clientId: user.clientId })
      return successResponse(sanitizeDocument(updated))
    } else {
      // Create new
      const newSettings = {
        id: uuidv4(),
        clientId: user.clientId,
        ...body,
        createdAt: now,
        updatedAt: now,
        createdBy: user.id
      }

      await settingsCollection.insertOne(newSettings)
      return successResponse(sanitizeDocument(newSettings), 201)
    }
  } catch (error) {
    console.error('WhiteLabel PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update white label settings', 500, error.message)
  }
}
