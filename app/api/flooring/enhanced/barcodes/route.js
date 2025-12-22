import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Barcode Types for Flooring
const BARCODE_TYPES = {
  product: { prefix: 'PRD', label: 'Product' },
  lot: { prefix: 'LOT', label: 'Lot/Batch' },
  box: { prefix: 'BOX', label: 'Box/Carton' },
  pallet: { prefix: 'PLT', label: 'Pallet' },
  location: { prefix: 'LOC', label: 'Bin Location' },
  shipment: { prefix: 'SHP', label: 'Shipment' }
}

// Generate barcode number
const generateBarcodeNumber = (type, sequence) => {
  const config = BARCODE_TYPES[type] || BARCODE_TYPES.product
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4)
  const seq = sequence.toString().padStart(6, '0')
  return `${config.prefix}${timestamp}${seq}`
}

// GET - Fetch barcodes
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // product, lot, box, pallet, location, shipment
    const entityId = searchParams.get('entityId') // ID of the linked entity
    const barcode = searchParams.get('barcode') // Search by barcode number
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const barcodes = db.collection('flooring_barcodes')

    if (id) {
      const record = await barcodes.findOne({ id })
      if (!record) return errorResponse('Barcode not found', 404)
      return successResponse(sanitizeDocument(record))
    }

    // Lookup by barcode number
    if (barcode) {
      const record = await barcodes.findOne({ barcode: barcode.toUpperCase() })
      if (!record) return errorResponse('Barcode not found', 404)
      
      // Fetch linked entity details
      let entityDetails = null
      if (record.entityType && record.entityId) {
        const collectionMap = {
          product: 'flooring_products',
          lot: 'flooring_lots',
          location: 'flooring_bin_locations',
          shipment: 'flooring_shipments'
        }
        const collectionName = collectionMap[record.entityType]
        if (collectionName) {
          const collection = db.collection(collectionName)
          entityDetails = await collection.findOne({ id: record.entityId })
        }
      }
      
      return successResponse({
        ...sanitizeDocument(record),
        entityDetails: entityDetails ? sanitizeDocument(entityDetails) : null
      })
    }

    const query = {}
    if (type) query.entityType = type
    if (entityId) query.entityId = entityId
    if (status) query.status = status

    const result = await barcodes.find(query).sort({ createdAt: -1 }).toArray()

    const summary = {
      total: result.length,
      byType: {
        product: result.filter(b => b.entityType === 'product').length,
        lot: result.filter(b => b.entityType === 'lot').length,
        box: result.filter(b => b.entityType === 'box').length,
        pallet: result.filter(b => b.entityType === 'pallet').length,
        location: result.filter(b => b.entityType === 'location').length,
        shipment: result.filter(b => b.entityType === 'shipment').length
      },
      active: result.filter(b => b.status === 'active').length,
      printed: result.filter(b => b.printCount > 0).length
    }

    return successResponse({ barcodes: sanitizeDocuments(result), summary, types: BARCODE_TYPES })
  } catch (error) {
    console.error('Barcodes GET Error:', error)
    return errorResponse('Failed to fetch barcodes', 500, error.message)
  }
}

