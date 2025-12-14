import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Generate BOM number
const generateBOMNumber = async (db) => {
  const boms = db.collection('furniture_boms')
  const count = await boms.countDocuments() + 1
  const year = new Date().getFullYear()
  return `BOM-${year}-${String(count).padStart(5, '0')}`
}

// GET - Fetch BOMs
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const productId = searchParams.get('productId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const boms = db.collection('furniture_boms')

    if (id) {
      const bom = await boms.findOne({ id })
      if (!bom) return errorResponse('BOM not found', 404)
      return successResponse(sanitizeDocument(bom))
    }

    const query = { isActive: true }
    if (orderId) query.orderId = orderId
    if (productId) query.productId = productId
    if (status) query.status = status
    if (search) {
      query.$or = [
        { bomNumber: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } }
      ]
    }

    const items = await boms.find(query).sort({ createdAt: -1 }).toArray()

    // Get summary stats
    const stats = await boms.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalMaterialCost: { $sum: '$totalMaterialCost' },
        totalLaborCost: { $sum: '$totalLaborCost' }
      }}
    ]).toArray()

    return successResponse({
      boms: sanitizeDocuments(items),
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s }), {})
    })
  } catch (error) {
    console.error('Furniture BOM GET Error:', error)
    return errorResponse('Failed to fetch BOMs', 500, error.message)
  }
}

// POST - Create BOM
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const boms = db.collection('furniture_boms')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()
    const bomId = uuidv4()
    const bomNumber = await generateBOMNumber(db)

    // Get product info if provided
    let productInfo = {}
    if (body.productId) {
      const product = await db.collection('furniture_products').findOne({ id: body.productId })
      if (product) {
        productInfo = {
          productName: product.name,
          productSku: product.sku,
          productCategory: product.category,
          baseSpecifications: product.specifications
        }
      }
    }

    // Calculate material costs
    const materials = (body.materials || []).map((mat, idx) => {
      const quantity = mat.quantity || 0
      const unitCost = mat.unitCost || 0
      const wastagePercent = mat.wastagePercent || 5
      const requiredQty = quantity * (1 + wastagePercent / 100)
      const totalCost = requiredQty * unitCost

      return {
        id: uuidv4(),
        lineNumber: idx + 1,
        materialId: mat.materialId,
        materialCode: mat.materialCode,
        materialName: mat.materialName,
        category: mat.category,
        specification: mat.specification || '',
        quantity,
        unitOfMeasure: mat.unitOfMeasure || 'piece',
        wastagePercent,
        requiredQty: Math.ceil(requiredQty * 100) / 100,
        unitCost,
        totalCost: Math.ceil(totalCost * 100) / 100,
        // Procurement status
        inStock: mat.inStock || 0,
        toOrder: Math.max(0, Math.ceil(requiredQty) - (mat.inStock || 0)),
        allocated: false
      }
    })

    // Calculate hardware costs
    const hardware = (body.hardware || []).map((hw, idx) => {
      const quantity = hw.quantity || 0
      const unitCost = hw.unitCost || 0
      return {
        id: uuidv4(),
        lineNumber: idx + 1,
        hardwareId: hw.hardwareId,
        hardwareCode: hw.hardwareCode,
        hardwareName: hw.hardwareName,
        brand: hw.brand || '',
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        inStock: hw.inStock || 0,
        toOrder: Math.max(0, quantity - (hw.inStock || 0)),
        allocated: false
      }
    })

    // Calculate labor operations
    const operations = (body.operations || []).map((op, idx) => {
      const hours = op.estimatedHours || 0
      const rate = op.hourlyRate || 0
      return {
        id: uuidv4(),
        sequence: idx + 1,
        operationId: op.operationId || uuidv4(),
        operationName: op.operationName,
        workCenter: op.workCenter || 'general',
        description: op.description || '',
        estimatedHours: hours,
        hourlyRate: rate,
        laborCost: hours * rate,
        setupTime: op.setupTime || 0,
        machineRequired: op.machineRequired || false,
        skillLevel: op.skillLevel || 'standard',
        instructions: op.instructions || '',
        qualityChecks: op.qualityChecks || []
      }
    })

    // Calculate totals
    const totalMaterialCost = materials.reduce((sum, m) => sum + m.totalCost, 0)
    const totalHardwareCost = hardware.reduce((sum, h) => sum + h.totalCost, 0)
    const totalLaborCost = operations.reduce((sum, o) => sum + o.laborCost, 0)
    const overheadPercent = body.overheadPercent || 15
    const overheadCost = (totalMaterialCost + totalHardwareCost + totalLaborCost) * overheadPercent / 100
    const totalCost = totalMaterialCost + totalHardwareCost + totalLaborCost + overheadCost

    const bom = {
      id: bomId,
      bomNumber,
      version: 1,
      // Links
      orderId: body.orderId || null,
      orderLineId: body.orderLineId || null,
      quotationId: body.quotationId || null,
      productId: body.productId || null,
      ...productInfo,
      // Specifications
      quantity: body.quantity || 1,
      dimensions: body.dimensions || {},
      finish: body.finish || '',
      customizations: body.customizations || [],
      // Components
      materials,
      hardware,
      operations,
      // Costing
      totalMaterialCost,
      totalHardwareCost,
      totalLaborCost,
      overheadPercent,
      overheadCost,
      totalCost,
      costPerUnit: totalCost / (body.quantity || 1),
      // Lead time
      estimatedDays: body.estimatedDays || operations.reduce((sum, o) => sum + Math.ceil(o.estimatedHours / 8), 0),
      // Status
      status: 'draft', // draft, approved, in_production, completed, on_hold
      // Notes
      notes: body.notes || '',
      engineeringNotes: body.engineeringNotes || '',
      // Tracking
      statusHistory: [{
        status: 'draft',
        timestamp: now,
        by: user.id,
        notes: 'BOM created'
      }],
      versionHistory: [],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await boms.insertOne(bom)

    await events.insertOne({
      id: uuidv4(),
      type: 'bom.created',
      entityType: 'bom',
      entityId: bomId,
      data: { bomNumber, productName: bom.productName, totalCost },
      userId: user.id,
      timestamp: now
    })

    return successResponse(sanitizeDocument(bom), 201)
  } catch (error) {
    console.error('Furniture BOM POST Error:', error)
    return errorResponse('Failed to create BOM', 500, error.message)
  }
}

// PUT - Update BOM
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('BOM ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const boms = db.collection('furniture_boms')
    const events = db.collection('furniture_events')

    const bom = await boms.findOne({ id })
    if (!bom) return errorResponse('BOM not found', 404)

    const now = new Date().toISOString()

    // Handle actions
    if (action === 'approve') {
      if (bom.status !== 'draft') {
        return errorResponse('Can only approve draft BOMs', 400)
      }

      await boms.updateOne(
        { id },
        {
          $set: { status: 'approved', approvedAt: now, approvedBy: user.id, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'approved',
              timestamp: now,
              by: user.id,
              notes: body.notes || 'BOM approved for production'
            }
          }
        }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'bom.approved',
        entityType: 'bom',
        entityId: id,
        data: { bomNumber: bom.bomNumber },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: 'BOM approved', status: 'approved' })
    }

    if (action === 'release_to_production') {
      if (bom.status !== 'approved') {
        return errorResponse('BOM must be approved first', 400)
      }

      await boms.updateOne(
        { id },
        {
          $set: { status: 'in_production', releasedAt: now, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'in_production',
              timestamp: now,
              by: user.id,
              notes: 'Released to production'
            }
          }
        }
      )

      return successResponse({ message: 'Released to production', status: 'in_production' })
    }

    if (action === 'create_revision') {
      const newVersion = bom.version + 1
      const versionSnapshot = { ...bom, versionNumber: bom.version, savedAt: now }
      delete versionSnapshot.versionHistory

      await boms.updateOne(
        { id },
        {
          $set: { ...updateData, version: newVersion, status: 'draft', updatedAt: now },
          $push: {
            versionHistory: versionSnapshot,
            statusHistory: {
              status: 'draft',
              timestamp: now,
              by: user.id,
              notes: `Revision ${newVersion} created`
            }
          }
        }
      )

      return successResponse({ message: 'Revision created', version: newVersion })
    }

    if (action === 'allocate_materials') {
      // Mark materials as allocated from inventory
      const updatedMaterials = bom.materials.map(m => ({
        ...m,
        allocated: true,
        allocatedAt: now
      }))

      await boms.updateOne(
        { id },
        { $set: { materials: updatedMaterials, materialsAllocated: true, updatedAt: now } }
      )

      return successResponse({ message: 'Materials allocated' })
    }

    // Regular update (only for draft BOMs)
    if (bom.status !== 'draft') {
      return errorResponse('Can only edit draft BOMs', 400)
    }

    updateData.updatedAt = now
    updateData.updatedBy = user.id

    const result = await boms.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Furniture BOM PUT Error:', error)
    return errorResponse('Failed to update BOM', 500, error.message)
  }
}

// DELETE - Delete BOM
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('BOM ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const boms = db.collection('furniture_boms')

    const bom = await boms.findOne({ id })
    if (!bom) return errorResponse('BOM not found', 404)

    if (bom.status === 'in_production') {
      return errorResponse('Cannot delete BOM in production', 400)
    }

    await boms.updateOne(
      { id },
      { $set: { isActive: false, deletedAt: new Date().toISOString(), deletedBy: user.id } }
    )

    return successResponse({ message: 'BOM deleted' })
  } catch (error) {
    console.error('Furniture BOM DELETE Error:', error)
    return errorResponse('Failed to delete BOM', 500, error.message)
  }
}
