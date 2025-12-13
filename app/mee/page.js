'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Sparkles, Building2, Target, Kanban, Package, Receipt,
  BarChart3, Clock, Users, Check, ChevronRight, MessageSquare, Zap,
  Brain, LineChart, Bell, Shield, Globe, Play, Star, TrendingUp,
  FileText, Calendar, Database, Lightbulb, AlertTriangle, PieChart,
  Activity, Cpu, Bot, Wand2, Eye, Search, Mic, Command,
  ArrowLeft, CheckCircle2, Lock, Workflow, Layers
} from 'lucide-react'

// MEE Icon Component
const MeeIcon = ({ size = 'md', animated = false }) => {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  }
  
  return (
    <motion.div
      className={`${sizes[size]} relative`}
      animate={animated ? { 
        scale: [1, 1.05, 1],
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-xl opacity-50" />
      
      {/* Main icon */}
      <div className="relative w-full h-full bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30 overflow-hidden">
        {/* Inner pattern */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }} />
        
        {/* Neural network lines */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
          <motion.circle cx="50" cy="30" r="3" fill="white" 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.circle cx="30" cy="50" r="3" fill="white"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.circle cx="70" cy="50" r="3" fill="white"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          />
          <motion.circle cx="50" cy="70" r="3" fill="white"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
          />
          <line x1="50" y1="30" x2="30" y2="50" stroke="white" strokeWidth="1" opacity="0.3" />
          <line x1="50" y1="30" x2="70" y2="50" stroke="white" strokeWidth="1" opacity="0.3" />
          <line x1="30" y1="50" x2="50" y2="70" stroke="white" strokeWidth="1" opacity="0.3" />
          <line x1="70" y1="50" x2="50" y2="70" stroke="white" strokeWidth="1" opacity="0.3" />
        </svg>
        
        {/* M letter */}
        <span className="relative z-10 text-white font-bold" style={{ fontSize: size === 'xl' ? '3rem' : size === 'lg' ? '2rem' : size === 'md' ? '1.5rem' : '1rem' }}>
          M
        </span>
        
        {/* Sparkle */}
        <motion.div 
          className="absolute top-1 right-1"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-3 h-3 text-yellow-300" />
        </motion.div>
      </div>
    </motion.div>
  )
}

// Capability data based on actual MEE implementation
const capabilities = [
  {
    category: 'Real-Time Business Intelligence',
    icon: Database,
    color: 'from-blue-500 to-cyan-500',
    description: 'Mee has direct access to your live business data, not cached reports.',
    features: [
      'Live lead pipeline with values, scores, and follow-up dates',
      'Active projects with budgets, progress, and deadlines',
      'Task status including overdue and high-priority items',
      'Inventory levels with low-stock alerts',
      'Invoice status and pending payments',
      'Customer analytics and revenue breakdown'
    ]
  },
  {
    category: 'Natural Language Queries',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    description: 'Ask questions in plain English, get instant answers with real data.',
    features: [
      '"What\'s my pipeline value?"',
      '"Which leads need immediate follow-up?"',
      '"Show me overdue tasks"',
      '"What\'s my conversion rate?"',
      '"Which customers are most valuable?"',
      '"What inventory needs reordering?"'
    ]
  },
  {
    category: 'Intelligent Recommendations',
    icon: Lightbulb,
    color: 'from-orange-500 to-red-500',
    description: 'Proactive suggestions to improve your business performance.',
    features: [
      'Lead follow-up priorities based on value and engagement',
      'Task prioritization based on deadlines and importance',
      'Inventory reorder alerts before stockouts',
      'Invoice collection priorities for better cash flow',
      'Sales opportunity identification',
      'Process improvement suggestions'
    ]
  },
  {
    category: 'Business Health Monitoring',
    icon: Activity,
    color: 'from-green-500 to-emerald-500',
    description: 'Real-time health score calculated from 15+ business metrics.',
    features: [
      'Overall business health score (0-100)',
      'Lead conversion rate tracking',
      'Task completion metrics',
      'Quotation conversion analysis',
      'Revenue and cash flow monitoring',
      'Automated alerts for issues requiring attention'
    ]
  }
]

// Sample conversations showing real Mee capabilities
const sampleConversations = [
  {
    user: "What's my business health score?",
    mee: `📊 **Business Health Report (Real-Time)**

**Overall Score: 72/100** 🟢

**Key Metrics:**
• Lead Conversion: 28%
• Task Completion: 85%
• Quotation Conversion: 45%

**⚠️ Alerts (3):**
• 5 leads require immediate follow-up
• 3 overdue tasks need attention
• 2 invoices are past due

- Mee 🤖`
  },
  {
    user: "Show me leads that need follow-up",
    mee: `📊 **Lead Analysis (Real-Time)**

You have **24 leads** worth **₹18,50,000**.

**Immediate Actions Needed:**
• 8 leads require follow-up
• 5 hot leads to prioritize
• 3 new leads this week

**Top Leads by Value:**
• Sharma Interiors - ₹4,50,000
• Modern Homes Ltd - ₹3,20,000
• Patel Constructions - ₹2,80,000

**Conversion Funnel:**
New → Contacted → Qualified → Proposal → Won
8 → 6 → 5 → 3 → 2

- Mee 🤖`
  },
  {
    user: "What's my inventory status?",
    mee: `📦 **Inventory Status (Real-Time)**

**Summary:**
• Total Items: 156
• Total Value: ₹12,45,000
• Low Stock Alerts: 8

**Low Stock Items:**
• Oak Hardwood (SKU-001) - Only 12 left
• Teak Laminate (SKU-023) - Only 8 left
• Premium Underlayment - Only 15 left

**Top Products:**
• European Oak - 145 units
• Asian Teak - 98 units
• Maple Select - 87 units

- Mee 🤖`
  }
]

// Technical specifications
const technicalSpecs = [
  {
    label: 'AI Model',
    value: 'GPT-4 Powered',
    icon: Cpu
  },
  {
    label: 'Data Access',
    value: 'Real-Time',
    icon: Database
  },
  {
    label: 'Response Time',
    value: '<2 seconds',
    icon: Zap
  },
  {
    label: 'Availability',
    value: '24/7',
    icon: Clock
  },
  {
    label: 'Security',
    value: 'Enterprise Grade',
    icon: Shield
  },
  {
    label: 'Integration',
    value: 'Full CRM Access',
    icon: Workflow
  }
]

export default function MeeAIPage() {
  const router = useRouter()
  const [activeConversation, setActiveConversation] = useState(0)
  const { scrollYProgress } = useScroll()
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: true })

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveConversation((prev) => (prev + 1) % sampleConversations.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 z-[60] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to BuildCRM</span>
            </button>

            <div className="flex items-center gap-3">
              <MeeIcon size="sm" />
              <span className="text-xl font-bold">Mee AI</span>
            </div>

            <Button 
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/50 via-slate-950 to-slate-950" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.02) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {/* Animated Orbs */}
        <motion.div 
          className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[150px] opacity-20"
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[150px] opacity-20"
          animate={{ scale: [1.2, 1, 1.2], x: [0, -50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Mee Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={isHeroInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-8"
            >
              <MeeIcon size="xl" animated />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-violet-500/20 text-violet-300 px-5 py-2.5 rounded-full text-sm font-medium mb-8 border border-violet-500/30"
            >
              <Sparkles className="h-4 w-4" />
              <span>Enterprise-Grade AI Assistant</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-white">Meet </span>
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Mee</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto mb-8"
            >
              Your AI-powered business intelligence assistant with 
              <span className="text-white font-semibold"> real-time access</span> to all your CRM data.
              Ask questions in plain English, get instant insights.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-2xl shadow-violet-500/30 rounded-xl font-semibold"
                >
                  Try Mee Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-white/20 hover:border-white/30 hover:bg-white/5 rounded-xl text-white font-semibold"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            {/* Enterprise Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isHeroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full text-sm border border-amber-500/30"
            >
              <Lock className="h-4 w-4" />
              <span>Exclusive to Enterprise Plan</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-16 lg:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-4">Live Preview</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              See Mee in Action
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Real examples of how Mee answers your business questions using actual data
            </p>
          </motion.div>

          {/* Chat Demo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Chat Header */}
              <div className="bg-slate-800/50 px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <MeeIcon size="sm" />
                <div>
                  <p className="font-semibold">Mee AI Assistant</p>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Online • Real-time data access
                  </p>
                </div>
              </div>

              {/* Chat Body */}
              <div className="p-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeConversation}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-violet-600 rounded-2xl rounded-tr-sm px-5 py-3 max-w-md">
                        <p className="text-white">{sampleConversations[activeConversation].user}</p>
                      </div>
                    </div>

                    {/* Mee Response */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">M</span>
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 max-w-lg">
                        <pre className="text-gray-200 whitespace-pre-wrap text-sm font-sans">
                          {sampleConversations[activeConversation].mee}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Chat Input */}
              <div className="px-6 py-4 border-t border-white/5">
                <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
                  <input 
                    type="text" 
                    placeholder="Ask Mee anything about your business..."
                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                    disabled
                  />
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Conversation Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {sampleConversations.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveConversation(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeConversation === i ? 'bg-violet-500 w-6' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-4">Capabilities</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              What Mee Can Do
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Real capabilities, not marketing fluff. Here&apos;s exactly what Mee delivers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cap.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <cap.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{cap.category}</h3>
                <p className="text-gray-400 mb-6">{cap.description}</p>
                <ul className="space-y-2">
                  {cap.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specs */}
      <section className="py-16 lg:py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-4">Under the Hood</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Technical Specifications
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {technicalSpecs.map((spec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-800/50 rounded-2xl p-5 text-center border border-white/5"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                  <spec.icon className="h-6 w-6 text-violet-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">{spec.label}</p>
                <p className="font-semibold text-white">{spec.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Access Diagram */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 mb-4">Data Access</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Complete Business Visibility
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Mee connects to every part of your BuildCRM data in real-time
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: Target, label: 'Leads', items: ['Pipeline value', 'Conversion funnel', 'Follow-up dates', 'Lead scores'] },
              { icon: Kanban, label: 'Projects', items: ['Active projects', 'Budgets', 'Progress %', 'Deadlines'] },
              { icon: CheckCircle2, label: 'Tasks', items: ['Overdue tasks', 'Due today', 'By priority', 'Completion rate'] },
              { icon: Package, label: 'Inventory', items: ['Stock levels', 'Low stock alerts', 'Product categories', 'Valuation'] },
              { icon: Receipt, label: 'Invoices', items: ['Pending payments', 'Overdue invoices', 'Paid amounts', 'Revenue'] },
              { icon: Users, label: 'Customers', items: ['Total customers', 'Top by value', 'Order history', 'Lifetime value'] },
              { icon: Calendar, label: 'Calendar', items: ['Events today', 'This week', 'Meetings', 'Deadlines'] },
              { icon: FileText, label: 'Quotations', items: ['Pending quotes', 'Conversion rate', 'Total value', 'By status'] }
            ].map((data, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-900/50 rounded-2xl p-5 border border-white/5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                    <data.icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <span className="font-semibold">{data.label}</span>
                </div>
                <ul className="space-y-1.5">
                  {data.items.map((item, j) => (
                    <li key={j} className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="w-1 h-1 bg-violet-500 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <MeeIcon size="lg" animated />
            <h2 className="text-3xl lg:text-5xl font-bold mt-8 mb-6">
              Ready to Meet Mee?
            </h2>
            <p className="text-lg lg:text-xl text-purple-100 mb-10 max-w-2xl mx-auto">
              Upgrade to Enterprise and unlock the full power of AI-driven business intelligence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={() => router.push('/')}
                  className="h-14 px-8 text-lg bg-white text-purple-600 hover:bg-gray-100 rounded-xl shadow-2xl font-semibold"
                >
                  Start Enterprise Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 BuildCRM. Mee AI is powered by GPT-4 and requires Enterprise plan.
          </p>
        </div>
      </footer>
    </div>
  )
}
