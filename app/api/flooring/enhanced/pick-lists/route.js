import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate pick list number
const generatePickListNumber = async (db) => {
  const pickLists = db.collection('flooring_pick_lists')
  const count = await pickLists.countDocuments()
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `PL-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// GET - Fetch pick lists
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const quoteId = searchParams.get('quoteId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pickLists = db.collection('flooring_pick_lists')

    // Get single pick list by ID
    if (id) {
      const pickList = await pickLists.findOne({ id })
      if (!pickList) return errorResponse('Pick list not found', 404)
      
      // Get items
      const pickListItems = db.collection('flooring_pick_list_items')
      const items = await pickListItems.find({ pickListId: id }).toArray()
      
      return successResponse(sanitizeDocument({ ...pickList, items: sanitizeDocuments(items) }))
    }

    // Get pick list by quote (check for existing)
    if (quoteId) {
      // Find active pick list for this quote (not CLOSED)
      const pickList = await pickLists.findOne({ 
        quoteId, 
        status: { $ne: 'CLOSED' } 
      })
      
      if (pickList) {
        const pickListItems = db.collection('flooring_pick_list_items')
        const items = await pickListItems.find({ pickListId: pickList.id }).toArray()
        return successResponse(sanitizeDocument({ ...pickList, items: sanitizeDocuments(items) }))
      }
      
      return successResponse({ pickList: null })
    }

    // Build query
    const query = {}
    if (projectId) query.projectId = projectId
    if (status && status !== 'all') query.status = status

    const allPickLists = await pickLists.find(query).sort({ createdAt: -1 }).toArray()

    // Calculate stats
    const stats = {
      total: allPickLists.length,
      created: allPickLists.filter(p => p.status === 'CREATED').length,
      assigned: allPickLists.filter(p => p.status === 'ASSIGNED').length,
      picking: allPickLists.filter(p => p.status === 'PICKING').length,
      materialReady: allPickLists.filter(p => p.status === 'MATERIAL_READY').length,
      closed: allPickLists.filter(p => p.status === 'CLOSED').length
    }

    return successResponse({
      pickLists: sanitizeDocuments(allPickLists),
      stats
    })
  } catch (error) {
    console.error('Pick Lists GET Error:', error)
    return errorResponse('Failed to fetch pick lists', 500, error.message)
  }
}

// POST - Create pick list from quote
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { quoteId, assignedToUserId, notes } = body

    if (!quoteId) {
      return errorResponse('Quote ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pickLists = db.collection('flooring_pick_lists')
    const pickListItems = db.collection('flooring_pick_list_items')
    const quotes = db.collection('flooring_quotes_v2')  // Use v2 collection for enhanced quotes
    const products = db.collection('flooring_products')

    // Check for existing active pick list for this quote
    const existingPickList = await pickLists.findOne({ 
      quoteId, 
      status: { $ne: 'CLOSED' } 
    })
    
    if (existingPickList) {
      return errorResponse('An active pick list already exists for this quote', 400, {
        existingPickListId: existingPickList.id,
        existingPickListNumber: existingPickList.pickListNumber
      })
    }

    // Get quote
    const quote = await quotes.findOne({ id: quoteId })
    if (!quote) return errorResponse('Quote not found', 404)

    // Verify quote is approved
    if (quote.status !== 'approved') {
      return errorResponse('Pick list can only be created for approved quotes', 400)
    }

    const now = new Date().toISOString()
    const pickListId = uuidv4()
    const pickListNumber = await generatePickListNumber(db)

    // Create pick list
    const pickList = {
      id: pickListId,
      pickListNumber,
      quoteId,
      quoteNumber: quote.quoteNumber,
      projectId: quote.projectId,
      projectNumber: quote.projectNumber,
      customer: quote.customer,
      status: assignedToUserId ? 'ASSIGNED' : 'CREATED',
      assignedToUserId: assignedToUserId || null,
      assignedAt: assignedToUserId ? now : null,
      notes: notes || '',
      totalItems: 0,
      totalArea: 0,
      totalBoxes: 0,
      confirmedAt: null,
      confirmedBy: null,
      statusHistory: [{
        status: assignedToUserId ? 'ASSIGNED' : 'CREATED',
        timestamp: now,
        by: user.id,
        userName: user.name || user.email,
        notes: assignedToUserId ? `Assigned to warehouse user` : 'Pick list created from quote'
      }],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    // Create pick list items from quote items (materials only)
    const materialItems = (quote.items || []).filter(item => 
      item.itemType === 'material' || !item.itemType
    )

    const items = []
    let totalArea = 0
    let totalBoxes = 0

    for (const quoteItem of materialItems) {
      // Get product details for coverage_per_box
      const product = await products.findOne({ id: quoteItem.productId || quoteItem.id })
      const coveragePerBox = product?.coveragePerBox || quoteItem.coveragePerBox || 25 // default 25 sqft
      const wastagePercent = quoteItem.wastagePercent || product?.wastagePercent || 10

      // Calculate boxes from area
      const area = quoteItem.area || quoteItem.quantity || 0
      const areaWithWastage = area * (1 + wastagePercent / 100)
      const boxes = Math.ceil(areaWithWastage / coveragePerBox)
      const billableArea = boxes * coveragePerBox

      const pickListItem = {
        id: uuidv4(),
        pickListId,
        productId: quoteItem.productId || quoteItem.id,
        productName: quoteItem.productName || quoteItem.name,
        sku: quoteItem.sku || product?.sku,
        // Quote quantities
        quoteQtyArea: area,
        quoteQtyBoxes: boxes,
        // Confirmed quantities (to be filled during confirmation)
        confirmedQtyArea: null,
        confirmedQtyBoxes: null,
        // Snapshot values
        coveragePerBoxSnapshot: coveragePerBox,
        wastagePercentSnapshot: wastagePercent,
        unitPriceSnapshot: quoteItem.rate || quoteItem.unitPrice,
        // Optional fields
        lotNo: null,
        varianceReason: null,
        notes: '',
        createdAt: now,
        updatedAt: now
      }

      items.push(pickListItem)
      totalArea += area
      totalBoxes += boxes
    }

    // Update pick list totals
    pickList.totalItems = items.length
    pickList.totalArea = totalArea
    pickList.totalBoxes = totalBoxes

    // Insert pick list and items
    await pickLists.insertOne(pickList)
    if (items.length > 0) {
      await pickListItems.insertMany(items)
    }

    // Update quote with pick list reference
    await quotes.updateOne(
      { id: quoteId },
      { 
        $set: { 
          pickListId,
          pickListNumber,
          pickListStatus: pickList.status,
          updatedAt: now 
        } 
      }
    )

    return successResponse({
      pickList: sanitizeDocument({ ...pickList, items: sanitizeDocuments(items) }),
      message: 'Pick list created successfully'
    }, 201)
  } catch (error) {
    console.error('Pick Lists POST Error:', error)
    return errorResponse('Failed to create pick list', 500, error.message)
  }
}

// PUT - Update pick list (assign, start picking, confirm items, material ready)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, data } = body

    if (!id) {
      return errorResponse('Pick list ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pickLists = db.collection('flooring_pick_lists')
    const pickListItems = db.collection('flooring_pick_list_items')
    const quotes = db.collection('flooring_quotes_v2')  // Use v2 collection

    const pickList = await pickLists.findOne({ id })
    if (!pickList) return errorResponse('Pick list not found', 404)

    const now = new Date().toISOString()
    let updateData = { updatedAt: now }
    let statusHistoryEntry = null

    switch (action) {
      case 'assign':
        if (!data?.assignedToUserId) {
          return errorResponse('Assigned user ID is required', 400)
        }
        updateData.assignedToUserId = data.assignedToUserId
        updateData.assignedToUserName = data.assignedToUserName || 'Warehouse User'
        updateData.assignedAt = now
        updateData.status = 'ASSIGNED'
        statusHistoryEntry = {
          status: 'ASSIGNED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: `Assigned to ${data.assignedToUserName || 'warehouse user'}`
        }
        break

      case 'start_picking':
        if (!['CREATED', 'ASSIGNED'].includes(pickList.status)) {
          return errorResponse('Can only start picking from CREATED or ASSIGNED status', 400)
        }
        updateData.status = 'PICKING'
        updateData.pickingStartedAt = now
        updateData.pickingStartedBy = user.id
        statusHistoryEntry = {
          status: 'PICKING',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: 'Started material picking'
        }
        break

      case 'confirm_items':
        // Update individual item confirmations
        if (!data?.items || !Array.isArray(data.items)) {
          return errorResponse('Items array is required for confirmation', 400)
        }

        for (const itemUpdate of data.items) {
          if (!itemUpdate.id) continue
          
          const itemUpdateData = {
            updatedAt: now
          }
          
          if (itemUpdate.confirmedQtyArea !== undefined) {
            itemUpdateData.confirmedQtyArea = itemUpdate.confirmedQtyArea
          }
          if (itemUpdate.confirmedQtyBoxes !== undefined) {
            itemUpdateData.confirmedQtyBoxes = itemUpdate.confirmedQtyBoxes
          }
          if (itemUpdate.lotNo !== undefined) {
            itemUpdateData.lotNo = itemUpdate.lotNo
          }
          if (itemUpdate.varianceReason !== undefined) {
            itemUpdateData.varianceReason = itemUpdate.varianceReason
          }
          if (itemUpdate.notes !== undefined) {
            itemUpdateData.notes = itemUpdate.notes
          }

          await pickListItems.updateOne(
            { id: itemUpdate.id },
            { $set: itemUpdateData }
          )
        }

        // Recalculate totals
        const updatedItems = await pickListItems.find({ pickListId: id }).toArray()
        const confirmedArea = updatedItems.reduce((sum, i) => sum + (i.confirmedQtyArea || 0), 0)
        const confirmedBoxes = updatedItems.reduce((sum, i) => sum + (i.confirmedQtyBoxes || 0), 0)
        
        updateData.confirmedTotalArea = confirmedArea
        updateData.confirmedTotalBoxes = confirmedBoxes
        
        statusHistoryEntry = {
          status: pickList.status,
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: `Confirmed ${data.items.length} item(s). Total: ${confirmedBoxes} boxes / ${confirmedArea} sqft`
        }
        break

      case 'material_ready':
        if (!['PICKING', 'ASSIGNED', 'CREATED'].includes(pickList.status)) {
          return errorResponse('Invalid status transition to MATERIAL_READY', 400)
        }

        // Verify all items have been confirmed
        const allItems = await pickListItems.find({ pickListId: id }).toArray()
        const unconfirmedItems = allItems.filter(i => 
          i.confirmedQtyBoxes === null || i.confirmedQtyBoxes === undefined
        )

        if (unconfirmedItems.length > 0 && !data?.forceReady) {
          return errorResponse(
            `${unconfirmedItems.length} item(s) not confirmed. Use forceReady to override.`, 
            400,
            { unconfirmedCount: unconfirmedItems.length }
          )
        }

        // Auto-confirm unconfirmed items with quote quantities if forced
        if (unconfirmedItems.length > 0 && data?.forceReady) {
          for (const item of unconfirmedItems) {
            await pickListItems.updateOne(
              { id: item.id },
              { 
                $set: { 
                  confirmedQtyArea: item.quoteQtyArea,
                  confirmedQtyBoxes: item.quoteQtyBoxes,
                  varianceReason: 'AUTO_CONFIRMED',
                  updatedAt: now
                } 
              }
            )
          }
        }

        updateData.status = 'MATERIAL_READY'
        updateData.confirmedAt = now
        updateData.confirmedBy = user.id
        updateData.confirmedByName = user.name || user.email
        
        // Calculate final confirmed totals
        const finalItems = await pickListItems.find({ pickListId: id }).toArray()
        updateData.confirmedTotalArea = finalItems.reduce((sum, i) => sum + (i.confirmedQtyArea || i.quoteQtyArea || 0), 0)
        updateData.confirmedTotalBoxes = finalItems.reduce((sum, i) => sum + (i.confirmedQtyBoxes || i.quoteQtyBoxes || 0), 0)

        // Check for variances
        const hasVariance = finalItems.some(i => 
          (i.confirmedQtyBoxes !== i.quoteQtyBoxes) || 
          (i.confirmedQtyArea !== i.quoteQtyArea)
        )
        updateData.hasVariance = hasVariance

        statusHistoryEntry = {
          status: 'MATERIAL_READY',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: `Material ready. ${hasVariance ? 'Variance detected.' : 'No variance.'} ${updateData.confirmedTotalBoxes} boxes confirmed.`
        }
        break

      case 'close':
        updateData.status = 'CLOSED'
        updateData.closedAt = now
        updateData.closedBy = user.id
        updateData.closedReason = data?.reason || 'Completed'
        statusHistoryEntry = {
          status: 'CLOSED',
          timestamp: now,
          by: user.id,
          userName: user.name || user.email,
          notes: data?.reason || 'Pick list closed'
        }
        break

      case 'update_notes':
        updateData.notes = data?.notes || ''
        break

      default:
        return errorResponse('Invalid action', 400)
    }

    // Build update query
    const updateQuery = { $set: updateData }
    if (statusHistoryEntry) {
      updateQuery.$push = { statusHistory: statusHistoryEntry }
    }

    await pickLists.updateOne({ id }, updateQuery)

    // Sync status to quote
    if (updateData.status) {
      await quotes.updateOne(
        { id: pickList.quoteId },
        { 
          $set: { 
            pickListStatus: updateData.status,
            updatedAt: now
          } 
        }
      )
    }

    // Fetch updated pick list with items
    const updatedPickList = await pickLists.findOne({ id })
    const items = await pickListItems.find({ pickListId: id }).toArray()

    return successResponse({
      pickList: sanitizeDocument({ ...updatedPickList, items: sanitizeDocuments(items) }),
      message: `Pick list ${action.replace('_', ' ')} successful`
    })
  } catch (error) {
    console.error('Pick Lists PUT Error:', error)
    return errorResponse('Failed to update pick list', 500, error.message)
  }
}

// DELETE - Cancel/delete pick list
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Pick list ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const pickLists = db.collection('flooring_pick_lists')
    const pickListItems = db.collection('flooring_pick_list_items')
    const quotes = db.collection('flooring_quotes_v2')  // Use v2 collection

    const pickList = await pickLists.findOne({ id })
    if (!pickList) return errorResponse('Pick list not found', 404)

    // Only allow deletion of CREATED or ASSIGNED pick lists
    if (!['CREATED', 'ASSIGNED'].includes(pickList.status)) {
      return errorResponse('Can only delete pick lists in CREATED or ASSIGNED status', 400)
    }

    const now = new Date().toISOString()

    // Soft delete - mark as CLOSED with cancellation
    await pickLists.updateOne(
      { id },
      { 
        $set: { 
          status: 'CLOSED',
          closedAt: now,
          closedBy: user.id,
          closedReason: 'Cancelled',
          updatedAt: now
        },
        $push: {
          statusHistory: {
            status: 'CLOSED',
            timestamp: now,
            by: user.id,
            userName: user.name || user.email,
            notes: 'Pick list cancelled'
          }
        }
      }
    )

    // Clear pick list reference from quote
    await quotes.updateOne(
      { id: pickList.quoteId },
      { 
        $unset: { 
          pickListId: '',
          pickListNumber: '',
          pickListStatus: ''
        },
        $set: { updatedAt: now }
      }
    )

    return successResponse({
      message: 'Pick list cancelled successfully'
    })
  } catch (error) {
    console.error('Pick Lists DELETE Error:', error)
    return errorResponse('Failed to delete pick list', 500, error.message)
  }
}
