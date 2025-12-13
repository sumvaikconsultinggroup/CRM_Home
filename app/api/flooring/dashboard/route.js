import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections } from '@/lib/db/flooring-schema'

// GET - Dashboard stats and overview
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const period = searchParams.get('period') || 'month' // week, month, quarter, year

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const quotes = await getCollection(FlooringCollections.QUOTES)
    const installations = await getCollection(FlooringCollections.INSTALLATIONS)
    const products = await getCollection(FlooringCollections.PRODUCTS)
    const rooms = await getCollection(FlooringCollections.ROOMS)
    const inventory = await getCollection(FlooringCollections.INVENTORY)

    // Date range calculation
    const now = new Date()
    let startDate
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      default: // month
        startDate = new Date(now.setMonth(now.getMonth() - 1))
    }

    // Quotes stats
    const allQuotes = await quotes.find({ clientId }).toArray()
    const periodQuotes = allQuotes.filter(q => new Date(q.createdAt) >= startDate)
    const quoteStats = {
      total: allQuotes.length,
      periodTotal: periodQuotes.length,
      draft: allQuotes.filter(q => q.status === 'draft').length,
      sent: allQuotes.filter(q => q.status === 'sent').length,
      approved: allQuotes.filter(q => q.status === 'approved').length,
      rejected: allQuotes.filter(q => q.status === 'rejected').length,
      totalValue: allQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      periodValue: periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      approvedValue: allQuotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + (q.grandTotal || 0), 0),
      conversionRate: allQuotes.length > 0 
        ? ((allQuotes.filter(q => q.status === 'approved').length / allQuotes.length) * 100).toFixed(1)
        : 0
    }

    // Installation stats
    const allInstallations = await installations.find({ clientId }).toArray()
    const installationStats = {
      total: allInstallations.length,
      scheduled: allInstallations.filter(i => i.status === 'scheduled').length,
      inProgress: allInstallations.filter(i => i.status === 'in_progress').length,
      completed: allInstallations.filter(i => i.status === 'completed').length,
      onHold: allInstallations.filter(i => i.status === 'on_hold').length,
      totalAreaInstalled: allInstallations
        .filter(i => i.status === 'completed')
        .reduce((sum, i) => sum + (i.totalArea || 0), 0)
    }

    // Product stats
    const allProducts = await products.find({ clientId, status: 'active' }).toArray()
    const productStats = {
      total: allProducts.length,
      byCategory: {}
    }
    allProducts.forEach(p => {
      productStats.byCategory[p.category] = (productStats.byCategory[p.category] || 0) + 1
    })

    // Inventory stats
    const allInventory = await inventory.find({ clientId }).toArray()
    const lowStockProducts = allInventory.filter(inv => {
      const product = allProducts.find(p => p.id === inv.productId)
      return product && inv.availableQty <= (product.stock?.reorderLevel || 100)
    })
    const inventoryStats = {
      totalProducts: allInventory.length,
      totalValue: allInventory.reduce((sum, inv) => {
        const product = allProducts.find(p => p.id === inv.productId)
        return sum + (inv.quantity * (product?.pricing?.costPrice || 0))
      }, 0),
      lowStockCount: lowStockProducts.length,
      outOfStockCount: allInventory.filter(inv => inv.availableQty <= 0).length
    }

    // Room measurements stats
    const allRooms = await rooms.find({ clientId }).toArray()
    const roomStats = {
      totalRooms: allRooms.length,
      totalArea: allRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)
    }

    // Recent activity
    const recentQuotes = await quotes.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    const recentInstallations = await installations.find({ clientId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray()

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const approvedQuotes = allQuotes.filter(q => 
      q.status === 'approved' && new Date(q.approvedAt || q.updatedAt) >= sixMonthsAgo
    )
    const revenueByMonth = {}
    approvedQuotes.forEach(q => {
      const month = new Date(q.approvedAt || q.updatedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (q.grandTotal || 0)
    })

    return NextResponse.json({
      quotes: quoteStats,
      installations: installationStats,
      products: productStats,
      inventory: inventoryStats,
      rooms: roomStats,
      recentQuotes,
      recentInstallations,
      revenueByMonth,
      lowStockProducts: lowStockProducts.slice(0, 5)
    })
  } catch (error) {
    console.error('Flooring Dashboard GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
