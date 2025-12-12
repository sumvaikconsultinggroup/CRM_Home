'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts'
import { 
  Building2, Users, TrendingUp, DollarSign, CheckCircle2, Clock, AlertCircle, 
  LayoutDashboard, Briefcase, ClipboardList, Receipt, Settings, LogOut, Menu, X,
  Plus, MoreVertical, Edit, Trash2, Eye, ChevronRight, Building, Shield, Layers,
  ChefHat, Grid3X3, Sofa, HardHat, Paintbrush, Wrench, Zap, Phone, Mail, Target,
  BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Calendar, UserPlus, Package,
  Sparkles, Bell, Search, Filter, Download, RefreshCw, Send, MessageSquare, Palette,
  Globe, Image, FileText, Star, Crown, ChevronDown, ExternalLink, Lock, Square
} from 'lucide-react'
import FlooringModule from './flooring/page'
import { LeadForm, ProjectForm, TaskForm, ExpenseForm, UserForm } from '@/components/client-forms'
import { AdvancedReports } from '@/components/advanced-reports'
import { EnterpriseLeads } from '@/components/leads-enterprise'
import { ExpenseCharts } from '@/components/expense-charts'
import { UpgradeFlow } from '@/components/upgrade-flow'
import { SuperAdminReports } from '@/components/super-admin-reports'
import { SuperAdminSettings } from '@/components/super-admin-settings'
import EnhancedLanding from '@/components/enhanced-landing'
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/components/auth-ui'
import { TeamChat } from '@/components/team-chat'

// Animation variants
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
}

const slideIn = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 }
}

const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 }
}

// Chart colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Helper function to convert hex to HSL for shadcn/ui
const hexToHSL = (hex) => {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  
  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  l = Math.round(l * 100)
  
  return `${h} ${s}% ${l}%`
}

// Glassmorphism card component
const GlassCard = ({ children, className = '', ...props }) => (
  <motion.div
    className={`backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 rounded-2xl shadow-xl ${className}`}
    {...props}
  >
    {children}
  </motion.div>
)

