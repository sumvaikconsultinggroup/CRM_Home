// Flooring Module - Database Collections
export const FlooringCollections = {
  PRODUCTS: 'flooring_products',
  VARIANTS: 'flooring_variants',
  SUPPLIERS: 'flooring_suppliers',
  INVENTORY: 'flooring_inventory',
  QUOTATIONS: 'flooring_quotations',
  INVOICES: 'flooring_invoices',
  PROJECTS: 'flooring_projects',
  PROJECT_TASKS: 'flooring_project_tasks',
  CONSULTATIONS: 'flooring_consultations',
  FEEDBACK: 'flooring_feedback',
  SUPPLIER_ORDERS: 'flooring_supplier_orders',
  STOCK_MOVEMENTS: 'flooring_stock_movements'
}

// Flooring Product Types
export const WoodTypes = [
  { id: 'oak', name: 'Oak', description: 'Classic hardwood with prominent grain patterns' },
  { id: 'teak', name: 'Teak', description: 'Durable tropical hardwood, water-resistant' },
  { id: 'maple', name: 'Maple', description: 'Light-colored hardwood with subtle grain' },
  { id: 'bamboo', name: 'Bamboo', description: 'Eco-friendly, sustainable flooring option' },
  { id: 'walnut', name: 'Walnut', description: 'Rich dark tones with elegant grain' },
  { id: 'cherry', name: 'Cherry', description: 'Warm reddish-brown hardwood' },
  { id: 'ash', name: 'Ash', description: 'Strong, shock-resistant light wood' },
  { id: 'hickory', name: 'Hickory', description: 'Extremely hard with rustic character' },
  { id: 'reclaimed', name: 'Reclaimed Wood', description: 'Sustainable recycled vintage wood' },
  { id: 'engineered', name: 'Engineered Wood', description: 'Multi-layer construction for stability' }
]

export const FloorFinishes = [
  { id: 'matte', name: 'Matte', description: 'Low sheen, natural look' },
  { id: 'satin', name: 'Satin', description: 'Medium sheen, balanced finish' },
  { id: 'semi-gloss', name: 'Semi-Gloss', description: 'Moderate shine, easy to clean' },
  { id: 'high-gloss', name: 'High Gloss', description: 'Maximum shine and reflection' },
  { id: 'hand-scraped', name: 'Hand-Scraped', description: 'Textured, rustic appearance' },
  { id: 'wire-brushed', name: 'Wire-Brushed', description: 'Enhanced grain texture' },
  { id: 'distressed', name: 'Distressed', description: 'Aged, vintage look' },
  { id: 'oiled', name: 'Oiled', description: 'Natural penetrating finish' }
]

export const FlooringSizes = [
  { id: 'strip', name: 'Strip (2-3")', width: '2-3 inches', description: 'Traditional narrow planks' },
  { id: 'plank', name: 'Plank (3-8")', width: '3-8 inches', description: 'Standard width planks' },
  { id: 'wide-plank', name: 'Wide Plank (8-12")', width: '8-12 inches', description: 'Modern wide planks' },
  { id: 'parquet', name: 'Parquet', width: 'Variable', description: 'Geometric patterns' }
]

