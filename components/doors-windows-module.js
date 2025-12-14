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

  // Quote Builder states
  const [quoteBuilderItems, setQuoteBuilderItems] = useState([
    {
      id: '1',
      productType: 'Window',
      category: 'Casement',
      name: 'Casement & Fixed Window',
      location: 'FF Front Right',
      width: 4810,
      height: 2888,
      material: 'uPVC',
      profile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective Toughened',
      panels: [
        { type: 'fixed', direction: '' },
        { type: 'openable', direction: 'right' },
        { type: 'openable', direction: 'left' },
        { type: 'fixed', direction: '' }
      ],
      quantity: 1,
      rate: 103788
    }
  ])
  const [quoteCustomerInfo, setQuoteCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  const [selectedQuoteView, setSelectedQuoteView] = useState(null)

  // MEE AI states
  const [aiChatMessages, setAiChatMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Projects state
  const [projects, setProjects] = useState([])
  
  // CRM Sync states
  const [crmSyncStatus, setCrmSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  
  // Quote saving states
  const [savingQuote, setSavingQuote] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Fetch all data
  useEffect(() => {
    fetchAllData()
    fetchProjects()
    fetchCrmSyncStatus()
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

  // Fetch Projects
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers })
      if (res.ok) {
        const data = await res.json()
        setProjects(Array.isArray(data) ? data : data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  // Fetch CRM Sync Status
  const fetchCrmSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync`, { headers })
      if (res.ok) {
        const data = await res.json()
        setCrmSyncStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch CRM sync status:', error)
    }
  }

  // Sync from CRM
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

  // Push to CRM
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
        toast.success(`Created project ${data.project?.projectNumber} in CRM`)
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

  // Save Quote from Quote Builder
  const saveQuote = async () => {
    if (!quoteCustomerInfo.name) {
      toast.error('Please enter customer name')
      return
    }
    if (quoteBuilderItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    try {
      setSavingQuote(true)
      const quoteData = {
        customerName: quoteCustomerInfo.name,
        customerPhone: quoteCustomerInfo.phone,
        customerEmail: quoteCustomerInfo.email,
        siteAddress: quoteCustomerInfo.address,
        items: quoteBuilderItems,
        subtotal: quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0),
        taxRate: 18,
        taxAmount: quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 0.18,
        grandTotal: quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 1.18,
        status: 'draft'
      }

      const res = await fetch(`${API_BASE}/quotations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(quoteData)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Quote ${data.quotation?.quoteNumber || ''} saved successfully!`)
        refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save quote')
      }
    } catch (error) {
      toast.error('Failed to save quote')
    } finally {
      setSavingQuote(false)
    }
  }

  // Download Quote as PDF
  const downloadQuotePDF = () => {
    // Generate printable HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quoteCustomerInfo.name || 'Customer'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #1e40af; }
          .customer-info { margin-bottom: 30px; }
          .customer-info h3 { margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .totals { float: right; width: 300px; }
          .totals table { margin-bottom: 0; }
          .total-row { font-weight: bold; background: #f0fdf4; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DOORS & WINDOWS QUOTATION</h1>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="customer-info">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> ${quoteCustomerInfo.name || '-'}</p>
          <p><strong>Phone:</strong> ${quoteCustomerInfo.phone || '-'}</p>
          <p><strong>Email:</strong> ${quoteCustomerInfo.email || '-'}</p>
          <p><strong>Site Address:</strong> ${quoteCustomerInfo.address || '-'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Size (mm)</th>
              <th>Material</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${quoteBuilderItems.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.productType} - ${item.category}<br/><small>${item.location || ''}</small></td>
                <td>${item.width} x ${item.height}</td>
                <td>${item.material} - ${item.profileColor}</td>
                <td>${item.quantity}</td>
                <td>₹${item.rate.toLocaleString()}</td>
                <td>₹${(item.rate * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <table>
            <tr><td>Subtotal</td><td>₹${quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0).toLocaleString()}</td></tr>
            <tr><td>SGST (9%)</td><td>₹${(quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 0.09).toLocaleString()}</td></tr>
            <tr><td>CGST (9%)</td><td>₹${(quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 0.09).toLocaleString()}</td></tr>
            <tr class="total-row"><td>Grand Total</td><td>₹${(quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 1.18).toLocaleString()}</td></tr>
          </table>
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
    toast.success('Quote ready for download/print')
  }

  // Create Project
  const createProject = async (projectData) => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify(projectData)
      })
      if (res.ok) {
        toast.success('Project created successfully')
        fetchProjects()
        return true
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create project')
        return false
      }
    } catch (error) {
      toast.error('Failed to create project')
      return false
    }
  }

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
              { id: 'projects', icon: FolderKanban, label: 'Projects' },
              { id: 'surveys', icon: ClipboardList, label: 'Surveys & Measurements' },
              { id: 'quotations', icon: FileText, label: 'Quotations' },
              { id: 'quote-builder', icon: Ruler, label: 'Quote Builder', highlight: true },
              { id: 'orders', icon: ShoppingCart, label: 'Sales Orders' },
              { id: 'production', icon: Factory, label: 'Production' },
              { id: 'dispatch', icon: Truck, label: 'Dispatch' },
              { id: 'installation', icon: Wrench, label: 'Installation' },
              { id: 'service', icon: Hammer, label: 'Service Tickets' },
              { id: 'warranty', icon: Shield, label: 'Warranty & AMC' },
              { id: 'catalog', icon: Package, label: 'Product Catalog' },
              { id: 'mee-ai', icon: Brain, label: 'MEE AI', highlight: true },
              { id: 'reports', icon: BarChart3, label: 'Reports' },
              { id: 'automation', icon: Bell, label: 'Automation' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : item.highlight
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:from-blue-100 hover:to-indigo-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.highlight && <Sparkles className="h-3 w-3 ml-auto text-amber-500" />}
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

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Projects</h2>
                  <p className="text-muted-foreground">Manage doors & windows projects with CRM sync</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => handleSyncFromCRM('projects')} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Sync from CRM
                  </Button>
                  <Button onClick={() => setShowNewQuote(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </div>
              </div>

              {/* CRM Sync Status */}
              <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">CRM Sync Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {crmSyncStatus?.alreadySynced || 0} projects synced | {crmSyncStatus?.availableToSync?.projects || 0} available to sync
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleSyncFromCRM('leads')} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Leads
                  </Button>
                </div>
              </Card>

              {/* Projects List */}
              {projects.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Client</TableHead>
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
                          <TableCell className="font-medium">₹{(project.value || project.budget || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {project.source === 'crm_sync' ? (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> CRM
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
                              <Button variant="ghost" size="sm" onClick={() => setActiveTab('quote-builder')}>
                                <FileText className="h-4 w-4" />
                              </Button>
                              {!project.crmProjectId && (
                                <Button variant="ghost" size="sm" onClick={() => handlePushToCRM(project.id)}>
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground mb-4">Sync projects from CRM or create a new project</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => handleSyncFromCRM('projects')} disabled={syncing}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Sync from CRM
                    </Button>
                    <Button>Create Project</Button>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Quote Builder Tab - With Dynamic Drawings */}
          {activeTab === 'quote-builder' && (
            <motion.div
              key="quote-builder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Quote Builder</h2>
                  <p className="text-muted-foreground">Create quotations with dynamic technical drawings</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setQuoteBuilderItems([...quoteBuilderItems, {
                    id: Date.now().toString(),
                    productType: 'Window',
                    category: 'Casement',
                    name: 'New Window',
                    location: '',
                    width: 1200,
                    height: 1500,
                    material: 'uPVC',
                    profile: 'KM01',
                    profileColor: 'white',
                    glassType: 'Clear 5mm',
                    panels: [{ type: 'openable', direction: 'left' }],
                    quantity: 1,
                    rate: 0
                  }])}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </Button>
                  <Button variant="outline" onClick={downloadQuotePDF}>
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    onClick={saveQuote}
                    disabled={savingQuote}
                  >
                    {savingQuote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Quote
                  </Button>
                </div>
              </div>

              {/* Customer Information */}
              <Card className="p-4 mb-6">
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Customer Name</Label>
                    <Input 
                      placeholder="Enter name" 
                      value={quoteCustomerInfo.name}
                      onChange={e => setQuoteCustomerInfo({...quoteCustomerInfo, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input 
                      placeholder="Phone number"
                      value={quoteCustomerInfo.phone}
                      onChange={e => setQuoteCustomerInfo({...quoteCustomerInfo, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input 
                      placeholder="Email address"
                      value={quoteCustomerInfo.email}
                      onChange={e => setQuoteCustomerInfo({...quoteCustomerInfo, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Site Address</Label>
                    <Input 
                      placeholder="Delivery address"
                      value={quoteCustomerInfo.address}
                      onChange={e => setQuoteCustomerInfo({...quoteCustomerInfo, address: e.target.value})}
                    />
                  </div>
                </div>
              </Card>

              {/* Line Items */}
              <div className="space-y-4 mb-6">
                {quoteBuilderItems.map((item, idx) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Drawing Preview */}
                      <div className="w-full lg:w-72 flex-shrink-0">
                        <WindowDoorDrawing 
                          config={{
                            width: item.width,
                            height: item.height,
                            type: item.category,
                            profileColor: item.profileColor,
                            panels: item.panels || [{ type: 'openable', direction: 'left' }]
                          }}
                          width={280}
                          height={280}
                        />
                      </div>

                      {/* Configuration */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Item #{idx + 1}</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setQuoteBuilderItems(quoteBuilderItems.filter(i => i.id !== item.id))}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select 
                              value={item.productType} 
                              onValueChange={v => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].productType = v
                                setQuoteBuilderItems(updated)
                              }}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Window">Window</SelectItem>
                                <SelectItem value="Door">Door</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select 
                              value={item.category}
                              onValueChange={v => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].category = v
                                setQuoteBuilderItems(updated)
                              }}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Casement">Casement</SelectItem>
                                <SelectItem value="Fixed">Fixed</SelectItem>
                                <SelectItem value="Sliding">Sliding</SelectItem>
                                <SelectItem value="Tilt & Turn">Tilt & Turn</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Material</Label>
                            <Select 
                              value={item.material}
                              onValueChange={v => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].material = v
                                setQuoteBuilderItems(updated)
                              }}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="uPVC">uPVC</SelectItem>
                                <SelectItem value="Aluminium">Aluminium</SelectItem>
                                <SelectItem value="Wood">Wood</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Color</Label>
                            <Select 
                              value={item.profileColor}
                              onValueChange={v => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].profileColor = v
                                setQuoteBuilderItems(updated)
                              }}
                            >
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
                          <div className="space-y-1">
                            <Label className="text-xs">Width (mm)</Label>
                            <Input 
                              type="number" 
                              value={item.width}
                              onChange={e => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].width = parseInt(e.target.value) || 0
                                setQuoteBuilderItems(updated)
                              }}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Height (mm)</Label>
                            <Input 
                              type="number" 
                              value={item.height}
                              onChange={e => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].height = parseInt(e.target.value) || 0
                                setQuoteBuilderItems(updated)
                              }}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Area (sqft)</Label>
                            <Input 
                              value={((item.width / 304.8) * (item.height / 304.8)).toFixed(2)} 
                              disabled 
                              className="h-9 bg-gray-50" 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input 
                              type="number" 
                              value={item.quantity}
                              onChange={e => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].quantity = parseInt(e.target.value) || 1
                                setQuoteBuilderItems(updated)
                              }}
                              className="h-9"
                              min={1}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rate (₹)</Label>
                            <Input 
                              type="number" 
                              value={item.rate}
                              onChange={e => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].rate = parseFloat(e.target.value) || 0
                                setQuoteBuilderItems(updated)
                              }}
                              className="h-9"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Location</Label>
                            <Input 
                              placeholder="e.g., FF Front Right"
                              value={item.location}
                              onChange={e => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].location = e.target.value
                                setQuoteBuilderItems(updated)
                              }}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Glass Type</Label>
                            <Select 
                              value={item.glassType}
                              onValueChange={v => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].glassType = v
                                setQuoteBuilderItems(updated)
                              }}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Clear 5mm">Clear 5mm</SelectItem>
                                <SelectItem value="Clear 6mm">Clear 6mm</SelectItem>
                                <SelectItem value="Toughened 8mm">Toughened 8mm</SelectItem>
                                <SelectItem value="Toughened 10mm">Toughened 10mm</SelectItem>
                                <SelectItem value="12mm Reflective Toughened">12mm Reflective Toughened</SelectItem>
                                <SelectItem value="Laminated 6.38mm">Laminated 6.38mm</SelectItem>
                                <SelectItem value="DGU 20mm">Double Glazed 20mm</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Panel Configuration */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Panel Configuration</Label>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                const updated = [...quoteBuilderItems]
                                updated[idx].panels = [...(updated[idx].panels || []), { type: 'openable', direction: 'left' }]
                                setQuoteBuilderItems(updated)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Panel
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(item.panels || []).map((panel, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                                <Select 
                                  value={panel.type}
                                  onValueChange={v => {
                                    const updated = [...quoteBuilderItems]
                                    updated[idx].panels[pIdx].type = v
                                    setQuoteBuilderItems(updated)
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="openable">Openable</SelectItem>
                                  </SelectContent>
                                </Select>
                                {panel.type === 'openable' && (
                                  <Select 
                                    value={panel.direction || 'left'}
                                    onValueChange={v => {
                                      const updated = [...quoteBuilderItems]
                                      updated[idx].panels[pIdx].direction = v
                                      setQuoteBuilderItems(updated)
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    const updated = [...quoteBuilderItems]
                                    updated[idx].panels.splice(pIdx, 1)
                                    setQuoteBuilderItems(updated)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right lg:w-28">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-xl font-bold">₹{(item.rate * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Totals */}
              <Card className="p-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium">₹{quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>SGST (9%)</span>
                      <span>₹{(quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 0.09).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>CGST (9%)</span>
                      <span>₹{(quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 0.09).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Grand Total</span>
                      <span className="text-green-600">₹{(quoteBuilderItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0) * 1.18).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* MEE AI Tab */}
          {activeTab === 'mee-ai' && (
            <motion.div
              key="mee-ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">MEE AI Studio</h2>
                  <p className="text-muted-foreground">Your intelligent doors & windows assistant</p>
                </div>
                <Badge className="ml-auto bg-gradient-to-r from-violet-100 to-purple-100 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" /> Powered by GPT-4
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat Interface */}
                <Card className="lg:col-span-2 overflow-hidden">
                  <div className="h-[500px] flex flex-col">
                    <div className="p-4 border-b bg-gradient-to-r from-violet-50 to-purple-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Brain className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">MEE AI</p>
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
                          </p>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {aiChatMessages.length === 0 && (
                          <div className="text-center py-12">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-purple-200" />
                            <h3 className="font-semibold mb-2">How can I help you today?</h3>
                            <p className="text-sm text-muted-foreground mb-4">Ask about products, materials, pricing, or get recommendations</p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {['Best glass for sound insulation?', 'uPVC vs Aluminium comparison', 'Suggest hardware for sliding doors', 'Price estimate for 5 windows'].map(q => (
                                <Button key={q} variant="outline" size="sm" onClick={() => setAiInput(q)}>
                                  {q}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiChatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-none'
                                : 'bg-gray-100 rounded-tl-none'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {aiLoading && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl rounded-tl-none p-3">
                              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Ask MEE AI about doors, windows, materials..."
                          value={aiInput}
                          onChange={e => setAiInput(e.target.value)}
                          onKeyPress={e => {
                            if (e.key === 'Enter' && aiInput.trim()) {
                              setAiChatMessages([...aiChatMessages, { role: 'user', content: aiInput }])
                              setAiLoading(true)
                              setTimeout(() => {
                                setAiChatMessages(prev => [...prev, { 
                                  role: 'assistant', 
                                  content: 'Thank you for your question! I can help you with:\n\n• Product recommendations\n• Material comparisons\n• Price estimates\n• Technical specifications\n• Installation guidelines\n\nPlease note: Full AI integration requires API configuration. This is a demo response.' 
                                }])
                                setAiLoading(false)
                              }, 1500)
                              setAiInput('')
                            }
                          }}
                        />
                        <Button 
                          disabled={aiLoading || !aiInput.trim()}
                          className="bg-gradient-to-r from-violet-500 to-purple-600"
                          onClick={() => {
                            if (aiInput.trim()) {
                              setAiChatMessages([...aiChatMessages, { role: 'user', content: aiInput }])
                              setAiLoading(true)
                              setTimeout(() => {
                                setAiChatMessages(prev => [...prev, { 
                                  role: 'assistant', 
                                  content: 'Thank you for your question! I can help you with:\n\n• Product recommendations\n• Material comparisons\n• Price estimates\n• Technical specifications\n• Installation guidelines\n\nPlease note: Full AI integration requires API configuration. This is a demo response.' 
                                }])
                                setAiLoading(false)
                              }, 1500)
                              setAiInput('')
                            }
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Analyze Survey', icon: Sparkles, color: 'from-purple-500 to-indigo-600' },
                        { label: 'Material Advice', icon: Layers, color: 'from-emerald-500 to-teal-600' },
                        { label: 'Price Estimate', icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
                        { label: 'Config Help', icon: Cog, color: 'from-blue-500 to-cyan-600' }
                      ].map(action => (
                        <Button key={action.label} variant="outline" className="h-auto py-3 flex flex-col gap-1">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                            <action.icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-amber-900">
                      <Sparkles className="h-4 w-4" /> Pro Tips
                    </h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Ask for product comparisons</li>
                      <li>• Request energy efficiency tips</li>
                      <li>• Get maintenance schedules</li>
                      <li>• Calculate material requirements</li>
                    </ul>
                  </Card>
                </div>
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
