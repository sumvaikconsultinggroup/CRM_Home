'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign, Users, Briefcase,
  Target, BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  Calendar, Download, RefreshCw, Filter, Search, ChevronRight, ChevronDown,
  FileText, Receipt, CreditCard, Wallet, Building2, UserCheck, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Eye, Maximize2,
  Table as TableIcon, LayoutGrid, Activity, Zap, Award, Star,
  ArrowUp, ArrowDown, Minus, Info, Settings, Plus
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Funnel, FunnelChart
} from 'recharts'

// Color palette for charts
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6']
const STATUS_COLORS = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  proposal: '#f97316',
  negotiation: '#ec4899',
  won: '#22c55e',
  lost: '#ef4444'
}

// Period options
const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_12_months', label: 'Last 12 Months' },
  { value: 'all_time', label: 'All Time' }
]

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0)
}

// Format percentage
const formatPercent = (value) => `${parseFloat(value || 0).toFixed(1)}%`

// Metric Card Component
const MetricCard = ({ title, value, change, changeLabel, icon: Icon, color = 'primary', format = 'number' }) => {
  const isPositive = parseFloat(change) >= 0
  const formattedValue = format === 'currency' ? formatCurrency(value) : 
                        format === 'percent' ? formatPercent(value) : 
                        value?.toLocaleString() || '0'

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{formattedValue}</h3>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                <span>{Math.abs(change)}%</span>
                <span className="text-muted-foreground">{changeLabel || 'vs last period'}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-${color}/10`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
        </div>
      </CardContent>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${color} to-${color}/50`} />
    </Card>
  )
}

// Report Category Button
const ReportCategoryButton = ({ category, isActive, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive 
        ? 'bg-primary text-primary-foreground shadow-lg' 
        : 'hover:bg-muted'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{category}</span>
    <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${isActive ? 'rotate-90' : ''}`} />
  </button>
)

// Report List Item
const ReportListItem = ({ report, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
      isActive 
        ? 'bg-primary/10 text-primary border border-primary/20' 
        : 'hover:bg-muted border border-transparent'
    }`}
  >
    <p className="font-medium">{report.name}</p>
    <p className="text-sm text-muted-foreground">{report.description}</p>
  </button>
)

