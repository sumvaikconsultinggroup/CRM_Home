'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard, Package, ClipboardList, FileText, ShoppingCart, Factory,
  Truck, Wrench, Shield, Bell, BarChart3, Settings, Plus, Search, Filter,
  RefreshCw, Download, Upload, Eye, Edit, Trash2, ChevronRight, ChevronDown,
  ArrowRight, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock,
  AlertTriangle, Calendar, MapPin, Phone, Mail, User, Building2, Ruler,
  Layers, Grid3X3, Box, Palette, Cog, Hammer, DoorOpen, Maximize2,
  MoreHorizontal, Send, FileCheck, Loader2, TrendingUp, TrendingDown,
  Brain, MessageSquare, Sparkles, Zap, Save, Printer, FolderKanban,
  Cloud, Link2, Users, Home, Activity, Receipt, Ticket,
  IndianRupee, CreditCard, Award, ScrollText, Wallet, Banknote
} from 'lucide-react'
import { toast } from 'sonner'

// Import sub-components
import { DashboardTab } from './DashboardTab'
import { SiteSurvey } from './SiteSurvey'
import { QuoteBuilder } from './QuoteBuilder'
import { ProjectsTab } from './ProjectsTab'
import { CRMSync } from './CRMSync'
import { ProductionTab } from './ProductionTab'
import { InstallationTab } from './InstallationTab'
import { WarrantyTicketsTab } from './WarrantyTicketsTab'
import { ReportsTab } from './ReportsTab'
import { SettingsTab } from './SettingsTab'
import { MEEAIFloater } from './MEEAIFloater'
import { DoorWindow3DPreview } from './DoorWindow3DPreview'
import { EnterpriseInventoryDW } from './EnterpriseInventory'
import { EnterpriseFinanceDW } from './EnterpriseFinance'
import { DealersTab } from './DealersTab'
import { PriceListsTab } from './PriceListsTab'
import { QualityControlTab } from './QualityControlTab'
import { CollectionsTab } from './CollectionsTab'
import { PRODUCT_FAMILIES, CATEGORIES, PRODUCT_TYPES, GLASS_TYPES, HARDWARE_TYPES, FINISHES, PRICING_RATES } from './constants'

const API_BASE = '/api/modules/doors-windows'

// Glassmorphism styles
const glassStyles = {
  card: 'backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl',
  header: 'backdrop-blur-md bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-blue-600/90',
  button: 'backdrop-blur-sm bg-white/80 hover:bg-white/90 border border-white/30',
  tab: 'backdrop-blur-sm data-[state=active]:bg-white/90 data-[state=active]:shadow-lg',
}

// Tab groups for better organization - MODE SPECIFIC
// Fabricator/Dealer: Full customer-facing workflow with site surveys
// Manufacturer: B2B production-focused, no site surveys, dealer network management

const TAB_GROUPS_FABRICATOR = {
  main: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'surveys', label: 'Site Survey', icon: ClipboardList },
    { id: 'quotes', label: 'Quotes', icon: FileText },
  ],
  operations: [
    { id: 'orders', label: 'Orders & Challans', icon: ShoppingCart, highlight: true },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'installation', label: 'Installation', icon: Wrench },
  ],
  module: [
    { id: 'inventory', label: 'Products & Inventory', icon: Package, highlight: true },
    { id: 'finance', label: 'Finance', icon: IndianRupee, highlight: true },
  ],
  support: [
    { id: 'warranty', label: 'Warranty', icon: Shield },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]
}

const TAB_GROUPS_MANUFACTURER = {
  main: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dealers', label: 'Dealer Network', icon: Users, highlight: true },
    { id: 'price-lists', label: 'Price Lists', icon: FileText },
    { id: 'orders', label: 'Dealer Orders', icon: ShoppingCart },
  ],
  operations: [
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'production', label: 'Production', icon: Factory, highlight: true },
    { id: 'quality', label: 'Quality Control', icon: CheckCircle2 },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
  ],
  module: [
    { id: 'inventory', label: 'Products & Inventory', icon: Package, highlight: true },
    { id: 'finance', label: 'Finance', icon: IndianRupee, highlight: true },
    { id: 'collections', label: 'Collections', icon: Wallet, highlight: true },
  ],
  support: [
    { id: 'warranty', label: 'Warranty', icon: Shield },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]
}


// Legacy constant for backward compatibility
const TAB_GROUPS = TAB_GROUPS_FABRICATOR

