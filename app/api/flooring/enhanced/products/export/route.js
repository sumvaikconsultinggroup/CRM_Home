import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { optionsResponse, errorResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function getByPath(obj, path) {
  if (!path) return undefined
  const parts = path.split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

// Export products to CSV.
// Query params:
// - search, categoryId, brand, status
// - columns: comma-separated keys, e.g. name,sku,brand,pricing.sellingPrice
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const brand = searchParams.get('brand')
    const status = searchParams.get('status')
    const columnsParam = searchParams.get('columns')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const productsCol = db.collection('flooring_products')

    const query = { status: { $ne: 'deleted' } }
    if (categoryId) query.categoryId = categoryId
    if (brand) query.brand = brand
    if (status) query.status = status
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ]
    }

    const products = sanitizeDocuments(await productsCol.find(query).sort({ createdAt: -1 }).toArray())

    const defaultColumns = [
      'name',
      'sku',
      'brand',
      'collection',
      'categoryId',
      'pricing.costPrice',
      'pricing.mrp',
      'pricing.dealerPrice',
      'pricing.sellingPrice',
      'pack.coverageSqftPerBox',
      'tax.hsnCode',
      'tax.gstRate',
      'status'
    ]

    const columns = (columnsParam ? columnsParam.split(',') : defaultColumns).map(c => c.trim()).filter(Boolean)

    const header = columns.join(',')
    const lines = [header]

    for (const p of products) {
      const row = columns.map(col => csvEscape(getByPath(p, col)))
      lines.push(row.join(','))
    }

    const csv = lines.join('\n')

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="flooring-products-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    })
  } catch (error) {
    console.error('Products Export Error:', error)
    return errorResponse('Failed to export products', 500, error.message)
  }
}
