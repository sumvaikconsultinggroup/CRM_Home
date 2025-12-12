'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, Filter, MoreVertical, Eye, Edit, Trash2, Lock, Play, Pause,
  Building2, Users, Mail, Phone, Calendar, Globe, Package, DollarSign,
  ChevronDown, ChevronUp, ArrowUpDown, Download, Upload, Plus, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Clock, Star, Crown, Shield,
  Settings, Activity, BarChart3, FileText, Send, Copy, ExternalLink,
  Loader2, X, Check, History, MessageSquare, CreditCard
} from 'lucide-react'
import { toast } from 'sonner'

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Active' },
    paused: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Pause, label: 'Paused' },
    trial: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, label: 'Trial' },
    expired: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Expired' },
    pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle, label: 'Pending' }
  }
  
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={`${config.color} border flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// Plan Badge Component
const PlanBadge = ({ plan }) => {
  const planConfig = {
    basic: { color: 'bg-slate-100 text-slate-700', icon: Package },
    professional: { color: 'bg-blue-100 text-blue-700', icon: Star },
    enterprise: { color: 'bg-purple-100 text-purple-700', icon: Crown }
  }
  
  const config = planConfig[plan?.toLowerCase()] || planConfig.basic
  const Icon = config.icon
  
  return (
    <Badge variant="secondary" className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {plan || 'Basic'}
    </Badge>
  )
}

// Client Avatar Component
const ClientAvatar = ({ name, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-xl'
  }
  
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600'
  ]
  
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  
  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold ${className}`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

// Client Detail Dialog
const ClientDetailDialog = ({ client, modules, open, onOpenChange, onModuleToggle, onStatusToggle, onResetPassword }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [resetPasswordMode, setResetPasswordMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  
  if (!client) return null

  const handlePasswordReset = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    onResetPassword(client.id, newPassword)
    setNewPassword('')
    setResetPasswordMode(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start gap-4">
            <ClientAvatar name={client.businessName} size="lg" />
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                {client.businessName}
                {client.clientCode && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {client.clientCode}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </span>
                )}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={client.subscriptionStatus} />
                <PlanBadge plan={client.planName} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={client.subscriptionStatus === 'active' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => onStatusToggle(client.id)}
              >
                {client.subscriptionStatus === 'active' ? (
                  <><Pause className="h-4 w-4 mr-1" /> Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-1" /> Activate</>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Modules
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Billing
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto py-4">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{client.userCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{client.modules?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Active Modules</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">87%</p>
                      <p className="text-xs text-muted-foreground">Activity Score</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">Joined</p>
                    </div>
                  </div>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Business Name</Label>
                        <p className="font-medium">{client.businessName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Email</Label>
                        <p className="font-medium">{client.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Phone</Label>
                        <p className="font-medium">{client.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Client Code</Label>
                        <p className="font-medium font-mono">{client.clientCode || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Plan</Label>
                        <p className="font-medium">{client.planName || 'Basic'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Status</Label>
                        <div className="mt-1">
                          <StatusBadge status={client.subscriptionStatus} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="modules" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Industry Modules</CardTitle>
                  <CardDescription>Enable or disable modules for this client</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {modules.map((module) => {
                      const isEnabled = client.modules?.includes(module.id)
                      return (
                        <div 
                          key={module.id} 
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            isEnabled ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-slate-100'}`}>
                              <Package className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <p className="font-medium">{module.name}</p>
                              <p className="text-xs text-muted-foreground">{module.description?.slice(0, 50) || 'Industry module'}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => onModuleToggle(client.id, module.id, isEnabled)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="billing" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subscription Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Current Plan</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <PlanBadge plan={client.planName} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Billing Cycle</Label>
                        <p className="font-medium">Monthly</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Next Billing Date</Label>
                        <p className="font-medium">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Payment Method</Label>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Invoice #{1000 + i}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{(5999).toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Paid</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resetPasswordMode ? (
                    <div className="space-y-3">
                      <Label>New Password</Label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <Button onClick={handlePasswordReset}>
                          <Check className="h-4 w-4 mr-1" /> Set
                        </Button>
                        <Button variant="outline" onClick={() => setResetPasswordMode(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Reset Password</p>
                          <p className="text-sm text-muted-foreground">Set a new password for this client</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setResetPasswordMode(true)}>
                        Reset Password
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Send Welcome Email</p>
                        <p className="text-sm text-muted-foreground">Re-send onboarding instructions</p>
                      </div>
                    </div>
                    <Button variant="outline">
                      <Send className="h-4 w-4 mr-1" /> Send
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-red-50">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium text-red-700">Delete Account</p>
                        <p className="text-sm text-red-600">Permanently delete this client and all data</p>
                      </div>
                    </div>
                    <Button variant="destructive">
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Client Table Row
const ClientRow = ({ client, isSelected, onSelect, onViewDetails, onQuickAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
      }`}
      onClick={() => onViewDetails(client)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => {
          onSelect(client.id, checked)
        }}
        onClick={(e) => e.stopPropagation()}
      />
      
      <ClientAvatar name={client.businessName} size="md" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{client.businessName}</p>
          {client.clientCode && (
            <Badge variant="outline" className="font-mono text-xs bg-slate-100">
              {client.clientCode}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{client.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={client.subscriptionStatus} />
          <PlanBadge plan={client.planName} />
          {client.modules?.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {client.modules.length} modules
            </Badge>
          )}
        </div>
      </div>
      
      <div className="text-right hidden md:block">
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{client.userCount || 0}</span>
          <span className="text-muted-foreground">users</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Joined {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
        </p>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(client); }}>
            <Eye className="h-4 w-4 mr-2" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuickAction(client.id, 'edit'); }}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuickAction(client.id, 'toggle-status'); }}>
            {client.subscriptionStatus === 'active' ? (
              <><Pause className="h-4 w-4 mr-2" /> Pause Account</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Activate Account</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuickAction(client.id, 'reset-password'); }}>
            <Lock className="h-4 w-4 mr-2" /> Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onQuickAction(client.id, 'delete'); }}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  )
}

// Main Enterprise Client Management Component
export function EnterpriseClientManagement({ 
  clients = [], 
  modules = [], 
  onToggleStatus, 
  onModuleToggle, 
  onResetPassword,
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedClients, setSelectedClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  
  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c => 
        c.businessName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.clientCode?.toLowerCase().includes(term)
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.subscriptionStatus === statusFilter)
    }
    
    // Plan filter
    if (planFilter !== 'all') {
      result = result.filter(c => c.planId?.toLowerCase() === planFilter.toLowerCase())
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.businessName || ''
          bVal = b.businessName || ''
          break
        case 'users':
          aVal = a.userCount || 0
          bVal = b.userCount || 0
          break
        case 'date':
          aVal = new Date(a.createdAt || 0)
          bVal = new Date(b.createdAt || 0)
          break
        default:
          aVal = a.businessName || ''
          bVal = b.businessName || ''
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })
    
    return result
  }, [clients, searchTerm, statusFilter, planFilter, sortBy, sortOrder])
  
  // Stats
  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.subscriptionStatus === 'active').length,
    trial: clients.filter(c => c.subscriptionStatus === 'trial').length,
    paused: clients.filter(c => c.subscriptionStatus === 'paused').length
  }), [clients])
  
  const handleSelectClient = (clientId, checked) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientId])
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId))
    }
  }
  
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedClients(filteredClients.map(c => c.id))
    } else {
      setSelectedClients([])
    }
  }
  
  const handleQuickAction = (clientId, action) => {
    switch (action) {
      case 'toggle-status':
        onToggleStatus?.(clientId)
        break
      case 'reset-password':
        const client = clients.find(c => c.id === clientId)
        setSelectedClient(client)
        break
      default:
        toast.info(`Action: ${action}`)
    }
  }
  
  const handleBulkAction = (action) => {
    if (selectedClients.length === 0) {
      toast.error('Please select at least one client')
      return
    }
    toast.info(`Bulk ${action} for ${selectedClients.length} clients`)
  }
  
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('active')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('trial')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.trial}</p>
              <p className="text-xs text-muted-foreground">Trial</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('paused')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Pause className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.paused}</p>
              <p className="text-xs text-muted-foreground">Paused</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or client code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedClients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-4 mt-4 pt-4 border-t"
          >
            <span className="text-sm font-medium">
              {selectedClients.length} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                <Play className="h-4 w-4 mr-1" /> Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('pause')}>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedClients([])}>
              Clear
            </Button>
          </motion.div>
        )}
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <CardTitle className="text-base">
                Clients ({filteredClients.length})
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort('name')}
                className={sortBy === 'name' ? 'text-primary' : ''}
              >
                Name
                <ArrowUpDown className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort('users')}
                className={sortBy === 'users' ? 'text-primary' : ''}
              >
                Users
                <ArrowUpDown className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort('date')}
                className={sortBy === 'date' ? 'text-primary' : ''}
              >
                Date
                <ArrowUpDown className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-muted-foreground">No clients found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  isSelected={selectedClients.includes(client.id)}
                  onSelect={handleSelectClient}
                  onViewDetails={setSelectedClient}
                  onQuickAction={handleQuickAction}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Client Detail Dialog */}
      <ClientDetailDialog
        client={selectedClient}
        modules={modules}
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
        onModuleToggle={onModuleToggle}
        onStatusToggle={onToggleStatus}
        onResetPassword={onResetPassword}
      />
    </div>
  )
}
