import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Sync data between CRM and Doors & Windows Module
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action, entityType, entityId, data } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const events = db.collection('dw_events')
    const now = new Date().toISOString()

    // Sync Projects from CRM to Doors & Windows Module
    if (action === 'sync_projects') {
      const projects = db.collection('projects')
      const dwProjects = db.collection('doors_windows_projects')
      
      // Get all projects that haven't been synced
      const syncedProjectIds = (await dwProjects.find({ crmProjectId: { $ne: null } }).toArray())
        .map(r => r.crmProjectId)
      
      const unsyncedProjects = await projects.find({
        id: { $nin: syncedProjectIds },
        status: { $nin: ['completed', 'cancelled'] }
      }).toArray()

      const results = { created: 0, updated: 0, errors: [] }

      for (const project of unsyncedProjects) {
        try {
          // Create a D&W project from the CRM project
          const projectNumber = `DWP-${new Date().getFullYear()}-${String(await dwProjects.countDocuments() + 1).padStart(5, '0')}`
          
          await dwProjects.insertOne({
            id: uuidv4(),
            projectNumber,
            clientId: user.clientId,
            name: project.name || `Project - ${project.id}`,
            crmProjectId: project.id,
            leadId: project.leadId || null,
            accountId: project.clientId || null,
            customer: {
              name: project.clientName || '',
              email: project.clientEmail || '',
              phone: project.clientPhone || '',
              address: project.siteAddress || project.address || ''
            },
            clientName: project.clientName || '',
            clientEmail: project.clientEmail || '',
            clientPhone: project.clientPhone || '',
            siteAddress: project.siteAddress || project.address || '',
            buildingType: project.buildingType || 'Residential - Independent',
            value: project.budget || project.value || 0,
            budget: project.budget || project.value || 0,
            status: 'new',
            priority: project.priority || 'medium',
            source: 'crm_sync',
            syncedFrom: { type: 'project', id: project.id, syncedAt: now },
            assignedTo: project.assignedTo || user.id,
            statusHistory: [{
              status: 'new',
              timestamp: now,
              by: user.id,
              notes: `Auto-created from CRM Project: ${project.name}`
            }],
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.created++
        } catch (err) {
          results.errors.push({ projectId: project.id, error: err.message })
        }
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'sync.projects',
        data: results,
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: `Synced ${results.created} projects`, 
        results,
        unsynced: unsyncedProjects.length
      })
    }

    // Sync Contacts from CRM to Doors & Windows Module
    if (action === 'sync_contacts') {
      const contacts = db.collection('contacts')
      const dwContacts = db.collection('dw_contacts')

      const allContacts = await contacts.find({ isActive: { $ne: false } }).toArray()
      const existingIds = (await dwContacts.find({}).toArray()).map(c => c.crmContactId)

      const results = { created: 0, updated: 0 }

      for (const contact of allContacts) {
        if (existingIds.includes(contact.id)) {
          // Update existing
          await dwContacts.updateOne(
            { crmContactId: contact.id },
            {
              $set: {
                name: contact.name,
                email: contact.email,
                phone: contact.phone || contact.mobile,
                company: contact.company,
                designation: contact.designation,
                address: contact.address,
                lastSyncedAt: now,
                updatedAt: now
              }
            }
          )
          results.updated++
        } else {
          // Create new
          await dwContacts.insertOne({
            id: uuidv4(),
            clientId: user.clientId,
            crmContactId: contact.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone || contact.mobile,
            company: contact.company,
            designation: contact.designation,
            address: contact.address,
            type: contact.type || 'customer',
            tags: contact.tags || [],
            lastSyncedAt: now,
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.created++
        }
      }

      return successResponse({ 
        message: `Synced ${results.created} new, ${results.updated} updated contacts`,
        results
      })
    }

    // Sync Leads from CRM to Doors & Windows Module
    if (action === 'sync_leads') {
      const leads = db.collection('leads')
      const dwProjects = db.collection('doors_windows_projects')

      const syncedLeadIds = (await dwProjects.find({ leadId: { $ne: null } }).toArray())
        .map(r => r.leadId)

      const unsyncedLeads = await leads.find({
        id: { $nin: syncedLeadIds },
        status: { $nin: ['converted', 'lost'] }
      }).toArray()

      const results = { created: 0, errors: [] }

      for (const lead of unsyncedLeads) {
        try {
          const projectNumber = `DWP-${new Date().getFullYear()}-${String(await dwProjects.countDocuments() + 1).padStart(5, '0')}`

          await dwProjects.insertOne({
            id: uuidv4(),
            projectNumber,
            clientId: user.clientId,
            name: lead.title || `Lead - ${lead.name}`,
            leadId: lead.id,
            customer: {
              name: lead.name || lead.contactName || '',
              email: lead.email || '',
              phone: lead.phone || lead.mobile || '',
              address: lead.address || ''
            },
            clientName: lead.name || lead.contactName || '',
            clientPhone: lead.phone || lead.mobile || '',
            clientEmail: lead.email || '',
            siteAddress: lead.address || '',
            value: lead.value || lead.budget || 0,
            budget: lead.value || lead.budget || 0,
            status: 'new',
            priority: lead.priority || 'medium',
            source: 'crm_sync',
            syncedFrom: { type: 'lead', id: lead.id, syncedAt: now },
            assignedTo: lead.assignedTo || user.id,
            statusHistory: [{
              status: 'new',
              timestamp: now,
              by: user.id,
              notes: `Auto-created from CRM Lead: ${lead.name}`
            }],
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.created++
        } catch (err) {
          results.errors.push({ leadId: lead.id, error: err.message })
        }
      }

      return successResponse({ 
        message: `Synced ${results.created} leads`,
        results
      })
    }

    // Push Project to CRM
    if (action === 'push_to_crm') {
      const dwProjects = db.collection('doors_windows_projects')
      const projects = db.collection('projects')

      const dwProject = await dwProjects.findOne({ id: entityId })
      if (!dwProject) return errorResponse('D&W Project not found', 404)

      if (dwProject.crmProjectId) {
        return errorResponse('Already linked to a CRM project', 400)
      }

      // Create project in CRM
      const projectId = uuidv4()
      const projectNumber = `PRJ-${new Date().getFullYear()}-${String(await projects.countDocuments() + 1).padStart(5, '0')}`

      const project = {
        id: projectId,
        projectNumber,
        name: dwProject.name,
        description: `Doors & Windows project: ${dwProject.projectNumber}`,
        status: 'planning',
        priority: dwProject.priority,
        clientName: dwProject.clientName || dwProject.customer?.name,
        clientEmail: dwProject.clientEmail || dwProject.customer?.email,
        clientPhone: dwProject.clientPhone || dwProject.customer?.phone,
        siteAddress: dwProject.siteAddress || dwProject.customer?.address,
        budget: dwProject.value || dwProject.budget,
        value: dwProject.value || dwProject.budget,
        moduleSource: 'doors_windows',
        linkedDWProject: dwProject.id,
        assignedTo: dwProject.assignedTo,
        tags: ['doors-windows', 'from-module'],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await projects.insertOne(project)

      // Update D&W project with CRM project link
      await dwProjects.updateOne(
        { id: entityId },
        { $set: { crmProjectId: projectId, crmSyncedAt: now, updatedAt: now } }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'project.pushed_to_crm',
        entityType: 'project',
        entityId,
        data: { projectId, projectNumber },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: 'Project pushed to CRM successfully',
        project: { id: projectId, projectNumber }
      })
    }

    // Get sync status
    if (action === 'status') {
      const projects = db.collection('projects')
      const leads = db.collection('leads')
      const contacts = db.collection('contacts')
      const dwProjects = db.collection('doors_windows_projects')
      const dwContacts = db.collection('dw_contacts')

      const [totalProjects, totalLeads, totalContacts, syncedProjects, syncedContacts] = await Promise.all([
        projects.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
        leads.countDocuments({ status: { $nin: ['converted', 'lost'] } }),
        contacts.countDocuments({ isActive: { $ne: false } }),
        dwProjects.countDocuments({ source: 'crm_sync' }),
        dwContacts.countDocuments({})
      ])

      return successResponse({
        crm: {
          projects: totalProjects,
          leads: totalLeads,
          contacts: totalContacts
        },
        doorsWindows: {
          syncedProjects,
          syncedContacts
        },
        lastSync: await events.findOne(
          { type: { $regex: /^sync\./ } },
          { sort: { timestamp: -1 } }
        )
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('D&W Sync Error:', error)
    return errorResponse('Sync failed', 500, error.message)
  }
}

// GET - Get sync status and history
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'status'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const events = db.collection('dw_events')

    if (type === 'history') {
      const history = await events.find(
        { type: { $regex: /^sync\./ } }
      ).sort({ timestamp: -1 }).limit(20).toArray()

      return successResponse({ history })
    }

    // Default: return sync status
    const projects = db.collection('projects')
    const leads = db.collection('leads')
    const contacts = db.collection('contacts')
    const dwProjects = db.collection('doors_windows_projects')

    const [projectCount, leadCount, contactCount, syncedCount] = await Promise.all([
      projects.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      leads.countDocuments({ status: { $nin: ['converted', 'lost'] } }),
      contacts.countDocuments({ isActive: { $ne: false } }),
      dwProjects.countDocuments({ source: 'crm_sync' })
    ])

    return successResponse({
      availableToSync: {
        projects: projectCount,
        leads: leadCount,
        contacts: contactCount
      },
      alreadySynced: syncedCount
    })
  } catch (error) {
    console.error('D&W Sync GET Error:', error)
    return errorResponse('Failed to get sync status', 500, error.message)
  }
}
