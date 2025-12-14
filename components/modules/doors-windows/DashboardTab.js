'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FileText, ShoppingCart, CheckCircle2, Clock, AlertTriangle,
  ArrowUpRight, TrendingUp, TrendingDown, Ruler, DoorOpen,
  Package, Wrench, BarChart3, Activity
} from 'lucide-react'

const StatCard = ({ title, value, subtitle, change, icon: Icon, gradient, glassStyles }) => (
  <Card className={`${glassStyles?.card || ''} overflow-hidden hover:shadow-xl transition-all duration-300`}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          {change && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {change.startsWith('+') ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${gradient}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
)

const RecentActivityItem = ({ title, description, time, status }) => {
  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    new: 'bg-blue-100 text-blue-700',
    urgent: 'bg-red-100 text-red-700'
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          status === 'completed' ? 'bg-emerald-500' :
          status === 'pending' ? 'bg-amber-500' :
          status === 'urgent' ? 'bg-red-500' : 'bg-blue-500'
        }`} />
        <div>
          <p className="font-medium text-slate-800 text-sm">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={statusColors[status] || 'bg-slate-100 text-slate-700'} variant="secondary">
          {status}
        </Badge>
        <span className="text-xs text-slate-400">{time}</span>
      </div>
    </div>
  )
}

export function DashboardTab({ dashboard, surveys, quotations, orders, loading, glassStyles }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className={glassStyles?.card}>
            <CardContent className="p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = dashboard?.stats || {}
  const recentSurveys = surveys?.slice(0, 3) || []
  const recentQuotes = quotations?.slice(0, 3) || []

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Surveys"
          value={surveys?.length || 0}
          subtitle={`${surveys?.filter(s => s.status === 'completed')?.length || 0} completed`}
          change="+12% this month"
          icon={Ruler}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          glassStyles={glassStyles}
        />
        <StatCard
          title="Active Quotations"
          value={quotations?.filter(q => ['draft', 'sent'].includes(q.status))?.length || 0}
          subtitle={`₹${(quotations?.reduce((s, q) => s + (q.grandTotal || 0), 0) / 100000)?.toFixed(1)}L total value`}
          icon={FileText}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          glassStyles={glassStyles}
        />
        <StatCard
          title="Orders"
          value={orders?.length || 0}
          subtitle={`${orders?.filter(o => o.status === 'in-production')?.length || 0} in production`}
          icon={ShoppingCart}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          glassStyles={glassStyles}
        />
        <StatCard
          title="Conversion Rate"
          value={`${quotations?.length > 0 ? Math.round((quotations?.filter(q => q.status === 'approved')?.length / quotations.length) * 100) : 0}%`}
          subtitle="Quote to order"
          change="+5% vs last month"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
          glassStyles={glassStyles}
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Status Overview */}
        <Card className={`${glassStyles?.card} lg:col-span-2`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Quote Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Draft', count: quotations?.filter(q => q.status === 'draft')?.length || 0, color: 'bg-slate-400' },
                { label: 'Sent', count: quotations?.filter(q => q.status === 'sent')?.length || 0, color: 'bg-blue-500' },
                { label: 'Approved', count: quotations?.filter(q => q.status === 'approved')?.length || 0, color: 'bg-emerald-500' },
                { label: 'Rejected', count: quotations?.filter(q => q.status === 'rejected')?.length || 0, color: 'bg-red-500' }
              ].map(item => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                  <Progress 
                    value={quotations?.length > 0 ? (item.count / quotations.length) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className={glassStyles?.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentSurveys.length > 0 ? (
                recentSurveys.map(survey => (
                  <RecentActivityItem
                    key={survey.id}
                    title={survey.surveyNumber || 'Survey'}
                    description={survey.siteName || survey.siteAddress?.substring(0, 30)}
                    time={new Date(survey.createdAt).toLocaleDateString()}
                    status={survey.status}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
              )}
              {recentQuotes.slice(0, 2).map(quote => (
                <RecentActivityItem
                  key={quote.id}
                  title={quote.quoteNumber || 'Quote'}
                  description={`₹${(quote.grandTotal || 0).toLocaleString()}`}
                  time={new Date(quote.createdAt).toLocaleDateString()}
                  status={quote.status}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`${glassStyles?.card} text-center py-4`}>
          <div className="text-3xl font-bold text-indigo-600">
            {surveys?.reduce((sum, s) => sum + (s.openingsCount || 0), 0) || 0}
          </div>
          <p className="text-sm text-slate-500">Total Openings Measured</p>
        </Card>
        <Card className={`${glassStyles?.card} text-center py-4`}>
          <div className="text-3xl font-bold text-emerald-600">
            ₹{((quotations?.filter(q => q.status === 'approved')?.reduce((s, q) => s + (q.grandTotal || 0), 0) || 0) / 100000).toFixed(1)}L
          </div>
          <p className="text-sm text-slate-500">Approved Value</p>
        </Card>
        <Card className={`${glassStyles?.card} text-center py-4`}>
          <div className="text-3xl font-bold text-amber-600">
            {orders?.filter(o => ['pending', 'confirmed', 'in-production'].includes(o.status))?.length || 0}
          </div>
          <p className="text-sm text-slate-500">Pending Orders</p>
        </Card>
        <Card className={`${glassStyles?.card} text-center py-4`}>
          <div className="text-3xl font-bold text-purple-600">
            {quotations?.filter(q => q.status === 'sent' && new Date(q.validUntil) > new Date())?.length || 0}
          </div>
          <p className="text-sm text-slate-500">Quotes Awaiting Response</p>
        </Card>
      </div>
    </div>
  )
}
