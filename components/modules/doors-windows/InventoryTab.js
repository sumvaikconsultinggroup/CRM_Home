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
import { Textarea } from '@/components/ui/textarea'
import {
  Package, Plus, Search, AlertTriangle, ArrowDown, ArrowUp,
  Box, Layers, Filter, Download, Upload, RefreshCw, Edit,
  Trash2, BarChart3, TrendingDown, CheckCircle2, XCircle, Loader2,
  Lock, Unlock
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

const UNITS = [
  { id: 'piece', name: 'Piece' },
  { id: 'meter', name: 'Meter' },
  { id: 'sqft', name: 'Square Feet' },
  { id: 'kg', name: 'Kilogram' },
  { id: 'set', name: 'Set' },
  { id: 'tube', name: 'Tube' },
  { id: 'roll', name: 'Roll' },
  { id: 'liter', name: 'Liter' }
]

const stockStatusStyles = {
  'in-stock': 'bg-emerald-100 text-emerald-700',
  'low-stock': 'bg-amber-100 text-amber-700',
  'out-of-stock': 'bg-red-100 text-red-700',
  'on-order': 'bg-blue-100 text-blue-700'
}

export function InventoryTab({ headers, glassStyles }) {
  const [inventory, setInventory] = useState([])
  const [holds, setHolds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStockAdjust, setShowStockAdjust] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [showEditItem, setShowEditItem] = useState(false)
  const [activeView, setActiveView] = useState('items') // 'items' or 'holds'

  // Item form state
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    category: 'profiles',
    material: '',
    unit: 'piece',
    quantity: 0,
    minStock: 10,
    maxStock: 100,
    unitPrice: 0,
    supplier: '',
    location: ''
  })

  useEffect(() => {
    fetchInventory()
    fetchHolds()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/inventory`, { headers })
      const data = await res.json()
      if (data.inventory) {
        setInventory(data.inventory)
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const fetchHolds = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory?type=holds`, { headers })
      const data = await res.json()
      if (data.holds) {
        setHolds(data.holds)
      }
    } catch (error) {
      console.error('Failed to fetch holds:', error)
    }
  }

  const getStockStatus = (item) => {
    const qty = item.quantity || item.currentStock || 0
    const min = item.minStock || 10
    if (qty === 0) return 'out-of-stock'
    if (qty <= min) return 'low-stock'
    return 'in-stock'
  }

  const getStockPercentage = (item) => {
    const qty = item.quantity || item.currentStock || 0
    const max = item.maxStock || 100
    return Math.min(100, (qty / max) * 100)
  }

  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.material?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const stats = {
    totalItems: inventory.length,
    lowStock: inventory.filter(i => getStockStatus(i) === 'low-stock').length,
    outOfStock: inventory.filter(i => getStockStatus(i) === 'out-of-stock').length,
    totalValue: inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0),
    totalHolds: holds.length
  }

  const resetForm = () => {
    setItemForm({
      name: '',
      description: '',
      category: 'profiles',
      material: '',
      unit: 'piece',
      quantity: 0,
      minStock: 10,
      maxStock: 100,
      unitPrice: 0,
      supplier: '',
      location: ''
    })
  }

  const handleAddItem = async () => {
    if (!itemForm.name) {
      toast.error('Item name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers,
        body: JSON.stringify(itemForm)
      })
      const data = await res.json()
      
      if (data.item) {
        toast.success('Item added to inventory')
        setShowAddItem(false)
        resetForm()
        fetchInventory()
      } else {
        toast.error(data.error || 'Failed to add item')
      }
    } catch (error) {
      console.error('Add item error:', error)
      toast.error('Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  const handleEditItem = async () => {
    if (!selectedItem) return

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: selectedItem.id,
          ...itemForm
        })
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('Item updated successfully')
        setShowEditItem(false)
        setSelectedItem(null)
        resetForm()
        fetchInventory()
      } else {
        toast.error(data.error || 'Failed to update item')
      }
    } catch (error) {
      console.error('Edit item error:', error)
      toast.error('Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const res = await fetch(`${API_BASE}/inventory?id=${id}`, {
        method: 'DELETE',
        headers
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('Item deleted')
        fetchInventory()
      } else {
        toast.error(data.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Delete item error:', error)
      toast.error('Failed to delete item')
    }
  }

  const handleStockAdjust = async (type) => {
    if (!selectedItem || !adjustQuantity) {
      toast.error('Please enter a quantity')
      return
    }

    const newQuantity = type === 'add' 
      ? (selectedItem.quantity || 0) + adjustQuantity
      : (selectedItem.quantity || 0) - adjustQuantity

    if (newQuantity < 0) {
      toast.error('Stock cannot be negative')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: selectedItem.id,
          quantity: newQuantity,
          adjustmentReason: adjustReason || `Stock ${type === 'add' ? 'increased' : 'decreased'} by ${adjustQuantity}`
        })
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success(`Stock ${type === 'add' ? 'increased' : 'decreased'} by ${adjustQuantity}`)
        setShowStockAdjust(false)
        setSelectedItem(null)
        setAdjustQuantity(0)
        setAdjustReason('')
        fetchInventory()
      } else {
        toast.error(data.error || 'Failed to adjust stock')
      }
    } catch (error) {
      console.error('Stock adjust error:', error)
      toast.error('Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const handleReleaseHold = async (quoteId) => {
    if (!confirm('Release all holds for this quote?')) return

    try {
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          action: 'release-hold',
          quoteId
        })
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('Holds released')
        fetchHolds()
      } else {
        toast.error(data.error || 'Failed to release holds')
      }
    } catch (error) {
      console.error('Release hold error:', error)
      toast.error('Failed to release holds')
    }
  }

  const openEditDialog = (item) => {
    setSelectedItem(item)
    setItemForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'profiles',
      material: item.material || '',
      unit: item.unit || 'piece',
      quantity: item.quantity || 0,
      minStock: item.minStock || 10,
      maxStock: item.maxStock || 100,
      unitPrice: item.unitPrice || 0,
      supplier: item.supplier || '',
      location: item.location || ''
    })
    setShowEditItem(true)
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
          <Button variant="outline" onClick={() => { fetchInventory(); fetchHolds(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => { resetForm(); setShowAddItem(true); }} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Holds</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalHolds}</p>
              </div>
              <Lock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle & Filters */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* View Toggle */}
            <div className="flex gap-2">
              <Button 
                variant={activeView === 'items' ? 'default' : 'outline'}
                onClick={() => setActiveView('items')}
                className={activeView === 'items' ? 'bg-indigo-600' : ''}
              >
                <Package className="h-4 w-4 mr-2" /> Inventory Items
              </Button>
              <Button 
                variant={activeView === 'holds' ? 'default' : 'outline'}
                onClick={() => setActiveView('holds')}
                className={activeView === 'holds' ? 'bg-purple-600' : ''}
              >
                <Lock className="h-4 w-4 mr-2" /> Quote Holds ({holds.length})
              </Button>
            </div>
            
            {activeView === 'items' && (
              <>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, SKU, or material..."
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
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items List */}
      {activeView === 'items' && (
        <Card className={glassStyles?.card}>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {inventory.length === 0 
                    ? 'No inventory items yet. Add your first item to get started.'
                    : 'No items match your search criteria.'}
                </p>
                {inventory.length === 0 && (
                  <Button onClick={() => setShowAddItem(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Add First Item
                  </Button>
                )}
              </div>
            ) : (
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
                      const qty = item.quantity || 0
                      return (
                        <tr key={item.id} className="border-b hover:bg-slate-50">
                          <td className="p-4">
                            <div className="font-medium text-slate-800">{item.name}</div>
                            {item.material && <div className="text-xs text-slate-500">{item.material}</div>}
                          </td>
                          <td className="p-4 text-slate-600 font-mono text-sm">{item.sku}</td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {INVENTORY_CATEGORIES.find(c => c.id === item.category)?.icon || '📦'} {item.category}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="w-32 mx-auto">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">{qty}</span>
                                <span className="text-slate-400">/{item.maxStock || 100} {item.unit}</span>
                              </div>
                              <Progress 
                                value={percentage} 
                                className={`h-2 ${status === 'out-of-stock' ? '[&>div]:bg-red-500' : status === 'low-stock' ? '[&>div]:bg-amber-500' : ''}`} 
                              />
                            </div>
                          </td>
                          <td className="p-4 text-right font-medium">₹{(item.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <Badge className={stockStatusStyles[status]}>
                              {status.replace('-', ' ')}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedItem(item); setShowStockAdjust(true); }}
                                title="Adjust Stock"
                              >
                                <ArrowUp className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                title="Edit Item"
                              >
                                <Edit className="h-4 w-4 text-slate-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                title="Delete Item"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory Holds View */}
      {activeView === 'holds' && (
        <Card className={glassStyles?.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              Inventory Holds from Approved Quotes
            </CardTitle>
            <CardDescription>
              Materials reserved for approved quotes awaiting production
            </CardDescription>
          </CardHeader>
          <CardContent>
            {holds.length === 0 ? (
              <div className="text-center py-12">
                <Unlock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No active inventory holds</p>
                <p className="text-sm text-slate-400 mt-2">When quotes are approved, their materials will be held here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group by quoteId */}
                {Object.entries(
                  holds.reduce((acc, hold) => {
                    if (!acc[hold.quoteId]) acc[hold.quoteId] = []
                    acc[hold.quoteId].push(hold)
                    return acc
                  }, {})
                ).map(([quoteId, quoteHolds]) => (
                  <Card key={quoteId} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-800">
                            {quoteHolds[0]?.quoteNumber || `Quote ${quoteId.slice(0, 8)}`}
                          </h4>
                          <p className="text-sm text-slate-500">{quoteHolds[0]?.customerName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-100 text-purple-700">
                            {quoteHolds.length} items held
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReleaseHold(quoteId)}
                          >
                            <Unlock className="h-4 w-4 mr-1" /> Release All
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {quoteHolds.map(hold => (
                          <div key={hold.id} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{hold.itemType}</span>
                              <Badge variant="outline" className="text-xs">
                                {hold.quantity || 1}x
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {hold.material} • {hold.dimensions || `${hold.areaSqft} sqft`}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Held: {new Date(hold.heldAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              <Label>Material Type</Label>
              <Input
                value={itemForm.material}
                onChange={(e) => setItemForm({ ...itemForm, material: e.target.value })}
                placeholder="e.g., Aluminium, uPVC, Glass"
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
                  {UNITS.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Stock</Label>
              <Input 
                type="number" 
                value={itemForm.quantity} 
                onChange={(e) => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost (₹)</Label>
              <Input 
                type="number" 
                value={itemForm.unitPrice} 
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Min Stock (Reorder Point)</Label>
              <Input 
                type="number" 
                value={itemForm.minStock} 
                onChange={(e) => setItemForm({ ...itemForm, minStock: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Max Stock</Label>
              <Input 
                type="number" 
                value={itemForm.maxStock} 
                onChange={(e) => setItemForm({ ...itemForm, maxStock: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input 
                value={itemForm.supplier} 
                onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} 
                placeholder="Supplier name" 
              />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input 
                value={itemForm.location} 
                onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} 
                placeholder="e.g., Warehouse A, Rack 3" 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Additional details about this item..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItem} onOpenChange={setShowEditItem}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update item details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Material Type</Label>
              <Input
                value={itemForm.material}
                onChange={(e) => setItemForm({ ...itemForm, material: e.target.value })}
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
                  {UNITS.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit Cost (₹)</Label>
              <Input 
                type="number" 
                value={itemForm.unitPrice} 
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Min Stock</Label>
              <Input 
                type="number" 
                value={itemForm.minStock} 
                onChange={(e) => setItemForm({ ...itemForm, minStock: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Max Stock</Label>
              <Input 
                type="number" 
                value={itemForm.maxStock} 
                onChange={(e) => setItemForm({ ...itemForm, maxStock: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input 
                value={itemForm.supplier} 
                onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Storage Location</Label>
              <Input 
                value={itemForm.location} 
                onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItem(false)}>Cancel</Button>
            <Button onClick={handleEditItem} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockAdjust} onOpenChange={setShowStockAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {selectedItem?.quantity || 0} {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Quantity to Add/Remove</Label>
              <Input 
                type="number" 
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input 
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., New shipment, Used in production"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 hover:bg-emerald-50 hover:border-emerald-500" 
                onClick={() => handleStockAdjust('add')}
                disabled={saving || !adjustQuantity}
              >
                <ArrowUp className="h-6 w-6 text-emerald-600" />
                <span>Add Stock (+{adjustQuantity || 0})</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 hover:bg-red-50 hover:border-red-500" 
                onClick={() => handleStockAdjust('remove')}
                disabled={saving || !adjustQuantity}
              >
                <ArrowDown className="h-6 w-6 text-red-600" />
                <span>Remove Stock (-{adjustQuantity || 0})</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
