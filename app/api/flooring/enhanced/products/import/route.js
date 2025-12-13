import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}


function normalizeSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseCsv(csvText) {
  // Minimal CSV parser that supports quoted values and commas/newlines inside quotes.
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i]
    const next = csvText[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ',') {
      row.push(cur)
      cur = ''
      continue
    }

    if (ch === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
      continue
    }

    if (ch === '\r') {
      continue
    }

    cur += ch
  }

  // last cell
  row.push(cur)
  rows.push(row)

  // Remove empty last row
  if (rows.length && rows[rows.length - 1].every(c => String(c || '').trim() === '')) rows.pop()

  return rows
}

function toNumber(v) {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  const n = Number(s)
  // eslint-disable-next-line no-restricted-globals
  return isNaN(n) ? undefined : n
}

function toBoolean(v) {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim().toLowerCase()
  if (!s) return undefined
  if (['1', 'true', 'yes', 'y'].includes(s)) return true
  if (['0', 'false', 'no', 'n'].includes(s)) return false
  return undefined
}

function setByPath(obj, path, value) {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

// POST: import products from CSV
// Body can be either:
// { csv: "..." , upsertBySku: true }
// OR { rows: [{...}] , upsertBySku: true }
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const upsertBySku = body.upsertBySku !== false

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const productsCol = db.collection('flooring_products')
    const inventoryCol = db.collection('flooring_inventory_v2')

    let items = []

    if (body.csv) {
      const rows = parseCsv(String(body.csv))
      if (rows.length < 2) return errorResponse('CSV must include header row and at least one data row', 400)

      const header = rows[0].map(h => String(h || '').trim()).filter(Boolean)
      for (const r of rows.slice(1)) {
        const obj = {}
        for (let i = 0; i < header.length; i++) {
          obj[header[i]] = r[i]
        }
        items.push(obj)
      }
    } else if (Array.isArray(body.rows)) {
      items = body.rows
    } else {
      return errorResponse('Provide either {csv} or {rows}', 400)
    }

    const now = new Date().toISOString()
    const results = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] }

    for (const raw of items) {
      try {
        const sku = String(raw.sku || raw.SKU || '').trim()
        const name = String(raw.name || raw.Name || '').trim()

        if (!name) {
          results.skipped++
          results.errors.push({ sku, error: 'Missing name' })
          continue
        }

        const doc = {
          name,
          sku: sku || undefined,
          brand: raw.brand || raw.Brand || '',
          collection: raw.collection || raw.Collection || '',
          categoryId: raw.categoryId || '',
          description: raw.description || raw.Description || '',
          status: (raw.status || raw.Status || 'active').toLowerCase(),
          images: []
        }

        // common numeric fields
        const numericMappings = {
          'pricing.costPrice': raw['pricing.costPrice'] ?? raw.costPrice,
          'pricing.mrp': raw['pricing.mrp'] ?? raw.mrp,
          'pricing.dealerPrice': raw['pricing.dealerPrice'] ?? raw.dealerPrice,
          'pricing.sellingPrice': raw['pricing.sellingPrice'] ?? raw.sellingPrice,
          'pack.coverageSqftPerBox': raw['pack.coverageSqftPerBox'] ?? raw.sqftPerBox ?? raw.coverageSqftPerBox,
          'tax.gstRate': raw['tax.gstRate'] ?? raw.gstRate,
          'specs.thicknessMm': raw['specs.thicknessMm'] ?? raw.thicknessMm,
          'specs.widthMm': raw['specs.widthMm'] ?? raw.widthMm,
          'specs.lengthMm': raw['specs.lengthMm'] ?? raw.lengthMm,
          'specs.wearLayerMm': raw['specs.wearLayerMm'] ?? raw.wearLayerMm,
          'specs.janka': raw['specs.janka'] ?? raw.janka,
          'specs.warrantyYearsResidential': raw['specs.warrantyYearsResidential'] ?? raw.warrantyYearsResidential,
          'specs.warrantyYearsCommercial': raw['specs.warrantyYearsCommercial'] ?? raw.warrantyYearsCommercial
        }
        for (const [path, val] of Object.entries(numericMappings)) {
          const n = toNumber(val)
          if (n !== undefined) setByPath(doc, path, n)
        }

        // booleans
        const boolMappings = {
          'installation.underlayment': raw['installation.underlayment'] ?? raw.underlayment,
          'installation.radiantHeat': raw['installation.radiantHeat'] ?? raw.radiantHeat,
          'compliance.fsc': raw['compliance.fsc'] ?? raw.fsc,
          'compliance.greenguard': raw['compliance.greenguard'] ?? raw.greenguard,
          'compliance.voc': raw['compliance.voc'] ?? raw.voc
        }
        for (const [path, val] of Object.entries(boolMappings)) {
          const b = toBoolean(val)
          if (b !== undefined) setByPath(doc, path, b)
        }

        // misc nested text fields
        const textMappings = {
          'specs.construction': raw['specs.construction'] ?? raw.construction,
          'specs.species': raw['specs.species'] ?? raw.species,
          'specs.origin': raw['specs.origin'] ?? raw.origin,
          'specs.grade': raw['specs.grade'] ?? raw.grade,
          'specs.coreType': raw['specs.coreType'] ?? raw.coreType,
          'specs.finish': raw['specs.finish'] ?? raw.finish,
          'specs.colorTone': raw['specs.colorTone'] ?? raw.colorTone,
          'specs.stain': raw['specs.stain'] ?? raw.stain,
          'specs.texture': raw['specs.texture'] ?? raw.texture,
          'specs.edge': raw['specs.edge'] ?? raw.edge,
          'specs.acRating': raw['specs.acRating'] ?? raw.acRating,
          'specs.waterResistance': raw['specs.waterResistance'] ?? raw.waterResistance,
          'specs.wearRating': raw['specs.wearRating'] ?? raw.wearRating,
          'installation.method': raw['installation.method'] ?? raw.installationMethod,
          'installation.subfloor': raw['installation.subfloor'] ?? raw.subfloor,
          'installation.installationNotes': raw['installation.installationNotes'] ?? raw.installationNotes,
          'compliance.fireRating': raw['compliance.fireRating'] ?? raw.fireRating,
          'tax.hsnCode': raw['tax.hsnCode'] ?? raw.hsnCode
        }
        for (const [path, val] of Object.entries(textMappings)) {
          const s = val === null || val === undefined ? '' : String(val).trim()
          if (s) setByPath(doc, path, s)
        }

        // Images
        const imagesRaw = raw.images || raw.Images || ''
        if (imagesRaw) {
          const parts = String(imagesRaw).split(',').map(s => s.trim()).filter(Boolean)
          doc.images = parts
        }

        // Custom fields: any columns with prefix custom.
        // e.g., custom.leadTimeDays, custom.manufacturerCode
        for (const [k, v] of Object.entries(raw)) {
          if (!k) continue
          const key = String(k).trim()
          if (!key.startsWith('custom.')) continue
          const s = v === null || v === undefined ? '' : String(v)
          if (!s.trim()) continue
          setByPath(doc, key, s.trim())
        }

        const existing = upsertBySku && sku
          ? await productsCol.findOne({ sku, status: { $ne: 'deleted' } })
          : null

        if (existing) {
          await productsCol.updateOne(
            { id: existing.id },
            { $set: { ...doc, updatedAt: now, updatedBy: user.id } }
          )
          results.updated++
        } else {
          const id = uuidv4()
          const product = {
            id,
            ...doc,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          }
          await productsCol.insertOne(product)

          // Ensure inventory record exists
          await inventoryCol.updateOne(
            { productId: id, warehouseId: 'main' },
            {
              $setOnInsert: {
                id: uuidv4(),
                productId: id,
                warehouseId: 'main',
                quantity: 0,
                reservedQty: 0,
                availableQty: 0,
                avgCostPrice: product?.pricing?.costPrice || 0,
                reorderLevel: 100,
                batches: [],
                createdAt: now,
                updatedAt: now
              }
            },
            { upsert: true }
          )

          results.created++
        }
      } catch (err) {
        results.failed++
        results.errors.push({ sku: raw?.sku, error: err.message })
      }
    }

    return successResponse({ message: 'Import completed', results })
  } catch (error) {
    console.error('Products Import Error:', error)
    return errorResponse('Failed to import products', 500, error.message)
  }
}
