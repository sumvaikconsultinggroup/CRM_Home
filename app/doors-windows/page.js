'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { DoorsWindowsModule } from '@/components/modules/doors-windows'

export default function DoorsWindowsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedClient = localStorage.getItem('client')

    if (!token) {
      toast.error('Please login to access this module')
      setTimeout(() => router.push('/'), 1000)
      return
    }

    try {
      if (storedUser) setUser(JSON.parse(storedUser))
      if (storedClient) setClient(JSON.parse(storedClient))
      setLoading(false)
    } catch (error) {
      console.error('Error parsing stored data:', error)
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const handleBackToDashboard = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🪟</span>
              </div>
              <span className="font-semibold">Doors & Windows Module</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium">{client?.businessName || user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DoorsWindowsModule client={client} user={user} />
    </div>
  )
}
