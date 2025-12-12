'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, Bell, FileText, Database, Save, AlertTriangle, 
  DollarSign, Edit, Trash2, Plus, IndianRupee, CreditCard,
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, RefreshCw,
  Wallet, Globe, Settings2, Activity, Sparkles, Bot, Brain
} from 'lucide-react'
import { toast } from 'sonner'

// Payment Gateway Logos/Icons
const GatewayIcon = ({ gateway }) => {
  const icons = {
    razorpay: (
      <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
        R
      </div>
    ),
    stripe: (
      <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
        S
      </div>
    ),
    paypal: (
      <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
        P
      </div>
    )
  }
  return icons[gateway] || <CreditCard className="h-10 w-10" />
}

export function SuperAdminSettings({ user }) {
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])
  const [editingPlan, setEditingPlan] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSection, setSavingSection] = useState(null)
  const [showSecrets, setShowSecrets] = useState({})
  const [testingGateway, setTestingGateway] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/logs?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setLogs(data.data?.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
    fetchSettings()
    fetchLogs()
  }, [fetchSettings, fetchLogs])

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

  // Save settings section
  const saveSettings = async (section, data) => {
    try {
      setSavingSection(section)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ section, data })
      })

      const result = await res.json()
      if (result.success) {
        toast.success('Settings saved successfully')
        fetchSettings()
        fetchLogs()
      } else {
        toast.error(result.error || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSavingSection(null)
    }
  }

  // Test payment gateway
  const testGateway = async (gateway, credentials) => {
    try {
      setTestingGateway(gateway)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'test-gateway', gateway, credentials })
      })

      const result = await res.json()
      if (result.success && result.data?.success) {
        toast.success(result.data.message || 'Connection successful!')
      } else {
        toast.error(result.data?.message || 'Connection failed')
      }
    } catch (error) {
      toast.error('Failed to test connection')
    } finally {
      setTestingGateway(null)
    }
  }

  // Toggle secret visibility
  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Update gateway settings locally
  const updateGatewaySettings = (gateway, field, value) => {
    setSettings(prev => ({
      ...prev,
      paymentGateways: {
        ...prev.paymentGateways,
        [gateway]: {
          ...prev.paymentGateways?.[gateway],
          [field]: value
        }
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          <p className="text-muted-foreground">Manage global configuration, payment gateways, pricing, and security</p>
        </div>
      </div>

      <Tabs defaultValue="payment-gateways" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="payment-gateways" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Gateways
          </TabsTrigger>
          <TabsTrigger value="ai-provider" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Provider
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pricing
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

        {/* Payment Gateways Tab */}
        <TabsContent value="payment-gateways">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Payment Gateway Configuration</h3>
                <p className="text-sm text-muted-foreground">Connect your preferred payment processors to accept payments</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSettings}
                disabled={settingsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${settingsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-6">
                {/* Razorpay */}
                <Card className="border-2 hover:border-blue-200 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GatewayIcon gateway="razorpay" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Razorpay
                            {settings?.paymentGateways?.razorpay?.enabled && (
                              <Badge variant="default" className="bg-green-500">Active</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>Accept payments via UPI, Cards, Netbanking in India</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.paymentGateways?.razorpay?.enabled || false}
                        onCheckedChange={(checked) => updateGatewaySettings('razorpay', 'enabled', checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Key ID</Label>
                        <Input
                          placeholder="rzp_live_xxxxx or rzp_test_xxxxx"
                          value={settings?.paymentGateways?.razorpay?.keyId || ''}
                          onChange={(e) => updateGatewaySettings('razorpay', 'keyId', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Key Secret</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets.razorpaySecret ? 'text' : 'password'}
                            placeholder="Enter Key Secret"
                            value={settings?.paymentGateways?.razorpay?.keySecret || ''}
                            onChange={(e) => updateGatewaySettings('razorpay', 'keySecret', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => toggleSecret('razorpaySecret')}
                          >
                            {showSecrets.razorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Secret (Optional)</Label>
                      <Input
                        type={showSecrets.razorpayWebhook ? 'text' : 'password'}
                        placeholder="Webhook signing secret"
                        value={settings?.paymentGateways?.razorpay?.webhookSecret || ''}
                        onChange={(e) => updateGatewaySettings('razorpay', 'webhookSecret', e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testGateway('razorpay', settings?.paymentGateways?.razorpay)}
                        disabled={testingGateway === 'razorpay'}
                      >
                        {testingGateway === 'razorpay' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveSettings('paymentGateways', settings?.paymentGateways)}
                        disabled={savingSection === 'paymentGateways'}
                      >
                        {savingSection === 'paymentGateways' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Razorpay
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Stripe */}
                <Card className="border-2 hover:border-purple-200 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GatewayIcon gateway="stripe" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Stripe
                            {settings?.paymentGateways?.stripe?.enabled && (
                              <Badge variant="default" className="bg-green-500">Active</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>Accept international payments with cards and wallets</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.paymentGateways?.stripe?.enabled || false}
                        onCheckedChange={(checked) => updateGatewaySettings('stripe', 'enabled', checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Publishable Key</Label>
                        <Input
                          placeholder="pk_live_xxxxx or pk_test_xxxxx"
                          value={settings?.paymentGateways?.stripe?.publishableKey || ''}
                          onChange={(e) => updateGatewaySettings('stripe', 'publishableKey', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secret Key</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets.stripeSecret ? 'text' : 'password'}
                            placeholder="sk_live_xxxxx or sk_test_xxxxx"
                            value={settings?.paymentGateways?.stripe?.secretKey || ''}
                            onChange={(e) => updateGatewaySettings('stripe', 'secretKey', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => toggleSecret('stripeSecret')}
                          >
                            {showSecrets.stripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Secret (Optional)</Label>
                      <Input
                        type={showSecrets.stripeWebhook ? 'text' : 'password'}
                        placeholder="whsec_xxxxx"
                        value={settings?.paymentGateways?.stripe?.webhookSecret || ''}
                        onChange={(e) => updateGatewaySettings('stripe', 'webhookSecret', e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testGateway('stripe', settings?.paymentGateways?.stripe)}
                        disabled={testingGateway === 'stripe'}
                      >
                        {testingGateway === 'stripe' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveSettings('paymentGateways', settings?.paymentGateways)}
                        disabled={savingSection === 'paymentGateways'}
                      >
                        {savingSection === 'paymentGateways' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Stripe
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* PayPal */}
                <Card className="border-2 hover:border-blue-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GatewayIcon gateway="paypal" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            PayPal
                            {settings?.paymentGateways?.paypal?.enabled && (
                              <Badge variant="default" className="bg-green-500">Active</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>Accept PayPal and card payments globally</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.paymentGateways?.paypal?.enabled || false}
                        onCheckedChange={(checked) => updateGatewaySettings('paypal', 'enabled', checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client ID</Label>
                        <Input
                          placeholder="PayPal Client ID"
                          value={settings?.paymentGateways?.paypal?.clientId || ''}
                          onChange={(e) => updateGatewaySettings('paypal', 'clientId', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Secret</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets.paypalSecret ? 'text' : 'password'}
                            placeholder="PayPal Client Secret"
                            value={settings?.paymentGateways?.paypal?.clientSecret || ''}
                            onChange={(e) => updateGatewaySettings('paypal', 'clientSecret', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => toggleSecret('paypalSecret')}
                          >
                            {showSecrets.paypalSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <select
                        className="flex h-10 w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={settings?.paymentGateways?.paypal?.mode || 'sandbox'}
                        onChange={(e) => updateGatewaySettings('paypal', 'mode', e.target.value)}
                      >
                        <option value="sandbox">Sandbox (Test)</option>
                        <option value="live">Live (Production)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testGateway('paypal', settings?.paymentGateways?.paypal)}
                        disabled={testingGateway === 'paypal'}
                      >
                        {testingGateway === 'paypal' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveSettings('paymentGateways', settings?.paymentGateways)}
                        disabled={savingSection === 'paymentGateways'}
                      >
                        {savingSection === 'paymentGateways' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save PayPal
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Notice:</strong> API keys and secrets are encrypted and stored securely. 
                    Never share your secret keys. Use test/sandbox keys during development.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </TabsContent>

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
                  <Switch 
                    checked={settings?.security?.require2FA || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev?.security, require2FA: checked }
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password Expiry</Label>
                    <p className="text-sm text-muted-foreground">Force password reset periodically</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      className="w-20"
                      value={settings?.security?.passwordExpiry || 90}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev?.security, passwordExpiry: parseInt(e.target.value) }
                      }))}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Minimum Password Length</Label>
                  <Input 
                    type="number" 
                    value={settings?.security?.minPasswordLength || 8}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev?.security, minPasswordLength: parseInt(e.target.value) }
                    }))}
                    className="max-w-[200px]" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input 
                    type="number" 
                    value={settings?.security?.sessionTimeout || 60}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev?.security, sessionTimeout: parseInt(e.target.value) }
                    }))}
                    className="max-w-[200px]" 
                  />
                </div>
                <Button 
                  onClick={() => saveSettings('security', settings?.security)}
                  disabled={savingSection === 'security'}
                >
                  {savingSection === 'security' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Security Settings
                </Button>
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
                  <Input 
                    placeholder="smtp.example.com"
                    value={settings?.email?.smtpHost || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev?.email, smtpHost: e.target.value }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Port</Label>
                  <Input 
                    placeholder="587"
                    value={settings?.email?.smtpPort || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev?.email, smtpPort: e.target.value }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Username</Label>
                  <Input 
                    placeholder="username@example.com"
                    value={settings?.email?.smtpUser || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev?.email, smtpUser: e.target.value }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Password</Label>
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={settings?.email?.smtpPassword || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev?.email, smtpPassword: e.target.value }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>From Email</Label>
                  <Input 
                    placeholder="noreply@example.com"
                    value={settings?.email?.fromEmail || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev?.email, fromEmail: e.target.value }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>From Name</Label>
                  <Input 
                    placeholder="BuilderCRM"
                    value={settings?.email?.fromName || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev?.email, fromName: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <Button 
                onClick={() => saveSettings('email', settings?.email)}
                disabled={savingSection === 'email'}
              >
                {savingSection === 'email' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Email Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>Recent system activities and audit trail</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity logs found
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <motion.div 
                      key={log.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={log.status === 'success' ? 'outline' : 'destructive'}>
                          {log.status || 'Success'}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{log.action?.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">by {log.userEmail || 'System'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </p>
                    </motion.div>
                  ))
                )}
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
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <div>
                  <p className="font-medium">Last Backup</p>
                  <p className="text-sm text-muted-foreground">Today at 04:00 AM (Automated)</p>
                </div>
                <Button size="sm">Create New Backup</Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">Temporarily disable access for non-admins</p>
                </div>
                <Switch 
                  checked={settings?.general?.maintenanceMode || false}
                  onCheckedChange={(checked) => {
                    setSettings(prev => ({
                      ...prev,
                      general: { ...prev?.general, maintenanceMode: checked }
                    }))
                    saveSettings('general', { ...settings?.general, maintenanceMode: checked })
                  }}
                />
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
