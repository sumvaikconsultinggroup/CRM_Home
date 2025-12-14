import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'
import OpenAI from 'openai'

export async function OPTIONS() {
  return optionsResponse()
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://emergentintegrations.ai/api/v1'
})

// AI Functions
async function analyzeRequirement(requirement, products, materials) {
  const prompt = `You are an expert doors and windows consultant. Analyze this customer requirement and provide intelligent suggestions.

Requirement:
- Title: ${requirement.title}
- Property Type: ${requirement.propertyType || 'Residential'}
- Construction Type: ${requirement.constructionType || 'New'}
- Budget: ₹${requirement.estimatedBudget?.toLocaleString() || 'Not specified'}
- Items needed: ${requirement.items?.map(i => `${i.productType} - ${i.width}x${i.height}mm`).join(', ') || 'Not specified'}

Available Products: ${products.slice(0, 10).map(p => `${p.name} (₹${p.pricePerSqft}/sqft)`).join(', ')}

Provide JSON response with:
1. recommendedProducts: Array of product recommendations with reasons
2. estimatedCost: Realistic cost range
3. frameMaterialSuggestion: Best frame material for their needs
4. glassSuggestion: Recommended glass type
5. energyEfficiencyTips: 2-3 tips for energy efficiency
6. securityRecommendations: Security features to consider
7. maintenanceTips: Maintenance advice`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  })

  try {
    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { rawAnalysis: content }
  } catch {
    return { rawAnalysis: response.choices[0].message.content }
  }
}

async function generateQuoteNarrative(quote, customer) {
  const itemsList = quote.lineItems?.map(i => `- ${i.name} (${i.location}): ${i.width}x${i.height}mm - ₹${i.amount?.toLocaleString()}`).join('\n') || ''
  
  const prompt = `Write a professional, personalized introduction for a uPVC doors and windows quotation.

Customer: ${customer?.name || 'Valued Customer'}
Items:
${itemsList}
Total: ₹${quote.grandTotal?.toLocaleString()}

Write 3-4 sentences that:
1. Welcome the customer warmly
2. Highlight the quality and energy efficiency benefits
3. Mention the warranty and after-sales service
4. Express confidence in meeting their requirements

Keep it professional and suitable for a premium doors & windows brand.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200
  })

  return response.choices[0].message.content
}

async function suggestConfiguration(dimensions, location, requirements) {
  const prompt = `As a doors & windows expert, suggest the best configuration for:
- Dimensions: ${dimensions.width}mm x ${dimensions.height}mm
- Location: ${location || 'General'}
- Requirements: ${requirements || 'Standard residential'}

Provide JSON with:
1. recommendedType: window type (casement, sliding, fixed, etc.)
2. panelConfiguration: Number and type of panels
3. openingDirection: Recommended opening
4. glassRecommendation: Best glass type
5. hardwareRecommendation: Suggested hardware
6. ventilationScore: 1-10
7. securityScore: 1-10
8. reasoning: Brief explanation`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 500
  })

  try {
    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { rawSuggestion: content }
  } catch {
    return { rawSuggestion: response.choices[0].message.content }
  }
}

async function chatWithAI(messages, context) {
  const systemPrompt = `You are MEE AI, an intelligent assistant for a uPVC doors and windows business. You help with:
- Product recommendations based on requirements
- Technical specifications and comparisons
- Energy efficiency and sound insulation advice
- Pricing estimates and quotation assistance
- Installation and maintenance guidance
- Glass and hardware selection

Context: ${context || 'uPVC doors and windows manufacturer/dealer'}

Be helpful, knowledgeable, and professional.`

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

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const aiLogs = db.collection('doors_windows_ai_logs')

    const now = new Date().toISOString()
    let result = null

    if (action === 'analyze_requirement') {
      const { requirementId } = body
      const requirements = db.collection('doors_windows_requirements')
      const products = db.collection('doors_windows_products')
      const materials = db.collection('doors_windows_materials')

      const requirement = await requirements.findOne({ id: requirementId })
      if (!requirement) return errorResponse('Requirement not found', 404)

      const productList = await products.find({ isActive: true }).limit(20).toArray()
      const materialList = await materials.find({ isActive: true }).limit(20).toArray()

      result = await analyzeRequirement(requirement, productList, materialList)

      await requirements.updateOne(
        { id: requirementId },
        { $set: { aiSuggestions: result, aiAnalyzedAt: now } }
      )
    }

    else if (action === 'generate_quote_narrative') {
      const { quoteId } = body
      const quotations = db.collection('doors_windows_quotations')
      const quote = await quotations.findOne({ id: quoteId })
      if (!quote) return errorResponse('Quote not found', 404)

      result = await generateQuoteNarrative(quote, quote.customer)

      await quotations.updateOne(
        { id: quoteId },
        { $set: { aiNarrative: result, updatedAt: now } }
      )
    }

    else if (action === 'suggest_configuration') {
      const { dimensions, location, requirements } = body
      result = await suggestConfiguration(dimensions, location, requirements)
    }

    else if (action === 'chat') {
      const { messages, context } = body
      const settings = await db.collection('doors_windows_settings').findOne({ clientId: user.clientId })
      const businessContext = `Company: ${settings?.general?.companyName || 'Doors & Windows Business'}`
      result = await chatWithAI(messages, context || businessContext)
    }

    else {
      return errorResponse('Invalid action', 400)
    }

    // Log AI interaction
    await aiLogs.insertOne({
      id: uuidv4(),
      action,
      input: body,
      output: result,
      userId: user.id,
      timestamp: now
    })

    return successResponse({ result })
  } catch (error) {
    console.error('Doors-Windows AI Error:', error)
    return errorResponse('AI processing failed', 500, error.message)
  }
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'history'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    if (type === 'history') {
      const aiLogs = db.collection('doors_windows_ai_logs')
      const logs = await aiLogs.find({ userId: user.id })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray()
      
      return successResponse({ logs: sanitizeDocuments(logs) })
    }

    return successResponse({ message: 'No data' })
  } catch (error) {
    console.error('Doors-Windows AI GET Error:', error)
    return errorResponse('Failed to fetch AI data', 500, error.message)
  }
}
