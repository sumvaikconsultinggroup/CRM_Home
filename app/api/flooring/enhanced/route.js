import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Dashboard and overview data
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard'
    const period = searchParams.get('period') || '30' // days

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Collections - SELF-CONTAINED: Module uses its own collections only
    const leads = db.collection('leads')
    const projects = db.collection('projects')
    const products = db.collection('flooring_products')
    // Use Flooring Module's own stock collection (NO sync with Build Inventory)
    const flooringStock = db.collection('wf_inventory_stock')
    const quotes = db.collection('flooring_quotes_v2')
    const invoices = db.collection('flooring_invoices')
    const payments = db.collection('flooring_payments')
    const installations = db.collection('flooring_installations')

    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - parseInt(period))

    if (type === 'dashboard') {
      // Comprehensive dashboard data - use inventory_products for stock
      const [allLeads, allProjects, allProducts, allInventory, allQuotes, allInvoices, allPayments, allInstallations] = await Promise.all([
        leads.find({}).toArray(),
        projects.find({}).toArray(),
        products.find({}).toArray(),
        // Get inventory from Build Inventory (central source of truth)
        inventoryProducts.find({ 
          $or: [
            { sourceModuleId: 'wooden-flooring' },
            { category: { $regex: /flooring|wood/i } }
          ]
        }).toArray(),
        quotes.find({}).toArray(),
        invoices.find({}).toArray(),
        payments.find({}).toArray(),
        installations.find({}).toArray()
      ])

      // Calculate metrics
      const totalQuoteValue = allQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
      const approvedQuotes = allQuotes.filter(q => q.status === 'approved')
      const approvedValue = approvedQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
      const totalInvoiceValue = allInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0)
      const collectedAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const pendingAmount = totalInvoiceValue - collectedAmount

      // Period calculations
      const periodQuotes = allQuotes.filter(q => new Date(q.createdAt) >= periodStart)
      const periodInvoices = allInvoices.filter(i => new Date(i.createdAt) >= periodStart)
      const periodPayments = allPayments.filter(p => new Date(p.createdAt) >= periodStart)

      // Low stock items (from Build Inventory)
      const lowStockItems = allInventory.filter(i => {
        const available = (i.stockQuantity || 0) - (i.reservedQuantity || 0)
        return available <= (i.reorderLevel || 10)
      })

      // Active installations
      const activeInstallations = allInstallations.filter(i => ['scheduled', 'in_progress'].includes(i.status))

      // Leads with flooring interest
      const flooringLeads = allLeads.filter(l => l.flooringStatus || l.modules?.includes('flooring'))

      // Quote conversion
      const conversionRate = allQuotes.length > 0 
        ? Math.round((approvedQuotes.length / allQuotes.length) * 100) 
        : 0

      return successResponse({
        overview: {
          totalProducts: allProducts.length,
          totalInventoryValue: allInventory.reduce((sum, i) => sum + ((i.stockQuantity || 0) * (i.costPrice || 0)), 0),
          totalQuotes: allQuotes.length,
          totalQuoteValue,
          approvedQuotes: approvedQuotes.length,
          approvedValue,
          conversionRate,
          totalInvoices: allInvoices.length,
          totalInvoiceValue,
          collectedAmount,
          pendingAmount,
          activeInstallations: activeInstallations.length,
          lowStockItems: lowStockItems.length,
          flooringLeads: flooringLeads.length,
          totalProjects: allProjects.filter(p => p.modules?.includes('flooring')).length
        },
        period: {
          quotesCreated: periodQuotes.length,
          quotesValue: periodQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0),
          invoicesCreated: periodInvoices.length,
          invoicesValue: periodInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
          paymentsReceived: periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        },
        recentQuotes: allQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
        recentInvoices: allInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
        lowStockAlerts: lowStockItems.slice(0, 10),
        upcomingInstallations: activeInstallations.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).slice(0, 5),
        pendingLeads: flooringLeads.filter(l => ['new', 'contacted', 'qualified'].includes(l.status)).slice(0, 5)
      })
    }

    return successResponse({ message: 'Flooring module active' })
  } catch (error) {
    console.error('Flooring Enhanced GET Error:', error)
    return errorResponse('Failed to fetch data', 500, error.message)
  }
}
