import { v4 as uuidv4 } from 'uuid'
import { getMainDb, getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get all available permissions and roles for the organization
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    // Define system-level permissions
    const systemPermissions = {
      modules: [
        { id: 'dashboard', name: 'Dashboard', description: 'Access to main dashboard and analytics' },
        { id: 'leads', name: 'Leads', description: 'Lead management and conversion' },
        { id: 'contacts', name: 'Contacts', description: 'Contact management' },
        { id: 'projects', name: 'Projects', description: 'Project management' },
        { id: 'tasks', name: 'Tasks', description: 'Task management' },
        { id: 'expenses', name: 'Expenses', description: 'Expense tracking and approval' },
        { id: 'calendar', name: 'Calendar & Notes', description: 'Calendar and note management' },
        { id: 'teams', name: 'Teams Hub', description: 'Team collaboration features' },
        { id: 'reports', name: 'Reports', description: 'View and generate reports' },
        { id: 'users', name: 'User Management', description: 'Manage users and permissions' },
        { id: 'settings', name: 'Settings', description: 'Organization settings' },
        { id: 'integrations', name: 'Integrations', description: 'Manage third-party integrations' },
        { id: 'billing', name: 'Billing', description: 'View and manage billing' },
      ],
      actions: [
        { id: 'view', name: 'View', description: 'Can view data' },
        { id: 'create', name: 'Create', description: 'Can create new records' },
        { id: 'edit', name: 'Edit', description: 'Can edit existing records' },
        { id: 'delete', name: 'Delete', description: 'Can delete records' },
        { id: 'export', name: 'Export', description: 'Can export data' },
        { id: 'approve', name: 'Approve', description: 'Can approve requests/items' },
        { id: 'assign', name: 'Assign', description: 'Can assign to others' },
      ],
      dataAccess: [
        { id: 'own', name: 'Own Data Only', description: 'Can only access own created data' },
        { id: 'team', name: 'Team Data', description: 'Can access team members data' },
        { id: 'department', name: 'Department Data', description: 'Can access department data' },
        { id: 'all', name: 'All Organization Data', description: 'Can access all organization data' },
      ]
    }

    // Define predefined roles
    const predefinedRoles = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full access to all features and settings',
        color: '#dc2626',
        permissions: {
          modules: systemPermissions.modules.map(m => m.id),
          actions: systemPermissions.actions.map(a => a.id),
          dataAccess: 'all'
        },
        isSystem: true
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Team management with reporting access',
        color: '#7c3aed',
        permissions: {
          modules: ['dashboard', 'leads', 'contacts', 'projects', 'tasks', 'expenses', 'calendar', 'teams', 'reports'],
          actions: ['view', 'create', 'edit', 'assign', 'approve', 'export'],
          dataAccess: 'team'
        },
        isSystem: true
      },
      {
        id: 'sales_rep',
        name: 'Sales Representative',
        description: 'Lead and contact management focus',
        color: '#2563eb',
        permissions: {
          modules: ['dashboard', 'leads', 'contacts', 'tasks', 'calendar'],
          actions: ['view', 'create', 'edit'],
          dataAccess: 'own'
        },
        isSystem: true
      },
      {
        id: 'project_manager',
        name: 'Project Manager',
        description: 'Project and task management focus',
        color: '#059669',
        permissions: {
          modules: ['dashboard', 'projects', 'tasks', 'expenses', 'calendar', 'teams', 'reports'],
          actions: ['view', 'create', 'edit', 'assign', 'export'],
          dataAccess: 'team'
        },
        isSystem: true
      },
      {
        id: 'accountant',
        name: 'Accountant',
        description: 'Financial and expense management',
        color: '#ca8a04',
        permissions: {
          modules: ['dashboard', 'expenses', 'reports', 'billing'],
          actions: ['view', 'create', 'edit', 'approve', 'export'],
          dataAccess: 'all'
        },
        isSystem: true
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to allowed modules',
        color: '#64748b',
        permissions: {
          modules: ['dashboard'],
          actions: ['view'],
          dataAccess: 'own'
        },
        isSystem: true
      }
    ]

    // Get custom roles from database
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const customRolesCollection = db.collection('custom_roles')
    const customRoles = await customRolesCollection.find({}).toArray()

    return successResponse({
      systemPermissions,
      predefinedRoles,
      customRoles: customRoles.map(r => ({ ...r, _id: undefined }))
    })
  } catch (error) {
    console.error('Permissions GET API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to fetch permissions', 500, error.message)
  }
}

// Create a custom role
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    // Only admins can create custom roles
    if (user.role !== 'admin') {
      return errorResponse('Only administrators can create custom roles', 403)
    }

    const body = await request.json()
    
    if (!body.name) {
      return errorResponse('Role name is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const customRolesCollection = db.collection('custom_roles')

    // Check if role name exists
    const existing = await customRolesCollection.findOne({ name: body.name })
    if (existing) {
      return errorResponse('Role with this name already exists', 400)
    }

    const newRole = {
      id: uuidv4(),
      name: body.name,
      description: body.description || '',
      color: body.color || '#6366f1',
      permissions: {
        modules: body.permissions?.modules || [],
        actions: body.permissions?.actions || ['view'],
        dataAccess: body.permissions?.dataAccess || 'own'
      },
      isSystem: false,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await customRolesCollection.insertOne(newRole)

    return successResponse({ ...newRole, _id: undefined }, 201)
  } catch (error) {
    console.error('Custom Role POST API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to create custom role', 500, error.message)
  }
}
