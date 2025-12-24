'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Building2, TrendingUp, MapPin, Plus, Search, Filter, RefreshCw, Eye,
  Edit, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle, Phone, Mail,
  CreditCard, IndianRupee, Star, Award, ChevronRight, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Tier Badge Colors
const tierColors = {
  bronze: 'bg-orange-100 text-orange-700 border-orange-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-200',
  gold: 'bg-amber-100 text-amber-700 border-amber-200',
  platinum: 'bg-purple-100 text-purple-700 border-purple-200'
}

// Status Badge Colors
const statusColors = {
  pending_approval: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-slate-200 text-slate-600',
  inactive: 'bg-slate-100 text-slate-500'
}

export function DealersTab({ headers, glassStyles }) {
  const [dealers, setDealers] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({})
  const [tiers, setTiers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Dialog states
  const [showAddDealer, setShowAddDealer] = useState(false)
  const [showDealerDetail, setShowDealerDetail] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    gstNumber: '',
    territory: '',
    tier: 'bronze',
    creditLimit: 100000,
    notes: '',
    autoApprove: false,
    address: { line1: '', city: '', state: '', pincode: '' }
  })

  useEffect(() => {
    fetchDealers()
  }, [])

  const fetchDealers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/dealers`, { headers })
      const data = await res.json()
      if (data.dealers) setDealers(data.dealers)
      if (data.summary) setSummary(data.summary)
      if (data.tiers) setTiers(data.tiers)
    } catch (error) {
      console.error('Failed to fetch dealers:', error)
      toast.error('Failed to load dealers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDealer = async () => {
    if (!formData.companyName) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/dealers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create', ...formData })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Dealer created successfully')
        setShowAddDealer(false)
        setFormData({
          companyName: '', contactPerson: '', email: '', phone: '',
          gstNumber: '', territory: '', tier: 'bronze', creditLimit: 100000,
          notes: '', autoApprove: false, address: { line1: '', city: '', state: '', pincode: '' }
        })
        fetchDealers()
      } else {
        toast.error(data.error || 'Failed to create dealer')
      }
    } catch (error) {
      toast.error('Failed to create dealer')
    } finally {
      setSaving(false)
    }
  }

  const handleApproveDealer = async (dealerId) => {
    try {
      const res = await fetch(`${API_BASE}/dealers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'approve', dealerId })
      })
      if (res.ok) {
        toast.success('Dealer approved')
        fetchDealers()
      }
    } catch (error) {
      toast.error('Failed to approve dealer')
    }
  }

  const handleSuspendDealer = async (dealerId, reason) => {
    try {
      const res = await fetch(`${API_BASE}/dealers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'suspend', dealerId, reason })
      })
      if (res.ok) {
        toast.success('Dealer suspended')
        fetchDealers()
      }
    } catch (error) {
      toast.error('Failed to suspend dealer')
    }
  }

  const handleChangeTier = async (dealerId, newTier) => {
    try {
      const res = await fetch(`${API_BASE}/dealers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'change_tier', dealerId, newTier })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Tier updated')
        fetchDealers()
      }
    } catch (error) {
      toast.error('Failed to change tier')
    }
  }

  // Filter dealers
  const filteredDealers = dealers.filter(dealer => {
    const matchesSearch = !searchTerm || 
      dealer.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.dealerCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = tierFilter === 'all' || dealer.tier === tierFilter
    const matchesStatus = statusFilter === 'all' || dealer.status === statusFilter
    return matchesSearch && matchesTier && matchesStatus
  })

  if (loading) {
    return (
      <Card className={glassStyles?.card}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className={glassStyles?.card}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Dealer Network Management
              </CardTitle>
              <CardDescription>Manage your authorized dealers, distributors, and fabricators</CardDescription>
            </div>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
              onClick={() => setShowAddDealer(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Dealer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700">{summary.totalDealers || 0}</p>
                <p className="text-sm text-purple-600">Total Dealers</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-700">{summary.byStatus?.active || 0}</p>
                <p className="text-sm text-emerald-600">Active</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700">{summary.pendingApprovals || 0}</p>
                <p className="text-sm text-amber-600">Pending Approval</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <IndianRupee className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">₹{((summary.totalCreditLimit || 0) / 100000).toFixed(1)}L</p>
                <p className="text-sm text-blue-600">Total Credit</p>
              </CardContent>
            </Card>
          </div>

          {/* Tier Distribution */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
              <div key={tier} className={`p-3 rounded-lg border ${tierColors[tier]}`}>
                <div className="flex items-center justify-between">
                  <span className="capitalize font-medium">{tier}</span>
                  <span className="font-bold">{summary.byTier?.[tier] || 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search dealers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchDealers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Dealers Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Dealer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDealers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No dealers found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDealers.map(dealer => (
                    <TableRow key={dealer.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{dealer.companyName}</p>
                            <p className="text-xs text-slate-500">{dealer.dealerCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{dealer.contactPerson}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="h-3 w-3" /> {dealer.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {dealer.territory || dealer.address?.city || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={tierColors[dealer.tier]}>
                          {dealer.tier?.charAt(0).toUpperCase() + dealer.tier?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₹{(dealer.creditLimit / 1000).toFixed(0)}K</p>
                          <div className="flex items-center gap-1">
                            <Progress value={dealer.creditUtilization || 0} className="w-16 h-1" />
                            <span className="text-xs text-slate-500">{dealer.creditUtilization || 0}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[dealer.status]}>
                          {dealer.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedDealer(dealer); setShowDealerDetail(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {dealer.status === 'pending_approval' && (
                            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => handleApproveDealer(dealer.id)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dealer Dialog */}
      <Dialog open={showAddDealer} onOpenChange={setShowAddDealer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Dealer</DialogTitle>
            <DialogDescription>Register a new dealer in your network</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="ABC Windows Pvt Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="dealer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="29AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label>Territory/City</Label>
              <Input
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label>Starting Tier</Label>
              <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze (5% discount)</SelectItem>
                  <SelectItem value="silver">Silver (10% discount)</SelectItem>
                  <SelectItem value="gold">Gold (15% discount)</SelectItem>
                  <SelectItem value="platinum">Platinum (20% discount)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credit Limit (₹)</Label>
              <Input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this dealer..."
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="autoApprove"
                checked={formData.autoApprove}
                onChange={(e) => setFormData({ ...formData, autoApprove: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="autoApprove" className="cursor-pointer">Auto-approve (skip approval workflow)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDealer(false)}>Cancel</Button>
            <Button onClick={handleCreateDealer} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Dealer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dealer Detail Dialog */}
      <Dialog open={showDealerDetail} onOpenChange={setShowDealerDetail}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              {selectedDealer?.companyName}
            </DialogTitle>
            <DialogDescription>{selectedDealer?.dealerCode}</DialogDescription>
          </DialogHeader>
          {selectedDealer && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Tier</p>
                  <Badge className={`mt-1 ${tierColors[selectedDealer.tier]}`}>
                    {selectedDealer.tier?.charAt(0).toUpperCase() + selectedDealer.tier?.slice(1)}
                  </Badge>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Credit Limit</p>
                  <p className="text-xl font-bold">₹{(selectedDealer.creditLimit / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Credit Used</p>
                  <p className="text-xl font-bold">₹{((selectedDealer.creditUsed || 0) / 1000).toFixed(0)}K</p>
                  <Progress value={selectedDealer.creditUtilization || 0} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Contact Person</Label>
                  <p className="font-medium">{selectedDealer.contactPerson || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Email</Label>
                  <p className="font-medium">{selectedDealer.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Phone</Label>
                  <p className="font-medium">{selectedDealer.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">GST Number</Label>
                  <p className="font-medium">{selectedDealer.gstNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Territory</Label>
                  <p className="font-medium">{selectedDealer.territory || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <Badge className={statusColors[selectedDealer.status]}>{selectedDealer.status?.replace('_', ' ')}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Label className="text-slate-500">Change Tier:</Label>
                {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
                  <Button
                    key={tier}
                    variant={selectedDealer.tier === tier ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => handleChangeTier(selectedDealer.id, tier)}
                  >
                    {tier}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedDealer?.status === 'active' && (
              <Button variant="destructive" onClick={() => handleSuspendDealer(selectedDealer.id, 'Manual suspension')}>
                Suspend Dealer
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDealerDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DealersTab
