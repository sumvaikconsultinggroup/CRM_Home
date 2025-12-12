'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export function SuperAdminReports({ stats, clients }) {
  // Mock data for trends if not available in stats
  const revenueData = [
    { name: 'Jan', revenue: 12000 },
    { name: 'Feb', revenue: 15000 },
    { name: 'Mar', revenue: 18000 },
    { name: 'Apr', revenue: 22000 },
    { name: 'May', revenue: 25000 },
    { name: 'Jun', revenue: 32000 },
  ]

  const clientGrowthData = [
    { name: 'Jan', clients: 5 },
    { name: 'Feb', clients: 8 },
    { name: 'Mar', clients: 12 },
    { name: 'Apr', clients: 18 },
    { name: 'May', clients: 25 },
    { name: 'Jun', clients: 32 },
  ]

  // Plan Distribution from real data
  const planData = stats?.charts?.planDistribution || [
    { name: 'Basic', value: 10 },
    { name: 'Professional', value: 15 },
    { name: 'Enterprise', value: 5 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.overview?.annualRevenue?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview?.activeClients || 0}</div>
            <p className="text-xs text-muted-foreground">+12 since last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4%</div>
            <p className="text-xs text-muted-foreground text-green-500">-0.5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenueAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenueAdmin)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Client Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clients" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="plan"
                >
                  {planData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
