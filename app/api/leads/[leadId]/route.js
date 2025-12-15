import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { leadId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const lead = await leadsCollection.findOne({ id: leadId })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    return successResponse(sanitizeDocument(lead))
  } catch (error) {
    console.error('Lead GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch lead', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { leadId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const existingLead = await leadsCollection.findOne({ id: leadId })
    if (!existingLead) {
      return errorResponse('Lead not found', 404)
    }

    const now = new Date()
    let projectCreated = null
    let contactUpdated = null

    // Get contacts collection for status-based updates
    const contactsCollection = db.collection('contacts')

    // Check if status is changing to "lost" - Update contact to nurturing
    if (body.status === 'lost' && existingLead.status !== 'lost') {
      // Find contact associated with this lead
      const leadContact = existingLead.contactId 
        ? await contactsCollection.findOne({ id: existingLead.contactId })
        : await contactsCollection.findOne({ leadId: leadId })
      
      if (leadContact) {
        await contactsCollection.updateOne(
          { id: leadContact.id },
          { 
            $set: { 
              type: 'nurturing',
              status: 'inactive',
              tags: [...new Set([...(leadContact.tags || []).filter(t => t !== 'new-lead'), 'lost-lead', 'nurturing'])],
              notes: `${leadContact.notes || ''}\n[${now.toISOString()}] Lead marked as lost - moved to nurturing.`,
              updatedAt: now
            }
          }
        )
        contactUpdated = { id: leadContact.id, type: 'nurturing' }
      }
    }

    // Check if status is changing to "won" - Auto-create project and update contact to customer
    if (body.status === 'won' && existingLead.status !== 'won') {
      const projectsCollection = db.collection('projects')
      
      // Check if project already exists for this lead
      const existingProject = await projectsCollection.findOne({ leadId: leadId })
      
      if (!existingProject) {
        // Generate project number
        const count = await projectsCollection.countDocuments()
        const projectNumber = `PRJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

        // Determine project type from lead source or category
        let projectType = 'default'
        if (existingLead.source?.toLowerCase().includes('interior')) projectType = 'interior_design'
        else if (existingLead.source?.toLowerCase().includes('renovation')) projectType = 'renovation'
        else if (existingLead.source?.toLowerCase().includes('construction')) projectType = 'new_construction'

        // Default milestones
        const DEFAULT_MILESTONES = {
          'interior_design': [
            { name: 'Initial Consultation', phase: 'planning', order: 1 },
            { name: 'Design Concept', phase: 'planning', order: 2 },
            { name: 'Design Approval', phase: 'planning', order: 3 },
            { name: 'Material Selection', phase: 'in_progress', order: 4 },
            { name: 'Procurement', phase: 'in_progress', order: 5 },
            { name: 'Installation', phase: 'in_progress', order: 6 },
            { name: 'Quality Check', phase: 'review', order: 7 },
            { name: 'Final Handover', phase: 'completed', order: 8 }
          ],
          'renovation': [
            { name: 'Site Survey', phase: 'planning', order: 1 },
            { name: 'Scope Definition', phase: 'planning', order: 2 },
            { name: 'Cost Estimation', phase: 'planning', order: 3 },
            { name: 'Demolition', phase: 'in_progress', order: 4 },
            { name: 'Construction', phase: 'in_progress', order: 5 },
            { name: 'Finishing', phase: 'in_progress', order: 6 },
            { name: 'Inspection', phase: 'review', order: 7 },
            { name: 'Handover', phase: 'completed', order: 8 }
          ],
          'new_construction': [
            { name: 'Land Survey', phase: 'planning', order: 1 },
            { name: 'Architectural Design', phase: 'planning', order: 2 },
            { name: 'Permits & Approvals', phase: 'planning', order: 3 },
            { name: 'Foundation', phase: 'in_progress', order: 4 },
            { name: 'Structure', phase: 'in_progress', order: 5 },
            { name: 'MEP Works', phase: 'in_progress', order: 6 },
            { name: 'Finishing', phase: 'in_progress', order: 7 },
            { name: 'Final Inspection', phase: 'review', order: 8 },
            { name: 'Handover', phase: 'completed', order: 9 }
          ],
          'default': [
            { name: 'Project Kickoff', phase: 'planning', order: 1 },
            { name: 'Requirements Gathering', phase: 'planning', order: 2 },
            { name: 'Execution', phase: 'in_progress', order: 3 },
            { name: 'Review', phase: 'review', order: 4 },
            { name: 'Completion', phase: 'completed', order: 5 }
          ]
        }

        const milestones = (DEFAULT_MILESTONES[projectType] || DEFAULT_MILESTONES.default).map(m => ({
          id: uuidv4(),
          ...m,
          status: 'pending',
          completedAt: null,
          completedBy: null
        }))

        // Create project from lead data
        const newProject = {
          id: uuidv4(),
          projectNumber,
          clientId: user.clientId,
          
          // Basic info from lead
          name: existingLead.title || existingLead.name || `Project - ${existingLead.company || existingLead.email}`,
          description: existingLead.notes || existingLead.requirements || `Project created from converted lead: ${existingLead.title || existingLead.name}`,
          projectType: projectType,
          priority: existingLead.priority || 'medium',
          
          // Source tracking
          sourceType: 'lead_conversion',
          sourceId: leadId,
          leadId: leadId,
          
          // Client info from lead
          clientName: existingLead.company || existingLead.name || '',
          clientEmail: existingLead.email || '',
          clientPhone: existingLead.phone || '',
          contactId: existingLead.contactId || null,
          siteAddress: existingLead.address || existingLead.location || '',
          
          // Status & Progress
          status: 'planning',
          progress: 0,
          
          // Dates
          startDate: now,
          endDate: null,
          actualStartDate: null,
          actualEndDate: null,
          
          // Budget from lead value
          budget: parseFloat(existingLead.value) || parseFloat(existingLead.dealValue) || 0,
          actualSpent: 0,
          estimatedCost: parseFloat(existingLead.value) || 0,
          currency: 'INR',
          
          // Milestones
          milestones: milestones,
          currentPhase: 'planning',
          
          // Team
          team: [],
          projectManager: user.id,
          
          // Tags
          tags: existingLead.tags || [],
          category: existingLead.source || '',
          
          // Settings
          settings: {
            autoProgressFromTasks: true,
            notifyOnMilestone: true,
            notifyOnOverdue: true
          },
          
          // Activity log
          activityLog: [{
            id: uuidv4(),
            action: 'project_created',
            description: `Project auto-created from won lead "${existingLead.title || existingLead.name}"`,
            userId: user.id,
            userName: user.name || user.email,
            timestamp: now
          }],
          
          // Metadata
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await projectsCollection.insertOne(newProject)
        projectCreated = newProject

        // Update lead with project reference
        body.projectId = newProject.id
        body.convertedAt = now
        body.convertedBy = user.id

        // Update existing contact to 'customer' type OR create new one if not exists
        // First try to find contact linked to this lead
        let leadContact = existingLead.contactId 
          ? await contactsCollection.findOne({ id: existingLead.contactId })
          : await contactsCollection.findOne({ leadId: leadId })
        
        // If no contact linked to lead, try finding by email
        if (!leadContact && existingLead.email) {
          leadContact = await contactsCollection.findOne({ email: existingLead.email.toLowerCase() })
        }
        
        if (leadContact) {
          // UPDATE existing contact to customer type
          await contactsCollection.updateOne(
            { id: leadContact.id },
            { 
              $set: { 
                type: 'customer',
                status: 'active',
                projectId: newProject.id,
                tags: [...new Set([...(leadContact.tags || []).filter(t => t !== 'new-lead' && t !== 'lost-lead' && t !== 'nurturing'), 'converted-lead', 'customer'])],
                notes: `${leadContact.notes || ''}\n[${now.toISOString()}] Lead converted to customer - Project: ${newProject.projectNumber}`,
                updatedAt: now
              }
            }
          )
          contactUpdated = { id: leadContact.id, type: 'customer' }
          
          // Update project with contact reference
          await projectsCollection.updateOne(
            { id: newProject.id },
            { $set: { contactId: leadContact.id } }
          )
          
          body.contactId = leadContact.id
        } else if (existingLead.name || existingLead.company || existingLead.email) {
          // Create new contact as customer if none exists
          const newContact = {
            id: uuidv4(),
            clientId: user.clientId,
            
            // Contact info from lead
            name: existingLead.name || existingLead.company || 'Unknown',
            email: existingLead.email?.toLowerCase() || '',
            phone: existingLead.phone || '',
            company: existingLead.company || '',
            
            // Type & Status - directly as customer since lead is won
            type: 'customer',
            status: 'active',
            
            // Address
            address: existingLead.address || existingLead.location || '',
            city: existingLead.city || '',
            state: existingLead.state || '',
            country: existingLead.country || 'India',
            pincode: existingLead.pincode || '',
            
            // Source tracking
            sourceType: 'lead_conversion',
            sourceId: leadId,
            leadId: leadId,
            projectId: newProject.id,
            
            // Tags
            tags: ['converted-lead', 'customer', ...(existingLead.tags || [])],
            notes: `Contact created from won lead: ${existingLead.title || existingLead.name}. Project: ${newProject.projectNumber}`,
            
            // Stats
            totalRevenue: 0,
            totalProjects: 1,
            lastContactedAt: null,
            
            // Metadata
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          }
          
          await contactsCollection.insertOne(newContact)
          contactUpdated = { id: newContact.id, type: 'customer', created: true }
          
          // Update project with contact reference
          await projectsCollection.updateOne(
            { id: newProject.id },
            { $set: { contactId: newContact.id } }
          )
          
          body.contactId = newContact.id
        }
      }
    }

    const updatedLead = {
      ...existingLead,
      ...body,
      id: leadId,
      updatedAt: now
    }

    await leadsCollection.updateOne(
      { id: leadId },
      { $set: updatedLead }
    )

    return successResponse({
      lead: sanitizeDocument(updatedLead),
      projectCreated: projectCreated ? sanitizeDocument(projectCreated) : null,
      message: projectCreated ? `Lead converted to project: ${projectCreated.projectNumber}` : 'Lead updated successfully'
    })
  } catch (error) {
    console.error('Lead PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update lead', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { leadId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leadsCollection = db.collection('leads')

    const result = await leadsCollection.deleteOne({ id: leadId })

    if (result.deletedCount === 0) {
      return errorResponse('Lead not found', 404)
    }

    return successResponse({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Lead DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete lead', 500, error.message)
  }
}
