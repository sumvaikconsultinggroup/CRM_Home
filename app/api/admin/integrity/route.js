/**
 * Data Integrity API
 * Provides endpoints for running integrity scans and auto-fixes
 */

import { getClientDb } from '@/lib/db/multitenancy'
import { runFullScan, autoFixIssues, getLatestReport, getScanHistory } from '@/lib/integrity/consistency-scanner'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'
import { verifyToken } from '@/lib/utils/auth'

export async function OPTIONS() {
  return optionsResponse()
}

/**
 * GET - Get latest integrity report or scan history
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }
    
    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || !user.clientId) {
      return errorResponse('Invalid token', 401)
    }
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'latest'
    
    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '10')
      const history = await getScanHistory(user.clientId, limit)
      return successResponse({ history })
    }
    
    // Get latest report
    const report = await getLatestReport(user.clientId)
    return successResponse({ report })
    
  } catch (error) {
    console.error('Integrity API Error:', error)
    return errorResponse('Failed to get integrity report', 500, error.message)
  }
}

/**
 * POST - Run integrity scan or auto-fix issues
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }
    
    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || !user.clientId) {
      return errorResponse('Invalid token', 401)
    }
    
    const body = await request.json()
    const { action, issueIds } = body
    
    if (action === 'scan') {
      // Run full integrity scan
      const report = await runFullScan(user.clientId)
      return successResponse({ 
        message: 'Integrity scan completed',
        report 
      })
    }
    
    if (action === 'autofix') {
      if (!issueIds || !Array.isArray(issueIds)) {
        return errorResponse('issueIds array required for autofix', 400)
      }
      
      const result = await autoFixIssues(user.clientId, issueIds)
      return successResponse({
        message: 'Auto-fix completed',
        ...result
      })
    }
    
    return errorResponse('Invalid action. Use "scan" or "autofix"', 400)
    
  } catch (error) {
    console.error('Integrity API Error:', error)
    return errorResponse('Failed to run integrity action', 500, error.message)
  }
}
