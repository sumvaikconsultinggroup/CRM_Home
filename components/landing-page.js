'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, ArrowRight, CheckCircle2, Star, Zap, Shield, 
  BarChart3, Users, Globe, Play, ChevronRight, Layout, 
  MessageSquare, Briefcase, Layers, Target, Sparkles, MoveRight
} from 'lucide-react'

// --- Shared Components ---

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

// --- Sections ---

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
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-50">
      {/* Background Elements */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50" />
        <motion.div style={{ y: y1 }} className="absolute top-20 right-0 w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-[100px]" />
        <motion.div style={{ y: y2 }} className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-300/20 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <div className="max-w-2xl">
          <SectionBadge>The #1 CRM for Construction</SectionBadge>
          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Build Better. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-violet-600">
              Scale Faster.
            </span>
          </motion.h1>
          <motion.p 
            className="text-xl text-slate-600 mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            The comprehensive operating system for construction and home improvement businesses. Manage leads, projects, and teams in one unified platform.
          </motion.p>
          <motion.div 
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Button size="lg" onClick={onRegister} className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-300 hover:bg-white hover:border-slate-400">
              <Play className="mr-2 h-4 w-4 fill-slate-900" /> Watch Demo
            </Button>
          </motion.div>
          
          <motion.div 
            className="mt-12 flex items-center gap-6 text-sm text-slate-500 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> 14-day free trial
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="relative lg:h-[700px] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          {/* Abstract Dashboard UI Composition */}
          <div className="relative w-full max-w-lg aspect-square">
            {/* Main Card */}
            <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-20">
              <div className="bg-slate-50 border-b p-4 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Total Revenue</div>
                    <div className="text-3xl font-bold text-slate-900">₹4,250,000</div>
                  </div>
                  <div className="text-green-500 bg-green-50 px-2 py-1 rounded text-sm font-medium">+12.5%</div>
                </div>
                {/* Chart Area Mock */}
                <div className="h-32 flex items-end gap-2">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <motion.div 
                      key={i} 
                      className="flex-1 bg-primary/10 rounded-t-sm relative group cursor-pointer"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                    >
                      <div className="absolute inset-x-0 bottom-0 top-2 bg-gradient-to-t from-primary/20 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </div>
                {/* List Mock */}
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="flex-1">
                        <div className="h-2 w-24 bg-slate-200 rounded mb-1" />
                        <div className="h-2 w-16 bg-slate-100 rounded" />
                      </div>
                      <div className="h-4 w-12 bg-green-100 rounded text-green-600 text-xs flex items-center justify-center">Active</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              className="absolute -right-12 top-20 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-30 w-48"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="font-semibold text-sm">New Lead</div>
              </div>
              <div className="text-xs text-slate-500">Kitchen Renovation</div>
              <div className="mt-2 text-xs font-medium text-slate-900">₹450,000</div>
            </motion.div>

            <motion.div 
              className="absolute -left-8 bottom-32 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-30 w-56"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Project Complete</div>
                  <div className="text-xs text-slate-500">Villa Flooring</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const BentoGrid = () => (
  <section id="features" className="py-24 bg-white relative">
    <div className="container mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <SectionBadge>Powerful Features</SectionBadge>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Everything you need to run your business</h2>
        <p className="text-lg text-slate-600">Stop juggling multiple apps. BuildCRM brings your sales, projects, and team together in one intuitive platform.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">
        {/* Large Card */}
        <FadeIn className="md:col-span-2 row-span-2 rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-8 h-full flex flex-col">
            <div className="mb-auto">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-6">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Advanced Lead Pipeline</h3>
              <p className="text-slate-600 max-w-md">Visualize your sales process with our drag-and-drop Kanban board. Track every interaction, schedule follow-ups, and never lose a deal again.</p>
            </div>
            <div className="relative h-64 mt-8 bg-white rounded-t-xl border border-slate-200 shadow-sm p-4 w-[90%] mx-auto transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              {/* Mock Kanban */}
              <div className="flex gap-4 h-full">
                <div className="flex-1 bg-slate-50 rounded-lg p-2 gap-2 flex flex-col">
                  <div className="h-2 w-12 bg-blue-200 rounded" />
                  <div className="bg-white p-2 rounded shadow-sm border border-slate-100 h-16" />
                  <div className="bg-white p-2 rounded shadow-sm border border-slate-100 h-16" />
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg p-2 gap-2 flex flex-col">
                  <div className="h-2 w-12 bg-orange-200 rounded" />
                  <div className="bg-white p-2 rounded shadow-sm border border-slate-100 h-16" />
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg p-2 gap-2 flex flex-col">
                  <div className="h-2 w-12 bg-green-200 rounded" />
                  <div className="bg-white p-2 rounded shadow-sm border border-slate-100 h-16" />
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Tall Card */}
        <FadeIn className="md:col-span-1 row-span-2 rounded-3xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900" />
          <div className="p-8 relative z-10 h-full flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white mb-6">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Real-time Analytics</h3>
            <p className="text-slate-400 mb-8">Make data-driven decisions with comprehensive reports.</p>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-8 border-indigo-500/30 flex items-center justify-center relative">
                <div className="absolute inset-0 border-8 border-indigo-500 border-t-transparent rounded-full rotate-45" />
                <div className="text-center">
                  <div className="text-3xl font-bold">85%</div>
                  <div className="text-xs text-slate-400">Conversion</div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Small Card */}
        <FadeIn className="rounded-3xl bg-slate-50 border border-slate-200 p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-4">
            <Briefcase className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold mb-2">Project Management</h3>
          <p className="text-sm text-slate-600">Track timelines, budgets, and milestones effortlessly.</p>
        </FadeIn>

        {/* Small Card */}
        <FadeIn className="rounded-3xl bg-slate-50 border border-slate-200 p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center mb-4">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold mb-2">Team Collaboration</h3>
          <p className="text-sm text-slate-600">Assign tasks and communicate with your team in real-time.</p>
        </FadeIn>

        {/* Small Card */}
        <FadeIn className="rounded-3xl bg-slate-50 border border-slate-200 p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
          <p className="text-sm text-slate-600">Bank-grade encryption and role-based access control.</p>
        </FadeIn>
      </div>
    </div>
  </section>
)

