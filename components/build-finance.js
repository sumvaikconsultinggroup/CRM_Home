'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IndianRupee, Receipt, CreditCard, Wallet, TrendingUp, TrendingDown,
  FileText, Download, Plus, RefreshCw, Search, Filter, MoreVertical,
  Calendar, Building2, Users, CheckCircle2, Clock, AlertCircle, Edit,
  Trash2, Eye, ArrowUpRight, ArrowDownRight, PieChart, BarChart3,
  ChevronRight, Settings, Bell, Send, DollarSign, Percent, Calculator,
  Landmark, ArrowLeftRight, FileSpreadsheet, Target, Shield, Banknote,
  CircleDollarSign, Briefcase, ClipboardList, BookOpen, Scale
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// Build Finance - Standalone Product
export function BuildFinance({ token, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    overdueAmount: 0,
    cashFlow: 0
  })
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createType, setCreateType] = useState('invoice') // invoice, expense, payment
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('this_month')
  
  // Finance Settings State
  const [financeSettings, setFinanceSettings] = useState({
    brandLogo: '',
    brandName: '',
    companyName: '',
    gstin: '',
    pan: '',
    placeOfSupply: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    phone: '',
    email: '',
    website: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'Current',
      upiId: ''
    },
    paymentQRCode: '',
    termsAndConditions: [
      'Payment is due within 15 days from the invoice date.',
      'Interest @ 18% per annum will be charged on overdue payments.',
      'Please quote the invoice number for all remittances.'
    ],
    invoicePrefix: 'INV-',
    defaultPaymentDays: 15,
    authorizedSignatoryName: ''
  })

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/finance/stats', { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Stats fetch error:', error)
    }
  }, [token])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/finance/invoices', { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.invoices) {
        setInvoices(data.invoices)
      }
    } catch (error) {
      console.error('Invoices fetch error:', error)
    }
  }, [token])

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/finance/expenses', { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.expenses) {
        setExpenses(data.expenses)
      }
    } catch (error) {
      console.error('Expenses fetch error:', error)
    }
  }, [token])

  // Fetch finance settings
  const fetchFinanceSettings = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/finance/settings', { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.settings) {
        setFinanceSettings(prev => ({
          ...prev,
          ...data.settings,
          address: { ...prev.address, ...data.settings.address },
          bankDetails: { ...prev.bankDetails, ...data.settings.bankDetails }
        }))
      }
    } catch (error) {
      console.error('Finance settings fetch error:', error)
    }
  }, [token])

  // Save finance settings
  const saveFinanceSettings = async () => {
    if (!token) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/finance/settings', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(financeSettings)
      })
      const data = await res.json()
      if (data.settings) {
        setFinanceSettings(prev => ({
          ...prev,
          ...data.settings,
          address: { ...prev.address, ...data.settings.address },
          bankDetails: { ...prev.bankDetails, ...data.settings.bankDetails }
        }))
        toast.success('Finance settings saved successfully!')
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Finance settings save error:', error)
      toast.error('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  // Update settings field helper
  const updateSettings = (field, value) => {
    setFinanceSettings(prev => ({ ...prev, [field]: value }))
  }

  const updateAddressField = (field, value) => {
    setFinanceSettings(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }))
  }

  const updateBankField = (field, value) => {
    setFinanceSettings(prev => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [field]: value }
    }))
  }

  useEffect(() => {
    if (token) {
      fetchStats()
      fetchInvoices()
      fetchExpenses()
      fetchFinanceSettings()
    }
  }, [token, fetchStats, fetchInvoices, fetchExpenses, fetchFinanceSettings])

  // Sample chart data (would come from API)
  const revenueData = [
    { month: 'Jan', revenue: 45000, expenses: 32000 },
    { month: 'Feb', revenue: 52000, expenses: 38000 },
    { month: 'Mar', revenue: 48000, expenses: 35000 },
    { month: 'Apr', revenue: 61000, expenses: 42000 },
    { month: 'May', revenue: 55000, expenses: 39000 },
    { month: 'Jun', revenue: 67000, expenses: 45000 },
  ]

  const expensesByCategory = [
    { name: 'Materials', value: 45000, color: '#3B82F6' },
    { name: 'Labor', value: 28000, color: '#10B981' },
    { name: 'Operations', value: 15000, color: '#F59E0B' },
    { name: 'Marketing', value: 8000, color: '#EF4444' },
    { name: 'Utilities', value: 5000, color: '#8B5CF6' },
  ]

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <IndianRupee className="h-7 w-7" />
                Build Finance
              </h2>
              <p className="text-amber-100 mt-1">Enterprise Accounting & Finance Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => {
                setCreateType('invoice')
                setShowCreateDialog(true)
              }}>
                <Plus className="h-4 w-4 mr-2" /> New Invoice
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('invoices')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue || 328000).toLocaleString()}`}
          icon={TrendingUp}
          color="bg-emerald-500"
          change="+12.5%"
          trend="up"
        />
        <StatCard
          title="Total Expenses"
          value={`₹${(stats.totalExpenses || 186000).toLocaleString()}`}
          icon={TrendingDown}
          color="bg-red-500"
          change="+8.2%"
          trend="up"
        />
        <StatCard
          title="Net Profit"
          value={`₹${(stats.netProfit || 142000).toLocaleString()}`}
          icon={Wallet}
          color="bg-blue-500"
          change="+18.3%"
          trend="up"
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pendingInvoices || 12}
          icon={Clock}
          color="bg-amber-500"
          subtitle="₹85,000"
        />
        <StatCard
          title="Overdue Amount"
          value={`₹${(stats.overdueAmount || 24000).toLocaleString()}`}
          icon={AlertCircle}
          color="bg-red-500"
          subtitle="3 invoices"
        />
        <StatCard
          title="Cash Flow"
          value={`₹${(stats.cashFlow || 95000).toLocaleString()}`}
          icon={ArrowLeftRight}
          color="bg-purple-500"
          change="+5.2%"
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue vs Expenses
            </CardTitle>
            <CardDescription>Monthly financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B98133" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#EF444433" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartPie>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </RechartPie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {expensesByCategory.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        <QuickActionCard
          title="Create Invoice"
          description="Bill your clients"
          icon={FileText}
          color="bg-emerald-500"
          onClick={() => {
            setCreateType('invoice')
            setShowCreateDialog(true)
          }}
        />
        <QuickActionCard
          title="Record Expense"
          description="Track spending"
          icon={Receipt}
          color="bg-red-500"
          onClick={() => {
            setCreateType('expense')
            setShowCreateDialog(true)
          }}
        />
        <QuickActionCard
          title="Record Payment"
          description="Payments received"
          icon={CreditCard}
          color="bg-blue-500"
          onClick={() => {
            setCreateType('payment')
            setShowCreateDialog(true)
          }}
        />
        <QuickActionCard
          title="GST Report"
          description="Tax compliance"
          icon={FileSpreadsheet}
          color="bg-purple-500"
          onClick={() => setActiveTab('reports')}
        />
      </div>

      {/* Recent Transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('invoices')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'INV-001', client: 'ABC Construction', amount: 45000, status: 'paid', date: '2025-06-10' },
                { id: 'INV-002', client: 'XYZ Interiors', amount: 32000, status: 'pending', date: '2025-06-08' },
                { id: 'INV-003', client: 'Dream Homes', amount: 28000, status: 'overdue', date: '2025-05-28' },
              ].map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      inv.status === 'paid' ? 'bg-emerald-100' : 
                      inv.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        inv.status === 'paid' ? 'text-emerald-600' : 
                        inv.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{inv.id}</p>
                      <p className="text-xs text-slate-500">{inv.client}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{inv.amount.toLocaleString()}</p>
                    <Badge className={`text-xs ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                      inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Recent Expenses
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('expenses')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'EXP-001', vendor: 'Material Supplier', amount: 18000, category: 'Materials', date: '2025-06-12' },
                { id: 'EXP-002', vendor: 'Office Rent', amount: 25000, category: 'Operations', date: '2025-06-01' },
                { id: 'EXP-003', vendor: 'Marketing Agency', amount: 8000, category: 'Marketing', date: '2025-06-05' },
              ].map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <Receipt className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{exp.vendor}</p>
                      <p className="text-xs text-slate-500">{exp.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">-₹{exp.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{exp.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // Invoices Tab
  const renderInvoicesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-slate-500">Manage your sales invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => {
            setCreateType('invoice')
            setShowCreateDialog(true)
          }}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search invoices..." className="pl-10" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { id: 'INV-2025-001', client: 'ABC Construction', date: '2025-06-10', dueDate: '2025-06-25', amount: 45000, gst: 8100, status: 'paid' },
                { id: 'INV-2025-002', client: 'XYZ Interiors', date: '2025-06-08', dueDate: '2025-06-23', amount: 32000, gst: 5760, status: 'pending' },
                { id: 'INV-2025-003', client: 'Dream Homes Ltd', date: '2025-05-28', dueDate: '2025-06-12', amount: 28000, gst: 5040, status: 'overdue' },
                { id: 'INV-2025-004', client: 'Modern Spaces', date: '2025-06-01', dueDate: '2025-06-16', amount: 55000, gst: 9900, status: 'paid' },
              ].map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell>{inv.client}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>{inv.dueDate}</TableCell>
                  <TableCell>₹{inv.amount.toLocaleString()}</TableCell>
                  <TableCell>₹{inv.gst.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={`${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost"><Send className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  // Expenses Tab
  const renderExpensesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-slate-500">Track and manage expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => {
            setCreateType('expense')
            setShowCreateDialog(true)
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {expensesByCategory.map((cat) => (
          <Card key={cat.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{cat.name}</p>
                  <p className="text-xl font-bold">₹{cat.value.toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${cat.color}20` }}>
                  <Receipt className="h-5 w-5" style={{ color: cat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor/Payee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>GST Input</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { date: '2025-06-12', vendor: 'ABC Materials', category: 'Materials', mode: 'Bank Transfer', amount: 18000, gst: 3240 },
                { date: '2025-06-10', vendor: 'Office Rent - June', category: 'Operations', mode: 'Bank Transfer', amount: 25000, gst: 4500 },
                { date: '2025-06-08', vendor: 'Electricity Bill', category: 'Utilities', mode: 'UPI', amount: 3500, gst: 0 },
                { date: '2025-06-05', vendor: 'Marketing Agency', category: 'Marketing', mode: 'Bank Transfer', amount: 8000, gst: 1440 },
              ].map((exp, idx) => (
                <TableRow key={idx}>
                  <TableCell>{exp.date}</TableCell>
                  <TableCell className="font-medium">{exp.vendor}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{exp.category}</Badge>
                  </TableCell>
                  <TableCell>{exp.mode}</TableCell>
                  <TableCell className="text-red-600 font-medium">-₹{exp.amount.toLocaleString()}</TableCell>
                  <TableCell>₹{exp.gst.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  // Reports Tab
  const renderReportsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Financial Reports</h2>
        <p className="text-slate-500">Generate and download financial reports</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Profit & Loss Statement', icon: TrendingUp, description: 'Revenue, expenses, and net profit', color: 'emerald' },
          { title: 'Balance Sheet', icon: Scale, description: 'Assets, liabilities, and equity', color: 'blue' },
          { title: 'Cash Flow Statement', icon: ArrowLeftRight, description: 'Cash inflows and outflows', color: 'purple' },
          { title: 'GST Report (GSTR-1)', icon: FileSpreadsheet, description: 'Outward supplies summary', color: 'amber' },
          { title: 'GST Report (GSTR-3B)', icon: FileSpreadsheet, description: 'Monthly tax summary', color: 'amber' },
          { title: 'Accounts Receivable', icon: Receipt, description: 'Outstanding customer payments', color: 'red' },
          { title: 'Accounts Payable', icon: CreditCard, description: 'Outstanding vendor payments', color: 'orange' },
          { title: 'Tax Summary', icon: Percent, description: 'Tax liability breakdown', color: 'indigo' },
          { title: 'Audit Trail', icon: BookOpen, description: 'Transaction history log', color: 'slate' },
        ].map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-lg bg-${report.color}-100`}>
                  <report.icon className={`h-6 w-6 text-${report.color}-600`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Build Finance</h1>
                <p className="text-xs text-slate-500">Enterprise Accounting & Finance</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="invoices">
                  <FileText className="h-4 w-4 mr-2" /> Invoices
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  <Receipt className="h-4 w-4 mr-2" /> Expenses
                </TabsTrigger>
                <TabsTrigger value="reports">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Reports
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchStats}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'invoices' && renderInvoicesTab()}
        {activeTab === 'expenses' && renderExpensesTab()}
        {activeTab === 'reports' && renderReportsTab()}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Save Button Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Finance Settings</h2>
                <p className="text-slate-500">Configure your company details and invoice branding</p>
              </div>
              <Button onClick={saveFinanceSettings} disabled={savingSettings}>
                {savingSettings ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Save Settings
                  </>
                )}
              </Button>
            </div>

            {/* Company Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Branding
                </CardTitle>
                <CardDescription>Your company details for invoices and official documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name *</Label>
                    <Input 
                      placeholder="Enter company name" 
                      value={financeSettings.companyName}
                      onChange={(e) => updateSettings('companyName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Brand Name (for invoice header)</Label>
                    <Input 
                      placeholder="Enter brand name" 
                      value={financeSettings.brandName}
                      onChange={(e) => updateSettings('brandName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Logo URL</Label>
                    <Input 
                      placeholder="https://example.com/logo.png" 
                      value={financeSettings.brandLogo}
                      onChange={(e) => updateSettings('brandLogo', e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">Paste a URL to your logo image</p>
                  </div>
                  <div>
                    <Label>Preview</Label>
                    {financeSettings.brandLogo ? (
                      <div className="p-4 border rounded-lg bg-slate-50">
                        <img 
                          src={financeSettings.brandLogo} 
                          alt="Logo preview" 
                          className="max-h-16 object-contain"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      </div>
                    ) : (
                      <div className="p-4 border rounded-lg bg-slate-50 text-slate-400 text-sm">
                        No logo set
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Tax Information
                </CardTitle>
                <CardDescription>GST and tax details for compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>GSTIN *</Label>
                    <Input 
                      placeholder="22AAAAA0000A1Z5" 
                      value={financeSettings.gstin}
                      onChange={(e) => updateSettings('gstin', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>PAN Number</Label>
                    <Input 
                      placeholder="AAAAA0000A" 
                      value={financeSettings.pan}
                      onChange={(e) => updateSettings('pan', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Place of Supply</Label>
                    <Input 
                      placeholder="Maharashtra" 
                      value={financeSettings.placeOfSupply}
                      onChange={(e) => updateSettings('placeOfSupply', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Address Line 1</Label>
                    <Input 
                      placeholder="Street address" 
                      value={financeSettings.address.line1}
                      onChange={(e) => updateAddressField('line1', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Address Line 2</Label>
                    <Input 
                      placeholder="Building, Floor, etc." 
                      value={financeSettings.address.line2}
                      onChange={(e) => updateAddressField('line2', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input 
                      placeholder="City" 
                      value={financeSettings.address.city}
                      onChange={(e) => updateAddressField('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input 
                      placeholder="State" 
                      value={financeSettings.address.state}
                      onChange={(e) => updateAddressField('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input 
                      placeholder="400001" 
                      value={financeSettings.address.pincode}
                      onChange={(e) => updateAddressField('pincode', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input 
                      placeholder="India" 
                      value={financeSettings.address.country}
                      onChange={(e) => updateAddressField('country', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input 
                      placeholder="+91 9876543210" 
                      value={financeSettings.phone}
                      onChange={(e) => updateSettings('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      placeholder="billing@company.com" 
                      value={financeSettings.email}
                      onChange={(e) => updateSettings('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input 
                      placeholder="www.company.com" 
                      value={financeSettings.website}
                      onChange={(e) => updateSettings('website', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Bank Details
                </CardTitle>
                <CardDescription>Bank account details for payment instructions on invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account Holder Name</Label>
                    <Input 
                      placeholder="Company Name" 
                      value={financeSettings.bankDetails.accountHolderName}
                      onChange={(e) => updateBankField('accountHolderName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input 
                      placeholder="1234567890" 
                      value={financeSettings.bankDetails.accountNumber}
                      onChange={(e) => updateBankField('accountNumber', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>IFSC Code</Label>
                    <Input 
                      placeholder="SBIN0001234" 
                      value={financeSettings.bankDetails.ifscCode}
                      onChange={(e) => updateBankField('ifscCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Bank Name</Label>
                    <Input 
                      placeholder="State Bank of India" 
                      value={financeSettings.bankDetails.bankName}
                      onChange={(e) => updateBankField('bankName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Input 
                      placeholder="Main Branch" 
                      value={financeSettings.bankDetails.branchName}
                      onChange={(e) => updateBankField('branchName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account Type</Label>
                    <Select 
                      value={financeSettings.bankDetails.accountType}
                      onValueChange={(value) => updateBankField('accountType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Current">Current Account</SelectItem>
                        <SelectItem value="Savings">Savings Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>UPI ID</Label>
                    <Input 
                      placeholder="company@upi" 
                      value={financeSettings.bankDetails.upiId}
                      onChange={(e) => updateBankField('upiId', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Payment QR Code URL</Label>
                  <Input 
                    placeholder="https://example.com/qr-code.png" 
                    value={financeSettings.paymentQRCode}
                    onChange={(e) => updateSettings('paymentQRCode', e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">QR code image will appear on invoices for quick payment</p>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Invoice Number Prefix</Label>
                    <Input 
                      placeholder="INV-" 
                      value={financeSettings.invoicePrefix}
                      onChange={(e) => updateSettings('invoicePrefix', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Default Payment Terms (Days)</Label>
                    <Input 
                      type="number" 
                      placeholder="15" 
                      value={financeSettings.defaultPaymentDays}
                      onChange={(e) => updateSettings('defaultPaymentDays', parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div>
                    <Label>Authorized Signatory Name</Label>
                    <Input 
                      placeholder="John Doe" 
                      value={financeSettings.authorizedSignatoryName}
                      onChange={(e) => updateSettings('authorizedSignatoryName', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Terms & Conditions (one per line)</Label>
                  <Textarea 
                    placeholder="Enter terms and conditions..." 
                    rows={4}
                    value={financeSettings.termsAndConditions?.join('\n') || ''}
                    onChange={(e) => updateSettings('termsAndConditions', e.target.value.split('\n').filter(t => t.trim()))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button Footer */}
            <div className="flex justify-end">
              <Button size="lg" onClick={saveFinanceSettings} disabled={savingSettings}>
                {savingSettings ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Save All Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {createType === 'invoice' && 'Create New Invoice'}
              {createType === 'expense' && 'Record Expense'}
              {createType === 'payment' && 'Record Payment'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {createType === 'invoice' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abc">ABC Construction</SelectItem>
                        <SelectItem value="xyz">XYZ Interiors</SelectItem>
                        <SelectItem value="dream">Dream Homes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Invoice Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>GST Rate (%)</Label>
                    <Select defaultValue="18">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>Line Items</Label>
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg text-center text-slate-500">
                    Add line items for this invoice
                  </div>
                </div>
              </>
            )}

            {createType === 'expense' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vendor/Payee *</Label>
                    <Input placeholder="Enter vendor name" />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="materials">Materials</SelectItem>
                        <SelectItem value="labor">Labor</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Mode</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>GST (if applicable)</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Additional notes..." rows={2} />
                </div>
              </>
            )}

            {createType === 'payment' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Invoice *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inv1">INV-2025-002 - XYZ Interiors (₹32,000)</SelectItem>
                        <SelectItem value="inv2">INV-2025-003 - Dream Homes (₹28,000)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount Received (₹)</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Payment Mode</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <Input placeholder="Transaction/Cheque number" />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success(`${createType.charAt(0).toUpperCase() + createType.slice(1)} created successfully`)
              setShowCreateDialog(false)
            }}>
              {createType === 'invoice' ? 'Create Invoice' : 
               createType === 'expense' ? 'Save Expense' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, change, trend, subtitle }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {change && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {change}
              </p>
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Action Card
function QuickActionCard({ title, description, icon: Icon, color, onClick }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default BuildFinance
