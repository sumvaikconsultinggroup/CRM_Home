/**
 * =====================================================
 * FLOORING MODULE - INTEGRATION TEST SUITE
 * =====================================================
 * 
 * Critical flow tests for the Flooring Module.
 * Run these after deployments or major changes.
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Test helper to create authenticated headers
 */
export function createTestAuth(user = {}) {
  const defaultUser = {
    id: 'test-user-001',
    email: 'test@test.com',
    name: 'Test User',
    role: 'super_admin',
    clientId: 'CL-TEST001',
    databaseName: 'CL-TEST001',
    permissions: [],
    iat: Date.now(),
    exp: Date.now() + 3600000
  }
  
  const tokenData = { ...defaultUser, ...user }
  const token = Buffer.from(JSON.stringify(tokenData)).toString('base64')
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Test Suite Definition
 */
export const TEST_SUITES = {
  /**
   * Test 1: Product Creation and Retrieval
   */
  products: {
    name: 'Product CRUD',
    tests: [
      {
        name: 'Create Product',
        method: 'POST',
        endpoint: '/api/flooring/enhanced/products',
        body: {
          name: 'Test Oak Flooring',
          sku: `TEST-${Date.now()}`,
          category: 'Solid Wood',
          pricing: {
            costPrice: 100,
            sellingPrice: 150
          },
          attributes: {
            dimensions: { length: 1200, width: 150, thickness: 18 }
          }
        },
        expectedStatus: 201,
        validate: (response) => response.id && response.sku
      },
      {
        name: 'Get Products',
        method: 'GET',
        endpoint: '/api/flooring/enhanced/products',
        expectedStatus: 200,
        validate: (response) => Array.isArray(response.products)
      }
    ]
  },

  /**
   * Test 2: Inventory Stock Flow
   */
  inventory: {
    name: 'Inventory Management',
    tests: [
      {
        name: 'Get Stock',
        method: 'GET',
        endpoint: '/api/modules/wooden-flooring/inventory/stock',
        expectedStatus: 200,
        validate: (response) => response.stocks !== undefined || response.stock !== undefined
      },
      {
        name: 'Get Warehouses',
        method: 'GET',
        endpoint: '/api/modules/wooden-flooring/warehouses',
        expectedStatus: 200,
        validate: (response) => Array.isArray(response.warehouses || response)
      }
    ]
  },

  /**
   * Test 3: GRN Flow (Goods Receipt)
   */
  grn: {
    name: 'GRN Flow',
    tests: [
      {
        name: 'Get GRNs',
        method: 'GET',
        endpoint: '/api/modules/wooden-flooring/inventory/grn',
        expectedStatus: 200,
        validate: (response) => response.grns !== undefined
      }
    ]
  },

  /**
   * Test 4: Challan Flow
   */
  challans: {
    name: 'Challan Flow',
    tests: [
      {
        name: 'Get Challans (Enhanced)',
        method: 'GET',
        endpoint: '/api/flooring/enhanced/challans',
        expectedStatus: 200,
        validate: (response) => response.challans !== undefined
      },
      {
        name: 'Get Challans (Inventory)',
        method: 'GET',
        endpoint: '/api/modules/wooden-flooring/inventory/challans',
        expectedStatus: 200,
        validate: (response) => response.challans !== undefined
      }
    ]
  },

  /**
   * Test 5: Stock Ledger
   */
  stockLedger: {
    name: 'Stock Ledger',
    tests: [
      {
        name: 'Get Stock Ledger',
        method: 'GET',
        endpoint: '/api/modules/wooden-flooring/inventory/stock-ledger',
        expectedStatus: 200,
        validate: (response) => response.entries !== undefined || response.ledger !== undefined
      }
    ]
  },

  /**
   * Test 6: RBAC
   */
  rbac: {
    name: 'Access Control',
    tests: [
      {
        name: 'Get Roles',
        method: 'GET',
        endpoint: '/api/flooring/enhanced/access-management?action=roles',
        expectedStatus: 200,
        validate: (response) => response.roles !== undefined
      },
      {
        name: 'Get Users',
        method: 'GET',
        endpoint: '/api/flooring/enhanced/access-management?action=users',
        expectedStatus: 200,
        validate: (response) => response.users !== undefined
      }
    ]
  },

  /**
   * Test 7: System Health
   */
  system: {
    name: 'System Health',
    tests: [
      {
        name: 'Health Check',
        method: 'GET',
        endpoint: '/api/flooring/enhanced/system?action=health',
        expectedStatus: 200,
        validate: (response) => response.database === true
      },
      {
        name: 'Collection Stats',
        method: 'GET',
        endpoint: '/api/flooring/enhanced/system?action=collections',
        expectedStatus: 200,
        validate: (response) => response.collections !== undefined
      }
    ]
  }
}

/**
 * Run a single test
 */
export async function runTest(test, baseUrl, headers) {
  const url = `${baseUrl}${test.endpoint}`
  const options = {
    method: test.method,
    headers
  }
  
  if (test.body && test.method !== 'GET') {
    options.body = JSON.stringify(test.body)
  }

  const startTime = Date.now()
  
  try {
    const response = await fetch(url, options)
    const duration = Date.now() - startTime
    const data = await response.json()
    
    const passed = response.status === test.expectedStatus && 
                   (!test.validate || test.validate(data))
    
    return {
      name: test.name,
      passed,
      status: response.status,
      expectedStatus: test.expectedStatus,
      duration,
      data: passed ? undefined : data
    }
  } catch (error) {
    return {
      name: test.name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime
    }
  }
}

/**
 * Run all tests in a suite
 */
export async function runTestSuite(suiteName, baseUrl, headers) {
  const suite = TEST_SUITES[suiteName]
  if (!suite) {
    return { error: `Suite not found: ${suiteName}` }
  }

  const results = {
    name: suite.name,
    tests: [],
    passed: 0,
    failed: 0,
    totalDuration: 0
  }

  for (const test of suite.tests) {
    const result = await runTest(test, baseUrl, headers)
    results.tests.push(result)
    results.totalDuration += result.duration
    
    if (result.passed) {
      results.passed++
    } else {
      results.failed++
    }
  }

  return results
}

/**
 * Run all test suites
 */
export async function runAllTests(baseUrl, headers) {
  const allResults = {
    timestamp: new Date().toISOString(),
    suites: [],
    summary: {
      totalSuites: 0,
      passedSuites: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    }
  }

  for (const suiteName of Object.keys(TEST_SUITES)) {
    const result = await runTestSuite(suiteName, baseUrl, headers)
    allResults.suites.push(result)
    
    allResults.summary.totalSuites++
    allResults.summary.totalTests += result.tests.length
    allResults.summary.passedTests += result.passed
    allResults.summary.failedTests += result.failed
    allResults.summary.totalDuration += result.totalDuration
    
    if (result.failed === 0) {
      allResults.summary.passedSuites++
    }
  }

  return allResults
}

export default {
  createTestAuth,
  TEST_SUITES,
  runTest,
  runTestSuite,
  runAllTests
}
