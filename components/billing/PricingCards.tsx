'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, ArrowUpRight, Crown, Zap, Building } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/billing/plans'

interface PricingCardsProps {
  currentPlan?: PlanKey
  websiteId?: string
  onUpgrade?: (plan: PlanKey) => void
}

export function PricingCards({ currentPlan = 'starter', websiteId, onUpgrade }: PricingCardsProps) {
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const handleUpgrade = async (plan: PlanKey) => {
    if (!websiteId) return

    setLoading(plan)

    try {
      if (plan === 'enterprise') {
        window.open('/contact', '_blank')
        return
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, websiteId, billingPeriod })
      })

      if (response.ok) {
        const { checkout_url } = await response.json()
        window.location.href = checkout_url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      if (onUpgrade) {
        onUpgrade(plan)
      }
    } finally {
      setLoading(null)
    }
  }

  const planConfig = {
    trial: {
      icon: Zap,
      color: 'bg-green-500',
      popular: false
    },
    starter: {
      icon: Zap,
      color: 'bg-blue-500',
      popular: false
    },
    pro: {
      icon: Crown,
      color: 'bg-purple-500',
      popular: true
    },
    enterprise: {
      icon: Building,
      color: 'bg-gray-800',
      popular: false
    },
    expired_trial: {
      icon: Zap,
      color: 'bg-red-500',
      popular: false
    }
  }

  return (
    <div className="space-y-6">
      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
      {Object.entries(PLANS).map(([key, plan]) => {
        const planKey = key as PlanKey
        const config = planConfig[planKey]
        const Icon = config.icon
        const isCurrent = currentPlan === planKey
        const isDowngrade = getCurrentPlanIndex(currentPlan) > getCurrentPlanIndex(planKey)

        return (
          <Card
            key={planKey}
            className={`relative ${config.popular ? 'border-purple-200 shadow-lg scale-105' : ''} ${
              isCurrent ? 'border-green-200 bg-green-50' : ''
            }`}
          >
            {config.popular && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-600">
                Most Popular
              </Badge>
            )}

            <CardHeader className="text-center">
              <div className={`w-12 h-12 ${config.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                {plan.price ? (
                  <>
                    ${plan.price[billingPeriod] / 100}
                    <span className="text-lg font-normal text-gray-500">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </>
                ) : 'Custom'}
              </div>
              <CardDescription>
                {getplanDescription(planKey)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {plan.features.sites === -1 ? 'Unlimited websites' : `${plan.features.sites} website${plan.features.sites > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {plan.features.queries === -1 ? 'Unlimited queries' : `${plan.features.queries.toLocaleString()} queries/month`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm capitalize">
                    {plan.features.analytics} analytics
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm capitalize">
                    {plan.features.support} support
                  </span>
                </div>
                {planKey === 'enterprise' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Custom integrations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">SLA guarantee</span>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={() => handleUpgrade(planKey)}
                disabled={loading === planKey || isCurrent || isDowngrade}
                className={`w-full ${
                  config.popular
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : isCurrent
                    ? 'bg-green-600 hover:bg-green-700'
                    : ''
                }`}
                variant={isCurrent ? 'default' : isDowngrade ? 'outline' : 'default'}
              >
                {loading === planKey ? (
                  'Processing...'
                ) : isCurrent ? (
                  'Current Plan'
                ) : isDowngrade ? (
                  'Contact Support'
                ) : planKey === 'enterprise' ? (
                  <>
                    Contact Sales
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        )
      })}
      </div>
    </div>
  )
}

function getCurrentPlanIndex(plan: PlanKey): number {
  const order: PlanKey[] = ['starter', 'pro', 'enterprise']
  return order.indexOf(plan)
}

function getplanDescription(plan: PlanKey): string {
  const descriptions = {
    trial: 'Try all features free for 7 days',
    starter: 'Perfect for small websites getting started with AI support',
    pro: 'Ideal for growing businesses with multiple websites',
    enterprise: 'Advanced features for large organizations',
    expired_trial: 'Your trial has expired - upgrade to continue'
  } as const
  return descriptions[plan as keyof typeof descriptions] || descriptions.starter
}