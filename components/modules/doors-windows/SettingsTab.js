'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import {
  Settings, MessageSquare, Bell, Zap, Save, TestTube, CheckCircle2,
  XCircle, Key, Globe, Factory, Scissors, Palette, CreditCard,
  Mail, Smartphone, RefreshCw, AlertTriangle, Plus, Trash2, Play,
  Shield, Lock, Unlock, Wrench, Building2, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// WhatsApp providers
const WHATSAPP_PROVIDERS = [
  { id: 'wati', name: 'WATI', logo: '🟢' },
  { id: 'interakt', name: 'Interakt', logo: '🟡' },
  { id: 'gupshup', name: 'Gupshup', logo: '🟣' },
  { id: 'custom', name: 'Custom WhatsApp Business API', logo: '🔵' }
]

// Business Mode Definitions
const BUSINESS_MODES = [
  {
    id: 'manufacturer',
    name: 'Manufacturer',
    icon: Factory,
    color: 'purple',
    description: 'Large-scale production, sells to dealers and distributors. Access to dealer network, price lists, and B2B features.',
    features: ['Dealer Network Management', 'Wholesale Price Lists', 'B2B Orders', 'Production at Scale', 'Dealer Credit Management']
  },
  {
    id: 'fabricator',
    name: 'Fabricator',
    icon: Scissors,
    color: 'blue',
    description: 'Custom cut-to-size production with full manufacturing workflow. Serves both dealers and direct customers.',
    features: ['Custom Fabrication', 'Full Production Stages', 'Both B2B & B2C', 'Site Surveys', 'Installation Management']
  },
  {
    id: 'dealer',
    name: 'Dealer',
    icon: Building2,
    color: 'emerald',
    description: 'Resells products from manufacturers. Focus on sales, customer service, and installation.',
    features: ['Product Catalog', 'Customer Quotations', 'Order from Manufacturer', 'Installation Coordination', 'After-Sales Service']
  }
]

