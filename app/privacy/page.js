'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Clock, Calendar } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const router = useRouter()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await fetch('/api/pages?slug=privacy-policy')
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

  // Default content if no page exists in database
  const defaultContent = `
## Privacy Policy

**Last Updated: December 2025**

### 1. Introduction

BuildCRM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our construction management platform.

### 2. Information We Collect

**Personal Information:**
- Name, email address, phone number
- Business name and address
- Payment information
- Login credentials

**Usage Data:**
- Log files and analytics
- Device and browser information
- IP address and location data
- Feature usage patterns

**Business Data:**
- Leads, customers, and contacts
- Projects and tasks
- Invoices and payments
- Inventory records

### 3. How We Use Your Information

We use the collected information to:
- Provide and maintain our services
- Process transactions and send invoices
- Send you updates and marketing communications
- Improve our platform and user experience
- Provide customer support
- Ensure security and prevent fraud

### 4. Data Storage and Security

- All data is encrypted in transit (TLS 1.3) and at rest (AES-256)
- We use secure cloud infrastructure with regular backups
- Access controls and audit logs are maintained
- We are GDPR compliant and follow industry best practices

### 5. Data Sharing

We do not sell your personal data. We may share data with:
- Service providers who assist in our operations
- Legal authorities when required by law
- Business partners with your consent

### 6. Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data ("Right to be forgotten")
- Export your data in a portable format
- Opt-out of marketing communications

### 7. Cookies and Tracking

We use cookies to:
- Keep you logged in
- Remember your preferences
- Analyze platform usage
- Improve our services

### 8. Data Retention

We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, we remove your data within 30 days, except where retention is required by law.

### 9. Changes to This Policy

We may update this policy from time to time. We will notify you of significant changes via email or platform notification.

### 10. Contact Us

For privacy-related questions:
- Email: privacy@buildcrm.com
- Address: Mumbai, India
  `

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

      {/* Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {page?.title || 'Privacy Policy'}
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

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 BuildCRM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
