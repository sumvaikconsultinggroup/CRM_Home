import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const invoicesCollection = db.collection('finance_invoices')
    const expensesCollection = db.collection('finance_expenses')
    const paymentsCollection = db.collection('finance_payments')

    // Calculate stats
    const invoices = await invoicesCollection.find({}).toArray()
    const expenses = await expensesCollection.find({}).toArray()
    const payments = await paymentsCollection.find({}).toArray()

    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    const totalExpenses = expenses
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    const pendingInvoices = invoices.filter(i => i.status === 'pending').length
    
    const overdueAmount = invoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    const totalPayments = payments
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const stats = {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      pendingInvoices,
      overdueAmount,
      cashFlow: totalPayments - totalExpenses,
      invoiceCount: invoices.length,
      expenseCount: expenses.length
    }

    return successResponse({ stats })
  } catch (error) {
    console.error('Finance Stats Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch stats', 500, error.message)
  }
}
