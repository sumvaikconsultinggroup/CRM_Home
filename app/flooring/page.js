'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  Layers, Package, Warehouse, Truck, FileText, Receipt, Briefcase, Calendar,
  Star, BarChart3, Plus, Search, Filter, RefreshCw, ChevronRight, ChevronLeft,
  Edit, Trash2, Eye, MoreVertical, ArrowUpRight, ArrowDownRight, AlertTriangle,
  CheckCircle2, Clock, DollarSign, Users, TrendingUp, ShoppingCart, ClipboardList,
  Building2, Phone, Mail, MapPin, Box, ArrowLeft, Settings, Send, MessageSquare
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FlooringMeeAgent } from '@/components/flooring-mee-agent'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Glass Card Component
const GlassCard = ({ children, className = '', ...props }) => (
  <motion.div
    className={`backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-xl ${className}`}
    {...props}
  >
    {children}
  </motion.div>
)

// Stat Card Component
const StatCard = ({ title, value, subValue, icon: Icon, trend, color = 'primary' }) => (
  <GlassCard className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subValue && (
          <p className={`text-sm mt-1 flex items-center ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 mr-1" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 mr-1" />}
            {subValue}
          </p>
        )}
      </div>
      <div className={`p-4 rounded-2xl bg-${color}/10`}>
        <Icon className={`h-6 w-6 text-${color}`} />
      </div>
    </div>
  </GlassCard>
)

// Flooring Module API Client Extension
const flooringApi = {
  getDashboard: () => api.request('/modules/flooring/dashboard'),
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.request(`/modules/flooring/products${query ? `?${query}` : ''}`)
  },
  createProduct: (data) => api.request('/modules/flooring/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => api.request(`/modules/flooring/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => api.request(`/modules/flooring/products/${id}`, { method: 'DELETE' }),
  getInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.request(`/modules/flooring/inventory${query ? `?${query}` : ''}`)
  },
  updateInventory: (data) => api.request('/modules/flooring/inventory', { method: 'PUT', body: JSON.stringify(data) }),
  getSuppliers: () => api.request('/modules/flooring/suppliers'),
  createSupplier: (data) => api.request('/modules/flooring/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  getQuotations: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.request(`/modules/flooring/quotations${query ? `?${query}` : ''}`)
  },
  createQuotation: (data) => api.request('/modules/flooring/quotations', { method: 'POST', body: JSON.stringify(data) }),
  updateQuotation: (id, data) => api.request(`/modules/flooring/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.request(`/modules/flooring/invoices${query ? `?${query}` : ''}`)
  },
  createInvoice: (data) => api.request('/modules/flooring/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id, data) => api.request(`/modules/flooring/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getProjects: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.request(`/modules/flooring/projects${query ? `?${query}` : ''}`)
  },
  createProject: (data) => api.request('/modules/flooring/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => api.request(`/modules/flooring/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getConsultations: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.request(`/modules/flooring/consultations${query ? `?${query}` : ''}`)
  },
  createConsultation: (data) => api.request('/modules/flooring/consultations', { method: 'POST', body: JSON.stringify(data) }),
  updateConsultation: (data) => api.request('/modules/flooring/consultations', { method: 'PUT', body: JSON.stringify(data) }),
  getFeedback: () => api.request('/modules/flooring/feedback'),
  createFeedback: (data) => api.request('/modules/flooring/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getSupplierOrders: () => api.request('/modules/flooring/supplier-orders'),
  createSupplierOrder: (data) => api.request('/modules/flooring/supplier-orders', { method: 'POST', body: JSON.stringify(data) }),
  getReports: (type) => api.request(`/modules/flooring/reports?type=${type}`)
}

export default function FlooringModule({ onBack, client, user, onUpgrade }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [products, setProducts] = useState({ products: [], referenceData: {} })
  const [inventory, setInventory] = useState({ inventory: [], summary: {} })
  const [suppliers, setSuppliers] = useState([])
  const [quotations, setQuotations] = useState({ quotations: [] })
  const [invoices, setInvoices] = useState({ invoices: [], summary: {} })
  const [projects, setProjects] = useState({ projects: [], pipeline: {}, stages: [] })
  const [consultations, setConsultations] = useState({ consultations: [] })
  const [feedback, setFeedback] = useState({ feedback: [], summary: {} })
  const [showDialog, setShowDialog] = useState(false)
  const [dialogType, setDialogType] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [showMeeAgent, setShowMeeAgent] = useState(false)

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await flooringApi.getDashboard()
      setDashboard(data)
    } catch (error) {
      toast.error('Failed to load dashboard')
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      await fetchDashboard()
      const [productsData, inventoryData, suppliersData, quotationsData, invoicesData, projectsData, consultationsData, feedbackData] = await Promise.all([
        flooringApi.getProducts(),
        flooringApi.getInventory(),
        flooringApi.getSuppliers(),
        flooringApi.getQuotations(),
        flooringApi.getInvoices(),
        flooringApi.getProjects(),
        flooringApi.getConsultations(),
        flooringApi.getFeedback()
      ])
      setProducts(productsData)
      setInventory(inventoryData)
      setSuppliers(suppliersData)
      setQuotations(quotationsData)
      setInvoices(invoicesData)
      setProjects(projectsData)
      setConsultations(consultationsData)
      setFeedback(feedbackData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchDashboard])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateQuotation = async (formData) => {
    try {
      await flooringApi.createQuotation(formData)
      toast.success('Quotation created successfully')
      setShowDialog(false)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCreateProject = async (formData) => {
    try {
      await flooringApi.createProject(formData)
      toast.success('Project created successfully')
      setShowDialog(false)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleUpdateProjectStage = async (projectId, newStage) => {
    try {
      await flooringApi.updateProject(projectId, { stage: newStage })
      toast.success('Project stage updated')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCreateConsultation = async (formData) => {
    try {
      await flooringApi.createConsultation(formData)
      toast.success('Consultation scheduled successfully')
      setShowDialog(false)
      fetchData()
    } catch (error) {
      console.error('Failed to create consultation:', error)
      toast.error(error.message || 'Failed to create consultation. Please try again.')
    }
  }

  const handleRecordPayment = async (invoiceId, paymentData) => {
    try {
      await flooringApi.updateInvoice(invoiceId, { action: 'record_payment', ...paymentData })
      toast.success('Payment recorded')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'inventory', icon: Warehouse, label: 'Inventory' },
    { id: 'suppliers', icon: Truck, label: 'Suppliers' },
    { id: 'quotations', icon: FileText, label: 'Quotations' },
    { id: 'invoices', icon: Receipt, label: 'Invoices' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'consultations', icon: Calendar, label: 'Consultations' },
    { id: 'feedback', icon: Star, label: 'Feedback' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Layers className="h-12 w-12 text-amber-600" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Wooden Flooring Module</h1>
                <p className="text-sm text-muted-foreground">Manage your flooring business</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mee AI Button */}
            <Button 
              variant={showMeeAgent ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowMeeAgent(!showMeeAgent)}
              className={showMeeAgent ? "bg-gradient-to-r from-amber-500 to-orange-600" : ""}
            >
              <Layers className="h-4 w-4 mr-2" />
              Mee AI
              {client?.planId?.toLowerCase() !== 'enterprise' && (
                <Badge className="ml-2 bg-yellow-500 text-xs">PRO</Badge>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside 
          className="w-64 bg-white/60 backdrop-blur-xl border-r min-h-[calc(100vh-73px)] p-4"
          initial={{ x: -100 }}
          animate={{ x: 0 }}
        >
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                    : 'hover:bg-amber-100 text-slate-600'
                }`}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </motion.button>
            ))}
          </nav>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && dashboard && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Products" 
                    value={dashboard.overview.products.total}
                    subValue={`${dashboard.overview.products.featured} featured`}
                    icon={Package}
                  />
                  <StatCard 
                    title="Inventory Value" 
                    value={`₹${dashboard.overview.inventory.totalValue?.toLocaleString()}`}
                    subValue={dashboard.overview.inventory.lowStock > 0 ? `${dashboard.overview.inventory.lowStock} low stock` : 'Stock healthy'}
                    trend={dashboard.overview.inventory.lowStock > 0 ? 'down' : 'up'}
                    icon={Warehouse}
                  />
                  <StatCard 
                    title="Active Projects" 
                    value={dashboard.overview.projects.active}
                    subValue={`${dashboard.overview.projects.completed} completed`}
                    icon={Briefcase}
                  />
                  <StatCard 
                    title="Revenue" 
                    value={`₹${dashboard.overview.invoices.paidAmount?.toLocaleString()}`}
                    subValue={`₹${dashboard.overview.invoices.pendingAmount?.toLocaleString()} pending`}
                    icon={DollarSign}
                  />
                </div>

                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Project Pipeline */}
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Project Pipeline</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dashboard.charts.projectPipeline.filter(s => s.count > 0 || s.order <= 6)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {dashboard.charts.projectPipeline.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>

                  {/* Inventory by Location */}
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Inventory by Location</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dashboard.charts.inventoryByLocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="location"
                          label={({ location, value }) => `${location}: ₹${(value/1000).toFixed(0)}k`}
                        >
                          {dashboard.charts.inventoryByLocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{dashboard.overview.quotations.total}</p>
                    <p className="text-sm text-muted-foreground">Quotations</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{dashboard.overview.invoices.paid}</p>
                    <p className="text-sm text-muted-foreground">Paid Invoices</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{dashboard.overview.suppliers}</p>
                    <p className="text-sm text-muted-foreground">Suppliers</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{dashboard.overview.upcomingConsultations}</p>
                    <p className="text-sm text-muted-foreground">Upcoming Visits</p>
                  </GlassCard>
                </div>
              </motion.div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Product Catalog</h2>
                  <div className="flex gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Wood Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {products.referenceData.woodTypes?.map(type => (
                          <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { setDialogType('product'); setEditingItem(null); setShowDialog(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Add Product
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.products?.slice(0, 12).map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <GlassCard className="overflow-hidden hover:shadow-xl transition-shadow">
                        <div className="h-40 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <Layers className="h-16 w-16 text-amber-300" />
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                            {product.featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-amber-600">₹{product.pricePerSqFt}/sq.ft</span>
                            <Badge variant={product.inStock ? 'default' : 'destructive'}>
                              {product.inStock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Inventory Management</h2>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" /> Low Stock Only
                    </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{inventory.summary.totalItems}</p>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">₹{inventory.summary.totalValue?.toLocaleString()}</p>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-orange-500">{inventory.summary.lowStockCount}</p>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-500">{inventory.summary.outOfStockCount}</p>
                  </GlassCard>
                </div>

                {/* Inventory Table */}
                <GlassCard className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">SKU</th>
                          <th className="text-left py-3 px-4">Product</th>
                          <th className="text-left py-3 px-4">Location</th>
                          <th className="text-right py-3 px-4">Quantity</th>
                          <th className="text-right py-3 px-4">Reorder Level</th>
                          <th className="text-right py-3 px-4">Value</th>
                          <th className="text-left py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.inventory?.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-amber-50">
                            <td className="py-3 px-4 font-mono text-sm">{item.sku}</td>
                            <td className="py-3 px-4">{item.productName}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{item.location}</Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{item.quantity} {item.unit}</td>
                            <td className="py-3 px-4 text-right">{item.reorderLevel}</td>
                            <td className="py-3 px-4 text-right">₹{(item.quantity * item.costPrice).toLocaleString()}</td>
                            <td className="py-3 px-4">
                              {item.quantity === 0 ? (
                                <Badge variant="destructive">Out of Stock</Badge>
                              ) : item.quantity <= item.reorderLevel ? (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">Low Stock</Badge>
                              ) : (
                                <Badge variant="default" className="bg-green-100 text-green-700">In Stock</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Suppliers Tab */}
            {activeTab === 'suppliers' && (
              <motion.div
                key="suppliers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Supplier Management</h2>
                  <Button onClick={() => { setDialogType('supplier'); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Supplier
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers?.map((supplier, i) => (
                    <motion.div
                      key={supplier.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <GlassCard className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{supplier.name}</h3>
                            <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{supplier.rating}</span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{supplier.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{supplier.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{supplier.address}</span>
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lead Time</span>
                          <span className="font-medium">{supplier.leadTime} days</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Min Order</span>
                          <span className="font-medium">₹{supplier.minimumOrder?.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {supplier.specialties?.map((s, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs capitalize">{s}</Badge>
                          ))}
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quotations Tab */}
            {activeTab === 'quotations' && (
              <motion.div
                key="quotations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Quotations</h2>
                  <Button onClick={() => { setDialogType('quotation'); setEditingItem(null); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Create Quotation
                  </Button>
                </div>

                {quotations.quotations?.length === 0 ? (
                  <GlassCard className="p-12 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Quotations Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first quotation to get started</p>
                    <Button onClick={() => { setDialogType('quotation'); setShowDialog(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Create Quotation
                    </Button>
                  </GlassCard>
                ) : (
                  <GlassCard className="p-6">
                    <div className="space-y-4">
                      {quotations.quotations?.map((quotation) => (
                        <div key={quotation.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                          <div>
                            <p className="font-semibold">{quotation.quotationNumber}</p>
                            <p className="text-sm text-muted-foreground">{quotation.customerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{quotation.grandTotal?.toLocaleString()}</p>
                            <Badge variant={
                              quotation.status === 'accepted' ? 'default' :
                              quotation.status === 'sent' ? 'secondary' :
                              quotation.status === 'rejected' ? 'destructive' : 'outline'
                            }>{quotation.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <motion.div
                key="invoices"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Invoices</h2>
                  <Button onClick={() => { setDialogType('invoice'); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Create Invoice
                  </Button>
                </div>

                {/* Invoice Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Total Invoiced</p>
                    <p className="text-2xl font-bold">₹{invoices.summary?.totalAmount?.toLocaleString() || 0}</p>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold text-green-600">₹{invoices.summary?.paidAmount?.toLocaleString() || 0}</p>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-orange-500">₹{invoices.summary?.pendingAmount?.toLocaleString() || 0}</p>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold text-red-500">{invoices.summary?.overdueCount || 0}</p>
                  </GlassCard>
                </div>

                {invoices.invoices?.length === 0 ? (
                  <GlassCard className="p-12 text-center">
                    <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Invoices Yet</h3>
                    <p className="text-muted-foreground">Invoices will appear here</p>
                  </GlassCard>
                ) : (
                  <GlassCard className="p-6">
                    <div className="space-y-4">
                      {invoices.invoices?.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                          <div>
                            <p className="font-semibold">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{invoice.grandTotal?.toLocaleString()}</p>
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              invoice.status === 'overdue' ? 'destructive' :
                              invoice.status === 'partially_paid' ? 'secondary' : 'outline'
                            }>{invoice.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Project Pipeline</h2>
                  <Button onClick={() => { setDialogType('project'); setEditingItem(null); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </div>

                {/* Pipeline View */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {projects.stages?.slice(0, 8).map((stage) => (
                      <GlassCard key={stage.id} className="w-72 min-h-[400px]">
                        <div className="p-4 border-b" style={{ borderColor: stage.color }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                              <span className="font-medium text-sm">{stage.name}</span>
                            </div>
                            <Badge variant="secondary">
                              {projects.pipeline?.[stage.id]?.projects?.length || 0}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                          {projects.pipeline?.[stage.id]?.projects?.map((project) => (
                            <motion.div
                              key={project.id}
                              className="p-3 bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                              whileHover={{ scale: 1.02 }}
                              onClick={() => { setDialogType('project-detail'); setEditingItem(project); setShowDialog(true); }}
                            >
                              <p className="font-medium text-sm">{project.title}</p>
                              <p className="text-xs text-muted-foreground">{project.customerName}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-muted-foreground">{project.projectNumber}</span>
                                <span className="text-xs font-medium">₹{project.estimatedCost?.toLocaleString()}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Consultations Tab */}
            {activeTab === 'consultations' && (
              <motion.div
                key="consultations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Site Consultations</h2>
                  <Button onClick={() => { setDialogType('consultation'); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Schedule Consultation
                  </Button>
                </div>

                {consultations.consultations?.length === 0 ? (
                  <GlassCard className="p-12 text-center">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Consultations Scheduled</h3>
                    <p className="text-muted-foreground mb-4">Schedule site visits and consultations with clients</p>
                    <Button onClick={() => { setDialogType('consultation'); setShowDialog(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Schedule Consultation
                    </Button>
                  </GlassCard>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {consultations.consultations?.map((consultation, i) => (
                      <motion.div
                        key={consultation.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <GlassCard className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold">{consultation.customerName}</p>
                              <p className="text-sm text-muted-foreground">{consultation.customerPhone}</p>
                            </div>
                            <Badge variant={
                              consultation.status === 'confirmed' ? 'default' :
                              consultation.status === 'completed' ? 'secondary' :
                              consultation.status === 'cancelled' ? 'destructive' : 'outline'
                            }>{consultation.status}</Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(consultation.scheduledDate).toLocaleDateString()} at {consultation.scheduledTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="line-clamp-1">{consultation.siteAddress}</span>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Customer Feedback</h2>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <GlassCard className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                      <span className="text-4xl font-bold">{feedback.summary?.averageRating || 0}</span>
                    </div>
                    <p className="text-muted-foreground">Average Rating</p>
                  </GlassCard>
                  <GlassCard className="p-6 text-center">
                    <p className="text-4xl font-bold">{feedback.summary?.total || 0}</p>
                    <p className="text-muted-foreground">Total Reviews</p>
                  </GlassCard>
                  <GlassCard className="p-6">
                    <p className="text-sm font-medium mb-3">Rating Distribution</p>
                    {feedback.summary?.ratingDistribution?.map((item) => (
                      <div key={item.rating} className="flex items-center gap-2 mb-1">
                        <span className="w-3 text-sm">{item.rating}</span>
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <Progress value={(item.count / (feedback.summary?.total || 1)) * 100} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground w-6">{item.count}</span>
                      </div>
                    ))}
                  </GlassCard>
                </div>

                {feedback.feedback?.length === 0 ? (
                  <GlassCard className="p-12 text-center">
                    <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
                    <p className="text-muted-foreground">Customer feedback will appear here after project completion</p>
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {feedback.feedback?.map((item) => (
                      <GlassCard key={item.id} className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{item.customerName}</p>
                            <p className="text-sm text-muted-foreground">Project: {item.projectNumber}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-4 w-4 ${star <= item.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {item.comments && <p className="text-sm">{item.comments}</p>}
                      </GlassCard>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Dialogs */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'quotation' && 'Create Quotation'}
              {dialogType === 'project' && 'Create Project'}
              {dialogType === 'consultation' && 'Schedule Consultation'}
              {dialogType === 'project-detail' && editingItem?.title}
            </DialogTitle>
          </DialogHeader>

          {dialogType === 'quotation' && (
            <QuotationForm products={products.products} onSubmit={handleCreateQuotation} />
          )}

          {dialogType === 'project' && (
            <ProjectForm onSubmit={handleCreateProject} />
          )}

          {dialogType === 'consultation' && (
            <ConsultationForm onSubmit={handleCreateConsultation} />
          )}

          {dialogType === 'project-detail' && editingItem && (
            <ProjectDetail 
              project={editingItem} 
              stages={projects.stages}
              onUpdateStage={(stage) => handleUpdateProjectStage(editingItem.id, stage)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Form Components
function QuotationForm({ products, onSubmit }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ productId: '', productName: '', quantity: 0, pricePerUnit: 0, unit: 'sq.ft' }],
    installationCost: 0,
    deliveryCost: 0,
    discount: 0,
    taxRate: 18,
    notes: ''
  })

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', productName: '', quantity: 0, pricePerUnit: 0, unit: 'sq.ft' }]
    })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    
    if (field === 'productId') {
      const product = products?.find(p => p.id === value)
      if (product) {
        newItems[index].productName = product.name
        newItems[index].pricePerUnit = product.pricePerSqFt
      }
    }
    
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0)
    const withExtras = subtotal + formData.installationCost + formData.deliveryCost - formData.discount
    const tax = withExtras * (formData.taxRate / 100)
    return withExtras + tax
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.customerEmail} onChange={(e) => setFormData({...formData, customerEmail: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={formData.customerAddress} onChange={(e) => setFormData({...formData, customerAddress: e.target.value})} />
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>
        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 mb-2">
            <Select value={item.productId} onValueChange={(v) => updateItem(index, 'productId', v)}>
              <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
              <SelectContent>
                {products?.slice(0, 20).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Qty (sq.ft)" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} />
            <Input type="number" placeholder="Price/sq.ft" value={item.pricePerUnit} onChange={(e) => updateItem(index, 'pricePerUnit', parseFloat(e.target.value) || 0)} />
            <div className="text-right font-medium pt-2">₹{(item.quantity * item.pricePerUnit).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Installation Cost</Label>
          <Input type="number" value={formData.installationCost} onChange={(e) => setFormData({...formData, installationCost: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Delivery Cost</Label>
          <Input type="number" value={formData.deliveryCost} onChange={(e) => setFormData({...formData, deliveryCost: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Discount</Label>
          <Input type="number" value={formData.discount} onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})} />
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg">
        <div className="flex justify-between text-lg font-bold">
          <span>Total (incl. {formData.taxRate}% GST)</span>
          <span>₹{calculateTotal().toLocaleString()}</span>
        </div>
      </div>

      <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500">Create Quotation</Button>
    </form>
  )
}

function ProjectForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    siteAddress: '',
    siteArea: 0,
    flooringType: '',
    estimatedCost: 0,
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project Title *</Label>
        <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Site Address</Label>
        <Textarea value={formData.siteAddress} onChange={(e) => setFormData({...formData, siteAddress: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Site Area (sq.ft)</Label>
          <Input type="number" value={formData.siteArea} onChange={(e) => setFormData({...formData, siteArea: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Estimated Cost</Label>
          <Input type="number" value={formData.estimatedCost} onChange={(e) => setFormData({...formData, estimatedCost: parseFloat(e.target.value) || 0})} />
        </div>
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500">Create Project</Button>
    </form>
  )
}

function ConsultationForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    type: 'site_visit',
    scheduledDate: '',
    scheduledTime: '10:00',
    siteAddress: '',
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Phone *</Label>
          <Input value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={formData.customerEmail} onChange={(e) => setFormData({...formData, customerEmail: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Consultation Type</Label>
        <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="site_visit">Site Visit</SelectItem>
            <SelectItem value="showroom">Showroom Visit</SelectItem>
            <SelectItem value="video_call">Video Call</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input type="time" value={formData.scheduledTime} onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Site Address</Label>
        <Textarea value={formData.siteAddress} onChange={(e) => setFormData({...formData, siteAddress: e.target.value})} />
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500">Schedule Consultation</Button>
    </form>
  )
}

function ProjectDetail({ project, stages, onUpdateStage }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Project Number</Label>
          <p className="font-medium">{project.projectNumber}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Customer</Label>
          <p className="font-medium">{project.customerName}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Site Address</Label>
          <p className="font-medium">{project.siteAddress || 'Not specified'}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Site Area</Label>
          <p className="font-medium">{project.siteArea} sq.ft</p>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-muted-foreground mb-2 block">Current Stage</Label>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stages?.find(s => s.id === project.stage)?.color }} />
          <span className="font-medium">{stages?.find(s => s.id === project.stage)?.name}</span>
        </div>
        <Label className="text-muted-foreground mb-2 block">Move to Stage</Label>
        <div className="flex flex-wrap gap-2">
          {stages?.map((stage) => (
            <Button 
              key={stage.id} 
              size="sm" 
              variant={project.stage === stage.id ? 'default' : 'outline'}
              onClick={() => onUpdateStage(stage.id)}
              disabled={project.stage === stage.id}
              style={{ borderColor: stage.color, color: project.stage === stage.id ? 'white' : stage.color }}
            >
              {stage.name}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-muted-foreground mb-2 block">Progress</Label>
        <div className="flex items-center gap-4">
          <Progress value={project.progress} className="flex-1" />
          <span className="font-medium">{project.progress}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Estimated Cost</Label>
          <p className="font-medium">₹{project.estimatedCost?.toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Actual Cost</Label>
          <p className="font-medium">₹{project.actualCost?.toLocaleString() || 0}</p>
        </div>
      </div>
    </div>
  )
}
