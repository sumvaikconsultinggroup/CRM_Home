'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, parseISO } from 'date-fns'
import {
  Search, Plus, Filter, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, Clock, User, Users,
  Tag, Flag, AlertCircle, CheckCircle2, Circle, ArrowRight, ArrowUp, ArrowDown, Minus,
  LayoutGrid, List, Table2, GanttChart, Kanban, RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
  X, Check, Loader2, FileText, MessageSquare, Paperclip, Link2, Eye, Copy, Archive,
  Play, Pause, Square, Timer, FolderOpen, Layers, Bug, Lightbulb, Bookmark, Star,
  Send, MoreHorizontal, Maximize2, Minimize2, ExternalLink, Share2, Bell, BellOff,
  SortAsc, SortDesc, Columns, Download, Upload, Settings, Zap, Target, TrendingUp,
  AlertTriangle, CheckSquare, ListTodo, GitBranch, CircleDot, Hash, AtSign
} from 'lucide-react'

// =============================================
// CONSTANTS & CONFIGURATION
// =============================================

const TASK_STATUSES = {
  backlog: { label: 'Backlog', color: 'bg-slate-100 text-slate-700', icon: Circle, order: 0 },
  todo: { label: 'To Do', color: 'bg-blue-100 text-blue-700', icon: ListTodo, order: 1 },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Play, order: 2 },
  review: { label: 'Review', color: 'bg-purple-100 text-purple-700', icon: Eye, order: 3 },
  completed: { label: 'Done', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, order: 4 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: X, order: 5 }
}

const TASK_PRIORITIES = {
  urgent: { label: 'Urgent', color: 'bg-red-500 text-white', icon: AlertCircle, iconColor: 'text-red-500' },
  high: { label: 'High', color: 'bg-orange-500 text-white', icon: ArrowUp, iconColor: 'text-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500 text-white', icon: Minus, iconColor: 'text-yellow-500' },
  low: { label: 'Low', color: 'bg-green-500 text-white', icon: ArrowDown, iconColor: 'text-green-500' }
}

const TASK_TYPES = {
  task: { label: 'Task', color: 'bg-blue-100 text-blue-700', icon: CheckSquare },
  bug: { label: 'Bug', color: 'bg-red-100 text-red-700', icon: Bug },
  feature: { label: 'Feature', color: 'bg-green-100 text-green-700', icon: Lightbulb },
  story: { label: 'Story', color: 'bg-purple-100 text-purple-700', icon: Bookmark },
  epic: { label: 'Epic', color: 'bg-indigo-100 text-indigo-700', icon: Zap }
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

// =============================================
// UTILITY COMPONENTS
// =============================================

const TaskTypeIcon = ({ type, size = 'sm' }) => {
  const config = TASK_TYPES[type] || TASK_TYPES.task
  const Icon = config.icon
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <div className={`p-1 rounded ${config.color}`}>
      <Icon className={sizeClass} />
    </div>
  )
}

