import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get module dashboard data and configuration
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const config = db.collection('paints_config')
    const products = db.collection('paints_products')
    const colors = db.collection('paints_colors')
    const dealers = db.collection('paints_dealers')
    const orders = db.collection('paints_orders')
    const jobs = db.collection('paints_jobs')
    const quotes = db.collection('paints_quotes')
    const surveys = db.collection('paints_surveys')

    if (type === 'config') {
      // Get module configuration
      let moduleConfig = await config.findOne({ type: 'module_settings' })
      
      if (!moduleConfig) {
        // Create default config
        moduleConfig = {
          id: uuidv4(),
          type: 'module_settings',
          clientId: user.clientId,
          enabledModes: ['service'], // manufacturer, channel, service
          defaultMode: 'service',
          companyInfo: {
            name: '',
            gst: '',
            address: '',
            phone: '',
            email: ''
          },
          features: {
            colorMatching: true,
            tintingPOS: false,
            moistureMeter: false,
            arPreview: false,
            qualityChecks: true,
            warrantyManagement: true
          },
          pipelines: {
            lead: ['new', 'contacted', 'site_visit_scheduled', 'surveyed', 'quoted', 'negotiation', 'won', 'lost'],
            quote: ['draft', 'sent', 'viewed', 'approved', 'rejected', 'expired'],
            order: ['pending', 'confirmed', 'processing', 'ready', 'dispatched', 'delivered', 'completed'],
            job: ['scheduled', 'prep_in_progress', 'painting_in_progress', 'touch_up', 'qc_pending', 'completed', 'handed_over'],
            production: ['planned', 'raw_material_check', 'batching', 'qc_pending', 'approved', 'packed', 'ready']
          },
          pricingRules: {
            defaultMarkup: 15,
            dealerDiscount: 10,
            distributorDiscount: 20,
            projectDiscount: 5
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await config.insertOne(moduleConfig)
      }

      return successResponse({ config: sanitizeDocument(moduleConfig) })
    }

    // Dashboard data
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    const [productCount, colorCount, dealerCount, activeOrders, activeJobs, pendingQuotes, totalSurveys] = await Promise.all([
      products.countDocuments({ isActive: { $ne: false } }),
      colors.countDocuments({ isActive: { $ne: false } }),
      dealers.countDocuments({ status: 'active' }),
      orders.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      jobs.countDocuments({ status: { $nin: ['completed', 'handed_over', 'cancelled'] } }),
      quotes.countDocuments({ status: 'sent' }),
      surveys.countDocuments()
    ])

    // Revenue calculations
    const completedOrders = await orders.find({ status: 'completed' }).toArray()
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0)

    const monthlyOrders = await orders.find({ 
      createdAt: { $gte: startOfMonth.toISOString() } 
    }).toArray()
    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0)

    // Recent activity
    const recentOrders = await orders.find().sort({ createdAt: -1 }).limit(5).toArray()
    const recentJobs = await jobs.find().sort({ createdAt: -1 }).limit(5).toArray()
    const recentSurveys = await surveys.find().sort({ createdAt: -1 }).limit(5).toArray()

    return successResponse({
      dashboard: {
        overview: {
          totalProducts: productCount,
          totalColors: colorCount,
          totalDealers: dealerCount,
          activeOrders,
          activeJobs,
          pendingQuotes,
          totalSurveys
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          avgOrderValue: completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0
        },
        recentActivity: {
          orders: sanitizeDocuments(recentOrders),
          jobs: sanitizeDocuments(recentJobs),
          surveys: sanitizeDocuments(recentSurveys)
        }
      }
    })
  } catch (error) {
    console.error('Paints Module GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch module data', 500, error.message)
  }
}

// PUT - Update module configuration
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { type, ...updateData } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const config = db.collection('paints_config')

    const now = new Date().toISOString()

    if (type === 'module_settings') {
      await config.updateOne(
        { type: 'module_settings' },
        { 
          $set: { 
            ...updateData,
            updatedAt: now,
            updatedBy: user.id
          }
        },
        { upsert: true }
      )
      return successResponse({ message: 'Configuration updated' })
    }

    return errorResponse('Invalid configuration type', 400)
  } catch (error) {
    console.error('Paints Module PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update configuration', 500, error.message)
  }
}
