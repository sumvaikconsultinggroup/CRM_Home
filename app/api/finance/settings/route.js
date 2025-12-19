import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'

const successResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

const errorResponse = (message, status = 500, details = null) => {
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// GET - Get invoice/finance settings
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('finance_settings')

    let settings = await settingsCollection.findOne({ clientId: user.clientId })

    if (!settings) {
      // Return default settings
      settings = getDefaultSettings(user.clientId)
    }

    return successResponse({ settings })
  } catch (error) {
    console.error('Finance Settings GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to get settings', 500, error.message)
  }
}

// POST/PUT - Save invoice/finance settings
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('finance_settings')

    const existingSettings = await settingsCollection.findOne({ clientId: user.clientId })

    const settings = {
      id: existingSettings?.id || uuidv4(),
      clientId: user.clientId,
      
      // Company Branding
      brandLogo: body.brandLogo || existingSettings?.brandLogo || '',
      brandName: body.brandName || existingSettings?.brandName || '',
      companyName: body.companyName || existingSettings?.companyName || '',
      
      // GST & Tax Info
      gstin: body.gstin || existingSettings?.gstin || '',
      pan: body.pan || existingSettings?.pan || '',
      gstName: body.gstName || existingSettings?.gstName || '',
      placeOfSupply: body.placeOfSupply || existingSettings?.placeOfSupply || '',
      stateCode: body.stateCode || existingSettings?.stateCode || '',
      
      // Address
      address: {
        line1: body.address?.line1 || existingSettings?.address?.line1 || '',
        line2: body.address?.line2 || existingSettings?.address?.line2 || '',
        city: body.address?.city || existingSettings?.address?.city || '',
        state: body.address?.state || existingSettings?.address?.state || '',
        pincode: body.address?.pincode || existingSettings?.address?.pincode || '',
        country: body.address?.country || existingSettings?.address?.country || 'India'
      },
      
      // Contact
      phone: body.phone || existingSettings?.phone || '',
      email: body.email || existingSettings?.email || '',
      website: body.website || existingSettings?.website || '',
      
      // Bank Details
      bankDetails: {
        accountHolderName: body.bankDetails?.accountHolderName || existingSettings?.bankDetails?.accountHolderName || '',
        accountNumber: body.bankDetails?.accountNumber || existingSettings?.bankDetails?.accountNumber || '',
        ifscCode: body.bankDetails?.ifscCode || existingSettings?.bankDetails?.ifscCode || '',
        bankName: body.bankDetails?.bankName || existingSettings?.bankDetails?.bankName || '',
        branchName: body.bankDetails?.branchName || existingSettings?.bankDetails?.branchName || '',
        accountType: body.bankDetails?.accountType || existingSettings?.bankDetails?.accountType || 'Current',
        upiId: body.bankDetails?.upiId || existingSettings?.bankDetails?.upiId || ''
      },
      
      // QR Code for payment
      paymentQRCode: body.paymentQRCode || existingSettings?.paymentQRCode || '',
      
      // Terms & Conditions
      termsAndConditions: body.termsAndConditions || existingSettings?.termsAndConditions || [
        'Payment is due within 15 days from the invoice date.',
        'Interest @ 18% per annum will be charged on overdue payments.',
        'Please quote the invoice number for all remittances.'
      ],
      
      // Payment Terms
      paymentTerms: body.paymentTerms || existingSettings?.paymentTerms || {
        defaultDueDays: 15,
        earlyPaymentDiscount: 0,
        earlyPaymentDays: 7,
        lateFeePercentage: 18
      },
      
      // Invoice Customization
      invoicePrefix: body.invoicePrefix || existingSettings?.invoicePrefix || 'INV',
      invoiceNumberFormat: body.invoiceNumberFormat || existingSettings?.invoiceNumberFormat || 'YYYY-MM-NNNN',
      defaultCurrency: body.defaultCurrency || existingSettings?.defaultCurrency || 'INR',
      
      // Additional Notes Template
      additionalNotes: body.additionalNotes || existingSettings?.additionalNotes || '',
      
      // Signature
      authorizedSignature: body.authorizedSignature || existingSettings?.authorizedSignature || '',
      authorizedSignatoryName: body.authorizedSignatoryName || existingSettings?.authorizedSignatoryName || '',
      
      // Metadata
      createdAt: existingSettings?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    }

    await settingsCollection.updateOne(
      { clientId: user.clientId },
      { $set: settings },
      { upsert: true }
    )

    return successResponse({ 
      message: 'Settings saved successfully',
      settings 
    })
  } catch (error) {
    console.error('Finance Settings POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to save settings', 500, error.message)
  }
}

function getDefaultSettings(clientId) {
  return {
    id: null,
    clientId,
    brandLogo: '',
    brandName: '',
    companyName: '',
    gstin: '',
    pan: '',
    gstName: '',
    placeOfSupply: '',
    stateCode: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    phone: '',
    email: '',
    website: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'Current',
      upiId: ''
    },
    paymentQRCode: '',
    termsAndConditions: [
      'Payment is due within 15 days from the invoice date.',
      'Interest @ 18% per annum will be charged on overdue payments.',
      'Please quote the invoice number for all remittances.'
    ],
    paymentTerms: {
      defaultDueDays: 15,
      earlyPaymentDiscount: 0,
      earlyPaymentDays: 7,
      lateFeePercentage: 18
    },
    invoicePrefix: 'INV',
    invoiceNumberFormat: 'YYYY-MM-NNNN',
    defaultCurrency: 'INR',
    additionalNotes: '',
    authorizedSignature: '',
    authorizedSignatoryName: ''
  }
}
