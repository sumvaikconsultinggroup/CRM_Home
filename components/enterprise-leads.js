'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import {
  Target, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Phone, Mail,
  Calendar, Clock, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronDown,
  LayoutGrid, List, Kanban, Table2, BarChart3, Users, DollarSign, TrendingUp,
  Star, StarOff, Flag, Bell, MessageSquare, FileText, Download, Upload,
  RefreshCw, Settings, Lock, Crown, Zap, CheckCircle2, XCircle, AlertCircle,
  ArrowUp, ArrowDown, GripVertical, ExternalLink, Copy, Archive, UserPlus,
  CalendarDays, History, Flame, Building2, MapPin, Globe, Sparkles
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// Lead status configuration
const LEAD_STATUSES = [
  { id: 'new', label: 'New', color: 'bg-blue-500', bgLight: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', text: 'text-yellow-700' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-500', bgLight: 'bg-purple-50', text: 'text-purple-700' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-700' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-pink-500', bgLight: 'bg-pink-50', text: 'text-pink-700' },
  { id: 'won', label: 'Won', color: 'bg-green-500', bgLight: 'bg-green-50', text: 'text-green-700' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500', bgLight: 'bg-red-50', text: 'text-red-700' }
]

const LEAD_SOURCES = [
  'Website', 'Referral', 'Social Media', 'Cold Call', 'Trade Show', 
  'IndiaMART', 'JustDial', 'Google Ads', 'Facebook', 'WhatsApp', 'Walk-in', 'Other'
]

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', color: 'text-slate-500', icon: ArrowDown },
  { id: 'medium', label: 'Medium', color: 'text-yellow-500', icon: ArrowUp },
  { id: 'high', label: 'High', color: 'text-orange-500', icon: ArrowUp },
  { id: 'urgent', label: 'Urgent', color: 'text-red-500', icon: Flame }
]

// Feature access by plan
const PLAN_FEATURES = {
  basic: {
    views: ['list'],
    tabs: ['all'],
    maxLeads: 100,
    bulkActions: false,
    leadScoring: false,
    customFields: false,
    export: ['csv'],
    advancedFilters: false,
    analytics: false,
    followupTab: false
  },
  professional: {
    views: ['list', 'kanban', 'table'],
    tabs: ['all', 'my-leads', 'hot'],
    maxLeads: -1, // unlimited
    bulkActions: true,
    leadScoring: true,
    customFields: false,
    export: ['csv', 'pdf'],
    advancedFilters: true,
    analytics: true,
    followupTab: false
  },
  enterprise: {
    views: ['list', 'kanban', 'table', 'grid', 'timeline'],
    tabs: ['all', 'my-leads', 'hot', 'followup-today', 'recent'],
    maxLeads: -1,
    bulkActions: true,
    leadScoring: true,
    customFields: true,
    export: ['csv', 'pdf', 'excel'],
    advancedFilters: true,
    analytics: true,
    followupTab: true
  }
}

// Lead Score Calculator
const calculateLeadScore = (lead) => {
  let score = 0
  
  // Value-based scoring
  if (lead.value >= 100000) score += 30
  else if (lead.value >= 50000) score += 20
  else if (lead.value >= 25000) score += 10
  
  // Status-based scoring
  if (lead.status === 'negotiation') score += 25
  else if (lead.status === 'proposal') score += 20
  else if (lead.status === 'qualified') score += 15
  else if (lead.status === 'contacted') score += 10
  
  // Engagement scoring
  if (lead.email) score += 5
  if (lead.phone) score += 5
  if (lead.company) score += 5
  
  // Priority scoring
  if (lead.priority === 'urgent') score += 15
  else if (lead.priority === 'high') score += 10
  else if (lead.priority === 'medium') score += 5
  
  return Math.min(score, 100)
}

