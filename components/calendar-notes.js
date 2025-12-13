'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock,
  StickyNote, Pin, PinOff, Trash2, Edit2, Search, X, Check,
  Bell, Briefcase, Target, Users, MoreHorizontal, Eye, List,
  Grid3X3, CalendarDays, MapPin, User, CheckCircle, Circle, AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
]

const NOTE_COLORS = [
  { name: 'Yellow', value: '#FEF3C7' },
  { name: 'Green', value: '#D1FAE5' },
  { name: 'Blue', value: '#DBEAFE' },
  { name: 'Purple', value: '#EDE9FE' },
  { name: 'Pink', value: '#FCE7F3' },
  { name: 'Orange', value: '#FED7AA' },
]

const EVENT_TYPES = [
  { value: 'event', label: 'Event', icon: CalendarIcon, color: '#3B82F6' },
  { value: 'task', label: 'Task', icon: Target, color: '#10B981' },
  { value: 'meeting', label: 'Meeting', icon: Users, color: '#8B5CF6' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: '#F97316' },
  { value: 'deadline', label: 'Deadline', icon: AlertCircle, color: '#EF4444' },
]

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  urgent: 'bg-purple-100 text-purple-700'
}

export function CalendarNotes({ tasks = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState('month') // month, week, day, list
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showEventDetailDialog, setShowEventDetailDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [activeTab, setActiveTab] = useState('calendar')

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '', description: '', date: '', startTime: '09:00', endTime: '10:00', 
    type: 'event', color: '#3B82F6', location: '', priority: 'medium'
  })

  // Note form state
  const [noteForm, setNoteForm] = useState({
    title: '', content: '', color: '#FEF3C7'
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const token = localStorage.getItem('token')
      
      // Fetch calendar events from API
      const eventsRes = await fetch(`/api/calendar?month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const eventsData = await eventsRes.json()
      
      // Fetch notes
      const notesData = await api.getNotes()
      
      // Combine API events with tasks passed as props
      const allEvents = [...(eventsData.events || []), ...tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        date: t.dueDate,
        startTime: '09:00',
        endTime: '10:00',
        type: 'task',
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
        color: t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F59E0B' : '#10B981',
        isTask: true,
        originalTask: t
      }))]
      
      setEvents(allEvents)
      setNotes(notesData || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentDate, tasks])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => {
      if (!e.date) return false
      const eventDate = new Date(e.date).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  // Event handlers
  const handleCreateEvent = async () => {
    if (!eventForm.title) {
      toast.error('Please enter a title')
      return
    }
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(eventForm)
      })
      toast.success('Event created')
      setShowEventDialog(false)
      resetEventForm()
      fetchData()
    } catch (error) {
      toast.error('Failed to create event')
    }
  }

  const handleUpdateEvent = async () => {
    if (!eventForm.title || !editingEvent) return
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ id: editingEvent.id, ...eventForm })
      })
      toast.success('Event updated')
      setShowEventDialog(false)
      setEditingEvent(null)
      resetEventForm()
      fetchData()
    } catch (error) {
      toast.error('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/calendar?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      toast.success('Event deleted')
      setShowEventDetailDialog(false)
      setSelectedEvent(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to delete event')
    }
  }

  const handleCompleteEvent = async (event) => {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ id: event.id, action: 'complete' })
      })
      toast.success('Event marked as complete')
      fetchData()
    } catch (error) {
      toast.error('Failed to update event')
    }
  }

  // Note handlers
  const handleCreateNote = async () => {
    if (!noteForm.title) {
      toast.error('Please enter a title')
      return
    }
    try {
      await api.createNote(noteForm)
      toast.success('Note created')
      setShowNoteDialog(false)
      setNoteForm({ title: '', content: '', color: '#FEF3C7' })
      fetchData()
    } catch (error) {
      toast.error('Failed to create note')
    }
  }

  const handleUpdateNote = async () => {
    if (!noteForm.title || !editingNote) return
    try {
      await api.updateNote({ id: editingNote.id, ...noteForm })
      toast.success('Note updated')
      setShowNoteDialog(false)
      setEditingNote(null)
      setNoteForm({ title: '', content: '', color: '#FEF3C7' })
      fetchData()
    } catch (error) {
      toast.error('Failed to update note')
    }
  }

  const handleTogglePin = async (note) => {
    try {
      await api.updateNote({ id: note.id, pinned: !note.pinned })
      toast.success(note.pinned ? 'Note unpinned' : 'Note pinned')
      fetchData()
    } catch (error) {
      toast.error('Failed to update note')
    }
  }

  const handleDeleteNote = async (id) => {
    try {
      await api.deleteNote(id)
      toast.success('Note deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete note')
    }
  }

  const resetEventForm = () => {
    setEventForm({
      title: '', description: '', date: '', startTime: '09:00', endTime: '10:00',
      type: 'event', color: '#3B82F6', location: '', priority: 'medium'
    })
  }

  const openEventDialog = (date = null, event = null) => {
    if (event) {
      setEditingEvent(event)
      setEventForm({
        title: event.title,
        description: event.description || '',
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        startTime: event.startTime || '09:00',
        endTime: event.endTime || '10:00',
        type: event.type || 'event',
        color: event.color || '#3B82F6',
        location: event.location || '',
        priority: event.priority || 'medium'
      })
    } else {
      setEditingEvent(null)
      resetEventForm()
      if (date) {
        setEventForm(prev => ({ ...prev, date }))
      }
    }
    setShowEventDialog(true)
  }

  const openEventDetail = (event) => {
    setSelectedEvent(event)
    setShowEventDetailDialog(true)
  }

  const openNoteDialog = (note = null) => {
    if (note) {
      setEditingNote(note)
      setNoteForm({
        title: note.title,
        content: note.content || '',
        color: note.color || '#FEF3C7'
      })
    } else {
      setEditingNote(null)
      setNoteForm({ title: '', content: '', color: '#FEF3C7' })
    }
    setShowNoteDialog(true)
  }

  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(noteSearch.toLowerCase()) ||
    note.content?.toLowerCase().includes(noteSearch.toLowerCase())
  )

  // Get week dates
  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(e => {
      if (!e.date) return false
      const eventDate = new Date(e.date).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  // Render event type icon
  const EventTypeIcon = ({ type }) => {
    const eventType = EVENT_TYPES.find(t => t.value === type)
    const Icon = eventType?.icon || CalendarIcon
    return <Icon className="h-3 w-3" />
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Calendar & Notes</h2>
            <p className="text-muted-foreground">Manage your schedule and notes</p>
          </div>
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Notes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-xl font-semibold min-w-[200px] text-center">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <Button 
                    variant={calendarView === 'month' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setCalendarView('month')}
                    className="px-3"
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Month
                  </Button>
                  <Button 
                    variant={calendarView === 'week' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setCalendarView('week')}
                    className="px-3"
                  >
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Week
                  </Button>
                  <Button 
                    variant={calendarView === 'list' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setCalendarView('list')}
                    className="px-3"
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
                <Button onClick={() => openEventDialog()}>
                  <Plus className="h-4 w-4 mr-2" /> Add Event
                </Button>
              </div>
            </div>

            {/* Month View */}
            {calendarView === 'month' && (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the month starts */}
                  {Array.from({ length: startingDay }).map((_, index) => (
                    <div key={`empty-${index}`} className="min-h-[100px] bg-slate-50/50 rounded-lg" />
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1
                    const dayEvents = getEventsForDay(day)
                    const today = isToday(day)
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                    return (
                      <motion.div
                        key={day}
                        whileHover={{ scale: 1.02 }}
                        className={`min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer ${
                          today ? 'bg-primary/5 border-primary' : 'bg-white hover:border-primary/50'
                        }`}
                        onClick={() => openEventDialog(dateStr)}
                      >
                        <div className={`text-sm font-medium mb-1 ${today ? 'text-primary' : ''}`}>
                          {today ? (
                            <span className="bg-primary text-white w-6 h-6 rounded-full inline-flex items-center justify-center">
                              {day}
                            </span>
                          ) : day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); openEventDetail(event) }}
                              className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 flex items-center gap-1"
                              style={{ backgroundColor: `${event.color}20`, color: event.color }}
                            >
                              <EventTypeIcon type={event.type} />
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Week View */}
            {calendarView === 'week' && (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDates().map((date, index) => {
                    const dayEvents = getEventsForDate(date)
                    const isCurrentDay = date.toDateString() === new Date().toDateString()
                    return (
                      <div key={index} className={`min-h-[400px] border rounded-lg p-2 ${isCurrentDay ? 'bg-primary/5 border-primary' : ''}`}>
                        <div className={`text-center mb-3 pb-2 border-b ${isCurrentDay ? 'text-primary' : ''}`}>
                          <div className="text-xs text-muted-foreground">{dayNames[index]}</div>
                          <div className={`text-lg font-semibold ${isCurrentDay ? 'bg-primary text-white rounded-full w-8 h-8 mx-auto flex items-center justify-center' : ''}`}>
                            {date.getDate()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              onClick={() => openEventDetail(event)}
                              className="p-2 rounded-lg text-sm cursor-pointer hover:shadow-md transition-shadow"
                              style={{ backgroundColor: `${event.color}15`, borderLeft: `3px solid ${event.color}` }}
                            >
                              <div className="font-medium truncate flex items-center gap-1">
                                <EventTypeIcon type={event.type} />
                                {event.title}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {event.startTime || '09:00'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* List View */}
            {calendarView === 'list' && (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No events this month. Click "Add Event" to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.sort((a, b) => new Date(a.date) - new Date(b.date)).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => openEventDetail(event)}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div 
                          className="w-1 h-12 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <EventTypeIcon type={event.type} />
                            <span className="font-medium">{event.title}</span>
                            {event.isTask && (
                              <Badge className={PRIORITY_COLORS[event.priority] || 'bg-slate-100'}>
                                {event.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.startTime || '09:00'}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700">Completed</Badge>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCompleteEvent(event) }}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t">
              {EVENT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                  <span className="text-muted-foreground">{type.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => openNoteDialog()}>
                <Plus className="h-4 w-4 mr-2" /> New Note
              </Button>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No notes yet. Create your first note to get started.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {/* Pinned Notes */}
                {filteredNotes.filter(n => n.pinned).map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openNoteDialog} onPin={handleTogglePin} onDelete={handleDeleteNote} />
                ))}
                {/* Regular Notes */}
                {filteredNotes.filter(n => !n.pinned).map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openNoteDialog} onPin={handleTogglePin} onDelete={handleDeleteNote} />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Event title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Event location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Event description..."
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full transition-transform ${eventForm.color === color.value ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setEventForm({ ...eventForm, color: color.value })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
            <Button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}>
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={showEventDetailDialog} onOpenChange={setShowEventDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && <EventTypeIcon type={selectedEvent.type} />}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  {new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {selectedEvent.startTime || '09:00'} - {selectedEvent.endTime || '10:00'}
                </div>
              </div>
              
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedEvent.location}
                </div>
              )}

              {selectedEvent.description && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.isTask && selectedEvent.originalTask && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">Task Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className="ml-2">{selectedEvent.originalTask.status}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge className={`ml-2 ${PRIORITY_COLORS[selectedEvent.originalTask.priority]}`}>
                        {selectedEvent.originalTask.priority}
                      </Badge>
                    </div>
                    {selectedEvent.originalTask.assignedTo && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Assigned to:</span>
                        <span className="ml-2">{selectedEvent.originalTask.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  {selectedEvent.status !== 'completed' && !selectedEvent.isTask && (
                    <Button variant="outline" onClick={() => handleCompleteEvent(selectedEvent)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {!selectedEvent.isTask && (
                    <>
                      <Button variant="outline" onClick={() => { setShowEventDetailDialog(false); openEventDialog(null, selectedEvent); }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Create Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Note title"
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your note..."
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-lg transition-transform border ${noteForm.color === color.value ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNoteForm({ ...noteForm, color: color.value })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={editingNote ? handleUpdateNote : handleCreateNote}>
              {editingNote ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Note Card Component
function NoteCard({ note, onEdit, onPin, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group"
      style={{ backgroundColor: note.color || '#FEF3C7' }}
    >
      {note.pinned && (
        <Pin className="absolute top-2 right-2 h-4 w-4 text-amber-600" />
      )}
      <h4 className="font-semibold mb-2 pr-6">{note.title}</h4>
      <p className="text-sm text-slate-600 line-clamp-4">{note.content}</p>
      <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-200/50">
        <span className="text-xs text-slate-500">
          {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recently'}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPin(note)}>
            {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(note)}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onDelete(note.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export default CalendarNotes
