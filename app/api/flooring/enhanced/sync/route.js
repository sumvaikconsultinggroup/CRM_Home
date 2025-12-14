import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Sync between CRM and Flooring module (Projects, Invoices, Quotes)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const flooringProjects = db.collection('flooring_projects')
    const flooringInvoices = db.collection('flooring_invoices')
    const flooringQuotes = db.collection('flooring_quotes_v2')
    const crmProjects = db.collection('projects')
    const contacts = db.collection('contacts')
    const leads = db.collection('leads')

    const now = new Date().toISOString()
    const results = { synced: 0, created: 0, updated: 0, invoicesSynced: 0, contactsUpdated: 0, errors: [] }

    // =============== SYNC INVOICES TO CRM ===============
    if (action === 'sync_invoices_to_crm') {
      const allInvoices = await flooringInvoices.find({}).toArray()
      
      for (const invoice of allInvoices) {
        try {
          // Update contact with invoice information
          const customerId = invoice.customer?.id || invoice.customer?.contactId
          if (customerId) {
            const contact = await contacts.findOne({ id: customerId })
            if (contact) {
              // Calculate customer totals
              const customerInvoices = allInvoices.filter(i => 
                (i.customer?.id === customerId || i.customer?.contactId === customerId)
              )
              
              const totalInvoiced = customerInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0)
              const totalPaid = customerInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0)
              const totalPending = customerInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0)
              const overdueInvoices = customerInvoices.filter(i => 
                new Date(i.dueDate) < new Date() && !['paid', 'cancelled'].includes(i.status)
              )
              
              await contacts.updateOne(
                { id: customerId },
                {
                  $set: {
                    flooringModule: {
                      totalInvoiced,
                      totalPaid,
                      totalPending,
                      invoiceCount: customerInvoices.length,
                      paidInvoiceCount: customerInvoices.filter(i => i.status === 'paid').length,
                      pendingInvoiceCount: customerInvoices.filter(i => !['paid', 'cancelled'].includes(i.status)).length,
                      overdueInvoiceCount: overdueInvoices.length,
                      overdueAmount: overdueInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0),
                      lastInvoiceDate: customerInvoices.length > 0 
                        ? customerInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt 
                        : null,
                      lastPaymentDate: customerInvoices.filter(i => i.lastPaymentDate).length > 0
                        ? customerInvoices.filter(i => i.lastPaymentDate).sort((a, b) => new Date(b.lastPaymentDate) - new Date(a.lastPaymentDate))[0].lastPaymentDate
                        : null,
                      lastSyncedAt: now
                    },
                    updatedAt: now
                  },
                  $addToSet: { modules: 'flooring' }
                }
              )
              results.contactsUpdated++
            }
          }
          
          // Update lead if linked
          if (invoice.leadId) {
            const leadStatus = {
              'draft': 'invoice_created',
              'sent': 'invoice_sent',
              'partially_paid': 'partial_payment',
              'paid': 'payment_complete',
              'cancelled': 'invoice_cancelled'
            }
            
            await leads.updateOne(
              { id: invoice.leadId },
              {
                $set: {
                  flooringInvoiceStatus: invoice.status,
                  flooringInvoiceId: invoice.id,
                  flooringInvoiceAmount: invoice.grandTotal,
                  flooringPaidAmount: invoice.paidAmount,
                  flooringPendingAmount: invoice.balanceAmount,
                  status: leadStatus[invoice.status] || 'invoice_created',
                  updatedAt: now
                }
              }
            )
          }
          
          // Mark invoice as synced
          await flooringInvoices.updateOne(
            { id: invoice.id },
            { $set: { crmSynced: true, crmSyncedAt: now } }
          )
          
          results.invoicesSynced++
          results.synced++
        } catch (err) {
          results.errors.push({ invoiceId: invoice.id, error: err.message })
        }
      }
      
      return successResponse({ 
        message: 'Invoice sync to CRM completed', 
        results 
      })
    }
    
    // =============== SYNC ALL TO CRM (Full Sync) ===============
    if (action === 'sync_all_to_crm') {
      // First sync invoices
      const allInvoices = await flooringInvoices.find({}).toArray()
      const contactUpdates = {}
      
      // Build contact aggregates from invoices
      for (const invoice of allInvoices) {
        const customerId = invoice.customer?.id || invoice.customer?.contactId
        if (customerId) {
          if (!contactUpdates[customerId]) {
            contactUpdates[customerId] = {
              totalInvoiced: 0,
              totalPaid: 0,
              totalPending: 0,
              invoiceCount: 0,
              paidInvoiceCount: 0,
              pendingInvoiceCount: 0,
              overdueInvoiceCount: 0,
              overdueAmount: 0,
              invoiceIds: [],
              lastInvoiceDate: null,
              lastPaymentDate: null
            }
          }
          
          const cu = contactUpdates[customerId]
          cu.totalInvoiced += invoice.grandTotal || 0
          cu.totalPaid += invoice.paidAmount || 0
          cu.totalPending += invoice.balanceAmount || 0
          cu.invoiceCount++
          cu.invoiceIds.push(invoice.id)
          
          if (invoice.status === 'paid') cu.paidInvoiceCount++
          if (!['paid', 'cancelled'].includes(invoice.status)) cu.pendingInvoiceCount++
          
          if (new Date(invoice.dueDate) < new Date() && !['paid', 'cancelled'].includes(invoice.status)) {
            cu.overdueInvoiceCount++
            cu.overdueAmount += invoice.balanceAmount || 0
          }
          
          if (!cu.lastInvoiceDate || invoice.createdAt > cu.lastInvoiceDate) {
            cu.lastInvoiceDate = invoice.createdAt
          }
          
          if (invoice.lastPaymentDate && (!cu.lastPaymentDate || invoice.lastPaymentDate > cu.lastPaymentDate)) {
            cu.lastPaymentDate = invoice.lastPaymentDate
          }
        }
      }
      
      // Update all contacts
      for (const [customerId, data] of Object.entries(contactUpdates)) {
        try {
          await contacts.updateOne(
            { id: customerId },
            {
              $set: {
                flooringModule: {
                  ...data,
                  lastSyncedAt: now
                },
                updatedAt: now
              },
              $addToSet: { modules: 'flooring' }
            }
          )
          results.contactsUpdated++
        } catch (err) {
          results.errors.push({ contactId: customerId, error: err.message })
        }
      }
      
      results.invoicesSynced = allInvoices.length

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