// Lead Card Component
const LeadCard = ({ lead, onEdit, onDelete, onView, onStatusChange, onAddRemark, showScore, compact = false }) => {
  const statusConfig = LEAD_STATUSES.find(s => s.id === lead.status) || LEAD_STATUSES[0]
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === lead.priority) || PRIORITY_LEVELS[0]
  const score = showScore ? calculateLeadScore(lead) : null
  const PriorityIcon = priorityConfig.icon

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer group"
        onClick={() => onView?.(lead)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`h-2 w-2 rounded-full ${statusConfig.color}`} />
          <span className="font-medium truncate">{lead.name}</span>
          {lead.starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">₹{(lead.value || 0).toLocaleString()}</span>
          <PriorityIcon className={`h-4 w-4 ${priorityConfig.color}`} />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl border hover:shadow-xl transition-all duration-300 overflow-hidden group"
    >
      {/* Card Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {lead.name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{lead.name}</h3>
                {lead.starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              </div>
              {lead.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {lead.company}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(lead)}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(lead)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-sm">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Phone className="h-3 w-3" /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Mail className="h-3 w-3" /> {lead.email}
            </a>
          )}
        </div>

        {/* Status and Priority */}
        <div className="flex items-center justify-between">
          <Select value={lead.status} onValueChange={(v) => onStatusChange?.(lead.id, v)}>
            <SelectTrigger className={`w-auto h-8 ${statusConfig.bgLight} ${statusConfig.text} border-0`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map(status => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${status.color}`} />
                    {status.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <PriorityIcon className={`h-4 w-4 ${priorityConfig.color}`} />
            <span className={`text-sm font-medium ${priorityConfig.color}`}>{priorityConfig.label}</span>
          </div>
        </div>

        {/* Value and Score */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-green-600">
            ₹{(lead.value || 0).toLocaleString()}
          </div>
          {showScore && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">Score</div>
              <div className={`text-lg font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {score}
              </div>
            </div>
          )}
        </div>

        {/* Lead Score Progress */}
        {showScore && (
          <Progress value={score} className="h-2" />
        )}

        {/* Source and Date */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" /> {lead.source || 'Unknown'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {new Date(lead.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Follow-up Date */}
        {lead.followUpDate && (
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            new Date(lead.followUpDate) <= new Date() ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            <Bell className="h-4 w-4" />
            <span className="text-sm font-medium">
              Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Remarks Section */}
        {lead.remarks && lead.remarks.length > 0 && (
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Latest Remark:</p>
            <p className="text-sm">{lead.remarks[lead.remarks.length - 1]?.text}</p>
          </div>
        )}
      </div>

      {/* Card Footer - Quick Actions */}
      <div className="px-4 py-3 border-t bg-slate-50 flex justify-between">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}><Phone className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}><Mail className="h-4 w-4" /></a>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={(e) => { e.stopPropagation(); onAddRemark?.(lead) }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView?.(lead) }}>
          View <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

// Kanban Column Component
const KanbanColumn = ({ status, leads, onStatusChange, onEdit, onDelete, onView, showScore }) => {
  const statusConfig = LEAD_STATUSES.find(s => s.id === status) || LEAD_STATUSES[0]
  const columnLeads = leads.filter(l => l.status === status)
  const totalValue = columnLeads.reduce((sum, l) => sum + (l.value || 0), 0)

  return (
    <div className="flex-1 min-w-[300px] max-w-[350px]">
      <div className={`rounded-t-xl p-4 ${statusConfig.bgLight}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${statusConfig.color}`} />
            <h3 className={`font-semibold ${statusConfig.text}`}>{statusConfig.label}</h3>
            <Badge variant="secondary" className="ml-2">{columnLeads.length}</Badge>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            ₹{totalValue.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="bg-slate-100 rounded-b-xl p-3 min-h-[500px] space-y-3">
        <AnimatePresence>
          {columnLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onStatusChange={onStatusChange}
              showScore={showScore}
            />
          ))}
        </AnimatePresence>
        {columnLeads.length === 0 && (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  )
}

// Main Enterprise Leads Component
export function EnterpriseLeads({ 
  leads: initialLeads = [], 
  user, 
  client, 
  users = [],
  onAddLead,
  onEditLead,
  onDeleteLead,
  onRefresh
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeTab, setActiveTab] = useState('all')
  const [activeView, setActiveView] = useState('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    priority: 'all',
    assignedTo: 'all',
    dateRange: 'all',
    minValue: 0,
    maxValue: 10000000
  })
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [viewingLead, setViewingLead] = useState(null)

  // Get plan features
  const planId = client?.planId || 'basic'
  const features = PLAN_FEATURES[planId] || PLAN_FEATURES.basic

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads]

    // Tab-based filtering
    if (activeTab === 'my-leads') {
      result = result.filter(l => l.assignedTo === user?.id)
    } else if (activeTab === 'hot') {
      result = result.filter(l => l.priority === 'urgent' || l.priority === 'high' || calculateLeadScore(l) >= 70)
    } else if (activeTab === 'followup-today') {
      const today = new Date().toISOString().split('T')[0]
      result = result.filter(l => l.followUpDate && l.followUpDate.split('T')[0] === today)
    } else if (activeTab === 'recent') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      result = result.filter(l => new Date(l.createdAt) >= weekAgo)
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(l => 
        l.name?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.phone?.includes(term) ||
        l.company?.toLowerCase().includes(term)
      )
    }

    // Filters
    if (filters.status !== 'all') {
      result = result.filter(l => l.status === filters.status)
    }
    if (filters.source !== 'all') {
      result = result.filter(l => l.source === filters.source)
    }
    if (filters.priority !== 'all') {
      result = result.filter(l => l.priority === filters.priority)
    }
    if (filters.assignedTo !== 'all') {
      result = result.filter(l => l.assignedTo === filters.assignedTo)
    }
    result = result.filter(l => (l.value || 0) >= filters.minValue && (l.value || 0) <= filters.maxValue)

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      if (sortBy === 'value') {
        aVal = aVal || 0
        bVal = bVal || 0
      }
      if (sortBy === 'score') {
        aVal = calculateLeadScore(a)
        bVal = calculateLeadScore(b)
      }
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    return result
  }, [leads, activeTab, searchTerm, filters, sortBy, sortOrder, user])

  // Stats
  const stats = useMemo(() => {
    const total = filteredLeads.length
    const totalValue = filteredLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    const hotLeads = filteredLeads.filter(l => l.priority === 'urgent' || l.priority === 'high').length
    const followupToday = filteredLeads.filter(l => {
      if (!l.followUpDate) return false
      return l.followUpDate.split('T')[0] === new Date().toISOString().split('T')[0]
    }).length
    const avgScore = filteredLeads.length > 0 
      ? Math.round(filteredLeads.reduce((sum, l) => sum + calculateLeadScore(l), 0) / filteredLeads.length)
      : 0

    return { total, totalValue, hotLeads, followupToday, avgScore }
  }, [filteredLeads])

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.updateLead(leadId, { status: newStatus })
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      toast.success('Lead status updated')
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Failed to update status')
    }
  }

  const handleAddRemark = async (leadId, remark) => {
    try {
      const lead = leads.find(l => l.id === leadId)
      const remarks = lead?.remarks || []
      const newRemark = {
        id: Date.now().toString(),
        text: remark,
        createdBy: user?.name || 'Unknown',
        createdAt: new Date().toISOString()
      }
      await api.updateLead(leadId, { remarks: [...remarks, newRemark] })
      setLeads(leads.map(l => l.id === leadId ? { ...l, remarks: [...remarks, newRemark] } : l))
      toast.success('Remark added')
    } catch (error) {
      console.error('Add remark error:', error)
      toast.error('Failed to add remark')
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads first')
      return
    }

    try {
      if (action === 'delete') {
        await api.bulkLeadAction('delete', selectedLeads)
        setLeads(leads.filter(l => !selectedLeads.includes(l.id)))
        toast.success(`${selectedLeads.length} leads deleted`)
      } else if (action.startsWith('status:')) {
        const status = action.split(':')[1]
        await api.bulkLeadAction('update', selectedLeads, { status })
        setLeads(leads.map(l => selectedLeads.includes(l.id) ? { ...l, status } : l))
        toast.success(`${selectedLeads.length} leads updated`)
      }
      setSelectedLeads([])
    } catch (error) {
      toast.error('Failed to perform bulk action')
    }
  }

  const handleExport = (format) => {
    if (!features.export.includes(format)) {
      toast.error('Upgrade your plan to access this export format')
      return
    }
    toast.success(`Exporting ${filteredLeads.length} leads as ${format.toUpperCase()}`)
    // Export logic would go here
  }

  const isFeatureLocked = (feature) => {
    if (feature === 'followupTab') return !features.followupTab
    if (feature === 'analytics') return !features.analytics
    if (feature === 'bulkActions') return !features.bulkActions
    if (feature === 'advancedFilters') return !features.advancedFilters
    if (feature === 'leadScoring') return !features.leadScoring
    return false
  }

  const renderLockedFeature = (featureName) => (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Lock className="h-4 w-4" />
      <span className="text-sm">{featureName}</span>
      <Badge variant="outline" className="text-xs">
        <Crown className="h-3 w-3 mr-1" /> Enterprise
      </Badge>
    </div>
  )

  // Render views
  const renderKanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {LEAD_STATUSES.filter(s => s.id !== 'won' && s.id !== 'lost').map(status => (
        <KanbanColumn
          key={status.id}
          status={status.id}
          leads={filteredLeads}
          onStatusChange={handleStatusChange}
          onEdit={onEditLead}
          onDelete={onDeleteLead}
          onView={setViewingLead}
          showScore={features.leadScoring}
        />
      ))}
    </div>
  )

  const renderGridView = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence>
        {filteredLeads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onEdit={onEditLead}
            onDelete={onDeleteLead}
            onView={setViewingLead}
            onStatusChange={handleStatusChange}
            showScore={features.leadScoring}
          />
        ))}
      </AnimatePresence>
    </div>
  )

  const renderListView = () => (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {filteredLeads.map((lead, i) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            compact
            onEdit={onEditLead}
            onDelete={onDeleteLead}
            onView={setViewingLead}
            onStatusChange={handleStatusChange}
            showScore={features.leadScoring}
          />
        ))}
      </div>
    </Card>
  )

  const renderTableView = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              {features.bulkActions && (
                <th className="p-3 w-12">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedLeads(checked ? filteredLeads.map(l => l.id) : [])
                    }}
                  />
                </th>
              )}
              <th className="p-3 text-left font-medium text-sm">Name</th>
              <th className="p-3 text-left font-medium text-sm">Contact</th>
              <th className="p-3 text-left font-medium text-sm">Status</th>
              <th className="p-3 text-left font-medium text-sm">Value</th>
              {features.leadScoring && <th className="p-3 text-left font-medium text-sm">Score</th>}
              <th className="p-3 text-left font-medium text-sm">Source</th>
              <th className="p-3 text-left font-medium text-sm">Created</th>
              <th className="p-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLeads.map(lead => {
              const statusConfig = LEAD_STATUSES.find(s => s.id === lead.status) || LEAD_STATUSES[0]
              const score = calculateLeadScore(lead)
              return (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  {features.bulkActions && (
                    <td className="p-3">
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          setSelectedLeads(checked 
                            ? [...selectedLeads, lead.id]
                            : selectedLeads.filter(id => id !== lead.id)
                          )
                        }}
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                        {lead.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      <p>{lead.phone}</p>
                      <p className="text-muted-foreground">{lead.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge className={`${statusConfig.bgLight} ${statusConfig.text} border-0`}>
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-green-600">
                    ₹{(lead.value || 0).toLocaleString()}
                  </td>
                  {features.leadScoring && (
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={score} className="w-16 h-2" />
                        <span className={`text-sm font-medium ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {score}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="p-3 text-sm text-muted-foreground">{lead.source}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingLead(lead)}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditLead?.(lead)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDeleteLead?.(lead)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Sales Pipeline
            <Badge variant="outline" className="ml-2">
              {planId.charAt(0).toUpperCase() + planId.slice(1)}
            </Badge>
          </h2>
          <p className="text-muted-foreground">Manage and track your leads efficiently</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              {features.export.includes('pdf') ? (
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export as PDF
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <Lock className="h-4 w-4 mr-2" /> PDF (Professional+)
                </DropdownMenuItem>
              )}
              {features.export.includes('excel') ? (
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  Export as Excel
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <Lock className="h-4 w-4 mr-2" /> Excel (Enterprise)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onAddLead}>
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <p className="text-2xl font-bold">₹{stats.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hot Leads</p>
              <p className="text-2xl font-bold">{stats.hotLeads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Follow-up Today</p>
              <p className="text-2xl font-bold">{stats.followupToday}</p>
            </div>
          </div>
        </Card>
        {features.leadScoring ? (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
                <p className="text-2xl font-bold">{stats.avgScore}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 opacity-60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lead Scoring</p>
                <Badge variant="outline" className="text-xs"><Crown className="h-3 w-3 mr-1" /> Pro+</Badge>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            {features.tabs.includes('my-leads') && (
              <TabsTrigger value="my-leads">My Leads</TabsTrigger>
            )}
            {features.tabs.includes('hot') && (
              <TabsTrigger value="hot" className="gap-1">
                <Flame className="h-4 w-4" /> Hot
              </TabsTrigger>
            )}
            {features.tabs.includes('followup-today') ? (
              <TabsTrigger value="followup-today" className="gap-1">
                <Bell className="h-4 w-4" /> Today's Follow-up
              </TabsTrigger>
            ) : features.tabs.includes('my-leads') && (
              <TabsTrigger value="followup-locked" disabled className="gap-1 opacity-50">
                <Lock className="h-3 w-3" /> Follow-up
                <Badge variant="outline" className="text-[10px] ml-1 px-1">Enterprise</Badge>
              </TabsTrigger>
            )}
            {features.tabs.includes('recent') && (
              <TabsTrigger value="recent">Recent</TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex border rounded-lg p-1">
            {features.views.includes('list') && (
              <Button 
                variant={activeView === 'list' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            )}
            {features.views.includes('kanban') ? (
              <Button 
                variant={activeView === 'kanban' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('kanban')}
              >
                <Kanban className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled className="opacity-50">
                <Lock className="h-3 w-3" />
              </Button>
            )}
            {features.views.includes('table') ? (
              <Button 
                variant={activeView === 'table' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('table')}
              >
                <Table2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled className="opacity-50">
                <Lock className="h-3 w-3" />
              </Button>
            )}
            {features.views.includes('grid') ? (
              <Button 
                variant={activeView === 'grid' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled className="opacity-50">
                <Lock className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters Toggle */}
          <Button 
            variant={showFilters ? 'secondary' : 'outline'} 
            onClick={() => {
              if (!features.advancedFilters && !showFilters) {
                toast.error('Advanced filters available on Professional+ plans')
                return
              }
              setShowFilters(!showFilters)
            }}
          >
            <Filter className="h-4 w-4 mr-2" /> Filters
            {!features.advancedFilters && <Lock className="h-3 w-3 ml-1" />}
          </Button>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowUpRight className="h-4 w-4 mr-2" /> Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('desc') }}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('asc') }}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('value'); setSortOrder('desc') }}>
                Highest Value
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('value'); setSortOrder('asc') }}>
                Lowest Value
              </DropdownMenuItem>
              {features.leadScoring && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortBy('score'); setSortOrder('desc') }}>
                    Highest Score
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && features.advancedFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Card className="p-4">
              <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {LEAD_STATUSES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Source</Label>
                  <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {LEAD_SOURCES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {PRIORITY_LEVELS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assigned To</Label>
                  <Select value={filters.assignedTo} onValueChange={(v) => setFilters({ ...filters, assignedTo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Value Range: ₹{filters.minValue.toLocaleString()} - ₹{filters.maxValue.toLocaleString()}</Label>
                  <div className="pt-2">
                    <Slider
                      value={[filters.minValue, filters.maxValue]}
                      min={0}
                      max={10000000}
                      step={50000}
                      onValueChange={([min, max]) => setFilters({ ...filters, minValue: min, maxValue: max })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => setFilters({
                  status: 'all', source: 'all', priority: 'all', assignedTo: 'all', dateRange: 'all', minValue: 0, maxValue: 10000000
                })}>
                  Clear Filters
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      {features.bulkActions && selectedLeads.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-medium">{selectedLeads.length} leads selected</span>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Change Status</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {LEAD_STATUSES.map(s => (
                    <DropdownMenuItem key={s.id} onClick={() => handleBulkAction(`status:${s.id}`)}>
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLeads([])}>
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <div className="min-h-[500px]">
        {activeView === 'kanban' && renderKanbanView()}
        {activeView === 'grid' && renderGridView()}
        {activeView === 'list' && renderListView()}
        {activeView === 'table' && renderTableView()}
      </div>

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <Card className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || Object.values(filters).some(v => v !== 'all' && v !== 0 && v !== 10000000)
              ? 'Try adjusting your filters or search terms'
              : 'Start by adding your first lead'}
          </p>
          <Button onClick={onAddLead}>
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        </Card>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
                {viewingLead?.name?.charAt(0)}
              </div>
              {viewingLead?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingLead && (
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewingLead.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewingLead.phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <p className="font-medium">{viewingLead.company || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <p className="font-medium">{viewingLead.source || '-'}</p>
                </div>
              </div>

              {/* Status and Value */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`mt-1 ${LEAD_STATUSES.find(s => s.id === viewingLead.status)?.bgLight} ${LEAD_STATUSES.find(s => s.id === viewingLead.status)?.text}`}>
                    {LEAD_STATUSES.find(s => s.id === viewingLead.status)?.label}
                  </Badge>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="text-xl font-bold text-green-600">₹{(viewingLead.value || 0).toLocaleString()}</p>
                </Card>
                {features.leadScoring && (
                  <Card className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Lead Score</p>
                    <p className="text-xl font-bold">{calculateLeadScore(viewingLead)}</p>
                  </Card>
                )}
              </div>

              {/* Notes */}
              {viewingLead.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="mt-1 p-3 bg-slate-50 rounded-lg">{viewingLead.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewingLead(null)}>Close</Button>
                <Button onClick={() => { onEditLead?.(viewingLead); setViewingLead(null) }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
