import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { FlooringCollections, ProjectStages, WoodTypes } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'sales'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const clientId = user.clientId
    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    
    switch (reportType) {
      case 'sales': {
        const quotationsCollection = await getCollection(FlooringCollections.QUOTATIONS)
        const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
        
        const filter = { clientId }
        if (startDate || endDate) filter.createdAt = dateFilter
        
        const quotations = await quotationsCollection.find(filter).toArray()
        const invoices = await invoicesCollection.find(filter).toArray()
        
        // Sales by status
        const quotationsByStatus = quotations.reduce((acc, q) => {
          acc[q.status] = (acc[q.status] || 0) + 1
          return acc
        }, {})
        
        const invoicesByStatus = invoices.reduce((acc, i) => {
          acc[i.status] = (acc[i.status] || 0) + 1
          return acc
        }, {})
        
        // Conversion rate
        const conversionRate = quotations.length > 0 
          ? ((quotations.filter(q => q.status === 'accepted').length / quotations.length) * 100).toFixed(1)
          : 0
        
        // Revenue metrics
        const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.grandTotal, 0)
        const averageOrderValue = invoices.length > 0 ? totalRevenue / invoices.filter(i => i.status === 'paid').length : 0
        
        return successResponse({
          reportType: 'sales',
          period: { startDate, endDate },
          summary: {
            totalQuotations: quotations.length,
            quotationValue: quotations.reduce((sum, q) => sum + q.grandTotal, 0),
            totalInvoices: invoices.length,
            totalRevenue,
            averageOrderValue,
            conversionRate: parseFloat(conversionRate)
          },
          charts: {
            quotationsByStatus: Object.entries(quotationsByStatus).map(([status, count]) => ({ status, count })),
            invoicesByStatus: Object.entries(invoicesByStatus).map(([status, count]) => ({ status, count }))
          }
        })
      }
      
      case 'inventory': {
        const inventoryCollection = await getCollection(FlooringCollections.INVENTORY)
        const movementsCollection = await getCollection(FlooringCollections.STOCK_MOVEMENTS)
        
        const inventory = await inventoryCollection.find({ clientId }).toArray()
        
        const movementFilter = { clientId }
        if (startDate || endDate) movementFilter.createdAt = dateFilter
        const movements = await movementsCollection.find(movementFilter).toArray()
        
        // Stock valuation
        const totalValue = inventory.reduce((sum, i) => sum + (i.quantity * i.costPrice), 0)
        const totalRetailValue = inventory.reduce((sum, i) => sum + (i.quantity * i.sellingPrice), 0)
        
        // Movement analysis
        const restockTotal = movements.filter(m => m.type === 'restock').reduce((sum, m) => sum + m.quantity, 0)
        const consumptionTotal = movements.filter(m => m.type === 'consumption').reduce((sum, m) => sum + Math.abs(m.quantity), 0)
        
        // Stock by location
        const stockByLocation = inventory.reduce((acc, i) => {
          if (!acc[i.location]) acc[i.location] = { quantity: 0, value: 0 }
          acc[i.location].quantity += i.quantity
          acc[i.location].value += i.quantity * i.costPrice
          return acc
        }, {})
        
        return successResponse({
          reportType: 'inventory',
          period: { startDate, endDate },
          summary: {
            totalItems: inventory.length,
            totalCostValue: totalValue,
            totalRetailValue,
            profitPotential: totalRetailValue - totalValue,
            restocked: restockTotal,
            consumed: consumptionTotal,
            lowStockItems: inventory.filter(i => i.quantity <= i.reorderLevel).length
          },
          charts: {
            stockByLocation: Object.entries(stockByLocation).map(([location, data]) => ({ location, ...data }))
          }
        })
      }
      
      case 'projects': {
        const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
        
        const filter = { clientId }
        if (startDate || endDate) filter.createdAt = dateFilter
        const projects = await projectsCollection.find(filter).toArray()
        
        // Project stats
        const byStage = ProjectStages.map(stage => ({
          stage: stage.name,
          stageId: stage.id,
          count: projects.filter(p => p.stage === stage.id).length,
          color: stage.color
        }))
        
        const completedProjects = projects.filter(p => p.stage === 'completed')
        const averageCompletionTime = completedProjects.length > 0
          ? completedProjects.reduce((sum, p) => {
              if (p.actualStartDate && p.actualEndDate) {
                return sum + (new Date(p.actualEndDate) - new Date(p.actualStartDate)) / (1000 * 60 * 60 * 24)
              }
              return sum
            }, 0) / completedProjects.filter(p => p.actualStartDate && p.actualEndDate).length
          : 0
        
        // Budget analysis
        const totalEstimatedCost = projects.reduce((sum, p) => sum + (p.estimatedCost || 0), 0)
        const totalActualCost = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
        
        return successResponse({
          reportType: 'projects',
          period: { startDate, endDate },
          summary: {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            completedProjects: completedProjects.length,
            averageCompletionDays: Math.round(averageCompletionTime),
            totalEstimatedCost,
            totalActualCost,
            costVariance: totalActualCost - totalEstimatedCost
          },
          charts: { byStage }
        })
      }
      
      case 'suppliers': {
        const suppliersCollection = await getCollection(FlooringCollections.SUPPLIERS)
        const ordersCollection = await getCollection(FlooringCollections.SUPPLIER_ORDERS)
        
        const suppliers = await suppliersCollection.find({ clientId, active: true }).toArray()
        const orders = await ordersCollection.find({ clientId }).toArray()
        
        // Supplier performance
        const supplierPerformance = suppliers.map(supplier => {
          const supplierOrders = orders.filter(o => o.supplierId === supplier.id)
          const deliveredOrders = supplierOrders.filter(o => o.status === 'delivered')
          const onTimeDeliveries = deliveredOrders.filter(o => 
            o.actualDeliveryDate && o.expectedDeliveryDate && 
            new Date(o.actualDeliveryDate) <= new Date(o.expectedDeliveryDate)
          ).length
          
          return {
            id: supplier.id,
            name: supplier.name,
            totalOrders: supplierOrders.length,
            deliveredOrders: deliveredOrders.length,
            onTimeRate: deliveredOrders.length > 0 ? ((onTimeDeliveries / deliveredOrders.length) * 100).toFixed(1) : 0,
            totalSpent: supplierOrders.reduce((sum, o) => sum + o.grandTotal, 0),
            rating: supplier.rating
          }
        })
        
        return successResponse({
          reportType: 'suppliers',
          summary: {
            totalSuppliers: suppliers.length,
            totalOrders: orders.length,
            totalSpent: orders.reduce((sum, o) => sum + o.grandTotal, 0),
            pendingOrders: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
          },
          suppliers: supplierPerformance
        })
      }
      
      case 'customer': {
        const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
        const feedbackCollection = await getCollection(FlooringCollections.FEEDBACK)
        const invoicesCollection = await getCollection(FlooringCollections.INVOICES)
        
        const projects = await projectsCollection.find({ clientId }).toArray()
        const feedback = await feedbackCollection.find({ clientId }).toArray()
        const invoices = await invoicesCollection.find({ clientId }).toArray()
        
        // Customer insights
        const uniqueCustomers = [...new Set(projects.map(p => p.customerEmail || p.customerPhone))]
        const repeatCustomers = uniqueCustomers.filter(c => 
          projects.filter(p => p.customerEmail === c || p.customerPhone === c).length > 1
        ).length
        
        const averageProjectValue = invoices.length > 0 
          ? invoices.reduce((sum, i) => sum + i.grandTotal, 0) / invoices.length 
          : 0
        
        const averageRating = feedback.length > 0
          ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
          : 0
        
        return successResponse({
          reportType: 'customer',
          summary: {
            totalCustomers: uniqueCustomers.length,
            repeatCustomers,
            repeatRate: uniqueCustomers.length > 0 ? ((repeatCustomers / uniqueCustomers.length) * 100).toFixed(1) : 0,
            averageProjectValue,
            totalFeedback: feedback.length,
            averageRating: parseFloat(averageRating),
            wouldRecommend: feedback.filter(f => f.wouldRecommend).length
          }
        })
      }
      
      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('Flooring Reports GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to generate report', 500, error.message)
  }
}
