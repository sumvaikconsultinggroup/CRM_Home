import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch customers (synced with CRM leads/contacts)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const search = searchParams.get('search')
    const type = searchParams.get('type') // lead, contact, customer
    const limit = parseInt(searchParams.get('limit')) || 100

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    
    // Get from both leads and contacts (CRM sync)
    const leads = db.collection('leads')
    const contacts = db.collection('contacts')
    const flooringCustomers = db.collection('flooring_customers')

    if (id) {
      // Check flooring customers first, then leads, then contacts
      let customer = await flooringCustomers.findOne({ id })
      if (!customer) {
        const lead = await leads.findOne({ id })
        if (lead) {
          customer = {
            ...lead,
            source: 'lead',
            sourceId: lead.id
          }
        }
      }
      if (!customer) {
        const contact = await contacts.findOne({ id })
        if (contact) {
          customer = {
            ...contact,
            source: 'contact',
            sourceId: contact.id
          }
        }
      }
      if (!customer) return errorResponse('Customer not found', 404)
      return successResponse(sanitizeDocument(customer))
    }

    // Build unified customer list from all sources
    const [allLeads, allContacts, allFlooringCustomers] = await Promise.all([
      leads.find({}).toArray(),
      contacts.find({}).toArray(),
      flooringCustomers.find({}).toArray()
    ])

    // Merge and deduplicate by email
    const customerMap = new Map()

    // Add flooring-specific customers first (highest priority)
    allFlooringCustomers.forEach(c => {
      const key = c.email?.toLowerCase() || c.id
      customerMap.set(key, {
        ...c,
        source: 'flooring',
        sourceId: c.id,
        hasFlooringHistory: true
      })
    })

    // Add leads
    allLeads.forEach(l => {
      const key = l.email?.toLowerCase() || l.id
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: l.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          company: l.company,
          address: l.address,
          status: l.status,
          value: l.value,
          source: 'lead',
          sourceId: l.id,
          crmLeadId: l.id,
          hasFlooringHistory: false,
          createdAt: l.createdAt
        })
      } else {
        // Merge CRM data
        const existing = customerMap.get(key)
        existing.crmLeadId = l.id
        existing.leadStatus = l.status
        existing.leadValue = l.value
      }
    })

    // Add contacts
    allContacts.forEach(c => {
      const key = c.email?.toLowerCase() || c.id
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          address: c.address,
          type: c.type,
          source: 'contact',
          sourceId: c.id,
          crmContactId: c.id,
          hasFlooringHistory: false,
          createdAt: c.createdAt
        })
      } else {
        const existing = customerMap.get(key)
        existing.crmContactId = c.id
      }
    })

    let customers = Array.from(customerMap.values())

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      customers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search) ||
        c.company?.toLowerCase().includes(searchLower)
      )
    }

    if (type) {
      customers = customers.filter(c => c.source === type)
    }

    // Sort by most recent
    customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return successResponse({
      customers: customers.slice(0, limit),
      total: customers.length,
      sources: {
        leads: allLeads.length,
        contacts: allContacts.length,
        flooringCustomers: allFlooringCustomers.length
      }
    })
  } catch (error) {
    console.error('Customers GET Error:', error)
    return errorResponse('Failed to fetch customers', 500, error.message)
  }
}

// POST - Create/sync customer (also creates in CRM)
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const leads = db.collection('leads')
    const flooringCustomers = db.collection('flooring_customers')

    const customerId = uuidv4()
    const now = new Date().toISOString()

    // Create flooring customer record
    const customer = {
      id: customerId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      mobile: body.mobile,
      company: body.company,
      gstin: body.gstin,
      address: {
        line1: body.address?.line1 || body.address || '',
        line2: body.address?.line2 || '',
        city: body.address?.city || '',
        state: body.address?.state || '',
        pincode: body.address?.pincode || '',
        country: body.address?.country || 'India'
      },
      type: body.type || 'individual', // individual, business
      segment: body.segment || 'retail', // retail, contractor, builder, architect
      notes: body.notes || '',
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }

    await flooringCustomers.insertOne(customer)

    // Sync to CRM - Create as lead if syncToCRM is true
    if (body.syncToCRM !== false) {
      const lead = {
        id: uuidv4(),
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        address: customer.address,
        source: 'flooring_module',
        status: 'new',
        value: body.estimatedValue || 0,
        flooringCustomerId: customerId,
        modules: ['flooring'],
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await leads.insertOne(lead)
      customer.crmLeadId = lead.id

      // Update flooring customer with CRM link
      await flooringCustomers.updateOne({ id: customerId }, { $set: { crmLeadId: lead.id } })
    }

    return successResponse(sanitizeDocument(customer), 201)
  } catch (error) {
    console.error('Customers POST Error:', error)
    return errorResponse('Failed to create customer', 500, error.message)
  }
}

// PUT - Update customer (syncs with CRM)
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return errorResponse('Customer ID required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const flooringCustomers = db.collection('flooring_customers')
    const leads = db.collection('leads')

    updateData.updatedAt = new Date().toISOString()
    updateData.updatedBy = user.id

    const customer = await flooringCustomers.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    // Sync updates to CRM lead if linked
    if (customer?.crmLeadId) {
      await leads.updateOne(
        { id: customer.crmLeadId },
        {
          $set: {
            name: updateData.name || customer.name,
            email: updateData.email || customer.email,
            phone: updateData.phone || customer.phone,
            company: updateData.company || customer.company,
            updatedAt: updateData.updatedAt
          }
        }
      )
    }

    if (!customer) return errorResponse('Customer not found', 404)
    return successResponse(sanitizeDocument(customer))
  } catch (error) {
    console.error('Customers PUT Error:', error)
    return errorResponse('Failed to update customer', 500, error.message)
  }
}
