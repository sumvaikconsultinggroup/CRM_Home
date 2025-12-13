'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plug, Zap, Globe, Webhook, Key, Copy, Check, ExternalLink,
  RefreshCw, Trash2, Shield, Code, Link2, ArrowRight, Search,
  MessageSquare, Mail, Calendar, FileSpreadsheet, Bell, Share2
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const INTEGRATIONS = [
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect BuildCRM with 5,000+ apps. Automate workflows without coding.',
    icon: '⚡',
    category: 'automation',
    popular: true,
    color: 'from-orange-500 to-orange-600',
    setupUrl: 'https://zapier.com/apps/webhook/integrations',
    webhookEndpoint: '/api/webhooks/zapier',
    features: ['Trigger on new leads', 'Create tasks automatically', 'Sync contacts', 'Update project status']
  },
  {
    id: 'pabbly',
    name: 'Pabbly Connect',
    description: 'Affordable automation platform. One-time pricing, unlimited tasks.',
    icon: '🔗',
    category: 'automation',
    popular: true,
    color: 'from-blue-500 to-blue-600',
    setupUrl: 'https://www.pabbly.com/connect/',
    webhookEndpoint: '/api/webhooks/pabbly',
    features: ['Webhook triggers', 'Multi-step workflows', 'Data formatting', 'Conditional logic']
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Visual automation platform. Build complex workflows with ease.',
    icon: '🔮',
    category: 'automation',
    color: 'from-purple-500 to-purple-600',
    setupUrl: 'https://www.make.com/',
    features: ['Visual workflow builder', 'Real-time execution', 'Error handling', 'Data transformation']
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Open-source workflow automation. Self-hosted or cloud option.',
    icon: '🔄',
    category: 'automation',
    color: 'from-red-500 to-red-600',
    setupUrl: 'https://n8n.io/',
    features: ['Self-hosted option', 'Custom nodes', 'Code blocks', 'Data processing']
  },
  {
    id: 'integrately',
    name: 'Integrately',
    description: '8M+ ready automations. One-click setup for common workflows.',
    icon: '🚀',
    category: 'automation',
    color: 'from-green-500 to-green-600',
    setupUrl: 'https://integrately.com/',
    features: ['Pre-built automations', 'Quick setup', 'Smart connect', 'Multi-app workflows']
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync events and tasks with Google Calendar.',
    icon: '📅',
    category: 'productivity',
    color: 'from-blue-400 to-blue-500',
    features: ['Two-way sync', 'Task reminders', 'Meeting scheduling', 'Team availability']
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Export data and create reports in Google Sheets.',
    icon: '📊',
    category: 'productivity',
    color: 'from-green-400 to-green-500',
    webhookEndpoint: '/api/webhooks/google-sheets',
    features: ['Auto export leads', 'Report generation', 'Data backup', 'Custom views', 'Real-time sync']
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and updates directly in Slack.',
    icon: '💬',
    category: 'communication',
    color: 'from-purple-400 to-pink-500',
    features: ['Lead notifications', 'Task updates', 'Team mentions', 'Channel posting']
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Connect directly with WhatsApp Business API for automated messaging.',
    icon: '📱',
    category: 'communication',
    popular: true,
    color: 'from-green-500 to-green-600',
    hasDirectConnect: true,
    webhookEndpoint: '/api/webhooks/whatsapp',
    requiredFields: ['phoneNumberId', 'accessToken', 'businessAccountId', 'verifyToken'],
    features: ['Lead notifications', 'Follow-up messages', 'Template messages', 'Quick replies', 'Media sharing', 'Auto lead capture']
  },
  {
    id: 'email-smtp',
    name: 'Email (SMTP)',
    description: 'Send emails using your own SMTP server.',
    icon: '✉️',
    category: 'communication',
    color: 'from-slate-500 to-slate-600',
    hasDirectConnect: true,
    requiredFields: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword'],
    features: ['Custom templates', 'Bulk emails', 'Tracking', 'Personalization']
  },
  {
    id: 'tally',
    name: 'Tally ERP',
    description: 'Sync invoices, payments, and accounting data with Tally.',
    icon: '📒',
    category: 'accounting',
    popular: true,
    color: 'from-red-500 to-red-600',
    hasDirectConnect: true,
    webhookEndpoint: '/api/webhooks/tally',
    requiredFields: ['tallyHost', 'tallyPort', 'companyName'],
    features: ['Invoice sync', 'Payment tracking', 'Ledger updates', 'GST compliance', 'Auto vouchers']
  },
  {
    id: 'indiamart',
    name: 'IndiaMART',
    description: 'Auto-import leads from IndiaMART inquiries.',
    icon: '🇮🇳',
    category: 'lead-sources',
    popular: true,
    color: 'from-blue-600 to-blue-700',
    features: ['Auto lead import', 'Buyer details', 'Product mapping', 'Real-time sync']
  },
  {
    id: 'justdial',
    name: 'JustDial',
    description: 'Import leads from JustDial automatically.',
    icon: '📞',
    category: 'lead-sources',
    color: 'from-blue-500 to-cyan-500',
    features: ['Lead import', 'Contact sync', 'Business details', 'Call tracking']
  },
  {
    id: 'facebook',
    name: 'Facebook Lead Ads',
    description: 'Capture leads from Facebook and Instagram ads.',
    icon: '📘',
    category: 'lead-sources',
    color: 'from-blue-600 to-blue-700',
    features: ['Instant lead capture', 'Custom forms', 'Audience sync', 'Retargeting']
  },
  {
    id: 'webhooks',
    name: 'Custom Webhooks',
    description: 'Create custom webhooks for any integration.',
    icon: '🔌',
    category: 'developer',
    color: 'from-slate-600 to-slate-700',
    features: ['Incoming webhooks', 'Event triggers', 'Custom payloads', 'Authentication']
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Full API access for custom integrations.',
    icon: '⚙️',
    category: 'developer',
    color: 'from-indigo-500 to-indigo-600',
    features: ['Full CRUD access', 'Authentication', 'Rate limiting', 'Documentation']
  }
]

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Globe },
  { id: 'automation', name: 'Automation', icon: Zap },
  { id: 'productivity', name: 'Productivity', icon: Calendar },
  { id: 'communication', name: 'Communication', icon: MessageSquare },
  { id: 'accounting', name: 'Accounting', icon: FileSpreadsheet },
  { id: 'lead-sources', name: 'Lead Sources', icon: Share2 },
  { id: 'developer', name: 'Developer', icon: Code }
]

export function Integrations({ client }) {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [connectionConfig, setConnectionConfig] = useState({})
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const data = await api.getIntegrations()
      setIntegrations(data || [])
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateWebhook = async (integration) => {
    try {
      const result = await api.generateWebhook(integration.name)
      setWebhookUrl(result.webhookUrl)
      toast.success('Webhook generated successfully')
      fetchIntegrations()
    } catch (error) {
      toast.error('Failed to generate webhook')
    }
  }

  const handleDirectConnect = async (integration) => {
    setConnecting(true)
    try {
      await api.connectIntegration(integration.id, connectionConfig)
      toast.success(`${integration.name} connected successfully!`)
      setConnectionConfig({})
      fetchIntegrations()
    } catch (error) {
      toast.error('Failed to connect integration')
    } finally {
      setConnecting(false)
    }
  }

  const handleGenerateApiKey = async () => {
    try {
      const result = await api.generateApiKey()
      setApiKey(result.apiKey)
      toast.success('API key generated successfully')
      fetchIntegrations()
    } catch (error) {
      toast.error('Failed to generate API key')
    }
  }

  const handleDisconnect = async (id) => {
    try {
      await api.disconnectIntegration(id)
      toast.success('Integration disconnected')
      fetchIntegrations()
    } catch (error) {
      toast.error('Failed to disconnect integration')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const openSetup = (integration) => {
    setSelectedIntegration(integration)
    setWebhookUrl('')
    setApiKey('')
    setShowSetupDialog(true)
  }

  const isConnected = (integrationId) => {
    return integrations.some(i => i.type === integrationId || i.name === integrationId)
  }

  const filteredIntegrations = INTEGRATIONS.filter(i => {
    const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         i.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const connectedIntegrations = integrations.filter(i => i.active)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground">Connect BuildCRM with your favorite tools</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            {connectedIntegrations.length} Connected
          </Badge>
        </div>
      </div>

      {/* Connected Integrations */}
      {connectedIntegrations.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" /> Connected Integrations
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map((integration, i) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    {integration.type === 'webhook' ? '🔌' : integration.type === 'api_key' ? '🔑' : '⚡'}
                  </div>
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(integration.connectedAt || integration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDisconnect(integration.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="gap-2"
            >
              <cat.icon className="h-4 w-4" />
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration, i) => {
          const connected = isConnected(integration.id)
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`p-6 h-full flex flex-col hover:shadow-lg transition-all ${connected ? 'border-green-300 bg-green-50/50' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {integration.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.popular && (
                      <Badge className="bg-amber-100 text-amber-700 border-0">Popular</Badge>
                    )}
                    {connected && (
                      <Badge className="bg-green-100 text-green-700 border-0">Connected</Badge>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{integration.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{integration.description}</p>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {integration.features.slice(0, 3).map((feature, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{feature}</Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      variant={connected ? 'outline' : 'default'}
                      onClick={() => openSetup(integration)}
                    >
                      {connected ? 'Manage' : 'Connect'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    {integration.setupUrl && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={integration.setupUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">{selectedIntegration?.icon}</span>
              {selectedIntegration?.name} Setup
            </DialogTitle>
            <DialogDescription>
              Follow these steps to connect {selectedIntegration?.name} with BuildCRM
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-6 py-4">
              {/* For automation tools */}
              {selectedIntegration.category === 'automation' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Webhook className="h-5 w-5 text-blue-600" />
                      Step 1: Generate Webhook URL
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a webhook URL to receive data from {selectedIntegration.name}
                    </p>
                    {webhookUrl ? (
                      <div className="flex gap-2">
                        <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => handleGenerateWebhook(selectedIntegration)}>
                        Generate Webhook URL
                      </Button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border">
                    <h4 className="font-semibold mb-2">Step 2: Configure in {selectedIntegration.name}</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Go to {selectedIntegration.name} and create a new Zap/Flow</li>
                      <li>Add "Webhooks by Zapier" or "HTTP Request" as action</li>
                      <li>Paste your webhook URL from Step 1</li>
                      <li>Configure the data mapping (lead name, email, phone, etc.)</li>
                      <li>Test and activate your automation</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Code className="h-5 w-5 text-amber-600" />
                      Sample Payload
                    </h4>
                    <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{`{
  "event": "lead.create",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "source": "Website",
  "value": 50000,
  "notes": "Interested in kitchen renovation"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* For API/Developer */}
              {selectedIntegration.category === 'developer' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Key className="h-5 w-5 text-indigo-600" />
                      API Key
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate an API key for authenticated access
                    </p>
                    {apiKey ? (
                      <div className="flex gap-2">
                        <Input value={apiKey} readOnly className="font-mono text-sm" type="password" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)}>
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleGenerateApiKey}>
                        Generate API Key
                      </Button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border">
                    <h4 className="font-semibold mb-2">API Endpoints</h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span>GET /api/leads</span>
                        <Badge variant="outline">List leads</Badge>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span>POST /api/leads</span>
                        <Badge variant="outline">Create lead</Badge>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span>GET /api/projects</span>
                        <Badge variant="outline">List projects</Badge>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span>GET /api/tasks</span>
                        <Badge variant="outline">List tasks</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Direct Connect */}
              {selectedIntegration.id === 'whatsapp' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">📱</span>
                      WhatsApp Business API Configuration
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Phone Number ID</label>
                        <Input
                          placeholder="Enter your WhatsApp Phone Number ID"
                          value={connectionConfig.phoneNumberId || ''}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, phoneNumberId: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Found in Meta Business Suite → WhatsApp → API Setup</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Access Token</label>
                        <Input
                          type="password"
                          placeholder="Enter your WhatsApp Access Token"
                          value={connectionConfig.accessToken || ''}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, accessToken: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Generate a permanent token from Meta Developer Portal</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Business Account ID</label>
                        <Input
                          placeholder="Enter your WhatsApp Business Account ID"
                          value={connectionConfig.businessAccountId || ''}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, businessAccountId: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border">
                    <h4 className="font-semibold mb-2">How to get WhatsApp API credentials:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Business Suite</a></li>
                      <li>Navigate to WhatsApp → API Setup</li>
                      <li>Copy your Phone Number ID and generate an Access Token</li>
                      <li>For production, create a System User with permanent token</li>
                    </ol>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleDirectConnect(selectedIntegration)}
                    disabled={connecting || !connectionConfig.phoneNumberId || !connectionConfig.accessToken}
                  >
                    {connecting ? 'Connecting...' : 'Connect WhatsApp'} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Tally Direct Connect */}
              {selectedIntegration.id === 'tally' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">📒</span>
                      Tally ERP Configuration
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Tally Server Host</label>
                        <Input
                          placeholder="e.g., localhost or 192.168.1.100"
                          value={connectionConfig.tallyHost || ''}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, tallyHost: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">IP address or hostname where Tally is running</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tally Port</label>
                        <Input
                          placeholder="Default: 9000"
                          value={connectionConfig.tallyPort || ''}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, tallyPort: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Usually 9000 for Tally ODBC server</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Company Name</label>
                        <Input
                          placeholder="Enter your Tally Company Name"
                          value={connectionConfig.companyName || ''}
                          onChange={(e) => setConnectionConfig({ ...connectionConfig, companyName: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Exact name as shown in Tally</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border">
                    <h4 className="font-semibold mb-2">Tally Setup Requirements:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Enable Tally ODBC Server in Tally → F12 → Data Configuration</li>
                      <li>Set Port Number (default 9000)</li>
                      <li>Enable "Allow Remote Access" if connecting from another machine</li>
                      <li>Keep Tally running with the company open</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <h4 className="font-semibold mb-2 text-amber-700">Supported Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-amber-100 text-amber-700">Invoice Sync</Badge>
                      <Badge className="bg-amber-100 text-amber-700">Payment Updates</Badge>
                      <Badge className="bg-amber-100 text-amber-700">Ledger Creation</Badge>
                      <Badge className="bg-amber-100 text-amber-700">GST Reports</Badge>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleDirectConnect(selectedIntegration)}
                    disabled={connecting || !connectionConfig.tallyHost || !connectionConfig.companyName}
                  >
                    {connecting ? 'Connecting...' : 'Connect Tally'} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* For other integrations without direct connect */}
              {!['automation', 'developer'].includes(selectedIntegration.category) && 
               !selectedIntegration.hasDirectConnect && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border">
                    <h4 className="font-semibold mb-2">How to Connect</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedIntegration.name} can be connected via automation platforms like Zapier or Pabbly.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => {
                        setSelectedIntegration(INTEGRATIONS.find(i => i.id === 'zapier'))
                      }}>
                        <span className="mr-2">⚡</span> Use Zapier
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => {
                        setSelectedIntegration(INTEGRATIONS.find(i => i.id === 'pabbly'))
                      }}>
                        <span className="mr-2">🔗</span> Use Pabbly
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>Close</Button>
                {selectedIntegration.setupUrl && (
                  <Button asChild>
                    <a href={selectedIntegration.setupUrl} target="_blank" rel="noopener noreferrer">
                      Open {selectedIntegration.name} <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
