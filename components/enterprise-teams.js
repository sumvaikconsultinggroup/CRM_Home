'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Plus, Search, Hash, Lock, Send, Smile, Paperclip, MoreHorizontal,
  Users, MessageSquare, AtSign, Pin, Reply, Edit, Trash2, Check,
  ChevronDown, ChevronRight, Settings, Bell, BellOff, Star,
  UserPlus, LogOut, RefreshCw, Loader2, X, Image, File, Link2,
  Circle, Home, Inbox, BookMarked, MoreVertical, ThumbsUp, Heart,
  Laugh, PartyPopper, Zap, Eye, EyeOff, Globe, LockKeyhole
} from 'lucide-react'
import { toast } from 'sonner'

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯', '🔥', '✅', '⭐']

const TEAM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', 
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
]

const TEAM_ICONS = ['👥', '🚀', '💼', '🎯', '⚡', '🌟', '🔧', '📊', '🎨', '💡']

export function EnterpriseTeams({ authToken, users = [] }) {
  // State
  const [teams, setTeams] = useState([])
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  const [dmChannels, setDmChannels] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Selection state
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [activeView, setActiveView] = useState('teams') // teams, dms
  
  // Dialog state
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showInviteMembers, setShowInviteMembers] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)
  const [showThread, setShowThread] = useState(false)
  const [selectedThread, setSelectedThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  
  // Message input state
  const [messageInput, setMessageInput] = useState('')
  const [threadInput, setThreadInput] = useState('')
  const [editingMessage, setEditingMessage] = useState(null)
  const [editContent, setEditContent] = useState('')
  
  // Form state
  const [teamForm, setTeamForm] = useState({ name: '', description: '', icon: '👥', color: '#6366f1', isPublic: true })
  const [channelForm, setChannelForm] = useState({ name: '', description: '', isPrivate: false })
  const [selectedUsers, setSelectedUsers] = useState([])
  
  // Refs
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }), [authToken])

  // Fetch functions
  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams?type=teams', { headers })
      const data = await res.json()
      if (Array.isArray(data)) setTeams(data)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const fetchChannels = async (teamId) => {
    if (!teamId) return
    try {
      const res = await fetch(`/api/teams?type=channels&teamId=${teamId}`, { headers })
      const data = await res.json()
      if (Array.isArray(data)) setChannels(data)
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

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchTeams(), fetchDMs(), fetchUnread()])
      setLoading(false)
    }
    load()
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (selectedChannel) fetchMessages(selectedChannel.id)
      fetchUnread()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Load channels when team is selected
  useEffect(() => {
    if (selectedTeam) {
      fetchChannels(selectedTeam.id)
    }
  }, [selectedTeam])

  // Load messages when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id)
      markAsRead(selectedChannel.id)
    }
  }, [selectedChannel])

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

  // Action handlers
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
        setChannelForm({ name: '', description: '', isPrivate: false })
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

  const handleCreateDM = async (targetUserId) => {
    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create_dm', targetUserId })
      })
      const data = await res.json()
      
      if (data.id) {
        setShowNewDM(false)
        fetchDMs()
        setActiveView('dms')
        setSelectedChannel(data)
        setSelectedTeam(null)
      } else {
        toast.error(data.error || 'Failed to create DM')
      }
    } catch (error) {
      toast.error('Failed to create DM')
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!messageInput.trim() || !selectedChannel) return

    setSending(true)
    try {
      // Extract mentions from message
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

  const handleSendReply = async () => {
    if (!threadInput.trim() || !selectedThread) return

    setSending(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          action: 'send_message',
          channelId: selectedThread.channelId,
          content: threadInput,
          replyTo: selectedThread.id
        })
      })
      const data = await res.json()
      
      if (data.id) {
        setThreadInput('')
        setThreadMessages(prev => [...prev, data])
        // Update reply count in main messages
        setMessages(prev => prev.map(m => 
          m.id === selectedThread.id ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
        ))
      }
    } catch (error) {
      toast.error('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

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

  const handlePinMessage = async (messageId) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'pin_message', messageId, channelId: selectedChannel.id })
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

  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) return

    try {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ type: 'message', id: messageId, content: editContent })
      })
      
      if (res.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: editContent, isEdited: true } : m
        ))
        setEditingMessage(null)
        setEditContent('')
      }
    } catch (error) {
      toast.error('Failed to edit message')
    }
  }

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

  const openThread = (message) => {
    setSelectedThread(message)
    setShowThread(true)
    fetchThread(message.id)
  }

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

  // Filter available users for invite (not already in team)
  const availableUsers = useMemo(() => {
    if (!selectedTeam) return users
    const memberIds = selectedTeam.members?.map(m => m.userId) || []
    return users.filter(u => !memberIds.includes(u.id))
  }, [users, selectedTeam])

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-xl shadow-lg overflow-hidden border">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Workspace Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Teams</h2>
            <Button size="sm" variant="ghost" className="text-white hover:bg-slate-800" onClick={() => setShowCreateTeam(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-2">
          <Button 
            variant="ghost" 
            className={`w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 ${activeView === 'teams' ? 'bg-slate-800 text-white' : ''}`}
            onClick={() => setActiveView('teams')}
          >
            <Users className="h-4 w-4 mr-2" /> Teams
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 ${activeView === 'dms' ? 'bg-slate-800 text-white' : ''}`}
            onClick={() => { setActiveView('dms'); fetchDMs(); }}
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Direct Messages
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <Badge className="ml-auto bg-red-500">{Object.values(unreadCounts).reduce((a, b) => a + b, 0)}</Badge>
            )}
          </Button>
        </div>

        <Separator className="bg-slate-700" />

        {/* Teams/Channels List */}
        <ScrollArea className="flex-1">
          {activeView === 'teams' && (
            <div className="p-2 space-y-1">
              {teams.map(team => (
                <div key={team.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 ${selectedTeam?.id === team.id ? 'bg-slate-800 text-white' : ''}`}
                    onClick={() => { setSelectedTeam(team); setSelectedChannel(null); setActiveView('teams'); }}
                  >
                    <span className="mr-2">{team.icon}</span>
                    <span className="truncate">{team.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{team.stats?.memberCount || 1}</Badge>
                  </Button>

                  {/* Channels under selected team */}
                  {selectedTeam?.id === team.id && (
                    <div className="ml-4 mt-1 space-y-1">
                      {channels.map(channel => (
                        <Button
                          key={channel.id}
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-slate-400 hover:text-white hover:bg-slate-700 ${selectedChannel?.id === channel.id ? 'bg-slate-700 text-white' : ''}`}
                          onClick={() => setSelectedChannel(channel)}
                        >
                          {channel.isPrivate ? <Lock className="h-3 w-3 mr-2" /> : <Hash className="h-3 w-3 mr-2" />}
                          <span className="truncate">{channel.displayName || channel.name}</span>
                          {unreadCounts[channel.id] > 0 && (
                            <Badge className="ml-auto bg-red-500 text-xs">{unreadCounts[channel.id]}</Badge>
                          )}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-slate-500 hover:text-white"
                        onClick={() => setShowCreateChannel(true)}
                      >
                        <Plus className="h-3 w-3 mr-2" /> Add channel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {teams.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No teams yet</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowCreateTeam(true)}>
                    Create Team
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === 'dms' && (
            <div className="p-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-400 hover:text-white mb-2"
                onClick={() => setShowNewDM(true)}
              >
                <Plus className="h-3 w-3 mr-2" /> New message
              </Button>
              
              {dmChannels.map(dm => {
                const otherMember = dm.members?.find(m => m.userName !== dm.displayName) || dm.members?.[1]
                return (
                  <Button
                    key={dm.id}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700 ${selectedChannel?.id === dm.id ? 'bg-slate-700 text-white' : ''}`}
                    onClick={() => { setSelectedChannel(dm); setSelectedTeam(null); }}
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarFallback className="text-xs bg-slate-600">
                        {getInitials(dm.displayName || otherMember?.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{dm.displayName || otherMember?.userName}</span>
                    {unreadCounts[dm.id] > 0 && (
                      <Badge className="ml-auto bg-red-500 text-xs">{unreadCounts[dm.id]}</Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Team Actions */}
        {selectedTeam && (
          <div className="p-2 border-t border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-400 hover:text-white"
              onClick={() => setShowInviteMembers(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Invite people
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-14 px-4 border-b flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                {selectedChannel.isDM ? (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(selectedChannel.displayName)}</AvatarFallback>
                  </Avatar>
                ) : selectedChannel.isPrivate ? (
                  <Lock className="h-5 w-5 text-slate-500" />
                ) : (
                  <Hash className="h-5 w-5 text-slate-500" />
                )}
                <div>
                  <h3 className="font-semibold">{selectedChannel.displayName || selectedChannel.name}</h3>
                  {selectedChannel.topic && (
                    <p className="text-xs text-slate-500">{selectedChannel.topic}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Users className="h-4 w-4" />
                  <span className="ml-1 text-sm">{selectedChannel.members?.length || 0}</span>
                </Button>
                <Button variant="ghost" size="sm">
                  <Pin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, idx) => {
                  const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== message.senderId
                  
                  return (
                    <div key={message.id} className={`group flex gap-3 ${message.isDeleted ? 'opacity-50' : ''}`}>
                      {showAvatar ? (
                        <Avatar className="h-9 w-9 mt-1">
                          <AvatarFallback className="bg-indigo-100 text-indigo-600">
                            {getInitials(message.senderName)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-9" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {showAvatar && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{message.senderName}</span>
                            <span className="text-xs text-slate-400">{formatTime(message.createdAt)}</span>
                            {message.isEdited && <span className="text-xs text-slate-400">(edited)</span>}
                            {message.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                          </div>
                        )}
                        
                        {editingMessage === message.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleEditMessage(message.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingMessage(null); setEditContent(''); }}>Cancel</Button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        
                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm flex items-center gap-1"
                                onClick={() => handleReaction(message.id, reaction.emoji)}
                              >
                                {reaction.emoji} <span className="text-xs text-slate-500">{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Thread indicator */}
                        {message.replyCount > 0 && (
                          <button
                            className="text-xs text-indigo-600 hover:underline mt-1 flex items-center gap-1"
                            onClick={() => openThread(message)}
                          >
                            <MessageSquare className="h-3 w-3" />
                            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                        
                        {/* Message Actions (show on hover) */}
                        {!message.isDeleted && (
                          <div className="hidden group-hover:flex items-center gap-1 mt-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <Smile className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                <div className="flex gap-1">
                                  {EMOJI_LIST.map(emoji => (
                                    <button
                                      key={emoji}
                                      className="p-1 hover:bg-slate-100 rounded"
                                      onClick={() => handleReaction(message.id, emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openThread(message)}>
                              <Reply className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handlePinMessage(message.id)}>
                              <Pin className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2"
                              onClick={() => { setEditingMessage(message.id); setEditContent(message.content); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={() => handleDeleteMessage(message.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message ${selectedChannel.isDM ? selectedChannel.displayName : '#' + selectedChannel.name}`}
                  className="flex-1"
                  disabled={sending}
                />
                <Button type="submit" disabled={!messageInput.trim() || sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a channel to start messaging</p>
              <p className="text-sm">Or create a new team to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Thread Panel */}
      <AnimatePresence>
        {showThread && selectedThread && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l bg-slate-50 flex flex-col"
          >
            <div className="h-14 px-4 border-b flex items-center justify-between bg-white">
              <h3 className="font-semibold">Thread</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowThread(false); setSelectedThread(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {/* Parent message */}
              <div className="pb-4 border-b mb-4">
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {getInitials(selectedThread.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{selectedThread.senderName}</span>
                      <span className="text-xs text-slate-400">{formatTime(selectedThread.createdAt)}</span>
                    </div>
                    <p className="text-sm">{selectedThread.content}</p>
                  </div>
                </div>
              </div>
              
              {/* Replies */}
              <div className="space-y-4">
                {threadMessages.map(reply => (
                  <div key={reply.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                        {getInitials(reply.senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{reply.senderName}</span>
                        <span className="text-xs text-slate-400">{formatTime(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Reply input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  value={threadInput}
                  onChange={(e) => setThreadInput(e.target.value)}
                  placeholder="Reply..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                />
                <Button onClick={handleSendReply} disabled={!threadInput.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
            <DialogDescription>Teams are shared spaces where your team can collaborate</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: teamForm.color + '20', color: teamForm.color }}
                  >
                    {teamForm.icon}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Icon</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TEAM_ICONS.map(icon => (
                          <button
                            key={icon}
                            className={`w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 ${teamForm.icon === icon ? 'ring-2 ring-indigo-500' : ''}`}
                            onClick={() => setTeamForm({ ...teamForm, icon })}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TEAM_COLORS.map(color => (
                          <button
                            key={color}
                            className={`w-6 h-6 rounded-full ${teamForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setTeamForm({ ...teamForm, color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex-1">
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
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={teamForm.isPublic} 
                onCheckedChange={(v) => setTeamForm({ ...teamForm, isPublic: v })} 
              />
              <div>
                <Label className="flex items-center gap-2">
                  {teamForm.isPublic ? <Globe className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                  {teamForm.isPublic ? 'Public' : 'Private'}
                </Label>
                <p className="text-xs text-slate-500">
                  {teamForm.isPublic ? 'Anyone in the organization can join' : 'Only invited members can join'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
            <DialogDescription>Channels are where your team communicates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel Name</Label>
              <div className="flex items-center">
                <span className="text-slate-400 mr-1">#</span>
                <Input
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g., announcements"
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
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={channelForm.isPrivate} 
                onCheckedChange={(v) => setChannelForm({ ...channelForm, isPrivate: v })} 
              />
              <div>
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Make private
                </Label>
                <p className="text-xs text-slate-500">Only specific people can view and join</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChannel(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={sending}>Create</Button>
          </DialogFooter>
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
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUsers.includes(user.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}
                    onClick={() => {
                      setSelectedUsers(prev => 
                        prev.includes(user.id) 
                          ? prev.filter(id => id !== user.id)
                          : [...prev, user.id]
                      )
                    }}
                  >
                    <Checkbox checked={selectedUsers.includes(user.id)} />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
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
              Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
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
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50"
                    onClick={() => handleCreateDM(user.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseTeams
