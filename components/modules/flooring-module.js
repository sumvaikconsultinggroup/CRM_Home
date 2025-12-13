'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, Package, Ruler, FileText, Wrench, Warehouse,
  Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw, Download,
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle2, Clock,
  AlertTriangle, ArrowUpRight, Calculator, Home, Square, ChevronRight,
  MoreVertical, Copy, Send, Printer, Image, Camera, MapPin, Phone,
  Calendar, Building2, Layers, Grid3X3, Box, Truck, Settings, BarChart3,
  PieChart, Target, Award, Zap, Star, X
} from 'lucide-react'
import { toast } from 'sonner'

// Flooring Categories
const FlooringCategories = {
  hardwood: { label: 'Hardwood', color: 'bg-amber-100 text-amber-700' },
  engineered_wood: { label: 'Engineered Wood', color: 'bg-orange-100 text-orange-700' },
  laminate: { label: 'Laminate', color: 'bg-yellow-100 text-yellow-700' },
  vinyl: { label: 'Vinyl/LVP', color: 'bg-blue-100 text-blue-700' },
  tile: { label: 'Tile', color: 'bg-slate-100 text-slate-700' },
  carpet: { label: 'Carpet', color: 'bg-purple-100 text-purple-700' },
  bamboo: { label: 'Bamboo', color: 'bg-green-100 text-green-700' },
  cork: { label: 'Cork', color: 'bg-rose-100 text-rose-700' }
}

const RoomTypes = {
  living_room: 'Living Room',
  bedroom: 'Bedroom',
  master_bedroom: 'Master Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  dining_room: 'Dining Room',
  hallway: 'Hallway',
  office: 'Office',
  basement: 'Basement',
  other: 'Other'
}

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
  <motion.div whileHover={{ y: -2 }}>
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            {change && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {change.startsWith('+') ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {change}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

// Product Card Component
const ProductCard = ({ product, onEdit, onView }) => (
  <motion.div whileHover={{ y: -2 }}>
    <Card className="overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="h-12 w-12 text-slate-300" />
          </div>
        )}
        <Badge className={`absolute top-2 right-2 ${FlooringCategories[product.category]?.color || 'bg-slate-100'}`}>
          {FlooringCategories[product.category]?.label || product.category}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-slate-900">{product.name}</h3>
            <p className="text-sm text-slate-500">{product.brand}</p>
          </div>
          <Badge variant="outline" className="text-xs">{product.sku}</Badge>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div>
            <p className="text-lg font-bold text-emerald-600">₹{product.pricing?.sellingPrice}/sqft</p>
            <p className="text-xs text-slate-400">{product.pricing?.sqftPerBox} sqft/box</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onView?.(product)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(product)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

// Room Card Component
const RoomCard = ({ room, onEdit, onDelete }) => (
  <motion.div whileHover={{ scale: 1.02 }} className="relative">
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{room.roomName}</h3>
              <p className="text-sm text-slate-500">{RoomTypes[room.roomType] || room.roomType}</p>
            </div>
          </div>
          <Badge variant="outline">{room.floor || 'Ground'}</Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-lg font-bold text-slate-900">{room.dimensions?.length}'</p>
            <p className="text-xs text-slate-500">Length</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-lg font-bold text-slate-900">{room.dimensions?.width}'</p>
            <p className="text-xs text-slate-500">Width</p>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">{room.netArea?.toFixed(0)}</p>
            <p className="text-xs text-slate-500">Sq.ft</p>
          </div>
        </div>

        {room.obstacles?.length > 0 && (
          <p className="text-xs text-amber-600 mb-2">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            {room.obstacles.length} obstacle(s) - {room.obstacles.reduce((sum, o) => sum + o.area, 0).toFixed(0)} sqft deducted
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex gap-2 text-xs text-slate-500">
            <span>{room.doorways || 1} doorway(s)</span>
            <span>•</span>
            <span>{room.subfloorType || 'Concrete'}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(room)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete?.(room)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

// Quote Card Component
const QuoteCard = ({ quote, onView, onEdit, onSend }) => {
  const statusStyles = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-amber-100 text-amber-700'
  }

  return (
    <motion.div whileHover={{ y: -2 }}>
      <Card className="overflow-hidden hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{quote.quoteNumber}</h3>
                <Badge className={statusStyles[quote.status]}>{quote.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">{quote.customerName}</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">₹{quote.grandTotal?.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Square className="h-4 w-4" />
              {quote.totalArea?.toFixed(0)} sqft
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Home className="h-4 w-4" />
              {quote.rooms?.length || 0} rooms
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-slate-500">
              Valid until: {new Date(quote.validUntil).toLocaleDateString()}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onView?.(quote)}>
                <Eye className="h-4 w-4" />
              </Button>
              {quote.status === 'draft' && (
                <Button variant="ghost" size="sm" onClick={() => onSend?.(quote)}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onEdit?.(quote)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Main Flooring Module Component
export function FlooringModule({ client, leads = [], projects = [] }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [products, setProducts] = useState([])
  const [rooms, setRooms] = useState([])
  const [quotes, setQuotes] = useState([])
  const [installations, setInstallations] = useState([])
  const [inventory, setInventory] = useState([])
  
  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false)
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  // Form states
  const [productForm, setProductForm] = useState({
    name: '', brand: '', category: 'hardwood', subcategory: '', sku: '',
    specifications: { thickness: '', width: '', length: '', finish: '' },
    pricing: { costPrice: 0, sellingPrice: 0, sqftPerBox: 20 }
  })

  const [roomForm, setRoomForm] = useState({
    roomName: '', roomType: 'living_room', floor: 'ground',
    dimensions: { length: 0, width: 0, height: 9 },
    doorways: 1, subfloorType: 'concrete', obstacles: []
  })

  useEffect(() => {
    if (client?.id) {
      fetchDashboardData()
      fetchProducts()
    }
  }, [client?.id])

  useEffect(() => {
    if (selectedProject) {
      fetchRooms(selectedProject.id)
      fetchQuotes(selectedProject.id)
    }
  }, [selectedProject])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/flooring/dashboard?clientId=${client.id}`)
      const data = await res.json()
      if (!data.error) setDashboardData(data)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/flooring/products?clientId=${client.id}`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchRooms = async (projectId) => {
    try {
      const res = await fetch(`/api/flooring/rooms?projectId=${projectId}&clientId=${client.id}`)
      const data = await res.json()
      if (data.rooms) setRooms(data.rooms)
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }

  const fetchQuotes = async (projectId) => {
    try {
      const res = await fetch(`/api/flooring/quotes?projectId=${projectId}&clientId=${client.id}`)
      const data = await res.json()
      if (Array.isArray(data)) setQuotes(data)
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    }
  }

  const handleSaveProduct = async () => {
    try {
      const method = editingItem ? 'PUT' : 'POST'
      const body = { ...productForm, clientId: client.id }
      if (editingItem) body.id = editingItem.id

      const res = await fetch('/api/flooring/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingItem ? 'Product updated' : 'Product created')
        fetchProducts()
        setIsProductDialogOpen(false)
        setEditingItem(null)
        resetProductForm()
      }
    } catch (error) {
      toast.error('Failed to save product')
    }
  }

  const handleSaveRoom = async () => {
    try {
      if (!selectedProject) {
        toast.error('Please select a project first')
        return
      }

      const method = editingItem ? 'PUT' : 'POST'
      const body = { 
        ...roomForm, 
        clientId: client.id,
        projectId: selectedProject.id,
        leadId: selectedProject.leadId
      }
      if (editingItem) body.id = editingItem.id

      const res = await fetch('/api/flooring/rooms', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingItem ? 'Room updated' : 'Room added')
        fetchRooms(selectedProject.id)
        setIsRoomDialogOpen(false)
        setEditingItem(null)
        resetRoomForm()
      }
    } catch (error) {
      toast.error('Failed to save room')
    }
  }

  const resetProductForm = () => {
    setProductForm({
      name: '', brand: '', category: 'hardwood', subcategory: '', sku: '',
      specifications: { thickness: '', width: '', length: '', finish: '' },
      pricing: { costPrice: 0, sellingPrice: 0, sqftPerBox: 20 }
    })
  }

  const resetRoomForm = () => {
    setRoomForm({
      roomName: '', roomType: 'living_room', floor: 'ground',
      dimensions: { length: 0, width: 0, height: 9 },
      doorways: 1, subfloorType: 'concrete', obstacles: []
    })
  }

  const openEditProduct = (product) => {
    setEditingItem(product)
    setProductForm(product)
    setIsProductDialogOpen(true)
  }

  const openEditRoom = (room) => {
    setEditingItem(room)
    setRoomForm(room)
    setIsRoomDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flooring Module</h1>
            <p className="text-slate-500">Manage products, measurements, quotes & installations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject?.id || ''} onValueChange={(id) => setSelectedProject(projects.find(p => p.id === id))}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsCalculatorOpen(true)}>
            <Calculator className="h-4 w-4 mr-2" /> Calculator
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" /> Measurements
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Quotes
          </TabsTrigger>
          <TabsTrigger value="installations" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Installations
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" /> Inventory
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Quotes"
              value={dashboardData?.quotes?.total || 0}
              subtitle={`₹${(dashboardData?.quotes?.totalValue || 0).toLocaleString()} total value`}
              change={`+${dashboardData?.quotes?.periodTotal || 0} this month`}
              icon={FileText}
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <StatCard
              title="Approved Quotes"
              value={dashboardData?.quotes?.approved || 0}
              subtitle={`${dashboardData?.quotes?.conversionRate || 0}% conversion rate`}
              icon={CheckCircle2}
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              title="Active Installations"
              value={dashboardData?.installations?.inProgress || 0}
              subtitle={`${dashboardData?.installations?.scheduled || 0} scheduled`}
              icon={Wrench}
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <StatCard
              title="Total Area Installed"
              value={`${(dashboardData?.installations?.totalAreaInstalled || 0).toLocaleString()} sqft`}
              subtitle={`${dashboardData?.installations?.completed || 0} completed projects`}
              icon={Square}
              color="bg-gradient-to-br from-purple-500 to-pink-600"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Quotes */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentQuotes?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentQuotes.map(quote => (
                      <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{quote.quoteNumber}</p>
                          <p className="text-sm text-slate-500">{quote.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">₹{quote.grandTotal?.toLocaleString()}</p>
                          <Badge variant="outline">{quote.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No recent quotes</p>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.lowStockProducts?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.lowStockProducts.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <p className="text-sm font-medium">{item.product?.name || 'Unknown'}</p>
                        <Badge variant="destructive">{item.availableQty} left</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">All stock levels OK</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search products..." className="pl-10 w-[300px]" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(FlooringCategories).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { resetProductForm(); setEditingItem(null); setIsProductDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={openEditProduct}
                onView={(p) => toast.info(`View ${p.name}`)}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No products yet</h3>
              <p className="text-slate-500 mb-4">Add your flooring products to get started</p>
              <Button onClick={() => setIsProductDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add First Product
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="mt-6 space-y-4">
          {selectedProject ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Room Measurements</h3>
                  <p className="text-sm text-slate-500">Project: {selectedProject.name}</p>
                </div>
                <Button onClick={() => { resetRoomForm(); setEditingItem(null); setIsRoomDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Room
                </Button>
              </div>

              {/* Room Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{rooms.length}</p>
                    <p className="text-sm text-slate-500">Total Rooms</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">
                      {rooms.reduce((sum, r) => sum + (r.netArea || 0), 0).toFixed(0)}
                    </p>
                    <p className="text-sm text-slate-500">Total Sq.ft</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">
                      {rooms.reduce((sum, r) => sum + (r.doorways || 1), 0)}
                    </p>
                    <p className="text-sm text-slate-500">Total Doorways</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(room => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onEdit={openEditRoom}
                    onDelete={(r) => toast.info(`Delete ${r.roomName}`)}
                  />
                ))}
              </div>

              {rooms.length === 0 && (
                <div className="text-center py-12">
                  <Ruler className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No rooms measured</h3>
                  <p className="text-slate-500 mb-4">Add room measurements for this project</p>
                  <Button onClick={() => setIsRoomDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add First Room
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Select a Project</h3>
              <p className="text-slate-500">Choose a project from the dropdown above to manage room measurements</p>
            </div>
          )}
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{quotes.length} quotes</Badge>
            </div>
            <Button onClick={() => setIsQuoteDialogOpen(true)} disabled={!selectedProject}>
              <Plus className="h-4 w-4 mr-2" /> Create Quote
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onView={(q) => toast.info(`View quote ${q.quoteNumber}`)}
                onEdit={(q) => toast.info(`Edit quote ${q.quoteNumber}`)}
                onSend={(q) => toast.success(`Quote ${q.quoteNumber} sent!`)}
              />
            ))}
          </div>

          {quotes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No quotes yet</h3>
              <p className="text-slate-500 mb-4">Create your first flooring quote</p>
            </div>
          )}
        </TabsContent>

        {/* Installations Tab */}
        <TabsContent value="installations" className="mt-6">
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Installation Management</h3>
            <p className="text-slate-500">Track and manage flooring installations</p>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-6">
          <div className="text-center py-12">
            <Warehouse className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Inventory Management</h3>
            <p className="text-slate-500">Track stock levels and manage inventory</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>Add flooring products to your catalog</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g., Classic Oak Hardwood"
                />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  placeholder="e.g., Armstrong"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FlooringCategories).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>
            <Separator />
            <h4 className="font-medium">Specifications</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Thickness</Label>
                <Input
                  value={productForm.specifications?.thickness || ''}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    specifications: { ...productForm.specifications, thickness: e.target.value }
                  })}
                  placeholder="e.g., 3/4 inch"
                />
              </div>
              <div className="space-y-2">
                <Label>Width</Label>
                <Input
                  value={productForm.specifications?.width || ''}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    specifications: { ...productForm.specifications, width: e.target.value }
                  })}
                  placeholder="e.g., 5 inch"
                />
              </div>
              <div className="space-y-2">
                <Label>Length</Label>
                <Input
                  value={productForm.specifications?.length || ''}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    specifications: { ...productForm.specifications, length: e.target.value }
                  })}
                  placeholder="e.g., Random"
                />
              </div>
              <div className="space-y-2">
                <Label>Finish</Label>
                <Input
                  value={productForm.specifications?.finish || ''}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    specifications: { ...productForm.specifications, finish: e.target.value }
                  })}
                  placeholder="e.g., Matte"
                />
              </div>
            </div>
            <Separator />
            <h4 className="font-medium">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost Price (₹/sqft)</Label>
                <Input
                  type="number"
                  value={productForm.pricing?.costPrice || ''}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    pricing: { ...productForm.pricing, costPrice: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price (₹/sqft) *</Label>
                <Input
                  type="number"
                  value={productForm.pricing?.sellingPrice || ''}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    pricing: { ...productForm.pricing, sellingPrice: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sqft per Box</Label>
                <Input
                  type="number"
                  value={productForm.pricing?.sqftPerBox || 20}
                  onChange={(e) => setProductForm({ 
                    ...productForm, 
                    pricing: { ...productForm.pricing, sqftPerBox: parseFloat(e.target.value) || 20 }
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProduct}>
              {editingItem ? 'Update' : 'Add'} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            <DialogDescription>Enter room dimensions for accurate flooring calculations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Name *</Label>
                <Input
                  value={roomForm.roomName}
                  onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })}
                  placeholder="e.g., Master Bedroom"
                />
              </div>
              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select value={roomForm.roomType} onValueChange={(v) => setRoomForm({ ...roomForm, roomType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RoomTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <h4 className="font-medium">Dimensions (in feet)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Length *</Label>
                <Input
                  type="number"
                  value={roomForm.dimensions?.length || ''}
                  onChange={(e) => setRoomForm({ 
                    ...roomForm, 
                    dimensions: { ...roomForm.dimensions, length: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Width *</Label>
                <Input
                  type="number"
                  value={roomForm.dimensions?.width || ''}
                  onChange={(e) => setRoomForm({ 
                    ...roomForm, 
                    dimensions: { ...roomForm.dimensions, width: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Calculated Area</Label>
                <div className="h-10 flex items-center px-3 bg-blue-50 rounded-md border">
                  <span className="font-bold text-blue-600">
                    {((roomForm.dimensions?.length || 0) * (roomForm.dimensions?.width || 0)).toFixed(0)} sqft
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Floor Level</Label>
                <Select value={roomForm.floor} onValueChange={(v) => setRoomForm({ ...roomForm, floor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basement">Basement</SelectItem>
                    <SelectItem value="ground">Ground Floor</SelectItem>
                    <SelectItem value="first">First Floor</SelectItem>
                    <SelectItem value="second">Second Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Doorways</Label>
                <Input
                  type="number"
                  value={roomForm.doorways}
                  onChange={(e) => setRoomForm({ ...roomForm, doorways: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subfloor Type</Label>
                <Select value={roomForm.subfloorType} onValueChange={(v) => setRoomForm({ ...roomForm, subfloorType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concrete">Concrete</SelectItem>
                    <SelectItem value="plywood">Plywood</SelectItem>
                    <SelectItem value="existing">Existing Flooring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoom}>
              {editingItem ? 'Update' : 'Add'} Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Flooring Calculator</DialogTitle>
            <DialogDescription>Calculate materials and costs for flooring projects</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <Calculator className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select rooms and products to calculate requirements</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCalculatorOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FlooringModule
