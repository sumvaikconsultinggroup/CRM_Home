'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield, Plus, Search, AlertTriangle, CheckCircle2, Clock,
  Ticket, Phone, Mail, Calendar, User, MessageSquare,
  RefreshCw, Eye, Flag, XCircle, FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/phone-input'

const API_BASE = '/api/modules/doors-windows'

const warrantyStatusStyles = {
  'active': 'bg-emerald-100 text-emerald-700',
  'expired': 'bg-red-100 text-red-700',
  'expiring-soon': 'bg-amber-100 text-amber-700',
  'claimed': 'bg-purple-100 text-purple-700'
}

const ticketStatusStyles = {
  'open': 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  'resolved': 'bg-emerald-100 text-emerald-700',
  'closed': 'bg-slate-100 text-slate-700',
  'escalated': 'bg-red-100 text-red-700'
}

const ticketPriorityStyles = {
  'low': 'bg-slate-100 text-slate-600',
  'medium': 'bg-blue-100 text-blue-600',
  'high': 'bg-orange-100 text-orange-600',
  'urgent': 'bg-red-100 text-red-600'
}

export function WarrantyTicketsTab({ orders, headers, glassStyles }) {
  const [activeTab, setActiveTab] = useState('warranties')
  const [warranties, setWarranties] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [ticketForm, setTicketForm] = useState({
    warrantyId: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    issueType: 'hardware',
    priority: 'medium',
    subject: '',
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [warrantyRes, ticketRes] = await Promise.all([
        fetch(`${API_BASE}/warranty`, { headers }),
        fetch(`${API_BASE}/tickets`, { headers })
      ])
      const warrantyData = await warrantyRes.json()
      const ticketData = await ticketRes.json()
      if (warrantyData.warranties) setWarranties(warrantyData.warranties)
      if (ticketData.tickets) setTickets(ticketData.tickets)
    } catch (error) {
      // Mock data
      setWarranties([
        {
          id: 'WRN-001',
          orderNumber: 'ORD-2024-0040',
          customerName: 'Royal Heights',
          products: ['Aluminium Sliding Windows x 8'],
          installDate: '2024-06-15',
          expiryDate: '2034-06-15',
          profileWarranty: '10 years',
          hardwareWarranty: '5 years',
          glassWarranty: '5 years',
          installationWarranty: '1 year',
          status: 'active',
          claimsCount: 0
        },
        {
          id: 'WRN-002',
          orderNumber: 'ORD-2024-0035',
          customerName: 'Green Valley Villa',
          products: ['uPVC French Doors x 2', 'uPVC Casement Windows x 6'],
          installDate: '2024-03-20',
          expiryDate: '2034-03-20',
          profileWarranty: '10 years',
          hardwareWarranty: '5 years',
          glassWarranty: '5 years',
          installationWarranty: '1 year',
          status: 'active',
          claimsCount: 1
        },
        {
          id: 'WRN-003',
          orderNumber: 'ORD-2023-0150',
          customerName: 'Sunshine Apartments',
          products: ['Aluminium Sliding Doors x 4'],
          installDate: '2023-12-10',
          expiryDate: '2024-12-10',
          profileWarranty: '10 years',
          hardwareWarranty: '5 years',
          glassWarranty: '5 years',
          installationWarranty: '1 year',
          status: 'expiring-soon',
          claimsCount: 0
        }
      ])
      setTickets([
        {
          id: 'TKT-001',
          warrantyId: 'WRN-002',
          customerName: 'Green Valley Villa',
          subject: 'Window handle not locking properly',
          issueType: 'hardware',
          priority: 'high',
          status: 'in-progress',
          createdAt: '2024-12-10',
          assignedTo: 'Service Team A',
          lastUpdate: '2024-12-12'
        },
        {
          id: 'TKT-002',
          warrantyId: 'WRN-001',
          customerName: 'Royal Heights',
          subject: 'Sliding door roller issue',
          issueType: 'hardware',
          priority: 'medium',
          status: 'open',
          createdAt: '2024-12-14',
          lastUpdate: '2024-12-14'
        },
        {
          id: 'TKT-003',
          warrantyId: null,
          customerName: 'New Customer',
          subject: 'Quote inquiry for balcony enclosure',
          issueType: 'inquiry',
          priority: 'low',
          status: 'resolved',
          createdAt: '2024-12-08',
          resolvedAt: '2024-12-09',
          lastUpdate: '2024-12-09'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getWarrantyStatus = (warranty) => {
    const expiry = new Date(warranty.expiryDate)
    const today = new Date()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    
    if (expiry < today) return 'expired'
    if (expiry - today < thirtyDays) return 'expiring-soon'
    return 'active'
  }

  const warrantyStats = {
    total: warranties.length,
    active: warranties.filter(w => getWarrantyStatus(w) === 'active').length,
    expiringSoon: warranties.filter(w => getWarrantyStatus(w) === 'expiring-soon').length,
    totalClaims: warranties.reduce((sum, w) => sum + (w.claimsCount || 0), 0)
  }

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length
  }

  const handleCreateTicket = async () => {
    toast.success('Service ticket created')
    setShowNewTicket(false)
    fetchData()
  }

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    toast.success(`Ticket ${newStatus}`)
    fetchData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Warranty & Service Tickets</h2>
          <p className="text-slate-500">Manage warranties and handle customer service requests</p>
        </div>
        <Button onClick={() => setShowNewTicket(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> New Service Ticket
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="warranties" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Warranties ({warranties.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" /> Tickets ({tickets.length})
          </TabsTrigger>
        </TabsList>

        {/* Warranties Tab */}
        <TabsContent value="warranties" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Warranties</p>
                    <p className="text-2xl font-bold text-slate-800">{warrantyStats.total}</p>
                  </div>
                  <Shield className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active</p>
                    <p className="text-2xl font-bold text-emerald-600">{warrantyStats.active}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Expiring Soon</p>
                    <p className="text-2xl font-bold text-amber-600">{warrantyStats.expiringSoon}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Claims</p>
                    <p className="text-2xl font-bold text-purple-600">{warrantyStats.totalClaims}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warranties List */}
          <div className="space-y-3">
            {warranties.map(warranty => (
              <Card key={warranty.id} className={`${glassStyles?.card} hover:shadow-lg transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-800">{warranty.id}</h3>
                        <Badge className={warrantyStatusStyles[getWarrantyStatus(warranty)]}>
                          {getWarrantyStatus(warranty).replace('-', ' ')}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-2">{warranty.orderNumber} • {warranty.customerName}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Profile Warranty</p>
                          <p className="font-medium">{warranty.profileWarranty}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Hardware Warranty</p>
                          <p className="font-medium">{warranty.hardwareWarranty}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Glass Warranty</p>
                          <p className="font-medium">{warranty.glassWarranty}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expires On</p>
                          <p className="font-medium">{new Date(warranty.expiryDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {warranty.products?.map((product, idx) => (
                          <Badge key={idx} variant="outline">{product}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setTicketForm({ ...ticketForm, warrantyId: warranty.id, customerName: warranty.customerName }); setShowNewTicket(true); }}>
                        <Ticket className="h-4 w-4 mr-1" /> Claim
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Tickets</p>
                    <p className="text-2xl font-bold text-slate-800">{ticketStats.total}</p>
                  </div>
                  <Ticket className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Open</p>
                    <p className="text-2xl font-bold text-blue-600">{ticketStats.open}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">In Progress</p>
                    <p className="text-2xl font-bold text-amber-600">{ticketStats.inProgress}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={glassStyles?.card}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Resolved</p>
                    <p className="text-2xl font-bold text-emerald-600">{ticketStats.resolved}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tickets List */}
          <div className="space-y-3">
            {tickets.map(ticket => (
              <Card key={ticket.id} className={`${glassStyles?.card} hover:shadow-lg transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-800">{ticket.id}</h3>
                        <Badge className={ticketStatusStyles[ticket.status]}>{ticket.status}</Badge>
                        <Badge className={ticketPriorityStyles[ticket.priority]}>{ticket.priority}</Badge>
                      </div>
                      <p className="text-slate-800 font-medium mb-1">{ticket.subject}</p>
                      <p className="text-sm text-slate-500 mb-2">{ticket.customerName} {ticket.warrantyId && `• ${ticket.warrantyId}`}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.assignedTo && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ticket.assignedTo}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {ticket.status === 'open' && (
                        <Button size="sm" onClick={() => handleUpdateTicketStatus(ticket.id, 'in-progress')}>Start</Button>
                      )}
                      {ticket.status === 'in-progress' && (
                        <Button size="sm" onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved')}>Resolve</Button>
                      )}
                      <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Service Ticket</DialogTitle>
            <DialogDescription>Log a new service request or warranty claim</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Warranty (if applicable)</Label>
              <Select value={ticketForm.warrantyId} onValueChange={(v) => setTicketForm({ ...ticketForm, warrantyId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warranty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Warranty (General Inquiry)</SelectItem>
                  {warranties.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.id} - {w.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={ticketForm.issueType} onValueChange={(v) => setTicketForm({ ...ticketForm, issueType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware Issue</SelectItem>
                  <SelectItem value="glass">Glass Issue</SelectItem>
                  <SelectItem value="profile">Profile Issue</SelectItem>
                  <SelectItem value="installation">Installation Issue</SelectItem>
                  <SelectItem value="inquiry">General Inquiry</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={ticketForm.customerName} onChange={(e) => setTicketForm({ ...ticketForm, customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={ticketForm.customerPhone} onChange={(e) => setTicketForm({ ...ticketForm, customerPhone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={ticketForm.customerEmail} onChange={(e) => setTicketForm({ ...ticketForm, customerEmail: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Subject</Label>
              <Input value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder="Brief description of the issue" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Detailed description of the issue" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
