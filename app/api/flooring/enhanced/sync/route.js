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
      // Import CRM projects that have flooring module but no flooring project
      const crmFlooringProjects = await crmProjects.find({ 
        modules: 'flooring',
        flooringProjectId: { $exists: false }
      }).toArray()

      for (const crm of crmFlooringProjects) {
        try {
          // Check if already exists
          const existing = await flooringProjects.findOne({ crmProjectId: crm.id })
          if (existing) continue

          // Create flooring project from CRM project
          const projectNumber = `FLP-${new Date().getFullYear()}-${String((await flooringProjects.countDocuments()) + 1).padStart(4, '0')}`
          const flooringProjectId = uuidv4()

          const flooringProject = {
            id: flooringProjectId,
            projectNumber,
            name: crm.name,
            customerId: null,
            customerName: crm.leadId ? (await leads.findOne({ id: crm.leadId }))?.name : '',
            crmProjectId: crm.id,
            crmLeadId: crm.leadId,
            site: {
              address: '',
              city: '',
              state: '',
              pincode: ''
            },
            type: crm.type || 'residential',
            flooringType: 'hardwood',
            totalArea: 0,
            estimatedValue: crm.budget || 0,
            status: 'site_visit_pending',
            statusHistory: [{
              status: 'site_visit_pending',
              timestamp: now,
              by: user.id,
              notes: 'Imported from CRM'
            }],
            notes: crm.description || '',
            assignedTo: crm.assignedTo || user.id,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          }

          await flooringProjects.insertOne(flooringProject)

          // Update CRM project with flooring reference
          await crmProjects.updateOne(
            { id: crm.id },
            { $set: { flooringProjectId, updatedAt: now } }
          )

          results.created++
          results.synced++
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
