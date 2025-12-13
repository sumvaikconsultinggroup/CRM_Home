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

    const { expenseId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    const expense = await expensesCollection.findOne({ id: expenseId })

    if (!expense) {
      return errorResponse('Expense not found', 404)
    }

    return successResponse(sanitizeDocument(expense))
  } catch (error) {
    console.error('Expense GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch expense', 500, error.message)
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { expenseId } = await params
    const body = await request.json()

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    const existingExpense = await expensesCollection.findOne({ id: expenseId })
    if (!existingExpense) {
      return errorResponse('Expense not found', 404)
    }

    const updatedExpense = {
      ...existingExpense,
      ...body,
      id: expenseId,
      updatedAt: new Date()
    }

    await expensesCollection.updateOne(
      { id: expenseId },
      { $set: updatedExpense }
    )

    return successResponse(sanitizeDocument(updatedExpense))
  } catch (error) {
    console.error('Expense PUT API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update expense', 500, error.message)
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { expenseId } = await params

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    const result = await expensesCollection.deleteOne({ id: expenseId })

    if (result.deletedCount === 0) {
      return errorResponse('Expense not found', 404)
    }

    return successResponse({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Expense DELETE API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete expense', 500, error.message)
  }
}
