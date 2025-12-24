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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  IndianRupee, TrendingUp, TrendingDown, Clock, AlertTriangle, Phone, Calendar,
  CheckCircle2, XCircle, Search, RefreshCw, Plus, Eye, FileText, Users, Building2,
  Mail, Loader2, CreditCard, Wallet, Banknote, ChevronRight, Bell, AlertOctagon
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Aging Bucket Colors
const agingColors = {
  current: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '1-30': 'bg-amber-100 text-amber-700 border-amber-200',
  '31-60': 'bg-orange-100 text-orange-700 border-orange-200',
  '61-90': 'bg-red-100 text-red-700 border-red-200',
  '90+': 'bg-red-200 text-red-800 border-red-300'
}

export function CollectionsTab({ headers, glassStyles }) {
  const [activeView, setActiveView] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({})
  const [aging, setAging] = useState({})
  const [topOverdue, setTopOverdue] = useState([])
  const [dealerData, setDealerData] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dialog states
  const [showRecordPayment, setShowRecordPayment] = useState(false)
  const [showCreateFollowUp, setShowCreateFollowUp] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Payment form
  const [paymentData, setPaymentData] = useState({
    invoiceId: '',
    amount: 0,
    paymentMethod: 'bank_transfer',
    reference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
  // Follow-up form
  const [followUpData, setFollowUpData] = useState({
    invoiceId: '',
    dealerId: '',
    scheduledDate: '',
    type: 'call',
    priority: 'medium',
    notes: ''
  })

  useEffect(() => {
    fetchCollectionsData()
  }, [activeView])

  const fetchCollectionsData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/collections?view=${activeView}`, { headers })
      const data = await res.json()
      
      if (activeView === 'summary') {
        if (data.summary) setSummary(data.summary)
        if (data.aging) setAging(data.aging)
        if (data.topOverdue) setTopOverdue(data.topOverdue)
      } else if (activeView === 'dealer') {
        if (data.dealers) setDealerData(data.dealers)
        if (data.summary) setSummary(data.summary)
      } else if (activeView === 'followups') {
        if (data.followUps) setFollowUps(data.followUps)
        if (data.stats) setSummary(prev => ({ ...prev, ...data.stats }))
      } else if (activeView === 'aging') {
        if (data.aging) setAging(data.aging)
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
      toast.error('Failed to load collections data')
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentData.invoiceId || !paymentData.amount) {
      toast.error('Invoice and amount are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'record_payment', ...paymentData })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Payment recorded')
        setShowRecordPayment(false)
        setPaymentData({
          invoiceId: '', amount: 0, paymentMethod: 'bank_transfer',
          reference: '', paymentDate: new Date().toISOString().split('T')[0], notes: ''
        })
        fetchCollectionsData()
      } else {
        toast.error(data.error || 'Failed to record payment')
      }
    } catch (error) {
      toast.error('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateFollowUp = async () => {
    if (!followUpData.scheduledDate) {
      toast.error('Scheduled date is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create_followup', ...followUpData })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Follow-up created')
        setShowCreateFollowUp(false)
        setFollowUpData({ invoiceId: '', dealerId: '', scheduledDate: '', type: 'call', priority: 'medium', notes: '' })
        fetchCollectionsData()
      } else {
        toast.error(data.error || 'Failed to create follow-up')
      }
    } catch (error) {
      toast.error('Failed to create follow-up')
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteFollowUp = async (followUpId, outcome) => {
    try {
      const res = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'complete_followup', followUpId, outcome })
      })
      if (res.ok) {
        toast.success('Follow-up completed')
        fetchCollectionsData()
      }
    } catch (error) {
      toast.error('Failed to complete follow-up')
    }
  }

  if (loading && activeView === 'summary') {
    return (
      <Card className={glassStyles?.card}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
                <IndianRupee className="h-5 w-5 text-emerald-600" />
                Collections & AR Management
              </CardTitle>
              <CardDescription>Track outstanding amounts, aging, and collection follow-ups</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateFollowUp(true)}>
                <Bell className="h-4 w-4 mr-2" /> Create Follow-up
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowRecordPayment(true)}>
                <Plus className="h-4 w-4 mr-2" /> Record Payment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* View Tabs */}
          <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
              <TabsTrigger value="dealer">By Dealer</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            </TabsList>

            {/* Summary View */}
            <TabsContent value="summary" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Total Invoiced</p>
                        <p className="text-xl font-bold text-blue-700">₹{((summary.totalInvoiced || 0) / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600">Collected</p>
                        <p className="text-xl font-bold text-emerald-700">₹{((summary.totalCollected || 0) / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-orange-600">Outstanding</p>
                        <p className="text-xl font-bold text-orange-700">₹{((summary.totalOutstanding || 0) / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-red-600">Overdue</p>
                        <p className="text-xl font-bold text-red-700">₹{((summary.overdueAmount || 0) / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Collection Rate */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Collection Rate</span>
                    <span className="text-sm font-bold">{summary.collectionRate || 0}%</span>
                  </div>
                  <Progress value={summary.collectionRate || 0} className="h-3" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Efficiency: {summary.collectionEfficiency || 0}%</span>
                    <span>This Month: ₹{((summary.thisMonthCollected || 0) / 100000).toFixed(1)}L</span>
                  </div>
                </CardContent>
              </Card>

              {/* Aging Buckets */}
              <div>
                <h3 className="font-semibold mb-3">Aging Summary</h3>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(aging).map(([bucket, data]) => (
                    <Card key={bucket} className={`${agingColors[bucket]} border`}>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs opacity-80">{data.name || bucket}</p>
                        <p className="text-lg font-bold">₹{((data.amount || 0) / 1000).toFixed(0)}K</p>
                        <p className="text-xs">{data.count || 0} invoices</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Top Overdue */}
              {topOverdue.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Top Overdue Accounts</h3>
                  <div className="space-y-2">
                    {topOverdue.slice(0, 5).map(item => (
                      <Card key={item.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-slate-400" />
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.count} invoices overdue</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">₹{(item.amount / 1000).toFixed(0)}K</p>
                            <Button variant="ghost" size="sm" className="text-xs h-6">
                              <Phone className="h-3 w-3 mr-1" /> Call
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Aging View */}
            <TabsContent value="aging" className="space-y-4">
              {Object.entries(aging).map(([bucket, data]) => (
                <Card key={bucket} className={`border-l-4 ${agingColors[bucket]?.replace('bg-', 'border-l-').replace('-100', '-500')}`}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{data.name || bucket}</CardTitle>
                      <Badge className={agingColors[bucket]}>₹{((data.total || data.amount || 0) / 1000).toFixed(0)}K</Badge>
                    </div>
                  </CardHeader>
                  {data.invoices && data.invoices.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {data.invoices.slice(0, 5).map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                              <p className="text-xs text-slate-500">{inv.dealerName || inv.customerName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">₹{(inv.outstandingAmount / 1000).toFixed(0)}K</p>
                              <p className="text-xs text-slate-500">{inv.agingDays} days overdue</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>

            {/* Dealer View */}
            <TabsContent value="dealer" className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : dealerData.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No dealer data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Credit Used</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealerData.map(dealer => (
                      <TableRow key={dealer.dealerId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dealer.dealerName}</p>
                            <p className="text-xs text-slate-500">{dealer.dealerCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{dealer.tier}</Badge>
                        </TableCell>
                        <TableCell>₹{(dealer.creditLimit / 100000).toFixed(1)}L</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={dealer.creditUtilization} className="w-16 h-2" />
                            <span className="text-xs">{dealer.creditUtilization}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-orange-600">
                          ₹{(dealer.outstanding / 1000).toFixed(0)}K
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          ₹{(dealer.overdueAmount / 1000).toFixed(0)}K
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Follow-ups View */}
            <TabsContent value="followups" className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : followUps.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No follow-ups scheduled</p>
                  <Button variant="outline" className="mt-2" onClick={() => setShowCreateFollowUp(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Follow-up
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.map(followUp => (
                    <Card key={followUp.id} className={`border-l-4 ${followUp.status === 'completed' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${followUp.priority === 'critical' ? 'bg-red-100' : followUp.priority === 'high' ? 'bg-orange-100' : 'bg-slate-100'}`}>
                            {followUp.type === 'call' ? <Phone className="h-5 w-5" /> :
                             followUp.type === 'email' ? <Mail className="h-5 w-5" /> :
                             <Calendar className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{followUp.invoiceNumber || followUp.dealerName || 'Collection Follow-up'}</p>
                            <p className="text-sm text-slate-500">{followUp.notes}</p>
                            <p className="text-xs text-slate-400">
                              Scheduled: {new Date(followUp.scheduledDate).toLocaleDateString()}
                              {followUp.outstandingAmount && ` • ₹${(followUp.outstandingAmount / 1000).toFixed(0)}K outstanding`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={followUp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {followUp.status}
                          </Badge>
                          {followUp.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => handleCompleteFollowUp(followUp.id, 'contacted')}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment received from dealer/customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Invoice ID *</Label>
              <Input
                value={paymentData.invoiceId}
                onChange={(e) => setPaymentData({ ...paymentData, invoiceId: e.target.value })}
                placeholder="Enter invoice ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentData.paymentMethod} onValueChange={(v) => setPaymentData({ ...paymentData, paymentMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  placeholder="Transaction ID / Cheque No."
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordPayment(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <IndianRupee className="h-4 w-4 mr-2" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Follow-up Dialog */}
      <Dialog open={showCreateFollowUp} onOpenChange={setShowCreateFollowUp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection Follow-up</DialogTitle>
            <DialogDescription>Schedule a follow-up for payment collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scheduled Date *</Label>
                <Input
                  type="date"
                  value={followUpData.scheduledDate}
                  onChange={(e) => setFollowUpData({ ...followUpData, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={followUpData.type} onValueChange={(v) => setFollowUpData({ ...followUpData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="visit">Site Visit</SelectItem>
                    <SelectItem value="legal">Legal Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice ID (optional)</Label>
                <Input
                  value={followUpData.invoiceId}
                  onChange={(e) => setFollowUpData({ ...followUpData, invoiceId: e.target.value })}
                  placeholder="Invoice ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={followUpData.priority} onValueChange={(v) => setFollowUpData({ ...followUpData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={followUpData.notes}
                onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
                placeholder="Follow-up notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFollowUp(false)}>Cancel</Button>
            <Button onClick={handleCreateFollowUp} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
              Create Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CollectionsTab
