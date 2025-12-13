import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// A schema describing product fields. The UI can render create/edit forms dynamically.
// Clients can also extend this schema without code changes.
const DEFAULT_SCHEMA = {
  version: 1,
  sections: [
    {
      key: 'core',
      title: 'Core Details',
      fields: [
        { key: 'name', label: 'Product Name', type: 'text', required: true },
        { key: 'sku', label: 'SKU', type: 'text', required: false, hint: 'Recommended unique identifier (used for import upsert).' },
        { key: 'brand', label: 'Brand', type: 'text' },
        { key: 'collection', label: 'Collection / Series', type: 'text' },
        { key: 'categoryId', label: 'Category', type: 'category', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' }
      ]
    },
    {
      key: 'construction',
      title: 'Construction',
      fields: [
        { key: 'specs.construction', label: 'Construction', type: 'select', options: ['solid', 'engineered', 'laminate', 'bamboo', 'spc', 'lvt', 'other'] },
        { key: 'specs.species', label: 'Species / Wood Type', type: 'text', hint: 'e.g., Oak, Walnut, Teak' },
        { key: 'specs.origin', label: 'Origin', type: 'text' },
        { key: 'specs.grade', label: 'Grade', type: 'text', hint: 'e.g., Select, Natural, Rustic' },
        { key: 'specs.coreType', label: 'Core Type (Engineered)', type: 'text', hint: 'e.g., Birch Plywood, HDF' },
        { key: 'specs.wearLayerMm', label: 'Wear Layer (mm)', type: 'number' }
      ]
    },
    {
      key: 'dimensions',
      title: 'Dimensions',
      fields: [
        { key: 'specs.thicknessMm', label: 'Thickness (mm)', type: 'number' },
        { key: 'specs.widthMm', label: 'Width (mm)', type: 'number' },
        { key: 'specs.lengthMm', label: 'Length (mm)', type: 'number', hint: 'Use average length if random' },
        { key: 'specs.plankType', label: 'Plank Type', type: 'select', options: ['plank', 'herringbone', 'chevron', 'tile', 'other'] },
        { key: 'pack.coverageSqftPerBox', label: 'Coverage per Box (sqft)', type: 'number' },
        { key: 'pack.planksPerBox', label: 'Planks per Box', type: 'number' },
        { key: 'pack.weightKgPerBox', label: 'Weight per Box (kg)', type: 'number' }
      ]
    },
    {
      key: 'finish',
      title: 'Finish & Look',
      fields: [
        { key: 'specs.finish', label: 'Finish', type: 'select', options: ['matte', 'semi-gloss', 'gloss', 'oil', 'uv', 'lacquer', 'unfinished', 'other'] },
        { key: 'specs.colorTone', label: 'Color Tone', type: 'text', hint: 'e.g., Natural, Dark, Grey' },
        { key: 'specs.stain', label: 'Stain', type: 'text' },
        { key: 'specs.texture', label: 'Texture', type: 'select', options: ['smooth', 'brushed', 'hand-scraped', 'wire-brushed', 'distressed', 'embossed', 'other'] },
        { key: 'specs.edge', label: 'Edge / Bevel', type: 'select', options: ['micro-bevel', 'bevel', 'square', 'other'] }
      ]
    },
    {
      key: 'performance',
      title: 'Performance',
      fields: [
        { key: 'specs.janka', label: 'Janka Hardness', type: 'number' },
        { key: 'specs.acRating', label: 'AC Rating (Laminate)', type: 'select', options: ['AC1', 'AC2', 'AC3', 'AC4', 'AC5'] },
        { key: 'specs.waterResistance', label: 'Water Resistance', type: 'select', options: ['none', 'splash', 'waterproof'] },
        { key: 'specs.wearRating', label: 'Wear Rating', type: 'text' },
        { key: 'specs.warrantyYearsResidential', label: 'Warranty (Residential, years)', type: 'number' },
        { key: 'specs.warrantyYearsCommercial', label: 'Warranty (Commercial, years)', type: 'number' }
      ]
    },
    {
      key: 'installation',
      title: 'Installation',
      fields: [
        { key: 'installation.method', label: 'Installation Method', type: 'select', options: ['glue-down', 'nail-down', 'floating', 'click-lock', 'other'] },
        { key: 'installation.subfloor', label: 'Suitable Subfloor', type: 'text', hint: 'e.g., concrete, plywood' },
        { key: 'installation.underlayment', label: 'Underlayment Required', type: 'boolean' },
        { key: 'installation.radiantHeat', label: 'Radiant Heat Compatible', type: 'boolean' },
        { key: 'installation.installationNotes', label: 'Installation Notes', type: 'textarea' }
      ]
    },
    {
      key: 'compliance',
      title: 'Compliance & Sustainability',
      fields: [
        { key: 'compliance.fsc', label: 'FSC Certified', type: 'boolean' },
        { key: 'compliance.greenguard', label: 'Greenguard', type: 'boolean' },
        { key: 'compliance.voc', label: 'Low VOC', type: 'boolean' },
        { key: 'compliance.fireRating', label: 'Fire Rating', type: 'text' }
      ]
    },
    {
      key: 'pricing',
      title: 'Pricing (Tiers)',
      fields: [
        { key: 'pricing.costPrice', label: 'Cost Price (₹/sqft)', type: 'number' },
        { key: 'pricing.mrp', label: 'MRP (₹/sqft)', type: 'number' },
        { key: 'pricing.dealerPrice', label: 'Dealer Price (₹/sqft)', type: 'number' },
        { key: 'pricing.sellingPrice', label: 'Retail / Selling Price (₹/sqft)', type: 'number', required: true },
        { key: 'tax.hsnCode', label: 'HSN Code', type: 'text', defaultValue: '4418' },
        { key: 'tax.gstRate', label: 'GST Rate (%)', type: 'number', defaultValue: 18 }
      ]
    },
    {
      key: 'media',
      title: 'Media',
      fields: [
        { key: 'images', label: 'Image URLs (comma separated)', type: 'text' }
      ]
    }
  ]
}

async function getOrCreateSchema(schemaCollection, userId) {
  let schema = await schemaCollection.findOne({ type: 'product_schema' })
  if (!schema) {
    const now = new Date().toISOString()
    schema = {
      id: uuidv4(),
      type: 'product_schema',
      schema: DEFAULT_SCHEMA,
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    }
    await schemaCollection.insertOne(schema)
  }
  return schema
}

// GET: fetch schema
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const schemaCollection = db.collection('flooring_schemas')

    const doc = await getOrCreateSchema(schemaCollection, user.id)
    return successResponse({ schema: sanitizeDocument(doc).schema })
  } catch (error) {
    console.error('Product Schema GET Error:', error)
    return errorResponse('Failed to fetch product schema', 500, error.message)
  }
}

