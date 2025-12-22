import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch installation reports and analytics
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview' // overview, installers, costs, satisfaction, timeline
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const installerId = searchParams.get('installerId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const installations = db.collection('flooring_installations')
    const installers = db.collection('flooring_installers')
    const invoices = db.collection('flooring_invoices')
    const projects = db.collection('flooring_projects')

    // Build date filter
    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate).toISOString()
    if (endDate) dateFilter.$lte = new Date(endDate).toISOString()

    switch (reportType) {
      case 'overview': {
        // Overall installation metrics
        const allInstallations = await installations.find({}).toArray()
        const allInstallers = await installers.find({}).toArray()
        
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        // Monthly stats
        const thisMonthInstallations = allInstallations.filter(i => 
          new Date(i.createdAt) >= thisMonth && new Date(i.createdAt) <= thisMonthEnd
        )
        const lastMonthInstallations = allInstallations.filter(i => 
          new Date(i.createdAt) >= lastMonth && new Date(i.createdAt) <= lastMonthEnd
        )

        const completedThisMonth = thisMonthInstallations.filter(i => i.status === 'completed')
        const completedLastMonth = lastMonthInstallations.filter(i => i.status === 'completed')

        // Calculate area installed
        const totalAreaInstalled = allInstallations
          .filter(i => i.status === 'completed')
          .reduce((sum, i) => sum + (i.areaInstalled || i.totalArea || 0), 0)

        const areaThisMonth = completedThisMonth.reduce((sum, i) => sum + (i.areaInstalled || i.totalArea || 0), 0)
        const areaLastMonth = completedLastMonth.reduce((sum, i) => sum + (i.areaInstalled || i.totalArea || 0), 0)

        // Calculate average completion time
        const completedWithDates = allInstallations.filter(i => 
          i.status === 'completed' && i.actualStartDate && i.actualEndDate
        )
        const avgCompletionDays = completedWithDates.length > 0
          ? completedWithDates.reduce((sum, i) => {
              const start = new Date(i.actualStartDate)
              const end = new Date(i.actualEndDate)
              return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24))
            }, 0) / completedWithDates.length
          : 0

        // Issue stats
        const totalIssues = allInstallations.reduce((sum, i) => sum + (i.issues?.length || 0), 0)
        const openIssues = allInstallations.reduce((sum, i) => 
          sum + (i.issues?.filter(iss => iss.status === 'open').length || 0), 0
        )

        // Status breakdown
        const statusBreakdown = {
          scheduled: allInstallations.filter(i => i.status === 'scheduled').length,
          in_progress: allInstallations.filter(i => i.status === 'in_progress').length,
          on_hold: allInstallations.filter(i => i.status === 'on_hold').length,
          completed: allInstallations.filter(i => i.status === 'completed').length,
          cancelled: allInstallations.filter(i => i.status === 'cancelled').length
        }

        // Monthly trend (last 6 months)
        const monthlyTrend = []
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
          const monthName = monthStart.toLocaleString('default', { month: 'short' })
          
          const monthInstallations = allInstallations.filter(inst => {
            const date = new Date(inst.createdAt)
            return date >= monthStart && date <= monthEnd
          })
          
          const completed = monthInstallations.filter(inst => inst.status === 'completed')
          
          monthlyTrend.push({
            month: monthName,
            total: monthInstallations.length,
            completed: completed.length,
            area: completed.reduce((sum, inst) => sum + (inst.areaInstalled || inst.totalArea || 0), 0)
          })
        }

        return successResponse({
          overview: {
            totalInstallations: allInstallations.length,
            completedInstallations: allInstallations.filter(i => i.status === 'completed').length,
            activeInstallations: allInstallations.filter(i => ['scheduled', 'in_progress'].includes(i.status)).length,
            totalAreaInstalled,
            avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
            totalInstallers: allInstallers.length,
            availableInstallers: allInstallers.filter(i => i.isAvailable && i.status === 'active').length,
            totalIssues,
            openIssues
          },
          comparison: {
            installationsThisMonth: thisMonthInstallations.length,
            installationsLastMonth: lastMonthInstallations.length,
            completedThisMonth: completedThisMonth.length,
            completedLastMonth: completedLastMonth.length,
            areaThisMonth,
            areaLastMonth,
            growthPercent: lastMonthInstallations.length > 0 
              ? Math.round(((thisMonthInstallations.length - lastMonthInstallations.length) / lastMonthInstallations.length) * 100)
              : 0
          },
          statusBreakdown,
          monthlyTrend
        })
      }

      case 'installers': {
        // Installer performance metrics
        const allInstallers = await installers.find({}).toArray()
        const allInstallations = await installations.find({}).toArray()

        const installerStats = allInstallers.map(installer => {
          const installerJobs = allInstallations.filter(i => i.assignedTo === installer.id)
          const completedJobs = installerJobs.filter(i => i.status === 'completed')
          const totalArea = completedJobs.reduce((sum, i) => sum + (i.areaInstalled || i.totalArea || 0), 0)
          
          // Calculate on-time completion rate
          const jobsWithDates = completedJobs.filter(i => i.scheduledDate && i.actualEndDate)
          const onTimeJobs = jobsWithDates.filter(i => {
            const scheduled = new Date(i.scheduledDate)
            const actual = new Date(i.actualEndDate)
            const buffer = (i.estimatedDuration || 1) * 24 * 60 * 60 * 1000 // Buffer in ms
            return actual <= new Date(scheduled.getTime() + buffer)
          })
          const onTimeRate = jobsWithDates.length > 0 
            ? Math.round((onTimeJobs.length / jobsWithDates.length) * 100) 
            : 0

          // Calculate average job duration
          const avgDuration = completedJobs.filter(i => i.actualStartDate && i.actualEndDate).length > 0
            ? completedJobs
                .filter(i => i.actualStartDate && i.actualEndDate)
                .reduce((sum, i) => {
                  const start = new Date(i.actualStartDate)
                  const end = new Date(i.actualEndDate)
                  return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                }, 0) / completedJobs.filter(i => i.actualStartDate && i.actualEndDate).length
            : 0

          // Issues caused
          const issuesCount = installerJobs.reduce((sum, i) => sum + (i.issues?.length || 0), 0)

          return {
            id: installer.id,
            name: installer.name,
            type: installer.type,
            companyName: installer.companyName,
            phone: installer.phone,
            status: installer.status,
            isAvailable: installer.isAvailable,
            totalJobs: installerJobs.length,
            completedJobs: completedJobs.length,
            inProgressJobs: installerJobs.filter(i => i.status === 'in_progress').length,
            totalAreaInstalled: totalArea,
            avgRating: installer.metrics?.averageRating || 0,
            totalRatings: installer.ratings?.length || 0,
            onTimeRate,
            avgDuration: Math.round(avgDuration * 10) / 10,
            issuesCount,
            dailyRate: installer.dailyRate || 0,
            sqftRate: installer.sqftRate || 0,
            experience: installer.experience || 0,
            skills: installer.skills || []
          }
        })

        // Sort by completed jobs
        installerStats.sort((a, b) => b.completedJobs - a.completedJobs)

        // Top performers
        const topByJobs = [...installerStats].sort((a, b) => b.completedJobs - a.completedJobs).slice(0, 5)
        const topByArea = [...installerStats].sort((a, b) => b.totalAreaInstalled - a.totalAreaInstalled).slice(0, 5)
        const topByRating = [...installerStats].filter(i => i.avgRating > 0).sort((a, b) => b.avgRating - a.avgRating).slice(0, 5)

        return successResponse({
          installers: installerStats,
          topPerformers: {
            byJobs: topByJobs,
            byArea: topByArea,
            byRating: topByRating
          },
          summary: {
            totalInstallers: allInstallers.length,
            inHouse: allInstallers.filter(i => i.type === 'in_house').length,
            thirdParty: allInstallers.filter(i => i.type === 'third_party').length,
            active: allInstallers.filter(i => i.status === 'active').length,
            available: allInstallers.filter(i => i.isAvailable && i.status === 'active').length,
            avgRating: installerStats.filter(i => i.avgRating > 0).length > 0
              ? Math.round(installerStats.filter(i => i.avgRating > 0).reduce((sum, i) => sum + i.avgRating, 0) / installerStats.filter(i => i.avgRating > 0).length * 10) / 10
              : 0
          }
        })
      }

      case 'costs': {
        // Cost analysis
        const allInstallations = await installations.find({}).toArray()
        const allInvoices = await invoices.find({}).toArray()
        const allInstallers = await installers.find({}).toArray()

        // Calculate labor costs (based on installer rates)
        let totalLaborCost = 0
        let totalMaterialCost = 0

        allInstallations.filter(i => i.status === 'completed').forEach(inst => {
          const installer = allInstallers.find(ins => ins.id === inst.assignedTo)
          if (installer) {
            // Calculate based on area and sqft rate, or duration and daily rate
            if (installer.sqftRate && inst.areaInstalled) {
              totalLaborCost += installer.sqftRate * inst.areaInstalled
            } else if (installer.dailyRate && inst.actualStartDate && inst.actualEndDate) {
              const days = Math.ceil((new Date(inst.actualEndDate) - new Date(inst.actualStartDate)) / (1000 * 60 * 60 * 24))
              totalLaborCost += installer.dailyRate * days
            }
          }

          // Get material cost from invoice
          const invoice = allInvoices.find(inv => inv.id === inst.invoiceId)
          if (invoice) {
            totalMaterialCost += invoice.subtotal || 0
          }
        })

        // Cost breakdown by month
        const now = new Date()
        const monthlyCosts = []
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
          const monthName = monthStart.toLocaleString('default', { month: 'short' })
          
          let monthLabor = 0
          let monthMaterial = 0

          allInstallations
            .filter(inst => inst.status === 'completed' && new Date(inst.actualEndDate) >= monthStart && new Date(inst.actualEndDate) <= monthEnd)
            .forEach(inst => {
              const installer = allInstallers.find(ins => ins.id === inst.assignedTo)
              if (installer?.sqftRate && inst.areaInstalled) {
                monthLabor += installer.sqftRate * inst.areaInstalled
              }
              const invoice = allInvoices.find(inv => inv.id === inst.invoiceId)
              if (invoice) {
                monthMaterial += invoice.subtotal || 0
              }
            })

          monthlyCosts.push({
            month: monthName,
            labor: Math.round(monthLabor),
            material: Math.round(monthMaterial),
            total: Math.round(monthLabor + monthMaterial)
          })
        }

        // Cost per sqft analysis
        const completedWithArea = allInstallations.filter(i => i.status === 'completed' && i.areaInstalled > 0)
        const totalCompletedArea = completedWithArea.reduce((sum, i) => sum + i.areaInstalled, 0)
        const avgCostPerSqft = totalCompletedArea > 0 
          ? (totalLaborCost + totalMaterialCost) / totalCompletedArea 
          : 0

        return successResponse({
          totals: {
            laborCost: Math.round(totalLaborCost),
            materialCost: Math.round(totalMaterialCost),
            totalCost: Math.round(totalLaborCost + totalMaterialCost),
            avgCostPerSqft: Math.round(avgCostPerSqft * 100) / 100,
            totalAreaCompleted: totalCompletedArea
          },
          monthlyCosts,
          breakdown: {
            laborPercent: totalLaborCost + totalMaterialCost > 0 
              ? Math.round((totalLaborCost / (totalLaborCost + totalMaterialCost)) * 100) 
              : 0,
            materialPercent: totalLaborCost + totalMaterialCost > 0 
              ? Math.round((totalMaterialCost / (totalLaborCost + totalMaterialCost)) * 100) 
              : 0
          }
        })
      }

      case 'satisfaction': {
        // Customer satisfaction metrics
        const allInstallations = await installations.find({}).toArray()
        const allInstallers = await installers.find({}).toArray()

        // Collect all ratings
        const allRatings = []
        allInstallers.forEach(installer => {
          (installer.ratings || []).forEach(rating => {
            allRatings.push({
              ...rating,
              installerId: installer.id,
              installerName: installer.name
            })
          })
        })

        // Rating distribution
        const ratingDistribution = {
          5: allRatings.filter(r => r.rating === 5).length,
          4: allRatings.filter(r => r.rating === 4).length,
          3: allRatings.filter(r => r.rating === 3).length,
          2: allRatings.filter(r => r.rating === 2).length,
          1: allRatings.filter(r => r.rating === 1).length
        }

        const avgRating = allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
          : 0

        // Issue resolution stats
        const allIssues = []
        allInstallations.forEach(inst => {
          (inst.issues || []).forEach(issue => {
            allIssues.push({
              ...issue,
              installationId: inst.id,
              customerName: inst.customer?.name
            })
          })
        })

        const resolvedIssues = allIssues.filter(i => i.status === 'resolved')
        const avgResolutionTime = resolvedIssues.filter(i => i.reportedAt && i.resolvedAt).length > 0
          ? resolvedIssues
              .filter(i => i.reportedAt && i.resolvedAt)
              .reduce((sum, i) => {
                const reported = new Date(i.reportedAt)
                const resolved = new Date(i.resolvedAt)
                return sum + Math.ceil((resolved - reported) / (1000 * 60 * 60 * 24))
              }, 0) / resolvedIssues.filter(i => i.reportedAt && i.resolvedAt).length
          : 0

        // Recent reviews
        const recentReviews = allRatings
          .filter(r => r.review)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 10)

        return successResponse({
          ratings: {
            total: allRatings.length,
            average: Math.round(avgRating * 10) / 10,
            distribution: ratingDistribution
          },
          issues: {
            total: allIssues.length,
            open: allIssues.filter(i => i.status === 'open').length,
            resolved: resolvedIssues.length,
            avgResolutionDays: Math.round(avgResolutionTime * 10) / 10,
            bySeverity: {
              critical: allIssues.filter(i => i.severity === 'critical').length,
              high: allIssues.filter(i => i.severity === 'high').length,
              medium: allIssues.filter(i => i.severity === 'medium').length,
              low: allIssues.filter(i => i.severity === 'low').length
            }
          },
          recentReviews,
          nps: {
            promoters: allRatings.filter(r => r.rating >= 4).length,
            passives: allRatings.filter(r => r.rating === 3).length,
            detractors: allRatings.filter(r => r.rating <= 2).length,
            score: allRatings.length > 0
              ? Math.round(((allRatings.filter(r => r.rating >= 4).length - allRatings.filter(r => r.rating <= 2).length) / allRatings.length) * 100)
              : 0
          }
        })
      }

      default:
        return errorResponse('Invalid report type', 400)
    }
  } catch (error) {
    console.error('Installation Reports Error:', error)
    return errorResponse('Failed to generate report', 500, error.message)
  }
}
