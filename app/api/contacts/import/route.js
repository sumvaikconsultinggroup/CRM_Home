import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Import contacts from CSV
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const formData = await request.formData()
    const file = formData.get('file')
    const skipDuplicates = formData.get('skipDuplicates') === 'true'

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return errorResponse('CSV file must have header row and at least one data row', 400)
    }

    // Parse CSV header
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

    // Map CSV headers to our field names
    const fieldMap = {
      'name': 'name',
      'display name': 'displayName',
      'displayname': 'displayName',
      'type': 'type',
      'email': 'email',
      'phone': 'phone',
      'alternate phone': 'alternatePhone',
      'alternatephone': 'alternatePhone',
      'mobile': 'phone',
      'company': 'company',
      'organization': 'company',
      'gstin': 'gstin',
      'gst': 'gstin',
      'gst number': 'gstin',
      'pan': 'pan',
      'pan number': 'pan',
      'billing address': 'billingAddress',
      'billingaddress': 'billingAddress',
      'address': 'billingAddress',
      'shipping address': 'shippingAddress',
      'shippingaddress': 'shippingAddress',
      'city': 'city',
      'state': 'state',
      'pincode': 'pincode',
      'zip': 'pincode',
      'zipcode': 'pincode',
      'country': 'country',
      'payment terms': 'paymentTerms',
      'paymentterms': 'paymentTerms',
      'credit limit': 'creditLimit',
      'creditlimit': 'creditLimit',
      'tags': 'tags',
      'notes': 'notes',
      'source': 'source',
      'website': 'website'
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const contactsCollection = db.collection('contacts')
    const now = new Date()

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])
        if (values.length === 0 || values.every(v => !v.trim())) continue

        const contact = {
          id: uuidv4(),
          clientId: user.clientId,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
          totalRevenue: 0,
          totalProjects: 0,
          source: 'import'
        }

        // Map values to fields
        headers.forEach((header, idx) => {
          const fieldName = fieldMap[header]
          if (fieldName && values[idx]) {
            let value = values[idx].trim()
            
            // Special handling for certain fields
            if (fieldName === 'tags') {
              value = value.split(/[;,]/).map(t => t.trim()).filter(Boolean)
            } else if (fieldName === 'creditLimit') {
              value = parseFloat(value) || 0
            } else if (fieldName === 'type') {
              value = value.toLowerCase()
              if (!['customer', 'lead', 'vendor', 'other'].includes(value)) {
                value = 'customer'
              }
            }
            
            contact[fieldName] = value
          }
        })

        // Validate required field
        if (!contact.name) {
          results.errors.push({ row: i + 1, error: 'Name is required' })
          continue
        }

        // Set defaults
        contact.displayName = contact.displayName || contact.name
        contact.type = contact.type || 'customer'
        contact.tags = contact.tags || []

        // Check for duplicate email
        if (contact.email) {
          const existing = await contactsCollection.findOne({ 
            email: contact.email.toLowerCase() 
          })
          if (existing) {
            if (skipDuplicates) {
              results.skipped++
              continue
            } else {
              results.errors.push({ row: i + 1, error: `Duplicate email: ${contact.email}` })
              continue
            }
          }
          contact.email = contact.email.toLowerCase()
        }

        await contactsCollection.insertOne(contact)
        results.imported++
      } catch (err) {
        results.errors.push({ row: i + 1, error: err.message })
      }
    }

    return successResponse({
      message: `Import completed: ${results.imported} contacts imported`,
      results
    })
  } catch (error) {
    console.error('Contacts Import Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to import contacts', 500, error.message)
  }
}

// Helper function to parse CSV line (handles quoted values)
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}
