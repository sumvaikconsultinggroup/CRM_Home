import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { generateId, FlooringLeadStatus, QuoteTemplates } from '@/lib/db/flooring-enhanced-schema'

// Generate quote number
const generateQuoteNumber = async (clientId) => {
  const quotes = await getCollection('flooring_quotes_v2')
  const count = await quotes.countDocuments({ clientId })
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  return `FLQ-${year}${month}-${String(count + 1).padStart(4, '0')}`
}

// GET - Fetch quotes with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const quoteId = searchParams.get('id')
    const leadId = searchParams.get('leadId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const template = searchParams.get('template')

    const quotes = await getCollection('flooring_quotes_v2')
    const quoteItems = await getCollection('flooring_quote_items_v2')

    // Single quote with items
    if (quoteId) {
      const quote = await quotes.findOne({ id: quoteId })
      if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      
      const items = await quoteItems.find({ quoteId }).toArray()
      const revisions = await quotes.find({ 
        originalQuoteId: quote.originalQuoteId || quote.id 
      }).sort({ version: -1 }).toArray()
      
      return NextResponse.json({ ...quote, items, revisions })
    }

    // Query with filters
    const query = { clientId }
    if (leadId) query.leadId = leadId
    if (projectId) query.projectId = projectId
    if (status) query.status = status
    if (template) query.template = template

    const result = await quotes.find(query).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Enhanced Quotes GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

// POST - Create new quote
export async function POST(request) {
  try {
    const body = await request.json()
    const quotes = await getCollection('flooring_quotes_v2')
    const quoteItems = await getCollection('flooring_quote_items_v2')
    const leads = await getCollection('leads')

    const quoteNumber = await generateQuoteNumber(body.clientId)
    const quoteId = generateId('FLQ')

    // Calculate totals
    const items = body.items || []
    const materialTotal = items.filter(i => i.itemType === 'material').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    const laborTotal = items.filter(i => i.itemType === 'labor').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    const accessoryTotal = items.filter(i => i.itemType === 'accessory').reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    const subtotal = materialTotal + laborTotal + accessoryTotal
    
    const discountAmount = body.discountType === 'percent' 
      ? subtotal * ((body.discount || 0) / 100)
      : (body.discount || 0)
    
    const taxableAmount = subtotal - discountAmount
    const cgst = taxableAmount * ((body.cgstRate || 9) / 100)
    const sgst = taxableAmount * ((body.sgstRate || 9) / 100)
    const igst = body.isInterstate ? taxableAmount * ((body.igstRate || 18) / 100) : 0
    const totalTax = body.isInterstate ? igst : (cgst + sgst)
    const grandTotal = taxableAmount + totalTax

    const quote = {
      id: quoteId,
      quoteNumber,
      originalQuoteId: quoteId, // For tracking revisions
      version: 1,
      leadId: body.leadId,
      projectId: body.projectId,
      clientId: body.clientId,
      
      // Customer Info
      customer: {
        name: body.customer?.name,
        email: body.customer?.email,
        phone: body.customer?.phone,
        address: body.customer?.address,
        gstin: body.customer?.gstin
      },
      
      // Site Info
      site: {
        address: body.site?.address,
        contactPerson: body.site?.contactPerson,
        contactPhone: body.site?.contactPhone
      },
      
      // Room Summary
      rooms: body.rooms || [],
      totalArea: body.totalArea || 0,
      
      // Template
      template: body.template || 'professional',
      
      // Pricing
      materialTotal,
      laborTotal,
      accessoryTotal,
      subtotal,
      discountType: body.discountType || 'fixed',
      discountValue: body.discount || 0,
      discountAmount,
      taxableAmount,
      cgstRate: body.cgstRate || 9,
      cgst,
      sgstRate: body.sgstRate || 9,
      sgst,
      igstRate: body.igstRate || 18,
      igst,
      isInterstate: body.isInterstate || false,
      totalTax,
      grandTotal,
      currency: 'INR',
      
      // Validity
      validUntil: body.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      
      // Status
      status: 'draft',
      statusHistory: [{
        status: 'draft',
        timestamp: new Date().toISOString(),
        by: body.createdBy
      }],
      
      // Terms & Conditions
      terms: body.terms || getDefaultTerms(),
      paymentTerms: body.paymentTerms || getDefaultPaymentTerms(),
      warranty: body.warranty || getDefaultWarranty(),
      
      // Notes
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      
      // Tracking
      sentAt: null,
      viewedAt: null,
      viewCount: 0,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      convertedToProposalAt: null,
      proposalId: null,
      
      // Audit
      createdBy: body.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await quotes.insertOne(quote)

    // Save quote items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        id: generateId('FLI'),
        quoteId: quote.id,
        lineNumber: index + 1,
        roomId: item.roomId,
        roomName: item.roomName,
        itemType: item.itemType, // material, labor, accessory, service
        productId: item.productId,
        productSku: item.productSku,
        category: item.category,
        name: item.name,
        description: item.description,
        specifications: item.specifications,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        wastagePercent: item.wastagePercent || 0,
        wastageQty: item.wastageQty || 0,
        grossQuantity: item.grossQuantity || item.quantity,
        totalPrice: item.totalPrice,
        notes: item.notes,
        createdAt: new Date().toISOString()
      }))
      await quoteItems.insertMany(itemsToInsert)
    }

    // Update lead status
    if (body.leadId) {
      await leads.updateOne(
        { id: body.leadId },
        { $set: { flooringStatus: 'quote_draft', updatedAt: new Date().toISOString() } }
      )
    }

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Enhanced Quotes POST Error:', error)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}

// PUT - Update quote or change status
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })

    const quotes = await getCollection('flooring_quotes_v2')
    const quoteItems = await getCollection('flooring_quote_items_v2')
    const leads = await getCollection('leads')
    const invoices = await getCollection('flooring_invoices')
    const inventory = await getCollection('flooring_inventory')

    const quote = await quotes.findOne({ id })
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

    const now = new Date().toISOString()

    // Handle specific actions
    switch (action) {
      case 'send':
        // Send quote to customer
        await quotes.updateOne({ id }, {
          $set: { status: 'sent', sentAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'sent', timestamp: now, by: body.by } }
        })
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_sent' } })
        }
        return NextResponse.json({ message: 'Quote sent successfully' })

      case 'mark_viewed':
        await quotes.updateOne({ id }, {
          $set: { viewedAt: quote.viewedAt || now, updatedAt: now },
          $inc: { viewCount: 1 }
        })
        return NextResponse.json({ message: 'Quote marked as viewed' })

      case 'approve':
        await quotes.updateOne({ id }, {
          $set: { status: 'approved', approvedAt: now, updatedAt: now },
          $push: { statusHistory: { status: 'approved', timestamp: now, by: body.by, notes: body.notes } }
        })
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'quote_approved' } })
        }
        return NextResponse.json({ message: 'Quote approved' })

      case 'reject':
        await quotes.updateOne({ id }, {
          $set: { status: 'rejected', rejectedAt: now, rejectionReason: body.reason, updatedAt: now },
          $push: { statusHistory: { status: 'rejected', timestamp: now, by: body.by, reason: body.reason } }
        })
        return NextResponse.json({ message: 'Quote rejected' })

      case 'revise':
        // Create a new version of the quote
        const newQuoteNumber = `${quote.quoteNumber}-R${quote.version}`
        const newQuote = {
          ...quote,
          id: generateId('FLQ'),
          quoteNumber: newQuoteNumber,
          originalQuoteId: quote.originalQuoteId || quote.id,
          version: quote.version + 1,
          status: 'draft',
          statusHistory: [{ status: 'draft', timestamp: now, by: body.by, notes: 'Revision created' }],
          sentAt: null,
          viewedAt: null,
          approvedAt: null,
          createdAt: now,
          updatedAt: now
        }
        delete newQuote._id
        await quotes.insertOne(newQuote)
        
        // Copy items
        const oldItems = await quoteItems.find({ quoteId: quote.id }).toArray()
        if (oldItems.length > 0) {
          const newItems = oldItems.map(item => ({
            ...item,
            id: generateId('FLI'),
            quoteId: newQuote.id,
            createdAt: now
          }))
          newItems.forEach(i => delete i._id)
          await quoteItems.insertMany(newItems)
        }
        
        // Mark old quote as revised
        await quotes.updateOne({ id }, {
          $set: { status: 'revised', updatedAt: now },
          $push: { statusHistory: { status: 'revised', timestamp: now, by: body.by } }
        })
        
        return NextResponse.json({ message: 'Revision created', newQuoteId: newQuote.id })

      case 'convert_to_proposal':
        // Convert approved quote to proposal
        if (quote.status !== 'approved') {
          return NextResponse.json({ error: 'Only approved quotes can be converted' }, { status: 400 })
        }
        
        const proposalId = generateId('FLP')
        await quotes.updateOne({ id }, {
          $set: { 
            convertedToProposalAt: now, 
            proposalId,
            status: 'converted_to_proposal',
            updatedAt: now 
          },
          $push: { statusHistory: { status: 'converted_to_proposal', timestamp: now, by: body.by } }
        })
        
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'proposal_sent' } })
        }
        
        return NextResponse.json({ message: 'Converted to proposal', proposalId })

      case 'create_invoice':
        // Create invoice from approved quote/proposal
        const invoiceId = generateId('FLV')
        const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(await invoices.countDocuments({ clientId: quote.clientId }) + 1).padStart(4, '0')}`
        
        const invoice = {
          id: invoiceId,
          invoiceNumber,
          quoteId: quote.id,
          leadId: quote.leadId,
          projectId: quote.projectId,
          clientId: quote.clientId,
          customer: quote.customer,
          site: quote.site,
          rooms: quote.rooms,
          template: body.invoiceTemplate || 'standard',
          ...quote, // Copy all amounts
          dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'draft',
          payments: [],
          paidAmount: 0,
          balanceAmount: quote.grandTotal,
          createdAt: now,
          updatedAt: now
        }
        delete invoice._id
        delete invoice.id
        invoice.id = invoiceId
        
        await invoices.insertOne(invoice)
        
        // Update quote
        await quotes.updateOne({ id }, {
          $set: { invoiceId, updatedAt: now },
          $push: { statusHistory: { status: 'invoice_created', timestamp: now, by: body.by } }
        })
        
        if (quote.leadId) {
          await leads.updateOne({ id: quote.leadId }, { $set: { flooringStatus: 'invoice_sent' } })
        }
        
        // Reduce inventory
        const items = await quoteItems.find({ quoteId: quote.id, itemType: 'material' }).toArray()
        for (const item of items) {
          if (item.productId) {
            await inventory.updateOne(
              { productId: item.productId, clientId: quote.clientId },
              {
                $inc: { quantity: -item.grossQuantity, availableQty: -item.grossQuantity },
                $push: {
                  movements: {
                    id: generateId('MOV'),
                    type: 'sale',
                    quantity: item.grossQuantity,
                    reference: invoiceNumber,
                    quoteId: quote.id,
                    invoiceId,
                    createdAt: now
                  }
                }
              }
            )
          }
        }
        
        return NextResponse.json({ message: 'Invoice created', invoiceId })

      default:
        // Regular update
        const result = await quotes.findOneAndUpdate(
          { id },
          { $set: { ...updateData, updatedAt: now } },
          { returnDocument: 'after' }
        )
        return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Enhanced Quotes PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}

// Default content helpers
function getDefaultTerms() {
  return `1. This quotation is valid for 15 days from the date of issue.
2. Prices are subject to change without prior notice.
3. 50% advance payment required to confirm the order.
4. Balance payment due before material delivery.
5. Delivery within 7-10 working days after order confirmation.
6. Installation timeline will be confirmed after site inspection.
7. Any additional work not mentioned in this quote will be charged extra.
8. Warranty terms as per manufacturer's policy.`
}

function getDefaultPaymentTerms() {
  return `Payment Schedule:
- 50% Advance with order confirmation
- 40% Before material delivery
- 10% After installation completion

Payment Methods:
- Bank Transfer (NEFT/RTGS/IMPS)
- UPI Payment
- Cheque (Subject to realization)`
}

function getDefaultWarranty() {
  return `Warranty Coverage:
- Material: As per manufacturer warranty (typically 10-25 years)
- Installation: 1 year from completion date
- Covers manufacturing defects and installation issues
- Does not cover damage from misuse, water, or improper maintenance`
}
