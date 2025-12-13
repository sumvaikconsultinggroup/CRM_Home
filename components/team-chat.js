'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  MessageSquare, Send, Plus, Users, Search, X, 
  ArrowLeft, Circle, Check, CheckCheck, Paperclip,
  Image, FileText, File, Download, Smile, Bell, BellOff,
  MoreVertical, Trash2, Reply, Forward, Copy, Loader2
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// File type icons
const getFileIcon = (type) => {
  if (type?.startsWith('image/')) return Image
  if (type?.includes('pdf') || type?.includes('document')) return FileText
  return File
}

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function TeamChat({ user, users = [], onClose }) {
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const pollIntervalRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.getConversations()
      setConversations(data)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const data = await api.getMessages(conversationId)
      setMessages(data)
      // Mark as read
      await api.markMessagesRead(conversationId)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    
    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchConversations()
      if (activeConversation) {
        fetchMessages(activeConversation.id)
      }
    }, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchConversations, fetchMessages, activeConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Show notification for new messages
  useEffect(() => {
    if (!notificationsEnabled) return
    
    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)
    if (totalUnread > 0 && 'Notification' in window && Notification.permission === 'granted') {
      // Only show if window is not focused
      if (document.hidden) {
        new Notification('New Message', {
          body: `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
          icon: '/favicon.ico'
        })
      }
    }
  }, [conversations, notificationsEnabled])

  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv)
    await fetchMessages(conv.id)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 5MB`)
        return false
      }
      return true
    })

    setAttachments(prev => [...prev, ...validFiles.slice(0, 5 - prev.length)])
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim() && attachments.length === 0) || !activeConversation) return

    try {
      // If there are attachments, simulate upload progress
      if (attachments.length > 0) {
        setUploading(true)
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress(i)
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      // Build message with attachments info
      let messageContent = newMessage
      if (attachments.length > 0) {
        const attachmentNames = attachments.map(f => f.name).join(', ')
        messageContent = messageContent 
          ? `${messageContent}\n📎 Attachments: ${attachmentNames}`
          : `📎 Attachments: ${attachmentNames}`
      }

      await api.sendMessage(activeConversation.id, messageContent)
      setNewMessage('')
      setAttachments([])
      await fetchMessages(activeConversation.id)
      await fetchConversations()
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one team member')
      return
    }

    try {
      const isGroup = selectedUsers.length > 1
      const conv = await api.createConversation(
        selectedUsers,
        isGroup ? groupName || 'Group Chat' : null,
        isGroup
      )
      setShowNewChat(false)
      setSelectedUsers([])
      setGroupName('')
      await fetchConversations()
      setActiveConversation(conv)
    } catch (error) {
      toast.error('Failed to create conversation')
    }
  }

  const getConversationName = (conv) => {
    if (conv.name) return conv.name
    if (conv.isGroup) return 'Group Chat'
    const otherParticipant = conv.participants?.find(p => p.id !== user.id)
    return otherParticipant?.name || 'Unknown'
  }

  const getConversationAvatar = (conv) => {
    if (conv.isGroup) return '👥'
    const otherParticipant = conv.participants?.find(p => p.id !== user.id)
    return otherParticipant?.name?.charAt(0)?.toUpperCase() || '?'
  }

  const filteredUsers = users.filter(u => 
    u.id !== user.id && 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)

  // Quick emoji reactions
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉']

  const insertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeConversation && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setActiveConversation(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <MessageSquare className="h-6 w-6" />
          <div>
            <h2 className="font-bold text-lg">
              {activeConversation ? getConversationName(activeConversation) : 'Team Chat'}
            </h2>
            {!activeConversation && totalUnread > 0 && (
              <p className="text-xs text-white/80">{totalUnread} unread messages</p>
            )}
            {activeConversation && (
              <p className="text-xs text-white/80">
                {activeConversation.isGroup 
                  ? `${activeConversation.participants?.length || 0} members`
                  : 'Direct Message'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </Button>
          
          {!activeConversation && (
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team members..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {selectedUsers.length > 1 && (
                    <Input
                      placeholder="Group name (optional)"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                  )}

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(u.id) ? 'bg-primary/10 border-primary' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => {
                          if (selectedUsers.includes(u.id)) {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                          } else {
                            setSelectedUsers([...selectedUsers, u.id])
                          }
                        }}
                      >
                        <Checkbox checked={selectedUsers.includes(u.id)} />
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-muted-foreground">{u.role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleCreateConversation} className="w-full" disabled={selectedUsers.length === 0}>
                    {selectedUsers.length > 1 ? 'Create Group Chat' : 'Start Chat'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {!activeConversation ? (
          // Conversations List
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start a new chat with your team!</p>
                <Button className="mt-4" onClick={() => setShowNewChat(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Chat
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectConversation(conv)}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                          {getConversationAvatar(conv)}
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold truncate">{getConversationName(conv)}</p>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.senderId === user.id ? 'You: ' : ''}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Chat Messages
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user.id
                  const FileIcon = getFileIcon(msg.fileType)
                  
                  // Parse attachment info from message content
                  const hasAttachment = msg.content?.includes('📎 Attachments:')
                  let messageText = msg.content
                  let attachmentNames = []
                  
                  if (hasAttachment) {
                    const parts = msg.content.split('📎 Attachments:')
                    messageText = parts[0].trim()
                    if (parts[1]) {
                      attachmentNames = parts[1].trim().split(', ').filter(n => n.length > 0)
                    }
                  }
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                        {!isMe && activeConversation?.isGroup && (
                          <p className="text-xs text-muted-foreground mb-1 ml-1">{msg.senderName}</p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isMe
                              ? 'bg-gradient-to-r from-primary to-indigo-600 text-white rounded-br-md'
                              : 'bg-slate-100 text-slate-900 rounded-bl-md'
                          }`}
                        >
                          {/* File attachment preview from stored fileUrl */}
                          {msg.fileUrl && (
                            <div className={`mb-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-200'}`}>
                              {msg.fileType?.startsWith('image/') ? (
                                <img 
                                  src={msg.fileUrl} 
                                  alt="Attachment" 
                                  className="max-w-full rounded-lg max-h-48 object-cover"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <FileIcon className="h-8 w-8" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{msg.fileName}</p>
                                    <p className="text-xs opacity-70">{formatFileSize(msg.fileSize)}</p>
                                  </div>
                                  <Button size="icon" variant="ghost" className="shrink-0">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Render parsed attachments as clickable elements */}
                          {attachmentNames.length > 0 && (
                            <div className={`mb-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Paperclip className="h-4 w-4" />
                                <span className="text-xs font-medium">Attachments</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {attachmentNames.map((name, idx) => {
                                  const extension = name.split('.').pop()?.toLowerCase()
                                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
                                  const AttachIcon = isImage ? Image : FileText
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                        isMe ? 'bg-white/30' : 'bg-slate-300'
                                      }`}
                                    >
                                      <AttachIcon className="h-3 w-3" />
                                      <span className="truncate max-w-[100px]">{name}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Message text */}
                          {messageText && (
                            <p className="text-sm whitespace-pre-wrap">{messageText}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <span className="text-primary">
                              {msg.readBy?.length > 1 ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="px-4 py-2 bg-slate-50 border-t">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                  <Progress value={uploadProgress} className="flex-1 h-2" />
                </div>
              </div>
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => {
                    const FileIcon = getFileIcon(file.type)
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border"
                      >
                        {file.type?.startsWith('image/') ? (
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={file.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <FileIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                        <span className="text-sm truncate max-w-[100px]">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                {/* File Attachment */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= 5}
                  title="Attach files"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                {/* Emoji Picker */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border flex gap-1">
                      {quickEmojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl hover:scale-125 transition-transform"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={uploading}
                />
                <Button 
                  type="submit" 
                  disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
