'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Package, Ruler, FileText, Wrench, Warehouse, Users, Settings,
  Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download, Upload,
  TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, Send,
  AlertTriangle, ChevronRight, MoreVertical, Printer, Image, MapPin, Phone, Mail,
  Calendar, Building2, Layers, Box, Boxes, Truck, BarChart3, PieChart, Target,
  Palette, Sofa, Armchair, Bed, UtensilsCrossed, Table2, BookOpen, Tv,
  Hammer, Paintbrush, Scissors, Cog, ClipboardList, FileCheck, PackageCheck,
  ShieldCheck, History, ExternalLink, Tags, X, ChevronDown, ArrowRight, Star,
  Sparkles, Zap, Grid3X3, List, Kanban, GanttChart, Activity, Bell,
  Command, Save, Copy, Archive, Bookmark, Share2, Link2, PanelLeftClose,
  Brain, MessageSquare, Wand2, ImagePlus, Video, FileImage, RotateCcw, Maximize2
} from 'lucide-react'

// Glassmorphism Components
const GlassCard = ({ children, className = '', hover = true, ...props }) => (
  <motion.div
    className={`
      relative overflow-hidden rounded-2xl
      bg-white/70 dark:bg-slate-900/70 
      backdrop-blur-xl backdrop-saturate-150
      border border-white/20 dark:border-slate-700/50
      shadow-[0_8px_32px_rgba(0,0,0,0.08)]
      ${hover ? 'hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300' : ''}
      ${className}
    `}
    {...props}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-white/10 pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </motion.div>
)

const GlassPanel = ({ children, className = '' }) => (
  <div className={`
    bg-white/50 dark:bg-slate-800/50 
    backdrop-blur-md rounded-xl 
    border border-white/30 dark:border-slate-700/30
    ${className}
  `}>
    {children}
  </div>
)

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue', delay = 0 }) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-indigo-500/20 text-blue-600',
    green: 'from-emerald-500/20 to-teal-500/20 text-emerald-600',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-600',
    purple: 'from-purple-500/20 to-violet-500/20 text-purple-600',
    rose: 'from-rose-500/20 to-pink-500/20 text-rose-600',
    cyan: 'from-cyan-500/20 to-sky-500/20 text-cyan-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// Navigation items - Enterprise level with all features for Manufacturers & Dealers
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  // AI Assistant
  { id: 'mee-ai', label: 'MEE AI', icon: Brain, group: 'ai', badge: 'new' },
  // Intake & CRM
  { id: 'requirements', label: 'Requirements', icon: ClipboardList, group: 'intake', badge: 'intake' },
  { id: 'measurements', label: 'Measurements', icon: Ruler, group: 'intake' },
  { id: 'design-briefs', label: 'Design Briefs', icon: Palette, group: 'intake' },
  // Sales & Quotations
  { id: 'quotations', label: 'Quotations', icon: FileText, group: 'sales' },
  { id: 'orders', label: 'Orders', icon: PackageCheck, group: 'sales' },
  { id: 'invoices', label: 'Invoices', icon: DollarSign, group: 'sales' },
  // Product Management
  { id: 'products', label: 'Product Catalog', icon: Package, group: 'products' },
  { id: 'materials', label: 'Materials', icon: Layers, group: 'products' },
  { id: 'hardware', label: 'Hardware', icon: Cog, group: 'products' },
  { id: 'media-gallery', label: 'Media Gallery', icon: ImagePlus, group: 'products' },
  // Procurement & Inventory
  { id: 'suppliers', label: 'Suppliers', icon: Truck, group: 'procurement' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: FileCheck, group: 'procurement' },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, group: 'procurement' },
  // Production (for Manufacturers)
  { id: 'bom', label: 'Bill of Materials', icon: ClipboardList, group: 'production' },
  { id: 'work-orders', label: 'Work Orders', icon: Hammer, group: 'production' },
  { id: 'production', label: 'Production Plan', icon: GanttChart, group: 'production' },
  // Execution & Delivery
  { id: 'installations', label: 'Delivery & Install', icon: Truck, group: 'execution' },
  { id: 'service-tickets', label: 'Service & Warranty', icon: ShieldCheck, group: 'execution' },
  // Dealer Features
  { id: 'showroom', label: 'Showroom', icon: Building2, group: 'dealer' },
  // Reports & Config
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'reports' },
  { id: 'config', label: 'Config Studio', icon: Settings, group: 'config' },
  { id: 'settings', label: 'Settings', icon: Cog, group: 'config' }
]

// Navigation group labels
const navGroups = {
  main: null,
  ai: 'AI Assistant',
  intake: 'CRM & Intake',
  sales: 'Sales & Finance',
  products: 'Catalog',
  procurement: 'Procurement',
  production: 'Production',
  execution: 'Execution',
  dealer: 'Dealer',
  reports: 'Analytics',
  config: 'Settings'
}

// Category icons
const categoryIcons = {
  wardrobe: Boxes,
  bed: Bed,
  sofa: Sofa,
  dining: Table2,
  storage: BookOpen,
  desk: Table2,
  kitchen: UtensilsCrossed,
  tv_unit: Tv,
  other: Package
}

// Status colors
const statusColors = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  site_visit_scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
  measurement_done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  design_in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  quote_sent: 'bg-pink-100 text-pink-700 border-pink-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  closed_lost: 'bg-red-100 text-red-700 border-red-200',
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  internal_review: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  customer_approved: 'bg-teal-100 text-teal-700 border-teal-200',
  locked: 'bg-gray-100 text-gray-700 border-gray-200',
  scheduled: 'bg-sky-100 text-sky-700 border-sky-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

export function FurnitureModule({ user, client, token, onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState({ type: null, data: null })
  const [drawerOpen, setDrawerOpen] = useState({ type: null, data: null })

  // Data states
  const [config, setConfig] = useState(null)
  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  const [hardware, setHardware] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [requirements, setRequirements] = useState([])
  const [measurements, setMeasurements] = useState([])
  const [designBriefs, setDesignBriefs] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  
  // Additional data states for enterprise features
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [inventory, setInventory] = useState({ inventory: [], summary: {}, lowStockCount: 0 })
  const [installations, setInstallations] = useState([])
  const [serviceTickets, setServiceTickets] = useState([])
  const [showroomDisplays, setShowroomDisplays] = useState([])
  const [analytics, setAnalytics] = useState(null)
  
  // Phase 3: Production states
  const [boms, setBoms] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [productionData, setProductionData] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [moduleSettings, setModuleSettings] = useState(null)
  
  // Phase 4: MEE AI states
  const [aiChatMessages, setAiChatMessages] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [mediaGallery, setMediaGallery] = useState([])
  
  // MEE AI Studio states (moved from render function)
  const [aiMode, setAiMode] = useState('chat')
  const [selectedRequirement, setSelectedRequirement] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [materialSuggestions, setMaterialSuggestions] = useState(null)
  const [pricingSuggestions, setPricingSuggestions] = useState(null)
  const [leadTimePrediction, setLeadTimePrediction] = useState(null)
  
  // Media Gallery states (moved from render function)
  const [mediaFilter, setMediaFilter] = useState('all')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    fileUrl: '',
    mediaType: 'image',
    category: 'general',
    title: '',
    description: ''
  })
  
  // CRM Sync state
  const [crmSyncStatus, setCrmSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)

  // API headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // Fetch functions
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/config', { headers })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }, [token])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/products', { headers })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }, [token])

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/materials', { headers })
      if (res.ok) {
        const data = await res.json()
        setMaterials(data.materials || [])
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    }
  }, [token])

  const fetchHardware = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/hardware', { headers })
      if (res.ok) {
        const data = await res.json()
        setHardware(data.hardware || [])
      }
    } catch (error) {
      console.error('Failed to fetch hardware:', error)
    }
  }, [token])

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/warehouses', { headers })
      if (res.ok) {
        const data = await res.json()
        setWarehouses(data.warehouses || [])
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }, [token])

  const fetchRequirements = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/requirements', { headers })
      if (res.ok) {
        const data = await res.json()
        setRequirements(data.requirements || [])
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error)
    }
  }, [token])

  const fetchMeasurements = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/measurements', { headers })
      if (res.ok) {
        const data = await res.json()
        setMeasurements(data.measurements || [])
      }
    } catch (error) {
      console.error('Failed to fetch measurements:', error)
    }
  }, [token])

  const fetchDesignBriefs = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/design-briefs', { headers })
      if (res.ok) {
        const data = await res.json()
        setDesignBriefs(data.designBriefs || [])
      }
    } catch (error) {
      console.error('Failed to fetch design briefs:', error)
    }
  }, [token])

  // Additional fetch functions for enterprise features
  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/quotations', { headers })
      if (res.ok) {
        const data = await res.json()
        setQuotations(data.quotations || [])
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error)
    }
  }, [token])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/orders', { headers })
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }, [token])

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/suppliers', { headers })
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }, [token])

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/purchase-orders', { headers })
      if (res.ok) {
        const data = await res.json()
        setPurchaseOrders(data.purchaseOrders || [])
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error)
    }
  }, [token])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/inventory', { headers })
      if (res.ok) {
        const data = await res.json()
        setInventory(data)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    }
  }, [token])

  const fetchInstallations = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/installations', { headers })
      if (res.ok) {
        const data = await res.json()
        setInstallations(data.installations || [])
      }
    } catch (error) {
      console.error('Failed to fetch installations:', error)
    }
  }, [token])

  const fetchServiceTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/service-tickets', { headers })
      if (res.ok) {
        const data = await res.json()
        setServiceTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to fetch service tickets:', error)
    }
  }, [token])

  const fetchShowroom = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/showroom', { headers })
      if (res.ok) {
        const data = await res.json()
        setShowroomDisplays(data.displays || [])
      }
    } catch (error) {
      console.error('Failed to fetch showroom:', error)
    }
  }, [token])

  const fetchAnalytics = useCallback(async (type = 'overview') => {
    try {
      const res = await fetch(`/api/module/furniture/analytics?type=${type}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }, [token])

  // CRM Sync Functions
  const fetchCrmSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/sync', { headers })
      if (res.ok) {
        const data = await res.json()
        setCrmSyncStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch CRM sync status:', error)
    }
  }, [token])

  const handleSyncFromCRM = async (syncType) => {
    try {
      setSyncing(true)
      const res = await fetch('/api/module/furniture/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: `sync_${syncType}` })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || `Synced ${syncType} from CRM`)
        fetchRequirements()
        fetchCrmSyncStatus()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync from CRM')
    } finally {
      setSyncing(false)
    }
  }

  const handlePushToCRM = async (requirementId) => {
    try {
      setSyncing(true)
      const res = await fetch('/api/module/furniture/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'push_to_crm', entityId: requirementId })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Created project ${data.project?.projectNumber} in CRM`)
        fetchRequirements()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to push to CRM')
      }
    } catch (error) {
      toast.error('Failed to push to CRM')
    } finally {
      setSyncing(false)
    }
  }

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        fetchConfig(),
        fetchProducts(),
        fetchMaterials(),
        fetchHardware(),
        fetchWarehouses(),
        fetchRequirements(),
        fetchMeasurements(),
        fetchDesignBriefs(),
        fetchCrmSyncStatus()
      ])
      setLoading(false)
    }
    init()
  }, [])

  // Fetch tab-specific data
  useEffect(() => {
    if (activeTab === 'products') fetchProducts()
    if (activeTab === 'materials') fetchMaterials()
    if (activeTab === 'hardware') fetchHardware()
    if (activeTab === 'inventory') { fetchWarehouses(); fetchInventory() }
    if (activeTab === 'requirements') { fetchRequirements(); fetchCrmSyncStatus() }
    if (activeTab === 'measurements') fetchMeasurements()
    if (activeTab === 'design-briefs') fetchDesignBriefs()
    if (activeTab === 'quotations') fetchQuotations()
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'suppliers') fetchSuppliers()
    if (activeTab === 'purchase-orders') fetchPurchaseOrders()
    if (activeTab === 'installations') fetchInstallations()
    if (activeTab === 'service-tickets') fetchServiceTickets()
    if (activeTab === 'showroom') fetchShowroom()
    if (activeTab === 'reports') fetchAnalytics()
    if (activeTab === 'bom') fetchBOMs()
    if (activeTab === 'work-orders') fetchWorkOrders()
    if (activeTab === 'production') fetchProductionData()
    if (activeTab === 'invoices') fetchInvoices()
    if (activeTab === 'settings') fetchModuleSettings()
    if (activeTab === 'media-gallery') fetchMediaGallery()
  }, [activeTab])

  // Phase 3: Production fetch functions
  const fetchBOMs = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/bom', { headers })
      if (res.ok) {
        const data = await res.json()
        setBoms(data.boms || [])
      }
    } catch (error) {
      console.error('Failed to fetch BOMs:', error)
    }
  }, [token])

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/work-orders?view=kanban', { headers })
      if (res.ok) {
        const data = await res.json()
        setWorkOrders(data.workOrders || [])
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error)
    }
  }, [token])

  const fetchProductionData = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/production?view=overview', { headers })
      if (res.ok) {
        const data = await res.json()
        setProductionData(data)
      }
    } catch (error) {
      console.error('Failed to fetch production data:', error)
    }
  }, [token])

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/invoices', { headers })
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    }
  }, [token])

  const fetchModuleSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/settings', { headers })
      if (res.ok) {
        const data = await res.json()
        setModuleSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }, [token])

  // Phase 4: MEE AI Functions
  const fetchMediaGallery = useCallback(async () => {
    try {
      const res = await fetch('/api/module/furniture/media', { headers })
      if (res.ok) {
        const data = await res.json()
        setMediaGallery(data.media || [])
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
    }
  }, [token])

  const handleAIChat = async () => {
    if (!aiInput.trim()) return
    
    const userMessage = { role: 'user', content: aiInput }
    setAiChatMessages(prev => [...prev, userMessage])
    setAiInput('')
    setAiLoading(true)
    
    try {
      const res = await fetch('/api/module/furniture/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'chat',
          messages: [...aiChatMessages, userMessage]
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setAiChatMessages(prev => [...prev, { role: 'assistant', content: data.result }])
      } else {
        toast.error('AI request failed')
      }
    } catch (error) {
      toast.error('Failed to get AI response')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIAnalyzeRequirement = async (requirementId) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/module/furniture/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'analyze_requirement', requirementId })
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success('AI analysis complete')
        fetchRequirements()
        return data.result
      }
    } catch (error) {
      toast.error('AI analysis failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIGenerateQuoteNarrative = async (quoteId) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/module/furniture/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'generate_quote_narrative', quoteId })
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success('Quote narrative generated')
        return data.result
      }
    } catch (error) {
      toast.error('Failed to generate narrative')
    } finally {
      setAiLoading(false)
    }
  }

  // Seed sample data
  const [seedStatus, setSeedStatus] = useState(null)
  const [seeding, setSeeding] = useState(false)

  const handleSeedData = async () => {
    try {
      setSeeding(true)
      const res = await fetch('/api/module/furniture/seed?type=all', {
        method: 'POST',
        headers
      })
      if (res.ok) {
        const data = await res.json()
        setSeedStatus(data.results)
        toast.success(`Seeded ${data.results?.products || 0} products, ${data.results?.materials || 0} materials, ${data.results?.hardware || 0} hardware items`)
        // Refresh data
        fetchProducts()
        fetchMaterials()
        fetchHardware()
        fetchWarehouses()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to seed data')
      }
    } catch (error) {
      toast.error('Failed to seed data')
    } finally {
      setSeeding(false)
    }
  }

  const fetchSeedStatus = async () => {
    try {
      const res = await fetch('/api/module/furniture/seed', { headers })
      if (res.ok) {
        const data = await res.json()
        setSeedStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to fetch seed status:', error)
    }
  }

  // CRUD handlers
  const handleCreateProduct = async (productData) => {
    try {
      const res = await fetch('/api/module/furniture/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
      })
      if (res.ok) {
        toast.success('Product created successfully')
        fetchProducts()
        setDrawerOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create product')
      }
    } catch (error) {
      toast.error('Failed to create product')
    }
  }

  const handleCreateRequirement = async (reqData) => {
    try {
      const res = await fetch('/api/module/furniture/requirements', {
        method: 'POST',
        headers,
        body: JSON.stringify(reqData)
      })
      if (res.ok) {
        toast.success('Requirement created successfully')
        fetchRequirements()
        setDrawerOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create requirement')
      }
    } catch (error) {
      toast.error('Failed to create requirement')
    }
  }

  // Render Dashboard
  const renderDashboard = () => {
    const reqStats = {
      total: requirements.length,
      new: requirements.filter(r => r.status === 'new').length,
      inProgress: requirements.filter(r => ['site_visit_scheduled', 'measurement_done', 'design_in_progress'].includes(r.status)).length,
      quotesSent: requirements.filter(r => r.status === 'quote_sent').length,
      approved: requirements.filter(r => r.status === 'approved').length,
      totalValue: requirements.reduce((sum, r) => sum + (r.estimatedBudget || 0), 0)
    }

    return (
      <div className="space-y-6">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Furniture Module</h1>
            <p className="text-slate-500 mt-1">Manage custom furniture manufacturing end-to-end</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen({ type: 'command', data: null })}>
              <Command className="h-4 w-4 mr-2" />
              <span className="text-xs text-slate-400">⌘K</span>
            </Button>
            <Button onClick={() => setDrawerOpen({ type: 'new_requirement', data: null })}>
              <Plus className="h-4 w-4 mr-2" /> New Requirement
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4">
          <StatCard
            title="Total Requirements"
            value={reqStats.total}
            subtitle="All time"
            icon={ClipboardList}
            color="blue"
            delay={0}
          />
          <StatCard
            title="New Inquiries"
            value={reqStats.new}
            subtitle="Pending action"
            icon={Sparkles}
            color="purple"
            delay={0.05}
          />
          <StatCard
            title="In Progress"
            value={reqStats.inProgress}
            subtitle="Active projects"
            icon={Activity}
            color="amber"
            delay={0.1}
          />
          <StatCard
            title="Quotes Sent"
            value={reqStats.quotesSent}
            subtitle="Awaiting response"
            icon={Send}
            color="cyan"
            delay={0.15}
          />
          <StatCard
            title="Approved"
            value={reqStats.approved}
            subtitle="Ready for production"
            icon={CheckCircle2}
            color="green"
            delay={0.2}
          />
          <StatCard
            title="Pipeline Value"
            value={`₹${(reqStats.totalValue / 100000).toFixed(1)}L`}
            subtitle="Total estimated"
            icon={DollarSign}
            color="rose"
            delay={0.25}
          />
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-3 gap-6">
          {/* Pipeline Kanban Preview */}
          <GlassCard className="col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Requirements Pipeline</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('requirements')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {['new', 'site_visit_scheduled', 'measurement_done', 'design_in_progress', 'quote_sent'].map(status => {
                const statusReqs = requirements.filter(r => r.status === status)
                const pipelineConfig = config?.pipelines?.requirement?.stages?.find(s => s.id === status)
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {pipelineConfig?.name || status.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="secondary" className="text-xs">{statusReqs.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[120px]">
                      {statusReqs.slice(0, 3).map(req => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setDrawerOpen({ type: 'view_requirement', data: req })}
                        >
                          <p className="text-xs font-medium text-slate-900 truncate">{req.title || req.requirementNumber}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{req.customer?.name || 'Customer'}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'New Requirement', icon: ClipboardList, action: () => setDrawerOpen({ type: 'new_requirement', data: null }) },
                { label: 'Schedule Measurement', icon: Ruler, action: () => setDrawerOpen({ type: 'new_measurement', data: null }) },
                { label: 'Create Design Brief', icon: Palette, action: () => setDrawerOpen({ type: 'new_design_brief', data: null }) },
                { label: 'Add Product', icon: Package, action: () => setDrawerOpen({ type: 'new_product', data: null }) },
                { label: 'Add Material', icon: Layers, action: () => setDrawerOpen({ type: 'new_material', data: null }) },
                { label: 'View Reports', icon: BarChart3, action: () => setActiveTab('reports') }
              ].map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <item.icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Categories Overview */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Product Categories</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('products')}>
              Manage Catalog <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-9 gap-3">
            {config?.categories?.map((cat, i) => {
              const Icon = categoryIcons[cat.id] || Package
              const count = products.filter(p => p.category === cat.id).length
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="text-center p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => {
                    setActiveTab('products')
                    // Could set filter here
                  }}
                >
                  <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-700">{cat.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{count} products</p>
                </motion.div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    )
  }

  // Render Requirements Tab
  const renderRequirements = () => {
    const filteredRequirements = requirements.filter(r =>
      !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requirementNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Requirements</h2>
            <p className="text-sm text-slate-500">Manage furniture requirements and inquiries</p>
          </div>
          <Button onClick={() => setDrawerOpen({ type: 'new_requirement', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> New Requirement
          </Button>
        </div>

        {/* Filters */}
        <GlassPanel className="p-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/70"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40 bg-white/70">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {config?.pipelines?.requirement?.stages?.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={fetchRequirements}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </GlassPanel>

        {/* Requirements List */}
        <div className="space-y-3">
          {filteredRequirements.length > 0 ? (
            filteredRequirements.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard className="p-4 cursor-pointer" onClick={() => setDrawerOpen({ type: 'view_requirement', data: req })}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                        <ClipboardList className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{req.title || req.requirementNumber}</h3>
                          <Badge className={statusColors[req.status] || statusColors.new}>
                            {config?.pipelines?.requirement?.stages?.find(s => s.id === req.status)?.name || req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{req.requirementNumber}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {req.customer?.name || 'No customer'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> ₹{(req.estimatedBudget || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Ruler className="h-4 w-4 mr-2" /> Schedule Measurement
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Palette className="h-4 w-4 mr-2" /> Create Design Brief
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          ) : (
            <GlassCard className="p-8 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">No requirements yet</h3>
              <p className="text-sm text-slate-500 mb-4">Get started by creating your first furniture requirement</p>
              <Button onClick={() => setDrawerOpen({ type: 'new_requirement', data: null })}>
                <Plus className="h-4 w-4 mr-2" /> Create Requirement
              </Button>
            </GlassCard>
          )}
        </div>
      </div>
    )
  }

  // Render Products Tab
  const renderProducts = () => {
    const filteredProducts = products.filter(p =>
      !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Product Catalog</h2>
            <p className="text-sm text-slate-500">Manage your furniture products and configurations</p>
          </div>
          <Button onClick={() => setDrawerOpen({ type: 'new_product', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Filters */}
        <GlassPanel className="p-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/70"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40 bg-white/70">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {config?.categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </GlassPanel>

        {/* Products Grid */}
        <div className="grid grid-cols-4 gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, i) => {
              const Icon = categoryIcons[product.category] || Package
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GlassCard className="overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                      <Icon className="h-12 w-12 text-slate-300" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{product.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{product.sku}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {config?.categories?.find(c => c.id === product.category)?.name || product.category}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className="font-semibold text-slate-900">₹{(product.basePrice || 0).toLocaleString()}</span>
                        <Button variant="ghost" size="sm" onClick={() => setDrawerOpen({ type: 'view_product', data: product })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          ) : (
            <div className="col-span-4">
              <GlassCard className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No products yet</h3>
                <p className="text-sm text-slate-500 mb-4">Start building your catalog by adding products</p>
                <Button onClick={() => setDrawerOpen({ type: 'new_product', data: null })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Button>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Materials Tab
  const renderMaterials = () => {
    const filteredMaterials = materials.filter(m =>
      !searchTerm ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const categoryCounts = materials.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1
      return acc
    }, {})

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Materials</h2>
            <p className="text-sm text-slate-500">Manage boards, laminates, veneers, and more</p>
          </div>
          <Button onClick={() => setDrawerOpen({ type: 'new_material', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Material
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">All ({materials.length})</Badge>
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-slate-100">
              {cat.replace(/_/g, ' ')} ({count})
            </Badge>
          ))}
        </div>

        {/* Filters */}
        <GlassPanel className="p-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/70"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchMaterials}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </GlassPanel>

        {/* Materials Table */}
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Price</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map(material => (
                  <tr key={material.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{material.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">{material.code}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 capitalize">{material.category?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{material.brand || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-900">₹{(material.unitPrice || 0).toLocaleString()}</span>
                      <span className="text-xs text-slate-400 ml-1">/{material.unitOfMeasure}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={material.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                        {material.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDrawerOpen({ type: 'view_material', data: material })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMaterials.length === 0 && (
              <div className="p-8 text-center">
                <Layers className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No materials found</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    )
  }

  // Render Config Studio
  const renderConfigStudio = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Config Studio</h2>
          <p className="text-sm text-slate-500">Manage module configuration, schemas, and workflows</p>
        </div>
        <Badge variant="outline" className="text-xs">v{config?.version || '1.0.0'}</Badge>
      </div>

      <Tabs defaultValue="schemas" className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="schemas">Entity Schemas</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Rules</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="schemas" className="mt-4 space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Entity Schemas</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(config?.entitySchemas || {}).map(([key, schema]) => (
                <div key={key} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900 capitalize">{key}</h4>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{schema.fields?.length || 0} fields defined</p>
                  <div className="flex flex-wrap gap-1">
                    {schema.fields?.slice(0, 5).map(field => (
                      <Badge key={field.name} variant="secondary" className="text-xs">
                        {field.name}
                      </Badge>
                    ))}
                    {(schema.fields?.length || 0) > 5 && (
                      <Badge variant="outline" className="text-xs">+{schema.fields.length - 5} more</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="pipelines" className="mt-4 space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pipeline Configuration</h3>
            {Object.entries(config?.pipelines || {}).map(([key, pipeline]) => (
              <div key={key} className="mb-6 last:mb-0">
                <h4 className="font-medium text-slate-700 capitalize mb-3">{key.replace(/_/g, ' ')} Pipeline</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {pipeline.stages?.map((stage, i) => (
                    <div key={stage.id} className="flex items-center">
                      <div 
                        className="px-3 py-2 rounded-lg border-2 whitespace-nowrap"
                        style={{ borderColor: stage.color, backgroundColor: `${stage.color}15` }}
                      >
                        <span className="text-sm font-medium" style={{ color: stage.color }}>{stage.name}</span>
                      </div>
                      {i < pipeline.stages.length - 1 && (
                        <ChevronRight className="h-4 w-4 mx-1 text-slate-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </GlassCard>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Document Templates</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(config?.templates || {}).map(([type, templates]) => (
                <div key={type} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-medium text-slate-900 capitalize mb-2">{type} Templates</h4>
                  <div className="space-y-1">
                    {templates?.map(t => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{t.name}</span>
                        {t.isDefault && <Badge className="text-xs bg-blue-100 text-blue-700">Default</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pricing Rules</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-700 mb-3">Labor Rates (per unit)</h4>
                <div className="space-y-2">
                  {Object.entries(config?.pricingRules?.laborRates || {}).map(([operation, rate]) => (
                    <div key={operation} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600 capitalize">{operation.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-slate-900">₹{rate}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-3">Margin Targets</h4>
                <div className="space-y-2">
                  {Object.entries(config?.pricingRules?.margins || {}).map(([level, percent]) => (
                    <div key={level} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600 capitalize">{level}</span>
                      <span className="font-medium text-slate-900">{percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Automation Rules</h3>
            <div className="space-y-3">
              {config?.automationRules?.map(rule => (
                <div key={rule.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{rule.id.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="text-purple-600">Trigger:</span> {rule.trigger} → 
                      <span className="text-blue-600 ml-2">Action:</span> {rule.action}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Role Permissions Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Module</th>
                    {config?.permissions?.roles?.map(role => (
                      <th key={role} className="px-3 py-2 text-center font-semibold text-slate-600 capitalize">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(config?.permissions?.matrix || {}).map(([module, perms]) => (
                    <tr key={module}>
                      <td className="px-3 py-2 font-medium text-slate-700 capitalize">{module}</td>
                      {config?.permissions?.roles?.map(role => (
                        <td key={role} className="px-3 py-2 text-center">
                          {perms[role]?.length > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              {perms[role].map(p => (
                                <Badge key={p} variant="outline" className="text-xs">
                                  {p.charAt(0).toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Sample Data Management</h3>
            <p className="text-sm text-slate-500 mb-6">
              Seed the module with sample products, materials, hardware, and warehouses to get started quickly.
            </p>
            
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <Package className="h-8 w-8 text-blue-600 mb-2" />
                <p className="font-semibold text-slate-900">{products.length}</p>
                <p className="text-sm text-slate-500">Products</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                <Layers className="h-8 w-8 text-emerald-600 mb-2" />
                <p className="font-semibold text-slate-900">{materials.length}</p>
                <p className="text-sm text-slate-500">Materials</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <Cog className="h-8 w-8 text-amber-600 mb-2" />
                <p className="font-semibold text-slate-900">{hardware.length}</p>
                <p className="text-sm text-slate-500">Hardware</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
                <Warehouse className="h-8 w-8 text-purple-600 mb-2" />
                <p className="font-semibold text-slate-900">{warehouses.length}</p>
                <p className="text-sm text-slate-500">Warehouses</p>
              </div>
            </div>

            {products.length === 0 && materials.length === 0 && hardware.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-900 mb-2">No data yet</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Seed sample data to populate products, materials, and hardware
                </p>
                <Button 
                  onClick={handleSeedData} 
                  disabled={seeding}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  {seeding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Seeding Data...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Seed Sample Data
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-900">Data Ready</p>
                    <p className="text-sm text-emerald-600">Your module is populated with master data</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSeedData} 
                  disabled={seeding}
                >
                  {seeding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Sample Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Sample Data Includes</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" /> Products (12)
                </h4>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>• King Size Storage Bed</li>
                  <li>• 3-Door Sliding Wardrobe</li>
                  <li>• L-Shaped Sectional Sofa</li>
                  <li>• 6-Seater Dining Set</li>
                  <li>• Executive Study Desk</li>
                  <li>• And more...</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" /> Materials (20+)
                </h4>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>• HDHMR & Plywood Boards</li>
                  <li>• Premium Laminates</li>
                  <li>• Edge Bands</li>
                  <li>• Adhesives & Paints</li>
                  <li>• Fabrics & Foam</li>
                  <li>• And more...</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Cog className="h-4 w-4 text-amber-500" /> Hardware (20+)
                </h4>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>• Soft Close Hinges (Hettich, Blum)</li>
                  <li>• Drawer Channels</li>
                  <li>• Handles & Knobs</li>
                  <li>• Locks & Connectors</li>
                  <li>• Wardrobe Accessories</li>
                  <li>• And more...</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  )

  // Render Quotations Tab
  const renderQuotations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quotations</h2>
          <p className="text-slate-500 mt-1">Manage customer quotes with versioning and approval workflow</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600" onClick={() => setDrawerOpen({ type: 'new_quotation', data: null })}>
          <Plus className="h-4 w-4 mr-2" /> Create Quote
        </Button>
      </div>

      {/* Quote Stats */}
      <div className="grid grid-cols-5 gap-4">
        {['draft', 'sent', 'accepted', 'rejected', 'converted'].map(status => {
          const count = quotations.filter(q => q.status === status).length
          const colors = {
            draft: 'from-slate-50 to-gray-50 border-slate-200',
            sent: 'from-blue-50 to-indigo-50 border-blue-200',
            accepted: 'from-emerald-50 to-teal-50 border-emerald-200',
            rejected: 'from-red-50 to-rose-50 border-red-200',
            converted: 'from-purple-50 to-violet-50 border-purple-200'
          }
          return (
            <GlassCard key={status} className={`p-4 bg-gradient-to-br ${colors[status]} border`}>
              <p className="text-sm font-medium text-slate-600 capitalize">{status}</p>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
            </GlassCard>
          )
        })}
      </div>

      {/* Quotations List */}
      <GlassCard className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Quote #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Items</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Valid Until</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map(quote => (
                <tr key={quote.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-indigo-600">{quote.quoteNumber}</span>
                    <span className="text-xs text-slate-400 ml-2">v{quote.version}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{quote.customer?.name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{quote.lineItems?.length || 0} items</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    ₹{(quote.grandTotal || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={statusColors[quote.status] || statusColors.draft}>
                      {quote.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDrawerOpen({ type: 'view_quotation', data: quote })}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem><Send className="h-4 w-4 mr-2" /> Send to Customer</DropdownMenuItem>
                        <DropdownMenuItem><Printer className="h-4 w-4 mr-2" /> Print PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {quotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No quotations yet. Create your first quote!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Orders Tab
  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-500 mt-1">Track manufacturing and trading orders end-to-end</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Order Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="trading">Trading</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> New Order
          </Button>
        </div>
      </div>

      {/* Order Pipeline */}
      <div className="grid grid-cols-6 gap-3">
        {['created', 'confirmed', 'in_production', 'ready', 'dispatched', 'delivered'].map(status => {
          const count = orders.filter(o => o.status === status).length
          const value = orders.filter(o => o.status === status).reduce((sum, o) => sum + (o.grandTotal || 0), 0)
          return (
            <GlassCard key={status} className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">{status.replace(/_/g, ' ')}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{count}</p>
              <p className="text-xs text-indigo-600">₹{(value / 100000).toFixed(1)}L</p>
            </GlassCard>
          )
        })}
      </div>

      {/* Orders Table */}
      <GlassCard className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Order #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Paid</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Delivery</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-indigo-600">{order.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.customer?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">{order.orderType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    ₹{(order.grandTotal || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={order.totalPaid >= order.grandTotal ? 'text-emerald-600' : 'text-amber-600'}>
                      ₹{(order.totalPaid || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={statusColors[order.status] || statusColors.new}>
                      {order.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No orders yet. Convert quotations to orders or create direct orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Suppliers Tab
  const renderSuppliers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Suppliers</h2>
          <p className="text-slate-500 mt-1">Manage your material and hardware suppliers</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {suppliers.map(supplier => (
          <GlassCard key={supplier.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{supplier.name}</h3>
                <p className="text-sm text-slate-500">{supplier.code}</p>
              </div>
              <Badge className={supplier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> {supplier.type}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {supplier.phone || 'N/A'}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {supplier.email || 'N/A'}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Orders</span>
                <span className="font-semibold">{supplier.stats?.totalOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Total Value</span>
                <span className="font-semibold">₹{((supplier.stats?.totalValue || 0) / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </GlassCard>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No suppliers added yet</p>
          </div>
        )}
      </div>
    </div>
  )

  // Render Purchase Orders Tab
  const renderPurchaseOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-slate-500 mt-1">Create and track material procurement</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> Create PO
        </Button>
      </div>

      <GlassCard className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">PO #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Items</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Expected</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-indigo-600">{po.poNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{po.supplierName || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{po.items?.length || 0} items</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    ₹{(po.totalAmount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={statusColors[po.status] || statusColors.draft}>
                      {po.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Inventory Tab
  const renderInventory = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-slate-500 mt-1">Track stock levels across warehouses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Import Stock</Button>
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Stock Entry
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <Boxes className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-900">{inventory.summary?.totalItems || 0}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">Stock Value</p>
              <p className="text-2xl font-bold text-emerald-900">₹{((inventory.summary?.totalValue || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-600">Low Stock</p>
              <p className="text-2xl font-bold text-amber-900">{inventory.lowStockCount || 0}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
          <div className="flex items-center gap-3">
            <Warehouse className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-600">Warehouses</p>
              <p className="text-2xl font-bold text-purple-900">{warehouses.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Stock Table */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Stock Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Material</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Avg Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Value</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(inventory.inventory || []).slice(0, 20).map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.materialName}</p>
                    <p className="text-xs text-slate-500">{item.materialCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">{item.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{item.quantity} {item.unitOfMeasure}</td>
                  <td className="px-4 py-3 text-right">₹{(item.avgCost || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{((item.quantity || 0) * (item.avgCost || 0)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={item.isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                      {item.isLowStock ? 'Low' : 'OK'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(inventory.inventory || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No inventory data. Record stock from purchase orders or manual entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Installations & Delivery Tab
  const renderInstallations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Delivery & Installation</h2>
          <p className="text-slate-500 mt-1">Schedule and track deliveries and on-site installations</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> Schedule
        </Button>
      </div>

      {/* Calendar View would go here */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Upcoming Installations</h3>
        <div className="space-y-3">
          {installations.map(inst => (
            <div key={inst.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Hammer className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{inst.installationNumber}</p>
                  <p className="text-sm text-slate-500">{inst.customer?.name} - {inst.address?.city}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900">{inst.scheduledDate ? new Date(inst.scheduledDate).toLocaleDateString() : 'TBD'}</p>
                <Badge className={statusColors[inst.status] || statusColors.scheduled}>{inst.status}</Badge>
              </div>
            </div>
          ))}
          {installations.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p>No scheduled deliveries or installations</p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )

  // Render Service Tickets Tab
  const renderServiceTickets = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Service & Warranty</h2>
          <p className="text-slate-500 mt-1">Handle customer service requests and warranty claims</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'escalated'].map(status => {
          const count = serviceTickets.filter(t => t.status === status).length
          return (
            <GlassCard key={status} className="p-4">
              <p className="text-sm font-medium text-slate-500 capitalize">{status.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
            </GlassCard>
          )
        })}
      </div>

      <GlassCard className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ticket #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Subject</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Priority</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-indigo-600">{ticket.ticketNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{ticket.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{ticket.customer?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">{ticket.ticketType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={statusColors[ticket.status] || statusColors.new}>
                      {ticket.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
              {serviceTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No service tickets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Showroom Tab (for Dealers)
  const renderShowroom = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Showroom Management</h2>
          <p className="text-slate-500 mt-1">Manage display items and sample inventory for your showroom</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> Add Display
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {showroomDisplays.slice(0, 8).map(display => (
          <GlassCard key={display.id} className="p-4">
            <div className="aspect-video bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <h4 className="font-medium text-slate-900">{display.productName}</h4>
            <p className="text-sm text-slate-500">{display.displayCode}</p>
            <div className="flex items-center justify-between mt-2">
              <Badge className={display.isForSale ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                {display.isForSale ? 'For Sale' : 'Display Only'}
              </Badge>
              <span className="font-semibold text-slate-900">₹{(display.displayValue || 0).toLocaleString()}</span>
            </div>
          </GlassCard>
        ))}
        {showroomDisplays.length === 0 && (
          <div className="col-span-4 text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No showroom displays. Add your first display item!</p>
          </div>
        )}
      </div>
    </div>
  )

  // Render Reports Tab
  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500 mt-1">Business insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="overview" onValueChange={(v) => fetchAnalytics(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="sales">Sales Report</SelectItem>
              <SelectItem value="funnel">Conversion Funnel</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-4 gap-4">
          <GlassCard className="p-5 col-span-2">
            <h3 className="font-semibold text-slate-900 mb-4">Revenue Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Orders</span>
                <span className="font-bold text-2xl">₹{((analytics.orders?.totalRevenue || 0) / 100000).toFixed(1)}L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Collected</span>
                <span className="font-bold text-emerald-600">₹{((analytics.orders?.totalCollected || 0) / 100000).toFixed(1)}L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Outstanding</span>
                <span className="font-bold text-amber-600">₹{((analytics.orders?.outstandingAmount || 0) / 100000).toFixed(1)}L</span>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-5 col-span-2">
            <h3 className="font-semibold text-slate-900 mb-4">Pipeline Value</h3>
            <p className="text-3xl font-bold text-indigo-600">₹{((analytics.requirements?.totalPipeline || 0) / 100000).toFixed(1)}L</p>
            <p className="text-sm text-slate-500 mt-1">Active requirements in pipeline</p>
          </GlassCard>
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-2">Products</h3>
            <p className="text-2xl font-bold">{analytics.products?.totalProducts || 0}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-2">Inventory Value</h3>
            <p className="text-2xl font-bold">₹{((analytics.inventory?.totalValue || 0) / 100000).toFixed(1)}L</p>
          </GlassCard>
        </div>
      )}
    </div>
  )

  // Render Bill of Materials Tab
  const renderBOM = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Bill of Materials</h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Create and manage product BOMs with costing breakdown</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Create BOM
        </Button>
      </div>

      {/* BOM Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {['draft', 'approved', 'in_production', 'completed'].map(status => {
          const count = boms.filter(b => b.status === status).length
          const colors = {
            draft: 'from-slate-50 to-gray-50 border-slate-200',
            approved: 'from-emerald-50 to-teal-50 border-emerald-200',
            in_production: 'from-blue-50 to-indigo-50 border-blue-200',
            completed: 'from-purple-50 to-violet-50 border-purple-200'
          }
          return (
            <GlassCard key={status} className={`p-3 sm:p-4 bg-gradient-to-br ${colors[status]} border`}>
              <p className="text-xs sm:text-sm font-medium text-slate-600 capitalize">{status.replace(/_/g, ' ')}</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{count}</p>
            </GlassCard>
          )
        })}
      </div>

      {/* BOM List */}
      <GlassCard className="p-4 sm:p-5">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-600">BOM #</th>
                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-600">Material Cost</th>
                <th className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-600">Total Cost</th>
                <th className="px-3 sm:px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-3 sm:px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boms.map(bom => (
                <tr key={bom.id} className="hover:bg-slate-50/50">
                  <td className="px-3 sm:px-4 py-3">
                    <span className="font-medium text-indigo-600">{bom.bomNumber}</span>
                    <span className="text-xs text-slate-400 ml-2">v{bom.version}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-slate-700">{bom.productName || '-'}</td>
                  <td className="px-3 sm:px-4 py-3 text-right">₹{(bom.totalMaterialCost || 0).toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-3 text-right font-semibold">₹{(bom.totalCost || 0).toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <Badge className={statusColors[bom.status] || statusColors.draft}>
                      {bom.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        {bom.status === 'draft' && <DropdownMenuItem><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</DropdownMenuItem>}
                        {bom.status === 'approved' && <DropdownMenuItem><Hammer className="h-4 w-4 mr-2" /> Release to Production</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {boms.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No BOMs created yet. Create from an order or product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Work Orders Tab (Kanban View)
  const renderWorkOrders = () => {
    const kanbanColumns = [
      { id: 'pending', label: 'Pending', color: 'bg-slate-100' },
      { id: 'scheduled', label: 'Scheduled', color: 'bg-blue-100' },
      { id: 'in_progress', label: 'In Progress', color: 'bg-amber-100' },
      { id: 'quality_check', label: 'QC', color: 'bg-purple-100' },
      { id: 'completed', label: 'Completed', color: 'bg-emerald-100' }
    ]

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Work Orders</h2>
            <p className="text-slate-500 mt-1 text-sm">Track production work orders through stages</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="kanban">
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
              <Plus className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">New WO</span>
            </Button>
          </div>
        </div>

        {/* Kanban Board - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-6 px-6 pb-4">
          <div className="flex gap-4 min-w-max">
            {kanbanColumns.map(col => {
              const colOrders = workOrders.filter(wo => wo.status === col.id)
              return (
                <div key={col.id} className={`w-72 sm:w-80 ${col.color} rounded-xl p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700">{col.label}</h3>
                    <Badge variant="outline">{colOrders.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {colOrders.map(wo => (
                      <GlassCard key={wo.id} className="p-3 cursor-pointer hover:shadow-lg">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-sm text-indigo-600">{wo.woNumber}</span>
                          <Badge variant="outline" className="text-xs capitalize">{wo.priority}</Badge>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 line-clamp-1">{wo.operationName}</p>
                        <p className="text-xs text-slate-500 mt-1">{wo.productName}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                          <span className="text-xs text-slate-500">{wo.estimatedHours}h</span>
                          <Progress value={wo.progressPercent || 0} className="w-16 h-1" />
                        </div>
                      </GlassCard>
                    ))}
                    {colOrders.length === 0 && (
                      <p className="text-center py-4 text-sm text-slate-400">No work orders</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Render Production Planning Tab
  const renderProduction = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Production Planning</h2>
          <p className="text-slate-500 mt-1 text-sm">Capacity planning and production scheduling</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="h-4 w-4 mr-2" /> Schedule</Button>
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
            <Zap className="h-4 w-4 mr-2" /> Auto-Schedule
          </Button>
        </div>
      </div>

      {/* Production Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GlassCard className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <Hammer className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-900">{productionData?.summary?.workOrdersInProgress || 0}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-600">Pending</p>
              <p className="text-2xl font-bold text-amber-900">{productionData?.summary?.workOrdersPending || 0}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-600">Hours Scheduled</p>
              <p className="text-2xl font-bold text-emerald-900">{productionData?.summary?.hoursScheduled || 0}h</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-600">BOMs Pending</p>
              <p className="text-2xl font-bold text-purple-900">{productionData?.summary?.bomsPendingRelease || 0}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Work Center Capacity */}
      <GlassCard className="p-4 sm:p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Work Center Utilization</h3>
        <div className="space-y-3">
          {Object.entries(productionData?.capacityByWorkCenter || {}).map(([center, data]) => (
            <div key={center} className="flex items-center gap-4">
              <span className="w-24 sm:w-32 text-sm font-medium text-slate-600 capitalize">{center.replace(/_/g, ' ')}</span>
              <div className="flex-1">
                <Progress value={Math.min(100, (data.scheduledHours / 16) * 100)} className="h-3" />
              </div>
              <span className="text-sm text-slate-500 w-20 text-right">{data.scheduledHours}h / {data.orderCount} WO</span>
            </div>
          ))}
          {Object.keys(productionData?.capacityByWorkCenter || {}).length === 0 && (
            <p className="text-center py-4 text-slate-500">No scheduled work this week</p>
          )}
        </div>
      </GlassCard>
    </div>
  )

  // Render Invoices Tab
  const renderInvoices = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Invoices</h2>
          <p className="text-slate-500 mt-1 text-sm">Manage billing and track payments</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      </div>

      {/* Invoice Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {['draft', 'sent', 'partial', 'paid'].map(status => {
          const count = invoices.filter(i => i.status === status).length
          const value = invoices.filter(i => i.status === status).reduce((sum, i) => sum + (i.grandTotal || 0), 0)
          const colors = {
            draft: 'from-slate-50 to-gray-50 border-slate-200 text-slate-600',
            sent: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-600',
            partial: 'from-amber-50 to-orange-50 border-amber-200 text-amber-600',
            paid: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-600'
          }
          return (
            <GlassCard key={status} className={`p-3 sm:p-4 bg-gradient-to-br ${colors[status]} border`}>
              <p className="text-xs sm:text-sm font-medium capitalize">{status}</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs mt-1">₹{(value / 100000).toFixed(1)}L</p>
            </GlassCard>
          )
        })}
      </div>

      {/* Invoices Table */}
      <GlassCard className="p-4 sm:p-5">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-600">Invoice #</th>
                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-600">Paid</th>
                <th className="px-3 sm:px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-3 sm:px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="px-3 sm:px-4 py-3">
                    <span className="font-medium text-indigo-600">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-slate-700">{inv.customer?.name || '-'}</td>
                  <td className="px-3 sm:px-4 py-3 text-slate-600">{inv.invoiceDate}</td>
                  <td className="px-3 sm:px-4 py-3 text-right font-semibold">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-3 text-right text-emerald-600">₹{(inv.paidAmount || 0).toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <Badge className={statusColors[inv.status] || statusColors.draft}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem><Printer className="h-4 w-4 mr-2" /> Print</DropdownMenuItem>
                        <DropdownMenuItem><Send className="h-4 w-4 mr-2" /> Send</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem><DollarSign className="h-4 w-4 mr-2" /> Record Payment</DropdownMenuItem>
                        <DropdownMenuItem><RefreshCw className="h-4 w-4 mr-2" /> Sync to CRM</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No invoices yet. Create from an order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  // Render Settings Tab
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Module Settings</h2>
        <p className="text-slate-500 mt-1 text-sm">Configure business rules, integrations, and preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-sm flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Business Rules</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input placeholder="Your Company Name" defaultValue={moduleSettings?.general?.companyName} />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select defaultValue={moduleSettings?.general?.businessType || 'manufacturer'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="dealer">Dealer / Retailer</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GST Number</Label>
                <Input placeholder="Enter GST Number" defaultValue={moduleSettings?.general?.gstNumber} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" placeholder="contact@company.com" defaultValue={moduleSettings?.general?.contactEmail} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input placeholder="Bank Name" defaultValue={moduleSettings?.bankDetails?.bankName} />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input placeholder="Account Number" defaultValue={moduleSettings?.bankDetails?.accountNumber} />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input placeholder="IFSC Code" defaultValue={moduleSettings?.bankDetails?.ifscCode} />
              </div>
              <div>
                <Label>UPI ID</Label>
                <Input placeholder="upi@bank" defaultValue={moduleSettings?.bankDetails?.upiId} />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="business" className="mt-4 space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pricing Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Default Markup %</Label>
                <Input type="number" defaultValue={moduleSettings?.business?.defaultMarkup || 25} />
              </div>
              <div>
                <Label>Default Tax Rate (GST) %</Label>
                <Input type="number" defaultValue={moduleSettings?.business?.defaultTaxRate || 18} />
              </div>
              <div>
                <Label>Max Discount Without Approval %</Label>
                <Input type="number" defaultValue={moduleSettings?.business?.maxDiscountWithoutApproval || 10} />
              </div>
              <div>
                <Label>Advance Payment %</Label>
                <Input type="number" defaultValue={moduleSettings?.business?.advancePaymentPercent || 50} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Lead Times & Production</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Default Lead Time (Days)</Label>
                <Input type="number" defaultValue={moduleSettings?.business?.defaultLeadTimeDays || 21} />
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <Input type="number" defaultValue={moduleSettings?.business?.lowStockThreshold || 10} />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Email Notifications</span>
                <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">SMS Notifications</span>
                <Badge className="bg-slate-100 text-slate-600">Disabled</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">WhatsApp Notifications</span>
                <Badge className="bg-slate-100 text-slate-600">Disabled</Badge>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">External Integrations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Accounting Software</h4>
                  <Badge variant="outline">Not Connected</Badge>
                </div>
                <p className="text-sm text-slate-500">Connect to Tally, Zoho Books, or QuickBooks</p>
                <Button variant="outline" size="sm" className="mt-3">Configure</Button>
              </div>
              <div className="p-4 border rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Payment Gateway</h4>
                  <Badge variant="outline">Not Connected</Badge>
                </div>
                <p className="text-sm text-slate-500">Accept online payments via Razorpay</p>
                <Button variant="outline" size="sm" className="mt-3">Configure</Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Document Templates</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Quotation Template</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Invoice Template</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Delivery Note Template</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Work Order Template</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset</Button>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">Save Settings</Button>
      </div>
    </div>
  )

  // Render MEE AI Studio - Full AI Intelligence Layer
  const renderMeeAiStudio = () => {
    const quickActions = [
      { id: 'analyze', label: 'Analyze Requirement', icon: Sparkles, color: 'from-purple-500 to-indigo-600' },
      { id: 'materials', label: 'Material Suggestions', icon: Layers, color: 'from-emerald-500 to-teal-600' },
      { id: 'pricing', label: 'Smart Pricing', icon: DollarSign, color: 'from-amber-500 to-orange-600' },
      { id: 'timeline', label: 'Lead Time Prediction', icon: Clock, color: 'from-blue-500 to-cyan-600' },
      { id: 'style', label: 'Style Matching', icon: Palette, color: 'from-pink-500 to-rose-600' },
      { id: 'quote', label: 'Generate Quote Narrative', icon: FileText, color: 'from-violet-500 to-purple-600' }
    ]

    const handleQuickAction = async (actionId) => {
      setAiLoading(true)
      try {
        let response
        switch (actionId) {
          case 'analyze':
            if (!selectedRequirement) {
              toast.error('Please select a requirement first')
              setAiLoading(false)
              return
            }
            response = await fetch('/api/module/furniture/ai', {
              method: 'POST',
              headers,
              body: JSON.stringify({ action: 'analyze_requirement', requirementId: selectedRequirement })
            })
            if (response.ok) {
              const data = await response.json()
              setAiSuggestions(data.result)
              toast.success('Analysis complete!')
            }
            break
          case 'materials':
            response = await fetch('/api/module/furniture/ai', {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                action: 'suggest_materials', 
                productType: 'wardrobe',
                budget: 'luxury',
                style: 'modern minimalist'
              })
            })
            if (response.ok) {
              const data = await response.json()
              setMaterialSuggestions(data.result)
              toast.success('Material suggestions ready!')
            }
            break
          case 'pricing':
            response = await fetch('/api/module/furniture/ai', {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                action: 'suggest_pricing', 
                productId: 'custom-wardrobe',
                materials: ['Teak Wood', 'Soft-close hinges'],
                dimensions: { width: 8, height: 9, depth: 2 }
              })
            })
            if (response.ok) {
              const data = await response.json()
              setPricingSuggestions(data.result)
              toast.success('Pricing insights ready!')
            }
            break
          case 'timeline':
            response = await fetch('/api/module/furniture/ai', {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                action: 'predict_lead_time', 
                items: [{ name: 'Custom Wardrobe', quantity: 2 }, { name: 'TV Unit', quantity: 1 }],
                currentLoad: 'moderate'
              })
            })
            if (response.ok) {
              const data = await response.json()
              setLeadTimePrediction(data.result)
              toast.success('Timeline predicted!')
            }
            break
          default:
            toast.info('Feature coming soon!')
        }
      } catch (error) {
        toast.error('AI request failed')
      } finally {
        setAiLoading(false)
      }
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">MEE AI Studio</h2>
                <p className="text-slate-500">Your intelligent furniture design & business assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-violet-100 to-purple-100 text-purple-700 border-purple-200">
              <Sparkles className="h-3 w-3 mr-1" /> Powered by GPT-4
            </Badge>
          </div>
        </div>

        {/* AI Mode Tabs */}
        <div className="flex gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-xl w-fit">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'analyze', label: 'Analyze', icon: Sparkles },
            { id: 'design', label: 'Design', icon: Palette },
            { id: 'optimize', label: 'Optimize', icon: Target }
          ].map(mode => (
            <Button
              key={mode.id}
              variant={aiMode === mode.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAiMode(mode.id)}
              className={aiMode === mode.id ? 'bg-gradient-to-r from-violet-500 to-purple-600' : ''}
            >
              <mode.icon className="h-4 w-4 mr-2" />
              {mode.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat/AI Interface */}
          <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
            <div className="h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">MEE AI Assistant</p>
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setAiChatMessages([])}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Clear
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {aiChatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mx-auto mb-4 flex items-center justify-center">
                        <Wand2 className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">How can I help you today?</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                        Ask me about product recommendations, material suggestions, pricing strategies, or design ideas!
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['Suggest materials for a luxury wardrobe', 'How to price a custom dining table?', 'Design tips for small bedrooms'].map(suggestion => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setAiInput(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiChatMessages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 shadow-sm rounded-tl-none'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-none p-4">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <RefreshCw className="h-4 w-4 text-purple-600" />
                          </motion.div>
                          <span className="text-sm text-slate-500">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-200/50 bg-white/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask MEE AI anything about furniture design, materials, pricing..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAIChat} 
                    disabled={aiLoading || !aiInput.trim()}
                    className="bg-gradient-to-r from-violet-500 to-purple-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions & Insights Panel */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <GlassCard className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(action => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1 hover:bg-slate-50"
                    onClick={() => handleQuickAction(action.id)}
                    disabled={aiLoading}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </GlassCard>

            {/* Select Requirement for Analysis */}
            <GlassCard className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Analyze Requirement</h3>
              <Select value={selectedRequirement || ''} onValueChange={setSelectedRequirement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a requirement..." />
                </SelectTrigger>
                <SelectContent>
                  {requirements.map(req => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.title || req.requirementNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </GlassCard>

            {/* AI Insights Display */}
            {aiSuggestions && (
              <GlassCard className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> AI Analysis
                </h3>
                <div className="space-y-3 text-sm">
                  {aiSuggestions.estimatedCost && (
                    <div>
                      <p className="text-purple-600 font-medium">Estimated Cost</p>
                      <p className="text-slate-700">{typeof aiSuggestions.estimatedCost === 'object' 
                        ? `₹${aiSuggestions.estimatedCost.min?.toLocaleString()} - ₹${aiSuggestions.estimatedCost.max?.toLocaleString()}`
                        : aiSuggestions.estimatedCost}</p>
                    </div>
                  )}
                  {aiSuggestions.timelineRecommendation && (
                    <div>
                      <p className="text-purple-600 font-medium">Timeline</p>
                      <p className="text-slate-700">{aiSuggestions.timelineRecommendation} days</p>
                    </div>
                  )}
                  {aiSuggestions.designSuggestions && (
                    <div>
                      <p className="text-purple-600 font-medium">Design Tips</p>
                      <ul className="text-slate-700 list-disc list-inside">
                        {Array.isArray(aiSuggestions.designSuggestions) 
                          ? aiSuggestions.designSuggestions.map((tip, i) => <li key={i}>{tip}</li>)
                          : <li>{aiSuggestions.designSuggestions}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Material Suggestions */}
            {materialSuggestions && (
              <GlassCard className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Material Suggestions
                </h3>
                <div className="space-y-2 text-sm">
                  {materialSuggestions.primaryMaterial && (
                    <p className="text-slate-700"><strong>Primary:</strong> {typeof materialSuggestions.primaryMaterial === 'object' ? materialSuggestions.primaryMaterial.name : materialSuggestions.primaryMaterial}</p>
                  )}
                  {materialSuggestions.finishOptions && (
                    <p className="text-slate-700"><strong>Finishes:</strong> {Array.isArray(materialSuggestions.finishOptions) ? materialSuggestions.finishOptions.join(', ') : materialSuggestions.finishOptions}</p>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Pricing Insights */}
            {pricingSuggestions && (
              <GlassCard className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Pricing Insights
                </h3>
                <div className="space-y-2 text-sm">
                  {pricingSuggestions.suggestedPrice && (
                    <p className="text-2xl font-bold text-amber-700">₹{pricingSuggestions.suggestedPrice?.toLocaleString()}</p>
                  )}
                  {pricingSuggestions.priceRange && (
                    <p className="text-slate-700">Range: ₹{pricingSuggestions.priceRange.min?.toLocaleString()} - ₹{pricingSuggestions.priceRange.max?.toLocaleString()}</p>
                  )}
                  {pricingSuggestions.marginAnalysis && (
                    <p className="text-slate-600">{pricingSuggestions.marginAnalysis}</p>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Lead Time Prediction */}
            {leadTimePrediction && (
              <GlassCard className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Lead Time Prediction
                </h3>
                <div className="space-y-2 text-sm">
                  {leadTimePrediction.estimatedDays && (
                    <p className="text-2xl font-bold text-blue-700">{leadTimePrediction.estimatedDays} days</p>
                  )}
                  {leadTimePrediction.rushPossible !== undefined && (
                    <Badge className={leadTimePrediction.rushPossible ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {leadTimePrediction.rushPossible ? 'Rush delivery possible' : 'No rush option'}
                    </Badge>
                  )}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render Media Gallery - 3D Models, Images, Videos
  const renderMediaGallery = () => {
    const mediaCategories = [
      { id: 'all', label: 'All Media', icon: Grid3X3 },
      { id: '3d_model', label: '3D Models', icon: Box },
      { id: 'image', label: 'Images', icon: Image },
      { id: 'video', label: 'Videos', icon: Video },
      { id: 'document', label: 'Documents', icon: FileText }
    ]

    const categoryLabels = {
      design_render: 'Design Renders',
      site_photo: 'Site Photos',
      reference: 'Reference Images',
      material_swatch: 'Material Swatches',
      mood_board: 'Mood Boards',
      cad_drawing: 'CAD Drawings',
      product_photo: 'Product Photos',
      general: 'General'
    }

    const filteredMedia = mediaFilter === 'all' 
      ? mediaGallery 
      : mediaGallery.filter(m => m.mediaType === mediaFilter)

    const handleUploadMedia = async () => {
      try {
        const res = await fetch('/api/module/furniture/media', {
          method: 'POST',
          headers,
          body: JSON.stringify(uploadForm)
        })
        if (res.ok) {
          toast.success('Media uploaded successfully!')
          fetchMediaGallery()
          setUploadDialogOpen(false)
          setUploadForm({ fileName: '', fileUrl: '', mediaType: 'image', category: 'general', title: '', description: '' })
        } else {
          toast.error('Failed to upload media')
        }
      } catch (error) {
        toast.error('Upload failed')
      }
    }

    const handleDeleteMedia = async (mediaId) => {
      try {
        const res = await fetch(`/api/module/furniture/media?id=${mediaId}`, {
          method: 'DELETE',
          headers
        })
        if (res.ok) {
          toast.success('Media deleted')
          fetchMediaGallery()
        }
      } catch (error) {
        toast.error('Delete failed')
      }
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/25">
                <ImagePlus className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Media Gallery</h2>
                <p className="text-slate-500">3D Models, Images, Videos & Design Assets</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/50 rounded-lg p-1">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Media
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                <Box className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{mediaGallery.filter(m => m.mediaType === '3d_model').length}</p>
                <p className="text-xs text-slate-500">3D Models</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <Image className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{mediaGallery.filter(m => m.mediaType === 'image').length}</p>
                <p className="text-xs text-slate-500">Images</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20">
                <Video className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{mediaGallery.filter(m => m.mediaType === 'video').length}</p>
                <p className="text-xs text-slate-500">Videos</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <FileImage className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{mediaGallery.length}</p>
                <p className="text-xs text-slate-500">Total Assets</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mediaCategories.map(cat => (
            <Button
              key={cat.id}
              variant={mediaFilter === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMediaFilter(cat.id)}
              className={mediaFilter === cat.id ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : ''}
            >
              <cat.icon className="h-4 w-4 mr-2" />
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Media Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map(media => (
              <motion.div
                key={media.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard className="overflow-hidden group cursor-pointer" onClick={() => setSelectedMedia(media)}>
                  {/* Preview */}
                  <div className="aspect-square bg-slate-100 relative">
                    {media.mediaType === '3d_model' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                        <Box className="h-12 w-12 text-indigo-500" />
                      </div>
                    ) : media.mediaType === 'video' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                        <Video className="h-12 w-12 text-purple-500" />
                      </div>
                    ) : media.thumbnailUrl || media.fileUrl ? (
                      <img 
                        src={media.thumbnailUrl || media.fileUrl} 
                        alt={media.title || media.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <FileImage className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className={`text-xs ${
                        media.mediaType === '3d_model' ? 'bg-indigo-500' :
                        media.mediaType === 'video' ? 'bg-purple-500' :
                        media.mediaType === 'image' ? 'bg-emerald-500' : 'bg-slate-500'
                      } text-white`}>
                        {media.mediaType === '3d_model' ? '3D' : media.mediaType?.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedMedia(media) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDeleteMedia(media.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-medium text-sm text-slate-900 truncate">{media.title || media.fileName}</p>
                    <p className="text-xs text-slate-500 truncate">{categoryLabels[media.category] || media.category}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}

            {filteredMedia.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-4 flex items-center justify-center">
                  <ImagePlus className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">No media found</h3>
                <p className="text-sm text-slate-500 mb-4">Upload your first media file to get started</p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Media
                </Button>
              </div>
            )}
          </div>
        ) : (
          // List View
          <GlassCard className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">File</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Uploaded</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedia.map(media => (
                  <tr key={media.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          {media.mediaType === '3d_model' ? <Box className="h-5 w-5 text-indigo-500" /> :
                           media.mediaType === 'video' ? <Video className="h-5 w-5 text-purple-500" /> :
                           <Image className="h-5 w-5 text-emerald-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{media.title || media.fileName}</p>
                          <p className="text-xs text-slate-500">{media.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{media.mediaType?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{categoryLabels[media.category] || media.category}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(media.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedMedia(media)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMedia(media.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" /> Upload Media
              </DialogTitle>
              <DialogDescription>Add images, 3D models, videos or documents to your gallery</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Media Type</Label>
                  <Select value={uploadForm.mediaType} onValueChange={(v) => setUploadForm(prev => ({ ...prev, mediaType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="3d_model">3D Model</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={uploadForm.category} onValueChange={(v) => setUploadForm(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="design_render">Design Render</SelectItem>
                      <SelectItem value="site_photo">Site Photo</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="material_swatch">Material Swatch</SelectItem>
                      <SelectItem value="mood_board">Mood Board</SelectItem>
                      <SelectItem value="product_photo">Product Photo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>File Name</Label>
                <Input 
                  placeholder="e.g., living-room-wardrobe.glb"
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileName: e.target.value }))}
                />
              </div>
              <div>
                <Label>File URL</Label>
                <Input 
                  placeholder="https://..."
                  value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1">Paste URL from your cloud storage (AWS S3, Google Drive, Dropbox)</p>
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input 
                  placeholder="Display name for the file"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea 
                  placeholder="Add notes or description..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUploadMedia} className="bg-gradient-to-r from-cyan-500 to-blue-600">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Media Preview Dialog */}
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedMedia?.title || selectedMedia?.fileName}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedMedia?.mediaType === '3d_model' ? (
                <Model3DViewer media={selectedMedia} />
              ) : selectedMedia?.mediaType === 'video' ? (
                <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
                  <Video className="h-16 w-16 text-white/50" />
                </div>
              ) : (
                <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                  {selectedMedia?.fileUrl ? (
                    <img src={selectedMedia.fileUrl} alt={selectedMedia.title} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="h-16 w-16 text-slate-300" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Media Info */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Type</p>
                    <p className="font-medium capitalize">{selectedMedia?.mediaType?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Category</p>
                    <p className="font-medium">{categoryLabels[selectedMedia?.category] || selectedMedia?.category}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Uploaded</p>
                    <p className="font-medium">{selectedMedia?.createdAt ? new Date(selectedMedia.createdAt).toLocaleString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <Badge className={selectedMedia?.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {selectedMedia?.approvalStatus || 'pending'}
                    </Badge>
                  </div>
                </div>
                {selectedMedia?.description && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-slate-500 text-sm">Description</p>
                    <p className="text-slate-700 mt-1">{selectedMedia.description}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Main content renderer
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard()
      case 'requirements': return renderRequirements()
      case 'products': return renderProducts()
      case 'materials': return renderMaterials()
      case 'config': return renderConfigStudio()
      case 'quotations': return renderQuotations()
      case 'orders': return renderOrders()
      case 'suppliers': return renderSuppliers()
      case 'purchase-orders': return renderPurchaseOrders()
      case 'inventory': return renderInventory()
      case 'installations': return renderInstallations()
      case 'service-tickets': return renderServiceTickets()
      case 'showroom': return renderShowroom()
      case 'reports': return renderReports()
      case 'bom': return renderBOM()
      case 'work-orders': return renderWorkOrders()
      case 'production': return renderProduction()
      case 'invoices': return renderInvoices()
      case 'settings': return renderSettings()
      case 'mee-ai': return renderMeeAiStudio()
      case 'media-gallery': return renderMediaGallery()
      default: {
        const activeNavItem = navItems.find(n => n.id === activeTab)
        const IconComponent = activeNavItem?.icon || Package
        return (
          <GlassCard className="p-8 text-center">
            <div className="text-slate-400 mb-4">
              <IconComponent className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Coming Soon</h3>
            <p className="text-sm text-slate-500">This section is under development</p>
          </GlassCard>
        )
      }
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-8 w-8 text-indigo-600" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`
            ${sidebarCollapsed ? 'w-20' : 'w-64'} 
            h-screen sticky top-0 
            bg-white/80 backdrop-blur-xl 
            border-r border-slate-200/50
            flex flex-col
            transition-all duration-300
          `}
        >
          {/* Module Header */}
          <div className="p-4 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Sofa className="h-5 w-5 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h1 className="font-bold text-slate-900">Furniture</h1>
                    <p className="text-xs text-slate-500">Manufacturing</p>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <PanelLeftClose className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Navigation with Groups */}
          <ScrollArea className="flex-1 p-3">
            <nav className="space-y-1">
              {/* CRM Sync Card */}
              {!sidebarCollapsed && (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-700">CRM SYNC</span>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      {crmSyncStatus?.alreadySynced || 0} synced
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs h-7"
                      onClick={() => handleSyncFromCRM('projects')}
                      disabled={syncing}
                    >
                      {syncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span className="ml-1">Sync Now</span>
                    </Button>
                  </div>
                  {crmSyncStatus?.availableToSync && (
                    <p className="text-xs text-indigo-600 mt-2">
                      {crmSyncStatus.availableToSync.projects} projects, {crmSyncStatus.availableToSync.leads} leads available
                    </p>
                  )}
                </div>
              )}

              {Object.entries(navGroups).map(([groupKey, groupLabel]) => {
                const groupItems = navItems.filter(item => item.group === groupKey)
                if (groupItems.length === 0) return null
                
                return (
                  <div key={groupKey} className="mb-2">
                    {!sidebarCollapsed && groupLabel && (
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                        {groupLabel}
                      </p>
                    )}
                    {groupItems.map((item) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ x: 4 }}
                        onClick={() => setActiveTab(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${activeTab === item.id
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'text-slate-600 hover:bg-slate-100'
                          }
                        `}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <span className="text-sm font-medium">{item.label}</span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )
              })}
            </nav>
          </ScrollArea>

          {/* Back to CRM */}
          <div className="p-3 border-t border-slate-200/50">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2" 
              onClick={onBack}
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              {!sidebarCollapsed && <span>Back to CRM</span>}
            </Button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Drawer for forms */}
      <Sheet open={!!drawerOpen.type} onOpenChange={() => setDrawerOpen({ type: null, data: null })}>
        <SheetContent className="w-[500px] sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {drawerOpen.type === 'new_requirement' && 'New Requirement'}
              {drawerOpen.type === 'new_product' && 'Add Product'}
              {drawerOpen.type === 'new_material' && 'Add Material'}
              {drawerOpen.type === 'view_requirement' && 'Requirement Details'}
              {drawerOpen.type === 'view_product' && 'Product Details'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
            {/* New Requirement Form */}
            {drawerOpen.type === 'new_requirement' && (
              <RequirementForm 
                config={config}
                onSubmit={handleCreateRequirement}
                onCancel={() => setDrawerOpen({ type: null, data: null })}
              />
            )}
            {/* View Requirement */}
            {drawerOpen.type === 'view_requirement' && drawerOpen.data && (
              <RequirementDetail 
                requirement={drawerOpen.data}
                config={config}
              />
            )}
            {/* New Product Form */}
            {drawerOpen.type === 'new_product' && (
              <ProductForm 
                config={config}
                onSubmit={handleCreateProduct}
                onCancel={() => setDrawerOpen({ type: null, data: null })}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Requirement Form Component
const RequirementForm = ({ config, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    customer: { name: '', email: '', phone: '', address: '' },
    estimatedBudget: '',
    timeline: 'flexible',
    stylePreferences: [],
    furnitureItems: [],
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      estimatedBudget: parseFloat(formData.estimatedBudget) || 0
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Requirement Title</Label>
        <Input 
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Complete Bedroom Furniture"
          required
        />
      </div>
      
      <Separator />
      <h4 className="font-medium text-sm text-slate-700">Customer Information</h4>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Name</Label>
          <Input 
            value={formData.customer.name}
            onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, name: e.target.value } })}
            placeholder="Customer name"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input 
            value={formData.customer.phone}
            onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, phone: e.target.value } })}
            placeholder="Phone number"
          />
        </div>
      </div>
      
      <div>
        <Label>Email</Label>
        <Input 
          type="email"
          value={formData.customer.email}
          onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, email: e.target.value } })}
          placeholder="Email address"
        />
      </div>
      
      <div>
        <Label>Address</Label>
        <Textarea 
          value={formData.customer.address}
          onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, address: e.target.value } })}
          placeholder="Site address"
          rows={2}
        />
      </div>
      
      <Separator />
      <h4 className="font-medium text-sm text-slate-700">Requirements</h4>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Estimated Budget (₹)</Label>
          <Input 
            type="number"
            value={formData.estimatedBudget}
            onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
            placeholder="0"
          />
        </div>
        <div>
          <Label>Timeline</Label>
          <Select value={formData.timeline} onValueChange={(v) => setFormData({ ...formData, timeline: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent (ASAP)</SelectItem>
              <SelectItem value="2_weeks">2 Weeks</SelectItem>
              <SelectItem value="1_month">1 Month</SelectItem>
              <SelectItem value="2_months">2 Months</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>Additional Notes</Label>
        <Textarea 
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any special requirements or notes..."
          rows={3}
        />
      </div>
      
      <div className="flex items-center gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Requirement</Button>
      </div>
    </form>
  )
}

// Requirement Detail Component
const RequirementDetail = ({ requirement, config }) => {
  const statusStage = config?.pipelines?.requirement?.stages?.find(s => s.id === requirement.status)
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge className={statusColors[requirement.status] || statusColors.new}>
          {statusStage?.name || requirement.status}
        </Badge>
        <span className="text-sm text-slate-500">{requirement.requirementNumber}</span>
      </div>
      
      <div>
        <h3 className="font-semibold text-lg text-slate-900">{requirement.title}</h3>
        <p className="text-sm text-slate-500 mt-1">Created {new Date(requirement.createdAt).toLocaleDateString()}</p>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">Customer</h4>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            {requirement.customer?.name || 'Not specified'}
          </p>
          {requirement.customer?.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              {requirement.customer.phone}
            </p>
          )}
          {requirement.customer?.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              {requirement.customer.email}
            </p>
          )}
          {requirement.customer?.address && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              {requirement.customer.address}
            </p>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-1">Budget</h4>
          <p className="text-lg font-semibold text-slate-900">₹{(requirement.estimatedBudget || 0).toLocaleString()}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-1">Timeline</h4>
          <p className="text-lg font-semibold text-slate-900 capitalize">{requirement.timeline?.replace(/_/g, ' ')}</p>
        </div>
      </div>
      
      {requirement.notes && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Notes</h4>
            <p className="text-sm text-slate-600">{requirement.notes}</p>
          </div>
        </>
      )}
      
      <Separator />
      
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">Status History</h4>
        <div className="space-y-2">
          {requirement.statusHistory?.map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
              <div>
                <span className="font-medium capitalize">{h.status.replace(/_/g, ' ')}</span>
                <span className="text-slate-400 ml-2">{new Date(h.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Product Form Component
const ProductForm = ({ config, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    productType: 'standard',
    basePrice: '',
    description: '',
    dimensions: { length: '', width: '', height: '', unit: 'mm' },
    leadTime: '15'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      basePrice: parseFloat(formData.basePrice) || 0,
      leadTime: parseInt(formData.leadTime) || 15,
      dimensions: {
        ...formData.dimensions,
        length: parseFloat(formData.dimensions.length) || 0,
        width: parseFloat(formData.dimensions.width) || 0,
        height: parseFloat(formData.dimensions.height) || 0
      }
    })
  }

  const selectedCategory = config?.categories?.find(c => c.id === formData.category)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Product Name *</Label>
        <Input 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., King Size Storage Bed"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(v) => setFormData({ ...formData, category: v, subcategory: '' })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {config?.categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subcategory</Label>
          <Select 
            value={formData.subcategory} 
            onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
            disabled={!selectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {selectedCategory?.subcategories?.map(sub => (
                <SelectItem key={sub} value={sub}>{sub.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Product Type *</Label>
          <Select value={formData.productType} onValueChange={(v) => setFormData({ ...formData, productType: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard SKU</SelectItem>
              <SelectItem value="configurable">Configurable</SelectItem>
              <SelectItem value="made_to_order">Made to Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Base Price (₹) *</Label>
          <Input 
            type="number"
            value={formData.basePrice}
            onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
            placeholder="0"
            required
          />
        </div>
      </div>
      
      <div>
        <Label>Description</Label>
        <Textarea 
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Product description..."
          rows={3}
        />
      </div>
      
      <Separator />
      <h4 className="font-medium text-sm text-slate-700">Dimensions</h4>
      
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label>Length</Label>
          <Input 
            type="number"
            value={formData.dimensions.length}
            onChange={(e) => setFormData({ ...formData, dimensions: { ...formData.dimensions, length: e.target.value } })}
            placeholder="0"
          />
        </div>
        <div>
          <Label>Width</Label>
          <Input 
            type="number"
            value={formData.dimensions.width}
            onChange={(e) => setFormData({ ...formData, dimensions: { ...formData.dimensions, width: e.target.value } })}
            placeholder="0"
          />
        </div>
        <div>
          <Label>Height</Label>
          <Input 
            type="number"
            value={formData.dimensions.height}
            onChange={(e) => setFormData({ ...formData, dimensions: { ...formData.dimensions, height: e.target.value } })}
            placeholder="0"
          />
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={formData.dimensions.unit} onValueChange={(v) => setFormData({ ...formData, dimensions: { ...formData.dimensions, unit: v } })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mm">mm</SelectItem>
              <SelectItem value="cm">cm</SelectItem>
              <SelectItem value="inch">inch</SelectItem>
              <SelectItem value="ft">ft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>Lead Time (days)</Label>
        <Input 
          type="number"
          value={formData.leadTime}
          onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
          placeholder="15"
        />
      </div>
      
      <div className="flex items-center gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Product</Button>
      </div>
    </form>
  )
}

export default FurnitureModule
