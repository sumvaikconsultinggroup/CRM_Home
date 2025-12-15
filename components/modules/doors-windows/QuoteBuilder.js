'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Plus, Search, Eye, Edit, Trash2, Save, Loader2, Download,
  FileText, Calculator, Package, DoorOpen, Maximize2, Grid3X3,
  CheckCircle2, Send, Printer, ShoppingCart, RefreshCw, PenLine,
  ChevronRight, ArrowRight, X, Layers, Settings, User, Palette,
  Lock, Unlock, RotateCcw, Square, CircleDot, Grip, Move
} from 'lucide-react'
import { toast } from 'sonner'
import { DoorWindow3DPreview } from './DoorWindow3DPreview'
import { 
  PRODUCT_FAMILIES, CATEGORIES, PRODUCT_TYPES, GLASS_TYPES, 
  FINISHES, FRAME_COLORS, PRICING_RATES, FLOOR_LEVELS, ROOM_TYPES 
} from './constants'

const API_BASE = '/api/modules/doors-windows'

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  'pending-approval': 'bg-amber-100 text-amber-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700'
}

// Accessory Icons mapping
const ACCESSORY_ICONS = {
  handle: '🚪',
  lockMultiPoint: '🔐',
  lockCylinder: '🔒',
  hinges: '📎',
  rollers: '⚙️',
  frictionStay: '🔧',
  weatherSeal: '💨',
  silicone: '💧',
  doorCloser: '🚪',
  floorSpring: '🔄',
  kickPlate: '🦶',
  threshold: '➖'
}

// Price Calculator Function - Industry Standard (with manual override support)
function calculatePrice(item, manualOverride = null) {
  if (manualOverride !== null && manualOverride > 0) {
    const areaSqft = ((item.width || 1200) / 304.8) * ((item.height || 1500) / 304.8)
    return {
      areaSqft: areaSqft.toFixed(2),
      pricePerSqft: Math.round(manualOverride / areaSqft / (item.quantity || 1)),
      baseAmount: Math.round(manualOverride),
      totalAmount: Math.round(manualOverride),
      isManual: true
    }
  }

  const {
    width = 1200,
    height = 1500,
    material = 'Aluminium',
    category = 'Sliding',
    type = 'Window',
    glassType = 'single',
    finish = 'anodized',
    quantity = 1,
    mesh = false,
    grill = false,
    customRate = null
  } = item

  // Calculate area in sq.ft (from mm)
  const areaSqft = (width / 304.8) * (height / 304.8)

  // Get base rate (use custom if provided)
  let pricePerSqft = customRate

  if (!customRate) {
    const materialRates = PRICING_RATES.materials[material] || PRICING_RATES.materials['Aluminium']
    const baseRate = materialRates.base

    // Apply multipliers
    const categoryMultiplier = PRICING_RATES.categories[category] || 1.0
    const typeMultiplier = PRICING_RATES.types[type] || 1.0
    const glassInfo = GLASS_TYPES.find(g => g.id === glassType) || { multiplier: 1.0 }
    const finishInfo = FINISHES.find(f => f.id === finish) || { multiplier: 1.0 }

    pricePerSqft = baseRate * categoryMultiplier * typeMultiplier * glassInfo.multiplier * finishInfo.multiplier

    // Add extras
    if (mesh) pricePerSqft += PRICING_RATES.extras.mosquitoMesh
    if (grill) pricePerSqft += PRICING_RATES.extras.grill
  }

  const totalPrice = pricePerSqft * areaSqft * quantity

  return {
    areaSqft: areaSqft.toFixed(2),
    pricePerSqft: Math.round(pricePerSqft),
    baseAmount: Math.round(totalPrice),
    totalAmount: Math.round(totalPrice),
    isManual: !!customRate
  }
}

