import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { generateInvoiceHTML } from '@/lib/templates/invoice-template'

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET - Generate Invoice PDF using unified template
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')

    if (!invoiceId) {
      return new Response('Invoice ID required', { status: 400 })
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoicesCollection = db.collection('flooring_invoices')
    const settingsCollection = db.collection('finance_settings')

    const invoice = await invoicesCollection.findOne({ id: invoiceId })

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 })
    }

    // Get finance settings (company info, bank details, terms, etc.)
    let settings = await settingsCollection.findOne({ clientId: user.clientId })
    
    // If no settings, get basic info from client record
    if (!settings) {
      const { getMainDb } = await import('@/lib/db/multitenancy')
      const mainDb = await getMainDb()
      const client = await mainDb.collection('clients').findOne({ clientCode: user.clientId })
      
      settings = {
        companyName: client?.companyName || '',
        brandName: client?.companyName || '',
        gstin: client?.gstin || '',
        pan: client?.pan || '',
        address: {
          line1: client?.address || '',
          city: client?.city || '',
          state: client?.state || '',
          pincode: client?.pincode || ''
        },
        phone: client?.phone || '',
        email: client?.email || '',
        bankDetails: {
          accountHolderName: client?.bankAccountName || client?.companyName || '',
          accountNumber: client?.accountNumber || '',
          ifscCode: client?.ifscCode || '',
          bankName: client?.bankName || '',
          accountType: 'Current'
        },
        termsAndConditions: [
          'Payment is due within 15 days from the invoice date.',
          'Interest @ 18% per annum will be charged on overdue payments.',
          'Please quote the invoice number for all remittances.'
        ]
      }
    }

    // Generate HTML Invoice using unified template
    const html = generateInvoiceHTML(invoice, settings)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="Invoice-${invoice.invoiceNumber || invoice.id}.html"`,
      },
    })
  } catch (error) {
    console.error('Invoice PDF Error:', error)
    if (error.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 })
    }
    return new Response('Failed to generate invoice', { status: 500 })
  }
}
