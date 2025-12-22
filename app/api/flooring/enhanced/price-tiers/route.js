import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch price tiers
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const productId = searchParams.get('productId')
    const customerId = searchParams.get('customerId')
    const tierCode = searchParams.get('tierCode')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceTiers = db.collection('flooring_price_tiers')
    const productPrices = db.collection('flooring_product_prices')

    if (id) {
      const tier = await priceTiers.findOne({ id })
      if (!tier) return errorResponse('Price tier not found', 404)
      return successResponse(sanitizeDocument(tier))
    }

    // Fetch tiers
    const query = {}
    if (tierCode) query.code = tierCode
    const tiers = await priceTiers.find(query).sort({ priority: 1 }).toArray()

    // If productId and customerId provided, calculate best price
    if (productId && customerId) {
      const prices = await productPrices.find({ productId }).toArray()
      const customers = db.collection('flooring_customers')
      const customer = await customers.findOne({ id: customerId })
      
      const customerTier = customer?.priceTier || 'retail'
      const applicablePrices = prices.filter(p => p.tierCode === customerTier)
      
      return successResponse({
        tiers: sanitizeDocuments(tiers),
        applicablePrices: sanitizeDocuments(applicablePrices),
        customerTier
      })
    }

    // Fetch all product prices
    const allPrices = await productPrices.find({}).toArray()

    const summary = {
      totalTiers: tiers.length,
      activeTiers: tiers.filter(t => t.status === 'active').length,
      productsWithPricing: [...new Set(allPrices.map(p => p.productId))].length
    }

    return successResponse({ 
      tiers: sanitizeDocuments(tiers), 
      prices: sanitizeDocuments(allPrices),
      summary 
    })
  } catch (error) {
    console.error('PriceTiers GET Error:', error)
    return errorResponse('Failed to fetch price tiers', 500, error.message)
  }
}

// POST - Create price tier
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceTiers = db.collection('flooring_price_tiers')

    const tierId = uuidv4()
    const now = new Date().toISOString()

    // Check for duplicate code
    const existing = await priceTiers.findOne({ code: body.code })
    if (existing) {
      return errorResponse('Price tier code already exists', 400)
    }

    const tier = {
      id: tierId,
      code: body.code, // e.g., 'retail', 'dealer', 'distributor', 'project'
      name: body.name,
      description: body.description || '',
      
      // Discount structure
      discountType: body.discountType || 'percentage', // 'percentage', 'fixed', 'margin'
      discountValue: body.discountValue || 0,
      
      // Minimum requirements
      minimumOrderValue: body.minimumOrderValue || 0,
      minimumOrderQty: body.minimumOrderQty || 0,
      
      // Credit terms
      creditDays: body.creditDays || 0,
      creditLimit: body.creditLimit || 0,
      
      // Priority (lower = higher priority)
      priority: body.priority || 100,
      
      // Applicable to
      applicableCategories: body.applicableCategories || [], // Empty = all
      applicableProducts: body.applicableProducts || [], // Empty = all
      
      // Validity
      validFrom: body.validFrom || now,
      validTill: body.validTill || null,
      
      // Status
      status: 'active',
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await priceTiers.insertOne(tier)

    return successResponse(sanitizeDocument(tier), 201)
  } catch (error) {
    console.error('PriceTiers POST Error:', error)
    return errorResponse('Failed to create price tier', 500, error.message)
  }
}

// PUT - Update price tier or set product prices
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceTiers = db.collection('flooring_price_tiers')
    const productPrices = db.collection('flooring_product_prices')

    const now = new Date().toISOString()

    switch (action) {
      case 'set_product_price':
        // Set or update product price for a tier
        const { productId, tierCode, price, minQty, maxQty } = body
        
        const existingPrice = await productPrices.findOne({ productId, tierCode })
        
        if (existingPrice) {
          await productPrices.updateOne(
            { productId, tierCode },
            {
              $set: {
                price: price,
                minQty: minQty || 0,
                maxQty: maxQty || null,
                updatedAt: now,
                updatedBy: user.id
              }
            }
          )
        } else {
          await productPrices.insertOne({
            id: uuidv4(),
            productId,
            productName: body.productName,
            sku: body.sku,
            tierCode,
            price,
            minQty: minQty || 0,
            maxQty: maxQty || null,
            createdAt: now,
            createdBy: user.id,
            updatedAt: now
          })
        }
        return successResponse({ message: 'Product price set' })

      case 'bulk_set_prices':
        // Set prices for multiple products at once
        const { prices } = body // Array of { productId, tierCode, price }
        
        for (const p of prices) {
          await productPrices.updateOne(
            { productId: p.productId, tierCode: p.tierCode },
            {
              $set: {
                price: p.price,
                productName: p.productName,
                sku: p.sku,
                minQty: p.minQty || 0,
                updatedAt: now,
                updatedBy: user.id
              },
              $setOnInsert: {
                id: uuidv4(),
                createdAt: now,
                createdBy: user.id
              }
            },
            { upsert: true }
          )
        }
        return successResponse({ message: `${prices.length} prices updated` })

      case 'calculate_price':
        // Calculate price for a customer
        const { customerId, productIds } = body
        const customers = db.collection('flooring_customers')
        const products = db.collection('flooring_products')
        
        const customer = await customers.findOne({ id: customerId })
        const customerTier = customer?.priceTier || 'retail'
        
        const tier = await priceTiers.findOne({ code: customerTier })
        const productList = await products.find({ id: { $in: productIds } }).toArray()
        
        const calculatedPrices = []
        for (const product of productList) {
          const customPrice = await productPrices.findOne({ productId: product.id, tierCode: customerTier })
          
          let finalPrice = product.sellingPrice || 0
          
          if (customPrice) {
            finalPrice = customPrice.price
          } else if (tier) {
            if (tier.discountType === 'percentage') {
              finalPrice = product.sellingPrice * (1 - tier.discountValue / 100)
            } else if (tier.discountType === 'fixed') {
              finalPrice = product.sellingPrice - tier.discountValue
            }
          }
          
          calculatedPrices.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            mrp: product.mrp || product.sellingPrice,
            basePrice: product.sellingPrice,
            tierCode: customerTier,
            finalPrice: Math.max(0, finalPrice),
            discount: product.sellingPrice - finalPrice,
            discountPercent: product.sellingPrice > 0 
              ? ((product.sellingPrice - finalPrice) / product.sellingPrice * 100).toFixed(2)
              : 0
          })
        }
        
        return successResponse({ prices: calculatedPrices, tier: customerTier })

      case 'deactivate':
        await priceTiers.updateOne({ id }, {
          $set: { status: 'inactive', updatedAt: now }
        })
        return successResponse({ message: 'Tier deactivated' })

      case 'activate':
        await priceTiers.updateOne({ id }, {
          $set: { status: 'active', updatedAt: now }
        })
        return successResponse({ message: 'Tier activated' })

      default:
        if (!id) return errorResponse('Tier ID required', 400)
        updateData.updatedAt = now
        await priceTiers.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Tier updated' })
    }
  } catch (error) {
    console.error('PriceTiers PUT Error:', error)
    return errorResponse('Failed to update price tier', 500, error.message)
  }
}

// DELETE - Remove price tier
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Tier ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const priceTiers = db.collection('flooring_price_tiers')
    const productPrices = db.collection('flooring_product_prices')

    const tier = await priceTiers.findOne({ id })
    if (!tier) return errorResponse('Tier not found', 404)

    // Check if any products have prices for this tier
    const pricesCount = await productPrices.countDocuments({ tierCode: tier.code })
    if (pricesCount > 0) {
      return errorResponse(`Cannot delete tier with ${pricesCount} product prices. Remove prices first.`, 400)
    }

    await priceTiers.deleteOne({ id })

    return successResponse({ message: 'Tier deleted' })
  } catch (error) {
    console.error('PriceTiers DELETE Error:', error)
    return errorResponse('Failed to delete tier', 500, error.message)
  }
}
