import { v4 as uuidv4 } from 'uuid'

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
const SALT = 'buildcrm_salt_2024'

export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    permissions: user.permissions || [],
    iat: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY
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
  return Buffer.from(password + SALT).toString('base64')
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash
}

export function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  return verifyToken(token)
}

export function requireAuth(user) {
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export function requireSuperAdmin(user) {
  requireAuth(user)
  if (user.role !== 'super_admin') {
    throw new Error('Forbidden: Super Admin access required')
  }
  return user
}

export function requireClientAccess(user) {
  requireAuth(user)
  if (!user.clientId && user.role !== 'super_admin') {
    throw new Error('Forbidden: Client access required')
  }
  return user
}
