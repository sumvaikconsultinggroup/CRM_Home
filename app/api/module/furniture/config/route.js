import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Default module configuration
const DEFAULT_CONFIG = {
  version: '1.0.0',
  entitySchemas: {
    product: {
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Product Name' },
        { name: 'sku', type: 'text', required: true, label: 'SKU', unique: true },
        { name: 'category', type: 'select', required: true, label: 'Category', options: 'categories' },
        { name: 'subcategory', type: 'select', label: 'Subcategory', dependsOn: 'category' },
        { name: 'productType', type: 'select', required: true, label: 'Type', options: ['standard', 'configurable', 'made_to_order'] },
        { name: 'description', type: 'richtext', label: 'Description' },
        { name: 'basePrice', type: 'currency', required: true, label: 'Base Price' },
        { name: 'dimensions', type: 'dimensions', label: 'Dimensions' },
        { name: 'materials', type: 'multiselect', label: 'Materials Allowed', options: 'materials' },
        { name: 'finishes', type: 'multiselect', label: 'Finish Options', options: 'finishes' },
        { name: 'hardware', type: 'multiselect', label: 'Hardware Options', options: 'hardware' },
        { name: 'images', type: 'gallery', label: 'Product Images' },
        { name: 'drawings', type: 'files', label: 'Technical Drawings' },
        { name: 'warranty', type: 'text', label: 'Warranty Period' },
        { name: 'leadTime', type: 'number', label: 'Lead Time (days)' },
        { name: 'tags', type: 'tags', label: 'Style Tags' },
        { name: 'isActive', type: 'boolean', label: 'Active', default: true }
      ],
      validations: [
        { field: 'basePrice', rule: 'min', value: 0 },
        { field: 'leadTime', rule: 'min', value: 0 }
      ]
    },
    material: {
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Material Name' },
        { name: 'code', type: 'text', required: true, label: 'Material Code' },
        { name: 'category', type: 'select', required: true, label: 'Category', options: ['board', 'laminate', 'veneer', 'paint', 'polish', 'edge_band', 'adhesive'] },
        { name: 'brand', type: 'text', label: 'Brand' },
        { name: 'specifications', type: 'keyvalue', label: 'Specifications' },
        { name: 'thickness', type: 'number', label: 'Thickness (mm)' },
        { name: 'sheetSize', type: 'dimensions2d', label: 'Sheet Size' },
        { name: 'unitOfMeasure', type: 'select', required: true, label: 'UOM', options: 'uom' },
        { name: 'unitPrice', type: 'currency', required: true, label: 'Unit Price' },
        { name: 'wastagePercent', type: 'number', label: 'Wastage %', default: 10 },
        { name: 'reorderLevel', type: 'number', label: 'Reorder Level' },
        { name: 'isActive', type: 'boolean', label: 'Active', default: true }
      ]
    },
    requirement: {
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Requirement Title' },
        { name: 'roomType', type: 'select', label: 'Room Type', options: ['bedroom', 'living_room', 'kitchen', 'dining', 'study', 'bathroom', 'office', 'other'] },
        { name: 'furnitureItems', type: 'multiselect', label: 'Furniture Items Needed' },
        { name: 'budget', type: 'currency', label: 'Budget' },
        { name: 'timeline', type: 'select', label: 'Timeline', options: ['urgent', '2_weeks', '1_month', '2_months', 'flexible'] },
        { name: 'stylePreference', type: 'multiselect', label: 'Style Preference', options: ['modern', 'contemporary', 'traditional', 'minimalist', 'industrial', 'scandinavian'] },
        { name: 'siteConstraints', type: 'textarea', label: 'Site Constraints' },
        { name: 'attachments', type: 'files', label: 'Reference Photos/Documents' },
        { name: 'notes', type: 'textarea', label: 'Additional Notes' }
      ]
    }
  },
  pipelines: {
    requirement: {
      stages: [
        { id: 'new', name: 'New', color: '#3B82F6', order: 1 },
        { id: 'site_visit_scheduled', name: 'Site Visit Scheduled', color: '#8B5CF6', order: 2 },
        { id: 'measurement_done', name: 'Measurement Done', color: '#10B981', order: 3 },
        { id: 'design_in_progress', name: 'Design In Progress', color: '#F59E0B', order: 4 },
        { id: 'quote_sent', name: 'Quote Sent', color: '#EC4899', order: 5 },
        { id: 'approved', name: 'Approved', color: '#22C55E', order: 6 },
        { id: 'closed_lost', name: 'Closed Lost', color: '#EF4444', order: 7 }
      ],
      transitions: [
        { from: 'new', to: ['site_visit_scheduled', 'closed_lost'] },
        { from: 'site_visit_scheduled', to: ['measurement_done', 'closed_lost'] },
        { from: 'measurement_done', to: ['design_in_progress', 'closed_lost'] },
        { from: 'design_in_progress', to: ['quote_sent', 'closed_lost'] },
        { from: 'quote_sent', to: ['approved', 'design_in_progress', 'closed_lost'] },
        { from: 'approved', to: [] }
      ]
    },
    order: {
      stages: [
        { id: 'created', name: 'Created', color: '#3B82F6', order: 1 },
        { id: 'advance_received', name: 'Advance Received', color: '#8B5CF6', order: 2 },
        { id: 'in_production', name: 'In Production', color: '#F59E0B', order: 3 },
        { id: 'ready', name: 'Ready', color: '#10B981', order: 4 },
        { id: 'dispatched', name: 'Dispatched', color: '#EC4899', order: 5 },
        { id: 'installed', name: 'Installed', color: '#06B6D4', order: 6 },
        { id: 'closed', name: 'Closed', color: '#22C55E', order: 7 },
        { id: 'cancelled', name: 'Cancelled', color: '#EF4444', order: 8 }
      ]
    },
    workOrder: {
      stages: [
        { id: 'pending', name: 'Pending', color: '#94A3B8', order: 1 },
        { id: 'cutting', name: 'Cutting', color: '#3B82F6', order: 2 },
        { id: 'edge_banding', name: 'Edge Banding', color: '#8B5CF6', order: 3 },
        { id: 'cnc', name: 'CNC', color: '#10B981', order: 4 },
        { id: 'assembly', name: 'Assembly', color: '#F59E0B', order: 5 },
        { id: 'finishing', name: 'Finishing', color: '#EC4899', order: 6 },
        { id: 'upholstery', name: 'Upholstery', color: '#06B6D4', order: 7 },
        { id: 'qc', name: 'QC', color: '#84CC16', order: 8 },
        { id: 'packing', name: 'Packing', color: '#22C55E', order: 9 },
        { id: 'completed', name: 'Completed', color: '#16A34A', order: 10 }
      ]
    },
    designBrief: {
      stages: [
        { id: 'draft', name: 'Draft', color: '#94A3B8', order: 1 },
        { id: 'internal_review', name: 'Internal Review', color: '#3B82F6', order: 2 },
        { id: 'internal_approved', name: 'Internal Approved', color: '#8B5CF6', order: 3 },
        { id: 'sent_to_customer', name: 'Sent to Customer', color: '#F59E0B', order: 4 },
        { id: 'customer_approved', name: 'Customer Approved', color: '#22C55E', order: 5 },
        { id: 'revision_requested', name: 'Revision Requested', color: '#EF4444', order: 6 },
        { id: 'locked', name: 'Locked', color: '#16A34A', order: 7 }
      ]
    }
  },
  templates: {
    quote: [
      { id: 'standard', name: 'Standard Quote', isDefault: true },
      { id: 'detailed', name: 'Detailed Quote with BOM' },
      { id: 'summary', name: 'Summary Quote' }
    ],
    bom: [
      { id: 'standard', name: 'Standard BOM', isDefault: true },
      { id: 'detailed', name: 'Detailed BOM with Routing' }
    ],
    workOrder: [
      { id: 'standard', name: 'Standard Work Order', isDefault: true }
    ],
    qcChecklist: [
      { id: 'furniture_general', name: 'General Furniture QC', isDefault: true },
      { id: 'upholstery', name: 'Upholstery QC' },
      { id: 'finishing', name: 'Finishing QC' }
    ]
  },
  pricingRules: {
    laborRates: {
      cutting: 50,
      edgeBanding: 30,
      cnc: 100,
      assembly: 75,
      finishing: 60,
      upholstery: 80,
      installation: 100
    },
    margins: {
      minimum: 15,
      target: 25,
      premium: 35
    },
    discountSlabs: [
      { maxPercent: 5, approvalLevel: 'sales' },
      { maxPercent: 10, approvalLevel: 'manager' },
      { maxPercent: 15, approvalLevel: 'director' },
      { maxPercent: 20, approvalLevel: 'admin' }
    ]
  },
  automationRules: [
    { id: 'auto_task_measurement', trigger: 'requirement.created', action: 'create_task', params: { taskType: 'site_measurement' } },
    { id: 'notify_quote_sent', trigger: 'quote.sent', action: 'send_notification', params: { template: 'quote_sent' } },
    { id: 'notify_order_ready', trigger: 'order.status.ready', action: 'send_notification', params: { template: 'order_ready' } }
  ],
  permissions: {
    roles: ['admin', 'manager', 'sales', 'designer', 'production', 'qc', 'dispatch', 'viewer'],
    matrix: {
      config: { admin: ['read', 'write'], manager: ['read'], sales: [], designer: [], production: [], qc: [], dispatch: [], viewer: [] },
      products: { admin: ['read', 'write', 'delete'], manager: ['read', 'write'], sales: ['read'], designer: ['read'], production: ['read'], qc: ['read'], dispatch: ['read'], viewer: ['read'] },
      requirements: { admin: ['read', 'write', 'delete'], manager: ['read', 'write', 'delete'], sales: ['read', 'write'], designer: ['read'], production: [], qc: [], dispatch: [], viewer: ['read'] },
      quotes: { admin: ['read', 'write', 'delete', 'approve'], manager: ['read', 'write', 'approve'], sales: ['read', 'write'], designer: ['read'], production: [], qc: [], dispatch: [], viewer: ['read'] },
      orders: { admin: ['read', 'write', 'delete'], manager: ['read', 'write'], sales: ['read'], designer: ['read'], production: ['read', 'write'], qc: ['read'], dispatch: ['read', 'write'], viewer: ['read'] },
      workOrders: { admin: ['read', 'write', 'delete'], manager: ['read', 'write'], sales: [], designer: [], production: ['read', 'write'], qc: ['read', 'write'], dispatch: ['read'], viewer: [] }
    }
  },
  categories: [
    { id: 'wardrobe', name: 'Wardrobe', icon: 'wardrobe', subcategories: ['sliding', 'hinged', 'walk_in', 'corner'] },
    { id: 'bed', name: 'Bed', icon: 'bed', subcategories: ['platform', 'storage', 'poster', 'murphy'] },
    { id: 'sofa', name: 'Sofa', icon: 'sofa', subcategories: ['3_seater', '2_seater', 'l_shaped', 'sectional', 'recliner'] },
    { id: 'dining', name: 'Dining', icon: 'dining', subcategories: ['table', 'chair', 'bench', 'buffet'] },
    { id: 'storage', name: 'Storage', icon: 'cabinet', subcategories: ['bookshelf', 'cabinet', 'chest', 'sideboard'] },
    { id: 'desk', name: 'Desk', icon: 'desk', subcategories: ['writing', 'computer', 'executive', 'standing'] },
    { id: 'kitchen', name: 'Kitchen', icon: 'kitchen', subcategories: ['base_cabinet', 'wall_cabinet', 'tall_unit', 'island'] },
    { id: 'tv_unit', name: 'TV Unit', icon: 'tv', subcategories: ['wall_mounted', 'floor_standing', 'entertainment_center'] },
    { id: 'other', name: 'Other', icon: 'furniture', subcategories: ['custom'] }
  ],
  finishes: [
    { id: 'laminate', name: 'Laminate' },
    { id: 'veneer', name: 'Veneer' },
    { id: 'acrylic', name: 'Acrylic' },
    { id: 'lacquer', name: 'Lacquer/Duco' },
    { id: 'pu', name: 'PU Polish' },
    { id: 'melamine', name: 'Melamine' },
    { id: 'fabric', name: 'Fabric' },
    { id: 'leather', name: 'Leather' }
  ],
  qcChecklists: {
    furniture_general: [
      { id: 'dimensions', name: 'Dimensions Match Spec', category: 'fit' },
      { id: 'alignment', name: 'Panel Alignment', category: 'fit' },
      { id: 'joints', name: 'Joint Quality', category: 'construction' },
      { id: 'hardware', name: 'Hardware Function', category: 'function' },
      { id: 'surface', name: 'Surface Finish', category: 'finish' },
      { id: 'edges', name: 'Edge Quality', category: 'finish' },
      { id: 'color', name: 'Color Consistency', category: 'finish' },
      { id: 'clean', name: 'Cleanliness', category: 'final' }
    ],
    upholstery: [
      { id: 'stitching', name: 'Stitching Quality', category: 'construction' },
      { id: 'fabric_tension', name: 'Fabric Tension', category: 'construction' },
      { id: 'pattern_match', name: 'Pattern Matching', category: 'finish' },
      { id: 'foam_density', name: 'Foam Density', category: 'comfort' },
      { id: 'zippers', name: 'Zipper Function', category: 'function' }
    ]
  }
}

// GET - Fetch module configuration
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') // specific section or all
    const version = searchParams.get('version')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configs = db.collection('furniture_config')

    let query = { isActive: true }
    if (version) query.version = version

    const config = await configs.findOne(query, { sort: { createdAt: -1 } })

    if (!config) {
      // Return default config if none exists
      return successResponse({ config: DEFAULT_CONFIG, isDefault: true })
    }

    if (section && config[section]) {
      return successResponse({ [section]: config[section], version: config.version })
    }

    return successResponse({ config: sanitizeDocument(config), isDefault: false })
  } catch (error) {
    console.error('Furniture Config GET Error:', error)
    return errorResponse('Failed to fetch configuration', 500, error.message)
  }
}

// POST - Create or update configuration
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { section, data, createVersion } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configs = db.collection('furniture_config')
    const configHistory = db.collection('furniture_config_history')

    const now = new Date().toISOString()
    const currentConfig = await configs.findOne({ isActive: true }, { sort: { createdAt: -1 } })

    if (createVersion) {
      // Archive current config
      if (currentConfig) {
        await configHistory.insertOne({
          ...currentConfig,
          archivedAt: now,
          archivedBy: user.id
        })
        await configs.updateOne({ id: currentConfig.id }, { $set: { isActive: false } })
      }

      // Create new version
      const newVersion = currentConfig 
        ? `${parseInt(currentConfig.version.split('.')[0]) + 1}.0.0`
        : '1.0.0'

      const newConfig = {
        id: uuidv4(),
        version: newVersion,
        ...DEFAULT_CONFIG,
        ...data,
        isActive: true,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await configs.insertOne(newConfig)
      return successResponse({ config: sanitizeDocument(newConfig), created: true }, 201)
    }

    // Update specific section
    if (section && data) {
      if (currentConfig) {
        const updateData = {
          [section]: data,
          updatedAt: now,
          updatedBy: user.id
        }
        await configs.updateOne({ id: currentConfig.id }, { $set: updateData })
        const updated = await configs.findOne({ id: currentConfig.id })
        return successResponse({ config: sanitizeDocument(updated) })
      } else {
        // Create new config with section
        const newConfig = {
          id: uuidv4(),
          version: '1.0.0',
          ...DEFAULT_CONFIG,
          [section]: data,
          isActive: true,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }
        await configs.insertOne(newConfig)
        return successResponse({ config: sanitizeDocument(newConfig), created: true }, 201)
      }
    }

    // Initialize with default config
    if (!currentConfig) {
      const newConfig = {
        id: uuidv4(),
        version: '1.0.0',
        ...DEFAULT_CONFIG,
        ...data,
        isActive: true,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }
      await configs.insertOne(newConfig)
      return successResponse({ config: sanitizeDocument(newConfig), created: true }, 201)
    }

    return errorResponse('Invalid request', 400)
  } catch (error) {
    console.error('Furniture Config POST Error:', error)
    return errorResponse('Failed to save configuration', 500, error.message)
  }
}

// PUT - Update configuration
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configs = db.collection('furniture_config')

    const now = new Date().toISOString()
    const query = id ? { id } : { isActive: true }

    const result = await configs.findOneAndUpdate(
      query,
      { 
        $set: { 
          ...updateData, 
          updatedAt: now,
          updatedBy: user.id 
        } 
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Configuration not found', 404)
    }

    return successResponse({ config: sanitizeDocument(result) })
  } catch (error) {
    console.error('Furniture Config PUT Error:', error)
    return errorResponse('Failed to update configuration', 500, error.message)
  }
}
