import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get dispatch workflow details
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const dispatchId = searchParams.get('dispatchId')

    if (!dispatchId) {
      return errorResponse('Dispatch ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')
    const challanCollection = db.collection('delivery_challans')
    const receiptCollection = db.collection('delivery_receipts')

    const dispatch = await dispatchCollection.findOne({ id: dispatchId, clientId: user.clientId })
    if (!dispatch) {
      return errorResponse('Dispatch not found', 404)
    }

    // Get associated challan and receipt
    const challan = await challanCollection.findOne({ dispatchId, clientId: user.clientId })
    const receipt = await receiptCollection.findOne({ dispatchId, clientId: user.clientId })

    return successResponse({
      dispatch: sanitizeDocument(dispatch),
      challan: challan ? sanitizeDocument(challan) : null,
      receipt: receipt ? sanitizeDocument(receipt) : null,
      workflow: {
        canStartDispatch: dispatch.status === 'pending' && !dispatch.dispatchStartedAt,
        canLoadGoods: dispatch.status === 'pending' && dispatch.dispatchStartedAt && !dispatch.goodsLoadedAt,
        canMarkInTransit: dispatch.status === 'loaded' && dispatch.loadingImage,
        canMarkDelivered: dispatch.status === 'in_transit',
        requiresLoadingImage: dispatch.status === 'loaded' && !dispatch.loadingImage,
        requiresDeliveryReceipt: dispatch.status === 'in_transit' && !receipt?.signedReceiptImage
      }
    })
  } catch (error) {
    console.error('Dispatch Workflow GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch dispatch workflow', 500, error.message)
  }
}

