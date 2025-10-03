'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clientSubscriptionService } from '@/lib/billing/subscription-client'
import { getPlanLimits, PLANS, type PlanKey } from '@/lib/billing/plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, MessageSquare, TrendingUp, Crown } from 'lucide-react'
import { PricingDialog } from '@/components/PricingDialog'

interface UsageDisplayProps {
  className?: string
}

interface UsageData {
  plan: PlanKey
  usage: {
    sites: number
    queries: number
  }
  limits: ReturnType<typeof getPlanLimits>
}

export function UsageDisplay({ className }: UsageDisplayProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const [plan, usage] = await Promise.all([
        clientSubscriptionService.getUserPlan(user.id),
        clientSubscriptionService.getCurrentUsage(user.id)
      ])

      const limits = getPlanLimits(plan)

      setUsageData({ plan, usage, limits })
    } catch (error) {
      console.error('Error fetching usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usageData) {
    return null
  }

  const { plan, usage, limits } = usageData
  const planDetails = PLANS[plan]

  const sitesPercentage = limits.maxSites === -1 ? 0 : (usage.sites / limits.maxSites) * 100
  const queriesPercentage = limits.maxQueriesPerMonth === -1 ? 0 : (usage.queries / limits.maxQueriesPerMonth) * 100

  const handleUpgrade = () => {
    setShowPricingDialog(true)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Monitor your usage and limits
            </CardDescription>
          </div>
          <Badge variant={plan === 'enterprise' ? 'default' : 'secondary'} className="text-sm">
            {planDetails.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Websites Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Websites</span>
            </div>
            <span className="text-sm text-gray-600">
              {usage.sites} / {limits.maxSites === -1 ? '∞' : limits.maxSites}
            </span>
          </div>
          {limits.maxSites !== -1 && (
            <Progress
              value={sitesPercentage}
              className="h-2"
              {...(sitesPercentage >= 90 && { className: "h-2 [&>div]:bg-red-500" })}
            />
          )}
        </div>

        {/* Queries Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Queries This Month</span>
            </div>
            <span className="text-sm text-gray-600">
              {usage.queries} / {limits.maxQueriesPerMonth === -1 ? '∞' : limits.maxQueriesPerMonth}
            </span>
          </div>
          {limits.maxQueriesPerMonth !== -1 && (
            <Progress
              value={queriesPercentage}
              className="h-2"
              {...(queriesPercentage >= 90 && { className: "h-2 [&>div]:bg-red-500" })}
            />
          )}
        </div>

        {/* Analytics Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Analytics</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {limits.analyticsLevel}
            </Badge>
          </div>
        </div>

        {/* Upgrade Button */}
        {plan !== 'enterprise' && (sitesPercentage >= 80 || queriesPercentage >= 80) && (
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="sm"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        )}
      </CardContent>
      
      <PricingDialog 
        open={showPricingDialog} 
        onOpenChange={setShowPricingDialog}
        currentPlan={plan}
      />
    </Card>
  )
}