import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// POST - Manage project team
export async function POST(request, { params }) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { projectId } = await params
    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const projectsCollection = db.collection('projects')

    const project = await projectsCollection.findOne({ id: projectId })
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    const now = new Date()
    let team = project.team || []
    let activityLog = project.activityLog || []

    switch (action) {
      case 'add_member': {
        const { userId, userName, userEmail, role } = body
        
        if (!userId || !role) {
          return errorResponse('User ID and role are required', 400)
        }

        // Check if already a member
        const existingMember = team.find(m => m.userId === userId)
        if (existingMember) {
          return errorResponse('User is already a team member', 400)
        }

        const newMember = {
          id: uuidv4(),
          userId,
          userName: userName || userEmail || userId,
          userEmail: userEmail || '',
          role, // project_manager, team_lead, worker, viewer
          permissions: getPermissionsForRole(role),
          addedAt: now,
          addedBy: user.id
        }

        team.push(newMember)
        
        activityLog.push({
          id: uuidv4(),
          action: 'team_member_added',
          description: `${userName || userId} added to team as ${role}`,
          userId: user.id,
          userName: user.name || user.email,
          targetUserId: userId,
          timestamp: now
        })
        break
      }

      case 'remove_member': {
        const { memberId } = body
        
        if (!memberId) {
          return errorResponse('Member ID is required', 400)
        }

        const memberToRemove = team.find(m => m.id === memberId || m.userId === memberId)
        if (!memberToRemove) {
          return errorResponse('Team member not found', 404)
        }

        team = team.filter(m => m.id !== memberId && m.userId !== memberId)
        
        activityLog.push({
          id: uuidv4(),
          action: 'team_member_removed',
          description: `${memberToRemove.userName} removed from team`,
          userId: user.id,
          userName: user.name || user.email,
          targetUserId: memberToRemove.userId,
          timestamp: now
        })
        break
      }

      case 'update_role': {
        const { memberId, newRole } = body
        
        if (!memberId || !newRole) {
          return errorResponse('Member ID and new role are required', 400)
        }

        const memberIndex = team.findIndex(m => m.id === memberId || m.userId === memberId)
        if (memberIndex === -1) {
          return errorResponse('Team member not found', 404)
        }

        const oldRole = team[memberIndex].role
        team[memberIndex] = {
          ...team[memberIndex],
          role: newRole,
          permissions: getPermissionsForRole(newRole),
          updatedAt: now
        }
        
        activityLog.push({
          id: uuidv4(),
          action: 'team_role_updated',
          description: `${team[memberIndex].userName}'s role changed from ${oldRole} to ${newRole}`,
          userId: user.id,
          userName: user.name || user.email,
          targetUserId: team[memberIndex].userId,
          timestamp: now
        })
        break
      }

      case 'set_project_manager': {
        const { userId } = body
        
        if (!userId) {
          return errorResponse('User ID is required', 400)
        }

        await projectsCollection.updateOne(
          { id: projectId },
          { 
            $set: { 
              projectManager: userId,
              updatedAt: now
            },
            $push: {
              activityLog: {
                id: uuidv4(),
                action: 'project_manager_changed',
                description: 'Project manager updated',
                userId: user.id,
                userName: user.name || user.email,
                newProjectManager: userId,
                timestamp: now
              }
            }
          }
        )

        const updatedProject = await projectsCollection.findOne({ id: projectId })
        return successResponse(sanitizeDocument(updatedProject))
      }

      default:
        return errorResponse('Invalid action', 400)
    }

    // Update project with new team
    await projectsCollection.updateOne(
      { id: projectId },
      { 
        $set: { 
          team,
          activityLog,
          updatedAt: now
        }
      }
    )

    const updatedProject = await projectsCollection.findOne({ id: projectId })
    return successResponse(sanitizeDocument(updatedProject))

  } catch (error) {
    console.error('Project Team API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to update project team', 500, error.message)
  }
}

// Helper function to get permissions based on role
function getPermissionsForRole(role) {
  const permissions = {
    project_manager: {
      canEdit: true,
      canDelete: true,
      canManageTeam: true,
      canManageBudget: true,
      canManageMilestones: true,
      canManageTasks: true,
      canViewReports: true,
      canExport: true
    },
    team_lead: {
      canEdit: true,
      canDelete: false,
      canManageTeam: false,
      canManageBudget: false,
      canManageMilestones: true,
      canManageTasks: true,
      canViewReports: true,
      canExport: true
    },
    worker: {
      canEdit: false,
      canDelete: false,
      canManageTeam: false,
      canManageBudget: false,
      canManageMilestones: false,
      canManageTasks: true,
      canViewReports: false,
      canExport: false
    },
    viewer: {
      canEdit: false,
      canDelete: false,
      canManageTeam: false,
      canManageBudget: false,
      canManageMilestones: false,
      canManageTasks: false,
      canViewReports: true,
      canExport: false
    }
  }

  return permissions[role] || permissions.viewer
}
