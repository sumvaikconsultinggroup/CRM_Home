/**
 * Data Integrity / Consistency Scanner
 * Scans for data integrity issues across the system
 */

import { getClientDb, getMainDb, listClientDatabases } from '@/lib/db/multitenancy'
import { v4 as uuidv4 } from 'uuid'

// Issue severity levels
export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

// Issue types
export const ISSUE_TYPES = {
  ORPHAN_RECORD: 'orphan_record',
  MISSING_REFERENCE: 'missing_reference',
  TOTAL_MISMATCH: 'total_mismatch',
  NEGATIVE_BALANCE: 'negative_balance',
  DUPLICATE_RECORD: 'duplicate_record',
  INVALID_STATE: 'invalid_state',
  MISSING_REQUIRED_FIELD: 'missing_required_field',
  INCONSISTENT_DATA: 'inconsistent_data'
}

/**
 * Run all integrity checks for a client
 */
export async function runFullScan(clientId) {
  const scanId = uuidv4()
  const startTime = Date.now()
  const issues = []
  
  try {
    const db = await getClientDb(clientId)
    
    // Run all checks
    issues.push(...await checkOrphanRecords(db, clientId))
    issues.push(...await checkMissingReferences(db, clientId))
    issues.push(...await checkFinancialTotals(db, clientId))
    issues.push(...await checkInventoryBalances(db, clientId))
    issues.push(...await checkDuplicateLeads(db, clientId))
    issues.push(...await checkInvalidStates(db, clientId))
    issues.push(...await checkRequiredFields(db, clientId))
    
    const endTime = Date.now()
    
    // Save scan report
    const report = {
      id: scanId,
      clientId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: endTime - startTime,
      totalIssues: issues.length,
      criticalCount: issues.filter(i => i.severity === SEVERITY.CRITICAL).length,
      highCount: issues.filter(i => i.severity === SEVERITY.HIGH).length,
      mediumCount: issues.filter(i => i.severity === SEVERITY.MEDIUM).length,
      lowCount: issues.filter(i => i.severity === SEVERITY.LOW).length,
      issues
    }
    
    // Store report
    const reportsCollection = db.collection('integrity_reports')
    await reportsCollection.insertOne(report)
    
    return report
  } catch (error) {
    console.error('Integrity scan failed:', error)
    return {
      id: scanId,
      clientId,
      error: error.message,
      issues
    }
  }
}

/**
 * Check for orphan records (module records without valid project)
 */
async function checkOrphanRecords(db, clientId) {
  const issues = []
  
  // Get all valid project IDs
  const projectsCollection = db.collection('projects')
  const validProjects = await projectsCollection.find({}).project({ id: 1 }).toArray()
  const validProjectIds = new Set(validProjects.map(p => p.id))
  
  // Check flooring quotes
  const quotesCollection = db.collection('flooring_quotes')
  const quotes = await quotesCollection.find({}).toArray()
  
  for (const quote of quotes) {
    if (quote.projectId && !validProjectIds.has(quote.projectId)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.ORPHAN_RECORD,
        severity: SEVERITY.HIGH,
        collection: 'flooring_quotes',
        recordId: quote.id,
        description: `Quote ${quote.quotationNumber || quote.id} references non-existent project: ${quote.projectId}`,
        autoFixable: false,
        suggestedFix: 'Manually link to correct project or delete quote'
      })
    }
  }
  
  // Check flooring invoices
  const invoicesCollection = db.collection('flooring_invoices')
  const invoices = await invoicesCollection.find({}).toArray()
  
  for (const invoice of invoices) {
    if (invoice.projectId && !validProjectIds.has(invoice.projectId)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.ORPHAN_RECORD,
        severity: SEVERITY.CRITICAL,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber || invoice.id} references non-existent project: ${invoice.projectId}`,
        autoFixable: false,
        suggestedFix: 'Manually link to correct project or delete invoice'
      })
    }
  }
  
  // Check tasks
  const tasksCollection = db.collection('tasks')
  const tasks = await tasksCollection.find({ projectId: { $exists: true, $ne: null } }).toArray()
  
  for (const task of tasks) {
    if (!validProjectIds.has(task.projectId)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.ORPHAN_RECORD,
        severity: SEVERITY.MEDIUM,
        collection: 'tasks',
        recordId: task.id,
        description: `Task ${task.title || task.id} references non-existent project: ${task.projectId}`,
        autoFixable: true,
        suggestedFix: 'Remove projectId reference'
      })
    }
  }
  
  return issues
}

/**
 * Check for missing references (e.g., invoice without customer)
 */
async function checkMissingReferences(db, clientId) {
  const issues = []
  
  // Get valid customer/contact IDs
  const contactsCollection = db.collection('contacts')
  const contacts = await contactsCollection.find({}).project({ id: 1 }).toArray()
  const validContactIds = new Set(contacts.map(c => c.id))
  
  const customersCollection = db.collection('flooring_customers')
  const customers = await customersCollection.find({}).project({ id: 1 }).toArray()
  const validCustomerIds = new Set(customers.map(c => c.id))
  
  // Check invoices have valid customer
  const invoicesCollection = db.collection('flooring_invoices')
  const invoices = await invoicesCollection.find({}).toArray()
  
  for (const invoice of invoices) {
    if (invoice.customerId && !validCustomerIds.has(invoice.customerId) && !validContactIds.has(invoice.customerId)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REFERENCE,
        severity: SEVERITY.HIGH,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} has invalid customer reference: ${invoice.customerId}`,
        autoFixable: false,
        suggestedFix: 'Update customer reference or create missing customer'
      })
    }
  }
  
  // Check quotes reference valid customer
  const quotesCollection = db.collection('flooring_quotes')
  const quotes = await quotesCollection.find({}).toArray()
  
  for (const quote of quotes) {
    if (quote.customerId && !validCustomerIds.has(quote.customerId) && !validContactIds.has(quote.customerId)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REFERENCE,
        severity: SEVERITY.MEDIUM,
        collection: 'flooring_quotes',
        recordId: quote.id,
        description: `Quote ${quote.quotationNumber} has invalid customer reference: ${quote.customerId}`,
        autoFixable: false,
        suggestedFix: 'Update customer reference'
      })
    }
  }
  
  return issues
}

