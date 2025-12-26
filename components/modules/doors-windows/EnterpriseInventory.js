'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Package, Plus, Search, AlertTriangle, ArrowDown, ArrowUp, Warehouse,
  Box, Layers, Filter, Download, Upload, RefreshCw, Edit, Eye,
  Trash2, BarChart3, TrendingDown, CheckCircle2, XCircle, Loader2,
  Lock, Unlock, Truck, FileText, ClipboardList, Settings, History,
  ShoppingCart, Factory, Ruler, Grid3X3, Palette, Cog, DoorOpen,
  ArrowRightLeft, Bell, Calculator, IndianRupee, Calendar, MapPin
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// =============================================
// D&W INDUSTRY-SPECIFIC CONSTANTS
// =============================================

// Material Categories specific to D&W industry
const DW_MATERIAL_CATEGORIES = [
  { 
    id: 'aluminium-profiles', 
    name: 'Aluminium Profiles', 
    icon: '🔩',
    unit: 'rft',
    unitLabel: 'Running Feet',
    subcategories: ['Series 50', 'Series 60', 'Series 70', 'Series 80', 'Series 100', 'Thermal Break']
  },
  { 
    id: 'upvc-profiles', 
    name: 'uPVC Profiles', 
    icon: '🪟',
    unit: 'rft',
    unitLabel: 'Running Feet',
    subcategories: ['60mm System', '70mm System', '80mm System', 'Sliding', 'Casement']
  },
  { 
    id: 'glass', 
    name: 'Glass', 
    icon: '🔲',
    unit: 'sqft',
    unitLabel: 'Square Feet',
    subcategories: ['Float Clear', 'Float Tinted', 'Toughened', 'Laminated', 'DGU/IGU', 'Reflective', 'Low-E']
  },
  { 
    id: 'hardware', 
    name: 'Hardware & Fittings', 
    icon: '🔧',
    unit: 'pcs',
    unitLabel: 'Pieces',
    subcategories: ['Handles', 'Hinges', 'Locks', 'Rollers', 'Friction Stays', 'Espagnolette', 'Multi-Point Locks']
  },
  { 
    id: 'sealants', 
    name: 'Sealants & Adhesives', 
    icon: '💧',
    unit: 'tube',
    unitLabel: 'Tubes/Cartridges',
    subcategories: ['Silicone Sealant', 'PU Sealant', 'Butyl Tape', 'EPDM Gaskets', 'Weatherstrip']
  },
  { 
    id: 'accessories', 
    name: 'Accessories', 
    icon: '📎',
    unit: 'pcs',
    unitLabel: 'Pieces',
    subcategories: ['Mosquito Mesh', 'Corner Cleats', 'Drainage Caps', 'End Caps', 'Screws & Fasteners']
  },
  { 
    id: 'glass-processing', 
    name: 'Glass Processing', 
    icon: '⚙️',
    unit: 'sqft',
    unitLabel: 'Square Feet',
    subcategories: ['Cutting', 'Edge Polishing', 'Holes', 'Notches', 'Tempering']
  },
  { 
    id: 'finished-goods', 
    name: 'Finished Products', 
    icon: '🚪',
    unit: 'pcs',
    unitLabel: 'Units',
    subcategories: ['Windows', 'Doors', 'Partitions', 'Facades', 'Skylights']
  }
]

// Glass Types with specifications
const GLASS_SPECIFICATIONS = [
  { thickness: '4mm', type: 'Float Clear', pricePerSqft: 45 },
  { thickness: '5mm', type: 'Float Clear', pricePerSqft: 55 },
  { thickness: '6mm', type: 'Float Clear', pricePerSqft: 65 },
  { thickness: '8mm', type: 'Float Clear', pricePerSqft: 85 },
  { thickness: '10mm', type: 'Float Clear', pricePerSqft: 110 },
  { thickness: '12mm', type: 'Float Clear', pricePerSqft: 140 },
  { thickness: '5mm', type: 'Toughened', pricePerSqft: 120 },
  { thickness: '6mm', type: 'Toughened', pricePerSqft: 140 },
  { thickness: '8mm', type: 'Toughened', pricePerSqft: 180 },
  { thickness: '10mm', type: 'Toughened', pricePerSqft: 220 },
  { thickness: '12mm', type: 'Toughened', pricePerSqft: 280 },
  { thickness: '6mm+6mm', type: 'Laminated', pricePerSqft: 320 },
  { thickness: '5mm+12A+5mm', type: 'DGU Clear', pricePerSqft: 280 },
  { thickness: '6mm+12A+6mm', type: 'DGU Clear', pricePerSqft: 320 },
]

// Profile Series with specifications
const PROFILE_SPECIFICATIONS = [
  { series: 'Series 50', weight: 0.8, pricePerRft: 180, application: 'Light Duty' },
  { series: 'Series 60', weight: 1.0, pricePerRft: 220, application: 'Medium Duty' },
  { series: 'Series 70', weight: 1.2, pricePerRft: 280, application: 'Heavy Duty' },
  { series: 'Series 80', weight: 1.5, pricePerRft: 350, application: 'Commercial' },
  { series: 'Series 100', weight: 2.0, pricePerRft: 450, application: 'High-Rise' },
  { series: 'Thermal Break', weight: 1.8, pricePerRft: 550, application: 'Energy Efficient' },
]

// Status styles
const stockStatusStyles = {
  'in-stock': 'bg-emerald-100 text-emerald-700',
  'low-stock': 'bg-amber-100 text-amber-700',
  'critical': 'bg-red-100 text-red-700',
  'out-of-stock': 'bg-slate-100 text-slate-700',
  'reserved': 'bg-blue-100 text-blue-700',
  'on-order': 'bg-purple-100 text-purple-700'
}

const movementTypeStyles = {
  'grn': 'bg-emerald-100 text-emerald-700',
  'dispatch': 'bg-blue-100 text-blue-700',
  'transfer': 'bg-purple-100 text-purple-700',
  'adjustment': 'bg-amber-100 text-amber-700',
  'return': 'bg-orange-100 text-orange-700',
  'wastage': 'bg-red-100 text-red-700',
  'production': 'bg-indigo-100 text-indigo-700'
}