export function DoorsWindowsModule({ client, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Business Mode Toggle: 'manufacturer' or 'fabricator'
  // Manufacturer: Runs on dealership model, sells to dealers, has dealer network
  // Fabricator/Dealer: Buys from manufacturer, sells to end customers
  const [businessMode, setBusinessMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dw_business_mode') || 'fabricator'
    }
    return 'fabricator'
  })
  
  // Data states
  const [dashboard, setDashboard] = useState(null)
  const [surveys, setSurveys] = useState([])
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [installations, setInstallations] = useState([])
  const [serviceTickets, setServiceTickets] = useState([])
  const [warranties, setWarranties] = useState([])
  const [inventory, setInventory] = useState([])
  const [moduleSettings, setModuleSettings] = useState({})
  
  // Projects & CRM states
  const [projects, setProjects] = useState([])
  const [crmSyncStatus, setCrmSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  
  // Notification bar states
  const [pendingSyncNotification, setPendingSyncNotification] = useState(null)
  const [showSyncNotification, setShowSyncNotification] = useState(true)

  // Challans state (Single Source of Truth)
  const [challans, setChallans] = useState([])
  const [challanStats, setChallanStats] = useState({ total: 0, draft: 0, dispatched: 0, delivered: 0 })
  const [showChallanDialog, setShowChallanDialog] = useState(false)
  const [selectedOrderForChallan, setSelectedOrderForChallan] = useState(null)
  
  // Finance sync state
  const [syncingToFinance, setSyncingToFinance] = useState(false)
  const [financeSyncStatus, setFinanceSyncStatus] = useState({})
  
  // Pre-loaded data for instant tab switching
  const [installationsData, setInstallationsData] = useState({ installations: [], stats: {} })
  const [inventoryData, setInventoryData] = useState({ inventory: [], warehouses: [], suppliers: [] })
  const [financeData, setFinanceData] = useState({ transactions: [], summary: {} })

  // Handle business mode toggle
  const toggleBusinessMode = (mode) => {
    setBusinessMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dw_business_mode', mode)
    }
    toast.success(`Switched to ${mode === 'manufacturer' ? 'Manufacturer' : 'Fabricator'} mode`)
  }

  // Memoize headers to prevent unnecessary recalculations
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = useMemo(() => ({ 
    'Authorization': `Bearer ${token}`, 
    'Content-Type': 'application/json' 
  }), [token])

  // OPTIMIZED: Fetch critical data first, then secondary data
  useEffect(() => {
    fetchCriticalData()
  }, [refreshKey])

  // NEW: Auto-sync CRM projects on module load
  useEffect(() => {
    // Run auto-sync after initial data load completes
    if (initialLoadComplete) {
      performAutoSync()
    }
  }, [initialLoadComplete])

  // NEW: Auto-sync function - silently syncs CRM projects to D&W
  const performAutoSync = async () => {
    try {
      const statusRes = await fetch(`${API_BASE}/sync?action=status`, { headers })
      const statusData = await statusRes.json()
      
      const availableProjects = statusData.availableToSync?.projects || 0
      
      // If there are unsynced projects, auto-sync them
      if (availableProjects > 0) {
        console.log(`Auto-syncing ${availableProjects} CRM projects...`)
        
        const syncRes = await fetch(`${API_BASE}/sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'sync-all' })
        })
        
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          const projectsSynced = syncData.results?.projects?.created || 0
          
          if (projectsSynced > 0) {
            toast.success(`Auto-synced ${projectsSynced} project${projectsSynced > 1 ? 's' : ''} from CRM`)
            // Refresh projects list after auto-sync
            fetchProjects()
            fetchCrmSyncStatus()
          }
        }
      }
    } catch (error) {
      console.error('Auto-sync error:', error)
      // Don't show error toast for auto-sync - it's a background operation
    }
  }

  // NEW: Optimized critical data fetch (dashboard only for fast initial load)
  const fetchCriticalData = async () => {
    setLoading(true)
    try {
      // Step 1: Fetch dashboard ONLY for instant display
      const dashboardRes = await fetch(`${API_BASE}/dashboard`, { headers })
      const dashboardData = await dashboardRes.json()
      if (!dashboardData.error) setDashboard(dashboardData)
      setLoading(false) // Show dashboard immediately
      setInitialLoadComplete(true)

      // Step 2: Fetch remaining data in background (parallel)
      fetchSecondaryData()
      fetchProjects()
      fetchCrmSyncStatus()
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
      setLoading(false)
      setInitialLoadComplete(true)
      // Still try to load secondary data
      fetchSecondaryData()
      fetchProjects()
    }
  }

  // NEW: Secondary data fetch (runs in background after dashboard loads)
  const fetchSecondaryData = async () => {
    try {
      // Fetch all data in parallel for instant tab switching
      const [surveysRes, quotesRes, ordersRes, invoicesRes, challansRes, installationsRes, inventoryRes, warehousesRes] = await Promise.all([
        fetch(`${API_BASE}/surveys`, { headers }),
        fetch(`${API_BASE}/quotations`, { headers }),
        fetch(`${API_BASE}/orders`, { headers }),
        fetch(`${API_BASE}/invoices`, { headers }),
        fetch(`${API_BASE}/challans`, { headers }),
        fetch(`${API_BASE}/installation`, { headers }),
        fetch(`${API_BASE}/inventory`, { headers }),
        fetch(`${API_BASE}/warehouses`, { headers })
      ])

      const [surveysData, quotesData, ordersData, invoicesData, challansData, installationsDataRes, inventoryDataRes, warehousesDataRes] = await Promise.all([
        surveysRes.json(),
        quotesRes.json(),
        ordersRes.json(),
        invoicesRes.json(),
        challansRes.json(),
        installationsRes.ok ? installationsRes.json() : { installations: [], stats: {} },
        inventoryRes.ok ? inventoryRes.json() : { inventory: [] },
        warehousesRes.ok ? warehousesRes.json() : { warehouses: [] }
      ])

      if (surveysData.surveys) setSurveys(surveysData.surveys)
      if (quotesData.quotations) setQuotations(quotesData.quotations)
      if (ordersData.orders) setOrders(ordersData.orders)
      if (invoicesData.invoices) setInvoices(invoicesData.invoices)
      if (challansData.challans) {
        setChallans(challansData.challans)
        setChallanStats(challansData.summary || { total: 0, draft: 0, dispatched: 0, delivered: 0 })
      }
      
      // Pre-load installations data
      setInstallationsData({
        installations: installationsDataRes.installations || [],
        stats: installationsDataRes.stats || {}
      })
      
      // Pre-load inventory data
      setInventoryData({
        inventory: inventoryDataRes.inventory || inventoryDataRes.data?.inventory || [],
        warehouses: warehousesDataRes.warehouses || warehousesDataRes.data?.warehouses || []
      })
    } catch (error) {
      console.error('Failed to fetch secondary data:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers })
      const data = await res.json()
      if (data.projects) {
        // Show all projects, but flag lead-sourced ones differently for UI
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchCrmSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync?action=status`, { headers })
      const data = await res.json()
      if (!data.error) {
        setCrmSyncStatus(data)
        
        // Check for pending syncs (Projects and Contacts only - NO Leads)
        const availableProjects = data.availableToSync?.projects || 0
        const availableContacts = data.availableToSync?.contacts || 0
        const totalAvailable = availableProjects + availableContacts
        
        if (totalAvailable > 0) {
          setPendingSyncNotification({
            projects: availableProjects,
            contacts: availableContacts,
            total: totalAvailable
          })
        } else {
          setPendingSyncNotification(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch CRM sync status:', error)
    }
  }

  // Fetch Challans (Single Source of Truth)
  const fetchChallans = async () => {
    try {
      const res = await fetch(`${API_BASE}/challans`, { headers })
      const data = await res.json()
      if (data.challans) {
        setChallans(data.challans)
        setChallanStats(data.summary || { total: 0, draft: 0, dispatched: 0, delivered: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch challans:', error)
    }
  }

  // Create Challan from Order
  const handleCreateChallan = async (order) => {
    try {
      // Prepare items from order
      const items = order.items?.map(item => ({
        productName: item.productName || item.description || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'pcs',
        unitPrice: item.unitPrice || 0,
        dimensions: item.dimensions || {}
      })) || [{
        productName: 'Order Items',
        description: `Items from ${order.orderNumber}`,
        quantity: order.itemsCount || 1,
        unit: 'pcs',
        unitPrice: order.grandTotal / (order.itemsCount || 1),
      }]

      const res = await fetch(`${API_BASE}/challans`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.siteAddress,
          contactPerson: order.customerName,
          contactPhone: order.customerPhone,
          items,
          notes: `Delivery Challan for ${order.orderNumber}`
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Challan ${data.challanNumber} created successfully`)
        fetchChallans()
        fetchSecondaryData() // Refresh orders to update challan link
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to create challan')
      }
    } catch (error) {
      console.error('Create challan error:', error)
      toast.error('Failed to create challan')
    }
  }

  // Dispatch Challan
  const handleDispatchChallan = async (challan, vehicleInfo = {}) => {
    try {
      const res = await fetch(`${API_BASE}/challans`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: challan.id,
          action: 'dispatch',
          ...vehicleInfo
        })
      })

      if (res.ok) {
        toast.success(`Challan ${challan.challanNumber} dispatched`)
        fetchChallans()
        fetchSecondaryData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to dispatch challan')
      }
    } catch (error) {
      toast.error('Failed to dispatch challan')
    }
  }

  // Mark Challan as Delivered
  const handleDeliverChallan = async (challan, deliveryInfo = {}) => {
    try {
      const res = await fetch(`${API_BASE}/challans`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: challan.id,
          action: 'deliver',
          ...deliveryInfo
        })
      })

      if (res.ok) {
        toast.success(`Challan ${challan.challanNumber} marked as delivered`)
        fetchChallans()
        fetchSecondaryData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to mark challan as delivered')
      }
    } catch (error) {
      toast.error('Failed to mark challan as delivered')
    }
  }

  const handleCrmSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'sync-all' })
      })
      const data = await res.json()
      
      // Check if response is successful (either res.ok or data.success)
      if (res.ok && (data.success || data.results || data.message)) {
        const { results } = data
        const summary = []
        if (results?.projects?.created > 0) summary.push(`${results.projects.created} projects`)
        if (results?.contacts?.created > 0) summary.push(`${results.contacts.created} contacts`)
        if (results?.contacts?.updated > 0) summary.push(`${results.contacts.updated} updated`)
        
        toast.success(summary.length > 0 
          ? `Synced: ${summary.join(', ')}` 
          : data.message || 'Sync complete - everything up to date!')
        fetchCrmSyncStatus()
        fetchProjects()
        setShowSyncNotification(false)
        setPendingSyncNotification(null)
      } else {
        // Show detailed error message
        const errorMsg = data.error || data.details || 'Sync failed'
        console.error('Sync API Error:', data)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('CRM Sync Error:', error)
      toast.error('Failed to sync with CRM - check connection')
    } finally {
      setSyncing(false)
    }
  }

  // Fetch Finance Sync Status
  const fetchFinanceSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync-finance`, { headers })
      if (res.ok) {
        const data = await res.json()
        setFinanceSyncStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch finance sync status:', error)
    }
  }

  // Sync All to Finance
  const syncAllToFinance = async () => {
    try {
      setSyncingToFinance(true)
      const res = await fetch(`${API_BASE}/sync-finance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'bulk-sync' })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Synced ${data.synced?.quotes || 0} quotes, ${data.synced?.invoices || 0} invoices, ${data.synced?.payments || 0} payments`)
        fetchFinanceSyncStatus()
      } else {
        toast.error('Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync to Finance')
    } finally {
      setSyncingToFinance(false)
    }
  }

  // Sync single quote/invoice to Finance
  const syncToFinance = async (type, id) => {
    try {
      const res = await fetch(`${API_BASE}/sync-finance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: `sync-${type}`, [`${type}Id`]: id })
      })
      if (res.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} synced to Finance`)
        fetchFinanceSyncStatus()
      }
    } catch (error) {
      toast.error(`Failed to sync ${type} to Finance`)
    }
  }

  // Record Payment
  const recordPayment = async (paymentData) => {
    try {
      const res = await fetch(`${API_BASE}/post-invoicing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'record-payment', ...paymentData })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Payment recorded. Balance: ₹${data.balanceAmount?.toLocaleString() || 0}`)
        fetchPostInvoicingData()
        fetchInvoices()
        return data
      }
    } catch (error) {
      toast.error('Failed to record payment')
    }
  }

  // Create Delivery Challan
  const createChallan = async (challanData) => {
    try {
      const res = await fetch(`${API_BASE}/post-invoicing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create-challan', ...challanData })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Challan ${data.challan?.challanNumber} created`)
        fetchPostInvoicingData()
        return data
      }
    } catch (error) {
      toast.error('Failed to create challan')
    }
  }

  // Schedule Installation
  const scheduleInstallation = async (installData) => {
    try {
      const res = await fetch(`${API_BASE}/post-invoicing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'schedule-installation', ...installData })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Installation ${data.installation?.installationNumber} scheduled`)
        fetchPostInvoicingData()
        return data
      }
    } catch (error) {
      toast.error('Failed to schedule installation')
    }
  }

  // Register Warranty
  const registerWarranty = async (warrantyData) => {
    try {
      const res = await fetch(`${API_BASE}/post-invoicing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'register-warranty', ...warrantyData })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Warranty ${data.warranty?.warrantyNumber} registered`)
        fetchPostInvoicingData()
        return data
      }
    } catch (error) {
      toast.error('Failed to register warranty')
    }
  }

  // Fetch finance sync status when tab changes
  useEffect(() => {
    if (activeTab === 'finance-sync') {
      fetchFinanceSyncStatus()
    }
  }, [activeTab])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleSaveSettings = (newSettings) => {
    setModuleSettings(newSettings)
  }

  const handleBackToCRM = () => {
    window.location.href = '/'
  }

  // Get mode-specific tabs
  const currentTabGroups = businessMode === 'manufacturer' ? TAB_GROUPS_MANUFACTURER : TAB_GROUPS_FABRICATOR
  const allTabs = [...currentTabGroups.main, ...currentTabGroups.operations, ...(currentTabGroups.module || []), ...currentTabGroups.support]
  
  // Reset to dashboard when switching modes if current tab doesn't exist in new mode
  useEffect(() => {
    const tabExists = allTabs.some(t => t.id === activeTab)
    if (!tabExists) {
      setActiveTab('dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessMode])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Glassmorphism Header */}
      <div className={`${glassStyles.header} text-white p-6 rounded-b-3xl mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back to CRM Button */}
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 p-2"
              onClick={handleBackToCRM}
              title="Back to CRM"
            >
              <Home className="h-6 w-6" />
            </Button>
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
              <DoorOpen className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Doors & Windows</h1>
              <p className="text-white/80 mt-1">Enterprise Manufacturing & Fabrication Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Project Selector */}
            <Select 
              value={selectedProject?.id || '__all__'} 
              onValueChange={(id) => setSelectedProject(id === '__all__' ? null : projects.find(p => p.id === id))}
            >
              <SelectTrigger className="w-[220px] bg-white/20 border-white/30 text-white">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name || project.siteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* CRM Sync Button */}
            <Button 
              variant="outline" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={handleCrmSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
              {syncing ? 'Syncing...' : 'Sync CRM'}
            </Button>
            
            <Button 
              variant="outline" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* NEW: Sync Notification Bar */}
      {pendingSyncNotification && showSyncNotification && (
        <div className="mx-6 mb-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Bell className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <p className="font-semibold">New Data Available for Sync!</p>
                <p className="text-sm text-white/90">
                  {pendingSyncNotification.projects > 0 && `${pendingSyncNotification.projects} new project${pendingSyncNotification.projects > 1 ? 's' : ''}`}
                  {pendingSyncNotification.projects > 0 && pendingSyncNotification.contacts > 0 && ', '}
                  {pendingSyncNotification.contacts > 0 && `${pendingSyncNotification.contacts} contact${pendingSyncNotification.contacts > 1 ? 's' : ''}`}
                  {' '}ready to sync from CRM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white text-orange-600 hover:bg-white/90"
                onClick={() => { handleCrmSync(); setShowSyncNotification(false); }}
                disabled={syncing}
              >
                {syncing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Sync Now</>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={() => setShowSyncNotification(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pb-6">
        {/* Mode Indicator Bar */}
        <div className={`mb-4 p-3 rounded-xl ${businessMode === 'manufacturer' ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200' : 'bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200'}`}>
          <div className="flex items-center gap-3">
            {businessMode === 'manufacturer' ? (
              <>
                <Factory className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-800">Manufacturer Mode</p>
                  <p className="text-xs text-purple-600">B2B operations • Dealer network management • Production-focused workflow</p>
                </div>
              </>
            ) : (
              <>
                <Wrench className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800">Fabricator Mode</p>
                  <p className="text-xs text-emerald-600">Customer-facing • Site surveys • Full quote-to-installation workflow</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs Navigation - Mode-specific tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className={`${glassStyles.card} p-3 rounded-2xl`}>
            {/* Main Tabs */}
            <div className="flex flex-wrap gap-2 mb-2">
              {currentTabGroups.main.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white shadow-md text-indigo-600' 
                      : tab.highlight 
                        ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                        : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.highlight && <Sparkles className="h-3 w-3 text-amber-500" />}
                </button>
              ))}
              <Separator orientation="vertical" className="h-8 mx-2" />
              {currentTabGroups.operations.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white shadow-md text-indigo-600' 
                      : tab.highlight 
                        ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                        : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.highlight && <Sparkles className="h-3 w-3 text-amber-500" />}
                </button>
              ))}
              {/* Module-level tabs (Inventory & Finance) */}
              {currentTabGroups.module && currentTabGroups.module.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-8 mx-2" />
                  {currentTabGroups.module.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === tab.id 
                          ? 'bg-white shadow-md text-indigo-600' 
                          : tab.highlight 
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {tab.highlight && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </button>
                  ))}
                </>
              )}
              <Separator orientation="vertical" className="h-8 mx-2" />
              {currentTabGroups.support.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white shadow-md text-indigo-600' 
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab 
              dashboard={dashboard} 
              surveys={surveys}
              quotations={quotations}
              orders={orders}
              loading={loading}
              glassStyles={glassStyles}
            />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <ProjectsTab
              projects={projects}
              surveys={surveys}
              quotations={quotations}
              selectedProject={selectedProject}
              setSelectedProject={setSelectedProject}
              onRefresh={fetchProjects}
              headers={headers}
              glassStyles={glassStyles}
              businessMode={businessMode}
            />
          </TabsContent>

          {/* Site Survey Tab */}
          <TabsContent value="surveys" className="space-y-6">
            <SiteSurvey
              surveys={surveys}
              projects={projects}
              selectedProject={selectedProject}
              onRefresh={() => { fetchCriticalData(); fetchProjects(); }}
              headers={headers}
              user={user}
              glassStyles={glassStyles}
              businessMode={businessMode}
            />
          </TabsContent>

          {/* Quote Builder Tab */}
          <TabsContent value="quotes" className="space-y-6">
            <QuoteBuilder
              quotations={quotations}
              projects={projects}
              surveys={surveys}
              selectedProject={selectedProject}
              onRefresh={fetchCriticalData}
              headers={headers}
              user={user}
              glassStyles={glassStyles}
              businessMode={businessMode}
            />
          </TabsContent>

          {/* Orders & Challans Tab - Enterprise Grade with Single Source of Truth */}
          <TabsContent value="orders" className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card className={glassStyles.card}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-slate-500">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{orders.length}</p>
                </CardContent>
              </Card>
              <Card className={glassStyles.card}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <span className="text-sm text-slate-500">Confirmed</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{orders.filter(o => o.status === 'confirmed').length}</p>
                </CardContent>
              </Card>
              <Card className={glassStyles.card}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm text-slate-500">Challans</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{challanStats.total}</p>
                </CardContent>
              </Card>
              <Card className={glassStyles.card}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-slate-500">Dispatched</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{challanStats.dispatched}</p>
                </CardContent>
              </Card>
              <Card className={glassStyles.card}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm text-slate-500">Delivered</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{challanStats.delivered}</p>
                </CardContent>
              </Card>
              <Card className={glassStyles.card}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-slate-500">Order Value</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">₹{(orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0) / 100000).toFixed(1)}L</p>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Info */}
            <Card className={`${glassStyles.card} border-l-4 border-l-indigo-500`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium text-indigo-700">Order Flow:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-slate-100 text-slate-700">Quote Approved</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <Badge className="bg-blue-100 text-blue-700">Order Created</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <Badge className="bg-purple-100 text-purple-700">Challan Created</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <Badge className="bg-orange-100 text-orange-700">Dispatched</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <Badge className="bg-emerald-100 text-emerald-700">Delivered</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <Badge className="bg-green-100 text-green-700">Installation</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders List */}
            <Card className={glassStyles.card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-emerald-600" />
                      Orders & Delivery Challans
                    </CardTitle>
                    <CardDescription>Manage orders and create delivery challans for dispatch</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSecondaryData}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-indigo-600 to-purple-600"
                      onClick={() => {
                        toast.info('Orders are created from approved quotes. Go to Quotes tab.')
                        setActiveTab('quotes')
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> From Quote
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">No orders yet. Approve quotes to create orders.</p>
                    <Button variant="outline" onClick={() => setActiveTab('quotes')}>
                      Go to Quotes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => {
                      const orderChallan = challans.find(c => c.orderId === order.id)
                      return (
                        <Card key={order.id} className="hover:shadow-lg transition-all border-l-4" style={{
                          borderLeftColor: orderChallan?.status === 'delivered' ? '#10b981' : 
                                          orderChallan?.status === 'dispatched' ? '#f59e0b' : 
                                          orderChallan ? '#8b5cf6' : '#94a3b8'
                        }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-lg">{order.orderNumber}</h4>
                                  <Badge className={
                                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                    order.status === 'dispatched' ? 'bg-orange-100 text-orange-700' :
                                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-700'
                                  }>
                                    {order.status}
                                  </Badge>
                                  {orderChallan && (
                                    <Badge className="bg-purple-100 text-purple-700">
                                      <ScrollText className="h-3 w-3 mr-1" />
                                      {orderChallan.challanNumber}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-slate-600">{order.customerName}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Package className="h-4 w-4" /> {order.itemsCount || 0} items
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" /> {order.siteAddress?.slice(0, 30) || 'No address'}...
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" /> {new Date(order.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                {/* Challan Status */}
                                {orderChallan && (
                                  <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-purple-600" />
                                        <span className="text-sm font-medium">Challan: {orderChallan.challanNumber}</span>
                                        <Badge className={
                                          orderChallan.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                          orderChallan.status === 'dispatched' ? 'bg-orange-100 text-orange-700' :
                                          'bg-slate-100 text-slate-700'
                                        }>
                                          {orderChallan.status}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        {orderChallan.status === 'draft' && (
                                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => handleDispatchChallan(orderChallan)}>
                                            <Truck className="h-3 w-3 mr-1" /> Dispatch
                                          </Button>
                                        )}
                                        {orderChallan.status === 'dispatched' && (
                                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleDeliverChallan(orderChallan)}>
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Delivered
                                          </Button>
                                        )}
                                        <Button size="sm" variant="outline">
                                          <Download className="h-3 w-3 mr-1" /> Print
                                        </Button>
                                      </div>
                                    </div>
                                    {orderChallan.vehicleNumber && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        Vehicle: {orderChallan.vehicleNumber} | Driver: {orderChallan.driverName || 'N/A'}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="ml-4 text-right">
                                <p className="font-bold text-xl text-emerald-600">₹{(order.grandTotal || 0).toLocaleString()}</p>
                                <div className="flex flex-col gap-2 mt-3">
                                  {!orderChallan && order.status === 'confirmed' && (
                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleCreateChallan(order)}>
                                      <ScrollText className="h-4 w-4 mr-1" /> Create Challan
                                    </Button>
                                  )}
                                  {orderChallan?.status === 'delivered' && (
                                    <Button size="sm" variant="outline" onClick={() => {
                                      toast.info('Go to Installation tab to schedule')
                                      setActiveTab('installation')
                                    }}>
                                      <Wrench className="h-4 w-4 mr-1" /> Schedule Install
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-1" /> Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <Card className={glassStyles.card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-green-600" />
                      Invoices
                    </CardTitle>
                    <CardDescription>Manage invoices and payments</CardDescription>
                  </div>
                  <Button 
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => {
                      toast.info('Invoices are created when quotes are approved and converted to orders. Go to Quotes tab to manage quotes.')
                      setActiveTab('quotes')
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create Invoice
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No invoices yet. Invoices are created when quotes are approved.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map(invoice => (
                      <Card key={invoice.id} className="hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{invoice.invoiceNumber}</h4>
                                <Badge className={
                                  invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 
                                  invoice.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-slate-100 text-slate-700'
                                }>
                                  {invoice.paymentStatus || invoice.status}
                                </Badge>
                                {invoice.quoteNumber && (
                                  <span className="text-xs text-slate-400">From: {invoice.quoteNumber}</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{invoice.customerName}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Due: {new Date(invoice.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg text-green-600">₹{(invoice.grandTotal || 0).toLocaleString()}</p>
                              <div className="text-sm">
                                <span className="text-emerald-600">Paid: ₹{(invoice.paidAmount || 0).toLocaleString()}</span>
                                {invoice.balanceAmount > 0 && (
                                  <span className="text-red-600 ml-2">Due: ₹{(invoice.balanceAmount || 0).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="text-xs">
                                <Download className="h-3 w-3 mr-1" /> PDF
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => syncToFinance('invoice', invoice.id)}>
                                <RefreshCw className="h-3 w-3 mr-1" /> Sync
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => createChallan({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, customerName: invoice.customerName })}>
                                <Truck className="h-3 w-3 mr-1" /> Challan
                              </Button>
                              {invoice.paymentStatus !== 'paid' && (
                                <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => recordPayment({ invoiceId: invoice.id, customerName: invoice.customerName, amount: invoice.balanceAmount || invoice.grandTotal })}>
                                  <IndianRupee className="h-3 w-3 mr-1" /> Pay
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== FINANCE SYNC TAB ==================== */}
          <TabsContent value="finance-sync" className="space-y-6">
            <Card className={glassStyles.card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                      BuilD Finance Sync
                    </CardTitle>
                    <CardDescription>
                      Sync quotes, invoices, and payments to BuilD Finance for unified accounting
                    </CardDescription>
                  </div>
                  <Button onClick={syncAllToFinance} disabled={syncingToFinance}>
                    {syncingToFinance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Sync All Pending
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Quotes Sync */}
                  <Card className="p-6 bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-purple-100">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Quotes</h3>
                        <p className="text-sm text-muted-foreground">Sync approved quotes</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="font-medium">{financeSyncStatus?.quotes?.total || 0}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Synced</span>
                        <span className="font-medium">{financeSyncStatus?.quotes?.synced || 0}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Pending</span>
                        <span className="font-medium">{financeSyncStatus?.quotes?.pending || 0}</span>
                      </div>
                      <Progress value={financeSyncStatus?.quotes?.total ? (financeSyncStatus.quotes.synced / financeSyncStatus.quotes.total) * 100 : 0} className="h-2 mt-2" />
                    </div>
                  </Card>

                  {/* Invoices Sync */}
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-blue-100">
                        <Receipt className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Invoices</h3>
                        <p className="text-sm text-muted-foreground">Sync to finance</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="font-medium">{financeSyncStatus?.invoices?.total || 0}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Synced</span>
                        <span className="font-medium">{financeSyncStatus?.invoices?.synced || 0}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Pending</span>
                        <span className="font-medium">{financeSyncStatus?.invoices?.pending || 0}</span>
                      </div>
                      <Progress value={financeSyncStatus?.invoices?.total ? (financeSyncStatus.invoices.synced / financeSyncStatus.invoices.total) * 100 : 0} className="h-2 mt-2" />
                    </div>
                  </Card>

                  {/* Payments Sync */}
                  <Card className="p-6 bg-green-50 border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-green-100">
                        <IndianRupee className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Payments</h3>
                        <p className="text-sm text-muted-foreground">Sync collections</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="font-medium">{financeSyncStatus?.payments?.total || 0}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Synced</span>
                        <span className="font-medium">{financeSyncStatus?.payments?.synced || 0}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Pending</span>
                        <span className="font-medium">{financeSyncStatus?.payments?.pending || 0}</span>
                      </div>
                      <Progress value={financeSyncStatus?.payments?.total ? (financeSyncStatus.payments.synced / financeSyncStatus.payments.total) * 100 : 0} className="h-2 mt-2" />
                    </div>
                  </Card>
                </div>

                <Separator className="my-6" />

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Auto-Sync Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Auto-sync quotes when approved</p>
                        <p className="text-xs text-muted-foreground">Automatically sync quotes to Finance when status changes to approved</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Auto-sync invoices on creation</p>
                        <p className="text-xs text-muted-foreground">Automatically sync new invoices to BuilD Finance</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Auto-sync payments</p>
                        <p className="text-xs text-muted-foreground">Sync payment collections to Finance immediately</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-6">
            <ProductionTab
              orders={orders}
              settings={moduleSettings}
              headers={headers}
              glassStyles={glassStyles}
              onRefresh={fetchCriticalData}
            />
          </TabsContent>

          {/* Installation Tab */}
          <TabsContent value="installation" className="space-y-6">
            <InstallationTab
              orders={orders}
              headers={headers}
              glassStyles={glassStyles}
              onRefresh={fetchCriticalData}
              initialData={installationsData}
            />
          </TabsContent>

          {/* Warranty & Tickets Tab */}
          <TabsContent value="warranty" className="space-y-6">
            <WarrantyTicketsTab
              orders={orders}
              headers={headers}
              glassStyles={glassStyles}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <ReportsTab
              headers={headers}
              glassStyles={glassStyles}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <SettingsTab
              settings={moduleSettings}
              onSave={handleSaveSettings}
              headers={headers}
              glassStyles={glassStyles}
              businessMode={businessMode}
              onBusinessModeChange={(newMode) => {
                setBusinessMode(newMode)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('dw_business_mode', newMode)
                }
              }}
            />
          </TabsContent>

          {/* ========== MANUFACTURER-SPECIFIC TABS ========== */}
          
          {/* Dealer Network Tab (Manufacturer Only) */}
          <TabsContent value="dealers" className="space-y-6">
            <DealersTab headers={headers} glassStyles={glassStyles} />
          </TabsContent>

          {/* Price Lists Tab (Manufacturer Only) */}
          <TabsContent value="price-lists" className="space-y-6">
            <PriceListsTab headers={headers} glassStyles={glassStyles} />
          </TabsContent>

          {/* Quality Control Tab (Manufacturer Only) */}
          <TabsContent value="quality" className="space-y-6">
            <QualityControlTab headers={headers} glassStyles={glassStyles} />
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="space-y-6">
            <CollectionsTab headers={headers} glassStyles={glassStyles} />
          </TabsContent>

          {/* Dispatch Tab (Manufacturer Only) */}
          <TabsContent value="dispatch" className="space-y-6">
            <Card className={glassStyles.card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-blue-600" />
                      Dispatch & Logistics
                    </CardTitle>
                    <CardDescription>Manage shipments to dealers and track deliveries</CardDescription>
                  </div>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Plus className="h-4 w-4 mr-2" /> Create Dispatch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-700">12</p>
                      <p className="text-sm text-blue-600">In Transit</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-emerald-700">156</p>
                      <p className="text-sm text-emerald-600">Delivered (MTD)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-amber-700">8</p>
                      <p className="text-sm text-amber-600">Ready to Ship</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-700">24</p>
                      <p className="text-sm text-purple-600">Destinations</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">DSP-2024-0892</h4>
                        <p className="text-sm text-slate-500">To: Royal Windows, Mumbai • 25 units</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-700">In Transit</Badge>
                      <span className="text-sm text-slate-500">ETA: Tomorrow</span>
                      <Button variant="ghost" size="sm"><MapPin className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">DSP-2024-0893</h4>
                        <p className="text-sm text-slate-500">To: Delhi Glass House • 40 units</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-amber-100 text-amber-700">Ready</Badge>
                      <span className="text-sm text-slate-500">Pickup scheduled</span>
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products & Inventory Tab - Self-hosted D&W Inventory */}
          <TabsContent value="inventory" className="space-y-6">
            <EnterpriseInventoryDW client={client} user={user} />
          </TabsContent>

          {/* Finance Tab - Enterprise D&W Finance */}
          <TabsContent value="finance" className="space-y-6">
            <EnterpriseFinanceDW client={client} user={user} />
          </TabsContent>
        </Tabs>
      </div>

      {/* MEE AI Floater - Shows on every screen */}
      <MEEAIFloater context={{ activeTab, selectedProject }} />
    </div>
  )
}

export default DoorsWindowsModule
