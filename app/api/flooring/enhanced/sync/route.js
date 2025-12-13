import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Sync projects between CRM and Flooring module
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const flooringProjects = db.collection('flooring_projects')
    const crmProjects = db.collection('projects')
    const leads = db.collection('leads')

    const now = new Date().toISOString()
    const results = { synced: 0, created: 0, updated: 0, errors: [] }

    if (action === 'sync_to_crm') {
      // Sync flooring projects to CRM
      const allFlooringProjects = await flooringProjects.find({}).toArray()

      for (const fp of allFlooringProjects) {
        try {
          if (fp.crmProjectId) {
            // Update existing CRM project
            const statusMap = {
              'site_visit_pending': 'planning',
              'measurement_done': 'planning',
              'quote_sent': 'planning',
              'approved': 'in_progress',
              'in_progress': 'in_progress',
              'completed': 'completed',
              'cancelled': 'cancelled'
            }

            await crmProjects.updateOne(
              { id: fp.crmProjectId },
              {
                $set: {
                  name: fp.name,
                  budget: fp.estimatedValue,
                  status: statusMap[fp.status] || 'planning',
                  progress: fp.status === 'completed' ? 100 : (fp.status === 'in_progress' ? 50 : 0),
                  updatedAt: now
                },
                $addToSet: { modules: 'flooring' }
              }
            )
            results.updated++
          } else {
            // Create new CRM project
            const crmProjectId = uuidv4()
            const crmProject = {
              id: crmProjectId,
              name: fp.name,
              leadId: fp.crmLeadId,
              type: fp.type,
              status: 'planning',
              budget: fp.estimatedValue,
              progress: 0,
              modules: ['flooring'],
              flooringProjectId: fp.id,
              description: `Flooring project: ${fp.flooringType || 'hardwood'}, ${fp.totalArea || 0} sqft`,
              startDate: fp.expectedStartDate,
              endDate: fp.expectedEndDate,
              createdBy: user.id,
              createdAt: now,
              updatedAt: now
            }

            await crmProjects.insertOne(crmProject)
            
            // Update flooring project with CRM reference
            await flooringProjects.updateOne(
              { id: fp.id },
              { $set: { crmProjectId, updatedAt: now } }
            )
            results.created++
          }
          results.synced++
        } catch (err) {
          results.errors.push({ projectId: fp.id, error: err.message })
        }
      }
    } else if (action === 'sync_from_crm') {
      // STEP 1: Import NEW CRM projects that don't have a flooring project linked yet
      const newCrmProjects = await crmProjects.find({ 
        flooringProjectId: { $exists: false }
      }).toArray()

      for (const crm of newCrmProjects) {
        try {
          // Check if already exists by CRM project ID
          const existing = await flooringProjects.findOne({ crmProjectId: crm.id })
          if (existing) continue

          // Create flooring project from CRM project
          const count = await flooringProjects.countDocuments()
          const projectNumber = `FLP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
          const flooringProjectId = uuidv4()

          // Get customer name from lead or contact
          let customerName = ''
          if (crm.customerId) {
            const contact = await db.collection('contacts').findOne({ id: crm.customerId })
            customerName = contact?.displayName || contact?.name || ''
          } else if (crm.leadId) {
            const lead = await leads.findOne({ id: crm.leadId })
            customerName = lead?.name || ''
          }
          // Also check clientName field
          if (!customerName && crm.clientName) {
            customerName = crm.clientName
          }

          const flooringProject = {
            id: flooringProjectId,
            projectNumber,
            name: crm.name || `Project ${projectNumber}`,
            customerId: crm.customerId || null,
            customerName: customerName,
            crmProjectId: crm.id,
            crmLeadId: crm.leadId || null,
            site: {
              address: crm.address || '',
              city: crm.city || '',
              state: crm.state || '',
              pincode: crm.pincode || ''
            },
            type: crm.type || 'residential',
            flooringType: 'hardwood',
            totalArea: crm.area || 0,
            estimatedValue: crm.budget || 0,
            status: 'site_visit_pending',
            statusHistory: [{
              status: 'site_visit_pending',
              timestamp: now,
              by: user.id,
              notes: 'Imported from CRM'
            }],
            notes: crm.description || crm.notes || '',
            assignedTo: crm.assignedTo || user.id,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          }

          await flooringProjects.insertOne(flooringProject)

          // Update CRM project with flooring reference and add flooring module tag
          await crmProjects.updateOne(
            { id: crm.id },
            { 
              $set: { flooringProjectId, updatedAt: now },
              $addToSet: { modules: 'flooring' }
            }
          )

          results.created++
          results.synced++
        } catch (err) {
          results.errors.push({ crmProjectId: crm.id, error: err.message })
        }
      }

      // STEP 2: Update EXISTING linked flooring projects with changes from CRM
      const linkedCrmProjects = await crmProjects.find({ 
        flooringProjectId: { $exists: true, $ne: null }
      }).toArray()

      for (const crm of linkedCrmProjects) {
        try {
          const existingFlooring = await flooringProjects.findOne({ id: crm.flooringProjectId })
          if (!existingFlooring) continue

          // Get customer name
          let customerName = existingFlooring.customerName
          if (crm.customerId) {
            const contact = await db.collection('contacts').findOne({ id: crm.customerId })
            customerName = contact?.displayName || contact?.name || customerName
          } else if (crm.clientName) {
            customerName = crm.clientName
          }

          // Update flooring project with latest CRM data
          const updateData = {
            name: crm.name || existingFlooring.name,
            customerName: customerName,
            customerId: crm.customerId || existingFlooring.customerId,
            site: {
              address: crm.address || existingFlooring.site?.address || '',
              city: crm.city || existingFlooring.site?.city || '',
              state: crm.state || existingFlooring.site?.state || '',
              pincode: crm.pincode || existingFlooring.site?.pincode || ''
            },
            estimatedValue: crm.budget || existingFlooring.estimatedValue,
            notes: crm.description || crm.notes || existingFlooring.notes,
            updatedAt: now,
            lastSyncedAt: now
          }

          await flooringProjects.updateOne(
            { id: crm.flooringProjectId },
            { $set: updateData }
          )

          results.updated = (results.updated || 0) + 1
        } catch (err) {
          results.errors.push({ crmProjectId: crm.id, error: err.message })
        }
      }
    } else if (action === 'link_project') {
      // Link a CRM project to a flooring project
      const { flooringProjectId, crmProjectId } = body

      if (!flooringProjectId || !crmProjectId) {
        return errorResponse('Both flooring and CRM project IDs required', 400)
      }

      // Update flooring project
      await flooringProjects.updateOne(
        { id: flooringProjectId },
        { $set: { crmProjectId, updatedAt: now } }
      )

      // Update CRM project
      await crmProjects.updateOne(
        { id: crmProjectId },
        { 
          $set: { flooringProjectId, updatedAt: now },
          $addToSet: { modules: 'flooring' }
        }
      )

      results.synced = 1
    }

    return successResponse({ 
      message: 'Sync completed', 
      results 
    })
  } catch (error) {
    console.error('Project Sync Error:', error)
    return errorResponse('Failed to sync projects', 500, error.message)
  }
}

// GET - Get sync status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const flooringProjects = db.collection('flooring_projects')
    const crmProjects = db.collection('projects')

    const [allFlooring, allCrm] = await Promise.all([
      flooringProjects.find({}).toArray(),
      crmProjects.find({}).toArray()
    ])

    const crmWithFlooring = allCrm.filter(p => p.modules?.includes('flooring'))
    const flooringWithCrm = allFlooring.filter(p => p.crmProjectId)
    const flooringWithoutCrm = allFlooring.filter(p => !p.crmProjectId)
    const crmWithoutFlooring = crmWithFlooring.filter(p => !p.flooringProjectId)

    return successResponse({
      flooring: {
        total: allFlooring.length,
        linkedToCrm: flooringWithCrm.length,
        notLinked: flooringWithoutCrm.length
      },
      crm: {
        total: allCrm.length,
        withFlooringModule: crmWithFlooring.length,
        linkedToFlooring: crmWithFlooring.filter(p => p.flooringProjectId).length,
        notLinked: crmWithoutFlooring.length
      },
      unlinkedFlooringProjects: sanitizeDocuments(flooringWithoutCrm),
      unlinkedCrmProjects: sanitizeDocuments(crmWithoutFlooring)
    })
  } catch (error) {
    console.error('Sync Status Error:', error)
    return errorResponse('Failed to get sync status', 500, error.message)
  }
}
