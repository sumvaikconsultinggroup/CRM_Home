/**
 * D&W Module - Business Mode Management API
 * 
 * Handles business mode (Manufacturer/Fabricator/Dealer) changes with OTP verification.
 * Mode changes require email OTP verification for security.
 */

import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Valid business modes
const BUSINESS_MODES = ['manufacturer', 'fabricator', 'dealer']

// GET - Get current business mode
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settings = db.collection('dw_module_settings')

    // Get current mode setting
    const modeSetting = await settings.findOne({ 
      clientId: user.clientId,
      settingType: 'business_mode'
    })

    return successResponse({
      mode: modeSetting?.mode || 'fabricator',
      lockedAt: modeSetting?.lockedAt || null,
      lockedBy: modeSetting?.lockedBy || null,
      lastChangedAt: modeSetting?.lastChangedAt || null,
      changeHistory: modeSetting?.changeHistory || []
    })
  } catch (error) {
    console.error('DW Business Mode GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to get business mode', 500, error.message)
  }
}

// POST - Request mode change or verify OTP
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const settings = db.collection('dw_module_settings')
    const otpCollection = db.collection('dw_mode_change_otp')

    const now = new Date().toISOString()

    // Get current mode
    const currentSetting = await settings.findOne({ 
      clientId: user.clientId,
      settingType: 'business_mode'
    })
    const currentMode = currentSetting?.mode || 'fabricator'

    // REQUEST OTP - Initiate mode change
    if (action === 'request_otp') {
      const { newMode } = body

      if (!newMode || !BUSINESS_MODES.includes(newMode)) {
        return errorResponse('Invalid business mode', 400)
      }

      if (newMode === currentMode) {
        return errorResponse('Already in this mode', 400)
      }

      // Generate 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000))
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

      // Store OTP request
      await otpCollection.deleteMany({ clientId: user.clientId }) // Clear old OTPs
      await otpCollection.insertOne({
        id: uuidv4(),
        clientId: user.clientId,
        userId: user.id,
        userEmail: user.email,
        currentMode,
        requestedMode: newMode,
        otp,
        expiresAt,
        createdAt: now,
        verified: false
      })

      // In production, send email with OTP
      // For now, we'll log it and return success
      console.log(`[D&W Mode Change OTP] User: ${user.email}, OTP: ${otp}, New Mode: ${newMode}`)

      // Simulate email sending (in production, use actual email service)
      const emailSent = await sendOTPEmail(user.email, otp, currentMode, newMode)

      return successResponse({
        message: 'OTP sent to your registered email',
        email: maskEmail(user.email),
        expiresIn: 600, // 10 minutes in seconds
        // For development/testing - remove in production
        ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
      })
    }

    // VERIFY OTP - Complete mode change
    if (action === 'verify_otp') {
      const { otp, newMode } = body

      if (!otp || !newMode) {
        return errorResponse('OTP and new mode are required', 400)
      }

      // Find valid OTP
      const otpRecord = await otpCollection.findOne({
        clientId: user.clientId,
        otp: otp.toString(),
        requestedMode: newMode,
        verified: false
      })

      if (!otpRecord) {
        return errorResponse('Invalid OTP', 400)
      }

      // Check expiry
      if (new Date(otpRecord.expiresAt) < new Date()) {
        await otpCollection.deleteOne({ id: otpRecord.id })
        return errorResponse('OTP has expired. Please request a new one.', 400)
      }

      // Mark OTP as used
      await otpCollection.updateOne(
        { id: otpRecord.id },
        { $set: { verified: true, verifiedAt: now } }
      )

      // Update business mode
      const changeRecord = {
        fromMode: currentMode,
        toMode: newMode,
        changedAt: now,
        changedBy: user.id,
        changedByEmail: user.email
      }

      await settings.updateOne(
        { clientId: user.clientId, settingType: 'business_mode' },
        {
          $set: {
            mode: newMode,
            lastChangedAt: now,
            lockedBy: user.id,
            lockedAt: now
          },
          $push: {
            changeHistory: {
              $each: [changeRecord],
              $slice: -10 // Keep last 10 changes
            }
          },
          $setOnInsert: {
            id: uuidv4(),
            clientId: user.clientId,
            settingType: 'business_mode',
            createdAt: now
          }
        },
        { upsert: true }
      )

      // Clean up OTP
      await otpCollection.deleteMany({ clientId: user.clientId })

      const modeLabels = {
        manufacturer: 'Manufacturer',
        fabricator: 'Fabricator',
        dealer: 'Dealer'
      }

      return successResponse({
        message: `Business mode changed to ${modeLabels[newMode]}`,
        mode: newMode,
        changedAt: now
      })
    }

    // RESEND OTP
    if (action === 'resend_otp') {
      const existingRequest = await otpCollection.findOne({
        clientId: user.clientId,
        verified: false
      })

      if (!existingRequest) {
        return errorResponse('No pending mode change request. Please initiate a new request.', 400)
      }

      // Generate new OTP
      const newOtp = String(Math.floor(100000 + Math.random() * 900000))
      const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await otpCollection.updateOne(
        { id: existingRequest.id },
        { 
          $set: { 
            otp: newOtp, 
            expiresAt: newExpiresAt,
            updatedAt: now 
          } 
        }
      )

      console.log(`[D&W Mode Change OTP Resend] User: ${user.email}, OTP: ${newOtp}`)

      // Send email
      await sendOTPEmail(user.email, newOtp, existingRequest.currentMode, existingRequest.requestedMode)

      return successResponse({
        message: 'New OTP sent to your email',
        email: maskEmail(user.email),
        expiresIn: 600,
        ...(process.env.NODE_ENV === 'development' && { devOtp: newOtp })
      })
    }

    // CANCEL request
    if (action === 'cancel') {
      await otpCollection.deleteMany({ clientId: user.clientId })
      return successResponse({ message: 'Mode change request cancelled' })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Business Mode POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to process mode change', 500, error.message)
  }
}

// Helper function to mask email
function maskEmail(email) {
  if (!email) return '***'
  const [name, domain] = email.split('@')
  if (name.length <= 2) return `${name[0]}***@${domain}`
  return `${name[0]}${name[1]}***@${domain}`
}

// Helper function to send OTP email (mock for now)
async function sendOTPEmail(email, otp, currentMode, newMode) {
  // In production, integrate with actual email service
  // For now, just log and return true
  console.log(`
    ========================================
    D&W MODULE - BUSINESS MODE CHANGE OTP
    ========================================
    To: ${email}
    Subject: Verify Business Mode Change
    
    You have requested to change your business mode:
    From: ${currentMode.toUpperCase()}
    To: ${newMode.toUpperCase()}
    
    Your OTP is: ${otp}
    
    This OTP is valid for 10 minutes.
    
    If you did not request this change, please ignore this email.
    ========================================
  `)
  return true
}