// POST - Create barcode(s)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const barcodes = db.collection('flooring_barcodes')

    const now = new Date().toISOString()

    // Get next sequence
    const lastBarcode = await barcodes.find().sort({ sequence: -1 }).limit(1).toArray()
    let sequence = (lastBarcode[0]?.sequence || 0) + 1

    // Bulk create for lots/boxes
    if (body.bulkCreate) {
      const { entityType, entityIds, labelTemplate } = body
      const created = []

      for (const entityId of entityIds) {
        const barcodeNumber = generateBarcodeNumber(entityType, sequence)
        const barcodeRecord = {
          id: uuidv4(),
          barcode: barcodeNumber,
          sequence,
          entityType,
          entityId,
          entityName: body.entityNames?.[entityId] || '',
          entitySku: body.entitySkus?.[entityId] || '',
          
          // QR Code data (JSON encoded)
          qrData: JSON.stringify({
            type: entityType,
            id: entityId,
            barcode: barcodeNumber,
            ts: now
          }),
          
          // Label configuration
          labelTemplate: labelTemplate || 'standard',
          labelSize: body.labelSize || '2x1', // inches
          
          // Status
          status: 'active',
          printCount: 0,
          lastPrintedAt: null,
          
          // Metadata
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }
        
        await barcodes.insertOne(barcodeRecord)
        created.push(barcodeRecord)
        sequence++
      }

      return successResponse({ 
        message: `${created.length} barcodes created`, 
        barcodes: sanitizeDocuments(created) 
      }, 201)
    }

    // Single barcode create
    const barcodeNumber = body.barcode || generateBarcodeNumber(body.entityType || 'product', sequence)
    
    // Check for duplicate
    const existing = await barcodes.findOne({ barcode: barcodeNumber })
    if (existing) return errorResponse('Barcode already exists', 400)

    const barcodeRecord = {
      id: uuidv4(),
      barcode: barcodeNumber,
      sequence,
      entityType: body.entityType || 'product',
      entityId: body.entityId || null,
      entityName: body.entityName || '',
      entitySku: body.entitySku || '',
      
      // Additional data
      shade: body.shade || '',
      grade: body.grade || '',
      lotNo: body.lotNo || '',
      boxNo: body.boxNo || '',
      
      // QR Code data
      qrData: JSON.stringify({
        type: body.entityType || 'product',
        id: body.entityId,
        barcode: barcodeNumber,
        sku: body.entitySku,
        shade: body.shade,
        grade: body.grade,
        ts: now
      }),
      
      // Label configuration
      labelTemplate: body.labelTemplate || 'standard',
      labelSize: body.labelSize || '2x1',
      customFields: body.customFields || {},
      
      // Status
      status: 'active',
      printCount: 0,
      lastPrintedAt: null,
      
      // Metadata
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await barcodes.insertOne(barcodeRecord)

    return successResponse(sanitizeDocument(barcodeRecord), 201)
  } catch (error) {
    console.error('Barcodes POST Error:', error)
    return errorResponse('Failed to create barcode', 500, error.message)
  }
}

// PUT - Update barcode or record print
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id && !body.barcodeIds) return errorResponse('Barcode ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const barcodes = db.collection('flooring_barcodes')

    const now = new Date().toISOString()

    switch (action) {
      case 'record_print':
        // Record that barcode(s) were printed
        const ids = body.barcodeIds || [id]
        await barcodes.updateMany(
          { id: { $in: ids } },
          { 
            $inc: { printCount: 1 },
            $set: { lastPrintedAt: now, updatedAt: now }
          }
        )
        return successResponse({ message: `${ids.length} barcode(s) print recorded` })

      case 'deactivate':
        await barcodes.updateOne({ id }, { $set: { status: 'inactive', updatedAt: now } })
        return successResponse({ message: 'Barcode deactivated' })

      case 'activate':
        await barcodes.updateOne({ id }, { $set: { status: 'active', updatedAt: now } })
        return successResponse({ message: 'Barcode activated' })

      case 'link_entity':
        // Link barcode to an entity
        await barcodes.updateOne({ id }, {
          $set: {
            entityType: body.entityType,
            entityId: body.entityId,
            entityName: body.entityName || '',
            entitySku: body.entitySku || '',
            qrData: JSON.stringify({
              type: body.entityType,
              id: body.entityId,
              barcode: body.currentBarcode,
              sku: body.entitySku,
              ts: now
            }),
            updatedAt: now
          }
        })
        return successResponse({ message: 'Barcode linked to entity' })

      case 'generate_labels':
        // Generate label data for printing
        const labelBarcodes = await barcodes.find({ id: { $in: body.barcodeIds || [id] } }).toArray()
        
        const labels = labelBarcodes.map(bc => ({
          barcode: bc.barcode,
          qrData: bc.qrData,
          entityType: bc.entityType,
          entityName: bc.entityName,
          entitySku: bc.entitySku,
          shade: bc.shade,
          grade: bc.grade,
          lotNo: bc.lotNo,
          boxNo: bc.boxNo,
          template: bc.labelTemplate,
          size: bc.labelSize
        }))

        return successResponse({ labels })

      default:
        updateData.updatedAt = now
        await barcodes.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Barcode updated' })
    }
  } catch (error) {
    console.error('Barcodes PUT Error:', error)
    return errorResponse('Failed to update barcode', 500, error.message)
  }
}

// DELETE - Delete barcode
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Barcode ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const barcodes = db.collection('flooring_barcodes')

    const barcode = await barcodes.findOne({ id })
    if (!barcode) return errorResponse('Barcode not found', 404)

    await barcodes.deleteOne({ id })

    return successResponse({ message: 'Barcode deleted' })
  } catch (error) {
    console.error('Barcodes DELETE Error:', error)
    return errorResponse('Failed to delete barcode', 500, error.message)
  }
}
