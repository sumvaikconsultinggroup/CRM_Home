'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, Clock, ArrowRight, User, Tag } from 'lucide-react'

// Default blog posts
const defaultPosts = [
  {
    id: 'blog_1',
    slug: 'why-construction-needs-crm',
    title: 'Why Every Construction Business Needs a CRM in 2025',
    excerpt: 'Discover how a CRM can transform your construction business operations, from lead management to project delivery.',
    content: 'Full article content here...',
    author: 'BuildCRM Team',
    category: 'Industry Insights',
    readTime: '5 min read',
    publishedAt: '2025-12-01',
    featured: true,
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800'
  },
  {
    id: 'blog_2',
    slug: 'lead-management-tips',
    title: '10 Lead Management Tips for Home Improvement Businesses',
    excerpt: 'Learn proven strategies to capture, nurture, and convert more leads into paying customers.',
    content: 'Full article content here...',
    author: 'BuildCRM Team',
    category: 'Tips & Guides',
    readTime: '7 min read',
    publishedAt: '2025-11-28',
    featured: false,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800'
  },
  {
    id: 'blog_3',
    slug: 'inventory-management-flooring',
    title: 'Mastering Inventory Management for Flooring Businesses',
    excerpt: 'Stop losing money on stockouts and overstocking. Here\'s how to optimize your flooring inventory.',
    content: 'Full article content here...',
    author: 'BuildCRM Team',
    category: 'Operations',
    readTime: '6 min read',
    publishedAt: '2025-11-25',
    featured: false,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
  },
  {
    id: 'blog_4',
    slug: 'gst-invoicing-construction',
    title: 'GST Invoicing Best Practices for Construction Companies',
    excerpt: 'Everything you need to know about GST-compliant invoicing for your construction business in India.',
    content: 'Full article content here...',
    author: 'BuildCRM Team',
    category: 'Finance',
    readTime: '8 min read',
    publishedAt: '2025-11-20',
    featured: false,
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
  }
]

export default function BlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState(defaultPosts)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/pages')
        const result = await response.json()
        if (result.success && result.data?.length > 0) {
          const blogPosts = result.data.filter(p => p.type === 'blog')
          if (blogPosts.length > 0) {
            setPosts(blogPosts)
          }
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const categories = ['All', 'Industry Insights', 'Tips & Guides', 'Operations', 'Finance']
  
  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === activeCategory)

  const featuredPost = posts.find(p => p.featured) || posts[0]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="font-bold text-gray-900">BuildCRM Blog</span>
            </div>
            <Button onClick={() => router.push('/')} size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Badge className="bg-white/20 text-white border-0 mb-4">Blog</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Insights for Construction Businesses
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Tips, guides, and industry insights to help you grow your business.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              onClick={() => router.push(`/blog/${featuredPost.slug}`)}
              className="grid lg:grid-cols-2 gap-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl overflow-hidden cursor-pointer border border-gray-100 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="aspect-video lg:aspect-auto bg-gray-200">
                {featuredPost.image && (
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-6 lg:p-10 flex flex-col justify-center">
                <Badge className="bg-blue-100 text-blue-700 w-fit mb-4">{featuredPost.category}</Badge>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-gray-600 mb-6">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {featuredPost.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {featuredPost.readTime}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Blog Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.filter(p => !p.featured).map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                onClick={() => router.push(`/blog/${post.slug}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-100"
              >
                <div className="aspect-video bg-gray-200">
                  {post.image && (
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-6">
                  <Badge className="bg-gray-100 text-gray-700 mb-3">{post.category}</Badge>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {post.publishedAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-gray-600 mb-8">
            Start your 14-day free trial and see how BuildCRM can help you grow.
          </p>
          <Button 
            size="lg" 
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
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
