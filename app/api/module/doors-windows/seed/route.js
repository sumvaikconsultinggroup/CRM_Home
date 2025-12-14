import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Sample products data
const sampleProducts = [
  // Windows
  {
    name: 'uPVC Casement Window - Standard',
    productType: 'window',
    category: 'casement',
    frameMaterial: 'upvc',
    frameProfile: 'KM01',
    pricePerSqft: 450,
    standardDimensions: { width: 1200, height: 1500, unit: 'mm' },
    features: ['Energy efficient', 'Sound insulation', 'Low maintenance']
  },
  {
    name: 'uPVC Casement Window - Premium',
    productType: 'window',
    category: 'casement',
    frameMaterial: 'upvc',
    frameProfile: 'KM02',
    pricePerSqft: 650,
    standardDimensions: { width: 1500, height: 1800, unit: 'mm' },
    features: ['70mm profile', 'Triple seal', 'Reinforced steel']
  },
  {
    name: 'uPVC Fixed Window',
    productType: 'window',
    category: 'fixed',
    frameMaterial: 'upvc',
    frameProfile: 'KM01',
    pricePerSqft: 380,
    standardDimensions: { width: 1000, height: 1200, unit: 'mm' },
    features: ['Maximum light', 'Excellent insulation']
  },
  {
    name: 'uPVC Sliding Window - 2 Track',
    productType: 'window',
    category: 'sliding',
    frameMaterial: 'upvc',
    frameProfile: 'KM-SL2',
    pricePerSqft: 520,
    standardDimensions: { width: 1800, height: 1500, unit: 'mm' },
    features: ['Smooth operation', 'Easy cleaning', 'Weather sealed']
  },
  {
    name: 'uPVC Sliding Window - 3 Track',
    productType: 'window',
    category: 'sliding',
    frameMaterial: 'upvc',
    frameProfile: 'KM-SL3',
    pricePerSqft: 580,
    standardDimensions: { width: 2400, height: 1500, unit: 'mm' },
    features: ['Wide opening', 'Mosquito mesh option']
  },
  {
    name: 'uPVC Tilt & Turn Window',
    productType: 'window',
    category: 'tilt-turn',
    frameMaterial: 'upvc',
    frameProfile: 'KM-TT',
    pricePerSqft: 750,
    standardDimensions: { width: 1000, height: 1400, unit: 'mm' },
    features: ['Dual opening', 'Ventilation mode', 'Easy cleaning']
  },
  {
    name: 'Aluminum Casement Window',
    productType: 'window',
    category: 'casement',
    frameMaterial: 'aluminum',
    frameProfile: 'AL-50',
    pricePerSqft: 550,
    standardDimensions: { width: 1200, height: 1500, unit: 'mm' },
    features: ['Slim profile', 'Strong & durable', 'Powder coated']
  },
  {
    name: 'Aluminum Sliding Window',
    productType: 'window',
    category: 'sliding',
    frameMaterial: 'aluminum',
    frameProfile: 'AL-SL',
    pricePerSqft: 480,
    standardDimensions: { width: 1800, height: 1200, unit: 'mm' },
    features: ['Lightweight', 'Corrosion resistant']
  },
  // Doors
  {
    name: 'uPVC French Door',
    productType: 'door',
    category: 'french',
    frameMaterial: 'upvc',
    frameProfile: 'KM-DR',
    pricePerSqft: 680,
    standardDimensions: { width: 1800, height: 2400, unit: 'mm' },
    features: ['Double door', 'Multi-point locking', 'Low threshold']
  },
  {
    name: 'uPVC Sliding Door - 2 Panel',
    productType: 'door',
    category: 'sliding',
    frameMaterial: 'upvc',
    frameProfile: 'KM-SD2',
    pricePerSqft: 720,
    standardDimensions: { width: 2400, height: 2400, unit: 'mm' },
    features: ['Wide opening', 'Heavy duty track', 'Security lock']
  },
  {
    name: 'Aluminum Bi-Fold Door',
    productType: 'door',
    category: 'bi-fold',
    frameMaterial: 'aluminum',
    frameProfile: 'AL-BF',
    pricePerSqft: 950,
    standardDimensions: { width: 3600, height: 2400, unit: 'mm' },
    features: ['Panoramic views', 'Folding panels', 'Premium hardware']
  }
]

