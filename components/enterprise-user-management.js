'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SafeButton } from '@/components/ui/safe-button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Users, UserPlus, Shield, Settings, Search, Filter, MoreHorizontal,
  Edit, Trash2, Eye, Mail, Phone, Calendar, Clock, CheckCircle2,
  AlertTriangle, Loader2, Crown, UserCog, Lock, Unlock, Key,
  Building2, Activity, BarChart3, RefreshCw, Download, Upload,
  Copy, ChevronRight, ChevronDown, X, Check, Save, History,
  Globe, Database, Folder, FileText, DollarSign, MessageSquare,
  Briefcase, Target, ClipboardList, Layers, Zap, UserCheck, UserX,
  ShieldCheck, ShieldAlert, ShieldOff, Plus, Minus, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { validateEmail, validatePhone, validatePassword, validateName } from '@/lib/utils/validation'
import { PasswordStrengthIndicator } from '@/components/ui/validated-input'
import { PhoneInput } from '@/components/ui/phone-input'

const GlassCard = ({ children, className = '', ...props }) => (
  <div className={`backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl rounded-xl ${className}`} {...props}>
    {children}
  </div>
)

// Module icons mapping
const MODULE_ICONS = {
  dashboard: BarChart3,
  leads: Target,
  contacts: Users,
  projects: Briefcase,
  tasks: ClipboardList,
  expenses: DollarSign,
  calendar: Calendar,
  teams: MessageSquare,
  reports: FileText,
  users: UserCog,
  settings: Settings,
  integrations: Zap,
  billing: DollarSign
}

// Status configurations
const USER_STATUSES = [
  { id: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: UserCheck },
  { id: 'inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-700', icon: UserX },
  { id: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { id: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-700', icon: ShieldOff }
]

export function EnterpriseUserManagement({ authToken, currentUser, onRefresh }) {
  // Main state
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Permissions data
  const [systemPermissions, setSystemPermissions] = useState(null)
  const [predefinedRoles, setPredefinedRoles] = useState([])
  const [customRoles, setCustomRoles] = useState([])
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('users')
  
  // Dialog state
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  
  // Form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales_rep',
    status: 'active',
    phone: '',
    department: '',
    permissions: {
      modules: [],
      actions: ['view'],
      dataAccess: 'own'
    },
    customPermissions: false
  })
  
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    permissions: {
      modules: [],
      actions: ['view'],
      dataAccess: 'own'
    }
  })

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }), [authToken])

  // Fetch all data
  useEffect(() => {
    fetchUsers()
    fetchPermissions()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users', { headers })
      const data = await res.json()
      if (Array.isArray(data)) {
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/users/permissions', { headers })
      const data = await res.json()
      if (data.systemPermissions) {
        setSystemPermissions(data.systemPermissions)
        setPredefinedRoles(data.predefinedRoles || [])
        setCustomRoles(data.customRoles || [])
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  // Validation state
  const [formErrors, setFormErrors] = useState({})

  // Validate user form
  const validateUserForm = (isUpdate = false) => {
    const errors = {}
    
    // Name validation
    const nameResult = validateName(userForm.name, { required: true, fieldName: 'Full Name' })
    if (!nameResult.valid) errors.name = nameResult.error
    
    // Email validation (only for new users)
    if (!isUpdate) {
      const emailResult = validateEmail(userForm.email, true)
      if (!emailResult.valid) errors.email = emailResult.error
    }
    
    // Password validation
    if (!isUpdate || userForm.password) {
      const passwordResult = validatePassword(userForm.password, {
        minLength: 8,
        requireUppercase: true,
        requireNumber: true
      })
      if (!passwordResult.valid) errors.password = passwordResult.error
    }
    
    // Phone validation (optional)
    if (userForm.phone) {
      const phoneResult = validatePhone(userForm.phone, false)
      if (!phoneResult.valid) errors.phone = phoneResult.error
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // User CRUD operations
  const handleCreateUser = async () => {
    if (!validateUserForm(false)) {
      toast.error('Please fix the validation errors')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          status: userForm.status,
          phone: userForm.phone,
          department: userForm.department,
          permissions: userForm.customPermissions ? userForm.permissions : null
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('User created successfully')
        setShowUserDialog(false)
        resetUserForm()
        fetchUsers()
        onRefresh?.()
      } else {
        toast.error(data.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Create user error:', error)
      toast.error('Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser?.id) return
    
    if (!validateUserForm(true)) {
      toast.error('Please fix the validation errors')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: userForm.name,
          role: userForm.role,
          status: userForm.status,
          phone: userForm.phone,
          department: userForm.department,
          permissions: userForm.customPermissions ? userForm.permissions : null,
          ...(userForm.password && { password: userForm.password })
        })
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('User updated successfully')
        setShowUserDialog(false)
        resetUserForm()
        setSelectedUser(null)
        fetchUsers()
        onRefresh?.()
      } else {
        toast.error(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Update user error:', error)
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account')
      return
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('User deleted successfully')
        fetchUsers()
        onRefresh?.()
      } else {
        toast.error(data.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Delete user error:', error)
      toast.error('Failed to delete user')
    }
  }

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
        fetchUsers()
      }
    } catch (error) {
      console.error('Toggle status error:', error)
      toast.error('Failed to update user status')
    }
  }

  // Custom role operations
  const handleCreateRole = async () => {
    if (!roleForm.name) {
      toast.error('Role name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/users/permissions', {
        method: 'POST',
        headers,
        body: JSON.stringify(roleForm)
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Custom role created successfully')
        setShowRoleDialog(false)
        resetRoleForm()
        fetchPermissions()
      } else {
        toast.error(data.error || 'Failed to create role')
      }
    } catch (error) {
      console.error('Create role error:', error)
      toast.error('Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  // Form helpers
  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'sales_rep',
      status: 'active',
      phone: '',
      department: '',
      permissions: {
        modules: [],
        actions: ['view'],
        dataAccess: 'own'
      },
      customPermissions: false
    })
    setFormErrors({}) // Clear validation errors
  }

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      color: '#6366f1',
      permissions: {
        modules: [],
        actions: ['view'],
        dataAccess: 'own'
      }
    })
  }

  const openEditUser = (user) => {
    setSelectedUser(user)
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'sales_rep',
      status: user.status || 'active',
      phone: user.phone || '',
      department: user.department || '',
      permissions: user.permissions || {
        modules: [],
        actions: ['view'],
        dataAccess: 'own'
      },
      customPermissions: !!user.permissions
    })
    setShowUserDialog(true)
  }

  const openViewPermissions = (user) => {
    setSelectedUser(user)
    setShowPermissionDialog(true)
  }

  // Get effective permissions for a user
  const getEffectivePermissions = (user) => {
    if (user.permissions) {
      return user.permissions
    }
    const role = [...predefinedRoles, ...customRoles].find(r => r.id === user.role)
    return role?.permissions || { modules: [], actions: [], dataAccess: 'own' }
  }

  // Filter users
  const filteredUsers = useMemo(() => {
    let result = [...users]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(u =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.department?.toLowerCase().includes(query)
      )
    }
    
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter)
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(u => (u.status || 'active') === statusFilter)
    }
    
    return result
  }, [users, searchQuery, roleFilter, statusFilter])

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => (u.status || 'active') === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    newThisMonth: users.filter(u => {
      const created = new Date(u.createdAt)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length
  }), [users])

  // Get all available roles
  const allRoles = useMemo(() => [...predefinedRoles, ...customRoles], [predefinedRoles, customRoles])

  const getRoleInfo = (roleId) => allRoles.find(r => r.id === roleId) || { name: roleId, color: '#6366f1' }
  const getStatusInfo = (status) => USER_STATUSES.find(s => s.id === status) || USER_STATUSES[0]

  // Toggle permission
  const toggleModulePermission = (moduleId, formSetter, form) => {
    const modules = form.permissions.modules.includes(moduleId)
      ? form.permissions.modules.filter(m => m !== moduleId)
      : [...form.permissions.modules, moduleId]
    formSetter({ ...form, permissions: { ...form.permissions, modules } })
  }

  const toggleActionPermission = (actionId, formSetter, form) => {
    const actions = form.permissions.actions.includes(actionId)
      ? form.permissions.actions.filter(a => a !== actionId)
      : [...form.permissions.actions, actionId]
    formSetter({ ...form, permissions: { ...form.permissions, actions } })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-7 w-7 text-indigo-600" />
            User Management
          </h2>
          <p className="text-slate-500">Manage users, roles, and access permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { fetchUsers(); fetchPermissions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button 
            onClick={() => { resetUserForm(); setSelectedUser(null); setShowUserDialog(true); }} 
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            <UserPlus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total Users</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-indigo-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Active Users</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-emerald-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Administrators</p>
              <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
            </div>
            <Crown className="h-8 w-8 text-purple-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">New This Month</p>
              <p className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Roles ({allRoles.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" /> Permissions Matrix
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-6">
          {/* Filters */}
          <GlassCard className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {allRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {USER_STATUSES.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No users found</p>
            </GlassCard>
          ) : (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-600">User</th>
                      <th className="text-left p-4 font-medium text-slate-600">Role</th>
                      <th className="text-left p-4 font-medium text-slate-600">Status</th>
                      <th className="text-left p-4 font-medium text-slate-600">Data Access</th>
                      <th className="text-left p-4 font-medium text-slate-600">Modules</th>
                      <th className="text-center p-4 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, idx) => {
                      const roleInfo = getRoleInfo(user.role)
                      const statusInfo = getStatusInfo(user.status || 'active')
                      const permissions = getEffectivePermissions(user)
                      const isCurrentUser = user.id === currentUser?.id
                      
                      return (
                        <motion.tr
                          key={user.id}
                          className="border-b hover:bg-slate-50 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white">
                                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-800">{user.name}</p>
                                  {isCurrentUser && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">You</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color }}
                              className="font-medium"
                            >
                              {user.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                              {roleInfo.name}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={statusInfo.color}>
                              <statusInfo.icon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize">
                              <Database className="h-3 w-3 mr-1" />
                              {permissions.dataAccess}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-slate-600">
                                {permissions.modules?.length || 0} modules
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewPermissions(user)}
                                className="h-6 px-2"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user)}
                                disabled={isCurrentUser}
                              >
                                {(user.status || 'active') === 'active' 
                                  ? <Lock className="h-4 w-4 text-amber-600" />
                                  : <Unlock className="h-4 w-4 text-emerald-600" />
                                }
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={isCurrentUser}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              {predefinedRoles.length} system roles • {customRoles.length} custom roles
            </p>
            <Button onClick={() => { resetRoleForm(); setShowRoleDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Create Custom Role
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRoles.map((role, idx) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassCard className="p-5 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${role.color}20` }}
                      >
                        <Shield className="h-5 w-5" style={{ color: role.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{role.name}</h3>
                        {role.isSystem && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600">
                      {users.filter(u => u.role === role.id).length} users
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-4">{role.description}</p>
                  
                  {/* Quick permission summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Modules</span>
                      <Badge variant="outline">{role.permissions?.modules?.length || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Actions</span>
                      <Badge variant="outline">{role.permissions?.actions?.length || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Data Access</span>
                      <Badge variant="outline" className="capitalize">{role.permissions?.dataAccess}</Badge>
                    </div>
                  </div>
                  
                  {/* Module chips */}
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                    {role.permissions?.modules?.slice(0, 5).map(moduleId => {
                      const ModuleIcon = MODULE_ICONS[moduleId] || Folder
                      return (
                        <Badge key={moduleId} variant="secondary" className="text-xs">
                          <ModuleIcon className="h-3 w-3 mr-1" />
                          {moduleId}
                        </Badge>
                      )
                    })}
                    {(role.permissions?.modules?.length || 0) > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{role.permissions.modules.length - 5}
                      </Badge>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions" className="space-y-4 mt-6">
          <GlassCard className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Role Permissions Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-slate-600 sticky left-0 bg-white">Module</th>
                    {allRoles.map(role => (
                      <th key={role.id} className="text-center p-3 font-medium" style={{ color: role.color }}>
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {systemPermissions?.modules?.map(module => {
                    const ModuleIcon = MODULE_ICONS[module.id] || Folder
                    return (
                      <tr key={module.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 sticky left-0 bg-white">
                          <div className="flex items-center gap-2">
                            <ModuleIcon className="h-4 w-4 text-slate-500" />
                            <span>{module.name}</span>
                          </div>
                        </td>
                        {allRoles.map(role => {
                          const hasAccess = role.permissions?.modules?.includes(module.id)
                          return (
                            <td key={role.id} className="text-center p-3">
                              {hasAccess ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-slate-300 mx-auto" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Data Access Comparison */}
          <GlassCard className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Data Access Levels
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {systemPermissions?.dataAccess?.map((level, idx) => (
                <div key={level.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      level.id === 'own' ? 'bg-blue-500' :
                      level.id === 'team' ? 'bg-purple-500' :
                      level.id === 'department' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="font-medium">{level.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">{level.description}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {allRoles.filter(r => r.permissions?.dataAccess === level.id).length} roles
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* User Create/Edit Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Update user details and permissions' : 'Create a new user with role-based access'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">User Details</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={formErrors.name ? 'text-red-600' : ''}>Full Name *</Label>
                  <Input
                    value={userForm.name}
                    onChange={(e) => {
                      setUserForm({ ...userForm, name: e.target.value })
                      if (formErrors.name) setFormErrors({ ...formErrors, name: null })
                    }}
                    onBlur={() => {
                      const result = validateName(userForm.name, { required: true, fieldName: 'Full Name' })
                      if (!result.valid) setFormErrors({ ...formErrors, name: result.error })
                    }}
                    placeholder="John Doe"
                    className={formErrors.name ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={formErrors.email ? 'text-red-600' : ''}>Email *</Label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => {
                      setUserForm({ ...userForm, email: e.target.value })
                      if (formErrors.email) setFormErrors({ ...formErrors, email: null })
                    }}
                    onBlur={() => {
                      if (!selectedUser) {
                        const result = validateEmail(userForm.email, true)
                        if (!result.valid) setFormErrors({ ...formErrors, email: result.error })
                      }
                    }}
                    placeholder="john@example.com"
                    disabled={!!selectedUser}
                    className={formErrors.email ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={formErrors.password ? 'text-red-600' : ''}>
                    {selectedUser ? 'New Password (leave blank to keep)' : 'Password *'}
                  </Label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => {
                      setUserForm({ ...userForm, password: e.target.value })
                      if (formErrors.password) setFormErrors({ ...formErrors, password: null })
                    }}
                    onBlur={() => {
                      if (!selectedUser || userForm.password) {
                        const result = validatePassword(userForm.password, {
                          minLength: 8,
                          requireUppercase: true,
                          requireNumber: true
                        })
                        if (!result.valid) setFormErrors({ ...formErrors, password: result.error })
                      }
                    }}
                    placeholder="••••••••"
                    className={formErrors.password ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  {formErrors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.password}
                    </p>
                  )}
                  {!selectedUser && userForm.password && <PasswordStrengthIndicator password={userForm.password} />}
                </div>
                <PhoneInput
                  label="Phone"
                  name="phone"
                  value={userForm.phone}
                  onChange={(e) => {
                    setUserForm({ ...userForm, phone: e.target.value })
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: null })
                  }}
                  onBlur={() => {
                    if (userForm.phone) {
                      const result = validatePhone(userForm.phone, false)
                      if (!result.valid) setFormErrors({ ...formErrors, phone: result.error })
                    }
                  }}
                  error={formErrors.phone}
                  touched={!!formErrors.phone}
                  defaultCountry="IN"
                />
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                            {role.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={userForm.status} onValueChange={(v) => setUserForm({ ...userForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_STATUSES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    placeholder="Sales, Marketing, Operations..."
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">Use Custom Permissions</p>
                  <p className="text-sm text-slate-500">Override role-based permissions with custom settings</p>
                </div>
                <Switch
                  checked={userForm.customPermissions}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, customPermissions: checked })}
                />
              </div>
              
              {userForm.customPermissions ? (
                <div className="space-y-4">
                  {/* Module Permissions */}
                  <div>
                    <Label className="mb-3 block">Module Access</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {systemPermissions?.modules?.map(module => {
                        const ModuleIcon = MODULE_ICONS[module.id] || Folder
                        const isChecked = userForm.permissions.modules.includes(module.id)
                        return (
                          <div
                            key={module.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white hover:bg-slate-50'
                            }`}
                            onClick={() => toggleModulePermission(module.id, setUserForm, userForm)}
                          >
                            <Checkbox checked={isChecked} />
                            <ModuleIcon className="h-4 w-4 text-slate-500" />
                            <span className="text-sm">{module.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Action Permissions */}
                  <div>
                    <Label className="mb-3 block">Allowed Actions</Label>
                    <div className="flex flex-wrap gap-2">
                      {systemPermissions?.actions?.map(action => {
                        const isChecked = userForm.permissions.actions.includes(action.id)
                        return (
                          <Badge
                            key={action.id}
                            variant={isChecked ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleActionPermission(action.id, setUserForm, userForm)}
                          >
                            {isChecked && <Check className="h-3 w-3 mr-1" />}
                            {action.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Data Access Level */}
                  <div>
                    <Label className="mb-3 block">Data Access Level</Label>
                    <Select 
                      value={userForm.permissions.dataAccess} 
                      onValueChange={(v) => setUserForm({ 
                        ...userForm, 
                        permissions: { ...userForm.permissions, dataAccess: v }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {systemPermissions?.dataAccess?.map(level => (
                          <SelectItem key={level.id} value={level.id}>
                            <div>
                              <p className="font-medium">{level.name}</p>
                              <p className="text-xs text-slate-500">{level.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    This user will inherit permissions from their assigned role: <strong>{getRoleInfo(userForm.role).name}</strong>
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <SafeButton 
              onClick={selectedUser ? handleUpdateUser : handleCreateUser}
            >
              <Save className="h-4 w-4 mr-2" /> {selectedUser ? 'Update User' : 'Create User'}
            </SafeButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>Define a new role with specific permissions</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., Team Lead"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'].map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${roleForm.color === color ? 'border-slate-800' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setRoleForm({ ...roleForm, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Brief description of this role..."
                rows={2}
              />
            </div>
            
            <Separator />
            
            {/* Module Permissions */}
            <div>
              <Label className="mb-3 block">Module Access</Label>
              <div className="grid grid-cols-2 gap-2">
                {systemPermissions?.modules?.map(module => {
                  const ModuleIcon = MODULE_ICONS[module.id] || Folder
                  const isChecked = roleForm.permissions.modules.includes(module.id)
                  return (
                    <div
                      key={module.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => toggleModulePermission(module.id, setRoleForm, roleForm)}
                    >
                      <Checkbox checked={isChecked} />
                      <ModuleIcon className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">{module.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Action Permissions */}
            <div>
              <Label className="mb-3 block">Allowed Actions</Label>
              <div className="flex flex-wrap gap-2">
                {systemPermissions?.actions?.map(action => {
                  const isChecked = roleForm.permissions.actions.includes(action.id)
                  return (
                    <Badge
                      key={action.id}
                      variant={isChecked ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleActionPermission(action.id, setRoleForm, roleForm)}
                    >
                      {isChecked && <Check className="h-3 w-3 mr-1" />}
                      {action.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
            
            {/* Data Access */}
            <div>
              <Label className="mb-3 block">Data Access Level</Label>
              <Select 
                value={roleForm.permissions.dataAccess} 
                onValueChange={(v) => setRoleForm({ 
                  ...roleForm, 
                  permissions: { ...roleForm.permissions, dataAccess: v }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {systemPermissions?.dataAccess?.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      <div>
                        <p className="font-medium">{level.name}</p>
                        <p className="text-xs text-slate-500">{level.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <SafeButton onClick={handleCreateRole}>
              <Plus className="h-4 w-4 mr-2" /> Create Role
            </SafeButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Permissions</DialogTitle>
            <DialogDescription>
              Effective permissions for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (() => {
            const permissions = getEffectivePermissions(selectedUser)
            const roleInfo = getRoleInfo(selectedUser.role)
            
            return (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white">
                      {selectedUser.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <Badge style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color }}>
                      {roleInfo.name}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block text-slate-600">Data Access Level</Label>
                  <Badge variant="outline" className="capitalize">
                    <Database className="h-3 w-3 mr-1" />
                    {permissions.dataAccess}
                  </Badge>
                </div>
                
                <div>
                  <Label className="mb-2 block text-slate-600">Module Access</Label>
                  <div className="flex flex-wrap gap-2">
                    {permissions.modules?.map(moduleId => {
                      const ModuleIcon = MODULE_ICONS[moduleId] || Folder
                      return (
                        <Badge key={moduleId} variant="secondary">
                          <ModuleIcon className="h-3 w-3 mr-1" />
                          {moduleId}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block text-slate-600">Allowed Actions</Label>
                  <div className="flex flex-wrap gap-2">
                    {permissions.actions?.map(action => (
                      <Badge key={action} className="bg-emerald-100 text-emerald-700">
                        <Check className="h-3 w-3 mr-1" />
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
          
          <DialogFooter>
            <Button onClick={() => setShowPermissionDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
