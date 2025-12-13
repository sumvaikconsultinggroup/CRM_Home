import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

const DEFAULT_CATEGORIES = [
  { name: 'Hardwood', slug: 'hardwood', color: 'bg-amber-100 text-amber-700', parentSlug: null },
  { name: 'Engineered Wood', slug: 'engineered', color: 'bg-emerald-100 text-emerald-700', parentSlug: null },
  { name: 'Laminate', slug: 'laminate', color: 'bg-blue-100 text-blue-700', parentSlug: null },
  { name: 'Bamboo', slug: 'bamboo', color: 'bg-green-100 text-green-700', parentSlug: null },
  { name: 'Parquet', slug: 'parquet', color: 'bg-purple-100 text-purple-700', parentSlug: null },
  { name: 'Decking', slug: 'decking', color: 'bg-orange-100 text-orange-700', parentSlug: null },
  { name: 'Accessories', slug: 'accessories', color: 'bg-slate-100 text-slate-700', parentSlug: null },
  { name: 'Skirting & Profiles', slug: 'profiles', color: 'bg-slate-100 text-slate-700', parentSlug: 'accessories' },
  { name: 'Adhesives', slug: 'adhesives', color: 'bg-slate-100 text-slate-700', parentSlug: 'accessories' },
  { name: 'Underlayment', slug: 'underlayment', color: 'bg-slate-100 text-slate-700', parentSlug: 'accessories' }
]

function normalizeSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function ensureDefaultCategories(categoriesCollection, userId) {
  const count = await categoriesCollection.countDocuments({ status: { $ne: 'deleted' } })
  if (count > 0) return

  const now = new Date().toISOString()
  const created = new Map()

  // Create parents first
  for (const cat of DEFAULT_CATEGORIES.filter(c => !c.parentSlug)) {
    const id = uuidv4()
    created.set(cat.slug, id)
    await categoriesCollection.insertOne({
      id,
      name: cat.name,
      slug: cat.slug,
      parentId: null,
      color: cat.color,
      status: 'active',
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    })
  }

  // Create children
  for (const cat of DEFAULT_CATEGORIES.filter(c => c.parentSlug)) {
    const id = uuidv4()
    const parentId = created.get(cat.parentSlug) || null
    created.set(cat.slug, id)
    await categoriesCollection.insertOne({
      id,
      name: cat.name,
      slug: cat.slug,
      parentId,
      color: cat.color,
      status: 'active',
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    })
  }
}

// GET: list categories (optionally as tree)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const tree = searchParams.get('tree') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('flooring_categories')

    await ensureDefaultCategories(categories, user.id)

    const docs = await categories
      .find({ status: { $ne: 'deleted' } })
      .sort({ name: 1 })
      .toArray()

    const sanitized = sanitizeDocuments(docs)

    if (!tree) return successResponse({ categories: sanitized })

    const byId = new Map(sanitized.map(c => [c.id, { ...c, children: [] }]))
    const roots = []

    for (const cat of byId.values()) {
      if (cat.parentId && byId.has(cat.parentId)) byId.get(cat.parentId).children.push(cat)
      else roots.push(cat)
    }

    return successResponse({ categories: roots })
  } catch (error) {
    console.error('Categories GET Error:', error)
    return errorResponse('Failed to fetch categories', 500, error.message)
  }
}

// POST: create category
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const name = String(body.name || '').trim()
    if (!name) return errorResponse('Category name is required', 400)

    const slug = normalizeSlug(body.slug || name)
    const color = body.color || 'bg-slate-100 text-slate-700'
    const parentId = body.parentId || null

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('flooring_categories')

    const existing = await categories.findOne({ slug, status: { $ne: 'deleted' } })
    if (existing) return errorResponse('Category slug already exists', 409)

    const now = new Date().toISOString()
    const category = {
      id: uuidv4(),
      name,
      slug,
      parentId,
      color,
      status: 'active',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await categories.insertOne(category)
    return successResponse({ category: sanitizeDocument(category) }, 201)
  } catch (error) {
    console.error('Categories POST Error:', error)
    return errorResponse('Failed to create category', 500, error.message)
  }
}

// PUT: update category
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id } = body
    if (!id) return errorResponse('Category ID required', 400)

    const update = {}
    if (body.name !== undefined) update.name = String(body.name || '').trim()
    if (body.slug !== undefined) update.slug = normalizeSlug(body.slug || body.name)
    if (body.parentId !== undefined) update.parentId = body.parentId || null
    if (body.color !== undefined) update.color = body.color || 'bg-slate-100 text-slate-700'
    if (body.status !== undefined) update.status = body.status

    update.updatedAt = new Date().toISOString()
    update.updatedBy = user.id

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('flooring_categories')

    // slug uniqueness check if slug is being changed
    if (update.slug) {
      const dup = await categories.findOne({ slug: update.slug, id: { $ne: id }, status: { $ne: 'deleted' } })
      if (dup) return errorResponse('Category slug already exists', 409)
    }

    const result = await categories.findOneAndUpdate(
      { id, status: { $ne: 'deleted' } },
      { $set: update },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Category not found', 404)
    return successResponse({ category: sanitizeDocument(result) })
  } catch (error) {
    console.error('Categories PUT Error:', error)
    return errorResponse('Failed to update category', 500, error.message)
  }
}

// DELETE: soft delete category
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return errorResponse('Category ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const categories = db.collection('flooring_categories')

    await categories.updateOne(
      { id },
      { $set: { status: 'deleted', deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'Category deleted' })
  } catch (error) {
    console.error('Categories DELETE Error:', error)
    return errorResponse('Failed to delete category', 500, error.message)
  }
}
