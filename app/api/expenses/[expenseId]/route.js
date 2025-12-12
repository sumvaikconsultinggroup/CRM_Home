import { getCollection, Collections } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const expenseId = params.expenseId
    const expensesCollection = await getCollection(Collections.EXPENSES)

    const expense = await expensesCollection.findOne({ id: expenseId, clientId: user.clientId })
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

    const expenseId = params.expenseId
    const body = await request.json()
    const expensesCollection = await getCollection(Collections.EXPENSES)

    // If approving, add approver info
    if (body.approved === true) {
      body.approvedBy = user.id
      body.approvedAt = new Date()
    }

    const result = await expensesCollection.updateOne(
      { id: expenseId, clientId: user.clientId },
      { $set: { ...body, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return errorResponse('Expense not found', 404)
    }

    return successResponse({ message: 'Expense updated successfully' })
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

    const expenseId = params.expenseId
    const expensesCollection = await getCollection(Collections.EXPENSES)

    const result = await expensesCollection.deleteOne({ id: expenseId, clientId: user.clientId })

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