// Panel Configuration Component
function PanelConfigurator({ panels, panelConfig, onChange, category }) {
  const handlePanelChange = (index, field, value) => {
    const newConfig = [...panelConfig]
    newConfig[index] = { ...newConfig[index], [field]: value }
    onChange(newConfig)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Grid3X3 className="h-4 w-4" /> Panel Configuration
      </Label>
      <div className="grid gap-2">
        {Array.from({ length: panels }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
            <span className="text-sm font-medium w-20">Panel {idx + 1}</span>
            <Select
              value={panelConfig[idx]?.type || 'fixed'}
              onValueChange={(v) => handlePanelChange(idx, 'type', v)}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="openable">Openable</SelectItem>
                <SelectItem value="sliding">Sliding</SelectItem>
              </SelectContent>
            </Select>
            {panelConfig[idx]?.type === 'openable' && (
              <Select
                value={panelConfig[idx]?.openDirection || 'left'}
                onValueChange={(v) => handlePanelChange(idx, 'openDirection', v)}
              >
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">← Left</SelectItem>
                  <SelectItem value="right">Right →</SelectItem>
                  <SelectItem value="top">↑ Top</SelectItem>
                  <SelectItem value="bottom">↓ Bottom</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select
              value={panelConfig[idx]?.glassType || 'single'}
              onValueChange={(v) => handlePanelChange(idx, 'glassType', v)}
            >
              <SelectTrigger className="w-36 h-8">
                <SelectValue placeholder="Glass" />
              </SelectTrigger>
              <SelectContent>
                {GLASS_TYPES.map(glass => (
                  <SelectItem key={glass.id} value={glass.id}>{glass.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}

// Glass Type Visual Preview
function GlassTypePreview({ glassType, size = 80 }) {
  const glassStyles = {
    'single': { opacity: 0.3, pattern: 'none', label: 'Single' },
    'double': { opacity: 0.25, pattern: 'double', label: 'DGU' },
    'triple': { opacity: 0.2, pattern: 'triple', label: 'Triple' },
    'laminated': { opacity: 0.35, pattern: 'laminated', label: 'Laminated' },
    'tinted': { opacity: 0.5, pattern: 'tinted', label: 'Tinted' },
    'reflective': { opacity: 0.4, pattern: 'reflective', label: 'Reflective' },
    'low-e': { opacity: 0.28, pattern: 'lowe', label: 'Low-E' },
    'acoustic': { opacity: 0.32, pattern: 'acoustic', label: 'Acoustic' },
    'toughened': { opacity: 0.3, pattern: 'toughened', label: 'Tempered' },
    'frosted': { opacity: 0.7, pattern: 'frosted', label: 'Frosted' }
  }

  const style = glassStyles[glassType] || glassStyles['single']

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 80 80" className="border rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
        <defs>
          <pattern id={`glass-${glassType}`} patternUnits="userSpaceOnUse" width="8" height="8">
            {style.pattern === 'double' && <><line x1="0" y1="4" x2="8" y2="4" stroke="#60a5fa" strokeWidth="0.5"/></>}
            {style.pattern === 'triple' && <><line x1="0" y1="2.5" x2="8" y2="2.5" stroke="#60a5fa" strokeWidth="0.5"/><line x1="0" y1="5.5" x2="8" y2="5.5" stroke="#60a5fa" strokeWidth="0.5"/></>}
            {style.pattern === 'laminated' && <><rect width="8" height="8" fill="#fef3c7" opacity="0.3"/><line x1="0" y1="4" x2="8" y2="4" stroke="#f59e0b" strokeWidth="1"/></>}
            {style.pattern === 'tinted' && <rect width="8" height="8" fill="#1e3a5f"/>}
            {style.pattern === 'reflective' && <><rect width="8" height="8" fill="#c0c0c0"/><line x1="0" y1="0" x2="8" y2="8" stroke="#fff" strokeWidth="0.5" opacity="0.5"/></>}
            {style.pattern === 'frosted' && <><circle cx="2" cy="2" r="1" fill="#fff" opacity="0.5"/><circle cx="6" cy="6" r="1" fill="#fff" opacity="0.5"/><circle cx="6" cy="2" r="0.5" fill="#fff" opacity="0.3"/><circle cx="2" cy="6" r="0.5" fill="#fff" opacity="0.3"/></>}
            {style.pattern === 'acoustic' && <><line x1="0" y1="2" x2="8" y2="2" stroke="#8b5cf6" strokeWidth="0.3"/><line x1="0" y1="4" x2="8" y2="4" stroke="#8b5cf6" strokeWidth="0.5"/><line x1="0" y1="6" x2="8" y2="6" stroke="#8b5cf6" strokeWidth="0.3"/></>}
          </pattern>
          <linearGradient id="glassShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#fff" stopOpacity="0.1"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0.2"/>
          </linearGradient>
        </defs>
        {/* Frame */}
        <rect x="5" y="5" width="70" height="70" fill="#64748b" rx="2"/>
        {/* Glass */}
        <rect x="10" y="10" width="60" height="60" fill="#93c5fd" opacity={style.opacity}/>
        <rect x="10" y="10" width="60" height="60" fill={`url(#glass-${glassType})`}/>
        <rect x="10" y="10" width="60" height="60" fill="url(#glassShine)"/>
        {/* Reflection */}
        <path d="M 15 15 L 25 15 L 15 35 Z" fill="#fff" opacity="0.3"/>
      </svg>
      <span className="text-xs text-slate-600 mt-1">{style.label}</span>
    </div>
  )
}

// Accessory Card with Visual
function AccessoryCard({ accessory, onAdd, added = false }) {
  const icon = ACCESSORY_ICONS[accessory.id] || '📦'
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${added ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'}`}
      onClick={() => onAdd(accessory)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div className="flex-1">
            <p className="font-medium text-slate-800 text-sm">{accessory.name}</p>
            <p className="text-emerald-600 font-semibold">₹{accessory.price}/{accessory.unit}</p>
          </div>
          {added ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Plus className="h-5 w-5 text-indigo-600" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuoteBuilder({ quotations, projects, surveys, selectedProject, onRefresh, headers, user, glassStyles }) {
  const [showNewQuote, setShowNewQuote] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [showAccessoriesDialog, setShowAccessoriesDialog] = useState(false)
  const [showCustomAccessoryDialog, setShowCustomAccessoryDialog] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [editingQuote, setEditingQuote] = useState(null)
  const [editingItemIndex, setEditingItemIndex] = useState(null) // For edit item
  const [saving, setSaving] = useState(false)
  const [activeBuilderTab, setActiveBuilderTab] = useState('items')
  const [searchQuery, setSearchQuery] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusQuote, setStatusQuote] = useState(null)
  const [statusAction, setStatusAction] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Quote form state
  const [quoteForm, setQuoteForm] = useState({
    projectId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    siteAddress: '',
    validDays: 30,
    paymentTerms: '50% advance, 50% before delivery',
    installationIncluded: true,
    notes: ''
  })

  // Quote items
  const [quoteItems, setQuoteItems] = useState([])
  const [accessories, setAccessories] = useState([])

  // Custom accessory form
  const [customAccessory, setCustomAccessory] = useState({
    name: '',
    price: '',
    unit: 'piece',
    quantity: 1
  })

  // Default panel config generator
  const generateDefaultPanelConfig = (count, category) => {
    return Array.from({ length: count }).map((_, idx) => ({
      type: category === 'Fixed' ? 'fixed' : (idx === 0 ? 'openable' : 'fixed'),
      openDirection: 'left',
      glassType: 'single'
    }))
  }

  // Item form state with panel configuration
  const [itemForm, setItemForm] = useState({
    type: 'Window',
    category: 'Sliding',
    location: '',
    floor: 'Ground Floor',
    room: 'Living Room',
    width: 1200,
    height: 1500,
    material: 'Aluminium',
    glassType: 'single',
    finish: 'anodized',
    frameColor: 'white',
    panels: 2,
    panelConfig: generateDefaultPanelConfig(2, 'Sliding'),
    mesh: false,
    grill: false,
    quantity: 1,
    customRate: null, // For manual price override
    manualTotal: null, // For direct total override
    notes: ''
  })

  // Calculate quote totals
  const quoteTotals = useMemo(() => {
    const itemsTotal = quoteItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0)
    const accessoriesTotal = accessories.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0)
    const subtotal = itemsTotal + accessoriesTotal
    const installationCharge = quoteForm.installationIncluded ? Math.round(subtotal * 0.1) : 0
    const taxRate = 18
    const taxAmount = Math.round((subtotal + installationCharge) * (taxRate / 100))
    const grandTotal = subtotal + installationCharge + taxAmount

    return {
      itemsTotal,
      accessoriesTotal,
      subtotal,
      installationCharge,
      taxRate,
      taxAmount,
      grandTotal,
      totalArea: quoteItems.reduce((sum, item) => sum + parseFloat(item.areaSqft || 0), 0).toFixed(2)
    }
  }, [quoteItems, accessories, quoteForm.installationIncluded])

  // Reset forms
  const resetQuoteForm = () => {
    setQuoteForm({
      projectId: selectedProject?.id || '',
      customerName: selectedProject?.contactPerson || '',
      customerPhone: selectedProject?.contactPhone || '',
      customerEmail: selectedProject?.contactEmail || '',
      siteAddress: selectedProject?.siteAddress || '',
      validDays: 30,
      paymentTerms: '50% advance, 50% before delivery',
      installationIncluded: true,
      notes: ''
    })
    setQuoteItems([])
    setAccessories([])
    setEditingQuote(null)
    setEditingItemIndex(null)
  }

  const resetItemForm = () => {
    setItemForm({
      type: 'Window',
      category: 'Sliding',
      location: '',
      floor: 'Ground Floor',
      room: 'Living Room',
      width: 1200,
      height: 1500,
      material: 'Aluminium',
      glassType: 'single',
      finish: 'anodized',
      frameColor: 'white',
      panels: 2,
      panelConfig: generateDefaultPanelConfig(2, 'Sliding'),
      mesh: false,
      grill: false,
      quantity: 1,
      customRate: null,
      manualTotal: null,
      notes: ''
    })
    setEditingItemIndex(null)
  }

  // Handle panel count change
  const handlePanelCountChange = (count) => {
    const newCount = Math.max(1, Math.min(10, count))
    setItemForm({
      ...itemForm,
      panels: newCount,
      panelConfig: generateDefaultPanelConfig(newCount, itemForm.category)
    })
  }

  // Add or update item
  const handleSaveItem = () => {
    const pricing = calculatePrice(itemForm, itemForm.manualTotal)
    const newItem = {
      id: editingItemIndex !== null ? quoteItems[editingItemIndex].id : `item-${Date.now()}`,
      ...itemForm,
      ...pricing
    }

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...quoteItems]
      updatedItems[editingItemIndex] = newItem
      setQuoteItems(updatedItems)
      toast.success('Item updated')
    } else {
      // Add new item
      setQuoteItems([...quoteItems, newItem])
      toast.success('Item added to quote')
    }
    
    setShowItemDialog(false)
    resetItemForm()
  }

  // Edit item
  const handleEditItem = (index) => {
    const item = quoteItems[index]
    setItemForm({
      ...item,
      panelConfig: item.panelConfig || generateDefaultPanelConfig(item.panels || 2, item.category)
    })
    setEditingItemIndex(index)
    setShowItemDialog(true)
  }

  // Remove item
  const handleRemoveItem = (itemId) => {
    setQuoteItems(quoteItems.filter(item => item.id !== itemId))
    toast.success('Item removed')
  }

  // Add accessory
  const handleAddAccessory = (accessory) => {
    const existing = accessories.find(a => a.id === accessory.id)
    if (existing) {
      setAccessories(accessories.map(a => 
        a.id === accessory.id ? { ...a, quantity: a.quantity + 1 } : a
      ))
    } else {
      setAccessories([...accessories, { ...accessory, quantity: 1 }])
    }
    toast.success('Accessory added')
  }

  // Add custom accessory
  const handleAddCustomAccessory = () => {
    if (!customAccessory.name || !customAccessory.price) {
      toast.error('Please enter accessory name and price')
      return
    }
    
    const newAccessory = {
      id: `custom-${Date.now()}`,
      name: customAccessory.name,
      price: parseFloat(customAccessory.price),
      unit: customAccessory.unit,
      quantity: parseInt(customAccessory.quantity) || 1,
      isCustom: true
    }
    
    setAccessories([...accessories, newAccessory])
    setCustomAccessory({ name: '', price: '', unit: 'piece', quantity: 1 })
    setShowCustomAccessoryDialog(false)
    toast.success('Custom accessory added')
  }

  // Remove accessory
  const handleRemoveAccessory = (accessoryId) => {
    setAccessories(accessories.filter(a => a.id !== accessoryId))
  }

  // Save quote
  const handleSaveQuote = async (status = 'draft') => {
    if (quoteItems.length === 0) {
      toast.error('Add at least one item to the quote')
      return
    }
    if (!quoteForm.customerName) {
      toast.error('Customer name is required')
      return
    }

    setSaving(true)
    try {
      const quoteData = {
        ...quoteForm,
        items: quoteItems,
        accessories,
        ...quoteTotals,
        status,
        validUntil: new Date(Date.now() + quoteForm.validDays * 24 * 60 * 60 * 1000)
      }

      if (editingQuote) {
        quoteData.id = editingQuote.id
      }

      const res = await fetch(`${API_BASE}/quotations`, {
        method: editingQuote ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(quoteData)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingQuote ? 'Quote updated' : 'Quote created')
        setShowNewQuote(false)
        resetQuoteForm()
        onRefresh()
      } else {
        toast.error(data.error || 'Failed to save quote')
      }
    } catch (error) {
      toast.error('Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  // Generate detailed PDF with visuals
  const handleDownloadPDF = async (quote) => {
    setGenerating(true)
    try {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const quoteData = quote || { ...quoteForm, items: quoteItems, accessories, ...quoteTotals }
        const html = generateDetailedQuoteHTML(quoteData)
        printWindow.document.write(html)
        printWindow.document.close()
        setTimeout(() => printWindow.print(), 500)
      }
      toast.success('Quote PDF generated')
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  // Generate detailed HTML with visuals for PDF
  const generateDetailedQuoteHTML = (quote) => {
    const items = quote.items || quoteItems
    const accs = quote.accessories || accessories
    
    const generateItemVisual = (item) => {
      const w = 120
      const h = 100
      const fw = 8
      const panels = item.panels || 2
      const panelWidth = (w - fw * 2) / panels
      
      // Glass colors based on type
      const glassColors = {
        'single': '#b8d4fe',
        'double': '#93c5fd',
        'tinted': '#1e3a5f',
        'frosted': '#e2e8f0',
        'reflective': '#94a3b8',
        'laminated': '#fef3c7'
      }
      const glassColor = glassColors[item.glassType] || '#b8d4fe'
      
      return `
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="border: 1px solid #e5e7eb; border-radius: 4px; background: linear-gradient(135deg, #f8fafc, #e2e8f0);">
          <rect x="5" y="5" width="${w-10}" height="${h-10}" fill="#64748b" rx="2"/>
          ${Array.from({ length: panels }).map((_, i) => {
            const px = 5 + fw + (panelWidth * i) + 2
            const py = 5 + fw + 2
            const pw = panelWidth - 4
            const ph = h - 10 - fw * 2 - 4
            return `
              <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${glassColor}" opacity="0.5"/>
              <rect x="${px + 3}" y="${py + 3}" width="${pw * 0.3}" height="${ph * 0.5}" fill="#fff" opacity="0.3"/>
            `
          }).join('')}
          <text x="${w/2}" y="${h - 2}" text-anchor="middle" font-size="8" fill="#64748b">${item.width}x${item.height}mm</text>
        </svg>
      `
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quote.quoteNumber || 'Draft'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; color: #1e293b; font-size: 12px; }
          .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
          .header h1 { font-size: 28px; margin-bottom: 5px; }
          .header p { opacity: 0.9; }
          .quote-info { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); }
          .quote-info div { text-align: center; }
          .quote-info .label { font-size: 10px; opacity: 0.8; }
          .quote-info .value { font-size: 16px; font-weight: 600; }
          .section { margin-bottom: 25px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .section-header { background: #f8fafc; padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4f46e5; }
          .section-content { padding: 15px; }
          .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .customer-grid .field { }
          .customer-grid .label { font-size: 10px; color: #64748b; margin-bottom: 3px; }
          .customer-grid .value { font-weight: 500; }
          .item-card { display: flex; gap: 15px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; background: #fafafa; }
          .item-visual { flex-shrink: 0; }
          .item-details { flex: 1; }
          .item-details h4 { font-size: 14px; color: #1e293b; margin-bottom: 8px; }
          .item-specs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11px; }
          .item-specs .spec { }
          .item-specs .spec-label { color: #64748b; }
          .item-specs .spec-value { font-weight: 600; }
          .item-price { text-align: right; min-width: 100px; }
          .item-price .rate { font-size: 11px; color: #64748b; }
          .item-price .total { font-size: 16px; font-weight: 700; color: #059669; }
          .accessories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .accessory-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; }
          .accessory-icon { font-size: 20px; }
          .accessory-details { flex: 1; }
          .accessory-details .name { font-weight: 500; }
          .accessory-details .price { color: #64748b; font-size: 11px; }
          .accessory-total { font-weight: 600; color: #059669; }
          .totals-section { background: linear-gradient(135deg, #f8fafc, #eef2ff); padding: 20px; border-radius: 8px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .totals-row:last-child { border-bottom: none; }
          .totals-row.grand { font-size: 18px; font-weight: 700; color: #4f46e5; padding-top: 15px; margin-top: 10px; border-top: 2px solid #4f46e5; }
          .terms { margin-top: 25px; padding: 15px; background: #fefce8; border-radius: 8px; border: 1px solid #fef08a; }
          .terms h4 { color: #854d0e; margin-bottom: 10px; }
          .terms p { color: #713f12; font-size: 11px; line-height: 1.6; }
          .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 10px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          @media print { body { padding: 15px; } .section { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTATION</h1>
          <p>Doors & Windows - Enterprise Manufacturing</p>
          <div class="quote-info">
            <div><div class="label">Quote No.</div><div class="value">${quote.quoteNumber || 'DRAFT'}</div></div>
            <div><div class="label">Date</div><div class="value">${new Date().toLocaleDateString()}</div></div>
            <div><div class="label">Valid Until</div><div class="value">${new Date(quote.validUntil || Date.now() + 30*24*60*60*1000).toLocaleDateString()}</div></div>
            <div><div class="label">Total Items</div><div class="value">${items.length}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">👤 Customer Details</div>
          <div class="section-content">
            <div class="customer-grid">
              <div class="field"><div class="label">Customer Name</div><div class="value">${quote.customerName || '-'}</div></div>
              <div class="field"><div class="label">Phone</div><div class="value">${quote.customerPhone || '-'}</div></div>
              <div class="field"><div class="label">Email</div><div class="value">${quote.customerEmail || '-'}</div></div>
              <div class="field"><div class="label">Site Address</div><div class="value">${quote.siteAddress || '-'}</div></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">🪟 Items (${items.length})</div>
          <div class="section-content">
            ${items.map((item, idx) => `
              <div class="item-card">
                <div class="item-visual">${generateItemVisual(item)}</div>
                <div class="item-details">
                  <h4>${idx + 1}. ${item.type} - ${item.category}</h4>
                  <div class="item-specs">
                    <div class="spec"><div class="spec-label">Material</div><div class="spec-value">${item.material}</div></div>
                    <div class="spec"><div class="spec-label">Size</div><div class="spec-value">${item.width} x ${item.height} mm</div></div>
                    <div class="spec"><div class="spec-label">Area</div><div class="spec-value">${item.areaSqft} sq.ft</div></div>
                    <div class="spec"><div class="spec-label">Glass</div><div class="spec-value">${GLASS_TYPES.find(g => g.id === item.glassType)?.name || item.glassType}</div></div>
                    <div class="spec"><div class="spec-label">Finish</div><div class="spec-value">${item.finish}</div></div>
                    <div class="spec"><div class="spec-label">Location</div><div class="spec-value">${item.floor} - ${item.room}</div></div>
                    <div class="spec"><div class="spec-label">Panels</div><div class="spec-value">${item.panels}</div></div>
                    <div class="spec"><div class="spec-label">Qty</div><div class="spec-value">${item.quantity}</div></div>
                  </div>
                  ${item.mesh || item.grill ? `<div style="margin-top: 8px; font-size: 11px; color: #64748b;">Extras: ${item.mesh ? 'Mosquito Mesh' : ''}${item.mesh && item.grill ? ', ' : ''}${item.grill ? 'Safety Grill' : ''}</div>` : ''}
                </div>
                <div class="item-price">
                  <div class="rate">₹${item.pricePerSqft}/sq.ft</div>
                  <div class="total">₹${item.totalAmount?.toLocaleString()}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${accs.length > 0 ? `
        <div class="section">
          <div class="section-header">🔧 Accessories (${accs.length})</div>
          <div class="section-content">
            <div class="accessories-grid">
              ${accs.map(acc => `
                <div class="accessory-item">
                  <div class="accessory-icon">${ACCESSORY_ICONS[acc.id] || '📦'}</div>
                  <div class="accessory-details">
                    <div class="name">${acc.name}</div>
                    <div class="price">₹${acc.price}/${acc.unit} × ${acc.quantity}</div>
                  </div>
                  <div class="accessory-total">₹${(acc.price * acc.quantity).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-header">💰 Price Summary</div>
          <div class="section-content">
            <div class="totals-section">
              <div class="totals-row"><span>Items Total (${items.length} items, ${quote.totalArea || quoteTotals.totalArea} sq.ft)</span><span>₹${(quote.itemsTotal || quoteTotals.itemsTotal).toLocaleString()}</span></div>
              <div class="totals-row"><span>Accessories</span><span>₹${(quote.accessoriesTotal || quoteTotals.accessoriesTotal).toLocaleString()}</span></div>
              ${quote.installationIncluded !== false ? `<div class="totals-row"><span>Installation Charges (10%)</span><span>₹${(quote.installationCharge || quoteTotals.installationCharge).toLocaleString()}</span></div>` : ''}
              <div class="totals-row"><span>GST (18%)</span><span>₹${(quote.taxAmount || quoteTotals.taxAmount).toLocaleString()}</span></div>
              <div class="totals-row grand"><span>Grand Total</span><span>₹${(quote.grandTotal || quoteTotals.grandTotal).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div class="terms">
          <h4>📋 Terms & Conditions</h4>
          <p><strong>Payment Terms:</strong> ${quote.paymentTerms || '50% advance, 50% before delivery'}</p>
          <p><strong>Validity:</strong> This quotation is valid for ${quote.validDays || 30} days from the date of issue.</p>
          <p><strong>Delivery:</strong> 4-6 weeks from order confirmation, subject to site readiness.</p>
          <p><strong>Warranty:</strong> 10 years on profiles, 5 years on hardware, 1 year on installation.</p>
        </div>

        <div class="footer">
          <p>This is a computer-generated quotation. For any queries, please contact us.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `
  }

  // Link customer from project
  const handleSelectProject = (projectId) => {
    if (projectId === '__none__') {
      setQuoteForm({ ...quoteForm, projectId: '' })
      return
    }
    const project = projects?.find(p => p.id === projectId)
    if (project) {
      setQuoteForm({
        ...quoteForm,
        projectId,
        customerName: project.contactPerson || quoteForm.customerName,
        customerPhone: project.contactPhone || quoteForm.customerPhone,
        customerEmail: project.contactEmail || quoteForm.customerEmail,
        siteAddress: project.siteAddress || quoteForm.siteAddress
      })
    }
  }

  // Filter quotations
  const filteredQuotations = quotations?.filter(q => {
    const matchesSearch = !searchQuery ||
      q.quoteNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = !selectedProject || q.projectId === selectedProject.id
    return matchesSearch && matchesProject
  }) || []

  // Calculate live pricing for item form
  const livePricing = useMemo(() => calculatePrice(itemForm, itemForm.manualTotal), [itemForm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Enterprise Quote Builder</h2>
          <p className="text-slate-500">Create detailed quotations with visuals, panel config & automatic pricing</p>
        </div>
        <Button
          onClick={() => { resetQuoteForm(); setShowNewQuote(true); }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> New Quote
        </Button>
      </div>

      {/* Search */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search quotes by number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      {filteredQuotations.length === 0 ? (
        <Card className={glassStyles?.card}>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Quotations Yet</h3>
            <p className="text-slate-500 mb-4">Create your first enterprise-level quotation</p>
            <Button onClick={() => { resetQuoteForm(); setShowNewQuote(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Create Quote
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotations.map(quote => (
            <Card
              key={quote.id}
              className={`${glassStyles?.card} hover:shadow-xl transition-all cursor-pointer`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{quote.quoteNumber}</p>
                      <Badge className={statusStyles[quote.status]}>{quote.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{quote.customerName}</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">₹{(quote.grandTotal || 0).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Package className="h-3 w-3" />
                    {quote.itemsCount || quote.items?.length || 0} items
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Maximize2 className="h-3 w-3" />
                    {quote.totalArea?.toFixed(0) || 0} sqft
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <p className="text-xs text-slate-500">
                    Valid: {new Date(quote.validUntil).toLocaleDateString()}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(quote)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quote Builder Dialog */}
      <Dialog open={showNewQuote} onOpenChange={setShowNewQuote}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              {editingQuote ? 'Edit Quote' : 'Create Enterprise Quote'}
            </DialogTitle>
            <DialogDescription>
              Build comprehensive quotations with panel config, visuals & automatic pricing
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeBuilderTab} onValueChange={setActiveBuilderTab} className="flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="customer">Customer Info</TabsTrigger>
              <TabsTrigger value="items">Items ({quoteItems.length})</TabsTrigger>
              <TabsTrigger value="accessories">Accessories ({accessories.length})</TabsTrigger>
              <TabsTrigger value="summary">Summary & Download</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 pr-4" style={{ height: 'calc(95vh - 200px)' }}>
              {/* Customer Tab */}
              <TabsContent value="customer" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link to Project</Label>
                    <Select value={quoteForm.projectId || '__none__'} onValueChange={handleSelectProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Project</SelectItem>
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name || p.siteName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      value={quoteForm.customerName}
                      onChange={(e) => setQuoteForm({ ...quoteForm, customerName: e.target.value })}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={quoteForm.customerPhone}
                      onChange={(e) => setQuoteForm({ ...quoteForm, customerPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={quoteForm.customerEmail}
                      onChange={(e) => setQuoteForm({ ...quoteForm, customerEmail: e.target.value })}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Site Address</Label>
                    <Textarea
                      value={quoteForm.siteAddress}
                      onChange={(e) => setQuoteForm({ ...quoteForm, siteAddress: e.target.value })}
                      placeholder="Full site address"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quote Valid For (days)</Label>
                    <Input
                      type="number"
                      value={quoteForm.validDays}
                      onChange={(e) => setQuoteForm({ ...quoteForm, validDays: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input
                      value={quoteForm.paymentTerms}
                      onChange={(e) => setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Switch
                      checked={quoteForm.installationIncluded}
                      onCheckedChange={(v) => setQuoteForm({ ...quoteForm, installationIncluded: v })}
                    />
                    <div>
                      <Label>Include Installation (10%)</Label>
                      <p className="text-xs text-slate-500">Add installation charges to the quote</p>
                    </div>
                  </div>
                </div>
                <Button className="mt-4" onClick={() => setActiveBuilderTab('items')}>
                  Continue to Items <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4 p-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-600">Add doors and windows with panel configuration & automatic pricing</p>
                  <Button onClick={() => { resetItemForm(); setShowItemDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </Button>
                </div>

                {quoteItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <DoorOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No items added yet</p>
                    <Button className="mt-3" variant="outline" onClick={() => { resetItemForm(); setShowItemDialog(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Add First Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quoteItems.map((item, idx) => (
                      <Card key={item.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex">
                            {/* 3D Preview */}
                            <div className="w-56 h-44 border-r bg-gradient-to-br from-slate-50 to-slate-100">
                              <DoorWindow3DPreview 
                                config={{
                                  type: item.type,
                                  category: item.category,
                                  width: item.width,
                                  height: item.height,
                                  panels: item.panels,
                                  frameColor: item.frameColor,
                                  glassType: item.glassType,
                                  panelConfig: item.panelConfig
                                }}
                                className="h-full"
                              />
                            </div>
                            {/* Item Details */}
                            <div className="flex-1 p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-slate-800">
                                    {idx + 1}. {item.type} - {item.category}
                                  </h4>
                                  <p className="text-sm text-slate-500">
                                    {item.material} • {item.room} • {item.floor}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditItem(idx)}>
                                    <Edit className="h-4 w-4 text-indigo-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-3 text-sm">
                                <div>
                                  <span className="text-slate-500">Size</span>
                                  <p className="font-medium">{item.width} x {item.height} mm</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Area</span>
                                  <p className="font-medium">{item.areaSqft} sqft</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Panels</span>
                                  <p className="font-medium">{item.panels} panels</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Rate</span>
                                  <p className="font-medium">₹{item.pricePerSqft}/sqft</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Amount</span>
                                  <p className="font-semibold text-emerald-600">₹{item.totalAmount?.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {item.mesh && <Badge variant="outline" className="text-xs">Mesh</Badge>}
                                {item.grill && <Badge variant="outline" className="text-xs">Grill</Badge>}
                                <Badge variant="secondary" className="text-xs">{GLASS_TYPES.find(g => g.id === item.glassType)?.name || item.glassType}</Badge>
                                <Badge variant="secondary" className="text-xs">{item.frameColor}</Badge>
                                {item.isManual && <Badge className="text-xs bg-amber-100 text-amber-700">Manual Price</Badge>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <Button className="mt-4" onClick={() => setActiveBuilderTab('accessories')}>
                  Continue to Accessories <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </TabsContent>

              {/* Accessories Tab */}
              <TabsContent value="accessories" className="space-y-4 p-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-600">Add handles, locks, and other accessories</p>
                  <Button variant="outline" onClick={() => setShowCustomAccessoryDialog(true)}>
                    <PenLine className="h-4 w-4 mr-2" /> Add Custom Accessory
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(PRICING_RATES.accessories).map(([key, acc]) => (
                    <AccessoryCard 
                      key={key}
                      accessory={{ id: key, ...acc }}
                      onAdd={handleAddAccessory}
                      added={accessories.some(a => a.id === key)}
                    />
                  ))}
                </div>

                {accessories.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" /> Selected Accessories ({accessories.length})
                    </h4>
                    <div className="space-y-2">
                      {accessories.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{ACCESSORY_ICONS[acc.id] || '📦'}</span>
                            <div>
                              <span className="font-medium">{acc.name}</span>
                              {acc.isCustom && <Badge variant="outline" className="ml-2 text-xs">Custom</Badge>}
                            </div>
                            <Input
                              type="number"
                              min="1"
                              value={acc.quantity}
                              onChange={(e) => setAccessories(accessories.map(a => 
                                a.id === acc.id ? { ...a, quantity: parseInt(e.target.value) || 1 } : a
                              ))}
                              className="w-20 h-8"
                            />
                            <span className="text-slate-500">x ₹{acc.price}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-emerald-600">₹{(acc.price * acc.quantity).toLocaleString()}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveAccessory(acc.id)}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Button className="mt-4" onClick={() => setActiveBuilderTab('summary')}>
                  Continue to Summary <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left - Summary */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quote Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Items</span>
                          <span className="font-medium">{quoteItems.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Area</span>
                          <span className="font-medium">{quoteTotals.totalArea} sqft</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-slate-600">Items Subtotal</span>
                          <span>₹{quoteTotals.itemsTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Accessories</span>
                          <span>₹{quoteTotals.accessoriesTotal.toLocaleString()}</span>
                        </div>
                        {quoteForm.installationIncluded && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Installation (10%)</span>
                            <span>₹{quoteTotals.installationCharge.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">GST (18%)</span>
                          <span>₹{quoteTotals.taxAmount.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold">Grand Total</span>
                          <span className="font-bold text-emerald-600">₹{quoteTotals.grandTotal.toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Customer</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p className="font-medium">{quoteForm.customerName || 'Not specified'}</p>
                        <p className="text-slate-500">{quoteForm.customerPhone}</p>
                        <p className="text-slate-500">{quoteForm.customerEmail}</p>
                        <p className="text-slate-500 mt-2">{quoteForm.siteAddress}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right - Preview and Actions */}
                  <div className="space-y-4">
                    {quoteItems.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Preview ({quoteItems.length} items)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2">
                            {quoteItems.slice(0, 4).map((item, idx) => (
                              <div key={item.id} className="border rounded-lg overflow-hidden">
                                <DoorWindow3DPreview 
                                  config={{
                                    type: item.type,
                                    category: item.category,
                                    width: item.width,
                                    height: item.height,
                                    panels: item.panels,
                                    frameColor: item.frameColor,
                                    glassType: item.glassType
                                  }}
                                  className="h-32"
                                />
                              </div>
                            ))}
                          </div>
                          {quoteItems.length > 4 && (
                            <p className="text-center text-sm text-slate-500 mt-2">+{quoteItems.length - 4} more items</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={() => handleSaveQuote('draft')} 
                        disabled={saving || quoteItems.length === 0}
                        variant="outline"
                        className="w-full"
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save as Draft
                      </Button>
                      <Button 
                        onClick={() => handleDownloadPDF()}
                        disabled={generating || quoteItems.length === 0}
                        variant="outline"
                        className="w-full"
                      >
                        {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        Download Detailed PDF with Visuals
                      </Button>
                      <Button 
                        onClick={() => handleSaveQuote('sent')} 
                        disabled={saving || quoteItems.length === 0}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Save & Send Quote
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={(open) => { if (!open) resetItemForm(); setShowItemDialog(open); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItemIndex !== null ? 'Edit Item' : 'Add Door/Window Item'}</DialogTitle>
            <DialogDescription>Configure item with panel settings, glass type & pricing</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-5 gap-6">
            {/* Left - Form (3 cols) */}
            <div className="col-span-3 space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="panels">Panels & Glass</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={itemForm.type} onValueChange={(v) => setItemForm({ ...itemForm, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Material</Label>
                      <Select value={itemForm.material} onValueChange={(v) => setItemForm({ ...itemForm, material: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_FAMILIES.map(mat => (
                            <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Frame Color</Label>
                      <Select value={itemForm.frameColor} onValueChange={(v) => setItemForm({ ...itemForm, frameColor: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FRAME_COLORS.map(color => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.hex }} />
                                {color.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Width (mm)</Label>
                      <Input
                        type="number"
                        value={itemForm.width}
                        onChange={(e) => setItemForm({ ...itemForm, width: parseInt(e.target.value) || 1200 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (mm)</Label>
                      <Input
                        type="number"
                        value={itemForm.height}
                        onChange={(e) => setItemForm({ ...itemForm, height: parseInt(e.target.value) || 1500 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Floor</Label>
                      <Select value={itemForm.floor} onValueChange={(v) => setItemForm({ ...itemForm, floor: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FLOOR_LEVELS.map(floor => (
                            <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Room</Label>
                      <Select value={itemForm.room} onValueChange={(v) => setItemForm({ ...itemForm, room: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map(room => (
                            <SelectItem key={room} value={room}>{room}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Finish</Label>
                      <Select value={itemForm.finish} onValueChange={(v) => setItemForm({ ...itemForm, finish: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINISHES.map(finish => (
                            <SelectItem key={finish.id} value={finish.id}>{finish.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={itemForm.mesh}
                        onCheckedChange={(v) => setItemForm({ ...itemForm, mesh: v })}
                      />
                      <Label>Mosquito Mesh</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={itemForm.grill}
                        onCheckedChange={(v) => setItemForm({ ...itemForm, grill: v })}
                      />
                      <Label>Safety Grill</Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="panels" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Number of Panels</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={itemForm.panels}
                        onChange={(e) => handlePanelCountChange(parseInt(e.target.value) || 2)}
                        className="w-24"
                      />
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(num => (
                          <Button
                            key={num}
                            variant={itemForm.panels === num ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePanelCountChange(num)}
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <PanelConfigurator 
                    panels={itemForm.panels}
                    panelConfig={itemForm.panelConfig}
                    onChange={(config) => setItemForm({ ...itemForm, panelConfig: config })}
                    category={itemForm.category}
                  />

                  <Separator />

                  <div className="space-y-2">
                    <Label>Default Glass Type (applies to all panels)</Label>
                    <Select value={itemForm.glassType} onValueChange={(v) => setItemForm({ ...itemForm, glassType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GLASS_TYPES.map(glass => (
                          <SelectItem key={glass.id} value={glass.id}>{glass.name} ({glass.multiplier}x)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Glass Type Visual Preview */}
                  <div className="space-y-2">
                    <Label>Glass Type Preview</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {GLASS_TYPES.slice(0, 5).map(glass => (
                        <div 
                          key={glass.id}
                          className={`cursor-pointer rounded-lg p-2 transition-all ${itemForm.glassType === glass.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'hover:bg-slate-50'}`}
                          onClick={() => setItemForm({ ...itemForm, glassType: glass.id })}
                        >
                          <GlassTypePreview glassType={glass.id} size={60} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {GLASS_TYPES.slice(5).map(glass => (
                        <div 
                          key={glass.id}
                          className={`cursor-pointer rounded-lg p-2 transition-all ${itemForm.glassType === glass.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'hover:bg-slate-50'}`}
                          onClick={() => setItemForm({ ...itemForm, glassType: glass.id })}
                        >
                          <GlassTypePreview glassType={glass.id} size={60} />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4 mt-4">
                  <Card className="bg-gradient-to-br from-slate-50 to-indigo-50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Automatic Price Calculation
                      </CardTitle>
                      <CardDescription>
                        Based on industry-standard rates for {itemForm.material} {itemForm.category} {itemForm.type}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-slate-500 text-xs">Base Rate ({itemForm.material})</p>
                          <p className="font-semibold">₹{PRICING_RATES.materials[itemForm.material]?.base || 450}/sqft</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-slate-500 text-xs">Category Multiplier</p>
                          <p className="font-semibold">{PRICING_RATES.categories[itemForm.category] || 1.0}x</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-slate-500 text-xs">Glass Multiplier</p>
                          <p className="font-semibold">{GLASS_TYPES.find(g => g.id === itemForm.glassType)?.multiplier || 1.0}x</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-slate-500 text-xs">Finish Multiplier</p>
                          <p className="font-semibold">{FINISHES.find(f => f.id === itemForm.finish)?.multiplier || 1.0}x</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Calculated Area</span>
                        <span className="font-semibold">{livePricing.areaSqft} sqft</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Calculated Rate</span>
                        <span className="font-semibold">₹{livePricing.pricePerSqft}/sqft</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold">Auto Total ({itemForm.quantity} qty)</span>
                        <span className="font-bold text-emerald-600">₹{livePricing.totalAmount.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Separator />

                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <PenLine className="h-4 w-4" />
                        Manual Price Override
                      </CardTitle>
                      <CardDescription>
                        Override the automatic calculation with a custom price
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Custom Rate per sqft (₹)</Label>
                          <Input
                            type="number"
                            value={itemForm.customRate || ''}
                            onChange={(e) => setItemForm({ 
                              ...itemForm, 
                              customRate: e.target.value ? parseFloat(e.target.value) : null,
                              manualTotal: null 
                            })}
                            placeholder="Leave empty for auto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>OR Direct Total Amount (₹)</Label>
                          <Input
                            type="number"
                            value={itemForm.manualTotal || ''}
                            onChange={(e) => setItemForm({ 
                              ...itemForm, 
                              manualTotal: e.target.value ? parseFloat(e.target.value) : null,
                              customRate: null 
                            })}
                            placeholder="Leave empty for auto"
                          />
                        </div>
                      </div>
                      {(itemForm.customRate || itemForm.manualTotal) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setItemForm({ ...itemForm, customRate: null, manualTotal: null })}
                        >
                          <RotateCcw className="h-3 w-3 mr-2" /> Reset to Auto
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right - Preview (2 cols) */}
            <div className="col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <DoorWindow3DPreview 
                    config={{
                      type: itemForm.type,
                      category: itemForm.category,
                      width: itemForm.width,
                      height: itemForm.height,
                      panels: itemForm.panels,
                      frameColor: itemForm.frameColor,
                      glassType: itemForm.glassType,
                      panelConfig: itemForm.panelConfig
                    }}
                    className="h-56"
                  />
                </CardContent>
              </Card>

              {/* Price Summary Card */}
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Final Price</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      ₹{livePricing.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {livePricing.areaSqft} sqft × ₹{livePricing.pricePerSqft}/sqft × {itemForm.quantity}
                    </p>
                    {livePricing.isManual && (
                      <Badge className="mt-2 bg-amber-100 text-amber-700">Manual Price</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetItemForm(); setShowItemDialog(false); }}>Cancel</Button>
            <Button onClick={handleSaveItem}>
              {editingItemIndex !== null ? (
                <><Save className="h-4 w-4 mr-2" /> Update Item</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Add to Quote</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Accessory Dialog */}
      <Dialog open={showCustomAccessoryDialog} onOpenChange={setShowCustomAccessoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Accessory</DialogTitle>
            <DialogDescription>Add any accessory not in the standard list</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Accessory Name *</Label>
              <Input
                value={customAccessory.name}
                onChange={(e) => setCustomAccessory({ ...customAccessory, name: e.target.value })}
                placeholder="e.g., Special Handle, Custom Lock"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  value={customAccessory.price}
                  onChange={(e) => setCustomAccessory({ ...customAccessory, price: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select 
                  value={customAccessory.unit} 
                  onValueChange={(v) => setCustomAccessory({ ...customAccessory, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="pair">Pair</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={customAccessory.quantity}
                onChange={(e) => setCustomAccessory({ ...customAccessory, quantity: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomAccessoryDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCustomAccessory}>
              <Plus className="h-4 w-4 mr-2" /> Add Accessory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
