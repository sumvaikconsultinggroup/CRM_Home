import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb, getMainDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// =============================================
// ENTERPRISE ROLE-BASED ACCESS MANAGEMENT
// =============================================
// Single source of truth: CRM Users
// Role-based permissions at Module and Tab level
// Hierarchical: CRM → Flooring Module → Tabs/Features
// Audit trail for all permission changes

// Default Roles with Permissions
const DEFAULT_ROLES = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full system access - all modules and features',
    level: 100,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: true, delete: true, admin: true },
        tabs: {
          dashboard: { view: true, edit: true },
          products: { view: true, edit: true, create: true, delete: true },
          projects: { view: true, edit: true, create: true, delete: true },
          measurements: { view: true, edit: true, create: true },
          materials: { view: true, edit: true, create: true },
          quotes: { view: true, edit: true, create: true, delete: true, approve: true },
          challans: { view: true, edit: true, create: true, delete: true, dispatch: true, deliver: true },
          invoices: { view: true, edit: true, create: true, delete: true, void: true },
          installations: { view: true, edit: true, create: true, complete: true },
          inventory: { view: true, edit: true, grn: true, adjust: true, transfer: true },
          finance: { view: true, edit: true, payments: true, refunds: true },
          reports: { view: true, export: true },
          settings: { view: true, edit: true }
        }
      }
    }
  },
  client_admin: {
    id: 'client_admin',
    name: 'Client Admin',
    description: 'Full access to client data and team management',
    level: 90,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: true, delete: false, admin: true },
        tabs: {
          dashboard: { view: true, edit: true },
          products: { view: true, edit: true, create: true, delete: true },
          projects: { view: true, edit: true, create: true, delete: true },
          measurements: { view: true, edit: true, create: true },
          materials: { view: true, edit: true, create: true },
          quotes: { view: true, edit: true, create: true, delete: true, approve: true },
          challans: { view: true, edit: true, create: true, delete: true, dispatch: true, deliver: true },
          invoices: { view: true, edit: true, create: true, delete: false, void: false },
          installations: { view: true, edit: true, create: true, complete: true },
          inventory: { view: true, edit: true, grn: true, adjust: true, transfer: true },
          finance: { view: true, edit: true, payments: true, refunds: false },
          reports: { view: true, export: true },
          settings: { view: true, edit: true }
        }
      }
    }
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Manage day-to-day operations, approve quotes',
    level: 70,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: true, delete: false, admin: false },
        tabs: {
          dashboard: { view: true, edit: false },
          products: { view: true, edit: true, create: true, delete: false },
          projects: { view: true, edit: true, create: true, delete: false },
          measurements: { view: true, edit: true, create: true },
          materials: { view: true, edit: true, create: true },
          quotes: { view: true, edit: true, create: true, delete: false, approve: true },
          challans: { view: true, edit: true, create: true, delete: false, dispatch: true, deliver: true },
          invoices: { view: true, edit: true, create: true, delete: false, void: false },
          installations: { view: true, edit: true, create: true, complete: true },
          inventory: { view: true, edit: true, grn: true, adjust: false, transfer: true },
          finance: { view: true, edit: false, payments: true, refunds: false },
          reports: { view: true, export: true },
          settings: { view: true, edit: false }
        }
      }
    }
  },
  sales_staff: {
    id: 'sales_staff',
    name: 'Sales Staff',
    description: 'Create quotes, manage customers, process orders',
    level: 50,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: true, delete: false, admin: false },
        tabs: {
          dashboard: { view: true, edit: false },
          products: { view: true, edit: false, create: false, delete: false },
          projects: { view: true, edit: true, create: true, delete: false },
          measurements: { view: true, edit: true, create: true },
          materials: { view: true, edit: true, create: true },
          quotes: { view: true, edit: true, create: true, delete: false, approve: false },
          challans: { view: true, edit: false, create: false, delete: false, dispatch: false, deliver: false },
          invoices: { view: true, edit: false, create: false, delete: false, void: false },
          installations: { view: true, edit: false, create: false, complete: false },
          inventory: { view: true, edit: false, grn: false, adjust: false, transfer: false },
          finance: { view: false, edit: false, payments: false, refunds: false },
          reports: { view: true, export: false },
          settings: { view: false, edit: false }
        }
      }
    }
  },
  warehouse_staff: {
    id: 'warehouse_staff',
    name: 'Warehouse Staff',
    description: 'Manage inventory, GRN, challans, transfers',
    level: 50,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: true, delete: false, admin: false },
        tabs: {
          dashboard: { view: true, edit: false },
          products: { view: true, edit: false, create: false, delete: false },
          projects: { view: false, edit: false, create: false, delete: false },
          measurements: { view: false, edit: false, create: false },
          materials: { view: false, edit: false, create: false },
          quotes: { view: false, edit: false, create: false, delete: false, approve: false },
          challans: { view: true, edit: true, create: true, delete: false, dispatch: true, deliver: true },
          invoices: { view: false, edit: false, create: false, delete: false, void: false },
          installations: { view: false, edit: false, create: false, complete: false },
          inventory: { view: true, edit: true, grn: true, adjust: false, transfer: true },
          finance: { view: false, edit: false, payments: false, refunds: false },
          reports: { view: true, export: false },
          settings: { view: false, edit: false }
        }
      }
    }
  },
  installer: {
    id: 'installer',
    name: 'Installer',
    description: 'View and update installation tasks',
    level: 30,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: false, delete: false, admin: false },
        tabs: {
          dashboard: { view: true, edit: false },
          products: { view: true, edit: false, create: false, delete: false },
          projects: { view: true, edit: false, create: false, delete: false },
          measurements: { view: true, edit: false, create: false },
          materials: { view: true, edit: false, create: false },
          quotes: { view: false, edit: false, create: false, delete: false, approve: false },
          challans: { view: true, edit: false, create: false, delete: false, dispatch: false, deliver: false },
          invoices: { view: false, edit: false, create: false, delete: false, void: false },
          installations: { view: true, edit: true, create: false, complete: true },
          inventory: { view: false, edit: false, grn: false, adjust: false, transfer: false },
          finance: { view: false, edit: false, payments: false, refunds: false },
          reports: { view: false, export: false },
          settings: { view: false, edit: false }
        }
      }
    }
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to allowed sections',
    level: 10,
    isSystem: true,
    permissions: {
      flooring: {
        module: { view: true, edit: false, delete: false, admin: false },
        tabs: {
          dashboard: { view: true, edit: false },
          products: { view: true, edit: false, create: false, delete: false },
          projects: { view: true, edit: false, create: false, delete: false },
          measurements: { view: true, edit: false, create: false },
          materials: { view: true, edit: false, create: false },
          quotes: { view: true, edit: false, create: false, delete: false, approve: false },
          challans: { view: true, edit: false, create: false, delete: false, dispatch: false, deliver: false },
          invoices: { view: true, edit: false, create: false, delete: false, void: false },
          installations: { view: true, edit: false, create: false, complete: false },
          inventory: { view: true, edit: false, grn: false, adjust: false, transfer: false },
          finance: { view: true, edit: false, payments: false, refunds: false },
          reports: { view: true, export: false },
          settings: { view: false, edit: false }
        }
      }
    }
  }
}

// GET - Fetch roles, user assignments, or check permissions
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'roles'
    const userId = searchParams.get('userId')
    const tab = searchParams.get('tab')
    const permission = searchParams.get('permission')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rolesCollection = db.collection('flooring_roles')
    const userRolesCollection = db.collection('flooring_user_roles')
    
    // Get main CRM database for users (single source of truth)
    const mainDb = await getMainDb()
    const crmUsersCollection = mainDb.collection('users')

    switch (action) {
      case 'roles':
        // Get all roles (system + custom)
        const customRoles = await rolesCollection.find({}).toArray()
        const allRoles = [
          ...Object.values(DEFAULT_ROLES),
          ...customRoles.filter(r => !r.isSystem)
        ]
        return successResponse({ roles: sanitizeDocuments(allRoles), defaultRoles: DEFAULT_ROLES })

      case 'users':
        // Get users from CRM (main database) filtered by clientId
        // This ensures CRM is the single source of truth for users
        const crmQuery = user.clientId ? { clientId: user.clientId } : {}
        const crmUsers = await crmUsersCollection.find(crmQuery).toArray()
        const userRoles = await userRolesCollection.find({}).toArray()
        const customRolesForUsers = await rolesCollection.find({}).toArray()
        
        const usersWithRoles = crmUsers.map(u => {
          const roleAssignment = userRoles.find(ur => ur.userId === u.id)
          const role = roleAssignment ? 
            (DEFAULT_ROLES[roleAssignment.roleId] || customRolesForUsers.find(r => r.id === roleAssignment.roleId)) : 
            null
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role, // CRM role
            status: u.status,
            createdAt: u.createdAt,
            // Flooring module role assignment
            flooringRoleId: roleAssignment?.roleId,
            flooringRoleName: role?.name,
            flooringRoleLevel: role?.level,
            assignedAt: roleAssignment?.assignedAt,
            assignedBy: roleAssignment?.assignedBy
          }
        })

        return successResponse({ 
          users: sanitizeDocuments(usersWithRoles),
          summary: {
            total: crmUsers.length,
            withRoles: userRoles.length,
            withoutRoles: crmUsers.length - userRoles.filter(ur => crmUsers.some(u => u.id === ur.userId)).length,
            byRole: Object.keys(DEFAULT_ROLES).reduce((acc, roleId) => {
              acc[roleId] = userRoles.filter(ur => ur.roleId === roleId).length
              return acc
            }, {})
          }
        })

      case 'check_permission':
        // Check if user has specific permission
        if (!userId || !tab || !permission) {
          return errorResponse('userId, tab, and permission required', 400)
        }

        const userRole = await userRolesCollection.findOne({ userId })
        if (!userRole) {
          return successResponse({ hasPermission: false, reason: 'No role assigned' })
        }

        const roleConfig = DEFAULT_ROLES[userRole.roleId] || await rolesCollection.findOne({ id: userRole.roleId })
        if (!roleConfig) {
          return successResponse({ hasPermission: false, reason: 'Role not found' })
        }

        const tabPermissions = roleConfig.permissions?.flooring?.tabs?.[tab]
        const hasPermission = tabPermissions?.[permission] === true

        return successResponse({ 
          hasPermission, 
          roleId: userRole.roleId,
          roleName: roleConfig.name,
          tabPermissions
        })

      case 'my_permissions':
        // Get current user's permissions
        const myRole = await userRolesCollection.findOne({ userId: user.id })
        if (!myRole) {
          return successResponse({ 
            permissions: null, 
            message: 'No role assigned - contact admin' 
          })
        }

        const myRoleConfig = DEFAULT_ROLES[myRole.roleId] || await rolesCollection.findOne({ id: myRole.roleId })
        return successResponse({
          roleId: myRole.roleId,
          roleName: myRoleConfig?.name,
          roleLevel: myRoleConfig?.level,
          permissions: myRoleConfig?.permissions?.flooring,
          assignedAt: myRole.assignedAt
        })

      case 'audit_log':
        // Get permission change audit log
        const auditLog = db.collection('flooring_access_audit')
        const logs = await auditLog.find({}).sort({ createdAt: -1 }).limit(100).toArray()
        return successResponse({ logs: sanitizeDocuments(logs) })

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Access Management GET Error:', error)
    return errorResponse('Failed to fetch access data', 500, error.message)
  }
}

