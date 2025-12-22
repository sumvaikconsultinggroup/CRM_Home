import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// QC Status
const QC_STATUS = ['pending', 'in_progress', 'passed', 'failed', 'conditional']

// Default QC Checklist for Flooring
const DEFAULT_QC_CHECKLIST = [
  { id: 'visual_inspection', category: 'Visual', item: 'Surface defects check', required: true },
  { id: 'color_consistency', category: 'Visual', item: 'Color/shade consistency', required: true },
  { id: 'dimension_check', category: 'Dimension', item: 'Length & width verification', required: true },
  { id: 'thickness_check', category: 'Dimension', item: 'Thickness uniformity', required: true },
  { id: 'moisture_test', category: 'Quality', item: 'Moisture content test', required: true },
  { id: 'click_mechanism', category: 'Quality', item: 'Click/lock mechanism test', required: false },
  { id: 'packaging_check', category: 'Packaging', item: 'Box/packaging condition', required: true },
  { id: 'quantity_verify', category: 'Packaging', item: 'Quantity per box verification', required: true },
  { id: 'label_check', category: 'Documentation', item: 'Product labels/markings', required: true },
  { id: 'certificate_check', category: 'Documentation', item: 'Quality certificates present', required: false }
]

// GET - Fetch QC records
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const lotId = searchParams.get('lotId')
    const shipmentId = searchParams.get('shipmentId')
    const status = searchParams.get('status')
    const pendingOnly = searchParams.get('pending') === 'true'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('flooring_qc_records')

    if (id) {
      const record = await qcRecords.findOne({ id })
      if (!record) return errorResponse('QC record not found', 404)
      return successResponse(sanitizeDocument(record))
    }

    const query = {}
    if (lotId) query.lotId = lotId
    if (shipmentId) query.shipmentId = shipmentId
    if (status) query.status = status
    if (pendingOnly) query.status = 'pending'

    const result = await qcRecords.find(query).sort({ createdAt: -1 }).toArray()

    const summary = {
      total: result.length,
      pending: result.filter(r => r.status === 'pending').length,
      passed: result.filter(r => r.status === 'passed').length,
      failed: result.filter(r => r.status === 'failed').length,
      conditional: result.filter(r => r.status === 'conditional').length,
      avgMoisture: result.filter(r => r.moistureContent).length > 0
        ? result.filter(r => r.moistureContent).reduce((sum, r) => sum + r.moistureContent, 0) / result.filter(r => r.moistureContent).length
        : null,
      defectRate: result.length > 0
        ? (result.filter(r => r.status === 'failed').length / result.length * 100).toFixed(1)
        : 0
    }

    return successResponse({ records: sanitizeDocuments(result), summary, checklist: DEFAULT_QC_CHECKLIST })
  } catch (error) {
    console.error('QC GET Error:', error)
    return errorResponse('Failed to fetch QC records', 500, error.message)
  }
}

// POST - Create QC record
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('flooring_qc_records')
    const lots = db.collection('flooring_lots')

    const qcId = uuidv4()
    const now = new Date().toISOString()
    const qcNumber = `QC-${Date.now().toString(36).toUpperCase()}`

    // Get lot details if provided
    let lotDetails = {}
    if (body.lotId) {
      const lot = await lots.findOne({ id: body.lotId })
      if (lot) {
        lotDetails = {
          lotId: lot.id,
          lotNo: lot.lotNo,
          productId: lot.productId,
          productName: lot.productName,
          sku: lot.sku,
          shade: lot.shade,
          grade: lot.grade,
          quantity: lot.quantity,
          sqft: lot.sqft
        }
      }
    }

    const record = {
      id: qcId,
      qcNumber,
      ...lotDetails,
      shipmentId: body.shipmentId || null,
      shipmentNo: body.shipmentNo || null,
      
      // QC Type
      qcType: body.qcType || 'incoming', // incoming, in_process, outgoing, periodic
      
      // Checklist Results
      checklist: (body.checklist || DEFAULT_QC_CHECKLIST).map(item => ({
        ...item,
        checked: false,
        result: null, // pass, fail, na
        notes: '',
        photos: []
      })),
      
      // Measurements
      measurements: {
        moistureContent: body.moistureContent || null,
        moistureTarget: body.moistureTarget || { min: 6, max: 9 },
        thickness: body.thickness || null,
        thicknessSpec: body.thicknessSpec || null,
        length: body.length || null,
        width: body.width || null,
        weight: body.weight || null
      },
      
      // Sample Details
      sampleSize: body.sampleSize || 1,
      sampleBoxes: body.sampleBoxes || [],
      totalInspected: body.totalInspected || 0,
      totalDefects: 0,
      
      // Defects
      defects: [], // { type, severity, count, photos, notes }
      
      // Results
      status: 'pending',
      overallScore: null, // 0-100
      gradeAssigned: null,
      
      // Decision
      decision: null, // accept, reject, conditional_accept, return
      decisionBy: null,
      decisionDate: null,
      decisionNotes: '',
      
      // Corrective Actions
      correctiveActions: [],
      
      // Photos
      photos: [],
      
      // Documents
      documents: [],
      
      // Notes
      notes: body.notes || '',
      
      // Inspector
      inspectorId: user.id,
      inspectorName: user.name || user.email,
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await qcRecords.insertOne(record)

    // Update lot QC status
    if (body.lotId) {
      await lots.updateOne({ id: body.lotId }, { $set: { qcStatus: 'pending', qcRecordId: qcId, updatedAt: now } })
    }

    return successResponse(sanitizeDocument(record), 201)
  } catch (error) {
    console.error('QC POST Error:', error)
    return errorResponse('Failed to create QC record', 500, error.message)
  }
}

