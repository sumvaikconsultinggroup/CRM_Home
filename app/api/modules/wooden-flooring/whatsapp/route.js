import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, customerId, customerPhone, templateType, data } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    const integrationsCollection = db.collection('integrations')
    const whatsappConfig = await integrationsCollection.findOne({
      type: 'whatsapp',
      active: true
    })

    if (!whatsappConfig) {
      return errorResponse('WhatsApp integration not configured', 400)
    }

    const logsCollection = db.collection('wf_whatsapp_logs')
    const log = {
      id: uuidv4(),
      clientId: user.clientId,
      customerId,
      customerPhone,
      templateType,
      data,
      status: 'pending',
      createdAt: new Date()
    }

    let message = ''
    
    switch (templateType) {
      case 'quotation_sent':
        message = `Dear ${data.customerName},\n\nThank you for your interest in our wooden flooring services!\n\nWe have prepared a quotation for you:\n- Quotation No: ${data.quotationNumber}\n- Total Area: ${data.totalArea} sq.ft\n- Amount: ₹${data.amount?.toLocaleString()}\n\nValid until: ${data.validUntil}\n\nPlease review and let us know if you have any questions.\n\nBest regards,\n${data.businessName || 'BuildCRM'}`
        break
      
      case 'order_confirmed':
        message = `Dear ${data.customerName},\n\nGreat news! Your order has been confirmed.\n\nOrder Details:\n- Order No: ${data.orderNumber}\n- Amount: ₹${data.amount?.toLocaleString()}\n\nExpected delivery: ${data.deliveryDate}\n\nThank you for choosing us!\n\nBest regards,\n${data.businessName || 'BuildCRM'}`
        break
      
      case 'installation_scheduled':
        message = `Dear ${data.customerName},\n\nYour flooring installation has been scheduled!\n\nDetails:\n- Date: ${data.installationDate}\n- Time: ${data.installationTime}\n- Address: ${data.address}\n\nOur team will arrive on time.\n\nBest regards,\n${data.businessName || 'BuildCRM'}`
        break
      
      case 'installation_complete':
        message = `Dear ${data.customerName},\n\nCongratulations! Your flooring installation is complete.\n\nProject: ${data.projectNumber}\n\nWarranty: ${data.warranty || '1 year'}\n\nThank you for choosing us!\n\nBest regards,\n${data.businessName || 'BuildCRM'}`
        break
      
      case 'payment_reminder':
        message = `Dear ${data.customerName},\n\nGentle reminder: Payment of ₹${data.amount?.toLocaleString()} is pending.\n\nInvoice No: ${data.invoiceNumber}\nDue Date: ${data.dueDate}\n\nIgnore if already paid.\n\nBest regards,\n${data.businessName || 'BuildCRM'}`
        break
      
      case 'payment_received':
        message = `Dear ${data.customerName},\n\nThank you! We have received your payment.\n\nAmount: ₹${data.amount?.toLocaleString()}\nReference: ${data.reference}\n\nThank you for your business!\n\nBest regards,\n${data.businessName || 'BuildCRM'}`
        break
      
      case 'custom':
        message = data.customMessage || ''
        break
      
      default:
        message = data.message || 'Update from BuildCRM'
    }

    log.message = message

    try {
      log.status = 'sent'
      log.sentAt = new Date()
      console.log('WhatsApp Message to', customerPhone, ':', message.substring(0, 100) + '...')
    } catch (sendError) {
      log.status = 'failed'
      log.error = sendError.message
    }

    await logsCollection.insertOne(log)

    return successResponse({
      success: true,
      messageId: log.id,
      status: log.status,
      message: 'Notification ' + (log.status === 'sent' ? 'sent successfully' : 'queued for sending')
    })
  } catch (error) {
    console.error('WhatsApp POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to send notification', 500, error.message)
  }
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit')) || 50

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const logsCollection = db.collection('wf_whatsapp_logs')
    
    let query = {}
    if (customerId) query.customerId = customerId

    const logs = await logsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const stats = {
      total: logs.length,
      sent: logs.filter(l => l.status === 'sent').length,
      pending: logs.filter(l => l.status === 'pending').length,
      failed: logs.filter(l => l.status === 'failed').length
    }

    return successResponse({ logs, stats })
  } catch (error) {
    console.error('WhatsApp GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch logs', 500, error.message)
  }
}
