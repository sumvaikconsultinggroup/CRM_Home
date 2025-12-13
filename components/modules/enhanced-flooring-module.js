'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Package, Ruler, FileText, Wrench, Warehouse, BarChart3,
  Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download, Upload,
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle2, Clock, XCircle,
  AlertTriangle, ArrowUpRight, Calculator, Home, Square, ChevronRight, ChevronLeft,
  MoreVertical, Copy, Send, Printer, Image, Camera, MapPin, Phone, Settings,
  Calendar, Building2, Layers, Grid3X3, Box, Truck, PieChart, Target, Award, Zap, 
  Star, X, FileSpreadsheet, MessageSquare, Bot, Sparkles, Receipt, CreditCard,
  ArrowLeftRight, Archive, Hourglass, Percent, UserPlus, Repeat, Briefcase,
  Hammer, Layers as LayersIcon, Trash2 as TrashIcon, GitCompare, UserCheck,
  ExternalLink, Mail, Share2, FileCheck, FilePlus, History, RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

// Lead Status Workflow
const FlooringLeadStatus = {
  new: { label: 'New Lead', color: 'bg-blue-100 text-blue-700', next: 'qualified' },
  qualified: { label: 'Qualified', color: 'bg-indigo-100 text-indigo-700', next: 'site_visit_scheduled' },
  site_visit_scheduled: { label: 'Site Visit Scheduled', color: 'bg-purple-100 text-purple-700', next: 'site_visit_done' },
  site_visit_done: { label: 'Site Visit Done', color: 'bg-violet-100 text-violet-700', next: 'measurement_complete' },
  measurement_complete: { label: 'Measurement Complete', color: 'bg-cyan-100 text-cyan-700', next: 'quote_draft' },
  quote_draft: { label: 'Quote Draft', color: 'bg-slate-100 text-slate-700', next: 'quote_sent' },
  quote_sent: { label: 'Quote Sent', color: 'bg-amber-100 text-amber-700', next: 'quote_approved' },
  quote_approved: { label: 'Quote Approved', color: 'bg-emerald-100 text-emerald-700', next: 'proposal_sent' },
  quote_revision: { label: 'Quote Revision', color: 'bg-yellow-100 text-yellow-700', next: 'quote_sent' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-teal-100 text-teal-700', next: 'proposal_approved' },
  proposal_approved: { label: 'Proposal Approved', color: 'bg-green-100 text-green-700', next: 'work_order_created' },
  work_order_created: { label: 'Work Order', color: 'bg-lime-100 text-lime-700', next: 'installation_scheduled' },
  installation_scheduled: { label: 'Installation Scheduled', color: 'bg-sky-100 text-sky-700', next: 'installation_in_progress' },
  installation_in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', next: 'installation_complete' },
  installation_complete: { label: 'Complete', color: 'bg-emerald-100 text-emerald-700', next: 'invoice_sent' },
  invoice_sent: { label: 'Invoice Sent', color: 'bg-amber-100 text-amber-700', next: 'payment_received' },
  payment_received: { label: 'Paid', color: 'bg-green-100 text-green-700', next: 'closed_won' },
  closed_won: { label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700', next: null },
  closed_lost: { label: 'Closed Lost', color: 'bg-red-100 text-red-700', next: null }
}

// Quote Templates
const QuoteTemplates = [
  { id: 'professional', name: 'Professional', description: 'Clean, modern design', color: '#2563eb', icon: FileText },
  { id: 'premium', name: 'Premium', description: 'Elegant with room breakdown', color: '#7c3aed', icon: Award },
  { id: 'luxury', name: 'Luxury', description: 'High-end with visualizations', color: '#b45309', icon: Star }
]

// Invoice Templates
const InvoiceTemplates = [
  { id: 'standard', name: 'Standard', description: 'GST compliant', color: '#059669', icon: Receipt },
  { id: 'detailed', name: 'Detailed', description: 'Full breakdown', color: '#0891b2', icon: FileSpreadsheet },
  { id: 'premium', name: 'Premium', description: 'With photos', color: '#7c2d12', icon: Star }
]

// Report Categories
const ReportCategories = {
  sales: { label: 'Sales Reports', icon: TrendingUp, color: 'text-emerald-600' },
  quotes: { label: 'Quote Reports', icon: FileText, color: 'text-blue-600' },
  inventory: { label: 'Inventory Reports', icon: Package, color: 'text-purple-600' },
  financial: { label: 'Financial Reports', icon: DollarSign, color: 'text-amber-600' },
  customers: { label: 'Customer Reports', icon: Users, color: 'text-indigo-600' },
  projects: { label: 'Project Reports', icon: Briefcase, color: 'text-cyan-600' },
  products: { label: 'Product Reports', icon: Layers, color: 'text-rose-600' }
}

// All Report Types
const AllReports = [
  // Sales
  { id: 'sales_summary', name: 'Sales Summary', category: 'sales', icon: BarChart3 },
  { id: 'sales_by_category', name: 'Sales by Category', category: 'sales', icon: PieChart },
  { id: 'sales_by_customer', name: 'Sales by Customer', category: 'sales', icon: Users },
  { id: 'sales_by_salesperson', name: 'Sales by Salesperson', category: 'sales', icon: UserCheck },
  { id: 'sales_trend', name: 'Sales Trend', category: 'sales', icon: TrendingUp },
  { id: 'daily_sales', name: 'Daily Sales', category: 'sales', icon: Calendar },
  // Quotes
  { id: 'quote_conversion', name: 'Quote Conversion Rate', category: 'quotes', icon: Target },
  { id: 'quote_aging', name: 'Quote Aging', category: 'quotes', icon: Clock },
  { id: 'quote_by_status', name: 'Quotes by Status', category: 'quotes', icon: FileText },
  { id: 'lost_quotes', name: 'Lost Quotes Analysis', category: 'quotes', icon: XCircle },
  { id: 'quote_comparison', name: 'Quote Comparison', category: 'quotes', icon: GitCompare },
  // Inventory
  { id: 'stock_level', name: 'Stock Level', category: 'inventory', icon: Package },
  { id: 'stock_movement', name: 'Stock Movement', category: 'inventory', icon: ArrowLeftRight },
  { id: 'low_stock', name: 'Low Stock Alert', category: 'inventory', icon: AlertTriangle },
  { id: 'dead_stock', name: 'Dead Stock', category: 'inventory', icon: Archive },
  { id: 'stock_valuation', name: 'Stock Valuation', category: 'inventory', icon: DollarSign },
  { id: 'inventory_turnover', name: 'Inventory Turnover', category: 'inventory', icon: RefreshCw },
  { id: 'stock_aging', name: 'Stock Aging', category: 'inventory', icon: Hourglass },
  { id: 'warehouse_summary', name: 'Warehouse Summary', category: 'inventory', icon: Warehouse },
  // Financial
  { id: 'revenue', name: 'Revenue Report', category: 'financial', icon: TrendingUp },
  { id: 'profit_margin', name: 'Profit Margin', category: 'financial', icon: Percent },
  { id: 'outstanding_payments', name: 'Outstanding Payments', category: 'financial', icon: CreditCard },
  { id: 'payment_collection', name: 'Payment Collection', category: 'financial', icon: DollarSign },
  { id: 'gst_tax', name: 'GST/Tax Report', category: 'financial', icon: Receipt },
  // Customer
  { id: 'customer_acquisition', name: 'Customer Acquisition', category: 'customers', icon: UserPlus },
  { id: 'customer_ltv', name: 'Customer Lifetime Value', category: 'customers', icon: Star },
  { id: 'customer_segmentation', name: 'Customer Segmentation', category: 'customers', icon: Users },
  { id: 'repeat_customers', name: 'Repeat Customers', category: 'customers', icon: Repeat },
  // Projects
  { id: 'project_status', name: 'Project Status', category: 'projects', icon: Briefcase },
  { id: 'installation_progress', name: 'Installation Progress', category: 'projects', icon: Hammer },
  { id: 'project_profitability', name: 'Project Profitability', category: 'projects', icon: TrendingUp },
  { id: 'resource_utilization', name: 'Resource Utilization', category: 'projects', icon: Users },
  // Products
  { id: 'best_sellers', name: 'Best Sellers', category: 'products', icon: Award },
  { id: 'product_performance', name: 'Product Performance', category: 'products', icon: BarChart3 },
  { id: 'category_analysis', name: 'Category Analysis', category: 'products', icon: Layers },
  { id: 'wastage_analysis', name: 'Wastage Analysis', category: 'products', icon: TrashIcon },
  { id: 'supplier_performance', name: 'Supplier Performance', category: 'products', icon: Truck }
]

// Lead Card Component
const LeadCard = ({ lead, onAction }) => {
  const status = FlooringLeadStatus[lead.flooringStatus || 'new']
  
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Card className="hover:shadow-lg transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-900">{lead.name}</h4>
              <p className="text-sm text-slate-500">{lead.company || lead.email}</p>
            </div>
            <Badge className={status?.color}>{status?.label}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.city || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-slate-400">
              {new Date(lead.createdAt).toLocaleDateString()}
            </span>
            <div className="flex gap-1">
              {status?.next && (
                <Button size="sm" variant="outline" onClick={() => onAction?.('advance', lead)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {lead.flooringStatus === 'measurement_complete' && (
                <Button size="sm" onClick={() => onAction?.('create_quote', lead)}>
                  <FileText className="h-4 w-4 mr-1" /> Quote
                </Button>
              )}
              {lead.flooringStatus === 'quote_approved' && (
                <Button size="sm" variant="secondary" onClick={() => onAction?.('create_proposal', lead)}>
                  <Send className="h-4 w-4 mr-1" /> Proposal
                </Button>
              )}
              {lead.flooringStatus === 'proposal_approved' && (
                <Button size="sm" variant="default" onClick={() => onAction?.('create_invoice', lead)}>
                  <Receipt className="h-4 w-4 mr-1" /> Invoice
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Quote Card Component with Templates
const QuoteCard = ({ quote, onAction }) => {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    revised: 'bg-amber-100 text-amber-700',
    converted_to_proposal: 'bg-teal-100 text-teal-700'
  }

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{quote.quoteNumber}</h4>
              {quote.version > 1 && (
                <Badge variant="outline" className="text-xs">v{quote.version}</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">{quote.customer?.name}</p>
          </div>
          <Badge className={statusColors[quote.status]}>{quote.status}</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 my-3 text-sm">
          <div className="text-slate-500">Area: {quote.totalArea?.toFixed(0)} sqft</div>
          <div className="text-slate-500">Rooms: {quote.rooms?.length || 0}</div>
        </div>

        <div className="flex items-center justify-between py-2 border-y mb-3">
          <span className="text-slate-500">Total</span>
          <span className="text-xl font-bold text-emerald-600">₹{quote.grandTotal?.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Valid: {new Date(quote.validUntil).toLocaleDateString()}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.('view', quote)}>
                <Eye className="h-4 w-4 mr-2" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('edit', quote)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {quote.status === 'draft' && (
                <DropdownMenuItem onClick={() => onAction?.('send', quote)}>
                  <Send className="h-4 w-4 mr-2" /> Send to Customer
                </DropdownMenuItem>
              )}
              {quote.status === 'sent' && (
                <DropdownMenuItem onClick={() => onAction?.('approve', quote)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Approved
                </DropdownMenuItem>
              )}
              {['sent', 'rejected'].includes(quote.status) && (
                <DropdownMenuItem onClick={() => onAction?.('revise', quote)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Create Revision
                </DropdownMenuItem>
              )}
              {quote.status === 'approved' && (
                <DropdownMenuItem onClick={() => onAction?.('convert', quote)}>
                  <FileCheck className="h-4 w-4 mr-2" /> Convert to Proposal
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.('download', quote)}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('whatsapp', quote)}>
                <Share2 className="h-4 w-4 mr-2" /> Share on WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// Report Card Component
const ReportCard = ({ report, onGenerate }) => {
  const category = ReportCategories[report.category]
  const Icon = report.icon
  
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
        onClick={() => onGenerate(report)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${category?.color} bg-opacity-10`}>
              <Icon className={`h-5 w-5 ${category?.color}`} />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">{report.name}</h4>
              <p className="text-xs text-slate-500">{category?.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Main Enhanced Flooring Module
export function EnhancedFlooringModule({ client, leads = [], projects = [], onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [inventory, setInventory] = useState({ inventory: [], summary: {}, byCategory: {} })
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false)
  const [showInventoryImport, setShowInventoryImport] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('professional')
  const [meeAIOpen, setMeeAIOpen] = useState(false)

  // Fetch data
  useEffect(() => {
    if (client?.id) {
      fetchDashboardData()
      fetchQuotes()
      fetchInventory()
    }
  }, [client?.id])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/flooring/dashboard?clientId=${client.id}`)
      const data = await res.json()
      if (!data.error) setDashboardData(data)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
  }

  const fetchQuotes = async () => {
    try {
      const res = await fetch(`/api/flooring/enhanced/quotes?clientId=${client.id}`)
      const data = await res.json()
      if (Array.isArray(data)) setQuotes(data)
    } catch (error) {
      console.error('Quotes fetch error:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      const res = await fetch(`/api/flooring/enhanced/inventory?clientId=${client.id}`)
      const data = await res.json()
      if (data.inventory) setInventory(data)
    } catch (error) {
      console.error('Inventory fetch error:', error)
    }
  }

  const generateReport = async (report) => {
    try {
      setLoading(true)
      setSelectedReport(report)
      const res = await fetch(`/api/flooring/enhanced/reports?clientId=${client.id}&type=${report.id}`)
      const data = await res.json()
      setReportData(data)
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleLeadAction = async (action, lead) => {
    switch (action) {
      case 'advance':
        const nextStatus = FlooringLeadStatus[lead.flooringStatus]?.next
        if (nextStatus) {
          toast.success(`Lead moved to ${FlooringLeadStatus[nextStatus].label}`)
        }
        break
      case 'create_quote':
        setSelectedLead(lead)
        setShowQuoteBuilder(true)
        break
      case 'create_proposal':
        toast.info('Converting to proposal...')
        break
      case 'create_invoice':
        toast.info('Creating invoice...')
        break
    }
  }

  const handleQuoteAction = async (action, quote) => {
    switch (action) {
      case 'send':
        try {
          await fetch('/api/flooring/enhanced/quotes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: quote.id, action: 'send' })
          })
          toast.success('Quote sent to customer!')
          fetchQuotes()
        } catch (error) {
          toast.error('Failed to send quote')
        }
        break
      case 'approve':
        try {
          await fetch('/api/flooring/enhanced/quotes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: quote.id, action: 'approve' })
          })
          toast.success('Quote approved!')
          fetchQuotes()
        } catch (error) {
          toast.error('Failed to approve quote')
        }
        break
      case 'revise':
        try {
          const res = await fetch('/api/flooring/enhanced/quotes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: quote.id, action: 'revise' })
          })
          const data = await res.json()
          toast.success(`Revision created: ${data.newQuoteId}`)
          fetchQuotes()
        } catch (error) {
          toast.error('Failed to create revision')
        }
        break
      case 'convert':
        try {
          await fetch('/api/flooring/enhanced/quotes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: quote.id, action: 'convert_to_proposal' })
          })
          toast.success('Converted to proposal!')
          fetchQuotes()
        } catch (error) {
          toast.error('Failed to convert')
        }
        break
      case 'whatsapp':
        const message = `Hi! Here's your flooring quote ${quote.quoteNumber} for ₹${quote.grandTotal?.toLocaleString()}. Valid until ${new Date(quote.validUntil).toLocaleDateString()}.`
        window.open(`https://wa.me/${quote.customer?.phone}?text=${encodeURIComponent(message)}`)
        break
      case 'download':
        toast.info('Generating PDF...')
        break
    }
  }

  const handleInventoryAction = async (action, data) => {
    try {
      setLoading(true)
      const res = await fetch('/api/flooring/enhanced/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, action, clientId: client.id })
      })
      const result = await res.json()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message || 'Inventory updated')
        fetchInventory()
      }
    } catch (error) {
      toast.error('Inventory operation failed')
    } finally {
      setLoading(false)
    }
  }

  // Flooring-specific leads (with flooring status)
  const flooringLeads = leads.filter(l => l.flooringStatus || l.source === 'flooring')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Wooden Flooring Module</h1>
                  <p className="text-sm text-slate-500">Enterprise Management System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setMeeAIOpen(true)}>
                <Bot className="h-4 w-4 mr-2" /> MEE AI
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm p-1 mb-6">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="leads" className="gap-2"><Users className="h-4 w-4" /> Leads</TabsTrigger>
            <TabsTrigger value="quotes" className="gap-2"><FileText className="h-4 w-4" /> Quotes</TabsTrigger>
            <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" /> Products</TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2"><Warehouse className="h-4 w-4" /> Inventory</TabsTrigger>
            <TabsTrigger value="installations" className="gap-2"><Wrench className="h-4 w-4" /> Installations</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><BarChart3 className="h-4 w-4" /> Reports</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Quotes</p>
                        <p className="text-3xl font-bold">{quotes.length}</p>
                      </div>
                      <FileText className="h-10 w-10 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm">Approved</p>
                        <p className="text-3xl font-bold">{quotes.filter(q => q.status === 'approved').length}</p>
                      </div>
                      <CheckCircle2 className="h-10 w-10 text-emerald-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 text-sm">Inventory Items</p>
                        <p className="text-3xl font-bold">{inventory.summary?.totalProducts || 0}</p>
                      </div>
                      <Package className="h-10 w-10 text-amber-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Stock Value</p>
                        <p className="text-2xl font-bold">₹{(inventory.summary?.totalValue || 0).toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button className="h-auto py-4 flex-col gap-2" onClick={() => setShowQuoteBuilder(true)}>
                      <FilePlus className="h-6 w-6" />
                      <span>New Quote</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('inventory')}>
                      <Download className="h-6 w-6" />
                      <span>Goods Receipt</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('reports')}>
                      <BarChart3 className="h-6 w-6" />
                      <span>Generate Report</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Calculator className="h-6 w-6" />
                      <span>Calculator</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock Alerts */}
              {inventory.summary?.lowStockCount > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      Low Stock Alerts ({inventory.summary.lowStockCount})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {inventory.inventory?.filter(i => i.availableQty <= (i.reorderLevel || 100)).slice(0, 5).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg">
                          <span className="font-medium">{item.product?.name || 'Unknown'}</span>
                          <Badge variant="destructive">{item.availableQty} left</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Lead Pipeline</h2>
                <div className="flex gap-2">
                  <Input placeholder="Search leads..." className="w-64" />
                  <Button variant="outline"><Filter className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(FlooringLeadStatus).slice(0, 8).map(([key, status]) => (
                  <Badge key={key} variant="outline" className={`cursor-pointer ${status.color}`}>
                    {status.label}
                  </Badge>
                ))}
              </div>

              {/* Lead Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(flooringLeads.length > 0 ? flooringLeads : leads.slice(0, 9)).map((lead, i) => (
                  <LeadCard 
                    key={lead.id || i} 
                    lead={{ ...lead, flooringStatus: lead.flooringStatus || 'new' }}
                    onAction={handleLeadAction}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Quotations</h2>
                  <p className="text-sm text-slate-500">Manage quotes, revisions & proposals</p>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {QuoteTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowQuoteBuilder(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Quote
                  </Button>
                </div>
              </div>

              {/* Quote Templates Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quote Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {QuoteTemplates.map(template => (
                      <div 
                        key={template.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${template.color}20` }}>
                            <template.icon className="h-5 w-5" style={{ color: template.color }} />
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-slate-500">{template.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quotes Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotes.map(quote => (
                  <QuoteCard key={quote.id} quote={quote} onAction={handleQuoteAction} />
                ))}
              </div>

              {quotes.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No quotes yet</h3>
                  <p className="text-slate-500 mb-4">Create your first quote to get started</p>
                  <Button onClick={() => setShowQuoteBuilder(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Quote
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Inventory Management</h2>
                  <p className="text-sm text-slate-500">SAP-level stock control</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowInventoryImport(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Import
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Goods Receipt
                  </Button>
                </div>
              </div>

              {/* Inventory Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{inventory.summary?.totalProducts || 0}</p>
                    <p className="text-sm text-slate-500">Total Items</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">₹{(inventory.summary?.totalValue || 0).toLocaleString()}</p>
                    <p className="text-sm text-slate-500">Stock Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{inventory.summary?.lowStockCount || 0}</p>
                    <p className="text-sm text-slate-500">Low Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{inventory.summary?.outOfStockCount || 0}</p>
                    <p className="text-sm text-slate-500">Out of Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{inventory.summary?.warehouses || 1}</p>
                    <p className="text-sm text-slate-500">Warehouses</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => handleInventoryAction('goods_receipt', {})}>
                  <Download className="h-5 w-5 text-green-600" />
                  <span>Goods Receipt</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                  <Upload className="h-5 w-5 text-red-600" />
                  <span>Goods Issue</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                  <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                  <span>Stock Transfer</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                  <RefreshCw className="h-5 w-5 text-amber-600" />
                  <span>Stock Adjustment</span>
                </Button>
              </div>

              {/* Inventory Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Stock List</CardTitle>
                    <Input placeholder="Search products..." className="w-64" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Product</th>
                          <th className="text-left p-2">SKU</th>
                          <th className="text-left p-2">Category</th>
                          <th className="text-right p-2">Quantity</th>
                          <th className="text-right p-2">Available</th>
                          <th className="text-right p-2">Reorder Level</th>
                          <th className="text-center p-2">Status</th>
                          <th className="text-right p-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.inventory?.slice(0, 10).map((item, i) => (
                          <tr key={i} className="border-b hover:bg-slate-50">
                            <td className="p-2 font-medium">{item.product?.name || 'Unknown'}</td>
                            <td className="p-2 text-slate-500">{item.product?.sku}</td>
                            <td className="p-2">{item.product?.category}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{item.availableQty}</td>
                            <td className="p-2 text-right">{item.reorderLevel}</td>
                            <td className="p-2 text-center">
                              <Badge className={
                                item.availableQty <= 0 ? 'bg-red-100 text-red-700' :
                                item.availableQty <= item.reorderLevel ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }>
                                {item.availableQty <= 0 ? 'Out' : item.availableQty <= item.reorderLevel ? 'Low' : 'OK'}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">₹{((item.quantity || 0) * (item.avgCostPrice || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Reports & Analytics</h2>
                  <p className="text-sm text-slate-500">20+ comprehensive reports</p>
                </div>
              </div>

              {/* Report Categories */}
              {Object.entries(ReportCategories).map(([catKey, category]) => (
                <div key={catKey}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <category.icon className={`h-4 w-4 ${category.color}`} />
                    {category.label}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {AllReports.filter(r => r.category === catKey).map(report => (
                      <ReportCard key={report.id} report={report} onGenerate={generateReport} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Other tabs placeholders */}
          <TabsContent value="products">
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Product Catalog</h3>
              <p className="text-slate-500">Manage flooring products</p>
            </div>
          </TabsContent>

          <TabsContent value="installations">
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Installation Management</h3>
              <p className="text-slate-500">Track and manage installations</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Viewer Dialog */}
      <Dialog open={!!reportData} onOpenChange={() => setReportData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {reportData?.reportName}
            </DialogTitle>
            <DialogDescription>
              Generated at {reportData?.generatedAt ? new Date(reportData.generatedAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(reportData?.data, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.info('Exporting to CSV...')}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => toast.info('Exporting to PDF...')}>
              <FileText className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MEE AI Dialog */}
      <Dialog open={meeAIOpen} onOpenChange={setMeeAIOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600" />
              MEE AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 text-center">
              <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI-Powered Flooring Assistant</h3>
              <p className="text-slate-600 mb-4">
                Get recommendations for materials, pricing suggestions, and inventory predictions.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button variant="outline" size="sm">Quote Recommendations</Button>
                <Button variant="outline" size="sm">Material Suggestions</Button>
                <Button variant="outline" size="sm">Inventory Predictions</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Import Dialog */}
      <Dialog open={showInventoryImport} onOpenChange={setShowInventoryImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Inventory</DialogTitle>
            <DialogDescription>Upload CSV or Excel file to bulk import inventory</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Drag & drop your file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Supports CSV, XLSX</p>
            </div>
            <div>
              <Button variant="link" className="text-sm p-0">
                <Download className="h-4 w-4 mr-1" /> Download Template
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInventoryImport(false)}>Cancel</Button>
            <Button>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnhancedFlooringModule
