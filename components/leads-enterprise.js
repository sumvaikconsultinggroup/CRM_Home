'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Upload, Download, Filter, Trash2, Users, Tag, Star, Phone, Calendar,
  Mail, FileText, Plus, X, Search, ChevronDown, Crown, Sparkles, TrendingUp
} from 'lucide-react'

// Draggable Lead Card
function LeadCard({ lead, onUpdate, onSelect, isSelected, isEnterprise, hasAdvancedFeatures }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lead.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const scoreColor = lead.score >= 70 ? 'text-green-600' : lead.score >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-move ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
      }`}
      whileHover={{ scale: 1.02 }}
      layout
    >
      <div className="flex items-start gap-3">
        {hasAdvancedFeatures && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(lead.id)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{lead.name}</p>
              <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
            </div>
            {isEnterprise && lead.score > 0 && (
              <div className={`flex items-center gap-1 ${scoreColor}`}>
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs font-bold">{lead.score}</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">{lead.source}</p>
          
          {lead.value > 0 && (
            <p className="text-sm font-bold text-primary mt-1">₹{lead.value?.toLocaleString()}</p>
          )}
          
          {isEnterprise && lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {lead.tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{lead.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
          
          {isEnterprise && lead.nextFollowUp && (
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
              <Calendar className="h-3 w-3" />
              <span>{new Date(lead.nextFollowUp).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// CSV Import Dialog
function CSVImportDialog({ open, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data = await response.json()
      
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(data.message)
        if (data.errors && data.errors.length > 0) {
          console.log('Import errors:', data.errors)
        }
        onImport()
        onClose()
      }
    } catch (error) {
      toast.error('Failed to import leads')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'name,email,phone,company,source,status,value,priority,notes,nextfollowup,assignedto,tags\nJohn Doe,john@example.com,1234567890,ABC Corp,website,new,50000,high,Sample lead,2024-12-20,user@example.com,vip;hot'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_template.csv'
    a.click()
    toast.success('Template downloaded')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads from CSV
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <p className="text-xs text-muted-foreground">
              Upload a CSV file with lead data. Required columns: name, email
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium mb-2">CSV Format:</p>
            <p className="text-xs text-muted-foreground mb-2">
              name, email, phone, company, source, status, value, priority, notes, nextfollowup, assignedto, tags
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3 w-3 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? 'Importing...' : 'Import Leads'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Advanced Filters (Professional & Enterprise)
function AdvancedFilters({ filters, onFilterChange, hasAdvancedFeatures }) {
  if (!hasAdvancedFeatures) return null

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-slate-50 p-4 rounded-lg border space-y-3"
    >
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Min Value</Label>
          <Input
            type="number"
            placeholder="₹0"
            value={filters.minValue || ''}
            onChange={(e) => onFilterChange({ ...filters, minValue: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Max Value</Label>
          <Input
            type="number"
            placeholder="₹1000000"
            value={filters.maxValue || ''}
            onChange={(e) => onFilterChange({ ...filters, maxValue: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Min Score</Label>
          <Input
            type="number"
            placeholder="0"
            value={filters.minScore || ''}
            onChange={(e) => onFilterChange({ ...filters, minScore: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={filters.priority || ''} onValueChange={(v) => onFilterChange({ ...filters, priority: v })}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  )
}

// Main Enterprise Leads Component
export function EnterpriseLeads({ leads, onUpdateLead, onRefresh, isEnterprise, isProfessional, client }) {
  const [selectedLeads, setSelectedLeads] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const sensors = useSensors(useSensor(PointerSensor))

  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

  // Professional or Enterprise features
  const hasAdvancedFeatures = isProfessional || isEnterprise
  
  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const leadId = active.id
    const newStatus = over.id

    try {
      await onUpdateLead(leadId, { status: newStatus })
      toast.success(`Lead moved to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update lead')
    }
  }

  const handleBulkAction = async (action, data = {}) => {
    if (selectedLeads.length === 0) {
      toast.error('No leads selected')
      return
    }

    try {
      const response = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          leadIds: selectedLeads,
          data
        })
      })

      const result = await response.json()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setSelectedLeads([])
        onRefresh()
      }
    } catch (error) {
      toast.error('Failed to perform bulk action')
    }
  }

  const filteredLeads = leads.filter(lead => {
    if (searchQuery && !lead.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !lead.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filters.minValue && lead.value < parseFloat(filters.minValue)) return false
    if (filters.maxValue && lead.value > parseFloat(filters.maxValue)) return false
    if (filters.minScore && (lead.score || 0) < parseFloat(filters.minScore)) return false
    if (filters.priority && filters.priority !== 'all' && lead.priority !== filters.priority) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAdvancedFeatures && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </>
          )}
          {!hasAdvancedFeatures && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              <Crown className="h-3 w-3 mr-1" />
              Upgrade to Professional for CSV Import
            </Badge>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <AdvancedFilters
            filters={filters}
            onFilterChange={setFilters}
            hasAdvancedFeatures={hasAdvancedFeatures}
          />
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      {hasAdvancedFeatures && selectedLeads.length > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between"
        >
          <span className="text-sm font-medium">
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('updateStatus', { status: 'qualified' })}>
              Mark Qualified
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedLeads([])}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        </motion.div>
      )}

      {/* Drag & Drop Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {statuses.map((status) => {
            const statusLeads = filteredLeads.filter(l => l.status === status)
            
            return (
              <div key={status} className="min-h-[400px]">
                <Card className="h-full">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full bg-${status === 'won' ? 'green' : status === 'lost' ? 'red' : 'blue'}-500`} />
                      <span className="font-medium capitalize text-sm">{status}</span>
                    </div>
                    <Badge variant="secondary">{statusLeads.length}</Badge>
                  </div>
                  
                  <SortableContext items={statusLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                      {statusLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onUpdate={onUpdateLead}
                          onSelect={(id) => {
                            setSelectedLeads(prev =>
                              prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                            )
                          }}
                          isSelected={selectedLeads.includes(lead.id)}
                          isEnterprise={isEnterprise}
                          hasAdvancedFeatures={hasAdvancedFeatures}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </Card>
              </div>
            )
          })}
        </div>
      </DndContext>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={onRefresh}
      />
    </div>
  )
}
