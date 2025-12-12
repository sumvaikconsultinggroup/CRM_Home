'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Crown, Check, Sparkles, Zap, Shield, CreditCard, Building,
  ArrowRight, Lock
} from 'lucide-react'

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 2999,
    description: 'Essential features for small teams',
    icon: Building,
    color: 'from-slate-500 to-slate-700',
    features: ['5 Users', 'Basic CRM', 'Task Management', 'Email Support', '5GB Storage', 'Mobile App Access']
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 5999,
    description: 'Advanced tools for growing businesses',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    popular: true,
    features: ['15 Users', 'Advanced CRM', 'Project Management', 'Reports & Analytics', 'Priority Support', '25GB Storage', 'API Access', 'Custom Integrations', 'Advanced Reporting']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999,
    description: 'Complete solution for large organizations',
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    features: ['Unlimited Users', 'Full CRM Suite', 'Custom Modules', 'API Access', 'Dedicated Support', '100GB Storage', 'White Labeling', 'Custom Domain', 'Lead Scoring', 'Drag & Drop Kanban', 'CSV Import/Export', 'Advanced Filters', 'Bulk Operations', 'Activity Timeline', 'Custom Fields', 'Priority Support 24/7']
  }
]

export function UpgradeFlow({ currentPlan = 'basic', onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [processing, setProcessing] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    upiId: ''
  })

  const currentPlanIndex = plans.findIndex(p => p.id === currentPlan)
  const availablePlans = plans.filter((_, index) => index > currentPlanIndex)

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan)
    setStep(2)
  }

  const handlePayment = async () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setStep(3)
      toast.success('Payment successful!')
      setTimeout(() => {
        onSuccess?.(selectedPlan.id)
      }, 2000)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Upgrade Your Plan</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Choose Your Plan</h1>
          <p className="text-slate-300">Unlock powerful features to grow your business</p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: step >= s ? 1 : 0.8, backgroundColor: step >= s ? '#3B82F6' : '#475569' }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </motion.div>
              {s < 3 && <div className={`w-16 h-1 rounded ${step > s ? 'bg-blue-500' : 'bg-slate-600'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePlans.map((plan, i) => {
                const Icon = plan.icon
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -8 }}>
                    <Card className={`relative p-6 bg-white/10 backdrop-blur-xl border-white/20 hover:border-white/40 transition-all overflow-hidden ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                      {plan.popular && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">POPULAR</div>
                      )}
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${plan.color} mb-4`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-slate-300 text-sm mb-4">{plan.description}</p>
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-white">₹{plan.price.toLocaleString()}</span>
                          <span className="text-slate-400">/month</span>
                        </div>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button onClick={() => handlePlanSelect(plan)} className={`w-full bg-gradient-to-r ${plan.color} text-white border-0`}>
                        Select {plan.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {step === 2 && selectedPlan && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 h-fit">
                  <h3 className="text-xl font-bold text-white mb-4">Order Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Plan</span>
                      <span className="text-white font-semibold">{selectedPlan.name}</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Billing Cycle</span>
                      <span className="text-white font-semibold">Monthly</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between text-lg">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-white font-bold">₹{selectedPlan.price.toLocaleString()}/mo</span>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Secure payment powered by Stripe
                    </p>
                  </div>
                </Card>

                <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">Payment Details</h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mb-6">
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/20 bg-white/5">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 text-white cursor-pointer flex-1">
                        <CreditCard className="h-4 w-4" />
                        Credit/Debit Card
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/20 bg-white/5">
                      <RadioGroupItem value="upi" id="upi" />
                      <Label htmlFor="upi" className="flex items-center gap-2 text-white cursor-pointer flex-1">
                        <Sparkles className="h-4 w-4" />
                        UPI
                      </Label>
                    </div>
                  </RadioGroup>

                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Card Number</Label>
                        <Input placeholder="1234 5678 9012 3456" value={paymentDetails.cardNumber} onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-slate-500" />
                      </div>
                      <div>
                        <Label className="text-slate-300">Cardholder Name</Label>
                        <Input placeholder="John Doe" value={paymentDetails.cardName} onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-slate-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-slate-300">Month</Label>
                          <Input placeholder="MM" maxLength={2} value={paymentDetails.expiryMonth} onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryMonth: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-slate-500" />
                        </div>
                        <div>
                          <Label className="text-slate-300">Year</Label>
                          <Input placeholder="YY" maxLength={2} value={paymentDetails.expiryYear} onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryYear: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-slate-500" />
                        </div>
                        <div>
                          <Label className="text-slate-300">CVV</Label>
                          <Input placeholder="123" maxLength={3} type="password" value={paymentDetails.cvv} onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-slate-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div>
                      <Label className="text-slate-300">UPI ID</Label>
                      <Input placeholder="yourname@upi" value={paymentDetails.upiId} onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-slate-500" />
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
                      Back
                    </Button>
                    <Button onClick={handlePayment} disabled={processing} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                      {processing ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                            <Sparkles className="h-4 w-4 mr-2" />
                          </motion.div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Pay ₹{selectedPlan.price.toLocaleString()}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {step === 3 && selectedPlan && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-2xl mx-auto text-center">
              <Card className="p-12 bg-white/10 backdrop-blur-xl border-white/20">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                  <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6">
                    <Check className="h-16 w-16 text-white" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to {selectedPlan.name}!</h2>
                <p className="text-slate-300 text-lg mb-8">Your account has been upgraded successfully.</p>
                <div className="bg-white/5 rounded-lg p-6 mb-6">
                  <p className="text-white font-semibold mb-4">You now have access to:</p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {selectedPlan.features.slice(0, 6).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                        <Check className="h-4 w-4 text-green-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => { onClose?.(); window.location.reload() }} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8" size="lg">
                  Start Using {selectedPlan.name}
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
