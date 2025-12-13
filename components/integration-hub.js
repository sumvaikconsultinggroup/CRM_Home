'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Plug, Zap, Globe, Webhook, Key, Copy, Check, ExternalLink,
  RefreshCw, Trash2, Shield, Code, Link2, ArrowRight, Search,
  MessageSquare, Mail, Calendar, FileSpreadsheet, Bell, Share2,
  Video, Phone, CheckCircle2, XCircle, AlertCircle, Settings,
  Download, Send, Play, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

// Integration configurations
const INTEGRATIONS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send lead notifications, project updates, and daily summaries to your Slack channels.',
    icon: '💬',
    color: 'from-purple-500 to-pink-500',
    category: 'communication',
    directConnect: true,
    popular: true,
    features: ['Lead notifications', 'Project updates', 'Task alerts', 'Daily summaries'],
    requiredFields: [
      { key: 'webhookUrl', label: 'Slack Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...' }
    ],
    helpText: 'Create an Incoming Webhook in your Slack workspace to get the webhook URL.',
    helpUrl: 'https://api.slack.com/messaging/webhooks'
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Export and sync your CRM data to Google Sheets for reports and analysis.',
    icon: '📊',
    color: 'from-green-500 to-emerald-500',
    category: 'productivity',
    directConnect: true,
    popular: true,
    features: ['Export leads', 'Export projects', 'Export contacts', 'One-click download'],
    requiredFields: [
      { key: 'spreadsheetUrl', label: 'Google Sheets URL (Optional)', type: 'url', placeholder: 'https://docs.google.com/spreadsheets/d/...' }
    ],
    helpText: 'Link a Google Sheet or use the export feature to download CSV files.',
    helpUrl: 'https://support.google.com/docs/answer/6000292'
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Create Zoom meetings instantly for client calls and project discussions.',
    icon: '🎥',
    color: 'from-blue-500 to-cyan-500',
    category: 'communication',
    directConnect: true,
    popular: true,
    features: ['Create meetings', 'Auto-generate links', 'Meeting history', 'Project linking'],
    requiredFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'Your Zoom Account ID' },
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your Zoom Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your Zoom Client Secret' }
    ],
    helpText: 'Create a Server-to-Server OAuth app in the Zoom Marketplace.',
    helpUrl: 'https://marketplace.zoom.us/develop/create'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send automated messages and updates to clients via WhatsApp Business API.',
    icon: '📱',
    color: 'from-green-500 to-green-600',
    category: 'communication',
    directConnect: true,
    popular: true,
    features: ['Lead notifications', 'Follow-up messages', 'Template messages', 'Message history'],
    requiredFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: 'Your WhatsApp Phone Number ID' },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Your WhatsApp Access Token' },
      { key: 'businessAccountId', label: 'Business Account ID (Optional)', type: 'text', placeholder: 'Your WABA ID' }
    ],
    helpText: 'Get your credentials from Meta Business Suite → WhatsApp → API Setup.',
    helpUrl: 'https://business.facebook.com/settings/whatsapp-business-accounts'
  },
  {
    id: 'pabbly',
    name: 'Pabbly Connect',
    description: 'Automate workflows with 1000+ apps using Pabbly Connect webhooks.',
    icon: '🔗',
    color: 'from-blue-600 to-indigo-600',
    category: 'automation',
    directConnect: true,
    popular: true,
    features: ['Webhook triggers', 'Incoming webhooks', 'Multi-step workflows', 'Event automation'],
    requiredFields: [
      { key: 'webhookUrl', label: 'Pabbly Webhook URL (Optional)', type: 'url', placeholder: 'Your Pabbly Catch Hook URL' }
    ],
    helpText: 'Create a workflow in Pabbly with "Webhook / API" as trigger.',
    helpUrl: 'https://www.pabbly.com/connect/'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect BuildCRM with 5,000+ apps through Zapier automations.',
    icon: '⚡',
    color: 'from-orange-500 to-red-500',
    category: 'automation',
    directConnect: true,
    popular: true,
    features: ['5000+ app integrations', 'Webhook triggers', 'Catch hooks', 'Multi-step Zaps'],
    requiredFields: [
      { key: 'webhookUrl', label: 'Zapier Catch Hook URL (Optional)', type: 'url', placeholder: 'https://hooks.zapier.com/...' }
    ],
    helpText: 'Create a Zap with "Webhooks by Zapier" as the trigger.',
    helpUrl: 'https://zapier.com/apps/webhook/integrations'
  }
]

export function IntegrationHub({ client }) {
  const [integrations, setIntegrations] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [formData, setFormData] = useState({})
  const [activeTab, setActiveTab] = useState('all')

  // Fetch all integration statuses
  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }

      // Fetch status for each integration type
      const [slack, sheets, zoom, whatsapp, pabbly, zapier] = await Promise.all([
        fetch('/api/integrations/slack', { headers }).then(r => r.json()).catch(() => null),
        fetch('/api/integrations/google-sheets', { headers }).then(r => r.json()).catch(() => null),
        fetch('/api/integrations/zoom', { headers }).then(r => r.json()).catch(() => null),
        fetch('/api/integrations/whatsapp', { headers }).then(r => r.json()).catch(() => null),
        fetch('/api/integrations/pabbly', { headers }).then(r => r.json()).catch(() => null),
        fetch('/api/integrations/zapier', { headers }).then(r => r.json()).catch(() => null)
      ])

      setIntegrations({
        slack: slack?.data || null,
        'google-sheets': sheets?.data || null,
        zoom: zoom?.data || null,
        whatsapp: whatsapp?.data || null,
        pabbly: pabbly?.data || null,
        zapier: zapier?.data || null
      })
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (integration) => {
    setConnecting(true)
    try {
      const token = localStorage.getItem('token')
      let endpoint = `/api/integrations/${integration.id}`
      let body = {}

      // Build request based on integration type
      switch (integration.id) {
        case 'slack':
          body = { action: 'connect', webhookUrl: formData.webhookUrl }
          break
        case 'google-sheets':
          body = { action: 'connect', spreadsheetUrl: formData.spreadsheetUrl || '' }
          break
        case 'zoom':
          body = { action: 'connect', accountId: formData.accountId, clientId: formData.clientId, clientSecret: formData.clientSecret }
          break
        case 'whatsapp':
          body = { action: 'connect', phoneNumberId: formData.phoneNumberId, accessToken: formData.accessToken, businessAccountId: formData.businessAccountId }
          break
        case 'pabbly':
          body = { action: 'generate-webhook', webhookUrl: formData.webhookUrl }
          break
        case 'zapier':
          body = { action: 'generate-webhook', webhookUrl: formData.webhookUrl }
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`${integration.name} connected successfully!`)
        setShowSetupDialog(false)
        setFormData({})
        fetchIntegrations()
      } else {
        toast.error(result.error || 'Failed to connect')
      }
    } catch (error) {
      toast.error('Connection failed. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (integrationId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Integration disconnected')
        fetchIntegrations()
      } else {
        toast.error(result.error || 'Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect')
    }
  }

  const handleTest = async (integrationId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'test' })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Test successful!')
      } else {
        toast.error(result.error || 'Test failed')
      }
    } catch (error) {
      toast.error('Test failed')
    }
  }

  const handleExport = async (dataType) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/integrations/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'export', dataType })
      })

      const result = await response.json()
      if (result.success && result.data?.csv) {
        // Download CSV
        const blob = new Blob([result.data.csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success(`Exported ${result.data.recordCount} records`)
      } else {
        toast.error(result.error || 'Export failed')
      }
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const openSetup = (integration) => {
    setSelectedIntegration(integration)
    setFormData({})
    setShowSetupDialog(true)
  }

  const isConnected = (id) => integrations[id]?.active

  const connectedCount = Object.values(integrations).filter(i => i?.active).length

  const filteredIntegrations = INTEGRATIONS.filter(i => {
    if (activeTab === 'all') return true
    if (activeTab === 'connected') return isConnected(i.id)
    return i.category === activeTab
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />
            Integration Hub
          </h2>
          <p className="text-muted-foreground">Connect BuildCRM with your favorite tools - Direct, company-built integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-4 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            {connectedCount} Connected
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchIntegrations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connected Integrations Summary */}
      {connectedCount > 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Active Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {INTEGRATIONS.filter(i => isConnected(i.id)).map(integration => (
                <div key={integration.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border">
                  <span className="text-xl">{integration.icon}</span>
                  <span className="font-medium">{integration.name}</span>
                  <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-2">
            <Globe className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="connected" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </TabsTrigger>
          <TabsTrigger value="communication" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="productivity" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Productivity
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration, i) => {
              const connected = isConnected(integration.id)
              const integrationData = integrations[integration.id]

              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`h-full flex flex-col transition-all hover:shadow-lg ${connected ? 'border-green-300 bg-green-50/30' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-2xl shadow-lg`}>
                          {integration.icon}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {integration.popular && (
                            <Badge className="bg-amber-100 text-amber-700 border-0">Popular</Badge>
                          )}
                          {connected && (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="mt-4">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {integration.features.slice(0, 3).map((feature, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>

                      {/* Connection Status Details */}
                      {connected && integrationData && (
                        <div className="mb-4 p-3 bg-white rounded-lg border text-sm">
                          {integration.id === 'slack' && (
                            <div className="text-muted-foreground">
                              Channel: {integrationData.channel || '#general'}
                            </div>
                          )}
                          {integration.id === 'zoom' && (
                            <div className="text-muted-foreground">
                              Account: {integrationData.accountId}
                            </div>
                          )}
                          {integration.id === 'whatsapp' && (
                            <div className="text-muted-foreground">
                              Phone: {integrationData.phoneNumber || integrationData.phoneNumberId}
                            </div>
                          )}
                          {(integration.id === 'pabbly' || integration.id === 'zapier') && integrationData.incomingWebhookUrl && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium">Webhook URL:</div>
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate">
                                {integrationData.incomingWebhookUrl}
                              </code>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            Connected {new Date(integrationData.connectedAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto space-y-2">
                        {connected ? (
                          <>
                            <div className="flex gap-2">
                              {integration.id === 'slack' && (
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleTest('slack')}>
                                  <Send className="h-4 w-4 mr-1" />
                                  Test
                                </Button>
                              )}
                              {integration.id === 'google-sheets' && (
                                <Select onValueChange={(value) => handleExport(value)}>
                                  <SelectTrigger className="flex-1">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Data
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="leads">Leads</SelectItem>
                                    <SelectItem value="projects">Projects</SelectItem>
                                    <SelectItem value="contacts">Contacts</SelectItem>
                                    <SelectItem value="tasks">Tasks</SelectItem>
                                    <SelectItem value="expenses">Expenses</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {(integration.id === 'pabbly' || integration.id === 'zapier') && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={async () => {
                                    const token = localStorage.getItem('token')
                                    const res = await fetch(`/api/integrations/${integration.id}`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ action: 'trigger-test' })
                                    })
                                    const result = await res.json()
                                    if (result.success) {
                                      toast.success('Test trigger sent!')
                                    } else {
                                      toast.error(result.error || 'Test failed')
                                    }
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Test Trigger
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDisconnect(integration.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => openSetup(integration)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Settings
                            </Button>
                          </>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => openSetup(integration)}
                          >
                            Connect {integration.name}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">{selectedIntegration?.icon}</span>
              {isConnected(selectedIntegration?.id) ? 'Manage' : 'Connect'} {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4 py-4">
              {/* Connection Form */}
              {!isConnected(selectedIntegration.id) && (
                <>
                  {selectedIntegration.requiredFields?.map(field => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        type={field.type === 'password' ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      />
                    </div>
                  ))}

                  {selectedIntegration.helpText && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">{selectedIntegration.helpText}</p>
                      {selectedIntegration.helpUrl && (
                        <a 
                          href={selectedIntegration.helpUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          Learn more <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Connected State - Show webhook URLs for automation platforms */}
              {isConnected(selectedIntegration.id) && (
                <div className="space-y-4">
                  {(selectedIntegration.id === 'pabbly' || selectedIntegration.id === 'zapier') && (
                    <>
                      <div className="space-y-2">
                        <Label>Incoming Webhook URL</Label>
                        <p className="text-xs text-muted-foreground">Use this URL to send data TO BuildCRM</p>
                        <div className="flex gap-2">
                          <Input 
                            value={integrations[selectedIntegration.id]?.incomingWebhookUrl || ''} 
                            readOnly 
                            className="font-mono text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(integrations[selectedIntegration.id]?.incomingWebhookUrl)
                              toast.success('Copied!')
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Outgoing Webhook URL</Label>
                        <p className="text-xs text-muted-foreground">BuildCRM will send events to this URL</p>
                        <Input
                          placeholder={`Your ${selectedIntegration.name} Catch Hook URL`}
                          value={formData.webhookUrl || integrations[selectedIntegration.id]?.outgoingWebhookUrl || ''}
                          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                        />
                        {formData.webhookUrl && (
                          <Button 
                            size="sm"
                            onClick={async () => {
                              const token = localStorage.getItem('token')
                              const res = await fetch(`/api/integrations/${selectedIntegration.id}`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ action: 'connect-outgoing', webhookUrl: formData.webhookUrl })
                              })
                              const result = await res.json()
                              if (result.success) {
                                toast.success('Outgoing webhook updated!')
                                fetchIntegrations()
                              } else {
                                toast.error(result.error || 'Failed to update')
                              }
                            }}
                          >
                            Save Outgoing Webhook
                          </Button>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label>Event Triggers</Label>
                        {['onNewLead', 'onLeadStatusChange', 'onProjectCreated', 'onTaskCompleted'].map(trigger => (
                          <div key={trigger} className="flex items-center justify-between">
                            <span className="text-sm">{trigger.replace(/([A-Z])/g, ' $1').replace('on ', '')}</span>
                            <Switch 
                              defaultChecked={integrations[selectedIntegration.id]?.triggers?.[trigger]}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedIntegration.id === 'slack' && (
                    <div className="space-y-3">
                      <Label>Notification Settings</Label>
                      {['newLead', 'leadConverted', 'projectCreated', 'taskCompleted'].map(notif => (
                        <div key={notif} className="flex items-center justify-between">
                          <span className="text-sm">{notif.replace(/([A-Z])/g, ' $1')}</span>
                          <Switch 
                            defaultChecked={integrations[selectedIntegration.id]?.notifications?.[notif]}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedIntegration.id === 'google-sheets' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {['leads', 'projects', 'contacts', 'tasks', 'expenses'].map(type => (
                          <Button 
                            key={type} 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => handleExport(type)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedIntegration.id === 'zoom' && (
                    <div className="space-y-4">
                      <Button 
                        className="w-full"
                        onClick={async () => {
                          const token = localStorage.getItem('token')
                          const res = await fetch('/api/integrations/zoom', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ 
                              action: 'create-meeting',
                              meeting: {
                                topic: 'Quick Meeting from BuildCRM',
                                duration: 30
                              }
                            })
                          })
                          const result = await res.json()
                          if (result.success && result.data?.joinUrl) {
                            navigator.clipboard.writeText(result.data.joinUrl)
                            toast.success('Meeting created! Link copied to clipboard.')
                            window.open(result.data.joinUrl, '_blank')
                          } else {
                            toast.error(result.error || 'Failed to create meeting')
                          }
                        }}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Create Instant Meeting
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Close
            </Button>
            {!isConnected(selectedIntegration?.id) && (
              <Button onClick={() => handleConnect(selectedIntegration)} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect
                    <ArrowRight className="h-4 w-4 ml-2" />
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
