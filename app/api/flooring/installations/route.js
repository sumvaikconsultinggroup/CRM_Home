import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, InstallationStatus, generateFlooringId } from '@/lib/db/flooring-schema'

// GET - Fetch installations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const installationId = searchParams.get('id')

    const installations = await getCollection(FlooringCollections.INSTALLATIONS)
    
    if (installationId) {
      const installation = await installations.findOne({ id: installationId })
      return NextResponse.json(installation || { error: 'Installation not found' })
    }

    const query = {}
    if (clientId) query.clientId = clientId
    if (projectId) query.projectId = projectId
    if (status) query.status = status

    const result = await installations.find(query).sort({ scheduledDate: 1 }).toArray()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Installations GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch installations' }, { status: 500 })
  }
}

// POST - Create installation
export async function POST(request) {
  try {
    const body = await request.json()
    const installations = await getCollection(FlooringCollections.INSTALLATIONS)

    const installation = {
      id: generateFlooringId('FLI'),
      projectId: body.projectId,
      quoteId: body.quoteId,
      leadId: body.leadId,
      clientId: body.clientId,
      customerName: body.customerName,
      siteAddress: body.siteAddress,
      contactPhone: body.contactPhone,
      status: InstallationStatus.SCHEDULED,
      priority: body.priority || 'normal', // low, normal, high, urgent
      scheduledDate: body.scheduledDate,
      estimatedDays: body.estimatedDays || 1,
      startDate: null,
      endDate: null,
      crew: body.crew || [],
      leadInstaller: body.leadInstaller || null,
      materials: {
        ordered: false,
        orderedAt: null,
        delivered: false,
        deliveredAt: null,
        deliveryNotes: '',
        items: body.materials?.items || []
      },
      rooms: body.rooms || [],
      totalArea: body.totalArea || 0,
      preInstallChecklist: {
        siteInspected: false,
        subfloorPrepared: false,
        materialsVerified: false,
        toolsReady: false,
        customerNotified: false
      },
      dailyProgress: [],
      issues: [],
      qualityChecklist: {
        evenSurface: null,
        properExpansion: null,
        cleanFinish: null,
        transitionsInstalled: null,
        debrisCleaned: null,
        customerWalkthrough: null
      },
      photos: {
        before: [],
        during: [],
        after: []
      },
      customerSignoff: {
        signed: false,
        signedAt: null,
        signature: null,
        feedback: '',
        rating: null
      },
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await installations.insertOne(installation)
    return NextResponse.json(installation, { status: 201 })
  } catch (error) {
    console.error('Flooring Installations POST Error:', error)
    return NextResponse.json({ error: 'Failed to create installation' }, { status: 500 })
  }
}

// PUT - Update installation
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Installation ID required' }, { status: 400 })
    }

    const installations = await getCollection(FlooringCollections.INSTALLATIONS)

    // Handle status transitions
    if (updateData.status) {
      const now = new Date().toISOString()
      switch (updateData.status) {
        case InstallationStatus.IN_PROGRESS:
          if (!updateData.startDate) updateData.startDate = now
          break
        case InstallationStatus.COMPLETED:
          if (!updateData.endDate) updateData.endDate = now
          break
      }
    }

    // Handle daily progress update
    if (updateData.addProgress) {
      const progress = {
        id: generateFlooringId('PRG'),
        date: new Date().toISOString(),
        description: updateData.addProgress.description,
        roomsCompleted: updateData.addProgress.roomsCompleted || [],
        percentComplete: updateData.addProgress.percentComplete || 0,
        hoursWorked: updateData.addProgress.hoursWorked || 0,
        issues: updateData.addProgress.issues || [],
        photos: updateData.addProgress.photos || [],
        createdBy: updateData.addProgress.createdBy
      }
      
      const result = await installations.findOneAndUpdate(
        { id },
        { 
          $push: { dailyProgress: progress },
          $set: { updatedAt: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      )
      return NextResponse.json(result)
    }

    const result = await installations.findOneAndUpdate(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Installations PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update installation' }, { status: 500 })
  }
}

// DELETE - Delete installation
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Installation ID required' }, { status: 400 })
    }

    const installations = await getCollection(FlooringCollections.INSTALLATIONS)
    
    const result = await installations.deleteOne({ id })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Installation deleted successfully' })
  } catch (error) {
    console.error('Flooring Installations DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete installation' }, { status: 500 })
  }
}
