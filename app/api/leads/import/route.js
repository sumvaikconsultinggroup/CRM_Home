import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return errorResponse('No file uploaded', 400)
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return errorResponse('CSV file must have headers and at least one data row', 400)
    }

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const data = lines.slice(1)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')
    
    const imported = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      try {
        const values = data[i].split(',').map(v => v.trim())
        const row = {}
        
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })

        // Validate required fields
        if (!row.name || !row.email) {
          errors.push({ row: i + 2, error: 'Missing required fields: name or email' })
          continue
        }

        // Check for duplicate email
        const existing = await leadsCollection.findOne({ 
          email: row.email 
        })
        
        if (existing) {
          errors.push({ row: i + 2, error: `Duplicate email: ${row.email}` })
          continue
        }

        const lead = {
          id: uuidv4(),
          clientId: user.clientId,
          name: row.name,
          email: row.email,
          phone: row.phone || '',
          company: row.company || '',
          source: row.source || 'import',
          status: row.status || 'new',
          value: parseFloat(row.value) || 0,
          priority: row.priority || 'medium',
          notes: row.notes || '',
          nextFollowUp: row.nextfollowup ? new Date(row.nextfollowup) : null,
          assignedTo: row.assignedto || user.id,
          tags: row.tags ? row.tags.split(';').map(t => t.trim()) : [],
          score: 0,
          activities: [],
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await leadsCollection.insertOne(lead)
        imported.push(lead.email)
      } catch (error) {
        errors.push({ row: i + 2, error: error.message })
      }
    }

    return successResponse({
      success: true,
      imported: imported.length,
      failed: errors.length,
      errors: errors.slice(0, 10), // Return first 10 errors
      message: `Successfully imported ${imported.length} leads. ${errors.length} failed.`
    })
  } catch (error) {
    console.error('Lead Import Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to import leads', 500, error.message)
  }
}
