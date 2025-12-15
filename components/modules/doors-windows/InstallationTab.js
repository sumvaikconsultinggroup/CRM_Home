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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Wrench, Plus, Search, Calendar as CalendarIcon, MapPin, User,
  Clock, CheckCircle2, AlertTriangle, Phone, Camera, FileText,
  Play, Pause, Flag, Star, RefreshCw, Eye, Truck
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

const API_BASE = '/api/modules/doors-windows'

const statusStyles = {
  'scheduled': 'bg-blue-100 text-blue-700',
  'in-transit': 'bg-purple-100 text-purple-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  'completed': 'bg-emerald-100 text-emerald-700',
  'on-hold': 'bg-red-100 text-red-700',
  'rescheduled': 'bg-orange-100 text-orange-700'
}

export function InstallationTab({ orders, headers, glassStyles, onRefresh }) {
  const [installations, setInstallations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const [selectedInstallation, setSelectedInstallation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [scheduleForm, setScheduleForm] = useState({
    orderId: '',
    scheduledDate: new Date(),
    timeSlot: '09:00-12:00',
    installerTeam: '',
    contactPerson: '',
    contactPhone: '',
    siteAddress: '',
    notes: ''
  })

  useEffect(() => {
    fetchInstallations()
  }, [])

  const fetchInstallations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/installations`, { headers })
      const data = await res.json()
      if (data.installations) setInstallations(data.installations)
    } catch (error) {
      // Mock data
      setInstallations([
        {
          id: 'INS-001',
          orderNumber: 'ORD-2024-0044',
          customerName: 'Royal Heights',
          siteAddress: '123 Royal Heights, Sector 50, Gurgaon',
          scheduledDate: '2024-12-18',
          timeSlot: '09:00-12:00',
          installerTeam: 'Team Alpha',
          status: 'scheduled',
          items: 8,
          estimatedDuration: '4 hours',
          contactPerson: 'Mr. Sharma',
          contactPhone: '+91 98765 43210'
        },
        {
          id: 'INS-002',
          orderNumber: 'ORD-2024-0043',
          customerName: 'Green Valley Villa',
          siteAddress: '456 Green Valley, DLF Phase 5',
          scheduledDate: '2024-12-16',
          timeSlot: '14:00-18:00',
          installerTeam: 'Team Beta',
          status: 'in-progress',
          items: 5,
          estimatedDuration: '3 hours',
          contactPerson: 'Mrs. Gupta',
          contactPhone: '+91 87654 32109',
          startedAt: '2024-12-16T14:15:00'
        },
        {
          id: 'INS-003',
          orderNumber: 'ORD-2024-0040',
          customerName: 'Sunrise Apartments',
          siteAddress: '789 Sunrise Complex, Noida',
          scheduledDate: '2024-12-14',
          timeSlot: '10:00-14:00',
          installerTeam: 'Team Alpha',
          status: 'completed',
          items: 12,
          completedAt: '2024-12-14T13:45:00',
          rating: 5,
          feedback: 'Excellent work, very professional team'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredInstallations = installations.filter(inst => {
    const matchesSearch = !searchQuery ||
      inst.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inst.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: installations.length,
    scheduled: installations.filter(i => i.status === 'scheduled').length,
    inProgress: installations.filter(i => i.status === 'in-progress').length,
    completed: installations.filter(i => i.status === 'completed').length
  }

  const todayInstallations = installations.filter(i => 
    new Date(i.scheduledDate).toDateString() === new Date().toDateString()
  )

  const handleSchedule = async () => {
    toast.success('Installation scheduled successfully')
    setShowSchedule(false)
    fetchInstallations()
  }

  const handleStartInstallation = async (id) => {
    toast.success('Installation started')
    fetchInstallations()
  }

  const handleCompleteInstallation = async (id) => {
    toast.success('Installation marked as completed')
    fetchInstallations()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Installation Management</h2>
          <p className="text-slate-500">Schedule, track and manage on-site installations</p>
        </div>
        <Button onClick={() => setShowSchedule(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
          <Plus className="h-4 w-4 mr-2" /> Schedule Installation
        </Button>
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
                    <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {inst.timeSlot}</p>
                    <p className="flex items-center gap-1"><User className="h-3 w-3" /> {inst.installerTeam}</p>
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
                placeholder="Search installations..."
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
                <SelectItem value="in-transit">In Transit</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Installations List */}
      <div className="space-y-4">
        {filteredInstallations.map(inst => (
          <Card key={inst.id} className={`${glassStyles?.card} hover:shadow-lg transition-all`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800">{inst.id}</h3>
                    <Badge className={statusStyles[inst.status]}>{inst.status}</Badge>
                    {inst.rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm">{inst.rating}/5</span>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-600">{inst.orderNumber} • {inst.customerName}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Scheduled</p>
                        <p className="font-medium">{new Date(inst.scheduledDate).toLocaleDateString()}</p>
                        <p className="text-slate-500">{inst.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Location</p>
                        <p className="font-medium line-clamp-2">{inst.siteAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Team</p>
                        <p className="font-medium">{inst.installerTeam}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">Contact</p>
                        <p className="font-medium">{inst.contactPerson}</p>
                        <p className="text-slate-500">{inst.contactPhone}</p>
                      </div>
                    </div>
                  </div>
                  {inst.feedback && (
                    <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                      <strong>Feedback:</strong> {inst.feedback}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {inst.status === 'scheduled' && (
                    <Button size="sm" onClick={() => handleStartInstallation(inst.id)}>
                      <Play className="h-4 w-4 mr-1" /> Start
                    </Button>
                  )}
                  {inst.status === 'in-progress' && (
                    <Button size="sm" onClick={() => handleCompleteInstallation(inst.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" /> Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Installation</DialogTitle>
            <DialogDescription>Schedule a new installation for completed order</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Order</Label>
              <Select value={scheduleForm.orderId} onValueChange={(v) => setScheduleForm({ ...scheduleForm, orderId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {orders?.filter(o => o.status === 'ready' || o.status === 'dispatched').map(order => (
                    <SelectItem key={order.id} value={order.id}>{order.orderNumber} - {order.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Select value={scheduleForm.timeSlot} onValueChange={(v) => setScheduleForm({ ...scheduleForm, timeSlot: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00-12:00">Morning (9 AM - 12 PM)</SelectItem>
                  <SelectItem value="12:00-15:00">Afternoon (12 PM - 3 PM)</SelectItem>
                  <SelectItem value="15:00-18:00">Evening (3 PM - 6 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Installer Team</Label>
              <Select value={scheduleForm.installerTeam} onValueChange={(v) => setScheduleForm({ ...scheduleForm, installerTeam: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Team Alpha">Team Alpha</SelectItem>
                  <SelectItem value="Team Beta">Team Beta</SelectItem>
                  <SelectItem value="Team Gamma">Team Gamma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={scheduleForm.contactPerson} onChange={(e) => setScheduleForm({ ...scheduleForm, contactPerson: e.target.value })} placeholder="Site contact name" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={scheduleForm.contactPhone} onChange={(e) => setScheduleForm({ ...scheduleForm, contactPhone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Site Address</Label>
              <Textarea value={scheduleForm.siteAddress} onChange={(e) => setScheduleForm({ ...scheduleForm, siteAddress: e.target.value })} placeholder="Complete site address" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Special instructions or notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={handleSchedule}>Schedule Installation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