/**
 * Check financial totals consistency
 */
async function checkFinancialTotals(db, clientId) {
  const issues = []
  
  const invoicesCollection = db.collection('flooring_invoices')
  const invoices = await invoicesCollection.find({}).toArray()
  
  for (const invoice of invoices) {
    // Check line items sum matches subtotal
    if (invoice.items && Array.isArray(invoice.items)) {
      const calculatedSubtotal = invoice.items.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.rate || item.unitPrice || 0))
      }, 0)
      
      const storedSubtotal = invoice.subtotal || 0
      const difference = Math.abs(calculatedSubtotal - storedSubtotal)
      
      if (difference > 0.01) { // Allow 1 paisa tolerance
        issues.push({
          id: uuidv4(),
          type: ISSUE_TYPES.TOTAL_MISMATCH,
          severity: SEVERITY.CRITICAL,
          collection: 'flooring_invoices',
          recordId: invoice.id,
          description: `Invoice ${invoice.invoiceNumber} subtotal mismatch: stored ${storedSubtotal}, calculated ${calculatedSubtotal}`,
          autoFixable: true,
          suggestedFix: 'Recalculate and update subtotal',
          metadata: { calculated: calculatedSubtotal, stored: storedSubtotal, difference }
        })
      }
    }
    
    // Check payment amount doesn't exceed total
    if (invoice.paidAmount > invoice.grandTotal) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.INCONSISTENT_DATA,
        severity: SEVERITY.CRITICAL,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} overpayment: paid ${invoice.paidAmount}, total ${invoice.grandTotal}`,
        autoFixable: false,
        suggestedFix: 'Review and correct payment records'
      })
    }
    
    // Check balance calculation
    const expectedBalance = (invoice.grandTotal || 0) - (invoice.paidAmount || 0)
    if (invoice.balance !== undefined && Math.abs(invoice.balance - expectedBalance) > 0.01) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.TOTAL_MISMATCH,
        severity: SEVERITY.HIGH,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} balance mismatch: stored ${invoice.balance}, expected ${expectedBalance}`,
        autoFixable: true,
        suggestedFix: 'Recalculate balance'
      })
    }
  }
  
  return issues
}

/**
 * Check for negative inventory balances
 */
