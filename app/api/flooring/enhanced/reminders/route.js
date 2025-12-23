/**
 * =====================================================
 * FLOORING MODULE - PAYMENT REMINDERS API
 * =====================================================
 * 
 * Manage payment reminders for invoices and schedules.
 * Supports automated and manual reminder workflows.
 */

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { checkPermission, logAccess } from '@/lib/middleware/rbac'

export async function OPTIONS() {
  return optionsResponse()
}

const REMINDER_TYPES = ['email', 'sms', 'whatsapp', 'call', 'manual']
const REMINDER_STATUS = ['pending', 'sent', 'failed', 'acknowledged', 'cancelled']

// GET - Fetch reminders
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const invoiceId = searchParams.get('invoiceId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const pending = searchParams.get('pending') // Get pending reminders
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reminders = db.collection('flooring_reminders')

    if (id) {
      const reminder = await reminders.findOne({ id })
      if (!reminder) return errorResponse('Reminder not found', 404)
      return successResponse(sanitizeDocument(reminder))
    }

    // Build query
    const query = {}
    if (invoiceId) query.invoiceId = invoiceId
    if (customerId) query.customerId = customerId
    if (status) query.status = status
    if (pending === 'true') {
      query.status = 'pending'
      query.scheduledDate = { $lte: new Date().toISOString() }
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      reminders.find(query).sort({ scheduledDate: 1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      reminders.countDocuments(query)
    ])

    // Get upcoming reminders for dashboard
    const upcomingQuery = {
      status: 'pending',
      scheduledDate: {
        $gte: new Date().toISOString(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
    const upcoming = await reminders.find(upcomingQuery).sort({ scheduledDate: 1 }).limit(10).toArray()

    const summary = {
      total,
      pending: await reminders.countDocuments({ status: 'pending' }),
      sent: await reminders.countDocuments({ status: 'sent' }),
      failed: await reminders.countDocuments({ status: 'failed' }),
      upcomingCount: upcoming.length
    }

    return successResponse({
      reminders: sanitizeDocuments(result),
      upcoming: sanitizeDocuments(upcoming),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary
    })
  } catch (error) {
    console.error('Reminders GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch reminders', 500, error.message)
  }
}

// POST - Create reminder
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { invoiceId, invoiceNumber, customerId, customerName, customerPhone, customerEmail,
            amount, type, scheduledDate, message, isAutomatic } = body

    if (!type || !REMINDER_TYPES.includes(type)) {
      return errorResponse(`Invalid type. Valid: ${REMINDER_TYPES.join(', ')}`, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reminders = db.collection('flooring_reminders')

    const now = new Date().toISOString()
    const reminder = {
      id: uuidv4(),
      invoiceId: invoiceId || null,
      invoiceNumber: invoiceNumber || null,
      customerId: customerId || null,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      amount: parseFloat(amount) || 0,
      type,
      scheduledDate: scheduledDate || now,
      message: message || `Payment reminder for invoice ${invoiceNumber || 'pending'}. Amount due: ₹${amount || 0}`,
      isAutomatic: isAutomatic || false,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      sentAt: null,
      acknowledgedAt: null,
      response: null,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await reminders.insertOne(reminder)
    await logAccess(user, 'create', 'reminder', { reminderId: reminder.id, invoiceId })

    return successResponse(sanitizeDocument(reminder), 201)
  } catch (error) {
    console.error('Reminders POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create reminder', 500, error.message)
  }
}

// PUT - Update reminder / Mark as sent
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Reminder ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reminders = db.collection('flooring_reminders')
    const invoices = db.collection('flooring_invoices')

    const reminder = await reminders.findOne({ id })
    if (!reminder) return errorResponse('Reminder not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'send':
        // Mark reminder as sent
        await reminders.updateOne({ id }, {
          $set: {
            status: 'sent',
            sentAt: now,
            sentBy: user.id,
            updatedAt: now
          },
          $inc: { attempts: 1 }
        })

        // Update invoice reminder count
        if (reminder.invoiceId) {
          await invoices.updateOne({ id: reminder.invoiceId }, {
            $set: { lastReminderSent: now, updatedAt: now },
            $inc: { reminderCount: 1 }
          })
        }

        return successResponse({ message: 'Reminder marked as sent' })

      case 'fail':
        const newAttempts = (reminder.attempts || 0) + 1
        const newStatus = newAttempts >= reminder.maxAttempts ? 'failed' : 'pending'
        
        await reminders.updateOne({ id }, {
          $set: {
            status: newStatus,
            lastFailedAt: now,
            lastFailReason: updates.reason || 'Unknown',
            updatedAt: now
          },
          $inc: { attempts: 1 }
        })

        return successResponse({ message: `Reminder ${newStatus}`, attempts: newAttempts })

      case 'acknowledge':
        await reminders.updateOne({ id }, {
          $set: {
            status: 'acknowledged',
            acknowledgedAt: now,
            response: updates.response || 'Customer acknowledged',
            updatedAt: now
          }
        })
        return successResponse({ message: 'Reminder acknowledged' })

      case 'reschedule':
        if (!updates.newDate) {
          return errorResponse('New date required', 400)
        }
        await reminders.updateOne({ id }, {
          $set: {
            scheduledDate: updates.newDate,
            status: 'pending',
            updatedAt: now
          }
        })
        return successResponse({ message: 'Reminder rescheduled' })

      case 'cancel':
        await reminders.updateOne({ id }, {
          $set: { status: 'cancelled', cancelledAt: now, cancelledBy: user.id, updatedAt: now }
        })
        return successResponse({ message: 'Reminder cancelled' })

      case 'bulk_create':
        // Create reminders for all overdue invoices
        const overdueInvoices = await invoices.find({
          status: { $nin: ['paid', 'cancelled'] },
          dueDate: { $lt: now }
        }).toArray()

        const bulkReminders = overdueInvoices.map(inv => ({
          id: uuidv4(),
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          customerName: inv.customer?.name || inv.customerName,
          customerPhone: inv.customer?.phone || '',
          customerEmail: inv.customer?.email || '',
          amount: (inv.grandTotal || 0) - (inv.paidAmount || 0),
          type: updates.reminderType || 'whatsapp',
          scheduledDate: now,
          message: `Payment reminder for overdue invoice ${inv.invoiceNumber}`,
          isAutomatic: true,
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }))

        if (bulkReminders.length > 0) {
          await reminders.insertMany(bulkReminders)
        }

        return successResponse({
          message: `${bulkReminders.length} reminders created for overdue invoices`,
          count: bulkReminders.length
        })

      default:
        updates.updatedAt = now
        await reminders.updateOne({ id }, { $set: updates })
        const updated = await reminders.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Reminders PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update reminder', 500, error.message)
  }
}

// DELETE - Delete reminder
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Reminder ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const reminders = db.collection('flooring_reminders')

    const reminder = await reminders.findOne({ id })
    if (!reminder) return errorResponse('Reminder not found', 404)

    if (reminder.status === 'sent') {
      return errorResponse('Cannot delete sent reminders', 400)
    }

    await reminders.deleteOne({ id })
    await logAccess(user, 'delete', 'reminder', { reminderId: id })

    return successResponse({ message: 'Reminder deleted' })
  } catch (error) {
    console.error('Reminders DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete reminder', 500, error.message)
  }
}