// Animated stat card
const StatCard = ({ title, value, change, icon: Icon, trend = 'up', delay = 0, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    onClick={onClick}
    className={onClick ? 'cursor-pointer' : ''}
  >
    <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.p 
            className="text-3xl font-bold mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      </div>
    </GlassCard>
  </motion.div>
)

// ==================== LANDING PAGE ====================
// LandingPage has been moved to @/components/landing-page.js

// Old LoginPage removed - using component from @/components/auth-ui

// Old RegisterPage removed - using component from @/components/auth-ui

// ==================== SUPER ADMIN DASHBOARD ====================
function SuperAdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [modules, setModules] = useState([])
  const [moduleRequests, setModuleRequests] = useState([])
  const [plans, setPlans] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [resetPasswordClient, setResetPasswordClient] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    try {
      await api.resetClientPassword(resetPasswordClient.id, newPassword)
      toast.success(`Password reset for ${resetPasswordClient.businessName}`)
      setResetPasswordClient(null)
      setNewPassword('')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, clientsData, modulesData, plansData, requestsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminClients(),
        api.getAdminModules(),
        api.getPlans(),
        api.getModuleRequests().catch(() => [])
      ])
      setStats(statsData)
      setClients(clientsData)
      setModules(modulesData)
      setPlans(plansData)
      setModuleRequests(requestsData)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleClientStatus = async (clientId) => {
    try {
      await api.updateAdminClient(clientId, 'toggle-status')
      toast.success('Client status updated')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleModuleToggle = async (clientId, moduleId, enabled) => {
    try {
      await api.updateAdminClient(clientId, enabled ? 'remove-module' : 'add-module', { moduleId })
      toast.success('Module updated')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleModuleRequestAction = async (requestId, action) => {
    try {
      await api.updateModuleRequest(requestId, action)
      toast.success(`Request ${action}d`)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'clients', icon: Building, label: 'Clients' },
    { id: 'modules', icon: Package, label: 'Modules' },
    { id: 'requests', icon: MessageSquare, label: 'Module Requests', badge: moduleRequests.filter(r => r.status === 'pending').length },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <motion.aside 
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col`}
        initial={{ x: -100 }}
        animate={{ x: 0 }}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-indigo-600">
            <Shield className="h-6 w-6" />
          </div>
          {sidebarOpen && <span className="text-xl font-bold">Admin Panel</span>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/25' 
                  : 'hover:bg-white/10'
              }`}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge className="bg-red-500">{item.badge}</Badge>
                  )}
                </>
              )}
            </motion.button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <motion.button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors"
            whileHover={{ x: 5 }}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <motion.header 
          className="bg-white/80 backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{menuItems.find(m => m.id === activeTab)?.label}</h1>
              <p className="text-sm text-muted-foreground">Manage your platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="h-4 w-4 mr-1" />
              Super Admin
            </Badge>
          </div>
        </motion.header>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && stats && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <SuperAdminReports stats={stats} clients={clients} />
                
                {/* Recent Clients */}
                <GlassCard className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Recent Clients</h3>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('clients')}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {clients.slice(0, 5).map((client, i) => (
                      <motion.div 
                        key={client.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-semibold">
                            {client.businessName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{client.businessName}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={client.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {client.subscriptionStatus}
                          </Badge>
                          <Badge variant="outline">{client.planName}</Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'clients' && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <GlassCard className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">All Clients</h3>
                      <p className="text-sm text-muted-foreground">Manage client subscriptions and modules</p>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Search clients..." className="w-64" />
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {clients.map((client, i) => (
                      <motion.div 
                        key={client.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {client.businessName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold">{client.businessName}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{client.planName}</Badge>
                              <Badge variant={client.subscriptionStatus === 'active' ? 'default' : 'destructive'} className="text-xs">
                                {client.subscriptionStatus}
                              </Badge>
                              {client.modules?.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{client.modules.length} modules</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" /> Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{client.businessName}</DialogTitle>
                                <DialogDescription>Manage client modules and settings</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">{client.email}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Phone</Label>
                                    <p className="font-medium">{client.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Plan</Label>
                                    <p className="font-medium">{client.planName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Users</Label>
                                    <p className="font-medium">{client.userCount || 0}</p>
                                  </div>
                                </div>
                                <Separator />
                                <div>
                                  <Label className="mb-3 block font-semibold">Industry Modules</Label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {modules.map((module) => (
                                      <div key={module.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium">{module.name}</span>
                                        <Switch
                                          checked={client.modules?.includes(module.id)}
                                          onCheckedChange={() => handleModuleToggle(client.id, module.id, client.modules?.includes(module.id))}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant={client.subscriptionStatus === 'active' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => handleToggleClientStatus(client.id)}
                          >
                            {client.subscriptionStatus === 'active' ? 'Pause' : 'Activate'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setResetPasswordClient(client)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Password Reset Dialog - Moved OUTSIDE the loop */}
            <Dialog open={!!resetPasswordClient} onOpenChange={(open) => !open && setResetPasswordClient(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter new password for {resetPasswordClient?.businessName}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label>New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Enter new password"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResetPasswordClient(null)}>Cancel</Button>
                  <Button onClick={handleResetPassword}>Reset Password</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {activeTab === 'modules' && (
              <motion.div
                key="modules"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Industry Modules</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {modules.map((module, i) => (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <Badge variant={module.active ? 'default' : 'secondary'}>
                              {module.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{module.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{module.description}</p>
                          <div className="flex justify-between items-center mt-4 pt-3 border-t">
                            <span className="font-bold">₹{module.price}/mo</span>
                            <span className="text-sm text-muted-foreground">{module.usageCount || 0} clients</span>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Module Requests</h3>
                  {moduleRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No module requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {moduleRequests.map((request, i) => (
                        <motion.div
                          key={request.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-slate-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div>
                            <p className="font-medium">{request.clientName}</p>
                            <p className="text-sm text-muted-foreground">
                              Requesting: <span className="font-medium text-primary">{request.moduleName}</span>
                            </p>
                            {request.message && (
                              <p className="text-sm mt-1">&quot;{request.message}&quot;</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {request.status === 'pending' ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleModuleRequestAction(request.id, 'reject')}>
                                  Reject
                                </Button>
                                <Button size="sm" onClick={() => handleModuleRequestAction(request.id, 'approve')}>
                                  Approve
                                </Button>
                              </>
                            ) : (
                              <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                                {request.status}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <SuperAdminSettings user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ==================== CLIENT DASHBOARD ====================
function ClientDashboard({ user, client, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [expenses, setExpenses] = useState([])
  const [users, setUsers] = useState([])
  const [modules, setModules] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [activeModule, setActiveModule] = useState(null) // Track which module is open
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false)
  const [showChat, setShowChat] = useState(false) // Team Chat state

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, leadsData, projectsData, tasksData, expensesData, usersData, modulesData] = await Promise.all([
        api.getClientStats(),
        api.getLeads(),
        api.getProjects(),
        api.getTasks(),
        api.getExpenses(),
        api.getUsers(),
        api.getClientModules()
      ])
      setStats(statsData)
      setLeads(leadsData)
      setProjects(projectsData)
      setTasks(tasksData)
      setExpenses(expensesData)
      setUsers(usersData)
      setModules(modulesData)
    } catch (error) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    console.log('Client Dashboard - User & Client:', { 
      user: user?.email, 
      clientPlan: client?.plan, // Log the whole plan object
      planId: client?.plan?.id || client?.plan // Log what we think the ID is
    })

    // Apply White Label Colors
    if (client?.whiteLabelSettings?.primaryColor) {
      const hslColor = hexToHSL(client.whiteLabelSettings.primaryColor)
      document.documentElement.style.setProperty('--primary', hslColor)
      // Also calculate and set a contrasting foreground color
      const lightness = parseInt(hslColor.split(' ')[2])
      const foregroundLightness = lightness > 50 ? '0%' : '100%'
      document.documentElement.style.setProperty('--primary-foreground', `0 0% ${foregroundLightness}`)
    }
  }, [fetchData, client])

  // Robust Plan Detection
  const getPlanId = (c) => {
    if (!c) return 'basic'
    if (c.plan && typeof c.plan === 'object' && c.plan.id) return c.plan.id
    if (c.planId) return c.planId
    if (typeof c.plan === 'string') return c.plan
    return 'basic'
  }

  const planId = getPlanId(client).toLowerCase()
  const isEnterprise = planId === 'enterprise'
  const isProfessional = planId === 'professional'

  // Debug Plan
  useEffect(() => {
    console.log('DEBUG PLAN:', { 
      rawClient: client, 
      detectedPlanId: planId,
      isEnterprise,
      isProfessional
    })
  }, [client, planId])


  // Check if wooden flooring module is enabled
  const hasFlooringModule = modules.some(m => m.id === 'wooden-flooring' && m.enabled)

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'leads', icon: Target, label: 'Leads' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'tasks', icon: ClipboardList, label: 'Tasks' },
    { id: 'expenses', icon: Receipt, label: 'Expenses' },
    { id: 'users', icon: Users, label: 'Team' },
    { id: 'chat', icon: MessageSquare, label: 'Team Chat', isChat: true },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    // Add Wooden Flooring module link if enabled
    ...(hasFlooringModule ? [{ id: 'flooring-module', icon: Layers, label: 'Wooden Flooring', isModule: true }] : []),
    { id: 'modules', icon: Package, label: 'Modules' },
    { id: 'whitelabel', icon: Palette, label: 'White Label' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ]

  const statusColors = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    qualified: 'bg-purple-500',
    proposal: 'bg-orange-500',
    negotiation: 'bg-pink-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
    planning: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    on_hold: 'bg-orange-500',
    completed: 'bg-green-500',
    todo: 'bg-slate-500',
    review: 'bg-purple-500',
  }

  const handleRequestModule = async (moduleId) => {
    try {
      await api.createModuleRequest(moduleId, 'I would like to add this module to my subscription')
      toast.success('Module request submitted!')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    )
  }

  // Render Flooring Module if active
  if (activeModule === 'flooring') {
    return <FlooringModule onBack={() => setActiveModule(null)} />
  }

  // Render Upgrade Flow if active
  if (showUpgradeFlow) {
    return (
      <UpgradeFlow
        currentPlan={client?.plan?.id || 'basic'}
        onClose={() => setShowUpgradeFlow(false)}
        onSuccess={(newPlan) => {
          toast.success(`Upgraded to ${newPlan}!`)
          setShowUpgradeFlow(false)
          fetchData()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex">
      {/* Sidebar */}
      <motion.aside 
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white border-r transition-all duration-300 flex flex-col shadow-xl`}
        initial={{ x: -100 }}
        animate={{ x: 0 }}
      >
        <div className="p-6 flex items-center gap-3 border-b">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-indigo-600">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          {sidebarOpen && <span className="text-xl font-bold">BuildCRM</span>}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => {
                if (item.isModule && item.id === 'flooring-module') {
                  setActiveModule('flooring')
                } else {
                  setActiveTab(item.id)
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/25' 
                  : item.isModule 
                    ? 'hover:bg-amber-100 text-amber-700 bg-amber-50 border border-amber-200'
                    : 'hover:bg-slate-100 text-slate-600'
              }`}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {sidebarOpen && item.isModule && (
                <ExternalLink className="h-4 w-4 opacity-60" />
              )}
            </motion.button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <motion.button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
            whileHover={{ x: 5 }}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <motion.header 
          className="bg-white/80 backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{client?.businessName || 'Dashboard'}</h1>
              <p className="text-sm text-muted-foreground">{menuItems.find(m => m.id === activeTab)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              {client?.planId?.toUpperCase() || 'BASIC'}
            </Badge>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-medium">
                {user.name?.charAt(0)}
              </div>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Total Leads" 
                    value={stats.overview.totalLeads} 
                    change={`${stats.overview.conversionRate}% conversion`} 
                    icon={Target} 
                    delay={0} 
                    onClick={() => setActiveTab('leads')}
                  />
                  <StatCard 
                    title="Pipeline Value" 
                    value={`₹${stats.overview.pipelineValue?.toLocaleString()}`} 
                    change={`${stats.overview.wonLeads} won`} 
                    icon={DollarSign} 
                    delay={0.1}
                    onClick={() => setActiveTab('leads')}
                  />
                  <StatCard 
                    title="Active Projects" 
                    value={stats.overview.activeProjects} 
                    change={`of ${stats.overview.totalProjects} total`} 
                    icon={Briefcase} 
                    delay={0.2}
                    onClick={() => setActiveTab('projects')}
                  />
                  <StatCard 
                    title="Tasks Done" 
                    value={`${stats.overview.completedTasks}/${stats.overview.totalTasks}`} 
                    change={`${stats.overview.taskCompletionRate}%`} 
                    icon={CheckCircle2} 
                    delay={0.3}
                    onClick={() => setActiveTab('tasks')}
                  />
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Lead Sources</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.charts.leadSources}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="source"
                        >
                          {stats.charts.leadSources.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Pipeline Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.charts.leadStatuses}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="status" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255,255,255,0.9)', 
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </div>

                {/* Recent Activity */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Recent Leads</h3>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('leads')}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {leads.slice(0, 5).map((lead, i) => (
                        <motion.div
                          key={lead.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.source}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">₹{lead.value?.toLocaleString()}</span>
                            <div className={`h-2 w-2 rounded-full ${statusColors[lead.status]}`} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {tasks.filter(t => t.status !== 'completed').slice(0, 5).map((task, i) => (
                        <motion.div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={task.priority === 'high' || task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                            {task.priority}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            )}

            {/* Leads Tab */}
            {activeTab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Sales Pipeline</h2>
                  <Button onClick={() => { setDialogType('lead'); setEditingItem(null); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Lead
                  </Button>
                </div>

                <EnterpriseLeads
                  leads={leads}
                  onUpdateLead={async (leadId, data) => {
                    console.log('Updating lead:', leadId, data)
                    await api.updateLead(leadId, data)
                    // We call fetchData to ensure state consistency
                    await fetchData()
                  }}
                  onEditLead={(lead) => {
                    setDialogType('lead')
                    setEditingItem(lead)
                    setShowDialog(true)
                  }}
                  onRefresh={fetchData}
                  isEnterprise={isEnterprise}
                  isProfessional={isProfessional}
                  client={client}
                />
              </motion.div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Projects</h2>
                  <Button onClick={() => { setDialogType('project'); setEditingItem(null); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Project
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <GlassCard className="p-6 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setDialogType('project'); setEditingItem(project); setShowDialog(true); }}>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-semibold">{project.name}</h3>
                          <Badge className={statusColors[project.status]}>{project.status?.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        <div className="flex justify-between mt-4 pt-4 border-t text-sm">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-bold">₹{project.budget?.toLocaleString()}</span>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Task Board</h2>
                  <Button onClick={() => { setDialogType('task'); setEditingItem(null); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Task
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['todo', 'in_progress', 'review', 'completed'].map((status) => (
                    <GlassCard key={status}>
                      <div className="p-4 border-b flex items-center justify-between">
                        <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
                        <Badge variant="secondary">{tasks.filter(t => t.status === status).length}</Badge>
                      </div>
                      <div className="p-3 space-y-2 min-h-[300px]">
                        {tasks.filter(t => t.status === status).map((task) => (
                          <motion.div
                            key={task.id}
                            className="p-3 bg-white rounded-lg shadow-sm border hover:shadow-md cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => { setDialogType('task'); setEditingItem(task); setShowDialog(true); }}
                          >
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{task.description || 'No description'}</p>
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant={task.priority === 'urgent' || task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                {task.priority || 'medium'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Expenses</h2>
                  <Button onClick={() => { setDialogType('expense'); setEditingItem(null); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Expense
                  </Button>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <StatCard title="Total Expenses" value={`₹${stats?.overview.totalExpenses?.toLocaleString()}`} icon={Receipt} />
                </div>
                
                <ExpenseCharts expenses={expenses} />

                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4">Recent Expenses</h3>
                  <div className="space-y-3">
                    {expenses.map((expense, i) => (
                      <motion.div
                        key={expense.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => { setDialogType('expense'); setEditingItem(expense); setShowDialog(true); }}
                      >
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.category || 'Uncategorized'} • {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">₹{expense.amount?.toLocaleString() || '0'}</span>
                          <Badge variant={expense.approved ? 'default' : 'secondary'}>
                            {expense.approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Team Members</h2>
                  <Button onClick={() => { setDialogType('user'); setEditingItem(null); setShowDialog(true); }}>
                    <UserPlus className="h-4 w-4 mr-2" /> Add User
                  </Button>
                </div>

                <GlassCard className="p-6">
                  <div className="space-y-3">
                    {users.map((u, i) => (
                      <motion.div
                        key={u.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{u.role?.replace('_', ' ')}</Badge>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && stats && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <AdvancedReports 
                  stats={stats}
                  leads={leads}
                  projects={projects}
                  tasks={tasks}
                  expenses={expenses}
                />
              </motion.div>
            )}

            {/* Modules Tab */}
            {activeTab === 'modules' && (
              <motion.div
                key="modules"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold">Industry Modules</h2>
                  <p className="text-muted-foreground">Manage your active modules or request new ones</p>
                </div>

                {/* Active Modules Section */}
                {modules.filter(m => m.enabled).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Your Active Modules
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modules.filter(m => m.enabled).map((module, i) => {
                        const moduleIcons = {
                          'wooden-flooring': Layers,
                          'kitchens': ChefHat,
                          'tiles': Grid3X3,
                          'furniture': Sofa,
                          'contractors': HardHat,
                          'painting': Paintbrush,
                          'plumbing': Wrench,
                          'electrical': Zap,
                          'doors-windows': Square,
                          'architects': Building2,
                          'interior-designers': Palette,
                          'real-estate-brokers': Building
                        }
                        const ModuleIcon = moduleIcons[module.id] || Package
                        
                        return (
                          <motion.div
                            key={module.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <GlassCard className="p-6 border-2 border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
                              <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                                  <ModuleIcon className="h-6 w-6 text-white" />
                                </div>
                                <Badge className="bg-green-500">Active</Badge>
                              </div>
                              <h3 className="font-semibold text-lg">{module.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <span className="font-bold text-green-600">₹{module.price}/mo</span>
                                {module.id === 'wooden-flooring' ? (
                                  <Button 
                                    size="sm" 
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    onClick={() => setActiveModule('flooring')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" /> Open Module
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" disabled>
                                    Coming Soon
                                  </Button>
                                )}
                              </div>
                            </GlassCard>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Available Modules Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Modules</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {modules.filter(m => !m.enabled).map((module, i) => (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <GlassCard className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Package className="h-6 w-6 text-primary" />
                            </div>
                            {module.requestPending ? (
                              <Badge variant="secondary">Pending</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{module.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                          <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <span className="font-bold">₹{module.price}/mo</span>
                            {!module.requestPending && (
                              <Button size="sm" variant="outline" onClick={() => handleRequestModule(module.id)}>
                                <Send className="h-4 w-4 mr-1" /> Request
                              </Button>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* White Label Tab */}
            {activeTab === 'whitelabel' && (
              <motion.div
                key="whitelabel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold">White Label Settings</h2>
                  <p className="text-muted-foreground">Customize your CRM branding (Enterprise plan only)</p>
                </div>

                {client?.planId === 'enterprise' ? (
                  <WhiteLabelSettings />
                ) : (
                  <GlassCard className="p-12 text-center">
                    <Crown className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Enterprise Feature</h3>
                    <p className="text-muted-foreground mb-6">
                      White labeling is available on the Enterprise plan. Upgrade to customize your branding.
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-amber-500 to-orange-500"
                      onClick={() => setShowUpgradeFlow(true)}
                    >
                      <Crown className="h-4 w-4 mr-2" /> Upgrade to Enterprise
                    </Button>
                  </GlassCard>
                )}
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold">Account Settings</h2>
                  <p className="text-muted-foreground">Manage your profile and preferences</p>
                </div>

                <div className="grid gap-6">
                  {/* Profile Settings */}
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Profile Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={user?.name || ''} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={user?.email || ''} disabled />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company</Label>
                          <Input value={client?.businessName || ''} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input value={user?.role?.toUpperCase() || ''} disabled />
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Subscription Info */}
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      Subscription Plan
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-indigo-600/10 rounded-lg border border-primary/20">
                      <div>
                        <p className="font-semibold text-lg">{client?.plan?.name || 'Basic'} Plan</p>
                        <p className="text-sm text-muted-foreground">
                          {client?.subscriptionStatus === 'active' ? '✓ Active' : '⚠ Inactive'}
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => setShowUpgradeFlow(true)}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-2" /> Upgrade Plan
                      </Button>
                    </div>
                  </GlassCard>

                  {/* Preferences */}
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Preferences
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive updates about leads and projects</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">WhatsApp Notifications</p>
                          <p className="text-sm text-muted-foreground">Get instant alerts on your phone</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">Weekly Reports</p>
                          <p className="text-sm text-muted-foreground">Receive summary emails every Monday</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Danger Zone */}
                  <GlassCard className="p-6 border-red-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      Danger Zone
                    </h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete All Data
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50">
                        <AlertCircle className="h-4 w-4 mr-2" /> Deactivate Account
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Dialogs for CRUD operations */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {dialogType?.charAt(0).toUpperCase() + dialogType?.slice(1)}
            </DialogTitle>
          </DialogHeader>
          
          {dialogType === 'lead' && (
            <LeadForm 
              lead={editingItem}
              onSubmit={async (data) => {
                try {
                  if (editingItem) {
                    await api.updateLead(editingItem.id, data)
                    toast.success('Lead updated successfully')
                  } else {
                    await api.createLead(data)
                    toast.success('Lead created successfully')
                  }
                  setShowDialog(false)
                  setEditingItem(null)
                  fetchData()
                } catch (error) {
                  toast.error(error.message || 'Operation failed')
                }
              }}
              onCancel={() => {
                setShowDialog(false)
                setEditingItem(null)
              }}
            />
          )}
          
          {dialogType === 'project' && (
            <ProjectForm 
              project={editingItem}
              onSubmit={async (data) => {
                try {
                  console.log('Submitting project data:', data)
                  if (editingItem) {
                    await api.updateProject(editingItem.id, data)
                    toast.success('Project updated successfully')
                  } else {
                    await api.createProject(data)
                    toast.success('Project created successfully')
                  }
                  setShowDialog(false)
                  setEditingItem(null)
                  fetchData()
                } catch (error) {
                  console.error('Project submission error:', error)
                  toast.error(error.message || 'Failed to save project')
                }
              }}
              onCancel={() => {
                setShowDialog(false)
                setEditingItem(null)
              }}
            />
          )}
          
          {dialogType === 'task' && (
            <TaskForm 
              task={editingItem}
              projects={projects}
              onSubmit={async (data) => {
                try {
                  console.log('Submitting task data:', data)
                  if (editingItem) {
                    await api.updateTask(editingItem.id, data)
                    toast.success('Task updated successfully')
                  } else {
                    await api.createTask(data)
                    toast.success('Task created successfully')
                  }
                  setShowDialog(false)
                  setEditingItem(null)
                  fetchData()
                } catch (error) {
                  console.error('Task submission error:', error)
                  toast.error(error.message || 'Failed to save task')
                }
              }}
              onCancel={() => {
                setShowDialog(false)
                setEditingItem(null)
              }}
            />
          )}
          
          {dialogType === 'expense' && (
            <ExpenseForm 
              expense={editingItem}
              projects={projects}
              onSubmit={async (data) => {
                try {
                  if (editingItem) {
                    await api.updateExpense(editingItem.id, data)
                    toast.success('Expense updated successfully')
                  } else {
                    await api.createExpense(data)
                    toast.success('Expense created successfully')
                  }
                  setShowDialog(false)
                  setEditingItem(null)
                  fetchData()
                } catch (error) {
                  toast.error(error.message || 'Operation failed')
                }
              }}
              onCancel={() => {
                setShowDialog(false)
                setEditingItem(null)
              }}
            />
          )}
          
          {dialogType === 'user' && (
            <UserForm 
              user={editingItem}
              onSubmit={async (data) => {
                try {
                  if (editingItem) {
                    await api.updateUser(editingItem.id, data)
                    toast.success('User updated successfully')
                  } else {
                    await api.createUser(data)
                    toast.success('User created successfully')
                  }
                  setShowDialog(false)
                  setEditingItem(null)
                  fetchData()
                } catch (error) {
                  toast.error(error.message || 'Operation failed')
                }
              }}
              onCancel={() => {
                setShowDialog(false)
                setEditingItem(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// White Label Settings Component
function WhiteLabelSettings() {
  const [settings, setSettings] = useState({
    logo: '',
    favicon: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#10B981',
    companyName: '',
    customDomain: '',
    emailBranding: {
      enabled: false,
      headerBg: '#3B82F6',
      footerText: ''
    },
    loginPage: {
      backgroundImage: '',
      welcomeText: 'Welcome Back',
      tagline: 'Manage your business efficiently'
    },
    enabled: false
  })
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('branding')

  useEffect(() => {
    api.getWhitelabel()
      .then(data => setSettings(s => ({ ...s, ...data })))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      await api.updateWhitelabel(settings)
      toast.success('White label settings saved successfully!')
      // Instant Apply with HSL conversion
      if (settings.primaryColor) {
        const hslColor = hexToHSL(settings.primaryColor)
        document.documentElement.style.setProperty('--primary', hslColor)
        const lightness = parseInt(hslColor.split(' ')[2])
        const foregroundLightness = lightness > 50 ? '0%' : '100%'
        document.documentElement.style.setProperty('--primary-foreground', `0 0% ${foregroundLightness}`)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save settings')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeSection === 'branding' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('branding')}
          className="rounded-b-none"
        >
          <Palette className="h-4 w-4 mr-2" />
          Branding
        </Button>
        <Button
          variant={activeSection === 'colors' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('colors')}
          className="rounded-b-none"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Colors & Theme
        </Button>
        <Button
          variant={activeSection === 'email' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('email')}
          className="rounded-b-none"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email Branding
        </Button>
        <Button
          variant={activeSection === 'login' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('login')}
          className="rounded-b-none"
        >
          <Shield className="h-4 w-4 mr-2" />
          Login Page
        </Button>
      </div>

      {/* Branding Section */}
      {activeSection === 'branding' && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Image className="h-5 w-5" />
            Brand Assets
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input 
                  value={settings.companyName} 
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input 
                  value={settings.logo || ''} 
                  onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">Recommended: 200x60px, transparent PNG</p>
              </div>
              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input 
                  value={settings.favicon || ''} 
                  onChange={(e) => setSettings({ ...settings, favicon: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-xs text-muted-foreground">Recommended: 32x32px or 64x64px ICO/PNG</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Custom Domain</Label>
                <Input 
                  value={settings.customDomain || ''} 
                  onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
                  placeholder="crm.yourdomain.com"
                />
                <p className="text-xs text-muted-foreground">Point your domain's CNAME to our servers</p>
              </div>
              {/* Preview Section */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <Label className="mb-2 block">Logo Preview</Label>
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo preview" className="h-12 object-contain" onError={(e) => e.target.style.display = 'none'} />
                ) : (
                  <div className="h-12 flex items-center text-sm text-muted-foreground">
                    No logo uploaded
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-indigo-600/10 rounded-lg border border-primary/20">
                <div>
                  <p className="font-medium">Enable White Labeling</p>
                  <p className="text-xs text-muted-foreground">Apply custom branding across platform</p>
                </div>
                <Switch 
                  checked={settings.enabled} 
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Colors & Theme Section */}
      {activeSection === 'colors' && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Scheme
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={settings.primaryColor} 
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={settings.primaryColor} 
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Main brand color for buttons & accents</p>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={settings.secondaryColor} 
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={settings.secondaryColor} 
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for hover states & links</p>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={settings.accentColor} 
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={settings.accentColor} 
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Success states & highlights</p>
            </div>
          </div>
          
          {/* Color Preview */}
          <div className="mt-6 p-6 border rounded-lg bg-slate-50">
            <Label className="mb-4 block">Color Preview</Label>
            <div className="flex gap-3">
              <Button style={{ backgroundColor: settings.primaryColor }}>
                Primary Button
              </Button>
              <Button variant="outline" style={{ borderColor: settings.secondaryColor, color: settings.secondaryColor }}>
                Secondary
              </Button>
              <Badge style={{ backgroundColor: settings.accentColor }}>Accent Badge</Badge>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Email Branding Section */}
      {activeSection === 'email' && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Branding
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Enable Email Branding</p>
                <p className="text-sm text-muted-foreground">Use your branding in system emails</p>
              </div>
              <Switch 
                checked={settings.emailBranding?.enabled || false} 
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  emailBranding: { ...settings.emailBranding, enabled: checked }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email Header Background</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={settings.emailBranding?.headerBg || '#3B82F6'} 
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    emailBranding: { ...settings.emailBranding, headerBg: e.target.value }
                  })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={settings.emailBranding?.headerBg || '#3B82F6'} 
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    emailBranding: { ...settings.emailBranding, headerBg: e.target.value }
                  })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email Footer Text</Label>
              <Textarea 
                value={settings.emailBranding?.footerText || ''} 
                onChange={(e) => setSettings({ 
                  ...settings, 
                  emailBranding: { ...settings.emailBranding, footerText: e.target.value }
                })}
                placeholder="© 2024 Your Company. All rights reserved."
                rows={2}
              />
            </div>

            {/* Email Preview */}
            <div className="p-4 border rounded-lg bg-white">
              <Label className="mb-2 block">Email Preview</Label>
              <div className="border rounded overflow-hidden text-sm">
                <div 
                  className="p-4 text-white font-semibold" 
                  style={{ backgroundColor: settings.emailBranding?.headerBg || '#3B82F6' }}
                >
                  {settings.companyName || 'Your Company'}
                </div>
                <div className="p-4">
                  <p>Sample email content will appear here...</p>
                </div>
                <div className="p-3 bg-slate-50 text-xs text-muted-foreground text-center border-t">
                  {settings.emailBranding?.footerText || '© 2024 Your Company'}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Login Page Section */}
      {activeSection === 'login' && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login Page Customization
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Background Image URL</Label>
                <Input 
                  value={settings.loginPage?.backgroundImage || ''} 
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    loginPage: { ...settings.loginPage, backgroundImage: e.target.value }
                  })}
                  placeholder="https://example.com/background.jpg"
                />
                <p className="text-xs text-muted-foreground">Full HD image recommended (1920x1080px)</p>
              </div>
              <div className="space-y-2">
                <Label>Welcome Text</Label>
                <Input 
                  value={settings.loginPage?.welcomeText || 'Welcome Back'} 
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    loginPage: { ...settings.loginPage, welcomeText: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input 
                  value={settings.loginPage?.tagline || 'Manage your business efficiently'} 
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    loginPage: { ...settings.loginPage, tagline: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <Label className="mb-2 block">Login Page Preview</Label>
              <div className="aspect-video bg-gradient-to-br from-primary to-indigo-600 rounded-lg overflow-hidden relative">
                {settings.loginPage?.backgroundImage && (
                  <img 
                    src={settings.loginPage.backgroundImage} 
                    alt="Background" 
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center h-full text-white p-4">
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{settings.loginPage?.welcomeText || 'Welcome Back'}</h3>
                    <p className="text-xs mt-1">{settings.loginPage?.tagline || 'Manage your business'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {
          setSettings({
            logo: '',
            favicon: '',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            accentColor: '#10B981',
            companyName: '',
            customDomain: '',
            emailBranding: { enabled: false, headerBg: '#3B82F6', footerText: '' },
            loginPage: { backgroundImage: '', welcomeText: 'Welcome Back', tagline: 'Manage your business efficiently' },
            enabled: false
          })
          toast.info('Settings reset to defaults')
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-indigo-600">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function App() {
  const [view, setView] = useState('landing')
  const [user, setUser] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const data = await api.getMe()
          setUser(data.user)
          // Merge whitelabel settings into client object
          if (data.client) {
            setClient({ ...data.client, whiteLabelSettings: data.whitelabel })
          } else {
            setClient(null)
          }
          setView(data.user.role === 'super_admin' ? 'admin' : 'client')
        } catch (error) {
          api.logout()
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const handleLoginSuccess = (user, client) => {
    setUser(user)
    setClient(client)
    setView(user.role === 'super_admin' ? 'admin' : 'client')
  }

  const handleLogout = () => {
    api.logout()
    setUser(null)
    setClient(null)
    setView('landing')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <Building2 className="h-16 w-16 text-primary" />
          </motion.div>
          <motion.p 
            className="mt-4 text-white text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading BuildCRM...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <EnhancedLanding 
            onLogin={() => setView('login')} 
            onRegister={() => setView('register')}
            onModuleClick={(module) => {
              // Navigate to module detail page
              window.location.href = `/modules/${module.id}`
            }}
          />
        </motion.div>
      )}
      {view === 'login' && (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginPage 
            onBack={() => setView('landing')} 
            onSuccess={handleLoginSuccess} 
            onRegister={() => setView('register')}
            onForgotPassword={() => setView('forgot-password')}
          />
        </motion.div>
      )}
      {view === 'forgot-password' && (
        <motion.div key="forgot-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ForgotPasswordPage 
            onBack={() => setView('landing')}
            onLogin={() => setView('login')}
          />
        </motion.div>
      )}
      {view === 'register' && (
        <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <RegisterPage onBack={() => setView('landing')} onSuccess={handleLoginSuccess} onLogin={() => setView('login')} />
        </motion.div>
      )}
      {view === 'admin' && user && (
        <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SuperAdminDashboard user={user} onLogout={handleLogout} />
        </motion.div>
      )}
      {view === 'client' && user && (
        <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ClientDashboard user={user} client={client} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
