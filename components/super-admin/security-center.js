'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Shield, Lock, Key, AlertTriangle, Eye, EyeOff, Users, Clock,
  Globe, Activity, FileText, Download, Search, Filter, RefreshCw,
  CheckCircle2, XCircle, UserX, LogIn, LogOut, Settings, Trash2,
  ShieldCheck, ShieldAlert, ShieldOff, Fingerprint, Smartphone
} from 'lucide-react'
import { toast } from 'sonner'

const SecurityStat = ({ title, value, icon: Icon, color, trend }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{title}</p>
        </div>
        {trend && (
          <Badge variant="outline" className="ml-auto text-xs">
            {trend}
          </Badge>
        )}
      </div>
    </CardContent>
  </Card>
)

const AuditLogItem = ({ log }) => {
  const actionStyles = {
    login: 'bg-emerald-100 text-emerald-700',
    logout: 'bg-slate-100 text-slate-700',
    create: 'bg-blue-100 text-blue-700',
    update: 'bg-amber-100 text-amber-700',
    delete: 'bg-red-100 text-red-700',
    security: 'bg-purple-100 text-purple-700'
  }

  const actionIcons = {
    login: LogIn,
    logout: LogOut,
    create: CheckCircle2,
    update: Settings,
    delete: Trash2,
    security: Shield
  }

  const Icon = actionIcons[log.action] || Activity

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b last:border-0"
    >
      <div className={`p-2 rounded-lg ${actionStyles[log.action] || 'bg-slate-100 text-slate-700'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{log.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500">{log.user}</span>
          <span className="text-xs text-slate-300">•</span>
          <span className="text-xs text-slate-500">{log.ip}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">{log.time}</p>
        <Badge variant="outline" className="text-xs mt-1">{log.action}</Badge>
      </div>
    </motion.div>
  )
}

const SecuritySettingCard = ({ title, description, enabled, onToggle, icon: Icon }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{title}</h4>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </CardContent>
  </Card>
)

export function SecurityCenter() {
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, action: 'login', description: 'User logged in successfully', user: 'admin@buildcrm.com', ip: '192.168.1.1', time: '2 min ago' },
    { id: 2, action: 'update', description: 'Updated client subscription', user: 'admin@buildcrm.com', ip: '192.168.1.1', time: '15 min ago' },
    { id: 3, action: 'create', description: 'New client registered: ABC Interiors', user: 'System', ip: 'N/A', time: '1 hour ago' },
    { id: 4, action: 'security', description: 'Password changed for user', user: 'john@client.com', ip: '10.0.0.45', time: '2 hours ago' },
    { id: 5, action: 'delete', description: 'Deleted inactive user account', user: 'admin@buildcrm.com', ip: '192.168.1.1', time: '3 hours ago' },
    { id: 6, action: 'login', description: 'Failed login attempt (3rd)', user: 'unknown@test.com', ip: '45.33.21.8', time: '5 hours ago' },
    { id: 7, action: 'logout', description: 'User session expired', user: 'client@xyz.com', ip: '172.16.0.12', time: '6 hours ago' },
  ])

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: true,
    sessionTimeout: true,
    ipWhitelist: false,
    passwordPolicy: true,
    loginNotifications: true,
    auditLogging: true,
    dataEncryption: true,
    apiRateLimit: true
  })

  const [filterAction, setFilterAction] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSetting = (key) => {
    setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success('Security setting updated')
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction
    const matchesSearch = log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesAction && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Security Center</h2>
          <p className="text-slate-500">Monitor and manage platform security</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export Logs
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SecurityStat title="Active Sessions" value="847" icon={Users} color="bg-blue-500" trend="+12%" />
        <SecurityStat title="Failed Logins (24h)" value="23" icon={ShieldAlert} color="bg-red-500" trend="-8%" />
        <SecurityStat title="2FA Enabled" value="94%" icon={Smartphone} color="bg-emerald-500" trend="+5%" />
        <SecurityStat title="Security Score" value="A+" icon={ShieldCheck} color="bg-purple-500" />
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Threats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-6 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>{filteredLogs.length} log entries</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLogs.map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <SecuritySettingCard
              title="Two-Factor Authentication"
              description="Require 2FA for all admin accounts"
              icon={Smartphone}
              enabled={securitySettings.twoFactorRequired}
              onToggle={() => toggleSetting('twoFactorRequired')}
            />
            <SecuritySettingCard
              title="Session Timeout"
              description="Auto-logout after 30 minutes of inactivity"
              icon={Clock}
              enabled={securitySettings.sessionTimeout}
              onToggle={() => toggleSetting('sessionTimeout')}
            />
            <SecuritySettingCard
              title="IP Whitelist"
              description="Restrict access to specific IP addresses"
              icon={Globe}
              enabled={securitySettings.ipWhitelist}
              onToggle={() => toggleSetting('ipWhitelist')}
            />
            <SecuritySettingCard
              title="Strong Password Policy"
              description="Enforce minimum 12 characters with complexity"
              icon={Key}
              enabled={securitySettings.passwordPolicy}
              onToggle={() => toggleSetting('passwordPolicy')}
            />
            <SecuritySettingCard
              title="Login Notifications"
              description="Email alerts for new device logins"
              icon={LogIn}
              enabled={securitySettings.loginNotifications}
              onToggle={() => toggleSetting('loginNotifications')}
            />
            <SecuritySettingCard
              title="Audit Logging"
              description="Record all administrative actions"
              icon={FileText}
              enabled={securitySettings.auditLogging}
              onToggle={() => toggleSetting('auditLogging')}
            />
            <SecuritySettingCard
              title="Data Encryption"
              description="Encrypt all sensitive data at rest"
              icon={Lock}
              enabled={securitySettings.dataEncryption}
              onToggle={() => toggleSetting('dataEncryption')}
            />
            <SecuritySettingCard
              title="API Rate Limiting"
              description="Prevent abuse with rate limits"
              icon={Activity}
              enabled={securitySettings.apiRateLimit}
              onToggle={() => toggleSetting('apiRateLimit')}
            />
          </div>
        </TabsContent>

        <TabsContent value="threats" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                No Active Threats
              </CardTitle>
              <CardDescription>Your platform is secure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">All Systems Secure</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  No suspicious activities or security threats have been detected in the last 24 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SecurityCenter