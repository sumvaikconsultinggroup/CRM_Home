/**
 * =====================================================
 * D&W MODULE - COLLECTIONS & ACCOUNTS RECEIVABLE API
 * =====================================================
 * 
 * Enterprise-grade collections management for D&W module.
 * Tracks outstanding amounts, dealer credit usage, and payment collections.
 * 
 * Features:
 * - Outstanding summary by customer/dealer
 * - Aging analysis (current, 30, 60, 90+ days)
 * - Dealer credit utilization tracking
 * - Collection targets and performance
 * - Payment reminders and follow-ups
 * - Bad debt tracking
 */

import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Collection Status
const COLLECTION_STATUS = ['pending', 'promised', 'partial', 'collected', 'disputed', 'written_off']

// Aging Buckets
const AGING_BUCKETS = [
  { id: 'current', name: 'Current (Not Due)', minDays: null, maxDays: 0 },
  { id: '1-30', name: '1-30 Days', minDays: 1, maxDays: 30 },
  { id: '31-60', name: '31-60 Days', minDays: 31, maxDays: 60 },
  { id: '61-90', name: '61-90 Days', minDays: 61, maxDays: 90 },
  { id: '90+', name: '90+ Days', minDays: 91, maxDays: null }
]

// GET - Fetch collections data
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'summary' // summary, aging, dealer, customer, followups
    const dealerId = searchParams.get('dealerId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const agingBucket = searchParams.get('agingBucket')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('dw_invoices')
    const payments = db.collection('dw_payments')
    const dealers = db.collection('dw_dealers')
    const orders = db.collection('dw_orders')
    const followUps = db.collection('dw_collection_followups')

    const now = new Date()

    // Helper function to calculate aging bucket
    const getAgingBucket = (dueDate) => {
      if (!dueDate) return 'current'
      const due = new Date(dueDate)
      const daysPastDue = Math.floor((now - due) / (1000 * 60 * 60 * 24))
      
      if (daysPastDue <= 0) return 'current'
      if (daysPastDue <= 30) return '1-30'
      if (daysPastDue <= 60) return '31-60'
      if (daysPastDue <= 90) return '61-90'
      return '90+'
    }

    // SUMMARY VIEW - Overall collections dashboard
    if (view === 'summary') {
      const allInvoices = await invoices.find({ 
        status: { $nin: ['cancelled', 'void'] }
      }).toArray()

      const allPayments = await payments.find({}).toArray()

      // Calculate totals
      const totalInvoiced = allInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
      const totalCollected = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const totalOutstanding = allInvoices.reduce((sum, inv) => 
        sum + ((inv.grandTotal || 0) - (inv.paidAmount || 0)), 0
      )

      // Aging analysis
      const aging = {
        current: { count: 0, amount: 0 },
        '1-30': { count: 0, amount: 0 },
        '31-60': { count: 0, amount: 0 },
        '61-90': { count: 0, amount: 0 },
        '90+': { count: 0, amount: 0 }
      }

      const outstandingInvoices = allInvoices.filter(inv => 
        (inv.grandTotal || 0) > (inv.paidAmount || 0) && 
        inv.status !== 'paid'
      )

      outstandingInvoices.forEach(inv => {
        const bucket = getAgingBucket(inv.dueDate)
        const outstanding = (inv.grandTotal || 0) - (inv.paidAmount || 0)
        aging[bucket].count++
        aging[bucket].amount += outstanding
      })

      // This month collections
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthPayments = allPayments.filter(p => new Date(p.date || p.createdAt) >= thisMonthStart)
      const thisMonthCollected = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

      // Collection efficiency
      const dueThisMonth = allInvoices.filter(inv => {
        const due = new Date(inv.dueDate)
        return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear()
      }).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)

      const collectionEfficiency = dueThisMonth > 0 
        ? Math.round(thisMonthCollected / dueThisMonth * 100)
        : 100

      // Top overdue customers/dealers
      const overdueByCustomer = {}
      outstandingInvoices.filter(inv => getAgingBucket(inv.dueDate) !== 'current').forEach(inv => {
        const key = inv.dealerId || inv.customerId || 'unknown'
        const name = inv.dealerName || inv.customerName || 'Unknown'
        if (!overdueByCustomer[key]) {
          overdueByCustomer[key] = { id: key, name, amount: 0, count: 0 }
        }
        overdueByCustomer[key].amount += (inv.grandTotal || 0) - (inv.paidAmount || 0)
        overdueByCustomer[key].count++
      })

      const topOverdue = Object.values(overdueByCustomer)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      return successResponse({
        summary: {
          totalInvoiced,
          totalCollected,
          totalOutstanding,
          collectionRate: totalInvoiced > 0 ? Math.round(totalCollected / totalInvoiced * 100) : 0,
          thisMonthCollected,
          collectionEfficiency,
          overdueAmount: aging['1-30'].amount + aging['31-60'].amount + aging['61-90'].amount + aging['90+'].amount,
          invoiceCount: allInvoices.length,
          outstandingCount: outstandingInvoices.length
        },
        aging,
        topOverdue,
        agingBuckets: AGING_BUCKETS
      })
    }

    // AGING VIEW - Detailed aging report
    if (view === 'aging') {
      const outstandingInvoices = await invoices.find({
        status: { $nin: ['cancelled', 'void', 'paid'] },
        $expr: { $gt: ['$grandTotal', { $ifNull: ['$paidAmount', 0] }] }
      }).sort({ dueDate: 1 }).toArray()

      // Group by aging bucket
      const byBucket = AGING_BUCKETS.reduce((acc, bucket) => {
        acc[bucket.id] = { ...bucket, invoices: [], total: 0 }
        return acc
      }, {})

      outstandingInvoices.forEach(inv => {
        const bucket = getAgingBucket(inv.dueDate)
        const outstanding = (inv.grandTotal || 0) - (inv.paidAmount || 0)
        byBucket[bucket].invoices.push({
          ...inv,
          outstandingAmount: outstanding,
          agingDays: Math.max(0, Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)))
        })
        byBucket[bucket].total += outstanding
      })

      // Filter by specific bucket if requested
      if (agingBucket && byBucket[agingBucket]) {
        return successResponse({
          bucket: byBucket[agingBucket],
          invoices: sanitizeDocuments(byBucket[agingBucket].invoices)
        })
      }

      return successResponse({
        aging: byBucket,
        totalOutstanding: Object.values(byBucket).reduce((sum, b) => sum + b.total, 0)
      })
    }

    // DEALER VIEW - Dealer-wise outstanding and credit usage
    if (view === 'dealer') {
      const allDealers = await dealers.find({ status: 'active' }).toArray()
      const dealerInvoices = await invoices.find({
        dealerId: { $exists: true, $ne: null },
        status: { $nin: ['cancelled', 'void'] }
      }).toArray()

      const dealerData = allDealers.map(dealer => {
        const dealerInvs = dealerInvoices.filter(inv => inv.dealerId === dealer.id)
        const totalInvoiced = dealerInvs.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
        const totalPaid = dealerInvs.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
        const outstanding = totalInvoiced - totalPaid

        // Aging for this dealer
        const aging = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
        dealerInvs.filter(inv => (inv.grandTotal || 0) > (inv.paidAmount || 0)).forEach(inv => {
          const bucket = getAgingBucket(inv.dueDate)
          aging[bucket] += (inv.grandTotal || 0) - (inv.paidAmount || 0)
        })

        return {
          dealerId: dealer.id,
          dealerCode: dealer.dealerCode,
          dealerName: dealer.companyName,
          tier: dealer.tier,
          creditLimit: dealer.creditLimit || 0,
          creditUsed: dealer.creditUsed || 0,
          creditAvailable: (dealer.creditLimit || 0) - (dealer.creditUsed || 0),
          creditUtilization: dealer.creditLimit > 0 
            ? Math.round((dealer.creditUsed || 0) / dealer.creditLimit * 100)
            : 0,
          totalInvoiced,
          totalPaid,
          outstanding,
          aging,
          invoiceCount: dealerInvs.length,
          overdueAmount: aging['1-30'] + aging['31-60'] + aging['61-90'] + aging['90+']
        }
      })

      // Filter by specific dealer if requested
      if (dealerId) {
        const dealer = dealerData.find(d => d.dealerId === dealerId)
        if (!dealer) return errorResponse('Dealer not found', 404)

        // Get detailed invoices
        const detailedInvoices = await invoices.find({
          dealerId,
          status: { $nin: ['cancelled', 'void'] }
        }).sort({ dueDate: 1 }).toArray()

        return successResponse({
          dealer,
          invoices: sanitizeDocuments(detailedInvoices.map(inv => ({
            ...inv,
            outstandingAmount: (inv.grandTotal || 0) - (inv.paidAmount || 0),
            agingBucket: getAgingBucket(inv.dueDate)
          })))
        })
      }

      // Sort by outstanding amount
      dealerData.sort((a, b) => b.outstanding - a.outstanding)

      return successResponse({
        dealers: dealerData,
        summary: {
          totalDealers: dealerData.length,
          totalCreditLimit: dealerData.reduce((sum, d) => sum + d.creditLimit, 0),
          totalCreditUsed: dealerData.reduce((sum, d) => sum + d.creditUsed, 0),
          totalOutstanding: dealerData.reduce((sum, d) => sum + d.outstanding, 0),
          dealersOverLimit: dealerData.filter(d => d.creditUtilization > 100).length
        }
      })
    }

    // FOLLOWUPS VIEW - Collection follow-ups and reminders
    if (view === 'followups') {
      let query = {}
      if (status) query.status = status
      if (dealerId) query.dealerId = dealerId
      if (customerId) query.customerId = customerId

      const followUpList = await followUps.find(query).sort({ scheduledDate: 1 }).toArray()

      // Get upcoming follow-ups (next 7 days)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const upcoming = followUpList.filter(f => 
        f.status === 'pending' && 
        new Date(f.scheduledDate) <= sevenDaysFromNow
      )

      // Get overdue follow-ups
      const overdue = followUpList.filter(f =>
        f.status === 'pending' &&
        new Date(f.scheduledDate) < now
      )

      return successResponse({
        followUps: sanitizeDocuments(followUpList),
        upcoming: sanitizeDocuments(upcoming),
        overdue: sanitizeDocuments(overdue),
        stats: {
          total: followUpList.length,
          pending: followUpList.filter(f => f.status === 'pending').length,
          completed: followUpList.filter(f => f.status === 'completed').length,
          overdue: overdue.length
        }
      })
    }

    return errorResponse('Invalid view parameter', 400)
  } catch (error) {
    console.error('DW Collections GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch collections data', 500, error.message)
  }
}

