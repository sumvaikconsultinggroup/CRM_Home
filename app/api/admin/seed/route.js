import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'

// Helper functions for generating realistic data
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
const formatDate = (date) => date.toISOString().split('T')[0]

// Sample data pools
const firstNames = ['Amit', 'Priya', 'Rajesh', 'Sneha', 'Vikram', 'Neha', 'Arjun', 'Pooja', 'Karan', 'Divya', 'Rohit', 'Ananya', 'Sanjay', 'Meera', 'Aditya', 'Ritu', 'Nikhil', 'Kavita', 'Manish', 'Swati']
const lastNames = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Verma', 'Joshi', 'Reddy', 'Mehta', 'Shah', 'Malhotra', 'Kapoor', 'Chopra', 'Bhatia', 'Agarwal', 'Tiwari', 'Rao', 'Nair', 'Menon', 'Iyer']
const companies = ['TechnoVision', 'GreenBuild Infra', 'SkyHigh Developers', 'MetroLiving', 'PrimeSpace', 'UrbanNest', 'EliteCraft', 'NeoConstruct', 'VastScape', 'LandMark Estates']
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow']
const areas = ['Bandra', 'Koramangala', 'Jubilee Hills', 'Connaught Place', 'Anna Nagar', 'Viman Nagar', 'Salt Lake', 'CG Road', 'C-Scheme', 'Gomti Nagar']
const projectTypes = ['Residential - Independent', 'Residential - Apartment', 'Commercial - Office', 'Commercial - Retail', 'Hospitality', 'Healthcare', 'Educational']
const leadSources = ['Website', 'Referral', 'Social Media', 'Google Ads', 'Trade Show', 'Cold Call', 'Partner', 'Direct Walk-in']
const leadStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const priorities = ['low', 'medium', 'high', 'urgent']
const taskTypes = ['Follow-up Call', 'Site Visit', 'Send Quotation', 'Meeting', 'Documentation', 'Payment Follow-up']
const products = ['uPVC Windows', 'Aluminium Sliding Doors', 'French Doors', 'Casement Windows', 'Fixed Glass Panels', 'Skylights']

function generatePhone() {
  return `98${randomNumber(10000000, 99999999)}`
}

