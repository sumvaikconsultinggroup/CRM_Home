/**
 * =====================================================
 * D&W MODULE - QUALITY CONTROL (QC) API
 * =====================================================
 * 
 * Enterprise-grade QC gate for D&W manufacturing.
 * QC pass is MANDATORY before dispatch can be created.
 * 
 * Flow: Production Complete → QC Inspection → Pass/Fail → Dispatch
 * 
 * Features:
 * - Configurable checklists per product type
 * - Photo evidence (mandatory)
 * - Defect tracking with severity levels
 * - Rework loop with re-inspection
 * - Batch QC for multiple items
 * - QC metrics and analytics
 */

import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// QC Status Flow
const QC_STATUS = ['pending', 'in_progress', 'passed', 'failed', 'rework', 're_inspection']

// Defect Severity Levels
const DEFECT_SEVERITY = [
  { id: 'critical', name: 'Critical', blocksShipment: true, requiresRework: true },
  { id: 'major', name: 'Major', blocksShipment: true, requiresRework: true },
  { id: 'minor', name: 'Minor', blocksShipment: false, requiresRework: false },
  { id: 'cosmetic', name: 'Cosmetic', blocksShipment: false, requiresRework: false }
]

// Standard QC Checklist Categories
const QC_CATEGORIES = [
  { id: 'dimensions', name: 'Dimensions & Tolerances', weight: 25 },
  { id: 'frame', name: 'Frame Quality', weight: 20 },
  { id: 'glass', name: 'Glass Inspection', weight: 20 },
  { id: 'hardware', name: 'Hardware & Operation', weight: 15 },
  { id: 'finish', name: 'Finish & Appearance', weight: 10 },
  { id: 'sealing', name: 'Sealing & Weatherproofing', weight: 10 }
]

// Default QC Checklist Items
const DEFAULT_CHECKLIST = [
  // Dimensions
  { category: 'dimensions', item: 'Overall width within tolerance (±2mm)', critical: true },
  { category: 'dimensions', item: 'Overall height within tolerance (±2mm)', critical: true },
  { category: 'dimensions', item: 'Diagonal measurement check (squareness)', critical: true },
  { category: 'dimensions', item: 'Glass pocket dimensions verified', critical: true },
  // Frame
  { category: 'frame', item: 'Frame joints properly welded/crimped', critical: true },
  { category: 'frame', item: 'No visible cracks or damage', critical: true },
  { category: 'frame', item: 'Reinforcement properly installed', critical: false },
  { category: 'frame', item: 'Drainage holes present and clear', critical: false },
  // Glass
  { category: 'glass', item: 'Glass type matches specification', critical: true },
  { category: 'glass', item: 'No chips, cracks, or scratches', critical: true },
  { category: 'glass', item: 'Proper spacer and sealant in DGU', critical: true },
  { category: 'glass', item: 'Glass properly seated in frame', critical: false },
  // Hardware
  { category: 'hardware', item: 'Handle operates smoothly', critical: false },
  { category: 'hardware', item: 'Lock engages properly', critical: true },
  { category: 'hardware', item: 'Hinges/rollers function correctly', critical: true },
  { category: 'hardware', item: 'All hardware matches specification', critical: false },
  // Finish
  { category: 'finish', item: 'Powder coat/anodizing uniform', critical: false },
  { category: 'finish', item: 'No scratches or blemishes', critical: false },
  { category: 'finish', item: 'Color matches approved sample', critical: false },
  // Sealing
  { category: 'sealing', item: 'Gaskets properly installed', critical: true },
  { category: 'sealing', item: 'Weather seals intact', critical: true },
  { category: 'sealing', item: 'No gaps in sealing', critical: false }
]

// GET - Fetch QC records
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const qcId = searchParams.get('id')
    const workOrderId = searchParams.get('workOrderId')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const inspectorId = searchParams.get('inspectorId')
    const pending = searchParams.get('pending') // Get items pending QC
    const failed = searchParams.get('failed') // Get failed items
    const getChecklist = searchParams.get('checklist') // Get default checklist

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('dw_qc_records')

    // Return default checklist template
    if (getChecklist === 'true') {
      return successResponse({
        checklist: DEFAULT_CHECKLIST,
        categories: QC_CATEGORIES,
        severityLevels: DEFECT_SEVERITY
      })
    }

    if (qcId) {
      const record = await qcRecords.findOne({ id: qcId })
      if (!record) return errorResponse('QC record not found', 404)
      return successResponse(sanitizeDocument(record))
    }

    // Build query
    const query = {}
    if (workOrderId) query.workOrderId = workOrderId
    if (orderId) query.orderId = orderId
    if (status) query.status = status
    if (inspectorId) query.inspectorId = inspectorId
    if (pending === 'true') query.status = { $in: ['pending', 're_inspection'] }
    if (failed === 'true') query.status = 'failed'

    const records = await qcRecords.find(query).sort({ createdAt: -1 }).toArray()

    // Calculate stats
    const allRecords = await qcRecords.find({}).toArray()
    const stats = {
      total: allRecords.length,
      pending: allRecords.filter(r => r.status === 'pending').length,
      inProgress: allRecords.filter(r => r.status === 'in_progress').length,
      passed: allRecords.filter(r => r.status === 'passed').length,
      failed: allRecords.filter(r => r.status === 'failed').length,
      rework: allRecords.filter(r => r.status === 'rework').length,
      reInspection: allRecords.filter(r => r.status === 're_inspection').length,
      passRate: allRecords.length > 0 
        ? Math.round(allRecords.filter(r => r.status === 'passed').length / allRecords.filter(r => ['passed', 'failed'].includes(r.status)).length * 100) || 0
        : 0,
      avgInspectionTime: 0, // Calculate from actual data
      defectsByCategory: {}
    }

    // Defects analysis
    allRecords.forEach(r => {
      (r.defects || []).forEach(d => {
        stats.defectsByCategory[d.category] = (stats.defectsByCategory[d.category] || 0) + 1
      })
    })

    return successResponse({
      qcRecords: sanitizeDocuments(records),
      stats,
      categories: QC_CATEGORIES,
      severityLevels: DEFECT_SEVERITY
    })
  } catch (error) {
    console.error('DW QC GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch QC records', 500, error.message)
  }
}

// POST - Create QC record or perform inspection
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('dw_qc_records')
    const workOrders = db.collection('dw_work_orders')

    const now = new Date().toISOString()

    // Start QC inspection
    if (action === 'start_inspection') {
      const { workOrderId, openingId, itemDescription } = body

      if (!workOrderId) {
        return errorResponse('Work order ID is required', 400)
      }

      // Check work order exists and is ready for QC
      const workOrder = await workOrders.findOne({ id: workOrderId })
      if (!workOrder) return errorResponse('Work order not found', 404)

      // Generate QC number
      const count = await qcRecords.countDocuments()
      const qcNumber = `QC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

      const qcRecord = {
        id: uuidv4(),
        qcNumber,
        clientId: user.clientId,
        workOrderId,
        orderId: workOrder.orderId,
        openingId: openingId || workOrder.openingId,
        itemDescription: itemDescription || workOrder.description,
        
        // Inspection details
        status: 'in_progress',
        inspectorId: user.id,
        inspectorName: user.name || user.email,
        startedAt: now,
        completedAt: null,
        
        // Checklist with default items
        checklist: DEFAULT_CHECKLIST.map(item => ({
          ...item,
          id: uuidv4(),
          checked: false,
          result: null, // pass, fail, na
          notes: ''
        })),
        checklistCompleted: false,
        
        // Results
        overallResult: null, // pass, fail
        score: 0,
        defects: [],
        photos: {
          mandatory: [], // Required photos
          defects: [], // Defect photos
          passed: [] // Pass proof photos
        },
        
        // Rework tracking
        isRework: false,
        reworkCount: 0,
        previousQcIds: [],
        reworkNotes: '',
        
        // Metadata
        productType: workOrder.productType || 'window',
        category: workOrder.category || 'sliding',
        dimensions: workOrder.dimensions || {},
        
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await qcRecords.insertOne(qcRecord)

      // Update work order status to QC
      await workOrders.updateOne({ id: workOrderId }, {
        $set: { 
          currentStage: 'qc', 
          qcStatus: 'in_progress',
          qcRecordId: qcRecord.id,
          updatedAt: now 
        }
      })

      return successResponse(sanitizeDocument(qcRecord), 201)
    }

    // Record checklist item result
    if (action === 'record_check') {
      const { qcId, checklistItemId, result, notes } = body

      if (!qcId || !checklistItemId || !result) {
        return errorResponse('QC ID, checklist item ID, and result are required', 400)
      }

      const record = await qcRecords.findOne({ id: qcId })
      if (!record) return errorResponse('QC record not found', 404)

      // Update checklist item
      const updatedChecklist = record.checklist.map(item => {
        if (item.id === checklistItemId) {
          return { ...item, checked: true, result, notes: notes || '' }
        }
        return item
      })

      // Check if all items are checked
      const allChecked = updatedChecklist.every(item => item.checked)

      await qcRecords.updateOne({ id: qcId }, {
        $set: {
          checklist: updatedChecklist,
          checklistCompleted: allChecked,
          updatedAt: now
        }
      })

      return successResponse({ message: 'Check recorded', allChecked })
    }

    // Add defect
    if (action === 'add_defect') {
      const { qcId, category, description, severity, photos } = body

      if (!qcId || !description || !severity) {
        return errorResponse('QC ID, description, and severity are required', 400)
      }

      const defect = {
        id: uuidv4(),
        category: category || 'general',
        description,
        severity,
        photos: photos || [],
        reportedAt: now,
        reportedBy: user.id,
        status: 'open', // open, fixed, accepted
        resolution: null
      }

      await qcRecords.updateOne({ id: qcId }, {
        $push: { defects: defect },
        $set: { updatedAt: now }
      })

      return successResponse({ message: 'Defect recorded', defect })
    }

    // Add photos
    if (action === 'add_photos') {
      const { qcId, photoType, photos } = body // photoType: mandatory, defects, passed

      if (!qcId || !photos || !photos.length) {
        return errorResponse('QC ID and photos are required', 400)
      }

      const photoData = photos.map(p => ({
        id: uuidv4(),
        url: p.url,
        caption: p.caption || '',
        uploadedAt: now,
        uploadedBy: user.id
      }))

      await qcRecords.updateOne({ id: qcId }, {
        $push: { [`photos.${photoType || 'mandatory'}`]: { $each: photoData } },
        $set: { updatedAt: now }
      })

      return successResponse({ message: 'Photos added' })
    }

    // Complete inspection
    if (action === 'complete_inspection') {
      const { qcId, overallResult, notes, signOffPhotos } = body

      if (!qcId || !overallResult) {
        return errorResponse('QC ID and overall result are required', 400)
      }

      const record = await qcRecords.findOne({ id: qcId })
      if (!record) return errorResponse('QC record not found', 404)

      // Validate: Must have mandatory photos
      if (record.photos.mandatory.length === 0) {
        return errorResponse('At least one mandatory photo is required', 400)
      }

      // Validate: All critical items must be checked
      const uncheckedCritical = record.checklist.filter(item => item.critical && !item.checked)
      if (uncheckedCritical.length > 0) {
        return errorResponse(`${uncheckedCritical.length} critical checklist items not inspected`, 400)
      }

      // Calculate score
      const passedItems = record.checklist.filter(item => item.result === 'pass').length
      const totalItems = record.checklist.filter(item => item.result !== 'na').length
      const score = totalItems > 0 ? Math.round(passedItems / totalItems * 100) : 0

      // Check for blocking defects
      const blockingDefects = record.defects.filter(d => 
        DEFECT_SEVERITY.find(s => s.id === d.severity)?.blocksShipment
      )

      // If trying to pass but has blocking defects
      if (overallResult === 'pass' && blockingDefects.length > 0) {
        return errorResponse(`Cannot pass with ${blockingDefects.length} blocking defects`, 400)
      }

      const finalResult = overallResult
      const newStatus = finalResult === 'pass' ? 'passed' : 'failed'

      await qcRecords.updateOne({ id: qcId }, {
        $set: {
          status: newStatus,
          overallResult: finalResult,
          score,
          completedAt: now,
          completionNotes: notes || '',
          signOffPhotos: signOffPhotos || [],
          updatedAt: now
        }
      })

      // Update work order
      const workOrderUpdate = {
        qcStatus: newStatus,
        qcCompletedAt: now,
        qcScore: score,
        updatedAt: now
      }

      if (finalResult === 'pass') {
        workOrderUpdate.currentStage = 'packing' // Move to packing/ready for dispatch
        workOrderUpdate.qcPassed = true
        workOrderUpdate.readyForDispatch = true
      } else {
        workOrderUpdate.currentStage = 'qc' // Stay in QC
        workOrderUpdate.qcPassed = false
        workOrderUpdate.readyForDispatch = false
      }

      await workOrders.updateOne({ id: record.workOrderId }, { $set: workOrderUpdate })

      return successResponse({
        message: `QC ${finalResult === 'pass' ? 'passed' : 'failed'}`,
        status: newStatus,
        score,
        readyForDispatch: finalResult === 'pass'
      })
    }

    // Send for rework
    if (action === 'send_for_rework') {
      const { qcId, reworkNotes, defectsToFix } = body

      if (!qcId) return errorResponse('QC ID is required', 400)

      const record = await qcRecords.findOne({ id: qcId })
      if (!record) return errorResponse('QC record not found', 404)

      await qcRecords.updateOne({ id: qcId }, {
        $set: {
          status: 'rework',
          reworkNotes: reworkNotes || '',
          reworkSentAt: now,
          reworkSentBy: user.id,
          defectsToFix: defectsToFix || record.defects.filter(d => d.status === 'open').map(d => d.id),
          updatedAt: now
        }
      })

      // Update work order
      await workOrders.updateOne({ id: record.workOrderId }, {
        $set: {
          currentStage: 'assembly', // Back to assembly for rework
          qcStatus: 'rework',
          reworkRequired: true,
          updatedAt: now
        }
      })

      return successResponse({ message: 'Sent for rework' })
    }

    // Request re-inspection after rework
    if (action === 'request_reinspection') {
      const { qcId, reworkCompletedNotes, fixedDefectIds } = body

      if (!qcId) return errorResponse('QC ID is required', 400)

      const record = await qcRecords.findOne({ id: qcId })
      if (!record) return errorResponse('QC record not found', 404)

      // Mark defects as fixed
      const updatedDefects = record.defects.map(d => {
        if (fixedDefectIds?.includes(d.id)) {
          return { ...d, status: 'fixed', fixedAt: now, fixedBy: user.id }
        }
        return d
      })

      // Create new QC record for re-inspection
      const count = await qcRecords.countDocuments()
      const newQcNumber = `QC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

      const reInspectionRecord = {
        id: uuidv4(),
        qcNumber: newQcNumber,
        clientId: user.clientId,
        workOrderId: record.workOrderId,
        orderId: record.orderId,
        openingId: record.openingId,
        itemDescription: record.itemDescription,
        
        status: 'pending',
        inspectorId: null,
        inspectorName: null,
        startedAt: null,
        completedAt: null,
        
        checklist: DEFAULT_CHECKLIST.map(item => ({
          ...item,
          id: uuidv4(),
          checked: false,
          result: null,
          notes: ''
        })),
        checklistCompleted: false,
        
        overallResult: null,
        score: 0,
        defects: [],
        photos: { mandatory: [], defects: [], passed: [] },
        
        isRework: true,
        reworkCount: (record.reworkCount || 0) + 1,
        previousQcIds: [...(record.previousQcIds || []), record.id],
        reworkCompletedNotes: reworkCompletedNotes || '',
        previousDefects: updatedDefects.filter(d => d.status === 'fixed'),
        
        productType: record.productType,
        category: record.category,
        dimensions: record.dimensions,
        
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await qcRecords.insertOne(reInspectionRecord)

      // Update original record
      await qcRecords.updateOne({ id: qcId }, {
        $set: {
          status: 're_inspection',
          defects: updatedDefects,
          reInspectionQcId: reInspectionRecord.id,
          updatedAt: now
        }
      })

      // Update work order
      await workOrders.updateOne({ id: record.workOrderId }, {
        $set: {
          currentStage: 'qc',
          qcStatus: 'pending',
          qcRecordId: reInspectionRecord.id,
          reworkCompleted: true,
          updatedAt: now
        }
      })

      return successResponse({
        message: 'Re-inspection requested',
        newQcRecord: sanitizeDocument(reInspectionRecord)
      })
    }

    // Batch QC - Create QC records for multiple work orders
    if (action === 'batch_create') {
      const { workOrderIds } = body

      if (!workOrderIds || !workOrderIds.length) {
        return errorResponse('Work order IDs are required', 400)
      }

      const createdRecords = []
      let count = await qcRecords.countDocuments()

      for (const woId of workOrderIds) {
        const workOrder = await workOrders.findOne({ id: woId })
        if (!workOrder) continue

        count++
        const qcNumber = `QC-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`

        const qcRecord = {
          id: uuidv4(),
          qcNumber,
          clientId: user.clientId,
          workOrderId: woId,
          orderId: workOrder.orderId,
          openingId: workOrder.openingId,
          itemDescription: workOrder.description,
          status: 'pending',
          inspectorId: null,
          checklist: DEFAULT_CHECKLIST.map(item => ({ ...item, id: uuidv4(), checked: false, result: null, notes: '' })),
          checklistCompleted: false,
          overallResult: null,
          score: 0,
          defects: [],
          photos: { mandatory: [], defects: [], passed: [] },
          isRework: false,
          reworkCount: 0,
          previousQcIds: [],
          productType: workOrder.productType || 'window',
          category: workOrder.category || 'sliding',
          dimensions: workOrder.dimensions || {},
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await qcRecords.insertOne(qcRecord)
        createdRecords.push(qcRecord)

        await workOrders.updateOne({ id: woId }, {
          $set: { currentStage: 'qc', qcStatus: 'pending', qcRecordId: qcRecord.id, updatedAt: now }
        })
      }

      return successResponse({
        message: `${createdRecords.length} QC records created`,
        records: sanitizeDocuments(createdRecords)
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW QC POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to process QC request', 500, error.message)
  }
}

// PUT - Update QC record
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('QC record ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('dw_qc_records')

    const record = await qcRecords.findOne({ id })
    if (!record) return errorResponse('QC record not found', 404)

    // Don't allow updating completed records
    if (['passed', 'failed'].includes(record.status) && !updates.forceUpdate) {
      return errorResponse('Cannot update completed QC record', 400)
    }

    updates.updatedAt = new Date().toISOString()
    updates.updatedBy = user.id

    await qcRecords.updateOne({ id }, { $set: updates })
    const updated = await qcRecords.findOne({ id })

    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('DW QC PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update QC record', 500, error.message)
  }
}

// DELETE - Delete QC record (only pending)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('QC record ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('dw_qc_records')

    const record = await qcRecords.findOne({ id })
    if (!record) return errorResponse('QC record not found', 404)

    if (record.status !== 'pending') {
      return errorResponse('Can only delete pending QC records', 400)
    }

    await qcRecords.deleteOne({ id })

    return successResponse({ message: 'QC record deleted' })
  } catch (error) {
    console.error('DW QC DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete QC record', 500, error.message)
  }
}
