'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Search, Plus, Filter, MoreVertical, Edit, Trash2, Calendar, Clock, User, Users,
  Package, Palette, Building2, Truck, FileText, Settings, BarChart3, Eye,
  ChevronRight, ChevronDown, X, Check, Loader2, RefreshCw, Download, Upload,
  Home, Layers, Droplets, Paintbrush, Brush, SprayCan, Shield, Warehouse,
  DollarSign, CreditCard, TrendingUp, Target, Award, AlertCircle, CheckCircle2,
  MapPin, Phone, Mail, Globe, Box, Tag, Percent, Calculator, ClipboardList,
  Ruler, Thermometer, Timer, Beaker, FileCheck, Image, FolderOpen, ArrowRight,
  PlusCircle, MinusCircle, Copy, ExternalLink, Sparkles, Zap, Info
} from 'lucide-react'

// =============================================
// CONSTANTS
// =============================================

const MODULE_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'surveys', label: 'Surveys', icon: ClipboardList },
  { id: 'specifications', label: 'Specifications', icon: FileCheck },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'colors', label: 'Colors & Shades', icon: Palette },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'dealers', label: 'Dealers', icon: Building2 },
  { id: 'rate-cards', label: 'Rate Cards', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings }
]

const LEAD_TYPES = {
  dealer_enquiry: { label: 'Dealer Enquiry', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  project_enquiry: { label: 'Project Enquiry', color: 'bg-purple-100 text-purple-700', icon: Layers },
  service_job: { label: 'Service Job', color: 'bg-green-100 text-green-700', icon: Paintbrush },
  product_inquiry: { label: 'Product Inquiry', color: 'bg-amber-100 text-amber-700', icon: Package }
}

const LEAD_STATUS = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-slate-100 text-slate-700' },
  site_visit_scheduled: { label: 'Visit Scheduled', color: 'bg-amber-100 text-amber-700' },
  surveyed: { label: 'Surveyed', color: 'bg-purple-100 text-purple-700' },
  spec_in_progress: { label: 'Spec in Progress', color: 'bg-indigo-100 text-indigo-700' },
  spec_approved: { label: 'Spec Approved', color: 'bg-cyan-100 text-cyan-700' },
  quoted: { label: 'Quoted', color: 'bg-orange-100 text-orange-700' },
  won: { label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' }
}

const SURVEY_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' }
}

const SPEC_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  pending_internal: { label: 'Pending Internal', color: 'bg-amber-100 text-amber-700' },
  pending_client: { label: 'Pending Client', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
}

const FINISH_TYPES = {
  matte: { label: 'Matte', sheen: 0, color: 'bg-slate-100 text-slate-700' },
  satin: { label: 'Satin', sheen: 25, color: 'bg-blue-100 text-blue-700' },
  eggshell: { label: 'Eggshell', sheen: 15, color: 'bg-amber-100 text-amber-700' },
  semi_gloss: { label: 'Semi-Gloss', sheen: 50, color: 'bg-purple-100 text-purple-700' },
  gloss: { label: 'Gloss', sheen: 75, color: 'bg-emerald-100 text-emerald-700' },
  high_gloss: { label: 'High Gloss', sheen: 90, color: 'bg-cyan-100 text-cyan-700' },
  textured: { label: 'Textured', sheen: 0, color: 'bg-orange-100 text-orange-700' }
}

const BASE_TYPES = {
  water_based: { label: 'Water-Based', icon: Droplets, color: 'bg-blue-100 text-blue-700' },
  solvent_based: { label: 'Solvent-Based', icon: Beaker, color: 'bg-amber-100 text-amber-700' },
  '2k': { label: '2K System', icon: Layers, color: 'bg-purple-100 text-purple-700' },
  '3k': { label: '3K System', icon: Layers, color: 'bg-pink-100 text-pink-700' }
}

const DEALER_STATUS = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', color: 'bg-slate-100 text-slate-700' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' }
}

// =============================================
// GLASSMORPHISM COMPONENTS
// =============================================

const GlassCard = ({ children, className = '', gradient = false, ...props }) => (
  <div 
    className={`
      backdrop-blur-xl bg-white/70 border border-white/20 
      shadow-xl shadow-black/5 rounded-2xl
      ${gradient ? 'bg-gradient-to-br from-white/80 to-white/40' : ''}
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
)

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, onClick }) => (
  <GlassCard 
    className={`p-5 cursor-pointer hover:scale-[1.02] transition-transform ${onClick ? 'hover:shadow-lg' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}% vs last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </GlassCard>
)

const EmptyState = ({ icon: Icon, title, description, action, actionLabel }) => (
  <GlassCard className="p-12 text-center">
    <div className="flex flex-col items-center">
      <div className="p-4 rounded-full bg-slate-100 mb-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && (
        <Button onClick={action}>
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  </GlassCard>
)

// =============================================
// COLOR SWATCH COMPONENT
// =============================================

const ColorSwatch = ({ hex, name, code, size = 'md', onClick, selected }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`
              ${sizes[size]} rounded-lg border-2 transition-all
              ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white/50 hover:border-slate-300'}
              shadow-md hover:shadow-lg
            `}
            style={{ backgroundColor: hex }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{code}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// =============================================
// PRODUCT CARD COMPONENT
// =============================================

const ProductCard = ({ product, onEdit, onView }) => {
  const finishConfig = FINISH_TYPES[product.finishType] || FINISH_TYPES.matte
  const baseConfig = BASE_TYPES[product.baseType] || BASE_TYPES.water_based
  
  return (
    <GlassCard className="overflow-hidden group">
      {/* Product Image or Color Preview */}
      <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Paintbrush className="h-12 w-12 text-slate-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge className={finishConfig.color}>{finishConfig.label}</Badge>
        </div>
        {!product.isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Inactive</Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
            <h3 className="font-semibold line-clamp-1">{product.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(product)}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(product)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            <baseConfig.icon className="h-3 w-3 mr-1" />
            {baseConfig.label}
          </Badge>
        </div>
        
        {/* Pack sizes */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.packSizes?.slice(0, 4).map((pack, idx) => (
            <span key={idx} className="text-xs bg-slate-100 px-2 py-0.5 rounded">
              {pack.size}
            </span>
          ))}
        </div>
        
        {/* Technical specs */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-3">
          {product.technicalProperties?.coverage && (
            <div className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              <span>{product.technicalProperties.coverage} sqft/L</span>
            </div>
          )}
          {product.technicalProperties?.recommendedCoats && (
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>{product.technicalProperties.recommendedCoats} coats</span>
            </div>
          )}
        </div>
      </CardContent>
    </GlassCard>
  )
}

// =============================================
// DEALER CARD COMPONENT
// =============================================

const DealerCard = ({ dealer, onEdit, onView }) => {
  const statusConfig = DEALER_STATUS[dealer.status] || DEALER_STATUS.active
  const creditUtilization = dealer.creditLimit > 0 
    ? ((dealer.creditLimit - dealer.availableCredit) / dealer.creditLimit) * 100 
    : 0
  
  return (
    <GlassCard className="p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {dealer.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{dealer.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{dealer.code}</p>
          </div>
        </div>
        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        {dealer.contactPerson && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{dealer.contactPerson}</span>
          </div>
        )}
        {dealer.territory && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{dealer.territory}</span>
          </div>
        )}
        {dealer.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{dealer.phone}</span>
          </div>
        )}
      </div>
      
      <Separator className="my-3" />
      
      {/* Credit Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Credit Limit</span>
          <span className="font-semibold">₹{(dealer.creditLimit || 0).toLocaleString()}</span>
        </div>
        <Progress value={creditUtilization} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Available: ₹{(dealer.availableCredit || 0).toLocaleString()}</span>
          <span>Outstanding: ₹{(dealer.outstandingAmount || 0).toLocaleString()}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onView?.(dealer)}>
          <Eye className="h-4 w-4 mr-1" /> View
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(dealer)}>
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
      </div>
    </GlassCard>
  )
}

// =============================================
// MAIN MODULE COMPONENT
// =============================================

export function PaintsCoatingsModule({ token, user }) {
  // State
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Data state
  const [dashboard, setDashboard] = useState(null)
  const [products, setProducts] = useState([])
  const [colors, setColors] = useState([])
  const [categories, setCategories] = useState([])
  const [dealers, setDealers] = useState([])
  const [leads, setLeads] = useState([])
  const [leadStats, setLeadStats] = useState(null)
  const [surveys, setSurveys] = useState([])
  const [specifications, setSpecifications] = useState([])
  const [rateCards, setRateCards] = useState([])
  const [moduleConfig, setModuleConfig] = useState(null)
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState({ type: null, data: null })
  
  // Filters
  const [filters, setFilters] = useState({
    categoryId: '',
    finishType: '',
    baseType: '',
    status: ''
  })
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // =============================================
  // DATA FETCHING
  // =============================================
  
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings?type=dashboard', { headers })
      const data = await res.json()
      if (data.dashboard) setDashboard(data.dashboard)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
  }, [token])
  
  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.finishType) params.append('finishType', filters.finishType)
      if (filters.baseType) params.append('baseType', filters.baseType)
      if (searchTerm) params.append('search', searchTerm)
      
      const res = await fetch(`/api/modules/paints-coatings/products?${params}`, { headers })
      const data = await res.json()
      if (data.products) setProducts(data.products)
    } catch (error) {
      console.error('Products fetch error:', error)
    }
  }, [token, filters, searchTerm])
  
  const fetchColors = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings/colors', { headers })
      const data = await res.json()
      if (data.colors) setColors(data.colors)
    } catch (error) {
      console.error('Colors fetch error:', error)
    }
  }, [token])
  
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings/categories?tree=true', { headers })
      const data = await res.json()
      if (data.categories) setCategories(data.categories)
    } catch (error) {
      console.error('Categories fetch error:', error)
    }
  }, [token])
  
  const fetchDealers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (searchTerm) params.append('search', searchTerm)
      
      const res = await fetch(`/api/modules/paints-coatings/dealers?${params}`, { headers })
      const data = await res.json()
      if (data.dealers) setDealers(data.dealers)
    } catch (error) {
      console.error('Dealers fetch error:', error)
    }
  }, [token, filters, searchTerm])
  
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.leadType) params.append('leadType', filters.leadType)
      if (filters.status) params.append('status', filters.status)
      if (searchTerm) params.append('search', searchTerm)
      
      const res = await fetch(`/api/modules/paints-coatings/leads?${params}`, { headers })
      const data = await res.json()
      if (data.leads) setLeads(data.leads)
      if (data.stats) setLeadStats(data.stats)
    } catch (error) {
      console.error('Leads fetch error:', error)
    }
  }, [token, filters, searchTerm])
  
  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings/surveys', { headers })
      const data = await res.json()
      if (data.surveys) setSurveys(data.surveys)
    } catch (error) {
      console.error('Surveys fetch error:', error)
    }
  }, [token])
  
  const fetchSpecifications = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings/specifications', { headers })
      const data = await res.json()
      if (data.specifications) setSpecifications(data.specifications)
    } catch (error) {
      console.error('Specifications fetch error:', error)
    }
  }, [token])
  
  const fetchRateCards = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings/rate-cards', { headers })
      const data = await res.json()
      if (data.rateCards) setRateCards(data.rateCards)
    } catch (error) {
      console.error('Rate cards fetch error:', error)
    }
  }, [token])
  
  const fetchModuleConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/paints-coatings?type=config', { headers })
      const data = await res.json()
      if (data.config) setModuleConfig(data.config)
    } catch (error) {
      console.error('Config fetch error:', error)
    }
  }, [token])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchDashboard(),
        fetchCategories(),
        fetchModuleConfig()
      ])
      setLoading(false)
    }
    loadData()
  }, [fetchDashboard, fetchCategories, fetchModuleConfig])
  
  // Tab-specific loading
  useEffect(() => {
    if (activeTab === 'products') fetchProducts()
    if (activeTab === 'colors') fetchColors()
    if (activeTab === 'dealers') fetchDealers()
    if (activeTab === 'rate-cards') fetchRateCards()
  }, [activeTab, refreshKey, fetchProducts, fetchColors, fetchDealers, fetchRateCards])

  // =============================================
  // HANDLERS
  // =============================================
  
  const handleCreateProduct = async (productData) => {
    try {
      const res = await fetch('/api/modules/paints-coatings/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
      })
      if (res.ok) {
        toast.success('Product created successfully')
        setDialogOpen({ type: null, data: null })
        setRefreshKey(k => k + 1)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create product')
      }
    } catch (error) {
      toast.error('Failed to create product')
    }
  }
  
  const handleCreateDealer = async (dealerData) => {
    try {
      const res = await fetch('/api/modules/paints-coatings/dealers', {
        method: 'POST',
        headers,
        body: JSON.stringify(dealerData)
      })
      if (res.ok) {
        toast.success('Dealer created successfully')
        setDialogOpen({ type: null, data: null })
        setRefreshKey(k => k + 1)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create dealer')
      }
    } catch (error) {
      toast.error('Failed to create dealer')
    }
  }
  
  const handleCreateColor = async (colorData) => {
    try {
      const res = await fetch('/api/modules/paints-coatings/colors', {
        method: 'POST',
        headers,
        body: JSON.stringify(colorData)
      })
      if (res.ok) {
        toast.success('Color created successfully')
        setDialogOpen({ type: null, data: null })
        setRefreshKey(k => k + 1)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create color')
      }
    } catch (error) {
      toast.error('Failed to create color')
    }
  }

  // =============================================
  // RENDER TABS
  // =============================================
  
  const renderDashboard = () => {
    const overview = dashboard?.overview || {}
    const revenue = dashboard?.revenue || {}
    
    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={overview.totalProducts || 0}
            subtitle={`${overview.totalColors || 0} colors available`}
            icon={Package}
            color="bg-gradient-to-br from-blue-500 to-indigo-600"
            onClick={() => setActiveTab('products')}
          />
          <StatCard
            title="Active Dealers"
            value={overview.totalDealers || 0}
            subtitle="Channel partners"
            icon={Building2}
            color="bg-gradient-to-br from-emerald-500 to-teal-600"
            onClick={() => setActiveTab('dealers')}
          />
          <StatCard
            title="Active Orders"
            value={overview.activeOrders || 0}
            subtitle={`${overview.activeJobs || 0} active jobs`}
            icon={FileText}
            color="bg-gradient-to-br from-amber-500 to-orange-600"
          />
          <StatCard
            title="Revenue"
            value={`₹${((revenue.total || 0) / 100000).toFixed(1)}L`}
            subtitle={`₹${((revenue.monthly || 0) / 1000).toFixed(0)}K this month`}
            icon={DollarSign}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            trend={12}
          />
        </div>
        
        {/* Quick Actions */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setDialogOpen({ type: 'product', data: null })}
            >
              <Package className="h-6 w-6" />
              <span>Add Product</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setDialogOpen({ type: 'color', data: null })}
            >
              <Palette className="h-6 w-6" />
              <span>Add Color</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setDialogOpen({ type: 'dealer', data: null })}
            >
              <Building2 className="h-6 w-6" />
              <span>Add Dealer</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </div>
        </GlassCard>
        
        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
            {dashboard?.recentActivity?.orders?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentActivity.orders.map((order, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{order.orderNumber || `ORD-${idx + 1}`}</p>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <Badge>{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent orders</p>
            )}
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Surveys</h3>
            {dashboard?.recentActivity?.surveys?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentActivity.surveys.map((survey, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{survey.siteName || 'Site Survey'}</p>
                      <p className="text-sm text-muted-foreground">{survey.totalArea} sqft</p>
                    </div>
                    <Badge variant="outline">{survey.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent surveys</p>
            )}
          </GlassCard>
        </div>
      </div>
    )
  }
  
  const renderProducts = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.categoryId || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, categoryId: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filters.finishType || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, finishType: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Finish" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Finishes</SelectItem>
              {Object.entries(FINISH_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex-1" />
          
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button onClick={() => setDialogOpen({ type: 'product', data: null })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </GlassCard>
      
      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={(p) => setDialogOpen({ type: 'product', data: p })}
              onView={(p) => setDialogOpen({ type: 'view_product', data: p })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Start by adding your paint and coating products to the catalog."
          action={() => setDialogOpen({ type: 'product', data: null })}
          actionLabel="Add Product"
        />
      )}
    </div>
  )
  
  const renderColors = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search colors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex-1" />
          
          <Button onClick={() => setDialogOpen({ type: 'color', data: null })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Color
          </Button>
        </div>
      </GlassCard>
      
      {/* Colors Grid */}
      {colors.length > 0 ? (
        <GlassCard className="p-6">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
            {colors.map(color => (
              <div 
                key={color.id} 
                className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
                onClick={() => setDialogOpen({ type: 'view_color', data: color })}
              >
                <div 
                  className="h-16 w-16 rounded-xl shadow-md border-2 border-white group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="text-center">
                  <p className="text-xs font-medium truncate w-20">{color.name}</p>
                  <p className="text-xs text-muted-foreground">{color.code}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : (
        <EmptyState
          icon={Palette}
          title="No colors yet"
          description="Add colors and shades to your palette for product matching."
          action={() => setDialogOpen({ type: 'color', data: null })}
          actionLabel="Add Color"
        />
      )}
    </div>
  )
  
  const renderDealers = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search dealers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.status || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(DEALER_STATUS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex-1" />
          
          <Button onClick={() => setDialogOpen({ type: 'dealer', data: null })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Dealer
          </Button>
        </div>
      </GlassCard>
      
      {/* Dealers Grid */}
      {dealers.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dealers.map(dealer => (
            <DealerCard
              key={dealer.id}
              dealer={dealer}
              onEdit={(d) => setDialogOpen({ type: 'dealer', data: d })}
              onView={(d) => setDialogOpen({ type: 'view_dealer', data: d })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No dealers yet"
          description="Add your dealers and distributors to manage channel sales."
          action={() => setDialogOpen({ type: 'dealer', data: null })}
          actionLabel="Add Dealer"
        />
      )}
    </div>
  )
  
  const renderCategories = () => (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Product Categories</h3>
          <Button size="sm" onClick={() => setDialogOpen({ type: 'category', data: null })}>
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        </div>
      </GlassCard>
      
      <GlassCard className="p-6">
        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category.id} className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color || '#6B7280' }}
                    >
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.children?.length || 0} subcategories</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                {category.children?.length > 0 && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {category.children.map(child => (
                      <div key={child.id} className="p-2 bg-white border rounded flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">{child.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Loading default categories...</p>
        )}
      </GlassCard>
    </div>
  )
  
  const renderRateCards = () => (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Rate Cards</h3>
          <Button size="sm" onClick={() => setDialogOpen({ type: 'rate_card', data: null })}>
            <Plus className="h-4 w-4 mr-1" /> Add Rate Card
          </Button>
        </div>
      </GlassCard>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rateCards.map(card => (
          <GlassCard key={card.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium">{card.name}</h4>
                <Badge variant="outline" className="mt-1">{card.type}</Badge>
              </div>
              {card.isDefault && (
                <Badge className="bg-blue-100 text-blue-700">Default</Badge>
              )}
            </div>
            
            {card.rates && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate per sqft</span>
                  <span className="font-medium">₹{card.rates.perSqft}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate per sqm</span>
                  <span className="font-medium">₹{card.rates.perSqm}</span>
                </div>
              </div>
            )}
            
            {card.consumptionNorms && (
              <div className="space-y-1 text-sm mt-3 pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coverage</span>
                  <span className="font-medium">{card.consumptionNorms.coveragePerLitre || card.consumptionNorms.coveragePerKg} sqft/{card.consumptionNorms.coveragePerLitre ? 'L' : 'Kg'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wastage</span>
                  <span className="font-medium">{card.consumptionNorms.wastagePercentage}%</span>
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  )
  
  const renderSettings = () => (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Module Settings</h3>
        
        <div className="space-y-6">
          {/* Business Modes */}
          <div>
            <Label className="text-base font-medium">Business Modes</Label>
            <p className="text-sm text-muted-foreground mb-3">Enable the business models applicable to your operations</p>
            
            <div className="space-y-3">
              {[
                { id: 'manufacturer', label: 'Manufacturer', description: 'Production, BOM, batch tracking, QC' },
                { id: 'channel', label: 'Channel Sales', description: 'Dealers, distributors, schemes, rebates' },
                { id: 'service', label: 'Service Jobs', description: 'Painting jobs, site surveys, crew management' }
              ].map(mode => (
                <div key={mode.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{mode.label}</p>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </div>
                  <Switch 
                    checked={moduleConfig?.enabledModes?.includes(mode.id)}
                    onCheckedChange={(checked) => {
                      // Handle mode toggle
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Company Info */}
          <div>
            <Label className="text-base font-medium">Company Information</Label>
            <p className="text-sm text-muted-foreground mb-3">Details shown on quotes and invoices</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input placeholder="Your Company Name" defaultValue={moduleConfig?.companyInfo?.name} />
              </div>
              <div>
                <Label>GST Number</Label>
                <Input placeholder="GST Number" defaultValue={moduleConfig?.companyInfo?.gst} />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea placeholder="Company Address" defaultValue={moduleConfig?.companyInfo?.address} />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )

  // =============================================
  // DIALOGS
  // =============================================
  
  const renderProductDialog = () => {
    const isEdit = !!dialogOpen.data
    const [formData, setFormData] = useState(dialogOpen.data || {
      name: '',
      categoryId: '',
      familyId: '',
      description: '',
      finishType: 'matte',
      baseType: 'water_based',
      packSizes: [
        { size: '1L', unit: 'litre', mrp: 0, dealerPrice: 0 },
        { size: '4L', unit: 'litre', mrp: 0, dealerPrice: 0 },
        { size: '10L', unit: 'litre', mrp: 0, dealerPrice: 0 },
        { size: '20L', unit: 'litre', mrp: 0, dealerPrice: 0 }
      ],
      technicalProperties: {
        coverage: '',
        recommendedCoats: 2,
        dryingTime: '',
        recoatTime: '',
        warrantyYears: 0
      }
    })
    
    return (
      <Dialog open={dialogOpen.type === 'product'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update product details' : 'Add a new paint or coating product to your catalog'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Product Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Premium Interior Emulsion"
                />
              </div>
              
              <div>
                <Label>Category</Label>
                <Select value={formData.categoryId || 'none'} onValueChange={(v) => setFormData(f => ({ ...f, categoryId: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Finish Type</Label>
                <Select value={formData.finishType} onValueChange={(v) => setFormData(f => ({ ...f, finishType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FINISH_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Base Type</Label>
                <Select value={formData.baseType} onValueChange={(v) => setFormData(f => ({ ...f, baseType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BASE_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Coverage (sqft/litre)</Label>
                <Input 
                  type="number"
                  value={formData.technicalProperties?.coverage || ''}
                  onChange={(e) => setFormData(f => ({ 
                    ...f, 
                    technicalProperties: { ...f.technicalProperties, coverage: e.target.value }
                  }))}
                  placeholder="e.g., 120"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>
            </div>
            
            {/* Pack Sizes */}
            <div>
              <Label className="mb-2 block">Pack Sizes & Pricing</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-right">MRP (₹)</th>
                      <th className="p-2 text-right">Dealer Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.packSizes?.map((pack, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{pack.size}</td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            className="w-24 h-8 text-right ml-auto"
                            value={pack.mrp || ''}
                            onChange={(e) => {
                              const newPacks = [...formData.packSizes]
                              newPacks[idx] = { ...newPacks[idx], mrp: parseFloat(e.target.value) || 0 }
                              setFormData(f => ({ ...f, packSizes: newPacks }))
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            className="w-24 h-8 text-right ml-auto"
                            value={pack.dealerPrice || ''}
                            onChange={(e) => {
                              const newPacks = [...formData.packSizes]
                              newPacks[idx] = { ...newPacks[idx], dealerPrice: parseFloat(e.target.value) || 0 }
                              setFormData(f => ({ ...f, packSizes: newPacks }))
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateProduct(formData)}>
              {isEdit ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  
  const renderColorDialog = () => {
    const [formData, setFormData] = useState(dialogOpen.data || {
      name: '',
      code: '',
      hex: '#3B82F6',
      colorFamily: 'blue'
    })
    
    return (
      <Dialog open={dialogOpen.type === 'color'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Color</DialogTitle>
            <DialogDescription>Add a new color/shade to your palette</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div 
                className="h-20 w-20 rounded-xl border-2 border-white shadow-lg"
                style={{ backgroundColor: formData.hex }}
              />
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Color Name *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Ocean Blue"
                  />
                </div>
                <div>
                  <Label>Color Code *</Label>
                  <Input 
                    value={formData.code}
                    onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))}
                    placeholder="e.g., OB-1234"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label>Hex Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color"
                  value={formData.hex}
                  onChange={(e) => setFormData(f => ({ ...f, hex: e.target.value }))}
                  className="w-14 h-10 p-1"
                />
                <Input 
                  value={formData.hex}
                  onChange={(e) => setFormData(f => ({ ...f, hex: e.target.value }))}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Color Family</Label>
              <Select value={formData.colorFamily} onValueChange={(v) => setFormData(f => ({ ...f, colorFamily: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'grey', 'white', 'black', 'neutral'].map(family => (
                    <SelectItem key={family} value={family} className="capitalize">{family}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateColor(formData)}>
              Add Color
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  
  const renderDealerDialog = () => {
    const isEdit = !!dialogOpen.data
    const [formData, setFormData] = useState(dialogOpen.data || {
      name: '',
      type: 'dealer',
      contactPerson: '',
      email: '',
      phone: '',
      territory: '',
      gst: '',
      creditLimit: 0,
      paymentTerms: 30
    })
    
    return (
      <Dialog open={dialogOpen.type === 'dealer'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Dealer' : 'Add New Dealer'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update dealer details' : 'Add a new dealer or distributor'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Dealer/Company Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(f => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Territory</Label>
                <Input 
                  value={formData.territory}
                  onChange={(e) => setFormData(f => ({ ...f, territory: e.target.value }))}
                  placeholder="e.g., North Delhi"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Person</Label>
                <Input 
                  value={formData.contactPerson}
                  onChange={(e) => setFormData(f => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="Name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91"
                />
              </div>
            </div>
            
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                placeholder="email@company.com"
              />
            </div>
            
            <div>
              <Label>GST Number</Label>
              <Input 
                value={formData.gst}
                onChange={(e) => setFormData(f => ({ ...f, gst: e.target.value }))}
                placeholder="GST Number"
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Credit Limit (₹)</Label>
                <Input 
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Payment Terms (days)</Label>
                <Input 
                  type="number"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(f => ({ ...f, paymentTerms: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateDealer(formData)}>
              {isEdit ? 'Update Dealer' : 'Add Dealer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // =============================================
  // MAIN RENDER
  // =============================================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Paints & Coatings Module...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Paints & Coatings
            </h1>
            <p className="text-muted-foreground">Manage your paints catalog, dealers, and service operations</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Phase 1
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <GlassCard className="p-1">
          <div className="flex overflow-x-auto gap-1">
            {MODULE_TABS.map(tab => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  className={`flex-shrink-0 ${activeTab === tab.id ? 'bg-white shadow-sm' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              )
            })}
          </div>
        </GlassCard>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'products' && renderProducts()}
            {activeTab === 'colors' && renderColors()}
            {activeTab === 'categories' && renderCategories()}
            {activeTab === 'dealers' && renderDealers()}
            {activeTab === 'rate-cards' && renderRateCards()}
            {activeTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      {dialogOpen.type === 'product' && renderProductDialog()}
      {dialogOpen.type === 'color' && renderColorDialog()}
      {dialogOpen.type === 'dealer' && renderDealerDialog()}
    </div>
  )
}

export default PaintsCoatingsModule
