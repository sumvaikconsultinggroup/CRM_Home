'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import {
  Palette, Image, Globe, Mail, Shield, Settings2, Eye, Save, RefreshCw,
  Upload, Link2, Smartphone, Monitor, Moon, Sun, Sparkles, Check, X,
  Building2, FileText, Bell, Layout, Type, Paintbrush, Download, Copy,
  Loader2, AlertCircle, CheckCircle2, ExternalLink, Code, Layers, Brush,
  Zap, Lock, Unlock, Crown, Star, Heart, ChevronRight, ChevronDown,
  RotateCcw, Wand2, Droplets, SquareStack, Frame, PanelTop, PanelLeft,
  MessageSquare, Send, Users, Calendar, FileUp, ImagePlus, Trash2, Plus,
  Languages, MapPin, Phone, Clock, Facebook, Twitter, Instagram, Linkedin,
  Youtube, GripVertical, Move, ArrowRight, Target, TrendingUp
} from 'lucide-react'

// ==================== CONSTANTS ====================
const PRESET_THEMES = [
  { id: 'modern-blue', name: 'Modern Blue', primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' },
  { id: 'emerald-fresh', name: 'Emerald Fresh', primary: '#10B981', secondary: '#059669', accent: '#34D399' },
  { id: 'royal-purple', name: 'Royal Purple', primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
  { id: 'sunset-orange', name: 'Sunset Orange', primary: '#F97316', secondary: '#EA580C', accent: '#FB923C' },
  { id: 'crimson-red', name: 'Crimson Red', primary: '#EF4444', secondary: '#DC2626', accent: '#F87171' },
  { id: 'teal-modern', name: 'Teal Modern', primary: '#14B8A6', secondary: '#0D9488', accent: '#2DD4BF' },
  { id: 'slate-pro', name: 'Slate Professional', primary: '#475569', secondary: '#334155', accent: '#64748B' },
  { id: 'pink-vibrant', name: 'Pink Vibrant', primary: '#EC4899', secondary: '#DB2777', accent: '#F472B6' }
]

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif" },
  { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif" },
  { id: 'open-sans', name: 'Open Sans', family: "'Open Sans', sans-serif" },
  { id: 'lato', name: 'Lato', family: "'Lato', sans-serif" },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'nunito', name: 'Nunito', family: "'Nunito', sans-serif" },
  { id: 'raleway', name: 'Raleway', family: "'Raleway', sans-serif" }
]

const SIDEBAR_STYLES = [
  { id: 'dark', name: 'Dark Gradient', preview: 'bg-gradient-to-b from-slate-900 to-slate-800' },
  { id: 'light', name: 'Light Clean', preview: 'bg-white border-r' },
  { id: 'primary', name: 'Brand Primary', preview: 'bg-gradient-to-b from-primary to-primary/90' },
  { id: 'glass', name: 'Glass Effect', preview: 'bg-white/50 backdrop-blur-xl border-r' }
]

const BUTTON_STYLES = [
  { id: 'rounded-full', name: 'Pill', className: 'rounded-full' },
  { id: 'rounded-lg', name: 'Rounded', className: 'rounded-lg' },
  { id: 'rounded-md', name: 'Subtle', className: 'rounded-md' },
  { id: 'rounded-none', name: 'Sharp', className: 'rounded-none' }
]

const CARD_STYLES = [
  { id: 'shadow', name: 'Shadow', className: 'shadow-lg' },
  { id: 'border', name: 'Bordered', className: 'border-2' },
  { id: 'glass', name: 'Glass', className: 'bg-white/50 backdrop-blur-lg' },
  { id: 'flat', name: 'Flat', className: 'bg-slate-50' }
]

// ==================== UTILITY FUNCTIONS ====================
const hexToHSL = (hex) => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// ==================== SUB COMPONENTS ====================

// Color Picker with Preview
const ColorPicker = ({ label, value, onChange, description }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <div 
          className="h-6 w-6 rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: value }}
        />
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 p-0 border-0 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 h-8 text-xs font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
    {description && <p className="text-xs text-slate-500">{description}</p>}
  </div>
)

// Live Preview Card
const LivePreview = ({ settings }) => (
  <Card className="overflow-hidden">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <Eye className="h-4 w-4" /> Live Preview
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <div className="border rounded-lg overflow-hidden mx-4 mb-4" style={{ height: '300px' }}>
        {/* Mini Browser Frame */}
        <div className="h-8 bg-slate-100 flex items-center gap-2 px-3 border-b">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-5 bg-white rounded-md flex items-center px-2 text-xs text-slate-400">
              {settings.customDomain || 'your-domain.com'}
            </div>
          </div>
        </div>
        
        {/* Preview Content */}
        <div className="flex h-[calc(100%-32px)]">
          {/* Mini Sidebar */}
          <div 
            className="w-16"
            style={{ 
              background: settings.sidebarStyle === 'primary' 
                ? `linear-gradient(to bottom, ${settings.primaryColor}, ${settings.secondaryColor})` 
                : settings.sidebarStyle === 'light' ? '#ffffff' : 'linear-gradient(to bottom, #1e293b, #0f172a)'
            }}
          >
            <div className="p-2 flex flex-col items-center gap-2">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="h-8 w-8 object-contain" />
              ) : (
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {(settings.companyName || 'C').charAt(0)}
                </div>
              )}
              {[1, 2, 3, 4].map(i => (
                <div 
                  key={i} 
                  className="h-6 w-6 rounded-lg"
                  style={{ backgroundColor: i === 1 ? settings.primaryColor : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 bg-slate-50 p-3">
            <div className="h-6 w-32 rounded" style={{ backgroundColor: settings.primaryColor + '20' }} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-white shadow-sm p-2">
                  <div className="h-2 w-8 rounded" style={{ backgroundColor: settings.primaryColor }} />
                  <div className="h-6 w-12 mt-2 text-xs font-bold" style={{ color: settings.primaryColor }}>
                    {i * 1234}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 h-20 bg-white rounded-lg shadow-sm" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Feature Toggle Card
const FeatureToggle = ({ icon: Icon, title, description, enabled, onChange, badge }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
      enabled ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
        enabled ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{title}</h4>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} />
  </motion.div>
)

// Section Header
const SectionHeader = ({ icon: Icon, title, description, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {action}
  </div>
)

// ==================== MAIN COMPONENT ====================
export function EnterpriseWhiteLabel({ authToken, client, onSettingsChange }) {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('branding')
  const [hasChanges, setHasChanges] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  
  // Settings State
  const [settings, setSettings] = useState({
    // Basic Branding
    enabled: false,
    companyName: '',
    tagline: '',
    logo: '',
    logoDark: '',
    favicon: '',
    appleTouchIcon: '',
    
    // Colors
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#10B981',
    successColor: '#22C55E',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    
    // Typography
    headingFont: 'inter',
    bodyFont: 'inter',
    fontSize: 'medium', // small, medium, large
    
    // Layout & Style
    sidebarStyle: 'dark',
    buttonStyle: 'rounded-lg',
    cardStyle: 'shadow',
    borderRadius: 'medium', // small, medium, large
    
    // Dark Mode
    darkModeEnabled: true,
    darkModeDefault: false,
    
    // Custom Domain
    customDomain: '',
    sslEnabled: true,
    
    // Login Page
    loginBackgroundImage: '',
    loginBackgroundColor: '#f8fafc',
    loginWelcomeText: 'Welcome Back',
    loginTagline: 'Sign in to continue',
    loginShowLogo: true,
    loginShowSocialLinks: false,
    
    // Email Branding
    emailBrandingEnabled: false,
    emailHeaderLogo: '',
    emailHeaderBgColor: '#3B82F6',
    emailFooterText: '',
    emailSignature: '',
    emailFromName: '',
    emailReplyTo: '',
    
    // PDF & Documents
    pdfBrandingEnabled: false,
    pdfLogo: '',
    pdfHeaderColor: '#3B82F6',
    pdfFooterText: '',
    pdfShowWatermark: false,
    
    // SMS & Notifications
    smsBrandingEnabled: false,
    smsPrefix: '',
    pushNotificationIcon: '',
    
    // Social Links
    socialLinks: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      youtube: ''
    },
    
    // Footer & Legal
    footerText: '',
    copyrightText: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
    
    // Advanced
    customCSS: '',
    customJS: '',
    customMetaTags: '',
    googleAnalyticsId: '',
    facebookPixelId: '',
    intercomAppId: '',
    
    // Feature Toggles
    hideBuiltByBadge: false,
    customLoadingScreen: false,
    customErrorPages: false,
    customEmptyStates: false,
    
    // Regional
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  })

  // Headers for API calls
  const headers = useMemo(() => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }), [authToken])

  // ==================== DATA FETCHING ====================
  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whitelabel', { headers })
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setSettings(prev => ({ ...prev, ...data }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch white label settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // ==================== HANDLERS ====================
  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/whitelabel', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        toast.success('White label settings saved successfully!')
        setHasChanges(false)
        
        // Apply theme changes instantly
        applyTheme(settings)
        
        // Notify parent component
        onSettingsChange?.(settings)
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const applyTheme = (s) => {
    if (s.primaryColor) {
      document.documentElement.style.setProperty('--primary', hexToHSL(s.primaryColor))
    }
    if (s.secondaryColor) {
      document.documentElement.style.setProperty('--secondary', hexToHSL(s.secondaryColor))
    }
  }

  const handleReset = () => {
    setSettings({
      ...settings,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      accentColor: '#10B981',
      sidebarStyle: 'dark',
      buttonStyle: 'rounded-lg',
      cardStyle: 'shadow'
    })
    setHasChanges(true)
    setShowResetDialog(false)
    toast.success('Settings reset to defaults')
  }

  const applyPresetTheme = (theme) => {
    updateSettings({
      primaryColor: theme.primary,
      secondaryColor: theme.secondary,
      accentColor: theme.accent
    })
    toast.success(`Applied "${theme.name}" theme`)
  }

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return

    // For demo, convert to base64 (in production, upload to cloud storage)
    const reader = new FileReader()
    reader.onloadend = () => {
      updateSettings({ [field]: reader.result })
      toast.success('Image uploaded successfully')
    }
    reader.readAsDataURL(file)
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="h-5 w-5 text-white" />
            </div>
            Enterprise White Label
          </h2>
          <p className="text-slate-500 mt-1">Customize every aspect of your platform branding</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Settings */}
        <div className="col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="branding" className="text-xs">
                <Image className="h-4 w-4 mr-1" /> Branding
              </TabsTrigger>
              <TabsTrigger value="colors" className="text-xs">
                <Palette className="h-4 w-4 mr-1" /> Colors
              </TabsTrigger>
              <TabsTrigger value="layout" className="text-xs">
                <Layout className="h-4 w-4 mr-1" /> Layout
              </TabsTrigger>
              <TabsTrigger value="login" className="text-xs">
                <Shield className="h-4 w-4 mr-1" /> Login
              </TabsTrigger>
              <TabsTrigger value="emails" className="text-xs">
                <Mail className="h-4 w-4 mr-1" /> Emails
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">
                <Code className="h-4 w-4 mr-1" /> Advanced
              </TabsTrigger>
            </TabsList>

            {/* BRANDING TAB */}
            <TabsContent value="branding" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={settings.companyName}
                        onChange={(e) => updateSettings({ companyName: e.target.value })}
                        placeholder="Your Company Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input
                        value={settings.tagline}
                        onChange={(e) => updateSettings({ tagline: e.target.value })}
                        placeholder="Your company tagline"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Custom Domain</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.customDomain}
                        onChange={(e) => updateSettings({ customDomain: e.target.value })}
                        placeholder="app.yourcompany.com"
                        className="flex-1"
                      />
                      <Button variant="outline">
                        <Globe className="h-4 w-4 mr-2" /> Verify DNS
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" /> Logo & Icons
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Main Logo */}
                    <div className="space-y-3">
                      <Label>Main Logo (Light Background)</Label>
                      <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-colors">
                        {settings.logo ? (
                          <div className="space-y-3">
                            <img src={settings.logo} alt="Logo" className="h-16 mx-auto object-contain" />
                            <Button variant="outline" size="sm" onClick={() => updateSettings({ logo: '' })}>
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Click to upload logo</p>
                            <p className="text-xs text-slate-400 mt-1">PNG, SVG (max 2MB)</p>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Dark Mode Logo */}
                    <div className="space-y-3">
                      <Label>Logo (Dark Background)</Label>
                      <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-colors bg-slate-900">
                        {settings.logoDark ? (
                          <div className="space-y-3">
                            <img src={settings.logoDark} alt="Logo Dark" className="h-16 mx-auto object-contain" />
                            <Button variant="outline" size="sm" onClick={() => updateSettings({ logoDark: '' })}>
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Upload className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Click to upload</p>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoDark')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-6">
                    {/* Favicon */}
                    <div className="space-y-3">
                      <Label>Favicon (32x32)</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center">
                          {settings.favicon ? (
                            <img src={settings.favicon} alt="Favicon" className="h-8 w-8 object-contain" />
                          ) : (
                            <Image className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Input
                            value={settings.favicon}
                            onChange={(e) => updateSettings({ favicon: e.target.value })}
                            placeholder="URL or upload"
                          />
                          <label className="mt-2 inline-block">
                            <Button variant="outline" size="sm" type="button">
                              <Upload className="h-4 w-4 mr-2" /> Upload
                            </Button>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'favicon')} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Apple Touch Icon */}
                    <div className="space-y-3">
                      <Label>Apple Touch Icon (180x180)</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center">
                          {settings.appleTouchIcon ? (
                            <img src={settings.appleTouchIcon} alt="Apple Icon" className="h-12 w-12 rounded-xl object-contain" />
                          ) : (
                            <Smartphone className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Input
                            value={settings.appleTouchIcon}
                            onChange={(e) => updateSettings({ appleTouchIcon: e.target.value })}
                            placeholder="URL or upload"
                          />
                          <label className="mt-2 inline-block">
                            <Button variant="outline" size="sm" type="button">
                              <Upload className="h-4 w-4 mr-2" /> Upload
                            </Button>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'appleTouchIcon')} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" /> Social Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'facebook', icon: Facebook, label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                      { key: 'twitter', icon: Twitter, label: 'Twitter/X', placeholder: 'https://twitter.com/yourhandle' },
                      { key: 'instagram', icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/yourprofile' },
                      { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yours' },
                      { key: 'youtube', icon: Youtube, label: 'YouTube', placeholder: 'https://youtube.com/yourchannel' }
                    ].map(({ key, icon: Icon, label, placeholder }) => (
                      <div key={key} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {label}
                        </Label>
                        <Input
                          value={settings.socialLinks?.[key] || ''}
                          onChange={(e) => updateSettings({ 
                            socialLinks: { ...settings.socialLinks, [key]: e.target.value }
                          })}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COLORS TAB */}
            <TabsContent value="colors" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" /> Preset Themes
                  </CardTitle>
                  <CardDescription>Quick-apply professional color schemes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {PRESET_THEMES.map((theme) => (
                      <motion.button
                        key={theme.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => applyPresetTheme(theme)}
                        className={`p-3 rounded-xl border-2 transition-colors ${
                          settings.primaryColor === theme.primary 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                          <div className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.secondary }} />
                          <div className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.accent }} />
                        </div>
                        <p className="text-xs font-medium">{theme.name}</p>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5" /> Brand Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <ColorPicker
                      label="Primary Color"
                      value={settings.primaryColor}
                      onChange={(v) => updateSettings({ primaryColor: v })}
                      description="Main brand color for buttons, links, and accents"
                    />
                    <ColorPicker
                      label="Secondary Color"
                      value={settings.secondaryColor}
                      onChange={(v) => updateSettings({ secondaryColor: v })}
                      description="Supporting color for gradients and backgrounds"
                    />
                    <ColorPicker
                      label="Accent Color"
                      value={settings.accentColor}
                      onChange={(v) => updateSettings({ accentColor: v })}
                      description="Highlight color for special elements"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-6">
                    <ColorPicker
                      label="Success Color"
                      value={settings.successColor}
                      onChange={(v) => updateSettings({ successColor: v })}
                    />
                    <ColorPicker
                      label="Warning Color"
                      value={settings.warningColor}
                      onChange={(v) => updateSettings({ warningColor: v })}
                    />
                    <ColorPicker
                      label="Error Color"
                      value={settings.errorColor}
                      onChange={(v) => updateSettings({ errorColor: v })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" /> Typography
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Heading Font</Label>
                      <Select value={settings.headingFont} onValueChange={(v) => updateSettings({ headingFont: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map(font => (
                            <SelectItem key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                              {font.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Body Font</Label>
                      <Select value={settings.bodyFont} onValueChange={(v) => updateSettings({ bodyFont: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map(font => (
                            <SelectItem key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                              {font.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5" /> Dark Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FeatureToggle
                    icon={Moon}
                    title="Enable Dark Mode"
                    description="Allow users to switch to dark theme"
                    enabled={settings.darkModeEnabled}
                    onChange={(v) => updateSettings({ darkModeEnabled: v })}
                  />
                  {settings.darkModeEnabled && (
                    <FeatureToggle
                      icon={Sun}
                      title="Dark Mode by Default"
                      description="Start with dark mode for new users"
                      enabled={settings.darkModeDefault}
                      onChange={(v) => updateSettings({ darkModeDefault: v })}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* LAYOUT TAB */}
            <TabsContent value="layout" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PanelLeft className="h-5 w-5" /> Sidebar Style
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {SIDEBAR_STYLES.map((style) => (
                      <motion.button
                        key={style.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateSettings({ sidebarStyle: style.id })}
                        className={`p-3 rounded-xl border-2 transition-colors ${
                          settings.sidebarStyle === style.id 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`h-20 w-full rounded-lg ${style.preview}`} />
                        <p className="text-xs font-medium mt-2">{style.name}</p>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Frame className="h-5 w-5" /> Component Styles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Button Style</Label>
                    <div className="flex gap-3">
                      {BUTTON_STYLES.map((style) => (
                        <motion.button
                          key={style.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateSettings({ buttonStyle: style.id })}
                          className={`px-6 py-2 bg-primary text-white ${style.className} ${
                            settings.buttonStyle === style.id ? 'ring-2 ring-primary/50 ring-offset-2' : ''
                          }`}
                        >
                          {style.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-3 block">Card Style</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {CARD_STYLES.map((style) => (
                        <motion.button
                          key={style.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateSettings({ cardStyle: style.id })}
                          className={`p-4 rounded-xl ${style.className} border-2 ${
                            settings.cardStyle === style.id ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <div className="h-8 w-full bg-slate-200 rounded mb-2" />
                          <p className="text-xs font-medium">{style.name}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Login Page Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Welcome Text</Label>
                      <Input
                        value={settings.loginWelcomeText}
                        onChange={(e) => updateSettings({ loginWelcomeText: e.target.value })}
                        placeholder="Welcome Back"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input
                        value={settings.loginTagline}
                        onChange={(e) => updateSettings({ loginTagline: e.target.value })}
                        placeholder="Sign in to continue"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Background Image URL</Label>
                    <Input
                      value={settings.loginBackgroundImage}
                      onChange={(e) => updateSettings({ loginBackgroundImage: e.target.value })}
                      placeholder="https://example.com/background.jpg"
                    />
                  </div>

                  <ColorPicker
                    label="Background Color"
                    value={settings.loginBackgroundColor}
                    onChange={(v) => updateSettings({ loginBackgroundColor: v })}
                    description="Used when no background image is set"
                  />

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <h4 className="font-medium">Show Logo on Login Page</h4>
                      <p className="text-sm text-slate-500">Display your company logo</p>
                    </div>
                    <Switch
                      checked={settings.loginShowLogo}
                      onCheckedChange={(v) => updateSettings({ loginShowLogo: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EMAILS TAB */}
            <TabsContent value="emails" className="mt-6 space-y-6">
              <FeatureToggle
                icon={Mail}
                title="Email Branding"
                description="Customize transactional emails with your branding"
                enabled={settings.emailBrandingEnabled}
                onChange={(v) => updateSettings({ emailBrandingEnabled: v })}
                badge="Pro"
              />

              {settings.emailBrandingEnabled && (
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Name</Label>
                        <Input
                          value={settings.emailFromName}
                          onChange={(e) => updateSettings({ emailFromName: e.target.value })}
                          placeholder="Your Company"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reply-To Email</Label>
                        <Input
                          type="email"
                          value={settings.emailReplyTo}
                          onChange={(e) => updateSettings({ emailReplyTo: e.target.value })}
                          placeholder="support@yourcompany.com"
                        />
                      </div>
                    </div>

                    <ColorPicker
                      label="Email Header Background"
                      value={settings.emailHeaderBgColor}
                      onChange={(v) => updateSettings({ emailHeaderBgColor: v })}
                    />

                    <div className="space-y-2">
                      <Label>Email Footer Text</Label>
                      <Textarea
                        value={settings.emailFooterText}
                        onChange={(e) => updateSettings({ emailFooterText: e.target.value })}
                        placeholder="© 2024 Your Company. All rights reserved."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email Signature</Label>
                      <Textarea
                        value={settings.emailSignature}
                        onChange={(e) => updateSettings({ emailSignature: e.target.value })}
                        placeholder="Best regards,\nThe YourCompany Team"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <FeatureToggle
                icon={FileText}
                title="PDF Branding"
                description="Customize invoices and documents"
                enabled={settings.pdfBrandingEnabled}
                onChange={(v) => updateSettings({ pdfBrandingEnabled: v })}
                badge="Pro"
              />

              {settings.pdfBrandingEnabled && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <ColorPicker
                      label="PDF Header Color"
                      value={settings.pdfHeaderColor}
                      onChange={(v) => updateSettings({ pdfHeaderColor: v })}
                    />
                    <div className="space-y-2">
                      <Label>PDF Footer Text</Label>
                      <Input
                        value={settings.pdfFooterText}
                        onChange={(e) => updateSettings({ pdfFooterText: e.target.value })}
                        placeholder="Company registration info, address, etc."
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h4 className="font-medium">Show Watermark</h4>
                        <p className="text-sm text-slate-500">Add company watermark to PDFs</p>
                      </div>
                      <Switch
                        checked={settings.pdfShowWatermark}
                        onCheckedChange={(v) => updateSettings({ pdfShowWatermark: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ADVANCED TAB */}
            <TabsContent value="advanced" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" /> Custom Code
                  </CardTitle>
                  <CardDescription>Add custom CSS and JavaScript (use with caution)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Custom CSS</Label>
                    <Textarea
                      value={settings.customCSS}
                      onChange={(e) => updateSettings({ customCSS: e.target.value })}
                      placeholder="/* Your custom CSS here */"
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Meta Tags</Label>
                    <Textarea
                      value={settings.customMetaTags}
                      onChange={(e) => updateSettings({ customMetaTags: e.target.value })}
                      placeholder='<meta name="..." content="..." />'
                      rows={3}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" /> Analytics & Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Google Analytics ID</Label>
                    <Input
                      value={settings.googleAnalyticsId}
                      onChange={(e) => updateSettings({ googleAnalyticsId: e.target.value })}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook Pixel ID</Label>
                    <Input
                      value={settings.facebookPixelId}
                      onChange={(e) => updateSettings({ facebookPixelId: e.target.value })}
                      placeholder="XXXXXXXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intercom App ID</Label>
                    <Input
                      value={settings.intercomAppId}
                      onChange={(e) => updateSettings({ intercomAppId: e.target.value })}
                      placeholder="xxxxxxxx"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> Feature Toggles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FeatureToggle
                    icon={Crown}
                    title="Hide 'Built By' Badge"
                    description="Remove platform branding from footer"
                    enabled={settings.hideBuiltByBadge}
                    onChange={(v) => updateSettings({ hideBuiltByBadge: v })}
                    badge="Enterprise"
                  />
                  <FeatureToggle
                    icon={Loader2}
                    title="Custom Loading Screen"
                    description="Show your logo during page loads"
                    enabled={settings.customLoadingScreen}
                    onChange={(v) => updateSettings({ customLoadingScreen: v })}
                  />
                  <FeatureToggle
                    icon={AlertCircle}
                    title="Custom Error Pages"
                    description="Branded 404 and error pages"
                    enabled={settings.customErrorPages}
                    onChange={(v) => updateSettings({ customErrorPages: v })}
                  />
                  <FeatureToggle
                    icon={SquareStack}
                    title="Custom Empty States"
                    description="Branded empty state illustrations"
                    enabled={settings.customEmptyStates}
                    onChange={(v) => updateSettings({ customEmptyStates: v })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" /> Regional Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Language</Label>
                      <Select value={settings.defaultLanguage} onValueChange={(v) => updateSettings({ defaultLanguage: v })}>
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
                      <Label>Default Currency</Label>
                      <Select value={settings.defaultCurrency} onValueChange={(v) => updateSettings({ defaultCurrency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select value={settings.dateFormat} onValueChange={(v) => updateSettings({ dateFormat: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Format</Label>
                      <Select value={settings.timeFormat} onValueChange={(v) => updateSettings({ timeFormat: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Legal & Footer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Textarea
                      value={settings.footerText}
                      onChange={(e) => updateSettings({ footerText: e.target.value })}
                      placeholder="Additional footer content..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Copyright Text</Label>
                    <Input
                      value={settings.copyrightText}
                      onChange={(e) => updateSettings({ copyrightText: e.target.value })}
                      placeholder="© 2024 Your Company. All rights reserved."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Privacy Policy URL</Label>
                      <Input
                        value={settings.privacyPolicyUrl}
                        onChange={(e) => updateSettings({ privacyPolicyUrl: e.target.value })}
                        placeholder="https://yoursite.com/privacy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Terms of Service URL</Label>
                      <Input
                        value={settings.termsOfServiceUrl}
                        onChange={(e) => updateSettings({ termsOfServiceUrl: e.target.value })}
                        placeholder="https://yoursite.com/terms"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="col-span-4 space-y-6">
          <LivePreview settings={settings} />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">White Label Status</span>
                <Badge variant={settings.enabled ? 'default' : 'secondary'}>
                  {settings.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Custom Domain</span>
                <span className="font-medium">
                  {settings.customDomain || 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Email Branding</span>
                <Badge variant={settings.emailBrandingEnabled ? 'default' : 'secondary'}>
                  {settings.emailBrandingEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">PDF Branding</span>
                <Badge variant={settings.pdfBrandingEnabled ? 'default' : 'secondary'}>
                  {settings.pdfBrandingEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" /> Export Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" /> Import Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Copy className="h-4 w-4 mr-2" /> Copy to Another Client
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Defaults?</DialogTitle>
            <DialogDescription>
              This will reset all colors and styles to their default values. Your logos and company information will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset}>Reset Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseWhiteLabel
