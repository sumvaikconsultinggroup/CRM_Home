/**
 * =====================================================
 * D&W MODULE - PRICE LISTS API
 * =====================================================
 * 
 * Enterprise-grade multi-tier pricing engine.
 * Supports retail, dealer, builder, and custom price lists.
 * 
 * Features:
 * - Multiple price lists (Retail, Dealer, Builder, Custom)
 * - Date-based pricing (effective dates)
 * - Product-level and category-level pricing
 * - Discount rules and approval thresholds
 * - Price history tracking
 * - Automatic tier-based pricing
 */

import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Price List Types
const PRICE_LIST_TYPES = [
  { id: 'retail', name: 'Retail', description: 'Standard retail pricing for end customers', priority: 1 },
  { id: 'dealer', name: 'Dealer', description: 'Wholesale pricing for registered dealers', priority: 2 },
  { id: 'builder', name: 'Builder/Contract', description: 'Special pricing for bulk/project orders', priority: 3 },
  { id: 'promotional', name: 'Promotional', description: 'Time-limited promotional pricing', priority: 4 },
  { id: 'custom', name: 'Custom', description: 'Customer-specific negotiated pricing', priority: 5 }
]

// Pricing Methods
const PRICING_METHODS = [
  { id: 'per_sqft', name: 'Per Square Foot', unit: 'sqft' },
  { id: 'per_unit', name: 'Per Unit/Piece', unit: 'unit' },
  { id: 'per_rft', name: 'Per Running Foot', unit: 'rft' },
  { id: 'lumpsum', name: 'Lump Sum', unit: 'lumpsum' },
  { id: 'tiered', name: 'Tiered (Volume-based)', unit: 'varies' }
]

// Discount Approval Thresholds
const DISCOUNT_THRESHOLDS = [
  { maxPercent: 5, approvalRequired: false, approver: null },
  { maxPercent: 10, approvalRequired: true, approver: 'sales_manager' },
  { maxPercent: 15, approvalRequired: true, approver: 'branch_manager' },
  { maxPercent: 20, approvalRequired: true, approver: 'regional_manager' },
  { maxPercent: 100, approvalRequired: true, approver: 'director' }
]

// GET - Fetch price lists and prices
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const priceListId = searchParams.get('id')
    const type = searchParams.get('type')
    const active = searchParams.get('active')
    const productId = searchParams.get('productId')
    const category = searchParams.get('category')
    const dealerId = searchParams.get('dealerId') // Get price list for specific dealer
    const getPrice = searchParams.get('getPrice') // Calculate price for product
    const getThresholds = searchParams.get('thresholds') // Get discount thresholds

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceLists = db.collection('dw_price_lists')
    const priceItems = db.collection('dw_price_items')
    const dealers = db.collection('dw_dealers')

    // Return discount thresholds
    if (getThresholds === 'true') {
      return successResponse({
        thresholds: DISCOUNT_THRESHOLDS,
        types: PRICE_LIST_TYPES,
        methods: PRICING_METHODS
      })
    }

    // Get price for specific product
    if (getPrice === 'true' && productId) {
      const priceListIdToUse = priceListId
      
      // If dealer specified, get their price list
      let effectivePriceListId = priceListIdToUse
      if (dealerId && !priceListIdToUse) {
        const dealer = await dealers.findOne({ id: dealerId })
        if (dealer?.priceListId) {
          effectivePriceListId = dealer.priceListId
        }
      }

      // Find price item
      let priceItem = null
      if (effectivePriceListId) {
        priceItem = await priceItems.findOne({
          priceListId: effectivePriceListId,
          productId,
          active: true
        })
      }

      // Fallback to retail price
      if (!priceItem) {
        const retailList = await priceLists.findOne({ type: 'retail', isDefault: true, active: true })
        if (retailList) {
          priceItem = await priceItems.findOne({
            priceListId: retailList.id,
            productId,
            active: true
          })
        }
      }

      return successResponse({
        priceItem: priceItem ? sanitizeDocument(priceItem) : null,
        priceListId: effectivePriceListId
      })
    }

    // Get single price list with items
    if (priceListId) {
      const priceList = await priceLists.findOne({ id: priceListId })
      if (!priceList) return errorResponse('Price list not found', 404)

      const items = await priceItems.find({ priceListId }).sort({ category: 1, productName: 1 }).toArray()
      priceList.items = sanitizeDocuments(items)

      return successResponse({
        priceList: sanitizeDocument(priceList),
        types: PRICE_LIST_TYPES,
        methods: PRICING_METHODS
      })
    }

    // Build query for listing
    const query = {}
    if (type) query.type = type
    if (active === 'true') query.active = true
    if (active === 'false') query.active = false

    const lists = await priceLists.find(query).sort({ type: 1, name: 1 }).toArray()

    // Add item counts
    for (const list of lists) {
      list.itemCount = await priceItems.countDocuments({ priceListId: list.id })
    }

    // Summary
    const summary = {
      total: lists.length,
      active: lists.filter(l => l.active).length,
      byType: PRICE_LIST_TYPES.reduce((acc, t) => {
        acc[t.id] = lists.filter(l => l.type === t.id).length
        return acc
      }, {})
    }

    return successResponse({
      priceLists: sanitizeDocuments(lists),
      summary,
      types: PRICE_LIST_TYPES,
      methods: PRICING_METHODS,
      thresholds: DISCOUNT_THRESHOLDS
    })
  } catch (error) {
    console.error('DW Price Lists GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch price lists', 500, error.message)
  }
}

