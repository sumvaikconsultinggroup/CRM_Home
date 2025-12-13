// Flooring Module Database Schema & Collections
// Option B: Separate Linked Collections for Scalability

import { getCollection } from './mongodb'
import { v4 as uuidv4 } from 'uuid'

// Collection Names
export const FlooringCollections = {
  PRODUCTS: 'flooring_products',
  CUSTOMER_PROFILES: 'flooring_customer_profiles',
  PROJECT_DETAILS: 'flooring_project_details',
  ROOMS: 'flooring_rooms',
  QUOTES: 'flooring_quotes',
  QUOTE_ITEMS: 'flooring_quote_items',
  INSTALLATIONS: 'flooring_installations',
  INVENTORY: 'flooring_inventory',
  SUPPLIERS: 'flooring_suppliers'
}

// Product Categories
export const FlooringCategories = {
  HARDWOOD: 'hardwood',
  ENGINEERED_WOOD: 'engineered_wood',
  LAMINATE: 'laminate',
  VINYL: 'vinyl',
  TILE: 'tile',
  CARPET: 'carpet',
  BAMBOO: 'bamboo',
  CORK: 'cork'
}

// Product Subcategories
export const FlooringSubcategories = {
  hardwood: ['Oak', 'Maple', 'Walnut', 'Cherry', 'Hickory', 'Ash', 'Teak'],
  engineered_wood: ['Oak', 'Maple', 'Walnut', 'Hickory', 'Acacia'],
  laminate: ['Wood Look', 'Stone Look', 'Tile Look'],
  vinyl: ['LVP (Luxury Vinyl Plank)', 'LVT (Luxury Vinyl Tile)', 'Sheet Vinyl', 'WPC', 'SPC'],
  tile: ['Ceramic', 'Porcelain', 'Natural Stone', 'Marble', 'Granite'],
  carpet: ['Nylon', 'Polyester', 'Wool', 'Olefin'],
  bamboo: ['Strand Woven', 'Horizontal', 'Vertical'],
  cork: ['Floating', 'Glue-Down']
}

// Room Types
export const RoomTypes = {
  LIVING_ROOM: 'living_room',
  BEDROOM: 'bedroom',
  MASTER_BEDROOM: 'master_bedroom',
  KITCHEN: 'kitchen',
  BATHROOM: 'bathroom',
  DINING_ROOM: 'dining_room',
  HALLWAY: 'hallway',
  STAIRS: 'stairs',
  OFFICE: 'office',
  BASEMENT: 'basement',
  GARAGE: 'garage',
  COMMERCIAL: 'commercial',
  OTHER: 'other'
}

// Installation Types
export const InstallationTypes = {
  FLOATING: 'floating',
  GLUE_DOWN: 'glue_down',
  NAIL_DOWN: 'nail_down',
  CLICK_LOCK: 'click_lock',
  LOOSE_LAY: 'loose_lay'
}

// Quote Status
export const QuoteStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted'
}

// Installation Status
export const InstallationStatus = {
  SCHEDULED: 'scheduled',
  MATERIALS_ORDERED: 'materials_ordered',
  MATERIALS_DELIVERED: 'materials_delivered',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// Helper to generate IDs
export const generateFlooringId = (prefix) => `${prefix}_${uuidv4().split('-')[0]}`

// Default wastage percentages by category
export const DefaultWastage = {
  hardwood: 10,
  engineered_wood: 10,
  laminate: 8,
  vinyl: 5,
  tile: 10,
  carpet: 5,
  bamboo: 10,
  cork: 8
}

// Initialize collections with indexes
export async function initializeFlooringCollections() {
  try {
    // Products collection
    const products = await getCollection(FlooringCollections.PRODUCTS)
    await products.createIndex({ sku: 1 }, { unique: true })
    await products.createIndex({ category: 1 })
    await products.createIndex({ clientId: 1 })
    await products.createIndex({ status: 1 })

    // Customer Profiles
    const profiles = await getCollection(FlooringCollections.CUSTOMER_PROFILES)
    await profiles.createIndex({ leadId: 1 }, { unique: true })
    await profiles.createIndex({ clientId: 1 })

    // Project Details
    const projectDetails = await getCollection(FlooringCollections.PROJECT_DETAILS)
    await projectDetails.createIndex({ projectId: 1 }, { unique: true })
    await projectDetails.createIndex({ clientId: 1 })

    // Rooms
    const rooms = await getCollection(FlooringCollections.ROOMS)
    await rooms.createIndex({ projectId: 1 })
    await rooms.createIndex({ clientId: 1 })

    // Quotes
    const quotes = await getCollection(FlooringCollections.QUOTES)
    await quotes.createIndex({ quoteNumber: 1 })
    await quotes.createIndex({ projectId: 1 })
    await quotes.createIndex({ leadId: 1 })
    await quotes.createIndex({ clientId: 1 })
    await quotes.createIndex({ status: 1 })

    // Quote Items
    const quoteItems = await getCollection(FlooringCollections.QUOTE_ITEMS)
    await quoteItems.createIndex({ quoteId: 1 })

    // Installations
    const installations = await getCollection(FlooringCollections.INSTALLATIONS)
    await installations.createIndex({ projectId: 1 })
    await installations.createIndex({ clientId: 1 })
    await installations.createIndex({ status: 1 })

    // Inventory
    const inventory = await getCollection(FlooringCollections.INVENTORY)
    await inventory.createIndex({ productId: 1, warehouseId: 1 }, { unique: true })
    await inventory.createIndex({ clientId: 1 })

    console.log('Flooring collections initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize flooring collections:', error)
    return false
  }
}

// Calculation helpers
export const FlooringCalculations = {
  // Calculate area with wastage
  calculateAreaWithWastage: (netArea, wastagePercent) => {
    return netArea * (1 + wastagePercent / 100)
  },

  // Calculate boxes needed (most flooring sold in boxes)
  calculateBoxesNeeded: (totalSqft, sqftPerBox) => {
    return Math.ceil(totalSqft / sqftPerBox)
  },

  // Calculate material cost
  calculateMaterialCost: (quantity, pricePerUnit, unit = 'sqft') => {
    return quantity * pricePerUnit
  },

  // Calculate labor cost
  calculateLaborCost: (totalSqft, laborRatePerSqft) => {
    return totalSqft * laborRatePerSqft
  },

  // Calculate room area from dimensions
  calculateRoomArea: (length, width, obstacles = []) => {
    const grossArea = length * width
    const obstaclesArea = obstacles.reduce((sum, obs) => sum + (obs.length * obs.width), 0)
    return grossArea - obstaclesArea
  },

  // Calculate transitions/moldings needed
  calculateTransitions: (doorways, roomPerimeter) => {
    // T-moldings for doorways, baseboards for perimeter
    return {
      tMoldings: doorways,
      baseboardFeet: roomPerimeter
    }
  }
}
