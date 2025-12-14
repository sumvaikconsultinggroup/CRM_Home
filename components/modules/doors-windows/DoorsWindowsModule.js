'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  LayoutDashboard, Package, FileText, Wrench, Settings, Plus, Edit, Trash2, Eye, Search, 
  RefreshCw, Download, Upload, TrendingUp, DollarSign, CheckCircle2, Clock, Send,
  AlertTriangle, ChevronRight, MoreVertical, Printer, MapPin, Phone, Mail, Calendar, 
  Building2, Layers, Box, Truck, BarChart3, Target, Hammer, Cog, ClipboardList, 
  FileCheck, History, ExternalLink, X, ChevronDown, ArrowRight, Star, Sparkles, 
  Zap, Grid3X3, List, Kanban, Activity, Brain, MessageSquare, Wand2, ImagePlus, 
  Video, FileImage, RotateCcw, Maximize2, Users, PanelLeftClose, Home, Ruler, 
  SlidersHorizontal, Square, Columns, DoorOpen, DoorClosed, GripVertical, Move,
  ZoomIn, ZoomOut, RotateCw, Save, Copy, Palette
} from 'lucide-react'

// Glassmorphism Card Component
const GlassCard = ({ children, className = '', ...props }) => (
  <div 
    className={`backdrop-blur-md bg-white/70 border border-white/20 rounded-2xl shadow-xl ${className}`}
    {...props}
  >
    {children}
  </div>
)

// SVG Window/Door Drawing Component - Dynamic Technical Drawing
const WindowDoorDrawing = ({ config, width = 300, height = 300, showDimensions = true }) => {
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
  const padding = 60
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
    brown: { fill: '#6d4c41', stroke: '#4e342e' }
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 rounded-lg">
      {/* Background grid for technical look */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9ecef" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

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
        const isFixed = panel.type === 'fixed'
        const openDir = panel.openingDirection || 'left'

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
                {openDir === 'left' ? (
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
                  cx={openDir === 'left' ? panelX + panelWidth - 20 : panelX + 20}
                  cy={panelY + innerHeight / 2}
                  r="4"
                  fill="#495057"
                />
              </g>
            )}

            {/* Panel label */}
            <text
              x={panelX + panelWidth / 2}
              y={panelY + innerHeight + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#6c757d"
              fontFamily="sans-serif"
            >
              {isFixed ? 'FIXED' : openDir === 'left' ? 'RDout' : 'LDout'}
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
            y1={startY + scaledHeight + 25}
            x2={startX + scaledWidth}
            y2={startY + scaledHeight + 25}
            stroke="#495057"
            strokeWidth="1"
            markerStart="url(#arrowLeft)"
            markerEnd="url(#arrowRight)"
          />
          <text
            x={startX + scaledWidth / 2}
            y={startY + scaledHeight + 40}
            textAnchor="middle"
            fontSize="11"
            fill="#212529"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            {itemWidth}w
          </text>

          {/* Height dimension - right */}
          <line
            x1={startX + scaledWidth + 25}
            y1={startY}
            x2={startX + scaledWidth + 25}
            y2={startY + scaledHeight}
            stroke="#495057"
            strokeWidth="1"
          />
          <text
            x={startX + scaledWidth + 40}
            y={startY + scaledHeight / 2}
            textAnchor="middle"
            fontSize="11"
            fill="#212529"
            fontWeight="600"
            fontFamily="sans-serif"
            transform={`rotate(90, ${startX + scaledWidth + 40}, ${startY + scaledHeight / 2})`}
          >
            {itemHeight}h
          </text>

          {/* Area text */}
          <text
            x={startX + scaledWidth / 2}
            y={startY + scaledHeight + 55}
            textAnchor="middle"
            fontSize="10"
            fill="#6c757d"
            fontFamily="sans-serif"
          >
            ({((itemWidth / 304.8) * (itemHeight / 304.8)).toFixed(2)} sqft)
          </text>
        </g>
      )}

      {/* Arrow markers */}
      <defs>
        <marker id="arrowLeft" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6" fill="none" stroke="#495057" strokeWidth="1"/>
        </marker>
        <marker id="arrowRight" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="#495057" strokeWidth="1"/>
        </marker>
      </defs>

      {/* View direction label */}
      <text
        x={width / 2}
        y={height - 10}
        textAnchor="middle"
        fontSize="9"
        fill="#adb5bd"
        fontFamily="sans-serif"
      >
        Viewed from {viewDirection}
      </text>
    </svg>
  )
}

// Main Doors and Windows Module Component
export default function DoorsWindowsModule({ clientId, user }) {
  // Authentication
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Data states
  const [config, setConfig] = useState(null)
  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  const [hardware, setHardware] = useState([])
  const [requirements, setRequirements] = useState([])
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [installations, setInstallations] = useState([])
  const [mediaGallery, setMediaGallery] = useState([])

  // UI states
  const [loading, setLoading] = useState(true)
  const [seedStatus, setSeedStatus] = useState(null)

  // Quote Builder states
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [quoteBuilderOpen, setQuoteBuilderOpen] = useState(false)
  const [quoteLineItems, setQuoteLineItems] = useState([])
  const [quoteCustomer, setQuoteCustomer] = useState({})

  // Quote Builder states
  const [builderItems, setBuilderItems] = useState([
    {
      id: '1',
      productType: 'window',
      category: 'casement',
      name: 'Casement & Fixed',
      location: 'FF Front Right',
      width: 4810,
      height: 2888,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      configuration: {
        panels: 4,
        panelTypes: ['fixed', 'openable', 'openable', 'fixed'],
        openingDirections: ['', 'right', 'left', '']
      },
      quantity: 1,
      rate: 103788.33
    }
  ])

  // AI states
  const [aiChatMessages, setAiChatMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // CRM Sync
  const [crmSyncStatus, setCrmSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)

  // Fetch functions
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/config', { headers })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/products', { headers })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }, [])

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/materials', { headers })
      if (res.ok) {
        const data = await res.json()
        setMaterials(data.materials || [])
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    }
  }, [])

  const fetchHardware = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/hardware', { headers })
      if (res.ok) {
        const data = await res.json()
        setHardware(data.hardware || [])
      }
    } catch (error) {
      console.error('Failed to fetch hardware:', error)
    }
  }, [])

  const fetchRequirements = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/requirements', { headers })
      if (res.ok) {
        const data = await res.json()
        setRequirements(data.requirements || [])
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error)
    }
  }, [])

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/quotations', { headers })
      if (res.ok) {
        const data = await res.json()
        setQuotations(data.quotations || [])
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/orders', { headers })
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }, [])

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/invoices', { headers })
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    }
  }, [])

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/work-orders', { headers })
      if (res.ok) {
        const data = await res.json()
        setWorkOrders(data.workOrders || [])
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error)
    }
  }, [])

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/media', { headers })
      if (res.ok) {
        const data = await res.json()
        setMediaGallery(data.media || [])
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
    }
  }, [])

  const checkSeedStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/module/doors-windows/seed', { headers })
      if (res.ok) {
        const data = await res.json()
        setSeedStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to check seed status:', error)
    }
  }, [])

  const seedData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/module/doors-windows/seed', {
        method: 'POST',
        headers
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Sample data seeded successfully!')
        // Refresh all data
        await Promise.all([
          fetchProducts(),
          fetchMaterials(),
          fetchHardware(),
          fetchQuotations(),
          checkSeedStatus()
        ])
      } else {
        toast.error('Failed to seed data')
      }
    } catch (error) {
      toast.error('Error seeding data')
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchConfig(),
        fetchProducts(),
        fetchMaterials(),
        fetchHardware(),
        fetchRequirements(),
        fetchQuotations(),
        fetchOrders(),
        fetchInvoices(),
        fetchWorkOrders(),
        fetchMedia(),
        checkSeedStatus()
      ])
      setLoading(false)
    }
    loadData()
  }, [])

  // AI Chat handler
  const handleAIChat = async () => {
    if (!aiInput.trim()) return
    
    const userMessage = { role: 'user', content: aiInput }
    setAiChatMessages(prev => [...prev, userMessage])
    setAiInput('')
    setAiLoading(true)

    try {
      const res = await fetch('/api/module/doors-windows/ai', {
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

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'divider', label: 'Sales' },
    { id: 'requirements', label: 'Requirements', icon: ClipboardList },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'quote-builder', label: 'Quote Builder', icon: Ruler, highlight: true },
    { id: 'orders', label: 'Orders', icon: Package },
    { type: 'divider', label: 'Catalog' },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'materials', label: 'Materials', icon: Layers },
    { id: 'hardware', label: 'Hardware', icon: Wrench },
    { type: 'divider', label: 'Production' },
    { id: 'work-orders', label: 'Work Orders', icon: Hammer },
    { id: 'installations', label: 'Installations', icon: Home },
    { type: 'divider', label: 'Finance' },
    { id: 'invoices', label: 'Invoices', icon: DollarSign },
    { type: 'divider', label: 'AI & Media' },
    { id: 'mee-ai', label: 'MEE AI Studio', icon: Brain },
    { id: 'media-gallery', label: 'Media Gallery', icon: ImagePlus },
    { type: 'divider', label: 'Settings' },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Dashboard Stats
  const dashboardStats = [
    { label: 'Products', value: products.length, icon: Box, color: 'from-blue-500 to-indigo-600' },
    { label: 'Quotations', value: quotations.length, icon: FileText, color: 'from-emerald-500 to-teal-600' },
    { label: 'Orders', value: orders.length, icon: Package, color: 'from-amber-500 to-orange-600' },
    { label: 'Invoices', value: invoices.length, icon: DollarSign, color: 'from-purple-500 to-violet-600' }
  ]

  // Render Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Doors & Windows Dashboard</h2>
          <p className="text-slate-500">uPVC, Aluminum & Wood Doors and Windows Management</p>
        </div>
        <div className="flex gap-2">
          {!seedStatus?.hasData && (
            <Button onClick={seedData} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Sparkles className="h-4 w-4 mr-2" /> Seed Sample Data
            </Button>
          )}
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, idx) => (
          <GlassCard key={idx} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Recent Quotations */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Quotations</h3>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('quotations')}>
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {quotations.length > 0 ? (
          <div className="space-y-3">
            {quotations.slice(0, 5).map(quote => (
              <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{quote.quoteNumber}</p>
                  <p className="text-sm text-slate-500">{quote.customer?.name || 'Unknown Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">₹{quote.grandTotal?.toLocaleString()}</p>
                  <Badge className={quote.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {quote.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p>No quotations yet. Seed sample data or create a new quotation.</p>
          </div>
        )}
      </GlassCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('quote-builder')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Ruler className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Create Quote</p>
              <p className="text-xs text-slate-500">With drawings</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('requirements')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">New Requirement</p>
              <p className="text-xs text-slate-500">Capture inquiry</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('mee-ai')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">MEE AI</p>
              <p className="text-xs text-slate-500">Get suggestions</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('products')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Box className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Products</p>
              <p className="text-xs text-slate-500">Manage catalog</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )

  // Render Products
  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products Catalog</h2>
          <p className="text-slate-500">Windows, doors and related products</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <Tabs defaultValue="windows">
        <TabsList>
          <TabsTrigger value="windows">Windows</TabsTrigger>
          <TabsTrigger value="doors">Doors</TabsTrigger>
        </TabsList>

        <TabsContent value="windows" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.productType === 'window').map(product => (
              <GlassCard key={product.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-blue-100 text-blue-700 capitalize">{product.category}</Badge>
                  <Badge variant="outline">{product.frameMaterial}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Profile: {product.frameProfile}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-bold text-emerald-600">₹{product.pricePerSqft}/sqft</p>
                  <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                </div>
              </GlassCard>
            ))}
            {products.filter(p => p.productType === 'window').length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Box className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>No windows found. Add products or seed sample data.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="doors" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.productType === 'door').map(product => (
              <GlassCard key={product.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-purple-100 text-purple-700 capitalize">{product.category}</Badge>
                  <Badge variant="outline">{product.frameMaterial}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Profile: {product.frameProfile}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-bold text-emerald-600">₹{product.pricePerSqft}/sqft</p>
                  <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                </div>
              </GlassCard>
            ))}
            {products.filter(p => p.productType === 'door').length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <DoorClosed className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>No doors found. Add products or seed sample data.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )

  // Render Materials
  const renderMaterials = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Materials</h2>
          <p className="text-slate-500">Glass, profiles, and raw materials</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
          <Plus className="h-4 w-4 mr-2" /> Add Material
        </Button>
      </div>

      <Tabs defaultValue="glass">
        <TabsList>
          <TabsTrigger value="glass">Glass</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="glass" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.filter(m => m.category === 'glass').map(material => (
              <GlassCard key={material.id} className="p-4">
                <h3 className="font-semibold text-slate-900">{material.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Thickness: {material.thickness}mm</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-semibold text-emerald-600">₹{material.sellingPrice}/{material.unitOfMeasure}</p>
                  <Badge variant="outline">Stock: {material.currentStock}</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.filter(m => m.category === 'frame_profile').map(material => (
              <GlassCard key={material.id} className="p-4">
                <h3 className="font-semibold text-slate-900">{material.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Brand: {material.brand || 'Generic'}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-semibold text-emerald-600">₹{material.sellingPrice}/{material.unitOfMeasure}</p>
                  <Badge variant="outline">Stock: {material.currentStock}</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="other" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.filter(m => !['glass', 'frame_profile'].includes(m.category)).map(material => (
              <GlassCard key={material.id} className="p-4">
                <Badge className="mb-2 capitalize">{material.category?.replace('_', ' ')}</Badge>
                <h3 className="font-semibold text-slate-900">{material.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-semibold text-emerald-600">₹{material.sellingPrice}/{material.unitOfMeasure}</p>
                  <Badge variant="outline">Stock: {material.currentStock}</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )

  // Render Hardware
  const renderHardware = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Hardware</h2>
          <p className="text-slate-500">Handles, locks, hinges and accessories</p>
        </div>
        <Button className="bg-gradient-to-r from-amber-500 to-orange-600">
          <Plus className="h-4 w-4 mr-2" /> Add Hardware
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hardware.map(item => (
          <GlassCard key={item.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <Badge className="capitalize bg-slate-100 text-slate-700">{item.hardwareType}</Badge>
              <Badge variant="outline">{item.brand || 'Generic'}</Badge>
            </div>
            <h3 className="font-semibold text-slate-900">{item.name}</h3>
            <p className="text-sm text-slate-500 mt-1">Finish: {item.finish || 'Standard'}</p>
            <div className="flex items-center justify-between mt-3">
              <p className="font-semibold text-emerald-600">₹{item.sellingPrice}</p>
              <Badge variant="outline">Stock: {item.currentStock}</Badge>
            </div>
          </GlassCard>
        ))}
        {hardware.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Wrench className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p>No hardware found. Add items or seed sample data.</p>
          </div>
        )}
      </div>
    </div>
  )

  // Render Quotations List
  const renderQuotations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quotations</h2>
          <p className="text-slate-500">View and manage quotations with drawings</p>
        </div>
        <Button onClick={() => setActiveTab('quote-builder')} className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <Plus className="h-4 w-4 mr-2" /> New Quotation
        </Button>
      </div>

      {quotations.length > 0 ? (
        <div className="space-y-4">
          {quotations.map(quote => (
            <GlassCard key={quote.id} className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Quote Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-slate-900">{quote.quoteNumber}</h3>
                    <Badge className={
                      quote.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      quote.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {quote.status}
                    </Badge>
                  </div>
                  <p className="text-slate-600">{quote.customer?.name || 'Unknown Customer'}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" /> {quote.totalUnits} items
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="h-4 w-4" /> {quote.totalArea} sqft
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> {new Date(quote.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Drawing Preview */}
                {quote.lineItems?.[0]?.drawingConfig && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <WindowDoorDrawing 
                      config={quote.lineItems[0].drawingConfig} 
                      width={128} 
                      height={128}
                      showDimensions={false}
                    />
                  </div>
                )}

                {/* Price & Actions */}
                <div className="flex flex-col items-end justify-between">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">₹{quote.grandTotal?.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">incl. GST</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedQuote(quote)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Quotations Yet</h3>
          <p className="text-slate-500 mb-4">Create your first quotation with detailed drawings</p>
          <Button onClick={() => setActiveTab('quote-builder')} className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" /> Create Quotation
          </Button>
        </GlassCard>
      )}

      {/* Quote View Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> {selectedQuote?.quoteNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedQuote?.customer?.name} • {selectedQuote?.lineItems?.length} items • {selectedQuote?.totalArea} sqft
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-6">
              {/* Company & Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">From</p>
                  <p className="font-semibold">{selectedQuote.companyInfo?.name || 'Your Company'}</p>
                  <p className="text-sm text-slate-600">{selectedQuote.companyInfo?.address}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">To</p>
                  <p className="font-semibold">{selectedQuote.customer?.name}</p>
                  <p className="text-sm text-slate-600">{selectedQuote.deliveryAddress?.address}</p>
                </div>
              </div>

              {/* Line Items with Drawings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Line Items</h3>
                {selectedQuote.lineItems?.map((item, idx) => (
                  <GlassCard key={item.id || idx} className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Drawing */}
                      <div className="w-48 h-48 flex-shrink-0 mx-auto lg:mx-0">
                        <WindowDoorDrawing 
                          config={{
                            ...item.drawingConfig,
                            width: item.width,
                            height: item.height,
                            type: item.category,
                            profileColor: item.profileColor || 'white',
                            panels: item.configuration?.panelTypes?.map((type, i) => ({
                              type,
                              openingDirection: item.configuration?.openingDirections?.[i] || ''
                            })) || []
                          }}
                          width={192}
                          height={192}
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-slate-500">Sales Line {item.lineNumber}</p>
                            <h4 className="font-semibold text-slate-900">{item.name}</h4>
                            <p className="text-sm text-slate-600">{item.location}</p>
                          </div>
                          <Badge className="capitalize">{item.productType}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div>
                            <p className="text-slate-500">Dimensions</p>
                            <p className="font-medium">{item.width}w × {item.height}h mm</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Area</p>
                            <p className="font-medium">{item.areaSqft} sqft</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Frame</p>
                            <p className="font-medium">{item.frameMaterial?.toUpperCase()} - {item.frameProfile}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Glass</p>
                            <p className="font-medium">{item.glassType}</p>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                        <p className="text-xl font-bold text-slate-900">₹{item.amount?.toLocaleString()}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between py-2">
                  <span>Total Area</span>
                  <span className="font-medium">{selectedQuote.totalArea} sqft</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{selectedQuote.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span>SGST (9%)</span>
                  <span>₹{selectedQuote.sgst?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span>CGST (9%)</span>
                  <span>₹{selectedQuote.cgst?.toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-emerald-600">₹{selectedQuote.grandTotal?.toLocaleString()}</span>
                </div>
              </div>

              {/* Terms */}
              {selectedQuote.terms?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Terms & Conditions</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {selectedQuote.terms.map((term, i) => (
                      <li key={i}>{i + 1}. {term}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuote(null)}>Close</Button>
            <Button><Printer className="h-4 w-4 mr-2" /> Print / Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Render Quote Builder
  const renderQuoteBuilder = () => {
    const addItem = () => {
      setBuilderItems(prev => [...prev, {
        id: Date.now().toString(),
        productType: 'window',
        category: 'casement',
        name: 'New Window',
        location: '',
        width: 1200,
        height: 1500,
        frameMaterial: 'upvc',
        frameProfile: 'KM01',
        profileColor: 'white',
        glassType: 'Clear 5mm',
        configuration: {
          panels: 1,
          panelTypes: ['openable'],
          openingDirections: ['left']
        },
        quantity: 1,
        rate: 0
      }])
    }

    const updateItem = (id, field, value) => {
      setBuilderItems(prev => prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ))
    }

    const removeItem = (id) => {
      setBuilderItems(prev => prev.filter(item => item.id !== id))
    }

    const calculateArea = (w, h) => ((w / 304.8) * (h / 304.8)).toFixed(2)

    const calculateTotal = () => {
      return builderItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quote Builder</h2>
            <p className="text-slate-500">Create quotations with dynamic technical drawings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Save className="h-4 w-4 mr-2" /> Save Quote
            </Button>
          </div>
        </div>

        {/* Customer Info */}
        <GlassCard className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Customer Name</Label>
              <Input placeholder="Enter customer name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="Phone number" />
            </div>
            <div>
              <Label>Email</Label>
              <Input placeholder="Email address" />
            </div>
          </div>
        </GlassCard>

        {/* Line Items */}
        <div className="space-y-4">
          {builderItems.map((item, idx) => (
            <GlassCard key={item.id} className="p-4">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Drawing Preview */}
                <div className="w-full lg:w-64 flex-shrink-0">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <WindowDoorDrawing 
                      config={{
                        width: item.width,
                        height: item.height,
                        type: item.category,
                        profileColor: item.profileColor,
                        panels: item.configuration?.panelTypes?.map((type, i) => ({
                          type,
                          openingDirection: item.configuration?.openingDirections?.[i] || ''
                        })) || []
                      }}
                      width={240}
                      height={240}
                    />
                  </div>
                </div>

                {/* Configuration */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge>Item #{idx + 1}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={item.productType} onValueChange={v => updateItem(item.id, 'productType', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="window">Window</SelectItem>
                          <SelectItem value="door">Door</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={item.category} onValueChange={v => updateItem(item.id, 'category', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casement">Casement</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="sliding">Sliding</SelectItem>
                          <SelectItem value="tilt-turn">Tilt & Turn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Frame</Label>
                      <Select value={item.frameMaterial} onValueChange={v => updateItem(item.id, 'frameMaterial', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upvc">uPVC</SelectItem>
                          <SelectItem value="aluminum">Aluminum</SelectItem>
                          <SelectItem value="wood">Wood</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Select value={item.profileColor} onValueChange={v => updateItem(item.id, 'profileColor', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="white">White</SelectItem>
                          <SelectItem value="black">Black</SelectItem>
                          <SelectItem value="grey">Grey</SelectItem>
                          <SelectItem value="brown">Brown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs">Width (mm)</Label>
                      <Input 
                        type="number" 
                        value={item.width} 
                        onChange={e => updateItem(item.id, 'width', parseInt(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Height (mm)</Label>
                      <Input 
                        type="number" 
                        value={item.height} 
                        onChange={e => updateItem(item.id, 'height', parseInt(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Area (sqft)</Label>
                      <Input value={calculateArea(item.width, item.height)} disabled className="h-9 bg-slate-100" />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-9"
                        min={1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rate (₹)</Label>
                      <Input 
                        type="number" 
                        value={item.rate} 
                        onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Location</Label>
                      <Input 
                        placeholder="e.g., FF Front Right" 
                        value={item.location}
                        onChange={e => updateItem(item.id, 'location', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Glass Type</Label>
                      <Select value={item.glassType} onValueChange={v => updateItem(item.id, 'glassType', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Clear 5mm">Clear 5mm</SelectItem>
                          <SelectItem value="Clear 6mm">Clear 6mm</SelectItem>
                          <SelectItem value="Toughened 8mm">Toughened 8mm</SelectItem>
                          <SelectItem value="Toughened 10mm">Toughened 10mm</SelectItem>
                          <SelectItem value="12mm Reflective T">12mm Reflective Toughened</SelectItem>
                          <SelectItem value="Laminated 6.38mm">Laminated 6.38mm</SelectItem>
                          <SelectItem value="DGU 20mm">Double Glazed 20mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right lg:w-32">
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-xl font-bold text-slate-900">₹{(item.rate * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Totals */}
        <GlassCard className="p-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">₹{calculateTotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>SGST (9%)</span>
                <span>₹{(calculateTotal() * 0.09).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>CGST (9%)</span>
                <span>₹{(calculateTotal() * 0.09).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total</span>
                <span className="text-emerald-600">₹{(calculateTotal() * 1.18).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Render MEE AI Studio
  const renderMeeAi = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
          <Brain className="h-7 w-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">MEE AI Studio</h2>
          <p className="text-slate-500">Intelligent assistant for doors & windows</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
          <div className="h-[600px] flex flex-col">
            <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">MEE AI</p>
                  <p className="text-xs text-emerald-600">Online</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {aiChatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Wand2 className="h-12 w-12 mx-auto mb-4 text-purple-300" />
                    <h3 className="font-semibold text-slate-900 mb-2">How can I help you today?</h3>
                    <p className="text-sm text-slate-500 mb-4">Ask about products, pricing, materials, or get recommendations</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Best glass for south-facing windows?', 'uPVC vs Aluminum for coastal areas', 'Suggest hardware for sliding doors'].map(q => (
                        <Button key={q} variant="outline" size="sm" onClick={() => setAiInput(q)}>
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {aiChatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 shadow-sm rounded-tl-none'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-none p-4">
                      <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-200/50 bg-white/50">
              <div className="flex gap-2">
                <Input 
                  placeholder="Ask MEE AI..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAIChat()}
                />
                <Button onClick={handleAIChat} disabled={aiLoading || !aiInput.trim()} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Analyze Requirement', icon: Sparkles, color: 'from-purple-500 to-indigo-600' },
                { label: 'Material Suggestion', icon: Layers, color: 'from-emerald-500 to-teal-600' },
                { label: 'Price Estimate', icon: DollarSign, color: 'from-amber-500 to-orange-600' },
                { label: 'Configuration Help', icon: SlidersHorizontal, color: 'from-blue-500 to-cyan-600' }
              ].map(action => (
                <Button key={action.label} variant="outline" className="h-auto py-3 flex flex-col gap-1">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )

  // Render placeholder sections
  const renderRequirements = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Requirements</h2>
          <p className="text-slate-500">Customer inquiries and project requirements</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
          <Plus className="h-4 w-4 mr-2" /> New Requirement
        </Button>
      </div>
      <GlassCard className="p-12 text-center">
        <ClipboardList className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">No requirements yet</p>
      </GlassCard>
    </div>
  )

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-500">Production and delivery orders</p>
        </div>
      </div>
      <GlassCard className="p-12 text-center">
        <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">No orders yet. Convert quotations to orders.</p>
      </GlassCard>
    </div>
  )

  const renderWorkOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work Orders</h2>
          <p className="text-slate-500">Production tracking and management</p>
        </div>
      </div>
      <GlassCard className="p-12 text-center">
        <Hammer className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">No work orders yet</p>
      </GlassCard>
    </div>
  )

  const renderInstallations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Installations</h2>
          <p className="text-slate-500">Schedule and track installations</p>
        </div>
      </div>
      <GlassCard className="p-12 text-center">
        <Home className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">No installations scheduled</p>
      </GlassCard>
    </div>
  )

  const renderInvoices = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
          <p className="text-slate-500">Billing and payment tracking</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-violet-600">
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
      </div>
      <GlassCard className="p-12 text-center">
        <DollarSign className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">No invoices yet</p>
      </GlassCard>
    </div>
  )

  // Media Gallery state
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

  const handleUploadMedia = async () => {
    try {
      const res = await fetch('/api/module/doors-windows/media', {
        method: 'POST',
        headers,
        body: JSON.stringify(uploadForm)
      })
      if (res.ok) {
        toast.success('Media uploaded successfully!')
        fetchMedia()
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
      const res = await fetch(`/api/module/doors-windows/media?id=${mediaId}`, {
        method: 'DELETE',
        headers
      })
      if (res.ok) {
        toast.success('Media deleted')
        fetchMedia()
        setSelectedMedia(null)
      }
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  const renderMediaGallery = () => {
    const mediaCategories = [
      { id: 'all', label: 'All Media', icon: Grid3X3 },
      { id: '3d_model', label: '3D Models', icon: Box },
      { id: 'image', label: 'Images', icon: FileImage },
      { id: 'video', label: 'Videos', icon: Video },
      { id: 'document', label: 'Documents', icon: FileText }
    ]

    const categoryLabels = {
      design_render: 'Design Renders',
      site_photo: 'Site Photos',
      reference: 'Reference Images',
      product_photo: 'Product Photos',
      cad_drawing: 'CAD Drawings',
      general: 'General'
    }

    const filteredMedia = mediaFilter === 'all' 
      ? mediaGallery 
      : mediaGallery.filter(m => m.mediaType === mediaFilter)

    // Sample 3D models for demonstration
    const sample3DModels = [
      { id: 'sample-1', title: 'Casement Window', fileName: 'casement-window.glb', mediaType: '3d_model', category: 'product_photo', fileUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
      { id: 'sample-2', title: 'French Door', fileName: 'french-door.glb', mediaType: '3d_model', category: 'product_photo', fileUrl: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb' }
    ]

    const allMedia = [...filteredMedia, ...(mediaGallery.length === 0 ? sample3DModels : [])]

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
                <p className="text-2xl font-bold text-slate-900">{allMedia.filter(m => m.mediaType === '3d_model').length}</p>
                <p className="text-xs text-slate-500">3D Models</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <FileImage className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{allMedia.filter(m => m.mediaType === 'image').length}</p>
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
                <p className="text-2xl font-bold text-slate-900">{allMedia.filter(m => m.mediaType === 'video').length}</p>
                <p className="text-xs text-slate-500">Videos</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{allMedia.length}</p>
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

        {/* Media Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allMedia.map(media => (
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
                      <div className="text-center">
                        <Box className="h-12 w-12 mx-auto text-indigo-500 mb-2" />
                        <p className="text-xs text-indigo-600 font-medium">3D Model</p>
                      </div>
                    </div>
                  ) : media.mediaType === 'video' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                      <Video className="h-12 w-12 text-purple-500" />
                    </div>
                  ) : media.fileUrl ? (
                    <img 
                      src={media.fileUrl} 
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
                    {!media.id.startsWith('sample') && (
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDeleteMedia(media.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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

          {allMedia.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <ImagePlus className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="font-semibold text-slate-900 mb-2">No media found</h3>
              <p className="text-sm text-slate-500 mb-4">Upload your first media file to get started</p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Upload Media
              </Button>
            </div>
          )}
        </div>

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
                      <SelectItem value="3d_model">3D Model (.glb, .gltf)</SelectItem>
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
                      <SelectItem value="product_photo">Product Photo</SelectItem>
                      <SelectItem value="cad_drawing">CAD Drawing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>File Name</Label>
                <Input 
                  placeholder="e.g., living-room-window.glb"
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
                <p className="text-xs text-slate-500 mt-1">Paste URL from cloud storage (AWS S3, Google Drive, Dropbox)</p>
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

        {/* Media Preview Dialog with 3D Viewer */}
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedMedia?.title || selectedMedia?.fileName}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedMedia?.mediaType === '3d_model' ? (
                <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden">
                  {/* 3D Model Viewer using model-viewer web component */}
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{
                      __html: `
                        <model-viewer
                          src="${selectedMedia?.fileUrl || 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'}"
                          alt="${selectedMedia?.title || '3D Model'}"
                          camera-controls
                          auto-rotate
                          shadow-intensity="1"
                          exposure="0.75"
                          style="width: 100%; height: 100%; min-height: 400px;"
                        >
                          <div class="progress-bar hide" slot="progress-bar">
                            <div class="update-bar"></div>
                          </div>
                        </model-viewer>
                      `
                    }}
                  />
                  {/* Controls hint */}
                  <div className="absolute bottom-3 left-3 right-3 flex justify-center gap-2">
                    <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" /> Drag to Rotate
                    </Badge>
                    <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-xs">
                      <ZoomIn className="h-3 w-3 mr-1" /> Scroll to Zoom
                    </Badge>
                  </div>
                </div>
              ) : selectedMedia?.mediaType === 'video' ? (
                <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
                  {selectedMedia?.fileUrl ? (
                    <video controls className="w-full h-full rounded-xl">
                      <source src={selectedMedia.fileUrl} />
                    </video>
                  ) : (
                    <Video className="h-16 w-16 text-white/50" />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                  {selectedMedia?.fileUrl ? (
                    <img src={selectedMedia.fileUrl} alt={selectedMedia?.title} className="w-full h-full object-contain" />
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
                    <p className="text-slate-500">File Name</p>
                    <p className="font-medium">{selectedMedia?.fileName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Uploaded</p>
                    <p className="font-medium">{selectedMedia?.createdAt ? new Date(selectedMedia.createdAt).toLocaleDateString() : 'Sample Data'}</p>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMedia(null)}>Close</Button>
              {selectedMedia?.fileUrl && (
                <Button onClick={() => window.open(selectedMedia.fileUrl, '_blank')}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Module configuration</p>
      </div>
      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4">Data Management</h3>
        <Button onClick={seedData} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" /> Seed Sample Data
        </Button>
      </GlassCard>
    </div>
  )

  // Main render content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard()
      case 'products': return renderProducts()
      case 'materials': return renderMaterials()
      case 'hardware': return renderHardware()
      case 'requirements': return renderRequirements()
      case 'quotations': return renderQuotations()
      case 'quote-builder': return renderQuoteBuilder()
      case 'orders': return renderOrders()
      case 'work-orders': return renderWorkOrders()
      case 'installations': return renderInstallations()
      case 'invoices': return renderInvoices()
      case 'mee-ai': return renderMeeAi()
      case 'media-gallery': return renderMediaGallery()
      case 'settings': return renderSettings()
      default: return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} h-screen sticky top-0 transition-all duration-300`}>
          <div className="h-full backdrop-blur-md bg-white/70 border-r border-white/20 p-4 flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Square className="h-6 w-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-slate-900">Doors & Windows</h1>
                  <p className="text-xs text-slate-500">Enterprise Module</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="space-y-1">
                {navItems.map((item, idx) => {
                  if (item.type === 'divider') {
                    if (sidebarCollapsed) return null
                    return (
                      <div key={idx} className="pt-4 pb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                        activeTab === item.id
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                          : item.highlight
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  )
                })}
              </nav>
            </ScrollArea>

            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mt-4"
            >
              <PanelLeftClose className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  )
}
