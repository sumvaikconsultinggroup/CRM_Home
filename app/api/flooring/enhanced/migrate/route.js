import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * Migration & Seed Script for Enterprise Fulfillment Workflow
 * 
 * This script:
 * 1. Creates required collections with indexes
 * 2. Migrates existing dispatch data to DC format
 * 3. Seeds sample data for testing
 * 4. Initializes fulfillment settings
 */

// POST - Run migration
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    // Only admin can run migrations
    if (!['admin', 'super_admin'].includes(user.role)) {
      return errorResponse('Only admins can run migrations', 403)
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'migrate'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date().toISOString()

    const results = {
      action,
      timestamp: now,
      steps: []
    }

    // ============================================
    // STEP 1: Create Collections & Indexes
    // ============================================
    if (action === 'migrate' || action === 'setup') {
      try {
        // Pick Lists collection
        const pickLists = db.collection('flooring_pick_lists')
        await pickLists.createIndex({ quoteId: 1, status: 1 }, { unique: false })
        await pickLists.createIndex({ projectId: 1 })
        await pickLists.createIndex({ status: 1 })
        await pickLists.createIndex({ createdAt: -1 })
        results.steps.push({ step: 'Pick Lists indexes', status: 'created' })

        // Pick List Items collection
        const pickListItems = db.collection('flooring_pick_list_items')
        await pickListItems.createIndex({ pickListId: 1 })
        await pickListItems.createIndex({ productId: 1 })
        results.steps.push({ step: 'Pick List Items indexes', status: 'created' })

        // Challans collection (enhanced)
        const challans = db.collection('flooring_challans')
        await challans.createIndex({ dcNo: 1 }, { unique: true, sparse: true })
        await challans.createIndex({ quoteId: 1 })
        await challans.createIndex({ invoiceId: 1 })
        await challans.createIndex({ pickListId: 1 })
        await challans.createIndex({ projectId: 1 })
        await challans.createIndex({ status: 1 })
        await challans.createIndex({ createdAt: -1 })
        results.steps.push({ step: 'Challans indexes', status: 'created' })

        // Challan Items collection
        const challanItems = db.collection('flooring_challan_items')
        await challanItems.createIndex({ challanId: 1 })
        await challanItems.createIndex({ productId: 1 })
        results.steps.push({ step: 'Challan Items indexes', status: 'created' })

        // Inventory Movements - add DC reference indexes
        const movements = db.collection('wf_inventory_movements')
        await movements.createIndex({ referenceType: 1, referenceId: 1 })
        await movements.createIndex({ productId: 1, createdAt: -1 })
        results.steps.push({ step: 'Inventory Movements indexes', status: 'created' })

      } catch (indexError) {
        results.steps.push({ step: 'Indexes', status: 'error', error: indexError.message })
      }
    }

    // ============================================
    // STEP 2: Initialize Fulfillment Settings
    // ============================================
    if (action === 'migrate' || action === 'setup' || action === 'settings') {
      try {
        const settings = db.collection('flooring_settings')
        
        const existingSettings = await settings.findOne({ type: 'fulfillment' })
        
        if (!existingSettings) {
          await settings.insertOne({
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
            // Bypass flags
            allowBypassPickListForDC: false,
            allowBypassPickListForInvoice: false,
            // Meta
            createdAt: now,
            updatedAt: now
          })
          results.steps.push({ step: 'Fulfillment settings', status: 'created' })
        } else {
          results.steps.push({ step: 'Fulfillment settings', status: 'already exists' })
        }
      } catch (settingsError) {
        results.steps.push({ step: 'Fulfillment settings', status: 'error', error: settingsError.message })
      }
    }

    // ============================================
    // STEP 3: Migrate Existing Dispatches to DC
    // ============================================
    if (action === 'migrate') {
      try {
        const dispatches = db.collection('flooring_dispatches')
        const challans = db.collection('flooring_challans')
        const challanItems = db.collection('flooring_challan_items')
        
        const oldDispatches = await dispatches.find({}).toArray()
        let migratedCount = 0
        
        for (const dispatch of oldDispatches) {
          // Check if already migrated (has corresponding DC)
          const existingDC = await challans.findOne({ 
            $or: [
              { legacyDispatchId: dispatch.id },
              { dispatchId: dispatch.id }
            ]
          })
          
          if (existingDC) continue // Already migrated
          
          // Generate DC number
          const dcCount = await challans.countDocuments()
          const year = new Date().getFullYear()
          const month = String(new Date().getMonth() + 1).padStart(2, '0')
          const dcNo = `DC-${year}${month}-${String(dcCount + 1).padStart(4, '0')}`
          
          const challanId = uuidv4()
          
          // Map dispatch status to DC status
          const statusMap = {
            'pending': 'DRAFT',
            'loaded': 'DRAFT',
            'in_transit': 'ISSUED',
            'delivered': 'DELIVERED',
            'cancelled': 'CANCELLED'
          }
          
          const dcStatus = statusMap[dispatch.status] || 'DRAFT'
          
          // Create DC from dispatch
          const dc = {
            id: challanId,
            dcNo,
            type: 'delivery',
            legacyDispatchId: dispatch.id,
            legacyDispatchNumber: dispatch.dispatchNumber,
            quoteId: null, // Will be linked via invoice
            invoiceId: dispatch.invoiceId,
            invoiceNumber: dispatch.invoiceNumber,
            projectId: dispatch.projectId,
            // Bill To
            billToAccountId: dispatch.customer?.id,
            billToName: dispatch.customer?.name,
            billToNameSnapshot: dispatch.customer?.name,
            billToAddress: dispatch.customer?.address,
            billToPhone: dispatch.customer?.phone,
            // Ship To (same as bill to for legacy)
            shipToName: dispatch.customer?.name,
            shipToPhone: dispatch.customer?.phone,
            shipToAddress: dispatch.customer?.address,
            receiverName: dispatch.delivery?.receiverName || dispatch.customer?.name,
            receiverPhone: dispatch.delivery?.receiverPhone || dispatch.customer?.phone,
            // Transport
            transporterName: dispatch.driver?.transporterName || '',
            vehicleNo: dispatch.driver?.vehicleNumber || '',
            driverName: dispatch.driver?.name || '',
            driverPhone: dispatch.driver?.phone || '',
            // Totals
            totalItems: dispatch.items?.length || 0,
            totalArea: dispatch.totalQuantity || 0,
            totalBoxes: 0, // Will be calculated from items
            // Status
            status: dcStatus,
            issuedBy: dispatch.createdBy,
            issuedAt: dcStatus === 'ISSUED' || dcStatus === 'DELIVERED' ? dispatch.transitStartedAt || dispatch.createdAt : null,
            deliveredAt: dcStatus === 'DELIVERED' ? dispatch.deliveredAt : null,
            // Migration flag
            migratedFrom: 'flooring_dispatches',
            migratedAt: now,
            // Audit
            statusHistory: [{
              status: dcStatus,
              timestamp: now,
              by: 'migration',
              notes: `Migrated from dispatch ${dispatch.dispatchNumber}`
            }],
            createdBy: dispatch.createdBy || 'migration',
            createdAt: dispatch.createdAt,
            updatedAt: now
          }
          
          // Create DC items
          const dcItems = (dispatch.items || []).map(item => ({
            id: uuidv4(),
            challanId,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            qtyArea: item.quantity || 0,
            qtyBoxes: Math.ceil((item.quantity || 0) / 25), // Assume 25 sqft per box
            coveragePerBoxSnapshot: 25,
            createdAt: now
          }))
          
          dc.totalBoxes = dcItems.reduce((sum, i) => sum + (i.qtyBoxes || 0), 0)
          
          await challans.insertOne(dc)
          if (dcItems.length > 0) {
            await challanItems.insertMany(dcItems)
          }
          
          // Update invoice with DC reference
          if (dispatch.invoiceId) {
            const invoices = db.collection('flooring_invoices')
            await invoices.updateOne(
              { id: dispatch.invoiceId },
              { 
                $addToSet: { challanIds: challanId },
                $set: { 
                  dispatchStatus: dcStatus === 'DELIVERED' ? 'DELIVERED' : 'DISPATCHED',
                  legacyDispatchMigrated: true,
                  updatedAt: now 
                }
              }
            )
          }
          
          migratedCount++
        }
        
        results.steps.push({ 
          step: 'Dispatch migration', 
          status: 'completed', 
          migrated: migratedCount,
          total: oldDispatches.length
        })
      } catch (migrateError) {
        results.steps.push({ step: 'Dispatch migration', status: 'error', error: migrateError.message })
      }
    }

    // ============================================
    // STEP 4: Seed Sample Data (for testing)
    // ============================================
    if (action === 'seed') {
      try {
        const quotes = db.collection('flooring_quotes')
        const pickLists = db.collection('flooring_pick_lists')
        const pickListItems = db.collection('flooring_pick_list_items')
        const challans = db.collection('flooring_challans')
        const challanItems = db.collection('flooring_challan_items')
        const products = db.collection('flooring_products')
        
        // Find an approved quote to create sample fulfillment data
        const approvedQuote = await quotes.findOne({ status: 'approved' })
        
        if (approvedQuote) {
          // Check if sample pick list already exists
          const existingPL = await pickLists.findOne({ quoteId: approvedQuote.id })
          
          if (!existingPL) {
            const pickListId = uuidv4()
            const pickListNumber = `PL-SAMPLE-001`
            
            // Create sample pick list
            const pickList = {
              id: pickListId,
              pickListNumber,
              quoteId: approvedQuote.id,
              quoteNumber: approvedQuote.quoteNumber,
              projectId: approvedQuote.projectId,
              projectNumber: approvedQuote.projectNumber,
              customer: approvedQuote.customer,
              status: 'MATERIAL_READY',
              assignedToUserId: user.id,
              assignedToUserName: user.name || user.email,
              assignedAt: now,
              notes: 'Sample pick list for testing',
              totalItems: 0,
              totalArea: 0,
              totalBoxes: 0,
              confirmedAt: now,
              confirmedBy: user.id,
              confirmedByName: user.name || user.email,
              confirmedTotalArea: 0,
              confirmedTotalBoxes: 0,
              hasVariance: false,
              statusHistory: [
                { status: 'CREATED', timestamp: now, by: user.id, userName: user.name, notes: 'Sample created' },
                { status: 'ASSIGNED', timestamp: now, by: user.id, userName: user.name, notes: 'Assigned' },
                { status: 'MATERIAL_READY', timestamp: now, by: user.id, userName: user.name, notes: 'Material confirmed ready' }
              ],
              createdBy: user.id,
              createdByName: user.name || user.email,
              createdAt: now,
              updatedAt: now
            }
            
            // Create pick list items from quote
            const materialItems = (approvedQuote.items || []).filter(i => i.itemType === 'material' || !i.itemType)
            const plItems = []
            let totalArea = 0, totalBoxes = 0
            
            for (const quoteItem of materialItems) {
              const product = await products.findOne({ id: quoteItem.productId || quoteItem.id })
              const coveragePerBox = product?.coveragePerBox || quoteItem.coveragePerBox || 25
              const wastagePercent = quoteItem.wastagePercent || 10
              const area = quoteItem.area || quoteItem.quantity || 0
              const boxes = Math.ceil(area * (1 + wastagePercent / 100) / coveragePerBox)
              
              plItems.push({
                id: uuidv4(),
                pickListId,
                productId: quoteItem.productId || quoteItem.id,
                productName: quoteItem.productName || quoteItem.name,
                sku: quoteItem.sku || product?.sku,
                quoteQtyArea: area,
                quoteQtyBoxes: boxes,
                confirmedQtyArea: area, // Same as quote for sample
                confirmedQtyBoxes: boxes,
                coveragePerBoxSnapshot: coveragePerBox,
                wastagePercentSnapshot: wastagePercent,
                unitPriceSnapshot: quoteItem.rate || quoteItem.unitPrice,
                lotNo: 'LOT-2024-001',
                varianceReason: null,
                notes: 'Sample item',
                createdAt: now,
                updatedAt: now
              })
              totalArea += area
              totalBoxes += boxes
            }
            
            pickList.totalItems = plItems.length
            pickList.totalArea = totalArea
            pickList.totalBoxes = totalBoxes
            pickList.confirmedTotalArea = totalArea
            pickList.confirmedTotalBoxes = totalBoxes
            
            await pickLists.insertOne(pickList)
            if (plItems.length > 0) {
              await pickListItems.insertMany(plItems)
            }
            
            // Update quote with pick list reference
            await quotes.updateOne(
              { id: approvedQuote.id },
              { $set: { pickListId, pickListNumber, pickListStatus: 'MATERIAL_READY', updatedAt: now } }
            )
            
            results.steps.push({ 
              step: 'Sample Pick List', 
              status: 'created', 
              pickListId, 
              pickListNumber,
              quoteId: approvedQuote.id
            })
            
            // Create sample DC from pick list
            const dcId = uuidv4()
            const dcNo = 'DC-SAMPLE-001'
            
            const dc = {
              id: dcId,
              dcNo,
              type: 'delivery',
              quoteId: approvedQuote.id,
              quoteNumber: approvedQuote.quoteNumber,
              pickListId,
              pickListNumber,
              projectId: approvedQuote.projectId,
              projectNumber: approvedQuote.projectNumber,
              // Bill To
              billToAccountId: approvedQuote.customer?.id,
              billToName: approvedQuote.customer?.name,
              billToNameSnapshot: approvedQuote.customer?.name,
              billToAddress: approvedQuote.customer?.address,
              billToPhone: approvedQuote.customer?.phone,
              // Ship To (third party example)
              shipToName: 'Site Supervisor - Mr. Kumar',
              shipToPhone: '+91 98765 43210',
              shipToAddress: '123 Construction Site, Building A, Floor 5',
              receiverName: 'Mr. Kumar',
              receiverPhone: '+91 98765 43210',
              thirdPartyDelivery: true,
              hideSenderOnPdf: false,
              // Transport
              transporterName: 'FastTrack Logistics',
              vehicleNo: 'MH01AB1234',
              driverName: 'Ramesh Kumar',
              driverPhone: '+91 99887 76655',
              lrNo: 'LR-2024-001',
              dispatchNotes: 'Handle with care - fragile flooring material',
              // Totals
              totalItems: plItems.length,
              totalArea: totalArea,
              totalBoxes: totalBoxes,
              // Status - DRAFT (not issued yet)
              status: 'DRAFT',
              statusHistory: [{
                status: 'DRAFT',
                timestamp: now,
                by: user.id,
                userName: user.name || user.email,
                notes: 'Sample DC created from pick list'
              }],
              createdBy: user.id,
              createdByName: user.name || user.email,
              createdAt: now,
              updatedAt: now
            }
            
            // Create DC items
            const dcItems = plItems.map(item => ({
              id: uuidv4(),
              challanId: dcId,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              qtyArea: item.confirmedQtyArea,
              qtyBoxes: item.confirmedQtyBoxes,
              coveragePerBoxSnapshot: item.coveragePerBoxSnapshot,
              lotNo: item.lotNo,
              notes: '',
              createdAt: now
            }))
            
            await challans.insertOne(dc)
            if (dcItems.length > 0) {
              await challanItems.insertMany(dcItems)
            }
            
            // Update quote with DC reference
            await quotes.updateOne(
              { id: approvedQuote.id },
              { 
                $addToSet: { challanIds: dcId },
                $set: { dispatchStatus: 'PENDING', updatedAt: now } 
              }
            )
            
            results.steps.push({ 
              step: 'Sample Delivery Challan', 
              status: 'created', 
              dcId, 
              dcNo,
              status: 'DRAFT (ready to issue)'
            })
            
          } else {
            results.steps.push({ step: 'Sample data', status: 'already exists' })
          }
        } else {
          results.steps.push({ step: 'Sample data', status: 'skipped', reason: 'No approved quote found. Create and approve a quote first.' })
        }
      } catch (seedError) {
        results.steps.push({ step: 'Seed sample data', status: 'error', error: seedError.message })
      }
    }

    // ============================================
    // Summary
    // ============================================
    const successCount = results.steps.filter(s => s.status === 'created' || s.status === 'completed').length
    const errorCount = results.steps.filter(s => s.status === 'error').length
    
    results.summary = {
      success: successCount,
      errors: errorCount,
      total: results.steps.length,
      status: errorCount === 0 ? 'SUCCESS' : 'PARTIAL'
    }

    return successResponse(results)
  } catch (error) {
    console.error('Migration Error:', error)
    return errorResponse('Migration failed', 500, error.message)
  }
}

