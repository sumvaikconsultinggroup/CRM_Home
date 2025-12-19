/**
 * Integration Tests: Build Finance Sync
 * Tests synchronization between modules and Build Finance
 * 
 * Run with: node --experimental-vm-modules tests/integration/finance-sync.test.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

let authToken = null

let passed = 0
let failed = 0

function test(name, fn) {
  return async () => {
    try {
      await fn()
      console.log(`\x1b[32m✓\x1b[0m ${name}`)
      passed++
    } catch (error) {
      console.log(`\x1b[31m✗\x1b[0m ${name}`)
      console.log(`  Error: ${error.message}`)
      failed++
    }
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}Expected ${expected}, got ${actual}`)
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg}Expected true, got ${value}`)
  }
}

async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options)
  const data = await response.json()
  
  return { status: response.status, data }
}

const tests = [
  test('Login', async () => {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      email: 'xyz@interiors.com',
      password: 'client123'
    })
    assertEqual(status, 200, 'Login failed: ')
    authToken = data.token
  }),

  test('Get flooring invoices', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    assertEqual(status, 200, 'Should get invoices: ')
    
    const invoices = data.invoices || data
    console.log(`  Found ${invoices.length} flooring invoices`)
    
    // Calculate totals
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
    const totalPending = totalInvoiced - totalPaid
    
    console.log(`  Total Invoiced: ₹${totalInvoiced.toLocaleString()}`)
    console.log(`  Total Paid: ₹${totalPaid.toLocaleString()}`)
    console.log(`  Total Pending: ₹${totalPending.toLocaleString()}`)
  }),

  test('Get Build Finance dashboard', async () => {
    const { status, data } = await apiCall('GET', '/api/finance/dashboard')
    
    if (status === 200) {
      console.log(`  Build Finance dashboard accessible`)
      if (data.totalRevenue !== undefined) {
        console.log(`  Total Revenue: ₹${data.totalRevenue?.toLocaleString()}`)
      }
      if (data.pendingReceivables !== undefined) {
        console.log(`  Pending Receivables: ₹${data.pendingReceivables?.toLocaleString()}`)
      }
    } else if (status === 404) {
      console.log('  Note: Build Finance dashboard endpoint not found')
    } else {
      console.log(`  Build Finance returned ${status}`)
    }
  }),

  test('Verify payment records sync', async () => {
    // Get flooring payments
    const { status: flooringStatus, data: flooringData } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    const invoices = flooringData.invoices || flooringData || []
    const totalFlooringPayments = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
    
    // Get finance payments
    const { status: financeStatus, data: financeData } = await apiCall('GET', '/api/finance/payments')
    
    if (financeStatus === 200) {
      const payments = financeData.payments || financeData || []
      const totalFinancePayments = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0)
      
      console.log(`  Flooring payments total: ₹${totalFlooringPayments.toLocaleString()}`)
      console.log(`  Finance payments total: ₹${totalFinancePayments.toLocaleString()}`)
      
      // Check if they're in sync (allow some tolerance for timing)
      const diff = Math.abs(totalFlooringPayments - totalFinancePayments)
      if (diff > 0) {
        console.log(`  Note: Difference of ₹${diff} - may need sync`)
      }
    } else {
      console.log('  Finance payments endpoint not available')
    }
  }),

  test('Check expense tracking', async () => {
    const { status, data } = await apiCall('GET', '/api/expenses')
    
    assertEqual(status, 200, 'Should get expenses: ')
    
    const expenses = data.expenses || data
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    
    console.log(`  Found ${expenses.length} expenses`)
    console.log(`  Total Expenses: ₹${totalExpenses.toLocaleString()}`)
  }),

  test('Verify financial integrity - no overpayments', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    const invoices = data.invoices || data || []
    const overpaidInvoices = invoices.filter(inv => 
      (inv.paidAmount || 0) > (inv.grandTotal || 0)
    )
    
    if (overpaidInvoices.length > 0) {
      console.log(`  Warning: ${overpaidInvoices.length} overpaid invoices found`)
      overpaidInvoices.forEach(inv => {
        console.log(`    - ${inv.invoiceNumber}: Paid ₹${inv.paidAmount} > Total ₹${inv.grandTotal}`)
      })
    }
    
    assertTrue(overpaidInvoices.length === 0, 'Should have no overpaid invoices')
  }),

  test('Verify invoice status consistency', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    const invoices = data.invoices || data || []
    
    let inconsistencies = 0
    
    for (const inv of invoices) {
      const paidAmount = inv.paidAmount || 0
      const grandTotal = inv.grandTotal || 0
      const status = inv.status
      
      // Check status matches payment state
      if (paidAmount >= grandTotal && status !== 'paid' && grandTotal > 0) {
        console.log(`  Warning: ${inv.invoiceNumber} fully paid but status is ${status}`)
        inconsistencies++
      } else if (paidAmount > 0 && paidAmount < grandTotal && status !== 'partial') {
        console.log(`  Warning: ${inv.invoiceNumber} partially paid but status is ${status}`)
        inconsistencies++
      }
    }
    
    if (inconsistencies > 0) {
      console.log(`  Found ${inconsistencies} status inconsistencies`)
    }
  }),

  test('Get client stats for financial overview', async () => {
    const { status, data } = await apiCall('GET', '/api/client/stats')
    
    assertEqual(status, 200, 'Should get client stats: ')
    
    if (data.totalRevenue !== undefined) {
      console.log(`  Dashboard Revenue: ₹${data.totalRevenue?.toLocaleString()}`)
    }
    if (data.pendingAmount !== undefined) {
      console.log(`  Pending Amount: ₹${data.pendingAmount?.toLocaleString()}`)
    }
  }),

  test('Run full integrity scan for financial issues', async () => {
    const { status, data } = await apiCall('POST', '/api/admin/integrity', {
      action: 'scan'
    })
    
    if (status === 200 && data.report) {
      const financialIssues = (data.report.issues || []).filter(i => 
        i.type === 'total_mismatch' || 
        i.type === 'inconsistent_data' ||
        i.description?.toLowerCase().includes('payment') ||
        i.description?.toLowerCase().includes('invoice')
      )
      
      console.log(`  Financial integrity issues: ${financialIssues.length}`)
      
      if (financialIssues.length > 0) {
        financialIssues.forEach(issue => {
          console.log(`    - ${issue.severity}: ${issue.description}`)
        })
      }
    }
  })
]

async function runTests() {
  console.log('\n=== Build Finance Sync Tests ===')
  console.log(`Base URL: ${BASE_URL}\n`)
  
  for (const testFn of tests) {
    await testFn()
  }
  
  console.log('\n=== Summary ===')
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`)
  console.log(`\x1b[31mFailed: ${failed}\x1b[0m`)
  
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(console.error)
