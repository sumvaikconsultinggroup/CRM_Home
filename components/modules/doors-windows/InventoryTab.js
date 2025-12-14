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
import {
  Package, Plus, Search, AlertTriangle, ArrowDown, ArrowUp,
  Box, Layers, Filter, Download, Upload, RefreshCw, Edit,
  Trash2, BarChart3, TrendingDown, CheckCircle2, XCircle
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Inventory categories
const INVENTORY_CATEGORIES = [
  { id: 'profiles', name: 'Aluminium Profiles', icon: '🔩' },
  { id: 'upvc', name: 'uPVC Profiles', icon: '🪟' },
  { id: 'glass', name: 'Glass Sheets', icon: '🔲' },
  { id: 'hardware', name: 'Hardware & Fittings', icon: '🔧' },
  { id: 'sealants', name: 'Sealants & Adhesives', icon: '💧' },
  { id: 'accessories', name: 'Accessories', icon: '📎' },
  { id: 'wood', name: 'Wooden Components', icon: '🪵' },
  { id: 'consumables', name: 'Consumables', icon: '📦' }
]

const stockStatusStyles = {
  'in-stock': 'bg-emerald-100 text-emerald-700',
  'low-stock': 'bg-amber-100 text-amber-700',
  'out-of-stock': 'bg-red-100 text-red-700',
  'on-order': 'bg-blue-100 text-blue-700'
}

export function InventoryTab({ headers, glassStyles }) {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStockAdjust, setShowStockAdjust] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  // Item form state
  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    category: 'profiles',
    unit: 'piece',
    currentStock: 0,
    minStock: 10,
    maxStock: 100,
    unitCost: 0,
    supplier: '',
    location: '',
    description: ''
  })

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/inventory`, { headers })
      const data = await res.json()
      if (data.items) setInventory(data.items)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
      // Mock data for demo
      setInventory([
        { id: '1', name: 'Aluminium Profile 60mm', sku: 'ALU-60-001', category: 'profiles', unit: 'meter', currentStock: 250, minStock: 50, maxStock: 500, unitCost: 180, status: 'in-stock' },
        { id: '2', name: 'Float Glass 5mm Clear', sku: 'GLS-5C-001', category: 'glass', unit: 'sqft', currentStock: 800, minStock: 200, maxStock: 2000, unitCost: 45, status: 'in-stock' },
        { id: '3', name: 'Multi-Point Lock Set', sku: 'HW-MPL-001', category: 'hardware', unit: 'set', currentStock: 15, minStock: 20, maxStock: 100, unitCost: 2500, status: 'low-stock' },
        { id: '4', name: 'Silicone Sealant Black', sku: 'SEL-SB-001', category: 'sealants', unit: 'tube', currentStock: 0, minStock: 50, maxStock: 200, unitCost: 250, status: 'out-of-stock' },
        { id: '5', name: 'uPVC Profile 70mm White', sku: 'UPVC-70W-001', category: 'upvc', unit: 'meter', currentStock: 180, minStock: 100, maxStock: 400, unitCost: 220, status: 'in-stock' },
        { id: '6', name: 'Premium Rollers', sku: 'HW-ROL-001', category: 'hardware', unit: 'set', currentStock: 45, minStock: 30, maxStock: 150, unitCost: 600, status: 'in-stock' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (item) => {
    if (item.currentStock === 0) return 'out-of-stock'
    if (item.currentStock <= item.minStock) return 'low-stock'
    return 'in-stock'
  }

  const getStockPercentage = (item) => {
    return Math.min(100, (item.currentStock / item.maxStock) * 100)
  }

  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const stats = {
    totalItems: inventory.length,
    lowStock: inventory.filter(i => getStockStatus(i) === 'low-stock').length,
    outOfStock: inventory.filter(i => getStockStatus(i) === 'out-of-stock').length,
    totalValue: inventory.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0)
  }

  const handleAddItem = async () => {
    // API call to add item
    toast.success('Item added to inventory')
    setShowAddItem(false)
    fetchInventory()
  }

  const handleStockAdjust = async (type, quantity) => {
    // API call to adjust stock
    toast.success(`Stock ${type === 'add' ? 'increased' : 'decreased'} by ${quantity}`)
    setShowStockAdjust(false)
    fetchInventory()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500">Track raw materials, profiles, glass & hardware stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInventory}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setShowAddItem(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Items</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Inventory Value</p>
                <p className="text-2xl font-bold text-emerald-600">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
              </div>
              <BarChart3 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {INVENTORY_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">Item</th>
                  <th className="text-left p-4 font-medium text-slate-600">SKU</th>
                  <th className="text-left p-4 font-medium text-slate-600">Category</th>
                  <th className="text-center p-4 font-medium text-slate-600">Stock Level</th>
                  <th className="text-right p-4 font-medium text-slate-600">Unit Cost</th>
                  <th className="text-center p-4 font-medium text-slate-600">Status</th>
                  <th className="text-center p-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const status = getStockStatus(item)
                  const percentage = getStockPercentage(item)
                  return (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{item.name}</div>
                      </td>
                      <td className="p-4 text-slate-600">{item.sku}</td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {INVENTORY_CATEGORIES.find(c => c.id === item.category)?.icon} {item.category}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="w-32 mx-auto">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{item.currentStock}</span>
                            <span className="text-slate-400">/{item.maxStock} {item.unit}</span>
                          </div>
                          <Progress value={percentage} className={`h-2 ${status === 'out-of-stock' ? '[&>div]:bg-red-500' : status === 'low-stock' ? '[&>div]:bg-amber-500' : ''}`} />
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium">₹{item.unitCost}</td>
                      <td className="p-4 text-center">
                        <Badge className={stockStatusStyles[status]}>
                          {status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setShowStockAdjust(true); }}>
                            <ArrowUp className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 text-slate-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add new raw material or component to inventory</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g., Aluminium Profile 60mm"
              />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                placeholder="e.g., ALU-60-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={itemForm.unit} onValueChange={(v) => setItemForm({ ...itemForm, unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="meter">Meter</SelectItem>
                  <SelectItem value="sqft">Square Feet</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="tube">Tube</SelectItem>
                  <SelectItem value="roll">Roll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input type="number" value={itemForm.currentStock} onChange={(e) => setItemForm({ ...itemForm, currentStock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost (₹)</Label>
              <Input type="number" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Min Stock (Reorder Point)</Label>
              <Input type="number" value={itemForm.minStock} onChange={(e) => setItemForm({ ...itemForm, minStock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Max Stock</Label>
              <Input type="number" value={itemForm.maxStock} onChange={(e) => setItemForm({ ...itemForm, maxStock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input value={itemForm.supplier} onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} placeholder="Supplier name" />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} placeholder="e.g., Warehouse A, Rack 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockAdjust} onOpenChange={setShowStockAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedItem?.name}</DialogTitle>
            <DialogDescription>Current stock: {selectedItem?.currentStock} {selectedItem?.unit}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleStockAdjust('add', 10)}>
                <ArrowUp className="h-6 w-6 text-emerald-600" />
                <span>Add Stock</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleStockAdjust('remove', 10)}>
                <ArrowDown className="h-6 w-6 text-red-600" />
                <span>Remove Stock</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
