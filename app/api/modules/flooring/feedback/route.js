import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireClientAccess } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import { FlooringCollections } from '@/lib/modules/flooring/constants'

export async function OPTIONS() {
  return optionsResponse()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const rating = searchParams.get('rating')
    
    const feedbackCollection = await getCollection(FlooringCollections.FEEDBACK)
    
    const filter = { clientId: user.clientId }
    if (projectId) filter.projectId = projectId
    if (rating) filter.rating = parseInt(rating)
    
    const feedback = await feedbackCollection.find(filter).sort({ createdAt: -1 }).toArray()
    
    // Calculate average rating
    const totalFeedback = feedback.length
    const averageRating = totalFeedback > 0 
      ? (feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(1)
      : 0
    
    const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
      rating: r,
      count: feedback.filter(f => f.rating === r).length
    }))
    
    return successResponse({
      feedback: sanitizeDocuments(feedback),
      summary: {
        total: totalFeedback,
        averageRating: parseFloat(averageRating),
        ratingDistribution
      }
    })
  } catch (error) {
    console.error('Flooring Feedback GET Error:', error)
    return errorResponse('Failed to fetch feedback', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { 
      projectId, customerName, customerEmail, rating, 
      qualityRating, serviceRating, timelinessRating, valueRating,
      comments, wouldRecommend, testimonialConsent
    } = body
    
    if (!projectId || !rating) {
      return errorResponse('Project ID and rating are required', 400)
    }
    
    if (rating < 1 || rating > 5) {
      return errorResponse('Rating must be between 1 and 5', 400)
    }
    
    const feedbackCollection = await getCollection(FlooringCollections.FEEDBACK)
    const projectsCollection = await getCollection(FlooringCollections.PROJECTS)
    
    // Verify project exists
    const project = await projectsCollection.findOne({ id: projectId, clientId: user.clientId })
    if (!project) {
      return errorResponse('Project not found', 404)
    }
    
    const feedback = {
      id: uuidv4(),
      clientId: user.clientId,
      projectId,
      projectNumber: project.projectNumber,
      customerName: customerName || project.customerName,
      customerEmail: customerEmail || project.customerEmail,
      rating,
      qualityRating: qualityRating || rating,
      serviceRating: serviceRating || rating,
      timelinessRating: timelinessRating || rating,
      valueRating: valueRating || rating,
      comments: comments || '',
      wouldRecommend: wouldRecommend !== false,
      testimonialConsent: testimonialConsent || false,
      status: 'submitted',
      respondedAt: null,
      response: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await feedbackCollection.insertOne(feedback)
    
    // Update project with feedback
    await projectsCollection.updateOne(
      { id: projectId },
      { $set: { feedbackId: feedback.id, feedbackRating: rating, updatedAt: new Date() } }
    )
    
    return successResponse(sanitizeDocument(feedback), 201)
  } catch (error) {
    console.error('Flooring Feedback POST Error:', error)
    return errorResponse('Failed to submit feedback', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)
    
    const body = await request.json()
    const { feedbackId, response, status } = body
    
    if (!feedbackId) {
      return errorResponse('Feedback ID is required', 400)
    }
    
    const feedbackCollection = await getCollection(FlooringCollections.FEEDBACK)
    
    const updateData = { updatedAt: new Date() }
    
    if (response) {
      updateData.response = response
      updateData.respondedAt = new Date()
      updateData.respondedBy = user.id
    }
    
    if (status) updateData.status = status
    
    await feedbackCollection.updateOne(
      { id: feedbackId, clientId: user.clientId },
      { $set: updateData }
    )
    
    return successResponse({ message: 'Feedback updated successfully' })
  } catch (error) {
    console.error('Flooring Feedback PUT Error:', error)
    return errorResponse('Failed to update feedback', 500, error.message)
  }
}
