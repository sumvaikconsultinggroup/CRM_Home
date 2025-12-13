'use client'

import { useState, useEffect, useCallback } from 'react'
import { FlooringProductDialog, ImportProductsDialog, CategoryManagerDialog } from '@/components/modules/flooring-products-ui'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  LayoutDashboard, Package, Ruler, FileText, Wrench, Warehouse, Users,
  Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download, Upload,
  TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, Send,
  AlertTriangle, ArrowUpRight, Calculator, Home, Square, ChevronRight,
  MoreVertical, Copy, Printer, Image, Camera, MapPin, Phone, Mail,
  Calendar, Building2, Layers, Grid3X3, Box, Truck, Settings, BarChart3,
  PieChart, Target, Award, Zap, Star, X, FileSpreadsheet, Receipt,
  CreditCard, Banknote, ChevronDown, ArrowLeft, ArrowRight, Sparkles,
  MessageSquare, Bot, ClipboardList, Hammer, ShieldCheck, History, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// =============================================
// CONSTANTS & CONFIGURATIONS
// =============================================

const FlooringCategories = {
  hardwood: { label: 'Hardwood', color: 'bg-amber-100 text-amber-700', icon: Layers },
  engineered_wood: { label: 'Engineered Wood', color: 'bg-orange-100 text-orange-700', icon: Layers },
  laminate: { label: 'Laminate', color: 'bg-yellow-100 text-yellow-700', icon: Grid3X3 },
  vinyl: { label: 'Vinyl/LVP', color: 'bg-blue-100 text-blue-700', icon: Square },
  tile: { label: 'Tile', color: 'bg-slate-100 text-slate-700', icon: Grid3X3 },
  carpet: { label: 'Carpet', color: 'bg-purple-100 text-purple-700', icon: Square },
  bamboo: { label: 'Bamboo', color: 'bg-green-100 text-green-700', icon: Layers },
  cork: { label: 'Cork', color: 'bg-rose-100 text-rose-700', icon: Layers }
}

const RoomTypes = {
  living_room: 'Living Room',
  bedroom: 'Bedroom',
  master_bedroom: 'Master Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  dining_room: 'Dining Room',
  hallway: 'Hallway',
  office: 'Office',
  basement: 'Basement',
  commercial: 'Commercial Space',
  other: 'Other'
}

const QuoteStatus = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  revised: { label: 'Revised', color: 'bg-amber-100 text-amber-700' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700' }
}

const InvoiceStatus = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  partially_paid: { label: 'Partial', color: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' }
}

const InstallationStatus = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  materials_ordered: { label: 'Materials Ordered', color: 'bg-cyan-100 text-cyan-700' },
  materials_delivered: { label: 'Materials Delivered', color: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

const ProjectStatus = {
  site_visit_pending: { label: 'Site Visit Pending', color: 'bg-blue-100 text-blue-700' },
  measurement_done: { label: 'Measurement Done', color: 'bg-cyan-100 text-cyan-700' },
  quote_sent: { label: 'Quote Sent', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

const QuoteTemplates = [
  { id: 'professional', name: 'Professional', description: 'Clean, modern design' },
  { id: 'premium', name: 'Premium', description: 'Detailed breakdown with images' },
  { id: 'luxury', name: 'Luxury', description: 'High-end presentation' }
]

const InvoiceTemplates = [
  { id: 'standard', name: 'Standard', description: 'GST compliant invoice' },
  { id: 'detailed', name: 'Detailed', description: 'Itemized with breakdown' },
  { id: 'premium', name: 'Premium', description: 'Executive presentation' }
]

// =============================================
// HELPER COMPONENTS
// =============================================

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, color, subtitle, onClick }) => (
  <motion.div whileHover={{ y: -2, scale: 1.01 }} onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            {change && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                change.startsWith('+') ? 'text-emerald-600' : change.startsWith('-') ? 'text-red-500' : 'text-slate-500'
              }`}>
                {change.startsWith('+') ? <TrendingUp className="h-4 w-4" /> : change.startsWith('-') ? <TrendingDown className="h-4 w-4" /> : null}
                {change}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
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

// Data Table Header
const TableHeader = ({ children, sortable, sorted, onSort }) => (
  <th 
    className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${sortable ? 'cursor-pointer hover:bg-slate-100' : ''}`}
    onClick={sortable ? onSort : undefined}
  >
    <div className="flex items-center gap-1">
      {children}
      {sorted && <ChevronDown className={`h-4 w-4 ${sorted === 'desc' ? 'rotate-180' : ''}`} />}
    </div>
  </th>
)

// =============================================
// MAIN ENTERPRISE FLOORING MODULE COMPONENT
// =============================================

