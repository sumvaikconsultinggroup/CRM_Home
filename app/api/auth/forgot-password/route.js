import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return errorResponse('Email is required', 400)
    }

    const usersCollection = await getCollection(Collections.USERS)
    const user = await usersCollection.findOne({ email })

    if (!user) {
      // Return success even if user not found to prevent enumeration
      return successResponse({ message: 'If an account exists, a reset link has been sent.' })
    }

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    // Store reset token
    // For simplicity in this MVP, we'll store it in a 'password_resets' collection
    // Note: You might need to add PASSWORD_RESETS to your Collections enum if not present,
    // or just use the string name 'password_resets'.
    const db = (await usersCollection.client.db()) 
    const resetsCollection = db.collection('password_resets')
    
    await resetsCollection.insertOne({
      email,
      token,
      expiresAt,
      createdAt: new Date()
    })

    // SIMULATE EMAIL SENDING
    console.log('=================================================================')
    console.log(`PASSWORD RESET REQUEST FOR: ${email}`)
    console.log(`RESET TOKEN: ${token}`)
    console.log(`RESET LINK (Mock): http://localhost:3000/reset-password?token=${token}`)
    console.log('=================================================================')

    return successResponse({ message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    console.error('Forgot Password API Error:', error)
    return errorResponse('Failed to process request', 500)
  }
}
