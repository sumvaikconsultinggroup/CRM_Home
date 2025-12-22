import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Shipment Status Flow
const SHIPMENT_STATUS = {
  DRAFT: 'draft',
  BOOKED: 'booked',
  IN_TRANSIT: 'in_transit',
  AT_PORT: 'at_port',
  CUSTOMS_CLEARANCE: 'customs_clearance',
  CLEARED: 'cleared',
  IN_WAREHOUSE: 'in_warehouse',
  RECEIVED: 'received',
  CANCELLED: 'cancelled'
}

// GET - Fetch shipments
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const type = searchParams.get('type') // 'import', 'export'
    const supplierId = searchParams.get('supplierId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const shipments = db.collection('flooring_shipments')

    if (id) {
      const shipment = await shipments.findOne({ id })
      if (!shipment) return errorResponse('Shipment not found', 404)
      return successResponse(sanitizeDocument(shipment))
    }

    const query = {}
    if (status) query.status = status
    if (type) query.type = type
    if (supplierId) query.supplierId = supplierId

    const result = await shipments.find(query).sort({ createdAt: -1 }).toArray()

    // Summary
    const summary = {
      total: result.length,
      draft: result.filter(s => s.status === 'draft').length,
      inTransit: result.filter(s => s.status === 'in_transit').length,
      atPort: result.filter(s => s.status === 'at_port').length,
      customsClearance: result.filter(s => s.status === 'customs_clearance').length,
      received: result.filter(s => s.status === 'received').length,
      totalContainers: result.reduce((sum, s) => sum + (s.containers?.length || 0), 0),
      totalValue: result.reduce((sum, s) => sum + (s.totalValue || 0), 0),
      pendingClearance: result.filter(s => ['at_port', 'customs_clearance'].includes(s.status)).length
    }

    return successResponse({ shipments: sanitizeDocuments(result), summary })
  } catch (error) {
    console.error('Shipments GET Error:', error)
    return errorResponse('Failed to fetch shipments', 500, error.message)
  }
}

