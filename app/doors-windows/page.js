'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Doors & Windows Module...</p>
        </div>
      </div>
    )
  }

  return <DoorsWindowsModule client={client} user={user} />
}
