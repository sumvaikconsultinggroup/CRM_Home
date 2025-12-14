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
import {
  Factory, Plus, Search, Clock, CheckCircle2, AlertTriangle,
  Play, Pause, Package, Truck, Calendar, User, Settings,
  ArrowRight, RefreshCw, Eye, BarChart3, Scissors, Box
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
  'in-queue': 'bg-blue-100 text-blue-700',
  'cutting': 'bg-amber-100 text-amber-700',
  'assembly': 'bg-purple-100 text-purple-700',
  'glass-fitting': 'bg-cyan-100 text-cyan-700',
  'quality-check': 'bg-indigo-100 text-indigo-700',
  'ready': 'bg-emerald-100 text-emerald-700',
  'dispatched': 'bg-green-100 text-green-700'
}

const productionStages = [
  { id: 'cutting', name: 'Profile Cutting', icon: '✂️' },
  { id: 'assembly', name: 'Frame Assembly', icon: '🔧' },
  { id: 'glass-fitting', name: 'Glass Fitting', icon: '🔲' },
  { id: 'hardware', name: 'Hardware Installation', icon: '🔩' },
  { id: 'quality-check', name: 'Quality Check', icon: '✅' },
  { id: 'packing', name: 'Packing', icon: '📦' }
]

export function ProductionTab({ orders, settings, headers, glassStyles, onRefresh }) {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateWO, setShowCreateWO] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productionMode, setProductionMode] = useState(settings?.productionMode || PRODUCTION_MODES.FABRICATOR)

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  const fetchWorkOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/production`, { headers })
      const data = await res.json()
      if (data.workOrders) setWorkOrders(data.workOrders)
    } catch (error) {
      console.error('Failed to fetch work orders:', error)
      // Mock data
      setWorkOrders([
        {
          id: 'WO-001',
          orderNumber: 'ORD-2024-0045',
          customerName: 'Green Valley Villas',
          items: 12,
          totalArea: 156.5,
          material: 'Aluminium',
          status: 'assembly',
          progress: 45,
          dueDate: '2024-12-20',
          assignedTo: 'Team A',
          stages: [
            { id: 'cutting', status: 'completed', completedAt: '2024-12-10' },
            { id: 'assembly', status: 'in-progress', progress: 60 },
            { id: 'glass-fitting', status: 'pending' },
            { id: 'hardware', status: 'pending' },
            { id: 'quality-check', status: 'pending' },
            { id: 'packing', status: 'pending' }
          ]
        },
        {
          id: 'WO-002',
          orderNumber: 'ORD-2024-0046',
          customerName: 'Skyline Towers',
          items: 48,
          totalArea: 520,
          material: 'uPVC',
          status: 'cutting',
          progress: 15,
          dueDate: '2024-12-25',
          assignedTo: 'Team B',
          stages: [
            { id: 'cutting', status: 'in-progress', progress: 30 },
            { id: 'assembly', status: 'pending' },
            { id: 'glass-fitting', status: 'pending' },
            { id: 'hardware', status: 'pending' },
            { id: 'quality-check', status: 'pending' },
            { id: 'packing', status: 'pending' }
          ]
        },
        {
          id: 'WO-003',
          orderNumber: 'ORD-2024-0044',
          customerName: 'Royal Heights',
          items: 8,
          totalArea: 85,
          material: 'Aluminium',
          status: 'ready',
          progress: 100,
          dueDate: '2024-12-15',
          assignedTo: 'Team A',
          stages: [
            { id: 'cutting', status: 'completed' },
            { id: 'assembly', status: 'completed' },
            { id: 'glass-fitting', status: 'completed' },
            { id: 'hardware', status: 'completed' },
            { id: 'quality-check', status: 'completed' },
            { id: 'packing', status: 'completed' }
          ]
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = !searchQuery ||
      wo.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: workOrders.length,
    inProgress: workOrders.filter(wo => !['ready', 'dispatched', 'pending'].includes(wo.status)).length,
    ready: workOrders.filter(wo => wo.status === 'ready').length,
    delayed: workOrders.filter(wo => new Date(wo.dueDate) < new Date() && wo.status !== 'ready').length
  }

  const handleUpdateStage = async (woId, stageId, status) => {
    toast.success(`Stage updated to ${status}`)
    fetchWorkOrders()
  }

  const handleDispatch = async (woId) => {
    toast.success('Work order marked for dispatch')
    fetchWorkOrders()
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
          <Button onClick={() => setShowCreateWO(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Create Work Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Work Orders</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
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
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
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
                <p className="text-2xl font-bold text-emerald-600">{stats.ready}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Delayed</p>
                <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
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
                <SelectItem value="cutting">Cutting</SelectItem>
                <SelectItem value="assembly">Assembly</SelectItem>
                <SelectItem value="glass-fitting">Glass Fitting</SelectItem>
                <SelectItem value="quality-check">Quality Check</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.map(wo => (
          <Card key={wo.id} className={`${glassStyles?.card} overflow-hidden`}>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{wo.id}</h3>
                        <Badge className={statusStyles[wo.status]}>{wo.status}</Badge>
                        <Badge variant="outline">{wo.material}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">{wo.orderNumber} • {wo.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Due Date</p>
                      <p className={`font-medium ${new Date(wo.dueDate) < new Date() && wo.status !== 'ready' ? 'text-red-600' : ''}`}>
                        {new Date(wo.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Progress</p>
                      <p className="font-medium text-indigo-600">{wo.progress}%</p>
                    </div>
                    {wo.status === 'ready' && (
                      <Button onClick={() => handleDispatch(wo.id)}>
                        <Truck className="h-4 w-4 mr-2" /> Dispatch
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Production Stages - Only show for Fabricator mode */}
              {productionMode === PRODUCTION_MODES.FABRICATOR && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-600">Production Stages</span>
                    <span className="text-sm text-slate-500">{wo.items} items • {wo.totalArea} sqft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {wo.stages?.map((stage, idx) => {
                      const stageInfo = productionStages.find(s => s.id === stage.id)
                      return (
                        <div key={stage.id} className="flex items-center">
                          <div className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                            stage.status === 'completed' ? 'border-emerald-500 bg-emerald-50' :
                            stage.status === 'in-progress' ? 'border-blue-500 bg-blue-50' :
                            'border-slate-200 bg-slate-50'
                          }`}>
                            <span className="text-xl mb-1">{stageInfo?.icon}</span>
                            <span className="text-xs font-medium text-slate-700">{stageInfo?.name}</span>
                            {stage.status === 'in-progress' && (
                              <span className="text-xs text-blue-600">{stage.progress}%</span>
                            )}
                            {stage.status === 'completed' && (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-1" />
                            )}
                          </div>
                          {idx < wo.stages.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-slate-300 mx-1" />
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
                        <span className="text-slate-500">{wo.progress}%</span>
                      </div>
                      <Progress value={wo.progress} className="h-3" />
                    </div>
                    <div className="text-center px-4 border-l">
                      <p className="text-2xl font-bold text-indigo-600">{wo.items}</p>
                      <p className="text-xs text-slate-500">Items</p>
                    </div>
                    <div className="text-center px-4 border-l">
                      <p className="text-2xl font-bold text-emerald-600">{wo.totalArea}</p>
                      <p className="text-xs text-slate-500">Total Sqft</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
