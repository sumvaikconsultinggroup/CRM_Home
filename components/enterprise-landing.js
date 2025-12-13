'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion'
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
  ShoppingCart, FileSpreadsheet, Quote, Briefcase, Heart, ExternalLink,
  MousePointer, Cpu, BookOpen, GraduationCap, Twitter, Linkedin, Youtube, Instagram
} from 'lucide-react'

// Advanced animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

const fadeInLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

const fadeInRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } }
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
}

const floatAnimation = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  }
}

// Module icon mapping
const moduleIcons = {
  'wooden-flooring': Layers,
  'doors-windows': DoorOpen,
  'doors-and-windows': DoorOpen,
  'modular-kitchens': ChefHat,
  'kitchens': ChefHat,
  'interior-design': Sofa,
  'tiles-stone': Grid3X3,
  'contractors': HardHat,
  'painting': PaintBucket,
  'plumbing-electrical': Wrench,
  'mep-services': Wrench,
  'architects': Building2,
  'real-estate': Building,
}

// Default modules if API fails
const defaultModules = [
  { id: 'wooden-flooring', name: 'Wooden Flooring', description: 'Complete ERP for flooring manufacturers and installers', price: 999 },
  { id: 'doors-windows', name: 'Doors & Windows', description: 'Manufacturing & fabrication management for D&W businesses', price: 999 },
  { id: 'modular-kitchens', name: 'Modular Kitchens', description: 'Design-to-delivery workflow for kitchen manufacturers', price: 999 },
  { id: 'interior-design', name: 'Interior Design', description: 'Project management for interior designers & decorators', price: 999 },
  { id: 'tiles-stone', name: 'Tiles & Stone', description: 'Inventory and project management for tile dealers', price: 999 },
  { id: 'contractors', name: 'General Contractors', description: 'End-to-end project management for contractors', price: 999 },
  { id: 'painting', name: 'Painting Services', description: 'Manage painting projects from estimation to completion', price: 999 },
  { id: 'mep-services', name: 'MEP Services', description: 'For plumbing, electrical & HVAC service providers', price: 999 },
]

// Default pricing plans
const defaultPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    price: 999,
    features: ['5 Team Members', 'Lead Management', 'Project Tracking', 'Basic Reports', 'Email Support', '1 Industry Module'],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Best for growing businesses',
    price: 2499,
    features: ['25 Team Members', 'Everything in Starter', 'Advanced Analytics', 'All Integrations', 'Priority Support', '3 Industry Modules', 'AI Assistant (Mee)', 'Custom Workflows'],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 4999,
    features: ['Unlimited Team Members', 'Everything in Professional', 'Dedicated Account Manager', 'Custom Integrations', 'SLA Guarantee (99.9%)', 'All Industry Modules', 'White-label Option', 'Full API Access'],
    popular: false
  }
]

// Feature details with mockup previews
const detailedFeatures = [
  {
    category: 'Lead Management',
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    title: 'Convert More Leads into Customers',
    description: 'Capture leads from multiple sources, track every interaction, and close deals faster with our intelligent pipeline.',
    capabilities: [
      { title: 'Multi-source capture', desc: 'Website, WhatsApp, Facebook, Google Ads, IndiaMART, JustDial' },
      { title: 'Auto-assignment', desc: 'Route leads to the right salesperson based on location, product, or value' },
      { title: 'Follow-up automation', desc: 'Never miss a follow-up with smart reminders and sequences' },
      { title: 'Pipeline analytics', desc: 'See conversion rates, bottlenecks, and revenue forecasts' }
    ],
    mockupType: 'pipeline'
  },
  {
    category: 'Project Management',
    icon: Kanban,
    color: 'from-purple-500 to-pink-500',
    title: 'Deliver Projects On Time, Every Time',
    description: 'From quote acceptance to final handover, manage every aspect of your projects with complete visibility.',
    capabilities: [
      { title: 'Visual timelines', desc: 'Gantt charts, Kanban boards, and calendar views' },
      { title: 'Task dependencies', desc: 'Set predecessors and get alerts when things are blocked' },
      { title: 'Resource allocation', desc: 'Assign teams, track utilization, prevent overbooking' },
      { title: 'Client updates', desc: 'Share progress photos and status updates automatically' }
    ],
    mockupType: 'kanban'
  },
  {
    category: 'Inventory & Procurement',
    icon: Package,
    color: 'from-orange-500 to-red-500',
    title: 'Never Run Out of Stock Again',
    description: 'Track materials across warehouses, automate reorders, and optimize your inventory costs.',
    capabilities: [
      { title: 'Multi-warehouse', desc: 'Track stock across locations with transfer management' },
      { title: 'Low stock alerts', desc: 'Get notified before you run out of critical items' },
      { title: 'Purchase orders', desc: 'Create POs, track deliveries, manage vendor payments' },
      { title: 'Consumption tracking', desc: 'Link material usage to projects for accurate costing' }
    ],
    mockupType: 'inventory'
  },
  {
    category: 'Finance & Invoicing',
    icon: Receipt,
    color: 'from-green-500 to-emerald-500',
    title: 'Get Paid Faster, Track Every Rupee',
    description: 'Generate professional invoices, track payments, and manage expenses all in one place.',
    capabilities: [
      { title: 'GST-compliant invoices', desc: 'Auto-calculate taxes, generate e-invoices' },
      { title: 'Payment milestones', desc: 'Set up advance, progress, and final payments' },
      { title: 'Expense tracking', desc: 'Capture receipts, categorize expenses, approve claims' },
      { title: 'Profitability reports', desc: 'See margins by project, client, or product type' }
    ],
    mockupType: 'finance'
  }
]

// Integrations with real SVG icons
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
    avatar: "RA"
  },
  {
    quote: "The Wooden Flooring module is exactly what our industry needed. The cut-list optimization alone has saved us 15% on material costs.",
    author: "Priya Sharma",
    role: "Operations Head",
    company: "Elite Flooring Co",
    location: "Delhi",
    avatar: "PS"
  },
  {
    quote: "Our sales team now closes deals 3x faster. The automatic WhatsApp follow-ups and lead scoring have been game changers.",
    author: "Amit Kumar",
    role: "Sales Manager",
    company: "Modern Windows Ltd",
    location: "Bangalore",
    avatar: "AK"
  },
  {
    quote: "As a contractor, I manage 15+ projects simultaneously. BuildCRM's multi-project dashboard gives me complete visibility without the chaos.",
    author: "Suresh Patel",
    role: "Founder",
    company: "Patel Constructions",
    location: "Ahmedabad",
    avatar: "SP"
  }
]

// FAQ data
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
    answer: 'Yes, all plans come with a 14-day free trial. No credit card required. You get full access to all features during the trial period so you can properly evaluate if BuildCRM is right for your business.'
  },
  {
    question: 'How does pricing work for modules?',
    answer: 'Our base plans include a set number of industry modules. Starter gets 1 module, Professional gets 3, and Enterprise gets all modules. Additional modules can be added for ₹999/month each.'
  },
  {
    question: 'What support do you offer?',
    answer: 'Starter plans get email support. Professional plans include priority chat support with 4-hour response time. Enterprise plans get a dedicated account manager and phone support. All plans include access to our knowledge base and video tutorials.'
  }
]

