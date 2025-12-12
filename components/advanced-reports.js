'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ScatterChart, Scatter
} from 'recharts'
import { Download, FileText, TrendingUp, DollarSign, Users, Calendar, Target } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function AdvancedReports({ stats, leads, projects, tasks, expenses }) {
  const [reportType, setReportType] = useState('overview')
  const [dateRange, setDateRange] = useState('month')

  const handleExportPDF = () => {
    const printContent = document.getElementById('reports-content')
    if (!printContent) {
      toast.error('No content to export')
      return
    }
    
    const originalContents = document.body.innerHTML
    const printContents = printContent.innerHTML
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>Reports - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .chart-container { page-break-inside: avoid; margin: 20px 0; }
            h2, h3 { color: #1e40af; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #3b82f6; color: white; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `
    
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload()
  }

  const handleExportCSV = () => {
    let csvData = []
    let filename = 'report'
    
    if (reportType === 'leads') {
      csvData = leads.map(l => ({
        Name: l.name || '',
        Email: l.email || '',
        Phone: l.phone || '',
        Status: l.status || '',
        Value: l.value || 0,
        Source: l.source || '',
        'Next Follow-up': l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString() : 'N/A'
      }))
      filename = 'leads-report'
    } else if (reportType === 'projects') {
      csvData = projects.map(p => ({
        Name: p.name || '',
        Status: p.status || '',
        Budget: p.budget || 0,
        Progress: p.progress || 0,
        'Start Date': p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'
      }))
      filename = 'projects-report'
    } else if (reportType === 'tasks') {
      csvData = tasks.map(t => ({
        Title: t.title || '',
        Status: t.status || '',
        Priority: t.priority || '',
        'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'
      }))
      filename = 'tasks-report'
    } else {
      csvData = expenses.map(e => ({
        Description: e.description || '',
        Category: e.category || '',
        Amount: e.amount || 0,
        Date: e.date ? new Date(e.date).toLocaleDateString() : 'N/A'
      }))
      filename = 'expenses-report'
    }

    if (csvData.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = Object.keys(csvData[0])
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV exported successfully!')
  }

  // Calculate advanced metrics
  const conversionRate = stats?.overview?.conversionRate || 0
  const avgDealSize = stats?.overview?.pipelineValue && stats?.overview?.totalLeads 
    ? Math.round(stats.overview.pipelineValue / stats.overview.totalLeads)
    : 0
  
  const upcomingFollowUps = leads.filter(l => 
    l.nextFollowUp && new Date(l.nextFollowUp) >= new Date() && new Date(l.nextFollowUp) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ).length

  const overdueFollowUps = leads.filter(l =>
    l.nextFollowUp && new Date(l.nextFollowUp) < new Date() && !['won', 'lost'].includes(l.status)
  ).length

  // Performance metrics
  const performanceData = [
    { metric: 'Conversion Rate', value: conversionRate, target: 25 },
    { metric: 'Avg Deal Size', value: avgDealSize / 1000, target: 50 },
    { metric: 'Task Completion', value: stats?.overview?.taskCompletionRate || 0, target: 85 },
    { metric: 'Project On Time', value: 75, target: 90 },
    { metric: 'Budget Utilization', value: 65, target: 80 }
  ]

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview Report</SelectItem>
              <SelectItem value="leads">Leads Analysis</SelectItem>
              <SelectItem value="projects">Projects Report</SelectItem>
              <SelectItem value="tasks">Tasks Report</SelectItem>
              <SelectItem value="expenses">Expenses Report</SelectItem>
              <SelectItem value="performance">Performance Metrics</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={handleExportPDF} className="bg-gradient-to-r from-primary to-indigo-600">
            <FileText className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <div id="reports-content">
        {/* Overview Report */}
        {reportType === 'overview' && (
          <div className="grid gap-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{conversionRate}%</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                    <p className="text-2xl font-bold">₹{avgDealSize.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Upcoming Follow-ups</p>
                    <p className="text-2xl font-bold">{upcomingFollowUps}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue Follow-ups</p>
                    <p className="text-2xl font-bold text-red-600">{overdueFollowUps}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={stats?.charts?.monthlyLeads || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3B82F6" name="Revenue" />
                    <Line type="monotone" dataKey="leads" stroke="#10B981" name="Leads" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Pipeline Health</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats?.charts?.leadStatuses || []}>
                    <defs>
                      <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorStatus)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Lead Sources Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats?.charts?.leadSources || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.source}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(stats?.charts?.leadSources || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Task Completion Rate</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Completed', value: stats?.overview?.completedTasks || 0 },
                    { name: 'In Progress', value: (stats?.overview?.totalTasks || 0) - (stats?.overview?.completedTasks || 0) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* Performance Report */}
        {reportType === 'performance' && (
          <div className="grid gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={performanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Current" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Radar name="Target" dataKey="target" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Leads Analysis */}
        {reportType === 'leads' && (
          <div className="grid gap-6">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Lead Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats?.charts?.leadStatuses || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label
                    >
                      {(stats?.charts?.leadStatuses || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              
              <Card className="p-6 col-span-2">
                <h3 className="font-semibold mb-4">Lead Value by Source</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats?.charts?.leadSources || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Follow-up Table */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Upcoming Follow-ups (Next 7 Days)</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Lead Name</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Value</th>
                      <th className="text-left p-2">Follow-up Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.filter(l => 
                      l.nextFollowUp && new Date(l.nextFollowUp) >= new Date() && new Date(l.nextFollowUp) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    ).slice(0, 10).map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-slate-50">
                        <td className="p-2">{lead.name}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-2">₹{lead.value?.toLocaleString()}</td>
                        <td className="p-2">{new Date(lead.nextFollowUp).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
