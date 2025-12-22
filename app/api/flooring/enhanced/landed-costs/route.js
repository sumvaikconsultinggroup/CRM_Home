import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch landed cost records and analysis
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const shipmentId = searchParams.get('shipmentId')
    const productId = searchParams.get('productId')
    const analysis = searchParams.get('analysis') // 'true' for cost analysis report

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const landedCosts = db.collection('flooring_landed_costs')
    const shipments = db.collection('flooring_shipments')
    const lots = db.collection('flooring_lots')

    if (id) {
      const cost = await landedCosts.findOne({ id })
      if (!cost) return errorResponse('Landed cost record not found', 404)
      return successResponse(sanitizeDocument(cost))
    }

    if (shipmentId) {
      const cost = await landedCosts.findOne({ shipmentId })
      return successResponse(sanitizeDocument(cost))
    }

    const result = await landedCosts.find({}).sort({ createdAt: -1 }).toArray()

    // Cost analysis
    if (analysis === 'true') {
      const allShipments = await shipments.find({ status: 'received' }).toArray()
      const allLots = await lots.find({}).toArray()

      // Cost breakdown analysis
      let totalFob = 0, totalFreight = 0, totalInsurance = 0
      let totalDuty = 0, totalClearing = 0, totalTransport = 0
      let totalOther = 0, totalLanded = 0, totalSqft = 0

      result.forEach(r => {
        totalFob += r.breakdown?.fobValueInr || 0
        totalFreight += r.breakdown?.freight || 0
        totalInsurance += r.breakdown?.insurance || 0
        totalDuty += r.breakdown?.customsDuty || 0
        totalClearing += r.breakdown?.clearing || 0
        totalTransport += r.breakdown?.transportation || 0
        totalOther += r.breakdown?.handling + r.breakdown?.other || 0
        totalLanded += r.totalLandedCost || 0
        totalSqft += r.totalSqft || 0
      })

      // Cost per sqft trends by month
      const costTrend = {}
      result.forEach(r => {
        const month = new Date(r.createdAt).toISOString().slice(0, 7)
        if (!costTrend[month]) {
          costTrend[month] = { month, totalCost: 0, totalSqft: 0 }
        }
        costTrend[month].totalCost += r.totalLandedCost || 0
        costTrend[month].totalSqft += r.totalSqft || 0
      })

      const monthlyTrend = Object.values(costTrend).map(m => ({
        ...m,
        avgCostPerSqft: m.totalSqft > 0 ? Math.round((m.totalCost / m.totalSqft) * 100) / 100 : 0
      })).sort((a, b) => a.month.localeCompare(b.month))

      // Product-wise cost analysis
      const productCosts = {}
      allLots.forEach(lot => {
        const key = lot.productId
        if (!productCosts[key]) {
          productCosts[key] = {
            productId: lot.productId,
            productName: lot.productName,
            sku: lot.sku,
            totalSqft: 0,
            totalCost: 0,
            lotCount: 0
          }
        }
        productCosts[key].totalSqft += lot.sqft || 0
        productCosts[key].totalCost += lot.totalLandedCost || 0
        productCosts[key].lotCount++
      })

      const productAnalysis = Object.values(productCosts).map(p => ({
        ...p,
        avgCostPerSqft: p.totalSqft > 0 ? Math.round((p.totalCost / p.totalSqft) * 100) / 100 : 0
      })).sort((a, b) => b.totalSqft - a.totalSqft)

      return successResponse({
        records: sanitizeDocuments(result),
        analysis: {
          summary: {
            totalShipments: result.length,
            totalSqft,
            totalLandedCost: totalLanded,
            avgCostPerSqft: totalSqft > 0 ? Math.round((totalLanded / totalSqft) * 100) / 100 : 0
          },
          breakdown: {
            fobValue: totalFob,
            freight: totalFreight,
            insurance: totalInsurance,
            customsDuty: totalDuty,
            clearing: totalClearing,
            transportation: totalTransport,
            other: totalOther
          },
          breakdownPercent: {
            fobValue: totalLanded > 0 ? Math.round((totalFob / totalLanded) * 1000) / 10 : 0,
            freight: totalLanded > 0 ? Math.round((totalFreight / totalLanded) * 1000) / 10 : 0,
            insurance: totalLanded > 0 ? Math.round((totalInsurance / totalLanded) * 1000) / 10 : 0,
            customsDuty: totalLanded > 0 ? Math.round((totalDuty / totalLanded) * 1000) / 10 : 0,
            clearing: totalLanded > 0 ? Math.round((totalClearing / totalLanded) * 1000) / 10 : 0,
            transportation: totalLanded > 0 ? Math.round((totalTransport / totalLanded) * 1000) / 10 : 0,
            other: totalLanded > 0 ? Math.round((totalOther / totalLanded) * 1000) / 10 : 0
          },
          monthlyTrend,
          productAnalysis: productAnalysis.slice(0, 20)
        }
      })
    }

    const summary = {
      totalRecords: result.length,
      totalSqft: result.reduce((sum, r) => sum + (r.totalSqft || 0), 0),
      totalLandedCost: result.reduce((sum, r) => sum + (r.totalLandedCost || 0), 0),
      avgCostPerSqft: result.length > 0
        ? result.reduce((sum, r) => sum + (r.costPerSqft || 0), 0) / result.length
        : 0
    }

    return successResponse({ records: sanitizeDocuments(result), summary })
  } catch (error) {
    console.error('LandedCosts GET Error:', error)
    return errorResponse('Failed to fetch landed costs', 500, error.message)
  }
}

