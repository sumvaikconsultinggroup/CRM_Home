'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, Clock, User, Share2, BookOpen, ChevronRight } from 'lucide-react'

export default function BlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState([])

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // First try to fetch from API
        const response = await fetch(`/api/pages?slug=${params.slug}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setPost(result.data)
        } else {
          // Fallback to default posts if not found in DB
          const defaultPost = getDefaultPost(params.slug)
          if (defaultPost) {
            setPost(defaultPost)
          }
        }

        // Fetch related posts
        const allPostsRes = await fetch('/api/pages')
        const allPostsResult = await allPostsRes.json()
        if (allPostsResult.success && allPostsResult.data) {
          const blogPosts = allPostsResult.data.filter(p => p.type === 'blog' && p.slug !== params.slug)
          setRelatedPosts(blogPosts.slice(0, 3))
        }
      } catch (error) {
        console.error('Failed to fetch post:', error)
        // Try default post
        const defaultPost = getDefaultPost(params.slug)
        if (defaultPost) {
          setPost(defaultPost)
        }
      } finally {
        setLoading(false)
      }
    }
    
    if (params.slug) {
      fetchPost()
    }
  }, [params.slug])

  // Default posts data
  const getDefaultPost = (slug) => {
    const defaultPosts = {
      'why-construction-needs-crm': {
        title: 'Why Every Construction Business Needs a CRM in 2025',
        content: `
          <h2>The Construction Industry is Changing</h2>
          <p>The construction industry has undergone a massive digital transformation in recent years. Businesses that once relied solely on spreadsheets, paper records, and word-of-mouth referrals are now discovering the power of Customer Relationship Management (CRM) systems specifically designed for their industry.</p>
          
          <h2>Key Challenges Without a CRM</h2>
          <p>Without a proper CRM system, construction businesses face several challenges:</p>
          <ul>
            <li><strong>Lost Leads:</strong> Inquiries slip through the cracks when managed via scattered emails and notes</li>
            <li><strong>Poor Follow-up:</strong> Without automated reminders, valuable opportunities are missed</li>
            <li><strong>Communication Gaps:</strong> Team members work in silos without visibility into customer interactions</li>
            <li><strong>Invoice Delays:</strong> Manual billing processes lead to cash flow issues</li>
            <li><strong>Inventory Mismanagement:</strong> Stock levels are unknown until it's too late</li>
          </ul>
          
          <h2>How BuildCRM Solves These Problems</h2>
          <p>BuildCRM was designed from the ground up for construction and home improvement businesses. Here's how it addresses these challenges:</p>
          
          <h3>1. Centralized Lead Management</h3>
          <p>All your leads in one place, with complete interaction history, automatic follow-up reminders, and lead scoring to prioritize your hottest prospects.</p>
          
          <h3>2. Industry-Specific Modules</h3>
          <p>Whether you're in flooring, roofing, solar, HVAC, or interiors, BuildCRM has purpose-built modules with features tailored to your specific trade.</p>
          
          <h3>3. Project & Task Management</h3>
          <p>Track every project from estimate to completion. Assign tasks, set deadlines, and keep your entire team aligned.</p>
          
          <h3>4. Smart Inventory Tracking</h3>
          <p>Know exactly what's in stock, set reorder alerts, and track materials across multiple warehouses or job sites.</p>
          
          <h3>5. GST-Compliant Invoicing</h3>
          <p>Generate professional invoices in seconds with automatic GST calculations. Accept payments online and track outstanding balances.</p>
          
          <h2>The Bottom Line</h2>
          <p>In 2025, running a construction business without a CRM is like building without a blueprint. You might get the job done, but you'll waste time, money, and opportunities along the way.</p>
          
          <p>Start your free 14-day trial of BuildCRM today and see the difference a purpose-built CRM can make for your business.</p>
        `,
        author: 'BuildCRM Team',
        category: 'Industry Insights',
        readTime: '5 min read',
        publishedAt: '2025-12-01',
        image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200'
      },
      'lead-management-tips': {
        title: '10 Lead Management Tips for Home Improvement Businesses',
        content: `
          <h2>Introduction</h2>
          <p>Lead management is the lifeblood of any home improvement business. Here are 10 proven strategies to capture, nurture, and convert more leads.</p>
          
          <h2>1. Respond Within 5 Minutes</h2>
          <p>Studies show that leads contacted within 5 minutes are 9x more likely to convert. Set up instant notifications and have a response system ready.</p>
          
          <h2>2. Use Multiple Contact Methods</h2>
          <p>Don't just rely on phone calls. Some customers prefer email, WhatsApp, or text. Meet them where they are.</p>
          
          <h2>3. Implement Lead Scoring</h2>
          <p>Not all leads are equal. Score leads based on budget, timeline, and engagement to focus your efforts on the most promising prospects.</p>
          
          <h2>4. Automate Follow-ups</h2>
          <p>Set up automated email sequences and reminders. Never let a lead go cold because you forgot to follow up.</p>
          
          <h2>5. Track Your Sources</h2>
          <p>Know where your leads come from. This helps you double down on channels that work and cut ones that don't.</p>
          
          <h2>6. Create a Referral Program</h2>
          <p>Your best leads often come from happy customers. Incentivize referrals with discounts or rewards.</p>
          
          <h2>7. Nurture Long-Term Leads</h2>
          <p>Not everyone is ready to buy now. Keep in touch with monthly newsletters and seasonal promotions.</p>
          
          <h2>8. Use a CRM</h2>
          <p>Stop managing leads in spreadsheets. A proper CRM keeps everything organized and accessible.</p>
          
          <h2>9. Train Your Team</h2>
          <p>Everyone who touches leads should know your process. Consistent follow-up equals consistent results.</p>
          
          <h2>10. Measure and Improve</h2>
          <p>Track your conversion rates, average response time, and win rate. What gets measured gets improved.</p>
        `,
        author: 'BuildCRM Team',
        category: 'Tips & Guides',
        readTime: '7 min read',
        publishedAt: '2025-11-28',
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200'
      }
    }
    return defaultPosts[slug] || null
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: window.location.href
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <BookOpen className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
        <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/blog')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>
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
              onClick={() => router.push('/blog')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Blog</span>
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

      {/* Hero Image */}
      {post.image && (
        <div className="pt-16 bg-gray-100">
          <div className="max-w-5xl mx-auto">
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-[300px] md:h-[400px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <main className={`${post.image ? 'pt-8' : 'pt-24'} pb-16`}>
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {post.category && (
                <Badge className="bg-blue-100 text-blue-700">{post.category}</Badge>
              )}
              {post.type && (
                <Badge variant="outline" className="capitalize">{post.type}</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {post.title}
            </h1>

            {/* Author & Date */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
              {post.author && (
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {post.author.charAt(0)}
                  </div>
                  {post.author}
                </span>
              )}
              {post.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              )}
              {post.readTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.readTime}
                </span>
              )}
            </div>

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-blue-500"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, i) => (
                    <Badge key={i} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </article>
      </main>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost, i) => (
                <motion.article
                  key={relatedPost.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => router.push(`/blog/${relatedPost.slug}`)}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-100"
                >
                  {relatedPost.image && (
                    <div className="aspect-video bg-gray-200">
                      <img 
                        src={relatedPost.image} 
                        alt={relatedPost.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {relatedPost.excerpt || relatedPost.content?.substring(0, 100)}...
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Start your 14-day free trial and see how BuildCRM can help you grow.
          </p>
          <Button 
            size="lg" 
            onClick={() => router.push('/')}
            className="bg-white text-indigo-600 hover:bg-indigo-50"
          >
            Start Free Trial
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">© 2025 BuildCRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
