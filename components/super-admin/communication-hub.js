'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell, Send, Plus, Edit, Trash2, Calendar, Users, Globe,
  Mail, MessageSquare, Megaphone, Clock, CheckCircle2, XCircle,
  Eye, RefreshCw, Filter, Search, AlertTriangle, Sparkles,
  Zap, Target, ChevronRight, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

const AnnouncementCard = ({ announcement, onEdit, onDelete, onToggle }) => {
  const typeStyles = {
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    urgent: 'bg-red-100 text-red-700 border-red-200'
  }

  const typeIcons = {
    info: Bell,
    warning: AlertTriangle,
    success: CheckCircle2,
    urgent: Megaphone
  }

  const Icon = typeIcons[announcement.type] || Bell

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Card className="border border-slate-200 hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${typeStyles[announcement.type]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{announcement.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{announcement.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={announcement.active}
                onCheckedChange={() => onToggle?.(announcement)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Badge className={typeStyles[announcement.type]}>
              {announcement.type}
            </Badge>
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {announcement.audience || 'All'}
            </Badge>
            {announcement.active && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {announcement.scheduledAt ? `Scheduled: ${new Date(announcement.scheduledAt).toLocaleDateString()}` : 'Immediate'}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit?.(announcement)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete?.(announcement)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const EmailTemplateCard = ({ template, onEdit, onPreview }) => (
  <motion.div whileHover={{ y: -2 }}>
    <Card className="border border-slate-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => onEdit?.(template)}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Mail className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{template.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{template.subject}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline">{template.category}</Badge>
              <span className="text-xs text-slate-400">Last edited: {template.updatedAt}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onPreview?.(template); }}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

export function CommunicationHub() {
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'New Feature: AI Assistant', message: 'We have launched MEE AI assistant to help you manage your business better.', type: 'info', audience: 'All', active: true },
    { id: 2, title: 'Scheduled Maintenance', message: 'System will be under maintenance on Sunday 2 AM - 4 AM IST.', type: 'warning', audience: 'All', active: true, scheduledAt: '2025-12-15T02:00:00' },
    { id: 3, title: 'Holiday Discount!', message: 'Get 20% off on annual plans. Use code HOLIDAY20.', type: 'success', audience: 'Trial', active: false },
  ])
  const [templates, setTemplates] = useState([
    { id: 1, name: 'Welcome Email', subject: 'Welcome to BuildCRM!', category: 'Onboarding', updatedAt: '2 days ago' },
    { id: 2, name: 'Payment Receipt', subject: 'Payment Confirmation - Invoice #{invoice_id}', category: 'Billing', updatedAt: '1 week ago' },
    { id: 3, name: 'Password Reset', subject: 'Reset Your Password', category: 'Security', updatedAt: '3 weeks ago' },
    { id: 4, name: 'Trial Ending', subject: 'Your trial ends in {days} days', category: 'Retention', updatedAt: '5 days ago' },
  ])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    audience: 'all',
    active: true
  })

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null)
    setFormData({ title: '', message: '', type: 'info', audience: 'all', active: true })
    setIsDialogOpen(true)
  }

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement)
    setFormData(announcement)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (editingAnnouncement) {
      setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? { ...a, ...formData } : a))
      toast.success('Announcement updated')
    } else {
      setAnnouncements(prev => [...prev, { ...formData, id: Date.now() }])
      toast.success('Announcement created')
    }
    setIsDialogOpen(false)
  }

  const handleDelete = (announcement) => {
    if (confirm('Delete this announcement?')) {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id))
      toast.success('Announcement deleted')
    }
  }

  const handleToggle = (announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, active: !a.active } : a))
    toast.success(`Announcement ${announcement.active ? 'deactivated' : 'activated'}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Communication Hub</h2>
          <p className="text-slate-500">Manage announcements, notifications & email templates</p>
        </div>
      </div>

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Push Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{announcements.filter(a => a.active).length} Active</Badge>
            </div>
            <Button onClick={handleCreateAnnouncement}>
              <Plus className="h-4 w-4 mr-2" /> New Announcement
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={handleEditAnnouncement}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{templates.length} Templates</Badge>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Template
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <EmailTemplateCard
                key={template.id}
                template={template}
                onEdit={(t) => toast.info(`Editing template: ${t.name}`)}
                onPreview={(t) => toast.info(`Previewing: ${t.name}`)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Push Notifications</h3>
              <p className="text-slate-500 mb-4">Send targeted push notifications to mobile app users</p>
              <Button>
                <Zap className="h-4 w-4 mr-2" /> Send Push Notification
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Announcement Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={formData.audience} onValueChange={(v) => setFormData({ ...formData, audience: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="trial">Trial Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Publish immediately</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(v) => setFormData({ ...formData, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingAnnouncement ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CommunicationHub