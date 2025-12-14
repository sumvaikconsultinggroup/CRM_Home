import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Sample products data
const SAMPLE_PRODUCTS = [
  {
    name: 'King Size Storage Bed',
    category: 'bed',
    subcategory: 'storage',
    productType: 'configurable',
    description: 'Elegant king-size bed with hydraulic storage mechanism and plush headboard',
    basePrice: 85000,
    dimensions: { length: 2100, width: 1900, height: 1000, unit: 'mm' },
    leadTime: 21,
    tags: ['luxury', 'storage', 'modern']
  },
  {
    name: 'Queen Platform Bed',
    category: 'bed',
    subcategory: 'platform',
    productType: 'standard',
    description: 'Minimalist queen platform bed with solid wood frame',
    basePrice: 55000,
    dimensions: { length: 2000, width: 1600, height: 400, unit: 'mm' },
    leadTime: 14,
    tags: ['minimalist', 'modern']
  },
  {
    name: '3-Door Sliding Wardrobe',
    category: 'wardrobe',
    subcategory: 'sliding',
    productType: 'configurable',
    description: 'Spacious 3-door sliding wardrobe with soft-close mechanism',
    basePrice: 125000,
    dimensions: { length: 2400, width: 600, height: 2400, unit: 'mm' },
    leadTime: 30,
    tags: ['spacious', 'modern', 'soft-close']
  },
  {
    name: 'Walk-in Closet System',
    category: 'wardrobe',
    subcategory: 'walk_in',
    productType: 'made_to_order',
    description: 'Premium walk-in closet system with LED lighting',
    basePrice: 250000,
    dimensions: { length: 3000, width: 2000, height: 2400, unit: 'mm' },
    leadTime: 45,
    tags: ['premium', 'custom', 'led']
  },
  {
    name: 'L-Shaped Sectional Sofa',
    category: 'sofa',
    subcategory: 'l_shaped',
    productType: 'configurable',
    description: 'Comfortable L-shaped sofa with high-density foam and premium fabric',
    basePrice: 95000,
    dimensions: { length: 3000, width: 2000, height: 900, unit: 'mm' },
    leadTime: 25,
    tags: ['comfortable', 'premium', 'fabric']
  },
  {
    name: '3-Seater Recliner Sofa',
    category: 'sofa',
    subcategory: 'recliner',
    productType: 'standard',
    description: 'Electric recliner sofa with USB charging ports',
    basePrice: 145000,
    dimensions: { length: 2200, width: 950, height: 1050, unit: 'mm' },
    leadTime: 30,
    tags: ['recliner', 'electric', 'premium']
  },
  {
    name: '6-Seater Dining Table Set',
    category: 'dining',
    subcategory: 'table',
    productType: 'standard',
    description: 'Solid wood dining table with 6 upholstered chairs',
    basePrice: 78000,
    dimensions: { length: 1800, width: 900, height: 750, unit: 'mm' },
    leadTime: 20,
    tags: ['solid-wood', 'family']
  },
  {
    name: 'Executive Study Desk',
    category: 'desk',
    subcategory: 'executive',
    productType: 'configurable',
    description: 'Large executive desk with drawers and cable management',
    basePrice: 65000,
    dimensions: { length: 1800, width: 900, height: 750, unit: 'mm' },
    leadTime: 18,
    tags: ['executive', 'office', 'cable-management']
  },
  {
    name: 'Modular TV Unit',
    category: 'tv_unit',
    subcategory: 'wall_mounted',
    productType: 'configurable',
    description: 'Modern wall-mounted TV unit with floating shelves',
    basePrice: 45000,
    dimensions: { length: 2400, width: 400, height: 1200, unit: 'mm' },
    leadTime: 15,
    tags: ['modern', 'wall-mounted', 'modular']
  },
  {
    name: 'Kitchen Base Cabinet',
    category: 'kitchen',
    subcategory: 'base_cabinet',
    productType: 'configurable',
    description: 'Modular kitchen base cabinet with soft-close hinges',
    basePrice: 18000,
    dimensions: { length: 600, width: 560, height: 720, unit: 'mm' },
    leadTime: 12,
    tags: ['kitchen', 'modular', 'soft-close']
  },
  {
    name: 'Open Bookshelf',
    category: 'storage',
    subcategory: 'bookshelf',
    productType: 'standard',
    description: 'Contemporary open bookshelf with metal frame',
    basePrice: 32000,
    dimensions: { length: 1200, width: 350, height: 1800, unit: 'mm' },
    leadTime: 14,
    tags: ['contemporary', 'metal-frame']
  },
  {
    name: 'Buffet Cabinet',
    category: 'storage',
    subcategory: 'sideboard',
    productType: 'standard',
    description: 'Elegant buffet cabinet with wine storage',
    basePrice: 55000,
    dimensions: { length: 1600, width: 450, height: 900, unit: 'mm' },
    leadTime: 18,
    tags: ['dining', 'wine-storage', 'elegant']
  }
]

