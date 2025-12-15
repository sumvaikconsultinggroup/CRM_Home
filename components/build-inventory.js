'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package, Warehouse, BarChart3, Settings, RefreshCw, Download, Plus,
  ArrowLeftRight, Bell, ClipboardList, Truck, Receipt, Layers, History,
  Bookmark, UserCheck, Search, Scan, AlertCircle, TrendingUp, DollarSign,
  Box, Boxes, Lock, Unlock, ChevronRight, ExternalLink, Sparkles, Zap,
  Database, Link2, CheckCircle2, Clock, Edit, Trash2, Eye, Upload,
  AlertTriangle, XCircle, ArrowUpDown, Filter, MoreVertical, Camera,
  MapPin, Phone, User, Calendar, Send, MessageSquare, Image, FileText,
  PieChart as PieChartIcon, TrendingDown, Archive, ShoppingCart, IndianRupee,
  Activity, Layers3, Target, Users, Building2
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap
} from 'recharts'

// Import the Enterprise Inventory component
import { EnterpriseInventory } from '@/components/modules/flooring/EnterpriseInventory'

// Build Inventory - Standalone Product with Enhanced Features
export function BuildInventory({ token, user, clientModules = [] }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [syncStatus, setSyncStatus] = useState({ synced: 0, pending: 0, modules: [], syncedModule: null })
  const [loading, setLoading] = useState(false)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [selectedModuleForSync, setSelectedModuleForSync] = useState(null)
  const [products, setProducts] = useState([])
  const [productSummary, setProductSummary] = useState({})
  const [showAddProductDialog, setShowAddProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [syncConfig, setSyncConfig] = useState(null)
  
  // Dispatch State
  const [dispatches, setDispatches] = useState([])
  const [dispatchStats, setDispatchStats] = useState({})
  const [showDispatchDialog, setShowDispatchDialog] = useState(false)
  const [dispatchForm, setDispatchForm] = useState({})
  const [selectedDispatch, setSelectedDispatch] = useState(null)
  const [dispatchImagePreview, setDispatchImagePreview] = useState(null)
  
  // Enhanced Dispatch Workflow State
  const [showStartDispatchDialog, setShowStartDispatchDialog] = useState(false)
  const [showLoadDispatchDialog, setShowLoadDispatchDialog] = useState(false)
  const [showDeliveryReceiptDialog, setShowDeliveryReceiptDialog] = useState(false)
  const [showChallanDialog, setShowChallanDialog] = useState(false)
  const [loadingImagePreview, setLoadingImagePreview] = useState(null)
  const [deliveryReceiptPreview, setDeliveryReceiptPreview] = useState(null)
  const [dispatchWorkflowData, setDispatchWorkflowData] = useState({})
  const loadingImageRef = useRef(null)
  const deliveryReceiptRef = useRef(null)
  
  // Reports State
  const [reportData, setReportData] = useState(null)
  const [selectedReportType, setSelectedReportType] = useState('summary')
  const [loadingReport, setLoadingReport] = useState(false)
  
  // Reservations State
  const [reservations, setReservations] = useState([])
  const [reservationStats, setReservationStats] = useState({})

  // Invoice Dispatch Sync State
  const [invoiceSyncStatus, setInvoiceSyncStatus] = useState(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncingInvoices, setSyncingInvoices] = useState(false)
  const autoSyncIntervalRef = useRef(null)

  // Dynamic Module Fields State
  const [moduleFields, setModuleFields] = useState([])
  const [moduleConfig, setModuleConfig] = useState(null)

  // File input ref for image upload
  const fileInputRef = useRef(null)

  // Memoize headers to avoid dependency issues
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token])

  // Fetch sync status and configuration
  const fetchSyncStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/sync', { headers: getHeaders() })
      const data = await res.json()
      if (data.summary) {
        const syncedModules = Object.keys(data.summary.byModule || {})
        setSyncStatus({
          synced: data.summary.totalSynced || 0,
          pending: data.summary.pendingSync || 0,
          lastSync: data.summary.lastSync,
          modules: Object.entries(data.summary.byModule || {}).map(([id, info]) => ({
            id,
            name: info.moduleName,
            count: info.count
          })),
          syncedModule: syncedModules.length > 0 ? syncedModules[0] : null
        })
      }
      
      // Fetch sync configuration
      const configRes = await fetch('/api/inventory/sync/config', { headers: getHeaders() })
      const configData = await configRes.json()
      if (configData.config) {
        setSyncConfig(configData.config)
        // Fetch module fields for the synced module
        if (configData.config.syncedModuleId) {
          fetchModuleFields(configData.config.syncedModuleId)
        }
      }
    } catch (error) {
      console.error('Sync status fetch error:', error)
    }
  }, [token, getHeaders])

  // Fetch dynamic module fields based on synced module
  const fetchModuleFields = useCallback(async (moduleId) => {
    if (!token) return
    try {
      const url = moduleId 
        ? `/api/inventory/module-fields?moduleId=${moduleId}`
        : '/api/inventory/module-fields'
      const res = await fetch(url, { headers: getHeaders() })
      const data = await res.json()
      if (data.fields) {
        setModuleFields(data.fields)
        setModuleConfig({
          name: data.name,
          unit: data.unit,
          gstRate: data.gstRate,
          moduleId: data.moduleId
        })
      }
    } catch (error) {
      console.error('Module fields fetch error:', error)
    }
  }, [token, getHeaders])

  // Fetch inventory products
  const fetchProducts = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/products', { headers: getHeaders() })
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
      if (data.summary) {
        setProductSummary(data.summary)
      }
    } catch (error) {
      console.error('Products fetch error:', error)
    }
  }, [token, getHeaders])

  // Fetch dispatches
  const fetchDispatches = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/dispatch', { headers: getHeaders() })
      const data = await res.json()
      if (data.dispatches) {
        setDispatches(data.dispatches)
      }
      if (data.stats) {
        setDispatchStats(data.stats)
      }
    } catch (error) {
      console.error('Dispatch fetch error:', error)
    }
  }, [token, getHeaders])

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/reserve', { headers: getHeaders() })
      const data = await res.json()
      if (data.reservations) {
        setReservations(data.reservations)
      }
      if (data.stats) {
        setReservationStats(data.stats)
      }
    } catch (error) {
      console.error('Reservations fetch error:', error)
    }
  }, [token, getHeaders])

  // Fetch invoice sync status
  const fetchInvoiceSyncStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/dispatch/sync', { headers: getHeaders() })
      const data = await res.json()
      setInvoiceSyncStatus(data)
      setAutoSyncEnabled(data.autoSyncEnabled ?? true)
    } catch (error) {
      console.error('Invoice sync status fetch error:', error)
    }
  }, [token, getHeaders])

  // Sync dispatches from invoices
  const syncDispatchesFromInvoices = useCallback(async (invoiceIds = null, syncAll = true) => {
    if (!token) return
    setSyncingInvoices(true)
    try {
      const res = await fetch('/api/inventory/dispatch/sync', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invoiceIds, syncAll })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0) {
          toast.success(`${data.synced} dispatch(es) synced from invoices`)
          fetchDispatches()
        }
        fetchInvoiceSyncStatus()
      }
      return data
    } catch (error) {
      console.error('Invoice sync error:', error)
    } finally {
      setSyncingInvoices(false)
    }
  }, [token, getHeaders, fetchDispatches, fetchInvoiceSyncStatus])

  // Toggle auto-sync
  const toggleAutoSync = useCallback(async (enabled) => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/dispatch/sync', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ autoSyncEnabled: enabled, syncInterval: 3000 })
      })
      if (res.ok) {
        setAutoSyncEnabled(enabled)
        toast.success(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`)
      }
    } catch (error) {
      console.error('Toggle auto-sync error:', error)
    }
  }, [token, getHeaders])

  // Fetch reports
  const fetchReport = useCallback(async (type = 'summary') => {
    if (!token) return
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/inventory/reports?type=${type}`, { headers: getHeaders() })
      const data = await res.json()
      setReportData(data)
    } catch (error) {
      console.error('Report fetch error:', error)
      toast.error('Failed to load report')
    } finally {
      setLoadingReport(false)
    }
  }, [token, getHeaders])

  useEffect(() => {
    if (token) {
      fetchSyncStatus()
      fetchProducts()
      fetchDispatches()
      fetchReservations()
      fetchInvoiceSyncStatus()
    }
  }, [token, fetchSyncStatus, fetchProducts, fetchDispatches, fetchReservations, fetchInvoiceSyncStatus])

  // Auto-sync dispatches from invoices every 3 seconds
  useEffect(() => {
    if (token && autoSyncEnabled && activeTab === 'dispatch') {
      // Clear any existing interval
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current)
      }
      
      // Set up 3-second polling for invoice sync
      autoSyncIntervalRef.current = setInterval(async () => {
        try {
          // First check if there are pending invoices
          const statusRes = await fetch('/api/inventory/dispatch/sync', { headers: getHeaders() })
          const statusData = await statusRes.json()
          
          if (statusData.pendingCount > 0) {
            // Auto-sync pending invoices
            await syncDispatchesFromInvoices(null, true)
          }
          
          // Refresh dispatch list
          await fetchDispatches()
          setInvoiceSyncStatus(statusData)
        } catch (error) {
          console.error('Auto-sync error:', error)
        }
      }, 3000) // 3 seconds
      
      return () => {
        if (autoSyncIntervalRef.current) {
          clearInterval(autoSyncIntervalRef.current)
        }
      }
    }
  }, [token, autoSyncEnabled, activeTab, fetchDispatches, syncDispatchesFromInvoices, getHeaders])

  // Load report when tab changes
  useEffect(() => {
    if (activeTab === 'reports' && token) {
      fetchReport(selectedReportType)
    }
  }, [activeTab, selectedReportType, token, fetchReport])

  // Check if a module is already synced
  const isSyncLocked = () => {
    return syncConfig?.syncedModuleId && syncConfig.syncedModuleId !== null
  }

  // Trigger sync from a CRM module
  const handleSync = async (moduleId, syncAll = true) => {
    if (isSyncLocked() && syncConfig.syncedModuleId !== moduleId) {
      toast.error(`Inventory can only sync with one module. Currently synced with: ${syncConfig.syncedModuleName || 'another module'}`)
      setShowSyncDialog(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ moduleId, syncAll })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Sync completed')
        fetchSyncStatus()
        fetchProducts()
        // Fetch module fields for the newly synced module
        fetchModuleFields(moduleId)
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setLoading(false)
      setShowSyncDialog(false)
      setSelectedModuleForSync(null)
    }
  }

  // Disconnect sync from current module
  const handleDisconnectSync = async () => {
    if (!confirm('Are you sure you want to disconnect sync? Products will remain but won\'t receive updates.')) return
    
    try {
      setLoading(true)
      const res = await fetch('/api/inventory/sync/config', {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        toast.success('Sync disconnected')
        fetchSyncStatus()
        setSyncConfig(null)
      } else {
        toast.error('Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  // ========== DISPATCH WORKFLOW FUNCTIONS ==========

  // Render dispatch status badge with progress indicator
  const renderDispatchStatus = (dispatch) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
      loaded: { label: 'Loaded', color: 'bg-blue-100 text-blue-700', icon: Package },
      in_transit: { label: 'In Transit', color: 'bg-purple-100 text-purple-700', icon: Truck },
      delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
    }
    const config = statusConfig[dispatch.status] || statusConfig.pending
    const Icon = config.icon

    return (
      <div className="flex flex-col gap-1">
        <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {dispatch.status === 'pending' && dispatch.dispatchStartedAt && (
          <span className="text-xs text-blue-600">Started</span>
        )}
        {dispatch.goodsLoadedAt && (
          <span className="text-xs text-slate-500">
            Loaded: {new Date(dispatch.goodsLoadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {dispatch.transitStartedAt && (
          <span className="text-xs text-slate-500">
            Departed: {new Date(dispatch.transitStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {dispatch.deliveredAt && (
          <span className="text-xs text-emerald-600">
            Delivered: {new Date(dispatch.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    )
  }

  // Render workflow action button based on dispatch status
  const renderWorkflowButton = (dispatch) => {
    // Pending - no transporter details yet
    if (dispatch.status === 'pending' && !dispatch.dispatchStartedAt) {
      return (
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => {
            setSelectedDispatch(dispatch)
            setDispatchWorkflowData({})
            setShowStartDispatchDialog(true)
          }}
        >
          <Truck className="h-3 w-3 mr-1" />
          Start Dispatch
        </Button>
      )
    }

    // Pending - transporter details entered, need to load goods
    if (dispatch.status === 'pending' && dispatch.dispatchStartedAt && !dispatch.goodsLoadedAt) {
      return (
        <Button
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => {
            setSelectedDispatch(dispatch)
            setLoadingImagePreview(null)
            setDispatchWorkflowData({})
            setShowLoadDispatchDialog(true)
          }}
        >
          <Package className="h-3 w-3 mr-1" />
          Load Goods
        </Button>
      )
    }

    // Loaded - can mark as in transit (requires image)
    if (dispatch.status === 'loaded') {
      return (
        <Button
          size="sm"
          className="bg-purple-500 hover:bg-purple-600 text-white"
          onClick={() => handleStartTransit(dispatch)}
        >
          <Send className="h-3 w-3 mr-1" />
          Start Transit
        </Button>
      )
    }

    // In Transit - can mark as delivered (requires receipt)
    if (dispatch.status === 'in_transit') {
      return (
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => {
            setSelectedDispatch(dispatch)
            setDeliveryReceiptPreview(null)
            setDispatchWorkflowData({})
            setShowDeliveryReceiptDialog(true)
          }}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Mark Delivered
        </Button>
      )
    }

    // Delivered - show view receipt
    if (dispatch.status === 'delivered') {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewChallan(dispatch)}
          >
            <FileText className="h-3 w-3 mr-1" />
            Challan
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewReceipt(dispatch)}
          >
            <Receipt className="h-3 w-3 mr-1" />
            Receipt
          </Button>
        </div>
      )
    }

    return null
  }

  // Handle Start Dispatch workflow action
  const handleStartDispatchSubmit = async () => {
    if (!selectedDispatch) return
    
    const { transporterName, vehicleNumber, driverName, driverPhone, estimatedDeliveryDate } = dispatchWorkflowData
    
    if (!vehicleNumber) {
      toast.error('Vehicle number is required')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/dispatch/workflow', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          dispatchId: selectedDispatch.id,
          action: 'start_dispatch',
          data: {
            transporterName,
            vehicleNumber,
            driverName,
            driverPhone,
            estimatedDeliveryDate
          }
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Dispatch started successfully!')
        fetchDispatches()
        setShowStartDispatchDialog(false)
        setSelectedDispatch(null)
      } else {
        toast.error(data.error || 'Failed to start dispatch')
      }
    } catch (error) {
      toast.error('Failed to start dispatch')
    } finally {
      setLoading(false)
    }
  }

  // Handle Load Goods workflow action
  const handleLoadGoodsSubmit = async () => {
    if (!selectedDispatch) return
    
    if (!loadingImagePreview) {
      toast.error('Please upload a loading image')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/dispatch/workflow', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          dispatchId: selectedDispatch.id,
          action: 'load_goods',
          data: {
            loadingImage: loadingImagePreview,
            loadingNotes: dispatchWorkflowData.loadingNotes,
            packageCount: dispatchWorkflowData.packageCount,
            totalWeight: dispatchWorkflowData.totalWeight
          }
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Goods loaded and Delivery Challan generated!')
        fetchDispatches()
        setShowLoadDispatchDialog(false)
        setSelectedDispatch(null)
        // Show challan dialog
        if (data.challan) {
          setDispatchWorkflowData({ challan: data.challan })
          setShowChallanDialog(true)
        }
      } else {
        toast.error(data.error || 'Failed to load goods')
      }
    } catch (error) {
      toast.error('Failed to load goods')
    } finally {
      setLoading(false)
    }
  }

  // Handle Start Transit
  const handleStartTransit = async (dispatch) => {
    if (!dispatch.loadingImage) {
      toast.error('Loading image is required before starting transit')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/dispatch/workflow', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          dispatchId: dispatch.id,
          action: 'start_transit'
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Vehicle departed - goods in transit! WhatsApp notification sent.')
        fetchDispatches()
      } else {
        toast.error(data.error || 'Failed to start transit')
      }
    } catch (error) {
      toast.error('Failed to start transit')
    } finally {
      setLoading(false)
    }
  }

  // Handle Mark Delivered workflow action
  const handleMarkDeliveredSubmit = async () => {
    if (!selectedDispatch) return
    
    const { receiverName, receiverPhone, receiverDesignation, deliveryCondition, deliveryNotes } = dispatchWorkflowData
    
    if (!receiverName) {
      toast.error('Receiver name is required')
      return
    }

    if (!deliveryReceiptPreview) {
      toast.error('Please upload signed delivery receipt')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/dispatch/workflow', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          dispatchId: selectedDispatch.id,
          action: 'mark_delivered',
          data: {
            receiverName,
            receiverPhone,
            receiverDesignation,
            signedReceiptImage: deliveryReceiptPreview,
            deliveryCondition: deliveryCondition || 'good',
            deliveryNotes
          }
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Delivery confirmed and receipt recorded!')
        fetchDispatches()
        setShowDeliveryReceiptDialog(false)
        setSelectedDispatch(null)
      } else {
        toast.error(data.error || 'Failed to mark as delivered')
      }
    } catch (error) {
      toast.error('Failed to mark as delivered')
    } finally {
      setLoading(false)
    }
  }

  // Handle image upload for loading
  const handleLoadingImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setLoadingImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle image upload for delivery receipt
  const handleDeliveryReceiptUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setDeliveryReceiptPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // View Challan
  const handleViewChallan = async (dispatch) => {
    try {
      const res = await fetch(`/api/inventory/challan?dispatchId=${dispatch.id}`, { headers: getHeaders() })
      const data = await res.json()
      if (data.challans?.length > 0) {
        setDispatchWorkflowData({ challan: data.challans[0], dispatch })
        setShowChallanDialog(true)
      } else {
        toast.error('Challan not found')
      }
    } catch (error) {
      toast.error('Failed to fetch challan')
    }
  }

  // View Receipt
  const handleViewReceipt = async (dispatch) => {
    try {
      const res = await fetch(`/api/inventory/receipt?dispatchId=${dispatch.id}`, { headers: getHeaders() })
      const data = await res.json()
      if (data.receipts?.length > 0) {
        setDispatchWorkflowData({ receipt: data.receipts[0], dispatch })
        setShowDeliveryReceiptDialog(true)
      } else {
        toast.error('Delivery receipt not found')
      }
    } catch (error) {
      toast.error('Failed to fetch receipt')
    }
  }

  // Add/Update product
  const handleSaveProduct = async () => {
    if (!productForm.name) {
      toast.error('Product name is required')
      return
    }

    try {
      setLoading(true)
      const url = editingProduct ? '/api/inventory/products' : '/api/inventory/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const payload = editingProduct ? { id: editingProduct.id, ...productForm } : productForm

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product added')
        fetchProducts()
        setShowAddProductDialog(false)
        setEditingProduct(null)
        setProductForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save product')
      }
    } catch (error) {
      toast.error('Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Delete this product?')) return

    try {
      const res = await fetch(`/api/inventory/products?id=${productId}`, {
        method: 'DELETE',
        headers: getHeaders()
      })

      if (res.ok) {
        toast.success('Product deleted')
        fetchProducts()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete')
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  // Create dispatch
  const handleCreateDispatch = async () => {
    if (!dispatchForm.customerName || !dispatchForm.items || dispatchForm.items.length === 0) {
      toast.error('Customer name and items are required')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/dispatch', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...dispatchForm,
          dispatchImage: dispatchImagePreview
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Dispatch ${data.dispatchNumber} created`)
        fetchDispatches()
        setShowDispatchDialog(false)
        setDispatchForm({})
        setDispatchImagePreview(null)
        
        // Offer to send WhatsApp notification
        if (dispatchForm.customerPhone) {
          const sendNotif = confirm('Send WhatsApp notification to customer?')
          if (sendNotif) {
            handleSendWhatsAppNotification(data.id)
          }
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create dispatch')
      }
    } catch (error) {
      toast.error('Failed to create dispatch')
    } finally {
      setLoading(false)
    }
  }

  // Update dispatch status
  const handleUpdateDispatchStatus = async (dispatchId, newStatus) => {
    try {
      const res = await fetch('/api/inventory/dispatch', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ id: dispatchId, status: newStatus })
      })

      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`)
        fetchDispatches()
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  // Send WhatsApp notification (Mocked)
  const handleSendWhatsAppNotification = async (dispatchId) => {
    try {
      const res = await fetch('/api/inventory/dispatch/notify', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ dispatchId })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('WhatsApp notification sent (MOCKED)')
        fetchDispatches()
      } else {
        toast.error(data.error || 'Failed to send notification')
      }
    } catch (error) {
      toast.error('Failed to send notification')
    }
  }

  // Handle image upload for dispatch
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setDispatchImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Get synced module fields for manual product entry (now uses dynamic fields)
  const getSyncedModuleFields = () => {
    // Return dynamically fetched fields
    if (moduleFields && moduleFields.length > 0) {
      return moduleFields
    }
    
    // Fallback to hardcoded fields if API hasn't returned yet
    if (!syncConfig?.syncedModuleId) return []
    
    const fallbackFields = {
      'wooden-flooring': [
        { key: 'woodType', label: 'Wood Type', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'thickness', label: 'Thickness (mm)', type: 'number' },
        { key: 'width', label: 'Width (mm)', type: 'number' },
        { key: 'length', label: 'Length (mm)', type: 'number' },
        { key: 'grade', label: 'Grade', type: 'text' }
      ],
      'doors-and-windows': [
        { key: 'doorWindowType', label: 'Type', type: 'text' },
        { key: 'material', label: 'Material', type: 'text' },
        { key: 'frameWidth', label: 'Frame Width (mm)', type: 'number' },
        { key: 'frameHeight', label: 'Frame Height (mm)', type: 'number' },
        { key: 'glassType', label: 'Glass Type', type: 'text' },
        { key: 'color', label: 'Color/Finish', type: 'text' },
        { key: 'lockType', label: 'Lock Type', type: 'text' }
      ],
      'paints-coatings': [
        { key: 'paintType', label: 'Paint Type', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'coverage', label: 'Coverage (sqft/ltr)', type: 'number' },
        { key: 'dryingTime', label: 'Drying Time', type: 'text' }
      ],
      'kitchen': [
        { key: 'cabinetType', label: 'Cabinet Type', type: 'text' },
        { key: 'material', label: 'Material', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'width', label: 'Width (mm)', type: 'number' },
        { key: 'height', label: 'Height (mm)', type: 'number' },
        { key: 'depth', label: 'Depth (mm)', type: 'number' }
      ],
      'modular-furniture': [
        { key: 'furnitureType', label: 'Furniture Type', type: 'text' },
        { key: 'material', label: 'Material', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'width', label: 'Width (mm)', type: 'number' },
        { key: 'height', label: 'Height (mm)', type: 'number' },
        { key: 'depth', label: 'Depth (mm)', type: 'number' }
      ],
      'furniture': [
        { key: 'material', label: 'Material', type: 'text' },
        { key: 'style', label: 'Style', type: 'text' },
        { key: 'dimensions', label: 'Dimensions', type: 'text' },
        { key: 'color', label: 'Color', type: 'text' }
      ]
    }
    
    return fallbackFields[syncConfig.syncedModuleId] || []
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Only show modules that are actually enabled for this client
  const enabledClientModules = clientModules.filter(m => m.enabled)

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-7 w-7" />
                Build Inventory
              </h2>
              <p className="text-emerald-100 mt-1">Enterprise Inventory Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowSyncDialog(true)}>
                <Link2 className="h-4 w-4 mr-2" /> Sync CRM
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('dispatch')}>
                <Truck className="h-4 w-4 mr-2" /> Dispatch
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('inventory')}>
                Open Inventory <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status Alert */}
      {syncConfig?.syncedModuleId && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800">
                    Synced with: {syncConfig.syncedModuleName}
                  </p>
                  <p className="text-sm text-emerald-600">
                    Two-way sync enabled • Last synced: {syncConfig.lastSyncAt ? new Date(syncConfig.lastSyncAt).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleSync(syncConfig.syncedModuleId)}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Sync Now
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={handleDisconnectSync}>
                  <XCircle className="h-4 w-4 mr-1" /> Disconnect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Products"
          value={productSummary.total || 0}
          icon={Package}
          color="bg-blue-500"
          subtitle={`${productSummary.synced || 0} synced`}
        />
        <StatCard
          title="Active Products"
          value={productSummary.active || 0}
          icon={CheckCircle2}
          color="bg-emerald-500"
        />
        <StatCard
          title="Pending Dispatch"
          value={dispatchStats.pending || 0}
          icon={Truck}
          color="bg-amber-500"
        />
        <StatCard
          title="In Transit"
          value={dispatchStats.inTransit || 0}
          icon={Send}
          color="bg-blue-500"
        />
        <StatCard
          title="Reserved Items"
          value={reservationStats.active || 0}
          icon={Lock}
          color="bg-purple-500"
        />
      </div>

      {/* CRM Module Sync Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                CRM Module Sync
              </CardTitle>
              <CardDescription>
                {isSyncLocked() 
                  ? `Connected to ${syncConfig.syncedModuleName} - Two-way sync active`
                  : 'Connect to ONE CRM module for product sync'}
              </CardDescription>
            </div>
            {isSyncLocked() && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <Lock className="h-3 w-3 mr-1" /> Locked to {syncConfig.syncedModuleName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {enabledClientModules.length > 0 ? (
            <div className="space-y-3">
              {enabledClientModules.map(module => {
                const syncInfo = syncStatus.modules.find(s => s.id === module.id)
                const isCurrentSync = syncConfig?.syncedModuleId === module.id
                const isLocked = isSyncLocked() && !isCurrentSync
                
                return (
                  <div 
                    key={module.id} 
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      isCurrentSync ? 'bg-emerald-50 border border-emerald-200' :
                      isLocked ? 'bg-slate-50 opacity-60' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg shadow-sm ${isCurrentSync ? 'bg-emerald-500' : 'bg-white'}`}>
                        <Package className={`h-5 w-5 ${isCurrentSync ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {module.name}
                          {isCurrentSync && <Badge className="bg-emerald-500 text-white text-xs">Connected</Badge>}
                          {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
                        </p>
                        <p className="text-sm text-slate-500">
                          {syncInfo ? `${syncInfo.count} products synced` : 'Not synced yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentSync ? (
                        <>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(module.id)}
                            disabled={loading}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Sync Now
                          </Button>
                        </>
                      ) : isLocked ? (
                        <Badge variant="outline" className="text-slate-400">
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedModuleForSync(module)
                            setShowSyncDialog(true)
                          }}
                          disabled={loading}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Connect & Sync
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-medium text-slate-600 mb-1">No CRM Modules Enabled</h3>
              <p className="text-sm text-slate-500">
                Enable modules in Build CRM to sync products to inventory
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        <QuickActionCard
          title="Products"
          description="View & manage all products"
          icon={Package}
          onClick={() => setActiveTab('products')}
        />
        <QuickActionCard
          title="Dispatch"
          description="Manage dispatches"
          icon={Truck}
          onClick={() => setActiveTab('dispatch')}
        />
        <QuickActionCard
          title="Reports"
          description="View inventory reports"
          icon={BarChart3}
          onClick={() => setActiveTab('reports')}
        />
        <QuickActionCard
          title="Inventory"
          description="Stock & warehouses"
          icon={Warehouse}
          onClick={() => setActiveTab('inventory')}
        />
      </div>

      {/* Recent Dispatches */}
      {dispatches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Recent Dispatches
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('dispatch')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dispatches.slice(0, 5).map(dispatch => (
                <div key={dispatch.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      dispatch.status === 'delivered' ? 'bg-emerald-100' :
                      dispatch.status === 'in_transit' ? 'bg-blue-100' :
                      dispatch.status === 'cancelled' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <Truck className={`h-4 w-4 ${
                        dispatch.status === 'delivered' ? 'text-emerald-600' :
                        dispatch.status === 'in_transit' ? 'text-blue-600' :
                        dispatch.status === 'cancelled' ? 'text-red-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{dispatch.dispatchNumber}</p>
                      <p className="text-sm text-slate-500">{dispatch.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      dispatch.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      dispatch.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                      dispatch.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }>
                      {dispatch.status?.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(dispatch.dispatchDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Products Tab View
  const renderProductsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-slate-500">
            {productSummary.total || 0} products • {productSummary.synced || 0} from CRM • {productSummary.manual || 0} manual
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => {
            setEditingProduct(null)
            setProductForm({
              category: syncConfig?.syncedModuleName || 'General',
              unit: syncConfig?.syncedModuleId === 'wooden-flooring' ? 'sqft' : 
                    syncConfig?.syncedModuleId === 'paints-coatings' ? 'ltr' : 'pcs',
              gstRate: 18
            })
            setShowAddProductDialog(true)
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Sync Info Banner */}
      {syncConfig?.syncedModuleId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <AlertCircle className="h-4 w-4" />
              <span>
                Products are synced with <strong>{syncConfig.syncedModuleName}</strong>. 
                Manual products will use the same fields for consistency.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {productSummary.categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No products found. {!syncConfig?.syncedModuleId && 'Connect to a CRM module or add products manually.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{product.sku}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">₹{product.sellingPrice?.toLocaleString()}</p>
                        {product.costPrice && (
                          <p className="text-xs text-slate-500">Cost: ₹{product.costPrice?.toLocaleString()}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.sourceType === 'crm_module' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                        {product.sourceType === 'crm_module' ? (
                          <><Link2 className="h-3 w-3 mr-1" /> {product.sourceModuleName || 'CRM'}</>
                        ) : (
                          <><Edit className="h-3 w-3 mr-1" /> Manual</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {product.active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product)
                            setProductForm({
                              name: product.name,
                              sku: product.sku,
                              description: product.description,
                              category: product.category,
                              costPrice: product.costPrice,
                              sellingPrice: product.sellingPrice,
                              mrp: product.mrp,
                              unit: product.unit,
                              gstRate: product.gstRate,
                              hsnCode: product.hsnCode,
                              reorderLevel: product.reorderLevel,
                              attributes: product.attributes || {}
                            })
                            setShowAddProductDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {product.sourceType !== 'crm_module' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  // Dispatch Tab View
  const renderDispatchTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-7 w-7" />
            Dispatch Management
          </h2>
          <p className="text-slate-500">Dispatches are automatically created from invoices via Build Finance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => syncDispatchesFromInvoices(null, true)} disabled={syncingInvoices}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncingInvoices ? 'animate-spin' : ''}`} />
            Sync from Invoices
          </Button>
        </div>
      </div>

      {/* Info Banner - No Manual Dispatch */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Dispatches & Challans Sync from Invoices</p>
              <p className="text-sm text-blue-600">
                All dispatches and delivery challans are automatically created when invoices are generated in Build Finance. 
                No manual dispatch creation is allowed to ensure accurate inventory tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Sync Status Banner */}
      <Card className={`border ${autoSyncEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {autoSyncEnabled ? (
                <div className="p-2 rounded-full bg-emerald-100">
                  <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-slate-100">
                  <RefreshCw className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <div>
                <p className={`font-medium ${autoSyncEnabled ? 'text-emerald-800' : 'text-slate-600'}`}>
                  {autoSyncEnabled ? 'Auto-Sync Active' : 'Auto-Sync Disabled'}
                </p>
                <p className={`text-sm ${autoSyncEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {autoSyncEnabled 
                    ? 'Dispatches sync from invoices every 3 seconds'
                    : 'Enable auto-sync to automatically create dispatches from invoices'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {invoiceSyncStatus && (
                <div className="text-right mr-4">
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{invoiceSyncStatus.pendingCount || 0}</span> pending invoices
                  </p>
                  {invoiceSyncStatus.lastSyncAt && (
                    <p className="text-xs text-slate-400">
                      Last sync: {new Date(invoiceSyncStatus.lastSyncAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-sync" className="text-sm">Auto-Sync</Label>
                <Switch 
                  id="auto-sync"
                  checked={autoSyncEnabled} 
                  onCheckedChange={toggleAutoSync}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invoice Alert */}
      {invoiceSyncStatus?.pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    {invoiceSyncStatus.pendingCount} Invoice(s) Ready for Dispatch
                  </p>
                  <p className="text-sm text-amber-600">
                    Click sync to create dispatch records for these invoices
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => syncDispatchesFromInvoices(null, true)}
                disabled={syncingInvoices}
              >
                {syncingInvoices ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Sync Now</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Dispatches" value={dispatchStats.total || 0} icon={Truck} color="bg-slate-500" />
        <StatCard title="Pending" value={dispatchStats.pending || 0} icon={Clock} color="bg-amber-500" />
        <StatCard title="In Transit" value={dispatchStats.inTransit || 0} icon={Send} color="bg-blue-500" />
        <StatCard title="Delivered" value={dispatchStats.delivered || 0} icon={CheckCircle2} color="bg-emerald-500" />
      </div>

      {/* Dispatches List */}
      <Card>
        <CardHeader>
          <CardTitle>All Dispatches</CardTitle>
          <CardDescription>Click on a dispatch to manage its workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {dispatches.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-medium text-slate-600">No Dispatches Yet</h3>
              <p className="text-sm text-slate-500">Create your first dispatch to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatch #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.map(dispatch => (
                  <TableRow key={dispatch.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{dispatch.dispatchNumber}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-slate-500">
                            {new Date(dispatch.dispatchDate).toLocaleDateString()}
                          </p>
                          {dispatch.sourceType === 'invoice_sync' && (
                            <Badge className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700">Auto</Badge>
                          )}
                        </div>
                        {dispatch.invoiceNumber && (
                          <p className="text-xs text-blue-600">Invoice: {dispatch.invoiceNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dispatch.customerName}</p>
                        {dispatch.customerPhone && (
                          <p className="text-xs text-slate-500">{dispatch.customerPhone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dispatch.items?.length || 0} items</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">₹{(dispatch.totalValue || 0).toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      {dispatch.transporter?.vehicleNumber ? (
                        <div>
                          <p className="font-mono text-sm">{dispatch.transporter.vehicleNumber}</p>
                          {dispatch.transporter.driverName && (
                            <p className="text-xs text-slate-500">{dispatch.transporter.driverName}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderDispatchStatus(dispatch)}
                    </TableCell>
                    <TableCell>
                      {renderWorkflowButton(dispatch)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {dispatch.deliveryReceiptId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewChallan(dispatch)}
                            title="View Challan"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDispatch(dispatch)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Chart Colors
  const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']

  // Reports Tab View with 15+ Graphical Representations
  const renderReportsTab = () => {
    const charts = reportData?.charts || {}
    
    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            Inventory Analytics & Reports
          </h2>
          <p className="text-slate-500">15+ real-time visualizations with dynamic data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedReportType} onValueChange={setSelectedReportType}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Report" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">Comprehensive Dashboard</SelectItem>
              <SelectItem value="stock_levels">Stock Levels</SelectItem>
              <SelectItem value="movements">Movement Report</SelectItem>
              <SelectItem value="dispatch_history">Dispatch History</SelectItem>
              <SelectItem value="low_stock">Low Stock Alert</SelectItem>
              <SelectItem value="valuation">Stock Valuation</SelectItem>
              <SelectItem value="category_analysis">Category Analysis</SelectItem>
              <SelectItem value="reservation_analysis">Reservation Analysis</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchReport(selectedReportType)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {loadingReport ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading comprehensive report data...</p>
          </CardContent>
        </Card>
      ) : reportData ? (
        <>
          {/* COMPREHENSIVE DASHBOARD with 15+ Charts */}
          {(selectedReportType === 'comprehensive' || selectedReportType === 'summary') && (
            <div className="space-y-6">
              {/* 1-4: Summary Cards */}
              {reportData.summaryCards && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {reportData.summaryCards.map((card, i) => (
                    <Card key={i} className="relative overflow-hidden">
                      <CardContent className="p-4">
                        <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 ${
                          card.color === 'emerald' ? 'bg-emerald-500' :
                          card.color === 'amber' ? 'bg-amber-500' :
                          card.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />
                        <p className="text-sm text-slate-500">{card.title}</p>
                        <p className="text-2xl font-bold mt-1">
                          {card.format === 'currency' ? `₹${(card.value || 0).toLocaleString()}` : card.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Monthly Stats Row */}
              {reportData.monthlyStats && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      This Month&apos;s Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <p className="text-xs text-slate-500">Dispatches</p>
                        <p className="text-xl font-bold">{reportData.monthlyStats.totalDispatches}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-600">Delivered</p>
                        <p className="text-xl font-bold text-emerald-700">{reportData.monthlyStats.delivered}</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg text-center">
                        <p className="text-xs text-amber-600">Pending</p>
                        <p className="text-xl font-bold text-amber-700">{reportData.monthlyStats.pending}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-xs text-blue-600">In Transit</p>
                        <p className="text-xl font-bold text-blue-700">{reportData.monthlyStats.inTransit || 0}</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg text-center">
                        <p className="text-xs text-purple-600">Challans</p>
                        <p className="text-xl font-bold text-purple-700">{reportData.monthlyStats.challansGenerated || 0}</p>
                      </div>
                      <div className="p-3 bg-slate-100 rounded-lg text-center">
                        <p className="text-xs text-slate-600">Value</p>
                        <p className="text-lg font-bold">₹{(reportData.monthlyStats.dispatchValue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Charts Row 1: Stock by Category & Dispatch Status */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 5. Stock Levels by Category (Bar Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Stock Value by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={charts.stockByCategory || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                        <Tooltip 
                          formatter={(value) => [`₹${value?.toLocaleString()}`, 'Value']}
                          contentStyle={{ borderRadius: 8 }}
                        />
                        <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 6. Dispatch Status Breakdown (Donut Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dispatch Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={charts.dispatchByStatus || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="count"
                          nameKey="label"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {(charts.dispatchByStatus || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2: Movement Trend & Daily Dispatch */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 7. Inventory Movement Trend (Line Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Inventory Movement Trend (6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={charts.movementTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Legend />
                        <Line type="monotone" dataKey="inward" stroke="#10B981" name="Inward" strokeWidth={2} />
                        <Line type="monotone" dataKey="outward" stroke="#EF4444" name="Outward" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 8. Daily Dispatch Volume (Area Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Daily Dispatch Volume (30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={charts.dailyDispatchVolume || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => [`₹${v?.toLocaleString()}`, 'Value']} />
                        <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 3: Fast & Slow Moving Items */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 9. Fast Moving Items (Horizontal Bar) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Top 10 Fast-Moving Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={(charts.fastMovingItems || []).slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="productName" type="category" tick={{ fontSize: 10 }} width={120} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Bar dataKey="totalQty" fill="#10B981" radius={[0, 4, 4, 0]} name="Qty Moved" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 10. Slow Moving Items (Horizontal Bar) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-amber-500" />
                      Top 10 Slow-Moving Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={(charts.slowMovingItems || []).slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="productName" type="category" tick={{ fontSize: 10 }} width={120} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Bar dataKey="stockQty" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Stock Qty" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 4: Stock Location & Reservation Status */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 11. Stock by Location (Pie Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Stock Distribution by Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={charts.stockByLocation || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          nameKey="location"
                          label={({ location, percent }) => `${location} ${(percent * 100).toFixed(0)}%`}
                        >
                          {(charts.stockByLocation || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`₹${v?.toLocaleString()}`, 'Value']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 12. Reservation Status (Pie Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-500" />
                      Inventory Reservation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={charts.reservationStatus || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="count"
                          nameKey="label"
                          label={({ label, count }) => `${label}: ${count}`}
                        >
                          {(charts.reservationStatus || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 5: Blocked vs Available & Weekly Dispatch */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 13. Blocked vs Available Stock (Stacked Bar) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Available vs Blocked Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={charts.stockComparison || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="product" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="available" stackId="a" fill="#10B981" name="Available" />
                        <Bar dataKey="blocked" stackId="a" fill="#8B5CF6" name="Blocked" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 14. Weekly Dispatch Trend (Bar Chart) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Weekly Dispatch Trend (12 Weeks)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={charts.weeklyDispatch || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="delivered" fill="#10B981" name="Delivered" />
                        <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 6: Top Customers & Stock Age */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 15. Top Customers by Dispatch Value */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Top 10 Customers by Dispatch Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={(charts.topCustomers || []).slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                        <YAxis dataKey="customer" type="category" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => [`₹${v?.toLocaleString()}`, 'Value']} />
                        <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 16. Stock Age Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Stock Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={charts.ageDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => [`₹${v?.toLocaleString()}`, 'Value']} />
                        <Bar dataKey="value" fill="#F97316" radius={[4, 4, 0, 0]} name="Stock Value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Stock Health & Quote Conversion */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Stock Health Card */}
                {reportData.stockHealth && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Stock Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Healthy Stock</span>
                          <Badge className="bg-emerald-100 text-emerald-700">{reportData.stockHealth.healthyStock}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Low Stock</span>
                          <Badge className="bg-amber-100 text-amber-700">{reportData.stockHealth.lowStockCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Out of Stock</span>
                          <Badge className="bg-red-100 text-red-700">{reportData.stockHealth.outOfStockCount}</Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Active Reservations</span>
                          <Badge className="bg-purple-100 text-purple-700">{reportData.stockHealth.activeReservations}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Reserved Qty</span>
                          <span className="font-medium">{reportData.stockHealth.totalReservedQty}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quote Conversion Gauge */}
                {charts.quoteConversion && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Quote-to-Invoice Conversion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="relative inline-flex items-center justify-center">
                          <svg className="w-24 h-24">
                            <circle cx="48" cy="48" r="40" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                            <circle 
                              cx="48" cy="48" r="40" 
                              stroke="#10B981" 
                              strokeWidth="8" 
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - (charts.quoteConversion.conversionRate || 0) / 100)}`}
                              transform="rotate(-90 48 48)"
                            />
                          </svg>
                          <span className="absolute text-2xl font-bold">{charts.quoteConversion.conversionRate || 0}%</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                          {charts.quoteConversion.converted} of {charts.quoteConversion.totalQuotes} converted
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-amber-50 rounded">
                            <span className="text-amber-600">Pending: {charts.quoteConversion.pending}</span>
                          </div>
                          <div className="p-2 bg-red-50 rounded">
                            <span className="text-red-600">Expired: {charts.quoteConversion.expired}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Low Stock Alerts */}
                {reportData.lowStockItems?.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        Low Stock Alerts ({reportData.lowStockItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {reportData.lowStockItems.slice(0, 5).map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-amber-50 rounded text-sm">
                            <div className="truncate flex-1">
                              <p className="font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-slate-500">{item.sku}</p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 ml-2">
                              {item.currentStock}/{item.reorderLevel}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Stock Levels Report */}
          {selectedReportType === 'stock_levels' && reportData.products && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Stock Levels</CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      In Stock: {reportData.summary?.inStock || 0}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-700">
                      Low Stock: {reportData.summary?.lowStock || 0}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700">
                      Out of Stock: {reportData.summary?.outOfStock || 0}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Stock Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.products.map((product, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-xs text-slate-500">{product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.totalQuantity} {product.unit}</TableCell>
                        <TableCell>{product.availableQuantity} {product.unit}</TableCell>
                        <TableCell>{product.reservedQuantity} {product.unit}</TableCell>
                        <TableCell>₹{(product.stockValue || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            product.status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                            product.status === 'low_stock' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {product.status?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Report */}
          {selectedReportType === 'low_stock' && (
            <div className="space-y-6">
              {/* Out of Stock */}
              {reportData.outOfStockItems?.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <XCircle className="h-5 w-5" />
                      Out of Stock ({reportData.outOfStockItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Reorder Level</TableHead>
                          <TableHead>Suggested Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.outOfStockItems.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell><code className="text-xs">{item.sku}</code></TableCell>
                            <TableCell>{item.reorderLevel}</TableCell>
                            <TableCell className="font-medium text-red-600">{item.reorderQuantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Low Stock */}
              {reportData.lowStockItems?.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      Low Stock ({reportData.lowStockItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Reorder Level</TableHead>
                          <TableHead>Deficit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.lowStockItems.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell><code className="text-xs">{item.sku}</code></TableCell>
                            <TableCell>{item.currentStock}</TableCell>
                            <TableCell>{item.reorderLevel}</TableCell>
                            <TableCell className="font-medium text-amber-600">{item.deficit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {reportData.summary?.totalAlerts === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="font-medium text-emerald-700">All Stock Levels Healthy</h3>
                    <p className="text-sm text-slate-500">No low stock or out of stock items</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Dispatch History Report */}
          {selectedReportType === 'dispatch_history' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total" value={reportData.totalDispatches || 0} icon={Truck} color="bg-slate-500" />
                <StatCard title="Delivered" value={reportData.byStatus?.delivered?.count || 0} icon={CheckCircle2} color="bg-emerald-500" />
                <StatCard title="In Transit" value={reportData.byStatus?.in_transit?.count || 0} icon={Send} color="bg-blue-500" />
                <StatCard title="Total Value" value={`₹${(reportData.totalValue || 0).toLocaleString()}`} icon={IndianRupee} color="bg-amber-500" />
              </div>

              {/* Recent Dispatches */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Dispatches</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.recentDispatches?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dispatch #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.recentDispatches.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{d.dispatchNumber}</TableCell>
                            <TableCell>{d.customerName}</TableCell>
                            <TableCell>{d.itemCount} items</TableCell>
                            <TableCell>₹{(d.totalValue || 0).toLocaleString()}</TableCell>
                            <TableCell>{new Date(d.dispatchDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={
                                d.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                d.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }>
                                {d.status?.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-slate-500">No dispatches found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category Analysis */}
          {selectedReportType === 'category_analysis' && reportData.categories && (
            <Card>
              <CardHeader>
                <CardTitle>Category Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Total Quantity</TableHead>
                      <TableHead>Cost Value</TableHead>
                      <TableHead>Retail Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.categories.map((cat, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>{cat.productCount}</TableCell>
                        <TableCell>{cat.totalQuantity}</TableCell>
                        <TableCell>₹{(cat.totalCostValue || 0).toLocaleString()}</TableCell>
                        <TableCell>₹{(cat.totalRetailValue || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select a report type to view</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Build Inventory</h1>
                <p className="text-xs text-slate-500">Enterprise Inventory Management</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="products">
                  <Package className="h-4 w-4 mr-2" /> Products
                </TabsTrigger>
                <TabsTrigger value="dispatch">
                  <Truck className="h-4 w-4 mr-2" /> Dispatch
                </TabsTrigger>
                <TabsTrigger value="reports">
                  <PieChart className="h-4 w-4 mr-2" /> Reports
                </TabsTrigger>
                <TabsTrigger value="inventory">
                  <Warehouse className="h-4 w-4 mr-2" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                fetchSyncStatus()
                fetchProducts()
                fetchDispatches()
                if (activeTab === 'reports') fetchReport(selectedReportType)
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'products' && renderProductsTab()}

        {activeTab === 'dispatch' && renderDispatchTab()}

        {activeTab === 'reports' && renderReportsTab()}
        
        {activeTab === 'inventory' && (
          <EnterpriseInventory 
            token={token} 
            products={products}
            onRefreshProducts={fetchProducts}
          />
        )}
        
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>Configure your inventory preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sync Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Sync Configuration</h3>
                {syncConfig?.syncedModuleId ? (
                  <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Connected Module</p>
                        <p className="text-sm text-slate-500">{syncConfig.syncedModuleName}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-Way Sync</p>
                        <p className="text-sm text-slate-500">Changes sync between CRM and Inventory</p>
                      </div>
                      <Switch checked={true} disabled />
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDisconnectSync}>
                      Disconnect Sync
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Database className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No module connected. Go to Dashboard to connect.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Sync Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {isSyncLocked() ? 'Module Already Connected' : 'Connect & Sync CRM Module'}
            </DialogTitle>
            <DialogDescription>
              {isSyncLocked() ? (
                <span className="text-amber-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Inventory can only sync with ONE module at a time. Currently connected to: {syncConfig?.syncedModuleName}
                </span>
              ) : selectedModuleForSync 
                ? `Connect ${selectedModuleForSync.name} to Build Inventory for two-way sync`
                : 'Select a CRM module to sync products from'
              }
            </DialogDescription>
          </DialogHeader>
          
          {isSyncLocked() && !selectedModuleForSync ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  To sync with a different module, you must first disconnect from the current module in Settings.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowSyncDialog(false)
                  setActiveTab('settings')
                }}>
                  Go to Settings
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {!selectedModuleForSync ? (
                <div className="space-y-2">
                  <Label>Select Module</Label>
                  {enabledClientModules.map(module => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => setSelectedModuleForSync(module)}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-500" />
                        <span>{module.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedModuleForSync.name}</p>
                      <p className="text-sm text-slate-500">Ready to connect</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      All products will be synced to inventory
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Manual products will use the same fields
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Two-way sync will keep data updated
                    </p>
                    <p className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      You can only sync with ONE module
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!isSyncLocked() && selectedModuleForSync && (
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSyncDialog(false)
                setSelectedModuleForSync(null)
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSync(selectedModuleForSync.id, true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect & Sync
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {syncConfig?.syncedModuleId 
                ? `Product fields match ${syncConfig.syncedModuleName} module format`
                : 'Enter product details'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Product Name *</Label>
                <Input
                  value={productForm.name || ''}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={productForm.sku || ''}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={productForm.category || ''}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={productForm.description || ''}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <Separator />
            <h4 className="font-medium">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cost Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.costPrice || ''}
                  onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.sellingPrice || ''}
                  onChange={(e) => setProductForm({ ...productForm, sellingPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>MRP (₹)</Label>
                <Input
                  type="number"
                  value={productForm.mrp || ''}
                  onChange={(e) => setProductForm({ ...productForm, mrp: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unit</Label>
                <Select
                  value={productForm.unit || 'pcs'}
                  onValueChange={(v) => setProductForm({ ...productForm, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="sqft">Sq. Ft.</SelectItem>
                    <SelectItem value="sqm">Sq. Meter</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="ltr">Liters</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Select
                  value={String(productForm.gstRate || 18)}
                  onValueChange={(v) => setProductForm({ ...productForm, gstRate: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>HSN Code</Label>
                <Input
                  value={productForm.hsnCode || ''}
                  onChange={(e) => setProductForm({ ...productForm, hsnCode: e.target.value })}
                />
              </div>
            </div>

            {/* Module-specific fields */}
            {getSyncedModuleFields().length > 0 && (
              <>
                <Separator />
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {syncConfig?.syncedModuleName || moduleConfig?.name || 'Module'} Fields
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {getSyncedModuleFields().map(field => (
                    <div key={field.key}>
                      <Label>{field.label}</Label>
                      {field.type === 'select' && field.options ? (
                        <Select
                          value={productForm.attributes?.[field.key] || ''}
                          onValueChange={(v) => setProductForm({
                            ...productForm,
                            attributes: {
                              ...(productForm.attributes || {}),
                              [field.key]: v
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'boolean' ? (
                        <Select
                          value={productForm.attributes?.[field.key] === true ? 'yes' : productForm.attributes?.[field.key] === false ? 'no' : ''}
                          onValueChange={(v) => setProductForm({
                            ...productForm,
                            attributes: {
                              ...(productForm.attributes || {}),
                              [field.key]: v === 'yes'
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          min={field.min}
                          max={field.max}
                          value={productForm.attributes?.[field.key] || ''}
                          onChange={(e) => setProductForm({
                            ...productForm,
                            attributes: {
                              ...(productForm.attributes || {}),
                              [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                            }
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Inventory Settings */}
            <Separator />
            <h4 className="font-medium">Inventory Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={productForm.reorderLevel || ''}
                  onChange={(e) => setProductForm({ ...productForm, reorderLevel: parseInt(e.target.value) })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Reorder Quantity</Label>
                <Input
                  type="number"
                  value={productForm.reorderQuantity || ''}
                  onChange={(e) => setProductForm({ ...productForm, reorderQuantity: parseInt(e.target.value) })}
                  placeholder="50"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddProductDialog(false)
              setEditingProduct(null)
              setProductForm({})
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={loading}>
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={showDispatchDialog} onOpenChange={setShowDispatchDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Create New Dispatch
            </DialogTitle>
            <DialogDescription>
              Enter dispatch details including transporter information for customer notification
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Customer Details */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name *</Label>
                    <Input
                      value={dispatchForm.customerName || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, customerName: e.target.value })}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label>Phone (for WhatsApp)</Label>
                    <Input
                      value={dispatchForm.customerPhone || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, customerPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Delivery Address</Label>
                    <Textarea
                      value={dispatchForm.deliveryAddress || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, deliveryAddress: e.target.value })}
                      placeholder="Full delivery address"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Products Selection */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Products *
                </h4>
                <div className="space-y-3">
                  {(dispatchForm.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <Select
                          value={item.productId || ''}
                          onValueChange={(value) => {
                            const product = products.find(p => p.id === value)
                            const newItems = [...(dispatchForm.items || [])]
                            newItems[idx] = {
                              ...newItems[idx],
                              productId: value,
                              productName: product?.name,
                              sku: product?.sku,
                              unit: product?.unit || 'pcs',
                              unitPrice: product?.sellingPrice || 0
                            }
                            setDispatchForm({ ...dispatchForm, items: newItems })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const newItems = [...(dispatchForm.items || [])]
                            newItems[idx] = { ...newItems[idx], quantity: parseInt(e.target.value) || 0 }
                            setDispatchForm({ ...dispatchForm, items: newItems })
                          }}
                          placeholder="Qty"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => {
                          const newItems = (dispatchForm.items || []).filter((_, i) => i !== idx)
                          setDispatchForm({ ...dispatchForm, items: newItems })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDispatchForm({
                        ...dispatchForm,
                        items: [...(dispatchForm.items || []), { productId: '', quantity: 1 }]
                      })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Product
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Transporter Details */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Transporter Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transporter Name</Label>
                    <Input
                      value={dispatchForm.transporterName || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, transporterName: e.target.value })}
                      placeholder="Transporter name"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={dispatchForm.transporterCompany || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, transporterCompany: e.target.value })}
                      placeholder="Transport company"
                    />
                  </div>
                  <div>
                    <Label>Vehicle Number</Label>
                    <Input
                      value={dispatchForm.vehicleNumber || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                      placeholder="MH 12 AB 1234"
                    />
                  </div>
                  <div>
                    <Label>Driver Name</Label>
                    <Input
                      value={dispatchForm.driverName || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                      placeholder="Driver name"
                    />
                  </div>
                  <div>
                    <Label>Driver Phone</Label>
                    <Input
                      value={dispatchForm.driverPhone || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, driverPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Delivery & Payment */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Delivery & Payment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Delivery Date</Label>
                    <Input
                      type="date"
                      value={dispatchForm.estimatedDeliveryDate || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, estimatedDeliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Estimated Time</Label>
                    <Input
                      value={dispatchForm.estimatedDeliveryTime || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, estimatedDeliveryTime: e.target.value })}
                      placeholder="2:00 PM - 4:00 PM"
                    />
                  </div>
                  <div>
                    <Label>Delivery Cost (₹)</Label>
                    <Input
                      type="number"
                      value={dispatchForm.deliveryCost || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, deliveryCost: parseFloat(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Payment Mode</Label>
                    <Select
                      value={dispatchForm.paymentMode || 'prepaid'}
                      onValueChange={(v) => setDispatchForm({ ...dispatchForm, paymentMode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prepaid">Prepaid</SelectItem>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                        <SelectItem value="partial">Partial Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(dispatchForm.paymentMode === 'cod' || dispatchForm.paymentMode === 'partial') && (
                    <div>
                      <Label>Amount to Collect (₹)</Label>
                      <Input
                        type="number"
                        value={dispatchForm.paymentAmount || ''}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, paymentAmount: parseFloat(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Photo Upload */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Dispatch Photo
                </h4>
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {dispatchImagePreview ? (
                    <div className="relative">
                      <img
                        src={dispatchImagePreview}
                        alt="Dispatch"
                        className="w-full max-h-48 object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setDispatchImagePreview(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Click to upload dispatch image</p>
                      <p className="text-xs text-slate-400 mt-1">Max 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <Label>Special Instructions</Label>
                <Textarea
                  value={dispatchForm.specialInstructions || ''}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, specialInstructions: e.target.value })}
                  placeholder="Any special handling or delivery instructions..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDispatchDialog(false)
              setDispatchForm({})
              setDispatchImagePreview(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateDispatch} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Create Dispatch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Detail Dialog */}
      <Dialog open={!!selectedDispatch} onOpenChange={() => setSelectedDispatch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispatch Details</DialogTitle>
          </DialogHeader>
          
          {selectedDispatch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{selectedDispatch.dispatchNumber}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedDispatch.dispatchDate).toLocaleString()}
                  </p>
                </div>
                <Badge className={
                  selectedDispatch.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                  selectedDispatch.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                  selectedDispatch.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }>
                  {selectedDispatch.status?.replace('_', ' ')}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="font-medium">{selectedDispatch.customerName}</p>
                  {selectedDispatch.customerPhone && <p className="text-sm">{selectedDispatch.customerPhone}</p>}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Value</p>
                  <p className="font-medium">₹{(selectedDispatch.totalValue || 0).toLocaleString()}</p>
                </div>
              </div>

              {selectedDispatch.transporter?.vehicleNumber && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Transporter</p>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-slate-500">Vehicle:</span> {selectedDispatch.transporter.vehicleNumber}</p>
                      {selectedDispatch.transporter.driverName && (
                        <p><span className="text-slate-500">Driver:</span> {selectedDispatch.transporter.driverName}</p>
                      )}
                      {selectedDispatch.transporter.driverPhone && (
                        <p><span className="text-slate-500">Phone:</span> {selectedDispatch.transporter.driverPhone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-500 mb-2">Items ({selectedDispatch.items?.length || 0})</p>
                <div className="space-y-2">
                  {selectedDispatch.items?.map((item, i) => (
                    <div key={i} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>{item.productName}</span>
                      <span className="font-medium">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDispatch.dispatchImage && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Dispatch Image</p>
                  <img
                    src={selectedDispatch.dispatchImage}
                    alt="Dispatch"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Start Dispatch Dialog */}
      <Dialog open={showStartDispatchDialog} onOpenChange={setShowStartDispatchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Start Dispatch
            </DialogTitle>
            <DialogDescription>
              Enter transporter details to start the dispatch process
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedDispatch && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedDispatch.dispatchNumber}</p>
                <p className="text-sm text-slate-500">{selectedDispatch.customerName}</p>
                {selectedDispatch.invoiceNumber && (
                  <p className="text-xs text-blue-600">Invoice: {selectedDispatch.invoiceNumber}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transporter Name</Label>
                <Input
                  placeholder="Enter transporter name"
                  value={dispatchWorkflowData.transporterName || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, transporterName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Number *</Label>
                <Input
                  placeholder="e.g., MH-01-AB-1234"
                  value={dispatchWorkflowData.vehicleNumber || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  placeholder="Enter driver name"
                  value={dispatchWorkflowData.driverName || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, driverName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone</Label>
                <Input
                  placeholder="Enter driver phone"
                  value={dispatchWorkflowData.driverPhone || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, driverPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estimated Delivery Date</Label>
              <Input
                type="date"
                value={dispatchWorkflowData.estimatedDeliveryDate || ''}
                onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDispatchDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleStartDispatchSubmit} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
              Start Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Goods Dialog */}
      <Dialog open={showLoadDispatchDialog} onOpenChange={setShowLoadDispatchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Load Goods
            </DialogTitle>
            <DialogDescription>
              Upload loading image and package details. A Delivery Challan will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedDispatch && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedDispatch.dispatchNumber}</p>
                <p className="text-sm text-slate-500">Vehicle: {selectedDispatch.transporter?.vehicleNumber}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Loading Image *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {loadingImagePreview ? (
                  <div className="relative">
                    <img src={loadingImagePreview} alt="Loading" className="max-h-48 mx-auto rounded" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setLoadingImagePreview(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={loadingImageRef}
                      onChange={handleLoadingImageUpload}
                    />
                    <Button variant="outline" onClick={() => loadingImageRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" />
                      Upload or Take Photo
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">Take a photo of loaded goods in vehicle</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package Count</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={dispatchWorkflowData.packageCount || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, packageCount: parseInt(e.target.value) || '' }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Weight (kg)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 250"
                  value={dispatchWorkflowData.totalWeight || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, totalWeight: parseFloat(e.target.value) || '' }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Loading Notes</Label>
              <Textarea
                placeholder="Any special notes about loading..."
                value={dispatchWorkflowData.loadingNotes || ''}
                onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, loadingNotes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDispatchDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleLoadGoodsSubmit} disabled={loading || !loadingImagePreview}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              Confirm Loading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Receipt Dialog */}
      <Dialog open={showDeliveryReceiptDialog} onOpenChange={setShowDeliveryReceiptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              {dispatchWorkflowData.receipt ? 'Delivery Receipt' : 'Confirm Delivery'}
            </DialogTitle>
            <DialogDescription>
              {dispatchWorkflowData.receipt 
                ? 'View delivery receipt details' 
                : 'Upload signed delivery receipt to confirm delivery'}
            </DialogDescription>
          </DialogHeader>
          
          {dispatchWorkflowData.receipt ? (
            // View Receipt Mode
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-emerald-800">DELIVERY RECEIPT</h3>
                  <p className="text-emerald-600 font-mono">{dispatchWorkflowData.receipt.receiptNumber}</p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Delivered To</p>
                    <p className="font-medium">{dispatchWorkflowData.receipt.customerName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Delivered At</p>
                    <p className="font-medium">{new Date(dispatchWorkflowData.receipt.deliveredAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Received By</p>
                    <p className="font-medium">{dispatchWorkflowData.receipt.receiverName}</p>
                    {dispatchWorkflowData.receipt.receiverDesignation && (
                      <p className="text-xs text-slate-500">{dispatchWorkflowData.receipt.receiverDesignation}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-500">Condition</p>
                    <Badge className={
                      dispatchWorkflowData.receipt.deliveryCondition === 'good' ? 'bg-emerald-100 text-emerald-700' :
                      dispatchWorkflowData.receipt.deliveryCondition === 'damaged' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {dispatchWorkflowData.receipt.deliveryCondition}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <p className="text-sm text-slate-500 mb-2">Items Delivered</p>
                  <div className="space-y-1">
                    {dispatchWorkflowData.receipt.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span>{item.productName}</span>
                        <span className="font-medium">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {dispatchWorkflowData.receipt.signedReceiptImage && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 mb-2">Signed Receipt</p>
                    <img 
                      src={dispatchWorkflowData.receipt.signedReceiptImage} 
                      alt="Signed Receipt" 
                      className="w-full rounded border"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Enter Receipt Mode
            <div className="space-y-4 py-4">
              {selectedDispatch && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium">{selectedDispatch.dispatchNumber}</p>
                  <p className="text-sm text-slate-500">{selectedDispatch.customerName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Receiver Name *</Label>
                  <Input
                    placeholder="Who received the delivery?"
                    value={dispatchWorkflowData.receiverName || ''}
                    onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, receiverName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Receiver Phone</Label>
                  <Input
                    placeholder="Receiver phone number"
                    value={dispatchWorkflowData.receiverPhone || ''}
                    onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, receiverPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  placeholder="e.g., Store Manager, Owner"
                  value={dispatchWorkflowData.receiverDesignation || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, receiverDesignation: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Condition</Label>
                <Select
                  value={dispatchWorkflowData.deliveryCondition || 'good'}
                  onValueChange={(value) => setDispatchWorkflowData(prev => ({ ...prev, deliveryCondition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good Condition</SelectItem>
                    <SelectItem value="partial">Partial Delivery</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Signed Delivery Receipt *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {deliveryReceiptPreview ? (
                    <div className="relative">
                      <img src={deliveryReceiptPreview} alt="Receipt" className="max-h-48 mx-auto rounded" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setDeliveryReceiptPreview(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={deliveryReceiptRef}
                        onChange={handleDeliveryReceiptUpload}
                      />
                      <Button variant="outline" onClick={() => deliveryReceiptRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Signed Receipt
                      </Button>
                      <p className="text-xs text-slate-500 mt-2">Upload the delivery receipt signed by the customer/dealer</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Notes</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={dispatchWorkflowData.deliveryNotes || ''}
                  onChange={(e) => setDispatchWorkflowData(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeliveryReceiptDialog(false)
              setDispatchWorkflowData({})
            }}>
              {dispatchWorkflowData.receipt ? 'Close' : 'Cancel'}
            </Button>
            {!dispatchWorkflowData.receipt && (
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600" 
                onClick={handleMarkDeliveredSubmit} 
                disabled={loading || !deliveryReceiptPreview || !dispatchWorkflowData.receiverName}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm Delivery
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Challan Dialog */}
      <Dialog open={showChallanDialog} onOpenChange={setShowChallanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Delivery Challan
            </DialogTitle>
          </DialogHeader>
          
          {dispatchWorkflowData.challan && (
            <div className="space-y-4 py-4">
              {/* Professional Challan Design */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-lg" id="challan-print">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{user?.businessName || 'Company Name'}</h2>
                    <p className="text-sm text-slate-500">Enterprise Solutions</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-blue-600">DELIVERY CHALLAN</h3>
                    <p className="font-mono text-lg">{dispatchWorkflowData.challan.challanNumber}</p>
                  </div>
                </div>

                <Separator />

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-6 my-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Dispatch Number</p>
                      <p className="font-medium">{dispatchWorkflowData.challan.dispatchNumber}</p>
                    </div>
                    {dispatchWorkflowData.challan.invoiceNumber && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Invoice Reference</p>
                        <p className="font-medium text-blue-600">{dispatchWorkflowData.challan.invoiceNumber}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Loaded At</p>
                      <p className="font-medium">{new Date(dispatchWorkflowData.challan.loadedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Deliver To</p>
                      <p className="font-medium">{dispatchWorkflowData.challan.customerName}</p>
                      {dispatchWorkflowData.challan.customerPhone && (
                        <p className="text-sm text-slate-600">{dispatchWorkflowData.challan.customerPhone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Delivery Address</p>
                      <p className="text-sm">{dispatchWorkflowData.challan.deliveryAddress || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-2">Transport Details</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Vehicle No.</p>
                      <p className="font-mono font-medium">{dispatchWorkflowData.challan.vehicleNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Driver</p>
                      <p className="font-medium">{dispatchWorkflowData.challan.driverName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Packages</p>
                      <p className="font-medium">{dispatchWorkflowData.challan.packageCount || 1} pkg(s)</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S.No</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispatchWorkflowData.challan.items?.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right">₹{(item.unitPrice || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">₹{(item.totalPrice || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={4} className="text-right font-medium">Total Value</TableCell>
                        <TableCell className="text-right font-bold">₹{(dispatchWorkflowData.challan.totalValue || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t">
                  <div className="text-center">
                    <div className="h-16 border-b border-dashed"></div>
                    <p className="text-xs text-slate-500 mt-2">Authorized Signature</p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 border-b border-dashed"></div>
                    <p className="text-xs text-slate-500 mt-2">Receiver Signature & Stamp</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-slate-400">
                  <p>This is a computer-generated document. Generated on {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowChallanDialog(false)
              setDispatchWorkflowData({})
            }}>
              Close
            </Button>
            <Button onClick={() => {
              // Print or download challan
              window.print()
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download / Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Action Card
function QuickActionCard({ title, description, icon: Icon, onClick }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-lg">
            <Icon className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default BuildInventory
