'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, Bell, FileText, Database, Save, RotateCcw, AlertTriangle, Mail, MessageSquare, DollarSign, Edit, Trash2, Plus, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'

export function SuperAdminSettings({ user }) {
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])
  const [editingPlan, setEditingPlan] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/pricing', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setPlans(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    }
  }

  const handleSavePlan = async (planData) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const method = editingPlan ? 'PUT' : 'POST'
      const body = editingPlan ? { ...planData, id: editingPlan.id } : planData

      const res = await fetch('/api/admin/pricing', {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (data.success) {
        toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully')
        setIsDialogOpen(false)
        setEditingPlan(null)
        fetchPlans()
      } else {
        toast.error(data.error || 'Failed to save plan')
      }
    } catch (error) {
      toast.error('Failed to save plan')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/pricing?id=${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Plan deleted successfully')
        fetchPlans()
      } else {
        toast.error(data.error || 'Failed to delete plan')
      }
    } catch (error) {
      toast.error('Failed to delete plan')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          <p className="text-muted-foreground">Manage global configuration, pricing, and security</p>
        </div>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pricing Management
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> System Logs
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Maintenance
          </TabsTrigger>
        </TabsList>

        {/* Pricing Management */}
        <TabsContent value="pricing">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Subscription Plans</h3>
                <p className="text-sm text-muted-foreground">Create and manage pricing plans for your platform</p>
              </div>
              <Button onClick={() => {
                setEditingPlan(null)
                setIsDialogOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-2" /> Add New Plan
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <div className="flex items-baseline gap-1 mt-2">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <span className="text-2xl font-bold">{plan.price}</span>
                          <span className="text-sm text-muted-foreground">/{plan.billingCycle}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">User Limit:</span>
                        <span className="font-medium">{plan.userLimit === -1 ? 'Unlimited' : plan.userLimit}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Storage:</span>
                        <span className="font-medium">{plan.storageGB}GB</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {plan.apiAccess && <Badge variant="secondary" className="text-xs">API Access</Badge>}
                        {plan.whitelabel && <Badge variant="secondary" className="text-xs">White Label</Badge>}
                        {plan.customDomain && <Badge variant="secondary" className="text-xs">Custom Domain</Badge>}
                      </div>
                      {plan.features && plan.features.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Features:</p>
                          <ul className="space-y-1">
                            {plan.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {feature}</li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-xs text-primary">+ {plan.features.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Policies</CardTitle>
                <CardDescription>Configure password requirements and login security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require 2FA for Admin Accounts</Label>
                    <p className="text-sm text-muted-foreground">Force two-factor authentication for all super admins</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password Expiry</Label>
                    <p className="text-sm text-muted-foreground">Force password reset every 90 days</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-2">
                  <Label>Minimum Password Length</Label>
                  <Input type="number" defaultValue={8} className="max-w-[200px]" />
                </div>
                <div className="grid gap-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input type="number" defaultValue={60} className="max-w-[200px]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Manage transactional email settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>SMTP Host</Label>
                  <Input placeholder="smtp.example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Port</Label>
                  <Input placeholder="587" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Recent system activities and audit trail</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'User Login', user: 'admin@buildcrm.com', time: '2 mins ago', status: 'Success' },
                  { action: 'Update Plan', user: 'admin@buildcrm.com', time: '15 mins ago', status: 'Success' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'Success' ? 'outline' : 'destructive'}>
                        {log.status}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground">by {log.user}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>Backup and restore system data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Last Backup</p>
                  <p className="text-sm text-muted-foreground">Today at 04:00 AM (Automated)</p>
                </div>
                <Button size="sm">Create New Backup</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <PlanDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plan={editingPlan}
        onSave={handleSavePlan}
        loading={loading}
      />
    </div>
  )
}

function PlanDialog({ open, onOpenChange, plan, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    billingCycle: 'monthly',
    userLimit: 5,
    storageGB: 5,
    features: '',
    whitelabel: false,
    customDomain: false,
    apiAccess: false
  })

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        price: plan.price || 0,
        billingCycle: plan.billingCycle || 'monthly',
        userLimit: plan.userLimit || 5,
        storageGB: plan.storageGB || 5,
        features: plan.features ? plan.features.join('\n') : '',
        whitelabel: plan.whitelabel || false,
        customDomain: plan.customDomain || false,
        apiAccess: plan.apiAccess || false
      })
    } else {
      setFormData({
        name: '',
        price: 0,
        billingCycle: 'monthly',
        userLimit: 5,
        storageGB: 5,
        features: '',
        whitelabel: false,
        customDomain: false,
        apiAccess: false
      })
    }
  }, [plan, open])

  const handleSubmit = (e) => {
    e.preventDefault()
    const features = formData.features.split('\n').filter(f => f.trim())
    onSave({ ...formData, features })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          <DialogDescription>
            Configure the pricing plan details and features.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>User Limit (-1 for unlimited)</Label>
              <Input 
                type="number"
                value={formData.userLimit}
                onChange={(e) => setFormData({ ...formData, userLimit: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Storage (GB)</Label>
              <Input 
                type="number"
                value={formData.storageGB}
                onChange={(e) => setFormData({ ...formData, storageGB: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Features (one per line)</Label>
            <Textarea 
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              rows={6}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>API Access</Label>
              <Switch 
                checked={formData.apiAccess}
                onCheckedChange={(checked) => setFormData({ ...formData, apiAccess: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>White Label</Label>
              <Switch 
                checked={formData.whitelabel}
                onCheckedChange={(checked) => setFormData({ ...formData, whitelabel: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Custom Domain</Label>
              <Switch 
                checked={formData.customDomain}
                onCheckedChange={(checked) => setFormData({ ...formData, customDomain: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
