'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus, Search, Hash, Lock, Send, Smile, Paperclip, MoreHorizontal,
  Users, MessageSquare, AtSign, Pin, Reply, Edit, Trash2, Check, CheckCheck,
  ChevronDown, ChevronRight, Settings, Bell, BellOff, Star, UserPlus, LogOut,
  RefreshCw, Loader2, X, Image, File, Link2, Circle, Home, Inbox, BookMarked,
  MoreVertical, ThumbsUp, Heart, Laugh, PartyPopper, Zap, Eye, EyeOff, Globe,
  LockKeyhole, MessageCircle, Phone, Video, Headphones, Calendar, Clock, ArrowRight,
  Megaphone, AlertCircle, CheckCircle2, ListTodo, Target, Briefcase, FolderOpen,
  Volume2, VolumeX, Mic, MicOff, Sparkles, Bot, Command, Filter, Archive,
  Forward, Download, Copy, ExternalLink, Layout, Columns, Maximize2, Minimize2,
  PanelLeftClose, PanelLeftOpen, CircleDot, Activity, TrendingUp, UserCircle2,
  Building2, Shield, Crown, Rocket, Flag
} from 'lucide-react'

// ==================== CONSTANTS ====================
const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯', '🔥', '✅', '⭐', '🙏', '💪']

const TEAM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', 
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
]

const TEAM_ICONS = ['👥', '🚀', '💼', '🎯', '⚡', '🌟', '🔧', '📊', '🎨', '💡', '🏆', '🎪']

const CHANNEL_CATEGORIES = [
  { id: 'general', name: 'General', icon: Hash },
  { id: 'projects', name: 'Projects', icon: FolderOpen },
  { id: 'announcements', name: 'Announcements', icon: Megaphone },
  { id: 'social', name: 'Social', icon: Heart }
]

const NOTIFICATION_SOUNDS = {
  message: '/sounds/message.mp3',
  mention: '/sounds/mention.mp3',
  call: '/sounds/call.mp3'
}

// ==================== ANIMATION VARIANTS ====================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 500, damping: 30 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
}

const slideInRight = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: 100, opacity: 0 }
}

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
}

// ==================== UTILITY COMPONENTS ====================

// Animated Online Status Dot
const OnlineStatus = ({ status = 'offline', size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'
  const colors = {
    online: 'bg-emerald-500',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
    offline: 'bg-slate-400'
  }
  
  return (
    <span className="relative flex">
      <span className={`${sizeClass} rounded-full ${colors[status]}`} />
      {status === 'online' && (
        <span className={`absolute ${sizeClass} rounded-full ${colors[status]} animate-ping opacity-75`} />
      )}
    </span>
  )
}

// Typing Indicator
const TypingIndicator = ({ users = [] }) => {
  if (users.length === 0) return null
  
  const text = users.length === 1 
    ? `${users[0]} is typing...`
    : users.length === 2
      ? `${users[0]} and ${users[1]} are typing...`
      : `${users[0]} and ${users.length - 1} others are typing...`
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-slate-400"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span>{text}</span>
    </motion.div>
  )
}

// Message Reactions Display
const ReactionBadge = ({ emoji, count, isSelected, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors ${
      isSelected 
        ? 'bg-blue-100 border-2 border-blue-300 text-blue-700' 
        : 'bg-slate-100 hover:bg-slate-200 border-2 border-transparent'
    }`}
  >
    <span>{emoji}</span>
    <span className="text-xs font-medium">{count}</span>
  </motion.button>
)

// User Avatar with Status
const UserAvatarWithStatus = ({ user, size = 'md', showStatus = true }) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }
  
  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase()
  
  return (
    <div className="relative">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user?.avatar} />
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
          {getInitials(user?.name || user?.email)}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white rounded-full">
          <OnlineStatus status={user?.status || 'offline'} size="sm" />
        </div>
      )}
    </div>
  )
}

// ==================== SIDEBAR COMPONENTS ====================

// Team/Workspace Selector
const WorkspaceSelector = ({ teams, selectedTeam, onSelect, onCreateTeam }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: selectedTeam?.color || '#6366f1' }}
          >
            {selectedTeam?.icon || '👥'}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-white truncate">{selectedTeam?.name || 'Select Team'}</p>
            <p className="text-xs text-white/60">{selectedTeam?.stats?.memberCount || 0} members</p>
          </div>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-1">
          {teams.map((team) => (
            <motion.button
              key={team.id}
              whileHover={{ x: 4 }}
              onClick={() => { onSelect(team); setOpen(false); }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                selectedTeam?.id === team.id ? 'bg-indigo-100' : 'hover:bg-slate-100'
              }`}
            >
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center text-sm"
                style={{ backgroundColor: team.color || '#6366f1' }}
              >
                {team.icon || '👥'}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{team.name}</p>
                <p className="text-xs text-slate-500">{team.stats?.memberCount || 1} members</p>
              </div>
              {selectedTeam?.id === team.id && <Check className="h-4 w-4 text-indigo-600" />}
            </motion.button>
          ))}
          <Separator className="my-2" />
          <Button variant="ghost" className="w-full justify-start" onClick={onCreateTeam}>
            <Plus className="h-4 w-4 mr-2" /> Create New Team
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Navigation Item
const NavItem = ({ icon: Icon, label, badge, isActive, onClick, variant = 'default' }) => {
  const variants = {
    default: isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
    dm: isActive ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/70 hover:bg-emerald-500/10 hover:text-emerald-300',
    announcement: isActive ? 'bg-amber-500/20 text-amber-300' : 'text-white/70 hover:bg-amber-500/10 hover:text-amber-300'
  }
  
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${variants[variant]}`}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      {badge > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
        >
          {badge > 99 ? '99+' : badge}
        </motion.div>
      )}
    </motion.button>
  )
}

// Channel List Item
const ChannelItem = ({ channel, isActive, unreadCount, onClick }) => {
  const Icon = channel.isPrivate ? Lock : Hash
  
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left text-sm truncate">{channel.displayName || channel.name}</span>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
        >
          {unreadCount}
        </motion.span>
      )}
    </motion.button>
  )
}

// DM User Item
const DMUserItem = ({ dm, isActive, unreadCount, onClick }) => {
  const user = dm.otherUser || { name: dm.displayName }
  
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      <UserAvatarWithStatus user={user} size="sm" />
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium truncate">{user.name || dm.displayName}</p>
        {dm.lastMessage && (
          <p className="text-xs text-white/50 truncate">{dm.lastMessage.content}</p>
        )}
      </div>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center"
        >
          {unreadCount}
        </motion.span>
      )}
    </motion.button>
  )
}

// ==================== MESSAGE COMPONENTS ====================

// Single Message Component
const MessageBubble = ({ 
  message, 
  isOwn, 
  showAvatar, 
  onReaction, 
  onReply, 
  onEdit, 
  onDelete, 
  onPin,
  onCreateTask,
  currentUserId 
}) => {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  const formatTime = (date) => {
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase()
  
  // Check if message contains task-like content
  const hasTaskIndicator = message.content?.includes('TODO:') || 
                          message.content?.includes('TASK:') ||
                          message.content?.includes('ACTION:')
  
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`group flex gap-3 px-4 py-1 hover:bg-slate-50 rounded-lg transition-colors ${message.isDeleted ? 'opacity-50' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar */}
      <div className="w-10 flex-shrink-0">
        {showAvatar ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                {getInitials(message.senderName)}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ) : null}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-900">{message.senderName}</span>
            <span className="text-xs text-slate-400">{formatTime(message.createdAt)}</span>
            {message.isEdited && <span className="text-xs text-slate-400">(edited)</span>}
            {message.isPinned && (
              <Badge variant="secondary" className="h-5 px-1.5 bg-amber-100 text-amber-700">
                <Pin className="h-3 w-3 mr-1" /> Pinned
              </Badge>
            )}
          </div>
        )}
        
        {/* Message Content */}
        <div className="relative">
          {hasTaskIndicator && (
            <div className="absolute -left-3 top-0.5 w-1 h-full bg-amber-500 rounded-full" />
          )}
          <p className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${hasTaskIndicator ? 'pl-2' : ''}`}>
            {message.content}
          </p>
        </div>
        
        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                <File className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-700">{att.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction, i) => (
              <ReactionBadge
                key={i}
                emoji={reaction.emoji}
                count={reaction.count}
                isSelected={reaction.users?.includes(currentUserId)}
                onClick={() => onReaction(message.id, reaction.emoji)}
              />
            ))}
          </div>
        )}
        
        {/* Thread Indicator */}
        {message.replyCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => onReply(message)}
            className="flex items-center gap-2 mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            <MessageCircle className="h-4 w-4" />
            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        )}
      </div>
      
      {/* Hover Actions */}
      <AnimatePresence>
        {showActions && !message.isDeleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-4 -top-3 flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-lg border"
          >
            {/* Emoji Picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_LIST.map(emoji => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 hover:bg-slate-100 rounded text-lg"
                      onClick={() => { onReaction(message.id, emoji); setShowEmojiPicker(false); }}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(message)}>
                    <Reply className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reply in thread</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreateTask(message)}>
                    <ListTodo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create Task</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPin(message.id)}>
                    <Pin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{message.isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy text
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BookMarked className="h-4 w-4 mr-2" /> Save message
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="h-4 w-4 mr-2" /> Forward
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => onDelete(message.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ==================== ANNOUNCEMENT COMPONENT ====================
const AnnouncementCard = ({ announcement, onDismiss }) => {
  const priorityColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-amber-500 bg-amber-50',
    low: 'border-blue-500 bg-blue-50'
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`border-l-4 rounded-r-lg p-4 ${priorityColors[announcement.priority || 'medium']}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white">
            <Megaphone className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{announcement.title}</h4>
            <p className="text-sm text-slate-600 mt-1">{announcement.content}</p>
            <p className="text-xs text-slate-400 mt-2">
              {announcement.authorName} • {new Date(announcement.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ==================== CREATE TASK FROM MESSAGE DIALOG ====================
const CreateTaskDialog = ({ open, onClose, message, onCreateTask }) => {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  })
  
  // Initialize task data when message changes using useMemo instead of useEffect
  const initialTaskData = useMemo(() => {
    if (message) {
      return {
        title: message.content?.substring(0, 100) || '',
        description: `Created from team message by ${message.senderName}:\n\n"${message.content}"`,
        priority: 'medium',
        dueDate: ''
      }
    }
    return { title: '', description: '', priority: 'medium', dueDate: '' }
  }, [message])
  
  // Sync task data when initialTaskData changes
  const currentTaskData = taskData.title ? taskData : initialTaskData
  
  const handleSubmit = () => {
    if (!taskData.title.trim()) {
      toast.error('Task title is required')
      return
    }
    onCreateTask({
      ...currentTaskData,
      sourceMessageId: message?.id,
      sourceChannelId: message?.channelId
    })
    onClose()
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-indigo-600" />
            Create Task from Message
          </DialogTitle>
          <DialogDescription>
            Convert this message into a task that will be tracked in Task Management
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              value={currentTaskData.title}
              onChange={(e) => setTaskData({ ...currentTaskData, title: e.target.value })}
              placeholder="Enter task title..."
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={currentTaskData.description}
              onChange={(e) => setTaskData({ ...currentTaskData, description: e.target.value })}
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={currentTaskData.priority} onValueChange={(v) => setTaskData({ ...currentTaskData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={currentTaskData.dueDate}
                onChange={(e) => setTaskData({ ...currentTaskData, dueDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== ACTIVITY FEED COMPONENT ====================
const ActivityFeed = ({ activities = [], users = [], onNavigate }) => {
  const getActivityIcon = (type) => {
    const icons = {
      message: MessageCircle,
      mention: AtSign,
      reaction: Heart,
      channel_created: Hash,
      team_joined: Users,
      announcement: Megaphone,
      task_created: ListTodo,
      file_shared: File
    }
    return icons[type] || Activity
  }
  
  const getActivityColor = (type) => {
    const colors = {
      message: 'bg-blue-500',
      mention: 'bg-purple-500',
      reaction: 'bg-pink-500',
      channel_created: 'bg-green-500',
      team_joined: 'bg-indigo-500',
      announcement: 'bg-amber-500',
      task_created: 'bg-teal-500',
      file_shared: 'bg-orange-500'
    }
    return colors[type] || 'bg-slate-500'
  }
  
  const formatTimeAgo = (date) => {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now - d) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleDateString()
  }
  
  if (activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-1">No recent activity</h3>
          <p className="text-sm text-slate-500">Your activity feed will appear here</p>
        </div>
      </div>
    )
  }
  
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        {activities.map((activity, idx) => {
          const Icon = getActivityIcon(activity.type)
          return (
            <motion.div
              key={activity.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex gap-3 p-3 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigate?.(activity)}
            >
              <div className={`h-10 w-10 rounded-xl ${getActivityColor(activity.type)} flex items-center justify-center`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{activity.actorName || 'Someone'}</span>
                  {' '}{activity.description || activity.message}
                </p>
                {activity.preview && (
                  <p className="text-xs text-slate-500 truncate mt-1">{activity.preview}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(activity.createdAt)}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ==================== NOTIFICATION CENTER COMPONENT ====================
const NotificationCenter = ({ notifications = [], onMarkRead, onClear }) => {
  const [filter, setFilter] = useState('all') // all, unread, mentions
  
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read)
    if (filter === 'mentions') return notifications.filter(n => n.type === 'mention')
    return notifications
  }, [notifications, filter])
  
  const unreadCount = notifications.filter(n => !n.read).length
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500">{unreadCount}</Badge>
            )}
          </h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
        <div className="flex gap-1">
          {['all', 'unread', 'mentions'].map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredNotifications.map((notif, idx) => (
              <motion.div
                key={notif.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50 hover:bg-blue-100'
                }`}
                onClick={() => onMarkRead?.(notif.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    notif.type === 'mention' ? 'bg-purple-100 text-purple-600' :
                    notif.type === 'announcement' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {notif.type === 'mention' ? <AtSign className="h-4 w-4" /> :
                     notif.type === 'announcement' ? <Megaphone className="h-4 w-4" /> :
                     <MessageCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                    <p className="text-xs text-slate-500 truncate">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(notif.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ==================== USER PROFILE PANEL ====================
const UserProfilePanel = ({ user, onClose, onStartDM }) => {
  if (!user) return null
  
  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase()
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h3 className="font-semibold">Profile</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-6">
        {/* Avatar */}
        <div className="text-center mb-6">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl">
              {getInitials(user.name || user.email)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-slate-900">{user.name || 'Unknown'}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <OnlineStatus status={user.status || 'offline'} size="sm" />
            <span className="text-sm text-slate-600 capitalize">{user.status || 'offline'}</span>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="space-y-2">
          <Button className="w-full" onClick={() => onStartDM?.(user.id)}>
            <MessageCircle className="h-4 w-4 mr-2" /> Message
          </Button>
          <Button variant="outline" className="w-full">
            <Video className="h-4 w-4 mr-2" /> Video Call
          </Button>
          <Button variant="outline" className="w-full">
            <Phone className="h-4 w-4 mr-2" /> Voice Call
          </Button>
        </div>
        
        {/* Info */}
        <Separator className="my-6" />
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-slate-500">Role</Label>
            <p className="font-medium">{user.role || 'Team Member'}</p>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Local Time</Label>
            <p className="font-medium">{new Date().toLocaleTimeString()}</p>
          </div>
          {user.department && (
            <div>
              <Label className="text-xs text-slate-500">Department</Label>
              <p className="font-medium">{user.department}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== STARRED MESSAGES PANEL ====================
const StarredMessagesPanel = ({ messages = [], onNavigate, onClose }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Saved Messages
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <BookMarked className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No saved messages</p>
            <p className="text-sm mt-1">Save important messages to find them later</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigate?.(msg)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                      {(msg.senderName || 'U').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{msg.senderName}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{msg.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================
export function UltimateTeamsHub({ authToken, users = [], currentUser }) {
  // ==================== STATE ====================
  // Core Data
  const [teams, setTeams] = useState([])
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  const [dmChannels, setDmChannels] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [activities, setActivities] = useState([])
  const [notifications, setNotifications] = useState([])
  const [savedMessages, setSavedMessages] = useState([])
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelContent, setRightPanelContent] = useState(null) // 'thread', 'profile', 'members', 'search'
  
  // Selection State
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [activeView, setActiveView] = useState('teams') // 'teams', 'dms', 'activity', 'announcements'
  
  // Thread State
  const [selectedThread, setSelectedThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  
  // Input State
  const [messageInput, setMessageInput] = useState('')
  const [threadInput, setThreadInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingMessage, setEditingMessage] = useState(null)
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  
  // Dialog State
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showInviteMembers, setShowInviteMembers] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [taskSourceMessage, setTaskSourceMessage] = useState(null)
  
  // Form State
  const [teamForm, setTeamForm] = useState({ name: '', description: '', icon: '👥', color: '#6366f1', isPublic: true })
  const [channelForm, setChannelForm] = useState({ name: '', description: '', isPrivate: false, category: 'general' })
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', priority: 'medium' })
  const [selectedUsers, setSelectedUsers] = useState([])
  
  // Refs
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)
  
  // Headers for API calls
  const headers = useMemo(() => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }), [authToken])
  
  // ==================== DATA FETCHING ====================
  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams?type=teams', { headers })
      const data = await res.json()
      if (Array.isArray(data)) {
        setTeams(data)
        if (data.length > 0 && !selectedTeam) {
          setSelectedTeam(data[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }
  
  const fetchChannels = async (teamId) => {
    if (!teamId) return
    try {
      const res = await fetch(`/api/teams?type=channels&teamId=${teamId}`, { headers })
      const data = await res.json()
      if (Array.isArray(data)) {
        setChannels(data)
        // Auto-select first channel or general channel
        if (data.length > 0 && (!selectedChannel || selectedChannel.teamId !== teamId)) {
          const generalChannel = data.find(c => c.name === 'general') || data[0]
          setSelectedChannel(generalChannel)
        }
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    }
  }
  
  const fetchMessages = async (channelId) => {
    if (!channelId) return
    try {
      const res = await fetch(`/api/teams?type=messages&channelId=${channelId}`, { headers })
      const data = await res.json()
      if (Array.isArray(data)) {
        setMessages(data)
        scrollToBottom()
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }
  
  const fetchDMs = async () => {
    try {
      const res = await fetch('/api/teams?type=dms', { headers })
      const data = await res.json()
      if (Array.isArray(data)) setDmChannels(data)
    } catch (error) {
      console.error('Failed to fetch DMs:', error)
    }
  }
  
  const fetchUnread = async () => {
    try {
      const res = await fetch('/api/teams?type=unread', { headers })
      const data = await res.json()
      if (data && typeof data === 'object') setUnreadCounts(data)
    } catch (error) {
      console.error('Failed to fetch unread:', error)
    }
  }
  
  const fetchThread = async (messageId) => {
    try {
      const res = await fetch(`/api/teams?type=threads&threadId=${messageId}`, { headers })
      const data = await res.json()
      if (data.replies) {
        setThreadMessages(data.replies)
      }
    } catch (error) {
      console.error('Failed to fetch thread:', error)
    }
  }
  
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/teams?type=announcements', { headers })
      const data = await res.json()
      if (Array.isArray(data)) setAnnouncements(data)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    }
  }
  
  // ==================== EFFECTS ====================
  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchTeams(), fetchDMs(), fetchUnread(), fetchAnnouncements()])
      setLoading(false)
    }
    load()
    
    // Poll for new messages
    const interval = setInterval(() => {
      if (selectedChannel) fetchMessages(selectedChannel.id)
      fetchUnread()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Load channels when team changes
  useEffect(() => {
    if (selectedTeam) {
      fetchChannels(selectedTeam.id)
    }
  }, [selectedTeam])
  
  // Load messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id)
      markAsRead(selectedChannel.id)
    }
  }, [selectedChannel])
  
  // ==================== ACTIONS ====================
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }
  
  const markAsRead = async (channelId) => {
    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'mark_read', channelId })
      })
      setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }))
    } catch (error) {
      console.error('Mark read error:', error)
    }
  }
  
  // Create Team
  const handleCreateTeam = async () => {
    if (!teamForm.name) {
      toast.error('Team name is required')
      return
    }
    
    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create_team', ...teamForm })
      })
      const data = await res.json()
      
      if (data.team) {
        toast.success(`Team "${data.team.name}" created!`)
        setShowCreateTeam(false)
        setTeamForm({ name: '', description: '', icon: '👥', color: '#6366f1', isPublic: true })
        fetchTeams()
        setSelectedTeam(data.team)
        if (data.defaultChannel) {
          setChannels([data.defaultChannel])
          setSelectedChannel(data.defaultChannel)
        }
      } else {
        toast.error(data.error || 'Failed to create team')
      }
    } catch (error) {
      toast.error('Failed to create team')
    } finally {
      setSending(false)
    }
  }
  
  // Create Channel
  const handleCreateChannel = async () => {
    if (!channelForm.name || !selectedTeam) {
      toast.error('Channel name is required')
      return
    }
    
    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_channel',
          teamId: selectedTeam.id,
          ...channelForm
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success(`Channel #${data.name} created!`)
        setShowCreateChannel(false)
        setChannelForm({ name: '', description: '', isPrivate: false, category: 'general' })
        fetchChannels(selectedTeam.id)
        setSelectedChannel(data)
      } else {
        toast.error(data.error || 'Failed to create channel')
      }
    } catch (error) {
      toast.error('Failed to create channel')
    } finally {
      setSending(false)
    }
  }
  
  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!messageInput.trim() || !selectedChannel) return
    
    setSending(true)
    try {
      // Extract mentions
      const mentionRegex = /@(\w+)/g
      const mentions = []
      let match
      while ((match = mentionRegex.exec(messageInput)) !== null) {
        const mentionedUser = users.find(u =>
          (u.name || u.email).toLowerCase().includes(match[1].toLowerCase())
        )
        if (mentionedUser) mentions.push(mentionedUser.id)
      }
      
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'send_message',
          channelId: selectedChannel.id,
          content: messageInput,
          mentions
        })
      })
      const data = await res.json()
      
      if (data.id) {
        setMessageInput('')
        setMessages(prev => [...prev, data])
        scrollToBottom()
      }
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }
  
  // Handle Reaction
  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'add_reaction', messageId, emoji })
      })
      const data = await res.json()
      
      if (data.reactions) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, reactions: data.reactions } : m
        ))
      }
    } catch (error) {
      toast.error('Failed to add reaction')
    }
  }
  
  // Pin Message
  const handlePinMessage = async (messageId) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'pin_message', messageId, channelId: selectedChannel?.id })
      })
      const data = await res.json()
      
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isPinned: data.isPinned } : m
      ))
      toast.success(data.isPinned ? 'Message pinned' : 'Message unpinned')
    } catch (error) {
      toast.error('Failed to pin message')
    }
  }
  
  // Delete Message
  const handleDeleteMessage = async (messageId) => {
    try {
      await fetch(`/api/teams?type=message&id=${messageId}`, {
        method: 'DELETE',
        headers
      })
      
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      ))
    } catch (error) {
      toast.error('Failed to delete message')
    }
  }
  
  // Open Thread
  const openThread = (message) => {
    setSelectedThread(message)
    setRightPanelContent('thread')
    setRightPanelOpen(true)
    fetchThread(message.id)
  }
  
  // Create Task from Message
  const handleCreateTaskFromMessage = (message) => {
    setTaskSourceMessage(message)
    setShowCreateTask(true)
  }
  
  const submitCreateTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          status: 'todo',
          taskType: 'task',
          sourceType: 'teams_message',
          sourceMessageId: taskData.sourceMessageId,
          sourceChannelId: taskData.sourceChannelId
        })
      })
      
      if (res.ok) {
        toast.success('Task created and added to Task Management!')
        setShowCreateTask(false)
        setTaskSourceMessage(null)
      } else {
        toast.error('Failed to create task')
      }
    } catch (error) {
      toast.error('Failed to create task')
    }
  }
  
  // Create DM
  const handleCreateDM = async (targetUserId) => {
    // Find user info from users array
    const targetUser = users.find(u => u.id === targetUserId)
    
    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          action: 'create_dm', 
          targetUserId,
          targetUserName: targetUser?.name || targetUser?.email,
          targetUserEmail: targetUser?.email
        })
      })
      const data = await res.json()
      
      if (data.id) {
        setShowNewDM(false)
        fetchDMs()
        setActiveView('dms')
        setSelectedChannel(data)
        setSelectedTeam(null)
        toast.success(`Started conversation with ${targetUser?.name || 'User'}`)
      } else {
        toast.error(data.error || 'Failed to create DM')
      }
    } catch (error) {
      toast.error('Failed to create DM')
    } finally {
      setSending(false)
    }
  }
  
  // Create Announcement
  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      toast.error('Title and content are required')
      return
    }
    
    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_announcement',
          teamId: selectedTeam?.id,
          ...announcementForm
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Announcement posted!')
        setShowAnnouncement(false)
        setAnnouncementForm({ title: '', content: '', priority: 'medium' })
        fetchAnnouncements()
      } else {
        toast.error(data.error || 'Failed to post announcement')
      }
    } catch (error) {
      toast.error('Failed to post announcement')
    } finally {
      setSending(false)
    }
  }
  
  // Invite Members
  const handleInviteMembers = async () => {
    if (!selectedTeam || selectedUsers.length === 0) return
    
    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'invite_member',
          teamId: selectedTeam.id,
          userIds: selectedUsers
        })
      })
      const data = await res.json()
      
      if (data.added) {
        toast.success(`${data.added.length} member(s) invited!`)
        setShowInviteMembers(false)
        setSelectedUsers([])
        fetchTeams()
      }
    } catch (error) {
      toast.error('Failed to invite members')
    } finally {
      setSending(false)
    }
  }
  
  // Computed Values
  const totalUnread = useMemo(() => {
    return Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  }, [unreadCounts])
  
  const availableUsers = useMemo(() => {
    if (!selectedTeam) return users
    const memberIds = selectedTeam.members?.map(m => m.userId) || []
    return users.filter(u => !memberIds.includes(u.id))
  }, [users, selectedTeam])
  
  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-12 w-12 text-indigo-600" />
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-xl shadow-2xl overflow-hidden border">
      {/* ==================== SIDEBAR ==================== */}
      <motion.aside
        initial={{ width: 280 }}
        animate={{ width: sidebarCollapsed ? 72 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col"
      >
        {/* Workspace Selector */}
        <div className="p-3 border-b border-white/10">
          {!sidebarCollapsed ? (
            <WorkspaceSelector
              teams={teams}
              selectedTeam={selectedTeam}
              onSelect={(team) => { setSelectedTeam(team); setActiveView('teams'); }}
              onCreateTeam={() => setShowCreateTeam(true)}
            />
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed(false)}
              className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto"
            >
              {selectedTeam?.icon || '👥'}
            </motion.button>
          )}
        </div>
        
        {/* Navigation */}
        <div className="p-2 space-y-1">
          <NavItem
            icon={Home}
            label="Home"
            isActive={activeView === 'teams'}
            onClick={() => setActiveView('teams')}
          />
          <NavItem
            icon={MessageCircle}
            label="Direct Messages"
            badge={dmChannels.reduce((acc, dm) => acc + (unreadCounts[dm.id] || 0), 0)}
            isActive={activeView === 'dms'}
            onClick={() => { setActiveView('dms'); fetchDMs(); }}
            variant="dm"
          />
          <NavItem
            icon={Megaphone}
            label="Announcements"
            badge={announcements.filter(a => !a.dismissed).length}
            isActive={activeView === 'announcements'}
            onClick={() => setActiveView('announcements')}
            variant="announcement"
          />
          <NavItem
            icon={Activity}
            label="Activity"
            isActive={activeView === 'activity'}
            onClick={() => setActiveView('activity')}
          />
          <NavItem
            icon={BookMarked}
            label="Saved Messages"
            isActive={rightPanelContent === 'saved' && rightPanelOpen}
            onClick={() => { setRightPanelContent('saved'); setRightPanelOpen(true); }}
          />
          <NavItem
            icon={Bell}
            label="Notifications"
            badge={notifications.filter(n => !n.read).length}
            isActive={rightPanelContent === 'notifications' && rightPanelOpen}
            onClick={() => { setRightPanelContent('notifications'); setRightPanelOpen(true); }}
          />
        </div>
        
        <Separator className="bg-white/10 my-2" />
        
        {/* Teams View - Channels */}
        {activeView === 'teams' && selectedTeam && !sidebarCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Channels</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => setShowCreateChannel(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-2">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1 pb-4"
              >
                {channels.map((channel) => (
                  <motion.div key={channel.id} variants={itemVariants}>
                    <ChannelItem
                      channel={channel}
                      isActive={selectedChannel?.id === channel.id}
                      unreadCount={unreadCounts[channel.id] || 0}
                      onClick={() => { setSelectedChannel(channel); setActiveView('teams'); }}
                    />
                  </motion.div>
                ))}
                {channels.length === 0 && (
                  <div className="text-center py-8 text-white/40 text-sm">
                    <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No channels yet</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-white/60 hover:text-white"
                      onClick={() => setShowCreateChannel(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
              </motion.div>
            </ScrollArea>
          </div>
        )}
        
        {/* DMs View */}
        {activeView === 'dms' && !sidebarCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Direct Messages</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => setShowNewDM(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-2">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1 pb-4"
              >
                {dmChannels.map((dm) => (
                  <motion.div key={dm.id} variants={itemVariants}>
                    <DMUserItem
                      dm={dm}
                      isActive={selectedChannel?.id === dm.id}
                      unreadCount={unreadCounts[dm.id] || 0}
                      onClick={() => { setSelectedChannel(dm); setSelectedTeam(null); }}
                    />
                  </motion.div>
                ))}
                {dmChannels.length === 0 && (
                  <div className="text-center py-8 text-white/40 text-sm">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-white/60 hover:text-white"
                      onClick={() => setShowNewDM(true)}
                    >
                      Start a conversation
                    </Button>
                  </div>
                )}
              </motion.div>
            </ScrollArea>
          </div>
        )}
        
        {/* Team Actions */}
        {selectedTeam && !sidebarCollapsed && (
          <div className="p-2 border-t border-white/10 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setShowInviteMembers(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Invite People
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setShowAnnouncement(true)}
            >
              <Megaphone className="h-4 w-4 mr-2" /> Post Announcement
            </Button>
          </div>
        )}
        
        {/* Collapse Toggle */}
        <div className="p-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </motion.aside>
      
      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-16 px-6 border-b flex items-center justify-between bg-white"
            >
              <div className="flex items-center gap-3">
                {selectedChannel.isDM ? (
                  <UserAvatarWithStatus user={selectedChannel.otherUser} size="md" />
                ) : selectedChannel.isPrivate ? (
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Hash className="h-5 w-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedChannel.isDM ? selectedChannel.displayName : `#${selectedChannel.name}`}
                  </h3>
                  {selectedChannel.topic && (
                    <p className="text-xs text-slate-500 truncate max-w-md">{selectedChannel.topic}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start Call</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Video className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start Video</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Separator orientation="vertical" className="h-6" />
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => { setRightPanelContent('members'); setRightPanelOpen(!rightPanelOpen); }}>
                        <Users className="h-4 w-4" />
                        <span className="ml-1 text-sm">{selectedChannel.members?.length || 0}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Members</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Pin className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pinned Messages</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 h-9"
                  />
                </div>
              </div>
            </motion.div>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1">
              <div className="py-4">
                {/* Announcements Banner */}
                {activeView === 'teams' && announcements.filter(a => !a.dismissed).length > 0 && (
                  <div className="px-4 mb-4 space-y-2">
                    <AnimatePresence>
                      {announcements.filter(a => !a.dismissed).slice(0, 2).map((announcement) => (
                        <AnnouncementCard
                          key={announcement.id}
                          announcement={announcement}
                          onDismiss={() => setAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, dismissed: true } : a))}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                
                {/* Messages */}
                <AnimatePresence>
                  {messages.map((message, idx) => {
                    const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== message.senderId
                    
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === currentUser?.id}
                        showAvatar={showAvatar}
                        onReaction={handleReaction}
                        onReply={openThread}
                        onEdit={setEditingMessage}
                        onDelete={handleDeleteMessage}
                        onPin={handlePinMessage}
                        onCreateTask={handleCreateTaskFromMessage}
                        currentUserId={currentUser?.id}
                      />
                    )
                  })}
                </AnimatePresence>
                
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-10 w-10 text-indigo-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {selectedChannel.isDM ? 'Start a conversation' : `Welcome to #${selectedChannel.name}`}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedChannel.isDM ? 'Send a message to get started' : 'This is the very beginning of this channel'}
                    </p>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="flex items-end gap-2 bg-slate-50 rounded-xl p-2">
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                            <Plus className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Attach</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <Textarea
                    ref={messageInputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    placeholder={`Message ${selectedChannel.isDM ? selectedChannel.displayName : '#' + selectedChannel.name}`}
                    className="flex-1 min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 p-2"
                    rows={1}
                    disabled={sending}
                  />
                  
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                            <AtSign className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mention</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                          <Smile className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-6 gap-1">
                          {EMOJI_LIST.map(emoji => (
                            <motion.button
                              key={emoji}
                              type="button"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 hover:bg-slate-100 rounded text-lg"
                              onClick={() => setMessageInput(prev => prev + emoji)}
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      disabled={!messageInput.trim() || sending}
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : activeView === 'announcements' ? (
          // Announcements View
          <div className="flex-1 flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="h-16 px-6 border-b flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Announcements</h3>
                  <p className="text-xs text-slate-500">Important updates from your team</p>
                </div>
              </div>
              <Button onClick={() => setShowAnnouncement(true)} className="bg-gradient-to-r from-amber-500 to-orange-500">
                <Plus className="h-4 w-4 mr-2" /> New Announcement
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              {announcements.length === 0 ? (
                <div className="text-center py-16">
                  <Megaphone className="h-16 w-16 text-amber-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">No announcements yet</h3>
                  <p className="text-slate-500 mb-4">Be the first to share an update with your team!</p>
                  <Button onClick={() => setShowAnnouncement(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Post Announcement
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <AnimatePresence>
                    {announcements.map((announcement, idx) => (
                      <motion.div
                        key={announcement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <AnnouncementCard
                          announcement={announcement}
                          onDismiss={() => setAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, dismissed: true } : a))}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </div>
        ) : activeView === 'activity' ? (
          // Activity View
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="h-16 px-6 border-b flex items-center gap-3 bg-white">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Activity Feed</h3>
                <p className="text-xs text-slate-500">Recent activity across all your teams</p>
              </div>
            </div>
            <ActivityFeed 
              activities={activities} 
              users={users}
              onNavigate={(activity) => {
                if (activity.channelId) {
                  const channel = channels.find(c => c.id === activity.channelId)
                  if (channel) {
                    setSelectedChannel(channel)
                    setActiveView('teams')
                  }
                }
              }}
            />
          </div>
        ) : (
          // No Channel Selected (Default Welcome)
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
                <MessageSquare className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Teams</h2>
              <p className="text-slate-500 mb-6 max-w-md">
                Select a channel to start messaging, or create a new team to collaborate with your colleagues.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowCreateTeam(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  <Plus className="h-4 w-4 mr-2" /> Create Team
                </Button>
                <Button variant="outline" onClick={() => setShowNewDM(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" /> Start DM
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      
      {/* ==================== RIGHT PANEL (Thread/Members) ==================== */}
      <AnimatePresence>
        {rightPanelOpen && (
          <motion.div
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-96 border-l bg-slate-50 flex flex-col"
          >
            {/* Thread View */}
            {rightPanelContent === 'thread' && selectedThread && (
              <>
                <div className="h-14 px-4 border-b flex items-center justify-between bg-white">
                  <h3 className="font-semibold">Thread</h3>
                  <Button variant="ghost" size="icon" onClick={() => { setRightPanelOpen(false); setSelectedThread(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {/* Parent Message */}
                  <div className="pb-4 border-b mb-4">
                    <MessageBubble
                      message={selectedThread}
                      isOwn={selectedThread.senderId === currentUser?.id}
                      showAvatar={true}
                      onReaction={handleReaction}
                      onReply={() => {}}
                      onEdit={setEditingMessage}
                      onDelete={handleDeleteMessage}
                      onPin={handlePinMessage}
                      onCreateTask={handleCreateTaskFromMessage}
                      currentUserId={currentUser?.id}
                    />
                  </div>
                  
                  {/* Thread Replies */}
                  <div className="space-y-2">
                    {threadMessages.map((reply) => (
                      <MessageBubble
                        key={reply.id}
                        message={reply}
                        isOwn={reply.senderId === currentUser?.id}
                        showAvatar={true}
                        onReaction={handleReaction}
                        onReply={() => {}}
                        onEdit={setEditingMessage}
                        onDelete={handleDeleteMessage}
                        onPin={handlePinMessage}
                        onCreateTask={handleCreateTaskFromMessage}
                        currentUserId={currentUser?.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Thread Input */}
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Input
                      value={threadInput}
                      onChange={(e) => setThreadInput(e.target.value)}
                      placeholder="Reply..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          // Handle thread reply
                        }
                      }}
                    />
                    <Button disabled={!threadInput.trim() || sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {/* Members View */}
            {rightPanelContent === 'members' && (
              <>
                <div className="h-14 px-4 border-b flex items-center justify-between bg-white">
                  <h3 className="font-semibold">Members ({selectedChannel?.members?.length || 0})</h3>
                  <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    {(selectedChannel?.members || users).map((member) => {
                      const user = member.userId ? users.find(u => u.id === member.userId) || member : member
                      return (
                        <motion.div
                          key={user.id || member.id}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer transition-colors"
                          onClick={() => {
                            setRightPanelContent('profile')
                            // Store selected profile user in state
                          }}
                        >
                          <UserAvatarWithStatus user={user} size="md" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{user.name || user.email}</p>
                            <p className="text-xs text-slate-500">{user.role || 'Member'}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleCreateDM(user.id); }}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
            
            {/* Notifications View */}
            {rightPanelContent === 'notifications' && (
              <NotificationCenter
                notifications={notifications}
                onMarkRead={(id) => {
                  setNotifications(prev => prev.map(n =>
                    n.id === id ? { ...n, read: true } : n
                  ))
                }}
                onClear={() => setNotifications([])}
              />
            )}
            
            {/* Saved Messages View */}
            {rightPanelContent === 'saved' && (
              <StarredMessagesPanel
                messages={savedMessages}
                onNavigate={(msg) => {
                  if (msg.channelId) {
                    const channel = channels.find(c => c.id === msg.channelId)
                    if (channel) {
                      setSelectedChannel(channel)
                      setActiveView('teams')
                    }
                  }
                  setRightPanelOpen(false)
                }}
                onClose={() => setRightPanelOpen(false)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ==================== DIALOGS ==================== */}
      
      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>Teams are shared spaces where your team can collaborate</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg"
                    style={{ backgroundColor: teamForm.color + '20', color: teamForm.color }}
                  >
                    {teamForm.icon}
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Icon</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TEAM_ICONS.map(icon => (
                          <motion.button
                            key={icon}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-slate-100 ${teamForm.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
                            onClick={() => setTeamForm({ ...teamForm, icon })}
                          >
                            {icon}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TEAM_COLORS.map(color => (
                          <motion.button
                            key={color}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            className={`w-8 h-8 rounded-full ${teamForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setTeamForm({ ...teamForm, color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex-1 space-y-2">
                <Label>Team Name</Label>
                <Input
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="e.g., Marketing Team"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                placeholder="What's this team about?"
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Switch
                checked={teamForm.isPublic}
                onCheckedChange={(v) => setTeamForm({ ...teamForm, isPublic: v })}
              />
              <div>
                <Label className="flex items-center gap-2">
                  {teamForm.isPublic ? <Globe className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                  {teamForm.isPublic ? 'Public Team' : 'Private Team'}
                </Label>
                <p className="text-xs text-slate-500">
                  {teamForm.isPublic ? 'Anyone in the organization can join' : 'Only invited members can join'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={sending} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Channel Dialog */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Channel</DialogTitle>
            <DialogDescription>Channels are where your team communicates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel Name</Label>
              <div className="flex items-center bg-slate-50 rounded-lg px-3">
                <Hash className="h-4 w-4 text-slate-400" />
                <Input
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g., announcements"
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={channelForm.description}
                onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                placeholder="What's this channel about?"
              />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Switch
                checked={channelForm.isPrivate}
                onCheckedChange={(v) => setChannelForm({ ...channelForm, isPrivate: v })}
              />
              <div>
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Make Private
                </Label>
                <p className="text-xs text-slate-500">Only specific people can view and join</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChannel(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New DM Dialog */}
      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Start a direct message conversation</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search people..." className="pl-9" />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {users.map(user => (
                  <motion.button
                    key={user.id}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                    onClick={() => handleCreateDM(user.id)}
                  >
                    <UserAvatarWithStatus user={user} size="md" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <p className="text-xs text-slate-500">{user.role || 'Team Member'}</p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-slate-400" />
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Invite Members Dialog */}
      <Dialog open={showInviteMembers} onOpenChange={setShowInviteMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>Add team members to collaborate</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {availableUsers.map(user => (
                  <motion.div
                    key={user.id}
                    whileHover={{ scale: 1.01 }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id) ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedUsers(prev =>
                        prev.includes(user.id)
                          ? prev.filter(id => id !== user.id)
                          : [...prev, user.id]
                      )
                    }}
                  >
                    <Checkbox checked={selectedUsers.includes(user.id)} />
                    <UserAvatarWithStatus user={user} size="sm" showStatus={false} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </motion.div>
                ))}
                {availableUsers.length === 0 && (
                  <p className="text-center text-slate-400 py-8">All users are already team members</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteMembers(false)}>Cancel</Button>
            <Button onClick={handleInviteMembers} disabled={sending || selectedUsers.length === 0}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Announcement Dialog */}
      <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-500" />
              Post Announcement
            </DialogTitle>
            <DialogDescription>Share important updates with your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                placeholder="Announcement title..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                placeholder="What would you like to announce?"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={announcementForm.priority} onValueChange={(v) => setAnnouncementForm({ ...announcementForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">🔴 High Priority</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">🟡 Medium Priority</span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">🔵 Low Priority</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncement(false)}>Cancel</Button>
            <Button onClick={handleCreateAnnouncement} disabled={sending} className="bg-gradient-to-r from-amber-500 to-orange-500">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Task from Message Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onClose={() => { setShowCreateTask(false); setTaskSourceMessage(null); }}
        message={taskSourceMessage}
        onCreateTask={submitCreateTask}
      />
    </div>
  )
}

export default UltimateTeamsHub
