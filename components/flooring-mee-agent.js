'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bot, Send, X, Minimize2, Maximize2, Sparkles, Zap, Brain,
  MessageSquare, Trash2, Lightbulb, Target, FileText, BarChart3, 
  Users, Loader2, Lock, Crown, ArrowRight, Layers, Package,
  Calculator, TrendingUp, ShoppingCart, ClipboardList
} from 'lucide-react'
import { toast } from 'sonner'

// Module-specific quick actions for Flooring
const FLOORING_QUICK_ACTIONS = [
  { icon: Package, label: 'Inventory check', prompt: 'Check my flooring inventory status. Which items are running low and need reordering?' },
  { icon: Calculator, label: 'Price calculator', prompt: 'Help me calculate pricing for a wooden flooring installation of 500 sq ft with premium oak wood.' },
  { icon: TrendingUp, label: 'Sales analysis', prompt: 'Analyze my flooring sales performance this month. What are the top-selling products?' },
  { icon: ShoppingCart, label: 'Supplier orders', prompt: 'What materials should I order from suppliers based on current demand and inventory levels?' },
  { icon: ClipboardList, label: 'Project status', prompt: 'Give me an overview of ongoing flooring projects and which ones need attention.' },
  { icon: FileText, label: 'Quote template', prompt: 'Help me create a professional quotation for a residential flooring project.' }
]

// Flooring-specific fallback responses
const FLOORING_FALLBACKS = {
  'inventory': "📦 **Inventory Analysis**\n\nBased on typical flooring business patterns:\n\n**Items to Watch:**\n• Oak planks - Usually fast-moving, check stock levels\n• Underlayment materials - Essential for every installation\n• Transition strips - Often overlooked but frequently needed\n\n**Recommendations:**\n1. Set reorder points at 20% of average monthly usage\n2. Keep 2-week buffer stock for popular items\n3. Review seasonal trends (Q4 usually higher demand)\n\n- Mee 🤖",
  
  'price': "💰 **Pricing Calculator**\n\nFor a 500 sq ft premium oak flooring installation:\n\n**Material Costs:**\n• Oak planks (₹450/sq ft): ₹2,25,000\n• Underlayment: ₹15,000\n• Transitions & trims: ₹8,000\n• Adhesive/fasteners: ₹5,000\n\n**Labor:** ₹35,000 - ₹50,000\n\n**Estimated Total:** ₹2,88,000 - ₹3,03,000\n\n**Pro Tip:** Add 10% material buffer for cuts and waste.\n\n- Mee 🤖",
  
  'sales': "📊 **Sales Performance Insights**\n\n**Top Performers (Typical):**\n1. Engineered hardwood - 35% of sales\n2. Laminate flooring - 28% of sales\n3. Solid hardwood - 22% of sales\n4. Vinyl planks - 15% of sales\n\n**Growth Tips:**\n• Bundle installation with materials for higher margins\n• Offer maintenance packages for recurring revenue\n• Focus on premium products - better margins\n\n- Mee 🤖",
  
  'supplier': "🚚 **Supplier Order Recommendations**\n\n**Priority Orders:**\n1. Check fast-moving SKUs first\n2. Review pending customer orders\n3. Consider lead times (usually 7-14 days)\n\n**Ordering Strategy:**\n• Consolidate orders to save shipping\n• Negotiate volume discounts for bulk orders\n• Maintain relationships with 2-3 suppliers\n\n**Tip:** Order 15% extra for high-demand seasons.\n\n- Mee 🤖",
  
  'project': "📋 **Project Overview**\n\n**Key Focus Areas:**\n\n1. **Pending Installations** - Prioritize by scheduled date\n2. **Material Procurement** - Ensure materials arrive before installation\n3. **Client Communication** - Send updates 48 hours before work\n\n**Best Practices:**\n• Document site conditions before starting\n• Get sign-off on material selections\n• Schedule follow-up inspection after completion\n\n- Mee 🤖",
  
  'quote': "📄 **Professional Quotation Template**\n\n**Quotation Structure:**\n\n1. **Header**\n   - Company name & logo\n   - Quote number & date\n   - Valid until date\n\n2. **Client Details**\n   - Name, address, contact\n\n3. **Scope of Work**\n   - Area specifications\n   - Flooring type selected\n   - Preparation work included\n\n4. **Itemized Costs**\n   - Materials (with brands)\n   - Labor charges\n   - Additional services\n\n5. **Terms & Conditions**\n   - Payment schedule\n   - Warranty information\n   - Timeline\n\nWould you like me to help draft a specific quote?\n\n- Mee 🤖",
  
  'default': "👋 Hi! I'm **Mee**, your Flooring Business Assistant!\n\nI can help you with:\n\n🏭 **Inventory** - Stock levels, reorder alerts\n💰 **Pricing** - Calculate quotes and estimates\n📊 **Sales** - Performance analysis and trends\n🚚 **Suppliers** - Order recommendations\n📋 **Projects** - Status and scheduling\n📄 **Documents** - Quotations and invoices\n\nWhat would you like to explore?\n\n- Mee 🤖"
}

// Determine response type based on message
const getFlooringResponseType = (message) => {
  const msg = message.toLowerCase()
  if (msg.includes('inventory') || msg.includes('stock') || msg.includes('reorder') || msg.includes('low')) return 'inventory'
  if (msg.includes('price') || msg.includes('cost') || msg.includes('calculate') || msg.includes('sq ft') || msg.includes('estimate')) return 'price'
  if (msg.includes('sale') || msg.includes('revenue') || msg.includes('performance') || msg.includes('top selling')) return 'sales'
  if (msg.includes('supplier') || msg.includes('order') || msg.includes('material') || msg.includes('procurement')) return 'supplier'
  if (msg.includes('project') || msg.includes('installation') || msg.includes('schedule') || msg.includes('ongoing')) return 'project'
  if (msg.includes('quote') || msg.includes('quotation') || msg.includes('proposal') || msg.includes('template')) return 'quote'
  return 'default'
}

// Format message with markdown-like styling
const formatMessage = (text) => {
  if (!text) return ''
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/^[•-]\s/gm, '<span class="text-primary mr-2">•</span>')
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
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Layers className="h-4 w-4 text-white" />
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-br-md'
              : 'bg-white border shadow-sm rounded-bl-md'
          }`}
        >
          <div 
            className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-700'}`}
            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
          />
        </div>
      </div>
    </motion.div>
  )
}

// Upgrade prompt for non-Enterprise users
const UpgradePrompt = ({ onUpgrade }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-amber-900/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
    >
      <div className="text-center p-6 max-w-sm">
        <div className="relative mb-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-yellow-500 flex items-center justify-center">
            <Lock className="h-3 w-3 text-white" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">Flooring AI Assistant</h3>
        <p className="text-white/70 text-sm mb-4">
          Unlock AI-powered insights for your flooring business with Enterprise plan.
        </p>
        
        <div className="space-y-2 text-left mb-4">
          {[
            'Smart inventory management',
            'Automated price calculations',
            'Sales trend analysis',
            'Supplier order optimization'
          ].map((feature, i) => (
            <div key={feature} className="flex items-center gap-2 text-white/80 text-sm">
              <Sparkles className="h-3 w-3 text-yellow-400" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
          size="sm"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Enterprise
        </Button>
      </div>
    </motion.div>
  )
}

// Main Flooring Mee Component
export function FlooringMeeAgent({ client, user, moduleData, onUpgrade, onClose }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
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

  useEffect(() => {
    if (!isMinimized && isEnterprise) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isMinimized, isEnterprise])

  // Build context for AI
  const getContext = useCallback(() => {
    return {
      module: 'flooring',
      productsCount: moduleData?.products?.length || 0,
      lowStockItems: moduleData?.inventory?.filter(i => i.quantity < i.reorderPoint)?.length || 0,
      pendingQuotations: moduleData?.quotations?.filter(q => q.status === 'pending')?.length || 0,
      activeProjects: moduleData?.projects?.filter(p => p.status === 'in_progress')?.length || 0,
      businessName: client?.businessName,
      userName: user?.name
    }
  }, [moduleData, client, user])

  // Send message to Mee API
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
          message: `[Flooring Module Context] ${content}`,
          conversationId,
          context: getContext()
        })
      })

      const data = await response.json()

      if (data.response) {
        const aiMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }
      } else {
        // Use flooring-specific fallback
        const fallbackResponse = FLOORING_FALLBACKS[getFlooringResponseType(content)]
        const aiMessage = {
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Mee error:', error)
      // Use flooring-specific fallback on error
      const fallbackResponse = FLOORING_FALLBACKS[getFlooringResponseType(content)]
      const aiMessage = {
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handleQuickAction = (prompt) => {
    sendMessage(prompt)
  }

  const clearConversation = () => {
    setMessages([])
    setConversationId(null)
    setShowQuickActions(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-xl overflow-hidden border-2 border-amber-200 flex flex-col ${isMinimized ? 'h-auto' : 'h-[500px]'}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                Mee - Flooring Assistant
                {isEnterprise && <Badge className="bg-yellow-500 text-xs px-1 py-0">AI</Badge>}
              </h3>
              <p className="text-xs text-white/70">Ask anything about your flooring business</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-7 w-7"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-7 w-7"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Upgrade prompt for non-Enterprise users */}
          {!isEnterprise && <UpgradePrompt onUpgrade={onUpgrade} />}

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 && showQuickActions ? (
              <div className="space-y-3">
                {/* Welcome message */}
                <div className="text-center py-4">
                  <div className="h-12 w-12 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-3">
                    <Layers className="h-6 w-6 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800">Flooring AI Assistant</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Get smart insights for your flooring business
                  </p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  {FLOORING_QUICK_ACTIONS.map((action, i) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border hover:border-amber-300 hover:bg-amber-50 transition-all text-left group"
                    >
                      <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                        <action.icon className="h-3.5 w-3.5 text-amber-600" />
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
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <span className="text-sm text-slate-500">Analyzing...</span>
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
            <div className="p-3 border-t bg-white">
              {messages.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearConversation}
                    className="text-xs text-slate-500 hover:text-red-500 h-6 px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickActions(true)}
                    className="text-xs text-slate-500 h-6 px-2"
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
                  placeholder="Ask about inventory, pricing, sales..."
                  disabled={isLoading}
                  className="flex-1 rounded-lg text-sm h-9"
                />
                <Button 
                  type="submit" 
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg h-9 px-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
