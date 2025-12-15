import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Get user's accessible warehouses or warehouse access list
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const userId = searchParams.get('userId')
    const listAll = searchParams.get('listAll') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const accessCollection = db.collection('wf_warehouse_access')
    const warehouseCollection = db.collection('wf_warehouses')
    const userCollection = db.collection('users')

    // Get all warehouse access records
    if (listAll && (user.role === 'admin' || user.role === 'super_admin')) {
      let query = {}
      if (warehouseId) query.warehouseId = warehouseId
      if (userId) query.userId = userId

      const accessRecords = await accessCollection.find(query).toArray()
      
      // Enrich with warehouse and user names
      const warehouses = await warehouseCollection.find({}).toArray()
      const users = await userCollection.find({}).toArray()
      const whMap = new Map(warehouses.map(w => [w.id, w]))
      const userMap = new Map(users.map(u => [u.id, u]))

      for (const record of accessRecords) {
        record.warehouseName = whMap.get(record.warehouseId)?.name || 'Unknown'
        record.userName = userMap.get(record.userId)?.name || userMap.get(record.userId)?.email || 'Unknown'
      }

      return successResponse({ accessRecords: sanitizeDocuments(accessRecords) })
    }

    // Get warehouses accessible to current user
    const allWarehouses = await warehouseCollection.find({ active: { $ne: false } }).toArray()
    
    // Admins have access to all warehouses
    if (user.role === 'admin' || user.role === 'super_admin') {
      return successResponse({ 
        warehouses: sanitizeDocuments(allWarehouses),
        accessLevel: 'admin',
        hasFullAccess: true
      })
    }

    // Check specific user access
    const userAccess = await accessCollection.find({ userId: user.id, active: true }).toArray()
    const accessibleWarehouseIds = userAccess.map(a => a.warehouseId)

    // Filter warehouses based on access
    const accessibleWarehouses = allWarehouses.filter(wh => 
      accessibleWarehouseIds.includes(wh.id) || 
      wh.allowedUsers?.includes(user.id) ||
      wh.allowedRoles?.includes(user.role) ||
      (wh.allowedUsers?.length === 0 && wh.allowedRoles?.length === 0) // No restrictions = all access
    )

    return successResponse({
      warehouses: sanitizeDocuments(accessibleWarehouses),
      accessLevel: 'user',
      hasFullAccess: accessibleWarehouses.length === allWarehouses.length,
      totalWarehouses: allWarehouses.length
    })
  } catch (error) {
    console.error('Warehouse Access GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch warehouse access', 500, error.message)
  }
}

// POST - Grant warehouse access to user
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    // Only admins can grant access
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('Only admins can manage warehouse access', 403)
    }

    const body = await request.json()
    const { userId, warehouseId, accessLevel, canView, canEdit, canTransfer, canAdjust, canGRN, canChallan } = body

    if (!userId || !warehouseId) {
      return errorResponse('User ID and Warehouse ID are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const accessCollection = db.collection('wf_warehouse_access')
    const warehouseCollection = db.collection('wf_warehouses')
    const userCollection = db.collection('users')

    // Verify warehouse and user exist
    const warehouse = await warehouseCollection.findOne({ id: warehouseId })
    if (!warehouse) return errorResponse('Warehouse not found', 404)

    const targetUser = await userCollection.findOne({ id: userId })
    if (!targetUser) return errorResponse('User not found', 404)

    // Check if access already exists
    const existing = await accessCollection.findOne({ userId, warehouseId })
    if (existing) {
      // Update existing access
      const updated = await accessCollection.findOneAndUpdate(
        { userId, warehouseId },
        {
          $set: {
            accessLevel: accessLevel || existing.accessLevel || 'standard',
            permissions: {
              canView: canView !== undefined ? canView : true,
              canEdit: canEdit !== undefined ? canEdit : false,
              canTransfer: canTransfer !== undefined ? canTransfer : false,
              canAdjust: canAdjust !== undefined ? canAdjust : false,
              canGRN: canGRN !== undefined ? canGRN : false,
              canChallan: canChallan !== undefined ? canChallan : false
            },
            active: true,
            updatedAt: new Date(),
            updatedBy: user.id
          }
        },
        { returnDocument: 'after' }
      )
      return successResponse(sanitizeDocument(updated))
    }

    // Create new access record
    const access = {
      id: uuidv4(),
      clientId: user.clientId,
      userId,
      userName: targetUser.name || targetUser.email,
      userEmail: targetUser.email,
      warehouseId,
      warehouseName: warehouse.name,
      accessLevel: accessLevel || 'standard', // standard, manager, full
      permissions: {
        canView: canView !== undefined ? canView : true,
        canEdit: canEdit !== undefined ? canEdit : false,
        canTransfer: canTransfer !== undefined ? canTransfer : false,
        canAdjust: canAdjust !== undefined ? canAdjust : false,
        canGRN: canGRN !== undefined ? canGRN : false,
        canChallan: canChallan !== undefined ? canChallan : false
      },
      active: true,
      grantedBy: user.id,
      grantedByName: user.name || user.email,
      grantedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await accessCollection.insertOne(access)
    return successResponse(sanitizeDocument(access), 201)
  } catch (error) {
    console.error('Warehouse Access POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to grant access', 500, error.message)
  }
}

// PUT - Update warehouse access
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('Only admins can manage warehouse access', 403)
    }

    const body = await request.json()
    const { id, accessLevel, permissions, active } = body

    if (!id) return errorResponse('Access ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const accessCollection = db.collection('wf_warehouse_access')

    const updates = { updatedAt: new Date(), updatedBy: user.id }
    if (accessLevel !== undefined) updates.accessLevel = accessLevel
    if (permissions !== undefined) updates.permissions = permissions
    if (active !== undefined) updates.active = active

    const result = await accessCollection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Access record not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Warehouse Access PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update access', 500, error.message)
  }
}

// DELETE - Revoke warehouse access
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('Only admins can manage warehouse access', 403)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    const warehouseId = searchParams.get('warehouseId')

    if (!id && (!userId || !warehouseId)) {
      return errorResponse('Access ID or User+Warehouse IDs required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const accessCollection = db.collection('wf_warehouse_access')

    let query = {}
    if (id) query.id = id
    else query = { userId, warehouseId }

    const result = await accessCollection.deleteOne(query)
    if (result.deletedCount === 0) return errorResponse('Access record not found', 404)

    return successResponse({ message: 'Access revoked successfully' })
  } catch (error) {
    console.error('Warehouse Access DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to revoke access', 500, error.message)
  }
}
