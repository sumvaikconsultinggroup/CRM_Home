'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Building2, ArrowRight, CheckCircle2, Star, Zap, Shield, 
  BarChart3, Users, Globe, ChevronRight, Sparkles, 
  Layers, ChefHat, Grid3X3, Sofa, HardHat, Paintbrush, Wrench,
  DoorOpen, Palette, Building, Play, MessageSquare, TrendingUp
} from 'lucide-react'

// Icon mapping for modules
const moduleIcons = {
  'Layers': Layers,
  'ChefHat': ChefHat,
  'Grid3X3': Grid3X3,
  'Sofa': Sofa,
  'HardHat': HardHat,
  'Paintbrush': Paintbrush,
  'Wrench': Wrench,
  'Zap': Zap,
  'DoorOpen': DoorOpen,
  'Building2': Building2,
  'Palette': Palette,
  'Building': Building
}

const SectionBadge = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20"
  >
    <Sparkles className="h-3 w-3" />
    {children}
  </motion.div>
)

const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
)

const Navbar = ({ onLogin, onRegister, isScrolled }) => (
  <motion.header
    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 py-4' : 'bg-transparent py-6'
    }`}
    initial={{ y: -100 }}
    animate={{ y: 0 }}
  >
    <div className="container mx-auto px-6 flex justify-between items-center">
      <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-slate-900">
        <div className="bg-primary text-white p-1.5 rounded-lg">
          <Building2 className="h-6 w-6" />
        </div>
        BuildCRM
      </div>
      
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
        <a href="#features" className="hover:text-primary transition-colors">Features</a>
        <a href="#modules" className="hover:text-primary transition-colors">Modules</a>
        <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        <a href="#testimonials" className="hover:text-primary transition-colors">Stories</a>
      </nav>

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onLogin} className="hidden sm:flex hover:bg-slate-100">
          Sign In
        </Button>
        <Button onClick={onRegister} className="rounded-full px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20">
          Get Started <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  </motion.header>
)

const Hero = ({ onRegister }) => {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const y2 = useTransform(scrollY, [0, 500], [0, -150])

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 w-full h-full">
        <motion.div 
          style={{ y: y1 }} 
          className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          style={{ y: y2 }} 
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-[140px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <div className="max-w-2xl">
          <SectionBadge>The #1 CRM for Construction & Real Estate</SectionBadge>
          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Build Better. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-violet-600">
              Grow Faster.
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-slate-600 leading-relaxed mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            The all-in-one CRM platform designed specifically for construction businesses. 
            Manage leads, projects, and clients with industry-specific tools that understand your workflow.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              size="lg" 
              onClick={onRegister}
              className="rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/30 hover:scale-105 transition-transform"
            >
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="rounded-full px-8 hover:bg-slate-50"
            >
              <Play className="mr-2 h-5 w-5" /> Watch Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-slate-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[
              { label: 'Active Users', value: '10K+' },
              { label: 'Projects Completed', value: '50K+' },
              { label: 'Success Rate', value: '99%' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero Image/Illustration */}
        <motion.div
          className="relative hidden lg:block"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="relative">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-primary/20 to-indigo-600/20 rounded-3xl blur-3xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-8">
              <div className="space-y-4">
                <div className="h-8 bg-gradient-to-r from-primary to-indigo-600 rounded-lg w-3/4" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 rounded w-4/6" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg" />
                  <div className="h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const Features = () => {
  const features = [
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Real-time insights and comprehensive reports to track your business performance.'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Keep your entire team synchronized with shared calendars, tasks, and projects.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and compliance with industry standards for your data.'
    },
    {
      icon: Zap,
      title: 'Automation',
      description: 'Automate repetitive tasks and workflows to save time and reduce errors.'
    },
    {
      icon: Globe,
      title: 'White Labeling',
      description: 'Customize the platform with your branding, colors, and domain.'
    },
    {
      icon: MessageSquare,
      title: '24/7 Support',
      description: 'Get expert help whenever you need it with our dedicated support team.'
    }
  ]

  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <FadeIn className="text-center max-w-3xl mx-auto mb-16">
          <SectionBadge>Powerful Features</SectionBadge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Everything you need to run your business
          </h2>
          <p className="text-xl text-slate-600">
            Built specifically for construction and real estate industries with tools that understand your unique challenges.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <motion.div
                className="group relative"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 h-full border-2 border-slate-100 hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

const Modules = ({ modules, onModuleClick }) => {
  return (
    <section id="modules" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto px-6">
        <FadeIn className="text-center max-w-3xl mx-auto mb-16">
          <SectionBadge>Industry-Specific Modules</SectionBadge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Built for Every Trade
          </h2>
          <p className="text-xl text-slate-600">
            Choose the modules that match your business needs. Each module is carefully designed with industry-specific features.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((module, index) => {
            const IconComponent = moduleIcons[module.icon] || Building2
            return (
              <FadeIn key={module.id} delay={index * 0.05}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => onModuleClick(module)}
                  className="cursor-pointer"
                >
                  <Card className="p-6 h-full bg-white hover:bg-gradient-to-br hover:from-white hover:to-primary/5 border-2 border-slate-100 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 group">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <IconComponent className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{module.name}</h3>
                        <p className="text-sm text-slate-600 mb-3">{module.description}</p>
                        <div className="flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform">
                          <span className="text-sm font-medium">Learn More</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </FadeIn>
            )}
          )}
        </div>
      </div>
    </section>
  )
}

const Pricing = ({ plans, onRegister }) => {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <FadeIn className="text-center max-w-3xl mx-auto mb-16">
          <SectionBadge>Simple Pricing</SectionBadge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Choose Your Plan
          </h2>
          <p className="text-xl text-slate-600">
            Start free, upgrade when you need more. All plans include core CRM features.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = plan.id === 'professional'
            return (
              <FadeIn key={plan.id} delay={index * 0.1}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <Badge className="bg-gradient-to-r from-primary to-indigo-600 text-white px-4 py-1 shadow-lg">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <Card className={`p-8 h-full ${
                    isPopular 
                      ? 'border-2 border-primary shadow-2xl bg-gradient-to-br from-white to-primary/5' 
                      : 'border-2 border-slate-100 hover:border-primary/50'
                  } transition-all duration-300`}>
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1 mb-4">
                        <span className="text-5xl font-bold text-slate-900">₹{plan.price}</span>
                        <span className="text-slate-600">/{plan.billingCycle}</span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features && plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className={`w-full ${
                        isPopular 
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                      onClick={onRegister}
                    >
                      Get Started
                    </Button>
                  </Card>
                </motion.div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Rajesh Kumar',
      role: 'Flooring Contractor',
      content: 'BuildCRM transformed how we manage our projects. The flooring module is exactly what we needed.',
      avatar: 'RK'
    },
    {
      name: 'Priya Sharma',
      role: 'Interior Designer',
      content: 'The design workflow and client management features have doubled our productivity.',
      avatar: 'PS'
    },
    {
      name: 'Amit Patel',
      role: 'Real Estate Broker',
      content: 'Finally, a CRM that understands the real estate business. The property tracking is excellent.',
      avatar: 'AP'
    }
  ]

  return (
    <section id="testimonials" className="py-24 bg-slate-50">
      <div className="container mx-auto px-6">
        <FadeIn className="text-center max-w-3xl mx-auto mb-16">
          <SectionBadge>Success Stories</SectionBadge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Trusted by Industry Leaders
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <Card className="p-8 bg-white hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-slate-700 leading-relaxed">{testimonial.content}</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

const CTA = ({ onRegister }) => (
  <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
    <div className="absolute inset-0">
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
    </div>
    <div className="container mx-auto px-6 relative z-10">
      <FadeIn className="text-center max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to transform your business?
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          Join thousands of businesses already using BuildCRM to streamline their operations.
        </p>
        <Button 
          size="lg"
          onClick={onRegister}
          className="rounded-full px-8 bg-white text-slate-900 hover:bg-slate-100 shadow-xl hover:scale-105 transition-transform"
        >
          Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </FadeIn>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-slate-900 text-slate-400 py-12">
    <div className="container mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
            <Building2 className="h-6 w-6" />
            BuildCRM
          </div>
          <p className="text-sm">The #1 CRM for construction and real estate professionals.</p>
        </div>
        <div>
          <h4 className="font-bold text-white mb-4">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
            <li><a href="#modules" className="hover:text-white transition-colors">Modules</a></li>
            <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">About</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-4">Support</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-8 text-sm text-center">
        © 2025 BuildCRM. All rights reserved.
      </div>
    </div>
  </footer>
)

export default function EnhancedLanding({ onLogin, onRegister, onModuleClick }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [modules, setModules] = useState([])
  const [plans, setPlans] = useState([])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Fetch modules from API
    fetch('/api/modules-public')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setModules(data.data)
        }
      })
      .catch(console.error)

    // Fetch pricing from API
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPlans(data.data)
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar onLogin={onLogin} onRegister={onRegister} isScrolled={isScrolled} />
      <Hero onRegister={onRegister} />
      <Features />
      <Modules modules={modules} onModuleClick={onModuleClick} />
      <Pricing plans={plans} onRegister={onRegister} />
      <Testimonials />
      <CTA onRegister={onRegister} />
      <Footer />
    </div>
  )
}
