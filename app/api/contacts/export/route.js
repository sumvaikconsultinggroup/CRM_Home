import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Export contacts as CSV
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || '' // filter by type (customer, lead, vendor)
    const format = searchParams.get('format') || 'csv'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const contactsCollection = db.collection('contacts')

    // Build query
    const query = {}
    if (type) {
      query.type = type
    }

    const contacts = await contactsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Name',
        'Display Name',
        'Type',
        'Email',
        'Phone',
        'Alternate Phone',
        'Company',
        'GSTIN',
        'PAN',
        'Billing Address',
        'Shipping Address',
        'City',
        'State',
        'Pincode',
        'Country',
        'Payment Terms',
        'Credit Limit',
        'Tags',
        'Notes',
        'Source',
        'Website'
      ]

      const rows = contacts.map(c => [
        c.name || '',
        c.displayName || '',
        c.type || 'customer',
        c.email || '',
        c.phone || '',
        c.alternatePhone || '',
        c.company || '',
        c.gstin || '',
        c.pan || '',
        c.billingAddress || c.address || '',
        c.shippingAddress || '',
        c.city || '',
        c.state || '',
        c.pincode || '',
        c.country || 'India',
        c.paymentTerms || 'net30',
        c.creditLimit || 0,
        (c.tags || []).join('; '),
        (c.notes || '').replace(/"/g, '""'),
        c.source || 'manual',
        c.website || ''
      ])

      // Escape CSV values
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n')

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="contacts_${new Date().toISOString().split('T')[0]}.csv"`,
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Return JSON format
    return new Response(JSON.stringify({ contacts }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Contacts Export Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
