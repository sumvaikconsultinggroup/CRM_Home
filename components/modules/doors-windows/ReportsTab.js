'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3, PieChart, TrendingUp, Download, FileText, Calendar,
  DollarSign, Package, Users, Factory, Truck, Wrench, Shield,
  Clock, Target, Award, AlertTriangle, CheckCircle2, Filter,
  RefreshCw, Printer, Mail, Share2, Eye
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Report categories
const REPORT_CATEGORIES = [
  { id: 'sales', name: 'Sales & Revenue', icon: DollarSign, color: 'text-emerald-600' },
  { id: 'production', name: 'Production', icon: Factory, color: 'text-blue-600' },
  { id: 'inventory', name: 'Inventory', icon: Package, color: 'text-amber-600' },
  { id: 'customer', name: 'Customer', icon: Users, color: 'text-purple-600' },
  { id: 'installation', name: 'Installation', icon: Wrench, color: 'text-indigo-600' },
  { id: 'warranty', name: 'Warranty & Service', icon: Shield, color: 'text-red-600' }
]

// All available reports (20+)
const REPORTS = [
  // Sales & Revenue Reports
  { id: 'sales-summary', name: 'Sales Summary Report', category: 'sales', description: 'Overview of total sales, revenue, and trends', popular: true },
  { id: 'quote-conversion', name: 'Quote Conversion Report', category: 'sales', description: 'Analysis of quote to order conversion rates' },
  { id: 'revenue-by-product', name: 'Revenue by Product Type', category: 'sales', description: 'Revenue breakdown by doors, windows, accessories' },
  { id: 'revenue-by-material', name: 'Revenue by Material', category: 'sales', description: 'Revenue analysis by Aluminium, uPVC, Wood, etc.' },
  { id: 'monthly-sales', name: 'Monthly Sales Trend', category: 'sales', description: 'Month-over-month sales comparison', popular: true },
  { id: 'top-customers', name: 'Top Customers Report', category: 'sales', description: 'Highest value customers and repeat orders' },
  { id: 'pending-payments', name: 'Pending Payments Report', category: 'sales', description: 'Outstanding payments and aging analysis' },
  
  // Production Reports
  { id: 'production-summary', name: 'Production Summary', category: 'production', description: 'Overview of work orders and production status', popular: true },
  { id: 'production-efficiency', name: 'Production Efficiency', category: 'production', description: 'Time and resource utilization analysis' },
  { id: 'work-order-status', name: 'Work Order Status Report', category: 'production', description: 'Status of all active work orders' },
  { id: 'delayed-orders', name: 'Delayed Orders Report', category: 'production', description: 'Orders that have missed deadlines' },
  { id: 'material-consumption', name: 'Material Consumption', category: 'production', description: 'Raw material usage per production batch' },
  
  // Inventory Reports
  { id: 'stock-levels', name: 'Stock Levels Report', category: 'inventory', description: 'Current inventory levels across all items', popular: true },
  { id: 'low-stock-alert', name: 'Low Stock Alert Report', category: 'inventory', description: 'Items below reorder point' },
  { id: 'inventory-valuation', name: 'Inventory Valuation', category: 'inventory', description: 'Total value of current inventory' },
  { id: 'stock-movement', name: 'Stock Movement Report', category: 'inventory', description: 'Inventory in/out movements' },
  
  // Customer Reports
  { id: 'customer-list', name: 'Customer Master List', category: 'customer', description: 'Complete customer database', popular: true },
  { id: 'customer-orders', name: 'Customer Order History', category: 'customer', description: 'Order history by customer' },
  { id: 'customer-feedback', name: 'Customer Feedback Report', category: 'customer', description: 'Ratings and feedback analysis' },
  { id: 'new-customers', name: 'New Customers Report', category: 'customer', description: 'Newly acquired customers in period' },
  
  // Installation Reports
  { id: 'installation-schedule', name: 'Installation Schedule', category: 'installation', description: 'Upcoming and scheduled installations', popular: true },
  { id: 'installation-completion', name: 'Installation Completion Report', category: 'installation', description: 'Completed installations and timelines' },
  { id: 'installer-performance', name: 'Installer Performance', category: 'installation', description: 'Team-wise installation metrics' },
  
  // Warranty & Service Reports
  { id: 'warranty-register', name: 'Warranty Register', category: 'warranty', description: 'All active warranties and expiry dates' },
  { id: 'service-tickets', name: 'Service Tickets Report', category: 'warranty', description: 'Open and resolved service requests' },
  { id: 'warranty-claims', name: 'Warranty Claims Report', category: 'warranty', description: 'Claims filed and their status' },
  { id: 'expiring-warranties', name: 'Expiring Warranties', category: 'warranty', description: 'Warranties expiring in next 30 days' }
]

