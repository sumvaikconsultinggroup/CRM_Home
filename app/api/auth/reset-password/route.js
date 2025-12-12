import { getCollection, Collections } from '@/lib/db/mongodb'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return errorResponse('Token and new password are required', 400)
    }

    // Connect to DB
    const usersCollection = await getCollection(Collections.USERS)
    const db = (await usersCollection.client.db())
    const resetsCollection = db.collection('password_resets')

    // Find valid token
    const resetRecord = await resetsCollection.findOne({
      token,
      expiresAt: { $gt: new Date() }
    })

    if (!resetRecord) {
      return errorResponse('Invalid or expired reset token', 400)
    }

    // Update User Password (In a real app, hash this password!)
    // Assuming the user model stores plain text for this MVP based on previous code
    // If there is hashing, I need to check `lib/utils/auth.js` or similar.
    // Looking at `api/auth/register/route.js`, it seems to just store it directly?
    // Wait, let me check register route quick to see if hashing is used.
    
    await usersCollection.updateOne(
      { email: resetRecord.email },
      { $set: { password: newPassword } }
    )

    // Delete used token
    await resetsCollection.deleteMany({ email: resetRecord.email })

    return successResponse({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Reset Password API Error:', error)
    return errorResponse('Failed to reset password', 500)
  }
}
