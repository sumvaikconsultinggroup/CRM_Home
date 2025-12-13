import { v4 as uuidv4 } from 'uuid'
import { getCollection } from '@/lib/db/mongodb'
import { getAuthUser, requireAuth } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Get all contacts for a client
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag') || ''
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const contactsCollection = await getCollection('contacts')

    // Build query
    const query = { clientId: user.clientId }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (tag) {
      query.tags = tag
    }
    
    if (type) {
      query.type = type
    }

    const total = await contactsCollection.countDocuments(query)
    const contacts = await contactsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Get unique tags for filtering
    const allContacts = await contactsCollection.find({ clientId: user.clientId }).toArray()
    const tags = [...new Set(allContacts.flatMap(c => c.tags || []))]
    
    // Get stats
    const stats = {
      total: await contactsCollection.countDocuments({ clientId: user.clientId }),
      customers: await contactsCollection.countDocuments({ clientId: user.clientId, type: 'customer' }),
      leads: await contactsCollection.countDocuments({ clientId: user.clientId, type: 'lead' }),
      vendors: await contactsCollection.countDocuments({ clientId: user.clientId, type: 'vendor' }),
      others: await contactsCollection.countDocuments({ clientId: user.clientId, type: { $nin: ['customer', 'lead', 'vendor'] } })
    }

    return successResponse({
      contacts: sanitizeDocuments(contacts),
      tags,
      stats,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Contacts GET Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to fetch contacts', 500, error.message)
  }
}

// Create a new contact
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { name, email, phone, company, address, type, tags, notes, source, customFields } = body

    if (!name) {
      return errorResponse('Name is required', 400)
    }

    const contactsCollection = await getCollection('contacts')

    // Check for duplicate email
    if (email) {
      const existing = await contactsCollection.findOne({ 
        clientId: user.clientId, 
        email: email.toLowerCase() 
      })
      if (existing) {
        return errorResponse('A contact with this email already exists', 400)
      }
    }

    const contact = {
      id: uuidv4(),
      clientId: user.clientId,
      name,
      email: email?.toLowerCase() || null,
      phone: phone || null,
      company: company || null,
      address: address || null,
      type: type || 'customer', // customer, lead, vendor, other
      tags: tags || [],
      notes: notes || '',
      source: source || 'manual', // manual, import, website, referral
      customFields: customFields || {},
      totalRevenue: 0,
      totalProjects: 0,
      lastContactedAt: null,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await contactsCollection.insertOne(contact)

    return successResponse(sanitizeDocument(contact))
  } catch (error) {
    console.error('Contacts POST Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to create contact', 500, error.message)
  }
}

// Update a contact
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return errorResponse('Contact ID is required', 400)
    }

    const contactsCollection = await getCollection('contacts')

    // Check if contact exists
    const existing = await contactsCollection.findOne({ id, clientId: user.clientId })
    if (!existing) {
      return errorResponse('Contact not found', 404)
    }

    // Check for duplicate email if email is being changed
    if (updateData.email && updateData.email !== existing.email) {
      const duplicate = await contactsCollection.findOne({ 
        clientId: user.clientId, 
        email: updateData.email.toLowerCase(),
        id: { $ne: id }
      })
      if (duplicate) {
        return errorResponse('A contact with this email already exists', 400)
      }
      updateData.email = updateData.email.toLowerCase()
    }

    updateData.updatedAt = new Date()

    await contactsCollection.updateOne(
      { id, clientId: user.clientId },
      { $set: updateData }
    )

    const updated = await contactsCollection.findOne({ id })
    return successResponse(sanitizeDocument(updated))
  } catch (error) {
    console.error('Contacts PUT Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to update contact', 500, error.message)
  }
}

// Delete a contact
export async function DELETE(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Contact ID is required', 400)
    }

    const contactsCollection = await getCollection('contacts')

    const result = await contactsCollection.deleteOne({ id, clientId: user.clientId })
    
    if (result.deletedCount === 0) {
      return errorResponse('Contact not found', 404)
    }

    return successResponse({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('Contacts DELETE Error:', error)
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    return errorResponse('Failed to delete contact', 500, error.message)
  }
}
