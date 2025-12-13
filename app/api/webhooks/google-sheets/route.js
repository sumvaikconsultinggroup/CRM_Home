import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Google Sheets Webhook Handler
// Receives data from Google Sheets (via Google Apps Script) and syncs with BuildCRM
export async function POST(request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')
    const secret = searchParams.get('secret')

    console.log('Google Sheets Webhook received:', { webhookId, hasSecret: !!secret })

    if (webhookId) {
      const integrationsCollection = await getCollection('integrations')
      const webhook = await integrationsCollection.findOne({
        id: webhookId,
        type: 'google-sheets',
        active: true
      })

      if (!webhook) {
        return errorResponse('Invalid webhook', 401)
      }

      if (secret && webhook.secret !== secret) {
        return errorResponse('Invalid webhook secret', 401)
      }

      const event = body.event || body.action || 'row.added'
      const data = body.data || body.row || body

      // Handle row additions from Google Sheets
      if (event === 'row.added' || event === 'lead.create' || event === 'new_row') {
        const leadsCollection = await getCollection(Collections.LEADS)
        
        // Map Google Sheets columns to lead fields
        // Supports both named columns and array format
        const newLead = {
          id: uuidv4(),
          clientId: webhook.clientId,
          name: data.name || data.Name || data[0] || 'Unknown',
          email: data.email || data.Email || data[1] || '',
          phone: data.phone || data.Phone || data.mobile || data.Mobile || data[2] || '',
          company: data.company || data.Company || data.business || data[3] || '',
          source: 'Google Sheets',
          status: 'new',
          value: parseFloat(data.value || data.Value || data.amount || data[4]) || 0,
          notes: data.notes || data.Notes || data.description || data[5] || '',
          tags: ['sheets-import'],
          sheetName: body.sheetName || data.sheetName,
          sheetRow: body.rowNumber || data.rowNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await leadsCollection.insertOne(newLead)
        console.log('Lead created from Google Sheets:', newLead.id)
        return successResponse({ success: true, leadId: newLead.id, message: 'Lead created successfully' })
      }

      // Handle bulk import from Google Sheets
      if (event === 'bulk.import' || event === 'sheet.sync') {
        const rows = body.rows || body.data || []
        const leadsCollection = await getCollection(Collections.LEADS)
        const createdLeads = []

        for (const row of rows) {
          const newLead = {
            id: uuidv4(),
            clientId: webhook.clientId,
            name: row.name || row.Name || row[0] || 'Unknown',
            email: row.email || row.Email || row[1] || '',
            phone: row.phone || row.Phone || row[2] || '',
            company: row.company || row.Company || row[3] || '',
            source: 'Google Sheets Bulk',
            status: 'new',
            value: parseFloat(row.value || row.Value || row[4]) || 0,
            notes: row.notes || row.Notes || row[5] || '',
            tags: ['sheets-bulk-import'],
            createdAt: new Date(),
            updatedAt: new Date()
          }

          await leadsCollection.insertOne(newLead)
          createdLeads.push(newLead.id)
        }

        console.log('Bulk import from Google Sheets:', createdLeads.length, 'leads')
        return successResponse({ 
          success: true, 
          count: createdLeads.length, 
          leadIds: createdLeads,
          message: `${createdLeads.length} leads imported successfully` 
        })
      }

      // Log webhook data
      const logsCollection = await getCollection('webhook_logs')
      await logsCollection.insertOne({
        id: uuidv4(),
        webhookId,
        source: 'google-sheets',
        event,
        data: body,
        processedAt: new Date()
      })

      return successResponse({ success: true, message: 'Webhook processed' })
    }

    return errorResponse('Webhook ID is required', 400)
  } catch (error) {
    console.error('Google Sheets Webhook Error:', error)
    return errorResponse('Failed to process webhook', 500, error.message)
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get('id')

  if (!webhookId) {
    return successResponse({ 
      status: 'active',
      integration: 'google-sheets',
      version: '1.0',
      supportedEvents: ['row.added', 'lead.create', 'new_row', 'bulk.import', 'sheet.sync'],
      appsScriptExample: `
// Google Apps Script example to send data to BuildCRM
function onFormSubmit(e) {
  var data = {
    event: 'row.added',
    data: {
      name: e.values[0],
      email: e.values[1],
      phone: e.values[2],
      company: e.values[3]
    },
    sheetName: SpreadsheetApp.getActiveSpreadsheet().getName()
  };
  
  var options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  
  UrlFetchApp.fetch('YOUR_WEBHOOK_URL', options);
}
      `.trim()
    })
  }

  try {
    const integrationsCollection = await getCollection('integrations')
    const webhook = await integrationsCollection.findOne({
      id: webhookId,
      type: 'google-sheets'
    })

    if (!webhook) {
      return errorResponse('Webhook not found', 404)
    }

    return successResponse({
      status: webhook.active ? 'active' : 'inactive',
      integration: 'google-sheets',
      connectedAt: webhook.createdAt,
      webhookUrl: webhook.webhookUrl
    })
  } catch (error) {
    return errorResponse('Failed to verify webhook', 500)
  }
}
