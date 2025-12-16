'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Building2, ArrowRight, Check, ChevronRight, Play, Star, Zap, Shield, Globe, Users,
  BarChart3, Clock, Target, Sparkles, Layers, MessageSquare,
  Calendar, FileText, TrendingUp, CheckCircle2, ArrowUpRight, Menu, X,
  Database, Cloud, Lock, Bell, Mail, Phone, MapPin, ChevronDown,
  Workflow, Settings, PieChart, LineChart, LayoutGrid, Plug, Box,
  Kanban, Video, Send, Headphones, Award, Crown, Rocket, Home,
  Hammer, PaintBucket, Wrench, Sofa, Grid3X3, DoorOpen, ChefHat,
  HardHat, Ruler, Calculator, ClipboardList, Truck, Package,
  Receipt, CreditCard, UserCheck, Building, Factory, Warehouse,
  ShoppingCart, FileSpreadsheet, Quote, Briefcase, Heart, ExternalLink,
  MousePointer, Cpu, BookOpen, GraduationCap, ArrowLeft, ScanLine, QrCode,
  AlertTriangle, RefreshCw
} from 'lucide-react'

// Animation variants
const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

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

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -8, transition: { duration: 0.3 } }}
    className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 p-6"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg`}>
      <Icon className="h-7 w-7 text-white" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </motion.div>
)

// Navbar Component
const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)

  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2 lg:gap-3">
            <motion.div 
              className="flex items-center gap-2 lg:gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Package className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                BuildCRM
              </span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <Link href="/#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 group-hover:w-full transition-all duration-300" />
            </Link>
            
            {/* Products Dropdown */}
            <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Products
                <ChevronDown className={`h-4 w-4 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {productsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  <Link href="/products/buildcrm" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">BuilDCRM</div>
                      <div className="text-xs text-gray-500">Sales & Lead Management</div>
                    </div>
                  </Link>
                  <Link href="/products/build-inventory" className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors border-l-4 border-orange-600">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">BuilD Inventory</div>
                      <div className="text-xs text-gray-500">Stock & Warehouse Management</div>
                    </div>
                  </Link>
                  <Link href="/products/build-finance" className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">BuilD Finance</div>
                      <div className="text-xs text-gray-500">Invoicing & Accounting</div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </div>
            
            <Link href="/#pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group">
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 group-hover:w-full transition-all duration-300" />
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
            <Link href="/">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:from-orange-600 hover:via-red-600 hover:to-pink-700 text-white shadow-lg shadow-orange-500/30 px-6 font-medium">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
          </div>

          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="lg:hidden bg-white border-t"
        >
          <div className="px-4 py-6 space-y-4">
            <Link href="/#features" className="block py-2 font-medium">Features</Link>
            <div className="py-2">
              <div className="font-medium mb-2">Products</div>
              <div className="pl-4 space-y-2">
                <Link href="/products/buildcrm" className="block py-1 text-gray-600">BuilDCRM</Link>
                <Link href="/products/build-inventory" className="block py-1 text-gray-600">BuilD Inventory</Link>
                <Link href="/products/build-finance" className="block py-1 text-gray-600">BuilD Finance</Link>
              </div>
            </div>
            <Link href="/#pricing" className="block py-2 font-medium">Pricing</Link>
            <div className="pt-4 border-t space-y-3">
              <Link href="/"><Button variant="outline" className="w-full">Sign In</Button></Link>
              <Link href="/"><Button className="w-full bg-gradient-to-r from-orange-500 to-red-500">Start Free Trial</Button></Link>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}

// Footer Component
const Footer = () => (
  <footer className="bg-slate-900 text-white py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">BuildCRM</span>
          </div>
          <p className="text-gray-400 max-w-sm mb-6">
            The all-in-one platform for construction businesses. Manage leads, projects, inventory, and finances in one place.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-6">Products</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><Link href="/products/buildcrm" className="hover:text-white transition-colors">BuilDCRM</Link></li>
            <li><Link href="/products/build-inventory" className="hover:text-white transition-colors">BuilD Inventory</Link></li>
            <li><Link href="/products/build-finance" className="hover:text-white transition-colors">BuilD Finance</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">Company</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
        <p>&copy; 2025 BuildCRM. All rights reserved.</p>
      </div>
    </div>
  </footer>
)

// Main Page Component
export default function BuildInventoryProductPage() {
  const { scrollYProgress } = useScroll()
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: true })

  const features = [
    {
      icon: Warehouse,
      title: "Multi-Warehouse Management",
      description: "Track inventory across multiple locations with real-time visibility into stock levels at each warehouse.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: QrCode,
      title: "Barcode & QR Scanning",
      description: "Speed up stock counts and receiving with built-in barcode scanning. Works with any smartphone camera.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: AlertTriangle,
      title: "Low Stock Alerts",
      description: "Never run out of critical materials. Get automatic alerts when stock falls below minimum levels.",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: Truck,
      title: "Purchase Order Management",
      description: "Create, track, and receive purchase orders. Auto-generate POs when stock hits reorder points.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: ClipboardList,
      title: "Project-Linked Consumption",
      description: "Track material consumption per project for accurate costing. Know exactly where your inventory goes.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "Inventory Analytics",
      description: "Insights into turnover rates, dead stock, seasonal trends, and supplier performance metrics.",
      gradient: "from-indigo-500 to-purple-500"
    }
  ]

  const stats = [
    { value: "15", suffix: "%", label: "Cost Savings" },
    { value: "0", suffix: "", label: "Stockouts" },
    { value: "80", suffix: "%", label: "Less Manual Work" },
    { value: "100", suffix: "%", label: "Visibility" }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 z-[60] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50/30 to-pink-50/50" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {/* Animated Blobs */}
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-orange-400 rounded-full blur-[120px] opacity-20"
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-red-400 rounded-full blur-[120px] opacity-20"
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
              >
                <Package className="h-4 w-4" />
                Stock & Warehouse Management
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              >
                <span className="text-gray-900">Never Run Out</span>
                <br />
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 bg-clip-text text-transparent">
                  Of Stock Again
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 }}
                className="text-lg text-gray-600 mb-8 leading-relaxed"
              >
                BuilD Inventory gives you complete control over your materials and supplies. 
                Multi-warehouse tracking, automatic reorder alerts, and project-linked consumption tracking.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <Link href="/">
                  <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-xl shadow-orange-500/30 rounded-xl">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-xl">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </div>

            {/* Hero Image/Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isHeroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 p-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="p-6">
                  {/* Inventory Dashboard Mock */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Total Items', value: '2,456', color: 'blue' },
                      { label: 'Low Stock', value: '12', color: 'orange' },
                      { label: 'On Order', value: '34', color: 'green' }
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (i * 0.1) }}
                        className={`bg-${stat.color}-50 rounded-lg p-3 text-center`}
                      >
                        <div className={`text-xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                        <div className="text-xs text-gray-500">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Items List Mock */}
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((item) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + (item * 0.1) }}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-2 w-24 bg-gray-200 rounded mb-1" />
                          <div className="h-2 w-16 bg-gray-100 rounded" />
                        </div>
                        <div className="text-sm font-medium text-gray-600">45 units</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-gray-400 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-orange-100 text-orange-700 mb-4 px-4 py-1.5">Features</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Complete Control Over Your
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"> Inventory</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful tools to manage materials, track consumption, and optimize stock levels
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-purple-100 text-purple-700 mb-4 px-4 py-1.5">How It Works</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Simple Setup, Powerful Results</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Add Your Inventory", description: "Import existing stock from Excel or add items manually. Set up warehouses and categories.", icon: Database },
              { step: "2", title: "Set Reorder Points", description: "Define minimum stock levels for each item. Get automatic alerts when stock runs low.", icon: Bell },
              { step: "3", title: "Track Everything", description: "Monitor stock movements, link consumption to projects, and generate reports.", icon: BarChart3 }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/30">
                  <item.icon className="h-10 w-10 text-white" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-8 h-8 bg-white rounded-full border-2 border-orange-500 flex items-center justify-center text-sm font-bold text-orange-500">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Take Control of Your Inventory
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Save 15% on material costs and eliminate stockouts
            </p>
            <Link href="/">
              <Button size="lg" className="h-14 px-10 text-lg bg-white text-orange-600 hover:bg-gray-100 shadow-xl rounded-xl font-semibold">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-orange-200 mt-4 text-sm">No credit card required • 14-day free trial</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
