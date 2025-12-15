'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  Warehouse, Package, Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download, Upload,
  TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, AlertTriangle, ArrowUpRight,
  ArrowDownRight, ArrowLeftRight, MoreVertical, MapPin, Phone, Mail, Building2, Box, Boxes,
  Truck, Settings, BarChart3, X, Lock, Unlock, History, Calendar, FileSpreadsheet, Bell,
  ChevronRight, ChevronDown, Send, RotateCcw, Minus, ShoppingCart, PackageCheck, PackageX,
  ArrowUp, ArrowDown, Layers, Archive, Timer, AlertCircle, Info
} from 'lucide-react'
import { toast } from 'sonner'

// Movement Type Configuration
const MOVEMENT_TYPES = {
  goods_receipt: { label: 'Goods Receipt', icon: ArrowDownRight, color: 'text-green-600 bg-green-100', direction: 'in' },
  goods_issue: { label: 'Goods Issue', icon: ArrowUpRight, color: 'text-red-600 bg-red-100', direction: 'out' },
  transfer_out: { label: 'Transfer Out', icon: Send, color: 'text-blue-600 bg-blue-100', direction: 'out' },
  transfer_in: { label: 'Transfer In', icon: PackageCheck, color: 'text-teal-600 bg-teal-100', direction: 'in' },
  adjustment_plus: { label: 'Adjustment (+)', icon: Plus, color: 'text-emerald-600 bg-emerald-100', direction: 'in' },
  adjustment_minus: { label: 'Adjustment (-)', icon: Minus, color: 'text-amber-600 bg-amber-100', direction: 'out' },
  damage: { label: 'Damage/Scrap', icon: PackageX, color: 'text-red-600 bg-red-100', direction: 'out' },
  return_in: { label: 'Customer Return', icon: RotateCcw, color: 'text-purple-600 bg-purple-100', direction: 'in' },
  return_out: { label: 'Return to Supplier', icon: Truck, color: 'text-orange-600 bg-orange-100', direction: 'out' },
  reservation: { label: 'Reserve Stock', icon: Lock, color: 'text-amber-600 bg-amber-100', direction: 'reserve' },
  release: { label: 'Release Stock', icon: Unlock, color: 'text-green-600 bg-green-100', direction: 'release' }
}

// Transfer Status Configuration
const TRANSFER_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  in_transit: { label: 'In Transit', color: 'bg-amber-100 text-amber-700' },
  partial_received: { label: 'Partial Received', color: 'bg-orange-100 text-orange-700' },
  received: { label: 'Received', color: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

// Alert Severity Configuration
const ALERT_SEVERITY = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle },
  warning: { label: 'Warning', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: AlertTriangle },
  info: { label: 'Info', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Info }
}

// Cycle Count Status Configuration
const CYCLE_COUNT_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  pending_approval: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

// Report Types
const REPORT_TYPES = [
  { id: 'summary', name: 'Executive Summary', icon: BarChart3, description: 'Overall inventory health' },
  { id: 'valuation', name: 'Stock Valuation', icon: DollarSign, description: 'FIFO & Weighted Avg' },
  { id: 'movement', name: 'Movement Analysis', icon: ArrowLeftRight, description: 'In/Out trends' },
  { id: 'dead_stock', name: 'Dead Stock', icon: Archive, description: 'Non-moving inventory' },
  { id: 'aging', name: 'Stock Aging', icon: Timer, description: 'Batch age analysis' },
  { id: 'warehouse_summary', name: 'Warehouse Summary', icon: Warehouse, description: 'Location-wise' },
  { id: 'turnover', name: 'Inventory Turnover', icon: TrendingUp, description: 'Movement velocity' },
  { id: 'reorder', name: 'Reorder Suggestions', icon: ShoppingCart, description: 'Purchase planning' }
]

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, color, subtitle, onClick, className = '' }) => (
  <motion.div whileHover={{ y: -2, scale: 1.01 }} onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
    <Card className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-all ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            {change && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                change.startsWith('+') ? 'text-emerald-600' : change.startsWith('-') ? 'text-red-500' : 'text-slate-500'
              }`}>
                {change.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : change.startsWith('-') ? <TrendingDown className="h-3 w-3" /> : null}
                {change}
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

// Empty State Component
const EmptyState = ({ icon: Icon, title, description, action, actionLabel }) => (
  <div className="text-center py-12 px-4">
    <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
      <Icon className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 mb-4 max-w-sm mx-auto">{description}</p>
    {action && (
      <Button onClick={action}>
        <Plus className="h-4 w-4 mr-2" /> {actionLabel || 'Add New'}
      </Button>
    )}
  </div>
)

// =============================================
// MAIN ENTERPRISE INVENTORY COMPONENT
// =============================================

export function EnterpriseInventory({ token, products = [], onRefreshProducts }) {
  // Active sub-tab within inventory
  const [activeSubTab, setActiveSubTab] = useState('stock')
  
  // Warehouse State
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [warehouseSummary, setWarehouseSummary] = useState({})
  
  // Stock State
  const [stocks, setStocks] = useState([])
  const [stockSummary, setStockSummary] = useState({})
  const [stockByWarehouse, setStockByWarehouse] = useState({})
  
  // Movement State
  const [movements, setMovements] = useState([])
  const [movementSummary, setMovementSummary] = useState({})
  
  // Transfer State
  const [transfers, setTransfers] = useState([])
  const [transferSummary, setTransferSummary] = useState({})
  
  // Batch State
  const [batches, setBatches] = useState([])
  const [batchSummary, setBatchSummary] = useState({})
  
  // Alert State
  const [alerts, setAlerts] = useState([])
  const [alertSummary, setAlertSummary] = useState({})
  
  // Reports State
  const [reportData, setReportData] = useState(null)
  const [selectedReport, setSelectedReport] = useState('summary')
  const [reportLoading, setReportLoading] = useState(false)
  
  // Cycle Count State
  const [cycleCounts, setCycleCounts] = useState([])
  const [cycleCountSummary, setCycleCountSummary] = useState({})
  const [cycleCountForm, setCycleCountForm] = useState({})
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState({ type: null, data: null })
  
  // Form State for Dialogs
  const [warehouseForm, setWarehouseForm] = useState({})
  const [movementForm, setMovementForm] = useState({})
  const [transferForm, setTransferForm] = useState({ items: [] })

  // API Headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // =============================================
  // DATA FETCHING
  // =============================================

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/wooden-flooring/warehouses?includeStats=true', { headers })
      const data = await res.json()
      if (data.warehouses) {
        setWarehouses(data.warehouses)
        setWarehouseSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Warehouses fetch error:', error)
    }
  }, [token])

  const fetchStock = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      params.set('includeBatches', 'false')
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/stock?${params}`, { headers })
      const data = await res.json()
      if (data.stocks) {
        setStocks(data.stocks)
        setStockSummary(data.summary || {})
        setStockByWarehouse(data.byWarehouse || {})
      }
    } catch (error) {
      console.error('Stock fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchMovements = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      params.set('limit', '50')
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/movements?${params}`, { headers })
      const data = await res.json()
      if (data.movements) {
        setMovements(data.movements)
        setMovementSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Movements fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/wooden-flooring/inventory/transfers', { headers })
      const data = await res.json()
      if (data.transfers) {
        setTransfers(data.transfers)
        setTransferSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Transfers fetch error:', error)
    }
  }, [token])

  const fetchBatches = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/batches?${params}`, { headers })
      const data = await res.json()
      if (data.batches) {
        setBatches(data.batches)
        setBatchSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Batches fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/alerts?${params}`, { headers })
      const data = await res.json()
      if (data.alerts) {
        setAlerts(data.alerts)
        setAlertSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Alerts fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchReport = useCallback(async (reportType) => {
    try {
      setReportLoading(true)
      const params = new URLSearchParams()
      params.set('type', reportType)
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/reports?${params}`, { headers })
      const data = await res.json()
      setReportData(data)
    } catch (error) {
      console.error('Report fetch error:', error)
      toast.error('Failed to load report')
    } finally {
      setReportLoading(false)
    }
  }, [token, selectedWarehouse])

  const fetchCycleCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/cycle-count?${params}`, { headers })
      const data = await res.json()
      if (data.cycleCounts) {
        setCycleCounts(data.cycleCounts)
        setCycleCountSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Cycle counts fetch error:', error)
    }
  }, [token, selectedWarehouse])

  // Load data on mount
  useEffect(() => {
    fetchWarehouses()
  }, [fetchWarehouses])

  // Load data when warehouse selection or tab changes
  useEffect(() => {
    fetchStock()
    fetchMovements()
    fetchBatches()
    fetchAlerts()
  }, [selectedWarehouse, fetchStock, fetchMovements, fetchBatches, fetchAlerts])

  useEffect(() => {
    if (activeSubTab === 'transfers') fetchTransfers()
    if (activeSubTab === 'reports') fetchReport(selectedReport)
    if (activeSubTab === 'cycle_count') fetchCycleCounts()
  }, [activeSubTab, fetchTransfers, fetchReport, selectedReport, fetchCycleCounts])

  // Refresh all data
  const refreshAll = () => {
    fetchWarehouses()
    fetchStock()
    fetchMovements()
    fetchTransfers()
    fetchBatches()
    fetchAlerts()
    toast.success('Data refreshed')
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  // Save Warehouse
  const handleSaveWarehouse = async () => {
    try {
      setLoading(true)
      const method = warehouseForm.id ? 'PUT' : 'POST'
      const res = await fetch('/api/modules/wooden-flooring/warehouses', {
        method,
        headers,
        body: JSON.stringify(warehouseForm)
      })
      
      if (res.ok) {
        toast.success(warehouseForm.id ? 'Warehouse updated' : 'Warehouse created')
        fetchWarehouses()
        setDialogOpen({ type: null, data: null })
        setWarehouseForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save warehouse')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Delete Warehouse
  const handleDeleteWarehouse = async (id) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/modules/wooden-flooring/warehouses?id=${id}`, {
        method: 'DELETE',
        headers
      })
      
      if (res.ok) {
        toast.success('Warehouse deleted')
        fetchWarehouses()
        if (selectedWarehouse === id) setSelectedWarehouse('all')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete warehouse')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Create Movement
  const handleCreateMovement = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/movements', {
        method: 'POST',
        headers,
        body: JSON.stringify(movementForm)
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(`Stock ${MOVEMENT_TYPES[movementForm.movementType]?.direction === 'in' ? 'received' : 'issued'} successfully`)
        fetchStock()
        fetchMovements()
        fetchAlerts()
        setDialogOpen({ type: null, data: null })
        setMovementForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create movement')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Create Transfer
  const handleCreateTransfer = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify(transferForm)
      })
      
      if (res.ok) {
        toast.success('Transfer created')
        fetchTransfers()
        setDialogOpen({ type: null, data: null })
        setTransferForm({ items: [] })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create transfer')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Update Transfer Status
  const handleTransferAction = async (transferId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/transfers', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: transferId, action, ...data })
      })
      
      if (res.ok) {
        toast.success(`Transfer ${action}d successfully`)
        fetchTransfers()
        fetchStock()
        fetchMovements()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update transfer')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Create Cycle Count
  const handleCreateCycleCount = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/cycle-count', {
        method: 'POST',
        headers,
        body: JSON.stringify(cycleCountForm)
      })
      
      if (res.ok) {
        toast.success('Cycle count created')
        fetchCycleCounts()
        setDialogOpen({ type: null, data: null })
        setCycleCountForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create cycle count')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Update Cycle Count
  const handleCycleCountAction = async (cycleCountId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/cycle-count', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: cycleCountId, action, ...data })
      })
      
      if (res.ok) {
        toast.success(`Cycle count ${action.replace(/_/g, ' ')} successfully`)
        fetchCycleCounts()
        if (action === 'apply_adjustments') {
          fetchStock()
          fetchMovements()
        }
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update cycle count')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // =============================================
  // RENDER: WAREHOUSE MANAGEMENT
  // =============================================

  const renderWarehouseManagement = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Warehouse Management</h3>
          <p className="text-sm text-slate-500">Manage your storage locations</p>
        </div>
        <Button onClick={() => { setWarehouseForm({}); setDialogOpen({ type: 'warehouse', data: null }) }}>
          <Plus className="h-4 w-4 mr-2" /> Add Warehouse
        </Button>
      </div>

      {/* Warehouse Cards */}
      {warehouses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(wh => (
            <Card key={wh.id} className={`relative ${wh.isDefault ? 'border-blue-300 bg-blue-50/50' : ''}`}>
              {wh.isDefault && (
                <Badge className="absolute top-2 right-2 bg-blue-600">Default</Badge>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Warehouse className="h-5 w-5 text-slate-600" />
                      {wh.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Badge variant="outline">{wh.code}</Badge>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setWarehouseForm(wh); setDialogOpen({ type: 'warehouse', data: wh }) }}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedWarehouse(wh.id)}>
                        <Eye className="h-4 w-4 mr-2" /> View Stock
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteWarehouse(wh.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {wh.address && (
                  <p className="text-sm text-slate-500 flex items-start gap-1 mb-3">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {wh.address}{wh.city ? `, ${wh.city}` : ''}{wh.state ? `, ${wh.state}` : ''} {wh.pincode}
                  </p>
                )}
                {wh.contactPerson && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-1">
                    <Building2 className="h-4 w-4" /> {wh.contactPerson}
                  </p>
                )}
                {wh.contactPhone && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                    <Phone className="h-4 w-4" /> {wh.contactPhone}
                  </p>
                )}
                
                {/* Stats */}
                {wh.stats && (
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Products</p>
                      <p className="font-semibold">{wh.stats.totalProducts || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Quantity</p>
                      <p className="font-semibold">{(wh.stats.totalQuantity || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Value</p>
                      <p className="font-semibold text-green-600">₹{((wh.stats.totalValue || 0) / 1000).toFixed(1)}K</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Low Stock</p>
                      <p className={`font-semibold ${wh.stats.lowStockCount > 0 ? 'text-amber-600' : ''}`}>
                        {wh.stats.lowStockCount || 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Warehouse}
          title="No Warehouses"
          description="Add your first warehouse to start managing inventory across locations."
          action={() => { setWarehouseForm({}); setDialogOpen({ type: 'warehouse', data: null }) }}
          actionLabel="Add Warehouse"
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: STOCK VIEW
  // =============================================

  const renderStockView = () => {
    const filteredStocks = stocks.filter(s => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return s.productName?.toLowerCase().includes(term) || s.sku?.toLowerCase().includes(term)
    })

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Products"
            value={stockSummary.totalProducts || 0}
            icon={Package}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Quantity"
            value={`${(stockSummary.totalQuantity || 0).toLocaleString()} sqft`}
            icon={Boxes}
            color="bg-indigo-500"
          />
          <StatCard
            title="Reserved"
            value={`${(stockSummary.reservedQuantity || 0).toLocaleString()} sqft`}
            icon={Lock}
            color="bg-amber-500"
            className="bg-amber-50"
          />
          <StatCard
            title="Available"
            value={`${(stockSummary.availableQuantity || 0).toLocaleString()} sqft`}
            icon={Unlock}
            color="bg-green-500"
            className="bg-green-50"
          />
          <StatCard
            title="Total Value"
            value={`₹${((stockSummary.totalValue || 0) / 100000).toFixed(2)}L`}
            icon={DollarSign}
            color="bg-emerald-500"
          />
          <StatCard
            title="Low Stock"
            value={stockSummary.lowStockCount || 0}
            subtitle={`Out: ${stockSummary.outOfStockCount || 0}`}
            icon={AlertTriangle}
            color="bg-red-500"
            className={(stockSummary.lowStockCount || 0) > 0 ? 'bg-red-50' : ''}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setMovementForm({ movementType: 'goods_receipt', warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'goods_receipt', data: null }) }}>
              <ArrowDownRight className="h-4 w-4 mr-2" /> Goods Receipt
            </Button>
            <Button variant="outline" onClick={() => { setMovementForm({ movementType: 'goods_issue', warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'goods_issue', data: null }) }}>
              <ArrowUpRight className="h-4 w-4 mr-2" /> Goods Issue
            </Button>
            <Button variant="outline" onClick={() => { setMovementForm({ movementType: 'adjustment_plus', warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'adjustment', data: null }) }}>
              <Settings className="h-4 w-4 mr-2" /> Adjustment
            </Button>
          </div>
        </div>

        {/* Stock Table */}
        {filteredStocks.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase text-amber-700">Reserved</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase text-green-700">Available</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Avg Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Value</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStocks.map(stock => {
                    const availableQty = (stock.quantity || 0) - (stock.reservedQty || 0)
                    const isLow = availableQty > 0 && availableQty <= (stock.reorderLevel || 10)
                    const isOut = availableQty <= 0
                    const hasReserved = (stock.reservedQty || 0) > 0
                    
                    return (
                      <tr key={stock.id} className={`hover:bg-slate-50 ${isOut ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{stock.productName}</p>
                          <p className="text-xs text-slate-500">{stock.category}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{stock.sku || '-'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Warehouse className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{stock.warehouseName || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium">{(stock.quantity || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{stock.unit || 'sqft'}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`font-medium ${hasReserved ? 'text-amber-600' : 'text-slate-400'}`}>
                            {hasReserved && <Lock className="h-3 w-3 inline mr-1" />}
                            {(stock.reservedQty || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`font-semibold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                            {availableQty.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p>₹{(stock.avgCostPrice || 0).toFixed(2)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium">₹{((stock.quantity || 0) * (stock.avgCostPrice || 0)).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-700">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">In Stock</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setMovementForm({
                                  movementType: 'goods_receipt',
                                  productId: stock.productId,
                                  warehouseId: stock.warehouseId
                                })
                                setDialogOpen({ type: 'goods_receipt', data: stock })
                              }}>
                                <ArrowDownRight className="h-4 w-4 mr-2" /> Add Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setMovementForm({
                                  movementType: 'goods_issue',
                                  productId: stock.productId,
                                  warehouseId: stock.warehouseId
                                })
                                setDialogOpen({ type: 'goods_issue', data: stock })
                              }}>
                                <ArrowUpRight className="h-4 w-4 mr-2" /> Issue Stock
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setMovementForm({
                                  movementType: 'adjustment_plus',
                                  productId: stock.productId,
                                  warehouseId: stock.warehouseId
                                })
                                setDialogOpen({ type: 'adjustment', data: stock })
                              }}>
                                <Settings className="h-4 w-4 mr-2" /> Adjust Stock
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={Package}
            title="No Stock Records"
            description={selectedWarehouse !== 'all' ? "No stock in this warehouse. Add stock via Goods Receipt." : "No stock records found. Create a warehouse and add stock."}
            action={() => { setMovementForm({ movementType: 'goods_receipt' }); setDialogOpen({ type: 'goods_receipt', data: null }) }}
            actionLabel="Add Stock"
          />
        )}
      </div>
    )
  }

  // =============================================
  // RENDER: MOVEMENTS VIEW
  // =============================================

  const renderMovementsView = () => (
    <div className="space-y-4">
      {/* Movement Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Movements"
          value={movementSummary.totalMovements || 0}
          icon={History}
          color="bg-slate-500"
        />
        <StatCard
          title="Total Inward"
          value={`${(movementSummary.totalIn || 0).toLocaleString()} sqft`}
          icon={ArrowDownRight}
          color="bg-green-500"
        />
        <StatCard
          title="Total Outward"
          value={`${(movementSummary.totalOut || 0).toLocaleString()} sqft`}
          icon={ArrowUpRight}
          color="bg-red-500"
        />
      </div>

      {/* Movement List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Recent Stock Movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length > 0 ? (
            <div className="space-y-2">
              {movements.map(mv => {
                const typeConfig = MOVEMENT_TYPES[mv.movementType] || {}
                const Icon = typeConfig.icon || Box
                return (
                  <div key={mv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.color || 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{mv.productName}</p>
                        <p className="text-xs text-slate-500">
                          {typeConfig.label || mv.movementType} • {mv.warehouseName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${mv.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mv.quantityChange >= 0 ? '+' : ''}{mv.quantityChange} {mv.unit || 'sqft'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(mv.createdAt).toLocaleDateString()} {new Date(mv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No movements recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // =============================================
  // RENDER: TRANSFERS VIEW
  // =============================================

  const renderTransfersView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stock Transfers</h3>
          <p className="text-sm text-slate-500">Move stock between warehouses</p>
        </div>
        <Button onClick={() => { setTransferForm({ items: [] }); setDialogOpen({ type: 'transfer', data: null }) }} disabled={warehouses.length < 2}>
          <Plus className="h-4 w-4 mr-2" /> New Transfer
        </Button>
      </div>

      {warehouses.length < 2 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800">You need at least 2 warehouses to create transfers. Add more warehouses first.</p>
          </CardContent>
        </Card>
      )}

      {/* Transfer Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Transfers" value={transferSummary.total || 0} icon={ArrowLeftRight} color="bg-blue-500" />
        <StatCard title="Draft" value={transferSummary.draft || 0} icon={FileSpreadsheet} color="bg-slate-500" />
        <StatCard title="In Transit" value={transferSummary.inTransit || 0} icon={Truck} color="bg-amber-500" />
        <StatCard title="Completed" value={transferSummary.completed || 0} icon={CheckCircle2} color="bg-green-500" />
      </div>

      {/* Transfer List */}
      {transfers.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Transfer #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">From → To</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Value</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfers.map(transfer => {
                  const statusConfig = TRANSFER_STATUS[transfer.status] || {}
                  return (
                    <tr key={transfer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{transfer.transferNumber}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{transfer.fromWarehouseName}</span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">{transfer.toWarehouseName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {transfer.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(transfer.totalQuantity || 0).toLocaleString()} sqft
                      </td>
                      <td className="px-4 py-3 text-right">
                        ₹{(transfer.totalValue || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialogOpen({ type: 'view_transfer', data: transfer })}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {transfer.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleTransferAction(transfer.id, 'approve')}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleTransferAction(transfer.id, 'cancel')}>
                                  <X className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {transfer.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handleTransferAction(transfer.id, 'dispatch')}>
                                <Truck className="h-4 w-4 mr-2" /> Dispatch
                              </DropdownMenuItem>
                            )}
                            {(transfer.status === 'in_transit' || transfer.status === 'partial_received') && (
                              <DropdownMenuItem onClick={() => setDialogOpen({ type: 'receive_transfer', data: transfer })}>
                                <PackageCheck className="h-4 w-4 mr-2" /> Receive
                              </DropdownMenuItem>
                            )}
                            {transfer.status === 'received' && (
                              <DropdownMenuItem onClick={() => handleTransferAction(transfer.id, 'complete')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={ArrowLeftRight}
          title="No Transfers"
          description="Create a transfer to move stock between warehouses."
          action={warehouses.length >= 2 ? () => { setTransferForm({ items: [] }); setDialogOpen({ type: 'transfer', data: null }) } : null}
          actionLabel="New Transfer"
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: BATCHES VIEW
  // =============================================

  const renderBatchesView = () => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="Total Batches" value={batchSummary.totalBatches || 0} icon={Layers} color="bg-blue-500" />
        <StatCard title="Total Quantity" value={`${(batchSummary.totalQuantity || 0).toLocaleString()}`} icon={Boxes} color="bg-indigo-500" />
        <StatCard title="Total Value" value={`₹${((batchSummary.totalValue || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-green-500" />
        <StatCard title="Expiring Soon" value={batchSummary.expiringSoonCount || 0} icon={Timer} color="bg-amber-500" className={(batchSummary.expiringSoonCount || 0) > 0 ? 'bg-amber-50' : ''} />
        <StatCard title="Expired" value={batchSummary.expiredCount || 0} icon={AlertCircle} color="bg-red-500" className={(batchSummary.expiredCount || 0) > 0 ? 'bg-red-50' : ''} />
      </div>

      {/* Batch Table */}
      {batches.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Batch #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Unit Cost</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Received</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Age</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map(batch => (
                  <tr key={batch.id} className={`hover:bg-slate-50 ${batch.expiryStatus === 'expired' ? 'bg-red-50' : batch.expiryStatus === 'expiring_soon' ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">{batch.batchNumber}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{batch.productName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{batch.warehouseName}</td>
                    <td className="px-4 py-3 text-right font-medium">{(batch.quantity || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">₹{(batch.unitCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {batch.ageInDays !== undefined ? `${batch.ageInDays}d` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {batch.expiryStatus === 'expired' ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : batch.expiryStatus === 'expiring_soon' ? (
                        <Badge className="bg-amber-100 text-amber-700">{batch.daysUntilExpiry}d left</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Valid</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Layers}
          title="No Batch Records"
          description="Batches are created automatically when you receive goods with batch/lot numbers."
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: ALERTS VIEW
  // =============================================

  const renderAlertsView = () => (
    <div className="space-y-4">
      {/* Alert Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Alerts" value={alertSummary.total || 0} icon={Bell} color="bg-slate-500" />
        <StatCard title="Critical" value={alertSummary.critical || 0} icon={AlertCircle} color="bg-red-500" className={(alertSummary.critical || 0) > 0 ? 'bg-red-50' : ''} />
        <StatCard title="Warning" value={alertSummary.warning || 0} icon={AlertTriangle} color="bg-amber-500" className={(alertSummary.warning || 0) > 0 ? 'bg-amber-50' : ''} />
        <StatCard title="Info" value={alertSummary.info || 0} icon={Info} color="bg-blue-500" />
      </div>

      {/* Alert List */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map(alert => {
            const severityConfig = ALERT_SEVERITY[alert.severity] || ALERT_SEVERITY.info
            const Icon = severityConfig.icon
            return (
              <Card key={alert.id} className={`border ${severityConfig.color}`}>
                <CardContent className="p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <Badge variant="outline">{alert.type.replace(/_/g, ' ')}</Badge>
                        {alert.warehouseName && (
                          <>
                            <span>•</span>
                            <span>{alert.warehouseName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {(alert.type === 'low_stock' || alert.type === 'out_of_stock') && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setMovementForm({
                        movementType: 'goods_receipt',
                        productId: alert.productId,
                        warehouseId: alert.warehouseId,
                        quantity: alert.suggestedOrder
                      })
                      setDialogOpen({ type: 'goods_receipt', data: alert })
                    }}>
                      <Plus className="h-4 w-4 mr-1" /> Restock
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-green-700">All Clear!</p>
            <p className="text-green-600">No inventory alerts at this time.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // =============================================
  // RENDER: REPORTS VIEW
  // =============================================

  const renderReportsView = () => (
    <div className="space-y-4">
      {/* Report Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Inventory Reports</h3>
          <p className="text-sm text-slate-500">Analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedReport} onValueChange={(v) => { setSelectedReport(v); fetchReport(v) }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map(rt => (
                <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchReport(selectedReport)} disabled={reportLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon
          return (
            <motion.div
              key={rt.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => { setSelectedReport(rt.id); fetchReport(rt.id) }}
              className={`cursor-pointer p-4 rounded-lg border transition-all ${
                selectedReport === rt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${selectedReport === rt.id ? 'text-blue-600' : 'text-slate-500'}`} />
              <p className="font-medium text-sm">{rt.name}</p>
              <p className="text-xs text-slate-500">{rt.description}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Report Content */}
      {reportLoading ? (
        <Card className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
          <p className="text-slate-500">Generating report...</p>
        </Card>
      ) : reportData ? (
        <div className="space-y-4">
          {/* Summary Report */}
          {selectedReport === 'summary' && reportData.summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Total Products" value={reportData.summary.totalProducts || 0} icon={Package} color="bg-blue-500" />
                <StatCard title="Total Quantity" value={`${(reportData.summary.totalQuantity || 0).toLocaleString()}`} icon={Boxes} color="bg-indigo-500" />
                <StatCard title="Total Value" value={`₹${((reportData.summary.totalValue || 0) / 100000).toFixed(2)}L`} icon={DollarSign} color="bg-green-500" />
                <StatCard title="Low Stock" value={reportData.summary.lowStockCount || 0} icon={AlertTriangle} color="bg-red-500" />
              </div>
              {reportData.last30Days && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Last 30 Days Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{(reportData.last30Days.totalInward || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Total Inward</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{(reportData.last30Days.totalOutward || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Total Outward</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{reportData.last30Days.movementCount || 0}</p>
                        <p className="text-xs text-slate-500">Movements</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{(reportData.expiryAlerts?.expiringSoon || 0) + (reportData.expiryAlerts?.expired || 0)}</p>
                        <p className="text-xs text-slate-500">Expiry Alerts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Valuation Report */}
          {selectedReport === 'valuation' && reportData.totals && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="FIFO Value" value={`₹${((reportData.totals.fifoValue || 0) / 100000).toFixed(2)}L`} icon={DollarSign} color="bg-green-500" />
                <StatCard title="Weighted Avg Value" value={`₹${((reportData.totals.weightedAvgValue || 0) / 100000).toFixed(2)}L`} icon={DollarSign} color="bg-blue-500" />
                <StatCard title="Variance" value={`₹${((reportData.totals.variance || 0) / 1000).toFixed(2)}K`} icon={TrendingUp} color="bg-amber-500" />
                <StatCard title="Variance %" value={`${reportData.totals.variancePercent || 0}%`} icon={BarChart3} color="bg-purple-500" />
              </div>
              {reportData.byWarehouse && Object.keys(reportData.byWarehouse).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Valuation by Warehouse</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Warehouse</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Quantity</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">FIFO Value</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Weighted Avg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(reportData.byWarehouse).map(([whId, data]) => (
                          <tr key={whId}>
                            <td className="px-4 py-2 font-medium">{data.warehouseName}</td>
                            <td className="px-4 py-2 text-right">{(data.totalQuantity || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-green-600">₹{(data.fifoValue || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-blue-600">₹{(data.weightedAvgValue || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Dead Stock Report */}
          {selectedReport === 'dead_stock' && reportData.summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Dead Stock Items" value={reportData.summary.deadStockCount || 0} icon={Archive} color="bg-red-500" className={(reportData.summary.deadStockCount || 0) > 0 ? 'bg-red-50' : ''} />
                <StatCard title="Dead Stock Value" value={`₹${((reportData.summary.deadStockValue || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-red-600" />
                <StatCard title="Slow Moving" value={reportData.summary.slowMovingCount || 0} icon={Timer} color="bg-amber-500" />
                <StatCard title="Slow Moving Value" value={`₹${((reportData.summary.slowMovingValue || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-amber-600" />
              </div>
              {reportData.deadStock && reportData.deadStock.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Archive className="h-4 w-4 text-red-500" /> Dead Stock ({'>'}90 days no movement)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {reportData.deadStock.slice(0, 20).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-slate-500">{item.warehouseName} • SKU: {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{item.quantity} sqft</p>
                            <p className="text-xs text-red-600">{item.daysSinceLastMovement} days idle</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Aging Report */}
          {selectedReport === 'aging' && reportData.ageBuckets && (
            <>
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(reportData.ageBuckets).map(([bucket, data]) => (
                  <Card key={bucket} className="text-center">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500">{bucket} days</p>
                      <p className="text-xl font-bold">{data.count}</p>
                      <p className="text-sm text-green-600">₹{((data.value || 0) / 1000).toFixed(1)}K</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {reportData.valueDistribution && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Value Distribution by Age</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reportData.valueDistribution.map(item => (
                        <div key={item.bucket} className="flex items-center gap-3">
                          <span className="w-20 text-sm">{item.bucket}d</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="w-16 text-sm text-right">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Warehouse Summary Report */}
          {selectedReport === 'warehouse_summary' && reportData.warehouses && (
            <div className="grid md:grid-cols-2 gap-4">
              {reportData.warehouses.map(wh => (
                <Card key={wh.warehouseId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      {wh.warehouseName}
                      {wh.isDefault && <Badge className="bg-blue-600 text-xs">Default</Badge>}
                    </CardTitle>
                    <CardDescription>{wh.location}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-lg font-bold">{wh.metrics.totalProducts}</p>
                        <p className="text-xs text-slate-500">Products</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-lg font-bold">{(wh.metrics.totalQuantity || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Quantity</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="text-lg font-bold text-green-600">₹{((wh.metrics.totalValue || 0) / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-slate-500">Value</p>
                      </div>
                    </div>
                    {(wh.metrics.lowStockCount > 0 || wh.batches.expiringSoonCount > 0) && (
                      <div className="flex gap-2 mt-3">
                        {wh.metrics.lowStockCount > 0 && (
                          <Badge className="bg-amber-100 text-amber-700">{wh.metrics.lowStockCount} Low Stock</Badge>
                        )}
                        {wh.batches.expiringSoonCount > 0 && (
                          <Badge className="bg-red-100 text-red-700">{wh.batches.expiringSoonCount} Expiring</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Reorder Report */}
          {selectedReport === 'reorder' && reportData.items && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <StatCard title="Items to Reorder" value={reportData.summary?.totalItems || 0} icon={ShoppingCart} color="bg-blue-500" />
                <StatCard title="Critical" value={reportData.summary?.criticalCount || 0} icon={AlertCircle} color="bg-red-500" className={(reportData.summary?.criticalCount || 0) > 0 ? 'bg-red-50' : ''} />
                <StatCard title="High Priority" value={reportData.summary?.highCount || 0} icon={AlertTriangle} color="bg-amber-500" />
                <StatCard title="Est. Cost" value={`₹${((reportData.summary?.totalEstimatedCost || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-green-500" />
              </div>
              {reportData.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reorder Suggestions</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Warehouse</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Current</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Reorder Level</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Suggested Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Est. Cost</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.items.map((item, idx) => (
                          <tr key={idx} className={item.priority === 'critical' ? 'bg-red-50' : item.priority === 'high' ? 'bg-amber-50' : ''}>
                            <td className="px-4 py-2">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-slate-500">{item.sku}</p>
                            </td>
                            <td className="px-4 py-2 text-sm">{item.warehouseName}</td>
                            <td className="px-4 py-2 text-right font-medium">{item.availableStock}</td>
                            <td className="px-4 py-2 text-right">{item.reorderLevel}</td>
                            <td className="px-4 py-2 text-right font-semibold text-blue-600">{item.suggestedOrderQty}</td>
                            <td className="px-4 py-2 text-right">₹{(item.estimatedCost || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge className={
                                item.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                item.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                {item.priority}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Movement Report */}
          {selectedReport === 'movement' && reportData.summary && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard title="Total Movements" value={reportData.summary.totalMovements || 0} icon={History} color="bg-slate-500" />
                <StatCard title="Total Inward" value={`${(reportData.summary.totalInward || 0).toLocaleString()}`} icon={ArrowDownRight} color="bg-green-500" />
                <StatCard title="Total Outward" value={`${(reportData.summary.totalOutward || 0).toLocaleString()}`} icon={ArrowUpRight} color="bg-red-500" />
              </div>
              {reportData.byType && Object.keys(reportData.byType).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Movement by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(reportData.byType).map(([type, data]) => {
                        const typeConfig = MOVEMENT_TYPES[type] || {}
                        return (
                          <div key={type} className={`p-3 rounded-lg ${typeConfig.color?.split(' ')[1] || 'bg-slate-100'}`}>
                            <p className="text-sm font-medium">{typeConfig.label || type}</p>
                            <p className="text-lg font-bold">{data.count}</p>
                            <p className="text-xs">Qty: {data.totalQty?.toLocaleString()}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Turnover Report */}
          {selectedReport === 'turnover' && reportData.items && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard title="Avg Turnover Ratio" value={reportData.summary?.avgTurnoverRatio || '0'} icon={TrendingUp} color="bg-blue-500" />
                <StatCard title="High Turnover" value={reportData.summary?.highTurnover || 0} icon={ArrowUp} color="bg-green-500" />
                <StatCard title="Low Turnover" value={reportData.summary?.lowTurnover || 0} icon={ArrowDown} color="bg-red-500" />
              </div>
              {reportData.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inventory Turnover Analysis</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Current Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Total Sold</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Turnover</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Days of Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.items.slice(0, 30).map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-slate-500">{item.warehouseName}</p>
                            </td>
                            <td className="px-4 py-2 text-right">{(item.currentStock || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right">{(item.totalSold || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right">
                              <Badge className={parseFloat(item.turnoverRatio) >= 2 ? 'bg-green-100 text-green-700' : parseFloat(item.turnoverRatio) < 0.5 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}>
                                {item.turnoverRatio}x
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right">{item.daysOfStock > 900 ? '∞' : item.daysOfStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Select a report type to view analytics</p>
        </Card>
      )}
    </div>
  )

  // =============================================
  // RENDER: CYCLE COUNT VIEW
  // =============================================

  const renderCycleCountView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stock Audit / Cycle Count</h3>
          <p className="text-sm text-slate-500">Physical verification of inventory</p>
        </div>
        <Button onClick={() => { setCycleCountForm({ warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'cycle_count', data: null }) }} disabled={warehouses.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> New Cycle Count
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard title="Total" value={cycleCountSummary.total || 0} icon={FileSpreadsheet} color="bg-slate-500" />
        <StatCard title="Draft" value={cycleCountSummary.draft || 0} icon={Edit} color="bg-slate-400" />
        <StatCard title="In Progress" value={cycleCountSummary.inProgress || 0} icon={Clock} color="bg-blue-500" />
        <StatCard title="Pending Approval" value={cycleCountSummary.pendingApproval || 0} icon={AlertTriangle} color="bg-amber-500" />
        <StatCard title="Completed" value={cycleCountSummary.completed || 0} icon={CheckCircle2} color="bg-green-500" />
      </div>

      {/* Cycle Count List */}
      {cycleCounts.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Count #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Variance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cycleCounts.map(cc => {
                  const statusConfig = CYCLE_COUNT_STATUS[cc.status] || {}
                  const progress = cc.totalItems > 0 ? Math.round((cc.countedItems / cc.totalItems) * 100) : 0
                  return (
                    <tr key={cc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{cc.cycleCountNumber}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{cc.warehouseName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cc.countedItems}/{cc.totalItems}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cc.totalVariance > 0 ? 'text-green-600' : cc.totalVariance < 0 ? 'text-red-600' : ''}>
                          {cc.totalVariance > 0 ? '+' : ''}{cc.totalVariance || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {new Date(cc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialogOpen({ type: 'view_cycle_count', data: cc })}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {cc.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleCycleCountAction(cc.id, 'start')}>
                                  <Clock className="h-4 w-4 mr-2" /> Start Counting
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleCycleCountAction(cc.id, 'cancel')}>
                                  <X className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {cc.status === 'in_progress' && (
                              <>
                                <DropdownMenuItem onClick={() => setDialogOpen({ type: 'record_counts', data: cc })}>
                                  <Edit className="h-4 w-4 mr-2" /> Record Counts
                                </DropdownMenuItem>
                                {cc.countedItems === cc.totalItems && (
                                  <DropdownMenuItem onClick={() => handleCycleCountAction(cc.id, 'submit_for_approval')}>
                                    <Send className="h-4 w-4 mr-2" /> Submit for Approval
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {cc.status === 'pending_approval' && (
                              <DropdownMenuItem onClick={() => handleCycleCountAction(cc.id, 'approve')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            {cc.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handleCycleCountAction(cc.id, 'apply_adjustments')}>
                                <Settings className="h-4 w-4 mr-2" /> Apply Adjustments
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={FileSpreadsheet}
          title="No Cycle Counts"
          description="Create a cycle count to verify physical inventory against system records."
          action={() => { setCycleCountForm({ warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'cycle_count', data: null }) }}
          actionLabel="New Cycle Count"
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: DIALOGS
  // =============================================

  const renderDialogs = () => (
    <>
      {/* Warehouse Dialog */}
      <Dialog open={dialogOpen.type === 'warehouse'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{warehouseForm.id ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={warehouseForm.name || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="Main Warehouse"
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={warehouseForm.code || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                  placeholder="WH-001"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={warehouseForm.address || ''}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={warehouseForm.city || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={warehouseForm.state || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, state: e.target.value })}
                />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={warehouseForm.pincode || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, pincode: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={warehouseForm.contactPerson || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input
                  value={warehouseForm.contactPhone || ''}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, contactPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={warehouseForm.isDefault || false}
                onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, isDefault: checked })}
              />
              <Label className="cursor-pointer">Set as default warehouse</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button onClick={handleSaveWarehouse} disabled={loading || !warehouseForm.name}>
              {loading ? 'Saving...' : 'Save Warehouse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goods Receipt Dialog */}
      <Dialog open={dialogOpen.type === 'goods_receipt'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-green-600" /> Goods Receipt (Stock In)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select
                value={movementForm.productId || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, productId: v })}
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
            <div>
              <Label>Warehouse *</Label>
              <Select
                value={movementForm.warehouseId || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, warehouseId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={movementForm.quantity || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label>Unit Cost (₹)</Label>
                <Input
                  type="number"
                  value={movementForm.unitCost || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, unitCost: parseFloat(e.target.value) || 0 })}
                  placeholder="150"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Batch/Lot Number</Label>
                <Input
                  value={movementForm.batchNumber || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, batchNumber: e.target.value })}
                  placeholder="LOT-2025-001"
                />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={movementForm.expiryDate || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Vendor Name</Label>
              <Input
                value={movementForm.vendorName || ''}
                onChange={(e) => setMovementForm({ ...movementForm, vendorName: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={movementForm.notes || ''}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                placeholder="PO number, delivery challan, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button onClick={handleCreateMovement} disabled={loading || !movementForm.productId || !movementForm.warehouseId || !movementForm.quantity}>
              {loading ? 'Processing...' : 'Receive Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goods Issue Dialog */}
      <Dialog open={dialogOpen.type === 'goods_issue'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-red-600" /> Goods Issue (Stock Out)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select
                value={movementForm.productId || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, productId: v })}
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
            <div>
              <Label>Warehouse *</Label>
              <Select
                value={movementForm.warehouseId || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, warehouseId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={movementForm.quantity || ''}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="50"
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Select
                value={movementForm.reason || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, reason: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales / Delivery</SelectItem>
                  <SelectItem value="sample">Sample Issue</SelectItem>
                  <SelectItem value="internal">Internal Use</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={movementForm.notes || ''}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                placeholder="Order reference, customer name, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleCreateMovement} disabled={loading || !movementForm.productId || !movementForm.warehouseId || !movementForm.quantity}>
              {loading ? 'Processing...' : 'Issue Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={dialogOpen.type === 'adjustment'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Stock Adjustment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Adjustment Type *</Label>
              <Select
                value={movementForm.movementType || 'adjustment_plus'}
                onValueChange={(v) => setMovementForm({ ...movementForm, movementType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment_plus">Add Stock (+)</SelectItem>
                  <SelectItem value="adjustment_minus">Remove Stock (-)</SelectItem>
                  <SelectItem value="damage">Damage / Scrap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product *</Label>
              <Select
                value={movementForm.productId || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, productId: v })}
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
            <div>
              <Label>Warehouse *</Label>
              <Select
                value={movementForm.warehouseId || ''}
                onValueChange={(v) => setMovementForm({ ...movementForm, warehouseId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={movementForm.quantity || ''}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="10"
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={movementForm.reason || ''}
                onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                placeholder="Reason for adjustment (e.g., physical count correction, damaged goods)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button onClick={handleCreateMovement} disabled={loading || !movementForm.productId || !movementForm.warehouseId || !movementForm.quantity || !movementForm.reason}>
              {loading ? 'Processing...' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen.type === 'transfer'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" /> Create Stock Transfer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Warehouse *</Label>
                <Select
                  value={transferForm.fromWarehouseId || ''}
                  onValueChange={(v) => setTransferForm({ ...transferForm, fromWarehouseId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== transferForm.toWarehouseId).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Warehouse *</Label>
                <Select
                  value={transferForm.toWarehouseId || ''}
                  onValueChange={(v) => setTransferForm({ ...transferForm, toWarehouseId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== transferForm.fromWarehouseId).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Transfer Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Transfer Items</Label>
                <Button size="sm" variant="outline" onClick={() => setTransferForm({
                  ...transferForm,
                  items: [...(transferForm.items || []), { productId: '', quantity: 0 }]
                })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              {(transferForm.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Select
                    value={item.productId || ''}
                    onValueChange={(v) => {
                      const newItems = [...transferForm.items]
                      newItems[idx].productId = v
                      setTransferForm({ ...transferForm, items: newItems })
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-[120px]"
                    placeholder="Qty"
                    value={item.quantity || ''}
                    onChange={(e) => {
                      const newItems = [...transferForm.items]
                      newItems[idx].quantity = parseFloat(e.target.value) || 0
                      setTransferForm({ ...transferForm, items: newItems })
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const newItems = transferForm.items.filter((_, i) => i !== idx)
                      setTransferForm({ ...transferForm, items: newItems })
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}

              {(!transferForm.items || transferForm.items.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">No items added. Click &quot;Add Item&quot; to start.</p>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={transferForm.notes || ''}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder="Transfer notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={loading || !transferForm.fromWarehouseId || !transferForm.toWarehouseId || !transferForm.items?.length || transferForm.items.some(i => !i.productId || !i.quantity)}
            >
              {loading ? 'Creating...' : 'Create Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transfer Dialog */}
      <Dialog open={dialogOpen.type === 'view_transfer'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
          </DialogHeader>
          {dialogOpen.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-lg">{dialogOpen.data.transferNumber}</Badge>
                <Badge className={TRANSFER_STATUS[dialogOpen.data.status]?.color}>
                  {TRANSFER_STATUS[dialogOpen.data.status]?.label}
                </Badge>
              </div>

              <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <Warehouse className="h-8 w-8 mx-auto text-slate-600 mb-1" />
                  <p className="font-medium">{dialogOpen.data.fromWarehouseName}</p>
                  <p className="text-xs text-slate-500">Source</p>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-400" />
                <div className="text-center">
                  <Warehouse className="h-8 w-8 mx-auto text-blue-600 mb-1" />
                  <p className="font-medium">{dialogOpen.data.toWarehouseName}</p>
                  <p className="text-xs text-slate-500">Destination</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Items</Label>
                <div className="space-y-2 mt-2">
                  {dialogOpen.data.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="font-medium">{item.productName}</span>
                      <div className="text-right">
                        <span>{item.quantity} sqft</span>
                        {item.receivedQuantity > 0 && (
                          <span className="text-green-600 ml-2">(Received: {item.receivedQuantity})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Total Quantity</p>
                  <p className="font-medium">{dialogOpen.data.totalQuantity?.toLocaleString()} sqft</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Value</p>
                  <p className="font-medium">₹{dialogOpen.data.totalValue?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-medium">{new Date(dialogOpen.data.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Created By</p>
                  <p className="font-medium">{dialogOpen.data.createdByName}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Cycle Count Dialog */}
      <Dialog open={dialogOpen.type === 'cycle_count'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Create Cycle Count
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Warehouse *</Label>
              <Select
                value={cycleCountForm.warehouseId || ''}
                onValueChange={(v) => setCycleCountForm({ ...cycleCountForm, warehouseId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse to count" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Count Type</Label>
              <Select
                value={cycleCountForm.countType || 'full'}
                onValueChange={(v) => setCycleCountForm({ ...cycleCountForm, countType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Count (All Products)</SelectItem>
                  <SelectItem value="partial">Partial Count (Selected Products)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={cycleCountForm.scheduledDate || ''}
                onChange={(e) => setCycleCountForm({ ...cycleCountForm, scheduledDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={cycleCountForm.notes || ''}
                onChange={(e) => setCycleCountForm({ ...cycleCountForm, notes: e.target.value })}
                placeholder="Any special instructions..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button onClick={handleCreateCycleCount} disabled={loading || !cycleCountForm.warehouseId}>
              {loading ? 'Creating...' : 'Create Cycle Count'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Cycle Count Dialog */}
      <Dialog open={dialogOpen.type === 'view_cycle_count'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cycle Count Details</DialogTitle>
          </DialogHeader>
          {dialogOpen.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="text-lg">{dialogOpen.data.cycleCountNumber}</Badge>
                  <p className="text-sm text-slate-500 mt-1">{dialogOpen.data.warehouseName}</p>
                </div>
                <Badge className={CYCLE_COUNT_STATUS[dialogOpen.data.status]?.color}>
                  {CYCLE_COUNT_STATUS[dialogOpen.data.status]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{dialogOpen.data.totalItems}</p>
                  <p className="text-xs text-slate-500">Total Items</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{dialogOpen.data.countedItems}</p>
                  <p className="text-xs text-slate-500">Counted</p>
                </div>
                <div className={`p-3 rounded-lg ${dialogOpen.data.totalVariance !== 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${dialogOpen.data.totalVariance > 0 ? 'text-green-600' : dialogOpen.data.totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {dialogOpen.data.totalVariance > 0 ? '+' : ''}{dialogOpen.data.totalVariance || 0}
                  </p>
                  <p className="text-xs text-slate-500">Variance</p>
                </div>
                <div className={`p-3 rounded-lg ${(dialogOpen.data.totalVarianceValue || 0) !== 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${dialogOpen.data.totalVarianceValue > 0 ? 'text-green-600' : dialogOpen.data.totalVarianceValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.abs(dialogOpen.data.totalVarianceValue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Variance Value</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Items</Label>
                <div className="max-h-[300px] overflow-y-auto mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-right">System</th>
                        <th className="px-3 py-2 text-right">Counted</th>
                        <th className="px-3 py-2 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dialogOpen.data.items?.map((item, idx) => (
                        <tr key={idx} className={item.variance !== 0 && item.variance !== null ? 'bg-amber-50' : ''}>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-slate-500">{item.sku}</p>
                          </td>
                          <td className="px-3 py-2 text-right">{item.systemQuantity}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {item.countedQuantity !== null ? item.countedQuantity : '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.variance !== null ? (
                              <span className={item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : ''}>
                                {item.variance > 0 ? '+' : ''}{item.variance}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Counts Dialog */}
      <Dialog open={dialogOpen.type === 'record_counts'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" /> Record Physical Counts
            </DialogTitle>
            <DialogDescription>
              Enter the actual counted quantities for each product
            </DialogDescription>
          </DialogHeader>
          {dialogOpen.data && (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">System Qty</th>
                      <th className="px-3 py-2 text-right">Counted Qty</th>
                      <th className="px-3 py-2 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dialogOpen.data.items?.map((item, idx) => {
                      const countedQty = cycleCountForm[`count_${item.productId}`] ?? item.countedQuantity ?? ''
                      const variance = countedQty !== '' ? parseFloat(countedQty) - item.systemQuantity : null
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-slate-500">{item.sku}</p>
                          </td>
                          <td className="px-3 py-2 text-right">{item.systemQuantity}</td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              className="w-24 text-right ml-auto"
                              placeholder="0"
                              value={countedQty}
                              onChange={(e) => setCycleCountForm({
                                ...cycleCountForm,
                                [`count_${item.productId}`]: e.target.value
                              })}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {variance !== null ? (
                              <span className={variance > 0 ? 'text-green-600 font-medium' : variance < 0 ? 'text-red-600 font-medium' : ''}>
                                {variance > 0 ? '+' : ''}{variance}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button onClick={() => {
              // Gather counted items
              const countedItems = dialogOpen.data.items.map(item => ({
                productId: item.productId,
                quantity: parseFloat(cycleCountForm[`count_${item.productId}`]) || 0,
                notes: ''
              })).filter(i => cycleCountForm[`count_${i.productId}`] !== undefined)
              
              handleCycleCountAction(dialogOpen.data.id, 'record_counts', { countedItems })
            }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Counts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <div className="space-y-6">
      {/* Header with Warehouse Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6" /> Enterprise Inventory
          </h2>
          
          {/* Warehouse Selector */}
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map(wh => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name} {wh.isDefault && '⭐'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {alertSummary.critical > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertCircle className="h-3 w-3 mr-1" /> {alertSummary.critical} Critical
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Movements
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Transfers
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Batches/Lots
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Alerts
            {(alertSummary.total || 0) > 0 && (
              <Badge variant="secondary" className="ml-1">{alertSummary.total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" /> Warehouses
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="stock">{renderStockView()}</TabsContent>
          <TabsContent value="movements">{renderMovementsView()}</TabsContent>
          <TabsContent value="transfers">{renderTransfersView()}</TabsContent>
          <TabsContent value="batches">{renderBatchesView()}</TabsContent>
          <TabsContent value="alerts">{renderAlertsView()}</TabsContent>
          <TabsContent value="warehouses">{renderWarehouseManagement()}</TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      {renderDialogs()}
    </div>
  )
}

export default EnterpriseInventory
