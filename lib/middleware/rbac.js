/**
 * =====================================================
 * FLOORING MODULE - RBAC MIDDLEWARE
 * =====================================================
 * 
 * Role-Based Access Control enforcement for API endpoints.
 * Use this middleware to protect endpoints based on user roles.
 */

import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, getUserDatabaseName } from '@/lib/utils/auth'
import { errorResponse } from '@/lib/utils/response'
import { COLLECTIONS } from '@/lib/db/flooring-collections'

/**
 * Default role definitions with permissions
 */
export const ROLES = {
  super_admin: {
    level: 100,
    permissions: ['*'] // All permissions
  },
  client_admin: {
    level: 90,
    permissions: ['manage_users', 'manage_settings', 'manage_inventory', 'manage_orders', 'view_reports']
  },
  manager: {
    level: 70,
    permissions: ['manage_inventory', 'manage_orders', 'approve_quotes', 'view_reports']
  },
  sales: {
    level: 50,
    permissions: ['create_quotes', 'manage_customers', 'view_inventory']
  },
  warehouse: {
    level: 50,
    permissions: ['manage_inventory', 'manage_challans', 'manage_grn']
  },
  installer: {
    level: 30,
    permissions: ['view_installations', 'update_installation_status']
  },
  viewer: {
    level: 10,
    permissions: ['view_only']
  }
}

/**
 * Permission definitions for endpoints
 */
export const PERMISSIONS = {
  // Products
  'products.view': ['*', 'manage_inventory', 'view_inventory', 'view_only'],
  'products.create': ['*', 'manage_inventory'],
  'products.edit': ['*', 'manage_inventory'],
  'products.delete': ['*', 'manage_inventory'],

  // Inventory
  'stock.view': ['*', 'manage_inventory', 'view_inventory', 'view_only'],
  'stock.adjust': ['*', 'manage_inventory'],
  'grn.view': ['*', 'manage_inventory', 'manage_grn', 'view_inventory', 'view_only'],
  'grn.create': ['*', 'manage_inventory', 'manage_grn'],
  'grn.receive': ['*', 'manage_inventory', 'manage_grn'],
  'ledger.view': ['*', 'manage_inventory', 'view_reports', 'view_only'],

  // Challans
  'challans.view': ['*', 'manage_orders', 'manage_challans', 'view_only'],
  'challans.create': ['*', 'manage_orders', 'manage_challans'],
  'challans.dispatch': ['*', 'manage_orders', 'manage_challans'],
  'challans.deliver': ['*', 'manage_orders', 'manage_challans'],

  // Invoices
  'invoices.view': ['*', 'manage_orders', 'view_reports', 'view_only'],
  'invoices.create': ['*', 'manage_orders'],
  'invoices.edit': ['*', 'manage_orders'],
  'invoices.void': ['*', 'manage_orders'],

  // Quotes
  'quotes.view': ['*', 'manage_orders', 'create_quotes', 'approve_quotes', 'view_only'],
  'quotes.create': ['*', 'manage_orders', 'create_quotes'],
  'quotes.edit': ['*', 'manage_orders', 'create_quotes'],
  'quotes.approve': ['*', 'manage_orders', 'approve_quotes'],
  'quotes.convert': ['*', 'manage_orders', 'approve_quotes'],

  // Customers
  'customers.view': ['*', 'manage_customers', 'create_quotes', 'view_only'],
  'customers.create': ['*', 'manage_customers', 'create_quotes'],
  'customers.edit': ['*', 'manage_customers'],

  // Installations
  'installations.view': ['*', 'manage_orders', 'view_installations', 'view_only'],
  'installations.create': ['*', 'manage_orders'],
  'installations.update': ['*', 'manage_orders', 'update_installation_status'],

  // Reports
  'reports.view': ['*', 'view_reports', 'view_only'],
  'reports.export': ['*', 'view_reports'],

  // Settings
  'settings.view': ['*', 'manage_settings', 'view_only'],
  'settings.edit': ['*', 'manage_settings'],

  // Access Management
  'access.view': ['*', 'manage_users'],
  'access.manage': ['*', 'manage_users'],

  // System
  'system.admin': ['*']
}

/**
 * Get user's flooring module role from database
 */
export async function getUserFlooringRole(user) {
  try {
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const userRolesCollection = db.collection(COLLECTIONS.USER_ROLES)
    
    const assignment = await userRolesCollection.findOne({ userId: user.id })
    if (!assignment) {
      // Check if user has a CRM role that maps to flooring role
      if (user.role === 'super_admin' || user.role === 'admin') {
        return 'super_admin'
      }
      // Default to viewer for authenticated users without specific role
      return 'viewer'
    }
    
    return assignment.roleId
  } catch (error) {
    console.error('Error getting user flooring role:', error)
    return 'viewer' // Fail safe to lowest permission
  }
}

/**
 * Get user's effective permissions
 */
export async function getUserPermissions(user) {
  const roleId = await getUserFlooringRole(user)
  const role = ROLES[roleId]
  
  if (!role) {
    return ['view_only']
  }
  
  return role.permissions
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(user, requiredPermission) {
  const userPermissions = await getUserPermissions(user)
  
  // Super admin has all permissions
  if (userPermissions.includes('*')) {
    return true
  }
  
  // Check if permission is granted
  const allowedUserPermissions = PERMISSIONS[requiredPermission] || []
  
  for (const perm of userPermissions) {
    if (allowedUserPermissions.includes(perm)) {
      return true
    }
  }
  
  return false
}

/**
 * RBAC middleware factory
 * Usage: await checkPermission(request, 'products.create')
 */
export async function checkPermission(request, requiredPermission) {
  const user = getAuthUser(request)
  
  if (!user || !user.id) {
    return {
      authorized: false,
      error: errorResponse('Unauthorized', 401)
    }
  }
  
  const permitted = await hasPermission(user, requiredPermission)
  
  if (!permitted) {
    return {
      authorized: false,
      error: errorResponse(`Access denied. Required permission: ${requiredPermission}`, 403)
    }
  }
  
  return {
    authorized: true,
    user,
    roleId: await getUserFlooringRole(user)
  }
}

/**
 * Require specific minimum role level
 */
export async function requireRoleLevel(request, minLevel) {
  const user = getAuthUser(request)
  
  if (!user || !user.id) {
    return {
      authorized: false,
      error: errorResponse('Unauthorized', 401)
    }
  }
  
  const roleId = await getUserFlooringRole(user)
  const role = ROLES[roleId]
  
  if (!role || role.level < minLevel) {
    return {
      authorized: false,
      error: errorResponse(`Access denied. Minimum role level required: ${minLevel}`, 403)
    }
  }
  
  return {
    authorized: true,
    user,
    roleId,
    roleLevel: role.level
  }
}

/**
 * Log access attempt for audit
 */
export async function logAccess(user, action, resource, result) {
  try {
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const auditCollection = db.collection(COLLECTIONS.ACCESS_AUDIT)
    
    await auditCollection.insertOne({
      id: uuidv4(),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action,
      resource,
      result,
      timestamp: new Date().toISOString(),
      ip: user.ip || 'unknown',
      userAgent: user.userAgent || 'unknown'
    })
  } catch (error) {
    console.error('Failed to log access:', error)
  }
}

export default {
  ROLES,
  PERMISSIONS,
  getUserFlooringRole,
  getUserPermissions,
  hasPermission,
  checkPermission,
  requireRoleLevel,
  logAccess
}
