'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  IndianRupee, Receipt, CheckCircle2, Clock, AlertTriangle,
  Search, Download, Filter, RefreshCw, Eye, TrendingUp, TrendingDown,
  CreditCard, Banknote, Wallet, BarChart3, PieChart, ArrowUpRight, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

// Status badge styles
const statusStyles = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
  partial: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-slate-100 text-slate-700'
}

export function FinanceTab({ client, user }) {
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSubTab, setActiveSubTab] = useState('overview')

  // Fetch finance data
  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    setLoading(true)
    try {
      // Fetch invoices from D&W module
      const [invoicesRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/invoices`),
        fetch(`${API_BASE}/post-invoicing?action=payments`)
      ])

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.data?.invoices || invoicesData.invoices || [])
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPayments(paymentsData.data?.payments || paymentsData.payments || [])
      }
    } catch (error) {
      console.error('Failed to fetch finance data:', error)
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0)
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' || inv.paymentStatus === 'paid')
  const pendingInvoices = invoices.filter(inv => ['pending', 'sent', 'partial'].includes(inv.status) || ['pending', 'partial'].includes(inv.paymentStatus))
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === 'paid' || inv.paymentStatus === 'paid') return false
    const dueDate = new Date(inv.dueDate)
    return dueDate < new Date()
  })

  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0)
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + ((inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0)), 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + ((inv.grandTotal || inv.total || 0) - (inv.paidAmount || 0)), 0)

  // Collection rate
  const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0

  // Filter invoices by search
  const filteredInvoices = invoices.filter(inv =>
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading finance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Module Self-Contained Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Wallet className="h-5 w-5" />
            <span className="font-medium">D&W Finance Management</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            All financial data is managed within the Doors & Windows module. Invoices and payments are stored locally for this module.
          </p>
        </CardContent>
      </Card>

      {/* Finance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-2">{invoices.length} total invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Collected</p>
                <p className="text-2xl font-bold text-blue-700">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">{paidInvoices.length} paid invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-amber-700">₹{totalPending.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">{pendingInvoices.length} pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-700">₹{totalOverdue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">{overdueInvoices.length} overdue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-700">{collectionRate}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">of total invoiced</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs for detailed views */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber || invoice.id?.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">{invoice.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{(invoice.grandTotal || invoice.total || 0).toLocaleString()}</p>
                        <Badge className={statusStyles[invoice.status || invoice.paymentStatus] || statusStyles.pending}>
                          {invoice.status || invoice.paymentStatus || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No invoices yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {payment.method === 'cash' && <Banknote className="h-4 w-4 inline mr-1" />}
                          {payment.method === 'upi' && <Wallet className="h-4 w-4 inline mr-1" />}
                          {payment.method === 'bank' && <CreditCard className="h-4 w-4 inline mr-1" />}
                          {payment.reference || payment.id?.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-500">{new Date(payment.date || payment.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600">+₹{(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 capitalize">{payment.method}</p>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No payments recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Invoices</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search invoices..."
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchFinanceData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const total = invoice.grandTotal || invoice.total || 0
                    const paid = invoice.paidAmount || 0
                    const balance = total - paid
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id?.slice(0, 8)}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">₹{total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-emerald-600">₹{paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-amber-600">₹{balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusStyles[invoice.status || invoice.paymentStatus] || statusStyles.pending}>
                            {invoice.status || invoice.paymentStatus || 'pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchFinanceData}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.reference || payment.id?.slice(0, 8)}</TableCell>
                      <TableCell>{payment.invoiceNumber || payment.invoiceId?.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(payment.date || payment.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.method === 'cash' && <Banknote className="h-3 w-3 mr-1" />}
                          {payment.method === 'upi' && <Wallet className="h-3 w-3 mr-1" />}
                          {payment.method === 'bank' && <CreditCard className="h-3 w-3 mr-1" />}
                          {payment.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        +₹{(payment.amount || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FinanceTab
