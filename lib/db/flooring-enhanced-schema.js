// Enhanced Flooring Module Schema - Enterprise Grade
// SAP/Zoho Level Implementation

import { v4 as uuidv4 } from 'uuid'

// Lead Status Workflow for Flooring
export const FlooringLeadStatus = {
  NEW: { id: 'new', label: 'New Lead', color: 'bg-blue-100 text-blue-700', order: 1 },
  QUALIFIED: { id: 'qualified', label: 'Qualified', color: 'bg-indigo-100 text-indigo-700', order: 2 },
  SITE_VISIT_SCHEDULED: { id: 'site_visit_scheduled', label: 'Site Visit Scheduled', color: 'bg-purple-100 text-purple-700', order: 3 },
  SITE_VISIT_DONE: { id: 'site_visit_done', label: 'Site Visit Done', color: 'bg-violet-100 text-violet-700', order: 4 },
  MEASUREMENT_COMPLETE: { id: 'measurement_complete', label: 'Measurement Complete', color: 'bg-cyan-100 text-cyan-700', order: 5 },
  QUOTE_DRAFT: { id: 'quote_draft', label: 'Quote Draft', color: 'bg-slate-100 text-slate-700', order: 6 },
  QUOTE_SENT: { id: 'quote_sent', label: 'Quote Sent', color: 'bg-amber-100 text-amber-700', order: 7 },
  QUOTE_VIEWED: { id: 'quote_viewed', label: 'Quote Viewed', color: 'bg-orange-100 text-orange-700', order: 8 },
  QUOTE_APPROVED: { id: 'quote_approved', label: 'Quote Approved', color: 'bg-emerald-100 text-emerald-700', order: 9 },
  QUOTE_REVISION: { id: 'quote_revision', label: 'Quote Revision', color: 'bg-yellow-100 text-yellow-700', order: 10 },
  PROPOSAL_SENT: { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-teal-100 text-teal-700', order: 11 },
  PROPOSAL_APPROVED: { id: 'proposal_approved', label: 'Proposal Approved', color: 'bg-green-100 text-green-700', order: 12 },
  WORK_ORDER_CREATED: { id: 'work_order_created', label: 'Work Order Created', color: 'bg-lime-100 text-lime-700', order: 13 },
  INSTALLATION_SCHEDULED: { id: 'installation_scheduled', label: 'Installation Scheduled', color: 'bg-sky-100 text-sky-700', order: 14 },
  INSTALLATION_IN_PROGRESS: { id: 'installation_in_progress', label: 'Installation In Progress', color: 'bg-blue-100 text-blue-700', order: 15 },
  INSTALLATION_COMPLETE: { id: 'installation_complete', label: 'Installation Complete', color: 'bg-emerald-100 text-emerald-700', order: 16 },
  INVOICE_SENT: { id: 'invoice_sent', label: 'Invoice Sent', color: 'bg-amber-100 text-amber-700', order: 17 },
  PAYMENT_PARTIAL: { id: 'payment_partial', label: 'Partial Payment', color: 'bg-orange-100 text-orange-700', order: 18 },
  PAYMENT_RECEIVED: { id: 'payment_received', label: 'Payment Received', color: 'bg-green-100 text-green-700', order: 19 },
  CLOSED_WON: { id: 'closed_won', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700', order: 20 },
  CLOSED_LOST: { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700', order: 21 }
}

// Quote Templates
export const QuoteTemplates = {
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, modern design for professional clients',
    primaryColor: '#2563eb',
    secondaryColor: '#3b82f6',
    fontFamily: 'Inter',
    layout: 'standard',
    showLogo: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    description: 'Elegant design with detailed breakdown',
    primaryColor: '#7c3aed',
    secondaryColor: '#8b5cf6',
    fontFamily: 'Poppins',
    layout: 'detailed',
    showLogo: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true,
    showRoomBreakdown: true,
    showMaterialImages: true
  },
  LUXURY: {
    id: 'luxury',
    name: 'Luxury',
    description: 'Premium design for high-end clients',
    primaryColor: '#b45309',
    secondaryColor: '#d97706',
    fontFamily: 'Playfair Display',
    layout: 'luxury',
    showLogo: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true,
    showRoomBreakdown: true,
    showMaterialImages: true,
    show3DVisualization: true,
    showWarrantyDetails: true
  }
}

// Invoice Templates
export const InvoiceTemplates = {
  STANDARD: {
    id: 'standard',
    name: 'Standard Invoice',
    description: 'GST compliant standard invoice',
    primaryColor: '#059669',
    layout: 'standard',
    showLogo: true,
    showGST: true,
    showBankDetails: true,
    showQRCode: true
  },
  DETAILED: {
    id: 'detailed',
    name: 'Detailed Invoice',
    description: 'Itemized invoice with full breakdown',
    primaryColor: '#0891b2',
    layout: 'detailed',
    showLogo: true,
    showGST: true,
    showBankDetails: true,
    showQRCode: true,
    showItemBreakdown: true,
    showPaymentHistory: true
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium Invoice',
    description: 'Executive invoice with project summary',
    primaryColor: '#7c2d12',
    layout: 'premium',
    showLogo: true,
    showGST: true,
    showBankDetails: true,
    showQRCode: true,
    showItemBreakdown: true,
    showPaymentHistory: true,
    showProjectPhotos: true,
    showCustomerTestimonial: true
  }
}

// Report Types (20+)
export const ReportTypes = {
  // Sales Reports
  SALES_SUMMARY: { id: 'sales_summary', name: 'Sales Summary', category: 'sales', icon: 'BarChart3' },
  SALES_BY_CATEGORY: { id: 'sales_by_category', name: 'Sales by Category', category: 'sales', icon: 'PieChart' },
  SALES_BY_CUSTOMER: { id: 'sales_by_customer', name: 'Sales by Customer', category: 'sales', icon: 'Users' },
  SALES_BY_SALESPERSON: { id: 'sales_by_salesperson', name: 'Sales by Salesperson', category: 'sales', icon: 'UserCheck' },
  SALES_TREND: { id: 'sales_trend', name: 'Sales Trend Analysis', category: 'sales', icon: 'TrendingUp' },
  DAILY_SALES: { id: 'daily_sales', name: 'Daily Sales Report', category: 'sales', icon: 'Calendar' },
  
  // Quote Reports
  QUOTE_CONVERSION: { id: 'quote_conversion', name: 'Quote Conversion Rate', category: 'quotes', icon: 'Target' },
  QUOTE_AGING: { id: 'quote_aging', name: 'Quote Aging Report', category: 'quotes', icon: 'Clock' },
  QUOTE_BY_STATUS: { id: 'quote_by_status', name: 'Quotes by Status', category: 'quotes', icon: 'FileText' },
  LOST_QUOTES: { id: 'lost_quotes', name: 'Lost Quotes Analysis', category: 'quotes', icon: 'XCircle' },
  QUOTE_COMPARISON: { id: 'quote_comparison', name: 'Quote Comparison', category: 'quotes', icon: 'GitCompare' },
  
  // Inventory Reports
  STOCK_LEVEL: { id: 'stock_level', name: 'Stock Level Report', category: 'inventory', icon: 'Package' },
  STOCK_MOVEMENT: { id: 'stock_movement', name: 'Stock Movement Report', category: 'inventory', icon: 'ArrowLeftRight' },
  LOW_STOCK: { id: 'low_stock', name: 'Low Stock Alert', category: 'inventory', icon: 'AlertTriangle' },
  DEAD_STOCK: { id: 'dead_stock', name: 'Dead Stock Report', category: 'inventory', icon: 'Archive' },
  STOCK_VALUATION: { id: 'stock_valuation', name: 'Stock Valuation', category: 'inventory', icon: 'DollarSign' },
  INVENTORY_TURNOVER: { id: 'inventory_turnover', name: 'Inventory Turnover', category: 'inventory', icon: 'RefreshCw' },
  STOCK_AGING: { id: 'stock_aging', name: 'Stock Aging Report', category: 'inventory', icon: 'Hourglass' },
  WAREHOUSE_SUMMARY: { id: 'warehouse_summary', name: 'Warehouse Summary', category: 'inventory', icon: 'Warehouse' },
  
  // Financial Reports
  REVENUE: { id: 'revenue', name: 'Revenue Report', category: 'financial', icon: 'TrendingUp' },
  PROFIT_MARGIN: { id: 'profit_margin', name: 'Profit Margin Analysis', category: 'financial', icon: 'Percent' },
  OUTSTANDING_PAYMENTS: { id: 'outstanding_payments', name: 'Outstanding Payments', category: 'financial', icon: 'CreditCard' },
  PAYMENT_COLLECTION: { id: 'payment_collection', name: 'Payment Collection', category: 'financial', icon: 'Wallet' },
  GST_TAX: { id: 'gst_tax', name: 'GST/Tax Report', category: 'financial', icon: 'Receipt' },
  
  // Customer Reports
  CUSTOMER_ACQUISITION: { id: 'customer_acquisition', name: 'Customer Acquisition', category: 'customers', icon: 'UserPlus' },
  CUSTOMER_LIFETIME_VALUE: { id: 'customer_ltv', name: 'Customer Lifetime Value', category: 'customers', icon: 'Star' },
  CUSTOMER_SEGMENTATION: { id: 'customer_segmentation', name: 'Customer Segmentation', category: 'customers', icon: 'Users' },
  REPEAT_CUSTOMERS: { id: 'repeat_customers', name: 'Repeat Customer Analysis', category: 'customers', icon: 'Repeat' },
  
  // Project Reports
  PROJECT_STATUS: { id: 'project_status', name: 'Project Status Report', category: 'projects', icon: 'Briefcase' },
  INSTALLATION_PROGRESS: { id: 'installation_progress', name: 'Installation Progress', category: 'projects', icon: 'Hammer' },
  PROJECT_PROFITABILITY: { id: 'project_profitability', name: 'Project Profitability', category: 'projects', icon: 'TrendingUp' },
  RESOURCE_UTILIZATION: { id: 'resource_utilization', name: 'Resource Utilization', category: 'projects', icon: 'Users' },
  
  // Product Reports
  BEST_SELLERS: { id: 'best_sellers', name: 'Best Selling Products', category: 'products', icon: 'Award' },
  PRODUCT_PERFORMANCE: { id: 'product_performance', name: 'Product Performance', category: 'products', icon: 'BarChart2' },
  CATEGORY_ANALYSIS: { id: 'category_analysis', name: 'Category Analysis', category: 'products', icon: 'Layers' },
  WASTAGE_ANALYSIS: { id: 'wastage_analysis', name: 'Wastage Analysis', category: 'products', icon: 'Trash2' },
  SUPPLIER_PERFORMANCE: { id: 'supplier_performance', name: 'Supplier Performance', category: 'products', icon: 'Truck' }
}

// Inventory Movement Types
export const InventoryMovementTypes = {
  RECEIPT: { id: 'receipt', label: 'Goods Receipt', icon: 'Download', color: 'text-green-600' },
  ISSUE: { id: 'issue', label: 'Goods Issue', icon: 'Upload', color: 'text-red-600' },
  TRANSFER: { id: 'transfer', label: 'Stock Transfer', icon: 'ArrowLeftRight', color: 'text-blue-600' },
  ADJUSTMENT_PLUS: { id: 'adjustment_plus', label: 'Adjustment (+)', icon: 'Plus', color: 'text-emerald-600' },
  ADJUSTMENT_MINUS: { id: 'adjustment_minus', label: 'Adjustment (-)', icon: 'Minus', color: 'text-amber-600' },
  RETURN: { id: 'return', label: 'Customer Return', icon: 'RotateCcw', color: 'text-purple-600' },
  DAMAGE: { id: 'damage', label: 'Damaged/Scrapped', icon: 'AlertTriangle', color: 'text-red-600' },
  SALE: { id: 'sale', label: 'Sales Issue', icon: 'ShoppingCart', color: 'text-indigo-600' }
}

// Stock Valuation Methods
export const ValuationMethods = {
  FIFO: { id: 'fifo', label: 'First In First Out (FIFO)' },
  LIFO: { id: 'lifo', label: 'Last In First Out (LIFO)' },
  WEIGHTED_AVG: { id: 'weighted_avg', label: 'Weighted Average' },
  SPECIFIC: { id: 'specific', label: 'Specific Identification' }
}

// Generate IDs
export const generateId = (prefix) => `${prefix}_${Date.now()}_${uuidv4().split('-')[0]}`

// Default GST rates
export const GSTRates = {
  FLOORING_MATERIAL: 18,
  LABOR_SERVICE: 18,
  ACCESSORIES: 18
}
