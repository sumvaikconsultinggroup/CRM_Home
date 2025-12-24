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
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Plus, Search, Filter, RefreshCw, Eye, Edit, Trash2, Download, Upload,
  Copy, Calendar, IndianRupee, Percent, CheckCircle2, Clock, AlertTriangle, Loader2,
  ChevronRight, Tag, Layers
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Type Colors
const typeColors = {
  retail: 'bg-blue-100 text-blue-700',
  dealer: 'bg-purple-100 text-purple-700',
  builder: 'bg-emerald-100 text-emerald-700',
  promotional: 'bg-amber-100 text-amber-700',
  custom: 'bg-pink-100 text-pink-700'
}

export function PriceListsTab({ headers, glassStyles }) {
  const [priceLists, setPriceLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({})
  const [types, setTypes] = useState([])
  const [methods, setMethods] = useState([])
  const [selectedPriceList, setSelectedPriceList] = useState(null)
  const [priceItems, setPriceItems] = useState([])
  
  // Dialog states
  const [showCreateList, setShowCreateList] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showPriceListDetail, setShowPriceListDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [listFormData, setListFormData] = useState({
    name: '',
    type: 'dealer',
    description: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    maxDiscountPercent: 20,
    isDefault: false,
    dealerTier: ''
  })
  
  const [itemFormData, setItemFormData] = useState({
    productName: '',
    category: '',
    rate: 0,
    pricingMethod: 'per_sqft',
    minQty: 1
  })

  useEffect(() => {
    fetchPriceLists()
  }, [])

  const fetchPriceLists = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/price-lists`, { headers })
      const data = await res.json()
      if (data.priceLists) setPriceLists(data.priceLists)
      if (data.summary) setSummary(data.summary)
      if (data.types) setTypes(data.types)
      if (data.methods) setMethods(data.methods)
    } catch (error) {
      console.error('Failed to fetch price lists:', error)
      toast.error('Failed to load price lists')
    } finally {
      setLoading(false)
    }
  }

  const fetchPriceListDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/price-lists?id=${id}`, { headers })
      const data = await res.json()
      if (data.priceList) {
        setSelectedPriceList(data.priceList)
        setPriceItems(data.priceList.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch price list detail:', error)
    }
  }

  const handleCreateList = async () => {
    if (!listFormData.name || !listFormData.type) {
      toast.error('Name and type are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/price-lists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create_list', ...listFormData })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Price list created')
        setShowCreateList(false)
        setListFormData({
          name: '', type: 'dealer', description: '',
          effectiveFrom: new Date().toISOString().split('T')[0],
          effectiveTo: '', maxDiscountPercent: 20, isDefault: false, dealerTier: ''
        })
        fetchPriceLists()
      } else {
        toast.error(data.error || 'Failed to create price list')
      }
    } catch (error) {
      toast.error('Failed to create price list')
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = async () => {
    if (!itemFormData.productName || !itemFormData.rate) {
      toast.error('Product name and rate are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/price-lists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          action: 'add_item', 
          priceListId: selectedPriceList.id,
          ...itemFormData 
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Price item added')
        setShowAddItem(false)
        setItemFormData({ productName: '', category: '', rate: 0, pricingMethod: 'per_sqft', minQty: 1 })
        fetchPriceListDetail(selectedPriceList.id)
      } else {
        toast.error(data.error || 'Failed to add item')
      }
    } catch (error) {
      toast.error('Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyList = async (sourceListId) => {
    const newName = prompt('Enter name for the new price list:')
    if (!newName) return

    try {
      const res = await fetch(`${API_BASE}/price-lists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          action: 'copy_list', 
          sourceListId,
          newName,
          adjustmentPercent: 0
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Price list copied: ${data.itemsCopied} items`)
        fetchPriceLists()
      }
    } catch (error) {
      toast.error('Failed to copy price list')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this price item?')) return

    try {
      const res = await fetch(`${API_BASE}/price-lists?itemId=${itemId}`, {
        method: 'DELETE',
        headers
      })
      if (res.ok) {
        toast.success('Item deleted')
        fetchPriceListDetail(selectedPriceList.id)
      }
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  if (loading) {
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
                <FileText className="h-5 w-5 text-indigo-600" />
                Price Lists Management
              </CardTitle>
              <CardDescription>Manage wholesale and dealer pricing tiers</CardDescription>
            </div>
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
              onClick={() => setShowCreateList(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Create Price List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-700">{summary.total || 0}</p>
                <p className="text-xs text-blue-600">Total Lists</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-emerald-700">{summary.active || 0}</p>
                <p className="text-xs text-emerald-600">Active</p>
              </CardContent>
            </Card>
            {Object.entries(summary.byType || {}).slice(0, 3).map(([type, count]) => (
              <Card key={type} className={`${typeColors[type]?.replace('text-', 'bg-').replace('100', '50')} border`}>
                <CardContent className="p-4 text-center">
                  <Tag className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs capitalize">{type}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Price Lists Grid */}
          <div className="space-y-3">
            {priceLists.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No price lists yet. Create your first one.</p>
              </div>
            ) : (
              priceLists.map(list => (
                <Card key={list.id} className={`border-l-4 ${list.active ? 'border-l-emerald-500' : 'border-l-slate-300'} hover:shadow-md transition-all`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Layers className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{list.name}</h4>
                            {list.isDefault && <Badge className="bg-emerald-100 text-emerald-700">Default</Badge>}
                            <Badge className={typeColors[list.type]}>{list.type}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">
                            {list.code} • {list.itemCount || 0} items • Max {list.maxDiscountPercent}% discount
                          </p>
                          {list.effectiveFrom && (
                            <p className="text-xs text-slate-400">
                              Valid: {new Date(list.effectiveFrom).toLocaleDateString()}
                              {list.effectiveTo && ` - ${new Date(list.effectiveTo).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={list.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                          {list.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => { fetchPriceListDetail(list.id); setShowPriceListDetail(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopyList(list.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Price List Dialog */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Price List</DialogTitle>
            <DialogDescription>Set up a new pricing tier for dealers or customers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={listFormData.name}
                onChange={(e) => setListFormData({ ...listFormData, name: e.target.value })}
                placeholder="Gold Dealer Rates 2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={listFormData.type} onValueChange={(v) => setListFormData({ ...listFormData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="builder">Builder/Contract</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dealer Tier (optional)</Label>
                <Select value={listFormData.dealerTier} onValueChange={(v) => setListFormData({ ...listFormData, dealerTier: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={listFormData.effectiveFrom}
                  onChange={(e) => setListFormData({ ...listFormData, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective To (optional)</Label>
                <Input
                  type="date"
                  value={listFormData.effectiveTo}
                  onChange={(e) => setListFormData({ ...listFormData, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Discount Allowed (%)</Label>
              <Input
                type="number"
                value={listFormData.maxDiscountPercent}
                onChange={(e) => setListFormData({ ...listFormData, maxDiscountPercent: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={listFormData.description}
                onChange={(e) => setListFormData({ ...listFormData, description: e.target.value })}
                placeholder="Describe this price list..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={listFormData.isDefault}
                onChange={(e) => setListFormData({ ...listFormData, isDefault: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">Set as default for this type</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>Cancel</Button>
            <Button onClick={handleCreateList} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price List Detail Dialog */}
      <Dialog open={showPriceListDetail} onOpenChange={setShowPriceListDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  {selectedPriceList?.name}
                </DialogTitle>
                <DialogDescription>{selectedPriceList?.code}</DialogDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddItem(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </DialogHeader>
          <div className="py-4">
            {/* Price List Info */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Type</p>
                <Badge className={typeColors[selectedPriceList?.type]}>{selectedPriceList?.type}</Badge>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Items</p>
                <p className="font-bold">{priceItems.length}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Max Discount</p>
                <p className="font-bold">{selectedPriceList?.maxDiscountPercent}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Status</p>
                <Badge className={selectedPriceList?.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}>
                  {selectedPriceList?.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Min Qty</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Tag className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">No items yet. Add your first price item.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    priceItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.category || '-'}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">₹{item.rate?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.pricingMethod?.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{item.minQty}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Price Item</DialogTitle>
            <DialogDescription>Add a product to this price list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={itemFormData.productName}
                onChange={(e) => setItemFormData({ ...itemFormData, productName: e.target.value })}
                placeholder="Aluminium Sliding Window"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={itemFormData.category} onValueChange={(v) => setItemFormData({ ...itemFormData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="window">Window</SelectItem>
                    <SelectItem value="door">Door</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing Method</Label>
                <Select value={itemFormData.pricingMethod} onValueChange={(v) => setItemFormData({ ...itemFormData, pricingMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_sqft">Per Square Foot</SelectItem>
                    <SelectItem value="per_unit">Per Unit/Piece</SelectItem>
                    <SelectItem value="per_rft">Per Running Foot</SelectItem>
                    <SelectItem value="lumpsum">Lump Sum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate (₹) *</Label>
                <Input
                  type="number"
                  value={itemFormData.rate}
                  onChange={(e) => setItemFormData({ ...itemFormData, rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Quantity</Label>
                <Input
                  type="number"
                  value={itemFormData.minQty}
                  onChange={(e) => setItemFormData({ ...itemFormData, minQty: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PriceListsTab
