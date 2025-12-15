'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2, Package, IndianRupee, Search, Plus, Trash2, Edit,
  CheckCircle2, XCircle, RefreshCw, ExternalLink, Settings,
  Zap, Crown, Sparkles, ArrowRight, Lock, Unlock
} from 'lucide-react'
import { toast } from 'sonner'

// Product definitions
const PRODUCTS = {
  'build-crm': {
    id: 'build-crm',
    name: 'Build CRM',
    description: 'Enterprise CRM with industry modules',
    icon: Building2,
    color: 'blue',
    bgColor: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600'
  },
  'build-inventory': {
    id: 'build-inventory',
    name: 'Build Inventory',
    description: 'Enterprise inventory management',
    icon: Package,
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600'
  },
  'build-finance': {
    id: 'build-finance',
    name: 'Build Finance',
    description: 'Enterprise accounting & finance',
    icon: IndianRupee,
    color: 'amber',
    bgColor: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    comingSoon: true
  }
}

const PLAN_TIERS = [
  { id: 'starter', name: 'Starter', price: '₹999/mo' },
  { id: 'professional', name: 'Professional', price: '₹2,499/mo' },
  { id: 'enterprise', name: 'Enterprise', price: '₹4,999/mo' }
]

export function ProductAssignment({ token }) {
  const [clients, setClients] = useState([])
  const [clientProducts, setClientProducts] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [assignForm, setAssignForm] = useState({})

  // Create headers function that always uses the current token
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  })

  // Fetch clients only when token is available
  useEffect(() => {
    if (token) {
      fetchClients()
      fetchProducts()
    }
  }, [token])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients', { headers: getHeaders() })
      const data = await res.json()
      if (Array.isArray(data)) {
        setClients(data)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products', { headers: getHeaders() })
      const data = await res.json()
      // Products are seeded on first fetch
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchClientProducts = async (clientId) => {
    try {
      const res = await fetch(`/api/admin/products/assignments?clientId=${clientId}`, { headers: getHeaders() })
      const data = await res.json()
      if (data.assignments) {
        setClientProducts(prev => ({
          ...prev,
          [clientId]: data.assignments
        }))
      }
    } catch (error) {
      console.error('Failed to fetch client products:', error)
    }
  }

  const handleAssignProduct = async () => {
    if (!selectedClient || !assignForm.productId) return

    try {
      setLoading(true)
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          clientId: selectedClient.clientId || selectedClient.id,
          productId: assignForm.productId,
          planTier: assignForm.planTier || 'starter'
        })
      })

      if (res.ok) {
        toast.success('Product assigned successfully')
        fetchClients()
        setShowAssignDialog(false)
        setAssignForm({})
        setSelectedClient(null)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to assign product')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveProduct = async (clientId, productId) => {
    if (!confirm('Remove this product from the client?')) return

    try {
      const res = await fetch(`/api/admin/products?clientId=${clientId}&productId=${productId}`, {
        method: 'DELETE',
        headers: getHeaders()
      })

      if (res.ok) {
        toast.success('Product removed')
        fetchClients()
      } else {
        toast.error('Failed to remove product')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      client.businessName?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.clientId?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Build Suite Products
          </h2>
          <p className="text-slate-500">Manage product assignments for clients</p>
        </div>
        <Button onClick={fetchClients} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Product Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.values(PRODUCTS).map(product => {
          const Icon = product.icon
          const assignedCount = clients.filter(c => 
            c.assignedProducts?.includes(product.id)
          ).length

          return (
            <Card key={product.id} className={product.comingSoon ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${product.bgColor}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      {product.comingSoon && (
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{assignedCount} clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Client Product Assignments</CardTitle>
          <CardDescription>Assign Build Suite products to clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredClients.map(client => {
              const assignedProducts = client.assignedProducts || []
              
              return (
                <div key={client.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {client.businessName?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <p className="font-medium">{client.businessName}</p>
                      <p className="text-sm text-slate-500">{client.email}</p>
                      <p className="text-xs text-slate-400">ID: {client.clientId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Assigned Products */}
                    <div className="flex items-center gap-2">
                      {Object.values(PRODUCTS).map(product => {
                        const Icon = product.icon
                        const isAssigned = assignedProducts.includes(product.id) || product.id === 'build-crm'
                        
                        return (
                          <div
                            key={product.id}
                            className={`relative group ${product.comingSoon ? 'opacity-40' : ''}`}
                          >
                            <div
                              className={`p-2 rounded-lg ${isAssigned ? product.bgColor : 'bg-slate-200'} transition-colors`}
                              title={`${product.name}${isAssigned ? ' (Assigned)' : ''}`}
                            >
                              <Icon className={`h-4 w-4 ${isAssigned ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            {isAssigned && product.id !== 'build-crm' && (
                              <button
                                onClick={() => handleRemoveProduct(client.clientId, product.id)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Assign Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedClient(client)
                        setShowAssignDialog(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Assign
                    </Button>
                  </div>
                </div>
              )
            })}

            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No clients found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign Product Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Product to Client</DialogTitle>
            <DialogDescription>
              {selectedClient && `Assign a Build Suite product to ${selectedClient.businessName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Select
                value={assignForm.productId || ''}
                onValueChange={(v) => setAssignForm({ ...assignForm, productId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PRODUCTS).filter(p => !p.comingSoon).map(product => {
                    const Icon = product.icon
                    const isAlreadyAssigned = selectedClient?.assignedProducts?.includes(product.id)
                    
                    return (
                      <SelectItem 
                        key={product.id} 
                        value={product.id}
                        disabled={isAlreadyAssigned || product.id === 'build-crm'}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${product.textColor}`} />
                          <span>{product.name}</span>
                          {isAlreadyAssigned && <Badge variant="secondary" className="text-xs">Assigned</Badge>}
                          {product.id === 'build-crm' && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Plan Tier</Label>
              <Select
                value={assignForm.planTier || 'starter'}
                onValueChange={(v) => setAssignForm({ ...assignForm, planTier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TIERS.map(tier => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} - {tier.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignForm.productId === 'build-inventory' && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Product sync from CRM modules will be enabled automatically</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignProduct} disabled={loading || !assignForm.productId}>
              {loading ? 'Assigning...' : 'Assign Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductAssignment
