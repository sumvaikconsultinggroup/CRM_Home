import { getClientDb } from '@/lib/db/multitenancy'
import { getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Module field configurations for different industry modules
const MODULE_FIELD_CONFIGS = {
  // Wooden Flooring Module
  'wooden-flooring': {
    name: 'Wooden Flooring',
    unit: 'sqft',
    gstRate: 18,
    fields: [
      { key: 'woodType', label: 'Wood Type', type: 'select', options: ['Oak', 'Maple', 'Walnut', 'Teak', 'Pine', 'Bamboo', 'Cherry', 'Other'] },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Semi-Gloss', 'Glossy', 'Oiled', 'Lacquered', 'Waxed'] },
      { key: 'thickness', label: 'Thickness (mm)', type: 'number', min: 1, max: 50 },
      { key: 'width', label: 'Width (mm)', type: 'number', min: 50, max: 500 },
      { key: 'length', label: 'Length (mm)', type: 'number', min: 100, max: 5000 },
      { key: 'grade', label: 'Grade', type: 'select', options: ['A Grade', 'B Grade', 'C Grade', 'Select Grade', 'Rustic'] },
      { key: 'pattern', label: 'Pattern', type: 'select', options: ['Plank', 'Herringbone', 'Chevron', 'Parquet', 'Strip'] }
    ]
  },
  
  // Doors & Windows Module
  'doors-and-windows': {
    name: 'Doors & Windows',
    unit: 'pcs',
    gstRate: 18,
    fields: [
      { key: 'doorWindowType', label: 'Type', type: 'select', options: ['Door', 'Window', 'French Door', 'Sliding Door', 'Casement Window', 'Bay Window', 'Skylight'] },
      { key: 'material', label: 'Material', type: 'select', options: ['Wood', 'uPVC', 'Aluminum', 'Steel', 'Composite', 'Glass'] },
      { key: 'frameWidth', label: 'Frame Width (mm)', type: 'number' },
      { key: 'frameHeight', label: 'Frame Height (mm)', type: 'number' },
      { key: 'glassType', label: 'Glass Type', type: 'select', options: ['Single Pane', 'Double Pane', 'Triple Pane', 'Tempered', 'Laminated', 'Tinted', 'None'] },
      { key: 'color', label: 'Color/Finish', type: 'text' },
      { key: 'lockType', label: 'Lock Type', type: 'select', options: ['Mortise Lock', 'Deadbolt', 'Smart Lock', 'Multi-point Lock', 'None'] },
      { key: 'fireRating', label: 'Fire Rating', type: 'select', options: ['None', '30 min', '60 min', '90 min', '120 min'] }
    ]
  },
  
  // Kitchen Module
  'kitchen': {
    name: 'Kitchen',
    unit: 'pcs',
    gstRate: 18,
    fields: [
      { key: 'cabinetType', label: 'Cabinet Type', type: 'select', options: ['Base Cabinet', 'Wall Cabinet', 'Tall Cabinet', 'Corner Cabinet', 'Drawer Unit', 'Pantry'] },
      { key: 'material', label: 'Material', type: 'select', options: ['Plywood', 'MDF', 'Particleboard', 'Solid Wood', 'Stainless Steel'] },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Laminate', 'Acrylic', 'PU Paint', 'Membrane', 'Veneer', 'Glass'] },
      { key: 'width', label: 'Width (mm)', type: 'number' },
      { key: 'height', label: 'Height (mm)', type: 'number' },
      { key: 'depth', label: 'Depth (mm)', type: 'number' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'softClose', label: 'Soft Close Hinges', type: 'boolean' }
    ]
  },
  
  // Modular Furniture Module
  'modular-furniture': {
    name: 'Modular Furniture',
    unit: 'pcs',
    gstRate: 18,
    fields: [
      { key: 'furnitureType', label: 'Furniture Type', type: 'select', options: ['Wardrobe', 'TV Unit', 'Study Table', 'Bookshelf', 'Shoe Rack', 'Display Unit', 'Dressing Table'] },
      { key: 'material', label: 'Material', type: 'select', options: ['Plywood', 'MDF', 'Particleboard', 'Solid Wood', 'Metal'] },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Laminate', 'Acrylic', 'Veneer', 'PU Paint', 'Membrane'] },
      { key: 'width', label: 'Width (mm)', type: 'number' },
      { key: 'height', label: 'Height (mm)', type: 'number' },
      { key: 'depth', label: 'Depth (mm)', type: 'number' },
      { key: 'style', label: 'Style', type: 'select', options: ['Modern', 'Contemporary', 'Traditional', 'Minimalist', 'Industrial'] },
      { key: 'color', label: 'Color', type: 'text' }
    ]
  },
  
  // Flooring (Tiles, etc.)
  'flooring': {
    name: 'Flooring',
    unit: 'sqft',
    gstRate: 18,
    fields: [
      { key: 'flooringType', label: 'Flooring Type', type: 'select', options: ['Ceramic Tile', 'Vitrified Tile', 'Marble', 'Granite', 'Laminate', 'Vinyl', 'Carpet'] },
      { key: 'size', label: 'Size', type: 'select', options: ['12x12 inch', '24x24 inch', '30x30 cm', '60x60 cm', '60x120 cm', 'Custom'] },
      { key: 'thickness', label: 'Thickness (mm)', type: 'number' },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Glossy', 'Matte', 'Semi-Polished', 'Textured', 'Anti-Skid'] },
      { key: 'color', label: 'Color/Pattern', type: 'text' },
      { key: 'grade', label: 'Grade', type: 'select', options: ['Premium', 'Standard', 'Economy'] },
      { key: 'slipResistance', label: 'Slip Resistance', type: 'select', options: ['R9', 'R10', 'R11', 'R12', 'R13'] }
    ]
  },
  
  // Interior Designers Module
  'interior-designers': {
    name: 'Interior Design',
    unit: 'pcs',
    gstRate: 18,
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: ['Furniture', 'Lighting', 'Decor', 'Textile', 'Art', 'Hardware'] },
      { key: 'style', label: 'Style', type: 'select', options: ['Modern', 'Contemporary', 'Traditional', 'Minimalist', 'Bohemian', 'Industrial', 'Scandinavian'] },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'leadTime', label: 'Lead Time (days)', type: 'number' }
    ]
  },
  
  // Painting Module
  'painting': {
    name: 'Painting',
    unit: 'ltr',
    gstRate: 18,
    fields: [
      { key: 'paintType', label: 'Paint Type', type: 'select', options: ['Interior', 'Exterior', 'Primer', 'Emulsion', 'Enamel', 'Wood Paint', 'Metal Paint'] },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Eggshell', 'Satin', 'Semi-Gloss', 'Glossy'] },
      { key: 'coverage', label: 'Coverage (sqft/ltr)', type: 'number' },
      { key: 'dryingTime', label: 'Drying Time', type: 'select', options: ['2-4 hours', '4-6 hours', '6-8 hours', '24 hours', '48 hours'] },
      { key: 'color', label: 'Color/Shade', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'voc', label: 'VOC Level', type: 'select', options: ['Zero VOC', 'Low VOC', 'Standard'] }
    ]
  },
  
  // Default/Generic Module
  'default': {
    name: 'General',
    unit: 'pcs',
    gstRate: 18,
    fields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' }
    ]
  }
}

// GET - Get module fields configuration
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const all = searchParams.get('all') === 'true'

    // Return all module configurations
    if (all) {
      return successResponse({
        modules: MODULE_FIELD_CONFIGS
      })
    }

    // Return specific module configuration
    if (moduleId) {
      const config = MODULE_FIELD_CONFIGS[moduleId] || MODULE_FIELD_CONFIGS['default']
      return successResponse({
        moduleId,
        ...config
      })
    }

    // Get synced module configuration from sync config
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const syncConfigCollection = db.collection('inventory_sync_config')
    
    const syncConfig = await syncConfigCollection.findOne({ clientId: user.clientId })
    
    if (syncConfig?.syncedModuleId) {
      const config = MODULE_FIELD_CONFIGS[syncConfig.syncedModuleId] || MODULE_FIELD_CONFIGS['default']
      return successResponse({
        moduleId: syncConfig.syncedModuleId,
        moduleName: syncConfig.syncedModuleName,
        ...config,
        isSynced: true
      })
    }

    // Return default configuration
    return successResponse({
      moduleId: 'default',
      ...MODULE_FIELD_CONFIGS['default'],
      isSynced: false
    })
  } catch (error) {
    console.error('Module Fields GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to get module fields', 500, error.message)
  }
}
