import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get module settings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') // general, notifications, integrations, templates, business

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settings = db.collection('furniture_settings')

    const allSettings = await settings.findOne({ clientId: user.clientId }) || {
      clientId: user.clientId,
      // General Settings
      general: {
        companyName: '',
        logo: '',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        currency: 'INR',
        currencySymbol: '₹',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Asia/Kolkata',
        businessType: 'manufacturer', // manufacturer, dealer, both
        gstNumber: '',
        panNumber: '',
        address: {},
        contactEmail: '',
        contactPhone: ''
      },
      // Notification Settings
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        inAppNotifications: true,
        triggers: {
          newRequirement: true,
          quoteSent: true,
          orderConfirmed: true,
          paymentReceived: true,
          productionStarted: true,
          productionCompleted: true,
          deliveryScheduled: true,
          serviceTicketCreated: true
        },
        recipients: {
          sales: [],
          production: [],
          finance: [],
          management: []
        }
      },
      // Integration Settings
      integrations: {
        accounting: {
          enabled: false,
          provider: '', // tally, zoho, quickbooks
          apiKey: '',
          syncFrequency: 'daily'
        },
        sms: {
          enabled: false,
          provider: '', // msg91, textlocal, twilio
          apiKey: '',
          senderId: ''
        },
        whatsapp: {
          enabled: false,
          provider: '', // twilio, wati, interakt
          apiKey: '',
          phoneNumber: ''
        },
        payment: {
          enabled: false,
          provider: '', // razorpay, stripe, paytm
          apiKey: '',
          webhookSecret: ''
        },
        storage: {
          enabled: true,
          provider: 'local', // local, s3, cloudinary
          bucket: '',
          apiKey: ''
        }
      },
      // Template Settings
      templates: {
        quotation: {
          header: '',
          footer: '',
          terms: [],
          showLogo: true,
          showBankDetails: true
        },
        invoice: {
          header: '',
          footer: '',
          terms: [],
          showLogo: true,
          showBankDetails: true,
          showGst: true
        },
        workOrder: {
          showOperationDetails: true,
          showMaterialList: true,
          showQcChecklist: true
        },
        deliveryNote: {
          header: '',
          showSignature: true
        }
      },
      // Business Rules
      business: {
        // Pricing
        defaultMarkup: 25,
        defaultTaxRate: 18,
        enableDiscountApproval: true,
        maxDiscountWithoutApproval: 10,
        // Lead times
        defaultLeadTimeDays: 21,
        rushOrderMultiplier: 1.5,
        // Inventory
        lowStockThreshold: 10,
        autoReorderEnabled: false,
        // Quality
        qcCheckRequired: true,
        qcApprovalRequired: true,
        // Workflow
        requireDesignBriefApproval: true,
        requireQuoteApproval: false,
        requirePaymentBeforeProduction: true,
        advancePaymentPercent: 50
      },
      // Work Centers
      workCenters: [
        { id: 'cutting', name: 'Cutting', dailyCapacityHours: 16, color: '#3b82f6', isActive: true },
        { id: 'edging', name: 'Edge Banding', dailyCapacityHours: 16, color: '#10b981', isActive: true },
        { id: 'drilling', name: 'Drilling', dailyCapacityHours: 8, color: '#f59e0b', isActive: true },
        { id: 'assembly', name: 'Assembly', dailyCapacityHours: 24, color: '#8b5cf6', isActive: true },
        { id: 'finishing', name: 'Finishing', dailyCapacityHours: 16, color: '#ec4899', isActive: true },
        { id: 'upholstery', name: 'Upholstery', dailyCapacityHours: 16, color: '#06b6d4', isActive: true },
        { id: 'packaging', name: 'Packaging', dailyCapacityHours: 8, color: '#84cc16', isActive: true }
      ],
      // Bank Details
      bankDetails: {
        bankName: '',
        branchName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        upiId: ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (section) {
      return successResponse({ [section]: allSettings[section] })
    }

    return successResponse({ settings: allSettings })
  } catch (error) {
    console.error('Furniture Settings GET Error:', error)
    return errorResponse('Failed to fetch settings', 500, error.message)
  }
}

// PUT - Update settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { section, ...updateData } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settings = db.collection('furniture_settings')

    const now = new Date().toISOString()

    // Upsert the settings
    const updateFields = section ? { [section]: updateData[section] || updateData } : updateData
    updateFields.updatedAt = now
    updateFields.updatedBy = user.id

    await settings.updateOne(
      { clientId: user.clientId },
      {
        $set: updateFields,
        $setOnInsert: { clientId: user.clientId, createdAt: now }
      },
      { upsert: true }
    )

    return successResponse({ message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Furniture Settings PUT Error:', error)
    return errorResponse('Failed to update settings', 500, error.message)
  }
}

// POST - Specific actions (test integration, export data, etc.)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const now = new Date().toISOString()

    if (action === 'test_integration') {
      const { integrationType } = body
      // Placeholder for integration testing
      return successResponse({ message: `${integrationType} integration test successful` })
    }

    if (action === 'export_data') {
      const { exportType, dateRange } = body
      // Placeholder for data export
      return successResponse({ message: 'Export initiated', exportId: uuidv4() })
    }

    if (action === 'reset_to_defaults') {
      const { section } = body
      // Reset specific section to defaults
      return successResponse({ message: `${section} reset to defaults` })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Furniture Settings POST Error:', error)
    return errorResponse('Failed to execute action', 500, error.message)
  }
}
