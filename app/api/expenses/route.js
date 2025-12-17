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
    const projectId = searchParams.get('projectId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    const filter = {}
    if (category) filter.category = category
    if (approved !== null) filter.approved = approved === 'true'
    if (projectId) filter.projectId = projectId

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
    console.log('Expense POST body:', JSON.stringify(body, null, 2))
    
    const validation = validateExpenseData(body)
    if (!validation.valid) {
      console.log('Expense validation failed:', validation)
      return errorResponse(validation.message, 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const expensesCollection = db.collection('expenses')

    // Check if user is admin - auto-approve their expenses
    const isAdmin = user.role === 'admin' || user.role === 'superAdmin' || user.isAdmin
    
    const expense = {
      id: uuidv4(),
      clientId: user.clientId,
      ...body,
      description: body.description || body.category || 'Expense', // Default description
      date: body.date ? new Date(body.date) : new Date(),
      approved: isAdmin, // Auto-approve for admins
      status: isAdmin ? 'approved' : (body.status || 'pending'), // Auto-approve status for admins
      approvedBy: isAdmin ? user.id : null,
      approvedAt: isAdmin ? new Date() : null,
      createdBy: user.id,
      createdByName: user.name || user.email,
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