// POST - Execute workflow action
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { dispatchId, action, data } = body

    if (!dispatchId || !action) {
      return errorResponse('Dispatch ID and action are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const dispatchCollection = db.collection('inventory_dispatches')
    const challanCollection = db.collection('delivery_challans')
    const receiptCollection = db.collection('delivery_receipts')

    const dispatch = await dispatchCollection.findOne({ id: dispatchId, clientId: user.clientId })
    if (!dispatch) {
      return errorResponse('Dispatch not found', 404)
    }

    const now = new Date()
    let result = {}

    switch (action) {
      case 'start_dispatch':
        // Start dispatch - enter transporter details
        if (dispatch.status !== 'pending') {
          return errorResponse('Dispatch must be in pending status to start', 400)
        }

        const {
          transporterName,
          transporterCompany,
          vehicleNumber,
          driverName,
          driverPhone,
          estimatedDeliveryDate,
          estimatedDeliveryTime,
          specialInstructions
        } = data || {}

        await dispatchCollection.updateOne(
          { id: dispatchId },
          {
            $set: {
              transporter: {
                name: transporterName || null,
                company: transporterCompany || null,
                vehicleNumber: vehicleNumber || null,
                driverName: driverName || null,
                driverPhone: driverPhone || null
              },
              estimatedDelivery: {
                date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
                time: estimatedDeliveryTime || null
              },
              specialInstructions: specialInstructions || dispatch.specialInstructions,
              dispatchStartedAt: now,
              dispatchStartedBy: user.id,
              dispatchStartedByName: user.name || user.email,
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: 'dispatch_started',
                timestamp: now,
                updatedBy: user.id,
                updatedByName: user.name || user.email,
                notes: 'Dispatch started - transporter details entered'
              }
            }
          }
        )

        result = { message: 'Dispatch started successfully', dispatchStartedAt: now }
        break

      case 'load_goods':
        // Load goods - upload loading image
        if (!dispatch.dispatchStartedAt) {
          return errorResponse('Dispatch must be started first', 400)
        }

        const { loadingImage, loadingNotes, packageCount, totalWeight } = data || {}

        if (!loadingImage) {
          return errorResponse('Loading image is required', 400)
        }

        await dispatchCollection.updateOne(
          { id: dispatchId },
          {
            $set: {
              status: 'loaded',
              loadingImage,
              loadingNotes: loadingNotes || null,
              packageCount: packageCount || dispatch.packageCount,
              totalWeight: totalWeight || dispatch.totalWeight,
              goodsLoadedAt: now,
              goodsLoadedBy: user.id,
              goodsLoadedByName: user.name || user.email,
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: 'loaded',
                timestamp: now,
                updatedBy: user.id,
                updatedByName: user.name || user.email,
                notes: loadingNotes || 'Goods loaded onto vehicle'
              }
            }
          }
        )

        // Auto-generate Delivery Challan
        const challanNumber = `DC-${String(await challanCollection.countDocuments({ clientId: user.clientId }) + 1).padStart(6, '0')}`
        const challan = {
          id: uuidv4(),
          clientId: user.clientId,
          challanNumber,
          dispatchId,
          dispatchNumber: dispatch.dispatchNumber,
          invoiceId: dispatch.invoiceId,
          invoiceNumber: dispatch.invoiceNumber,
          // Customer
          customerName: dispatch.customerName,
          customerPhone: dispatch.customerPhone,
          customerEmail: dispatch.customerEmail,
          deliveryAddress: dispatch.deliveryAddress,
          // Items
          items: dispatch.items,
          totalValue: dispatch.totalValue,
          // Transporter
          transporter: dispatch.transporter,
          vehicleNumber: dispatch.transporter?.vehicleNumber,
          driverName: dispatch.transporter?.driverName,
          driverPhone: dispatch.transporter?.driverPhone,
          // Package Info
          packageCount: packageCount || dispatch.packageCount || 1,
          totalWeight: totalWeight || dispatch.totalWeight,
          // Timestamps
          loadedAt: now,
          dispatchedAt: null,
          deliveredAt: null,
          // Status
          status: 'generated',
          // Metadata
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now,
          updatedAt: now
        }

        await challanCollection.insertOne(challan)

        result = { 
          message: 'Goods loaded and Delivery Challan generated', 
          goodsLoadedAt: now,
          challan: sanitizeDocument(challan)
        }
        break

      case 'start_transit':
        // Mark as in transit - requires loading image
        if (dispatch.status !== 'loaded') {
          return errorResponse('Goods must be loaded first', 400)
        }

        if (!dispatch.loadingImage) {
          return errorResponse('Loading image is required before starting transit', 400)
        }

        await dispatchCollection.updateOne(
          { id: dispatchId },
          {
            $set: {
              status: 'in_transit',
              transitStartedAt: now,
              transitStartedBy: user.id,
              transitStartedByName: user.name || user.email,
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: 'in_transit',
                timestamp: now,
                updatedBy: user.id,
                updatedByName: user.name || user.email,
                notes: 'Vehicle departed - goods in transit'
              }
            }
          }
        )

        // Update challan
        await challanCollection.updateOne(
          { dispatchId, clientId: user.clientId },
          {
            $set: {
              dispatchedAt: now,
              status: 'dispatched',
              updatedAt: now
            }
          }
        )

        // Send WhatsApp notification (mocked)
        await dispatchCollection.updateOne(
          { id: dispatchId },
          {
            $set: {
              'whatsappNotification.sent': true,
              'whatsappNotification.sentAt': now,
              'whatsappNotification.messageId': `WA-${uuidv4().slice(0, 8)}`
            }
          }
        )

        result = { message: 'Dispatch is now in transit', transitStartedAt: now, whatsappSent: true }
        break

      case 'mark_delivered':
        // Mark as delivered - requires signed delivery receipt upload
        if (dispatch.status !== 'in_transit') {
          return errorResponse('Dispatch must be in transit first', 400)
        }

        const {
          receiverName,
          receiverPhone,
          receiverDesignation,
          signedReceiptImage,
          deliveryNotes,
          deliveryCondition, // 'good', 'damaged', 'partial'
          damageNotes
        } = data || {}

        if (!signedReceiptImage) {
          return errorResponse('Signed delivery receipt is required', 400)
        }

        if (!receiverName) {
          return errorResponse('Receiver name is required', 400)
        }

        // Create Delivery Receipt
        const receiptNumber = `DR-${String(await receiptCollection.countDocuments({ clientId: user.clientId }) + 1).padStart(6, '0')}`
        const receipt = {
          id: uuidv4(),
          clientId: user.clientId,
          receiptNumber,
          dispatchId,
          dispatchNumber: dispatch.dispatchNumber,
          challanNumber: (await challanCollection.findOne({ dispatchId }))?.challanNumber,
          invoiceId: dispatch.invoiceId,
          invoiceNumber: dispatch.invoiceNumber,
          // Customer
          customerName: dispatch.customerName,
          customerPhone: dispatch.customerPhone,
          deliveryAddress: dispatch.deliveryAddress,
          // Receiver
          receiverName,
          receiverPhone: receiverPhone || null,
          receiverDesignation: receiverDesignation || null,
          signedReceiptImage,
          // Items
          items: dispatch.items,
          totalValue: dispatch.totalValue,
          // Delivery Details
          deliveryCondition: deliveryCondition || 'good',
          damageNotes: damageNotes || null,
          deliveryNotes: deliveryNotes || null,
          // Timestamps
          deliveredAt: now,
          // Metadata
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now
        }

        await receiptCollection.insertOne(receipt)

        // Update dispatch
        await dispatchCollection.updateOne(
          { id: dispatchId },
          {
            $set: {
              status: 'delivered',
              deliveredAt: now,
              deliveredBy: user.id,
              deliveredByName: user.name || user.email,
              deliveryReceiptId: receipt.id,
              deliveryReceiptNumber: receiptNumber,
              delivery: {
                receiverName,
                receiverPhone: receiverPhone || null,
                receiverDesignation: receiverDesignation || null,
                condition: deliveryCondition || 'good',
                damageNotes: damageNotes || null,
                notes: deliveryNotes || null,
                signedReceiptImage,
                actualDate: now
              },
              podImage: signedReceiptImage, // Proof of Delivery
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: 'delivered',
                timestamp: now,
                updatedBy: user.id,
                updatedByName: user.name || user.email,
                notes: `Delivered to ${receiverName}${receiverDesignation ? ` (${receiverDesignation})` : ''}`,
                receiverName,
                deliveryCondition: deliveryCondition || 'good'
              }
            }
          }
        )

        // Update challan
        await challanCollection.updateOne(
          { dispatchId, clientId: user.clientId },
          {
            $set: {
              deliveredAt: now,
              status: 'delivered',
              receiptId: receipt.id,
              receiptNumber,
              updatedAt: now
            }
          }
        )

        result = { 
          message: 'Delivery confirmed and receipt recorded', 
          deliveredAt: now,
          receipt: sanitizeDocument(receipt)
        }
        break

      default:
        return errorResponse('Invalid workflow action', 400)
    }

    // Fetch updated dispatch
    const updatedDispatch = await dispatchCollection.findOne({ id: dispatchId })

    return successResponse({
      ...result,
      dispatch: sanitizeDocument(updatedDispatch)
    })
  } catch (error) {
    console.error('Dispatch Workflow POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to execute workflow action', 500, error.message)
  }
}