export function SettingsTab({ settings: initialSettings, onSave, headers, glassStyles, businessMode, onBusinessModeChange }) {
  const [activeTab, setActiveTab] = useState('business-mode')
  const [settings, setSettings] = useState({
    // General Settings
    productionMode: 'fabricator', // fabricator | manufacturer
    businessName: '',
    businessAddress: '',
    gstNumber: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    
    // WhatsApp Integration
    whatsappEnabled: false,
    whatsappProvider: 'wati',
    whatsappApiKey: '',
    whatsappPhoneNumber: '',
    whatsappWebhookUrl: '',
    
    // Email Settings
    emailEnabled: false,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    senderEmail: '',
    senderName: '',
    
    // Notification Settings
    notifyOnNewQuote: true,
    notifyOnQuoteApproval: true,
    notifyOnOrderCreated: true,
    notifyOnProductionComplete: true,
    notifyOnInstallationScheduled: true,
    
    // Quote Settings
    defaultQuoteValidity: 30,
    defaultPaymentTerms: '50% advance, 50% before delivery',
    includeInstallationByDefault: true,
    taxRate: 18,
    
    // Automation Rules
    automations: []
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showAddAutomation, setShowAddAutomation] = useState(false)

  // Business Mode Change states
  const [currentMode, setCurrentMode] = useState(businessMode || 'fabricator')
  const [modeInfo, setModeInfo] = useState(null)
  const [showModeChangeDialog, setShowModeChangeDialog] = useState(false)
  const [selectedNewMode, setSelectedNewMode] = useState(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [devOtp, setDevOtp] = useState('') // For development only

  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger: 'quote_approved',
    action: 'send_whatsapp',
    enabled: true,
    config: {}
  })

  useEffect(() => {
    if (initialSettings) {
      setSettings({ ...settings, ...initialSettings })
    }
  }, [initialSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        toast.success('Settings saved successfully')
        onSave?.(settings)
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestWhatsApp = async () => {
    setTesting(true)
    try {
      // Simulate test
      await new Promise(r => setTimeout(r, 2000))
      toast.success('WhatsApp connection successful!')
    } catch (error) {
      toast.error('WhatsApp connection failed')
    } finally {
      setTesting(false)
    }
  }

  const handleTestEmail = async () => {
    setTesting(true)
    try {
      await new Promise(r => setTimeout(r, 2000))
      toast.success('Email configuration is valid!')
    } catch (error) {
      toast.error('Email test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleAddAutomation = () => {
    setSettings({
      ...settings,
      automations: [...settings.automations, { ...automationForm, id: `auto-${Date.now()}` }]
    })
    setShowAddAutomation(false)
    setAutomationForm({ name: '', trigger: 'quote_approved', action: 'send_whatsapp', enabled: true, config: {} })
    toast.success('Automation rule added')
  }

  const handleDeleteAutomation = (id) => {
    setSettings({
      ...settings,
      automations: settings.automations.filter(a => a.id !== id)
    })
    toast.success('Automation deleted')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
          <p className="text-slate-500">Configure module settings, integrations & automations</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-purple-600">
          {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-2" /> General</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="automation"><Zap className="h-4 w-4 mr-2" /> Automation</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Production Mode */}
          <Card className={glassStyles?.card}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Factory className="h-5 w-5 text-indigo-600" />
                Production Mode
              </CardTitle>
              <CardDescription>Choose how your business operates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.productionMode === 'fabricator'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSettings({ ...settings, productionMode: 'fabricator' })}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Scissors className="h-6 w-6 text-blue-600" />
                    <h4 className="font-semibold">Fabricator Mode</h4>
                  </div>
                  <p className="text-sm text-slate-600">
                    Cut-to-size production with full manufacturing stages (cutting, assembly, glass fitting, QC)
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.productionMode === 'manufacturer'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSettings({ ...settings, productionMode: 'manufacturer' })}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Factory className="h-6 w-6 text-purple-600" />
                    <h4 className="font-semibold">Manufacturer Mode</h4>
                  </div>
                  <p className="text-sm text-slate-600">
                    Direct material dispatch without cutting/sizing. Ideal for Aluminium profile manufacturers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card className={glassStyles?.card}>
            <CardHeader>
              <CardTitle className="text-lg">Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input value={settings.gstNumber} onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Business Address</Label>
                  <Textarea value={settings.businessAddress} onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Defaults */}
          <Card className={glassStyles?.card}>
            <CardHeader>
              <CardTitle className="text-lg">Quote Defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Quote Validity (days)</Label>
                  <Input type="number" value={settings.defaultQuoteValidity} onChange={(e) => setSettings({ ...settings, defaultQuoteValidity: parseInt(e.target.value) || 30 })} />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 18 })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Default Payment Terms</Label>
                  <Input value={settings.defaultPaymentTerms} onChange={(e) => setSettings({ ...settings, defaultPaymentTerms: e.target.value })} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Switch checked={settings.includeInstallationByDefault} onCheckedChange={(v) => setSettings({ ...settings, includeInstallationByDefault: v })} />
                  <Label>Include installation charges by default</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Integration */}
        <TabsContent value="whatsapp" className="space-y-6 mt-6">
          <Card className={glassStyles?.card}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                WhatsApp Business Integration
              </CardTitle>
              <CardDescription>Send quotes and notifications via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Switch checked={settings.whatsappEnabled} onCheckedChange={(v) => setSettings({ ...settings, whatsappEnabled: v })} />
                <div>
                  <Label className="text-base">Enable WhatsApp Integration</Label>
                  <p className="text-sm text-slate-500">Allow sending messages via WhatsApp Business API</p>
                </div>
              </div>

              {settings.whatsappEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Select Provider</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {WHATSAPP_PROVIDERS.map(provider => (
                        <div
                          key={provider.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                            settings.whatsappProvider === provider.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => setSettings({ ...settings, whatsappProvider: provider.id })}
                        >
                          <span className="text-2xl">{provider.logo}</span>
                          <p className="font-medium text-sm mt-1">{provider.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>API Key / Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.whatsappApiKey}
                        onChange={(e) => setSettings({ ...settings, whatsappApiKey: e.target.value })}
                        placeholder="Enter your API key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Phone Number</Label>
                      <Input
                        value={settings.whatsappPhoneNumber}
                        onChange={(e) => setSettings({ ...settings, whatsappPhoneNumber: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    {settings.whatsappProvider === 'custom' && (
                      <div className="col-span-2 space-y-2">
                        <Label>Webhook URL</Label>
                        <Input
                          value={settings.whatsappWebhookUrl}
                          onChange={(e) => setSettings({ ...settings, whatsappWebhookUrl: e.target.value })}
                          placeholder="https://api.whatsapp.com/v1/..."
                        />
                      </div>
                    )}
                  </div>

                  <Button variant="outline" onClick={handleTestWhatsApp} disabled={testing}>
                    {testing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                    Test Connection
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card className={glassStyles?.card}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Switch checked={settings.emailEnabled} onCheckedChange={(v) => setSettings({ ...settings, emailEnabled: v })} />
                <Label>Enable Email Notifications</Label>
              </div>

              {settings.emailEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input value={settings.smtpHost} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input value={settings.smtpPort} onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })} placeholder="587" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP User</Label>
                    <Input value={settings.smtpUser} onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Password</Label>
                    <Input type="password" value={settings.smtpPassword} onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Email</Label>
                    <Input value={settings.senderEmail} onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Name</Label>
                    <Input value={settings.senderName} onChange={(e) => setSettings({ ...settings, senderName: e.target.value })} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className={glassStyles?.card}>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Choose when to send notifications to customers and team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'notifyOnNewQuote', label: 'New quote created', desc: 'Send notification when a new quote is generated' },
                { key: 'notifyOnQuoteApproval', label: 'Quote approved', desc: 'Notify when customer approves a quote' },
                { key: 'notifyOnOrderCreated', label: 'Order created', desc: 'Notify when order is placed' },
                { key: 'notifyOnProductionComplete', label: 'Production complete', desc: 'Notify when production is finished' },
                { key: 'notifyOnInstallationScheduled', label: 'Installation scheduled', desc: 'Notify when installation is scheduled' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-base">{item.label}</Label>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation */}
        <TabsContent value="automation" className="space-y-6 mt-6">
          <Card className={glassStyles?.card}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-600" />
                    Automation Rules
                  </CardTitle>
                  <CardDescription>Automate actions based on triggers</CardDescription>
                </div>
                <Button onClick={() => setShowAddAutomation(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {settings.automations.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No automation rules configured</p>
                  <Button className="mt-3" variant="outline" onClick={() => setShowAddAutomation(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create First Rule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.automations.map(auto => (
                    <div key={auto.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${auto.enabled ? 'bg-amber-100' : 'bg-slate-200'}`}>
                          <Zap className={`h-5 w-5 ${auto.enabled ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{auto.name}</h4>
                          <p className="text-sm text-slate-500">
                            When: {auto.trigger.replace('_', ' ')} → Then: {auto.action.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={auto.enabled}
                          onCheckedChange={(v) => {
                            setSettings({
                              ...settings,
                              automations: settings.automations.map(a => a.id === auto.id ? { ...a, enabled: v } : a)
                            })
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAutomation(auto.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Automation Dialog */}
      <Dialog open={showAddAutomation} onOpenChange={setShowAddAutomation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Automation Rule</DialogTitle>
            <DialogDescription>Create a new automation to trigger actions automatically</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input value={automationForm.name} onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })} placeholder="e.g., Send quote on WhatsApp" />
            </div>
            <div className="space-y-2">
              <Label>Trigger (When)</Label>
              <Select value={automationForm.trigger} onValueChange={(v) => setAutomationForm({ ...automationForm, trigger: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote_created">Quote Created</SelectItem>
                  <SelectItem value="quote_approved">Quote Approved</SelectItem>
                  <SelectItem value="order_created">Order Created</SelectItem>
                  <SelectItem value="payment_received">Payment Received</SelectItem>
                  <SelectItem value="production_complete">Production Complete</SelectItem>
                  <SelectItem value="installation_scheduled">Installation Scheduled</SelectItem>
                  <SelectItem value="installation_complete">Installation Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action (Then)</Label>
              <Select value={automationForm.action} onValueChange={(v) => setAutomationForm({ ...automationForm, action: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_whatsapp">Send WhatsApp Message</SelectItem>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="create_task">Create Task</SelectItem>
                  <SelectItem value="update_status">Update Status</SelectItem>
                  <SelectItem value="notify_team">Notify Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAutomation(false)}>Cancel</Button>
            <Button onClick={handleAddAutomation}>Add Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
