'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Factory, Plus, Search, Clock, CheckCircle2, AlertTriangle,
  Play, Pause, Package, Truck, Calendar, User, Settings,
  ArrowRight, RefreshCw, Eye, BarChart3, Scissors, Box, Loader2,
  ClipboardCheck, XCircle, FileText, ChevronDown, ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Production modes
const PRODUCTION_MODES = {
  MANUFACTURER: 'manufacturer', // Direct material dispatch (Aluminium)
  FABRICATOR: 'fabricator' // Cut-to-size production
}

const statusStyles = {
  'pending': 'bg-slate-100 text-slate-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'cutting': 'bg-amber-100 text-amber-700',
  'machining': 'bg-orange-100 text-orange-700',
  'assembly': 'bg-purple-100 text-purple-700',
  'glazing': 'bg-cyan-100 text-cyan-700',
  'qc': 'bg-indigo-100 text-indigo-700',
  'packing': 'bg-pink-100 text-pink-700',
  'ready': 'bg-emerald-100 text-emerald-700',
  'completed': 'bg-green-100 text-green-700',
  'dispatched': 'bg-green-100 text-green-700',
  'rework': 'bg-red-100 text-red-700',
  'on-hold': 'bg-gray-100 text-gray-700'
}

const productionStages = [
  { id: 'cutting', name: 'Profile Cutting', icon: '✂️', description: 'Cut profiles to size' },
  { id: 'machining', name: 'Machining', icon: '⚙️', description: 'Drill holes, notches' },
  { id: 'assembly', name: 'Frame Assembly', icon: '🔧', description: 'Assemble frame structure' },
  { id: 'glazing', name: 'Glass Fitting', icon: '🔲', description: 'Install glass panels' },
  { id: 'qc', name: 'Quality Check', icon: '✅', description: 'Inspect finished product' },
  { id: 'packing', name: 'Packing', icon: '📦', description: 'Pack for delivery' }
]

const priorityStyles = {
  'urgent': 'bg-red-100 text-red-700 border-red-300',
  'high': 'bg-orange-100 text-orange-700 border-orange-300',
  'normal': 'bg-blue-100 text-blue-700 border-blue-300',
  'low': 'bg-slate-100 text-slate-700 border-slate-300'
}

export function ProductionTab({ orders, settings, headers, glassStyles, onRefresh }) {
  const [workOrders, setWorkOrders] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateWO, setShowCreateWO] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [productionMode, setProductionMode] = useState(settings?.productionMode || PRODUCTION_MODES.FABRICATOR)
  const [showQCDialog, setShowQCDialog] = useState(false)
  const [showStageComplete, setShowStageComplete] = useState(false)
  const [expandedWO, setExpandedWO] = useState(null)

  // Work Order form
  const [woForm, setWoForm] = useState({
    orderId: '',
    orderNumber: '',
    quoteId: '',
    customerName: '',
    siteAddress: '',
    itemsCount: 0,
    totalArea: 0,
    productionType: 'fabricator',
    priority: 'normal',
    scheduledStart: new Date().toISOString().split('T')[0],
    scheduledEnd: '',
    assignedTeam: '',
    notes: ''
  })

  // QC form
  const [qcForm, setQcForm] = useState({
    stage: 'final',
    checklist: [
      { item: 'Dimensional Check (Diagonals)', passed: false, notes: '' },
      { item: 'Corner Strength', passed: false, notes: '' },
      { item: 'Hardware Operation', passed: false, notes: '' },
      { item: 'Glass Quality', passed: false, notes: '' },
      { item: 'Finish Defects', passed: false, notes: '' },
      { item: 'Water Test', passed: false, notes: '' }
    ],
    result: 'pending',
    reworkNotes: ''
  })

  // Stage completion
  const [stageNotes, setStageNotes] = useState('')

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  const fetchWorkOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/production`, { headers })
      const data = await res.json()
      if (data.workOrders) {
        setWorkOrders(data.workOrders)
      }
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error)
      toast.error('Failed to load production data')
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = !searchQuery ||
      wo.workOrderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter
    const matchesStage = stageFilter === 'all' || wo.currentStage === stageFilter
    return matchesSearch && matchesStatus && matchesStage
  })

  const computedStats = {
    total: workOrders.length,
    inProgress: workOrders.filter(wo => wo.status === 'in-progress').length,
    ready: workOrders.filter(wo => wo.status === 'completed' || wo.currentStage === 'ready').length,
    rework: workOrders.filter(wo => wo.status === 'rework').length,
    delayed: workOrders.filter(wo => new Date(wo.scheduledEnd) < new Date() && wo.status !== 'completed').length,
    byStage: stats.byStage || {}
  }

  const resetForm = () => {
    setWoForm({
      orderId: '',
      orderNumber: '',
      quoteId: '',
      customerName: '',
      siteAddress: '',
      itemsCount: 0,
      totalArea: 0,
      productionType: productionMode,
      priority: 'normal',
      scheduledStart: new Date().toISOString().split('T')[0],
      scheduledEnd: '',
      assignedTeam: '',
      notes: ''
    })
  }

  const handleCreateWorkOrder = async () => {
    if (!woForm.customerName) {
      toast.error('Customer name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/production`, {
        method: 'POST',
        headers,
        body: JSON.stringify(woForm)
      })
      const data = await res.json()
      
      if (data.id || data.workOrderNumber) {
        toast.success(`Work Order ${data.workOrderNumber || ''} created`)
        setShowCreateWO(false)
        resetForm()
        fetchWorkOrders()
      } else {
        toast.error(data.error || 'Failed to create work order')
      }
    } catch (error) {
      console.error('Create WO error:', error)
      toast.error('Failed to create work order')
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteStage = async () => {
    if (!selectedWorkOrder) return

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/production`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'complete-stage',
          workOrderId: selectedWorkOrder.id,
          currentStage: selectedWorkOrder.currentStage,
          notes: stageNotes
        })
      })
      const data = await res.json()
      
      if (data.id || data.currentStage) {
        toast.success(`Stage completed! Moving to ${data.currentStage || 'next stage'}`)
        setShowStageComplete(false)
        setSelectedWorkOrder(null)
        setStageNotes('')
        fetchWorkOrders()
      } else {
        toast.error(data.error || 'Failed to complete stage')
      }
    } catch (error) {
      console.error('Complete stage error:', error)
      toast.error('Failed to complete stage')
    } finally {
      setSaving(false)
    }
  }

  const handleQCSubmit = async () => {
    if (!selectedWorkOrder) return

    const passedCount = qcForm.checklist.filter(c => c.passed).length
    const result = passedCount === qcForm.checklist.length ? 'pass' : 
                   passedCount >= qcForm.checklist.length / 2 ? 'pass' : 'rework'

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/production`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'record-qc',
          workOrderId: selectedWorkOrder.id,
          stage: qcForm.stage,
          checklist: qcForm.checklist,
          result,
          reworkNotes: qcForm.reworkNotes
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success(result === 'pass' ? 'QC Passed!' : 'QC requires rework')
        setShowQCDialog(false)
        setSelectedWorkOrder(null)
        fetchWorkOrders()
      } else {
        toast.error(data.error || 'Failed to record QC')
      }
    } catch (error) {
      console.error('QC submit error:', error)
      toast.error('Failed to record QC')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateWorkOrder = async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/production`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, ...updates })
      })
      const data = await res.json()
      
      if (data.id || data.workOrderNumber) {
        toast.success('Work order updated')
        fetchWorkOrders()
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Update WO error:', error)
      toast.error('Failed to update')
    }
  }

  const handleDeleteWorkOrder = async (id) => {
    if (!confirm('Delete this work order? This cannot be undone.')) return

    try {
      const res = await fetch(`${API_BASE}/production?id=${id}`, {
        method: 'DELETE',
        headers
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('Work order deleted')
        fetchWorkOrders()
      } else {
        toast.error(data.error || 'Failed to delete')
      }
    } catch (error) {
      console.error('Delete WO error:', error)
      toast.error('Failed to delete')
    }
  }

  const getStageIndex = (stage) => {
    return productionStages.findIndex(s => s.id === stage)
  }

  const openStageComplete = (wo) => {
    setSelectedWorkOrder(wo)
    setStageNotes('')
    setShowStageComplete(true)
  }

  const openQCDialog = (wo) => {
    setSelectedWorkOrder(wo)
    setQcForm({
      stage: 'final',
      checklist: [
        { item: 'Dimensional Check (Diagonals)', passed: false, notes: '' },
        { item: 'Corner Strength', passed: false, notes: '' },
        { item: 'Hardware Operation', passed: false, notes: '' },
        { item: 'Glass Quality', passed: false, notes: '' },
        { item: 'Finish Defects', passed: false, notes: '' },
        { item: 'Water Test', passed: false, notes: '' }
      ],
      result: 'pending',
      reworkNotes: ''
    })
    setShowQCDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Production Management</h2>
          <p className="text-slate-500">Track manufacturing progress & work orders</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Production Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
            <span className={`text-sm ${productionMode === PRODUCTION_MODES.FABRICATOR ? 'font-medium' : 'text-slate-500'}`}>
              <Scissors className="h-4 w-4 inline mr-1" /> Fabricator
            </span>
            <Switch
              checked={productionMode === PRODUCTION_MODES.MANUFACTURER}
              onCheckedChange={(v) => setProductionMode(v ? PRODUCTION_MODES.MANUFACTURER : PRODUCTION_MODES.FABRICATOR)}
            />
            <span className={`text-sm ${productionMode === PRODUCTION_MODES.MANUFACTURER ? 'font-medium' : 'text-slate-500'}`}>
              <Factory className="h-4 w-4 inline mr-1" /> Manufacturer
            </span>
          </div>
          <Button variant="outline" onClick={fetchWorkOrders}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateWO(true); }} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Create Work Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Work Orders</p>
                <p className="text-2xl font-bold text-slate-800">{computedStats.total}</p>
              </div>
              <Factory className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{computedStats.inProgress}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ready for Dispatch</p>
                <p className="text-2xl font-bold text-emerald-600">{computedStats.ready}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rework</p>
                <p className="text-2xl font-bold text-orange-600">{computedStats.rework}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Delayed</p>
                <p className="text-2xl font-bold text-red-600">{computedStats.delayed}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Mode Info */}
      <Card className={`${glassStyles?.card} border-l-4 ${productionMode === PRODUCTION_MODES.MANUFACTURER ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {productionMode === PRODUCTION_MODES.MANUFACTURER ? (
              <>
                <Factory className="h-10 w-10 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">Manufacturer Mode</h3>
                  <p className="text-sm text-slate-500">Direct material dispatch - Profiles and materials shipped directly without cutting/sizing. Ideal for Aluminium profile manufacturers.</p>
                </div>
              </>
            ) : (
              <>
                <Scissors className="h-10 w-10 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">Fabricator Mode</h3>
                  <p className="text-sm text-slate-500">Cut-to-size production - Complete manufacturing with cutting, assembly, glass fitting, and quality check stages.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search work orders..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rework">Rework</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {productionStages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.icon} {stage.name}
                  </SelectItem>
                ))}
                <SelectItem value="ready">📦 Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredWorkOrders.length === 0 ? (
        <Card className={glassStyles?.card}>
          <CardContent className="py-12 text-center">
            <Factory className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {workOrders.length === 0 
                ? 'No work orders yet. Create one to start production.'
                : 'No work orders match your filters.'}
            </p>
            {workOrders.length === 0 && (
              <Button onClick={() => setShowCreateWO(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Create First Work Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkOrders.map(wo => {
            const currentStageIndex = getStageIndex(wo.currentStage)
            const isExpanded = expandedWO === wo.id
            const isDelayed = wo.scheduledEnd && new Date(wo.scheduledEnd) < new Date() && wo.status !== 'completed'
            
            return (
              <Card key={wo.id} className={`${glassStyles?.card} overflow-hidden ${isDelayed ? 'border-l-4 border-l-red-500' : ''}`}>
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4 border-b bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setExpandedWO(isExpanded ? null : wo.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800">{wo.workOrderNumber}</h3>
                            <Badge className={statusStyles[wo.status] || statusStyles.pending}>
                              {wo.status}
                            </Badge>
                            {wo.currentStage && wo.currentStage !== 'ready' && (
                              <Badge variant="outline">
                                {productionStages.find(s => s.id === wo.currentStage)?.icon} {wo.currentStage}
                              </Badge>
                            )}
                            {wo.currentStage === 'ready' && (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                📦 Ready for Dispatch
                              </Badge>
                            )}
                            {wo.priority && wo.priority !== 'normal' && (
                              <Badge className={priorityStyles[wo.priority]}>
                                {wo.priority}
                              </Badge>
                            )}
                            {isDelayed && (
                              <Badge className="bg-red-100 text-red-700">⚠️ Delayed</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {wo.orderNumber && `${wo.orderNumber} • `}{wo.customerName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-slate-500">Due</p>
                          <p className={`font-medium ${isDelayed ? 'text-red-600' : ''}`}>
                            {wo.scheduledEnd ? new Date(wo.scheduledEnd).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-slate-500">Items</p>
                          <p className="font-medium">{wo.itemsCount || 0}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-slate-500">Area</p>
                          <p className="font-medium">{wo.totalArea || 0} sqft</p>
                        </div>
                        
                        {/* Action buttons based on status */}
                        <div className="flex gap-2">
                          {wo.status === 'in-progress' && wo.currentStage !== 'ready' && wo.currentStage !== 'qc' && (
                            <Button size="sm" onClick={() => openStageComplete(wo)}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Stage
                            </Button>
                          )}
                          {wo.currentStage === 'qc' && (
                            <Button size="sm" onClick={() => openQCDialog(wo)} className="bg-indigo-600">
                              <ClipboardCheck className="h-4 w-4 mr-1" /> Run QC
                            </Button>
                          )}
                          {(wo.status === 'completed' || wo.currentStage === 'ready') && (
                            <Button size="sm" className="bg-emerald-600">
                              <Truck className="h-4 w-4 mr-1" /> Dispatch
                            </Button>
                          )}
                          {wo.status === 'rework' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateWorkOrder(wo.id, { status: 'in-progress' })}
                            >
                              <Play className="h-4 w-4 mr-1" /> Resume
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Production Stages - Fabricator mode */}
                  {productionMode === PRODUCTION_MODES.FABRICATOR && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-600">Production Progress</span>
                        {wo.assignedTeam && (
                          <span className="text-sm text-slate-500">
                            <User className="h-4 w-4 inline mr-1" /> {wo.assignedTeam}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {productionStages.map((stage, idx) => {
                          const stageData = wo.stages?.[stage.id]
                          const isCompleted = stageData?.completedAt
                          const isCurrent = wo.currentStage === stage.id
                          
                          return (
                            <div key={stage.id} className="flex items-center">
                              <div 
                                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-w-[100px] ${
                                  isCompleted ? 'border-emerald-500 bg-emerald-50' :
                                  isCurrent ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' :
                                  'border-slate-200 bg-slate-50'
                                }`}
                              >
                                <span className="text-xl mb-1">{stage.icon}</span>
                                <span className="text-xs font-medium text-slate-700 text-center">{stage.name}</span>
                                {isCompleted && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-1" />
                                )}
                                {isCurrent && !isCompleted && (
                                  <span className="text-xs text-blue-600 mt-1">In Progress</span>
                                )}
                              </div>
                              {idx < productionStages.length - 1 && (
                                <ArrowRight className={`h-4 w-4 mx-1 flex-shrink-0 ${
                                  idx < currentStageIndex ? 'text-emerald-500' : 'text-slate-300'
                                }`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manufacturer Mode - Simple Progress */}
                  {productionMode === PRODUCTION_MODES.MANUFACTURER && (
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600">Material Preparation</span>
                            <span className="text-slate-500">{wo.status === 'completed' ? '100' : '50'}%</span>
                          </div>
                          <Progress value={wo.status === 'completed' ? 100 : 50} className="h-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Order Number</Label>
                          <p className="font-medium">{wo.orderNumber || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Site Address</Label>
                          <p className="font-medium">{wo.siteAddress || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Started</Label>
                          <p className="font-medium">
                            {wo.actualStart ? new Date(wo.actualStart).toLocaleDateString() : '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Rework Count</Label>
                          <p className="font-medium">{wo.reworkCount || 0}</p>
                        </div>
                      </div>
                      {wo.notes && (
                        <div className="mt-4">
                          <Label className="text-xs text-slate-500">Notes</Label>
                          <p className="text-sm">{wo.notes}</p>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateWorkOrder(wo.id, { status: 'on-hold' })}
                          disabled={wo.status === 'on-hold'}
                        >
                          <Pause className="h-4 w-4 mr-1" /> Put on Hold
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteWorkOrder(wo.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Work Order Dialog */}
      <Dialog open={showCreateWO} onOpenChange={setShowCreateWO}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>Start production for a new order</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={woForm.customerName}
                onChange={(e) => setWoForm({ ...woForm, customerName: e.target.value })}
                placeholder="Customer or project name"
              />
            </div>
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                value={woForm.orderNumber}
                onChange={(e) => setWoForm({ ...woForm, orderNumber: e.target.value })}
                placeholder="e.g., ORD-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Items Count</Label>
              <Input
                type="number"
                value={woForm.itemsCount}
                onChange={(e) => setWoForm({ ...woForm, itemsCount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Area (sqft)</Label>
              <Input
                type="number"
                value={woForm.totalArea}
                onChange={(e) => setWoForm({ ...woForm, totalArea: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={woForm.priority} onValueChange={(v) => setWoForm({ ...woForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Team</Label>
              <Input
                value={woForm.assignedTeam}
                onChange={(e) => setWoForm({ ...woForm, assignedTeam: e.target.value })}
                placeholder="e.g., Team A"
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Start</Label>
              <Input
                type="date"
                value={woForm.scheduledStart}
                onChange={(e) => setWoForm({ ...woForm, scheduledStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={woForm.scheduledEnd}
                onChange={(e) => setWoForm({ ...woForm, scheduledEnd: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Site Address</Label>
              <Input
                value={woForm.siteAddress}
                onChange={(e) => setWoForm({ ...woForm, siteAddress: e.target.value })}
                placeholder="Delivery/installation address"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={woForm.notes}
                onChange={(e) => setWoForm({ ...woForm, notes: e.target.value })}
                placeholder="Special instructions or notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWO(false)}>Cancel</Button>
            <Button onClick={handleCreateWorkOrder} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Stage Dialog */}
      <Dialog open={showStageComplete} onOpenChange={setShowStageComplete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Stage</DialogTitle>
            <DialogDescription>
              Mark &quot;{productionStages.find(s => s.id === selectedWorkOrder?.currentStage)?.name}&quot; as complete
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Work Order: <span className="font-medium">{selectedWorkOrder?.workOrderNumber}</span>
              </p>
              <p className="text-sm text-slate-600">
                Customer: <span className="font-medium">{selectedWorkOrder?.customerName}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Completion Notes (Optional)</Label>
              <Textarea
                value={stageNotes}
                onChange={(e) => setStageNotes(e.target.value)}
                placeholder="Any notes about this stage..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStageComplete(false)}>Cancel</Button>
            <Button onClick={handleCompleteStage} disabled={saving} className="bg-emerald-600">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Complete & Move to Next'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QC Dialog */}
      <Dialog open={showQCDialog} onOpenChange={setShowQCDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quality Check</DialogTitle>
            <DialogDescription>
              Inspect {selectedWorkOrder?.workOrderNumber} - {selectedWorkOrder?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-3">
              {qcForm.checklist.map((check, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Checkbox
                    checked={check.passed}
                    onCheckedChange={(checked) => {
                      const newChecklist = [...qcForm.checklist]
                      newChecklist[idx].passed = checked
                      setQcForm({ ...qcForm, checklist: newChecklist })
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label className="font-medium">{check.item}</Label>
                    <Input
                      className="mt-2"
                      placeholder="Notes..."
                      value={check.notes}
                      onChange={(e) => {
                        const newChecklist = [...qcForm.checklist]
                        newChecklist[idx].notes = e.target.value
                        setQcForm({ ...qcForm, checklist: newChecklist })
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-amber-800">Rework Notes (if any items failed)</Label>
              <Textarea
                className="mt-2"
                value={qcForm.reworkNotes}
                onChange={(e) => setQcForm({ ...qcForm, reworkNotes: e.target.value })}
                placeholder="Describe what needs to be fixed..."
                rows={2}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg">
              <span className="font-medium">
                Passed: {qcForm.checklist.filter(c => c.passed).length} / {qcForm.checklist.length}
              </span>
              <Badge className={
                qcForm.checklist.every(c => c.passed) 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-amber-100 text-amber-700'
              }>
                {qcForm.checklist.every(c => c.passed) ? 'All Passed' : 'Some Failed'}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQCDialog(false)}>Cancel</Button>
            <Button onClick={handleQCSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Submit QC Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
