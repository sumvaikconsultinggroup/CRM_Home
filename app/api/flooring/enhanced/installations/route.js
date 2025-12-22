import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch installations
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const limit = parseInt(searchParams.get('limit')) || 100

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('flooring_installations')

    if (id) {
      const installation = await installations.findOne({ id })
      if (!installation) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(installation))
    }

    const query = {}
    if (projectId) query.projectId = projectId
    if (status) query.status = status
    if (assignedTo) query.assignedTo = assignedTo

    const result = await installations.find(query).sort({ scheduledDate: 1 }).limit(limit).toArray()

    // Calculate summary
    const summary = {
      total: result.length,
      scheduled: result.filter(i => i.status === 'scheduled').length,
      inProgress: result.filter(i => i.status === 'in_progress').length,
      completed: result.filter(i => i.status === 'completed').length,
      onHold: result.filter(i => i.status === 'on_hold').length,
      totalAreaInstalled: result.filter(i => i.status === 'completed').reduce((sum, i) => sum + (i.areaInstalled || 0), 0)
    }

    return successResponse({
      installations: sanitizeDocuments(result),
      summary
    })
  } catch (error) {
    console.error('Installations GET Error:', error)
    return errorResponse('Failed to fetch installations', 500, error.message)
  }
}

// POST - Create installation
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('flooring_installations')
    const projects = db.collection('flooring_projects')
    const leads = db.collection('leads')
    const invoices = db.collection('flooring_invoices')

    const installationId = uuidv4()
    const now = new Date().toISOString()

    const installation = {
      id: installationId,
      projectId: body.projectId,
      invoiceId: body.invoiceId,
      quoteId: body.quoteId,
      customer: body.customer || {},
      site: body.site || {},
      rooms: body.rooms || [],
      totalArea: body.totalArea || 0,
      areaInstalled: 0,
      progress: 0,
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      estimatedDuration: body.estimatedDuration || 1, // days
      actualStartDate: null,
      actualEndDate: null,
      team: body.team || [],
      assignedTo: body.assignedTo,
      status: 'scheduled', // scheduled, materials_ordered, materials_delivered, in_progress, on_hold, completed, cancelled
      statusHistory: [{
        status: 'scheduled',
        timestamp: now,
        by: user.id,
        notes: 'Installation scheduled'
      }],
      materials: body.materials || [],
      equipment: body.equipment || [],
      checklist: [
        { id: 'site_prep', task: 'Site preparation', completed: false },
        { id: 'material_delivery', task: 'Materials delivered', completed: false },
        { id: 'subfloor_check', task: 'Subfloor inspection', completed: false },
        { id: 'acclimation', task: 'Material acclimation', completed: false },
        { id: 'installation', task: 'Installation complete', completed: false },
        { id: 'finishing', task: 'Finishing & trim work', completed: false },
        { id: 'cleanup', task: 'Site cleanup', completed: false },
        { id: 'inspection', task: 'Final inspection', completed: false },
        { id: 'handover', task: 'Customer handover', completed: false }
      ],
      issues: [],
      photos: {
        before: [],
        during: [],
        after: []
      },
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      customerSignature: null,
      completionCertificate: null,
      warranty: {
        materialWarranty: body.materialWarranty || '10 years',
        installationWarranty: body.installationWarranty || '1 year',
        warrantyStartDate: null
      },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await installations.insertOne(installation)

    // Update project status
    if (body.projectId) {
      const project = await projects.findOne({ id: body.projectId })
      if (project) {
        await projects.updateOne(
          { id: body.projectId },
          {
            $set: {
              status: 'installation_scheduled',
              installationId,
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: 'installation_scheduled',
                timestamp: now,
                by: user.id,
                notes: `Installation scheduled for ${body.scheduledDate}`
              }
            }
          }
        )

        // Update lead status
        if (project.crmLeadId) {
          await leads.updateOne(
            { id: project.crmLeadId },
            { $set: { flooringStatus: 'installation_scheduled', updatedAt: now } }
          )
        }
      }
    }

    // Update invoice with installation reference
    if (body.invoiceId) {
      await invoices.updateOne(
        { id: body.invoiceId },
        { 
          $set: { 
            installationCreated: true,
            installationId: installationId,
            installationStatus: 'scheduled',
            updatedAt: now
          } 
        }
      )
    }

    return successResponse(sanitizeDocument(installation), 201)
  } catch (error) {
    console.error('Installations POST Error:', error)
    return errorResponse('Failed to create installation', 500, error.message)
  }
}

// PUT - Update installation
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Installation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('flooring_installations')
    const projects = db.collection('flooring_projects')
    const leads = db.collection('leads')
    const invoices = db.collection('flooring_invoices')

    const installation = await installations.findOne({ id })
    if (!installation) return errorResponse('Installation not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'start':
        await installations.updateOne({ id }, {
          $set: { status: 'in_progress', actualStartDate: now, updatedAt: now },
          $push: { statusHistory: { status: 'in_progress', timestamp: now, by: user.id, notes: 'Installation started' } }
        })
        if (installation.projectId) {
          const project = await projects.findOne({ id: installation.projectId })
          await projects.updateOne({ id: installation.projectId }, { $set: { status: 'in_progress', actualStartDate: now } })
          if (project?.crmLeadId) {
            await leads.updateOne({ id: project.crmLeadId }, { $set: { flooringStatus: 'installation_in_progress' } })
          }
        }
        // Sync installation status to invoice
        if (installation.invoiceId) {
          await invoices.updateOne(
            { id: installation.invoiceId },
            { $set: { installationStatus: 'in_progress', updatedAt: now } }
          )
        }
        return successResponse({ message: 'Installation started' })

      case 'update_progress':
        const progress = parseInt(body.progress) || 0
        const areaInstalled = parseFloat(body.areaInstalled) || installation.areaInstalled
        await installations.updateOne({ id }, {
          $set: { progress, areaInstalled, updatedAt: now },
          $push: { statusHistory: { status: 'progress_update', timestamp: now, by: user.id, notes: `Progress: ${progress}%` } }
        })
        return successResponse({ message: 'Progress updated', progress })

      case 'complete':
        await installations.updateOne({ id }, {
          $set: {
            status: 'completed',
            progress: 100,
            areaInstalled: installation.totalArea,
            actualEndDate: now,
            'warranty.warrantyStartDate': now,
            updatedAt: now
          },
          $push: { statusHistory: { status: 'completed', timestamp: now, by: user.id, notes: body.completionNotes || 'Installation completed' } }
        })
        if (installation.projectId) {
          const project = await projects.findOne({ id: installation.projectId })
          await projects.updateOne({ id: installation.projectId }, { $set: { status: 'completed', actualEndDate: now, progress: 100 } })
          if (project?.crmLeadId) {
            await leads.updateOne({ id: project.crmLeadId }, { $set: { flooringStatus: 'installation_complete' } })
          }
        }
        // Sync installation status to invoice
        if (installation.invoiceId) {
          await invoices.updateOne(
            { id: installation.invoiceId },
            { $set: { installationStatus: 'completed', updatedAt: now } }
          )
        }
        return successResponse({ message: 'Installation completed' })

      case 'hold':
        await installations.updateOne({ id }, {
          $set: { status: 'on_hold', holdReason: body.reason, updatedAt: now },
          $push: { statusHistory: { status: 'on_hold', timestamp: now, by: user.id, notes: body.reason } }
        })
        return successResponse({ message: 'Installation on hold' })

      case 'add_issue':
        const issue = {
          id: uuidv4(),
          description: body.issueDescription,
          severity: body.severity || 'medium',
          reportedAt: now,
          reportedBy: user.id,
          status: 'open',
          photos: body.issuePhotos || []
        }
        await installations.updateOne({ id }, {
          $push: { issues: issue },
          $set: { updatedAt: now }
        })
        return successResponse({ message: 'Issue reported', issue })

      case 'update_checklist':
        const checklist = installation.checklist.map(item => {
          if (item.id === body.checklistItemId) {
            return { ...item, completed: body.completed, completedAt: body.completed ? now : null }
          }
          return item
        })
        await installations.updateOne({ id }, { $set: { checklist, updatedAt: now } })
        return successResponse({ message: 'Checklist updated' })

      case 'add_photos':
        // Add photos to before/during/after categories
        const photoCategory = body.category || 'during' // before, during, after
        const newPhotos = body.photos || []
        const photoField = `photos.${photoCategory}`
        await installations.updateOne({ id }, {
          $push: { [photoField]: { $each: newPhotos.map(p => ({ ...p, uploadedAt: now, uploadedBy: user.id })) } },
          $set: { updatedAt: now }
        })
        return successResponse({ message: `${newPhotos.length} photos added to ${photoCategory}` })

      case 'update_room':
        // Update room-wise progress
        const roomId = body.roomId
        const rooms = (installation.rooms || []).map(room => {
          if (room.id === roomId) {
            return { 
              ...room, 
              status: body.roomStatus || room.status,
              progress: body.roomProgress !== undefined ? body.roomProgress : room.progress,
              areaCompleted: body.areaCompleted !== undefined ? body.areaCompleted : room.areaCompleted,
              notes: body.roomNotes || room.notes,
              updatedAt: now
            }
          }
          return room
        })
        // Calculate overall progress from rooms
        const totalRoomArea = rooms.reduce((sum, r) => sum + (r.area || 0), 0)
        const completedArea = rooms.reduce((sum, r) => sum + (r.areaCompleted || 0), 0)
        const overallProgress = totalRoomArea > 0 ? Math.round((completedArea / totalRoomArea) * 100) : 0
        
        await installations.updateOne({ id }, { 
          $set: { rooms, areaInstalled: completedArea, progress: overallProgress, updatedAt: now } 
        })
        return successResponse({ message: 'Room updated', progress: overallProgress })

      case 'resolve_issue':
        const issues = (installation.issues || []).map(issue => {
          if (issue.id === body.issueId) {
            return { 
              ...issue, 
              status: 'resolved', 
              resolvedAt: now, 
              resolvedBy: user.id,
              resolution: body.resolution || 'Resolved'
            }
          }
          return issue
        })
        await installations.updateOne({ id }, { $set: { issues, updatedAt: now } })
        return successResponse({ message: 'Issue resolved' })

      case 'assign_installer':
        const installers = db.collection('flooring_installers')
        // Update installation
        await installations.updateOne({ id }, { 
          $set: { 
            assignedTo: body.installerId,
            team: body.team || [body.installerId],
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'installer_assigned', timestamp: now, by: user.id, notes: `Assigned to ${body.installerName}` } }
        })
        // Update installer availability
        if (body.installerId) {
          await installers.updateOne({ id: body.installerId }, {
            $set: { 
              isAvailable: false, 
              currentAssignment: {
                installationId: id,
                projectName: installation.customer?.name || 'Installation',
                startDate: installation.scheduledDate,
                expectedEnd: installation.estimatedEndDate
              },
              updatedAt: now
            },
            $inc: { 'metrics.totalJobs': 1 }
          })
        }
        return successResponse({ message: 'Installer assigned' })

      case 'unassign_installer':
        const installersCol = db.collection('flooring_installers')
        const prevInstallerId = installation.assignedTo
        await installations.updateOne({ id }, { 
          $set: { assignedTo: null, team: [], updatedAt: now },
          $push: { statusHistory: { status: 'installer_unassigned', timestamp: now, by: user.id } }
        })
        if (prevInstallerId) {
          await installersCol.updateOne({ id: prevInstallerId }, {
            $set: { isAvailable: true, currentAssignment: null, updatedAt: now }
          })
        }
        return successResponse({ message: 'Installer unassigned' })

      case 'save_signature':
        await installations.updateOne({ id }, { 
          $set: { 
            customerSignature: {
              signature: body.signature, // base64 image
              signedBy: body.signedBy,
              signedAt: now
            },
            updatedAt: now 
          }
        })
        return successResponse({ message: 'Signature saved' })

      case 'generate_certificate':
        const certId = uuidv4()
        const certificate = {
          id: certId,
          certificateNumber: `CERT-${Date.now().toString(36).toUpperCase()}`,
          generatedAt: now,
          generatedBy: user.id,
          customer: installation.customer,
          site: installation.site,
          totalArea: installation.totalArea,
          completedDate: installation.actualEndDate,
          warranty: installation.warranty,
          installerName: body.installerName,
          signature: installation.customerSignature
        }
        await installations.updateOne({ id }, { 
          $set: { completionCertificate: certificate, updatedAt: now }
        })
        return successResponse({ message: 'Certificate generated', certificate })

      default:
        updateData.updatedAt = now
        updateData.updatedBy = user.id
        const result = await installations.findOneAndUpdate(
          { id },
          { $set: updateData },
          { returnDocument: 'after' }
        )
        return successResponse(sanitizeDocument(result))
    }
  } catch (error) {
    console.error('Installations PUT Error:', error)
    return errorResponse('Failed to update installation', 500, error.message)
  }
}
