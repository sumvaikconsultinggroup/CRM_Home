'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Calendar, Clock, User, Share2, FileText } from 'lucide-react'

export default function DynamicPage() {
  const params = useParams()
  const router = useRouter()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await fetch(`/api/pages?slug=${params.slug}`)
        if (response.ok) {
          const data = await response.json()
          if (data && !data.error) {
            setPage(data)
          } else {
            setNotFound(true)
          }
        } else {
          setNotFound(true)
        }
      } catch (error) {
        console.error('Failed to fetch page:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (params.slug) {
      fetchPage()
    }
  }, [params.slug])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: page?.title,
          url: window.location.href
        })
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <FileText className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-8 max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button onClick={() => router.push('/')} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">BuildCRM</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {page.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
              {page.updatedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Last updated: {new Date(page.updatedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              )}
            </div>

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-blue-500"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </motion.div>
        </article>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">BuildCRM</span>
            </div>
            <p className="text-gray-500 text-sm">© 2025 BuildCRM. All rights reserved.</p>
            <div className="flex gap-4 text-sm">
              <a href="/privacy" className="text-gray-500 hover:text-gray-900">Privacy</a>
              <a href="/terms" className="text-gray-500 hover:text-gray-900">Terms</a>
              <a href="/blog" className="text-gray-500 hover:text-gray-900">Blog</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
