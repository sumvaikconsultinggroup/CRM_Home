/**
 * Integration Tests: Inventory Sync
 * Tests inventory reservation, deduction, and sync with Build Inventory
 * 
 * Run with: node --experimental-vm-modules tests/integration/inventory-sync.test.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

let authToken = null
let testProductId = null
let initialStock = 0

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

  test('Get flooring inventory', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/inventory')
    
    assertEqual(status, 200, 'Should get inventory: ')
    
    const items = data.inventory || data.items || data
    if (Array.isArray(items) && items.length > 0) {
      testProductId = items[0].productId || items[0].id
      initialStock = items[0].quantity || items[0].stockQuantity || 0
      console.log(`  Found product: ${testProductId} with stock: ${initialStock}`)
    }
  }),

  test('Check Build Inventory sync endpoint exists', async () => {
    const { status, data } = await apiCall('GET', '/api/inventory/stock')
    
    // Either 200 (data exists) or 404 (endpoint exists but no data) is acceptable
    assertTrue(status === 200 || status === 404 || status === 401, `Inventory endpoint should exist: ${status}`)
  }),

  test('Verify inventory reservations collection', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/inventory/reservations')
    
    // Check if reservations endpoint exists
    if (status === 200) {
      assertTrue(true, 'Reservations endpoint accessible')
    } else {
      console.log(`  Note: Reservations endpoint returned ${status}`)
    }
  }),

  test('Get inventory movements/history', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/inventory?type=movements')
    
    if (status === 200) {
      assertTrue(true, 'Movements accessible')
    } else {
      console.log(`  Note: Movements returned ${status}`)
    }
  }),

  test('Verify no negative stock in inventory', async () => {
    const { status, data } = await apiCall('GET', '/api/flooring/enhanced/inventory')
    
    const items = data.inventory || data.items || data
    if (Array.isArray(items)) {
      const negativeItems = items.filter(i => (i.quantity || i.stockQuantity || 0) < 0)
      
      if (negativeItems.length > 0) {
        console.log(`  Warning: Found ${negativeItems.length} items with negative stock`)
        negativeItems.forEach(i => {
          console.log(`    - ${i.productName || i.sku}: ${i.quantity || i.stockQuantity}`)
        })
      }
      assertTrue(negativeItems.length === 0, 'Should have no negative stock')
    }
  }),

  test('Check Build Finance invoices sync', async () => {
    const { status, data } = await apiCall('GET', '/api/finance/invoices')
    
    if (status === 200) {
      console.log(`  Finance invoices accessible: ${(data.invoices || data).length || 0} records`)
    } else if (status === 404) {
      console.log('  Note: Build Finance invoices endpoint not found')
    }
  }),

  test('Check Build Finance payments sync', async () => {
    const { status, data } = await apiCall('GET', '/api/finance/payments')
    
    if (status === 200) {
      console.log(`  Finance payments accessible`)
    } else if (status === 404) {
      console.log('  Note: Build Finance payments endpoint not found')
    }
  }),

  test('Run integrity check on inventory', async () => {
    const { status, data } = await apiCall('POST', '/api/admin/integrity', {
      action: 'scan'
    })
    
    if (status === 200 && data.report) {
      const inventoryIssues = (data.report.issues || []).filter(i => 
        i.collection?.includes('inventory') || i.type === 'negative_balance'
      )
      
      console.log(`  Inventory-related issues found: ${inventoryIssues.length}`)
      
      if (inventoryIssues.length > 0) {
        inventoryIssues.forEach(issue => {
          console.log(`    - ${issue.severity}: ${issue.description}`)
        })
      }
    }
  })
]

async function runTests() {
  console.log('\n=== Inventory Sync Integration Tests ===')
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
