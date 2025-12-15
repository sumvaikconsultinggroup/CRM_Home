'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FlooringProductDialog, ImportProductsDialog, CategoryManagerDialog } from '@/components/modules/flooring-products-ui'
import { ViewQuoteDialog as ViewQuoteDialogNew, QuoteEditDialog as QuoteEditDialogNew, QuoteStatusConfig as QuoteStatusConfigShared } from '@/components/modules/flooring/QuoteDialogs'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Package, Ruler, FileText, Wrench, Warehouse, Users,
  Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download, Upload,
  TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, Send,
  AlertTriangle, ArrowUpRight, Calculator, Home, Square, ChevronRight,
  MoreVertical, Copy, Printer, Image, Camera, MapPin, Phone, Mail,
  Calendar, Building2, Layers, Grid3X3, Box, Boxes, Truck, Settings, BarChart3,
  PieChart, Target, Award, Zap, Star, X, FileSpreadsheet, Receipt,
  CreditCard, Banknote, ChevronDown, ArrowLeft, ArrowRight, Sparkles,
  MessageSquare, Bot, ClipboardList, Hammer, ShieldCheck, History, ExternalLink, Tags,
  Lock, Unlock, Info, Bell
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
  converted: { label: 'Converted to Invoice', color: 'bg-green-100 text-green-700' }
}

const InvoiceStatus = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  partially_paid: { label: 'Partial Payment', color: 'bg-amber-100 text-amber-700' },
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

// B2C (Consumer) Project Statuses - Measurement → Quote → Invoice → Installation
const ProjectStatusB2C = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  measurement_scheduled: { label: 'Measurement Scheduled', color: 'bg-blue-100 text-blue-700' },
  measurement_done: { label: 'Measurement Done', color: 'bg-cyan-100 text-cyan-700' },
  quote_pending: { label: 'Quote Pending', color: 'bg-purple-100 text-purple-700' },
  quote_sent: { label: 'Quote Sent', color: 'bg-indigo-100 text-indigo-700' },
  quote_approved: { label: 'Quote Approved', color: 'bg-emerald-100 text-emerald-700' },
  invoice_sent: { label: 'Invoice Sent', color: 'bg-amber-100 text-amber-700' },
  payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-700' },
  installation_scheduled: { label: 'Installation Scheduled', color: 'bg-teal-100 text-teal-700' },
  installation_in_progress: { label: 'Installation In Progress', color: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Project Complete', color: 'bg-green-600 text-white' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

// B2B (Dealer) Project Statuses - Material Requisition → Quote → Invoice
const ProjectStatusB2B = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  material_requisition: { label: 'Material Requisition', color: 'bg-blue-100 text-blue-700' },
  material_processing: { label: 'Processing Order', color: 'bg-cyan-100 text-cyan-700' },
  material_ready: { label: 'Material Ready', color: 'bg-teal-100 text-teal-700' },
  quote_pending: { label: 'Quote Pending', color: 'bg-purple-100 text-purple-700' },
  quote_sent: { label: 'Quote Sent', color: 'bg-indigo-100 text-indigo-700' },
  quote_approved: { label: 'Quote Approved', color: 'bg-emerald-100 text-emerald-700' },
  invoice_sent: { label: 'Invoice Sent', color: 'bg-amber-100 text-amber-700' },
  in_transit: { label: 'In Transit', color: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Project Complete', color: 'bg-green-600 text-white' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
}

// Combined for backward compatibility
const ProjectStatus = {
  ...ProjectStatusB2C,
  ...ProjectStatusB2B
}

// Helper to get status options based on segment
const getProjectStatusBySegment = (segment) => {
  return segment === 'b2b' ? ProjectStatusB2B : ProjectStatusB2C
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
  const [crmContacts, setCrmContacts] = useState([]) // CRM Contacts for customer selection
  const [moduleSettings, setModuleSettings] = useState(null) // Module settings
  const [reports, setReports] = useState({}) // Reports data
  const [meeAiMessages, setMeeAiMessages] = useState([]) // MEE AI chat
  const [meeAiInput, setMeeAiInput] = useState('')
  const [meeAiLoading, setMeeAiLoading] = useState(false)
  
  // Material Requisition State (for B2B workflow)
  const [materialRequisition, setMaterialRequisition] = useState({}) // { productId: { product, quantity, selected } }
  
  // Measurement State (for B2C workflow)
  const [measurementProducts, setMeasurementProducts] = useState({}) // { productId: { product, quantity, selected } }
  const [technicianName, setTechnicianName] = useState('')
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0])
  const [measurementNotes, setMeasurementNotes] = useState('')
  const [materialDecideLater, setMaterialDecideLater] = useState(false) // Skip material selection
  const [productSearchTerm, setProductSearchTerm] = useState('') // Search term for product selection
  
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

  // Fetch CRM Contacts for customer selection
  const fetchCrmContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts', { headers })
      const data = await res.json()
      if (data.contacts) setCrmContacts(data.contacts)
    } catch (error) {
      console.error('CRM Contacts fetch error:', error)
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
    fetchCrmContacts()
  }, [fetchDashboard, fetchProductSchema, fetchProductCategories, fetchProducts, fetchProjects, fetchCustomers, fetchCrmProjects, fetchCrmContacts, refreshKey])

  useEffect(() => {
    if (activeTab === 'quotes') fetchQuotes()
    if (activeTab === 'invoices') fetchInvoices()
    if (activeTab === 'installations') fetchInstallations()
    if (activeTab === 'inventory') fetchInventory()
    if (activeTab === 'settings') fetchModuleSettings()
    if (activeTab === 'reports') fetchReports('summary')
  }, [activeTab, fetchQuotes, fetchInvoices, fetchInstallations, fetchInventory, fetchModuleSettings, fetchReports])

  // Initialize measurement state when project changes (for B2C workflow)
  useEffect(() => {
    if (selectedProject && selectedProject.segment !== 'b2b') {
      const measurementDetails = selectedProject.measurementDetails || {}
      setMeasurementProducts(measurementDetails.selectedProducts || {})
      setTechnicianName(measurementDetails.technicianName || '')
      setMeasurementDate(measurementDetails.measurementDate || new Date().toISOString().split('T')[0])
      setMeasurementNotes(measurementDetails.notes || '')
    }
  }, [selectedProject?.id, selectedProject?.measurementDetails])

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
      const details = r?.errors?.length ? ` (skipped: ${r.skipped || 0})` : ''
      toast.success(`Import complete: ${r?.created || 0} created, ${r?.updated || 0} updated, ${r?.failed || 0} failed${details}`)

      if (r?.errors?.length) {
        console.warn('Import errors:', r.errors)
      }

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

  // Handle Save Room Measurement
  const handleSaveRoom = async (roomData) => {
    try {
      setLoading(true)
      
      // Calculate areas
      const grossArea = (parseFloat(roomData.length) || 0) * (parseFloat(roomData.width) || 0)
      const obstaclesArea = (roomData.obstacles || []).reduce((sum, obs) => {
        return sum + ((parseFloat(obs.length) || 0) * (parseFloat(obs.width) || 0))
      }, 0)
      const netArea = grossArea - obstaclesArea
      
      // Prepare room data with all fields
      const room = {
        ...roomData,
        projectId: selectedProject.id,
        applicationType: roomData.applicationType || 'flooring',
        dimensions: {
          length: parseFloat(roomData.length) || 0,
          width: parseFloat(roomData.width) || 0,
          height: parseFloat(roomData.height) || 10
        },
        grossArea,
        obstaclesArea,
        netArea,
        wastagePercentage: roomData.wastagePercentage || 10,
        totalAreaWithWastage: netArea * (1 + (roomData.wastagePercentage || 10) / 100),
        roomSketch: roomData.roomSketch || null,
        subfloorType: roomData.subfloorType || 'concrete',
        subfloorCondition: roomData.subfloorCondition || 'good',
        specialInstructions: roomData.specialInstructions || ''
      }
      
      // Update project with room data
      const updatedRooms = [...(selectedProject.rooms || [])]
      const existingIndex = updatedRooms.findIndex(r => r.id === roomData.id)
      
      if (existingIndex >= 0) {
        updatedRooms[existingIndex] = { ...updatedRooms[existingIndex], ...room }
      } else {
        room.id = `room-${Date.now()}`
        room.createdAt = new Date().toISOString()
        updatedRooms.push(room)
      }
      
      // Calculate total area
      const totalArea = updatedRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)
      const roomCount = updatedRooms.length
      
      // Save to project
      const res = await fetch('/api/flooring/enhanced/projects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: selectedProject.id,
          rooms: updatedRooms,
          totalArea,
          roomCount
        })
      })
      
      if (res.ok) {
        toast.success(roomData.id ? 'Room updated' : 'Room added successfully')
        
        // Update selected project locally
        setSelectedProject(prev => ({
          ...prev,
          rooms: updatedRooms,
          totalArea,
          roomCount
        }))
        
        fetchProjects()
        setDialogOpen({ type: null, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save room')
      }
    } catch (error) {
      console.error('Save room error:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle Delete Room
  const handleDeleteRoom = async (roomId) => {
    try {
      setLoading(true)
      
      const updatedRooms = (selectedProject.rooms || []).filter(r => r.id !== roomId)
      const totalArea = updatedRooms.reduce((sum, r) => sum + (r.netArea || 0), 0)
      const roomCount = updatedRooms.length
      
      const res = await fetch('/api/flooring/enhanced/projects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: selectedProject.id,
          rooms: updatedRooms,
          totalArea,
          roomCount
        })
      })
      
      if (res.ok) {
        toast.success('Room deleted')
        setSelectedProject(prev => ({ ...prev, rooms: updatedRooms, totalArea, roomCount }))
        fetchProjects()
      }
    } catch (error) {
      toast.error('Failed to delete room')
    } finally {
      setLoading(false)
    }
  }

  // Handle Project Status Update
  const handleUpdateProjectStatus = async (projectId, newStatus) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/projects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          id: projectId, 
          action: 'update_status', 
          status: newStatus,
          statusNotes: `Status changed to ${newStatus}`
        })
      })
      
      if (res.ok) {
        toast.success(`Project status updated to ${ProjectStatus[newStatus]?.label || newStatus}`)
        fetchProjects()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update status')
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
      
      // Check if this is a "Save as Draft" action
      const isSavingAsDraft = quoteData.savedAsDraft === true
      
      // If saving as draft, force status to 'draft' regardless of current status
      if (isSavingAsDraft) {
        quoteData.status = 'draft'
        delete quoteData.savedAsDraft // Remove flag before sending to API
      }
      // If editing a rejected quote (not saving as draft), change status to 'revised'
      else if (quoteData.id && quoteData.status === 'rejected') {
        quoteData.status = 'revised'
        quoteData.revisionNote = 'Quote revised after rejection'
      }
      
      const res = await fetch('/api/flooring/enhanced/quotes', {
        method,
        headers,
        body: JSON.stringify(quoteData)
      })
      
      if (res.ok) {
        let successMessage
        if (isSavingAsDraft) {
          successMessage = 'Quote saved as draft'
        } else if (quoteData.status === 'revised') {
          successMessage = 'Quote revised! You can now send it for approval again.'
        } else {
          successMessage = quoteData.id ? 'Quote updated' : 'Quote created'
        }
        toast.success(successMessage)
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
        await fetchQuotes() // Await the fetch
        if (action === 'create_invoice') await fetchInvoices()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Action failed')
      }
    } catch (error) {
      console.error('Quote action error:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Top-level Quote Status Change handler
  const handleQuoteStatusChange = async (quoteId, newStatus, note = '') => {
    try {
      setLoading(true)
      
      // Map status to API action
      const actionMap = {
        'approved': 'approve',
        'rejected': 'reject',
        'revised': 'revise',
        'sent': 'send'
      }
      
      const action = actionMap[newStatus]
      const body = action 
        ? { id: quoteId, action, reason: note, notes: note }
        : { id: quoteId, status: newStatus, statusNote: note, statusChangedAt: new Date().toISOString() }
      
      const res = await fetch('/api/flooring/enhanced/quotes', {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        await fetchQuotes()
        setDialogOpen({ type: null, data: null })
        const statusMessages = {
          'approved': 'Quote approved successfully!',
          'rejected': 'Quote rejected',
          'revised': 'Quote marked for revision',
          'sent': 'Quote sent to customer',
          'invoiced': 'Quote converted to invoice'
        }
        toast.success(statusMessages[newStatus] || `Quote status updated to ${newStatus}`)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update quote')
      }
    } catch (error) {
      console.error('Quote status change error:', error)
      toast.error('Failed to update quote status')
    } finally {
      setLoading(false)
    }
  }

  // Top-level Create Invoice from Quote
  const handleCreateInvoiceFromQuote = async (quote) => {
    try {
      setLoading(true)
      const invoiceData = {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        projectId: quote.projectId,
        projectNumber: quote.projectNumber,
        customer: quote.customer,
        site: quote.site,
        items: quote.items,
        subtotal: quote.subtotal,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountAmount: quote.discountAmount,
        taxableAmount: quote.taxableAmount,
        cgstRate: quote.cgstRate,
        cgstAmount: quote.cgstAmount,
        sgstRate: quote.sgstRate,
        sgstAmount: quote.sgstAmount,
        igstRate: quote.igstRate,
        igstAmount: quote.igstAmount,
        totalTax: quote.totalTax,
        grandTotal: quote.grandTotal,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Invoice generated from Quote ${quote.quoteNumber}`
      }

      const res = await fetch('/api/flooring/enhanced/invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify(invoiceData)
      })

      if (res.ok) {
        // Update quote status to invoiced
        await handleQuoteStatusChange(quote.id, 'invoiced')
        
        // Update project status if exists
        if (quote.projectId) {
          await handleUpdateProjectStatus(quote.projectId, 'invoice_sent')
        }
        
        fetchInvoices()
        setDialogOpen({ type: null, data: null })
        setActiveTab('invoices')
        toast.success('Invoice created successfully!')
      } else {
        toast.error('Failed to create invoice')
      }
    } catch (error) {
      toast.error('Error creating invoice')
    } finally {
      setLoading(false)
    }
  }

  // =============================================
  // VALIDATION HELPER FUNCTIONS
  // =============================================
  
  // Email validation
  const isValidEmail = (email) => {
    if (!email) return true // Optional field
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email.trim())
  }
  
  // Phone validation (max 10 digits for Indian numbers)
  const isValidPhone = (phone) => {
    if (!phone) return true // Optional field
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
    return /^[6-9]\d{9}$/.test(cleanPhone) || /^\+91[6-9]\d{9}$/.test(cleanPhone)
  }
  
  // Date validation (no backdates allowed for measurements)
  const isValidMeasurementDate = (date) => {
    if (!date) return false
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selectedDate >= today
  }
  
  // GST validation
  const isValidGSTIN = (gstin) => {
    if (!gstin) return true // Optional
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstRegex.test(gstin.toUpperCase())
  }
  
  // Pincode validation
  const isValidPincode = (pincode) => {
    if (!pincode) return true // Optional
    return /^[1-9][0-9]{5}$/.test(pincode)
  }

  // Top-level Download Quote (for dialogs) - PROFESSIONAL TEMPLATE
  const handleDownloadQuote = (quote, options = {}) => {
    const isB2C = quote.segment === 'b2c' || quote.projectSegment === 'b2c'
    const companyName = moduleSettings?.companyName || client?.name || 'FloorCraft Pro'
    const companyAddress = moduleSettings?.address || client?.address || ''
    const companyGSTIN = moduleSettings?.gstin || ''
    const companyPhone = moduleSettings?.phone || client?.phone || ''
    const companyEmail = moduleSettings?.email || client?.email || ''
    const companyLogo = moduleSettings?.logo || ''
    
    const QuoteStatusConfigLocal = {
      draft: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
      sent: { label: 'Sent', color: '#2563eb', bg: '#dbeafe' },
      approved: { label: 'Approved', color: '#059669', bg: '#d1fae5' },
      rejected: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
      revised: { label: 'Needs Revision', color: '#d97706', bg: '#fef3c7' },
      invoiced: { label: 'Invoiced', color: '#7c3aed', bg: '#ede9fe' },
      converted: { label: 'Converted to Invoice', color: '#16a34a', bg: '#dcfce7' },
      expired: { label: 'Expired', color: '#6b7280', bg: '#f3f4f6' }
    }
    
    const statusConfig = QuoteStatusConfigLocal[quote.status] || QuoteStatusConfigLocal.draft
    
    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      }).format(amount || 0)
    }
    
    // Number to words for Indian numbering
    const numberToWords = (num) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
      
      if (num === 0) return 'Zero'
      if (num < 20) return ones[num]
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
      if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
      if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
      return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
    }
    
    const grandTotalWords = numberToWords(Math.round(quote.grandTotal || 0)) + ' Rupees Only'
    
    // Generate measurement details section for B2C
    const measurementSection = isB2C && quote.rooms?.length > 0 ? `
      <div class="section measurement-section">
        <h3 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 15px;">
          📐 Measurement Details
        </h3>
        <table class="measurement-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Dimensions (L x W)</th>
              <th>Area (Sq.ft)</th>
              <th>Application</th>
              <th>Floor</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.rooms || []).map(room => `
              <tr>
                <td><strong>${room.roomName || 'Room'}</strong></td>
                <td>${room.dimensions?.length || 0}' x ${room.dimensions?.width || 0}'</td>
                <td>${(room.netArea || 0).toFixed(0)}</td>
                <td>${room.applicationType || 'Flooring'}</td>
                <td>${room.floor || 'Ground'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${quote.technicianName ? `
        <div style="margin-top: 15px; padding: 10px; background: #f0fdfa; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px;"><strong>Measured By:</strong> ${quote.technicianName}</p>
          ${quote.measurementDate ? `<p style="margin: 5px 0 0 0; font-size: 12px;"><strong>Date:</strong> ${new Date(quote.measurementDate).toLocaleDateString()}</p>` : ''}
        </div>
        ` : ''}
      </div>
    ` : ''
    
    const quoteHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quote.quoteNumber}</title>
        <style>
          @page { margin: 20mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 0; 
            margin: 0;
            max-width: 800px; 
            margin: 0 auto; 
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            position: relative;
          }
          
          /* Watermark Logo */
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.05;
            font-size: 120px;
            font-weight: bold;
            color: #1e40af;
            z-index: -1;
            pointer-events: none;
            white-space: nowrap;
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px 0;
            border-bottom: 3px solid #0d9488;
            margin-bottom: 20px;
          }
          .company-info {
            max-width: 50%;
          }
          .company-name {
            font-size: 26px;
            font-weight: 700;
            color: #0d9488;
            margin-bottom: 5px;
          }
          .company-tagline {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .company-details {
            font-size: 11px;
            color: #64748b;
            line-height: 1.6;
          }
          .quote-header-right {
            text-align: right;
          }
          .quote-title {
            font-size: 32px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: 2px;
          }
          .quote-number {
            font-size: 14px;
            color: #64748b;
            margin: 5px 0;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: ${statusConfig.bg};
            color: ${statusConfig.color};
          }
          
          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          .info-box {
            background: #f8fafc;
            padding: 16px;
            border-radius: 10px;
            border-left: 4px solid #0d9488;
          }
          .info-box-title {
            font-size: 11px;
            font-weight: 700;
            color: #0d9488;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
          }
          .info-label {
            font-size: 11px;
            color: #64748b;
          }
          .info-value {
            font-size: 12px;
            font-weight: 500;
            color: #1e293b;
          }
          .customer-name {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 8px;
          }
          
          /* Items Table */
          .items-section {
            margin: 25px 0;
          }
          .items-section h3 {
            color: #0d9488;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 8px;
            margin-bottom: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #0d9488;
            color: white;
            padding: 12px 10px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          th:first-child { border-radius: 8px 0 0 0; }
          th:last-child { border-radius: 0 8px 0 0; text-align: right; }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #f1f5f9; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .item-name { font-weight: 600; color: #0f172a; }
          .item-sku { font-size: 10px; color: #94a3b8; }
          
          /* Measurement Table */
          .measurement-section { margin: 25px 0; }
          .measurement-table th { background: #0d9488; }
          .measurement-table td { font-size: 12px; }
          
          /* Totals */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin: 25px 0;
          }
          .totals-box {
            width: 320px;
            background: #f8fafc;
            border-radius: 10px;
            overflow: hidden;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            border-bottom: 1px solid #e2e8f0;
          }
          .totals-row.discount { color: #059669; }
          .totals-row.grand {
            background: #0d9488;
            color: white;
            font-size: 16px;
            font-weight: 700;
            padding: 14px 16px;
          }
          .totals-label { font-size: 12px; }
          .totals-value { font-weight: 600; }
          
          /* Amount in Words */
          .amount-words {
            background: #fef3c7;
            padding: 12px 16px;
            border-radius: 8px;
            margin: 15px 0;
            font-style: italic;
            font-size: 12px;
            color: #92400e;
          }
          
          /* Terms */
          .terms-section {
            margin: 25px 0;
            padding: 16px;
            background: #f8fafc;
            border-radius: 10px;
          }
          .terms-section h4 {
            color: #0d9488;
            margin: 0 0 12px 0;
            font-size: 13px;
          }
          .terms-list {
            margin: 0;
            padding-left: 20px;
            font-size: 11px;
            color: #64748b;
          }
          .terms-list li { margin: 6px 0; }
          
          /* Notes */
          .notes-section {
            background: #fef3c7;
            padding: 14px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
          }
          .notes-section h4 {
            color: #92400e;
            margin: 0 0 8px 0;
            font-size: 12px;
          }
          .notes-section p {
            margin: 0;
            font-size: 11px;
            color: #78350f;
            white-space: pre-wrap;
          }
          
          /* Bank Details */
          .bank-section {
            margin: 25px 0;
            padding: 16px;
            background: #eff6ff;
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
          }
          .bank-section h4 {
            color: #1e40af;
            margin: 0 0 12px 0;
          }
          .bank-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 12px;
          }
          
          /* Signature */
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 8px;
            margin-top: 50px;
          }
          .signature-label {
            font-size: 11px;
            color: #64748b;
          }
          
          /* Footer */
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 11px;
          }
          .footer-contact {
            margin-top: 10px;
          }
          
          @media print {
            body { padding: 0; }
            .watermark { position: fixed; }
          }
        </style>
      </head>
      <body>
        <!-- Watermark Logo -->
        <div class="watermark">🪵 ${companyName.split(' ')[0]}</div>
        
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <div class="company-name">🪵 ${companyName}</div>
            <div class="company-tagline">Premium Flooring Solutions</div>
            <div class="company-details">
              ${companyAddress ? `<div>${companyAddress}</div>` : ''}
              ${companyGSTIN ? `<div>GSTIN: ${companyGSTIN}</div>` : ''}
              ${companyPhone ? `<div>📞 ${companyPhone}</div>` : ''}
              ${companyEmail ? `<div>✉️ ${companyEmail}</div>` : ''}
            </div>
          </div>
          <div class="quote-header-right">
            <div class="quote-title">QUOTATION</div>
            <div class="quote-number">${quote.quoteNumber}</div>
            <div style="margin-top: 10px;">
              <span class="status-badge">${statusConfig.label}</span>
            </div>
          </div>
        </div>
        
        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-box">
            <div class="info-box-title">📋 Quotation To</div>
            <div class="customer-name">${quote.customer?.name || 'Customer'}</div>
            ${quote.customer?.company ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${quote.customer.company}</div>` : ''}
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">${quote.customer?.email || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone</span>
              <span class="info-value">${quote.customer?.phone || '-'}</span>
            </div>
            ${quote.site?.address ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <div class="info-label">Site Address</div>
              <div class="info-value">${quote.site.address}${quote.site.city ? ', ' + quote.site.city : ''}${quote.site.state ? ', ' + quote.site.state : ''} ${quote.site.pincode || ''}</div>
            </div>
            ` : ''}
          </div>
          <div class="info-box">
            <div class="info-box-title">📄 Quote Details</div>
            <div class="info-row">
              <span class="info-label">Quote No.</span>
              <span class="info-value">${quote.quoteNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date</span>
              <span class="info-value">${new Date(quote.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Valid Until</span>
              <span class="info-value" style="color: ${new Date(quote.validUntil) < new Date() ? '#dc2626' : '#059669'};">${new Date(quote.validUntil).toLocaleDateString('en-IN')}</span>
            </div>
            ${quote.projectNumber ? `
            <div class="info-row">
              <span class="info-label">Project Ref.</span>
              <span class="info-value">${quote.projectNumber}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Total Area</span>
              <span class="info-value">${(quote.totalArea || 0).toFixed(0)} Sq.ft</span>
            </div>
          </div>
        </div>
        
        <!-- Measurement Details (B2C Only) -->
        ${measurementSection}
        
        <!-- Items Table -->
        <div class="items-section">
          <h3>📦 Materials & Services</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">#</th>
                <th>Description</th>
                <th style="width: 70px;" class="text-center">Qty</th>
                <th style="width: 50px;" class="text-center">Unit</th>
                <th style="width: 90px;" class="text-right">Rate</th>
                <th style="width: 100px;" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(quote.items || []).map((item, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td>
                    <div class="item-name">${item.name || item.description || '-'}</div>
                    ${item.sku ? `<div class="item-sku">SKU: ${item.sku}</div>` : ''}
                  </td>
                  <td class="text-center">${(item.quantity || item.area || 0).toLocaleString()}</td>
                  <td class="text-center">${item.unit || 'sqft'}</td>
                  <td class="text-right">${formatCurrency(item.unitPrice || item.rate || 0)}</td>
                  <td class="text-right"><strong>${formatCurrency(item.totalPrice || item.total || 0)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span class="totals-label">Sub Total</span>
              <span class="totals-value">${formatCurrency(quote.subtotal)}</span>
            </div>
            ${(quote.discountAmount || 0) > 0 ? `
            <div class="totals-row discount">
              <span class="totals-label">Discount (${quote.discountType === 'percentage' || quote.discountType === 'percent' ? quote.discountValue + '%' : 'Fixed'})</span>
              <span class="totals-value">-${formatCurrency(quote.discountAmount)}</span>
            </div>
            ` : ''}
            ${(quote.cgst || quote.cgstAmount || 0) > 0 ? `
            <div class="totals-row">
              <span class="totals-label">CGST (${quote.cgstRate}%)</span>
              <span class="totals-value">${formatCurrency(quote.cgst || quote.cgstAmount)}</span>
            </div>
            ` : ''}
            ${(quote.sgst || quote.sgstAmount || 0) > 0 ? `
            <div class="totals-row">
              <span class="totals-label">SGST (${quote.sgstRate}%)</span>
              <span class="totals-value">${formatCurrency(quote.sgst || quote.sgstAmount)}</span>
            </div>
            ` : ''}
            ${(quote.igst || quote.igstAmount || 0) > 0 ? `
            <div class="totals-row">
              <span class="totals-label">IGST (${quote.igstRate}%)</span>
              <span class="totals-value">${formatCurrency(quote.igst || quote.igstAmount)}</span>
            </div>
            ` : ''}
            <div class="totals-row grand">
              <span>GRAND TOTAL</span>
              <span>${formatCurrency(quote.grandTotal)}</span>
            </div>
          </div>
        </div>
        
        <!-- Amount in Words -->
        <div class="amount-words">
          <strong>Amount in Words:</strong> ${grandTotalWords}
        </div>
        
        ${quote.notes ? `
        <!-- Notes -->
        <div class="notes-section">
          <h4>📝 Notes</h4>
          <p>${quote.notes}</p>
        </div>
        ` : ''}
        
        <!-- Terms & Conditions -->
        <div class="terms-section">
          <h4>📜 Terms & Conditions</h4>
          <ol class="terms-list">
            <li>This quotation is valid for <strong>${Math.ceil((new Date(quote.validUntil) - new Date(quote.createdAt)) / (1000 * 60 * 60 * 24))}</strong> days from the date of issue.</li>
            <li>Prices are inclusive of material and installation charges unless otherwise specified.</li>
            <li>50% advance payment required at the time of order confirmation.</li>
            <li>Balance payment due upon completion of work.</li>
            <li>Warranty terms as per manufacturer specifications.</li>
            <li>Any additional work will be charged separately with prior approval.</li>
            ${quote.terms ? `<li>${quote.terms}</li>` : ''}
          </ol>
        </div>
        
        ${moduleSettings?.bankDetails?.bankName ? `
        <!-- Bank Details -->
        <div class="bank-section">
          <h4>🏦 Bank Details for Payment</h4>
          <div class="bank-grid">
            <div>
              <div class="info-label">Bank Name</div>
              <div class="info-value">${moduleSettings.bankDetails.bankName}</div>
            </div>
            <div>
              <div class="info-label">Account No.</div>
              <div class="info-value">${moduleSettings.bankDetails.accountNumber}</div>
            </div>
            <div>
              <div class="info-label">IFSC Code</div>
              <div class="info-value">${moduleSettings.bankDetails.ifscCode}</div>
            </div>
            ${moduleSettings.bankDetails.upiId ? `
            <div>
              <div class="info-label">UPI ID</div>
              <div class="info-value">${moduleSettings.bankDetails.upiId}</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        <!-- Signature -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Customer Acceptance</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">For ${companyName}</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business! We look forward to serving you.</p>
          <div class="footer-contact">
            ${companyPhone ? `📞 ${companyPhone}` : ''} ${companyEmail ? `• ✉️ ${companyEmail}` : ''}
          </div>
          <p style="margin-top: 10px; font-size: 10px;">This is a computer-generated quotation.</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(quoteHtml)
    printWindow.document.close()
    printWindow.print()
  }

  // Delete quote
  const handleDeleteQuote = async (quoteId) => {
    if (!confirm('Are you sure you want to delete this quote?')) return
    
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/quotes', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: quoteId })
      })
      
      if (res.ok) {
        toast.success('Quote deleted')
        fetchQuotes()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete quote')
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

  // Handle Installation Complete - Also marks project as complete (B2C)
  const handleInstallationComplete = async (installation) => {
    try {
      setLoading(true)
      
      // First, complete the installation
      await fetch('/api/flooring/enhanced/installations', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          id: installation.id, 
          action: 'update_status', 
          status: 'completed',
          completedDate: new Date().toISOString()
        })
      })
      
      // Then, update the project status to completed
      if (installation.projectId) {
        await handleUpdateProjectStatus(installation.projectId, 'completed')
        toast.success('Installation completed and project marked as complete!')
      } else {
        toast.success('Installation completed!')
      }
      
      fetchInstallations()
      fetchProjects()
    } catch (error) {
      toast.error('Failed to complete installation')
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
        const created = result.results?.created || 0
        const updated = result.results?.updated || 0
        if (created > 0 || updated > 0) {
          toast.success(`Sync completed: ${created} new, ${updated} updated`)
        } else {
          toast.info('All projects are already up to date')
        }
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

  // Handle Send For Measurement (B2C Flow)
  const handleSendForMeasurement = async (project) => {
    try {
      setLoading(true)
      
      // Update project status to measurement_scheduled
      await fetch('/api/flooring/enhanced/projects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          id: project.id, 
          action: 'update_status', 
          status: 'measurement_scheduled',
          statusNotes: 'Sent for measurement'
        })
      })
      
      // Set selected project and navigate to measurements tab
      setSelectedProject(project)
      setActiveTab('measurements')
      
      toast.success('Project sent for measurement. Add measurements in the Measurements tab.')
      fetchProjects()
    } catch (error) {
      toast.error('Failed to send for measurement')
    } finally {
      setLoading(false)
    }
  }

  // Handle Send For Material Requisition (B2B Flow)
  const handleSendForMaterialRequisition = async (project) => {
    try {
      setLoading(true)
      
      // Update project status to material_requisition
      await fetch('/api/flooring/enhanced/projects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          id: project.id, 
          action: 'update_status', 
          status: 'material_requisition',
          statusNotes: 'Material requisition initiated'
        })
      })
      
      // Set selected project and navigate to material tab
      setSelectedProject(project)
      setActiveTab('materials')
      
      toast.success('Material requisition initiated. Add materials in the Materials tab.')
      fetchProjects()
    } catch (error) {
      toast.error('Failed to send for material requisition')
    } finally {
      setLoading(false)
    }
  }

  // Handle Send For Quotation - Creates a new quote for project
  const handleSendForQuotation = async (project) => {
    try {
      setLoading(true)
      
      // Navigate to quotes tab with the project pre-selected
      setSelectedProject(project)
      setDialogOpen({ 
        type: 'quote', 
        data: {
          projectId: project.id,
          projectNumber: project.projectNumber,
          customerId: project.customerId,
          customerName: project.customerName,
          siteAddress: project.site?.address || project.siteAddress || '',
          flooringType: project.flooringType,
          totalArea: project.totalArea,
          estimatedValue: project.estimatedValue
        } 
      })
      
      toast.success('Creating quotation for project...')
    } catch (error) {
      toast.error('Failed to initiate quotation')
    } finally {
      setLoading(false)
    }
  }

  // Handle Send for Installation (B2C only - after invoice is paid)
  const handleSendForInstallation = async (invoice) => {
    try {
      setLoading(true)
      
      // Find the related project
      const project = projects.find(p => p.id === invoice.projectId)
      if (!project) {
        toast.error('Project not found for this invoice')
        return
      }

      // Safety check: B2B projects should NOT have installation
      if (project.segment === 'b2b') {
        toast.error('B2B orders do not require installation. Use Dispatch/Delivery workflow.')
        return
      }

      // Create installation record
      const res = await fetch('/api/flooring/enhanced/installations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: project.id,
          projectNumber: project.projectNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: project.customerId,
          customerName: project.customerName,
          siteAddress: project.site?.address || '',
          totalArea: project.totalArea || invoice.totalArea || 0,
          status: 'scheduled',
          notes: `Installation for ${invoice.invoiceNumber}`
        })
      })
      
      if (res.ok) {
        // Update project status
        await handleUpdateProjectStatus(project.id, 'installation_scheduled')
        
        // Navigate to installations tab
        setSelectedProject(project)
        setActiveTab('installations')
        
        toast.success('Installation scheduled! Manage it in the Installations tab.')
        fetchInvoices()
        fetchInstallations()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create installation')
      }
    } catch (error) {
      toast.error('Failed to send for installation')
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
            <Button variant="secondary" onClick={() => setDialogOpen({ type: 'manage_categories', data: null })}>
              <Tags className="h-4 w-4 mr-2" /> Categories
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
                        <p className="text-lg font-bold text-emerald-600">₹{product.pricing?.sellingPrice || 0}/sqft</p>
                        <p className="text-xs text-slate-400">{product.pack?.coverageSqftPerBox || product.pricing?.sqftPerBox || 0} sqft/box</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'product', data: product })}>
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

    // Count unsynced CRM projects (projects in CRM that don't have a flooring project linked)
    const unsyncedCrmCount = crmProjects.filter(p => !p.flooringProjectId).length

    return (
      <div className="space-y-4">
        {/* Sync Status Banner */}
        {unsyncedCrmCount > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">
                      {unsyncedCrmCount} new project{unsyncedCrmCount > 1 ? 's' : ''} available from CRM
                    </p>
                    <p className="text-sm text-blue-700">
                      Click "Sync Now" to import projects added in CRM
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleProjectSync('sync_from_crm')}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleProjectSync('sync_from_crm')}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
            <Button onClick={() => setDialogOpen({ type: 'project', data: null })}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>
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
                    <TableHeader>Segment</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Value</TableHeader>
                    <TableHeader>Actions</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProjects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{project.projectNumber}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{project.name}</p>
                          {project.crmProjectId && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                              <CheckCircle2 className="h-3 w-3" /> CRM Synced
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{project.customerName || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={project.segment === 'b2b' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                          {project.segment === 'b2b' ? 'B2B (Dealer)' : 'B2C (Consumer)'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{project.type}</Badge>
                        <p className="text-xs text-slate-500 mt-1">{project.totalArea || 0} sqft</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-emerald-600">₹{(project.estimatedValue || 0).toLocaleString()}</p>
                      </td>
                      {/* Actions Column - FIRST before Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* B2C: Send for Measurement */}
                          {project.segment !== 'b2b' && !['measurement_done', 'quote_pending', 'quote_sent', 'quote_approved', 'invoice_sent', 'payment_received', 'installation_scheduled', 'installation_in_progress', 'completed'].includes(project.status) && (
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleSendForMeasurement(project)}
                            >
                              <Ruler className="h-4 w-4 mr-1" />
                              Measurement
                            </Button>
                          )}
                          {/* B2B: Send for Material Requisition */}
                          {project.segment === 'b2b' && !['material_processing', 'material_ready', 'quote_pending', 'quote_sent', 'quote_approved', 'invoice_sent', 'in_transit', 'delivered', 'completed'].includes(project.status) && (
                            <Button 
                              size="sm" 
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => handleSendForMaterialRequisition(project)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Material Req
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'project', data: project })} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_project', data: project })} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      {/* Status Column - After Actions */}
                      <td className="px-4 py-3">
                        <Select 
                          value={project.status} 
                          onValueChange={(v) => handleUpdateProjectStatus(project.id, v)}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <Badge className={ProjectStatus[project.status]?.color || 'bg-slate-100 text-slate-700'}>
                              {ProjectStatus[project.status]?.label || project.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(getProjectStatusBySegment(project.segment)).map(([key, { label, color }]) => (
                              <SelectItem key={key} value={key}>
                                <span className={`px-2 py-0.5 rounded text-xs ${color}`}>{label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
            description="Create a project or sync from CRM to start managing flooring installations."
            action={() => setDialogOpen({ type: 'project', data: null })}
            actionLabel="Create Project"
          />
        )}

        {/* CRM Projects Info Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              CRM Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-slate-500">Module Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-blue-600">CRM Projects</p>
                <p className="text-2xl font-bold text-blue-700">{crmProjects.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-emerald-600">Synced</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {projects.filter(p => p.crmProjectId).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Materials Tab (B2B Flow)
  const renderMaterials = () => {
    // Filter to show only B2B projects
    const b2bProjects = projects.filter(p => p.segment === 'b2b')
    const projectsWithMaterialReq = b2bProjects.filter(p => 
      ['material_requisition', 'material_processing', 'material_ready', 'quote_pending', 'quote_sent'].includes(p.status)
    )

    // Get inventory data for products - create a map for easy lookup
    const inventoryMap = new Map()
    if (inventory?.inventory) {
      inventory.inventory.forEach(inv => {
        inventoryMap.set(inv.productId, inv)
      })
    }

    // Get inventory for a product
    const getProductInventory = (productId) => {
      const inv = inventoryMap.get(productId)
      return {
        totalQty: inv?.quantity || 0,
        availableQty: inv?.availableQty || 0,
        reservedQty: inv?.reservedQty || 0,
        reorderLevel: inv?.reorderLevel || 100
      }
    }

    // Check if quantity is available
    const isQuantityAvailable = (productId, requiredQty) => {
      const inv = getProductInventory(productId)
      return inv.availableQty >= requiredQty
    }

    // Get inventory status class
    const getInventoryStatus = (productId, requiredQty = 0) => {
      const inv = getProductInventory(productId)
      if (inv.availableQty <= 0) return { status: 'out_of_stock', color: 'text-red-600 bg-red-50', label: 'Out of Stock' }
      if (requiredQty > 0 && inv.availableQty < requiredQty) return { status: 'insufficient', color: 'text-amber-600 bg-amber-50', label: 'Insufficient' }
      if (inv.availableQty <= inv.reorderLevel) return { status: 'low_stock', color: 'text-amber-600 bg-amber-50', label: 'Low Stock' }
      return { status: 'in_stock', color: 'text-emerald-600 bg-emerald-50', label: 'In Stock' }
    }

    // Helper functions for material requisition
    const toggleProductSelection = (product) => {
      setMaterialRequisition(prev => {
        const existing = prev[product.id]
        if (existing?.selected) {
          // Deselect
          const newState = { ...prev }
          delete newState[product.id]
          return newState
        } else {
          // Select with default quantity
          return {
            ...prev,
            [product.id]: {
              product,
              quantity: 1,
              selected: true
            }
          }
        }
      })
    }

    const updateProductQuantity = (productId, quantity) => {
      setMaterialRequisition(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: Math.max(1, parseInt(quantity) || 1)
        }
      }))
    }

    const getSelectedProducts = () => {
      return Object.values(materialRequisition).filter(item => item.selected)
    }

    const getTotalValue = () => {
      return getSelectedProducts().reduce((sum, item) => {
        const price = item.product.price || item.product.pricing?.sellingPrice || 0
        return sum + (price * item.quantity)
      }, 0)
    }

    const getTotalQuantity = () => {
      return getSelectedProducts().reduce((sum, item) => sum + item.quantity, 0)
    }

    // Check all selected products have sufficient inventory
    const checkInventoryAvailability = () => {
      const selectedItems = getSelectedProducts()
      const insufficientItems = []
      
      selectedItems.forEach(item => {
        const inv = getProductInventory(item.product.id)
        if (inv.availableQty < item.quantity) {
          insufficientItems.push({
            product: item.product.name,
            required: item.quantity,
            available: inv.availableQty
          })
        }
      })
      
      return { allAvailable: insufficientItems.length === 0, insufficientItems }
    }

    // Reserve inventory for all selected products
    const reserveInventory = async (items, projectId) => {
      try {
        const reservations = []
        for (const item of items) {
          const res = await fetch('/api/flooring/enhanced/inventory', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'reserve',
              productId: item.productId || item.product?.id,
              quantity: item.quantity,
              orderId: projectId,
              notes: `Reserved for project ${selectedProject.projectNumber}`
            })
          })
          if (res.ok) {
            reservations.push({ productId: item.productId || item.product?.id, quantity: item.quantity })
          }
        }
        return reservations
      } catch (error) {
        console.error('Reserve inventory error:', error)
        return []
      }
    }

    // Release inventory reservations
    const releaseInventory = async (items, projectId) => {
      try {
        for (const item of items) {
          await fetch('/api/flooring/enhanced/inventory', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'release',
              productId: item.productId || item.product?.id,
              quantity: item.quantity,
              orderId: projectId,
              notes: `Released from project ${selectedProject.projectNumber}`
            })
          })
        }
        return true
      } catch (error) {
        console.error('Release inventory error:', error)
        return false
      }
    }

    // Save material requisition to project
    const saveMaterialRequisition = async (blockInventory = false) => {
      try {
        setLoading(true)
        const selectedItems = getSelectedProducts()
        
        if (selectedItems.length === 0) {
          toast.error('Please select at least one product')
          return false
        }

        // Check inventory availability if blocking
        if (blockInventory) {
          const { allAvailable, insufficientItems } = checkInventoryAvailability()
          if (!allAvailable) {
            toast.error(`Insufficient inventory for: ${insufficientItems.map(i => i.product).join(', ')}`)
            return false
          }
        }

        const materialData = {
          items: selectedItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.product.price || item.product.pricing?.sellingPrice || 0,
            totalPrice: (item.product.price || item.product.pricing?.sellingPrice || 0) * item.quantity,
            inventoryReserved: blockInventory
          })),
          totalValue: getTotalValue(),
          totalQuantity: getTotalQuantity(),
          inventoryBlocked: blockInventory,
          createdAt: new Date().toISOString()
        }

        // Block inventory if requested
        if (blockInventory) {
          const reservations = await reserveInventory(materialData.items, selectedProject.id)
          materialData.reservations = reservations
          materialData.reservedAt = new Date().toISOString()
        }

        const res = await fetch('/api/flooring/enhanced/projects', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: selectedProject.id,
            materialRequisition: materialData
          })
        })

        if (res.ok) {
          // Update local project state
          setSelectedProject(prev => ({
            ...prev,
            materialRequisition: materialData
          }))
          fetchProjects()
          if (blockInventory) {
            fetchInventory() // Refresh inventory after reservation
          }
          return true
        } else {
          toast.error('Failed to save material requisition')
          return false
        }
      } catch (error) {
        console.error('Save material requisition error:', error)
        toast.error('Error saving material requisition')
        return false
      } finally {
        setLoading(false)
      }
    }

    // Process order - save materials AND block inventory
    const handleProcessOrder = async () => {
      const saved = await saveMaterialRequisition(true) // true = block inventory
      if (saved) {
        await handleUpdateProjectStatus(selectedProject.id, 'material_processing')
        // Update local state immediately
        setSelectedProject(prev => ({
          ...prev,
          status: 'material_processing'
        }))
        toast.success('Material order processed. Inventory has been blocked/reserved.')
      }
    }

    // Update materials - release old inventory, save new requisition
    const handleUpdateMaterials = async () => {
      try {
        setLoading(true)
        
        // First release previously reserved inventory
        if (selectedProject.materialRequisition?.inventoryBlocked) {
          await releaseInventory(selectedProject.materialRequisition.items, selectedProject.id)
          toast.info('Inventory reservation released - stock is now available')
        }
        
        // Change status back to material_requisition to allow editing
        await handleUpdateProjectStatus(selectedProject.id, 'material_requisition')
        
        // Clear inventory blocked flag and update material requisition
        const updatedMaterialRequisition = {
          ...selectedProject.materialRequisition,
          inventoryBlocked: false,
          reservations: []
        }
        
        const res = await fetch('/api/flooring/enhanced/projects', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: selectedProject.id,
            materialRequisition: updatedMaterialRequisition,
            status: 'material_requisition'
          })
        })
        
        if (res.ok) {
          // Update local selected project state immediately
          setSelectedProject(prev => ({
            ...prev,
            status: 'material_requisition',
            materialRequisition: updatedMaterialRequisition
          }))
          
          // Reload selection with saved items
          if (selectedProject.materialRequisition?.items) {
            const items = {}
            selectedProject.materialRequisition.items.forEach(item => {
              const prod = products.find(p => p.id === item.productId)
              if (prod) {
                items[item.productId] = { product: prod, quantity: item.quantity, selected: true }
              }
            })
            setMaterialRequisition(items)
          }
          
          // Refresh data
          await fetchInventory()
          await fetchProjects()
          
          toast.success('You can now edit the material requisition. Inventory is released.')
        } else {
          toast.error('Failed to update project')
        }
      } catch (error) {
        console.error('Update materials error:', error)
        toast.error('Failed to update materials')
      } finally {
        setLoading(false)
      }
    }

    // Mark ready - ensure materials are saved with inventory blocked
    const handleMarkReady = async () => {
      // Verify inventory is still blocked
      if (!selectedProject.materialRequisition?.inventoryBlocked) {
        const { allAvailable, insufficientItems } = checkInventoryAvailability()
        if (!allAvailable) {
          toast.error(`Inventory changed! Insufficient: ${insufficientItems.map(i => i.product).join(', ')}`)
          return
        }
        // Re-block inventory
        await reserveInventory(selectedProject.materialRequisition.items, selectedProject.id)
      }
      
      await handleUpdateProjectStatus(selectedProject.id, 'material_ready')
      // Update local state immediately
      setSelectedProject(prev => ({
        ...prev,
        status: 'material_ready'
      }))
      toast.success('Materials are ready for dispatch. Inventory remains blocked.')
    }

    // Create quote from materials
    const handleCreateQuoteFromMaterials = async () => {
      try {
        setLoading(true)
        
        const selectedItems = getSelectedProducts()
        if (selectedItems.length === 0 && !selectedProject?.materialRequisition?.items?.length) {
          toast.error('No materials to create quote from')
          return
        }

        // Use existing requisition if current selection is empty
        const items = selectedItems.length > 0 
          ? selectedItems 
          : (selectedProject?.materialRequisition?.items || []).map(item => {
              const product = products.find(p => p.id === item.productId) || { name: item.productName, price: item.unitPrice }
              return { product, quantity: item.quantity, selected: true }
            })

        // Calculate totals
        const subtotal = items.reduce((sum, item) => {
          const price = item.product?.price || item.product?.pricing?.sellingPrice || item.unitPrice || 0
          return sum + (price * item.quantity)
        }, 0)

        // Create the quote with proper structure for the API
        const quoteData = {
          projectId: selectedProject.id,
          projectNumber: selectedProject.projectNumber,
          leadId: selectedProject.crmLeadId || null,
          customer: {
            id: selectedProject.customerId,
            name: selectedProject.customerName,
            email: selectedProject.customerEmail || '',
            phone: selectedProject.customerPhone || ''
          },
          site: {
            address: selectedProject.site?.address || selectedProject.siteAddress || '',
            city: selectedProject.site?.city || selectedProject.siteCity || '',
            state: selectedProject.site?.state || selectedProject.siteState || ''
          },
          items: items.map(item => ({
            itemType: 'material',
            productId: item.product?.id || item.productId,
            name: item.product?.name || item.productName,
            sku: item.product?.sku || item.sku || '',
            description: item.product?.description || '',
            quantity: item.quantity,
            unit: item.product?.unit || 'sqft',
            unitPrice: item.product?.price || item.product?.pricing?.sellingPrice || item.unitPrice || 0,
            totalPrice: (item.product?.price || item.product?.pricing?.sellingPrice || item.unitPrice || 0) * item.quantity,
            area: item.quantity
          })),
          template: 'professional',
          discountType: 'fixed',
          discountValue: 0,
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 18,
          isInterstate: false,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paymentTerms: 'Net 30',
          notes: `Material requisition for B2B project ${selectedProject.projectNumber}`
        }

        const res = await fetch('/api/flooring/enhanced/quotes', {
          method: 'POST',
          headers,
          body: JSON.stringify(quoteData)
        })

        if (res.ok) {
          const newQuote = await res.json()
          
          // Update project status
          await handleUpdateProjectStatus(selectedProject.id, 'quote_pending')
          // Update local state immediately
          setSelectedProject(prev => ({
            ...prev,
            status: 'quote_pending'
          }))
          
          // Refresh quotes and switch to quotes tab
          await fetchQuotes()
          setActiveTab('quotes')
          toast.success('Quote created successfully! Inventory remains blocked until delivery.')
          
          if (newQuote.data || newQuote.quote) {
            setDialogOpen({ type: 'view_quote', data: newQuote.data || newQuote.quote || newQuote })
          }
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to create quote')
        }
      } catch (error) {
        console.error('Create quote error:', error)
        toast.error('Error creating quote')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="space-y-4">
        {/* Header with Inventory Summary */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Material Requisitions</h3>
            <p className="text-sm text-muted-foreground">Manage material orders for B2B dealer projects</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Inventory Summary */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm">
              <Warehouse className="h-4 w-4 text-slate-600" />
              <span className="text-slate-600">Total Stock:</span>
              <span className="font-semibold">{inventory?.summary?.totalQuantity?.toLocaleString() || 0}</span>
              <span className="text-slate-400">|</span>
              <span className="text-amber-600">Reserved: {inventory?.summary?.reservedQuantity?.toLocaleString() || 0}</span>
            </div>
            {selectedProject && selectedProject.segment === 'b2b' && (
              <Badge className="bg-blue-100 text-blue-700">
                Working on: {selectedProject.projectNumber}
              </Badge>
            )}
          </div>
        </div>

        {/* Projects with Blocked Inventory Overview */}
        {projectsWithMaterialReq.filter(p => p.materialRequisition?.inventoryBlocked).length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <Lock className="h-4 w-4" /> Inventory Blocked for Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {projectsWithMaterialReq.filter(p => p.materialRequisition?.inventoryBlocked).map(p => (
                  <Badge key={p.id} variant="outline" className="bg-white text-amber-700 border-amber-300">
                    {p.projectNumber}: {p.materialRequisition?.totalQuantity || 0} units blocked
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Selection for Material Requisition */}
        {!selectedProject || selectedProject.segment !== 'b2b' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Boxes className="h-5 w-5 text-purple-600" />
                Select a B2B Project
              </CardTitle>
              <CardDescription>Choose a B2B project to create or manage material requisition</CardDescription>
            </CardHeader>
            <CardContent>
              {b2bProjects.length > 0 ? (
                <div className="grid gap-3">
                  {b2bProjects.map(project => (
                    <div 
                      key={project.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-purple-500 hover:bg-purple-50 ${selectedProject?.id === project.id ? 'border-purple-500 bg-purple-50' : ''}`}
                      onClick={() => {
                        setSelectedProject(project)
                        setMaterialRequisition({})
                        if (project.materialRequisition?.items) {
                          const items = {}
                          project.materialRequisition.items.forEach(item => {
                            const prod = products.find(p => p.id === item.productId)
                            if (prod) {
                              items[item.productId] = { product: prod, quantity: item.quantity, selected: true }
                            }
                          })
                          setTimeout(() => setMaterialRequisition(items), 0)
                        }
                        fetchInventory() // Refresh inventory when selecting project
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{project.projectNumber}</p>
                          <p className="text-sm text-muted-foreground">{project.customerName || project.name}</p>
                          {project.materialRequisition?.items?.length > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-purple-600">
                                <Package className="h-3 w-3 inline mr-1" />
                                {project.materialRequisition.items.length} items • ₹{(project.materialRequisition.totalValue || 0).toLocaleString()}
                              </span>
                              {project.materialRequisition.inventoryBlocked && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                                  <Lock className="h-3 w-3 mr-1" /> Inventory Blocked
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={ProjectStatusB2B[project.status]?.color || 'bg-slate-100'}>
                            {ProjectStatusB2B[project.status]?.label || project.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Boxes className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground">No B2B projects found</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a B2B project first</p>
                  <Button className="mt-4" onClick={() => setActiveTab('projects')}>
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Material Requisition Form */
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      {selectedProject.projectNumber} - {selectedProject.customerName}
                    </CardTitle>
                    <CardDescription>Material requisition for dealer</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedProject(null); setMaterialRequisition({}) }}>
                    <X className="h-4 w-4 mr-1" /> Change Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={ProjectStatusB2B[selectedProject.status]?.color || 'bg-slate-100'}>
                      {ProjectStatusB2B[selectedProject.status]?.label || selectedProject.status}
                    </Badge>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Selected Items Value</p>
                    <p className="font-semibold text-emerald-600">₹{getTotalValue().toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Quantity</p>
                    <p className="font-medium text-blue-600">{getTotalQuantity().toLocaleString()} units</p>
                  </div>
                  <div className={`p-3 rounded-lg ${selectedProject.materialRequisition?.inventoryBlocked ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <p className="text-sm text-muted-foreground">Inventory Status</p>
                    <p className={`font-medium ${selectedProject.materialRequisition?.inventoryBlocked ? 'text-amber-600' : 'text-slate-600'}`}>
                      {selectedProject.materialRequisition?.inventoryBlocked ? (
                        <><Lock className="h-4 w-4 inline mr-1" /> Blocked</>
                      ) : (
                        <><Unlock className="h-4 w-4 inline mr-1" /> Not Blocked</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Inventory Block Alert */}
                {selectedProject.materialRequisition?.inventoryBlocked && (
                  <div className="mb-6 p-4 border-2 border-amber-300 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Inventory is blocked for this requisition</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                      {selectedProject.materialRequisition.totalQuantity} units are reserved and cannot be allocated to other projects.
                      Reserved on: {new Date(selectedProject.materialRequisition.reservedAt || selectedProject.materialRequisition.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Existing Material Requisition Display */}
                {selectedProject.materialRequisition?.items?.length > 0 && (
                  <div className="mb-6 p-4 border-2 border-purple-200 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-purple-800 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Saved Material Requisition
                      </h4>
                      <Badge variant="outline" className="text-purple-700">
                        ₹{(selectedProject.materialRequisition.totalValue || 0).toLocaleString()}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedProject.materialRequisition.items.map((item, idx) => {
                        const inv = getProductInventory(item.productId)
                        const status = getInventoryStatus(item.productId, item.quantity)
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* Inventory Info */}
                              <div className="text-center px-3 border-r">
                                <p className="text-xs text-muted-foreground">Stock</p>
                                <p className="font-medium text-sm">{inv.totalQty}</p>
                              </div>
                              <div className="text-center px-3 border-r">
                                <p className="text-xs text-muted-foreground">Available</p>
                                <p className={`font-medium text-sm ${inv.availableQty < item.quantity ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {inv.availableQty}
                                </p>
                              </div>
                              <div className="text-center px-3 border-r">
                                <p className="text-xs text-muted-foreground">Reserved</p>
                                <p className="font-medium text-sm text-amber-600">{inv.reservedQty}</p>
                              </div>
                              {/* Order Info */}
                              <div className="text-right min-w-24">
                                <p className="font-medium">Qty: {item.quantity}</p>
                                <p className="text-sm text-emerald-600">₹{item.totalPrice?.toLocaleString()}</p>
                              </div>
                              {/* Status Badge */}
                              <Badge className={`text-xs ${status.color}`}>
                                {item.inventoryReserved ? 'Blocked' : status.label}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Product Selection for Material - Only show for requisition status (before inventory blocked) */}
                {selectedProject.status === 'material_requisition' && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" /> Select Products for Requisition
                      <span className="text-xs text-muted-foreground ml-2">(Inventory will be blocked on Process Order)</span>
                    </h4>
                    <div className="border rounded-lg p-4">
                      {products.length > 0 ? (
                        <div className="grid gap-2 max-h-80 overflow-y-auto">
                          {products.map(product => {
                            const isSelected = materialRequisition[product.id]?.selected
                            const quantity = materialRequisition[product.id]?.quantity || 1
                            const price = product.price || product.pricing?.sellingPrice || 0
                            const inv = getProductInventory(product.id)
                            const status = getInventoryStatus(product.id, isSelected ? quantity : 0)
                            
                            return (
                              <div 
                                key={product.id} 
                                className={`flex items-center justify-between p-3 border rounded transition-all ${isSelected ? 'border-purple-500 bg-purple-50' : 'hover:bg-slate-50'} ${status.status === 'out_of_stock' ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    id={`prod-${product.id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => toggleProductSelection(product)}
                                    disabled={status.status === 'out_of_stock'}
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{product.sku} • ₹{price}/{product.unit || 'unit'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {/* Inventory Status */}
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="text-center px-2">
                                      <p className="text-xs text-muted-foreground">Available</p>
                                      <p className={`font-medium ${inv.availableQty <= inv.reorderLevel ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {inv.availableQty}
                                      </p>
                                    </div>
                                    {inv.reservedQty > 0 && (
                                      <div className="text-center px-2 border-l">
                                        <p className="text-xs text-muted-foreground">Reserved</p>
                                        <p className="font-medium text-amber-600">{inv.reservedQty}</p>
                                      </div>
                                    )}
                                    <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                                  </div>
                                  
                                  {isSelected && (
                                    <>
                                      <Input 
                                        className={`w-20 h-8 ${quantity > inv.availableQty ? 'border-red-500' : ''}`}
                                        type="number" 
                                        min="1"
                                        max={inv.availableQty}
                                        value={quantity}
                                        onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                                      />
                                      <span className="text-sm font-medium text-emerald-600 w-24 text-right">
                                        ₹{(price * quantity).toLocaleString()}
                                      </span>
                                      {quantity > inv.availableQty && (
                                        <span className="text-xs text-red-600">Exceeds stock!</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">No products available. Add products first.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons - Logic based on status AND inventory state */}
                <div className="flex flex-col gap-4 mt-6">
                  {/* Determine the actual state */}
                  {(() => {
                    const isInventoryBlocked = selectedProject.materialRequisition?.inventoryBlocked
                    const hasSelectedProducts = getSelectedProducts().length > 0
                    const hasSavedRequisition = selectedProject.materialRequisition?.items?.length > 0
                    const { allAvailable, insufficientItems } = checkInventoryAvailability()
                    const status = selectedProject.status

                    // Case 1: Inventory is already blocked - show edit and proceed options
                    if (isInventoryBlocked) {
                      return (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <Button 
                              variant="outline"
                              disabled={loading}
                              onClick={handleUpdateMaterials}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Materials (Release Inventory)
                            </Button>
                            {status === 'material_requisition' && (
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={loading}
                                onClick={async () => {
                                  await handleUpdateProjectStatus(selectedProject.id, 'material_processing')
                                  toast.success('Proceeding to processing. Inventory remains blocked.')
                                }}
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Proceed to Processing
                              </Button>
                            )}
                            {status === 'material_processing' && (
                              <Button 
                                className="bg-teal-600 hover:bg-teal-700"
                                disabled={loading}
                                onClick={handleMarkReady}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Materials Ready
                              </Button>
                            )}
                            {status === 'material_ready' && (
                              <Button 
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={loading}
                                onClick={handleCreateQuoteFromMaterials}
                              >
                                {loading ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-2" />
                                )}
                                Create Quote from Materials
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-amber-700 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Inventory is blocked. Click "Edit Materials" to release and modify the requisition.
                          </p>
                        </div>
                      )
                    }

                    // Case 2: No inventory blocked, status is material_requisition - show process button
                    if (status === 'material_requisition') {
                      return (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            {hasSavedRequisition && !hasSelectedProducts && (
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  // Load saved requisition into selection
                                  if (selectedProject.materialRequisition?.items) {
                                    const items = {}
                                    selectedProject.materialRequisition.items.forEach(item => {
                                      const prod = products.find(p => p.id === item.productId)
                                      if (prod) {
                                        items[item.productId] = { product: prod, quantity: item.quantity, selected: true }
                                      }
                                    })
                                    setMaterialRequisition(items)
                                    toast.info('Loaded saved requisition. You can now edit and process.')
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Load Saved Requisition
                              </Button>
                            )}
                            <Button 
                              className="bg-purple-600 hover:bg-purple-700"
                              disabled={loading || !hasSelectedProducts || !allAvailable}
                              onClick={handleProcessOrder}
                            >
                              {loading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4 mr-2" />
                              )}
                              Process Order & Block Inventory ({getSelectedProducts().length} items)
                            </Button>
                          </div>
                          {!hasSelectedProducts && (
                            <p className="text-sm text-slate-500">
                              Select products above to create a material requisition.
                            </p>
                          )}
                          {hasSelectedProducts && !allAvailable && (
                            <p className="text-sm text-red-600 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Cannot process: {insufficientItems.map(i => `${i.product} (need ${i.required}, have ${i.available})`).join(', ')}
                            </p>
                          )}
                        </div>
                      )
                    }

                    // Case 3: Status is material_processing without blocked inventory (edge case)
                    if (status === 'material_processing') {
                      return (
                        <div className="flex gap-3">
                          <Button 
                            variant="outline"
                            disabled={loading}
                            onClick={handleUpdateMaterials}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Materials
                          </Button>
                          <Button 
                            className="bg-teal-600 hover:bg-teal-700"
                            disabled={loading}
                            onClick={handleMarkReady}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Materials Ready
                          </Button>
                        </div>
                      )
                    }

                    // Case 4: Status is material_ready
                    if (status === 'material_ready') {
                      return (
                        <div className="flex gap-3">
                          <Button 
                            variant="outline"
                            disabled={loading}
                            onClick={handleUpdateMaterials}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Materials
                          </Button>
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={loading}
                            onClick={handleCreateQuoteFromMaterials}
                          >
                            {loading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            Create Quote from Materials
                          </Button>
                        </div>
                      )
                    }

                    // Case 5: Quote stages - show view quotes button
                    if (['quote_pending', 'quote_sent', 'quote_approved'].includes(status)) {
                      return (
                        <div className="flex gap-3">
                          <Button 
                            variant="outline"
                            onClick={() => setActiveTab('quotes')}
                          >
                            <FileText className="h-4 w-4 mr-2" /> View Quotes
                          </Button>
                        </div>
                      )
                    }

                    // Case 6: Invoice/Delivery stages
                    if (['invoice_sent', 'in_transit', 'delivered', 'completed'].includes(status)) {
                      return (
                        <div className="flex gap-3">
                          <Button 
                            variant="outline"
                            onClick={() => setActiveTab('invoices')}
                          >
                            <Receipt className="h-4 w-4 mr-2" /> View Invoices
                          </Button>
                        </div>
                      )
                    }

                    return null
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">B2B Workflow Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {[
                    { status: 'material_requisition', label: 'Requisition', icon: ClipboardList },
                    { status: 'material_processing', label: 'Processing', icon: Clock },
                    { status: 'material_ready', label: 'Ready', icon: CheckCircle2 },
                    { status: 'quote_pending', label: 'Quote', icon: FileText },
                    { status: 'invoice_sent', label: 'Invoice', icon: Receipt },
                    { status: 'delivered', label: 'Delivered', icon: Truck }
                  ].map((step, idx) => {
                    const statusOrder = ['pending', 'material_requisition', 'material_processing', 'material_ready', 'quote_pending', 'quote_sent', 'quote_approved', 'invoice_sent', 'in_transit', 'delivered', 'completed']
                    const currentIdx = statusOrder.indexOf(selectedProject.status)
                    const stepIdx = statusOrder.indexOf(step.status)
                    const isActive = currentIdx >= stepIdx
                    const Icon = step.icon
                    return (
                      <div key={step.status} className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${isActive ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={`text-xs ${isActive ? 'text-purple-600 font-medium' : 'text-slate-400'}`}>{step.label}</span>
                        {idx < 5 && <div className={`w-8 h-0.5 ${isActive ? 'bg-purple-600' : 'bg-slate-200'}`} />}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // Quotes Tab - Enterprise Level
  const renderQuotes = () => {
    const filteredQuotes = quotes.filter(q => {
      const matchesSearch = !searchTerm || 
        q.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.projectNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Summary calculations
    const summary = quotes.reduce((acc, q) => {
      acc.total++
      acc.totalValue += q.grandTotal || 0
      if (q.status === 'draft') acc.draft++
      if (q.status === 'sent') acc.sent++
      if (q.status === 'approved') { acc.approved++; acc.approvedValue += q.grandTotal || 0 }
      if (q.status === 'rejected') acc.rejected++
      if (q.status === 'revised') acc.revised++
      if (q.status === 'invoiced') { acc.invoiced++; acc.invoicedValue += q.grandTotal || 0 }
      return acc
    }, { total: 0, totalValue: 0, draft: 0, sent: 0, approved: 0, rejected: 0, revised: 0, invoiced: 0, approvedValue: 0, invoicedValue: 0 })

    // Quote status definitions with actions - SAP/Zoho style
    const QuoteStatusConfig = {
      draft: { 
        label: 'Draft', 
        color: 'bg-slate-100 text-slate-700 border-slate-300', 
        icon: FileText,
        actions: ['edit', 'send', 'delete'],
        canEdit: true,
        priority: 1
      },
      sent: { 
        label: 'Sent to Customer', 
        color: 'bg-blue-100 text-blue-700 border-blue-300', 
        icon: Send,
        actions: ['approve', 'reject', 'revise', 'resend'],
        canEdit: false,
        priority: 2
      },
      approved: { 
        label: 'Customer Approved', 
        color: 'bg-emerald-100 text-emerald-700 border-emerald-300', 
        icon: CheckCircle2,
        actions: ['create_invoice', 'download'],
        canEdit: false,
        priority: 3
      },
      rejected: { 
        label: 'Rejected', 
        color: 'bg-red-100 text-red-700 border-red-300', 
        icon: X,
        actions: ['revise', 'delete'],
        canEdit: false,
        priority: 4
      },
      revised: { 
        label: 'Revision Required', 
        color: 'bg-amber-100 text-amber-700 border-amber-300', 
        icon: Edit,
        actions: ['edit', 'send'],
        canEdit: true,
        priority: 5
      },
      invoiced: { 
        label: 'Invoiced', 
        color: 'bg-purple-100 text-purple-700 border-purple-300', 
        icon: Receipt,
        actions: ['view_invoice', 'download'],
        canEdit: false,
        locked: true,
        priority: 6
      },
      // Keep 'converted' as alias for backward compatibility with existing data
      converted: { 
        label: 'Invoiced', 
        color: 'bg-purple-100 text-purple-700 border-purple-300', 
        icon: Receipt,
        actions: ['view_invoice', 'download'],
        canEdit: false,
        locked: true,
        priority: 6
      },
      expired: { 
        label: 'Expired', 
        color: 'bg-gray-100 text-gray-500 border-gray-300', 
        icon: Clock,
        actions: ['revise', 'delete'],
        canEdit: false,
        priority: 7
      }
    }

    // Handle quote actions
    const handleQuoteStatusChange = async (quoteId, newStatus, note = '') => {
      try {
        setLoading(true)
        
        // Map status to API action
        const actionMap = {
          'approved': 'approve',
          'rejected': 'reject',
          'revised': 'revise',
          'sent': 'send'
        }
        
        const action = actionMap[newStatus]
        const body = action 
          ? { id: quoteId, action, reason: note, notes: note }
          : { id: quoteId, status: newStatus, statusNote: note, statusChangedAt: new Date().toISOString() }
        
        const res = await fetch('/api/flooring/enhanced/quotes', {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        })
        
        if (res.ok) {
          await fetchQuotes()
          const statusMessages = {
            'approved': 'Quote approved successfully!',
            'rejected': 'Quote rejected',
            'revised': 'Quote marked for revision',
            'sent': 'Quote sent to customer',
            'invoiced': 'Quote converted to invoice'
          }
          toast.success(statusMessages[newStatus] || `Quote status updated to ${newStatus}`)
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to update quote')
        }
      } catch (error) {
        console.error('Quote status change error:', error)
        toast.error('Failed to update quote status')
      } finally {
        setLoading(false)
      }
    }

    // Create invoice from quote
    const handleCreateInvoiceFromQuote = async (quote) => {
      try {
        setLoading(true)
        const invoiceData = {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          projectId: quote.projectId,
          projectNumber: quote.projectNumber,
          customer: quote.customer,
          site: quote.site,
          items: quote.items,
          subtotal: quote.subtotal,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          discountAmount: quote.discountAmount,
          taxableAmount: quote.taxableAmount,
          cgstRate: quote.cgstRate,
          cgstAmount: quote.cgstAmount,
          sgstRate: quote.sgstRate,
          sgstAmount: quote.sgstAmount,
          igstRate: quote.igstRate,
          igstAmount: quote.igstAmount,
          totalTax: quote.totalTax,
          grandTotal: quote.grandTotal,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: `Invoice generated from Quote ${quote.quoteNumber}`
        }

        const res = await fetch('/api/flooring/enhanced/invoices', {
          method: 'POST',
          headers,
          body: JSON.stringify(invoiceData)
        })

        if (res.ok) {
          // Update quote status to invoiced
          await handleQuoteStatusChange(quote.id, 'invoiced')
          
          // Update project status if exists
          if (quote.projectId) {
            await handleUpdateProjectStatus(quote.projectId, 'invoice_sent')
          }
          
          fetchInvoices()
          setActiveTab('invoices')
          toast.success('Invoice created successfully!')
        } else {
          toast.error('Failed to create invoice')
        }
      } catch (error) {
        toast.error('Error creating invoice')
      } finally {
        setLoading(false)
      }
    }

    // Note: handleDownloadQuote is defined at top level and uses moduleSettings for company name

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Quotes</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </Card>
          <Card className="p-4 bg-slate-50">
            <p className="text-sm text-slate-500">Draft</p>
            <p className="text-2xl font-bold text-slate-600">{summary.draft}</p>
          </Card>
          <Card className="p-4 bg-blue-50">
            <p className="text-sm text-blue-700">Sent</p>
            <p className="text-2xl font-bold text-blue-600">{summary.sent}</p>
          </Card>
          <Card className="p-4 bg-emerald-50">
            <p className="text-sm text-emerald-700">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.approved}</p>
          </Card>
          <Card className="p-4 bg-amber-50">
            <p className="text-sm text-amber-700">Revised/Pending</p>
            <p className="text-2xl font-bold text-amber-600">{summary.revised}</p>
          </Card>
          <Card className="p-4 bg-purple-50">
            <p className="text-sm text-purple-700">Approved Value</p>
            <p className="text-xl font-bold text-purple-600">₹{summary.approvedValue.toLocaleString()}</p>
          </Card>
        </div>

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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(QuoteStatusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {
              // Export quotes to CSV
              const csvData = quotes.map(q => ({
                'Quote Number': q.quoteNumber,
                'Customer': q.customer?.name || '',
                'Project': q.projectNumber || '',
                'Status': QuoteStatusConfig[q.status]?.label || q.status,
                'Amount': q.grandTotal || 0,
                'Created': new Date(q.createdAt).toLocaleDateString(),
                'Valid Until': new Date(q.validUntil).toLocaleDateString()
              }))
              const headers = Object.keys(csvData[0] || {}).join(',')
              const rows = csvData.map(row => Object.values(row).join(',')).join('\n')
              const csv = `${headers}\n${rows}`
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `quotes_export_${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              toast.success('Quotes exported!')
            }}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button onClick={() => setDialogOpen({ type: 'quote', data: null })}>
              <Plus className="h-4 w-4 mr-2" /> Create Quote
            </Button>
          </div>
        </div>

        {/* Quotes Table */}
        {filteredQuotes.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <TableHeader>Quote #</TableHeader>
                    <TableHeader>Customer</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Items</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader>Valid Until</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredQuotes.map((quote) => {
                    const statusConfig = QuoteStatusConfig[quote.status] || QuoteStatusConfig.draft
                    const isExpired = new Date(quote.validUntil) < new Date() && !['approved', 'invoiced'].includes(quote.status)
                    const actualStatus = isExpired && quote.status === 'sent' ? 'expired' : quote.status
                    const actualConfig = QuoteStatusConfig[actualStatus] || statusConfig
                    const StatusIcon = actualConfig.icon || FileText
                    const isLocked = actualConfig.locked || false
                    const canEdit = actualConfig.canEdit && !isLocked
                    
                    // Find project name from projects list
                    const linkedProject = projects.find(p => p.id === quote.projectId)
                    const projectDisplay = quote.projectNumber || linkedProject?.projectNumber || '-'
                    
                    return (
                      <tr key={quote.id} className={`hover:bg-slate-50 transition-colors ${isLocked ? 'bg-purple-50/30' : ''} ${isExpired ? 'bg-red-50/30' : ''}`}>
                        {/* Quote Number */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${actualConfig.color.split(' ')[0]}`}>
                              <StatusIcon className={`h-4 w-4 ${actualConfig.color.split(' ')[1]}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{quote.quoteNumber}</p>
                              <p className="text-xs text-slate-500">{new Date(quote.createdAt).toLocaleDateString('en-IN')}</p>
                            </div>
                            {quote.version > 1 && <Badge variant="outline" className="text-xs">v{quote.version}</Badge>}
                          </div>
                        </td>
                        
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{quote.customer?.name || '-'}</p>
                            <p className="text-xs text-slate-500">{quote.customer?.phone || quote.customer?.email || ''}</p>
                          </div>
                        </td>
                        
                        {/* Project */}
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {projectDisplay}
                          </Badge>
                        </td>
                        
                        {/* Items & Area */}
                        <td className="px-4 py-3">
                          <p className="font-medium">{quote.items?.length || 0} items</p>
                          <p className="text-xs text-slate-500">{(quote.totalArea || 0).toFixed(0)} sqft</p>
                        </td>
                        
                        {/* Amount */}
                        <td className="px-4 py-3">
                          <p className={`font-bold ${isLocked ? 'text-purple-600' : 'text-emerald-600'}`}>
                            ₹{(quote.grandTotal || 0).toLocaleString('en-IN')}
                          </p>
                          {quote.discountAmount > 0 && (
                            <p className="text-xs text-emerald-500">Disc: ₹{quote.discountAmount.toLocaleString()}</p>
                          )}
                        </td>
                        
                        {/* Created Date */}
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(quote.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        
                        {/* Valid Until */}
                        <td className="px-4 py-3 text-sm">
                          <span className={isExpired ? 'text-red-600 font-medium' : 'text-slate-500'}>
                            {new Date(quote.validUntil).toLocaleDateString('en-IN')}
                          </span>
                          {isExpired && <p className="text-xs text-red-500">Expired</p>}
                        </td>
                        
                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge className={`${actualConfig.color} border flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            {actualConfig.label}
                          </Badge>
                          {isLocked && (
                            <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </p>
                          )}
                        </td>
                        
                        {/* Actions - SAP/Zoho Style with Clear Workflow Buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Primary Action Button based on Status */}
                            {quote.status === 'draft' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleQuoteAction(quote.id, 'send')}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" /> Send
                              </Button>
                            )}
                            
                            {quote.status === 'sent' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleQuoteStatusChange(quote.id, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleQuoteStatusChange(quote.id, 'rejected')}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            
                            {quote.status === 'approved' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleCreateInvoiceFromQuote(quote)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <Receipt className="h-3.5 w-3.5 mr-1" /> Create Invoice
                              </Button>
                            )}
                            
                            {quote.status === 'rejected' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setDialogOpen({ type: 'quote', data: quote })}
                                className="border-amber-300 text-amber-600 hover:bg-amber-50"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" /> Revise
                              </Button>
                            )}
                            
                            {quote.status === 'revised' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleQuoteAction(quote.id, 'send')}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" /> Resend
                              </Button>
                            )}
                            
                            {/* Converted/Invoiced - Show View Invoice button */}
                            {quote.status === 'converted' && quote.invoiceId && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setActiveTab('invoices')
                                  toast.info('Switched to Invoices tab')
                                }}
                                className="border-green-300 text-green-600 hover:bg-green-50"
                              >
                                <Receipt className="h-3.5 w-3.5 mr-1" /> View Invoice
                              </Button>
                            )}
                            
                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-slate-100 h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
                                  Quote: {quote.quoteNumber}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                {/* View - Always available */}
                                <DropdownMenuItem onClick={() => setDialogOpen({ type: 'view_quote', data: quote })}>
                                  <Eye className="h-4 w-4 mr-2 text-slate-600" /> View Details
                                </DropdownMenuItem>
                                
                                {/* Download - Always available */}
                                <DropdownMenuItem onClick={() => handleDownloadQuote(quote)}>
                                  <Download className="h-4 w-4 mr-2 text-emerald-600" /> Download PDF
                                </DropdownMenuItem>
                                
                                {/* Edit - Only for draft/revised */}
                                {canEdit && (
                                  <DropdownMenuItem onClick={() => setDialogOpen({ type: 'quote', data: quote })}>
                                    <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Quote
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                {/* Status-specific secondary actions */}
                                {quote.status === 'draft' && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      // Duplicate quote
                                      const duplicatedQuote = { ...quote, id: null, quoteNumber: null }
                                      setDialogOpen({ type: 'quote', data: duplicatedQuote })
                                      toast.info('Creating a copy of this quote...')
                                    }}>
                                      <Copy className="h-4 w-4 mr-2 text-slate-600" /> Duplicate Quote
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteQuote(quote.id)} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete Quote
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {quote.status === 'sent' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleQuoteStatusChange(quote.id, 'revised')}>
                                      <Edit className="h-4 w-4 mr-2 text-amber-600" /> Request Revision
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQuoteAction(quote.id, 'send')}>
                                      <RefreshCw className="h-4 w-4 mr-2 text-blue-600" /> Resend Quote
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {quote.status === 'approved' && (
                                  <DropdownMenuItem onClick={() => handleDownloadQuote(quote)}>
                                    <Printer className="h-4 w-4 mr-2 text-slate-600" /> Print for Records
                                  </DropdownMenuItem>
                                )}
                                
                                {['rejected', 'revised'].includes(quote.status) && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      const duplicatedQuote = { ...quote, id: null, quoteNumber: null }
                                      setDialogOpen({ type: 'quote', data: duplicatedQuote })
                                    }}>
                                      <Copy className="h-4 w-4 mr-2 text-slate-600" /> Create New Version
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteQuote(quote.id)} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete Quote
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {quote.status === 'converted' && (
                                  <DropdownMenuItem disabled className="text-slate-400">
                                    <Lock className="h-4 w-4 mr-2" /> Quote is Locked (Invoiced)
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

  // Invoices Tab - Enterprise Level
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')
  const [syncingCRM, setSyncingCRM] = useState(false)
  
  const handleSyncToCRM = async () => {
    try {
      setSyncingCRM(true)
      const res = await fetch('/api/flooring/enhanced/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'sync_invoices_to_crm' })
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(`Synced to CRM: ${result.data?.results?.contactsUpdated || 0} contacts updated, ${result.data?.results?.invoicesSynced || 0} invoices synced`)
        fetchInvoices()
      } else {
        toast.error('Failed to sync to CRM')
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setSyncingCRM(false)
    }
  }
  
  const renderInvoices = () => {
    // Filter invoices based on status filter
    const filteredInvoices = invoiceStatusFilter === 'all' 
      ? invoices 
      : invoiceStatusFilter === 'overdue'
        ? invoices.filter(i => new Date(i.dueDate) < new Date() && !['paid', 'cancelled'].includes(i.status))
        : invoices.filter(i => i.status === invoiceStatusFilter)
    
    const summary = invoices.reduce((acc, inv) => {
      acc.total += inv.grandTotal || 0
      acc.paid += inv.paidAmount || 0
      acc.pending += inv.balanceAmount || 0
      if (new Date(inv.dueDate) < new Date() && !['paid', 'cancelled'].includes(inv.status)) {
        acc.overdue++
        acc.overdueAmount += inv.balanceAmount || 0
      }
      acc.byStatus[inv.status] = (acc.byStatus[inv.status] || 0) + 1
      return acc
    }, { total: 0, paid: 0, pending: 0, overdue: 0, overdueAmount: 0, byStatus: {} })

    const collectionRate = summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0

    return (
      <div className="space-y-4">
        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Invoiced</p>
                <p className="text-2xl font-bold text-blue-700">₹{summary.total.toLocaleString()}</p>
                <p className="text-xs text-blue-500 mt-1">{invoices.length} invoices</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Collected</p>
                <p className="text-2xl font-bold text-emerald-700">₹{summary.paid.toLocaleString()}</p>
                <p className="text-xs text-emerald-500 mt-1">{collectionRate}% collected</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-amber-700">₹{summary.pending.toLocaleString()}</p>
                <p className="text-xs text-amber-500 mt-1">{summary.byStatus.sent || 0} sent, {summary.byStatus.partially_paid || 0} partial</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-700">₹{summary.overdueAmount.toLocaleString()}</p>
                <p className="text-xs text-red-500 mt-1">{summary.overdue} overdue invoices</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Paid</p>
                <p className="text-2xl font-bold text-purple-700">{summary.byStatus.paid || 0}</p>
                <p className="text-xs text-purple-500 mt-1">Complete payments</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Header with filters and actions */}
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="draft">Draft ({summary.byStatus.draft || 0})</SelectItem>
                <SelectItem value="sent">Sent ({summary.byStatus.sent || 0})</SelectItem>
                <SelectItem value="partially_paid">Partial ({summary.byStatus.partially_paid || 0})</SelectItem>
                <SelectItem value="paid">Paid ({summary.byStatus.paid || 0})</SelectItem>
                <SelectItem value="overdue">Overdue ({summary.overdue})</SelectItem>
                <SelectItem value="cancelled">Cancelled ({summary.byStatus.cancelled || 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sync to CRM Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSyncToCRM}
              disabled={syncingCRM}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncingCRM ? 'animate-spin' : ''}`} />
              {syncingCRM ? 'Syncing...' : 'Sync to CRM'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={fetchInvoices}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            
            <Button onClick={() => setDialogOpen({ type: 'invoice', data: null })}>
              <Plus className="h-4 w-4 mr-2" /> Create Invoice
            </Button>
          </div>
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length > 0 ? (
          <Card className="overflow-hidden">
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
                    <TableHeader>CRM</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map(invoice => {
                    const isOverdue = new Date(invoice.dueDate) < new Date() && !['paid', 'cancelled'].includes(invoice.status)
                    const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)) : 0
                    
                    return (
                      <tr key={invoice.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/50' : ''}`}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                            {invoice.quoteNumber && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <FileText className="h-3 w-3" /> {invoice.quoteNumber}
                              </p>
                            )}
                            {invoice.projectSegment && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {invoice.projectSegment === 'b2b' ? 'B2B' : 'B2C'}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.customer?.name || '-'}</p>
                            {invoice.customer?.phone && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {invoice.customer.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">₹{(invoice.grandTotal || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-emerald-600 font-medium">₹{(invoice.paidAmount || 0).toLocaleString()}</p>
                          {invoice.paidAmount > 0 && (
                            <p className="text-xs text-slate-500">
                              {Math.round((invoice.paidAmount / invoice.grandTotal) * 100)}% paid
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-semibold ${invoice.balanceAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            ₹{(invoice.balanceAmount || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                              {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                            {isOverdue && (
                              <p className="text-xs text-red-500 font-medium">{daysOverdue} days overdue</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            isOverdue ? 'bg-red-100 text-red-700' :
                            InvoiceStatus[invoice.status]?.color || InvoiceStatus.draft.color
                          }>
                            {isOverdue ? 'Overdue' : (InvoiceStatus[invoice.status]?.label || invoice.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {invoice.crmSynced ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-400">
                              Not synced
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* View */}
                            <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_invoice', data: invoice })} title="View Invoice">
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Status-based workflow actions */}
                            {invoice.status === 'draft' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleInvoiceAction(invoice.id, 'send')}
                                >
                                  <Send className="h-4 w-4 mr-1" /> Send
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm('Delete this draft invoice?')) {
                                      fetch(`/api/flooring/enhanced/invoices?id=${invoice.id}`, {
                                        method: 'DELETE',
                                        headers
                                      }).then(() => {
                                        toast.success('Invoice deleted')
                                        fetchInvoices()
                                      })
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {/* Sent - Can record payment or send reminder */}
                            {invoice.status === 'sent' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => setDialogOpen({ type: 'record_payment', data: invoice })}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" /> Payment
                                </Button>
                                {isOverdue && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-amber-600 border-amber-300"
                                    onClick={() => handleInvoiceAction(invoice.id, 'send_reminder')}
                                  >
                                    <Bell className="h-4 w-4 mr-1" /> Remind
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {/* Partially Paid - Record more payment */}
                            {invoice.status === 'partially_paid' && (
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setDialogOpen({ type: 'record_payment', data: invoice })}
                              >
                                <CreditCard className="h-4 w-4 mr-1" /> Add Payment
                              </Button>
                            )}
                            
                            {/* Paid - Send for installation (B2C only) */}
                            {invoice.status === 'paid' && invoice.projectSegment !== 'b2b' && !invoice.installationCreated && (
                              <Button 
                                size="sm" 
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                                onClick={() => handleSendForInstallation(invoice)}
                              >
                                <Wrench className="h-4 w-4 mr-1" /> Install
                              </Button>
                            )}
                            
                            {/* More actions dropdown */}
                            {!['cancelled'].includes(invoice.status) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleInvoiceAction(invoice.id, 'sync_crm')}>
                                    <RefreshCw className="h-4 w-4 mr-2" /> Sync to CRM
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(`/api/flooring/enhanced/invoices/pdf?id=${invoice.id}`, '_blank')}>
                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.print()}>
                                    <Printer className="h-4 w-4 mr-2" /> Print
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {invoice.status !== 'paid' && (
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => {
                                        if (confirm('Cancel this invoice? This cannot be undone.')) {
                                          handleInvoiceAction(invoice.id, 'cancel', { reason: 'Cancelled by user' })
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-2" /> Cancel Invoice
                                    </DropdownMenuItem>
                                  )}
                                  {invoice.status === 'paid' && invoice.paidAmount > 0 && (
                                    <DropdownMenuItem 
                                      className="text-orange-600"
                                      onClick={() => setDialogOpen({ type: 'refund', data: invoice })}
                                    >
                                      <Banknote className="h-4 w-4 mr-2" /> Process Refund
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
            title={invoiceStatusFilter === 'all' ? "No invoices found" : `No ${invoiceStatusFilter} invoices`}
            description={invoiceStatusFilter === 'all' 
              ? "Invoices are created from approved quotes or manually."
              : "Try changing the filter or create a new invoice."
            }
            action={() => setDialogOpen({ type: 'invoice', data: null })}
            actionLabel="Create Invoice"
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
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleInstallationAction(inst.id, 'start')}>
                          <Zap className="h-4 w-4 mr-1" /> Start
                        </Button>
                      )}
                      {inst.status === 'in_progress' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleInstallationComplete(inst)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
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
            description="Installations are created when B2C invoices are paid."
          />
        )}
      </div>
    )
  }

  // Inventory Tab
  const renderInventory = () => {
    const { inventory: items, summary = {}, byCategory = {} } = inventory

    // Get projects with blocked inventory
    const projectsWithBlockedInventory = projects.filter(p => p.materialRequisition?.inventoryBlocked)

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Products</p>
            <p className="text-2xl font-bold">{summary.totalProducts || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Quantity</p>
            <p className="text-2xl font-bold">{(summary.totalQuantity || 0).toLocaleString()} sqft</p>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-700 flex items-center gap-1"><Lock className="h-3 w-3" /> Reserved/Blocked</p>
            <p className="text-2xl font-bold text-amber-600">{(summary.reservedQuantity || 0).toLocaleString()} sqft</p>
          </Card>
          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <p className="text-sm text-emerald-700">Available</p>
            <p className="text-2xl font-bold text-emerald-600">{(summary.availableQuantity || 0).toLocaleString()} sqft</p>
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

        {/* Blocked Inventory by Project */}
        {projectsWithBlockedInventory.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <Lock className="h-4 w-4" /> Inventory Blocked for Projects
              </CardTitle>
              <CardDescription className="text-amber-700">
                The following quantities are reserved and not available for new allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectsWithBlockedInventory.map(project => (
                  <div key={project.id} className="p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-700">{project.projectNumber}</Badge>
                        <span className="text-sm font-medium">{project.customerName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-amber-700 font-medium">
                          {project.materialRequisition?.totalQuantity || 0} units blocked
                        </span>
                        <span className="text-slate-500">
                          Reserved: {new Date(project.materialRequisition?.reservedAt || project.materialRequisition?.createdAt).toLocaleDateString()}
                        </span>
                        <Badge className={ProjectStatusB2B[project.status]?.color || 'bg-slate-100'}>
                          {ProjectStatusB2B[project.status]?.label || project.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.materialRequisition?.items?.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white text-xs">
                          {item.productName}: {item.quantity} units
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                    <TableHeader>Total Stock</TableHeader>
                    <TableHeader className="text-amber-700"><Lock className="h-3 w-3 inline mr-1" />Reserved</TableHeader>
                    <TableHeader className="text-emerald-700">Available</TableHeader>
                    <TableHeader>Avg Cost</TableHeader>
                    <TableHeader>Value</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map(item => {
                    const isLow = item.availableQty <= (item.reorderLevel || 100)
                    const isOut = item.availableQty <= 0
                    const hasReserved = (item.reservedQty || 0) > 0
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
                          <p className={`font-medium ${hasReserved ? 'text-amber-600' : 'text-slate-400'}`}>
                            {hasReserved && <Lock className="h-3 w-3 inline mr-1" />}
                            {(item.reservedQty || 0).toLocaleString()} sqft
                          </p>
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

    // Get report data based on selected type
    const reportData = reports[selectedReportType] || {}
    
    return (
      <div className="space-y-6">
        {/* Report Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
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
            <Button variant="outline" size="sm" onClick={() => fetchReports(selectedReportType)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
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
            {/* Summary Report */}
            {selectedReportType === 'summary' && (
              <>
                {/* KPI Cards - Dynamic Data */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50">
                    <p className="text-sm text-emerald-600 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-700">₹{(reportData?.overview?.totalCollected || dashboardData?.overview?.collectedAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-emerald-500 mt-1">{reportData?.overview?.collectedChange || '+0%'} from last period</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-blue-600 font-medium">Quotes Sent</p>
                    <p className="text-2xl font-bold text-blue-700">{reportData?.overview?.periodQuotes || dashboardData?.overview?.totalQuotes || 0}</p>
                    <p className="text-xs text-blue-500 mt-1">₹{(reportData?.overview?.periodQuoteValue || dashboardData?.overview?.totalQuoteValue || 0).toLocaleString()} value</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50">
                    <p className="text-sm text-purple-600 font-medium">Conversion Rate</p>
                    <p className="text-2xl font-bold text-purple-700">{reportData?.overview?.conversionRate || dashboardData?.overview?.conversionRate || 0}%</p>
                    <p className="text-xs text-purple-500 mt-1">{reportData?.overview?.approvedQuotes || dashboardData?.overview?.approvedQuotes || 0} approved</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50">
                    <p className="text-sm text-amber-600 font-medium">Pending Collection</p>
                    <p className="text-2xl font-bold text-amber-700">₹{(reportData?.overview?.pendingAmount || dashboardData?.overview?.pendingAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-amber-500 mt-1">{invoices.filter(i => !['paid', 'cancelled'].includes(i.status)).length} unpaid invoices</p>
                  </Card>
                </div>

                {/* Status Distributions */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Quote Status Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(reportData?.quotesByStatus || {}).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'approved' || status === 'invoiced' ? 'bg-emerald-500' :
                              status === 'rejected' ? 'bg-red-500' :
                              status === 'sent' ? 'bg-blue-500' :
                              status === 'draft' ? 'bg-slate-400' : 'bg-amber-500'
                            }`} />
                            <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                          </div>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Invoice Status Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(reportData?.invoicesByStatus || {}).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'paid' ? 'bg-emerald-500' :
                              status === 'overdue' ? 'bg-red-500' :
                              status === 'partially_paid' ? 'bg-amber-500' :
                              status === 'sent' ? 'bg-blue-500' : 'bg-slate-400'
                            }`} />
                            <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                          </div>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Top Products with Real Data */}
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
                        {(reports.products?.topProducts || products.slice(0, 5)).map((product, i) => (
                          <tr key={product.id || i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{product.name}</td>
                            <td className="px-4 py-3">
                              <Badge className={FlooringCategories[product.category]?.color || 'bg-slate-100'}>
                                {FlooringCategories[product.category]?.label || product.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">{(product.sales?.quantity || 0).toLocaleString()} sqft</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              ₹{(product.sales?.revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {(!reports.products?.topProducts || reports.products?.topProducts?.length === 0) && products.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                              No product data available. Create quotes or invoices to see product performance.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Invoice Report */}
            {selectedReportType === 'invoices' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-blue-600 font-medium">Total Invoiced</p>
                    <p className="text-2xl font-bold text-blue-700">₹{(reportData?.totalInvoiced || 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-500 mt-1">{reportData?.invoiceCount || 0} invoices</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50">
                    <p className="text-sm text-emerald-600 font-medium">Collected</p>
                    <p className="text-2xl font-bold text-emerald-700">₹{(reportData?.totalCollected || 0).toLocaleString()}</p>
                    <p className="text-xs text-emerald-500 mt-1">{reportData?.collectionRate || 0}% collection rate</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50">
                    <p className="text-sm text-amber-600 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-amber-700">₹{(reportData?.totalPending || 0).toLocaleString()}</p>
                    <p className="text-xs text-amber-500 mt-1">{reportData?.partiallyPaidCount || 0} partially paid</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50">
                    <p className="text-sm text-red-600 font-medium">Overdue</p>
                    <p className="text-2xl font-bold text-red-700">₹{(reportData?.overdueAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-red-500 mt-1">{reportData?.overdueCount || 0} overdue</p>
                  </Card>
                </div>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Invoice Metrics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-700">{reportData?.averageDaysToPay || 0}</p>
                      <p className="text-sm text-slate-500">Avg Days to Pay</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-700">{reportData?.paidCount || 0}</p>
                      <p className="text-sm text-slate-500">Paid Invoices</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-700">{reportData?.collectionRate || 0}%</p>
                      <p className="text-sm text-slate-500">Collection Rate</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Aging Report */}
            {selectedReportType === 'aging' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Receivables Aging Summary</h3>
                  <p className="text-2xl font-bold text-slate-700 mb-4">
                    Total Outstanding: ₹{(reportData?.totalOutstanding || 0).toLocaleString()}
                  </p>
                  <div className="grid grid-cols-5 gap-4">
                    {['current', '1-30', '31-60', '61-90', '90+'].map((bucket) => {
                      const data = reportData?.aging?.[bucket] || { count: 0, amount: 0 }
                      const colors = {
                        'current': 'bg-emerald-50 border-emerald-200 text-emerald-700',
                        '1-30': 'bg-blue-50 border-blue-200 text-blue-700',
                        '31-60': 'bg-amber-50 border-amber-200 text-amber-700',
                        '61-90': 'bg-orange-50 border-orange-200 text-orange-700',
                        '90+': 'bg-red-50 border-red-200 text-red-700'
                      }
                      return (
                        <Card key={bucket} className={`p-4 border-2 ${colors[bucket]}`}>
                          <p className="text-sm font-medium">{bucket === 'current' ? 'Current' : `${bucket} Days`}</p>
                          <p className="text-xl font-bold">₹{data.amount.toLocaleString()}</p>
                          <p className="text-xs mt-1">{data.count} invoice{data.count !== 1 ? 's' : ''}</p>
                        </Card>
                      )
                    })}
                  </div>
                </Card>
                
                {reportData?.aging?.['90+']?.invoices?.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-red-600 mb-4">Critical: 90+ Days Overdue</h3>
                    <table className="w-full">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Invoice</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Customer</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-red-700">Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-red-700">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.aging['90+'].invoices.slice(0, 10).map((inv, i) => (
                          <tr key={i} className="hover:bg-red-50">
                            <td className="px-4 py-2 font-medium">{inv.invoiceNumber}</td>
                            <td className="px-4 py-2">{inv.customer}</td>
                            <td className="px-4 py-2 text-right font-semibold">₹{inv.amount.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-red-600 font-semibold">{inv.daysPastDue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </div>
            )}

            {/* Tax/GST Report */}
            {selectedReportType === 'tax' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-slate-50 to-gray-50">
                    <p className="text-sm text-slate-600 font-medium">Taxable Value</p>
                    <p className="text-2xl font-bold text-slate-700">₹{(reportData?.gstSummary?.taxableValue || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{reportData?.gstSummary?.invoiceCount || 0} invoices</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-blue-600 font-medium">CGST</p>
                    <p className="text-2xl font-bold text-blue-700">₹{(reportData?.gstSummary?.totalCGST || 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-500 mt-1">Central GST</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50">
                    <p className="text-sm text-emerald-600 font-medium">SGST</p>
                    <p className="text-2xl font-bold text-emerald-700">₹{(reportData?.gstSummary?.totalSGST || 0).toLocaleString()}</p>
                    <p className="text-xs text-emerald-500 mt-1">State GST</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50">
                    <p className="text-sm text-purple-600 font-medium">Total Tax</p>
                    <p className="text-2xl font-bold text-purple-700">₹{(reportData?.gstSummary?.totalTax || 0).toLocaleString()}</p>
                    <p className="text-xs text-purple-500 mt-1">CGST + SGST + IGST</p>
                  </Card>
                </div>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Tax by Rate</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(reportData?.byTaxRate || {}).map(([rate, data]) => (
                      <div key={rate} className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-lg font-bold text-slate-700">{rate}</p>
                        <p className="text-sm text-slate-500">Taxable: ₹{data.taxableValue.toLocaleString()}</p>
                        <p className="text-sm text-emerald-600 font-medium">Tax: ₹{data.taxAmount.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{data.count} invoices</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Quotes Report */}
            {selectedReportType === 'quotes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-blue-600 font-medium">Quotes Created</p>
                    <p className="text-2xl font-bold text-blue-700">{reportData?.quotesCreated || 0}</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50">
                    <p className="text-sm text-emerald-600 font-medium">Approved</p>
                    <p className="text-2xl font-bold text-emerald-700">{reportData?.quotesApproved || 0}</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50">
                    <p className="text-sm text-red-600 font-medium">Rejected</p>
                    <p className="text-2xl font-bold text-red-700">{reportData?.quotesRejected || 0}</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50">
                    <p className="text-sm text-purple-600 font-medium">Conversion Rate</p>
                    <p className="text-2xl font-bold text-purple-700">{reportData?.conversionRate || 0}%</p>
                  </Card>
                </div>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Quote Conversion Funnel</h3>
                  <div className="space-y-3">
                    {Object.entries(reportData?.funnel || {}).map(([stage, count], index) => {
                      const total = reportData?.funnel?.created || 1
                      const percentage = Math.round((count / total) * 100)
                      return (
                        <div key={stage}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize">{stage}</span>
                            <span className="text-sm font-medium">{count} ({percentage}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Quote Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-700">₹{(reportData?.averageQuoteValue || 0).toLocaleString()}</p>
                      <p className="text-sm text-slate-500">Average Quote Value</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-3xl font-bold text-slate-700">{reportData?.averageTimeToApprove || 0} days</p>
                      <p className="text-sm text-slate-500">Avg Time to Approve</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Other Reports - Placeholder */}
            {!['summary', 'invoices', 'aging', 'tax', 'quotes'].includes(selectedReportType) && (
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
                  <p className="text-slate-500 mb-4">Click "Generate Report" to load data</p>
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
              <div className="space-y-6">
                {/* Quote Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      Quote Templates
                    </CardTitle>
                    <CardDescription>Choose how your quotations look - Professional templates for wooden flooring industry</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Premium Teal Template (Default) */}
                      <div 
                        className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${moduleSettings?.quoteTemplate === 'premium' || !moduleSettings?.quoteTemplate ? 'border-teal-500 ring-2 ring-teal-200' : 'hover:border-teal-300'}`}
                        onClick={() => handleSaveModuleSettings({ quoteTemplate: 'premium' })}
                      >
                        <div className="aspect-[3/4] bg-white p-3 text-[8px] leading-tight">
                          {/* Header */}
                          <div className="flex justify-between items-start border-b-2 border-teal-600 pb-2 mb-2">
                            <div>
                              <div className="text-teal-600 font-bold text-sm">🪵 FloorCraft Pro</div>
                              <div className="text-gray-500 text-[6px]">Premium Flooring Solutions</div>
                              <div className="text-gray-400 text-[5px]">GSTIN: 22AAAAA0000A1Z5</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-xs">QUOTATION</div>
                              <div className="text-gray-500 text-[6px]">#QT-2025-001</div>
                              <span className="bg-green-100 text-green-700 px-1 rounded text-[5px]">Draft</span>
                            </div>
                          </div>
                          {/* Customer */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-gray-50 p-1.5 rounded border-l-2 border-teal-500">
                              <div className="text-teal-600 font-bold text-[5px]">📋 QUOTATION TO</div>
                              <div className="font-medium">ABC Interiors</div>
                              <div className="text-gray-500 text-[5px]">Mumbai, MH</div>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded border-l-2 border-teal-500">
                              <div className="text-teal-600 font-bold text-[5px]">📄 QUOTE DETAILS</div>
                              <div className="font-medium text-[6px]">Valid: 30 days</div>
                              <div className="text-gray-500 text-[5px]">450 Sq.ft</div>
                            </div>
                          </div>
                          {/* Table */}
                          <table className="w-full mb-2">
                            <thead>
                              <tr className="bg-teal-600 text-white">
                                <th className="p-0.5 text-left text-[6px]">Item</th>
                                <th className="p-0.5 text-right text-[6px]">Qty</th>
                                <th className="p-0.5 text-right text-[6px]">Rate</th>
                                <th className="p-0.5 text-right text-[6px]">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b"><td className="p-0.5 text-[6px]">Oak Wood</td><td className="p-0.5 text-right text-[6px]">450</td><td className="p-0.5 text-right text-[6px]">₹90</td><td className="p-0.5 text-right text-[6px]">₹40,500</td></tr>
                            </tbody>
                          </table>
                          {/* Totals */}
                          <div className="text-right space-y-0.5 text-[6px]">
                            <div className="font-bold text-teal-600 bg-teal-50 p-1 rounded">₹61,065</div>
                          </div>
                          {/* Amount in words */}
                          <div className="bg-amber-50 p-1 rounded text-[5px] italic text-amber-700 mt-1">
                            Amount: Sixty One Thousand...
                          </div>
                        </div>
                        <div className="p-3 bg-teal-50 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-teal-800">Premium Teal</h4>
                            <p className="text-xs text-teal-600">Watermark, Terms, Bank Details</p>
                          </div>
                          {(moduleSettings?.quoteTemplate === 'premium' || !moduleSettings?.quoteTemplate) && <Badge className="bg-teal-600">Active</Badge>}
                        </div>
                      </div>

                      {/* Classic Blue Template */}
                      <div 
                        className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${moduleSettings?.quoteTemplate === 'professional' ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-blue-300'}`}
                        onClick={() => handleSaveModuleSettings({ quoteTemplate: 'professional' })}
                      >
                        <div className="aspect-[3/4] bg-white p-3 text-[8px] leading-tight">
                          {/* Header */}
                          <div className="flex justify-between items-start border-b-2 border-blue-600 pb-2 mb-2">
                            <div>
                              <div className="text-blue-600 font-bold text-sm">🪵 FloorCraft Pro</div>
                              <div className="text-gray-500">Premium Flooring Solutions</div>
                            </div>
                            <div className="text-right">
                              <div className="text-blue-800 font-bold text-xs">QUOTATION</div>
                              <div className="text-gray-500">#QT-2025-001</div>
                            </div>
                          </div>
                          {/* Customer */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-gray-50 p-1.5 rounded">
                              <div className="text-gray-400 text-[6px]">BILL TO</div>
                              <div className="font-medium">ABC Interiors</div>
                              <div className="text-gray-500">Mumbai, MH</div>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded">
                              <div className="text-gray-400 text-[6px]">PROJECT</div>
                              <div className="font-medium">FLP-2025-001</div>
                              <div className="text-gray-500">3 Rooms, 450 sqft</div>
                            </div>
                          </div>
                          {/* Table */}
                          <table className="w-full mb-2">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th className="p-1 text-left">Item</th>
                                <th className="p-1 text-right">Qty</th>
                                <th className="p-1 text-right">Rate</th>
                                <th className="p-1 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b"><td className="p-1">Oak Wood</td><td className="p-1 text-right">450</td><td className="p-1 text-right">₹90</td><td className="p-1 text-right">₹40,500</td></tr>
                              <tr className="border-b"><td className="p-1">Installation</td><td className="p-1 text-right">450</td><td className="p-1 text-right">₹25</td><td className="p-1 text-right">₹11,250</td></tr>
                            </tbody>
                          </table>
                          {/* Totals */}
                          <div className="text-right space-y-0.5">
                            <div>Subtotal: ₹51,750</div>
                            <div>GST 18%: ₹9,315</div>
                            <div className="font-bold text-blue-600 text-sm bg-blue-50 p-1 rounded">Total: ₹61,065</div>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Classic Blue</h4>
                            <p className="text-xs text-slate-500">Clean, modern design</p>
                          </div>
                          {moduleSettings?.quoteTemplate === 'professional' && <Badge className="bg-blue-600">Active</Badge>}
                        </div>
                      </div>

                      {/* Detailed/Dark Template */}
                      <div 
                        className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${moduleSettings?.quoteTemplate === 'detailed' ? 'border-slate-500 ring-2 ring-slate-200' : 'hover:border-slate-300'}`}
                        onClick={() => handleSaveModuleSettings({ quoteTemplate: 'detailed' })}
                      >
                        <div className="aspect-[3/4] bg-white p-3 text-[8px] leading-tight">
                          {/* Header with full details */}
                          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-2 rounded-t -mx-3 -mt-3 mb-2">
                            <div className="flex justify-between">
                              <div>
                                <div className="font-bold text-xs">🪵 FloorCraft Pro</div>
                                <div className="text-[6px] text-slate-300">GSTIN: 22AAAAA0000A1Z5</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">DETAILED QUOTE</div>
                                <div className="text-[6px]">#QT-2025-001</div>
                              </div>
                            </div>
                          </div>
                          {/* Customer with GSTIN */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="border rounded p-1.5">
                              <div className="text-[6px] text-gray-400 font-bold">BILL TO</div>
                              <div className="font-medium">ABC Interiors</div>
                              <div className="text-gray-500 text-[6px]">GSTIN: 27BBBBB...</div>
                            </div>
                            <div className="border rounded p-1.5">
                              <div className="text-[6px] text-gray-400 font-bold">SITE</div>
                              <div className="font-medium">Oberoi Gardens</div>
                              <div className="text-gray-500 text-[6px]">Mumbai</div>
                            </div>
                          </div>
                          {/* Tax breakdown */}
                          <div className="text-right text-[7px] space-y-0.5">
                            <div className="flex justify-between"><span>Subtotal</span><span>₹51,750</span></div>
                            <div className="flex justify-between text-gray-500"><span>CGST @9%</span><span>₹4,658</span></div>
                            <div className="flex justify-between text-gray-500"><span>SGST @9%</span><span>₹4,658</span></div>
                            <div className="flex justify-between font-bold bg-slate-800 text-white p-1 rounded"><span>Grand Total</span><span>₹61,066</span></div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-100 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800">Detailed Dark</h4>
                            <p className="text-xs text-slate-500">GST breakdown, Full details</p>
                          </div>
                          {moduleSettings?.quoteTemplate === 'detailed' && <Badge className="bg-slate-700">Active</Badge>}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-500 mt-4">
                      <Info className="h-4 w-4 inline mr-1" />
                      Click a template to set it as your default. The selected template will be used when downloading/printing quotations.
                    </p>
                    
                    {/* Template Features Info */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div className="p-3 bg-teal-50 rounded-lg">
                        <h5 className="font-medium text-teal-800 mb-2">Premium Teal Features</h5>
                        <ul className="text-xs text-teal-600 space-y-1">
                          <li>✓ Watermark logo (5% opacity)</li>
                          <li>✓ Measurement details (B2C)</li>
                          <li>✓ Amount in words</li>
                          <li>✓ Bank details section</li>
                          <li>✓ Signature boxes</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-2">Classic Blue Features</h5>
                        <ul className="text-xs text-blue-600 space-y-1">
                          <li>✓ Company branding</li>
                          <li>✓ Customer details</li>
                          <li>✓ Item-wise pricing</li>
                          <li>✓ GST calculation</li>
                          <li>✓ Terms & conditions</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-slate-100 rounded-lg">
                        <h5 className="font-medium text-slate-800 mb-2">Detailed Dark Features</h5>
                        <ul className="text-xs text-slate-600 space-y-1">
                          <li>✓ Full GSTIN details</li>
                          <li>✓ Dark header theme</li>
                          <li>✓ CGST/SGST breakdown</li>
                          <li>✓ Site address</li>
                          <li>✓ Professional look</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-green-600" />
                      Invoice Templates
                    </CardTitle>
                    <CardDescription>Choose your invoice format (GST compliant)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { 
                          id: 'standard', 
                          name: 'Standard GST', 
                          desc: 'GST compliant format',
                          preview: ['TAX INVOICE', 'Company GSTIN', 'Invoice #: INV-001', '---', 'Customer Details', 'Billing Address', '---', 'HSN | Qty | Rate', 'CGST | SGST | IGST', '---', 'Total: ₹1,47,500', 'Bank Details']
                        },
                        { 
                          id: 'detailed', 
                          name: 'Detailed', 
                          desc: 'Full product breakdown',
                          preview: ['TAX INVOICE', 'Multiple Addresses', '---', 'Product Images', 'Specifications', 'Per-item Tax', '---', 'CGST @ 9%', 'SGST @ 9%', '---', 'Terms', 'QR Code']
                        },
                        { 
                          id: 'premium', 
                          name: 'Premium', 
                          desc: 'Executive presentation',
                          preview: ['PREMIUM INVOICE', 'Branded Header', '---', 'Customer Profile', '---', 'Gallery View', 'Detailed Specs', '---', 'Tax Breakdown', 'Digital Signature', 'Payment QR']
                        }
                      ].map(template => (
                        <div 
                          key={template.id} 
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${moduleSettings?.invoiceTemplate === template.id ? 'border-green-500 bg-green-50' : 'hover:border-green-300 hover:bg-slate-50'}`}
                          onClick={() => handleSaveModuleSettings({ invoiceTemplate: template.id })}
                        >
                          <div className="aspect-[3/4] bg-white border rounded-lg mb-3 p-3 text-xs">
                            {template.preview.map((line, i) => (
                              <div key={i} className={line === '---' ? 'border-t my-1' : 'text-slate-500 truncate'}>{line !== '---' && line}</div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-slate-500">{template.desc}</p>
                            </div>
                            {moduleSettings?.invoiceTemplate === template.id && (
                              <Badge className="bg-green-600">Active</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Template Instructions */}
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-amber-900">How Templates Work</p>
                        <ul className="text-sm text-amber-700 mt-1 space-y-1">
                          <li>• Click on a template to set it as your default</li>
                          <li>• Quote templates apply when creating new quotations</li>
                          <li>• Invoice templates apply to all generated invoices</li>
                          <li>• All templates are GST compliant with CGST/SGST/IGST support</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
    // Filter to show only B2C projects
    const b2cProjects = projects.filter(p => p.segment === 'b2c' || !p.segment)
    
    // Get inventory data for products
    const inventoryMap = new Map()
    if (inventory?.inventory) {
      inventory.inventory.forEach(inv => {
        inventoryMap.set(inv.productId, inv)
      })
    }

    // Get inventory for a product
    const getProductInventory = (productId) => {
      const inv = inventoryMap.get(productId)
      return {
        totalQty: inv?.quantity || 0,
        availableQty: inv?.availableQty || 0,
        reservedQty: inv?.reservedQty || 0,
        reorderLevel: inv?.reorderLevel || 100
      }
    }

    // Get inventory status
    const getInventoryStatus = (productId, requiredQty = 0) => {
      const inv = getProductInventory(productId)
      if (inv.availableQty <= 0) return { status: 'out_of_stock', color: 'text-red-600 bg-red-50', label: 'Out of Stock' }
      if (requiredQty > 0 && inv.availableQty < requiredQty) return { status: 'insufficient', color: 'text-amber-600 bg-amber-50', label: 'Insufficient' }
      if (inv.availableQty <= inv.reorderLevel) return { status: 'low_stock', color: 'text-amber-600 bg-amber-50', label: 'Low Stock' }
      return { status: 'in_stock', color: 'text-emerald-600 bg-emerald-50', label: 'In Stock' }
    }

    // If no project selected, show project selection
    if (!selectedProject || selectedProject.segment === 'b2b') {
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Room Measurements</h3>
              <p className="text-sm text-muted-foreground">Manage measurements for B2C consumer projects</p>
            </div>
            {/* Inventory Summary */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm">
              <Warehouse className="h-4 w-4 text-slate-600" />
              <span className="text-slate-600">Stock:</span>
              <span className="font-semibold">{inventory?.summary?.totalQuantity?.toLocaleString() || 0}</span>
              <span className="text-slate-400">|</span>
              <span className="text-emerald-600">Avail: {inventory?.summary?.availableQuantity?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="h-5 w-5 text-cyan-600" />
                Select a B2C Project
              </CardTitle>
              <CardDescription>Choose a B2C project to add or manage room measurements</CardDescription>
            </CardHeader>
            <CardContent>
              {b2cProjects.length > 0 ? (
                <div className="grid gap-3">
                  {b2cProjects.map(project => (
                    <div 
                      key={project.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-cyan-500 hover:bg-cyan-50 ${selectedProject?.id === project.id ? 'border-cyan-500 bg-cyan-50' : ''}`}
                      onClick={() => {
                        setSelectedProject(project)
                        fetchInventory() // Refresh inventory when selecting project
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{project.projectNumber}</p>
                          <p className="text-sm text-muted-foreground">{project.customerName || project.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {project.rooms?.length > 0 && (
                              <span className="text-xs text-cyan-600">
                                <Ruler className="h-3 w-3 inline mr-1" />
                                {project.rooms.length} rooms • {project.totalArea || 0} sqft
                              </span>
                            )}
                            {project.measurementDetails?.technicianName && (
                              <span className="text-xs text-purple-600">
                                <Users className="h-3 w-3 inline mr-1" />
                                {project.measurementDetails.technicianName}
                              </span>
                            )}
                            {project.measurementDetails?.inventoryBlocked && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                                <Lock className="h-3 w-3 mr-1" /> Inventory Blocked
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={ProjectStatusB2C[project.status]?.color || 'bg-slate-100'}>
                            {ProjectStatusB2C[project.status]?.label || project.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ruler className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground">No B2C projects found</p>
                  <Button className="mt-4" onClick={() => setActiveTab('projects')}>
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    const rooms = selectedProject.rooms || []
    const totalArea = rooms.reduce((sum, r) => sum + (r.netArea || 0), 0)
    const measurementDetails = selectedProject.measurementDetails || {}

    // Calculate totals for selected products
    const getSelectedProductsTotal = () => {
      return Object.values(measurementProducts).reduce((sum, item) => {
        if (item.selected) {
          const price = item.product?.price || item.product?.pricing?.sellingPrice || 0
          return sum + (price * (item.quantity || totalArea))
        }
        return sum
      }, 0)
    }

    // Check inventory availability
    const checkMeasurementInventory = () => {
      const insufficientItems = []
      Object.values(measurementProducts).forEach(item => {
        if (item.selected) {
          const inv = getProductInventory(item.product.id)
          const requiredQty = item.quantity || totalArea
          if (inv.availableQty < requiredQty) {
            insufficientItems.push({
              product: item.product.name,
              required: requiredQty,
              available: inv.availableQty
            })
          }
        }
      })
      return { allAvailable: insufficientItems.length === 0, insufficientItems }
    }

    // Reserve inventory for measurement
    const reserveInventoryForMeasurement = async () => {
      const items = Object.values(measurementProducts).filter(item => item.selected)
      for (const item of items) {
        await fetch('/api/flooring/enhanced/inventory', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'reserve',
            productId: item.product.id,
            quantity: item.quantity || totalArea,
            orderId: selectedProject.id,
            notes: `Reserved for measurement - ${selectedProject.projectNumber}`
          })
        })
      }
    }

    // Release inventory
    const releaseInventoryForMeasurement = async () => {
      const items = measurementDetails.selectedProducts ? Object.values(measurementDetails.selectedProducts).filter(item => item.selected) : []
      for (const item of items) {
        await fetch('/api/flooring/enhanced/inventory', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'release',
            productId: item.product?.id || item.productId,
            quantity: item.quantity || totalArea,
            orderId: selectedProject.id,
            notes: `Released from measurement - ${selectedProject.projectNumber}`
          })
        })
      }
    }

    // Save measurement details
    const saveMeasurementDetails = async (blockInventory = false) => {
      try {
        setLoading(true)

        if (!technicianName.trim()) {
          toast.error('Please enter technician/person name')
          return false
        }

        const hasSelectedProducts = Object.values(measurementProducts).some(p => p.selected)
        
        if (blockInventory && hasSelectedProducts) {
          const { allAvailable, insufficientItems } = checkInventoryAvailability()
          if (!allAvailable) {
            toast.error(`Insufficient inventory: ${insufficientItems.map(i => i.product).join(', ')}`)
            return false
          }
          await reserveInventoryForMeasurement()
        }

        const details = {
          technicianName,
          measurementDate,
          notes: measurementNotes,
          selectedProducts: measurementProducts,
          inventoryBlocked: blockInventory && hasSelectedProducts,
          blockedAt: blockInventory ? new Date().toISOString() : null,
          auditTrail: [
            ...(measurementDetails.auditTrail || []),
            {
              action: blockInventory ? 'measurement_completed' : 'measurement_updated',
              by: technicianName,
              at: new Date().toISOString(),
              details: `${rooms.length} rooms, ${totalArea.toFixed(0)} sqft, ${Object.values(measurementProducts).filter(p => p.selected).length} products`
            }
          ]
        }

        const res = await fetch('/api/flooring/enhanced/projects', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: selectedProject.id,
            measurementDetails: details,
            totalArea
          })
        })

        if (res.ok) {
          setSelectedProject(prev => ({ ...prev, measurementDetails: details, totalArea }))
          fetchProjects()
          if (blockInventory) fetchInventory()
          return true
        }
        return false
      } catch (error) {
        console.error('Save measurement error:', error)
        toast.error('Failed to save measurement details')
        return false
      } finally {
        setLoading(false)
      }
    }

    // Create quote from measurement
    const createQuoteFromMeasurement = async () => {
      try {
        setLoading(true)

        const selectedItems = Object.values(measurementProducts).filter(p => p.selected)
        if (selectedItems.length === 0) {
          toast.error('Please select at least one product for the quote')
          return
        }

        // Calculate totals
        const items = selectedItems.map(item => ({
          itemType: 'material',
          productId: item.product.id,
          name: item.product.name,
          sku: item.product.sku || '',
          description: item.product.description || '',
          quantity: item.quantity || totalArea,
          unit: item.product.unit || 'sqft',
          unitPrice: item.product.price || item.product.pricing?.sellingPrice || 0,
          totalPrice: (item.product.price || item.product.pricing?.sellingPrice || 0) * (item.quantity || totalArea),
          area: item.quantity || totalArea
        }))

        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)

        // Add labor if any rooms have installation
        const laborItem = {
          itemType: 'labor',
          name: 'Installation Labor',
          description: `Installation for ${rooms.length} rooms (${totalArea.toFixed(0)} sqft)`,
          quantity: totalArea,
          unit: 'sqft',
          unitPrice: 25, // Default labor rate
          totalPrice: totalArea * 25,
          area: totalArea
        }
        items.push(laborItem)

        const quoteData = {
          projectId: selectedProject.id,
          projectNumber: selectedProject.projectNumber,
          customer: {
            id: selectedProject.customerId,
            name: selectedProject.customerName,
            email: selectedProject.customerEmail || '',
            phone: selectedProject.customerPhone || ''
          },
          site: {
            address: selectedProject.site?.address || selectedProject.siteAddress || '',
            city: selectedProject.site?.city || '',
            state: selectedProject.site?.state || ''
          },
          items,
          totalArea,
          rooms: rooms.map(r => ({ name: r.roomName, area: r.netArea, type: r.roomType })),
          template: 'professional',
          discountType: 'fixed',
          discountValue: 0,
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 0,
          isInterstate: false,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paymentTerms: 'Net 30',
          notes: `Quote for ${selectedProject.customerName}\nMeasurement by: ${technicianName}\nDate: ${measurementDate}\n${measurementNotes}`
        }

        const res = await fetch('/api/flooring/enhanced/quotes', {
          method: 'POST',
          headers,
          body: JSON.stringify(quoteData)
        })

        if (res.ok) {
          const newQuote = await res.json()
          
          // Update project status
          await handleUpdateProjectStatus(selectedProject.id, 'quote_pending')
          setSelectedProject(prev => ({ ...prev, status: 'quote_pending' }))
          
          // Add to audit trail
          const updatedDetails = {
            ...selectedProject.measurementDetails,
            auditTrail: [
              ...(selectedProject.measurementDetails?.auditTrail || []),
              {
                action: 'quote_created',
                by: technicianName || user?.name || 'System',
                at: new Date().toISOString(),
                details: `Quote ${newQuote.data?.quoteNumber || ''} created for ₹${(subtotal + laborItem.totalPrice).toLocaleString()}`
              }
            ]
          }
          await fetch('/api/flooring/enhanced/projects', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ id: selectedProject.id, measurementDetails: updatedDetails })
          })
          
          fetchQuotes()
          setActiveTab('quotes')
          toast.success('Quote created successfully!')
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to create quote')
        }
      } catch (error) {
        console.error('Create quote error:', error)
        toast.error('Error creating quote')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="space-y-4">
        {/* Project Info Header */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedProject(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Change Project
              </Button>
              <div>
                <h3 className="font-semibold text-lg">{selectedProject.projectNumber}</h3>
                <p className="text-sm text-slate-500">{selectedProject.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-4 border-r">
                <p className="text-2xl font-bold text-cyan-600">{rooms.length}</p>
                <p className="text-sm text-slate-500">Rooms</p>
              </div>
              <div className="text-center px-4 border-r">
                <p className="text-2xl font-bold text-emerald-600">{totalArea.toFixed(0)}</p>
                <p className="text-sm text-slate-500">Total Sqft</p>
              </div>
              <div className={`text-center px-4 rounded-lg py-2 ${measurementDetails.inventoryBlocked ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <Badge className={ProjectStatusB2C[selectedProject.status]?.color || 'bg-slate-100'}>
                  {ProjectStatusB2C[selectedProject.status]?.label || selectedProject.status}
                </Badge>
                {measurementDetails.inventoryBlocked && (
                  <p className="text-xs text-amber-600 mt-1"><Lock className="h-3 w-3 inline" /> Stock Blocked</p>
                )}
              </div>
              {/* Only show Add Room when editing is allowed */}
              {['pending', 'measurement_scheduled'].includes(selectedProject.status) && (
                <Button onClick={() => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Room
                </Button>
              )}
              {!['pending', 'measurement_scheduled'].includes(selectedProject.status) && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <Lock className="h-3 w-3 mr-1" /> Locked
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Technician/Person Details Card */}
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <Users className="h-4 w-4" /> Measurement Person Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-purple-700">Technician/Person Name *</Label>
                <Input 
                  placeholder="Enter person name"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-purple-700">Measurement Date</Label>
                <Input 
                  type="date"
                  value={measurementDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selectedDate = e.target.value
                    if (new Date(selectedDate) < new Date(new Date().toISOString().split('T')[0])) {
                      toast.error('Backdate measurement is not allowed')
                      return
                    }
                    setMeasurementDate(selectedDate)
                  }}
                  className="bg-white"
                />
                <p className="text-xs text-slate-500">* Backdates not allowed</p>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-purple-700">Notes</Label>
                <Input 
                  placeholder="Any special notes..."
                  value={measurementNotes}
                  onChange={(e) => setMeasurementNotes(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            {/* Audit Trail */}
            {measurementDetails.auditTrail?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-xs font-medium text-purple-700 mb-2">Audit Trail:</p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {measurementDetails.auditTrail.slice(-3).reverse().map((entry, idx) => (
                    <div key={idx} className="text-xs text-purple-600 flex items-center gap-2">
                      <History className="h-3 w-3" />
                      <span>{new Date(entry.at).toLocaleString()}</span>
                      <span className="font-medium">{entry.by}</span>
                      <span>- {entry.action.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rooms Grid */}
        {rooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => {
              const appTypeIcons = {
                flooring: { icon: '🪵', color: 'bg-amber-100', textColor: 'text-amber-700' },
                cladding: { icon: '🧱', color: 'bg-slate-100', textColor: 'text-slate-700' },
                decking: { icon: '🏡', color: 'bg-green-100', textColor: 'text-green-700' },
                ceiling: { icon: '⬆️', color: 'bg-blue-100', textColor: 'text-blue-700' },
                staircase: { icon: '🪜', color: 'bg-purple-100', textColor: 'text-purple-700' }
              }
              const appType = appTypeIcons[room.applicationType] || appTypeIcons.flooring
              
              // Check if editing is allowed (only in scheduling phase)
              const isEditingAllowed = ['pending', 'measurement_scheduled'].includes(selectedProject.status)
              const isLocked = !isEditingAllowed
              
              return (
                <Card key={room.id} className={`overflow-hidden transition-shadow ${isLocked ? 'opacity-70 bg-slate-50' : 'hover:shadow-lg'}`}>
                  {isLocked && (
                    <div className="bg-amber-100 px-3 py-1 flex items-center gap-2 text-xs text-amber-700">
                      <Lock className="h-3 w-3" />
                      <span>Locked - Click "Edit Measurements" to modify</span>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${appType.color}`}>
                          <span className="text-xl">{appType.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{room.roomName}</h3>
                          <p className="text-sm text-slate-500">{room.roomType?.replace(/_/g, ' ') || 'Room'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{room.floor || 'Ground'}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-lg font-bold">{room.dimensions?.length || 0}'</p>
                        <p className="text-xs text-slate-500">Length</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-lg font-bold">{room.dimensions?.width || 0}'</p>
                        <p className="text-xs text-slate-500">Width</p>
                      </div>
                      <div className={`p-2 rounded-lg ${appType.color}`}>
                        <p className={`text-lg font-bold ${appType.textColor}`}>{(room.netArea || 0).toFixed(0)}</p>
                        <p className="text-xs text-slate-500">Sq.ft</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-slate-500">{room.subfloorType || 'Concrete'}</span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isLocked}
                          onClick={() => setDialogOpen({ type: 'room', data: room })}
                        >
                          <Edit className={`h-4 w-4 ${isLocked ? 'text-slate-300' : ''}`} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isLocked}
                          onClick={() => {
                            if (confirm('Delete this room?')) handleDeleteRoom(room.id)
                          }}
                        >
                          <Trash2 className={`h-4 w-4 ${isLocked ? 'text-slate-300' : 'text-red-500'}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Ruler}
            title={['pending', 'measurement_scheduled'].includes(selectedProject.status) ? "No rooms measured" : "Measurement Locked"}
            description={['pending', 'measurement_scheduled'].includes(selectedProject.status) ? "Add room measurements for this project." : "Click 'Edit Measurements' in workflow to add/modify rooms."}
            action={['pending', 'measurement_scheduled'].includes(selectedProject.status) ? () => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } }) : null}
            actionLabel={['pending', 'measurement_scheduled'].includes(selectedProject.status) ? "Add Room" : null}
          />
        )}

        {/* Product Selection with Inventory - Show when rooms exist */}
        {rooms.length > 0 && (
          <Card className="border-2 border-cyan-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-cyan-800">
                    <Package className="h-4 w-4" /> Select Products for Quote (with Real-time Inventory)
                  </CardTitle>
                  <CardDescription>Select flooring products. Inventory will be blocked when measurement is marked done.</CardDescription>
                </div>
                {/* Material to be decided later toggle */}
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
                  <Checkbox
                    id="materialDecideLater"
                    checked={materialDecideLater}
                    onCheckedChange={(checked) => {
                      setMaterialDecideLater(checked)
                      if (checked) {
                        // Clear any selected products
                        setMeasurementProducts({})
                      }
                    }}
                  />
                  <Label htmlFor="materialDecideLater" className="text-sm font-medium text-amber-700 cursor-pointer">
                    Material to be decided later
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {materialDecideLater ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-amber-800 mb-2">Material Selection Deferred</h4>
                  <p className="text-sm text-amber-700 max-w-md mx-auto">
                    No products will be selected at this time. You can add materials later and create a quote when the customer decides on the flooring material.
                  </p>
                  <p className="text-xs text-amber-600 mt-3">
                    <Info className="h-3 w-3 inline mr-1" />
                    Inventory will NOT be blocked for this project
                  </p>
                </div>
              ) : (
              <>
                {/* Search and Product Dropdown */}
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search products by name, SKU, category..."
                      value={productSearchTerm || ''}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Product Dropdown List - Top 7 with scroll */}
                  <div className="border rounded-lg max-h-72 overflow-y-auto">
                    {(() => {
                      const searchTerm = (productSearchTerm || '').toLowerCase()
                      const filteredProducts = products.filter(p => 
                        p.name?.toLowerCase().includes(searchTerm) ||
                        p.sku?.toLowerCase().includes(searchTerm) ||
                        p.category?.toLowerCase().includes(searchTerm)
                      )
                      // Show top 7 or filtered results
                      const displayProducts = searchTerm ? filteredProducts : filteredProducts.slice(0, 7)
                      
                      if (displayProducts.length === 0) {
                        return (
                          <div className="p-4 text-center text-slate-500">
                            <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p>No products found</p>
                          </div>
                        )
                      }
                      
                      return (
                        <div className="divide-y">
                          {displayProducts.map(product => {
                            const isSelected = measurementProducts[product.id]?.selected
                            const quantity = measurementProducts[product.id]?.quantity || totalArea
                            const price = product.price || product.pricing?.sellingPrice || 0
                            const inv = getProductInventory(product.id)
                            const invStatus = getInventoryStatus(product.id, isSelected ? quantity : 0)
                            
                            return (
                              <div 
                                key={product.id} 
                                className={`flex items-center justify-between p-3 transition-all cursor-pointer ${isSelected ? 'bg-cyan-50 border-l-4 border-l-cyan-500' : 'hover:bg-slate-50'} ${invStatus.status === 'out_of_stock' ? 'opacity-60' : ''}`}
                                onClick={() => {
                                  if (invStatus.status !== 'out_of_stock') {
                                    setMeasurementProducts(prev => ({
                                      ...prev,
                                      [product.id]: {
                                        product,
                                        quantity: totalArea,
                                        selected: !prev[product.id]?.selected
                                      }
                                    }))
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      setMeasurementProducts(prev => ({
                                        ...prev,
                                        [product.id]: {
                                          product,
                                          quantity: totalArea,
                                          selected: checked
                                        }
                                      }))
                                    }}
                                    disabled={invStatus.status === 'out_of_stock'}
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{product.name}</p>
                                    <p className="text-xs text-slate-500">{product.sku} • {product.category} • ₹{price}/sqft</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right text-xs">
                                    <span className={`${inv.availableQty > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {inv.availableQty.toLocaleString()} avail
                                    </span>
                                  </div>
                                  <Badge className={`text-xs ${invStatus.color}`}>{invStatus.label}</Badge>
                                </div>
                              </div>
                            )
                          })}
                          {!searchTerm && filteredProducts.length > 7 && (
                            <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                              Showing top 7 • Search to see more ({filteredProducts.length} total)
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* Selected Products Summary */}
                  {Object.values(measurementProducts).some(p => p.selected) && (
                    <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-cyan-800">
                          Selected Products ({Object.values(measurementProducts).filter(p => p.selected).length})
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setMeasurementProducts({})}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {Object.values(measurementProducts).filter(p => p.selected).map(item => {
                          const price = item.product.price || item.product.pricing?.sellingPrice || 0
                          return (
                            <div key={item.product.id} className="flex items-center justify-between bg-white rounded px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 text-red-500"
                                  onClick={() => {
                                    setMeasurementProducts(prev => {
                                      const updated = { ...prev }
                                      delete updated[item.product.id]
                                      return updated
                                    })
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium">{item.product.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  className="w-20 h-7 text-sm"
                                  value={item.quantity}
                                  min="1"
                                  onChange={(e) => {
                                    setMeasurementProducts(prev => ({
                                      ...prev,
                                      [item.product.id]: {
                                        ...prev[item.product.id],
                                        quantity: parseInt(e.target.value) || totalArea
                                      }
                                    }))
                                  }}
                                />
                                <span className="text-xs text-slate-500">sqft</span>
                                <span className="text-sm font-semibold text-emerald-600 w-24 text-right">
                                  ₹{(price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-700">Material Total:</span>
                        <span className="text-lg font-bold text-cyan-800">₹{getSelectedProductsTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Workflow Progress & Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">B2C Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              {[
                { status: 'measurement_scheduled', label: 'Scheduled', icon: Calendar },
                { status: 'measurement_done', label: 'Measured', icon: Ruler },
                { status: 'quote_pending', label: 'Quote', icon: FileText },
                { status: 'invoice_sent', label: 'Invoice', icon: Receipt },
                { status: 'installation_scheduled', label: 'Install', icon: Wrench },
                { status: 'completed', label: 'Complete', icon: CheckCircle2 }
              ].map((step, idx) => {
                const statusOrder = ['pending', 'measurement_scheduled', 'measurement_done', 'quote_pending', 'quote_sent', 'quote_approved', 'invoice_sent', 'payment_received', 'installation_scheduled', 'installation_in_progress', 'completed']
                const currentIdx = statusOrder.indexOf(selectedProject.status)
                const stepIdx = statusOrder.indexOf(step.status)
                const isActive = currentIdx >= stepIdx
                const Icon = step.icon
                return (
                  <div key={step.status} className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${isActive ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-xs ${isActive ? 'text-cyan-600 font-medium' : 'text-slate-400'}`}>{step.label}</span>
                    {idx < 5 && <div className={`w-8 h-0.5 ${isActive ? 'bg-cyan-600' : 'bg-slate-200'}`} />}
                  </div>
                )
              })}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-3 border-t">
              {(() => {
                const status = selectedProject.status
                const hasRooms = rooms.length > 0
                const hasProducts = Object.values(measurementProducts).some(p => p.selected)
                const isInventoryBlocked = measurementDetails.inventoryBlocked

                // Inventory already blocked - show edit/proceed options
                if (isInventoryBlocked) {
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          variant="outline"
                          disabled={loading}
                          onClick={async () => {
                            setLoading(true)
                            await releaseInventoryForMeasurement()
                            const updatedDetails = { ...measurementDetails, inventoryBlocked: false }
                            await fetch('/api/flooring/enhanced/projects', {
                              method: 'PUT',
                              headers,
                              body: JSON.stringify({ id: selectedProject.id, measurementDetails: updatedDetails, status: 'measurement_scheduled' })
                            })
                            setSelectedProject(prev => ({ ...prev, status: 'measurement_scheduled', measurementDetails: updatedDetails }))
                            fetchInventory()
                            fetchProjects()
                            setLoading(false)
                            toast.success('Inventory released. You can now edit the measurement.')
                          }}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Edit (Release Inventory)
                        </Button>
                        {status === 'measurement_done' && (
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={loading || !hasProducts}
                            onClick={createQuoteFromMeasurement}
                          >
                            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                            Create Quote (₹{(getSelectedProductsTotal() + totalArea * 25).toLocaleString()})
                          </Button>
                        )}
                        {['quote_pending', 'quote_sent'].includes(status) && (
                          <Button onClick={() => setActiveTab('quotes')}>
                            <FileText className="h-4 w-4 mr-2" /> View Quotes
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Inventory is blocked. Click "Edit" to release and modify.
                      </p>
                    </div>
                  )
                }

                // Not blocked - show normal flow
                if (status === 'measurement_scheduled' || status === 'pending') {
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          variant="outline"
                          onClick={() => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } })}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Room
                        </Button>
                        <Button 
                          variant="outline"
                          disabled={loading || !technicianName.trim()}
                          onClick={async () => {
                            const saved = await saveMeasurementDetails(false)
                            if (saved) toast.success('Details saved')
                          }}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Save Details
                        </Button>
                        <Button 
                          className="bg-cyan-600 hover:bg-cyan-700"
                          disabled={!hasRooms || loading}
                          onClick={async () => {
                            // Validate technician name first
                            if (!technicianName.trim()) {
                              toast.error('Please enter Technician/Visit Person name first')
                              return
                            }
                            const saved = await saveMeasurementDetails(true) // Block inventory
                            if (saved) {
                              await handleUpdateProjectStatus(selectedProject.id, 'measurement_done')
                              setSelectedProject(prev => ({ ...prev, status: 'measurement_done' }))
                              toast.success('Measurement completed! Inventory blocked.')
                            }
                          }}
                        >
                          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                          Complete Measurement & Block Inventory
                        </Button>
                      </div>
                      {!technicianName.trim() && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <p className="text-sm text-red-600 font-medium">Please enter Technician/Visit Person Name above to proceed.</p>
                        </div>
                      )}
                      {!hasRooms && (
                        <p className="text-sm text-slate-500">Add at least one room measurement.</p>
                      )}
                    </div>
                  )
                }

                if (status === 'measurement_done') {
                  // Can create quote if either has products OR materialDecideLater is checked
                  const canCreateQuote = hasProducts || materialDecideLater
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          variant="outline"
                          onClick={async () => {
                            await handleUpdateProjectStatus(selectedProject.id, 'measurement_scheduled')
                            setSelectedProject(prev => ({ ...prev, status: 'measurement_scheduled' }))
                            toast.info('Reverted to scheduled. You can edit.')
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit Measurements
                        </Button>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={loading || !canCreateQuote}
                          onClick={createQuoteFromMeasurement}
                        >
                          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                          Create Quote ({totalArea.toFixed(0)} sqft)
                        </Button>
                      </div>
                      {!canCreateQuote && (
                        <p className="text-sm text-amber-600">Select products above or check "Material to be decided later" to create a quote.</p>
                      )}
                    </div>
                  )
                }

                if (['quote_pending', 'quote_sent', 'quote_approved'].includes(status)) {
                  // Check if quote already exists for this project
                  const projectQuotes = quotes.filter(q => q.projectId === selectedProject.id)
                  const hasExistingQuote = projectQuotes.length > 0
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <Button variant="outline" onClick={async () => {
                          await handleUpdateProjectStatus(selectedProject.id, 'measurement_done')
                          setSelectedProject(prev => ({ ...prev, status: 'measurement_done' }))
                        }}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Measurements
                        </Button>
                        
                        {!hasExistingQuote ? (
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={loading || (!hasProducts && !materialDecideLater)}
                            onClick={createQuoteFromMeasurement}
                          >
                            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                            Create Quote
                          </Button>
                        ) : (
                          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab('quotes')}>
                            <FileText className="h-4 w-4 mr-2" /> View Quotes ({projectQuotes.length})
                          </Button>
                        )}
                        
                        {status === 'quote_approved' && hasExistingQuote && (
                          <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => {
                            const approvedQuote = projectQuotes.find(q => q.status === 'approved')
                            if (approvedQuote) {
                              handleCreateInvoiceFromQuote(approvedQuote)
                            } else {
                              toast.error('No approved quote found')
                            }
                          }}>
                            <Receipt className="h-4 w-4 mr-2" /> Proceed to Invoice
                          </Button>
                        )}
                      </div>
                      
                      {!hasExistingQuote && !hasProducts && !materialDecideLater && (
                        <p className="text-sm text-amber-600">Select products above or check "Material to be decided later" to create a quote.</p>
                      )}
                    </div>
                  )
                }

                return null
              })()}
            </div>
          </CardContent>
        </Card>
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
          crmContacts={crmContacts}
          onSave={handleSaveProject}
          loading={loading}
          onAddContact={() => {
            // Navigate to CRM contacts - open in new tab
            window.open('/?tab=contacts', '_blank')
          }}
        />

        {/* View Project Dialog */}
        <ViewProjectDialog
          open={type === 'view_project'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          project={data}
          onSendForQuotation={handleSendForQuotation}
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

        {/* Room Measurement Dialog */}
        <RoomMeasurementDialog
          open={type === 'room'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          room={data}
          project={selectedProject}
          onSave={handleSaveRoom}
          loading={loading}
        />

        {/* View Quote Dialog - Using Refactored Component */}
        <ViewQuoteDialogNew
          open={type === 'view_quote'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          quote={data}
          moduleSettings={moduleSettings}
          onDownload={handleDownloadQuote}
          onEdit={(quote) => setDialogOpen({ type: 'quote', data: quote })}
          onApprove={(quoteId) => handleQuoteStatusChange(quoteId, 'approved')}
          onReject={(quoteId) => handleQuoteStatusChange(quoteId, 'rejected')}
          onCreateInvoice={handleCreateInvoiceFromQuote}
        />

        {/* Quote Edit Dialog - Using Refactored Component */}
        <QuoteEditDialogNew
          open={type === 'quote'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          quote={data}
          projects={projects}
          products={products}
          moduleSettings={moduleSettings}
          onSave={handleSaveQuote}
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
            {selectedProject && selectedProject.segment !== 'b2b' && <Badge variant="secondary" className="ml-1 text-xs">{selectedProject.projectNumber}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" /> Materials
            {selectedProject && selectedProject.segment === 'b2b' && <Badge variant="secondary" className="ml-1 text-xs">{selectedProject.projectNumber}</Badge>}
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
          <TabsContent value="materials">{renderMaterials()}</TabsContent>
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

function ProjectDialog({ open, onClose, project, customers, crmContacts, onSave, loading, onAddContact }) {
  const [form, setForm] = useState({
    name: '', customerId: '', customerName: '', type: 'residential', segment: 'b2c', flooringType: 'hardwood',
    siteAddress: '', siteCity: '', siteState: '', sitePincode: '', estimatedValue: 0, notes: ''
  })

  // Filter to show only customer-type contacts from CRM
  const customerContacts = (crmContacts || []).filter(c => c.type === 'customer')

  useEffect(() => {
    if (project) {
      setForm({
        ...project,
        segment: project.segment || 'b2c',
        siteAddress: project.site?.address || '',
        siteCity: project.site?.city || '',
        siteState: project.site?.state || '',
        sitePincode: project.site?.pincode || ''
      })
    } else {
      setForm({
        name: '', customerId: '', customerName: '', type: 'residential', segment: 'b2c', flooringType: 'hardwood',
        siteAddress: '', siteCity: '', siteState: '', sitePincode: '', estimatedValue: 0, notes: ''
      })
    }
  }, [project, open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>Project will be synced to CRM automatically</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Customer Selection - Uses CRM Contacts */}
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <Label className="text-blue-800 font-semibold">Customer * (from CRM Contacts)</Label>
              {onAddContact && (
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onAddContact}>
                  <Plus className="h-3 w-3 mr-1" /> Add Contact
                </Button>
              )}
            </div>
            <Select value={form.customerId} onValueChange={(v) => {
              const cust = customerContacts.find(c => c.id === v)
              setForm({ 
                ...form, 
                customerId: v, 
                customerName: cust?.displayName || cust?.name || '',
                // Auto-fill address from contact if available
                siteAddress: cust?.billingAddress || cust?.address || form.siteAddress,
                siteCity: cust?.city || form.siteCity,
                siteState: cust?.state || form.siteState,
                sitePincode: cust?.pincode || form.sitePincode
              })
            }}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Select from CRM Contacts" /></SelectTrigger>
              <SelectContent>
                {customerContacts.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No customers found. Add a contact in CRM first.
                  </div>
                ) : (
                  customerContacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.displayName || c.name}</span>
                        {c.company && <span className="text-xs text-muted-foreground">({c.company})</span>}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.customerId && (() => {
              const c = customerContacts.find(c => c.id === form.customerId)
              return c ? (
                <div className="text-xs text-blue-600 mt-1 space-y-0.5">
                  {c.email && <p>📧 {c.email}</p>}
                  {c.phone && <p>📱 {c.phone}</p>}
                  {c.gstin && <p>🏢 GSTIN: {c.gstin}</p>}
                </div>
              ) : null
            })()}
          </div>

          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-generated if empty" />
          </div>

          {/* B2B / B2C Segment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Segment *</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2c">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      B2C (Consumer) - Measurement + Installation
                    </div>
                  </SelectItem>
                  <SelectItem value="b2b">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      B2B (Dealer) - Direct Quote
                    </div>
                  </SelectItem>
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
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
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

function ViewProjectDialog({ open, onClose, project, onSendForQuotation, onUpdateStatus }) {
  if (!project) return null

  const statusColors = {
    site_visit_pending: 'bg-blue-100 text-blue-700 border-blue-200',
    measurement_done: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    quote_sent: 'bg-purple-100 text-purple-700 border-purple-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200'
  }

  const statusLabels = {
    site_visit_pending: 'Site Visit Pending',
    measurement_done: 'Measurement Done',
    quote_sent: 'Quote Sent',
    approved: 'Approved',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{project.projectNumber}</DialogTitle>
              <DialogDescription>{project.name}</DialogDescription>
            </div>
            <Badge className={statusColors[project.status] || 'bg-slate-100 text-slate-700'}>
              {statusLabels[project.status] || project.status}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Customer & Project Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500 text-xs uppercase">Customer</Label>
                <p className="font-medium">{project.customerName || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">Project Type</Label>
                <p className="font-medium capitalize">{project.type || 'Residential'}</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">Flooring Type</Label>
                <p className="font-medium capitalize">{project.flooringType?.replace('_', ' ') || '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500 text-xs uppercase">Total Area</Label>
                <p className="font-medium">{project.totalArea || 0} sqft</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">Estimated Value</Label>
                <p className="font-medium text-emerald-600">₹{(project.estimatedValue || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs uppercase">Rooms</Label>
                <p className="font-medium">{project.roomCount || 0} rooms</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Site Address */}
          <div>
            <Label className="text-slate-500 text-xs uppercase mb-2 block">Site Address</Label>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm">
                {project.site?.address || project.siteAddress || 'No address provided'}
                {(project.site?.city || project.siteCity) && (
                  <>, {project.site?.city || project.siteCity}</>
                )}
                {(project.site?.state || project.siteState) && (
                  <>, {project.site?.state || project.siteState}</>
                )}
                {(project.site?.pincode || project.sitePincode) && (
                  <> - {project.site?.pincode || project.sitePincode}</>
                )}
              </p>
            </div>
          </div>

          {/* Status History */}
          {project.statusHistory && project.statusHistory.length > 0 && (
            <div>
              <Label className="text-slate-500 text-xs uppercase mb-2 block">Status History</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {project.statusHistory.slice().reverse().map((history, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <span className="font-medium">{statusLabels[history.status] || history.status}</span>
                      {history.notes && <span className="text-slate-500 ml-2">- {history.notes}</span>}
                    </div>
                    <span className="text-slate-400 text-xs">
                      {new Date(history.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRM Sync Status */}
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {project.crmProjectId ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">Synced to CRM</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">Not synced to CRM</span>
                  </>
                )}
              </div>
              {project.crmProjectId && (
                <span className="text-xs text-slate-500">CRM ID: {project.crmProjectId}</span>
              )}
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div>
              <Label className="text-slate-500 text-xs uppercase mb-2 block">Notes</Label>
              <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">{project.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {project.status === 'approved' && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                onSendForQuotation(project)
                onClose()
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Quotation
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
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

// Advanced Room Measurement Dialog
// Simple Canvas Drawing Component for Room Sketches
function RoomDrawingCanvas({ width, height, obstacles, onDrawingComplete }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState('pen') // pen, eraser, rect
  const [color, setColor] = useState('#3b82f6')
  const [brushSize, setBrushSize] = useState(3)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    const gridSize = 20
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    // Draw room border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
  }, [])

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    // Save canvas state
    const canvas = canvasRef.current
    if (canvas) {
      setHistory(prev => [...prev, canvas.toDataURL()])
      if (onDrawingComplete) {
        onDrawingComplete(canvas.toDataURL())
      }
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Redraw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    const gridSize = 20
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    // Redraw room border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
  }

  const undo = () => {
    if (history.length > 0) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      const newHistory = [...history]
      newHistory.pop()
      setHistory(newHistory)
      if (newHistory.length > 0) {
        img.src = newHistory[newHistory.length - 1]
      } else {
        clearCanvas()
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg flex-wrap">
        <div className="flex items-center gap-1 border-r pr-2">
          <Button 
            variant={tool === 'pen' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setTool('pen')}
            title="Pen"
          >
            ✏️
          </Button>
          <Button 
            variant={tool === 'eraser' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            🧽
          </Button>
        </div>
        <div className="flex items-center gap-1 border-r pr-2">
          {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#000000'].map(c => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-800' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 border-r pr-2">
          <span className="text-xs text-slate-500">Size:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-16"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={undo} title="Undo">
            ↩️
          </Button>
          <Button variant="outline" size="sm" onClick={clearCanvas} title="Clear">
            🗑️
          </Button>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
      
      <p className="text-xs text-slate-500 text-center">
        Draw room layout, mark obstacles, doorways, and special areas
      </p>
    </div>
  )
}

function RoomMeasurementDialog({ open, onClose, room, project, onSave, loading }) {
  const [form, setForm] = useState({
    roomName: '',
    roomType: 'bedroom',
    applicationType: 'flooring', // flooring, cladding, decking
    floor: 'ground',
    length: '',
    width: '',
    height: '10',
    subfloorType: 'concrete',
    subfloorCondition: 'good',
    doorways: 1,
    windows: 0,
    obstacles: [],
    specialInstructions: '',
    photos: [],
    wastagePercentage: 10,
    roomSketch: null
  })
  
  const [showDrawing, setShowDrawing] = useState(false)
  const [activeObstacle, setActiveObstacle] = useState(null)

  // Application types for wooden flooring industry
  const applicationTypes = [
    { value: 'flooring', label: 'Flooring', icon: '🪵', description: 'Indoor floor installation' },
    { value: 'cladding', label: 'Wall Cladding', icon: '🧱', description: 'Wall covering/paneling' },
    { value: 'decking', label: 'Decking', icon: '🏡', description: 'Outdoor deck/patio' },
    { value: 'ceiling', label: 'Ceiling Panel', icon: '⬆️', description: 'Ceiling installation' },
    { value: 'staircase', label: 'Staircase', icon: '🪜', description: 'Steps & risers' }
  ]

  // Room types organized by application - for Wooden Flooring/Cladding/Decking worldwide
  const roomTypesByApplication = {
    flooring: [
      { value: 'living_room', label: 'Living Room', icon: '🛋️' },
      { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
      { value: 'master_bedroom', label: 'Master Bedroom', icon: '🛏️' },
      { value: 'dining_room', label: 'Dining Room', icon: '🍽️' },
      { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
      { value: 'hallway', label: 'Hallway/Corridor', icon: '🚪' },
      { value: 'foyer', label: 'Foyer/Entrance', icon: '🚪' },
      { value: 'office', label: 'Office/Study', icon: '💼' },
      { value: 'home_office', label: 'Home Office', icon: '🖥️' },
      { value: 'library', label: 'Library', icon: '📚' },
      { value: 'guest_room', label: 'Guest Room', icon: '🛏️' },
      { value: 'kids_room', label: 'Kids Room', icon: '🧸' },
      { value: 'playroom', label: 'Playroom', icon: '🎮' },
      { value: 'media_room', label: 'Media/Theater Room', icon: '📺' },
      { value: 'gym', label: 'Home Gym', icon: '🏋️' },
      { value: 'basement', label: 'Basement', icon: '⬇️' },
      { value: 'attic', label: 'Attic', icon: '⬆️' },
      { value: 'sunroom', label: 'Sunroom', icon: '☀️' },
      // Commercial
      { value: 'showroom', label: 'Showroom', icon: '🏪' },
      { value: 'retail_floor', label: 'Retail Floor', icon: '🛒' },
      { value: 'conference', label: 'Conference Room', icon: '📊' },
      { value: 'board_room', label: 'Board Room', icon: '📋' },
      { value: 'reception', label: 'Reception Area', icon: '🏛️' },
      { value: 'lobby', label: 'Lobby', icon: '🏢' },
      { value: 'cabin', label: 'Cabin/Office', icon: '🏢' },
      { value: 'open_office', label: 'Open Office', icon: '🖥️' },
      { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
      { value: 'cafe', label: 'Cafe/Lounge', icon: '☕' },
      { value: 'hotel_room', label: 'Hotel Room', icon: '🏨' },
      { value: 'hotel_corridor', label: 'Hotel Corridor', icon: '🚶' },
      { value: 'banquet_hall', label: 'Banquet Hall', icon: '🎉' },
      { value: 'auditorium', label: 'Auditorium', icon: '🎭' },
      { value: 'gym_studio', label: 'Gym/Studio', icon: '🏋️' },
      { value: 'spa', label: 'Spa/Wellness', icon: '💆' },
      { value: 'other', label: 'Other', icon: '📐' }
    ],
    cladding: [
      { value: 'exterior_wall', label: 'Exterior Wall', icon: '🏠' },
      { value: 'facade', label: 'Building Facade', icon: '🏢' },
      { value: 'feature_wall', label: 'Feature Wall', icon: '🎨' },
      { value: 'accent_wall', label: 'Accent Wall', icon: '✨' },
      { value: 'living_wall', label: 'Living Room Wall', icon: '🛋️' },
      { value: 'bedroom_wall', label: 'Bedroom Wall', icon: '🛏️' },
      { value: 'headboard_wall', label: 'Headboard Wall', icon: '🛏️' },
      { value: 'tv_wall', label: 'TV/Media Wall', icon: '📺' },
      { value: 'fireplace_surround', label: 'Fireplace Surround', icon: '🔥' },
      { value: 'reception_wall', label: 'Reception Wall', icon: '🏛️' },
      { value: 'office_wall', label: 'Office Wall', icon: '🏢' },
      { value: 'partition', label: 'Partition Wall', icon: '🚧' },
      { value: 'bathroom_wall', label: 'Bathroom Wall', icon: '🚿' },
      { value: 'kitchen_backsplash', label: 'Kitchen Backsplash', icon: '🍳' },
      { value: 'staircase_wall', label: 'Staircase Wall', icon: '🪜' },
      { value: 'corridor_wall', label: 'Corridor Wall', icon: '🚪' },
      { value: 'other', label: 'Other', icon: '📐' }
    ],
    decking: [
      { value: 'backyard_deck', label: 'Backyard Deck', icon: '🏡' },
      { value: 'front_porch', label: 'Front Porch', icon: '🏠' },
      { value: 'patio', label: 'Patio', icon: '☀️' },
      { value: 'balcony', label: 'Balcony', icon: '🌅' },
      { value: 'terrace', label: 'Terrace', icon: '🏙️' },
      { value: 'rooftop', label: 'Rooftop Deck', icon: '🏗️' },
      { value: 'pool_deck', label: 'Pool Deck', icon: '🏊' },
      { value: 'spa_deck', label: 'Spa/Hot Tub Deck', icon: '🛁' },
      { value: 'gazebo', label: 'Gazebo Floor', icon: '⛱️' },
      { value: 'pergola', label: 'Pergola Floor', icon: '🏛️' },
      { value: 'walkway', label: 'Walkway/Path', icon: '🚶' },
      { value: 'dock', label: 'Dock/Marina', icon: '⚓' },
      { value: 'boardwalk', label: 'Boardwalk', icon: '🌊' },
      { value: 'restaurant_outdoor', label: 'Restaurant Outdoor', icon: '🍽️' },
      { value: 'cafe_outdoor', label: 'Cafe Outdoor', icon: '☕' },
      { value: 'hotel_pool', label: 'Hotel Pool Area', icon: '🏨' },
      { value: 'clubhouse', label: 'Clubhouse', icon: '🏌️' },
      { value: 'other', label: 'Other', icon: '📐' }
    ],
    ceiling: [
      { value: 'living_ceiling', label: 'Living Room Ceiling', icon: '🛋️' },
      { value: 'bedroom_ceiling', label: 'Bedroom Ceiling', icon: '🛏️' },
      { value: 'office_ceiling', label: 'Office Ceiling', icon: '🏢' },
      { value: 'lobby_ceiling', label: 'Lobby Ceiling', icon: '🏛️' },
      { value: 'restaurant_ceiling', label: 'Restaurant Ceiling', icon: '🍽️' },
      { value: 'conference_ceiling', label: 'Conference Ceiling', icon: '📊' },
      { value: 'retail_ceiling', label: 'Retail Ceiling', icon: '🛒' },
      { value: 'pergola_ceiling', label: 'Pergola Ceiling', icon: '🏛️' },
      { value: 'canopy', label: 'Canopy/Overhang', icon: '⛱️' },
      { value: 'other', label: 'Other', icon: '📐' }
    ],
    staircase: [
      { value: 'main_staircase', label: 'Main Staircase', icon: '🪜' },
      { value: 'spiral_staircase', label: 'Spiral Staircase', icon: '🔄' },
      { value: 'floating_stairs', label: 'Floating Stairs', icon: '✨' },
      { value: 'deck_stairs', label: 'Deck Stairs', icon: '🏡' },
      { value: 'porch_steps', label: 'Porch Steps', icon: '🏠' },
      { value: 'landing', label: 'Landing Area', icon: '📦' },
      { value: 'commercial_stairs', label: 'Commercial Stairs', icon: '🏢' },
      { value: 'other', label: 'Other', icon: '📐' }
    ]
  }

  const roomTypes = roomTypesByApplication[form.applicationType] || roomTypesByApplication.flooring

  const floorOptions = [
    { value: 'basement', label: 'Basement' },
    { value: 'ground', label: 'Ground Floor' },
    { value: '1st', label: '1st Floor' },
    { value: '2nd', label: '2nd Floor' },
    { value: '3rd', label: '3rd Floor' },
    { value: '4th+', label: '4th Floor+' },
    { value: 'terrace', label: 'Terrace/Roof' },
    { value: 'outdoor', label: 'Outdoor/Exterior' }
  ]

  // Subfloor types vary by application
  const subfloorTypesByApplication = {
    flooring: [
      { value: 'concrete', label: 'Concrete Slab' },
      { value: 'cement_screed', label: 'Cement Screed' },
      { value: 'plywood', label: 'Plywood' },
      { value: 'osb', label: 'OSB' },
      { value: 'existing_tile', label: 'Existing Tile' },
      { value: 'existing_wood', label: 'Existing Wood' },
      { value: 'existing_vinyl', label: 'Existing Vinyl' },
      { value: 'heated_floor', label: 'Heated Floor System' },
      { value: 'other', label: 'Other' }
    ],
    cladding: [
      { value: 'brick', label: 'Brick Wall' },
      { value: 'concrete_wall', label: 'Concrete Wall' },
      { value: 'drywall', label: 'Drywall/Plasterboard' },
      { value: 'plaster', label: 'Plaster' },
      { value: 'wood_frame', label: 'Wood Frame' },
      { value: 'metal_frame', label: 'Metal Frame' },
      { value: 'existing_cladding', label: 'Existing Cladding' },
      { value: 'other', label: 'Other' }
    ],
    decking: [
      { value: 'concrete_pad', label: 'Concrete Pad' },
      { value: 'wood_joists', label: 'Wood Joists' },
      { value: 'metal_frame', label: 'Metal Frame' },
      { value: 'existing_deck', label: 'Existing Deck' },
      { value: 'gravel_base', label: 'Gravel/Crushed Stone' },
      { value: 'paver_base', label: 'Paver Base' },
      { value: 'soil', label: 'Compacted Soil' },
      { value: 'rooftop_membrane', label: 'Rooftop Membrane' },
      { value: 'other', label: 'Other' }
    ],
    ceiling: [
      { value: 'concrete_ceiling', label: 'Concrete Ceiling' },
      { value: 'wood_joists', label: 'Wood Joists' },
      { value: 'metal_frame', label: 'Metal Frame' },
      { value: 'existing_ceiling', label: 'Existing Ceiling' },
      { value: 'drop_ceiling_grid', label: 'Drop Ceiling Grid' },
      { value: 'other', label: 'Other' }
    ],
    staircase: [
      { value: 'concrete_stairs', label: 'Concrete Stairs' },
      { value: 'wood_stairs', label: 'Wood Stairs' },
      { value: 'metal_stairs', label: 'Metal Stairs' },
      { value: 'existing_stairs', label: 'Existing Stairs' },
      { value: 'other', label: 'Other' }
    ]
  }

  const subfloorTypes = subfloorTypesByApplication[form.applicationType] || subfloorTypesByApplication.flooring

  const obstacleTypes = [
    { value: 'pillar', label: 'Pillar/Column' },
    { value: 'closet', label: 'Built-in Closet' },
    { value: 'fireplace', label: 'Fireplace' },
    { value: 'island', label: 'Kitchen Island' },
    { value: 'alcove', label: 'Alcove/Niche' },
    { value: 'stairs', label: 'Staircase Opening' },
    { value: 'duct', label: 'AC Duct/Vent' },
    { value: 'window', label: 'Window Cutout' },
    { value: 'door', label: 'Door Cutout' },
    { value: 'drain', label: 'Drain/Plumbing' },
    { value: 'electrical', label: 'Electrical Panel' },
    { value: 'tree', label: 'Tree/Planter' },
    { value: 'pool', label: 'Pool Cutout' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    if (room && room.id) {
      setForm({
        id: room.id,
        roomName: room.roomName || '',
        roomType: room.roomType || 'living_room',
        applicationType: room.applicationType || 'flooring',
        floor: room.floor || 'ground',
        length: room.dimensions?.length || room.length || '',
        width: room.dimensions?.width || room.width || '',
        height: room.dimensions?.height || room.height || '10',
        subfloorType: room.subfloorType || 'concrete',
        subfloorCondition: room.subfloorCondition || 'good',
        doorways: room.doorways || 1,
        windows: room.windows || 0,
        obstacles: room.obstacles || [],
        specialInstructions: room.specialInstructions || '',
        photos: room.photos || [],
        wastagePercentage: room.wastagePercentage || 10,
        roomSketch: room.roomSketch || null
      })
    } else {
      setForm({
        roomName: '',
        roomType: 'living_room',
        applicationType: 'flooring',
        floor: 'ground',
        length: '',
        width: '',
        height: '10',
        subfloorType: 'concrete',
        subfloorCondition: 'good',
        doorways: 1,
        windows: 0,
        obstacles: [],
        specialInstructions: '',
        photos: [],
        wastagePercentage: 10,
        roomSketch: null
      })
    }
  }, [room, open])

  // Calculate areas
  const grossArea = (parseFloat(form.length) || 0) * (parseFloat(form.width) || 0)
  const obstaclesArea = form.obstacles.reduce((sum, obs) => 
    sum + ((parseFloat(obs.length) || 0) * (parseFloat(obs.width) || 0)), 0
  )
  const netArea = grossArea - obstaclesArea
  const wastageArea = netArea * (form.wastagePercentage / 100)
  const totalRequired = netArea + wastageArea

  const addObstacle = () => {
    setForm(f => ({
      ...f,
      obstacles: [...f.obstacles, { 
        id: `obs-${Date.now()}`,
        type: 'pillar',
        name: '',
        length: '',
        width: '',
        posX: 0,
        posY: 0
      }]
    }))
  }

  const updateObstacle = (id, field, value) => {
    setForm(f => ({
      ...f,
      obstacles: f.obstacles.map(obs => 
        obs.id === id ? { ...obs, [field]: value } : obs
      )
    }))
  }

  const removeObstacle = (id) => {
    setForm(f => ({
      ...f,
      obstacles: f.obstacles.filter(obs => obs.id !== id)
    }))
  }

  const handleSubmit = () => {
    if (!form.roomName || !form.length || !form.width) {
      toast.error('Please fill in room name, length and width')
      return
    }
    onSave(form)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-600" />
            {room?.id ? 'Edit Room Measurement' : 'Add Room Measurement'}
          </DialogTitle>
          <DialogDescription>
            {project?.projectNumber} - {project?.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 py-4">
          {/* Left Column - Room Details */}
          <div className="col-span-2 space-y-4">
            {/* Application Type Selection */}
            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-600" /> Application Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {applicationTypes.map(app => (
                    <div
                      key={app.value}
                      className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                        form.applicationType === app.value 
                          ? 'border-amber-500 bg-amber-100 shadow-md' 
                          : 'border-transparent bg-white hover:border-amber-300'
                      }`}
                      onClick={() => setForm({ ...form, applicationType: app.value, roomType: roomTypesByApplication[app.value]?.[0]?.value || 'other' })}
                    >
                      <span className="text-2xl">{app.icon}</span>
                      <p className="text-xs font-medium mt-1">{app.label}</p>
                      <p className="text-[10px] text-slate-500 hidden sm:block">{app.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Home className="h-4 w-4" /> {form.applicationType === 'cladding' ? 'Wall' : form.applicationType === 'decking' ? 'Area' : 'Room'} Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{form.applicationType === 'cladding' ? 'Wall' : form.applicationType === 'decking' ? 'Area' : 'Room'} Name *</Label>
                    <Input
                      value={form.roomName}
                      onChange={(e) => setForm({ ...form, roomName: e.target.value })}
                      placeholder={form.applicationType === 'cladding' ? 'e.g., Living Room Feature Wall' : form.applicationType === 'decking' ? 'e.g., Backyard Deck' : 'e.g., Master Bedroom'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Floor Level</Label>
                    <Select value={form.floor} onValueChange={(v) => setForm({ ...form, floor: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {floorOptions.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{form.applicationType === 'cladding' ? 'Wall' : form.applicationType === 'decking' ? 'Area' : 'Room'} Type *</Label>
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-3 pr-4">
                      {roomTypes.map(type => (
                        <div
                          key={type.value}
                          className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${form.roomType === type.value ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-transparent hover:border-blue-300 hover:bg-blue-50/50'}`}
                          onClick={() => setForm({ ...form, roomType: type.value })}
                        >
                          <span className="text-2xl block mb-1">{type.icon}</span>
                          <p className="text-xs font-medium truncate">{type.label}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Dimensions (in feet)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{form.applicationType === 'cladding' ? 'Height' : 'Length'} (ft) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.length}
                      onChange={(e) => setForm({ ...form, length: e.target.value })}
                      placeholder="e.g., 15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Width (ft) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.width}
                      onChange={(e) => setForm({ ...form, width: e.target.value })}
                      placeholder="e.g., 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{form.applicationType === 'cladding' ? 'Wall Thickness' : 'Ceiling Height'} (ft)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value })}
                      placeholder="e.g., 10"
                    />
                  </div>
                </div>

                {/* Room Sketch Drawing Tool */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      {form.applicationType === 'cladding' ? 'Wall' : form.applicationType === 'decking' ? 'Area' : 'Room'} Layout Sketch
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {grossArea.toFixed(1)} sq.ft {form.applicationType === 'cladding' ? '(wall area)' : ''}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => setShowDrawing(!showDrawing)}>
                        {showDrawing ? 'Hide Canvas' : 'Open Drawing Tool'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Simple Preview */}
                  {!showDrawing && form.length && form.width && (
                    <div className="relative bg-white border-2 border-blue-300 rounded" 
                         style={{ 
                           width: '100%', 
                           height: `${Math.min(200, (parseFloat(form.width) / parseFloat(form.length)) * 300)}px`,
                           maxHeight: '200px'
                         }}>
                      <div className="absolute inset-2 border-2 border-dashed border-blue-400 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{form.length}' × {form.width}'</p>
                          <p className="text-sm text-slate-500">{grossArea.toFixed(1)} sq.ft</p>
                        </div>
                      </div>
                      {form.obstacles.map((obs, idx) => (
                        <div
                          key={obs.id}
                          className="absolute bg-red-100 border border-red-400 rounded flex items-center justify-center text-xs"
                          style={{
                            width: `${Math.max(30, (parseFloat(obs.width) / parseFloat(form.width)) * 100)}%`,
                            height: `${Math.max(20, (parseFloat(obs.length) / parseFloat(form.length)) * 100)}%`,
                            left: `${10 + (idx * 15) % 70}%`,
                            top: `${10 + (idx * 20) % 60}%`
                          }}
                        >
                          <span className="text-red-600">{obs.type}</span>
                        </div>
                      ))}
                      {form.doorways > 0 && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-2 bg-amber-400 rounded-t" title="Doorway" />
                      )}
                    </div>
                  )}
                  
                  {/* Full Drawing Canvas */}
                  {showDrawing && (
                    <RoomDrawingCanvas 
                      width={400}
                      height={300}
                      obstacles={form.obstacles}
                      onDrawingComplete={(dataUrl) => setForm(f => ({ ...f, roomSketch: dataUrl }))}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Obstacles */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Obstacles & Deductions
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={addObstacle}>
                    <Plus className="h-4 w-4 mr-1" /> Add Obstacle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {form.obstacles.length > 0 ? (
                  <div className="space-y-3">
                    {form.obstacles.map((obs, idx) => (
                      <div key={obs.id} className="p-3 border rounded-lg bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-700">Obstacle {idx + 1}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeObstacle(obs.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <Select value={obs.type} onValueChange={(v) => updateObstacle(obs.id, 'type', v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {obstacleTypes.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Length"
                            value={obs.length}
                            onChange={(e) => updateObstacle(obs.id, 'length', e.target.value)}
                            className="h-9"
                          />
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Width"
                            value={obs.width}
                            onChange={(e) => updateObstacle(obs.id, 'width', e.target.value)}
                            className="h-9"
                          />
                          <div className="text-right text-sm text-red-600 pt-2">
                            -{((parseFloat(obs.length) || 0) * (parseFloat(obs.width) || 0)).toFixed(1)} sqft
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No obstacles. Add pillars, closets, or other areas to deduct from total.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Subfloor & Additional Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Subfloor & Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subfloor Type</Label>
                    <Select value={form.subfloorType} onValueChange={(v) => setForm({ ...form, subfloorType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {subfloorTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subfloor Condition</Label>
                    <Select value={form.subfloorCondition} onValueChange={(v) => setForm({ ...form, subfloorCondition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair - Minor prep needed</SelectItem>
                        <SelectItem value="poor">Poor - Major prep needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Doorways</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.doorways}
                      onChange={(e) => setForm({ ...form, doorways: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Windows</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.windows}
                      onChange={(e) => setForm({ ...form, windows: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wastage %</Label>
                    <Input
                      type="number"
                      min="5"
                      max="20"
                      value={form.wastagePercentage}
                      onChange={(e) => setForm({ ...form, wastagePercentage: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Special Instructions / Notes</Label>
                  <Textarea
                    value={form.specialInstructions}
                    onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                    placeholder="Any special considerations, leveling needs, transitions, etc."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4">
            {/* Area Summary */}
            <Card className="sticky top-4">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="text-sm">Area Calculation</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gross Area</span>
                  <span className="font-semibold">{grossArea.toFixed(1)} sqft</span>
                </div>
                {obstaclesArea > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">Deductions ({form.obstacles.length})</span>
                    <span className="font-semibold">-{obstaclesArea.toFixed(1)} sqft</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Net Area</span>
                  <span className="font-bold text-lg text-blue-600">{netArea.toFixed(1)} sqft</span>
                </div>
                <div className="flex justify-between items-center text-amber-600">
                  <span className="text-sm">Wastage ({form.wastagePercentage}%)</span>
                  <span className="font-semibold">+{wastageArea.toFixed(1)} sqft</span>
                </div>
                <Separator />
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-700">Material Required</span>
                    <span className="font-bold text-xl text-emerald-600">{totalRequired.toFixed(1)} sqft</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Room Type Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{roomTypes.find(r => r.value === form.roomType)?.icon || '📐'}</span>
                  <div>
                    <p className="font-medium">{roomTypes.find(r => r.value === form.roomType)?.label || 'Room'}</p>
                    <p className="text-xs text-muted-foreground">{form.floor} floor</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subfloor</span>
                    <span className="capitalize">{form.subfloorType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition</span>
                    <Badge variant="outline" className={
                      form.subfloorCondition === 'excellent' ? 'bg-green-50 text-green-700' :
                      form.subfloorCondition === 'good' ? 'bg-blue-50 text-blue-700' :
                      form.subfloorCondition === 'fair' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }>{form.subfloorCondition}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doorways</span>
                    <span>{form.doorways}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Windows</span>
                    <span>{form.windows}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-amber-800 mb-2">💡 Measurement Tips</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Measure at longest and widest points</li>
                  <li>• Include closet areas if flooring extends</li>
                  <li>• Note doorway directions for transitions</li>
                  <li>• Standard wastage: 10% (complex rooms: 15%)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {room?.id && (
              <Button variant="destructive" onClick={() => {
                if (confirm('Delete this room measurement?')) {
                  // Handle delete in parent component
                  onClose()
                }
              }}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Room
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.roomName || !form.length || !form.width}>
              {loading ? 'Saving...' : room?.id ? 'Update Room' : 'Add Room'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// QUOTE EDIT DIALOG - MOVED TO /components/modules/flooring/QuoteDialogs.js
// =============================================
// ViewQuoteDialog and QuoteEditDialog have been extracted to:
// /components/modules/flooring/QuoteDialogs.js
// This reduces the main module size by ~770 lines

export default EnterpriseFlooringModule
