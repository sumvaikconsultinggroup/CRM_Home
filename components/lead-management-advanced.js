'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Target, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Phone, Mail,
  Calendar, Clock, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronDown,
  LayoutGrid, List, Kanban, Table2, BarChart3, Users, DollarSign, TrendingUp,
  Star, StarOff, Flag, Bell, MessageSquare, FileText, Download, Upload,
  RefreshCw, Settings, Lock, Crown, Zap, CheckCircle2, XCircle, AlertCircle,
  ArrowUp, ArrowDown, GripVertical, ExternalLink, Copy, Archive, UserPlus,
  CalendarDays, History, Flame, Building2, MapPin, Globe, Sparkles, Trophy,
  ThumbsDown, PhoneCall, MessageCircle, Video, Send, Mic, Clock4, CalendarClock,
  Brain, Lightbulb, TrendingDown, Activity, PieChart, BarChart2, LineChart,
  Briefcase, IndianRupee, ArrowRightCircle, ChevronUp, Timer, Rocket, Award,
  AlertTriangle, Info, Play, Pause, SkipForward, CheckCircle, Circle, X,
  ArrowUpDown
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const LEAD_STAGES = [
  { id: 'new', label: 'New Lead', color: 'bg-blue-500', bgLight: 'bg-blue-50', text: 'text-blue-700', icon: Plus, order: 1 },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', text: 'text-yellow-700', icon: Phone, order: 2 },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-500', bgLight: 'bg-purple-50', text: 'text-purple-700', icon: CheckCircle2, order: 3 },
  { id: 'proposal', label: 'Proposal Sent', color: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-700', icon: FileText, order: 4 },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-pink-500', bgLight: 'bg-pink-50', text: 'text-pink-700', icon: MessageSquare, order: 5 },
  { id: 'won', label: 'Won', color: 'bg-green-500', bgLight: 'bg-green-50', text: 'text-green-700', icon: Trophy, order: 6 },
  { id: 'lost', label: 'Lost', color: 'bg-red-500', bgLight: 'bg-red-50', text: 'text-red-700', icon: ThumbsDown, order: 7 }
]

const PIPELINE_STAGES = LEAD_STAGES.filter(s => !['won', 'lost'].includes(s.id))

const LEAD_SOURCES = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'referral', label: 'Referral', icon: Users },
  { id: 'social_media', label: 'Social Media', icon: MessageCircle },
  { id: 'cold_call', label: 'Cold Call', icon: Phone },
  { id: 'indiamart', label: 'IndiaMART', icon: Building2 },
  { id: 'justdial', label: 'JustDial', icon: Search },
  { id: 'google_ads', label: 'Google Ads', icon: Target },
  { id: 'facebook', label: 'Facebook', icon: MessageCircle },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'walk_in', label: 'Walk-in', icon: MapPin },
  { id: 'trade_show', label: 'Trade Show', icon: Award },
  { id: 'email_campaign', label: 'Email Campaign', icon: Mail },
  { id: 'other', label: 'Other', icon: MoreVertical }
]

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-100', icon: ArrowDown },
  { id: 'medium', label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: ArrowUp },
  { id: 'high', label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Flame },
  { id: 'urgent', label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertTriangle }
]

const COMMUNICATION_TYPES = [
  { id: 'call', label: 'Phone Call', icon: PhoneCall, color: 'text-green-600' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-600' },
  { id: 'meeting', label: 'Meeting', icon: Users, color: 'text-purple-600' },
  { id: 'video_call', label: 'Video Call', icon: Video, color: 'text-indigo-600' },
  { id: 'site_visit', label: 'Site Visit', icon: MapPin, color: 'text-orange-600' },
  { id: 'other', label: 'Other', icon: MessageSquare, color: 'text-slate-600' }
]

const CALL_OUTCOMES = [
  { id: 'connected', label: 'Connected - Positive', sentiment: 'positive' },
  { id: 'connected_neutral', label: 'Connected - Neutral', sentiment: 'neutral' },
  { id: 'connected_negative', label: 'Connected - Negative', sentiment: 'negative' },
  { id: 'no_answer', label: 'No Answer', sentiment: 'neutral' },
  { id: 'busy', label: 'Busy', sentiment: 'neutral' },
  { id: 'callback_requested', label: 'Callback Requested', sentiment: 'positive' },
  { id: 'not_interested', label: 'Not Interested', sentiment: 'negative' },
  { id: 'wrong_number', label: 'Wrong Number', sentiment: 'negative' },
  { id: 'voicemail', label: 'Left Voicemail', sentiment: 'neutral' }
]

const LOST_REASONS = [
  'Price too high',
  'Went with competitor',
  'Budget constraints',
  'Project postponed',
  'Requirements changed',
  'No response',
  'Location issues',
  'Timeline mismatch',
  'Quality concerns',
  'Other'
]

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Smart Lead Score Calculator
const calculateLeadScore = (lead) => {
  let score = 0
  const factors = []

  // Value-based scoring (max 25)
  if (lead.value >= 500000) { score += 25; factors.push({ label: 'High Value Deal', points: 25 }) }
  else if (lead.value >= 200000) { score += 20; factors.push({ label: 'Medium-High Value', points: 20 }) }
  else if (lead.value >= 100000) { score += 15; factors.push({ label: 'Medium Value', points: 15 }) }
  else if (lead.value >= 50000) { score += 10; factors.push({ label: 'Low-Medium Value', points: 10 }) }
  else if (lead.value > 0) { score += 5; factors.push({ label: 'Has Value', points: 5 }) }

  // Stage-based scoring (max 25)
  const stageScores = { negotiation: 25, proposal: 20, qualified: 15, contacted: 10, new: 5 }
  if (stageScores[lead.status]) {
    score += stageScores[lead.status]
    factors.push({ label: `Stage: ${LEAD_STAGES.find(s => s.id === lead.status)?.label}`, points: stageScores[lead.status] })
  }

  // Engagement scoring (max 20)
  const conversations = lead.conversations || []
  const recentConversations = conversations.filter(c => {
    const daysDiff = (new Date() - new Date(c.timestamp)) / (1000 * 60 * 60 * 24)
    return daysDiff <= 7
  })
  if (recentConversations.length >= 3) { score += 20; factors.push({ label: 'High Engagement (3+ calls/week)', points: 20 }) }
  else if (recentConversations.length >= 1) { score += 10; factors.push({ label: 'Recent Contact', points: 10 }) }

  // Positive sentiment from conversations (max 15)
  const positiveConversations = conversations.filter(c => c.outcome?.includes('positive') || c.sentiment === 'positive')
  if (positiveConversations.length >= 2) { score += 15; factors.push({ label: 'Multiple Positive Interactions', points: 15 }) }
  else if (positiveConversations.length >= 1) { score += 8; factors.push({ label: 'Positive Response', points: 8 }) }

  // Profile completeness (max 10)
  let profileScore = 0
  if (lead.email) profileScore += 2
  if (lead.phone) profileScore += 2
  if (lead.company) profileScore += 2
  if (lead.address || lead.location) profileScore += 2
  if (lead.requirements || lead.notes) profileScore += 2
  score += profileScore
  if (profileScore > 0) factors.push({ label: 'Profile Completeness', points: profileScore })

  // Priority boost (max 5)
  if (lead.priority === 'urgent') { score += 5; factors.push({ label: 'Urgent Priority', points: 5 }) }
  else if (lead.priority === 'high') { score += 3; factors.push({ label: 'High Priority', points: 3 }) }

  return { score: Math.min(score, 100), factors }
}

// Smart Follow-up Suggestion
const getSmartFollowUpDate = (lead) => {
  const now = new Date()
  const conversations = lead.conversations || []
  const lastConversation = conversations[conversations.length - 1]
  
  let suggestedDate = new Date()
  let reason = ''
  
  // Based on lead status
  if (lead.status === 'new') {
    suggestedDate.setDate(now.getDate() + 1)
    reason = 'New lead - contact within 24 hours for best conversion'
  } else if (lead.status === 'contacted') {
    suggestedDate.setDate(now.getDate() + 2)
    reason = 'Follow up in 2 days to maintain momentum'
  } else if (lead.status === 'qualified') {
    suggestedDate.setDate(now.getDate() + 3)
    reason = 'Qualified lead - send proposal within 3 days'
  } else if (lead.status === 'proposal') {
    suggestedDate.setDate(now.getDate() + 2)
    reason = 'Check on proposal response in 2 days'
  } else if (lead.status === 'negotiation') {
    suggestedDate.setDate(now.getDate() + 1)
    reason = 'Hot lead in negotiation - daily follow-up recommended'
  }
  
  // Adjust based on last conversation outcome
  if (lastConversation) {
    if (lastConversation.outcome === 'callback_requested' && lastConversation.callbackDate) {
      suggestedDate = new Date(lastConversation.callbackDate)
      reason = 'Callback was requested by the client'
    } else if (lastConversation.outcome === 'no_answer') {
      suggestedDate.setDate(now.getDate() + 1)
      reason = 'No answer last time - try again tomorrow'
    } else if (lastConversation.outcome === 'busy') {
      suggestedDate.setHours(now.getHours() + 4)
      reason = 'Client was busy - try again in 4 hours'
    }
  }
  
  // Adjust based on priority
  if (lead.priority === 'urgent' && suggestedDate > now) {
    suggestedDate = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours
    reason = 'Urgent priority - immediate follow-up needed'
  }
  
  // Adjust based on value (high value = more frequent)
  if (lead.value >= 500000 && (suggestedDate - now) > 2 * 24 * 60 * 60 * 1000) {
    suggestedDate.setDate(now.getDate() + 2)
    reason = 'High value deal - maintain close contact'
  }
  
  // Don't suggest weekends
  const dayOfWeek = suggestedDate.getDay()
  if (dayOfWeek === 0) suggestedDate.setDate(suggestedDate.getDate() + 1)
  if (dayOfWeek === 6) suggestedDate.setDate(suggestedDate.getDate() + 2)
  
  // Best time suggestion
  let bestTime = '10:00 AM' // Default
  if (lastConversation?.connectedAt) {
    const lastConnectedHour = new Date(lastConversation.connectedAt).getHours()
    bestTime = `${lastConnectedHour > 12 ? lastConnectedHour - 12 : lastConnectedHour}:00 ${lastConnectedHour >= 12 ? 'PM' : 'AM'}`
  }
  
  return { 
    date: suggestedDate, 
    reason, 
    bestTime,
    isOverdue: lead.followUpDate && new Date(lead.followUpDate) < now
  }
}

// Format relative time
const formatRelativeTime = (date) => {
  if (!date) return 'Never'
  const now = new Date()
  const target = new Date(date)
  const diffMs = target - now
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffMs < 0) {
    // Past
    const pastDays = Math.abs(diffDays)
    const pastHours = Math.abs(diffHours)
    if (pastDays > 7) return target.toLocaleDateString()
    if (pastDays >= 1) return `${pastDays} day${pastDays > 1 ? 's' : ''} ago`
    if (pastHours >= 1) return `${pastHours} hour${pastHours > 1 ? 's' : ''} ago`
    return 'Just now'
  } else {
    // Future
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return target.toLocaleDateString()
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Lead Score Indicator
const LeadScoreIndicator = ({ score, size = 'md', showLabel = true }) => {
  const getColor = () => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }
  
  const getLabel = () => {
    if (score >= 80) return 'Hot'
    if (score >= 60) return 'Warm'
    if (score >= 40) return 'Cool'
    return 'Cold'
  }
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg'
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} ${getColor()} rounded-full flex items-center justify-center font-bold`}>
        {score}
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${getColor().split(' ')[0]}`}>{getLabel()}</span>
      )}
    </div>
  )
}

// Smart Follow-up Badge
const SmartFollowUpBadge = ({ lead, onClick }) => {
  const suggestion = getSmartFollowUpDate(lead)
  const isOverdue = suggestion.isOverdue
  
  return (
    <div 
      className={`p-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isOverdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {isOverdue ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <CalendarClock className="h-4 w-4 text-blue-600" />
        )}
        <span className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
          {isOverdue ? 'Overdue!' : formatRelativeTime(suggestion.date)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{suggestion.reason}</p>
    </div>
  )
}

// Conversation Timeline Item
const ConversationItem = ({ conversation, isLast }) => {
  const commType = COMMUNICATION_TYPES.find(t => t.id === conversation.type) || COMMUNICATION_TYPES[6]
  const CommIcon = commType.icon
  const outcome = CALL_OUTCOMES.find(o => o.id === conversation.outcome)
  
  return (
    <div className="relative pl-8 pb-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-slate-200" />
      )}
      
      {/* Icon */}
      <div className={`absolute left-0 top-0 h-6 w-6 rounded-full flex items-center justify-center ${
        outcome?.sentiment === 'positive' ? 'bg-green-100' :
        outcome?.sentiment === 'negative' ? 'bg-red-100' : 'bg-slate-100'
      }`}>
        <CommIcon className={`h-3 w-3 ${commType.color}`} />
      </div>
      
      {/* Content */}
      <div className="bg-slate-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{commType.label}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(conversation.timestamp).toLocaleString()}
          </span>
        </div>
        
        {outcome && (
          <Badge variant="outline" className={`text-xs mb-2 ${
            outcome.sentiment === 'positive' ? 'border-green-300 text-green-700' :
            outcome.sentiment === 'negative' ? 'border-red-300 text-red-700' : ''
          }`}>
            {outcome.label}
          </Badge>
        )}
        
        {conversation.duration && (
          <p className="text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Duration: {conversation.duration} mins
          </p>
        )}
        
        {conversation.notes && (
          <p className="text-sm mt-2 whitespace-pre-wrap">{conversation.notes}</p>
        )}
        
        {conversation.keyPoints && conversation.keyPoints.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Key Points:</p>
            <ul className="text-xs space-y-0.5">
              {conversation.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {conversation.nextAction && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <span className="font-medium text-blue-700">Next Action:</span> {conversation.nextAction}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          By: {conversation.createdBy || 'Unknown'}
        </p>
      </div>
    </div>
  )
}

// Add Conversation Dialog with Follow-up Scheduling
const AddConversationDialog = ({ open, onClose, lead, onSave }) => {
  const [formData, setFormData] = useState({
    type: 'call',
    outcome: '',
    duration: '',
    notes: '',
    keyPoints: [''],
    nextAction: '',
    scheduleFollowUp: true,
    followUpDate: '',
    followUpTime: '10:00',
    followUpQuickSelect: ''
  })
  const [saving, setSaving] = useState(false)
  
  // Quick date selection options
  const quickDateOptions = [
    { id: 'tomorrow', label: 'Tomorrow', days: 1 },
    { id: '2days', label: 'In 2 Days', days: 2 },
    { id: '3days', label: 'In 3 Days', days: 3 },
    { id: '1week', label: 'In 1 Week', days: 7 },
    { id: '2weeks', label: 'In 2 Weeks', days: 14 },
    { id: '1month', label: 'In 1 Month', days: 30 }
  ]
  
  const handleQuickDateSelect = (days) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    // Skip weekends
    if (date.getDay() === 0) date.setDate(date.getDate() + 1)
    if (date.getDay() === 6) date.setDate(date.getDate() + 2)
    setFormData({ 
      ...formData, 
      followUpDate: date.toISOString().split('T')[0],
      followUpQuickSelect: days.toString()
    })
  }
  
  const handleAddKeyPoint = () => {
    setFormData({ ...formData, keyPoints: [...formData.keyPoints, ''] })
  }
  
  const handleKeyPointChange = (index, value) => {
    const newKeyPoints = [...formData.keyPoints]
    newKeyPoints[index] = value
    setFormData({ ...formData, keyPoints: newKeyPoints })
  }
  
  const handleRemoveKeyPoint = (index) => {
    const newKeyPoints = formData.keyPoints.filter((_, i) => i !== index)
    setFormData({ ...formData, keyPoints: newKeyPoints.length ? newKeyPoints : [''] })
  }
  
  const handleSave = async () => {
    if (!formData.notes.trim()) {
      toast.error('Please add conversation notes')
      return
    }
    
    setSaving(true)
    try {
      const followUpDateTime = formData.scheduleFollowUp && formData.followUpDate 
        ? `${formData.followUpDate}T${formData.followUpTime || '10:00'}:00`
        : null
      
      const conversation = {
        id: Date.now().toString(),
        type: formData.type,
        outcome: formData.outcome,
        duration: formData.duration,
        notes: formData.notes,
        keyPoints: formData.keyPoints.filter(p => p.trim()),
        nextAction: formData.nextAction,
        followUpScheduled: followUpDateTime,
        timestamp: new Date().toISOString()
      }
      
      await onSave(conversation, followUpDateTime)
      setFormData({
        type: 'call',
        outcome: '',
        duration: '',
        notes: '',
        keyPoints: [''],
        nextAction: '',
        scheduleFollowUp: true,
        followUpDate: '',
        followUpTime: '10:00',
        followUpQuickSelect: ''
      })
      onClose()
    } catch (error) {
      toast.error('Failed to save conversation')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Log Conversation - {lead?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Communication Type */}
          <div>
            <Label className="text-sm font-medium">Communication Type *</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {COMMUNICATION_TYPES.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setFormData({ ...formData, type: type.id })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.type === type.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${type.color}`} />
                    <p className="text-xs text-center">{type.label}</p>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Outcome */}
          <div>
            <Label className="text-sm font-medium">Call Outcome *</Label>
            <Select value={formData.outcome} onValueChange={(v) => setFormData({ ...formData, outcome: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map(outcome => (
                  <SelectItem key={outcome.id} value={outcome.id}>
                    <span className={
                      outcome.sentiment === 'positive' ? 'text-green-700' :
                      outcome.sentiment === 'negative' ? 'text-red-700' : ''
                    }>
                      {outcome.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Schedule Next Follow-up - ALWAYS VISIBLE */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                Schedule Next Follow-up
              </Label>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="scheduleFollowUp"
                  checked={formData.scheduleFollowUp}
                  onCheckedChange={(checked) => setFormData({ ...formData, scheduleFollowUp: checked })}
                />
                <label htmlFor="scheduleFollowUp" className="text-xs text-muted-foreground cursor-pointer">
                  Set follow-up
                </label>
              </div>
            </div>
            
            {formData.scheduleFollowUp && (
              <>
                {/* Quick Select Buttons */}
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground mb-2 block">Quick Select:</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickDateOptions.map(opt => (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={formData.followUpQuickSelect === opt.days.toString() ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleQuickDateSelect(opt.days)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Manual Date & Time Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Or select date:</Label>
                    <Input 
                      type="date" 
                      className="mt-1"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value, followUpQuickSelect: '' })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Best time to call:</Label>
                    <Input 
                      type="time" 
                      className="mt-1"
                      value={formData.followUpTime}
                      onChange={(e) => setFormData({ ...formData, followUpTime: e.target.value })}
                    />
                  </div>
                </div>
                
                {formData.followUpDate && (
                  <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Follow-up scheduled for {new Date(formData.followUpDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} at {formData.followUpTime}
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Duration */}
          <div>
            <Label className="text-sm font-medium">Duration (minutes)</Label>
            <Input 
              type="number" 
              placeholder="e.g., 15"
              className="mt-1"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>
          
          {/* Conversation Notes */}
          <div>
            <Label className="text-sm font-medium">Conversation Notes *</Label>
            <Textarea 
              placeholder="Write detailed notes about the conversation..."
              className="mt-1 min-h-[120px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          {/* Key Points */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Key Discussion Points</Label>
              <Button variant="ghost" size="sm" onClick={handleAddKeyPoint}>
                <Plus className="h-4 w-4 mr-1" /> Add Point
              </Button>
            </div>
            <div className="space-y-2">
              {formData.keyPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input 
                    placeholder={`Point ${index + 1}`}
                    value={point}
                    onChange={(e) => handleKeyPointChange(index, e.target.value)}
                  />
                  {formData.keyPoints.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveKeyPoint(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Next Action */}
          <div>
            <Label className="text-sm font-medium">Next Action Required</Label>
            <Input 
              placeholder="e.g., Send quotation, Schedule site visit..."
              className="mt-1"
              value={formData.nextAction}
              onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Lead Detail Panel
const LeadDetailPanel = ({ lead, onClose, onUpdate, onAddConversation, onStatusChange, onConvertToProject }) => {
  const [activeDetailTab, setActiveDetailTab] = useState('overview')
  const scoreData = calculateLeadScore(lead)
  const followUpSuggestion = getSmartFollowUpDate(lead)
  const stageConfig = LEAD_STAGES.find(s => s.id === lead.status) || LEAD_STAGES[0]
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === lead.priority) || PRIORITY_LEVELS[0]
  const conversations = lead.conversations || []
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {lead.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {lead.name}
                {lead.starred && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
              </h2>
              {lead.company && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4" /> {lead.company}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${stageConfig.bgLight} ${stageConfig.text} border-0`}>
                  {stageConfig.label}
                </Badge>
                <LeadScoreIndicator score={scoreData.score} size="sm" />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${lead.phone}`}><Phone className="h-4 w-4 mr-1" /> Call</a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`mailto:${lead.email}`}><Mail className="h-4 w-4 mr-1" /> Email</a>
          </Button>
          <Button size="sm" onClick={onAddConversation}>
            <MessageSquare className="h-4 w-4 mr-1" /> Log Call
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 w-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">
            Conversations
            {conversations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {conversations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1 p-4">
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Smart Follow-up Suggestion */}
            <Card className={`p-4 ${followUpSuggestion.isOverdue ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${followUpSuggestion.isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                  <Brain className={`h-5 w-5 ${followUpSuggestion.isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${followUpSuggestion.isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
                    {followUpSuggestion.isOverdue ? '⚠️ Follow-up Overdue!' : '🧠 Smart Follow-up Suggestion'}
                  </h4>
                  <p className="text-sm mt-1">{followUpSuggestion.reason}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {followUpSuggestion.date.toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Best time: {followUpSuggestion.bestTime}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Contact Info */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{lead.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="font-medium">{lead.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <p className="font-medium">{lead.company || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <p className="font-medium">{lead.source || '-'}</p>
                </div>
                {lead.address && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-medium">{lead.address}</p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Deal Info */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <IndianRupee className="h-4 w-4" /> Deal Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Label className="text-xs text-muted-foreground">Deal Value</Label>
                  <p className="text-2xl font-bold text-green-600">₹{(lead.value || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <priorityConfig.icon className={`h-5 w-5 ${priorityConfig.color}`} />
                    <span className={`font-semibold ${priorityConfig.color}`}>{priorityConfig.label}</span>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Lead Score Breakdown */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Lead Score Analysis
              </h4>
              <div className="flex items-center gap-4 mb-4">
                <LeadScoreIndicator score={scoreData.score} size="lg" />
                <Progress value={scoreData.score} className="flex-1 h-3" />
              </div>
              <div className="space-y-2">
                {scoreData.factors.map((factor, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{factor.label}</span>
                    <span className="font-medium text-green-600">+{factor.points}</span>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* Requirements/Notes */}
            {(lead.requirements || lead.notes) && (
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Requirements & Notes
                </h4>
                <p className="text-sm whitespace-pre-wrap">{lead.requirements || lead.notes}</p>
              </Card>
            )}
            
            {/* Stage Change Actions */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Change Stage</h4>
              <div className="flex flex-wrap gap-2">
                {LEAD_STAGES.filter(s => s.id !== lead.status).map(stage => (
                  <Button 
                    key={stage.id} 
                    variant="outline" 
                    size="sm"
                    className={stage.id === 'won' ? 'border-green-300 text-green-700 hover:bg-green-50' : 
                               stage.id === 'lost' ? 'border-red-300 text-red-700 hover:bg-red-50' : ''}
                    onClick={() => {
                      if (stage.id === 'won') {
                        onConvertToProject(lead)
                      } else {
                        onStatusChange(lead.id, stage.id)
                      }
                    }}
                  >
                    <stage.icon className="h-4 w-4 mr-1" />
                    {stage.label}
                  </Button>
                ))}
              </div>
            </Card>
          </TabsContent>
          
          {/* Conversations Tab */}
          <TabsContent value="conversations" className="mt-0">
            {conversations.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-semibold mb-2">No Conversations Yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Log your first conversation to track all interactions with this lead.
                </p>
                <Button onClick={onAddConversation}>
                  <Plus className="h-4 w-4 mr-2" /> Log Conversation
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">{conversations.length} Conversation{conversations.length !== 1 ? 's' : ''}</h4>
                  <Button size="sm" onClick={onAddConversation}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div>
                  {[...conversations].reverse().map((conv, i) => (
                    <ConversationItem 
                      key={conv.id} 
                      conversation={conv} 
                      isLast={i === conversations.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-0">
            <div className="space-y-4">
              {/* Activity Timeline */}
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />
                
                {/* Current Status */}
                <div className="relative pb-6">
                  <div className={`absolute left-[-14px] h-6 w-6 rounded-full flex items-center justify-center ${stageConfig.color}`}>
                    <stageConfig.icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Current Stage: {stageConfig.label}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
                
                {/* Conversations in timeline */}
                {conversations.map((conv, i) => {
                  const commType = COMMUNICATION_TYPES.find(t => t.id === conv.type) || COMMUNICATION_TYPES[6]
                  return (
                    <div key={conv.id} className="relative pb-6">
                      <div className="absolute left-[-14px] h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <commType.icon className={`h-3 w-3 ${commType.color}`} />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium">{commType.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.timestamp).toLocaleString()}
                        </p>
                        {conv.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{conv.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {/* Lead Created */}
                <div className="relative">
                  <div className="absolute left-[-14px] h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <Plus className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Lead Created</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-0 space-y-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" /> AI Insights
              </h4>
              
              <div className="space-y-3">
                {/* Engagement Score */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Engagement Level</span>
                    <Badge variant={conversations.length >= 3 ? 'default' : 'secondary'}>
                      {conversations.length >= 5 ? 'Very High' : 
                       conversations.length >= 3 ? 'High' : 
                       conversations.length >= 1 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                  <Progress value={Math.min(conversations.length * 20, 100)} className="h-2" />
                </div>
                
                {/* Response Pattern */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Response Pattern</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversations.filter(c => c.outcome?.includes('connected')).length > 0
                      ? 'Client is responsive and engaged'
                      : 'Limited engagement - try different contact times'}
                  </p>
                </div>
                
                {/* Conversion Probability */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Conversion Probability</span>
                    <span className={`text-lg font-bold ${
                      scoreData.score >= 70 ? 'text-green-600' :
                      scoreData.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {scoreData.score >= 70 ? 'High' :
                       scoreData.score >= 50 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
                
                {/* Recommended Actions */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">Recommended Next Steps</span>
                  <ul className="mt-2 space-y-1">
                    {lead.status === 'new' && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Make initial contact within 24 hours
                      </li>
                    )}
                    {lead.status === 'contacted' && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Qualify the lead with discovery questions
                      </li>
                    )}
                    {lead.status === 'qualified' && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Prepare and send a proposal
                      </li>
                    )}
                    {lead.status === 'proposal' && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Follow up on proposal within 48 hours
                      </li>
                    )}
                    {lead.status === 'negotiation' && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Address objections and close the deal
                      </li>
                    )}
                    {conversations.length === 0 && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Start logging conversations
                      </li>
                    )}
                    {lead.value === 0 && (
                      <li className="text-xs flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> Update deal value for better tracking
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// Analytics Dashboard
// Enhanced Lead Analytics Dashboard
const LeadAnalytics = ({ leads }) => {
  const [analyticsTimePeriod, setAnalyticsTimePeriod] = useState('all')
  
  const stats = useMemo(() => {
    // Filter by time period first
    let filteredLeads = [...leads]
    const now = new Date()
    
    if (analyticsTimePeriod !== 'all') {
      let startDate
      switch (analyticsTimePeriod) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3
          startDate = new Date(now.getFullYear(), quarterMonth, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = null
      }
      if (startDate) {
        filteredLeads = filteredLeads.filter(l => new Date(l.createdAt) >= startDate)
      }
    }
    
    const total = filteredLeads.length
    const won = filteredLeads.filter(l => l.status === 'won')
    const lost = filteredLeads.filter(l => l.status === 'lost')
    const active = filteredLeads.filter(l => !['won', 'lost'].includes(l.status))
    
    const totalValue = filteredLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    const wonValue = won.reduce((sum, l) => sum + (l.value || 0), 0)
    const lostValue = lost.reduce((sum, l) => sum + (l.value || 0), 0)
    const pipelineValue = active.reduce((sum, l) => sum + (l.value || 0), 0)
    
    // Better conversion rate calculation (won / (won + lost))
    const decidedLeads = won.length + lost.length
    const conversionRate = decidedLeads > 0 ? ((won.length / decidedLeads) * 100).toFixed(1) : 0
    const avgDealSize = won.length > 0 ? Math.round(wonValue / won.length) : 0
    const avgLeadValue = total > 0 ? Math.round(totalValue / total) : 0
    
    // Source analysis with enhanced metrics
    const bySource = LEAD_SOURCES.map(source => {
      const sourceLeads = filteredLeads.filter(l => 
        l.source === source.id || 
        l.source === source.label ||
        l.source?.toLowerCase() === source.id.toLowerCase()
      )
      const wonFromSource = sourceLeads.filter(l => l.status === 'won')
      const lostFromSource = sourceLeads.filter(l => l.status === 'lost')
      const activeFromSource = sourceLeads.filter(l => !['won', 'lost'].includes(l.status))
      const decidedFromSource = wonFromSource.length + lostFromSource.length
      
      return {
        source: source.label,
        sourceId: source.id,
        icon: source.icon,
        total: sourceLeads.length,
        active: activeFromSource.length,
        won: wonFromSource.length,
        lost: lostFromSource.length,
        value: sourceLeads.reduce((sum, l) => sum + (l.value || 0), 0),
        wonValue: wonFromSource.reduce((sum, l) => sum + (l.value || 0), 0),
        conversionRate: decidedFromSource > 0 ? ((wonFromSource.length / decidedFromSource) * 100).toFixed(0) : '-',
        avgValue: sourceLeads.length > 0 ? Math.round(sourceLeads.reduce((sum, l) => sum + (l.value || 0), 0) / sourceLeads.length) : 0
      }
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total)
    
    // Stage distribution with percentages
    const byStage = LEAD_STAGES.map(stage => {
      const stageLeads = filteredLeads.filter(l => l.status === stage.id)
      return {
        stage: stage.label,
        stageId: stage.id,
        count: stageLeads.length,
        percentage: total > 0 ? ((stageLeads.length / total) * 100).toFixed(1) : 0,
        value: stageLeads.reduce((sum, l) => sum + (l.value || 0), 0),
        color: stage.color,
        bgLight: stage.bgLight,
        textColor: stage.text
      }
    })
    
    // Monthly trend analysis
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthLeads = leads.filter(l => {
        const created = new Date(l.createdAt)
        return created >= monthStart && created <= monthEnd
      })
      const monthWon = monthLeads.filter(l => l.status === 'won')
      const monthLost = monthLeads.filter(l => l.status === 'lost')
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        total: monthLeads.length,
        won: monthWon.length,
        lost: monthLost.length,
        value: monthLeads.reduce((sum, l) => sum + (l.value || 0), 0),
        wonValue: monthWon.reduce((sum, l) => sum + (l.value || 0), 0)
      })
    }
    
    // Priority distribution
    const byPriority = PRIORITY_LEVELS.map(p => ({
      priority: p.label,
      priorityId: p.id,
      color: p.color,
      bgColor: p.bgColor,
      count: filteredLeads.filter(l => l.priority === p.id && !['won', 'lost'].includes(l.status)).length,
      value: filteredLeads.filter(l => l.priority === p.id && !['won', 'lost'].includes(l.status)).reduce((sum, l) => sum + (l.value || 0), 0)
    }))
    
    // Follow-up analytics
    const overdueFollowUps = leads.filter(l => {
      if (!l.followUpDate || ['won', 'lost'].includes(l.status)) return false
      return new Date(l.followUpDate) < new Date()
    }).length
    
    const todayFollowUps = leads.filter(l => {
      if (!l.followUpDate || ['won', 'lost'].includes(l.status)) return false
      const today = new Date().toISOString().split('T')[0]
      return l.followUpDate.split('T')[0] === today
    }).length
    
    const thisWeekFollowUps = leads.filter(l => {
      if (!l.followUpDate || ['won', 'lost'].includes(l.status)) return false
      const followUp = new Date(l.followUpDate)
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return followUp >= now && followUp <= weekEnd
    }).length
    
    // Hot leads (high score)
    const hotLeads = filteredLeads.filter(l => {
      if (['won', 'lost'].includes(l.status)) return false
      return calculateLeadScore(l).score >= 70
    }).length
    
    // Lost reasons analysis
    const lostReasons = {}
    lost.forEach(l => {
      const reason = l.lostReason || 'Unknown'
      lostReasons[reason] = (lostReasons[reason] || 0) + 1
    })
    const lostReasonsArray = Object.entries(lostReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
    
    return {
      total,
      won: won.length,
      lost: lost.length,
      active: active.length,
      totalValue,
      wonValue,
      lostValue,
      pipelineValue,
      conversionRate,
      avgDealSize,
      avgLeadValue,
      bySource,
      byStage,
      byPriority,
      monthlyData,
      overdueFollowUps,
      todayFollowUps,
      thisWeekFollowUps,
      hotLeads,
      lostReasonsArray
    }
  }, [leads, analyticsTimePeriod])
  
  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Lead Analytics & Reporting
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <div className="flex border rounded-lg p-1">
            {[
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'quarter', label: 'Quarter' },
              { id: 'year', label: 'Year' },
              { id: 'all', label: 'All Time' }
            ].map(period => (
              <Button
                key={period.id}
                variant={analyticsTimePeriod === period.id ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => setAnalyticsTimePeriod(period.id)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Total Leads</p>
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <p className="text-xs text-yellow-600 font-medium">Active Pipeline</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.active}</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-xs text-green-600 font-medium">Won</p>
          <p className="text-2xl font-bold text-green-700">{stats.won}</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <p className="text-xs text-red-600 font-medium">Lost</p>
          <p className="text-2xl font-bold text-red-700">{stats.lost}</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Conversion</p>
          <p className="text-2xl font-bold text-purple-700">{stats.conversionRate}%</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <p className="text-xs text-emerald-600 font-medium">Pipeline Value</p>
          <p className="text-xl font-bold text-emerald-700">₹{(stats.pipelineValue / 100000).toFixed(1)}L</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <p className="text-xs text-teal-600 font-medium">Won Value</p>
          <p className="text-xl font-bold text-teal-700">₹{(stats.wonValue / 100000).toFixed(1)}L</p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-xs text-orange-600 font-medium">Avg Deal Size</p>
          <p className="text-xl font-bold text-orange-700">₹{(stats.avgDealSize / 1000).toFixed(0)}K</p>
        </Card>
      </div>
      
      {/* Monthly Trend */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <LineChart className="h-5 w-5" /> Monthly Lead Trend (Last 6 Months)
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {stats.monthlyData.map((month, i) => {
            const maxTotal = Math.max(...stats.monthlyData.map(m => m.total))
            const barHeight = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0
            return (
              <div key={month.month} className="text-center">
                <div className="h-32 flex items-end justify-center mb-2">
                  <div className="w-full max-w-12 relative">
                    <div 
                      className="bg-blue-200 rounded-t transition-all"
                      style={{ height: `${barHeight}%`, minHeight: month.total > 0 ? '8px' : '0' }}
                    >
                      <div 
                        className="bg-green-500 rounded-t absolute bottom-0 left-0 right-0"
                        style={{ height: `${month.total > 0 ? (month.won / month.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium">{month.month}</p>
                <p className="text-lg font-bold">{month.total}</p>
                <p className="text-xs text-green-600">Won: {month.won}</p>
                <p className="text-xs text-muted-foreground">₹{(month.value / 100000).toFixed(1)}L</p>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 rounded" /> Total Leads</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Won</span>
        </div>
      </Card>
      
      {/* Conversion Funnel */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart2 className="h-5 w-5" /> Sales Funnel
        </h3>
        <div className="space-y-2">
          {stats.byStage.map((stage, i) => {
            const maxCount = Math.max(...stats.byStage.map(s => s.count))
            const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            return (
              <div key={stage.stageId} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium truncate">{stage.stage}</div>
                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div 
                    className={`h-full ${stage.color} transition-all flex items-center`}
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    <span className="text-xs text-white font-medium px-2">{stage.count}</span>
                  </div>
                </div>
                <div className="w-12 text-xs text-muted-foreground text-right">{stage.percentage}%</div>
                <div className="w-20 text-sm text-right font-medium">₹{(stage.value / 100000).toFixed(1)}L</div>
              </div>
            )
          })}
        </div>
      </Card>
      
      {/* Source Performance & Priority Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Source Performance */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" /> Lead Source Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Source</th>
                  <th className="text-center py-2 font-medium">Total</th>
                  <th className="text-center py-2 font-medium">Active</th>
                  <th className="text-center py-2 font-medium">Won</th>
                  <th className="text-center py-2 font-medium">Conv%</th>
                  <th className="text-right py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {stats.bySource.map((source, i) => {
                  const SourceIcon = source.icon
                  return (
                    <tr key={source.sourceId} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <SourceIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{source.source}</span>
                        </div>
                      </td>
                      <td className="py-2 text-center font-semibold">{source.total}</td>
                      <td className="py-2 text-center text-yellow-600">{source.active}</td>
                      <td className="py-2 text-center text-green-600 font-semibold">{source.won}</td>
                      <td className="py-2 text-center">
                        <Badge variant={Number(source.conversionRate) >= 30 ? 'default' : 'secondary'} className="text-xs">
                          {source.conversionRate}%
                        </Badge>
                      </td>
                      <td className="py-2 text-right">₹{(source.value / 100000).toFixed(1)}L</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2">
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-center">{stats.total}</td>
                  <td className="py-2 text-center text-yellow-600">{stats.active}</td>
                  <td className="py-2 text-center text-green-600">{stats.won}</td>
                  <td className="py-2 text-center">
                    <Badge>{stats.conversionRate}%</Badge>
                  </td>
                  <td className="py-2 text-right">₹{(stats.totalValue / 100000).toFixed(1)}L</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        
        {/* Priority & Lost Reasons */}
        <div className="space-y-6">
          {/* Priority Distribution */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Flag className="h-5 w-5" /> Active Leads by Priority
            </h3>
            <div className="space-y-3">
              {stats.byPriority.map(p => {
                const maxCount = Math.max(...stats.byPriority.map(pr => pr.count))
                const percentage = maxCount > 0 ? (p.count / maxCount) * 100 : 0
                return (
                  <div key={p.priorityId} className="flex items-center gap-3">
                    <div className={`w-20 text-sm font-medium ${p.color}`}>{p.priority}</div>
                    <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                      <div 
                        className={`h-full ${p.bgColor} transition-all flex items-center px-2`}
                        style={{ width: `${Math.max(percentage, 8)}%` }}
                      >
                        <span className={`text-xs font-medium ${p.color}`}>{p.count}</span>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-right">₹{(p.value / 100000).toFixed(1)}L</div>
                  </div>
                )
              })}
            </div>
          </Card>
          
          {/* Lost Reasons */}
          {stats.lostReasonsArray.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-red-500" /> Lost Reasons Analysis
              </h3>
              <div className="space-y-2">
                {stats.lostReasonsArray.slice(0, 5).map((item, i) => (
                  <div key={item.reason} className="flex items-center justify-between">
                    <span className="text-sm">{item.reason}</span>
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      {item.count} leads
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
      
      {/* Follow-up Action Items */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs text-red-600 font-medium">Overdue</p>
              <p className="text-3xl font-bold text-red-700">{stats.overdueFollowUps}</p>
              <p className="text-xs text-red-600">Need immediate action</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Today</p>
              <p className="text-3xl font-bold text-blue-700">{stats.todayFollowUps}</p>
              <p className="text-xs text-blue-600">Scheduled for today</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">This Week</p>
              <p className="text-3xl font-bold text-purple-700">{stats.thisWeekFollowUps}</p>
              <p className="text-xs text-purple-600">Coming up</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-xs text-orange-600 font-medium">Hot Leads</p>
              <p className="text-3xl font-bold text-orange-700">{stats.hotLeads}</p>
              <p className="text-xs text-orange-600">Score 70+</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

// Advanced Add Lead Dialog
const AddLeadDialog = ({ open, onClose, onSave, users = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    priority: 'medium',
    value: '',
    status: 'new',
    followUpDate: '',
    followUpTime: '10:00',
    assignedTo: '',
    requirements: '',
    address: '',
    city: '',
    state: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Lead name is required')
      return
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      toast.error('Either phone or email is required')
      return
    }
    
    setSaving(true)
    try {
      const leadData = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        followUpDate: formData.followUpDate ? `${formData.followUpDate}T${formData.followUpTime}:00` : null
      }
      await onSave(leadData)
      setFormData({
        name: '', email: '', phone: '', company: '', source: '', priority: 'medium',
        value: '', status: 'new', followUpDate: '', followUpTime: '10:00', assignedTo: '',
        requirements: '', address: '', city: '', state: '', notes: ''
      })
      onClose()
    } catch (error) {
      toast.error('Failed to create lead')
    } finally {
      setSaving(false)
    }
  }
  
  // Set default follow-up date to tomorrow
  useEffect(() => {
    if (open && !formData.followUpDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFormData(prev => ({ 
        ...prev, 
        followUpDate: tomorrow.toISOString().split('T')[0] 
      }))
    }
  }, [open, formData.followUpDate])
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Lead
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Full Name *</Label>
                <Input 
                  placeholder="e.g., Rajesh Kumar"
                  className="mt-1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Company</Label>
                <Input 
                  placeholder="e.g., Kumar Enterprises"
                  className="mt-1"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Phone *</Label>
                <Input 
                  placeholder="e.g., 9876543210"
                  className="mt-1"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input 
                  type="email"
                  placeholder="e.g., rajesh@email.com"
                  className="mt-1"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          {/* Lead Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Lead Details</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Lead Source *</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(source => (
                      <SelectItem key={source.id} value={source.id}>
                        <div className="flex items-center gap-2">
                          <source.icon className="h-4 w-4" />
                          {source.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <p.icon className={`h-4 w-4 ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Deal Value (₹)</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 500000"
                  className="mt-1"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          {/* Follow-up Scheduling */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Follow-up Schedule
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Follow-up Date *</Label>
                <Input 
                  type="date"
                  className="mt-1"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Best Time to Call</Label>
                <Input 
                  type="time"
                  className="mt-1"
                  value={formData.followUpTime}
                  onChange={(e) => setFormData({ ...formData, followUpTime: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Assign To</Label>
                <Select value={formData.assignedTo} onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Location */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Address</Label>
                <Input 
                  placeholder="Street address"
                  className="mt-1"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">City</Label>
                <Input 
                  placeholder="e.g., Mumbai"
                  className="mt-1"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          {/* Requirements */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Requirements & Notes</h4>
            <div>
              <Label className="text-sm font-medium">Project Requirements</Label>
              <Textarea 
                placeholder="What is the client looking for? e.g., Complete home interior for 3BHK apartment, modern style, budget flexible..."
                className="mt-1 min-h-[80px]"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Additional Notes</Label>
              <Textarea 
                placeholder="Any other important details..."
                className="mt-1"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdvancedLeadManagement({ 
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
  const [activeTab, setActiveTab] = useState('pipeline')
  const [activeView, setActiveView] = useState('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [conversationDialogLead, setConversationDialogLead] = useState(null)
  const [markWonDialog, setMarkWonDialog] = useState(null)
  const [markLostDialog, setMarkLostDialog] = useState(null)
  const [lostReason, setLostReason] = useState('')
  const [lostNotes, setLostNotes] = useState('')
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false)
  const [setFollowUpLead, setSetFollowUpLeadState] = useState(null)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    priority: 'all',
    assignedTo: 'all',
    timePeriod: 'all'
  })

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // Filter and sort leads based on active tab and filters
  const filteredLeads = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    
    let result = [...leads]
    
    // Tab filtering
    if (activeTab === 'pipeline') {
      result = result.filter(l => !['won', 'lost'].includes(l.status))
    } else if (activeTab === 'won') {
      result = result.filter(l => l.status === 'won')
    } else if (activeTab === 'lost') {
      result = result.filter(l => l.status === 'lost')
    } else if (activeTab === 'today') {
      // Today's follow-ups
      result = result.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        if (!l.followUpDate) return false
        const followUp = new Date(l.followUpDate)
        return followUp >= todayStart && followUp < todayEnd
      })
    } else if (activeTab === 'overdue') {
      // Overdue follow-ups
      result = result.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        if (!l.followUpDate) return false
        return new Date(l.followUpDate) < todayStart
      })
    } else if (activeTab === 'followups') {
      result = result.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        return true
      }).sort((a, b) => {
        const aDate = a.followUpDate ? new Date(a.followUpDate) : new Date('2099-12-31')
        const bDate = b.followUpDate ? new Date(b.followUpDate) : new Date('2099-12-31')
        return aDate - bDate
      })
    } else if (activeTab === 'hot') {
      result = result.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        return calculateLeadScore(l).score >= 70 || l.priority === 'urgent' || l.priority === 'high'
      })
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
      // Match both source ID and label
      const sourceConfig = LEAD_SOURCES.find(s => s.id === filters.source)
      result = result.filter(l => 
        l.source === filters.source || 
        l.source === sourceConfig?.label ||
        l.source?.toLowerCase() === filters.source.toLowerCase()
      )
    }
    if (filters.priority !== 'all') {
      result = result.filter(l => l.priority === filters.priority)
    }
    
    // Time Period Filter
    if (filters.timePeriod !== 'all') {
      const now = new Date()
      let startDate
      
      switch (filters.timePeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3
          startDate = new Date(now.getFullYear(), quarterMonth, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = null
      }
      
      if (startDate) {
        result = result.filter(l => new Date(l.createdAt) >= startDate)
      }
    }
    
    // Sorting
    result.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || ''
          bVal = b.name?.toLowerCase() || ''
          break
        case 'value':
          aVal = a.value || 0
          bVal = b.value || 0
          break
        case 'followUpDate':
          aVal = a.followUpDate ? new Date(a.followUpDate).getTime() : 0
          bVal = b.followUpDate ? new Date(b.followUpDate).getTime() : 0
          break
        case 'score':
          aVal = calculateLeadScore(a).score
          bVal = calculateLeadScore(b).score
          break
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })
    
    return result
  }, [leads, activeTab, searchTerm, filters, sortBy, sortOrder])

  // Stats for tabs
  const tabStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return {
      pipeline: leads.filter(l => !['won', 'lost'].includes(l.status)).length,
      won: leads.filter(l => l.status === 'won').length,
      lost: leads.filter(l => l.status === 'lost').length,
      today: leads.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        if (!l.followUpDate) return false
        const followUp = new Date(l.followUpDate)
        return followUp >= todayStart && followUp < todayEnd
      }).length,
      overdue: leads.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        if (!l.followUpDate) return false
        return new Date(l.followUpDate) < todayStart
      }).length,
      followups: leads.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        if (!l.followUpDate) return true
        return new Date(l.followUpDate) <= weekFromNow
      }).length,
      hot: leads.filter(l => {
        if (['won', 'lost'].includes(l.status)) return false
        return calculateLeadScore(l).score >= 70 || l.priority === 'urgent' || l.priority === 'high'
      }).length
    }
  }, [leads])

  // Handle status change
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const response = await api.updateLead(leadId, { status: newStatus })
      
      if (response.projectCreated) {
        toast.success(`Lead converted! Project ${response.projectCreated.projectNumber} created.`)
      } else if (newStatus === 'lost') {
        toast.success('Lead marked as lost')
      } else {
        toast.success('Lead status updated')
      }
      
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus, ...response.lead } : l))
      
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus })
      }
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Failed to update status')
    }
  }

  // Handle adding conversation
  const handleAddConversation = async (conversation, followUpDateTime) => {
    const lead = conversationDialogLead
    if (!lead) return
    
    try {
      const conversations = lead.conversations || []
      const updatedConversations = [...conversations, {
        ...conversation,
        createdBy: user?.name || user?.email || 'Unknown'
      }]
      
      // Update follow-up date if provided from conversation dialog
      const updates = { conversations: updatedConversations }
      if (followUpDateTime) {
        updates.followUpDate = followUpDateTime
      }
      
      await api.updateLead(lead.id, updates)
      
      setLeads(leads.map(l => l.id === lead.id ? { ...l, ...updates } : l))
      
      if (selectedLead?.id === lead.id) {
        setSelectedLead({ ...selectedLead, ...updates })
      }
      
      if (followUpDateTime) {
        toast.success(`Conversation logged & follow-up scheduled for ${new Date(followUpDateTime).toLocaleDateString()}`)
      } else {
        toast.success('Conversation logged successfully')
      }
    } catch (error) {
      console.error('Add conversation error:', error)
      throw error
    }
  }

  // Handle mark as won
  const handleMarkAsWon = async () => {
    if (!markWonDialog) return
    
    try {
      await handleStatusChange(markWonDialog.id, 'won')
      setMarkWonDialog(null)
    } catch (error) {
      toast.error('Failed to convert lead')
    }
  }

  // Handle mark as lost
  const handleMarkAsLost = async () => {
    if (!markLostDialog) return
    
    try {
      const lead = markLostDialog
      const conversations = lead.conversations || []
      const lostConversation = {
        id: Date.now().toString(),
        type: 'other',
        outcome: 'not_interested',
        notes: `Lead marked as lost.\nReason: ${lostReason}\n${lostNotes}`,
        timestamp: new Date().toISOString(),
        createdBy: user?.name || user?.email || 'Unknown'
      }
      
      await api.updateLead(lead.id, { 
        status: 'lost',
        lostReason,
        lostNotes,
        conversations: [...conversations, lostConversation]
      })
      
      setLeads(leads.map(l => l.id === lead.id ? { 
        ...l, 
        status: 'lost', 
        lostReason, 
        lostNotes,
        conversations: [...conversations, lostConversation]
      } : l))
      
      toast.success('Lead marked as lost. Contact moved to nurturing.')
      setMarkLostDialog(null)
      setLostReason('')
      setLostNotes('')
      if (onRefresh) onRefresh()
    } catch (error) {
      toast.error('Failed to update lead')
    }
  }

  // Handle creating new lead
  const handleCreateLead = async (leadData) => {
    try {
      const response = await api.createLead(leadData)
      toast.success('Lead created successfully!')
      if (onRefresh) {
        onRefresh()
      } else {
        setLeads([response.lead || response, ...leads])
      }
    } catch (error) {
      console.error('Create lead error:', error)
      throw error
    }
  }

  // Handle setting follow-up date
  const handleSetFollowUp = async (leadId, followUpDate) => {
    try {
      await api.updateLead(leadId, { followUpDate })
      setLeads(leads.map(l => l.id === leadId ? { ...l, followUpDate } : l))
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, followUpDate })
      }
      toast.success('Follow-up date updated')
    } catch (error) {
      toast.error('Failed to update follow-up date')
    }
  }

  // Render Kanban View
  const renderKanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map(stage => {
        const stageLeads = filteredLeads.filter(l => l.status === stage.id)
        const totalValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0)
        const StageIcon = stage.icon
        
        return (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <div className={`rounded-t-xl p-4 ${stage.bgLight}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${stage.color} flex items-center justify-center`}>
                    <StageIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${stage.text}`}>{stage.label}</h3>
                    <p className="text-xs text-muted-foreground">{stageLeads.length} leads</p>
                  </div>
                </div>
                <span className="text-sm font-medium">₹{(totalValue / 100000).toFixed(1)}L</span>
              </div>
            </div>
            
            <div className="bg-slate-100 rounded-b-xl p-3 min-h-[400px] space-y-3">
              <AnimatePresence>
                {stageLeads.map(lead => {
                  const scoreData = calculateLeadScore(lead)
                  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === lead.priority) || PRIORITY_LEVELS[0]
                  const PriorityIcon = priorityConfig.icon
                  
                  return (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
                              {lead.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{lead.name}</h4>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground">{lead.company}</p>
                              )}
                            </div>
                          </div>
                          <LeadScoreIndicator score={scoreData.score} size="sm" showLabel={false} />
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold text-green-600">
                            ₹{(lead.value || 0).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <PriorityIcon className={`h-4 w-4 ${priorityConfig.color}`} />
                          </div>
                        </div>
                        
                        {/* Smart Follow-up indicator */}
                        <SmartFollowUpBadge 
                          lead={lead} 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLead(lead)
                          }}
                        />
                        
                        {/* Follow-up Date Display */}
                        {lead.followUpDate && (
                          <div className={`text-xs flex items-center gap-1 mt-2 ${
                            new Date(lead.followUpDate) < new Date() ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            <CalendarClock className="h-3 w-3" />
                            Follow-up: {formatRelativeTime(lead.followUpDate)}
                          </div>
                        )}
                        
                        {/* Quick actions */}
                        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 flex-1" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${lead.phone}`}><Phone className="h-3 w-3" /></a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConversationDialogLead(lead)
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 flex-1 text-green-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMarkWonDialog(lead)
                            }}
                          >
                            <Trophy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 flex-1 text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMarkLostDialog(lead)
                            }}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              
              {stageLeads.length === 0 && (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  No leads
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Render List View
  const renderListView = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3 text-left font-medium text-sm">Lead</th>
              <th className="p-3 text-left font-medium text-sm">Contact</th>
              <th className="p-3 text-left font-medium text-sm">Status</th>
              <th className="p-3 text-left font-medium text-sm">Value</th>
              <th className="p-3 text-left font-medium text-sm">Score</th>
              <th className="p-3 text-left font-medium text-sm">Follow-up</th>
              <th className="p-3 text-left font-medium text-sm">Conversations</th>
              <th className="p-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLeads.map(lead => {
              const stageConfig = LEAD_STAGES.find(s => s.id === lead.status) || LEAD_STAGES[0]
              const scoreData = calculateLeadScore(lead)
              const followUp = getSmartFollowUpDate(lead)
              const conversations = lead.conversations || []
              
              return (
                <tr 
                  key={lead.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
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
                      <p className="text-muted-foreground text-xs">{lead.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge className={`${stageConfig.bgLight} ${stageConfig.text} border-0`}>
                      {stageConfig.label}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-green-600">
                    ₹{(lead.value || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <LeadScoreIndicator score={scoreData.score} size="sm" />
                  </td>
                  <td className="p-3">
                    {lead.followUpDate ? (
                      <div className={`text-sm ${new Date(lead.followUpDate) < new Date() ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                        <CalendarClock className="h-3 w-3 inline mr-1" />
                        {new Date(lead.followUpDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); setSetFollowUpLeadState(lead) }}
                      >
                        + Set Date
                      </Button>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">{conversations.length}</Badge>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLead(lead) }}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConversationDialogLead(lead) }}>
                          <MessageSquare className="h-4 w-4 mr-2" /> Log Conversation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSetFollowUpLeadState(lead) }}>
                          <CalendarClock className="h-4 w-4 mr-2" /> Set Follow-up
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); setMarkWonDialog(lead) }}
                          className="text-green-600"
                        >
                          <Trophy className="h-4 w-4 mr-2" /> Mark as Won
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); setMarkLostDialog(lead) }}
                          className="text-red-600"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" /> Mark as Lost
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-7 w-7 text-primary" />
              Lead Management
              <Badge variant="outline" className="ml-2">Enterprise</Badge>
            </h1>
            <p className="text-muted-foreground">Track, manage, and convert your leads efficiently</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setShowAddLeadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white px-4 overflow-x-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-12 w-max">
            <TabsTrigger value="pipeline" className="gap-2">
              <Kanban className="h-4 w-4" />
              Pipeline
              <Badge variant="secondary" className="h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs">
                {tabStats.pipeline}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Today&apos;s Follow-up
              <Badge className={`h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs ${tabStats.today > 0 ? 'bg-blue-100 text-blue-700' : ''}`}>
                {tabStats.today}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Overdue
              <Badge className={`h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs ${tabStats.overdue > 0 ? 'bg-red-100 text-red-700 animate-pulse' : ''}`}>
                {tabStats.overdue}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="hot" className="gap-2">
              <Flame className="h-4 w-4 text-orange-600" />
              Hot Leads
              <Badge className="bg-orange-100 text-orange-700 h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs">
                {tabStats.hot}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="won" className="gap-2">
              <Trophy className="h-4 w-4 text-green-600" />
              Won
              <Badge className="bg-green-100 text-green-700 h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs">
                {tabStats.won}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-2">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              Lost
              <Badge className="bg-red-100 text-red-700 h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs">
                {tabStats.lost}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Controls */}
      {activeTab !== 'analytics' && (
        <div className="p-4 bg-white border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher */}
            {['pipeline', 'today', 'overdue', 'hot'].includes(activeTab) && (
              <div className="flex border rounded-lg p-1">
                <Button 
                  variant={activeView === 'kanban' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveView('kanban')}
                >
                  <Kanban className="h-4 w-4" />
                </Button>
                <Button 
                  variant={activeView === 'list' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
            
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
            
            {/* Sort By */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort: {sortBy === 'createdAt' ? 'Date' : sortBy === 'value' ? 'Value' : sortBy === 'followUpDate' ? 'Follow-up' : sortBy === 'name' ? 'Name' : 'Score'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('desc') }}>
                  <Calendar className="h-4 w-4 mr-2" /> Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('asc') }}>
                  <Calendar className="h-4 w-4 mr-2" /> Oldest First
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortBy('value'); setSortOrder('desc') }}>
                  <IndianRupee className="h-4 w-4 mr-2" /> Highest Value
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('value'); setSortOrder('asc') }}>
                  <IndianRupee className="h-4 w-4 mr-2" /> Lowest Value
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortBy('followUpDate'); setSortOrder('asc') }}>
                  <CalendarClock className="h-4 w-4 mr-2" /> Follow-up (Soonest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('score'); setSortOrder('desc') }}>
                  <Sparkles className="h-4 w-4 mr-2" /> Highest Score
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc') }}>
                  <Users className="h-4 w-4 mr-2" /> Name (A-Z)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Filters */}
            <Button 
              variant={showFilters ? 'secondary' : 'outline'} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" /> Filters
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && activeTab !== 'analytics' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b overflow-hidden"
          >
            <div className="p-4 grid md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Time Period</Label>
                <Select value={filters.timePeriod} onValueChange={(v) => setFilters({ ...filters, timePeriod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
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
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
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
                <Label className="text-xs">Stage</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {LEAD_STAGES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilters({ status: 'all', source: 'all', priority: 'all', assignedTo: 'all', timePeriod: 'all' })}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-auto p-4 ${selectedLead ? 'hidden lg:block' : ''}`}>
          {activeTab === 'analytics' ? (
            <LeadAnalytics leads={leads} />
          ) : activeTab === 'won' || activeTab === 'lost' ? (
            renderListView()
          ) : activeView === 'kanban' ? (
            renderKanbanView()
          ) : (
            renderListView()
          )}
          
          {filteredLeads.length === 0 && activeTab !== 'analytics' && (
            <Card className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Add your first lead to get started'}
              </p>
              <Button onClick={onAddLead}>
                <Plus className="h-4 w-4 mr-2" /> Add Lead
              </Button>
            </Card>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 480, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l bg-white overflow-hidden flex-shrink-0"
            >
              <LeadDetailPanel
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onUpdate={(updates) => {
                  setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, ...updates } : l))
                  setSelectedLead({ ...selectedLead, ...updates })
                }}
                onAddConversation={() => setConversationDialogLead(selectedLead)}
                onStatusChange={handleStatusChange}
                onConvertToProject={(lead) => setMarkWonDialog(lead)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Conversation Dialog */}
      <AddConversationDialog
        open={!!conversationDialogLead}
        onClose={() => setConversationDialogLead(null)}
        lead={conversationDialogLead}
        onSave={handleAddConversation}
      />

      {/* Mark as Won Dialog */}
      <Dialog open={!!markWonDialog} onOpenChange={() => setMarkWonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600" />
              Convert Lead to Project
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              Marking <strong>{markWonDialog?.name}</strong> as won will:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Automatically create a new project
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Convert contact to customer
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Transfer all lead data to project
              </li>
            </ul>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Deal Value:</strong> ₹{(markWonDialog?.value || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkWonDialog(null)}>Cancel</Button>
            <Button onClick={handleMarkAsWon} className="bg-green-600 hover:bg-green-700">
              <Trophy className="h-4 w-4 mr-2" /> Mark as Won & Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Lost Dialog */}
      <Dialog open={!!markLostDialog} onOpenChange={() => { setMarkLostDialog(null); setLostReason(''); setLostNotes('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-600" />
              Mark Lead as Lost
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Reason for Loss *</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map(reason => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Additional Notes</Label>
              <Textarea
                placeholder="Any additional details about why this lead was lost..."
                className="mt-1"
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMarkLostDialog(null); setLostReason(''); setLostNotes('') }}>
              Cancel
            </Button>
            <Button 
              onClick={handleMarkAsLost} 
              variant="destructive"
              disabled={!lostReason}
            >
              <ThumbsDown className="h-4 w-4 mr-2" /> Mark as Lost
            </Button>
          </DialogFooter>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-muted-foreground">
            <Info className="h-4 w-4 inline mr-1" />
            The associated contact will be automatically moved to &quot;Nurturing&quot; status for future re-engagement.
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={showAddLeadDialog}
        onClose={() => setShowAddLeadDialog(false)}
        onSave={handleCreateLead}
        users={users}
      />

      {/* Set Follow-up Dialog */}
      <Dialog open={!!setFollowUpLead} onOpenChange={() => setSetFollowUpLeadState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              Set Follow-up for {setFollowUpLead?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Follow-up Date</Label>
              <Input 
                type="date"
                className="mt-1"
                defaultValue={setFollowUpLead?.followUpDate?.split('T')[0] || ''}
                onChange={(e) => {
                  if (e.target.value && setFollowUpLead) {
                    handleSetFollowUp(setFollowUpLead.id, `${e.target.value}T10:00:00`)
                  }
                }}
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <Brain className="h-4 w-4 inline mr-1" />
                <strong>Smart Suggestion:</strong> {setFollowUpLead ? getSmartFollowUpDate(setFollowUpLead).reason : ''}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetFollowUpLeadState(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdvancedLeadManagement
