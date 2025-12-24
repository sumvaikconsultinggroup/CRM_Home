'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ClipboardList, Plus, Search,
  RefreshCw, Eye, Camera, Wrench, Package, ChevronRight, Loader2, FileCheck,
  AlertOctagon, Undo2, Play, Square, CheckSquare
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Status Colors
const statusColors = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  rework: 'bg-amber-100 text-amber-700',
  re_inspection: 'bg-purple-100 text-purple-700'
}

// Severity Colors
const severityColors = {
  critical: 'bg-red-500 text-white',
  major: 'bg-orange-500 text-white',
  minor: 'bg-amber-400 text-black',
  cosmetic: 'bg-slate-300 text-slate-700'
}

export function QualityControlTab({ headers, glassStyles }) {
  const [qcRecords, setQcRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [categories, setCategories] = useState([])
  const [severityLevels, setSeverityLevels] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Detail dialog states
  const [showQCDetail, setShowQCDetail] = useState(false)
  const [selectedQC, setSelectedQC] = useState(null)
  const [checklistResults, setChecklistResults] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchQCRecords()
  }, [])

  const fetchQCRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/qc`, { headers })
      const data = await res.json()
      if (data.qcRecords) setQcRecords(data.qcRecords)
      if (data.stats) setStats(data.stats)
      if (data.categories) setCategories(data.categories)
      if (data.severityLevels) setSeverityLevels(data.severityLevels)
    } catch (error) {
      console.error('Failed to fetch QC records:', error)
      toast.error('Failed to load QC records')
    } finally {
      setLoading(false)
    }
  }

  const fetchQCDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/qc?id=${id}`, { headers })
      const data = await res.json()
      if (!data.error) {
        setSelectedQC(data)
        // Initialize checklist results
        const results = {}
        data.checklist?.forEach(item => {
          results[item.id] = { result: item.result, notes: item.notes || '' }
        })
        setChecklistResults(results)
      }
    } catch (error) {
      console.error('Failed to fetch QC detail:', error)
    }
  }

  const handleStartInspection = async (workOrderId) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/qc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'start_inspection', workOrderId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`QC inspection ${data.qcNumber} started`)
        fetchQCRecords()
      } else {
        toast.error(data.error || 'Failed to start inspection')
      }
    } catch (error) {
      toast.error('Failed to start inspection')
    } finally {
      setSaving(false)
    }
  }

  const handleRecordCheck = async (qcId, checklistItemId, result, notes) => {
    try {
      await fetch(`${API_BASE}/qc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'record_check', qcId, checklistItemId, result, notes })
      })
      // Update local state
      setChecklistResults(prev => ({
        ...prev,
        [checklistItemId]: { result, notes }
      }))
    } catch (error) {
      console.error('Failed to record check:', error)
    }
  }

  const handleCompleteInspection = async (qcId, overallResult) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/qc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'complete_inspection', qcId, overallResult })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setShowQCDetail(false)
        fetchQCRecords()
      } else {
        toast.error(data.error || 'Failed to complete inspection')
      }
    } catch (error) {
      toast.error('Failed to complete inspection')
    } finally {
      setSaving(false)
    }
  }

  const handleSendForRework = async (qcId, notes) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/qc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'send_for_rework', qcId, reworkNotes: notes })
      })
      if (res.ok) {
        toast.success('Sent for rework')
        setShowQCDetail(false)
        fetchQCRecords()
      }
    } catch (error) {
      toast.error('Failed to send for rework')
    } finally {
      setSaving(false)
    }
  }

  // Filter records
  const filteredRecords = qcRecords.filter(record => {
    const matchesSearch = !searchTerm ||
      record.qcNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.itemDescription?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <Card className={glassStyles?.card}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className={glassStyles?.card}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                Quality Control
              </CardTitle>
              <CardDescription>Production quality assurance and inspection tracking</CardDescription>
            </div>
            <Button 
              className="bg-gradient-to-r from-emerald-600 to-green-600"
              onClick={() => toast.info('Create QC from Production work orders')}
            >
              <Plus className="h-4 w-4 mr-2" /> New QC Batch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-emerald-700">{stats.passRate || 0}%</p>
                <p className="text-xs text-emerald-600">Pass Rate</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-700">{stats.pending || 0}</p>
                <p className="text-xs text-blue-600">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4 text-center">
                <Play className="h-6 w-6 text-indigo-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-indigo-700">{stats.inProgress || 0}</p>
                <p className="text-xs text-indigo-600">In Progress</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700">{stats.passed || 0}</p>
                <p className="text-xs text-green-600">Passed</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-700">{stats.failed || 0}</p>
                <p className="text-xs text-red-600">Failed</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <Wrench className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-amber-700">{stats.rework || 0}</p>
                <p className="text-xs text-amber-600">Rework</p>
              </CardContent>
            </Card>
          </div>

          {/* Defects by Category Chart */}
          {stats.defectsByCategory && Object.keys(stats.defectsByCategory).length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Defects by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(stats.defectsByCategory).map(([cat, count]) => (
                    <div key={cat} className="p-2 bg-slate-50 rounded text-center">
                      <p className="text-lg font-bold text-red-600">{count}</p>
                      <p className="text-xs text-slate-500 capitalize">{cat}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search QC records..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rework">Rework</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchQCRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* QC Records Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>QC Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No QC records found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map(record => (
                    <TableRow key={record.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{record.qcNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.itemDescription}</p>
                          <p className="text-xs text-slate-500">{record.productType} - {record.category}</p>
                        </div>
                      </TableCell>
                      <TableCell>{record.workOrderId?.substring(0, 8)}...</TableCell>
                      <TableCell>{record.inspectorName || '-'}</TableCell>
                      <TableCell>
                        {record.score > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress value={record.score} className="w-16 h-2" />
                            <span className="text-sm font-medium">{record.score}%</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[record.status]}>
                          {record.status?.replace('_', ' ')}
                        </Badge>
                        {record.isRework && (
                          <Badge variant="outline" className="ml-1">R{record.reworkCount}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => { fetchQCDetail(record.id); setShowQCDetail(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {record.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600"
                              onClick={() => handleStartInspection(record.workOrderId)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* QC Detail Dialog */}
      <Dialog open={showQCDetail} onOpenChange={setShowQCDetail}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              {selectedQC?.qcNumber}
            </DialogTitle>
            <DialogDescription>{selectedQC?.itemDescription}</DialogDescription>
          </DialogHeader>
          {selectedQC && (
            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge className={statusColors[selectedQC.status]}>
                    {selectedQC.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Score</p>
                  <p className="text-xl font-bold">{selectedQC.score || 0}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Defects</p>
                  <p className="text-xl font-bold text-red-600">{selectedQC.defects?.length || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Rework Count</p>
                  <p className="text-xl font-bold">{selectedQC.reworkCount || 0}</p>
                </div>
              </div>

              {/* Checklist */}
              {selectedQC.status === 'in_progress' && selectedQC.checklist && (
                <div>
                  <h3 className="font-semibold mb-3">Inspection Checklist</h3>
                  <ScrollArea className="h-[300px] rounded-lg border p-4">
                    <div className="space-y-3">
                      {selectedQC.checklist.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {item.critical && <AlertOctagon className="h-4 w-4 text-red-500" />}
                            <div>
                              <p className="font-medium text-sm">{item.item}</p>
                              <p className="text-xs text-slate-500 capitalize">{item.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={checklistResults[item.id]?.result === 'pass' ? 'default' : 'outline'}
                              size="sm"
                              className={checklistResults[item.id]?.result === 'pass' ? 'bg-emerald-600' : ''}
                              onClick={() => handleRecordCheck(selectedQC.id, item.id, 'pass', '')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={checklistResults[item.id]?.result === 'fail' ? 'default' : 'outline'}
                              size="sm"
                              className={checklistResults[item.id]?.result === 'fail' ? 'bg-red-600' : ''}
                              onClick={() => handleRecordCheck(selectedQC.id, item.id, 'fail', '')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={checklistResults[item.id]?.result === 'na' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleRecordCheck(selectedQC.id, item.id, 'na', '')}
                            >
                              N/A
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Defects List */}
              {selectedQC.defects && selectedQC.defects.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Defects Found</h3>
                  <div className="space-y-2">
                    {selectedQC.defects.map(defect => (
                      <div key={defect.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <p className="font-medium">{defect.description}</p>
                          <p className="text-xs text-slate-500 capitalize">{defect.category}</p>
                        </div>
                        <Badge className={severityColors[defect.severity]}>
                          {defect.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {selectedQC.photos && (selectedQC.photos.mandatory?.length > 0 || selectedQC.photos.defects?.length > 0) && (
                <div>
                  <h3 className="font-semibold mb-3">Photos</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[...(selectedQC.photos.mandatory || []), ...(selectedQC.photos.defects || [])].map((photo, i) => (
                      <div key={i} className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                        <Camera className="h-8 w-8 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedQC?.status === 'in_progress' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => handleCompleteInspection(selectedQC.id, 'fail')}
                  disabled={saving}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Mark Failed
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleSendForRework(selectedQC.id, 'Requires rework')}
                  disabled={saving}
                >
                  <Wrench className="h-4 w-4 mr-2" /> Send for Rework
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleCompleteInspection(selectedQC.id, 'pass')}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Mark Passed
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowQCDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QualityControlTab
