'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Building2, Search, Filter, MoreVertical, Mail, Phone, Globe,
  Calendar, CreditCard, Package, Users, Activity, Edit, Trash2,
  Eye, UserPlus, Download, Upload, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, TrendingUp,
  Settings, Shield, Ban, PlayCircle, PauseCircle, ChevronRight,
  FileText, MessageSquare, BarChart3, Zap, Star, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

const ClientCard = ({ client, onView, onEdit, onAction }) => {
  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    suspended: 'bg-red-100 text-red-700 border-red-200',
    trial: 'bg-amber-100 text-amber-700 border-amber-200',
    inactive: 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                  {client.company?.charAt(0) || client.name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900">{client.company || client.name}</h3>
                <p className="text-sm text-slate-500">{client.email}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onView?.(client)}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(client)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Client
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction?.('impersonate', client)}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Login as Client
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction?.('email', client)}>
                  <Mail className="h-4 w-4 mr-2" /> Send Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {client.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onAction?.('suspend', client)} className="text-red-600">
                    <PauseCircle className="h-4 w-4 mr-2" /> Suspend
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onAction?.('activate', client)} className="text-emerald-600">
                    <PlayCircle className="h-4 w-4 mr-2" /> Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Badge className={statusColors[client.status || 'active']}>
              {client.status || 'Active'}
            </Badge>
            <Badge variant="outline">{client.plan || 'Professional'}</Badge>
            {client.verified && (
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center py-3 border-y border-slate-100">
            <div>
              <p className="text-lg font-bold text-slate-900">{client.users || 0}</p>
              <p className="text-xs text-slate-500">Users</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{client.modules || 0}</p>
              <p className="text-xs text-slate-500">Modules</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">₹{(client.revenue || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Revenue</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString() : 'N/A'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onView?.(client)} className="text-blue-600 hover:text-blue-700">
              View <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const ClientDetailPanel = ({ client, onClose }) => {
  if (!client) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Client Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
          <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold">
              {client.company?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{client.company || client.name}</h3>
            <p className="text-slate-500">{client.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{client.plan || 'Professional'}</Badge>
              <Badge variant="outline">{client.status || 'Active'}</Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{client.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span>{client.website || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Subscription Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium">{client.plan || 'Professional'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge>{client.status || 'Active'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Next Billing</span>
                  <span className="font-medium">Jan 15, 2025</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Active Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(client.activeModules || ['CRM', 'Leads', 'Projects']).map((mod, i) => (
                    <Badge key={i} variant="outline">{mod}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Invoice #{2024001 + i}</p>
                        <p className="text-sm text-slate-500">Dec {10 - i}, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{(9999 + i * 1000).toLocaleString()}</p>
                        <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Storage</span>
                    <span className="text-sm font-medium">2.4 GB / 10 GB</span>
                  </div>
                  <Progress value={24} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">API Calls</span>
                    <span className="text-sm font-medium">8,420 / 50,000</span>
                  </div>
                  <Progress value={16.8} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Users</span>
                    <span className="text-sm font-medium">{client.users || 5} / 25</span>
                  </div>
                  <Progress value={20} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Logged in', 'Created new lead', 'Updated project', 'Added team member', 'Generated invoice'].map((action, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm">{action}</p>
                        <p className="text-xs text-slate-400">{i + 1} hour{i > 0 ? 's' : ''} ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  )
}

export function ClientsManagement() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedClient, setSelectedClient] = useState(null)
  const [viewMode, setViewMode] = useState('grid')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/clients')
      const data = await res.json()
      if (Array.isArray(data)) {
        setClients(data.map(c => ({
          ...c,
          users: Math.floor(Math.random() * 20) + 1,
          modules: Math.floor(Math.random() * 8) + 1,
          revenue: Math.floor(Math.random() * 50000) + 5000,
          status: ['active', 'active', 'active', 'trial'][Math.floor(Math.random() * 4)],
          verified: Math.random() > 0.3
        })))
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleAction = (action, client) => {
    switch (action) {
      case 'suspend':
        toast.success(`Client ${client.company || client.name} suspended`)
        break
      case 'activate':
        toast.success(`Client ${client.company || client.name} activated`)
        break
      case 'impersonate':
        toast.info(`Logging in as ${client.company || client.name}...`)
        break
      case 'email':
        toast.info(`Opening email composer for ${client.email}`)
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Client Management</h2>
          <p className="text-slate-500">Manage all your enterprise clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-slate-500">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'trial').length}</p>
                <p className="text-xs text-slate-500">On Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{clients.reduce((sum, c) => sum + (c.revenue || 0), 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clients by name, company, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchClients}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client, i) => (
            <ClientCard
              key={client.id || i}
              client={client}
              onView={setSelectedClient}
              onEdit={(c) => toast.info(`Editing ${c.company || c.name}`)}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No clients found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Client Detail Panel */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <ClientDetailPanel client={selectedClient} onClose={() => setSelectedClient(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ClientsManagement