import { NextResponse } from 'next/server'
import { getCollection, Collections, sanitizeDocuments } from '@/lib/db'

// Helper for success response
const successResponse = (data) => NextResponse.json({ success: true, data })
const errorResponse = (message, status = 400) => 
  NextResponse.json({ success: false, error: message }, { status })

// GET - Fetch public landing page data (pricing plans and modules)
export async function GET() {
  try {
    const [plansCollection, modulesCollection] = await Promise.all([
      getCollection(Collections.PLANS),
      getCollection(Collections.MODULES)
    ])
    
    const [plans, modules] = await Promise.all([
      plansCollection.find({}).toArray(),
      modulesCollection.find({}).toArray()
    ])
    
    // Sort plans by price for proper display
    const sortedPlans = sanitizeDocuments(plans).sort((a, b) => (a.price || 0) - (b.price || 0))
    
    // Only return active modules
    const activeModules = sanitizeDocuments(modules).filter(m => m.active !== false)
    
    return successResponse({
      plans: sortedPlans,
      modules: activeModules
    })
  } catch (error) {
    console.error('Landing API Error:', error)
    return errorResponse('Failed to fetch landing data', 500)
  }
}