// Sample materials data
const sampleMaterials = [
  // Glass types
  { name: 'Clear Float Glass 5mm', category: 'glass', glassType: 'clear', thickness: 5, costPrice: 85, sellingPrice: 120, unitOfMeasure: 'sqft' },
  { name: 'Clear Float Glass 6mm', category: 'glass', glassType: 'clear', thickness: 6, costPrice: 95, sellingPrice: 135, unitOfMeasure: 'sqft' },
  { name: 'Toughened Glass 8mm', category: 'glass', glassType: 'tempered', thickness: 8, costPrice: 180, sellingPrice: 250, unitOfMeasure: 'sqft' },
  { name: 'Toughened Glass 10mm', category: 'glass', glassType: 'tempered', thickness: 10, costPrice: 220, sellingPrice: 300, unitOfMeasure: 'sqft' },
  { name: 'Toughened Glass 12mm', category: 'glass', glassType: 'tempered', thickness: 12, costPrice: 280, sellingPrice: 380, unitOfMeasure: 'sqft' },
  { name: 'Reflective Glass 6mm - Silver', category: 'glass', glassType: 'reflective', thickness: 6, color: 'silver', costPrice: 150, sellingPrice: 210, unitOfMeasure: 'sqft' },
  { name: 'Reflective Glass 6mm - Blue', category: 'glass', glassType: 'reflective', thickness: 6, color: 'blue', costPrice: 160, sellingPrice: 220, unitOfMeasure: 'sqft' },
  { name: '12mm Reflective Toughened', category: 'glass', glassType: 'reflective', thickness: 12, costPrice: 320, sellingPrice: 450, unitOfMeasure: 'sqft', brand: 'Saint Gobain' },
  { name: 'Laminated Glass 6.38mm', category: 'glass', glassType: 'laminated', thickness: 6.38, costPrice: 200, sellingPrice: 280, unitOfMeasure: 'sqft' },
  { name: 'Double Glazed Unit 20mm', category: 'glass', glassType: 'double-glazed', thickness: 20, costPrice: 350, sellingPrice: 480, unitOfMeasure: 'sqft' },
  { name: 'Frosted Glass 5mm', category: 'glass', glassType: 'frosted', thickness: 5, costPrice: 100, sellingPrice: 145, unitOfMeasure: 'sqft' },
  { name: 'Low-E Glass 6mm', category: 'glass', glassType: 'low-e', thickness: 6, costPrice: 250, sellingPrice: 350, unitOfMeasure: 'sqft' },
  // Frame profiles
  { name: 'uPVC Profile - 60mm Frame', category: 'frame_profile', profileSeries: '60mm', profileType: 'frame', brand: 'Kommerling', costPrice: 280, sellingPrice: 380, unitOfMeasure: 'rft' },
  { name: 'uPVC Profile - 60mm Sash', category: 'frame_profile', profileSeries: '60mm', profileType: 'sash', brand: 'Kommerling', costPrice: 250, sellingPrice: 340, unitOfMeasure: 'rft' },
  { name: 'uPVC Profile - 70mm Frame', category: 'frame_profile', profileSeries: '70mm', profileType: 'frame', brand: 'Rehau', costPrice: 350, sellingPrice: 480, unitOfMeasure: 'rft' },
  { name: 'Aluminum Profile - 50mm', category: 'frame_profile', profileSeries: '50mm', profileType: 'frame', brand: 'Jindal', costPrice: 320, sellingPrice: 420, unitOfMeasure: 'rft' },
  { name: 'Steel Reinforcement', category: 'reinforcement', costPrice: 80, sellingPrice: 110, unitOfMeasure: 'rft' },
  { name: 'Weather Seal - EPDM', category: 'sealant', costPrice: 25, sellingPrice: 40, unitOfMeasure: 'rft' },
  { name: 'Silicone Sealant', category: 'sealant', brand: 'Dow Corning', costPrice: 350, sellingPrice: 450, unitOfMeasure: 'tube' }
]

// Sample hardware data
const sampleHardware = [
  // Handles
  { name: 'Lever Handle - White', hardwareType: 'handle', subType: 'lever', finish: 'white', brand: 'Assa Abloy', costPrice: 450, sellingPrice: 650 },
  { name: 'Lever Handle - Black', hardwareType: 'handle', subType: 'lever', finish: 'black', brand: 'Assa Abloy', costPrice: 500, sellingPrice: 720 },
  { name: 'Lever Handle - Chrome', hardwareType: 'handle', subType: 'lever', finish: 'chrome', brand: 'Dorma', costPrice: 550, sellingPrice: 780 },
  { name: 'Cremone Handle - White', hardwareType: 'handle', subType: 'cremone', finish: 'white', brand: 'Roto', costPrice: 380, sellingPrice: 520 },
  // Locks
  { name: 'Multi-Point Lock - 4 Point', hardwareType: 'lock', subType: 'multi-point', brand: 'GU', costPrice: 1200, sellingPrice: 1650 },
  { name: 'Espagnolette Lock', hardwareType: 'lock', subType: 'espagnolette', brand: 'Maco', costPrice: 850, sellingPrice: 1150 },
  { name: 'Sliding Door Lock', hardwareType: 'lock', subType: 'sliding-lock', brand: 'Yale', costPrice: 950, sellingPrice: 1300 },
  // Cylinders
  { name: 'Door Cylinder - Single Side Key', hardwareType: 'cylinder', subType: 'single', brand: 'Yale', costPrice: 650, sellingPrice: 900 },
  { name: 'Door Cylinder - Both Side Key', hardwareType: 'cylinder', subType: 'double', brand: 'Yale', costPrice: 850, sellingPrice: 1150 },
  { name: 'Thumb Turn Cylinder', hardwareType: 'cylinder', subType: 'thumb-turn', brand: 'Dorma', costPrice: 750, sellingPrice: 1020 },
  // Hinges
  { name: 'Friction Stay Hinge 12"', hardwareType: 'hinge', subType: 'friction-stay', brand: 'Caldwell', costPrice: 280, sellingPrice: 380 },
  { name: 'Friction Stay Hinge 16"', hardwareType: 'hinge', subType: 'friction-stay', brand: 'Caldwell', costPrice: 350, sellingPrice: 480 },
  { name: 'Butt Hinge - Stainless Steel', hardwareType: 'hinge', subType: 'butt', material: 'stainless steel', costPrice: 180, sellingPrice: 250 },
  { name: 'Concealed Hinge', hardwareType: 'hinge', subType: 'concealed', brand: 'Maco', costPrice: 420, sellingPrice: 580 },
  // Door closers
  { name: 'Door Closer - Standard', hardwareType: 'closer', subType: 'overhead', brand: 'Dorma', costPrice: 1500, sellingPrice: 2100 },
  { name: 'Floor Spring', hardwareType: 'closer', subType: 'floor-spring', brand: 'Dorma', costPrice: 4500, sellingPrice: 6200 },
  // Seals
  { name: 'Brush Seal', hardwareType: 'seal', subType: 'brush', costPrice: 35, sellingPrice: 55, unitOfMeasure: 'rft' },
  { name: 'Rubber Gasket', hardwareType: 'seal', subType: 'rubber', costPrice: 25, sellingPrice: 40, unitOfMeasure: 'rft' }
]

// Sample quotation with drawings
const sampleQuotation = {
  customer: {
    name: 'Joginder Electronics',
    phone: '9876543210',
    email: 'joginder@example.com',
    address: 'Sector 15, Faridabad'
  },
  deliveryAddress: {
    address: 'Plot No. 45, Sector 15',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121007'
  },
  lineItems: [
    {
      productType: 'window',
      category: 'casement',
      name: 'Casement & Fixed',
      location: 'FF Front Right',
      width: 4810,
      height: 2888,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      glassThickness: 12,
      configuration: {
        panels: 4,
        panelTypes: ['fixed', 'openable', 'openable', 'fixed'],
        openingDirections: ['', 'right', 'left', '']
      },
      quantity: 1,
      rate: 103788.33
    },
    {
      productType: 'window',
      category: 'casement',
      name: 'Casement & Fixed',
      location: 'FF Back Left',
      width: 4228,
      height: 2895,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      glassThickness: 12,
      configuration: {
        panels: 4,
        panelTypes: ['fixed', 'openable', 'openable', 'fixed'],
        openingDirections: ['', 'left', 'right', '']
      },
      quantity: 1,
      rate: 90250.91
    },
    {
      productType: 'window',
      category: 'casement',
      name: 'Casement & Fixed',
      location: 'TF Stair',
      width: 1010,
      height: 3065,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      configuration: {
        panels: 2,
        panelTypes: ['fixed', 'openable'],
        openingDirections: ['', 'left'],
        hasTransom: true
      },
      quantity: 1,
      rate: 39438.32
    },
    {
      productType: 'window',
      category: 'casement',
      name: 'Casement F',
      location: 'FF Toilet 1',
      width: 925,
      height: 1310,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      configuration: {
        panels: 1,
        panelTypes: ['openable'],
        openingDirections: ['left']
      },
      quantity: 1,
      rate: 10249.98
    },
    {
      productType: 'window',
      category: 'casement',
      name: 'Casement & Fixed',
      location: 'GF Living',
      width: 4822,
      height: 2860,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      configuration: {
        panels: 4,
        panelTypes: ['fixed', 'openable', 'openable', 'fixed'],
        openingDirections: ['', 'right', 'left', '']
      },
      quantity: 1,
      rate: 103066.24
    },
    {
      productType: 'window',
      category: 'casement',
      name: 'Casement & Fixed',
      location: 'TF Front',
      width: 4790,
      height: 3400,
      frameMaterial: 'upvc',
      frameProfile: 'KM01',
      profileColor: 'black',
      glassType: '12mm Reflective T',
      configuration: {
        panels: 4,
        panelTypes: ['fixed', 'openable', 'openable', 'fixed'],
        openingDirections: ['', 'right', 'left', '']
      },
      quantity: 1,
      rate: 120733.89
    }
  ],
  taxRate: 18,
  paymentTerms: 'CWO',
  terms: [
    'Tax: As above.',
    'Transport: Additional as per actual.',
    'Installation: Inclusive.',
    'Installation Material: Inclusive.',
    'Hardware: Assa Abloy / Insta.',
    'Glass: As specified above.',
    'Prices offered are valid for 15 days only.',
    'Payment Terms: 50% Advance, 40% Before Delivery, 10% After Installation.',
    'Orders below ₹1 Lakh require 100% advance.',
    'Cheque in favour of "Krystal Magic World LLP".',
    'Warranty: 15 years warranty against discoloration.',
    'Electricity: If required, to be provided by client.',
    'Scaffolding: If required, to be provided by client.',
    'Housekeeping charges extra if required.',
    'Excludes transit insurance and loading/unloading (2% each).'
  ],
  companyInfo: {
    name: 'Krystal Magic World LLP',
    tagline: 'uPVC Doors & Windows',
    address: 'Shop No. 123, Industrial Area, Faridabad',
    phone: '011-12345678',
    email: 'sales@krystalmagic.com',
    gst: '06AABCK1234A1Z5',
    bankName: 'Indusind Bank Ltd',
    accountNo: '201002278132',
    ifsc: 'INDB0000714'
  }
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    // Get counts
    const products = await db.collection('doors_windows_products').countDocuments({ isActive: true })
    const materials = await db.collection('doors_windows_materials').countDocuments({ isActive: true })
    const hardware = await db.collection('doors_windows_hardware').countDocuments({ isActive: true })
    const quotations = await db.collection('doors_windows_quotations').countDocuments({ isActive: true })

    return successResponse({
      status: {
        products,
        materials,
        hardware,
        quotations,
        hasData: products > 0 || materials > 0 || hardware > 0
      }
    })
  } catch (error) {
    console.error('Doors-Windows Seed GET Error:', error)
    return errorResponse('Failed to check seed status', 500, error.message)
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const now = new Date().toISOString()
    const results = {}

    // Seed Products
    if (type === 'all' || type === 'products') {
      const products = db.collection('doors_windows_products')
      const existing = await products.countDocuments({ isActive: true })
      
      if (existing === 0) {
        const productsToInsert = sampleProducts.map(p => ({
          ...p,
          id: uuidv4(),
          sku: `DW-${p.productType.toUpperCase().slice(0, 1)}${p.category.toUpperCase().slice(0, 2)}-${Date.now().toString(36).toUpperCase()}`,
          isActive: true,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }))
        await products.insertMany(productsToInsert)
        results.products = productsToInsert.length
      } else {
        results.products = 0
        results.productsSkipped = 'Already has data'
      }
    }

    // Seed Materials
    if (type === 'all' || type === 'materials') {
      const materials = db.collection('doors_windows_materials')
      const existing = await materials.countDocuments({ isActive: true })
      
      if (existing === 0) {
        const materialsToInsert = sampleMaterials.map(m => ({
          ...m,
          id: uuidv4(),
          code: `MAT-${m.category.toUpperCase().slice(0, 2)}-${Date.now().toString(36).toUpperCase()}`,
          isActive: true,
          currentStock: Math.floor(Math.random() * 100) + 20,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }))
        await materials.insertMany(materialsToInsert)
        results.materials = materialsToInsert.length
      } else {
        results.materials = 0
        results.materialsSkipped = 'Already has data'
      }
    }

    // Seed Hardware
    if (type === 'all' || type === 'hardware') {
      const hardware = db.collection('doors_windows_hardware')
      const existing = await hardware.countDocuments({ isActive: true })
      
      if (existing === 0) {
        const hardwareToInsert = sampleHardware.map(h => ({
          ...h,
          id: uuidv4(),
          sku: `HW-${h.hardwareType.toUpperCase().slice(0, 2)}-${Date.now().toString(36).toUpperCase()}`,
          isActive: true,
          unitOfMeasure: h.unitOfMeasure || 'piece',
          currentStock: Math.floor(Math.random() * 50) + 10,
          compatibleWith: ['upvc', 'aluminum'],
          forProductTypes: ['window', 'door'],
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }))
        await hardware.insertMany(hardwareToInsert)
        results.hardware = hardwareToInsert.length
      } else {
        results.hardware = 0
        results.hardwareSkipped = 'Already has data'
      }
    }

    // Seed Sample Quotation
    if (type === 'all' || type === 'quotation') {
      const quotations = db.collection('doors_windows_quotations')
      const counters = db.collection('counters')
      const existing = await quotations.countDocuments({ isActive: true })
      
      if (existing === 0) {
        // Generate quote number
        const counter = await counters.findOneAndUpdate(
          { _id: 'doors_windows_quotation' },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: 'after' }
        )
        const quoteNumber = `DW-QT-${String(counter.seq || 1).padStart(5, '0')}`

        // Calculate area helper
        const calculateArea = (w, h) => ((w / 304.8) * (h / 304.8)).toFixed(2)

        // Process line items
        const lineItems = sampleQuotation.lineItems.map((item, index) => {
          const areaSqft = parseFloat(calculateArea(item.width, item.height))
          return {
            id: uuidv4(),
            lineNumber: String(index + 1).padStart(4, '0'),
            ...item,
            areaSqft,
            amount: item.rate * item.quantity,
            drawingConfig: {
              width: item.width,
              height: item.height,
              type: item.category,
              viewDirection: 'inside',
              frameThickness: 60,
              panels: item.configuration.panelTypes.map((type, i) => ({
                type,
                openingDirection: item.configuration.openingDirections[i] || ''
              })),
              showDimensions: true,
              showLabels: true
            }
          }
        })

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
        const totalArea = lineItems.reduce((sum, item) => sum + item.areaSqft, 0)
        const sgst = subtotal * 0.09
        const cgst = subtotal * 0.09

        const quotation = {
          id: uuidv4(),
          quoteNumber,
          ...sampleQuotation,
          lineItems,
          totalArea: totalArea.toFixed(2),
          totalUnits: lineItems.length,
          subtotal,
          sgst,
          cgst,
          grandTotal: subtotal + sgst + cgst,
          status: 'sent',
          version: 1,
          validDays: 15,
          validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now
        }

        await quotations.insertOne(quotation)
        results.quotations = 1
      } else {
        results.quotations = 0
        results.quotationsSkipped = 'Already has data'
      }
    }

    return successResponse({ message: 'Sample data seeded successfully', results })
  } catch (error) {
    console.error('Doors-Windows Seed POST Error:', error)
    return errorResponse('Failed to seed data', 500, error.message)
  }
}
