import { NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { seedDatabase } from '@/lib/db/seed'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET() {
  try {
    await seedDatabase()
    const plansCollection = await getCollection(Collections.PLANS)
    const plans = await plansCollection.find({}).toArray()
    return successResponse(sanitizeDocuments(plans))
  } catch (error) {
    console.error('Plans API Error:', error)
    return errorResponse('Failed to fetch plans', 500)
  }
}
