'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  IndianRupee, Receipt, CheckCircle2, Clock, AlertTriangle,
  Search, Download, Filter, RefreshCw, Eye, TrendingUp, TrendingDown,
  CreditCard, Banknote, Wallet, BarChart3, PieChart, ArrowUpRight,
  Loader2, Plus, FileText, Send, Calendar as CalendarIcon, Users,
  Building2, Percent, Calculator, History, DollarSign, ArrowDownRight,
  FileCheck, Edit, Trash2, Printer, Mail, Phone, ChevronRight,
  Award, Target, Landmark, BookOpen, Scale, Shield, ArrowRightLeft
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// =============================================
// D&W FINANCE SPECIFIC CONSTANTS
// =============================================

// Payment Methods
const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: Banknote },
  { id: 'upi', name: 'UPI', icon: Wallet },
  { id: 'neft', name: 'NEFT/RTGS', icon: Landmark },
  { id: 'cheque', name: 'Cheque', icon: FileCheck },
  { id: 'card', name: 'Card', icon: CreditCard },
  { id: 'emi', name: 'EMI', icon: Calculator }
]

// Payment Stages for D&W Projects
const PAYMENT_STAGES = [
  { id: 'booking', name: 'Booking Advance', percentage: 30, stage: 'Order Confirmation' },
  { id: 'production', name: 'Production Start', percentage: 30, stage: 'Manufacturing' },
  { id: 'delivery', name: 'On Delivery', percentage: 30, stage: 'Dispatch' },
  { id: 'installation', name: 'Post Installation', percentage: 10, stage: 'Completion' }
]

// Invoice Status
const invoiceStatusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600'
}

// GST Rates
const GST_RATES = [
  { rate: 0, label: 'Exempt (0%)' },
  { rate: 5, label: '5%' },
  { rate: 12, label: '12%' },
  { rate: 18, label: '18% (Standard)' },
  { rate: 28, label: '28%' }
]

