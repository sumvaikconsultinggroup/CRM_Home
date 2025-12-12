'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, CheckCircle2, Star, Play, Users, BarChart3, 
  Shield, Zap, TrendingUp, Clock, DollarSign, Building2
} from 'lucide-react'

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
)

export default function ModuleDetailPage({ moduleId }) {
  const [module, setModule] = useState(null)
  const [plans, setPlans] = useState([])

  useEffect(() => {
    // Fetch module details
    fetch('/api/modules-public')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const foundModule = data.data.find(m => m.id === moduleId)
          setModule(foundModule)
        }
      })
      .catch(console.error)

    // Fetch plans
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPlans(data.data)
        }
      })
      .catch(console.error)
  }, [moduleId])

  const handleBack = () => {
    window.location.href = '/'
  }

  const handleGetStarted = () => {
    window.location.href = '/?view=register'
  }

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading module details...</p>
        </div>
      </div>
    )
  }

  // Module-specific content
  const moduleFeatures = {
    'wooden-flooring': {
      hero: {
        title: 'Flooring Module',
        subtitle: 'Complete flooring project management from inquiry to installation',
        tagline: 'Manage flooring projects efficiently'
      },
      features: [
        { icon: BarChart3, title: 'Project Tracking', description: 'Track flooring projects from start to finish with real-time updates' },
        { icon: DollarSign, title: 'Order Management', description: 'Manage orders, track materials, and coordinate with suppliers' },
        { icon: Clock, title: 'Installation Scheduling', description: 'Schedule installations and manage team availability' },
        { icon: CheckCircle2, title: 'Quality Control', description: 'Ensure quality with inspection checklists and feedback' }
      ],
      benefits: [
        'Reduce project delays by 40%',
        'Streamline supplier coordination',
        'Track material costs in real-time',
        'Generate professional quotations instantly'
      ],
      useCases: [
        {
          title: 'Residential Projects',
          description: 'Manage home flooring installations with precision'
        },
        {
          title: 'Commercial Projects',
          description: 'Handle large-scale commercial flooring contracts'
        },
        {
          title: 'Renovation Projects',
          description: 'Coordinate flooring updates and replacements'
        }
      ]
    },
    'doors-windows': {
      hero: {
        title: 'Doors & Windows Module',
        subtitle: 'Manage door and window installations with precision',
        tagline: 'From measurement to installation'
      },
      features: [
        { icon: BarChart3, title: 'Measurement Tools', description: 'Accurate measurement tracking and validation' },
        { icon: Users, title: 'Design Catalog', description: 'Browse and share design options with clients' },
        { icon: Clock, title: 'Installation Scheduling', description: 'Schedule installations and coordinate with teams' },
        { icon: Shield, title: 'Supplier Management', description: 'Manage multiple suppliers and track orders' }
      ],
      benefits: [
        'Reduce measurement errors by 60%',
        'Track custom orders efficiently',
        'Coordinate installations seamlessly',
        'Manage supplier relationships'
      ],
      useCases: [
        {
          title: 'Custom Door Installations',
          description: 'Handle bespoke door projects with ease'
        },
        {
          title: 'Window Replacements',
          description: 'Manage window replacement projects'
        },
        {
          title: 'Commercial Projects',
          description: 'Large-scale door and window installations'
        }
      ]
    },
    'architects': {
      hero: {
        title: 'Architects Module',
        subtitle: 'Complete architectural project management platform',
        tagline: 'Design, plan, and deliver architectural excellence'
      },
      features: [
        { icon: BarChart3, title: 'Blueprint Management', description: 'Store and version control all project blueprints' },
        { icon: Users, title: 'Client Portal', description: 'Share designs and get approvals from clients' },
        { icon: Shield, title: 'Regulatory Docs', description: 'Manage permits, approvals, and compliance' },
        { icon: Clock, title: 'Project Timeline', description: 'Track milestones and project progress' }
      ],
      benefits: [
        'Centralized blueprint storage',
        'Streamlined client communication',
        'Track regulatory compliance',
        'Manage project timelines effectively'
      ],
      useCases: [
        {
          title: 'Residential Design',
          description: 'Design and manage residential projects'
        },
        {
          title: 'Commercial Architecture',
          description: 'Handle large commercial projects'
        },
        {
          title: 'Renovation Projects',
          description: 'Manage building renovations and updates'
        }
      ]
    },
    'interior-designers': {
      hero: {
        title: 'Interior Designers Module',
        subtitle: 'Transform spaces with comprehensive interior design tools',
        tagline: 'Design, coordinate, and deliver stunning interiors'
      },
      features: [
        { icon: BarChart3, title: 'Mood Boards', description: 'Create and share visual concepts with clients' },
        { icon: Users, title: 'Material Library', description: 'Extensive catalog of materials and finishes' },
        { icon: Shield, title: 'Vendor Network', description: 'Coordinate with furniture and material vendors' },
        { icon: Zap, title: '3D Visualization', description: 'Show clients realistic 3D renders' }
      ],
      benefits: [
        'Faster client approvals',
        'Organized material selection',
        'Streamlined vendor coordination',
        'Professional project presentation'
      ],
      useCases: [
        {
          title: 'Home Interiors',
          description: 'Design beautiful residential spaces'
        },
        {
          title: 'Office Interiors',
          description: 'Create functional workspaces'
        },
        {
          title: 'Retail Spaces',
          description: 'Design engaging retail environments'
        }
      ]
    },
    'real-estate-brokers': {
      hero: {
        title: 'Real Estate Brokers Module',
        subtitle: 'Complete real estate CRM for brokers and agents',
        tagline: 'Manage properties, clients, and deals efficiently'
      },
      features: [
        { icon: BarChart3, title: 'Property Listings', description: 'Manage all property listings in one place' },
        { icon: Users, title: 'Client Matching', description: 'Match clients with perfect properties' },
        { icon: TrendingUp, title: 'Deal Pipeline', description: 'Track deals from inquiry to closure' },
        { icon: Shield, title: 'Document Vault', description: 'Secure storage for all property documents' }
      ],
      benefits: [
        'Centralized property database',
        'Faster client-property matching',
        'Track deal progress in real-time',
        'Secure document management'
      ],
      useCases: [
        {
          title: 'Residential Sales',
          description: 'Sell homes and apartments efficiently'
        },
        {
          title: 'Commercial Leasing',
          description: 'Manage commercial property rentals'
        },
        {
          title: 'Property Management',
          description: 'Comprehensive property portfolio management'
        }
      ]
    }
  }

  const content = moduleFeatures[moduleId] || moduleFeatures['wooden-flooring']

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
          <div className="flex items-center gap-2 font-bold text-xl">
            <Building2 className="h-6 w-6 text-primary" />
            BuildCRM
          </div>
          <Button onClick={handleGetStarted}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-indigo-50/30 to-slate-50 py-20">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 px-4 py-2 text-sm">{module.category}</Badge>
              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                {content.hero.title}
              </h1>
              <p className="text-2xl text-slate-600 mb-4">
                {content.hero.subtitle}
              </p>
              <p className="text-lg text-slate-500 mb-8">
                {module.description}
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" onClick={handleGetStarted} className="px-8">
                  Start Free Trial
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <Play className="h-4 w-4" /> Watch Demo
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Key Features
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to manage {module.name.toLowerCase()} projects efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {content.features.map((feature, index) => (
              <FadeIn key={index} delay={index * 0.1}>
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Why Choose This Module?
              </h2>
              <p className="text-xl text-slate-600">
                Proven benefits that drive real results
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {content.benefits.map((benefit, index) => (
                <FadeIn key={index} delay={index * 0.1}>
                  <Card className="p-6 flex items-start gap-4 hover:shadow-lg transition-shadow">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <p className="text-lg text-slate-700">{benefit}</p>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Use Cases
            </h2>
            <p className="text-xl text-slate-600">
              Real-world applications of {module.name}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.useCases.map((useCase, index) => (
              <FadeIn key={index} delay={index * 0.1}>
                <Card className="p-8 text-center hover:shadow-xl transition-shadow">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl mb-3">{useCase.title}</h3>
                  <p className="text-slate-600">{useCase.description}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Get Started Today
            </h2>
            <p className="text-xl text-slate-300">
              Choose a plan that includes {module.name}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <FadeIn key={plan.id} delay={index * 0.1}>
                <Card className="p-8 text-center hover:scale-105 transition-transform">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-primary mb-6">
                    ₹{plan.price}
                    <span className="text-sm text-slate-600">/{plan.billingCycle}</span>
                  </div>
                  <Button className="w-full mb-6" onClick={handleGetStarted}>
                    Get Started
                  </Button>
                  <ul className="space-y-3 text-left">
                    {plan.features && plan.features.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-indigo-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your {module.name} Business?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Join thousands of businesses already using BuildCRM
            </p>
            <Button size="lg" variant="secondary" onClick={handleGetStarted} className="px-8">
              Start Your Free Trial
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-xl text-white mb-4">
            <Building2 className="h-6 w-6" />
            BuildCRM
          </div>
          <p className="text-sm">© 2025 BuildCRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
