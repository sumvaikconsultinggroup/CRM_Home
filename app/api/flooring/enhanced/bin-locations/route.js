import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch bin locations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const warehouseId = searchParams.get('warehouseId')
    const zone = searchParams.get('zone')
    const rack = searchParams.get('rack')
    const available = searchParams.get('available') === 'true'
    const hierarchy = searchParams.get('hierarchy') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const binLocations = db.collection('flooring_bin_locations')
    const lots = db.collection('flooring_lots')

    if (id) {
      const bin = await binLocations.findOne({ id })
      if (!bin) return errorResponse('Bin location not found', 404)
      
      // Get lots in this bin
      const lotsInBin = await lots.find({ binLocation: bin.code }).toArray()
      return successResponse({
        ...sanitizeDocument(bin),
        lots: sanitizeDocuments(lotsInBin),
        occupancy: lotsInBin.reduce((sum, l) => sum + (l.sqft || 0), 0)
      })
    }

    const query = {}
    if (warehouseId) query.warehouseId = warehouseId
    if (zone) query.zone = zone
    if (rack) query.rack = rack
    if (available) query.status = 'available'

    const result = await binLocations.find(query).sort({ code: 1 }).toArray()

    // Calculate occupancy for each bin
    const binsWithOccupancy = await Promise.all(result.map(async bin => {
      const lotsInBin = await lots.find({ binLocation: bin.code }).toArray()
      const occupancy = lotsInBin.reduce((sum, l) => sum + (l.sqft || 0), 0)
      return {
        ...bin,
        currentOccupancy: occupancy,
        occupancyPercent: bin.capacity > 0 ? Math.round((occupancy / bin.capacity) * 100) : 0,
        lotCount: lotsInBin.length
      }
    }))

    // Build hierarchy if requested
    if (hierarchy) {
      const warehouses = {}
      binsWithOccupancy.forEach(bin => {
        const wh = bin.warehouseId || 'default'
        const zone = bin.zone || 'A'
        const rack = bin.rack || '1'
        
        if (!warehouses[wh]) warehouses[wh] = { name: bin.warehouseName || wh, zones: {} }
        if (!warehouses[wh].zones[zone]) warehouses[wh].zones[zone] = { name: zone, racks: {} }
        if (!warehouses[wh].zones[zone].racks[rack]) warehouses[wh].zones[zone].racks[rack] = { name: rack, bins: [] }
        
        warehouses[wh].zones[zone].racks[rack].bins.push(bin)
      })
      
      return successResponse({ hierarchy: warehouses, total: binsWithOccupancy.length })
    }

    const summary = {
      total: binsWithOccupancy.length,
      available: binsWithOccupancy.filter(b => b.status === 'available').length,
      occupied: binsWithOccupancy.filter(b => b.lotCount > 0).length,
      empty: binsWithOccupancy.filter(b => b.lotCount === 0).length,
      totalCapacity: binsWithOccupancy.reduce((sum, b) => sum + (b.capacity || 0), 0),
      totalOccupied: binsWithOccupancy.reduce((sum, b) => sum + (b.currentOccupancy || 0), 0),
      avgOccupancy: binsWithOccupancy.length > 0
        ? Math.round(binsWithOccupancy.reduce((sum, b) => sum + (b.occupancyPercent || 0), 0) / binsWithOccupancy.length)
        : 0
    }

    return successResponse({ bins: sanitizeDocuments(binsWithOccupancy), summary })
  } catch (error) {
    console.error('BinLocations GET Error:', error)
    return errorResponse('Failed to fetch bin locations', 500, error.message)
  }
}

// POST - Create bin location(s)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const binLocations = db.collection('flooring_bin_locations')

    const now = new Date().toISOString()

    // Bulk create if zones/racks/shelves provided
    if (body.bulkCreate) {
      const bins = []
      const zones = body.zones || ['A']
      const racksPerZone = body.racksPerZone || 5
      const shelvesPerRack = body.shelvesPerRack || 4
      const binsPerShelf = body.binsPerShelf || 3

      for (const zone of zones) {
        for (let rack = 1; rack <= racksPerZone; rack++) {
          for (let shelf = 1; shelf <= shelvesPerRack; shelf++) {
            for (let bin = 1; bin <= binsPerShelf; bin++) {
              const code = `${zone}-${rack.toString().padStart(2, '0')}-${shelf}-${bin}`
              bins.push({
                id: uuidv4(),
                code,
                warehouseId: body.warehouseId,
                warehouseName: body.warehouseName,
                zone,
                rack: rack.toString().padStart(2, '0'),
                shelf: shelf.toString(),
                bin: bin.toString(),
                type: body.type || 'pallet', // pallet, shelf, floor, bulk
                capacity: body.capacityPerBin || 500, // sqft
                dimensions: body.dimensions || { length: 120, width: 100, height: 150 }, // cm
                maxWeight: body.maxWeight || 1000, // kg
                status: 'available',
                allowedProducts: body.allowedProducts || [], // empty = all
                notes: '',
                createdBy: user.id,
                createdAt: now,
                updatedAt: now
              })
            }
          }
        }
      }

      await binLocations.insertMany(bins)
      return successResponse({ message: `${bins.length} bin locations created`, count: bins.length }, 201)
    }

    // Single bin create
    const binId = uuidv4()
    const bin = {
      id: binId,
      code: body.code || `${body.zone || 'A'}-${body.rack || '01'}-${body.shelf || '1'}-${body.bin || '1'}`,
      warehouseId: body.warehouseId,
      warehouseName: body.warehouseName,
      zone: body.zone || 'A',
      rack: body.rack || '01',
      shelf: body.shelf || '1',
      bin: body.bin || '1',
      type: body.type || 'pallet',
      capacity: body.capacity || 500,
      dimensions: body.dimensions || { length: 120, width: 100, height: 150 },
      maxWeight: body.maxWeight || 1000,
      status: 'available',
      allowedProducts: body.allowedProducts || [],
      notes: body.notes || '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await binLocations.insertOne(bin)

    return successResponse(sanitizeDocument(bin), 201)
  } catch (error) {
    console.error('BinLocations POST Error:', error)
    return errorResponse('Failed to create bin location', 500, error.message)
  }
}

