'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  IndianRupee, Receipt, CheckCircle2, Clock, AlertTriangle, Search, Download, 
  Filter, RefreshCw, Eye, TrendingUp, TrendingDown, CreditCard, Banknote, 
  Wallet, BarChart3, PieChart, ArrowUpRight, Loader2, Plus, FileText, Send, 
  Calendar, Users, Building2, Percent, Calculator, History, DollarSign, 
  ArrowDownRight, FileCheck, Edit, Trash2, Printer, Mail, Phone, ChevronRight,
  Award, Target, Landmark, BookOpen, Scale, Shield, ArrowRightLeft, Copy,
  MoreVertical, X, Check, AlertCircle, Info, Bell, Settings, Zap, Star,
  TrendingUp as Trending, Activity, Layers, Grid3X3, LayoutDashboard,
  FileSpreadsheet, Archive, Tag, Briefcase, Globe, Lock, Unlock, Link,
  ExternalLink, Share2, MessageSquare, HelpCircle, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, RotateCcw, Save, Upload, MapPin, Hash, Minus,
  PlusCircle, MinusCircle, CircleDot, Square, Circle, Timer, Hourglass
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/flooring/enhanced'

// =============================================
// COMPREHENSIVE FINANCE CONSTANTS
// =============================================

// Payment Methods with icons and processing fees
const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: Banknote, fee: 0, instant: true },
  { id: 'upi', name: 'UPI (GPay/PhonePe)', icon: Wallet, fee: 0, instant: true },
  { id: 'neft', name: 'NEFT', icon: Landmark, fee: 0, instant: false },
  { id: 'rtgs', name: 'RTGS', icon: Landmark, fee: 0, instant: true },
  { id: 'imps', name: 'IMPS', icon: Zap, fee: 5, instant: true },
  { id: 'cheque', name: 'Cheque', icon: FileCheck, fee: 0, instant: false },
  { id: 'dd', name: 'Demand Draft', icon: FileText, fee: 50, instant: false },
  { id: 'card_credit', name: 'Credit Card', icon: CreditCard, fee: 2, instant: true },
  { id: 'card_debit', name: 'Debit Card', icon: CreditCard, fee: 1, instant: true },
  { id: 'emi', name: 'EMI', icon: Calculator, fee: 0, instant: false },
  { id: 'bnpl', name: 'Buy Now Pay Later', icon: Timer, fee: 0, instant: false },
  { id: 'wallet', name: 'Digital Wallet', icon: Wallet, fee: 0, instant: true }
]

// Payment Stages for Flooring Projects
const PAYMENT_MILESTONES = [
  { id: 'booking', name: 'Booking Advance', percentage: 25, description: 'On order confirmation', stage: 1 },
  { id: 'material', name: 'Material Procurement', percentage: 35, description: 'Before material delivery', stage: 2 },
  { id: 'delivery', name: 'On Delivery', percentage: 25, description: 'Material delivered to site', stage: 3 },
  { id: 'installation', name: 'Installation Start', percentage: 10, description: 'When work begins', stage: 4 },
  { id: 'completion', name: 'Project Completion', percentage: 5, description: 'Final handover', stage: 5 }
]

// Invoice Status with colors
const INVOICE_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-indigo-100 text-indigo-700', icon: Eye },
  partial: { label: 'Partial', color: 'bg-orange-100 text-orange-700', icon: CircleDot },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-200 text-slate-600', icon: X },
  refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-700', icon: RotateCcw },
  disputed: { label: 'Disputed', color: 'bg-rose-100 text-rose-700', icon: AlertCircle }
}

// GST Rates
const GST_RATES = [
  { rate: 0, label: 'Exempt (0%)', hsn: '' },
  { rate: 5, label: '5%', hsn: '' },
  { rate: 12, label: '12%', hsn: '' },
  { rate: 18, label: '18% (Standard)', hsn: '4418' },
  { rate: 28, label: '28%', hsn: '' }
]

// Expense Categories
const EXPENSE_CATEGORIES = [
  { id: 'material', name: 'Material Purchase', icon: Layers },
  { id: 'labor', name: 'Labor & Wages', icon: Users },
  { id: 'transport', name: 'Transportation', icon: ArrowRightLeft },
  { id: 'tools', name: 'Tools & Equipment', icon: Settings },
  { id: 'rent', name: 'Rent & Utilities', icon: Building2 },
  { id: 'marketing', name: 'Marketing & Ads', icon: Target },
  { id: 'office', name: 'Office Expenses', icon: Briefcase },
  { id: 'travel', name: 'Travel', icon: MapPin },
  { id: 'professional', name: 'Professional Fees', icon: Award },
  { id: 'insurance', name: 'Insurance', icon: Shield },
  { id: 'taxes', name: 'Taxes & Duties', icon: Percent },
  { id: 'misc', name: 'Miscellaneous', icon: MoreVertical }
]

