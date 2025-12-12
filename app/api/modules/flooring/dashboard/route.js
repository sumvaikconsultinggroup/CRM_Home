import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { FlooringCollections, ProjectStages, WoodTypes } from '@/lib/modules/flooring/constants'
import { initializeFlooringModule } from '@/lib/modules/flooring/utils'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    // Initialize module if needed
    await initializeFlooringModule(user.clientId)
    
    const clientId = user.clientId
    
    // Get all collections
    const productsCollection = await getCollection(FlooringCollections.PRODUCTS)
    const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
    const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
    const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
    const feedbackCollection = await getCollection(FlooringCollections.FEEDBACK)
    const consultationsCollection = await getCollection(FlooringCollections.CONSULTATIONS)
    
    // Product stats
    const totalProducts = await productsCollection.countDocuments({ clientId, active: true })
    const featuredProducts = await productsCollection.countDocuments({ clientId, active: true, featured: true })
    
    // Inventory stats
    const inventory = await inventoryCollection.find({ clientId }).toArray()
    const totalStockValue = inventory.reduce((sum, i) => sum + (i.quantity * i.costPrice), 0)
    const lowStockItems = inventory.filter(i => i.quantity <= i.reorderLevel).length
    const outOfStockItems = inventory.filter(i => i.quantity === 0).length
    
    // Quotation stats
    const totalQuotations = await quotationsCollection.countDocuments({ clientId })
    const pendingQuotations = await quotationsCollection.countDocuments({ clientId, status: { $in: ['draft', 'sent'] } })
    const acceptedQuotations = await quotationsCollection.countDocuments({ clientId, status: 'accepted' })
    const quotationValue = await quotationsCollection.aggregate([
      { $match: { clientId } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]).toArray()
    
    // Invoice stats
    const totalInvoices = await invoicesCollection.countDocuments({ clientId })
    const paidInvoices = await invoicesCollection.countDocuments({ clientId, status: 'paid' })
    const pendingInvoices = await invoicesCollection.countDocuments({ clientId, status: { $in: ['draft', 'sent', 'partially_paid'] } })
    const overdueInvoices = await invoicesCollection.countDocuments({ 
      clientId, 
      status: { $nin: ['paid', 'cancelled'] },
      dueDate: { $lt: new Date() }
    })
    const invoiceStats = await invoicesCollection.aggregate([
      { $match: { clientId } },
      { $group: { 
        _id: null, 
        totalAmount: { $sum: '$grandTotal' },
        paidAmount: { $sum: '$paidAmount' },
        pendingAmount: { $sum: '$balanceDue' }
      } }
    ]).toArray()
    
    // Project stats
    const totalProjects = await projectsCollection.countDocuments({ clientId })
    const activeProjects = await projectsCollection.countDocuments({ clientId, status: 'active' })
    const completedProjects = await projectsCollection.countDocuments({ clientId, stage: 'completed' })
    
    // Project pipeline
    const projectPipeline = await projectsCollection.aggregate([
      { $match: { clientId, status: 'active' } },
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ]).toArray()
    
    // Supplier stats
    const totalSuppliers = await suppliersCollection.countDocuments({ clientId, active: true })
    
    // Feedback stats
    const feedbackData = await feedbackCollection.find({ clientId }).toArray()
    const averageRating = feedbackData.length > 0 
      ? (feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length).toFixed(1)
      : 0
    
    // Upcoming consultations
    const upcomingConsultations = await consultationsCollection.countDocuments({
      clientId,
      scheduledDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    })
    
    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const monthlyRevenue = await invoicesCollection.aggregate([
      { $match: { clientId, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$grandTotal' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray()
    
    // Popular products (by quotation count)
    const popularProducts = await quotationsCollection.aggregate([
      { $match: { clientId } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', count: { $sum: 1 }, totalQuantity: { $sum: '$items.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray()
    
    return successResponse({
      overview: {
        products: { total: totalProducts, featured: featuredProducts },
        inventory: { totalValue: totalStockValue, lowStock: lowStockItems, outOfStock: outOfStockItems },
        quotations: { 
          total: totalQuotations, 
          pending: pendingQuotations, 
          accepted: acceptedQuotations,
          totalValue: quotationValue[0]?.total || 0
        },
        invoices: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: pendingInvoices,
          overdue: overdueInvoices,
          totalAmount: invoiceStats[0]?.totalAmount || 0,
          paidAmount: invoiceStats[0]?.paidAmount || 0,
          pendingAmount: invoiceStats[0]?.pendingAmount || 0
        },
        projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
        suppliers: totalSuppliers,
        averageRating: parseFloat(averageRating),
        upcomingConsultations
      },
      charts: {
        projectPipeline: ProjectStages.map(stage => ({
          ...stage,
          count: projectPipeline.find(p => p._id === stage.id)?.count || 0
        })),
        monthlyRevenue: monthlyRevenue.map(m => ({ month: m._id, revenue: m.revenue, invoices: m.count })),
        popularProducts: popularProducts.map(p => ({ name: p._id, orders: p.count, quantity: p.totalQuantity })),
        inventoryByLocation: [...new Set(inventory.map(i => i.location))].map(loc => ({
          location: loc,
          items: inventory.filter(i => i.location === loc).length,
          value: inventory.filter(i => i.location === loc).reduce((sum, i) => sum + (i.quantity * i.costPrice), 0)
        }))
      },
      referenceData: {
        woodTypes: WoodTypes,
        projectStages: ProjectStages
      }
    })
  } catch (error) {
    console.error('Flooring Dashboard GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch dashboard data', 500, error.message)
  }
}
