'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  DollarSign, CreditCard, Percent, Tag, Gift, Plus, Edit, Trash2,
  Calendar, Users, TrendingUp, CheckCircle2, XCircle, Clock,
  ArrowUpRight, RefreshCw, Download, Search, Filter, Copy,
  IndianRupee, Receipt, AlertTriangle, Zap
} from 'lucide-react'
import { toast } from 'sonner'

const CouponCard = ({ coupon, onEdit, onDelete, onToggle }) => {
  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date()
  const usagePercent = coupon.maxUses ? (coupon.usedCount / coupon.maxUses) * 100 : 0

  return (
    <motion.div whileHover={{ y: -2 }}>
      <Card className={`border ${isExpired ? 'border-red-200 bg-red-50/50' : coupon.active ? 'border-emerald-200' : 'border-slate-200'}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${coupon.type === 'percent' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                {coupon.type === 'percent' ? (
                  <Percent className="h-5 w-5 text-purple-600" />
                ) : (
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">{coupon.code}</h3>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                    navigator.clipboard.writeText(coupon.code)
                    toast.success('Coupon code copied!')
                  }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-slate-500">{coupon.description}</p>
              </div>
            </div>
            <Switch
              checked={coupon.active && !isExpired}
              onCheckedChange={() => onToggle?.(coupon)}
              disabled={isExpired}
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Badge className={coupon.type === 'percent' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}>
              {coupon.type === 'percent' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
            </Badge>
            {isExpired ? (
              <Badge className="bg-red-100 text-red-700">Expired</Badge>
            ) : coupon.active ? (
              <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
            {coupon.plans && (
              <Badge variant="outline">{coupon.plans}</Badge>
            )}
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Usage</span>
              <span className="font-medium">{coupon.usedCount || 0} / {coupon.maxUses || '∞'}</span>
            </div>
            {coupon.maxUses && (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm pt-3 border-t">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {coupon.expiresAt ? `Expires: ${new Date(coupon.expiresAt).toLocaleDateString()}` : 'No expiry'}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit?.(coupon)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete?.(coupon)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const InvoiceRow = ({ invoice }) => (
  <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-lg transition-colors">
    <div className="p-2 rounded-lg bg-blue-100">
      <Receipt className="h-5 w-5 text-blue-600" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-medium text-slate-900">#{invoice.id}</p>
        <Badge className={invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
          {invoice.status}
        </Badge>
      </div>
      <p className="text-sm text-slate-500">{invoice.client}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-900">₹{invoice.amount.toLocaleString()}</p>
      <p className="text-xs text-slate-500">{invoice.date}</p>
    </div>
    <Button variant="ghost" size="sm">
      <Download className="h-4 w-4" />
    </Button>
  </div>
)

export function BillingCenter() {
  const [coupons, setCoupons] = useState([
    { id: 1, code: 'WELCOME50', description: 'New user welcome offer', type: 'percent', value: 50, maxUses: 100, usedCount: 67, active: true, expiresAt: '2025-01-31', plans: 'All Plans' },
    { id: 2, code: 'ANNUAL20', description: 'Annual subscription discount', type: 'percent', value: 20, maxUses: null, usedCount: 234, active: true, plans: 'Annual Only' },
    { id: 3, code: 'FLAT1000', description: 'Flat ₹1000 off', type: 'fixed', value: 1000, maxUses: 50, usedCount: 50, active: false, expiresAt: '2024-12-31' },
    { id: 4, code: 'ENTERPRISE15', description: 'Enterprise special', type: 'percent', value: 15, maxUses: 20, usedCount: 8, active: true, plans: 'Enterprise' },
  ])

  const [invoices] = useState([
    { id: 'INV-2024-001', client: 'ABC Interiors Pvt Ltd', amount: 24999, status: 'paid', date: 'Dec 10, 2024' },
    { id: 'INV-2024-002', client: 'XYZ Construction Co', amount: 14999, status: 'paid', date: 'Dec 9, 2024' },
    { id: 'INV-2024-003', client: 'Dream Homes Inc', amount: 9999, status: 'pending', date: 'Dec 8, 2024' },
    { id: 'INV-2024-004', client: 'BuildRight Solutions', amount: 24999, status: 'paid', date: 'Dec 7, 2024' },
    { id: 'INV-2024-005', client: 'Urban Spaces Design', amount: 14999, status: 'overdue', date: 'Nov 30, 2024' },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'percent',
    value: '',
    maxUses: '',
    expiresAt: '',
    plans: 'all',
    active: true
  })

  const stats = [
    { title: 'Total Revenue', value: '₹12,45,680', change: '+15.3%', icon: DollarSign, color: 'bg-emerald-500' },
    { title: 'Pending Payments', value: '₹45,800', change: '3 invoices', icon: Clock, color: 'bg-amber-500' },
    { title: 'Active Coupons', value: coupons.filter(c => c.active).length, change: `${coupons.length} total`, icon: Tag, color: 'bg-purple-500' },
    { title: 'Coupon Savings', value: '₹2,34,500', change: 'This month', icon: Gift, color: 'bg-blue-500' },
  ]

  const handleCreateCoupon = () => {
    setEditingCoupon(null)
    setFormData({ code: '', description: '', type: 'percent', value: '', maxUses: '', expiresAt: '', plans: 'all', active: true })
    setIsDialogOpen(true)
  }

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon)
    setFormData(coupon)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (editingCoupon) {
      setCoupons(prev => prev.map(c => c.id === editingCoupon.id ? { ...c, ...formData } : c))
      toast.success('Coupon updated')
    } else {
      setCoupons(prev => [...prev, { ...formData, id: Date.now(), usedCount: 0 }])
      toast.success('Coupon created')
    }
    setIsDialogOpen(false)
  }

  const handleDelete = (coupon) => {
    if (confirm('Delete this coupon?')) {
      setCoupons(prev => prev.filter(c => c.id !== coupon.id))
      toast.success('Coupon deleted')
    }
  }

  const handleToggle = (coupon) => {
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c))
    toast.success(`Coupon ${coupon.active ? 'deactivated' : 'activated'}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing & Revenue</h2>
          <p className="text-slate-500">Manage invoices, payments & promotional codes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.title}</p>
                  <p className="text-xs text-emerald-600 mt-1">{stat.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="coupons" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refunds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{coupons.filter(c => c.active).length} Active</Badge>
            </div>
            <Button onClick={handleCreateCoupon}>
              <Plus className="h-4 w-4 mr-2" /> New Coupon
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onEdit={handleEditCoupon}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Invoices</CardTitle>
                  <CardDescription>View and manage all invoices</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" /> Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Refund Management</h3>
              <p className="text-slate-500 mb-4">Process and track customer refund requests</p>
              <Button>View Refund Requests</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Coupon Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Coupon description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{formData.type === 'percent' ? 'Discount %' : 'Discount Amount (₹)'}</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'percent' ? 'e.g., 20' : 'e.g., 1000'}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Uses (optional)</Label>
                <Input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Applicable Plans</Label>
                <Select value={formData.plans || 'all'} onValueChange={(v) => setFormData({ ...formData, plans: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="annual">Annual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(v) => setFormData({ ...formData, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingCoupon ? 'Update' : 'Create'} Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BillingCenter