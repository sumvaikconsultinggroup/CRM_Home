import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get Google Sheets integration status and linked sheets
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const sheetsIntegration = await integrationsCollection.findOne({ type: 'google-sheets' })

    return successResponse(sheetsIntegration ? sanitizeDocument(sheetsIntegration) : null)
  } catch (error) {
    console.error('Google Sheets GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch Google Sheets integration', 500, error.message)
  }
}

// POST - Connect Google Sheets or export data
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, spreadsheetUrl, sheetName, dataType, config } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')

    // Connect Google Sheets via URL
    if (action === 'connect') {
      if (!spreadsheetUrl) {
        return errorResponse('Google Sheets URL is required', 400)
      }

      // Extract spreadsheet ID from URL
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (!spreadsheetIdMatch) {
        return errorResponse('Invalid Google Sheets URL format', 400)
      }

      const spreadsheetId = spreadsheetIdMatch[1]

      // Remove existing integration
      await integrationsCollection.deleteMany({ type: 'google-sheets' })

      // Save new integration
      const integration = {
        id: uuidv4(),
        type: 'google-sheets',
        name: 'Google Sheets',
        spreadsheetUrl,
        spreadsheetId,
        linkedSheets: [],
        syncSettings: {
          leads: { enabled: true, sheetName: 'Leads' },
          projects: { enabled: true, sheetName: 'Projects' },
          tasks: { enabled: false, sheetName: 'Tasks' },
          expenses: { enabled: false, sheetName: 'Expenses' },
          contacts: { enabled: false, sheetName: 'Contacts' }
        },
        autoSync: false,
        lastSyncAt: null,
        active: true,
        connectedBy: user.id,
        connectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await integrationsCollection.insertOne(integration)
      return successResponse(sanitizeDocument(integration), 201)
    }

    // Export data to CSV (downloadable)
    if (action === 'export') {
      if (!dataType) {
        return errorResponse('Data type is required', 400)
      }

      let data = []
      let headers = []

      switch (dataType) {
        case 'leads':
          const leadsCollection = db.collection('leads')
          data = await leadsCollection.find({}).toArray()
          headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Value', 'Created At']
          data = data.map(l => ([
            l.name || '',
            l.email || '',
            l.phone || '',
            l.company || '',
            l.status || '',
            l.source || '',
            l.value || 0,
            l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ''
          ]))
          break

        case 'projects':
          const projectsCollection = db.collection('projects')
          data = await projectsCollection.find({}).toArray()
          headers = ['Name', 'Description', 'Status', 'Budget', 'Progress', 'Start Date', 'End Date']
          data = data.map(p => ([
            p.name || '',
            p.description || '',
            p.status || '',
            p.budget || 0,
            `${p.progress || 0}%`,
            p.startDate ? new Date(p.startDate).toLocaleDateString() : '',
            p.endDate ? new Date(p.endDate).toLocaleDateString() : ''
          ]))
          break

        case 'contacts':
          const contactsCollection = db.collection('contacts')
          data = await contactsCollection.find({}).toArray()
          headers = ['Name', 'Email', 'Phone', 'Company', 'Type', 'Created At']
          data = data.map(c => ([
            c.name || '',
            c.email || '',
            c.phone || '',
            c.company || '',
            c.type || '',
            c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
          ]))
          break

        case 'expenses':
          const expensesCollection = db.collection('expenses')
          data = await expensesCollection.find({}).toArray()
          headers = ['Description', 'Amount', 'Category', 'Date', 'Status']
          data = data.map(e => ([
            e.description || '',
            e.amount || 0,
            e.category || '',
            e.date ? new Date(e.date).toLocaleDateString() : '',
            e.approved ? 'Approved' : 'Pending'
          ]))
          break

        case 'tasks':
          const tasksCollection = db.collection('tasks')
          data = await tasksCollection.find({}).toArray()
          headers = ['Title', 'Description', 'Status', 'Priority', 'Due Date', 'Assigned To']
          data = data.map(t => ([
            t.title || '',
            t.description || '',
            t.status || '',
            t.priority || '',
            t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
            t.assignedTo || ''
          ]))
          break

        default:
          return errorResponse('Invalid data type', 400)
      }

      // Generate CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Log the export
      await integrationsCollection.updateOne(
        { type: 'google-sheets' },
        { 
          $set: { lastExportAt: new Date() },
          $push: { 
            exportHistory: {
              type: dataType,
              recordCount: data.length,
              exportedAt: new Date(),
              exportedBy: user.id
            }
          }
        }
      )

      return successResponse({
        csv: csvContent,
        filename: `buildcrm_${dataType}_${new Date().toISOString().split('T')[0]}.csv`,
        recordCount: data.length
      })
    }

    // Update sync settings
    if (action === 'update-settings') {
      const result = await integrationsCollection.updateOne(
        { type: 'google-sheets' },
        { 
          $set: { 
            syncSettings: config?.syncSettings || {},
            autoSync: config?.autoSync || false,
            updatedAt: new Date() 
          } 
        }
      )

      if (result.matchedCount === 0) {
        return errorResponse('Google Sheets integration not found', 404)
      }

      return successResponse({ message: 'Settings updated successfully' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Google Sheets POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to process Google Sheets request', 500, error.message)
  }
}

// DELETE - Disconnect Google Sheets
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const integrationsCollection = db.collection('integrations')
    
    const result = await integrationsCollection.deleteMany({ type: 'google-sheets' })

    if (result.deletedCount === 0) {
      return errorResponse('Google Sheets integration not found', 404)
    }

    return successResponse({ message: 'Google Sheets disconnected successfully' })
  } catch (error) {
    console.error('Google Sheets DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to disconnect Google Sheets', 500, error.message)
  }
}
