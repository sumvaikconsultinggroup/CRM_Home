'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2,
  Package,
  IndianRupee,
  ChevronDown,
  ExternalLink,
  Check,
  Sparkles,
  Grid3X3,
  ArrowRight,
  Lock
} from 'lucide-react'

// Product Icon Map
const ProductIcons = {
  'build-crm': Building2,
  'build-inventory': Package,
  'build-finance': IndianRupee
}

// Product Color Map
const ProductColors = {
  'build-crm': {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-600'
  },
  'build-inventory': {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  'build-finance': {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    gradient: 'from-amber-500 to-amber-600'
  }
}

// Default products if API fails
const DEFAULT_PRODUCTS = [
  {
    id: 'build-crm',
    productId: 'build-crm',
    name: 'Build CRM',
    description: 'Enterprise CRM with industry modules',
    subdomain: 'crm',
    isDefault: true,
    status: 'active'
  }
]

export function ProductSwitcher({ token, currentProduct = 'build-crm', onProductChange }) {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [loading, setLoading] = useState(true)
  const [showAllProducts, setShowAllProducts] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [token])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/client/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSwitch = (product) => {
    if (product.comingSoon) return
    
    // For now, use callback. Later will redirect to subdomain
    if (onProductChange) {
      onProductChange(product.productId || product.id)
    }
    
    // Future: Redirect to subdomain
    // const baseUrl = window.location.hostname.replace(/^(crm|inventory|finance)\./, '')
    // window.location.href = `https://${product.subdomain}.${baseUrl}`
  }

  const activeProduct = products.find(p => p.productId === currentProduct || p.id === currentProduct) || products[0]
  const ActiveIcon = ProductIcons[activeProduct?.productId || activeProduct?.id] || Building2
  const activeColors = ProductColors[activeProduct?.productId || activeProduct?.id] || ProductColors['build-crm']

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto ${activeColors.bgLight} ${activeColors.text} hover:${activeColors.bgLight}`}
          >
            <div className={`p-1.5 rounded-lg ${activeColors.bg}`}>
              <ActiveIcon className="h-4 w-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold">{activeProduct?.name || 'Build Suite'}</p>
            </div>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Switch Product</span>
            <Badge variant="outline" className="text-xs">Build Suite</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {products.map((product) => {
            const Icon = ProductIcons[product.productId || product.id] || Package
            const colors = ProductColors[product.productId || product.id] || ProductColors['build-crm']
            const isActive = (product.productId || product.id) === currentProduct
            const isComingSoon = product.comingSoon
            
            return (
              <DropdownMenuItem
                key={product.productId || product.id}
                onClick={() => handleProductSwitch(product)}
                disabled={isComingSoon}
                className={`flex items-center gap-3 p-3 cursor-pointer ${isActive ? colors.bgLight : ''}`}
              >
                <div className={`p-2 rounded-lg ${isActive ? colors.bg : 'bg-slate-100'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{product.name}</p>
                    {isActive && <Check className="h-3 w-3 text-emerald-500" />}
                    {isComingSoon && (
                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{product.description}</p>
                </div>
                {!isActive && !isComingSoon && (
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                )}
              </DropdownMenuItem>
            )
          })}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowAllProducts(true)}
            className="flex items-center gap-2 text-slate-600"
          >
            <Grid3X3 className="h-4 w-4" />
            <span>View All Products</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* All Products Dialog */}
      <Dialog open={showAllProducts} onOpenChange={setShowAllProducts}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Build Suite Products
            </DialogTitle>
            <DialogDescription>
              Enterprise-grade business solutions for the construction industry
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {/* Build CRM */}
            <ProductCard
              id="build-crm"
              name="Build CRM"
              description="Enterprise CRM with industry-specific modules for construction businesses"
              icon={Building2}
              color={ProductColors['build-crm']}
              features={['Lead Management', 'Project Tracking', 'Industry Modules', 'Team Collaboration']}
              isActive={currentProduct === 'build-crm'}
              isAssigned={products.some(p => (p.productId || p.id) === 'build-crm')}
              onSelect={() => handleProductSwitch({ productId: 'build-crm' })}
            />
            
            {/* Build Inventory */}
            <ProductCard
              id="build-inventory"
              name="Build Inventory"
              description="Enterprise inventory management like Zoho Inventory"
              icon={Package}
              color={ProductColors['build-inventory']}
              features={['Multi-Warehouse', 'Stock Tracking', 'GRN & Challans', 'Product Sync from CRM']}
              isActive={currentProduct === 'build-inventory'}
              isAssigned={products.some(p => (p.productId || p.id) === 'build-inventory')}
              onSelect={() => handleProductSwitch({ productId: 'build-inventory' })}
            />
            
            {/* Build Finance */}
            <ProductCard
              id="build-finance"
              name="Build Finance"
              description="Enterprise accounting & finance like Zoho Books"
              icon={IndianRupee}
              color={ProductColors['build-finance']}
              features={['Invoicing & Billing', 'GST Compliance', 'Bank Reconciliation', 'Financial Reports']}
              isActive={currentProduct === 'build-finance'}
              isAssigned={products.some(p => (p.productId || p.id) === 'build-finance')}
              onSelect={() => handleProductSwitch({ productId: 'build-finance' })}
            />
          </div>
          
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Note:</strong> Products sync seamlessly. Products added in CRM modules automatically appear in Build Inventory. Invoices from Build Finance can pull from Build Inventory.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Product Card Component
function ProductCard({ id, name, description, icon: Icon, color, features, isActive, isAssigned, comingSoon, onSelect }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isActive ? `${color.border} ${color.bgLight}` : 
        isAssigned ? 'border-slate-200 hover:border-slate-300' :
        'border-dashed border-slate-200 hover:border-slate-300'
      }`}
      onClick={!comingSoon ? onSelect : undefined}
    >
      {comingSoon && (
        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
          <Badge className="bg-amber-100 text-amber-700">
            <Lock className="h-3 w-3 mr-1" /> Coming Soon
          </Badge>
        </div>
      )}
      
      <div className={`inline-flex p-3 rounded-xl ${color.bg} mb-3`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      
      <h3 className="font-bold text-lg mb-1">{name}</h3>
      <p className="text-sm text-slate-500 mb-3">{description}</p>
      
      <ul className="space-y-1">
        {features.map((feature, idx) => (
          <li key={idx} className="text-xs text-slate-600 flex items-center gap-1">
            <Check className={`h-3 w-3 ${color.text}`} />
            {feature}
          </li>
        ))}
      </ul>
      
      {isActive && (
        <Badge className={`absolute top-3 right-3 ${color.bg} text-white`}>
          Active
        </Badge>
      )}
      
      {!isActive && isAssigned && !comingSoon && (
        <Button size="sm" variant="outline" className="w-full mt-3" onClick={onSelect}>
          Switch <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
      
      {!isAssigned && !comingSoon && (
        <Button size="sm" variant="ghost" className="w-full mt-3 text-slate-500">
          Contact Sales
        </Button>
      )}
    </motion.div>
  )
}

export default ProductSwitcher
