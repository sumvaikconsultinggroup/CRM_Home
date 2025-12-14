'use client'

import { useState, useEffect, useMemo } from 'react'
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
import {
  Plus, Search, Eye, Edit, Trash2, Save, Loader2, Download,
  FileText, Calculator, Package, DoorOpen, Maximize2,
  CheckCircle2, Send, Printer, ShoppingCart, RefreshCw,
  ChevronRight, ArrowRight, X, Layers, Settings, User
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

// Price Calculator Function - Industry Standard
function calculatePrice(item) {
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
    grill = false
  } = item

  // Calculate area in sq.ft (from mm)
  const areaSqft = (width / 304.8) * (height / 304.8)

  // Get base rate
  const materialRates = PRICING_RATES.materials[material] || PRICING_RATES.materials['Aluminium']
  const baseRate = materialRates.base

  // Apply multipliers
  const categoryMultiplier = PRICING_RATES.categories[category] || 1.0
  const typeMultiplier = PRICING_RATES.types[type] || 1.0
  const glassInfo = GLASS_TYPES.find(g => g.id === glassType) || { multiplier: 1.0 }
  const finishInfo = FINISHES.find(f => f.id === finish) || { multiplier: 1.0 }

  // Calculate base price
  let pricePerSqft = baseRate * categoryMultiplier * typeMultiplier * glassInfo.multiplier * finishInfo.multiplier

  // Add extras
  if (mesh) pricePerSqft += PRICING_RATES.extras.mosquitoMesh
  if (grill) pricePerSqft += PRICING_RATES.extras.grill

  const totalPrice = pricePerSqft * areaSqft * quantity

  return {
    areaSqft: areaSqft.toFixed(2),
    pricePerSqft: Math.round(pricePerSqft),
    baseAmount: Math.round(totalPrice),
    totalAmount: Math.round(totalPrice)
  }
}

