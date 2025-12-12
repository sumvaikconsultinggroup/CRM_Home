import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse } from '@/lib/utils/response'

export async function POST(request) {
  try {
    const headerPayload = headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If no svix headers, this might be a test or direct call
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.log('[Clerk Webhook] Missing svix headers - might be a test call')
      const body = await request.json()
      return handleWebhookEvent(body)
    }

    const payload = await request.json()
    const body = JSON.stringify(payload)

    // Verify webhook if secret is configured
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    if (webhookSecret && webhookSecret !== 'whsec_placeholder_secret') {
      const wh = new Webhook(webhookSecret)
      try {
        const evt = wh.verify(body, {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        })
        return handleWebhookEvent(evt)
      } catch (err) {
        console.error('[Clerk Webhook] Verification failed:', err)
        return errorResponse('Webhook verification failed', 400)
      }
    }

    return handleWebhookEvent(payload)
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error)
    return errorResponse('Webhook processing failed', 500, error.message)
  }
}

async function handleWebhookEvent(evt) {
  const eventType = evt.type || evt.event_type
  const data = evt.data || evt

  console.log(`[Clerk Webhook] Received event: ${eventType}`)

  try {
    const usersCollection = await getCollection(Collections.USERS)
    const clientsCollection = await getCollection(Collections.CLIENTS)

    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, image_url, first_name, last_name } = data
        const primaryEmail = email_addresses?.[0]?.email_address

        if (!primaryEmail) {
          console.log('[Clerk Webhook] No email found for user')
          break
        }

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: primaryEmail })
        if (existingUser) {
          // Update with Clerk ID
          await usersCollection.updateOne(
            { email: primaryEmail },
            { $set: { clerkId: id, avatar: image_url, updatedAt: new Date() } }
          )
          console.log(`[Clerk Webhook] Updated existing user: ${primaryEmail}`)
        } else {
          // Create new user
          const newUser = {
            id: uuidv4(),
            clerkId: id,
            email: primaryEmail,
            name: `${first_name || ''} ${last_name || ''}`.trim() || 'User',
            avatar: image_url,
            role: 'client_admin',
            clientId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          await usersCollection.insertOne(newUser)
          console.log(`[Clerk Webhook] Created new user: ${primaryEmail}`)
        }
        break
      }

      case 'user.updated': {
        const { id, email_addresses, image_url, first_name, last_name } = data
        const primaryEmail = email_addresses?.[0]?.email_address

        await usersCollection.updateOne(
          { clerkId: id },
          { 
            $set: { 
              email: primaryEmail,
              name: `${first_name || ''} ${last_name || ''}`.trim(),
              avatar: image_url,
              updatedAt: new Date() 
            } 
          }
        )
        console.log(`[Clerk Webhook] Updated user: ${id}`)
        break
      }

      case 'user.deleted': {
        const { id } = data
        await usersCollection.deleteOne({ clerkId: id })
        console.log(`[Clerk Webhook] Deleted user: ${id}`)
        break
      }

      case 'organization.created': {
        const { id, name, image_url, created_by } = data

        // Create client/organization
        const newClient = {
          id: uuidv4(),
          clerkOrgId: id,
          businessName: name,
          logo: image_url,
          planId: 'basic',
          subscriptionStatus: 'active',
          modules: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await clientsCollection.insertOne(newClient)

        // Link creator to organization
        if (created_by) {
          await usersCollection.updateOne(
            { clerkId: created_by },
            { $set: { clientId: newClient.id, role: 'client_admin', updatedAt: new Date() } }
          )
        }
        console.log(`[Clerk Webhook] Created organization: ${name}`)
        break
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data } = data

        const client = await clientsCollection.findOne({ clerkOrgId: organization.id })
        if (client) {
          await usersCollection.updateOne(
            { clerkId: public_user_data.user_id },
            { $set: { clientId: client.id, updatedAt: new Date() } }
          )
          console.log(`[Clerk Webhook] Added user to organization: ${organization.name}`)
        }
        break
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`)
    }

    return successResponse({ received: true, event: eventType })
  } catch (error) {
    console.error(`[Clerk Webhook] Error processing ${eventType}:`, error)
    return errorResponse('Event processing failed', 500, error.message)
  }
}

export async function GET() {
  return successResponse({
    message: 'Clerk Webhook Endpoint',
    version: '1.0',
    supportedEvents: [
      'user.created',
      'user.updated',
      'user.deleted',
      'organization.created',
      'organization.updated',
      'organization.deleted',
      'organizationMembership.created',
      'organizationMembership.deleted'
    ]
  })
}
