import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get material library for visual selection
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // wood, fabric, leather, laminate, veneer, metal, glass, stone
    const search = searchParams.get('search')
    const brand = searchParams.get('brand')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const materials = db.collection('furniture_materials')
    const swatches = db.collection('furniture_material_swatches')

    // Get materials with their visual swatches
    const query = { isActive: true }
    if (category) query.category = category
    if (brand) query.brand = brand
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'tags': { $regex: search, $options: 'i' } }
      ]
    }

    const materialList = await materials.find(query).sort({ category: 1, name: 1 }).toArray()

    // Get all swatches
    const allSwatches = await swatches.find({ isActive: true }).toArray()
    const swatchMap = allSwatches.reduce((acc, s) => {
      if (!acc[s.materialId]) acc[s.materialId] = []
      acc[s.materialId].push(s)
      return acc
    }, {})

    // Enhance materials with swatches
    const enrichedMaterials = materialList.map(mat => ({
      ...mat,
      swatches: swatchMap[mat.id] || [],
      primarySwatch: swatchMap[mat.id]?.find(s => s.isPrimary) || swatchMap[mat.id]?.[0] || null
    }))

    // Group by category for visual display
    const byCategory = enrichedMaterials.reduce((acc, mat) => {
      const cat = mat.category || 'other'
      if (!acc[cat]) acc[cat] = { materials: [], count: 0 }
      acc[cat].materials.push(mat)
      acc[cat].count++
      return acc
    }, {})

    // Category display config
    const categoryConfig = {
      wood: { label: 'Wood & Veneer', icon: 'tree', description: 'Natural wood grains and veneers' },
      laminate: { label: 'Laminates', icon: 'layers', description: 'Decorative laminates and HPL' },
      fabric: { label: 'Fabrics', icon: 'shirt', description: 'Upholstery fabrics and textiles' },
      leather: { label: 'Leather', icon: 'beef', description: 'Genuine and faux leather options' },
      metal: { label: 'Metal Finishes', icon: 'box', description: 'Metal hardware and frame finishes' },
      glass: { label: 'Glass', icon: 'square', description: 'Glass types and treatments' },
      stone: { label: 'Stone & Marble', icon: 'mountain', description: 'Natural stone surfaces' },
      paint: { label: 'Paint & Polish', icon: 'paintbrush', description: 'Paint colors and polishes' }
    }

    return successResponse({
      materials: sanitizeDocuments(enrichedMaterials),
      byCategory,
      categoryConfig,
      totalCount: enrichedMaterials.length
    })
  } catch (error) {
    console.error('Material Library GET Error:', error)
    return errorResponse('Failed to fetch material library', 500, error.message)
  }
}

// POST - Create material swatch
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const swatches = db.collection('furniture_material_swatches')

    const now = new Date().toISOString()
    const swatchId = uuidv4()

    const swatch = {
      id: swatchId,
      materialId: body.materialId,
      // Visual
      name: body.name,
      code: body.code,
      imageUrl: body.imageUrl, // High-res swatch image
      thumbnailUrl: body.thumbnailUrl,
      // For texture mapping in 3D
      textureUrl: body.textureUrl || body.imageUrl,
      normalMapUrl: body.normalMapUrl || null,
      roughnessMapUrl: body.roughnessMapUrl || null,
      // Color info
      dominantColor: body.dominantColor || '#8B7355',
      colorPalette: body.colorPalette || [],
      // Physical properties (for realistic rendering)
      properties: {
        glossiness: body.glossiness || 0.3, // 0-1
        roughness: body.roughness || 0.7, // 0-1
        metalness: body.metalness || 0, // 0-1
        transparency: body.transparency || 0, // 0-1
        textureScale: body.textureScale || 1
      },
      // Pricing
      priceMultiplier: body.priceMultiplier || 1, // e.g., 1.2 for premium finish
      // Availability
      availability: body.availability || 'in_stock', // in_stock, limited, made_to_order, discontinued
      leadTimeDays: body.leadTimeDays || 0,
      // Display
      isPrimary: body.isPrimary || false,
      sortOrder: body.sortOrder || 0,
      showInConfigurator: body.showInConfigurator !== false,
      // Tags
      tags: body.tags || [],
      // Metadata
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await swatches.insertOne(swatch)

    return successResponse(sanitizeDocument(swatch), 201)
  } catch (error) {
    console.error('Material Library POST Error:', error)
    return errorResponse('Failed to create swatch', 500, error.message)
  }
}
