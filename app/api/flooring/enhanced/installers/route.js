import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch installers/vendors
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // 'in_house', 'third_party', 'all'
    const status = searchParams.get('status') // 'active', 'inactive'
    const available = searchParams.get('available') // 'true' for currently available

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installers = db.collection('flooring_installers')

    if (id) {
      const installer = await installers.findOne({ id })
      if (!installer) return errorResponse('Installer not found', 404)
      return successResponse(sanitizeDocument(installer))
    }

    const query = {}
    if (type && type !== 'all') query.type = type
    if (status) query.status = status
    if (available === 'true') query.isAvailable = true

    const result = await installers.find(query).sort({ name: 1 }).toArray()

    // Calculate summary
    const summary = {
      total: result.length,
      inHouse: result.filter(i => i.type === 'in_house').length,
      thirdParty: result.filter(i => i.type === 'third_party').length,
      active: result.filter(i => i.status === 'active').length,
      available: result.filter(i => i.isAvailable).length
    }

    return successResponse({ installers: sanitizeDocuments(result), summary })
  } catch (error) {
    console.error('Installers GET Error:', error)
    return errorResponse('Failed to fetch installers', 500, error.message)
  }
}

// POST - Create installer/vendor
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installers = db.collection('flooring_installers')

    const installerId = uuidv4()
    const now = new Date().toISOString()

    const installer = {
      id: installerId,
      // Basic Info
      name: body.name,
      type: body.type || 'in_house', // 'in_house' or 'third_party'
      code: body.code || `INS-${Date.now().toString(36).toUpperCase()}`,
      
      // Contact Details
      phone: body.phone || '',
      altPhone: body.altPhone || '',
      email: body.email || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      
      // For Third Party Vendors
      companyName: body.companyName || '',
      gstNumber: body.gstNumber || '',
      panNumber: body.panNumber || '',
      bankDetails: body.bankDetails || {
        accountName: '',
        accountNumber: '',
        bankName: '',
        ifscCode: '',
        upiId: ''
      },
      
      // Skills & Certifications
      skills: body.skills || [], // ['wooden_flooring', 'laminate', 'vinyl', 'spc', 'hardwood']
      certifications: body.certifications || [], // { name, issuedBy, validTill, documentUrl }
      experience: body.experience || 0, // years
      
      // Work Details
      dailyRate: body.dailyRate || 0,
      sqftRate: body.sqftRate || 0, // Rate per sqft installed
      paymentTerms: body.paymentTerms || 'per_job', // 'per_job', 'weekly', 'monthly'
      
      // Availability
      isAvailable: true,
      currentAssignment: null, // { installationId, projectName, startDate, expectedEnd }
      workingDays: body.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      workingHours: body.workingHours || { start: '09:00', end: '18:00' },
      
      // Performance Metrics (will be auto-updated)
      metrics: {
        totalJobs: 0,
        completedJobs: 0,
        totalAreaInstalled: 0, // sqft
        averageRating: 0,
        onTimeCompletion: 0, // percentage
        qualityScore: 0, // 0-100
        issuesReported: 0,
        lastJobDate: null
      },
      
      // Ratings & Reviews
      ratings: [], // { installationId, projectName, rating, review, by, date }
      
      // Documents
      documents: body.documents || [], // { name, type, url, uploadedAt }
      profilePhoto: body.profilePhoto || '',
      
      // Emergency Contact
      emergencyContact: body.emergencyContact || {
        name: '',
        relation: '',
        phone: ''
      },
      
      // Status
      status: 'active', // 'active', 'inactive', 'blacklisted'
      statusHistory: [{
        status: 'active',
        timestamp: now,
        by: user.id,
        notes: 'Installer created'
      }],
      
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      
      // Metadata
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await installers.insertOne(installer)

    return successResponse(sanitizeDocument(installer), 201)
  } catch (error) {
    console.error('Installers POST Error:', error)
    return errorResponse('Failed to create installer', 500, error.message)
  }
}