// POST - Assign role to user or create custom role
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rolesCollection = db.collection('flooring_roles')
    const userRolesCollection = db.collection('flooring_user_roles')
    const auditLog = db.collection('flooring_access_audit')

    const now = new Date().toISOString()

    switch (action) {
      case 'assign_role':
        const { userId, roleId } = body
        if (!userId || !roleId) {
          return errorResponse('userId and roleId required', 400)
        }

        // Verify role exists
        const roleExists = DEFAULT_ROLES[roleId] || await rolesCollection.findOne({ id: roleId })
        if (!roleExists) {
          return errorResponse('Role not found', 404)
        }

        // Check if user already has a role
        const existingAssignment = await userRolesCollection.findOne({ userId })
        
        if (existingAssignment) {
          // Update existing assignment
          await userRolesCollection.updateOne(
            { userId },
            { 
              $set: { 
                roleId, 
                updatedAt: now, 
                updatedBy: user.id,
                previousRoleId: existingAssignment.roleId
              } 
            }
          )
        } else {
          // Create new assignment
          await userRolesCollection.insertOne({
            id: uuidv4(),
            userId,
            roleId,
            assignedAt: now,
            assignedBy: user.id,
            assignedByName: user.name || user.email
          })
        }

        // Audit log
        await auditLog.insertOne({
          id: uuidv4(),
          action: existingAssignment ? 'role_changed' : 'role_assigned',
          targetUserId: userId,
          previousRoleId: existingAssignment?.roleId,
          newRoleId: roleId,
          performedBy: user.id,
          performedByName: user.name || user.email,
          createdAt: now
        })

        return successResponse({ message: 'Role assigned successfully' }, 201)

      case 'create_role':
        const { name, description, permissions, baseRole } = body
        if (!name) {
          return errorResponse('Role name required', 400)
        }

        // Start with base role permissions if specified
        let rolePermissions = permissions
        if (baseRole && DEFAULT_ROLES[baseRole]) {
          rolePermissions = { ...DEFAULT_ROLES[baseRole].permissions, ...permissions }
        }

        const newRole = {
          id: uuidv4(),
          name,
          description,
          level: body.level || 40,
          isSystem: false,
          isCustom: true,
          permissions: rolePermissions,
          createdBy: user.id,
          createdByName: user.name || user.email,
          createdAt: now
        }

        await rolesCollection.insertOne(newRole)

        // Audit log
        await auditLog.insertOne({
          id: uuidv4(),
          action: 'role_created',
          roleId: newRole.id,
          roleName: name,
          performedBy: user.id,
          performedByName: user.name || user.email,
          createdAt: now
        })

        return successResponse({ message: 'Role created', role: sanitizeDocument(newRole) }, 201)

      case 'sync_from_crm':
        // Sync users from CRM (users collection is the source)
        const usersCollection = db.collection('users')
        const crmUsers = await usersCollection.find({}).toArray()
        
        // Get existing role assignments
        const existingAssignments = await userRolesCollection.find({}).toArray()
        const assignedUserIds = existingAssignments.map(a => a.userId)
        
        // Find users without role assignments
        const unassignedUsers = crmUsers.filter(u => !assignedUserIds.includes(u.id))
        
        // Optionally auto-assign default role to unassigned users
        if (body.autoAssignRole) {
          const defaultRoleId = body.defaultRoleId || 'viewer'
          for (const u of unassignedUsers) {
            await userRolesCollection.insertOne({
              id: uuidv4(),
              userId: u.id,
              roleId: defaultRoleId,
              assignedAt: now,
              assignedBy: user.id,
              assignedByName: user.name || user.email,
              autoAssigned: true
            })
          }
        }

        return successResponse({
          message: 'Sync complete',
          totalUsers: crmUsers.length,
          assignedUsers: assignedUserIds.length,
          unassignedUsers: unassignedUsers.length,
          newlyAssigned: body.autoAssignRole ? unassignedUsers.length : 0
        })

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Access Management POST Error:', error)
    return errorResponse('Failed to process request', 500, error.message)
  }
}

// PUT - Update role or permissions
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, roleId, userId } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rolesCollection = db.collection('flooring_roles')
    const userRolesCollection = db.collection('flooring_user_roles')
    const auditLog = db.collection('flooring_access_audit')

    const now = new Date().toISOString()

    switch (action) {
      case 'update_role':
        if (!roleId) return errorResponse('Role ID required', 400)
        
        // Cannot update system roles
        if (DEFAULT_ROLES[roleId]) {
          return errorResponse('Cannot modify system roles', 400)
        }

        const existingRole = await rolesCollection.findOne({ id: roleId })
        if (!existingRole) return errorResponse('Role not found', 404)

        const updateData = {}
        if (body.name) updateData.name = body.name
        if (body.description) updateData.description = body.description
        if (body.level) updateData.level = body.level
        if (body.permissions) updateData.permissions = body.permissions
        updateData.updatedAt = now
        updateData.updatedBy = user.id

        await rolesCollection.updateOne({ id: roleId }, { $set: updateData })

        // Audit log
        await auditLog.insertOne({
          id: uuidv4(),
          action: 'role_updated',
          roleId,
          changes: updateData,
          performedBy: user.id,
          performedByName: user.name || user.email,
          createdAt: now
        })

        return successResponse({ message: 'Role updated' })

      case 'revoke_role':
        if (!userId) return errorResponse('User ID required', 400)

        const assignment = await userRolesCollection.findOne({ userId })
        if (!assignment) return errorResponse('No role assigned to user', 404)

        await userRolesCollection.deleteOne({ userId })

        // Audit log
        await auditLog.insertOne({
          id: uuidv4(),
          action: 'role_revoked',
          targetUserId: userId,
          previousRoleId: assignment.roleId,
          performedBy: user.id,
          performedByName: user.name || user.email,
          createdAt: now
        })

        return successResponse({ message: 'Role revoked' })

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Access Management PUT Error:', error)
    return errorResponse('Failed to update', 500, error.message)
  }
}

// DELETE - Delete custom role
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) return errorResponse('Role ID required', 400)

    // Cannot delete system roles
    if (DEFAULT_ROLES[roleId]) {
      return errorResponse('Cannot delete system roles', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const rolesCollection = db.collection('flooring_roles')
    const userRolesCollection = db.collection('flooring_user_roles')
    const auditLog = db.collection('flooring_access_audit')

    const role = await rolesCollection.findOne({ id: roleId })
    if (!role) return errorResponse('Role not found', 404)

    // Check if any users have this role
    const usersWithRole = await userRolesCollection.countDocuments({ roleId })
    if (usersWithRole > 0) {
      return errorResponse(`Cannot delete role - ${usersWithRole} users have this role`, 400)
    }

    await rolesCollection.deleteOne({ id: roleId })

    // Audit log
    await auditLog.insertOne({
      id: uuidv4(),
      action: 'role_deleted',
      roleId,
      roleName: role.name,
      performedBy: user.id,
      performedByName: user.name || user.email,
      createdAt: new Date().toISOString()
    })

    return successResponse({ message: 'Role deleted' })
  } catch (error) {
    console.error('Access Management DELETE Error:', error)
    return errorResponse('Failed to delete role', 500, error.message)
  }
}
