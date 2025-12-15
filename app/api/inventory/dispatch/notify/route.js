import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Send WhatsApp notification for dispatch (MOCKED)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { dispatchId, customMessage } = body

    if (!dispatchId) {
      return errorResponse('Dispatch ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')
    const notificationLogCollection = db.collection('whatsapp_notification_logs')

    const dispatch = await dispatchCollection.findOne({ id: dispatchId })
    if (!dispatch) {
      return errorResponse('Dispatch not found', 404)
    }

    if (!dispatch.customerPhone) {
      return errorResponse('Customer phone number not available', 400)
    }

    // Generate WhatsApp message
    const message = customMessage || generateDispatchMessage(dispatch)

    // MOCK: Simulate WhatsApp API call
    const mockWhatsAppResponse = {
      success: true,
      messageId: `WA-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'sent',
      timestamp: new Date().toISOString()
    }

    // Log the notification
    const notificationLog = {
      id: uuidv4(),
      clientId: user.clientId,
      type: 'dispatch_notification',
      dispatchId: dispatch.id,
      dispatchNumber: dispatch.dispatchNumber,
      recipientPhone: dispatch.customerPhone,
      recipientName: dispatch.customerName,
      message,
      // Mock response
      whatsappMessageId: mockWhatsAppResponse.messageId,
      status: mockWhatsAppResponse.status,
      sentAt: new Date(),
      sentBy: user.id,
      sentByName: user.name || user.email,
      // Metadata
      isMocked: true,
      createdAt: new Date()
    }

    await notificationLogCollection.insertOne(notificationLog)

    // Update dispatch with notification info
    await dispatchCollection.updateOne(
      { id: dispatchId },
      {
        $set: {
          whatsappNotification: {
            sent: true,
            sentAt: new Date(),
            messageId: mockWhatsAppResponse.messageId,
            status: 'sent'
          },
          updatedAt: new Date()
        }
      }
    )

    return successResponse({
      message: 'WhatsApp notification sent (MOCKED)',
      notification: {
        messageId: mockWhatsAppResponse.messageId,
        status: 'sent',
        sentTo: dispatch.customerPhone,
        messagePreview: message.substring(0, 200) + '...',
        isMocked: true
      }
    })
  } catch (error) {
    console.error('WhatsApp Notification Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to send notification', 500, error.message)
  }
}

// GET - Get notification logs
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const dispatchId = searchParams.get('dispatchId')
    const limit = parseInt(searchParams.get('limit')) || 50

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const notificationLogCollection = db.collection('whatsapp_notification_logs')

    let query = { clientId: user.clientId }
    if (dispatchId) query.dispatchId = dispatchId

    const logs = await notificationLogCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return successResponse({ logs })
  } catch (error) {
    console.error('Notification Logs Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch notification logs', 500, error.message)
  }
}

// Helper function to generate dispatch message
function generateDispatchMessage(dispatch) {
  const items = dispatch.items.map(i => `• ${i.productName} x ${i.quantity} ${i.unit}`).join('\n')
  
  let message = `🚚 *Your Order Has Been Dispatched!*\n\n`
  message += `Hello ${dispatch.customerName},\n\n`
  message += `Your order from *${dispatch.dispatchNumber}* has been dispatched.\n\n`
  
  message += `📦 *Items:*\n${items}\n\n`
  
  if (dispatch.transporter?.vehicleNumber) {
    message += `🚛 *Vehicle:* ${dispatch.transporter.vehicleNumber}\n`
  }
  if (dispatch.transporter?.driverName) {
    message += `👤 *Driver:* ${dispatch.transporter.driverName}\n`
  }
  if (dispatch.transporter?.driverPhone) {
    message += `📞 *Driver Contact:* ${dispatch.transporter.driverPhone}\n`
  }
  
  if (dispatch.estimatedDelivery?.date) {
    const estDate = new Date(dispatch.estimatedDelivery.date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    message += `\n⏰ *Estimated Delivery:* ${estDate}`
    if (dispatch.estimatedDelivery.time) {
      message += ` at ${dispatch.estimatedDelivery.time}`
    }
    message += `\n`
  }
  
  if (dispatch.payment?.mode === 'cod' && dispatch.payment?.amountToCollect > 0) {
    message += `\n💵 *Amount to Pay:* ₹${dispatch.payment.amountToCollect.toLocaleString('en-IN')} (Cash on Delivery)\n`
  }
  
  if (dispatch.deliveryAddress) {
    message += `\n📍 *Delivery Address:*\n${dispatch.deliveryAddress}\n`
  }
  
  if (dispatch.specialInstructions) {
    message += `\n📝 *Note:* ${dispatch.specialInstructions}\n`
  }
  
  message += `\nThank you for your order! 🙏`
  
  return message
}