export const ProjectStages = [
  { id: 'inquiry', name: 'Inquiry', order: 1, color: '#3B82F6' },
  { id: 'site_visit', name: 'Site Visit Scheduled', order: 2, color: '#8B5CF6' },
  { id: 'measurement', name: 'Measurement Done', order: 3, color: '#EC4899' },
  { id: 'quotation_sent', name: 'Quotation Sent', order: 4, color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', order: 5, color: '#EF4444' },
  { id: 'order_confirmed', name: 'Order Confirmed', order: 6, color: '#10B981' },
  { id: 'materials_ordered', name: 'Materials Ordered', order: 7, color: '#06B6D4' },
  { id: 'materials_delivered', name: 'Materials Delivered', order: 8, color: '#84CC16' },
  { id: 'installation_scheduled', name: 'Installation Scheduled', order: 9, color: '#F97316' },
  { id: 'installation_progress', name: 'Installation In Progress', order: 10, color: '#A855F7' },
  { id: 'quality_check', name: 'Quality Check', order: 11, color: '#14B8A6' },
  { id: 'completed', name: 'Project Completed', order: 12, color: '#22C55E' }
]

export const QuotationStatus = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']
export const InvoiceStatus = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']
export const ConsultationStatus = ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled']
export const SupplierOrderStatus = ['pending', 'confirmed', 'shipped', 'delivered', 'partial', 'cancelled']

// Generate sample products for seeding
export function generateSampleFlooringProducts(clientId) {
  const products = []
  
  WoodTypes.forEach((wood, woodIndex) => {
    FloorFinishes.slice(0, 3).forEach((finish, finishIndex) => {
      products.push({
        clientId,
        name: `${wood.name} ${finish.name} Flooring`,
        woodType: wood.id,
        finish: finish.id,
        description: `Premium ${wood.name.toLowerCase()} flooring with ${finish.name.toLowerCase()} finish. ${wood.description}`,
        basePrice: 150 + (woodIndex * 50) + (finishIndex * 20),
        pricePerSqFt: 15 + (woodIndex * 5) + (finishIndex * 2),
        specifications: {
          thickness: '3/4 inch',
          width: '5 inches',
          length: '48-84 inches',
          wearLayer: '4mm',
          installationType: 'Nail/Glue/Float',
          warranty: '25 years'
        },
        images: [
          `https://images.pexels.com/photos/${1000000 + woodIndex * 1000 + finishIndex * 100}/pexels-photo.jpeg`
        ],
        category: wood.id === 'engineered' ? 'engineered' : 'solid',
        tags: [wood.id, finish.id, 'premium', 'residential'],
        inStock: true,
        featured: woodIndex < 3,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    })
  })
  
  return products
}

export function generateSampleSuppliers(clientId) {
  return [
    {
      clientId,
      name: 'Premium Woods International',
      contactPerson: 'Rajesh Kumar',
      email: 'rajesh@premiumwoods.com',
      phone: '+91 98765 43210',
      address: '123 Industrial Area, Mumbai',
      gstNumber: '27AABCP1234A1Z5',
      rating: 4.5,
      leadTime: 7,
      minimumOrder: 500,
      paymentTerms: 'Net 30',
      specialties: ['oak', 'maple', 'walnut'],
      deliveryAreas: ['Mumbai', 'Pune', 'Nashik'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      clientId,
      name: 'Eco Bamboo Traders',
      contactPerson: 'Priya Sharma',
      email: 'priya@ecobamboo.com',
      phone: '+91 98765 43211',
      address: '456 Green Park, Delhi',
      gstNumber: '07AABCE5678B2Z3',
      rating: 4.8,
      leadTime: 5,
      minimumOrder: 300,
      paymentTerms: 'Net 15',
      specialties: ['bamboo', 'reclaimed'],
      deliveryAreas: ['Delhi', 'Noida', 'Gurgaon'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      clientId,
      name: 'Teak House Exports',
      contactPerson: 'Amit Patel',
      email: 'amit@teakhouse.com',
      phone: '+91 98765 43212',
      address: '789 Timber Zone, Bengaluru',
      gstNumber: '29AABCT9012C3Z1',
      rating: 4.2,
      leadTime: 10,
      minimumOrder: 1000,
      paymentTerms: 'Net 45',
      specialties: ['teak', 'cherry', 'ash'],
      deliveryAreas: ['Bengaluru', 'Chennai', 'Hyderabad'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
}

export function generateSampleInventory(clientId, products) {
  return products.slice(0, 10).map((product, index) => ({
    clientId,
    productId: product.id,
    productName: product.name,
    sku: `WF-${product.woodType?.toUpperCase().slice(0, 3)}-${(index + 1).toString().padStart(4, '0')}`,
    quantity: Math.floor(Math.random() * 500) + 100,
    unit: 'sq.ft',
    reorderLevel: 50,
    reorderQuantity: 200,
    location: ['Warehouse A', 'Warehouse B', 'Showroom'][Math.floor(Math.random() * 3)],
    costPrice: product.basePrice * 0.6,
    sellingPrice: product.basePrice,
    lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}
