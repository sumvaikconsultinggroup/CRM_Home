'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Building, Warehouse, Factory, GraduationCap, Hotel, Church
} from 'lucide-react'
import { toast } from 'sonner'
import { BUILDING_TYPES, FLOOR_LEVELS, ROOM_TYPES, CATEGORIES, PRODUCT_TYPES, GLASS_TYPES, PRODUCT_FAMILIES, FINISHES, FRAME_COLORS } from './constants'

const API_BASE = '/api/modules/doors-windows'

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  'sent-for-quote': 'bg-purple-100 text-purple-700'
}

// Site condition options
const SITE_CONDITIONS = [
  'Excellent - Ready for immediate installation',
  'Good - Minor prep work needed',
  'Fair - Some remediation required',
  'Poor - Significant work needed before installation',
  'Under Construction - Coordination required'
]

// Existing frame types
const EXISTING_FRAME_TYPES = [
  'None - New Construction',
  'Aluminium Sliding',
  'Aluminium Casement',
  'Steel Windows',
  'Wooden Frames',
  'uPVC Windows',
  'Iron Grill Only',
  'Mixed Types',
  'Unknown - Needs Assessment'
]

// Building orientation options
const ORIENTATIONS = [
  { id: 'north', label: 'North', icon: '🧭' },
  { id: 'south', label: 'South', icon: '☀️' },
  { id: 'east', label: 'East', icon: '🌅' },
  { id: 'west', label: 'West', icon: '🌇' },
  { id: 'north-east', label: 'North-East', icon: '↗️' },
  { id: 'north-west', label: 'North-West', icon: '↖️' },
  { id: 'south-east', label: 'South-East', icon: '↘️' },
  { id: 'south-west', label: 'South-West', icon: '↙️' }
]

// Environmental factors
const ENVIRONMENTAL_FACTORS = [
  { id: 'highWind', label: 'High Wind Area', icon: Wind },
  { id: 'coastal', label: 'Coastal/Salt Air', icon: Droplets },
  { id: 'heavyRain', label: 'Heavy Rainfall Zone', icon: CloudRain },
  { id: 'dusty', label: 'Dusty Environment', icon: Mountain },
  { id: 'noisy', label: 'High Noise Area', icon: Volume2 },
  { id: 'hotClimate', label: 'Extreme Heat', icon: Thermometer },
  { id: 'security', label: 'Security Sensitive', icon: Shield },
  { id: 'heritage', label: 'Heritage Building', icon: Church }
]

// Generate 6-digit site code
const generateSiteCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Opening types with icons
const OPENING_TYPE_ICONS = {
  'Window': '🪟',
  'Door': '🚪',
  'Sliding Door': '🚪',
  'French Door': '🚪',
  'Balcony Door': '🚪',
  'Main Entrance': '🏠',
  'Partition': '▦',
  'Skylight': '🔲',
  'Ventilator': '💨'
}

