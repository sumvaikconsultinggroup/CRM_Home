'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  ArrowRight, Check, ChevronRight, Play, Star, Zap, Shield, Globe, Users,
  BarChart3, Clock, Target, Sparkles, Building2, Layers, MessageSquare,
  Calendar, FileText, TrendingUp, CheckCircle2, ArrowUpRight, Menu, X,
  Slack, Database, Cloud, Lock, Bell, Mail, Phone, MapPin, ChevronDown,
  Workflow, Settings, PieChart, LineChart, LayoutGrid, Plug, Box,
  Kanban, Video, Send, Headphones, Award, Crown, Rocket
} from 'lucide-react'

// Floating animation for hero elements
const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// Stagger children animation
const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
}

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

// Competitor logos and data
const competitors = [
  { name: 'Slack', icon: '💬', category: 'Communication' },
  { name: 'Jira', icon: '📋', category: 'Project Management' },
  { name: 'Salesforce', icon: '☁️', category: 'CRM' },
  { name: 'Asana', icon: '✓', category: 'Tasks' },
  { name: 'Monday', icon: '📊', category: 'Work OS' },
  { name: 'HubSpot', icon: '🔶', category: 'Marketing' },
  { name: 'Zoho', icon: '📈', category: 'Business Suite' },
  { name: 'QuickBooks', icon: '💰', category: 'Accounting' }
]

// Integration logos
const integrations = [
  { name: 'Slack', logo: '💬', color: '#4A154B' },
  { name: 'Google Sheets', logo: '📊', color: '#0F9D58' },
  { name: 'WhatsApp', logo: '📱', color: '#25D366' },
  { name: 'Zoom', logo: '🎥', color: '#2D8CFF' },
  { name: 'Zapier', logo: '⚡', color: '#FF4A00' },
  { name: 'Pabbly', logo: '🔗', color: '#5468FF' },
  { name: 'Tally', logo: '📒', color: '#FFB800' },
  { name: 'Google Calendar', logo: '📅', color: '#4285F4' }
]

// Feature comparison data
const featureComparison = [
  { feature: 'Lead Management', buildcrm: true, slack: false, jira: false, salesforce: true, asana: false },
  { feature: 'Project Tracking', buildcrm: true, slack: false, jira: true, salesforce: false, asana: true },
  { feature: 'Team Communication', buildcrm: true, slack: true, jira: false, salesforce: false, asana: false },
  { feature: 'Expense Tracking', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false },
  { feature: 'Industry Modules', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false },
  { feature: 'AI Assistant', buildcrm: true, slack: false, jira: false, salesforce: true, asana: false },
  { feature: 'WhatsApp Integration', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false },
  { feature: 'Custom Workflows', buildcrm: true, slack: false, jira: true, salesforce: true, asana: true },
  { feature: 'Multi-tenant', buildcrm: true, slack: false, jira: false, salesforce: true, asana: false },
  { feature: 'Affordable Pricing', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false }
]

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    monthlyPrice: 999,
    features: [
      '5 Team Members',
      'Lead Management',
      'Project Tracking',
      'Basic Reports',
      'Email Support',
      '1 Industry Module'
    ],
    popular: false,
    cta: 'Start Free Trial'
  },
  {
    name: 'Professional',
    description: 'Best for growing businesses',
    monthlyPrice: 2499,
    features: [
      '25 Team Members',
      'Everything in Starter',
      'Advanced Analytics',
      'All Integrations',
      'Priority Support',
      '3 Industry Modules',
      'AI Assistant (Mee)',
      'Custom Workflows'
    ],
    popular: true,
    cta: 'Start Free Trial'
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    monthlyPrice: 4999,
    features: [
      'Unlimited Team Members',
      'Everything in Professional',
      'Dedicated Account Manager',
      'Custom Integrations',
      'SLA Guarantee',
      'All Industry Modules',
      'White-label Option',
      'On-premise Deployment'
    ],
    popular: false,
    cta: 'Contact Sales'
  }
]

