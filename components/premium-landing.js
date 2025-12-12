'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Building2, ArrowRight, CheckCircle2, Star, Zap, Shield, 
  BarChart3, Users, Globe, ChevronRight, Sparkles, 
  Layers, ChefHat, Grid3X3, Sofa, HardHat, Paintbrush, Wrench,
  Square, Palette, Building, Play, MessageSquare, TrendingUp,
  ChevronDown, Clock, Award, Target, Rocket, Heart, Phone, Mail,
  MapPin, ArrowUpRight, Check, X, Plus, Minus
} from 'lucide-react'

// Animated counter component
const AnimatedCounter = ({ value, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      const duration = 2000
      const steps = 60
      const increment = value / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [isInView, value])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// Icon mapping for modules
const moduleIcons = {
  'Layers': Layers, 'ChefHat': ChefHat, 'Grid3X3': Grid3X3, 'Sofa': Sofa,
  'HardHat': HardHat, 'Paintbrush': Paintbrush, 'Wrench': Wrench, 'Zap': Zap,
  'DoorOpen': Square, 'Building2': Building2, 'Palette': Palette, 'Building': Building
}

// FAQ Component
const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <motion.div 
    className="border-b border-slate-200 last:border-0"
    initial={false}
  >
    <button
      onClick={onClick}
      className="w-full py-6 flex items-center justify-between text-left hover:text-primary transition-colors"
    >
      <span className="font-semibold text-lg pr-8">{question}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0"
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <p className="pb-6 text-slate-600 leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
)

// Floating element for hero
const FloatingElement = ({ children, delay = 0, duration = 3, className = '' }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -20, 0] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
)

// Gradient text component
const GradientText = ({ children, className = '' }) => (
  <span className={`bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent ${className}`}>
    {children}
  </span>
)

export default function PremiumLanding({ onLogin, onRegister, onModuleClick }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [modules, setModules] = useState([])
  const [plans, setPlans] = useState([])
  const [openFAQ, setOpenFAQ] = useState(0)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    fetch('/api/modules-public').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setModules(data)
    }).catch(console.error)

    fetch('/api/plans').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setPlans(data)
    }).catch(console.error)
  }, [])

  const faqs = [
    { question: 'How does the 30-day free trial work?', answer: 'Start using BuildCRM immediately with full access to all features. No credit card required. After 30 days, choose a plan that fits your business needs.' },
    { question: 'Can I switch plans anytime?', answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any payments.' },
    { question: 'Is my data secure?', answer: 'Absolutely. We use bank-level 256-bit SSL encryption, regular backups, and comply with industry security standards. Your data is always protected.' },
    { question: 'Do you offer custom integrations?', answer: 'Yes, our Enterprise plan includes API access and custom integrations. Our team can help you connect BuildCRM with your existing tools.' },
    { question: 'What support options are available?', answer: 'All plans include email support. Professional and Enterprise plans include priority support with faster response times and dedicated account managers.' }
  ]

  const testimonials = [
    { name: 'Rajesh Kumar', role: 'CEO, Kumar Constructions', content: 'BuildCRM transformed our business. We\'ve increased lead conversion by 40% and saved 20 hours per week on admin work.', avatar: 'RK', rating: 5 },
    { name: 'Priya Sharma', role: 'Director, Sharma Interiors', content: 'The industry-specific modules are exactly what we needed. Finally, a CRM that understands our flooring business.', avatar: 'PS', rating: 5 },
    { name: 'Amit Patel', role: 'Owner, Patel Kitchens', content: 'Setup was incredibly easy. Within a day, our entire team was using BuildCRM effectively. Best investment we\'ve made.', avatar: 'AP', rating: 5 }
  ]

  const stats = [
    { value: 10000, suffix: '+', label: 'Active Users' },
    { value: 50000, suffix: '+', label: 'Projects Completed' },
    { value: 99, suffix: '%', label: 'Customer Satisfaction' },
    { value: 150, suffix: '+', label: 'Cities Served' }
  ]

  const features = [
    { icon: BarChart3, title: 'Advanced Analytics', description: 'Real-time dashboards with actionable insights to grow your business faster.', color: 'from-blue-500 to-cyan-500' },
    { icon: Users, title: 'Team Collaboration', description: 'Keep your team aligned with shared projects, tasks, and real-time updates.', color: 'from-purple-500 to-pink-500' },
    { icon: Shield, title: 'Enterprise Security', description: 'Bank-level encryption ensures your data is always safe and protected.', color: 'from-green-500 to-emerald-500' },
    { icon: Zap, title: 'Smart Automation', description: 'Automate repetitive tasks and focus on what matters most - your customers.', color: 'from-orange-500 to-red-500' },
    { icon: Globe, title: 'White Labeling', description: 'Your brand, your identity. Customize everything with your own branding.', color: 'from-indigo-500 to-purple-500' },
    { icon: MessageSquare, title: 'Built-in Communication', description: 'Team chat, client messaging, and notifications all in one place.', color: 'from-pink-500 to-rose-500' }
  ]

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-600 z-[100] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navbar */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg py-3' : 'bg-transparent py-5'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-600 blur-lg opacity-50" />
              <div className="relative bg-gradient-to-r from-primary to-indigo-600 text-white p-2.5 rounded-xl">
                <Building2 className="h-7 w-7" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Build<GradientText>CRM</GradientText>
            </span>
          </motion.div>
          
          <nav className="hidden lg:flex items-center gap-8">
            {['Features', 'Modules', 'Pricing', 'Testimonials', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-slate-600 hover:text-primary transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onLogin} className="hidden sm:flex font-medium">
              Sign In
            </Button>
            <Button 
              onClick={onRegister} 
              className="rounded-full px-6 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-lg shadow-primary/25"
            >
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/50" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <motion.div 
          className="container mx-auto px-6 relative z-10"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="mb-6 px-4 py-2 text-sm bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/20 text-primary">
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  #1 CRM for Construction & Real Estate
                </Badge>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Build Smarter.
                <br />
                <GradientText>Grow Faster.</GradientText>
              </motion.h1>

              <motion.p
                className="text-xl text-slate-600 mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                The all-in-one CRM platform designed specifically for construction and real estate businesses. Manage leads, projects, and teams with industry-specific tools.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Button 
                  size="lg" 
                  onClick={onRegister}
                  className="rounded-full px-8 h-14 text-lg bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-xl shadow-primary/30"
                >
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full px-8 h-14 text-lg border-2 group"
                >
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Watch Demo
                </Button>
              </motion.div>

              <motion.div
                className="flex items-center gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-3">
                    {['R', 'P', 'A', 'S'].map((letter, i) => (
                      <div key={i} className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 border-2 border-white flex items-center justify-center text-white font-semibold text-sm">
                        {letter}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-slate-600">
                    <strong className="text-slate-900">10,000+</strong> businesses trust us
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm text-slate-600 font-medium">4.9/5 Rating</span>
                </div>
              </motion.div>
            </div>

            {/* Hero Visual */}
            <motion.div
              className="relative hidden lg:block"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative">
                {/* Main Dashboard Preview */}
                <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white rounded-lg h-6" />
                  </div>
                  <div className="p-6">
                    <div className="flex gap-4 mb-6">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-500/10 p-4">
                          <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                          <div className="h-5 w-12 bg-primary/30 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-40 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                        <div className="h-3 w-20 bg-slate-200 rounded mb-4" />
                        <div className="space-y-2">
                          {[80, 60, 90, 45].map((w, i) => (
                            <div key={i} className="h-2 bg-gradient-to-r from-primary to-indigo-500 rounded" style={{ width: `${w}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="h-40 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                        <div className="h-3 w-20 bg-slate-200 rounded mb-4" />
                        <div className="flex items-end gap-2 h-20">
                          {[40, 60, 35, 80, 55, 70].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-purple-500 to-pink-400 rounded-t" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <FloatingElement delay={0} className="absolute -top-8 -right-8">
                  <div className="bg-white rounded-2xl shadow-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Revenue</p>
                        <p className="font-bold text-green-600">+32.5%</p>
                      </div>
                    </div>
                  </div>
                </FloatingElement>

                <FloatingElement delay={1} duration={4} className="absolute -bottom-4 -left-8">
                  <div className="bg-white rounded-2xl shadow-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">New Leads</p>
                        <p className="font-bold text-primary">+24 Today</p>
                      </div>
                    </div>
                  </div>
                </FloatingElement>

                <FloatingElement delay={0.5} duration={3.5} className="absolute top-1/3 -left-12">
                  <div className="bg-white rounded-2xl shadow-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Task Completed</span>
                    </div>
                  </div>
                </FloatingElement>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-8 w-8 text-slate-400" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="container mx-auto px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-0">
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need to <GradientText>succeed</GradientText>
            </h2>
            <p className="text-xl text-slate-600">
              Built specifically for construction and real estate businesses with tools that understand your unique challenges.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-8 h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-500 group bg-gradient-to-br from-white to-slate-50 hover:-translate-y-2">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2 bg-indigo-500/10 text-indigo-600 border-0">
              Industry-Specific Modules
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built for <GradientText>Every Trade</GradientText>
            </h2>
            <p className="text-xl text-slate-600">
              Choose the modules that match your business. Each one is designed with industry-specific features.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((module, i) => {
              const IconComponent = moduleIcons[module.icon] || Building2
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -8 }}
                  onClick={() => onModuleClick(module)}
                  className="cursor-pointer"
                >
                  <Card className="p-6 h-full bg-white border-2 border-transparent hover:border-primary/30 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary group-hover:from-primary group-hover:to-indigo-600 group-hover:text-white transition-all mb-4">
                        <IconComponent className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{module.name}</h3>
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{module.description}</p>
                      <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                        Learn More <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2 bg-green-500/10 text-green-600 border-0">
              Simple Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your <GradientText>Plan</GradientText>
            </h2>
            <p className="text-xl text-slate-600">
              Start free for 30 days. No credit card required. Cancel anytime.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, i) => {
              const isPopular = plan.id === 'professional'
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative ${isPopular ? 'md:-mt-4 md:mb-4' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-indigo-600 text-white px-4 py-1 shadow-lg">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <Card className={`p-8 h-full ${isPopular ? 'border-2 border-primary shadow-2xl shadow-primary/20' : 'border shadow-lg'}`}>
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">₹{plan.price}</span>
                        <span className="text-slate-500">/{plan.billingCycle}</span>
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8">
                      {plan.features?.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full h-12 rounded-xl ${isPopular ? 'bg-gradient-to-r from-primary to-indigo-600' : ''}`}
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={onRegister}
                    >
                      Get Started
                    </Button>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2 bg-white/10 text-white border-0">
              Customer Stories
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by <span className="text-primary">10,000+</span> Businesses
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-8 h-full bg-white/5 backdrop-blur border-white/10">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg text-slate-300 mb-6 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-slate-400">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-2 bg-purple-500/10 text-purple-600 border-0">
              FAQ
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked <GradientText>Questions</GradientText>
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <FAQItem
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === i}
                  onClick={() => setOpenFAQ(openFAQ === i ? -1 : i)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="container mx-auto px-6 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join 10,000+ businesses already using BuildCRM. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={onRegister}
                className="rounded-full px-8 h-14 text-lg bg-white text-primary hover:bg-white/90 shadow-xl"
              >
                Start Free Trial <Rocket className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full px-8 h-14 text-lg border-2 border-white text-white hover:bg-white/10"
              >
                <Phone className="mr-2 h-5 w-5" /> Talk to Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-primary to-indigo-600 text-white p-2 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold text-white">BuildCRM</span>
              </div>
              <p className="mb-6">The #1 CRM platform for construction and real estate professionals.</p>
              <div className="flex gap-4">
                {['twitter', 'linkedin', 'facebook', 'instagram'].map((social) => (
                  <a key={social} href="#" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors">
                    <Globe className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Modules', 'Pricing', 'Security'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Documentation', 'API Reference', 'Status'] }
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2025 BuildCRM. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
