import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections, ConsultationStatus } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming')
    
    const consultationsCollection = await getCollection(FlooringCollections.CONSULTATIONS)
    
    const filter = { clientId: user.clientId }
    if (status) filter.status = status
    
    let consultations = await consultationsCollection.find(filter).sort({ scheduledDate: 1 }).toArray()
    
    // Filter upcoming consultations
    if (upcoming === 'true') {
      consultations = consultations.filter(c => 
        new Date(c.scheduledDate) >= new Date() && 
        ['scheduled', 'confirmed'].includes(c.status)
      )
    }
    
    return successResponse({
      consultations: sanitizeDocuments(consultations),
      statusOptions: ConsultationStatus
    })
  } catch (error) {
    console.error('Flooring Consultations GET Error:', error)
    return errorResponse('Failed to fetch consultations', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { 
      customerName, customerEmail, customerPhone, customerAddress,
      leadId, type, scheduledDate, scheduledTime, duration, 
      siteAddress, notes, assignedTo
    } = body
    
    if (!customerName || !scheduledDate) {
      return errorResponse('Customer name and scheduled date are required', 400)
    }
    
    const consultationsCollection = await getCollection(FlooringCollections.CONSULTATIONS)
    
    const consultation = {
      id: uuidv4(),
      clientId: user.clientId,
      customerName,
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      leadId: leadId || null,
      type: type || 'site_visit', // site_visit, showroom, video_call
      scheduledDate: new Date(scheduledDate),
      scheduledTime: scheduledTime || '10:00',
      duration: duration || 60, // minutes
      siteAddress: siteAddress || customerAddress || '',
      status: 'scheduled',
      notes: notes || '',
      assignedTo: assignedTo || user.id,
      outcome: null,
      followUpRequired: false,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await consultationsCollection.insertOne(consultation)
    
    // Mock WhatsApp notification
    console.log(`[WhatsApp Mock] Consultation scheduled for ${customerName} on ${scheduledDate}. Phone: ${customerPhone}`)
    
    return successResponse(sanitizeDocument(consultation), 201)
  } catch (error) {
    console.error('Flooring Consultations POST Error:', error)
    return errorResponse('Failed to create consultation', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { consultationId, status, outcome, notes, rescheduleDate, rescheduleTime } = body
    
    if (!consultationId) {
      return errorResponse('Consultation ID is required', 400)
    }
    
    const consultationsCollection = await getCollection(FlooringCollections.CONSULTATIONS)
    
    const consultation = await consultationsCollection.findOne({ id: consultationId, clientId: user.clientId })
    if (!consultation) {
      return errorResponse('Consultation not found', 404)
    }
    
    const updateData = { updatedAt: new Date() }
    
    if (status) updateData.status = status
    if (outcome) updateData.outcome = outcome
    if (notes) updateData.notes = notes
    
    // Handle rescheduling
    if (status === 'rescheduled' && rescheduleDate) {
      updateData.scheduledDate = new Date(rescheduleDate)
      if (rescheduleTime) updateData.scheduledTime = rescheduleTime
      updateData.status = 'scheduled'
      
      // Mock WhatsApp notification for reschedule
      console.log(`[WhatsApp Mock] Consultation rescheduled for ${consultation.customerName} to ${rescheduleDate}`)
    }
    
    // Handle completion
    if (status === 'completed') {
      updateData.completedAt = new Date()
      updateData.completedBy = user.id
    }
    
    await consultationsCollection.updateOne(
      { id: consultationId, clientId: user.clientId },
      { $set: updateData }
    )
    
    return successResponse({ message: 'Consultation updated successfully' })
  } catch (error) {
    console.error('Flooring Consultation PUT Error:', error)
    return errorResponse('Failed to update consultation', 500, error.message)
  }
}