// POST - Calculate landed cost for a shipment
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const landedCosts = db.collection('flooring_landed_costs')

    const costId = uuidv4()
    const now = new Date().toISOString()

    // Calculate landed cost
    const fobValue = body.fobValue || 0
    const exchangeRate = body.exchangeRate || 83.5
    const fobValueInr = fobValue * exchangeRate
    const freight = body.freight || 0
    const insurance = body.insurance || 0
    const customsDuty = body.customsDuty || 0
    const clearing = body.clearing || 0
    const transportation = body.transportation || 0
    const handling = body.handling || 0
    const other = body.other || 0

    const totalLandedCost = fobValueInr + freight + insurance + customsDuty + clearing + transportation + handling + other
    const totalSqft = body.totalSqft || 1
    const costPerSqft = totalSqft > 0 ? totalLandedCost / totalSqft : 0

    const record = {
      id: costId,
      shipmentId: body.shipmentId || null,
      shipmentNo: body.shipmentNo || 'MANUAL',
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      
      breakdown: {
        fobValue,
        fobValueInr,
        exchangeRate,
        freight,
        insurance,
        customsDuty,
        clearing,
        transportation,
        handling,
        other
      },
      
      totalLandedCost,
      totalSqft,
      costPerSqft: Math.round(costPerSqft * 100) / 100,
      
      costingMethod: body.costingMethod || 'FIFO', // FIFO, LIFO, WAVG
      
      notes: body.notes || '',
      
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await landedCosts.insertOne(record)

    return successResponse(sanitizeDocument(record), 201)
  } catch (error) {
    console.error('LandedCosts POST Error:', error)
    return errorResponse('Failed to create landed cost record', 500, error.message)
  }
}

// PUT - Update landed cost calculation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Record ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const landedCosts = db.collection('flooring_landed_costs')

    const record = await landedCosts.findOne({ id })
    if (!record) return errorResponse('Record not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'recalculate':
        // Recalculate with new values
        const newBreakdown = {
          ...record.breakdown,
          ...body.breakdown
        }
        
        const newTotal = 
          newBreakdown.fobValueInr +
          newBreakdown.freight +
          newBreakdown.insurance +
          newBreakdown.customsDuty +
          newBreakdown.clearing +
          newBreakdown.transportation +
          newBreakdown.handling +
          newBreakdown.other

        const newCostPerSqft = record.totalSqft > 0 ? newTotal / record.totalSqft : 0

        await landedCosts.updateOne({ id }, {
          $set: {
            breakdown: newBreakdown,
            totalLandedCost: newTotal,
            costPerSqft: Math.round(newCostPerSqft * 100) / 100,
            updatedAt: now
          }
        })

        return successResponse({ 
          message: 'Recalculated', 
          totalLandedCost: newTotal, 
          costPerSqft: newCostPerSqft 
        })

      default:
        updateData.updatedAt = now
        await landedCosts.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Record updated' })
    }
  } catch (error) {
    console.error('LandedCosts PUT Error:', error)
    return errorResponse('Failed to update landed cost', 500, error.message)
  }
}
