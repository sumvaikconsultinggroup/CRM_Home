'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Wallet, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Download,
  Calendar, Clock, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  BarChart3, PieChart, LineChart, DollarSign, IndianRupee, Receipt, FileText,
  Building2, Car, Utensils, Briefcase, Wifi, Phone, Fuel, Package, Users,
  CreditCard, Banknote, ArrowUp, ArrowDown, RefreshCw, Upload, CheckCircle,
  XCircle, AlertCircle, AlertTriangle, Info, Landmark, BookOpen, Calculator,
  Target, Coins, PiggyBank, ChevronRight, ChevronDown, FolderOpen, Settings,
  FileSpreadsheet, Printer, Mail, Share2, Copy, LayoutGrid, List, Table2,
  CalendarDays, CalendarRange, X, Check, Zap, Sparkles
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const EXPENSE_CATEGORIES = [
  { id: 'materials', label: 'Raw Materials', icon: Package, color: 'bg-blue-500', budget: 500000 },
  { id: 'labor', label: 'Labor & Wages', icon: Users, color: 'bg-green-500', budget: 300000 },
  { id: 'transport', label: 'Transport & Logistics', icon: Car, color: 'bg-yellow-500', budget: 100000 },
  { id: 'utilities', label: 'Utilities', icon: Wifi, color: 'bg-purple-500', budget: 50000 },
  { id: 'office', label: 'Office Expenses', icon: Building2, color: 'bg-pink-500', budget: 75000 },
  { id: 'travel', label: 'Travel & Conveyance', icon: Fuel, color: 'bg-orange-500', budget: 50000 },
  { id: 'food', label: 'Food & Refreshments', icon: Utensils, color: 'bg-red-500', budget: 25000 },
  { id: 'communication', label: 'Communication', icon: Phone, color: 'bg-cyan-500', budget: 20000 },
  { id: 'professional', label: 'Professional Services', icon: Briefcase, color: 'bg-indigo-500', budget: 100000 },
  { id: 'maintenance', label: 'Maintenance & Repairs', icon: Settings, color: 'bg-slate-500', budget: 75000 },
  { id: 'petty_cash', label: 'Petty Cash', icon: Coins, color: 'bg-amber-500', budget: 30000 },
  { id: 'miscellaneous', label: 'Miscellaneous', icon: FolderOpen, color: 'bg-gray-500', budget: 50000 }
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { id: 'upi', label: 'UPI', icon: Phone },
  { id: 'cheque', label: 'Cheque', icon: FileText },
  { id: 'petty_cash', label: 'Petty Cash', icon: Coins }
]

