'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus, Search, Filter, Eye, Edit, Trash2, MapPin, Phone, Mail,
  Calendar, User, Building2, FolderKanban, FileText, Ruler,
  CheckCircle2, Clock, MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { BUILDING_TYPES } from './constants'

const API_BASE = '/api/modules/doors-windows'

const statusStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700'
}

export function ProjectsTab({ 
  projects, 
  surveys, 
  quotations, 
  selectedProject,
  setSelectedProject,
  onRefresh, 
  headers, 
  glassStyles 
}) {
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    siteName: '',
    siteAddress: '',
    buildingType: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    expectedValue: '',
    notes: '',
    status: 'active'
  })

  const resetForm = () => {
    setProjectForm({
      name: '',
      siteName: '',
      siteAddress: '',
      buildingType: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      expectedValue: '',
      notes: '',
      status: 'active'
    })
    setEditingProject(null)
  }

  const openEditProject = (project) => {
    setEditingProject(project)
    setProjectForm({
      name: project.name || '',
      siteName: project.siteName || '',
      siteAddress: project.siteAddress || '',
      buildingType: project.buildingType || '',
      contactPerson: project.contactPerson || '',
      contactPhone: project.contactPhone || '',
      contactEmail: project.contactEmail || '',
      expectedValue: project.expectedValue || '',
      notes: project.notes || '',
      status: project.status || 'active'
    })
    setShowNewProject(true)
  }

  const handleSaveProject = async () => {
    if (!projectForm.name && !projectForm.siteName) {
      toast.error('Please enter project name or site name')
      return
    }

    setSaving(true)
    try {
      const method = editingProject ? 'PUT' : 'POST'
      const body = { ...projectForm }
      if (editingProject) body.id = editingProject.id

      const res = await fetch(`${API_BASE}/projects`, {
        method,
        headers,
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingProject ? 'Project updated' : 'Project created')
        setShowNewProject(false)
        resetForm()
        onRefresh()
      } else {
        toast.error(data.error || 'Failed to save project')
      }
    } catch (error) {
      toast.error('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const res = await fetch(`${API_BASE}/projects?id=${projectId}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        toast.success('Project deleted')
        if (selectedProject?.id === projectId) setSelectedProject(null)
        onRefresh()
      } else {
        toast.error('Failed to delete project')
      }
    } catch (error) {
      toast.error('Failed to delete project')
    }
  }

  // Filter projects
  const filteredProjects = projects?.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    
    // Source filter
    let matchesSource = true
    if (sourceFilter === 'manual') {
      matchesSource = p.source === 'manual' || !p.source
    } else if (sourceFilter === 'crm-project') {
      matchesSource = p.syncedFrom?.type === 'project' || p.crmProjectId
    } else if (sourceFilter === 'crm-lead') {
      matchesSource = p.syncedFrom?.type === 'lead' && !p.crmProjectId
    }
    
    return matchesSearch && matchesStatus && matchesSource
  }) || []

  // Calculate counts for badges
  const projectCounts = {
    total: projects?.length || 0,
    manual: projects?.filter(p => p.source === 'manual' || !p.source).length || 0,
    fromProject: projects?.filter(p => p.syncedFrom?.type === 'project' || p.crmProjectId).length || 0,
    fromLead: projects?.filter(p => p.syncedFrom?.type === 'lead' && !p.crmProjectId).length || 0
  }

  // Get project stats
  const getProjectStats = (projectId) => {
    const projectSurveys = surveys?.filter(s => s.projectId === projectId) || []
    const projectQuotes = quotations?.filter(q => q.projectId === projectId) || []
    return {
      surveys: projectSurveys.length,
      quotes: projectQuotes.length,
      totalValue: projectQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
          <p className="text-slate-500">Manage your door & window projects</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowNewProject(true); }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>

      {/* Filters */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources ({projectCounts.total})</SelectItem>
                <SelectItem value="manual">Manual ({projectCounts.manual})</SelectItem>
                <SelectItem value="crm-project">From CRM Projects ({projectCounts.fromProject})</SelectItem>
                <SelectItem value="crm-lead">From CRM Leads ({projectCounts.fromLead})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className={glassStyles?.card}>
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Projects Yet</h3>
            <p className="text-slate-500 mb-4">Create your first project to start managing doors & windows</p>
            <Button onClick={() => { resetForm(); setShowNewProject(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => {
            const stats = getProjectStats(project.id)
            return (
              <Card 
                key={project.id} 
                className={`${glassStyles?.card} hover:shadow-xl transition-all cursor-pointer ${
                  selectedProject?.id === project.id ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {project.name || project.siteName}
                        </h3>
                        <Badge className={statusStyles[project.status] || 'bg-slate-100'}>
                          {project.status}
                        </Badge>
                        {/* Show source indicator */}
                        {project.syncedFrom?.type === 'lead' && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            From Lead
                          </Badge>
                        )}
                        {project.syncedFrom?.type === 'project' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            From CRM
                          </Badge>
                        )}
                        {project.source === 'manual' && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            Manual
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {project.buildingType || 'Not specified'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditProject(project); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {project.siteAddress && (
                    <p className="text-xs text-slate-500 flex items-start gap-1 mb-3">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{project.siteAddress}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-indigo-600">{stats.surveys}</p>
                      <p className="text-xs text-slate-500">Surveys</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-emerald-600">{stats.quotes}</p>
                      <p className="text-xs text-slate-500">Quotes</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-amber-600">₹{(stats.totalValue / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-slate-500">Value</p>
                    </div>
                  </div>

                  {project.contactPerson && (
                    <div className="pt-3 border-t flex items-center gap-2 text-sm text-slate-600">
                      <User className="h-4 w-4" />
                      <span>{project.contactPerson}</span>
                      {project.contactPhone && (
                        <span className="text-slate-400">• {project.contactPhone}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New/Edit Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={(open) => { if (!open) resetForm(); setShowNewProject(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update project details' : 'Add a new doors & windows project'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="e.g., Villa Project - Green Hills"
              />
            </div>
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input
                value={projectForm.siteName}
                onChange={(e) => setProjectForm({ ...projectForm, siteName: e.target.value })}
                placeholder="e.g., Green Hills Residence"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Site Address</Label>
              <Textarea
                value={projectForm.siteAddress}
                onChange={(e) => setProjectForm({ ...projectForm, siteAddress: e.target.value })}
                placeholder="Full site address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Building Type</Label>
              <Select 
                value={projectForm.buildingType} 
                onValueChange={(v) => setProjectForm({ ...projectForm, buildingType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BUILDING_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={projectForm.status} 
                onValueChange={(v) => setProjectForm({ ...projectForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={projectForm.contactPerson}
                onChange={(e) => setProjectForm({ ...projectForm, contactPerson: e.target.value })}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={projectForm.contactPhone}
                onChange={(e) => setProjectForm({ ...projectForm, contactPhone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={projectForm.contactEmail}
                onChange={(e) => setProjectForm({ ...projectForm, contactEmail: e.target.value })}
                placeholder="client@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Value (₹)</Label>
              <Input
                type="number"
                value={projectForm.expectedValue}
                onChange={(e) => setProjectForm({ ...projectForm, expectedValue: e.target.value })}
                placeholder="500000"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={projectForm.notes}
                onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })}
                placeholder="Additional notes about the project"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowNewProject(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={saving}>
              {saving ? 'Saving...' : (editingProject ? 'Update Project' : 'Create Project')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
