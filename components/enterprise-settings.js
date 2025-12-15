'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Settings, User, Building2, Bell, Shield, CreditCard, Users, Mail, Globe,
  Key, Lock, Unlock, Eye, EyeOff, Save, RefreshCw, Download, Upload,
  Loader2, Check, X, AlertCircle, CheckCircle2, Info, ExternalLink,
  Smartphone, Monitor, Moon, Sun, Palette, Languages, Clock, Calendar,
  DollarSign, Receipt, FileText, Printer, Database, Server, Cloud,
  Plug, Zap, Webhook, Bot, Brain, Sparkles, Crown, Star, Heart,
  Phone, MessageSquare, Video, Headphones, HelpCircle, LifeBuoy,
  MapPin, Hash, AtSign, Link2, QrCode, Fingerprint, ShieldCheck,
  UserCheck, UserX, UserPlus, UserMinus, Users2, Building, Briefcase,
  FolderOpen, Archive, Trash2, RotateCcw, History, Activity, TrendingUp,
  BarChart3, PieChart, Target, Flag, Bookmark, Tag, Filter, Search,
  ChevronRight, ChevronDown, MoreHorizontal, Copy, Edit, Plus, Minus
} from 'lucide-react'

// ==================== CONSTANTS ====================
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney'
]

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY' }
]

const NOTIFICATION_CHANNELS = [
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'push', name: 'Push Notifications', icon: Bell },
  { id: 'sms', name: 'SMS', icon: Smartphone },
  { id: 'inApp', name: 'In-App', icon: MessageSquare }
]

const PLAN_FEATURES = {
  starter: {
    name: 'Starter',
    price: 29,
    features: ['5 Users', '1 GB Storage', 'Basic Reports', 'Email Support']
  },
  professional: {
    name: 'Professional',
    price: 79,
    features: ['25 Users', '10 GB Storage', 'Advanced Reports', 'Priority Support', 'API Access', 'White Label Basic']
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    features: ['Unlimited Users', '100 GB Storage', 'Custom Reports', '24/7 Support', 'Full API', 'Full White Label', 'Custom Integrations', 'Dedicated Manager']
  }
}

// ==================== COMPONENTS ====================

// Setting Item Component
const SettingItem = ({ icon: Icon, title, description, children, badge }) => (
  <div className="flex items-start justify-between py-4 border-b last:border-0">
    <div className="flex gap-4">
      {Icon && (
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{title}</h4>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
)

// Section Card
const SectionCard = ({ icon: Icon, title, description, children }) => (
  <Card>
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-3 text-lg">
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Icon className="h-4 w-4 text-white" />
          </div>
        )}
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
)

