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
  ArrowUp, ArrowDown, Layers, Archive, Timer, AlertCircle, Info, FileText, Scan, ClipboardList,
  UserCheck, Bookmark, Receipt
} from 'lucide-react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/phone-input'

// GRN Status Configuration
const GRN_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  received: { label: 'Received', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

// Challan Status Configuration
const CHALLAN_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  dispatched: { label: 'Dispatched', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

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
  
  // GRN State
  const [grns, setGrns] = useState([])
  const [grnSummary, setGrnSummary] = useState({})
  const [grnForm, setGrnForm] = useState({ items: [] })
  
  // Challan State
  const [challans, setChallans] = useState([])
  const [challanSummary, setChallanSummary] = useState({})
  const [challanForm, setChallanForm] = useState({ items: [] })
  
  // Reservation State
  const [reservations, setReservations] = useState([])
  const [reservationSummary, setReservationSummary] = useState({})
  
  // Quick Lookup State
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState({ type: null, data: null })
  
  // Form State for Dialogs
  const [warehouseForm, setWarehouseForm] = useState({})
  const [movementForm, setMovementForm] = useState({})
  const [transferForm, setTransferForm] = useState({ items: [] })
  const [reservationForm, setReservationForm] = useState({})
  
  // Access Management State
  const [accessRecords, setAccessRecords] = useState([])
  const [users, setUsers] = useState([])
  const [accessForm, setAccessForm] = useState({})
  
  // Quick Lookup Search Term
  const [lookupSearch, setLookupSearch] = useState('')

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

  const fetchGrns = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/grn?${params}`, { headers })
      const data = await res.json()
      if (data.grns) {
        setGrns(data.grns)
        setGrnSummary(data.summary || {})
      }
    } catch (error) {
      console.error('GRNs fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchChallans = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/challans?${params}`, { headers })
      const data = await res.json()
      if (data.challans) {
        setChallans(data.challans)
        setChallanSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Challans fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/reservations?${params}`, { headers })
      const data = await res.json()
      if (data.reservations) {
        setReservations(data.reservations)
        setReservationSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Reservations fetch error:', error)
    }
  }, [token, selectedWarehouse])

  const fetchAccessRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/wooden-flooring/inventory/access?listAll=true', { headers })
      const data = await res.json()
      if (data.accessRecords) {
        setAccessRecords(data.accessRecords)
      }
    } catch (error) {
      console.error('Access records fetch error:', error)
    }
  }, [token])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers })
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Users fetch error:', error)
    }
  }, [token])

  const handleQuickLookup = async (searchValue) => {
    if (!searchValue || searchValue.length < 2) return
    try {
      setLookupLoading(true)
      const params = new URLSearchParams()
      params.set('sku', searchValue)
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/lookup?${params}`, { headers })
      const data = await res.json()
      setLookupResult(data)
      if (data.found) {
        setDialogOpen({ type: 'lookup_result', data })
      } else {
        toast.error('Product not found')
      }
    } catch (error) {
      console.error('Lookup error:', error)
      toast.error('Lookup failed')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleExport = async (exportType) => {
    try {
      const params = new URLSearchParams()
      params.set('type', exportType)
      if (selectedWarehouse !== 'all') params.set('warehouseId', selectedWarehouse)
      
      const res = await fetch(`/api/modules/wooden-flooring/inventory/export?${params}`, { headers })
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_report_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Export downloaded')
      } else {
        toast.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }

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
    if (activeSubTab === 'grn') fetchGrns()
    if (activeSubTab === 'challans') fetchChallans()
    if (activeSubTab === 'reservations') fetchReservations()
    if (activeSubTab === 'access') { fetchAccessRecords(); fetchUsers() }
  }, [activeSubTab, fetchTransfers, fetchReport, selectedReport, fetchCycleCounts, fetchGrns, fetchChallans, fetchReservations, fetchAccessRecords, fetchUsers])

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

  // Create GRN
  const handleCreateGRN = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/grn', {
        method: 'POST',
        headers,
        body: JSON.stringify(grnForm)
      })
      
      if (res.ok) {
        toast.success('GRN created')
        fetchGrns()
        setDialogOpen({ type: null, data: null })
        setGrnForm({ items: [] })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create GRN')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // GRN Action (receive, cancel)
  const handleGrnAction = async (grnId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/grn', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: grnId, action, ...data })
      })
      
      if (res.ok) {
        toast.success(action === 'receive' ? 'Goods received successfully' : `GRN ${action}d`)
        fetchGrns()
        if (action === 'receive') {
          fetchStock()
          fetchMovements()
          fetchBatches()
        }
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to process GRN')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Create Challan
  const handleCreateChallan = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/challans', {
        method: 'POST',
        headers,
        body: JSON.stringify(challanForm)
      })
      
      if (res.ok) {
        toast.success('Delivery Challan created')
        fetchChallans()
        setDialogOpen({ type: null, data: null })
        setChallanForm({ items: [] })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create challan')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Challan Action (dispatch, deliver, cancel)
  const handleChallanAction = async (challanId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/challans', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: challanId, action, ...data })
      })
      
      if (res.ok) {
        toast.success(`Challan ${action}ed successfully`)
        fetchChallans()
        if (action === 'dispatch' || action === 'cancel') {
          fetchStock()
          fetchMovements()
        }
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to process challan')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Create Reservation
  const handleCreateReservation = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/reservations', {
        method: 'POST',
        headers,
        body: JSON.stringify(reservationForm)
      })
      
      if (res.ok) {
        toast.success('Reservation created')
        fetchReservations()
        fetchStock()
        setDialogOpen({ type: null, data: null })
        setReservationForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create reservation')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Reservation Actions (release, fulfill)
  const handleReservationAction = async (reservationId, action) => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/reservations', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: reservationId, action })
      })
      
      if (res.ok) {
        toast.success(`Reservation ${action}d successfully`)
        fetchReservations()
        fetchStock()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to process reservation')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Delete Reservation
  const handleDeleteReservation = async (reservationId) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/modules/wooden-flooring/inventory/reservations?id=${reservationId}`, {
        method: 'DELETE',
        headers
      })
      
      if (res.ok) {
        toast.success('Reservation deleted')
        fetchReservations()
        fetchStock()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete reservation')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Grant Warehouse Access
  const handleGrantAccess = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/modules/wooden-flooring/inventory/access', {
        method: 'POST',
        headers,
        body: JSON.stringify(accessForm)
      })
      
      if (res.ok) {
        toast.success('Access granted')
        fetchAccessRecords()
        setDialogOpen({ type: null, data: null })
        setAccessForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to grant access')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Revoke Warehouse Access
  const handleRevokeAccess = async (accessId) => {
    if (!confirm('Are you sure you want to revoke this access?')) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/modules/wooden-flooring/inventory/access?id=${accessId}`, {
        method: 'DELETE',
        headers
      })
      
      if (res.ok) {
        toast.success('Access revoked')
        fetchAccessRecords()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to revoke access')
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
  // RENDER: GRN VIEW
  // =============================================

  const renderGrnView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Goods Receipt Notes (GRN)</h3>
          <p className="text-sm text-slate-500">Record incoming goods from vendors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('grn')}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { setGrnForm({ items: [], warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'grn', data: null }) }}>
            <Plus className="h-4 w-4 mr-2" /> New GRN
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Total GRNs" value={grnSummary.total || 0} icon={Receipt} color="bg-slate-500" />
        <StatCard title="Draft" value={grnSummary.draft || 0} icon={FileText} color="bg-amber-500" />
        <StatCard title="Received" value={grnSummary.received || 0} icon={CheckCircle2} color="bg-green-500" />
        <StatCard title="Total Value" value={`₹${((grnSummary.totalValue || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-blue-500" />
      </div>

      {/* GRN List */}
      {grns.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">GRN #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Value</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grns.map(grn => {
                  const statusConfig = GRN_STATUS[grn.status] || {}
                  return (
                    <tr key={grn.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{grn.grnNumber}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{grn.vendorName || '-'}</td>
                      <td className="px-4 py-3 text-sm">{grn.warehouseName}</td>
                      <td className="px-4 py-3 text-sm">{grn.invoiceNumber || '-'}</td>
                      <td className="px-4 py-3 text-center">{grn.items?.length || 0}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{(grn.totalValue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {new Date(grn.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialogOpen({ type: 'view_grn', data: grn })}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {grn.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleGrnAction(grn.id, 'receive')}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Receive Goods
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleGrnAction(grn.id, 'cancel')}>
                                  <X className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </>
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
          icon={Receipt}
          title="No GRNs"
          description="Create a GRN when receiving goods from vendors."
          action={() => { setGrnForm({ items: [], warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'grn', data: null }) }}
          actionLabel="New GRN"
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: CHALLANS VIEW
  // =============================================

  // Sync challans from dispatch management
  const syncChallansFromDispatch = async () => {
    try {
      const res = await fetch('/api/inventory/challans/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ syncAll: true })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Synced ${data.synced || 0} challans from dispatch`)
        fetchChallans()
      } else {
        toast.error(data.error || 'Failed to sync challans')
      }
    } catch (error) {
      toast.error('Failed to sync challans from dispatch')
      console.error('Challan sync error:', error)
    }
  }

  // Send Challan via WhatsApp
  const sendChallanWhatsApp = (challan, recipient) => {
    const phone = recipient === 'customer' ? challan.contactPhone : challan.driverPhone
    if (!phone) {
      toast.error('Phone number not available')
      return
    }

    // Format phone number (remove spaces, dashes and ensure country code)
    let formattedPhone = phone.replace(/[\s-]/g, '')
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.startsWith('91') ? '+' + formattedPhone : '+91' + formattedPhone
    }
    formattedPhone = formattedPhone.replace('+', '')

    // Build WhatsApp message
    const itemsList = (challan.items || [])
      .map((item, i) => `${i + 1}. ${item.productName || item.name} - Qty: ${item.quantity}`)
      .join('\n')

    let message = ''
    if (recipient === 'customer') {
      message = `📦 *Delivery Challan - ${challan.challanNumber}*

Hello${challan.customerName ? ' ' + challan.customerName : ''},

Your delivery is ${challan.status === 'dispatched' ? 'on the way!' : 'being prepared.'}

*Items:*
${itemsList}

*Total Value:* ₹${(challan.totalValue || 0).toLocaleString()}

*Driver Details:*
Name: ${challan.driverName || 'N/A'}
Phone: ${challan.driverPhone || 'N/A'}
Vehicle: ${challan.vehicleNumber || 'N/A'}

*Delivery Address:*
${challan.deliveryAddress || 'As per order'}

Thank you for your business!`
    } else {
      message = `🚛 *Delivery Assignment - ${challan.challanNumber}*

Hello ${challan.driverName || 'Driver'},

New delivery assigned to you.

*Customer:* ${challan.customerName || 'N/A'}
*Contact:* ${challan.contactPhone || 'N/A'}

*Delivery Address:*
${challan.deliveryAddress || 'Check with office'}

*Items to deliver:*
${itemsList}

*Total Value:* ₹${(challan.totalValue || 0).toLocaleString()}

Please confirm receipt of goods and update status after delivery.`
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

    // Open WhatsApp
    window.open(whatsappUrl, '_blank')
    toast.success(`Opening WhatsApp for ${recipient}`)
  }

  const renderChallansView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Challans</h3>
          <p className="text-sm text-slate-500">Synced from Dispatch Management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={syncChallansFromDispatch}>
            <RefreshCw className="h-4 w-4 mr-2" /> Sync from Dispatch
          </Button>
          <Button variant="outline" onClick={() => handleExport('challans')}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" onClick={fetchChallans}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Challans Sync from Dispatch Management</p>
              <p className="text-sm text-blue-600">
                Delivery challans are automatically created when goods are dispatched. Click &quot;Sync from Dispatch&quot; to pull latest challans.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Total Challans" value={challanSummary.total || 0} icon={Truck} color="bg-slate-500" />
        <StatCard title="Draft" value={challanSummary.draft || 0} icon={FileText} color="bg-slate-400" />
        <StatCard title="Dispatched" value={challanSummary.dispatched || 0} icon={Send} color="bg-blue-500" />
        <StatCard title="Delivered" value={challanSummary.delivered || 0} icon={CheckCircle2} color="bg-green-500" />
      </div>

      {/* Challan List */}
      {challans.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Challan #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer/Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Driver</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {challans.map(challan => {
                  const statusConfig = CHALLAN_STATUS[challan.status] || {}
                  return (
                    <tr key={challan.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{challan.challanNumber}</Badge>
                        {challan.syncedFromDispatch && (
                          <Badge variant="secondary" className="ml-1 text-xs">Synced</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{challan.customerName || challan.projectName || '-'}</p>
                        {challan.contactPhone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {challan.contactPhone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{challan.warehouseName}</td>
                      <td className="px-4 py-3 text-center">{challan.items?.length || 0}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{(challan.totalValue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{challan.driverName || '-'}</p>
                          {challan.driverPhone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {challan.driverPhone}
                            </p>
                          )}
                          {challan.vehicleNumber && (
                            <p className="text-xs text-slate-400">{challan.vehicleNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {new Date(challan.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialogOpen({ type: 'view_challan', data: challan })}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {/* WhatsApp Send to Customer */}
                            {challan.contactPhone && (
                              <DropdownMenuItem onClick={() => sendChallanWhatsApp(challan, 'customer')}>
                                <Send className="h-4 w-4 mr-2" /> WhatsApp to Customer
                              </DropdownMenuItem>
                            )}
                            {/* WhatsApp Send to Driver */}
                            {challan.driverPhone && (
                              <DropdownMenuItem onClick={() => sendChallanWhatsApp(challan, 'driver')}>
                                <Truck className="h-4 w-4 mr-2" /> WhatsApp to Driver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {challan.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleChallanAction(challan.id, 'dispatch')}>
                                  <Truck className="h-4 w-4 mr-2" /> Dispatch
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleChallanAction(challan.id, 'cancel')}>
                                  <X className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {challan.status === 'dispatched' && (
                              <DropdownMenuItem onClick={() => handleChallanAction(challan.id, 'deliver')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Delivered
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
          icon={Truck}
          title="No Delivery Challans"
          description="Create a challan to dispatch goods to customers or projects."
          action={() => { setChallanForm({ items: [], warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'challan', data: null }) }}
          actionLabel="New Challan"
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: RESERVATIONS VIEW
  // =============================================

  const renderReservationsView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bookmark className="h-5 w-5" /> Stock Reservations
          </h3>
          <p className="text-sm text-slate-500">Reserve inventory for projects or sales orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('reservations')}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { setReservationForm({ warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'reservation', data: null }) }}>
            <Plus className="h-4 w-4 mr-2" /> New Reservation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Reservations"
          value={reservationSummary.active || 0}
          icon={Lock}
          color="bg-blue-500"
        />
        <StatCard
          title="Pending"
          value={reservationSummary.pending || 0}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Total Reserved Qty"
          value={`${(reservationSummary.totalQuantity || 0).toLocaleString()} sqft`}
          icon={Package}
          color="bg-indigo-500"
        />
        <StatCard
          title="Total"
          value={reservationSummary.total || 0}
          icon={Bookmark}
          color="bg-slate-500"
        />
      </div>

      {/* Reservations Table */}
      {reservations.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reservation #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Project/Customer</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map(res => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Badge variant="outline">{res.reservationNumber}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{res.productName}</p>
                      <p className="text-xs text-slate-500">{res.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Warehouse className="h-3 w-3 text-slate-400" />
                        <span className="text-sm">{res.warehouseName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold">{(res.quantity || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      {res.projectName && <p className="font-medium">{res.projectName}</p>}
                      {res.customerName && <p className="text-sm text-slate-500">{res.customerName}</p>}
                      {res.orderNumber && <p className="text-xs text-slate-400">Order: {res.orderNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        res.status === 'active' ? 'bg-green-100 text-green-700' :
                        res.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        res.status === 'fulfilled' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {res.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{new Date(res.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500">{res.createdByName}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {res.status === 'active' && (
                            <>
                              <DropdownMenuItem onClick={() => handleReservationAction(res.id, 'release')}>
                                <Unlock className="h-4 w-4 mr-2" /> Release
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReservationAction(res.id, 'fulfill')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Fulfill
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteReservation(res.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No Stock Reservations"
          description="Reserve inventory for projects or customer orders to ensure stock availability."
          action={() => { setReservationForm({ warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : '' }); setDialogOpen({ type: 'reservation', data: null }) }}
          actionLabel="New Reservation"
        />
      )}
    </div>
  )

  // =============================================
  // RENDER: ACCESS MANAGEMENT VIEW
  // =============================================

  const renderAccessView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5" /> Warehouse Access Control
          </h3>
          <p className="text-sm text-slate-500">Manage user permissions for warehouses</p>
        </div>
        <Button onClick={() => { setAccessForm({}); setDialogOpen({ type: 'access', data: null }) }}>
          <Plus className="h-4 w-4 mr-2" /> Grant Access
        </Button>
      </div>

      {/* Access Records Table */}
      {accessRecords.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Access Level</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Permissions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Granted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Granted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accessRecords.map(access => (
                  <tr key={access.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{access.userName}</p>
                      <p className="text-xs text-slate-500">{access.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Warehouse className="h-3 w-3 text-slate-400" />
                        <span className="text-sm">{access.warehouseName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        access.accessLevel === 'full' ? 'bg-green-100 text-green-700' :
                        access.accessLevel === 'manager' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {access.accessLevel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-1">
                        {access.permissions?.canView && <Badge variant="outline" className="text-xs">View</Badge>}
                        {access.permissions?.canEdit && <Badge variant="outline" className="text-xs">Edit</Badge>}
                        {access.permissions?.canTransfer && <Badge variant="outline" className="text-xs">Transfer</Badge>}
                        {access.permissions?.canAdjust && <Badge variant="outline" className="text-xs">Adjust</Badge>}
                        {access.permissions?.canGRN && <Badge variant="outline" className="text-xs">GRN</Badge>}
                        {access.permissions?.canChallan && <Badge variant="outline" className="text-xs">Challan</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{access.grantedByName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{new Date(access.grantedAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRevokeAccess(access.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={UserCheck}
          title="No Access Records"
          description="Grant warehouse access to team members to control who can view and manage inventory in each location."
          action={() => { setAccessForm({}); setDialogOpen({ type: 'access', data: null }) }}
          actionLabel="Grant Access"
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
              <PhoneInput
                label="Contact Phone"
                name="contactPhone"
                value={warehouseForm.contactPhone || ''}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, contactPhone: e.target.value })}
                defaultCountry="IN"
              />
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

      {/* GRN Creation Dialog */}
      <Dialog open={dialogOpen.type === 'grn'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Create Goods Receipt Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warehouse *</Label>
                <Select
                  value={grnForm.warehouseId || ''}
                  onValueChange={(v) => setGrnForm({ ...grnForm, warehouseId: v })}
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
                <Label>Vendor Name</Label>
                <Input
                  value={grnForm.vendorName || ''}
                  onChange={(e) => setGrnForm({ ...grnForm, vendorName: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number</Label>
                <Input
                  value={grnForm.invoiceNumber || ''}
                  onChange={(e) => setGrnForm({ ...grnForm, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <Label>PO Number</Label>
                <Input
                  value={grnForm.purchaseOrderNumber || ''}
                  onChange={(e) => setGrnForm({ ...grnForm, purchaseOrderNumber: e.target.value })}
                  placeholder="PO-001"
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={() => setGrnForm({
                  ...grnForm,
                  items: [...(grnForm.items || []), { productId: '', quantity: 0, unitCost: 0 }]
                })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {(grnForm.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded">
                  <Select
                    value={item.productId || ''}
                    onValueChange={(v) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].productId = v
                      setGrnForm({ ...grnForm, items: newItems })
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
                    className="w-[100px]"
                    placeholder="Qty"
                    value={item.quantity || ''}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].quantity = parseFloat(e.target.value) || 0
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                  />
                  <Input
                    type="number"
                    className="w-[100px]"
                    placeholder="Cost"
                    value={item.unitCost || ''}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].unitCost = parseFloat(e.target.value) || 0
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                  />
                  <Input
                    className="w-[120px]"
                    placeholder="Batch #"
                    value={item.batchNumber || ''}
                    onChange={(e) => {
                      const newItems = [...grnForm.items]
                      newItems[idx].batchNumber = e.target.value
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const newItems = grnForm.items.filter((_, i) => i !== idx)
                      setGrnForm({ ...grnForm, items: newItems })
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={grnForm.notes || ''}
                onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button 
              onClick={handleCreateGRN} 
              disabled={loading || !grnForm.warehouseId || !grnForm.items?.length || grnForm.items.some(i => !i.productId || !i.quantity)}
            >
              {loading ? 'Creating...' : 'Create GRN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View GRN Dialog */}
      <Dialog open={dialogOpen.type === 'view_grn'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>GRN Details</DialogTitle>
          </DialogHeader>
          {dialogOpen.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-lg">{dialogOpen.data.grnNumber}</Badge>
                <Badge className={GRN_STATUS[dialogOpen.data.status]?.color}>
                  {GRN_STATUS[dialogOpen.data.status]?.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Warehouse:</span> {dialogOpen.data.warehouseName}</div>
                <div><span className="text-slate-500">Vendor:</span> {dialogOpen.data.vendorName || '-'}</div>
                <div><span className="text-slate-500">Invoice:</span> {dialogOpen.data.invoiceNumber || '-'}</div>
                <div><span className="text-slate-500">Total Value:</span> ₹{(dialogOpen.data.totalValue || 0).toLocaleString()}</div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Items</Label>
                <div className="space-y-2 mt-2">
                  {dialogOpen.data.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-slate-500">{item.batchNumber || 'No batch'}</p>
                      </div>
                      <div className="text-right">
                        <p>{item.quantity} units</p>
                        <p className="text-xs text-slate-500">₹{item.unitCost}/unit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challan Creation Dialog */}
      <Dialog open={dialogOpen.type === 'challan'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Create Delivery Challan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warehouse *</Label>
                <Select
                  value={challanForm.warehouseId || ''}
                  onValueChange={(v) => setChallanForm({ ...challanForm, warehouseId: v })}
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
                <Label>Customer Name</Label>
                <Input
                  value={challanForm.customerName || ''}
                  onChange={(e) => setChallanForm({ ...challanForm, customerName: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
            </div>
            <div>
              <Label>Delivery Address</Label>
              <Textarea
                value={challanForm.deliveryAddress || ''}
                onChange={(e) => setChallanForm({ ...challanForm, deliveryAddress: e.target.value })}
                placeholder="Full delivery address"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Vehicle Number</Label>
                <Input
                  value={challanForm.vehicleNumber || ''}
                  onChange={(e) => setChallanForm({ ...challanForm, vehicleNumber: e.target.value })}
                  placeholder="MH01AB1234"
                />
              </div>
              <div>
                <Label>Driver Name</Label>
                <Input
                  value={challanForm.driverName || ''}
                  onChange={(e) => setChallanForm({ ...challanForm, driverName: e.target.value })}
                />
              </div>
              <PhoneInput
                label="Driver Phone"
                name="driverPhone"
                value={challanForm.driverPhone || ''}
                onChange={(e) => setChallanForm({ ...challanForm, driverPhone: e.target.value })}
                defaultCountry="IN"
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={() => setChallanForm({
                  ...challanForm,
                  items: [...(challanForm.items || []), { productId: '', quantity: 0 }]
                })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {(challanForm.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded">
                  <Select
                    value={item.productId || ''}
                    onValueChange={(v) => {
                      const newItems = [...challanForm.items]
                      newItems[idx].productId = v
                      setChallanForm({ ...challanForm, items: newItems })
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
                    className="w-[100px]"
                    placeholder="Qty"
                    value={item.quantity || ''}
                    onChange={(e) => {
                      const newItems = [...challanForm.items]
                      newItems[idx].quantity = parseFloat(e.target.value) || 0
                      setChallanForm({ ...challanForm, items: newItems })
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const newItems = challanForm.items.filter((_, i) => i !== idx)
                      setChallanForm({ ...challanForm, items: newItems })
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button 
              onClick={handleCreateChallan} 
              disabled={loading || !challanForm.warehouseId || !challanForm.items?.length || challanForm.items.some(i => !i.productId || !i.quantity)}
            >
              {loading ? 'Creating...' : 'Create Challan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Challan Dialog */}
      <Dialog open={dialogOpen.type === 'view_challan'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delivery Challan Details</DialogTitle>
          </DialogHeader>
          {dialogOpen.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-lg">{dialogOpen.data.challanNumber}</Badge>
                <Badge className={CHALLAN_STATUS[dialogOpen.data.status]?.color}>
                  {CHALLAN_STATUS[dialogOpen.data.status]?.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Customer:</span> {dialogOpen.data.customerName || '-'}</div>
                <div><span className="text-slate-500">Warehouse:</span> {dialogOpen.data.warehouseName}</div>
                <div><span className="text-slate-500">Vehicle:</span> {dialogOpen.data.vehicleNumber || '-'}</div>
                <div><span className="text-slate-500">Driver:</span> {dialogOpen.data.driverName || '-'}</div>
              </div>
              {dialogOpen.data.deliveryAddress && (
                <div className="text-sm">
                  <span className="text-slate-500">Delivery Address:</span>
                  <p>{dialogOpen.data.deliveryAddress}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-slate-500">Items</Label>
                <div className="space-y-2 mt-2">
                  {dialogOpen.data.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p>{item.quantity} units</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-slate-500">Total Value:</span>
                <span className="font-semibold">₹{(dialogOpen.data.totalValue || 0).toLocaleString()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Lookup Result Dialog */}
      <Dialog open={dialogOpen.type === 'lookup_result'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Product Lookup Result
            </DialogTitle>
          </DialogHeader>
          {dialogOpen.data?.found && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold">{dialogOpen.data.product?.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{dialogOpen.data.product?.sku}</Badge>
                      {dialogOpen.data.product?.barcode && (
                        <Badge variant="outline" className="bg-slate-100">{dialogOpen.data.product.barcode}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{dialogOpen.data.product?.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Cost: ₹{dialogOpen.data.product?.costPrice || 0}</p>
                    <p className="text-sm text-slate-500">Sell: ₹{dialogOpen.data.product?.sellingPrice || 0}</p>
                  </div>
                </div>
              </div>

              {/* Inventory Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-700">{dialogOpen.data.inventory?.totalQuantity || 0}</p>
                  <p className="text-xs text-slate-500">Total Quantity</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{dialogOpen.data.inventory?.totalAvailable || 0}</p>
                  <p className="text-xs text-slate-500">Available</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-700">{dialogOpen.data.inventory?.warehouseCount || 0}</p>
                  <p className="text-xs text-slate-500">Warehouses</p>
                </div>
              </div>

              {/* Stock by Warehouse */}
              {dialogOpen.data.inventory?.stockByWarehouse?.length > 0 && (
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">Stock by Warehouse</Label>
                  <div className="space-y-2">
                    {dialogOpen.data.inventory.stockByWarehouse.map((wh, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{wh.warehouseName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{wh.quantity} total</p>
                            <p className="text-xs text-green-600">{wh.availableQty} available</p>
                          </div>
                          {wh.reservedQty > 0 && (
                            <Badge className="bg-amber-100 text-amber-700">
                              <Lock className="h-3 w-3 mr-1" /> {wh.reservedQty} reserved
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Batches */}
              {dialogOpen.data.batches?.length > 0 && (
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">Recent Batches</Label>
                  <div className="max-h-[150px] overflow-y-auto space-y-2">
                    {dialogOpen.data.batches.map((batch, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div>
                          <Badge variant="outline">{batch.batchNumber}</Badge>
                          <span className="text-sm text-slate-500 ml-2">{batch.warehouseName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{batch.quantity} units</p>
                          {batch.expiryDate && (
                            <p className="text-xs text-slate-500">Exp: {new Date(batch.expiryDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Reservation Dialog */}
      <Dialog open={dialogOpen.type === 'reservation'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" /> Create Stock Reservation
            </DialogTitle>
            <DialogDescription>
              Reserve inventory for a project or customer order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warehouse *</Label>
                <Select
                  value={reservationForm.warehouseId || ''}
                  onValueChange={(v) => setReservationForm({ ...reservationForm, warehouseId: v })}
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
                <Label>Product *</Label>
                <Select
                  value={reservationForm.productId || ''}
                  onValueChange={(v) => setReservationForm({ ...reservationForm, productId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={reservationForm.quantity || ''}
                  onChange={(e) => setReservationForm({ ...reservationForm, quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={reservationForm.expiryDate || ''}
                  onChange={(e) => setReservationForm({ ...reservationForm, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium text-slate-600">Link to:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Project Name</Label>
                <Input
                  value={reservationForm.projectName || ''}
                  onChange={(e) => setReservationForm({ ...reservationForm, projectName: e.target.value })}
                  placeholder="e.g., XYZ Interior Project"
                />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={reservationForm.customerName || ''}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                  placeholder="e.g., ABC Enterprises"
                />
              </div>
            </div>
            <div>
              <Label>Order Number</Label>
              <Input
                value={reservationForm.orderNumber || ''}
                onChange={(e) => setReservationForm({ ...reservationForm, orderNumber: e.target.value })}
                placeholder="e.g., SO-2024-0001"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={reservationForm.notes || ''}
                onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button 
              onClick={handleCreateReservation} 
              disabled={loading || !reservationForm.warehouseId || !reservationForm.productId || !reservationForm.quantity}
            >
              {loading ? 'Creating...' : 'Create Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={dialogOpen.type === 'access'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Grant Warehouse Access
            </DialogTitle>
            <DialogDescription>
              Assign warehouse permissions to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User *</Label>
              <Select
                value={accessForm.userId || ''}
                onValueChange={(v) => setAccessForm({ ...accessForm, userId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warehouse *</Label>
              <Select
                value={accessForm.warehouseId || ''}
                onValueChange={(v) => setAccessForm({ ...accessForm, warehouseId: v })}
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
              <Label>Access Level</Label>
              <Select
                value={accessForm.accessLevel || 'standard'}
                onValueChange={(v) => setAccessForm({ ...accessForm, accessLevel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard - View Only</SelectItem>
                  <SelectItem value="manager">Manager - View & Edit</SelectItem>
                  <SelectItem value="full">Full Access - All Permissions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <p className="text-sm font-medium text-slate-600">Specific Permissions</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="canView" 
                  checked={accessForm.canView !== false}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, canView: v })}
                />
                <Label htmlFor="canView" className="text-sm">Can View</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="canEdit" 
                  checked={accessForm.canEdit === true}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, canEdit: v })}
                />
                <Label htmlFor="canEdit" className="text-sm">Can Edit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="canTransfer" 
                  checked={accessForm.canTransfer === true}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, canTransfer: v })}
                />
                <Label htmlFor="canTransfer" className="text-sm">Can Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="canAdjust" 
                  checked={accessForm.canAdjust === true}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, canAdjust: v })}
                />
                <Label htmlFor="canAdjust" className="text-sm">Can Adjust</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="canGRN" 
                  checked={accessForm.canGRN === true}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, canGRN: v })}
                />
                <Label htmlFor="canGRN" className="text-sm">Can Create GRN</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="canChallan" 
                  checked={accessForm.canChallan === true}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, canChallan: v })}
                />
                <Label htmlFor="canChallan" className="text-sm">Can Create Challan</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button 
              onClick={handleGrantAccess} 
              disabled={loading || !accessForm.userId || !accessForm.warehouseId}
            >
              {loading ? 'Granting...' : 'Grant Access'}
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
          {/* Quick SKU/Barcode Lookup */}
          <div className="relative">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="SKU / Barcode lookup..."
              value={lookupSearch}
              onChange={(e) => setLookupSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && lookupSearch.length >= 2) {
                  handleQuickLookup(lookupSearch)
                }
              }}
              className="pl-10 w-[180px]"
            />
            {lookupLoading && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => lookupSearch.length >= 2 && handleQuickLookup(lookupSearch)} disabled={lookupLoading || lookupSearch.length < 2}>
            <Search className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-8" />
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('stock')}>
                <Package className="h-4 w-4 mr-2" /> Stock Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('movements')}>
                <History className="h-4 w-4 mr-2" /> Movements
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('batches')}>
                <Layers className="h-4 w-4 mr-2" /> Batches
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('warehouses')}>
                <Warehouse className="h-4 w-4 mr-2" /> Warehouses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('valuation')}>
                <DollarSign className="h-4 w-4 mr-2" /> Valuation Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('grn')}>
                <Receipt className="h-4 w-4 mr-2" /> GRN Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('challans')}>
                <Truck className="h-4 w-4 mr-2" /> Challans Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
        <TabsList className="bg-slate-100 flex-wrap h-auto p-1">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="grn" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> GRN
          </TabsTrigger>
          <TabsTrigger value="challans" className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Challans
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Movements
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Transfers
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Batches
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Alerts
            {(alertSummary.total || 0) > 0 && (
              <Badge variant="secondary" className="ml-1">{alertSummary.total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="cycle_count" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Audit
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" /> Reservations
            {(reservationSummary.active || 0) > 0 && (
              <Badge variant="secondary" className="ml-1">{reservationSummary.active}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" /> Warehouses
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Access
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="stock">{renderStockView()}</TabsContent>
          <TabsContent value="grn">{renderGrnView()}</TabsContent>
          <TabsContent value="challans">{renderChallansView()}</TabsContent>
          <TabsContent value="movements">{renderMovementsView()}</TabsContent>
          <TabsContent value="transfers">{renderTransfersView()}</TabsContent>
          <TabsContent value="batches">{renderBatchesView()}</TabsContent>
          <TabsContent value="alerts">{renderAlertsView()}</TabsContent>
          <TabsContent value="reports">{renderReportsView()}</TabsContent>
          <TabsContent value="cycle_count">{renderCycleCountView()}</TabsContent>
          <TabsContent value="reservations">{renderReservationsView()}</TabsContent>
          <TabsContent value="warehouses">{renderWarehouseManagement()}</TabsContent>
          <TabsContent value="access">{renderAccessView()}</TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      {renderDialogs()}
    </div>
  )
}
