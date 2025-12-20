'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LayoutDashboard, Package, Users, FolderKanban, FileText, ShoppingCart,
  Receipt, Truck, BarChart3, Calendar, MessageSquare, Plus, Search,
  Filter, Download, Upload, RefreshCw, Eye, Edit, Trash2, Send,
  CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, IndianRupee,
  Phone, Mail, MapPin, Building, Box, Layers, ArrowRight, ChevronRight,
  FileSpreadsheet, Printer, Share2, MoreVertical, Star, AlertCircle,
  ClipboardList, Calculator, Ruler, Camera, Bell, Settings, X
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const API_BASE = '/api/modules/wooden-flooring'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4']

const STATUS_COLORS = {
  inquiry: 'bg-blue-100 text-blue-700',
  site_visit: 'bg-purple-100 text-purple-700',
  quotation_sent: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-emerald-100 text-emerald-700',
  partially_paid: 'bg-orange-100 text-orange-700',
  overdue: 'bg-red-100 text-red-700'
}

const WOOD_CATEGORIES = [
  'Engineered Wood',
  'Laminate Flooring',
  'Solid Hardwood',
  'Vinyl Plank',
  'Bamboo',
  'Accessories'
]

const WOOD_TYPES = [
  'Oak', 'Walnut', 'Maple', 'Teak', 'Rosewood', 'Cherry', 'Ash', 'Hickory', 'Pine', 'Bamboo'
]

const FINISHES = [
  'Matte', 'Semi-Gloss', 'High Gloss', 'Hand-Scraped', 'Wire-Brushed', 'Distressed', 'Smooth'
]

export function WoodenFlooringModule({ client, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null)
  const [inventory, setInventory] = useState({ items: [], stats: {} })
  const [customers, setCustomers] = useState({ customers: [], stats: {} })
  const [projects, setProjects] = useState({ projects: [], stats: {} })
  const [quotations, setQuotations] = useState({ quotations: [], stats: {} })
  const [orders, setOrders] = useState({ orders: [], stats: {} })
  const [invoices, setInvoices] = useState({ invoices: [], stats: {} })
  const [vendors, setVendors] = useState({ vendors: [], stats: {} })
  const [schedule, setSchedule] = useState({ schedules: [], teamMembers: [] })
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState({})

  // Fetch functions
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token')
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })
    if (!res.ok) throw new Error('API Error')
    return res.json()
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/reports?type=overview`)
      setDashboardData(data)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchInventory = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/inventory`)
      setInventory(data)
    } catch (error) {
      console.error('Inventory fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/customers`)
      setCustomers(data)
    } catch (error) {
      console.error('Customers fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchProjects = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/projects`)
      setProjects(data)
    } catch (error) {
      console.error('Projects fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchQuotations = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/quotations`)
      setQuotations(data)
    } catch (error) {
      console.error('Quotations fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchOrders = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/orders`)
      setOrders(data)
    } catch (error) {
      console.error('Orders fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/invoices`)
      setInvoices(data)
    } catch (error) {
      console.error('Invoices fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchVendors = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/vendors`)
      setVendors(data)
    } catch (error) {
      console.error('Vendors fetch error:', error)
    }
  }, [fetchWithAuth])

  const fetchSchedule = useCallback(async () => {
    try {
      const month = new Date().toISOString().slice(0, 7)
      const data = await fetchWithAuth(`${API_BASE}/schedule?month=${month}`)
      setSchedule(data)
    } catch (error) {
      console.error('Schedule fetch error:', error)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    fetchDashboard()
    fetchInventory()
    fetchCustomers()
    fetchProjects()
    fetchQuotations()
    fetchOrders()
    fetchInvoices()
    fetchVendors()
    fetchSchedule()
  }, [fetchDashboard, fetchInventory, fetchCustomers, fetchProjects, fetchQuotations, fetchOrders, fetchInvoices, fetchVendors, fetchSchedule])

  // Dialog handlers
  const openDialog = (type, item = null) => {
    setDialogType(type)
    setSelectedItem(item)
    setFormData(item || {})
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setDialogType('')
    setSelectedItem(null)
    setFormData({})
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const endpoint = dialogType.replace('add_', '').replace('edit_', '')
      const method = selectedItem ? 'PUT' : 'POST'
      const url = `${API_BASE}/${endpoint}`
      
      await fetchWithAuth(url, {
        method,
        body: JSON.stringify(selectedItem ? { id: selectedItem.id, ...formData } : formData)
      })
      
      toast.success(`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} saved successfully`)
      closeDialog()
      
      // Refresh data
      if (endpoint === 'inventory') fetchInventory()
      if (endpoint === 'customers') fetchCustomers()
      if (endpoint === 'projects') fetchProjects()
      if (endpoint === 'quotations') fetchQuotations()
      if (endpoint === 'orders') fetchOrders()
      if (endpoint === 'invoices') fetchInvoices()
      if (endpoint === 'vendors') fetchVendors()
      if (endpoint === 'schedule') fetchSchedule()
      fetchDashboard()
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      await fetchWithAuth(`${API_BASE}/${type}?id=${id}`, { method: 'DELETE' })
      toast.success('Deleted successfully')
      
      if (type === 'inventory') fetchInventory()
      if (type === 'customers') fetchCustomers()
      if (type === 'projects') fetchProjects()
      if (type === 'quotations') fetchQuotations()
      if (type === 'orders') fetchOrders()
      if (type === 'invoices') fetchInvoices()
      if (type === 'vendors') fetchVendors()
      if (type === 'schedule') fetchSchedule()
      fetchDashboard()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const sendWhatsAppNotification = async (templateType, customer, data) => {
    try {
      await fetchWithAuth(`${API_BASE}/whatsapp`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer.id,
          customerPhone: customer.phone,
          templateType,
          data: {
            customerName: customer.name,
            businessName: client?.businessName,
            ...data
          }
        })
      })
      toast.success('WhatsApp notification sent!')
    } catch (error) {
      toast.error('Failed to send notification')
    }
  }

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'vendors', label: 'Vendors', icon: Truck },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'schedule', label: 'Schedule', icon: Calendar }
  ]

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Wooden Flooring</h2>
              <p className="text-xs text-muted-foreground">ERP Module</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Quick Stats in Sidebar */}
        <div className="p-4 border-t bg-slate-50">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Low Stock Items</span>
              <Badge variant="destructive" className="text-xs">{inventory.stats?.lowStockItems || 0}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active Projects</span>
              <Badge className="bg-indigo-500 text-xs">{projects.stats?.inProgress || 0}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending Payments</span>
              <Badge variant="outline" className="text-xs">₹{((invoices.stats?.pendingValue || 0) / 1000).toFixed(0)}K</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6"
          >
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <DashboardView 
                data={dashboardData} 
                projects={projects}
                quotations={quotations}
                onNavigate={setActiveTab}
              />
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <InventoryView 
                data={inventory}
                onAdd={() => openDialog('add_inventory')}
                onEdit={(item) => openDialog('edit_inventory', item)}
                onDelete={(id) => handleDelete('inventory', id)}
                onRefresh={fetchInventory}
              />
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <CustomersView 
                data={customers}
                onAdd={() => openDialog('add_customers')}
                onEdit={(item) => openDialog('edit_customers', item)}
                onDelete={(id) => handleDelete('customers', id)}
                onWhatsApp={sendWhatsAppNotification}
                onRefresh={fetchCustomers}
              />
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <ProjectsView 
                data={projects}
                customers={customers.customers}
                onAdd={() => openDialog('add_projects')}
                onEdit={(item) => openDialog('edit_projects', item)}
                onDelete={(id) => handleDelete('projects', id)}
                onRefresh={fetchProjects}
                onCreateQuotation={(project) => {
                  setFormData({
                    projectId: project.id,
                    customerId: project.customerId,
                    customerName: project.customerName,
                    customerPhone: project.customerPhone,
                    siteAddress: project.siteAddress,
                    totalArea: project.totalArea
                  })
                  openDialog('add_quotations')
                }}
              />
            )}

            {/* Quotations Tab */}
            {activeTab === 'quotations' && (
              <QuotationsView 
                data={quotations}
                customers={customers.customers}
                inventory={inventory.items}
                onAdd={() => openDialog('add_quotations')}
                onEdit={(item) => openDialog('edit_quotations', item)}
                onDelete={(id) => handleDelete('quotations', id)}
                onRefresh={fetchQuotations}
                onWhatsApp={sendWhatsAppNotification}
                onConvertToOrder={(quotation) => {
                  setFormData({
                    quotationId: quotation.id,
                    customerId: quotation.customerId,
                    customerName: quotation.customerName,
                    customerEmail: quotation.customerEmail,
                    customerPhone: quotation.customerPhone,
                    grandTotal: quotation.grandTotal
                  })
                  openDialog('add_orders')
                }}
              />
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <OrdersView 
                data={orders}
                onAdd={() => openDialog('add_orders')}
                onEdit={(item) => openDialog('edit_orders', item)}
                onDelete={(id) => handleDelete('orders', id)}
                onRefresh={fetchOrders}
                onWhatsApp={sendWhatsAppNotification}
                onCreateInvoice={(order) => {
                  setFormData({
                    orderId: order.id,
                    customerId: order.customerId,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    customerPhone: order.customerPhone,
                    items: order.items,
                    grandTotal: order.grandTotal
                  })
                  openDialog('add_invoices')
                }}
              />
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <InvoicesView 
                data={invoices}
                onAdd={() => openDialog('add_invoices')}
                onEdit={(item) => openDialog('edit_invoices', item)}
                onDelete={(id) => handleDelete('invoices', id)}
                onRefresh={fetchInvoices}
                onWhatsApp={sendWhatsAppNotification}
              />
            )}

            {/* Vendors Tab */}
            {activeTab === 'vendors' && (
              <VendorsView 
                data={vendors}
                onAdd={() => openDialog('add_vendors')}
                onEdit={(item) => openDialog('edit_vendors', item)}
                onDelete={(id) => handleDelete('vendors', id)}
                onRefresh={fetchVendors}
              />
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <ReportsView 
                fetchWithAuth={fetchWithAuth}
                apiBase={API_BASE}
              />
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <ScheduleView 
                data={schedule}
                projects={projects.projects}
                customers={customers.customers}
                onAdd={() => openDialog('add_schedule')}
                onEdit={(item) => openDialog('edit_schedule', item)}
                onDelete={(id) => handleDelete('schedule', id)}
                onRefresh={fetchSchedule}
                onWhatsApp={sendWhatsAppNotification}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType.includes('add') ? 'Add New' : 'Edit'} {dialogType.replace('add_', '').replace('edit_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </DialogTitle>
          </DialogHeader>
          
          {/* Inventory Form */}
          {dialogType.includes('inventory') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={formData.sku || ''} onChange={(e) => setFormData({...formData, sku: e.target.value})} placeholder="WF-001" />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Oak Engineered Wood" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || ''} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {WOOD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Wood Type</Label>
                <Select value={formData.woodType || ''} onValueChange={(v) => setFormData({...formData, woodType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select wood type" /></SelectTrigger>
                  <SelectContent>
                    {WOOD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Finish</Label>
                <Select value={formData.finish || ''} onValueChange={(v) => setFormData({...formData, finish: v})}>
                  <SelectTrigger><SelectValue placeholder="Select finish" /></SelectTrigger>
                  <SelectContent>
                    {FINISHES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Thickness</Label>
                <Input value={formData.thickness || ''} onChange={(e) => setFormData({...formData, thickness: e.target.value})} placeholder="12mm" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={formData.quantity || ''} onChange={(e) => setFormData({...formData, quantity: e.target.value})} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit || 'sq.ft'} onValueChange={(v) => setFormData({...formData, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq.ft">sq.ft</SelectItem>
                    <SelectItem value="sq.m">sq.m</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="piece">Piece</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cost Price (₹)</Label>
                <Input type="number" value={formData.costPrice || ''} onChange={(e) => setFormData({...formData, costPrice: e.target.value})} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Selling Price (₹)</Label>
                <Input type="number" value={formData.sellingPrice || ''} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input type="number" value={formData.reorderLevel || ''} onChange={(e) => setFormData({...formData, reorderLevel: e.target.value})} placeholder="10" />
              </div>
              <div className="space-y-2">
                <Label>GST Rate (%)</Label>
                <Input type="number" value={formData.gstRate || '18'} onChange={(e) => setFormData({...formData, gstRate: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Product description..." />
              </div>
            </div>
          )}

          {/* Customer Form */}
          {dialogType.includes('customers') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Customer name" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={formData.company || ''} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company name" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Textarea value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input value={formData.pincode || ''} onChange={(e) => setFormData({...formData, pincode: e.target.value})} placeholder="560001" />
              </div>
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={formData.propertyType || 'Residential'} onValueChange={(v) => setFormData({...formData, propertyType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Showroom">Showroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source || 'Direct'} onValueChange={(v) => setFormData({...formData, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." />
              </div>
            </div>
          )}

          {/* Project Form */}
          {dialogType.includes('projects') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Project title" />
              </div>
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={formData.customerName || ''} onChange={(e) => setFormData({...formData, customerName: e.target.value})} placeholder="Customer name" />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={formData.customerPhone || ''} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Total Area (sq.ft)</Label>
                <Input type="number" value={formData.totalArea || ''} onChange={(e) => setFormData({...formData, totalArea: e.target.value})} placeholder="0" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Site Address</Label>
                <Textarea value={formData.siteAddress || ''} onChange={(e) => setFormData({...formData, siteAddress: e.target.value})} placeholder="Installation site address" />
              </div>
              <div className="space-y-2">
                <Label>Flooring Type</Label>
                <Select value={formData.flooringType || ''} onValueChange={(v) => setFormData({...formData, flooringType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {WOOD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Wood Type</Label>
                <Select value={formData.woodType || ''} onValueChange={(v) => setFormData({...formData, woodType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select wood" /></SelectTrigger>
                  <SelectContent>
                    {WOOD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Status field - only show when EDITING, auto-managed otherwise */}
              {selectedItem ? (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status || 'inquiry'} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="site_visit">Site Visit</SelectItem>
                      <SelectItem value="quotation_sent">Quotation Sent</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="h-10 px-3 py-2 bg-slate-100 border rounded-md text-sm text-slate-600 flex items-center">
                    <span className="text-green-600 font-medium">Inquiry</span>
                    <span className="text-xs text-slate-400 ml-2">(auto-managed)</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority || 'medium'} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Start Date</Label>
                <Input type="date" value={formData.expectedStartDate?.slice(0, 10) || ''} onChange={(e) => setFormData({...formData, expectedStartDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Expected End Date</Label>
                <Input type="date" value={formData.expectedEndDate?.slice(0, 10) || ''} onChange={(e) => setFormData({...formData, expectedEndDate: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Project notes..." />
              </div>
            </div>
          )}

          {/* Vendor Form */}
          {dialogType.includes('vendors') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor/Company Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Vendor name" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="vendor@example.com" />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input value={formData.gstNumber || ''} onChange={(e) => setFormData({...formData, gstNumber: e.target.value})} placeholder="GST Number" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Textarea value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || 'Flooring Materials'} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flooring Materials">Flooring Materials</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Tools">Tools</SelectItem>
                    <SelectItem value="Adhesives">Adhesives</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select value={formData.paymentTerms || 'Net 30'} onValueChange={(v) => setFormData({...formData, paymentTerms: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Advance">100% Advance</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="COD">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Products Supplied</Label>
                <Input value={formData.productsSupplied?.join(', ') || ''} onChange={(e) => setFormData({...formData, productsSupplied: e.target.value.split(', ')})} placeholder="Oak Wood, Maple, Adhesives..." />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Vendor notes..." />
              </div>
            </div>
          )}

          {/* Schedule Form */}
          {dialogType.includes('schedule') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type || 'installation'} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="site_visit">Site Visit</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="measurement">Measurement</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Schedule title" />
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={formData.customerName || ''} onChange={(e) => setFormData({...formData, customerName: e.target.value})} placeholder="Customer name" />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={formData.customerPhone || ''} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={formData.scheduledDate?.slice(0, 10) || ''} onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={formData.startTime || '09:00'} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Textarea value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Site address" />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority || 'normal'} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Dashboard View Component
function DashboardView({ data, projects, quotations, onNavigate }) {
  if (!data) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const summary = data.summary || {}
  const revenueTrends = data.revenueTrends || []
  const projectPipeline = data.projectPipeline || {}

  const pipelineData = [
    { name: 'Inquiry', value: projectPipeline.inquiry || 0, color: '#6366f1' },
    { name: 'Site Visit', value: projectPipeline.siteVisit || 0, color: '#8b5cf6' },
    { name: 'Quote Sent', value: projectPipeline.quotationSent || 0, color: '#f59e0b' },
    { name: 'Confirmed', value: projectPipeline.confirmed || 0, color: '#10b981' },
    { name: 'In Progress', value: projectPipeline.inProgress || 0, color: '#3b82f6' },
    { name: 'Completed', value: projectPipeline.completed || 0, color: '#22c55e' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Wooden Flooring Dashboard</h1>
          <p className="text-muted-foreground">Overview of your flooring business</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">₹{(summary.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 bg-white/20 rounded-lg">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-emerald-100 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Paid invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold mt-1">₹{(summary.pendingPayments || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-amber-100 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>To be collected</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm">Active Projects</p>
                <p className="text-2xl font-bold mt-1">{summary.activeProjects || 0}</p>
              </div>
              <div className="p-2 bg-white/20 rounded-lg">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-indigo-100 text-sm cursor-pointer" onClick={() => onNavigate('projects')}>
              <ArrowRight className="h-4 w-4" />
              <span>View projects</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-red-600 text-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-rose-100 text-sm">Low Stock Items</p>
                <p className="text-2xl font-bold mt-1">{summary.lowStockItems || 0}</p>
              </div>
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-rose-100 text-sm cursor-pointer" onClick={() => onNavigate('inventory')}>
              <ArrowRight className="h-4 w-4" />
              <span>View inventory</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueTrends}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Pipeline</CardTitle>
            <CardDescription>Projects by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Quotation Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sent</span>
                <span className="font-semibold">{data.quotationStats?.sent || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accepted</span>
                <span className="font-semibold text-green-600">{data.quotationStats?.accepted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-semibold">{data.quotationStats?.conversionRate || 0}%</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-bold text-lg">₹{((data.quotationStats?.totalValue || 0) / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-500" />
              Order Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-semibold">{data.orderStats?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing</span>
                <span className="font-semibold text-blue-600">{data.orderStats?.processing || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Installed</span>
                <span className="font-semibold text-green-600">{data.orderStats?.installed || 0}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-bold text-lg">₹{((data.orderStats?.totalValue || 0) / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Customers</span>
                <span className="font-semibold">{summary.totalCustomers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock Value</span>
                <span className="font-semibold">₹{((summary.inventoryValue || 0) / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Low Stock Alert</span>
                <Badge variant="destructive" className="text-xs">{summary.lowStockItems || 0} items</Badge>
              </div>
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('inventory')}>
                  Manage Inventory
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Projects</CardTitle>
            <CardDescription>Latest project updates</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('projects')}>
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data.recentProjects || []).slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                    {project.customerName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-medium">{project.customerName}</p>
                    <p className="text-sm text-muted-foreground">{project.projectNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={STATUS_COLORS[project.status] || 'bg-slate-100'}>
                    {project.status?.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">₹{(project.totalValue || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Inventory View Component
function InventoryView({ data, onAdd, onEdit, onDelete, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredItems = (data.items || []).filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your wooden flooring stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{data.stats?.totalItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">₹{((data.stats?.totalValue || 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-red-600">{data.stats?.lowStockItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold">{data.stats?.categories?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {WOOD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Product</th>
                <th className="text-left p-4 font-medium text-sm">SKU</th>
                <th className="text-left p-4 font-medium text-sm">Category</th>
                <th className="text-right p-4 font-medium text-sm">Quantity</th>
                <th className="text-right p-4 font-medium text-sm">Cost Price</th>
                <th className="text-right p-4 font-medium text-sm">Selling Price</th>
                <th className="text-center p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.woodType} - {item.finish}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono">{item.sku}</td>
                  <td className="p-4 text-sm">{item.category}</td>
                  <td className="p-4 text-right">
                    <span className={item.quantity <= item.reorderLevel ? 'text-red-600 font-semibold' : ''}>
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="p-4 text-right">₹{item.costPrice?.toLocaleString()}</td>
                  <td className="p-4 text-right font-medium">₹{item.sellingPrice?.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    {item.quantity <= item.reorderLevel ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">In Stock</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No inventory items found. Add your first product to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// Customers View Component
function CustomersView({ data, onAdd, onEdit, onDelete, onWhatsApp, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = (data.customers || []).filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your flooring customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-xl font-bold">{data.stats?.totalCustomers || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FolderKanban className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Projects</p>
              <p className="text-xl font-bold">{data.stats?.activeProjects || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">₹{((data.stats?.totalRevenue || 0) / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-2 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {customer.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.customerId}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onWhatsApp('custom', customer, { customMessage: `Hello ${customer.name}!` })}>
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(customer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(customer.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {customer.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {customer.email || 'No email'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {customer.city || 'No location'}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Total Spent</span>
                <span className="font-semibold">₹{(customer.totalSpent || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No customers found. Add your first customer to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// Projects View Component (Simplified)
function ProjectsView({ data, customers, onAdd, onEdit, onDelete, onRefresh, onCreateQuotation }) {
  const [viewMode, setViewMode] = useState('kanban')
  
  const statusColumns = [
    { id: 'inquiry', label: 'Inquiry', color: 'bg-blue-500' },
    { id: 'site_visit', label: 'Site Visit', color: 'bg-purple-500' },
    { id: 'quotation_sent', label: 'Quote Sent', color: 'bg-amber-500' },
    { id: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-indigo-500' },
    { id: 'completed', label: 'Completed', color: 'bg-emerald-500' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Track your flooring projects</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')}>
              Kanban
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
              List
            </Button>
          </div>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusColumns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-72">
              <div className={`${column.color} text-white px-3 py-2 rounded-t-lg flex items-center justify-between`}>
                <span className="font-medium">{column.label}</span>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {(data.projects || []).filter(p => p.status === column.id).length}
                </Badge>
              </div>
              <div className="bg-slate-100 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {(data.projects || []).filter(p => p.status === column.id).map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{project.customerName}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(project)}>
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{project.projectNumber}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Ruler className="h-3 w-3" />
                        {project.totalArea} sq.ft
                      </div>
                      {project.flooringType && (
                        <Badge variant="outline" className="mt-2 text-xs">{project.flooringType}</Badge>
                      )}
                      {column.id === 'inquiry' && (
                        <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => onCreateQuotation(project)}>
                          Create Quotation
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Project</th>
                  <th className="text-left p-4 font-medium text-sm">Customer</th>
                  <th className="text-left p-4 font-medium text-sm">Area</th>
                  <th className="text-left p-4 font-medium text-sm">Type</th>
                  <th className="text-center p-4 font-medium text-sm">Status</th>
                  <th className="text-right p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.projects || []).map((project) => (
                  <tr key={project.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-medium">{project.title || project.projectNumber}</p>
                      <p className="text-sm text-muted-foreground">{project.projectNumber}</p>
                    </td>
                    <td className="p-4">{project.customerName}</td>
                    <td className="p-4">{project.totalArea} sq.ft</td>
                    <td className="p-4">{project.flooringType || '-'}</td>
                    <td className="p-4 text-center">
                      <Badge className={STATUS_COLORS[project.status]}>{project.status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(project)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(project.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Quotations View (Simplified)
function QuotationsView({ data, customers, inventory, onAdd, onEdit, onDelete, onRefresh, onWhatsApp, onConvertToOrder }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-muted-foreground">Create and manage quotations</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {['draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{data.stats?.[status] || 0}</p>
              <p className="text-sm text-muted-foreground capitalize">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quotations List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Quotation</th>
                <th className="text-left p-4 font-medium text-sm">Customer</th>
                <th className="text-right p-4 font-medium text-sm">Amount</th>
                <th className="text-left p-4 font-medium text-sm">Valid Until</th>
                <th className="text-center p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.quotations || []).map((quotation) => (
                <tr key={quotation.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium">{quotation.quotationNumber}</p>
                    <p className="text-sm text-muted-foreground">{quotation.totalArea} sq.ft</p>
                  </td>
                  <td className="p-4">{quotation.customerName}</td>
                  <td className="p-4 text-right font-semibold">₹{(quotation.grandTotal || 0).toLocaleString()}</td>
                  <td className="p-4 text-sm">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-'}</td>
                  <td className="p-4 text-center">
                    <Badge className={STATUS_COLORS[quotation.status]}>{quotation.status}</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      {quotation.status === 'sent' && (
                        <Button variant="ghost" size="sm" onClick={() => onConvertToOrder(quotation)}>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onWhatsApp('quotation_sent', { name: quotation.customerName, phone: quotation.customerPhone }, { quotationNumber: quotation.quotationNumber, totalArea: quotation.totalArea, amount: quotation.grandTotal, validUntil: new Date(quotation.validUntil).toLocaleDateString() })}>
                        <Send className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(quotation)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(quotation.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data.quotations || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No quotations yet. Create your first quotation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// Orders View (Simplified)
function OrdersView({ data, onAdd, onEdit, onDelete, onRefresh, onWhatsApp, onCreateInvoice }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Track and manage orders</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-5">
            <p className="text-indigo-100">Total Orders</p>
            <p className="text-3xl font-bold">{data.stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <CardContent className="p-5">
            <p className="text-emerald-100">Total Value</p>
            <p className="text-3xl font-bold">₹{((data.stats?.totalValue || 0) / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-5">
            <p className="text-amber-100">Paid Amount</p>
            <p className="text-3xl font-bold">₹{((data.stats?.paidAmount || 0) / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Order</th>
                <th className="text-left p-4 font-medium text-sm">Customer</th>
                <th className="text-right p-4 font-medium text-sm">Amount</th>
                <th className="text-right p-4 font-medium text-sm">Paid</th>
                <th className="text-center p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.orders || []).map((order) => (
                <tr key={order.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4">{order.customerName}</td>
                  <td className="p-4 text-right font-semibold">₹{(order.grandTotal || 0).toLocaleString()}</td>
                  <td className="p-4 text-right text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      {order.status === 'delivered' && (
                        <Button variant="ghost" size="sm" onClick={() => onCreateInvoice(order)}>
                          <Receipt className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onEdit(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(order.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data.orders || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No orders yet. Create your first order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// Invoices View (Simplified)
function InvoicesView({ data, onAdd, onEdit, onDelete, onRefresh, onWhatsApp }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold">₹{((data.stats?.totalValue || 0) / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600">₹{((data.stats?.paidValue || 0) / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600">₹{((data.stats?.pendingValue || 0) / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{data.stats?.overdue || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Invoice</th>
                <th className="text-left p-4 font-medium text-sm">Customer</th>
                <th className="text-right p-4 font-medium text-sm">Amount</th>
                <th className="text-right p-4 font-medium text-sm">Balance</th>
                <th className="text-left p-4 font-medium text-sm">Due Date</th>
                <th className="text-center p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.invoices || []).map((invoice) => (
                <tr key={invoice.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4">{invoice.customerName}</td>
                  <td className="p-4 text-right font-semibold">₹{(invoice.grandTotal || 0).toLocaleString()}</td>
                  <td className="p-4 text-right text-amber-600">₹{(invoice.balanceAmount || 0).toLocaleString()}</td>
                  <td className="p-4 text-sm">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="p-4 text-center">
                    <Badge className={STATUS_COLORS[invoice.status]}>{invoice.status?.replace('_', ' ')}</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      {invoice.balanceAmount > 0 && (
                        <Button variant="ghost" size="icon" onClick={() => onWhatsApp('payment_reminder', { name: invoice.customerName, phone: invoice.customerPhone }, { invoiceNumber: invoice.invoiceNumber, amount: invoice.balanceAmount, dueDate: new Date(invoice.dueDate).toLocaleDateString() })}>
                          <Bell className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onEdit(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(invoice.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data.invoices || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No invoices yet. Create your first invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// Vendors View (Simplified)
function VendorsView({ data, onAdd, onEdit, onDelete, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vendors & Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier network</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-2 gap-4">
        {(data.vendors || []).map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold">
                    {vendor.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{vendor.vendorCode}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(vendor)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(vendor.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {vendor.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  {vendor.category}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Terms</span>
                <Badge variant="outline">{vendor.paymentTerms}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data.vendors || []).length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No vendors found. Add your first vendor.
          </div>
        )}
      </div>
    </div>
  )
}

// Reports View (Simplified)
function ReportsView({ fetchWithAuth, apiBase }) {
  const [reportType, setReportType] = useState('overview')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      try {
        const data = await fetchWithAuth(`${apiBase}/reports?type=${reportType}`)
        setReportData(data)
      } catch (error) {
        console.error('Report fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [reportType, fetchWithAuth, apiBase])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance</p>
        </div>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Overview</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="projects">Projects</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reportData ? (
        <div className="grid gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(reportData.summary || {}).slice(0, 4).map(([key, value]) => (
              <Card key={key}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-2xl font-bold">
                    {typeof value === 'number' && key.toLowerCase().includes('value') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('payment')
                      ? `₹${(value / 1000).toFixed(0)}K`
                      : value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          {reportData.monthlyRevenue && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}

// Schedule View (Simplified)
function ScheduleView({ data, projects, customers, onAdd, onEdit, onDelete, onRefresh, onWhatsApp }) {
  const today = new Date().toDateString()
  const todaySchedules = (data.schedules || []).filter(s => new Date(s.scheduledDate).toDateString() === today)
  const upcomingSchedules = (data.schedules || []).filter(s => new Date(s.scheduledDate) > new Date())

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage installations and visits</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Today's Schedule
            </CardTitle>
            <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
          </CardHeader>
          <CardContent>
            {todaySchedules.length > 0 ? (
              <div className="space-y-3">
                {todaySchedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-12 rounded-full ${schedule.type === 'installation' ? 'bg-indigo-500' : schedule.type === 'site_visit' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                      <div>
                        <p className="font-medium">{schedule.title}</p>
                        <p className="text-sm text-muted-foreground">{schedule.customerName} • {schedule.startTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{schedule.type?.replace('_', ' ')}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => onWhatsApp('installation_reminder', { name: schedule.customerName, phone: schedule.customerPhone }, { installationDate: new Date(schedule.scheduledDate).toLocaleDateString(), installationTime: schedule.startTime })}>
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(schedule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No schedules for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSchedules.slice(0, 5).map((schedule) => (
                <div key={schedule.id} className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => onEdit(schedule)}>
                  <p className="font-medium text-sm">{schedule.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(schedule.scheduledDate).toLocaleDateString()} • {schedule.startTime}</p>
                </div>
              ))}
              {upcomingSchedules.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No upcoming schedules
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default WoodenFlooringModule
