'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clientSubscriptionService } from '@/lib/billing/subscription-client'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle } from 'lucide-react'
import { PricingDialog } from '@/components/PricingDialog'

interface PlanLimitBannerProps {
  action: 'create_website' | 'query'
}

interface LimitStatus {
  allowed: boolean
  reason?: string
  limit?: number
  upgrade_url?: string
}

export function PlanLimitBanner({ action }: PlanLimitBannerProps) {
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [showPricingDialog, setShowPricingDialog] = useState(false)

  useEffect(() => {
    checkLimits()
  }, [action])

  const checkLimits = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const result = await clientSubscriptionService.canPerformAction(user.id, action)
      setLimitStatus(result)
    } catch (error) {
      console.error('Error checking plan limits:', error)
      setLimitStatus({ allowed: true })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !limitStatus || limitStatus.allowed || dismissed) {
    return null
  }

  const handleUpgrade = () => {
    setShowPricingDialog(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <>
      <div className="bg-red-800 text-white py-2 px-4 w-full">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {getBannerMessage(limitStatus.reason!, limitStatus.limit)}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-white text-red-800 hover:bg-gray-100 text-xs px-3 py-1"
            >
              Upgrade Plan
            </Button>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <PricingDialog 
        open={showPricingDialog} 
        onOpenChange={setShowPricingDialog}
        currentPlan="starter"
      />
    </>
  )
}

function getBannerMessage(reason: string, limit?: number): string {
  switch (reason) {
    case 'site_limit_exceeded':
      return `You've reached your limit of ${limit} website(s). Upgrade to add more.`
    case 'query_limit_exceeded':
      return `You've reached your monthly query limit of ${limit}. Upgrade for more queries.`
    default:
      return 'Plan limit exceeded. Upgrade your plan to continue.'
  }
}
