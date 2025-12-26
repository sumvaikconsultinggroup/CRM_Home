'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SafeButton } from '@/components/ui/safe-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, Crown, Clock, Lock, LogOut, Mail, Phone,
  CheckCircle, ArrowRight, Sparkles, Shield, Users, Zap
} from 'lucide-react'

// Subscription Context
const SubscriptionContext = createContext(null)

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}

// Plan Order for comparison
const PLAN_ORDER = { 'basic': 1, 'starter': 1, 'professional': 2, 'enterprise': 3 }

// Subscription Provider Component
export function SubscriptionProvider({ children, token }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [showTrialWarning, setShowTrialWarning] = useState(false)

  const checkSubscription = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)

        // Show expired modal if subscription expired
        if (data.status === 'expired') {
          setShowExpiredModal(true)
        }

        // Show warning if less than 5 days remaining
        if (data.status === 'trial' && data.daysRemaining <= 5) {
          setShowTrialWarning(true)
        }
      }
    } catch (error) {
      console.error('Failed to check subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSubscription()
    
    // Check subscription status periodically (every 5 minutes)
    const interval = setInterval(checkSubscription, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token])

  const refreshSubscription = () => {
    checkSubscription()
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('client')
    window.location.href = '/'
  }

  // Compare plans to determine if upgrade or downgrade
  const comparePlans = (currentPlan, targetPlan) => {
    const current = PLAN_ORDER[currentPlan?.toLowerCase()] || 1
    const target = PLAN_ORDER[targetPlan?.toLowerCase()] || 1
    
    if (target > current) return 'upgrade'
    if (target < current) return 'downgrade'
    return 'current'
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      refreshSubscription,
      comparePlans,
      isActive: subscription?.status === 'active' || subscription?.status === 'trial',
      isExpired: subscription?.status === 'expired',
      isTrial: subscription?.status === 'trial',
      daysRemaining: subscription?.daysRemaining || 0,
      isOwner: subscription?.isOwner || false,
      currentPlan: subscription?.planId
    }}>
      {children}

      {/* Expired Subscription Modal - Cannot be dismissed */}
      <AnimatePresence>
        {showExpiredModal && subscription && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent 
              className="sm:max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden"
              onPointerDownOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-full">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Trial Expired</h2>
                      <p className="text-white/80">Your 30-day trial has ended</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {subscription.isOwner ? (
                    // Owner View
                    <div className="space-y-6">
                      <div className="text-center">
                        <Crown className="h-16 w-16 mx-auto text-amber-500 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Subscribe to Continue</h3>
                        <p className="text-slate-600">
                          Your {subscription.planName || 'trial'} plan has expired. 
                          Subscribe now to continue using all features.
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4">
                        <h4 className="font-medium mb-3">What you'll get:</h4>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Unlimited access to all features</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>All your data preserved</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Priority support</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button 
                          className="w-full h-12 text-lg bg-gradient-to-r from-primary to-indigo-600"
                          onClick={() => {
                            // Navigate to billing
                            window.location.href = '/?tab=settings&section=billing'
                          }}
                        >
                          <Crown className="h-5 w-5 mr-2" />
                          Subscribe Now
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleLogout}
                          className="w-full"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Team Member View
                    <div className="space-y-6">
                      <div className="text-center">
                        <Lock className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Access Restricted</h3>
                        <p className="text-slate-600">
                          Your organization's trial has expired. 
                          Please contact your administrator to renew the subscription.
                        </p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-800">Contact Your Organization Owner</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              Only the organization owner can manage subscriptions and billing.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button 
                          variant="outline" 
                          onClick={handleLogout}
                          className="w-full h-12"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Trial Warning Banner - Can be dismissed */}
      <AnimatePresence>
        {showTrialWarning && subscription?.status === 'trial' && subscription?.daysRemaining <= 5 && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 shadow-lg"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 animate-pulse" />
                <span className="font-medium">
                  Your trial ends in {subscription.daysRemaining} day{subscription.daysRemaining !== 1 ? 's' : ''}!
                </span>
              </div>
              <div className="flex items-center gap-3">
                {subscription.isOwner && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => window.location.href = '/?tab=settings&section=billing'}
                  >
                    Subscribe Now
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/20"
                  onClick={() => setShowTrialWarning(false)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubscriptionContext.Provider>
  )
}

// Plan Selection Page Component
export function PlanSelectionPage({ token, onPlanSelected }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/plans')
        if (res.ok) {
          const data = await res.json()
          setPlans(data)
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handleSelectPlan = async (planId) => {
    setSelecting(planId)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      })

      if (res.ok) {
        const data = await res.json()
        onPlanSelected?.(data)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to select plan')
      }
    } catch (error) {
      console.error('Failed to select plan:', error)
      alert('Failed to select plan')
    } finally {
      setSelecting(null)
    }
  }

  const planIcons = {
    'basic': Zap,
    'starter': Zap,
    'professional': Shield,
    'enterprise': Crown
  }

  const planColors = {
    'basic': 'from-blue-500 to-blue-600',
    'starter': 'from-blue-500 to-blue-600',
    'professional': 'from-purple-500 to-purple-600',
    'enterprise': 'from-amber-500 to-orange-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-indigo-600 mb-6"
          >
            <Sparkles className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Start your 30-day free trial. No credit card required.
          </p>
          <Badge className="mt-4 bg-green-500/20 text-green-400 border-green-500/30">
            30 Days Free Trial on All Plans
          </Badge>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const Icon = planIcons[plan.id] || Zap
            const gradientColor = planColors[plan.id] || 'from-blue-500 to-blue-600'
            const isPopular = plan.id === 'professional'

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className={`relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border ${
                  isPopular ? 'border-primary ring-2 ring-primary/50' : 'border-white/20'
                } hover:border-primary/50 transition-all`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4">Most Popular</Badge>
                  </div>
                )}

                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center mb-4`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                  <span className="text-slate-400">/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-12 ${isPopular ? 'bg-primary hover:bg-primary/90' : 'bg-white/10 hover:bg-white/20'}`}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selecting !== null}
                >
                  {selecting === plan.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                  ) : (
                    <>
                      Start Free Trial
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-slate-500">
            Questions? Contact us at <a href="mailto:support@buildcrm.com" className="text-primary hover:underline">support@buildcrm.com</a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default SubscriptionProvider
