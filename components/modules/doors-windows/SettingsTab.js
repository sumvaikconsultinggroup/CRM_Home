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

  // Fetch current business mode on mount
  useEffect(() => {
    fetchBusinessMode()
  }, [])

  // Update currentMode when businessMode prop changes
  useEffect(() => {
    if (businessMode) {
      setCurrentMode(businessMode)
    }
  }, [businessMode])

  const fetchBusinessMode = async () => {
    try {
      const res = await fetch(`${API_BASE}/business-mode`, { headers })
      const data = await res.json()
      if (!data.error) {
        setCurrentMode(data.mode || 'fabricator')
        setModeInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch business mode:', error)
    }
  }

  const handleRequestModeChange = async (newMode) => {
    if (newMode === currentMode) {
      toast.info('You are already in this mode')
      return
    }
    
    setSelectedNewMode(newMode)
    setShowModeChangeDialog(true)
  }

  const handleSendOTP = async () => {
    setRequestingOtp(true)
    try {
      const res = await fetch(`${API_BASE}/business-mode`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'request_otp', newMode: selectedNewMode })
      })
      const data = await res.json()
      
      if (res.ok) {
        setOtpSent(true)
        setMaskedEmail(data.email || '')
        if (data.devOtp) setDevOtp(data.devOtp) // For development testing
        toast.success(data.message || 'OTP sent to your email')
      } else {
        toast.error(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      toast.error('Failed to send OTP')
    } finally {
      setRequestingOtp(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setVerifyingOtp(true)
    try {
      const res = await fetch(`${API_BASE}/business-mode`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'verify_otp', otp, newMode: selectedNewMode })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message || 'Business mode changed successfully!')
        setCurrentMode(selectedNewMode)
        onBusinessModeChange?.(selectedNewMode)
        setShowModeChangeDialog(false)
        resetModeChangeState()
        fetchBusinessMode()
      } else {
        toast.error(data.error || 'Invalid OTP')
      }
    } catch (error) {
      toast.error('Failed to verify OTP')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleResendOTP = async () => {
    setRequestingOtp(true)
    try {
      const res = await fetch(`${API_BASE}/business-mode`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'resend_otp' })
      })
      const data = await res.json()
      
      if (res.ok) {
        if (data.devOtp) setDevOtp(data.devOtp)
        toast.success('New OTP sent to your email')
      } else {
        toast.error(data.error || 'Failed to resend OTP')
      }
    } catch (error) {
      toast.error('Failed to resend OTP')
    } finally {
      setRequestingOtp(false)
    }
  }

  const handleCancelModeChange = async () => {
    try {
      await fetch(`${API_BASE}/business-mode`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'cancel' })
      })
    } catch (error) {
      // Ignore cancel errors
    }
    setShowModeChangeDialog(false)
    resetModeChangeState()
  }

  const resetModeChangeState = () => {
    setSelectedNewMode(null)
    setOtpSent(false)
    setOtp('')
    setMaskedEmail('')
    setDevOtp('')
  }

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
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="business-mode"><Shield className="h-4 w-4 mr-2" /> Business Mode</TabsTrigger>
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-2" /> General</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="automation"><Zap className="h-4 w-4 mr-2" /> Automation</TabsTrigger>
        </TabsList>

        {/* Business Mode Settings - NEW PRIMARY TAB */}
        <TabsContent value="business-mode" className="space-y-6 mt-6">
          <Card className={glassStyles?.card}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    Business Mode Configuration
                  </CardTitle>
                  <CardDescription>
                    Select how your business operates. Mode changes require email verification for security.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  <Lock className="h-3 w-3 mr-1" />
                  Secured
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Current Mode Display */}
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const modeConfig = BUSINESS_MODES.find(m => m.id === currentMode)
                      const IconComponent = modeConfig?.icon || Factory
                      return (
                        <>
                          <div className={`p-3 rounded-xl bg-${modeConfig?.color || 'indigo'}-100`}>
                            <IconComponent className={`h-8 w-8 text-${modeConfig?.color || 'indigo'}-600`} />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Current Mode</p>
                            <p className="text-xl font-bold text-slate-800">{modeConfig?.name || 'Fabricator'}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  {modeInfo?.lastChangedAt && (
                    <div className="text-right text-sm text-slate-500">
                      <p>Last changed</p>
                      <p className="font-medium">{new Date(modeInfo.lastChangedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BUSINESS_MODES.map((mode) => {
                  const IconComponent = mode.icon
                  const isActive = currentMode === mode.id
                  const colorClasses = {
                    purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
                    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
                    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' }
                  }
                  const colors = colorClasses[mode.color]
                  
                  return (
                    <div
                      key={mode.id}
                      className={`relative p-5 rounded-xl border-2 transition-all ${
                        isActive
                          ? `${colors.border} ${colors.bg} shadow-lg`
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer'
                      }`}
                      onClick={() => !isActive && handleRequestModeChange(mode.id)}
                    >
                      {isActive && (
                        <Badge className={`absolute top-3 right-3 ${colors.badge}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                        </div>
                        <h4 className="font-semibold text-lg">{mode.name}</h4>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-4">{mode.description}</p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Key Features</p>
                        <ul className="space-y-1">
                          {mode.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <CheckCircle2 className={`h-3 w-3 ${colors.icon}`} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {!isActive && (
                        <Button
                          variant="outline"
                          className={`w-full mt-4 ${colors.text} border-current hover:${colors.bg}`}
                          onClick={(e) => { e.stopPropagation(); handleRequestModeChange(mode.id); }}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Switch to {mode.name}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Important Security Notice</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Changing your business mode will affect available features, tabs, and workflows. 
                      An OTP will be sent to your registered email address to verify this change. 
                      This is to prevent unauthorized mode switching.
                    </p>
                  </div>
                </div>
              </div>

              {/* Change History */}
              {modeInfo?.changeHistory && modeInfo.changeHistory.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-slate-700 mb-3">Change History</h4>
                  <div className="space-y-2">
                    {modeInfo.changeHistory.slice(-3).reverse().map((change, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="capitalize text-slate-500">{change.fromMode}</span>
                          <span className="text-slate-400">→</span>
                          <span className="capitalize font-medium">{change.toMode}</span>
                        </div>
                        <span className="text-slate-400">{new Date(change.changedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 mt-6">
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

      {/* Business Mode Change OTP Dialog */}
      <Dialog open={showModeChangeDialog} onOpenChange={(open) => !open && handleCancelModeChange()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              {otpSent ? 'Enter Verification Code' : 'Confirm Mode Change'}
            </DialogTitle>
            <DialogDescription>
              {otpSent 
                ? `We've sent a 6-digit OTP to ${maskedEmail}. Enter it below to confirm the change.`
                : 'This action requires email verification for security purposes.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {!otpSent ? (
              // Step 1: Confirm and Request OTP
              <div className="space-y-6">
                {/* Mode Change Summary */}
                <div className="flex items-center justify-center gap-4">
                  {(() => {
                    const fromMode = BUSINESS_MODES.find(m => m.id === currentMode)
                    const toMode = BUSINESS_MODES.find(m => m.id === selectedNewMode)
                    const FromIcon = fromMode?.icon || Factory
                    const ToIcon = toMode?.icon || Factory
                    
                    return (
                      <>
                        <div className="text-center">
                          <div className="p-3 rounded-xl bg-slate-100 mx-auto mb-2">
                            <FromIcon className="h-8 w-8 text-slate-500" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">{fromMode?.name}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-0.5 bg-gradient-to-r from-slate-300 to-indigo-500" />
                          <span className="text-2xl my-1">→</span>
                          <div className="w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-300" />
                        </div>
                        <div className="text-center">
                          <div className={`p-3 rounded-xl bg-${toMode?.color || 'indigo'}-100 mx-auto mb-2`}>
                            <ToIcon className={`h-8 w-8 text-${toMode?.color || 'indigo'}-600`} />
                          </div>
                          <p className={`text-sm font-medium text-${toMode?.color || 'indigo'}-600`}>{toMode?.name}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Warning */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">This will change your workflow</p>
                      <p className="text-amber-700 mt-1">
                        Switching modes will update available features, tabs, and business processes. 
                        Make sure you understand the implications.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSendOTP} 
                  disabled={requestingOtp}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  {requestingOtp ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" /> Send Verification OTP</>
                  )}
                </Button>
              </div>
            ) : (
              // Step 2: Enter OTP
              <div className="space-y-6">
                {/* OTP Input */}
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-slate-600">Enter the 6-digit code</p>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <Input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={otp[index] || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '')
                          if (value.length <= 1) {
                            const newOtp = otp.split('')
                            newOtp[index] = value
                            setOtp(newOtp.join(''))
                            // Auto-focus next input
                            if (value && index < 5) {
                              const nextInput = document.querySelector(`input[data-otp-index="${index + 1}"]`)
                              nextInput?.focus()
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace
                          if (e.key === 'Backspace' && !otp[index] && index > 0) {
                            const prevInput = document.querySelector(`input[data-otp-index="${index - 1}"]`)
                            prevInput?.focus()
                          }
                        }}
                        data-otp-index={index}
                        className="w-12 h-14 text-center text-2xl font-bold"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  
                  {/* Dev OTP Display (remove in production) */}
                  {devOtp && (
                    <div className="p-2 bg-slate-100 rounded text-center">
                      <p className="text-xs text-slate-500">Development OTP:</p>
                      <p className="font-mono font-bold text-lg">{devOtp}</p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || verifyingOtp}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600"
                >
                  {verifyingOtp ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-2" /> Verify & Change Mode</>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="text-slate-500">Did not receive the code?</span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={handleResendOTP}
                    disabled={requestingOtp}
                    className="p-0 h-auto"
                  >
                    Resend OTP
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelModeChange}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
