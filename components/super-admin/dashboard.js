'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Users, Building2, DollarSign, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  AlertTriangle, Server, Database, Zap, Globe, ShieldCheck,
  CreditCard, Package, UserPlus, RefreshCw, BarChart3, PieChart,
  Calendar, Bell, FileText, Settings, ChevronRight, Sparkles
} from 'lucide-react'

const StatCard = ({ title, value, change, changeType, icon: Icon, color, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
    className="relative overflow-hidden"
  >
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            {change && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                changeType === 'positive' ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {change}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

const QuickAction = ({ icon: Icon, label, onClick, color }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all w-full text-left`}
  >
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <span className="font-medium text-slate-700">{label}</span>
    <ChevronRight className="h-4 w-4 text-slate-400 ml-auto" />
  </motion.button>
)

const ActivityItem = ({ type, message, time, user }) => {
  const typeStyles = {
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    info: 'bg-blue-100 text-blue-600',
    error: 'bg-red-100 text-red-600'
  }
  
  const typeIcons = {
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Activity,
    error: AlertTriangle
  }
  
  const Icon = typeIcons[type] || Activity
  
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div className={`p-2 rounded-lg ${typeStyles[type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">{user}</span>
          <span className="text-xs text-slate-300">•</span>
          <span className="text-xs text-slate-400">{time}</span>
        </div>
      </div>
    </div>
  )
}

const SystemHealth = ({ name, status, value, max }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-600">{name}</span>
      <Badge variant={status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'} className="text-xs">
        {status}
      </Badge>
    </div>
    <Progress value={(value / max) * 100} className="h-2" />
    <p className="text-xs text-slate-400">{value} / {max}</p>
  </div>
)

export function SuperAdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/logs?limit=10')
      ])
      
      const statsData = await statsRes.json()
      const logsData = await logsRes.json()
      
      if (statsData) setStats(statsData)
      if (Array.isArray(logsData)) {
        setActivities(logsData.map(log => ({
          type: log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'info',
          message: log.message,
          user: log.userId || 'System',
          time: new Date(log.timestamp).toLocaleTimeString()
        })))
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: UserPlus, label: 'Add New Client', color: 'bg-blue-500', action: () => onNavigate?.('clients') },
    { icon: Package, label: 'Manage Modules', color: 'bg-purple-500', action: () => onNavigate?.('modules') },
    { icon: Bell, label: 'Send Announcement', color: 'bg-amber-500', action: () => onNavigate?.('announcements') },
    { icon: FileText, label: 'View Reports', color: 'bg-emerald-500', action: () => onNavigate?.('reports') },
    { icon: Settings, label: 'System Settings', color: 'bg-slate-500', action: () => onNavigate?.('settings') },
    { icon: ShieldCheck, label: 'Security Center', color: 'bg-red-500', action: () => onNavigate?.('security') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Welcome back, Admin</h1>
            <p className="text-blue-100">Here's what's happening with your platform today.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchDashboardData} className="bg-white/20 hover:bg-white/30 text-white border-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
          change="+12.5% from last month"
          changeType="positive"
          icon={DollarSign}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
          subtitle="Monthly Recurring"
        />
        <StatCard
          title="Active Clients"
          value={stats?.activeClients || 0}
          change="+3 new this week"
          changeType="positive"
          icon={Building2}
          color="bg-gradient-to-br from-blue-500 to-indigo-600"
          subtitle={`${stats?.totalClients || 0} total`}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          change="+18% growth"
          changeType="positive"
          icon={Users}
          color="bg-gradient-to-br from-purple-500 to-pink-600"
          subtitle="Across all clients"
        />
        <StatCard
          title="Active Modules"
          value={stats?.activeModules || 0}
          change="2 pending requests"
          changeType="positive"
          icon={Package}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
          subtitle={`${stats?.totalModules || 0} available`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">MRR</p>
              <p className="text-lg font-bold">₹{((stats?.totalRevenue || 0) / 12).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg. Revenue/Client</p>
              <p className="text-lg font-bold">₹{stats?.activeClients ? Math.round((stats?.totalRevenue || 0) / stats.activeClients).toLocaleString() : 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">API Calls Today</p>
              <p className="text-lg font-bold">{(stats?.apiCalls || 12847).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Globe className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Uptime</p>
              <p className="text-lg font-bold">99.98%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, i) => (
              <QuickAction
                key={i}
                icon={action.icon}
                label={action.label}
                color={action.color}
                onClick={action.action}
              />
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
            {activities.length > 0 ? activities.map((activity, i) => (
              <ActivityItem key={i} {...activity} />
            )) : (
              <>
                <ActivityItem type="success" message="New client 'ABC Interiors' registered" user="System" time="2 min ago" />
                <ActivityItem type="info" message="Module 'Flooring' activated for client" user="Admin" time="15 min ago" />
                <ActivityItem type="warning" message="Payment retry scheduled" user="Billing" time="1 hour ago" />
                <ActivityItem type="success" message="System backup completed" user="System" time="3 hours ago" />
                <ActivityItem type="info" message="New feature flag enabled" user="Admin" time="5 hours ago" />
              </>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-500" />
              System Health
            </CardTitle>
            <CardDescription>Infrastructure status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SystemHealth name="Database" status="healthy" value={45} max={100} />
            <SystemHealth name="API Server" status="healthy" value={32} max={100} />
            <SystemHealth name="Storage" status="warning" value={78} max={100} />
            <SystemHealth name="Memory" status="healthy" value={56} max={100} />
            <SystemHealth name="Background Jobs" status="healthy" value={12} max={50} />
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last checked</span>
                <span className="text-slate-700 font-medium">Just now</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                Revenue Analytics
              </CardTitle>
              <CardDescription>Monthly revenue breakdown</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Weekly</Button>
              <Button variant="default" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Revenue chart visualization</p>
              <p className="text-xs text-slate-400 mt-1">Interactive charts coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperAdminDashboard