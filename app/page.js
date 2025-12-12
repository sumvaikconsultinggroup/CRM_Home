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
  Globe, Image, FileText, Star, Crown, ChevronDown, ExternalLink
} from 'lucide-react'
import FlooringModule from './flooring/page'
import { LeadForm, ProjectForm, TaskForm, ExpenseForm, UserForm } from '@/components/client-forms'

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
function LandingPage({ onLogin, onRegister }) {
  const [plans, setPlans] = useState([])
  const [modules, setModules] = useState([])
  const [isScrolled, setIsScrolled] = useState(false)

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

    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <motion.header 
        className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-indigo-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">BuildCRM</span>
          </motion.div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onLogin} className="hover:bg-white/50">Login</Button>
            <Button onClick={onRegister} className="bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-lg shadow-primary/25">
              Get Started <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Badge className="mb-6 px-4 py-2 text-sm bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/20" variant="outline">
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Built for Construction & Home Improvement
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            The Complete{' '}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              CRM Solution
            </span>
            <br />for Your Business
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Manage leads, projects, tasks, and expenses all in one place. 
            Industry-specific modules tailored for your business needs.
          </p>
          <div className="flex gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" onClick={onRegister} className="bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/25 px-8 py-6 text-lg">
                Start Free Trial <ArrowUpRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg backdrop-blur-sm bg-white/50">
                Watch Demo
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div 
          className="mt-16 relative"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10" />
          <GlassCard className="mx-auto max-w-5xl overflow-hidden">
            <img 
              src="https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=1200" 
              alt="Dashboard Preview"
              className="w-full h-auto"
            />
          </GlassCard>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-4">Everything You Need to Grow</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for construction and home improvement businesses
          </p>
        </motion.div>
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {[
            { icon: Target, title: 'Lead Management', desc: 'Capture and track leads from multiple sources', color: 'from-blue-500 to-cyan-500' },
            { icon: Briefcase, title: 'Project Tracking', desc: 'Monitor projects from start to completion', color: 'from-green-500 to-emerald-500' },
            { icon: ClipboardList, title: 'Task Management', desc: 'Assign and track tasks with multiple views', color: 'from-orange-500 to-amber-500' },
            { icon: Receipt, title: 'Expense Tracking', desc: 'Track all business expenses and reports', color: 'from-purple-500 to-pink-500' },
            { icon: Users, title: 'Team Management', desc: 'Manage users with role-based permissions', color: 'from-red-500 to-rose-500' },
            { icon: BarChart3, title: 'Analytics', desc: 'Detailed reports and business insights', color: 'from-indigo-500 to-violet-500' },
            { icon: Phone, title: 'WhatsApp Integration', desc: 'Automated notifications via WhatsApp', color: 'from-teal-500 to-green-500' },
            { icon: Package, title: 'Industry Modules', desc: 'Specialized modules for your industry', color: 'from-pink-500 to-fuchsia-500' }
          ].map((feature, i) => (
            <motion.div key={i} variants={fadeIn}>
              <GlassCard className="h-full p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Industry-Specific Modules</h2>
            <p className="text-slate-400">Choose the modules that fit your business at ₹999/month each</p>
          </motion.div>
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {modules.map((module, i) => {
              const Icon = moduleIcons[module.name] || Package
              return (
                <motion.div key={module.id} variants={fadeIn}>
                  <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 hover:-translate-y-1">
                    <Icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{module.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{module.description}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">₹{module.price}</span>
                      <span className="text-slate-400">/month</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground">Choose the plan that works best for your business</p>
        </motion.div>
        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.id} 
              variants={fadeIn}
              whileHover={{ y: -10 }}
            >
              <GlassCard className={`h-full relative overflow-hidden ${plan.id === 'professional' ? 'border-2 border-primary shadow-2xl shadow-primary/20' : ''}`}>
                {plan.id === 'professional' && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-medium px-4 py-1 rounded-bl-xl">
                    Most Popular
                  </div>
                )}
                {plan.id === 'enterprise' && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium px-4 py-1 rounded-bl-xl flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Enterprise
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold">₹{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.billingCycle}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.id === 'professional' ? 'bg-gradient-to-r from-primary to-indigo-600' : ''}`}
                    variant={plan.id === 'professional' ? 'default' : 'outline'}
                    onClick={onRegister}
                  >
                    Get Started
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <GlassCard className="bg-gradient-to-r from-primary to-indigo-600 text-white p-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Business?</h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Start your 30-day free trial today. No credit card required.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="secondary" onClick={onRegister} className="px-8 py-6 text-lg">
                  Start Free Trial <ArrowUpRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="p-2 rounded-lg bg-primary/20">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-white">BuildCRM</span>
            </div>
            <p className="text-sm">© 2025 BuildCRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ==================== LOGIN PAGE ====================
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
      toast.success('Welcome back!')
      onSuccess(data.user, data.client)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="bg-white/10 border-white/20">
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div 
                className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 mb-4"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Building2 className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
              <p className="text-slate-400">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input 
                  type="email" 
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Password</Label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-indigo-600" disabled={loading}>
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </motion.div>
                ) : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-400">Don't have an account? </span>
              <button onClick={onRegister} className="text-primary hover:underline">Register</button>
            </div>

            <Button variant="ghost" className="w-full mt-4 text-slate-400 hover:text-white" onClick={onBack}>
              ← Back to Home
            </Button>

            <Separator className="my-6 bg-white/10" />
            <div className="text-center text-xs text-slate-500">
              <p>Super Admin: admin@buildcrm.com / admin123</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

// ==================== REGISTER PAGE ====================
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
      toast.success('Account created successfully!')
      onSuccess(data.user, data.client)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="bg-white/10 border-white/20">
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div 
                className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 mb-4"
                whileHover={{ scale: 1.1 }}
              >
                <Building2 className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white">Create Account</h1>
              <p className="text-slate-400">Start your 30-day free trial</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Business Name</Label>
                <Input 
                  placeholder="Your Business Name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input 
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input 
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Password</Label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Select Plan</Label>
                <Select value={formData.planId} onValueChange={(value) => setFormData({...formData, planId: value})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-indigo-600" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-400">Already have an account? </span>
              <button onClick={onLogin} className="text-primary hover:underline">Sign in</button>
            </div>

            <Button variant="ghost" className="w-full mt-4 text-slate-400 hover:text-white" onClick={onBack}>
              ← Back to Home
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

// ==================== SUPER ADMIN DASHBOARD ====================
function SuperAdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [modules, setModules] = useState([])
  const [moduleRequests, setModuleRequests] = useState([])
  const [plans, setPlans] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex">
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
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Total Clients" 
                    value={stats.overview.totalClients} 
                    change={`${stats.overview.activeClients} active`}
                    icon={Building}
                    delay={0}
                  />
                  <StatCard 
                    title="Total Users" 
                    value={stats.overview.totalUsers}
                    icon={Users}
                    delay={0.1}
                  />
                  <StatCard 
                    title="Monthly Revenue" 
                    value={`₹${stats.overview.monthlyRevenue?.toLocaleString()}`}
                    change="+12% from last month"
                    icon={DollarSign}
                    delay={0.2}
                  />
                  <StatCard 
                    title="Annual Revenue" 
                    value={`₹${stats.overview.annualRevenue?.toLocaleString()}`}
                    icon={TrendingUp}
                    delay={0.3}
                  />
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Revenue Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={stats.charts.monthlyGrowth}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255,255,255,0.9)', 
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.charts.planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="plan"
                          label={({ plan, count }) => `${plan}: ${count}`}
                        >
                          {stats.charts.planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </div>

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
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

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
                              <p className="text-sm mt-1">"{request.message}"</p>
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
              >
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Platform Settings</h3>
                  <p className="text-muted-foreground">Platform configuration coming soon...</p>
                </GlassCard>
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
  }, [fetchData])

  // Check if wooden flooring module is enabled
  const hasFlooringModule = modules.some(m => m.id === 'wooden-flooring' && m.enabled)

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'leads', icon: Target, label: 'Leads' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'tasks', icon: ClipboardList, label: 'Tasks' },
    { id: 'expenses', icon: Receipt, label: 'Expenses' },
    { id: 'users', icon: Users, label: 'Team' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    // Add Wooden Flooring module link if enabled
    ...(hasFlooringModule ? [{ id: 'flooring-module', icon: Layers, label: 'Wooden Flooring', isModule: true }] : []),
    { id: 'modules', icon: Package, label: 'Modules' },
    { id: 'whitelabel', icon: Palette, label: 'White Label' }
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

                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((status) => (
                    <GlassCard key={status} className="min-h-[400px]">
                      <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
                          <span className="font-medium capitalize text-sm">{status}</span>
                        </div>
                        <Badge variant="secondary">{leads.filter(l => l.status === status).length}</Badge>
                      </div>
                      <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                        {leads.filter(l => l.status === status).map((lead) => (
                          <motion.div
                            key={lead.id}
                            className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => { setDialogType('lead'); setEditingItem(lead); setShowDialog(true); }}
                          >
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.source}</p>
                            <p className="text-sm font-bold text-primary mt-1">₹{lead.value?.toLocaleString()}</p>
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  ))}
                </div>
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
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant={task.priority === 'urgent' || task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                {task.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(task.dueDate).toLocaleDateString()}
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

                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4">Recent Expenses</h3>
                  <div className="space-y-3">
                    {expenses.map((expense, i) => (
                      <motion.div
                        key={expense.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">₹{expense.amount?.toLocaleString()}</span>
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
                <h2 className="text-2xl font-bold">Reports & Analytics</h2>

                <Tabs defaultValue="sales" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="sales">Sales Report</TabsTrigger>
                    <TabsTrigger value="expenses">Expense Report</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sales" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4">Monthly Performance</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={stats.charts.monthlyLeads}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} />
                            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </GlassCard>

                      <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4">Lead Sources Performance</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={stats.charts.leadSources}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="source" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </GlassCard>
                    </div>
                  </TabsContent>

                  <TabsContent value="expenses" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4">Expenses by Category</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={stats.charts.expenseCategories}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="total"
                              nameKey="category"
                              label={({ category, total }) => `${category}: ₹${total?.toLocaleString()}`}
                            >
                              {stats.charts.expenseCategories.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </GlassCard>

                      <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4">Monthly Expenses</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={stats.charts.monthlyExpenses}>
                            <defs>
                              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="total" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </GlassCard>
                    </div>
                  </TabsContent>
                </Tabs>
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
                          'electrical': Zap
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
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
                      <Crown className="h-4 w-4 mr-2" /> Upgrade to Enterprise
                    </Button>
                  </GlassCard>
                )}
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
                  toast.error(error.message || 'Operation failed')
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
                  toast.error(error.message || 'Operation failed')
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
    companyName: '',
    customDomain: '',
    enabled: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getWhitelabel()
      .then(data => setSettings(s => ({ ...s, ...data })))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      await api.updateWhitelabel(settings)
      toast.success('White label settings saved!')
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <GlassCard className="p-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
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
          </div>
          <div className="space-y-2">
            <Label>Favicon URL</Label>
            <Input 
              value={settings.favicon || ''} 
              onChange={(e) => setSettings({ ...settings, favicon: e.target.value })}
              placeholder="https://example.com/favicon.ico"
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Domain</Label>
            <Input 
              value={settings.customDomain || ''} 
              onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
              placeholder="crm.yourdomain.com"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input 
                type="color" 
                value={settings.primaryColor} 
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input 
                value={settings.primaryColor} 
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <Input 
                type="color" 
                value={settings.secondaryColor} 
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input 
                value={settings.secondaryColor} 
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Enable White Labeling</p>
              <p className="text-sm text-muted-foreground">Apply custom branding to your CRM</p>
            </div>
            <Switch 
              checked={settings.enabled} 
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t flex justify-end">
        <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-indigo-600">
          Save Changes
        </Button>
      </div>
    </GlassCard>
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
          setClient(data.client)
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
          <LandingPage onLogin={() => setView('login')} onRegister={() => setView('register')} />
        </motion.div>
      )}
      {view === 'login' && (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginPage onBack={() => setView('landing')} onSuccess={handleLoginSuccess} onRegister={() => setView('register')} />
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
