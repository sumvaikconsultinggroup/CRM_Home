import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireAuth, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse, sanitizeDocuments, sanitizeDocument } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Fetch post-invoicing data (challans, installations, payments, receipts, etc.)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // challan, installation, payment, receipt, warranty, amc, all
    const invoiceId = searchParams.get('invoiceId')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    let result = {}

    // Fetch Delivery Challans
    if (!type || type === 'all' || type === 'challan') {
      const challans = db.collection('dw_delivery_challans')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      if (orderId) query.orderId = orderId
      if (status) query.status = status
      
      const challanList = await challans.find(query).sort({ createdAt: -1 }).toArray()
      result.challans = sanitizeDocuments(challanList)
      
      // Stats
      result.challanStats = {
        total: challanList.length,
        pending: challanList.filter(c => c.status === 'pending').length,
        dispatched: challanList.filter(c => c.status === 'dispatched').length,
        delivered: challanList.filter(c => c.status === 'delivered').length,
        partial: challanList.filter(c => c.status === 'partial').length
      }
    }

    // Fetch Installations
    if (!type || type === 'all' || type === 'installation') {
      const installations = db.collection('dw_installations')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      if (orderId) query.orderId = orderId
      if (status) query.status = status
      
      const installList = await installations.find(query).sort({ scheduledDate: -1 }).toArray()
      result.installations = sanitizeDocuments(installList)
      
      result.installationStats = {
        total: installList.length,
        scheduled: installList.filter(i => i.status === 'scheduled').length,
        inProgress: installList.filter(i => i.status === 'in-progress').length,
        completed: installList.filter(i => i.status === 'completed').length,
        rescheduled: installList.filter(i => i.status === 'rescheduled').length,
        cancelled: installList.filter(i => i.status === 'cancelled').length
      }
    }

    // Fetch Payments
    if (!type || type === 'all' || type === 'payment') {
      const payments = db.collection('dw_payment_collections')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      
      const paymentList = await payments.find(query).sort({ date: -1 }).toArray()
      result.payments = sanitizeDocuments(paymentList)
      
      const totalCollected = paymentList.reduce((sum, p) => sum + (p.amount || 0), 0)
      result.paymentStats = {
        total: paymentList.length,
        totalCollected,
        cash: paymentList.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0),
        upi: paymentList.filter(p => p.method === 'upi').reduce((sum, p) => sum + (p.amount || 0), 0),
        bank: paymentList.filter(p => p.method === 'bank_transfer').reduce((sum, p) => sum + (p.amount || 0), 0),
        cheque: paymentList.filter(p => p.method === 'cheque').reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    }

    // Fetch Receipts
    if (!type || type === 'all' || type === 'receipt') {
      const receipts = db.collection('dw_receipts')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      
      const receiptList = await receipts.find(query).sort({ createdAt: -1 }).toArray()
      result.receipts = sanitizeDocuments(receiptList)
    }

    // Fetch Warranties
    if (!type || type === 'all' || type === 'warranty') {
      const warranties = db.collection('dw_warranties')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      if (status) query.status = status
      
      const warrantyList = await warranties.find(query).sort({ createdAt: -1 }).toArray()
      result.warranties = sanitizeDocuments(warrantyList)
      
      result.warrantyStats = {
        total: warrantyList.length,
        active: warrantyList.filter(w => w.status === 'active').length,
        expired: warrantyList.filter(w => w.status === 'expired').length,
        claimed: warrantyList.filter(w => w.claimsCount > 0).length
      }
    }

    // Fetch AMC Contracts
    if (!type || type === 'all' || type === 'amc') {
      const amcs = db.collection('dw_amc_contracts')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      if (status) query.status = status
      
      const amcList = await amcs.find(query).sort({ createdAt: -1 }).toArray()
      result.amcs = sanitizeDocuments(amcList)
      
      result.amcStats = {
        total: amcList.length,
        active: amcList.filter(a => a.status === 'active').length,
        expired: amcList.filter(a => a.status === 'expired').length,
        pending: amcList.filter(a => a.status === 'pending').length,
        totalValue: amcList.reduce((sum, a) => sum + (a.value || 0), 0)
      }
    }

    // Fetch Job Cards
    if (!type || type === 'all' || type === 'jobcard') {
      const jobCards = db.collection('dw_job_cards')
      let query = {}
      if (invoiceId) query.invoiceId = invoiceId
      if (status) query.status = status
      
      const jobCardList = await jobCards.find(query).sort({ createdAt: -1 }).toArray()
      result.jobCards = sanitizeDocuments(jobCardList)
    }

    return successResponse(result)
  } catch (error) {
    console.error('DW Post-Invoicing GET Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to fetch data', 500, error.message)
  }
}

// POST - Create post-invoicing records
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action } = body

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date()

    // ==================== CREATE DELIVERY CHALLAN ====================
    if (action === 'create-challan') {
      const challans = db.collection('dw_delivery_challans')
      const invoices = db.collection('dw_invoices')
      
      // Get invoice details
      const invoice = body.invoiceId ? await invoices.findOne({ id: body.invoiceId }) : null
      
      // Generate challan number
      const count = await challans.countDocuments() + 1
      const challanNumber = `DC-${now.getFullYear()}-${String(count).padStart(5, '0')}`

      const challan = {
        id: uuidv4(),
        challanNumber,
        invoiceId: body.invoiceId,
        invoiceNumber: invoice?.invoiceNumber || body.invoiceNumber,
        orderId: body.orderId,
        orderNumber: body.orderNumber,
        
        // Customer
        customerName: body.customerName || invoice?.customerName,
        customerPhone: body.customerPhone || invoice?.customerPhone,
        deliveryAddress: body.deliveryAddress || invoice?.siteAddress,
        contactPerson: body.contactPerson,
        contactPhone: body.contactPhone,
        
        // Items
        items: (body.items || []).map(item => ({
          id: uuidv4(),
          description: item.description,
          type: item.type,
          quantity: item.quantity,
          unit: item.unit || 'nos',
          width: item.width,
          height: item.height,
          area: item.area,
          serialNumber: item.serialNumber,
          batchNumber: item.batchNumber,
          remarks: item.remarks
        })),
        totalItems: (body.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0),
        
        // Dispatch details
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : null,
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
        actualDeliveryDate: null,
        
        vehicleNumber: body.vehicleNumber || '',
        driverName: body.driverName || '',
        driverPhone: body.driverPhone || '',
        transporterName: body.transporterName || '',
        
        // Status & signatures
        status: 'pending', // pending, dispatched, in-transit, delivered, partial, returned
        dispatchedBy: null,
        dispatchedAt: null,
        deliveredBy: null,
        deliveredAt: null,
        
        // Proof of delivery
        receivedBy: '',
        receivedByPhone: '',
        receiverSignature: null, // base64 image
        deliveryPhotos: [],
        deliveryRemarks: '',
        
        // Damage/shortage
        damageReported: false,
        damageDetails: '',
        shortageReported: false,
        shortageItems: [],
        
        notes: body.notes || '',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await challans.insertOne(challan)
      
      // Update invoice status if needed
      if (body.invoiceId && invoice) {
        await invoices.updateOne(
          { id: body.invoiceId },
          { $set: { challanGenerated: true, challanId: challan.id, updatedAt: now } }
        )
      }

      return successResponse({ challan: sanitizeDocument(challan) }, 201)
    }

    // ==================== CREATE INSTALLATION SCHEDULE ====================
    if (action === 'create-installation' || action === 'schedule-installation') {
      const installations = db.collection('dw_installations')
      const invoices = db.collection('dw_invoices')
      
      const invoice = body.invoiceId ? await invoices.findOne({ id: body.invoiceId }) : null
      
      const count = await installations.countDocuments() + 1
      const installationNumber = `INST-${now.getFullYear()}-${String(count).padStart(5, '0')}`

      const installation = {
        id: uuidv4(),
        installationNumber,
        invoiceId: body.invoiceId,
        invoiceNumber: invoice?.invoiceNumber || body.invoiceNumber,
        orderId: body.orderId,
        challanId: body.challanId,
        
        // Customer
        customerName: body.customerName || invoice?.customerName,
        customerPhone: body.customerPhone || invoice?.customerPhone,
        siteAddress: body.siteAddress || invoice?.siteAddress,
        contactPerson: body.contactPerson,
        contactPhone: body.contactPhone,
        
        // Scheduling
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        scheduledTimeSlot: body.timeSlot || 'morning', // morning, afternoon, evening
        estimatedDuration: parseInt(body.estimatedDuration) || 4, // hours
        actualStartTime: null,
        actualEndTime: null,
        
        // Team
        teamLeader: body.teamLeader,
        teamMembers: body.teamMembers || [],
        techniciansCount: parseInt(body.techniciansCount) || 2,
        helpersCount: parseInt(body.helpersCount) || 1,
        
        // Items to install
        items: (body.items || []).map(item => ({
          id: uuidv4(),
          description: item.description,
          type: item.type,
          location: item.location,
          quantity: item.quantity,
          installed: 0,
          status: 'pending' // pending, in-progress, completed, issue
        })),
        totalItems: (body.items || []).length,
        completedItems: 0,
        
        // Tools & materials required
        toolsRequired: body.toolsRequired || [],
        materialsRequired: body.materialsRequired || [],
        scaffoldingRequired: body.scaffoldingRequired || false,
        
        // Status tracking
        status: 'scheduled', // scheduled, confirmed, in-progress, completed, rescheduled, cancelled
        confirmationStatus: 'pending', // pending, confirmed, customer-unavailable
        customerConfirmedAt: null,
        
        // Completion details
        completionPercentage: 0,
        qualityCheckPassed: null,
        qualityCheckBy: null,
        qualityCheckAt: null,
        qualityCheckRemarks: '',
        
        // Issues
        issuesReported: [],
        
        // Customer feedback
        customerRating: null,
        customerFeedback: '',
        
        // Photos
        beforePhotos: [],
        afterPhotos: [],
        issuePhotos: [],
        
        // Signatures
        customerSignature: null,
        technicianSignature: null,
        
        // Rescheduling
        rescheduledFrom: null,
        rescheduledReason: '',
        rescheduledCount: 0,
        
        notes: body.notes || '',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await installations.insertOne(installation)

      return successResponse({ installation: sanitizeDocument(installation) }, 201)
    }

    // ==================== RECORD PAYMENT ====================
    if (action === 'record-payment') {
      const payments = db.collection('dw_payment_collections')
      const invoices = db.collection('dw_invoices')
      const receipts = db.collection('dw_receipts')
      
      const invoice = await invoices.findOne({ id: body.invoiceId })
      if (!invoice) return errorResponse('Invoice not found', 404)
      
      // Generate payment ID
      const count = await payments.countDocuments() + 1
      const paymentId = `PAY-${now.getFullYear()}-${String(count).padStart(6, '0')}`

      const payment = {
        id: uuidv4(),
        paymentId,
        invoiceId: body.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        
        // Customer
        customerName: invoice.customerName,
        customerId: invoice.customerId,
        
        // Amount
        amount: parseFloat(body.amount),
        currency: 'INR',
        
        // Payment details
        method: body.method, // cash, upi, bank_transfer, cheque, card, neft, rtgs, imps
        reference: body.reference || '', // UPI ID, cheque number, transaction ID
        
        // Bank details (for cheque/transfer)
        bankName: body.bankName || '',
        accountNumber: body.accountNumber || '',
        chequeNumber: body.chequeNumber || '',
        chequeDate: body.chequeDate ? new Date(body.chequeDate) : null,
        
        // UPI details
        upiId: body.upiId || '',
        upiTransactionId: body.upiTransactionId || '',
        
        // Status
        status: body.method === 'cheque' ? 'pending' : 'completed', // pending, completed, bounced, cancelled
        clearanceDate: body.method === 'cheque' ? null : now,
        
        date: body.date ? new Date(body.date) : now,
        notes: body.notes || '',
        
        collectedBy: user.id,
        collectedAt: now,
        createdAt: now,
        updatedAt: now
      }

      await payments.insertOne(payment)

      // Update invoice payment status
      const newPaidAmount = (invoice.paidAmount || 0) + payment.amount
      const newBalanceAmount = invoice.grandTotal - newPaidAmount
      let paymentStatus = 'pending'
      if (newBalanceAmount <= 0) paymentStatus = 'paid'
      else if (newPaidAmount > 0) paymentStatus = 'partial'

      await invoices.updateOne(
        { id: body.invoiceId },
        { 
          $set: {
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalanceAmount),
            paymentStatus,
            updatedAt: now
          },
          $push: {
            paymentHistory: {
              paymentId: payment.id,
              amount: payment.amount,
              method: payment.method,
              date: payment.date,
              recordedBy: user.id
            }
          }
        }
      )

      // Auto-generate receipt if payment completed
      if (body.generateReceipt !== false && payment.status === 'completed') {
        const receiptCount = await receipts.countDocuments() + 1
        const receiptNumber = `RCP-${now.getFullYear()}-${String(receiptCount).padStart(5, '0')}`
        
        const receipt = {
          id: uuidv4(),
          receiptNumber,
          paymentId: payment.id,
          invoiceId: body.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          
          amount: payment.amount,
          amountInWords: numberToWords(payment.amount),
          paymentMethod: payment.method,
          paymentReference: payment.reference,
          
          receivedBy: user.name || user.email,
          receivedAt: now,
          
          createdAt: now
        }
        
        await receipts.insertOne(receipt)
        payment.receiptId = receipt.id
        payment.receiptNumber = receipt.receiptNumber
      }

      // Sync to Build Finance
      try {
        await syncPaymentToFinance(db, payment, invoice, user)
      } catch (syncError) {
        console.error('Finance sync error:', syncError)
        // Don't fail the payment if sync fails
      }

      return successResponse({ 
        payment: sanitizeDocument(payment),
        invoiceStatus: paymentStatus,
        balanceAmount: Math.max(0, newBalanceAmount)
      }, 201)
    }

    // ==================== GENERATE RECEIPT ====================
    if (action === 'generate-receipt') {
      const receipts = db.collection('dw_receipts')
      const payments = db.collection('dw_payment_collections')
      
      const payment = body.paymentId ? await payments.findOne({ id: body.paymentId }) : null
      
      const count = await receipts.countDocuments() + 1
      const receiptNumber = `RCP-${now.getFullYear()}-${String(count).padStart(5, '0')}`

      const receipt = {
        id: uuidv4(),
        receiptNumber,
        paymentId: body.paymentId,
        invoiceId: body.invoiceId,
        invoiceNumber: body.invoiceNumber,
        
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        
        amount: parseFloat(body.amount),
        amountInWords: numberToWords(parseFloat(body.amount)),
        paymentMethod: body.paymentMethod || payment?.method,
        paymentReference: body.paymentReference || payment?.reference,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : (payment?.date || now),
        
        description: body.description || 'Payment received against invoice',
        
        receivedBy: user.name || user.email,
        receivedAt: now,
        
        // For printed receipts
        printCount: 0,
        lastPrintedAt: null,
        
        createdBy: user.id,
        createdAt: now
      }

      await receipts.insertOne(receipt)

      return successResponse({ receipt: sanitizeDocument(receipt) }, 201)
    }

    // ==================== REGISTER WARRANTY ====================
    if (action === 'register-warranty') {
      const warranties = db.collection('dw_warranties')
      const invoices = db.collection('dw_invoices')
      
      const invoice = body.invoiceId ? await invoices.findOne({ id: body.invoiceId }) : null
      
      const count = await warranties.countDocuments() + 1
      const warrantyNumber = `WRN-${now.getFullYear()}-${String(count).padStart(5, '0')}`
      
      const startDate = body.startDate ? new Date(body.startDate) : now
      const warrantyPeriod = parseInt(body.warrantyPeriod) || 12 // months
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + warrantyPeriod)

      const warranty = {
        id: uuidv4(),
        warrantyNumber,
        invoiceId: body.invoiceId,
        invoiceNumber: invoice?.invoiceNumber || body.invoiceNumber,
        orderId: body.orderId,
        installationId: body.installationId,
        
        // Customer
        customerName: body.customerName || invoice?.customerName,
        customerPhone: body.customerPhone || invoice?.customerPhone,
        customerEmail: body.customerEmail || invoice?.customerEmail,
        siteAddress: body.siteAddress || invoice?.siteAddress,
        
        // Warranty details
        warrantyType: body.warrantyType || 'standard', // standard, extended, comprehensive
        warrantyPeriod,
        startDate,
        endDate,
        
        // Items covered
        items: (body.items || []).map(item => ({
          id: uuidv4(),
          description: item.description,
          serialNumber: item.serialNumber,
          type: item.type,
          coverage: item.coverage || 'manufacturing_defects', // manufacturing_defects, parts_only, parts_and_labor, comprehensive
          exclusions: item.exclusions || []
        })),
        itemsCovered: (body.items || []).length,
        
        // Terms
        termsAccepted: body.termsAccepted || false,
        termsAcceptedAt: body.termsAccepted ? now : null,
        coverageDetails: body.coverageDetails || 'Covers manufacturing defects in material and workmanship',
        exclusions: body.exclusions || [
          'Damage due to misuse or negligence',
          'Normal wear and tear',
          'Damage from natural disasters',
          'Unauthorized repairs or modifications'
        ],
        
        // Claims
        claimsCount: 0,
        claims: [],
        
        // Status
        status: 'active', // active, expired, voided
        
        // Registration
        registeredBy: user.id,
        registeredAt: now,
        
        // Certificate
        certificateGenerated: false,
        certificateUrl: null,
        
        createdAt: now,
        updatedAt: now
      }

      await warranties.insertOne(warranty)

      // Update invoice with warranty
      if (body.invoiceId && invoice) {
        await invoices.updateOne(
          { id: body.invoiceId },
          { 
            $set: { 
              warrantyRegistered: true, 
              warrantyId: warranty.id,
              warrantyNumber: warranty.warrantyNumber,
              updatedAt: now 
            } 
          }
        )
      }

      return successResponse({ warranty: sanitizeDocument(warranty) }, 201)
    }

    // ==================== CREATE AMC CONTRACT ====================
    if (action === 'create-amc') {
      const amcs = db.collection('dw_amc_contracts')
      const invoices = db.collection('dw_invoices')
      
      const invoice = body.invoiceId ? await invoices.findOne({ id: body.invoiceId }) : null
      
      const count = await amcs.countDocuments() + 1
      const amcNumber = `AMC-${now.getFullYear()}-${String(count).padStart(4, '0')}`
      
      const startDate = body.startDate ? new Date(body.startDate) : now
      const contractPeriod = parseInt(body.contractPeriod) || 12 // months
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + contractPeriod)

      const amc = {
        id: uuidv4(),
        amcNumber,
        invoiceId: body.invoiceId,
        invoiceNumber: invoice?.invoiceNumber,
        warrantyId: body.warrantyId,
        
        // Customer
        customerName: body.customerName || invoice?.customerName,
        customerPhone: body.customerPhone || invoice?.customerPhone,
        customerEmail: body.customerEmail || invoice?.customerEmail,
        siteAddress: body.siteAddress || invoice?.siteAddress,
        
        // Contract details
        contractType: body.contractType || 'standard', // standard, premium, comprehensive
        contractPeriod,
        startDate,
        endDate,
        
        // Pricing
        value: parseFloat(body.value) || 0,
        paymentFrequency: body.paymentFrequency || 'annual', // monthly, quarterly, annual
        installmentAmount: 0,
        
        // Services included
        servicesIncluded: body.servicesIncluded || [
          'Quarterly inspection visits',
          'Preventive maintenance',
          'Lubrication of moving parts',
          'Hardware adjustment and tightening',
          'Glass cleaning (interior)',
          'Weather seal inspection'
        ],
        freeVisits: parseInt(body.freeVisits) || 4,
        usedVisits: 0,
        additionalVisitCharge: parseFloat(body.additionalVisitCharge) || 500,
        
        // Items covered
        items: (body.items || []).map(item => ({
          id: uuidv4(),
          description: item.description,
          serialNumber: item.serialNumber,
          type: item.type
        })),
        itemsCovered: (body.items || []).length,
        
        // Service records
        serviceHistory: [],
        nextServiceDate: null,
        
        // Renewals
        renewalReminder: true,
        reminderDaysBefore: 30,
        renewalCount: 0,
        
        // Payment tracking
        paymentStatus: 'pending',
        payments: [],
        
        // Status
        status: 'pending', // pending, active, expired, cancelled, suspended
        activatedAt: null,
        
        notes: body.notes || '',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      // Calculate installment amount
      if (amc.paymentFrequency === 'monthly') {
        amc.installmentAmount = amc.value / amc.contractPeriod
      } else if (amc.paymentFrequency === 'quarterly') {
        amc.installmentAmount = amc.value / (amc.contractPeriod / 3)
      } else {
        amc.installmentAmount = amc.value
      }

      await amcs.insertOne(amc)

      return successResponse({ amc: sanitizeDocument(amc) }, 201)
    }

    // ==================== CREATE JOB CARD ====================
    if (action === 'create-jobcard') {
      const jobCards = db.collection('dw_job_cards')
      
      const count = await jobCards.countDocuments() + 1
      const jobCardNumber = `JC-${now.getFullYear()}-${String(count).padStart(5, '0')}`

      const jobCard = {
        id: uuidv4(),
        jobCardNumber,
        type: body.type || 'installation', // installation, service, repair, warranty_claim
        
        // References
        invoiceId: body.invoiceId,
        installationId: body.installationId,
        serviceTicketId: body.serviceTicketId,
        warrantyClaimId: body.warrantyClaimId,
        
        // Customer
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        siteAddress: body.siteAddress,
        
        // Job details
        description: body.description,
        items: body.items || [],
        priority: body.priority || 'normal', // low, normal, high, urgent
        
        // Assignment
        assignedTo: body.assignedTo,
        team: body.team || [],
        
        // Schedule
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        scheduledTimeSlot: body.timeSlot,
        estimatedHours: parseFloat(body.estimatedHours) || 4,
        actualHours: null,
        
        // Materials & costs
        materialsUsed: [],
        laborCost: 0,
        materialCost: 0,
        totalCost: 0,
        
        // Status
        status: 'pending', // pending, assigned, in-progress, completed, cancelled
        startedAt: null,
        completedAt: null,
        
        // Completion
        workDone: '',
        customerRemarks: '',
        technicianRemarks: '',
        
        // Signatures
        customerSignature: null,
        technicianSignature: null,
        
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }

      await jobCards.insertOne(jobCard)

      return successResponse({ jobCard: sanitizeDocument(jobCard) }, 201)
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Post-Invoicing POST Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to create record', 500, error.message)
  }
}

// PUT - Update post-invoicing records
export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireAuth(user)

    const body = await request.json()
    const { action, id, type } = body

    if (!id) return errorResponse('ID is required', 400)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date()

    // ==================== UPDATE CHALLAN STATUS ====================
    if (type === 'challan' || action === 'update-challan') {
      const challans = db.collection('dw_delivery_challans')
      
      const updateData = { updatedAt: now }
      
      if (body.status) {
        updateData.status = body.status
        
        if (body.status === 'dispatched') {
          updateData.dispatchedBy = user.id
          updateData.dispatchedAt = now
        }
        
        if (body.status === 'delivered') {
          updateData.deliveredBy = user.id
          updateData.deliveredAt = now
          updateData.actualDeliveryDate = now
          if (body.receivedBy) updateData.receivedBy = body.receivedBy
          if (body.receivedByPhone) updateData.receivedByPhone = body.receivedByPhone
          if (body.receiverSignature) updateData.receiverSignature = body.receiverSignature
          if (body.deliveryRemarks) updateData.deliveryRemarks = body.deliveryRemarks
        }
      }
      
      // Update other fields
      ['vehicleNumber', 'driverName', 'driverPhone', 'transporterName', 'notes'].forEach(field => {
        if (body[field] !== undefined) updateData[field] = body[field]
      })
      
      if (body.damageReported !== undefined) {
        updateData.damageReported = body.damageReported
        updateData.damageDetails = body.damageDetails || ''
      }
      
      if (body.deliveryPhotos) {
        updateData.deliveryPhotos = body.deliveryPhotos
      }

      const result = await challans.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )
      
      if (!result) return errorResponse('Challan not found', 404)
      return successResponse({ challan: sanitizeDocument(result) })
    }

    // ==================== UPDATE INSTALLATION ====================
    if (type === 'installation' || action === 'update-installation') {
      const installations = db.collection('dw_installations')
      
      const updateData = { updatedAt: now }
      
      if (body.status) {
        updateData.status = body.status
        
        if (body.status === 'in-progress' && !body.actualStartTime) {
          updateData.actualStartTime = now
        }
        
        if (body.status === 'completed') {
          updateData.actualEndTime = now
          updateData.completionPercentage = 100
        }
        
        if (body.status === 'rescheduled') {
          const current = await installations.findOne({ id })
          updateData.rescheduledFrom = current?.scheduledDate
          updateData.rescheduledReason = body.rescheduledReason || ''
          updateData.rescheduledCount = (current?.rescheduledCount || 0) + 1
          if (body.newScheduledDate) {
            updateData.scheduledDate = new Date(body.newScheduledDate)
          }
        }
      }
      
      if (body.completionPercentage !== undefined) {
        updateData.completionPercentage = body.completionPercentage
      }
      
      if (body.qualityCheckPassed !== undefined) {
        updateData.qualityCheckPassed = body.qualityCheckPassed
        updateData.qualityCheckBy = user.id
        updateData.qualityCheckAt = now
        updateData.qualityCheckRemarks = body.qualityCheckRemarks || ''
      }
      
      if (body.customerRating !== undefined) {
        updateData.customerRating = body.customerRating
        updateData.customerFeedback = body.customerFeedback || ''
      }
      
      if (body.customerSignature) updateData.customerSignature = body.customerSignature
      if (body.technicianSignature) updateData.technicianSignature = body.technicianSignature
      if (body.beforePhotos) updateData.beforePhotos = body.beforePhotos
      if (body.afterPhotos) updateData.afterPhotos = body.afterPhotos
      
      const result = await installations.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )
      
      if (!result) return errorResponse('Installation not found', 404)
      return successResponse({ installation: sanitizeDocument(result) })
    }

    // ==================== UPDATE PAYMENT STATUS ====================
    if (type === 'payment' || action === 'update-payment') {
      const payments = db.collection('dw_payment_collections')
      
      const updateData = { updatedAt: now }
      
      if (body.status) {
        updateData.status = body.status
        if (body.status === 'completed') {
          updateData.clearanceDate = now
        }
      }
      
      const result = await payments.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )
      
      if (!result) return errorResponse('Payment not found', 404)
      return successResponse({ payment: sanitizeDocument(result) })
    }

    // ==================== FILE WARRANTY CLAIM ====================
    if (action === 'file-warranty-claim') {
      const warranties = db.collection('dw_warranties')
      
      const warranty = await warranties.findOne({ id })
      if (!warranty) return errorResponse('Warranty not found', 404)
      
      if (warranty.status !== 'active') {
        return errorResponse('Warranty is not active', 400)
      }
      
      if (new Date() > new Date(warranty.endDate)) {
        return errorResponse('Warranty has expired', 400)
      }
      
      const claim = {
        id: uuidv4(),
        claimNumber: `CLM-${Date.now()}`,
        claimDate: now,
        issueType: body.issueType,
        issueDescription: body.issueDescription,
        itemsAffected: body.itemsAffected || [],
        photos: body.photos || [],
        status: 'pending', // pending, under-review, approved, rejected, resolved
        resolution: null,
        resolvedAt: null,
        filedBy: user.id
      }
      
      await warranties.updateOne(
        { id },
        { 
          $push: { claims: claim },
          $inc: { claimsCount: 1 },
          $set: { updatedAt: now }
        }
      )
      
      return successResponse({ claim })
    }

    // ==================== UPDATE AMC ====================
    if (type === 'amc' || action === 'update-amc') {
      const amcs = db.collection('dw_amc_contracts')
      
      const updateData = { updatedAt: now }
      
      if (body.status) {
        updateData.status = body.status
        if (body.status === 'active') {
          updateData.activatedAt = now
        }
      }
      
      if (body.nextServiceDate) {
        updateData.nextServiceDate = new Date(body.nextServiceDate)
      }
      
      const result = await amcs.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      )
      
      if (!result) return errorResponse('AMC contract not found', 404)
      return successResponse({ amc: sanitizeDocument(result) })
    }

    // ==================== LOG AMC SERVICE VISIT ====================
    if (action === 'log-amc-service') {
      const amcs = db.collection('dw_amc_contracts')
      
      const amc = await amcs.findOne({ id })
      if (!amc) return errorResponse('AMC contract not found', 404)
      
      const serviceRecord = {
        id: uuidv4(),
        visitDate: body.visitDate ? new Date(body.visitDate) : now,
        technician: body.technician,
        servicesPerformed: body.servicesPerformed || [],
        issues: body.issues || [],
        recommendations: body.recommendations || '',
        customerRemarks: body.customerRemarks || '',
        photos: body.photos || [],
        nextServiceRecommended: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
        recordedBy: user.id,
        recordedAt: now
      }
      
      await amcs.updateOne(
        { id },
        { 
          $push: { serviceHistory: serviceRecord },
          $inc: { usedVisits: 1 },
          $set: { 
            nextServiceDate: serviceRecord.nextServiceRecommended,
            updatedAt: now 
          }
        }
      )
      
      return successResponse({ serviceRecord })
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('DW Post-Invoicing PUT Error:', error)
    if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse('Failed to update', 500, error.message)
  }
}

// Helper: Convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  if (num === 0) return 'Zero'
  if (num < 0) return 'Minus ' + numberToWords(-num)
  
  let words = ''
  
  if (Math.floor(num / 10000000) > 0) {
    words += numberToWords(Math.floor(num / 10000000)) + ' Crore '
    num %= 10000000
  }
  
  if (Math.floor(num / 100000) > 0) {
    words += numberToWords(Math.floor(num / 100000)) + ' Lakh '
    num %= 100000
  }
  
  if (Math.floor(num / 1000) > 0) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand '
    num %= 1000
  }
  
  if (Math.floor(num / 100) > 0) {
    words += numberToWords(Math.floor(num / 100)) + ' Hundred '
    num %= 100
  }
  
  if (num > 0) {
    if (num < 20) {
      words += ones[num]
    } else {
      words += tens[Math.floor(num / 10)]
      if (num % 10 > 0) {
        words += ' ' + ones[num % 10]
      }
    }
  }
  
  return words.trim() + ' Rupees Only'
}

// Helper: Sync payment to Build Finance
async function syncPaymentToFinance(db, payment, invoice, user) {
  const financePayments = db.collection('finance_payments')
  const financeInvoices = db.collection('finance_invoices')
  
  // Create finance payment record
  const financePayment = {
    id: uuidv4(),
    source: 'doors-windows',
    sourceId: payment.id,
    sourceInvoiceId: payment.invoiceId,
    
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    date: payment.date,
    
    category: 'product_sale',
    description: `Payment for D&W Invoice ${invoice.invoiceNumber}`,
    
    createdBy: user.id,
    syncedAt: new Date()
  }
  
  await financePayments.insertOne(financePayment)
  
  // Update or create finance invoice if not exists
  const existingFinanceInvoice = await financeInvoices.findOne({ sourceId: invoice.id, source: 'doors-windows' })
  
  if (existingFinanceInvoice) {
    await financeInvoices.updateOne(
      { id: existingFinanceInvoice.id },
      { 
        $set: {
          paidAmount: invoice.paidAmount + payment.amount,
          balanceAmount: Math.max(0, invoice.grandTotal - invoice.paidAmount - payment.amount),
          paymentStatus: invoice.paymentStatus,
          updatedAt: new Date()
        },
        $push: {
          payments: {
            paymentId: financePayment.id,
            amount: payment.amount,
            date: payment.date
          }
        }
      }
    )
  }
}
