// Product Categories and Types for Doors & Windows Industry
export const PRODUCT_FAMILIES = ['Aluminium', 'uPVC', 'Wood', 'Steel', 'Composite']

export const CATEGORIES = [
  'Sliding',
  'Casement', 
  'Tilt & Turn',
  'Fixed',
  'Folding',
  'French',
  'Bi-Fold',
  'Lift & Slide',
  'Awning',
  'Hopper',
  'Pivot',
  'Louvre',
  'Bay Window',
  'Partition',
  'Curtain Wall',
  'Skylight',
  'Entrance Door',
  'Patio Door'
]

export const PRODUCT_TYPES = ['Window', 'Door']

export const GLASS_TYPES = [
  { id: 'single', name: 'Single Glazed', multiplier: 1.0 },
  { id: 'double', name: 'Double Glazed (DGU)', multiplier: 1.35 },
  { id: 'triple', name: 'Triple Glazed', multiplier: 1.65 },
  { id: 'laminated', name: 'Laminated', multiplier: 1.25 },
  { id: 'tinted', name: 'Tinted', multiplier: 1.15 },
  { id: 'reflective', name: 'Reflective', multiplier: 1.30 },
  { id: 'low-e', name: 'Low-E Coated', multiplier: 1.45 },
  { id: 'acoustic', name: 'Acoustic', multiplier: 1.55 },
  { id: 'toughened', name: 'Toughened/Tempered', multiplier: 1.20 },
  { id: 'frosted', name: 'Frosted/Obscure', multiplier: 1.10 }
]

export const HARDWARE_TYPES = [
  'Handle',
  'Rollers',
  'Hinges',
  'Espagnolette',
  'Multi-Point Lock',
  'Cylinder Lock',
  'Stopper',
  'Track',
  'Friction Stay',
  'Casement Stay',
  'Weather Seal',
  'Mosquito Mesh'
]

export const FINISHES = [
  { id: 'anodized', name: 'Anodized', multiplier: 1.0 },
  { id: 'powder-coat', name: 'Powder Coated', multiplier: 1.15 },
  { id: 'wood-finish', name: 'Wood Finish', multiplier: 1.35 },
  { id: 'laminate', name: 'Laminate', multiplier: 1.40 },
  { id: 'natural', name: 'Natural/Mill Finish', multiplier: 0.95 },
  { id: 'brush', name: 'Brushed', multiplier: 1.20 },
  { id: 'chrome', name: 'Chrome Plated', multiplier: 1.50 }
]

export const FRAME_COLORS = [
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'black', name: 'Black', hex: '#1a1a1a' },
  { id: 'grey', name: 'Grey', hex: '#808080' },
  { id: 'brown', name: 'Brown', hex: '#8B4513' },
  { id: 'silver', name: 'Silver', hex: '#C0C0C0' },
  { id: 'bronze', name: 'Bronze', hex: '#CD7F32' },
  { id: 'champagne', name: 'Champagne', hex: '#F7E7CE' },
  { id: 'woodgrain', name: 'Wood Grain', hex: '#DEB887' }
]

// Industry Standard Pricing Rates (per sq.ft)
export const PRICING_RATES = {
  // Base rates per material per sq.ft
  materials: {
    'Aluminium': {
      base: 450,
      premium: 650,
      description: 'Standard aluminium profiles'
    },
    'uPVC': {
      base: 380,
      premium: 520,
      description: 'PVC profiles'
    },
    'Wood': {
      base: 800,
      premium: 1500,
      description: 'Solid wood frames'
    },
    'Steel': {
      base: 550,
      premium: 850,
      description: 'Steel frames'
    },
    'Composite': {
      base: 600,
      premium: 900,
      description: 'Composite materials'
    }
  },
  
  // Category multipliers
  categories: {
    'Sliding': 1.0,
    'Casement': 1.15,
    'Tilt & Turn': 1.35,
    'Fixed': 0.85,
    'Folding': 1.45,
    'French': 1.30,
    'Bi-Fold': 1.55,
    'Lift & Slide': 1.65,
    'Awning': 1.20,
    'Hopper': 1.10,
    'Pivot': 1.40,
    'Louvre': 1.25,
    'Bay Window': 1.60,
    'Partition': 0.90,
    'Curtain Wall': 1.80,
    'Skylight': 1.70,
    'Entrance Door': 1.50,
    'Patio Door': 1.35
  },
  
  // Type multipliers (Door vs Window)
  types: {
    'Window': 1.0,
    'Door': 1.25
  },
  
  // Installation charges per sq.ft
  installation: {
    standard: 85,
    complex: 150,
    highRise: 200
  },
  
  // Additional charges
  extras: {
    mosquitoMesh: 45, // per sq.ft
    grill: 120, // per sq.ft
    safetyBars: 180, // per sq.ft
    blinds: 200, // per sq.ft
  },
  
  // Accessory base prices
  accessories: {
    handle: { name: 'Door/Window Handle', price: 450, unit: 'piece' },
    lockMultiPoint: { name: 'Multi-Point Lock', price: 2500, unit: 'piece' },
    lockCylinder: { name: 'Cylinder Lock', price: 850, unit: 'piece' },
    hinges: { name: 'Heavy Duty Hinges', price: 350, unit: 'pair' },
    rollers: { name: 'Premium Rollers', price: 600, unit: 'set' },
    frictionStay: { name: 'Friction Stay', price: 420, unit: 'pair' },
    weatherSeal: { name: 'Weather Seal Strip', price: 85, unit: 'meter' },
    silicone: { name: 'Silicone Sealant', price: 250, unit: 'tube' },
    doorCloser: { name: 'Door Closer', price: 1800, unit: 'piece' },
    floorSpring: { name: 'Floor Spring', price: 4500, unit: 'piece' },
    kickPlate: { name: 'Kick Plate', price: 650, unit: 'piece' },
    threshold: { name: 'Threshold', price: 800, unit: 'piece' }
  }
}

// Survey-related constants
export const BUILDING_TYPES = [
  'Residential - Villa',
  'Residential - Apartment',
  'Residential - Bungalow',
  'Commercial - Office',
  'Commercial - Retail',
  'Commercial - Showroom',
  'Industrial - Factory',
  'Industrial - Warehouse',
  'Institutional - School',
  'Institutional - Hospital',
  'Mixed Use'
]

export const FLOOR_LEVELS = [
  'Basement',
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor+',
  'Terrace',
  'Mezzanine'
]

export const ROOM_TYPES = [
  'Living Room',
  'Bedroom',
  'Master Bedroom',
  'Kitchen',
  'Bathroom',
  'Dining Room',
  'Study/Office',
  'Balcony',
  'Terrace',
  'Staircase',
  'Corridor',
  'Reception',
  'Conference Room',
  'Lobby',
  'Other'
]

// Status options
export const SURVEY_STATUSES = ['pending', 'in-progress', 'completed', 'cancelled']
export const QUOTE_STATUSES = ['draft', 'pending-approval', 'sent', 'viewed', 'approved', 'rejected', 'expired']
export const ORDER_STATUSES = ['pending', 'confirmed', 'in-production', 'ready', 'dispatched', 'delivered', 'installed', 'completed']
