'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, X } from 'lucide-react'
import { ContactForm } from '@/components/ContactForm'
import Link from 'next/link'

interface PricingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan?: string
}

export function PricingDialog({ open, onOpenChange, currentPlan = 'starter' }: PricingDialogProps) {
  const [isYearly, setIsYearly] = useState(true)

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 19,
      yearlyPrice: 15,
      features: [
        '1 site',
        '2,000 answers/month',
        'Basic analytics',
        'Email support'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 49,
      yearlyPrice: 39,
      features: [
        '3 sites',
        '10,000 answers/month',
        'Custom branding',
        'Priority support'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        'Unlimited sites',
        'Custom limits',
        'White-labeling',
        'Dedicated support'
      ],
      popular: false
    }
  ]

  const handleUpgrade = (planId: string) => {
    if (planId === 'enterprise') {
      // Enterprise uses contact form
      return
    }
    
    // For now, redirect to signup with plan parameter
    // You can implement Stripe checkout here later
    window.open(`/signup?plan=${planId}&billing=${isYearly ? 'yearly' : 'monthly'}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            All plans include a 7-day free trial. No credit card required.
          </DialogDescription>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                !isYearly 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                isYearly 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan
            const isEnterprise = plan.id === 'enterprise'
            
            return (
              <Card 
                key={plan.id} 
                className={`relative border-0 bg-white shadow-lg hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <div className="text-4xl font-bold text-gray-900">
                    {isEnterprise ? (
                      'Custom'
                    ) : (
                      <>
                        ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                        <span className="text-lg font-normal text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                  {!isEnterprise && (
                    <div className="text-sm text-gray-500">
                      {isYearly ? (
                        <>
                          <span className="line-through">${plan.monthlyPrice}/mo</span> • Billed annually
                        </>
                      ) : (
                        'Billed monthly'
                      )}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrent ? (
                    <Button 
                      disabled 
                      className="w-full bg-green-600 hover:bg-green-600 cursor-not-allowed"
                    >
                      Current Plan
                    </Button>
                  ) : isEnterprise ? (
                    <ContactForm />
                  ) : (
                    <Button 
                      onClick={() => handleUpgrade(plan.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help choosing? <Link href="/contact" className="text-blue-600 hover:underline">Contact our team</Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
