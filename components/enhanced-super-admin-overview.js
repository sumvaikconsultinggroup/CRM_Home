'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Users, Building2, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Target, Zap, Crown, Shield, Globe,
  Calendar, Clock, CheckCircle2, AlertCircle, XCircle, Package,
  BarChart3, PieChart as PieChartIcon, Sparkles, Star, Award
} from 'lucide-react'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Animated Number Component
const AnimatedValue = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value}{suffix}
    </motion.span>
  )
}

// KPI Card Component
const KPICard = ({ title, value, change, changeLabel, icon: Icon, color, trend = 'up', delay = 0 }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-green-600',
    purple: 'from-purple-500 to-indigo-600',
    orange: 'from-orange-500 to-amber-600',
    pink: 'from-pink-500 to-rose-600',
    cyan: 'from-cyan-500 to-teal-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white">
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5`} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">
                <AnimatedValue value={value} />
              </p>
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : trend === 'down' ? <ArrowDownRight className="h-4 w-4" /> : null}
                  <span className="font-medium">{change}</span>
                  {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Custom Tooltip Component for Pie Chart
const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">{payload[0].value} clients</p>
      </div>
    )
  }
  return null
}

// Custom Tooltip Component for Area Chart
const AreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-blue-600">Revenue: ₹{payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

// Plan Distribution Card
const PlanDistributionCard = ({ clients }) => {
  const planCounts = useMemo(() => {
    const counts = {}
    clients.forEach(c => {
      const plan = c.planName || 'Unknown'
      counts[plan] = (counts[plan] || 0) + 1
    })
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    }))
  }, [clients])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Plan Distribution
        </CardTitle>
        <CardDescription>Client subscription breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={planCounts}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {planCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={PieTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {planCounts.map((plan, i) => (
            <div key={plan.name} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: plan.color }} />
              <span className="text-sm">{plan.name}</span>
              <span className="text-sm font-medium ml-auto">{plan.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Revenue Trend Chart
const RevenueTrendCard = ({ clients }) => {
  // Generate mock monthly data based on clients
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const baseValue = clients.length * 5000
    return months.map((month, i) => ({
      month,
      revenue: Math.round(baseValue * (0.8 + Math.random() * 0.4) * (1 + i * 0.1)),
      clients: Math.max(1, clients.length - 5 + i)
    }))
  }, [clients])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Revenue Trend
        </CardTitle>
        <CardDescription>Monthly revenue and client growth</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-blue-600">Revenue: ₹{payload[0].value.toLocaleString()}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Status Overview Card
const StatusOverviewCard = ({ clients }) => {
  const statusCounts = useMemo(() => {
    const active = clients.filter(c => c.subscriptionStatus === 'active').length
    const paused = clients.filter(c => c.subscriptionStatus === 'paused').length
    const trial = clients.filter(c => c.subscriptionStatus === 'trial').length
    const expired = clients.filter(c => c.subscriptionStatus === 'expired').length
    return { active, paused, trial, expired }
  }, [clients])

  const total = clients.length || 1
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Client Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{statusCounts.active}</span>
              <span className="text-xs text-muted-foreground">({Math.round(statusCounts.active / total * 100)}%)</span>
            </div>
          </div>
          <Progress value={statusCounts.active / total * 100} className="h-2 bg-green-100" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Trial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{statusCounts.trial}</span>
              <span className="text-xs text-muted-foreground">({Math.round(statusCounts.trial / total * 100)}%)</span>
            </div>
          </div>
          <Progress value={statusCounts.trial / total * 100} className="h-2 bg-yellow-100" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Paused</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{statusCounts.paused}</span>
              <span className="text-xs text-muted-foreground">({Math.round(statusCounts.paused / total * 100)}%)</span>
            </div>
          </div>
          <Progress value={statusCounts.paused / total * 100} className="h-2 bg-orange-100" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Expired</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{statusCounts.expired}</span>
              <span className="text-xs text-muted-foreground">({Math.round(statusCounts.expired / total * 100)}%)</span>
            </div>
          </div>
          <Progress value={statusCounts.expired / total * 100} className="h-2 bg-red-100" />
        </div>
      </CardContent>
    </Card>
  )
}

// Top Clients Card
const TopClientsCard = ({ clients }) => {
  const topClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => (b.userCount || 0) - (a.userCount || 0))
      .slice(0, 5)
  }, [clients])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Top Clients
        </CardTitle>
        <CardDescription>By team size and activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topClients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
                {i + 1}
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-semibold">
                {client.businessName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{client.businessName}</p>
                <p className="text-sm text-muted-foreground">{client.planName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{client.userCount || 0}</p>
                <p className="text-xs text-muted-foreground">users</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Module Usage Card
const ModuleUsageCard = ({ clients, modules }) => {
  const moduleUsage = useMemo(() => {
    const usage = {}
    modules.forEach(m => {
      usage[m.id] = { name: m.name, count: 0, icon: m.icon }
    })
    clients.forEach(c => {
      (c.modules || []).forEach(moduleId => {
        if (usage[moduleId]) {
          usage[moduleId].count++
        }
      })
    })
    return Object.values(usage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [clients, modules])

  const maxCount = Math.max(...moduleUsage.map(m => m.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Popular Modules
        </CardTitle>
        <CardDescription>Most used industry modules</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {moduleUsage.map((module, i) => (
            <div key={module.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{module.name}</span>
                <span className="text-sm text-muted-foreground">{module.count} clients</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(module.count / maxCount) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Actions Card
const QuickActionsCard = ({ onAction }) => {
  const actions = [
    { icon: Users, label: 'Add Client', action: 'add-client', color: 'blue' },
    { icon: Package, label: 'Manage Modules', action: 'modules', color: 'purple' },
    { icon: DollarSign, label: 'View Revenue', action: 'revenue', color: 'green' },
    { icon: Globe, label: 'System Health', action: 'health', color: 'cyan' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.action}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover:bg-slate-50"
              onClick={() => onAction?.(action.action)}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Enhanced Overview Component
export function EnhancedSuperAdminOverview({ stats, clients = [], modules = [], onNavigate }) {
  const [timeRange, setTimeRange] = useState('month')
  
  // Calculate metrics
  const totalRevenue = useMemo(() => {
    // Calculate based on client plans
    const planPrices = { basic: 2999, professional: 5999, enterprise: 9999 }
    return clients.reduce((sum, c) => {
      const planKey = c.planId?.toLowerCase() || 'basic'
      return sum + (planPrices[planKey] || 2999)
    }, 0)
  }, [clients])

  const activeClients = clients.filter(c => c.subscriptionStatus === 'active').length
  const avgUsersPerClient = clients.length > 0 
    ? Math.round(clients.reduce((sum, c) => sum + (c.userCount || 0), 0) / clients.length)
    : 0
  const totalModuleAssignments = clients.reduce((sum, c) => sum + (c.modules?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-indigo-600">
                <Shield className="h-6 w-6" />
              </div>
              <Badge className="bg-white/10 text-white border-0 backdrop-blur-sm">
                Super Admin Dashboard
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">Platform Overview</h1>
            <p className="text-white/70 max-w-lg">
              Monitor your SaaS platform performance, client health, and revenue metrics in real-time.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              {['week', 'month', 'year'].map((range) => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'default' : 'outline'}
                  onClick={() => setTimeRange(range)}
                  className={timeRange === range ? 'bg-white text-slate-900' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-white/50">Last updated: Just now</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Clients"
          value={clients.length}
          change="+12%"
          changeLabel="vs last month"
          icon={Building2}
          color="blue"
          trend="up"
          delay={0}
        />
        <KPICard
          title="Active Subscriptions"
          value={activeClients}
          change={`${Math.round(activeClients / Math.max(clients.length, 1) * 100)}%`}
          changeLabel="of total"
          icon={CheckCircle2}
          color="green"
          trend="up"
          delay={0.1}
        />
        <KPICard
          title="Monthly Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          change="+18%"
          changeLabel="vs last month"
          icon={DollarSign}
          color="purple"
          trend="up"
          delay={0.2}
        />
        <KPICard
          title="Avg Users/Client"
          value={avgUsersPerClient}
          change="+3"
          changeLabel="from last month"
          icon={Users}
          color="orange"
          trend="up"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueTrendCard clients={clients} />
        </div>
        <PlanDistributionCard clients={clients} />
      </div>

      {/* Status and Details Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <StatusOverviewCard clients={clients} />
        <TopClientsCard clients={clients} />
        <div className="space-y-6">
          <ModuleUsageCard clients={clients} modules={modules} />
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Platform Activity
                </CardTitle>
                <CardDescription>Latest events across your platform</CardDescription>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients.slice(0, 5).map((client, i) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${
                    client.subscriptionStatus === 'active' ? 'bg-green-100 text-green-600' :
                    client.subscriptionStatus === 'trial' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {client.subscriptionStatus === 'active' ? <CheckCircle2 className="h-4 w-4" /> :
                     client.subscriptionStatus === 'trial' ? <Clock className="h-4 w-4" /> :
                     <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.businessName} {client.subscriptionStatus === 'active' ? 'is active' : 'joined recently'}</p>
                    <p className="text-sm text-muted-foreground">{client.planName} plan • {client.userCount || 0} users</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {client.subscriptionStatus}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
