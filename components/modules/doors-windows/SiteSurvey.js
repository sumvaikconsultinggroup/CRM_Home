'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import {
  Plus, Search, Eye, Edit, Trash2, MapPin, Phone, User, Building2,
  Ruler, CheckCircle2, Clock, Calendar, Camera, Save, Loader2,
  AlertTriangle, ChevronRight, X, FileText, Copy, ArrowRight, Send,
  Home, Layers, Grid3X3, Box, Palette, Sun, Wind, Droplets, Shield,
  Thermometer, Volume2, Lock, Zap, Car, Wifi, ClipboardCheck, Image,
  Navigation, Target, Compass, Mountain, TreeDeciduous, CloudRain,
  DoorOpen, Maximize2, Move3d, Sparkles, Receipt, Download, Printer,
  ChevronDown, ChevronUp, MoreHorizontal, RefreshCw, Star, Hash,
  Building, Warehouse, Factory, GraduationCap, Hotel, Church, Upload,
  RotateCcw, Move, ZoomIn, ZoomOut, Square, Circle, Triangle, Minus,
  Maximize, Minimize, GripVertical, MousePointer2, Pencil, Eraser,
  ImagePlus, Video, Mic, Layout, PanelLeft, PanelRight, ScanLine,
  Focus, Scan, Crosshair, RulerIcon, FolderKanban, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { BUILDING_TYPES, FLOOR_LEVELS, ROOM_TYPES, CATEGORIES, PRODUCT_TYPES, GLASS_TYPES, PRODUCT_FAMILIES, FINISHES, FRAME_COLORS } from './constants'
import { DoorWindow3DPreview } from './DoorWindow3DPreview'
import { validateEmail, validatePhone, validatePinCode, validateName, validateAddress } from '@/lib/utils/validation'
import { PhoneInput } from '@/components/ui/phone-input'

const API_BASE = '/api/modules/doors-windows'

// Generate 6-digit site code
const generateSiteCode = () => Math.floor(100000 + Math.random() * 900000).toString()

// Status styles
const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  'sent-for-quote': 'bg-purple-100 text-purple-700'
}

// Material profiles with visual properties
const MATERIAL_PROFILES = {
  'uPVC': {
    name: 'uPVC',
    color: '#ffffff',
    texture: 'smooth',
    frameWidth: 70,
    description: 'Premium quality uPVC profiles',
    features: ['Weather resistant', 'Low maintenance', 'Energy efficient', 'Sound insulation']
  },
  'Aluminium': {
    name: 'Aluminium',
    color: '#c0c0c0',
    texture: 'metallic',
    frameWidth: 45,
    description: 'Sleek aluminium frames',
    features: ['Slim profiles', 'Strong & durable', 'Powder coated', 'Wide color range']
  },
  'Aluminium-Wood': {
    name: 'Aluminium-Wood Composite',
    color: '#8b4513',
    texture: 'wood-grain',
    frameWidth: 78,
    description: 'Best of both worlds',
    features: ['Natural wood interior', 'Aluminium exterior', 'Premium aesthetics', 'High performance']
  }
}

// Interactive Floor Plan Component - Isometric 3D View
function InteractiveFloorPlan({ openings, onOpeningClick, onAddOpening, selectedFloor, buildingType }) {
  const [zoom, setZoom] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [viewAngle, setViewAngle] = useState('isometric') // isometric, top, front
  
  // Group openings by room with counts
  const openingsByRoom = openings.reduce((acc, opening) => {
    const room = opening.room || 'Unassigned'
    if (!acc[room]) acc[room] = { windows: [], doors: [], total: 0, area: 0 }
    if (opening.type === 'Window') acc[room].windows.push(opening)
    else acc[room].doors.push(opening)
    acc[room].total++
    acc[room].area += ((parseFloat(opening.width) || 0) * (parseFloat(opening.height) || 0)) / 92903.04
    return acc
  }, {})

  const rooms = Object.keys(openingsByRoom)

  // Room icons based on type
  const getRoomIcon = (room) => {
    const roomLower = room.toLowerCase()
    if (roomLower.includes('bed')) return '🛏️'
    if (roomLower.includes('living')) return '🛋️'
    if (roomLower.includes('kitchen')) return '🍳'
    if (roomLower.includes('bath') || roomLower.includes('toilet')) return '🚿'
    if (roomLower.includes('balcony')) return '🌅'
    if (roomLower.includes('dining')) return '🍽️'
    if (roomLower.includes('study') || roomLower.includes('office')) return '💼'
    if (roomLower.includes('puja') || roomLower.includes('prayer')) return '🪔'
    if (roomLower.includes('store') || roomLower.includes('utility')) return '📦'
    if (roomLower.includes('entrance') || roomLower.includes('lobby')) return '🚪'
    return '🏠'
  }

  // Room color based on type
  const getRoomColor = (room) => {
    const roomLower = room.toLowerCase()
    if (roomLower.includes('bed')) return { bg: 'from-purple-100 to-purple-200', border: 'border-purple-400', accent: 'purple' }
    if (roomLower.includes('living')) return { bg: 'from-blue-100 to-blue-200', border: 'border-blue-400', accent: 'blue' }
    if (roomLower.includes('kitchen')) return { bg: 'from-orange-100 to-orange-200', border: 'border-orange-400', accent: 'orange' }
    if (roomLower.includes('bath') || roomLower.includes('toilet')) return { bg: 'from-cyan-100 to-cyan-200', border: 'border-cyan-400', accent: 'cyan' }
    if (roomLower.includes('balcony')) return { bg: 'from-green-100 to-green-200', border: 'border-green-400', accent: 'green' }
    if (roomLower.includes('dining')) return { bg: 'from-amber-100 to-amber-200', border: 'border-amber-400', accent: 'amber' }
    return { bg: 'from-slate-100 to-slate-200', border: 'border-slate-400', accent: 'slate' }
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl overflow-hidden" style={{ minHeight: '500px' }}>
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1">
          <button
            onClick={() => setViewAngle('isometric')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewAngle === 'isometric' ? 'bg-white text-indigo-600' : 'text-white/70 hover:text-white'
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => setViewAngle('top')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewAngle === 'top' ? 'bg-white text-indigo-600' : 'text-white/70 hover:text-white'
            }`}
          >
            Floor Plan
          </button>
        </div>
        <Button variant="secondary" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.min(z + 0.2, 2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Floor & Stats */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
        <Badge className="bg-indigo-500 text-white px-3 py-1 shadow-lg">
          {selectedFloor || 'Ground Floor'}
        </Badge>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-white text-xs">
          <div>{openings.length} Openings</div>
          <div>{rooms.length} Rooms</div>
        </div>
      </div>

      {/* 3D Isometric Floor Plan */}
      <div 
        className="w-full h-full p-8 flex items-center justify-center"
        style={{ 
          transform: `scale(${zoom})`,
          perspective: viewAngle === 'isometric' ? '1000px' : 'none'
        }}
      >
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-white/80">
            <div className="w-32 h-32 mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center"
                style={{ transform: viewAngle === 'isometric' ? 'rotateX(60deg) rotateZ(-45deg)' : 'none' }}
              >
                <Layout className="h-12 w-12 text-white/40" />
              </div>
            </div>
            <p className="text-lg font-medium">No Openings Recorded</p>
            <p className="text-sm text-white/60 mt-1">Add openings to see them visualized here</p>
            <Button 
              variant="secondary" 
              className="mt-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => onAddOpening?.()}
            >
              <Plus className="h-4 w-4 mr-2" /> Add First Opening
            </Button>
          </div>
        ) : (
          <div 
            className="relative"
            style={{ 
              transform: viewAngle === 'isometric' ? 'rotateX(60deg) rotateZ(-45deg)' : 'none',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Room Grid */}
            <div className="grid gap-4" style={{ 
              gridTemplateColumns: `repeat(${Math.min(3, rooms.length)}, minmax(180px, 1fr))` 
            }}>
              {rooms.map((room, idx) => {
                const roomData = openingsByRoom[room]
                const colors = getRoomColor(room)
                const isSelected = selectedRoom === room
                
                return (
                  <div
                    key={room}
                    className={`relative bg-gradient-to-br ${colors.bg} rounded-xl p-4 cursor-pointer transition-all duration-300 ${colors.border} border-2 ${
                      isSelected ? 'ring-4 ring-white/50 scale-105 shadow-2xl' : 'hover:scale-102 shadow-lg'
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: viewAngle === 'isometric' ? `translateZ(${isSelected ? '20px' : '0px'})` : 'none'
                    }}
                    onClick={() => setSelectedRoom(isSelected ? null : room)}
                  >
                    {/* Room 3D Effect - Side */}
                    {viewAngle === 'isometric' && (
                      <>
                        <div 
                          className={`absolute top-0 -right-4 w-4 h-full bg-gradient-to-r from-${colors.accent}-300 to-${colors.accent}-400 rounded-r-lg`}
                          style={{ transform: 'skewY(-45deg)', transformOrigin: 'top left' }}
                        />
                        <div 
                          className={`absolute -bottom-4 left-0 w-full h-4 bg-gradient-to-b from-${colors.accent}-300 to-${colors.accent}-400 rounded-b-lg`}
                          style={{ transform: 'skewX(-45deg)', transformOrigin: 'top left' }}
                        />
                      </>
                    )}
                    
                    {/* Room Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{getRoomIcon(room)}</span>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{room}</h4>
                        <p className="text-xs text-slate-500">{roomData.area.toFixed(1)} sq.ft</p>
                      </div>
                    </div>
                    
                    {/* Openings Display */}
                    <div className="space-y-2">
                      {/* Windows */}
                      {roomData.windows.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {roomData.windows.map((w, i) => (
                            <div
                              key={w.id || i}
                              className="relative w-10 h-10 bg-gradient-to-br from-sky-300 to-blue-400 rounded border-2 border-sky-500 flex items-center justify-center shadow-inner cursor-pointer hover:scale-110 transition-transform"
                              onClick={(e) => { e.stopPropagation(); onOpeningClick?.(w); }}
                              title={`${w.openingRef}: ${w.width}×${w.height}mm`}
                            >
                              <span className="text-xs font-mono text-white font-bold">{w.openingRef}</span>
                              {/* Glass reflection effect */}
                              <div className="absolute inset-1 bg-gradient-to-br from-white/40 to-transparent rounded-sm" />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Doors */}
                      {roomData.doors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {roomData.doors.map((d, i) => (
                            <div
                              key={d.id || i}
                              className="relative w-8 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-t border-2 border-amber-900 flex items-end justify-center pb-1 shadow-lg cursor-pointer hover:scale-110 transition-transform"
                              onClick={(e) => { e.stopPropagation(); onOpeningClick?.(d); }}
                              title={`${d.openingRef}: ${d.width}×${d.height}mm`}
                            >
                              <span className="text-xs font-mono text-amber-200 font-bold">{d.openingRef}</span>
                              {/* Door handle */}
                              <div className="absolute right-1 top-1/2 w-1.5 h-1.5 bg-amber-300 rounded-full" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Add Opening Button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-3 text-xs h-7 bg-white/50 hover:bg-white"
                      onClick={(e) => { e.stopPropagation(); onAddOpening?.(room); }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                    
                    {/* Stats Badge */}
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                      {roomData.total}
                    </div>
                  </div>
                )
              })}
              
              {/* Add New Room Card */}
              <div 
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 border-dashed border-white/30 hover:border-white/50 cursor-pointer flex flex-col items-center justify-center min-h-[150px] transition-all hover:bg-white/20"
                onClick={() => onAddOpening?.()}
              >
                <Plus className="h-10 w-10 text-white/50 mb-2" />
                <p className="text-white/70 text-sm font-medium">Add Opening</p>
                <p className="text-white/50 text-xs">New Room</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-white/70 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gradient-to-br from-sky-300 to-blue-400 rounded border border-sky-500" />
          <span>Window</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-5 bg-gradient-to-br from-amber-600 to-amber-800 rounded-t border border-amber-900" />
          <span>Door</span>
        </div>
      </div>

      {/* Selected Room Detail Panel */}
      {selectedRoom && (
        <div className="absolute bottom-4 right-4 w-64 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-white/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-xl">{getRoomIcon(selectedRoom)}</span>
              {selectedRoom}
            </h4>
            <button onClick={() => setSelectedRoom(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Windows:</span>
              <span className="font-medium">{openingsByRoom[selectedRoom].windows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Doors:</span>
              <span className="font-medium">{openingsByRoom[selectedRoom].doors.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Area:</span>
              <span className="font-medium">{openingsByRoom[selectedRoom].area.toFixed(2)} sq.ft</span>
            </div>
          </div>
          <Button 
            size="sm" 
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onAddOpening?.(selectedRoom)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Opening
          </Button>
        </div>
      )}
    </div>
  )
}

// Live Opening Visualization Component
function OpeningVisualization({ opening, material }) {
  const profile = MATERIAL_PROFILES[material] || MATERIAL_PROFILES['Aluminium']
  const width = parseFloat(opening.width) || 1200
  const height = parseFloat(opening.height) || 1500
  const scale = Math.min(200 / width, 200 / height)
  
  const displayWidth = width * scale
  const displayHeight = height * scale

  // Calculate glass type appearance
  const glassAppearance = {
    'single': { gradient: 'from-sky-100/60 to-sky-200/60', label: 'Single' },
    'double': { gradient: 'from-sky-200/70 to-blue-300/70', label: 'DGU' },
    'triple': { gradient: 'from-blue-200/80 to-indigo-300/80', label: 'Triple' },
    'tinted': { gradient: 'from-slate-300/70 to-slate-400/70', label: 'Tinted' },
    'reflective': { gradient: 'from-zinc-300/80 to-zinc-400/80', label: 'Reflective' },
    'frosted': { gradient: 'from-white/80 to-slate-100/80', label: 'Frosted' },
    'laminated': { gradient: 'from-emerald-100/60 to-emerald-200/60', label: 'Laminated' }
  }[opening.glassType] || { gradient: 'from-sky-100/60 to-sky-200/60', label: 'Standard' }

  // Frame color
  const frameColors = {
    'white': '#ffffff',
    'black': '#1f2937',
    'bronze': '#92400e',
    'silver': '#9ca3af',
    'grey': '#4b5563',
    'wood': '#78350f',
    'champagne': '#d4a574'
  }
  const frameColor = frameColors[opening.frameColor] || '#ffffff'

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative rounded-lg shadow-xl overflow-hidden"
        style={{ 
          width: displayWidth + 20, 
          height: displayHeight + 20,
          backgroundColor: frameColor,
          border: `4px solid ${frameColor}`,
          boxShadow: `inset 0 0 0 ${profile.frameWidth * scale / 10}px ${frameColor}`
        }}
      >
        {/* Glass panes */}
        <div 
          className="absolute bg-gradient-to-br from-sky-100/60 to-sky-200/60 backdrop-blur-sm"
          style={{ 
            top: Math.round(profile.frameWidth * scale / 10),
            left: Math.round(profile.frameWidth * scale / 10),
            right: Math.round(profile.frameWidth * scale / 10),
            bottom: Math.round(profile.frameWidth * scale / 10),
            borderRadius: '2px',
            background: `linear-gradient(to bottom right, rgba(186, 230, 253, 0.6), rgba(125, 211, 252, 0.6))`
          }}
        >
          {/* Panel dividers based on panel count */}
          {opening.panels > 1 && (
            <div 
              className="absolute inset-0 flex"
              style={{ gap: '2px' }}
            >
              {Array.from({ length: opening.panels || 2 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1"
                  style={{ 
                    borderColor: frameColor,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    background: `linear-gradient(to bottom right, rgba(186, 230, 253, 0.5), rgba(125, 211, 252, 0.5))`
                  }}
                />
              ))}
            </div>
          )}

          {/* Mesh overlay if enabled */}
          {opening.mesh && (
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, #000 0px, transparent 1px, transparent 3px)',
                backgroundSize: '3px 3px'
              }}
            />
          )}

          {/* Handle */}
          <div 
            className="absolute w-2 h-8 bg-slate-600 rounded-full shadow-md"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              [opening.handlePosition === 'left' ? 'left' : 'right']: '8px'
            }}
          />
        </div>

        {/* Grill if enabled */}
        {opening.grill && (
          <div className="absolute inset-4 pointer-events-none">
            <div className="w-full h-full border-2 border-slate-400/50 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-slate-400/30" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="mt-4 text-center">
        <p className="font-semibold text-slate-700">
          {opening.type} - {opening.category}
        </p>
        <p className="text-sm text-slate-500">
          {width}mm × {height}mm ({((width * height) / 92903.04).toFixed(2)} sq.ft)
        </p>
        <div className="flex gap-2 justify-center mt-2">
          <Badge variant="outline" className="text-xs">{material}</Badge>
          <Badge variant="outline" className="text-xs">{glassAppearance.label}</Badge>
          <Badge variant="outline" className="text-xs">{opening.panels || 2} Panel</Badge>
        </div>
        {(opening.mesh || opening.grill) && (
          <div className="flex gap-1 justify-center mt-1">
            {opening.mesh && <Badge className="bg-slate-100 text-slate-600 text-xs">+ Mesh</Badge>}
            {opening.grill && <Badge className="bg-slate-100 text-slate-600 text-xs">+ Grill</Badge>}
          </div>
        )}
      </div>
    </div>
  )
}

// Photo Upload & Annotation Component
function PhotoGallery({ photos, onUpload, onDelete, onAnnotate }) {
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    // Simulate upload - in real app, upload to server/S3
    const newPhotos = files.map(file => ({
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      annotations: []
    }))
    
    await new Promise(resolve => setTimeout(resolve, 500))
    onUpload?.(newPhotos)
    setUploading(false)
    toast.success(`Uploaded ${files.length} photo(s)`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-700">Site Photos</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-2" />
          )}
          Add Photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {photos?.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {photos.map(photo => (
            <div 
              key={photo.id}
              className="relative group rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.url} 
                alt={photo.name}
                className="w-full h-24 object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-white"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(photo.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {photo.annotations?.length > 0 && (
                <Badge className="absolute bottom-1 right-1 text-xs bg-indigo-600">
                  {photo.annotations.length} notes
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Camera className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No photos uploaded yet</p>
          <p className="text-sm text-slate-400">Click &quot;Add Photos&quot; to upload site images</p>
        </div>
      )}

      {/* Photo Viewer Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img 
              src={selectedPhoto?.url} 
              alt={selectedPhoto?.name}
              className="w-full rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Measurement Checklist Component  
function MeasurementChecklist({ opening, onChange }) {
  const checks = [
    { id: 'width', label: 'Width measured', icon: Ruler },
    { id: 'height', label: 'Height measured', icon: Ruler },
    { id: 'sillHeight', label: 'Sill height checked', icon: RulerIcon },
    { id: 'levelPlumb', label: 'Level & plumb verified', icon: Focus },
    { id: 'wallThickness', label: 'Wall thickness recorded', icon: Layers },
    { id: 'clearances', label: 'Clearances noted', icon: Move },
    { id: 'obstacles', label: 'Obstacles identified', icon: AlertTriangle },
    { id: 'photoTaken', label: 'Photo taken', icon: Camera }
  ]

  const completedCount = checks.filter(c => opening?.[c.id] || opening?.measurements?.[c.id]).length

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-emerald-800">Measurement Checklist</h4>
        <Badge className="bg-emerald-600 text-white">
          {completedCount}/{checks.length}
        </Badge>
      </div>
      <Progress value={(completedCount / checks.length) * 100} className="h-2 mb-4" />
      <div className="grid grid-cols-2 gap-2">
        {checks.map(check => {
          const isChecked = opening?.[check.id] || opening?.measurements?.[check.id]
          return (
            <div 
              key={check.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                isChecked ? 'bg-emerald-100' : 'bg-white/50 hover:bg-white'
              }`}
              onClick={() => onChange?.({ [check.id]: !isChecked })}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isChecked ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'
              }`}>
                {isChecked && <CheckCircle2 className="h-3 w-3" />}
              </div>
              <check.icon className={`h-4 w-4 ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`text-sm ${isChecked ? 'text-emerald-700' : 'text-slate-600'}`}>
                {check.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Main Enhanced Site Survey Component
export function SiteSurvey({ surveys, projects, selectedProject, onRefresh, headers, user, glassStyles, businessMode }) {
  // Main states
  const [showNewSurvey, setShowNewSurvey] = useState(false)
  const [showSurveyOptions, setShowSurveyOptions] = useState(false) // NEW: Show options dialog
  const [surveyCreationMode, setSurveyCreationMode] = useState(null) // NEW: 'fromProject' or 'manual'
  const [showOpeningDialog, setShowOpeningDialog] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [viewingSurvey, setViewingSurvey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [projectSearchQuery, setProjectSearchQuery] = useState('') // NEW: For project search
  const [surveyOpenings, setSurveyOpenings] = useState([])
  const [loadingOpenings, setLoadingOpenings] = useState(false)
  const [activeFormTab, setActiveFormTab] = useState('basic')
  const [editingOpening, setEditingOpening] = useState(null)
  const [showQuoteConfirm, setShowQuoteConfirm] = useState(false)
  const [creatingQuote, setCreatingQuote] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('list') // 'list', 'floor-plan', 'visual'
  const [sitePhotos, setSitePhotos] = useState([])
  const [activeOpeningTab, setActiveOpeningTab] = useState('dimensions')

  // Survey Form State
  const [surveyForm, setSurveyForm] = useState({
    projectId: '',
    siteCode: '',
    siteName: '',
    siteAddress: '',
    city: '',
    pincode: '',
    buildingType: '',
    totalFloors: 1,
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    surveyorName: '',
    surveyDate: new Date().toISOString().split('T')[0],
    siteConditions: '',
    existingFrameType: '',
    environmentalFactors: [],
    powerAvailable: true,
    waterAvailable: true,
    liftAvailable: false,
    parkingAvailable: true,
    scopeSummary: '',
    status: 'draft'
  })

  // Opening Form State
  const [openingForm, setOpeningForm] = useState({
    surveyId: '',
    openingRef: 'W1',
    floor: 'Ground Floor',
    room: '',
    wallLocation: '', // N, S, E, W
    type: 'Window',
    category: 'Sliding',
    
    // Precise Measurements
    width: '',
    height: '',
    sillHeight: '',
    lintelHeight: '',
    wallThickness: 230,
    
    // Level & Plumb
    levelTop: true,
    levelBottom: true,
    plumbLeft: true,
    plumbRight: true,
    levelVariance: 0, // mm
    plumbVariance: 0, // mm
    
    // Configuration
    panels: 2,
    material: 'Aluminium',
    glassType: 'single',
    frameColor: 'white',
    handlePosition: 'right',
    
    // Accessories
    mesh: false,
    meshType: 'SS304',
    grill: false,
    grillPattern: 'horizontal',
    safetyBars: false,
    
    // Photos (1-5 photos per opening, 1 mandatory)
    photos: [],
    
    // Measurements checklist
    measurements: {
      width: false,
      height: false,
      sillHeight: false,
      levelPlumb: false,
      wallThickness: false,
      clearances: false,
      obstacles: false,
      photoTaken: false
    },
    
    specialNotes: ''
  })
  
  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef(null)

  // Fetch survey openings
  useEffect(() => {
    if (viewingSurvey) {
      fetchSurveyOpenings(viewingSurvey.id)
    }
  }, [viewingSurvey])

  const fetchSurveyOpenings = async (surveyId) => {
    setLoadingOpenings(true)
    try {
      const res = await fetch(`${API_BASE}/surveys?id=${surveyId}`, { headers })
      const data = await res.json()
      if (data.surveys?.[0]?.openings) {
        setSurveyOpenings(data.surveys[0].openings)
      } else if (data.survey?.openings) {
        setSurveyOpenings(data.survey.openings)
      } else {
        setSurveyOpenings([])
      }
    } catch (error) {
      console.error('Failed to fetch openings:', error)
      setSurveyOpenings([])
    } finally {
      setLoadingOpenings(false)
    }
  }

  const resetSurveyForm = useCallback(() => {
    setSurveyForm({
      projectId: selectedProject?.id || '',
      siteCode: generateSiteCode(),
      siteName: selectedProject?.siteName || selectedProject?.name || '',
      siteAddress: selectedProject?.siteAddress || '',
      city: '',
      pincode: '',
      buildingType: selectedProject?.buildingType || '',
      totalFloors: 1,
      contactPerson: selectedProject?.contactPerson || selectedProject?.clientName || '',
      contactPhone: selectedProject?.contactPhone || selectedProject?.clientPhone || '',
      contactEmail: selectedProject?.contactEmail || '',
      surveyorName: user?.name || '',
      surveyDate: new Date().toISOString().split('T')[0],
      siteConditions: '',
      existingFrameType: '',
      environmentalFactors: [],
      powerAvailable: true,
      waterAvailable: true,
      liftAvailable: false,
      parkingAvailable: true,
      scopeSummary: '',
      status: 'draft'
    })
    setSitePhotos([])
    setSelectedSurvey(null)
    setActiveFormTab('basic')
  }, [selectedProject, user])

  const resetOpeningForm = useCallback(() => {
    const windowCount = surveyOpenings.filter(o => o.type === 'Window').length + 1
    setOpeningForm({
      surveyId: viewingSurvey?.id || '',
      openingRef: `W${windowCount}`,
      floor: 'Ground Floor',
      room: '',
      wallLocation: '',
      type: 'Window',
      category: 'Sliding',
      width: '',
      height: '',
      sillHeight: '',
      lintelHeight: '',
      wallThickness: 230,
      levelTop: true,
      levelBottom: true,
      plumbLeft: true,
      plumbRight: true,
      levelVariance: 0,
      plumbVariance: 0,
      panels: 2,
      material: 'Aluminium',
      glassType: 'single',
      frameColor: 'white',
      handlePosition: 'right',
      mesh: false,
      meshType: 'SS304',
      grill: false,
      grillPattern: 'horizontal',
      safetyBars: false,
      photos: [], // Reset photos array
      measurements: {
        width: false,
        height: false,
        sillHeight: false,
        levelPlumb: false,
        wallThickness: false,
        clearances: false,
        obstacles: false,
        photoTaken: false
      },
      specialNotes: ''
    })
    setEditingOpening(null)
    setActiveOpeningTab('dimensions')
  }, [viewingSurvey, surveyOpenings])

  // Handle opening type change
  const handleOpeningTypeChange = (type) => {
    const isWindow = type === 'Window'
    const prefix = isWindow ? 'W' : 'D'
    const count = surveyOpenings.filter(o => 
      isWindow ? o.type === 'Window' : o.type !== 'Window'
    ).length + (editingOpening ? 0 : 1)
    
    setOpeningForm(prev => ({
      ...prev,
      type,
      openingRef: `${prefix}${count}`
    }))
  }

  // Save survey
  // Validation state for survey form
  const [surveyErrors, setSurveyErrors] = useState({})

  // Validate survey form
  const validateSurveyForm = () => {
    const errors = {}
    
    // Site name validation
    const siteNameResult = validateName(surveyForm.siteName, { required: true, fieldName: 'Site name' })
    if (!siteNameResult.valid) errors.siteName = siteNameResult.error
    
    // Contact person validation
    const contactResult = validateName(surveyForm.contactPerson, { required: true, fieldName: 'Contact person' })
    if (!contactResult.valid) errors.contactPerson = contactResult.error
    
    // Contact phone validation
    const phoneResult = validatePhone(surveyForm.contactPhone, true)
    if (!phoneResult.valid) errors.contactPhone = phoneResult.error
    
    // Contact email validation (optional)
    if (surveyForm.contactEmail) {
      const emailResult = validateEmail(surveyForm.contactEmail, false)
      if (!emailResult.valid) errors.contactEmail = emailResult.error
    }
    
    // Surveyor name validation
    const surveyorResult = validateName(surveyForm.surveyorName, { required: true, fieldName: 'Surveyor name' })
    if (!surveyorResult.valid) errors.surveyorName = surveyorResult.error
    
    // Address validation (optional but if provided should be meaningful)
    if (surveyForm.siteAddress) {
      const addressResult = validateAddress(surveyForm.siteAddress, { required: false, minLength: 5 })
      if (!addressResult.valid) errors.siteAddress = addressResult.error
    }
    
    // Pin code validation (optional)
    if (surveyForm.pincode) {
      const pincodeResult = validatePinCode(surveyForm.pincode, false)
      if (!pincodeResult.valid) errors.pincode = pincodeResult.error
    }
    
    setSurveyErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveSurvey = async () => {
    if (!validateSurveyForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    setSaving(true)
    try {
      const method = selectedSurvey ? 'PUT' : 'POST'
      const body = { ...surveyForm, photos: sitePhotos }
      if (selectedSurvey) body.id = selectedSurvey.id

      const res = await fetch(`${API_BASE}/surveys`, {
        method,
        headers,
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(selectedSurvey ? 'Survey updated' : `Survey created! Site Code: ${body.siteCode}`)
        setShowNewSurvey(false)
        resetSurveyForm()
        onRefresh()
        
        if (!selectedSurvey && (data.id || data.survey?.id)) {
          setViewingSurvey(data.survey || data)
        }
      } else {
        toast.error(data.error || 'Failed to save survey')
      }
    } catch (error) {
      toast.error('Failed to save survey')
    } finally {
      setSaving(false)
    }
  }

  // Save opening
  const handleSaveOpening = async () => {
    if (!openingForm.width || !openingForm.height) {
      toast.error('Please enter width and height')
      return
    }
    if (!openingForm.room) {
      toast.error('Please select the room/location')
      return
    }
    // Validate: At least 1 photo is required
    if (!openingForm.photos || openingForm.photos.length === 0) {
      toast.error('Please upload at least 1 photo of the opening')
      setActiveOpeningTab('photos')
      return
    }

    setSaving(true)
    try {
      const action = editingOpening ? 'update-opening' : 'add-opening'
      const body = {
        action,
        surveyId: viewingSurvey.id,
        ...openingForm,
        areaSqft: ((parseFloat(openingForm.width) || 0) * (parseFloat(openingForm.height) || 0)) / 92903.04
      }
      
      if (editingOpening) body.openingId = editingOpening.id

      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingOpening ? 'Opening updated' : 'Opening added')
        setShowOpeningDialog(false)
        resetOpeningForm()
        fetchSurveyOpenings(viewingSurvey.id)
        onRefresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save opening')
      }
    } catch (error) {
      toast.error('Failed to save opening')
    } finally {
      setSaving(false)
    }
  }

  // Send for quote
  const handleSendForQuote = async () => {
    if (!viewingSurvey || surveyOpenings.length === 0) {
      toast.error('Survey must have at least one opening')
      return
    }

    setCreatingQuote(true)
    try {
      const res = await fetch(`${API_BASE}/quotations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'from-survey',
          surveyId: viewingSurvey.id,
          siteCode: viewingSurvey.siteCode,
          customerName: viewingSurvey.contactPerson,
          customerPhone: viewingSurvey.contactPhone,
          customerEmail: viewingSurvey.contactEmail,
          siteAddress: viewingSurvey.siteAddress,
          projectId: viewingSurvey.projectId,
          openings: surveyOpenings
        })
      })

      const data = await res.json()
      if (res.ok) {
        await fetch(`${API_BASE}/surveys`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ 
            id: viewingSurvey.id, 
            status: 'sent-for-quote',
            quoteId: data.quotation?.id || data.id
          })
        })

        toast.success(`Quote created! Quote #: ${data.quotation?.quoteNumber || data.quoteNumber}`)
        setShowQuoteConfirm(false)
        setViewingSurvey(null)
        onRefresh()
      } else {
        toast.error(data.error || 'Failed to create quote')
      }
    } catch (error) {
      toast.error('Failed to create quote')
    } finally {
      setCreatingQuote(false)
    }
  }

  // Filter surveys
  const filteredSurveys = surveys?.filter(s => {
    const matchesSearch = !searchQuery || 
      s.siteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteCode?.includes(searchQuery) ||
      s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesProject = !selectedProject || s.projectId === selectedProject.id
    return matchesSearch && matchesStatus && matchesProject
  }) || []

  // Calculate stats
  const surveyStats = {
    total: surveys?.length || 0,
    completed: surveys?.filter(s => s.status === 'completed').length || 0,
    inProgress: surveys?.filter(s => s.status === 'in-progress').length || 0,
    sentForQuote: surveys?.filter(s => s.status === 'sent-for-quote').length || 0
  }

  // Calculate total openings area
  const totalOpeningsArea = surveyOpenings.reduce((sum, o) => {
    return sum + (((parseFloat(o.width) || 0) * (parseFloat(o.height) || 0)) / 92903.04)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Scan className="h-6 w-6 text-indigo-600" />
            Interactive Site Survey
          </h2>
          <p className="text-slate-500">
            {businessMode === 'manufacturer' 
              ? 'Dealer site survey management' 
              : 'Comprehensive site assessment for accurate quotations'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-slate-50">Total: {surveyStats.total}</Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Completed: {surveyStats.completed}</Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700">Quoted: {surveyStats.sentForQuote}</Badge>
          <Button onClick={() => { setShowSurveyOptions(true); setSurveyCreationMode(null); setProjectSearchQuery(''); }} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" /> New Survey
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by site name, code, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="sent-for-quote">Sent for Quote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Survey Detail View */}
      {viewingSurvey ? (
        <Card className={glassStyles?.card}>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setViewingSurvey(null)}>
                  <X className="h-4 w-4 mr-2" /> Close
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{viewingSurvey.siteName}</CardTitle>
                    <Badge className="bg-indigo-100 text-indigo-700 font-mono">
                      #{viewingSurvey.siteCode}
                    </Badge>
                    <Badge className={statusStyles[viewingSurvey.status]}>
                      {viewingSurvey.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" /> {viewingSurvey.siteAddress}
                  </CardDescription>
                </div>
              </div>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4 inline mr-1" /> List
                </button>
                <button
                  onClick={() => setViewMode('floor-plan')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === 'floor-plan' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  <Layout className="h-4 w-4 inline mr-1" /> Floor Plan
                </button>
                <button
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === 'visual' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  <Sparkles className="h-4 w-4 inline mr-1" /> 3D Preview
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-none">
                <CardContent className="p-4 text-center">
                  <Box className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{surveyOpenings.length}</p>
                  <p className="text-xs text-blue-600">Total Openings</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-none">
                <CardContent className="p-4 text-center">
                  <Maximize2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-700">{totalOpeningsArea.toFixed(1)}</p>
                  <p className="text-xs text-emerald-600">Total Sq.Ft</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-none">
                <CardContent className="p-4 text-center">
                  <DoorOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-700">
                    {surveyOpenings.filter(o => o.type === 'Window').length}
                  </p>
                  <p className="text-xs text-purple-600">Windows</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-none">
                <CardContent className="p-4 text-center">
                  <Home className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-700">
                    {surveyOpenings.filter(o => o.type !== 'Window').length}
                  </p>
                  <p className="text-xs text-amber-600">Doors</p>
                </CardContent>
              </Card>
            </div>

            {/* View Content */}
            {viewMode === 'floor-plan' ? (
              <InteractiveFloorPlan 
                openings={surveyOpenings}
                selectedFloor={viewingSurvey.floor}
                onOpeningClick={(o) => { setEditingOpening(o); setOpeningForm({...openingForm, ...o}); setShowOpeningDialog(true); }}
                onAddOpening={(room) => { resetOpeningForm(); if(room) setOpeningForm(f => ({...f, room})); setShowOpeningDialog(true); }}
              />
            ) : viewMode === 'visual' ? (
              <div className="grid grid-cols-3 gap-6">
                {surveyOpenings.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <Sparkles className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Add openings to see 3D previews</p>
                  </div>
                ) : (
                  surveyOpenings.map((opening, idx) => (
                    <Card key={opening.id || idx} className="p-4">
                      <OpeningVisualization 
                        opening={opening} 
                        material={opening.material || 'Aluminium'} 
                      />
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Openings List */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Opening Measurements</h3>
                  <Button onClick={() => { resetOpeningForm(); setShowOpeningDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Opening
                  </Button>
                </div>

                {loadingOpenings ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                  </div>
                ) : surveyOpenings.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <Ruler className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Openings Recorded</h3>
                    <p className="text-slate-500 mb-4">Start by measuring and adding window/door openings</p>
                    <Button onClick={() => { resetOpeningForm(); setShowOpeningDialog(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Add First Opening
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {surveyOpenings.map((opening, idx) => (
                      <Card 
                        key={opening.id || idx} 
                        className="hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => { setEditingOpening(opening); setOpeningForm({...openingForm, ...opening}); setShowOpeningDialog(true); }}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Mini Preview */}
                            <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                              <span className="text-4xl">{opening.type === 'Window' ? '🪟' : '🚪'}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                  {opening.openingRef}
                                </span>
                                <h4 className="font-semibold">{opening.type} - {opening.category}</h4>
                              </div>
                              <p className="text-sm text-slate-500">{opening.room} • {opening.floor}</p>
                              <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                <span><strong>Size:</strong> {opening.width}×{opening.height}mm</span>
                                <span><strong>Area:</strong> {(((opening.width||0)*(opening.height||0))/92903.04).toFixed(2)} sqft</span>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">{opening.material}</Badge>
                                <Badge variant="secondary" className="text-xs">{opening.glassType}</Badge>
                                {opening.mesh && <Badge variant="outline" className="text-xs">+Mesh</Badge>}
                                {opening.grill && <Badge variant="outline" className="text-xs">+Grill</Badge>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>

          <CardFooter className="border-t bg-slate-50 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-slate-500">
                Surveyor: <strong>{viewingSurvey.surveyorName}</strong> • {new Date(viewingSurvey.surveyDate).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                {surveyOpenings.length > 0 && viewingSurvey.status !== 'sent-for-quote' && (
                  <Button 
                    className="bg-gradient-to-r from-emerald-600 to-green-600"
                    onClick={() => setShowQuoteConfirm(true)}
                  >
                    <Receipt className="h-4 w-4 mr-2" /> Send for Quotation
                  </Button>
                )}
              </div>
            </div>
          </CardFooter>
        </Card>
      ) : (
        // Survey List
        filteredSurveys.length === 0 ? (
          <Card className={glassStyles?.card}>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Surveys Found</h3>
              <p className="text-slate-500 mb-4">Start by creating a new site survey</p>
              <Button onClick={() => { resetSurveyForm(); setShowNewSurvey(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Create First Survey
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSurveys.map(survey => (
              <Card 
                key={survey.id} 
                className={`${glassStyles?.card} hover:shadow-xl transition-all cursor-pointer`}
                onClick={() => setViewingSurvey(survey)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-indigo-100 text-indigo-700 font-mono">#{survey.siteCode}</Badge>
                    <Badge className={statusStyles[survey.status]}>{survey.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{survey.siteName}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3" /> {survey.siteAddress?.substring(0, 40)}...
                  </p>
                  <div className="flex gap-3 text-sm">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {survey.openings?.length || 0} Openings
                    </span>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t text-xs text-slate-400">
                    <span>{new Date(survey.surveyDate).toLocaleDateString()}</span>
                    <span>By: {survey.surveyorName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Survey Creation Options Dialog */}
      <Dialog open={showSurveyOptions} onOpenChange={setShowSurveyOptions}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardCheck className="h-6 w-6 text-indigo-600" />
              Start New Site Survey
            </DialogTitle>
            <DialogDescription>
              Choose how you want to create your site survey
            </DialogDescription>
          </DialogHeader>

          {!surveyCreationMode ? (
            // Option Selection View
            <div className="py-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Option 1: From Project */}
                <Card 
                  className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-indigo-400 group"
                  onClick={() => setSurveyCreationMode('fromProject')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Start from Project</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Select an existing CRM project to auto-fill customer and site details
                    </p>
                    <Badge className="bg-indigo-100 text-indigo-700">
                      {projects?.length || 0} Projects Available
                    </Badge>
                    <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
                      <span>Select Project</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>

                {/* Option 2: Manual Entry */}
                <Card 
                  className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-emerald-400 group"
                  onClick={() => { 
                    resetSurveyForm(); 
                    setShowSurveyOptions(false); 
                    setShowNewSurvey(true); 
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Edit className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Manual Entry</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Start fresh and manually enter all site and customer details
                    </p>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      New Site Survey
                    </Badge>
                    <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-medium group-hover:gap-3 transition-all">
                      <span>Start Fresh</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : surveyCreationMode === 'fromProject' ? (
            // Project Selection View
            <div className="py-4">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSurveyCreationMode(null)}
                >
                  <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Back
                </Button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search projects by name or client..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {projects?.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No projects found</p>
                    <p className="text-sm text-slate-400">Sync projects from CRM first</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects
                      ?.filter(p => 
                        !projectSearchQuery || 
                        p.name?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        p.clientName?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        p.customer?.name?.toLowerCase().includes(projectSearchQuery.toLowerCase())
                      )
                      .map(project => (
                        <Card 
                          key={project.id} 
                          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-indigo-300"
                          onClick={() => {
                            // Auto-fill survey form from project
                            setSurveyForm({
                              ...surveyForm,
                              projectId: project.id,
                              siteCode: generateSiteCode(),
                              siteName: project.name || project.siteName || '',
                              siteAddress: project.siteAddress || project.customer?.address || '',
                              city: project.city || '',
                              pincode: project.pincode || '',
                              buildingType: project.buildingType || '',
                              contactPerson: project.clientName || project.customer?.name || project.contactPerson || '',
                              contactPhone: project.clientPhone || project.customer?.phone || project.contactPhone || '',
                              contactEmail: project.clientEmail || project.customer?.email || project.contactEmail || '',
                              surveyorName: user?.name || '',
                              surveyDate: new Date().toISOString().split('T')[0],
                              status: 'draft'
                            });
                            setSitePhotos([]);
                            setShowSurveyOptions(false);
                            setShowNewSurvey(true);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                                <Building2 className="h-6 w-6 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-800 truncate">{project.name}</h4>
                                  {project.projectNumber && (
                                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                                      {project.projectNumber}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 flex items-center gap-1 mb-1">
                                  <User className="h-3 w-3" /> 
                                  {project.clientName || project.customer?.name || 'No contact'}
                                </p>
                                {(project.siteAddress || project.customer?.address) && (
                                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3 shrink-0" /> 
                                    {(project.siteAddress || project.customer?.address)?.substring(0, 50)}...
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {project.buildingType && (
                                    <Badge variant="secondary" className="text-xs">{project.buildingType}</Badge>
                                  )}
                                  {project.status && (
                                    <Badge variant="outline" className="text-xs">{project.status}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0">
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                  <ClipboardCheck className="h-4 w-4 mr-1" />
                                  Start Survey
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    }
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* New Survey Dialog */}
      <Dialog open={showNewSurvey} onOpenChange={setShowNewSurvey}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              {selectedSurvey ? 'Edit Survey' : surveyForm.projectId ? 'Site Survey from Project' : 'New Site Survey'}
              {surveyForm.siteCode && (
                <Badge className="bg-indigo-100 text-indigo-700 font-mono ml-2">
                  Site Code: {surveyForm.siteCode}
                </Badge>
              )}
            </DialogTitle>
            {surveyForm.projectId && (
              <DialogDescription className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Linked to project: <strong>{surveyForm.siteName}</strong>
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site Name *</Label>
                  <Input
                    value={surveyForm.siteName}
                    onChange={(e) => setSurveyForm({...surveyForm, siteName: e.target.value})}
                    placeholder="e.g., Kumar Residence"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Site Code</Label>
                  <div className="flex gap-2">
                    <Input value={surveyForm.siteCode} readOnly className="font-mono bg-slate-50" />
                    <Button variant="outline" size="sm" onClick={() => setSurveyForm({...surveyForm, siteCode: generateSiteCode()})}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Site Address *</Label>
                  <Textarea
                    value={surveyForm.siteAddress}
                    onChange={(e) => setSurveyForm({...surveyForm, siteAddress: e.target.value})}
                    placeholder="Complete address"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person *</Label>
                  <Input
                    value={surveyForm.contactPerson}
                    onChange={(e) => setSurveyForm({...surveyForm, contactPerson: e.target.value})}
                  />
                </div>
                <PhoneInput
                  label="Contact Phone *"
                  name="contactPhone"
                  value={surveyForm.contactPhone}
                  onChange={(e) => setSurveyForm({...surveyForm, contactPhone: e.target.value})}
                  defaultCountry="IN"
                  required
                />
                <div className="space-y-2">
                  <Label>Surveyor Name *</Label>
                  <Input
                    value={surveyForm.surveyorName}
                    onChange={(e) => setSurveyForm({...surveyForm, surveyorName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Survey Date *</Label>
                  <Input
                    type="date"
                    value={surveyForm.surveyDate}
                    onChange={(e) => setSurveyForm({...surveyForm, surveyDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Building Type</Label>
                  <Select value={surveyForm.buildingType} onValueChange={(v) => setSurveyForm({...surveyForm, buildingType: v})}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {BUILDING_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Floors</Label>
                  <Input
                    type="number"
                    value={surveyForm.totalFloors}
                    onChange={(e) => setSurveyForm({...surveyForm, totalFloors: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <Separator className="my-4" />
              <PhotoGallery 
                photos={sitePhotos}
                onUpload={(newPhotos) => setSitePhotos([...sitePhotos, ...newPhotos])}
                onDelete={(id) => setSitePhotos(sitePhotos.filter(p => p.id !== id))}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowNewSurvey(false)}>Cancel</Button>
            <Button onClick={handleSaveSurvey} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {selectedSurvey ? 'Update' : 'Create Survey'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Dialog with Live Preview */}
      <Dialog open={showOpeningDialog} onOpenChange={setShowOpeningDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-indigo-600" />
              {editingOpening ? 'Edit Opening' : 'Add Opening Measurement'}
              <Badge variant="outline" className="ml-2 font-mono">{openingForm.openingRef}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
            {/* Form Side */}
            <ScrollArea className="pr-4">
              <Tabs value={activeOpeningTab} onValueChange={setActiveOpeningTab} className="space-y-4">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="photos" className="relative">
                    Photos
                    {openingForm.photos?.length > 0 && (
                      <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-emerald-500 text-white text-xs">
                        {openingForm.photos.length}
                      </Badge>
                    )}
                    {(!openingForm.photos || openingForm.photos.length === 0) && (
                      <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">!</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="verify">Verify</TabsTrigger>
                </TabsList>

                <TabsContent value="dimensions" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={openingForm.type} onValueChange={handleOpeningTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Window">🪟 Window</SelectItem>
                          <SelectItem value="Door">🚪 Door</SelectItem>
                          <SelectItem value="Sliding Door">🚪 Sliding Door</SelectItem>
                          <SelectItem value="French Door">🚪 French Door</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={openingForm.category} onValueChange={(v) => setOpeningForm({...openingForm, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Floor *</Label>
                      <Select value={openingForm.floor} onValueChange={(v) => setOpeningForm({...openingForm, floor: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FLOOR_LEVELS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Room *</Label>
                      <Select value={openingForm.room} onValueChange={(v) => setOpeningForm({...openingForm, room: v})}>
                        <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Width (mm) *</Label>
                      <Input
                        type="number"
                        value={openingForm.width}
                        onChange={(e) => setOpeningForm({...openingForm, width: e.target.value})}
                        placeholder="1200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (mm) *</Label>
                      <Input
                        type="number"
                        value={openingForm.height}
                        onChange={(e) => setOpeningForm({...openingForm, height: e.target.value})}
                        placeholder="1500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sill Height (mm)</Label>
                      <Input
                        type="number"
                        value={openingForm.sillHeight}
                        onChange={(e) => setOpeningForm({...openingForm, sillHeight: e.target.value})}
                        placeholder="900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Wall Thickness (mm)</Label>
                      <Input
                        type="number"
                        value={openingForm.wallThickness}
                        onChange={(e) => setOpeningForm({...openingForm, wallThickness: parseInt(e.target.value) || 230})}
                      />
                    </div>
                  </div>

                  {/* Level & Plumb */}
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <Focus className="h-4 w-4" /> Level & Plumb Check
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { key: 'levelTop', label: 'Level Top' },
                        { key: 'levelBottom', label: 'Level Bottom' },
                        { key: 'plumbLeft', label: 'Plumb Left' },
                        { key: 'plumbRight', label: 'Plumb Right' }
                      ].map(check => (
                        <div 
                          key={check.key}
                          className={`p-2 rounded-lg text-center cursor-pointer transition-all ${
                            openingForm[check.key] 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-700'
                          }`}
                          onClick={() => setOpeningForm({...openingForm, [check.key]: !openingForm[check.key]})}
                        >
                          {openingForm[check.key] ? <CheckCircle2 className="h-5 w-5 mx-auto mb-1" /> : <X className="h-5 w-5 mx-auto mb-1" />}
                          <span className="text-xs">{check.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Material</Label>
                      <Select value={openingForm.material} onValueChange={(v) => setOpeningForm({...openingForm, material: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_FAMILIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Panels</Label>
                      <Input
                        type="number"
                        value={openingForm.panels}
                        onChange={(e) => setOpeningForm({...openingForm, panels: parseInt(e.target.value) || 2})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Glass Type</Label>
                      <Select value={openingForm.glassType} onValueChange={(v) => setOpeningForm({...openingForm, glassType: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GLASS_TYPES.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Frame Color</Label>
                      <Select value={openingForm.frameColor} onValueChange={(v) => setOpeningForm({...openingForm, frameColor: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FRAME_COLORS.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border" style={{backgroundColor: c.hex}} />
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Accessories</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <Label>Mosquito Mesh</Label>
                        <Switch checked={openingForm.mesh} onCheckedChange={(v) => setOpeningForm({...openingForm, mesh: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <Label>Safety Grill</Label>
                        <Switch checked={openingForm.grill} onCheckedChange={(v) => setOpeningForm({...openingForm, grill: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <Label>Safety Bars</Label>
                        <Switch checked={openingForm.safetyBars} onCheckedChange={(v) => setOpeningForm({...openingForm, safetyBars: v})} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Photos Tab - 1-5 photos per opening, 1 mandatory */}
                <TabsContent value="photos" className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Camera className="h-4 w-4" /> Opening Photos
                    </h4>
                    <p className="text-sm text-blue-600">
                      Upload 1-5 photos of this opening. <span className="font-semibold">At least 1 photo is required.</span>
                    </p>
                  </div>

                  {/* Photo Upload Area */}
                  <label 
                    className={`block border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      openingForm.photos?.length >= 5 
                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                        : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      multiple
                      className="hidden"
                      disabled={openingForm.photos?.length >= 5 || uploadingPhoto}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length === 0) return
                        
                        const remainingSlots = 5 - (openingForm.photos?.length || 0)
                        const filesToUpload = files.slice(0, remainingSlots)
                        
                        if (files.length > remainingSlots) {
                          toast.warning(`Only ${remainingSlots} more photo${remainingSlots > 1 ? 's' : ''} can be added`)
                        }

                        setUploadingPhoto(true)
                        const newPhotos = []
                        
                        for (const file of filesToUpload) {
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('surveyId', viewingSurvey?.id || '')
                            formData.append('openingRef', openingForm.openingRef)
                            
                            console.log('Uploading photo:', file.name, 'size:', file.size)
                            
                            const res = await fetch(`${API_BASE}/photos`, {
                              method: 'POST',
                              headers: { 
                                'Authorization': headers?.Authorization || ''
                              },
                              body: formData
                            })
                            
                            console.log('Upload response status:', res.status)
                            
                            if (res.ok) {
                              const data = await res.json()
                              console.log('Upload success:', data)
                              newPhotos.push(data.photo)
                            } else {
                              const errorData = await res.json().catch(() => ({}))
                              console.error('Upload failed:', res.status, errorData)
                              toast.error(`Failed to upload ${file.name}: ${errorData.error || res.statusText}`)
                            }
                          } catch (err) {
                            console.error('Photo upload error:', err)
                            toast.error(`Error uploading ${file.name}: ${err.message}`)
                          }
                        }
                        
                        if (newPhotos.length > 0) {
                          setOpeningForm({
                            ...openingForm, 
                            photos: [...(openingForm.photos || []), ...newPhotos],
                            measurements: { ...openingForm.measurements, photoTaken: true }
                          })
                          toast.success(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} uploaded`)
                        }
                        
                        setUploadingPhoto(false)
                        e.target.value = '' // Reset input
                      }}
                    />
                    
                    {uploadingPhoto ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-2" />
                        <p className="text-sm text-slate-600">Uploading...</p>
                      </div>
                    ) : openingForm.photos?.length >= 5 ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                        <p className="text-sm text-slate-600">Maximum 5 photos reached</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-10 w-10 text-indigo-400 mb-2" />
                        <p className="text-sm text-slate-600">Click to upload photos</p>
                        <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP • Max 10MB each</p>
                        <p className="text-xs text-indigo-500 mt-2">
                          {openingForm.photos?.length || 0}/5 photos uploaded
                        </p>
                      </div>
                    )}
                  </label>

                  {/* Photo Preview Grid */}
                  {openingForm.photos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {openingForm.photos.map((photo, idx) => (
                        <div key={photo.id || idx} className="relative group rounded-lg overflow-hidden border">
                          <img 
                            src={photo.url} 
                            alt={`Opening photo ${idx + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(photo.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={async () => {
                                try {
                                  await fetch(`${API_BASE}/photos?id=${photo.id}`, {
                                    method: 'DELETE',
                                    headers
                                  })
                                  setOpeningForm({
                                    ...openingForm,
                                    photos: openingForm.photos.filter(p => p.id !== photo.id),
                                    measurements: { 
                                      ...openingForm.measurements, 
                                      photoTaken: openingForm.photos.length > 1 
                                    }
                                  })
                                  toast.success('Photo removed')
                                } catch (err) {
                                  toast.error('Failed to remove photo')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                            Photo {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photo Status Indicator */}
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    openingForm.photos?.length >= 1 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {openingForm.photos?.length >= 1 ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Photo requirement met ({openingForm.photos.length}/5)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">At least 1 photo is required to save this opening</span>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="verify" className="space-y-4">
                  <MeasurementChecklist 
                    opening={openingForm}
                    onChange={(updates) => setOpeningForm({...openingForm, measurements: {...openingForm.measurements, ...updates}})}
                  />
                  <div className="space-y-2">
                    <Label>Special Notes</Label>
                    <Textarea
                      value={openingForm.specialNotes}
                      onChange={(e) => setOpeningForm({...openingForm, specialNotes: e.target.value})}
                      placeholder="Any special requirements or observations..."
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {/* Live Preview Side */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 flex flex-col">
              <h4 className="font-semibold text-slate-700 mb-4 text-center">Live Preview</h4>
              <div className="flex-1 flex items-center justify-center">
                <OpeningVisualization 
                  opening={openingForm}
                  material={openingForm.material}
                />
              </div>
              {/* Area Calculation */}
              {openingForm.width && openingForm.height && (
                <div className="mt-4 p-4 bg-white rounded-xl text-center">
                  <p className="text-sm text-slate-600">Calculated Area</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {(((parseFloat(openingForm.width)||0) * (parseFloat(openingForm.height)||0)) / 92903.04).toFixed(2)}
                    <span className="text-lg font-normal ml-1">sq.ft</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowOpeningDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveOpening} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingOpening ? 'Update' : 'Add Opening'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Quote Generation Dialog */}
      <Dialog open={showQuoteConfirm} onOpenChange={setShowQuoteConfirm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Generate Quote from Survey
              <Badge className="bg-indigo-100 text-indigo-700 font-mono ml-2">
                #{viewingSurvey?.siteCode}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Review surveyed openings and generate quotation
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-none">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{surveyOpenings.length}</p>
                  <p className="text-xs text-blue-600">Openings</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-none">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {surveyOpenings.filter(o => o.type === 'Window').length}
                  </p>
                  <p className="text-xs text-purple-600">Windows</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-none">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {surveyOpenings.filter(o => o.type !== 'Window').length}
                  </p>
                  <p className="text-xs text-amber-600">Doors</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-none">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{totalOpeningsArea.toFixed(1)}</p>
                  <p className="text-xs text-emerald-600">Total Sq.Ft</p>
                </CardContent>
              </Card>
            </div>

            {/* Openings to be Quoted */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-700">Openings to be Quoted</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setShowQuoteConfirm(false); resetOpeningForm(); setShowOpeningDialog(true); }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add More
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-3">
                {surveyOpenings.map((opening, idx) => (
                  <div 
                    key={opening.id || idx}
                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                      opening.type === 'Window' 
                        ? 'bg-blue-100' 
                        : 'bg-amber-100'
                    }`}>
                      {opening.type === 'Window' ? '🪟' : '🚪'}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                          {opening.openingRef}
                        </span>
                        <span className="font-medium text-slate-800">
                          {opening.type} - {opening.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {opening.room} • {opening.floor} • {opening.material}
                      </p>
                    </div>
                    
                    {/* Dimensions */}
                    <div className="text-right">
                      <p className="font-mono text-sm text-slate-700">
                        {opening.width} × {opening.height} mm
                      </p>
                      <p className="text-xs text-slate-500">
                        {(((parseFloat(opening.width) || 0) * (parseFloat(opening.height) || 0)) / 92903.04).toFixed(2)} sq.ft
                      </p>
                    </div>
                    
                    {/* Accessories */}
                    <div className="flex gap-1">
                      {opening.mesh && <Badge variant="secondary" className="text-xs">Mesh</Badge>}
                      {opening.grill && <Badge variant="secondary" className="text-xs">Grill</Badge>}
                    </div>
                  </div>
                ))}
                
                {surveyOpenings.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Ruler className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No openings in this survey</p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => { setShowQuoteConfirm(false); resetOpeningForm(); setShowOpeningDialog(true); }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Opening
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Customer Info */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Quote will be generated for:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-600">Customer:</span>{' '}
                  <span className="font-medium text-blue-900">{viewingSurvey?.contactPerson}</span>
                </div>
                <div>
                  <span className="text-blue-600">Phone:</span>{' '}
                  <span className="font-medium text-blue-900">{viewingSurvey?.contactPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-blue-600">Site:</span>{' '}
                  <span className="font-medium text-blue-900">{viewingSurvey?.siteAddress}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowQuoteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendForQuote} 
              disabled={creatingQuote || surveyOpenings.length === 0}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              {creatingQuote ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Quote...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate Quote ({surveyOpenings.length} items)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