// Plan Card
const PlanCard = ({ plan, planId, isCurrentPlan, onSelect }) => {
  const planData = PLAN_FEATURES[planId]
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-6 rounded-2xl border-2 ${
        isCurrentPlan 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : 'border-slate-200 hover:border-primary/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{planData.name}</h3>
        {isCurrentPlan && <Badge>Current Plan</Badge>}
      </div>
      <div className="mb-4">
        <span className="text-3xl font-bold">${planData.price}</span>
        <span className="text-slate-500">/month</span>
      </div>
      <ul className="space-y-2 mb-6">
        {planData.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
      {!isCurrentPlan && (
        <Button className="w-full" onClick={() => onSelect(planId)}>
          {planId === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
        </Button>
      )}
    </motion.div>
  )
}

// API Key Row
const ApiKeyRow = ({ keyData, onRevoke, onCopy }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
    <div className="flex items-center gap-4">
      <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
        <Key className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <p className="font-medium">{keyData.name}</p>
        <p className="text-sm text-slate-500 font-mono">{keyData.prefix}...{keyData.suffix}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline">{keyData.scope}</Badge>
      <Button variant="ghost" size="icon" onClick={() => onCopy(keyData)}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => onRevoke(keyData.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
)

// Team Member Row
const TeamMemberRow = ({ member, onEdit, onRemove, onChangeRole }) => (
  <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
    <div className="flex items-center gap-4">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.avatar} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
          {(member.name || member.email || 'U').substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{member.name || 'Unnamed User'}</p>
        <p className="text-sm text-slate-500">{member.email}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Select value={member.role} onValueChange={(v) => onChangeRole(member.id, v)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
        {member.status}
      </Badge>
      <Button variant="ghost" size="icon" onClick={() => onRemove(member.id)}>
        <UserMinus className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  </div>
)

// ==================== MAIN COMPONENT ====================
export function EnterpriseSettings({ authToken, client, user, onClientUpdate }) {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [hasChanges, setHasChanges] = useState(false)
  
  // Profile Settings
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    jobTitle: '',
    department: '',
    bio: ''
  })
  
  // Company Settings
  const [company, setCompany] = useState({
    name: '',
    legalName: '',
    taxId: '',
    registrationNumber: '',
    industry: '',
    size: '',
    website: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    }
  })
  
  // Regional Settings
  const [regional, setRegional] = useState({
    timezone: 'UTC',
    language: 'en',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 'sunday',
    numberFormat: 'thousand-comma'
  })
  
  // Notification Settings
  const [notifications, setNotifications] = useState({
    email: {
      enabled: true,
      leads: true,
      projects: true,
      tasks: true,
      payments: true,
      reports: false,
      marketing: false
    },
    push: {
      enabled: true,
      mentions: true,
      reminders: true,
      updates: true
    },
    sms: {
      enabled: false,
      urgent: false
    },
    digest: {
      enabled: true,
      frequency: 'daily' // daily, weekly
    }
  })
  
  // Security Settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    twoFactorMethod: 'app', // app, sms, email
    sessionTimeout: 30, // minutes
    passwordExpiry: 90, // days
    ipWhitelist: [],
    loginNotifications: true,
    deviceManagement: true,
    auditLog: true
  })
  
  // API Settings
  const [apiSettings, setApiSettings] = useState({
    apiEnabled: false,
    webhooksEnabled: false,
    rateLimit: 1000,
    allowedOrigins: []
  })
  const [apiKeys, setApiKeys] = useState([])
  const [webhooks, setWebhooks] = useState([])
  
  // Team Settings
  const [teamMembers, setTeamMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  
  // Billing
  const [billing, setBilling] = useState({
    plan: 'starter',
    billingCycle: 'monthly',
    paymentMethod: null,
    invoiceEmail: '',
    taxExempt: false
  })
  
  // Data Settings
  const [dataSettings, setDataSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionPeriod: 90,
    exportFormat: 'csv'
  })
  
  // Dialog States
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showWebhookDialog, setShowWebhookDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  
  // Form States
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [apiKeyForm, setApiKeyForm] = useState({ name: '', scope: 'read' })
  const [webhookForm, setWebhookForm] = useState({ url: '', events: [] })
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })

  // Headers for API calls
  const headers = useMemo(() => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }), [authToken])

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        // Load profile from user
        if (user) {
          setProfile({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            avatar: user.avatar || '',
            jobTitle: user.jobTitle || '',
            department: user.department || '',
            bio: user.bio || ''
          })
        }
        
        // Load company from client
        if (client) {
          setCompany({
            name: client.name || '',
            legalName: client.legalName || '',
            taxId: client.taxId || '',
            registrationNumber: client.registrationNumber || '',
            industry: client.industry || '',
            size: client.size || '',
            website: client.website || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || {}
          })
          setBilling(prev => ({
            ...prev,
            plan: client.planId || 'starter'
          }))
        }
        
        // Load other settings from API
        const res = await fetch('/api/settings', { headers })
        if (res.ok) {
          const data = await res.json()
          if (data.regional) setRegional(prev => ({ ...prev, ...data.regional }))
          if (data.notifications) setNotifications(prev => ({ ...prev, ...data.notifications }))
          if (data.security) setSecurity(prev => ({ ...prev, ...data.security }))
          if (data.api) setApiSettings(prev => ({ ...prev, ...data.api }))
          if (data.apiKeys) setApiKeys(data.apiKeys)
          if (data.webhooks) setWebhooks(data.webhooks)
          if (data.data) setDataSettings(prev => ({ ...prev, ...data.data }))
        }
        
        // Load team members
        const teamRes = await fetch('/api/users', { headers })
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          setTeamMembers(Array.isArray(teamData) ? teamData : teamData.users || [])
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadSettings()
  }, [user, client])

  // ==================== HANDLERS ====================
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          regional,
          notifications,
          security,
          api: apiSettings,
          data: dataSettings
        })
      })
      
      if (res.ok) {
        toast.success('Settings saved successfully!')
        setHasChanges(false)
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(profile)
      })
      
      if (res.ok) {
        toast.success('Profile updated!')
      } else {
        toast.error('Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteUser = async () => {
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify(inviteForm)
      })
      
      if (res.ok) {
        toast.success(`Invitation sent to ${inviteForm.email}`)
        setShowInviteDialog(false)
        setInviteForm({ email: '', role: 'member' })
      } else {
        toast.error('Failed to send invitation')
      }
    } catch (error) {
      toast.error('Failed to send invitation')
    }
  }

  const handleCreateApiKey = async () => {
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify(apiKeyForm)
      })
      
      if (res.ok) {
        const data = await res.json()
        setApiKeys(prev => [...prev, data])
        toast.success('API key created! Make sure to copy it now.')
        setShowApiKeyDialog(false)
        setApiKeyForm({ name: '', scope: 'read' })
      }
    } catch (error) {
      toast.error('Failed to create API key')
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match')
      return
    }
    
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      })
      
      if (res.ok) {
        toast.success('Password changed successfully!')
        setShowPasswordDialog(false)
        setPasswordForm({ current: '', new: '', confirm: '' })
      } else {
        toast.error('Failed to change password. Check your current password.')
      }
    } catch (error) {
      toast.error('Failed to change password')
    }
  }

  const handleExportData = async () => {
    toast.success('Preparing data export...')
    // In production, trigger background export job
  }

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            Settings
          </h2>
          <p className="text-slate-500 mt-1">Manage your account, preferences, and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Navigation */}
        <div className="col-span-3">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'company', label: 'Company', icon: Building2 },
                  { id: 'team', label: 'Team Members', icon: Users },
                  { id: 'regional', label: 'Regional', icon: Globe },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'api', label: 'API & Webhooks', icon: Plug },
                  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
                  { id: 'data', label: 'Data & Export', icon: Database },
                  { id: 'integrations', label: 'Integrations', icon: Zap }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === item.id 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Right Content */}
        <div className="col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={User} title="Personal Information" description="Update your personal details">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profile.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-2xl">
                          {(profile.name || profile.email || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" /> Change
                      </Button>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={profile.name}
                          onChange={(e) => { setProfile({ ...profile, name: e.target.value }); setHasChanges(true); }}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={profile.email}
                          onChange={(e) => { setProfile({ ...profile, email: e.target.value }); setHasChanges(true); }}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => { setProfile({ ...profile, phone: e.target.value }); setHasChanges(true); }}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input
                          value={profile.jobTitle}
                          onChange={(e) => { setProfile({ ...profile, jobTitle: e.target.value }); setHasChanges(true); }}
                          placeholder="Project Manager"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => { setProfile({ ...profile, bio: e.target.value }); setHasChanges(true); }}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                </SectionCard>

                <SectionCard icon={Lock} title="Account Security">
                  <div className="space-y-4">
                    <SettingItem
                      icon={Key}
                      title="Password"
                      description="Last changed 30 days ago"
                    >
                      <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                        Change Password
                      </Button>
                    </SettingItem>
                    <SettingItem
                      icon={Smartphone}
                      title="Two-Factor Authentication"
                      description="Add an extra layer of security"
                      badge={security.twoFactorEnabled ? 'Enabled' : undefined}
                    >
                      <Switch
                        checked={security.twoFactorEnabled}
                        onCheckedChange={(v) => { 
                          if (v) setShow2FADialog(true)
                          else setSecurity({ ...security, twoFactorEnabled: false })
                        }}
                      />
                    </SettingItem>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* COMPANY TAB */}
            {activeTab === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Building2} title="Company Information">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={company.name}
                        onChange={(e) => { setCompany({ ...company, name: e.target.value }); setHasChanges(true); }}
                        placeholder="Acme Inc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Legal Name</Label>
                      <Input
                        value={company.legalName}
                        onChange={(e) => { setCompany({ ...company, legalName: e.target.value }); setHasChanges(true); }}
                        placeholder="Acme Industries Pvt. Ltd."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax ID / GST</Label>
                      <Input
                        value={company.taxId}
                        onChange={(e) => { setCompany({ ...company, taxId: e.target.value }); setHasChanges(true); }}
                        placeholder="GSTIN / Tax ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select value={company.industry} onValueChange={(v) => { setCompany({ ...company, industry: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="construction">Construction</SelectItem>
                          <SelectItem value="interior">Interior Design</SelectItem>
                          <SelectItem value="architecture">Architecture</SelectItem>
                          <SelectItem value="realestate">Real Estate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={company.website}
                        onChange={(e) => { setCompany({ ...company, website: e.target.value }); setHasChanges(true); }}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Email</Label>
                      <Input
                        type="email"
                        value={company.email}
                        onChange={(e) => { setCompany({ ...company, email: e.target.value }); setHasChanges(true); }}
                        placeholder="info@example.com"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={MapPin} title="Address">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        value={company.address?.street || ''}
                        onChange={(e) => { setCompany({ ...company, address: { ...company.address, street: e.target.value } }); setHasChanges(true); }}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={company.address?.city || ''}
                        onChange={(e) => { setCompany({ ...company, address: { ...company.address, city: e.target.value } }); setHasChanges(true); }}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State / Province</Label>
                      <Input
                        value={company.address?.state || ''}
                        onChange={(e) => { setCompany({ ...company, address: { ...company.address, state: e.target.value } }); setHasChanges(true); }}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={company.address?.country || ''}
                        onChange={(e) => { setCompany({ ...company, address: { ...company.address, country: e.target.value } }); setHasChanges(true); }}
                        placeholder="United States"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={company.address?.postalCode || ''}
                        onChange={(e) => { setCompany({ ...company, address: { ...company.address, postalCode: e.target.value } }); setHasChanges(true); }}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard 
                  icon={Users} 
                  title={`Team Members (${teamMembers.length})`}
                  description="Manage your team and permissions"
                >
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => setShowInviteDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" /> Invite Member
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <TeamMemberRow
                        key={member.id}
                        member={member}
                        onChangeRole={(id, role) => {
                          setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
                          toast.success('Role updated')
                        }}
                        onRemove={(id) => {
                          setTeamMembers(prev => prev.filter(m => m.id !== id))
                          toast.success('Member removed')
                        }}
                      />
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No team members yet</p>
                        <Button variant="link" onClick={() => setShowInviteDialog(true)}>
                          Invite your first member
                        </Button>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* REGIONAL TAB */}
            {activeTab === 'regional' && (
              <motion.div
                key="regional"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Globe} title="Regional Settings">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select value={regional.timezone} onValueChange={(v) => { setRegional({ ...regional, timezone: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={regional.language} onValueChange={(v) => { setRegional({ ...regional, language: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={regional.currency} onValueChange={(v) => { setRegional({ ...regional, currency: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select value={regional.dateFormat} onValueChange={(v) => { setRegional({ ...regional, dateFormat: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DATE_FORMATS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Format</Label>
                      <Select value={regional.timeFormat} onValueChange={(v) => { setRegional({ ...regional, timeFormat: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>First Day of Week</Label>
                      <Select value={regional.firstDayOfWeek} onValueChange={(v) => { setRegional({ ...regional, firstDayOfWeek: v }); setHasChanges(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sunday">Sunday</SelectItem>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Mail} title="Email Notifications">
                  <SettingItem icon={Mail} title="Email Notifications" description="Receive updates via email">
                    <Switch
                      checked={notifications.email.enabled}
                      onCheckedChange={(v) => { setNotifications({ ...notifications, email: { ...notifications.email, enabled: v } }); setHasChanges(true); }}
                    />
                  </SettingItem>
                  {notifications.email.enabled && (
                    <div className="ml-14 mt-4 space-y-3">
                      {[
                        { key: 'leads', label: 'New leads' },
                        { key: 'projects', label: 'Project updates' },
                        { key: 'tasks', label: 'Task assignments' },
                        { key: 'payments', label: 'Payment notifications' },
                        { key: 'reports', label: 'Weekly reports' },
                        { key: 'marketing', label: 'Marketing emails' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Switch
                            checked={notifications.email[item.key]}
                            onCheckedChange={(v) => { 
                              setNotifications({ 
                                ...notifications, 
                                email: { ...notifications.email, [item.key]: v } 
                              }); 
                              setHasChanges(true); 
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={Bell} title="Push Notifications">
                  <SettingItem icon={Bell} title="Push Notifications" description="Browser and mobile notifications">
                    <Switch
                      checked={notifications.push.enabled}
                      onCheckedChange={(v) => { setNotifications({ ...notifications, push: { ...notifications.push, enabled: v } }); setHasChanges(true); }}
                    />
                  </SettingItem>
                  {notifications.push.enabled && (
                    <div className="ml-14 mt-4 space-y-3">
                      {[
                        { key: 'mentions', label: 'When mentioned' },
                        { key: 'reminders', label: 'Task reminders' },
                        { key: 'updates', label: 'Important updates' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Switch
                            checked={notifications.push[item.key]}
                            onCheckedChange={(v) => { 
                              setNotifications({ 
                                ...notifications, 
                                push: { ...notifications.push, [item.key]: v } 
                              }); 
                              setHasChanges(true); 
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={FileText} title="Digest Settings">
                  <SettingItem icon={FileText} title="Email Digest" description="Get a summary of activity">
                    <Switch
                      checked={notifications.digest.enabled}
                      onCheckedChange={(v) => { setNotifications({ ...notifications, digest: { ...notifications.digest, enabled: v } }); setHasChanges(true); }}
                    />
                  </SettingItem>
                  {notifications.digest.enabled && (
                    <div className="ml-14 mt-4">
                      <Label className="mb-2 block">Frequency</Label>
                      <Select 
                        value={notifications.digest.frequency} 
                        onValueChange={(v) => { 
                          setNotifications({ 
                            ...notifications, 
                            digest: { ...notifications.digest, frequency: v } 
                          }); 
                          setHasChanges(true); 
                        }}
                      >
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Shield} title="Security Settings">
                  <div className="space-y-4">
                    <SettingItem icon={Clock} title="Session Timeout" description="Automatically log out after inactivity">
                      <Select 
                        value={String(security.sessionTimeout)} 
                        onValueChange={(v) => { setSecurity({ ...security, sessionTimeout: parseInt(v) }); setHasChanges(true); }}
                      >
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="480">8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingItem>
                    <SettingItem icon={Bell} title="Login Notifications" description="Get notified of new sign-ins">
                      <Switch
                        checked={security.loginNotifications}
                        onCheckedChange={(v) => { setSecurity({ ...security, loginNotifications: v }); setHasChanges(true); }}
                      />
                    </SettingItem>
                    <SettingItem icon={Activity} title="Audit Log" description="Keep track of all account activity" badge="Enterprise">
                      <Switch
                        checked={security.auditLog}
                        onCheckedChange={(v) => { setSecurity({ ...security, auditLog: v }); setHasChanges(true); }}
                      />
                    </SettingItem>
                  </div>
                </SectionCard>

                <SectionCard icon={AlertCircle} title="Danger Zone">
                  <div className="p-4 border-2 border-red-200 rounded-xl bg-red-50">
                    <h4 className="font-semibold text-red-700 mb-2">Delete Account</h4>
                    <p className="text-sm text-red-600 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="destructive" onClick={() => setShowDeleteAccountDialog(true)}>
                      Delete Account
                    </Button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* API TAB */}
            {activeTab === 'api' && (
              <motion.div
                key="api"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Key} title="API Keys" description="Manage your API access tokens">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={apiSettings.apiEnabled}
                        onCheckedChange={(v) => { setApiSettings({ ...apiSettings, apiEnabled: v }); setHasChanges(true); }}
                      />
                      <span className="text-sm">Enable API Access</span>
                    </div>
                    <Button onClick={() => setShowApiKeyDialog(true)} disabled={!apiSettings.apiEnabled}>
                      <Plus className="h-4 w-4 mr-2" /> Create API Key
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <ApiKeyRow
                        key={key.id}
                        keyData={key}
                        onCopy={() => {
                          navigator.clipboard.writeText(key.key)
                          toast.success('API key copied')
                        }}
                        onRevoke={(id) => {
                          setApiKeys(prev => prev.filter(k => k.id !== id))
                          toast.success('API key revoked')
                        }}
                      />
                    ))}
                    {apiKeys.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Key className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No API keys yet</p>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard icon={Webhook} title="Webhooks" description="Get notified when events happen">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={apiSettings.webhooksEnabled}
                        onCheckedChange={(v) => { setApiSettings({ ...apiSettings, webhooksEnabled: v }); setHasChanges(true); }}
                      />
                      <span className="text-sm">Enable Webhooks</span>
                    </div>
                    <Button onClick={() => setShowWebhookDialog(true)} disabled={!apiSettings.webhooksEnabled}>
                      <Plus className="h-4 w-4 mr-2" /> Add Webhook
                    </Button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Crown} title="Current Plan">
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(PLAN_FEATURES).map(([planId, plan]) => (
                      <PlanCard
                        key={planId}
                        planId={planId}
                        plan={plan}
                        isCurrentPlan={billing.plan === planId}
                        onSelect={(id) => toast.info(`Contact sales to upgrade to ${PLAN_FEATURES[id].name}`)}
                      />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard icon={CreditCard} title="Payment Method">
                  <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-slate-500">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline">Update</Button>
                  </div>
                </SectionCard>

                <SectionCard icon={Receipt} title="Billing History">
                  <div className="text-center py-8 text-slate-500">
                    <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No invoices yet</p>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
              <motion.div
                key="data"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Database} title="Data Management">
                  <div className="space-y-4">
                    <SettingItem icon={Cloud} title="Automatic Backups" description="Regularly backup your data">
                      <Switch
                        checked={dataSettings.autoBackup}
                        onCheckedChange={(v) => { setDataSettings({ ...dataSettings, autoBackup: v }); setHasChanges(true); }}
                      />
                    </SettingItem>
                    {dataSettings.autoBackup && (
                      <div className="ml-14">
                        <Label className="mb-2 block">Backup Frequency</Label>
                        <Select 
                          value={dataSettings.backupFrequency} 
                          onValueChange={(v) => { setDataSettings({ ...dataSettings, backupFrequency: v }); setHasChanges(true); }}
                        >
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard icon={Download} title="Export Data">
                  <p className="text-sm text-slate-500 mb-4">
                    Download all your data in your preferred format
                  </p>
                  <div className="flex gap-4">
                    <Select 
                      value={dataSettings.exportFormat} 
                      onValueChange={(v) => setDataSettings({ ...dataSettings, exportFormat: v })}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleExportData}>
                      <Download className="h-4 w-4 mr-2" /> Export All Data
                    </Button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SectionCard icon={Zap} title="Connected Apps" description="Manage your integrations">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Google Calendar', icon: Calendar, connected: true },
                      { name: 'Slack', icon: MessageSquare, connected: false },
                      { name: 'Zapier', icon: Zap, connected: false },
                      { name: 'QuickBooks', icon: DollarSign, connected: false },
                      { name: 'Mailchimp', icon: Mail, connected: false },
                      { name: 'Trello', icon: Briefcase, connected: false }
                    ].map((app) => (
                      <div key={app.name} className="flex items-center justify-between p-4 border rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <app.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <Badge variant={app.connected ? 'default' : 'secondary'}>
                              {app.connected ? 'Connected' : 'Not connected'}
                            </Badge>
                          </div>
                        </div>
                        <Button variant={app.connected ? 'outline' : 'default'} size="sm">
                          {app.connected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DIALOGS */}
      
      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="colleague@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInviteUser}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Generate a new API key for external access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                value={apiKeyForm.name}
                onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
                placeholder="My App Integration"
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={apiKeyForm.scope} onValueChange={(v) => setApiKeyForm({ ...apiKeyForm, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read Only</SelectItem>
                  <SelectItem value="write">Read & Write</SelectItem>
                  <SelectItem value="full">Full Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateApiKey}>Create Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseSettings
