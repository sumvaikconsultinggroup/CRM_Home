import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch showroom displays and samples
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const showroomId = searchParams.get('showroomId')
    const productId = searchParams.get('productId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const displays = db.collection('furniture_showroom_displays')
    const showrooms = db.collection('furniture_showrooms')

    // Get showroom if requested
    if (searchParams.get('type') === 'showrooms') {
      const showroomList = await showrooms.find({ isActive: true }).toArray()
      return successResponse({ showrooms: sanitizeDocuments(showroomList) })
    }

    if (id) {
      const display = await displays.findOne({ id })
      if (!display) return errorResponse('Display not found', 404)
      return successResponse(sanitizeDocument(display))
    }

    const query = { isActive: true }
    if (showroomId) query.showroomId = showroomId
    if (productId) query.productId = productId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { displayCode: { $regex: search, $options: 'i' } }
      ]
    }

    const items = await displays.find(query).sort({ displayCode: 1 }).toArray()

    // Group by showroom
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.showroomId]) acc[item.showroomId] = []
      acc[item.showroomId].push(item)
      return acc
    }, {})

    // Get summary
    const summary = await displays.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$displayValue' }
      }}
    ]).toArray()

    return successResponse({
      displays: sanitizeDocuments(items),
      grouped,
      summary: summary.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, totalValue: s.totalValue } }), {})
    })
  } catch (error) {
    console.error('Furniture Showroom GET Error:', error)
    return errorResponse('Failed to fetch displays', 500, error.message)
  }
}

// POST - Create showroom display or showroom
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { type } = body // 'showroom' or 'display'
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date().toISOString()

    // Create showroom location
    if (type === 'showroom') {
      const showrooms = db.collection('furniture_showrooms')
      const showroomId = uuidv4()

      const showroom = {
        id: showroomId,
        code: body.code || `SHR-${Date.now().toString(36).toUpperCase()}`,
        name: body.name,
        address: body.address || {},
        area: body.area || 0, // sqft
        contactPerson: body.contactPerson || '',
        phone: body.phone || '',
        email: body.email || '',
        timings: body.timings || 'Mon-Sat: 10:00 AM - 8:00 PM',
        amenities: body.amenities || [],
        images: body.images || [],
        isActive: body.isActive !== false,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await showrooms.insertOne(showroom)
      return successResponse(sanitizeDocument(showroom), 201)
    }

    // Create display item
    const displays = db.collection('furniture_showroom_displays')
    const displayId = uuidv4()

    // Get product info
    let productInfo = {}
    if (body.productId) {
      const product = await db.collection('furniture_products').findOne({ id: body.productId })
      if (product) {
        productInfo = {
          productName: product.name,
          productSku: product.sku,
          productCategory: product.category,
          basePrice: product.basePrice
        }
      }
    }

    const display = {
      id: displayId,
      displayCode: body.displayCode || `DSP-${Date.now().toString(36).toUpperCase()}`,
      // Product
      productId: body.productId,
      ...productInfo,
      // Display details
      displayType: body.displayType || 'floor', // floor, wall, vignette, sample
      location: body.location || '', // Within showroom
      section: body.section || '',
      // Display config
      configuration: body.configuration || '',
      finish: body.finish || '',
      fabric: body.fabric || '',
      customizations: body.customizations || [],
      // Pricing
      displayValue: body.displayValue || productInfo.basePrice || 0,
      salePrice: body.salePrice || null,
      isForSale: body.isForSale || false,
      discountPercent: body.discountPercent || 0,
      // Status
      status: body.status || 'available', // available, reserved, sold, maintenance, retired
      condition: body.condition || 'excellent', // excellent, good, fair, needs_repair
      // Showroom
      showroomId: body.showroomId,
      // Photos
      photos: body.photos || [],
      // QR code for customer scans
      qrCode: body.qrCode || null,
      // Dates
      displayedSince: body.displayedSince || now,
      lastInspection: body.lastInspection || null,
      // Notes
      notes: body.notes || '',
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await displays.insertOne(display)
    return successResponse(sanitizeDocument(display), 201)
  } catch (error) {
    console.error('Furniture Showroom POST Error:', error)
    return errorResponse('Failed to create display', 500, error.message)
  }
}

// PUT - Update showroom or display
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, type, action, ...updateData } = body

    if (!id) return errorResponse('ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date().toISOString()

    // Update showroom
    if (type === 'showroom') {
      const showrooms = db.collection('furniture_showrooms')
      
      updateData.updatedAt = now
      updateData.updatedBy = user.id

      const result = await showrooms.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Showroom not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Update display
    const displays = db.collection('furniture_showroom_displays')
    const display = await displays.findOne({ id })
    if (!display) return errorResponse('Display not found', 404)

    // Handle specific actions
    if (action === 'mark_sold') {
      await displays.updateOne(
        { id },
        {
          $set: { 
            status: 'sold', 
            soldAt: now,
            soldBy: user.id,
            soldPrice: body.soldPrice || display.salePrice || display.displayValue,
            updatedAt: now 
          }
        }
      )
      return successResponse({ message: 'Display marked as sold', status: 'sold' })
    }

    if (action === 'reserve') {
      await displays.updateOne(
        { id },
        {
          $set: { 
            status: 'reserved', 
            reservedAt: now,
            reservedBy: body.reservedFor || body.customerName,
            reservationExpiry: body.reservationExpiry || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: now 
          }
        }
      )
      return successResponse({ message: 'Display reserved', status: 'reserved' })
    }

    if (action === 'maintenance') {
      await displays.updateOne(
        { id },
        {
          $set: { 
            status: 'maintenance', 
            maintenanceNotes: body.maintenanceNotes || '',
            updatedAt: now 
          }
        }
      )
      return successResponse({ message: 'Marked for maintenance', status: 'maintenance' })
    }

    if (action === 'retire') {
      await displays.updateOne(
        { id },
        { $set: { status: 'retired', retiredAt: now, updatedAt: now } }
      )
      return successResponse({ message: 'Display retired', status: 'retired' })
    }

    // Regular update
    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await displays.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture Showroom PUT Error:', error)
    return errorResponse('Failed to update', 500, error.message)
  }
}

// DELETE - Delete showroom or display
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id) return errorResponse('ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const collection = type === 'showroom' ? 'furniture_showrooms' : 'furniture_showroom_displays'

    await db.collection(collection).updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Furniture Showroom DELETE Error:', error)
    return errorResponse('Failed to delete', 500, error.message)
  }
}
