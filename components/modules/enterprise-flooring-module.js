'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FlooringProductDialog, ImportProductsDialog, CategoryManagerDialog, ViewProductDialog } from '@/components/modules/flooring-products-ui'
import { ViewQuoteDialog as ViewQuoteDialogNew, QuoteEditDialog as QuoteEditDialogNew, QuoteStatusConfig as QuoteStatusConfigShared } from '@/components/modules/flooring/QuoteDialogs'
import { EnterpriseInventory } from './flooring/EnterpriseInventory'
import { EnterpriseFinanceFlooring } from './flooring/EnterpriseFinance'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  LayoutDashboard, Package, Ruler, FileText, Wrench, Warehouse, Users,
  Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download, Upload,
  TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, Send,
  AlertTriangle, ArrowUpRight, Calculator, Home, Square, ChevronRight,
  MoreVertical, Copy, Printer, Image, Camera, MapPin, Phone, Mail,
  Calendar, Building2, Building, Layers, Grid3X3, Box, Boxes, Truck, Settings, BarChart3,
  PieChart, Target, Award, Zap, Star, X, FileSpreadsheet, Receipt,
  CreditCard, Banknote, ChevronDown, ArrowLeft, ArrowRight, Sparkles,
  MessageSquare, Bot, ClipboardList, Hammer, ShieldCheck, History, ExternalLink, Tags,
  Lock, Unlock, Info, Bell, IndianRupee, Landmark, Wallet, Check, Loader2, User,
  ClipboardCheck, QrCode, Barcode, ScanLine, AlertCircle, ThermometerSun
} from 'lucide-react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/phone-input'

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
  converted: { label: 'Converted to Invoice', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-200 text-gray-500' }
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
  site_visit_pending: { label: 'Site Visit Pending', color: 'bg-amber-100 text-amber-700' },
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

// Helper to get correct price based on segment (B2B uses dealerPrice, B2C uses sellingPrice)
const getProductPrice = (product, segment) => {
  if (!product) return 0
  const pricing = product.pricing || product
  if (segment === 'b2b') {
    // B2B: Use dealer price, fallback to selling price
    return pricing.dealerPrice || pricing.sellingPrice || pricing.price || 0
  }
  // B2C: Use selling/retail price
  return pricing.sellingPrice || pricing.price || 0
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

// Data Table Header (Custom sortable header)
const SortableTableHeader = ({ children, sortable, sorted, onSort }) => (
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
  const [payments, setPayments] = useState([])
  const [installations, setInstallations] = useState([])
  const [installers, setInstallers] = useState([]) // Installers & Third-Party Vendors
  const [installersTab, setInstallersTab] = useState('installations') // 'installations', 'installers', 'calendar'
  const [inventory, setInventory] = useState({ inventory: [], summary: {} })
  
  // Enterprise Inventory Management
  const [inventoryTab, setInventoryTab] = useState('stock') // stock, shipments, lots, pricing, costing, qc, locations, analytics
  const [shipments, setShipments] = useState([])
  const [lots, setLots] = useState([])
  const [priceTiers, setPriceTiers] = useState([])
  const [landedCosts, setLandedCosts] = useState([])
  // Phase 2: QC, Barcodes, Locations
  const [qcRecords, setQcRecords] = useState({ records: [], summary: {}, checklist: [] })
  const [barcodes, setBarcodes] = useState({ barcodes: [], summary: {}, types: {} })
  const [binLocations, setBinLocations] = useState({ bins: [], summary: {} })
  const [stockAgingReport, setStockAgingReport] = useState(null)
  
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
  const [isEditingMaterials, setIsEditingMaterials] = useState(false) // Toggle for editing materials when inventory blocked
  
  // Selection States
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedQuote, setSelectedQuote] = useState(null)
  
  // Dialog States
  const [dialogOpen, setDialogOpen] = useState({ type: null, data: null })
  const [pendingProjectData, setPendingProjectData] = useState(null) // Store project data when adding contact
  const [cancelQuoteDialog, setCancelQuoteDialog] = useState({ open: false, quoteId: null, reason: '' }) // Cancel quote dialog
  
  // Create Invoice Form State
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ name: '', description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  
  // Dispatch States
  const [showDispatchDialog, setShowDispatchDialog] = useState(false)
  const [dispatchInvoice, setDispatchInvoice] = useState(null)
  const [dispatchStep, setDispatchStep] = useState(1) // 1: Customer Dues, 2: Driver Details, 3: Stock Check, 4: Confirm
  const [customerDues, setCustomerDues] = useState(null)
  const [stockCheck, setStockCheck] = useState(null)
  const [dispatchForm, setDispatchForm] = useState({
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    transporterName: '',
    dispatchPhoto: null,
    notes: ''
  })
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [dispatches, setDispatches] = useState([])
  const dispatchPhotoRef = useRef(null)
  
  // Invoice Edit and Void States
  const [editInvoiceDialog, setEditInvoiceDialog] = useState({ open: false, invoice: null, reason: '' })
  const [voidInvoiceDialog, setVoidInvoiceDialog] = useState({ open: false, invoice: null, reason: '' })
  const [editInvoiceForm, setEditInvoiceForm] = useState(null)
  const [showEditReasonDialog, setShowEditReasonDialog] = useState(false)
  const [pendingEditData, setPendingEditData] = useState(null)
  
  // Access Management States (Enterprise RBAC)
  const [accessRoles, setAccessRoles] = useState({ roles: [], defaultRoles: {} })
  const [accessUsers, setAccessUsers] = useState({ users: [], summary: {} })
  const [accessAuditLog, setAccessAuditLog] = useState([])
  const [accessLoading, setAccessLoading] = useState(false)
  const [assignRoleDialog, setAssignRoleDialog] = useState({ open: false, user: null })
  
  // Settings States (moved to component level to fix hook issues)
  const [settingsTab, setSettingsTab] = useState('general')
  const [whatsappConfig, setWhatsappConfig] = useState({
    provider: '',
    apiKey: '',
    apiSecret: '',
    phoneNumberId: '',
    webhookUrl: '',
    enabled: false
  })
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    gstin: '',
    defaultTaxRate: 18,
    quoteValidityDays: 30,
    invoicePrefix: 'INV',
    quotePrefix: 'FLQ',
    defaultPaymentTerms: 'Net 30',
    laborRatePerSqft: 25,
    defaultWastagePercent: 10
  })
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: ''
  })
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Reports States (moved to component level)
  const [reportPeriod, setReportPeriod] = useState('30')
  const [selectedReportType, setSelectedReportType] = useState('summary')
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productSortBy, setProductSortBy] = useState('createdAt')
  const [productSortDir, setProductSortDir] = useState('desc')

  // API Headers - memoized to prevent re-renders
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token])

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

  // Default fallback schema for when API fails
  const DEFAULT_PRODUCT_SCHEMA = useMemo(() => ({
    version: 1,
    sections: [
      {
        key: 'core',
        title: 'Core Details',
        fields: [
          { key: 'name', label: 'Product Name', type: 'text', required: true },
          { key: 'sku', label: 'SKU', type: 'text', required: false, hint: 'Recommended unique identifier.' },
          { key: 'brand', label: 'Brand', type: 'text' },
          { key: 'collection', label: 'Collection / Series', type: 'text' },
          { key: 'categoryId', label: 'Category', type: 'category', required: true },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' }
        ]
      },
      {
        key: 'construction',
        title: 'Construction',
        fields: [
          { key: 'specs.construction', label: 'Construction', type: 'select', options: ['solid', 'engineered', 'laminate', 'bamboo', 'spc', 'lvt', 'other'] },
          { key: 'specs.species', label: 'Species / Wood Type', type: 'text', hint: 'e.g., Oak, Walnut, Teak' },
          { key: 'specs.origin', label: 'Origin', type: 'text' },
          { key: 'specs.grade', label: 'Grade', type: 'text', hint: 'e.g., Select, Natural, Rustic' }
        ]
      },
      {
        key: 'dimensions',
        title: 'Dimensions',
        fields: [
          { key: 'specs.thicknessMm', label: 'Thickness (mm)', type: 'number' },
          { key: 'specs.widthMm', label: 'Width (mm)', type: 'number' },
          { key: 'specs.lengthMm', label: 'Length (mm)', type: 'number', hint: 'Use average length if random' },
          { key: 'pack.coverageSqftPerBox', label: 'Coverage per Box (sqft)', type: 'number' },
          { key: 'pack.planksPerBox', label: 'Planks per Box', type: 'number' }
        ]
      },
      {
        key: 'finish',
        title: 'Finish & Look',
        fields: [
          { key: 'specs.finish', label: 'Finish', type: 'select', options: ['matte', 'semi-gloss', 'gloss', 'oil', 'uv', 'lacquer', 'unfinished', 'other'] },
          { key: 'specs.colorTone', label: 'Color Tone', type: 'text', hint: 'e.g., Natural, Dark, Grey' },
          { key: 'specs.texture', label: 'Texture', type: 'select', options: ['smooth', 'brushed', 'hand-scraped', 'wire-brushed', 'distressed', 'embossed', 'other'] }
        ]
      },
      {
        key: 'pricing',
        title: 'Pricing',
        fields: [
          { key: 'pricing.costPrice', label: 'Cost Price (₹/sqft)', type: 'number' },
          { key: 'pricing.mrp', label: 'MRP (₹/sqft)', type: 'number' },
          { key: 'pricing.sellingPrice', label: 'Retail / Selling Price (₹/sqft)', type: 'number', required: true },
          { key: 'tax.hsnCode', label: 'HSN Code', type: 'text', defaultValue: '4418' },
          { key: 'tax.gstRate', label: 'GST Rate (%)', type: 'number', defaultValue: 18 }
        ]
      },
      {
        key: 'media',
        title: 'Media',
        fields: [
          { key: 'images', label: 'Image URLs (comma separated)', type: 'text' }
        ]
      }
    ]
  }), [])

  const fetchProductSchema = useCallback(async () => {
    if (!token) {
      console.log('Waiting for token to fetch schema...')
      // Use default schema if no token yet
      if (!productSchema) setProductSchema(DEFAULT_PRODUCT_SCHEMA)
      return
    }
    try {
      const res = await fetch('/api/flooring/enhanced/products/schema', { headers })
      const data = await res.json()
      if (data?.schema) {
        setProductSchema(data.schema)
      } else if (data?.error) {
        console.error('Schema API error:', data.error)
        // Use default schema on error
        if (!productSchema) setProductSchema(DEFAULT_PRODUCT_SCHEMA)
      }
    } catch (error) {
      console.error('Product schema fetch error:', error)
      // Use default schema on network error
      if (!productSchema) setProductSchema(DEFAULT_PRODUCT_SCHEMA)
    }
  }, [token, headers, productSchema, DEFAULT_PRODUCT_SCHEMA])

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

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/payments', { headers })
      const data = await res.json()
      if (data.payments) setPayments(data.payments)
      else if (data.data?.payments) setPayments(data.data.payments)
      else setPayments([])
    } catch (error) {
      console.error('Payments fetch error:', error)
      setPayments([])
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

  // Fetch installers/vendors
  const fetchInstallers = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/installers', { headers })
      const data = await res.json()
      if (data.installers) setInstallers(data.installers)
    } catch (error) {
      console.error('Installers fetch error:', error)
    }
  }, [token])

  // Fetch dispatches
  const fetchDispatches = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/dispatch', { headers })
      const data = await res.json()
      if (data.dispatches) setDispatches(data.dispatches)
    } catch (error) {
      console.error('Dispatches fetch error:', error)
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

  // Fetch shipments
  const fetchShipments = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/shipments', { headers })
      const data = await res.json()
      if (data.shipments) setShipments(data.shipments)
    } catch (error) {
      console.error('Shipments fetch error:', error)
    }
  }, [token])

  // Fetch lots/batches
  const fetchLots = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/lots', { headers })
      const data = await res.json()
      if (data.lots) setLots(data.lots)
    } catch (error) {
      console.error('Lots fetch error:', error)
    }
  }, [token])

  // Fetch price tiers
  const fetchPriceTiers = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/price-tiers', { headers })
      const data = await res.json()
      if (data.tiers) setPriceTiers(data.tiers)
    } catch (error) {
      console.error('Price tiers fetch error:', error)
    }
  }, [token])

  // Fetch landed costs
  const fetchLandedCosts = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/landed-costs?analysis=true', { headers })
      const data = await res.json()
      if (data) setLandedCosts(data)
    } catch (error) {
      console.error('Landed costs fetch error:', error)
    }
  }, [token])

  // Fetch QC records (Phase 2)
  const fetchQcRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/qc', { headers })
      const data = await res.json()
      if (data) setQcRecords(data)
    } catch (error) {
      console.error('QC records fetch error:', error)
    }
  }, [token])

  // Fetch barcodes (Phase 2)
  const fetchBarcodes = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/barcodes', { headers })
      const data = await res.json()
      if (data) setBarcodes(data)
    } catch (error) {
      console.error('Barcodes fetch error:', error)
    }
  }, [token])

  // Fetch bin locations (Phase 2)
  const fetchBinLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/bin-locations', { headers })
      const data = await res.json()
      if (data) setBinLocations(data)
    } catch (error) {
      console.error('Bin locations fetch error:', error)
    }
  }, [token])

  // Fetch stock aging report (Phase 3)
  const fetchStockAging = useCallback(async (reportType = 'aging') => {
    try {
      const res = await fetch(`/api/flooring/enhanced/stock-aging?type=${reportType}`, { headers })
      const data = await res.json()
      if (data) setStockAgingReport(data)
    } catch (error) {
      console.error('Stock aging fetch error:', error)
    }
  }, [token])

  // Cleanup inventory issues (negative values, duplicates, etc.)
  const handleInventoryCleanup = async (action) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/inventory/cleanup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Inventory cleanup completed')
        fetchInventory()
      } else {
        toast.error(data.error || 'Cleanup failed')
      }
    } catch (error) {
      toast.error('Failed to cleanup inventory')
    } finally {
      setLoading(false)
    }
  }

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
      const periodParam = reportPeriod === 'all' ? '3650' : reportPeriod
      const res = await fetch(`/api/flooring/enhanced/reports?type=${reportType}&period=${periodParam}`, { headers })
      const data = await res.json()
      if (data) setReports(prev => ({ ...prev, [reportType]: data }))
    } catch (error) {
      console.error('Reports fetch error:', error)
    }
  }, [token, reportPeriod, headers])

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

  // Fetch Access Management Data (Enterprise RBAC)
  const fetchAccessRoles = useCallback(async () => {
    try {
      setAccessLoading(true)
      const res = await fetch('/api/flooring/enhanced/access-management?action=roles', { headers })
      const data = await res.json()
      if (data) setAccessRoles(data)
    } catch (error) {
      console.error('Access roles fetch error:', error)
    } finally {
      setAccessLoading(false)
    }
  }, [token])

  const fetchAccessUsers = useCallback(async () => {
    try {
      setAccessLoading(true)
      const res = await fetch('/api/flooring/enhanced/access-management?action=users', { headers })
      const data = await res.json()
      if (data) setAccessUsers(data)
    } catch (error) {
      console.error('Access users fetch error:', error)
    } finally {
      setAccessLoading(false)
    }
  }, [token])

  const fetchAccessAuditLog = useCallback(async () => {
    try {
      const res = await fetch('/api/flooring/enhanced/access-management?action=audit_log', { headers })
      const data = await res.json()
      if (data.logs) setAccessAuditLog(data.logs)
    } catch (error) {
      console.error('Access audit log fetch error:', error)
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
    if (activeTab === 'finance') { fetchInvoices(); fetchPayments(); }
    if (activeTab === 'installations') { fetchInstallations(); fetchInstallers(); }
    if (activeTab === 'inventory') {
      fetchInventory()
      // Fetch based on inventory sub-tab
      if (inventoryTab === 'shipments') fetchShipments()
      if (inventoryTab === 'lots') fetchLots()
      if (inventoryTab === 'pricing') fetchPriceTiers()
      if (inventoryTab === 'costing') fetchLandedCosts()
      if (inventoryTab === 'qc') fetchQcRecords()
      if (inventoryTab === 'locations') fetchBinLocations()
      if (inventoryTab === 'analytics') fetchStockAging()
    }
    if (activeTab === 'measurements') fetchInventory() // Also fetch inventory for measurements tab
    if (activeTab === 'settings') {
      fetchModuleSettings()
      // Fetch RBAC data when in settings
      fetchAccessRoles()
      fetchAccessUsers()
    }
    if (activeTab === 'reports') fetchReports('summary')
  }, [activeTab, inventoryTab, fetchQuotes, fetchInvoices, fetchPayments, fetchInstallations, fetchInstallers, fetchInventory, fetchShipments, fetchLots, fetchPriceTiers, fetchLandedCosts, fetchQcRecords, fetchBinLocations, fetchStockAging, fetchModuleSettings, fetchReports, fetchAccessRoles, fetchAccessUsers])

  // Fetch access audit log when access tab is selected in settings
  useEffect(() => {
    if (activeTab === 'settings' && settingsTab === 'access') {
      fetchAccessAuditLog()
    }
  }, [activeTab, settingsTab, fetchAccessAuditLog])

  // Initialize measurement state when project changes (for B2C workflow)
  useEffect(() => {
    if (selectedProject && selectedProject.segment !== 'b2b') {
      const measurementDetails = selectedProject.measurementDetails || {}
      setMeasurementProducts(measurementDetails.selectedProducts || {})
      setTechnicianName(measurementDetails.technicianName || '')
      setMeasurementDate(measurementDetails.measurementDate || new Date().toISOString().split('T')[0])
      setMeasurementNotes(measurementDetails.notes || '')
      setIsEditingMaterials(false) // Reset edit mode when project changes
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

  // Handler to save CRM contact directly (for Add Contact from Project dialog)
  const handleSaveCrmContact = async (contactData) => {
    try {
      setLoading(true)
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...contactData,
          type: 'customer', // Always set as customer
        })
      })
      
      if (res.ok) {
        const newContact = await res.json()
        toast.success('Contact created & synced to CRM!')
        
        // Refresh CRM contacts
        await fetchCrmContacts()
        
        // If we were adding from project dialog, go back to project dialog
        // and auto-select the new contact
        if (pendingProjectData !== null) {
          setDialogOpen({ 
            type: 'project', 
            data: {
              ...pendingProjectData,
              customerId: newContact.contact?.id || newContact.id,
              customerName: contactData.name
            }
          })
          setPendingProjectData(null)
        } else {
          setDialogOpen({ type: null, data: null })
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save contact')
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

  // ============================================
  // ENTERPRISE FULFILLMENT WORKFLOW HANDLERS
  // ============================================

  // State for fulfillment settings
  const [fulfillmentSettings, setFulfillmentSettings] = useState(null)
  const [pickListDialog, setPickListDialog] = useState({ open: false, data: null })
  const [pickListConfirmations, setPickListConfirmations] = useState({}) // Track per-item confirmations
  const [dcDialog, setDcDialog] = useState({ open: false, data: null })
  const [dcFormData, setDcFormData] = useState({
    deliveryType: 'self',
    expectedDeliveryDate: new Date().toISOString().split('T')[0],
    shipToAddress: '',
    notes: '',
    // Self Pickup fields
    receiverName: '',
    receiverPhone: '',
    // Company Delivery fields
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    chargesType: 'free', // free, cod, add_to_bill
    chargesAmount: 0,
    // Transporter fields
    transporterName: '',
    transporterPhone: '',
    transporterCharges: 0,
    lrNumber: '', // Lorry Receipt Number
    // Photo upload
    proofPhotoUrl: '',
    proofPhotoFile: null,
    // Third-Party Delivery (Dealer Customer)
    isThirdPartyDelivery: false,
    deliveryOnBehalfOf: '', // Dealer name for audit trail
    hideSenderOnPdf: true, // Default to hide sender on PDF
    // Bill To (internal reference, may be hidden on PDF)
    billToName: '',
    billToAddress: '',
    billToPhone: '',
    billToGstin: '',
    // Ship To / Receiver (end customer site)
    shipToName: '', // Site name / End customer name
    shipToAddress: '', // Delivery site address
    // Site Incharge / Receiver Contact
    siteInchargeName: '',
    siteInchargePhone: '',
    // Proof of Delivery
    podType: 'photo', // photo, signature, otp
    podOtp: '',
    podSignatureUrl: ''
  })

  // Fetch fulfillment settings on mount
  useEffect(() => {
    const fetchFulfillmentSettings = async () => {
      try {
        const res = await fetch('/api/flooring/enhanced/fulfillment?settings=true', { headers })
        if (res.ok) {
          const data = await res.json()
          setFulfillmentSettings(data.settings)
        }
      } catch (error) {
        console.error('Failed to fetch fulfillment settings:', error)
      }
    }
    fetchFulfillmentSettings()
  }, [])

  // Create Pick List from Quote
  const handleCreatePickList = async (quote) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/pick-lists', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          quoteId: quote.id,
          notes: `Pick list for quote ${quote.quoteNumber}`
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Pick List ${data.pickList?.pickListNumber} created! Warehouse can now prepare materials.`)
        fetchQuotes() // Refresh quotes to show pick list status
        // Open pick list view
        setPickListDialog({ open: true, data: data.pickList })
      } else {
        const error = await res.json()
        if (error.details?.existingPickListId) {
          toast.info('A pick list already exists for this quote')
          handleViewPickList(error.details.existingPickListId)
        } else {
          toast.error(error.error || 'Failed to create pick list')
        }
      }
    } catch (error) {
      toast.error('Error creating pick list')
    } finally {
      setLoading(false)
    }
  }

  // View Pick List
  const handleViewPickList = async (pickListId) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/flooring/enhanced/pick-lists?id=${pickListId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setPickListDialog({ open: true, data: data })
      } else {
        toast.error('Failed to load pick list')
      }
    } catch (error) {
      toast.error('Error loading pick list')
    } finally {
      setLoading(false)
    }
  }

  // Confirm Pick List as Material Ready
  const handleConfirmPickList = async (pickListId) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/pick-lists', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: pickListId,
          action: 'material_ready',
          data: { forceReady: true } // Auto-confirm with quote quantities
        })
      })

      if (res.ok) {
        toast.success('Material confirmed ready! You can now create DC or Invoice.')
        fetchQuotes()
        setPickListDialog({ open: false, data: null })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to confirm material')
      }
    } catch (error) {
      toast.error('Error confirming material')
    } finally {
      setLoading(false)
    }
  }

  // Cancel Pick List
  const handleCancelPickList = async (quote) => {
    if (!quote.pickListId) {
      toast.error('No pick list found for this quote')
      return
    }
    
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/pick-lists', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: quote.pickListId,
          action: 'cancel',
          data: { reason: 'User requested cancellation' }
        })
      })

      if (res.ok) {
        toast.success('Pick list cancelled successfully')
        fetchQuotes()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to cancel pick list')
      }
    } catch (error) {
      toast.error('Error cancelling pick list')
    } finally {
      setLoading(false)
    }
  }

  // Recreate Pick List (cancel old and create new)
  const handleRecreatePickList = async (quote) => {
    if (!confirm('This will cancel the existing pick list and create a new one. Continue?')) {
      return
    }
    
    try {
      setLoading(true)
      
      // First cancel the existing pick list if any
      if (quote.pickListId) {
        const cancelRes = await fetch('/api/flooring/enhanced/pick-lists', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: quote.pickListId,
            action: 'cancel',
            data: { reason: 'Recreating pick list' }
          })
        })
        
        if (!cancelRes.ok) {
          const error = await cancelRes.json()
          toast.error(error.error || 'Failed to cancel existing pick list')
          return
        }
      }
      
      // Now create a new pick list
      const createRes = await fetch('/api/flooring/enhanced/pick-lists', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          quoteId: quote.id
        })
      })

      if (createRes.ok) {
        const data = await createRes.json()
        toast.success(`New pick list ${data.pickListNumber} created!`)
        fetchQuotes()
        // Open the new pick list dialog
        handleViewPickList(data.id)
      } else {
        const error = await createRes.json()
        toast.error(error.error || 'Failed to create new pick list')
      }
    } catch (error) {
      toast.error('Error recreating pick list')
    } finally {
      setLoading(false)
    }
  }

  // Create Delivery Challan from Quote
  const handleCreateDCFromQuote = async (quote) => {
    // Check if material is ready
    if (quote.pickListStatus !== 'MATERIAL_READY' && !fulfillmentSettings?.allowBypassPickListForDC) {
      toast.warning('Please confirm material as ready before creating Delivery Challan')
      if (quote.pickListId) {
        handleViewPickList(quote.pickListId)
      } else {
        handleCreatePickList(quote)
      }
      return
    }

    // If we have a pick list, fetch its data first
    let pickList = null
    if (quote.pickListId) {
      try {
        const res = await fetch(`/api/flooring/enhanced/pick-lists?id=${quote.pickListId}`, { headers })
        if (res.ok) {
          pickList = await res.json()
        }
      } catch (error) {
        console.error('Error fetching pick list:', error)
      }
    }

    // Open DC creation dialog
    setDcDialog({ 
      open: true, 
      data: { 
        source: quote.pickListId ? 'pick_list' : 'quote',
        sourceId: quote.pickListId || quote.id,
        quote,
        pickList,
        customer: quote.customer
      } 
    })
  }

  // Create Delivery Challan
  const handleCreateDC = async (dcData) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/challans', {
        method: 'POST',
        headers,
        body: JSON.stringify(dcData)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Delivery Challan ${data.challan?.dcNo} created! Ready to issue.`)
        fetchQuotes()
        setDcDialog({ open: false, data: null })
        // Switch to Challans tab
        setActiveTab('challans')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create DC')
      }
    } catch (error) {
      toast.error('Error creating delivery challan')
    } finally {
      setLoading(false)
    }
  }

  // Issue Delivery Challan (performs stock OUT)
  const handleIssueDC = async (dcId) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/challans', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: dcId,
          action: 'issue'
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.challan?.stockOutResult?.skipped) {
          toast.info('DC issued (stock was already deducted)')
        } else {
          toast.success('DC issued successfully! Stock has been deducted.')
        }
        fetchChallans()
        fetchQuotes()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to issue DC')
      }
    } catch (error) {
      toast.error('Error issuing delivery challan')
    } finally {
      setLoading(false)
    }
  }

  // Mark DC as Delivered
  const handleMarkDCDelivered = async (dcId, deliveryData = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/challans', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: dcId,
          action: 'mark_delivered',
          data: deliveryData
        })
      })

      if (res.ok) {
        toast.success('Delivery confirmed!')
        fetchChallans()
        fetchQuotes()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to mark as delivered')
      }
    } catch (error) {
      toast.error('Error updating delivery status')
    } finally {
      setLoading(false)
    }
  }

  // View Challans for a Quote
  const handleViewChallans = (quoteId) => {
    setActiveTab('challans')
    // Could also filter challans by quoteId
    toast.info('Showing challans for this quote')
  }

  // View/Download DC PDF
  const handleViewDCPdf = async (dcId, action = 'view') => {
    try {
      setLoading(true)
      const res = await fetch(`/api/flooring/enhanced/challans/pdf?id=${dcId}`, { headers })
      
      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || 'Failed to load DC PDF')
        return
      }
      
      const html = await res.text()
      
      if (action === 'view' || action === 'print') {
        // Open in new window for viewing/printing
        const newWindow = window.open('', '_blank')
        newWindow.document.write(html)
        newWindow.document.close()
        if (action === 'print') {
          newWindow.print()
        }
      } else if (action === 'download') {
        // Download as HTML file
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `DC-${dcId}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('DC downloaded')
      }
    } catch (error) {
      console.error('DC PDF error:', error)
      toast.error('Error loading DC PDF')
    } finally {
      setLoading(false)
    }
  }

  // View Invoice
  const handleViewInvoice = (invoiceId) => {
    setActiveTab('invoices')
    // Could scroll to specific invoice
  }

  // Create Invoice from Delivered DC
  const handleCreateInvoiceFromDC = async (dc) => {
    try {
      setLoading(true)
      
      // Create invoice with items from the DC
      const invoiceItems = (dc.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName || item.product_name,
        sku: item.sku,
        quantity: item.qtyBoxes || 0,
        area: item.qtyArea || 0,
        rate: item.ratePerBox || item.rate || 0,
        amount: (item.qtyBoxes || 0) * (item.ratePerBox || item.rate || 0),
        coveragePerBox: item.coveragePerBox || 0
      }))

      const subtotal = invoiceItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      const cgst = subtotal * 0.09
      const sgst = subtotal * 0.09
      const grandTotal = subtotal + cgst + sgst

      // Determine dispatch status based on DC status
      const dispatchStatus = dc.status === 'DELIVERED' ? 'delivered' : 
                            dc.status === 'ISSUED' ? 'dispatched' : 'pending'

      const res = await fetch('/api/flooring/enhanced/invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'delivery_challan',
          sourceId: dc.id,
          dcNumber: dc.dcNo,
          quoteId: dc.quoteId,
          projectId: dc.projectId,
          customerId: dc.billToAccountId,
          customerName: dc.billToName || dc.customerName,
          customerAddress: dc.shipToAddress || dc.billToAddress,
          items: invoiceItems,
          subtotal,
          cgst,
          sgst,
          grandTotal,
          status: 'draft',
          dcId: dc.id, // Link to the DC
          dispatchId: dc.id, // Use DC as dispatch reference
          dispatchStatus: dispatchStatus, // Set dispatch status based on DC
          notes: `Invoice generated from Delivery Challan ${dc.dcNo}`
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Invoice ${data.invoice?.invoiceNumber || ''} created successfully!`)
        
        // Update DC with invoice reference
        await fetch('/api/flooring/enhanced/challans', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: dc.id,
            action: 'link_invoice',
            data: {
              invoiceId: data.invoice?.id,
              invoiceNumber: data.invoice?.invoiceNumber
            }
          })
        })
        
        fetchChallans()
        setActiveTab('invoices')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Create invoice from DC error:', error)
      toast.error('Error creating invoice from DC')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Challans
  const [challans, setChallans] = useState([])
  const [challansLoading, setChallansLoading] = useState(false)

  const fetchChallans = async () => {
    try {
      setChallansLoading(true)
      const res = await fetch('/api/flooring/enhanced/challans', { headers })
      if (res.ok) {
        const data = await res.json()
        setChallans(data.challans || [])
      }
    } catch (error) {
      console.error('Failed to fetch challans:', error)
    } finally {
      setChallansLoading(false)
    }
  }

  // Fetch challans when tab changes
  useEffect(() => {
    if (activeTab === 'challans') {
      fetchChallans()
    }
  }, [activeTab])

  // Create standalone invoice (not from quote)
  const handleCreateStandaloneInvoice = async () => {
    try {
      if (!newInvoiceForm.customerName) {
        toast.error('Customer name is required')
        return
      }
      if (newInvoiceForm.items.length === 0 || !newInvoiceForm.items[0].name) {
        toast.error('At least one item is required')
        return
      }

      setLoading(true)
      
      // Calculate totals
      const subtotal = newInvoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
      const cgstRate = 9
      const sgstRate = 9
      const cgstAmount = subtotal * (cgstRate / 100)
      const sgstAmount = subtotal * (sgstRate / 100)
      const totalTax = cgstAmount + sgstAmount
      const grandTotal = subtotal + totalTax

      const invoiceData = {
        customer: {
          name: newInvoiceForm.customerName,
          email: newInvoiceForm.customerEmail,
          phone: newInvoiceForm.customerPhone,
          address: newInvoiceForm.customerAddress
        },
        items: newInvoiceForm.items.map(item => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.rate,
          totalPrice: item.quantity * item.rate,
          productType: 'service'
        })),
        subtotal,
        taxableAmount: subtotal,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        totalTax,
        grandTotal,
        dueDate: new Date(newInvoiceForm.dueDate).toISOString(),
        notes: newInvoiceForm.notes,
        status: 'pending'
      }

      const res = await fetch('/api/flooring/enhanced/invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify(invoiceData)
      })

      if (res.ok) {
        fetchInvoices()
        setDialogOpen({ type: null, data: null })
        // Reset form
        setNewInvoiceForm({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerAddress: '',
          items: [{ name: '', description: '', quantity: 1, rate: 0, amount: 0 }],
          notes: '',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        toast.success('Invoice created successfully!')
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Create invoice error:', error)
      toast.error('Error creating invoice')
    } finally {
      setLoading(false)
    }
  }

  // Helper to update invoice form items
  const updateInvoiceItem = (index, field, value) => {
    setNewInvoiceForm(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      // Auto-calculate amount
      if (field === 'quantity' || field === 'rate') {
        newItems[index].amount = newItems[index].quantity * newItems[index].rate
      }
      return { ...prev, items: newItems }
    })
  }

  const addInvoiceItem = () => {
    setNewInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', description: '', quantity: 1, rate: 0, amount: 0 }]
    }))
  }

  const removeInvoiceItem = (index) => {
    if (newInvoiceForm.items.length <= 1) return
    setNewInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
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
  // Cancel Quote with Reason - Opens dialog
  const openCancelQuoteDialog = (quoteId) => {
    setCancelQuoteDialog({ open: true, quoteId, reason: '' })
  }

  // Handle Cancel Quote Submission
  const handleCancelQuote = async () => {
    const { quoteId, reason } = cancelQuoteDialog
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }
    
    try {
      setLoading(true)
      
      // Get the quote to find its project
      const quote = quotes.find(q => q.id === quoteId)
      
      // Cancel the quote
      const res = await fetch('/api/flooring/enhanced/quotes', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          id: quoteId, 
          status: 'cancelled',
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
          cancelledBy: user?.id
        })
      })
      
      if (res.ok) {
        // If quote has a project, revert project status to measurement_done
        if (quote?.projectId) {
          await fetch('/api/flooring/enhanced/projects', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ 
              id: quote.projectId, 
              status: 'measurement_done',
              quoteCancelledAt: new Date().toISOString(),
              quoteCancellationReason: reason
            })
          })
          await fetchProjects()
        }
        
        toast.success('Quote cancelled. Measurements reopened for new quote.')
        await fetchQuotes()
        setCancelQuoteDialog({ open: false, quoteId: null, reason: '' })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to cancel quote')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

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
        // Close any open dialog after successful action
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

  // Handle Send for Installation (B2C only - AFTER material dispatch is delivered)
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

      // Safety check: Material must be dispatched and delivered first
      if (!invoice.dispatchId || invoice.dispatchStatus !== 'delivered') {
        toast.error('Material must be dispatched and delivered before starting installation.')
        return
      }

      // Create installation record with dispatch reference
      const res = await fetch('/api/flooring/enhanced/installations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: project.id,
          projectNumber: project.projectNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          dispatchId: invoice.dispatchId,
          dispatchNumber: invoice.dispatchNumber,
          customerId: project.customerId,
          customerName: project.customerName,
          siteAddress: project.site?.address || '',
          totalArea: project.totalArea || invoice.totalArea || 0,
          status: 'scheduled',
          notes: `Installation for ${invoice.invoiceNumber} (Material delivered via ${invoice.dispatchNumber || 'dispatch'})`
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

  // Open Dispatch Dialog - Comprehensive workflow
  const openDispatchDialog = async (invoice) => {
    setDispatchInvoice(invoice)
    setDispatchStep(1)
    setDispatchForm({
      driverName: '',
      driverPhone: '',
      vehicleNumber: '',
      transporterName: '',
      dispatchPhoto: null,
      notes: ''
    })
    setCustomerDues(null)
    setStockCheck(null)
    setShowDispatchDialog(true)
    
    // Fetch customer dues
    try {
      setDispatchLoading(true)
      const res = await fetch(`/api/flooring/enhanced/dispatch?checkDues=true&customerId=${invoice.customer?.id}`, { headers })
      const data = await res.json()
      if (data.dues) {
        setCustomerDues(data.dues)
      }
    } catch (error) {
      console.error('Error fetching customer dues:', error)
    } finally {
      setDispatchLoading(false)
    }
  }
  
  // Check stock availability for dispatch
  const checkDispatchStock = async () => {
    if (!dispatchInvoice) return
    
    try {
      setDispatchLoading(true)
      const items = (dispatchInvoice.items || []).map(item => ({
        productId: item.productId || item.id,
        productName: item.productName || item.name,
        quantity: item.quantity || item.area || 0,
        warehouseId: 'default'
      }))
      
      const res = await fetch(`/api/flooring/enhanced/dispatch?checkStock=true&items=${encodeURIComponent(JSON.stringify(items))}`, { headers })
      const data = await res.json()
      if (data.stockCheck) {
        setStockCheck(data.stockCheck)
      }
      setDispatchStep(3)
    } catch (error) {
      console.error('Error checking stock:', error)
      toast.error('Failed to check stock availability')
    } finally {
      setDispatchLoading(false)
    }
  }
  
  // Handle dispatch photo upload
  const handleDispatchPhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setDispatchForm(prev => ({ ...prev, dispatchPhoto: reader.result }))
    }
    reader.readAsDataURL(file)
  }
  
  // Create dispatch
  const handleCreateDispatch = async (forceDispatch = false) => {
    if (!dispatchInvoice) return
    
    if (!dispatchForm.driverName || !dispatchForm.vehicleNumber) {
      toast.error('Driver name and vehicle number are required')
      return
    }
    
    try {
      setDispatchLoading(true)
      
      const res = await fetch('/api/flooring/enhanced/dispatch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invoiceId: dispatchInvoice.id,
          driverDetails: {
            driverName: dispatchForm.driverName,
            driverPhone: dispatchForm.driverPhone,
            vehicleNumber: dispatchForm.vehicleNumber,
            transporterName: dispatchForm.transporterName
          },
          dispatchPhoto: dispatchForm.dispatchPhoto,
          notes: dispatchForm.notes,
          forceDispatch
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Dispatch ${data.dispatch?.dispatchNumber} created! Delivery Challan generated.`)
        setShowDispatchDialog(false)
        setDispatchInvoice(null)
        fetchInvoices()
        fetchDispatches()
        fetchProjects()
      } else {
        if (data.requiresAdminOverride) {
          // Show admin override option
          const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
          if (isAdmin) {
            const confirm = window.confirm('Stock is insufficient. As admin, do you want to proceed with dispatch anyway?')
            if (confirm) {
              handleCreateDispatch(true)
            }
          } else {
            toast.error('Insufficient stock. Only admin can override this.')
          }
        } else {
          toast.error(data.error || 'Failed to create dispatch')
        }
      }
    } catch (error) {
      toast.error('Failed to create dispatch')
    } finally {
      setDispatchLoading(false)
    }
  }

  // Handle B2B Dispatch (Legacy - now opens dialog)
  const handleB2BDispatch = async (invoice) => {
    // Open the comprehensive dispatch dialog instead
    openDispatchDialog(invoice)
  }

  // Handle B2B Delivery (Mark as delivered)
  const handleB2BDelivery = async (projectId) => {
    try {
      setLoading(true)
      await handleUpdateProjectStatus(projectId, 'delivered')
      toast.success('Material delivered! Order complete.')
      fetchProjects()
    } catch (error) {
      toast.error('Failed to mark as delivered')
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

        {/* Products Grid - Compact Cards */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredProducts.map(product => (
              <motion.div key={product.id} whileHover={{ y: -2 }}>
                <Card className="overflow-hidden hover:shadow-md transition-all h-full">
                  <div className="h-24 bg-gradient-to-br from-slate-50 to-slate-100 relative flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Layers className="h-8 w-8 text-slate-300" />
                    )}
                    <Badge className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 ${categoryColorById.get(product.categoryId) || categoryColorById.get(product.category) || 'bg-slate-100 text-slate-700'}`}>
                      {categoryLabelById.get(product.categoryId) || categoryLabelById.get(product.category) || product.category || 'N/A'}
                    </Badge>
                  </div>
                  <CardContent className="p-2.5">
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-slate-900 line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{product.brand}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1 shrink-0">{product.sku}</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t">
                      <div>
                        <p className="text-sm font-bold text-emerald-600">₹{product.pricing?.sellingPrice || 0}/sqft</p>
                        <p className="text-[10px] text-slate-400">{product.pack?.coverageSqftPerBox || product.pricing?.sqftPerBox || 0} sqft/box</p>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialogOpen({ type: 'view_product', data: product })} title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialogOpen({ type: 'product', data: product })} title="Edit Product">
                          <Edit className="h-3.5 w-3.5" />
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
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Segment</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Value</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => (
                  <TableRow key={project.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{project.projectNumber}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{project.name}</p>
                        {project.crmProjectId && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                            <CheckCircle2 className="h-3 w-3" /> CRM Synced
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{project.customerName || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={project.segment === 'b2b' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                        {project.segment === 'b2b' ? 'B2B (Dealer)' : 'B2C (Consumer)'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{project.type}</Badge>
                      <p className="text-xs text-slate-500 mt-1">{project.totalArea || 0} sqft</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-emerald-600">₹{(project.estimatedValue || 0).toLocaleString()}</p>
                    </TableCell>
                    {/* Actions Column - FIRST before Status */}
                    <TableCell>
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
                        {/* B2B: Mark as Delivered (when In Transit) */}
                        {project.segment === 'b2b' && project.status === 'in_transit' && (
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleB2BDelivery(project.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Delivered
                          </Button>
                        )}
                        {/* Edit button - disabled for advanced workflow stages */}
                        {(() => {
                          const nonEditableStatuses = ['quote_approved', 'invoice_sent', 'in_transit', 'delivered', 'payment_received', 'installation_scheduled', 'installation_in_progress', 'completed']
                          const isEditable = !nonEditableStatuses.includes(project.status)
                          return isEditable ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDialogOpen({ type: 'project', data: project })} 
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled
                              title="Cannot edit - project has progressed past editable stage"
                              className="opacity-30 cursor-not-allowed text-slate-300"
                            >
                              <Edit className="h-4 w-4 text-slate-300" />
                            </Button>
                          )
                        })()}
                        <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_project', data: project })} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    {/* Status Column - Display Only (auto-managed by workflow) */}
                    <TableCell>
                      <Badge className={ProjectStatus[project.status]?.color || 'bg-slate-100 text-slate-700'}>
                        {ProjectStatus[project.status]?.label || project.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        const price = getProductPrice(item.product, 'b2b') // B2B uses dealer price
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
            unitPrice: getProductPrice(item.product, 'b2b'), // B2B uses dealer price
            totalPrice: getProductPrice(item.product, 'b2b') * item.quantity,
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

        // Calculate totals - B2B uses dealer price
        const subtotal = items.reduce((sum, item) => {
          const price = getProductPrice(item.product, 'b2b')
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
            unitPrice: getProductPrice(item.product, 'b2b'), // B2B uses dealer price
            totalPrice: getProductPrice(item.product, 'b2b') * item.quantity,
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
                              {project.materialRequisition.inventoryBlocked && (() => {
                                const projStatus = project.status
                                const isDelivered = ['delivered', 'completed'].includes(projStatus)
                                const isDispatched = ['in_transit'].includes(projStatus)
                                const isInvoiced = ['invoice_sent'].includes(projStatus)
                                
                                if (isDelivered) {
                                  return <Badge variant="outline" className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Stock Deducted</Badge>
                                } else if (isDispatched) {
                                  return <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs"><Truck className="h-3 w-3 mr-1" /> Dispatched</Badge>
                                } else if (isInvoiced) {
                                  return <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs"><Receipt className="h-3 w-3 mr-1" /> Invoiced</Badge>
                                } else {
                                  return <Badge variant="outline" className="bg-amber-100 text-amber-700 text-xs"><Lock className="h-3 w-3 mr-1" /> Stock Reserved</Badge>
                                }
                              })()}
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
                  {(() => {
                    const projectStatus = selectedProject.status
                    const isDelivered = ['delivered', 'completed'].includes(projectStatus)
                    const isDispatched = ['in_transit'].includes(projectStatus)
                    const isInvoiced = ['invoice_sent'].includes(projectStatus)
                    const isBlocked = selectedProject.materialRequisition?.inventoryBlocked
                    
                    let bgColor = 'bg-slate-50'
                    let textColor = 'text-slate-600'
                    let statusIcon = <Unlock className="h-4 w-4 inline mr-1" />
                    let statusText = 'Available'
                    
                    if (isDelivered) {
                      bgColor = 'bg-green-50'
                      textColor = 'text-green-600'
                      statusIcon = <CheckCircle2 className="h-4 w-4 inline mr-1" />
                      statusText = 'Deducted & Delivered'
                    } else if (isDispatched) {
                      bgColor = 'bg-blue-50'
                      textColor = 'text-blue-600'
                      statusIcon = <Truck className="h-4 w-4 inline mr-1" />
                      statusText = 'Dispatched'
                    } else if (isInvoiced) {
                      bgColor = 'bg-purple-50'
                      textColor = 'text-purple-600'
                      statusIcon = <Receipt className="h-4 w-4 inline mr-1" />
                      statusText = 'Invoiced & Allocated'
                    } else if (isBlocked) {
                      bgColor = 'bg-amber-50'
                      textColor = 'text-amber-600'
                      statusIcon = <Lock className="h-4 w-4 inline mr-1" />
                      statusText = 'Reserved'
                    }
                    
                    return (
                      <div className={`p-3 rounded-lg ${bgColor}`}>
                        <p className="text-sm text-muted-foreground">Stock Status</p>
                        <p className={`font-medium ${textColor}`}>
                          {statusIcon} {statusText}
                        </p>
                      </div>
                    )
                  })()}
                </div>

                {/* Inventory Status Alert */}
                {selectedProject.materialRequisition?.inventoryBlocked && (() => {
                  const status = selectedProject.status
                  const isInvoiced = ['invoice_sent', 'in_transit', 'delivered', 'completed'].includes(status)
                  const isDispatched = ['in_transit', 'delivered', 'completed'].includes(status)
                  const isDelivered = ['delivered', 'completed'].includes(status)
                  
                  // Different messages based on status
                  let statusMessage = ''
                  let statusClass = 'border-amber-300 bg-amber-50'
                  let textClass = 'text-amber-800'
                  let subTextClass = 'text-amber-700'
                  let icon = <AlertTriangle className="h-5 w-5" />
                  
                  if (isDelivered) {
                    statusMessage = 'Materials delivered to customer'
                    statusClass = 'border-green-300 bg-green-50'
                    textClass = 'text-green-800'
                    subTextClass = 'text-green-700'
                    icon = <CheckCircle2 className="h-5 w-5" />
                  } else if (isDispatched) {
                    statusMessage = 'Materials dispatched and in transit'
                    statusClass = 'border-blue-300 bg-blue-50'
                    textClass = 'text-blue-800'
                    subTextClass = 'text-blue-700'
                    icon = <Truck className="h-5 w-5" />
                  } else if (isInvoiced) {
                    statusMessage = 'Stock allocated for invoice'
                    statusClass = 'border-purple-300 bg-purple-50'
                    textClass = 'text-purple-800'
                    subTextClass = 'text-purple-700'
                    icon = <Receipt className="h-5 w-5" />
                  } else {
                    statusMessage = 'Stock reserved for this requisition'
                  }
                  
                  return (
                    <div className={`mb-6 p-4 border-2 ${statusClass} rounded-lg`}>
                      <div className={`flex items-center gap-2 ${textClass}`}>
                        {icon}
                        <span className="font-medium">{statusMessage}</span>
                      </div>
                      <p className={`text-sm ${subTextClass} mt-1`}>
                        {selectedProject.materialRequisition.totalQuantity} units • 
                        {isDelivered ? ' Delivered' : isDispatched ? ' In Transit' : isInvoiced ? ' Invoiced' : ' Reserved'} on: {new Date(selectedProject.materialRequisition.reservedAt || selectedProject.materialRequisition.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )
                })()}

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
                            const price = getProductPrice(product, 'b2b') // B2B uses dealer price
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
                      // Check if materials are already invoiced/dispatched/delivered - editing NOT allowed
                      const isInvoiced = ['invoice_sent', 'in_transit', 'delivered', 'completed'].includes(status)
                      const isDispatched = ['in_transit', 'delivered', 'completed'].includes(status)
                      const isDelivered = ['delivered', 'completed'].includes(status)
                      const canEdit = !isInvoiced // Can only edit if NOT yet invoiced
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <Button 
                              variant="outline"
                              disabled={loading || !canEdit}
                              onClick={handleUpdateMaterials}
                              className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Materials
                            </Button>
                            {status === 'material_requisition' && (
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={loading}
                                onClick={async () => {
                                  await handleUpdateProjectStatus(selectedProject.id, 'material_processing')
                                  toast.success('Proceeding to processing. Stock remains allocated.')
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
                          {/* Professional messaging based on status */}
                          <p className={`text-sm flex items-center gap-2 ${isDelivered ? 'text-green-700' : isDispatched ? 'text-blue-700' : isInvoiced ? 'text-purple-700' : 'text-amber-700'}`}>
                            {isDelivered ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Materials delivered. Inventory has been deducted from stock.
                              </>
                            ) : isDispatched ? (
                              <>
                                <Truck className="h-4 w-4" />
                                Materials dispatched. Inventory deducted and in transit.
                              </>
                            ) : isInvoiced ? (
                              <>
                                <Receipt className="h-4 w-4" />
                                Invoice generated. Stock has been allocated and deducted.
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4" />
                                Stock allocated for this requisition. Click "Edit Materials" to modify.
                              </>
                            )}
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
      },
      cancelled: { 
        label: 'Cancelled', 
        color: 'bg-gray-200 text-gray-500 border-gray-300', 
        icon: X,
        actions: ['view', 'download'],
        canEdit: false,
        locked: true,
        priority: 8
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
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Quote #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Items</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Valid Until</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                      <TableRow key={quote.id} className={`hover:bg-slate-50 transition-colors ${quote.status === 'cancelled' ? 'bg-gray-100 opacity-70' : isLocked ? 'bg-purple-50/30' : ''} ${isExpired ? 'bg-red-50/30' : ''}`}>
                        {/* Quote Number */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${actualConfig.color.split(' ')[0]}`}>
                              <StatusIcon className={`h-4 w-4 ${actualConfig.color.split(' ')[1]}`} />
                            </div>
                            <div>
                              <p className={`font-semibold ${quote.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-slate-900'}`}>{quote.quoteNumber}</p>
                              <p className="text-xs text-slate-500">{new Date(quote.createdAt).toLocaleDateString('en-IN')}</p>
                            </div>
                            {quote.version > 1 && <Badge variant="outline" className="text-xs">v{quote.version}</Badge>}
                          </div>
                        </TableCell>
                        
                        {/* Customer */}
                        <TableCell className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{quote.customer?.name || '-'}</p>
                            <p className="text-xs text-slate-500">{quote.customer?.phone || quote.customer?.email || ''}</p>
                          </div>
                        </TableCell>
                        
                        {/* Project */}
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {projectDisplay}
                          </Badge>
                        </TableCell>
                        
                        {/* Items & Area */}
                        <TableCell className="px-4 py-3">
                          <p className="font-medium">{quote.items?.length || 0} items</p>
                          <p className="text-xs text-slate-500">{(quote.totalArea || 0).toFixed(0)} sqft</p>
                        </TableCell>
                        
                        {/* Amount */}
                        <TableCell className="px-4 py-3">
                          <p className={`font-bold ${isLocked ? 'text-purple-600' : 'text-emerald-600'}`}>
                            ₹{(quote.grandTotal || 0).toLocaleString('en-IN')}
                          </p>
                          {quote.discountAmount > 0 && (
                            <p className="text-xs text-emerald-500">Disc: ₹{quote.discountAmount.toLocaleString()}</p>
                          )}
                        </TableCell>
                        
                        {/* Created Date */}
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          {new Date(quote.createdAt).toLocaleDateString('en-IN')}
                        </TableCell>
                        
                        {/* Valid Until */}
                        <TableCell className="px-4 py-3 text-sm">
                          <span className={isExpired ? 'text-red-600 font-medium' : 'text-slate-500'}>
                            {new Date(quote.validUntil).toLocaleDateString('en-IN')}
                          </span>
                          {isExpired && <p className="text-xs text-red-500">Expired</p>}
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="px-4 py-3">
                          <Badge className={`${actualConfig.color} border flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            {actualConfig.label}
                          </Badge>
                          {isLocked && (
                            <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </p>
                          )}
                        </TableCell>
                        
                        {/* Actions - SAP/Zoho Style with Clear Workflow Buttons */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Cancelled Quote - Only View/Download */}
                            {quote.status === 'cancelled' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setDialogOpen({ type: 'view_quote', data: quote })}
                                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadQuote(quote)}
                                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            
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
                            
                            {/* FULFILLMENT WORKFLOW for Approved Quotes */}
                            {quote.status === 'approved' && (
                              <div className="flex items-center gap-1">
                                {/* Primary Action: Prepare Material (Pick List) */}
                                {!quote.pickListId ? (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleCreatePickList(quote)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                  >
                                    <Package className="h-3.5 w-3.5 mr-1" /> Prepare Material
                                  </Button>
                                ) : quote.dcId ? (
                                  // DC already exists - show DC status
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      // Navigate to challans tab with this DC selected
                                      setActiveTab('challans')
                                    }}
                                    className={
                                      quote.dcStatus === 'ISSUED' ? 'border-blue-300 text-blue-600 bg-blue-50' :
                                      quote.dcStatus === 'DELIVERED' ? 'border-green-300 text-green-600 bg-green-50' :
                                      'border-slate-300 text-slate-600 bg-slate-50'
                                    }
                                  >
                                    <Truck className="h-3.5 w-3.5 mr-1" /> 
                                    {quote.dcNumber || 'View DC'} 
                                    <Badge variant="outline" className="ml-1 text-xs">
                                      {quote.dcStatus === 'ISSUED' ? 'Dispatched' : 
                                       quote.dcStatus === 'DELIVERED' ? 'Delivered' : 
                                       quote.dcStatus || 'DRAFT'}
                                    </Badge>
                                  </Button>
                                ) : quote.pickListStatus === 'MATERIAL_READY' ? (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleCreateDCFromQuote(quote)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Truck className="h-3.5 w-3.5 mr-1" /> Create DC
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewPickList(quote.pickListId)}
                                    className="border-amber-300 text-amber-600"
                                  >
                                    <Package className="h-3.5 w-3.5 mr-1" /> {quote.pickListStatus || 'View Pick List'}
                                  </Button>
                                )}
                                
                                {/* Fulfillment Actions Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="px-2">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="text-xs text-slate-500">Fulfillment Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    
                                    {/* Pick List Actions */}
                                    {!quote.pickListId ? (
                                      <DropdownMenuItem onClick={() => handleCreatePickList(quote)}>
                                        <Package className="h-4 w-4 mr-2 text-amber-600" /> Create Pick List
                                      </DropdownMenuItem>
                                    ) : (
                                      <>
                                        <DropdownMenuItem onClick={() => handleViewPickList(quote.pickListId)}>
                                          <Eye className="h-4 w-4 mr-2" /> View Pick List
                                          <Badge variant="outline" className="ml-auto text-xs">{quote.pickListStatus}</Badge>
                                        </DropdownMenuItem>
                                        {quote.pickListStatus !== 'MATERIAL_READY' && quote.pickListStatus !== 'CLOSED' && (
                                          <DropdownMenuItem onClick={() => handleConfirmPickList(quote.pickListId)}>
                                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Confirm Material Ready
                                          </DropdownMenuItem>
                                        )}
                                        {/* Cancel and Recreate options */}
                                        {quote.pickListStatus !== 'CLOSED' && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                              onClick={() => handleRecreatePickList(quote)}
                                              className="text-amber-600"
                                            >
                                              <RefreshCw className="h-4 w-4 mr-2" /> Recreate Pick List
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    
                                    {/* DC Actions */}
                                    {quote.dcId ? (
                                      <>
                                        <DropdownMenuItem onClick={() => setActiveTab('challans')}>
                                          <Truck className="h-4 w-4 mr-2 text-blue-600" /> View DC ({quote.dcNumber})
                                          <Badge variant="outline" className="ml-auto text-xs">{quote.dcStatus}</Badge>
                                        </DropdownMenuItem>
                                        {quote.dcStatus === 'DRAFT' && (
                                          <DropdownMenuItem onClick={() => handleIssueDC(quote.dcId)}>
                                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Issue DC
                                          </DropdownMenuItem>
                                        )}
                                      </>
                                    ) : (
                                      <DropdownMenuItem 
                                        onClick={() => handleCreateDCFromQuote(quote)}
                                        disabled={quote.pickListStatus !== 'MATERIAL_READY' && !fulfillmentSettings?.allowBypassPickListForDC}
                                      >
                                        <Truck className="h-4 w-4 mr-2 text-blue-600" /> Create Delivery Challan
                                        {quote.pickListStatus !== 'MATERIAL_READY' && (
                                          <Lock className="h-3 w-3 ml-auto text-slate-400" />
                                        )}
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {(quote.challanIds?.length > 0) && (
                                      <DropdownMenuItem onClick={() => handleViewChallans(quote.id)}>
                                        <FileText className="h-4 w-4 mr-2" /> View Challans ({quote.challanIds.length})
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    
                                    {/* Invoice Actions */}
                                    <DropdownMenuItem 
                                      onClick={() => handleCreateInvoiceFromQuote(quote)}
                                      disabled={quote.pickListStatus !== 'MATERIAL_READY' && !fulfillmentSettings?.allowBypassPickListForInvoice}
                                    >
                                      <Receipt className="h-4 w-4 mr-2 text-purple-600" /> Create Invoice
                                      {quote.pickListStatus !== 'MATERIAL_READY' && (
                                        <Lock className="h-3 w-3 ml-auto text-slate-400" />
                                      )}
                                    </DropdownMenuItem>
                                    
                                    {quote.invoiceId && (
                                      <DropdownMenuItem onClick={() => handleViewInvoice(quote.invoiceId)}>
                                        <Receipt className="h-4 w-4 mr-2" /> View Invoice
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                {/* Status Badges */}
                                <div className="hidden xl:flex items-center gap-1 ml-2">
                                  {quote.pickListId && !quote.dcId && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        quote.pickListStatus === 'MATERIAL_READY' ? 'bg-green-50 text-green-700 border-green-200' :
                                        quote.pickListStatus === 'PICKING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <Package className="h-3 w-3 mr-1" />
                                      {quote.pickListStatus === 'MATERIAL_READY' ? 'Ready' : quote.pickListStatus}
                                    </Badge>
                                  )}
                                  {quote.dcId && quote.dcStatus && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        quote.dcStatus === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200' :
                                        quote.dcStatus === 'ISSUED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <Truck className="h-3 w-3 mr-1" />
                                      {quote.dcStatus === 'ISSUED' ? 'Dispatched' : 
                                       quote.dcStatus === 'DELIVERED' ? 'Delivered' : 
                                       quote.dcStatus}
                                    </Badge>
                                  )}
                                </div>
                              </div>
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
                                
                                {/* For Cancelled quotes - Show locked message and cancellation reason */}
                                {quote.status === 'cancelled' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-gray-400">
                                      <Lock className="h-4 w-4 mr-2" /> Quote Cancelled
                                    </DropdownMenuItem>
                                    {quote.cancellationReason && (
                                      <div className="px-2 py-1.5 text-xs text-gray-500 italic">
                                        Reason: {quote.cancellationReason}
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {/* Edit - Only for draft/revised (not cancelled) */}
                                {canEdit && quote.status !== 'cancelled' && (
                                  <DropdownMenuItem onClick={() => setDialogOpen({ type: 'quote', data: quote })}>
                                    <Edit className="h-4 w-4 mr-2 text-blue-600" /> Edit Quote
                                  </DropdownMenuItem>
                                )}
                                
                                {quote.status !== 'cancelled' && <DropdownMenuSeparator />}
                                
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
                                    <DropdownMenuItem onClick={() => openCancelQuoteDialog(quote.id)} className="text-red-600 focus:text-red-600">
                                      <X className="h-4 w-4 mr-2" /> Cancel Quote
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openCancelQuoteDialog(quote.id)} className="text-red-600 focus:text-red-600">
                                      <X className="h-4 w-4 mr-2" /> Cancel Quote
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {quote.status === 'approved' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleDownloadQuote(quote)}>
                                      <Printer className="h-4 w-4 mr-2 text-slate-600" /> Print for Records
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openCancelQuoteDialog(quote.id)} className="text-red-600 focus:text-red-600">
                                      <X className="h-4 w-4 mr-2" /> Cancel Quote
                                    </DropdownMenuItem>
                                  </>
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
                                    <DropdownMenuItem onClick={() => openCancelQuoteDialog(quote.id)} className="text-red-600 focus:text-red-600">
                                      <X className="h-4 w-4 mr-2" /> Cancel Quote
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
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
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
  
  // ============================================
  // CHALLANS / DISPATCH TAB
  // ============================================
  const renderChallans = () => {
    const DCStatusConfig = {
      DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
      ISSUED: { label: 'Issued', color: 'bg-blue-100 text-blue-700', icon: Truck },
      DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-500', icon: Lock },
      CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: X }
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Delivery Challans / Dispatch</h2>
            <p className="text-sm text-slate-500">Manage dispatch and delivery tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchChallans}
              disabled={challansLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${challansLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries({
            total: { label: 'Total', icon: FileText, color: 'text-slate-600' },
            DRAFT: { label: 'Draft', icon: FileText, color: 'text-slate-600' },
            ISSUED: { label: 'Issued', icon: Truck, color: 'text-blue-600' },
            DELIVERED: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600' },
            CLOSED: { label: 'Closed', icon: Lock, color: 'text-gray-500' }
          }).map(([key, config]) => {
            const count = key === 'total' 
              ? challans.length 
              : challans.filter(c => c.status === key).length
            const Icon = config.icon
            return (
              <Card key={key} className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-slate-500">{config.label}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Challans Table */}
        <Card>
          {challansLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading challans...</span>
            </div>
          ) : challans.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No Delivery Challans Yet</h3>
              <p className="text-slate-500 mt-1">
                Create a DC from an approved quote to start dispatching materials.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="px-4">DC Number</TableHead>
                  <TableHead>Customer / Ship To</TableHead>
                  <TableHead>Quote / Invoice</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challans.map((dc) => {
                  const statusConfig = DCStatusConfig[dc.status] || DCStatusConfig.DRAFT
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow key={dc.id} className={`hover:bg-slate-50 ${dc.status === 'CANCELLED' ? 'bg-gray-50 opacity-70' : ''}`}>
                      {/* DC Number */}
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${statusConfig.color.split(' ')[0]}`}>
                            <StatusIcon className={`h-4 w-4 ${statusConfig.color.split(' ')[1]}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{dc.dcNo}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(dc.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Customer / Ship To */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-800">{dc.billToName || '-'}</p>
                          {dc.thirdPartyDelivery && dc.shipToName !== dc.billToName && (
                            <p className="text-xs text-purple-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Ship to: {dc.shipToName}
                            </p>
                          )}
                          {dc.receiverName && dc.receiverName !== dc.shipToName && (
                            <p className="text-xs text-slate-500">
                              Receiver: {dc.receiverName}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Quote / Invoice */}
                      <TableCell>
                        <div className="text-sm">
                          {dc.quoteNumber && (
                            <p className="text-slate-600">Quote: {dc.quoteNumber}</p>
                          )}
                          {dc.invoiceNumber && (
                            <p className="text-slate-600">Invoice: {dc.invoiceNumber}</p>
                          )}
                          {dc.pickListNumber && (
                            <p className="text-xs text-amber-600">
                              <Package className="h-3 w-3 inline mr-1" />
                              {dc.pickListNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Items */}
                      <TableCell className="text-center">
                        <div>
                          <p className="font-medium">{dc.totalBoxes || 0} boxes</p>
                          <p className="text-xs text-slate-500">{dc.totalArea?.toFixed(0) || 0} sqft</p>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        {dc.issuedAt && dc.status !== 'DRAFT' && (
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(dc.issuedAt).toLocaleDateString('en-IN')}
                          </p>
                        )}
                        {dc.deliveredAt && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {new Date(dc.deliveredAt).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </TableCell>

                      {/* Transport */}
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {dc.vehicleNo && <p>{dc.vehicleNo}</p>}
                          {dc.driverName && <p className="text-xs">{dc.driverName}</p>}
                          {!dc.vehicleNo && !dc.driverName && <span className="text-slate-400">-</span>}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Primary Action based on status */}
                          {dc.status === 'DRAFT' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleIssueDC(dc.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Truck className="h-3.5 w-3.5 mr-1" /> Issue DC
                            </Button>
                          )}
                          {dc.status === 'ISSUED' && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleMarkDCDelivered(dc.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Delivered
                              </Button>
                              {!dc.invoiceId && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleCreateInvoiceFromDC(dc)}
                                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                >
                                  <Receipt className="h-3.5 w-3.5 mr-1" /> Create Invoice
                                </Button>
                              )}
                            </div>
                          )}
                          {dc.status === 'DELIVERED' && (
                            <>
                              {!dc.invoiceId ? (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleCreateInvoiceFromDC(dc)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  <Receipt className="h-3.5 w-3.5 mr-1" /> Create Invoice
                                </Button>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Invoiced
                                </Badge>
                              )}
                            </>
                          )}

                          {/* More Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewDCPdf(dc.id, 'view')}>
                                <FileText className="h-4 w-4 mr-2" /> View/Print DC
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDCPdf(dc.id, 'download')}>
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {dc.status === 'DRAFT' && (
                                <>
                                  <DropdownMenuItem onClick={() => setDcDialog({ open: true, data: { ...dc, editing: true } })}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      if (confirm('Cancel this delivery challan?')) {
                                        try {
                                          await fetch(`/api/flooring/enhanced/challans?id=${dc.id}`, {
                                            method: 'DELETE',
                                            headers
                                          })
                                          toast.success('DC cancelled')
                                          fetchChallans()
                                        } catch {
                                          toast.error('Failed to cancel DC')
                                        }
                                      }
                                    }}
                                    className="text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" /> Cancel DC
                                  </DropdownMenuItem>
                                </>
                              )}
                              {dc.status === 'DELIVERED' && dc.invoiceId && (
                                <DropdownMenuItem onClick={() => {
                                  // View invoice
                                  setActiveTab('invoices')
                                  toast.info(`Showing invoice ${dc.invoiceNumber || dc.invoiceId}`)
                                }}>
                                  <Receipt className="h-4 w-4 mr-2" /> View Invoice
                                </DropdownMenuItem>
                              )}
                              {dc.status === 'ISSUED' && dc.invoiceId && (
                                <DropdownMenuItem onClick={() => {
                                  // View invoice
                                  setActiveTab('invoices')
                                  toast.info(`Showing invoice ${dc.invoiceNumber || dc.invoiceId}`)
                                }}>
                                  <Receipt className="h-4 w-4 mr-2" /> View Invoice
                                </DropdownMenuItem>
                              )}
                              {(dc.status === 'ISSUED' || dc.status === 'DELIVERED') && !dc.invoiceId && (
                                <DropdownMenuItem onClick={() => handleCreateInvoiceFromDC(dc)}>
                                  <Receipt className="h-4 w-4 mr-2" /> Create Invoice
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    )
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Invoice</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Paid</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Balance</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">CRM</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map(invoice => {
                    const isOverdue = new Date(invoice.dueDate) < new Date() && !['paid', 'cancelled'].includes(invoice.status)
                    const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)) : 0
                    
                    // Segment now comes correctly from API (enriched with project data)
                    const isB2B = invoice.projectSegment === 'b2b'
                    
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
                            <Badge variant="outline" className="text-xs mt-1">
                              {isB2B ? 'B2B' : 'B2C'}
                            </Badge>
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
                            
                            {/* STEP 1: Paid - Dispatch Material (Both B2B and B2C) */}
                            {/* Only show Dispatch if:
                                - Invoice is paid
                                - No dispatch already exists
                                - Invoice was NOT created from a DC (source !== 'delivery_challan')
                            */}
                            {invoice.status === 'paid' && !invoice.dispatchId && invoice.source !== 'delivery_challan' && !invoice.dcId && (
                              <Button 
                                size="sm" 
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => openDispatchDialog(invoice)}
                              >
                                <Truck className="h-4 w-4 mr-1" /> Dispatch
                              </Button>
                            )}
                            
                            {/* === DC-based Invoice Status === */}
                            {/* When invoice is linked to a DC (from delivery_challan or has dcId) */}
                            {(invoice.source === 'delivery_challan' || invoice.dcId) && (
                              <>
                                {/* DC ISSUED = In Transit - NO installation button */}
                                {invoice.dispatchStatus === 'dispatched' && (
                                  <Badge className="bg-blue-100 text-blue-700">
                                    <Truck className="h-3 w-3 mr-1" /> In Transit
                                    {invoice.dcNumber && <span className="ml-1 text-xs">({invoice.dcNumber})</span>}
                                  </Badge>
                                )}
                                
                                {/* DC DELIVERED - Show Delivered badge for BOTH B2B and B2C */}
                                {invoice.dispatchStatus === 'delivered' && (
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
                                    {invoice.dcNumber && <span className="ml-1 text-xs">({invoice.dcNumber})</span>}
                                  </Badge>
                                )}
                                
                                {/* DC DELIVERED - B2C ONLY: Show Start Installation button */}
                                {invoice.dispatchStatus === 'delivered' && !isB2B && !invoice.installationCreated && (
                                  <Button 
                                    size="sm" 
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                    onClick={() => handleSendForInstallation(invoice)}
                                  >
                                    <Wrench className="h-4 w-4 mr-1" /> Start Installation
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {/* === Non-DC Invoice Status === */}
                            {/* For invoices dispatched directly (not from DC) */}
                            {invoice.dispatchId && !invoice.dcId && invoice.source !== 'delivery_challan' && (
                              <>
                                {/* In Transit */}
                                {invoice.dispatchStatus !== 'delivered' && (
                                  <Badge className={invoice.dispatchStatus === 'in_transit' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                                    <Truck className="h-3 w-3 mr-1" /> 
                                    {invoice.dispatchStatus === 'in_transit' ? 'In Transit' : 
                                     invoice.dispatchStatus === 'pending' ? 'Ready to Ship' : 'Dispatched'}
                                  </Badge>
                                )}
                                
                                {/* Delivered - B2C: Start Installation */}
                                {invoice.dispatchStatus === 'delivered' && !isB2B && !invoice.installationCreated && (
                                  <Button 
                                    size="sm" 
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                    onClick={() => handleSendForInstallation(invoice)}
                                  >
                                    <Wrench className="h-4 w-4 mr-1" /> Start Installation
                                  </Button>
                                )}
                                
                                {/* Delivered - B2B: Show badge */}
                                {invoice.dispatchStatus === 'delivered' && isB2B && (
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
                                  </Badge>
                                )}
                              </>
                            )}
                            
                            {/* Show installation status for B2C */}
                            {invoice.installationCreated && !isB2B && (
                              <Badge className={
                                invoice.installationStatus === 'completed' ? "bg-green-100 text-green-700" :
                                invoice.installationStatus === 'in_progress' ? "bg-blue-100 text-blue-700" :
                                "bg-teal-100 text-teal-700"
                              }>
                                <Wrench className="h-3 w-3 mr-1" /> 
                                {invoice.installationStatus === 'completed' ? 'Installation Complete' :
                                 invoice.installationStatus === 'in_progress' ? 'Installation In Progress' :
                                 'Installation Scheduled'}
                              </Badge>
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
                                  <DropdownMenuItem onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token')
                                      const response = await fetch(`/api/flooring/enhanced/invoices/pdf?id=${invoice.id}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      })
                                      const html = await response.text()
                                      const newWindow = window.open('', '_blank')
                                      newWindow.document.write(html)
                                      newWindow.document.close()
                                    } catch (error) {
                                      toast.error('Failed to open invoice')
                                    }
                                  }}>
                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token')
                                      const response = await fetch(`/api/flooring/enhanced/invoices/pdf?id=${invoice.id}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      })
                                      const html = await response.text()
                                      const printWindow = window.open('', '_blank')
                                      printWindow.document.write(html)
                                      printWindow.document.close()
                                      setTimeout(() => printWindow.print(), 500)
                                    } catch (error) {
                                      toast.error('Failed to print invoice')
                                    }
                                  }}>
                                    <Printer className="h-4 w-4 mr-2" /> Print
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  
                                  {/* Edit Invoice - Only for draft or sent invoices */}
                                  {['draft', 'sent'].includes(invoice.status) && (
                                    <DropdownMenuItem 
                                      onClick={() => setEditInvoiceDialog({ open: true, invoice, reason: '' })}
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {/* Void Invoice - For any non-voided invoice */}
                                  {!['voided', 'cancelled'].includes(invoice.status) && (
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => setVoidInvoiceDialog({ open: true, invoice, reason: '' })}
                                    >
                                      <X className="h-4 w-4 mr-2" /> Void Invoice
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {invoice.status !== 'paid' && !['voided', 'cancelled'].includes(invoice.status) && (
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

  // Installation Reports Tab Component
  const InstallationReportsTab = ({ headers, installers }) => {
    const [reportsData, setReportsData] = useState({})
    const [reportType, setReportType] = useState('overview')
    const [loadingReports, setLoadingReports] = useState(false)

    const fetchReportsData = async (type) => {
      try {
        setLoadingReports(true)
        const res = await fetch(`/api/flooring/enhanced/reports/installations?type=${type}`, { headers })
        const data = await res.json()
        if (data) {
          setReportsData(prev => ({ ...prev, [type]: data }))
        }
      } catch (error) {
        console.error('Reports fetch error:', error)
      } finally {
        setLoadingReports(false)
      }
    }

    useEffect(() => {
      fetchReportsData(reportType)
    }, [reportType])

    const overview = reportsData.overview || {}
    const installersReport = reportsData.installers || {}
    const costs = reportsData.costs || {}
    const satisfaction = reportsData.satisfaction || {}

    return (
      <div className="space-y-4">
        {/* Report Type Selector */}
        <div className="flex items-center gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'installers', label: 'Team Performance', icon: Users },
            { id: 'costs', label: 'Cost Analysis', icon: IndianRupee },
            { id: 'satisfaction', label: 'Customer Satisfaction', icon: Star }
          ].map(rt => (
            <Button
              key={rt.id}
              variant={reportType === rt.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReportType(rt.id)}
            >
              <rt.icon className="h-4 w-4 mr-2" />
              {rt.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => fetchReportsData(reportType)}>
            <RefreshCw className={`h-4 w-4 ${loadingReports ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loadingReports && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
            <p className="text-slate-500 mt-2">Loading reports...</p>
          </div>
        )}

        {/* Overview Report */}
        {reportType === 'overview' && !loadingReports && overview.overview && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Installations</p>
                    <p className="text-2xl font-bold">{overview.overview.totalInstallations}</p>
                  </div>
                  <Wrench className="h-8 w-8 text-blue-200" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {overview.overview.activeInstallations} active
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="text-2xl font-bold">{overview.overview.completedInstallations}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-200" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {overview.overview.totalAreaInstalled?.toLocaleString()} sqft installed
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Avg Completion</p>
                    <p className="text-2xl font-bold">{overview.overview.avgCompletionDays}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-200" />
                </div>
                <p className="text-xs text-slate-400 mt-1">days per job</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Open Issues</p>
                    <p className="text-2xl font-bold">{overview.overview.openIssues}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-200" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {overview.overview.totalIssues} total issues
                </p>
              </Card>
            </div>

            {/* Month Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">This Month vs Last Month</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Installations</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{overview.comparison?.installationsThisMonth}</span>
                      <Badge variant="outline" className={overview.comparison?.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {overview.comparison?.growthPercent >= 0 ? '+' : ''}{overview.comparison?.growthPercent}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Completed</span>
                    <span className="font-bold">{overview.comparison?.completedThisMonth} vs {overview.comparison?.completedLastMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Area Installed</span>
                    <span className="font-bold">{overview.comparison?.areaThisMonth?.toLocaleString()} sqft</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3">Status Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(overview.statusBreakdown || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize">{status.replace('_', ' ')}</span>
                          <span>{count}</span>
                        </div>
                        <Progress 
                          value={(count / (overview.overview.totalInstallations || 1)) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Monthly Trend Chart */}
            <Card className="p-4">
              <h4 className="font-medium mb-4">6-Month Trend</h4>
              <div className="h-48 flex items-end justify-between gap-2">
                {(overview.monthlyTrend || []).map((month, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col gap-1">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${(month.total / Math.max(...(overview.monthlyTrend || []).map(m => m.total || 1))) * 120}px` }}
                        title={`Total: ${month.total}`}
                      ></div>
                      <div 
                        className="w-full bg-green-500 rounded-b"
                        style={{ height: `${(month.completed / Math.max(...(overview.monthlyTrend || []).map(m => m.total || 1))) * 120}px` }}
                        title={`Completed: ${month.completed}`}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{month.month}</p>
                    <p className="text-xs font-medium">{month.total}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-sm text-slate-500">Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-sm text-slate-500">Completed</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Installers Performance Report */}
        {reportType === 'installers' && !loadingReports && installersReport.installers && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{installersReport.summary?.totalInstallers}</p>
                <p className="text-sm text-slate-500">Total Team</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{installersReport.summary?.available}</p>
                <p className="text-sm text-slate-500">Available Now</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{installersReport.summary?.thirdParty}</p>
                <p className="text-sm text-slate-500">Third Party</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <p className="text-2xl font-bold">{installersReport.summary?.avgRating || '-'}</p>
                </div>
                <p className="text-sm text-slate-500">Avg Rating</p>
              </Card>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Top by Jobs
                </h4>
                <div className="space-y-2">
                  {(installersReport.topPerformers?.byJobs || []).slice(0, 3).map((inst, idx) => (
                    <div key={inst.id} className="flex items-center gap-2">
                      <Badge className={idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}>
                        #{idx + 1}
                      </Badge>
                      <span className="flex-1 truncate">{inst.name}</span>
                      <span className="font-bold">{inst.completedJobs}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Square className="h-4 w-4 text-blue-500" /> Top by Area
                </h4>
                <div className="space-y-2">
                  {(installersReport.topPerformers?.byArea || []).slice(0, 3).map((inst, idx) => (
                    <div key={inst.id} className="flex items-center gap-2">
                      <Badge className={idx === 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                        #{idx + 1}
                      </Badge>
                      <span className="flex-1 truncate">{inst.name}</span>
                      <span className="font-bold">{inst.totalAreaInstalled?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Top Rated
                </h4>
                <div className="space-y-2">
                  {(installersReport.topPerformers?.byRating || []).slice(0, 3).map((inst, idx) => (
                    <div key={inst.id} className="flex items-center gap-2">
                      <Badge className={idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}>
                        #{idx + 1}
                      </Badge>
                      <span className="flex-1 truncate">{inst.name}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="font-bold">{inst.avgRating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* All Installers Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Installer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Jobs</TableHead>
                    <TableHead className="text-center">Area (sqft)</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">On-Time %</TableHead>
                    <TableHead className="text-center">Avg Days</TableHead>
                    <TableHead className="text-center">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(installersReport.installers || []).map(inst => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={inst.type === 'in_house' ? 'bg-blue-50' : 'bg-purple-50'}>
                          {inst.type === 'in_house' ? 'In-House' : 'Vendor'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{inst.completedJobs}</TableCell>
                      <TableCell className="text-center">{inst.totalAreaInstalled?.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {inst.avgRating > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            {inst.avgRating}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={inst.onTimeRate >= 80 ? 'bg-green-100 text-green-700' : inst.onTimeRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                          {inst.onTimeRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{inst.avgDuration || '-'}</TableCell>
                      <TableCell className="text-center">{inst.issuesCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Cost Analysis Report */}
        {reportType === 'costs' && !loadingReports && costs.totals && (
          <div className="space-y-4">
            {/* Cost Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-blue-500">
                <p className="text-sm text-slate-500">Total Cost</p>
                <p className="text-2xl font-bold">₹{costs.totals.totalCost?.toLocaleString()}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-green-500">
                <p className="text-sm text-slate-500">Labor Cost</p>
                <p className="text-2xl font-bold">₹{costs.totals.laborCost?.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{costs.breakdown?.laborPercent}% of total</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-purple-500">
                <p className="text-sm text-slate-500">Material Cost</p>
                <p className="text-2xl font-bold">₹{costs.totals.materialCost?.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{costs.breakdown?.materialPercent}% of total</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <p className="text-sm text-slate-500">Avg Cost/sqft</p>
                <p className="text-2xl font-bold">₹{costs.totals.avgCostPerSqft}</p>
                <p className="text-xs text-slate-400">{costs.totals.totalAreaCompleted?.toLocaleString()} sqft total</p>
              </Card>
            </div>

            {/* Cost Breakdown Chart */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Cost Breakdown</h4>
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                      <circle 
                        cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="20"
                        strokeDasharray={`${(costs.breakdown?.laborPercent || 0) * 2.51} 251`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold">₹{((costs.totals.totalCost || 0) / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm">Labor ({costs.breakdown?.laborPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-200 rounded"></div>
                    <span className="text-sm">Material ({costs.breakdown?.materialPercent}%)</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-4">Monthly Cost Trend</h4>
                <div className="space-y-3">
                  {(costs.monthlyCosts || []).map((month, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-10 text-sm text-slate-500">{month.month}</span>
                      <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden flex">
                        <div 
                          className="bg-blue-500 h-full"
                          style={{ width: `${(month.labor / (Math.max(...(costs.monthlyCosts || []).map(m => m.total || 1)))) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-purple-500 h-full"
                          style={{ width: `${(month.material / (Math.max(...(costs.monthlyCosts || []).map(m => m.total || 1)))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">₹{(month.total / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Customer Satisfaction Report */}
        {reportType === 'satisfaction' && !loadingReports && satisfaction.ratings && (
          <div className="space-y-4">
            {/* Satisfaction Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  <p className="text-3xl font-bold">{satisfaction.ratings.average}</p>
                </div>
                <p className="text-sm text-slate-500">Average Rating</p>
                <p className="text-xs text-slate-400">{satisfaction.ratings.total} reviews</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{satisfaction.nps?.score}</p>
                <p className="text-sm text-slate-500">NPS Score</p>
                <p className="text-xs text-slate-400">
                  {satisfaction.nps?.promoters} promoters, {satisfaction.nps?.detractors} detractors
                </p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{satisfaction.issues?.resolved}</p>
                <p className="text-sm text-slate-500">Issues Resolved</p>
                <p className="text-xs text-slate-400">{satisfaction.issues?.open} still open</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{satisfaction.issues?.avgResolutionDays}</p>
                <p className="text-sm text-slate-500">Avg Resolution</p>
                <p className="text-xs text-slate-400">days to resolve</p>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rating Distribution */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Rating Distribution</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(rating => (
                    <div key={rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-12">
                        <span>{rating}</span>
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      </div>
                      <Progress 
                        value={(satisfaction.ratings.distribution?.[rating] || 0) / (satisfaction.ratings.total || 1) * 100} 
                        className="flex-1 h-3"
                      />
                      <span className="w-8 text-sm text-slate-500">{satisfaction.ratings.distribution?.[rating] || 0}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Issues by Severity */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Issues by Severity</h4>
                <div className="space-y-3">
                  {[
                    { level: 'critical', color: 'bg-red-500', label: 'Critical' },
                    { level: 'high', color: 'bg-orange-500', label: 'High' },
                    { level: 'medium', color: 'bg-amber-500', label: 'Medium' },
                    { level: 'low', color: 'bg-slate-400', label: 'Low' }
                  ].map(sev => (
                    <div key={sev.level} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded ${sev.color}`}></div>
                      <span className="flex-1">{sev.label}</span>
                      <span className="font-bold">{satisfaction.issues?.bySeverity?.[sev.level] || 0}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recent Reviews */}
            <Card className="p-4">
              <h4 className="font-medium mb-4">Recent Reviews</h4>
              {(satisfaction.recentReviews || []).length > 0 ? (
                <div className="space-y-3">
                  {satisfaction.recentReviews.slice(0, 5).map((review, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                className={`h-4 w-4 ${star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{review.installerName}</span>
                        </div>
                        <span className="text-xs text-slate-500">{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{review.review}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">No reviews yet</p>
              )}
            </Card>
          </div>
        )}
      </div>
    )
  }

  // Installations Tab - Enhanced with Team Management & Progress Tracking
  const renderInstallations = () => {
    const installationSummary = installations.reduce((acc, inst) => {
      acc[inst.status] = (acc[inst.status] || 0) + 1
      if (inst.status === 'completed') acc.completedArea += inst.totalArea || 0
      return acc
    }, { completedArea: 0 })

    const installersSummary = {
      total: installers.length,
      inHouse: installers.filter(i => i.type === 'in_house').length,
      thirdParty: installers.filter(i => i.type === 'third_party').length,
      available: installers.filter(i => i.isAvailable && i.status === 'active').length
    }

    // Filter installations based on search
    const filteredInstallations = installations.filter(inst => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return inst.customer?.name?.toLowerCase().includes(search) ||
             inst.site?.address?.toLowerCase().includes(search) ||
             inst.id?.toLowerCase().includes(search)
    })

    return (
      <div className="space-y-4">
        {/* Sub-tabs for Installations vs Team Management */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <Button 
              variant={installersTab === 'installations' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setInstallersTab('installations')}
            >
              <Wrench className="h-4 w-4 mr-2" /> Installations
            </Button>
            <Button 
              variant={installersTab === 'installers' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setInstallersTab('installers')}
            >
              <Users className="h-4 w-4 mr-2" /> Team / Vendors
            </Button>
            <Button 
              variant={installersTab === 'calendar' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setInstallersTab('calendar')}
            >
              <Calendar className="h-4 w-4 mr-2" /> Calendar
            </Button>
            <Button 
              variant={installersTab === 'reports' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setInstallersTab('reports')}
            >
              <BarChart3 className="h-4 w-4 mr-2" /> Reports
            </Button>
          </div>
          <Button onClick={() => fetchInstallations()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {installersTab === 'installations' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4 text-center border-l-4 border-l-blue-500">
                <p className="text-2xl font-bold text-blue-600">{installationSummary.scheduled || 0}</p>
                <p className="text-xs text-slate-500">Scheduled</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-amber-500">
                <p className="text-2xl font-bold text-amber-600">{installationSummary.in_progress || 0}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-orange-500">
                <p className="text-2xl font-bold text-orange-600">{installationSummary.on_hold || 0}</p>
                <p className="text-xs text-slate-500">On Hold</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-emerald-500">
                <p className="text-2xl font-bold text-emerald-600">{installationSummary.completed || 0}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-purple-500">
                <p className="text-2xl font-bold text-purple-600">{installationSummary.completedArea?.toLocaleString()}</p>
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
            {filteredInstallations.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInstallations.map(inst => {
                  const assignedInstaller = installers.find(i => i.id === inst.assignedTo)
                  return (
                    <Card key={inst.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-900">{inst.customer?.name || 'Customer'}</p>
                            <p className="text-sm text-slate-500 line-clamp-1">{inst.site?.address || 'Site'}</p>
                          </div>
                          <Badge className={InstallationStatus[inst.status]?.color || 'bg-slate-100 text-slate-700'}>
                            {InstallationStatus[inst.status]?.label || inst.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="h-4 w-4" />
                            {inst.scheduledDate ? new Date(inst.scheduledDate).toLocaleDateString() : 'Not set'}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Square className="h-4 w-4" />
                            {inst.totalArea || 0} sqft
                          </div>
                        </div>

                        {/* Assigned Installer */}
                        {assignedInstaller ? (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mb-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{assignedInstaller.name}</p>
                              <p className="text-xs text-slate-500">
                                {assignedInstaller.type === 'third_party' ? 'Third Party' : 'In-House'}
                              </p>
                            </div>
                            {assignedInstaller.metrics?.averageRating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-medium">{assignedInstaller.metrics.averageRating}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mb-3 border-dashed"
                            onClick={() => setDialogOpen({ type: 'assign_installer', data: inst })}
                          >
                            <Users className="h-4 w-4 mr-2" /> Assign Installer
                          </Button>
                        )}

                        {/* Progress for in-progress installations */}
                        {inst.status === 'in_progress' && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span className="font-medium">{inst.progress || 0}%</span>
                            </div>
                            <Progress value={inst.progress || 0} className="h-2" />
                            {inst.areaInstalled > 0 && (
                              <p className="text-xs text-slate-500 mt-1">
                                {inst.areaInstalled} / {inst.totalArea} sqft installed
                              </p>
                            )}
                          </div>
                        )}

                        {/* Room-wise progress */}
                        {inst.rooms && inst.rooms.length > 0 && inst.status === 'in_progress' && (
                          <div className="mb-3 space-y-1">
                            <p className="text-xs font-medium text-slate-600">Room Progress:</p>
                            {inst.rooms.slice(0, 3).map((room, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">{room.name}</span>
                                <Badge variant="outline" className={
                                  room.status === 'completed' ? 'bg-green-50 text-green-700' :
                                  room.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                                  'bg-slate-50 text-slate-600'
                                }>
                                  {room.status || 'Pending'}
                                </Badge>
                              </div>
                            ))}
                            {inst.rooms.length > 3 && (
                              <p className="text-xs text-slate-400">+{inst.rooms.length - 3} more rooms</p>
                            )}
                          </div>
                        )}

                        {/* Photo counts */}
                        {(inst.photos?.before?.length > 0 || inst.photos?.during?.length > 0 || inst.photos?.after?.length > 0) && (
                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            <Camera className="h-3 w-3" />
                            <span>Before: {inst.photos?.before?.length || 0}</span>
                            <span>During: {inst.photos?.during?.length || 0}</span>
                            <span>After: {inst.photos?.after?.length || 0}</span>
                          </div>
                        )}

                        {/* Issues indicator */}
                        {inst.issues && inst.issues.length > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-3">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-700">
                              {inst.issues.filter(i => i.status === 'open').length} open issues
                            </span>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDialogOpen({ type: 'update_progress', data: inst })}>
                                  <Target className="h-4 w-4 mr-2" /> Update Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDialogOpen({ type: 'add_photos', data: inst })}>
                                  <Camera className="h-4 w-4 mr-2" /> Add Photos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDialogOpen({ type: 'report_issue', data: inst })}>
                                  <AlertTriangle className="h-4 w-4 mr-2" /> Report Issue
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {inst.status === 'in_progress' && (
                                  <DropdownMenuItem onClick={() => handleInstallationAction(inst.id, 'hold', { reason: 'Paused' })}>
                                    <Clock className="h-4 w-4 mr-2" /> Put On Hold
                                  </DropdownMenuItem>
                                )}
                                {inst.status === 'on_hold' && (
                                  <DropdownMenuItem onClick={() => handleInstallationAction(inst.id, 'start')}>
                                    <Zap className="h-4 w-4 mr-2" /> Resume
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Wrench}
                title="No installations scheduled"
                description="Installations are created when B2C invoices are paid and marked as delivered."
              />
            )}
          </>
        )}

        {installersTab === 'installers' && (
          <>
            {/* Installers Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center border-l-4 border-l-blue-500">
                <p className="text-2xl font-bold text-blue-600">{installersSummary.total}</p>
                <p className="text-xs text-slate-500">Total Team</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-emerald-500">
                <p className="text-2xl font-bold text-emerald-600">{installersSummary.inHouse}</p>
                <p className="text-xs text-slate-500">In-House</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-purple-500">
                <p className="text-2xl font-bold text-purple-600">{installersSummary.thirdParty}</p>
                <p className="text-xs text-slate-500">Third Party</p>
              </Card>
              <Card className="p-4 text-center border-l-4 border-l-green-500">
                <p className="text-2xl font-bold text-green-600">{installersSummary.available}</p>
                <p className="text-xs text-slate-500">Available Now</p>
              </Card>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search installers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-[280px]"
                  />
                </div>
              </div>
              <Button onClick={() => setDialogOpen({ type: 'add_installer', data: null })}>
                <Plus className="h-4 w-4 mr-2" /> Add Installer / Vendor
              </Button>
            </div>

            {/* Installers Table */}
            {installers.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installers.map(installer => (
                      <TableRow key={installer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                              {installer.profilePhoto ? (
                                <img src={installer.profilePhoto} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <User className="h-5 w-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{installer.name}</p>
                              {installer.companyName && (
                                <p className="text-xs text-slate-500">{installer.companyName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            installer.type === 'in_house' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }>
                            {installer.type === 'in_house' ? 'In-House' : 'Third Party'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{installer.phone}</p>
                            <p className="text-xs text-slate-500">{installer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(installer.skills || []).slice(0, 2).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill.replace('_', ' ')}
                              </Badge>
                            ))}
                            {(installer.skills || []).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{installer.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className={`h-4 w-4 ${installer.metrics?.averageRating > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                            <span className="font-medium">{installer.metrics?.averageRating || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{installer.metrics?.completedJobs || 0}</p>
                            <p className="text-xs text-slate-500">{(installer.metrics?.totalAreaInstalled || 0).toLocaleString()} sqft</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {installer.isAvailable ? (
                            <Badge className="bg-green-100 text-green-700">Available</Badge>
                          ) : installer.currentAssignment ? (
                            <Badge className="bg-amber-100 text-amber-700">On Job</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700">Unavailable</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDialogOpen({ type: 'view_installer', data: installer })}>
                                <Eye className="h-4 w-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDialogOpen({ type: 'edit_installer', data: installer })}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {installer.status === 'active' ? (
                                <DropdownMenuItem 
                                  onClick={() => handleInstallerAction(installer.id, 'deactivate')}
                                  className="text-red-600"
                                >
                                  <X className="h-4 w-4 mr-2" /> Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleInstallerAction(installer.id, 'activate')}
                                  className="text-green-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <EmptyState
                icon={Users}
                title="No installers added"
                description="Add your installation team members or third-party vendors."
                action={() => setDialogOpen({ type: 'add_installer', data: null })}
                actionLabel="Add Installer"
              />
            )}
          </>
        )}

        {installersTab === 'calendar' && (
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Installation Calendar</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700"><div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>Scheduled</Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700"><div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>In Progress</Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700"><div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>Completed</Badge>
              </div>
            </div>
            {/* Simple Calendar Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 bg-slate-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-slate-600 border-b">{day}</div>
                ))}
              </div>
              {/* Calendar Grid - Current Month */}
              <div className="grid grid-cols-7">
                {(() => {
                  const today = new Date()
                  const year = today.getFullYear()
                  const month = today.getMonth()
                  const firstDay = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  const days = []
                  
                  // Empty cells before first day
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="h-24 border-b border-r bg-slate-50/50"></div>)
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day)
                    const dateStr = date.toISOString().split('T')[0]
                    const dayInstallations = installations.filter(inst => {
                      const instDate = new Date(inst.scheduledDate).toISOString().split('T')[0]
                      return instDate === dateStr
                    })
                    const isToday = day === today.getDate()
                    
                    days.push(
                      <div key={day} className={`h-24 border-b border-r p-1 ${isToday ? 'bg-blue-50' : ''}`}>
                        <div className={`text-sm mb-1 ${isToday ? 'font-bold text-blue-600' : 'text-slate-600'}`}>{day}</div>
                        <div className="space-y-1 overflow-y-auto max-h-16">
                          {dayInstallations.map(inst => (
                            <div 
                              key={inst.id} 
                              className={`text-xs p-1 rounded truncate cursor-pointer ${
                                inst.status === 'completed' ? 'bg-green-100 text-green-700' :
                                inst.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}
                              onClick={() => setDialogOpen({ type: 'view_installation', data: inst })}
                            >
                              {inst.customer?.name || 'Installation'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  
                  return days
                })()}
              </div>
            </div>
          </Card>
        )}

        {installersTab === 'reports' && (
          <InstallationReportsTab 
            headers={headers}
            installers={installers}
          />
        )}
      </div>
    )
  }

  // Handle installer actions
  const handleInstallerAction = async (installerId, action, data = {}) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/installers', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: installerId, action, ...data })
      })
      
      if (res.ok) {
        toast.success(`Installer ${action} successful`)
        fetchInstallers()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Error performing action')
    } finally {
      setLoading(false)
    }
  }

  // Inventory Tab - Enterprise Grade with Sub-tabs
  const renderInventory = () => {
    const { inventory: items, summary = {}, byCategory = {} } = inventory

    // Get projects with blocked inventory
    const projectsWithBlockedInventory = projects.filter(p => p.materialRequisition?.inventoryBlocked)

    return (
      <div className="space-y-4">
        {/* Sub-tabs for Inventory Modules */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
            <Button 
              variant={inventoryTab === 'stock' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setInventoryTab('stock')}
            >
              <Package className="h-4 w-4 mr-2" /> Stock
            </Button>
            <Button 
              variant={inventoryTab === 'shipments' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('shipments'); fetchShipments(); }}
            >
              <Ship className="h-4 w-4 mr-2" /> Shipments
            </Button>
            <Button 
              variant={inventoryTab === 'lots' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('lots'); fetchLots(); }}
            >
              <Layers className="h-4 w-4 mr-2" /> Lots/Batches
            </Button>
            <Button 
              variant={inventoryTab === 'pricing' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('pricing'); fetchPriceTiers(); }}
            >
              <IndianRupee className="h-4 w-4 mr-2" /> Pricing
            </Button>
            <Button 
              variant={inventoryTab === 'costing' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('costing'); fetchLandedCosts(); }}
            >
              <Calculator className="h-4 w-4 mr-2" /> Costing
            </Button>
            {/* Phase 2 Sub-tabs */}
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <Button 
              variant={inventoryTab === 'qc' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('qc'); fetchQcRecords(); }}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" /> QC
            </Button>
            <Button 
              variant={inventoryTab === 'locations' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('locations'); fetchBinLocations(); }}
            >
              <MapPin className="h-4 w-4 mr-2" /> Locations
            </Button>
            <Button 
              variant={inventoryTab === 'analytics' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => { setInventoryTab('analytics'); fetchStockAging(); }}
            >
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchInventory()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stock Tab - Original Inventory View */}
        {inventoryTab === 'stock' && (
          <>
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
            {/* Cleanup button for admin */}
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" /> Cleanup
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleInventoryCleanup('remove_negative')}>
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    Remove Invalid Records
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleInventoryCleanup('remove_duplicates')}>
                    <RefreshCw className="h-4 w-4 mr-2 text-amber-600" />
                    Consolidate Duplicates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleInventoryCleanup('consolidate_all')}>
                    <Wrench className="h-4 w-4 mr-2 text-purple-600" />
                    Full Cleanup & Consolidate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleInventoryCleanup('reset_reserved')}>
                    <Lock className="h-4 w-4 mr-2 text-blue-600" />
                    Reset All Reservations
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
        </>
        )}

        {/* Shipments Tab */}
        {inventoryTab === 'shipments' && (
          <ShipmentsTab 
            shipments={shipments} 
            onRefresh={fetchShipments}
            headers={headers}
            setDialogOpen={setDialogOpen}
          />
        )}

        {/* Lots/Batches Tab */}
        {inventoryTab === 'lots' && (
          <LotsTab 
            lots={lots}
            onRefresh={fetchLots}
            headers={headers}
            setDialogOpen={setDialogOpen}
          />
        )}

        {/* Pricing Tab */}
        {inventoryTab === 'pricing' && (
          <PricingTab 
            priceTiers={priceTiers}
            onRefresh={fetchPriceTiers}
            headers={headers}
            setDialogOpen={setDialogOpen}
          />
        )}

        {/* Costing Tab */}
        {inventoryTab === 'costing' && (
          <CostingTab 
            landedCosts={landedCosts}
            onRefresh={fetchLandedCosts}
            headers={headers}
          />
        )}

        {/* QC Tab - Phase 2 */}
        {inventoryTab === 'qc' && (
          <QCTab 
            qcRecords={qcRecords}
            lots={lots}
            onRefresh={fetchQcRecords}
            headers={headers}
            setDialogOpen={setDialogOpen}
          />
        )}

        {/* Locations Tab - Phase 2 */}
        {inventoryTab === 'locations' && (
          <LocationsTab 
            binLocations={binLocations}
            lots={lots}
            onRefresh={fetchBinLocations}
            headers={headers}
            setDialogOpen={setDialogOpen}
          />
        )}

        {/* Analytics Tab - Phase 3 */}
        {inventoryTab === 'analytics' && (
          <AnalyticsTab 
            stockAgingReport={stockAgingReport}
            onRefresh={fetchStockAging}
            headers={headers}
          />
        )}
      </div>
    )
  }

  // Shipments Sub-Tab Component
  const ShipmentsTab = ({ shipments, onRefresh, headers, setDialogOpen }) => {
    const shipmentSummary = {
      total: shipments.length,
      inTransit: shipments.filter(s => s.status === 'in_transit').length,
      atPort: shipments.filter(s => ['at_port', 'customs_clearance'].includes(s.status)).length,
      received: shipments.filter(s => s.status === 'received').length,
      totalValue: shipments.reduce((sum, s) => sum + (s.totalValueInr || 0), 0)
    }

    const getStatusColor = (status) => {
      const colors = {
        draft: 'bg-slate-100 text-slate-700',
        booked: 'bg-blue-100 text-blue-700',
        in_transit: 'bg-purple-100 text-purple-700',
        at_port: 'bg-amber-100 text-amber-700',
        customs_clearance: 'bg-orange-100 text-orange-700',
        cleared: 'bg-teal-100 text-teal-700',
        received: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700'
      }
      return colors[status] || 'bg-slate-100 text-slate-700'
    }

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Total Shipments</p>
            <p className="text-2xl font-bold">{shipmentSummary.total}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-500">In Transit</p>
            <p className="text-2xl font-bold text-purple-600">{shipmentSummary.inTransit}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-slate-500">At Port/Clearing</p>
            <p className="text-2xl font-bold text-amber-600">{shipmentSummary.atPort}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Received</p>
            <p className="text-2xl font-bold text-green-600">{shipmentSummary.received}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-slate-500">
            <p className="text-sm text-slate-500">Total Value</p>
            <p className="text-2xl font-bold">₹{(shipmentSummary.totalValue / 100000).toFixed(1)}L</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <Input placeholder="Search shipments..." className="w-64" />
          <Button onClick={() => setDialogOpen({ type: 'create_shipment', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> New Shipment
          </Button>
        </div>

        {/* Shipments List */}
        {shipments.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Containers</TableHead>
                  <TableHead>Sqft</TableHead>
                  <TableHead>Value (INR)</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map(shp => (
                  <TableRow key={shp.id}>
                    <TableCell className="font-mono font-medium">{shp.shipmentNo}</TableCell>
                    <TableCell>{shp.supplierName || '-'}</TableCell>
                    <TableCell>{shp.origin?.country || '-'}</TableCell>
                    <TableCell>{shp.containers?.length || 0}</TableCell>
                    <TableCell>{(shp.totalSqft || 0).toLocaleString()}</TableCell>
                    <TableCell>₹{(shp.totalValueInr || 0).toLocaleString()}</TableCell>
                    <TableCell>{shp.dates?.eta ? new Date(shp.dates.eta).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(shp.status)}>
                        {shp.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'view_shipment', data: shp })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            icon={Ship}
            title="No shipments"
            description="Create your first import/export shipment to track containers and landed costs."
            action={() => setDialogOpen({ type: 'create_shipment', data: null })}
            actionLabel="Create Shipment"
          />
        )}
      </div>
    )
  }

  // Lots/Batches Sub-Tab Component
  const LotsTab = ({ lots, onRefresh, headers, setDialogOpen }) => {
    const lotsSummary = {
      total: lots.length,
      totalSqft: lots.reduce((sum, l) => sum + (l.sqft || 0), 0),
      available: lots.filter(l => l.status === 'available').length,
      uniqueShades: [...new Set(lots.map(l => l.shade).filter(Boolean))].length,
      avgCost: lots.length > 0 
        ? lots.reduce((sum, l) => sum + (l.landedCostPerSqft || 0), 0) / lots.length 
        : 0
    }

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Total Lots</p>
            <p className="text-2xl font-bold">{lotsSummary.total}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-500">Total Sqft</p>
            <p className="text-2xl font-bold">{lotsSummary.totalSqft.toLocaleString()}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Available Lots</p>
            <p className="text-2xl font-bold text-green-600">{lotsSummary.available}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-slate-500">Unique Shades</p>
            <p className="text-2xl font-bold text-amber-600">{lotsSummary.uniqueShades}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-slate-500">
            <p className="text-sm text-slate-500">Avg Cost/Sqft</p>
            <p className="text-2xl font-bold">₹{lotsSummary.avgCost.toFixed(2)}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input placeholder="Search by lot, shade, grade..." className="w-64" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen({ type: 'create_lot', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Lot
          </Button>
        </div>

        {/* Lots List */}
        {lots.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot No</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Qty (Boxes)</TableHead>
                  <TableHead>Sqft</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Cost/Sqft</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.slice(0, 50).map(lot => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono text-sm">{lot.lotNo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-32">{lot.productName}</p>
                        <p className="text-xs text-slate-500">{lot.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lot.shade ? (
                        <Badge variant="outline">{lot.shade}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        lot.grade === 'A+' ? 'bg-green-100 text-green-700' :
                        lot.grade === 'A' ? 'bg-blue-100 text-blue-700' :
                        lot.grade === 'B' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>{lot.grade || 'A'}</Badge>
                    </TableCell>
                    <TableCell>{lot.quantity}</TableCell>
                    <TableCell>{(lot.sqft || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {((lot.sqft || 0) - (lot.reservedQty || 0) - (lot.issuedQty || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>₹{(lot.landedCostPerSqft || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {lot.binLocation || lot.warehouseName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        lot.status === 'available' ? 'bg-green-100 text-green-700' :
                        lot.status === 'reserved' ? 'bg-amber-100 text-amber-700' :
                        lot.status === 'depleted' ? 'bg-slate-100 text-slate-700' :
                        'bg-red-100 text-red-700'
                      }>{lot.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            icon={Layers}
            title="No lots/batches"
            description="Lots are created automatically when shipments are received, or you can add them manually."
            action={() => setDialogOpen({ type: 'create_lot', data: null })}
            actionLabel="Add Lot Manually"
          />
        )}
      </div>
    )
  }

  // Pricing Sub-Tab Component
  const PricingTab = ({ priceTiers, onRefresh, headers, setDialogOpen }) => {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Price Tiers</p>
            <p className="text-2xl font-bold">{priceTiers.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Active Tiers</p>
            <p className="text-2xl font-bold text-green-600">{priceTiers.filter(t => t.status === 'active').length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-500">Max Discount</p>
            <p className="text-2xl font-bold text-purple-600">
              {Math.max(...priceTiers.map(t => t.discountValue || 0), 0)}%
            </p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-slate-500">Max Credit Days</p>
            <p className="text-2xl font-bold text-amber-600">
              {Math.max(...priceTiers.map(t => t.creditDays || 0), 0)}
            </p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Dealer / Distributor Price Tiers</h3>
          <Button onClick={() => setDialogOpen({ type: 'create_price_tier', data: null })}>
            <Plus className="h-4 w-4 mr-2" /> Add Price Tier
          </Button>
        </div>

        {/* Tiers List */}
        {priceTiers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {priceTiers.map(tier => (
              <Card key={tier.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{tier.name}</h4>
                    <p className="text-sm text-slate-500">{tier.code}</p>
                  </div>
                  <Badge className={tier.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                    {tier.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount</span>
                    <span className="font-medium">{tier.discountValue}% {tier.discountType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Min Order</span>
                    <span className="font-medium">₹{(tier.minimumOrderValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit Days</span>
                    <span className="font-medium">{tier.creditDays || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-medium">₹{(tier.creditLimit || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDialogOpen({ type: 'edit_price_tier', data: tier })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={IndianRupee}
            title="No price tiers"
            description="Create price tiers for different customer segments like Retail, Dealer, Distributor, Project."
            action={() => setDialogOpen({ type: 'create_price_tier', data: null })}
            actionLabel="Create Price Tier"
          />
        )}

        {/* Default Tiers Info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Suggested Price Tiers</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium">Retail</p>
              <p className="text-slate-500">0% discount, 0 credit days</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium">Dealer</p>
              <p className="text-slate-500">15-20% discount, 15-30 credit days</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium">Distributor</p>
              <p className="text-slate-500">25-30% discount, 30-45 credit days</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="font-medium">Project</p>
              <p className="text-slate-500">Volume-based, milestone payments</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Costing Sub-Tab Component
  const CostingTab = ({ landedCosts, onRefresh, headers }) => {
    const analysis = landedCosts?.analysis || {}
    const records = landedCosts?.records || []

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Total Shipments Costed</p>
            <p className="text-2xl font-bold">{analysis.summary?.totalShipments || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-500">Total Area</p>
            <p className="text-2xl font-bold">{(analysis.summary?.totalSqft || 0).toLocaleString()} sqft</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Total Landed Cost</p>
            <p className="text-2xl font-bold">₹{((analysis.summary?.totalLandedCost || 0) / 100000).toFixed(1)}L</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-slate-500">Avg Cost/Sqft</p>
            <p className="text-2xl font-bold text-amber-600">₹{analysis.summary?.avgCostPerSqft || 0}</p>
          </Card>
        </div>

        {/* Cost Breakdown */}
        {analysis.breakdown && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Cost Breakdown (Total)</h4>
              <div className="space-y-3">
                {[
                  { label: 'FOB Value', value: analysis.breakdown.fobValue, percent: analysis.breakdownPercent?.fobValue, color: 'bg-blue-500' },
                  { label: 'Freight', value: analysis.breakdown.freight, percent: analysis.breakdownPercent?.freight, color: 'bg-purple-500' },
                  { label: 'Insurance', value: analysis.breakdown.insurance, percent: analysis.breakdownPercent?.insurance, color: 'bg-indigo-500' },
                  { label: 'Customs Duty', value: analysis.breakdown.customsDuty, percent: analysis.breakdownPercent?.customsDuty, color: 'bg-red-500' },
                  { label: 'Clearing', value: analysis.breakdown.clearing, percent: analysis.breakdownPercent?.clearing, color: 'bg-orange-500' },
                  { label: 'Transportation', value: analysis.breakdown.transportation, percent: analysis.breakdownPercent?.transportation, color: 'bg-amber-500' },
                  { label: 'Other', value: analysis.breakdown.other, percent: analysis.breakdownPercent?.other, color: 'bg-slate-500' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded ${item.color}`}></div>
                    <span className="flex-1 text-sm">{item.label}</span>
                    <span className="text-sm text-slate-500">{item.percent || 0}%</span>
                    <span className="text-sm font-medium w-24 text-right">₹{((item.value || 0) / 1000).toFixed(0)}K</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-4">Cost Per Sqft Trend</h4>
              {(analysis.monthlyTrend || []).length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-2">
                  {analysis.monthlyTrend.map((month, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${(month.avgCostPerSqft / Math.max(...analysis.monthlyTrend.map(m => m.avgCostPerSqft || 1))) * 150}px` }}
                      ></div>
                      <p className="text-xs text-slate-500 mt-2">{month.month}</p>
                      <p className="text-xs font-medium">₹{month.avgCostPerSqft}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-12">No data yet</p>
              )}
            </Card>
          </div>
        )}

        {/* Recent Records */}
        <Card className="p-4">
          <h4 className="font-semibold mb-4">Recent Landed Cost Records</h4>
          {records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Total Sqft</TableHead>
                  <TableHead>FOB (INR)</TableHead>
                  <TableHead>Duty</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Cost/Sqft</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 10).map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono">{record.shipmentNo}</TableCell>
                    <TableCell>{(record.totalSqft || 0).toLocaleString()}</TableCell>
                    <TableCell>₹{((record.breakdown?.fobValueInr || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell>₹{((record.breakdown?.customsDuty || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="font-medium">₹{((record.totalLandedCost || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-amber-600 font-medium">₹{record.costPerSqft}</TableCell>
                    <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-slate-500 py-8">No landed cost records yet. Complete shipment receiving to generate.</p>
          )}
        </Card>
      </div>
    )
  }

  // QC Tab Component - Phase 2
  const QCTab = ({ qcRecords, lots, onRefresh, headers, setDialogOpen }) => {
    const { records = [], summary = {}, checklist = [] } = qcRecords || {}
    const [selectedQc, setSelectedQc] = useState(null)
    const [qcActionLoading, setQcActionLoading] = useState(false)

    const getStatusColor = (status) => {
      const colors = {
        pending: 'bg-amber-100 text-amber-700',
        in_progress: 'bg-blue-100 text-blue-700',
        passed: 'bg-green-100 text-green-700',
        failed: 'bg-red-100 text-red-700',
        conditional: 'bg-purple-100 text-purple-700'
      }
      return colors[status] || 'bg-slate-100 text-slate-700'
    }

    const handleCreateQc = async (lotId) => {
      try {
        setQcActionLoading(true)
        const res = await fetch('/api/flooring/enhanced/qc', {
          method: 'POST',
          headers,
          body: JSON.stringify({ lotId, qcType: 'incoming' })
        })
        if (res.ok) {
          toast.success('QC record created')
          onRefresh()
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to create QC record')
        }
      } catch (error) {
        toast.error('Error creating QC record')
      } finally {
        setQcActionLoading(false)
      }
    }

    const handleQcAction = async (qcId, action, data = {}) => {
      try {
        setQcActionLoading(true)
        const res = await fetch('/api/flooring/enhanced/qc', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ id: qcId, action, ...data })
        })
        if (res.ok) {
          toast.success('QC updated')
          onRefresh()
          setSelectedQc(null)
        } else {
          const error = await res.json()
          toast.error(error.error || 'Action failed')
        }
      } catch (error) {
        toast.error('Error updating QC')
      } finally {
        setQcActionLoading(false)
      }
    }

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-6 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Total QC Records</p>
            <p className="text-2xl font-bold">{summary.total || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{summary.pending || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Passed</p>
            <p className="text-2xl font-bold text-green-600">{summary.passed || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-red-500">
            <p className="text-sm text-slate-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{summary.failed || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-500">Conditional</p>
            <p className="text-2xl font-bold text-purple-600">{summary.conditional || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-slate-500">
            <p className="text-sm text-slate-500">Defect Rate</p>
            <p className="text-2xl font-bold">{summary.defectRate || 0}%</p>
          </Card>
        </div>

        {/* Actions Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Input placeholder="Search QC records..." className="w-64" />
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="conditional">Conditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> New QC
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Select Lot for QC</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(lots || []).filter(l => !l.qcRecordId).slice(0, 10).map(lot => (
                  <DropdownMenuItem 
                    key={lot.id} 
                    onClick={() => handleCreateQc(lot.id)}
                    disabled={qcActionLoading}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{lot.lotNo}</span>
                      <span className="text-xs text-slate-500">{lot.productName} - {lot.shade}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                {(lots || []).filter(l => !l.qcRecordId).length === 0 && (
                  <p className="text-sm text-slate-500 p-2">No lots pending QC</p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* QC Records Table */}
        {records.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QC #</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Shade/Grade</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Moisture</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(qc => (
                  <TableRow key={qc.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono">{qc.qcNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{qc.lotNo}</Badge>
                    </TableCell>
                    <TableCell>{qc.productName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {qc.shade && <Badge className="bg-slate-100 text-slate-700">{qc.shade}</Badge>}
                        {qc.gradeAssigned && <Badge className="bg-blue-100 text-blue-700">{qc.gradeAssigned}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{qc.qcType?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(qc.status)}>{qc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {qc.overallScore !== null ? (
                        <div className="flex items-center gap-2">
                          <Progress value={qc.overallScore} className="w-12 h-2" />
                          <span className="text-sm">{qc.overallScore}%</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {qc.measurements?.moistureContent ? (
                        <span className={qc.measurements.moistureContent > 9 || qc.measurements.moistureContent < 6 ? 'text-red-600' : 'text-green-600'}>
                          <ThermometerSun className="h-3 w-3 inline mr-1" />
                          {qc.measurements.moistureContent}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{qc.inspectorName}</TableCell>
                    <TableCell>{new Date(qc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedQc(qc)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {qc.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleQcAction(qc.id, 'complete')}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Complete QC
                            </DropdownMenuItem>
                          )}
                          {(qc.status === 'passed' || qc.status === 'failed' || qc.status === 'conditional') && !qc.decision && (
                            <>
                              <DropdownMenuItem onClick={() => handleQcAction(qc.id, 'make_decision', { decision: 'accept' })}>
                                <Check className="h-4 w-4 mr-2 text-green-600" /> Accept
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQcAction(qc.id, 'make_decision', { decision: 'reject' })}>
                                <X className="h-4 w-4 mr-2 text-red-600" /> Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQcAction(qc.id, 'make_decision', { decision: 'conditional_accept' })}>
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" /> Conditional Accept
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No QC Records</h3>
            <p className="text-slate-500 mb-4">Create a QC record for incoming lots to track quality.</p>
          </Card>
        )}

        {/* QC Detail Dialog */}
        {selectedQc && (
          <Dialog open={!!selectedQc} onOpenChange={() => setSelectedQc(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" /> QC Record: {selectedQc.qcNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-500">Lot Number</Label>
                    <p className="font-medium">{selectedQc.lotNo}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Product</Label>
                    <p className="font-medium">{selectedQc.productName}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Status</Label>
                    <Badge className={getStatusColor(selectedQc.status)}>{selectedQc.status}</Badge>
                  </div>
                </div>

                {/* Measurements */}
                <div>
                  <h4 className="font-semibold mb-3">Measurements</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="p-3">
                      <p className="text-xs text-slate-500">Moisture Content</p>
                      <p className="text-lg font-bold">{selectedQc.measurements?.moistureContent || '-'}%</p>
                      <p className="text-xs text-slate-400">Target: {selectedQc.measurements?.moistureTarget?.min}-{selectedQc.measurements?.moistureTarget?.max}%</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-slate-500">Thickness</p>
                      <p className="text-lg font-bold">{selectedQc.measurements?.thickness || '-'} mm</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-slate-500">Overall Score</p>
                      <p className="text-lg font-bold">{selectedQc.overallScore || '-'}%</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-slate-500">Grade Assigned</p>
                      <p className="text-lg font-bold">{selectedQc.gradeAssigned || '-'}</p>
                    </Card>
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <h4 className="font-semibold mb-3">Inspection Checklist</h4>
                  <div className="space-y-2">
                    {(selectedQc.checklist || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <span className="text-sm">{item.item}</span>
                          {item.required && <span className="text-red-500 text-xs">*</span>}
                        </div>
                        <Badge className={
                          item.result === 'pass' ? 'bg-green-100 text-green-700' :
                          item.result === 'fail' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {item.result || 'Not checked'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defects */}
                {(selectedQc.defects || []).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-red-600">Defects Found ({selectedQc.totalDefects})</h4>
                    <div className="space-y-2">
                      {selectedQc.defects.map((defect, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                          <div>
                            <span className="font-medium capitalize">{defect.type?.replace('_', ' ')}</span>
                            <span className="text-slate-500 ml-2">x{defect.count}</span>
                          </div>
                          <Badge className={
                            defect.severity === 'critical' ? 'bg-red-600 text-white' :
                            defect.severity === 'major' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {defect.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decision */}
                {selectedQc.decision && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Decision: <span className="capitalize">{selectedQc.decision?.replace('_', ' ')}</span></h4>
                    {selectedQc.decisionNotes && <p className="text-sm text-slate-600">{selectedQc.decisionNotes}</p>}
                    <p className="text-xs text-slate-500 mt-2">Decided on {new Date(selectedQc.decisionDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  // Locations Tab Component - Phase 2
  const LocationsTab = ({ binLocations, lots, onRefresh, headers, setDialogOpen }) => {
    const { bins = [], summary = {} } = binLocations || {}
    const [viewMode, setViewMode] = useState('grid') // grid, list
    const [selectedBin, setSelectedBin] = useState(null)
    const [locationActionLoading, setLocationActionLoading] = useState(false)

    const getOccupancyColor = (percent) => {
      if (percent >= 90) return 'bg-red-500'
      if (percent >= 70) return 'bg-amber-500'
      return 'bg-green-500'
    }

    const handleBulkCreate = async () => {
      try {
        setLocationActionLoading(true)
        const res = await fetch('/api/flooring/enhanced/bin-locations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bulkCreate: true,
            warehouseId: 'main',
            warehouseName: 'Main Warehouse',
            zones: ['A', 'B', 'C'],
            racksPerZone: 5,
            shelvesPerRack: 4,
            binsPerShelf: 3,
            capacityPerBin: 500
          })
        })
        if (res.ok) {
          const data = await res.json()
          toast.success(`${data.count} bin locations created`)
          onRefresh()
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to create locations')
        }
      } catch (error) {
        toast.error('Error creating locations')
      } finally {
        setLocationActionLoading(false)
      }
    }

    const handleAssignLot = async (lotId, binCode) => {
      try {
        setLocationActionLoading(true)
        const res = await fetch('/api/flooring/enhanced/bin-locations', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ action: 'assign_lot', lotId, binCode })
        })
        if (res.ok) {
          toast.success('Lot assigned to bin')
          onRefresh()
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to assign lot')
        }
      } catch (error) {
        toast.error('Error assigning lot')
      } finally {
        setLocationActionLoading(false)
      }
    }

    // Group bins by zone
    const binsByZone = bins.reduce((acc, bin) => {
      const zone = bin.zone || 'Unknown'
      if (!acc[zone]) acc[zone] = []
      acc[zone].push(bin)
      return acc
    }, {})

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-6 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Total Bins</p>
            <p className="text-2xl font-bold">{summary.total || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Available</p>
            <p className="text-2xl font-bold text-green-600">{summary.available || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-slate-500">Occupied</p>
            <p className="text-2xl font-bold text-amber-600">{summary.occupied || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-slate-500">
            <p className="text-sm text-slate-500">Empty</p>
            <p className="text-2xl font-bold">{summary.empty || 0}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-500">Total Capacity</p>
            <p className="text-2xl font-bold">{(summary.totalCapacity || 0).toLocaleString()} sqft</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-indigo-500">
            <p className="text-sm text-slate-500">Avg Occupancy</p>
            <p className="text-2xl font-bold">{summary.avgOccupancy || 0}%</p>
          </Card>
        </div>

        {/* Actions Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Input placeholder="Search locations (e.g., A-01-2-1)..." className="w-64" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {Object.keys(binsByZone).map(zone => (
                  <SelectItem key={zone} value={zone}>Zone {zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            {bins.length === 0 && (
              <Button onClick={handleBulkCreate} disabled={locationActionLoading}>
                {locationActionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Setup Warehouse Bins
              </Button>
            )}
          </div>
        </div>

        {/* Bins Display */}
        {bins.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="space-y-6">
              {Object.entries(binsByZone).map(([zone, zoneBins]) => (
                <Card key={zone} className="p-4">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Zone {zone}
                    <Badge variant="outline">{zoneBins.length} bins</Badge>
                  </h4>
                  <div className="grid grid-cols-12 gap-2">
                    {zoneBins.slice(0, 60).map(bin => (
                      <div 
                        key={bin.id}
                        className={`
                          p-2 rounded border cursor-pointer transition-all hover:shadow-md
                          ${bin.lotCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}
                          ${bin.occupancyPercent >= 90 ? 'border-red-400' : ''}
                        `}
                        onClick={() => setSelectedBin(bin)}
                        title={`${bin.code} - ${bin.currentOccupancy}/${bin.capacity} sqft`}
                      >
                        <p className="text-xs font-mono truncate">{bin.code}</p>
                        <div className="mt-1 h-1 bg-slate-200 rounded">
                          <div 
                            className={`h-full rounded ${getOccupancyColor(bin.occupancyPercent)}`}
                            style={{ width: `${bin.occupancyPercent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{bin.lotCount || 0} lots</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bin Code</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead>Shelf</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Occupied</TableHead>
                    <TableHead>% Full</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bins.slice(0, 50).map(bin => (
                    <TableRow key={bin.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-medium">{bin.code}</TableCell>
                      <TableCell><Badge variant="outline">{bin.zone}</Badge></TableCell>
                      <TableCell>{bin.rack}</TableCell>
                      <TableCell>{bin.shelf}</TableCell>
                      <TableCell className="capitalize">{bin.type}</TableCell>
                      <TableCell>{bin.capacity} sqft</TableCell>
                      <TableCell>{bin.currentOccupancy || 0} sqft</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={bin.occupancyPercent} className="w-12 h-2" />
                          <span className="text-sm">{bin.occupancyPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{bin.lotCount || 0}</TableCell>
                      <TableCell>
                        <Badge className={bin.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {bin.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedBin(bin)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        ) : (
          <Card className="p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Bin Locations</h3>
            <p className="text-slate-500 mb-4">Setup warehouse bin locations for efficient inventory management.</p>
            <Button onClick={handleBulkCreate} disabled={locationActionLoading}>
              {locationActionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Setup Warehouse Bins
            </Button>
          </Card>
        )}

        {/* Bin Detail Dialog */}
        {selectedBin && (
          <Dialog open={!!selectedBin} onOpenChange={() => setSelectedBin(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Bin: {selectedBin.code}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Zone</Label>
                    <p className="font-medium">{selectedBin.zone}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Rack / Shelf</Label>
                    <p className="font-medium">{selectedBin.rack} / {selectedBin.shelf}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Capacity</Label>
                    <p className="font-medium">{selectedBin.capacity} sqft</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Occupied</Label>
                    <p className="font-medium">{selectedBin.currentOccupancy || 0} sqft ({selectedBin.occupancyPercent}%)</p>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-500 mb-2 block">Occupancy</Label>
                  <Progress value={selectedBin.occupancyPercent} className="h-3" />
                </div>

                {selectedBin.lotCount > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Lots in this Bin ({selectedBin.lotCount})</Label>
                    <p className="text-sm text-slate-500">View lots assigned to this location.</p>
                  </div>
                )}

                {/* Assign Lot */}
                {selectedBin.occupancyPercent < 100 && (lots || []).filter(l => !l.binLocation).length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Assign Lot</Label>
                    <Select onValueChange={(lotId) => handleAssignLot(lotId, selectedBin.code)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lot to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {(lots || []).filter(l => !l.binLocation).slice(0, 10).map(lot => (
                          <SelectItem key={lot.id} value={lot.id}>
                            {lot.lotNo} - {lot.productName} ({lot.sqft} sqft)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  // Analytics Tab Component - Phase 3
  const AnalyticsTab = ({ stockAgingReport, onRefresh, headers }) => {
    const [reportType, setReportType] = useState('aging')
    const [analyticsLoading, setAnalyticsLoading] = useState(false)

    const handleReportChange = async (type) => {
      setReportType(type)
      setAnalyticsLoading(true)
      try {
        const res = await fetch(`/api/flooring/enhanced/stock-aging?type=${type}`, { headers })
        const data = await res.json()
        // This would update the parent state - for now we rely on onRefresh
      } catch (error) {
        console.error('Error fetching report:', error)
      } finally {
        setAnalyticsLoading(false)
      }
      onRefresh(type)
    }

    const report = stockAgingReport || {}
    const buckets = report.buckets || []
    const summary = report.summary || {}

    return (
      <div className="space-y-4">
        {/* Report Type Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[
              { id: 'aging', label: 'Stock Aging', icon: Clock },
              { id: 'abc', label: 'ABC Analysis', icon: BarChart3 },
              { id: 'slow_moving', label: 'Slow Moving', icon: AlertCircle },
              { id: 'dead_stock', label: 'Dead Stock', icon: AlertTriangle }
            ].map(rt => (
              <Button 
                key={rt.id}
                variant={reportType === rt.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleReportChange(rt.id)}
              >
                <rt.icon className="h-4 w-4 mr-2" /> {rt.label}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRefresh(reportType)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stock Aging Report */}
        {reportType === 'aging' && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4 border-l-4 border-l-blue-500">
                <p className="text-sm text-slate-500">Total Lots</p>
                <p className="text-2xl font-bold">{summary.totalLots || 0}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-purple-500">
                <p className="text-sm text-slate-500">Total Sqft</p>
                <p className="text-2xl font-bold">{(summary.totalSqft || 0).toLocaleString()}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-green-500">
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-2xl font-bold">₹{((summary.totalValue || 0) / 100000).toFixed(1)}L</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <p className="text-sm text-slate-500">Stock 90+ Days</p>
                <p className="text-2xl font-bold text-amber-600">{summary.oldStock90Plus || 0}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500">
                <p className="text-sm text-slate-500">Old Stock Value</p>
                <p className="text-2xl font-bold text-red-600">{summary.percentOld90Plus || 0}%</p>
              </Card>
            </div>

            {/* Aging Buckets */}
            <div className="grid grid-cols-6 gap-4">
              {buckets.map((bucket, idx) => (
                <Card key={idx} className={`p-4 ${idx >= 3 ? 'border-amber-200 bg-amber-50' : ''} ${idx >= 5 ? 'border-red-200 bg-red-50' : ''}`}>
                  <p className="text-sm font-medium">{bucket.days}</p>
                  <p className="text-2xl font-bold">{bucket.count}</p>
                  <p className="text-xs text-slate-500">{bucket.sqft?.toLocaleString()} sqft</p>
                  <p className="text-xs text-slate-500">₹{(bucket.value / 1000).toFixed(0)}K</p>
                </Card>
              ))}
            </div>

            {/* Oldest Lots */}
            {buckets.length > 0 && buckets[buckets.length - 1].lots?.length > 0 && (
              <Card className="p-4 border-red-200">
                <h4 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Oldest Stock (365+ days) - Action Required
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Shade</TableHead>
                      <TableHead>Age (Days)</TableHead>
                      <TableHead>Sqft</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buckets[buckets.length - 1].lots.slice(0, 10).map(lot => (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono">{lot.lotNo}</TableCell>
                        <TableCell>{lot.productName}</TableCell>
                        <TableCell>{lot.shade}</TableCell>
                        <TableCell className="text-red-600 font-medium">{lot.ageDays}</TableCell>
                        <TableCell>{lot.availableSqft?.toLocaleString()}</TableCell>
                        <TableCell>₹{(lot.value / 1000).toFixed(0)}K</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}

        {/* ABC Analysis */}
        {reportType === 'abc' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {['A', 'B', 'C'].map(category => {
                const cat = report.categories?.[category] || {}
                return (
                  <Card key={category} className={`p-4 border-l-4 ${
                    category === 'A' ? 'border-l-green-500' :
                    category === 'B' ? 'border-l-amber-500' :
                    'border-l-red-500'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">Category {category}</h4>
                      <Badge className={
                        category === 'A' ? 'bg-green-100 text-green-700' :
                        category === 'B' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {cat.count || 0} items
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{cat.description}</p>
                    <p className="text-xl font-bold mt-2">₹{((cat.totalValue || 0) / 100000).toFixed(1)}L</p>
                  </Card>
                )
              })}
            </div>
            
            {/* Top A items */}
            {report.categories?.A?.items?.length > 0 && (
              <Card className="p-4">
                <h4 className="font-semibold mb-4 text-green-600">Top Category A Items (Fast Moving)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Movement Count</TableHead>
                      <TableHead>Qty Moved</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.categories.A.items.slice(0, 10).map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell><Badge variant="outline">{item.sku}</Badge></TableCell>
                        <TableCell>{item.movementCount}</TableCell>
                        <TableCell>{item.totalQtyMoved?.toLocaleString()}</TableCell>
                        <TableCell>₹{(item.totalValue / 1000).toFixed(0)}K</TableCell>
                        <TableCell>{item.valuePercent?.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* Slow Moving / Dead Stock */}
        {(reportType === 'slow_moving' || reportType === 'dead_stock') && (
          <div className="space-y-4">
            <Card className="p-4 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="font-semibold text-amber-800">
                  {reportType === 'slow_moving' ? 'Slow Moving Stock (90+ days without movement)' : 'Dead Stock (180+ days without movement)'}
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-amber-700">Total Items</p>
                  <p className="text-2xl font-bold text-amber-800">{report.summary?.totalSlowItems || report.summary?.totalDeadItems || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-amber-700">Stock Value</p>
                  <p className="text-2xl font-bold text-amber-800">₹{((report.summary?.totalStockValue || report.summary?.deadStockValue || 0) / 100000).toFixed(1)}L</p>
                </div>
                <div>
                  <p className="text-sm text-amber-700">% of Inventory</p>
                  <p className="text-2xl font-bold text-amber-800">{report.summary?.percentOfInventory || report.summary?.percentOfValue || 0}%</p>
                </div>
              </div>

              {(report.items || []).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Stock Value</TableHead>
                      <TableHead>Warehouse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.items.slice(0, 20).map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell><Badge variant="outline">{item.sku}</Badge></TableCell>
                        <TableCell>{item.currentStock?.toLocaleString()} sqft</TableCell>
                        <TableCell>₹{(item.stockValue / 1000).toFixed(0)}K</TableCell>
                        <TableCell>{item.warehouseName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {report.summary?.recommendations && (
                <div className="mt-4 p-3 bg-white rounded border border-amber-200">
                  <h5 className="font-medium text-amber-800 mb-2">Recommendations</h5>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {report.summary.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        )}

        {!stockAgingReport && (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Loading Analytics</h3>
            <p className="text-slate-500">Generating inventory analytics report...</p>
          </Card>
        )}
      </div>
    )
  }

  // Finance Tab - Enterprise Level Self-contained module finance with 200+ features
  const renderFinance = () => {
    return (
      <EnterpriseFinanceFlooring 
        invoices={invoices}
        payments={payments}
        quotes={quotes}
        projects={projects}
        onRefresh={fetchDashboard}
      />
    )
  }

  // Reports Tab
  const renderReports = () => {
    const summaryReport = reports.summary || {}

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
                    <p className="text-2xl font-bold text-emerald-700">₹{(reportData?.overview?.totalCollected || 0).toLocaleString()}</p>
                    <p className="text-xs text-emerald-500 mt-1">{reportData?.overview?.collectedChange || '+0%'} from last period</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-blue-600 font-medium">Quotes Sent</p>
                    <p className="text-2xl font-bold text-blue-700">{reportData?.overview?.periodQuotes || 0}</p>
                    <p className="text-xs text-blue-500 mt-1">₹{(reportData?.overview?.periodQuoteValue || 0).toLocaleString()} value</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50">
                    <p className="text-sm text-purple-600 font-medium">Conversion Rate</p>
                    <p className="text-2xl font-bold text-purple-700">{reportData?.overview?.conversionRate || 0}%</p>
                    <p className="text-xs text-purple-500 mt-1">{reportData?.overview?.approvedQuotes || 0} approved</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50">
                    <p className="text-sm text-amber-600 font-medium">Pending Collection</p>
                    <p className="text-2xl font-bold text-amber-700">₹{(reportData?.overview?.pendingAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-amber-500 mt-1">{reportData?.invoicesByStatus?.overdue || 0} unpaid invoices</p>
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
                        {(reports.products?.topProducts || []).map((product, i) => (
                          <tr key={product.id || i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{product.name}</td>
                            <td className="px-4 py-3">
                              <Badge className={FlooringCategories[product.category]?.color || 'bg-slate-100'}>
                                {FlooringCategories[product.category]?.label || product.category || 'Other'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">{(product.sales?.quantity || 0).toLocaleString()} sqft</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              ₹{(product.sales?.revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {(!reports.products?.topProducts || reports.products?.topProducts?.length === 0) && (
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

  // Initialize settings values when moduleSettings loads
  useEffect(() => {
    if (moduleSettings) {
      setWhatsappConfig({
        provider: moduleSettings?.whatsapp?.provider || '',
        apiKey: moduleSettings?.whatsapp?.apiKey || '',
        apiSecret: moduleSettings?.whatsapp?.apiSecret || '',
        phoneNumberId: moduleSettings?.whatsapp?.phoneNumberId || '',
        webhookUrl: moduleSettings?.whatsapp?.webhookUrl || '',
        enabled: moduleSettings?.whatsapp?.enabled || false
      })
      setGeneralSettings({
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
      setBankDetails({
        bankName: moduleSettings?.bankDetails?.bankName || '',
        accountName: moduleSettings?.bankDetails?.accountName || '',
        accountNumber: moduleSettings?.bankDetails?.accountNumber || '',
        ifscCode: moduleSettings?.bankDetails?.ifscCode || '',
        upiId: moduleSettings?.bankDetails?.upiId || ''
      })
    }
  }, [moduleSettings, client?.name])

  // Settings Tab
  const renderSettings = () => {
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

    const resetAllData = async () => {
      const confirmed = window.confirm(
        'WARNING: This will DELETE ALL flooring module data including:\n\n' +
        '• All Projects\n• All Quotes\n• All Invoices\n• All Installations\n• All Dispatches\n• All Inventory Stock & Movements\n• All Reservations\n\n' +
        'This action CANNOT be undone. Are you sure?'
      )
      if (!confirmed) return

      const doubleConfirm = window.prompt('Type "DELETE" to confirm:')
      if (doubleConfirm !== 'DELETE') {
        toast.error('Reset cancelled')
        return
      }

      try {
        setLoading(true)
        const res = await fetch('/api/flooring/enhanced/reset', {
          method: 'POST',
          headers,
          body: JSON.stringify({ confirmReset: 'DELETE_ALL_FLOORING_DATA' })
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('All flooring data has been reset!')
          // Refresh all data
          fetchProjects()
          fetchQuotes()
          fetchInvoices()
          fetchInstallations()
          fetchInventory()
          fetchDispatches()
          fetchDashboard()
        } else {
          toast.error(data.error || 'Reset failed')
        }
      } catch (error) {
        toast.error('Failed to reset data')
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
            <TabsTrigger value="access">Access Management</TabsTrigger>
            <TabsTrigger value="sync">CRM Sync</TabsTrigger>
            <TabsTrigger value="danger" className="text-red-600">Danger Zone</TabsTrigger>
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

            {/* Access Management (Enterprise RBAC) */}
            <TabsContent value="access">
              <div className="space-y-6">
                {/* Header */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-800">Enterprise Role-Based Access Control</h4>
                        <p className="text-sm text-blue-700">
                          Manage user permissions for the Flooring Module. Users are synced from CRM (single source of truth). 
                          Assign roles to control access to tabs and features.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-5 gap-4">
                  <Card className="p-4 border-l-4 border-l-blue-500">
                    <p className="text-sm text-slate-500">Total Users</p>
                    <p className="text-2xl font-bold">{accessUsers.summary?.total || 0}</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-green-500">
                    <p className="text-sm text-slate-500">With Roles</p>
                    <p className="text-2xl font-bold text-green-600">{accessUsers.summary?.withRoles || 0}</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-amber-500">
                    <p className="text-sm text-slate-500">Without Roles</p>
                    <p className="text-2xl font-bold text-amber-600">{accessUsers.summary?.withoutRoles || 0}</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-purple-500">
                    <p className="text-sm text-slate-500">Admins</p>
                    <p className="text-2xl font-bold">{(accessUsers.summary?.byRole?.super_admin || 0) + (accessUsers.summary?.byRole?.client_admin || 0)}</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-slate-500">
                    <p className="text-sm text-slate-500">Available Roles</p>
                    <p className="text-2xl font-bold">{accessRoles.roles?.length || 7}</p>
                  </Card>
                </div>

                {/* Roles Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5" /> Role Definitions
                        </CardTitle>
                        <CardDescription>System and custom roles with permission sets</CardDescription>
                      </div>
                      <Button variant="outline" onClick={fetchAccessRoles} disabled={accessLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${accessLoading ? 'animate-spin' : ''}`} /> Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {(accessRoles.roles || Object.values(accessRoles.defaultRoles || {})).map(role => (
                        <Card key={role.id} className={`p-4 ${role.isSystem ? 'bg-slate-50' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                role.level >= 90 ? 'bg-red-100 text-red-700' :
                                role.level >= 70 ? 'bg-purple-100 text-purple-700' :
                                role.level >= 50 ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                Level {role.level}
                              </Badge>
                              <span className="font-semibold">{role.name}</span>
                            </div>
                            {role.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                            {role.isCustom && <Badge className="bg-green-100 text-green-700 text-xs">Custom</Badge>}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{role.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions?.flooring?.tabs && Object.entries(role.permissions.flooring.tabs).slice(0, 5).map(([tab, perms]) => (
                              perms.view && (
                                <Badge key={tab} variant="outline" className="text-xs capitalize">
                                  {tab}
                                </Badge>
                              )
                            ))}
                            {role.permissions?.flooring?.tabs && Object.keys(role.permissions.flooring.tabs).length > 5 && (
                              <Badge variant="outline" className="text-xs">+{Object.keys(role.permissions.flooring.tabs).length - 5} more</Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Users Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" /> User Role Assignments
                        </CardTitle>
                        <CardDescription>Users synced from CRM with their assigned roles</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={async () => {
                          try {
                            setAccessLoading(true)
                            const res = await fetch('/api/flooring/enhanced/access-management', {
                              method: 'POST',
                              headers,
                              body: JSON.stringify({ action: 'sync_from_crm', autoAssignRole: false })
                            })
                            const data = await res.json()
                            toast.success(`Synced ${data.totalUsers} users from CRM`)
                            fetchAccessUsers()
                          } catch (error) {
                            toast.error('Sync failed')
                          } finally {
                            setAccessLoading(false)
                          }
                        }}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Sync from CRM
                        </Button>
                        <Button variant="outline" onClick={fetchAccessUsers}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(accessUsers.users || []).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>CRM Role</TableHead>
                            <TableHead>Flooring Role</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(accessUsers.users || []).map(u => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-slate-600 capitalize">
                                  {u.role || 'user'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {u.flooringRoleName ? (
                                  <Badge className={
                                    u.flooringRoleLevel >= 90 ? 'bg-red-100 text-red-700' :
                                    u.flooringRoleLevel >= 70 ? 'bg-purple-100 text-purple-700' :
                                    u.flooringRoleLevel >= 50 ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-700'
                                  }>
                                    {u.flooringRoleName}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600">No Role</Badge>
                                )}
                              </TableCell>
                              <TableCell>{u.flooringRoleLevel || '-'}</TableCell>
                              <TableCell>{u.assignedAt ? new Date(u.assignedAt).toLocaleDateString() : '-'}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Assign Flooring Role</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.values(accessRoles.defaultRoles || {}).map(role => (
                                      <DropdownMenuItem key={role.id} onClick={async () => {
                                        try {
                                          const res = await fetch('/api/flooring/enhanced/access-management', {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ action: 'assign_role', userId: u.id, roleId: role.id })
                                          })
                                          if (res.ok) {
                                            toast.success(`Assigned ${role.name} to ${u.name || u.email}`)
                                            fetchAccessUsers()
                                          } else {
                                            toast.error('Failed to assign role')
                                          }
                                        } catch (error) {
                                          toast.error('Error assigning role')
                                        }
                                      }}>
                                        <Badge variant="outline" className={`mr-2 ${
                                          role.level >= 90 ? 'bg-red-100 text-red-700' :
                                          role.level >= 70 ? 'bg-purple-100 text-purple-700' :
                                          role.level >= 50 ? 'bg-blue-100 text-blue-700' :
                                          'bg-slate-100 text-slate-700'
                                        }`}>{role.level}</Badge>
                                        {role.name}
                                      </DropdownMenuItem>
                                    ))}
                                    {u.flooringRoleId && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600" onClick={async () => {
                                          try {
                                            const res = await fetch('/api/flooring/enhanced/access-management', {
                                              method: 'PUT',
                                              headers,
                                              body: JSON.stringify({ action: 'revoke_role', userId: u.id })
                                            })
                                            if (res.ok) {
                                              toast.success('Role revoked')
                                              fetchAccessUsers()
                                            }
                                          } catch (error) {
                                            toast.error('Error revoking role')
                                          }
                                        }}>
                                          <X className="h-4 w-4 mr-2" /> Revoke Role
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">No Users Found</h3>
                        <p className="text-slate-500 mb-4">Click &quot;Sync from CRM&quot; to load users</p>
                        <Button variant="outline" onClick={() => {
                          fetchAccessRoles()
                          fetchAccessUsers()
                        }}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Load Data
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Audit Log */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5" /> Access Audit Log
                        </CardTitle>
                        <CardDescription>History of role changes and access modifications</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={fetchAccessAuditLog}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accessAuditLog.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {accessAuditLog.slice(0, 20).map(log => (
                          <div key={log.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="capitalize">{log.action?.replace('_', ' ')}</Badge>
                              <span>{log.performedByName}</span>
                              {log.targetUserId && <span className="text-slate-500">→ User: {log.targetUserId?.slice(0, 8)}</span>}
                              {log.newRoleId && <Badge className="bg-green-100 text-green-700">{log.newRoleId}</Badge>}
                            </div>
                            <span className="text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-4">No audit log entries yet</p>
                    )}
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

            {/* Danger Zone */}
            <TabsContent value="danger">
              <Card className="border-red-200">
                <CardHeader className="bg-red-50">
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    Irreversible actions. Proceed with extreme caution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-red-800">Reset All Flooring Data</h4>
                        <p className="text-sm text-red-600 mt-1">
                          This will permanently delete ALL flooring module data including:
                        </p>
                        <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
                          <li>All Projects</li>
                          <li>All Quotes & Invoices</li>
                          <li>All Installations</li>
                          <li>All Dispatches & Challans</li>
                          <li>All Inventory Stock & Movements</li>
                          <li>All Reservations</li>
                          <li>All Customers (module-specific)</li>
                        </ul>
                        <p className="text-sm font-medium text-red-700 mt-3">
                          ⚠️ This action CANNOT be undone!
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={resetAllData}
                        disabled={loading}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset All Data
                      </Button>
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
    
    // Get inventory data for products - build multiple lookup maps for robust matching
    const inventoryMap = new Map()
    const inventoryBySkuMap = new Map()
    const inventoryByNameMap = new Map()
    
    if (inventory?.inventory) {
      inventory.inventory.forEach(inv => {
        // Primary: by productId
        if (inv.productId) {
          inventoryMap.set(inv.productId, inv)
        }
        // Fallback: by SKU
        if (inv.product?.sku || inv.sku) {
          const sku = (inv.product?.sku || inv.sku).toLowerCase()
          inventoryBySkuMap.set(sku, inv)
        }
        // Fallback: by product name
        if (inv.product?.name || inv.productName) {
          const name = (inv.product?.name || inv.productName).toLowerCase()
          inventoryByNameMap.set(name, inv)
        }
      })
    }

    // Get inventory for a product - try multiple matching strategies
    const getProductInventory = (productId, product = null) => {
      // Try direct productId match first
      let inv = inventoryMap.get(productId)
      
      // Fallback: try SKU match
      if (!inv && product?.sku) {
        inv = inventoryBySkuMap.get(product.sku.toLowerCase())
      }
      
      // Fallback: try name match
      if (!inv && product?.name) {
        inv = inventoryByNameMap.get(product.name.toLowerCase())
      }
      
      return {
        totalQty: inv?.quantity || 0,
        availableQty: inv?.availableQty || 0,
        reservedQty: inv?.reservedQty || 0,
        reorderLevel: inv?.reorderLevel || 100
      }
    }

    // Get inventory status
    const getInventoryStatus = (productId, requiredQty = 0, product = null) => {
      const inv = getProductInventory(productId, product)
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

    // Calculate totals for selected products - B2C uses retail/selling price
    const getSelectedProductsTotal = () => {
      return Object.values(measurementProducts).reduce((sum, item) => {
        if (item.selected) {
          const price = getProductPrice(item.product, 'b2c')
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
          const inv = getProductInventory(item.product.id, item.product)
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
        
        // Validate total quantity matches total area (must equal, not exceed)
        const totalSelectedQty = Object.values(measurementProducts)
          .filter(p => p.selected)
          .reduce((sum, p) => sum + (p.quantity || 0), 0)
        
        if (blockInventory && hasSelectedProducts) {
          // When completing measurement, quantity must match total area
          if (totalSelectedQty !== totalArea) {
            toast.error(`Material quantity (${totalSelectedQty} sqft) must equal total room area (${totalArea} sqft). ${totalSelectedQty < totalArea ? 'Add more materials.' : 'Reduce quantity.'}`)
            return false
          }
          
          const { allAvailable, insufficientItems } = checkMeasurementInventory()
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
              by: user?.name || user?.email || 'System',
              userId: user?.id,
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

        // Calculate totals - B2C uses retail/selling price
        const items = selectedItems.map(item => ({
          itemType: 'material',
          productId: item.product.id,
          name: item.product.name,
          sku: item.product.sku || '',
          description: item.product.description || '',
          quantity: item.quantity || totalArea,
          unit: item.product.unit || 'sqft',
          unitPrice: getProductPrice(item.product, 'b2c'),
          totalPrice: getProductPrice(item.product, 'b2c') * (item.quantity || totalArea),
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
                by: user?.name || user?.email || 'System',
                userId: user?.id,
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
              {/* Show Add Room when editing is allowed OR when in edit mode */}
              {(['pending', 'site_visit_pending', 'measurement_scheduled'].includes(selectedProject.status) || isEditingMaterials) && (
                <Button onClick={() => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Room
                </Button>
              )}
              {selectedProject.status === 'measurement_done' && !isEditingMaterials && (
                <Button 
                  variant="outline" 
                  disabled 
                  className="opacity-50 cursor-not-allowed"
                  title="Click 'Edit Measurements' below to add rooms"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Room
                </Button>
              )}
              {!['pending', 'site_visit_pending', 'measurement_scheduled', 'measurement_done'].includes(selectedProject.status) && !isEditingMaterials && (
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
                  disabled={measurementDetails.inventoryBlocked && !isEditingMaterials}
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
                  disabled={measurementDetails.inventoryBlocked && !isEditingMaterials}
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
                  disabled={measurementDetails.inventoryBlocked && !isEditingMaterials}
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
              
              // Check if editing is allowed (in initial phases OR when explicitly editing materials in B2C)
              const measurementAllowedStatuses = ['pending', 'site_visit_pending', 'measurement_scheduled']
              const isEditingAllowed = measurementAllowedStatuses.includes(selectedProject.status) || isEditingMaterials
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
            title={['pending', 'site_visit_pending', 'measurement_scheduled'].includes(selectedProject.status) ? "No rooms measured yet" : "Measurement Locked"}
            description={['pending', 'site_visit_pending', 'measurement_scheduled'].includes(selectedProject.status) ? "Add room measurements for this project to proceed with quotes." : "Click 'Edit Measurements' in workflow to add/modify rooms."}
            action={['pending', 'site_visit_pending', 'measurement_scheduled'].includes(selectedProject.status) ? () => setDialogOpen({ type: 'room', data: { projectId: selectedProject.id } }) : null}
            actionLabel={['pending', 'site_visit_pending', 'measurement_scheduled'].includes(selectedProject.status) ? "Add Room" : null}
          />
        )}

        {/* Product Selection with Inventory - Show when rooms exist and NOT blocked (or editing) */}
        {rooms.length > 0 && (!measurementDetails.inventoryBlocked || isEditingMaterials) && (
          <Card className={`border-2 ${isEditingMaterials ? 'border-amber-300 bg-amber-50/30' : 'border-cyan-200'}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-cyan-800">
                    <Package className="h-4 w-4" /> {isEditingMaterials ? 'Edit Measurements & Materials' : 'Select Products for Quote'} (with Real-time Inventory)
                  </CardTitle>
                  <CardDescription>
                    {isEditingMaterials 
                      ? 'You can now modify rooms and material selection. Material must cover total area.' 
                      : 'Select flooring products. Inventory will be blocked when measurement is marked done.'}
                  </CardDescription>
                </div>
                {isEditingMaterials ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditingMaterials(false)}
                    className="border-amber-400 text-amber-700 hover:bg-amber-100"
                  >
                    <X className="h-4 w-4 mr-1" /> Close Edit
                  </Button>
                ) : !measurementDetails.inventoryBlocked ? (
                  /* Material to be decided later toggle - only show before measurement is completed */
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
                ) : null}
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
                            const price = getProductPrice(product, 'b2c') // B2C uses retail price
                            const inv = getProductInventory(product.id, product)
                            const invStatus = getInventoryStatus(product.id, isSelected ? quantity : 0, product)
                            
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
                          const price = getProductPrice(item.product, 'b2c') // B2C uses retail price
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
                                  max={totalArea}
                                  onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 0
                                    // Calculate total of other selected products
                                    const otherProductsTotal = Object.values(measurementProducts)
                                      .filter(p => p.selected && p.product.id !== item.product.id)
                                      .reduce((sum, p) => sum + (p.quantity || 0), 0)
                                    const maxAllowed = totalArea - otherProductsTotal
                                    
                                    if (newQty > maxAllowed) {
                                      toast.error(`Max quantity allowed: ${maxAllowed} sqft (Total area: ${totalArea} sqft)`)
                                      return
                                    }
                                    
                                    setMeasurementProducts(prev => ({
                                      ...prev,
                                      [item.product.id]: {
                                        ...prev[item.product.id],
                                        quantity: newQty
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
                      {/* Area Coverage Indicator */}
                      {(() => {
                        const selectedQty = Object.values(measurementProducts).filter(p => p.selected).reduce((sum, p) => sum + (p.quantity || 0), 0)
                        const coveragePercent = totalArea > 0 ? Math.round((selectedQty / totalArea) * 100) : 0
                        const isComplete = selectedQty === totalArea
                        const isOver = selectedQty > totalArea
                        return (
                          <div className="mb-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span className={isComplete ? 'text-emerald-600' : isOver ? 'text-red-600' : 'text-amber-600'}>
                                Area Coverage: {selectedQty} / {totalArea} sqft ({coveragePercent}%)
                              </span>
                              {!isComplete && !isOver && <span className="text-amber-600">Need {totalArea - selectedQty} more sqft</span>}
                              {isOver && <span className="text-red-600">Reduce {selectedQty - totalArea} sqft</span>}
                              {isComplete && <span className="text-emerald-600">✓ Complete</span>}
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : isOver ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(coveragePercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-700">Material Total:</span>
                        <span className="text-lg font-bold text-cyan-800">₹{getSelectedProductsTotal().toLocaleString()}</span>
                      </div>
                      {/* Save/Cancel buttons when editing materials */}
                      {isEditingMaterials && (
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              // Reset to original products and close edit mode
                              setMeasurementProducts(measurementDetails.selectedProducts || {})
                              setIsEditingMaterials(false)
                            }}
                          >
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                          <Button 
                            className="bg-cyan-600 hover:bg-cyan-700"
                            disabled={loading}
                            onClick={async () => {
                              setLoading(true)
                              // Save updated materials
                              const saved = await saveMeasurementDetails(true)
                              if (saved) {
                                toast.success('Materials updated successfully')
                                setIsEditingMaterials(false)
                                fetchInventory()
                              }
                              setLoading(false)
                            }}
                          >
                            {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            Save Changes
                          </Button>
                        </div>
                      )}
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
                const statusOrder = ['pending', 'site_visit_pending', 'measurement_scheduled', 'measurement_done', 'quote_pending', 'quote_sent', 'quote_approved', 'invoice_sent', 'payment_received', 'installation_scheduled', 'installation_in_progress', 'completed']
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

                // If in edit mode, show Complete Measurement button
                if (isEditingMaterials) {
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
                            if (!technicianName.trim()) {
                              toast.error('Please enter Technician/Visit Person name first')
                              return
                            }
                            const saved = await saveMeasurementDetails(true)
                            if (saved) {
                              await handleUpdateProjectStatus(selectedProject.id, 'measurement_done')
                              setSelectedProject(prev => ({ ...prev, status: 'measurement_done' }))
                              setIsEditingMaterials(false)
                              toast.success('Measurement completed! Inventory blocked.')
                            }
                          }}
                        >
                          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                          Complete Measurement & Block Inventory
                        </Button>
                      </div>
                      <p className="text-sm text-amber-600 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Edit mode active. Make changes and click Complete Measurement to save.
                      </p>
                    </div>
                  )
                }

                // Inventory already blocked - show edit/proceed options
                if (isInventoryBlocked) {
                  // Check if already invoiced/dispatched/delivered - editing NOT allowed
                  const isInvoiced = ['invoice_sent', 'payment_received', 'installation_scheduled', 'installation_in_progress', 'completed'].includes(status)
                  const hasQuote = ['quote_pending', 'quote_sent', 'approved', 'invoice_sent', 'payment_received', 'installation_scheduled', 'installation_in_progress', 'completed'].includes(status)
                  const isInstalling = ['installation_scheduled', 'installation_in_progress'].includes(status)
                  const isCompleted = status === 'completed'
                  const canEdit = !hasQuote // Can only edit if quote NOT yet created
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          variant="outline"
                          disabled={loading || !canEdit}
                          className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
                          onClick={() => {
                            if (!canEdit) return
                            setIsEditingMaterials(true)
                          }}
                          title={!canEdit ? 'Cannot edit after quote is created' : ''}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Edit Measurements & Materials
                        </Button>
                        {status === 'measurement_done' && !isEditingMaterials && (
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={loading || !hasProducts}
                            onClick={createQuoteFromMeasurement}
                          >
                            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                            Create Quote (₹{(getSelectedProductsTotal() + totalArea * 25).toLocaleString()})
                          </Button>
                        )}
                        {hasQuote && (
                          <Button onClick={() => setActiveTab('quotes')} variant="outline">
                            <FileText className="h-4 w-4 mr-2" /> View Quotes
                          </Button>
                        )}
                      </div>
                      {/* Professional messaging based on status */}
                      <p className={`text-sm flex items-center gap-2 ${isCompleted ? 'text-green-700' : isInstalling ? 'text-cyan-700' : hasQuote ? 'text-purple-700' : 'text-amber-700'}`}>
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Project completed. Materials installed and stock deducted.
                          </>
                        ) : isInstalling ? (
                          <>
                            <Wrench className="h-4 w-4" />
                            Installation in progress. Stock has been allocated.
                          </>
                        ) : hasQuote ? (
                          <>
                            <Lock className="h-4 w-4" />
                            Quote created. Material changes locked. Edit through quote revision if needed.
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            Stock allocated for this project. Click "Edit Materials" to modify.
                          </>
                        )}
                      </p>
                    </div>
                  )
                }

                // Not blocked - show normal flow
                if (['pending', 'site_visit_pending', 'measurement_scheduled'].includes(status)) {
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

        {/* View Product Dialog (read-only) */}
        <ViewProductDialog
          open={type === 'view_product'}
          onClose={() => setDialogOpen({ type: null, data: null })}
          product={data}
          categories={productCategories}
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
          onClose={() => {
            setDialogOpen({ type: null, data: null })
            setPendingProjectData(null)
          }}
          project={data}
          customers={customers}
          crmContacts={crmContacts}
          onSave={handleSaveProject}
          loading={loading}
          onAddContact={(currentFormData) => {
            // Store current project form data and open CRM contact dialog
            setPendingProjectData(currentFormData || data)
            setDialogOpen({ type: 'crm_contact', data: null })
          }}
        />

        {/* CRM Contact Dialog (for adding contact from Project dialog) */}
        <CrmContactDialog
          open={type === 'crm_contact'}
          onClose={() => {
            // Go back to project dialog if we have pending data
            if (pendingProjectData) {
              setDialogOpen({ type: 'project', data: pendingProjectData })
            } else {
              setDialogOpen({ type: null, data: null })
            }
          }}
          onSave={handleSaveCrmContact}
          loading={loading}
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
          customers={customers}
          moduleSettings={moduleSettings}
          onSave={handleSaveQuote}
          loading={loading}
          user={user}
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
          <TabsTrigger value="challans" className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Challans
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="installations" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Installations
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4" /> Finance
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
          <TabsContent value="challans">{renderChallans()}</TabsContent>
          <TabsContent value="invoices">{renderInvoices()}</TabsContent>
          <TabsContent value="installations">{renderInstallations()}</TabsContent>
          <TabsContent value="inventory">
            <EnterpriseInventory 
              token={token} 
              products={products} 
              onRefreshProducts={fetchProducts}
            />
          </TabsContent>
          <TabsContent value="finance">{renderFinance()}</TabsContent>
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

      {/* Cancel Quote Dialog */}
      <Dialog open={cancelQuoteDialog.open} onOpenChange={(open) => !open && setCancelQuoteDialog({ open: false, quoteId: null, reason: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              Cancel Quote
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this quote. This will reopen the measurements for a new quote.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Cancellation Reason *</Label>
              <Textarea 
                value={cancelQuoteDialog.reason}
                onChange={(e) => setCancelQuoteDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Customer requested changes, Pricing revision needed, Project scope changed..."
                rows={4}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              <strong>Note:</strong> Cancelling this quote will:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Mark the quote as cancelled with your reason</li>
                <li>Reopen the measurement for new quote generation</li>
                <li>Keep the blocked inventory for the new quote</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelQuoteDialog({ open: false, quoteId: null, reason: '' })}>
              Keep Quote
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelQuote}
              disabled={loading || !cancelQuoteDialog.reason.trim()}
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
              Cancel Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PICK LIST DIALOG - View and Confirm Materials ===== */}
      <Dialog open={pickListDialog.open} onOpenChange={(open) => {
        if (!open) {
          setPickListDialog({ open: false, data: null })
          setPickListConfirmations({}) // Reset confirmations when closing
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Pick List {pickListDialog.data?.pickListNumber || ''}
            </DialogTitle>
            <DialogDescription>
              Warehouse material preparation - Enter confirmed quantities for each item
            </DialogDescription>
          </DialogHeader>
          
          {pickListDialog.data ? (
            <div className="space-y-6">
              {/* Pick List Header Info */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Status</p>
                  <Badge className={
                    pickListDialog.data.status === 'MATERIAL_READY' ? 'bg-green-100 text-green-700' :
                    pickListDialog.data.status === 'PICKING' ? 'bg-amber-100 text-amber-700' :
                    pickListDialog.data.status === 'CREATED' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {pickListDialog.data.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Quote</p>
                  <p className="font-medium">{pickListDialog.data.quoteNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Required Boxes</p>
                  <p className="font-medium text-lg">{pickListDialog.data.totalBoxes || (pickListDialog.data.items || []).reduce((sum, i) => sum + (i.quoteQtyBoxes || 0), 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Required Area</p>
                  <p className="font-medium text-lg">{(pickListDialog.data.totalArea || (pickListDialog.data.items || []).reduce((sum, i) => sum + (i.quoteQtyArea || 0), 0)).toFixed(1)} sqft</p>
                </div>
              </div>

              {/* Instructions for CREATED status */}
              {pickListDialog.data.status === 'CREATED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-800">How to Confirm Materials</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Enter the <strong>actual available quantity</strong> in the warehouse for each product. 
                        If stock differs from required, enter what you have available. Click &quot;Confirm Material&quot; when done.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Ready Success */}
              {pickListDialog.data.status === 'MATERIAL_READY' && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-800 text-lg mb-1">Materials Confirmed!</h4>
                      <p className="text-green-700 mb-4">
                        Material quantities have been confirmed. You can now create a Delivery Challan.
                      </p>
                      <Button 
                        onClick={() => {
                          setPickListDialog({ open: false, data: null })
                          const quote = quotes.find(q => q.id === pickListDialog.data.quoteId)
                          if (quote) {
                            setDcDialog({ 
                              open: true, 
                              data: { 
                                source: 'pick_list',
                                sourceId: pickListDialog.data.id,
                                pickList: pickListDialog.data,
                                quote,
                                customer: quote.customer
                              } 
                            })
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2"
                        size="lg"
                      >
                        <Truck className="h-5 w-5 mr-2" />
                        Create Delivery Challan
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table with Editable Confirmations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" /> Materials to Pick ({(pickListDialog.data.items || []).length} items)
                  </h4>
                  {pickListDialog.data.status === 'CREATED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Auto-fill all with required quantities
                        const newConfirmations = {}
                        ;(pickListDialog.data.items || []).forEach(item => {
                          newConfirmations[item.id] = {
                            confirmedQtyBoxes: item.quoteQtyBoxes || 0,
                            confirmedQtyArea: item.quoteQtyArea || 0,
                            lotNo: '',
                            notes: ''
                          }
                        })
                        setPickListConfirmations(newConfirmations)
                        toast.info('Auto-filled with required quantities')
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Auto-fill All
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="font-semibold w-[200px]">Product</TableHead>
                        <TableHead className="text-center font-semibold w-[120px]">Required</TableHead>
                        {pickListDialog.data.status === 'CREATED' ? (
                          <>
                            <TableHead className="text-center font-semibold w-[150px]">Confirmed Qty</TableHead>
                            <TableHead className="text-center font-semibold w-[120px]">Lot/Batch No</TableHead>
                            <TableHead className="font-semibold">Notes</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-center font-semibold w-[120px]">Confirmed</TableHead>
                            <TableHead className="text-center font-semibold w-[100px]">Variance</TableHead>
                            <TableHead className="font-semibold">Lot/Notes</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pickListDialog.data.items || []).map((item, idx) => {
                        const confirmation = pickListConfirmations[item.id] || {}
                        const variance = pickListDialog.data.status === 'MATERIAL_READY' 
                          ? (item.confirmedQtyBoxes || 0) - (item.quoteQtyBoxes || 0)
                          : (confirmation.confirmedQtyBoxes || 0) - (item.quoteQtyBoxes || 0)
                        
                        return (
                          <TableRow key={idx} className="hover:bg-slate-50">
                            <TableCell>
                              <p className="font-medium">{item.productName || 'Product'}</p>
                              <p className="text-xs text-slate-500">{item.sku || ''}</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-bold text-lg">{item.quoteQtyBoxes || 0}</div>
                              <div className="text-xs text-slate-500">{(item.quoteQtyArea || 0).toFixed(1)} sqft</div>
                            </TableCell>
                            
                            {pickListDialog.data.status === 'CREATED' ? (
                              <>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-24 text-center mx-auto"
                                    placeholder="0"
                                    value={confirmation.confirmedQtyBoxes ?? ''}
                                    onChange={(e) => {
                                      const boxes = parseInt(e.target.value) || 0
                                      const coveragePerBox = item.coveragePerBoxSnapshot || 25
                                      setPickListConfirmations(prev => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          confirmedQtyBoxes: boxes,
                                          confirmedQtyArea: boxes * coveragePerBox
                                        }
                                      }))
                                    }}
                                  />
                                  {confirmation.confirmedQtyBoxes !== undefined && (
                                    <div className="text-xs text-slate-500 text-center mt-1">
                                      {(confirmation.confirmedQtyArea || 0).toFixed(1)} sqft
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    className="w-28"
                                    placeholder="Lot #"
                                    value={confirmation.lotNo ?? ''}
                                    onChange={(e) => {
                                      setPickListConfirmations(prev => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          lotNo: e.target.value
                                        }
                                      }))
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    placeholder="Notes (optional)"
                                    value={confirmation.notes ?? ''}
                                    onChange={(e) => {
                                      setPickListConfirmations(prev => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          notes: e.target.value
                                        }
                                      }))
                                    }}
                                  />
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-center">
                                  <div className="font-bold text-lg">{item.confirmedQtyBoxes || 0}</div>
                                  <div className="text-xs text-slate-500">{(item.confirmedQtyArea || 0).toFixed(1)} sqft</div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {variance === 0 ? (
                                    <Badge className="bg-green-100 text-green-700">Match</Badge>
                                  ) : variance < 0 ? (
                                    <Badge className="bg-red-100 text-red-700">{variance} boxes</Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-700">+{variance} boxes</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">{item.lotNo || '-'}</p>
                                  {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary when confirming */}
              {pickListDialog.data.status === 'CREATED' && Object.keys(pickListConfirmations).length > 0 && (
                <div className="bg-slate-50 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">
                        <strong>Confirmed Total:</strong>{' '}
                        {Object.values(pickListConfirmations).reduce((sum, c) => sum + (c.confirmedQtyBoxes || 0), 0)} boxes
                        {' / '}
                        {Object.values(pickListConfirmations).reduce((sum, c) => sum + (c.confirmedQtyArea || 0), 0).toFixed(1)} sqft
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Required: {(pickListDialog.data.items || []).reduce((sum, i) => sum + (i.quoteQtyBoxes || 0), 0)} boxes
                      </p>
                    </div>
                    {(() => {
                      const totalConfirmed = Object.values(pickListConfirmations).reduce((sum, c) => sum + (c.confirmedQtyBoxes || 0), 0)
                      const totalRequired = (pickListDialog.data.items || []).reduce((sum, i) => sum + (i.quoteQtyBoxes || 0), 0)
                      const diff = totalConfirmed - totalRequired
                      if (diff === 0) return <Badge className="bg-green-100 text-green-700">Exact Match</Badge>
                      if (diff < 0) return <Badge className="bg-amber-100 text-amber-700">Short by {Math.abs(diff)} boxes</Badge>
                      return <Badge className="bg-blue-100 text-blue-700">Excess by {diff} boxes</Badge>
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setPickListDialog({ open: false, data: null })
              setPickListConfirmations({})
            }}>
              Close
            </Button>
            {pickListDialog.data?.status === 'CREATED' && (
              <Button 
                onClick={async () => {
                  // Validate all items have confirmation
                  const items = pickListDialog.data.items || []
                  const allConfirmed = items.every(item => 
                    pickListConfirmations[item.id]?.confirmedQtyBoxes !== undefined
                  )
                  
                  if (!allConfirmed) {
                    toast.warning('Please enter confirmed quantity for all items')
                    return
                  }
                  
                  try {
                    setLoading(true)
                    const confirmationItems = items.map(item => ({
                      itemId: item.id,
                      confirmedQtyBoxes: pickListConfirmations[item.id]?.confirmedQtyBoxes || 0,
                      confirmedQtyArea: pickListConfirmations[item.id]?.confirmedQtyArea || 0,
                      lotNo: pickListConfirmations[item.id]?.lotNo || '',
                      notes: pickListConfirmations[item.id]?.notes || ''
                    }))
                    
                    const res = await fetch('/api/flooring/enhanced/pick-lists', {
                      method: 'PUT',
                      headers,
                      body: JSON.stringify({
                        id: pickListDialog.data.id,
                        action: 'material_ready',
                        data: { 
                          items: confirmationItems
                        }
                      })
                    })

                    if (res.ok) {
                      toast.success('Material quantities confirmed!')
                      fetchQuotes()
                      // Refresh the pick list data
                      handleViewPickList(pickListDialog.data.id)
                      setPickListConfirmations({})
                    } else {
                      const error = await res.json()
                      toast.error(error.error || 'Failed to confirm material')
                    }
                  } catch (error) {
                    toast.error('Error confirming material')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading || Object.keys(pickListConfirmations).length === 0}
              >
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm Material Quantities
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELIVERY CHALLAN CREATION DIALOG ===== */}
      <Dialog open={dcDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDcDialog({ open: false, data: null })
          // Reset form data
          setDcFormData({
            deliveryType: 'self',
            expectedDeliveryDate: new Date().toISOString().split('T')[0],
            shipToAddress: '',
            notes: '',
            receiverName: '',
            receiverPhone: '',
            vehicleNumber: '',
            driverName: '',
            driverPhone: '',
            chargesType: 'free',
            chargesAmount: 0,
            transporterName: '',
            transporterPhone: '',
            transporterCharges: 0,
            lrNumber: '',
            proofPhotoUrl: '',
            proofPhotoFile: null
          })
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Create Delivery Challan
            </DialogTitle>
            <DialogDescription>
              Create a delivery challan to dispatch materials to the customer
            </DialogDescription>
          </DialogHeader>
          
          {dcDialog.data ? (
            <div className="space-y-6">
              {/* Source Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Quote</p>
                  <p className="font-medium">{dcDialog.data.quote?.quoteNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Pick List</p>
                  <p className="font-medium">{dcDialog.data.pickList?.pickListNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Customer</p>
                  <p className="font-medium">{dcDialog.data.quote?.customer?.name || dcDialog.data.customer?.name || '-'}</p>
                </div>
              </div>

              {/* Items to be dispatched - Use CONFIRMED quantities from Pick List */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Items for Dispatch (Confirmed Quantities)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Confirmed Boxes</TableHead>
                        <TableHead className="text-right">Confirmed Area (sqft)</TableHead>
                        <TableHead>Lot No</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dcDialog.data.pickList?.items || dcDialog.data.quote?.items || []).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <p className="font-medium">{item.productName || item.product_name || item.name || 'Product'}</p>
                            <p className="text-xs text-slate-500">{item.sku || item.productCode || ''}</p>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {item.confirmedQtyBoxes ?? item.quoteQtyBoxes ?? item.boxes ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {(item.confirmedQtyArea ?? item.quoteQtyArea ?? item.area ?? 0).toFixed(1)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">{item.lotNo || '-'}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Total Summary */}
                <div className="mt-2 text-right text-sm text-slate-600">
                  <strong>Total:</strong>{' '}
                  {(dcDialog.data.pickList?.items || dcDialog.data.quote?.items || []).reduce((sum, i) => sum + (i.confirmedQtyBoxes ?? i.quoteQtyBoxes ?? 0), 0)} boxes /{' '}
                  {(dcDialog.data.pickList?.items || dcDialog.data.quote?.items || []).reduce((sum, i) => sum + (i.confirmedQtyArea ?? i.quoteQtyArea ?? 0), 0).toFixed(1)} sqft
                </div>
              </div>

              {/* Delivery Type Selection */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Delivery Method
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'self', label: 'Self Pickup', icon: Users, desc: 'Customer picks up' },
                    { value: 'company', label: 'Company Delivery', icon: Truck, desc: 'Our vehicle' },
                    { value: 'transporter', label: 'Transporter', icon: Box, desc: 'Third party logistics' }
                  ].map(option => (
                    <div
                      key={option.value}
                      onClick={() => setDcFormData(prev => ({ ...prev, deliveryType: option.value }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        dcFormData.deliveryType === option.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <option.icon className={`h-6 w-6 mb-2 ${dcFormData.deliveryType === option.value ? 'text-blue-600' : 'text-slate-400'}`} />
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Type Specific Fields */}
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                {/* Self Pickup Fields */}
                {dcFormData.deliveryType === 'self' && (
                  <>
                    <h5 className="font-medium text-sm text-slate-700">Receiver Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Receiver Name *</Label>
                        <Input
                          placeholder="Person collecting the goods"
                          value={dcFormData.receiverName}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Receiver Phone *</Label>
                        <Input
                          placeholder="+91 98765 43210"
                          value={dcFormData.receiverPhone}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, receiverPhone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Company Delivery Fields */}
                {dcFormData.deliveryType === 'company' && (
                  <>
                    <h5 className="font-medium text-sm text-slate-700">Vehicle & Driver Details</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Vehicle Number *</Label>
                        <Input
                          placeholder="MH01AB1234"
                          value={dcFormData.vehicleNumber}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Driver Name *</Label>
                        <Input
                          placeholder="Driver full name"
                          value={dcFormData.driverName}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, driverName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Driver Phone *</Label>
                        <Input
                          placeholder="+91 98765 43210"
                          value={dcFormData.driverPhone}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, driverPhone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Transportation Charges</Label>
                        <Select 
                          value={dcFormData.chargesType} 
                          onValueChange={(value) => setDcFormData(prev => ({ 
                            ...prev, 
                            chargesType: value,
                            chargesAmount: value === 'free' ? 0 : prev.chargesAmount
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free Delivery</SelectItem>
                            <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                            <SelectItem value="add_to_bill">Add to Bill</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Charges Amount (₹) {dcFormData.chargesType !== 'free' && '*'}</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={dcFormData.chargesAmount}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, chargesAmount: parseFloat(e.target.value) || 0 }))}
                          disabled={dcFormData.chargesType === 'free'}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Transporter Fields */}
                {dcFormData.deliveryType === 'transporter' && (
                  <>
                    <h5 className="font-medium text-sm text-slate-700">Transporter Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Transporter Name *</Label>
                        <Input
                          placeholder="Transport company name"
                          value={dcFormData.transporterName}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, transporterName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Transporter Phone *</Label>
                        <Input
                          placeholder="+91 98765 43210"
                          value={dcFormData.transporterPhone}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, transporterPhone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>LR / Docket Number</Label>
                        <Input
                          placeholder="Lorry Receipt Number"
                          value={dcFormData.lrNumber}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, lrNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Transport Charges (₹) *</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={dcFormData.transporterCharges}
                          onChange={(e) => setDcFormData(prev => ({ ...prev, transporterCharges: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Third-Party Delivery / Dealer Customer Section */}
              <div className="space-y-4 p-4 border-2 rounded-lg bg-amber-50 border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="third-party-delivery"
                      checked={dcFormData.isThirdPartyDelivery}
                      onChange={(e) => setDcFormData(prev => ({ ...prev, isThirdPartyDelivery: e.target.checked }))}
                      className="h-5 w-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="third-party-delivery" className="font-medium text-amber-800 cursor-pointer">
                      Third-Party Delivery (Dealer Customer)
                    </label>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    Dealer Flow
                  </Badge>
                </div>
                <p className="text-sm text-amber-700">
                  Enable this when the dealer is billed but delivery goes to their end customer. 
                  The challan PDF will only show receiver details.
                </p>

                {dcFormData.isThirdPartyDelivery && (
                  <div className="space-y-4 pt-4 border-t border-amber-200">
                    {/* PDF Options */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="hide-sender-pdf"
                        checked={dcFormData.hideSenderOnPdf}
                        onChange={(e) => setDcFormData(prev => ({ ...prev, hideSenderOnPdf: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <label htmlFor="hide-sender-pdf" className="text-sm text-slate-700">
                        Hide Sender on PDF (recommended for dealer-direct dispatch)
                      </label>
                    </div>

                    {/* Delivery On Behalf Of */}
                    <div>
                      <Label>Delivery On Behalf Of (Optional)</Label>
                      <Input
                        placeholder="Dealer name for audit trail"
                        value={dcFormData.deliveryOnBehalfOf}
                        onChange={(e) => setDcFormData(prev => ({ ...prev, deliveryOnBehalfOf: e.target.value }))}
                      />
                      <p className="text-xs text-slate-500 mt-1">This is stored internally for audit, not printed on PDF</p>
                    </div>

                    {/* Bill To (Internal Reference) */}
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <h5 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                        <Building className="h-4 w-4" /> Bill To (Internal Reference)
                        <Badge variant="outline" className="text-xs">Hidden on PDF</Badge>
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Dealer/Bill To Name</Label>
                          <Input
                            placeholder="Dealer company name"
                            value={dcFormData.billToName || dcDialog.data?.quote?.customer?.name || ''}
                            onChange={(e) => setDcFormData(prev => ({ ...prev, billToName: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">GSTIN</Label>
                          <Input
                            placeholder="GST Number"
                            value={dcFormData.billToGstin}
                            onChange={(e) => setDcFormData(prev => ({ ...prev, billToGstin: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ship To / End Customer */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-medium text-sm text-green-800 mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Ship To / Deliver To (End Customer) *
                        <Badge className="bg-green-100 text-green-700 text-xs">Shown on PDF</Badge>
                      </h5>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-xs">Site / Customer Name *</Label>
                          <Input
                            placeholder="End customer or site name"
                            value={dcFormData.shipToName}
                            onChange={(e) => setDcFormData(prev => ({ ...prev, shipToName: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Delivery Site Address *</Label>
                          <Textarea
                            placeholder="Complete site address for delivery"
                            value={dcFormData.shipToAddress}
                            onChange={(e) => setDcFormData(prev => ({ ...prev, shipToAddress: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Site Incharge / Receiver Contact */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-sm text-blue-800 mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" /> Site Incharge / Receiver Contact *
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Receiver Name *</Label>
                          <Input
                            placeholder="Person receiving goods"
                            value={dcFormData.siteInchargeName}
                            onChange={(e) => setDcFormData(prev => ({ ...prev, siteInchargeName: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Receiver Phone *</Label>
                          <Input
                            placeholder="+91 98765 43210"
                            value={dcFormData.siteInchargePhone}
                            onChange={(e) => setDcFormData(prev => ({ ...prev, siteInchargePhone: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Upload - Required for all */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Proof Photo *
                  <Badge variant="outline" className="text-xs">Required</Badge>
                </h4>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  {dcFormData.proofPhotoUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={dcFormData.proofPhotoUrl} 
                        alt="Proof" 
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDcFormData(prev => ({ ...prev, proofPhotoUrl: '', proofPhotoFile: null }))}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove Photo
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600 mb-2">
                        Upload photo of goods ready for dispatch
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="dc-proof-photo"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setDcFormData(prev => ({ 
                                ...prev, 
                                proofPhotoUrl: reader.result,
                                proofPhotoFile: file
                              }))
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                      <Button variant="outline" onClick={() => document.getElementById('dc-proof-photo')?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Upload Photo
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expected Delivery Date *</Label>
                  <Input 
                    type="date" 
                    value={dcFormData.expectedDeliveryDate}
                    onChange={(e) => setDcFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Ship To Address</Label>
                  <Input
                    placeholder="Delivery address"
                    value={dcFormData.shipToAddress || dcDialog.data.quote?.customer?.address || ''}
                    onChange={(e) => setDcFormData(prev => ({ ...prev, shipToAddress: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Notes / Instructions</Label>
                <Textarea 
                  placeholder="Any special delivery instructions..."
                  value={dcFormData.notes}
                  onChange={(e) => setDcFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                <strong>Note:</strong> Stock will be deducted from inventory only when the DC is marked as &quot;Issued&quot;.
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDcDialog({ open: false, data: null })}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                // Validate required fields
                if (!dcFormData.proofPhotoUrl) {
                  toast.warning('Please upload a proof photo')
                  return
                }
                
                // Validate Third-Party Delivery fields
                if (dcFormData.isThirdPartyDelivery) {
                  if (!dcFormData.shipToName || !dcFormData.shipToAddress) {
                    toast.warning('Please enter Ship To name and address for third-party delivery')
                    return
                  }
                  if (!dcFormData.siteInchargeName || !dcFormData.siteInchargePhone) {
                    toast.warning('Please enter site incharge name and phone')
                    return
                  }
                }
                
                if (dcFormData.deliveryType === 'self') {
                  if (!dcFormData.receiverName || !dcFormData.receiverPhone) {
                    toast.warning('Please enter receiver name and phone number')
                    return
                  }
                } else if (dcFormData.deliveryType === 'company') {
                  if (!dcFormData.vehicleNumber || !dcFormData.driverName || !dcFormData.driverPhone) {
                    toast.warning('Please enter vehicle number, driver name and phone')
                    return
                  }
                  if (dcFormData.chargesType !== 'free' && !dcFormData.chargesAmount) {
                    toast.warning('Please enter transportation charges amount')
                    return
                  }
                } else if (dcFormData.deliveryType === 'transporter') {
                  if (!dcFormData.transporterName || !dcFormData.transporterPhone) {
                    toast.warning('Please enter transporter details')
                    return
                  }
                }
                
                try {
                  setLoading(true)
                  const quote = dcDialog.data.quote
                  const pickList = dcDialog.data.pickList
                  
                  // Get items from pick list (use confirmed quantities) or quote
                  const items = (pickList?.items || quote?.items || []).map(item => ({
                    productId: item.productId || item.product_id,
                    productName: item.productName || item.product_name,
                    sku: item.sku || item.productCode,
                    qtyBoxes: item.confirmedQtyBoxes ?? item.quoteQtyBoxes ?? item.boxes ?? 0,
                    qtyArea: item.confirmedQtyArea ?? item.quoteQtyArea ?? item.area ?? 0,
                    coveragePerBoxSnapshot: item.coveragePerBoxSnapshot || item.coveragePerBox || 0,
                    lotNo: item.lotNo || ''
                  }))

                  const res = await fetch('/api/flooring/enhanced/challans', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      source: pickList?.id ? 'pick_list' : 'quote',
                      sourceId: pickList?.id || quote.id,
                      billToAccountId: quote.customerId || quote.customer_id || quote.customer?.id,
                      billToName: dcFormData.billToName || quote.customer?.name,
                      billToGstin: dcFormData.billToGstin,
                      shipToAddress: dcFormData.shipToAddress || quote.customer?.address || '',
                      expectedDeliveryDate: dcFormData.expectedDeliveryDate,
                      deliveryType: dcFormData.deliveryType,
                      notes: dcFormData.notes,
                      proofPhotoUrl: dcFormData.proofPhotoUrl,
                      // Third-Party Delivery (Dealer Customer) data
                      isThirdPartyDelivery: dcFormData.isThirdPartyDelivery,
                      hideSenderOnPdf: dcFormData.hideSenderOnPdf,
                      deliveryOnBehalfOf: dcFormData.deliveryOnBehalfOf,
                      // Ship To (End Customer)
                      shipToName: dcFormData.shipToName,
                      // Site Incharge / Receiver Contact
                      siteInchargeName: dcFormData.siteInchargeName,
                      siteInchargePhone: dcFormData.siteInchargePhone,
                      // Delivery type specific data
                      ...(dcFormData.deliveryType === 'self' && {
                        receiverName: dcFormData.receiverName,
                        receiverPhone: dcFormData.receiverPhone
                      }),
                      ...(dcFormData.deliveryType === 'company' && {
                        vehicleNumber: dcFormData.vehicleNumber,
                        driverName: dcFormData.driverName,
                        driverPhone: dcFormData.driverPhone,
                        chargesType: dcFormData.chargesType,
                        chargesAmount: dcFormData.chargesAmount
                      }),
                      ...(dcFormData.deliveryType === 'transporter' && {
                        transporterName: dcFormData.transporterName,
                        transporterPhone: dcFormData.transporterPhone,
                        transporterCharges: dcFormData.transporterCharges,
                        lrNumber: dcFormData.lrNumber
                      }),
                      items
                    })
                  })

                  if (res.ok) {
                    const data = await res.json()
                    toast.success(`Delivery Challan ${data.challan?.dcNo || data.dc_no} created successfully!`)
                    setDcDialog({ open: false, data: null })
                    fetchQuotes()
                  } else {
                    const error = await res.json()
                    toast.error(error.error || 'Failed to create DC')
                  }
                } catch (error) {
                  console.error('DC creation error:', error)
                  toast.error('Error creating delivery challan')
                } finally {
                  setLoading(false)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
              Create Delivery Challan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen.type === 'invoice'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Invoice
            </DialogTitle>
            <DialogDescription>
              Create a standalone invoice for services or products
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input 
                    placeholder="Enter customer name" 
                    value={newInvoiceForm.customerName}
                    onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    placeholder="customer@email.com" 
                    value={newInvoiceForm.customerEmail}
                    onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    placeholder="+91 9876543210" 
                    value={newInvoiceForm.customerPhone}
                    onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input 
                    placeholder="Customer address" 
                    value={newInvoiceForm.customerAddress}
                    onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-700">Invoice Items</h3>
                <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Item/Service</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Description</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 w-20">Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 w-28">Rate (₹)</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 w-28">Amount</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {newInvoiceForm.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-2 py-2">
                          <Input 
                            placeholder="Item name" 
                            className="h-8 text-sm"
                            value={item.name}
                            onChange={(e) => updateInvoiceItem(index, 'name', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            placeholder="Description" 
                            className="h-8 text-sm"
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            type="number" 
                            className="h-8 text-sm text-center"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            type="number" 
                            className="h-8 text-sm text-right"
                            value={item.rate}
                            onChange={(e) => updateInvoiceItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-sm">
                          ₹{(item.quantity * item.rate).toLocaleString()}
                        </td>
                        <td className="px-2 py-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => removeInvoiceItem(index)}
                            disabled={newInvoiceForm.items.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">₹{newInvoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">CGST (9%):</span>
                    <span>₹{(newInvoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * 0.09).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">SGST (9%):</span>
                    <span>₹{(newInvoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * 0.09).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Grand Total:</span>
                    <span className="text-green-600">₹{(newInvoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * 1.18).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={newInvoiceForm.dueDate}
                  onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input 
                  placeholder="Additional notes..." 
                  value={newInvoiceForm.notes}
                  onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>
              Cancel
            </Button>
            <Button onClick={handleCreateStandaloneInvoice} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" /> Create Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={dialogOpen.type === 'view_invoice'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice {dialogOpen.data?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              {dialogOpen.data?.customer?.name || 'Customer'} • {dialogOpen.data?.status?.toUpperCase() || 'DRAFT'}
            </DialogDescription>
          </DialogHeader>
          
          {dialogOpen.data && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Invoice Number</p>
                  <p className="font-semibold">{dialogOpen.data.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-semibold">{new Date(dialogOpen.data.createdAt || dialogOpen.data.invoiceDate).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="font-semibold">{dialogOpen.data.customer?.name || 'N/A'}</p>
                  {dialogOpen.data.customer?.phone && <p className="text-sm text-slate-500">{dialogOpen.data.customer.phone}</p>}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge variant={dialogOpen.data.status === 'paid' ? 'default' : 'secondary'}>
                    {dialogOpen.data.status?.toUpperCase() || 'DRAFT'}
                  </Badge>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-3">#</th>
                        <th className="text-left p-3">Item</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Rate</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dialogOpen.data.items || []).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">
                            <p className="font-medium">{item.name || item.productName}</p>
                            {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                          </td>
                          <td className="text-right p-3">{item.quantity} {item.unit || ''}</td>
                          <td className="text-right p-3">₹{(item.unitPrice || item.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="text-right p-3">₹{(item.totalPrice || item.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{(dialogOpen.data.subtotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {!dialogOpen.data.isInterstate ? (
                    <>
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>CGST @ {dialogOpen.data.cgstRate || 9}%</span>
                        <span>₹{(dialogOpen.data.cgst || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>SGST @ {dialogOpen.data.sgstRate || 9}%</span>
                        <span>₹{(dialogOpen.data.sgst || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>IGST @ {dialogOpen.data.igstRate || 18}%</span>
                      <span>₹{(dialogOpen.data.igst || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Grand Total</span>
                    <span>₹{(dialogOpen.data.grandTotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token')
                      const response = await fetch(`/api/flooring/enhanced/invoices/pdf?id=${dialogOpen.data.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      const html = await response.text()
                      const newWindow = window.open('', '_blank')
                      newWindow.document.write(html)
                      newWindow.document.close()
                    } catch (error) {
                      toast.error('Failed to open invoice')
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token')
                      const response = await fetch(`/api/flooring/enhanced/invoices/pdf?id=${dialogOpen.data.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      const html = await response.text()
                      const printWindow = window.open('', '_blank')
                      printWindow.document.write(html)
                      printWindow.document.close()
                      setTimeout(() => printWindow.print(), 500)
                    } catch (error) {
                      toast.error('Failed to print invoice')
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setDialogOpen({ type: null, data: null })}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* ===== ADD/EDIT INSTALLER DIALOG ===== */}
      <Dialog open={dialogOpen.type === 'add_installer' || dialogOpen.type === 'edit_installer'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {dialogOpen.type === 'edit_installer' ? 'Edit Installer' : 'Add Installer / Vendor'}
            </DialogTitle>
            <DialogDescription>
              {dialogOpen.type === 'edit_installer' ? 'Update installer details' : 'Add a new in-house installer or third-party vendor'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${(dialogOpen.data?.installerType || 'in_house') === 'in_house' ? 'border-blue-500 bg-blue-50' : 'hover:border-slate-300'}`}
                onClick={() => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, installerType: 'in_house' } })}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">In-House Installer</p>
                    <p className="text-xs text-slate-500">Employee or staff member</p>
                  </div>
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-all ${(dialogOpen.data?.installerType || 'in_house') === 'third_party' ? 'border-purple-500 bg-purple-50' : 'hover:border-slate-300'}`}
                onClick={() => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, installerType: 'third_party' } })}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Third-Party Vendor</p>
                    <p className="text-xs text-slate-500">External contractor or company</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  placeholder="Full name"
                  value={dialogOpen.data?.name || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, name: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input 
                  placeholder="Phone number"
                  value={dialogOpen.data?.phone || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, phone: e.target.value } })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  placeholder="Email address"
                  value={dialogOpen.data?.email || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, email: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Experience (Years)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={dialogOpen.data?.experience || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, experience: parseInt(e.target.value) || 0 } })}
                />
              </div>
            </div>

            {/* Third Party Company Details */}
            {(dialogOpen.data?.installerType || 'in_house') === 'third_party' && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="p-4 space-y-4">
                  <p className="font-medium text-purple-800 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Company Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input 
                        placeholder="Company name"
                        value={dialogOpen.data?.companyName || ''}
                        onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, companyName: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input 
                        placeholder="GSTIN"
                        value={dialogOpen.data?.gstNumber || ''}
                        onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, gstNumber: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PAN Number</Label>
                      <Input 
                        placeholder="PAN"
                        value={dialogOpen.data?.panNumber || ''}
                        onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, panNumber: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select 
                        value={dialogOpen.data?.paymentTerms || 'per_job'}
                        onValueChange={(v) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, paymentTerms: v } })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_job">Per Job</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                placeholder="Street address"
                value={dialogOpen.data?.address || ''}
                onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, address: e.target.value } })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input 
                  placeholder="City"
                  value={dialogOpen.data?.city || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, city: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input 
                  placeholder="State"
                  value={dialogOpen.data?.state || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, state: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input 
                  placeholder="Pincode"
                  value={dialogOpen.data?.pincode || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, pincode: e.target.value } })}
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills / Expertise</Label>
              <div className="flex flex-wrap gap-2">
                {['wooden_flooring', 'laminate', 'vinyl', 'spc', 'hardwood', 'bamboo', 'tile', 'carpet'].map(skill => (
                  <Badge 
                    key={skill}
                    variant="outline"
                    className={`cursor-pointer ${(dialogOpen.data?.skills || []).includes(skill) ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
                    onClick={() => {
                      const currentSkills = dialogOpen.data?.skills || []
                      const newSkills = currentSkills.includes(skill) 
                        ? currentSkills.filter(s => s !== skill)
                        : [...currentSkills, skill]
                      setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, skills: newSkills } })
                    }}
                  >
                    {skill.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Rates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Daily Rate (₹)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={dialogOpen.data?.dailyRate || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, dailyRate: parseFloat(e.target.value) || 0 } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate per Sqft (₹)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={dialogOpen.data?.sqftRate || ''}
                  onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, sqftRate: parseFloat(e.target.value) || 0 } })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Any additional notes..."
                value={dialogOpen.data?.notes || ''}
                onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, notes: e.target.value } })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  if (!dialogOpen.data?.name || !dialogOpen.data?.phone) {
                    toast.error('Name and phone are required')
                    return
                  }
                  setLoading(true)
                  const res = await fetch('/api/flooring/enhanced/installers', {
                    method: dialogOpen.type === 'edit_installer' ? 'PUT' : 'POST',
                    headers,
                    body: JSON.stringify({
                      id: dialogOpen.data?.id,
                      name: dialogOpen.data?.name,
                      type: dialogOpen.data?.installerType || 'in_house',
                      phone: dialogOpen.data?.phone,
                      email: dialogOpen.data?.email,
                      address: dialogOpen.data?.address,
                      city: dialogOpen.data?.city,
                      state: dialogOpen.data?.state,
                      pincode: dialogOpen.data?.pincode,
                      companyName: dialogOpen.data?.companyName,
                      gstNumber: dialogOpen.data?.gstNumber,
                      panNumber: dialogOpen.data?.panNumber,
                      paymentTerms: dialogOpen.data?.paymentTerms,
                      skills: dialogOpen.data?.skills || [],
                      experience: dialogOpen.data?.experience || 0,
                      dailyRate: dialogOpen.data?.dailyRate || 0,
                      sqftRate: dialogOpen.data?.sqftRate || 0,
                      notes: dialogOpen.data?.notes
                    })
                  })
                  
                  if (res.ok) {
                    toast.success(dialogOpen.type === 'edit_installer' ? 'Installer updated' : 'Installer added successfully')
                    setDialogOpen({ type: null, data: null })
                    fetchInstallers()
                  } else {
                    const error = await res.json()
                    toast.error(error.error || 'Failed to save installer')
                  }
                } catch (error) {
                  toast.error('Error saving installer')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {dialogOpen.type === 'edit_installer' ? 'Update' : 'Add Installer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== VIEW/MANAGE INSTALLATION DIALOG ===== */}
      <Dialog open={dialogOpen.type === 'view_installation'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-teal-600" />
              Installation Details
            </DialogTitle>
            <DialogDescription>
              {dialogOpen.data?.customer?.name} - {dialogOpen.data?.site?.address}
            </DialogDescription>
          </DialogHeader>

          {dialogOpen.data && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="completion">Completion</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" /> Customer Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Name:</span> {dialogOpen.data.customer?.name}</p>
                        <p><span className="text-slate-500">Phone:</span> {dialogOpen.data.customer?.phone}</p>
                        <p><span className="text-slate-500">Address:</span> {dialogOpen.data.site?.address}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Schedule
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Scheduled:</span> {dialogOpen.data.scheduledDate ? new Date(dialogOpen.data.scheduledDate).toLocaleDateString() : '-'}</p>
                        <p><span className="text-slate-500">Started:</span> {dialogOpen.data.actualStartDate ? new Date(dialogOpen.data.actualStartDate).toLocaleDateString() : '-'}</p>
                        <p><span className="text-slate-500">Completed:</span> {dialogOpen.data.actualEndDate ? new Date(dialogOpen.data.actualEndDate).toLocaleDateString() : '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Assigned Installer */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Assigned Team
                    </h4>
                    {dialogOpen.data.assignedTo ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{installers.find(i => i.id === dialogOpen.data.assignedTo)?.name || 'Installer'}</p>
                          <p className="text-sm text-slate-500">{installers.find(i => i.id === dialogOpen.data.assignedTo)?.phone}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-auto"
                          onClick={() => handleInstallationAction(dialogOpen.data.id, 'unassign_installer')}
                        >
                          <X className="h-4 w-4 mr-1" /> Unassign
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-500 mb-2">No installer assigned</p>
                        <Select onValueChange={(v) => {
                          const installer = installers.find(i => i.id === v)
                          handleInstallationAction(dialogOpen.data.id, 'assign_installer', { 
                            installerId: v, 
                            installerName: installer?.name 
                          })
                        }}>
                          <SelectTrigger className="w-64 mx-auto">
                            <SelectValue placeholder="Select installer" />
                          </SelectTrigger>
                          <SelectContent>
                            {installers.filter(i => i.isAvailable && i.status === 'active').map(inst => (
                              <SelectItem key={inst.id} value={inst.id}>
                                {inst.name} ({inst.type === 'third_party' ? 'Vendor' : 'In-House'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Checklist */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" /> Installation Checklist
                    </h4>
                    <div className="space-y-2">
                      {(dialogOpen.data.checklist || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                          <Checkbox 
                            checked={item.completed}
                            onCheckedChange={(checked) => {
                              handleInstallationAction(dialogOpen.data.id, 'update_checklist', {
                                checklistItemId: item.id,
                                completed: checked
                              })
                            }}
                          />
                          <span className={item.completed ? 'text-slate-400 line-through' : ''}>{item.task}</span>
                          {item.completedAt && (
                            <span className="text-xs text-slate-400 ml-auto">
                              {new Date(item.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Overall Progress</h4>
                      <span className="text-2xl font-bold text-teal-600">{dialogOpen.data.progress || 0}%</span>
                    </div>
                    <Progress value={dialogOpen.data.progress || 0} className="h-3 mb-2" />
                    <p className="text-sm text-slate-500">
                      {dialogOpen.data.areaInstalled || 0} / {dialogOpen.data.totalArea || 0} sqft installed
                    </p>
                  </CardContent>
                </Card>

                {/* Room-wise Progress */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Room-wise Progress</h4>
                    {(dialogOpen.data.rooms || []).length > 0 ? (
                      <div className="space-y-3">
                        {dialogOpen.data.rooms.map((room, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{room.name}</span>
                              <Badge variant="outline" className={
                                room.status === 'completed' ? 'bg-green-50 text-green-700' :
                                room.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                                'bg-slate-50 text-slate-600'
                              }>
                                {room.status || 'Pending'}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-500 mb-2">
                              {room.areaCompleted || 0} / {room.area || 0} sqft
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={(room.areaCompleted || 0) / (room.area || 1) * 100} className="h-2 flex-1" />
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const newStatus = room.status === 'completed' ? 'pending' : 
                                                   room.status === 'in_progress' ? 'completed' : 'in_progress'
                                  const newArea = newStatus === 'completed' ? room.area : room.areaCompleted
                                  handleInstallationAction(dialogOpen.data.id, 'update_room', {
                                    roomId: room.id,
                                    roomStatus: newStatus,
                                    areaCompleted: newArea
                                  })
                                }}
                              >
                                {room.status === 'completed' ? 'Reopen' : room.status === 'in_progress' ? 'Complete' : 'Start'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">No rooms defined</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-4">
                {['before', 'during', 'after'].map(category => (
                  <Card key={category}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">{category} Photos</h4>
                        <Button size="sm" variant="outline" onClick={() => setDialogOpen({ type: 'add_photos', data: { ...dialogOpen.data, photoCategory: category } })}>
                          <Camera className="h-4 w-4 mr-1" /> Add Photos
                        </Button>
                      </div>
                      {(dialogOpen.data.photos?.[category] || []).length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {dialogOpen.data.photos[category].map((photo, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                              <img src={photo.url} alt={`${category} ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-lg">
                          <Camera className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No {category} photos yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Issues Tab */}
              <TabsContent value="issues" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setDialogOpen({ type: 'report_issue', data: dialogOpen.data })}>
                    <AlertTriangle className="h-4 w-4 mr-2" /> Report Issue
                  </Button>
                </div>
                {(dialogOpen.data.issues || []).length > 0 ? (
                  <div className="space-y-3">
                    {dialogOpen.data.issues.map((issue, idx) => (
                      <Card key={idx} className={issue.status === 'resolved' ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                issue.severity === 'critical' ? 'bg-red-100' :
                                issue.severity === 'high' ? 'bg-orange-100' :
                                issue.severity === 'medium' ? 'bg-amber-100' : 'bg-slate-100'
                              }`}>
                                <AlertTriangle className={`h-4 w-4 ${
                                  issue.severity === 'critical' ? 'text-red-600' :
                                  issue.severity === 'high' ? 'text-orange-600' :
                                  issue.severity === 'medium' ? 'text-amber-600' : 'text-slate-600'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">{issue.description}</p>
                                <p className="text-xs text-slate-500">
                                  Reported {new Date(issue.reportedAt).toLocaleDateString()}
                                </p>
                                {issue.resolution && (
                                  <p className="text-sm text-green-600 mt-1">Resolution: {issue.resolution}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={issue.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {issue.status}
                              </Badge>
                              {issue.status !== 'resolved' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    const resolution = prompt('Enter resolution details:')
                                    if (resolution) {
                                      handleInstallationAction(dialogOpen.data.id, 'resolve_issue', {
                                        issueId: issue.id,
                                        resolution
                                      })
                                    }
                                  }}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
                      <p className="text-slate-500">No issues reported</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Completion Tab */}
              <TabsContent value="completion" className="space-y-4">
                {/* Customer Signature */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Edit className="h-4 w-4" /> Customer Sign-off
                    </h4>
                    {dialogOpen.data.customerSignature ? (
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <img src={dialogOpen.data.customerSignature.signature} alt="Signature" className="h-24 mx-auto" />
                        <p className="text-center text-sm text-slate-500 mt-2">
                          Signed by {dialogOpen.data.customerSignature.signedBy} on {new Date(dialogOpen.data.customerSignature.signedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-lg">
                        <Edit className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 mb-3">No signature captured yet</p>
                        <Button variant="outline" onClick={() => toast.info('Signature capture coming soon')}>
                          Capture Signature
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Warranty Info */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Warranty Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">Material Warranty</p>
                        <p className="font-medium">{dialogOpen.data.warranty?.materialWarranty || '10 years'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">Installation Warranty</p>
                        <p className="font-medium">{dialogOpen.data.warranty?.installationWarranty || '1 year'}</p>
                      </div>
                    </div>
                    {dialogOpen.data.warranty?.warrantyStartDate && (
                      <p className="text-sm text-slate-500 mt-3">
                        Warranty started: {new Date(dialogOpen.data.warranty.warrantyStartDate).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Completion Certificate */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Completion Certificate
                    </h4>
                    {dialogOpen.data.completionCertificate ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-mono font-bold">{dialogOpen.data.completionCertificate.certificateNumber}</p>
                            <p className="text-sm text-slate-500">
                              Generated on {new Date(dialogOpen.data.completionCertificate.generatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" /> Download PDF
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-lg">
                        <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 mb-3">Certificate not generated</p>
                        {dialogOpen.data.status === 'completed' && (
                          <Button onClick={() => {
                            const installerName = installers.find(i => i.id === dialogOpen.data.assignedTo)?.name
                            handleInstallationAction(dialogOpen.data.id, 'generate_certificate', { installerName })
                          }}>
                            <Award className="h-4 w-4 mr-2" /> Generate Certificate
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>
              Close
            </Button>
            {dialogOpen.data?.status === 'scheduled' && (
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => {
                handleInstallationAction(dialogOpen.data.id, 'start')
                setDialogOpen({ type: null, data: null })
              }}>
                <Zap className="h-4 w-4 mr-2" /> Start Installation
              </Button>
            )}
            {dialogOpen.data?.status === 'in_progress' && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                handleInstallationAction(dialogOpen.data.id, 'complete')
                setDialogOpen({ type: null, data: null })
              }}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Installation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== REPORT ISSUE DIALOG ===== */}
      <Dialog open={dialogOpen.type === 'report_issue'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Report Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Description *</Label>
              <Textarea 
                placeholder="Describe the issue..."
                value={dialogOpen.data?.issueDescription || ''}
                onChange={(e) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, issueDescription: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select 
                value={dialogOpen.data?.severity || 'medium'}
                onValueChange={(v) => setDialogOpen({ ...dialogOpen, data: { ...dialogOpen.data, severity: v } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!dialogOpen.data?.issueDescription) {
                  toast.error('Please describe the issue')
                  return
                }
                handleInstallationAction(dialogOpen.data.id, 'add_issue', {
                  issueDescription: dialogOpen.data.issueDescription,
                  severity: dialogOpen.data.severity || 'medium'
                })
                setDialogOpen({ type: null, data: null })
                toast.success('Issue reported')
              }}
            >
              Report Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD PHOTOS DIALOG ===== */}
      <Dialog open={dialogOpen.type === 'add_photos'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Add {dialogOpen.data?.photoCategory || ''} Photos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-3">Drop photos here or click to upload</p>
              <Input 
                type="file" 
                accept="image/*" 
                multiple 
                className="mx-auto w-fit"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return
                  
                  // Convert to base64 for demo (in production, upload to storage)
                  const photos = await Promise.all(files.map(async (file) => {
                    return new Promise((resolve) => {
                      const reader = new FileReader()
                      reader.onload = () => resolve({
                        url: reader.result,
                        name: file.name,
                        size: file.size
                      })
                      reader.readAsDataURL(file)
                    })
                  }))
                  
                  handleInstallationAction(dialogOpen.data.id, 'add_photos', {
                    category: dialogOpen.data.photoCategory,
                    photos
                  })
                  setDialogOpen({ type: null, data: null })
                  toast.success(`${photos.length} photos added`)
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ASSIGN INSTALLER DIALOG ===== */}
      <Dialog open={dialogOpen.type === 'assign_installer'} onOpenChange={(open) => !open && setDialogOpen({ type: null, data: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Assign Installer
            </DialogTitle>
            <DialogDescription>
              Select an installer for this installation job
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {installers.filter(i => i.isAvailable && i.status === 'active').length > 0 ? (
              installers.filter(i => i.isAvailable && i.status === 'active').map(installer => (
                <Card 
                  key={installer.id} 
                  className="cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => {
                    handleInstallationAction(dialogOpen.data.id, 'assign_installer', {
                      installerId: installer.id,
                      installerName: installer.name
                    })
                    setDialogOpen({ type: null, data: null })
                  }}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{installer.name}</p>
                      <p className="text-sm text-slate-500">
                        {installer.type === 'third_party' ? installer.companyName || 'Third Party' : 'In-House'}
                      </p>
                    </div>
                    <div className="text-right">
                      {installer.metrics?.averageRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{installer.metrics.averageRating}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">{installer.metrics?.completedJobs || 0} jobs</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No installers available</p>
                <Button variant="link" onClick={() => setDialogOpen({ type: 'add_installer', data: null })}>
                  Add an installer
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen({ type: null, data: null })}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DISPATCH DIALOG - Comprehensive Dispatch Workflow ===== */}
      <Dialog open={showDispatchDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDispatchDialog(false)
          setDispatchInvoice(null)
          setDispatchStep(1)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-600" />
              Dispatch Material - {dispatchInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Complete dispatch workflow for {dispatchInvoice?.customer?.name}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {[
              { step: 1, label: 'Customer Dues' },
              { step: 2, label: 'Driver Details' },
              { step: 3, label: 'Stock Check' },
              { step: 4, label: 'Confirm' }
            ].map((s, idx) => (
              <div key={s.step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  dispatchStep >= s.step 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {dispatchStep > s.step ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                </div>
                <span className={`ml-2 text-sm ${dispatchStep >= s.step ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {idx < 3 && <ChevronRight className="h-4 w-4 mx-2 text-slate-300" />}
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Step 1: Customer Dues Check */}
          {dispatchStep === 1 && (
            <div className="space-y-4">
              <Card className={customerDues?.totalDue > 0 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${customerDues?.totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                    Customer Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dispatchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-5 w-5 animate-spin text-slate-400 mr-2" />
                      <span className="text-slate-500">Checking customer dues...</span>
                    </div>
                  ) : customerDues ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total Outstanding:</span>
                        <span className={`text-xl font-bold ${customerDues.totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ₹{(customerDues.totalDue || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Pending Invoices:</span>
                        <Badge className={customerDues.pendingInvoicesCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                          {customerDues.pendingInvoicesCount || 0}
                        </Badge>
                      </div>
                      
                      {customerDues.pendingInvoices?.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-amber-700 mb-2">Outstanding Invoices:</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {customerDues.pendingInvoices.map(inv => (
                              <div key={inv.id} className={`flex justify-between items-center p-2 rounded ${inv.isOverdue ? 'bg-red-50' : 'bg-white'}`}>
                                <div>
                                  <span className="font-medium text-sm">{inv.invoiceNumber}</span>
                                  {inv.isOverdue && <Badge className="ml-2 text-xs bg-red-100 text-red-700">Overdue</Badge>}
                                </div>
                                <span className="font-medium text-amber-600">₹{inv.balanceAmount?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">Unable to fetch customer dues</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDispatchDialog(false)}>Cancel</Button>
                <Button onClick={() => setDispatchStep(2)} disabled={dispatchLoading}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Driver Details */}
          {dispatchStep === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    Driver & Vehicle Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Driver Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter driver name"
                        value={dispatchForm.driverName}
                        onChange={(e) => setDispatchForm(prev => ({ ...prev, driverName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Driver Phone</Label>
                      <PhoneInput
                        value={dispatchForm.driverPhone}
                        onChange={(value) => setDispatchForm(prev => ({ ...prev, driverPhone: value }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vehicle Number <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g., MH12AB1234"
                        value={dispatchForm.vehicleNumber}
                        onChange={(e) => setDispatchForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transporter Name</Label>
                      <Input
                        placeholder="Transport company name"
                        value={dispatchForm.transporterName}
                        onChange={(e) => setDispatchForm(prev => ({ ...prev, transporterName: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Dispatch Photo */}
                  <div className="space-y-2">
                    <Label>Dispatch Photo (at Loading)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        ref={dispatchPhotoRef}
                        onChange={handleDispatchPhotoUpload}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => dispatchPhotoRef.current?.click()}
                        className="w-full"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {dispatchForm.dispatchPhoto ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                    </div>
                    {dispatchForm.dispatchPhoto && (
                      <div className="mt-2 relative">
                        <img 
                          src={dispatchForm.dispatchPhoto} 
                          alt="Dispatch" 
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="absolute top-2 right-2"
                          onClick={() => setDispatchForm(prev => ({ ...prev, dispatchPhoto: null }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Any special instructions or notes..."
                      value={dispatchForm.notes}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setDispatchStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button 
                  onClick={checkDispatchStock} 
                  disabled={!dispatchForm.driverName || !dispatchForm.vehicleNumber || dispatchLoading}
                >
                  {dispatchLoading ? 'Checking...' : 'Check Stock'} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Stock Check */}
          {dispatchStep === 3 && (
            <div className="space-y-4">
              <Card className={stockCheck?.hasInsufficient ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Warehouse className={`h-4 w-4 ${stockCheck?.hasInsufficient ? 'text-red-600' : 'text-emerald-600'}`} />
                    Stock Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dispatchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-5 w-5 animate-spin text-slate-400 mr-2" />
                      <span className="text-slate-500">Checking stock...</span>
                    </div>
                  ) : stockCheck ? (
                    <div className="space-y-3">
                      {stockCheck.hasInsufficient && (
                        <div className="p-3 bg-red-100 rounded-lg mb-3">
                          <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Some items have insufficient stock. Only Admin can proceed.
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {stockCheck.items?.map((item, idx) => (
                          <div key={idx} className={`flex justify-between items-center p-2 rounded ${
                            item.stockStatus === 'insufficient' ? 'bg-red-50 border border-red-200' : 'bg-white border'
                          }`}>
                            <div>
                              <span className="font-medium text-sm">{item.productName}</span>
                              <p className="text-xs text-slate-500">
                                Required: {item.requestedQty} | Available: {item.availableQty}
                              </p>
                            </div>
                            <Badge className={item.stockStatus === 'insufficient' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                              {item.stockStatus === 'insufficient' ? `Short: ${item.shortfall}` : 'OK'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500">Unable to check stock</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setDispatchStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button 
                  onClick={() => setDispatchStep(4)} 
                  disabled={stockCheck?.hasInsufficient && !(user?.role === 'admin' || user?.role === 'super_admin')}
                >
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm & Create */}
          {dispatchStep === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Dispatch Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Invoice</p>
                      <p className="font-medium">{dispatchInvoice?.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="font-medium">{dispatchInvoice?.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Invoice Value</p>
                      <p className="font-bold text-emerald-600">₹{(dispatchInvoice?.grandTotal || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Items</p>
                      <p className="font-medium">{dispatchInvoice?.items?.length || 0} products</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Driver</p>
                      <p className="font-medium">{dispatchForm.driverName}</p>
                      {dispatchForm.driverPhone && <p className="text-sm text-slate-500">{dispatchForm.driverPhone}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Vehicle</p>
                      <p className="font-medium font-mono">{dispatchForm.vehicleNumber}</p>
                      {dispatchForm.transporterName && <p className="text-sm text-slate-500">{dispatchForm.transporterName}</p>}
                    </div>
                  </div>

                  {dispatchForm.dispatchPhoto && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Loading Photo</p>
                      <img 
                        src={dispatchForm.dispatchPhoto} 
                        alt="Dispatch" 
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    </div>
                  )}

                  {customerDues?.totalDue > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Customer has outstanding dues of <strong>₹{customerDues.totalDue.toLocaleString()}</strong>
                      </p>
                    </div>
                  )}

                  {stockCheck?.hasInsufficient && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Proceeding with insufficient stock (Admin Override)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-700">
                    <Info className="h-4 w-4 inline mr-1" />
                    A <strong>Delivery Challan</strong> and <strong>Dispatch Note</strong> will be generated automatically.
                    Stock will be deducted from inventory.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setDispatchStep(3)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button 
                  onClick={() => handleCreateDispatch(stockCheck?.hasInsufficient)} 
                  disabled={dispatchLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {dispatchLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 mr-2" />
                      Create Dispatch & Challan
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
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
            <PhoneInput
              label="Phone *"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              defaultCountry="IN"
              required
            />
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

// CRM Contact Dialog - for adding contacts directly to CRM from Project dialog
function CrmContactDialog({ open, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    billingAddress: '', city: '', state: '', pincode: '',
    type: 'customer'
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: '', email: '', phone: '', company: '',
        billingAddress: '', city: '', state: '', pincode: '',
        type: 'customer'
      })
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Customer Contact</DialogTitle>
          <DialogDescription>This contact will be added to CRM and available for project selection</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
            </div>
            <PhoneInput
              label="Phone *"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              defaultCountry="IN"
              required
            />
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
            <Input value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
            <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.phone}>
            {loading ? 'Saving...' : 'Add Contact & Return'}
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
    if (open && project) {
      // Find the matching customer contact to ensure customerId is valid
      const matchingContact = customerContacts.find(c => 
        c.id === project.customerId || 
        c.name === project.customerName ||
        c.displayName === project.customerName
      )
      
      setForm({
        ...project,
        customerId: matchingContact?.id || project.customerId || '',
        customerName: matchingContact?.displayName || matchingContact?.name || project.customerName || '',
        segment: project.segment || 'b2c',
        siteAddress: project.site?.address || project.siteAddress || '',
        siteCity: project.site?.city || project.siteCity || '',
        siteState: project.site?.state || project.siteState || '',
        sitePincode: project.site?.pincode || project.sitePincode || ''
      })
    } else if (open && !project) {
      setForm({
        name: '', customerId: '', customerName: '', type: 'residential', segment: 'b2c', flooringType: 'hardwood',
        siteAddress: '', siteCity: '', siteState: '', sitePincode: '', estimatedValue: 0, notes: ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAddContact(form)}>
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
/* Build timestamp: Fri Dec 19 18:00:56 UTC 2025 */