export function EnterpriseInventoryDW({ client, user }) {
  // State management
  const [activeSubTab, setActiveSubTab] = useState('stock')
  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  
  // Dialog states
  const [showAddItem, setShowAddItem] = useState(false)
  const [showGRN, setShowGRN] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  
  // Warehouse form state
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    type: 'branch',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    phone: '',
    email: '',
    capacity: '',
    capacityUnit: 'sqft',
    notes: '',
    isDefault: false
  })
  
  // Form state for new item
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    unit: 'pcs',
    currentQty: 0,
    minStock: 10,
    maxStock: 1000,
    reorderPoint: 20,
    costPrice: 0,
    sellingPrice: 0,
    warehouse: '',
    location: '',
    // D&W specific fields
    specifications: {
      thickness: '',
      series: '',
      color: '',
      finish: '',
      brand: '',
      grade: ''
    },
    supplier: '',
    leadTime: 7,
    hsnCode: '',
    gstRate: 18
  })

  // GRN form state
  const [grnData, setGrnData] = useState({
    itemId: '',
    quantity: 0,
    poNumber: '',
    invoiceNumber: '',
    invoiceDate: '',
    supplier: '',
    warehouse: '',
    location: '',
    batchNumber: '',
    unitCost: 0,
    notes: ''
  })

  // Fetch data
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [invRes, movRes, whRes, poRes, supRes, resRes] = await Promise.all([
        fetch(`${API_BASE}/inventory`, { headers }),
        fetch(`${API_BASE}/inventory/movements`, { headers }),
        fetch(`${API_BASE}/warehouses`, { headers }),
        fetch(`${API_BASE}/purchase-orders`, { headers }),
        fetch(`${API_BASE}/suppliers`, { headers }),
        fetch(`${API_BASE}/inventory/reservations`, { headers })
      ])

      if (invRes.ok) {
        const data = await invRes.json()
        setInventory(data.data?.items || data.items || [])
      }
      if (movRes.ok) {
        const data = await movRes.json()
        setMovements(data.data?.movements || data.movements || [])
      }
      if (whRes.ok) {
        const data = await whRes.json()
        setWarehouses(data.data?.warehouses || data.warehouses || [
          { id: 'main', name: 'Main Warehouse', location: 'Factory' },
          { id: 'site-1', name: 'Site Store 1', location: 'Project Site' }
        ])
      }
      if (poRes.ok) {
        const data = await poRes.json()
        setPurchaseOrders(data.data?.orders || data.orders || [])
      }
      if (supRes.ok) {
        const data = await supRes.json()
        setSuppliers(data.data?.suppliers || data.suppliers || [])
      }
      if (resRes.ok) {
        const data = await resRes.json()
        setReservations(data.data?.reservations || data.reservations || [])
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics
  const totalItems = inventory.length
  const totalValue = inventory.reduce((sum, item) => sum + ((item.currentQty || 0) * (item.costPrice || 0)), 0)
  const lowStockItems = inventory.filter(item => (item.currentQty || 0) <= (item.reorderPoint || 10))
  const outOfStockItems = inventory.filter(item => (item.currentQty || 0) === 0)
  const reservedValue = reservations.reduce((sum, res) => sum + (res.quantity * (res.unitPrice || 0)), 0)

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesWarehouse = warehouseFilter === 'all' || item.warehouse === warehouseFilter
    return matchesSearch && matchesCategory && matchesWarehouse
  })

  // Handle add item
  const handleAddItem = async () => {
    try {
      const response = await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newItem)
      })
      
      if (response.ok) {
        toast.success('Item added successfully')
        setShowAddItem(false)
        setNewItem({
          name: '', sku: '', category: '', subcategory: '', unit: 'pcs',
          currentQty: 0, minStock: 10, maxStock: 1000, reorderPoint: 20,
          costPrice: 0, sellingPrice: 0, warehouse: '', location: '',
          specifications: { thickness: '', series: '', color: '', finish: '', brand: '', grade: '' },
          supplier: '', leadTime: 7, hsnCode: '', gstRate: 18
        })
        fetchAllData()
      } else {
        toast.error('Failed to add item')
      }
    } catch (error) {
      toast.error('Error adding item')
    }
  }

  // Handle GRN
  const handleGRN = async () => {
    try {
      const response = await fetch(`${API_BASE}/inventory/grn`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(grnData)
      })
      
      if (response.ok) {
        toast.success('GRN recorded successfully')
        setShowGRN(false)
        setGrnData({
          itemId: '', quantity: 0, poNumber: '', invoiceNumber: '',
          invoiceDate: '', supplier: '', warehouse: '', location: '',
          batchNumber: '', unitCost: 0, notes: ''
        })
        fetchAllData()
      } else {
        toast.error('Failed to record GRN')
      }
    } catch (error) {
      toast.error('Error recording GRN')
    }
  }

  // Handle Add Warehouse
  const handleAddWarehouse = async () => {
    if (!warehouseForm.name) {
      toast.error('Warehouse name is required')
      return
    }
    
    try {
      const response = await fetch(`${API_BASE}/warehouses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(warehouseForm)
      })
      
      if (response.ok) {
        toast.success('Warehouse created successfully')
        setShowAddWarehouse(false)
        setWarehouseForm({
          name: '', code: '', type: 'branch', address: '', city: '',
          state: '', pincode: '', contactPerson: '', phone: '', email: '',
          capacity: '', capacityUnit: 'sqft', notes: '', isDefault: false
        })
        fetchAllData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create warehouse')
      }
    } catch (error) {
      toast.error('Error creating warehouse')
    }
  }

  // Handle Update Warehouse
  const handleUpdateWarehouse = async () => {
    if (!selectedWarehouse?.id) return
    
    try {
      const response = await fetch(`${API_BASE}/warehouses`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: selectedWarehouse.id, ...warehouseForm })
      })
      
      if (response.ok) {
        toast.success('Warehouse updated successfully')
        setSelectedWarehouse(null)
        setWarehouseForm({
          name: '', code: '', type: 'branch', address: '', city: '',
          state: '', pincode: '', contactPerson: '', phone: '', email: '',
          capacity: '', capacityUnit: 'sqft', notes: '', isDefault: false
        })
        fetchAllData()
      } else {
        toast.error('Failed to update warehouse')
      }
    } catch (error) {
      toast.error('Error updating warehouse')
    }
  }

  // Handle Delete Warehouse
  const handleDeleteWarehouse = async (warehouseId) => {
    if (!confirm('Are you sure you want to deactivate this warehouse?')) return
    
    try {
      const response = await fetch(`${API_BASE}/warehouses?id=${warehouseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        toast.success('Warehouse deactivated successfully')
        fetchAllData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete warehouse')
      }
    } catch (error) {
      toast.error('Error deleting warehouse')
    }
  }

  // Open edit warehouse dialog
  const openEditWarehouse = (warehouse) => {
    setSelectedWarehouse(warehouse)
    setWarehouseForm({
      name: warehouse.name || '',
      code: warehouse.code || '',
      type: warehouse.type || 'branch',
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      pincode: warehouse.pincode || '',
      contactPerson: warehouse.contactPerson || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      capacity: warehouse.capacity || '',
      capacityUnit: warehouse.capacityUnit || 'sqft',
      notes: warehouse.notes || '',
      isDefault: warehouse.isDefault || false
    })
  }

  // Get stock status
  const getStockStatus = (item) => {
    if ((item.currentQty || 0) === 0) return 'out-of-stock'
    if ((item.currentQty || 0) <= (item.minStock || 5)) return 'critical'
    if ((item.currentQty || 0) <= (item.reorderPoint || 10)) return 'low-stock'
    return 'in-stock'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading inventory...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-indigo-600" />
            D&W Inventory Management
          </h2>
          <p className="text-slate-500">Enterprise inventory for Doors & Windows manufacturing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowGRN(true)}>
            <ArrowDown className="h-4 w-4 mr-2" /> Goods Receipt
          </Button>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600" onClick={() => setShowAddItem(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Material
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Total Items</p>
                <p className="text-2xl font-bold text-indigo-700">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="text-xs text-indigo-500 mt-1">{DW_MATERIAL_CATEGORIES.length} categories</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Stock Value</p>
                <p className="text-2xl font-bold text-emerald-700">₹{(totalValue/100000).toFixed(1)}L</p>
              </div>
              <IndianRupee className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-500 mt-1">Total inventory value</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-amber-700">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <p className="text-xs text-amber-500 mt-1">Need reorder</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Out of Stock</p>
                <p className="text-2xl font-bold text-red-700">{outOfStockItems.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-xs text-red-500 mt-1">Urgent attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Reserved</p>
                <p className="text-2xl font-bold text-blue-700">{reservations.length}</p>
              </div>
              <Lock className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-xs text-blue-500 mt-1">₹{(reservedValue/100000).toFixed(1)}L value</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Pending POs</p>
                <p className="text-2xl font-bold text-purple-700">{purchaseOrders.filter(po => po.status === 'pending').length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-400" />
            </div>
            <p className="text-xs text-purple-500 mt-1">Orders in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="stock" className="flex items-center gap-1">
            <Package className="h-4 w-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-1">
            <Layers className="h-4 w-4" /> Materials
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-1">
            <History className="h-4 w-4" /> Movements
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-1">
            <Lock className="h-4 w-4" /> Reservations
          </TabsTrigger>
          <TabsTrigger value="purchase" className="flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" /> Purchase
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-1">
            <Warehouse className="h-4 w-4" /> Warehouses
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <Bell className="h-4 w-4" /> Alerts
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, SKU..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {DW_MATERIAL_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stock Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Item Details</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Specifications</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        No inventory items found. Add materials to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => {
                      const cat = DW_MATERIAL_CATEGORIES.find(c => c.id === item.category)
                      const status = getStockStatus(item)
                      const reserved = reservations.filter(r => r.itemId === item.id).reduce((sum, r) => sum + r.quantity, 0)
                      const available = (item.currentQty || 0) - reserved
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{cat?.icon || '📦'}</span>
                              <div>
                                <p className="text-sm">{cat?.name || item.category}</p>
                                <p className="text-xs text-slate-500">{item.subcategory}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.specifications?.thickness && <p>Thickness: {item.specifications.thickness}</p>}
                              {item.specifications?.series && <p>Series: {item.specifications.series}</p>}
                              {item.specifications?.color && <p>Color: {item.specifications.color}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {available} {cat?.unit || item.unit}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {reserved} {cat?.unit || item.unit}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.currentQty || 0} {cat?.unit || item.unit}
                          </TableCell>
                          <TableCell>
                            <Badge className={stockStatusStyles[status]}>
                              {status.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{((item.currentQty || 0) * (item.costPrice || 0)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Catalog Tab */}
        <TabsContent value="materials" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DW_MATERIAL_CATEGORIES.map(cat => {
              const catItems = inventory.filter(i => i.category === cat.id)
              const catValue = catItems.reduce((sum, i) => sum + ((i.currentQty || 0) * (i.costPrice || 0)), 0)
              
              return (
                <Card key={cat.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{cat.icon}</span>
                      {cat.name}
                    </CardTitle>
                    <CardDescription>{cat.subcategories.length} types • {cat.unitLabel}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Items</span>
                        <span className="font-semibold">{catItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Value</span>
                        <span className="font-semibold text-emerald-600">₹{(catValue/1000).toFixed(0)}K</span>
                      </div>
                      <Separator />
                      <div className="flex flex-wrap gap-1">
                        {cat.subcategories.slice(0, 3).map(sub => (
                          <Badge key={sub} variant="outline" className="text-xs">{sub}</Badge>
                        ))}
                        {cat.subcategories.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{cat.subcategories.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Stock Movements History
              </CardTitle>
              <CardDescription>Track all inventory movements - GRN, dispatches, transfers, adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No movements recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.slice(0, 20).map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>{new Date(mov.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={movementTypeStyles[mov.type] || 'bg-slate-100'}>
                            {mov.type?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{mov.itemName}</TableCell>
                        <TableCell>{mov.reference || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${mov.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {mov.quantity > 0 ? '+' : ''}{mov.quantity} {mov.unit}
                        </TableCell>
                        <TableCell>{mov.warehouse}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{mov.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations Tab */}
        <TabsContent value="reservations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Stock Reservations
              </CardTitle>
              <CardDescription>Materials reserved for quotes, orders, and production</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reserved By</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No active reservations
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium">{res.reference}</TableCell>
                        <TableCell>{res.itemName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{res.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{res.quantity} {res.unit}</TableCell>
                        <TableCell>{res.reservedBy}</TableCell>
                        <TableCell>{new Date(res.validUntil).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Unlock className="h-4 w-4 mr-1" /> Release
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Purchase Orders
                  </CardTitle>
                  <CardDescription>Manage supplier orders and track deliveries</CardDescription>
                </div>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  <Plus className="h-4 w-4 mr-2" /> Create PO
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No purchase orders yet. Create one to order materials.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{po.items?.length || 0} items</TableCell>
                        <TableCell className="text-right">₹{(po.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            po.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                            po.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                            po.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map(wh => {
              const whItems = inventory.filter(i => i.warehouse === wh.id)
              const whValue = whItems.reduce((sum, i) => sum + ((i.currentQty || 0) * (i.costPrice || 0)), 0)
              
              return (
                <Card key={wh.id} className={wh.isDefault ? 'ring-2 ring-indigo-500' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Warehouse className="h-5 w-5 text-indigo-600" />
                          {wh.name}
                          {wh.isDefault && <Badge className="bg-indigo-100 text-indigo-700 text-xs">Default</Badge>}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {wh.city || wh.address || 'No location set'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditWarehouse(wh)}>
                          <Edit className="h-4 w-4 text-slate-500" />
                        </Button>
                        {!wh.isDefault && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteWarehouse(wh.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Code:</span>
                          <span className="font-medium">{wh.code || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Type:</span>
                          <span className="font-medium capitalize">{wh.type || 'branch'}</span>
                        </div>
                      </div>
                      {wh.contactPerson && (
                        <div className="text-sm">
                          <span className="text-slate-500">Contact:</span>{' '}
                          <span className="font-medium">{wh.contactPerson}</span>
                          {wh.phone && <span className="text-slate-500"> • {wh.phone}</span>}
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Items</span>
                        <span className="font-semibold">{whItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stock Value</span>
                        <span className="font-semibold text-emerald-600">₹{(whValue/100000).toFixed(1)}L</span>
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <BarChart3 className="h-4 w-4 mr-1" /> Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            <Card className="border-dashed border-2 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors cursor-pointer" onClick={() => setShowAddWarehouse(true)}>
              <CardContent className="flex items-center justify-center h-full min-h-48">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-indigo-100">
                    <Plus className="h-8 w-8 text-indigo-600" />
                  </div>
                  <span className="font-medium text-indigo-600">Add Warehouse</span>
                  <span className="text-xs text-slate-500">Create a new storage location</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-4">
            {/* Low Stock Alerts */}
            <Card className="border-amber-200">
              <CardHeader className="bg-amber-50">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alerts ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lowStockItems.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">All stock levels are healthy!</p>
                ) : (
                  <div className="divide-y">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-600">{item.currentQty} {item.unit}</p>
                          <p className="text-sm text-slate-500">Reorder at: {item.reorderPoint}</p>
                        </div>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <ShoppingCart className="h-4 w-4 mr-1" /> Order
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Out of Stock Alerts */}
            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  Out of Stock ({outOfStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {outOfStockItems.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No items out of stock!</p>
                ) : (
                  <div className="divide-y">
                    {outOfStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700">OUT OF STOCK</Badge>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">
                          <ShoppingCart className="h-4 w-4 mr-1" /> Urgent Order
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add New Material
            </DialogTitle>
            <DialogDescription>Add inventory item with D&W industry specifications</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Material Name *</Label>
              <Input 
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                placeholder="e.g., Aluminium Profile Series 60"
              />
            </div>
            
            <div>
              <Label>SKU *</Label>
              <Input 
                value={newItem.sku}
                onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                placeholder="e.g., ALP-S60-001"
              />
            </div>
            
            <div>
              <Label>Category *</Label>
              <Select value={newItem.category} onValueChange={(v) => setNewItem({...newItem, category: v})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {DW_MATERIAL_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Subcategory</Label>
              <Select value={newItem.subcategory} onValueChange={(v) => setNewItem({...newItem, subcategory: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(DW_MATERIAL_CATEGORIES.find(c => c.id === newItem.category)?.subcategories || []).map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Unit</Label>
              <Select value={newItem.unit} onValueChange={(v) => setNewItem({...newItem, unit: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="rft">Running Feet</SelectItem>
                  <SelectItem value="sqft">Square Feet</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="tube">Tubes</SelectItem>
                  <SelectItem value="set">Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator className="col-span-2" />
            <p className="col-span-2 font-medium text-sm text-slate-600">Specifications (Industry Specific)</p>
            
            <div>
              <Label>Thickness/Size</Label>
              <Input 
                value={newItem.specifications.thickness}
                onChange={(e) => setNewItem({...newItem, specifications: {...newItem.specifications, thickness: e.target.value}})}
                placeholder="e.g., 5mm, 6mm"
              />
            </div>
            
            <div>
              <Label>Series/Grade</Label>
              <Input 
                value={newItem.specifications.series}
                onChange={(e) => setNewItem({...newItem, specifications: {...newItem.specifications, series: e.target.value}})}
                placeholder="e.g., Series 60"
              />
            </div>
            
            <div>
              <Label>Color/Finish</Label>
              <Input 
                value={newItem.specifications.color}
                onChange={(e) => setNewItem({...newItem, specifications: {...newItem.specifications, color: e.target.value}})}
                placeholder="e.g., Natural, Wood Grain"
              />
            </div>
            
            <div>
              <Label>Brand</Label>
              <Input 
                value={newItem.specifications.brand}
                onChange={(e) => setNewItem({...newItem, specifications: {...newItem.specifications, brand: e.target.value}})}
                placeholder="e.g., Jindal, Hindalco"
              />
            </div>
            
            <Separator className="col-span-2" />
            <p className="col-span-2 font-medium text-sm text-slate-600">Stock & Pricing</p>
            
            <div>
              <Label>Opening Stock</Label>
              <Input 
                type="number"
                value={newItem.currentQty}
                onChange={(e) => setNewItem({...newItem, currentQty: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>Reorder Point</Label>
              <Input 
                type="number"
                value={newItem.reorderPoint}
                onChange={(e) => setNewItem({...newItem, reorderPoint: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>Cost Price (₹)</Label>
              <Input 
                type="number"
                value={newItem.costPrice}
                onChange={(e) => setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>Selling Price (₹)</Label>
              <Input 
                type="number"
                value={newItem.sellingPrice}
                onChange={(e) => setNewItem({...newItem, sellingPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>HSN Code</Label>
              <Input 
                value={newItem.hsnCode}
                onChange={(e) => setNewItem({...newItem, hsnCode: e.target.value})}
                placeholder="e.g., 7610"
              />
            </div>
            
            <div>
              <Label>GST Rate (%)</Label>
              <Select value={String(newItem.gstRate)} onValueChange={(v) => setNewItem({...newItem, gstRate: parseInt(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Warehouse</Label>
              <Select value={newItem.warehouse} onValueChange={(v) => setNewItem({...newItem, warehouse: v})}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Rack/Location</Label>
              <Input 
                value={newItem.location}
                onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                placeholder="e.g., A1-R2-S3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              Add Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={showGRN} onOpenChange={setShowGRN}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-emerald-600" />
              Goods Receipt Note (GRN)
            </DialogTitle>
            <DialogDescription>Record incoming stock from suppliers</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Select Item *</Label>
              <Select value={grnData.itemId} onValueChange={(v) => setGrnData({...grnData, itemId: v})}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Quantity *</Label>
              <Input 
                type="number"
                value={grnData.quantity}
                onChange={(e) => setGrnData({...grnData, quantity: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>Unit Cost (₹)</Label>
              <Input 
                type="number"
                value={grnData.unitCost}
                onChange={(e) => setGrnData({...grnData, unitCost: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <Label>PO Number</Label>
              <Input 
                value={grnData.poNumber}
                onChange={(e) => setGrnData({...grnData, poNumber: e.target.value})}
                placeholder="PO-2024-001"
              />
            </div>
            
            <div>
              <Label>Supplier Invoice #</Label>
              <Input 
                value={grnData.invoiceNumber}
                onChange={(e) => setGrnData({...grnData, invoiceNumber: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Warehouse</Label>
              <Select value={grnData.warehouse} onValueChange={(v) => setGrnData({...grnData, warehouse: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Batch/Lot Number</Label>
              <Input 
                value={grnData.batchNumber}
                onChange={(e) => setGrnData({...grnData, batchNumber: e.target.value})}
                placeholder="Optional"
              />
            </div>
            
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea 
                value={grnData.notes}
                onChange={(e) => setGrnData({...grnData, notes: e.target.value})}
                placeholder="Quality check notes, remarks..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGRN(false)}>Cancel</Button>
            <Button onClick={handleGRN} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Record GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseInventoryDW
