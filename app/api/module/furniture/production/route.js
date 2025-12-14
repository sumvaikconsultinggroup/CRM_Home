import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch production planning data
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'overview' // overview, capacity, schedule, resources
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const workCenter = searchParams.get('workCenter')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('furniture_work_orders')
    const orders = db.collection('furniture_orders')
    const boms = db.collection('furniture_boms')

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    // Overview Dashboard
    if (view === 'overview') {
      const [woStats, orderBacklog, bomsPending, capacityUtil] = await Promise.all([
        // Work order stats
        workOrders.aggregate([
          { $match: { isActive: true } },
          { $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalHours: { $sum: '$estimatedHours' }
          }}
        ]).toArray(),
        // Order backlog
        orders.aggregate([
          { $match: { isActive: true, status: { $in: ['confirmed', 'in_production'] } } },
          { $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$grandTotal' }
          }}
        ]).toArray(),
        // BOMs pending production
        boms.countDocuments({ isActive: true, status: 'approved' }),
        // Work center utilization
        workOrders.aggregate([
          { $match: { 
            isActive: true, 
            status: { $in: ['scheduled', 'in_progress'] },
            scheduledStart: { $gte: weekStart.toISOString(), $lte: weekEnd.toISOString() }
          }},
          { $group: {
            _id: '$workCenter',
            scheduledHours: { $sum: '$estimatedHours' },
            orderCount: { $sum: 1 }
          }}
        ]).toArray()
      ])

      // Calculate overall stats
      const inProgress = woStats.find(s => s._id === 'in_progress') || { count: 0, totalHours: 0 }
      const pending = woStats.find(s => s._id === 'pending') || { count: 0, totalHours: 0 }
      const scheduled = woStats.find(s => s._id === 'scheduled') || { count: 0, totalHours: 0 }
      const completed = woStats.find(s => s._id === 'completed') || { count: 0, totalHours: 0 }

      return successResponse({
        summary: {
          workOrdersInProgress: inProgress.count,
          workOrdersPending: pending.count + scheduled.count,
          hoursScheduled: inProgress.totalHours + pending.totalHours + scheduled.totalHours,
          hoursCompleted: completed.totalHours,
          orderBacklog: orderBacklog[0] || { totalOrders: 0, totalValue: 0 },
          bomsPendingRelease: bomsPending
        },
        workOrderStats: woStats.reduce((acc, s) => ({ ...acc, [s._id]: s }), {}),
        capacityByWorkCenter: capacityUtil.reduce((acc, c) => ({ ...acc, [c._id]: c }), {}),
        weekRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() }
      })
    }

    // Capacity Planning View
    if (view === 'capacity') {
      // Define work centers with their capacity
      const workCenters = [
        { id: 'cutting', name: 'Cutting', dailyCapacityHours: 16, color: '#3b82f6' },
        { id: 'edging', name: 'Edge Banding', dailyCapacityHours: 16, color: '#10b981' },
        { id: 'drilling', name: 'Drilling', dailyCapacityHours: 8, color: '#f59e0b' },
        { id: 'assembly', name: 'Assembly', dailyCapacityHours: 24, color: '#8b5cf6' },
        { id: 'finishing', name: 'Finishing', dailyCapacityHours: 16, color: '#ec4899' },
        { id: 'upholstery', name: 'Upholstery', dailyCapacityHours: 16, color: '#06b6d4' },
        { id: 'packaging', name: 'Packaging', dailyCapacityHours: 8, color: '#84cc16' }
      ]

      // Get scheduled hours per work center per day
      const scheduledWork = await workOrders.aggregate([
        { 
          $match: { 
            isActive: true, 
            status: { $nin: ['completed', 'cancelled'] },
            scheduledStart: { $ne: null }
          }
        },
        {
          $addFields: {
            scheduledDate: { $substr: ['$scheduledStart', 0, 10] }
          }
        },
        {
          $group: {
            _id: { workCenter: '$workCenter', date: '$scheduledDate' },
            totalHours: { $sum: '$estimatedHours' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]).toArray()

      // Transform for frontend
      const capacityData = workCenters.map(wc => {
        const wcSchedule = scheduledWork.filter(s => s._id.workCenter === wc.id)
        return {
          ...wc,
          schedule: wcSchedule.map(s => ({
            date: s._id.date,
            scheduledHours: s.totalHours,
            orderCount: s.orderCount,
            utilization: (s.totalHours / wc.dailyCapacityHours * 100).toFixed(1)
          }))
        }
      })

      return successResponse({
        workCenters: capacityData,
        dateRange: {
          from: dateFrom || weekStart.toISOString().split('T')[0],
          to: dateTo || weekEnd.toISOString().split('T')[0]
        }
      })
    }

    // Production Schedule View (Gantt-like)
    if (view === 'schedule') {
      const scheduled = await workOrders.find({
        isActive: true,
        status: { $nin: ['cancelled'] },
        scheduledStart: { $ne: null }
      }).sort({ scheduledStart: 1 }).toArray()

      // Group by order/product
      const byProduct = scheduled.reduce((acc, wo) => {
        const key = wo.productName || wo.orderId || 'Unassigned'
        if (!acc[key]) acc[key] = []
        acc[key].push(wo)
        return acc
      }, {})

      return successResponse({
        schedule: sanitizeDocuments(scheduled),
        byProduct,
        total: scheduled.length
      })
    }

    // Resource Allocation View
    if (view === 'resources') {
      // Get team members and their assignments
      const assignments = await workOrders.aggregate([
        { $match: { isActive: true, status: 'in_progress', assignedTo: { $ne: null } } },
        { $group: {
          _id: '$assignedTo',
          activeOrders: { $sum: 1 },
          totalHours: { $sum: '$estimatedHours' },
          workCenters: { $addToSet: '$workCenter' }
        }}
      ]).toArray()

      return successResponse({
        resourceAllocation: assignments
      })
    }

    return errorResponse('Invalid view type', 400)
  } catch (error) {
    console.error('Furniture Production Planning GET Error:', error)
    return errorResponse('Failed to fetch production data', 500, error.message)
  }
}

// POST - Production planning actions
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const workOrders = db.collection('furniture_work_orders')
    const events = db.collection('furniture_events')

    const now = new Date().toISOString()

    // Auto-schedule work orders
    if (action === 'auto_schedule') {
      const { workCenter, startDate, algorithm } = body // algorithm: fifo, priority, shortest_first

      const query = { 
        isActive: true, 
        status: 'pending',
        scheduledStart: null
      }
      if (workCenter) query.workCenter = workCenter

      let sortConfig = { createdAt: 1 } // FIFO default
      if (algorithm === 'priority') sortConfig = { priority: -1, createdAt: 1 }
      if (algorithm === 'shortest_first') sortConfig = { estimatedHours: 1 }

      const unscheduled = await workOrders.find(query).sort(sortConfig).toArray()

      if (unscheduled.length === 0) {
        return successResponse({ message: 'No work orders to schedule', scheduled: 0 })
      }

      let currentDate = new Date(startDate || now)
      const dailyCapacity = 8 // hours per day
      let dailyHours = 0
      let scheduled = 0

      for (const wo of unscheduled) {
        if (dailyHours + wo.estimatedHours > dailyCapacity) {
          currentDate.setDate(currentDate.getDate() + 1)
          dailyHours = 0
        }

        const scheduledStart = new Date(currentDate)
        const scheduledEnd = new Date(currentDate.getTime() + wo.estimatedHours * 60 * 60 * 1000)

        await workOrders.updateOne(
          { id: wo.id },
          {
            $set: {
              scheduledStart: scheduledStart.toISOString(),
              scheduledEnd: scheduledEnd.toISOString(),
              status: 'scheduled',
              updatedAt: now
            },
            $push: {
              statusHistory: {
                status: 'scheduled',
                timestamp: now,
                by: user.id,
                notes: 'Auto-scheduled'
              }
            }
          }
        )

        dailyHours += wo.estimatedHours
        scheduled++
      }

      await events.insertOne({
        id: uuidv4(),
        type: 'production.auto_scheduled',
        data: { scheduled, algorithm: algorithm || 'fifo', workCenter },
        userId: user.id,
        timestamp: now
      })

      return successResponse({ message: `Scheduled ${scheduled} work orders`, scheduled })
    }

    // Reschedule work order
    if (action === 'reschedule') {
      const { workOrderId, newStart, newEnd, reason } = body

      await workOrders.updateOne(
        { id: workOrderId },
        {
          $set: {
            scheduledStart: newStart,
            scheduledEnd: newEnd,
            rescheduledAt: now,
            rescheduledBy: user.id,
            updatedAt: now
          },
          $push: {
            statusHistory: {
              status: 'rescheduled',
              timestamp: now,
              by: user.id,
              notes: reason || 'Work order rescheduled'
            }
          }
        }
      )

      return successResponse({ message: 'Work order rescheduled' })
    }

    // Bulk assign work orders
    if (action === 'bulk_assign') {
      const { workOrderIds, assignedTo, assignedTeam } = body

      const result = await workOrders.updateMany(
        { id: { $in: workOrderIds } },
        {
          $set: {
            assignedTo,
            assignedTeam,
            updatedAt: now
          }
        }
      )

      return successResponse({ 
        message: `Assigned ${result.modifiedCount} work orders`,
        assigned: result.modifiedCount
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('Furniture Production Planning POST Error:', error)
    return errorResponse('Failed to execute action', 500, error.message)
  }
}
