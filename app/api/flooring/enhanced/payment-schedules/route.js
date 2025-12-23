/**
 * =====================================================
 * FLOORING MODULE - PAYMENT SCHEDULES API
 * =====================================================
 * 
 * Manage payment milestones and schedules for projects.
 * Supports milestone-based payments common in flooring projects.
 */

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { checkPermission } from '@/lib/middleware/rbac'

export async function OPTIONS() {
  return optionsResponse()
}

// Default payment milestones for flooring projects
const DEFAULT_MILESTONES = [
  { stage: 1, name: 'Booking Advance', percentage: 25, description: 'On order confirmation' },
  { stage: 2, name: 'Material Procurement', percentage: 35, description: 'Before material delivery' },
  { stage: 3, name: 'On Delivery', percentage: 25, description: 'Material delivered to site' },
  { stage: 4, name: 'Installation Start', percentage: 10, description: 'When work begins' },
  { stage: 5, name: 'Project Completion', percentage: 5, description: 'Final handover' }
]

// GET - Fetch payment schedules
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const projectId = searchParams.get('projectId')
    const invoiceId = searchParams.get('invoiceId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') // Get upcoming due payments
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const schedules = db.collection('flooring_payment_schedules')

    if (id) {
      const schedule = await schedules.findOne({ id })
      if (!schedule) return errorResponse('Payment schedule not found', 404)
      return successResponse(sanitizeDocument(schedule))
    }

    // Build query
    const query = {}
    if (projectId) query.projectId = projectId
    if (invoiceId) query.invoiceId = invoiceId
    if (customerId) query.customerId = customerId
    if (status) query.status = status

    // Get upcoming payments (due within next 7 days)
    if (upcoming === 'true') {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      query['milestones.dueDate'] = {
        $gte: now.toISOString(),
        $lte: weekFromNow.toISOString()
      }
      query['milestones.status'] = { $in: ['pending', 'overdue'] }
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      schedules.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      schedules.countDocuments(query)
    ])

    // Calculate summary
    const allSchedules = await schedules.find({}).toArray()
    const summary = {
      totalSchedules: total,
      totalAmount: allSchedules.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      collectedAmount: allSchedules.reduce((sum, s) => sum + (s.collectedAmount || 0), 0),
      pendingAmount: allSchedules.reduce((sum, s) => sum + ((s.totalAmount || 0) - (s.collectedAmount || 0)), 0),
      overdueCount: allSchedules.filter(s => 
        s.milestones?.some(m => m.status === 'overdue')
      ).length
    }

    return successResponse({
      schedules: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary,
      defaultMilestones: DEFAULT_MILESTONES
    })
  } catch (error) {
    console.error('Payment Schedules GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch payment schedules', 500, error.message)
  }
}

// POST - Create payment schedule
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { projectId, projectName, invoiceId, customerId, customerName, 
            totalAmount, milestones, useDefault, startDate } = body

    if (!totalAmount || totalAmount <= 0) {
      return errorResponse('Valid total amount required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const schedules = db.collection('flooring_payment_schedules')

    const now = new Date().toISOString()
    const baseDate = startDate ? new Date(startDate) : new Date()

    // Calculate milestones
    let paymentMilestones
    if (useDefault || !milestones?.length) {
      // Use default milestones with calculated amounts and dates
      paymentMilestones = DEFAULT_MILESTONES.map((m, idx) => ({
        id: uuidv4(),
        stage: m.stage,
        name: m.name,
        percentage: m.percentage,
        amount: Math.round((totalAmount * m.percentage / 100) * 100) / 100,
        description: m.description,
        dueDate: new Date(baseDate.getTime() + idx * 14 * 24 * 60 * 60 * 1000).toISOString(), // Every 2 weeks
        status: 'pending',
        paidAmount: 0,
        paidDate: null
      }))
    } else {
      // Use custom milestones
      paymentMilestones = milestones.map((m, idx) => ({
        id: uuidv4(),
        stage: idx + 1,
        name: m.name,
        percentage: m.percentage,
        amount: m.amount || Math.round((totalAmount * m.percentage / 100) * 100) / 100,
        description: m.description || '',
        dueDate: m.dueDate || new Date(baseDate.getTime() + idx * 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        paidAmount: 0,
        paidDate: null
      }))
    }

    const schedule = {
      id: uuidv4(),
      projectId: projectId || null,
      projectName: projectName || '',
      invoiceId: invoiceId || null,
      customerId: customerId || null,
      customerName: customerName || '',
      totalAmount: parseFloat(totalAmount),
      collectedAmount: 0,
      balanceAmount: parseFloat(totalAmount),
      milestones: paymentMilestones,
      status: 'active', // active, completed, cancelled
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await schedules.insertOne(schedule)

    return successResponse(sanitizeDocument(schedule), 201)
  } catch (error) {
    console.error('Payment Schedules POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create payment schedule', 500, error.message)
  }
}

// PUT - Update payment schedule / Record milestone payment
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Schedule ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const schedules = db.collection('flooring_payment_schedules')

    const schedule = await schedules.findOne({ id })
    if (!schedule) return errorResponse('Payment schedule not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'record_payment':
        // Record payment for a specific milestone
        const { milestoneId, paymentAmount, paymentDate, paymentMethod, reference } = updates
        
        if (!milestoneId || !paymentAmount) {
          return errorResponse('Milestone ID and payment amount required', 400)
        }

        const milestoneIdx = schedule.milestones.findIndex(m => m.id === milestoneId)
        if (milestoneIdx === -1) {
          return errorResponse('Milestone not found', 404)
        }

        const milestone = schedule.milestones[milestoneIdx]
        const newMilestonePaid = (milestone.paidAmount || 0) + paymentAmount
        const milestoneStatus = newMilestonePaid >= milestone.amount ? 'paid' : 'partial'

        // Update milestone
        schedule.milestones[milestoneIdx] = {
          ...milestone,
          paidAmount: newMilestonePaid,
          status: milestoneStatus,
          paidDate: milestoneStatus === 'paid' ? (paymentDate || now) : milestone.paidDate,
          lastPayment: {
            amount: paymentAmount,
            method: paymentMethod || 'cash',
            reference: reference || '',
            date: paymentDate || now,
            recordedBy: user.id
          }
        }

        // Update schedule totals
        const newCollected = (schedule.collectedAmount || 0) + paymentAmount
        const newBalance = schedule.totalAmount - newCollected
        const allPaid = schedule.milestones.every(m => 
          m.id === milestoneId ? milestoneStatus === 'paid' : m.status === 'paid'
        )

        await schedules.updateOne({ id }, {
          $set: {
            milestones: schedule.milestones,
            collectedAmount: newCollected,
            balanceAmount: Math.max(0, newBalance),
            status: allPaid ? 'completed' : 'active',
            updatedAt: now
          }
        })

        return successResponse({
          message: 'Payment recorded',
          milestoneStatus,
          scheduleBalance: newBalance,
          scheduleStatus: allPaid ? 'completed' : 'active'
        })

      case 'update_milestone':
        // Update milestone details (date, amount, etc.)
        const { updateMilestoneId, ...milestoneUpdates } = updates
        const mIdx = schedule.milestones.findIndex(m => m.id === updateMilestoneId)
        if (mIdx === -1) return errorResponse('Milestone not found', 404)

        schedule.milestones[mIdx] = { ...schedule.milestones[mIdx], ...milestoneUpdates }
        
        await schedules.updateOne({ id }, {
          $set: { milestones: schedule.milestones, updatedAt: now }
        })
        
        return successResponse({ message: 'Milestone updated' })

      case 'mark_overdue':
        // Mark overdue milestones
        const nowDate = new Date()
        let overdueCount = 0
        schedule.milestones = schedule.milestones.map(m => {
          if (m.status === 'pending' && new Date(m.dueDate) < nowDate) {
            overdueCount++
            return { ...m, status: 'overdue' }
          }
          return m
        })

        await schedules.updateOne({ id }, {
          $set: { milestones: schedule.milestones, updatedAt: now }
        })

        return successResponse({ message: `${overdueCount} milestones marked as overdue` })

      case 'cancel':
        await schedules.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Payment schedule cancelled' })

      default:
        updates.updatedAt = now
        await schedules.updateOne({ id }, { $set: updates })
        const updated = await schedules.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Payment Schedules PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update payment schedule', 500, error.message)
  }
}

// DELETE - Delete payment schedule
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Schedule ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const schedules = db.collection('flooring_payment_schedules')

    const schedule = await schedules.findOne({ id })
    if (!schedule) return errorResponse('Payment schedule not found', 404)

    if (schedule.collectedAmount > 0) {
      return errorResponse('Cannot delete schedule with recorded payments', 400)
    }

    await schedules.deleteOne({ id })

    return successResponse({ message: 'Payment schedule deleted' })
  } catch (error) {
    console.error('Payment Schedules DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete payment schedule', 500, error.message)
  }
}
