'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  ShoppingCart, FileSpreadsheet, Quote, Briefcase, Heart
} from 'lucide-react'

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } }
}

// Industry Modules Data
const industryModules = [
  {
    id: 'wooden-flooring',
    name: 'Wooden Flooring',
    icon: Layers,
    color: 'from-amber-500 to-orange-600',
    description: 'Complete ERP for flooring manufacturers and installers',
    features: ['Inventory by wood type & grade', 'Cut-list optimization', 'Installation scheduling', 'Waste tracking', 'Client site photos'],
    stats: { users: '120+', projects: '2,400+' }
  },
  {
    id: 'doors-windows',
    name: 'Doors & Windows',
    icon: DoorOpen,
    color: 'from-blue-500 to-cyan-600',
    description: 'Manufacturing & fabrication management for D&W businesses',
    features: ['Survey & measurement', 'Quotation configurator', 'Production tracking', 'QC checklists', 'Installation management'],
    stats: { users: '85+', projects: '1,800+' }
  },
  {
    id: 'kitchens',
    name: 'Modular Kitchens',
    icon: ChefHat,
    color: 'from-rose-500 to-pink-600',
    description: 'Design-to-delivery workflow for kitchen manufacturers',
    features: ['3D design integration', 'Material BOQ', 'Cabinet tracking', 'Appliance management', 'Installation crews'],
    stats: { users: '95+', projects: '1,500+' }
  },
  {
    id: 'interior-design',
    name: 'Interior Design',
    icon: Sofa,
    color: 'from-purple-500 to-violet-600',
    description: 'Project management for interior designers & decorators',
    features: ['Mood boards', 'Vendor management', 'Budget tracking', 'Client approvals', 'Timeline management'],
    stats: { users: '200+', projects: '3,200+' }
  },
  {
    id: 'tiles-stone',
    name: 'Tiles & Stone',
    icon: Grid3X3,
    color: 'from-slate-500 to-gray-600',
    description: 'Inventory and project management for tile dealers',
    features: ['SKU management', 'Lot tracking', 'Cutting orders', 'Delivery scheduling', 'Wastage reports'],
    stats: { users: '75+', projects: '1,200+' }
  },
  {
    id: 'contractors',
    name: 'General Contractors',
    icon: HardHat,
    color: 'from-yellow-500 to-amber-600',
    description: 'End-to-end project management for contractors',
    features: ['Multi-project dashboard', 'Subcontractor management', 'Material procurement', 'Daily logs', 'Payment milestones'],
    stats: { users: '150+', projects: '2,800+' }
  },
  {
    id: 'painting',
    name: 'Painting Services',
    icon: PaintBucket,
    color: 'from-green-500 to-emerald-600',
    description: 'Manage painting projects from estimation to completion',
    features: ['Surface area calculator', 'Paint quantity estimator', 'Color tracking', 'Crew scheduling', 'Before/after photos'],
    stats: { users: '60+', projects: '900+' }
  },
  {
    id: 'plumbing-electrical',
    name: 'MEP Services',
    icon: Wrench,
    color: 'from-indigo-500 to-blue-600',
    description: 'For plumbing, electrical & HVAC service providers',
    features: ['Service tickets', 'AMC management', 'Spare parts inventory', 'Technician tracking', 'Invoice generation'],
    stats: { users: '110+', projects: '4,500+' }
  }
]

// Construction Industry Stats
const industryStats = [
  { value: '₹12L Cr', label: 'Indian Construction Market', sublabel: 'Expected by 2025' },
  { value: '50M+', label: 'Workers in Industry', sublabel: 'Across India' },
  { value: '85%', label: 'Still Use Manual Processes', sublabel: 'Opportunity for digital' },
  { value: '40%', label: 'Time Wasted', sublabel: 'On admin tasks' }
]

