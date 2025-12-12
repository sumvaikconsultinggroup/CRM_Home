import { v4 as uuidv4 } from 'uuid'

// Simple JWT-like token generation (for MVP - in production use proper JWT)
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    if (payload.exp < Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function hashPassword(password) {
  // Simple hash for MVP - in production use bcrypt
  return Buffer.from(password + 'salt_key_2024').toString('base64')
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash
}