async function checkInventoryBalances(db, clientId) {
  const issues = []
  
  const stockCollection = db.collection('wf_inventory_stock')
  const stockItems = await stockCollection.find({}).toArray()
  
  for (const item of stockItems) {
    const quantity = item.quantity || item.stockQuantity || 0
    if (quantity < 0) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.NEGATIVE_BALANCE,
        severity: SEVERITY.CRITICAL,
        collection: 'wf_inventory_stock',
        recordId: item.id || item.productId,
        description: `Negative stock for ${item.productName || item.sku || item.productId}: ${quantity}`,
        autoFixable: false,
        suggestedFix: 'Review inventory movements and correct stock level',
        metadata: { currentQuantity: quantity, productId: item.productId }
      })
    }
  }
  
  return issues
}

/**
 * Check for duplicate leads from integrations
 */
async function checkDuplicateLeads(db, clientId) {
  const issues = []
  
  const leadsCollection = db.collection('leads')
  
  // Group by email to find duplicates
  const emailDuplicates = await leadsCollection.aggregate([
    { $match: { email: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray()
  
  for (const dup of emailDuplicates) {
    issues.push({
      id: uuidv4(),
      type: ISSUE_TYPES.DUPLICATE_RECORD,
      severity: SEVERITY.MEDIUM,
      collection: 'leads',
      recordId: dup.ids[0],
      description: `Duplicate leads with email: ${dup._id} (${dup.count} records)`,
      autoFixable: false,
      suggestedFix: 'Merge duplicate leads',
      metadata: { email: dup._id, duplicateIds: dup.ids }
    })
  }
  
  // Group by phone to find duplicates
  const phoneDuplicates = await leadsCollection.aggregate([
    { $match: { phone: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$phone', count: { $sum: 1 }, ids: { $push: '$id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray()
  
  for (const dup of phoneDuplicates) {
    issues.push({
      id: uuidv4(),
      type: ISSUE_TYPES.DUPLICATE_RECORD,
      severity: SEVERITY.MEDIUM,
      collection: 'leads',
      recordId: dup.ids[0],
      description: `Duplicate leads with phone: ${dup._id} (${dup.count} records)`,
      autoFixable: false,
      suggestedFix: 'Merge duplicate leads',
      metadata: { phone: dup._id, duplicateIds: dup.ids }
    })
  }
  
  return issues
}

/**
 * Check for invalid state machine states
 */
async function checkInvalidStates(db, clientId) {
  const issues = []
  
  const validLeadStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const validProjectStages = ['planning', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled', 'archived']
  const validInvoiceStages = ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled']
  
  // Check leads
  const leadsCollection = db.collection('leads')
  const leads = await leadsCollection.find({}).toArray()
  
  for (const lead of leads) {
    if (lead.status && !validLeadStages.includes(lead.status)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.INVALID_STATE,
        severity: SEVERITY.HIGH,
        collection: 'leads',
        recordId: lead.id,
        description: `Lead ${lead.name || lead.id} has invalid status: ${lead.status}`,
        autoFixable: true,
        suggestedFix: `Set status to 'new'`,
        metadata: { currentStatus: lead.status, validStatuses: validLeadStages }
      })
    }
  }
  
  // Check projects
  const projectsCollection = db.collection('projects')
  const projects = await projectsCollection.find({}).toArray()
  
  for (const project of projects) {
    if (project.status && !validProjectStages.includes(project.status)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.INVALID_STATE,
        severity: SEVERITY.HIGH,
        collection: 'projects',
        recordId: project.id,
        description: `Project ${project.name || project.id} has invalid status: ${project.status}`,
        autoFixable: true,
        suggestedFix: `Set status to 'planning'`
      })
    }
  }
  
  // Check invoices
  const invoicesCollection = db.collection('flooring_invoices')
  const invoices = await invoicesCollection.find({}).toArray()
  
  for (const invoice of invoices) {
    if (invoice.status && !validInvoiceStages.includes(invoice.status)) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.INVALID_STATE,
        severity: SEVERITY.HIGH,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber || invoice.id} has invalid status: ${invoice.status}`,
        autoFixable: true,
        suggestedFix: `Set status to 'draft'`
      })
    }
  }
  
  return issues
}

/**
 * Check for missing required fields
 */
async function checkRequiredFields(db, clientId) {
  const issues = []
  
  // Projects required fields
  const projectsCollection = db.collection('projects')
  const projects = await projectsCollection.find({}).toArray()
  
  for (const project of projects) {
    if (!project.id) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REQUIRED_FIELD,
        severity: SEVERITY.CRITICAL,
        collection: 'projects',
        recordId: project._id?.toString(),
        description: 'Project missing required field: id',
        autoFixable: true,
        suggestedFix: 'Generate and assign UUID'
      })
    }
    if (!project.name && !project.projectNumber) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REQUIRED_FIELD,
        severity: SEVERITY.HIGH,
        collection: 'projects',
        recordId: project.id,
        description: 'Project missing name or projectNumber',
        autoFixable: false,
        suggestedFix: 'Add project name'
      })
    }
  }
  
  // Leads required fields
  const leadsCollection = db.collection('leads')
  const leads = await leadsCollection.find({}).toArray()
  
  for (const lead of leads) {
    if (!lead.email && !lead.phone) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REQUIRED_FIELD,
        severity: SEVERITY.HIGH,
        collection: 'leads',
        recordId: lead.id,
        description: 'Lead missing both email and phone - no way to contact',
        autoFixable: false,
        suggestedFix: 'Add email or phone number'
      })
    }
  }
  
  // Invoices required fields
  const invoicesCollection = db.collection('flooring_invoices')
  const invoices = await invoicesCollection.find({}).toArray()
  
  for (const invoice of invoices) {
    if (!invoice.invoiceNumber) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REQUIRED_FIELD,
        severity: SEVERITY.CRITICAL,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: 'Invoice missing invoiceNumber',
        autoFixable: true,
        suggestedFix: 'Generate invoice number'
      })
    }
    if (!invoice.items || invoice.items.length === 0) {
      issues.push({
        id: uuidv4(),
        type: ISSUE_TYPES.MISSING_REQUIRED_FIELD,
        severity: SEVERITY.HIGH,
        collection: 'flooring_invoices',
        recordId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber || invoice.id} has no line items`,
        autoFixable: false,
        suggestedFix: 'Add line items or delete invoice'
      })
    }
  }
  
  return issues
}

/**
 * Auto-fix safe issues
 */
export async function autoFixIssues(clientId, issueIds) {
  const db = await getClientDb(clientId)
  const fixed = []
  const failed = []
  
  // Get the latest scan report
  const reportsCollection = db.collection('integrity_reports')
  const latestReport = await reportsCollection.findOne(
    { clientId },
    { sort: { endTime: -1 } }
  )
  
  if (!latestReport) {
    return { fixed: [], failed: [], error: 'No scan report found' }
  }
  
  const issuesToFix = latestReport.issues.filter(i => 
    issueIds.includes(i.id) && i.autoFixable
  )
  
  for (const issue of issuesToFix) {
    try {
      const collection = db.collection(issue.collection)
      
      switch (issue.type) {
        case ISSUE_TYPES.ORPHAN_RECORD:
          if (issue.collection === 'tasks') {
            await collection.updateOne(
              { id: issue.recordId },
              { $unset: { projectId: '' } }
            )
            fixed.push(issue.id)
          }
          break
          
        case ISSUE_TYPES.TOTAL_MISMATCH:
          if (issue.metadata?.calculated !== undefined) {
            await collection.updateOne(
              { id: issue.recordId },
              { $set: { subtotal: issue.metadata.calculated } }
            )
            fixed.push(issue.id)
          }
          break
          
        case ISSUE_TYPES.INVALID_STATE:
          const defaultStates = {
            leads: 'new',
            projects: 'planning',
            flooring_invoices: 'draft'
          }
          if (defaultStates[issue.collection]) {
            await collection.updateOne(
              { id: issue.recordId },
              { $set: { status: defaultStates[issue.collection] } }
            )
            fixed.push(issue.id)
          }
          break
          
        default:
          failed.push({ id: issue.id, reason: 'No auto-fix available' })
      }
    } catch (error) {
      failed.push({ id: issue.id, reason: error.message })
    }
  }
  
  return { fixed, failed }
}

/**
 * Get the latest scan report
 */
export async function getLatestReport(clientId) {
  const db = await getClientDb(clientId)
  const reportsCollection = db.collection('integrity_reports')
  return reportsCollection.findOne(
    { clientId },
    { sort: { endTime: -1 } }
  )
}

/**
 * Get scan history
 */
export async function getScanHistory(clientId, limit = 10) {
  const db = await getClientDb(clientId)
  const reportsCollection = db.collection('integrity_reports')
  return reportsCollection
    .find({ clientId })
    .sort({ endTime: -1 })
    .limit(limit)
    .toArray()
}

export default {
  SEVERITY,
  ISSUE_TYPES,
  runFullScan,
  autoFixIssues,
  getLatestReport,
  getScanHistory
}
