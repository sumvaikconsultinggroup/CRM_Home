import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch automation rules
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')
    const trigger = searchParams.get('trigger')
    const active = searchParams.get('active')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_automation_rules')
    
    let query = {}
    if (ruleId) query.id = ruleId
    if (trigger) query.trigger = trigger
    if (active !== null) query.active = active === 'true'

    const rules = await collection.find(query).sort({ createdAt: -1 }).toArray()

    // Also fetch execution logs
    const logsCollection = db.collection('dw_automation_logs')
    const recentLogs = await logsCollection.find({}).sort({ executedAt: -1 }).limit(50).toArray()

    const stats = {
      total: rules.length,
      active: rules.filter(r => r.active).length,
      inactive: rules.filter(r => !r.active).length,
      recentExecutions: recentLogs.length,
      successRate: recentLogs.length > 0 
        ? Math.round(recentLogs.filter(l => l.status === 'success').length / recentLogs.length * 100)
        : 0
    }

    return successResponse({ rules: sanitizeDocuments(rules), recentLogs: sanitizeDocuments(recentLogs), stats })
  } catch (error) {
    console.error('DW Automation GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch automation rules', 500, error.message)
  }
}

// POST - Create automation rule or execute
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Execute automation (called by other APIs when events happen)
    if (action === 'execute') {
      const rulesCollection = db.collection('dw_automation_rules')
      const logsCollection = db.collection('dw_automation_logs')

      // Find matching rules
      const rules = await rulesCollection.find({
        trigger: body.trigger,
        active: true
      }).toArray()

      const results = []

      for (const rule of rules) {
        // Check conditions
        let conditionsMet = true
        if (rule.conditions && rule.conditions.length > 0) {
          for (const condition of rule.conditions) {
            const value = body.data?.[condition.field]
            switch (condition.operator) {
              case 'equals':
                if (value !== condition.value) conditionsMet = false
                break
              case 'not_equals':
                if (value === condition.value) conditionsMet = false
                break
              case 'contains':
                if (!String(value).includes(condition.value)) conditionsMet = false
                break
              case 'greater_than':
                if (parseFloat(value) <= parseFloat(condition.value)) conditionsMet = false
                break
              case 'less_than':
                if (parseFloat(value) >= parseFloat(condition.value)) conditionsMet = false
                break
            }
          }
        }

        if (!conditionsMet) continue

        // Execute actions
        for (const actionItem of rule.actions) {
          const log = {
            id: uuidv4(),
            ruleId: rule.id,
            ruleName: rule.name,
            trigger: body.trigger,
            action: actionItem.type,
            recipient: actionItem.recipient || '',
            channel: actionItem.channel,
            status: 'pending',
            executedAt: new Date(),
            inputData: body.data,
            result: null,
            error: null
          }

          try {
            switch (actionItem.channel) {
              case 'whatsapp':
                // Get WhatsApp integration
                const whatsappIntegration = await db.collection('integrations').findOne({ type: 'whatsapp', active: true })
                if (whatsappIntegration) {
                  // Replace template variables
                  let message = actionItem.template || ''
                  Object.entries(body.data || {}).forEach(([key, value]) => {
                    message = message.replace(`{{${key}}}`, value)
                  })
                  
                  const recipientPhone = actionItem.recipientField 
                    ? body.data?.[actionItem.recipientField]
                    : actionItem.recipient

                  if (recipientPhone) {
                    // In production, send via WhatsApp API
                    log.result = { message, to: recipientPhone }
                    log.status = 'success'
                  } else {
                    log.status = 'skipped'
                    log.error = 'No recipient phone number'
                  }
                } else {
                  log.status = 'skipped'
                  log.error = 'WhatsApp not configured'
                }
                break

              case 'email':
                const recipientEmail = actionItem.recipientField 
                  ? body.data?.[actionItem.recipientField]
                  : actionItem.recipient
                
                if (recipientEmail) {
                  log.result = { to: recipientEmail, template: actionItem.template }
                  log.status = 'success'
                } else {
                  log.status = 'skipped'
                  log.error = 'No recipient email'
                }
                break

              case 'webhook':
                if (actionItem.webhookUrl) {
                  try {
                    await fetch(actionItem.webhookUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        trigger: body.trigger,
                        data: body.data,
                        timestamp: new Date().toISOString()
                      })
                    })
                    log.status = 'success'
                  } catch (err) {
                    log.status = 'failed'
                    log.error = err.message
                  }
                }
                break

              case 'slack':
                const slackIntegration = await db.collection('integrations').findOne({ type: 'slack', active: true })
                if (slackIntegration) {
                  let message = actionItem.template || ''
                  Object.entries(body.data || {}).forEach(([key, value]) => {
                    message = message.replace(`{{${key}}}`, value)
                  })
                  log.result = { message }
                  log.status = 'success'
                } else {
                  log.status = 'skipped'
                  log.error = 'Slack not configured'
                }
                break
            }
          } catch (err) {
            log.status = 'failed'
            log.error = err.message
          }

          await logsCollection.insertOne(log)
          results.push(log)
        }

        // Update rule execution count
        await rulesCollection.updateOne(
          { id: rule.id },
          { 
            $inc: { executionCount: 1 },
            $set: { lastExecutedAt: new Date() }
          }
        )
      }

      return successResponse({ executed: results.length, results: sanitizeDocuments(results) })
    }

    // Create new automation rule
    const collection = db.collection('dw_automation_rules')

    const rule = {
      id: uuidv4(),
      clientId: user.clientId,
      
      name: body.name || 'New Automation',
      description: body.description || '',
      
      // Trigger
      trigger: body.trigger || '', // survey-completed, quote-sent, payment-due, dispatch-scheduled, installation-completed, etc.
      
      // Conditions
      conditions: body.conditions || [], // [{ field, operator, value }]
      
      // Actions
      actions: body.actions || [], // [{ type, channel, recipient, recipientField, template, webhookUrl }]
      
      // Delay
      delayMinutes: parseInt(body.delayMinutes) || 0,
      
      // Status
      active: body.active !== false,
      
      // Stats
      executionCount: 0,
      lastExecutedAt: null,
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(rule)
    return successResponse(sanitizeDocument(rule), 201)
  } catch (error) {
    console.error('DW Automation POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create automation rule', 500, error.message)
  }
}

// PUT - Update automation rule
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Rule ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_automation_rules')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Rule not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Automation PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update automation rule', 500, error.message)
  }
}

// DELETE - Delete automation rule
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Rule ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_automation_rules')
    
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Rule not found', 404)
    return successResponse({ message: 'Automation rule deleted successfully' })
  } catch (error) {
    console.error('DW Automation DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete automation rule', 500, error.message)
  }
}