export function ReportsTab({ headers, glassStyles }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [dateRange, setDateRange] = useState('this-month')

  const filteredReports = REPORTS.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory
    const matchesSearch = !searchQuery || 
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const popularReports = REPORTS.filter(r => r.popular)

  const handleGenerateReport = async (report) => {
    setSelectedReport(report)
    setGenerating(true)
    
    // Simulate report generation
    await new Promise(r => setTimeout(r, 2000))
    
    setGenerating(false)
    toast.success(`${report.name} generated successfully`)
  }

  const handleDownloadReport = (format) => {
    toast.success(`Downloading report as ${format.toUpperCase()}`)
  }

  const handleShareReport = () => {
    toast.success('Report sharing link copied!')
  }

  // Sample data for report preview
  const sampleMetrics = {
    'sales-summary': {
      totalSales: '₹45.2L',
      ordersCount: 156,
      avgOrderValue: '₹29,000',
      growth: '+12%'
    },
    'stock-levels': {
      totalItems: 248,
      lowStock: 12,
      outOfStock: 3,
      totalValue: '₹18.5L'
    },
    'production-summary': {
      activeWO: 24,
      completed: 89,
      onTime: '92%',
      avgDays: 5.2
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
          <p className="text-slate-500">Generate detailed reports and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Reports</p>
                <p className="text-2xl font-bold text-slate-800">{REPORTS.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Categories</p>
                <p className="text-2xl font-bold text-slate-800">{REPORT_CATEGORIES.length}</p>
              </div>
              <PieChart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Popular Reports</p>
                <p className="text-2xl font-bold text-slate-800">{popularReports.length}</p>
              </div>
              <Award className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={glassStyles?.card}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Recent Reports</p>
                <p className="text-2xl font-bold text-emerald-600">5</p>
              </div>
              <Clock className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Reports */}
      <Card className={glassStyles?.card}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            Popular Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularReports.map(report => {
              const category = REPORT_CATEGORIES.find(c => c.id === report.category)
              const Icon = category?.icon || FileText
              return (
                <Card 
                  key={report.id} 
                  className="cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-indigo-300"
                  onClick={() => handleGenerateReport(report)}
                >
                  <CardContent className="p-4">
                    <div className={`p-2 rounded-lg bg-slate-50 w-fit mb-2`}>
                      <Icon className={`h-5 w-5 ${category?.color || 'text-slate-600'}`} />
                    </div>
                    <h4 className="font-medium text-sm text-slate-800">{report.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{report.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Reports */}
      <Card className={glassStyles?.card}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">All Reports</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px] pl-8"
                />
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {REPORT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredReports.map(report => {
              const category = REPORT_CATEGORIES.find(c => c.id === report.category)
              const Icon = category?.icon || FileText
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border transition-all cursor-pointer"
                  onClick={() => handleGenerateReport(report)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-100`}>
                      <Icon className={`h-4 w-4 ${category?.color || 'text-slate-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">{report.name}</h4>
                      <p className="text-sm text-slate-500">{report.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {category?.name}
                    </Badge>
                    {report.popular && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">Popular</Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Modal */}
      {selectedReport && (
        <Card className={`${glassStyles?.card} border-2 border-indigo-200`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  {selectedReport.name}
                </CardTitle>
                <CardDescription>{selectedReport.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadReport('pdf')}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadReport('excel')}>
                  <Download className="h-4 w-4 mr-1" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareReport}>
                  <Share2 className="h-4 w-4 mr-1" /> Share
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="text-center py-12">
                <RefreshCw className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-slate-600">Generating report...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sample Report Preview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(sampleMetrics[selectedReport.id] || sampleMetrics['sales-summary']).map(([key, value]) => (
                    <div key={key} className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-800">{value}</p>
                      <p className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    </div>
                  ))}
                </div>

                {/* Sample Chart Placeholder */}
                <div className="h-64 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-indigo-300 mx-auto mb-2" />
                    <p className="text-slate-500">Chart visualization would appear here</p>
                    <p className="text-xs text-slate-400 mt-1">Interactive charts with real data</p>
                  </div>
                </div>

                {/* Sample Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 border-b font-medium text-slate-600">Item</th>
                        <th className="text-left p-3 border-b font-medium text-slate-600">Quantity</th>
                        <th className="text-left p-3 border-b font-medium text-slate-600">Value</th>
                        <th className="text-left p-3 border-b font-medium text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { item: 'Sliding Windows', qty: 45, value: '₹8,50,000', status: 'Active' },
                        { item: 'French Doors', qty: 23, value: '₹6,20,000', status: 'Active' },
                        { item: 'Casement Windows', qty: 38, value: '₹5,80,000', status: 'Active' }
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 border-b">{row.item}</td>
                          <td className="p-3 border-b">{row.qty}</td>
                          <td className="p-3 border-b font-medium">{row.value}</td>
                          <td className="p-3 border-b">
                            <Badge className="bg-emerald-100 text-emerald-700">{row.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