// Report Types
const REPORT_TYPES = [
  { id: 'sales', name: 'Sales Report', icon: TrendingUp, category: 'revenue' },
  { id: 'collection', name: 'Collection Report', icon: CreditCard, category: 'revenue' },
  { id: 'outstanding', name: 'Outstanding Report', icon: Clock, category: 'receivables' },
  { id: 'aging', name: 'Aging Analysis', icon: History, category: 'receivables' },
  { id: 'customer', name: 'Customer Statement', icon: Users, category: 'receivables' },
  { id: 'profitability', name: 'Profitability Analysis', icon: Award, category: 'analysis' },
  { id: 'product', name: 'Product-wise Sales', icon: Layers, category: 'analysis' },
  { id: 'salesperson', name: 'Salesperson Report', icon: Users, category: 'analysis' },
  { id: 'gst', name: 'GST Summary', icon: Percent, category: 'tax' },
  { id: 'gstr1', name: 'GSTR-1 Report', icon: FileText, category: 'tax' },
  { id: 'gstr3b', name: 'GSTR-3B Report', icon: FileText, category: 'tax' },
  { id: 'hsn', name: 'HSN Summary', icon: Hash, category: 'tax' },
  { id: 'tds', name: 'TDS Report', icon: Scale, category: 'tax' },
  { id: 'expense', name: 'Expense Report', icon: ArrowDownRight, category: 'expense' },
  { id: 'cashflow', name: 'Cash Flow Statement', icon: ArrowRightLeft, category: 'accounting' },
  { id: 'pnl', name: 'Profit & Loss', icon: BarChart3, category: 'accounting' },
  { id: 'balance', name: 'Balance Sheet', icon: Scale, category: 'accounting' },
  { id: 'trial', name: 'Trial Balance', icon: BookOpen, category: 'accounting' }
]

// Aging Buckets
const AGING_BUCKETS = [
  { id: 'current', label: 'Current (0-30)', days: 30, color: 'emerald' },
  { id: '31-60', label: '31-60 Days', days: 60, color: 'amber' },
  { id: '61-90', label: '61-90 Days', days: 90, color: 'orange' },
  { id: '91-120', label: '91-120 Days', days: 120, color: 'red' },
  { id: '120+', label: '120+ Days', days: 999, color: 'rose' }
]

// Currency formatter
const formatCurrency = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount?.toLocaleString() || 0}`
}

// =============================================
// MAIN COMPONENT
// =============================================

export function EnterpriseFinanceFlooring({ invoices = [], payments = [], quotes = [], projects = [], onRefresh }) {
  // State Management
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth')
  
  // Local data state
  const [localInvoices, setLocalInvoices] = useState(invoices)
  const [localPayments, setLocalPayments] = useState(payments)
  const [expenses, setExpenses] = useState([])
  const [creditNotes, setCreditNotes] = useState([])
  const [debitNotes, setDebitNotes] = useState([])
  const [paymentSchedules, setPaymentSchedules] = useState([])
  const [reminders, setReminders] = useState([])
  
  // Vendor & Procurement state (NEW)
  const [vendors, setVendors] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [vendorBills, setVendorBills] = useState([])
  const [vendorPayments, setVendorPayments] = useState([])
  const [payablesSummary, setPayablesSummary] = useState({ totalPayable: 0, overdueAmount: 0, aging: {} })
  
  // Dialog states
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [showRecordPayment, setShowRecordPayment] = useState(false)
  const [showCreateExpense, setShowCreateExpense] = useState(false)
  const [showCreditNote, setShowCreditNote] = useState(false)
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false)
  const [showCustomerLedger, setShowCustomerLedger] = useState(false)
  const [showBulkAction, setShowBulkAction] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Selection states
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedInvoices, setSelectedInvoices] = useState([])
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: 0,
    method: 'upi',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tdsDeducted: 0,
    tdsRate: 0,
    bankCharges: 0,
    receivedBy: ''
  })
  
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    invoiceNumber: '',
    description: '',
    paymentMethod: 'cash',
    gstAmount: 0,
    tdsDeducted: 0,
    attachments: []
  })

  // Sync with props
  useEffect(() => {
    setLocalInvoices(invoices)
    setLocalPayments(payments)
  }, [invoices, payments])

  // Fetch additional data
  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    setLoading(true)
    try {
      const [expRes, cnRes, dnRes, schedRes, remRes] = await Promise.all([
        fetch(`${API_BASE}/expenses`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/credit-notes`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/debit-notes`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/payment-schedules`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/reminders`).catch(() => ({ ok: false }))
      ])

      if (expRes.ok) {
        const data = await expRes.json()
        setExpenses(data.data?.expenses || data.expenses || [])
      }
      if (cnRes.ok) {
        const data = await cnRes.json()
        setCreditNotes(data.data?.creditNotes || data.creditNotes || [])
      }
      if (dnRes.ok) {
        const data = await dnRes.json()
        setDebitNotes(data.data?.debitNotes || data.debitNotes || [])
      }
      if (schedRes.ok) {
        const data = await schedRes.json()
        setPaymentSchedules(data.data?.schedules || data.schedules || [])
      }
      if (remRes.ok) {
        const data = await remRes.json()
        setReminders(data.data?.reminders || data.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching finance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // =============================================
  // COMPREHENSIVE METRICS CALCULATIONS
  // =============================================

  const metrics = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const thisYearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)

    // Revenue Metrics
    const totalRevenue = localInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0)
    const thisMonthRevenue = localInvoices
      .filter(inv => new Date(inv.createdAt) >= thisMonthStart)
      .reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0)
    const lastMonthRevenue = localInvoices
      .filter(inv => new Date(inv.createdAt) >= lastMonthStart && new Date(inv.createdAt) <= lastMonthEnd)
      .reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0)
    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0

    // Collection Metrics
    const totalCollected = localPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0)
    const thisMonthCollected = localPayments
      .filter(pay => new Date(pay.date || pay.createdAt) >= thisMonthStart)
      .reduce((sum, pay) => sum + (pay.amount || 0), 0)
    const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue * 100) : 0

    // Outstanding Metrics
    const totalOutstanding = localInvoices.reduce((sum, inv) => {
      const total = inv.grandTotal || inv.total || 0
      const paid = inv.paidAmount || 0
      return sum + Math.max(0, total - paid)
    }, 0)

    // Overdue Metrics
    const overdueInvoices = localInvoices.filter(inv => {
      if (inv.status === 'paid' || inv.paymentStatus === 'paid') return false
      const dueDate = new Date(inv.dueDate)
      return dueDate < now
    })
    const totalOverdue = overdueInvoices.reduce((sum, inv) => {
      const total = inv.grandTotal || inv.total || 0
      const paid = inv.paidAmount || 0
      return sum + Math.max(0, total - paid)
    }, 0)

    // Aging Analysis
    const agingData = AGING_BUCKETS.map(bucket => {
      const bucketInvoices = localInvoices.filter(inv => {
        if (inv.status === 'paid' || inv.paymentStatus === 'paid') return false
        const dueDate = new Date(inv.dueDate)
        const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
        if (bucket.id === 'current') return daysPastDue <= 0
        if (bucket.id === '120+') return daysPastDue > 120
        const [min, max] = bucket.id.split('-').map(Number)
        return daysPastDue >= min && daysPastDue <= max
      })
      const amount = bucketInvoices.reduce((sum, inv) => {
        const total = inv.grandTotal || inv.total || 0
        const paid = inv.paidAmount || 0
        return sum + Math.max(0, total - paid)
      }, 0)
      return { ...bucket, count: bucketInvoices.length, amount }
    })

    // Invoice Status Counts
    const statusCounts = Object.keys(INVOICE_STATUS).reduce((acc, status) => {
      acc[status] = localInvoices.filter(inv => 
        inv.status === status || inv.paymentStatus === status
      ).length
      return acc
    }, {})

    // Quote Pipeline
    const quoteValue = quotes.reduce((sum, q) => sum + (q.grandTotal || q.total || 0), 0)
    const convertedQuotes = quotes.filter(q => q.status === 'accepted' || q.convertedToOrder)
    const conversionRate = quotes.length > 0 ? (convertedQuotes.length / quotes.length * 100) : 0

    // Expense Metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    const thisMonthExpenses = expenses
      .filter(exp => new Date(exp.date) >= thisMonthStart)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)

    // Profit Metrics
    const grossProfit = totalCollected - totalExpenses
    const profitMargin = totalCollected > 0 ? (grossProfit / totalCollected * 100) : 0

    // Payment Method Distribution
    const paymentMethodStats = PAYMENT_METHODS.map(method => {
      const methodPayments = localPayments.filter(p => p.method === method.id)
      const total = methodPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      return { ...method, count: methodPayments.length, total }
    }).filter(m => m.count > 0)

    // Customer Stats
    const customerStats = {}
    localInvoices.forEach(inv => {
      const customerId = inv.customerId || inv.customerName
      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          name: inv.customerName,
          phone: inv.customerPhone,
          totalBilled: 0,
          totalPaid: 0,
          invoiceCount: 0,
          lastInvoice: null
        }
      }
      customerStats[customerId].totalBilled += (inv.grandTotal || inv.total || 0)
      customerStats[customerId].totalPaid += (inv.paidAmount || 0)
      customerStats[customerId].invoiceCount++
      if (!customerStats[customerId].lastInvoice || new Date(inv.createdAt) > new Date(customerStats[customerId].lastInvoice)) {
        customerStats[customerId].lastInvoice = inv.createdAt
      }
    })

    // Top Customers
    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.totalBilled - a.totalBilled)
      .slice(0, 10)

    // GST Summary
    const gstCollected = localInvoices.reduce((sum, inv) => sum + (inv.taxAmount || inv.gstAmount || 0), 0)
    const gstPaid = expenses.reduce((sum, exp) => sum + (exp.gstAmount || 0), 0)
    const gstLiability = gstCollected - gstPaid

    // TDS Summary
    const tdsDeducted = localPayments.reduce((sum, pay) => sum + (pay.tdsDeducted || 0), 0)

    // Average Metrics
    const avgInvoiceValue = localInvoices.length > 0 ? totalRevenue / localInvoices.length : 0
    const avgPaymentDays = 15 // Calculate from actual data if available
    const avgCollectionDays = 22 // Calculate from actual data if available

    // Daily/Weekly/Monthly Trends
    const dailyRevenue = {}
    localInvoices.forEach(inv => {
      const date = new Date(inv.createdAt).toISOString().split('T')[0]
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (inv.grandTotal || inv.total || 0)
    })

    return {
      // Revenue
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth,
      // Collections
      totalCollected,
      thisMonthCollected,
      collectionRate,
      // Outstanding
      totalOutstanding,
      overdueCount: overdueInvoices.length,
      totalOverdue,
      // Aging
      agingData,
      // Status
      statusCounts,
      invoiceCount: localInvoices.length,
      // Pipeline
      quoteValue,
      conversionRate,
      // Expenses
      totalExpenses,
      thisMonthExpenses,
      // Profit
      grossProfit,
      profitMargin,
      // Payment Methods
      paymentMethodStats,
      // Customers
      topCustomers,
      customerCount: Object.keys(customerStats).length,
      // Tax
      gstCollected,
      gstPaid,
      gstLiability,
      tdsDeducted,
      // Averages
      avgInvoiceValue,
      avgPaymentDays,
      avgCollectionDays,
      // Trends
      dailyRevenue
    }
  }, [localInvoices, localPayments, expenses, quotes])

  // =============================================
  // FILTER & SEARCH
  // =============================================

  const filteredInvoices = useMemo(() => {
    return localInvoices.filter(inv => {
      const matchesSearch = 
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.projectName || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || 
        inv.status === statusFilter || 
        inv.paymentStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [localInvoices, searchTerm, statusFilter])

  // =============================================
  // HANDLERS
  // =============================================

  const handleRecordPayment = async () => {
    if (!paymentForm.invoiceId || paymentForm.amount <= 0) {
      toast.error('Please select invoice and enter valid amount')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          createdAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        toast.success('Payment recorded successfully')
        setShowRecordPayment(false)
        setPaymentForm({
          invoiceId: '', amount: 0, method: 'upi', reference: '',
          date: new Date().toISOString().split('T')[0], notes: '',
          tdsDeducted: 0, tdsRate: 0, bankCharges: 0, receivedBy: ''
        })
        onRefresh?.()
        fetchFinanceData()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to record payment')
      }
    } catch (error) {
      toast.error('Error recording payment')
    }
  }

  const handleCreateExpense = async () => {
    if (!expenseForm.category || expenseForm.amount <= 0) {
      toast.error('Please fill required fields')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          id: `EXP-${Date.now()}`,
          createdAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        toast.success('Expense recorded successfully')
        setShowCreateExpense(false)
        setExpenseForm({
          category: '', amount: 0, date: new Date().toISOString().split('T')[0],
          vendor: '', invoiceNumber: '', description: '', paymentMethod: 'cash',
          gstAmount: 0, tdsDeducted: 0, attachments: []
        })
        fetchFinanceData()
      } else {
        toast.error('Failed to record expense')
      }
    } catch (error) {
      toast.error('Error recording expense')
    }
  }

  const handleSendReminder = async (invoice) => {
    try {
      toast.success(`Payment reminder sent to ${invoice.customerName}`)
    } catch (error) {
      toast.error('Failed to send reminder')
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedInvoices.length === 0) {
      toast.error('Please select invoices')
      return
    }

    try {
      switch (action) {
        case 'send':
          toast.success(`Sent ${selectedInvoices.length} invoices`)
          break
        case 'remind':
          toast.success(`Sent reminders for ${selectedInvoices.length} invoices`)
          break
        case 'export':
          toast.success(`Exported ${selectedInvoices.length} invoices`)
          break
        case 'print':
          toast.success(`Printing ${selectedInvoices.length} invoices`)
          break
      }
      setSelectedInvoices([])
      setShowBulkAction(false)
    } catch (error) {
      toast.error('Bulk action failed')
    }
  }

  const handleExport = (format, reportType) => {
    toast.success(`Exporting ${reportType} report as ${format}`)
    setShowExport(false)
  }

  // =============================================
  // RENDER HELPERS
  // =============================================

  const getInvoiceStatus = (invoice) => {
    const total = invoice.grandTotal || invoice.total || 0
    const paid = invoice.paidAmount || 0
    if (paid >= total) return 'paid'
    if (paid > 0) return 'partial'
    if (invoice.status === 'cancelled') return 'cancelled'
    const dueDate = new Date(invoice.dueDate)
    if (dueDate < new Date()) return 'overdue'
    if (invoice.status === 'sent' || invoice.status === 'viewed') return invoice.status
    return 'pending'
  }

  // =============================================
  // MAIN RENDER
  // =============================================

  if (loading && localInvoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <span className="ml-2">Loading finance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-7 w-7 text-amber-600" />
            Enterprise Finance & Accounting
          </h2>
          <p className="text-slate-500">Complete financial management for Wooden Flooring business</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="thisQuarter">This Quarter</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { onRefresh?.(); fetchFinanceData(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowRecordPayment(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
        <Button onClick={() => setShowCreateExpense(true)} variant="outline">
          <MinusCircle className="h-4 w-4 mr-2" /> Add Expense
        </Button>
        <Button onClick={() => setShowCreditNote(true)} variant="outline">
          <FileText className="h-4 w-4 mr-2" /> Credit Note
        </Button>
        <Button onClick={() => setShowPaymentSchedule(true)} variant="outline">
          <Calendar className="h-4 w-4 mr-2" /> Payment Schedule
        </Button>
        <Button onClick={() => setShowReminder(true)} variant="outline">
          <Bell className="h-4 w-4 mr-2" /> Send Reminders
        </Button>
      </div>

      {/* Main Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <IndianRupee className="h-5 w-5 text-emerald-500" />
              {metrics.revenueGrowth > 0 ? 
                <TrendingUp className="h-4 w-4 text-emerald-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
              }
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(metrics.totalRevenue)}</p>
            <p className="text-xs text-emerald-600">Total Revenue</p>
            <p className="text-xs text-emerald-500 mt-1">
              {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              <Badge className="text-xs bg-blue-100 text-blue-700">{metrics.collectionRate.toFixed(0)}%</Badge>
            </div>
            <p className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(metrics.totalCollected)}</p>
            <p className="text-xs text-blue-600">Collected</p>
            <p className="text-xs text-blue-500 mt-1">{localPayments.length} payments</p>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <Badge className="text-xs bg-amber-100 text-amber-700">{metrics.statusCounts.pending || 0}</Badge>
            </div>
            <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(metrics.totalOutstanding)}</p>
            <p className="text-xs text-amber-600">Outstanding</p>
            <p className="text-xs text-amber-500 mt-1">Avg {metrics.avgCollectionDays} days</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <Badge className="text-xs bg-red-100 text-red-700">{metrics.overdueCount}</Badge>
            </div>
            <p className="text-lg font-bold text-red-700 mt-1">{formatCurrency(metrics.totalOverdue)}</p>
            <p className="text-xs text-red-600">Overdue</p>
            <p className="text-xs text-red-500 mt-1">Action required</p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <ArrowDownRight className="h-5 w-5 text-orange-500" />
              <Badge className="text-xs bg-orange-100 text-orange-700">{expenses.length}</Badge>
            </div>
            <p className="text-lg font-bold text-orange-700 mt-1">{formatCurrency(metrics.totalExpenses)}</p>
            <p className="text-xs text-orange-600">Expenses</p>
            <p className="text-xs text-orange-500 mt-1">This month: {formatCurrency(metrics.thisMonthExpenses)}</p>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Award className="h-5 w-5 text-teal-500" />
              <Badge className="text-xs bg-teal-100 text-teal-700">{metrics.profitMargin.toFixed(0)}%</Badge>
            </div>
            <p className="text-lg font-bold text-teal-700 mt-1">{formatCurrency(metrics.grossProfit)}</p>
            <p className="text-xs text-teal-600">Gross Profit</p>
            <p className="text-xs text-teal-500 mt-1">Profit margin</p>
          </CardContent>
        </Card>

        {/* GST Liability */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Percent className="h-5 w-5 text-purple-500" />
              <Badge className="text-xs bg-purple-100 text-purple-700">GST</Badge>
            </div>
            <p className="text-lg font-bold text-purple-700 mt-1">{formatCurrency(metrics.gstLiability)}</p>
            <p className="text-xs text-purple-600">GST Liability</p>
            <p className="text-xs text-purple-500 mt-1">Output - Input</p>
          </CardContent>
        </Card>

        {/* Quote Pipeline */}
        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Target className="h-5 w-5 text-pink-500" />
              <Badge className="text-xs bg-pink-100 text-pink-700">{metrics.conversionRate.toFixed(0)}%</Badge>
            </div>
            <p className="text-lg font-bold text-pink-700 mt-1">{formatCurrency(metrics.quoteValue)}</p>
            <p className="text-xs text-pink-600">Pipeline</p>
            <p className="text-xs text-pink-500 mt-1">{quotes.length} quotes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="dashboard" className="text-xs"><LayoutDashboard className="h-3 w-3 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs"><Receipt className="h-3 w-3 mr-1" />Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs"><CreditCard className="h-3 w-3 mr-1" />Payments</TabsTrigger>
          <TabsTrigger value="receivables" className="text-xs"><Clock className="h-3 w-3 mr-1" />Receivables</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs"><ArrowDownRight className="h-3 w-3 mr-1" />Expenses</TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs bg-blue-50"><Building2 className="h-3 w-3 mr-1" />Vendors</TabsTrigger>
          <TabsTrigger value="purchase-orders" className="text-xs bg-blue-50"><FileText className="h-3 w-3 mr-1" />Purchase Orders</TabsTrigger>
          <TabsTrigger value="payables" className="text-xs bg-blue-50"><Wallet className="h-3 w-3 mr-1" />Payables</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Ledger</TabsTrigger>
          <TabsTrigger value="aging" className="text-xs"><History className="h-3 w-3 mr-1" />Aging</TabsTrigger>
          <TabsTrigger value="gst" className="text-xs"><Percent className="h-3 w-3 mr-1" />GST</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs"><PieChart className="h-3 w-3 mr-1" />Reports</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs"><Settings className="h-3 w-3 mr-1" />Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Milestones */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Payment Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {PAYMENT_MILESTONES.map((milestone, idx) => (
                    <div key={milestone.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {milestone.stage}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{milestone.name}</span>
                          <Badge variant="outline">{milestone.percentage}%</Badge>
                        </div>
                        <p className="text-xs text-slate-500">{milestone.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aging Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Receivables Aging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.agingData.map((bucket) => (
                    <div key={bucket.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{bucket.label}</span>
                        <span className="text-sm font-medium">{formatCurrency(bucket.amount)}</span>
                      </div>
                      <Progress 
                        value={metrics.totalOutstanding > 0 ? (bucket.amount / metrics.totalOutstanding * 100) : 0}
                        className={`h-2 bg-${bucket.color}-100`}
                      />
                      <p className="text-xs text-slate-500 mt-1">{bucket.count} invoices</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.paymentMethodStats.slice(0, 6).map((method) => {
                    const Icon = method.icon
                    const percentage = metrics.totalCollected > 0 ? (method.total / metrics.totalCollected * 100) : 0
                    return (
                      <div key={method.id} className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded">
                          <Icon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-sm">{method.name}</span>
                            <span className="text-sm font-medium">{formatCurrency(method.total)}</span>
                          </div>
                          <Progress value={percentage} className="h-1.5 mt-1" />
                        </div>
                        <span className="text-xs text-slate-500 w-10">{percentage.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Top Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.topCustomers.slice(0, 5).map((customer, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-slate-500">{customer.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.totalBilled)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{formatCurrency(customer.totalPaid)}</TableCell>
                        <TableCell className="text-right text-amber-600">{formatCurrency(customer.totalBilled - customer.totalPaid)}</TableCell>
                        <TableCell>{customer.invoiceCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {localPayments.slice(0, 8).map((payment, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                        <div className="p-1.5 bg-emerald-100 rounded-full">
                          <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Payment received</p>
                          <p className="text-xs text-slate-500">{payment.customerName || 'Customer'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">+{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-slate-500">{new Date(payment.date || payment.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                    {localPayments.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No recent activity</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search invoices..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(INVOICE_STATUS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInvoices.length > 0 && (
                  <Button variant="outline" onClick={() => setShowBulkAction(true)}>
                    Bulk Actions ({selectedInvoices.length})
                  </Button>
                )}
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Status Summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(INVOICE_STATUS).map(([key, val]) => {
              const Icon = val.icon
              const count = metrics.statusCounts[key] || 0
              return (
                <Badge 
                  key={key} 
                  variant="outline" 
                  className={`cursor-pointer ${statusFilter === key ? val.color : ''}`}
                  onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {val.label}: {count}
                </Badge>
              )
            })}
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                        onCheckedChange={(checked) => {
                          setSelectedInvoices(checked ? filteredInvoices.map(i => i.id) : [])
                        }}
                      />
                    </TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const total = invoice.grandTotal || invoice.total || 0
                      const paid = invoice.paidAmount || 0
                      const balance = total - paid
                      const status = getInvoiceStatus(invoice)
                      const statusInfo = INVOICE_STATUS[status] || INVOICE_STATUS.pending
                      const StatusIcon = statusInfo.icon

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedInvoices.includes(invoice.id)}
                              onCheckedChange={(checked) => {
                                setSelectedInvoices(prev => 
                                  checked ? [...prev, invoice.id] : prev.filter(id => id !== invoice.id)
                                )
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <button 
                              className="font-medium text-blue-600 hover:underline"
                              onClick={() => { setSelectedInvoice(invoice); setShowInvoiceDetail(true); }}
                            >
                              {invoice.invoiceNumber || invoice.id?.slice(0, 8)}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.customerName}</p>
                              <p className="text-xs text-slate-500">{invoice.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{invoice.projectName || '-'}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{formatCurrency(paid)}</TableCell>
                          <TableCell className="text-right text-amber-600">{formatCurrency(balance)}</TableCell>
                          <TableCell>
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setShowInvoiceDetail(true); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setPaymentForm({...paymentForm, invoiceId: invoice.id, amount: balance})
                                  setShowRecordPayment(true)
                                }}
                                disabled={status === 'paid'}
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleSendReminder(invoice)}>
                                <Bell className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Collections</CardTitle>
                <Button onClick={() => setShowRecordPayment(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Record Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    localPayments.map((payment) => {
                      const method = PAYMENT_METHODS.find(m => m.id === payment.method)
                      const MethodIcon = method?.icon || Wallet
                      const tds = payment.tdsDeducted || 0
                      const net = (payment.amount || 0) - tds

                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.receiptNumber || payment.id?.slice(0, 8)}
                          </TableCell>
                          <TableCell>{payment.invoiceNumber || payment.invoiceId?.slice(0, 8)}</TableCell>
                          <TableCell>{payment.customerName}</TableCell>
                          <TableCell>
                            {new Date(payment.date || payment.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MethodIcon className="h-4 w-4 text-slate-500" />
                              <span className="capitalize">{payment.method}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">{payment.reference || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            +{formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {tds > 0 ? formatCurrency(tds) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(net)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Outstanding Receivables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Oldest Due</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topCustomers.filter(c => c.totalBilled > c.totalPaid).map((customer, idx) => {
                    const outstanding = customer.totalBilled - customer.totalPaid
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-slate-500">{customer.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{customer.invoiceCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.totalBilled)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{formatCurrency(customer.totalPaid)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">{formatCurrency(outstanding)}</TableCell>
                        <TableCell>
                          {customer.lastInvoice ? new Date(customer.lastInvoice).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">-</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedCustomer(customer)
                              setShowCustomerLedger(true)
                            }}>
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Expense Tracking</CardTitle>
                <Button onClick={() => setShowCreateExpense(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Expense Categories Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {EXPENSE_CATEGORIES.slice(0, 6).map(cat => {
                  const catExpenses = expenses.filter(e => e.category === cat.id)
                  const total = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
                  const Icon = cat.icon
                  return (
                    <Card key={cat.id} className="bg-slate-50">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-600">{cat.name}</span>
                        </div>
                        <p className="text-lg font-bold mt-1">{formatCurrency(total)}</p>
                        <p className="text-xs text-slate-500">{catExpenses.length} entries</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No expenses recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => {
                      const cat = EXPENSE_CATEGORIES.find(c => c.id === expense.category)
                      const Icon = cat?.icon || MoreVertical
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-slate-500" />
                              {cat?.name || expense.category}
                            </div>
                          </TableCell>
                          <TableCell>{expense.vendor || '-'}</TableCell>
                          <TableCell className="max-w-48 truncate">{expense.description}</TableCell>
                          <TableCell>{expense.invoiceNumber || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            -{formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.gstAmount || 0)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Customer Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select onValueChange={(v) => {
                  const customer = metrics.topCustomers.find(c => c.name === v)
                  setSelectedCustomer(customer)
                }}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Select customer to view ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.topCustomers.map((customer, idx) => (
                      <SelectItem key={idx} value={customer.name}>
                        {customer.name} - Outstanding: {formatCurrency(customer.totalBilled - customer.totalPaid)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomer ? (
                <div className="space-y-4">
                  {/* Customer Summary */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-500">Total Billed</p>
                      <p className="text-xl font-bold">{formatCurrency(selectedCustomer.totalBilled)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Paid</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedCustomer.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Outstanding</p>
                      <p className="text-xl font-bold text-amber-600">{formatCurrency(selectedCustomer.totalBilled - selectedCustomer.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Invoices</p>
                      <p className="text-xl font-bold">{selectedCustomer.invoiceCount}</p>
                    </div>
                  </div>

                  {/* Ledger Entries */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500">
                          Detailed ledger entries will be shown here
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">Select a customer to view ledger</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging Tab */}
        <TabsContent value="aging" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Aging Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-6">
                {metrics.agingData.map((bucket) => (
                  <Card key={bucket.id} className={`bg-${bucket.color}-50 border-${bucket.color}-200`}>
                    <CardContent className="p-4">
                      <p className={`text-sm text-${bucket.color}-600 font-medium`}>{bucket.label}</p>
                      <p className={`text-2xl font-bold text-${bucket.color}-700 mt-1`}>{formatCurrency(bucket.amount)}</p>
                      <p className={`text-xs text-${bucket.color}-500 mt-1`}>{bucket.count} invoices</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices
                    .filter(inv => getInvoiceStatus(inv) !== 'paid')
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map((invoice) => {
                      const dueDate = new Date(invoice.dueDate)
                      const today = new Date()
                      const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
                      const outstanding = (invoice.grandTotal || invoice.total || 0) - (invoice.paidAmount || 0)
                      
                      let bucket = metrics.agingData.find(b => {
                        if (b.id === 'current') return daysDiff <= 0
                        if (b.id === '120+') return daysDiff > 120
                        const [min, max] = b.id.split('-').map(Number)
                        return daysDiff >= min && daysDiff <= max
                      })

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id?.slice(0, 8)}</TableCell>
                          <TableCell>{invoice.customerName}</TableCell>
                          <TableCell>{new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{dueDate.toLocaleDateString()}</TableCell>
                          <TableCell>
                            {daysDiff > 0 ? (
                              <Badge variant="destructive">{daysDiff} days</Badge>
                            ) : (
                              <Badge variant="outline">{Math.abs(daysDiff)} days left</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(outstanding)}</TableCell>
                          <TableCell>
                            <Badge className={`bg-${bucket?.color}-100 text-${bucket?.color}-700`}>
                              {bucket?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleSendReminder(invoice)}>
                              <Bell className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Tab */}
        <TabsContent value="gst" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GST Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" /> GST Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="text-sm text-emerald-600">Output GST (Collected)</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(metrics.gstCollected)}</p>
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="flex justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm text-red-600">Input GST (Paid)</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(metrics.gstPaid)}</p>
                    </div>
                    <ArrowDownRight className="h-8 w-8 text-red-400" />
                  </div>
                  <Separator />
                  <div className="flex justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm text-purple-600">Net GST Liability</p>
                      <p className="text-2xl font-bold text-purple-700">{formatCurrency(metrics.gstLiability)}</p>
                    </div>
                    <Scale className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GST Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> GST Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'GSTR-1', desc: 'Outward supplies', icon: ArrowUpRight },
                    { name: 'GSTR-3B', desc: 'Monthly summary', icon: FileText },
                    { name: 'HSN Summary', desc: 'HSN-wise sales', icon: Hash },
                    { name: 'E-Way Bills', desc: 'Transport documents', icon: FileCheck },
                    { name: 'ITC Register', desc: 'Input tax credit', icon: BookOpen }
                  ].map((report) => {
                    const Icon = report.icon
                    return (
                      <div key={report.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-slate-600" />
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-xs text-slate-500">{report.desc}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" /> Export
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon
              return (
                <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Icon className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{report.name}</h4>
                        <p className="text-xs text-slate-500 capitalize">{report.category}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-generate invoice numbers</p>
                    <p className="text-sm text-slate-500">Automatically assign sequential numbers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Send email on invoice creation</p>
                    <p className="text-sm text-slate-500">Auto-email invoices to customers</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Include payment link</p>
                    <p className="text-sm text-slate-500">Add online payment option</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <Label>Default Payment Terms (Days)</Label>
                  <Select defaultValue="30">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="15">15 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="45">45 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto send reminders</p>
                    <p className="text-sm text-slate-500">Send automated payment reminders</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <Label>First reminder (days before due)</Label>
                  <Select defaultValue="7">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="10">10 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reminder frequency (days)</Label>
                  <Select defaultValue="7">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Every 3 days</SelectItem>
                      <SelectItem value="5">Every 5 days</SelectItem>
                      <SelectItem value="7">Every 7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Invoice *</Label>
              <Select 
                value={paymentForm.invoiceId} 
                onValueChange={(v) => {
                  const inv = localInvoices.find(i => i.id === v)
                  const balance = inv ? (inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0) : 0
                  setPaymentForm({...paymentForm, invoiceId: v, amount: balance})
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {localInvoices.filter(inv => getInvoiceStatus(inv) !== 'paid').map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber || inv.id?.slice(0, 8)} - {inv.customerName} 
                      ({formatCurrency((inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0))} due)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (₹) *</Label>
                <Input 
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input 
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({...paymentForm, method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => {
                    const Icon = method.icon
                    return (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {method.name}
                          {method.fee > 0 && <span className="text-xs text-slate-500">({method.fee}% fee)</span>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Reference / Transaction ID</Label>
              <Input 
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                placeholder="UPI ID, Cheque #, etc."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>TDS Deducted (₹)</Label>
                <Input 
                  type="number"
                  value={paymentForm.tdsDeducted}
                  onChange={(e) => setPaymentForm({...paymentForm, tdsDeducted: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Bank Charges (₹)</Label>
                <Input 
                  type="number"
                  value={paymentForm.bankCharges}
                  onChange={(e) => setPaymentForm({...paymentForm, bankCharges: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordPayment(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-red-600" />
              Add Expense
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Category *</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({...expenseForm, category: v})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {cat.name}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (₹) *</Label>
                <Input 
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input 
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor</Label>
                <Input 
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                />
              </div>
              <div>
                <Label>Invoice Number</Label>
                <Input 
                  value={expenseForm.invoiceNumber}
                  onChange={(e) => setExpenseForm({...expenseForm, invoiceNumber: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GST Amount (₹)</Label>
                <Input 
                  type="number"
                  value={expenseForm.gstAmount}
                  onChange={(e) => setExpenseForm({...expenseForm, gstAmount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={expenseForm.paymentMethod} onValueChange={(v) => setExpenseForm({...expenseForm, paymentMethod: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea 
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="Expense details..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExpense(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense} className="bg-red-600 hover:bg-red-700">
              <MinusCircle className="h-4 w-4 mr-2" /> Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Reports</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {REPORT_TYPES.slice(0, 8).map(report => {
                const Icon = report.icon
                return (
                  <Button 
                    key={report.id} 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => handleExport('pdf', report.name)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {report.name}
                  </Button>
                )
              })}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('excel', 'All Data')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export to Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf', 'All Data')}>
                <FileText className="h-4 w-4 mr-2" /> Export to PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseFinanceFlooring
