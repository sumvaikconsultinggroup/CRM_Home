'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Calendar } from 'lucide-react'

export default function TermsPage() {
  const router = useRouter()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await fetch('/api/pages?slug=terms')
        const result = await response.json()
        if (result.success && result.data) {
          setPage(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch page:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPage()
  }, [])

  const defaultContent = `
## Terms of Service

**Last Updated: December 2025**

### 1. Acceptance of Terms

By accessing or using BuildCRM, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.

### 2. Description of Service

BuildCRM is a cloud-based customer relationship management and business management platform designed for the construction and home improvement industry. Our services include:
- Lead and customer management
- Project and task management
- Inventory tracking
- Invoicing and payments
- Team collaboration tools
- Industry-specific modules

### 3. Account Registration

**Requirements:**
- You must be at least 18 years old
- You must provide accurate and complete information
- You are responsible for maintaining account security
- One person or business per account

**Account Security:**
- Keep your password confidential
- Notify us immediately of any unauthorized access
- You are responsible for all activities under your account

### 4. Subscription and Payments

**Billing:**
- Subscriptions are billed monthly or annually
- Prices are subject to change with 30 days notice
- All fees are non-refundable unless otherwise stated

**Free Trial:**
- 14-day free trial available
- No credit card required for trial
- Full access to features during trial

### 5. Acceptable Use

**You agree NOT to:**
- Use the service for illegal purposes
- Upload malicious code or viruses
- Attempt to gain unauthorized access
- Interfere with other users' access
- Use automated systems to access the service
- Resell or redistribute the service

### 6. Data Ownership

**Your Data:**
- You retain ownership of all data you upload
- We do not claim ownership of your business data
- You can export your data at any time
- We use your data only to provide the service

**Our Content:**
- BuildCRM owns all platform features and design
- Our trademarks and branding are protected
- You may not copy or modify our platform

### 7. Service Availability

**Uptime:**
- We strive for 99.9% uptime
- Scheduled maintenance will be notified in advance
- We are not liable for downtime beyond our control

**Support:**
- Email support for all plans
- Priority support for Professional plans
- Dedicated support for Enterprise plans

### 8. Limitation of Liability

BuildCRM is provided "as is" without warranties. We are not liable for:
- Loss of data or profits
- Business interruption
- Indirect or consequential damages

Our maximum liability is limited to the amount paid in the last 12 months.

### 9. Termination

**By You:**
- You can cancel your subscription anytime
- No refunds for partial months
- Data export available for 30 days after cancellation

**By Us:**
- We may terminate for violation of these terms
- We may discontinue the service with 90 days notice

### 10. Changes to Terms

We may update these terms from time to time. Continued use after changes constitutes acceptance of new terms.

### 11. Governing Law

These terms are governed by the laws of India. Disputes will be resolved in the courts of Mumbai.

### 12. Contact

For questions about these terms:
- Email: legal@buildcrm.com
- Address: Mumbai, India
  `

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">BuildCRM</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {page?.title || 'Terms of Service'}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Last updated: {page?.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : 'December 2025'}
              </span>
            </div>

            <div className="prose prose-lg max-w-none">
              <div 
                className="text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: (page?.content || defaultContent)
                    .replace(/### (.*)/g, '<h3 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h3>')
                    .replace(/## (.*)/g, '<h2 class="text-2xl font-bold text-gray-900 mt-10 mb-4">$1</h2>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                    .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
                    .replace(/\n\n/g, '<br/><br/>')
                }}
              />
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">© 2025 BuildCRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
