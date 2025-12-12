'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Mail, Lock, User, Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// Animation Variants
const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
}

// Shared Layout Component
const AuthLayout = ({ children, title, subtitle, image = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" }) => (
  <div className="min-h-screen flex w-full bg-slate-50">
    {/* Left Side - Form */}
    <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center lg:text-left">
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/25">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-slate-600">{subtitle}</p>
        </div>
        
        {children}

        <div className="text-center text-xs text-slate-400 mt-8">
          &copy; 2025 BuildCRM. All rights reserved.
        </div>
      </div>
    </div>

    {/* Right Side - Image/Branding (Hidden on mobile) */}
    <div className="hidden lg:flex flex-1 relative bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={image} alt="Background" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/90" />
      </div>
      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <div className="flex justify-end">
          <div className="glass px-4 py-2 rounded-full text-sm font-medium bg-white/10 backdrop-blur-md border border-white/10">
            Enterprise Grade CRM
          </div>
        </div>
        <div className="max-w-md">
          <blockquote className="text-2xl font-medium leading-relaxed mb-6">
            "BuildCRM transformed how we manage our construction projects. The efficiency gains were immediate."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">JD</div>
            <div>
              <div className="font-semibold">John Davis</div>
              <div className="text-indigo-200 text-sm">CEO, Davis Construction</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

// Login Page
export function LoginPage({ onBack, onSuccess, onRegister, onForgotPassword }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.login(email, password)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.client) {
        localStorage.setItem('client', JSON.stringify(data.client))
      }
      toast.success('Welcome back!')
      onSuccess(data.user, data.client)
    } catch (error) {
      toast.error(error.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="email" 
              placeholder="you@company.com" 
              className="pl-10 h-11" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Password</Label>
            <button 
              type="button"
              onClick={onForgotPassword} 
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="password" 
              placeholder="••••••••" 
              className="pl-10 h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-11 text-base bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-lg shadow-primary/20" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-slate-500">Don't have an account? </span>
        <button onClick={onRegister} className="font-semibold text-primary hover:underline">
          Start your 30-day free trial
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 text-center">
         <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto">
           <ArrowLeft className="h-3 w-3" /> Back to Home
         </button>
      </div>
    </AuthLayout>
  )
}

// Register Page
export function RegisterPage({ onBack, onSuccess, onLogin }) {
  const [step, setStep] = useState(1)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(true)
  
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    phone: '',
    planId: 'basic'
  })

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.getPlans()
        setPlans(data || [])
      } catch (error) {
        console.error('Failed to load plans:', error)
        toast.error('Could not load subscription plans. Please try again.')
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.register(
        formData.businessName,
        formData.email,
        formData.password,
        formData.phone,
        formData.planId
      )
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('client', JSON.stringify(data.client))
      toast.success('Account created successfully!')
      onSuccess(data.user, data.client)
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = plans.find(p => p.id === formData.planId)

  return (
    <AuthLayout 
      title="Create Account" 
      subtitle={step === 1 ? "Enter your business details" : "Choose your subscription plan"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" {...fadeIn} className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Acme Construction" 
                    className="pl-10 h-11"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    placeholder="you@company.com" 
                    className="pl-10 h-11"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="Create a strong password" 
                    className="pl-10 h-11"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="+1 (555) 000-0000" 
                    className="pl-10 h-11"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <Button type="button" onClick={() => setStep(2)} className="w-full h-11 mt-2">
                Next Step <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="step2" {...fadeIn} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base">Select a Plan</Label>
                {loadingPlans ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {plans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.planId === plan.id 
                            ? 'border-primary bg-primary/5 shadow-md' 
                            : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                        }`}
                        onClick={() => setFormData({...formData, planId: plan.id})}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-900">{plan.name}</p>
                            <p className="text-sm text-slate-500">{plan.features?.[0] || 'Includes essential features'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">₹{plan.price}</p>
                            <p className="text-xs text-slate-400">/month</p>
                          </div>
                        </div>
                        {formData.planId === plan.id && (
                          <div className="absolute top-0 right-0 p-1 bg-primary text-white rounded-bl-lg rounded-tr-lg">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-11 bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-slate-500">Already have an account? </span>
        <button onClick={onLogin} className="font-semibold text-primary hover:underline">
          Sign In
        </button>
      </div>
    </AuthLayout>
  )
}

// Forgot Password Page
export function ForgotPasswordPage({ onBack, onLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      // In a real app, call api.forgotPassword(email)
      
      console.log(`Password reset link sent to: ${email}`) // For demo/debugging
      
      // Simulate backend logic
      if (!email.includes('@')) throw new Error('Invalid email address')
      
      setSent(true)
      toast.success('Reset link sent to your email')
    } catch (error) {
      toast.error(error.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout 
        title="Check your inbox" 
        subtitle="We've sent you a password reset link."
      >
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8" />
          </div>
          <p className="text-slate-600 mb-8">
            Please check your email <strong>{email}</strong> for instructions to reset your password.
          </p>
          <Button onClick={onLogin} className="w-full h-11">
            Back to Login
          </Button>
          <button onClick={() => setSent(false)} className="mt-4 text-sm text-slate-500 hover:text-primary">
            Didn't receive the email? Try again
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Enter your email to receive reset instructions"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="email" 
              placeholder="you@company.com" 
              className="pl-10 h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-indigo-600" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={onLogin} className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
      </div>
    </AuthLayout>
  )
}