// Sample materials data
const SAMPLE_MATERIALS = [
  // Boards
  { name: 'Action Tesa HDHMR 18mm', code: 'AT-HDHMR-18', category: 'board', brand: 'Action Tesa', thickness: 18, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 4500, wastagePercent: 12 },
  { name: 'Century Plyboard BWP 19mm', code: 'CEN-BWP-19', category: 'board', brand: 'Century', thickness: 19, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 5200, wastagePercent: 12 },
  { name: 'Greenply MR Grade 18mm', code: 'GP-MR-18', category: 'board', brand: 'Greenply', thickness: 18, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 3800, wastagePercent: 10 },
  { name: 'MDF Board 18mm', code: 'MDF-18', category: 'board', brand: 'Generic', thickness: 18, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 2200, wastagePercent: 15 },
  // Laminates
  { name: 'Merino White Glossy', code: 'MER-WHT-GL', category: 'laminate', brand: 'Merino', thickness: 1, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 2800, wastagePercent: 8 },
  { name: 'Greenlam Oak Wood', code: 'GL-OAK-MT', category: 'laminate', brand: 'Greenlam', thickness: 0.8, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 2400, wastagePercent: 8 },
  { name: 'Century Walnut Matt', code: 'CEN-WAL-MT', category: 'laminate', brand: 'Century', thickness: 1, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 2600, wastagePercent: 8 },
  { name: 'Royale Touche Charcoal', code: 'RT-CHAR-GL', category: 'laminate', brand: 'Royale Touche', thickness: 1, sheetSize: { length: 2440, width: 1220, unit: 'mm' }, unitOfMeasure: 'sheet', unitPrice: 3200, wastagePercent: 8 },
  // Edge Bands
  { name: 'White Edge Band 22mm', code: 'EB-WHT-22', category: 'edge_band', brand: 'Generic', thickness: 0.8, unitOfMeasure: 'meter', unitPrice: 12, wastagePercent: 5 },
  { name: 'Oak Wood Edge Band 22mm', code: 'EB-OAK-22', category: 'edge_band', brand: 'Generic', thickness: 0.8, unitOfMeasure: 'meter', unitPrice: 15, wastagePercent: 5 },
  { name: 'Black Edge Band 22mm', code: 'EB-BLK-22', category: 'edge_band', brand: 'Generic', thickness: 0.8, unitOfMeasure: 'meter', unitPrice: 12, wastagePercent: 5 },
  // Adhesives
  { name: 'Fevicol SR 998', code: 'FEV-SR998', category: 'adhesive', brand: 'Fevicol', unitOfMeasure: 'kg', unitPrice: 280, wastagePercent: 2 },
  { name: 'Fevicol Marine', code: 'FEV-MAR', category: 'adhesive', brand: 'Fevicol', unitOfMeasure: 'kg', unitPrice: 320, wastagePercent: 2 },
  // Paints & Polish
  { name: 'Asian Paints PU Clear', code: 'AP-PU-CLR', category: 'polish', brand: 'Asian Paints', unitOfMeasure: 'liter', unitPrice: 850, wastagePercent: 5 },
  { name: 'Duco White Paint', code: 'DUCO-WHT', category: 'paint', brand: 'Generic', unitOfMeasure: 'liter', unitPrice: 650, wastagePercent: 5 },
  // Fabrics
  { name: 'Premium Velvet Blue', code: 'FAB-VLV-BLU', category: 'fabric', brand: 'Generic', unitOfMeasure: 'meter', unitPrice: 850, wastagePercent: 15, rollWidth: 140 },
  { name: 'Linen Beige', code: 'FAB-LIN-BEI', category: 'fabric', brand: 'Generic', unitOfMeasure: 'meter', unitPrice: 650, wastagePercent: 15, rollWidth: 140 },
  { name: 'Cotton Grey', code: 'FAB-COT-GRY', category: 'fabric', brand: 'Generic', unitOfMeasure: 'meter', unitPrice: 450, wastagePercent: 12, rollWidth: 120 },
  // Foam
  { name: 'HD Foam 50D', code: 'FOAM-50D', category: 'foam', brand: 'Generic', thickness: 50, unitOfMeasure: 'sheet', unitPrice: 1200, wastagePercent: 10 },
  { name: 'Super Soft Foam 32D', code: 'FOAM-32D', category: 'foam', brand: 'Generic', thickness: 100, unitOfMeasure: 'sheet', unitPrice: 1800, wastagePercent: 10 }
]

// Sample hardware data
const SAMPLE_HARDWARE = [
  // Hinges
  { name: 'Hettich Soft Close Hinge', code: 'HET-SC-110', category: 'hinge', type: 'soft_close', brand: 'Hettich', unitPrice: 280, packSize: 1 },
  { name: 'Blum Clip Top Hinge', code: 'BLM-CT-110', category: 'hinge', type: 'soft_close', brand: 'Blum', unitPrice: 450, packSize: 1 },
  { name: 'Ebco Standard Hinge', code: 'EBC-STD-110', category: 'hinge', type: 'standard', brand: 'Ebco', unitPrice: 85, packSize: 1 },
  // Channels
  { name: 'Hettich Quadro 45cm', code: 'HET-Q-450', category: 'channel', type: 'soft_close', brand: 'Hettich', size: '450mm', unitPrice: 1200, packSize: 1 },
  { name: 'Blum Tandem 50cm', code: 'BLM-T-500', category: 'channel', type: 'undermount', brand: 'Blum', size: '500mm', unitPrice: 2200, packSize: 1 },
  { name: 'Ebco Ball Bearing 45cm', code: 'EBC-BB-450', category: 'channel', type: 'ball_bearing', brand: 'Ebco', size: '450mm', unitPrice: 350, packSize: 1 },
  // Handles
  { name: 'Profile Handle 160mm Chrome', code: 'HDL-PRF-160', category: 'handle', type: 'profile', finish: 'chrome', size: '160mm', unitPrice: 180, packSize: 1 },
  { name: 'Bar Handle 256mm SS', code: 'HDL-BAR-256', category: 'handle', type: 'bar', finish: 'stainless_steel', size: '256mm', unitPrice: 250, packSize: 1 },
  { name: 'Knob Handle Rose Gold', code: 'HDL-KNB-RG', category: 'handle', type: 'knob', finish: 'rose_gold', size: '32mm', unitPrice: 120, packSize: 1 },
  // Locks
  { name: 'Multipurpose Lock', code: 'LCK-MP-STD', category: 'lock', type: 'multipurpose', brand: 'Generic', unitPrice: 150, packSize: 1 },
  { name: 'Cam Lock 16mm', code: 'LCK-CAM-16', category: 'lock', type: 'cam_lock', size: '16mm', unitPrice: 45, packSize: 1 },
  // Connectors
  { name: 'Minifix Connector', code: 'CON-MF-15', category: 'connector', type: 'minifix', unitPrice: 15, packSize: 10 },
  { name: 'Cam Connector', code: 'CON-CAM', category: 'connector', type: 'cam', unitPrice: 8, packSize: 10 },
  // Supports
  { name: 'Shelf Support 5mm', code: 'SUP-SHF-5', category: 'support', type: 'shelf_support', size: '5mm', unitPrice: 5, packSize: 4 },
  { name: 'Gas Strut 100N', code: 'SUP-GAS-100', category: 'support', type: 'gas_strut', loadCapacity: 100, unitPrice: 650, packSize: 1 },
  { name: 'Wardrobe Lift System', code: 'SUP-WL-800', category: 'support', type: 'wardrobe_lift', unitPrice: 4500, packSize: 1 },
  // Accessories
  { name: 'Wire Basket 600mm', code: 'ACC-WB-600', category: 'accessory', type: 'basket', size: '600mm', unitPrice: 850, packSize: 1 },
  { name: 'Trouser Pull Out', code: 'ACC-TPO', category: 'accessory', type: 'organizer', unitPrice: 2200, packSize: 1 },
  { name: 'Tie Rack', code: 'ACC-TR', category: 'accessory', type: 'organizer', unitPrice: 750, packSize: 1 }
]

// Sample warehouses
const SAMPLE_WAREHOUSES = [
  { name: 'Main Factory Warehouse', code: 'WH-MAIN', type: 'main', isDefault: true, address: { line1: 'Plot 45, Industrial Area', city: 'Bangalore', state: 'Karnataka', pincode: '560058' } },
  { name: 'Raw Material Store', code: 'WH-RAW', type: 'raw_material', address: { line1: 'Block B, Industrial Area', city: 'Bangalore', state: 'Karnataka', pincode: '560058' } },
  { name: 'Dispatch Warehouse', code: 'WH-DISP', type: 'dispatch', address: { line1: 'Gate 3, Industrial Area', city: 'Bangalore', state: 'Karnataka', pincode: '560058' } }
]

// POST - Seed sample data
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const seedType = searchParams.get('type') || 'all' // products, materials, hardware, warehouses, all

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const now = new Date().toISOString()
    const results = { products: 0, materials: 0, hardware: 0, warehouses: 0 }

    // Seed Products
    if (seedType === 'all' || seedType === 'products') {
      const products = db.collection('furniture_products')
      const existingCount = await products.countDocuments()
      
      if (existingCount === 0) {
        for (let i = 0; i < SAMPLE_PRODUCTS.length; i++) {
          const product = SAMPLE_PRODUCTS[i]
          await products.insertOne({
            id: uuidv4(),
            sku: `FRN-${product.category.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
            ...product,
            materials: [],
            finishes: [],
            hardware: [],
            images: [],
            drawings: [],
            warranty: '1 year',
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.products++
        }
      }
    }

    // Seed Materials
    if (seedType === 'all' || seedType === 'materials') {
      const materials = db.collection('furniture_materials')
      const existingCount = await materials.countDocuments()
      
      if (existingCount === 0) {
        for (const material of SAMPLE_MATERIALS) {
          await materials.insertOne({
            id: uuidv4(),
            ...material,
            specifications: {},
            reorderLevel: 10,
            leadTime: 7,
            supplier: '',
            images: [],
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.materials++
        }
      }
    }

    // Seed Hardware
    if (seedType === 'all' || seedType === 'hardware') {
      const hardware = db.collection('furniture_hardware')
      const existingCount = await hardware.countDocuments()
      
      if (existingCount === 0) {
        for (const item of SAMPLE_HARDWARE) {
          await hardware.insertOne({
            id: uuidv4(),
            ...item,
            specifications: {},
            unitOfMeasure: 'piece',
            reorderLevel: 50,
            supplier: '',
            images: [],
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.hardware++
        }
      }
    }

    // Seed Warehouses
    if (seedType === 'all' || seedType === 'warehouses') {
      const warehouses = db.collection('furniture_warehouses')
      const existingCount = await warehouses.countDocuments()
      
      if (existingCount === 0) {
        for (const wh of SAMPLE_WAREHOUSES) {
          await warehouses.insertOne({
            id: uuidv4(),
            ...wh,
            contactPerson: '',
            contactPhone: '',
            contactEmail: '',
            capacity: 10000,
            capacityUnit: 'sqft',
            zones: [],
            isActive: true,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now
          })
          results.warehouses++
        }
      }
    }

    return successResponse({ 
      message: 'Sample data seeded successfully', 
      results 
    })
  } catch (error) {
    console.error('Furniture Seed Error:', error)
    return errorResponse('Failed to seed data', 500, error.message)
  }
}

// GET - Get seed status
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)

    const [productCount, materialCount, hardwareCount, warehouseCount] = await Promise.all([
      db.collection('furniture_products').countDocuments(),
      db.collection('furniture_materials').countDocuments(),
      db.collection('furniture_hardware').countDocuments(),
      db.collection('furniture_warehouses').countDocuments()
    ])

    return successResponse({
      status: {
        products: { count: productCount, seeded: productCount >= SAMPLE_PRODUCTS.length },
        materials: { count: materialCount, seeded: materialCount >= SAMPLE_MATERIALS.length },
        hardware: { count: hardwareCount, seeded: hardwareCount >= SAMPLE_HARDWARE.length },
        warehouses: { count: warehouseCount, seeded: warehouseCount >= SAMPLE_WAREHOUSES.length }
      },
      availableSamples: {
        products: SAMPLE_PRODUCTS.length,
        materials: SAMPLE_MATERIALS.length,
        hardware: SAMPLE_HARDWARE.length,
        warehouses: SAMPLE_WAREHOUSES.length
      }
    })
  } catch (error) {
    console.error('Furniture Seed Status Error:', error)
    return errorResponse('Failed to get seed status', 500, error.message)
  }
}
