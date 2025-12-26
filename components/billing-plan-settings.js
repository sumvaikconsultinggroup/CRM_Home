'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SafeButton } from '@/components/ui/safe-button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Crown, CreditCard, Receipt, Clock, Check, X, ArrowUp, ArrowDown,
  Sparkles, Shield, Zap, Building2, Users, Database, Headphones,
  AlertTriangle, Calendar, RefreshCw, ChevronRight, Star, Loader2
} from 'lucide-react'

// Plan hierarchy for comparison
const PLAN_HIERARCHY = {
  'basic': 1,
  'starter': 1,
  'professional': 2,
  'enterprise': 3
}

const PLAN_DETAILS = {
  'basic': {
    name: 'Starter',
    price: 2999,
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    features: ['5 Users', '5GB Storage', 'Basic CRM', 'Email Support', 'Task Management']
  },
  'starter': {
    name: 'Starter',
    price: 2999,
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    features: ['5 Users', '5GB Storage', 'Basic CRM', 'Email Support', 'Task Management']
  },
  'professional': {
    name: 'Professional',
    price: 5999,
    icon: Shield,
    color: 'from-purple-500 to-purple-600',
    features: ['15 Users', '25GB Storage', 'Advanced CRM', 'Priority Support', 'API Access', 'Reports & Analytics']
  },
  'enterprise': {
    name: 'Enterprise',
    price: 9999,
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: ['Unlimited Users', '100GB Storage', 'Full CRM Suite', '24/7 Support', 'White Labeling', 'Custom Integrations', 'Dedicated Manager']
  }
}

export function BillingPlanSettings({ authToken, client, user, onSubscriptionChange }) {
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [actionType, setActionType] = useState(null) // 'upgrade', 'downgrade', 'subscribe'

  // Fetch subscription status and plans
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch subscription
        const subRes = await fetch('/api/subscription', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        if (subRes.ok) {
          const subData = await subRes.json()
          setSubscription(subData)
        }

        // Fetch plans
        const plansRes = await fetch('/api/plans')
        if (plansRes.ok) {
          const plansData = await plansRes.json()
          setPlans(plansData)
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
        toast.error('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }

    if (authToken) {
      fetchData()
    }
  }, [authToken])

  // Compare plans
  const comparePlans = (targetPlanId) => {
    const currentPlan = subscription?.planId?.toLowerCase() || 'basic'
    const targetPlan = targetPlanId.toLowerCase()
    
    const currentLevel = PLAN_HIERARCHY[currentPlan] || 1
    const targetLevel = PLAN_HIERARCHY[targetPlan] || 1
    
    if (currentPlan === targetPlan) return 'current'
    if (targetLevel > currentLevel) return 'upgrade'
    return 'downgrade'
  }

  // Handle plan selection
  const handlePlanAction = (planId) => {
    const action = comparePlans(planId)
    if (action === 'current') return

    // Check if subscription expired - need to subscribe
    if (subscription?.status === 'expired') {
      setActionType('subscribe')
    } else {
      setActionType(action)
    }
    
    setSelectedPlan(planId)
    setShowConfirmDialog(true)
  }

  // Confirm plan change
  const confirmPlanChange = async () => {
    if (!selectedPlan) return

    setChangingPlan(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          planId: selectedPlan,
          action: actionType
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Plan updated successfully!')
        
        // Refresh subscription
        const subRes = await fetch('/api/subscription', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        if (subRes.ok) {
          const subData = await subRes.json()
          setSubscription(subData)
          onSubscriptionChange?.(subData)
        }
        
        setShowConfirmDialog(false)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update plan')
      }
    } catch (error) {
      console.error('Plan change error:', error)
      toast.error('Failed to update plan')
    } finally {
      setChangingPlan(false)
    }
  }

  // Get button text and style based on comparison
  const getButtonConfig = (planId) => {
    const comparison = comparePlans(planId)
    
    if (comparison === 'current') {
      return {
        text: 'Current Plan',
        variant: 'secondary',
        disabled: true,
        icon: Check
      }
    }
    
    if (subscription?.status === 'expired') {
      return {
        text: 'Subscribe',
        variant: 'default',
        disabled: false,
        icon: CreditCard
      }
    }
    
    if (comparison === 'upgrade') {
      return {
        text: 'Upgrade',
        variant: 'default',
        disabled: false,
        icon: ArrowUp,
        className: 'bg-gradient-to-r from-primary to-indigo-600'
      }
    }
    
    return {
      text: 'Downgrade',
      variant: 'outline',
      disabled: false,
      icon: ArrowDown
    }
  }

  // Calculate trial progress
  const trialProgress = useMemo(() => {
    if (subscription?.status !== 'trial') return null
    const daysUsed = 30 - (subscription?.daysRemaining || 0)
    return (daysUsed / 30) * 100
  }, [subscription])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    )
  }

  const currentPlanDetails = PLAN_DETAILS[subscription?.planId?.toLowerCase()] || PLAN_DETAILS['basic']
  const CurrentPlanIcon = currentPlanDetails.icon

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-r ${currentPlanDetails.color} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <CurrentPlanIcon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Current Plan</p>
                <h2 className="text-2xl font-bold">{subscription?.planName || currentPlanDetails.name}</h2>
              </div>
            </div>
            <Badge 
              className={`px-4 py-2 text-sm ${
                subscription?.status === 'active' ? 'bg-green-500' :
                subscription?.status === 'trial' ? 'bg-amber-500' :
                'bg-red-500'
              }`}
            >
              {subscription?.status === 'trial' ? 'Trial' : 
               subscription?.status === 'active' ? 'Active' : 'Expired'}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6">
          {/* Trial Status */}
          {subscription?.status === 'trial' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Trial Period</span>
                </div>
                <span className="text-sm text-slate-600">
                  {subscription.daysRemaining} days remaining
                </span>
              </div>
              <Progress value={trialProgress} className="h-2" />
              <p className="text-xs text-slate-500 mt-2">
                Trial ends on {new Date(subscription.trialEndDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Expired Warning */}
          {subscription?.status === 'expired' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Trial Expired</h4>
                  <p className="text-sm text-red-600">
                    {subscription.isOwner 
                      ? 'Please subscribe to continue using all features.'
                      : 'Contact your organization owner to renew the subscription.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Plan Features */}
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-3">Plan Features</h4>
            <div className="grid grid-cols-2 gap-2">
              {currentPlanDetails.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Available Plans
          </CardTitle>
          <CardDescription>
            {subscription?.status === 'expired' 
              ? 'Select a plan to reactivate your subscription'
              : 'Upgrade or downgrade your plan anytime'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {['basic', 'professional', 'enterprise'].map((planId) => {
              const planDetails = PLAN_DETAILS[planId]
              const Icon = planDetails.icon
              const buttonConfig = getButtonConfig(planId)
              const ButtonIcon = buttonConfig.icon
              const isCurrentPlan = comparePlans(planId) === 'current'

              return (
                <motion.div
                  key={planId}
                  whileHover={{ scale: isCurrentPlan ? 1 : 1.02 }}
                  className={`relative p-6 rounded-2xl border-2 transition-all ${
                    isCurrentPlan 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-slate-200 hover:border-primary/50'
                  }`}
                >
                  {/* Popular badge for Professional */}
                  {planId === 'professional' && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <Star className="h-3 w-3 mr-1" /> Popular
                      </Badge>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white">Current Plan</Badge>
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planDetails.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-lg font-bold mb-2">{planDetails.name}</h3>
                  
                  <div className="mb-4">
                    <span className="text-3xl font-bold">₹{planDetails.price}</span>
                    <span className="text-slate-500">/month</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {planDetails.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {planDetails.features.length > 4 && (
                      <li className="text-sm text-slate-400">
                        +{planDetails.features.length - 4} more features
                      </li>
                    )}
                  </ul>

                  <Button
                    className={`w-full ${buttonConfig.className || ''}`}
                    variant={buttonConfig.variant}
                    disabled={buttonConfig.disabled || !subscription?.isOwner}
                    onClick={() => handlePlanAction(planId)}
                  >
                    <ButtonIcon className="h-4 w-4 mr-2" />
                    {buttonConfig.text}
                  </Button>

                  {!subscription?.isOwner && !isCurrentPlan && (
                    <p className="text-xs text-center text-slate-400 mt-2">
                      Only owner can change plan
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
                VISA
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-slate-500">Expires 12/25</p>
              </div>
            </div>
            <Button variant="outline" disabled>
              Update
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Payment integration coming soon. Currently in free trial mode.
          </p>
        </CardContent>
      </Card>

      {/* Billing History - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No invoices yet</p>
            <p className="text-sm">Your billing history will appear here</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'upgrade' && <ArrowUp className="h-5 w-5 text-green-500" />}
              {actionType === 'downgrade' && <ArrowDown className="h-5 w-5 text-amber-500" />}
              {actionType === 'subscribe' && <CreditCard className="h-5 w-5 text-primary" />}
              Confirm {actionType === 'subscribe' ? 'Subscription' : `Plan ${actionType?.charAt(0).toUpperCase()}${actionType?.slice(1)}`}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'upgrade' && (
                `You're upgrading to ${PLAN_DETAILS[selectedPlan]?.name}. You'll get access to more features immediately.`
              )}
              {actionType === 'downgrade' && (
                `You're downgrading to ${PLAN_DETAILS[selectedPlan]?.name}. Some features may become unavailable.`
              )}
              {actionType === 'subscribe' && (
                `You're subscribing to ${PLAN_DETAILS[selectedPlan]?.name}. Your access will be restored immediately.`
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="py-4">
              <div className={`p-4 rounded-xl bg-gradient-to-r ${PLAN_DETAILS[selectedPlan]?.color} text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">New Plan</p>
                    <p className="text-xl font-bold">{PLAN_DETAILS[selectedPlan]?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">₹{PLAN_DETAILS[selectedPlan]?.price}</p>
                    <p className="text-white/80 text-sm">/month</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={changingPlan}>
              Cancel
            </Button>
            <Button onClick={confirmPlanChange} disabled={changingPlan}>
              {changingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm {actionType === 'subscribe' ? 'Subscription' : actionType?.charAt(0).toUpperCase() + actionType?.slice(1)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BillingPlanSettings
