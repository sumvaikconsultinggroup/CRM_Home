import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Sync data between CRM and Furniture Module
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action, entityType, entityId, data } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const events = db.collection('furniture_events')
    const now = new Date().toISOString()

    // Sync Projects from CRM to Furniture Module
    if (action === 'sync_projects') {
      const projects = db.collection('projects')
      const furnReqs = db.collection('furniture_requirements')
      
      // Get all projects that haven't been synced
      const syncedProjectIds = (await furnReqs.find({ projectId: { $ne: null } }).toArray())
        .map(r => r.projectId)
      
      const unsyncedProjects = await projects.find({
        id: { $nin: syncedProjectIds },
        status: { $nin: ['completed', 'cancelled'] }
      }).toArray()

      const results = { created: 0, updated: 0, errors: [] }

      for (const project of unsyncedProjects) {
        try {
          // Create a requirement from the project
          const reqNumber = `FRQ-${new Date().getFullYear()}-${String(await furnReqs.countDocuments() + 1).padStart(5, '0')}`
          
          await furnReqs.insertOne({
            id: uuidv4(),
            requirementNumber: reqNumber,
            title: project.name || `Project - ${project.id}`,
            projectId: project.id,
            leadId: project.leadId || null,
            accountId: project.clientId || null,
            customer: {
              name: project.clientName || '',
              email: project.clientEmail || '',
              phone: project.clientPhone || '',
              address: project.siteAddress || project.address || ''
            },
            estimatedBudget: project.budget || project.value || 0,
            timeline: 'flexible',
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

    // Sync Contacts from CRM to Furniture Module
    if (action === 'sync_contacts') {
      const contacts = db.collection('contacts')
      const furnContacts = db.collection('furniture_contacts')

      const allContacts = await contacts.find({ isActive: { $ne: false } }).toArray()
      const existingIds = (await furnContacts.find({}).toArray()).map(c => c.crmContactId)

      const results = { created: 0, updated: 0 }

      for (const contact of allContacts) {
        if (existingIds.includes(contact.id)) {
          // Update existing
          await furnContacts.updateOne(
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
          await furnContacts.insertOne({
            id: uuidv4(),
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

    // Sync Leads from CRM to Furniture Module
    if (action === 'sync_leads') {
      const leads = db.collection('leads')
      const furnReqs = db.collection('furniture_requirements')

      const syncedLeadIds = (await furnReqs.find({ leadId: { $ne: null } }).toArray())
        .map(r => r.leadId)

      const unsyncedLeads = await leads.find({
        id: { $nin: syncedLeadIds },
        status: { $nin: ['converted', 'lost'] }
      }).toArray()

      const results = { created: 0, errors: [] }

      for (const lead of unsyncedLeads) {
        try {
          const reqNumber = `FRQ-${new Date().getFullYear()}-${String(await furnReqs.countDocuments() + 1).padStart(5, '0')}`

          await furnReqs.insertOne({
            id: uuidv4(),
            requirementNumber: reqNumber,
            title: lead.title || `Lead - ${lead.name}`,
            leadId: lead.id,
            customer: {
              name: lead.name || lead.contactName || '',
              email: lead.email || '',
              phone: lead.phone || lead.mobile || '',
              address: lead.address || ''
            },
            estimatedBudget: lead.value || lead.budget || 0,
            timeline: 'flexible',
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

    // Push Requirement to CRM as Project
    if (action === 'push_to_crm') {
      const furnReqs = db.collection('furniture_requirements')
      const projects = db.collection('projects')

      const requirement = await furnReqs.findOne({ id: entityId })
      if (!requirement) return errorResponse('Requirement not found', 404)

      if (requirement.projectId) {
        return errorResponse('Already linked to a CRM project', 400)
      }

      // Create project in CRM
      const projectId = uuidv4()
      const projectNumber = `PRJ-${new Date().getFullYear()}-${String(await projects.countDocuments() + 1).padStart(5, '0')}`

      const project = {
        id: projectId,
        projectNumber,
        name: requirement.title,
        description: `Furniture requirement: ${requirement.requirementNumber}`,
        status: 'planning',
        priority: requirement.priority,
        clientName: requirement.customer?.name,
        clientEmail: requirement.customer?.email,
        clientPhone: requirement.customer?.phone,
        siteAddress: requirement.customer?.address,
        budget: requirement.estimatedBudget,
        value: requirement.estimatedBudget,
        moduleSource: 'furniture',
        linkedRequirement: requirement.id,
        assignedTo: requirement.assignedTo,
        tags: ['furniture', 'from-module'],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await projects.insertOne(project)

      // Update requirement with project link
      await furnReqs.updateOne(
        { id: entityId },
        { $set: { projectId, crmSyncedAt: now, updatedAt: now } }
      )

      await events.insertOne({
        id: uuidv4(),
        type: 'requirement.pushed_to_crm',
        entityType: 'requirement',
        entityId,
        data: { projectId, projectNumber },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ 
        message: 'Requirement pushed to CRM as project',
        project: { id: projectId, projectNumber }
      })
    }

    // Get sync status
    if (action === 'status') {
      const projects = db.collection('projects')
      const leads = db.collection('leads')
      const contacts = db.collection('contacts')
      const furnReqs = db.collection('furniture_requirements')
      const furnContacts = db.collection('furniture_contacts')

      const [totalProjects, totalLeads, totalContacts, syncedReqs, syncedContacts] = await Promise.all([
        projects.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
        leads.countDocuments({ status: { $nin: ['converted', 'lost'] } }),
        contacts.countDocuments({ isActive: { $ne: false } }),
        furnReqs.countDocuments({ $or: [{ projectId: { $ne: null } }, { leadId: { $ne: null } }] }),
        furnContacts.countDocuments({})
      ])

      return successResponse({
        crm: {
          projects: totalProjects,
          leads: totalLeads,
          contacts: totalContacts
        },
        furniture: {
          syncedRequirements: syncedReqs,
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
    console.error('Furniture Sync Error:', error)
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
    const events = db.collection('furniture_events')

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
    const furnReqs = db.collection('furniture_requirements')

    const [projectCount, leadCount, contactCount, reqCount] = await Promise.all([
      projects.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      leads.countDocuments({ status: { $nin: ['converted', 'lost'] } }),
      contacts.countDocuments({ isActive: { $ne: false } }),
      furnReqs.countDocuments({ source: 'crm_sync' })
    ])

    return successResponse({
      availableToSync: {
        projects: projectCount,
        leads: leadCount,
        contacts: contactCount
      },
      alreadySynced: reqCount
    })
  } catch (error) {
    console.error('Furniture Sync GET Error:', error)
    return errorResponse('Failed to get sync status', 500, error.message)
  }
}