// Animated counter component
const AnimatedCounter = ({ value, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  
  useEffect(() => {
    if (isInView) {
      const numValue = parseInt(value.replace(/[^0-9]/g, ''))
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
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// Feature Mockup Component
const FeatureMockup = ({ type, color }) => {
  const mockups = {
    pipeline: (
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-sm text-gray-500 ml-2">Lead Pipeline</span>
        </div>
        <div className="p-4 grid grid-cols-4 gap-3">
          {['New', 'Contacted', 'Qualified', 'Won'].map((stage, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">{stage}</span>
                <span className="text-xs text-gray-400">{4 - i}</span>
              </div>
              {[...Array(4 - i)].map((_, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + j * 0.05 }}
                  className="bg-white border rounded-lg p-2 shadow-sm"
                >
                  <div className="h-2 w-16 bg-gray-200 rounded mb-1" />
                  <div className="h-1.5 w-12 bg-gray-100 rounded" />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    kanban: (
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-sm text-gray-500 ml-2">Project Board</span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {['To Do', 'In Progress', 'Done'].map((col, i) => (
            <div key={i} className={`p-3 rounded-lg ${i === 0 ? 'bg-gray-50' : i === 1 ? 'bg-blue-50' : 'bg-green-50'}`}>
              <span className="text-xs font-semibold mb-2 block">{col}</span>
              {[...Array(3 - i)].map((_, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15 + j * 0.1 }}
                  className="bg-white rounded-lg p-2 mb-2 shadow-sm border"
                >
                  <div className="h-2 w-full bg-gray-200 rounded mb-2" />
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-purple-200" />
                    <div className="h-1.5 w-8 bg-gray-100 rounded mt-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    inventory: (
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-sm text-gray-500 ml-2">Inventory Dashboard</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Total Items', value: '1,248', color: 'blue' },
              { label: 'Low Stock', value: '23', color: 'orange' },
              { label: 'Out of Stock', value: '5', color: 'red' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-2 rounded-lg bg-${stat.color}-50 text-center`}
              >
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-lg font-bold text-${stat.color}-600`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>
          <div className="space-y-2">
            {[75, 45, 90, 30].map((w, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: `${w}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                className="h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    ),
    finance: (
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-sm text-gray-500 ml-2">Financial Overview</span>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-1 h-24 mb-4">
            {[35, 55, 40, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                className="flex-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t"
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Jan</span>
            <span>Jun</span>
            <span>Dec</span>
          </div>
        </div>
      </div>
    )
  }
  
  return mockups[type] || mockups.pipeline
}

// Main Component
export default function EnterpriseLanding({ onLogin }) {
  const [isAnnual, setIsAnnual] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeModule, setActiveModule] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeFaq, setActiveFaq] = useState(null)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [modules, setModules] = useState(defaultModules)
  const [plans, setPlans] = useState(defaultPlans)
  const [loading, setLoading] = useState(true)
  
  const { scrollYProgress } = useScroll()
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: true })

  // Fetch dynamic data from API
  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const response = await fetch('/api/landing')
        const result = await response.json()
        if (result.success) {
          if (result.data.modules?.length > 0) {
            setModules(result.data.modules)
          }
          if (result.data.plans?.length > 0) {
            // Format plans for display
            const formattedPlans = result.data.plans.map(plan => ({
              ...plan,
              features: plan.features || [],
              popular: plan.id === 'professional' || plan.name?.toLowerCase().includes('professional')
            }))
            setPlans(formattedPlans)
          }
        }
      } catch (error) {
        console.error('Failed to fetch landing data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLandingData()
  }, [])

  // Auto-rotate modules and testimonials
  useEffect(() => {
    const moduleInterval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % modules.length)
    }, 4000)
    
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    
    return () => {
      clearInterval(moduleInterval)
      clearInterval(testimonialInterval)
    }
  }, [modules.length])

  const calculatePrice = (monthlyPrice) => {
    return isAnnual ? Math.round(monthlyPrice * 0.85) : monthlyPrice
  }

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 z-[60] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navigation - Fixed */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-2 lg:gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-9 h-9 lg:w-11 lg:h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                BuildCRM
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {['Features', 'Modules', 'Why Us', 'Integrations', 'Pricing'].map((item, i) => (
                <motion.button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group"
                  whileHover={{ y: -2 }}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300" />
                </motion.button>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" onClick={onLogin} className="text-gray-700 font-medium">
                Sign In
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={onLogin} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 px-6"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Mobile menu button */}
            <motion.button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Menu className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {['Features', 'Modules', 'Why Us', 'Integrations', 'Pricing'].map((item, i) => (
                  <motion.button
                    key={item}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                    className="block w-full text-left py-2 text-gray-700 font-medium"
                  >
                    {item}
                  </motion.button>
                ))}
                <div className="pt-4 border-t space-y-3">
                  <Button variant="outline" onClick={onLogin} className="w-full">Sign In</Button>
                  <Button onClick={onLogin} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">Start Free Trial</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 lg:pt-32 pb-8 lg:pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] lg:bg-[size:60px_60px]" />
        
        {/* Animated floating elements */}
        <motion.div 
          className="hidden lg:block absolute top-1/4 left-10 w-72 h-72 bg-blue-400 rounded-full blur-[100px] opacity-20"
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="hidden lg:block absolute bottom-1/4 right-10 w-72 h-72 bg-purple-400 rounded-full blur-[100px] opacity-20"
          animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge with animation */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={isHeroInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-blue-200"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-4 w-4" />
              </motion.div>
              <span>Built for the ₹12 Lakh Crore Construction Industry</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <motion.span 
                className="text-gray-900 block"
                initial={{ opacity: 0, x: -20 }}
                animate={isHeroInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2 }}
              >
                The Only CRM Built for
              </motion.span>
              <motion.span 
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent block"
                initial={{ opacity: 0, x: 20 }}
                animate={isHeroInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 }}
              >
                Home Improvement
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed"
            >
              Manage leads, projects, inventory, and teams in one platform. 
              Purpose-built modules for flooring, doors & windows, kitchens, and more.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
            >
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={onLogin}
                  className="w-full sm:w-auto h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/30 rounded-xl font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onLogin}
                  className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl bg-white text-gray-900 font-semibold"
                >
                  <Play className="mr-2 h-5 w-5 fill-gray-700" />
                  <span className="text-gray-900">Watch Demo</span>
                </Button>
              </motion.div>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isHeroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500"
            >
              {['No credit card required', '14-day free trial', 'Free data migration'].map((item, i) => (
                <motion.span 
                  key={i}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Dashboard Preview - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.7, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 lg:mt-16 relative"
          >
            <div className="relative mx-auto max-w-6xl perspective-1000">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
              
              {/* Browser Chrome */}
              <motion.div 
                className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl p-3 lg:p-4"
                initial={{ rotateX: 10 }}
                whileInView={{ rotateX: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <motion.div whileHover={{ scale: 1.2 }} className="w-3 h-3 rounded-full bg-red-500" />
                    <motion.div whileHover={{ scale: 1.2 }} className="w-3 h-3 rounded-full bg-yellow-500" />
                    <motion.div whileHover={{ scale: 1.2 }} className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-gray-700/50 rounded-lg h-8 flex items-center px-4 ml-2">
                    <Lock className="h-3 w-3 text-green-400 mr-2" />
                    <span className="text-gray-300 text-sm">app.buildcrm.com/dashboard</span>
                  </div>
                </div>
              </motion.div>
              
              {/* Dashboard Content */}
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 p-4 lg:p-8 rounded-b-2xl shadow-2xl">
                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                  {[
                    { label: 'Revenue', value: '₹24.5L', change: '+12%', icon: TrendingUp, color: 'green' },
                    { label: 'Active Leads', value: '156', change: '+8 new', icon: Target, color: 'blue' },
                    { label: 'Projects', value: '42', change: '3 due', icon: Briefcase, color: 'purple' },
                    { label: 'Tasks', value: '28', change: '5 today', icon: CheckCircle2, color: 'orange' }
                  ].map((stat, i) => (
                    <motion.div 
                      key={i} 
                      className="bg-white rounded-xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs lg:text-sm text-gray-500">{stat.label}</span>
                        <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
                      </div>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-xs lg:text-sm text-${stat.color}-600`}>{stat.change}</p>
                    </motion.div>
                  ))}
                </div>
                
                {/* Main Dashboard Grid */}
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Chart */}
                  <div className="lg:col-span-2 bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-gray-900">Revenue Overview</span>
                      <span className="text-sm text-gray-500">Last 12 months</span>
                    </div>
                    <div className="flex items-end gap-1 lg:gap-2 h-32 lg:h-48">
                      {[35, 55, 40, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ delay: 1 + i * 0.05, duration: 0.5 }}
                          className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t hover:from-blue-500 hover:to-indigo-400 transition-colors cursor-pointer"
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
                    <span className="font-semibold text-gray-900 block mb-4">Recent Activity</span>
                    <div className="space-y-3">
                      {[
                        { text: 'New lead from website', time: '2m ago', color: 'blue' },
                        { text: 'Project #42 completed', time: '15m ago', color: 'green' },
                        { text: 'Invoice paid ₹45,000', time: '1h ago', color: 'purple' },
                        { text: 'Meeting scheduled', time: '2h ago', color: 'orange' }
                      ].map((item, i) => (
                        <motion.div 
                          key={i}
                          className="flex items-center gap-3"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.2 + i * 0.1 }}
                        >
                          <div className={`w-2 h-2 rounded-full bg-${item.color}-500`} />
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{item.text}</p>
                            <p className="text-xs text-gray-400">{item.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats Cards */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              {...floatAnimation}
              className="hidden lg:block absolute -left-8 top-1/3 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversion Rate</p>
                  <p className="text-xl font-bold text-gray-900">32.5%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7 }}
              animate={{ y: [0, -8, 0] }}
              className="hidden lg:block absolute -right-8 top-1/2 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100"
              style={{ animation: 'float 4s ease-in-out infinite 0.5s' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
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

      {/* Social Proof Bar */}
      <section className="py-8 lg:py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center text-gray-500 text-sm mb-6"
          >
            Trusted by 500+ construction and home improvement businesses across India
          </motion.p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16">
            {['Premium Interiors', 'Elite Flooring', 'Modern Windows', 'Patel Constructions', 'Royal Kitchens'].map((company, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-lg lg:text-xl font-bold text-gray-300 hover:text-gray-500 transition-colors"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Stats - Clean Design */}
      <section className="py-16 lg:py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">The Opportunity is Massive</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              The Indian construction industry is one of the largest in the world, yet most businesses still run on outdated tools.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { value: '12', suffix: 'L Cr', label: 'Indian Construction Market', sublabel: 'Expected by 2025' },
              { value: '50', suffix: 'M+', label: 'Workers in Industry', sublabel: 'Across India' },
              { value: '85', suffix: '%', label: 'Still Use Manual Processes', sublabel: 'Opportunity for digital' },
              { value: '40', suffix: '%', label: 'Time Wasted', sublabel: 'On admin tasks' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
              >
                <p className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm lg:text-base font-medium text-white mt-2">{stat.label}</p>
                <p className="text-xs lg:text-sm text-gray-400">{stat.sublabel}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Modules Section - Dynamic from API */}
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
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"> Industry</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              Not just another generic CRM. Each module is designed with features specific to your trade.
            </p>
          </motion.div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {modules.map((module, i) => {
              const ModuleIcon = moduleIcons[module.id] || Package
              const colors = [
                'from-amber-500 to-orange-600',
                'from-blue-500 to-cyan-600',
                'from-rose-500 to-pink-600',
                'from-purple-500 to-violet-600',
                'from-slate-500 to-gray-600',
                'from-yellow-500 to-amber-600',
                'from-green-500 to-emerald-600',
                'from-indigo-500 to-blue-600'
              ]
              const color = colors[i % colors.length]
              
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  onClick={() => setActiveModule(i)}
                  className={`cursor-pointer rounded-2xl p-5 lg:p-6 transition-all duration-300 ${
                    activeModule === i 
                      ? `bg-gradient-to-br ${color} text-white shadow-xl`
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    activeModule === i ? 'bg-white/20' : `bg-gradient-to-br ${color}`
                  }`}>
                    <ModuleIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{module.name}</h3>
                  <p className={`text-sm mb-4 ${activeModule === i ? 'text-white/80' : 'text-gray-600'}`}>
                    {module.description}
                  </p>
                  
                  <AnimatePresence>
                    {activeModule === i && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-3 border-t border-white/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">₹{module.price}/month</span>
                          <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onLogin(); }}
                            className="bg-white/20 hover:bg-white/30 text-white"
                          >
                            Learn More
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section - With Mockups */}
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
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Run Your Business</span>
            </h2>
          </motion.div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-2 lg:gap-4 mb-8 lg:mb-12">
            {detailedFeatures.map((feature, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveFeature(i)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all ${
                  activeFeature === i
                    ? `bg-gradient-to-r ${feature.color} text-white shadow-lg`
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <feature.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="hidden sm:inline">{feature.category}</span>
              </motion.button>
            ))}
          </div>

          {/* Feature Detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl lg:rounded-3xl shadow-xl overflow-hidden border border-gray-100"
            >
              <div className="grid lg:grid-cols-2">
                <div className="p-6 lg:p-12">
                  <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-r ${detailedFeatures[activeFeature].color} text-white mb-6`}>
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
                      <motion.div 
                        key={i} 
                        className="flex gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{cap.title}</p>
                          <p className="text-sm text-gray-600">{cap.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Feature Mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 lg:p-12 flex items-center justify-center">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-md"
                  >
                    <FeatureMockup 
                      type={detailedFeatures[activeFeature].mockupType} 
                      color={detailedFeatures[activeFeature].color}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Why BuildCRM - Cleaner Design */}
      <section id="why-us" className="py-16 lg:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <Badge className="bg-blue-500/20 text-blue-300 mb-4 border border-blue-500/30">Why BuildCRM</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Stop Paying for 6 Apps.
              <span className="text-blue-400"> Use One.</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Replace your fragmented tool stack with one integrated platform built for construction.
            </p>
          </motion.div>

          {/* Comparison */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
            {/* Without BuildCRM */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-xl font-bold">Without BuildCRM</h3>
              </div>
              <div className="space-y-4">
                {[
                  { tool: 'WhatsApp', use: 'Lead Management', cost: '₹0' },
                  { tool: 'Excel', use: 'Project Tracking', cost: '₹7,000/yr' },
                  { tool: 'Tally', use: 'Accounting', cost: '₹18,000/yr' },
                  { tool: 'Google Drive', use: 'Documents', cost: '₹2,400/yr' },
                  { tool: 'Slack/Zoom', use: 'Communication', cost: '₹12,000/yr' },
                  { tool: 'Manual', use: 'Inventory', cost: '₹15L+ losses' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                        {item.tool.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.tool}</p>
                        <p className="text-xs text-gray-500">{item.use}</p>
                      </div>
                    </div>
                    <span className="text-sm text-red-400">{item.cost}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <p className="text-center">
                  <span className="text-red-400 font-bold">Total: ₹50,000+/year</span>
                  <span className="text-gray-500 text-sm block">+ countless hours lost</span>
                </p>
              </div>
            </motion.div>

            {/* With BuildCRM */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-blue-500/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-xl font-bold">With BuildCRM</h3>
              </div>
              <div className="space-y-4">
                {[
                  'Lead & Pipeline Management',
                  'Project & Task Tracking',
                  'Invoicing & GST Billing',
                  'Document Management',
                  'Team Chat & Video',
                  'Inventory Management',
                  'AI Assistant (Mee)',
                  'Industry-specific Modules'
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                  >
                    <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <p className="text-center">
                  <span className="text-green-400 font-bold text-2xl">₹2,499/month</span>
                  <span className="text-gray-400 text-sm block">Everything included</span>
                </p>
              </div>
            </motion.div>
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
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"> Tools</span>
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
                whileHover={{ y: -5, scale: 1.02 }}
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

      {/* Testimonials */}
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
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Across India</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className={`bg-white rounded-xl lg:rounded-2xl p-5 lg:p-6 shadow-lg transition-all ${
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
                    <p className="text-xs text-gray-400">{testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Dynamic */}
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
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className={`relative rounded-2xl lg:rounded-3xl p-6 lg:p-8 transition-all ${
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
                    ₹{calculatePrice(plan.price).toLocaleString()}
                  </span>
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
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-indigo-300' : 'text-green-500'}`} />
                      <span className="text-sm">{typeof feature === 'string' ? feature : feature.text}</span>
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 lg:p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: activeFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
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
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={onLogin}
                  className="h-14 px-8 text-lg bg-white text-indigo-600 hover:bg-gray-100 rounded-xl shadow-xl font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  onClick={onLogin}
                  className="h-14 px-8 text-lg bg-white hover:bg-gray-100 text-indigo-700 font-semibold border-2 border-white rounded-xl shadow-lg"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  <span>Schedule Demo</span>
                </Button>
              </motion.div>
            </div>
            <p className="text-indigo-200 text-sm mt-6">
              No credit card required • 14-day free trial • Free data migration
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer - Monday.com Style */}
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
              <p className="text-gray-400 mb-6 max-w-sm text-sm">
                The all-in-one platform for construction and home improvement businesses. Manage leads, projects, inventory, and teams in one place.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: Twitter, href: '#' },
                  { icon: Linkedin, href: '#' },
                  { icon: Youtube, href: '#' },
                  { icon: Instagram, href: '#' }
                ].map((social, i) => (
                  <motion.a 
                    key={i}
                    href={social.href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <social.icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Modules</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/press" className="hover:text-white transition-colors">Press</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Webinars</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="/gdpr" className="hover:text-white transition-colors">GDPR</a></li>
                <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
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
