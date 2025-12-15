'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns'
import {
  Search, Plus, Filter, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, Clock, User, Users,
  Tag, Flag, AlertCircle, CheckCircle2, Circle, ArrowUp, ArrowDown, Minus,
  List, Table2, Kanban, RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
  X, Check, Loader2, FileText, MessageSquare, Paperclip, Link2, Eye, Copy,
  Play, Timer, FolderOpen, Layers, Bug, Lightbulb, Bookmark,
  Send, MoreHorizontal, ExternalLink, Download, Upload, Image, File, Trash,
  ListTodo, GitBranch, Activity, History, PlusCircle, UserPlus, AtSign,
  Maximize2, Link, Unlink, AlertTriangle, PlayCircle, PauseCircle, StopCircle,
  CalendarDays, ArrowUpDown, CheckSquare, Square, Zap, GripVertical, FileDown,
  ClipboardCopy, LayoutTemplate, TrendingUp, Target, BarChart3
} from 'lucide-react'

// =============================================
// CONSTANTS
// =============================================

const TASK_STATUSES = {
  backlog: { label: 'Backlog', color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Circle },
  todo: { label: 'To Do', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: ListTodo },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Play },
  review: { label: 'Review', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Eye },
  completed: { label: 'Done', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300', icon: X }
}

const TASK_PRIORITIES = {
  urgent: { label: 'Urgent', color: 'bg-red-500 text-white', iconColor: 'text-red-500', icon: AlertCircle },
  high: { label: 'High', color: 'bg-orange-500 text-white', iconColor: 'text-orange-500', icon: ArrowUp },
  medium: { label: 'Medium', color: 'bg-yellow-500 text-white', iconColor: 'text-yellow-500', icon: Minus },
  low: { label: 'Low', color: 'bg-green-500 text-white', iconColor: 'text-green-500', icon: ArrowDown }
}

const TASK_TYPES = {
  task: { label: 'Task', color: 'bg-blue-500', icon: CheckCircle2 },
  bug: { label: 'Bug', color: 'bg-red-500', icon: Bug },
  feature: { label: 'Feature', color: 'bg-green-500', icon: Lightbulb },
  story: { label: 'Story', color: 'bg-purple-500', icon: Bookmark },
  subtask: { label: 'Subtask', color: 'bg-cyan-500', icon: GitBranch }
}

const DEFAULT_LABELS = [
  { id: 'frontend', name: 'Frontend', color: '#3B82F6' },
  { id: 'backend', name: 'Backend', color: '#10B981' },
  { id: 'design', name: 'Design', color: '#8B5CF6' },
  { id: 'documentation', name: 'Documentation', color: '#F59E0B' },
  { id: 'testing', name: 'Testing', color: '#EF4444' },
  { id: 'urgent', name: 'Urgent', color: '#DC2626' },
  { id: 'blocked', name: 'Blocked', color: '#6B7280' }
]

// Task Templates for quick creation
const TASK_TEMPLATES = [
  {
    id: 'bug_report',
    name: 'Bug Report',
    icon: Bug,
    color: 'bg-red-500',
    defaults: {
      taskType: 'bug',
      priority: 'high',
      labels: ['testing'],
      description: '**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Screenshots/Videos:**'
    }
  },
  {
    id: 'feature_request',
    name: 'Feature Request',
    icon: Lightbulb,
    color: 'bg-green-500',
    defaults: {
      taskType: 'feature',
      priority: 'medium',
      labels: ['frontend'],
      description: '**Feature Description:**\n\n**User Story:**\nAs a [user], I want [feature] so that [benefit].\n\n**Acceptance Criteria:**\n- [ ] \n- [ ] '
    }
  },
  {
    id: 'design_task',
    name: 'Design Task',
    icon: Layers,
    color: 'bg-purple-500',
    defaults: {
      taskType: 'task',
      priority: 'medium',
      labels: ['design'],
      description: '**Design Requirements:**\n\n**Deliverables:**\n- [ ] \n\n**References:**'
    }
  },
  {
    id: 'documentation',
    name: 'Documentation',
    icon: FileText,
    color: 'bg-amber-500',
    defaults: {
      taskType: 'task',
      priority: 'low',
      labels: ['documentation'],
      description: '**Documentation Scope:**\n\n**Sections to Cover:**\n- [ ] \n- [ ] '
    }
  },
  {
    id: 'meeting_followup',
    name: 'Meeting Follow-up',
    icon: Users,
    color: 'bg-blue-500',
    defaults: {
      taskType: 'task',
      priority: 'medium',
      labels: [],
      description: '**Meeting Date:**\n\n**Attendees:**\n\n**Action Items:**\n- [ ] \n- [ ] \n\n**Decisions Made:**'
    }
  }
]

// =============================================
// UTILITY COMPONENTS
// =============================================

const TaskTypeIcon = ({ type, size = 'sm' }) => {
  const config = TASK_TYPES[type] || TASK_TYPES.task
  const Icon = config.icon
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <div className={`p-1 rounded ${config.color} text-white`}>
      <Icon className={sizeClass} />
    </div>
  )
}

const PriorityBadge = ({ priority }) => {
  const config = TASK_PRIORITIES[priority] || TASK_PRIORITIES.medium
  const Icon = config.icon
  return (
    <Badge className={`${config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

const StatusBadge = ({ status, onChange, editable = false }) => {
  const config = TASK_STATUSES[status] || TASK_STATUSES.todo
  const Icon = config.icon
  
  if (editable && onChange) {
    return (
      <Select value={status} onValueChange={onChange}>
        <SelectTrigger className={`h-8 w-auto min-w-[120px] ${config.color} border`}>
          <div className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">{config.label}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TASK_STATUSES).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <cfg.icon className="h-4 w-4" />
                {cfg.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  
  return (
    <Badge variant="outline" className={`${config.color} border gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

const UserAvatar = ({ user, size = 'sm', showName = false }) => {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div className="flex items-center gap-2">
      <Avatar className={sizeClass}>
        <AvatarImage src={user?.avatar} />
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      {showName && <span className="text-sm">{user?.name || user?.email}</span>}
    </div>
  )
}

const DueDateBadge = ({ date, showTime = false }) => {
  if (!date) return null
  const dueDate = new Date(date)
  const isOverdue = isPast(dueDate) && !isToday(dueDate)
  const isDueToday = isToday(dueDate)
  const isDueTomorrow = isTomorrow(dueDate)
  
  let colorClass = 'bg-slate-100 text-slate-600'
  if (isOverdue) colorClass = 'bg-red-100 text-red-700'
  else if (isDueToday) colorClass = 'bg-amber-100 text-amber-700'
  else if (isDueTomorrow) colorClass = 'bg-blue-100 text-blue-700'
  
  return (
    <Badge variant="outline" className={`${colorClass} border-0 gap-1 text-xs`}>
      <CalendarIcon className="h-3 w-3" />
      {isDueToday ? 'Today' : isDueTomorrow ? 'Tomorrow' : format(dueDate, showTime ? 'MMM d, h:mm a' : 'MMM d')}
    </Badge>
  )
}

const FileIcon = ({ mimeType, extension }) => {
  if (mimeType?.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
  return <File className="h-4 w-4 text-slate-500" />
}

// =============================================
// QUICK FILTER CHIPS
// =============================================

const QUICK_FILTERS = {
  my_tasks: { label: 'My Tasks', icon: User, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  due_today: { label: 'Due Today', icon: CalendarIcon, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  overdue: { label: 'Overdue', icon: AlertCircle, color: 'bg-red-100 text-red-700 border-red-300' },
  this_week: { label: 'This Week', icon: CalendarDays, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  high_priority: { label: 'High Priority', icon: Flag, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  unassigned: { label: 'Unassigned', icon: Users, color: 'bg-slate-100 text-slate-700 border-slate-300' }
}

// =============================================
// CALENDAR VIEW COMPONENT
// =============================================

const CalendarView = ({ tasks, onTaskClick, currentDate, onDateChange }) => {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  // Get start of calendar (may include days from previous month)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())
  
  // Get end of calendar (may include days from next month)
  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))
  
  // Generate all days in the calendar view
  const days = []
  let day = new Date(calendarStart)
  while (day <= calendarEnd) {
    days.push(new Date(day))
    day.setDate(day.getDate() + 1)
  }
  
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  
  const getTasksForDay = (date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return isSameDay(taskDate, date)
    })
  }
  
  const isCurrentMonth = (date) => date.getMonth() === currentDate.getMonth()
  
  const goToPrevMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onDateChange(newDate)
  }
  
  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onDateChange(newDate)
  }
  
  const goToToday = () => {
    onDateChange(new Date())
  }
  
  return (
    <Card className="overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold ml-2">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>
      
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground bg-slate-50">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="divide-y">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x min-h-[120px]">
            {week.map((date, dayIdx) => {
              const dayTasks = getTasksForDay(date)
              const isToday = isSameDay(date, new Date())
              const inMonth = isCurrentMonth(date)
              
              return (
                <div 
                  key={dayIdx} 
                  className={`p-1 ${inMonth ? 'bg-white' : 'bg-slate-50'} ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${inMonth ? 'text-foreground' : 'text-muted-foreground'} ${isToday ? 'text-blue-600' : ''}`}>
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto">
                    {dayTasks.slice(0, 3).map(task => {
                      const priorityConfig = TASK_PRIORITIES[task.priority] || TASK_PRIORITIES.medium
                      return (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={`text-xs p-1 rounded cursor-pointer truncate ${isPast(new Date(task.dueDate)) && !isToday ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityConfig.color.split(' ')[0]}`}></span>
                          {task.title}
                        </div>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Card>
  )
}

// =============================================
// TASK CARD COMPONENT (Draggable)
// =============================================

const TaskCard = ({ task, onClick, onDragStart, onDragEnd, isDragging }) => {
  const hasSubtasks = task.subtasks?.length > 0
  const completedSubtasks = task.subtaskDetails?.filter(st => st.status === 'completed').length || 0
  const checklistProgress = task.checklist?.length > 0 
    ? Math.round((task.checklist.filter(c => c.completed).length / task.checklist.length) * 100)
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.effectAllowed = 'move'
        if (onDragStart) onDragStart(task.id)
      }}
      onDragEnd={() => {
        if (onDragEnd) onDragEnd()
      }}
      className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="p-3">
        {/* Drag Handle + Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            <TaskTypeIcon type={task.taskType} />
            <span className="text-xs text-muted-foreground font-mono">{task.taskNumber}</span>
          </div>
          <div className="flex items-center gap-1">
            {task.priority && <PriorityBadge priority={task.priority} />}
          </div>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>

        {/* Labels */}
        {task.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.slice(0, 3).map((label, idx) => {
              const labelConfig = DEFAULT_LABELS.find(l => l.id === label) || { name: label, color: '#6B7280' }
              return (
                <span key={idx} className="px-1.5 py-0.5 rounded text-xs text-white" style={{ backgroundColor: labelConfig.color }}>
                  {labelConfig.name}
                </span>
              )
            })}
            {task.labels.length > 3 && <span className="text-xs text-muted-foreground">+{task.labels.length - 3}</span>}
          </div>
        )}

        {/* Progress */}
        {(hasSubtasks || checklistProgress !== null) && (
          <div className="mb-2 space-y-1">
            {hasSubtasks && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span>{completedSubtasks}/{task.subtasks.length} subtasks</span>
              </div>
            )}
            {checklistProgress !== null && (
              <div className="flex items-center gap-2">
                <Progress value={checklistProgress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">{checklistProgress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {task.dueDate && <DueDateBadge date={task.dueDate} />}
            {task.estimatedHours && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {task.loggedHours || 0}/{task.estimatedHours}h
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.attachments?.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" />{task.attachments.length}
              </span>
            )}
            {task.comments?.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />{task.comments.length}
              </span>
            )}
            {task.assigneeDetails?.length > 0 && (
              <div className="flex -space-x-1">
                {task.assigneeDetails.slice(0, 2).map((assignee, idx) => (
                  <UserAvatar key={idx} user={assignee} size="sm" />
                ))}
                {task.assigneeDetails.length > 2 && (
                  <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                    +{task.assigneeDetails.length - 2}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================
// KANBAN BOARD (with Drag & Drop)
// =============================================

const KanbanColumn = ({ status, tasks, onTaskClick, onQuickCreate, onDrop, draggingTaskId, onDragStart, onDragEnd }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const config = TASK_STATUSES[status]
  const Icon = config.icon
  const columnTasks = tasks.filter(t => t.status === status)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId && onDrop) {
      onDrop(taskId, status)
    }
  }

  return (
    <div 
      className={`flex-shrink-0 w-80 bg-slate-50 rounded-xl transition-all ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm">{config.label}</h3>
            <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onQuickCreate(status)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-340px)] p-3">
        <div className="space-y-2">
          {columnTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingTaskId === task.id}
            />
          ))}
          {columnTasks.length === 0 && (
            <div className={`text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-transparent'}`}>
              {isDragOver ? 'Drop here' : 'No tasks'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// =============================================
// TASK DETAIL MODAL - JIRA STYLE
// =============================================

const TaskDetailModal = ({ task, open, onClose, onUpdate, onDelete, users, projects, token }) => {
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(false)
  const [editingField, setEditingField] = useState(null)
  
  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assignees, setAssignees] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [labels, setLabels] = useState([])
  
  // Subtasks
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  
  // Checklist
  const [checklist, setChecklist] = useState([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  
  // Comments
  const [newComment, setNewComment] = useState('')
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  
  // Attachments
  const [attachments, setAttachments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef(null)
  
  // Time tracking
  const [timeEntries, setTimeEntries] = useState([])
  const [showLogTime, setShowLogTime] = useState(false)
  const [logHours, setLogHours] = useState('')
  const [logMinutes, setLogMinutes] = useState('')
  const [logDescription, setLogDescription] = useState('')
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token])

  // Extract task ID for stable dependencies
  const taskId = task?.id

  // Fetch functions with useCallback
  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return
    setLoadingSubtasks(true)
    try {
      const res = await fetch(`/api/tasks/subtasks?parentId=${taskId}`, { headers })
      const data = await res.json()
      if (data.subtasks) setSubtasks(data.subtasks)
    } catch (error) {
      console.error('Failed to fetch subtasks:', error)
    }
    setLoadingSubtasks(false)
  }, [taskId, headers])

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await fetch(`/api/tasks/attachments?taskId=${taskId}`, { headers })
      const data = await res.json()
      if (Array.isArray(data)) setAttachments(data)
    } catch (error) {
      console.error('Failed to fetch attachments:', error)
    }
  }, [taskId, headers])

  const fetchTimeEntries = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await fetch(`/api/tasks/time-entries?taskId=${taskId}`, { headers })
      const data = await res.json()
      if (data.timeEntries) setTimeEntries(data.timeEntries)
    } catch (error) {
      console.error('Failed to fetch time entries:', error)
    }
  }, [taskId, headers])

  // Initialize data - using separate effect for fetch calls
  useEffect(() => {
    if (task && open) {
      // Reset local state
      setTitle(task.title || '')
      setDescription(task.description || '')
      setStatus(task.status || 'todo')
      setPriority(task.priority || 'medium')
      setAssignees(task.assignees || [])
      setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '')
      setEstimatedHours(task.estimatedHours || '')
      setLabels(task.labels || [])
      setChecklist(task.checklist || [])
      setAttachments([])
      setSubtasks([])
      setTimeEntries([])
    }
  }, [task, open])

  // Separate effect for fetching data after initialization
  useEffect(() => {
    if (taskId && open) {
      fetchSubtasks()
      fetchAttachments()
      fetchTimeEntries()
    }
  }, [taskId, open, fetchSubtasks, fetchAttachments, fetchTimeEntries])

  // Handlers
  const handleUpdateField = async (field, value) => {
    setLoading(true)
    try {
      await onUpdate(task.id, { [field]: value })
      toast.success('Task updated')
      setEditingField(null)
    } catch (error) {
      toast.error('Failed to update')
    }
    setLoading(false)
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return
    setLoadingSubtasks(true)
    try {
      const res = await fetch('/api/tasks/subtasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parentId: task.id,
          title: newSubtaskTitle.trim()
        })
      })
      if (res.ok) {
        setNewSubtaskTitle('')
        fetchSubtasks()
        toast.success('Subtask created')
      }
    } catch (error) {
      toast.error('Failed to create subtask')
    }
    setLoadingSubtasks(false)
  }

  const handleToggleSubtask = async (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'todo' : 'completed'
    try {
      await fetch(`/api/tasks/${subtask.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
      fetchSubtasks()
    } catch (error) {
      toast.error('Failed to update subtask')
    }
  }

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return
    const newItem = { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }
    const updatedChecklist = [...checklist, newItem]
    setChecklist(updatedChecklist)
    setNewChecklistItem('')
    await handleUpdateField('checklist', updatedChecklist)
  }

  const handleToggleChecklistItem = async (index) => {
    const updatedChecklist = [...checklist]
    updatedChecklist[index] = { ...updatedChecklist[index], completed: !updatedChecklist[index].completed }
    setChecklist(updatedChecklist)
    
    const completedCount = updatedChecklist.filter(c => c.completed).length
    const progress = Math.round((completedCount / updatedChecklist.length) * 100)
    
    await onUpdate(task.id, { action: 'update_checklist', checklist: updatedChecklist, progress })
  }

  const handleDeleteChecklistItem = async (index) => {
    const updatedChecklist = checklist.filter((_, i) => i !== index)
    setChecklist(updatedChecklist)
    await handleUpdateField('checklist', updatedChecklist)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setLoading(true)
    try {
      await onUpdate(task.id, { action: 'add_comment', content: newComment.trim() })
      setNewComment('')
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
    setLoading(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('taskId', task.id)
      
      const res = await fetch('/api/tasks/attachments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      
      if (res.ok) {
        fetchAttachments()
        toast.success('File uploaded')
      } else {
        toast.error('Upload failed')
      }
    } catch (error) {
      toast.error('Upload failed')
    }
    setUploadingFile(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const res = await fetch(`/api/tasks/attachments?id=${attachmentId}`, {
        method: 'DELETE',
        headers
      })
      if (res.ok) {
        fetchAttachments()
        toast.success('Attachment removed')
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleLogTime = async () => {
    const hours = parseInt(logHours) || 0
    const minutes = parseInt(logMinutes) || 0
    if (hours === 0 && minutes === 0) {
      toast.error('Enter time to log')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/tasks/time-entries', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId: task.id,
          hours,
          minutes,
          description: logDescription,
          date: logDate
        })
      })
      
      if (res.ok) {
        fetchTimeEntries()
        setLogHours('')
        setLogMinutes('')
        setLogDescription('')
        setShowLogTime(false)
        toast.success('Time logged')
      }
    } catch (error) {
      toast.error('Failed to log time')
    }
    setLoading(false)
  }

  const handleDeleteTimeEntry = async (entryId) => {
    try {
      await fetch(`/api/tasks/time-entries?id=${entryId}`, { method: 'DELETE', headers })
      fetchTimeEntries()
      toast.success('Time entry deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleMentionInsert = (user) => {
    setNewComment(prev => prev.replace(/@\w*$/, `@${user.name || user.email} `))
    setShowMentions(false)
    setMentionSearch('')
  }

  const checkForMention = (text) => {
    const match = text.match(/@(\w*)$/)
    if (match) {
      setMentionSearch(match[1])
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const filteredMentionUsers = users?.filter(u => 
    (u.name?.toLowerCase().includes(mentionSearch.toLowerCase()) || 
     u.email?.toLowerCase().includes(mentionSearch.toLowerCase()))
  ).slice(0, 5) || []

  if (!task) return null

  const completedChecklist = checklist.filter(c => c.completed).length
  const checklistProgress = checklist.length > 0 ? Math.round((completedChecklist / checklist.length) * 100) : 0
  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0
  const totalLoggedTime = timeEntries.reduce((acc, e) => acc + (e.hours * 60) + e.minutes, 0)
  const loggedHours = Math.floor(totalLoggedTime / 60)
  const loggedMinutes = totalLoggedTime % 60

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TaskTypeIcon type={task.taskType} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-mono">{task.taskNumber}</span>
                  {task.parentId && (
                    <Badge variant="outline" className="text-xs">
                      <GitBranch className="h-3 w-3 mr-1" />
                      Subtask
                    </Badge>
                  )}
                </div>
                {editingField === 'title' ? (
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => handleUpdateField('title', title)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateField('title', title)}
                    className="text-xl font-bold mt-1"
                    autoFocus
                  />
                ) : (
                  <h2 
                    className="text-xl font-bold cursor-pointer hover:text-blue-600"
                    onClick={() => setEditingField('title')}
                  >
                    {task.title}
                  </h2>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} onChange={(v) => { setStatus(v); handleUpdateField('status', v); }} editable />
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(95vh-120px)]">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="px-6 pt-4 border-b">
                <TabsList>
                  <TabsTrigger value="details" className="gap-2">
                    <FileText className="h-4 w-4" />Details
                  </TabsTrigger>
                  <TabsTrigger value="subtasks" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Subtasks {subtasks.length > 0 && `(${subtasks.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments {task.comments?.length > 0 && `(${task.comments.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="gap-2">
                    <Paperclip className="h-4 w-4" />
                    Files {attachments.length > 0 && `(${attachments.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-2">
                    <Activity className="h-4 w-4" />Activity
                  </TabsTrigger>
                  <TabsTrigger value="time" className="gap-2">
                    <Clock className="h-4 w-4" />Time Log
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* Description */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Description</Label>
                    {editingField === 'description' ? (
                      <div className="space-y-2">
                        <Textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                          placeholder="Add a description..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateField('description', description)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="min-h-[80px] p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEditingField('description')}
                      >
                        {task.description || <span className="text-muted-foreground">Click to add description...</span>}
                      </div>
                    )}
                  </div>

                  {/* Checklist */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Checklist
                        {checklist.length > 0 && (
                          <span className="text-muted-foreground">({completedChecklist}/{checklist.length})</span>
                        )}
                      </Label>
                    </div>
                    {checklist.length > 0 && (
                      <Progress value={checklistProgress} className="h-2 mb-3" />
                    )}
                    <div className="space-y-2">
                      {checklist.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center gap-2 group">
                          <Checkbox 
                            checked={item.completed}
                            onCheckedChange={() => handleToggleChecklistItem(idx)}
                          />
                          <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteChecklistItem(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Add checklist item..."
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleAddChecklistItem}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Labels</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_LABELS.map((label) => (
                        <Badge 
                          key={label.id}
                          variant={labels.includes(label.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          style={labels.includes(label.id) ? { backgroundColor: label.color } : {}}
                          onClick={() => {
                            const newLabels = labels.includes(label.id)
                              ? labels.filter(l => l !== label.id)
                              : [...labels, label.id]
                            setLabels(newLabels)
                            handleUpdateField('labels', newLabels)
                          }}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Subtasks Tab */}
                <TabsContent value="subtasks" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {subtasks.length > 0 && (
                        <div className="flex items-center gap-3">
                          <Progress value={subtaskProgress} className="w-32 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {completedSubtasks}/{subtasks.length} done
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {loadingSubtasks ? (
                      <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                    ) : (
                      subtasks.map((subtask) => (
                        <div 
                          key={subtask.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 group"
                        >
                          <Checkbox 
                            checked={subtask.status === 'completed'}
                            onCheckedChange={() => handleToggleSubtask(subtask)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">{subtask.taskNumber}</span>
                              <span className={subtask.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                {subtask.title}
                              </span>
                            </div>
                          </div>
                          <PriorityBadge priority={subtask.priority} />
                          {subtask.assigneeDetails?.length > 0 && (
                            <div className="flex -space-x-1">
                              {subtask.assigneeDetails.slice(0, 2).map((u, i) => (
                                <UserAvatar key={i} user={u} size="sm" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add subtask..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    />
                    <Button onClick={handleAddSubtask} disabled={loadingSubtasks}>
                      <Plus className="h-4 w-4 mr-1" />Add
                    </Button>
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-0 space-y-4">
                  <div className="relative">
                    <Textarea 
                      placeholder="Write a comment... Use @ to mention someone"
                      value={newComment}
                      onChange={(e) => {
                        setNewComment(e.target.value)
                        checkForMention(e.target.value)
                      }}
                      rows={3}
                    />
                    {showMentions && filteredMentionUsers.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-lg shadow-lg w-64 max-h-40 overflow-y-auto z-50">
                        {filteredMentionUsers.map((user) => (
                          <div 
                            key={user.id}
                            className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer"
                            onClick={() => handleMentionInsert(user)}
                          >
                            <UserAvatar user={user} size="sm" />
                            <span className="text-sm">{user.name || user.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between mt-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />Attach
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <AtSign className="h-3 w-3 mr-1" />Mention
                        </Button>
                      </div>
                      <Button onClick={handleAddComment} disabled={loading || !newComment.trim()}>
                        <Send className="h-4 w-4 mr-1" />Send
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    {(task.comments || []).slice().reverse().map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar user={comment.userDetails || { name: comment.userName }} size="md" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.userDetails?.name || comment.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                            {comment.edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {(!task.comments || task.comments.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">No comments yet</p>
                    )}
                  </div>
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="mt-0 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Attachments ({attachments.length})</h3>
                    <div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                      <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                        {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                        Upload File
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {attachments.filter(a => !a.deleted).map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group">
                        {attachment.hasPreview && attachment.mimeType?.startsWith('image/') ? (
                          <img 
                            src={attachment.url} 
                            alt={attachment.originalName}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-slate-200 rounded flex items-center justify-center">
                            <FileIcon mimeType={attachment.mimeType} extension={attachment.extension} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.size / 1024).toFixed(1)} KB • v{attachment.version}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={attachment.url} download={attachment.originalName}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {attachments.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No attachments yet</p>
                      <Button variant="link" onClick={() => fileInputRef.current?.click()}>
                        Upload a file
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0">
                  <div className="space-y-4">
                    {(task.activityLog || []).slice().reverse().map((activity, idx) => (
                      <div key={activity.id || idx} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <History className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Time Log Tab */}
                <TabsContent value="time" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Time Tracking</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-muted-foreground">
                          Logged: <strong>{loggedHours}h {loggedMinutes}m</strong>
                        </span>
                        {task.estimatedHours && (
                          <span className="text-sm text-muted-foreground">
                            Estimated: <strong>{task.estimatedHours}h</strong>
                          </span>
                        )}
                      </div>
                      {task.estimatedHours && (
                        <Progress 
                          value={Math.min(100, (totalLoggedTime / (task.estimatedHours * 60)) * 100)} 
                          className="h-2 w-48 mt-2"
                        />
                      )}
                    </div>
                    <Button onClick={() => setShowLogTime(true)}>
                      <Timer className="h-4 w-4 mr-1" />Log Time
                    </Button>
                  </div>

                  {showLogTime && (
                    <Card className="p-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Hours</Label>
                          <Input 
                            type="number" 
                            min="0" 
                            value={logHours}
                            onChange={(e) => setLogHours(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Minutes</Label>
                          <Input 
                            type="number" 
                            min="0" 
                            max="59"
                            value={logMinutes}
                            onChange={(e) => setLogMinutes(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Date</Label>
                          <Input 
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button onClick={handleLogTime} disabled={loading}>Save</Button>
                          <Button variant="outline" onClick={() => setShowLogTime(false)}>Cancel</Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Description (optional)</Label>
                        <Input 
                          value={logDescription}
                          onChange={(e) => setLogDescription(e.target.value)}
                          placeholder="What did you work on?"
                        />
                      </div>
                    </Card>
                  )}

                  <div className="space-y-2">
                    {timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group">
                        <UserAvatar user={entry.userDetails || { name: entry.userName }} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{entry.hours}h {entry.minutes}m</span>
                            <span className="text-xs text-muted-foreground">
                              on {format(new Date(entry.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground">{entry.description}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500"
                          onClick={() => handleDeleteTimeEntry(entry.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {timeEntries.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No time logged yet</p>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Sidebar - Details Panel */}
          <div className="w-72 border-l bg-slate-50 p-4 overflow-y-auto">
            <h4 className="font-medium text-sm mb-4">Details</h4>
            
            <div className="space-y-4">
              {/* Assignees */}
              <div>
                <Label className="text-xs text-muted-foreground">Assignees</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-1 h-auto py-2">
                      {assignees.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignees.map((userId) => {
                            const user = users?.find(u => u.id === userId)
                            return <UserAvatar key={userId} user={user} size="sm" />
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    {users?.map((user) => (
                      <div 
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${assignees.includes(user.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          const newAssignees = assignees.includes(user.id)
                            ? assignees.filter(id => id !== user.id)
                            : [...assignees, user.id]
                          setAssignees(newAssignees)
                          handleUpdateField('assignees', newAssignees)
                        }}
                      >
                        <Checkbox checked={assignees.includes(user.id)} />
                        <UserAvatar user={user} size="sm" showName />
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reporter */}
              <div>
                <Label className="text-xs text-muted-foreground">Reporter</Label>
                <div className="mt-1">
                  <UserAvatar user={task.reporterDetails || task.createdByDetails} size="sm" showName />
                </div>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={priority} onValueChange={(v) => { setPriority(v); handleUpdateField('priority', v); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.iconColor}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <Input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); handleUpdateField('dueDate', e.target.value); }}
                  className="mt-1"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
                <Input 
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => { setEstimatedHours(e.target.value); handleUpdateField('estimatedHours', parseFloat(e.target.value) || null); }}
                  className="mt-1"
                  placeholder="0"
                />
              </div>

              {/* Project */}
              {task.projectDetails && (
                <div>
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <div className="mt-1 flex items-center gap-2 p-2 bg-white rounded border">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.projectDetails.name}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</p>
                <p>Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</p>
              </div>

              {/* Actions */}
              <Separator />
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-red-600" onClick={() => onDelete(task.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// MAIN COMPONENT
// =============================================

export function JiraTaskManager({ token, currentUser }) {
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // View & Filters
  const [viewMode, setViewMode] = useState('kanban') // kanban, list, calendar
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [priorityFilter, setPriorityFilter] = useState([])
  const [assigneeFilter, setAssigneeFilter] = useState([])
  const [projectFilter, setProjectFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState(null) // my_tasks, due_today, overdue, this_week, high_priority, unassigned
  const [calendarDate, setCalendarDate] = useState(new Date())

  // Selection for bulk actions
  const [selectedTasks, setSelectedTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState('desc')

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [quickCreateStatus, setQuickCreateStatus] = useState(null)
  const [bulkActionOpen, setBulkActionOpen] = useState(false)

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token])

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.append('includeStats', 'true')
      if (statusFilter.length > 0) params.append('status', statusFilter.join(','))
      if (priorityFilter.length > 0) params.append('priority', priorityFilter.join(','))
      if (searchQuery) params.append('search', searchQuery)
      if (projectFilter) params.append('projectId', projectFilter)
      if (assigneeFilter.length > 0) params.append('assigneeId', assigneeFilter[0])

      const res = await fetch(`/api/tasks?${params.toString()}`, { headers })
      const data = await res.json()
      
      if (data.tasks) {
        setTasks(data.tasks.filter(t => !t.parentId)) // Exclude subtasks from main view
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }, [headers, statusFilter, priorityFilter, searchQuery, projectFilter, assigneeFilter])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers })
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
      else if (data.users) setUsers(data.users)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }, [headers])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers })
      const data = await res.json()
      if (data.projects) setProjects(data.projects)
      else if (Array.isArray(data)) setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }, [headers])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchUsers(), fetchProjects()])
      setLoading(false)
    }
    if (token) loadData()
  }, [token, fetchTasks, fetchUsers, fetchProjects, refreshKey])

  const handleCreateTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData)
      })
      if (res.ok) {
        toast.success('Task created')
        setCreateDialogOpen(false)
        setQuickCreateStatus(null)
        setRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...data } : t))
        if (selectedTask?.id === taskId) {
          const detailRes = await fetch(`/api/tasks/${taskId}?includeSubtasks=true`, { headers })
          const detailData = await detailRes.json()
          setSelectedTask(detailData)
        }
        return data
      }
    } catch (error) {
      throw error
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE', headers })
      if (res.ok) {
        toast.success('Task deleted')
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setDetailOpen(false)
        setSelectedTask(null)
      }
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleTaskClick = async (task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}?includeSubtasks=true`, { headers })
      const data = await res.json()
      setSelectedTask(data)
      setDetailOpen(true)
    } catch (error) {
      toast.error('Failed to load task details')
    }
  }

  const handleQuickCreate = (status) => {
    setQuickCreateStatus(status)
    setCreateDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter([])
    setPriorityFilter([])
    setAssigneeFilter([])
    setProjectFilter('')
    setQuickFilter(null)
  }

  const hasActiveFilters = searchQuery || statusFilter.length || priorityFilter.length || assigneeFilter.length || projectFilter || quickFilter

  // Handle quick filter change
  const handleQuickFilterChange = (filter) => {
    if (quickFilter === filter) {
      setQuickFilter(null)
    } else {
      setQuickFilter(filter)
      // Clear other filters when using quick filters
      setStatusFilter([])
      setPriorityFilter([])
      setAssigneeFilter([])
    }
  }

  // Filter tasks based on quick filter
  const getFilteredTasks = useMemo(() => {
    let filtered = [...tasks]
    
    // Apply quick filters
    if (quickFilter) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      switch (quickFilter) {
        case 'my_tasks':
          filtered = filtered.filter(t => t.assignees?.includes(currentUser?.id))
          break
        case 'due_today':
          filtered = filtered.filter(t => t.dueDate && isToday(new Date(t.dueDate)))
          break
        case 'overdue':
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false
            const dueDate = new Date(t.dueDate)
            return isPast(dueDate) && !isToday(dueDate) && t.status !== 'completed'
          })
          break
        case 'this_week':
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false
            const dueDate = new Date(t.dueDate)
            return dueDate >= today && dueDate <= weekEnd
          })
          break
        case 'high_priority':
          filtered = filtered.filter(t => t.priority === 'urgent' || t.priority === 'high')
          break
        case 'unassigned':
          filtered = filtered.filter(t => !t.assignees || t.assignees.length === 0)
          break
      }
    }
    
    // Sort tasks
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (sortField === 'dueDate' || sortField === 'createdAt' || sortField === 'updatedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }
      
      if (sortField === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        aVal = priorityOrder[aVal] || 0
        bVal = priorityOrder[bVal] || 0
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })
    
    return filtered
  }, [tasks, quickFilter, currentUser, sortField, sortDirection])

  // Bulk actions
  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === getFilteredTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(getFilteredTasks.map(t => t.id))
    }
  }

  const handleBulkStatusChange = async (newStatus) => {
    setLoading(true)
    try {
      await Promise.all(selectedTasks.map(taskId => 
        fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: newStatus })
        })
      ))
      toast.success(`Updated ${selectedTasks.length} tasks`)
      setSelectedTasks([])
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error('Failed to update tasks')
    }
    setLoading(false)
  }

  const handleBulkPriorityChange = async (newPriority) => {
    setLoading(true)
    try {
      await Promise.all(selectedTasks.map(taskId => 
        fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ priority: newPriority })
        })
      ))
      toast.success(`Updated ${selectedTasks.length} tasks`)
      setSelectedTasks([])
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error('Failed to update tasks')
    }
    setLoading(false)
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) return
    setLoading(true)
    try {
      await Promise.all(selectedTasks.map(taskId => 
        fetch(`/api/tasks/${taskId}`, { method: 'DELETE', headers })
      ))
      toast.success(`Deleted ${selectedTasks.length} tasks`)
      setSelectedTasks([])
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error('Failed to delete tasks')
    }
    setLoading(false)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-muted-foreground text-sm">Manage and track all your tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(prev => prev + 1)}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => { setQuickCreateStatus(null); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Create Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100"><Layers className="h-4 w-4" /></div>
              <div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100"><Play className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xl font-bold">{stats.byStatus?.in_progress || 0}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
              <div><p className="text-xl font-bold">{stats.byStatus?.completed || 0}</p><p className="text-xs text-muted-foreground">Done</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100"><AlertCircle className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-xl font-bold">{stats.overdue || 0}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100"><CalendarIcon className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xl font-bold">{stats.dueToday || 0}</p><p className="text-xs text-muted-foreground">Due Today</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100"><User className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-xl font-bold">{stats.unassigned || 0}</p><p className="text-xs text-muted-foreground">Unassigned</p></div>
            </div>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <Card className="p-3 space-y-3">
        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">Quick Filters:</span>
          {Object.entries(QUICK_FILTERS).map(([key, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={key}
                variant={quickFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilterChange(key)}
                className={quickFilter === key ? '' : config.color}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {config.label}
              </Button>
            )
          })}
        </div>

        <Separator />

        {/* Main Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />Status {statusFilter.length > 0 && `(${statusFilter.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(TASK_STATUSES).map(([key, config]) => (
                <DropdownMenuCheckboxItem key={key} checked={statusFilter.includes(key)} onCheckedChange={(checked) => setStatusFilter(prev => checked ? [...prev, key] : prev.filter(s => s !== key))}>
                  <config.icon className="h-4 w-4 mr-2" />{config.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Flag className="h-4 w-4 mr-1" />Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                <DropdownMenuCheckboxItem key={key} checked={priorityFilter.includes(key)} onCheckedChange={(checked) => setPriorityFilter(prev => checked ? [...prev, key] : prev.filter(p => p !== key))}>
                  <config.icon className={`h-4 w-4 mr-2 ${config.iconColor}`} />{config.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={projectFilter || 'all'} onValueChange={(v) => setProjectFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name || project.projectNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear</Button>
          )}

          <div className="flex-1" />

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-r-none border-r">
                    <Kanban className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kanban Board</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-none border-r">
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')} className="rounded-l-none">
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Calendar View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTasks.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{selectedTasks.length} selected</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Zap className="h-4 w-4 mr-1" />Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(TASK_STATUSES).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => handleBulkStatusChange(key)}>
                      <config.icon className="h-4 w-4 mr-2" />{config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Flag className="h-4 w-4 mr-1" />Change Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => handleBulkPriorityChange(key)}>
                      <config.icon className={`h-4 w-4 mr-2 ${config.iconColor}`} />{config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1" />Delete
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setSelectedTasks([])}>
                <X className="h-4 w-4 mr-1" />Clear Selection
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Main Content */}
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.keys(TASK_STATUSES).filter(s => s !== 'cancelled').map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getFilteredTasks}
              onTaskClick={handleTaskClick}
              onQuickCreate={handleQuickCreate}
            />
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView 
          tasks={getFilteredTasks}
          onTaskClick={handleTaskClick}
          currentDate={calendarDate}
          onDateChange={setCalendarDate}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-10 p-3">
                    <Checkbox 
                      checked={selectedTasks.length === getFilteredTasks.length && getFilteredTasks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1">
                      Task
                      {sortField === 'title' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500 w-32 cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === 'status' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500 w-24 cursor-pointer hover:text-slate-700" onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-1">
                      Priority
                      {sortField === 'priority' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500 w-40">Assignees</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500 w-32 cursor-pointer hover:text-slate-700" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center gap-1">
                      Due Date
                      {sortField === 'dueDate' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500 w-32 cursor-pointer hover:text-slate-700" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1">
                      Created
                      {sortField === 'createdAt' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTasks.map((task) => (
                  <tr key={task.id} className={`border-t hover:bg-slate-50 cursor-pointer ${selectedTasks.includes(task.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => handleSelectTask(task.id)}
                      />
                    </td>
                    <td className="p-3" onClick={() => handleTaskClick(task)}>
                      <div className="flex items-center gap-3">
                        <TaskTypeIcon type={task.taskType} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">{task.taskNumber}</span>
                            <span className="font-medium">{task.title}</span>
                          </div>
                          {task.labels?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {task.labels.slice(0, 2).map((labelId, idx) => {
                                const label = DEFAULT_LABELS.find(l => l.id === labelId)
                                return label ? (
                                  <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] text-white" style={{ backgroundColor: label.color }}>
                                    {label.name}
                                  </span>
                                ) : null
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3" onClick={() => handleTaskClick(task)}><StatusBadge status={task.status} /></td>
                    <td className="p-3" onClick={() => handleTaskClick(task)}><PriorityBadge priority={task.priority} /></td>
                    <td className="p-3" onClick={() => handleTaskClick(task)}>
                      {task.assigneeDetails?.length > 0 ? (
                        <div className="flex -space-x-1">
                          {task.assigneeDetails.slice(0, 3).map((a, i) => <UserAvatar key={i} user={a} size="sm" />)}
                          {task.assigneeDetails.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                              +{task.assigneeDetails.length - 3}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                    </td>
                    <td className="p-3" onClick={() => handleTaskClick(task)}>{task.dueDate ? <DueDateBadge date={task.dueDate} /> : '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground" onClick={() => handleTaskClick(task)}>
                      {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : '-'}
                    </td>
                  </tr>
                ))}
                {getFilteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {quickFilter ? `No tasks match "${QUICK_FILTERS[quickFilter]?.label}" filter` : 'No tasks found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedTask(null); }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        users={users}
        projects={projects}
        token={token}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onClose={() => { setCreateDialogOpen(false); setQuickCreateStatus(null); }}
        onCreate={handleCreateTask}
        defaultStatus={quickCreateStatus}
        users={users}
        projects={projects}
      />
    </div>
  )
}

// Create Task Dialog Component
const CreateTaskDialog = ({ open, onClose, onCreate, defaultStatus, users, projects }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: 'task',
    status: 'todo',
    priority: 'medium',
    projectId: '',
    assignees: [],
    dueDate: '',
    estimatedHours: '',
    labels: []
  })

  // Compute initial form data based on dialog state
  const initialFormData = useMemo(() => ({
    title: '',
    description: '',
    taskType: 'task',
    status: defaultStatus || 'todo',
    priority: 'medium',
    projectId: '',
    assignees: [],
    dueDate: '',
    estimatedHours: '',
    labels: []
  }), [defaultStatus])

  // Handle dialog open/close
  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setFormData(initialFormData)
    }
    if (!isOpen) {
      onClose()
    }
  }

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    onCreate({
      ...formData,
      projectId: formData.projectId || null,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Title *</Label>
            <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Task title..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={formData.taskType} onValueChange={(v) => setFormData(p => ({ ...p, taskType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).filter(([k]) => k !== 'subtask').map(([key, config]) => (
                    <SelectItem key={key} value={key}><div className="flex items-center gap-2"><config.icon className="h-4 w-4" />{config.label}</div></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUSES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Project</Label>
              <Select value={formData.projectId || 'none'} onValueChange={(v) => setFormData(p => ({ ...p, projectId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects?.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name || p.projectNumber}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={formData.dueDate} onChange={(e) => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DEFAULT_LABELS.map((label) => (
                <Badge 
                  key={label.id}
                  variant={formData.labels.includes(label.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={formData.labels.includes(label.id) ? { backgroundColor: label.color } : {}}
                  onClick={() => setFormData(p => ({
                    ...p,
                    labels: p.labels.includes(label.id) ? p.labels.filter(l => l !== label.id) : [...p.labels, label.id]
                  }))}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default JiraTaskManager
