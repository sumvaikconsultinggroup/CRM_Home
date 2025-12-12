'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp, TrendingDown, Users, Target, Briefcase, DollarSign,
  CheckCircle2, Clock, AlertCircle, Calendar, ArrowRight, ArrowUpRight,
  BarChart3, PieChart, Activity, Zap, Star, Bell, MessageSquare,
  ChevronRight, Plus, Eye, Phone, Mail, MapPin, MoreHorizontal,
  Sparkles, Rocket, Award, Filter, RefreshCw
} from 'lucide-react'

// Animated counter
const AnimatedNumber = ({ value, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const duration = 1500
    const steps = 40
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

// Mini chart component
const MiniChart = ({ data = [], color = 'primary', height = 40 }) => {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((val, i) => (
        <motion.div
          key={i}
          className={`flex-1 rounded-t bg-gradient-to-t from-${color} to-${color}/60`}
          initial={{ height: 0 }}
          animate={{ height: `${(val / max) * 100}%` }}
          transition={{ delay: i * 0.05, duration: 0.5 }}
        />
      ))}
    </div>
  )
}

// Activity item component
const ActivityItem = ({ activity, index }) => {
  const icons = {
    lead: Target,
    project: Briefcase,
    task: CheckCircle2,
    payment: DollarSign,
    user: Users
  }
  const Icon = icons[activity.type] || Activity
  const colors = {
    lead: 'bg-blue-100 text-blue-600',
    project: 'bg-purple-100 text-purple-600',
    task: 'bg-green-100 text-green-600',
    payment: 'bg-emerald-100 text-emerald-600',
    user: 'bg-orange-100 text-orange-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-4 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <div className={`p-2 rounded-xl ${colors[activity.type] || 'bg-slate-100 text-slate-600'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{activity.title}</p>
        <p className="text-xs text-muted-foreground">{activity.time}</p>
      </div>
    </motion.div>
  )
}

// Task card component
const TaskCard = ({ task, index }) => {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50/50',
    medium: 'border-l-yellow-500 bg-yellow-50/50',
    low: 'border-l-green-500 bg-green-50/50'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-xl border-l-4 ${priorityColors[task.priority] || 'border-l-slate-300 bg-slate-50/50'} hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{task.project}</p>
        </div>
        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs shrink-0">
          {task.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
      </div>
    </motion.div>
  )
}

// Lead card component  
const LeadCard = ({ lead, index }) => {
  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-purple-100 text-purple-700',
    negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl bg-white border hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-semibold shrink-0">
          {lead.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate group-hover:text-primary transition-colors">{lead.name}</p>
          <p className="text-sm text-muted-foreground truncate">{lead.company || lead.email}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <Badge className={`text-xs ${statusColors[lead.status] || 'bg-slate-100 text-slate-700'}`}>
          {lead.status}
        </Badge>
        <span className="text-sm font-semibold text-green-600">₹{(lead.value || 0).toLocaleString()}</span>
      </div>
    </motion.div>
  )
}

