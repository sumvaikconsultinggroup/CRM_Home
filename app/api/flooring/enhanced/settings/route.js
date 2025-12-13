import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch module settings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settings = db.collection('flooring_settings')

    let moduleSettings = await settings.findOne({ type: 'module_config' })

    if (!moduleSettings) {
      // Create default settings
      moduleSettings = {
        id: uuidv4(),
        type: 'module_config',
        general: {
          companyName: '',
          gstin: '',
          defaultTaxRate: 18,
          quoteValidityDays: 30,
          invoicePrefix: 'INV',
          quotePrefix: 'FLQ',
          defaultPaymentTerms: 'Net 30',
          laborRatePerSqft: 25,
          defaultWastagePercent: 10
        },
        whatsapp: {
          provider: '',
          apiKey: '',
          apiSecret: '',
          phoneNumberId: '',
          webhookUrl: '',
          enabled: false
        },
        bankDetails: {
          bankName: '',
          accountName: '',
          accountNumber: '',
          ifscCode: '',
          upiId: ''
        },
        sync: {
          autoSyncCustomers: true,
          autoSyncProjects: true,
          bidirectionalSync: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await settings.insertOne(moduleSettings)
    }

    return successResponse({ settings: moduleSettings })
  } catch (error) {
    console.error('Settings GET Error:', error)
    return errorResponse('Failed to fetch settings', 500, error.message)
  }
}

// POST - Save module settings
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settings = db.collection('flooring_settings')

    const now = new Date().toISOString()

    const updateData = {
      updatedAt: now,
      updatedBy: user.id
    }

    if (body.general) updateData.general = body.general
    if (body.whatsapp) updateData.whatsapp = body.whatsapp
    if (body.bankDetails) updateData.bankDetails = body.bankDetails
    if (body.sync) updateData.sync = body.sync

    const result = await settings.findOneAndUpdate(
      { type: 'module_config' },
      { 
        $set: updateData,
        $setOnInsert: { id: uuidv4(), type: 'module_config', createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    )

    return successResponse({ message: 'Settings saved', settings: result })
  } catch (error) {
    console.error('Settings POST Error:', error)
    return errorResponse('Failed to save settings', 500, error.message)
  }
}