// Main Enterprise Reports Component
export function EnterpriseReports({ authToken }) {
  const [loading, setLoading] = useState(true)
  const [reportCategories, setReportCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedReport, setSelectedReport] = useState('overview')
  const [reportData, setReportData] = useState(null)
  const [period, setPeriod] = useState('this_month')
  const [refreshing, setRefreshing] = useState(false)

  const headers = { 'Authorization': `Bearer ${authToken}` }

  // Fetch report categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/reports?type=list', { headers })
        const data = await res.json()
        if (data.categories) {
          setReportCategories(data.categories)
          setSelectedCategory(data.categories[0]?.category)
        }
      } catch (error) {
        console.error('Failed to fetch report categories:', error)
        toast.error('Failed to load report categories')
      }
    }
    fetchCategories()
  }, [authToken])

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedReport) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/reports?type=${selectedReport}&period=${period}`, { headers })
        const data = await res.json()
        setReportData(data)
      } catch (error) {
        console.error('Failed to fetch report:', error)
        toast.error('Failed to load report data')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [selectedReport, period, authToken])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/reports?type=${selectedReport}&period=${period}`, { headers })
      const data = await res.json()
      setReportData(data)
      toast.success('Report refreshed')
    } catch (error) {
      toast.error('Failed to refresh report')
    } finally {
      setRefreshing(false)
    }
  }

  const handleExport = () => {
    // Convert report data to CSV
    const csvContent = JSON.stringify(reportData, null, 2)
    const blob = new Blob([csvContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedReport}_report_${period}.json`
    a.click()
    toast.success('Report exported')
  }

  // Get category icon
  const getCategoryIcon = (iconName) => {
    const icons = {
      LayoutDashboard, TrendingUp, DollarSign, Briefcase, Users, UserCheck
    }
    return icons[iconName] || LayoutDashboard
  }

  // Render report content based on type
  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
          <p>Select a report to view</p>
        </div>
      )
    }

    switch (selectedReport) {
      case 'overview':
        return <OverviewReport data={reportData} />
      case 'lead_conversion':
        return <LeadConversionReport data={reportData} />
      case 'sales_pipeline':
        return <SalesPipelineReport data={reportData} />
      case 'sales_by_team':
        return <SalesByTeamReport data={reportData} />
      case 'sales_forecast':
        return <SalesForecastReport data={reportData} />
      case 'win_loss_analysis':
        return <WinLossReport data={reportData} />
      case 'revenue':
        return <RevenueReport data={reportData} />
      case 'expenses':
        return <ExpensesReport data={reportData} />
      case 'profit_loss':
        return <ProfitLossReport data={reportData} />
      case 'invoice_aging':
        return <InvoiceAgingReport data={reportData} />
      case 'project_status':
        return <ProjectStatusReport data={reportData} />
      case 'project_profitability':
        return <ProjectProfitabilityReport data={reportData} />
      case 'team_performance':
        return <TeamPerformanceReport data={reportData} />
      case 'activity_report':
        return <ActivityReport data={reportData} />
      case 'customer_acquisition':
        return <CustomerAcquisitionReport data={reportData} />
      case 'customer_lifetime_value':
        return <CustomerLTVReport data={reportData} />
      default:
        return <GenericReport data={reportData} />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Advanced Reports</h1>
          <p className="text-muted-foreground">Comprehensive business analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar - Report Categories */}
        <Card className="w-80 flex-shrink-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Report Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-4 space-y-2">
                {reportCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon)
                  const isExpanded = selectedCategory === cat.category
                  
                  return (
                    <div key={cat.category}>
                      <ReportCategoryButton
                        category={cat.category}
                        isActive={isExpanded}
                        onClick={() => setSelectedCategory(isExpanded ? null : cat.category)}
                        icon={Icon}
                      />
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pr-2 py-2 space-y-1">
                              {cat.reports.map((report) => (
                                <ReportListItem
                                  key={report.id}
                                  report={report}
                                  isActive={selectedReport === report.id}
                                  onClick={() => setSelectedReport(report.id)}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Report Content */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-6 h-full overflow-auto">
            {renderReportContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== INDIVIDUAL REPORT COMPONENTS ====================

// Overview Report
function OverviewReport({ data }) {
  const metrics = data?.metrics || {}

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={metrics.financial?.revenue}
          change={metrics.financial?.revenueGrowth}
          icon={DollarSign}
          format="currency"
          color="primary"
        />
        <MetricCard
          title="Conversion Rate"
          value={metrics.leads?.conversionRate}
          icon={Target}
          format="percent"
          color="green-500"
        />
        <MetricCard
          title="Avg Deal Size"
          value={metrics.financial?.revenue / (metrics.leads?.won || 1)}
          icon={TrendingUp}
          format="currency"
          color="purple-500"
        />
        <MetricCard
          title="Active Projects"
          value={metrics.projects?.active}
          icon={Briefcase}
          color="orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Lead Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: 'Won', value: metrics.leads?.won || 0 },
                      { name: 'Lost', value: metrics.leads?.lost || 0 },
                      { name: 'In Pipeline', value: (metrics.leads?.total || 0) - (metrics.leads?.won || 0) - (metrics.leads?.lost || 0) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {[STATUS_COLORS.won, STATUS_COLORS.lost, STATUS_COLORS.qualified].map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-bold">{metrics.projects?.completed || 0}</span>
              </div>
              <Progress value={metrics.projects?.completionRate || 0} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Active</span>
                <span className="font-bold">{metrics.projects?.active || 0}</span>
              </div>
              <Progress value={metrics.projects?.active / (metrics.projects?.total || 1) * 100} className="h-2 bg-orange-100" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Task Completion</span>
                <span className="font-bold">{metrics.tasks?.completionRate || 0}%</span>
              </div>
              <Progress value={metrics.tasks?.completionRate || 0} className="h-2 bg-green-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.financial?.revenue)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.financial?.expenses)}</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-xl">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.financial?.profit)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Lead Conversion Report
function LeadConversionReport({ data }) {
  const statusData = data?.data?.byStatus || []
  const summary = data?.data?.summary || {}

  const chartData = statusData.map(s => ({
    name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1),
    count: s.count,
    value: s.value || 0
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Leads" value={summary.total} icon={Target} />
        <MetricCard title="Total Value" value={summary.totalValue} icon={DollarSign} format="currency" />
        <MetricCard title="Conversion Rate" value={summary.conversionRate} icon={TrendingUp} format="percent" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Value by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Sales Pipeline Report
function SalesPipelineReport({ data }) {
  const stages = data?.data?.stages || []
  const totalValue = data?.data?.totalValue || 0
  const weightedPipeline = data?.data?.weightedPipeline || 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard title="Total Pipeline Value" value={totalValue} icon={DollarSign} format="currency" />
        <MetricCard title="Weighted Pipeline" value={weightedPipeline} icon={TrendingUp} format="currency" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => name === 'value' ? formatCurrency(value) : value} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Deals" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} name="Value" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stage Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stage Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Stage</th>
                  <th className="text-right py-3 px-4">Deals</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-right py-3 px-4">Avg Deal Size</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium capitalize">{stage.stage}</td>
                    <td className="py-3 px-4 text-right">{stage.count}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(stage.value)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(stage.avgValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Sales by Team Report
function SalesByTeamReport({ data }) {
  // Ensure teamData is always an array
  const rawData = data?.data
  const teamData = Array.isArray(rawData) ? rawData : []

  if (teamData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Sales Data Available</p>
        <p className="text-sm">No team members have sales in the selected period</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="userName" type="category" width={100} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Sales Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData.slice(0, 5).map((member, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  i === 0 ? 'bg-yellow-500 text-white' :
                  i === 1 ? 'bg-slate-400 text-white' :
                  i === 2 ? 'bg-orange-400 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{member.userName}</p>
                  <p className="text-sm text-muted-foreground">{member.deals} deals</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(member.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Sales Forecast Report
function SalesForecastReport({ data }) {
  const forecastData = data?.data || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Pipeline" value={forecastData.totalPipeline} icon={TrendingUp} format="currency" />
        <MetricCard title="Weighted Forecast" value={forecastData.weightedForecast} icon={Target} format="currency" />
        <MetricCard title="Expected This Month" value={forecastData.expectedCloseThisMonth} icon={Calendar} format="currency" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forecast by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData.byStage || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalValue" fill="#6366f1" name="Total Value" />
                <Bar dataKey="weightedValue" fill="#22c55e" name="Weighted Value" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Win/Loss Report
function WinLossReport({ data }) {
  const summary = data?.data?.summary || {}
  const lossReasons = data?.data?.lossReasons || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Won" value={summary.totalWon} icon={CheckCircle2} color="green-500" />
        <MetricCard title="Total Lost" value={summary.totalLost} icon={XCircle} color="red-500" />
        <MetricCard title="Win Rate" value={summary.winRate} icon={TrendingUp} format="percent" />
        <MetricCard title="Won Value" value={summary.wonValue} icon={DollarSign} format="currency" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Win vs Loss Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Won', value: summary.totalWon, fill: '#22c55e' },
                  { name: 'Lost', value: summary.totalLost, fill: '#ef4444' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Loss Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            {lossReasons.length > 0 ? (
              <div className="space-y-3">
                {lossReasons.map((reason, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{reason._id || 'Unknown'}</p>
                      <Progress value={reason.count / (lossReasons[0]?.count || 1) * 100} className="h-2 mt-1" />
                    </div>
                    <Badge variant="outline">{reason.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No loss reasons recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Revenue Report
function RevenueReport({ data }) {
  const timeline = data?.data?.timeline || []
  const byCategory = data?.data?.byCategory || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Revenue" value={summary.total} icon={DollarSign} format="currency" />
        <MetricCard title="Invoice Count" value={summary.invoiceCount} icon={FileText} />
        <MetricCard title="Average Invoice" value={summary.average} icon={TrendingUp} format="currency" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id.month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={byCategory}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="total"
                  nameKey="_id"
                  label={({ _id, percent }) => `${_id || 'Other'} ${(percent * 100).toFixed(0)}%`}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Expenses Report
function ExpensesReport({ data }) {
  const byCategory = data?.data?.byCategory || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Expenses" value={summary.total} icon={Receipt} format="currency" color="red-500" />
        <MetricCard title="Expense Count" value={summary.expenseCount} icon={FileText} />
        <MetricCard title="Top Category" value={summary.topCategory} icon={Tag} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Profit & Loss Report
function ProfitLossReport({ data }) {
  const timeline = data?.data?.timeline || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={summary.totalRevenue} icon={TrendingUp} format="currency" color="green-500" />
        <MetricCard title="Total Expenses" value={summary.totalExpenses} icon={TrendingDown} format="currency" color="red-500" />
        <MetricCard title="Net Profit" value={summary.netProfit} icon={DollarSign} format="currency" />
        <MetricCard title="Avg Margin" value={summary.avgMargin} icon={Activity} format="percent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profit & Loss Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={3} name="Profit" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Invoice Aging Report
function InvoiceAgingReport({ data }) {
  const buckets = data?.data?.buckets || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Outstanding" value={summary.totalOutstanding} icon={Clock} format="currency" color="orange-500" />
        <MetricCard title="Overdue Amount" value={summary.overdueAmount} icon={AlertTriangle} format="currency" color="red-500" />
        <MetricCard title="Invoice Count" value={summary.invoiceCount} icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aging Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Project Status Report
function ProjectStatusReport({ data }) {
  const byStatus = data?.data?.byStatus || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Projects" value={summary.total} icon={Briefcase} />
        <MetricCard title="Completed" value={summary.completed} icon={CheckCircle2} color="green-500" />
        <MetricCard title="In Progress" value={summary.inProgress} icon={Activity} color="orange-500" />
        <MetricCard title="Total Budget" value={summary.totalBudget} icon={DollarSign} format="currency" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projects by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={byStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  nameKey="_id"
                  label
                >
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Project Profitability Report
function ProjectProfitabilityReport({ data }) {
  // Ensure projects is always an array
  const rawProjects = data?.data?.projects
  const projects = Array.isArray(rawProjects) ? rawProjects : []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={summary.totalRevenue} icon={TrendingUp} format="currency" />
        <MetricCard title="Total Expenses" value={summary.totalExpenses} icon={Receipt} format="currency" />
        <MetricCard title="Total Profit" value={summary.totalProfit} icon={DollarSign} format="currency" />
        <MetricCard title="Avg Margin" value={summary.avgMargin} icon={Activity} format="percent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Project</th>
                    <th className="text-right py-3 px-4">Budget</th>
                    <th className="text-right py-3 px-4">Revenue</th>
                    <th className="text-right py-3 px-4">Expenses</th>
                    <th className="text-right py-3 px-4">Profit</th>
                    <th className="text-right py-3 px-4">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 10).map((project, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{project.projectName}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(project.budget)}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(project.revenue)}</td>
                      <td className="py-3 px-4 text-right text-red-600">{formatCurrency(project.expenses)}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(project.profit)}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={parseFloat(project.margin) > 20 ? 'default' : 'destructive'}>
                          {project.margin}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Briefcase className="h-8 w-8 mb-2 opacity-50" />
              <p>No project data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Team Performance Report
function TeamPerformanceReport({ data }) {
  // Ensure teamData is always an array
  const rawData = data?.data
  const teamData = Array.isArray(rawData) ? rawData : []

  if (teamData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Team Data Available</p>
        <p className="text-sm">No team members found in the selected period</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData.map((member, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{member.userName}</p>
                    <p className="text-sm text-muted-foreground">{member.email} • {member.role}</p>
                  </div>
                  <Badge>{formatCurrency(member.metrics?.leads?.revenue || 0)}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tasks</p>
                    <p className="font-medium">{member.metrics?.tasks?.completed || 0}/{member.metrics?.tasks?.total || 0} ({member.metrics?.tasks?.completionRate || 0}%)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Leads Won</p>
                    <p className="font-medium">{member.metrics?.leads?.won || 0}/{member.metrics?.leads?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Projects</p>
                    <p className="font-medium">{member.metrics?.projects || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Activity Report
function ActivityReport({ data }) {
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Leads" value={summary.totalLeads} icon={Target} />
        <MetricCard title="Total Tasks" value={summary.totalTasks} icon={CheckCircle2} />
        <MetricCard title="Total Projects" value={summary.totalProjects} icon={Briefcase} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line data={data?.data?.leads || []} type="monotone" dataKey="count" stroke="#6366f1" name="Leads" />
                <Line data={data?.data?.tasks || []} type="monotone" dataKey="count" stroke="#22c55e" name="Tasks" />
                <Line data={data?.data?.projects || []} type="monotone" dataKey="count" stroke="#f97316" name="Projects" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Customer Acquisition Report
function CustomerAcquisitionReport({ data }) {
  const bySource = data?.data?.bySource || []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard title="Total Customers" value={summary.total} icon={Users} />
        <MetricCard title="Top Source" value={summary.topSource} icon={Target} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acquisition by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={bySource}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  nameKey="_id"
                  label
                >
                  {bySource.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Customer LTV Report
function CustomerLTVReport({ data }) {
  // Ensure customers is always an array
  const rawCustomers = data?.data?.customers
  const customers = Array.isArray(rawCustomers) ? rawCustomers : []
  const summary = data?.data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Average CLV" value={summary.avgCLV} icon={DollarSign} format="currency" />
        <MetricCard title="Top Customer Value" value={summary.topCustomerValue} icon={Award} format="currency" />
        <MetricCard title="Total Customers" value={summary.totalCustomers} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Customers by Lifetime Value</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length > 0 ? (
            <div className="space-y-4">
              {customers.slice(0, 10).map((customer, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    i === 0 ? 'bg-yellow-500 text-white' :
                    i === 1 ? 'bg-slate-400 text-white' :
                    i === 2 ? 'bg-orange-400 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{customer.contactName}</p>
                    <p className="text-sm text-muted-foreground">{customer.company} • {customer.totalOrders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(customer.lifetimeValue)}</p>
                    <p className="text-sm text-muted-foreground">Avg: {formatCurrency(customer.avgOrderValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p>No customer data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Generic Report (fallback)
function GenericReport({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Data</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  )
}

// Missing icon import
const Tag = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
  </svg>
)

export default EnterpriseReports
