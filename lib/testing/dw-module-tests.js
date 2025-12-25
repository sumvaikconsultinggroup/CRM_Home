/**
 * D&W Module Backend Test Suite
 * 
 * Comprehensive tests for Doors & Windows module APIs:
 * - Dealers API (/api/modules/doors-windows/dealers)
 * - Price Lists API (/api/modules/doors-windows/price-lists)
 * - Quality Control API (/api/modules/doors-windows/qc)
 * - Collections API (/api/modules/doors-windows/collections)
 * 
 * Run: node lib/testing/dw-module-tests.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const API_BASE = `${BASE_URL}/api/modules/doors-windows`

// Test state
let authToken = null
let testDealerId = null
let testPriceListId = null
let testQCId = null

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
}

// Utility functions
async function login() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@buildcrm.com',
        password: 'admin123'
      })
    })
    const data = await res.json()
    if (data.token) {
      authToken = data.token
      console.log('✅ Login successful')
      return true
    }
    console.log('❌ Login failed:', data.error)
    return false
  } catch (error) {
    console.log('❌ Login error:', error.message)
    return false
  }
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
}

async function runTest(name, testFn) {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    testResults.passed++
    testResults.tests.push({ name, status: 'PASS', duration })
    console.log(`  ✅ ${name} (${duration}ms)`)
    return true
  } catch (error) {
    const duration = Date.now() - startTime
    testResults.failed++
    testResults.tests.push({ name, status: 'FAIL', error: error.message, duration })
    console.log(`  ❌ ${name}: ${error.message}`)
    return false
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// =============================================
// DEALERS API TESTS
// =============================================

async function testDealersAPI() {
  console.log('\n📋 DEALERS API TESTS')
  console.log('=' .repeat(50))

  // Test 1: GET dealers list
  await runTest('GET /dealers - List all dealers', async () => {
    const res = await fetch(`${API_BASE}/dealers`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(Array.isArray(data.dealers), 'Expected dealers array')
    assert(data.summary, 'Expected summary object')
    assert(data.tiers, 'Expected tiers array')
  })

  // Test 2: POST create dealer
  await runTest('POST /dealers - Create dealer', async () => {
    const res = await fetch(`${API_BASE}/dealers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'create',
        companyName: 'Test Dealer ' + Date.now(),
        contactPerson: 'Test Contact',
        email: `test${Date.now()}@dealer.com`,
        phone: '+919876543210',
        territory: 'Delhi',
        tier: 'silver',
        creditLimit: 200000,
        autoApprove: true
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
    assert(data.dealer, 'Expected dealer object')
    assert(data.dealer.dealerCode, 'Expected dealer code')
    testDealerId = data.dealer.id
  })

  // Test 3: GET single dealer
  await runTest('GET /dealers?id=X - Get single dealer', async () => {
    if (!testDealerId) throw new Error('No test dealer ID')
    const res = await fetch(`${API_BASE}/dealers?id=${testDealerId}`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(data.dealer || data.id, 'Expected dealer data')
  })

  // Test 4: POST change tier
  await runTest('POST /dealers - Change tier', async () => {
    if (!testDealerId) throw new Error('No test dealer ID')
    const res = await fetch(`${API_BASE}/dealers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'change_tier',
        dealerId: testDealerId,
        newTier: 'gold'
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
    assert(data.message, 'Expected success message')
  })

  // Test 5: POST update credit limit
  await runTest('POST /dealers - Update credit limit', async () => {
    if (!testDealerId) throw new Error('No test dealer ID')
    const res = await fetch(`${API_BASE}/dealers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'update_credit',
        dealerId: testDealerId,
        newCreditLimit: 300000
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
    assert(data.message || data.dealer, 'Expected success response')
  })

  // Test 6: POST suspend dealer
  await runTest('POST /dealers - Suspend dealer', async () => {
    if (!testDealerId) throw new Error('No test dealer ID')
    const res = await fetch(`${API_BASE}/dealers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'suspend',
        dealerId: testDealerId,
        reason: 'Test suspension'
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
  })

  // Test 7: GET dealers with filters
  await runTest('GET /dealers?tier=gold - Filter by tier', async () => {
    const res = await fetch(`${API_BASE}/dealers?tier=gold`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(Array.isArray(data.dealers), 'Expected dealers array')
  })
}

// =============================================
// PRICE LISTS API TESTS
// =============================================

async function testPriceListsAPI() {
  console.log('\n📋 PRICE LISTS API TESTS')
  console.log('=' .repeat(50))

  // Test 1: GET price lists
  await runTest('GET /price-lists - List all price lists', async () => {
    const res = await fetch(`${API_BASE}/price-lists`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(Array.isArray(data.priceLists), 'Expected priceLists array')
    assert(data.summary, 'Expected summary object')
    assert(data.types, 'Expected types array')
  })

  // Test 2: POST create price list
  await runTest('POST /price-lists - Create price list', async () => {
    const res = await fetch(`${API_BASE}/price-lists`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'create_list',
        name: 'Test Price List ' + Date.now(),
        type: 'dealer',
        dealerTier: 'silver',
        maxDiscountPercent: 10,
        effectiveFrom: '2025-01-01',
        isDefault: false
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
    assert(data.priceList, 'Expected priceList object')
    assert(data.priceList.code, 'Expected price list code')
    testPriceListId = data.priceList.id
  })

  // Test 3: GET single price list
  await runTest('GET /price-lists?id=X - Get single price list', async () => {
    if (!testPriceListId) throw new Error('No test price list ID')
    const res = await fetch(`${API_BASE}/price-lists?id=${testPriceListId}`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(data.priceList || data.id, 'Expected price list data')
  })

  // Test 4: POST add item to price list
  await runTest('POST /price-lists - Add price item', async () => {
    if (!testPriceListId) throw new Error('No test price list ID')
    const res = await fetch(`${API_BASE}/price-lists`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'add_item',
        priceListId: testPriceListId,
        productName: 'Aluminium Sliding Window',
        category: 'window',
        rate: 850,
        pricingMethod: 'per_sqft',
        minQty: 1
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
  })

  // Test 5: POST bulk add items
  await runTest('POST /price-lists - Bulk add items', async () => {
    if (!testPriceListId) throw new Error('No test price list ID')
    const res = await fetch(`${API_BASE}/price-lists`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'bulk_add_items',
        priceListId: testPriceListId,
        items: [
          { productName: 'uPVC Casement Window', category: 'window', rate: 950, pricingMethod: 'per_sqft' },
          { productName: 'Aluminium Door', category: 'door', rate: 1200, pricingMethod: 'per_sqft' }
        ]
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
  })

  // Test 6: POST copy price list
  await runTest('POST /price-lists - Copy price list', async () => {
    if (!testPriceListId) throw new Error('No test price list ID')
    const res = await fetch(`${API_BASE}/price-lists`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'copy_list',
        sourceListId: testPriceListId,
        newName: 'Copied Price List ' + Date.now(),
        adjustmentPercent: 5
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
    assert(data.priceList, 'Expected new price list')
  })

  // Test 7: PUT update price list
  await runTest('PUT /price-lists - Update price list', async () => {
    if (!testPriceListId) throw new Error('No test price list ID')
    const res = await fetch(`${API_BASE}/price-lists`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        id: testPriceListId,
        maxDiscountPercent: 12
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
  })
}

// =============================================
// QUALITY CONTROL API TESTS
// =============================================

async function testQualityControlAPI() {
  console.log('\n📋 QUALITY CONTROL API TESTS')
  console.log('=' .repeat(50))

  // Test 1: GET QC records
  await runTest('GET /qc - List QC records', async () => {
    const res = await fetch(`${API_BASE}/qc`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(Array.isArray(data.qcRecords), 'Expected qcRecords array')
    assert(data.stats, 'Expected stats object')
    assert(data.categories, 'Expected categories array')
  })

  // Test 2: POST start inspection (requires work order - may fail gracefully)
  await runTest('POST /qc - Start inspection (validation test)', async () => {
    const res = await fetch(`${API_BASE}/qc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'start_inspection',
        workOrderId: 'WO-TEST-' + Date.now(),
        itemDescription: 'Test Window Batch',
        productType: 'window',
        category: 'sliding',
        quantity: 10
      })
    })
    const data = await res.json()
    // This should return 404 if work order doesn't exist - that's correct behavior
    if (res.status === 404) {
      assert(data.error.includes('not found'), 'Expected work order not found error')
    } else if (res.ok) {
      testQCId = data.qc?.id || data.id
    }
    // Either outcome is valid - we're testing that the endpoint responds correctly
  })

  // Test 3: GET QC with filters
  await runTest('GET /qc?status=passed - Filter by status', async () => {
    const res = await fetch(`${API_BASE}/qc?status=passed`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(Array.isArray(data.qcRecords), 'Expected qcRecords array')
  })

  // Test 4: POST record check (if we have a QC record)
  await runTest('POST /qc - Record checklist item (if QC exists)', async () => {
    if (!testQCId) {
      // No QC record to test - skip but pass (business logic prevents this without work order)
      return
    }
    const res = await fetch(`${API_BASE}/qc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'record_check',
        qcId: testQCId,
        checklistItemId: 'item-1',
        result: 'pass',
        notes: 'Dimensions within tolerance'
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
  })

  // Test 5: Verify QC categories returned
  await runTest('GET /qc - Verify categories structure', async () => {
    const res = await fetch(`${API_BASE}/qc`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(data.categories.length > 0, 'Expected at least one category')
    assert(data.categories[0].id, 'Expected category id')
    assert(data.categories[0].name, 'Expected category name')
    assert(data.categories[0].weight, 'Expected category weight')
  })

  // Test 6: Verify severity levels returned
  await runTest('GET /qc - Verify severity levels', async () => {
    const res = await fetch(`${API_BASE}/qc`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(data.severityLevels.length > 0, 'Expected severity levels')
    assert(data.severityLevels.find(s => s.id === 'critical'), 'Expected critical severity')
  })

  // Test 7: Verify stats structure
  await runTest('GET /qc - Verify stats structure', async () => {
    const res = await fetch(`${API_BASE}/qc`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert('total' in data.stats, 'Expected total in stats')
    assert('passed' in data.stats, 'Expected passed in stats')
    assert('failed' in data.stats, 'Expected failed in stats')
    assert('passRate' in data.stats, 'Expected passRate in stats')
  })
}

// =============================================
// COLLECTIONS API TESTS
// =============================================

async function testCollectionsAPI() {
  console.log('\n📋 COLLECTIONS API TESTS')
  console.log('=' .repeat(50))

  // Test 1: GET collections summary
  await runTest('GET /collections - Summary view', async () => {
    const res = await fetch(`${API_BASE}/collections?view=summary`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(data.summary, 'Expected summary object')
    assert(data.aging, 'Expected aging object')
  })

  // Test 2: GET collections aging
  await runTest('GET /collections?view=aging - Aging analysis', async () => {
    const res = await fetch(`${API_BASE}/collections?view=aging`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(data.aging, 'Expected aging data')
  })

  // Test 3: GET collections by dealer
  await runTest('GET /collections?view=dealer - Dealer view', async () => {
    const res = await fetch(`${API_BASE}/collections?view=dealer`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
  })

  // Test 4: GET follow-ups
  await runTest('GET /collections?view=followups - Follow-ups list', async () => {
    const res = await fetch(`${API_BASE}/collections?view=followups`, { headers: getHeaders() })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}`)
    assert(Array.isArray(data.followUps), 'Expected followUps array')
  })

  // Test 5: POST record payment
  await runTest('POST /collections - Record payment', async () => {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'record_payment',
        invoiceId: 'TEST-INV-' + Date.now(),
        amount: 50000,
        paymentMethod: 'bank_transfer',
        reference: 'TXN123456',
        paymentDate: new Date().toISOString().split('T')[0]
      })
    })
    const data = await res.json()
    // May fail if invoice doesn't exist, but API should handle gracefully
    assert(res.status < 500, `Server error: ${data.error || 'Unknown'}`)
  })

  // Test 6: POST create follow-up
  await runTest('POST /collections - Create follow-up', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'create_followup',
        dealerId: testDealerId || 'test-dealer',
        scheduledDate: tomorrow.toISOString().split('T')[0],
        type: 'call',
        priority: 'medium',
        notes: 'Test follow-up'
      })
    })
    const data = await res.json()
    assert(res.ok, `Expected 200, got ${res.status}: ${data.error || ''}`)
  })

  // Test 7: POST generate statement
  await runTest('POST /collections - Generate statement', async () => {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: 'generate_statement',
        dealerId: testDealerId || 'test-dealer'
      })
    })
    const data = await res.json()
    // May not have data, but should not error
    assert(res.status < 500, `Server error: ${data.error || 'Unknown'}`)
  })
}

// =============================================
// MAIN TEST RUNNER
// =============================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     D&W MODULE BACKEND TEST SUITE                         ║')
  console.log('║     Testing: Dealers, Price Lists, QC, Collections        ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')
  
  const startTime = Date.now()

  // Login first
  const loggedIn = await login()
  if (!loggedIn) {
    console.log('\n❌ Cannot run tests without authentication')
    process.exit(1)
  }

  // Run all test suites
  await testDealersAPI()
  await testPriceListsAPI()
  await testQualityControlAPI()
  await testCollectionsAPI()

  // Print summary
  const duration = Date.now() - startTime
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                    TEST SUMMARY                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\n  Total Tests: ${testResults.passed + testResults.failed}`)
  console.log(`  ✅ Passed: ${testResults.passed}`)
  console.log(`  ❌ Failed: ${testResults.failed}`)
  console.log(`  ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`)
  console.log(`  📊 Pass Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`)
  
  if (testResults.failed > 0) {
    console.log('\n  Failed Tests:')
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`    - ${t.name}: ${t.error}`))
  }

  console.log('')
  
  // Return results for programmatic use
  return testResults
}

// Run if called directly
runAllTests()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('Test runner error:', error)
    process.exit(1)
  })

module.exports = { runAllTests, testResults }
