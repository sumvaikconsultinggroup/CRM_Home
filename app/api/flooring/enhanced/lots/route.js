import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Quality Grades
const QUALITY_GRADES = ['A+', 'A', 'B', 'C', 'Reject']

// GET - Fetch lots/batches
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const productId = searchParams.get('productId')
    const shipmentId = searchParams.get('shipmentId')
    const shade = searchParams.get('shade')
    const grade = searchParams.get('grade')
    const warehouseId = searchParams.get('warehouseId')
    const status = searchParams.get('status')
    const available = searchParams.get('available') // Only lots with available qty

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const lots = db.collection('flooring_lots')

    if (id) {
      const lot = await lots.findOne({ id })
      if (!lot) return errorResponse('Lot not found', 404)
      return successResponse(sanitizeDocument(lot))
    }

    const query = {}
    if (productId) query.productId = productId
    if (shipmentId) query.shipmentId = shipmentId
    if (shade) query.shade = shade
    if (grade) query.grade = grade
    if (warehouseId) query.warehouseId = warehouseId
    if (status) query.status = status
    if (available === 'true') query.status = 'available'

    const result = await lots.find(query).sort({ receivedDate: -1 }).toArray()

    // Calculate available quantities
    const lotsWithAvailable = result.map(lot => ({
      ...lot,
      availableQty: lot.sqft - (lot.reservedQty || 0) - (lot.issuedQty || 0),
      availableBoxes: lot.quantity - (lot.reservedBoxes || 0) - (lot.issuedBoxes || 0)
    }))

    // Summary by shade
    const byShade = {}
    result.forEach(lot => {
      const shade = lot.shade || 'Unspecified'
      if (!byShade[shade]) {
        byShade[shade] = { shade, lots: 0, totalSqft: 0, availableSqft: 0 }
      }
      byShade[shade].lots++
      byShade[shade].totalSqft += lot.sqft || 0
      byShade[shade].availableSqft += (lot.sqft - (lot.reservedQty || 0) - (lot.issuedQty || 0))
    })

    // Summary by grade
    const byGrade = {}
    result.forEach(lot => {
      const grade = lot.grade || 'A'
      if (!byGrade[grade]) {
        byGrade[grade] = { grade, lots: 0, totalSqft: 0 }
      }
      byGrade[grade].lots++
      byGrade[grade].totalSqft += lot.sqft || 0
    })

    // Stock aging
    const now = new Date()
    const aging = {
      under30: result.filter(l => (now - new Date(l.receivedDate)) / (1000*60*60*24) <= 30).length,
      days30to60: result.filter(l => {
        const days = (now - new Date(l.receivedDate)) / (1000*60*60*24)
        return days > 30 && days <= 60
      }).length,
      days60to90: result.filter(l => {
        const days = (now - new Date(l.receivedDate)) / (1000*60*60*24)
        return days > 60 && days <= 90
      }).length,
      days90to180: result.filter(l => {
        const days = (now - new Date(l.receivedDate)) / (1000*60*60*24)
        return days > 90 && days <= 180
      }).length,
      over180: result.filter(l => (now - new Date(l.receivedDate)) / (1000*60*60*24) > 180).length
    }

    const summary = {
      total: result.length,
      totalSqft: result.reduce((sum, l) => sum + (l.sqft || 0), 0),
      totalBoxes: result.reduce((sum, l) => sum + (l.quantity || 0), 0),
      availableLots: result.filter(l => l.status === 'available').length,
      reservedLots: result.filter(l => (l.reservedQty || 0) > 0).length,
      uniqueShades: Object.keys(byShade).length,
      avgCostPerSqft: result.length > 0 
        ? result.reduce((sum, l) => sum + (l.landedCostPerSqft || 0), 0) / result.length 
        : 0
    }

    return successResponse({ 
      lots: sanitizeDocuments(lotsWithAvailable), 
      summary,
      byShade: Object.values(byShade),
      byGrade: Object.values(byGrade),
      aging
    })
  } catch (error) {
    console.error('Lots GET Error:', error)
    return errorResponse('Failed to fetch lots', 500, error.message)
  }
}

// POST - Create lot manually (not from shipment)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const lots = db.collection('flooring_lots')
    const inventory = db.collection('flooring_inventory_v2')

    const lotId = uuidv4()
    const now = new Date().toISOString()
    const count = await lots.countDocuments() + 1
    const lotNo = body.lotNo || `LOT-${Date.now().toString(36).toUpperCase()}`

    const lot = {
      id: lotId,
      lotNo,
      shipmentId: body.shipmentId || null,
      shipmentNo: body.shipmentNo || 'MANUAL',
      productId: body.productId,
      productName: body.productName,
      sku: body.sku,
      quantity: body.boxes || 0,
      sqft: body.sqft || 0,
      reservedQty: 0,
      reservedBoxes: 0,
      issuedQty: 0,
      issuedBoxes: 0,
      
      // Quality & Specifications
      shade: body.shade || '',
      shadeCode: body.shadeCode || '',
      grade: body.grade || 'A',
      thickness: body.thickness || '',
      width: body.width || '',
      length: body.length || '',
      finish: body.finish || '',
      pattern: body.pattern || '',
      texture: body.texture || '',
      
      // Origin
      originCountry: body.originCountry || '',
      millName: body.millName || '',
      productionDate: body.productionDate || null,
      expiryDate: body.expiryDate || null,
      
      // Quality Control
      moistureContent: body.moistureContent || null,
      moistureTestDate: body.moistureTestDate || null,
      qcStatus: body.qcStatus || 'pending', // pending, passed, failed
      qcNotes: body.qcNotes || '',
      defects: body.defects || [],
      
      // Costing
      purchasePrice: body.purchasePrice || 0,
      landedCostPerSqft: body.landedCostPerSqft || 0,
      totalLandedCost: (body.sqft || 0) * (body.landedCostPerSqft || 0),
      
      // Location
      warehouseId: body.warehouseId,
      warehouseName: body.warehouseName,
      binLocation: body.binLocation || '',
      rackNo: body.rackNo || '',
      shelfNo: body.shelfNo || '',
      
      // Status
      status: 'available', // available, reserved, partial, depleted, damaged, returned
      receivedDate: body.receivedDate || now,
      
      // Barcode
      barcode: body.barcode || `${lotNo}-${body.sku?.slice(-4) || 'XXX'}`,
      qrCode: null,
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await lots.insertOne(lot)

    // Update inventory
    const existingStock = await inventory.findOne({ 
      productId: body.productId, 
      warehouseId: body.warehouseId 
    })

    if (existingStock) {
      await inventory.updateOne(
        { productId: body.productId, warehouseId: body.warehouseId },
        {
          $inc: { 
            quantity: body.sqft || 0,
            quantityBoxes: body.boxes || 0
          },
          $push: { lotIds: lotId },
          $set: { updatedAt: now }
        }
      )
    } else {
      await inventory.insertOne({
        id: uuidv4(),
        productId: body.productId,
        productName: body.productName,
        sku: body.sku,
        warehouseId: body.warehouseId,
        warehouseName: body.warehouseName,
        quantity: body.sqft || 0,
        quantityBoxes: body.boxes || 0,
        reservedQty: 0,
        reservedBoxes: 0,
        avgCost: body.landedCostPerSqft || 0,
        lotIds: [lotId],
        createdAt: now,
        updatedAt: now
      })
    }

    return successResponse(sanitizeDocument(lot), 201)
  } catch (error) {
    console.error('Lots POST Error:', error)
    return errorResponse('Failed to create lot', 500, error.message)
  }
}

// PUT - Update lot
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Lot ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const lots = db.collection('flooring_lots')
    const inventory = db.collection('flooring_inventory_v2')

    const lot = await lots.findOne({ id })
    if (!lot) return errorResponse('Lot not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'reserve':
        const reserveQty = body.reserveQty || 0
        const reserveBoxes = body.reserveBoxes || 0
        const availableQty = lot.sqft - (lot.reservedQty || 0) - (lot.issuedQty || 0)
        
        if (reserveQty > availableQty) {
          return errorResponse(`Only ${availableQty} sqft available`, 400)
        }

        await lots.updateOne({ id }, {
          $inc: { reservedQty: reserveQty, reservedBoxes: reserveBoxes },
          $set: { 
            status: (lot.reservedQty || 0) + reserveQty >= lot.sqft ? 'reserved' : 'partial',
            updatedAt: now 
          }
        })

        // Update inventory reserved
        await inventory.updateOne(
          { productId: lot.productId, warehouseId: lot.warehouseId },
          {
            $inc: { reservedQty: reserveQty, reservedBoxes: reserveBoxes },
            $set: { updatedAt: now }
          }
        )

        return successResponse({ message: 'Stock reserved', reservedQty })

      case 'release':
        const releaseQty = Math.min(body.releaseQty || 0, lot.reservedQty || 0)
        const releaseBoxes = Math.min(body.releaseBoxes || 0, lot.reservedBoxes || 0)

        await lots.updateOne({ id }, {
          $inc: { reservedQty: -releaseQty, reservedBoxes: -releaseBoxes },
          $set: { 
            status: 'available',
            updatedAt: now 
          }
        })

        await inventory.updateOne(
          { productId: lot.productId, warehouseId: lot.warehouseId },
          {
            $inc: { reservedQty: -releaseQty, reservedBoxes: -releaseBoxes },
            $set: { updatedAt: now }
          }
        )

        return successResponse({ message: 'Stock released' })

      case 'issue':
        const issueQty = body.issueQty || 0
        const issueBoxes = body.issueBoxes || 0
        const totalAvailable = lot.sqft - (lot.issuedQty || 0)

        if (issueQty > totalAvailable) {
          return errorResponse(`Only ${totalAvailable} sqft available to issue`, 400)
        }

        const newIssuedQty = (lot.issuedQty || 0) + issueQty
        const newStatus = newIssuedQty >= lot.sqft ? 'depleted' : 'partial'

        await lots.updateOne({ id }, {
          $inc: { issuedQty: issueQty, issuedBoxes: issueBoxes },
          $set: { status: newStatus, updatedAt: now }
        })

        // Reduce inventory
        await inventory.updateOne(
          { productId: lot.productId, warehouseId: lot.warehouseId },
          {
            $inc: { quantity: -issueQty, quantityBoxes: -issueBoxes },
            $set: { updatedAt: now }
          }
        )

        return successResponse({ message: 'Stock issued', issuedQty })

      case 'qc_pass':
        await lots.updateOne({ id }, {
          $set: { 
            qcStatus: 'passed',
            qcNotes: body.notes || 'QC Passed',
            qcDate: now,
            qcBy: user.id,
            moistureContent: body.moistureContent ?? lot.moistureContent,
            moistureTestDate: body.moistureContent ? now : lot.moistureTestDate,
            updatedAt: now 
          }
        })
        return successResponse({ message: 'QC passed' })

      case 'qc_fail':
        await lots.updateOne({ id }, {
          $set: { 
            qcStatus: 'failed',
            qcNotes: body.notes || 'QC Failed',
            qcDate: now,
            qcBy: user.id,
            status: 'damaged',
            defects: body.defects || [],
            updatedAt: now 
          }
        })
        return successResponse({ message: 'QC failed' })

      case 'update_location':
        await lots.updateOne({ id }, {
          $set: { 
            warehouseId: body.warehouseId ?? lot.warehouseId,
            warehouseName: body.warehouseName ?? lot.warehouseName,
            binLocation: body.binLocation ?? lot.binLocation,
            rackNo: body.rackNo ?? lot.rackNo,
            shelfNo: body.shelfNo ?? lot.shelfNo,
            updatedAt: now 
          }
        })
        return successResponse({ message: 'Location updated' })

      case 'mark_damaged':
        await lots.updateOne({ id }, {
          $set: { 
            status: 'damaged',
            defects: body.defects || [],
            updatedAt: now 
          }
        })
        return successResponse({ message: 'Marked as damaged' })

      default:
        updateData.updatedAt = now
        await lots.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Lot updated' })
    }
  } catch (error) {
    console.error('Lots PUT Error:', error)
    return errorResponse('Failed to update lot', 500, error.message)
  }
}