// GET - Check migration status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Check collections status
    const pickListsCount = await db.collection('flooring_pick_lists').countDocuments()
    const challansCount = await db.collection('flooring_challans').countDocuments()
    const oldDispatchesCount = await db.collection('flooring_dispatches').countDocuments()
    
    // Check if fulfillment settings exist
    const settings = await db.collection('flooring_settings').findOne({ type: 'fulfillment' })
    
    // Check for migrated dispatches
    const migratedChallans = await db.collection('flooring_challans').countDocuments({ migratedFrom: 'flooring_dispatches' })

    return successResponse({
      status: {
        pickListsCount,
        challansCount,
        oldDispatchesCount,
        migratedChallansCount: migratedChallans,
        fulfillmentSettingsExist: !!settings,
        needsMigration: oldDispatchesCount > migratedChallans
      },
      settings: settings ? {
        requirePickListForDC: settings.requirePickListForDC,
        requirePickListForInvoice: settings.requirePickListForInvoice,
        allowPartialDispatch: settings.allowPartialDispatch,
        hideSenderDefault: settings.hideSenderDefault
      } : null,
      instructions: {
        setup: 'POST /api/flooring/enhanced/migrate?action=setup - Create indexes and settings',
        migrate: 'POST /api/flooring/enhanced/migrate?action=migrate - Full migration (includes setup)',
        seed: 'POST /api/flooring/enhanced/migrate?action=seed - Create sample data for testing'
      }
    })
  } catch (error) {
    console.error('Migration Status Error:', error)
    return errorResponse('Failed to get migration status', 500, error.message)
  }
}
