'use client'

import { useState, useEffect } from 'react'
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
import {
  LayoutDashboard, Package, ClipboardList, FileText, ShoppingCart, Factory,
  Truck, Wrench, Shield, Bell, BarChart3, Settings, Plus, Search, Filter,
  RefreshCw, Download, Upload, Eye, Edit, Trash2, ChevronRight, ChevronDown,
  ArrowRight, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock,
  AlertTriangle, Calendar, MapPin, Phone, Mail, User, Building2, Ruler,
  Layers, Grid3X3, Box, Palette, Cog, Hammer, Glasses, DoorOpen, Maximize2,
  MoreHorizontal, Send, FileCheck, Loader2, TrendingUp, TrendingDown,
  Brain, MessageSquare, Sparkles, Zap, Save, Printer, FolderKanban
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// SVG Window/Door Drawing Component - Dynamic Technical Drawing
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

  // Scale factor to fit in container
  const padding = 50
  const drawableWidth = width - padding * 2
  const drawableHeight = height - padding * 2
  const scale = Math.min(drawableWidth / itemWidth, drawableHeight / itemHeight)
  
  const scaledWidth = itemWidth * scale
  const scaledHeight = itemHeight * scale
  const scaledFrame = Math.max(frameThickness * scale, 4)
  
  const startX = (width - scaledWidth) / 2
  const startY = (height - scaledHeight) / 2

  // Colors based on profile
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

  // Generate panel data if not provided
  const panelData = panels.length > 0 ? panels : [{ type: 'openable', openingDirection: 'left' }]
  const numPanels = panelData.length
  const innerWidth = scaledWidth - scaledFrame * 2
  const innerHeight = scaledHeight - scaledFrame * 2
  const panelWidth = innerWidth / numPanels

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 rounded-lg border">
      {/* Background grid for technical look */}
      <defs>
        <pattern id="dwGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9ecef" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dwGrid)" />

      {/* Outer Frame */}
      <rect
        x={startX}
        y={startY}
        width={scaledWidth}
        height={scaledHeight}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="2"
        rx="2"
      />

      {/* Inner Frame (Glass Area) */}
      <rect
        x={startX + scaledFrame}
        y={startY + scaledFrame}
        width={innerWidth}
        height={innerHeight}
        fill={glassColor}
        stroke={glassBorder}
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Panels / Sashes */}
      {panelData.map((panel, idx) => {
        const panelX = startX + scaledFrame + (panelWidth * idx)
        const panelY = startY + scaledFrame
        const isFixed = panel.type === 'fixed' || panel.type === 'Fixed'
        const openDir = panel.openingDirection || panel.direction || 'left'

        return (
          <g key={idx}>
            {/* Panel border */}
            <rect
              x={panelX + 2}
              y={panelY + 2}
              width={panelWidth - 4}
              height={innerHeight - 4}
              fill="transparent"
              stroke={colors.stroke}
              strokeWidth="1.5"
            />

            {/* Glass panel */}
            <rect
              x={panelX + 8}
              y={panelY + 8}
              width={panelWidth - 16}
              height={innerHeight - 16}
              fill={glassColor}
              stroke={glassBorder}
              strokeWidth="1"
              opacity="0.4"
            />

            {/* Fixed indicator (cross pattern) */}
            {isFixed && (
              <g stroke="#6c757d" strokeWidth="1" opacity="0.5">
                <line
                  x1={panelX + 8}
                  y1={panelY + 8}
                  x2={panelX + panelWidth - 8}
                  y2={panelY + innerHeight - 8}
                />
                <line
                  x1={panelX + panelWidth - 8}
                  y1={panelY + 8}
                  x2={panelX + 8}
                  y2={panelY + innerHeight - 8}
                />
              </g>
            )}

            {/* Opening indicator (triangle) for openable panels */}
            {!isFixed && (
              <g>
                {openDir === 'left' || openDir === 'Left' ? (
                  <polygon
                    points={`
                      ${panelX + panelWidth - 10},${panelY + 15}
                      ${panelX + 15},${panelY + innerHeight / 2}
                      ${panelX + panelWidth - 10},${panelY + innerHeight - 15}
                    `}
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="1.5"
                    strokeDasharray="4,2"
                  />
                ) : (
                  <polygon
                    points={`
                      ${panelX + 10},${panelY + 15}
                      ${panelX + panelWidth - 15},${panelY + innerHeight / 2}
                      ${panelX + 10},${panelY + innerHeight - 15}
                    `}
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="1.5"
                    strokeDasharray="4,2"
                  />
                )}

                {/* Handle indicator */}
                <circle
                  cx={openDir === 'left' || openDir === 'Left' ? panelX + panelWidth - 18 : panelX + 18}
                  cy={panelY + innerHeight / 2}
                  r="4"
                  fill="#495057"
                />
              </g>
            )}

            {/* Panel label */}
            <text
              x={panelX + panelWidth / 2}
              y={panelY + innerHeight + 18}
              textAnchor="middle"
              fontSize="9"
              fill="#6c757d"
              fontFamily="sans-serif"
            >
              {isFixed ? 'FIXED' : openDir === 'left' || openDir === 'Left' ? 'RDout' : 'LDout'}
            </text>
          </g>
        )
      })}

      {/* Dimension lines */}
      {showDimensions && (
        <g>
          {/* Width dimension - bottom */}
          <line
            x1={startX}
            y1={startY + scaledHeight + 22}
            x2={startX + scaledWidth}
            y2={startY + scaledHeight + 22}
            stroke="#495057"
            strokeWidth="1"
          />
          <line x1={startX} y1={startY + scaledHeight + 17} x2={startX} y2={startY + scaledHeight + 27} stroke="#495057" strokeWidth="1" />
          <line x1={startX + scaledWidth} y1={startY + scaledHeight + 17} x2={startX + scaledWidth} y2={startY + scaledHeight + 27} stroke="#495057" strokeWidth="1" />
          <text
            x={startX + scaledWidth / 2}
            y={startY + scaledHeight + 36}
            textAnchor="middle"
            fontSize="10"
            fill="#212529"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            {itemWidth}w
          </text>

          {/* Height dimension - right */}
          <line
            x1={startX + scaledWidth + 22}
            y1={startY}
            x2={startX + scaledWidth + 22}
            y2={startY + scaledHeight}
            stroke="#495057"
            strokeWidth="1"
          />
          <line x1={startX + scaledWidth + 17} y1={startY} x2={startX + scaledWidth + 27} y2={startY} stroke="#495057" strokeWidth="1" />
          <line x1={startX + scaledWidth + 17} y1={startY + scaledHeight} x2={startX + scaledWidth + 27} y2={startY + scaledHeight} stroke="#495057" strokeWidth="1" />
          <text
            x={startX + scaledWidth + 36}
            y={startY + scaledHeight / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#212529"
            fontWeight="600"
            fontFamily="sans-serif"
            transform={`rotate(90, ${startX + scaledWidth + 36}, ${startY + scaledHeight / 2})`}
          >
            {itemHeight}h
          </text>

          {/* Area text */}
          <text
            x={startX + scaledWidth / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize="9"
            fill="#6c757d"
            fontFamily="sans-serif"
          >
            ({((itemWidth / 304.8) * (itemHeight / 304.8)).toFixed(2)} sqft)
          </text>
        </g>
      )}

      {/* View direction label */}
      <text
        x={8}
        y={height - 5}
        fontSize="8"
        fill="#adb5bd"
        fontFamily="sans-serif"
      >
        View: {viewDirection}
      </text>
    </svg>
  )
}

// Product categories and types
const PRODUCT_FAMILIES = ['Aluminium', 'uPVC', 'Wood', 'Steel']
const CATEGORIES = ['Sliding', 'Casement', 'Tilt & Turn', 'Fixed', 'Folding', 'French', 'Lift & Slide', 'Partition', 'Curtain Wall', 'Skylight']
const PRODUCT_TYPES = ['Window', 'Door']
const GLASS_TYPES = ['Single', 'Double/DGU', 'Laminated', 'Tinted', 'Low-E', 'Acoustic']
const HARDWARE_TYPES = ['Handle', 'Rollers', 'Hinges', 'Espagnolette', 'Lock', 'Stopper', 'Track', 'Friction Stay']
const FINISHES = ['Anodized', 'Powder Coat', 'Wood Finish', 'Laminate', 'Natural']

export function DoorsWindowsModule({ client, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
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
  const [automationRules, setAutomationRules] = useState([])
  
  // Dialog states
  const [showNewSurvey, setShowNewSurvey] = useState(false)
  const [showNewQuote, setShowNewQuote] = useState(false)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [showCatalogItem, setShowCatalogItem] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({})
  const [openings, setOpenings] = useState([])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Fetch all data
  useEffect(() => {
    fetchAllData()
  }, [refreshKey])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [dashboardRes, surveysRes, quotesRes, ordersRes, workOrdersRes, dispatchesRes, installsRes, ticketsRes, warrantiesRes, catalogRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers }),
        fetch(`${API_BASE}/surveys`, { headers }),
        fetch(`${API_BASE}/quotations`, { headers }),
        fetch(`${API_BASE}/orders`, { headers }),
        fetch(`${API_BASE}/production`, { headers }),
        fetch(`${API_BASE}/dispatch`, { headers }),
        fetch(`${API_BASE}/installation`, { headers }),
        fetch(`${API_BASE}/service`, { headers }),
        fetch(`${API_BASE}/warranty`, { headers }),
        fetch(`${API_BASE}/catalog?type=system`, { headers })
      ])

      const [dashboardData, surveysData, quotesData, ordersData, workOrdersData, dispatchesData, installsData, ticketsData, warrantiesData, catalogData] = await Promise.all([
        dashboardRes.json(),
        surveysRes.json(),
        quotesRes.json(),
        ordersRes.json(),
        workOrdersRes.json(),
        dispatchesRes.json(),
        installsRes.json(),
        ticketsRes.json(),
        warrantiesRes.json(),
        catalogRes.json()
      ])

      if (dashboardData.dashboard) setDashboard(dashboardData.dashboard)
      if (surveysData.surveys) setSurveys(surveysData.surveys)
      if (quotesData.quotations) setQuotations(quotesData.quotations)
      if (ordersData.orders) setOrders(ordersData.orders)
      if (workOrdersData.workOrders) setWorkOrders(workOrdersData.workOrders)
      if (dispatchesData.dispatches) setDispatches(dispatchesData.dispatches)
      if (installsData.installations) setInstallations(installsData.installations)
      if (ticketsData.tickets) setServiceTickets(ticketsData.tickets)
      if (warrantiesData.warranties) setWarranties(warrantiesData.warranties)
      if (catalogData.items) setCatalog(catalogData.items)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load module data')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => setRefreshKey(k => k + 1)

  // Create Survey
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
        refresh()
      } else {
        toast.error(data.error || 'Failed to create survey')
      }
    } catch (error) {
      toast.error('Failed to create survey')
    }
  }

  // Create Quotation
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

  // Convert Quote to Order
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

  // Create Service Ticket
  const createServiceTicket = async () => {
    try {
      const res = await fetch(`${API_BASE}/service`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Service ticket created')
        setShowNewTicket(false)
        setFormData({})
        refresh()
      } else {
        toast.error(data.error || 'Failed to create ticket')
      }
    } catch (error) {
      toast.error('Failed to create ticket')
    }
  }

  // Status badge colors
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'draft': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'sent': 'bg-purple-100 text-purple-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'open': 'bg-orange-100 text-orange-800',
      'resolved': 'bg-green-100 text-green-800',
      'active': 'bg-green-100 text-green-800',
      'expired': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading module...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">MODULE NAVIGATION</h3>
          <nav className="space-y-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'surveys', icon: ClipboardList, label: 'Surveys & Measurements' },
              { id: 'quotations', icon: FileText, label: 'Quotations' },
              { id: 'orders', icon: ShoppingCart, label: 'Sales Orders' },
              { id: 'production', icon: Factory, label: 'Production' },
              { id: 'dispatch', icon: Truck, label: 'Dispatch' },
              { id: 'installation', icon: Wrench, label: 'Installation' },
              { id: 'service', icon: Hammer, label: 'Service Tickets' },
              { id: 'warranty', icon: Shield, label: 'Warranty & AMC' },
              { id: 'catalog', icon: Package, label: 'Product Catalog' },
              { id: 'reports', icon: BarChart3, label: 'Reports' },
              { id: 'automation', icon: Bell, label: 'Automation' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-auto p-4 border-t bg-slate-50">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">QUICK STATS</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open Surveys</span>
              <span className="font-medium">{surveys.filter(s => s.status === 'pending').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Quotes</span>
              <span className="font-medium">{quotations.filter(q => q.status === 'draft' || q.status === 'sent').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Orders</span>
              <span className="font-medium">{orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open Tickets</span>
              <span className="font-medium">{serviceTickets.filter(t => t.status === 'open').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Doors & Windows Dashboard</h2>
                  <p className="text-muted-foreground">Overview of your manufacturing & fabrication operations</p>
                </div>
                <Button onClick={refresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: `₹${((dashboard?.overview?.totalRevenue || 0) / 100000).toFixed(1)}L`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Active Orders', value: dashboard?.overview?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'In Production', value: dashboard?.overview?.activeProduction || 0, icon: Factory, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Open Tickets', value: dashboard?.overview?.openTickets || 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' }
                ].map((metric, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{metric.label}</p>
                          <p className="text-2xl font-bold">{metric.value}</p>
                        </div>
                        <div className={`h-12 w-12 rounded-lg ${metric.bg} flex items-center justify-center`}>
                          <metric.icon className={`h-6 w-6 ${metric.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Openings Pipeline</CardTitle>
                  <CardDescription>Track openings from survey to installation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {[
                      { stage: 'Surveyed', count: dashboard?.pipeline?.surveyed || 0, color: 'bg-blue-500' },
                      { stage: 'Quoted', count: dashboard?.pipeline?.quoted || 0, color: 'bg-purple-500' },
                      { stage: 'Ordered', count: dashboard?.pipeline?.ordered || 0, color: 'bg-indigo-500' },
                      { stage: 'In Production', count: dashboard?.pipeline?.inProduction || 0, color: 'bg-orange-500' },
                      { stage: 'Dispatched', count: dashboard?.pipeline?.dispatched || 0, color: 'bg-cyan-500' },
                      { stage: 'Installed', count: dashboard?.pipeline?.installed || 0, color: 'bg-green-500' }
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
                </CardContent>
              </Card>

              {/* Production Load & Dispatch Schedule */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Production Load</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(dashboard?.productionLoad || {}).map(([stage, count]) => (
                      <div key={stage} className="flex items-center gap-3">
                        <div className="w-24 text-sm capitalize">{stage}</div>
                        <div className="flex-1">
                          <Progress value={count * 10} className="h-2" />
                        </div>
                        <div className="w-8 text-right text-sm font-medium">{count}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming Dispatches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(dashboard?.dispatchSchedule || []).slice(0, 5).map((dispatch, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{dispatch.customerName}</p>
                            <p className="text-xs text-muted-foreground">{dispatch.orderNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{new Date(dispatch.scheduledDate).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">{dispatch.items} items</p>
                          </div>
                        </div>
                      ))}
                      {(!dashboard?.dispatchSchedule || dashboard.dispatchSchedule.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No upcoming dispatches</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Surveys Tab */}
          {activeTab === 'surveys' && (
            <motion.div
              key="surveys"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Site Surveys</h2>
                  <p className="text-muted-foreground">Manage site measurements and opening schedules</p>
                </div>
                <Button onClick={() => { setFormData({}); setShowNewSurvey(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Survey
                </Button>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Survey #</TableHead>
                      <TableHead>Site Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Openings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">{survey.surveyNumber}</TableCell>
                        <TableCell>{survey.siteName || survey.siteAddress}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{survey.contactPerson}</p>
                            <p className="text-xs text-muted-foreground">{survey.contactPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{survey.openingsCount || 0}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(survey.status)}>{survey.status}</Badge>
                          {survey.remeasureRequired && (
                            <Badge variant="destructive" className="ml-1">Re-measure</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(survey.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {surveys.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No surveys found. Create your first survey to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Quotations Tab */}
          {activeTab === 'quotations' && (
            <motion.div
              key="quotations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Quotations</h2>
                  <p className="text-muted-foreground">Manage quotes and pricing</p>
                </div>
                <Button onClick={() => { setFormData({}); setShowNewQuote(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Quotation
                </Button>
              </div>

              {/* Quote Stats */}
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

              <Card>
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
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {quote.status === 'approved' && (
                              <Button variant="ghost" size="sm" onClick={() => convertToOrder(quote.id)}>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {quotations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No quotations found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Sales Orders</h2>
                  <p className="text-muted-foreground">Manage confirmed orders and payments</p>
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{order.customerName}</p>
                            <p className="text-xs text-muted-foreground">{order.siteAddress}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">₹{(order.grandTotal || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-orange-600">₹{(order.balanceAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(order.orderDate || order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders found. Convert an approved quotation to create an order.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Production Tab */}
          {activeTab === 'production' && (
            <motion.div
              key="production"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Production</h2>
                  <p className="text-muted-foreground">Track work orders and manufacturing progress</p>
                </div>
              </div>

              {/* Production Stages */}
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

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Order #</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium">{wo.workOrderNumber}</TableCell>
                        <TableCell>{wo.orderNumber}</TableCell>
                        <TableCell>{wo.customerName}</TableCell>
                        <TableCell>{wo.itemsCount || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{wo.currentStage}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(wo.status)}>{wo.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {workOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No work orders in production.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Service Tab */}
          {activeTab === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Service Tickets</h2>
                  <p className="text-muted-foreground">Manage service requests and support</p>
                </div>
                <Button onClick={() => { setFormData({}); setShowNewTicket(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Warranty</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{ticket.customerName}</p>
                            <p className="text-xs text-muted-foreground">{ticket.customerPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{ticket.category}</TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'critical' ? 'destructive' : ticket.priority === 'high' ? 'default' : 'secondary'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.isWarranty ? (
                            <Badge className="bg-green-100 text-green-800">Under Warranty</Badge>
                          ) : (
                            <Badge variant="outline">Chargeable</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {serviceTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No service tickets found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Warranty Tab */}
          {activeTab === 'warranty' && (
            <motion.div
              key="warranty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Warranty & AMC</h2>
                  <p className="text-muted-foreground">Track warranties and maintenance contracts</p>
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warranty #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Claims</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warranties.map((warranty) => (
                      <TableRow key={warranty.id}>
                        <TableCell className="font-medium">{warranty.warrantyNumber}</TableCell>
                        <TableCell>{warranty.customerName}</TableCell>
                        <TableCell className="capitalize">{warranty.warrantyType}</TableCell>
                        <TableCell>{warranty.itemsCovered || 0}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(warranty.status)}>{warranty.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(warranty.expiresAt).toLocaleDateString()}</TableCell>
                        <TableCell>{warranty.claimsCount || 0}</TableCell>
                      </TableRow>
                    ))}
                    {warranties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No warranties registered.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Catalog Tab */}
          {activeTab === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Product Catalog</h2>
                  <p className="text-muted-foreground">Manage systems, profiles, glass, and hardware</p>
                </div>
                <Button onClick={() => { setFormData({}); setShowCatalogItem(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <Tabs defaultValue="systems">
                <TabsList>
                  <TabsTrigger value="systems">Systems</TabsTrigger>
                  <TabsTrigger value="glass">Glass</TabsTrigger>
                  <TabsTrigger value="hardware">Hardware</TabsTrigger>
                  <TabsTrigger value="accessories">Accessories</TabsTrigger>
                </TabsList>
                <TabsContent value="systems">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price/Sqft</TableHead>
                          <TableHead>Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catalog.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.sku}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="capitalize">{item.category}</TableCell>
                            <TableCell className="capitalize">{item.subCategory}</TableCell>
                            <TableCell>₹{item.pricePerSqft || item.sellingPrice}</TableCell>
                            <TableCell>{item.quantity} {item.uom}</TableCell>
                          </TableRow>
                        ))}
                        {catalog.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No catalog items. Add your first product system.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* Dispatch Tab */}
          {activeTab === 'dispatch' && (
            <motion.div
              key="dispatch"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <h2 className="text-2xl font-bold">Dispatch Management</h2>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch #</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatches.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.dispatchNumber}</TableCell>
                        <TableCell>{d.orderNumber}</TableCell>
                        <TableCell>{d.customerName}</TableCell>
                        <TableCell>{d.totalItems}</TableCell>
                        <TableCell>{d.vehicleNumber || '-'}</TableCell>
                        <TableCell>{new Date(d.scheduledDate).toLocaleDateString()}</TableCell>
                        <TableCell><Badge className={getStatusColor(d.status)}>{d.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {dispatches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No dispatches scheduled.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Installation Tab */}
          {activeTab === 'installation' && (
            <motion.div
              key="installation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <h2 className="text-2xl font-bold">Installation Management</h2>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Installation #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Openings</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installations.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell className="font-medium">{inst.installationNumber}</TableCell>
                        <TableCell>{inst.customerName}</TableCell>
                        <TableCell>{inst.siteAddress}</TableCell>
                        <TableCell>{inst.completedOpenings || 0} / {inst.totalOpenings}</TableCell>
                        <TableCell>{inst.leadInstaller || '-'}</TableCell>
                        <TableCell>{new Date(inst.scheduledDate).toLocaleDateString()}</TableCell>
                        <TableCell><Badge className={getStatusColor(inst.status)}>{inst.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {installations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No installations scheduled.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <h2 className="text-2xl font-bold">Reports</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'Sales Funnel', type: 'sales-funnel', icon: TrendingUp },
                  { name: 'Quotation Analysis', type: 'quotation-analysis', icon: FileText },
                  { name: 'Production Efficiency', type: 'production-efficiency', icon: Factory },
                  { name: 'Dispatch Performance', type: 'dispatch-performance', icon: Truck },
                  { name: 'Installation Performance', type: 'installation-performance', icon: Wrench },
                  { name: 'Service SLA', type: 'service-sla', icon: Hammer },
                  { name: 'Project Profitability', type: 'project-profitability', icon: BarChart3 },
                  { name: 'Inventory Analysis', type: 'inventory-analysis', icon: Package }
                ].map((report) => (
                  <Card key={report.type} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <report.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">Generate report</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <motion.div
              key="automation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Automation Rules</h2>
                  <p className="text-muted-foreground">Set up automated notifications and actions</p>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Rule
                </Button>
              </div>
              
              <div className="grid gap-4">
                {[
                  { name: 'Survey Completed', trigger: 'survey-completed', description: 'Send WhatsApp to sales when survey is done', active: true },
                  { name: 'Quote Follow-up', trigger: 'quote-sent', description: 'Follow up after 24 hours if not viewed', active: true },
                  { name: 'Payment Reminder', trigger: 'payment-due', description: 'Send reminder 3 days before due date', active: false },
                  { name: 'Dispatch Alert', trigger: 'dispatch-scheduled', description: 'Notify customer of delivery date', active: true },
                  { name: 'Installation Complete', trigger: 'installation-completed', description: 'Send feedback form to customer', active: true }
                ].map((rule, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${rule.active ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <Bell className={`h-5 w-5 ${rule.active ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                      <Switch checked={rule.active} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Survey Dialog */}
      <Dialog open={showNewSurvey} onOpenChange={setShowNewSurvey}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Survey</DialogTitle>
            <DialogDescription>Enter site details for measurement survey</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site Name</Label>
                <Input 
                  value={formData.siteName || ''} 
                  onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                  placeholder="Project/Site name"
                />
              </div>
              <div className="space-y-2">
                <Label>Building Type</Label>
                <Select value={formData.buildingType || ''} onValueChange={(v) => setFormData({...formData, buildingType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Site Address</Label>
              <Textarea 
                value={formData.siteAddress || ''} 
                onChange={(e) => setFormData({...formData, siteAddress: e.target.value})}
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input 
                  value={formData.contactPerson || ''} 
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                  placeholder="Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input 
                  value={formData.contactPhone || ''} 
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Scope Summary</Label>
              <Textarea 
                value={formData.scopeSummary || ''} 
                onChange={(e) => setFormData({...formData, scopeSummary: e.target.value})}
                placeholder="Brief description of work scope"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSurvey(false)}>Cancel</Button>
            <Button onClick={createSurvey}>Create Survey</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Quotation Dialog */}
      <Dialog open={showNewQuote} onOpenChange={setShowNewQuote}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Quotation</DialogTitle>
            <DialogDescription>Create a quotation for doors & windows</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input 
                  value={formData.customerName || ''} 
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.customerPhone || ''} 
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.customerEmail || ''} 
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Site Address</Label>
              <Textarea 
                value={formData.siteAddress || ''} 
                onChange={(e) => setFormData({...formData, siteAddress: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Price List</Label>
              <Select value={formData.priceList || 'retail'} onValueChange={(v) => setFormData({...formData, priceList: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewQuote(false)}>Cancel</Button>
            <Button onClick={createQuotation}>Create Quotation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Service Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Service Ticket</DialogTitle>
            <DialogDescription>Log a new service request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input 
                  value={formData.customerName || ''} 
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.customerPhone || ''} 
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || ''} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alignment">Alignment Issue</SelectItem>
                    <SelectItem value="leakage">Leakage</SelectItem>
                    <SelectItem value="roller">Roller Problem</SelectItem>
                    <SelectItem value="handle-lock">Handle/Lock Issue</SelectItem>
                    <SelectItem value="glass-crack">Glass Crack</SelectItem>
                    <SelectItem value="seal-failure">Seal Failure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority || 'medium'} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Site Address</Label>
              <Textarea 
                value={formData.siteAddress || ''} 
                onChange={(e) => setFormData({...formData, siteAddress: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Description</Label>
              <Textarea 
                value={formData.description || ''} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the issue in detail"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
            <Button onClick={createServiceTicket}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