const ModuleShowcase = () => (
  <section id="modules" className="py-24 bg-slate-900 text-white overflow-hidden">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div className="max-w-xl">
          <SectionBadge>Industry Specific</SectionBadge>
          <h2 className="text-4xl font-bold tracking-tight mb-4">Tailored for your Trade</h2>
          <p className="text-slate-400 text-lg">We don't believe in one-size-fits-all. Activate modules designed specifically for your industry needs.</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800 hover:text-white rounded-full px-6">
          View All Modules <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Layers, title: "Wooden Flooring", color: "from-amber-500 to-orange-600" },
          { icon: Layout, title: "Modular Kitchens", color: "from-blue-500 to-cyan-600" },
          { icon: Target, title: "Tiles & Ceramics", color: "from-emerald-500 to-green-600" },
          { icon: Paintbrush, title: "Painting Services", color: "from-purple-500 to-pink-600" }
        ].map((module, i) => (
          <FadeIn key={i} delay={i * 0.1}>
            <div className="group relative h-64 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                <div className="w-12 h-12 rounded-xl bg-slate-700/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{module.title}</h3>
                  <div className="flex items-center text-sm text-slate-400 group-hover:text-white/80">
                    Explore Features <MoveRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
)

const Pricing = ({ onRegister }) => (
  <section id="pricing" className="py-24 bg-slate-50">
    <div className="container mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <SectionBadge>Transparent Pricing</SectionBadge>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Choose the right plan for your growth</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {[
          { name: "Basic", price: "1,999", desc: "Essential tools for small teams", features: ["Up to 3 Users", "Basic CRM", "Task Management"] },
          { name: "Professional", price: "4,999", desc: "Advanced features for growing businesses", featured: true, features: ["Up to 10 Users", "Advanced Reporting", "Email Automation", "2 Modules Included"] },
          { name: "Enterprise", price: "9,999", desc: "Full power for large organizations", features: ["Unlimited Users", "White Labeling", "Priority Support", "All Modules Included"] }
        ].map((plan, i) => (
          <FadeIn key={i} delay={i * 0.1} className={`relative rounded-3xl p-8 bg-white border ${plan.featured ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-200 shadow-sm'} flex flex-col`}>
            {plan.featured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">₹{plan.price}</span>
                <span className="text-slate-500">/month</span>
              </div>
              <p className="text-slate-500 text-sm">{plan.desc}</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button 
              className={`w-full rounded-full ${plan.featured ? 'bg-primary hover:bg-primary/90' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
              onClick={onRegister}
            >
              Get Started
            </Button>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
    <div className="container mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-slate-900 mb-6">
            <div className="bg-primary text-white p-1.5 rounded-lg">
              <Building2 className="h-6 w-6" />
            </div>
            BuildCRM
          </div>
          <p className="text-slate-500 max-w-sm mb-6">
            The all-in-one platform designed to help construction businesses organize, manage, and scale efficiently.
          </p>
          <div className="flex gap-4">
            {/* Social Icons Placeholder */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-colors cursor-pointer">
                <Globe className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-6">Product</h4>
          <ul className="space-y-4 text-sm text-slate-600">
            <li><a href="#" className="hover:text-primary">Features</a></li>
            <li><a href="#" className="hover:text-primary">Modules</a></li>
            <li><a href="#" className="hover:text-primary">Pricing</a></li>
            <li><a href="#" className="hover:text-primary">API</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">Company</h4>
          <ul className="space-y-4 text-sm text-slate-600">
            <li><a href="#" className="hover:text-primary">About Us</a></li>
            <li><a href="#" className="hover:text-primary">Careers</a></li>
            <li><a href="#" className="hover:text-primary">Blog</a></li>
            <li><a href="#" className="hover:text-primary">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
        <p>&copy; 2025 BuildCRM. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-primary">Privacy Policy</a>
          <a href="#" className="hover:text-primary">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>
)

// --- Main Landing Page Component ---

export default function LandingPage({ onLogin, onRegister }) {
  const { scrollY } = useScroll()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50)
    })
  }, [scrollY])

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar onLogin={onLogin} onRegister={onRegister} isScrolled={isScrolled} />
      <Hero onRegister={onRegister} />
      <BentoGrid />
      <ModuleShowcase />
      <Pricing onRegister={onRegister} />
      
      {/* Testimonials Marquee Mock */}
      <section className="py-20 overflow-hidden bg-white border-y border-slate-100">
        <div className="container mx-auto px-6 mb-12 text-center">
          <h2 className="text-2xl font-bold">Trusted by 500+ Companies</h2>
        </div>
        <div className="flex gap-12 animate-scroll whitespace-nowrap min-w-full">
          {/* Creating a long strip of logos */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400 font-bold text-xl grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
              <Building2 className="h-8 w-8" /> COMPANY {i+1}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Paintbrush(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.375 2.625a3.875 3.875 0 0 0-5.5 0l-9 9a3.875 3.875 0 0 0 0 5.5l1.5 1.5a3.875 3.875 0 0 0 5.5 0l9-9a3.875 3.875 0 0 0 0-5.5z" />
      <path d="M14.5 6.5l3 3" />
      <path d="M2 22h20" />
    </svg>
  )
}
