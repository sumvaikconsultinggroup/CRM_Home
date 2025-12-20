import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get fulfillment settings and status for a quote/invoice
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quoteId')
    const invoiceId = searchParams.get('invoiceId')
    const getSettings = searchParams.get('settings')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Return fulfillment settings
    if (getSettings === 'true') {
      const settingsCollection = db.collection('flooring_settings')
      let settings = await settingsCollection.findOne({ type: 'fulfillment' })
      
      if (!settings) {
        // Create default settings
        settings = {
          id: uuidv4(),
          type: 'fulfillment',
          // Pick List Rules
          requirePickListForDC: true,
          requirePickListForInvoice: true,
          autoCreatePickListOnApproval: false,
          // DC Rules
          allowPartialDispatch: true,
          requireDCForInvoiceDispatch: true,
          // Third Party / Sender Rules
          hideSenderDefault: false,
          thirdPartyDeliveryDefault: false,
          // Bypass flags (for admin override)
          allowBypassPickListForDC: false,
          allowBypassPickListForInvoice: false,
          // Audit
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await settingsCollection.insertOne(settings)
      }
      
      return successResponse({ settings: sanitizeDocument(settings) })
    }

    // Get fulfillment status for a quote
    if (quoteId) {
      const quotes = db.collection('flooring_quotes')
      const pickLists = db.collection('flooring_pick_lists')
      const challans = db.collection('flooring_challans')
      const invoices = db.collection('flooring_invoices')

      const quote = await quotes.findOne({ id: quoteId })
      if (!quote) return errorResponse('Quote not found', 404)

      // Get pick list status
      const pickList = await pickLists.findOne({ 
        quoteId, 
        status: { $ne: 'CLOSED' } 
      })

      // Get challans
      const dcList = await challans.find({ quoteId }).toArray()
      const issuedDCs = dcList.filter(dc => dc.status === 'ISSUED')
      const deliveredDCs = dcList.filter(dc => dc.status === 'DELIVERED')

      // Get invoice
      const invoice = await invoices.findOne({ quoteId })

      // Calculate dispatch status
      let dispatchStatus = 'NOT_DISPATCHED'
      if (deliveredDCs.length > 0) {
        dispatchStatus = 'DELIVERED'
      } else if (issuedDCs.length > 0) {
        dispatchStatus = 'DISPATCHED'
      } else if (dcList.some(dc => dc.status === 'DRAFT')) {
        dispatchStatus = 'DC_PENDING'
      }

      // Calculate what actions are available
      const settingsCollection = db.collection('flooring_settings')
      const settings = await settingsCollection.findOne({ type: 'fulfillment' }) || {}
      
      const isMaterialReady = pickList?.status === 'MATERIAL_READY'
      const canBypassPickList = settings.allowBypassPickListForDC || settings.allowBypassPickListForInvoice

      const fulfillmentStatus = {
        quoteId,
        quoteStatus: quote.status,
        // Pick List
        hasPickList: !!pickList,
        pickListId: pickList?.id,
        pickListNumber: pickList?.pickListNumber,
        pickListStatus: pickList?.status || 'NONE',
        isMaterialReady,
        // Challans/Dispatch
        challanCount: dcList.length,
        issuedChallanCount: issuedDCs.length,
        deliveredChallanCount: deliveredDCs.length,
        challans: dcList.map(dc => ({
          id: dc.id,
          dcNo: dc.dcNo,
          status: dc.status,
          totalBoxes: dc.totalBoxes,
          issuedAt: dc.issuedAt,
          deliveredAt: dc.deliveredAt
        })),
        dispatchStatus,
        // Invoice
        hasInvoice: !!invoice,
        invoiceId: invoice?.id,
        invoiceNumber: invoice?.invoiceNumber,
        invoiceStatus: invoice?.status || 'NONE',
        // Available Actions
        actions: {
          canCreatePickList: quote.status === 'approved' && !pickList,
          canAssignPickList: pickList && pickList.status === 'CREATED',
          canConfirmPickList: pickList && ['CREATED', 'ASSIGNED', 'PICKING'].includes(pickList.status),
          canMarkMaterialReady: pickList && ['PICKING', 'ASSIGNED', 'CREATED'].includes(pickList.status),
          canCreateDC: isMaterialReady || (!settings.requirePickListForDC && quote.status === 'approved'),
          canCreateInvoice: isMaterialReady || (!settings.requirePickListForInvoice && quote.status === 'approved'),
          canIssueDC: dcList.some(dc => dc.status === 'DRAFT'),
          canMarkDelivered: issuedDCs.length > 0,
          requiresPickListBypass: !isMaterialReady && (settings.requirePickListForDC || settings.requirePickListForInvoice),
          bypassAvailable: canBypassPickList
        },
        // Settings context
        settings: {
          requirePickListForDC: settings.requirePickListForDC !== false,
          requirePickListForInvoice: settings.requirePickListForInvoice !== false,
          allowPartialDispatch: settings.allowPartialDispatch !== false
        }
      }

      return successResponse({ fulfillmentStatus })
    }

    // Get fulfillment status for an invoice
    if (invoiceId) {
      const invoices = db.collection('flooring_invoices')
      const challans = db.collection('flooring_challans')
      const pickLists = db.collection('flooring_pick_lists')

      const invoice = await invoices.findOne({ id: invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)

      // Get related quote's pick list if exists
      let pickList = null
      if (invoice.quoteId) {
        pickList = await pickLists.findOne({ 
          quoteId: invoice.quoteId, 
          status: { $ne: 'CLOSED' } 
        })
      }

      // Get challans for this invoice
      const dcList = await challans.find({ invoiceId }).toArray()
      const issuedDCs = dcList.filter(dc => dc.status === 'ISSUED')
      const deliveredDCs = dcList.filter(dc => dc.status === 'DELIVERED')

      let dispatchStatus = 'NOT_DISPATCHED'
      if (deliveredDCs.length > 0) {
        dispatchStatus = 'DELIVERED'
      } else if (issuedDCs.length > 0) {
        dispatchStatus = 'DISPATCHED'
      } else if (dcList.some(dc => dc.status === 'DRAFT')) {
        dispatchStatus = 'DC_PENDING'
      }

      const fulfillmentStatus = {
        invoiceId,
        invoiceStatus: invoice.status,
        // Pick List (from quote)
        hasPickList: !!pickList,
        pickListId: pickList?.id,
        pickListNumber: pickList?.pickListNumber,
        pickListStatus: pickList?.status || 'NONE',
        isMaterialReady: pickList?.status === 'MATERIAL_READY',
        // Challans/Dispatch
        challanCount: dcList.length,
        issuedChallanCount: issuedDCs.length,
        deliveredChallanCount: deliveredDCs.length,
        challans: dcList.map(dc => ({
          id: dc.id,
          dcNo: dc.dcNo,
          status: dc.status,
          totalBoxes: dc.totalBoxes,
          issuedAt: dc.issuedAt,
          deliveredAt: dc.deliveredAt
        })),
        dispatchStatus,
        // Actions
        actions: {
          canCreateDC: dcList.length === 0 || dcList.every(dc => dc.status === 'CANCELLED'),
          canIssueDC: dcList.some(dc => dc.status === 'DRAFT'),
          canMarkDelivered: issuedDCs.length > 0
        }
      }

      return successResponse({ fulfillmentStatus })
    }

    return errorResponse('quoteId, invoiceId, or settings=true is required', 400)
  } catch (error) {
    console.error('Fulfillment GET Error:', error)
    return errorResponse('Failed to get fulfillment status', 500, error.message)
  }
}

// PUT - Update fulfillment settings
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      requirePickListForDC,
      requirePickListForInvoice,
      autoCreatePickListOnApproval,
      allowPartialDispatch,
      requireDCForInvoiceDispatch,
      hideSenderDefault,
      thirdPartyDeliveryDefault,
      allowBypassPickListForDC,
      allowBypassPickListForInvoice
    } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settingsCollection = db.collection('flooring_settings')

    const now = new Date().toISOString()
    const updateData = { updatedAt: now }

    if (requirePickListForDC !== undefined) updateData.requirePickListForDC = requirePickListForDC
    if (requirePickListForInvoice !== undefined) updateData.requirePickListForInvoice = requirePickListForInvoice
    if (autoCreatePickListOnApproval !== undefined) updateData.autoCreatePickListOnApproval = autoCreatePickListOnApproval
    if (allowPartialDispatch !== undefined) updateData.allowPartialDispatch = allowPartialDispatch
    if (requireDCForInvoiceDispatch !== undefined) updateData.requireDCForInvoiceDispatch = requireDCForInvoiceDispatch
    if (hideSenderDefault !== undefined) updateData.hideSenderDefault = hideSenderDefault
    if (thirdPartyDeliveryDefault !== undefined) updateData.thirdPartyDeliveryDefault = thirdPartyDeliveryDefault
    if (allowBypassPickListForDC !== undefined) updateData.allowBypassPickListForDC = allowBypassPickListForDC
    if (allowBypassPickListForInvoice !== undefined) updateData.allowBypassPickListForInvoice = allowBypassPickListForInvoice

    // Upsert settings
    await settingsCollection.updateOne(
      { type: 'fulfillment' },
      { 
        $set: updateData,
        $setOnInsert: {
          id: uuidv4(),
          type: 'fulfillment',
          createdAt: now
        }
      },
      { upsert: true }
    )

    const settings = await settingsCollection.findOne({ type: 'fulfillment' })

    return successResponse({
      settings: sanitizeDocument(settings),
      message: 'Fulfillment settings updated successfully'
    })
  } catch (error) {
    console.error('Fulfillment PUT Error:', error)
    return errorResponse('Failed to update fulfillment settings', 500, error.message)
  }
}