// POST - Create shipment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const shipments = db.collection('flooring_shipments')
    const suppliers = db.collection('flooring_suppliers')

    const shipmentId = uuidv4()
    const now = new Date().toISOString()
    const year = new Date().getFullYear().toString().slice(-2)
    const count = await shipments.countDocuments() + 1
    const shipmentNo = `SHP-${year}${count.toString().padStart(4, '0')}`

    // Get supplier details if provided
    let supplierDetails = {}
    if (body.supplierId) {
      const supplier = await suppliers.findOne({ id: body.supplierId })
      if (supplier) {
        supplierDetails = {
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierCountry: supplier.country,
          supplierCode: supplier.code
        }
      }
    }

    const shipment = {
      id: shipmentId,
      shipmentNo,
      type: body.type || 'import', // 'import' or 'export'
      
      // Supplier/Customer
      ...supplierDetails,
      
      // Shipment Details
      origin: {
        country: body.originCountry || '',
        port: body.originPort || '',
        address: body.originAddress || ''
      },
      destination: {
        country: body.destinationCountry || 'India',
        port: body.destinationPort || '',
        warehouse: body.destinationWarehouse || '',
        address: body.destinationAddress || ''
      },
      
      // Container Details
      containers: (body.containers || []).map((c, idx) => ({
        id: uuidv4(),
        containerNo: c.containerNo || '',
        type: c.type || '40HC', // 20FT, 40FT, 40HC
        sealNo: c.sealNo || '',
        items: c.items || [], // { productId, productName, sku, quantity, boxes, sqft, unitPrice }
        weight: c.weight || 0, // kg
        volume: c.volume || 0, // cbm
        status: 'pending'
      })),
      
      // Bill of Lading
      billOfLading: {
        blNumber: body.blNumber || '',
        blDate: body.blDate || null,
        blType: body.blType || 'original', // original, surrendered, seaway
        shipper: body.shipper || '',
        consignee: body.consignee || '',
        notifyParty: body.notifyParty || '',
        vesselName: body.vesselName || '',
        voyageNo: body.voyageNo || '',
        documentUrl: body.blDocumentUrl || null
      },
      
      // Commercial Invoice
      commercialInvoice: {
        invoiceNo: body.commercialInvoiceNo || '',
        invoiceDate: body.commercialInvoiceDate || null,
        currency: body.currency || 'USD',
        exchangeRate: body.exchangeRate || 83.5,
        incoterm: body.incoterm || 'FOB', // FOB, CIF, CFR, EXW
        fobValue: body.fobValue || 0,
        freightCharges: body.freightCharges || 0,
        insuranceCharges: body.insuranceCharges || 0,
        cifValue: body.cifValue || 0,
        documentUrl: body.ciDocumentUrl || null
      },
      
      // Letter of Credit (if applicable)
      letterOfCredit: body.paymentMethod === 'lc' ? {
        lcNumber: body.lcNumber || '',
        lcDate: body.lcDate || null,
        lcBank: body.lcBank || '',
        lcAmount: body.lcAmount || 0,
        lcCurrency: body.lcCurrency || 'USD',
        expiryDate: body.lcExpiryDate || null,
        status: 'pending', // pending, negotiated, paid
        documentUrl: body.lcDocumentUrl || null
      } : null,
      
      // Payment Details
      payment: {
        method: body.paymentMethod || 'tt', // tt, lc, da, dp
        terms: body.paymentTerms || '',
        advancePaid: body.advancePaid || 0,
        advanceDate: body.advanceDate || null,
        balanceAmount: body.balanceAmount || 0,
        balanceDueDate: body.balanceDueDate || null,
        status: 'pending' // pending, partial, paid
      },
      
      // Customs Clearance
      customs: {
        beNumber: '', // Bill of Entry
        beDate: null,
        hsCode: body.hsCode || '',
        dutyRate: body.dutyRate || 0,
        assessableValue: 0,
        basicDuty: 0,
        socialWelfareSurcharge: 0,
        igst: 0,
        totalDuty: 0,
        clearingAgent: body.clearingAgent || '',
        clearingCharges: 0,
        status: 'pending', // pending, filed, assessed, cleared
        documentUrls: []
      },
      
      // Dates
      dates: {
        bookingDate: body.bookingDate || null,
        etd: body.etd || null, // Estimated Time of Departure
        eta: body.eta || null, // Estimated Time of Arrival
        actualDeparture: null,
        actualArrival: null,
        customsClearanceDate: null,
        warehouseReceiptDate: null
      },
      
      // Costs (Landed Cost Calculation)
      costs: {
        fobValue: body.fobValue || 0,
        fobValueInr: (body.fobValue || 0) * (body.exchangeRate || 83.5),
        freight: body.freightCharges || 0,
        insurance: body.insuranceCharges || 0,
        customs: 0,
        clearing: 0,
        transportation: 0,
        handling: 0,
        other: 0,
        totalLandedCost: 0,
        costPerSqft: 0
      },
      
      // Totals
      totalBoxes: (body.containers || []).reduce((sum, c) => 
        sum + (c.items || []).reduce((s, i) => s + (i.boxes || 0), 0), 0),
      totalSqft: (body.containers || []).reduce((sum, c) => 
        sum + (c.items || []).reduce((s, i) => s + (i.sqft || 0), 0), 0),
      totalWeight: (body.containers || []).reduce((sum, c) => sum + (c.weight || 0), 0),
      totalValue: body.fobValue || 0,
      totalValueInr: (body.fobValue || 0) * (body.exchangeRate || 83.5),
      
      // Status
      status: 'draft',
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'Shipment created'
      }],
      
      // Documents
      documents: body.documents || [],
      
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await shipments.insertOne(shipment)

    return successResponse(sanitizeDocument(shipment), 201)
  } catch (error) {
    console.error('Shipments POST Error:', error)
    return errorResponse('Failed to create shipment', 500, error.message)
  }
}

// PUT - Update shipment
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Shipment ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const shipments = db.collection('flooring_shipments')
    const inventory = db.collection('flooring_inventory_v2')
    const lots = db.collection('flooring_lots')
    const landedCosts = db.collection('flooring_landed_costs')

    const shipment = await shipments.findOne({ id })
    if (!shipment) return errorResponse('Shipment not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'book':
        await shipments.updateOne({ id }, {
          $set: { 
            status: 'booked', 
            'dates.bookingDate': now,
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'booked', timestamp: now, by: user.id, notes: body.notes || 'Shipment booked' } }
        })
        return successResponse({ message: 'Shipment booked' })

      case 'depart':
        await shipments.updateOne({ id }, {
          $set: { 
            status: 'in_transit', 
            'dates.actualDeparture': body.departureDate || now,
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'in_transit', timestamp: now, by: user.id, notes: body.notes || 'Shipment departed' } }
        })
        return successResponse({ message: 'Shipment in transit' })

      case 'arrive_port':
        await shipments.updateOne({ id }, {
          $set: { 
            status: 'at_port', 
            'dates.actualArrival': body.arrivalDate || now,
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'at_port', timestamp: now, by: user.id, notes: body.notes || 'Arrived at port' } }
        })
        return successResponse({ message: 'Shipment at port' })

      case 'file_be': // File Bill of Entry
        await shipments.updateOne({ id }, {
          $set: { 
            'customs.beNumber': body.beNumber,
            'customs.beDate': body.beDate || now,
            'customs.status': 'filed',
            status: 'customs_clearance',
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'customs_clearance', timestamp: now, by: user.id, notes: `BE filed: ${body.beNumber}` } }
        })
        return successResponse({ message: 'Bill of Entry filed' })

      case 'assess_duty': // Customs duty assessment
        const assessableValue = body.assessableValue || (shipment.commercialInvoice.cifValue * shipment.commercialInvoice.exchangeRate)
        const basicDuty = assessableValue * (body.dutyRate || shipment.customs.dutyRate) / 100
        const sws = basicDuty * 0.10 // 10% Social Welfare Surcharge
        const igst = (assessableValue + basicDuty + sws) * 0.18 // 18% IGST
        const totalDuty = basicDuty + sws + igst

        await shipments.updateOne({ id }, {
          $set: { 
            'customs.assessableValue': assessableValue,
            'customs.basicDuty': basicDuty,
            'customs.socialWelfareSurcharge': sws,
            'customs.igst': igst,
            'customs.totalDuty': totalDuty,
            'customs.dutyRate': body.dutyRate || shipment.customs.dutyRate,
            'customs.status': 'assessed',
            'costs.customs': totalDuty,
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'duty_assessed', timestamp: now, by: user.id, notes: `Total duty: ₹${totalDuty.toFixed(2)}` } }
        })
        return successResponse({ message: 'Duty assessed', totalDuty })

      case 'clear_customs':
        await shipments.updateOne({ id }, {
          $set: { 
            'customs.status': 'cleared',
            'customs.clearingCharges': body.clearingCharges || 0,
            'costs.clearing': body.clearingCharges || 0,
            'dates.customsClearanceDate': now,
            status: 'cleared',
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'cleared', timestamp: now, by: user.id, notes: 'Customs cleared' } }
        })
        return successResponse({ message: 'Customs cleared' })

      case 'receive_warehouse': // Final receipt into warehouse
        // Calculate total landed cost
        const updatedShipment = await shipments.findOne({ id })
        const totalLandedCost = 
          updatedShipment.costs.fobValueInr +
          updatedShipment.costs.freight +
          updatedShipment.costs.insurance +
          updatedShipment.costs.customs +
          updatedShipment.costs.clearing +
          (body.transportationCharges || 0) +
          (body.handlingCharges || 0) +
          (body.otherCharges || 0)

        const costPerSqft = updatedShipment.totalSqft > 0 
          ? totalLandedCost / updatedShipment.totalSqft 
          : 0

        await shipments.updateOne({ id }, {
          $set: { 
            status: 'received',
            'dates.warehouseReceiptDate': now,
            'costs.transportation': body.transportationCharges || 0,
            'costs.handling': body.handlingCharges || 0,
            'costs.other': body.otherCharges || 0,
            'costs.totalLandedCost': totalLandedCost,
            'costs.costPerSqft': costPerSqft,
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'received', timestamp: now, by: user.id, notes: 'Received in warehouse' } }
        })

        // Create inventory entries and lots for each container item
        for (const container of updatedShipment.containers) {
          for (const item of container.items || []) {
            const lotId = uuidv4()
            const lotNo = `LOT-${updatedShipment.shipmentNo}-${item.sku?.slice(-4) || 'XXX'}`

            // Create lot record
            await lots.insertOne({
              id: lotId,
              lotNo,
              shipmentId: id,
              shipmentNo: updatedShipment.shipmentNo,
              containerId: container.id,
              containerNo: container.containerNo,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.boxes || 0,
              sqft: item.sqft || 0,
              shade: item.shade || '',
              grade: item.grade || 'A',
              thickness: item.thickness || '',
              width: item.width || '',
              length: item.length || '',
              finish: item.finish || '',
              originCountry: updatedShipment.origin.country,
              millName: item.millName || '',
              productionDate: item.productionDate || null,
              expiryDate: item.expiryDate || null,
              moistureContent: item.moistureContent || null,
              landedCostPerSqft: costPerSqft,
              totalLandedCost: item.sqft * costPerSqft,
              receivedDate: now,
              warehouseId: body.warehouseId,
              warehouseName: body.warehouseName,
              binLocation: item.binLocation || '',
              status: 'available',
              createdAt: now
            })

            // Update inventory
            const existingStock = await inventory.findOne({ 
              productId: item.productId, 
              warehouseId: body.warehouseId 
            })

            if (existingStock) {
              await inventory.updateOne(
                { productId: item.productId, warehouseId: body.warehouseId },
                {
                  $inc: { 
                    quantity: item.sqft || 0,
                    quantityBoxes: item.boxes || 0
                  },
                  $push: { lotIds: lotId },
                  $set: { updatedAt: now }
                }
              )
            } else {
              await inventory.insertOne({
                id: uuidv4(),
                productId: item.productId,
                productName: item.productName,
                sku: item.sku,
                warehouseId: body.warehouseId,
                warehouseName: body.warehouseName,
                quantity: item.sqft || 0,
                quantityBoxes: item.boxes || 0,
                reservedQty: 0,
                reservedBoxes: 0,
                avgCost: costPerSqft,
                lotIds: [lotId],
                createdAt: now,
                updatedAt: now
              })
            }
          }
        }

        // Create landed cost record
        await landedCosts.insertOne({
          id: uuidv4(),
          shipmentId: id,
          shipmentNo: updatedShipment.shipmentNo,
          breakdown: {
            fobValue: updatedShipment.costs.fobValue,
            fobValueInr: updatedShipment.costs.fobValueInr,
            exchangeRate: updatedShipment.commercialInvoice.exchangeRate,
            freight: updatedShipment.costs.freight,
            insurance: updatedShipment.costs.insurance,
            customsDuty: updatedShipment.costs.customs,
            clearing: updatedShipment.costs.clearing,
            transportation: body.transportationCharges || 0,
            handling: body.handlingCharges || 0,
            other: body.otherCharges || 0
          },
          totalLandedCost,
          totalSqft: updatedShipment.totalSqft,
          costPerSqft,
          createdAt: now
        })

        return successResponse({ 
          message: 'Shipment received', 
          totalLandedCost, 
          costPerSqft,
          lotsCreated: updatedShipment.containers.reduce((sum, c) => sum + (c.items?.length || 0), 0)
        })

      case 'update_costs':
        await shipments.updateOne({ id }, {
          $set: { 
            'costs.freight': body.freight ?? shipment.costs.freight,
            'costs.insurance': body.insurance ?? shipment.costs.insurance,
            'costs.transportation': body.transportation ?? shipment.costs.transportation,
            'costs.handling': body.handling ?? shipment.costs.handling,
            'costs.other': body.other ?? shipment.costs.other,
            updatedAt: now 
          }
        })
        return successResponse({ message: 'Costs updated' })

      case 'cancel':
        await shipments.updateOne({ id }, {
          $set: { status: 'cancelled', updatedAt: now },
          $push: { statusHistory: { status: 'cancelled', timestamp: now, by: user.id, notes: body.reason || 'Cancelled' } }
        })
        return successResponse({ message: 'Shipment cancelled' })

      default:
        updateData.updatedAt = now
        await shipments.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Shipment updated' })
    }
  } catch (error) {
    console.error('Shipments PUT Error:', error)
    return errorResponse('Failed to update shipment', 500, error.message)
  }
}

// DELETE - Remove shipment
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Shipment ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const shipments = db.collection('flooring_shipments')

    const shipment = await shipments.findOne({ id })
    if (!shipment) return errorResponse('Shipment not found', 404)

    if (shipment.status === 'received') {
      return errorResponse('Cannot delete received shipment', 400)
    }

    await shipments.deleteOne({ id })

    return successResponse({ message: 'Shipment deleted' })
  } catch (error) {
    console.error('Shipments DELETE Error:', error)
    return errorResponse('Failed to delete shipment', 500, error.message)
  }
}