const PriorityIcon = ({ priority, showLabel = false }) => {
  const config = TASK_PRIORITIES[priority] || TASK_PRIORITIES.medium
  const Icon = config.icon
  return (
    <div className="flex items-center gap-1">
      <Icon className={`h-4 w-4 ${config.iconColor}`} />
      {showLabel && <span className="text-xs">{config.label}</span>}
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const config = TASK_STATUSES[status] || TASK_STATUSES.todo
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.color} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

const UserAvatar = ({ user, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-10 w-10'
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
  
  return (
    <Avatar className={sizeClass}>
      <AvatarImage src={user?.avatar} />
      <AvatarFallback className={`${textSize} bg-gradient-to-br from-blue-500 to-purple-600 text-white`}>
        {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
  )
}

const DueDateBadge = ({ date }) => {
  if (!date) return null
  
  const dueDate = new Date(date)
  const isOverdue = isPast(dueDate) && !isToday(dueDate)
  const isDueToday = isToday(dueDate)
  const isDueTomorrow = isTomorrow(dueDate)
  
  let colorClass = 'bg-slate-100 text-slate-600'
  let label = format(dueDate, 'MMM d')
  
  if (isOverdue) {
    colorClass = 'bg-red-100 text-red-700'
    label = `Overdue (${format(dueDate, 'MMM d')})`
  } else if (isDueToday) {
    colorClass = 'bg-amber-100 text-amber-700'
    label = 'Today'
  } else if (isDueTomorrow) {
    colorClass = 'bg-blue-100 text-blue-700'
    label = 'Tomorrow'
  }
  
  return (
    <Badge variant="outline" className={`${colorClass} border-0 gap-1 text-xs`}>
      <CalendarIcon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

// =============================================
// STATS DASHBOARD
// =============================================

const TaskStats = ({ stats }) => {
  if (!stats) return null

  const statCards = [
    { label: 'Total', value: stats.total, icon: Layers, color: 'text-slate-600 bg-slate-100' },
    { label: 'In Progress', value: stats.byStatus?.in_progress || 0, icon: Play, color: 'text-amber-600 bg-amber-100' },
    { label: 'Completed', value: stats.byStatus?.completed || 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Overdue', value: stats.overdue || 0, icon: AlertCircle, color: 'text-red-600 bg-red-100' },
    { label: 'Due Today', value: stats.dueToday || 0, icon: CalendarIcon, color: 'text-blue-600 bg-blue-100' },
    { label: 'Unassigned', value: stats.unassigned || 0, icon: User, color: 'text-purple-600 bg-purple-100' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat, idx) => (
        <Card key={idx} className="p-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// =============================================
// KANBAN BOARD
// =============================================

const KanbanColumn = ({ status, tasks, onTaskClick, onStatusChange, onQuickCreate }) => {
  const config = TASK_STATUSES[status]
  const Icon = config.icon
  const columnTasks = tasks.filter(t => t.status === status)

  return (
    <div className="flex-shrink-0 w-80 bg-slate-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-sm">{config.label}</h3>
          <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onQuickCreate(status)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-2 pr-2">
          {columnTasks.map((task) => (
            <KanbanCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              onStatusChange={onStatusChange}
            />
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

const KanbanCard = ({ task, onClick, onStatusChange }) => {
  const hasSubtasks = task.subtasks?.length > 0
  const completedSubtasks = task.subtaskDetails?.filter(st => st.status === 'completed').length || 0
  const totalSubtasks = task.subtasks?.length || 0
  const checklistProgress = task.checklist?.length > 0 
    ? Math.round((task.checklist.filter(c => c.completed).length / task.checklist.length) * 100)
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <TaskTypeIcon type={task.taskType} />
            <span className="text-xs text-muted-foreground font-mono">{task.taskNumber}</span>
          </div>
          <PriorityIcon priority={task.priority} />
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>

        {/* Labels */}
        {task.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.slice(0, 3).map((label, idx) => {
              const labelConfig = DEFAULT_LABELS.find(l => l.id === label) || { name: label, color: '#6B7280' }
              return (
                <span 
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: labelConfig.color }}
                >
                  {labelConfig.name}
                </span>
              )
            })}
            {task.labels.length > 3 && (
              <span className="text-xs text-muted-foreground">+{task.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Progress indicators */}
        {(hasSubtasks || checklistProgress !== null) && (
          <div className="mb-2">
            {hasSubtasks && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
              </div>
            )}
            {checklistProgress !== null && (
              <div className="flex items-center gap-2 mt-1">
                <Progress value={checklistProgress} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">{checklistProgress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {task.dueDate && <DueDateBadge date={task.dueDate} />}
          </div>
          <div className="flex items-center gap-1">
            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {task.comments.length}
              </div>
            )}
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {task.attachments.length}
              </div>
            )}
            {task.assigneeDetails?.length > 0 && (
              <div className="flex -space-x-1">
                {task.assigneeDetails.slice(0, 3).map((assignee, idx) => (
                  <UserAvatar key={idx} user={assignee} size="sm" />
                ))}
                {task.assigneeDetails.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                    +{task.assigneeDetails.length - 3}
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
// TABLE VIEW
// =============================================

const TableView = ({ tasks, onTaskClick, onStatusChange, selectedTasks, onSelectTask, onSelectAll, users, projects }) => {
  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length
  const someSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 p-3">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  className={someSelected ? 'data-[state=checked]:bg-blue-300' : ''}
                />
              </th>
              <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase">Task</th>
              <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase w-32">Status</th>
              <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase w-24">Priority</th>
              <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase w-40">Assignees</th>
              <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase w-32">Due Date</th>
              <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase w-32">Project</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr 
                key={task.id} 
                className={`border-t hover:bg-slate-50 cursor-pointer ${selectedTasks.includes(task.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => onSelectTask(task.id)}
                  />
                </td>
                <td className="p-3" onClick={() => onTaskClick(task)}>
                  <div className="flex items-center gap-3">
                    <TaskTypeIcon type={task.taskType} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{task.taskNumber}</span>
                        <span className="font-medium">{task.title}</span>
                      </div>
                      {task.labels?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {task.labels.slice(0, 2).map((label, idx) => {
                            const labelConfig = DEFAULT_LABELS.find(l => l.id === label) || { name: label, color: '#6B7280' }
                            return (
                              <span 
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-xs text-white"
                                style={{ backgroundColor: labelConfig.color }}
                              >
                                {labelConfig.name}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUSES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-3 w-3" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  <PriorityIcon priority={task.priority} showLabel />
                </td>
                <td className="p-3">
                  {task.assigneeDetails?.length > 0 ? (
                    <div className="flex -space-x-1">
                      {task.assigneeDetails.slice(0, 3).map((assignee, idx) => (
                        <TooltipProvider key={idx}>
                          <Tooltip>
                            <TooltipTrigger>
                              <UserAvatar user={assignee} size="sm" />
                            </TooltipTrigger>
                            <TooltipContent>{assignee.name || assignee.email}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      {task.assigneeDetails.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                          +{task.assigneeDetails.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="p-3">
                  {task.dueDate ? <DueDateBadge date={task.dueDate} /> : <span className="text-xs text-muted-foreground">-</span>}
                </td>
                <td className="p-3">
                  {task.projectDetails ? (
                    <span className="text-xs text-muted-foreground">{task.projectDetails.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTaskClick(task)}>
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =============================================
// CALENDAR VIEW
// =============================================

const CalendarView = ({ tasks, onTaskClick, currentDate, onDateChange }) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getTasksForDay = (day) => {
    return tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), day))
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => onDateChange(addDays(currentDate, -7))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
        </Button>
        <h3 className="font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => onDateChange(addDays(currentDate, 7))}>
          Next Week <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day)
          const isCurrentDay = isToday(day)
          
          return (
            <div 
              key={day.toISOString()} 
              className={`min-h-[200px] border rounded-lg p-2 ${isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
            >
              <div className={`text-center mb-2 pb-2 border-b ${isCurrentDay ? 'text-blue-600' : ''}`}>
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <p className={`text-lg font-semibold ${isCurrentDay ? 'text-blue-600' : ''}`}>{format(day, 'd')}</p>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 5).map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="p-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 cursor-pointer truncate"
                  >
                    <div className="flex items-center gap-1">
                      <PriorityIcon priority={task.priority} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                ))}
                {dayTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{dayTasks.length - 5} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================
// TASK DETAIL SHEET
// =============================================

const TaskDetailSheet = ({ task, open, onClose, onUpdate, onDelete, users, projects }) => {
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Initialize form data when task changes - use key on parent to reset component instead of effect
  const taskFormData = useMemo(() => {
    if (task) {
      return { ...task }
    }
    return {}
  }, [task])

  // Reset edit mode when sheet opens/closes - use onOpenChange callback instead
  const handleClose = () => {
    setEditMode(false)
    onClose()
  }

  // Use taskFormData as initial state, but track local edits
  const currentFormData = editMode ? formData : taskFormData

  const handleStartEdit = () => {
    setFormData({ ...taskFormData })
    setEditMode(true)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await onUpdate(task.id, formData)
      setEditMode(false)
      toast.success('Task updated')
    } catch (error) {
      toast.error('Failed to update task')
    }
    setLoading(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setLoading(true)
    try {
      await onUpdate(task.id, { action: 'add_comment', content: newComment })
      setNewComment('')
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
    setLoading(false)
  }

  const handleChecklistToggle = async (index) => {
    const updatedChecklist = [...(formData.checklist || [])]
    updatedChecklist[index] = { ...updatedChecklist[index], completed: !updatedChecklist[index].completed }
    const completedCount = updatedChecklist.filter(c => c.completed).length
    const progress = Math.round((completedCount / updatedChecklist.length) * 100)
    
    try {
      await onUpdate(task.id, { action: 'update_checklist', checklist: updatedChecklist, progress })
      setFormData(prev => ({ ...prev, checklist: updatedChecklist, progress }))
    } catch (error) {
      toast.error('Failed to update checklist')
    }
  }

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return
    const updatedChecklist = [...(formData.checklist || []), { id: Date.now(), text: newChecklistItem, completed: false }]
    const completedCount = updatedChecklist.filter(c => c.completed).length
    const progress = Math.round((completedCount / updatedChecklist.length) * 100)
    
    try {
      await onUpdate(task.id, { action: 'update_checklist', checklist: updatedChecklist, progress })
      setFormData(prev => ({ ...prev, checklist: updatedChecklist, progress }))
      setNewChecklistItem('')
    } catch (error) {
      toast.error('Failed to add checklist item')
    }
  }

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TaskTypeIcon type={task.taskType} size="md" />
              <div>
                <span className="text-sm text-muted-foreground font-mono">{task.taskNumber}</span>
                <SheetTitle className="text-left">{task.title}</SheetTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments ({task.comments?.length || 0})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                {editMode ? (
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUSES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={task.status} />
                )}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                {editMode ? (
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={TASK_PRIORITIES[task.priority]?.color}>{TASK_PRIORITIES[task.priority]?.label}</Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              {editMode ? (
                <Textarea 
                  value={formData.description || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description || 'No description'}
                </p>
              )}
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <Label>Assignees</Label>
              {task.assigneeDetails?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.assigneeDetails.map((assignee, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1">
                      <UserAvatar user={assignee} size="sm" />
                      <span className="text-sm">{assignee.name || assignee.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <p className="text-sm">{task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}</p>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <p className="text-sm">{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}</p>
              </div>
            </div>

            {/* Project */}
            {task.projectDetails && (
              <div className="space-y-2">
                <Label>Project</Label>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                  <FolderOpen className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">{task.projectDetails.name}</span>
                </div>
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist</Label>
                {formData.checklist?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formData.checklist.filter(c => c.completed).length}/{formData.checklist.length} completed
                  </span>
                )}
              </div>
              {formData.checklist?.length > 0 && (
                <Progress value={formData.progress || 0} className="h-2 mb-2" />
              )}
              <div className="space-y-2">
                {(formData.checklist || []).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-2">
                    <Checkbox 
                      checked={item.completed} 
                      onCheckedChange={() => handleChecklistToggle(idx)}
                    />
                    <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add checklist item..." 
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                />
                <Button variant="outline" size="sm" onClick={handleAddChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Time Tracking */}
            <div className="space-y-2">
              <Label>Time Tracking</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Estimated: {task.estimatedHours || 0}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Logged: {task.loggedHours || 0}h</span>
                </div>
              </div>
            </div>

            {/* Labels */}
            {task.labels?.length > 0 && (
              <div className="space-y-2">
                <Label>Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label, idx) => {
                    const labelConfig = DEFAULT_LABELS.find(l => l.id === label) || { name: label, color: '#6B7280' }
                    return (
                      <span 
                        key={idx}
                        className="px-2 py-1 rounded text-xs text-white"
                        style={{ backgroundColor: labelConfig.color }}
                      >
                        {labelConfig.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <div className="space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Write a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                />
                <Button onClick={handleAddComment} disabled={loading || !newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {(task.comments || []).map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <UserAvatar user={comment.userDetails} size="sm" />
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
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="space-y-4">
              {(task.activityLog || []).slice().reverse().map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-slate-300 mt-2" />
                  <div>
                    <p>{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="related" className="mt-4">
            <div className="space-y-4">
              {/* Subtasks */}
              {task.subtaskDetails?.length > 0 && (
                <div>
                  <Label className="mb-2 block">Subtasks</Label>
                  <div className="space-y-2">
                    {task.subtaskDetails.map((subtask) => (
                      <div key={subtask.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={subtask.status} />
                          <span className="text-sm">{subtask.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{subtask.taskNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocked By */}
              {task.blockedByDetails?.length > 0 && (
                <div>
                  <Label className="mb-2 block">Blocked By</Label>
                  <div className="space-y-2">
                    {task.blockedByDetails.map((blocker) => (
                      <div key={blocker.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm">{blocker.title}</span>
                        </div>
                        <StatusBadge status={blocker.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocks */}
              {task.blocksDetails?.length > 0 && (
                <div>
                  <Label className="mb-2 block">Blocks</Label>
                  <div className="space-y-2">
                    {task.blocksDetails.map((blocked) => (
                      <div key={blocked.id} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm">{blocked.title}</span>
                        </div>
                        <StatusBadge status={blocked.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// =============================================
// CREATE/EDIT TASK DIALOG
// =============================================

const TaskDialog = ({ open, onClose, task, onSave, users, projects, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: 'task',
    status: 'todo',
    priority: 'medium',
    projectId: '',
    assignees: [],
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    labels: [],
    checklist: []
  })

  // Initialize form when dialog opens or task changes
  const initialFormData = useMemo(() => {
    if (task) {
      return {
        title: task.title || '',
        description: task.description || '',
        taskType: task.taskType || 'task',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        projectId: task.projectId || 'none',
        assignees: task.assignees || [],
        startDate: task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : '',
        dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
        estimatedHours: task.estimatedHours || '',
        labels: task.labels || [],
        checklist: task.checklist || []
      }
    }
    return {
      title: '',
      description: '',
      taskType: 'task',
      status: 'todo',
      priority: 'medium',
      projectId: 'none',
      assignees: [],
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      labels: [],
      checklist: []
    }
  }, [task])

  // Handle dialog open - reset form data
  const handleDialogOpen = (isOpen) => {
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
    // Convert 'none' project back to null
    const submitData = {
      ...formData,
      projectId: formData.projectId === 'none' ? null : formData.projectId
    }
    onSave(submitData)
  }

  const toggleLabel = (labelId) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(labelId) 
        ? prev.labels.filter(l => l !== labelId)
        : [...prev.labels, labelId]
    }))
  }

  const toggleAssignee = (userId) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(a => a !== userId)
        : [...prev.assignees, userId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update task details' : 'Add a new task to your board'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title..."
            />
          </div>

          {/* Type, Status, Priority */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.taskType} onValueChange={(v) => setFormData(prev => ({ ...prev, taskType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUSES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={formData.projectId} onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name || project.projectNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Assignees</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {formData.assignees.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {formData.assignees.slice(0, 3).map((userId) => {
                          const user = users?.find(u => u.id === userId)
                          return <UserAvatar key={userId} user={user} size="sm" />
                        })}
                      </div>
                      <span>{formData.assignees.length} assigned</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select assignees...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="space-y-1">
                  {users?.map((user) => (
                    <div 
                      key={user.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${formData.assignees.includes(user.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleAssignee(user.id)}
                    >
                      <Checkbox checked={formData.assignees.includes(user.id)} />
                      <UserAvatar user={user} size="sm" />
                      <span className="text-sm">{user.name || user.email}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input 
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label>Estimated Hours</Label>
            <Input 
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || '' }))}
              placeholder="0"
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_LABELS.map((label) => (
                <Badge 
                  key={label.id}
                  variant={formData.labels.includes(label.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={formData.labels.includes(label.id) ? { backgroundColor: label.color } : {}}
                  onClick={() => toggleLabel(label.id)}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// MAIN COMPONENT
// =============================================

export function EnterpriseTaskManager({ token }) {
  // State
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // View & Filters
  const [viewMode, setViewMode] = useState('kanban') // kanban, table, calendar
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [priorityFilter, setPriorityFilter] = useState([])
  const [typeFilter, setTypeFilter] = useState([])
  const [assigneeFilter, setAssigneeFilter] = useState([])
  const [projectFilter, setProjectFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Selection
  const [selectedTasks, setSelectedTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [quickCreateStatus, setQuickCreateStatus] = useState(null)

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date())

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token])

  // Fetch Data
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.append('includeStats', 'true')
      if (statusFilter.length > 0) params.append('status', statusFilter.join(','))
      if (priorityFilter.length > 0) params.append('priority', priorityFilter.join(','))
      if (searchQuery) params.append('search', searchQuery)
      if (projectFilter) params.append('projectId', projectFilter)
      if (assigneeFilter.length > 0) params.append('assigneeId', assigneeFilter[0])
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)

      const res = await fetch(`/api/tasks?${params.toString()}`, { headers })
      const data = await res.json()
      
      if (data.tasks) {
        setTasks(data.tasks)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      toast.error('Failed to fetch tasks')
    }
  }, [headers, statusFilter, priorityFilter, searchQuery, projectFilter, assigneeFilter, sortBy, sortOrder])

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

  // Task Actions
  const handleCreateTask = async (taskData) => {
    try {
      setLoading(true)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(taskData)
      })
      
      if (res.ok) {
        toast.success('Task created successfully')
        setCreateDialogOpen(false)
        setQuickCreateStatus(null)
        setRefreshKey(prev => prev + 1)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create task')
      }
    } catch (error) {
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
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
        setTasks(prev => prev.map(t => t.id === taskId ? data : t))
        if (selectedTask?.id === taskId) {
          // Refresh the selected task details
          const detailRes = await fetch(`/api/tasks/${taskId}?includeSubtasks=true`, { headers })
          const detailData = await detailRes.json()
          setSelectedTask(detailData)
        }
        return data
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Update error:', error)
      throw error
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await handleUpdateTask(taskId, { status: newStatus })
      toast.success(`Task moved to ${TASK_STATUSES[newStatus]?.label}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers
      })
      
      if (res.ok) {
        toast.success('Task deleted')
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setDetailOpen(false)
      } else {
        toast.error('Failed to delete task')
      }
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleBulkAction = async (action, updates = {}) => {
    if (selectedTasks.length === 0) {
      toast.error('No tasks selected')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: action === 'delete' ? 'bulk_delete' : 'bulk_update',
          taskIds: selectedTasks,
          updates
        })
      })

      if (res.ok) {
        toast.success(`${selectedTasks.length} tasks ${action === 'delete' ? 'deleted' : 'updated'}`)
        setSelectedTasks([])
        setRefreshKey(prev => prev + 1)
      } else {
        toast.error('Bulk action failed')
      }
    } catch (error) {
      toast.error('Bulk action failed')
    } finally {
      setLoading(false)
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
    setEditingTask(null)
    setCreateDialogOpen(true)
  }

  // Selection handlers
  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(tasks.map(t => t.id))
    }
  }

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (typeFilter.length > 0 && !typeFilter.includes(task.taskType)) return false
      return true
    })
  }, [tasks, typeFilter])

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter([])
    setPriorityFilter([])
    setTypeFilter([])
    setAssigneeFilter([])
    setProjectFilter('')
  }

  const hasActiveFilters = searchQuery || statusFilter.length > 0 || priorityFilter.length > 0 || typeFilter.length > 0 || assigneeFilter.length > 0 || projectFilter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-muted-foreground">Manage and track all your tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(prev => prev + 1)}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => { setEditingTask(null); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TaskStats stats={stats} />

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Status {statusFilter.length > 0 && `(${statusFilter.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(TASK_STATUSES).map(([key, config]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={statusFilter.includes(key)}
                    onCheckedChange={(checked) => {
                      setStatusFilter(prev => checked ? [...prev, key] : prev.filter(s => s !== key))
                    }}
                  >
                    <config.icon className="h-4 w-4 mr-2" />
                    {config.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Flag className="h-4 w-4 mr-1" />
                  Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={priorityFilter.includes(key)}
                    onCheckedChange={(checked) => {
                      setPriorityFilter(prev => checked ? [...prev, key] : prev.filter(p => p !== key))
                    }}
                  >
                    <config.icon className={`h-4 w-4 mr-2 ${config.iconColor}`} />
                    {config.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Project Filter */}
            <Select value={projectFilter || 'all'} onValueChange={(v) => setProjectFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name || project.projectNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* View Toggle & Bulk Actions */}
          <div className="flex items-center gap-2">
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">{selectedTasks.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {Object.entries(TASK_STATUSES).map(([key, config]) => (
                          <DropdownMenuItem key={key} onClick={() => handleBulkAction('update', { status: key })}>
                            <config.icon className="h-4 w-4 mr-2" /> {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Change Priority</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {Object.entries(TASK_PRIORITIES).map(([key, config]) => (
                          <DropdownMenuItem key={key} onClick={() => handleBulkAction('update', { priority: key })}>
                            <config.icon className={`h-4 w-4 mr-2 ${config.iconColor}`} /> {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => handleBulkAction('delete')}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTasks([])}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center border rounded-lg">
              <Button 
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="rounded-r-none"
              >
                <Kanban className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-none border-x"
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-l-none"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {viewMode === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Object.keys(TASK_STATUSES).filter(s => s !== 'cancelled').map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onStatusChange={handleStatusChange}
                  onQuickCreate={handleQuickCreate}
                />
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <TableView
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onStatusChange={handleStatusChange}
              selectedTasks={selectedTasks}
              onSelectTask={handleSelectTask}
              onSelectAll={handleSelectAll}
              users={users}
              projects={projects}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
            />
          )}
        </>
      )}

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedTask(null); }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        users={users}
        projects={projects}
      />

      {/* Create/Edit Dialog */}
      <TaskDialog
        open={createDialogOpen}
        onClose={() => { setCreateDialogOpen(false); setEditingTask(null); setQuickCreateStatus(null); }}
        task={editingTask ? { ...editingTask } : quickCreateStatus ? { status: quickCreateStatus } : null}
        onSave={handleCreateTask}
        users={users}
        projects={projects}
        loading={loading}
      />
    </div>
  )
}

export default EnterpriseTaskManager
