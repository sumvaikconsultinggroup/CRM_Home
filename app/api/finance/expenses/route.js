import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_expenses')

    let query = {}
    if (category && category !== 'all') query.category = category
    if (startDate) query.date = { $gte: startDate }
    if (endDate) query.date = { ...query.date, $lte: endDate }

    const expenses = await collection.find(query).sort({ date: -1 }).toArray()

    // Calculate summary by category
    const byCategory = {}
    expenses.forEach(exp => {
      const cat = exp.category || 'Other'
      if (!byCategory[cat]) byCategory[cat] = 0
      byCategory[cat] += exp.amount || 0
    })

    const summary = {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalGst: expenses.reduce((sum, e) => sum + (e.gstAmount || 0), 0),
      byCategory
    }

    return successResponse({ expenses: sanitizeDocuments(expenses), summary })
  } catch (error) {
    console.error('Finance Expenses GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch expenses', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const {
      vendor, date, category, amount, gstAmount,
      paymentMode, referenceNumber, notes
    } = body

    if (!vendor || !amount) {
      return errorResponse('Vendor and amount are required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_expenses')

    // Generate expense ID
    const count = await collection.countDocuments()
    const expenseId = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const expense = {
      id: uuidv4(),
      expenseId,
      vendor,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Other',
      amount: parseFloat(amount),
      gstAmount: parseFloat(gstAmount) || 0,
      totalAmount: parseFloat(amount) + (parseFloat(gstAmount) || 0),
      paymentMode: paymentMode || 'bank',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await collection.insertOne(expense)
    return successResponse(sanitizeDocument(expense), 201)
  } catch (error) {
    console.error('Finance Expenses POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create expense', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return errorResponse('Expense ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_expenses')

    delete updates.createdAt
    delete updates.createdBy
    updates.updatedAt = new Date()
    updates.updatedBy = user.id

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) {
      return errorResponse('Expense not found', 404)
    }

    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Finance Expenses PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update expense', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Expense ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('finance_expenses')

    await collection.deleteOne({ id })
    return successResponse({ message: 'Expense deleted' })
  } catch (error) {
    console.error('Finance Expenses DELETE Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to delete expense', 500, error.message)
  }
}