export function SiteSurvey({ surveys, projects, selectedProject, onRefresh, headers, user, glassStyles }) {
  // Main states
  const [showNewSurvey, setShowNewSurvey] = useState(false)
  const [showOpeningDialog, setShowOpeningDialog] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [viewingSurvey, setViewingSurvey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [surveyOpenings, setSurveyOpenings] = useState([])
  const [loadingOpenings, setLoadingOpenings] = useState(false)
  const [activeFormTab, setActiveFormTab] = useState('basic')
  const [editingOpening, setEditingOpening] = useState(null)
  const [showQuoteConfirm, setShowQuoteConfirm] = useState(false)
  const [creatingQuote, setCreatingQuote] = useState(false)
  const [expandedOpening, setExpandedOpening] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  // Comprehensive Survey Form State
  const [surveyForm, setSurveyForm] = useState({
    // Basic Info
    projectId: '',
    siteCode: '', // Auto-generated 6-digit code
    siteName: '',
    siteAddress: '',
    city: '',
    pincode: '',
    landmark: '',
    gpsCoordinates: '',
    
    // Building Details
    buildingType: '',
    buildingAge: '',
    totalFloors: 1,
    basementFloors: 0,
    buildingOrientation: '',
    plotArea: '',
    builtUpArea: '',
    
    // Contact Info
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    alternateContact: '',
    siteIncharge: '',
    siteInchargePhone: '',
    
    // Surveyor Details
    surveyorName: '',
    surveyorPhone: '',
    surveyorEmail: '',
    surveyDate: new Date().toISOString().split('T')[0],
    surveyStartTime: '',
    surveyEndTime: '',
    
    // Site Assessment
    siteConditions: '',
    accessRestrictions: '',
    existingFrameType: '',
    existingFrameCondition: '',
    demolitionRequired: false,
    demolitionNotes: '',
    
    // Environmental Factors
    environmentalFactors: [],
    noiseLevel: 'normal',
    sunExposure: 'moderate',
    
    // Infrastructure
    powerAvailable: true,
    powerDetails: '',
    waterAvailable: true,
    waterDetails: '',
    liftAvailable: false,
    liftDetails: '',
    craneLiftRequired: false,
    scaffoldingRequired: false,
    parkingAvailable: true,
    parkingNotes: '',
    materialStorageSpace: true,
    storageNotes: '',
    
    // Work Permissions
    workingHoursRestriction: false,
    workingHoursDetails: '',
    weekendWorkAllowed: true,
    societyPermission: false,
    societyPermissionDetails: '',
    noiseRestrictions: false,
    noiseRestrictionTimes: '',
    
    // Client Requirements
    primaryRequirement: '',
    budgetRange: '',
    expectedTimeline: '',
    priorityFeatures: [],
    aestheticPreference: '',
    brandPreference: '',
    
    // Measurements Summary
    totalOpenings: 0,
    totalWindowOpenings: 0,
    totalDoorOpenings: 0,
    estimatedArea: 0,
    
    // Notes & Media
    scopeSummary: '',
    specialInstructions: '',
    competitorQuotes: false,
    competitorDetails: '',
    photos: [],
    documents: [],
    
    // Status
    status: 'draft'
  })

  // Enhanced Opening Form State
  const [openingForm, setOpeningForm] = useState({
    surveyId: '',
    openingRef: '', // e.g., W1, W2, D1, D2
    floor: 'Ground Floor',
    room: '',
    roomSubArea: '', // e.g., "Near Balcony", "Adjacent to Kitchen"
    wallType: 'RCC', // RCC, Brick, Glass, Partition
    wallThickness: 230, // mm
    
    // Opening Type & Category
    type: 'Window',
    category: 'Sliding',
    subCategory: '', // e.g., "2-Track", "3-Track" for sliding
    
    // Precise Dimensions (all in mm)
    width: '',
    height: '',
    sillHeight: '',
    lintelHeight: '',
    leftClearance: '',
    rightClearance: '',
    topClearance: '',
    bottomClearance: '',
    
    // Configuration
    panels: 2,
    trackCount: 2,
    openableCount: 1,
    fixedCount: 1,
    
    // Material Preferences
    material: 'Aluminium',
    profileSeries: '',
    glassType: 'single',
    glassThickness: '',
    glassColor: '',
    frameColor: 'white',
    handlePosition: 'center',
    
    // Accessories
    mesh: false,
    meshType: '',
    grill: false,
    grillType: '',
    blinds: false,
    blindsType: '',
    safetyBars: false,
    
    // Environmental
    facingDirection: '',
    directSunlight: false,
    rainExposure: false,
    windExposure: false,
    
    // Existing Opening
    hasExisting: false,
    existingType: '',
    existingCondition: '',
    existingToRemove: false,
    
    // Installation Notes
    installationChallenges: '',
    accessDifficulty: 'easy', // easy, moderate, difficult, crane-required
    
    // Photos
    photoRefs: [],
    
    // Priority & Notes
    priority: 'normal', // urgent, high, normal, low
    specialNotes: '',
    clientNotes: ''
  })

  // Fetch openings when viewing a survey
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
    const newSiteCode = generateSiteCode()
    setSurveyForm({
      projectId: selectedProject?.id || '',
      siteCode: newSiteCode,
      siteName: selectedProject?.siteName || selectedProject?.name || '',
      siteAddress: selectedProject?.siteAddress || '',
      city: '',
      pincode: '',
      landmark: '',
      gpsCoordinates: '',
      buildingType: selectedProject?.buildingType || '',
      buildingAge: '',
      totalFloors: 1,
      basementFloors: 0,
      buildingOrientation: '',
      plotArea: '',
      builtUpArea: '',
      contactPerson: selectedProject?.contactPerson || selectedProject?.clientName || '',
      contactPhone: selectedProject?.contactPhone || selectedProject?.clientPhone || '',
      contactEmail: selectedProject?.contactEmail || selectedProject?.clientEmail || '',
      alternateContact: '',
      siteIncharge: '',
      siteInchargePhone: '',
      surveyorName: user?.name || '',
      surveyorPhone: user?.phone || '',
      surveyorEmail: user?.email || '',
      surveyDate: new Date().toISOString().split('T')[0],
      surveyStartTime: '',
      surveyEndTime: '',
      siteConditions: '',
      accessRestrictions: '',
      existingFrameType: '',
      existingFrameCondition: '',
      demolitionRequired: false,
      demolitionNotes: '',
      environmentalFactors: [],
      noiseLevel: 'normal',
      sunExposure: 'moderate',
      powerAvailable: true,
      powerDetails: '',
      waterAvailable: true,
      waterDetails: '',
      liftAvailable: false,
      liftDetails: '',
      craneLiftRequired: false,
      scaffoldingRequired: false,
      parkingAvailable: true,
      parkingNotes: '',
      materialStorageSpace: true,
      storageNotes: '',
      workingHoursRestriction: false,
      workingHoursDetails: '',
      weekendWorkAllowed: true,
      societyPermission: false,
      societyPermissionDetails: '',
      noiseRestrictions: false,
      noiseRestrictionTimes: '',
      primaryRequirement: '',
      budgetRange: '',
      expectedTimeline: '',
      priorityFeatures: [],
      aestheticPreference: '',
      brandPreference: '',
      totalOpenings: 0,
      totalWindowOpenings: 0,
      totalDoorOpenings: 0,
      estimatedArea: 0,
      scopeSummary: '',
      specialInstructions: '',
      competitorQuotes: false,
      competitorDetails: '',
      photos: [],
      documents: [],
      status: 'draft'
    })
    setSelectedSurvey(null)
    setActiveFormTab('basic')
  }, [selectedProject, user])

  const resetOpeningForm = useCallback(() => {
    const windowCount = surveyOpenings.filter(o => o.type === 'Window').length + 1
    const doorCount = surveyOpenings.filter(o => o.type === 'Door' || o.type?.includes('Door')).length + 1
    
    setOpeningForm({
      surveyId: viewingSurvey?.id || '',
      openingRef: `W${windowCount}`,
      floor: 'Ground Floor',
      room: '',
      roomSubArea: '',
      wallType: 'RCC',
      wallThickness: 230,
      type: 'Window',
      category: 'Sliding',
      subCategory: '',
      width: '',
      height: '',
      sillHeight: '',
      lintelHeight: '',
      leftClearance: '',
      rightClearance: '',
      topClearance: '',
      bottomClearance: '',
      panels: 2,
      trackCount: 2,
      openableCount: 1,
      fixedCount: 1,
      material: 'Aluminium',
      profileSeries: '',
      glassType: 'single',
      glassThickness: '',
      glassColor: '',
      frameColor: 'white',
      handlePosition: 'center',
      mesh: false,
      meshType: '',
      grill: false,
      grillType: '',
      blinds: false,
      blindsType: '',
      safetyBars: false,
      facingDirection: '',
      directSunlight: false,
      rainExposure: false,
      windExposure: false,
      hasExisting: false,
      existingType: '',
      existingCondition: '',
      existingToRemove: false,
      installationChallenges: '',
      accessDifficulty: 'easy',
      photoRefs: [],
      priority: 'normal',
      specialNotes: '',
      clientNotes: ''
    })
    setEditingOpening(null)
  }, [viewingSurvey, surveyOpenings])

  // Update opening ref when type changes
  const handleOpeningTypeChange = (type) => {
    const isWindow = type === 'Window'
    const prefix = isWindow ? 'W' : 'D'
    const existingCount = surveyOpenings.filter(o => 
      isWindow ? o.type === 'Window' : (o.type === 'Door' || o.type?.includes('Door'))
    ).length + (editingOpening ? 0 : 1)
    
    setOpeningForm(prev => ({
      ...prev,
      type,
      openingRef: `${prefix}${existingCount}`
    }))
  }

  const handleSaveSurvey = async () => {
    // Validate mandatory fields
    if (!surveyForm.surveyorName?.trim()) {
      toast.error('Surveyor Name is mandatory!')
      return
    }
    if (!surveyForm.siteName && !surveyForm.siteAddress) {
      toast.error('Please enter site name or address')
      return
    }
    if (!surveyForm.contactPerson || !surveyForm.contactPhone) {
      toast.error('Contact person and phone are required')
      return
    }

    setSaving(true)
    try {
      const method = selectedSurvey ? 'PUT' : 'POST'
      const body = { 
        ...surveyForm,
        // Ensure site code is set
        siteCode: surveyForm.siteCode || generateSiteCode()
      }
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
        
        // If new survey, open it for adding openings
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

  const handleSaveOpening = async () => {
    if (!openingForm.width || !openingForm.height) {
      toast.error('Please enter width and height')
      return
    }
    if (!openingForm.room) {
      toast.error('Please select the room/location')
      return
    }

    setSaving(true)
    try {
      const action = editingOpening ? 'update-opening' : 'add-opening'
      const body = {
        action,
        surveyId: viewingSurvey.id,
        ...openingForm,
        // Calculate area in sq.ft
        areaSqft: ((parseFloat(openingForm.width) || 0) * (parseFloat(openingForm.height) || 0)) / 92903.04
      }
      
      if (editingOpening) {
        body.openingId = editingOpening.id
      }

      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingOpening ? 'Opening updated' : 'Opening added')
        setShowOpeningDialog(false)
        resetOpeningForm()
        fetchSurveyOpenings(viewingSurvey.id)
        onRefresh()
      } else {
        toast.error(data.error || 'Failed to save opening')
      }
    } catch (error) {
      toast.error('Failed to save opening')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOpening = async (openingId) => {
    if (!confirm('Delete this opening measurement?')) return
    
    try {
      const res = await fetch(`${API_BASE}/surveys?id=${openingId}&type=opening`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        toast.success('Opening deleted')
        fetchSurveyOpenings(viewingSurvey.id)
        onRefresh()
      }
    } catch (error) {
      toast.error('Failed to delete opening')
    }
  }

  const handleEditOpening = (opening) => {
    setEditingOpening(opening)
    setOpeningForm({
      ...openingForm,
      ...opening,
      surveyId: viewingSurvey.id
    })
    setShowOpeningDialog(true)
  }

  const handleCompleteSurvey = async (surveyId) => {
    try {
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: surveyId, status: 'completed' })
      })

      if (res.ok) {
        toast.success('Survey marked as complete')
        onRefresh()
        setViewingSurvey(null)
      }
    } catch (error) {
      toast.error('Failed to update survey')
    }
  }

  const handleSendForQuote = async () => {
    if (!viewingSurvey || surveyOpenings.length === 0) {
      toast.error('Survey must have at least one opening to send for quote')
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
        // Update survey status
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
      console.error('Quote creation error:', error)
      toast.error('Failed to create quote')
    } finally {
      setCreatingQuote(false)
    }
  }

  const handleDuplicateSurvey = (survey) => {
    const newSiteCode = generateSiteCode()
    setSurveyForm({
      ...survey,
      id: undefined,
      siteCode: newSiteCode,
      surveyDate: new Date().toISOString().split('T')[0],
      surveyorName: user?.name || '',
      status: 'draft'
    })
    setSelectedSurvey(null)
    setShowNewSurvey(true)
    toast.info(`Duplicating survey with new Site Code: ${newSiteCode}`)
  }

  const handleEditSurvey = (survey) => {
    setSurveyForm({
      ...surveyForm,
      ...survey
    })
    setSelectedSurvey(survey)
    setShowNewSurvey(true)
  }

  // Filter surveys
  const filteredSurveys = surveys?.filter(s => {
    const matchesSearch = !searchQuery || 
      s.siteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteCode?.includes(searchQuery) ||
      s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteAddress?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesProject = !selectedProject || s.projectId === selectedProject.id
    return matchesSearch && matchesStatus && matchesProject
  }) || []

  // Calculate stats
  const surveyStats = {
    total: surveys?.length || 0,
    completed: surveys?.filter(s => s.status === 'completed').length || 0,
    inProgress: surveys?.filter(s => s.status === 'in-progress').length || 0,
    sentForQuote: surveys?.filter(s => s.status === 'sent-for-quote').length || 0,
    draft: surveys?.filter(s => s.status === 'draft').length || 0
  }

  // Calculate total openings area
  const totalOpeningsArea = surveyOpenings.reduce((sum, o) => {
    return sum + (((parseFloat(o.width) || 0) * (parseFloat(o.height) || 0)) / 92903.04)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Site Survey Management</h2>
          <p className="text-slate-500">Comprehensive site assessment for accurate quotations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-slate-50">
            Total: {surveyStats.total}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
            Completed: {surveyStats.completed}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            Sent for Quote: {surveyStats.sentForQuote}
          </Badge>
          <Button onClick={() => { resetSurveyForm(); setShowNewSurvey(true); }} className="bg-gradient-to-r from-indigo-600 to-purple-600">
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
                placeholder="Search by site name, code, address or contact..."
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

      {/* Survey List / Detail View */}
      {viewingSurvey ? (
        // Detailed Survey View with Openings
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
                      <Hash className="h-3 w-3 mr-1" />
                      {viewingSurvey.siteCode}
                    </Badge>
                    <Badge className={statusStyles[viewingSurvey.status]}>
                      {viewingSurvey.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" /> {viewingSurvey.siteAddress}
                    <span className="mx-2">•</span>
                    <Phone className="h-3 w-3" /> {viewingSurvey.contactPerson}: {viewingSurvey.contactPhone}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditSurvey(viewingSurvey)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit Survey
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDuplicateSurvey(viewingSurvey)}>
                  <Copy className="h-4 w-4 mr-1" /> Duplicate
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Survey Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

            {/* Openings Management */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Opening Measurements</h3>
              <Button onClick={() => { resetOpeningForm(); setShowOpeningDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Opening
              </Button>
            </div>

            {loadingOpenings ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-slate-500 mt-2">Loading openings...</p>
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
              <div className="space-y-3">
                {surveyOpenings.map((opening, idx) => (
                  <Card key={opening.id || idx} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl">
                            {OPENING_TYPE_ICONS[opening.type] || '🪟'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">
                                {opening.openingRef || `${opening.type === 'Window' ? 'W' : 'D'}${idx + 1}`}
                              </span>
                              <h4 className="font-semibold text-slate-800">
                                {opening.type} - {opening.category}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {opening.material}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              {opening.room} • {opening.floor}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm">
                              <span className="text-slate-600">
                                <strong>Size:</strong> {opening.width} × {opening.height} mm
                              </span>
                              <span className="text-slate-600">
                                <strong>Area:</strong> {(((opening.width || 0) * (opening.height || 0)) / 92903.04).toFixed(2)} sqft
                              </span>
                              <span className="text-slate-600">
                                <strong>Panels:</strong> {opening.panels}
                              </span>
                              <span className="text-slate-600">
                                <strong>Glass:</strong> {GLASS_TYPES.find(g => g.id === opening.glassType)?.name || opening.glassType}
                              </span>
                            </div>
                            {(opening.mesh || opening.grill || opening.safetyBars) && (
                              <div className="flex gap-2 mt-2">
                                {opening.mesh && <Badge variant="secondary" className="text-xs">+ Mesh</Badge>}
                                {opening.grill && <Badge variant="secondary" className="text-xs">+ Grill</Badge>}
                                {opening.safetyBars && <Badge variant="secondary" className="text-xs">+ Safety Bars</Badge>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpening(opening)}>
                            <Edit className="h-4 w-4 text-indigo-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteOpening(opening.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t bg-slate-50 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-slate-500">
                Survey completed by: <strong>{viewingSurvey.surveyorName}</strong> on {new Date(viewingSurvey.surveyDate).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                {viewingSurvey.status !== 'completed' && viewingSurvey.status !== 'sent-for-quote' && (
                  <Button variant="outline" onClick={() => handleCompleteSurvey(viewingSurvey.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                  </Button>
                )}
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
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-100 text-indigo-700 font-mono text-xs">
                        #{survey.siteCode}
                      </Badge>
                      <Badge className={statusStyles[survey.status]}>
                        {survey.status}
                      </Badge>
                    </div>
                    <div className="flex -space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); handleEditSurvey(survey); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-slate-800 mb-1">{survey.siteName}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3" /> {survey.siteAddress?.substring(0, 50)}...
                  </p>

                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {survey.contactPerson}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {survey.contactPhone}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {survey.openings?.length || 0} Openings
                    </span>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
                      {survey.estimatedArea?.toFixed(0) || 0} sqft
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-slate-400">
                      {new Date(survey.surveyDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-slate-500">
                      By: {survey.surveyorName}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* New/Edit Survey Dialog */}
      <Dialog open={showNewSurvey} onOpenChange={setShowNewSurvey}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              {selectedSurvey ? 'Edit Site Survey' : 'New Site Survey'}
              {surveyForm.siteCode && (
                <Badge className="bg-indigo-100 text-indigo-700 font-mono ml-2">
                  Site Code: {surveyForm.siteCode}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete comprehensive site assessment for accurate quotation
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="building">Building</TabsTrigger>
              <TabsTrigger value="site">Site Assessment</TabsTrigger>
              <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Link to Project</Label>
                    <Select 
                      value={surveyForm.projectId || '__none__'} 
                      onValueChange={(v) => {
                        const proj = projects?.find(p => p.id === v)
                        setSurveyForm({
                          ...surveyForm,
                          projectId: v === '__none__' ? '' : v,
                          siteName: proj?.siteName || proj?.name || surveyForm.siteName,
                          siteAddress: proj?.siteAddress || surveyForm.siteAddress,
                          contactPerson: proj?.contactPerson || proj?.clientName || surveyForm.contactPerson,
                          contactPhone: proj?.contactPhone || proj?.clientPhone || surveyForm.contactPhone,
                          contactEmail: proj?.contactEmail || surveyForm.contactEmail
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Project Link</SelectItem>
                        {projects?.filter(p => p.source !== 'crm_sync' || p.crmProjectId).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name || p.siteName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Site Name *</Label>
                    <Input
                      value={surveyForm.siteName}
                      onChange={(e) => setSurveyForm({ ...surveyForm, siteName: e.target.value })}
                      placeholder="e.g., Kumar Residence, ABC Office"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Site Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={surveyForm.siteCode}
                        readOnly
                        className="font-mono bg-slate-50"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSurveyForm({ ...surveyForm, siteCode: generateSiteCode() })}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Site Address *</Label>
                    <Textarea
                      value={surveyForm.siteAddress}
                      onChange={(e) => setSurveyForm({ ...surveyForm, siteAddress: e.target.value })}
                      placeholder="Complete address with building name, floor, etc."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={surveyForm.city}
                      onChange={(e) => setSurveyForm({ ...surveyForm, city: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      value={surveyForm.pincode}
                      onChange={(e) => setSurveyForm({ ...surveyForm, pincode: e.target.value })}
                    />
                  </div>

                  <Separator className="col-span-2 my-2" />
                  
                  <div className="space-y-2">
                    <Label>Contact Person *</Label>
                    <Input
                      value={surveyForm.contactPerson}
                      onChange={(e) => setSurveyForm({ ...surveyForm, contactPerson: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contact Phone *</Label>
                    <Input
                      value={surveyForm.contactPhone}
                      onChange={(e) => setSurveyForm({ ...surveyForm, contactPhone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={surveyForm.contactEmail}
                      onChange={(e) => setSurveyForm({ ...surveyForm, contactEmail: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Alternate Contact</Label>
                    <Input
                      value={surveyForm.alternateContact}
                      onChange={(e) => setSurveyForm({ ...surveyForm, alternateContact: e.target.value })}
                    />
                  </div>

                  <Separator className="col-span-2 my-2" />
                  
                  <div className="space-y-2">
                    <Label>Surveyor Name *</Label>
                    <Input
                      value={surveyForm.surveyorName}
                      onChange={(e) => setSurveyForm({ ...surveyForm, surveyorName: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Survey Date *</Label>
                    <Input
                      type="date"
                      value={surveyForm.surveyDate}
                      onChange={(e) => setSurveyForm({ ...surveyForm, surveyDate: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Building Details Tab */}
              <TabsContent value="building" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Building Type</Label>
                    <Select 
                      value={surveyForm.buildingType} 
                      onValueChange={(v) => setSurveyForm({ ...surveyForm, buildingType: v })}
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
                    <Label>Building Age (Years)</Label>
                    <Input
                      value={surveyForm.buildingAge}
                      onChange={(e) => setSurveyForm({ ...surveyForm, buildingAge: e.target.value })}
                      placeholder="e.g., 5, New Construction"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Floors</Label>
                    <Input
                      type="number"
                      value={surveyForm.totalFloors}
                      onChange={(e) => setSurveyForm({ ...surveyForm, totalFloors: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Basement Floors</Label>
                    <Input
                      type="number"
                      value={surveyForm.basementFloors}
                      onChange={(e) => setSurveyForm({ ...surveyForm, basementFloors: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Building Orientation</Label>
                    <Select 
                      value={surveyForm.buildingOrientation} 
                      onValueChange={(v) => setSurveyForm({ ...surveyForm, buildingOrientation: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select orientation" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIENTATIONS.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.icon} {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Plot Area (sq.ft)</Label>
                    <Input
                      value={surveyForm.plotArea}
                      onChange={(e) => setSurveyForm({ ...surveyForm, plotArea: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Site Assessment Tab */}
              <TabsContent value="site" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Site Conditions</Label>
                    <Select 
                      value={surveyForm.siteConditions} 
                      onValueChange={(v) => setSurveyForm({ ...surveyForm, siteConditions: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assess site readiness" />
                      </SelectTrigger>
                      <SelectContent>
                        {SITE_CONDITIONS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Existing Frame Type</Label>
                    <Select 
                      value={surveyForm.existingFrameType} 
                      onValueChange={(v) => setSurveyForm({ ...surveyForm, existingFrameType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Current frame type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXISTING_FRAME_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Environmental Factors</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {ENVIRONMENTAL_FACTORS.map(factor => (
                        <div
                          key={factor.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            surveyForm.environmentalFactors?.includes(factor.id)
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            const factors = surveyForm.environmentalFactors || []
                            setSurveyForm({
                              ...surveyForm,
                              environmentalFactors: factors.includes(factor.id)
                                ? factors.filter(f => f !== factor.id)
                                : [...factors, factor.id]
                            })
                          }}
                        >
                          <factor.icon className={`h-5 w-5 mb-1 ${
                            surveyForm.environmentalFactors?.includes(factor.id) ? 'text-indigo-600' : 'text-slate-400'
                          }`} />
                          <p className="text-xs font-medium">{factor.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center gap-4 p-3 bg-amber-50 rounded-lg">
                    <Switch
                      checked={surveyForm.demolitionRequired}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, demolitionRequired: v })}
                    />
                    <div>
                      <Label>Demolition/Removal Required</Label>
                      <p className="text-xs text-amber-700">Existing frames need to be removed</p>
                    </div>
                  </div>

                  {surveyForm.demolitionRequired && (
                    <div className="col-span-2 space-y-2">
                      <Label>Demolition Notes</Label>
                      <Textarea
                        value={surveyForm.demolitionNotes}
                        onChange={(e) => setSurveyForm({ ...surveyForm, demolitionNotes: e.target.value })}
                        placeholder="Details about existing frame removal..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Infrastructure Tab */}
              <TabsContent value="infrastructure" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <Label>Power Available</Label>
                    </div>
                    <Switch
                      checked={surveyForm.powerAvailable}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, powerAvailable: v })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-5 w-5 text-blue-600" />
                      <Label>Water Available</Label>
                    </div>
                    <Switch
                      checked={surveyForm.waterAvailable}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, waterAvailable: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      <Label>Lift Available</Label>
                    </div>
                    <Switch
                      checked={surveyForm.liftAvailable}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, liftAvailable: v })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-slate-600" />
                      <Label>Parking Available</Label>
                    </div>
                    <Switch
                      checked={surveyForm.parkingAvailable}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, parkingAvailable: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Move3d className="h-5 w-5 text-amber-600" />
                      <Label>Crane/Lift Required</Label>
                    </div>
                    <Switch
                      checked={surveyForm.craneLiftRequired}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, craneLiftRequired: v })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-amber-600" />
                      <Label>Scaffolding Required</Label>
                    </div>
                    <Switch
                      checked={surveyForm.scaffoldingRequired}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, scaffoldingRequired: v })}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Access Restrictions / Notes</Label>
                    <Textarea
                      value={surveyForm.accessRestrictions}
                      onChange={(e) => setSurveyForm({ ...surveyForm, accessRestrictions: e.target.value })}
                      placeholder="Any access issues, narrow passages, time restrictions..."
                      rows={2}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Requirements Tab */}
              <TabsContent value="requirements" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Primary Requirement</Label>
                    <Textarea
                      value={surveyForm.primaryRequirement}
                      onChange={(e) => setSurveyForm({ ...surveyForm, primaryRequirement: e.target.value })}
                      placeholder="What is the main purpose/requirement?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Budget Range</Label>
                    <Select 
                      value={surveyForm.budgetRange} 
                      onValueChange={(v) => setSurveyForm({ ...surveyForm, budgetRange: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy (₹300-500/sqft)</SelectItem>
                        <SelectItem value="standard">Standard (₹500-800/sqft)</SelectItem>
                        <SelectItem value="premium">Premium (₹800-1200/sqft)</SelectItem>
                        <SelectItem value="luxury">Luxury (₹1200+/sqft)</SelectItem>
                        <SelectItem value="not-disclosed">Not Disclosed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Expected Timeline</Label>
                    <Select 
                      value={surveyForm.expectedTimeline} 
                      onValueChange={(v) => setSurveyForm({ ...surveyForm, expectedTimeline: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent (1-2 weeks)</SelectItem>
                        <SelectItem value="standard">Standard (4-6 weeks)</SelectItem>
                        <SelectItem value="flexible">Flexible (2-3 months)</SelectItem>
                        <SelectItem value="planning">Just Planning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Scope Summary</Label>
                    <Textarea
                      value={surveyForm.scopeSummary}
                      onChange={(e) => setSurveyForm({ ...surveyForm, scopeSummary: e.target.value })}
                      placeholder="Summary of work scope, special requirements, etc."
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <Switch
                      checked={surveyForm.competitorQuotes}
                      onCheckedChange={(v) => setSurveyForm({ ...surveyForm, competitorQuotes: v })}
                    />
                    <div>
                      <Label>Competitor Quotes Received</Label>
                      <p className="text-xs text-slate-500">Customer has quotes from other vendors</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowNewSurvey(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSurvey} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {selectedSurvey ? 'Update Survey' : 'Create Survey'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Dialog */}
      <Dialog open={showOpeningDialog} onOpenChange={setShowOpeningDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-indigo-600" />
              {editingOpening ? 'Edit Opening' : 'Add Opening Measurement'}
              <Badge variant="outline" className="ml-2 font-mono">{openingForm.openingRef}</Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-3 gap-4 py-4">
              {/* Type & Category */}
              <div className="space-y-2">
                <Label>Opening Type *</Label>
                <Select 
                  value={openingForm.type} 
                  onValueChange={handleOpeningTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Window">🪟 Window</SelectItem>
                    <SelectItem value="Door">🚪 Door</SelectItem>
                    <SelectItem value="Sliding Door">🚪 Sliding Door</SelectItem>
                    <SelectItem value="French Door">🚪 French Door</SelectItem>
                    <SelectItem value="Main Entrance">🏠 Main Entrance</SelectItem>
                    <SelectItem value="Partition">▦ Partition</SelectItem>
                    <SelectItem value="Skylight">🔲 Skylight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={openingForm.category} 
                  onValueChange={(v) => setOpeningForm({ ...openingForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Material *</Label>
                <Select 
                  value={openingForm.material} 
                  onValueChange={(v) => setOpeningForm({ ...openingForm, material: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_FAMILIES.map(mat => (
                      <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Floor *</Label>
                <Select 
                  value={openingForm.floor} 
                  onValueChange={(v) => setOpeningForm({ ...openingForm, floor: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOOR_LEVELS.map(floor => (
                      <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Room *</Label>
                <Select 
                  value={openingForm.room} 
                  onValueChange={(v) => setOpeningForm({ ...openingForm, room: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(room => (
                      <SelectItem key={room} value={room}>{room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Sub-Area</Label>
                <Input
                  value={openingForm.roomSubArea}
                  onChange={(e) => setOpeningForm({ ...openingForm, roomSubArea: e.target.value })}
                  placeholder="e.g., Near Balcony"
                />
              </div>

              <Separator className="col-span-3 my-2" />

              {/* Dimensions */}
              <div className="col-span-3">
                <Label className="text-base font-semibold mb-3 block">Dimensions (in mm)</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Width (mm) *</Label>
                <Input
                  type="number"
                  value={openingForm.width}
                  onChange={(e) => setOpeningForm({ ...openingForm, width: e.target.value })}
                  placeholder="e.g., 1200"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Height (mm) *</Label>
                <Input
                  type="number"
                  value={openingForm.height}
                  onChange={(e) => setOpeningForm({ ...openingForm, height: e.target.value })}
                  placeholder="e.g., 1500"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Sill Height (mm)</Label>
                <Input
                  type="number"
                  value={openingForm.sillHeight}
                  onChange={(e) => setOpeningForm({ ...openingForm, sillHeight: e.target.value })}
                  placeholder="Height from floor"
                />
              </div>

              {/* Configuration */}
              <div className="space-y-2">
                <Label>Panels</Label>
                <Input
                  type="number"
                  value={openingForm.panels}
                  onChange={(e) => setOpeningForm({ ...openingForm, panels: parseInt(e.target.value) || 2 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Glass Type</Label>
                <Select 
                  value={openingForm.glassType} 
                  onValueChange={(v) => setOpeningForm({ ...openingForm, glassType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GLASS_TYPES.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Frame Color</Label>
                <Select 
                  value={openingForm.frameColor} 
                  onValueChange={(v) => setOpeningForm({ ...openingForm, frameColor: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAME_COLORS.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border" style={{ backgroundColor: c.hex }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="col-span-3 my-2" />

              {/* Accessories */}
              <div className="col-span-3">
                <Label className="text-base font-semibold mb-3 block">Accessories</Label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Switch
                      checked={openingForm.mesh}
                      onCheckedChange={(v) => setOpeningForm({ ...openingForm, mesh: v })}
                    />
                    <Label className="text-sm">Mosquito Mesh</Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Switch
                      checked={openingForm.grill}
                      onCheckedChange={(v) => setOpeningForm({ ...openingForm, grill: v })}
                    />
                    <Label className="text-sm">Safety Grill</Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Switch
                      checked={openingForm.blinds}
                      onCheckedChange={(v) => setOpeningForm({ ...openingForm, blinds: v })}
                    />
                    <Label className="text-sm">Blinds</Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Switch
                      checked={openingForm.safetyBars}
                      onCheckedChange={(v) => setOpeningForm({ ...openingForm, safetyBars: v })}
                    />
                    <Label className="text-sm">Safety Bars</Label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="col-span-3 space-y-2">
                <Label>Special Notes</Label>
                <Textarea
                  value={openingForm.specialNotes}
                  onChange={(e) => setOpeningForm({ ...openingForm, specialNotes: e.target.value })}
                  placeholder="Any special requirements, challenges, client preferences..."
                  rows={2}
                />
              </div>

              {/* Calculated Area Preview */}
              {openingForm.width && openingForm.height && (
                <div className="col-span-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Calculated Area</p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {(((parseFloat(openingForm.width) || 0) * (parseFloat(openingForm.height) || 0)) / 92903.04).toFixed(2)} sq.ft
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Dimensions</p>
                      <p className="font-mono text-lg">{openingForm.width} × {openingForm.height} mm</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpeningDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOpening} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingOpening ? 'Update Opening' : 'Add Opening'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send for Quote Confirmation Dialog */}
      <Dialog open={showQuoteConfirm} onOpenChange={setShowQuoteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Send Survey for Quotation
            </DialogTitle>
            <DialogDescription>
              Create a quotation from this survey
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Site Code:</span>
                <span className="font-mono font-medium">{viewingSurvey?.siteCode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Customer:</span>
                <span className="font-medium">{viewingSurvey?.contactPerson}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Openings:</span>
                <span className="font-medium">{surveyOpenings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Area:</span>
                <span className="font-medium">{totalOpeningsArea.toFixed(2)} sq.ft</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                <strong>Note:</strong> A quotation will be created with all openings from this survey. The site code will be linked for easy reference.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendForQuote} 
              disabled={creatingQuote}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {creatingQuote ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Create Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