// POST - Create price list or price items
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceLists = db.collection('dw_price_lists')
    const priceItems = db.collection('dw_price_items')

    const now = new Date().toISOString()

    // Create price list
    if (action === 'create_list' || !action) {
      const { name, type, description, currency, effectiveFrom, effectiveTo, isDefault } = body

      if (!name || !type) {
        return errorResponse('Name and type are required', 400)
      }

      if (!PRICE_LIST_TYPES.find(t => t.id === type)) {
        return errorResponse('Invalid price list type', 400)
      }

      // If setting as default, unset other defaults of same type
      if (isDefault) {
        await priceLists.updateMany(
          { type, isDefault: true },
          { $set: { isDefault: false, updatedAt: now } }
        )
      }

      const count = await priceLists.countDocuments()
      const listCode = `PL-${type.toUpperCase().substring(0, 3)}-${String(count + 1).padStart(3, '0')}`

      const priceList = {
        id: uuidv4(),
        code: listCode,
        clientId: user.clientId,
        name,
        type,
        description: description || PRICE_LIST_TYPES.find(t => t.id === type)?.description || '',
        currency: currency || 'INR',
        
        // Validity
        effectiveFrom: effectiveFrom || now,
        effectiveTo: effectiveTo || null, // null = no expiry
        
        // Flags
        active: true,
        isDefault: isDefault || false,
        
        // Discount rules
        maxDiscountPercent: parseFloat(body.maxDiscountPercent) || 20,
        discountApprovalRequired: body.discountApprovalRequired !== false,
        
        // Linked to dealer tier (if dealer type)
        dealerTier: body.dealerTier || null, // bronze, silver, gold, platinum
        
        // Markup/markdown from base
        baseListId: body.baseListId || null, // Reference to another list
        adjustmentPercent: parseFloat(body.adjustmentPercent) || 0, // +/- from base
        
        // Metadata
        notes: body.notes || '',
        version: 1,
        
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await priceLists.insertOne(priceList)

      return successResponse({
        priceList: sanitizeDocument(priceList),
        message: 'Price list created'
      }, 201)
    }

    // Add price item
    if (action === 'add_item') {
      const { priceListId, productId, productName, category, rate, pricingMethod, minQty, maxQty } = body

      if (!priceListId || !rate) {
        return errorResponse('Price list ID and rate are required', 400)
      }

      // Check price list exists
      const priceList = await priceLists.findOne({ id: priceListId })
      if (!priceList) return errorResponse('Price list not found', 404)

      // Check for duplicate
      const existing = await priceItems.findOne({
        priceListId,
        productId: productId || null,
        category: productId ? null : category
      })

      if (existing) {
        return errorResponse('Price item already exists for this product/category', 400)
      }

      const priceItem = {
        id: uuidv4(),
        priceListId,
        priceListCode: priceList.code,
        clientId: user.clientId,
        
        // Product or category-level pricing
        productId: productId || null,
        productName: productName || '',
        category: category || null, // If no productId, applies to entire category
        
        // Pricing
        rate: parseFloat(rate),
        pricingMethod: pricingMethod || 'per_sqft',
        currency: priceList.currency,
        
        // Volume pricing (optional)
        minQty: parseInt(minQty) || 1,
        maxQty: maxQty ? parseInt(maxQty) : null,
        
        // Tiered pricing (if method is tiered)
        tiers: body.tiers || [], // [{ minQty: 1, maxQty: 100, rate: 500 }, ...]
        
        // Components (for complex products)
        components: body.components || {
          frameRate: parseFloat(body.frameRate) || 0,
          sashRate: parseFloat(body.sashRate) || 0,
          glassRate: parseFloat(body.glassRate) || 0,
          hardwareRate: parseFloat(body.hardwareRate) || 0,
          finishRate: parseFloat(body.finishRate) || 0,
          laborRate: parseFloat(body.laborRate) || 0
        },
        
        // Validity
        effectiveFrom: body.effectiveFrom || now,
        effectiveTo: body.effectiveTo || null,
        active: true,
        
        // History
        previousRate: null,
        rateHistory: [],
        
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await priceItems.insertOne(priceItem)

      return successResponse({
        priceItem: sanitizeDocument(priceItem),
        message: 'Price item added'
      }, 201)
    }

    // Bulk add items
    if (action === 'bulk_add_items') {
      const { priceListId, items } = body

      if (!priceListId || !items || !items.length) {
        return errorResponse('Price list ID and items are required', 400)
      }

      const priceList = await priceLists.findOne({ id: priceListId })
      if (!priceList) return errorResponse('Price list not found', 404)

      const newItems = items.map(item => ({
        id: uuidv4(),
        priceListId,
        priceListCode: priceList.code,
        clientId: user.clientId,
        productId: item.productId || null,
        productName: item.productName || '',
        category: item.category || null,
        rate: parseFloat(item.rate) || 0,
        pricingMethod: item.pricingMethod || 'per_sqft',
        currency: priceList.currency,
        minQty: parseInt(item.minQty) || 1,
        maxQty: item.maxQty ? parseInt(item.maxQty) : null,
        tiers: item.tiers || [],
        components: item.components || {},
        effectiveFrom: item.effectiveFrom || now,
        effectiveTo: item.effectiveTo || null,
        active: true,
        previousRate: null,
        rateHistory: [],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }))

      await priceItems.insertMany(newItems)

      return successResponse({
        message: `${newItems.length} price items added`,
        count: newItems.length
      })
    }

    // Update price (with history)
    if (action === 'update_price') {
      const { priceItemId, newRate, reason, effectiveFrom } = body

      if (!priceItemId || newRate === undefined) {
        return errorResponse('Price item ID and new rate are required', 400)
      }

      const item = await priceItems.findOne({ id: priceItemId })
      if (!item) return errorResponse('Price item not found', 404)

      await priceItems.updateOne({ id: priceItemId }, {
        $set: {
          rate: parseFloat(newRate),
          previousRate: item.rate,
          effectiveFrom: effectiveFrom || now,
          updatedAt: now,
          updatedBy: user.id
        },
        $push: {
          rateHistory: {
            rate: item.rate,
            changedAt: now,
            changedBy: user.id,
            newRate: parseFloat(newRate),
            reason: reason || 'Price update'
          }
        }
      })

      return successResponse({ message: 'Price updated' })
    }

    // Copy price list
    if (action === 'copy_list') {
      const { sourceListId, newName, newType, adjustmentPercent } = body

      if (!sourceListId || !newName) {
        return errorResponse('Source list ID and new name are required', 400)
      }

      const sourceList = await priceLists.findOne({ id: sourceListId })
      if (!sourceList) return errorResponse('Source price list not found', 404)

      // Create new list
      const count = await priceLists.countDocuments()
      const type = newType || sourceList.type
      const listCode = `PL-${type.toUpperCase().substring(0, 3)}-${String(count + 1).padStart(3, '0')}`

      const newList = {
        id: uuidv4(),
        code: listCode,
        clientId: user.clientId,
        name: newName,
        type,
        description: body.description || `Copied from ${sourceList.name}`,
        currency: sourceList.currency,
        effectiveFrom: body.effectiveFrom || now,
        effectiveTo: body.effectiveTo || null,
        active: true,
        isDefault: false,
        maxDiscountPercent: sourceList.maxDiscountPercent,
        discountApprovalRequired: sourceList.discountApprovalRequired,
        dealerTier: body.dealerTier || sourceList.dealerTier,
        baseListId: sourceListId,
        adjustmentPercent: parseFloat(adjustmentPercent) || 0,
        notes: body.notes || '',
        version: 1,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await priceLists.insertOne(newList)

      // Copy items with adjustment
      const sourceItems = await priceItems.find({ priceListId: sourceListId }).toArray()
      const adjustment = 1 + (parseFloat(adjustmentPercent) || 0) / 100

      const newItems = sourceItems.map(item => ({
        id: uuidv4(),
        priceListId: newList.id,
        priceListCode: newList.code,
        clientId: user.clientId,
        productId: item.productId,
        productName: item.productName,
        category: item.category,
        rate: Math.round(item.rate * adjustment * 100) / 100,
        pricingMethod: item.pricingMethod,
        currency: newList.currency,
        minQty: item.minQty,
        maxQty: item.maxQty,
        tiers: item.tiers?.map(t => ({ ...t, rate: Math.round(t.rate * adjustment * 100) / 100 })) || [],
        components: Object.fromEntries(
          Object.entries(item.components || {}).map(([k, v]) => [k, Math.round((parseFloat(v) || 0) * adjustment * 100) / 100])
        ),
        effectiveFrom: newList.effectiveFrom,
        effectiveTo: null,
        active: true,
        previousRate: null,
        rateHistory: [],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }))

      if (newItems.length > 0) {
        await priceItems.insertMany(newItems)
      }

      return successResponse({
        priceList: sanitizeDocument(newList),
        itemsCopied: newItems.length,
        message: 'Price list copied'
      })
    }

    // Request discount approval
    if (action === 'request_discount_approval') {
      const { quoteId, requestedDiscount, reason, customerId } = body

      if (!quoteId || requestedDiscount === undefined) {
        return errorResponse('Quote ID and requested discount are required', 400)
      }

      // Find appropriate threshold
      const threshold = DISCOUNT_THRESHOLDS.find(t => requestedDiscount <= t.maxPercent)

      const approvalRequest = {
        id: uuidv4(),
        clientId: user.clientId,
        quoteId,
        customerId: customerId || null,
        requestedDiscount: parseFloat(requestedDiscount),
        reason: reason || '',
        approvalRequired: threshold?.approvalRequired || true,
        requiredApprover: threshold?.approver || 'director',
        status: threshold?.approvalRequired ? 'pending' : 'auto_approved',
        requestedBy: user.id,
        requestedAt: now,
        approvedBy: threshold?.approvalRequired ? null : 'system',
        approvedAt: threshold?.approvalRequired ? null : now,
        createdAt: now
      }

      const approvals = db.collection('dw_discount_approvals')
      await approvals.insertOne(approvalRequest)

      return successResponse({
        approval: sanitizeDocument(approvalRequest),
        autoApproved: !threshold?.approvalRequired,
        message: threshold?.approvalRequired ? 'Discount approval requested' : 'Discount auto-approved'
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Price Lists POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to process price list request', 500, error.message)
  }
}

// PUT - Update price list
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, itemId, ...updates } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceLists = db.collection('dw_price_lists')
    const priceItems = db.collection('dw_price_items')

    const now = new Date().toISOString()

    // Update price item
    if (itemId) {
      const item = await priceItems.findOne({ id: itemId })
      if (!item) return errorResponse('Price item not found', 404)

      updates.updatedAt = now
      updates.updatedBy = user.id

      // Track rate change in history
      if (updates.rate !== undefined && updates.rate !== item.rate) {
        updates.previousRate = item.rate
        await priceItems.updateOne({ id: itemId }, {
          $push: {
            rateHistory: {
              rate: item.rate,
              changedAt: now,
              changedBy: user.id,
              newRate: updates.rate,
              reason: updates.reason || 'Manual update'
            }
          }
        })
      }

      await priceItems.updateOne({ id: itemId }, { $set: updates })
      const updated = await priceItems.findOne({ id: itemId })

      return successResponse(sanitizeDocument(updated))
    }

    // Update price list
    if (!id) return errorResponse('Price list ID required', 400)

    const priceList = await priceLists.findOne({ id })
    if (!priceList) return errorResponse('Price list not found', 404)

    // If setting as default, unset other defaults of same type
    if (updates.isDefault) {
      await priceLists.updateMany(
        { type: priceList.type, isDefault: true, id: { $ne: id } },
        { $set: { isDefault: false, updatedAt: now } }
      )
    }

    updates.updatedAt = now
    updates.updatedBy = user.id
    updates.version = (priceList.version || 1) + 1

    await priceLists.updateOne({ id }, { $set: updates })
    const updated = await priceLists.findOne({ id })

    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('DW Price Lists PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update price list', 500, error.message)
  }
}

// DELETE - Deactivate price list or remove price item
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const itemId = searchParams.get('itemId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceLists = db.collection('dw_price_lists')
    const priceItems = db.collection('dw_price_items')

    const now = new Date().toISOString()

    // Delete price item
    if (itemId) {
      const item = await priceItems.findOne({ id: itemId })
      if (!item) return errorResponse('Price item not found', 404)

      await priceItems.deleteOne({ id: itemId })
      return successResponse({ message: 'Price item deleted' })
    }

    // Deactivate price list (soft delete)
    if (!id) return errorResponse('Price list ID required', 400)

    const priceList = await priceLists.findOne({ id })
    if (!priceList) return errorResponse('Price list not found', 404)

    if (priceList.isDefault) {
      return errorResponse('Cannot delete default price list', 400)
    }

    await priceLists.updateOne({ id }, {
      $set: {
        active: false,
        deactivatedAt: now,
        deactivatedBy: user.id,
        updatedAt: now
      }
    })

    // Deactivate all items
    await priceItems.updateMany({ priceListId: id }, {
      $set: { active: false, updatedAt: now }
    })

    return successResponse({ message: 'Price list deactivated' })
  } catch (error) {
    console.error('DW Price Lists DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete price list', 500, error.message)
  }
}
