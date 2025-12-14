'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Cloud, Link2, Users, Home, Activity
} from 'lucide-react'
import { toast } from 'sonner'

// Import sub-components
import { DashboardTab } from './DashboardTab'
import { SiteSurvey } from './SiteSurvey'
import { QuoteBuilder } from './QuoteBuilder'
import { ProjectsTab } from './ProjectsTab'
import { CRMSync } from './CRMSync'
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
  
  // Projects & CRM states
  const [projects, setProjects] = useState([])
  const [crmSyncStatus, setCrmSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)

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
      const [dashboardRes, surveysRes, quotesRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers }),
        fetch(`${API_BASE}/surveys`, { headers }),
        fetch(`${API_BASE}/quotations`, { headers }),
        fetch(`${API_BASE}/orders`, { headers })
      ])

      const [dashboardData, surveysData, quotesData, ordersData] = await Promise.all([
        dashboardRes.json(),
        surveysRes.json(),
        quotesRes.json(),
        ordersRes.json()
      ])

      if (!dashboardData.error) setDashboard(dashboardData)
      if (surveysData.surveys) setSurveys(surveysData.surveys)
      if (quotesData.quotations) setQuotations(quotesData.quotations)
      if (ordersData.orders) setOrders(ordersData.orders)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load module data')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers })
      const data = await res.json()
      if (data.projects) setProjects(data.projects)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchCrmSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync?action=status`, { headers })
      const data = await res.json()
      if (!data.error) setCrmSyncStatus(data)
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
        toast.success('CRM sync completed successfully')
        fetchCrmSyncStatus()
        fetchProjects()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync with CRM')
    } finally {
      setSyncing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Glassmorphism Header */}
      <div className={`${glassStyles.header} text-white p-6 rounded-b-3xl mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              value={selectedProject?.id || ''} 
              onValueChange={(id) => setSelectedProject(projects.find(p => p.id === id))}
            >
              <SelectTrigger className="w-[220px] bg-white/20 border-white/30 text-white">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
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

      <div className="px-6 pb-6">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className={`${glassStyles.card} p-2 rounded-2xl`}>
            <TabsList className="grid grid-cols-7 gap-2 bg-transparent p-1">
              <TabsTrigger value="dashboard" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="projects" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <FolderKanban className="h-4 w-4" /> Projects
              </TabsTrigger>
              <TabsTrigger value="surveys" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <ClipboardList className="h-4 w-4" /> Site Survey
              </TabsTrigger>
              <TabsTrigger value="quotes" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <FileText className="h-4 w-4" /> Quote Builder
              </TabsTrigger>
              <TabsTrigger value="orders" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <ShoppingCart className="h-4 w-4" /> Orders
              </TabsTrigger>
              <TabsTrigger value="crm" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <Link2 className="h-4 w-4" /> CRM Sync
              </TabsTrigger>
              <TabsTrigger value="ai" className={`${glassStyles.tab} rounded-xl flex items-center gap-2`}>
                <Brain className="h-4 w-4" /> MEE AI
              </TabsTrigger>
            </TabsList>
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
              onRefresh={() => { fetchAllData(); fetchProjects(); }}
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
              onRefresh={fetchAllData}
              headers={headers}
              user={user}
              glassStyles={glassStyles}
            />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className={glassStyles.card}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  Orders & Production
                </CardTitle>
                <CardDescription>Manage orders, production schedules, and deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No orders yet. Create quotes and convert them to orders.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.map(order => (
                      <Card key={order.id} className="hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{order.orderNumber}</h4>
                              <p className="text-sm text-slate-500">{order.customerName}</p>
                            </div>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600">
                            <p>Items: {order.itemsCount || 0}</p>
                            <p className="font-semibold text-emerald-600">₹{order.grandTotal?.toLocaleString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CRM Sync Tab */}
          <TabsContent value="crm" className="space-y-6">
            <CRMSync
              crmSyncStatus={crmSyncStatus}
              syncing={syncing}
              onSync={handleCrmSync}
              projects={projects}
              headers={headers}
              glassStyles={glassStyles}
            />
          </TabsContent>

          {/* MEE AI Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card className={glassStyles.card}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  MEE AI Assistant
                </CardTitle>
                <CardDescription>AI-powered assistance for quotes, measurements, and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 w-fit mx-auto mb-4">
                    <Sparkles className="h-12 w-12 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Coming Soon</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    AI-powered assistant for intelligent quoting, measurement suggestions, and product recommendations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default DoorsWindowsModule