// Bento items for features
const bentoFeatures = [
  {
    title: 'Lead Pipeline',
    description: 'Visual kanban boards to track every lead from inquiry to close',
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    size: 'large',
    stats: '3x faster conversions'
  },
  {
    title: 'Project Management',
    description: 'Gantt charts, milestones, and real-time collaboration',
    icon: Kanban,
    color: 'from-purple-500 to-pink-500',
    size: 'medium',
    stats: '40% time saved'
  },
  {
    title: 'AI Assistant',
    description: 'Mee AI analyzes your data and provides instant insights',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    size: 'medium',
    stats: 'Real-time intelligence'
  },
  {
    title: 'Team Chat',
    description: 'Built-in messaging with channels and direct messages',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-500',
    size: 'small',
    stats: 'Instant collaboration'
  },
  {
    title: 'Smart Reports',
    description: 'Beautiful dashboards with actionable analytics',
    icon: BarChart3,
    color: 'from-indigo-500 to-violet-500',
    size: 'small',
    stats: '50+ report types'
  },
  {
    title: 'Industry Modules',
    description: 'Specialized tools for flooring, doors & windows, kitchens, and more',
    icon: Layers,
    color: 'from-rose-500 to-red-500',
    size: 'large',
    stats: '12+ industries'
  }
]

// Testimonials
const testimonials = [
  {
    quote: "BuildCRM transformed how we manage our interior design projects. Everything is now in one place.",
    author: "Priya Sharma",
    role: "Director, Elite Interiors",
    avatar: "PS",
    rating: 5
  },
  {
    quote: "We replaced 5 different tools with BuildCRM. The cost savings alone paid for itself in 2 months.",
    author: "Rajesh Patel",
    role: "CEO, Modern Flooring Co",
    avatar: "RP",
    rating: 5
  },
  {
    quote: "The Doors & Windows module is exactly what our manufacturing unit needed. Highly recommended!",
    author: "Amit Kumar",
    role: "Operations Head, WindowCraft",
    avatar: "AK",
    rating: 5
  }
]

