/**
 * Integration Tests: Module Data in Projects
 * Tests that module tabs show correct data inside projects
 * 
 * Run with: node --experimental-vm-modules tests/integration/module-data.test.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

let authToken = null
let testProjectId = null

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

  test('Get projects list', async () => {
    const { status, data } = await apiCall('GET', '/api/projects')
    
    assertEqual(status, 200, 'Should get projects: ')
    
    const projects = data.projects || data
    assertTrue(Array.isArray(projects), 'Should be array')
    
    if (projects.length > 0) {
      testProjectId = projects[0].id
      console.log(`  Found ${projects.length} projects`)
    }
  }),

  test('Get project with tasks included', async () => {
    if (!testProjectId) {
      console.log('  Skipped: No project')
      return
    }
    
    const { status, data } = await apiCall('GET', `/api/projects/${testProjectId}?includeTasks=true`)
    
    assertEqual(status, 200, 'Should get project: ')
    assertTrue(data.project || data.id, 'Should have project data')
    
    const project = data.project || data
    if (project.tasks) {
      console.log(`  Project has ${project.tasks.length} tasks`)
    }
  }),

  test('Get project with expenses included', async () => {
    if (!testProjectId) {
      console.log('  Skipped: No project')
      return
    }
    
    const { status, data } = await apiCall('GET', `/api/projects/${testProjectId}?includeExpenses=true`)
    
    assertEqual(status, 200, 'Should get project: ')
    
    const project = data.project || data
    if (project.expenses) {
      console.log(`  Project has ${project.expenses.length} expenses`)
    }
  }),

  test('Get flooring quotes for project', async () => {
    if (!testProjectId) {
      console.log('  Skipped: No project')
      return
    }
    
    const { status, data } = await apiCall('GET', `/api/flooring/enhanced/quotes?projectId=${testProjectId}`)
    
    if (status === 200) {
      const quotes = data.quotes || data
      console.log(`  Found ${Array.isArray(quotes) ? quotes.length : 0} quotes for project`)
    }
  }),

  test('Get flooring invoices for project', async () => {
    if (!testProjectId) {
      console.log('  Skipped: No project')
      return
    }
    
    const { status, data } = await apiCall('GET', `/api/flooring/enhanced/invoices?projectId=${testProjectId}`)
    
    if (status === 200) {
      const invoices = data.invoices || data
      console.log(`  Found ${Array.isArray(invoices) ? invoices.length : 0} invoices for project`)
    }
  }),

  test('Verify tasks reference valid projects', async () => {
    const { status, data } = await apiCall('GET', '/api/tasks')
    
    assertEqual(status, 200, 'Should get tasks: ')
    
    const tasks = data.tasks || data
    const { status: projStatus, data: projData } = await apiCall('GET', '/api/projects')
    const projects = projData.projects || projData
    const projectIds = new Set(projects.map(p => p.id))
    
    const orphanTasks = tasks.filter(t => t.projectId && !projectIds.has(t.projectId))
    
    if (orphanTasks.length > 0) {
      console.log(`  Warning: ${orphanTasks.length} tasks reference missing projects`)
    }
    
    assertTrue(orphanTasks.length === 0, 'All tasks should reference valid projects')
  }),

  test('Verify leads can be converted to projects', async () => {
    const { status, data } = await apiCall('GET', '/api/leads')
    
    assertEqual(status, 200, 'Should get leads: ')
    
    const leads = data.leads || data
    const wonLeads = leads.filter(l => l.status === 'won')
    
    console.log(`  Total leads: ${leads.length}, Won: ${wonLeads.length}`)
  }),

  test('Get client modules configuration', async () => {
    const { status, data } = await apiCall('GET', '/api/client/modules')
    
    assertEqual(status, 200, 'Should get modules: ')
    
    const modules = data.modules || data
    console.log(`  Active modules: ${Array.isArray(modules) ? modules.join(', ') : 'N/A'}`)
  }),

  test('Verify project-module data consistency', async () => {
    // Get a project with flooring data
    const { status: projStatus, data: projData } = await apiCall('GET', '/api/projects')
    const projects = projData.projects || projData
    
    // Get all flooring quotes
    const { status: quoteStatus, data: quoteData } = await apiCall('GET', '/api/flooring/enhanced/quotes')
    const quotes = quoteData.quotes || quoteData || []
    
    // Check that quotes reference valid projects
    const projectIds = new Set(projects.map(p => p.id))
    const orphanQuotes = quotes.filter(q => q.projectId && !projectIds.has(q.projectId))
    
    if (orphanQuotes.length > 0) {
      console.log(`  Warning: ${orphanQuotes.length} quotes reference missing projects`)
    }
    
    assertTrue(orphanQuotes.length === 0, 'All quotes should reference valid projects')
  })
]

async function runTests() {
  console.log('\n=== Module Data Integration Tests ===')
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
