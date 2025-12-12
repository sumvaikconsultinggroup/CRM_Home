'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  MessageSquare, Send, Plus, Users, Search, X, 
  ArrowLeft, Circle, Check, CheckCheck
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

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
  const messagesEndRef = useRef(null)
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

  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv)
    await fetchMessages(conv.id)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversation) return

    try {
      await api.sendMessage(activeConversation.id, newMessage)
      setNewMessage('')
      await fetchMessages(activeConversation.id)
      await fetchConversations()
    } catch (error) {
      toast.error('Failed to send message')
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
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              {messages.map((msg) => {
                const isMe = msg.senderId === user.id
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
