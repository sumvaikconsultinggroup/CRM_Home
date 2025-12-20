'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Edit, Trash2, Eye, Download, CheckCircle2, Clock, Send,
  Calendar, Package, X, Receipt, Users, Phone, Mail, MapPin, Plus, ClipboardList,
  Truck, Shield, Settings, Building2, User, CreditCard, Ruler, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/phone-input'

// Quote Status Configuration - shared across components
export const QuoteStatusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
  sent: { label: 'Sent to Customer', color: 'bg-blue-100 text-blue-700', icon: Send },
  approved: { label: 'Customer Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: X },
  revised: { label: 'Needs Revision', color: 'bg-amber-100 text-amber-700', icon: Edit },
  invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700', icon: Receipt },
  // Keep 'converted' as alias for backward compatibility - shows same as invoiced
  converted: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700', icon: Receipt },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: Clock }
}

// =============================================
// VIEW QUOTE DIALOG
// =============================================
export function ViewQuoteDialog({ open, onClose, quote, moduleSettings, onDownload, onEdit, onApprove, onReject, onCreateInvoice }) {
  if (!quote) return null

  const isExpired = new Date(quote.validUntil) < new Date() && !['approved', 'invoiced', 'converted'].includes(quote.status)
  const statusConfig = QuoteStatusConfig[isExpired ? 'expired' : quote.status] || QuoteStatusConfig.draft
  const StatusIcon = statusConfig.icon

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">{quote.quoteNumber}</DialogTitle>
                <DialogDescription>
                  Created on {new Date(quote.createdAt).toLocaleDateString()}
                  {quote.version > 1 && ` • Version ${quote.version}`}
                </DialogDescription>
              </div>
            </div>
            <Badge className={`${statusConfig.color} flex items-center gap-1 px-3 py-1`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
              {isExpired && quote.status !== 'expired' && ' (Expired)'}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Customer & Project Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Customer Details
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-lg font-semibold">{quote.customer?.name || '-'}</p>
                    {quote.customer?.company && <p className="text-sm text-slate-500">{quote.customer.company}</p>}
                  </div>
                  {quote.customer?.email && (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {quote.customer.email}
                    </p>
                  )}
                  {quote.customer?.phone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {quote.customer.phone}
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Quote Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Project</p>
                    <p className="font-medium">{quote.projectNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Valid Until</p>
                    <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                      {new Date(quote.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Area</p>
                    <p className="font-medium">{quote.totalArea?.toFixed(0) || 0} sqft</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Items</p>
                    <p className="font-medium">{quote.items?.length || 0} items</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Site Address */}
            {quote.site?.address && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Site Address
                </h4>
                <p className="text-sm">
                  {quote.site.address}
                  {quote.site.city && `, ${quote.site.city}`}
                  {quote.site.state && `, ${quote.site.state}`}
                  {quote.site.pincode && ` - ${quote.site.pincode}`}
                </p>
              </Card>
            )}

            {/* Line Items */}
            <Card>
              <div className="p-4 border-b">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Items
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Unit</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quote.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.name || item.description || '-'}</p>
                          {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity || item.area || 0}</td>
                        <td className="px-4 py-3 text-center">{item.unit || 'sqft'}</td>
                        <td className="px-4 py-3 text-right">₹{(item.unitPrice || item.rate || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{(item.totalPrice || item.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Totals */}
            <Card className="p-4">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span>₹{(quote.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {quote.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount ({quote.discountType === 'percentage' ? `${quote.discountValue}%` : 'Fixed'})</span>
                      <span>-₹{(quote.discountAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {quote.cgstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">CGST ({quote.cgstRate}%)</span>
                      <span>₹{(quote.cgstAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {quote.sgstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">SGST ({quote.sgstRate}%)</span>
                      <span>₹{(quote.sgstAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {quote.igstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">IGST ({quote.igstRate}%)</span>
                      <span>₹{(quote.igstAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-emerald-600">₹{(quote.grandTotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notes */}
            {quote.notes && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">Notes & Terms</h4>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">{quote.notes}</p>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 flex justify-between">
          <div className="flex gap-2">
            {/* Status-based actions */}
            {quote.status === 'sent' && (
              <>
                <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onApprove(quote.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onReject(quote.id)}>
                  <X className="h-4 w-4 mr-2" /> Reject
                </Button>
              </>
            )}
            {quote.status === 'approved' && (
              <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => onCreateInvoice(quote)}>
                <Receipt className="h-4 w-4 mr-2" /> Create Invoice
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {['draft', 'revised'].includes(quote.status) && (
              <Button variant="outline" onClick={() => onEdit(quote)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Quote
              </Button>
            )}
            <Button variant="outline" onClick={() => onDownload(quote)}>
              <Download className="h-4 w-4 mr-2" /> Download / Print
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// QUOTE EDIT DIALOG
// =============================================
export function QuoteEditDialog({ open, onClose, quote, projects, products, moduleSettings, onSave, loading, user }) {
  const [form, setForm] = useState({
    projectId: '',
    projectNumber: '',
    customer: null,
    site: null,
    items: [],
    notes: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discountType: 'percentage',
    discountValue: 0,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
    // Enterprise Fields
    salesRepName: '',
    salesRepEmail: '',
    salesRepPhone: '',
    paymentTerms: 'net30',
    advancePercent: 50,
    warrantyTerms: '1 year manufacturer warranty on materials',
    installationNotes: '',
    siteConditions: '',
    deliveryTerms: 'Ex-warehouse, delivery charges extra',
    specialInstructions: '',
    estimatedDeliveryDays: 7,
    estimatedInstallDays: 3,
    subfloorType: '',
    moistureLevel: '',
    transportCharges: 0,
    installationCharges: 0
  })
  const [selectedProject, setSelectedProject] = useState(null)
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [activeTab, setActiveTab] = useState('basic') // basic, items, terms, site

  // Initialize form when quote changes
  useEffect(() => {
    if (quote) {
      setForm({
        id: quote.id,
        status: quote.status,
        projectId: quote.projectId || '',
        projectNumber: quote.projectNumber || '',
        customer: quote.customer || null,
        site: quote.site || null,
        items: quote.items || [],
        notes: quote.notes || '',
        validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discountType: quote.discountType || 'percentage',
        discountValue: quote.discountValue || 0,
        cgstRate: quote.cgstRate || 9,
        sgstRate: quote.sgstRate || 9,
        igstRate: quote.igstRate || 0,
        version: quote.version || 1,
        // Enterprise Fields
        salesRepName: quote.salesRepName || user?.name || '',
        salesRepEmail: quote.salesRepEmail || user?.email || '',
        salesRepPhone: quote.salesRepPhone || '',
        paymentTerms: quote.paymentTerms || 'net30',
        advancePercent: quote.advancePercent || 50,
        warrantyTerms: quote.warrantyTerms || '1 year manufacturer warranty on materials',
        installationNotes: quote.installationNotes || '',
        siteConditions: quote.siteConditions || '',
        deliveryTerms: quote.deliveryTerms || 'Ex-warehouse, delivery charges extra',
        specialInstructions: quote.specialInstructions || '',
        estimatedDeliveryDays: quote.estimatedDeliveryDays || 7,
        estimatedInstallDays: quote.estimatedInstallDays || 3,
        subfloorType: quote.subfloorType || '',
        moistureLevel: quote.moistureLevel || '',
        transportCharges: quote.transportCharges || 0,
        installationCharges: quote.installationCharges || 0
      })
      if (quote.projectId) {
        const proj = projects.find(p => p.id === quote.projectId)
        setSelectedProject(proj || null)
      }
    } else {
      // Reset for new quote
      setForm({
        projectId: '',
        projectNumber: '',
        customer: null,
        site: null,
        items: [],
        notes: moduleSettings?.defaultQuoteNotes || 'Thank you for considering our flooring solutions. This quote is valid for the period mentioned above.',
        validUntil: new Date(Date.now() + (moduleSettings?.quoteValidityDays || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discountType: 'percentage',
        discountValue: 0,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0,
        // Enterprise Fields - defaults
        salesRepName: user?.name || '',
        salesRepEmail: user?.email || '',
        salesRepPhone: '',
        paymentTerms: 'net30',
        advancePercent: 50,
        warrantyTerms: '1 year manufacturer warranty on materials',
        installationNotes: '',
        siteConditions: '',
        deliveryTerms: 'Ex-warehouse, delivery charges extra',
        specialInstructions: '',
        estimatedDeliveryDays: 7,
        estimatedInstallDays: 3,
        subfloorType: '',
        moistureLevel: '',
        transportCharges: 0,
        installationCharges: 0
      })
      setSelectedProject(null)
    }
    setActiveTab('basic')
  }, [quote, projects, moduleSettings, user])

  // Handle project selection
  const handleProjectSelect = (projectId) => {
    const proj = projects.find(p => p.id === projectId)
    if (proj) {
      setSelectedProject(proj)
      // Build customer object from project's flat customer fields OR nested customer object
      const customerData = proj.customer || {
        name: proj.customerName || '',
        email: proj.customerEmail || '',
        phone: proj.customerPhone || '',
        company: proj.customerCompany || '',
        gstin: proj.customerGstin || ''
      }
      setForm(prev => ({
        ...prev,
        projectId: proj.id,
        projectNumber: proj.projectNumber,
        customer: customerData,
        site: proj.site || null
      }))
    }
  }

  // Add product to items
  const handleAddProduct = (product) => {
    const newItem = {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      description: product.name,
      quantity: 1,
      unit: product.unit || 'sqft',
      unitPrice: product.sellingPrice || product.price || 0,
      totalPrice: product.sellingPrice || product.price || 0
    }
    setForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
    setShowProductSelector(false)
  }

  // Update item quantity
  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      // Recalculate total
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].totalPrice = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0)
      }
      return { ...prev, items: newItems }
    })
  }

  // Remove item
  const handleRemoveItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Calculate totals
  const subtotal = form.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const discountAmount = form.discountType === 'percentage' 
    ? subtotal * (form.discountValue / 100) 
    : form.discountValue
  const taxableAmount = subtotal - discountAmount
  const cgstAmount = taxableAmount * (form.cgstRate / 100)
  const sgstAmount = taxableAmount * (form.sgstRate / 100)
  const igstAmount = taxableAmount * (form.igstRate / 100)
  const totalTax = cgstAmount + sgstAmount + igstAmount
  const grandTotal = taxableAmount + totalTax

  // Handle save - supports both regular save and save as draft
  const handleSubmit = (saveAsDraft = false) => {
    // For Save as Draft, only customer name is required (less strict validation)
    if (!saveAsDraft) {
      if (!form.customer?.name) {
        toast.error('Please select a project or add customer details')
        return
      }
      if (form.items.length === 0) {
        toast.error('Please add at least one item')
        return
      }
    } else {
      // Minimal validation for draft - just need some identifier
      if (!form.customer?.name && !form.projectId) {
        toast.error('Please add customer name or select a project')
        return
      }
    }

    const quoteData = {
      ...form,
      subtotal,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      grandTotal,
      totalArea: form.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      // Force status to 'draft' if Save as Draft is clicked
      status: saveAsDraft ? 'draft' : (form.id ? form.status : 'draft'),
      savedAsDraft: saveAsDraft
    }

    onSave(quoteData)
  }

  // Payment terms options
  const paymentTermsOptions = [
    { value: 'advance100', label: '100% Advance' },
    { value: 'advance50', label: '50% Advance, 50% on Delivery' },
    { value: 'advance30', label: '30% Advance, 70% on Completion' },
    { value: 'net15', label: 'Net 15 Days' },
    { value: 'net30', label: 'Net 30 Days' },
    { value: 'net45', label: 'Net 45 Days' },
    { value: 'net60', label: 'Net 60 Days' },
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'milestone', label: 'Milestone Based' },
    { value: 'custom', label: 'Custom Terms' }
  ]

  // Subfloor type options
  const subfloorOptions = [
    { value: 'concrete', label: 'Concrete' },
    { value: 'plywood', label: 'Plywood' },
    { value: 'osb', label: 'OSB (Oriented Strand Board)' },
    { value: 'existing_tile', label: 'Existing Tile' },
    { value: 'existing_hardwood', label: 'Existing Hardwood' },
    { value: 'cement_board', label: 'Cement Board' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-blue-600" />
                {quote?.id ? `Edit Quote ${quote.quoteNumber}` : 'Create New Quote'}
              </DialogTitle>
              <DialogDescription>
                {quote?.id ? 'Update the quote details below' : 'Enterprise-level quotation for flooring projects'}
              </DialogDescription>
            </div>
            {form.salesRepName && (
              <div className="text-right text-sm">
                <p className="text-slate-500">Sales Representative</p>
                <p className="font-medium">{form.salesRepName}</p>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="basic" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Basic Info
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Items
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Payment & Terms
            </TabsTrigger>
            <TabsTrigger value="site" className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" /> Site Details
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Summary
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            {/* TAB 1: Basic Info */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* Project Selection */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Link to Project
                </h4>
                <Select value={form.projectId} onValueChange={handleProjectSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').map(proj => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.projectNumber} - {proj.customer?.name || proj.customerName || 'No Customer'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>

              {/* Customer & Sales Rep in 2 columns */}
              <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Customer Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label>Customer Name *</Label>
                    <Input 
                      value={form.customer?.name || ''} 
                      onChange={(e) => setForm(prev => ({ ...prev, customer: { ...prev.customer, name: e.target.value } }))}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={form.customer?.email || ''} 
                        onChange={(e) => {
                          const email = e.target.value
                          setForm(prev => ({ ...prev, customer: { ...prev.customer, email } }))
                        }}
                        placeholder="customer@example.com"
                      />
                    </div>
                    <PhoneInput
                      label="Phone"
                      name="customerPhone"
                      value={form.customer?.phone || ''} 
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, customer: { ...prev.customer, phone: e.target.value } }))
                      }}
                      defaultCountry="IN"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Company</Label>
                      <Input 
                        value={form.customer?.company || ''} 
                        onChange={(e) => setForm(prev => ({ ...prev, customer: { ...prev.customer, company: e.target.value } }))}
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <Label>GSTIN</Label>
                      <Input 
                        value={form.customer?.gstin || ''} 
                        onChange={(e) => setForm(prev => ({ ...prev, customer: { ...prev.customer, gstin: e.target.value.toUpperCase() } }))}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sales Representative */}
              <Card className="p-4 border-blue-200 bg-blue-50/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                  <User className="h-4 w-4" /> Sales Representative
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label>Sales Rep Name *</Label>
                    <Input 
                      value={form.salesRepName} 
                      onChange={(e) => setForm(prev => ({ ...prev, salesRepName: e.target.value }))}
                      placeholder="Enter sales representative name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={form.salesRepEmail} 
                        onChange={(e) => setForm(prev => ({ ...prev, salesRepEmail: e.target.value }))}
                        placeholder="sales@company.com"
                      />
                    </div>
                    <PhoneInput
                      label="Phone"
                      name="salesRepPhone"
                      value={form.salesRepPhone} 
                      onChange={(e) => setForm(prev => ({ ...prev, salesRepPhone: e.target.value }))}
                      defaultCountry="IN"
                    />
                  </div>
                </div>
              </Card>
              </div>

              {/* Quote Validity */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Quote Validity
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Valid Until *</Label>
                    <Input 
                      type="date" 
                      value={form.validUntil}
                      onChange={(e) => setForm(prev => ({ ...prev, validUntil: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Estimated Delivery (Days)</Label>
                    <Input 
                      type="number" 
                      value={form.estimatedDeliveryDays}
                      onChange={(e) => setForm(prev => ({ ...prev, estimatedDeliveryDays: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Installation Time (Days)</Label>
                    <Input 
                      type="number" 
                      value={form.estimatedInstallDays}
                      onChange={(e) => setForm(prev => ({ ...prev, estimatedInstallDays: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 2: Items */}
            <TabsContent value="items" className="space-y-4 mt-0">
              <Card>
                <div className="p-4 border-b flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" /> Quote Items
                  </h4>
                  <Button size="sm" onClick={() => setShowProductSelector(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Product
                  </Button>
                </div>
                
                {form.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-2 text-left">Product</th>
                          <th className="px-4 py-2 text-right w-24">Qty</th>
                          <th className="px-4 py-2 text-center w-20">Unit</th>
                          <th className="px-4 py-2 text-right w-28">Rate (₹)</th>
                          <th className="px-4 py-2 text-right w-28">Amount</th>
                          <th className="px-4 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2">
                              <p className="font-medium">{item.name}</p>
                              {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">{item.unit}</td>
                            <td className="px-4 py-2">
                              <Input 
                                type="number" 
                                value={item.unitPrice} 
                                onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-medium">₹{(item.totalPrice || 0).toLocaleString()}</td>
                            <td className="px-4 py-2">
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No items added yet</p>
                    <Button variant="link" onClick={() => setShowProductSelector(true)}>
                      Add your first product
                    </Button>
                  </div>
                )}
              </Card>

              {/* Additional Charges */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Additional Charges
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transport/Delivery Charges (₹)</Label>
                    <Input 
                      type="number" 
                      value={form.transportCharges}
                      onChange={(e) => setForm(prev => ({ ...prev, transportCharges: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Installation Charges (₹)</Label>
                    <Input 
                      type="number" 
                      value={form.installationCharges}
                      onChange={(e) => setForm(prev => ({ ...prev, installationCharges: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </Card>

              {/* Discount & Taxes */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Discount & Taxes</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Discount</Label>
                      <Input 
                        type="number" 
                        value={form.discountValue} 
                        onChange={(e) => setForm(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Type</Label>
                      <Select value={form.discountType} onValueChange={(v) => setForm(prev => ({ ...prev, discountType: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Fixed ₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>CGST %</Label>
                      <Input 
                        type="number" 
                        value={form.cgstRate} 
                        onChange={(e) => setForm(prev => ({ ...prev, cgstRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>SGST %</Label>
                      <Input 
                        type="number" 
                        value={form.sgstRate} 
                        onChange={(e) => setForm(prev => ({ ...prev, sgstRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>IGST %</Label>
                      <Input 
                        type="number" 
                        value={form.igstRate} 
                        onChange={(e) => setForm(prev => ({ ...prev, igstRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <Input 
                      type="date" 
                      value={form.validUntil} 
                      onChange={(e) => setForm(prev => ({ ...prev, validUntil: e.target.value }))}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-slate-50">
                <h4 className="font-semibold mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Taxable Amount</span>
                    <span>₹{taxableAmount.toLocaleString()}</span>
                  </div>
                  {cgstAmount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>CGST ({form.cgstRate}%)</span>
                      <span>₹{cgstAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {sgstAmount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>SGST ({form.sgstRate}%)</span>
                      <span>₹{sgstAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {igstAmount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>IGST ({form.igstRate}%)</span>
                      <span>₹{igstAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-emerald-600">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Notes */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Notes & Terms</h4>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes or terms for this quote..."
                rows={3}
              />
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 flex justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(true)} 
              disabled={loading}
              className="border-slate-300"
            >
              <FileText className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={loading}>
              {loading ? 'Saving...' : quote?.id ? 'Update Quote' : 'Create Quote'}
            </Button>
          </div>
        </DialogFooter>

        {/* Product Selector Dialog */}
        <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Product</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="grid grid-cols-1 gap-2 p-2">
                {products.map(product => (
                  <div 
                    key={product.id} 
                    className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                    onClick={() => handleAddProduct(product)}
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500">SKU: {product.sku} | {product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{(product.sellingPrice || product.price || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">per {product.unit || 'sqft'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