export function EnhancedDashboard({ stats, leads = [], projects = [], tasks = [], expenses = [], users = [], client, onNavigate }) {
  const [timeRange, setTimeRange] = useState('week')
  
  // Calculate metrics
  const totalRevenue = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0)
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  const activeProjects = projects.filter(p => p.status === 'in_progress').length
  const newLeads = leads.filter(l => l.status === 'new').length
  const wonLeads = leads.filter(l => l.status === 'won').length
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0

  // Generate chart data
  const chartData = [35, 45, 30, 50, 60, 45, 70]
  const revenueData = [25000, 32000, 28000, 45000, 38000, 52000, 48000]

  // Recent activities (mock)
  const activities = [
    { type: 'lead', title: 'New lead from website', time: '2 min ago' },
    { type: 'task', title: 'Site inspection completed', time: '15 min ago' },
    { type: 'project', title: 'Kitchen renovation started', time: '1 hour ago' },
    { type: 'payment', title: 'Payment received ₹45,000', time: '2 hours ago' },
    { type: 'user', title: 'New team member added', time: '3 hours ago' },
  ]

  // Upcoming tasks
  const upcomingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 4).map((t, i) => ({
    ...t,
    priority: ['high', 'medium', 'low'][i % 3],
    dueDate: 'Due in ' + (i + 1) + ' days',
    project: projects.find(p => p.id === t.projectId)?.name || 'General'
  }))

  // Top leads
  const topLeads = leads.slice(0, 4)

  const statCards = [
    { 
      title: 'Total Revenue', 
      value: totalRevenue || stats?.totalRevenue || 125000,
      prefix: '₹',
      change: '+12.5%',
      positive: true,
      icon: DollarSign,
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-50',
      chartData: revenueData
    },
    { 
      title: 'Active Leads', 
      value: leads.length || stats?.totalLeads || 48,
      change: `${newLeads} new`,
      positive: true,
      icon: Target,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      chartData
    },
    { 
      title: 'Active Projects', 
      value: activeProjects || stats?.activeProjects || 12,
      change: `${projects.length} total`,
      positive: true,
      icon: Briefcase,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      chartData: [20, 35, 25, 40, 30, 45, 35]
    },
    { 
      title: 'Task Completion', 
      value: taskCompletionRate,
      suffix: '%',
      change: `${completedTasks}/${tasks.length} done`,
      positive: taskCompletionRate >= 50,
      icon: CheckCircle2,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      chartData: [60, 65, 55, 70, 75, 68, taskCompletionRate]
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white p-8"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-6 w-6 text-yellow-300" />
              <Badge className="bg-white/20 text-white border-0">
                {client?.planId?.toUpperCase() || 'PROFESSIONAL'} Plan
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {client?.businessName?.split(' ')[0] || 'Builder'}! 👋
            </h1>
            <p className="text-white/80 max-w-lg">
              Here's what's happening with your business today. You have {pendingTasks} pending tasks and {newLeads} new leads waiting for your attention.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
              onClick={() => onNavigate?.('leads')}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Lead
            </Button>
            <Button 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => onNavigate?.('reports')}
            >
              <BarChart3 className="h-4 w-4 mr-2" /> View Reports
            </Button>
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 top-0 h-20 w-20 rounded-full bg-yellow-300/20 blur-xl" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-lg group cursor-pointer overflow-hidden relative">
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${stat.color} blur-3xl`} style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }} />
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ color: stat.color.includes('emerald') ? '#10b981' : stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('purple') ? '#a855f7' : '#f97316' }} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {stat.change}
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">
                    <AnimatedNumber value={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix || ''} />
                  </p>
                </div>
                <div className="h-10 opacity-50">
                  <div className="flex items-end gap-1 h-full">
                    {stat.chartData.map((val, j) => {
                      const max = Math.max(...stat.chartData)
                      return (
                        <motion.div
                          key={j}
                          className={`flex-1 rounded-t bg-gradient-to-t ${stat.color}`}
                          initial={{ height: 0 }}
                          animate={{ height: `${(val / max) * 100}%` }}
                          transition={{ delay: i * 0.1 + j * 0.05, duration: 0.5 }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 shadow-lg border-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Performance Overview</h3>
                <p className="text-sm text-muted-foreground">Track your business metrics</p>
              </div>
              <div className="flex gap-2">
                {['week', 'month', 'year'].map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={timeRange === range ? 'default' : 'outline'}
                    onClick={() => setTimeRange(range)}
                    className="capitalize"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="h-64 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 flex items-end justify-around px-4 pb-8">
                {revenueData.map((val, i) => {
                  const max = Math.max(...revenueData)
                  const height = (val / max) * 100
                  return (
                    <motion.div
                      key={i}
                      className="w-12 bg-gradient-to-t from-primary to-indigo-500 rounded-t-lg relative group"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{val.toLocaleString()}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              <div className="absolute bottom-2 left-0 right-0 flex justify-around px-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day} className="text-xs text-muted-foreground">{day}</span>
                ))}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-blue-50">
                <p className="text-sm text-blue-600 font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold text-blue-700">{conversionRate}%</p>
              </div>
              <div className="p-4 rounded-xl bg-green-50">
                <p className="text-sm text-green-600 font-medium">Avg. Deal Size</p>
                <p className="text-2xl font-bold text-green-700">₹{Math.round((totalRevenue || 100000) / (wonLeads || 1)).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-50">
                <p className="text-sm text-purple-600 font-medium">Team Efficiency</p>
                <p className="text-2xl font-bold text-purple-700">{taskCompletionRate}%</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 shadow-lg border-0 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Latest updates</p>
              </div>
              <Button variant="ghost" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {activities.map((activity, i) => (
                <ActivityItem key={i} activity={activity} index={i} />
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-primary">
              View All Activity <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 shadow-lg border-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Upcoming Tasks</h3>
                <p className="text-sm text-muted-foreground">{pendingTasks} pending tasks</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('tasks')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, i) => (
                  <TaskCard key={task.id || i} task={task} index={i} />
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">All caught up! No pending tasks.</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Top Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 shadow-lg border-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Recent Leads</h3>
                <p className="text-sm text-muted-foreground">{newLeads} new this week</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('leads')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {topLeads.length > 0 ? (
                topLeads.map((lead, i) => (
                  <LeadCard key={lead.id || i} lead={lead} index={i} />
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground">No leads yet. Start by adding one!</p>
                  <Button className="mt-3" onClick={() => onNavigate?.('leads')}>
                    <Plus className="h-4 w-4 mr-2" /> Add Lead
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Team Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6 shadow-lg border-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Team Performance</h3>
              <p className="text-sm text-muted-foreground">{users.length} team members</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('users')}>
              Manage Team
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.slice(0, 4).map((user, i) => (
              <motion.div
                key={user.id || i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tasks Done</span>
                    <span className="font-medium">{Math.floor(Math.random() * 20) + 5}</span>
                  </div>
                  <Progress value={Math.floor(Math.random() * 40) + 60} className="h-1.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
