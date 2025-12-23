/**
 * =====================================================
 * FLOORING MODULE - EXPENSES API
 * =====================================================
 * 
 * Track business expenses with vendor linking, GST handling,
 * and category-based reporting.
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

// Expense categories
const EXPENSE_CATEGORIES = [
  'material', 'labor', 'transport', 'tools', 'rent', 
  'marketing', 'office', 'travel', 'professional', 
  'insurance', 'taxes', 'misc'
]

// GET - Fetch expenses with filtering
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    // RBAC Check
    const auth = await checkPermission(request, 'reports.view')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const vendorId = searchParams.get('vendorId')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expenses = db.collection('flooring_expenses')

    if (id) {
      const expense = await expenses.findOne({ id })
      if (!expense) return errorResponse('Expense not found', 404)
      return successResponse(sanitizeDocument(expense))
    }

    // Build query
    const query = {}
    if (vendorId) query.vendorId = vendorId
    if (category) query.category = category
    if (projectId) query.projectId = projectId
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const skip = (page - 1) * limit
    const [result, total] = await Promise.all([
      expenses.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      expenses.countDocuments(query)
    ])

    // Calculate summary
    const allExpenses = await expenses.find(query).toArray()
    const summary = {
      totalExpenses: allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalGst: allExpenses.reduce((sum, e) => sum + (e.gstAmount || 0), 0),
      totalTds: allExpenses.reduce((sum, e) => sum + (e.tdsDeducted || 0), 0),
      count: total,
      byCategory: EXPENSE_CATEGORIES.reduce((acc, cat) => {
        const catExpenses = allExpenses.filter(e => e.category === cat)
        acc[cat] = {
          count: catExpenses.length,
          total: catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        }
        return acc
      }, {})
    }

    return successResponse({
      expenses: sanitizeDocuments(result),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary
    })
  } catch (error) {
    console.error('Expenses GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch expenses', 500, error.message)
  }
}

// POST - Create expense
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.create')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { category, amount, date, vendorId, vendorName, description, invoiceNumber, 
            paymentMethod, gstAmount, tdsDeducted, projectId, attachments } = body

    if (!category || !amount || amount <= 0) {
      return errorResponse('Category and valid amount are required', 400)
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return errorResponse(`Invalid category. Valid: ${EXPENSE_CATEGORIES.join(', ')}`, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expenses = db.collection('flooring_expenses')

    // Generate expense number
    const count = await expenses.countDocuments()
    const year = new Date().getFullYear()
    const expenseNumber = `EXP-${year}-${String(count + 1).padStart(5, '0')}`

    const now = new Date().toISOString()
    const expense = {
      id: uuidv4(),
      expenseNumber,
      category,
      amount: parseFloat(amount),
      date: date || now.split('T')[0],
      vendorId: vendorId || null,
      vendorName: vendorName || '',
      description: description || '',
      invoiceNumber: invoiceNumber || '',
      paymentMethod: paymentMethod || 'cash',
      gstAmount: parseFloat(gstAmount) || 0,
      tdsDeducted: parseFloat(tdsDeducted) || 0,
      netAmount: parseFloat(amount) - (parseFloat(tdsDeducted) || 0),
      projectId: projectId || null,
      attachments: attachments || [],
      status: 'recorded',
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    }

    await expenses.insertOne(expense)
    await logAccess(user, 'create', 'expense', { expenseId: expense.id })

    return successResponse(sanitizeDocument(expense), 201)
  } catch (error) {
    console.error('Expenses POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create expense', 500, error.message)
  }
}

// PUT - Update expense
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.edit')
    if (!auth.authorized) return auth.error

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return errorResponse('Expense ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expenses = db.collection('flooring_expenses')

    const expense = await expenses.findOne({ id })
    if (!expense) return errorResponse('Expense not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'approve':
        await expenses.updateOne({ id }, {
          $set: { status: 'approved', approvedBy: user.id, approvedAt: now, updatedAt: now }
        })
        return successResponse({ message: 'Expense approved' })

      case 'reject':
        await expenses.updateOne({ id }, {
          $set: { status: 'rejected', rejectedBy: user.id, rejectedAt: now, rejectReason: updates.reason, updatedAt: now }
        })
        return successResponse({ message: 'Expense rejected' })

      case 'void':
        await expenses.updateOne({ id }, {
          $set: { status: 'voided', voidedBy: user.id, voidedAt: now, voidReason: updates.reason, updatedAt: now }
        })
        return successResponse({ message: 'Expense voided' })

      default:
        // Regular update
        if (updates.category && !EXPENSE_CATEGORIES.includes(updates.category)) {
          return errorResponse('Invalid category', 400)
        }
        
        const updateData = {
          ...updates,
          updatedAt: now,
          updatedBy: user.id
        }
        
        if (updates.amount) {
          updateData.amount = parseFloat(updates.amount)
          updateData.netAmount = parseFloat(updates.amount) - (parseFloat(updates.tdsDeducted || expense.tdsDeducted) || 0)
        }

        await expenses.updateOne({ id }, { $set: updateData })
        const updated = await expenses.findOne({ id })
        return successResponse(sanitizeDocument(updated))
    }
  } catch (error) {
    console.error('Expenses PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update expense', 500, error.message)
  }
}

// DELETE - Delete expense (only draft/recorded)
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const auth = await checkPermission(request, 'invoices.void')
    if (!auth.authorized) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Expense ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expenses = db.collection('flooring_expenses')

    const expense = await expenses.findOne({ id })
    if (!expense) return errorResponse('Expense not found', 404)

    if (!['recorded', 'draft'].includes(expense.status)) {
      return errorResponse('Can only delete draft or recorded expenses', 400)
    }

    await expenses.deleteOne({ id })
    await logAccess(user, 'delete', 'expense', { expenseId: id })

    return successResponse({ message: 'Expense deleted' })
  } catch (error) {
    console.error('Expenses DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete expense', 500, error.message)
  }
}
