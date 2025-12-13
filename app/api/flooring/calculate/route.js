import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, DefaultWastage, FlooringCalculations } from '@/lib/db/flooring-schema'

// POST - Calculate flooring requirements and costs
export async function POST(request) {
  try {
    const body = await request.json()
    const { rooms, productId, laborRate, includeUnderlayment, includeTransitions, includeRemoval, clientId } = body

    // Get product details if productId provided
    let product = null
    if (productId) {
      const products = await getCollection(FlooringCollections.PRODUCTS)
      product = await products.findOne({ id: productId })
    }

    // Calculate room-by-room and totals
    let totalNetArea = 0
    let totalGrossArea = 0
    let totalPerimeter = 0
    let totalDoorways = 0
    const roomCalculations = []

    for (const room of rooms) {
      const netArea = room.netArea || (room.dimensions.length * room.dimensions.width)
      const wastagePercent = room.wastagePercent || (product ? DefaultWastage[product.category] : 10)
      const areaWithWastage = FlooringCalculations.calculateAreaWithWastage(netArea, wastagePercent)
      const perimeter = room.perimeter || (2 * (room.dimensions.length + room.dimensions.width))
      const doorways = room.doorways || 1

      totalNetArea += netArea
      totalGrossArea += areaWithWastage
      totalPerimeter += perimeter
      totalDoorways += doorways

      roomCalculations.push({
        roomId: room.id,
        roomName: room.roomName || room.name,
        netArea,
        wastagePercent,
        areaWithWastage,
        perimeter,
        doorways
      })
    }

    // Material calculations
    const materialCalculation = {
      totalNetArea,
      totalAreaWithWastage: totalGrossArea,
      wastageArea: totalGrossArea - totalNetArea
    }

    if (product) {
      materialCalculation.product = {
        id: product.id,
        name: product.name,
        category: product.category,
        pricePerSqft: product.pricing.sellingPrice,
        sqftPerBox: product.pricing.sqftPerBox
      }
      materialCalculation.boxesNeeded = Math.ceil(totalGrossArea / product.pricing.sqftPerBox)
      materialCalculation.materialCost = totalGrossArea * product.pricing.sellingPrice
    }

    // Labor calculation
    const laborCalculation = {
      totalArea: totalGrossArea,
      ratePerSqft: laborRate || 25, // Default ₹25/sqft
      laborCost: totalGrossArea * (laborRate || 25)
    }

    // Accessories calculation
    const accessoriesCalculation = {
      items: []
    }

    // Underlayment (if required)
    if (includeUnderlayment) {
      accessoriesCalculation.items.push({
        name: 'Underlayment/Padding',
        quantity: totalGrossArea,
        unit: 'sqft',
        unitPrice: 8, // ₹8/sqft average
        totalPrice: totalGrossArea * 8
      })
    }

    // Transitions (T-moldings for doorways)
    if (includeTransitions) {
      accessoriesCalculation.items.push({
        name: 'T-Molding Transitions',
        quantity: totalDoorways,
        unit: 'pcs',
        unitPrice: 350, // ₹350/piece average
        totalPrice: totalDoorways * 350
      })

      // Baseboards/Quarter round
      accessoriesCalculation.items.push({
        name: 'Baseboard/Quarter Round',
        quantity: totalPerimeter,
        unit: 'ft',
        unitPrice: 15, // ₹15/ft average
        totalPrice: totalPerimeter * 15
      })
    }

    // Old flooring removal
    if (includeRemoval) {
      accessoriesCalculation.items.push({
        name: 'Old Flooring Removal',
        quantity: totalNetArea,
        unit: 'sqft',
        unitPrice: 10, // ₹10/sqft average
        totalPrice: totalNetArea * 10
      })
    }

    accessoriesCalculation.totalCost = accessoriesCalculation.items.reduce(
      (sum, item) => sum + item.totalPrice, 0
    )

    // Summary
    const summary = {
      materialCost: materialCalculation.materialCost || 0,
      laborCost: laborCalculation.laborCost,
      accessoriesCost: accessoriesCalculation.totalCost,
      subtotal: (materialCalculation.materialCost || 0) + laborCalculation.laborCost + accessoriesCalculation.totalCost,
      taxRate: 18,
      taxAmount: 0,
      grandTotal: 0
    }
    summary.taxAmount = summary.subtotal * (summary.taxRate / 100)
    summary.grandTotal = summary.subtotal + summary.taxAmount

    return NextResponse.json({
      success: true,
      calculation: {
        rooms: roomCalculations,
        material: materialCalculation,
        labor: laborCalculation,
        accessories: accessoriesCalculation,
        summary
      }
    })
  } catch (error) {
    console.error('Flooring Calculate Error:', error)
    return NextResponse.json({ error: 'Failed to calculate' }, { status: 500 })
  }
}
