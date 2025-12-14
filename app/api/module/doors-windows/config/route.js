import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

const defaultConfig = {
  id: 'doors-windows-config',
  moduleType: 'doors-windows',
  businessTypes: ['manufacturer', 'dealer', 'both'],
  
  // Product types
  windowTypes: [
    { id: 'casement', name: 'Casement Window', icon: 'window' },
    { id: 'fixed', name: 'Fixed Window', icon: 'square' },
    { id: 'sliding', name: 'Sliding Window', icon: 'move-horizontal' },
    { id: 'tilt-turn', name: 'Tilt & Turn', icon: 'rotate-3d' },
    { id: 'awning', name: 'Awning Window', icon: 'chevron-up' },
    { id: 'hopper', name: 'Hopper Window', icon: 'chevron-down' },
    { id: 'bay', name: 'Bay Window', icon: 'hexagon' },
    { id: 'arch', name: 'Arch Window', icon: 'arc' }
  ],
  
  doorTypes: [
    { id: 'single', name: 'Single Door', icon: 'door-closed' },
    { id: 'double', name: 'Double Door', icon: 'columns' },
    { id: 'french', name: 'French Door', icon: 'door-open' },
    { id: 'sliding', name: 'Sliding Door', icon: 'move-horizontal' },
    { id: 'bi-fold', name: 'Bi-Fold Door', icon: 'fold' },
    { id: 'pocket', name: 'Pocket Door', icon: 'panel-left' },
    { id: 'pivot', name: 'Pivot Door', icon: 'rotate-cw' }
  ],
  
  // Frame materials
  frameMaterials: [
    { id: 'upvc', name: 'uPVC', brands: ['Fenesta', 'Encraft', 'Kommerling', 'Lingel'] },
    { id: 'aluminum', name: 'Aluminum', brands: ['Jindal', 'Hindalco', 'Domal', 'Tostem'] },
    { id: 'wood', name: 'Wood', brands: ['Teak', 'Sal', 'Pine', 'Oak'] },
    { id: 'steel', name: 'Steel', brands: ['TATA', 'JSW', 'Sail'] },
    { id: 'composite', name: 'Composite', brands: ['Deceuninck', 'Rehau'] }
  ],
  
  // Glass types
  glassTypes: [
    { id: 'clear', name: 'Clear Float Glass', thickness: [4, 5, 6, 8, 10, 12] },
    { id: 'tinted', name: 'Tinted Glass', thickness: [5, 6, 8], colors: ['bronze', 'grey', 'green', 'blue'] },
    { id: 'reflective', name: 'Reflective Glass', thickness: [5, 6, 8], colors: ['silver', 'gold', 'blue', 'green'] },
    { id: 'tempered', name: 'Toughened/Tempered', thickness: [6, 8, 10, 12] },
    { id: 'laminated', name: 'Laminated Glass', thickness: [6.38, 8.76, 10.76, 12.76] },
    { id: 'double-glazed', name: 'Double Glazed (DGU)', thickness: [12, 16, 20, 24] },
    { id: 'triple-glazed', name: 'Triple Glazed', thickness: [24, 28, 32] },
    { id: 'frosted', name: 'Frosted/Obscure', thickness: [4, 5, 6] },
    { id: 'low-e', name: 'Low-E Glass', thickness: [6, 8] }
  ],
  
  // Profile colors
  profileColors: [
    { id: 'white', name: 'White', hex: '#FFFFFF' },
    { id: 'black', name: 'Black', hex: '#000000' },
    { id: 'grey', name: 'Anthracite Grey', hex: '#383838' },
    { id: 'brown', name: 'Mahogany Brown', hex: '#4A2C2A' },
    { id: 'wood-oak', name: 'Oak Woodgrain', hex: '#B8860B' },
    { id: 'wood-walnut', name: 'Walnut Woodgrain', hex: '#5D432C' },
    { id: 'cream', name: 'Cream', hex: '#FFFDD0' },
    { id: 'golden-oak', name: 'Golden Oak', hex: '#C19A6B' }
  ],
  
  // Hardware types
  hardwareTypes: [
    { id: 'handle', name: 'Handle', subtypes: ['lever', 'pull', 'knob', 'cremone'] },
    { id: 'lock', name: 'Lock', subtypes: ['multi-point', 'single-point', 'shoot-bolt', 'espagnolette'] },
    { id: 'hinge', name: 'Hinge', subtypes: ['friction-stay', 'butt', 'pivot', 'concealed'] },
    { id: 'cylinder', name: 'Cylinder', subtypes: ['single', 'double', 'thumb-turn'] },
    { id: 'closer', name: 'Door Closer', subtypes: ['overhead', 'concealed', 'floor-spring'] },
    { id: 'seal', name: 'Weather Seal', subtypes: ['brush', 'rubber', 'silicone'] }
  ],
  
  // Requirement pipeline
  pipelines: {
    requirement: {
      stages: [
        { id: 'new', name: 'New Inquiry', color: '#3B82F6' },
        { id: 'site_visit', name: 'Site Visit', color: '#8B5CF6' },
        { id: 'measurement', name: 'Measurement', color: '#06B6D4' },
        { id: 'quotation', name: 'Quotation', color: '#F59E0B' },
        { id: 'negotiation', name: 'Negotiation', color: '#EF4444' },
        { id: 'approved', name: 'Approved', color: '#10B981' },
        { id: 'lost', name: 'Lost', color: '#6B7280' }
      ]
    },
    order: {
      stages: [
        { id: 'confirmed', name: 'Confirmed', color: '#3B82F6' },
        { id: 'production', name: 'In Production', color: '#F59E0B' },
        { id: 'quality_check', name: 'Quality Check', color: '#8B5CF6' },
        { id: 'dispatch', name: 'Ready for Dispatch', color: '#06B6D4' },
        { id: 'delivered', name: 'Delivered', color: '#10B981' },
        { id: 'installed', name: 'Installed', color: '#059669' }
      ]
    }
  },
  
  // Pricing rules
  pricing: {
    defaultMarkup: 25,
    taxRate: 18,
    laborPerSqft: 150,
    installationPerUnit: 500,
    transportPerKm: 25
  },
  
  // Terms
  defaultTerms: [
    'Tax: As above.',
    'Transport: Additional as per actual.',
    'Installation: Inclusive.',
    'Installation Material: Inclusive.',
    'Prices offered are valid for 15 days only.',
    'Payment Terms: 50% Advance, 40% Before Delivery, 10% After Installation.',
    'Orders below ₹1 Lakh require 100% advance.',
    'Warranty: 15 years warranty against discoloration.',
    'Electricity: If required, to be provided by client.',
    'Scaffolding: If required, to be provided by client.'
  ],
  
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configCollection = db.collection('doors_windows_config')

    let config = await configCollection.findOne({ moduleType: 'doors-windows' })
    if (!config) {
      config = { ...defaultConfig, clientId: user.clientId }
      await configCollection.insertOne(config)
    }

    return successResponse({ config })
  } catch (error) {
    console.error('Doors-Windows Config GET Error:', error)
    return errorResponse('Failed to fetch config', 500, error.message)
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const updates = await request.json()
    
    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const configCollection = db.collection('doors_windows_config')

    const result = await configCollection.findOneAndUpdate(
      { moduleType: 'doors-windows' },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { upsert: true, returnDocument: 'after' }
    )

    return successResponse({ config: result })
  } catch (error) {
    console.error('Doors-Windows Config PUT Error:', error)
    return errorResponse('Failed to update config', 500, error.message)
  }
}