// POST - Record collection or create follow-up
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoices = db.collection('dw_invoices')
    const payments = db.collection('dw_payments')
    const dealers = db.collection('dw_dealers')
    const followUps = db.collection('dw_collection_followups')

    const now = new Date().toISOString()

    // Record payment collection
    if (action === 'record_payment') {
      const { invoiceId, amount, paymentMethod, reference, paymentDate, notes, dealerId } = body

      if (!invoiceId || !amount || amount <= 0) {
        return errorResponse('Invoice ID and valid amount are required', 400)
      }

      const invoice = await invoices.findOne({ id: invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)

      const outstanding = (invoice.grandTotal || 0) - (invoice.paidAmount || 0)
      if (amount > outstanding) {
        return errorResponse(`Payment amount exceeds outstanding balance of ${outstanding}`, 400)
      }

      // Generate payment number
      const count = await payments.countDocuments()
      const paymentNumber = `PAY-DW-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

      const payment = {
        id: uuidv4(),
        paymentNumber,
        clientId: user.clientId,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        dealerId: dealerId || invoice.dealerId,
        dealerName: invoice.dealerName,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'bank_transfer',
        reference: reference || '',
        date: paymentDate || now.split('T')[0],
        notes: notes || '',
        status: 'completed',
        receivedBy: user.id,
        receivedByName: user.name || user.email,
        createdAt: now,
        updatedAt: now
      }

      await payments.insertOne(payment)

      // Update invoice
      const newPaidAmount = (invoice.paidAmount || 0) + parseFloat(amount)
      const newOutstanding = invoice.grandTotal - newPaidAmount
      const newStatus = newOutstanding <= 0 ? 'paid' : 'partial'

      await invoices.updateOne({ id: invoiceId }, {
        $set: {
          paidAmount: newPaidAmount,
          balanceAmount: Math.max(0, newOutstanding),
          status: newStatus,
          lastPaymentDate: now,
          updatedAt: now
        },
        $push: {
          paymentHistory: {
            paymentId: payment.id,
            paymentNumber,
            amount: parseFloat(amount),
            method: paymentMethod,
            date: paymentDate || now.split('T')[0],
            recordedBy: user.id,
            recordedAt: now
          }
        }
      })

      // Update dealer credit if applicable
      if (dealerId || invoice.dealerId) {
        const dId = dealerId || invoice.dealerId
        const dealer = await dealers.findOne({ id: dId })
        if (dealer) {
          const newCreditUsed = Math.max(0, (dealer.creditUsed || 0) - parseFloat(amount))
          await dealers.updateOne({ id: dId }, {
            $set: {
              creditUsed: newCreditUsed,
              creditAvailable: (dealer.creditLimit || 0) - newCreditUsed,
              lastPaymentDate: now,
              updatedAt: now
            }
          })
        }
      }

      return successResponse({
        payment: sanitizeDocument(payment),
        invoiceStatus: newStatus,
        newOutstanding: Math.max(0, newOutstanding),
        message: 'Payment recorded successfully'
      }, 201)
    }

    // Create collection follow-up
    if (action === 'create_followup') {
      const { invoiceId, dealerId, customerId, scheduledDate, type, notes, priority } = body

      if (!scheduledDate) {
        return errorResponse('Scheduled date is required', 400)
      }

      const followUp = {
        id: uuidv4(),
        clientId: user.clientId,
        invoiceId: invoiceId || null,
        dealerId: dealerId || null,
        customerId: customerId || null,
        scheduledDate,
        type: type || 'call', // call, email, visit, legal
        notes: notes || '',
        priority: priority || 'medium', // low, medium, high, critical
        status: 'pending',
        assignedTo: body.assignedTo || user.id,
        assignedToName: body.assignedToName || user.name || user.email,
        outcome: null,
        outcomeNotes: '',
        completedAt: null,
        completedBy: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      // Get invoice/customer details if provided
      if (invoiceId) {
        const invoice = await invoices.findOne({ id: invoiceId })
        if (invoice) {
          followUp.invoiceNumber = invoice.invoiceNumber
          followUp.invoiceAmount = invoice.grandTotal
          followUp.outstandingAmount = (invoice.grandTotal || 0) - (invoice.paidAmount || 0)
          followUp.dealerName = invoice.dealerName
          followUp.customerName = invoice.customerName
        }
      }

      await followUps.insertOne(followUp)

      return successResponse({
        followUp: sanitizeDocument(followUp),
        message: 'Follow-up created'
      }, 201)
    }

    // Complete follow-up
    if (action === 'complete_followup') {
      const { followUpId, outcome, notes, promisedAmount, promisedDate, nextFollowUpDate } = body

      if (!followUpId || !outcome) {
        return errorResponse('Follow-up ID and outcome are required', 400)
      }

      const followUp = await followUps.findOne({ id: followUpId })
      if (!followUp) return errorResponse('Follow-up not found', 404)

      await followUps.updateOne({ id: followUpId }, {
        $set: {
          status: 'completed',
          outcome, // contacted, promised, partial_payment, disputed, no_response, payment_received
          outcomeNotes: notes || '',
          promisedAmount: promisedAmount ? parseFloat(promisedAmount) : null,
          promisedDate: promisedDate || null,
          completedAt: now,
          completedBy: user.id,
          updatedAt: now
        }
      })

      // Create next follow-up if date provided
      if (nextFollowUpDate) {
        const nextFollowUp = {
          id: uuidv4(),
          clientId: user.clientId,
          invoiceId: followUp.invoiceId,
          dealerId: followUp.dealerId,
          customerId: followUp.customerId,
          invoiceNumber: followUp.invoiceNumber,
          invoiceAmount: followUp.invoiceAmount,
          outstandingAmount: followUp.outstandingAmount,
          dealerName: followUp.dealerName,
          customerName: followUp.customerName,
          scheduledDate: nextFollowUpDate,
          type: followUp.type,
          notes: `Follow-up from ${followUp.id}. Previous outcome: ${outcome}`,
          priority: followUp.priority,
          status: 'pending',
          assignedTo: followUp.assignedTo,
          assignedToName: followUp.assignedToName,
          previousFollowUpId: followUpId,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await followUps.insertOne(nextFollowUp)

        return successResponse({
          message: 'Follow-up completed and next follow-up scheduled',
          nextFollowUp: sanitizeDocument(nextFollowUp)
        })
      }

      return successResponse({ message: 'Follow-up completed' })
    }

    // Bulk create follow-ups for overdue invoices
    if (action === 'bulk_create_followups') {
      const { agingBucket, priority, type, daysFromNow } = body

      const now = new Date()
      const scheduledDate = new Date(now.getTime() + (daysFromNow || 1) * 24 * 60 * 60 * 1000).toISOString()

      // Get overdue invoices
      let query = {
        status: { $nin: ['cancelled', 'void', 'paid'] },
        $expr: { $gt: ['$grandTotal', { $ifNull: ['$paidAmount', 0] }] }
      }

      if (agingBucket) {
        const bucket = AGING_BUCKETS.find(b => b.id === agingBucket)
        if (bucket) {
          if (bucket.minDays !== null) {
            const minDate = new Date(now.getTime() - bucket.minDays * 24 * 60 * 60 * 1000)
            query.dueDate = query.dueDate || {}
            query.dueDate.$lt = minDate.toISOString()
          }
          if (bucket.maxDays !== null && bucket.maxDays > 0) {
            const maxDate = new Date(now.getTime() - (bucket.maxDays + 1) * 24 * 60 * 60 * 1000)
            query.dueDate = query.dueDate || {}
            query.dueDate.$gte = maxDate.toISOString()
          }
        }
      }

      const overdueInvoices = await invoices.find(query).toArray()

      // Check for existing follow-ups
      const existingFollowUps = await followUps.find({
        invoiceId: { $in: overdueInvoices.map(i => i.id) },
        status: 'pending'
      }).toArray()

      const existingInvoiceIds = new Set(existingFollowUps.map(f => f.invoiceId))

      // Create follow-ups for invoices without pending follow-ups
      const newFollowUps = []
      for (const inv of overdueInvoices) {
        if (existingInvoiceIds.has(inv.id)) continue

        newFollowUps.push({
          id: uuidv4(),
          clientId: user.clientId,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceAmount: inv.grandTotal,
          outstandingAmount: (inv.grandTotal || 0) - (inv.paidAmount || 0),
          dealerId: inv.dealerId,
          dealerName: inv.dealerName,
          customerId: inv.customerId,
          customerName: inv.customerName,
          scheduledDate,
          type: type || 'call',
          notes: `Auto-generated for overdue invoice ${inv.invoiceNumber}`,
          priority: priority || 'medium',
          status: 'pending',
          assignedTo: user.id,
          assignedToName: user.name || user.email,
          isAutoGenerated: true,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      if (newFollowUps.length > 0) {
        await followUps.insertMany(newFollowUps)
      }

      return successResponse({
        message: `${newFollowUps.length} follow-ups created`,
        created: newFollowUps.length,
        skipped: overdueInvoices.length - newFollowUps.length
      })
    }

    // Write off bad debt
    if (action === 'write_off') {
      const { invoiceId, reason, amount } = body

      if (!invoiceId || !reason) {
        return errorResponse('Invoice ID and reason are required', 400)
      }

      const invoice = await invoices.findOne({ id: invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)

      const writeOffAmount = amount || ((invoice.grandTotal || 0) - (invoice.paidAmount || 0))

      await invoices.updateOne({ id: invoiceId }, {
        $set: {
          status: 'written_off',
          writtenOffAt: now,
          writtenOffBy: user.id,
          writtenOffAmount: writeOffAmount,
          writtenOffReason: reason,
          updatedAt: now
        }
      })

      // Record in bad debt collection
      const badDebts = db.collection('dw_bad_debts')
      await badDebts.insertOne({
        id: uuidv4(),
        clientId: user.clientId,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        dealerId: invoice.dealerId,
        dealerName: invoice.dealerName,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        originalAmount: invoice.grandTotal,
        paidAmount: invoice.paidAmount || 0,
        writtenOffAmount: writeOffAmount,
        reason,
        writtenOffBy: user.id,
        writtenOffByName: user.name || user.email,
        createdAt: now
      })

      return successResponse({ message: 'Invoice written off as bad debt' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Collections POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to process collection request', 500, error.message)
  }
}

// PUT - Update follow-up
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return errorResponse('Follow-up ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const followUps = db.collection('dw_collection_followups')

    const followUp = await followUps.findOne({ id })
    if (!followUp) return errorResponse('Follow-up not found', 404)

    updates.updatedAt = new Date().toISOString()
    updates.updatedBy = user.id

    await followUps.updateOne({ id }, { $set: updates })
    const updated = await followUps.findOne({ id })

    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('DW Collections PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update follow-up', 500, error.message)
  }
}

// DELETE - Delete follow-up
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Follow-up ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const followUps = db.collection('dw_collection_followups')

    const followUp = await followUps.findOne({ id })
    if (!followUp) return errorResponse('Follow-up not found', 404)

    if (followUp.status === 'completed') {
      return errorResponse('Cannot delete completed follow-up', 400)
    }

    await followUps.deleteOne({ id })

    return successResponse({ message: 'Follow-up deleted' })
  } catch (error) {
    console.error('DW Collections DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete follow-up', 500, error.message)
  }
}