// PUT - Update installer
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return errorResponse('Installer ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installers = db.collection('flooring_installers')
    const installations = db.collection('flooring_installations')

    const installer = await installers.findOne({ id })
    if (!installer) return errorResponse('Installer not found', 404)

    const now = new Date().toISOString()

    switch (action) {
      case 'assign':
        // Assign to an installation
        await installers.updateOne({ id }, {
          $set: {
            isAvailable: false,
            currentAssignment: {
              installationId: body.installationId,
              projectName: body.projectName,
              startDate: body.startDate,
              expectedEnd: body.expectedEnd
            },
            updatedAt: now
          }
        })
        return successResponse({ message: 'Installer assigned' })

      case 'unassign':
        // Release from current assignment
        await installers.updateOne({ id }, {
          $set: {
            isAvailable: true,
            currentAssignment: null,
            updatedAt: now
          }
        })
        return successResponse({ message: 'Installer unassigned' })

      case 'add_rating':
        const rating = {
          installationId: body.installationId,
          projectName: body.projectName,
          rating: body.rating, // 1-5
          review: body.review || '',
          by: user.id,
          byName: user.name || user.email,
          date: now
        }
        
        // Calculate new average rating
        const allRatings = [...(installer.ratings || []), rating]
        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length

        await installers.updateOne({ id }, {
          $push: { ratings: rating },
          $set: {
            'metrics.averageRating': Math.round(avgRating * 10) / 10,
            updatedAt: now
          }
        })
        return successResponse({ message: 'Rating added', averageRating: avgRating })

      case 'update_metrics':
        // Called after installation completion
        const completedInstallations = await installations.find({
          assignedTo: id,
          status: 'completed'
        }).toArray()

        const totalArea = completedInstallations.reduce((sum, i) => sum + (i.areaInstalled || 0), 0)
        const onTimeCount = completedInstallations.filter(i => {
          if (!i.actualEndDate || !i.estimatedEndDate) return true
          return new Date(i.actualEndDate) <= new Date(i.estimatedEndDate)
        }).length
        const onTimePercent = completedInstallations.length > 0 
          ? Math.round((onTimeCount / completedInstallations.length) * 100) 
          : 0

        await installers.updateOne({ id }, {
          $set: {
            'metrics.completedJobs': completedInstallations.length,
            'metrics.totalAreaInstalled': totalArea,
            'metrics.onTimeCompletion': onTimePercent,
            'metrics.lastJobDate': now,
            updatedAt: now
          },
          $inc: { 'metrics.totalJobs': 0 } // Just to ensure field exists
        })
        return successResponse({ message: 'Metrics updated' })

      case 'deactivate':
        await installers.updateOne({ id }, {
          $set: { status: 'inactive', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'inactive',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Deactivated'
            }
          }
        })
        return successResponse({ message: 'Installer deactivated' })

      case 'activate':
        await installers.updateOne({ id }, {
          $set: { status: 'active', updatedAt: now },
          $push: {
            statusHistory: {
              status: 'active',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Activated'
            }
          }
        })
        return successResponse({ message: 'Installer activated' })

      case 'blacklist':
        await installers.updateOne({ id }, {
          $set: { status: 'blacklisted', isAvailable: false, updatedAt: now },
          $push: {
            statusHistory: {
              status: 'blacklisted',
              timestamp: now,
              by: user.id,
              notes: body.reason || 'Blacklisted'
            }
          }
        })
        return successResponse({ message: 'Installer blacklisted' })

      default:
        // General update
        updateData.updatedAt = now
        updateData.updatedBy = user.id
        await installers.updateOne({ id }, { $set: updateData })
        return successResponse({ message: 'Installer updated' })
    }
  } catch (error) {
    console.error('Installers PUT Error:', error)
    return errorResponse('Failed to update installer', 500, error.message)
  }
}

// DELETE - Remove installer
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('Installer ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installers = db.collection('flooring_installers')
    const installations = db.collection('flooring_installations')

    // Check if installer has any active installations
    const activeInstallations = await installations.findOne({
      assignedTo: id,
      status: { $in: ['scheduled', 'in_progress'] }
    })

    if (activeInstallations) {
      return errorResponse('Cannot delete installer with active installations. Please reassign first.', 400)
    }

    await installers.deleteOne({ id })

    return successResponse({ message: 'Installer deleted' })
  } catch (error) {
    console.error('Installers DELETE Error:', error)
    return errorResponse('Failed to delete installer', 500, error.message)
  }
}
