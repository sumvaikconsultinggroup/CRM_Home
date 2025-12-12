'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock,
  StickyNote, Pin, PinOff, Trash2, Edit2, Search, X, Check,
  Bell, Briefcase, Target, Users, MoreHorizontal
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
  { value: 'event', label: 'Event', icon: CalendarIcon },
  { value: 'task', label: 'Task', icon: Target },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'reminder', label: 'Reminder', icon: Bell },
]

export function CalendarNotes({ tasks = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [activeTab, setActiveTab] = useState('calendar')

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '', description: '', date: '', time: '', type: 'event', color: '#3B82F6'
  })

  // Note form state
  const [noteForm, setNoteForm] = useState({
    title: '', content: '', color: '#FEF3C7'
  })

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const [eventsData, notesData] = await Promise.all([
        api.getCalendarEvents(month),
        api.getNotes()
      ])
      setEvents(eventsData || [])
      setNotes(notesData || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => {
      const eventDate = new Date(e.date).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const getTasksForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => {
      if (!t.dueDate) return false
      const taskDate = new Date(t.dueDate).toISOString().split('T')[0]
      return taskDate === dateStr
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
    try {
      if (!eventForm.title || !eventForm.date) {
        toast.error('Title and date are required')
        return
      }
      await api.createCalendarEvent(eventForm)
      toast.success('Event created')
      setShowEventDialog(false)
      setEventForm({ title: '', description: '', date: '', time: '', type: 'event', color: '#3B82F6' })
      fetchData()
    } catch (error) {
      toast.error('Failed to create event')
    }
  }

  const handleUpdateEvent = async () => {
    try {
      await api.updateCalendarEvent({ id: editingEvent.id, ...eventForm })
      toast.success('Event updated')
      setShowEventDialog(false)
      setEditingEvent(null)
      setEventForm({ title: '', description: '', date: '', time: '', type: 'event', color: '#3B82F6' })
      fetchData()
    } catch (error) {
      toast.error('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id) => {
    try {
      await api.deleteCalendarEvent(id)
      toast.success('Event deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete event')
    }
  }

  // Note handlers
  const handleCreateNote = async () => {
    try {
      if (!noteForm.title) {
        toast.error('Title is required')
        return
      }
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

  const openEventDialog = (date = null, event = null) => {
    if (event) {
      setEditingEvent(event)
      setEventForm({
        title: event.title,
        description: event.description || '',
        date: new Date(event.date).toISOString().split('T')[0],
        time: event.time || '',
        type: event.type || 'event',
        color: event.color || '#3B82F6'
      })
    } else {
      setEditingEvent(null)
      setEventForm({
        title: '',
        description: '',
        date: date || new Date().toISOString().split('T')[0],
        time: '',
        type: 'event',
        color: '#3B82F6'
      })
    }
    setShowEventDialog(true)
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
                <h3 className="text-xl font-semibold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => openEventDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Add Event
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Empty cells before first day */}
              {Array(startingDay).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 min-h-[100px] bg-slate-50/50 rounded-lg" />
              ))}

              {/* Days */}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDay(day)
                const dayTasks = getTasksForDay(day)
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                return (
                  <motion.div
                    key={day}
                    className={`p-2 min-h-[100px] rounded-lg border transition-colors cursor-pointer hover:border-primary/50 ${
                      isToday(day) ? 'bg-primary/5 border-primary' : 'bg-white border-slate-200'
                    }`}
                    onClick={() => openEventDialog(dateStr)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate"
                          style={{ backgroundColor: event.color + '20', color: event.color }}
                          onClick={(e) => { e.stopPropagation(); openEventDialog(null, event) }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate bg-orange-100 text-orange-700"
                        >
                          📋 {task.title}
                        </div>
                      ))}
                      {(dayEvents.length + dayTasks.length) > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length + dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Upcoming Events */}
            <div className="mt-8">
              <h4 className="font-semibold mb-4">Upcoming Events</h4>
              <div className="space-y-2">
                {events.filter(e => new Date(e.date) >= new Date()).slice(0, 5).map(event => (
                  <motion.div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: event.color }} />
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()} {event.time && `at ${event.time}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEventDialog(null, event)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
                {events.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No upcoming events</p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="space-y-4">
            {/* Notes Header */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  className="pl-10"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                />
              </div>
              <Button onClick={() => openNoteDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Add Note
              </Button>
            </div>

            {/* Notes Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredNotes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card 
                    className="p-4 h-48 relative group cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: note.color }}
                    onClick={() => openNoteDialog(note)}
                  >
                    {note.pinned && (
                      <Pin className="absolute top-2 right-2 h-4 w-4 text-slate-600" />
                    )}
                    <h4 className="font-semibold mb-2 pr-6">{note.title}</h4>
                    <p className="text-sm text-slate-700 line-clamp-4">{note.content}</p>
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleTogglePin(note) }}
                      >
                        {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <p className="absolute bottom-2 left-4 text-xs text-slate-500">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </Card>
                </motion.div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <StickyNote className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-muted-foreground">No notes yet. Create your first note!</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-2">
                  {COLORS.map(color => (
                    <button
                      key={color.value}
                      className={`h-8 w-8 rounded-full transition-transform ${eventForm.color === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setEventForm({ ...eventForm, color: color.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
              <Button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}>
                {editingEvent ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Create Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                placeholder="Note title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Write your note..."
                rows={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.value}
                    className={`h-8 w-8 rounded-lg border-2 transition-transform ${noteForm.color === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNoteForm({ ...noteForm, color: color.value })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
              <Button onClick={editingNote ? handleUpdateNote : handleCreateNote}>
                {editingNote ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