export function QuoteBuilder({ quotations, projects, surveys, selectedProject, onRefresh, headers, user, glassStyles }) {
  const [showNewQuote, setShowNewQuote] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [showAccessoriesDialog, setShowAccessoriesDialog] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [editingQuote, setEditingQuote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeBuilderTab, setActiveBuilderTab] = useState('items')
  const [searchQuery, setSearchQuery] = useState('')
  const [generating, setGenerating] = useState(false)

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

  // Item form state
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
    mesh: false,
    grill: false,
    quantity: 1,
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
      mesh: false,
      grill: false,
      quantity: 1,
      notes: ''
    })
  }

  // Add item to quote
  const handleAddItem = () => {
    const pricing = calculatePrice(itemForm)
    const newItem = {
      id: `item-${Date.now()}`,
      ...itemForm,
      ...pricing
    }
    setQuoteItems([...quoteItems, newItem])
    setShowItemDialog(false)
    resetItemForm()
    toast.success('Item added to quote')
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

  // Generate PDF
  const handleDownloadPDF = async (quote) => {
    setGenerating(true)
    try {
      // For now, generate a simple HTML-based printable version
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const html = generateQuoteHTML(quote || { ...quoteForm, items: quoteItems, accessories, ...quoteTotals })
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.print()
      }
      toast.success('Quote PDF generated')
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  // Generate HTML for PDF
  const generateQuoteHTML = (quote) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote - ${quote.quoteNumber || 'Draft'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #4F46E5; margin: 0; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; font-weight: bold; color: #4F46E5; border-bottom: 1px solid #E5E7EB; padding-bottom: 5px; margin-bottom: 15px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .label { font-size: 11px; color: #6B7280; }
          .value { font-size: 13px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #F3F4F6; font-weight: 600; }
          .total-row { font-weight: bold; background: #EEF2FF; }
          .grand-total { font-size: 16px; color: #4F46E5; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTATION</h1>
          <p style="color: #6B7280; margin: 10px 0 0;">Doors & Windows</p>
        </div>
        
        <div class="section">
          <div class="grid">
            <div>
              <div class="label">Quote Number</div>
              <div class="value">${quote.quoteNumber || 'DRAFT'}</div>
            </div>
            <div>
              <div class="label">Date</div>
              <div class="value">${new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <div class="label">Customer</div>
              <div class="value">${quote.customerName || '-'}</div>
            </div>
            <div>
              <div class="label">Contact</div>
              <div class="value">${quote.customerPhone || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">ITEMS</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Size (mm)</th>
                <th>Area (sqft)</th>
                <th>Rate/sqft</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(quote.items || quoteItems).map(item => `
                <tr>
                  <td>${item.type} - ${item.category}<br/><small style="color: #6B7280">${item.material}, ${item.room}</small></td>
                  <td>${item.width} x ${item.height}</td>
                  <td>${item.areaSqft}</td>
                  <td>₹${item.pricePerSqft}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.totalAmount?.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${(quote.accessories || accessories).length > 0 ? `
        <div class="section">
          <div class="section-title">ACCESSORIES</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(quote.accessories || accessories).map(acc => `
                <tr>
                  <td>${acc.name}</td>
                  <td>₹${acc.price}</td>
                  <td>${acc.quantity}</td>
                  <td>₹${(acc.price * acc.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section" style="width: 300px; margin-left: auto;">
          <table>
            <tr><td>Items Total</td><td style="text-align: right">₹${(quote.itemsTotal || quoteTotals.itemsTotal).toLocaleString()}</td></tr>
            <tr><td>Accessories</td><td style="text-align: right">₹${(quote.accessoriesTotal || quoteTotals.accessoriesTotal).toLocaleString()}</td></tr>
            <tr><td>Installation (10%)</td><td style="text-align: right">₹${(quote.installationCharge || quoteTotals.installationCharge).toLocaleString()}</td></tr>
            <tr><td>GST (18%)</td><td style="text-align: right">₹${(quote.taxAmount || quoteTotals.taxAmount).toLocaleString()}</td></tr>
            <tr class="total-row"><td class="grand-total">Grand Total</td><td style="text-align: right" class="grand-total">₹${(quote.grandTotal || quoteTotals.grandTotal).toLocaleString()}</td></tr>
          </table>
        </div>

        <div class="footer">
          <p><strong>Terms & Conditions:</strong></p>
          <p>${quote.paymentTerms || 'As per company policy'}</p>
          <p>Quote valid for ${quote.validDays || 30} days from the date of issue.</p>
        </div>
      </body>
      </html>
    `
  }

  // Link customer from project
  const handleSelectProject = (projectId) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Enterprise Quote Builder</h2>
          <p className="text-slate-500">Create detailed quotations with 3D previews and automatic pricing</p>
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
                    {quote.itemsCount || 0} items
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
              Build comprehensive quotations with 3D previews and automatic pricing
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeBuilderTab} onValueChange={setActiveBuilderTab} className="flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="customer">Customer Info</TabsTrigger>
              <TabsTrigger value="items">
                Items ({quoteItems.length})
              </TabsTrigger>
              <TabsTrigger value="accessories">
                Accessories ({accessories.length})
              </TabsTrigger>
              <TabsTrigger value="summary">Summary & Download</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Customer Tab */}
              <TabsContent value="customer" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link to Project</Label>
                    <Select value={quoteForm.projectId} onValueChange={handleSelectProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Project</SelectItem>
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
                  <p className="text-sm text-slate-600">Add doors and windows with automatic pricing</p>
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
                            <div className="w-64 h-48 border-r">
                              <DoorWindow3DPreview 
                                config={{
                                  type: item.type,
                                  category: item.category,
                                  width: item.width,
                                  height: item.height,
                                  panels: item.panels,
                                  frameColor: item.frameColor
                                }}
                                className="h-full"
                              />
                            </div>
                            {/* Item Details */}
                            <div className="flex-1 p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-slate-800">
                                    {item.type} - {item.category}
                                  </h4>
                                  <p className="text-sm text-slate-500">
                                    {item.material} • {item.room} • {item.floor}
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500">Size</span>
                                  <p className="font-medium">{item.width} x {item.height} mm</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Area</span>
                                  <p className="font-medium">{item.areaSqft} sqft</p>
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
                              <div className="flex gap-2 mt-2">
                                {item.mesh && <Badge variant="outline" className="text-xs">Mesh</Badge>}
                                {item.grill && <Badge variant="outline" className="text-xs">Grill</Badge>}
                                <Badge variant="secondary" className="text-xs">{GLASS_TYPES.find(g => g.id === item.glassType)?.name || item.glassType}</Badge>
                                <Badge variant="secondary" className="text-xs">{item.frameColor}</Badge>
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
                <p className="text-sm text-slate-600 mb-4">Add handles, locks, and other accessories</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(PRICING_RATES.accessories).map(([key, acc]) => (
                    <Card 
                      key={key} 
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleAddAccessory({ id: key, ...acc })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{acc.name}</p>
                            <p className="text-sm text-emerald-600">₹{acc.price}/{acc.unit}</p>
                          </div>
                          <Plus className="h-5 w-5 text-indigo-600" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {accessories.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h4 className="font-medium mb-3">Selected Accessories</h4>
                    <div className="space-y-2">
                      {accessories.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{acc.name}</span>
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
                            <span className="font-semibold">₹{(acc.price * acc.quantity).toLocaleString()}</span>
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
                          <CardTitle className="text-lg">3D Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DoorWindow3DPreview 
                            config={{
                              type: quoteItems[0].type,
                              category: quoteItems[0].category,
                              width: quoteItems[0].width,
                              height: quoteItems[0].height,
                              panels: quoteItems[0].panels,
                              frameColor: quoteItems[0].frameColor
                            }}
                            className="h-64"
                          />
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
                        Download PDF
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

      {/* Add Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Door/Window Item</DialogTitle>
            <DialogDescription>Configure item with automatic pricing</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Left - Form */}
            <div className="space-y-4">
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
                  <Label>Glass Type</Label>
                  <Select value={itemForm.glassType} onValueChange={(v) => setItemForm({ ...itemForm, glassType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GLASS_TYPES.map(glass => (
                        <SelectItem key={glass.id} value={glass.id}>{glass.name}</SelectItem>
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
                  <Label>Number of Panels</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={itemForm.panels}
                    onChange={(e) => setItemForm({ ...itemForm, panels: parseInt(e.target.value) || 2 })}
                  />
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

              <div className="flex gap-4">
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
            </div>

            {/* Right - Preview and Price */}
            <div className="space-y-4">
              <DoorWindow3DPreview 
                config={{
                  type: itemForm.type,
                  category: itemForm.category,
                  width: itemForm.width,
                  height: itemForm.height,
                  panels: itemForm.panels,
                  frameColor: itemForm.frameColor
                }}
                className="h-64"
              />

              {/* Automatic Price Calculator */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Automatic Price Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(() => {
                    const pricing = calculatePrice(itemForm)
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Area</span>
                          <span className="font-medium">{pricing.areaSqft} sqft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Rate per sqft</span>
                          <span className="font-medium">₹{pricing.pricePerSqft}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Quantity</span>
                          <span className="font-medium">{itemForm.quantity}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-base">
                          <span className="font-semibold">Total Amount</span>
                          <span className="font-bold text-emerald-600">₹{pricing.totalAmount.toLocaleString()}</span>
                        </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> Add to Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
