import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import OpenAI from 'openai'

export async function OPTIONS() {
  return optionsResponse()
}

// Initialize OpenAI with Emergent key
const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY || 'sk-emergent-1Af2133Ce57BfE12b3',
  baseURL: 'https://emergentintegrations.ai/api/v1'
})

// AI Analysis functions
async function analyzeRequirement(requirement, products, materials) {
  const prompt = `You are an expert furniture manufacturing consultant. Analyze this customer requirement and provide intelligent suggestions.

Requirement:
- Title: ${requirement.title}
- Budget: ₹${requirement.estimatedBudget?.toLocaleString() || 'Not specified'}
- Timeline: ${requirement.timeline || 'Flexible'}
- Customer Notes: ${requirement.items?.map(i => i.description).join(', ') || 'No specific items'}
- Room Types: ${requirement.items?.map(i => i.roomType).join(', ') || 'Not specified'}

Available Products: ${products.slice(0, 10).map(p => `${p.name} (₹${p.basePrice})`).join(', ')}

Provide JSON response with:
1. suggestedProducts: Array of product recommendations with reasons
2. estimatedCost: Realistic cost estimate range
3. timelineRecommendation: Suggested timeline in days
4. designSuggestions: 2-3 design tips based on the requirement
5. riskFactors: Any potential issues to watch out for
6. upsellOpportunities: Additional items that could complement the order`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  })

  try {
    const content = response.choices[0].message.content
    // Try to parse as JSON, fallback to text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { rawAnalysis: content }
  } catch {
    return { rawAnalysis: response.choices[0].message.content }
  }
}

async function generateQuoteNarrative(quote, customer) {
  const itemsList = quote.lineItems?.map(i => `- ${i.productName}: ₹${i.lineTotal?.toLocaleString()}`).join('\n') || ''
  
  const prompt = `Write a personalized, luxury-brand style introduction for a furniture quote.

Customer: ${customer?.name || 'Valued Customer'}
Items:
${itemsList}
Total: ₹${quote.grandTotal?.toLocaleString()}

Write 2-3 sentences that:
1. Welcome the customer warmly
2. Highlight the craftsmanship and quality
3. Express excitement about the project

Keep it professional yet warm, suitable for a luxury furniture brand.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200
  })

  return response.choices[0].message.content
}

async function suggestMaterials(productType, budget, style) {
  const prompt = `As a furniture material expert, suggest the best materials for:
- Product: ${productType}
- Budget Level: ${budget} (low/medium/high/luxury)
- Style: ${style || 'modern'}

Provide JSON with:
1. primaryMaterial: Main material recommendation with reason
2. finishOptions: 3 finish options suitable for this
3. hardwareSuggestions: Recommended hardware brands/types
4. alternativeMaterials: 2 alternatives at different price points
5. careInstructions: Brief care tips for the recommended materials`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500
  })

  try {
    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { rawSuggestion: content }
  } catch {
    return { rawSuggestion: response.choices[0].message.content }
  }
}

async function predictLeadTime(items, currentLoad) {
  const prompt = `As a production planning expert, estimate lead time for:

Items to produce:
${items.map(i => `- ${i.name || i.productName}: Qty ${i.quantity || 1}`).join('\n')}

Current workshop load: ${currentLoad || 'moderate'}

Provide JSON with:
1. estimatedDays: Total estimated days
2. breakdown: Production phase breakdown
3. rushPossible: Boolean if rush delivery is feasible
4. rushPremium: Percentage premium for rush
5. riskFactors: Factors that could delay production`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 400
  })

  try {
    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { rawPrediction: content }
  } catch {
    return { rawPrediction: response.choices[0].message.content }
  }
}

async function analyzeCustomerHistory(orders, interactions) {
  const orderSummary = orders.map(o => `${o.orderNumber}: ₹${o.grandTotal?.toLocaleString()} - ${o.status}`).join(', ')
  
  const prompt = `Analyze this customer's history and provide insights:

Previous Orders: ${orderSummary || 'First-time customer'}
Total Interactions: ${interactions?.length || 0}

Provide JSON with:
1. customerSegment: VIP/Regular/New/At-Risk
2. preferredStyle: Inferred style preference
3. pricePoint: Typical spending range
4. recommendedApproach: How to approach this customer
5. crossSellOpportunities: Products they might like
6. retentionRisk: Low/Medium/High with reason`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 400
  })

  try {
    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { rawAnalysis: content }
  } catch {
    return { rawAnalysis: response.choices[0].message.content }
  }
}

async function chatWithAI(messages, context) {
  const systemPrompt = `You are MEE AI, an intelligent assistant for a furniture manufacturing/dealer business. You help with:
- Answering questions about products, materials, and pricing
- Providing design suggestions and recommendations
- Explaining production processes and timelines
- Helping with customer inquiries
- Offering business insights

Context about the business:
${context || 'General furniture business'}

Be helpful, professional, and knowledgeable about furniture manufacturing.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 800
  })

  return response.choices[0].message.content
}

// POST - AI Actions
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const aiLogs = db.collection('furniture_ai_logs')

    const now = new Date().toISOString()
    const logId = uuidv4()

    let result = null

    // Analyze requirement and suggest products
    if (action === 'analyze_requirement') {
      const { requirementId } = body
      
      const requirements = db.collection('furniture_requirements')
      const products = db.collection('furniture_products')
      const materials = db.collection('furniture_materials')

      const requirement = await requirements.findOne({ id: requirementId })
      if (!requirement) return errorResponse('Requirement not found', 404)

      const productList = await products.find({ isActive: true }).limit(20).toArray()
      const materialList = await materials.find({ isActive: true }).limit(20).toArray()

      result = await analyzeRequirement(requirement, productList, materialList)

      // Store AI suggestion with requirement
      await requirements.updateOne(
        { id: requirementId },
        { $set: { aiSuggestions: result, aiAnalyzedAt: now } }
      )
    }

    // Generate quote narrative
    else if (action === 'generate_quote_narrative') {
      const { quoteId } = body
      
      const quotes = db.collection('furniture_quotations')
      const quote = await quotes.findOne({ id: quoteId })
      if (!quote) return errorResponse('Quote not found', 404)

      result = await generateQuoteNarrative(quote, quote.customer)

      // Store with quote
      await quotes.updateOne(
        { id: quoteId },
        { $set: { aiNarrative: result, updatedAt: now } }
      )
    }

    // Suggest materials for a product
    else if (action === 'suggest_materials') {
      const { productType, budget, style } = body
      result = await suggestMaterials(productType, budget, style)
    }

    // Predict lead time
    else if (action === 'predict_lead_time') {
      const { items, currentLoad } = body
      result = await predictLeadTime(items, currentLoad)
    }

    // Analyze customer
    else if (action === 'analyze_customer') {
      const { customerId } = body
      
      const orders = db.collection('furniture_orders')
      const customerOrders = await orders.find({ 
        'customer.id': customerId,
        isActive: true 
      }).toArray()

      result = await analyzeCustomerHistory(customerOrders, [])
    }

    // Chat with AI assistant
    else if (action === 'chat') {
      const { messages, context } = body
      
      // Get business context
      const settings = await db.collection('furniture_settings').findOne({ clientId: user.clientId })
      const businessContext = `Company: ${settings?.general?.companyName || 'Furniture Business'}, Type: ${settings?.general?.businessType || 'manufacturer'}`
      
      result = await chatWithAI(messages, context || businessContext)
    }

    // Smart pricing suggestion
    else if (action === 'suggest_pricing') {
      const { productId, materials, dimensions, customizations } = body
      
      const prompt = `As a pricing expert for custom furniture, suggest pricing for:
- Product type: ${productId}
- Materials: ${materials?.join(', ') || 'Standard'}
- Dimensions: ${JSON.stringify(dimensions) || 'Standard'}
- Customizations: ${customizations?.join(', ') || 'None'}

Provide JSON with:
1. suggestedPrice: Base price recommendation
2. priceRange: {min, max} competitive range
3. marginAnalysis: Suggested margin percentage
4. competitivePosition: Where this sits in market
5. pricingStrategy: Recommended pricing approach`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 400
      })

      try {
        const content = response.choices[0].message.content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawSuggestion: content }
      } catch {
        result = { rawSuggestion: response.choices[0].message.content }
      }
    }

    // Generate design description from images
    else if (action === 'describe_design') {
      const { imageUrl, context } = body
      
      result = {
        description: 'AI image analysis would describe the furniture design, materials visible, style classification, and suggested improvements.',
        note: 'Image analysis requires vision-enabled model'
      }
    }

    else {
      return errorResponse('Invalid action', 400)
    }

    // Log AI interaction
    await aiLogs.insertOne({
      id: logId,
      action,
      input: body,
      output: result,
      model: 'gpt-4o-mini',
      userId: user.id,
      timestamp: now
    })

    return successResponse({ result, logId })
  } catch (error) {
    console.error('Furniture AI Error:', error)
    return errorResponse('AI processing failed', 500, error.message)
  }
}

// GET - Get AI insights/history
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'history'
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'history') {
      const aiLogs = db.collection('furniture_ai_logs')
      const logs = await aiLogs.find({ userId: user.id })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray()
      
      return successResponse({ logs: sanitizeDocuments(logs) })
    }

    if (type === 'suggestions' && entityType && entityId) {
      let collection = null
      if (entityType === 'requirement') collection = 'furniture_requirements'
      if (entityType === 'quotation') collection = 'furniture_quotations'
      
      if (collection) {
        const entity = await db.collection(collection).findOne({ id: entityId })
        return successResponse({ 
          suggestions: entity?.aiSuggestions || null,
          analyzedAt: entity?.aiAnalyzedAt || null
        })
      }
    }

    return successResponse({ message: 'No data' })
  } catch (error) {
    console.error('Furniture AI GET Error:', error)
    return errorResponse('Failed to fetch AI data', 500, error.message)
  }
}
