import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch production work orders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get('id')
    const orderId = searchParams.get('orderId')
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_work_orders')
    
    let query = {}
    if (workOrderId) query.id = workOrderId
    if (orderId) query.orderId = orderId
    if (stage) query.currentStage = stage
    if (status) query.status = status

    const workOrders = await collection.find(query).sort({ createdAt: -1 }).toArray()

    // Include QC records if single work order
    if (workOrderId && workOrders.length > 0) {
      const qcCollection = db.collection('dw_qc_records')
      const qcRecords = await qcCollection.find({ workOrderId }).toArray()
      workOrders[0].qcRecords = sanitizeDocuments(qcRecords)
    }

    const stats = {
      total: workOrders.length,
      byStage: {
        cutting: workOrders.filter(w => w.currentStage === 'cutting').length,
        machining: workOrders.filter(w => w.currentStage === 'machining').length,
        assembly: workOrders.filter(w => w.currentStage === 'assembly').length,
        glazing: workOrders.filter(w => w.currentStage === 'glazing').length,
        qc: workOrders.filter(w => w.currentStage === 'qc').length,
        packing: workOrders.filter(w => w.currentStage === 'packing').length,
        ready: workOrders.filter(w => w.currentStage === 'ready').length
      },
      pending: workOrders.filter(w => w.status === 'in-progress').length,
      completed: workOrders.filter(w => w.status === 'completed').length,
      rework: workOrders.filter(w => w.status === 'rework').length
    }

    return successResponse({ workOrders: sanitizeDocuments(workOrders), stats })
  } catch (error) {
    console.error('DW Production GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch production data', 500, error.message)
  }
}

// POST - Create work order or record stage completion
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Generate cut list
    if (action === 'generate-cut-list') {
      const quoteItemsCollection = db.collection('dw_quote_items')
      const cutListCollection = db.collection('dw_cut_lists')

      const items = await quoteItemsCollection.find({ quoteId: body.quoteId }).toArray()
      
      const cutList = {
        id: uuidv4(),
        orderId: body.orderId,
        quoteId: body.quoteId,
        clientId: user.clientId,
        
        // Grouped by profile type
        profiles: [],
        totalProfileLength: 0,
        optimizedLength: 0,
        wastePercent: 0,
        
        // Glass cutting
        glassPanels: [],
        totalGlassArea: 0,
        
        status: 'generated',
        generatedAt: new Date(),
        generatedBy: user.id,
        createdAt: new Date()
      }

      // Generate profile cuts (simplified)
      const profileGroups = {}
      items.forEach(item => {
        const perimeter = 2 * (item.width + item.height)
        const profileType = item.frame || 'standard'
        
        if (!profileGroups[profileType]) {
          profileGroups[profileType] = { cuts: [], totalLength: 0 }
        }
        
        profileGroups[profileType].cuts.push({
          itemId: item.id,
          room: item.room,
          lengths: [
            { type: 'frame-top', length: item.width },
            { type: 'frame-bottom', length: item.width },
            { type: 'frame-left', length: item.height },
            { type: 'frame-right', length: item.height }
          ]
        })
        profileGroups[profileType].totalLength += perimeter
        cutList.totalProfileLength += perimeter
      })

      cutList.profiles = Object.entries(profileGroups).map(([type, data]) => ({
        profileType: type,
        ...data
      }))

      // Generate glass panels
      items.forEach(item => {
        cutList.glassPanels.push({
          itemId: item.id,
          room: item.room,
          width: item.width - 10, // frame offset
          height: item.height - 10,
          area: (item.width - 10) * (item.height - 10) / 144,
          glassType: item.glass || 'clear',
          quantity: item.quantity || 1
        })
        cutList.totalGlassArea += ((item.width - 10) * (item.height - 10) / 144) * (item.quantity || 1)
      })

      await cutListCollection.insertOne(cutList)
      return successResponse(sanitizeDocument(cutList), 201)
    }

    // Record QC check
    if (action === 'record-qc') {
      const qcCollection = db.collection('dw_qc_records')
      const workOrdersCollection = db.collection('dw_work_orders')

      const qcRecord = {
        id: uuidv4(),
        workOrderId: body.workOrderId,
        clientId: user.clientId,
        
        stage: body.stage || 'final',
        
        // Checklist items
        checklist: body.checklist || [
          { item: 'Dimensional Check (Diagonals)', passed: false, notes: '' },
          { item: 'Corner Strength', passed: false, notes: '' },
          { item: 'Hardware Operation', passed: false, notes: '' },
          { item: 'Glass Quality', passed: false, notes: '' },
          { item: 'Finish Defects', passed: false, notes: '' },
          { item: 'Water Test', passed: false, notes: '' }
        ],
        
        // Overall result
        result: body.result || 'pending', // pass, rework, reject
        passedItems: 0,
        failedItems: 0,
        
        // Photos
        photos: body.photos || [],
        
        // Rework details
        reworkRequired: body.result === 'rework',
        reworkNotes: body.reworkNotes || '',
        reworkAssignedTo: body.reworkAssignedTo || null,
        
        inspectedBy: user.id,
        inspectedAt: new Date(),
        createdAt: new Date()
      }

      // Calculate passed/failed
      qcRecord.checklist.forEach(item => {
        if (item.passed) qcRecord.passedItems++
        else qcRecord.failedItems++
      })

      await qcCollection.insertOne(qcRecord)

      // Update work order if rework
      if (qcRecord.result === 'rework') {
        await workOrdersCollection.updateOne(
          { id: body.workOrderId },
          { 
            $set: { 
              status: 'rework',
              reworkCount: { $inc: 1 },
              updatedAt: new Date()
            }
          }
        )
      }

      return successResponse(sanitizeDocument(qcRecord), 201)
    }

    // Complete stage
    if (action === 'complete-stage') {
      const collection = db.collection('dw_work_orders')
      
      const stageOrder = ['cutting', 'machining', 'assembly', 'glazing', 'qc', 'packing', 'ready']
      const currentIndex = stageOrder.indexOf(body.currentStage)
      const nextStage = stageOrder[currentIndex + 1] || 'ready'

      const result = await collection.findOneAndUpdate(
        { id: body.workOrderId },
        {
          $set: {
            currentStage: nextStage,
            [`stages.${body.currentStage}`]: {
              completedAt: new Date(),
              completedBy: user.id,
              notes: body.notes || ''
            },
            status: nextStage === 'ready' ? 'completed' : 'in-progress',
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) return errorResponse('Work order not found', 404)
      return successResponse(sanitizeDocument(result))
    }

    // Issue material to work order
    if (action === 'issue-material') {
      const materialsCollection = db.collection('dw_material_issues')
      const inventoryCollection = db.collection('dw_catalog_system') // or appropriate catalog

      const issue = {
        id: uuidv4(),
        workOrderId: body.workOrderId,
        clientId: user.clientId,
        
        materialId: body.materialId,
        materialName: body.materialName || '',
        materialType: body.materialType || '',
        
        quantityIssued: parseFloat(body.quantity) || 0,
        unit: body.unit || 'piece',
        
        batchNumber: body.batchNumber || '',
        
        issuedBy: user.id,
        issuedAt: new Date(),
        createdAt: new Date()
      }

      await materialsCollection.insertOne(issue)
      return successResponse(sanitizeDocument(issue), 201)
    }

    // Create work order
    const collection = db.collection('dw_work_orders')

    const workOrder = {
      id: uuidv4(),
      clientId: user.clientId,
      workOrderNumber: `WO-${Date.now()}`,
      
      orderId: body.orderId,
      orderNumber: body.orderNumber || '',
      quoteId: body.quoteId || null,
      
      // Customer info
      customerName: body.customerName || '',
      siteAddress: body.siteAddress || '',
      
      // Items
      itemsCount: parseInt(body.itemsCount) || 0,
      totalArea: parseFloat(body.totalArea) || 0,
      
      // Production type
      productionType: body.productionType || 'fabricator', // manufacturer, fabricator
      
      // Current stage
      currentStage: 'cutting', // cutting, machining, assembly, glazing, qc, packing, ready
      stages: {
        cutting: { startedAt: new Date(), completedAt: null, completedBy: null },
        machining: { startedAt: null, completedAt: null, completedBy: null },
        assembly: { startedAt: null, completedAt: null, completedBy: null },
        glazing: { startedAt: null, completedAt: null, completedBy: null },
        qc: { startedAt: null, completedAt: null, completedBy: null },
        packing: { startedAt: null, completedAt: null, completedBy: null }
      },
      
      // Status
      status: 'in-progress', // pending, in-progress, completed, on-hold, rework
      priority: body.priority || 'normal', // low, normal, high, urgent
      
      // Rework tracking
      reworkCount: 0,
      
      // Timeline
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : new Date(),
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
      actualStart: new Date(),
      actualEnd: null,
      
      // Assignment
      assignedTeam: body.assignedTeam || '',
      assignedTo: body.assignedTo || [],
      
      notes: body.notes || '',
      
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(workOrder)
    return successResponse(sanitizeDocument(workOrder), 201)
  } catch (error) {
    console.error('DW Production POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create production record', 500, error.message)
  }
}

// PUT - Update work order
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Work order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_work_orders')
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Work order not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('DW Production PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update work order', 500, error.message)
  }
}

// DELETE - Delete work order (admin only)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Work order ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('dw_work_orders')
    
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) return errorResponse('Work order not found', 404)
    return successResponse({ message: 'Work order deleted successfully' })
  } catch (error) {
    console.error('DW Production DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete work order', 500, error.message)
  }
}