const EXPENSE_STATUS = [
  { id: 'pending', label: 'Pending Approval', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  { id: 'approved', label: 'Approved', color: 'bg-green-500', textColor: 'text-green-700' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-700' },
  { id: 'reimbursed', label: 'Reimbursed', color: 'bg-blue-500', textColor: 'text-blue-700' },
  { id: 'paid', label: 'Paid', color: 'bg-emerald-500', textColor: 'text-emerald-700' }
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getMonthYear = (date) => {
  const d = new Date(date)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Expense Card
const ExpenseCard = ({ expense, onView, onEdit, onDelete, onApprove }) => {
  const category = EXPENSE_CATEGORIES.find(c => c.id === expense.category) || EXPENSE_CATEGORIES[11]
  const status = EXPENSE_STATUS.find(s => s.id === expense.status) || EXPENSE_STATUS[0]
  const CategoryIcon = category.icon
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center`}>
            <CategoryIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{expense.description || category.label}</h4>
            <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(expense)}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(expense)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            {expense.status === 'pending' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onApprove(expense, 'approved')} className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onApprove(expense, 'rejected')} className="text-red-600">
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(expense)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-bold">{formatCurrency(expense.amount)}</span>
        <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
      </div>
      
      {expense.vendor && (
        <p className="text-xs text-muted-foreground mt-2">Vendor: {expense.vendor}</p>
      )}
      
      {expense.project && (
        <p className="text-xs text-muted-foreground">Project: {expense.project}</p>
      )}
    </motion.div>
  )
}

// Budget Progress Card
const BudgetCard = ({ category, spent, budget }) => {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const CategoryIcon = category.icon
  const isOverBudget = spent > budget
  
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-8 w-8 rounded-lg ${category.color} flex items-center justify-center`}>
          <CategoryIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">{category.label}</h4>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(spent)} / {formatCurrency(budget)}
          </p>
        </div>
        {isOverBudget && (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        )}
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : ''}`}
      />
      <p className={`text-xs mt-1 ${isOverBudget ? 'text-red-600' : 'text-muted-foreground'}`}>
        {isOverBudget ? `Over budget by ${formatCurrency(spent - budget)}` : `${(100 - percentage).toFixed(0)}% remaining`}
      </p>
    </Card>
  )
}

// Add/Edit Expense Dialog
const ExpenseDialog = ({ open, onClose, expense, onSave, projects = [] }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    vendor: '',
    invoiceNumber: '',
    project: '',
    notes: '',
    status: 'pending',
    attachments: []
  })
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || '',
        date: expense.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        paymentMethod: expense.paymentMethod || 'cash',
        vendor: expense.vendor || '',
        invoiceNumber: expense.invoiceNumber || '',
        project: expense.project || '',
        notes: expense.notes || '',
        status: expense.status || 'pending',
        attachments: expense.attachments || []
      })
    } else {
      setFormData({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        vendor: '',
        invoiceNumber: '',
        project: '',
        notes: '',
        status: 'pending',
        attachments: []
      })
    }
  }, [expense, open])
  
  const handleSave = async () => {
    if (!formData.amount || !formData.category) {
      toast.error('Amount and Category are required')
      return
    }
    
    setSaving(true)
    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount)
      })
      onClose()
    } catch (error) {
      toast.error('Failed to save expense')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Amount and Category */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Amount (₹) *</Label>
              <Input 
                type="number"
                placeholder="0.00"
                className="mt-1 text-lg"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Description */}
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Input 
              placeholder="What was this expense for?"
              className="mt-1"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          {/* Date and Payment Method */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Date</Label>
              <Input 
                type="date"
                className="mt-1"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => {
                    const Icon = method.icon
                    return (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Vendor and Invoice */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Vendor/Payee</Label>
              <Input 
                placeholder="Enter vendor name"
                className="mt-1"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Invoice/Bill Number</Label>
              <Input 
                placeholder="e.g., INV-2025-001"
                className="mt-1"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
          </div>
          
          {/* Project */}
          <div>
            <Label className="text-sm font-medium">Link to Project (Optional)</Label>
            <Select value={formData.project} onValueChange={(v) => setFormData({ ...formData, project: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.name || p.id}>{p.name || p.projectNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea 
              placeholder="Any additional notes..."
              className="mt-1"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Petty Cash Dialog
const PettyCashDialog = ({ open, onClose, pettyCash, onSave }) => {
  const [formData, setFormData] = useState({
    type: 'withdrawal',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: ''
  })
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    if (open) {
      setFormData({
        type: 'withdrawal',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        reference: ''
      })
    }
  }, [open])
  
  const handleSave = async () => {
    if (!formData.amount) {
      toast.error('Amount is required')
      return
    }
    
    setSaving(true)
    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount)
      })
      onClose()
    } catch (error) {
      toast.error('Failed to record petty cash transaction')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Petty Cash Transaction
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Balance */}
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-700">Current Petty Cash Balance</span>
              <span className="text-2xl font-bold text-amber-700">{formatCurrency(pettyCash?.balance || 0)}</span>
            </div>
          </Card>
          
          {/* Transaction Type */}
          <div>
            <Label className="text-sm font-medium">Transaction Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={formData.type === 'withdrawal' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData({ ...formData, type: 'withdrawal' })}
              >
                <ArrowUp className="h-4 w-4 mr-2 text-red-500" />
                Withdrawal
              </Button>
              <Button
                variant={formData.type === 'deposit' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData({ ...formData, type: 'deposit' })}
              >
                <ArrowDown className="h-4 w-4 mr-2 text-green-500" />
                Deposit
              </Button>
            </div>
          </div>
          
          {/* Amount */}
          <div>
            <Label className="text-sm font-medium">Amount (₹) *</Label>
            <Input 
              type="number"
              placeholder="0.00"
              className="mt-1 text-lg"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          
          {/* Description */}
          <div>
            <Label className="text-sm font-medium">Description *</Label>
            <Input 
              placeholder="Purpose of transaction"
              className="mt-1"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          {/* Date */}
          <div>
            <Label className="text-sm font-medium">Date</Label>
            <Input 
              type="date"
              className="mt-1"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Recording...' : 'Record Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// ANALYTICS DASHBOARD
// ============================================

const ExpenseAnalytics = ({ expenses, budgets }) => {
  const [period, setPeriod] = useState('month')
  
  const stats = useMemo(() => {
    const now = new Date()
    let startDate
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterMonth, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(0)
    }
    
    const filteredExpenses = expenses.filter(e => new Date(e.date) >= startDate)
    
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved' || e.status === 'paid' || e.status === 'reimbursed')
    const approvedTotal = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending')
    const pendingTotal = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    // By category
    const byCategory = EXPENSE_CATEGORIES.map(cat => {
      const catExpenses = filteredExpenses.filter(e => e.category === cat.id)
      const spent = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const budget = budgets[cat.id] || cat.budget
      return {
        ...cat,
        spent,
        budget,
        count: catExpenses.length,
        percentage: totalExpenses > 0 ? ((spent / totalExpenses) * 100).toFixed(1) : 0
      }
    }).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent)
    
    // By payment method
    const byPaymentMethod = PAYMENT_METHODS.map(method => {
      const methodExpenses = filteredExpenses.filter(e => e.paymentMethod === method.id)
      const total = methodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      return {
        ...method,
        total,
        count: methodExpenses.length
      }
    }).filter(m => m.total > 0).sort((a, b) => b.total - a.total)
    
    // Monthly trend
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthExpenses = expenses.filter(e => {
        const date = new Date(e.date)
        return date >= monthDate && date <= monthEnd
      })
      monthlyTrend.push({
        month: MONTHS[monthDate.getMonth()],
        total: monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        count: monthExpenses.length
      })
    }
    
    // Top vendors
    const vendorMap = {}
    filteredExpenses.forEach(e => {
      if (e.vendor) {
        vendorMap[e.vendor] = (vendorMap[e.vendor] || 0) + (e.amount || 0)
      }
    })
    const topVendors = Object.entries(vendorMap)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    
    // Total budget
    const totalBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0) ||
                        EXPENSE_CATEGORIES.reduce((sum, c) => sum + c.budget, 0)
    
    return {
      totalExpenses,
      approvedTotal,
      pendingTotal,
      pendingCount: pendingExpenses.length,
      totalBudget,
      budgetUsed: totalBudget > 0 ? ((approvedTotal / totalBudget) * 100).toFixed(1) : 0,
      byCategory,
      byPaymentMethod,
      monthlyTrend,
      topVendors,
      expenseCount: filteredExpenses.length
    }
  }, [expenses, budgets, period])
  
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Expense Analytics
        </h2>
        <div className="flex border rounded-lg p-1">
          {[
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'quarter', label: 'Quarter' },
            { id: 'year', label: 'Year' }
          ].map(p => (
            <Button
              key={p.id}
              variant={period === p.id ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Total Expenses</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-xs text-blue-600">{stats.expenseCount} transactions</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-xs text-green-600 font-medium">Approved</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.approvedTotal)}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <p className="text-xs text-yellow-600 font-medium">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-700">{formatCurrency(stats.pendingTotal)}</p>
          <p className="text-xs text-yellow-600">{stats.pendingCount} items</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Total Budget</p>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.totalBudget)}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-xs text-orange-600 font-medium">Budget Used</p>
          <p className="text-2xl font-bold text-orange-700">{stats.budgetUsed}%</p>
          <Progress value={parseFloat(stats.budgetUsed)} className="h-1 mt-1" />
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <p className="text-xs text-slate-600 font-medium">Remaining</p>
          <p className="text-2xl font-bold text-slate-700">{formatCurrency(stats.totalBudget - stats.approvedTotal)}</p>
        </Card>
      </div>
      
      {/* Monthly Trend */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <LineChart className="h-5 w-5" /> Monthly Expense Trend
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {stats.monthlyTrend.map((month, i) => {
            const maxTotal = Math.max(...stats.monthlyTrend.map(m => m.total))
            const barHeight = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0
            return (
              <div key={month.month} className="text-center">
                <div className="h-32 flex items-end justify-center mb-2">
                  <div 
                    className="w-full max-w-12 bg-primary rounded-t transition-all"
                    style={{ height: `${barHeight}%`, minHeight: month.total > 0 ? '8px' : '0' }}
                  />
                </div>
                <p className="text-xs font-medium">{month.month}</p>
                <p className="text-sm font-bold">{formatCurrency(month.total)}</p>
                <p className="text-xs text-muted-foreground">{month.count} txns</p>
              </div>
            )
          })}
        </div>
      </Card>
      
      {/* Category & Vendor Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Category */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5" /> Expenses by Category
          </h3>
          <div className="space-y-3">
            {stats.byCategory.slice(0, 6).map(cat => {
              const Icon = cat.icon
              const maxSpent = Math.max(...stats.byCategory.map(c => c.spent))
              const barWidth = maxSpent > 0 ? (cat.spent / maxSpent) * 100 : 0
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg ${cat.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium truncate">{cat.label}</span>
                      <span className="text-sm font-bold">{formatCurrency(cat.spent)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${cat.color} transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{cat.percentage}%</span>
                </div>
              )
            })}
          </div>
        </Card>
        
        {/* Top Vendors */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Top Vendors
          </h3>
          {stats.topVendors.length > 0 ? (
            <div className="space-y-3">
              {stats.topVendors.map((vendor, i) => (
                <div key={vendor.vendor} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium">{vendor.vendor}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(vendor.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No vendor data available</p>
          )}
        </Card>
      </div>
      
      {/* Budget Overview */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" /> Budget vs Actual
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.byCategory.slice(0, 8).map(cat => (
            <BudgetCard key={cat.id} category={cat} spent={cat.spent} budget={cat.budget} />
          ))}
        </div>
      </Card>
    </div>
  )
}

// ============================================
// LEDGER VIEW
// ============================================

const LedgerView = ({ expenses, onExport }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  
  const ledgerData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const monthExpenses = expenses.filter(e => {
      const date = new Date(e.date)
      return date >= startDate && date <= endDate
    }).sort((a, b) => new Date(a.date) - new Date(b.date))
    
    const entries = monthExpenses.reduce((acc, e, i) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].runningBalance : 0
      acc.push({
        ...e,
        serialNo: i + 1,
        runningBalance: prevBalance + (e.amount || 0)
      })
      return acc
    }, [])
    
    const totalDebit = entries.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    // Group by category
    const byCategory = {}
    entries.forEach(e => {
      if (!byCategory[e.category]) {
        byCategory[e.category] = 0
      }
      byCategory[e.category] += e.amount || 0
    })
    
    return {
      entries,
      totalDebit,
      byCategory,
      month: MONTHS[month - 1],
      year
    }
  }, [expenses, selectedMonth])
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Monthly Ledger
        </h2>
        <div className="flex items-center gap-2">
          <Input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={() => onExport(ledgerData, 'ledger')}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-600">Total Expenses</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(ledgerData.totalDebit)}</p>
          <p className="text-xs text-blue-600">{ledgerData.entries.length} transactions</p>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-600">Period</p>
          <p className="text-2xl font-bold text-green-700">{ledgerData.month} {ledgerData.year}</p>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-200">
          <p className="text-sm text-purple-600">Categories</p>
          <p className="text-2xl font-bold text-purple-700">{Object.keys(ledgerData.byCategory).length}</p>
        </Card>
      </div>
      
      {/* Ledger Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left text-xs font-semibold">S.No</th>
                <th className="p-3 text-left text-xs font-semibold">Date</th>
                <th className="p-3 text-left text-xs font-semibold">Description</th>
                <th className="p-3 text-left text-xs font-semibold">Category</th>
                <th className="p-3 text-left text-xs font-semibold">Vendor</th>
                <th className="p-3 text-right text-xs font-semibold">Debit (₹)</th>
                <th className="p-3 text-right text-xs font-semibold">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledgerData.entries.map(entry => {
                const category = EXPENSE_CATEGORIES.find(c => c.id === entry.category)
                return (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm">{entry.serialNo}</td>
                    <td className="p-3 text-sm">{formatDate(entry.date)}</td>
                    <td className="p-3 text-sm font-medium">{entry.description || '-'}</td>
                    <td className="p-3 text-sm">
                      <Badge variant="outline" className="text-xs">{category?.label || entry.category}</Badge>
                    </td>
                    <td className="p-3 text-sm">{entry.vendor || '-'}</td>
                    <td className="p-3 text-sm text-right font-medium text-red-600">{formatCurrency(entry.amount)}</td>
                    <td className="p-3 text-sm text-right font-medium">{formatCurrency(entry.runningBalance)}</td>
                  </tr>
                )
              })}
              {ledgerData.entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No expenses recorded for this month
                  </td>
                </tr>
              )}
            </tbody>
            {ledgerData.entries.length > 0 && (
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td colSpan={5} className="p-3 text-right">Total:</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(ledgerData.totalDebit)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      
      {/* Category Breakdown */}
      {Object.keys(ledgerData.byCategory).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Category-wise Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(ledgerData.byCategory).map(([catId, amount]) => {
              const category = EXPENSE_CATEGORIES.find(c => c.id === catId)
              const Icon = category?.icon || FolderOpen
              return (
                <div key={catId} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <div className={`h-8 w-8 rounded-lg ${category?.color || 'bg-gray-500'} flex items-center justify-center`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{category?.label || catId}</p>
                    <p className="font-semibold text-sm">{formatCurrency(amount)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// FORECASTING VIEW
// ============================================

const ForecastingView = ({ expenses, budgets }) => {
  const forecast = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysPassed = now.getDate()
    const daysRemaining = daysInMonth - daysPassed
    
    // Current month expenses
    const monthStart = new Date(currentYear, currentMonth, 1)
    const currentMonthExpenses = expenses.filter(e => new Date(e.date) >= monthStart)
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    // Average daily spend
    const avgDailySpend = daysPassed > 0 ? currentMonthTotal / daysPassed : 0
    
    // Projected month end
    const projectedMonthEnd = currentMonthTotal + (avgDailySpend * daysRemaining)
    
    // Last 3 months average
    const lastThreeMonths = []
    for (let i = 1; i <= 3; i++) {
      const monthStart = new Date(currentYear, currentMonth - i, 1)
      const monthEnd = new Date(currentYear, currentMonth - i + 1, 0)
      const monthExpenses = expenses.filter(e => {
        const date = new Date(e.date)
        return date >= monthStart && date <= monthEnd
      })
      const total = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      lastThreeMonths.push({
        month: MONTHS[monthStart.getMonth()],
        total
      })
    }
    const avgMonthlySpend = lastThreeMonths.reduce((sum, m) => sum + m.total, 0) / 3
    
    // Total budget
    const totalBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0) ||
                        EXPENSE_CATEGORIES.reduce((sum, c) => sum + c.budget, 0)
    
    // Category forecasts
    const categoryForecasts = EXPENSE_CATEGORIES.map(cat => {
      const catExpenses = currentMonthExpenses.filter(e => e.category === cat.id)
      const spent = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const dailyRate = daysPassed > 0 ? spent / daysPassed : 0
      const projected = spent + (dailyRate * daysRemaining)
      const budget = budgets[cat.id] || cat.budget
      
      return {
        ...cat,
        spent,
        projected,
        budget,
        variance: budget - projected,
        status: projected > budget ? 'over' : projected > budget * 0.8 ? 'warning' : 'ok'
      }
    }).filter(c => c.spent > 0 || c.projected > 0)
    
    return {
      currentMonthTotal,
      projectedMonthEnd,
      avgDailySpend,
      avgMonthlySpend,
      totalBudget,
      daysRemaining,
      daysPassed,
      lastThreeMonths,
      categoryForecasts,
      projectedSavings: totalBudget - projectedMonthEnd,
      projectedOverage: projectedMonthEnd > totalBudget ? projectedMonthEnd - totalBudget : 0
    }
  }, [expenses, budgets])
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Sparkles className="h-5 w-5" /> Expense Forecasting
      </h2>
      
      {/* Forecast Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Spent So Far</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(forecast.currentMonthTotal)}</p>
          <p className="text-xs text-blue-600">{forecast.daysPassed} days elapsed</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Projected Month End</p>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(forecast.projectedMonthEnd)}</p>
          <p className="text-xs text-purple-600">{forecast.daysRemaining} days remaining</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-xs text-orange-600 font-medium">Daily Average</p>
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(forecast.avgDailySpend)}</p>
          <p className="text-xs text-orange-600">per day</p>
        </Card>
        
        <Card className={`p-4 ${forecast.projectedOverage > 0 
          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
          : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}`}>
          <p className={`text-xs font-medium ${forecast.projectedOverage > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {forecast.projectedOverage > 0 ? 'Projected Overage' : 'Projected Savings'}
          </p>
          <p className={`text-2xl font-bold ${forecast.projectedOverage > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {formatCurrency(forecast.projectedOverage > 0 ? forecast.projectedOverage : forecast.projectedSavings)}
          </p>
          <p className={`text-xs ${forecast.projectedOverage > 0 ? 'text-red-600' : 'text-green-600'}`}>
            vs budget of {formatCurrency(forecast.totalBudget)}
          </p>
        </Card>
      </div>
      
      {/* Budget vs Projected */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Budget vs Projected by Category</h3>
        <div className="space-y-4">
          {forecast.categoryForecasts.map(cat => {
            const Icon = cat.icon
            const budgetPercent = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0
            const projectedPercent = cat.budget > 0 ? Math.min((cat.projected / cat.budget) * 100, 150) : 0
            
            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${cat.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">{cat.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(cat.spent)} spent</p>
                    <p className="text-xs text-muted-foreground">
                      Projected: {formatCurrency(cat.projected)} / Budget: {formatCurrency(cat.budget)}
                    </p>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  {/* Budget line */}
                  <div className="absolute h-full w-full">
                    <div className="absolute right-0 top-0 h-full w-0.5 bg-slate-400" style={{ left: `${Math.min(100, (cat.budget / (cat.projected > cat.budget ? cat.projected : cat.budget)) * 100)}%` }} />
                  </div>
                  {/* Projected bar */}
                  <div 
                    className={`h-full transition-all ${cat.status === 'over' ? 'bg-red-400' : cat.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'}`}
                    style={{ width: `${Math.min(projectedPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={cat.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                    {cat.variance < 0 ? `${formatCurrency(Math.abs(cat.variance))} over budget` : `${formatCurrency(cat.variance)} under budget`}
                  </span>
                  <span className="text-muted-foreground">
                    {cat.status === 'over' && <AlertTriangle className="h-3 w-3 inline text-red-500" />}
                    {cat.status === 'warning' && <AlertCircle className="h-3 w-3 inline text-yellow-500" />}
                    {cat.status === 'ok' && <CheckCircle className="h-3 w-3 inline text-green-500" />}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      
      {/* Historical Comparison */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Last 3 Months Comparison</h3>
        <div className="grid grid-cols-3 gap-4">
          {forecast.lastThreeMonths.map((month, i) => (
            <div key={month.month} className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{month.month}</p>
              <p className="text-xl font-bold">{formatCurrency(month.total)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <Zap className="h-4 w-4 inline mr-1" />
            3-month average: <strong>{formatCurrency(forecast.avgMonthlySpend)}</strong>
            {forecast.projectedMonthEnd > forecast.avgMonthlySpend && (
              <span className="text-red-600 ml-2">
                (Current month is {((forecast.projectedMonthEnd / forecast.avgMonthlySpend - 1) * 100).toFixed(0)}% higher)
              </span>
            )}
          </p>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AdvancedExpenseManagement({
  expenses: initialExpenses = [],
  user,
  projects = [],
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onRefresh
}) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [activeTab, setActiveTab] = useState('overview')
  const [activeView, setActiveView] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [showPettyCashDialog, setShowPettyCashDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    paymentMethod: 'all',
    dateRange: 'all'
  })
  const [budgets, setBudgets] = useState(() => {
    const defaultBudgets = {}
    EXPENSE_CATEGORIES.forEach(c => { defaultBudgets[c.id] = c.budget })
    return defaultBudgets
  })
  const [pettyCash, setPettyCash] = useState({ balance: 30000, transactions: [], initialFund: 30000 })

  useEffect(() => {
    setExpenses(initialExpenses)
  }, [initialExpenses])
  
  // Calculate actual petty cash balance based on expenses
  const actualPettyCashBalance = useMemo(() => {
    const pettyCashExpenses = expenses.filter(e => e.paymentMethod === 'petty_cash')
    const totalSpent = pettyCashExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    // Add any deposits from transactions
    const deposits = pettyCash.transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    return pettyCash.initialFund + deposits - totalSpent
  }, [expenses, pettyCash.transactions, pettyCash.initialFund])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses]
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e => 
        e.description?.toLowerCase().includes(term) ||
        e.vendor?.toLowerCase().includes(term) ||
        e.invoiceNumber?.toLowerCase().includes(term)
      )
    }
    
    if (filters.category !== 'all') {
      result = result.filter(e => e.category === filters.category)
    }
    
    if (filters.status !== 'all') {
      result = result.filter(e => e.status === filters.status)
    }
    
    if (filters.paymentMethod !== 'all') {
      result = result.filter(e => e.paymentMethod === filters.paymentMethod)
    }
    
    if (filters.dateRange !== 'all') {
      const now = new Date()
      let startDate
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3
          startDate = new Date(now.getFullYear(), quarterMonth, 1)
          break
        default:
          startDate = null
      }
      if (startDate) {
        result = result.filter(e => new Date(e.date) >= startDate)
      }
    }
    
    return result.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [expenses, searchTerm, filters])

  // Stats
  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const pending = expenses.filter(e => e.status === 'pending').length
    const thisMonth = expenses.filter(e => {
      const now = new Date()
      const expDate = new Date(e.date)
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    }).reduce((sum, e) => sum + (e.amount || 0), 0)
    
    return { total, pending, thisMonth, count: expenses.length }
  }, [expenses])

  // Handle save expense
  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, data)
        setExpenses(expenses.map(e => e.id === editingExpense.id ? { ...e, ...data } : e))
        toast.success('Expense updated successfully')
      } else {
        const response = await api.createExpense(data)
        setExpenses([response.expense || response, ...expenses])
        toast.success('Expense added successfully')
      }
      setEditingExpense(null)
      if (onRefresh) onRefresh()
    } catch (error) {
      throw error
    }
  }

  // Handle approve/reject
  const handleApprove = async (expense, status) => {
    try {
      await api.updateExpense(expense.id, { status })
      setExpenses(expenses.map(e => e.id === expense.id ? { ...e, status } : e))
      toast.success(`Expense ${status === 'approved' ? 'approved' : 'rejected'}`)
    } catch (error) {
      toast.error('Failed to update expense status')
    }
  }

  // Handle delete
  const handleDelete = async (expense) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      await api.deleteExpense(expense.id)
      setExpenses(expenses.filter(e => e.id !== expense.id))
      toast.success('Expense deleted')
    } catch (error) {
      toast.error('Failed to delete expense')
    }
  }

  // Handle petty cash transaction
  const handlePettyCashTransaction = async (data) => {
    const newBalance = data.type === 'deposit' 
      ? pettyCash.balance + data.amount 
      : pettyCash.balance - data.amount
    
    if (data.type === 'withdrawal' && data.amount > pettyCash.balance) {
      toast.error('Insufficient petty cash balance')
      return
    }
    
    const transaction = {
      id: Date.now().toString(),
      ...data,
      timestamp: new Date().toISOString()
    }
    
    setPettyCash({
      balance: newBalance,
      transactions: [transaction, ...pettyCash.transactions]
    })
    
    // If withdrawal, also create an expense
    if (data.type === 'withdrawal') {
      await handleSaveExpense({
        description: data.description,
        amount: data.amount,
        category: 'petty_cash',
        date: data.date,
        paymentMethod: 'petty_cash',
        status: 'paid'
      })
    }
    
    toast.success(`Petty cash ${data.type} recorded`)
  }

  // Export function
  const handleExport = (data, type) => {
    let csvContent = ''
    
    if (type === 'ledger') {
      csvContent = 'S.No,Date,Description,Category,Vendor,Amount,Running Balance\n'
      data.entries.forEach(e => {
        const category = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label || e.category
        csvContent += `${e.serialNo},${formatDate(e.date)},"${e.description || ''}","${category}","${e.vendor || ''}",${e.amount},${e.runningBalance}\n`
      })
    } else {
      csvContent = 'Date,Description,Category,Amount,Status,Vendor,Payment Method\n'
      filteredExpenses.forEach(e => {
        const category = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label || e.category
        const status = EXPENSE_STATUS.find(s => s.id === e.status)?.label || e.status
        const paymentMethod = PAYMENT_METHODS.find(p => p.id === e.paymentMethod)?.label || e.paymentMethod
        csvContent += `${formatDate(e.date)},"${e.description || ''}","${category}",${e.amount},"${status}","${e.vendor || ''}","${paymentMethod}"\n`
      })
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses_${type}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Export downloaded')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-7 w-7 text-primary" />
              Expense Management
              <Badge variant="outline" className="ml-2">Enterprise</Badge>
            </h1>
            <p className="text-muted-foreground">Track, manage, and forecast your business expenses</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowPettyCashDialog(true)}>
              <Coins className="h-4 w-4 mr-2" /> Petty Cash
              <Badge className="ml-2 bg-amber-500">{formatCurrency(actualPettyCashBalance)}</Badge>
            </Button>
            <Button variant="outline" onClick={() => handleExport(null, 'expenses')}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button onClick={() => { setEditingExpense(null); setShowExpenseDialog(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add Expense
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Ledger
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {stats.pending > 0 && (
                <Badge className="bg-yellow-500 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Controls */}
      {['overview', 'pending'].includes(activeTab) && (
        <div className="p-4 bg-white border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex border rounded-lg p-1">
              <Button 
                variant={activeView === 'grid' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={activeView === 'list' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button variant={showFilters ? 'secondary' : 'outline'} onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" /> Filters
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && ['overview', 'pending'].includes(activeTab) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b overflow-hidden"
          >
            <div className="p-4 grid md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {EXPENSE_STATUS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={filters.paymentMethod} onValueChange={(v) => setFilters({ ...filters, paymentMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date Range</Label>
                <Select value={filters.dateRange} onValueChange={(v) => setFilters({ ...filters, dateRange: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilters({ category: 'all', status: 'all', paymentMethod: 'all', dateRange: 'all' })}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
                <p className="text-xs text-muted-foreground">{stats.count} transactions</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Petty Cash</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(actualPettyCashBalance)}</p>
              </Card>
            </div>
            
            {/* Expense Grid/List */}
            {activeView === 'grid' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExpenses.map(expense => (
                  <ExpenseCard 
                    key={expense.id}
                    expense={expense}
                    onView={setSelectedExpense}
                    onEdit={(e) => { setEditingExpense(e); setShowExpenseDialog(true) }}
                    onDelete={handleDelete}
                    onApprove={handleApprove}
                  />
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Date</th>
                        <th className="p-3 text-left text-sm font-medium">Description</th>
                        <th className="p-3 text-left text-sm font-medium">Category</th>
                        <th className="p-3 text-right text-sm font-medium">Amount</th>
                        <th className="p-3 text-left text-sm font-medium">Status</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredExpenses.map(expense => {
                        const category = EXPENSE_CATEGORIES.find(c => c.id === expense.category)
                        const status = EXPENSE_STATUS.find(s => s.id === expense.status)
                        return (
                          <tr key={expense.id} className="hover:bg-slate-50">
                            <td className="p-3 text-sm">{formatDate(expense.date)}</td>
                            <td className="p-3 text-sm font-medium">{expense.description || '-'}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline">{category?.label}</Badge>
                            </td>
                            <td className="p-3 text-sm text-right font-bold">{formatCurrency(expense.amount)}</td>
                            <td className="p-3">
                              <Badge className={`${status?.color} text-white text-xs`}>{status?.label}</Badge>
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingExpense(expense); setShowExpenseDialog(true) }}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(expense)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            
            {filteredExpenses.length === 0 && (
              <Card className="p-12 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                <p className="text-muted-foreground mb-4">Add your first expense to get started</p>
                <Button onClick={() => setShowExpenseDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Expense
                </Button>
              </Card>
            )}
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <ExpenseAnalytics expenses={expenses} budgets={budgets} />
        )}
        
        {activeTab === 'ledger' && (
          <LedgerView expenses={expenses} onExport={handleExport} />
        )}
        
        {activeTab === 'forecast' && (
          <ForecastingView expenses={expenses} budgets={budgets} />
        )}
        
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            {filteredExpenses.filter(e => e.status === 'pending').length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending expenses to approve</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExpenses.filter(e => e.status === 'pending').map(expense => (
                  <ExpenseCard 
                    key={expense.id}
                    expense={expense}
                    onView={setSelectedExpense}
                    onEdit={(e) => { setEditingExpense(e); setShowExpenseDialog(true) }}
                    onDelete={handleDelete}
                    onApprove={handleApprove}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={showExpenseDialog}
        onClose={() => { setShowExpenseDialog(false); setEditingExpense(null) }}
        expense={editingExpense}
        onSave={handleSaveExpense}
        projects={projects}
      />
      
      <PettyCashDialog
        open={showPettyCashDialog}
        onClose={() => setShowPettyCashDialog(false)}
        pettyCash={pettyCash}
        onSave={handlePettyCashTransaction}
      />
    </div>
  )
}

export default AdvancedExpenseManagement
