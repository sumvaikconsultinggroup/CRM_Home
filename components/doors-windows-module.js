'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  LayoutDashboard, Package, ClipboardList, FileText, ShoppingCart, Factory,
  Truck, Wrench, Shield, Bell, BarChart3, Settings, Plus, Search, Filter,
  RefreshCw, Download, Upload, Eye, Edit, Trash2, ChevronRight, ChevronDown,
  ArrowRight, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock,
  AlertTriangle, Calendar, MapPin, Phone, Mail, User, Building2, Ruler,
  Layers, Grid3X3, Box, Palette, Cog, Hammer, Glasses, DoorOpen, Maximize2,
  MoreHorizontal, MoreVertical, Send, FileCheck, Loader2, TrendingUp, TrendingDown,
  Brain, MessageSquare, Sparkles, Zap, Save, Printer, FolderKanban, Camera,
  Target, FileImage, Home, Building, Warehouse, ScanLine, Activity, Users,
  PanelLeftClose, History, ExternalLink, Copy, Link2, Image as ImageIcon,
  DollarSign, Receipt, CreditCard, CircleDollarSign, IndianRupee, SquareStack,
  Grip, Move, PencilRuler, Square, RectangleHorizontal, Proportions
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// =========================================
// GLASSMORPHISM COMPONENTS
// =========================================
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

// =========================================
// SVG DRAWING COMPONENT FOR DOORS/WINDOWS
// =========================================
const WindowDoorDrawing = ({ config, width = 280, height = 280, showDimensions = true }) => {
  const {
    width: itemWidth = 1200,
    height: itemHeight = 1500,
    type = 'casement',
    panels = [],
    viewDirection = 'inside',
    frameThickness = 60,
    profileColor = 'white'
  } = config || {}

  const padding = 50
  const drawableWidth = width - padding * 2
  const drawableHeight = height - padding * 2
  const scale = Math.min(drawableWidth / itemWidth, drawableHeight / itemHeight)
  
  const scaledWidth = itemWidth * scale
  const scaledHeight = itemHeight * scale
  const scaledFrame = Math.max(frameThickness * scale, 4)
  
  const startX = (width - scaledWidth) / 2
  const startY = (height - scaledHeight) / 2

  const frameColors = {
    white: { fill: '#f8f9fa', stroke: '#dee2e6' },
    black: { fill: '#343a40', stroke: '#212529' },
    grey: { fill: '#6c757d', stroke: '#495057' },
    brown: { fill: '#6d4c41', stroke: '#4e342e' },
    Aluminium: { fill: '#c0c0c0', stroke: '#a0a0a0' },
    uPVC: { fill: '#f5f5f5', stroke: '#e0e0e0' }
  }
  const colors = frameColors[profileColor] || frameColors.white
  const glassColor = '#cce5ff'
  const glassBorder = '#0056b3'

  const panelData = panels.length > 0 ? panels : [{ type: 'openable', openingDirection: 'left' }]
  const numPanels = panelData.length
  const innerWidth = scaledWidth - scaledFrame * 2
  const innerHeight = scaledHeight - scaledFrame * 2
  const panelWidth = innerWidth / numPanels

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 rounded-lg border">
      <defs>
        <pattern id="dwGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9ecef" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dwGrid)" />

      <rect x={startX} y={startY} width={scaledWidth} height={scaledHeight}
        fill={colors.fill} stroke={colors.stroke} strokeWidth="2" rx="2" />

      <rect x={startX + scaledFrame} y={startY + scaledFrame}
        width={innerWidth} height={innerHeight}
        fill={glassColor} stroke={glassBorder} strokeWidth="1" opacity="0.3" />

      {panelData.map((panel, idx) => {
        const panelX = startX + scaledFrame + (panelWidth * idx)
        const panelY = startY + scaledFrame
        const isFixed = panel.type === 'fixed' || panel.type === 'Fixed'
        const openDir = panel.openingDirection || panel.direction || 'left'

        return (
          <g key={idx}>
            <rect x={panelX + 2} y={panelY + 2} width={panelWidth - 4} height={innerHeight - 4}
              fill="transparent" stroke={colors.stroke} strokeWidth="1.5" />
            <rect x={panelX + 8} y={panelY + 8} width={panelWidth - 16} height={innerHeight - 16}
              fill={glassColor} stroke={glassBorder} strokeWidth="1" opacity="0.4" />

            {isFixed && (
              <g stroke="#6c757d" strokeWidth="1" opacity="0.5">
                <line x1={panelX + 8} y1={panelY + 8} x2={panelX + panelWidth - 8} y2={panelY + innerHeight - 8} />
                <line x1={panelX + panelWidth - 8} y1={panelY + 8} x2={panelX + 8} y2={panelY + innerHeight - 8} />
              </g>
            )}

            {!isFixed && (
              <g>
                {openDir === 'left' || openDir === 'Left' ? (
                  <polygon
                    points={`${panelX + panelWidth - 10},${panelY + 15} ${panelX + 15},${panelY + innerHeight / 2} ${panelX + panelWidth - 10},${panelY + innerHeight - 15}`}
                    fill="none" stroke="#007bff" strokeWidth="1.5" strokeDasharray="4,2" />
                ) : (
                  <polygon
                    points={`${panelX + 10},${panelY + 15} ${panelX + panelWidth - 15},${panelY + innerHeight / 2} ${panelX + 10},${panelY + innerHeight - 15}`}
                    fill="none" stroke="#007bff" strokeWidth="1.5" strokeDasharray="4,2" />
                )}
                <circle
                  cx={openDir === 'left' || openDir === 'Left' ? panelX + panelWidth - 18 : panelX + 18}
                  cy={panelY + innerHeight / 2} r="4" fill="#495057" />
              </g>
            )}

            <text x={panelX + panelWidth / 2} y={panelY + innerHeight + 18}
              textAnchor="middle" fontSize="9" fill="#6c757d" fontFamily="sans-serif">
              {isFixed ? 'FIXED' : openDir === 'left' || openDir === 'Left' ? 'RDout' : 'LDout'}
            </text>
          </g>
        )
      })}

      {showDimensions && (
        <g>
          <line x1={startX} y1={startY + scaledHeight + 22} x2={startX + scaledWidth} y2={startY + scaledHeight + 22}
            stroke="#495057" strokeWidth="1" />
          <line x1={startX} y1={startY + scaledHeight + 17} x2={startX} y2={startY + scaledHeight + 27} stroke="#495057" strokeWidth="1" />
          <line x1={startX + scaledWidth} y1={startY + scaledHeight + 17} x2={startX + scaledWidth} y2={startY + scaledHeight + 27} stroke="#495057" strokeWidth="1" />
          <text x={startX + scaledWidth / 2} y={startY + scaledHeight + 36}
            textAnchor="middle" fontSize="10" fill="#212529" fontWeight="600" fontFamily="sans-serif">
            {itemWidth}w
          </text>

          <line x1={startX + scaledWidth + 22} y1={startY} x2={startX + scaledWidth + 22} y2={startY + scaledHeight}
            stroke="#495057" strokeWidth="1" />
          <line x1={startX + scaledWidth + 17} y1={startY} x2={startX + scaledWidth + 27} y2={startY} stroke="#495057" strokeWidth="1" />
          <line x1={startX + scaledWidth + 17} y1={startY + scaledHeight} x2={startX + scaledWidth + 27} y2={startY + scaledHeight} stroke="#495057" strokeWidth="1" />
          <text x={startX + scaledWidth + 36} y={startY + scaledHeight / 2}
            textAnchor="middle" fontSize="10" fill="#212529" fontWeight="600" fontFamily="sans-serif"
            transform={`rotate(90, ${startX + scaledWidth + 36}, ${startY + scaledHeight / 2})`}>
            {itemHeight}h
          </text>

          <text x={startX + scaledWidth / 2} y={height - 5}
            textAnchor="middle" fontSize="9" fill="#6c757d" fontFamily="sans-serif">
            ({((itemWidth / 304.8) * (itemHeight / 304.8)).toFixed(2)} sqft)
          </text>
        </g>
      )}

      <text x={8} y={height - 5} fontSize="8" fill="#adb5bd" fontFamily="sans-serif">
        View: {viewDirection}
      </text>
    </svg>
  )
}

// =========================================
// CONSTANTS & CONFIGURATIONS
// =========================================
const PRODUCT_FAMILIES = ['Aluminium', 'uPVC', 'Wood', 'Steel', 'Composite']
const CATEGORIES = ['Sliding', 'Casement', 'Tilt & Turn', 'Fixed', 'Folding', 'French', 'Lift & Slide', 'Partition', 'Curtain Wall', 'Skylight', 'Bay Window', 'Pivot', 'Top Hung', 'Bottom Hung']
const PRODUCT_TYPES = ['Window', 'Door', 'Sliding Door', 'Entrance Door', 'French Door', 'Louver', 'Ventilator']
const GLASS_TYPES = ['Single Clear', 'Single Tinted', 'Double/DGU Clear', 'DGU Tinted', 'Laminated', 'Low-E', 'Acoustic', 'Frosted', 'Reflective', 'Toughened']
const HARDWARE_BRANDS = ['Assa Abloy', 'Dorma', 'Roto', 'Siegenia', 'GU', 'Hoppe', 'EBCO', 'Godrej']
const FINISHES = ['Anodized Silver', 'Anodized Bronze', 'Powder Coat White', 'Powder Coat Black', 'Powder Coat Grey', 'Wood Finish Walnut', 'Wood Finish Oak', 'Laminate', 'Natural Mill Finish']
const BUILDING_TYPES = ['Residential - Independent', 'Residential - Apartment', 'Residential - Villa', 'Commercial - Office', 'Commercial - Retail', 'Commercial - Mall', 'Industrial', 'Hospital', 'Hotel', 'Educational Institution', 'Government']
const SURVEY_PRIORITY = ['Urgent (24hrs)', 'High (3 days)', 'Normal (1 week)', 'Low (2 weeks)']

// Status colors for UI
const statusColors = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sent: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  remeasure: 'bg-orange-100 text-orange-700 border-orange-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
}

// Navigation items for sidebar
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, group: 'main', badge: 'sync' },
  { id: 'surveys', label: 'Site Survey', icon: Ruler, group: 'intake', badge: 'first' },
  { id: 'quotations', label: 'Quotations', icon: FileText, group: 'sales' },
  { id: 'quote-builder', label: 'Quote Builder', icon: PencilRuler, group: 'sales', badge: 'new' },
  { id: 'orders', label: 'Sales Orders', icon: ShoppingCart, group: 'sales' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, group: 'sales' },
  { id: 'production', label: 'Production', icon: Factory, group: 'production' },
  { id: 'dispatch', label: 'Dispatch', icon: Truck, group: 'production' },
  { id: 'installation', label: 'Installation', icon: Wrench, group: 'execution' },
  { id: 'service', label: 'Service Tickets', icon: Hammer, group: 'execution' },
  { id: 'warranty', label: 'Warranty & AMC', icon: Shield, group: 'execution' },
  { id: 'catalog', label: 'Product Catalog', icon: Package, group: 'catalog' },
  { id: 'mee-ai', label: 'MEE AI', icon: Brain, group: 'ai', badge: 'new' },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'reports' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'config' }
]

const navGroups = {
  main: null,
  intake: 'Site Survey & Intake',
  sales: 'Sales & Quotations',
  production: 'Manufacturing',
  execution: 'Delivery & Service',
  catalog: 'Product Management',
  ai: 'AI Assistant',
  reports: 'Analytics',
  config: 'Configuration'
}

// =========================================
// MAIN COMPONENT
// =========================================
export function DoorsWindowsModule({ client, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Data states
  const [dashboard, setDashboard] = useState(null)
  const [surveys, setSurveys] = useState([])
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [installations, setInstallations] = useState([])
  const [serviceTickets, setServiceTickets] = useState([])
  const [warranties, setWarranties] = useState([])
  const [catalog, setCatalog] = useState([])
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  
  // Dialog states
  const [showNewSurvey, setShowNewSurvey] = useState(false)
  const [showNewQuote, setShowNewQuote] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showSurveyDetail, setShowSurveyDetail] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({})
  const [openings, setOpenings] = useState([])
  const [surveyFormStep, setSurveyFormStep] = useState(1)

  // CRM Sync states
  const [crmSyncStatus, setCrmSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)

  // Quote Builder states
  const [quoteBuilderItems, setQuoteBuilderItems] = useState([])
  const [quoteCustomerInfo, setQuoteCustomerInfo] = useState({ name: '', phone: '', email: '', address: '' })

  // MEE AI states
  const [aiChatMessages, setAiChatMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  // =========================================
  // FETCH FUNCTIONS
  // =========================================
  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [dashboardRes, surveysRes, quotesRes, ordersRes, workOrdersRes, dispatchesRes, installsRes, ticketsRes, warrantiesRes, catalogRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers }),
        fetch(`${API_BASE}/surveys`, { headers }),
        fetch(`${API_BASE}/quotations`, { headers }),
        fetch(`${API_BASE}/orders`, { headers }),
        fetch(`${API_BASE}/production`, { headers }),
        fetch(`${API_BASE}/dispatch`, { headers }),
        fetch(`${API_BASE}/installation`, { headers }),
        fetch(`${API_BASE}/service`, { headers }),
        fetch(`${API_BASE}/warranty`, { headers }),
        fetch(`${API_BASE}/catalog?type=system`, { headers }),
        fetch(`${API_BASE}/projects`, { headers })
      ])

      const results = await Promise.all([
        dashboardRes.json(),
        surveysRes.json(),
        quotesRes.json(),
        ordersRes.json(),
        workOrdersRes.json(),
        dispatchesRes.json(),
        installsRes.json(),
        ticketsRes.json(),
        warrantiesRes.json(),
        catalogRes.json(),
        projectsRes.json()
      ])

      if (results[0].dashboard) setDashboard(results[0].dashboard)
      if (results[1].surveys) setSurveys(results[1].surveys)
      if (results[2].quotations) setQuotations(results[2].quotations)
      if (results[3].orders) setOrders(results[3].orders)
      if (results[4].workOrders) setWorkOrders(results[4].workOrders)
      if (results[5].dispatches) setDispatches(results[5].dispatches)
      if (results[6].installations) setInstallations(results[6].installations)
      if (results[7].tickets) setServiceTickets(results[7].tickets)
      if (results[8].warranties) setWarranties(results[8].warranties)
      if (results[9].items) setCatalog(results[9].items)
      if (Array.isArray(results[10])) setProjects(results[10])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load module data')
    } finally {
      setLoading(false)
    }
  }

  const fetchCrmSyncStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sync`, { headers })
      if (res.ok) {
        const data = await res.json()
        setCrmSyncStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch CRM sync status:', error)
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers })
      if (res.ok) {
        const data = await res.json()
        setProjects(Array.isArray(data) ? data : data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }, [])

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/surveys`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSurveys(data.surveys || [])
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
    fetchCrmSyncStatus()
  }, [refreshKey])

  useEffect(() => {
    if (activeTab === 'projects') {
      fetchProjects()
      fetchCrmSyncStatus()
    }
    if (activeTab === 'surveys') fetchSurveys()
  }, [activeTab])

  const refresh = () => setRefreshKey(k => k + 1)

  // =========================================
  // CRM SYNC FUNCTIONS
  // =========================================
  const handleSyncFromCRM = async (syncType) => {
    try {
      setSyncing(true)
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: `sync_${syncType}` })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || `Synced ${syncType} from CRM`)
        fetchProjects()
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

  const handlePushToCRM = async (projectId) => {
    try {
      setSyncing(true)
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'push_to_crm', entityId: projectId })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Pushed to CRM successfully`)
        fetchProjects()
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

  // =========================================
  // SURVEY CRUD FUNCTIONS
  // =========================================
  const createSurvey = async () => {
    try {
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Survey created successfully')
        setShowNewSurvey(false)
        setFormData({})
        setSurveyFormStep(1)
        refresh()
      } else {
        toast.error(data.error || 'Failed to create survey')
      }
    } catch (error) {
      toast.error('Failed to create survey')
    }
  }

  // =========================================
  // PROJECT CRUD FUNCTIONS
  // =========================================
  const createProject = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Project created successfully')
        setShowNewProject(false)
        setFormData({})
        fetchProjects()
      } else {
        toast.error(data.error || 'Failed to create project')
      }
    } catch (error) {
      toast.error('Failed to create project')
    }
  }

  // =========================================
  // QUOTATION FUNCTIONS
  // =========================================
  const createQuotation = async () => {
    try {
      const res = await fetch(`${API_BASE}/quotations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Quotation created successfully')
        setShowNewQuote(false)
        setFormData({})
        refresh()
      } else {
        toast.error(data.error || 'Failed to create quotation')
      }
    } catch (error) {
      toast.error('Failed to create quotation')
    }
  }

  const convertToOrder = async (quoteId) => {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'convert-quote', quoteId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Quote converted to order')
        refresh()
      } else {
        toast.error(data.error || 'Failed to convert quote')
      }
    } catch (error) {
      toast.error('Failed to convert quote')
    }
  }

  // =========================================
  // STATUS BADGE HELPER
  // =========================================
  const getStatusColor = (status) => {
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  // =========================================
  // LOADING STATE
  // =========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading Doors & Windows Module...</p>
        </div>
      </div>
    )
  }

  // =========================================
  // RENDER DASHBOARD
  // =========================================
  const renderDashboard = () => {
    const surveyStats = {
      total: surveys.length,
      pending: surveys.filter(s => s.status === 'pending').length,
      completed: surveys.filter(s => s.status === 'completed').length,
      remeasure: surveys.filter(s => s.remeasureRequired).length
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doors & Windows Dashboard</h1>
            <p className="text-slate-500 mt-1">Overview of your manufacturing & fabrication operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => { setFormData({}); setSurveyFormStep(1); setShowNewSurvey(true) }}>
              <Plus className="h-4 w-4 mr-2" /> New Site Survey
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4">
          <StatCard title="Total Surveys" value={surveyStats.total} subtitle="All time" icon={Ruler} color="blue" delay={0} />
          <StatCard title="Pending Surveys" value={surveyStats.pending} subtitle="Need action" icon={Clock} color="amber" delay={0.05} />
          <StatCard title="Active Quotations" value={quotations.filter(q => q.status === 'sent').length} subtitle="Awaiting approval" icon={FileText} color="purple" delay={0.1} />
          <StatCard title="Active Orders" value={orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length} subtitle="In progress" icon={ShoppingCart} color="cyan" delay={0.15} />
          <StatCard title="In Production" value={workOrders.filter(w => w.status === 'in-progress').length} subtitle="Manufacturing" icon={Factory} color="green" delay={0.2} />
          <StatCard title="Open Tickets" value={serviceTickets.filter(t => t.status === 'open').length} subtitle="Service requests" icon={AlertTriangle} color="rose" delay={0.25} />
        </div>

        {/* Pipeline */}
        <GlassCard className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Project Pipeline</h3>
          <div className="flex items-center justify-between">
            {[
              { stage: 'Site Survey', count: surveyStats.pending, color: 'bg-blue-500' },
              { stage: 'Measurement', count: surveyStats.completed, color: 'bg-indigo-500' },
              { stage: 'Quotation', count: quotations.filter(q => q.status === 'draft').length, color: 'bg-purple-500' },
              { stage: 'Order', count: orders.filter(o => o.status === 'confirmed').length, color: 'bg-cyan-500' },
              { stage: 'Production', count: workOrders.length, color: 'bg-orange-500' },
              { stage: 'Installation', count: installations.filter(i => i.status !== 'completed').length, color: 'bg-green-500' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={`h-16 w-16 rounded-full ${item.color} flex items-center justify-center text-white font-bold text-xl`}>
                  {item.count}
                </div>
                <p className="text-sm mt-2 text-muted-foreground">{item.stage}</p>
                {i < 5 && <ChevronRight className="h-4 w-4 text-gray-300 absolute translate-x-[60px]" />}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-6">
          <GlassCard className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'New Site Survey', icon: Ruler, action: () => { setFormData({}); setSurveyFormStep(1); setShowNewSurvey(true) } },
                { label: 'New Project', icon: FolderKanban, action: () => setShowNewProject(true) },
                { label: 'Create Quotation', icon: FileText, action: () => setShowNewQuote(true) },
                { label: 'Sync from CRM', icon: RefreshCw, action: () => handleSyncFromCRM('projects') },
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

          <GlassCard className="col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recent Surveys</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('surveys')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {surveys.slice(0, 4).map((survey, i) => (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{survey.surveyNumber}</p>
                    <p className="text-xs text-muted-foreground">{survey.siteName || survey.siteAddress}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(survey.status)}>{survey.status}</Badge>
                    <span className="text-xs text-muted-foreground">{survey.surveyorName}</span>
                  </div>
                </motion.div>
              ))}
              {surveys.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No surveys yet. Create your first site survey!</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

  // =========================================
  // RENDER PROJECTS TAB (with CRM Sync like Furniture)
  // =========================================
  const renderProjects = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Projects</h2>
            <p className="text-muted-foreground">Manage your doors & windows projects with CRM sync</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSyncFromCRM('projects')} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync from CRM
            </Button>
            <Button onClick={() => { setFormData({}); setShowNewProject(true) }}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>
        </div>

        {/* CRM Sync Status Card */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                <Link2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">CRM Sync Status</h4>
                <p className="text-sm text-muted-foreground">
                  {crmSyncStatus?.alreadySynced || 0} projects synced from CRM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {crmSyncStatus?.availableToSync && (
                <Badge variant="outline" className="text-blue-600">
                  {crmSyncStatus.availableToSync.projects || 0} available to sync
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => handleSyncFromCRM('projects')} disabled={syncing}>
                {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Sync Now
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Projects List */}
        <GlassCard className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.projectNumber || project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{project.clientName || project.customer?.name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{project.clientPhone || project.customer?.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{project.buildingType || project.type || '-'}</TableCell>
                  <TableCell className="font-medium">₹{(project.value || project.budget || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {project.source === 'crm_sync' ? (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        <Link2 className="h-3 w-3 mr-1" /> CRM
                      </Badge>
                    ) : (
                      <Badge variant="outline">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('surveys')}>
                        <Ruler className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveTab('surveys')}>
                            <Ruler className="h-4 w-4 mr-2" /> Start Survey
                          </DropdownMenuItem>
                          <DropdownMenuItem><FileText className="h-4 w-4 mr-2" /> Create Quote</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!project.crmProjectId && (
                            <DropdownMenuItem onClick={() => handlePushToCRM(project.id)}>
                              <ExternalLink className="h-4 w-4 mr-2" /> Push to CRM
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <FolderKanban className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-muted-foreground">No projects yet. Create a new project or sync from CRM.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </GlassCard>
      </div>
    )
  }

  // =========================================
  // RENDER SITE SURVEY TAB - SUPER ADVANCED
  // =========================================
  const renderSurveys = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Ruler className="h-6 w-6 text-blue-600" />
              Site Surveys & Measurements
            </h2>
            <p className="text-muted-foreground">
              <Badge className="bg-amber-100 text-amber-700 mr-2">First Step</Badge>
              Site measurement and survey is the foundation of every project
            </p>
          </div>
          <Button onClick={() => { setFormData({}); setSurveyFormStep(1); setShowNewSurvey(true) }}>
            <Plus className="h-4 w-4 mr-2" /> New Site Survey
          </Button>
        </div>

        {/* Survey Stats */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total Surveys', value: surveys.length, icon: Ruler, color: 'blue' },
            { label: 'Pending', value: surveys.filter(s => s.status === 'pending').length, icon: Clock, color: 'amber' },
            { label: 'In Progress', value: surveys.filter(s => s.status === 'in_progress').length, icon: Activity, color: 'purple' },
            { label: 'Completed', value: surveys.filter(s => s.status === 'completed').length, icon: CheckCircle2, color: 'green' },
            { label: 'Re-measure', value: surveys.filter(s => s.remeasureRequired).length, icon: AlertTriangle, color: 'rose' }
          ].map((stat, i) => (
            <GlassCard key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Surveys Table */}
        <GlassCard className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Survey #</TableHead>
                <TableHead>Site Details</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Surveyor</TableHead>
                <TableHead>Openings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Survey Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((survey) => (
                <TableRow key={survey.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-blue-600">{survey.surveyNumber}</p>
                      <p className="text-xs text-muted-foreground">{survey.buildingType || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{survey.siteName || 'Unnamed Site'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{survey.siteAddress}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{survey.contactPerson}</p>
                      <p className="text-xs text-muted-foreground">{survey.contactPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {survey.surveyorName?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{survey.surveyorName || 'Unassigned'}</p>
                        <p className="text-xs text-muted-foreground">Surveyor</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{survey.openingsCount || 0} openings</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(survey.status)}>{survey.status}</Badge>
                    {survey.remeasureRequired && (
                      <Badge variant="destructive" className="ml-1 text-xs">Re-measure</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{survey.surveyDate ? new Date(survey.surveyDate).toLocaleDateString() : '-'}</p>
                      <p className="text-xs text-muted-foreground">{survey.surveyDate ? new Date(survey.surveyDate).toLocaleTimeString() : ''}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedSurvey(survey); setShowSurveyDetail(true) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Camera className="h-4 w-4 mr-2" /> Add Photos</DropdownMenuItem>
                          <DropdownMenuItem><Plus className="h-4 w-4 mr-2" /> Add Opening</DropdownMenuItem>
                          <DropdownMenuItem><FileText className="h-4 w-4 mr-2" /> Generate Quote</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete</DropdownMenuItem>
                          <DropdownMenuItem className="text-orange-600"><AlertTriangle className="h-4 w-4 mr-2" /> Request Re-measure</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {surveys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Ruler className="h-16 w-16 mx-auto text-slate-200 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No Site Surveys Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Site survey is the first and most important step. Accurate measurements ensure successful projects.
                    </p>
                    <Button onClick={() => { setFormData({}); setSurveyFormStep(1); setShowNewSurvey(true) }}>
                      <Plus className="h-4 w-4 mr-2" /> Create Your First Survey
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </GlassCard>
      </div>
    )
  }

  // =========================================
  // RENDER QUOTATIONS TAB
  // =========================================
  const renderQuotations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quotations</h2>
          <p className="text-muted-foreground">Manage quotes and pricing</p>
        </div>
        <Button onClick={() => { setFormData({}); setShowNewQuote(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total', value: quotations.length, color: 'text-blue-600' },
          { label: 'Draft', value: quotations.filter(q => q.status === 'draft').length, color: 'text-gray-600' },
          { label: 'Sent', value: quotations.filter(q => q.status === 'sent').length, color: 'text-purple-600' },
          { label: 'Approved', value: quotations.filter(q => q.status === 'approved').length, color: 'text-green-600' },
          { label: 'Value', value: `₹${(quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0) / 100000).toFixed(1)}L`, color: 'text-blue-600' }
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <GlassCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">
                  {quote.quoteNumber}
                  {quote.version > 1 && <Badge variant="outline" className="ml-1">V{quote.version}</Badge>}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{quote.customerName}</p>
                    <p className="text-xs text-muted-foreground">{quote.siteAddress}</p>
                  </div>
                </TableCell>
                <TableCell>{quote.itemsCount || 0}</TableCell>
                <TableCell className="font-medium">₹{(quote.grandTotal || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
                </TableCell>
                <TableCell>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                    {quote.status === 'approved' && (
                      <Button variant="ghost" size="sm" onClick={() => convertToOrder(quote.id)}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm"><Send className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {quotations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No quotations found. Create your first quotation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  )

  // =========================================
  // RENDER QUOTE BUILDER
  // =========================================
  const renderQuoteBuilder = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PencilRuler className="h-6 w-6 text-blue-600" />
            Quote Builder
          </h2>
          <p className="text-muted-foreground">Build detailed quotes with dynamic drawings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Save className="h-4 w-4 mr-2" /> Save Draft</Button>
          <Button><Send className="h-4 w-4 mr-2" /> Send Quote</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Quote Items List */}
        <div className="col-span-2 space-y-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Quote Items</h3>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            {quoteBuilderItems.length === 0 ? (
              <div className="text-center py-8">
                <RectangleHorizontal className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-muted-foreground">No items added. Add windows or doors to your quote.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quoteBuilderItems.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex gap-4">
                      <WindowDoorDrawing
                        config={{
                          width: item.width,
                          height: item.height,
                          panels: item.panels,
                          profileColor: item.profileColor
                        }}
                        width={150}
                        height={150}
                        showDimensions={false}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.location}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div><span className="text-muted-foreground">Size:</span> {item.width}x{item.height}mm</div>
                          <div><span className="text-muted-foreground">Material:</span> {item.material}</div>
                          <div><span className="text-muted-foreground">Glass:</span> {item.glassType}</div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-lg font-bold">₹{(item.rate || 0).toLocaleString()}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Quote Summary */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-semibold mb-4">Customer Info</h3>
            <div className="space-y-3">
              <div>
                <Label>Customer Name</Label>
                <Input placeholder="Enter name" value={quoteCustomerInfo.name} onChange={e => setQuoteCustomerInfo({ ...quoteCustomerInfo, name: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="Enter phone" value={quoteCustomerInfo.phone} onChange={e => setQuoteCustomerInfo({ ...quoteCustomerInfo, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="Enter email" value={quoteCustomerInfo.email} onChange={e => setQuoteCustomerInfo({ ...quoteCustomerInfo, email: e.target.value })} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="font-semibold mb-4">Quote Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{quoteBuilderItems.reduce((sum, i) => sum + (i.rate || 0), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>₹{(quoteBuilderItems.reduce((sum, i) => sum + (i.rate || 0), 0) * 0.18).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{(quoteBuilderItems.reduce((sum, i) => sum + (i.rate || 0), 0) * 1.18).toLocaleString()}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )

  // =========================================
  // RENDER MEE AI TAB
  // =========================================
  const renderMeeAI = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            MEE AI Assistant
          </h2>
          <p className="text-muted-foreground">AI-powered assistance for your doors & windows business</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chat Interface */}
        <GlassCard className="col-span-2 p-4 h-[600px] flex flex-col">
          <h3 className="font-semibold mb-4">Chat with MEE AI</h3>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {aiChatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 mx-auto text-purple-200 mb-4" />
                  <p className="text-muted-foreground">Start a conversation with MEE AI</p>
                  <p className="text-xs text-muted-foreground mt-2">Ask about pricing, materials, specifications, or get help with quotes</p>
                </div>
              ) : (
                aiChatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-100'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Ask MEE AI anything..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !aiLoading && aiInput.trim() && setAiChatMessages([...aiChatMessages, { role: 'user', content: aiInput }])}
            />
            <Button disabled={aiLoading || !aiInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Suggest Materials', icon: Layers },
                { label: 'Calculate Pricing', icon: DollarSign },
                { label: 'Generate Quote Text', icon: FileText },
                { label: 'Estimate Lead Time', icon: Clock },
                { label: 'Analyze Survey', icon: Ruler }
              ].map((action, i) => (
                <Button key={i} variant="outline" className="w-full justify-start">
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="font-semibold mb-4">Recent Insights</h3>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-800">Price Alert</p>
                <p className="text-xs text-amber-600 mt-1">Aluminium prices up 5% this month</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Trending</p>
                <p className="text-xs text-blue-600 mt-1">Tilt & Turn windows seeing 30% more demand</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )

  // =========================================
  // RENDER REMAINING TABS (simplified)
  // =========================================
  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sales Orders</h2>
      </div>
      <GlassCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>₹{(order.grandTotal || 0).toLocaleString()}</TableCell>
                <TableCell><Badge className={getStatusColor(order.status)}>{order.status}</Badge></TableCell>
                <TableCell>{new Date(order.orderDate || order.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  )

  const renderProduction = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Production</h2>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Cutting', 'Machining', 'Assembly', 'Glazing', 'QC', 'Packing', 'Ready'].map((stage) => {
          const count = workOrders.filter(w => w.currentStage === stage.toLowerCase()).length
          return (
            <Card key={stage} className={count > 0 ? 'border-blue-200 bg-blue-50' : ''}>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{stage}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <GlassCard className="p-4 text-center">
        <Factory className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <p className="text-muted-foreground">Production tracking coming soon</p>
      </GlassCard>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4">Module Configuration</h3>
        <p className="text-muted-foreground">Configure your Doors & Windows module settings here.</p>
      </GlassCard>
    </div>
  )

  // =========================================
  // NEW SURVEY DIALOG - SUPER ADVANCED
  // =========================================
  const renderNewSurveyDialog = () => (
    <Dialog open={showNewSurvey} onOpenChange={setShowNewSurvey}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-600" />
            New Site Survey
            <Badge className="ml-2">Step {surveyFormStep} of 4</Badge>
          </DialogTitle>
          <DialogDescription>
            Site measurement and survey is the first and most important step. Capture all details accurately.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {['Site Info', 'Contact & Surveyor', 'Scope Details', 'Review'].map((step, i) => (
            <div key={i} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                surveyFormStep > i + 1 ? 'bg-green-500 text-white' :
                surveyFormStep === i + 1 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {surveyFormStep > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`ml-2 text-sm ${surveyFormStep === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>{step}</span>
              {i < 3 && <div className="w-12 h-0.5 bg-slate-200 mx-3" />}
            </div>
          ))}
        </div>

        {/* Step 1: Site Info */}
        {surveyFormStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-red-600">Site Name *</Label>
                <Input
                  placeholder="e.g., Sharma Residence, ABC Office"
                  value={formData.siteName || ''}
                  onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                />
              </div>
              <div>
                <Label>Building Type *</Label>
                <Select value={formData.buildingType || ''} onValueChange={v => setFormData({ ...formData, buildingType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Site Address *</Label>
              <Textarea
                placeholder="Full site address with landmarks"
                value={formData.siteAddress || ''}
                onChange={e => setFormData({ ...formData, siteAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Number of Floors</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={formData.floors || ''}
                  onChange={e => setFormData({ ...formData, floors: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Pin Code</Label>
                <Input
                  placeholder="e.g., 400001"
                  value={formData.pinCode || ''}
                  onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  placeholder="City name"
                  value={formData.city || ''}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact & Surveyor Info */}
        {surveyFormStep === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                <User className="h-4 w-4" /> Surveyor Information (Mandatory)
              </h4>
              <p className="text-sm text-blue-600 mt-1">The person conducting the site survey must be recorded.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-red-600">Site Survey Done By (Person Name) *</Label>
                <Input
                  placeholder="Full name of surveyor"
                  value={formData.surveyorName || ''}
                  onChange={e => setFormData({ ...formData, surveyorName: e.target.value })}
                  className="border-2 border-blue-300"
                />
              </div>
              <div>
                <Label>Surveyor Contact</Label>
                <Input
                  placeholder="Phone number"
                  value={formData.surveyorPhone || ''}
                  onChange={e => setFormData({ ...formData, surveyorPhone: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <h4 className="font-semibold">Site Contact Person</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Person Name</Label>
                <Input
                  placeholder="Name of person at site"
                  value={formData.contactPerson || ''}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={formData.contactPhone || ''}
                  onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Email</Label>
                <Input
                  placeholder="Email address"
                  value={formData.contactEmail || ''}
                  onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label>Survey Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.surveyDate || ''}
                  onChange={e => setFormData({ ...formData, surveyDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Scope Details */}
        {surveyFormStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Scope Summary</Label>
              <Textarea
                placeholder="Brief description of work scope (e.g., All windows for 3BHK flat, Entrance door replacement)"
                rows={3}
                value={formData.scopeSummary || ''}
                onChange={e => setFormData({ ...formData, scopeSummary: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Estimated Openings</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.estimatedOpenings || ''}
                  onChange={e => setFormData({ ...formData, estimatedOpenings: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority || ''} onValueChange={v => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURVEY_PRIORITY.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Material</Label>
                <Select value={formData.expectedMaterial || ''} onValueChange={v => setFormData({ ...formData, expectedMaterial: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_FAMILIES.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Special Requirements / Notes</Label>
              <Textarea
                placeholder="Any special requirements, existing conditions, access constraints, etc."
                rows={3}
                value={formData.specialNotes || ''}
                onChange={e => setFormData({ ...formData, specialNotes: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {surveyFormStep === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Review Survey Details
              </h4>
              <p className="text-sm text-green-600">Please verify all information before creating the survey.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h5 className="font-semibold border-b pb-2">Site Information</h5>
                <div className="text-sm"><span className="text-muted-foreground">Site Name:</span> {formData.siteName || 'Not provided'}</div>
                <div className="text-sm"><span className="text-muted-foreground">Building Type:</span> {formData.buildingType || 'Not provided'}</div>
                <div className="text-sm"><span className="text-muted-foreground">Address:</span> {formData.siteAddress || 'Not provided'}</div>
                <div className="text-sm"><span className="text-muted-foreground">Floors:</span> {formData.floors || 1}</div>
              </div>
              <div className="space-y-3">
                <h5 className="font-semibold border-b pb-2">Contact & Surveyor</h5>
                <div className="text-sm font-medium text-blue-600">
                  <span className="text-muted-foreground">Survey Done By:</span> {formData.surveyorName || 'Not provided'}
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Site Contact:</span> {formData.contactPerson || 'Not provided'}</div>
                <div className="text-sm"><span className="text-muted-foreground">Phone:</span> {formData.contactPhone || 'Not provided'}</div>
                <div className="text-sm"><span className="text-muted-foreground">Survey Date:</span> {formData.surveyDate ? new Date(formData.surveyDate).toLocaleString() : 'Not set'}</div>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold border-b pb-2">Scope</h5>
              <div className="text-sm"><span className="text-muted-foreground">Summary:</span> {formData.scopeSummary || 'Not provided'}</div>
              <div className="text-sm"><span className="text-muted-foreground">Est. Openings:</span> {formData.estimatedOpenings || 0}</div>
              <div className="text-sm"><span className="text-muted-foreground">Priority:</span> {formData.priority || 'Normal'}</div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          {surveyFormStep > 1 && (
            <Button variant="outline" onClick={() => setSurveyFormStep(s => s - 1)}>
              Back
            </Button>
          )}
          {surveyFormStep < 4 ? (
            <Button onClick={() => setSurveyFormStep(s => s + 1)} disabled={
              (surveyFormStep === 1 && (!formData.siteName || !formData.buildingType || !formData.siteAddress)) ||
              (surveyFormStep === 2 && !formData.surveyorName)
            }>
              Next
            </Button>
          ) : (
            <Button onClick={createSurvey}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Create Survey
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // =========================================
  // NEW PROJECT DIALOG
  // =========================================
  const renderNewProjectDialog = () => (
    <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>Add a new doors & windows project</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Project Name *</Label>
              <Input
                placeholder="e.g., Sharma Villa Windows"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Client Name</Label>
              <Input
                placeholder="Client name"
                value={formData.clientName || ''}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client Phone</Label>
              <Input
                placeholder="Phone"
                value={formData.clientPhone || ''}
                onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>Estimated Value</Label>
              <Input
                type="number"
                placeholder="₹"
                value={formData.value || ''}
                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <Label>Site Address</Label>
            <Textarea
              placeholder="Full site address"
              value={formData.siteAddress || ''}
              onChange={e => setFormData({ ...formData, siteAddress: e.target.value })}
            />
          </div>
          <div>
            <Label>Building Type</Label>
            <Select value={formData.buildingType || ''} onValueChange={v => setFormData({ ...formData, buildingType: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
          <Button onClick={createProject} disabled={!formData.name}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // =========================================
  // MAIN RENDER
  // =========================================
  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center justify-between border-b">
          {!sidebarCollapsed && <h3 className="font-semibold text-sm text-muted-foreground">DOORS & WINDOWS</h3>}
          <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <PanelLeftClose className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {Object.entries(navGroups).map(([groupId, groupLabel]) => {
              const groupItems = navItems.filter(item => item.group === groupId)
              if (groupItems.length === 0) return null

              return (
                <div key={groupId}>
                  {groupLabel && !sidebarCollapsed && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 pt-4 pb-2">{groupLabel}</p>
                  )}
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeTab === item.id 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : item.badge
                          ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 text-blue-600 hover:from-blue-100 hover:to-indigo-100'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge === 'new' && <Sparkles className="h-3 w-3 text-amber-500" />}
                          {item.badge === 'first' && <Badge className="text-[10px] bg-amber-100 text-amber-700">1st</Badge>}
                          {item.badge === 'sync' && <Link2 className="h-3 w-3 text-green-500" />}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
        
        {/* Quick Stats in Sidebar */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t bg-slate-50">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">QUICK STATS</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Surveys</span>
                <span className="font-medium">{surveys.filter(s => s.status === 'pending').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Quotes</span>
                <span className="font-medium">{quotations.filter(q => q.status === 'sent').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Orders</span>
                <span className="font-medium">{orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'projects' && renderProjects()}
              {activeTab === 'surveys' && renderSurveys()}
              {activeTab === 'quotations' && renderQuotations()}
              {activeTab === 'quote-builder' && renderQuoteBuilder()}
              {activeTab === 'orders' && renderOrders()}
              {activeTab === 'production' && renderProduction()}
              {activeTab === 'mee-ai' && renderMeeAI()}
              {activeTab === 'settings' && renderSettings()}
              {/* Other tabs render placeholder */}
              {!['dashboard', 'projects', 'surveys', 'quotations', 'quote-builder', 'orders', 'production', 'mee-ai', 'settings'].includes(activeTab) && (
                <GlassCard className="p-8 text-center">
                  <Package className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="font-semibold text-lg">{navItems.find(n => n.id === activeTab)?.label || activeTab}</h3>
                  <p className="text-muted-foreground mt-2">This section is coming soon.</p>
                </GlassCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dialogs */}
      {renderNewSurveyDialog()}
      {renderNewProjectDialog()}
    </div>
  )
}