// Feature Details
const detailedFeatures = [
  {
    category: 'Lead Management',
    icon: Target,
    color: 'bg-blue-500',
    title: 'Convert More Leads into Customers',
    description: 'Capture leads from multiple sources, track every interaction, and close deals faster with our intelligent pipeline.',
    capabilities: [
      { title: 'Multi-source capture', desc: 'Website, WhatsApp, Facebook, Google Ads, IndiaMART, JustDial' },
      { title: 'Auto-assignment', desc: 'Route leads to the right salesperson based on location, product, or value' },
      { title: 'Follow-up automation', desc: 'Never miss a follow-up with smart reminders and sequences' },
      { title: 'Pipeline analytics', desc: 'See conversion rates, bottlenecks, and revenue forecasts' }
    ],
    image: '/lead-pipeline.png'
  },
  {
    category: 'Project Management',
    icon: Kanban,
    color: 'bg-purple-500',
    title: 'Deliver Projects On Time, Every Time',
    description: 'From quote acceptance to final handover, manage every aspect of your projects with complete visibility.',
    capabilities: [
      { title: 'Visual timelines', desc: 'Gantt charts, Kanban boards, and calendar views' },
      { title: 'Task dependencies', desc: 'Set predecessors and get alerts when things are blocked' },
      { title: 'Resource allocation', desc: 'Assign teams, track utilization, prevent overbooking' },
      { title: 'Client updates', desc: 'Share progress photos and status updates automatically' }
    ],
    image: '/project-management.png'
  },
  {
    category: 'Inventory & Procurement',
    icon: Package,
    color: 'bg-orange-500',
    title: 'Never Run Out of Stock Again',
    description: 'Track materials across warehouses, automate reorders, and optimize your inventory costs.',
    capabilities: [
      { title: 'Multi-warehouse', desc: 'Track stock across locations with transfer management' },
      { title: 'Low stock alerts', desc: 'Get notified before you run out of critical items' },
      { title: 'Purchase orders', desc: 'Create POs, track deliveries, manage vendor payments' },
      { title: 'Consumption tracking', desc: 'Link material usage to projects for accurate costing' }
    ],
    image: '/inventory.png'
  },
  {
    category: 'Finance & Invoicing',
    icon: Receipt,
    color: 'bg-green-500',
    title: 'Get Paid Faster, Track Every Rupee',
    description: 'Generate professional invoices, track payments, and manage expenses all in one place.',
    capabilities: [
      { title: 'GST-compliant invoices', desc: 'Auto-calculate taxes, generate e-invoices' },
      { title: 'Payment milestones', desc: 'Set up advance, progress, and final payments' },
      { title: 'Expense tracking', desc: 'Capture receipts, categorize expenses, approve claims' },
      { title: 'Profitability reports', desc: 'See margins by project, client, or product type' }
    ],
    image: '/finance.png'
  }
]

// Comparison data
const comparisonData = {
  tools: [
    { name: 'BuildCRM', logo: Building2, highlight: true },
    { name: 'Slack', logo: MessageSquare },
    { name: 'Jira', logo: ClipboardList },
    { name: 'Salesforce', logo: Cloud },
    { name: 'Asana', logo: CheckCircle2 },
    { name: 'Tally', logo: Calculator }
  ],
  features: [
    { name: 'Lead Management', buildcrm: true, slack: false, jira: false, salesforce: true, asana: false, tally: false },
    { name: 'Project Tracking', buildcrm: true, slack: false, jira: true, salesforce: false, asana: true, tally: false },
    { name: 'Team Communication', buildcrm: true, slack: true, jira: false, salesforce: false, asana: true, tally: false },
    { name: 'Inventory Management', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false, tally: true },
    { name: 'Invoicing & GST', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false, tally: true },
    { name: 'Industry-specific Modules', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false, tally: false },
    { name: 'AI Assistant', buildcrm: true, slack: false, jira: false, salesforce: true, asana: false, tally: false },
    { name: 'WhatsApp Integration', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false, tally: false },
    { name: 'Site Survey Tools', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false, tally: false },
    { name: 'Installation Tracking', buildcrm: true, slack: false, jira: false, salesforce: false, asana: false, tally: false }
  ],
  pricing: {
    buildcrm: '₹2,499',
    others: '₹15,000+'
  }
}

// Integration with proper SVG icons
const integrations = [
  { 
    name: 'Slack', 
    description: 'Team notifications',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
    color: '#4A154B'
  },
  { 
    name: 'Google Sheets', 
    description: 'Data export & sync',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M19.385 2H4.615C3.173 2 2 3.173 2 4.615v14.77C2 20.827 3.173 22 4.615 22h14.77c1.442 0 2.615-1.173 2.615-2.615V4.615C22 3.173 20.827 2 19.385 2zM8.462 17.846H5.538v-2.923h2.924v2.923zm0-4.384H5.538v-2.924h2.924v2.924zm0-4.385H5.538V6.154h2.924v2.923zm5.23 8.769h-2.923v-2.923h2.923v2.923zm0-4.384h-2.923v-2.924h2.923v2.924zm0-4.385h-2.923V6.154h2.923v2.923zm4.77 8.769h-2.924v-2.923h2.924v2.923zm0-4.384h-2.924v-2.924h2.924v2.924zm0-4.385h-2.924V6.154h2.924v2.923z"/>
      </svg>
    ),
    color: '#0F9D58'
  },
  { 
    name: 'WhatsApp', 
    description: 'Customer messaging',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: '#25D366'
  },
  { 
    name: 'Zoom', 
    description: 'Video meetings',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M4.585 4.585C3.71 4.585 3 5.295 3 6.17v7.002c0 .875.71 1.585 1.585 1.585h9.83c.875 0 1.585-.71 1.585-1.585V6.17c0-.875-.71-1.585-1.585-1.585H4.585zm14.83 2.1v5.972l3.585-2.1V6.685l-3.585 2.1zM4.585 17.415C3.71 17.415 3 18.125 3 19v.83c0 .875.71 1.585 1.585 1.585h14.83c.875 0 1.585-.71 1.585-1.585V19c0-.875-.71-1.585-1.585-1.585H4.585z"/>
      </svg>
    ),
    color: '#2D8CFF'
  },
  { 
    name: 'Zapier', 
    description: '5000+ app connections',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm5.176 10.145l-2.283 2.283 2.283 2.283a.5.5 0 010 .707l-.707.707a.5.5 0 01-.707 0L12 13.842l-2.283 2.283a.5.5 0 01-.707 0l-.707-.707a.5.5 0 010-.707l2.283-2.283-2.283-2.283a.5.5 0 010-.707l.707-.707a.5.5 0 01.707 0L12 10.158l2.283-2.283a.5.5 0 01.707 0l.707.707a.5.5 0 010 .563z"/>
      </svg>
    ),
    color: '#FF4A00'
  },
  { 
    name: 'Tally', 
    description: 'Accounting sync',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v2H7V7zm0 4h4v2H7v-2zm0 4h4v2H7v-2zm6-8h4v2h-4V7zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z"/>
      </svg>
    ),
    color: '#ED1C24'
  },
  { 
    name: 'Google Calendar', 
    description: 'Schedule sync',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
      </svg>
    ),
    color: '#4285F4'
  },
  { 
    name: 'Pabbly', 
    description: 'Workflow automation',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    color: '#5468FF'
  }
]

// Testimonials
const testimonials = [
  {
    quote: "We were using 6 different apps before BuildCRM. Now everything is in one place - leads, projects, inventory, invoices. Our team productivity has increased by 40%.",
    author: "Rajesh Agarwal",
    role: "Managing Director",
    company: "Premium Interiors Pvt Ltd",
    location: "Mumbai",
    avatar: "RA",
    image: null
  },
  {
    quote: "The Wooden Flooring module is exactly what our industry needed. The cut-list optimization alone has saved us 15% on material costs.",
    author: "Priya Sharma",
    role: "Operations Head",
    company: "Elite Flooring Co",
    location: "Delhi",
    avatar: "PS",
    image: null
  },
  {
    quote: "Our sales team now closes deals 3x faster. The automatic WhatsApp follow-ups and lead scoring have been game changers.",
    author: "Amit Kumar",
    role: "Sales Manager",
    company: "Modern Windows Ltd",
    location: "Bangalore",
    avatar: "AK",
    image: null
  },
  {
    quote: "As a contractor, I manage 15+ projects simultaneously. BuildCRM's multi-project dashboard gives me complete visibility without the chaos.",
    author: "Suresh Patel",
    role: "Founder",
    company: "Patel Constructions",
    location: "Ahmedabad",
    avatar: "SP",
    image: null
  }
]

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    monthlyPrice: 999,
    features: [
      { text: '5 Team Members', included: true },
      { text: 'Lead Management', included: true },
      { text: 'Project Tracking', included: true },
      { text: 'Basic Reports', included: true },
      { text: 'Email Support', included: true },
      { text: '1 Industry Module', included: true },
      { text: 'AI Assistant', included: false },
      { text: 'Custom Workflows', included: false },
      { text: 'API Access', included: false }
    ],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    name: 'Professional',
    description: 'Best for growing businesses',
    monthlyPrice: 2499,
    features: [
      { text: '25 Team Members', included: true },
      { text: 'Everything in Starter', included: true },
      { text: 'Advanced Analytics', included: true },
      { text: 'All Integrations', included: true },
      { text: 'Priority Support', included: true },
      { text: '3 Industry Modules', included: true },
      { text: 'AI Assistant (Mee)', included: true },
      { text: 'Custom Workflows', included: true },
      { text: 'API Access', included: false }
    ],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 4999,
    features: [
      { text: 'Unlimited Team Members', included: true },
      { text: 'Everything in Professional', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: 'Custom Integrations', included: true },
      { text: 'SLA Guarantee (99.9%)', included: true },
      { text: 'All Industry Modules', included: true },
      { text: 'White-label Option', included: true },
      { text: 'On-premise Deployment', included: true },
      { text: 'Full API Access', included: true }
    ],
    cta: 'Contact Sales',
    popular: false
  }
]

// FAQ data
const faqs = [
  {
    question: 'What makes BuildCRM different from generic CRMs?',
    answer: 'BuildCRM is purpose-built for the construction and home improvement industry. Unlike generic CRMs, we offer industry-specific modules for flooring, doors & windows, kitchens, and more. Features like site surveys, cut-list optimization, and installation tracking are built-in, not afterthoughts.'
  },
  {
    question: 'Can I import my existing data?',
    answer: 'Yes! We offer free data migration assistance. Our team will help you import leads, customers, projects, and inventory from spreadsheets or your existing software. Most migrations are completed within 48 hours.'
  },
  {
    question: 'Is BuildCRM available in regional languages?',
    answer: 'Currently, BuildCRM is available in English and Hindi. We are actively working on adding support for Tamil, Telugu, Marathi, Gujarati, and other regional languages. Contact us for specific language requirements.'
  },
  {
    question: 'How secure is my data?',
    answer: 'We take security seriously. All data is encrypted in transit and at rest. We use enterprise-grade cloud infrastructure with daily backups. Each client gets isolated databases ensuring complete data privacy.'
  },
  {
    question: 'Can I use BuildCRM on mobile?',
    answer: 'Absolutely! BuildCRM is fully responsive and works great on mobile browsers. We also have dedicated Android and iOS apps (coming soon) for field teams who need offline access.'
  },
  {
    question: 'What support do you offer?',
    answer: 'Starter plans get email support. Professional plans include priority chat support with 4-hour response time. Enterprise plans get a dedicated account manager and phone support. All plans include access to our knowledge base and video tutorials.'
  }
]

export default function EnterpriseLanding({ onLogin }) {
  const [isAnnual, setIsAnnual] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeModule, setActiveModule] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeFaq, setActiveFaq] = useState(null)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  // Auto-rotate modules and testimonials
  useEffect(() => {
    const moduleInterval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % industryModules.length)
    }, 4000)
    
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    
    return () => {
      clearInterval(moduleInterval)
      clearInterval(testimonialInterval)
    }
  }, [])

  const calculatePrice = (monthlyPrice) => {
    return isAnnual ? Math.round(monthlyPrice * 0.85) : monthlyPrice
  }

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Fixed */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-9 h-9 lg:w-11 lg:h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                BuildCRM
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('modules')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Modules
              </button>
              <button onClick={() => scrollToSection('comparison')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Why Us
              </button>
              <button onClick={() => scrollToSection('integrations')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Integrations
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Pricing
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" onClick={onLogin} className="text-gray-700 font-medium">
                Sign In
              </Button>
              <Button 
                onClick={onLogin} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 px-6"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
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
              className="lg:hidden bg-white border-t border-gray-100"
            >
              <div className="px-4 py-6 space-y-4">
                <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-700 font-medium">Features</button>
                <button onClick={() => scrollToSection('modules')} className="block w-full text-left py-2 text-gray-700 font-medium">Modules</button>
                <button onClick={() => scrollToSection('comparison')} className="block w-full text-left py-2 text-gray-700 font-medium">Why Us</button>
                <button onClick={() => scrollToSection('integrations')} className="block w-full text-left py-2 text-gray-700 font-medium">Integrations</button>
                <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 text-gray-700 font-medium">Pricing</button>
                <div className="pt-4 border-t space-y-3">
                  <Button variant="outline" onClick={onLogin} className="w-full">Sign In</Button>
                  <Button onClick={onLogin} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">Start Free Trial</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] lg:bg-[size:60px_60px]" />
        
        {/* Floating elements - hidden on mobile */}
        <div className="hidden lg:block absolute top-1/4 left-10 w-72 h-72 bg-blue-400 rounded-full blur-[100px] opacity-20" />
        <div className="hidden lg:block absolute bottom-1/4 right-10 w-72 h-72 bg-purple-400 rounded-full blur-[100px] opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>Built for the ₹12 Lakh Crore Construction Industry</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-gray-900">The Only CRM Built for</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Home Improvement
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed"
            >
              Manage leads, projects, inventory, and teams in one platform. 
              Purpose-built modules for flooring, doors & windows, kitchens, and more.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
            >
              <Button 
                size="lg" 
                onClick={onLogin}
                className="w-full sm:w-auto h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/30 rounded-xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={onLogin}
                className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl bg-white text-gray-900 font-semibold"
              >
                <Play className="mr-2 h-5 w-5 fill-gray-700" />
                <span className="text-gray-900">Schedule Demo</span>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                14-day free trial
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Free data migration
              </span>
            </motion.div>
          </div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-12 lg:mt-16 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Browser Chrome */}
              <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl lg:rounded-t-2xl p-2 lg:p-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-gray-600 rounded-md lg:rounded-lg h-6 lg:h-8 flex items-center px-3 lg:px-4 ml-2">
                    <span className="text-gray-300 text-xs lg:text-sm">app.buildcrm.com/dashboard</span>
                  </div>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-4 lg:p-8 rounded-b-xl lg:rounded-b-2xl shadow-2xl">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                  {[
                    { label: 'Revenue', value: '₹24.5L', change: '+12%', icon: TrendingUp, color: 'text-green-600' },
                    { label: 'Active Leads', value: '156', change: '+8 new', icon: Target, color: 'text-blue-600' },
                    { label: 'Projects', value: '42', change: '3 due', icon: Briefcase, color: 'text-purple-600' },
                    { label: 'Tasks', value: '28', change: '5 today', icon: CheckCircle2, color: 'text-orange-600' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs lg:text-sm text-gray-500">{stat.label}</span>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-xs lg:text-sm ${stat.color}`}>{stat.change}</p>
                    </div>
                  ))}
                </div>
                
                {/* Chart placeholder */}
                <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-gray-900">Revenue Overview</span>
                    <span className="text-sm text-gray-500">Last 12 months</span>
                  </div>
                  <div className="flex items-end gap-1 lg:gap-2 h-24 lg:h-40">
                    {[35, 55, 40, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats Cards - Hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="hidden lg:block absolute -left-4 top-1/3 bg-white rounded-xl shadow-xl p-4 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversion Rate</p>
                  <p className="text-lg font-bold text-gray-900">32.5%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="hidden lg:block absolute -right-4 top-1/2 bg-white rounded-xl shadow-xl p-4 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">AI Insights</p>
                  <p className="text-sm font-medium text-gray-900">3 new suggestions</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pain Points Section - Why Construction Businesses Struggle */}
      <section className="py-16 lg:py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-red-100 text-red-700 mb-4">The Problem</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why 85% of Construction Businesses Struggle to Scale
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Most businesses in the home improvement industry still run on WhatsApp messages, Excel sheets, and scattered notes. Sound familiar?
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'Leads Lost in WhatsApp',
                description: 'Customer inquiries get buried in group chats. No one knows who followed up or what was promised.',
                stat: '40%',
                statLabel: 'leads lost to poor tracking'
              },
              {
                icon: FileText,
                title: 'Excel Chaos',
                description: 'Multiple versions of the same file. Wrong prices quoted. Inventory counts that never match reality.',
                stat: '6 hrs',
                statLabel: 'wasted weekly on data entry'
              },
              {
                icon: Clock,
                title: 'Project Delays',
                description: 'Materials arrive late. Workers show up at wrong sites. Clients complain about missed deadlines.',
                stat: '30%',
                statLabel: 'of projects run over time'
              },
              {
                icon: Receipt,
                title: 'Payment Leakages',
                description: 'Invoices sent late or never. Advance payments not tracked. Margins eaten by unrecorded expenses.',
                stat: '₹2-3L',
                statLabel: 'lost yearly to poor billing'
              },
              {
                icon: Users,
                title: 'Team Confusion',
                description: 'Installers don\'t know schedules. Office staff can\'t find documents. Everyone calls the owner for everything.',
                stat: '50%',
                statLabel: 'time spent on coordination'
              },
              {
                icon: BarChart3,
                title: 'No Visibility',
                description: 'Which products sell best? Which salesperson performs? What\'s the profit margin? Nobody really knows.',
                stat: '0',
                statLabel: 'real-time business insights'
              }
            ].map((pain, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <pain.icon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pain.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{pain.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">{pain.stat}</span>
                  <span className="text-xs text-gray-500">{pain.statLabel}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-xl font-semibold text-gray-900 mb-4">
              These problems cost the average construction business ₹15-20 Lakhs annually in lost revenue and wasted time.
            </p>
            <Button 
              onClick={onLogin}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg px-8 h-12"
            >
              See How BuildCRM Solves This
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Industry Stats Section */}
      <section className="py-12 lg:py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {industryStats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm lg:text-base font-medium text-white mt-1">{stat.label}</p>
                <p className="text-xs lg:text-sm text-gray-400">{stat.sublabel}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Modules Section */}
      <section id="modules" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-orange-100 text-orange-700 mb-4">Industry Modules</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Purpose-Built for Your
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"> Industry</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              Not just another generic CRM. Each module is designed with features specific to your trade.
            </p>
          </motion.div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {industryModules.map((module, i) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveModule(i)}
                className={`cursor-pointer rounded-2xl p-5 lg:p-6 transition-all duration-300 ${
                  activeModule === i 
                    ? `bg-gradient-to-br ${module.color} text-white shadow-xl scale-[1.02]`
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  activeModule === i ? 'bg-white/20' : `bg-gradient-to-br ${module.color}`
                }`}>
                  <module.icon className={`h-6 w-6 ${activeModule === i ? 'text-white' : 'text-white'}`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{module.name}</h3>
                <p className={`text-sm mb-4 ${activeModule === i ? 'text-white/80' : 'text-gray-600'}`}>
                  {module.description}
                </p>
                
                {activeModule === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    {module.features.slice(0, 3).map((feature, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-white/90">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    <div className="pt-3 flex items-center gap-4 text-xs">
                      <span className="bg-white/20 px-2 py-1 rounded">{module.stats.users} users</span>
                      <span className="bg-white/20 px-2 py-1 rounded">{module.stats.projects} projects</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section id="features" className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-purple-100 text-purple-700 mb-4">Features</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Everything You Need to
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Run Your Business</span>
            </h2>
          </motion.div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-2 lg:gap-4 mb-8 lg:mb-12">
            {detailedFeatures.map((feature, i) => (
              <button
                key={i}
                onClick={() => setActiveFeature(i)}
                className={`flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all ${
                  activeFeature === i
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <feature.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="hidden sm:inline">{feature.category}</span>
              </button>
            ))}
          </div>

          {/* Feature Detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl lg:rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="grid lg:grid-cols-2">
                <div className="p-6 lg:p-12">
                  <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-xl ${detailedFeatures[activeFeature].color} text-white mb-6`}>
                    {(() => {
                      const Icon = detailedFeatures[activeFeature].icon
                      return <Icon className="h-6 w-6 lg:h-7 lg:w-7" />
                    })()}
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                    {detailedFeatures[activeFeature].title}
                  </h3>
                  <p className="text-gray-600 text-lg mb-8">
                    {detailedFeatures[activeFeature].description}
                  </p>
                  
                  <div className="space-y-4">
                    {detailedFeatures[activeFeature].capabilities.map((cap, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{cap.title}</p>
                          <p className="text-sm text-gray-600">{cap.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 lg:p-12 flex items-center justify-center">
                  <div className="w-full max-w-md aspect-video bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <div className="text-center p-8">
                      {(() => {
                        const Icon = detailedFeatures[activeFeature].icon
                        return <Icon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      })()}
                      <p className="text-gray-400 text-sm">Feature Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-16 lg:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-blue-500/20 text-blue-300 mb-4">Why BuildCRM</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Replace 6+ Tools with
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> One Platform</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">
              Stop paying for Slack + Jira + Salesforce + Tally separately. Get everything in BuildCRM.
            </p>
          </motion.div>

          {/* Cost Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 rounded-2xl p-6 lg:p-8 mb-12"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-center md:text-left">
                <p className="text-gray-400 mb-2">Using multiple tools costs you</p>
                <p className="text-4xl lg:text-5xl font-bold text-red-400 line-through">₹50,000+/month</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                  {['Slack', 'Jira', 'Salesforce', 'Tally', 'Asana', 'Zoho'].map((tool) => (
                    <span key={tool} className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">{tool}</span>
                  ))}
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-gray-400 mb-2">With BuildCRM, pay just</p>
                <p className="text-4xl lg:text-5xl font-bold text-green-400">₹2,499/month</p>
                <p className="text-green-400 mt-2">Save ₹47,500+ every month</p>
              </div>
            </div>
          </motion.div>

          {/* Feature Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-2 lg:px-4 font-medium text-gray-400">Feature</th>
                  {comparisonData.tools.map((tool, i) => (
                    <th key={i} className="py-4 px-2 lg:px-4 text-center">
                      <div className={`flex flex-col items-center ${tool.highlight ? '' : 'opacity-60'}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tool.highlight ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-white/10'
                        }`}>
                          <tool.logo className="h-5 w-5 text-white" />
                        </div>
                        <span className={`text-xs lg:text-sm mt-1 ${tool.highlight ? 'font-bold' : ''}`}>{tool.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.features.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-sm lg:text-base font-medium">{row.name}</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-center">
                      {row.buildcrm && (
                        <div className="inline-flex items-center justify-center w-7 h-7 bg-green-500/20 rounded-full">
                          <Check className="h-4 w-4 text-green-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-center opacity-60">
                      {row.slack && <Check className="h-4 w-4 text-gray-500 inline" />}
                      {!row.slack && <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-center opacity-60">
                      {row.jira && <Check className="h-4 w-4 text-gray-500 inline" />}
                      {!row.jira && <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-center opacity-60">
                      {row.salesforce && <Check className="h-4 w-4 text-gray-500 inline" />}
                      {!row.salesforce && <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-center opacity-60">
                      {row.asana && <Check className="h-4 w-4 text-gray-500 inline" />}
                      {!row.asana && <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-center opacity-60">
                      {row.tally && <Check className="h-4 w-4 text-gray-500 inline" />}
                      {!row.tally && <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-green-100 text-green-700 mb-4">Integrations</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Connect Your Favorite
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"> Tools Seamlessly</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              Direct, company-built integrations. Not hacky workarounds that break.
            </p>
          </motion.div>

          {/* Integration Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {integrations.map((integration, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border-2 border-gray-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center hover:border-gray-200 hover:shadow-lg transition-all group"
              >
                <div 
                  className="w-14 h-14 lg:w-16 lg:h-16 mx-auto rounded-xl lg:rounded-2xl flex items-center justify-center mb-3 lg:mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${integration.color}15`, color: integration.color }}
                >
                  {integration.icon}
                </div>
                <p className="font-semibold text-gray-900">{integration.name}</p>
                <p className="text-xs lg:text-sm text-gray-500 mt-1">{integration.description}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-8">
            + Connect to 5000+ apps via Zapier & Pabbly
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-amber-100 text-amber-700 mb-4">Testimonials</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Trusted by 500+ Businesses
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Across India</span>
            </h2>
          </motion.div>

          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white rounded-xl lg:rounded-2xl p-5 lg:p-6 shadow-lg ${
                  activeTestimonial === i ? 'ring-2 ring-blue-500 shadow-xl' : ''
                }`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm lg:text-base mb-4 line-clamp-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.author}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                    <p className="text-xs text-gray-400">{testimonial.company}, {testimonial.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-indigo-100 text-indigo-700 mb-4">Pricing</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Simple, Transparent
              <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              No hidden fees. No surprises. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 bg-gray-100 rounded-full p-1">
              <button 
                onClick={() => setIsAnnual(false)}
                className={`px-4 lg:px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  !isAnnual ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={`px-4 lg:px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  isAnnual ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                }`}
              >
                Annual
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Save 15%</span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl lg:rounded-3xl p-6 lg:p-8 ${
                  plan.popular
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/30 lg:scale-105 z-10'
                    : 'bg-white border-2 border-gray-100'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-400 text-amber-900 shadow-lg">Most Popular</Badge>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl lg:text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <span className="text-4xl lg:text-5xl font-bold">
                    ₹{calculatePrice(plan.monthlyPrice).toLocaleString()}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>/month</span>
                  {isAnnual && (
                    <p className={`text-xs mt-1 ${plan.popular ? 'text-indigo-200' : 'text-gray-500'}`}>
                      Billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      {feature.included ? (
                        <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-indigo-300' : 'text-green-500'}`} />
                      ) : (
                        <X className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-gray-300'}`} />
                      )}
                      <span className={`text-sm ${!feature.included && !plan.popular ? 'text-gray-400' : ''}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={onLogin}
                  className={`w-full h-12 text-base rounded-xl ${
                    plan.popular
                      ? 'bg-white text-indigo-600 hover:bg-gray-100'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-gray-200 text-gray-700 mb-4">FAQ</Badge>
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
                className="bg-white rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 lg:p-6 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
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

      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
            <p className="text-lg lg:text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
              Join 500+ construction and home improvement businesses already using BuildCRM to streamline their operations.
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
                onClick={onLogin}
                className="h-14 px-8 text-lg bg-white hover:bg-gray-100 text-indigo-700 font-semibold border-2 border-white rounded-xl shadow-lg"
              >
                <Phone className="mr-2 h-5 w-5" />
                <span>Schedule Demo</span>
              </Button>
            </div>
            <p className="text-indigo-200 text-sm mt-6">
              No credit card required • 14-day free trial • Free data migration
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">BuildCRM</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-sm text-sm">
                The all-in-one platform for construction and home improvement businesses. Manage leads, projects, inventory, and teams in one place.
              </p>
              <div className="flex gap-3">
                {[Globe, Mail, Phone].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Modules</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 BuildCRM. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Security</a>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              <span>in India</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
