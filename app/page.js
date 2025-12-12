'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { 
  Building2, Users, TrendingUp, DollarSign, CheckCircle2, Clock, AlertCircle, 
  LayoutDashboard, Briefcase, ClipboardList, Receipt, Settings, LogOut, Menu, X,
  Plus, MoreVertical, Edit, Trash2, Eye, ChevronRight, Building, Shield, Layers,
  ChefHat, Grid3X3, Sofa, HardHat, Paintbrush, Wrench, Zap, Phone, Mail, Target,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Calendar, UserPlus, Package
} from 'lucide-react'

// ==================== LANDING PAGE ====================
function LandingPage({ onLogin, onRegister }) {
  const [plans, setPlans] = useState([])
  const [modules, setModules] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, modulesData] = await Promise.all([
          api.getPlans(),
          api.getPublicModules()
        ])
        setPlans(plansData)
        setModules(modulesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  const moduleIcons = {
    'Wooden Flooring': Layers,
    'Kitchens': ChefHat,
    'Tiles': Grid3X3,
    'Furniture': Sofa,
    'Contractors': HardHat,
    'Painting': Paintbrush,
    'Plumbing': Wrench,
    'Electrical': Zap
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">BuildCRM</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onLogin}>Login</Button>
            <Button onClick={onRegister}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4" variant="secondary">🚀 Built for Construction & Home Improvement</Badge>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          The Complete <span className="text-primary">CRM Solution</span><br />
          for Your Business
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Manage leads, projects, tasks, and expenses all in one place. 
          Industry-specific modules tailored for your business needs.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={onRegister}>
            Start Free Trial <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline">Watch Demo</Button>
        </div>
        <div className="mt-12">
          <img 
            src="https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1200" 
            alt="Team Collaboration"
            className="rounded-xl shadow-2xl mx-auto max-w-4xl w-full"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything You Need to Grow</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Powerful features designed specifically for construction and home improvement businesses
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Target, title: 'Lead Management', desc: 'Capture and track leads from multiple sources' },
            { icon: Briefcase, title: 'Project Tracking', desc: 'Monitor projects from start to completion' },
            { icon: ClipboardList, title: 'Task Management', desc: 'Assign and track tasks with multiple views' },
            { icon: Receipt, title: 'Expense Tracking', desc: 'Track all business expenses and generate reports' },
            { icon: Users, title: 'Team Management', desc: 'Manage users with role-based permissions' },
            { icon: BarChart3, title: 'Analytics', desc: 'Detailed reports and business insights' },
            { icon: Phone, title: 'WhatsApp Integration', desc: 'Automated notifications via WhatsApp' },
            { icon: Package, title: 'Industry Modules', desc: 'Specialized modules for your industry' }
          ].map((feature, i) => (
            <Card key={i} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Modules Section */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Industry-Specific Modules</h2>
          <p className="text-center text-muted-foreground mb-12">
            Choose the modules that fit your business at ₹999/month each
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module) => {
              const Icon = moduleIcons[module.name] || Package
              return (
                <Card key={module.id} className="hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <Icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                    <p className="text-lg font-bold mt-3">₹{module.price}<span className="text-sm font-normal">/month</span></p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-center text-muted-foreground mb-12">Choose the plan that works best for your business</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.id === 'professional' ? 'border-primary shadow-xl scale-105' : ''}>
              {plan.id === 'professional' && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">₹{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.billingCycle}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.id === 'professional' ? 'default' : 'outline'} onClick={onRegister}>
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-lg opacity-90 mb-8">Start your 30-day free trial today. No credit card required.</p>
          <Button size="lg" variant="secondary" onClick={onRegister}>
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Building2 className="h-6 w-6" />
              <span className="text-xl font-bold text-white">BuildCRM</span>
            </div>
            <p className="text-sm">© 2025 BuildCRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ==================== AUTH PAGES ====================
function LoginPage({ onBack, onSuccess, onRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.login(email, password)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.client) {
        localStorage.setItem('client', JSON.stringify(data.client))
      }
      toast.success('Login successful!')
      onSuccess(data.user, data.client)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <button onClick={onRegister} className="text-primary hover:underline">Register</button>
          </div>
          <div className="mt-4">
            <Button variant="ghost" className="w-full" onClick={onBack}>
              ← Back to Home
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="text-center text-sm text-muted-foreground">
            <p>Super Admin: admin@buildcrm.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RegisterPage({ onBack, onSuccess, onLogin }) {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    phone: '',
    planId: 'basic'
  })
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getPlans().then(setPlans).catch(console.error)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.register(
        formData.businessName,
        formData.email,
        formData.password,
        formData.phone,
        formData.planId
      )
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('client', JSON.stringify(data.client))
      toast.success('Registration successful!')
      onSuccess(data.user, data.client)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Start your 30-day free trial</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input 
                id="businessName"
                placeholder="Your Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select value={formData.planId} onValueChange={(value) => setFormData({...formData, planId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <button onClick={onLogin} className="text-primary hover:underline">Sign in</button>
          </div>
          <div className="mt-4">
            <Button variant="ghost" className="w-full" onClick={onBack}>
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== SUPER ADMIN DASHBOARD ====================
function SuperAdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [modules, setModules] = useState([])
  const [plans, setPlans] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, clientsData, modulesData, plansData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminClients(),
        api.getAdminModules(),
        api.getPlans()
      ])
      setStats(statsData)
      setClients(clientsData)
      setModules(modulesData)
      setPlans(plansData)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleStatus = async (clientId) => {
    try {
      await api.toggleClientStatus(clientId)
      toast.success('Client status updated')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleModuleToggle = async (clientId, moduleId, currentlyEnabled) => {
    try {
      await api.updateClientModules(clientId, moduleId, currentlyEnabled ? 'remove' : 'add')
      toast.success('Module updated')
      if (selectedClient) {
        const updatedClient = await api.getAdminClient(clientId)
        setSelectedClient(updatedClient)
      }
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'clients', icon: Building, label: 'Clients' },
    { id: 'modules', icon: Package, label: 'Modules' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          {sidebarOpen && <span className="text-xl font-bold">Admin Panel</span>}
        </div>
        <nav className="flex-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                activeTab === item.id ? 'bg-primary text-white' : 'hover:bg-slate-800'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-red-400"
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Super Admin</Badge>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalClients}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500">{stats.activeClients} active</span> / {stats.pausedClients} paused
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">Across all clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats.monthlyRevenue?.toLocaleString()}</div>
                    <p className="text-xs text-green-500 flex items-center">
                      <ArrowUpRight className="h-3 w-3" /> 12% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats.annualRevenue?.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Projected</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Clients */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Clients</CardTitle>
                  <CardDescription>Latest client registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clients.slice(0, 5).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{client.businessName}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={client.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {client.subscriptionStatus}
                          </Badge>
                          <Badge variant="outline">{client.planId}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Clients</CardTitle>
                  <CardDescription>Manage client subscriptions and modules</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium">{client.businessName}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{plans.find(p => p.id === client.planId)?.name || client.planId}</Badge>
                            <Badge variant={client.subscriptionStatus === 'active' ? 'default' : 'destructive'}>
                              {client.subscriptionStatus}
                            </Badge>
                            {client.modules?.length > 0 && (
                              <Badge variant="secondary">{client.modules.length} modules</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedClient(client)}>
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{client.businessName}</DialogTitle>
                                <DialogDescription>Manage client details and modules</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Email</Label>
                                    <p className="text-sm">{client.email}</p>
                                  </div>
                                  <div>
                                    <Label>Phone</Label>
                                    <p className="text-sm">{client.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label>Plan</Label>
                                    <p className="text-sm">{plans.find(p => p.id === client.planId)?.name}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <p className="text-sm">{client.subscriptionStatus}</p>
                                  </div>
                                </div>
                                <Separator />
                                <div>
                                  <Label className="mb-2 block">Assigned Modules</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {modules.map((module) => (
                                      <div key={module.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                        <span className="text-sm">{module.name}</span>
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
                            onClick={() => handleToggleStatus(client.id)}
                          >
                            {client.subscriptionStatus === 'active' ? 'Pause' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Industry Modules</CardTitle>
                  <CardDescription>Manage available modules and pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modules.map((module) => (
                      <Card key={module.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{module.name}</CardTitle>
                            <Badge variant={module.active ? 'default' : 'secondary'}>
                              {module.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{module.description}</p>
                          <p className="text-lg font-bold">₹{module.price}/month</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure global platform settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Settings configuration coming soon...</p>
              </CardContent>
            </Card>
          )}
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

  // Dialogs
  const [showLeadDialog, setShowLeadDialog] = useState(false)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

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
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'leads', icon: Target, label: 'Leads' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'tasks', icon: ClipboardList, label: 'Tasks' },
    { id: 'expenses', icon: Receipt, label: 'Expenses' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    { id: 'modules', icon: Package, label: 'Modules' }
  ]

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-purple-100 text-purple-800',
    proposal: 'bg-orange-100 text-orange-800',
    negotiation: 'bg-pink-100 text-pink-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
    planning: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    on_hold: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    todo: 'bg-slate-100 text-slate-800',
    review: 'bg-purple-100 text-purple-800',
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }

  // Lead handlers
  const handleSaveLead = async (formData) => {
    try {
      if (editingItem) {
        await api.updateLead(editingItem.id, formData)
        toast.success('Lead updated')
      } else {
        await api.createLead(formData)
        toast.success('Lead created')
      }
      setShowLeadDialog(false)
      setEditingItem(null)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return
    try {
      await api.deleteLead(id)
      toast.success('Lead deleted')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Project handlers
  const handleSaveProject = async (formData) => {
    try {
      if (editingItem) {
        await api.updateProject(editingItem.id, formData)
        toast.success('Project updated')
      } else {
        await api.createProject(formData)
        toast.success('Project created')
      }
      setShowProjectDialog(false)
      setEditingItem(null)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project?')) return
    try {
      await api.deleteProject(id)
      toast.success('Project deleted')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Task handlers
  const handleSaveTask = async (formData) => {
    try {
      if (editingItem) {
        await api.updateTask(editingItem.id, formData)
        toast.success('Task updated')
      } else {
        await api.createTask(formData)
        toast.success('Task created')
      }
      setShowTaskDialog(false)
      setEditingItem(null)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.deleteTask(id)
      toast.success('Task deleted')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Expense handlers
  const handleSaveExpense = async (formData) => {
    try {
      if (editingItem) {
        await api.updateExpense(editingItem.id, formData)
        toast.success('Expense updated')
      } else {
        await api.createExpense(formData)
        toast.success('Expense created')
      }
      setShowExpenseDialog(false)
      setEditingItem(null)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return
    try {
      await api.deleteExpense(id)
      toast.success('Expense deleted')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // User handlers
  const handleSaveUser = async (formData) => {
    try {
      if (editingItem) {
        await api.updateUser(editingItem.id, formData)
        toast.success('User updated')
      } else {
        await api.createUser(formData)
        toast.success('User created')
      }
      setShowUserDialog(false)
      setEditingItem(null)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user?')) return
    try {
      await api.deleteUser(id)
      toast.success('User deleted')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center gap-3 border-b">
          <Building2 className="h-8 w-8 text-primary" />
          {sidebarOpen && <span className="text-xl font-bold">BuildCRM</span>}
        </div>
        <nav className="flex-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                activeTab === item.id ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600"
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{client?.businessName || 'Dashboard'}</h1>
              <p className="text-sm text-muted-foreground">{menuItems.find(m => m.id === activeTab)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{client?.planId?.toUpperCase()}</Badge>
            <span className="text-sm text-muted-foreground">{user.name}</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalLeads}</div>
                    <p className="text-xs text-green-500">{stats.conversionRate}% conversion rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats.pipelineValue?.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{stats.wonLeads} deals won</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeProjects}</div>
                    <p className="text-xs text-muted-foreground">of {stats.totalProjects} total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completedTasks}/{stats.totalTasks}</div>
                    <Progress value={parseFloat(stats.taskCompletionRate)} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Recent Items Grid */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Leads */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Recent Leads</CardTitle>
                      <CardDescription>Latest lead activity</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('leads')}>View All</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leads.slice(0, 5).map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.source}</p>
                          </div>
                          <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Tasks */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Recent Tasks</CardTitle>
                      <CardDescription>Your task overview</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('tasks')}>View All</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={statusColors[task.priority]}>{task.priority}</Badge>
                            <Badge className={statusColors[task.status]}>{task.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Leads Tab */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Leads</h2>
                <Button onClick={() => { setEditingItem(null); setShowLeadDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Lead
                </Button>
              </div>

              {/* Lead Pipeline View */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((status) => (
                  <Card key={status} className="min-h-[200px]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize flex items-center justify-between">
                        {status}
                        <Badge variant="secondary">{leads.filter(l => l.status === status).length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {leads.filter(l => l.status === status).map((lead) => (
                        <div key={lead.id} className="p-2 bg-slate-50 rounded text-sm cursor-pointer hover:bg-slate-100"
                          onClick={() => { setEditingItem(lead); setShowLeadDialog(true); }}>
                          <p className="font-medium truncate">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">₹{lead.value?.toLocaleString()}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Lead Dialog */}
              <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                  </DialogHeader>
                  <LeadForm 
                    initialData={editingItem} 
                    onSave={handleSaveLead} 
                    onDelete={editingItem ? () => handleDeleteLead(editingItem.id) : null}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Projects</h2>
                <Button onClick={() => { setEditingItem(null); setShowProjectDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Project
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setEditingItem(project); setShowProjectDialog(true); }}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteProject(project.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Budget: ₹{project.budget?.toLocaleString()}</span>
                          <Badge className={statusColors[project.status]}>{project.status?.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Project' : 'Add New Project'}</DialogTitle>
                  </DialogHeader>
                  <ProjectForm 
                    initialData={editingItem} 
                    onSave={handleSaveProject}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Tasks</h2>
                <Button onClick={() => { setEditingItem(null); setShowTaskDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Task
                </Button>
              </div>

              {/* Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['todo', 'in_progress', 'review', 'completed'].map((status) => (
                  <Card key={status}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize flex items-center justify-between">
                        {status.replace('_', ' ')}
                        <Badge variant="secondary">{tasks.filter(t => t.status === status).length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 min-h-[300px]">
                      {tasks.filter(t => t.status === status).map((task) => (
                        <div key={task.id} className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                          onClick={() => { setEditingItem(task); setShowTaskDialog(true); }}>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <Badge className={statusColors[task.priority]} variant="secondary">{task.priority}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                  </DialogHeader>
                  <TaskForm 
                    initialData={editingItem} 
                    onSave={handleSaveTask}
                    onDelete={editingItem ? () => handleDeleteTask(editingItem.id) : null}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Expenses</h2>
                <Button onClick={() => { setEditingItem(null); setShowExpenseDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Expense
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.category} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">₹{expense.amount?.toLocaleString()}</span>
                          <Badge variant={expense.approved ? 'default' : 'secondary'}>
                            {expense.approved ? 'Approved' : 'Pending'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => { setEditingItem(expense); setShowExpenseDialog(true); }}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteExpense(expense.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                  </DialogHeader>
                  <ExpenseForm 
                    initialData={editingItem} 
                    onSave={handleSaveExpense}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Team Members</h2>
                <Button onClick={() => { setEditingItem(null); setShowUserDialog(true); }}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add User
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{u.role?.replace('_', ' ')}</Badge>
                          {u.id !== user.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => { setEditingItem(u); setShowUserDialog(true); }}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(u.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit User' : 'Add New User'}</DialogTitle>
                  </DialogHeader>
                  <UserForm 
                    initialData={editingItem} 
                    onSave={handleSaveUser}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <ReportsSection />
          )}

          {/* Modules Tab */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Industry Modules</h2>
              <p className="text-muted-foreground">Contact your administrator to enable additional modules.</p>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {modules.map((module) => (
                  <Card key={module.id} className={module.enabled ? 'border-primary' : 'opacity-60'}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{module.name}</CardTitle>
                        <Badge variant={module.enabled ? 'default' : 'secondary'}>
                          {module.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                      <p className="text-lg font-bold mt-2">₹{module.price}/month</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ==================== FORM COMPONENTS ====================
function LeadForm({ initialData, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    source: initialData?.source || 'Website',
    status: initialData?.status || 'new',
    value: initialData?.value || 0,
    notes: initialData?.notes || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Value (₹)</Label>
          <Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: parseInt(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Website', 'Referral', 'Meta Ads', 'Google Ads', 'Indiamart', 'Justdial'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
      </div>
      <div className="flex justify-between">
        {onDelete && <Button type="button" variant="destructive" onClick={onDelete}>Delete</Button>}
        <Button type="submit" className="ml-auto">Save</Button>
      </div>
    </form>
  )
}

function ProjectForm({ initialData, onSave }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'planning',
    budget: initialData?.budget || 0,
    progress: initialData?.progress || 0,
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['planning', 'in_progress', 'on_hold', 'completed'].map(s => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Budget (₹)</Label>
          <Input type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Progress (%)</Label>
          <Input type="number" min="0" max="100" value={formData.progress} onChange={(e) => setFormData({...formData, progress: parseInt(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
        </div>
      </div>
      <Button type="submit" className="w-full">Save Project</Button>
    </form>
  )
}

function TaskForm({ initialData, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'todo',
    priority: initialData?.priority || 'medium',
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Task Title</Label>
        <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['todo', 'in_progress', 'review', 'completed'].map(s => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Due Date</Label>
          <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
        </div>
      </div>
      <div className="flex justify-between">
        {onDelete && <Button type="button" variant="destructive" onClick={onDelete}>Delete</Button>}
        <Button type="submit" className="ml-auto">Save Task</Button>
      </div>
    </form>
  )
}

function ExpenseForm({ initialData, onSave }) {
  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    category: initialData?.category || 'Materials',
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount (₹)</Label>
          <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 0})} required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Materials', 'Labor', 'Equipment', 'Marketing', 'Office', 'Travel'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Date</Label>
          <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
        </div>
      </div>
      <Button type="submit" className="w-full">Save Expense</Button>
    </form>
  )
}

function UserForm({ initialData, onSave }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: '',
    role: initialData?.role || 'sales_rep'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...formData }
    if (!data.password) delete data.password
    onSave(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={!!initialData} />
      </div>
      <div className="space-y-2">
        <Label>{initialData ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
        <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!initialData} />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['client_admin', 'sales_rep', 'project_manager', 'installer'].map(r => (
              <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Save User</Button>
    </form>
  )
}

function ReportsSection() {
  const [salesReport, setSalesReport] = useState(null)
  const [expensesReport, setExpensesReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [sales, expenses] = await Promise.all([
          api.getSalesReport(),
          api.getExpensesReport()
        ])
        setSalesReport(sales)
        setExpensesReport(expenses)
      } catch (error) {
        toast.error('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  if (loading) {
    return <div className="text-center py-12">Loading reports...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports & Analytics</h2>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="expenses">Expense Report</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(salesReport?.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="capitalize">{status}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(salesReport?.bySource || {}).map(([source, count]) => (
                    <div key={source} className="flex justify-between items-center">
                      <span>{source}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesReport?.monthlyData?.map((data) => (
                  <div key={data.month} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="font-medium">{data.month}</span>
                    <div className="flex gap-4">
                      <span>{data.leads} leads</span>
                      <span className="font-bold">₹{data.value?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(expensesReport?.byCategory || {}).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span>{category}</span>
                    <span className="font-bold">₹{amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expensesReport?.monthlyData?.map((data) => (
                  <div key={data.month} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="font-medium">{data.month}</span>
                    <span className="font-bold">₹{data.total?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function App() {
  const [view, setView] = useState('landing') // landing, login, register, admin, client
  const [user, setUser] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const data = await api.getMe()
          setUser(data.user)
          setClient(data.client)
          if (data.user.role === 'super_admin') {
            setView('admin')
          } else {
            setView('client')
          }
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
    if (user.role === 'super_admin') {
      setView('admin')
    } else {
      setView('client')
    }
  }

  const handleLogout = () => {
    api.logout()
    setUser(null)
    setClient(null)
    setView('landing')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {view === 'landing' && (
        <LandingPage 
          onLogin={() => setView('login')} 
          onRegister={() => setView('register')} 
        />
      )}
      {view === 'login' && (
        <LoginPage 
          onBack={() => setView('landing')} 
          onSuccess={handleLoginSuccess}
          onRegister={() => setView('register')}
        />
      )}
      {view === 'register' && (
        <RegisterPage 
          onBack={() => setView('landing')} 
          onSuccess={handleLoginSuccess}
          onLogin={() => setView('login')}
        />
      )}
      {view === 'admin' && user && (
        <SuperAdminDashboard user={user} onLogout={handleLogout} />
      )}
      {view === 'client' && user && (
        <ClientDashboard user={user} client={client} onLogout={handleLogout} />
      )}
    </>
  )
}