export function EnterpriseFlooringModule({ client, user, token }) {
  // State Management
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Data States
  const [dashboardData, setDashboardData] = useState(null)
  const [products, setProducts] = useState([])
  const [productSchema, setProductSchema] = useState(null)
  const [productCategories, setProductCategories] = useState([])
  const [productsMeta, setProductsMeta] = useState({ total: 0 })
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [installations, setInstallations] = useState([])
  const [inventory, setInventory] = useState({ inventory: [], summary: {} })
  const [crmProjects, setCrmProjects] = useState([]) // CRM Projects for sync
  const [moduleSettings, setModuleSettings] = useState(null) // Module settings
  const [reports, setReports] = useState({}) // Reports data
  const [meeAiMessages, setMeeAiMessages] = useState([]) // MEE AI chat
  const [meeAiInput, setMeeAiInput] = useState('')
  const [meeAiLoading, setMeeAiLoading] = useState(false)
  
  // Selection States
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedQuote, setSelectedQuote] = useState(null)
  
  // Dialog States
  const [dialogOpen, setDialogOpen] = useState({ type: null, data: null })
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productSortBy, setProductSortBy] = useState('createdAt')
  const [productSortDir, setProductSortDir] = useState('desc')

  // API Headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // =============================================
  // DATA FETCHING FUNCTIONS
  // =============================================

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced?type=dashboard', { headers })
      const data = await res.json()
      if (data.success !== false) setDashboardData(data)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
  }, [token])

  const fetchProductSchema = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/products/schema', { headers })
      const data = await res.json()
      if (data?.schema) setProductSchema(data.schema)
    } catch (error) {
      console.error('Product schema fetch error:', error)
    }
  }, [token])

  const fetchProductCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/categories?tree=true', { headers })
      const data = await res.json()
      if (data?.categories) setProductCategories(data.categories)
    } catch (error) {
      console.error('Categories fetch error:', error)
    }
  }, [token])

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm?.trim()) params.set('search', searchTerm.trim())
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (productSortBy) params.set('sortBy', productSortBy)
      if (productSortDir) params.set('sortDir', productSortDir)

      const url = `/api/flooring/enhanced/products${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url, { headers })
      const data = await res.json()

      if (data?.products) {
        setProducts(data.products)
        setProductsMeta({ total: data.total || data.products.length })
      } else if (Array.isArray(data)) {
        setProducts(data)
        setProductsMeta({ total: data.length })
      }
    } catch (error) {
      console.error('Products fetch error:', error)
    }
  }, [token, searchTerm, categoryFilter, statusFilter, productSortBy, productSortDir])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/customers', { headers })
      const data = await res.json()
      if (data.customers) setCustomers(data.customers)
    } catch (error) {
      console.error('Customers fetch error:', error)
    }
  }, [token])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/projects', { headers })
      const data = await res.json()
      if (data.projects) setProjects(data.projects)
    } catch (error) {
      console.error('Projects fetch error:', error)
    }
  }, [token])

  const fetchQuotes = useCallback(async () => {
    try {
      let url = '/api/flooring/enhanced/quotes'
      if (selectedProject) url += `?projectId=${selectedProject.id}`
      const res = await fetch(url, { headers })
      const data = await res.json()
      if (Array.isArray(data)) setQuotes(data)
    } catch (error) {
      console.error('Quotes fetch error:', error)
    }
  }, [token, selectedProject])

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/invoices', { headers })
      const data = await res.json()
      if (data.invoices) setInvoices(data.invoices)
    } catch (error) {
      console.error('Invoices fetch error:', error)
    }
  }, [token])

  const fetchInstallations = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/installations', { headers })
      const data = await res.json()
      if (data.installations) setInstallations(data.installations)
    } catch (error) {
      console.error('Installations fetch error:', error)
    }
  }, [token])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/inventory', { headers })
      const data = await res.json()
      if (data.inventory) setInventory(data)
    } catch (error) {
      console.error('Inventory fetch error:', error)
    }
  }, [token])

  const fetchModuleSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/settings', { headers })
      const data = await res.json()
      if (data.settings) setModuleSettings(data.settings)
    } catch (error) {
      console.error('Settings fetch error:', error)
    }
  }, [token])

  const fetchReports = useCallback(async (reportType = 'summary') => {
    try {
      const res = await fetch(`/api/flooring/enhanced/reports?type=${reportType}`, { headers })
      const data = await res.json()
      if (data) setReports(prev => ({ ...prev, [reportType]: data }))
    } catch (error) {
      console.error('Reports fetch error:', error)
    }
  }, [token])

  const fetchCrmProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers })
      const data = await res.json()
      if (Array.isArray(data)) setCrmProjects(data)
    } catch (error) {
      console.error('CRM Projects fetch error:', error)
    }
  }, [token])

  // Load data on mount and when tab changes
  useEffect(() => {
    fetchDashboard()
    fetchProductSchema()
    fetchProductCategories()
    fetchProducts()
    fetchProjects()
    fetchCustomers()
    fetchCrmProjects()
  }, [fetchDashboard, fetchProductSchema, fetchProductCategories, fetchProducts, fetchProjects, fetchCustomers, fetchCrmProjects, refreshKey])

  useEffect(() => {
    if (activeTab === 'quotes') fetchQuotes()
    if (activeTab === 'invoices') fetchInvoices()
    if (activeTab === 'installations') fetchInstallations()
    if (activeTab === 'inventory') fetchInventory()
    if (activeTab === 'settings') fetchModuleSettings()
    if (activeTab === 'reports') fetchReports('summary')
  }, [activeTab, fetchQuotes, fetchInvoices, fetchInstallations, fetchInventory, fetchModuleSettings, fetchReports])

  // Refresh data
  const refreshData = () => {
    setRefreshKey(k => k + 1)
    toast.success('Data refreshed')
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  const handleSaveProduct = async (productData) => {
    try {
      setLoading(true)
      const method = productData.id ? 'PUT' : 'POST'
      const res = await fetch('/api/flooring/enhanced/products', {
        method,
        headers,
        body: JSON.stringify(productData)
      })
      
      if (res.ok) {
        toast.success(productData.id ? 'Product updated' : 'Product created')
        fetchProducts()
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save product')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleExportProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm?.trim()) params.set('search', searchTerm.trim())
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (productSortBy) params.set('sortBy', productSortBy)
      if (productSortDir) params.set('sortDir', productSortDir)

      const url = `/api/flooring/enhanced/products/export${params.toString() ? `?${params.toString()}` : ''}`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Export failed')
        return
      }

      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `flooring-products-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)

      toast.success('Export downloaded')
    } catch (error) {
      console.error(error)
      toast.error('Export failed')
    }
  }

  const handleImportProducts = async (csvText) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/products/import', {
        method: 'POST',
        headers,
        body: JSON.stringify({ csv: csvText, upsertBySku: true })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Import failed')
        return
      }

      const r = data?.results
      toast.success(`Import complete: ${r?.created || 0} created, ${r?.updated || 0} updated, ${r?.failed || 0} failed`)
      fetchProducts()
      setDialogOpen({ type: null, data: null })
    } catch (error) {
      console.error(error)
      toast.error('Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async ({ id, name, parentId }) => {
    try {
      setLoading(true)
      const method = id ? 'PUT' : 'POST'
      const res = await fetch('/api/flooring/enhanced/categories', {
        method,
        headers,
        body: JSON.stringify({ id, name, parentId })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Failed to save category')
        return
      }
      toast.success(id ? 'Category updated' : 'Category created')
      fetchProductCategories()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/flooring/enhanced/categories?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Failed to delete category')
        return
      }
      toast.success('Category deleted')
      fetchProductCategories()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete category')
    } finally {
      setLoading(false)
    }
  }


  const handleSaveCustomer = async (customerData) => {
    try {
      setLoading(true)
      const method = customerData.id ? 'PUT' : 'POST'
      const res = await fetch('/api/flooring/enhanced/customers', {
        method,
        headers,
        body: JSON.stringify({ ...customerData, syncToCRM: true })
      })
      
      if (res.ok) {
        toast.success(customerData.id ? 'Customer updated' : 'Customer created & synced to CRM')
        fetchCustomers()
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save customer')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProject = async (projectData) => {
    try {
      setLoading(true)
      const method = projectData.id ? 'PUT' : 'POST'
      const res = await fetch('/api/flooring/enhanced/projects', {
        method,
        headers,
        body: JSON.stringify({ ...projectData, syncToCRM: true })
      })
      
      if (res.ok) {
        toast.success(projectData.id ? 'Project updated' : 'Project created & synced to CRM')
        fetchProjects()
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save project')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveQuote = async (quoteData) => {
    try {
      setLoading(true)
      const method = quoteData.id ? 'PUT' : 'POST'
      const res = await fetch('/api/flooring/enhanced/quotes', {
        method,
        headers,
        body: JSON.stringify(quoteData)
      })
      
      if (res.ok) {
        toast.success(quoteData.id ? 'Quote updated' : 'Quote created')
        fetchQuotes()
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save quote')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleQuoteAction = async (quoteId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/quotes', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: quoteId, action, by: user?.id, ...data })
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(result.message || 'Action completed')
        fetchQuotes()
        if (action === 'create_invoice') fetchInvoices()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Action failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceAction = async (invoiceId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/invoices', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: invoiceId, action, by: user?.id, ...data })
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(result.message || 'Action completed')
        fetchInvoices()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Action failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInstallationAction = async (installationId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/installations', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: installationId, action, by: user?.id, ...data })
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(result.message || 'Action completed')
        fetchInstallations()
        fetchProjects()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Action failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInventoryAction = async (action, data) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/inventory', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, ...data, createdBy: user?.id })
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(result.message || 'Inventory updated')
        fetchInventory()
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Action failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // MEE AI Chat Handler
  const handleMeeAiChat = async () => {
    if (!meeAiInput.trim()) return

    const userMessage = meeAiInput.trim()
    setMeeAiInput('')
    setMeeAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setMeeAiLoading(true)

    try {
      // Build context from current module data
      const context = {
        module: 'flooring',
        stats: dashboardData?.overview || {},
        recentQuotes: dashboardData?.recentQuotes?.slice(0, 3) || [],
        lowStockAlerts: dashboardData?.lowStockAlerts?.length || 0,
        activeInstallations: dashboardData?.overview?.activeInstallations || 0,
        products: products.length,
        projects: projects.length
      }

      const res = await fetch('/api/mee', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          context: {
            ...context,
            moduleType: 'flooring',
            userQuery: `User is in the Flooring Module and asks: ${userMessage}. 
              Current stats: ${context.products} products, ${context.projects} projects, 
              ${context.stats.totalQuotes || 0} quotes worth ₹${(context.stats.totalQuoteValue || 0).toLocaleString()}, 
              ${context.lowStockAlerts} low stock alerts.
              Help the user with flooring-related queries, inventory management, quotes, or any questions about their business.`
          }
        })
      })

      const data = await res.json()
      
      if (data.response) {
        setMeeAiMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else if (data.error) {
        setMeeAiMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${data.error}` }])
      }
    } catch (error) {
      setMeeAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process your request. Please try again.' }])
    } finally {
      setMeeAiLoading(false)
    }
  }

  // Project Sync Handler
  const handleProjectSync = async (action) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(`Sync completed: ${result.results?.synced || 0} projects synced`)
        fetchProjects()
        fetchCrmProjects()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setLoading(false)
    }
  }

  // =============================================
  // RENDER TABS
  // =============================================

  // Dashboard Tab
  const renderDashboard = () => {
    const data = dashboardData?.overview || {}
    const period = dashboardData?.period || {}

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Quotes"
            value={data.totalQuotes || 0}
            subtitle={`₹${(data.totalQuoteValue || 0).toLocaleString()} total value`}
            change={period.quotesCreated > 0 ? `+${period.quotesCreated} this period` : null}
            icon={FileText}
            color="bg-gradient-to-br from-blue-500 to-indigo-600"
            onClick={() => setActiveTab('quotes')}
          />
          <StatCard
            title="Conversion Rate"
            value={`${data.conversionRate || 0}%`}
            subtitle={`${data.approvedQuotes || 0} approved quotes`}
            icon={Target}
            color="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <StatCard
            title="Revenue"
            value={`₹${(data.collectedAmount || 0).toLocaleString()}`}
            subtitle={`₹${(data.pendingAmount || 0).toLocaleString()} pending`}
            icon={DollarSign}
            color="bg-gradient-to-br from-amber-500 to-orange-600"
            onClick={() => setActiveTab('invoices')}
          />
          <StatCard
            title="Active Installations"
            value={data.activeInstallations || 0}
            subtitle={`${data.lowStockItems || 0} low stock alerts`}
            icon={Wrench}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            onClick={() => setActiveTab('installations')}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalProducts || 0}</p>
                <p className="text-xs text-slate-500">Products</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.flooringLeads || 0}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalProjects || 0}</p>
                <p className="text-xs text-slate-500">Projects</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Warehouse className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{((data.totalInventoryValue || 0) / 100000).toFixed(1)}L</p>
                <p className="text-xs text-slate-500">Inventory Value</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Sections */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Quotes */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Quotes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('quotes')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentQuotes?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentQuotes.map(quote => (
                    <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{quote.quoteNumber}</p>
                          <p className="text-sm text-slate-500">{quote.customer?.name || 'No customer'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{(quote.grandTotal || 0).toLocaleString()}</p>
                        <Badge className={QuoteStatus[quote.status]?.color}>{QuoteStatus[quote.status]?.label}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-6">No recent quotes</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts & Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData?.lowStockAlerts?.length > 0 ? (
                dashboardData.lowStockAlerts.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium truncate max-w-[140px]">{item.product?.name || 'Product'}</span>
                    </div>
                    <Badge variant="destructive" className="text-xs">{item.availableQty || 0} left</Badge>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4 text-sm">No alerts</p>
              )}

              {dashboardData?.pendingLeads?.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-slate-700">Pending Leads</p>
                  {dashboardData.pendingLeads.slice(0, 3).map((lead, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium truncate max-w-[140px]">{lead.name}</span>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{lead.status}</Badge>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Installations */}
        {dashboardData?.upcomingInstallations?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Upcoming Installations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.upcomingInstallations.map(inst => (
                  <div key={inst.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{inst.customer?.name || 'Customer'}</p>
                        <p className="text-sm text-slate-500">{inst.site?.address?.substring(0, 30) || 'Site'}</p>
                      </div>
                      <Badge className={InstallationStatus[inst.status]?.color}>
                        {InstallationStatus[inst.status]?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(inst.scheduledDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        {inst.totalArea || 0} sqft
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Products Tab
  const renderProducts = () => {
    const flatCategories = []
    const walk = (nodes, depth = 0) => {
      for (const n of nodes || []) {
        flatCategories.push({ ...n, depth })
        if (n.children?.length) walk(n.children, depth + 1)
      }
    }
    walk(productCategories)

    const categoryLabelById = new Map(flatCategories.map(c => [c.id, c.name]))
    const categoryColorById = new Map(flatCategories.map(c => [c.id, c.color]))

    const filteredProducts = products // already filtered server-side

    const sortOptions = [
      { label: 'Newest', value: 'createdAt' },
      { label: 'Name', value: 'name' },
      { label: 'SKU', value: 'sku' },
      { label: 'Brand', value: 'brand' },
      { label: 'Category', value: 'categoryId' },
      { label: 'Selling Price', value: 'pricing.sellingPrice' },
      { label: 'MRP', value: 'pricing.mrp' },
      { label: 'Dealer Price', value: 'pricing.dealerPrice' },
      { label: 'Cost Price', value: 'pricing.costPrice' },
      { label: 'Thickness (mm)', value: 'specs.thicknessMm' },
      { label: 'Wear Layer (mm)', value: 'specs.wearLayerMm' },
      { label: 'Janka', value: 'specs.janka' }
    ]

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[280px]"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {flatCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${'— '.repeat(c.depth)}${c.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={`${productSortBy}__${productSortDir}`} onValueChange={(v) => {
              const [by, dir] = v.split('__')
              setProductSortBy(by)
              setProductSortDir(dir)
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(opt => (
                  <SelectItem key={`${opt.value}__desc`} value={`${opt.value}__desc`}>{opt.label} (desc)</SelectItem>
                ))}
                {sortOptions.map(opt => (
                  <SelectItem key={`${opt.value}__asc`} value={`${opt.value}__asc`}>{opt.label} (asc)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportProducts}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen({ type: 'import_products', data: null })}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            <Button onClick={() => setDialogOpen({ type: 'product', data: null })}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <motion.div key={product.id} whileHover={{ y: -2 }}>
                <Card className="overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 ${categoryColorById.get(product.categoryId) || categoryColorById.get(product.category) || 'bg-slate-100 text-slate-700'}`}>
                      {categoryLabelById.get(product.categoryId) || categoryLabelById.get(product.category) || product.category || 'Category'}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                        <p className="text-sm text-slate-500">{product.brand}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{product.sku}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div>
                        <p className="text-lg font-bold text-emerald-600">₹{product.pricing?.sellingPrice}/sqft</p>
                        <p className="text-xs text-slate-400">{product.pricing?.sqftPerBox} sqft/box</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_product', data: product })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'product', data: product })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Add flooring products to your catalog to start creating quotes."
            action={() => setDialogOpen({ type: 'product', data: null })}
            actionLabel="Add Product"
          />
        )}
      </div>
    )
  }

  // Projects Tab
  const renderProjects = () => {
    const filteredProjects = projects.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[280px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(ProjectStatus).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen({ type: 'project', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>

        {/* Projects Table */}
        {filteredProjects.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Customer</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Area</TableHeader>
                    <TableHeader>Value</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProjects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{project.projectNumber}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{project.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{project.customerName || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{project.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{project.totalArea || 0} sqft</p>
                        <p className="text-xs text-slate-500">{project.roomCount || 0} rooms</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-emerald-600">₹{(project.estimatedValue || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ProjectStatus[project.status]?.color}>
                          {ProjectStatus[project.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedProject(project)
                            setActiveTab('measurements')
                          }}>
                            <Ruler className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'project', data: project })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={Building2}
            title="No projects found"
            description="Create a project to start managing flooring installations."
            action={() => setDialogOpen({ type: 'project', data: null })}
            actionLabel="Create Project"
          />
        )}
      </div>
    )
  }

  // Quotes Tab
  const renderQuotes = () => {
    const filteredQuotes = quotes.filter(q => {
      const matchesSearch = !searchTerm || 
        q.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter
      return matchesSearch && matchesStatus
    })

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[280px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(QuoteStatus).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen({ type: 'quote', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Create Quote
          </Button>
        </div>

        {/* Quotes Grid */}
        {filteredQuotes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuotes.map(quote => (
              <motion.div key={quote.id} whileHover={{ y: -2 }}>
                <Card className="overflow-hidden hover:shadow-lg transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{quote.quoteNumber}</h3>
                          {quote.version > 1 && <Badge variant="outline" className="text-xs">v{quote.version}</Badge>}
                        </div>
                        <p className="text-sm text-slate-500">{quote.customer?.name || 'No customer'}</p>
                      </div>
                      <Badge className={QuoteStatus[quote.status]?.color}>{QuoteStatus[quote.status]?.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Square className="h-4 w-4" />
                        {quote.totalArea?.toFixed(0) || 0} sqft
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Home className="h-4 w-4" />
                        {quote.rooms?.length || 0} rooms
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">₹{(quote.grandTotal || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">
                          Valid until: {new Date(quote.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_quote', data: quote })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {quote.status === 'draft' && (
                          <Button variant="ghost" size="sm" onClick={() => handleQuoteAction(quote.id, 'send')}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {quote.status === 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => handleQuoteAction(quote.id, 'create_invoice')}>
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'quote', data: quote })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No quotes found"
            description="Create a quote to send to your customers."
            action={() => setDialogOpen({ type: 'quote', data: null })}
            actionLabel="Create Quote"
          />
        )}
      </div>
    )
  }

  // Invoices Tab
  const renderInvoices = () => {
    const summary = invoices.reduce((acc, inv) => {
      acc.total += inv.grandTotal || 0
      acc.paid += inv.paidAmount || 0
      acc.pending += inv.balanceAmount || 0
      if (new Date(inv.dueDate) < new Date() && inv.status !== 'paid') acc.overdue++
      return acc
    }, { total: 0, paid: 0, pending: 0, overdue: 0 })

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Invoiced</p>
            <p className="text-2xl font-bold">₹{summary.total.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Collected</p>
            <p className="text-2xl font-bold text-emerald-600">₹{summary.paid.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">₹{summary.pending.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[280px]"
              />
            </div>
          </div>
          <Button onClick={() => setDialogOpen({ type: 'invoice', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
        </div>

        {/* Invoices Table */}
        {invoices.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <TableHeader>Invoice</TableHeader>
                    <TableHeader>Customer</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Paid</TableHeader>
                    <TableHeader>Balance</TableHeader>
                    <TableHeader>Due Date</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map(invoice => {
                    const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'
                    return (
                      <tr key={invoice.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                          {invoice.quoteNumber && <p className="text-xs text-slate-500">From: {invoice.quoteNumber}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{invoice.customer?.name || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">₹{(invoice.grandTotal || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-emerald-600">₹{(invoice.paidAmount || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className={invoice.balanceAmount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                            ₹{(invoice.balanceAmount || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={InvoiceStatus[invoice.status]?.color || InvoiceStatus.draft.color}>
                            {InvoiceStatus[invoice.status]?.label || invoice.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_invoice', data: invoice })}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'draft' && (
                              <Button variant="ghost" size="sm" onClick={() => handleInvoiceAction(invoice.id, 'send')}>
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'record_payment', data: invoice })}>
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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
            title="No invoices found"
            description="Invoices are created from approved quotes."
          />
        )}
      </div>
    )
  }

  // Installations Tab
  const renderInstallations = () => {
    const summary = installations.reduce((acc, inst) => {
      acc[inst.status] = (acc[inst.status] || 0) + 1
      if (inst.status === 'completed') acc.completedArea += inst.totalArea || 0
      return acc
    }, { completedArea: 0 })

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.scheduled || 0}</p>
            <p className="text-xs text-slate-500">Scheduled</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.in_progress || 0}</p>
            <p className="text-xs text-slate-500">In Progress</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{summary.on_hold || 0}</p>
            <p className="text-xs text-slate-500">On Hold</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary.completed || 0}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{summary.completedArea?.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Sqft Installed</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search installations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[280px]"
              />
            </div>
          </div>
          <Button onClick={() => setDialogOpen({ type: 'installation', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Schedule Installation
          </Button>
        </div>

        {/* Installations Grid */}
        {installations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installations.map(inst => (
              <Card key={inst.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">{inst.customer?.name || 'Customer'}</p>
                      <p className="text-sm text-slate-500 line-clamp-1">{inst.site?.address || 'Site'}</p>
                    </div>
                    <Badge className={InstallationStatus[inst.status]?.color}>
                      {InstallationStatus[inst.status]?.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(inst.scheduledDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Square className="h-4 w-4" />
                      {inst.totalArea || 0} sqft
                    </div>
                  </div>

                  {inst.status === 'in_progress' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{inst.progress || 0}%</span>
                      </div>
                      <Progress value={inst.progress || 0} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <p className="text-xs text-slate-500">
                      {inst.team?.length || 0} team members
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_installation', data: inst })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {inst.status === 'scheduled' && (
                        <Button variant="ghost" size="sm" onClick={() => handleInstallationAction(inst.id, 'start')}>
                          <Zap className="h-4 w-4 text-amber-500" />
                        </Button>
                      )}
                      {inst.status === 'in_progress' && (
                        <Button variant="ghost" size="sm" onClick={() => handleInstallationAction(inst.id, 'complete')}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wrench}
            title="No installations scheduled"
            description="Schedule installations from approved quotes."
          />
        )}
      </div>
    )
  }

  // Inventory Tab
  const renderInventory = () => {
    const { inventory: items, summary = {}, byCategory = {} } = inventory

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Products</p>
            <p className="text-2xl font-bold">{summary.totalProducts || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Quantity</p>
            <p className="text-2xl font-bold">{(summary.totalQuantity || 0).toLocaleString()} sqft</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Value</p>
            <p className="text-2xl font-bold">₹{(summary.totalValue || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Low Stock</p>
            <p className="text-2xl font-bold text-amber-600">{summary.lowStockCount || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">{summary.outOfStockCount || 0}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[280px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDialogOpen({ type: 'import_inventory', data: null })}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            <Button onClick={() => setDialogOpen({ type: 'goods_receipt', data: null })}>
              <Plus className="h-4 w-4 mr-2" /> Goods Receipt
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        {items.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>SKU</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>In Stock</TableHeader>
                    <TableHeader>Reserved</TableHeader>
                    <TableHeader>Available</TableHeader>
                    <TableHeader>Avg Cost</TableHeader>
                    <TableHeader>Value</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map(item => {
                    const isLow = item.availableQty <= (item.reorderLevel || 100)
                    const isOut = item.availableQty <= 0
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 ${isOut ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.product?.name || 'Product'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{item.product?.sku || '-'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={FlooringCategories[item.product?.category]?.color || 'bg-slate-100'}>
                            {FlooringCategories[item.product?.category]?.label || item.product?.category || '-'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{(item.quantity || 0).toLocaleString()} sqft</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-500">{(item.reservedQty || 0).toLocaleString()} sqft</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-medium ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {(item.availableQty || 0).toLocaleString()} sqft
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p>₹{(item.avgCostPrice || 0).toFixed(2)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">₹{((item.quantity || 0) * (item.avgCostPrice || 0)).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          {isOut ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-700">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700">In Stock</Badge>
                          )}
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
            icon={Warehouse}
            title="No inventory records"
            description="Add inventory by receiving goods or importing data."
            action={() => setDialogOpen({ type: 'goods_receipt', data: null })}
            actionLabel="Add Goods Receipt"
          />
        )}
      </div>
    )
  }

  // Reports Tab
  const renderReports = () => {
    const summaryReport = reports.summary || {}
    const [reportPeriod, setReportPeriod] = useState('30')
    const [selectedReportType, setSelectedReportType] = useState('summary')

    const reportTypes = [
      { id: 'summary', name: 'Executive Summary', icon: LayoutDashboard },
      { id: 'sales', name: 'Sales Report', icon: TrendingUp },
      { id: 'quotes', name: 'Quotes Analysis', icon: FileText },
      { id: 'invoices', name: 'Invoice Report', icon: Receipt },
      { id: 'payments', name: 'Payment Collection', icon: CreditCard },
      { id: 'inventory', name: 'Inventory Report', icon: Warehouse },
      { id: 'products', name: 'Product Performance', icon: Package },
      { id: 'customers', name: 'Customer Analysis', icon: Users },
      { id: 'installations', name: 'Installation Report', icon: Wrench },
      { id: 'pipeline', name: 'Sales Pipeline', icon: Target },
      { id: 'conversion', name: 'Conversion Funnel', icon: BarChart3 },
      { id: 'revenue', name: 'Revenue Analysis', icon: DollarSign },
      { id: 'aging', name: 'Receivables Aging', icon: Clock },
      { id: 'profitability', name: 'Profitability Report', icon: TrendingUp },
      { id: 'team', name: 'Team Performance', icon: Users },
      { id: 'forecast', name: 'Sales Forecast', icon: Target },
      { id: 'comparison', name: 'Period Comparison', icon: BarChart3 },
      { id: 'tax', name: 'GST Report', icon: FileSpreadsheet },
      { id: 'stock', name: 'Stock Movement', icon: Box },
      { id: 'wastage', name: 'Wastage Report', icon: AlertTriangle }
    ]

    return (
      <div className="space-y-6">
        {/* Report Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={reportPeriod} onValueChange={(v) => { setReportPeriod(v); fetchReports(selectedReportType) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Report Types Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Report Types</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[600px]">
                <div className="space-y-1">
                  {reportTypes.map(report => (
                    <button
                      key={report.id}
                      onClick={() => { setSelectedReportType(report.id); fetchReports(report.id) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        selectedReportType === report.id 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <report.icon className="h-4 w-4" />
                      {report.name}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Report Content */}
          <div className="lg:col-span-3 space-y-4">
            {selectedReportType === 'summary' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-600">₹{(dashboardData?.overview?.collectedAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">+12% from last period</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-slate-500">Quotes Sent</p>
                    <p className="text-2xl font-bold">{dashboardData?.overview?.totalQuotes || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">₹{(dashboardData?.overview?.totalQuoteValue || 0).toLocaleString()} value</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-slate-500">Conversion Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardData?.overview?.conversionRate || 0}%</p>
                    <p className="text-xs text-slate-400 mt-1">{dashboardData?.overview?.approvedQuotes || 0} approved</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-slate-500">Pending Collection</p>
                    <p className="text-2xl font-bold text-amber-600">₹{(dashboardData?.overview?.pendingAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">{invoices.filter(i => i.status !== 'paid').length} invoices</p>
                  </Card>
                </div>

                {/* Charts placeholder */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Revenue Trend</h3>
                    <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Chart visualization</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Quote Status Distribution</h3>
                    <div className="h-48 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <PieChart className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Chart visualization</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Top Products */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Top Products by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Category</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Qty Sold</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {products.slice(0, 5).map((product, i) => (
                          <tr key={product.id || i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{product.name}</td>
                            <td className="px-4 py-3">
                              <Badge className={FlooringCategories[product.category]?.color || 'bg-slate-100'}>
                                {FlooringCategories[product.category]?.label || product.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">{Math.floor(Math.random() * 500 + 100)} sqft</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              ₹{Math.floor(Math.random() * 100000 + 20000).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}

            {selectedReportType !== 'summary' && (
              <Card className="p-8">
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
                    {(() => {
                      const ReportIcon = reportTypes.find(r => r.id === selectedReportType)?.icon || BarChart3
                      return <ReportIcon className="h-8 w-8 text-slate-400" />
                    })()}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {reportTypes.find(r => r.id === selectedReportType)?.name}
                  </h3>
                  <p className="text-slate-500 mb-4">Report data is being calculated...</p>
                  <Button onClick={() => fetchReports(selectedReportType)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Generate Report
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Settings Tab
  const renderSettings = () => {
    const [settingsTab, setSettingsTab] = useState('general')
    const [whatsappConfig, setWhatsappConfig] = useState({
      provider: moduleSettings?.whatsapp?.provider || '',
      apiKey: moduleSettings?.whatsapp?.apiKey || '',
      apiSecret: moduleSettings?.whatsapp?.apiSecret || '',
      phoneNumberId: moduleSettings?.whatsapp?.phoneNumberId || '',
      webhookUrl: moduleSettings?.whatsapp?.webhookUrl || '',
      enabled: moduleSettings?.whatsapp?.enabled || false
    })
    const [generalSettings, setGeneralSettings] = useState({
      companyName: moduleSettings?.companyName || client?.name || '',
      gstin: moduleSettings?.gstin || '',
      defaultTaxRate: moduleSettings?.defaultTaxRate || 18,
      quoteValidityDays: moduleSettings?.quoteValidityDays || 30,
      invoicePrefix: moduleSettings?.invoicePrefix || 'INV',
      quotePrefix: moduleSettings?.quotePrefix || 'FLQ',
      defaultPaymentTerms: moduleSettings?.defaultPaymentTerms || 'Net 30',
      laborRatePerSqft: moduleSettings?.laborRatePerSqft || 25,
      defaultWastagePercent: moduleSettings?.defaultWastagePercent || 10
    })
    const [bankDetails, setBankDetails] = useState({
      bankName: moduleSettings?.bankDetails?.bankName || '',
      accountName: moduleSettings?.bankDetails?.accountName || '',
      accountNumber: moduleSettings?.bankDetails?.accountNumber || '',
      ifscCode: moduleSettings?.bankDetails?.ifscCode || '',
      upiId: moduleSettings?.bankDetails?.upiId || ''
    })
    const [savingSettings, setSavingSettings] = useState(false)

    const saveSettings = async () => {
      try {
        setSavingSettings(true)
        const res = await fetch('/api/flooring/enhanced/settings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            general: generalSettings,
            whatsapp: whatsappConfig,
            bankDetails
          })
        })
        if (res.ok) {
          toast.success('Settings saved successfully')
          fetchModuleSettings()
        } else {
          toast.error('Failed to save settings')
        }
      } catch (error) {
        toast.error('Error saving settings')
      } finally {
        setSavingSettings(false)
      }
    }

    const testWhatsAppConnection = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/flooring/enhanced/whatsapp/test', {
          method: 'POST',
          headers,
          body: JSON.stringify(whatsappConfig)
        })
        const data = await res.json()
        if (data.success) {
          toast.success('WhatsApp connection successful!')
        } else {
          toast.error(data.error || 'Connection failed')
        }
      } catch (error) {
        toast.error('Failed to test connection')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="space-y-6">
        <Tabs value={settingsTab} onValueChange={setSettingsTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp Integration</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="sync">CRM Sync</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure your flooring module defaults</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={generalSettings.companyName} onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>GSTIN</Label>
                      <Input value={generalSettings.gstin} onChange={(e) => setGeneralSettings({ ...generalSettings, gstin: e.target.value })} placeholder="e.g., 29XXXXX1234X1ZX" />
                    </div>
                  </div>
                  <Separator />
                  <h4 className="font-medium">Defaults</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Default Tax Rate (%)</Label>
                      <Input type="number" value={generalSettings.defaultTaxRate} onChange={(e) => setGeneralSettings({ ...generalSettings, defaultTaxRate: parseInt(e.target.value) || 18 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quote Validity (days)</Label>
                      <Input type="number" value={generalSettings.quoteValidityDays} onChange={(e) => setGeneralSettings({ ...generalSettings, quoteValidityDays: parseInt(e.target.value) || 30 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Payment Terms</Label>
                      <Select value={generalSettings.defaultPaymentTerms} onValueChange={(v) => setGeneralSettings({ ...generalSettings, defaultPaymentTerms: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 45">Net 45</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Labor Rate (₹/sqft)</Label>
                      <Input type="number" value={generalSettings.laborRatePerSqft} onChange={(e) => setGeneralSettings({ ...generalSettings, laborRatePerSqft: parseFloat(e.target.value) || 25 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Wastage (%)</Label>
                      <Input type="number" value={generalSettings.defaultWastagePercent} onChange={(e) => setGeneralSettings({ ...generalSettings, defaultWastagePercent: parseFloat(e.target.value) || 10 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quote Prefix</Label>
                      <Input value={generalSettings.quotePrefix} onChange={(e) => setGeneralSettings({ ...generalSettings, quotePrefix: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* WhatsApp Integration */}
            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    WhatsApp Business Integration
                  </CardTitle>
                  <CardDescription>Connect your WhatsApp Business API to send quotes and invoices directly to customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${whatsappConfig.enabled ? 'bg-green-100' : 'bg-slate-200'}`}>
                        <MessageSquare className={`h-5 w-5 ${whatsappConfig.enabled ? 'text-green-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium">WhatsApp Integration</p>
                        <p className="text-sm text-slate-500">{whatsappConfig.enabled ? 'Connected & Active' : 'Not configured'}</p>
                      </div>
                    </div>
                    <Switch checked={whatsappConfig.enabled} onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, enabled: v })} />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>WhatsApp Provider</Label>
                      <Select value={whatsappConfig.provider} onValueChange={(v) => setWhatsappConfig({ ...whatsappConfig, provider: v })}>
                        <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interakt">Interakt</SelectItem>
                          <SelectItem value="wati">WATI</SelectItem>
                          <SelectItem value="gupshup">Gupshup</SelectItem>
                          <SelectItem value="meta">Meta Cloud API (Direct)</SelectItem>
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="custom">Custom API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {whatsappConfig.provider && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>API Key / Access Token</Label>
                            <Input 
                              type="password" 
                              value={whatsappConfig.apiKey} 
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })} 
                              placeholder={whatsappConfig.provider === 'interakt' ? 'Your Interakt API Key' : 'API Key'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>API Secret (if required)</Label>
                            <Input 
                              type="password" 
                              value={whatsappConfig.apiSecret} 
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiSecret: e.target.value })} 
                              placeholder="Secret key (optional)"
                            />
                          </div>
                        </div>

                        {(whatsappConfig.provider === 'meta' || whatsappConfig.provider === 'twilio') && (
                          <div className="space-y-2">
                            <Label>Phone Number ID</Label>
                            <Input 
                              value={whatsappConfig.phoneNumberId} 
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })} 
                              placeholder="Your WhatsApp Phone Number ID"
                            />
                          </div>
                        )}

                        {whatsappConfig.provider === 'custom' && (
                          <div className="space-y-2">
                            <Label>Custom API Endpoint</Label>
                            <Input 
                              value={whatsappConfig.webhookUrl} 
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhookUrl: e.target.value })} 
                              placeholder="https://your-api.com/send-whatsapp"
                            />
                          </div>
                        )}

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">Provider Setup Guide</h4>
                          <div className="text-sm text-blue-700 space-y-1">
                            {whatsappConfig.provider === 'interakt' && (
                              <>
                                <p>1. Login to your Interakt dashboard</p>
                                <p>2. Go to Settings → API Keys</p>
                                <p>3. Copy your API key and paste above</p>
                                <p>4. Ensure your WhatsApp number is verified</p>
                              </>
                            )}
                            {whatsappConfig.provider === 'wati' && (
                              <>
                                <p>1. Login to WATI dashboard</p>
                                <p>2. Navigate to API Settings</p>
                                <p>3. Generate and copy your API token</p>
                              </>
                            )}
                            {whatsappConfig.provider === 'gupshup' && (
                              <>
                                <p>1. Login to Gupshup portal</p>
                                <p>2. Go to WhatsApp → API Access</p>
                                <p>3. Copy your API key</p>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" onClick={testWhatsAppConnection} disabled={!whatsappConfig.apiKey || loading}>
                    {loading ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Bank Details */}
            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                  <CardDescription>These details will appear on your invoices for payment collection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} placeholder="e.g., HDFC Bank" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input value={bankDetails.accountName} onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input value={bankDetails.ifscCode} onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })} placeholder="e.g., HDFC0001234" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>UPI ID (optional)</Label>
                    <Input value={bankDetails.upiId} onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })} placeholder="e.g., business@upi" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save Bank Details'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <CardTitle>Quote & Invoice Templates</CardTitle>
                  <CardDescription>Customize the appearance of your documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'professional', name: 'Professional', desc: 'Clean, modern design' },
                      { id: 'premium', name: 'Premium', desc: 'Detailed with branding' },
                      { id: 'luxury', name: 'Luxury', desc: 'High-end presentation' }
                    ].map(template => (
                      <div key={template.id} className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <div className="aspect-[3/4] bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                          <FileText className="h-12 w-12 text-slate-300" />
                        </div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-slate-500">{template.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CRM Sync */}
            <TabsContent value="sync">
              <Card>
                <CardHeader>
                  <CardTitle>CRM Synchronization</CardTitle>
                  <CardDescription>Manage how data syncs between the Flooring Module and your main CRM</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Auto-sync Customers to CRM Leads</p>
                        <p className="text-sm text-slate-500">New flooring customers will automatically create CRM leads</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Auto-sync Projects to CRM</p>
                        <p className="text-sm text-slate-500">New flooring projects will automatically appear in CRM projects</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Bidirectional Status Sync</p>
                        <p className="text-sm text-slate-500">Status changes sync both ways between module and CRM</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  {/* Manual Sync */}
                  <div>
                    <h4 className="font-medium mb-4">Manual Sync</h4>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => {
                        fetchCrmProjects()
                        toast.success('CRM projects synced')
                      }}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Sync CRM Projects
                      </Button>
                      <Button variant="outline" onClick={() => {
                        fetchCustomers()
                        toast.success('Customers synced')
                      }}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Sync Customers
                      </Button>
                    </div>
                  </div>

                  {/* Sync Status */}
                  <div>
                    <h4 className="font-medium mb-4">Sync Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          <span className="font-medium">Flooring Projects</span>
                        </div>
                        <p className="text-sm text-slate-500">{projects.length} projects in module</p>
                        <p className="text-sm text-slate-500">{projects.filter(p => p.crmProjectId).length} synced to CRM</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          <span className="font-medium">CRM Projects</span>
                        </div>
                        <p className="text-sm text-slate-500">{crmProjects.length} total CRM projects</p>
                        <p className="text-sm text-slate-500">{crmProjects.filter(p => p.modules?.includes('flooring')).length} with flooring module</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    )
  }

  // Measurements Tab (for selected project)
  const renderMeasurements = () => {
    if (!selectedProject) {
      return (
        <EmptyState
          icon={Ruler}
          title="Select a Project"
          description="Choose a project from the Projects tab to manage room measurements."
          action={() => setActiveTab('projects')}
          actionLabel="Go to Projects"
        />
      )
    }

    const rooms = selectedProject.rooms || []

    return (
      <div className="space-y-4">
        {/* Project Info */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProject(null); setActiveTab('projects') }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <h3 className="font-semibold text-lg">{selectedProject.projectNumber}</h3>
                <p className="text-sm text-slate-500">{selectedProject.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{selectedProject.totalArea || 0} sqft</p>
                <p className="text-sm text-slate-500">{rooms.length} rooms</p>
              </div>
              <Button onClick={() => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } })}>
                <Plus className="h-4 w-4 mr-2" /> Add Room
              </Button>
            </div>
          </div>
        </Card>

        {/* Rooms Grid */}
        {rooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <Card key={room.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Home className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{room.roomName}</h3>
                        <p className="text-sm text-slate-500">{RoomTypes[room.roomType] || room.roomType}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{room.floor || 'Ground'}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{room.dimensions?.length}'</p>
                      <p className="text-xs text-slate-500">Length</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{room.dimensions?.width}'</p>
                      <p className="text-xs text-slate-500">Width</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{(room.netArea || 0).toFixed(0)}</p>
                      <p className="text-xs text-slate-500">Sq.ft</p>
                    </div>
                  </div>

                  {room.obstacles?.length > 0 && (
                    <p className="text-xs text-amber-600 mb-2">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {room.obstacles.length} obstacle(s) - {room.obstaclesArea?.toFixed(0) || 0} sqft deducted
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex gap-2 text-xs text-slate-500">
                      <span>{room.doorways || 1} doorway(s)</span>
                      <span>•</span>
                      <span>{room.subfloorType || 'Concrete'}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'room', data: room })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Ruler}
            title="No rooms measured"
            description="Add room measurements for this project."
            action={() => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } })}
            actionLabel="Add Room"
          />
        )}
      </div>
    )
  }

  // =============================================
  // DIALOGS
  // =============================================

  const renderDialogs = () => {
    const { type, data } = dialogOpen

    return (
      <>
        {/* Product Dialog */}
        <FlooringProductDialog
          open={type === 'product'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          product={data}
          schema={productSchema}
          categories={productCategories}
          onSave={handleSaveProduct}
          loading={loading}
        />

        {/* Customer Dialog */}
        <CustomerDialog
          open={type === 'customer'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          customer={data}
          onSave={handleSaveCustomer}
          loading={loading}
        />

        {/* Import Products Dialog */}
        <ImportProductsDialog
          open={type === 'import_products'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          onImport={handleImportProducts}
          loading={loading}
          categories={productCategories}
        />

        {/* Category Manager Dialog */}
        <CategoryManagerDialog
          open={type === 'manage_categories'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          categories={productCategories}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
          loading={loading}
        />

        {/* Project Dialog */}
        <ProjectDialog
          open={type === 'project'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          project={data}
          customers={customers}
          onSave={handleSaveProject}
          loading={loading}
        />

        {/* Record Payment Dialog */}
        <PaymentDialog
          open={type === 'record_payment'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          invoice={data}
          onSave={(paymentData) => handleInvoiceAction(data?.id, 'record_payment', paymentData)}
          loading={loading}
        />

        {/* Goods Receipt Dialog */}
        <GoodsReceiptDialog
          open={type === 'goods_receipt'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          products={products}
          onSave={(receiptData) => handleInventoryAction('goods_receipt', receiptData)}
          loading={loading}
        />
      </>
    )
  }

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flooring Module</h1>
            <p className="text-slate-500">Enterprise-grade flooring business management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')}>
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchTerm(''); setStatusFilter('all') }}>


        <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Projects
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" /> Measurements
            {selectedProject && <Badge variant="secondary" className="ml-1 text-xs">{selectedProject.projectNumber}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Quotes
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="installations" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Installations
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard">{renderDashboard()}</TabsContent>
          <TabsContent value="products">{renderProducts()}</TabsContent>
          <TabsContent value="projects">{renderProjects()}</TabsContent>
          <TabsContent value="measurements">{renderMeasurements()}</TabsContent>
          <TabsContent value="quotes">{renderQuotes()}</TabsContent>
          <TabsContent value="invoices">{renderInvoices()}</TabsContent>
          <TabsContent value="installations">{renderInstallations()}</TabsContent>
          <TabsContent value="inventory">{renderInventory()}</TabsContent>
          <TabsContent value="reports">{renderReports()}</TabsContent>
          <TabsContent value="settings">{renderSettings()}</TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      {renderDialogs()}

      {/* MEE AI Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setDialogOpen({ type: 'mee_ai', data: null })}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl z-50"
      >
        <Bot className="h-6 w-6" />
      </motion.button>

      {/* MEE AI Chat Dialog */}
      <Dialog open={dialogOpen.type === 'mee_ai'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              MEE AI Assistant
            </DialogTitle>
            <DialogDescription className="text-violet-100">
              Your intelligent flooring business assistant
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {meeAiMessages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-violet-300 mx-auto mb-3" />
                  <p className="text-slate-500">Hi! I'm MEE AI, your flooring business assistant.</p>
                  <p className="text-sm text-slate-400 mt-2">Ask me anything about:</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {['Quote calculation', 'Inventory', 'Product recommendations', 'Installation tips'].map(topic => (
                      <button
                        key={topic}
                        onClick={() => setMeeAiInput(topic)}
                        className="px-3 py-1 text-xs bg-violet-100 text-violet-700 rounded-full hover:bg-violet-200"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {meeAiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-violet-500 text-white rounded-br-none' 
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {meeAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-lg rounded-bl-none">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={meeAiInput}
                onChange={(e) => setMeeAiInput(e.target.value)}
                placeholder="Ask MEE AI anything..."
                onKeyPress={(e) => e.key === 'Enter' && handleMeeAiChat()}
                disabled={meeAiLoading}
              />
              <Button onClick={handleMeeAiChat} disabled={meeAiLoading || !meeAiInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================
// DIALOG COMPONENTS
// =============================================

// ProductDialog moved to /components/modules/flooring-products-ui.js (schema-driven)

function CustomerDialog({ open, onClose, customer, onSave, loading }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', gstin: '',
    address: { line1: '', city: '', state: '', pincode: '' },
    type: 'individual', segment: 'retail', notes: ''
  })

  useEffect(() => {
    if (customer) {
      setForm(customer)
    } else {
      setForm({
        name: '', email: '', phone: '', company: '', gstin: '',
        address: { line1: '', city: '', state: '', pincode: '' },
        type: 'individual', segment: 'retail', notes: ''
      })
    }
  }, [customer, open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>Customer will be synced to CRM leads automatically</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address?.line1} onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input value={form.address?.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} placeholder="City" />
            <Input value={form.address?.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} placeholder="State" />
            <Input value={form.address?.pincode} onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })} placeholder="Pincode" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.phone}>
            {loading ? 'Saving...' : (customer ? 'Update' : 'Add')} Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProjectDialog({ open, onClose, project, customers, onSave, loading }) {
  const [form, setForm] = useState({
    name: '', customerId: '', customerName: '', type: 'residential', flooringType: 'hardwood',
    siteAddress: '', siteCity: '', siteState: '', sitePincode: '', estimatedValue: 0, notes: ''
  })

  useEffect(() => {
    if (project) {
      setForm({
        ...project,
        siteAddress: project.site?.address || '',
        siteCity: project.site?.city || '',
        siteState: project.site?.state || '',
        sitePincode: project.site?.pincode || ''
      })
    } else {
      setForm({
        name: '', customerId: '', customerName: '', type: 'residential', flooringType: 'hardwood',
        siteAddress: '', siteCity: '', siteState: '', sitePincode: '', estimatedValue: 0, notes: ''
      })
    }
  }, [project, open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>Project will be synced to CRM automatically</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-generated if empty" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => {
                const cust = customers.find(c => c.id === v)
                setForm({ ...form, customerId: v, customerName: cust?.name || '' })
              }}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="renovation">Renovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Flooring Type</Label>
              <Select value={form.flooringType} onValueChange={(v) => setForm({ ...form, flooringType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FlooringCategories).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Value (₹)</Label>
              <Input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <Separator />
          <h4 className="font-medium">Site Address</h4>
          <div className="space-y-2">
            <Input value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input value={form.siteCity} onChange={(e) => setForm({ ...form, siteCity: e.target.value })} placeholder="City" />
            <Input value={form.siteState} onChange={(e) => setForm({ ...form, siteState: e.target.value })} placeholder="State" />
            <Input value={form.sitePincode} onChange={(e) => setForm({ ...form, sitePincode: e.target.value })} placeholder="Pincode" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.customerId}>
            {loading ? 'Saving...' : (project ? 'Update' : 'Create')} Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentDialog({ open, onClose, invoice, onSave, loading }) {
  const [form, setForm] = useState({
    amount: 0, method: 'bank_transfer', reference: '', receivedDate: new Date().toISOString().split('T')[0], paymentNotes: ''
  })

  useEffect(() => {
    if (invoice) {
      setForm({ ...form, amount: invoice.balanceAmount || 0 })
    }
  }, [invoice, open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Invoice: {invoice?.invoiceNumber} | Balance: ₹{(invoice?.balanceAmount || 0).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Amount (₹) *</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference/Transaction ID</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Transaction reference" />
          </div>
          <div className="space-y-2">
            <Label>Received Date</Label>
            <Input type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.paymentNotes} onChange={(e) => setForm({ ...form, paymentNotes: e.target.value })} placeholder="Payment notes" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.amount || form.amount <= 0}>
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GoodsReceiptDialog({ open, onClose, products, onSave, loading }) {
  const [form, setForm] = useState({
    productId: '', warehouseId: 'main', quantity: 0, batchNo: '', costPrice: 0, notes: ''
  })

  const selectedProduct = products.find(p => p.id === form.productId)

  useEffect(() => {
    if (selectedProduct) {
      setForm(f => ({ ...f, costPrice: selectedProduct.pricing?.costPrice || 0 }))
    }
  }, [form.productId])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Goods Receipt</DialogTitle>
          <DialogDescription>Record incoming inventory stock</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity (sqft) *</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Cost Price (₹/sqft)</Label>
              <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Batch/Lot Number</Label>
            <Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} placeholder="Optional batch number" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Receipt notes" rows={2} />
          </div>
          {form.quantity > 0 && form.costPrice > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Total Value</p>
              <p className="text-xl font-bold text-emerald-600">₹{(form.quantity * form.costPrice).toLocaleString()}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.productId || !form.quantity}>
            {loading ? 'Recording...' : 'Record Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EnterpriseFlooringModule
