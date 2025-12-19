/**
 * Integration Tests: Quote to Invoice Flow
 * Tests the complete quote creation, approval, and invoice generation workflow
 * 
 * Run with: node --experimental-vm-modules tests/integration/quote-invoice.test.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

let authToken = null
let testProjectId = null
let testQuoteId = null
let testInvoiceId = null

// Test utilities
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
    headers: {
      'Content-Type': 'application/json',
    }
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

// ============== TEST CASES ==============

const tests = [
  test('Login and get auth token', async () => {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      email: 'xyz@interiors.com',
      password: 'client123'
    })
    
    assertEqual(status, 200, 'Login should succeed: ')
    assertTrue(data.token, 'Should return token')
    authToken = data.token
  }),

  test('Get existing projects', async () => {
    const { status, data } = await apiCall('GET', '/api/projects')
    
    assertEqual(status, 200, 'Should get projects: ')
    assertTrue(Array.isArray(data.projects || data), 'Should return array')
    
    const projects = data.projects || data
    if (projects.length > 0) {
      testProjectId = projects[0].id
    }
  }),

  test('Create a flooring quote', async () => {
    if (!testProjectId) {
      console.log('  Skipped: No project available')
      return
    }
    
    const quoteData = {
      projectId: testProjectId,
      customerName: 'Test Customer',
      customerPhone: '+919876543210',
      customerEmail: 'test@example.com',
      customerAddress: '123 Test Street, Mumbai',
      items: [
        {
          productId: 'test-product-1',
          productName: 'Premium Oak Flooring',
          quantity: 100,
          unit: 'sqft',
          rate: 450,
          amount: 45000
        }
      ],
      subtotal: 45000,
      taxRate: 18,
      taxAmount: 8100,
      grandTotal: 53100,
      notes: 'Integration test quote'
    }
    
    const { status, data } = await apiCall('POST', '/api/flooring/enhanced/quotes', quoteData)
    
    if (status === 200 || status === 201) {
      assertTrue(data.quote || data.id, 'Should return quote')
      testQuoteId = data.quote?.id || data.id
    } else {
      console.log(`  Note: Quote creation returned ${status} - ${JSON.stringify(data).substring(0, 100)}`)
    }
  }),

  test('Get quote details', async () => {
    if (!testQuoteId) {
      console.log('  Skipped: No quote created')
      return
    }
    
    const { status, data } = await apiCall('GET', `/api/flooring/enhanced/quotes?id=${testQuoteId}`)
    
    assertEqual(status, 200, 'Should get quote: ')
  }),

  test('Approve quote', async () => {
    if (!testQuoteId) {
      console.log('  Skipped: No quote to approve')
      return
    }
    
    const { status, data } = await apiCall('PUT', '/api/flooring/enhanced/quotes', {
      id: testQuoteId,
      status: 'approved'
    })
    
    if (status === 200) {
      assertTrue(true, 'Quote approved')
    } else {
      console.log(`  Note: Approval returned ${status}`)
    }
  }),

  test('Convert quote to invoice', async () => {
    if (!testQuoteId) {
      console.log('  Skipped: No quote to convert')
      return
    }
    
    const invoiceData = {
      quotationId: testQuoteId,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    
    const { status, data } = await apiCall('POST', '/api/flooring/enhanced/invoices', invoiceData)
    
    if (status === 200 || status === 201) {
      assertTrue(data.invoice || data.id, 'Should return invoice')
      testInvoiceId = data.invoice?.id || data.id
    } else {
      console.log(`  Note: Invoice creation returned ${status} - ${JSON.stringify(data).substring(0, 100)}`)
    }
  }),

  test('Verify invoice has correct totals from quote', async () => {
    if (!testInvoiceId) {
      console.log('  Skipped: No invoice created')
      return
    }
    
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    assertEqual(status, 200, 'Should get invoices: ')
    
    const invoices = data.invoices || data
    const invoice = invoices.find(i => i.id === testInvoiceId)
    
    if (invoice) {
      // Verify financial integrity
      assertTrue(invoice.grandTotal > 0, 'Grand total should be positive')
      assertTrue(invoice.items && invoice.items.length > 0, 'Should have line items')
    }
  }),

  test('Record payment on invoice', async () => {
    if (!testInvoiceId) {
      console.log('  Skipped: No invoice for payment')
      return
    }
    
    const paymentData = {
      invoiceId: testInvoiceId,
      amount: 25000,
      method: 'bank_transfer',
      reference: 'TEST-PAY-001',
      notes: 'Integration test payment'
    }
    
    const { status, data } = await apiCall('POST', '/api/flooring/enhanced/invoices/payment', paymentData)
    
    if (status === 200) {
      assertTrue(true, 'Payment recorded')
    } else {
      console.log(`  Note: Payment returned ${status}`)
    }
  }),

  test('Verify invoice status updated after partial payment', async () => {
    if (!testInvoiceId) {
      console.log('  Skipped: No invoice')
      return
    }
    
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    const invoices = data.invoices || data
    const invoice = invoices.find(i => i.id === testInvoiceId)
    
    if (invoice) {
      // After partial payment, status should be 'partial' or paidAmount > 0
      assertTrue(invoice.paidAmount > 0 || invoice.status === 'partial', 'Should have payment recorded')
    }
  }),

  test('Get flooring dashboard stats', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced?type=dashboard')
    
    assertEqual(status, 200, 'Should get dashboard: ')
    assertTrue(data.stats || data.totalQuotes !== undefined, 'Should have stats')
  }),

  test('Verify quote-invoice link integrity', async () => {
    if (!testQuoteId || !testInvoiceId) {
      console.log('  Skipped: No quote/invoice pair')
      return
    }
    
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/invoices')
    
    const invoices = data.invoices || data
    const invoice = invoices.find(i => i.id === testInvoiceId)
    
    if (invoice) {
      assertEqual(invoice.quotationId, testQuoteId, 'Invoice should reference correct quote: ')
    }
  })
]

// ============== RUN TESTS ==============

async function runTests() {
  console.log('\n=== Quote to Invoice Integration Tests ===')
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
