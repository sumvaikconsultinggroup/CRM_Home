'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Crown, Check, Sparkles, Zap, Shield, CreditCard, Building, Users,
  Globe, Palette, ArrowRight, Lock, Star, TrendingUp, BarChart3
} from 'lucide-react'

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 2999,
    description: 'Essential features for small teams',
    icon: Building,
    color: 'from-slate-500 to-slate-700',
    features: [
      '5 Users',
      'Basic CRM',
      'Task Management',
      'Email Support',
      '5GB Storage',
      'Mobile App Access'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 5999,
    description: 'Advanced tools for growing businesses',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    popular: true,
    features: [
      '15 Users',
      'Advanced CRM',
      'Project Management',
      'Reports & Analytics',
      'Priority Support',
      '25GB Storage',
      'API Access',
      'Custom Integrations',
      'Advanced Reporting'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999,
    description: 'Complete solution for large organizations',
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    features: [
      'Unlimited Users',
      'Full CRM Suite',
      'Custom Modules',
      'API Access',
      'Dedicated Support',
      '100GB Storage',
      'White Labeling',
      'Custom Domain',
      'Lead Scoring',
      'Drag & Drop Kanban',
      'CSV Import/Export',
      'Advanced Filters',
      'Bulk Operations',
      'Activity Timeline',
      'Custom Fields',
      'Priority Support 24/7'
    ]
  }
]

export function UpgradeFlow({ currentPlan = 'basic', onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1: Select Plan, 2: Payment Details, 3: Confirmation
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
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false)
      setStep(3)
      toast.success('Payment successful!')
      
      // Mock API call to upgrade
      setTimeout(() => {
        onSuccess?.(selectedPlan.id)
      }, 2000)
    }, 2000)
  }\n\n  return (\n    <div className=\"min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6\">\n      <div className=\"max-w-7xl mx-auto\">\n        {/* Header */}\n        <motion.div\n          initial={{ opacity: 0, y: -20 }}\n          animate={{ opacity: 1, y: 0 }}\n          className=\"text-center mb-8\"\n        >\n          <div className=\"inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full mb-4\">\n            <Sparkles className=\"h-4 w-4 text-amber-400\" />\n            <span className=\"text-amber-400 text-sm font-medium\">Upgrade Your Plan</span>\n          </div>\n          <h1 className=\"text-4xl font-bold text-white mb-2\">Choose Your Plan</h1>\n          <p className=\"text-slate-300\">Unlock powerful features to grow your business</p>\n        </motion.div>\n\n        {/* Step Indicator */}\n        <div className=\"flex items-center justify-center gap-4 mb-8\">\n          {[1, 2, 3].map((s) => (\n            <div key={s} className=\"flex items-center gap-2\">\n              <motion.div\n                initial={{ scale: 0.8 }}\n                animate={{ \n                  scale: step >= s ? 1 : 0.8,\n                  backgroundColor: step >= s ? '#3B82F6' : '#475569'\n                }}\n                className=\"w-10 h-10 rounded-full flex items-center justify-center text-white font-bold\"\n              >\n                {step > s ? <Check className=\"h-5 w-5\" /> : s}\n              </motion.div>\n              {s < 3 && (\n                <div className={`w-16 h-1 rounded ${\n                  step > s ? 'bg-blue-500' : 'bg-slate-600'\n                }`} />\n              )}\n            </div>\n          ))}\n        </div>\n\n        <AnimatePresence mode=\"wait\">\n          {/* Step 1: Select Plan */}\n          {step === 1 && (\n            <motion.div\n              key=\"step1\"\n              initial={{ opacity: 0, x: 20 }}\n              animate={{ opacity: 1, x: 0 }}\n              exit={{ opacity: 0, x: -20 }}\n              className=\"grid md:grid-cols-2 lg:grid-cols-3 gap-6\"\n            >\n              {availablePlans.map((plan, i) => {\n                const Icon = plan.icon\n                return (\n                  <motion.div\n                    key={plan.id}\n                    initial={{ opacity: 0, y: 20 }}\n                    animate={{ opacity: 1, y: 0 }}\n                    transition={{ delay: i * 0.1 }}\n                    whileHover={{ y: -8 }}\n                  >\n                    <Card className={`relative p-6 bg-white/10 backdrop-blur-xl border-white/20 hover:border-white/40 transition-all overflow-hidden ${\n                      plan.popular ? 'ring-2 ring-blue-500' : ''\n                    }`}>\n                      {plan.popular && (\n                        <div className=\"absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg\">\n                          POPULAR\n                        </div>\n                      )}\n                      \n                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${plan.color} mb-4`}>\n                        <Icon className=\"h-8 w-8 text-white\" />\n                      </div>\n                      \n                      <h3 className=\"text-2xl font-bold text-white mb-2\">{plan.name}</h3>\n                      <p className=\"text-slate-300 text-sm mb-4\">{plan.description}</p>\n                      \n                      <div className=\"mb-6\">\n                        <div className=\"flex items-baseline gap-1\">\n                          <span className=\"text-4xl font-bold text-white\">\u20b9{plan.price.toLocaleString()}</span>\n                          <span className=\"text-slate-400\">/month</span>\n                        </div>\n                      </div>\n\n                      <ul className=\"space-y-3 mb-6\">\n                        {plan.features.map((feature, i) => (\n                          <li key={i} className=\"flex items-center gap-2 text-slate-300 text-sm\">\n                            <Check className=\"h-4 w-4 text-green-400 flex-shrink-0\" />\n                            <span>{feature}</span>\n                          </li>\n                        ))}\n                      </ul>\n\n                      <Button\n                        onClick={() => handlePlanSelect(plan)}\n                        className={`w-full bg-gradient-to-r ${plan.color} text-white border-0`}\n                      >\n                        Select {plan.name}\n                        <ArrowRight className=\"h-4 w-4 ml-2\" />\n                      </Button>\n                    </Card>\n                  </motion.div>\n                )\n              })}\n            </motion.div>\n          )}\n\n          {/* Step 2: Payment */}\n          {step === 2 && selectedPlan && (\n            <motion.div\n              key=\"step2\"\n              initial={{ opacity: 0, x: 20 }}\n              animate={{ opacity: 1, x: 0 }}\n              exit={{ opacity: 0, x: -20 }}\n              className=\"max-w-4xl mx-auto\"\n            >\n              <div className=\"grid md:grid-cols-2 gap-6\">\n                {/* Order Summary */}\n                <Card className=\"p-6 bg-white/10 backdrop-blur-xl border-white/20 h-fit\">\n                  <h3 className=\"text-xl font-bold text-white mb-4\">Order Summary</h3>\n                  \n                  <div className=\"space-y-4\">\n                    <div className=\"flex items-center justify-between\">\n                      <span className=\"text-slate-300\">Plan</span>\n                      <span className=\"text-white font-semibold\">{selectedPlan.name}</span>\n                    </div>\n                    <Separator className=\"bg-white/10\" />\n                    <div className=\"flex items-center justify-between\">\n                      <span className=\"text-slate-300\">Billing Cycle</span>\n                      <span className=\"text-white font-semibold\">Monthly</span>\n                    </div>\n                    <Separator className=\"bg-white/10\" />\n                    <div className=\"flex items-center justify-between text-lg\">\n                      <span className=\"text-white font-bold\">Total</span>\n                      <span className=\"text-white font-bold\">\u20b9{selectedPlan.price.toLocaleString()}/mo</span>\n                    </div>\n                  </div>\n\n                  <div className=\"mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg\">\n                    <p className=\"text-green-400 text-sm font-medium flex items-center gap-2\">\n                      <Lock className=\"h-4 w-4\" />\n                      Secure payment powered by Stripe\n                    </p>\n                  </div>\n                </Card>\n\n                {/* Payment Form */}\n                <Card className=\"p-6 bg-white/10 backdrop-blur-xl border-white/20\">\n                  <h3 className=\"text-xl font-bold text-white mb-4\">Payment Details</h3>\n                  \n                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className=\"mb-6\">\n                    <div className=\"flex items-center space-x-2 p-3 rounded-lg border border-white/20 bg-white/5\">\n                      <RadioGroupItem value=\"card\" id=\"card\" />\n                      <Label htmlFor=\"card\" className=\"flex items-center gap-2 text-white cursor-pointer flex-1\">\n                        <CreditCard className=\"h-4 w-4\" />\n                        Credit/Debit Card\n                      </Label>\n                    </div>\n                    <div className=\"flex items-center space-x-2 p-3 rounded-lg border border-white/20 bg-white/5\">\n                      <RadioGroupItem value=\"upi\" id=\"upi\" />\n                      <Label htmlFor=\"upi\" className=\"flex items-center gap-2 text-white cursor-pointer flex-1\">\n                        <Sparkles className=\"h-4 w-4\" />\n                        UPI\n                      </Label>\n                    </div>\n                  </RadioGroup>\n\n                  {paymentMethod === 'card' && (\n                    <div className=\"space-y-4\">\n                      <div>\n                        <Label className=\"text-slate-300\">Card Number</Label>\n                        <Input\n                          placeholder=\"1234 5678 9012 3456\"\n                          value={paymentDetails.cardNumber}\n                          onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}\n                          className=\"bg-white/10 border-white/20 text-white placeholder:text-slate-500\"\n                        />\n                      </div>\n                      <div>\n                        <Label className=\"text-slate-300\">Cardholder Name</Label>\n                        <Input\n                          placeholder=\"John Doe\"\n                          value={paymentDetails.cardName}\n                          onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}\n                          className=\"bg-white/10 border-white/20 text-white placeholder:text-slate-500\"\n                        />\n                      </div>\n                      <div className=\"grid grid-cols-3 gap-4\">\n                        <div>\n                          <Label className=\"text-slate-300\">Month</Label>\n                          <Input\n                            placeholder=\"MM\"\n                            maxLength={2}\n                            value={paymentDetails.expiryMonth}\n                            onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryMonth: e.target.value })}\n                            className=\"bg-white/10 border-white/20 text-white placeholder:text-slate-500\"\n                          />\n                        </div>\n                        <div>\n                          <Label className=\"text-slate-300\">Year</Label>\n                          <Input\n                            placeholder=\"YY\"\n                            maxLength={2}\n                            value={paymentDetails.expiryYear}\n                            onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryYear: e.target.value })}\n                            className=\"bg-white/10 border-white/20 text-white placeholder:text-slate-500\"\n                          />\n                        </div>\n                        <div>\n                          <Label className=\"text-slate-300\">CVV</Label>\n                          <Input\n                            placeholder=\"123\"\n                            maxLength={3}\n                            type=\"password\"\n                            value={paymentDetails.cvv}\n                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}\n                            className=\"bg-white/10 border-white/20 text-white placeholder:text-slate-500\"\n                          />\n                        </div>\n                      </div>\n                    </div>\n                  )}\n\n                  {paymentMethod === 'upi' && (\n                    <div>\n                      <Label className=\"text-slate-300\">UPI ID</Label>\n                      <Input\n                        placeholder=\"yourname@upi\"\n                        value={paymentDetails.upiId}\n                        onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}\n                        className=\"bg-white/10 border-white/20 text-white placeholder:text-slate-500\"\n                      />\n                    </div>\n                  )}\n\n                  <div className=\"flex gap-3 mt-6\">\n                    <Button\n                      variant=\"outline\"\n                      onClick={() => setStep(1)}\n                      className=\"flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10\"\n                    >\n                      Back\n                    </Button>\n                    <Button\n                      onClick={handlePayment}\n                      disabled={processing}\n                      className=\"flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white\"\n                    >\n                      {processing ? (\n                        <>\n                          <motion.div\n                            animate={{ rotate: 360 }}\n                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}\n                          >\n                            <Sparkles className=\"h-4 w-4 mr-2\" />\n                          </motion.div>\n                          Processing...\n                        </>\n                      ) : (\n                        <>\n                          Pay \u20b9{selectedPlan.price.toLocaleString()}\n                          <ArrowRight className=\"h-4 w-4 ml-2\" />\n                        </>\n                      )}\n                    </Button>\n                  </div>\n                </Card>\n              </div>\n            </motion.div>\n          )}\n\n          {/* Step 3: Success */}\n          {step === 3 && selectedPlan && (\n            <motion.div\n              key=\"step3\"\n              initial={{ opacity: 0, scale: 0.9 }}\n              animate={{ opacity: 1, scale: 1 }}\n              exit={{ opacity: 0, scale: 0.9 }}\n              className=\"max-w-2xl mx-auto text-center\"\n            >\n              <Card className=\"p-12 bg-white/10 backdrop-blur-xl border-white/20\">\n                <motion.div\n                  initial={{ scale: 0 }}\n                  animate={{ scale: 1 }}\n                  transition={{ type: 'spring', delay: 0.2 }}\n                >\n                  <div className=\"inline-flex p-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6\">\n                    <Check className=\"h-16 w-16 text-white\" />\n                  </div>\n                </motion.div>\n                \n                <h2 className=\"text-3xl font-bold text-white mb-4\">Welcome to {selectedPlan.name}!</h2>\n                <p className=\"text-slate-300 text-lg mb-8\">\n                  Your account has been upgraded successfully.\n                </p>\n\n                <div className=\"bg-white/5 rounded-lg p-6 mb-6\">\n                  <p className=\"text-white font-semibold mb-4\">You now have access to:</p>\n                  <div className=\"grid grid-cols-2 gap-3 text-left\">\n                    {selectedPlan.features.slice(0, 6).map((feature, i) => (\n                      <div key={i} className=\"flex items-center gap-2 text-slate-300 text-sm\">\n                        <Check className=\"h-4 w-4 text-green-400\" />\n                        <span>{feature}</span>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n\n                <Button\n                  onClick={() => {\n                    onClose?.() \n                    window.location.reload()\n                  }}\n                  className=\"bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8\"\n                  size=\"lg\"\n                >\n                  Start Using {selectedPlan.name}\n                  <Sparkles className=\"h-4 w-4 ml-2\" />\n                </Button>\n              </Card>\n            </motion.div>\n          )}\n        </AnimatePresence>\n      </div>\n    </div>\n  )\n}\n