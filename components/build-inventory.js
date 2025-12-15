'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
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
import {
  Package, Warehouse, BarChart3, Settings, RefreshCw, Download, Plus,
  ArrowLeftRight, Bell, ClipboardList, Truck, Receipt, Layers, History,
  Bookmark, UserCheck, Search, Scan, AlertCircle, TrendingUp, DollarSign,
  Box, Boxes, Lock, Unlock, ChevronRight, ExternalLink, Sparkles, Zap,
  Database, Link2, CheckCircle2, Clock
} from 'lucide-react'
import { toast } from 'sonner'

// Import the Enterprise Inventory component
import { EnterpriseInventory } from '@/components/modules/flooring/EnterpriseInventory'

// Build Inventory - Standalone Product
export function BuildInventory({ token, user, clientModules = [] }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [syncStatus, setSyncStatus] = useState({ synced: 0, pending: 0, modules: [] })
  const [loading, setLoading] = useState(false)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [selectedModuleForSync, setSelectedModuleForSync] = useState(null)
  const [products, setProducts] = useState([])

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/sync', { headers })
      const data = await res.json()
      if (data.summary) {
        setSyncStatus({
          synced: data.summary.totalSynced || 0,
          pending: data.summary.pendingSync || 0,
          lastSync: data.summary.lastSync,
          modules: Object.entries(data.summary.byModule || {}).map(([id, info]) => ({
            id,
            name: info.moduleName,
            count: info.count
          }))
        })
      }
    } catch (error) {
      console.error('Sync status fetch error:', error)
    }
  }, [token])

  // Fetch inventory products
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/products', { headers })
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Products fetch error:', error)
    }
  }, [token])

  useEffect(() => {
    fetchSyncStatus()
    fetchProducts()
  }, [fetchSyncStatus, fetchProducts])

  // Trigger sync from a CRM module
  const handleSync = async (moduleId, syncAll = true) => {
    try {
      setLoading(true)
      const res = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers,
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
    }
  }

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
                <Link2 className="h-4 w-4 mr-2" /> Sync from CRM
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('inventory')}>
                Open Inventory <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Synced Products"
          value={syncStatus.synced}
          icon={Database}
          color="bg-blue-500"
          subtitle="From CRM modules"
        />
        <StatCard
          title="Active Modules"
          value={clientModules.filter(m => m.enabled).length}
          icon={Zap}
          color="bg-amber-500"
          subtitle="Connected to inventory"
        />
        <StatCard
          title="Total Products"
          value={products.length}
          icon={Package}
          color="bg-emerald-500"
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
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Product Sync from CRM Modules
          </CardTitle>
          <CardDescription>
            Products from your CRM modules are automatically synced to inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientModules.filter(m => m.enabled).length > 0 ? (
            <div className="space-y-3">
              {clientModules.filter(m => m.enabled).map(module => {
                const syncInfo = syncStatus.modules.find(s => s.id === module.id)
                return (
                  <div key={module.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Package className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="text-sm text-slate-500">
                          {syncInfo ? `${syncInfo.count} products synced` : 'Not synced yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {syncInfo ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedModuleForSync(module)
                          setShowSyncDialog(true)
                        }}
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Sync Now
                      </Button>
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
        <QuickActionCard
          title="Reports"
          description="Inventory analytics"
          icon={BarChart3}
          onClick={() => setActiveTab('inventory')}
        />
      </div>
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
                <TabsTrigger value="inventory">
                  <Package className="h-4 w-4 mr-2" /> Inventory
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
            <CardContent>
              <p className="text-slate-500">Settings coming soon...</p>
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
              Sync Products from CRM
            </DialogTitle>
            <DialogDescription>
              {selectedModuleForSync 
                ? `Sync products from ${selectedModuleForSync.name} to Build Inventory`
                : 'Select a CRM module to sync products from'
              }
            </DialogDescription>
          </DialogHeader>
          
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
                    <p className="text-sm text-slate-500">Ready to sync</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  This will sync all products from {selectedModuleForSync.name} to your Build Inventory. 
                  Existing products will be updated, new products will be added.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSyncDialog(false)
              setSelectedModuleForSync(null)
            }}>
              Cancel
            </Button>
            {selectedModuleForSync && (
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
                    Sync All Products
                  </>
                )}
              </Button>
            )}
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
