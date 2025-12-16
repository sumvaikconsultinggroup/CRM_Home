import { v4 as uuidv4 } from 'uuid'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { successResponse, errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// Pre-built professional templates for construction & interior design
const PRE_BUILT_TEMPLATES = [
  // Interior Design Templates
  {
    name: 'Complete Home Interior',
    description: 'Full home interior design project including living room, bedrooms, kitchen, and bathrooms with premium finishes.',
    projectType: 'interior_design',
    category: 'Residential',
    icon: '🏠',
    color: '#6366f1',
    estimatedDuration: 90,
    defaultBudget: 2500000,
    estimatedCost: 2000000,
    milestones: [
      { name: 'Initial Consultation', phase: 'planning', order: 1, durationDays: 3 },
      { name: 'Site Measurement', phase: 'planning', order: 2, durationDays: 2 },
      { name: '3D Design Concept', phase: 'planning', order: 3, durationDays: 10 },
      { name: 'Design Finalization', phase: 'planning', order: 4, durationDays: 5 },
      { name: 'Material Selection', phase: 'in_progress', order: 5, durationDays: 7 },
      { name: 'Civil Work', phase: 'in_progress', order: 6, durationDays: 15 },
      { name: 'Electrical & Plumbing', phase: 'in_progress', order: 7, durationDays: 10 },
      { name: 'False Ceiling & Painting', phase: 'in_progress', order: 8, durationDays: 12 },
      { name: 'Modular Furniture Installation', phase: 'in_progress', order: 9, durationDays: 15 },
      { name: 'Soft Furnishing', phase: 'review', order: 10, durationDays: 5 },
      { name: 'Final Inspection', phase: 'review', order: 11, durationDays: 2 },
      { name: 'Handover & Documentation', phase: 'completed', order: 12, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Schedule client meeting', description: 'Initial consultation to understand requirements', priority: 'high' },
      { title: 'Take site measurements', description: 'Complete floor plan measurements', priority: 'high' },
      { title: 'Create mood boards', description: 'Design inspiration boards for each room', priority: 'medium' },
      { title: 'Prepare 3D renders', description: 'Photorealistic renders of proposed design', priority: 'high' },
      { title: 'Get vendor quotes', description: 'Collect quotations from contractors', priority: 'medium' },
      { title: 'Material procurement', description: 'Order all approved materials', priority: 'high' }
    ],
    tags: ['residential', 'premium', 'full-home']
  },
  {
    name: 'Modular Kitchen Design',
    description: 'Complete modular kitchen design and installation including countertops, cabinets, appliances, and accessories.',
    projectType: 'interior_design',
    category: 'Kitchen',
    icon: '🍳',
    color: '#f59e0b',
    estimatedDuration: 45,
    defaultBudget: 800000,
    estimatedCost: 650000,
    milestones: [
      { name: 'Kitchen Consultation', phase: 'planning', order: 1, durationDays: 2 },
      { name: 'Layout Design', phase: 'planning', order: 2, durationDays: 5 },
      { name: 'Material Selection', phase: 'planning', order: 3, durationDays: 3 },
      { name: '3D Visualization', phase: 'planning', order: 4, durationDays: 4 },
      { name: 'Quote Approval', phase: 'planning', order: 5, durationDays: 2 },
      { name: 'Civil Prep Work', phase: 'in_progress', order: 6, durationDays: 5 },
      { name: 'Cabinet Manufacturing', phase: 'in_progress', order: 7, durationDays: 15 },
      { name: 'Countertop Installation', phase: 'in_progress', order: 8, durationDays: 3 },
      { name: 'Cabinet Installation', phase: 'in_progress', order: 9, durationDays: 4 },
      { name: 'Appliance Fitting', phase: 'review', order: 10, durationDays: 2 },
      { name: 'Final Handover', phase: 'completed', order: 11, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Assess kitchen space', description: 'Measure and document current kitchen', priority: 'high' },
      { title: 'Design L/U/Island layout', description: 'Create optimal kitchen layout', priority: 'high' },
      { title: 'Select cabinet finish', description: 'Choose laminate/acrylic/PU finish', priority: 'medium' },
      { title: 'Countertop material', description: 'Granite/Quartz/Corian selection', priority: 'medium' }
    ],
    tags: ['kitchen', 'modular', 'renovation']
  },
  {
    name: 'Living Room Makeover',
    description: 'Transform your living space with modern furniture, lighting, and decor elements.',
    projectType: 'interior_design',
    category: 'Residential',
    icon: '🛋️',
    color: '#8b5cf6',
    estimatedDuration: 30,
    defaultBudget: 500000,
    estimatedCost: 400000,
    milestones: [
      { name: 'Design Consultation', phase: 'planning', order: 1, durationDays: 2 },
      { name: 'Concept Development', phase: 'planning', order: 2, durationDays: 5 },
      { name: 'Furniture Selection', phase: 'planning', order: 3, durationDays: 5 },
      { name: 'Wall Treatments', phase: 'in_progress', order: 4, durationDays: 5 },
      { name: 'Lighting Installation', phase: 'in_progress', order: 5, durationDays: 3 },
      { name: 'Furniture Delivery', phase: 'in_progress', order: 6, durationDays: 7 },
      { name: 'Decor & Styling', phase: 'review', order: 7, durationDays: 2 },
      { name: 'Final Reveal', phase: 'completed', order: 8, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Living room assessment', description: 'Evaluate current space and requirements', priority: 'high' },
      { title: 'Create design concept', description: 'Mood board and design direction', priority: 'high' },
      { title: 'Source furniture', description: 'Select sofas, tables, and storage', priority: 'medium' }
    ],
    tags: ['living-room', 'makeover', 'furniture']
  },
  {
    name: 'Master Bedroom Suite',
    description: 'Luxury master bedroom design with walk-in wardrobe, en-suite bathroom, and custom furniture.',
    projectType: 'interior_design',
    category: 'Bedroom',
    icon: '🛏️',
    color: '#ec4899',
    estimatedDuration: 45,
    defaultBudget: 700000,
    estimatedCost: 550000,
    milestones: [
      { name: 'Requirement Gathering', phase: 'planning', order: 1, durationDays: 2 },
      { name: 'Design Development', phase: 'planning', order: 2, durationDays: 7 },
      { name: 'Wardrobe Design', phase: 'planning', order: 3, durationDays: 5 },
      { name: 'Civil Work', phase: 'in_progress', order: 4, durationDays: 7 },
      { name: 'Wardrobe Installation', phase: 'in_progress', order: 5, durationDays: 10 },
      { name: 'Bed & Furniture', phase: 'in_progress', order: 6, durationDays: 7 },
      { name: 'Lighting & Curtains', phase: 'in_progress', order: 7, durationDays: 3 },
      { name: 'Styling & Handover', phase: 'completed', order: 8, durationDays: 2 }
    ],
    defaultTasks: [
      { title: 'Bedroom measurements', description: 'Detailed room dimensions', priority: 'high' },
      { title: 'Wardrobe requirements', description: 'Storage needs assessment', priority: 'high' },
      { title: 'Bed frame selection', description: 'King/Queen with storage options', priority: 'medium' }
    ],
    tags: ['bedroom', 'luxury', 'wardrobe']
  },
  // Commercial Templates
  {
    name: 'Corporate Office Setup',
    description: 'Professional office interior including workstations, meeting rooms, reception, and pantry area.',
    projectType: 'commercial',
    category: 'Office',
    icon: '🏢',
    color: '#3b82f6',
    estimatedDuration: 60,
    defaultBudget: 3000000,
    estimatedCost: 2500000,
    milestones: [
      { name: 'Space Planning', phase: 'planning', order: 1, durationDays: 5 },
      { name: 'Design & 3D', phase: 'planning', order: 2, durationDays: 10 },
      { name: 'BOQ & Approval', phase: 'planning', order: 3, durationDays: 5 },
      { name: 'Demolition & Civil', phase: 'in_progress', order: 4, durationDays: 10 },
      { name: 'MEP Work', phase: 'in_progress', order: 5, durationDays: 12 },
      { name: 'False Ceiling', phase: 'in_progress', order: 6, durationDays: 8 },
      { name: 'Flooring', phase: 'in_progress', order: 7, durationDays: 5 },
      { name: 'Furniture Installation', phase: 'in_progress', order: 8, durationDays: 10 },
      { name: 'IT Infrastructure', phase: 'review', order: 9, durationDays: 5 },
      { name: 'Final Handover', phase: 'completed', order: 10, durationDays: 2 }
    ],
    defaultTasks: [
      { title: 'Employee headcount', description: 'Current and projected team size', priority: 'high' },
      { title: 'Meeting room requirements', description: 'Number and capacity of meeting rooms', priority: 'high' },
      { title: 'IT/AV requirements', description: 'Networking and audio-visual needs', priority: 'medium' },
      { title: 'Brand guidelines', description: 'Company branding for design integration', priority: 'medium' }
    ],
    tags: ['office', 'corporate', 'commercial']
  },
  {
    name: 'Retail Store Design',
    description: 'Complete retail store interior with display units, checkout counter, storage, and branding elements.',
    projectType: 'commercial',
    category: 'Retail',
    icon: '🏪',
    color: '#10b981',
    estimatedDuration: 45,
    defaultBudget: 1500000,
    estimatedCost: 1200000,
    milestones: [
      { name: 'Brand Analysis', phase: 'planning', order: 1, durationDays: 3 },
      { name: 'Layout Planning', phase: 'planning', order: 2, durationDays: 5 },
      { name: 'Fixture Design', phase: 'planning', order: 3, durationDays: 7 },
      { name: 'Civil Work', phase: 'in_progress', order: 4, durationDays: 8 },
      { name: 'Fixture Manufacturing', phase: 'in_progress', order: 5, durationDays: 12 },
      { name: 'Installation', phase: 'in_progress', order: 6, durationDays: 8 },
      { name: 'Signage & Branding', phase: 'review', order: 7, durationDays: 3 },
      { name: 'Store Launch', phase: 'completed', order: 8, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Retail footfall analysis', description: 'Expected customer traffic patterns', priority: 'high' },
      { title: 'Product display needs', description: 'SKU count and display requirements', priority: 'high' },
      { title: 'POS location', description: 'Checkout counter positioning', priority: 'medium' }
    ],
    tags: ['retail', 'store', 'commercial']
  },
  {
    name: 'Restaurant Interior',
    description: 'Complete restaurant design including seating, kitchen, bar area, and ambiance elements.',
    projectType: 'commercial',
    category: 'Hospitality',
    icon: '🍽️',
    color: '#ef4444',
    estimatedDuration: 75,
    defaultBudget: 4000000,
    estimatedCost: 3500000,
    milestones: [
      { name: 'Concept Development', phase: 'planning', order: 1, durationDays: 7 },
      { name: 'Layout & Seating', phase: 'planning', order: 2, durationDays: 5 },
      { name: 'Kitchen Planning', phase: 'planning', order: 3, durationDays: 7 },
      { name: 'Licensing & Approvals', phase: 'planning', order: 4, durationDays: 10 },
      { name: 'Civil & MEP', phase: 'in_progress', order: 5, durationDays: 15 },
      { name: 'Kitchen Installation', phase: 'in_progress', order: 6, durationDays: 10 },
      { name: 'Furniture & Decor', phase: 'in_progress', order: 7, durationDays: 10 },
      { name: 'Lighting & Sound', phase: 'review', order: 8, durationDays: 5 },
      { name: 'Trial Run', phase: 'review', order: 9, durationDays: 3 },
      { name: 'Grand Opening', phase: 'completed', order: 10, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Menu concept', description: 'Cuisine type affecting kitchen design', priority: 'high' },
      { title: 'Seating capacity', description: 'Target covers per service', priority: 'high' },
      { title: 'Bar requirements', description: 'Full bar or service bar needs', priority: 'medium' },
      { title: 'FSSAI compliance', description: 'Food safety requirements', priority: 'high' }
    ],
    tags: ['restaurant', 'hospitality', 'F&B']
  },
  // Construction Templates
  {
    name: 'Villa Construction',
    description: 'Complete villa construction from foundation to finishing with landscape and interiors.',
    projectType: 'new_construction',
    category: 'Residential',
    icon: '🏡',
    color: '#14b8a6',
    estimatedDuration: 365,
    defaultBudget: 15000000,
    estimatedCost: 12000000,
    milestones: [
      { name: 'Architectural Design', phase: 'planning', order: 1, durationDays: 30 },
      { name: 'Structural Design', phase: 'planning', order: 2, durationDays: 15 },
      { name: 'Government Approvals', phase: 'planning', order: 3, durationDays: 45 },
      { name: 'Foundation', phase: 'in_progress', order: 4, durationDays: 30 },
      { name: 'Plinth & Columns', phase: 'in_progress', order: 5, durationDays: 30 },
      { name: 'Slab & Beams', phase: 'in_progress', order: 6, durationDays: 45 },
      { name: 'Brickwork', phase: 'in_progress', order: 7, durationDays: 30 },
      { name: 'Plumbing & Electrical', phase: 'in_progress', order: 8, durationDays: 30 },
      { name: 'Plastering', phase: 'in_progress', order: 9, durationDays: 20 },
      { name: 'Flooring & Tiling', phase: 'in_progress', order: 10, durationDays: 25 },
      { name: 'Doors & Windows', phase: 'in_progress', order: 11, durationDays: 15 },
      { name: 'Painting', phase: 'in_progress', order: 12, durationDays: 20 },
      { name: 'Interior Finishing', phase: 'review', order: 13, durationDays: 30 },
      { name: 'Landscaping', phase: 'review', order: 14, durationDays: 15 },
      { name: 'Final Inspection', phase: 'completed', order: 15, durationDays: 5 }
    ],
    defaultTasks: [
      { title: 'Land survey', description: 'Complete plot survey and soil test', priority: 'high' },
      { title: 'Architect briefing', description: 'Design requirements document', priority: 'high' },
      { title: 'Budget estimation', description: 'Detailed cost breakdown', priority: 'high' },
      { title: 'Contractor finalization', description: 'Select construction contractor', priority: 'high' }
    ],
    tags: ['villa', 'construction', 'residential']
  },
  {
    name: 'Apartment Renovation',
    description: 'Complete apartment renovation including structural changes, new interiors, and modern upgrades.',
    projectType: 'renovation',
    category: 'Residential',
    icon: '🔨',
    color: '#f97316',
    estimatedDuration: 60,
    defaultBudget: 1800000,
    estimatedCost: 1500000,
    milestones: [
      { name: 'Site Assessment', phase: 'planning', order: 1, durationDays: 3 },
      { name: 'Design Planning', phase: 'planning', order: 2, durationDays: 10 },
      { name: 'Structural Approval', phase: 'planning', order: 3, durationDays: 7 },
      { name: 'Demolition', phase: 'in_progress', order: 4, durationDays: 5 },
      { name: 'Civil Changes', phase: 'in_progress', order: 5, durationDays: 10 },
      { name: 'Electrical Rewiring', phase: 'in_progress', order: 6, durationDays: 7 },
      { name: 'Plumbing Updates', phase: 'in_progress', order: 7, durationDays: 5 },
      { name: 'Flooring & Tiling', phase: 'in_progress', order: 8, durationDays: 8 },
      { name: 'Interior Finishing', phase: 'in_progress', order: 9, durationDays: 12 },
      { name: 'Final Touches', phase: 'completed', order: 10, durationDays: 3 }
    ],
    defaultTasks: [
      { title: 'Existing condition report', description: 'Document current apartment state', priority: 'high' },
      { title: 'Structural assessment', description: 'Check load-bearing walls', priority: 'high' },
      { title: 'Society approvals', description: 'NOC from apartment association', priority: 'medium' }
    ],
    tags: ['apartment', 'renovation', 'upgrade']
  },
  // Specialized Templates
  {
    name: 'Wooden Flooring Project',
    description: 'Complete wooden flooring installation including subfloor preparation, installation, and finishing.',
    projectType: 'flooring',
    category: 'Flooring',
    icon: '🪵',
    color: '#a16207',
    estimatedDuration: 15,
    defaultBudget: 300000,
    estimatedCost: 250000,
    milestones: [
      { name: 'Site Survey', phase: 'planning', order: 1, durationDays: 1 },
      { name: 'Material Selection', phase: 'planning', order: 2, durationDays: 3 },
      { name: 'Subfloor Prep', phase: 'in_progress', order: 3, durationDays: 2 },
      { name: 'Acclimatization', phase: 'in_progress', order: 4, durationDays: 3 },
      { name: 'Installation', phase: 'in_progress', order: 5, durationDays: 4 },
      { name: 'Finishing & Polish', phase: 'review', order: 6, durationDays: 2 },
      { name: 'Final Inspection', phase: 'completed', order: 7, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Floor type selection', description: 'Engineered/Solid/Laminate', priority: 'high' },
      { title: 'Moisture testing', description: 'Subfloor moisture check', priority: 'high' },
      { title: 'Pattern layout', description: 'Herringbone/Straight/Chevron', priority: 'medium' }
    ],
    tags: ['flooring', 'wooden', 'installation']
  },
  {
    name: 'Window & Door Replacement',
    description: 'Complete window and door replacement project with UPVC/aluminum frames and glass.',
    projectType: 'doors_windows',
    category: 'Doors & Windows',
    icon: '🪟',
    color: '#0891b2',
    estimatedDuration: 20,
    defaultBudget: 500000,
    estimatedCost: 400000,
    milestones: [
      { name: 'Site Measurement', phase: 'planning', order: 1, durationDays: 1 },
      { name: 'Design Selection', phase: 'planning', order: 2, durationDays: 3 },
      { name: 'Manufacturing', phase: 'in_progress', order: 3, durationDays: 10 },
      { name: 'Removal of Old', phase: 'in_progress', order: 4, durationDays: 2 },
      { name: 'Installation', phase: 'in_progress', order: 5, durationDays: 3 },
      { name: 'Sealing & Finishing', phase: 'review', order: 6, durationDays: 1 },
      { name: 'Quality Check', phase: 'completed', order: 7, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Window measurements', description: 'All openings measured', priority: 'high' },
      { title: 'Profile selection', description: 'UPVC/Aluminum/Wood', priority: 'high' },
      { title: 'Glass type', description: 'Single/Double/Toughened', priority: 'medium' }
    ],
    tags: ['windows', 'doors', 'UPVC']
  },
  {
    name: 'Painting & Wall Treatment',
    description: 'Complete wall painting project including preparation, primer, paint, and decorative finishes.',
    projectType: 'painting',
    category: 'Painting',
    icon: '🎨',
    color: '#c026d3',
    estimatedDuration: 14,
    defaultBudget: 150000,
    estimatedCost: 120000,
    milestones: [
      { name: 'Color Consultation', phase: 'planning', order: 1, durationDays: 2 },
      { name: 'Surface Preparation', phase: 'in_progress', order: 2, durationDays: 3 },
      { name: 'Primer Application', phase: 'in_progress', order: 3, durationDays: 2 },
      { name: 'Paint Coats', phase: 'in_progress', order: 4, durationDays: 4 },
      { name: 'Touch-ups', phase: 'review', order: 5, durationDays: 2 },
      { name: 'Final Inspection', phase: 'completed', order: 6, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Color scheme selection', description: 'Room-wise color plan', priority: 'high' },
      { title: 'Paint brand selection', description: 'Asian/Berger/Dulux', priority: 'medium' },
      { title: 'Texture wall areas', description: 'Identify accent walls', priority: 'low' }
    ],
    tags: ['painting', 'walls', 'interior']
  },
  {
    name: 'Bathroom Renovation',
    description: 'Complete bathroom makeover including tiles, fixtures, vanity, and accessories.',
    projectType: 'renovation',
    category: 'Bathroom',
    icon: '🚿',
    color: '#06b6d4',
    estimatedDuration: 25,
    defaultBudget: 350000,
    estimatedCost: 280000,
    milestones: [
      { name: 'Design Planning', phase: 'planning', order: 1, durationDays: 3 },
      { name: 'Material Selection', phase: 'planning', order: 2, durationDays: 4 },
      { name: 'Demolition', phase: 'in_progress', order: 3, durationDays: 2 },
      { name: 'Plumbing Work', phase: 'in_progress', order: 4, durationDays: 4 },
      { name: 'Waterproofing', phase: 'in_progress', order: 5, durationDays: 2 },
      { name: 'Tiling', phase: 'in_progress', order: 6, durationDays: 5 },
      { name: 'Fixture Installation', phase: 'in_progress', order: 7, durationDays: 3 },
      { name: 'Final Touches', phase: 'completed', order: 8, durationDays: 2 }
    ],
    defaultTasks: [
      { title: 'Bathroom layout', description: 'Wet and dry area planning', priority: 'high' },
      { title: 'Fixture selection', description: 'Toilet/Basin/Shower', priority: 'high' },
      { title: 'Tile selection', description: 'Wall and floor tiles', priority: 'medium' }
    ],
    tags: ['bathroom', 'renovation', 'tiles']
  },
  {
    name: 'Home Office Setup',
    description: 'Dedicated home office space with ergonomic furniture, storage, and proper lighting.',
    projectType: 'interior_design',
    category: 'Home Office',
    icon: '💼',
    color: '#4f46e5',
    estimatedDuration: 20,
    defaultBudget: 200000,
    estimatedCost: 160000,
    milestones: [
      { name: 'Requirement Analysis', phase: 'planning', order: 1, durationDays: 2 },
      { name: 'Space Design', phase: 'planning', order: 2, durationDays: 4 },
      { name: 'Furniture Selection', phase: 'planning', order: 3, durationDays: 3 },
      { name: 'Electrical Work', phase: 'in_progress', order: 4, durationDays: 2 },
      { name: 'Furniture Delivery', phase: 'in_progress', order: 5, durationDays: 5 },
      { name: 'Setup & Organization', phase: 'in_progress', order: 6, durationDays: 2 },
      { name: 'Final Setup', phase: 'completed', order: 7, durationDays: 2 }
    ],
    defaultTasks: [
      { title: 'Work requirements', description: 'Equipment and storage needs', priority: 'high' },
      { title: 'Ergonomic assessment', description: 'Chair and desk height', priority: 'high' },
      { title: 'Lighting plan', description: 'Task and ambient lighting', priority: 'medium' }
    ],
    tags: ['home-office', 'WFH', 'study']
  },
  {
    name: 'Outdoor Living Space',
    description: 'Balcony or terrace transformation with seating, planters, lighting, and weather protection.',
    projectType: 'landscape',
    category: 'Outdoor',
    icon: '🌿',
    color: '#22c55e',
    estimatedDuration: 25,
    defaultBudget: 400000,
    estimatedCost: 320000,
    milestones: [
      { name: 'Site Assessment', phase: 'planning', order: 1, durationDays: 2 },
      { name: 'Design Concept', phase: 'planning', order: 2, durationDays: 5 },
      { name: 'Waterproofing', phase: 'in_progress', order: 3, durationDays: 3 },
      { name: 'Flooring/Decking', phase: 'in_progress', order: 4, durationDays: 5 },
      { name: 'Furniture Placement', phase: 'in_progress', order: 5, durationDays: 3 },
      { name: 'Planters & Greenery', phase: 'in_progress', order: 6, durationDays: 4 },
      { name: 'Lighting Installation', phase: 'review', order: 7, durationDays: 2 },
      { name: 'Final Styling', phase: 'completed', order: 8, durationDays: 1 }
    ],
    defaultTasks: [
      { title: 'Load capacity check', description: 'Structural assessment', priority: 'high' },
      { title: 'Weather exposure', description: 'Sun/rain protection needs', priority: 'high' },
      { title: 'Plant selection', description: 'Suitable plants for the space', priority: 'medium' }
    ],
    tags: ['outdoor', 'balcony', 'terrace', 'garden']
  }
]

// POST - Seed pre-built templates
export async function POST(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const templatesCollection = db.collection('project_templates')

    const now = new Date()
    let seededCount = 0
    const seededTemplates = []

    for (const template of PRE_BUILT_TEMPLATES) {
      // Check if template with same name already exists
      const existing = await templatesCollection.findOne({ 
        name: template.name,
        isPreBuilt: true 
      })

      if (!existing) {
        const newTemplate = {
          id: uuidv4(),
          clientId: user.clientId,
          isPreBuilt: true,
          ...template,
          usageCount: 0,
          createdBy: 'system',
          createdAt: now,
          updatedAt: now
        }
        await templatesCollection.insertOne(newTemplate)
        seededTemplates.push(newTemplate)
        seededCount++
      }
    }

    return successResponse({
      message: `Successfully seeded ${seededCount} pre-built templates`,
      count: seededCount,
      templates: seededTemplates.map(t => ({ id: t.id, name: t.name, category: t.category }))
    })
  } catch (error) {
    console.error('Template Seed API Error:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return errorResponse(error.message, 401)
    }
    return errorResponse('Failed to seed templates', 500, error.message)
  }
}
