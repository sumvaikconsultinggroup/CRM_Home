'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { EnterpriseFlooringModule } from '@/components/modules/enterprise-flooring-module'
import { FlooringMeeAgent } from '@/components/flooring-mee-agent'

export default function FlooringPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMeeAgent, setShowMeeAgent] = useState(false)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const storedClient = localStorage.getItem('client')

    console.log('FlooringPage auth check:', { token: !!token, storedUser: !!storedUser, storedClient: !!storedClient })

    if (!token) {
      toast.error('Please login to access this module')
      setTimeout(() => router.push('/'), 1000)
      return
    }

    try {
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
      if (storedClient) {
        setClient(JSON.parse(storedClient))
      }
      setLoading(false)
    } catch (error) {
      console.error('Error parsing stored data:', error)
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  const handleBackToDashboard = () => {
    // Navigate back to main page - the main page will check auth and show correct dashboard
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
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🪵</span>
              </div>
              <span className="font-semibold">Wooden Flooring Module</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mee AI Button */}
            {client?.planId === 'enterprise' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMeeAgent(!showMeeAgent)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                Mee AI Assistant
              </Button>
            )}
            
            <div className="text-right">
              <p className="text-sm font-medium">{client?.businessName || user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Module */}
        <div className={`flex-1 transition-all duration-300 ${showMeeAgent ? 'mr-96' : ''}`}>
          <EnterpriseFlooringModule client={client} user={user} />
        </div>

        {/* Mee AI Agent Panel */}
        {showMeeAgent && client?.planId === 'enterprise' && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed right-0 top-[57px] w-96 h-[calc(100vh-57px)] bg-white border-l shadow-xl z-40"
          >
            <FlooringMeeAgent 
              client={client} 
              onClose={() => setShowMeeAgent(false)} 
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