export function EnterpriseFinanceDW({ client, user, initialData }) {
  // Check if data was pre-loaded (array exists, even if empty)
  const hasPreloadedData = initialData && 'invoices' in initialData
  
  // State management
  const [activeSubTab, setActiveSubTab] = useState('overview')
  const [invoices, setInvoices] = useState(initialData?.invoices || [])
  const [payments, setPayments] = useState(initialData?.payments || [])
  const [quotations, setQuotations] = useState(initialData?.quotations || [])
  const [customers, setCustomers] = useState(initialData?.customers || [])
  const [expenses, setExpenses] = useState(initialData?.expenses || [])
  const [loading, setLoading] = useState(!hasPreloadedData)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: null, to: null })
  
  // Dialog states
  const [showRecordPayment, setShowRecordPayment] = useState(false)
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  
  // Payment form state
  const [paymentData, setPaymentData] = useState({
    invoiceId: '',
    amount: 0,
    method: 'upi',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tdsDeducted: 0
  })

  // Fetch data - only if not pre-loaded
  useEffect(() => {
    if (!hasPreloadedData) {
      fetchAllData()
    }
  }, [])

  // Update state when initialData changes
  useEffect(() => {
    if (initialData?.invoices) {
      setInvoices(initialData.invoices)
      setLoading(false)
    }
    if (initialData?.payments) setPayments(initialData.payments)
    if (initialData?.quotations) setQuotations(initialData.quotations)
    if (initialData?.customers) setCustomers(initialData.customers)
    if (initialData?.expenses) setExpenses(initialData.expenses)
  }, [initialData])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [invRes, payRes, quoteRes, custRes, expRes] = await Promise.all([
        fetch(`${API_BASE}/invoices`),
        fetch(`${API_BASE}/post-invoicing?action=payments`),
        fetch(`${API_BASE}/quotations`),
        fetch('/api/contacts'),
        fetch(`${API_BASE}/expenses`)
      ])

      if (invRes.ok) {
        const data = await invRes.json()
        setInvoices(data.data?.invoices || data.invoices || [])
      }
      if (payRes.ok) {
        const data = await payRes.json()
        setPayments(data.data?.payments || data.payments || [])
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json()
        setQuotations(data.data?.quotations || data.quotations || data.data || [])
      }
      if (custRes.ok) {
        const data = await custRes.json()
        setCustomers(data.data?.contacts || data.contacts || [])
      }
      if (expRes.ok) {
        const data = await expRes.json()
        setExpenses(data.data?.expenses || data.expenses || [])
      }
    } catch (error) {
      console.error('Failed to fetch finance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate comprehensive metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0)
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' || inv.paymentStatus === 'paid')
  const pendingInvoices = invoices.filter(inv => ['pending', 'sent', 'partial'].includes(inv.status) || ['pending', 'partial'].includes(inv.paymentStatus))
  
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === 'paid' || inv.paymentStatus === 'paid') return false
    const dueDate = new Date(inv.dueDate)
    return dueDate < new Date()
  })

  const totalCollected = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0)
  const totalPending = invoices.reduce((sum, inv) => {
    const total = inv.grandTotal || inv.total || 0
    const paid = inv.paidAmount || 0
    return sum + (total - paid)
  }, 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + ((inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0)), 0)
  
  // Quote to Invoice conversion
  const quoteValue = quotations.reduce((sum, q) => sum + (q.grandTotal || q.total || 0), 0)
  const convertedQuotes = quotations.filter(q => q.status === 'accepted' || q.convertedToOrder)
  const conversionRate = quotations.length > 0 ? Math.round((convertedQuotes.length / quotations.length) * 100) : 0
  
  // Collection metrics
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0
  const avgPaymentDays = 15 // Calculate from actual data
  
  // Expense tracking
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  const grossProfit = totalCollected - totalExpenses

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter || inv.paymentStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  // Handle record payment
  const handleRecordPayment = async () => {
    try {
      const response = await fetch(`${API_BASE}/post-invoicing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-payment',
          ...paymentData
        })
      })
      
      if (response.ok) {
        toast.success('Payment recorded successfully')
        setShowRecordPayment(false)
        setPaymentData({
          invoiceId: '', amount: 0, method: 'upi',
          reference: '', date: new Date().toISOString().split('T')[0],
          notes: '', tdsDeducted: 0
        })
        fetchAllData()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to record payment')
      }
    } catch (error) {
      toast.error('Error recording payment')
    }
  }

  // Get invoice payment status
  const getPaymentStatus = (invoice) => {
    const total = invoice.grandTotal || invoice.total || 0
    const paid = invoice.paidAmount || 0
    if (paid >= total) return 'paid'
    if (paid > 0) return 'partial'
    const dueDate = new Date(invoice.dueDate)
    if (dueDate < new Date()) return 'overdue'
    return 'pending'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
            <Landmark className="h-7 w-7 text-indigo-600" />
            D&W Finance & Accounting
          </h2>
          <p className="text-slate-500">Enterprise financial management for Doors & Windows</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowRecordPayment(true)}>
            <Plus className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Download className="h-4 w-4 mr-2" /> Export Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">₹{(totalRevenue/100000).toFixed(1)}L</p>
              </div>
              <IndianRupee className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-600">{invoices.length} invoices</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Collected</p>
                <p className="text-2xl font-bold text-blue-700">₹{(totalCollected/100000).toFixed(1)}L</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-blue-600">{collectionRate}% collection rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-amber-700">₹{(totalPending/100000).toFixed(1)}L</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-amber-600">{pendingInvoices.length} invoices</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-700">₹{(totalOverdue/100000).toFixed(1)}L</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-red-600">{overdueInvoices.length} invoices</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Quote Pipeline</p>
                <p className="text-2xl font-bold text-purple-700">₹{(quoteValue/100000).toFixed(1)}L</p>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-purple-600">{conversionRate}% converted</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-600 font-medium">Gross Profit</p>
                <p className="text-2xl font-bold text-teal-700">₹{(grossProfit/100000).toFixed(1)}L</p>
              </div>
              <Award className="h-8 w-8 text-teal-400" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-teal-600">Revenue - Expenses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1">
            <Receipt className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="receivables" className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> Receivables
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> Ledger
          </TabsTrigger>
          <TabsTrigger value="gst" className="flex items-center gap-1">
            <Percent className="h-4 w-4" /> GST
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <PieChart className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Schedule / Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                  D&W Payment Milestones
                </CardTitle>
                <CardDescription>Industry-standard payment stages for projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {PAYMENT_STAGES.map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{stage.name}</p>
                          <Badge variant="outline">{stage.percentage}%</Badge>
                        </div>
                        <p className="text-sm text-slate-500">{stage.stage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Recent Payments
                </CardTitle>
                <CardDescription>Latest payment collections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => {
                    const method = PAYMENT_METHODS.find(m => m.id === payment.method)
                    const MethodIcon = method?.icon || Wallet
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-full shadow-sm">
                            <MethodIcon className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium">{payment.customerName || payment.reference}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(payment.date || payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600">+₹{(payment.amount || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500 capitalize">{payment.method}</p>
                        </div>
                      </div>
                    )
                  })}
                  {payments.length === 0 && (
                    <p className="text-center text-slate-500 py-4">No payments recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Aging Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-amber-600" />
                  Receivables Aging
                </CardTitle>
                <CardDescription>Outstanding amounts by age</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Current (0-30 days)', value: totalPending * 0.4, color: 'bg-emerald-500' },
                    { label: '31-60 days', value: totalPending * 0.3, color: 'bg-amber-500' },
                    { label: '61-90 days', value: totalPending * 0.2, color: 'bg-orange-500' },
                    { label: '90+ days', value: totalPending * 0.1, color: 'bg-red-500' }
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{item.label}</span>
                        <span className="text-sm font-medium">₹{(item.value/1000).toFixed(0)}K</span>
                      </div>
                      <Progress 
                        value={totalPending > 0 ? (item.value / totalPending) * 100 : 0} 
                        className={`h-2 ${item.color}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Collections by payment mode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const methodPayments = payments.filter(p => p.method === method.id)
                    const methodTotal = methodPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                    const percentage = totalCollected > 0 ? (methodTotal / totalCollected) * 100 : 0
                    const MethodIcon = method.icon
                    
                    return (
                      <div key={method.id} className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded">
                          <MethodIcon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">{method.name}</span>
                            <span className="text-sm font-medium">₹{(methodTotal/1000).toFixed(0)}K</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <span className="text-sm text-slate-500 w-12">{percentage.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by invoice #, customer..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
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
                      <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const total = invoice.grandTotal || invoice.total || 0
                      const paid = invoice.paidAmount || 0
                      const balance = total - paid
                      const status = getPaymentStatus(invoice)
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber || invoice.id?.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.customerName}</p>
                              <p className="text-xs text-slate-500">{invoice.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.projectName || '-'}</TableCell>
                          <TableCell>
                            {new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            ₹{paid.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            ₹{balance.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={invoiceStatusStyles[status]}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setPaymentData({...paymentData, invoiceId: invoice.id, amount: balance})
                                  setShowRecordPayment(true)
                                }}
                                disabled={status === 'paid'}
                              >
                                <CreditCard className="h-4 w-4" />
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
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Collections
                  </CardTitle>
                  <CardDescription>Track all payment receipts</CardDescription>
                </div>
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
                    <TableHead>TDS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => {
                      const method = PAYMENT_METHODS.find(m => m.id === payment.method)
                      const MethodIcon = method?.icon || Wallet
                      
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
                            +₹{(payment.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {payment.tdsDeducted ? `₹${payment.tdsDeducted}` : '-'}
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
        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Outstanding Receivables
              </CardTitle>
              <CardDescription>Customer-wise pending payments</CardDescription>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Group invoices by customer */}
                  {Object.entries(
                    filteredInvoices.reduce((acc, inv) => {
                      const customerId = inv.customerId || inv.customerName
                      if (!acc[customerId]) {
                        acc[customerId] = {
                          name: inv.customerName,
                          phone: inv.customerPhone,
                          invoices: [],
                          totalBilled: 0,
                          totalPaid: 0,
                          oldestDue: null
                        }
                      }
                      acc[customerId].invoices.push(inv)
                      acc[customerId].totalBilled += (inv.grandTotal || inv.total || 0)
                      acc[customerId].totalPaid += (inv.paidAmount || 0)
                      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
                      if (dueDate && (!acc[customerId].oldestDue || dueDate < acc[customerId].oldestDue)) {
                        acc[customerId].oldestDue = dueDate
                      }
                      return acc
                    }, {})
                  ).filter(([_, data]) => data.totalBilled > data.totalPaid).map(([customerId, data]) => (
                    <TableRow key={customerId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{data.name}</p>
                          <p className="text-xs text-slate-500">{data.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{data.invoices.length}</TableCell>
                      <TableCell className="text-right">₹{data.totalBilled.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600">₹{data.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-600">
                        ₹{(data.totalBilled - data.totalPaid).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {data.oldestDue ? (
                          <Badge className={data.oldestDue < new Date() ? 'bg-red-100 text-red-700' : 'bg-slate-100'}>
                            {data.oldestDue.toLocaleDateString()}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Ledger Tab */}
        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Customer Ledger
              </CardTitle>
              <CardDescription>Detailed transaction history by customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Select customer to view ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name || customer.firstName + ' ' + customer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <p className="text-center text-slate-500 py-8">
                  Select a customer to view their ledger
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Tab */}
        <TabsContent value="gst" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-indigo-600" />
                  GST Summary
                </CardTitle>
                <CardDescription>Tax collected and input credits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {GST_RATES.filter(r => r.rate > 0).map((gstRate) => {
                    const rateInvoices = invoices.filter(i => (i.gstRate || 18) === gstRate.rate)
                    const taxCollected = rateInvoices.reduce((sum, i) => {
                      const base = (i.grandTotal || i.total || 0) / (1 + gstRate.rate/100)
                      return sum + (base * gstRate.rate / 100)
                    }, 0)
                    
                    return (
                      <div key={gstRate.rate} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">GST @ {gstRate.label}</p>
                          <p className="text-sm text-slate-500">{rateInvoices.length} invoices</p>
                        </div>
                        <p className="font-semibold text-indigo-600">₹{taxCollected.toLocaleString()}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  GST Reports
                </CardTitle>
                <CardDescription>Download GST filing reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'GSTR-1 (Sales)', desc: 'Outward supplies report' },
                    { name: 'GSTR-3B Summary', desc: 'Monthly summary return' },
                    { name: 'HSN Summary', desc: 'HSN-wise sales summary' },
                    { name: 'E-Way Bills', desc: 'Transport documents' }
                  ].map((report) => (
                    <div key={report.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-slate-500">{report.desc}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" /> Export
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Sales Report', desc: 'Period-wise sales analysis', icon: TrendingUp },
              { name: 'Collection Report', desc: 'Payment collections summary', icon: CreditCard },
              { name: 'Outstanding Report', desc: 'Pending receivables', icon: Clock },
              { name: 'Aging Analysis', desc: 'Receivables by age', icon: History },
              { name: 'Customer Statement', desc: 'Individual customer ledger', icon: Users },
              { name: 'Profitability Report', desc: 'Project-wise profit analysis', icon: Award },
              { name: 'GST Report', desc: 'Tax summary for filing', icon: Percent },
              { name: 'TDS Report', desc: 'Tax deducted at source', icon: Scale },
              { name: 'Cash Flow', desc: 'Inflow/outflow analysis', icon: ArrowRightLeft }
            ].map((report) => (
              <Card key={report.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <report.icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{report.name}</h4>
                      <p className="text-sm text-slate-500">{report.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
            <DialogDescription>Record a payment against an invoice</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Invoice *</Label>
              <Select 
                value={paymentData.invoiceId} 
                onValueChange={(v) => {
                  const inv = invoices.find(i => i.id === v)
                  const balance = inv ? (inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0) : 0
                  setPaymentData({...paymentData, invoiceId: v, amount: balance})
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.filter(inv => getPaymentStatus(inv) !== 'paid').map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber || inv.id?.slice(0, 8)} - {inv.customerName} 
                      (₹{((inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0)).toLocaleString()} due)
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
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label>Payment Date *</Label>
                <Input 
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentData.method} onValueChange={(v) => setPaymentData({...paymentData, method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Reference / Transaction ID</Label>
              <Input 
                value={paymentData.reference}
                onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                placeholder="UPI ID, Cheque #, etc."
              />
            </div>
            
            <div>
              <Label>TDS Deducted (if any)</Label>
              <Input 
                type="number"
                value={paymentData.tdsDeducted}
                onChange={(e) => setPaymentData({...paymentData, tdsDeducted: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={paymentData.notes}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
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
    </div>
  )
}

export default EnterpriseFinanceDW
