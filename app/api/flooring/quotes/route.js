import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, QuoteStatus, generateFlooringId, DefaultWastage, FlooringCalculations } from '@/lib/db/flooring-schema'

// Generate quote number
const generateQuoteNumber = async (clientId) => {
  const quotes = await getCollection(FlooringCollections.QUOTES)
  const count = await quotes.countDocuments({ clientId })
  const year = new Date().getFullYear()
  return `FLQ-${year}-${String(count + 1).padStart(4, '0')}`
}

// GET - Fetch quotes
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const projectId = searchParams.get('projectId')
    const leadId = searchParams.get('leadId')
    const quoteId = searchParams.get('quoteId')
    const status = searchParams.get('status')

    const quotes = await getCollection(FlooringCollections.QUOTES)
    const quoteItems = await getCollection(FlooringCollections.QUOTE_ITEMS)
    
    // Single quote with items
    if (quoteId) {
      const quote = await quotes.findOne({ id: quoteId })
      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }
      const items = await quoteItems.find({ quoteId }).toArray()
      return NextResponse.json({ ...quote, items })
    }

    // Query multiple quotes
    const query = {}
    if (clientId) query.clientId = clientId
    if (projectId) query.projectId = projectId
    if (leadId) query.leadId = leadId
    if (status) query.status = status

    const result = await quotes.find(query).sort({ createdAt: -1 }).toArray()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Quotes GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

// POST - Create new quote
export async function POST(request) {
  try {
    const body = await request.json()
    const quotes = await getCollection(FlooringCollections.QUOTES)
    const quoteItems = await getCollection(FlooringCollections.QUOTE_ITEMS)
    const rooms = await getCollection(FlooringCollections.ROOMS)

    // Get selected rooms
    const selectedRooms = body.roomIds ? 
      await rooms.find({ id: { $in: body.roomIds } }).toArray() : []

    const quoteNumber = await generateQuoteNumber(body.clientId)
    
    // Calculate totals from items
    const items = body.items || []
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const taxAmount = subtotal * ((body.taxRate || 18) / 100)
    const discountAmount = body.discountType === 'percent' 
      ? subtotal * ((body.discount || 0) / 100)
      : (body.discount || 0)
    const grandTotal = subtotal + taxAmount - discountAmount

    const quote = {
      id: generateFlooringId('FLQ'),
      quoteNumber,
      projectId: body.projectId,
      leadId: body.leadId,
      clientId: body.clientId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      siteAddress: body.siteAddress,
      rooms: selectedRooms.map(r => ({
        id: r.id,
        name: r.roomName,
        area: r.netArea
      })),
      totalArea: selectedRooms.reduce((sum, r) => sum + (r.netArea || 0), 0),
      subtotal,
      taxRate: body.taxRate || 18,
      taxAmount,
      discountType: body.discountType || 'fixed',
      discount: body.discount || 0,
      discountAmount,
      grandTotal,
      currency: body.currency || 'INR',
      validUntil: body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: QuoteStatus.DRAFT,
      terms: body.terms || 'Standard terms and conditions apply.',
      notes: body.notes || '',
      internalNotes: body.internalNotes || '',
      preparedBy: body.preparedBy,
      version: 1,
      previousVersionId: null,
      sentAt: null,
      viewedAt: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await quotes.insertOne(quote)

    // Save quote items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        id: generateFlooringId('FLI'),
        quoteId: quote.id,
        roomId: item.roomId || null,
        itemType: item.itemType || 'material', // material, labor, accessory, service
        productId: item.productId || null,
        category: item.category,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unit: item.unit || 'sqft',
        unitPrice: item.unitPrice,
        wastagePercent: item.wastagePercent || 0,
        wastageQty: item.wastageQty || 0,
        totalPrice: item.totalPrice,
        notes: item.notes || '',
        createdAt: new Date().toISOString()
      }))
      await quoteItems.insertMany(itemsToInsert)
    }

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Flooring Quotes POST Error:', error)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}

// PUT - Update quote
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, items, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })
    }

    const quotes = await getCollection(FlooringCollections.QUOTES)
    const quoteItems = await getCollection(FlooringCollections.QUOTE_ITEMS)

    // Recalculate totals if items provided
    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
      const taxAmount = subtotal * ((updateData.taxRate || 18) / 100)
      const discountAmount = updateData.discountType === 'percent' 
        ? subtotal * ((updateData.discount || 0) / 100)
        : (updateData.discount || 0)
      updateData.subtotal = subtotal
      updateData.taxAmount = taxAmount
      updateData.discountAmount = discountAmount
      updateData.grandTotal = subtotal + taxAmount - discountAmount

      // Update items - delete old and insert new
      await quoteItems.deleteMany({ quoteId: id })
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          id: item.id || generateFlooringId('FLI'),
          quoteId: id,
          roomId: item.roomId || null,
          itemType: item.itemType || 'material',
          productId: item.productId || null,
          category: item.category,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit || 'sqft',
          unitPrice: item.unitPrice,
          wastagePercent: item.wastagePercent || 0,
          wastageQty: item.wastageQty || 0,
          totalPrice: item.totalPrice,
          notes: item.notes || '',
          createdAt: new Date().toISOString()
        }))
        await quoteItems.insertMany(itemsToInsert)
      }
    }

    const result = await quotes.findOneAndUpdate(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Flooring Quotes PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}

// DELETE - Delete quote
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })
    }

    const quotes = await getCollection(FlooringCollections.QUOTES)
    const quoteItems = await getCollection(FlooringCollections.QUOTE_ITEMS)
    
    const quote = await quotes.findOne({ id })
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Delete items first
    await quoteItems.deleteMany({ quoteId: id })
    await quotes.deleteOne({ id })

    return NextResponse.json({ message: 'Quote deleted successfully' })
  } catch (error) {
    console.error('Flooring Quotes DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
  }
}
