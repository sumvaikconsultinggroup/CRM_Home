import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

// Initialize OpenAI client with Emergent LLM Key
const getAIClient = () => {
  const apiKey = process.env.EMERGENT_LLM_KEY
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.emergent.sh/v1'
  })
}

// Get model based on provider preference
const getModel = (provider = 'openai') => {
  const models = {
    openai: 'gpt-4o',
    claude: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash'
  }
  return models[provider] || models.openai
}

// Fallback responses when AI is unavailable
const FALLBACK_RESPONSES = {
  'lead': "Based on your current leads, I suggest prioritizing those who have shown recent activity. Focus on following up within 24 hours of initial contact.\n\n**Top Tips:**\n• Personalize your outreach based on their interests\n• Schedule follow-ups for optimal times (10 AM - 12 PM)\n• Use a mix of channels (call, email, WhatsApp)\n\n- Mee 🤖",
  'task': "Here are my task recommendations for maximum productivity:\n\n**Priority Tasks:**\n1. Follow up with hot leads first thing in the morning\n2. Complete pending proposals before noon\n3. Schedule client meetings for the afternoon\n4. End day with admin and planning\n\n**Pro Tip:** Block 2-hour focus periods for deep work.\n\n- Mee 🤖",
  'tip': "Here are 3 quick tips to close more deals this week:\n\n1. **Create Urgency** - Offer time-limited discounts or bonuses for quick decisions\n\n2. **Address Objections Proactively** - Don't wait for concerns; address common objections upfront\n\n3. **Follow Up Persistently** - 80% of sales require 5+ follow-ups, but most salespeople give up after 2\n\n**Bonus:** Ask for referrals from happy clients - they convert 4x better!\n\n- Mee 🤖",
  'insight': "Based on your business data, here are key insights:\n\n📊 **Performance Summary:**\n• Your conversion rate is tracking well\n• New leads are coming in steadily\n• Consider focusing on lead quality over quantity\n\n💡 **Recommendations:**\n• Nurture leads that have been in pipeline >2 weeks\n• Set up automated follow-up sequences\n• Track source ROI to optimize marketing spend\n\n- Mee 🤖",
  'default': "I'm Mee, your AI business assistant! I can help you with:\n\n🎯 **Lead Management** - Prioritization, scoring, follow-up suggestions\n📋 **Task Intelligence** - Smart recommendations and scheduling\n📄 **Documents** - Draft proposals, quotes, and emails\n📊 **Insights** - Business analytics and performance tips\n\nWhat would you like to explore?\n\n- Mee 🤖"
}

// Determine response type based on message
const getResponseType = (message) => {
  const msg = message.toLowerCase()
  if (msg.includes('lead') || msg.includes('follow') || msg.includes('client')) return 'lead'
  if (msg.includes('task') || msg.includes('todo') || msg.includes('productiv')) return 'task'
  if (msg.includes('tip') || msg.includes('deal') || msg.includes('close') || msg.includes('sale')) return 'tip'
  if (msg.includes('insight') || msg.includes('analytic') || msg.includes('performance') || msg.includes('business')) return 'insight'
  return 'default'
}

// System prompt for Mee AI Agent
const MEE_SYSTEM_PROMPT = `You are Mee, an intelligent AI assistant for BuildCRM - a construction and home improvement business management platform. You help users with:

1. **Lead Management**: Analyze leads, suggest follow-up actions, score leads based on potential, and recommend best times to contact.

2. **Task Intelligence**: Suggest task priorities, identify overdue items, and recommend workflow improvements.

3. **Client Insights**: Provide insights on client behavior, identify upsell opportunities, and predict potential issues.

4. **Document Generation**: Help draft proposals, quotes, follow-up emails, and meeting summaries.

5. **Data Queries**: Answer questions about business metrics, revenue, projects, and performance.

6. **Smart Recommendations**: Provide actionable suggestions to improve business operations.

Guidelines:
- Be concise but helpful
- Use bullet points for clarity
- Provide specific, actionable advice
- Reference data when available
- Be professional but friendly
- Always sign off with "- Mee 🤖" on important responses

You have access to the user's business context including leads, projects, tasks, and expenses.`

export async function OPTIONS() {
  return optionsResponse()
}

// Chat with Mee
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { message, conversationId, context } = body

    if (!message) {
      return errorResponse('Message is required', 400)
    }

    // Get client info to check plan
    const clientsCollection = await getCollection('clients')
    const client = await clientsCollection.findOne({ id: user.clientId })

    // Check if user has Enterprise plan
    const isEnterprise = client?.planId?.toLowerCase() === 'enterprise'
    
    if (!isEnterprise) {
      return successResponse({
        response: "🔒 **Upgrade Required**\n\nMee AI Agent is an exclusive Enterprise feature. Upgrade your plan to unlock:\n\n• Smart lead scoring & insights\n• AI-powered task suggestions\n• Automated document generation\n• Natural language data queries\n• Predictive analytics\n\nContact your administrator to upgrade to Enterprise!\n\n- Mee 🤖",
        isRestricted: true,
        conversationId: conversationId || uuidv4()
      })
    }

    // Get AI settings (provider preference)
    const settingsCollection = await getCollection('platform_settings')
    const settings = await settingsCollection.findOne({ type: 'global' })
    const provider = settings?.aiProvider?.provider || 'openai'

    // Get conversation history
    const conversationsCollection = await getCollection('mee_conversations')
    let conversation = null
    
    if (conversationId) {
      conversation = await conversationsCollection.findOne({ id: conversationId })
    }

    const messages = conversation?.messages || []

    // Build context from business data
    let businessContext = ''
    if (context) {
      businessContext = `\n\nCurrent Business Context:\n`
      if (context.leadsCount !== undefined) businessContext += `- Total Leads: ${context.leadsCount}\n`
      if (context.newLeads !== undefined) businessContext += `- New Leads: ${context.newLeads}\n`
      if (context.projectsCount !== undefined) businessContext += `- Active Projects: ${context.projectsCount}\n`
      if (context.pendingTasks !== undefined) businessContext += `- Pending Tasks: ${context.pendingTasks}\n`
      if (context.revenue !== undefined) businessContext += `- Total Revenue: ₹${context.revenue?.toLocaleString()}\n`
      if (context.userName) businessContext += `- User: ${context.userName}\n`
      if (context.businessName) businessContext += `- Business: ${context.businessName}\n`
    }

    let aiResponse = ''
    
    // Try calling AI, fallback to pre-defined responses if unavailable
    try {
      // Prepare messages for API
      const apiMessages = [
        { role: 'system', content: MEE_SYSTEM_PROMPT + businessContext },
        ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ]

      // Call AI
      const client_ai = getAIClient()
      const completion = await client_ai.chat.completions.create({
        model: getModel(provider),
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000
      })

      aiResponse = completion.choices[0]?.message?.content || FALLBACK_RESPONSES[getResponseType(message)]
    } catch (aiError) {
      console.error('AI API Error, using fallback:', aiError.message)
      // Use intelligent fallback responses
      aiResponse = FALLBACK_RESPONSES[getResponseType(message)]
    }

    // Save conversation
    const newConvId = conversationId || uuidv4()
    const updatedMessages = [
      ...messages,
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: aiResponse, timestamp: new Date() }
    ]

    await conversationsCollection.updateOne(
      { id: newConvId },
      {
        $set: {
          id: newConvId,
          clientId: user.clientId,
          userId: user.id,
          messages: updatedMessages,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    return successResponse({
      response: aiResponse,
      conversationId: newConvId,
      provider: provider
    })

  } catch (error) {
    console.error('Mee API Error:', error)
    return errorResponse('Failed to process request', 500, error.message)
  }
}

// Get conversation history
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    const conversationsCollection = await getCollection('mee_conversations')

    if (conversationId) {
      const conversation = await conversationsCollection.findOne({ 
        id: conversationId,
        clientId: user.clientId 
      })
      return successResponse(conversation || { messages: [] })
    }

    // Get recent conversations
    const conversations = await conversationsCollection
      .find({ clientId: user.clientId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .toArray()

    return successResponse(conversations)

  } catch (error) {
    console.error('Mee GET Error:', error)
    return errorResponse('Failed to fetch conversations', 500, error.message)
  }
}

// Delete conversation
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return errorResponse('Conversation ID is required', 400)
    }

    const conversationsCollection = await getCollection('mee_conversations')
    await conversationsCollection.deleteOne({ 
      id: conversationId,
      clientId: user.clientId 
    })

    return successResponse({ message: 'Conversation deleted' })

  } catch (error) {
    console.error('Mee DELETE Error:', error)
    return errorResponse('Failed to delete conversation', 500, error.message)
  }
}
