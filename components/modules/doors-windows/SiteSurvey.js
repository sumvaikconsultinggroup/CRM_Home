'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Plus, Search, Eye, Edit, Trash2, MapPin, Phone, User, Building2,
  Ruler, CheckCircle2, Clock, Calendar, Camera, Save, Loader2,
  AlertTriangle, ChevronRight, X, FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { BUILDING_TYPES, FLOOR_LEVELS, ROOM_TYPES, CATEGORIES, PRODUCT_TYPES, GLASS_TYPES, PRODUCT_FAMILIES } from './constants'

const API_BASE = '/api/modules/doors-windows'

const statusStyles = {
  pending: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700'
}

export function SiteSurvey({ surveys, projects, selectedProject, onRefresh, headers, user, glassStyles }) {
  const [showNewSurvey, setShowNewSurvey] = useState(false)
  const [showOpeningDialog, setShowOpeningDialog] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [viewingSurvey, setViewingSurvey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [surveyOpenings, setSurveyOpenings] = useState([])
  const [loadingOpenings, setLoadingOpenings] = useState(false)

  // Survey form state
  const [surveyForm, setSurveyForm] = useState({
    projectId: '',
    siteName: '',
    siteAddress: '',
    buildingType: '',
    floors: 1,
    contactPerson: '',
    contactPhone: '',
    surveyorName: '',  // MANDATORY
    surveyDate: new Date().toISOString().split('T')[0],
    scopeSummary: '',
    accessNotes: '',
    siteConditions: '',
    existingFrameType: '',
    powerAvailable: true,
    waterAvailable: true,
    liftAvailable: false,
    parkingNotes: ''
  })

  // Opening form state
  const [openingForm, setOpeningForm] = useState({
    surveyId: '',
    floor: 'Ground Floor',
    room: '',
    openingId: '',
    type: 'Window',
    category: 'Sliding',
    width: '',
    height: '',
    sillHeight: '',
    panels: 2,
    material: 'Aluminium',
    glassType: 'single',
    mesh: false,
    grill: false,
    specialNotes: ''
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

  const resetSurveyForm = () => {
    setSurveyForm({
      projectId: selectedProject?.id || '',
      siteName: selectedProject?.siteName || '',
      siteAddress: selectedProject?.siteAddress || '',
      buildingType: selectedProject?.buildingType || '',
      floors: 1,
      contactPerson: selectedProject?.contactPerson || '',
      contactPhone: selectedProject?.contactPhone || '',
      surveyorName: user?.name || '',
      surveyDate: new Date().toISOString().split('T')[0],
      scopeSummary: '',
      accessNotes: '',
      siteConditions: '',
      existingFrameType: '',
      powerAvailable: true,
      waterAvailable: true,
      liftAvailable: false,
      parkingNotes: ''
    })
    setSelectedSurvey(null)
  }

  const resetOpeningForm = () => {
    setOpeningForm({
      surveyId: viewingSurvey?.id || '',
      floor: 'Ground Floor',
      room: '',
      openingId: `OP-${Date.now()}`,
      type: 'Window',
      category: 'Sliding',
      width: '',
      height: '',
      sillHeight: '',
      panels: 2,
      material: 'Aluminium',
      glassType: 'single',
      mesh: false,
      grill: false,
      specialNotes: ''
    })
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

    setSaving(true)
    try {
      const method = selectedSurvey ? 'PUT' : 'POST'
      const body = { ...surveyForm }
      if (selectedSurvey) body.id = selectedSurvey.id

      const res = await fetch(`${API_BASE}/surveys`, {
        method,
        headers,
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(selectedSurvey ? 'Survey updated' : 'Survey created')
        setShowNewSurvey(false)
        resetSurveyForm()
        onRefresh()
        
        // If new survey, open it for adding openings
        if (!selectedSurvey && data.id) {
          setViewingSurvey(data)
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

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'add-opening',
          surveyId: viewingSurvey.id,
          ...openingForm
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Opening added')
        setShowOpeningDialog(false)
        resetOpeningForm()
        fetchSurveyOpenings(viewingSurvey.id)
        onRefresh()
      } else {
        toast.error(data.error || 'Failed to add opening')
      }
    } catch (error) {
      toast.error('Failed to add opening')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOpening = async (openingId) => {
    if (!confirm('Delete this opening?')) return
    
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

  const handleCompleteSurvey = async (surveyId) => {
    try {
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: surveyId, action: 'complete' })
      })

      if (res.ok) {
        toast.success('Survey marked as completed')
        onRefresh()
        if (viewingSurvey?.id === surveyId) {
          setViewingSurvey(prev => ({ ...prev, status: 'completed' }))
        }
      }
    } catch (error) {
      toast.error('Failed to complete survey')
    }
  }

  // Filter surveys
  const filteredSurveys = surveys?.filter(s => {
    const matchesSearch = !searchQuery ||
      s.surveyNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.surveyorName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = !selectedProject || s.projectId === selectedProject.id
    return matchesSearch && matchesProject
  }) || []

  // Calculate opening area
  const calculateArea = (width, height) => {
    const w = parseFloat(width) || 0
    const h = parseFloat(height) || 0
    return ((w * h) / 144).toFixed(2) // Convert sq inches to sq ft
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Super Advanced Site Survey</h2>
          <p className="text-slate-500">Comprehensive measurement and site assessment</p>
        </div>
        <Button
          onClick={() => { resetSurveyForm(); setShowNewSurvey(true); }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> New Survey
        </Button>
      </div>

      {/* Search */}
      <Card className={glassStyles?.card}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search surveys by number, site, or surveyor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Surveys List or Detail View */}
      {viewingSurvey ? (
        // Survey Detail View with Openings
        <Card className={glassStyles?.card}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-indigo-600" />
                  {viewingSurvey.surveyNumber}
                  <Badge className={statusStyles[viewingSurvey.status]}>
                    {viewingSurvey.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {viewingSurvey.siteName || viewingSurvey.siteAddress}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {viewingSurvey.status !== 'completed' && (
                  <Button variant="outline" onClick={() => handleCompleteSurvey(viewingSurvey.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setViewingSurvey(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Survey Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500">Surveyor</p>
                <p className="font-medium">{viewingSurvey.surveyorName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Survey Date</p>
                <p className="font-medium">{new Date(viewingSurvey.surveyDate || viewingSurvey.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Building Type</p>
                <p className="font-medium">{viewingSurvey.buildingType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Openings</p>
                <p className="font-medium text-indigo-600">{viewingSurvey.openingsCount || 0}</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Openings Section */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Openings / Measurements</h3>
              <Button onClick={() => { resetOpeningForm(); setShowOpeningDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Opening
              </Button>
            </div>

            {loadingOpenings ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
              </div>
            ) : surveyOpenings.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Ruler className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No openings measured yet</p>
                <Button className="mt-3" variant="outline" onClick={() => { resetOpeningForm(); setShowOpeningDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add First Opening
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {surveyOpenings.map((opening, idx) => (
                  <Card key={opening.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{opening.openingId || `Opening ${idx + 1}`}</Badge>
                            <Badge>{opening.type}</Badge>
                            <Badge variant="secondary">{opening.category}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Location:</span>
                              <p className="font-medium">{opening.floor} - {opening.room || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Size (WxH):</span>
                              <p className="font-medium">{opening.width}" x {opening.height}"</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Area:</span>
                              <p className="font-medium text-indigo-600">{opening.area?.toFixed(2) || calculateArea(opening.width, opening.height)} sq.ft</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Material:</span>
                              <p className="font-medium">{opening.material || opening.systemSeries || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Glass:</span>
                              <p className="font-medium">{opening.glassType || 'Single'}</p>
                            </div>
                          </div>
                          {(opening.mesh || opening.grill) && (
                            <div className="flex gap-2 mt-2">
                              {opening.mesh && <Badge variant="outline" className="text-xs">Mesh</Badge>}
                              {opening.grill && <Badge variant="outline" className="text-xs">Grill</Badge>}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteOpening(opening.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Create Quote Button */}
            {surveyOpenings.length > 0 && (
              <div className="mt-6 text-center">
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-600">
                  <FileText className="h-4 w-4 mr-2" /> Generate Quote from Survey
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Surveys List
        filteredSurveys.length === 0 ? (
          <Card className={glassStyles?.card}>
            <CardContent className="py-16 text-center">
              <Ruler className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Surveys Yet</h3>
              <p className="text-slate-500 mb-4">Start by creating a comprehensive site survey</p>
              <Button onClick={() => { resetSurveyForm(); setShowNewSurvey(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Create Survey
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
                    <div>
                      <p className="font-semibold text-slate-800">{survey.surveyNumber}</p>
                      <p className="text-sm text-slate-500">{survey.siteName || survey.siteAddress?.substring(0, 30)}</p>
                    </div>
                    <Badge className={statusStyles[survey.status]}>{survey.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <User className="h-3 w-3" />
                      {survey.surveyorName || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      {new Date(survey.surveyDate || survey.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1 text-indigo-600">
                      <Ruler className="h-4 w-4" />
                      <span className="font-medium">{survey.openingsCount || 0} openings</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* New Survey Dialog */}
      <Dialog open={showNewSurvey} onOpenChange={setShowNewSurvey}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-indigo-600" />
              Create New Site Survey
            </DialogTitle>
            <DialogDescription>
              Comprehensive site assessment and measurement documentation
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="site">Site Details</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Surveyor Name <span className="text-red-500">*</span>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  </Label>
                  <Input
                    value={surveyForm.surveyorName}
                    onChange={(e) => setSurveyForm({ ...surveyForm, surveyorName: e.target.value })}
                    placeholder="Enter surveyor's name"
                    className={!surveyForm.surveyorName ? 'border-amber-300' : ''}
                  />
                  {!surveyForm.surveyorName && (
                    <p className="text-xs text-amber-600">Mandatory field</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Survey Date</Label>
                  <Input
                    type="date"
                    value={surveyForm.surveyDate}
                    onChange={(e) => setSurveyForm({ ...surveyForm, surveyDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link to Project</Label>
                  <Select
                    value={surveyForm.projectId}
                    onValueChange={(v) => {
                      const proj = projects?.find(p => p.id === v)
                      setSurveyForm({
                        ...surveyForm,
                        projectId: v,
                        siteName: proj?.siteName || surveyForm.siteName,
                        siteAddress: proj?.siteAddress || surveyForm.siteAddress,
                        contactPerson: proj?.contactPerson || surveyForm.contactPerson,
                        contactPhone: proj?.contactPhone || surveyForm.contactPhone,
                        buildingType: proj?.buildingType || surveyForm.buildingType
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Project</SelectItem>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name || p.siteName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label>Site Name</Label>
                  <Input
                    value={surveyForm.siteName}
                    onChange={(e) => setSurveyForm({ ...surveyForm, siteName: e.target.value })}
                    placeholder="e.g., Green Valley Villa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Floors</Label>
                  <Input
                    type="number"
                    min="1"
                    value={surveyForm.floors}
                    onChange={(e) => setSurveyForm({ ...surveyForm, floors: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Site Address</Label>
                <Textarea
                  value={surveyForm.siteAddress}
                  onChange={(e) => setSurveyForm({ ...surveyForm, siteAddress: e.target.value })}
                  placeholder="Full site address"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="site" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={surveyForm.contactPerson}
                    onChange={(e) => setSurveyForm({ ...surveyForm, contactPerson: e.target.value })}
                    placeholder="Site contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={surveyForm.contactPhone}
                    onChange={(e) => setSurveyForm({ ...surveyForm, contactPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Existing Frame Type</Label>
                  <Select
                    value={surveyForm.existingFrameType}
                    onValueChange={(v) => setSurveyForm({ ...surveyForm, existingFrameType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing frame type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (New Construction)</SelectItem>
                      <SelectItem value="wood">Wooden Frames</SelectItem>
                      <SelectItem value="steel">Steel Frames</SelectItem>
                      <SelectItem value="aluminium">Aluminium Frames</SelectItem>
                      <SelectItem value="upvc">uPVC Frames</SelectItem>
                      <SelectItem value="mixed">Mixed Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scope Summary</Label>
                <Textarea
                  value={surveyForm.scopeSummary}
                  onChange={(e) => setSurveyForm({ ...surveyForm, scopeSummary: e.target.value })}
                  placeholder="Brief description of work scope - e.g., Replace all windows on 1st floor, new sliding doors for balcony"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Access Notes</Label>
                <Textarea
                  value={surveyForm.accessNotes}
                  onChange={(e) => setSurveyForm({ ...surveyForm, accessNotes: e.target.value })}
                  placeholder="How to access the site, entry points, timing restrictions"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Site Conditions</Label>
                <Textarea
                  value={surveyForm.siteConditions}
                  onChange={(e) => setSurveyForm({ ...surveyForm, siteConditions: e.target.value })}
                  placeholder="Describe site conditions - construction stage, obstacles, safety concerns"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Power Available</Label>
                  <Switch
                    checked={surveyForm.powerAvailable}
                    onCheckedChange={(v) => setSurveyForm({ ...surveyForm, powerAvailable: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Water Available</Label>
                  <Switch
                    checked={surveyForm.waterAvailable}
                    onCheckedChange={(v) => setSurveyForm({ ...surveyForm, waterAvailable: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Lift Available</Label>
                  <Switch
                    checked={surveyForm.liftAvailable}
                    onCheckedChange={(v) => setSurveyForm({ ...surveyForm, liftAvailable: v })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parking Notes</Label>
                <Input
                  value={surveyForm.parkingNotes}
                  onChange={(e) => setSurveyForm({ ...surveyForm, parkingNotes: e.target.value })}
                  placeholder="Parking availability for delivery vehicles"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowNewSurvey(false)}>Cancel</Button>
            <Button onClick={handleSaveSurvey} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Opening Dialog */}
      <Dialog open={showOpeningDialog} onOpenChange={setShowOpeningDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Opening Measurement</DialogTitle>
            <DialogDescription>Record door or window opening details</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Opening ID</Label>
              <Input
                value={openingForm.openingId}
                onChange={(e) => setOpeningForm({ ...openingForm, openingId: e.target.value })}
                placeholder="e.g., W-01, D-02"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={openingForm.type}
                onValueChange={(v) => setOpeningForm({ ...openingForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category/Style</Label>
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
              <Label>Floor Level</Label>
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
              <Label>Room</Label>
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
              <Label>Material</Label>
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
            <div className="space-y-2">
              <Label>Width (inches) *</Label>
              <Input
                type="number"
                value={openingForm.width}
                onChange={(e) => setOpeningForm({ ...openingForm, width: e.target.value })}
                placeholder="e.g., 48"
              />
            </div>
            <div className="space-y-2">
              <Label>Height (inches) *</Label>
              <Input
                type="number"
                value={openingForm.height}
                onChange={(e) => setOpeningForm({ ...openingForm, height: e.target.value })}
                placeholder="e.g., 60"
              />
            </div>
            <div className="space-y-2">
              <Label>Sill Height (inches)</Label>
              <Input
                type="number"
                value={openingForm.sillHeight}
                onChange={(e) => setOpeningForm({ ...openingForm, sillHeight: e.target.value })}
                placeholder="Height from floor"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Panels</Label>
              <Input
                type="number"
                min="1"
                max="10"
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
                  {GLASS_TYPES.map(glass => (
                    <SelectItem key={glass.id} value={glass.id}>{glass.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Calculated Area</Label>
              <div className="p-3 bg-indigo-50 rounded-lg text-center">
                <span className="text-2xl font-bold text-indigo-600">
                  {calculateArea(openingForm.width, openingForm.height)}
                </span>
                <span className="text-sm text-slate-500 ml-1">sq.ft</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={openingForm.mesh}
                  onCheckedChange={(v) => setOpeningForm({ ...openingForm, mesh: v })}
                />
                <Label>Mosquito Mesh</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={openingForm.grill}
                  onCheckedChange={(v) => setOpeningForm({ ...openingForm, grill: v })}
                />
                <Label>Safety Grill</Label>
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Special Notes</Label>
              <Textarea
                value={openingForm.specialNotes}
                onChange={(e) => setOpeningForm({ ...openingForm, specialNotes: e.target.value })}
                placeholder="Any special requirements or notes"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpeningDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveOpening} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Opening
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
