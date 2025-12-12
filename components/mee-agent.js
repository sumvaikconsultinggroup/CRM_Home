'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Bot, Send, X, Minimize2, Maximize2, Sparkles, Zap, Brain,
  MessageSquare, Trash2, RefreshCw, Lock, Crown, ArrowRight,
  Lightbulb, Target, FileText, BarChart3, Users, Loader2,
  ChevronDown, Settings, History, PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

// Quick action suggestions
const QUICK_ACTIONS = [
  { icon: Target, label: 'Analyze my leads', prompt: 'Analyze my current leads and suggest which ones I should prioritize today.' },
  { icon: Lightbulb, label: 'Task suggestions', prompt: 'What tasks should I focus on today to maximize productivity?' },
  { icon: FileText, label: 'Draft proposal', prompt: 'Help me draft a professional proposal for a new client.' },
  { icon: BarChart3, label: 'Business insights', prompt: 'Give me insights on my business performance this month.' },
  { icon: Users, label: 'Client follow-ups', prompt: 'Which clients need follow-up and what should I say to them?' },
  { icon: Zap, label: 'Quick tips', prompt: 'Give me 3 quick tips to close more deals this week.' }
]

// Format message with markdown-like styling
const formatMessage = (text) => {
  if (!text) return ''
  
  // Bold text
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Bullet points
  formatted = formatted.replace(/^[•-]\s/gm, '<span class="text-primary mr-2">•</span>')
  
  // Line breaks
  formatted = formatted.replace(/\n/g, '<br/>')
  
  return formatted
}

// Message bubble component
const MessageBubble = ({ message, isUser }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-primary to-indigo-600 text-white rounded-br-md'
              : 'bg-white border shadow-sm rounded-bl-md'
          }`}
        >
          <div 
            className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-700'}`}
            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
          />
          <p className={`text-xs mt-2 ${isUser ? 'text-white/60' : 'text-slate-400'}`}>
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Upgrade prompt component
const UpgradePrompt = ({ onUpgrade }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
    >
      <div className="text-center p-8 max-w-md">
        <div className="relative mb-6">
          <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
            <Lock className="h-4 w-4 text-white" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">Meet Mee AI</h3>
        <p className="text-white/70 mb-6">
          Your intelligent business assistant is an exclusive Enterprise feature.
        </p>
        
        <div className="space-y-3 text-left mb-6">
          {[
            'Smart lead scoring & insights',
            'AI-powered task suggestions',
            'Automated document generation',
            'Natural language data queries',
            'Predictive business analytics'
          ].map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-white/80"
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-sm">{feature}</span>
            </motion.div>
          ))}
        </div>
        
        <Button 
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
          size="lg"
        >
          <Crown className="h-5 w-5 mr-2" />
          Upgrade to Enterprise
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        
        <p className="text-xs text-white/50 mt-4">
          Contact your administrator for upgrade options
        </p>
      </div>
    </motion.div>
  )
}

// Main Mee AI Agent Component
export function MeeAgent({ client, user, stats, leads = [], tasks = [], onUpgrade }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Check if user has Enterprise plan
  const isEnterprise = client?.planId?.toLowerCase() === 'enterprise'

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && isEnterprise) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized, isEnterprise])

  // Build context for AI
  const getContext = useCallback(() => {
    const newLeads = leads.filter(l => l.status === 'new').length
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length
    const revenue = stats?.totalRevenue || 0

    return {
      leadsCount: leads.length,
      newLeads,
      projectsCount: stats?.activeProjects || 0,
      pendingTasks,
      revenue,
      userName: user?.name,
      businessName: client?.businessName
    }
  }, [leads, tasks, stats, user, client])

  // Send message to Mee
  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setShowQuickActions(false)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/mee', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content,
          conversationId,
          context: getContext()
        })
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage = {
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        
        if (data.data.conversationId) {
          setConversationId(data.data.conversationId)
        }
      } else {
        toast.error('Failed to get response from Mee')
      }
    } catch (error) {
      console.error('Mee error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  // Handle quick action click
  const handleQuickAction = (prompt) => {
    sendMessage(prompt)
  }

  // Clear conversation
  const clearConversation = () => {
    setMessages([])
    setConversationId(null)
    setShowQuickActions(true)
  }

  // Render floating button
  const renderFloatingButton = () => (
    <motion.button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-2xl hover:shadow-purple-500/25 flex items-center justify-center z-50 group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Bot className="h-7 w-7" />
      <motion.div
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-white"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      
      {/* Tooltip */}
      <div className="absolute right-full mr-3 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Chat with Mee AI
        {!isEnterprise && <span className="ml-2 text-yellow-400">(Enterprise)</span>}
      </div>
    </motion.button>
  )

  // Render chat window
  const renderChatWindow = () => (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        height: isMinimized ? 'auto' : 600
      }}
      exit={{ opacity: 0, y: 100, scale: 0.8 }}
      className={`fixed bottom-6 right-6 w-[420px] bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-2xl overflow-hidden z-50 border flex flex-col`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold flex items-center gap-2">
                Mee AI
                {isEnterprise && (
                  <Badge className="bg-yellow-500 text-xs">Enterprise</Badge>
                )}
              </h3>
              <p className="text-xs text-white/70">Your intelligent business assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Upgrade prompt for non-Enterprise users */}
          {!isEnterprise && <UpgradePrompt onUpgrade={onUpgrade} />}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && showQuickActions ? (
              <div className="space-y-4">
                {/* Welcome message */}
                <div className="text-center py-6">
                  <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-lg text-slate-800">Hi, I am Mee! 👋</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Your AI-powered business assistant. How can I help you today?
                  </p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action, i) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-white border hover:border-purple-200 hover:bg-purple-50 transition-all text-left group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <action.icon className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message, i) => (
                  <MessageBubble key={i} message={message} isUser={message.role === 'user'} />
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-2 mb-4"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span className="text-sm text-slate-500">Mee is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          {isEnterprise && (
            <div className="p-4 border-t bg-white">
              {messages.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearConversation}
                    className="text-xs text-slate-500 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear chat
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickActions(true)}
                    className="text-xs text-slate-500"
                  >
                    <Lightbulb className="h-3 w-3 mr-1" /> Suggestions
                  </Button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Mee anything..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl"
                />
                <Button 
                  type="submit" 
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              
              <p className="text-xs text-center text-slate-400 mt-2">
                Powered by AI • Mee remembers your conversation
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )

  return (
    <>
      <AnimatePresence>
        {!isOpen && renderFloatingButton()}
        {isOpen && renderChatWindow()}
      </AnimatePresence>
    </>
  )
}

// Mee Preview Card for showing in features
export function MeePreviewCard({ isEnterprise, onUpgrade }) {
  return (
    <Card className="relative overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
      {!isEnterprise && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-yellow-500">
            <Crown className="h-3 w-3 mr-1" /> Enterprise
          </Badge>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Mee AI Agent</CardTitle>
            <p className="text-sm text-muted-foreground">Your intelligent business assistant</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { icon: Target, text: 'Smart lead scoring & insights' },
            { icon: Lightbulb, text: 'AI-powered task suggestions' },
            { icon: FileText, text: 'Automated document generation' },
            { icon: BarChart3, text: 'Natural language data queries' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <item.icon className="h-4 w-4 text-purple-600" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        
        {!isEnterprise && (
          <Button 
            onClick={onUpgrade}
            className="w-full mt-4 bg-gradient-to-r from-violet-500 to-purple-600"
          >
            <Crown className="h-4 w-4 mr-2" /> Upgrade to Unlock
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
