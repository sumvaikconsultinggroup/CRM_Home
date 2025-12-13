'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight, Check, ChevronRight, Play, Star, Zap, Shield, Globe, Users,
  BarChart3, Clock, Target, Sparkles, Building2, Layers, MessageSquare,
  Calendar, FileText, TrendingUp, CheckCircle2, ArrowUpRight, Menu, X,
  Database, Cloud, Lock, Bell, Mail, Phone, MapPin, ChevronDown,
  Workflow, Settings, PieChart, LineChart, LayoutGrid, Plug, Box,
  Kanban, Video, Send, Headphones, Award, Crown, Rocket, Home,
  Hammer, PaintBucket, Wrench, Sofa, Grid3X3, DoorOpen, ChefHat,
  HardHat, Ruler, Calculator, ClipboardList, Truck, Package,
  Receipt, CreditCard, UserCheck, Building, Factory, Warehouse,
  ShoppingCart, FileSpreadsheet, Quote, Briefcase, Heart, ExternalLink,
  MousePointer, Cpu, BookOpen, GraduationCap, Twitter, Linkedin, Youtube, 
  Instagram, AlertTriangle, XCircle, Minus, Plus, Eye, Palette,
  Smartphone, Monitor, Tablet, CircleDot, Activity, Banknote
} from 'lucide-react'

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
}

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6 }
}

const scaleUp = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}

const slideInLeft = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
}

const slideInRight = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
}

// ============================================
// MODULE ICONS MAPPING
// ============================================
const moduleIcons = {
  'wooden-flooring': Layers,
  'doors-windows': DoorOpen,
  'doors-and-windows': DoorOpen,
  'modular-kitchens': ChefHat,
  'kitchens': ChefHat,
  'interior-design': Sofa,
  'interior-designers': Palette,
  'tiles-stone': Grid3X3,
  'tiles': Grid3X3,
  'contractors': HardHat,
  'painting': PaintBucket,
  'plumbing': Wrench,
  'electrical': Zap,
  'plumbing-electrical': Wrench,
  'mep-services': Wrench,
  'architects': Building2,
  'real-estate': Building,
  'real-estate-brokers': Building,
  'furniture': Sofa,
}

const moduleColors = [
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-rose-500 to-pink-600',
  'from-purple-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-indigo-500 to-blue-600',
  'from-red-500 to-rose-600',
  'from-cyan-500 to-blue-600',
]

// ============================================
// DEFAULT DATA
// ============================================
const defaultPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams',
    price: 2999,
    features: ['5 Team Members', 'Basic CRM', 'Lead Management', 'Email Support', '5GB Storage', '1 Industry Module'],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Best for growing businesses',
    price: 5999,
    features: ['15 Team Members', 'Advanced CRM', 'Project Management', 'Reports & Analytics', 'Priority Support', '25GB Storage', '3 Industry Modules', 'API Access'],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 9999,
    features: ['Unlimited Users', 'Full CRM Suite', 'Custom Modules', 'Dedicated Manager', '100GB Storage', 'All Modules', 'White Labeling', 'Custom Domain', 'SLA 99.9%'],
    popular: false
  }
]

const defaultModules = [
  { id: 'wooden-flooring', name: 'Wooden Flooring', description: 'Complete ERP for flooring businesses' },
  { id: 'doors-windows', name: 'Doors & Windows', description: 'Manufacturing & fabrication management' },
  { id: 'kitchens', name: 'Modular Kitchens', description: 'Design-to-delivery workflow' },
  { id: 'interior-designers', name: 'Interior Design', description: 'Project management for designers' },
  { id: 'tiles', name: 'Tiles & Stone', description: 'Inventory and project management' },
  { id: 'contractors', name: 'General Contractors', description: 'End-to-end project management' },
  { id: 'painting', name: 'Painting Services', description: 'Estimation to completion' },
  { id: 'architects', name: 'Architects', description: 'Blueprint and client management' },
]

// Pain points data
const painPoints = [
  {
    icon: MessageSquare,
    title: 'Leads Lost in WhatsApp',
    description: 'Customer inquiries buried in group chats. No tracking of who followed up or what was promised.',
    stat: '40%',
    statLabel: 'leads lost to poor tracking',
    color: 'red'
  },
  {
    icon: FileSpreadsheet,
    title: 'Excel Chaos',
    description: 'Multiple file versions. Wrong prices quoted. Inventory counts that never match reality.',
    stat: '6 hrs',
    statLabel: 'wasted weekly on data entry',
    color: 'orange'
  },
  {
    icon: Clock,
    title: 'Project Delays',
    description: 'Materials arrive late. Workers show up at wrong sites. Clients complain about missed deadlines.',
    stat: '30%',
    statLabel: 'of projects run over time',
    color: 'yellow'
  },
  {
    icon: Receipt,
    title: 'Payment Leakages',
    description: 'Invoices sent late or never. Advance payments not tracked. Margins eaten by unrecorded expenses.',
    stat: '₹2-3L',
    statLabel: 'lost yearly to poor billing',
    color: 'purple'
  },
  {
    icon: Users,
    title: 'Team Confusion',
    description: 'Installers don\'t know schedules. Office staff can\'t find documents. Everyone calls the owner.',
    stat: '50%',
    statLabel: 'time spent on coordination',
    color: 'blue'
  },
  {
    icon: BarChart3,
    title: 'No Visibility',
    description: 'Which products sell best? Which salesperson performs? What\'s the profit margin? Nobody knows.',
    stat: '0',
    statLabel: 'real-time business insights',
    color: 'gray'
  }
]

// Features data
const features = [
  {
    category: 'Lead Management',
    icon: Target,
    title: 'Capture & Convert More Leads',
    description: 'Multi-source lead capture from Website, WhatsApp, Facebook, Google Ads, IndiaMART, JustDial. Auto-assignment, follow-up automation, and pipeline analytics.',
    gradient: 'from-blue-600 to-cyan-500',
    stats: [
      { value: '40%', label: 'Higher conversion' },
      { value: '3x', label: 'Faster follow-ups' }
    ]
  },
  {
    category: 'Project Management',
    icon: Kanban,
    title: 'Deliver On Time, Every Time',
    description: 'Visual timelines with Gantt charts, Kanban boards, and calendar views. Task dependencies, resource allocation, and automatic client updates.',
    gradient: 'from-purple-600 to-pink-500',
    stats: [
      { value: '30%', label: 'Faster delivery' },
      { value: '100%', label: 'Visibility' }
    ]
  },
  {
    category: 'Inventory',
    icon: Package,
    title: 'Never Run Out of Stock',
    description: 'Multi-warehouse tracking with automatic low-stock alerts. Purchase orders, delivery tracking, and consumption linked to projects for accurate costing.',
    gradient: 'from-orange-600 to-red-500',
    stats: [
      { value: '15%', label: 'Cost savings' },
      { value: '0', label: 'Stockouts' }
    ]
  },
  {
    category: 'Finance',
    icon: Receipt,
    title: 'Get Paid Faster',
    description: 'GST-compliant invoices with auto tax calculation. Payment milestones, expense tracking, receipt capture, and profitability reports by project.',
    gradient: 'from-green-600 to-emerald-500',
    stats: [
      { value: '50%', label: 'Faster payments' },
      { value: '₹5L+', label: 'Recovered yearly' }
    ]
  }
]

// Comparison data
const comparisonData = {
  before: [
    'Leads tracked in WhatsApp groups',
    'Quotes made in Word/Excel - no standardization',
    'No idea which salesperson performs best',
    'Inventory counts done manually weekly',
    'Project updates via phone calls',
    'Invoices created at month-end in bulk',
    'Customer history lost when staff leaves',
    '6+ apps for different functions'
  ],
  after: [
    'All leads in one dashboard with full history',
    'Professional quotes generated in 2 minutes',
    'Real-time sales leaderboard and analytics',
    'Live inventory with automatic low-stock alerts',
    'Automatic client updates via WhatsApp',
    'One-click GST invoices with payment tracking',
    'Complete customer history in CRM forever',
    'Everything in one integrated platform'
  ]
}

// Testimonials
const testimonials = [
  {
    quote: "We were using 6 different apps before BuildCRM. Now everything is in one place - leads, projects, inventory, invoices. Our team productivity has increased by 40%.",
    author: "Rajesh Agarwal",
    role: "Managing Director",
    company: "Premium Interiors Pvt Ltd",
    location: "Mumbai",
    avatar: "RA",
    stats: { metric: '40%', label: 'productivity increase' }
  },
  {
    quote: "The Wooden Flooring module is exactly what our industry needed. The cut-list optimization alone has saved us 15% on material costs.",
    author: "Priya Sharma",
    role: "Operations Head",
    company: "Elite Flooring Co",
    location: "Delhi",
    avatar: "PS",
    stats: { metric: '15%', label: 'material cost savings' }
  },
  {
    quote: "Our sales team now closes deals 3x faster. The automatic WhatsApp follow-ups and lead scoring have been game changers.",
    author: "Amit Kumar",
    role: "Sales Manager",
    company: "Modern Windows Ltd",
    location: "Bangalore",
    avatar: "AK",
    stats: { metric: '3x', label: 'faster deal closure' }
  },
  {
    quote: "As a contractor managing 15+ projects, BuildCRM's multi-project dashboard gives me complete visibility without the chaos.",
    author: "Suresh Patel",
    role: "Founder",
    company: "Patel Constructions",
    location: "Ahmedabad",
    avatar: "SP",
    stats: { metric: '15+', label: 'projects managed' }
  }
]

// Integrations with real SVG icons
const integrations = [
  { 
    name: 'WhatsApp', 
    color: '#25D366', 
    description: 'Customer messaging',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
  },
  { 
    name: 'Slack', 
    color: '#4A154B', 
    description: 'Team notifications',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>`
  },
  { 
    name: 'Google Sheets', 
    color: '#0F9D58', 
    description: 'Data sync',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.385 2H4.615C3.173 2 2 3.173 2 4.615v14.77C2 20.827 3.173 22 4.615 22h14.77c1.442 0 2.615-1.173 2.615-2.615V4.615C22 3.173 20.827 2 19.385 2zM8.462 17.846H5.538v-2.923h2.924v2.923zm0-4.384H5.538v-2.924h2.924v2.924zm0-4.385H5.538V6.154h2.924v2.923zm5.23 8.769h-2.923v-2.923h2.923v2.923zm0-4.384h-2.923v-2.924h2.923v2.924zm0-4.385h-2.923V6.154h2.923v2.923zm4.77 8.769h-2.924v-2.923h2.924v2.923zm0-4.384h-2.924v-2.924h2.924v2.924zm0-4.385h-2.924V6.154h2.924v2.923z"/></svg>`
  },
  { 
    name: 'Zoom', 
    color: '#2D8CFF', 
    description: 'Video meetings',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-8.116-3.5H6.884a1.394 1.394 0 00-1.39 1.39v4.22c0 .766.624 1.39 1.39 1.39h9c.766 0 1.39-.624 1.39-1.39v-4.22c0-.766-.624-1.39-1.39-1.39zm5.632 1.285l-3.632 2.142v2.146l3.632 2.142a.69.69 0 001.084-.568V9.353a.69.69 0 00-1.084-.568z"/></svg>`
  },
  { 
    name: 'Tally', 
    color: '#ED1C24', 
    description: 'Accounting',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v2H7V7zm0 4h4v2H7v-2zm0 4h4v2H7v-2zm6-8h4v2h-4V7zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z"/></svg>`
  },
  { 
    name: 'Zapier', 
    color: '#FF4A00', 
    description: '5000+ apps',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 5.5l5.5 5.5H14v6h-4v-6H6.5L12 5.5z"/></svg>`
  },
  { 
    name: 'Google Calendar', 
    color: '#4285F4', 
    description: 'Scheduling',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>`
  },
  { 
    name: 'Pabbly', 
    color: '#5468FF', 
    description: 'Automation',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
  }
]

// FAQs
const faqs = [
  {
    question: 'What makes BuildCRM different from generic CRMs?',
    answer: 'BuildCRM is purpose-built for the construction and home improvement industry. Unlike generic CRMs, we offer industry-specific modules for flooring, doors & windows, kitchens, and more. Each module comes with features tailored to your trade - like cut-list optimization for flooring, survey tools for windows, and cabinet tracking for kitchens.'
  },
  {
    question: 'Can I import my existing data?',
    answer: 'Yes! We support importing from Excel, CSV, Google Sheets, and other popular CRMs. Our team provides free migration assistance for Professional and Enterprise plans. Most businesses are up and running within a day.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-grade encryption (AES-256), regular backups, and your data is stored in secure cloud servers. We are SOC 2 compliant and GDPR ready. Enterprise plans also offer on-premise deployment options.'
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'Yes, all plans come with a 14-day free trial. No credit card required. You get full access to all features during the trial period.'
  },
  {
    question: 'How does pricing work for modules?',
    answer: 'Our base plans include a set number of industry modules. Starter gets 1 module, Professional gets 3, and Enterprise gets all modules. Additional modules can be added for ₹999/month each.'
  },
  {
    question: 'What support do you offer?',
    answer: 'Starter plans get email support. Professional plans include priority chat support with 4-hour response time. Enterprise plans get a dedicated account manager and phone support.'
  }
]

// ============================================
// ANIMATED COMPONENTS
// ============================================

// Animated Counter
const AnimatedCounter = ({ value, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const hasAnimated = useRef(false)
  
  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true
      const numValue = parseInt(value.toString().replace(/[^0-9]/g, '')) || 0
      if (numValue === 0) return
      
      const duration = 2000
      const steps = 60
      const increment = numValue / steps
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= numValue) {
          setCount(numValue)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, duration / steps)
      
      return () => clearInterval(timer)
    }
  }, [isInView, value])
  
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// Gradient Blob
const GradientBlob = ({ className, color1 = "blue", color2 = "purple" }) => (
  <div className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
    style={{
      background: `radial-gradient(circle, var(--${color1}-500) 0%, var(--${color2}-500) 100%)`
    }}
  />
)

// Glass Card
const GlassCard = ({ children, className = "", hover = true }) => (
  <motion.div
    whileHover={hover ? { y: -5, scale: 1.02 } : {}}
    className={`relative backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl rounded-2xl overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </motion.div>
)

// Bento Card
const BentoCard = ({ children, className = "", size = "normal", gradient = "" }) => {
  const sizeClasses = {
    small: "col-span-1 row-span-1",
    normal: "col-span-1 row-span-1 lg:col-span-1 lg:row-span-1",
    wide: "col-span-1 lg:col-span-2 row-span-1",
    tall: "col-span-1 row-span-1 lg:row-span-2",
    large: "col-span-1 lg:col-span-2 row-span-1 lg:row-span-2"
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`${sizeClasses[size]} group relative overflow-hidden rounded-3xl ${gradient ? `bg-gradient-to-br ${gradient}` : 'bg-white'} border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 ${className}`}
    >
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      {children}
    </motion.div>
  )
}

// Dashboard Mockup Component
const DashboardMockup = () => {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-3xl" />
      
      {/* Browser Chrome */}
      <motion.div 
        initial={{ opacity: 0, y: 40, rotateX: 10 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ perspective: '1000px' }}
      >
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
            </div>
            <div className="flex-1 bg-gray-700/50 rounded-lg h-8 flex items-center px-4 ml-2">
              <Lock className="h-3 w-3 text-green-400 mr-2" />
              <span className="text-gray-400 text-sm font-mono">app.buildcrm.com/dashboard</span>
            </div>
          </div>
        </div>
        
        {/* Dashboard Content */}
        <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 lg:p-6 rounded-b-2xl shadow-2xl min-h-[300px] lg:min-h-[400px]">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
            {[
              { label: 'Revenue', value: '₹24.5L', change: '+12%', icon: TrendingUp, color: 'emerald', bg: 'from-emerald-500 to-teal-600' },
              { label: 'Active Leads', value: '156', change: '+8 new', icon: Target, color: 'blue', bg: 'from-blue-500 to-cyan-600' },
              { label: 'Projects', value: '42', change: '3 due', icon: Briefcase, color: 'purple', bg: 'from-purple-500 to-pink-600' },
              { label: 'Tasks', value: '28', change: '5 today', icon: CheckCircle2, color: 'orange', bg: 'from-orange-500 to-red-600' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-white rounded-xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs lg:text-sm text-gray-500">{stat.label}</span>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-xs text-${stat.color}-600 font-medium`}>{stat.change}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 lg:p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-semibold text-gray-900">Revenue Overview</span>
                  <p className="text-xs text-gray-500">Last 12 months performance</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Monthly</span>
                </div>
              </div>
              <div className="flex items-end gap-1 lg:gap-2 h-28 lg:h-36">
                {[35, 55, 45, 70, 55, 85, 65, 90, 75, 95, 85, 100].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                    className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t hover:from-blue-500 hover:to-indigo-400 transition-colors cursor-pointer relative group"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ₹{Math.round(h * 0.3)}L
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                  <span key={m} className="hidden lg:inline">{m}</span>
                ))}
                <span className="lg:hidden">Jan</span>
                <span className="lg:hidden">Jun</span>
                <span className="lg:hidden">Dec</span>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-4 lg:p-5 shadow-sm border border-gray-100">
              <span className="font-semibold text-gray-900 block mb-4">Recent Activity</span>
              <div className="space-y-3">
                {[
                  { text: 'New lead from website', time: '2m ago', color: 'blue', icon: Target },
                  { text: 'Quote #1234 sent', time: '15m ago', color: 'green', icon: FileText },
                  { text: 'Payment received ₹45K', time: '1h ago', color: 'purple', icon: CreditCard },
                  { text: 'Project milestone done', time: '2h ago', color: 'orange', icon: CheckCircle2 }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-${item.color}-100 flex items-center justify-center`}>
                      <item.icon className={`h-4 w-4 text-${item.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{item.text}</p>
                      <p className="text-xs text-gray-400">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Floating Elements */}
      <motion.div
        initial={{ opacity: 0, x: -50, y: 20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1 }}
        animate={{ y: [0, -10, 0] }}
        className="hidden lg:flex absolute -left-16 top-1/3 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 items-center gap-3"
        style={{ animation: 'float 4s ease-in-out infinite' }}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Conversion</p>
          <p className="text-xl font-bold text-gray-900">32.5%</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50, y: -20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.2 }}
        animate={{ y: [0, -8, 0] }}
        className="hidden lg:flex absolute -right-16 top-1/2 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 items-center gap-3"
        style={{ animation: 'float 4s ease-in-out infinite 0.5s' }}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">AI Insights</p>
          <p className="text-sm font-medium text-gray-900">3 suggestions</p>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function EnterpriseLanding({ onLogin }) {
  const [isAnnual, setIsAnnual] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeFaq, setActiveFaq] = useState(null)
  const [modules, setModules] = useState(defaultModules)
  const [plans, setPlans] = useState(defaultPlans)
  const [loading, setLoading] = useState(true)
  
  const { scrollYProgress } = useScroll()
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: true })

  // Fetch dynamic data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/landing')
        const result = await response.json()
        if (result.plans?.length > 0) {
          setPlans(result.plans.map(p => ({
            ...p,
            popular: p.id === 'professional' || p.name?.toLowerCase().includes('professional')
          })))
        }
        if (result.modules?.length > 0) {
          setModules(result.modules)
        }
      } catch (error) {
        console.error('Failed to fetch landing data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const calculatePrice = (price) => isAnnual ? Math.round(price * 0.85) : price

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* CSS for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
      `}} />

      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 z-[60] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-2 lg:gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                BuildCRM
              </span>
            </motion.div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {['Features', 'Modules', 'Pricing', 'Integrations'].map((item) => (
                <motion.button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group"
                  whileHover={{ y: -2 }}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300" />
                </motion.button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" onClick={onLogin} className="font-medium">
                Sign In
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={onLogin} 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 px-6 font-medium"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Mobile menu */}
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
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
              className="lg:hidden bg-white border-t"
            >
              <div className="px-4 py-6 space-y-4">
                {['Features', 'Modules', 'Pricing', 'Integrations'].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase())}
                    className="block w-full text-left py-2 font-medium"
                  >
                    {item}
                  </button>
                ))}
                <div className="pt-4 border-t space-y-3">
                  <Button variant="outline" onClick={onLogin} className="w-full">Sign In</Button>
                  <Button onClick={onLogin} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Start Free Trial</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ==================== HERO SECTION ==================== */}
      <section ref={heroRef} className="relative pt-24 lg:pt-32 pb-12 lg:pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {/* Animated Blobs */}
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-20"
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-[120px] opacity-20"
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={isHeroInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 text-blue-700 px-5 py-2.5 rounded-full text-sm font-medium mb-8 border border-blue-200/50 shadow-sm"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-4 w-4" />
              </motion.div>
              <span>Built for ₹12 Lakh Crore Construction Industry</span>
              <ChevronRight className="h-4 w-4" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-gray-900">The Only CRM</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                Built for Construction
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Stop juggling 6 apps. Manage leads, projects, inventory, and teams 
              <span className="text-gray-900 font-semibold"> in one platform</span> with 
              <span className="text-gray-900 font-semibold"> industry-specific modules</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10"
            >
              <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={onLogin}
                  className="w-full sm:w-auto h-14 px-8 text-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-2xl shadow-blue-500/30 rounded-xl font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onLogin}
                  className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 font-semibold shadow-lg"
                >
                  <Play className="mr-2 h-5 w-5 fill-gray-700" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isHeroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500"
            >
              {[
                { icon: CheckCircle2, text: 'No credit card required' },
                { icon: Clock, text: '14-day free trial' },
                { icon: Shield, text: 'Free data migration' }
              ].map((item, i) => (
                <motion.span 
                  key={i}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <item.icon className="h-4 w-4 text-green-500" />
                  {item.text}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Dashboard Mockup */}
          <div className="mt-16 lg:mt-20 max-w-6xl mx-auto">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ==================== SOCIAL PROOF ==================== */}
      <section className="py-12 lg:py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-500 text-sm mb-8"
          >
            Trusted by 500+ construction and home improvement businesses across India
          </motion.p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16">
            {['Premium Interiors', 'Elite Flooring', 'Modern Windows', 'Patel Constructions', 'Royal Kitchens', 'BuildMax'].map((company, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="text-lg lg:text-xl font-bold text-gray-300 hover:text-gray-500 transition-colors cursor-default"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PAIN POINTS - BENTO GRID ==================== */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-red-100 text-red-700 mb-4 px-4 py-1.5">The Problem</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Why <span className="text-red-600">85%</span> of Construction Businesses
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent"> Struggle to Scale</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Most businesses in home improvement still run on WhatsApp messages, Excel sheets, and scattered notes. Sound familiar?
            </p>
          </motion.div>

          {/* Bento Grid for Pain Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {painPoints.map((pain, i) => {
              const colorClasses = {
                red: 'from-red-500 to-rose-600',
                orange: 'from-orange-500 to-amber-600',
                yellow: 'from-yellow-500 to-orange-600',
                purple: 'from-purple-500 to-violet-600',
                blue: 'from-blue-500 to-cyan-600',
                gray: 'from-gray-500 to-slate-600'
              }
              
              return (
                <BentoCard 
                  key={i} 
                  size={i === 0 || i === 5 ? "wide" : "normal"}
                  className="p-6 lg:p-8"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[pain.color]} flex items-center justify-center mb-5 shadow-lg`}>
                    <pain.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{pain.title}</h3>
                  <p className="text-gray-600 mb-5">{pain.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold bg-gradient-to-r ${colorClasses[pain.color]} bg-clip-text text-transparent`}>
                      {pain.stat}
                    </span>
                    <span className="text-sm text-gray-500">{pain.statLabel}</span>
                  </div>
                </BentoCard>
              )
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl px-8 py-6">
              <p className="text-xl font-semibold text-gray-900">
                These problems cost the average business <span className="text-red-600">₹15-20 Lakhs annually</span>
              </p>
              <Button 
                onClick={onLogin}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg px-8 h-12"
              >
                See How BuildCRM Solves This
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== THE SOLUTION ==================== */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-green-100 text-green-700 mb-4 px-4 py-1.5">The Solution</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Meet <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BuildCRM</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              One platform that replaces your scattered tools. Built by construction industry experts, for construction businesses.
            </p>
          </motion.div>

          {/* Solution Bento Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Solution Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 lg:p-12 text-white shadow-2xl shadow-blue-500/20"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <span className="text-lg font-semibold text-blue-200">All-in-One Platform</span>
                </div>
                
                <h3 className="text-3xl lg:text-4xl font-bold mb-4">
                  Stop Juggling 6 Apps.
                  <br />
                  Use One.
                </h3>
                <p className="text-blue-100 text-lg mb-8 max-w-lg">
                  BuildCRM combines CRM, project management, inventory, invoicing, and team collaboration into a single, integrated platform designed specifically for your industry.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: Target, label: 'Lead Management' },
                    { icon: Kanban, label: 'Project Tracking' },
                    { icon: Package, label: 'Inventory Control' },
                    { icon: Receipt, label: 'GST Invoicing' },
                    { icon: Users, label: 'Team Collaboration' },
                    { icon: BarChart3, label: 'Analytics & Reports' }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </motion.div>
                  ))}
                </div>

                <Button 
                  onClick={onLogin}
                  className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl h-12 px-6 font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Industry Specific Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl bg-white p-6 lg:p-8 shadow-xl border border-gray-100"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Industry-Specific</h4>
              <p className="text-gray-600 text-sm mb-4">
                Not a generic CRM. Purpose-built modules for flooring, doors & windows, kitchens, and 8+ more trades.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Flooring', 'D&W', 'Kitchens', 'Contractors'].map((tag, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* AI Powered Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 lg:p-8 text-white shadow-xl"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">AI-Powered Assistant</h4>
              <p className="text-purple-100 text-sm mb-4">
                Meet Mee - your AI assistant that understands your business data and provides real-time insights.
              </p>
              <a 
                href="/mee" 
                className="inline-flex items-center text-sm font-medium text-white hover:text-purple-200 transition-colors"
              >
                Learn about Mee AI
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </motion.div>
          </div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { value: '2 min', label: 'Setup Time' },
              { value: '3x', label: 'Faster Quotes' },
              { value: '40%', label: 'More Conversions' },
              { value: '6 hrs', label: 'Saved Weekly' }
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== INDUSTRY STATS ==================== */}
      <section className="py-16 lg:py-20 bg-slate-900 text-white overflow-hidden relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">The Opportunity is <span className="text-blue-400">Massive</span></h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              The Indian construction industry is one of the largest in the world, yet most businesses still run on outdated tools.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { value: '12', suffix: 'L Cr', label: 'Construction Market', sub: 'Size by 2025' },
              { value: '50', suffix: 'M+', label: 'Industry Workers', sub: 'Across India' },
              { value: '85', suffix: '%', label: 'Manual Processes', sub: 'Digital opportunity' },
              { value: '40', suffix: '%', label: 'Time Wasted', sub: 'On admin tasks' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 lg:p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <p className="text-4xl lg:text-6xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </span>
                </p>
                <p className="text-sm lg:text-base font-semibold text-white">{stat.label}</p>
                <p className="text-xs lg:text-sm text-gray-500">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES - BENTO GRID ==================== */}
      <section id="features" className="py-16 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-purple-100 text-purple-700 mb-4 px-4 py-1.5">Features</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Run Your Business</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From lead capture to project delivery, manage your entire business in one place.
            </p>
          </motion.div>

          {/* Feature Bento Grid */}
          <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Lead Management - Large */}
            <BentoCard className="lg:col-span-7 p-6 lg:p-8" gradient="from-blue-600 to-cyan-500">
              <div className="flex flex-col h-full text-white">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <Badge className="bg-white/20 text-white mb-3 border-0">Lead Management</Badge>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-2">Capture & Convert More Leads</h3>
                    <p className="text-blue-100 text-sm lg:text-base max-w-md">
                      Multi-source capture from Website, WhatsApp, Facebook, Google Ads, IndiaMART. Auto-assignment and follow-up automation.
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Target className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">40%</p>
                    <p className="text-sm text-blue-100">Higher conversion</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">3x</p>
                    <p className="text-sm text-blue-100">Faster follow-ups</p>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Project Management - Medium */}
            <BentoCard className="lg:col-span-5 p-6 lg:p-8" gradient="from-purple-600 to-pink-500">
              <div className="flex flex-col h-full text-white">
                <Badge className="bg-white/20 text-white mb-3 border-0 w-fit">Project Management</Badge>
                <h3 className="text-xl lg:text-2xl font-bold mb-2">Deliver On Time, Every Time</h3>
                <p className="text-purple-100 text-sm mb-6">
                  Gantt charts, Kanban boards, task dependencies, and automatic client updates.
                </p>
                <div className="mt-auto flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Kanban className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">30%</p>
                    <p className="text-sm text-purple-100">Faster delivery</p>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Inventory - Medium */}
            <BentoCard className="lg:col-span-5 p-6 lg:p-8" gradient="from-orange-600 to-red-500">
              <div className="flex flex-col h-full text-white">
                <Badge className="bg-white/20 text-white mb-3 border-0 w-fit">Inventory</Badge>
                <h3 className="text-xl lg:text-2xl font-bold mb-2">Never Run Out of Stock</h3>
                <p className="text-orange-100 text-sm mb-6">
                  Multi-warehouse tracking, automatic alerts, and consumption linked to projects.
                </p>
                <div className="mt-auto flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">15%</p>
                    <p className="text-sm text-orange-100">Cost savings</p>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Finance - Large */}
            <BentoCard className="lg:col-span-7 p-6 lg:p-8" gradient="from-green-600 to-emerald-500">
              <div className="flex flex-col h-full text-white">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <Badge className="bg-white/20 text-white mb-3 border-0">Finance & Invoicing</Badge>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-2">Get Paid Faster</h3>
                    <p className="text-green-100 text-sm lg:text-base max-w-md">
                      GST-compliant invoices, payment milestones, expense tracking, and profitability reports.
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Receipt className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">50%</p>
                    <p className="text-sm text-green-100">Faster payments</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">₹5L+</p>
                    <p className="text-sm text-green-100">Recovered yearly</p>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* AI Assistant */}
            <BentoCard className="lg:col-span-4 p-6 lg:p-8">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Assistant (Mee)</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Ask questions in plain English. Get instant answers about your business data.
                </p>
                <div className="mt-auto p-3 bg-gray-100 rounded-xl text-sm text-gray-600">
                  &ldquo;Show me all leads from last week that haven&apos;t been contacted&rdquo;
                </div>
              </div>
            </BentoCard>

            {/* Reports */}
            <BentoCard className="lg:col-span-4 p-6 lg:p-8">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Reports</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Dashboard with live KPIs. Track revenue, conversion rates, and team performance.
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${moduleColors[i]} flex items-center justify-center text-white text-xs font-bold border-2 border-white`}>
                        {['R', 'S', 'P', 'I'][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">+12 reports</span>
                </div>
              </div>
            </BentoCard>

            {/* Mobile */}
            <BentoCard className="lg:col-span-4 p-6 lg:p-8">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mobile App</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Manage your business from anywhere. Works offline, syncs when connected.
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">4.8 on Play Store</span>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ==================== MEE AI SHOWCASE ==================== */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-violet-950 via-purple-950 to-slate-950 text-white overflow-hidden relative">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/30 via-transparent to-transparent" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[150px] opacity-20"
            animate={{ scale: [1, 1.3, 1], x: [0, 50, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[150px] opacity-20"
            animate={{ scale: [1.3, 1, 1.3], x: [0, -50, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-6">AI-Powered</Badge>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Meet <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Mee</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Your intelligent AI assistant with <strong className="text-white">real-time access</strong> to all your business data. 
                Ask questions in plain English, get instant insights powered by GPT-4.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  { icon: Database, text: 'Real-time access to leads, projects, inventory & invoices' },
                  { icon: MessageSquare, text: 'Natural language queries - ask anything about your business' },
                  { icon: Lightbulb, text: 'Smart recommendations to improve performance' },
                  { icon: Activity, text: 'Business health monitoring with automated alerts' }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-violet-400" />
                    </div>
                    <span className="text-gray-300">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg"
                    onClick={() => window.location.href = '/mee'}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-xl shadow-violet-500/30 h-12 px-6"
                  >
                    Explore Mee AI
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={onLogin}
                    className="border-white/20 text-white hover:bg-white/10 h-12 px-6"
                  >
                    Try It Free
                  </Button>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Right - Chat Demo */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
              
              {/* Chat Window */}
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-slate-800/50 px-5 py-4 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Mee AI</p>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Online
                    </p>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="p-5 space-y-4">
                  {/* User */}
                  <div className="flex justify-end">
                    <div className="bg-violet-600 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xs">
                      <p className="text-white text-sm">What&apos;s my business health score?</p>
                    </div>
                  </div>
                  
                  {/* Mee Response */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">M</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm">
                      <p className="text-white text-sm font-semibold mb-2">📊 Business Health Report</p>
                      <p className="text-gray-300 text-sm mb-2"><strong className="text-green-400">Score: 78/100</strong></p>
                      <ul className="text-gray-400 text-xs space-y-1">
                        <li>• Lead Conversion: 32% ✓</li>
                        <li>• Task Completion: 89% ✓</li>
                        <li>• 3 leads need follow-up ⚠️</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Input */}
                <div className="px-5 py-4 border-t border-white/5">
                  <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5">
                    <input 
                      type="text" 
                      placeholder="Ask Mee anything..."
                      className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                      disabled
                    />
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700 h-8 w-8 p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== BEFORE VS AFTER ==================== */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-green-100 text-green-700 mb-4 px-4 py-1.5">Transformation</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              From <span className="text-red-600">Chaos</span> to <span className="text-green-600">Control</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how businesses transform their operations with BuildCRM
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -top-3 left-6 z-10">
                <Badge className="bg-red-500 text-white border-0 px-4 py-1 shadow-lg">BEFORE</Badge>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-3xl p-6 lg:p-8 pt-10">
                <h3 className="text-xl font-bold text-red-700 mb-6 flex items-center gap-2">
                  <XCircle className="h-6 w-6" />
                  Without BuildCRM
                </h3>
                <div className="space-y-3">
                  {comparisonData.before.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/80"
                    >
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                      <span className="text-sm lg:text-base text-gray-700">{item}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-red-100 rounded-xl">
                  <p className="text-red-800 font-semibold text-center">
                    ⏱️ Average admin time: <span className="text-red-600">4+ hours/day</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -top-3 left-6 z-10">
                <Badge className="bg-green-500 text-white border-0 px-4 py-1 shadow-lg">AFTER</Badge>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-6 lg:p-8 pt-10">
                <h3 className="text-xl font-bold text-green-700 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  With BuildCRM
                </h3>
                <div className="space-y-3">
                  {comparisonData.after.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/80"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm lg:text-base text-gray-700">{item}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-green-100 rounded-xl">
                  <p className="text-green-800 font-semibold text-center">
                    ⏱️ Average admin time: <span className="text-green-600">Under 1 hour/day</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Result Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { value: '3x', label: 'Faster Quote Generation', color: 'blue' },
              { value: '40%', label: 'More Leads Converted', color: 'green' },
              { value: '6 hrs', label: 'Saved Weekly on Admin', color: 'purple' },
              { value: '₹5L+', label: 'Recovered Revenue/Year', color: 'orange' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`bg-gradient-to-br from-${stat.color}-600 to-${stat.color}-700 rounded-2xl p-5 lg:p-6 text-center text-white shadow-lg`}
              >
                <p className="text-2xl lg:text-4xl font-bold mb-1">{stat.value}</p>
                <p className="text-xs lg:text-sm text-${stat.color}-100">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== MODULES ==================== */}
      <section id="modules" className="py-16 lg:py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-orange-100 text-orange-700 mb-4 px-4 py-1.5">Industry Modules</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Purpose-Built for Your
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"> Industry</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Not just another generic CRM. Each module is designed with features specific to your trade.
            </p>
          </motion.div>

          {/* Module Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {modules.map((module, i) => {
              const ModuleIcon = moduleIcons[module.id] || Package
              const color = moduleColors[i % moduleColors.length]
              
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <ModuleIcon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{module.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ==================== INTEGRATIONS - ADVANCED ORBITAL DESIGN ==================== */}
      <section id="integrations" className="py-16 lg:py-32 bg-slate-900 text-white overflow-hidden relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(255 255 255 / 0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {/* Animated Glow Rings */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] lg:w-[700px] lg:h-[700px] rounded-full border border-green-500/20"
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-green-500/20 text-green-300 mb-4 border border-green-500/30 px-4 py-1.5">Integrations</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Your Tools, <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Connected</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Seamlessly integrate with the tools you already use. Direct, company-built integrations that just work.
            </p>
          </motion.div>

          {/* Orbital Integration Display */}
          <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center">
            {/* Center BuildCRM Logo */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40"
            >
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-white" />
            </motion.div>

            {/* Orbital Rings - Dashed */}
            <div className="absolute w-[250px] h-[250px] sm:w-[320px] sm:h-[320px] lg:w-[420px] lg:h-[420px] rounded-full border border-dashed border-white/10" />
            <div className="absolute w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] lg:w-[560px] lg:h-[560px] rounded-full border border-dashed border-white/5" />

            {/* Rotating Container for Icons */}
            <motion.div
              className="absolute w-[250px] h-[250px] sm:w-[320px] sm:h-[320px] lg:w-[420px] lg:h-[420px]"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              {integrations.slice(0, 4).map((integration, i) => {
                const angle = i * 90
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${angle}deg) translateY(-125px) sm:translateY(-160px) lg:translateY(-210px)`,
                      marginTop: '-28px',
                      marginLeft: '-28px',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                      whileHover={{ scale: 1.2 }}
                      className="group relative"
                    >
                      <div 
                        className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer border-2 border-white/20"
                        style={{ backgroundColor: integration.color }}
                      >
                        <div 
                          className="w-8 h-8 lg:w-9 lg:h-9 text-white" 
                          dangerouslySetInnerHTML={{ __html: integration.icon }}
                        />
                      </div>
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl z-30">
                        {integration.name}
                      </div>
                    </motion.div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Outer Ring - Counter Rotating */}
            <motion.div
              className="absolute w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] lg:w-[560px] lg:h-[560px]"
              animate={{ rotate: -360 }}
              transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            >
              {integrations.slice(4, 8).map((integration, i) => {
                const angle = i * 90 + 45
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${angle}deg) translateY(-175px) sm:translateY(-225px) lg:translateY(-280px)`,
                      marginTop: '-28px',
                      marginLeft: '-28px',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                      whileHover={{ scale: 1.2 }}
                      className="group relative"
                    >
                      <div 
                        className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shadow-xl cursor-pointer border-2 border-white/20"
                        style={{ backgroundColor: integration.color }}
                      >
                        <div 
                          className="w-6 h-6 lg:w-8 lg:h-8 text-white" 
                          dangerouslySetInnerHTML={{ __html: integration.icon }}
                        />
                      </div>
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl z-30">
                        {integration.name}
                      </div>
                    </motion.div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Connection Lines Animation */}
            <svg className="absolute w-full h-full pointer-events-none opacity-20">
              <motion.line
                x1="50%" y1="50%" x2="50%" y2="15%"
                stroke="url(#lineGradient)" strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <motion.line
                x1="50%" y1="50%" x2="85%" y2="50%"
                stroke="url(#lineGradient)" strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
              />
              <motion.line
                x1="50%" y1="50%" x2="50%" y2="85%"
                stroke="url(#lineGradient)" strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.9 }}
              />
              <motion.line
                x1="50%" y1="50%" x2="15%" y2="50%"
                stroke="url(#lineGradient)" strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 1.1 }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Integration Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 grid grid-cols-3 gap-4 lg:gap-8 max-w-3xl mx-auto"
          >
            {[
              { value: '8+', label: 'Native Integrations' },
              { value: '5000+', label: 'Apps via Zapier' },
              { value: '99.9%', label: 'Uptime SLA' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="text-center p-4 lg:p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <p className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-xs lg:text-sm text-gray-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-amber-100 text-amber-700 mb-4 px-4 py-1.5">Testimonials</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Loved by <span className="text-amber-600">500+</span> Businesses
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{testimonial.stats.metric}</p>
                    <p className="text-xs text-gray-500">{testimonial.stats.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-indigo-100 text-indigo-700 mb-4 px-4 py-1.5">Pricing</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Simple, Transparent
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              No hidden fees. Cancel anytime. All plans include 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 bg-gray-100 rounded-full p-1.5">
              <button 
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  !isAnnual ? 'bg-white shadow-md text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                  isAnnual ? 'bg-white shadow-md text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">-15%</span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className={`relative rounded-3xl p-6 lg:p-8 transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-indigo-500/30 lg:scale-105 z-10'
                    : 'bg-white border-2 border-gray-100 shadow-lg hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-400 text-amber-900 border-0 shadow-lg px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl lg:text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg">₹</span>
                    <span className="text-4xl lg:text-5xl font-bold">
                      {calculatePrice(plan.price).toLocaleString()}
                    </span>
                  </div>
                  <span className={`text-sm ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>/month</span>
                  {isAnnual && (
                    <p className={`text-xs mt-1 ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>
                      Billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {(plan.features || []).slice(0, 8).map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-indigo-300' : 'text-green-500'}`} />
                      <span className="text-sm">{typeof feature === 'string' ? feature : feature.text}</span>
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={onLogin}
                    className={`w-full h-12 text-base rounded-xl font-semibold ${
                      plan.popular
                        ? 'bg-white text-indigo-600 hover:bg-gray-100'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                    }`}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-gray-200 text-gray-700 mb-4 px-4 py-1.5">FAQ</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 lg:p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: activeFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 lg:px-6 pb-5 lg:pb-6 text-gray-600">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 bg-pink-500 rounded-full blur-[150px] opacity-30"
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Ready to Transform
              <br />
              Your Business?
            </h2>
            <p className="text-lg lg:text-xl text-indigo-200 mb-10 max-w-2xl mx-auto">
              Join 500+ construction and home improvement businesses already using BuildCRM to streamline their operations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={onLogin}
                  className="h-14 px-8 text-lg bg-white text-indigo-600 hover:bg-gray-100 rounded-xl shadow-2xl font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={onLogin}
                  className="h-14 px-8 text-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold border-2 border-white/30 rounded-xl"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Schedule Demo
                </Button>
              </motion.div>
            </div>
            
            <p className="text-indigo-200 text-sm mt-8">
              No credit card required • 14-day free trial • Free data migration
            </p>
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-slate-900 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">BuildCRM</span>
              </div>
              <p className="text-gray-400 mb-6 text-sm max-w-xs">
                The all-in-one platform for construction and home improvement businesses.
              </p>
              <div className="flex gap-3">
                {[Twitter, Linkedin, Youtube, Instagram].map((Icon, i) => (
                  <motion.a 
                    key={i}
                    href="#"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Features', 'Modules', 'Pricing', 'Integrations', 'API'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact', 'Press'] },
              { title: 'Resources', links: ['Help Center', 'Documentation', 'Webinars', 'Templates'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms', 'Security', 'GDPR'] }
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 BuildCRM. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                English
              </span>
              <span className="flex items-center gap-2">
                Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> in India
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
