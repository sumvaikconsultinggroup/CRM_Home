'use client'

import { Card } from '@/components/ui/card'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function ExpenseCharts({ expenses }) {
  // Aggregate data by category
  const categoryData = expenses.reduce((acc, curr) => {
    const existing = acc.find(i => i.name === curr.category)
    if (existing) {
      existing.value += curr.amount || 0
    } else {
      acc.push({ name: curr.category, value: curr.amount || 0 })
    }
    return acc
  }, [])

  // Aggregate data by month (last 6 months)
  const monthlyData = expenses.reduce((acc, curr) => {
    if (!curr.date) return acc
    const date = new Date(curr.date)
    const key = date.toLocaleString('default', { month: 'short', year: '2-digit' })
    const existing = acc.find(i => i.name === key)
    if (existing) {
      existing.value += curr.amount || 0
    } else {
      acc.push({ name: key, value: curr.amount || 0 })
    }
    return acc
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date)) // Simple sort might need improvement

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Expenses by Category</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Expenses Trend</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="value" name="Amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
