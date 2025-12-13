import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Tally ERP Webhook Handler
// Receives invoice/payment data from Tally and syncs with BuildCRM
export async function POST(request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')
    const secret = searchParams.get('secret')

    console.log('Tally Webhook received:', { webhookId, hasSecret: !!secret })

    if (webhookId) {
      const integrationsCollection = await getCollection('integrations')
      const webhook = await integrationsCollection.findOne({
        id: webhookId,
        type: 'tally',
        active: true
      })

      if (!webhook) {
        return errorResponse('Invalid webhook', 401)
      }

      if (secret && webhook.secret !== secret) {
        return errorResponse('Invalid webhook secret', 401)
      }

      const event = body.event || body.type || 'sync'
      const data = body.data || body.payload || body

      // Handle different Tally events
      if (event === 'invoice.created' || event === 'invoice') {
        // Create expense/income record from Tally invoice
        const expensesCollection = await getCollection(Collections.EXPENSES)
        const invoice = {
          id: uuidv4(),
          clientId: webhook.clientId,
          type: data.type === 'sales' || data.voucherType === 'Sales' ? 'income' : 'expense',
          description: data.narration || data.description || `Tally Invoice: ${data.voucherNumber || data.invoiceNumber}`,
          amount: parseFloat(data.amount || data.total || data.grossAmount) || 0,
          category: 'Tally Sync',
          vendor: data.partyName || data.ledgerName || data.customerName || 'Unknown',
          tallyVoucherNumber: data.voucherNumber || data.invoiceNumber,
          tallyVoucherType: data.voucherType || data.type,
          tallyDate: data.date || data.voucherDate,
          date: data.date ? new Date(data.date) : new Date(),
          approved: true,
          source: 'Tally ERP',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await expensesCollection.insertOne(invoice)
        console.log('Invoice synced from Tally:', invoice.id)
        return successResponse({ success: true, invoiceId: invoice.id, message: 'Invoice synced successfully' })
      }

      if (event === 'payment.received' || event === 'receipt') {
        const expensesCollection = await getCollection(Collections.EXPENSES)
        const payment = {
          id: uuidv4(),
          clientId: webhook.clientId,
          type: 'income',
          description: `Payment: ${data.narration || data.description || 'Tally Receipt'}`,
          amount: parseFloat(data.amount) || 0,
          category: 'Tally Payment',
          vendor: data.partyName || data.receivedFrom || 'Unknown',
          tallyVoucherNumber: data.voucherNumber || data.receiptNumber,
          date: data.date ? new Date(data.date) : new Date(),
          approved: true,
          source: 'Tally ERP',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await expensesCollection.insertOne(payment)
        console.log('Payment synced from Tally:', payment.id)
        return successResponse({ success: true, paymentId: payment.id, message: 'Payment synced successfully' })
      }

      if (event === 'ledger.created' || event === 'party') {
        // Create contact from Tally ledger
        const contactsCollection = await getCollection('contacts')
        const contact = {
          id: uuidv4(),
          clientId: webhook.clientId,
          name: data.name || data.ledgerName || 'Unknown',
          email: data.email || '',
          phone: data.phone || data.mobile || '',
          company: data.company || data.name || '',
          address: data.address || '',
          gstNumber: data.gstNumber || data.gstin || '',
          type: data.type || 'customer',
          source: 'Tally ERP',
          tallyLedgerId: data.ledgerId || data.guid,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await contactsCollection.insertOne(contact)
        console.log('Contact synced from Tally:', contact.id)
        return successResponse({ success: true, contactId: contact.id, message: 'Contact synced successfully' })
      }

      // Log webhook data
      const logsCollection = await getCollection('webhook_logs')
      await logsCollection.insertOne({
        id: uuidv4(),
        webhookId,
        source: 'tally',
        event,
        data: body,
        processedAt: new Date()
      })

      return successResponse({ success: true, message: 'Webhook processed' })
    }

    return errorResponse('Webhook ID is required', 400)
  } catch (error) {
    console.error('Tally Webhook Error:', error)
    return errorResponse('Failed to process webhook', 500, error.message)
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get('id')

  if (!webhookId) {
    return successResponse({ 
      status: 'active',
      integration: 'tally',
      version: '1.0',
      supportedEvents: ['invoice.created', 'invoice', 'payment.received', 'receipt', 'ledger.created', 'party']
    })
  }

  try {
    const integrationsCollection = await getCollection('integrations')
    const webhook = await integrationsCollection.findOne({
      id: webhookId,
      type: 'tally'
    })

    if (!webhook) {
      return errorResponse('Webhook not found', 404)
    }

    return successResponse({
      status: webhook.active ? 'active' : 'inactive',
      integration: 'tally',
      connectedAt: webhook.createdAt,
      config: {
        tallyHost: webhook.config?.tallyHost,
        companyName: webhook.config?.companyName
      }
    })
  } catch (error) {
    return errorResponse('Failed to verify webhook', 500)
  }
}
