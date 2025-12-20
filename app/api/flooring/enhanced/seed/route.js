import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * Comprehensive Seed Script for Enterprise Fulfillment Workflow Testing
 * 
 * Creates:
 * - 3 Approved Quotes
 * - 3 Pick Lists (1 MATERIAL_READY, 1 PICKING, 1 CREATED)
 * - 3 DCs (1 ISSUED, 1 DRAFT, 1 DELIVERED)
 * - 2 Invoices (1 from DC, 1 before DC)
 * - Stock movements for verification
 */

// POST - Run comprehensive seed
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date().toISOString()

    const results = {
      timestamp: now,
      seededBy: user.name || user.email,
      data: {}
    }

    // Collections
    const quotes = db.collection('flooring_quotes')
    const pickLists = db.collection('flooring_pick_lists')
    const pickListItems = db.collection('flooring_pick_list_items')
    const challans = db.collection('flooring_challans')
    const challanItems = db.collection('flooring_challan_items')
    const invoices = db.collection('flooring_invoices')
    const products = db.collection('flooring_products')
    const projects = db.collection('flooring_projects')
    const movements = db.collection('wf_inventory_movements')
    const stock = db.collection('wf_inventory_stock')
    const settings = db.collection('flooring_settings')

    // Get existing products for realistic data
    const existingProducts = await products.find({}).limit(5).toArray()
    if (existingProducts.length === 0) {
      return errorResponse('No products found. Please add products first.', 400)
    }

    // Initialize fulfillment settings
    await settings.updateOne(
      { type: 'fulfillment' },
      {
        $set: {
          type: 'fulfillment',
          requirePickListForDC: true,
          requirePickListForInvoice: true,
          autoCreatePickListOnApproval: false,
          allowPartialDispatch: true,
          requireDCForInvoiceDispatch: true,
          hideSenderDefault: false,
          thirdPartyDeliveryDefault: false,
          allowBypassPickListForDC: false,
          allowBypassPickListForInvoice: false,
          updatedAt: now
        },
        $setOnInsert: { id: uuidv4(), createdAt: now }
      },
      { upsert: true }
    )
    results.data.settings = 'Fulfillment settings initialized'

    // Helper to create quote items from products
    const createQuoteItems = (productList, areas) => {
      return productList.map((product, idx) => {
        const area = areas[idx] || 100
        const coveragePerBox = product.coveragePerBox || 25
        const wastagePercent = product.wastagePercent || 10
        const boxes = Math.ceil(area * (1 + wastagePercent / 100) / coveragePerBox)
        const rate = product.sellingPrice || product.mrp || 250
        
        return {
          id: uuidv4(),
          productId: product.id,
          productName: product.name,
          sku: product.sku || `SKU-${product.id.slice(0,8)}`,
          itemType: 'material',
          area,
          quantity: area,
          unit: 'sqft',
          boxes,
          coveragePerBox,
          wastagePercent,
          rate,
          unitPrice: rate,
          totalPrice: rate * area,
          taxRate: product.gstRate || 18
        }
      })
    }

    // ============================================
    // FLOW 1: Dispatch-First (Quote → Pick List → DC Issued → Invoice from DC)
    // ============================================
    const flow1QuoteId = uuidv4()
    const flow1PickListId = uuidv4()
    const flow1ChallanId = uuidv4()
    const flow1Items = createQuoteItems(existingProducts.slice(0, 2), [150, 100])

    // Quote 1 - Dispatch First
    const quote1 = {
      id: flow1QuoteId,
      quoteNumber: 'QT-SEED-001',
      projectId: null,
      customer: {
        id: uuidv4(),
        name: 'ABC Builders Pvt Ltd',
        email: 'purchase@abcbuilders.com',
        phone: '+91 98765 11111',
        address: '123 Builder Plaza, Mumbai',
        gstin: '27AAAAA1234A1Z5'
      },
      site: {
        name: 'Green Valley Project - Tower A',
        address: 'Plot 45, Green Valley, Navi Mumbai'
      },
      items: flow1Items,
      subtotal: flow1Items.reduce((s, i) => s + i.totalPrice, 0),
      discountType: 'percent',
      discountValue: 5,
      discountAmount: flow1Items.reduce((s, i) => s + i.totalPrice, 0) * 0.05,
      taxableAmount: flow1Items.reduce((s, i) => s + i.totalPrice, 0) * 0.95,
      cgstRate: 9,
      sgstRate: 9,
      totalTax: flow1Items.reduce((s, i) => s + i.totalPrice, 0) * 0.95 * 0.18,
      grandTotal: flow1Items.reduce((s, i) => s + i.totalPrice, 0) * 0.95 * 1.18,
      status: 'approved',
      approvedAt: now,
      pickListId: flow1PickListId,
      pickListNumber: 'PL-SEED-001',
      pickListStatus: 'MATERIAL_READY',
      challanIds: [flow1ChallanId],
      dispatchStatus: 'DISPATCHED',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      statusHistory: [
        { status: 'draft', timestamp: now, by: user.id },
        { status: 'approved', timestamp: now, by: user.id, notes: 'Seed data - Dispatch First flow' }
      ],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }
    await quotes.insertOne(quote1)

    // Pick List 1 - MATERIAL_READY
    const pickList1 = {
      id: flow1PickListId,
      pickListNumber: 'PL-SEED-001',
      quoteId: flow1QuoteId,
      quoteNumber: 'QT-SEED-001',
      customer: quote1.customer,
      status: 'MATERIAL_READY',
      assignedToUserId: user.id,
      assignedToUserName: user.name || 'Warehouse Staff',
      assignedAt: now,
      totalItems: flow1Items.length,
      totalArea: flow1Items.reduce((s, i) => s + i.area, 0),
      totalBoxes: flow1Items.reduce((s, i) => s + i.boxes, 0),
      confirmedTotalArea: flow1Items.reduce((s, i) => s + i.area, 0),
      confirmedTotalBoxes: flow1Items.reduce((s, i) => s + i.boxes, 0),
      confirmedAt: now,
      confirmedBy: user.id,
      confirmedByName: user.name || 'Warehouse Staff',
      hasVariance: false,
      notes: 'Seed data - Flow 1 (Dispatch First)',
      statusHistory: [
        { status: 'CREATED', timestamp: now, by: user.id, userName: user.name, notes: 'Created' },
        { status: 'ASSIGNED', timestamp: now, by: user.id, userName: user.name, notes: 'Assigned' },
        { status: 'MATERIAL_READY', timestamp: now, by: user.id, userName: user.name, notes: 'Material confirmed ready' }
      ],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }
    await pickLists.insertOne(pickList1)

    // Pick List Items 1
    const plItems1 = flow1Items.map(item => ({
      id: uuidv4(),
      pickListId: flow1PickListId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quoteQtyArea: item.area,
      quoteQtyBoxes: item.boxes,
      confirmedQtyArea: item.area,
      confirmedQtyBoxes: item.boxes,
      coveragePerBoxSnapshot: item.coveragePerBox,
      wastagePercentSnapshot: item.wastagePercent,
      unitPriceSnapshot: item.rate,
      lotNo: 'LOT-2024-SEED-01',
      varianceReason: null,
      notes: '',
      createdAt: now,
      updatedAt: now
    }))
    await pickListItems.insertMany(plItems1)

    // Challan 1 - ISSUED (stock deducted)
    const challan1 = {
      id: flow1ChallanId,
      dcNo: 'DC-SEED-001',
      type: 'delivery',
      quoteId: flow1QuoteId,
      quoteNumber: 'QT-SEED-001',
      pickListId: flow1PickListId,
      pickListNumber: 'PL-SEED-001',
      invoiceId: null,
      // Bill To
      billToAccountId: quote1.customer.id,
      billToName: quote1.customer.name,
      billToNameSnapshot: quote1.customer.name,
      billToAddress: quote1.customer.address,
      billToPhone: quote1.customer.phone,
      billToGstin: quote1.customer.gstin,
      // Ship To (same as bill to)
      shipToName: quote1.site.name,
      shipToPhone: quote1.customer.phone,
      shipToAddress: quote1.site.address,
      receiverName: 'Site Supervisor - Mr. Sharma',
      receiverPhone: '+91 98765 22222',
      thirdPartyDelivery: false,
      hideSenderOnPdf: false,
      // Transport
      transporterName: 'FastTrack Logistics',
      vehicleNo: 'MH01AB1234',
      driverName: 'Ramesh Kumar',
      driverPhone: '+91 99887 11111',
      lrNo: 'LR-SEED-001',
      dispatchNotes: 'Handle with care - premium flooring material',
      // Totals
      totalItems: flow1Items.length,
      totalArea: flow1Items.reduce((s, i) => s + i.area, 0),
      totalBoxes: flow1Items.reduce((s, i) => s + i.boxes, 0),
      // Status - ISSUED
      status: 'ISSUED',
      issuedBy: user.id,
      issuedByName: user.name || user.email,
      issuedAt: now,
      deliveredAt: null,
      statusHistory: [
        { status: 'DRAFT', timestamp: now, by: user.id, userName: user.name, notes: 'DC created' },
        { status: 'ISSUED', timestamp: now, by: user.id, userName: user.name, notes: 'DC issued, stock deducted' }
      ],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }
    await challans.insertOne(challan1)

    // Challan Items 1 - CRITICAL: Must have all qty fields populated
    const dcItems1 = flow1Items.map(item => ({
      id: uuidv4(),
      challanId: flow1ChallanId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      qtyArea: item.area,
      qtyBoxes: item.boxes,
      coveragePerBoxSnapshot: item.coveragePerBox,
      lotNo: 'LOT-2024-SEED-01',
      notes: '',
      createdAt: now
    }))
    await challanItems.insertMany(dcItems1)

    // Create stock OUT movements for ISSUED DC
    for (const item of flow1Items) {
      // Record stock movement
      await movements.insertOne({
        id: uuidv4(),
        productId: item.productId,
        productName: item.productName,
        type: 'dispatch',
        movementType: 'out',
        quantity: -item.boxes,
        referenceType: 'DC',
        referenceId: flow1ChallanId,
        referenceNumber: 'DC-SEED-001',
        quoteId: flow1QuoteId,
        notes: 'Stock OUT - DC SEED-001 issued',
        createdBy: user.id,
        createdByName: user.name || user.email,
        createdAt: now
      })

      // Update stock
      await stock.updateOne(
        { productId: item.productId },
        {
          $inc: { quantity: -item.boxes, currentQty: -item.boxes },
          $set: { updatedAt: now }
        },
        { upsert: false }
      )
    }

    results.data.flow1 = {
      description: 'Dispatch-First: Quote → Pick List (MATERIAL_READY) → DC (ISSUED) → Invoice pending',
      quoteId: flow1QuoteId,
      quoteNumber: 'QT-SEED-001',
      pickListId: flow1PickListId,
      pickListNumber: 'PL-SEED-001',
      pickListStatus: 'MATERIAL_READY',
      challanId: flow1ChallanId,
      dcNo: 'DC-SEED-001',
      dcStatus: 'ISSUED',
      stockDeducted: true,
      itemsCount: flow1Items.length,
      totalBoxes: flow1Items.reduce((s, i) => s + i.boxes, 0)
    }

    // ============================================
    // FLOW 2: Invoice-First (Quote → Pick List → Invoice → DC DRAFT)
    // ============================================
    const flow2QuoteId = uuidv4()
    const flow2PickListId = uuidv4()
    const flow2InvoiceId = uuidv4()
    const flow2ChallanId = uuidv4()
    const flow2Items = createQuoteItems(existingProducts.slice(0, 3), [200, 150, 80])

    // Quote 2 - Invoice First
    const quote2 = {
      id: flow2QuoteId,
      quoteNumber: 'QT-SEED-002',
      projectId: null,
      customer: {
        id: uuidv4(),
        name: 'XYZ Interiors LLP',
        email: 'orders@xyzinteriors.com',
        phone: '+91 98765 33333',
        address: '456 Design Hub, Pune',
        gstin: '27BBBBB5678B1Z6'
      },
      site: {
        name: 'Luxury Villa - Plot 78',
        address: '78 Palm Beach Road, Vashi'
      },
      items: flow2Items,
      subtotal: flow2Items.reduce((s, i) => s + i.totalPrice, 0),
      discountType: 'fixed',
      discountValue: 5000,
      discountAmount: 5000,
      taxableAmount: flow2Items.reduce((s, i) => s + i.totalPrice, 0) - 5000,
      cgstRate: 9,
      sgstRate: 9,
      totalTax: (flow2Items.reduce((s, i) => s + i.totalPrice, 0) - 5000) * 0.18,
      grandTotal: (flow2Items.reduce((s, i) => s + i.totalPrice, 0) - 5000) * 1.18,
      status: 'approved',
      approvedAt: now,
      pickListId: flow2PickListId,
      pickListNumber: 'PL-SEED-002',
      pickListStatus: 'MATERIAL_READY',
      invoiceId: flow2InvoiceId,
      dispatchStatus: 'PENDING',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      statusHistory: [
        { status: 'draft', timestamp: now, by: user.id },
        { status: 'approved', timestamp: now, by: user.id, notes: 'Seed data - Invoice First flow' }
      ],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }
    await quotes.insertOne(quote2)

    // Pick List 2 - MATERIAL_READY
    const pickList2 = {
      id: flow2PickListId,
      pickListNumber: 'PL-SEED-002',
      quoteId: flow2QuoteId,
      quoteNumber: 'QT-SEED-002',
      customer: quote2.customer,
      status: 'MATERIAL_READY',
      assignedToUserId: user.id,
      assignedToUserName: user.name || 'Warehouse Staff',
      assignedAt: now,
      totalItems: flow2Items.length,
      totalArea: flow2Items.reduce((s, i) => s + i.area, 0),
      totalBoxes: flow2Items.reduce((s, i) => s + i.boxes, 0),
      confirmedTotalArea: flow2Items.reduce((s, i) => s + i.area, 0),
      confirmedTotalBoxes: flow2Items.reduce((s, i) => s + i.boxes, 0),
      confirmedAt: now,
      confirmedBy: user.id,
      hasVariance: false,
      notes: 'Seed data - Flow 2 (Invoice First)',
      statusHistory: [
        { status: 'CREATED', timestamp: now, by: user.id, userName: user.name, notes: 'Created' },
        { status: 'MATERIAL_READY', timestamp: now, by: user.id, userName: user.name, notes: 'Material ready' }
      ],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }
    await pickLists.insertOne(pickList2)

    // Pick List Items 2
    const plItems2 = flow2Items.map(item => ({
      id: uuidv4(),
      pickListId: flow2PickListId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quoteQtyArea: item.area,
      quoteQtyBoxes: item.boxes,
      confirmedQtyArea: item.area,
      confirmedQtyBoxes: item.boxes,
      coveragePerBoxSnapshot: item.coveragePerBox,
      wastagePercentSnapshot: item.wastagePercent,
      unitPriceSnapshot: item.rate,
      lotNo: 'LOT-2024-SEED-02',
      createdAt: now,
      updatedAt: now
    }))
    await pickListItems.insertMany(plItems2)

    // Invoice 2 - Created BEFORE DC (stock NOT deducted - DC-based flow)
    const invoice2 = {
      id: flow2InvoiceId,
      invoiceNumber: 'INV-SEED-001',
      quoteId: flow2QuoteId,
      quoteNumber: 'QT-SEED-002',
      customer: quote2.customer,
      site: quote2.site,
      items: flow2Items,
      subtotal: quote2.subtotal,
      discountType: quote2.discountType,
      discountValue: quote2.discountValue,
      discountAmount: quote2.discountAmount,
      taxableAmount: quote2.taxableAmount,
      cgstRate: 9,
      sgstRate: 9,
      totalTax: quote2.totalTax,
      grandTotal: quote2.grandTotal,
      status: 'sent',
      dispatchStatus: 'PENDING', // Stock NOT deducted yet - waiting for DC
      inventoryDeducted: false,
      dispatchNote: 'Stock will be deducted when Delivery Challan is issued',
      challanIds: [flow2ChallanId],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      statusHistory: [
        { status: 'draft', timestamp: now, by: user.id },
        { status: 'sent', timestamp: now, by: user.id, notes: 'Invoice sent - dispatch pending' }
      ],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }
    await invoices.insertOne(invoice2)

    // Challan 2 - DRAFT (not issued yet, stock not deducted)
    const challan2 = {
      id: flow2ChallanId,
      dcNo: 'DC-SEED-002',
      type: 'delivery',
      quoteId: flow2QuoteId,
      quoteNumber: 'QT-SEED-002',
      invoiceId: flow2InvoiceId,
      invoiceNumber: 'INV-SEED-001',
      pickListId: flow2PickListId,
      pickListNumber: 'PL-SEED-002',
      // Bill To
      billToAccountId: quote2.customer.id,
      billToName: quote2.customer.name,
      billToNameSnapshot: quote2.customer.name,
      billToAddress: quote2.customer.address,
      billToPhone: quote2.customer.phone,
      // Ship To
      shipToName: quote2.site.name,
      shipToPhone: quote2.customer.phone,
      shipToAddress: quote2.site.address,
      receiverName: quote2.customer.name,
      receiverPhone: quote2.customer.phone,
      thirdPartyDelivery: false,
      hideSenderOnPdf: false,
      // Transport - not filled yet
      transporterName: '',
      vehicleNo: '',
      driverName: '',
      driverPhone: '',
      lrNo: '',
      dispatchNotes: 'Waiting for vehicle assignment',
      // Totals
      totalItems: flow2Items.length,
      totalArea: flow2Items.reduce((s, i) => s + i.area, 0),
      totalBoxes: flow2Items.reduce((s, i) => s + i.boxes, 0),
      // Status - DRAFT
      status: 'DRAFT',
      issuedBy: null,
      issuedAt: null,
      statusHistory: [
        { status: 'DRAFT', timestamp: now, by: user.id, userName: user.name, notes: 'DC created from invoice' }
      ],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }
    await challans.insertOne(challan2)

    // Challan Items 2
    const dcItems2 = flow2Items.map(item => ({
      id: uuidv4(),
      challanId: flow2ChallanId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      qtyArea: item.area,
      qtyBoxes: item.boxes,
      coveragePerBoxSnapshot: item.coveragePerBox,
      lotNo: 'LOT-2024-SEED-02',
      notes: '',
      createdAt: now
    }))
    await challanItems.insertMany(dcItems2)

    results.data.flow2 = {
      description: 'Invoice-First: Quote → Pick List → Invoice (created) → DC (DRAFT - stock not deducted)',
      quoteId: flow2QuoteId,
      quoteNumber: 'QT-SEED-002',
      pickListId: flow2PickListId,
      pickListNumber: 'PL-SEED-002',
      invoiceId: flow2InvoiceId,
      invoiceNumber: 'INV-SEED-001',
      challanId: flow2ChallanId,
      dcNo: 'DC-SEED-002',
      dcStatus: 'DRAFT',
      stockDeducted: false,
      itemsCount: flow2Items.length,
      totalBoxes: flow2Items.reduce((s, i) => s + i.boxes, 0)
    }

    // ============================================
    // FLOW 3: Third-Party Delivery (Bill-to Dealer, Ship-to End Customer, hide sender)
    // ============================================
    const flow3QuoteId = uuidv4()
    const flow3PickListId = uuidv4()
    const flow3ChallanId = uuidv4()
    const flow3InvoiceId = uuidv4()
    const flow3Items = createQuoteItems(existingProducts.slice(0, 2), [120, 80])

    // Quote 3 - Third Party Delivery
    const quote3 = {
      id: flow3QuoteId,
      quoteNumber: 'QT-SEED-003',
      projectId: null,
      customer: {
        id: uuidv4(),
        name: 'Premium Floors Dealer', // This is the DEALER (Bill-to)
        email: 'dealer@premiumfloors.com',
        phone: '+91 98765 44444',
        address: '789 Dealer Street, Delhi',
        gstin: '07CCCCC9012C1Z7',
        customerType: 'dealer'
      },
      site: {
        name: 'End Customer Site - Mr. Kapoor Residence', // This is the END CUSTOMER (Ship-to)
        address: '22 Golf Course Road, Gurgaon'
      },
      endCustomer: {
        name: 'Mr. Rajesh Kapoor',
        phone: '+91 98765 55555',
        address: '22 Golf Course Road, Gurgaon'
      },
      items: flow3Items,
      subtotal: flow3Items.reduce((s, i) => s + i.totalPrice, 0),
      discountType: 'percent',
      discountValue: 10, // Dealer discount
      discountAmount: flow3Items.reduce((s, i) => s + i.totalPrice, 0) * 0.10,
      taxableAmount: flow3Items.reduce((s, i) => s + i.totalPrice, 0) * 0.90,
      cgstRate: 9,
      sgstRate: 9,
      totalTax: flow3Items.reduce((s, i) => s + i.totalPrice, 0) * 0.90 * 0.18,
      grandTotal: flow3Items.reduce((s, i) => s + i.totalPrice, 0) * 0.90 * 1.18,
      status: 'approved',
      approvedAt: now,
      pickListId: flow3PickListId,
      pickListNumber: 'PL-SEED-003',
      pickListStatus: 'PICKING',
      challanIds: [flow3ChallanId],
      dispatchStatus: 'DELIVERED',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      statusHistory: [
        { status: 'draft', timestamp: now, by: user.id },
        { status: 'approved', timestamp: now, by: user.id, notes: 'Seed data - Third Party flow' }
      ],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }
    await quotes.insertOne(quote3)

    // Pick List 3 - PICKING (in progress)
    const pickList3 = {
      id: flow3PickListId,
      pickListNumber: 'PL-SEED-003',
      quoteId: flow3QuoteId,
      quoteNumber: 'QT-SEED-003',
      customer: quote3.customer,
      status: 'PICKING',
      assignedToUserId: user.id,
      assignedToUserName: user.name || 'Warehouse Staff',
      assignedAt: now,
      pickingStartedAt: now,
      totalItems: flow3Items.length,
      totalArea: flow3Items.reduce((s, i) => s + i.area, 0),
      totalBoxes: flow3Items.reduce((s, i) => s + i.boxes, 0),
      notes: 'Seed data - Flow 3 (Third Party Delivery)',
      statusHistory: [
        { status: 'CREATED', timestamp: now, by: user.id, userName: user.name, notes: 'Created' },
        { status: 'PICKING', timestamp: now, by: user.id, userName: user.name, notes: 'Picking started' }
      ],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }
    await pickLists.insertOne(pickList3)

    // Pick List Items 3 (partially confirmed)
    const plItems3 = flow3Items.map((item, idx) => ({
      id: uuidv4(),
      pickListId: flow3PickListId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quoteQtyArea: item.area,
      quoteQtyBoxes: item.boxes,
      confirmedQtyArea: idx === 0 ? item.area : null, // First item confirmed
      confirmedQtyBoxes: idx === 0 ? item.boxes : null,
      coveragePerBoxSnapshot: item.coveragePerBox,
      wastagePercentSnapshot: item.wastagePercent,
      unitPriceSnapshot: item.rate,
      lotNo: idx === 0 ? 'LOT-2024-SEED-03' : null,
      createdAt: now,
      updatedAt: now
    }))
    await pickListItems.insertMany(plItems3)

    // Challan 3 - DELIVERED with Third Party settings
    const challan3 = {
      id: flow3ChallanId,
      dcNo: 'DC-SEED-003',
      type: 'delivery',
      quoteId: flow3QuoteId,
      quoteNumber: 'QT-SEED-003',
      invoiceId: flow3InvoiceId,
      invoiceNumber: 'INV-SEED-002',
      pickListId: flow3PickListId,
      pickListNumber: 'PL-SEED-003',
      // Bill To - DEALER
      billToAccountId: quote3.customer.id,
      billToName: quote3.customer.name,
      billToNameSnapshot: quote3.customer.name,
      billToAddress: quote3.customer.address,
      billToPhone: quote3.customer.phone,
      billToGstin: quote3.customer.gstin,
      // Ship To - END CUSTOMER (different from Bill-to)
      shipToName: quote3.endCustomer.name,
      shipToPhone: quote3.endCustomer.phone,
      shipToAddress: quote3.endCustomer.address,
      receiverName: quote3.endCustomer.name,
      receiverPhone: quote3.endCustomer.phone,
      // THIRD PARTY FLAGS
      thirdPartyDelivery: true,
      hideSenderOnPdf: true, // Hide sender details on PDF
      // Transport
      transporterName: 'BlueDart Express',
      vehicleNo: 'DL01CD5678',
      driverName: 'Sunil Verma',
      driverPhone: '+91 99887 33333',
      lrNo: 'LR-SEED-003',
      dispatchNotes: 'Third party delivery - deliver to end customer, dealer billed',
      // Totals
      totalItems: flow3Items.length,
      totalArea: flow3Items.reduce((s, i) => s + i.area, 0),
      totalBoxes: flow3Items.reduce((s, i) => s + i.boxes, 0),
      // Status - DELIVERED
      status: 'DELIVERED',
      issuedBy: user.id,
      issuedByName: user.name || user.email,
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      deliveredAt: now,
      deliveredBy: user.id,
      podUrl: null,
      deliveryNotes: 'Delivered to Mr. Kapoor, signed by security',
      statusHistory: [
        { status: 'DRAFT', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), by: user.id, userName: user.name, notes: 'DC created' },
        { status: 'ISSUED', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), by: user.id, userName: user.name, notes: 'DC issued' },
        { status: 'DELIVERED', timestamp: now, by: user.id, userName: user.name, notes: 'Delivered to end customer' }
      ],
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now
    }
    await challans.insertOne(challan3)

    // Challan Items 3
    const dcItems3 = flow3Items.map(item => ({
      id: uuidv4(),
      challanId: flow3ChallanId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      qtyArea: item.area,
      qtyBoxes: item.boxes,
      coveragePerBoxSnapshot: item.coveragePerBox,
      lotNo: 'LOT-2024-SEED-03',
      notes: '',
      createdAt: now
    }))
    await challanItems.insertMany(dcItems3)

    // Stock movements for Flow 3 (DELIVERED DC)
    for (const item of flow3Items) {
      await movements.insertOne({
        id: uuidv4(),
        productId: item.productId,
        productName: item.productName,
        type: 'dispatch',
        movementType: 'out',
        quantity: -item.boxes,
        referenceType: 'DC',
        referenceId: flow3ChallanId,
        referenceNumber: 'DC-SEED-003',
        quoteId: flow3QuoteId,
        notes: 'Stock OUT - DC SEED-003 issued (third party delivery)',
        createdBy: user.id,
        createdByName: user.name || user.email,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      })

      await stock.updateOne(
        { productId: item.productId },
        {
          $inc: { quantity: -item.boxes, currentQty: -item.boxes },
          $set: { updatedAt: now }
        },
        { upsert: false }
      )
    }

    // Invoice 3 - From DC (created after delivery)
    const invoice3 = {
      id: flow3InvoiceId,
      invoiceNumber: 'INV-SEED-002',
      quoteId: flow3QuoteId,
      quoteNumber: 'QT-SEED-003',
      customer: quote3.customer, // Bill to DEALER
      site: { name: quote3.endCustomer.name, address: quote3.endCustomer.address },
      items: flow3Items,
      subtotal: quote3.subtotal,
      discountType: quote3.discountType,
      discountValue: quote3.discountValue,
      discountAmount: quote3.discountAmount,
      taxableAmount: quote3.taxableAmount,
      cgstRate: 9,
      sgstRate: 9,
      totalTax: quote3.totalTax,
      grandTotal: quote3.grandTotal,
      status: 'sent',
      dispatchStatus: 'DELIVERED',
      inventoryDeducted: false, // Stock was deducted via DC, not invoice
      fromChallanId: flow3ChallanId,
      challanIds: [flow3ChallanId],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      statusHistory: [
        { status: 'draft', timestamp: now, by: user.id },
        { status: 'sent', timestamp: now, by: user.id, notes: 'Invoice created from DC after delivery' }
      ],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }
    await invoices.insertOne(invoice3)

    results.data.flow3 = {
      description: 'Third-Party: Dealer billed, End Customer receives, hide sender enabled, DELIVERED',
      quoteId: flow3QuoteId,
      quoteNumber: 'QT-SEED-003',
      pickListId: flow3PickListId,
      pickListNumber: 'PL-SEED-003',
      pickListStatus: 'PICKING',
      challanId: flow3ChallanId,
      dcNo: 'DC-SEED-003',
      dcStatus: 'DELIVERED',
      invoiceId: flow3InvoiceId,
      invoiceNumber: 'INV-SEED-002',
      thirdPartyDelivery: true,
      hideSenderOnPdf: true,
      billTo: 'Premium Floors Dealer',
      shipTo: 'Mr. Rajesh Kapoor (End Customer)',
      stockDeducted: true,
      itemsCount: flow3Items.length,
      totalBoxes: flow3Items.reduce((s, i) => s + i.boxes, 0)
    }

    // ============================================
    // Summary
    // ============================================
    results.summary = {
      quotesCreated: 3,
      pickListsCreated: 3,
      pickListStatuses: { MATERIAL_READY: 2, PICKING: 1 },
      challansCreated: 3,
      challanStatuses: { ISSUED: 1, DRAFT: 1, DELIVERED: 1 },
      invoicesCreated: 2,
      stockMovementsCreated: 4 // 2 products in flow1 + 2 products in flow3
    }

    return successResponse(results)
  } catch (error) {
    console.error('Seed Error:', error)
    return errorResponse('Seed failed', 500, error.message)
  }
}

// GET - Get seed status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const stats = {
      quotes: {
        total: await db.collection('flooring_quotes').countDocuments(),
        approved: await db.collection('flooring_quotes').countDocuments({ status: 'approved' }),
        seeded: await db.collection('flooring_quotes').countDocuments({ quoteNumber: { $regex: /^QT-SEED/ } })
      },
      pickLists: {
        total: await db.collection('flooring_pick_lists').countDocuments(),
        materialReady: await db.collection('flooring_pick_lists').countDocuments({ status: 'MATERIAL_READY' }),
        seeded: await db.collection('flooring_pick_lists').countDocuments({ pickListNumber: { $regex: /^PL-SEED/ } })
      },
      challans: {
        total: await db.collection('flooring_challans').countDocuments(),
        issued: await db.collection('flooring_challans').countDocuments({ status: 'ISSUED' }),
        draft: await db.collection('flooring_challans').countDocuments({ status: 'DRAFT' }),
        delivered: await db.collection('flooring_challans').countDocuments({ status: 'DELIVERED' }),
        seeded: await db.collection('flooring_challans').countDocuments({ dcNo: { $regex: /^DC-SEED/ } })
      },
      challanItems: {
        total: await db.collection('flooring_challan_items').countDocuments()
      },
      invoices: {
        total: await db.collection('flooring_invoices').countDocuments(),
        seeded: await db.collection('flooring_invoices').countDocuments({ invoiceNumber: { $regex: /^INV-SEED/ } })
      },
      stockMovements: {
        total: await db.collection('wf_inventory_movements').countDocuments(),
        dcMovements: await db.collection('wf_inventory_movements').countDocuments({ referenceType: 'DC' })
      }
    }

    return successResponse({ stats })
  } catch (error) {
    console.error('Seed Status Error:', error)
    return errorResponse('Failed to get seed status', 500, error.message)
  }
}
