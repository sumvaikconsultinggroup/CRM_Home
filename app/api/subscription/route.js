import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { verifyToken } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Check subscription status
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload) {
      return errorResponse('Invalid token', 401)
    }

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const usersCollection = await getCollection(Collections.USERS)
    
    // Get client data
    const client = await clientsCollection.findOne({ 
      $or: [{ id: payload.clientId }, { clientId: payload.clientId }] 
    })
    
    if (!client) {
      return errorResponse('Client not found', 404)
    }

    // Get current user to check if they're the owner
    const user = await usersCollection.findOne({ id: payload.id })
    const isOwner = user?.role === 'client_admin' || user?.role === 'owner'

    // Initialize subscription if not exists
    if (!client.subscription) {
      // New client - needs to select plan first
      return successResponse({
        status: 'no_plan',
        requiresPlanSelection: true,
        isOwner,
        message: 'Please select a plan to continue'
      })
    }

    const subscription = client.subscription
    const now = new Date()
    const trialEndDate = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null
    const daysRemaining = trialEndDate ? Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0

    // Check if trial has expired
    if (subscription.status === 'trial' && trialEndDate && now > trialEndDate) {
      return successResponse({
        status: 'expired',
        planId: subscription.planId,
        planName: subscription.planName,
        isOwner,
        daysRemaining: 0,
        trialEndDate: subscription.trialEndDate,
        message: isOwner 
          ? 'Your trial has expired. Please subscribe to continue using the platform.'
          : 'Your trial has expired. Please contact your organization owner to subscribe.'
      })
    }

    // Active trial
    if (subscription.status === 'trial') {
      return successResponse({
        status: 'trial',
        planId: subscription.planId,
        planName: subscription.planName,
        isOwner,
        daysRemaining,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        message: `Trial ends in ${daysRemaining} days`
      })
    }

    // Active paid subscription
    if (subscription.status === 'active') {
      return successResponse({
        status: 'active',
        planId: subscription.planId,
        planName: subscription.planName,
        isOwner,
        renewalDate: subscription.renewalDate,
        message: 'Subscription active'
      })
    }

    // Cancelled or other status
    return successResponse({
      status: subscription.status,
      planId: subscription.planId,
      planName: subscription.planName,
      isOwner,
      message: 'Subscription inactive'
    })
  } catch (error) {
    console.error('Subscription GET Error:', error)
    return errorResponse('Failed to check subscription', 500, error.message)
  }
}

// POST - Select plan and start trial
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload) {
      return errorResponse('Invalid token', 401)
    }

    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return errorResponse('Plan ID is required', 400)
    }

    // Verify plan exists
    const plansCollection = await getCollection(Collections.PLANS)
    const plan = await plansCollection.findOne({ id: planId })
    if (!plan) {
      return errorResponse('Invalid plan', 400)
    }

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const usersCollection = await getCollection(Collections.USERS)
    
    // Check if user is owner/admin
    const user = await usersCollection.findOne({ id: payload.id })
    if (user?.role !== 'client_admin' && user?.role !== 'owner') {
      return errorResponse('Only the organization owner can select a plan', 403)
    }

    // Get client
    const client = await clientsCollection.findOne({ 
      $or: [{ id: payload.clientId }, { clientId: payload.clientId }] 
    })
    
    if (!client) {
      return errorResponse('Client not found', 404)
    }

    // Check if already has active subscription
    if (client.subscription?.status === 'active') {
      return errorResponse('Already have an active subscription. Use upgrade/downgrade instead.', 400)
    }

    // Start 30-day trial
    const now = new Date()
    const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const subscription = {
      planId: plan.id,
      planName: plan.name,
      status: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }

    // Update client with subscription
    await clientsCollection.updateOne(
      { $or: [{ id: payload.clientId }, { clientId: payload.clientId }] },
      { 
        $set: { 
          subscription,
          planId: plan.id, // Also update legacy field
          subscriptionStatus: 'trial',
          subscriptionStartDate: now,
          subscriptionEndDate: trialEndDate,
          updatedAt: now
        } 
      }
    )

    return successResponse({
      message: `${plan.name} plan selected! Your 30-day free trial has started.`,
      subscription: {
        status: 'trial',
        planId: plan.id,
        planName: plan.name,
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        daysRemaining: 30
      }
    }, 201)
  } catch (error) {
    console.error('Subscription POST Error:', error)
    return errorResponse('Failed to start trial', 500, error.message)
  }
}

// PUT - Upgrade or downgrade plan
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload) {
      return errorResponse('Invalid token', 401)
    }

    const body = await request.json()
    const { planId, action } = body // action: 'upgrade' | 'downgrade' | 'subscribe'

    if (!planId) {
      return errorResponse('Plan ID is required', 400)
    }

    // Verify plan exists
    const plansCollection = await getCollection(Collections.PLANS)
    const plan = await plansCollection.findOne({ id: planId })
    if (!plan) {
      return errorResponse('Invalid plan', 400)
    }

    const clientsCollection = await getCollection(Collections.CLIENTS)
    const usersCollection = await getCollection(Collections.USERS)
    
    // Check if user is owner/admin
    const user = await usersCollection.findOne({ id: payload.id })
    if (user?.role !== 'client_admin' && user?.role !== 'owner') {
      return errorResponse('Only the organization owner can change the plan', 403)
    }

    // Get client
    const client = await clientsCollection.findOne({ 
      $or: [{ id: payload.clientId }, { clientId: payload.clientId }] 
    })
    
    if (!client) {
      return errorResponse('Client not found', 404)
    }

    const now = new Date()
    let newStatus = 'active'
    let trialEndDate = null

    // If subscribing from expired trial, start fresh subscription
    if (action === 'subscribe') {
      newStatus = 'active'
    } else {
      // Preserve trial status if still in trial
      if (client.subscription?.status === 'trial' && client.subscription?.trialEndDate) {
        const existingTrialEnd = new Date(client.subscription.trialEndDate)
        if (existingTrialEnd > now) {
          newStatus = 'trial'
          trialEndDate = client.subscription.trialEndDate
        }
      }
    }

    const subscription = {
      ...client.subscription,
      planId: plan.id,
      planName: plan.name,
      status: newStatus,
      trialEndDate: trialEndDate || client.subscription?.trialEndDate,
      updatedAt: now.toISOString(),
      lastPlanChange: {
        from: client.subscription?.planId,
        to: plan.id,
        action: action,
        date: now.toISOString()
      }
    }

    // Update client
    await clientsCollection.updateOne(
      { $or: [{ id: payload.clientId }, { clientId: payload.clientId }] },
      { 
        $set: { 
          subscription,
          planId: plan.id,
          subscriptionStatus: newStatus,
          updatedAt: now
        } 
      }
    )

    return successResponse({
      message: action === 'subscribe' 
        ? `Successfully subscribed to ${plan.name} plan!`
        : `Successfully ${action}d to ${plan.name} plan!`,
      subscription: {
        status: newStatus,
        planId: plan.id,
        planName: plan.name
      }
    })
  } catch (error) {
    console.error('Subscription PUT Error:', error)
    return errorResponse('Failed to update subscription', 500, error.message)
  }
}
