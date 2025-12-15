import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('doors_windows_projects')
    
    // FIXED: Only fetch ACTUAL projects, NOT lead-sourced ones
    // Projects come from: 1) Manual creation, 2) CRM Projects sync (NOT Leads)
    // Leads that are "Won" get converted to Projects in CRM, then synced as Projects
    const projects = await collection.find({
      $or: [
        { source: 'manual' },
        { source: { $exists: false } }, // Legacy projects
        { crmProjectId: { $ne: null, $exists: true } }, // Synced from CRM Projects
        { 'syncedFrom.type': 'project' } // Explicitly synced from Projects
      ],
      // Exclude anything that was synced from a lead
      'syncedFrom.type': { $ne: 'lead' },
      leadId: { $in: [null, undefined] } // No lead association OR legacy
    }).toArray()
    
    // Double-check filter: remove any that have "Lead -" in name or came from leads
    const filteredProjects = projects.filter(p => {
      // Skip if name starts with "Lead -"
      if (p.name?.startsWith('Lead -') || p.name?.startsWith('Lead-')) return false
      // Skip if syncedFrom type is 'lead'
      if (p.syncedFrom?.type === 'lead') return false
      return true
    })
    
    return successResponse({ projects: sanitizeDocuments(filteredProjects) })
  } catch (error) {
    console.error('Doors & Windows Projects GET Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch projects', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('doors_windows_projects')

    const projectNumber = `DWP-${new Date().getFullYear()}-${String(await collection.countDocuments() + 1).padStart(5, '0')}`
    const now = new Date().toISOString()

    const newProject = {
      id: uuidv4(),
      projectNumber,
      clientId: user.clientId,
      name: body.name || body.siteName,
      siteName: body.siteName,
      siteAddress: body.siteAddress,
      buildingType: body.buildingType,
      contactPerson: body.contactPerson,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      expectedValue: body.expectedValue ? parseFloat(body.expectedValue) : 0,
      notes: body.notes,
      status: body.status || 'active',
      source: 'manual',
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await collection.insertOne(newProject)
    return successResponse({ project: sanitizeDocument(newProject) }, 201)
  } catch (error) {
    console.error('Doors & Windows Projects POST Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create project', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Project ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('doors_windows_projects')
    
    await collection.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    )

    return successResponse({ message: 'Project updated successfully' })
  } catch (error) {
    console.error('Doors & Windows Projects PUT Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update project', 500, error.message)
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Project ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const collection = db.collection('doors_windows_projects')
    
    await collection.deleteOne({ id })

    return successResponse({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Doors & Windows Projects DELETE Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to delete project', 500, error.message)
  }
}