// PUT - Update bin location or assign lot
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id && action !== 'assign_lot') return errorResponse('Bin location ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const binLocations = db.collection('flooring_bin_locations')
    const lots = db.collection('flooring_lots')

    const now = new Date().toISOString()

    switch (action) {
      case 'assign_lot':
        // Assign a lot to a bin location
        const { lotId, binCode } = body
        if (!lotId || !binCode) return errorResponse('Lot ID and bin code required', 400)

        const lot = await lots.findOne({ id: lotId })
        if (!lot) return errorResponse('Lot not found', 404)

        const bin = await binLocations.findOne({ code: binCode })
        if (!bin) return errorResponse('Bin location not found', 404)

        // Check capacity
        const currentLots = await lots.find({ binLocation: binCode }).toArray()
        const currentOccupancy = currentLots.reduce((sum, l) => sum + (l.sqft || 0), 0)
        
        if (currentOccupancy + (lot.sqft || 0) > bin.capacity) {
          return errorResponse(`Bin capacity exceeded. Available: ${bin.capacity - currentOccupancy} sqft`, 400)
        }

        await lots.updateOne({ id: lotId }, {
          $set: {
            binLocation: binCode,
            warehouseId: bin.warehouseId,
            warehouseName: bin.warehouseName,
            rackNo: bin.rack,
            shelfNo: bin.shelf,
            updatedAt: now
          }
        })

        return successResponse({ message: 'Lot assigned to bin', binCode })

      case 'move_lot':
        // Move lot from one bin to another
        const { lotIdToMove, fromBin, toBin } = body
        if (!lotIdToMove || !toBin) return errorResponse('Lot ID and destination bin required', 400)

        const lotToMove = await lots.findOne({ id: lotIdToMove })
        if (!lotToMove) return errorResponse('Lot not found', 404)

        const destBin = await binLocations.findOne({ code: toBin })
        if (!destBin) return errorResponse('Destination bin not found', 404)

        // Check destination capacity
        const destLots = await lots.find({ binLocation: toBin }).toArray()
        const destOccupancy = destLots.reduce((sum, l) => sum + (l.sqft || 0), 0)
        
        if (destOccupancy + (lotToMove.sqft || 0) > destBin.capacity) {
          return errorResponse(`Destination bin capacity exceeded`, 400)
        }

        await lots.updateOne({ id: lotIdToMove }, {
          $set: {
            binLocation: toBin,
            warehouseId: destBin.warehouseId,
            warehouseName: destBin.warehouseName,
            rackNo: destBin.rack,
            shelfNo: destBin.shelf,
            updatedAt: now
          },
          $push: {
            movementHistory: {
              from: fromBin || lotToMove.binLocation,
              to: toBin,
              movedAt: now,
              movedBy: user.id
            }
          }
        })

        return successResponse({ message: 'Lot moved', fromBin: fromBin || lotToMove.binLocation, toBin })

      case 'block':
        await binLocations.updateOne({ id }, {
          $set: { status: 'blocked', blockedReason: body.reason, blockedAt: now, blockedBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Bin blocked' })

      case 'unblock':
        await binLocations.updateOne({ id }, {
          $set: { status: 'available', blockedReason: null, blockedAt: null, blockedBy: null, updatedAt: now }
        })
        return successResponse({ message: 'Bin unblocked' })

      case 'suggest_location':
        // Suggest best bin location for a lot
        const { productId, sqftRequired } = body
        
        // Get all available bins with capacity
        const availableBins = await binLocations.find({ status: 'available' }).toArray()
        
        // Calculate occupancy and find best fit
        const binsWithSpace = []
        for (const b of availableBins) {
          const lotsInBin = await lots.find({ binLocation: b.code }).toArray()
          const occupancy = lotsInBin.reduce((sum, l) => sum + (l.sqft || 0), 0)
          const available = b.capacity - occupancy
          
          if (available >= sqftRequired) {
            // Check if same product already exists in this bin (for consolidation)
            const sameProduct = lotsInBin.find(l => l.productId === productId)
            binsWithSpace.push({
              ...b,
              availableSpace: available,
              hasSameProduct: !!sameProduct,
              score: sameProduct ? 100 : (available >= sqftRequired * 2 ? 50 : 30) // Prefer bins with same product
            })
          }
        }

        // Sort by score (highest first)
        binsWithSpace.sort((a, b) => b.score - a.score)

        return successResponse({ 
          suggestions: binsWithSpace.slice(0, 5).map(b => ({
            binCode: b.code,
            zone: b.zone,
            rack: b.rack,
            availableSpace: b.availableSpace,
            hasSameProduct: b.hasSameProduct,
            recommended: b === binsWithSpace[0]
          }))
        })

      default:
        updateData.updatedAt = now
        await binLocations.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Bin location updated' })
    }
  } catch (error) {
    console.error('BinLocations PUT Error:', error)
    return errorResponse('Failed to update bin location', 500, error.message)
  }
}

// DELETE - Remove bin location
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Bin location ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const binLocations = db.collection('flooring_bin_locations')
    const lots = db.collection('flooring_lots')

    const bin = await binLocations.findOne({ id })
    if (!bin) return errorResponse('Bin location not found', 404)

    // Check if bin has lots
    const lotsInBin = await lots.countDocuments({ binLocation: bin.code })
    if (lotsInBin > 0) {
      return errorResponse(`Cannot delete bin with ${lotsInBin} lots. Move lots first.`, 400)
    }

    await binLocations.deleteOne({ id })

    return successResponse({ message: 'Bin location deleted' })
  } catch (error) {
    console.error('BinLocations DELETE Error:', error)
    return errorResponse('Failed to delete bin location', 500, error.message)
  }
}
