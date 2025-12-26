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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Wrench, Plus, Search, Calendar as CalendarIcon, MapPin, User,
  Clock, CheckCircle2, AlertTriangle, Phone, Camera, FileText,
  Play, Pause, Flag, Star, RefreshCw, Eye, Truck, Loader2, Edit, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

const API_BASE = '/api/modules/doors-windows'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

const statusStyles = {
  'scheduled': 'bg-blue-100 text-blue-700',
  'in-transit': 'bg-purple-100 text-purple-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  'completed': 'bg-emerald-100 text-emerald-700',
  'on-hold': 'bg-red-100 text-red-700',
  'cancelled': 'bg-slate-100 text-slate-700'
}

export function InstallationTab({ orders = [], glassStyles, onRefresh }) {
  const [installations, setInstallations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedInstallation, setSelectedInstallation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, scheduled: 0, inProgress: 0, completed: 0 })

  const [scheduleForm, setScheduleForm] = useState({
    orderId: '',
    orderNumber: '',
    customerName: '',
    customerPhone: '',
    siteAddress: '',
    siteContactPerson: '',
    siteContactPhone: '',
    scheduledDate: '',
    scheduledDuration: '1 day',
    leadInstaller: '',
    team: [],
    totalOpenings: 0,
    specialInstructions: '',
    notes: ''
  })

  // Teams data - could be fetched from API
  const installerTeams = [
    { id: 'team-alpha', name: 'Team Alpha', lead: 'Rajesh Kumar' },
    { id: 'team-beta', name: 'Team Beta', lead: 'Suresh Singh' },
    { id: 'team-gamma', name: 'Team Gamma', lead: 'Amit Sharma' },
  ]

  useEffect(() => {
    fetchInstallations()
  }, [])

  const fetchInstallations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/installation`, { 
        headers: getAuthHeaders() 
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch installations')
      }
      
      const data = await res.json()
      const installationData = data.data?.installations || data.installations || []
      setInstallations(installationData)
      
      // Set stats from API response or calculate
      if (data.data?.stats || data.stats) {
        const apiStats = data.data?.stats || data.stats
        setStats({
          total: apiStats.total || installationData.length,
          scheduled: apiStats.scheduled || installationData.filter(i => i.status === 'scheduled').length,
          inProgress: apiStats.inProgress || installationData.filter(i => i.status === 'in-progress').length,
          completed: apiStats.completed || installationData.filter(i => i.status === 'completed').length
        })
      } else {
        setStats({
          total: installationData.length,
          scheduled: installationData.filter(i => i.status === 'scheduled').length,
          inProgress: installationData.filter(i => i.status === 'in-progress').length,
          completed: installationData.filter(i => i.status === 'completed').length
        })
      }
    } catch (error) {
      console.error('Failed to fetch installations:', error)
      toast.error('Failed to load installations')
      setInstallations([])
      setStats({ total: 0, scheduled: 0, inProgress: 0, completed: 0 })
    } finally {
      setLoading(false)
    }
  }

  const filteredInstallations = installations.filter(inst => {
    const matchesSearch = !searchQuery ||
      (inst.installationNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inst.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const todayInstallations = installations.filter(i => {
    if (!i.scheduledDate) return false
    return new Date(i.scheduledDate).toDateString() === new Date().toDateString()
  })

  // Handle creating new installation
  const handleSchedule = async () => {
    try {
      if (!scheduleForm.orderNumber || !scheduleForm.scheduledDate) {
        toast.error('Please fill in order number and scheduled date')
        return
      }

      const res = await fetch(`${API_BASE}/installation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId: scheduleForm.orderId,
          orderNumber: scheduleForm.orderNumber,
          customerName: scheduleForm.customerName,
          customerPhone: scheduleForm.customerPhone,
          siteAddress: scheduleForm.siteAddress,
          siteContactPerson: scheduleForm.siteContactPerson,
          siteContactPhone: scheduleForm.siteContactPhone,
          scheduledDate: scheduleForm.scheduledDate,
          scheduledDuration: scheduleForm.scheduledDuration,
          leadInstaller: scheduleForm.leadInstaller,
          team: scheduleForm.team,
          totalOpenings: parseInt(scheduleForm.totalOpenings) || 0,
          specialInstructions: scheduleForm.specialInstructions,
          notes: scheduleForm.notes
        })
      })

      if (res.ok) {
        toast.success('Installation scheduled successfully')
        setShowSchedule(false)
        resetScheduleForm()
        fetchInstallations()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to schedule installation')
      }
    } catch (error) {
      console.error('Schedule error:', error)
      toast.error('Failed to schedule installation')
    }
  }

  const resetScheduleForm = () => {
    setScheduleForm({
      orderId: '',
      orderNumber: '',
      customerName: '',
      customerPhone: '',
      siteAddress: '',
      siteContactPerson: '',
      siteContactPhone: '',
      scheduledDate: '',
      scheduledDuration: '1 day',
      leadInstaller: '',
      team: [],
      totalOpenings: 0,
      specialInstructions: '',
      notes: ''
    })
  }

  // Handle Start Installation (Check-in)
  const handleStartInstallation = async (installation) => {
    try {
      const res = await fetch(`${API_BASE}/installation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          action: 'check-in',
          installationId: installation.id
        })
      })

      if (res.ok) {
        toast.success('Installation started - Team checked in')
        fetchInstallations()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to start installation')
      }
    } catch (error) {
      console.error('Start error:', error)
      toast.error('Failed to start installation')
    }
  }

  // Handle Complete Installation
  const handleCompleteInstallation = async (installation) => {
    try {
      const res = await fetch(`${API_BASE}/installation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          action: 'complete',
          installationId: installation.id,
          customerName: installation.customerName,
          feedback: '',
          rating: 5
        })
      })

      if (res.ok) {
        toast.success('Installation completed successfully')
        fetchInstallations()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to complete installation')
      }
    } catch (error) {
      console.error('Complete error:', error)
      toast.error('Failed to complete installation')
    }
  }

  // Handle Cancel Installation
  const handleCancelInstallation = async (installation) => {
    if (!confirm('Are you sure you want to cancel this installation?')) return

    try {
      const res = await fetch(`${API_BASE}/installation?id=${installation.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (res.ok) {
        toast.success('Installation cancelled')
        fetchInstallations()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to cancel installation')
      }
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error('Failed to cancel installation')
    }
  }

  // View installation details
  const viewDetails = (installation) => {
    setSelectedInstallation(installation)
    setShowDetails(true)
  }

  // Pre-fill form when selecting an order
  const handleOrderSelect = (orderId) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setScheduleForm({
        ...scheduleForm,
        orderId: order.id,
        orderNumber: order.orderNumber || '',
        customerName: order.customerName || order.clientName || '',
        customerPhone: order.customerPhone || order.clientPhone || '',
        siteAddress: order.siteAddress || order.address || '',
        totalOpenings: order.totalOpenings || order.items?.length || 0
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading installations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Installation Management</h2>
          <p className="text-slate-500">Schedule, track and manage on-site installations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInstallations}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setShowSchedule(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Schedule Installation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Installations</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              </div>
              <Play className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      {todayInstallations.length > 0 && (
        <Card className={`${glassStyles?.card} border-l-4 border-l-blue-500`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Today&apos;s Installations ({todayInstallations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayInstallations.map(inst => (
                <div key={inst.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{inst.customerName}</span>
                    <Badge className={statusStyles[inst.status]}>{inst.status}</Badge>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {inst.scheduledDuration || '1 day'}</p>
                    <p className="flex items-center gap-1"><User className="h-3 w-3" /> {inst.leadInstaller || 'Not assigned'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Installations List */}
      {filteredInstallations.length === 0 ? (
        <Card className={glassStyles?.card}>
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No Installations Found</h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'No installations match your search criteria.'
                : 'Schedule your first installation to get started.'}
            </p>
            <Button onClick={() => setShowSchedule(true)}>
              <Plus className="h-4 w-4 mr-2" /> Schedule Installation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInstallations.map(inst => (
            <Card key={inst.id} className={`${glassStyles?.card} hover:shadow-lg transition-all`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800">{inst.installationNumber || inst.id}</h3>
                      <Badge className={statusStyles[inst.status]}>{inst.status}</Badge>
                      {inst.handover?.rating && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm">{inst.handover.rating}/5</span>
                        </div>
                      )}
                      {inst.openSnags > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {inst.openSnags} Snags
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600">{inst.orderNumber} • {inst.customerName}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                      <div className="flex items-start gap-2">
                        <CalendarIcon className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Scheduled</p>
                          <p className="font-medium">
                            {inst.scheduledDate 
                              ? new Date(inst.scheduledDate).toLocaleDateString() 
                              : 'Not set'}
                          </p>
                          <p className="text-slate-500">{inst.scheduledDuration || '1 day'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Location</p>
                          <p className="font-medium line-clamp-2">{inst.siteAddress || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Team Lead</p>
                          <p className="font-medium">{inst.leadInstaller || 'Not assigned'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-slate-500">Contact</p>
                          <p className="font-medium">{inst.siteContactPerson || inst.customerName || '-'}</p>
                          <p className="text-slate-500">{inst.siteContactPhone || inst.customerPhone || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    {inst.totalOpenings > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-medium">{inst.completedOpenings || 0} / {inst.totalOpenings} openings</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${((inst.completedOpenings || 0) / inst.totalOpenings) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {inst.handover?.feedback && (
                      <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                        <strong>Feedback:</strong> {inst.handover.feedback}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {inst.status === 'scheduled' && (
                      <Button size="sm" onClick={() => handleStartInstallation(inst)} className="bg-blue-600 hover:bg-blue-700">
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                    )}
                    {inst.status === 'in-progress' && (
                      <Button size="sm" onClick={() => handleCompleteInstallation(inst)} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => viewDetails(inst)}>
                      <Eye className="h-4 w-4 mr-1" /> Details
                    </Button>
                    {inst.status !== 'completed' && inst.status !== 'cancelled' && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleCancelInstallation(inst)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Installation</DialogTitle>
            <DialogDescription>Schedule a new installation for an order</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {orders && orders.length > 0 && (
              <div className="col-span-2 space-y-2">
                <Label>Select Order (Optional)</Label>
                <Select value={scheduleForm.orderId} onValueChange={handleOrderSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from existing orders" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.filter(o => ['ready', 'dispatched', 'confirmed'].includes(o.status)).map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} - {order.customerName || order.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input 
                value={scheduleForm.orderNumber} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, orderNumber: e.target.value })} 
                placeholder="e.g., ORD-2024-0001"
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Input 
                type="date"
                value={scheduleForm.scheduledDate} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input 
                value={scheduleForm.customerName} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, customerName: e.target.value })} 
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input 
                value={scheduleForm.customerPhone} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, customerPhone: e.target.value })} 
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={scheduleForm.scheduledDuration} onValueChange={(v) => setScheduleForm({ ...scheduleForm, scheduledDuration: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Half day">Half day</SelectItem>
                  <SelectItem value="1 day">1 day</SelectItem>
                  <SelectItem value="2 days">2 days</SelectItem>
                  <SelectItem value="3 days">3 days</SelectItem>
                  <SelectItem value="1 week">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead Installer / Team</Label>
              <Select value={scheduleForm.leadInstaller} onValueChange={(v) => setScheduleForm({ ...scheduleForm, leadInstaller: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {installerTeams.map(team => (
                    <SelectItem key={team.id} value={team.name}>{team.name} - {team.lead}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Site Contact Person</Label>
              <Input 
                value={scheduleForm.siteContactPerson} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, siteContactPerson: e.target.value })} 
                placeholder="On-site contact name"
              />
            </div>
            <div className="space-y-2">
              <Label>Site Contact Phone</Label>
              <Input 
                value={scheduleForm.siteContactPhone} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, siteContactPhone: e.target.value })} 
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Openings</Label>
              <Input 
                type="number"
                value={scheduleForm.totalOpenings} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, totalOpenings: e.target.value })} 
                placeholder="Number of doors/windows"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Site Address</Label>
              <Textarea 
                value={scheduleForm.siteAddress} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, siteAddress: e.target.value })} 
                placeholder="Complete installation site address"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Special Instructions</Label>
              <Textarea 
                value={scheduleForm.specialInstructions} 
                onChange={(e) => setScheduleForm({ ...scheduleForm, specialInstructions: e.target.value })} 
                placeholder="Any special instructions for the installation team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSchedule(false); resetScheduleForm(); }}>Cancel</Button>
            <Button onClick={handleSchedule} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              Schedule Installation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Installation Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedInstallation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedInstallation.installationNumber || selectedInstallation.id}</h3>
                <Badge className={statusStyles[selectedInstallation.status]}>{selectedInstallation.status}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Order Number</p>
                  <p className="font-medium">{selectedInstallation.orderNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Customer</p>
                  <p className="font-medium">{selectedInstallation.customerName || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Scheduled Date</p>
                  <p className="font-medium">
                    {selectedInstallation.scheduledDate 
                      ? new Date(selectedInstallation.scheduledDate).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Duration</p>
                  <p className="font-medium">{selectedInstallation.scheduledDuration || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Team Lead</p>
                  <p className="font-medium">{selectedInstallation.leadInstaller || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Openings</p>
                  <p className="font-medium">{selectedInstallation.totalOpenings || 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Site Address</p>
                  <p className="font-medium">{selectedInstallation.siteAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Site Contact</p>
                  <p className="font-medium">{selectedInstallation.siteContactPerson || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Site Phone</p>
                  <p className="font-medium">{selectedInstallation.siteContactPhone || '-'}</p>
                </div>
              </div>

              {selectedInstallation.checkIn && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-700">Check-In</p>
                  <p className="text-sm text-blue-600">
                    {new Date(selectedInstallation.checkIn.time).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedInstallation.actualStartDate && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="font-medium text-amber-700">Started</p>
                  <p className="text-sm text-amber-600">
                    {new Date(selectedInstallation.actualStartDate).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedInstallation.actualEndDate && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="font-medium text-emerald-700">Completed</p>
                  <p className="text-sm text-emerald-600">
                    {new Date(selectedInstallation.actualEndDate).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedInstallation.specialInstructions && (
                <div>
                  <p className="text-slate-500 text-sm">Special Instructions</p>
                  <p className="p-2 bg-slate-50 rounded">{selectedInstallation.specialInstructions}</p>
                </div>
              )}

              {selectedInstallation.notes && (
                <div>
                  <p className="text-slate-500 text-sm">Notes</p>
                  <p className="p-2 bg-slate-50 rounded">{selectedInstallation.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
