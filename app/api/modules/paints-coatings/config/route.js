import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Default configurations
const DEFAULT_PRODUCT_FAMILIES = [
  { id: 'interior_paint', name: 'Interior Paint', description: 'For indoor walls and surfaces' },
  { id: 'exterior_paint', name: 'Exterior Paint', description: 'Weather-resistant outdoor paints' },
  { id: 'primer', name: 'Primers', description: 'Surface preparation primers' },
  { id: 'putty', name: 'Putty', description: 'Wall putty and fillers' },
  { id: 'enamel', name: 'Enamel', description: 'Enamel paints for wood and metal' },
  { id: 'wood_polish', name: 'Wood Polish', description: 'Wood finishing and polish' },
  { id: 'waterproofing', name: 'Waterproofing', description: 'Waterproofing solutions' },
  { id: 'epoxy', name: 'Epoxy', description: 'Epoxy coatings and paints' },
  { id: 'pu_coating', name: 'PU Coating', description: 'Polyurethane coatings' },
  { id: 'microcement', name: 'Microcement', description: 'Decorative microcement' },
  { id: 'texture', name: 'Texture', description: 'Textured wall finishes' },
  { id: 'metallic', name: 'Metallic', description: 'Metallic effect paints' },
  { id: 'protective', name: 'Protective Coatings', description: 'Industrial protective coatings' },
  { id: 'floor_coating', name: 'Floor Coatings', description: 'Floor paints and coatings' }
]

const DEFAULT_FINISH_TYPES = [
  { id: 'matte', name: 'Matte', sheen: 0, description: 'No shine, hides imperfections' },
  { id: 'satin', name: 'Satin', sheen: 25, description: 'Subtle sheen, easy to clean' },
  { id: 'eggshell', name: 'Eggshell', sheen: 15, description: 'Low sheen, velvety look' },
  { id: 'semi_gloss', name: 'Semi-Gloss', sheen: 50, description: 'Moderate shine, durable' },
  { id: 'gloss', name: 'Gloss', sheen: 75, description: 'High shine, very durable' },
  { id: 'high_gloss', name: 'High Gloss', sheen: 90, description: 'Maximum shine, mirror-like' },
  { id: 'textured', name: 'Textured', sheen: 0, description: 'Three-dimensional texture' }
]

const DEFAULT_BASE_TYPES = [
  { id: 'water_based', name: 'Water-Based', voc: 'low', dryTime: 'fast', cleanup: 'water' },
  { id: 'solvent_based', name: 'Solvent-Based', voc: 'high', dryTime: 'slow', cleanup: 'thinner' },
  { id: '2k', name: '2K (Two Component)', voc: 'medium', dryTime: 'medium', cleanup: 'thinner' },
  { id: '3k', name: '3K (Three Component)', voc: 'medium', dryTime: 'slow', cleanup: 'thinner' }
]

const DEFAULT_SURFACE_TYPES = [
  { id: 'new_plaster', name: 'New Plaster', prepSteps: ['curing', 'sanding', 'dusting'] },
  { id: 'old_paint', name: 'Old Paint', prepSteps: ['scraping', 'sanding', 'cleaning'] },
  { id: 'wood', name: 'Wood', prepSteps: ['sanding', 'filling', 'priming'] },
  { id: 'metal', name: 'Metal', prepSteps: ['rust_removal', 'degreasing', 'priming'] },
  { id: 'concrete', name: 'Concrete', prepSteps: ['cleaning', 'etching', 'priming'] },
  { id: 'tiles', name: 'Tiles', prepSteps: ['cleaning', 'roughening', 'priming'] },
  { id: 'stone', name: 'Stone', prepSteps: ['cleaning', 'sealing'] },
  { id: 'floor', name: 'Floor', prepSteps: ['cleaning', 'etching', 'priming'] }
]

const DEFAULT_CONDITION_GRADES = [
  { id: 'good', name: 'Good Condition', multiplier: 1.0, description: 'Minor prep required' },
  { id: 'minor_cracks', name: 'Minor Cracks', multiplier: 1.1, description: 'Hairline cracks, minor repairs' },
  { id: 'dampness', name: 'Dampness', multiplier: 1.3, description: 'Moisture issues, waterproofing needed' },
  { id: 'seepage', name: 'Seepage', multiplier: 1.5, description: 'Active water seepage, major treatment' },
  { id: 'fungal', name: 'Fungal/Mold', multiplier: 1.4, description: 'Fungal growth, anti-fungal treatment' },
  { id: 'peeling', name: 'Peeling Paint', multiplier: 1.2, description: 'Paint peeling, scraping required' },
  { id: 'severe', name: 'Severe Damage', multiplier: 1.6, description: 'Major repairs needed' }
]

// GET - Get all configurations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const configType = searchParams.get('type')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const config = db.collection('paints_config')

    if (configType) {
      let configDoc = await config.findOne({ type: configType })
      
      // Return defaults if not customized
      if (!configDoc) {
        const defaults = {
          product_families: DEFAULT_PRODUCT_FAMILIES,
          finish_types: DEFAULT_FINISH_TYPES,
          base_types: DEFAULT_BASE_TYPES,
          surface_types: DEFAULT_SURFACE_TYPES,
          condition_grades: DEFAULT_CONDITION_GRADES
        }
        
        if (defaults[configType]) {
          return successResponse({ 
            config: { type: configType, items: defaults[configType], isDefault: true } 
          })
        }
        return errorResponse('Configuration type not found', 404)
      }
      
      return successResponse({ config: sanitizeDocument(configDoc) })
    }

    // Return all configurations
    const allConfigs = await config.find({}).toArray()
    
    // Merge with defaults for any missing configs
    const configMap = {}
    allConfigs.forEach(c => { configMap[c.type] = c })
    
    const result = {
      module_settings: configMap.module_settings || null,
      product_families: configMap.product_families || { type: 'product_families', items: DEFAULT_PRODUCT_FAMILIES, isDefault: true },
      finish_types: configMap.finish_types || { type: 'finish_types', items: DEFAULT_FINISH_TYPES, isDefault: true },
      base_types: configMap.base_types || { type: 'base_types', items: DEFAULT_BASE_TYPES, isDefault: true },
      surface_types: configMap.surface_types || { type: 'surface_types', items: DEFAULT_SURFACE_TYPES, isDefault: true },
      condition_grades: configMap.condition_grades || { type: 'condition_grades', items: DEFAULT_CONDITION_GRADES, isDefault: true },
      pipelines: configMap.pipelines || null,
      forms: configMap.forms || null,
      qc_templates: configMap.qc_templates || null,
      automation_rules: configMap.automation_rules || null
    }

    return successResponse({ configs: result })
  } catch (error) {
    console.error('Paints Config GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch configuration', 500, error.message)
  }
}

// POST - Create or update configuration
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { type, items, ...otherData } = body

    if (!type) {
      return errorResponse('Configuration type is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const config = db.collection('paints_config')

    const now = new Date().toISOString()
    
    const configDoc = {
      type,
      items: items || [],
      ...otherData,
      clientId: user.clientId,
      updatedAt: now,
      updatedBy: user.id
    }

    await config.updateOne(
      { type },
      { 
        $set: configDoc,
        $setOnInsert: { id: uuidv4(), createdAt: now, createdBy: user.id }
      },
      { upsert: true }
    )

    return successResponse({ message: 'Configuration saved', config: configDoc })
  } catch (error) {
    console.error('Paints Config POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to save configuration', 500, error.message)
  }
}

// DELETE - Reset configuration to defaults
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const configType = searchParams.get('type')

    if (!configType) {
      return errorResponse('Configuration type is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const config = db.collection('paints_config')

    await config.deleteOne({ type: configType })

    return successResponse({ message: 'Configuration reset to defaults' })
  } catch (error) {
    console.error('Paints Config DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to reset configuration', 500, error.message)
  }
}
