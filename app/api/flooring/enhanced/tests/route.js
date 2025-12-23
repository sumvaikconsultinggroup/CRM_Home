import { NextResponse } from 'next/server'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { TEST_SUITES, runTestSuite, runAllTests, createTestAuth } from '@/lib/testing/flooring-tests'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * GET - Run tests
 * 
 * Query params:
 * - suite: specific suite name or 'all'
 */
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    // Only allow admins to run tests
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return errorResponse('Admin access required to run tests', 403)
    }

    const { searchParams } = new URL(request.url)
    const suite = searchParams.get('suite') || 'all'

    // Get base URL from request
    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
    
    // Create auth headers using the current user's credentials
    const headers = createTestAuth({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      databaseName: user.databaseName
    })

    let results

    if (suite === 'all') {
      results = await runAllTests(baseUrl, headers)
    } else if (TEST_SUITES[suite]) {
      results = await runTestSuite(suite, baseUrl, headers)
    } else {
      return errorResponse(`Unknown test suite: ${suite}. Available: ${Object.keys(TEST_SUITES).join(', ')}`, 400)
    }

    // Determine overall status
    const overallPassed = suite === 'all' 
      ? results.summary.failedTests === 0
      : results.failed === 0

    return successResponse({
      status: overallPassed ? 'PASSED' : 'FAILED',
      ...results
    })
  } catch (error) {
    console.error('Test Runner Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to run tests', 500, error.message)
  }
}

/**
 * POST - Run specific test with custom configuration
 */
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return errorResponse('Admin access required to run tests', 403)
    }

    const body = await request.json()
    const { suites = ['all'], verbose = false } = body

    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
    
    const headers = createTestAuth({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      databaseName: user.databaseName
    })

    const allResults = []

    for (const suiteName of suites) {
      if (suiteName === 'all') {
        const results = await runAllTests(baseUrl, headers)
        allResults.push(results)
      } else if (TEST_SUITES[suiteName]) {
        const results = await runTestSuite(suiteName, baseUrl, headers)
        allResults.push(results)
      }
    }

    // Calculate summary
    const summary = {
      totalSuites: allResults.length,
      passedSuites: allResults.filter(r => (r.failed || r.summary?.failedTests || 0) === 0).length,
      totalTests: allResults.reduce((sum, r) => sum + (r.tests?.length || r.summary?.totalTests || 0), 0),
      passedTests: allResults.reduce((sum, r) => sum + (r.passed || r.summary?.passedTests || 0), 0),
      totalDuration: allResults.reduce((sum, r) => sum + (r.totalDuration || r.summary?.totalDuration || 0), 0)
    }

    return successResponse({
      status: summary.passedSuites === summary.totalSuites ? 'PASSED' : 'FAILED',
      summary,
      results: verbose ? allResults : undefined
    })
  } catch (error) {
    console.error('Test Runner POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to run tests', 500, error.message)
  }
}