export default function EnterpriseLanding({ onLogin }) {
  const [isAnnual, setIsAnnual] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const heroRef = useRef(null)
  
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const calculatePrice = (monthlyPrice) => {
    if (isAnnual) {
      return Math.round(monthlyPrice * 0.85) // 15% off
    }
    return monthlyPrice
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                BuildCRM
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Features</a>
              <a href="#comparison" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Why BuildCRM</a>
              <a href="#integrations" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Integrations</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Pricing</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={onLogin} className="text-gray-600">
                Sign In
              </Button>
              <Button onClick={onLogin} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t"
            >
              <div className="px-4 py-4 space-y-3">
                <a href="#features" className="block py-2 text-gray-600">Features</a>
                <a href="#comparison" className="block py-2 text-gray-600">Why BuildCRM</a>
                <a href="#integrations" className="block py-2 text-gray-600">Integrations</a>
                <a href="#pricing" className="block py-2 text-gray-600">Pricing</a>
                <Button onClick={onLogin} className="w-full mt-4">Start Free Trial</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section - Apple-inspired */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        {/* Floating Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-20"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400 rounded-full blur-3xl opacity-20"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <Badge className="bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium rounded-full">
                <Sparkles className="h-4 w-4 mr-2 inline" />
                Now with AI-Powered Insights
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            >
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                One Platform.
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Infinite Possibilities.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp}
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            >
              Replace Slack, Jira, Salesforce, and 5 other tools with BuildCRM. 
              The all-in-one platform for home improvement businesses.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button 
                size="lg" 
                onClick={onLogin}
                className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 rounded-xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-lg border-2 rounded-xl group"
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div 
              variants={fadeInUp}
              className="pt-8 flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-gray-600">4.9/5 from 500+ reviews</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  14-day free trial
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Cancel anytime
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Image / Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-16 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Browser Frame */}
              <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl p-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-lg h-7 flex items-center px-4">
                    <span className="text-gray-400 text-sm">app.buildcrm.com</span>
                  </div>
                </div>
              </div>
              {/* Dashboard Preview */}
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 rounded-b-2xl shadow-2xl shadow-gray-400/20">
                <div className="grid grid-cols-4 gap-4">
                  {/* Stat Cards */}
                  {[
                    { label: 'Total Revenue', value: '₹24.5L', change: '+12%', color: 'from-blue-500 to-cyan-500' },
                    { label: 'Active Leads', value: '156', change: '+8%', color: 'from-purple-500 to-pink-500' },
                    { label: 'Projects', value: '42', change: '+15%', color: 'from-amber-500 to-orange-500' },
                    { label: 'Team Members', value: '18', change: '+2', color: 'from-green-500 to-emerald-500' }
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="bg-white rounded-xl p-4 shadow-sm"
                    >
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      <span className={`text-sm bg-gradient-to-r ${stat.color} bg-clip-text text-transparent font-medium`}>
                        {stat.change}
                      </span>
                    </motion.div>
                  ))}
                </div>
                {/* Chart Area */}
                <div className="mt-4 bg-white rounded-xl p-4 h-48 flex items-center justify-center">
                  <div className="flex items-end gap-2 h-32">
                    {[40, 65, 45, 80, 55, 95, 70, 85, 60, 90, 75, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1 + i * 0.05, duration: 0.5 }}
                        className="w-8 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-lg"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                variants={floatingAnimation}
                initial="initial"
                animate="animate"
                className="absolute -left-12 top-1/3 bg-white rounded-xl shadow-xl p-4 w-48"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conversion Rate</p>
                    <p className="font-bold">32.5%</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={floatingAnimation}
                initial="initial"
                animate="animate"
                style={{ animationDelay: '2s' }}
                className="absolute -right-12 top-1/2 bg-white rounded-xl shadow-xl p-4 w-48"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">AI Insights</p>
                    <p className="font-bold text-sm">3 new suggestions</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="h-8 w-8 text-gray-400" />
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 mb-8">Trusted by 500+ businesses across India</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            {['Elite Interiors', 'Modern Homes', 'Premium Flooring', 'WindowCraft', 'DesignStudio', 'HomeMakers'].map((company, i) => (
              <span key={i} className="text-xl font-semibold text-gray-400">{company}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-purple-100 text-purple-700 mb-4">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need.
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Nothing you don&#39;t.
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for home improvement businesses
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-12 gap-4 md:gap-6">
            {/* Large Card - Lead Pipeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="col-span-12 md:col-span-8 row-span-2"
            >
              <Card className="h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Lead Pipeline</h3>
                      <p className="text-blue-200">Visual kanban boards to track every lead</p>
                    </div>
                  </div>
                  <div className="flex-1 mt-4">
                    {/* Mini Kanban Preview */}
                    <div className="grid grid-cols-4 gap-3 h-full">
                      {['New', 'Contacted', 'Qualified', 'Closed'].map((stage, i) => (
                        <div key={i} className="bg-white/10 rounded-xl p-3">
                          <p className="text-sm font-medium mb-2">{stage}</p>
                          <div className="space-y-2">
                            {[...Array(4 - i)].map((_, j) => (
                              <div key={j} className="bg-white/20 rounded-lg h-12 animate-pulse" style={{ animationDelay: `${j * 0.2}s` }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-blue-200">3x faster conversions</span>
                    <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Medium Card - Project Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="col-span-12 md:col-span-4"
            >
              <Card className="h-full bg-gradient-to-br from-purple-500 to-pink-600 text-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <CardContent className="p-6">
                  <Kanban className="h-8 w-8 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Project Management</h3>
                  <p className="text-purple-200 text-sm">Gantt charts, milestones & real-time updates</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge className="bg-white/20 text-white">40% time saved</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Medium Card - AI Assistant */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="col-span-12 md:col-span-4"
            >
              <Card className="h-full bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <CardContent className="p-6">
                  <Sparkles className="h-8 w-8 mb-4" />
                  <h3 className="text-xl font-bold mb-2">AI Assistant - Mee</h3>
                  <p className="text-amber-200 text-sm">Get instant insights from your data</p>
                  <div className="mt-4 bg-white/20 rounded-lg p-3">
                    <p className="text-sm italic">"Show me leads that need follow-up today</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Small Cards Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="col-span-6 md:col-span-3"
            >
              <Card className="h-full bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:shadow-xl transition-all">
                <CardContent className="p-5">
                  <MessageSquare className="h-6 w-6 mb-3" />
                  <h3 className="font-bold">Team Chat</h3>
                  <p className="text-green-200 text-xs mt-1">Built-in messaging</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="col-span-6 md:col-span-3"
            >
              <Card className="h-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:shadow-xl transition-all">
                <CardContent className="p-5">
                  <BarChart3 className="h-6 w-6 mb-3" />
                  <h3 className="font-bold">Smart Reports</h3>
                  <p className="text-indigo-200 text-xs mt-1">50+ report types</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="col-span-6 md:col-span-3"
            >
              <Card className="h-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:shadow-xl transition-all">
                <CardContent className="p-5">
                  <Calendar className="h-6 w-6 mb-3" />
                  <h3 className="font-bold">Calendar</h3>
                  <p className="text-cyan-200 text-xs mt-1">Schedule & tasks</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="col-span-6 md:col-span-3"
            >
              <Card className="h-full bg-gradient-to-br from-rose-500 to-red-600 text-white hover:shadow-xl transition-all">
                <CardContent className="p-5">
                  <Layers className="h-6 w-6 mb-3" />
                  <h3 className="font-bold">12+ Modules</h3>
                  <p className="text-rose-200 text-xs mt-1">Industry specific</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Comparison Section - Why BuildCRM */}
      <section id="comparison" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-blue-500/20 text-blue-300 mb-4">Why BuildCRM</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Stop juggling multiple tools.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Get everything in one place.
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Why pay for 8 different subscriptions when BuildCRM does it all?
            </p>
          </motion.div>

          {/* Competitor Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {competitors.map((comp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <span className="text-2xl">{comp.icon}</span>
                  <div>
                    <p className="font-medium">{comp.name}</p>
                    <p className="text-xs text-gray-500">{comp.category}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-gray-400 mb-4">All these tools combined cost you</p>
              <p className="text-4xl font-bold text-red-400 line-through mb-2">₹50,000+/month</p>
              <p className="text-gray-400">With BuildCRM, get everything for just</p>
              <p className="text-5xl font-bold text-green-400 mt-2">₹2,499/month</p>
            </div>
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-x-auto"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="py-4 px-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-1">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-bold">BuildCRM</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 text-gray-400">Slack</th>
                  <th className="py-4 px-4 text-gray-400">Jira</th>
                  <th className="py-4 px-4 text-gray-400">Salesforce</th>
                  <th className="py-4 px-4 text-gray-400">Asana</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-4 px-4 font-medium">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {row.buildcrm ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-full">
                          <Check className="h-5 w-5 text-green-400" />
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.slack ? <Check className="h-5 w-5 text-gray-500 inline" /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.jira ? <Check className="h-5 w-5 text-gray-500 inline" /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.salesforce ? <Check className="h-5 w-5 text-gray-500 inline" /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.asana ? <Check className="h-5 w-5 text-gray-500 inline" /> : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-green-100 text-green-700 mb-4">Integrations</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Connects with tools
              <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                you already love.
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Direct, company-built integrations. Not hacky workarounds.
            </p>
          </motion.div>

          {/* Integration Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {integrations.map((integration, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-gray-200 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="text-4xl mb-3">{integration.logo}</div>
                <p className="font-semibold">{integration.name}</p>
                <Badge className="mt-2 bg-green-100 text-green-700 text-xs">Direct Connect</Badge>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-500 mt-8"
          >
            + Zapier & Pabbly for 5000+ more apps
          </motion.p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-amber-100 text-amber-700 mb-4">Testimonials</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by businesses
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                across India.
              </span>
            </h2>
          </motion.div>

          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-xl shadow-gray-200/50 hover:shadow-2xl transition-shadow"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-gray-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-indigo-100 text-indigo-700 mb-4">Pricing</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, transparent
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                pricing.
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              No hidden fees. No surprises. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-indigo-600"
              />
              <span className={`font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Annual
                <Badge className="ml-2 bg-green-100 text-green-700">Save 15%</Badge>
              </span>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl p-8 ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/25 scale-105 z-10' 
                    : 'bg-white border-2 border-gray-100 hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">₹{calculatePrice(plan.monthlyPrice).toLocaleString()}</span>
                    <span className={`text-sm ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>/month</span>
                  </div>
                  {isAnnual && (
                    <p className={`text-sm mt-2 ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>
                      Billed annually (₹{(calculatePrice(plan.monthlyPrice) * 12).toLocaleString()}/year)
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <CheckCircle2 className={`h-5 w-5 ${plan.popular ? 'text-indigo-300' : 'text-green-500'}`} />
                      <span className={plan.popular ? '' : 'text-gray-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={onLogin}
                  className={`w-full h-12 text-lg rounded-xl ${
                    plan.popular 
                      ? 'bg-white text-indigo-600 hover:bg-gray-100' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to transform
              <br />
              your business?
            </h2>
            <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
              Join 500+ businesses already using BuildCRM to streamline their operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={onLogin}
                className="h-14 px-8 text-lg bg-white text-indigo-600 hover:bg-gray-100 rounded-xl shadow-xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl"
              >
                <Phone className="mr-2 h-5 w-5" />
                Schedule Demo
              </Button>
            </div>
            <p className="text-indigo-200 text-sm mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">BuildCRM</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-sm">
                The all-in-one platform for home improvement businesses. Manage leads, projects, and teams in one place.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 BuildCRM. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>Made with</span>
              <span className="text-red-500">❤️</span>
              <span>in India</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