// PUT - Update QC record
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('QC record ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const qcRecords = db.collection('flooring_qc_records')
    const lots = db.collection('flooring_lots')

    const record = await qcRecords.findOne({ id })
    if (!record) return errorResponse('QC record not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'update_checklist':
        const updatedChecklist = record.checklist.map(item => {
          if (item.id === body.checklistItemId) {
            return {
              ...item,
              checked: body.checked ?? item.checked,
              result: body.result ?? item.result,
              notes: body.itemNotes ?? item.notes,
              photos: body.itemPhotos ?? item.photos
            }
          }
          return item
        })
        await qcRecords.updateOne({ id }, { $set: { checklist: updatedChecklist, updatedAt: now } })
        return successResponse({ message: 'Checklist updated' })

      case 'record_measurement':
        await qcRecords.updateOne({ id }, {
          $set: {
            [`measurements.${body.measurementType}`]: body.value,
            updatedAt: now
          }
        })
        return successResponse({ message: 'Measurement recorded' })

      case 'add_defect':
        const defect = {
          id: uuidv4(),
          type: body.defectType, // scratch, dent, color_variation, warping, chipping, etc.
          severity: body.severity || 'minor', // minor, major, critical
          count: body.count || 1,
          location: body.location || '',
          photos: body.defectPhotos || [],
          notes: body.defectNotes || '',
          reportedAt: now,
          reportedBy: user.id
        }
        await qcRecords.updateOne({ id }, {
          $push: { defects: defect },
          $inc: { totalDefects: body.count || 1 },
          $set: { updatedAt: now }
        })
        return successResponse({ message: 'Defect added', defect })

      case 'complete':
        // Calculate score
        const passedItems = record.checklist.filter(i => i.result === 'pass').length
        const totalRequired = record.checklist.filter(i => i.required).length
        const failedRequired = record.checklist.filter(i => i.required && i.result === 'fail').length
        const criticalDefects = (record.defects || []).filter(d => d.severity === 'critical').length
        
        let overallScore = (passedItems / (record.checklist.length || 1)) * 100
        let status = 'passed'
        let gradeAssigned = record.lotDetails?.grade || 'A'
        
        if (criticalDefects > 0 || failedRequired > 0) {
          status = 'failed'
          gradeAssigned = 'Reject'
        } else if (record.defects?.length > 0) {
          status = 'conditional'
          if (record.defects.filter(d => d.severity === 'major').length > 2) {
            gradeAssigned = 'B'
          }
        }
        
        // Check moisture content
        if (record.measurements.moistureContent) {
          const mc = record.measurements.moistureContent
          const target = record.measurements.moistureTarget
          if (mc < target.min || mc > target.max) {
            status = status === 'passed' ? 'conditional' : status
            overallScore -= 10
          }
        }

        await qcRecords.updateOne({ id }, {
          $set: {
            status,
            overallScore: Math.max(0, Math.round(overallScore)),
            gradeAssigned,
            completedAt: now,
            completedBy: user.id,
            updatedAt: now
          }
        })

        // Update lot
        if (record.lotId) {
          await lots.updateOne({ id: record.lotId }, {
            $set: {
              qcStatus: status,
              grade: gradeAssigned,
              moistureContent: record.measurements.moistureContent,
              qcCompletedAt: now,
              updatedAt: now
            }
          })
        }

        return successResponse({ message: 'QC completed', status, overallScore, gradeAssigned })

      case 'make_decision':
        await qcRecords.updateOne({ id }, {
          $set: {
            decision: body.decision, // accept, reject, conditional_accept, return
            decisionBy: user.id,
            decisionDate: now,
            decisionNotes: body.decisionNotes || '',
            updatedAt: now
          }
        })

        // Update lot status based on decision
        if (record.lotId) {
          let lotStatus = 'available'
          if (body.decision === 'reject') lotStatus = 'damaged'
          else if (body.decision === 'return') lotStatus = 'returned'
          else if (body.decision === 'conditional_accept') lotStatus = 'conditional'
          
          await lots.updateOne({ id: record.lotId }, { $set: { status: lotStatus, updatedAt: now } })
        }

        return successResponse({ message: 'Decision recorded' })

      case 'add_corrective_action':
        const correctiveAction = {
          id: uuidv4(),
          action: body.correctiveAction,
          assignedTo: body.assignedTo,
          dueDate: body.dueDate,
          status: 'pending',
          createdAt: now,
          createdBy: user.id
        }
        await qcRecords.updateOne({ id }, {
          $push: { correctiveActions: correctiveAction },
          $set: { updatedAt: now }
        })
        return successResponse({ message: 'Corrective action added' })

      default:
        updateData.updatedAt = now
        await qcRecords.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'QC record updated' })
    }
  } catch (error) {
    console.error('QC PUT Error:', error)
    return errorResponse('Failed to update QC record', 500, error.message)
  }
}
