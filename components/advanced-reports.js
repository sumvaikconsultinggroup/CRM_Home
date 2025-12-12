'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Download, Filter, Calendar } from 'lucide-react'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

export function AdvancedReports({ stats, leads, projects, tasks, expenses }) {
  const [timeRange, setTimeRange] = useState('6m')
  const [reportType, setReportType] = useState('overview')

  // Prepare Chart Data
  const leadSourceData = leads.reduce((acc, lead) => {
    const existing = acc.find(i => i.name === lead.source)
    if (existing) existing.value++
    else acc.push({ name: lead.source, value: 1 })
    return acc
  }, [])

  const leadStatusData = leads.reduce((acc, lead) => {
    const existing = acc.find(i => i.name === lead.status)
    if (existing) existing.value++
    else acc.push({ name: lead.status, value: 1 })
    return acc
  }, [])

  // Module Specific Data (Mocked for now as we don't have deep module integration yet)
  const moduleData = [
    { name: 'Flooring', value: 120000, projects: 5 },
    { name: 'Kitchens', value: 85000, projects: 3 },
    { name: 'Tiles', value: 45000, projects: 2 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Advanced Reports</h2>
          <p className="text-muted-foreground">Comprehensive business analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 6 Months
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-900">₹{stats?.overview?.pipelineValue?.toLocaleString() || '0'}</p>
          <p className="text-xs text-blue-500 mt-1">+12.5% from last month</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <p className="text-sm text-green-600 font-medium">Conversion Rate</p>
          <p className="text-2xl font-bold text-green-900">{stats?.overview?.conversionRate || 0}%</p>
          <p className="text-xs text-green-500 mt-1">+2.1% from last month</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <p className="text-sm text-amber-600 font-medium">Avg Deal Size</p>
          <p className="text-2xl font-bold text-amber-900">₹45,000</p>
          <p className="text-xs text-amber-500 mt-1">-5.0% from last month</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <p className="text-sm text-purple-600 font-medium">Active Projects</p>
          <p className="text-2xl font-bold text-purple-900">{stats?.overview?.activeProjects || 0}</p>
          <p className="text-xs text-purple-500 mt-1">3 due this week</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Pipeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Sales Pipeline</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Lead Sources */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Lead Sources</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue Trend */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6">Revenue & Expenses Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Jan', revenue: 4000, expenses: 2400 },
                { name: 'Feb', revenue: 3000, expenses: 1398 },
                { name: 'Mar', revenue: 2000, expenses: 9800 },
                { name: 'Apr', revenue: 2780, expenses: 3908 },
                { name: 'May', revenue: 1890, expenses: 4800 },
                { name: 'Jun', revenue: 2390, expenses: 3800 },
              ]}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Module Performance */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6">Module Performance (Revenue)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="value" name="Revenue" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
