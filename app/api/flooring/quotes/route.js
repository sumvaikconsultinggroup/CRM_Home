import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db/mongodb'
import { FlooringCollections, QuoteStatus, generateFlooringId, DefaultWastage, FlooringCalculations } from '@/lib/db/flooring-schema'
import { getClientDb } from '@/lib/db/multitenancy'

// Generate quote number
const generateQuoteNumber = async (clientId) => {
  const quotes = await getCollection(FlooringCollections.QUOTES)
  const count = await quotes.countDocuments({ clientId })
  const year = new Date().getFullYear()
  return `FLQ-${year}-${String(count + 1).padStart(4, '0')}`
}

// Reserve inventory for quote items
const reserveInventory = async (clientId, quoteId, quoteNumber, customerName, items) => {
  try {
    // Get the client's database using the clientId directly
    // clientId format is CL-XXXXXX which is valid for getClientDb
    const db = await getClientDb(clientId)
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    
    const reservations = []
    const errors = []
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    for (const item of items) {
      if (!item.productId) continue
      
      // Check available stock
      const stock = await stockCollection.findOne({
        productId: item.productId,
        warehouseId: 'default'
      })
      
      const availableQty = stock?.availableQuantity ?? stock?.quantity ?? 0
      
      if (availableQty < (item.quantity || 0)) {
        errors.push({
          productId: item.productId,
          productName: item.name,
          requested: item.quantity,
          available: availableQty,
          error: 'Insufficient stock'
        })
        continue
      }
      
      // Create reservation
      const reservation = {
        id: generateFlooringId('RSV'),
        clientId,
        reservationNumber: `RSV-${Date.now().toString(36).toUpperCase()}`,
        quotationId: quoteId,
        quotationNumber: quoteNumber,
        customerName: customerName || null,
        productId: item.productId,
        productName: item.name,
        sku: item.sku || null,
        quantity: item.quantity || 0,
        unit: item.unit || 'sqft',
        warehouseId: 'default',
        status: 'active',
        expiresAt: expiryDate,
        createdBy: 'system',
        createdByName: 'Quote System',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await reservationCollection.insertOne(reservation)
      
      // Update stock - decrease available quantity
      if (stock) {
        await stockCollection.updateOne(
          { productId: item.productId, warehouseId: 'default' },
          {
            $inc: { 
              availableQuantity: -(item.quantity || 0), 
              reservedQuantity: (item.quantity || 0) 
            },
            $set: { updatedAt: new Date() }
          }
        )
      } else {
        // Create stock entry with reserved quantity
        await stockCollection.insertOne({
          productId: item.productId,
          warehouseId: 'default',
          quantity: 0,
          availableQuantity: -(item.quantity || 0),
          reservedQuantity: item.quantity || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      reservations.push(reservation)
    }
    
    return { reservations, errors }
  } catch (error) {
    console.error('Reserve inventory error:', error)
    return { reservations: [], errors: [{ error: error.message }] }
  }
}

// Release inventory reservation when quote is cancelled/deleted
const releaseReservation = async (clientId, quoteId) => {
  try {
    const db = await getClientDb(clientId)
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    
    const reservations = await reservationCollection.find({ 
      quotationId: quoteId, 
      status: 'active' 
    }).toArray()
    
    for (const reservation of reservations) {
      // Restore available quantity
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId || 'default' },
        {
          $inc: { 
            availableQuantity: reservation.quantity, 
            reservedQuantity: -reservation.quantity 
          },
          $set: { updatedAt: new Date() }
        }
      )
      
      // Update reservation status
      await reservationCollection.updateOne(
        { id: reservation.id },
        { 
          $set: { 
            status: 'released', 
            releasedAt: new Date(),
            updatedAt: new Date() 
          } 
        }
      )
    }
    
    return { released: reservations.length }
  } catch (error) {
    console.error('Release reservation error:', error)
    return { released: 0, error: error.message }
  }
}

// Convert reservation to sold (when invoice is created)
export const convertReservation = async (clientId, quoteId) => {
  try {
    const dbName = `client_${clientId.replace(/-/g, '_')}`
    const db = await getClientDb(dbName)
    const reservationCollection = db.collection('inventory_reservations')
    const stockCollection = db.collection('wf_inventory_stock')
    
    const reservations = await reservationCollection.find({ 
      quotationId: quoteId, 
      status: 'active' 
    }).toArray()
    
    for (const reservation of reservations) {
      // Deduct from total stock (reservation was already from available)
      await stockCollection.updateOne(
        { productId: reservation.productId, warehouseId: reservation.warehouseId || 'default' },
        {
          $inc: { 
            quantity: -reservation.quantity, 
            reservedQuantity: -reservation.quantity 
          },
          $set: { updatedAt: new Date() }
        }
      )
      
      // Update reservation status to converted
      await reservationCollection.updateOne(
        { id: reservation.id },
        { 
          $set: { 
            status: 'converted', 
            convertedAt: new Date(),
            updatedAt: new Date() 
          } 
        }
      )
    }
    
    return { converted: reservations.length }
  } catch (error) {
    console.error('Convert reservation error:', error)
    return { converted: 0, error: error.message }
  }
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
      
      // Get reservation status for this quote
      let reservationInfo = null
      if (quote.clientId) {
        try {
          const dbName = `client_${quote.clientId.replace(/-/g, '_')}`
          const db = await getClientDb(dbName)
          const reservationCollection = db.collection('inventory_reservations')
          const reservations = await reservationCollection.find({ quotationId: quoteId }).toArray()
          reservationInfo = {
            totalReservations: reservations.length,
            active: reservations.filter(r => r.status === 'active').length,
            converted: reservations.filter(r => r.status === 'converted').length,
            expired: reservations.filter(r => r.status === 'expired').length,
            reservations
          }
        } catch (e) {
          console.error('Error fetching reservations:', e)
        }
      }
      
      return NextResponse.json({ ...quote, items, reservationInfo })
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

// POST - Create new quote (with inventory reservation)
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

    const quoteId = generateFlooringId('FLQ')
    const quote = {
      id: quoteId,
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
      // Inventory reservation tracking
      inventoryReserved: false,
      reservationErrors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await quotes.insertOne(quote)

    // Save quote items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        id: item.id || generateFlooringId('FLI'),
        quoteId: quote.id,
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

    // RESERVE INVENTORY when quote is created
    if (body.clientId && items.length > 0) {
      const itemsWithProducts = items.filter(item => item.productId)
      if (itemsWithProducts.length > 0) {
        const reservationResult = await reserveInventory(
          body.clientId,
          quoteId,
          quoteNumber,
          body.customerName,
          itemsWithProducts
        )
        
        // Update quote with reservation status
        await quotes.updateOne(
          { id: quoteId },
          {
            $set: {
              inventoryReserved: reservationResult.reservations.length > 0,
              reservedItemsCount: reservationResult.reservations.length,
              reservationErrors: reservationResult.errors,
              updatedAt: new Date().toISOString()
            }
          }
        )
        
        quote.inventoryReserved = reservationResult.reservations.length > 0
        quote.reservedItemsCount = reservationResult.reservations.length
        quote.reservationErrors = reservationResult.errors
      }
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
    
    const existingQuote = await quotes.findOne({ id })
    if (!existingQuote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Recalculate totals if items provided
    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
      const taxAmount = subtotal * ((updateData.taxRate || existingQuote.taxRate || 18) / 100)
      const discountAmount = (updateData.discountType || existingQuote.discountType) === 'percent' 
        ? subtotal * (((updateData.discount ?? existingQuote.discount) || 0) / 100)
        : ((updateData.discount ?? existingQuote.discount) || 0)
      updateData.subtotal = subtotal
      updateData.taxAmount = taxAmount
      updateData.discountAmount = discountAmount
      updateData.grandTotal = subtotal + taxAmount - discountAmount

      // Release old reservations and create new ones if items changed
      if (existingQuote.clientId && existingQuote.inventoryReserved) {
        await releaseReservation(existingQuote.clientId, id)
      }

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
        
        // Re-reserve inventory
        const itemsWithProducts = items.filter(item => item.productId)
        if (itemsWithProducts.length > 0 && existingQuote.clientId) {
          const reservationResult = await reserveInventory(
            existingQuote.clientId,
            id,
            existingQuote.quoteNumber,
            updateData.customerName || existingQuote.customerName,
            itemsWithProducts
          )
          updateData.inventoryReserved = reservationResult.reservations.length > 0
          updateData.reservedItemsCount = reservationResult.reservations.length
          updateData.reservationErrors = reservationResult.errors
        }
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

// DELETE - Delete quote (release reservation)
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

    // Release inventory reservation before deleting
    if (quote.clientId && quote.inventoryReserved) {
      await releaseReservation(quote.clientId, id)
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
