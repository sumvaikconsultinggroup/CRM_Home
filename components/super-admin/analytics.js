'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3, TrendingUp, TrendingDown, Users, Building2, Package,
  DollarSign, ArrowUpRight, ArrowDownRight, Calendar, Download,
  RefreshCw, PieChart, Activity, Globe, Zap, Target, Award
} from 'lucide-react'

const MetricCard = ({ title, value, change, trend, icon: Icon, color }) => (
  <motion.div whileHover={{ y: -2 }}>
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
              trend === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {change}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

const ChartPlaceholder = ({ title, icon: Icon }) => (
  <div className="h-64 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
    <Icon className="h-12 w-12 text-slate-300 mb-3" />
    <p className="text-slate-500 font-medium">{title}</p>
    <p className="text-xs text-slate-400 mt-1">Interactive visualization</p>
  </div>
)

const TopItem = ({ rank, name, value, change, icon }) => (
  <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
      {rank}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-900 truncate">{name}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-900">{value}</p>
      <p className={`text-xs ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {change >= 0 ? '+' : ''}{change}%
      </p>
    </div>
  </div>
)

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(false)

  const metrics = [
    { title: 'Total Revenue', value: '₹12,45,680', change: '+15.3%', trend: 'up', icon: DollarSign, color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { title: 'Active Users', value: '2,847', change: '+8.2%', trend: 'up', icon: Users, color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { title: 'New Clients', value: '124', change: '+23.1%', trend: 'up', icon: Building2, color: 'bg-gradient-to-br from-purple-500 to-pink-600' },
    { title: 'Churn Rate', value: '2.4%', change: '-0.5%', trend: 'up', icon: TrendingDown, color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
  ]

  const topClients = [
    { name: 'ABC Interiors Pvt Ltd', value: '₹2,45,000', change: 12 },
    { name: 'XYZ Construction Co', value: '₹1,89,500', change: 8 },
    { name: 'Dream Homes Inc', value: '₹1,56,200', change: -3 },
    { name: 'BuildRight Solutions', value: '₹1,34,800', change: 15 },
    { name: 'Urban Spaces Design', value: '₹1,12,400', change: 5 },
  ]

  const topModules = [
    { name: 'CRM & Leads', value: '89%', change: 5 },
    { name: 'Project Management', value: '76%', change: 12 },
    { name: 'Invoicing', value: '71%', change: 8 },
    { name: 'Inventory', value: '54%', change: -2 },
    { name: 'Flooring Calculator', value: '45%', change: 18 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics & Reports</h2>
          <p className="text-slate-500">Platform performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <MetricCard key={i} {...metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartPlaceholder title="Revenue Chart" icon={BarChart3} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              User Growth
            </CardTitle>
            <CardDescription>New user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartPlaceholder title="User Growth Chart" icon={TrendingUp} />
          </CardContent>
        </Card>
      </div>

      {/* Module Usage & Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-500" />
              Revenue by Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Enterprise</span>
                  <span className="text-sm font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Professional</span>
                  <span className="text-sm font-medium">35%</span>
                </div>
                <Progress value={35} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Starter</span>
                  <span className="text-sm font-medium">15%</span>
                </div>
                <Progress value={15} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Trial</span>
                  <span className="text-sm font-medium">5%</span>
                </div>
                <Progress value={5} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Clients
            </CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topClients.map((client, i) => (
              <TopItem key={i} rank={i + 1} {...client} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              Module Adoption
            </CardTitle>
            <CardDescription>Usage across clients</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topModules.map((module, i) => (
              <TopItem key={i} rank={i + 1} name={module.name} value={module.value} change={module.change} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Geographic & Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Geographic Distribution
            </CardTitle>
            <CardDescription>Clients by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { region: 'Maharashtra', clients: 156, percentage: 35 },
                { region: 'Karnataka', clients: 89, percentage: 20 },
                { region: 'Delhi NCR', clients: 78, percentage: 17 },
                { region: 'Gujarat', clients: 56, percentage: 12 },
                { region: 'Tamil Nadu', clients: 45, percentage: 10 },
                { region: 'Others', clients: 27, percentage: 6 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-slate-600">{item.region}</span>
                  <div className="flex-1">
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                  <span className="text-sm font-medium w-16 text-right">{item.clients} clients</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Platform Performance
            </CardTitle>
            <CardDescription>System metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-slate-900">99.98%</p>
                <p className="text-sm text-slate-500 mt-1">Uptime</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-slate-900">45ms</p>
                <p className="text-sm text-slate-500 mt-1">Avg Response</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-slate-900">1.2M</p>
                <p className="text-sm text-slate-500 mt-1">API Calls/Day</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-slate-900">0.02%</p>
                <p className="text-sm text-slate-500 mt-1">Error Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalyticsDashboard