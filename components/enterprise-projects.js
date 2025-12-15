'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus, Search, Filter, LayoutGrid, List, Columns3, Calendar,
  ChevronRight, ChevronDown, MoreHorizontal, Edit, Trash2, Eye,
  Clock, DollarSign, Users, CheckCircle2, AlertTriangle, Loader2,
  FolderKanban, Target, TrendingUp, ArrowUpRight, ArrowDownRight,
  CalendarDays, MapPin, Phone, Mail, Building2, FileText, Activity,
  Milestone, Flag, Play, Pause, Check, X, RefreshCw, Download,
  BarChart3, PieChart, User, Settings, Link2, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

const PROJECT_STATUSES = [
  { id: 'planning', label: 'Planning', color: 'bg-blue-100 text-blue-700', icon: Target },
  { id: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Play },
  { id: 'on_hold', label: 'On Hold', color: 'bg-orange-100 text-orange-700', icon: Pause },
  { id: 'review', label: 'Review', color: 'bg-purple-100 text-purple-700', icon: Eye },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { id: 'closed', label: 'Closed', color: 'bg-slate-100 text-slate-700', icon: Check }
]

const PROJECT_TYPES = [
  { id: 'interior_design', label: 'Interior Design' },
  { id: 'renovation', label: 'Renovation' },
  { id: 'new_construction', label: 'New Construction' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'default', label: 'General' }
]

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-600' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-600' }
]

const GlassCard = ({ children, className = '', ...props }) => (
  <div className={`backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl rounded-xl ${className}`} {...props}>
    {children}
  </div>
)

export function EnterpriseProjects({ authToken, onProjectSelect }) {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // View state
  const [viewMode, setViewMode] = useState('card') // card, table, kanban
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  
  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectDetail, setProjectDetail] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectType: 'default',
    priority: 'medium',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    siteAddress: '',
    budget: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  })

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }), [authToken])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects?includeStats=true', { headers })
      const data = await res.json()
      if (data.projects) {
        setProjects(data.projects)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectDetail = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}?includeTasks=true&includeExpenses=true`, { headers })
      const data = await res.json()
      if (data.project) {
        setProjectDetail(data)
        setShowDetailDialog(true)
      }
    } catch (error) {
      console.error('Failed to fetch project detail:', error)
      toast.error('Failed to load project details')
    }
  }

  const handleCreateProject = async () => {
    if (!formData.name) {
      toast.error('Project name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget) || 0
        })
      })
      const data = await res.json()
      
      if (data.id || data.projectNumber) {
        toast.success(`Project ${data.projectNumber} created successfully`)
        setShowCreateDialog(false)
        resetForm()
        fetchProjects()
      } else {
        toast.error(data.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Create project error:', error)
      toast.error('Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProject = async (projectId, updates) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Project updated')
        fetchProjects()
        if (showDetailDialog) {
          fetchProjectDetail(projectId)
        }
      } else {
        toast.error(data.error || 'Failed to update project')
      }
    } catch (error) {
      console.error('Update project error:', error)
      toast.error('Failed to update project')
    }
  }

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all related tasks.')) return

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('Project deleted')
        setShowDetailDialog(false)
        fetchProjects()
      } else {
        toast.error(data.error || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Delete project error:', error)
      toast.error('Failed to delete project')
    }
  }

  const handleMilestoneToggle = async (projectId, milestoneId, currentStatus) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const updatedMilestones = project.milestones.map(m => 
      m.id === milestoneId 
        ? { ...m, status: currentStatus === 'completed' ? 'pending' : 'completed' }
        : m
    )

    await handleUpdateProject(projectId, { milestones: updatedMilestones })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      projectType: 'default',
      priority: 'medium',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      siteAddress: '',
      budget: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    })
  }

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.projectNumber?.toLowerCase().includes(query) ||
        p.clientName?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(p => p.projectType === typeFilter)
    }
    
    result.sort((a, b) => {
      const aVal = a[sortBy] || ''
      const bVal = b[sortBy] || ''
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })
    
    return result
  }, [projects, searchQuery, statusFilter, typeFilter, sortBy, sortDir])

  // Group projects by status for kanban view
  const projectsByStatus = useMemo(() => {
    const grouped = {}
    PROJECT_STATUSES.forEach(status => {
      grouped[status.id] = filteredProjects.filter(p => p.status === status.id)
    })
    return grouped
  }, [filteredProjects])

  const getStatusInfo = (status) => PROJECT_STATUSES.find(s => s.id === status) || PROJECT_STATUSES[0]
  const getPriorityInfo = (priority) => PRIORITIES.find(p => p.id === priority) || PRIORITIES[1]
  const getTypeLabel = (type) => PROJECT_TYPES.find(t => t.id === type)?.label || 'General'

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString()}`
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '-'

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
          <p className="text-slate-500">Manage and track all your projects</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchProjects}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-indigo-500" />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.byStatus?.in_progress || 0}</p>
              </div>
              <Play className="h-8 w-8 text-amber-500" />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.byStatus?.completed || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Budget</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalBudget)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Spent</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filters & View Toggle */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {PROJECT_STATUSES.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PROJECT_TYPES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button 
              variant={viewMode === 'card' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('card')}
              className={viewMode === 'card' ? 'bg-white shadow-sm' : ''}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-white shadow-sm' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={viewMode === 'kanban' ? 'bg-white shadow-sm' : ''}
            >
              <Columns3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FolderKanban className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">
            {projects.length === 0 ? 'No projects yet. Create your first project!' : 'No projects match your filters.'}
          </p>
          {projects.length === 0 && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          )}
        </GlassCard>
      ) : (
        <>
          {/* Card View */}
          {viewMode === 'card' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project, idx) => {
                const statusInfo = getStatusInfo(project.status)
                const priorityInfo = getPriorityInfo(project.priority)
                const isOverdue = project.endDate && new Date(project.endDate) < new Date() && !['completed', 'closed'].includes(project.status)
                
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassCard 
                      className={`p-5 hover:shadow-xl transition-all cursor-pointer ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
                      onClick={() => fetchProjectDetail(project.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400 font-mono">{project.projectNumber}</span>
                            {project.sourceType === 'lead_conversion' && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                <Link2 className="h-3 w-3 mr-1" /> Lead
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-800 line-clamp-1">{project.name}</h3>
                        </div>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                      
                      {project.clientName && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                          <Building2 className="h-4 w-4" />
                          <span className="line-clamp-1">{project.clientName}</span>
                        </div>
                      )}
                      
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description || 'No description'}</p>
                      
                      {/* Progress */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-medium">{project.progress || 0}%</span>
                        </div>
                        <Progress value={project.progress || 0} className="h-2" />
                      </div>
                      
                      {/* Milestones Summary */}
                      {project.milestones && project.milestones.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                          <Milestone className="h-4 w-4" />
                          <span>
                            {project.milestones.filter(m => m.status === 'completed').length}/{project.milestones.length} milestones
                          </span>
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={priorityInfo.color} variant="outline">{priorityInfo.label}</Badge>
                          {isOverdue && <Badge className="bg-red-100 text-red-700">Overdue</Badge>}
                        </div>
                        <span className="font-bold text-emerald-600">{formatCurrency(project.budget)}</span>
                      </div>
                      
                      {/* Date info */}
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(project.startDate)}
                        </span>
                        {project.endDate && (
                          <span className={isOverdue ? 'text-red-500' : ''}>
                            Due: {formatDate(project.endDate)}
                          </span>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-600">Project</th>
                      <th className="text-left p-4 font-medium text-slate-600">Client</th>
                      <th className="text-left p-4 font-medium text-slate-600">Type</th>
                      <th className="text-center p-4 font-medium text-slate-600">Status</th>
                      <th className="text-center p-4 font-medium text-slate-600">Progress</th>
                      <th className="text-right p-4 font-medium text-slate-600">Budget</th>
                      <th className="text-center p-4 font-medium text-slate-600">Due Date</th>
                      <th className="text-center p-4 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map(project => {
                      const statusInfo = getStatusInfo(project.status)
                      const isOverdue = project.endDate && new Date(project.endDate) < new Date() && !['completed', 'closed'].includes(project.status)
                      
                      return (
                        <tr key={project.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => fetchProjectDetail(project.id)}>
                          <td className="p-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{project.name}</span>
                                {project.sourceType === 'lead_conversion' && (
                                  <Link2 className="h-3 w-3 text-indigo-500" />
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-mono">{project.projectNumber}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">{project.clientName || '-'}</td>
                          <td className="p-4">
                            <Badge variant="outline">{getTypeLabel(project.projectType)}</Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="w-24 mx-auto">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{project.progress || 0}%</span>
                              </div>
                              <Progress value={project.progress || 0} className="h-2" />
                            </div>
                          </td>
                          <td className="p-4 text-right font-medium text-emerald-600">{formatCurrency(project.budget)}</td>
                          <td className="p-4 text-center">
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}>
                              {formatDate(project.endDate)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); fetchProjectDetail(project.id); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PROJECT_STATUSES.map(status => (
                <div key={status.id} className="flex-shrink-0 w-80">
                  <GlassCard className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <status.icon className="h-4 w-4" />
                        <span className="font-medium">{status.label}</span>
                      </div>
                      <Badge variant="secondary">{projectsByStatus[status.id]?.length || 0}</Badge>
                    </div>
                    <div className="space-y-3 min-h-[400px]">
                      {projectsByStatus[status.id]?.map(project => {
                        const priorityInfo = getPriorityInfo(project.priority)
                        const isOverdue = project.endDate && new Date(project.endDate) < new Date() && !['completed', 'closed'].includes(project.status)
                        
                        return (
                          <motion.div
                            key={project.id}
                            className={`p-3 bg-white rounded-lg shadow-sm border hover:shadow-md cursor-pointer ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => fetchProjectDetail(project.id)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm line-clamp-1">{project.name}</p>
                                <p className="text-xs text-slate-400 font-mono">{project.projectNumber}</p>
                              </div>
                              <Badge className={priorityInfo.color} variant="outline" className="text-xs">
                                {project.priority}
                              </Badge>
                            </div>
                            {project.clientName && (
                              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {project.clientName}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <CalendarDays className="h-3 w-3" />
                                {formatDate(project.endDate)}
                              </div>
                              <span className="text-xs font-medium text-emerald-600">{formatCurrency(project.budget)}</span>
                            </div>
                            <Progress value={project.progress || 0} className="h-1 mt-2" />
                          </motion.div>
                        )
                      })}
                    </div>
                  </GlassCard>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Enter the project details below</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select value={formData.projectType} onValueChange={(v) => setFormData({ ...formData, projectType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator className="col-span-2" />
            
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Client or company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="client@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Phone</Label>
              <Input
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>Budget (₹)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Site Address</Label>
              <Input
                value={formData.siteAddress}
                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                placeholder="Project site address"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {projectDetail?.project && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {projectDetail.project.name}
                      {projectDetail.project.sourceType === 'lead_conversion' && (
                        <Badge variant="outline" className="ml-2">
                          <Link2 className="h-3 w-3 mr-1" /> From Lead
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="font-mono">{projectDetail.project.projectNumber}</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={projectDetail.project.status} 
                      onValueChange={(v) => handleUpdateProject(projectDetail.project.id, { status: v })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUSES.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteProject(projectDetail.project.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks ({projectDetail.tasks?.length || 0})</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Progress Card */}
                    <GlassCard className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Progress
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-2xl font-bold">{projectDetail.project.progress || 0}%</span>
                          <Badge className={getStatusInfo(projectDetail.project.status).color}>
                            {getStatusInfo(projectDetail.project.status).label}
                          </Badge>
                        </div>
                        <Progress value={projectDetail.project.progress || 0} className="h-3" />
                      </div>
                    </GlassCard>

                    {/* Budget Card */}
                    <GlassCard className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Budget
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs text-slate-500">Budget</p>
                            <p className="text-xl font-bold text-emerald-600">{formatCurrency(projectDetail.project.budget)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Spent</p>
                            <p className="text-lg font-medium text-slate-700">{formatCurrency(projectDetail.project.budgetMetrics?.spent || 0)}</p>
                          </div>
                        </div>
                        <Progress 
                          value={projectDetail.project.budgetMetrics?.percentUsed || 0} 
                          className={`h-2 ${(projectDetail.project.budgetMetrics?.percentUsed || 0) > 100 ? '[&>div]:bg-red-500' : ''}`}
                        />
                        <p className="text-xs text-slate-500">
                          {projectDetail.project.budgetMetrics?.percentUsed || 0}% used • {formatCurrency(projectDetail.project.budgetMetrics?.remaining || 0)} remaining
                        </p>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Client Info */}
                  <GlassCard className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Client Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Client Name</p>
                        <p className="font-medium">{projectDetail.project.clientName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="font-medium">{projectDetail.project.clientEmail || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="font-medium">{projectDetail.project.clientPhone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Site Address</p>
                        <p className="font-medium">{projectDetail.project.siteAddress || '-'}</p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Dates */}
                  <GlassCard className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" /> Timeline
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Start Date</p>
                        <p className="font-medium">{formatDate(projectDetail.project.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">End Date</p>
                        <p className="font-medium">{formatDate(projectDetail.project.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Actual Start</p>
                        <p className="font-medium">{formatDate(projectDetail.project.actualStartDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Actual End</p>
                        <p className="font-medium">{formatDate(projectDetail.project.actualEndDate)}</p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Description */}
                  {projectDetail.project.description && (
                    <GlassCard className="p-4">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-slate-600">{projectDetail.project.description}</p>
                    </GlassCard>
                  )}
                </TabsContent>

                <TabsContent value="milestones" className="mt-4">
                  <GlassCard className="p-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Milestone className="h-4 w-4" /> Project Milestones
                    </h4>
                    <div className="space-y-3">
                      {projectDetail.project.milestones?.map((milestone, idx) => (
                        <div 
                          key={milestone.id} 
                          className={`flex items-center gap-4 p-3 rounded-lg border ${
                            milestone.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-white'
                          }`}
                        >
                          <Checkbox
                            checked={milestone.status === 'completed'}
                            onCheckedChange={() => handleMilestoneToggle(projectDetail.project.id, milestone.id, milestone.status)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${milestone.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                {milestone.name}
                              </span>
                              <Badge variant="outline" className="text-xs">{milestone.phase}</Badge>
                            </div>
                            {milestone.completedAt && (
                              <p className="text-xs text-slate-400 mt-1">
                                Completed on {formatDate(milestone.completedAt)}
                              </p>
                            )}
                          </div>
                          <span className="text-slate-400 text-sm">#{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Project Tasks
                      </h4>
                    </div>
                    {projectDetail.tasks?.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No tasks linked to this project</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projectDetail.tasks?.map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Checkbox checked={task.status === 'completed'} />
                            <div className="flex-1">
                              <p className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                {task.title}
                              </p>
                              {task.dueDate && (
                                <p className="text-xs text-slate-400">Due: {formatDate(task.dueDate)}</p>
                              )}
                            </div>
                            <Badge variant="outline">{task.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <GlassCard className="p-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Activity Log
                    </h4>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {projectDetail.project.activityLog?.map((activity, idx) => (
                          <div key={activity.id || idx} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <Activity className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="flex-1 pb-4 border-b">
                              <p className="font-medium text-sm">{activity.description}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {activity.userName} • {new Date(activity.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </GlassCard>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseProjects
