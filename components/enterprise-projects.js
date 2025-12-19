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
  BarChart3, PieChart, User, Settings, Link2, ExternalLink,
  GanttChart, Copy, UserPlus, FileUp, Folder, FilePlus, UserCheck, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

const TEAM_ROLES = [
  { id: 'project_manager', label: 'Project Manager', color: 'bg-purple-100 text-purple-700' },
  { id: 'team_lead', label: 'Team Lead', color: 'bg-blue-100 text-blue-700' },
  { id: 'worker', label: 'Worker', color: 'bg-green-100 text-green-700' },
  { id: 'viewer', label: 'Viewer', color: 'bg-slate-100 text-slate-700' }
]

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

export function EnterpriseProjects({ authToken, onProjectSelect, onRefresh }) {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // View state
  const [viewMode, setViewMode] = useState('card') // card, table, kanban, timeline
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [activeMainTab, setActiveMainTab] = useState('projects') // projects, templates, reports
  
  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectDetail, setProjectDetail] = useState(null)
  
  // Phase 2 state
  const [templates, setTemplates] = useState([])
  const [reports, setReports] = useState(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('all')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  
  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    projectType: 'default',
    defaultBudget: '',
    estimatedDuration: 30
  })
  
  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: ''
  })
  
  // Team form
  const [teamForm, setTeamForm] = useState({
    userId: '',
    role: 'worker'
  })
  
  // Edit mode states for project detail
  const [editingBudget, setEditingBudget] = useState(false)
  const [editBudgetValue, setEditBudgetValue] = useState('')
  const [editingTimeline, setEditingTimeline] = useState(false)
  const [editTimelineValues, setEditTimelineValues] = useState({
    startDate: '',
    endDate: '',
    actualStartDate: '',
    actualEndDate: ''
  })
  const [savingField, setSavingField] = useState(null)
  
  // Milestone management state
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    phase: 'planning',
    dueDate: '',
    status: 'pending'
  })
  
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
    fetchTemplates()
    fetchUsers()
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

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/projects/templates', { headers })
      const data = await res.json()
      if (Array.isArray(data)) {
        setTemplates(data)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers })
      const data = await res.json()
      if (Array.isArray(data)) {
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchReports = async (type = 'overview') => {
    try {
      const res = await fetch(`/api/projects/reports?type=${type}`, { headers })
      const data = await res.json()
      setReports(data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      toast.error('Failed to load reports')
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
        ? { ...m, status: currentStatus === 'completed' ? 'pending' : 'completed', completedAt: currentStatus === 'completed' ? null : new Date().toISOString() }
        : m
    )

    await handleUpdateProject(projectId, { milestones: updatedMilestones })
  }

  // Milestone CRUD handlers
  const handleOpenAddMilestone = () => {
    setEditingMilestone(null)
    setMilestoneForm({
      name: '',
      description: '',
      phase: 'planning',
      dueDate: '',
      status: 'pending'
    })
    setShowMilestoneDialog(true)
  }

  const handleOpenEditMilestone = (milestone) => {
    setEditingMilestone(milestone)
    setMilestoneForm({
      name: milestone.name || '',
      description: milestone.description || '',
      phase: milestone.phase || 'planning',
      dueDate: milestone.dueDate ? milestone.dueDate.split('T')[0] : '',
      status: milestone.status || 'pending'
    })
    setShowMilestoneDialog(true)
  }

  const handleSaveMilestone = async () => {
    if (!milestoneForm.name.trim()) {
      toast.error('Milestone name is required')
      return
    }

    const projectId = projectDetail?.project?.id
    if (!projectId) return

    const currentMilestones = projectDetail.project.milestones || []
    
    let updatedMilestones
    if (editingMilestone) {
      // Update existing milestone
      updatedMilestones = currentMilestones.map(m => 
        m.id === editingMilestone.id 
          ? { 
              ...m, 
              ...milestoneForm,
              dueDate: milestoneForm.dueDate ? new Date(milestoneForm.dueDate).toISOString() : null,
              updatedAt: new Date().toISOString()
            }
          : m
      )
    } else {
      // Add new milestone
      const newMilestone = {
        id: `milestone-${Date.now()}`,
        ...milestoneForm,
        dueDate: milestoneForm.dueDate ? new Date(milestoneForm.dueDate).toISOString() : null,
        createdAt: new Date().toISOString(),
        completedAt: null
      }
      updatedMilestones = [...currentMilestones, newMilestone]
    }

    await handleUpdateProject(projectId, { milestones: updatedMilestones })
    setShowMilestoneDialog(false)
    setEditingMilestone(null)
    
    // Refresh project detail
    if (projectDetail) {
      setProjectDetail({
        ...projectDetail,
        project: { ...projectDetail.project, milestones: updatedMilestones }
      })
    }
  }

  const handleDeleteMilestone = async (milestoneId) => {
    const projectId = projectDetail?.project?.id
    if (!projectId) return

    if (!confirm('Are you sure you want to delete this milestone?')) return

    const currentMilestones = projectDetail.project.milestones || []
    const updatedMilestones = currentMilestones.filter(m => m.id !== milestoneId)

    await handleUpdateProject(projectId, { milestones: updatedMilestones })
    
    // Refresh project detail
    if (projectDetail) {
      setProjectDetail({
        ...projectDetail,
        project: { ...projectDetail.project, milestones: updatedMilestones }
      })
    }
    toast.success('Milestone deleted')
  }

  // Phase 2: Template handlers
  const handleLoadPreBuiltTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/projects/templates/seed', {
        method: 'POST',
        headers
      })
      const data = await res.json()
      
      if (data.count > 0) {
        toast.success(`Loaded ${data.count} professional templates!`)
        fetchTemplates()
      } else if (data.count === 0) {
        toast.info('All templates already loaded')
      } else {
        toast.error(data.error || 'Failed to load templates')
      }
    } catch (error) {
      console.error('Load templates error:', error)
      toast.error('Failed to load pre-built templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.name) {
      toast.error('Template name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/projects/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify(templateForm)
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Template created successfully')
        setShowTemplateDialog(false)
        setTemplateForm({ name: '', description: '', projectType: 'default', defaultBudget: '', estimatedDuration: 30 })
        fetchTemplates()
      } else {
        toast.error(data.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Create template error:', error)
      toast.error('Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateFromTemplate = async (templateId) => {
    setSaving(true)
    try {
      const res = await fetch('/api/projects/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create-from-template',
          templateId,
          projectData: formData
        })
      })
      const data = await res.json()
      
      if (data.id || data.projectNumber) {
        toast.success(`Project ${data.projectNumber} created from template`)
        setShowCreateDialog(false)
        resetForm()
        fetchProjects()
      } else {
        toast.error(data.error || 'Failed to create project from template')
      }
    } catch (error) {
      console.error('Create from template error:', error)
      toast.error('Failed to create project from template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) return

    try {
      const res = await fetch(`/api/projects/templates?id=${templateId}`, {
        method: 'DELETE',
        headers
      })
      const data = await res.json()
      
      if (data.message) {
        toast.success('Template deleted')
        fetchTemplates()
      } else {
        toast.error(data.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Delete template error:', error)
      toast.error('Failed to delete template')
    }
  }

  // Phase 2: Team handlers
  const handleAddTeamMember = async () => {
    if (!teamForm.userId || !projectDetail?.project?.id) {
      toast.error('Please select a team member')
      return
    }

    const selectedUser = users.find(u => u.id === teamForm.userId)
    
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectDetail.project.id}/team`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'add_member',
          userId: teamForm.userId,
          userName: selectedUser?.name || selectedUser?.email || teamForm.userId,
          userEmail: selectedUser?.email || '',
          role: teamForm.role
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Team member added')
        setShowTeamDialog(false)
        setTeamForm({ userId: '', role: 'worker' })
        fetchProjectDetail(projectDetail.project.id)
      } else {
        toast.error(data.error || 'Failed to add team member')
      }
    } catch (error) {
      console.error('Add team member error:', error)
      toast.error('Failed to add team member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTeamMember = async (memberId) => {
    if (!confirm('Remove this team member?')) return

    try {
      const res = await fetch(`/api/projects/${projectDetail.project.id}/team`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'remove_member',
          memberId
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Team member removed')
        fetchProjectDetail(projectDetail.project.id)
      } else {
        toast.error(data.error || 'Failed to remove team member')
      }
    } catch (error) {
      console.error('Remove team member error:', error)
      toast.error('Failed to remove team member')
    }
  }

  // Phase 2: Task handlers
  const handleAddTask = async () => {
    if (!taskForm.title || !projectDetail?.project?.id) {
      toast.error('Task title is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...taskForm,
          projectId: projectDetail.project.id,
          status: 'todo'
        })
      })
      const data = await res.json()
      
      if (data.id) {
        toast.success('Task added')
        setShowTaskDialog(false)
        setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' })
        fetchProjectDetail(projectDetail.project.id)
      } else {
        toast.error(data.error || 'Failed to add task')
      }
    } catch (error) {
      console.error('Add task error:', error)
      toast.error('Failed to add task')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed'
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      
      if (data.id) {
        fetchProjectDetail(projectDetail.project.id)
        // Notify parent to refresh dashboard data
        onRefresh?.()
      }
    } catch (error) {
      console.error('Toggle task error:', error)
    }
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
  const formatDateForInput = (date) => date ? new Date(date).toISOString().split('T')[0] : ''
  const getRoleInfo = (role) => TEAM_ROLES.find(r => r.id === role) || TEAM_ROLES[3]

  // Calculate dynamic progress from tasks and milestones
  const calculateDynamicProgress = (project, tasks) => {
    const taskWeight = 0.6 // 60% weight to tasks
    const milestoneWeight = 0.4 // 40% weight to milestones
    
    // Task progress
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    
    // Milestone progress
    const totalMilestones = project?.milestones?.length || 0
    const completedMilestones = project?.milestones?.filter(m => m.status === 'completed').length || 0
    const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
    
    // Combined progress (weighted average)
    let combinedProgress = 0
    if (totalTasks > 0 && totalMilestones > 0) {
      combinedProgress = (taskProgress * taskWeight) + (milestoneProgress * milestoneWeight)
    } else if (totalTasks > 0) {
      combinedProgress = taskProgress
    } else if (totalMilestones > 0) {
      combinedProgress = milestoneProgress
    }
    
    return {
      taskProgress: Math.round(taskProgress),
      milestoneProgress: Math.round(milestoneProgress),
      combinedProgress: Math.round(combinedProgress),
      totalTasks,
      completedTasks,
      totalMilestones,
      completedMilestones
    }
  }

  // Calculate timeline performance
  const calculateTimelinePerformance = (project) => {
    const now = new Date()
    const plannedStart = project?.startDate ? new Date(project.startDate) : null
    const plannedEnd = project?.endDate ? new Date(project.endDate) : null
    const actualStart = project?.actualStartDate ? new Date(project.actualStartDate) : null
    const actualEnd = project?.actualEndDate ? new Date(project.actualEndDate) : null
    
    // Calculate planned duration
    const plannedDuration = plannedStart && plannedEnd 
      ? Math.ceil((plannedEnd - plannedStart) / (1000 * 60 * 60 * 24)) 
      : 0
    
    // Calculate actual duration (if completed) or elapsed time
    let actualDuration = 0
    let isCompleted = project?.status === 'completed' || project?.status === 'closed'
    
    if (actualStart && actualEnd) {
      actualDuration = Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24))
    } else if (actualStart) {
      actualDuration = Math.ceil((now - actualStart) / (1000 * 60 * 60 * 24))
    }
    
    // Calculate start delay (positive = late start, negative = early start)
    const startDelay = actualStart && plannedStart 
      ? Math.ceil((actualStart - plannedStart) / (1000 * 60 * 60 * 24)) 
      : null
    
    // Calculate end variance (positive = late finish, negative = early finish)
    let endVariance = null
    if (isCompleted && actualEnd && plannedEnd) {
      endVariance = Math.ceil((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24))
    } else if (!isCompleted && plannedEnd) {
      // Days remaining or overdue
      endVariance = Math.ceil((now - plannedEnd) / (1000 * 60 * 60 * 24))
    }
    
    // Calculate schedule performance score (100 = on time, >100 = ahead, <100 = behind)
    let scheduleScore = 100
    if (plannedDuration > 0 && actualDuration > 0) {
      if (isCompleted) {
        scheduleScore = Math.round((plannedDuration / actualDuration) * 100)
      } else {
        // For ongoing projects, compare elapsed vs expected progress
        const expectedElapsed = plannedStart ? Math.ceil((now - plannedStart) / (1000 * 60 * 60 * 24)) : 0
        const progress = project?.progress || 0
        const expectedProgress = plannedDuration > 0 ? Math.min(100, (expectedElapsed / plannedDuration) * 100) : 0
        scheduleScore = expectedProgress > 0 ? Math.round((progress / expectedProgress) * 100) : 100
      }
    }
    
    return {
      plannedDuration,
      actualDuration,
      startDelay,
      endVariance,
      scheduleScore,
      isCompleted,
      daysRemaining: plannedEnd && !isCompleted ? Math.ceil((plannedEnd - now) / (1000 * 60 * 60 * 24)) : null,
      isOverdue: plannedEnd && !isCompleted && now > plannedEnd
    }
  }

  // Calculate team performance based on task completion
  const calculateTeamPerformance = (team, tasks) => {
    if (!team || team.length === 0) return []
    
    return team.map(member => {
      const memberTasks = tasks?.filter(t => t.assignedTo === member.userId) || []
      const completedTasks = memberTasks.filter(t => t.status === 'completed').length
      const overdueTasks = memberTasks.filter(t => 
        t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
      ).length
      
      const completionRate = memberTasks.length > 0 
        ? Math.round((completedTasks / memberTasks.length) * 100) 
        : 0
      
      return {
        ...member,
        totalTasks: memberTasks.length,
        completedTasks,
        overdueTasks,
        completionRate
      }
    })
  }

  // Save budget
  const handleSaveBudget = async () => {
    if (!projectDetail?.project?.id) return
    
    setSavingField('budget')
    try {
      await handleUpdateProject(projectDetail.project.id, { 
        budget: parseFloat(editBudgetValue) || 0 
      })
      setEditingBudget(false)
      toast.success('Budget updated successfully')
    } catch (error) {
      toast.error('Failed to update budget')
    } finally {
      setSavingField(null)
    }
  }

  // Save timeline
  const handleSaveTimeline = async () => {
    if (!projectDetail?.project?.id) return
    
    setSavingField('timeline')
    try {
      const updates = {}
      if (editTimelineValues.startDate) updates.startDate = editTimelineValues.startDate
      if (editTimelineValues.endDate) updates.endDate = editTimelineValues.endDate
      if (editTimelineValues.actualStartDate) updates.actualStartDate = editTimelineValues.actualStartDate
      if (editTimelineValues.actualEndDate) updates.actualEndDate = editTimelineValues.actualEndDate
      
      await handleUpdateProject(projectDetail.project.id, updates)
      setEditingTimeline(false)
      toast.success('Timeline updated successfully')
    } catch (error) {
      toast.error('Failed to update timeline')
    } finally {
      setSavingField(null)
    }
  }

  // Initialize edit values when opening edit mode
  const startEditingBudget = () => {
    setEditBudgetValue(projectDetail?.project?.budget?.toString() || '0')
    setEditingBudget(true)
  }

  const startEditingTimeline = () => {
    setEditTimelineValues({
      startDate: formatDateForInput(projectDetail?.project?.startDate),
      endDate: formatDateForInput(projectDetail?.project?.endDate),
      actualStartDate: formatDateForInput(projectDetail?.project?.actualStartDate),
      actualEndDate: formatDateForInput(projectDetail?.project?.actualEndDate)
    })
    setEditingTimeline(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Project Management</h2>
          <p className="text-slate-500">Enterprise-level project tracking & management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { fetchProjects(); fetchTemplates(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={(v) => { setActiveMainTab(v); if (v === 'reports') fetchReports(); }}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6 mt-6">
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
                              <Badge className={`${priorityInfo.color} text-xs`} variant="outline">
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
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Project Templates</h3>
              <p className="text-sm text-slate-500">Create projects quickly from saved templates</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLoadPreBuiltTemplates}>
                <Sparkles className="h-4 w-4 mr-2" /> Load 15 Pre-built Templates
              </Button>
              <Button onClick={() => setShowTemplateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Template
              </Button>
            </div>
          </div>

          {templates.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Copy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-slate-700 mb-2">No templates yet</h4>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Templates help you create projects faster with predefined milestones, tasks, and budgets.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleLoadPreBuiltTemplates} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                  <Sparkles className="h-4 w-4 mr-2" /> Load 15 Professional Templates
                </Button>
                <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Custom Template
                </Button>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge 
                  variant={selectedTemplateCategory === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSelectedTemplateCategory('all')}
                >
                  All ({templates.length})
                </Badge>
                {[...new Set(templates.map(t => t.category).filter(Boolean))].map(cat => (
                  <Badge 
                    key={cat}
                    variant={selectedTemplateCategory === cat ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setSelectedTemplateCategory(cat)}
                  >
                    {cat} ({templates.filter(t => t.category === cat).length})
                  </Badge>
                ))}
              </div>

              {/* Templates Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates
                  .filter(t => selectedTemplateCategory === 'all' || t.category === selectedTemplateCategory)
                  .map((template, idx) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <GlassCard className="p-5 hover:shadow-xl transition-all h-full flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${template.color}20` }}>
                            {template.icon || '📋'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 line-clamp-1">{template.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{template.category || getTypeLabel(template.projectType)}</Badge>
                              {template.isPreBuilt && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">Pro</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {!template.isPreBuilt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{template.description || 'No description'}</p>
                      
                      {/* Template Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-slate-800">{template.milestones?.length || 0}</p>
                          <p className="text-xs text-slate-500">Milestones</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-slate-800">{template.defaultTasks?.length || 0}</p>
                          <p className="text-xs text-slate-500">Tasks</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-slate-800">{template.estimatedDuration || 30}</p>
                          <p className="text-xs text-slate-500">Days</p>
                        </div>
                      </div>
                      
                      {/* Budget */}
                      <div className="flex items-center justify-between text-sm mb-4 p-2 bg-emerald-50 rounded-lg">
                        <span className="text-emerald-700 font-medium">Est. Budget</span>
                        <span className="font-bold text-emerald-700">₹{(template.defaultBudget || 0).toLocaleString()}</span>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        style={{ backgroundColor: template.color || '#6366f1' }}
                        onClick={() => {
                          resetForm()
                          setFormData({ ...formData, projectType: template.projectType })
                          handleCreateFromTemplate(template.id)
                        }}
                      >
                        <FilePlus className="h-4 w-4 mr-2" /> Use Template
                      </Button>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Project Reports & Analytics</h3>
              <p className="text-sm text-slate-500">Insights and analytics across all projects</p>
            </div>
            <Button variant="outline" onClick={() => fetchReports()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
            </Button>
          </div>

          {reports ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4">
                  <p className="text-sm text-slate-500">Active Projects</p>
                  <p className="text-3xl font-bold text-indigo-600">{reports.summary?.activeProjects || 0}</p>
                </GlassCard>
                <GlassCard className="p-4">
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="text-3xl font-bold text-emerald-600">{reports.summary?.completedProjects || 0}</p>
                </GlassCard>
                <GlassCard className="p-4">
                  <p className="text-sm text-slate-500">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{reports.summary?.overdueProjects || 0}</p>
                </GlassCard>
                <GlassCard className="p-4">
                  <p className="text-sm text-slate-500">Avg Progress</p>
                  <p className="text-3xl font-bold text-amber-600">{reports.avgProgress || 0}%</p>
                </GlassCard>
              </div>

              {/* Financial Summary */}
              <GlassCard className="p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" /> Financial Overview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Total Budget</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(reports.financial?.totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Spent</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(reports.financial?.totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Avg Budget/Project</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(reports.financial?.averageBudget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Budget Remaining</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency((reports.financial?.totalBudget || 0) - (reports.financial?.totalSpent || 0))}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Status Distribution */}
              <div className="grid md:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                  <h4 className="font-semibold mb-4">Projects by Status</h4>
                  <div className="space-y-3">
                    {PROJECT_STATUSES.map(status => {
                      const count = reports.byStatus?.[status.id] || 0
                      const total = reports.summary?.totalProjects || 1
                      const percent = Math.round((count / total) * 100)
                      return (
                        <div key={status.id} className="flex items-center gap-3">
                          <div className="w-24 text-sm">{status.label}</div>
                          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full ${status.color.replace('text-', 'bg-').replace('-700', '-500')}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="w-12 text-right text-sm font-medium">{count}</div>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <h4 className="font-semibold mb-4">Task Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                      <p className="text-3xl font-bold text-emerald-600">{reports.tasks?.completed || 0}</p>
                      <p className="text-sm text-slate-500">Completed</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-3xl font-bold text-amber-600">{reports.tasks?.inProgress || 0}</p>
                      <p className="text-sm text-slate-500">In Progress</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{reports.tasks?.pending || 0}</p>
                      <p className="text-sm text-slate-500">Pending</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-3xl font-bold text-red-600">{reports.tasks?.overdue || 0}</p>
                      <p className="text-sm text-slate-500">Overdue</p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Top Projects */}
              {reports.topProjectsByBudget && reports.topProjectsByBudget.length > 0 && (
                <GlassCard className="p-6">
                  <h4 className="font-semibold mb-4">Top Projects by Budget</h4>
                  <div className="space-y-3">
                    {reports.topProjectsByBudget.map((project, idx) => (
                      <div key={project.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-xs text-slate-400">{project.projectNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-600">{formatCurrency(project.budget)}</p>
                          <p className="text-xs text-slate-400">{project.progress}% complete</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks ({projectDetail.tasks?.length || 0})</TabsTrigger>
                  <TabsTrigger value="team">Team ({projectDetail.project?.team?.length || 0})</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {(() => {
                    const progressData = calculateDynamicProgress(projectDetail.project, projectDetail.tasks)
                    const timelinePerf = calculateTimelinePerformance(projectDetail.project)
                    const teamPerf = calculateTeamPerformance(projectDetail.project?.team, projectDetail.tasks)
                    
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Dynamic Progress Card */}
                          <GlassCard className="p-4">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4 text-indigo-600" /> Dynamic Progress
                              <Badge className={getStatusInfo(projectDetail.project.status).color}>
                                {getStatusInfo(projectDetail.project.status).label}
                              </Badge>
                            </h4>
                            <div className="space-y-4">
                              {/* Overall Progress */}
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm text-slate-600">Overall Progress</span>
                                  <span className="text-2xl font-bold text-indigo-600">{progressData.combinedProgress}%</span>
                                </div>
                                <Progress value={progressData.combinedProgress} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-purple-500" />
                              </div>
                              
                              {/* Task Progress Breakdown */}
                              <div className="bg-slate-50 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-blue-500" /> Tasks
                                  </span>
                                  <span className="text-sm font-bold text-blue-600">
                                    {progressData.completedTasks}/{progressData.totalTasks}
                                  </span>
                                </div>
                                <Progress value={progressData.taskProgress} className="h-2 [&>div]:bg-blue-500" />
                                <p className="text-xs text-slate-500 mt-1">{progressData.taskProgress}% complete</p>
                              </div>
                              
                              {/* Milestone Progress Breakdown */}
                              <div className="bg-slate-50 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <Milestone className="h-4 w-4 text-purple-500" /> Milestones
                                  </span>
                                  <span className="text-sm font-bold text-purple-600">
                                    {progressData.completedMilestones}/{progressData.totalMilestones}
                                  </span>
                                </div>
                                <Progress value={progressData.milestoneProgress} className="h-2 [&>div]:bg-purple-500" />
                                <p className="text-xs text-slate-500 mt-1">{progressData.milestoneProgress}% complete</p>
                              </div>
                            </div>
                          </GlassCard>

                          {/* Editable Budget Card */}
                          <GlassCard className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-600" /> Budget
                              </h4>
                              {!editingBudget ? (
                                <Button variant="ghost" size="sm" onClick={startEditingBudget}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setEditingBudget(false)}
                                    disabled={savingField === 'budget'}
                                  >
                                    <X className="h-4 w-4 text-slate-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleSaveBudget}
                                    disabled={savingField === 'budget'}
                                  >
                                    {savingField === 'budget' ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4 text-emerald-600" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs text-slate-500">Budget</p>
                                  {editingBudget ? (
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-lg">₹</span>
                                      <Input
                                        type="number"
                                        value={editBudgetValue}
                                        onChange={(e) => setEditBudgetValue(e.target.value)}
                                        className="w-32 h-8 text-lg font-bold"
                                        autoFocus
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(projectDetail.project.budget)}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Spent</p>
                                  <p className="text-lg font-medium text-slate-700">{formatCurrency(projectDetail.project.budgetMetrics?.spent || 0)}</p>
                                </div>
                              </div>
                              <Progress 
                                value={projectDetail.project.budgetMetrics?.percentUsed || 0} 
                                className={`h-2 ${(projectDetail.project.budgetMetrics?.percentUsed || 0) > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                              />
                              <div className="flex justify-between text-xs">
                                <span className={`${(projectDetail.project.budgetMetrics?.percentUsed || 0) > 100 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                                  {projectDetail.project.budgetMetrics?.percentUsed || 0}% used
                                </span>
                                <span className="text-emerald-600 font-medium">
                                  {formatCurrency(projectDetail.project.budgetMetrics?.remaining || projectDetail.project.budget || 0)} remaining
                                </span>
                              </div>
                            </div>
                          </GlassCard>
                        </div>

                        {/* Enhanced Timeline with Planned vs Actual */}
                        <GlassCard className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-blue-600" /> Timeline Performance
                            </h4>
                            {!editingTimeline ? (
                              <Button variant="ghost" size="sm" onClick={startEditingTimeline}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setEditingTimeline(false)}
                                  disabled={savingField === 'timeline'}
                                >
                                  <X className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={handleSaveTimeline}
                                  disabled={savingField === 'timeline'}
                                >
                                  {savingField === 'timeline' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Schedule Performance Score */}
                          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-2">
                              <Activity className="h-5 w-5 text-blue-600" />
                              <span className="font-medium">Schedule Performance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-bold ${
                                timelinePerf.scheduleScore >= 100 ? 'text-emerald-600' : 
                                timelinePerf.scheduleScore >= 80 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {timelinePerf.scheduleScore}%
                              </span>
                              {timelinePerf.scheduleScore >= 100 ? (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <ArrowUpRight className="h-3 w-3 mr-1" /> On Track
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">
                                  <ArrowDownRight className="h-3 w-3 mr-1" /> Behind
                                </Badge>
                              )}
                            </div>
                            {timelinePerf.isOverdue && (
                              <Badge className="bg-red-100 text-red-700 ml-auto">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                              </Badge>
                            )}
                            {timelinePerf.daysRemaining !== null && timelinePerf.daysRemaining > 0 && (
                              <Badge className="bg-blue-100 text-blue-700 ml-auto">
                                <Clock className="h-3 w-3 mr-1" /> {timelinePerf.daysRemaining} days left
                              </Badge>
                            )}
                          </div>

                          {/* Dates Comparison Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Planned Dates */}
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                <Target className="h-4 w-4" /> Planned
                              </h5>
                              <div className="space-y-2">
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <p className="text-xs text-slate-500">Start Date</p>
                                  {editingTimeline ? (
                                    <Input
                                      type="date"
                                      value={editTimelineValues.startDate}
                                      onChange={(e) => setEditTimelineValues({...editTimelineValues, startDate: e.target.value})}
                                      className="h-8 mt-1"
                                    />
                                  ) : (
                                    <p className="font-medium">{formatDate(projectDetail.project.startDate)}</p>
                                  )}
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <p className="text-xs text-slate-500">End Date</p>
                                  {editingTimeline ? (
                                    <Input
                                      type="date"
                                      value={editTimelineValues.endDate}
                                      onChange={(e) => setEditTimelineValues({...editTimelineValues, endDate: e.target.value})}
                                      className="h-8 mt-1"
                                    />
                                  ) : (
                                    <p className="font-medium">{formatDate(projectDetail.project.endDate)}</p>
                                  )}
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <p className="text-xs text-slate-500">Planned Duration</p>
                                  <p className="font-medium text-blue-600">{timelinePerf.plannedDuration} days</p>
                                </div>
                              </div>
                            </div>

                            {/* Actual Dates */}
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Actual
                              </h5>
                              <div className="space-y-2">
                                <div className={`rounded-lg p-3 ${
                                  timelinePerf.startDelay === null ? 'bg-slate-50' :
                                  timelinePerf.startDelay <= 0 ? 'bg-emerald-50' : 'bg-amber-50'
                                }`}>
                                  <p className="text-xs text-slate-500">Actual Start</p>
                                  {editingTimeline ? (
                                    <Input
                                      type="date"
                                      value={editTimelineValues.actualStartDate}
                                      onChange={(e) => setEditTimelineValues({...editTimelineValues, actualStartDate: e.target.value})}
                                      className="h-8 mt-1"
                                    />
                                  ) : (
                                    <>
                                      <p className="font-medium">{formatDate(projectDetail.project.actualStartDate)}</p>
                                      {timelinePerf.startDelay !== null && (
                                        <p className={`text-xs mt-1 ${timelinePerf.startDelay <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                          {timelinePerf.startDelay <= 0 
                                            ? `${Math.abs(timelinePerf.startDelay)} days early` 
                                            : `${timelinePerf.startDelay} days late`}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className={`rounded-lg p-3 ${
                                  !timelinePerf.isCompleted ? 'bg-slate-50' :
                                  timelinePerf.endVariance <= 0 ? 'bg-emerald-50' : 'bg-red-50'
                                }`}>
                                  <p className="text-xs text-slate-500">Actual End</p>
                                  {editingTimeline ? (
                                    <Input
                                      type="date"
                                      value={editTimelineValues.actualEndDate}
                                      onChange={(e) => setEditTimelineValues({...editTimelineValues, actualEndDate: e.target.value})}
                                      className="h-8 mt-1"
                                    />
                                  ) : (
                                    <>
                                      <p className="font-medium">{formatDate(projectDetail.project.actualEndDate)}</p>
                                      {timelinePerf.isCompleted && timelinePerf.endVariance !== null && (
                                        <p className={`text-xs mt-1 ${timelinePerf.endVariance <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {timelinePerf.endVariance <= 0 
                                            ? `${Math.abs(timelinePerf.endVariance)} days early` 
                                            : `${timelinePerf.endVariance} days late`}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className={`rounded-lg p-3 ${
                                  timelinePerf.isCompleted && timelinePerf.actualDuration <= timelinePerf.plannedDuration 
                                    ? 'bg-emerald-50' 
                                    : timelinePerf.actualDuration > timelinePerf.plannedDuration 
                                    ? 'bg-amber-50' 
                                    : 'bg-slate-50'
                                }`}>
                                  <p className="text-xs text-slate-500">Actual Duration</p>
                                  <p className={`font-medium ${
                                    timelinePerf.isCompleted && timelinePerf.actualDuration <= timelinePerf.plannedDuration 
                                      ? 'text-emerald-600' 
                                      : timelinePerf.actualDuration > timelinePerf.plannedDuration 
                                      ? 'text-amber-600' 
                                      : ''
                                  }`}>
                                    {timelinePerf.actualDuration} days {!timelinePerf.isCompleted && '(ongoing)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </GlassCard>

                        {/* Team Performance */}
                        {teamPerf.length > 0 && (
                          <GlassCard className="p-4">
                            <h4 className="font-medium mb-4 flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-600" /> Team Performance
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {teamPerf.map((member, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white text-sm">
                                        {(member.userName || member.userEmail || '?')[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{member.userName || member.userEmail}</p>
                                      <Badge className={`${getRoleInfo(member.role).color} text-xs`} variant="outline">
                                        {getRoleInfo(member.role).label}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Tasks: {member.completedTasks}/{member.totalTasks}</span>
                                      <span className={`font-medium ${
                                        member.completionRate >= 80 ? 'text-emerald-600' :
                                        member.completionRate >= 50 ? 'text-amber-600' : 'text-red-600'
                                      }`}>
                                        {member.completionRate}%
                                      </span>
                                    </div>
                                    <Progress 
                                      value={member.completionRate} 
                                      className={`h-1.5 ${
                                        member.completionRate >= 80 ? '[&>div]:bg-emerald-500' :
                                        member.completionRate >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                                      }`}
                                    />
                                    {member.overdueTasks > 0 && (
                                      <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> {member.overdueTasks} overdue
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </GlassCard>
                        )}

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

                        {/* Description */}
                        {projectDetail.project.description && (
                          <GlassCard className="p-4">
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-slate-600">{projectDetail.project.description}</p>
                          </GlassCard>
                        )}
                      </>
                    )
                  })()}
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
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Project Tasks
                        </h4>
                        {projectDetail.tasks?.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {projectDetail.tasks?.filter(t => t.status === 'completed').length} of {projectDetail.tasks?.length} completed
                          </p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => setShowTaskDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Task
                      </Button>
                    </div>
                    {projectDetail.tasks?.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No tasks linked to this project</p>
                        <p className="text-xs mt-1">Create tasks and link them to this project</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowTaskDialog(true)}>
                          <Plus className="h-4 w-4 mr-1" /> Add First Task
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projectDetail.tasks?.map(task => {
                          const priorityColors = {
                            urgent: 'bg-red-100 text-red-700 border-red-200',
                            high: 'bg-orange-100 text-orange-700 border-orange-200',
                            medium: 'bg-blue-100 text-blue-700 border-blue-200',
                            low: 'bg-slate-100 text-slate-600 border-slate-200'
                          }
                          const statusColors = {
                            todo: 'bg-slate-100 text-slate-700',
                            in_progress: 'bg-blue-100 text-blue-700',
                            review: 'bg-purple-100 text-purple-700',
                            completed: 'bg-emerald-100 text-emerald-700',
                            cancelled: 'bg-red-100 text-red-700'
                          }
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
                          
                          return (
                            <div 
                              key={task.id} 
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm ${
                                task.status === 'completed' ? 'bg-slate-50 opacity-70' : 'bg-white'
                              } ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}
                            >
                              <Checkbox 
                                checked={task.status === 'completed'} 
                                onCheckedChange={() => handleToggleTask(task.id, task.status)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium truncate ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                    {task.title}
                                  </p>
                                  {task.priority && task.priority !== 'medium' && (
                                    <Badge className={`${priorityColors[task.priority]} text-xs`} variant="outline">
                                      {task.priority}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  {task.dueDate && (
                                    <p className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                      <Calendar className="h-3 w-3" />
                                      {isOverdue ? 'Overdue: ' : ''}{formatDate(task.dueDate)}
                                    </p>
                                  )}
                                  {task.description && (
                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className={statusColors[task.status] || 'bg-slate-100 text-slate-700'}>
                                {task.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </GlassCard>
                </TabsContent>

                <TabsContent value="team" className="mt-4">
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" /> Project Team
                      </h4>
                      <Button size="sm" onClick={() => setShowTeamDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add Member
                      </Button>
                    </div>
                    {(!projectDetail.project.team || projectDetail.project.team.length === 0) ? (
                      <div className="text-center py-8 text-slate-400">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No team members assigned</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowTeamDialog(true)}>
                          <UserPlus className="h-4 w-4 mr-1" /> Add First Member
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projectDetail.project.team.map(member => (
                          <div key={member.id || member.userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-indigo-100 text-indigo-600">
                                  {(member.userName || 'U').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.userName}</p>
                                {member.userEmail && (
                                  <p className="text-xs text-slate-400">{member.userEmail}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getRoleInfo(member.role).color}>
                                {getRoleInfo(member.role).label}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTeamMember(member.id || member.userId)}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
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

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Project Template</DialogTitle>
            <DialogDescription>Save a template for quick project creation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g., Interior Design Standard"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Template description..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select value={templateForm.projectType} onValueChange={(v) => setTemplateForm({ ...templateForm, projectType: v })}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Budget (₹)</Label>
                <Input
                  type="number"
                  value={templateForm.defaultBudget}
                  onChange={(e) => setTemplateForm({ ...templateForm, defaultBudget: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Est. Duration (days)</Label>
                <Input
                  type="number"
                  value={templateForm.estimatedDuration}
                  onChange={(e) => setTemplateForm({ ...templateForm, estimatedDuration: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a user to this project team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={teamForm.userId} onValueChange={(v) => setTeamForm({ ...teamForm, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={teamForm.role} onValueChange={(v) => setTeamForm({ ...teamForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTeamMember} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Add a new task to this project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Task description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
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
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={taskForm.assignedTo} onValueChange={(v) => setTaskForm({ ...taskForm, assignedTo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnterpriseProjects
