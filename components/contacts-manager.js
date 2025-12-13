'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { 
  Search, Plus, Filter, MoreVertical, Edit, Trash2, Mail, Phone,
  Building2, MapPin, User, Users, Tag, Calendar, DollarSign,
  Download, Upload, RefreshCw, Eye, Send, MessageSquare, Star,
  UserPlus, Briefcase, ShoppingCart, ChevronRight, ExternalLink,
  X, Check, Loader2, FileText
} from 'lucide-react'
import { toast } from 'sonner'

// Contact type colors
const typeColors = {
  customer: 'bg-green-100 text-green-700 border-green-200',
  lead: 'bg-blue-100 text-blue-700 border-blue-200',
  vendor: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200'
}

const typeIcons = {
  customer: Users,
  lead: UserPlus,
  vendor: Briefcase,
  other: User
}

// Contact Avatar
const ContactAvatar = ({ name, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-xl'
  }
  
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600'
  ]
  
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  
  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold shadow-lg`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

// Stats Card
const StatsCard = ({ title, value, icon: Icon, color, onClick, active }) => (
  <Card 
    className={`cursor-pointer transition-all hover:shadow-md ${active ? 'ring-2 ring-primary' : ''}`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Contact Card
const ContactCard = ({ contact, onEdit, onDelete, onView }) => {
  const TypeIcon = typeIcons[contact.type] || User
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border bg-white hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        <ContactAvatar name={contact.name} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{contact.name}</h3>
            <Badge variant="outline" className={`text-xs ${typeColors[contact.type]}`}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {contact.type}
            </Badge>
          </div>
          
          {contact.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
              <Building2 className="h-3 w-3" />
              {contact.company}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary">
                <Mail className="h-3 w-3" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </a>
            )}
          </div>
          
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {contact.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{contact.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(contact)}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {contact.email && (
              <DropdownMenuItem onClick={() => window.location.href = `mailto:${contact.email}`}>
                <Mail className="h-4 w-4 mr-2" /> Send Email
              </DropdownMenuItem>
            )}
            {contact.phone && (
              <DropdownMenuItem onClick={() => window.location.href = `tel:${contact.phone}`}>
                <Phone className="h-4 w-4 mr-2" /> Call
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(contact.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

// Contact Form Dialog
const ContactFormDialog = ({ open, onOpenChange, contact, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    type: 'customer',
    tags: '',
    notes: '',
    source: 'manual'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id,
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        address: contact.address || '',
        type: contact.type || 'customer',
        tags: contact.tags?.join(', ') || '',
        notes: contact.notes || '',
        source: contact.source || 'manual'
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        type: 'customer',
        tags: '',
        notes: '',
        source: 'manual'
      })
    }
  }, [contact, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message || 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {contact ? 'Update contact information' : 'Add a new customer, lead, or vendor'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address"
            />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="VIP, Follow-up, New"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this contact..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {contact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Contact Detail Dialog
const ContactDetailDialog = ({ contact, open, onOpenChange, onEdit }) => {
  if (!contact) return null

  const TypeIcon = typeIcons[contact.type] || User

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <ContactAvatar name={contact.name} size="lg" />
            <div>
              <DialogTitle className="text-xl">{contact.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={typeColors[contact.type]}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {contact.type}
                </Badge>
                {contact.company && (
                  <span className="text-sm text-muted-foreground">{contact.company}</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {contact.email || 'Not provided'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {contact.phone || 'Not provided'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {contact.address || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <p className="font-medium capitalize">{contact.source || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Revenue</Label>
              <p className="font-medium text-green-600">₹{(contact.totalRevenue || 0).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Added On</Label>
              <p className="font-medium">
                {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="py-2">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {contact.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {contact.notes && (
          <div className="py-2">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <p className="mt-1 text-sm bg-slate-50 p-3 rounded-lg">{contact.notes}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => { onOpenChange(false); onEdit(contact); }}>
            <Edit className="h-4 w-4 mr-2" /> Edit Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Contacts Component
export function ContactsManager() {
  const [contacts, setContacts] = useState([])
  const [tags, setTags] = useState([])
  const [stats, setStats] = useState({ total: 0, customers: 0, leads: 0, vendors: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (typeFilter) params.append('type', typeFilter)
      if (tagFilter) params.append('tag', tagFilter)

      const res = await fetch(`/api/contacts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.contacts) {
        setContacts(data.contacts)
        setTags(data.tags || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, typeFilter, tagFilter])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleSave = async (data) => {
    const token = localStorage.getItem('token')
    const method = data.id ? 'PUT' : 'POST'
    
    const res = await fetch('/api/contacts', {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const result = await res.json()
    if (result.error) {
      throw new Error(result.error)
    }

    toast.success(data.id ? 'Contact updated' : 'Contact added')
    fetchContacts()
    setSelectedContact(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/contacts?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await res.json()
      if (result.error) {
        throw new Error(result.error)
      }

      toast.success('Contact deleted')
      fetchContacts()
    } catch (error) {
      toast.error(error.message || 'Failed to delete contact')
    }
  }

  const handleEdit = (contact) => {
    setSelectedContact(contact)
    setShowForm(true)
  }

  const handleView = (contact) => {
    setSelectedContact(contact)
    setShowDetail(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Contacts</h2>
          <p className="text-muted-foreground">Manage your customers, leads, and vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchContacts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => { setSelectedContact(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Contacts"
          value={stats.total}
          icon={Users}
          color="bg-slate-100 text-slate-600"
          onClick={() => setTypeFilter('')}
          active={!typeFilter}
        />
        <StatsCard
          title="Customers"
          value={stats.customers}
          icon={Users}
          color="bg-green-100 text-green-600"
          onClick={() => setTypeFilter('customer')}
          active={typeFilter === 'customer'}
        />
        <StatsCard
          title="Leads"
          value={stats.leads}
          icon={UserPlus}
          color="bg-blue-100 text-blue-600"
          onClick={() => setTypeFilter('lead')}
          active={typeFilter === 'lead'}
        />
        <StatsCard
          title="Vendors"
          value={stats.vendors}
          icon={Briefcase}
          color="bg-purple-100 text-purple-600"
          onClick={() => setTypeFilter('vendor')}
          active={typeFilter === 'vendor'}
        />
        <StatsCard
          title="Others"
          value={stats.others}
          icon={User}
          color="bg-orange-100 text-orange-600"
          onClick={() => setTypeFilter('other')}
          active={typeFilter === 'other'}
        />
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tags</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Contacts List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ) : contacts.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-muted-foreground">No contacts found</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first contact to get started</p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Contact
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <ContactFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        contact={selectedContact}
        onSave={handleSave}
      />

      {/* Detail Dialog */}
      <ContactDetailDialog
        contact={selectedContact}
        open={showDetail}
        onOpenChange={setShowDetail}
        onEdit={handleEdit}
      />
    </div>
  )
}
