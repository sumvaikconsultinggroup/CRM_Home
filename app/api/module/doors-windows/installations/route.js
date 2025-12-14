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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('doors_windows_installations')

    if (id) {
      const inst = await installations.findOne({ id })
      if (!inst) return errorResponse('Installation not found', 404)
      return successResponse(sanitizeDocument(inst))
    }

    const query = { isActive: true }
    if (status) query.status = status

    const instList = await installations.find(query).sort({ scheduledDate: 1 }).toArray()
    return successResponse({ installations: sanitizeDocuments(instList) })
  } catch (error) {
    console.error('Doors-Windows Installations GET Error:', error)
    return errorResponse('Failed to fetch installations', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('doors_windows_installations')
    const counters = db.collection('counters')

    const counter = await counters.findOneAndUpdate(
      { _id: 'doors_windows_installation' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
    const instNumber = `DW-INST-${String(counter.seq || 1).padStart(5, '0')}`

    const now = new Date().toISOString()

    const installation = {
      id: uuidv4(),
      installationNumber: instNumber,
      orderId: body.orderId,
      customer: body.customer || {},
      siteAddress: body.siteAddress || {},
      items: body.items || [],
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      installerTeam: body.installerTeam || [],
      status: 'scheduled',
      notes: body.notes || '',
      specialInstructions: body.specialInstructions || '',
      checklist: [
        { item: 'Site inspection', completed: false },
        { item: 'Material check', completed: false },
        { item: 'Measurements verification', completed: false },
        { item: 'Installation', completed: false },
        { item: 'Cleaning', completed: false },
        { item: 'Final inspection', completed: false },
        { item: 'Customer sign-off', completed: false }
      ],
      isActive: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await installations.insertOne(installation)
    return successResponse(sanitizeDocument(installation), 201)
  } catch (error) {
    console.error('Doors-Windows Installations POST Error:', error)
    return errorResponse('Failed to create installation', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Installation ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('doors_windows_installations')

    const now = new Date().toISOString()

    if (action === 'complete_checklist_item') {
      const inst = await installations.findOne({ id })
      if (!inst) return errorResponse('Installation not found', 404)

      const checklist = inst.checklist.map((item, idx) => {
        if (idx === body.itemIndex) {
          return { ...item, completed: true, completedAt: now, completedBy: user.id }
        }
        return item
      })

      const allCompleted = checklist.every(c => c.completed)

      await installations.updateOne(
        { id },
        { $set: { checklist, status: allCompleted ? 'completed' : inst.status, updatedAt: now } }
      )

      return successResponse({ message: 'Checklist updated' })
    }

    updateData.updatedAt = now

    const result = await installations.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) return errorResponse('Installation not found', 404)
    return successResponse(sanitizeDocument(result))
  } catch (error) {
    console.error('Doors-Windows Installations PUT Error:', error)
    return errorResponse('Failed to update installation', 500, error.message)
  }
}
