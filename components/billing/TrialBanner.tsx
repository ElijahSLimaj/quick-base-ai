'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clientSubscriptionService } from '@/lib/billing/subscription-client'
import { Button } from '@/components/ui/button'
import { X, Clock, Sparkles } from 'lucide-react'
import { PricingDialog } from '@/components/PricingDialog'

interface TrialStatus {
  isOnTrial: boolean
  daysLeft: number
  trialEndsAt?: Date
  isNewUser?: boolean
}

export function TrialBanner() {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [showPricingDialog, setShowPricingDialog] = useState(false)

  useEffect(() => {
    checkTrialStatus()
  }, [])

  const checkTrialStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const status = await clientSubscriptionService.getTrialStatus(user.id)
      setTrialStatus(status)
    } catch (error) {
      console.error('Error checking trial status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || dismissed) {
    return null
  }

  // Don't show banner if user has paid subscription
  if (!trialStatus?.isOnTrial) {
    return null
  }

  const handleUpgrade = () => {
    setShowPricingDialog(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  const getBannerStyle = () => {
    if (trialStatus.daysLeft <= 1) {
      return 'bg-gradient-to-r from-red-600 to-red-700 border-red-500'
    } else if (trialStatus.daysLeft <= 3) {
      return 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500'
    }
    return 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500'
  }

  const getIcon = () => {
    if (trialStatus.daysLeft <= 1) {
      return <Clock className="h-4 w-4 animate-pulse" />
    }
    return <Sparkles className="h-4 w-4" />
  }

  const getMessage = () => {
    if (trialStatus.isNewUser) {
      return 'Welcome! You have a 7-day free trial. Create your first website to get started.'
    } else if (trialStatus.daysLeft === 0) {
      return 'Your free trial expires today! Upgrade now to continue using all features.'
    } else if (trialStatus.daysLeft === 1) {
      return 'Only 1 day left in your free trial! Upgrade to avoid any interruption.'
    } else {
      return `${trialStatus.daysLeft} days left in your free trial. Upgrade anytime to unlock unlimited access.`
    }
  }

  return (
    <>
      <div className={`${getBannerStyle()} text-white py-3 px-4 w-full border-b shadow-lg`}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span className="text-sm font-medium">
                {getMessage()}
              </span>
              <span className="text-xs opacity-90 hidden sm:inline">
                • 100 queries included in trial
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-white text-blue-700 hover:bg-gray-100 text-xs px-4 py-2 font-semibold shadow-sm border border-white/20"
            >
              Upgrade Now
            </Button>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <PricingDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        currentPlan="trial"
      />
    </>
  )
}