function generateEmail(firstName, lastName, company) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', company?.toLowerCase().replace(/\s+/g, '') + '.com']
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(domains)}`
}

function generateAddress(city) {
  const houseNo = randomNumber(1, 500)
  const area = randomItem(areas)
  const sector = randomNumber(1, 50)
  return `${houseNo}, ${area}, Sector ${sector}, ${city} - ${randomNumber(100001, 999999)}`
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const { action } = await request.json()

    if (action === 'reset-and-seed') {
      const now = new Date()
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      // Clear existing data
      const collectionsToReset = [
        'contacts', 'leads', 'projects', 'tasks', 'expenses', 'notes',
        'invoices', 'quotations', 'dispatches', 'calendar_events',
        'doors_windows_projects', 'dw_surveys', 'dw_openings', 'dw_quotations',
        'flooring_quotes', 'flooring_invoices', 'flooring_dispatches'
      ]

      for (const col of collectionsToReset) {
        try {
          await db.collection(col).deleteMany({})
        } catch (e) {
          // Collection might not exist
        }
      }

      // 1. Generate Contacts (20 contacts)
      const contacts = []
      for (let i = 0; i < 20; i++) {
        const firstName = randomItem(firstNames)
        const lastName = randomItem(lastNames)
        const company = randomItem(companies)
        const city = randomItem(cities)
        const isCustomer = i < 8
        const isVendor = i >= 15
        
        contacts.push({
          id: uuidv4(),
          clientId: user.clientId,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          email: generateEmail(firstName, lastName, company),
          phone: generatePhone(),
          mobile: generatePhone(),
          company,
          designation: randomItem(['CEO', 'MD', 'Project Manager', 'Architect', 'Interior Designer', 'Procurement Head', 'Site Engineer']),
          type: isCustomer ? 'customer' : isVendor ? 'vendor' : 'lead',
          tags: isCustomer ? ['customer', 'converted-lead'] : isVendor ? ['vendor', 'supplier'] : ['new-lead'],
          address: generateAddress(city),
          city,
          source: randomItem(leadSources),
          notes: `Contact created for ${company}`,
          isActive: true,
          createdAt: randomDate(sixMonthsAgo, now),
          updatedAt: now
        })
      }
      await db.collection('contacts').insertMany(contacts)

      // 2. Generate Leads (15 leads in various stages)
      const leads = []
      const leadDistribution = { new: 3, contacted: 3, qualified: 3, proposal: 2, negotiation: 2, won: 1, lost: 1 }
      
      for (const [stage, count] of Object.entries(leadDistribution)) {
        for (let i = 0; i < count; i++) {
          const firstName = randomItem(firstNames)
          const lastName = randomItem(lastNames)
          const company = randomItem(companies)
          const city = randomItem(cities)
          const value = randomNumber(50000, 2500000)
          const createdDate = randomDate(threeMonthsAgo, now)
          
          leads.push({
            id: uuidv4(),
            clientId: user.clientId,
            title: `${company} - ${randomItem(projectTypes)} Project`,
            name: `${firstName} ${lastName}`,
            contactName: `${firstName} ${lastName}`,
            email: generateEmail(firstName, lastName, company),
            phone: generatePhone(),
            company,
            source: randomItem(leadSources),
            status: stage,
            stage,
            priority: randomItem(priorities),
            value,
            budget: value,
            expectedCloseDate: randomDate(now, new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)),
            probability: stage === 'won' ? 100 : stage === 'lost' ? 0 : randomNumber(10, 90),
            address: generateAddress(city),
            city,
            requirements: `${randomItem(products)} installation for ${randomItem(projectTypes).toLowerCase()} project. Approximately ${randomNumber(10, 100)} openings.`,
            notes: `Lead from ${randomItem(leadSources)}. ${firstName} is the decision maker.`,
            score: randomNumber(10, 100),
            tags: [stage, randomItem(['hot', 'warm', 'cold']), randomItem(['residential', 'commercial'])],
            assignedTo: user.id,
            lastContactDate: randomDate(oneMonthAgo, now),
            nextFollowUp: randomDate(now, new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
            activities: [
              {
                id: uuidv4(),
                type: 'created',
                description: 'Lead created',
                timestamp: createdDate,
                by: user.id
              },
              {
                id: uuidv4(),
                type: 'call',
                description: 'Initial discovery call completed',
                timestamp: randomDate(createdDate, now),
                by: user.id
              }
            ],
            isActive: stage !== 'lost',
            createdBy: user.id,
            createdAt: createdDate,
            updatedAt: now
          })
        }
      }
      await db.collection('leads').insertMany(leads)

      // 3. Generate Projects (10 active projects)
      const projects = []
      const projectStatuses = ['planning', 'in_progress', 'on_hold', 'completed']
      
      for (let i = 0; i < 10; i++) {
        const firstName = randomItem(firstNames)
        const lastName = randomItem(lastNames)
        const city = randomItem(cities)
        const projectType = randomItem(projectTypes)
        const status = i < 7 ? randomItem(['planning', 'in_progress']) : randomItem(projectStatuses)
        const budget = randomNumber(100000, 5000000)
        const startDate = randomDate(threeMonthsAgo, now)
        
        projects.push({
          id: uuidv4(),
          clientId: user.clientId,
          name: `${lastName} ${projectType.split(' ')[0]} - ${city}`,
          projectNumber: `PRJ-${now.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
          clientName: `${firstName} ${lastName}`,
          clientEmail: generateEmail(firstName, lastName, ''),
          clientPhone: generatePhone(),
          siteAddress: generateAddress(city),
          buildingType: projectType,
          status,
          priority: randomItem(priorities),
          budget,
          value: budget,
          startDate,
          expectedEndDate: new Date(startDate.getTime() + randomNumber(30, 180) * 24 * 60 * 60 * 1000),
          progress: status === 'completed' ? 100 : randomNumber(10, 90),
          description: `${projectType} project with ${randomNumber(5, 50)} windows and ${randomNumber(2, 20)} doors installation.`,
          tags: [projectType.toLowerCase().replace(/\s+/g, '-'), city.toLowerCase()],
          team: [user.id],
          milestones: [
            { name: 'Survey Completed', status: 'completed', date: startDate },
            { name: 'Quote Approved', status: status === 'planning' ? 'pending' : 'completed', date: randomDate(startDate, now) },
            { name: 'Production Started', status: ['planning', 'on_hold'].includes(status) ? 'pending' : 'completed', date: randomDate(startDate, now) },
            { name: 'Installation Complete', status: status === 'completed' ? 'completed' : 'pending', date: null }
          ],
          createdBy: user.id,
          createdAt: startDate,
          updatedAt: now
        })
      }
      await db.collection('projects').insertMany(projects)

      // 4. Generate Tasks (25 tasks)
      const tasks = []
      const taskStatuses = ['todo', 'in_progress', 'review', 'completed']
      
      for (let i = 0; i < 25; i++) {
        const project = randomItem(projects)
        const dueDate = randomDate(oneMonthAgo, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        const isOverdue = dueDate < now && Math.random() > 0.5
        
        tasks.push({
          id: uuidv4(),
          clientId: user.clientId,
          title: `${randomItem(taskTypes)} - ${project.name}`,
          description: `Task related to ${project.name}. ${randomItem(['High priority', 'Follow up required', 'Pending client response', 'Internal review needed'])}`,
          projectId: project.id,
          projectName: project.name,
          status: isOverdue ? 'todo' : randomItem(taskStatuses),
          priority: randomItem(priorities),
          dueDate,
          assignedTo: user.id,
          assigneeName: user.name || 'Admin',
          tags: [randomItem(['urgent', 'follow-up', 'documentation', 'site-visit'])],
          isOverdue,
          completedAt: taskStatuses[randomNumber(2, 3)] === 'completed' ? randomDate(dueDate, now) : null,
          createdBy: user.id,
          createdAt: randomDate(threeMonthsAgo, now),
          updatedAt: now
        })
      }
      await db.collection('tasks').insertMany(tasks)

      // 5. Generate Expenses (30 expenses)
      const expenses = []
      const expenseCategories = ['Travel', 'Materials', 'Equipment', 'Office Supplies', 'Marketing', 'Utilities', 'Professional Services', 'Transportation']
      
      for (let i = 0; i < 30; i++) {
        const project = randomItem([...projects, null, null])
        const amount = randomNumber(500, 50000)
        const date = randomDate(sixMonthsAgo, now)
        
        expenses.push({
          id: uuidv4(),
          clientId: user.clientId,
          title: `${randomItem(expenseCategories)} - ${date.toLocaleDateString('en-IN', { month: 'short' })}`,
          description: project ? `Expense for ${project.name}` : 'General business expense',
          amount,
          currency: 'INR',
          category: randomItem(expenseCategories),
          projectId: project?.id || null,
          projectName: project?.name || null,
          date,
          paymentMethod: randomItem(['Cash', 'Bank Transfer', 'Credit Card', 'UPI']),
          status: randomItem(['pending', 'approved', 'reimbursed', 'rejected']),
          vendor: randomItem(companies),
          receiptUrl: null,
          tags: [randomItem(expenseCategories).toLowerCase().replace(/\s+/g, '-')],
          createdBy: user.id,
          createdAt: date,
          updatedAt: now
        })
      }
      await db.collection('expenses').insertMany(expenses)

      // 6. Generate Calendar Events (20 events)
      const calendarEvents = []
      const eventTypes = ['meeting', 'site_visit', 'call', 'task', 'reminder']
      
      for (let i = 0; i < 20; i++) {
        const project = randomItem([...projects, null])
        const lead = randomItem([...leads, null])
        const startTime = randomDate(oneMonthAgo, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        const duration = randomNumber(30, 180)
        
        calendarEvents.push({
          id: uuidv4(),
          clientId: user.clientId,
          title: project ? `${randomItem(taskTypes)} - ${project.name}` : lead ? `Follow-up: ${lead.name}` : randomItem(['Team Meeting', 'Client Call', 'Site Inspection', 'Vendor Meeting']),
          description: `Scheduled ${randomItem(eventTypes)} for ${project?.name || lead?.name || 'general'}`,
          type: randomItem(eventTypes),
          startTime,
          endTime: new Date(startTime.getTime() + duration * 60 * 1000),
          allDay: Math.random() > 0.8,
          projectId: project?.id,
          leadId: lead?.id,
          attendees: [user.id],
          location: project?.siteAddress || 'Office',
          color: randomItem(['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']),
          reminder: randomNumber(15, 60),
          status: startTime < now ? 'completed' : 'scheduled',
          createdBy: user.id,
          createdAt: randomDate(threeMonthsAgo, now),
          updatedAt: now
        })
      }
      await db.collection('calendar_events').insertMany(calendarEvents)

      // 7. Generate Notes (15 notes)
      const notes = []
      
      for (let i = 0; i < 15; i++) {
        const project = randomItem([...projects, null])
        const lead = randomItem([...leads, null])
        
        notes.push({
          id: uuidv4(),
          clientId: user.clientId,
          title: randomItem(['Meeting Notes', 'Site Visit Report', 'Client Requirements', 'Follow-up Notes', 'Technical Specifications', 'Budget Discussion']),
          content: `Notes for ${project?.name || lead?.name || 'general business'}. Key points discussed: ${randomItem(['pricing', 'timeline', 'specifications', 'delivery schedule', 'installation details'])}.`,
          projectId: project?.id,
          leadId: lead?.id,
          tags: [randomItem(['important', 'follow-up', 'technical', 'financial'])],
          isPinned: Math.random() > 0.8,
          createdBy: user.id,
          createdAt: randomDate(threeMonthsAgo, now),
          updatedAt: now
        })
      }
      await db.collection('notes').insertMany(notes)

      // 8. Generate D&W Projects (5 projects for Doors & Windows module)
      const dwProjects = []
      for (let i = 0; i < 5; i++) {
        const project = projects[i]
        
        dwProjects.push({
          id: uuidv4(),
          clientId: user.clientId,
          projectNumber: `DWP-${now.getFullYear()}-${String(i + 1).padStart(5, '0')}`,
          name: project.name,
          crmProjectId: project.id,
          customer: {
            name: project.clientName,
            email: project.clientEmail,
            phone: project.clientPhone,
            address: project.siteAddress
          },
          clientName: project.clientName,
          clientEmail: project.clientEmail,
          clientPhone: project.clientPhone,
          siteAddress: project.siteAddress,
          buildingType: project.buildingType,
          value: project.value,
          budget: project.budget,
          status: 'active',
          priority: project.priority,
          source: 'crm_sync',
          syncedFrom: { type: 'project', id: project.id, syncedAt: now },
          assignedTo: user.id,
          statusHistory: [{
            status: 'active',
            timestamp: now,
            by: user.id,
            notes: 'Project synced from CRM'
          }],
          isActive: true,
          createdBy: user.id,
          createdAt: project.createdAt,
          updatedAt: now
        })
      }
      await db.collection('doors_windows_projects').insertMany(dwProjects)

      // Calculate summary stats
      const stats = {
        contacts: contacts.length,
        leads: leads.length,
        projects: projects.length,
        tasks: tasks.length,
        expenses: expenses.length,
        calendarEvents: calendarEvents.length,
        notes: notes.length,
        dwProjects: dwProjects.length,
        totalValue: leads.reduce((sum, l) => sum + (l.value || 0), 0) + projects.reduce((sum, p) => sum + (p.value || 0), 0)
      }

      return NextResponse.json({
        success: true,
        message: 'Database reset and seeded with dynamic sample data',
        stats
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Seed API Error:', error)
    return NextResponse.json({ error: 'Failed to seed data', details: error.message }, { status: 500 })
  }
}
