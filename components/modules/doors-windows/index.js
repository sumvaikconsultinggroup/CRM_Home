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
  Cloud, Link2, Users, Home, Activity, Receipt, Ticket
} from 'lucide-react'
import { toast } from 'sonner'

// Import sub-components
import { DashboardTab } from './DashboardTab'
import { SiteSurvey } from './SiteSurvey'
import { QuoteBuilder } from './QuoteBuilder'
import { ProjectsTab } from './ProjectsTab'
import { CRMSync } from './CRMSync'
import { InventoryTab } from './InventoryTab'
import { ProductionTab } from './ProductionTab'
import { InstallationTab } from './InstallationTab'
import { WarrantyTicketsTab } from './WarrantyTicketsTab'
import { ReportsTab } from './ReportsTab'
import { SettingsTab } from './SettingsTab'
import { MEEAIFloater } from './MEEAIFloater'
import { DoorWindow3DPreview } from './DoorWindow3DPreview'
import { PRODUCT_FAMILIES, CATEGORIES, PRODUCT_TYPES, GLASS_TYPES, HARDWARE_TYPES, FINISHES, PRICING_RATES } from './constants'

const API_BASE = '/api/modules/doors-windows'

// Glassmorphism styles
const glassStyles = {
  card: 'backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl',
  header: 'backdrop-blur-md bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-blue-600/90',
  button: 'backdrop-blur-sm bg-white/80 hover:bg-white/90 border border-white/30',
  tab: 'backdrop-blur-sm data-[state=active]:bg-white/90 data-[state=active]:shadow-lg',
}

// Tab groups for better organization
const TAB_GROUPS = {
  main: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'surveys', label: 'Site Survey', icon: ClipboardList },
    { id: 'quotes', label: 'Quotes', icon: FileText },
  ],
  operations: [
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'installation', label: 'Installation', icon: Wrench },
  ],
  support: [
    { id: 'warranty', label: 'Warranty', icon: Shield },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]
}

export function DoorsWindowsModule({ client, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
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
  
  // New: Notification bar states
  const [pendingSyncNotification, setPendingSyncNotification] = useState(null)
  const [showSyncNotification, setShowSyncNotification] = useState(true)

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
      const [surveysRes, quotesRes, ordersRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/surveys`, { headers }),
        fetch(`${API_BASE}/quotations`, { headers }),
        fetch(`${API_BASE}/orders`, { headers }),
        fetch(`${API_BASE}/invoices`, { headers })
      ])

      const [surveysData, quotesData, ordersData, invoicesData] = await Promise.all([
        surveysRes.json(),
        quotesRes.json(),
        ordersRes.json(),
        invoicesRes.json()
      ])

      if (surveysData.surveys) setSurveys(surveysData.surveys)
      if (quotesData.quotations) setQuotations(quotesData.quotations)
      if (ordersData.orders) setOrders(ordersData.orders)
      if (invoicesData.invoices) setInvoices(invoicesData.invoices)
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
        
        // NEW: Check for pending syncs and show notification
        const availableProjects = data.availableToSync?.projects || 0
        const availableLeads = data.availableToSync?.leads || 0
        const availableContacts = data.availableToSync?.contacts || 0
        const totalAvailable = availableProjects + availableLeads + availableContacts
        
        if (totalAvailable > 0) {
          setPendingSyncNotification({
            projects: availableProjects,
            leads: availableLeads,
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

  const handleCrmSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'sync-all' })
      })
      const data = await res.json()
      if (data.success) {
        const { results } = data
        const summary = []
        if (results?.projects?.created > 0) summary.push(`${results.projects.created} projects`)
        if (results?.leads?.created > 0) summary.push(`${results.leads.created} leads`)
        if (results?.contacts?.created > 0) summary.push(`${results.contacts.created} contacts`)
        if (results?.contacts?.updated > 0) summary.push(`${results.contacts.updated} updated`)
        
        toast.success(summary.length > 0 
          ? `Synced: ${summary.join(', ')}` 
          : 'Sync complete - everything up to date!')
        fetchCrmSyncStatus()
        fetchProjects()
      } else {
        toast.error(data.error || data.details || 'Sync failed')
      }
    } catch (error) {
      console.error('CRM Sync Error:', error)
      toast.error('Failed to sync with CRM - check connection')
    } finally {
      setSyncing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleSaveSettings = (newSettings) => {
    setModuleSettings(newSettings)
  }

  const handleBackToCRM = () => {
    window.location.href = '/'
  }

  // Get all tabs flat list
  const allTabs = [...TAB_GROUPS.main, ...TAB_GROUPS.operations, ...TAB_GROUPS.support]

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
                  {pendingSyncNotification.projects > 0 && pendingSyncNotification.leads > 0 && ', '}
                  {pendingSyncNotification.leads > 0 && `${pendingSyncNotification.leads} lead${pendingSyncNotification.leads > 1 ? 's' : ''}`}
                  {(pendingSyncNotification.projects > 0 || pendingSyncNotification.leads > 0) && pendingSyncNotification.contacts > 0 && ', '}
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
        {/* Tabs Navigation - Multi-row for all tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className={`${glassStyles.card} p-3 rounded-2xl`}>
            {/* Main Tabs */}
            <div className="flex flex-wrap gap-2 mb-2">
              {TAB_GROUPS.main.map(tab => (
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
              <Separator orientation="vertical" className="h-8 mx-2" />
              {TAB_GROUPS.operations.map(tab => (
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
              <Separator orientation="vertical" className="h-8 mx-2" />
              {TAB_GROUPS.support.map(tab => (
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
            />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className={glassStyles.card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-emerald-600" />
                      Orders & Invoices
                    </CardTitle>
                    <CardDescription>Manage orders, invoices and payments</CardDescription>
                  </div>
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" /> Create Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No orders yet. Approve quotes to create orders.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <Card key={order.id} className="hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{order.orderNumber}</h4>
                                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500">{order.customerName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-emerald-600">₹{order.grandTotal?.toLocaleString()}</p>
                              <p className="text-sm text-slate-500">{order.itemsCount || 0} items</p>
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
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
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
                            <div className="ml-4 flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs">
                                <Download className="h-3 w-3 mr-1" /> PDF
                              </Button>
                              {invoice.paymentStatus !== 'paid' && (
                                <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">
                                  <Plus className="h-3 w-3 mr-1" /> Add Payment
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

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <InventoryTab
              headers={headers}
              glassStyles={glassStyles}
            />
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
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* MEE AI Floater - Shows on every screen */}
      <MEEAIFloater context={{ activeTab, selectedProject }} />
    </div>
  )
}

export default DoorsWindowsModule
