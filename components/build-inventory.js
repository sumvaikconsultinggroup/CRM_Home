'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package, Warehouse, BarChart3, Settings, RefreshCw, Download, Plus,
  ArrowLeftRight, Bell, ClipboardList, Truck, Receipt, Layers, History,
  Bookmark, UserCheck, Search, Scan, AlertCircle, TrendingUp, DollarSign,
  Box, Boxes, Lock, Unlock, ChevronRight, ExternalLink, Sparkles, Zap,
  Database, Link2, CheckCircle2, Clock, Edit, Trash2, Eye, Upload,
  AlertTriangle, XCircle, ArrowUpDown, Filter, MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'

// Import the Enterprise Inventory component
import { EnterpriseInventory } from '@/components/modules/flooring/EnterpriseInventory'

// Build Inventory - Standalone Product
export function BuildInventory({ token, user, clientModules = [] }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [syncStatus, setSyncStatus] = useState({ synced: 0, pending: 0, modules: [], syncedModule: null })
  const [loading, setLoading] = useState(false)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [selectedModuleForSync, setSelectedModuleForSync] = useState(null)
  const [products, setProducts] = useState([])
  const [productSummary, setProductSummary] = useState({})
  const [showAddProductDialog, setShowAddProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [syncConfig, setSyncConfig] = useState(null)

  // Create headers function for fresh token
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  })

  // Fetch sync status and configuration
  const fetchSyncStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/sync', { headers: getHeaders() })
      const data = await res.json()
      if (data.summary) {
        const syncedModules = Object.keys(data.summary.byModule || {})
        setSyncStatus({
          synced: data.summary.totalSynced || 0,
          pending: data.summary.pendingSync || 0,
          lastSync: data.summary.lastSync,
          modules: Object.entries(data.summary.byModule || {}).map(([id, info]) => ({
            id,
            name: info.moduleName,
            count: info.count
          })),
          syncedModule: syncedModules.length > 0 ? syncedModules[0] : null
        })
      }
      
      // Fetch sync configuration
      const configRes = await fetch('/api/inventory/sync/config', { headers: getHeaders() })
      const configData = await configRes.json()
      if (configData.config) {
        setSyncConfig(configData.config)
      }
    } catch (error) {
      console.error('Sync status fetch error:', error)
    }
  }, [token])

  // Fetch inventory products
  const fetchProducts = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/inventory/products', { headers: getHeaders() })
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
      if (data.summary) {
        setProductSummary(data.summary)
      }
    } catch (error) {
      console.error('Products fetch error:', error)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchSyncStatus()
      fetchProducts()
    }
  }, [token, fetchSyncStatus, fetchProducts])

  // Check if a module is already synced
  const isSyncLocked = () => {
    return syncConfig?.syncedModuleId && syncConfig.syncedModuleId !== null
  }

  // Trigger sync from a CRM module
  const handleSync = async (moduleId, syncAll = true) => {
    // Check if another module is already synced
    if (isSyncLocked() && syncConfig.syncedModuleId !== moduleId) {
      toast.error(`Inventory can only sync with one module. Currently synced with: ${syncConfig.syncedModuleName || 'another module'}`)
      setShowSyncDialog(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ moduleId, syncAll })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Sync completed')
        fetchSyncStatus()
        fetchProducts()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setLoading(false)
      setShowSyncDialog(false)
      setSelectedModuleForSync(null)
    }
  }

  // Disconnect sync from current module
  const handleDisconnectSync = async () => {
    if (!confirm('Are you sure you want to disconnect sync? Products will remain but won\'t receive updates.')) return
    
    try {
      setLoading(true)
      const res = await fetch('/api/inventory/sync/config', {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        toast.success('Sync disconnected')
        fetchSyncStatus()
        setSyncConfig(null)
      } else {
        toast.error('Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  // Add/Update product
  const handleSaveProduct = async () => {
    if (!productForm.name) {
      toast.error('Product name is required')
      return
    }

    try {
      setLoading(true)
      const url = editingProduct ? '/api/inventory/products' : '/api/inventory/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const payload = editingProduct ? { id: editingProduct.id, ...productForm } : productForm

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success(editingProduct ? 'Product updated' : 'Product added')
        fetchProducts()
        setShowAddProductDialog(false)
        setEditingProduct(null)
        setProductForm({})
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save product')
      }
    } catch (error) {
      toast.error('Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Delete this product?')) return

    try {
      const res = await fetch(`/api/inventory/products?id=${productId}`, {
        method: 'DELETE',
        headers: getHeaders()
      })

      if (res.ok) {
        toast.success('Product deleted')
        fetchProducts()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete')
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  // Get synced module fields for manual product entry
  const getSyncedModuleFields = () => {
    if (!syncConfig?.syncedModuleId) return []
    
    const moduleFields = {
      'wooden-flooring': [
        { key: 'woodType', label: 'Wood Type', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'thickness', label: 'Thickness (mm)', type: 'number' },
        { key: 'width', label: 'Width (mm)', type: 'number' },
        { key: 'length', label: 'Length (mm)', type: 'number' },
        { key: 'grade', label: 'Grade', type: 'text' }
      ],
      'paints-coatings': [
        { key: 'paintType', label: 'Paint Type', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'coverage', label: 'Coverage (sqft/ltr)', type: 'number' },
        { key: 'dryingTime', label: 'Drying Time', type: 'text' }
      ],
      'furniture': [
        { key: 'material', label: 'Material', type: 'text' },
        { key: 'style', label: 'Style', type: 'text' },
        { key: 'dimensions', label: 'Dimensions', type: 'text' },
        { key: 'color', label: 'Color', type: 'text' }
      ]
    }
    
    return moduleFields[syncConfig.syncedModuleId] || []
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-7 w-7" />
                Build Inventory
              </h2>
              <p className="text-emerald-100 mt-1">Enterprise Inventory Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowSyncDialog(true)}>
                <Link2 className="h-4 w-4 mr-2" /> Sync CRM
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('products')}>
                <Package className="h-4 w-4 mr-2" /> Products
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('inventory')}>
                Open Inventory <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status Alert */}
      {syncConfig?.syncedModuleId && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800">
                    Synced with: {syncConfig.syncedModuleName}
                  </p>
                  <p className="text-sm text-emerald-600">
                    Two-way sync enabled • Last synced: {syncConfig.lastSyncAt ? new Date(syncConfig.lastSyncAt).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleSync(syncConfig.syncedModuleId)}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Sync Now
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={handleDisconnectSync}>
                  <XCircle className="h-4 w-4 mr-1" /> Disconnect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={productSummary.total || 0}
          icon={Package}
          color="bg-blue-500"
          subtitle={`${productSummary.synced || 0} synced, ${productSummary.manual || 0} manual`}
        />
        <StatCard
          title="Active Products"
          value={productSummary.active || 0}
          icon={CheckCircle2}
          color="bg-emerald-500"
        />
        <StatCard
          title="Categories"
          value={productSummary.categories?.length || 0}
          icon={Layers}
          color="bg-amber-500"
        />
        <StatCard
          title="Last Sync"
          value={syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleDateString() : 'Never'}
          icon={RefreshCw}
          color="bg-slate-500"
        />
      </div>

      {/* CRM Module Sync Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                CRM Module Sync
              </CardTitle>
              <CardDescription>
                {isSyncLocked() 
                  ? `Connected to ${syncConfig.syncedModuleName} - Two-way sync active`
                  : 'Connect to ONE CRM module for product sync'}
              </CardDescription>
            </div>
            {isSyncLocked() && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <Lock className="h-3 w-3 mr-1" /> Locked to {syncConfig.syncedModuleName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {clientModules.filter(m => m.enabled).length > 0 ? (
            <div className="space-y-3">
              {clientModules.filter(m => m.enabled).map(module => {
                const syncInfo = syncStatus.modules.find(s => s.id === module.id)
                const isCurrentSync = syncConfig?.syncedModuleId === module.id
                const isLocked = isSyncLocked() && !isCurrentSync
                
                return (
                  <div 
                    key={module.id} 
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      isCurrentSync ? 'bg-emerald-50 border border-emerald-200' :
                      isLocked ? 'bg-slate-50 opacity-60' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg shadow-sm ${isCurrentSync ? 'bg-emerald-500' : 'bg-white'}`}>
                        <Package className={`h-5 w-5 ${isCurrentSync ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {module.name}
                          {isCurrentSync && <Badge className="bg-emerald-500 text-white text-xs">Connected</Badge>}
                          {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
                        </p>
                        <p className="text-sm text-slate-500">
                          {syncInfo ? `${syncInfo.count} products synced` : 'Not synced yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentSync ? (
                        <>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(module.id)}
                            disabled={loading}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Sync Now
                          </Button>
                        </>
                      ) : isLocked ? (
                        <Badge variant="outline" className="text-slate-400">
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedModuleForSync(module)
                            setShowSyncDialog(true)
                          }}
                          disabled={loading}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Connect & Sync
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-medium text-slate-600 mb-1">No CRM Modules Enabled</h3>
              <p className="text-sm text-slate-500">
                Enable modules in Build CRM to sync products to inventory
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Products"
          description="View & manage all products"
          icon={Package}
          onClick={() => setActiveTab('products')}
        />
        <QuickActionCard
          title="Warehouses"
          description="Manage storage locations"
          icon={Warehouse}
          onClick={() => setActiveTab('inventory')}
        />
        <QuickActionCard
          title="Stock Movements"
          description="Track goods in/out"
          icon={ArrowLeftRight}
          onClick={() => setActiveTab('inventory')}
        />
      </div>
    </div>
  )

  // Products Tab View
  const renderProductsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-slate-500">
            {productSummary.total || 0} products • {productSummary.synced || 0} from CRM • {productSummary.manual || 0} manual
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => {
            setEditingProduct(null)
            setProductForm({
              category: syncConfig?.syncedModuleName || 'General',
              unit: syncConfig?.syncedModuleId === 'wooden-flooring' ? 'sqft' : 
                    syncConfig?.syncedModuleId === 'paints-coatings' ? 'ltr' : 'pcs',
              gstRate: 18
            })
            setShowAddProductDialog(true)
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Sync Info Banner */}
      {syncConfig?.syncedModuleId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <AlertCircle className="h-4 w-4" />
              <span>
                Products are synced with <strong>{syncConfig.syncedModuleName}</strong>. 
                Manual products will use the same fields for consistency.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {productSummary.categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No products found. {!syncConfig?.syncedModuleId && 'Connect to a CRM module or add products manually.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{product.sku}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">₹{product.sellingPrice?.toLocaleString()}</p>
                        {product.costPrice && (
                          <p className="text-xs text-slate-500">Cost: ₹{product.costPrice?.toLocaleString()}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.sourceType === 'crm_module' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                        {product.sourceType === 'crm_module' ? (
                          <><Link2 className="h-3 w-3 mr-1" /> {product.sourceModuleName || 'CRM'}</>
                        ) : (
                          <><Edit className="h-3 w-3 mr-1" /> Manual</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {product.active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product)
                            setProductForm({
                              name: product.name,
                              sku: product.sku,
                              description: product.description,
                              category: product.category,
                              costPrice: product.costPrice,
                              sellingPrice: product.sellingPrice,
                              mrp: product.mrp,
                              unit: product.unit,
                              gstRate: product.gstRate,
                              hsnCode: product.hsnCode,
                              reorderLevel: product.reorderLevel,
                              attributes: product.attributes || {}
                            })
                            setShowAddProductDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {product.sourceType !== 'crm_module' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Build Inventory</h1>
                <p className="text-xs text-slate-500">Enterprise Inventory Management</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="products">
                  <Package className="h-4 w-4 mr-2" /> Products
                </TabsTrigger>
                <TabsTrigger value="inventory">
                  <Warehouse className="h-4 w-4 mr-2" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchSyncStatus}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'products' && renderProductsTab()}
        
        {activeTab === 'inventory' && (
          <EnterpriseInventory 
            token={token} 
            products={products}
            onRefreshProducts={fetchProducts}
          />
        )}
        
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>Configure your inventory preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sync Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Sync Configuration</h3>
                {syncConfig?.syncedModuleId ? (
                  <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Connected Module</p>
                        <p className="text-sm text-slate-500">{syncConfig.syncedModuleName}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-Way Sync</p>
                        <p className="text-sm text-slate-500">Changes sync between CRM and Inventory</p>
                      </div>
                      <Switch checked={true} disabled />
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDisconnectSync}>
                      Disconnect Sync
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Database className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No module connected. Go to Dashboard to connect.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Sync Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {isSyncLocked() ? 'Module Already Connected' : 'Connect & Sync CRM Module'}
            </DialogTitle>
            <DialogDescription>
              {isSyncLocked() ? (
                <span className="text-amber-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Inventory can only sync with ONE module at a time. Currently connected to: {syncConfig?.syncedModuleName}
                </span>
              ) : selectedModuleForSync 
                ? `Connect ${selectedModuleForSync.name} to Build Inventory for two-way sync`
                : 'Select a CRM module to sync products from'
              }
            </DialogDescription>
          </DialogHeader>
          
          {isSyncLocked() && !selectedModuleForSync ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  To sync with a different module, you must first disconnect from the current module in Settings.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowSyncDialog(false)
                  setActiveTab('settings')
                }}>
                  Go to Settings
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {!selectedModuleForSync ? (
                <div className="space-y-2">
                  <Label>Select Module</Label>
                  {clientModules.filter(m => m.enabled).map(module => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => setSelectedModuleForSync(module)}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-500" />
                        <span>{module.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedModuleForSync.name}</p>
                      <p className="text-sm text-slate-500">Ready to connect</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      All products will be synced to inventory
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Manual products will use the same fields
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Two-way sync will keep data updated
                    </p>
                    <p className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      You can only sync with ONE module
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!isSyncLocked() && selectedModuleForSync && (
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSyncDialog(false)
                setSelectedModuleForSync(null)
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSync(selectedModuleForSync.id, true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect & Sync
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {syncConfig?.syncedModuleId 
                ? `Product fields match ${syncConfig.syncedModuleName} module format`
                : 'Enter product details'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Product Name *</Label>
                <Input
                  value={productForm.name || ''}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={productForm.sku || ''}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={productForm.category || ''}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={productForm.description || ''}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <Separator />
            <h4 className="font-medium">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cost Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.costPrice || ''}
                  onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.sellingPrice || ''}
                  onChange={(e) => setProductForm({ ...productForm, sellingPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>MRP (₹)</Label>
                <Input
                  type="number"
                  value={productForm.mrp || ''}
                  onChange={(e) => setProductForm({ ...productForm, mrp: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unit</Label>
                <Select
                  value={productForm.unit || 'pcs'}
                  onValueChange={(v) => setProductForm({ ...productForm, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="sqft">Sq. Ft.</SelectItem>
                    <SelectItem value="sqm">Sq. Meter</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="ltr">Liters</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Select
                  value={String(productForm.gstRate || 18)}
                  onValueChange={(v) => setProductForm({ ...productForm, gstRate: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>HSN Code</Label>
                <Input
                  value={productForm.hsnCode || ''}
                  onChange={(e) => setProductForm({ ...productForm, hsnCode: e.target.value })}
                />
              </div>
            </div>

            {/* Module-specific fields */}
            {getSyncedModuleFields().length > 0 && (
              <>
                <Separator />
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {syncConfig?.syncedModuleName} Fields
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {getSyncedModuleFields().map(field => (
                    <div key={field.key}>
                      <Label>{field.label}</Label>
                      <Input
                        type={field.type}
                        value={productForm.attributes?.[field.key] || ''}
                        onChange={(e) => setProductForm({
                          ...productForm,
                          attributes: {
                            ...(productForm.attributes || {}),
                            [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                          }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Inventory Settings */}
            <Separator />
            <h4 className="font-medium">Inventory Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={productForm.reorderLevel || ''}
                  onChange={(e) => setProductForm({ ...productForm, reorderLevel: parseInt(e.target.value) })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Reorder Quantity</Label>
                <Input
                  type="number"
                  value={productForm.reorderQuantity || ''}
                  onChange={(e) => setProductForm({ ...productForm, reorderQuantity: parseInt(e.target.value) })}
                  placeholder="50"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddProductDialog(false)
              setEditingProduct(null)
              setProductForm({})
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={loading}>
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Action Card
function QuickActionCard({ title, description, icon: Icon, onClick }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-lg">
            <Icon className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default BuildInventory