// POST: replace schema OR add/merge custom fields
// body:
//  - schema: full schema object
//  - OR patch: { sectionKey, fieldsToAdd: [...], fieldsToRemove: [...] }
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const schemaCollection = db.collection('flooring_schemas')

    const existingDoc = await getOrCreateSchema(schemaCollection, user.id)
    const now = new Date().toISOString()

    let nextSchema = existingDoc.schema || DEFAULT_SCHEMA

    if (body.schema) {
      nextSchema = body.schema
    } else if (body.patch) {
      const { sectionKey, fieldsToAdd = [], fieldsToRemove = [] } = body.patch
      nextSchema = {
        ...nextSchema,
        sections: (nextSchema.sections || []).map(sec => {
          if (sec.key !== sectionKey) return sec
          const existingFields = sec.fields || []
          const removeSet = new Set(fieldsToRemove.map(f => f.key))
          const filtered = existingFields.filter(f => !removeSet.has(f.key))
          return { ...sec, fields: [...filtered, ...fieldsToAdd] }
        })
      }
    }

    await schemaCollection.updateOne(
      { id: existingDoc.id },
      { $set: { schema: nextSchema, updatedAt: now, updatedBy: user.id } }
    )

    return successResponse({ message: 'Schema saved', schema: nextSchema })
  } catch (error) {
    console.error('Product Schema POST Error:', error)
    return errorResponse('Failed to save product schema', 500, error.message)
  }
}
