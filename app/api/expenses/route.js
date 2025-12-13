import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { validateExpenseData } from '@/lib/utils/validation'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const approved = searchParams.get('approved')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    const filter = {}
    if (category) filter.category = category
    if (approved !== null) filter.approved = approved === 'true'

    const expenses = await expensesCollection
      .find(filter)
      .sort({ date: -1 })
      .toArray()

    return successResponse(sanitizeDocuments(expenses))
  } catch (error) {
    console.error('Expenses GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch expenses', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const validation = validateExpenseData(body)
    if (!validation.valid) {
      return errorResponse(validation.message, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    const expense = {
      id: uuidv4(),
      clientId: user.clientId,
      ...body,
      date: body.date ? new Date(body.date) : new Date(),
      approved: false,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await expensesCollection.insertOne(expense)

    return successResponse(sanitizeDocument(expense), 201)
  } catch (error) {
    console.error('Expenses POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create expense', 500, error.message)
  }
}
