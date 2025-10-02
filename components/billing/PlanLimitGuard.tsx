'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clientSubscriptionService } from '@/lib/billing/subscription-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'

interface PlanLimitGuardProps {
  action: 'create_website' | 'query'
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface LimitStatus {
  allowed: boolean
  reason?: string
  limit?: number
  upgrade_url?: string
}

export function PlanLimitGuard({ action, children, fallback }: PlanLimitGuardProps) {
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded h-8" />
  }

  if (!limitStatus || limitStatus.allowed) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg text-orange-800">
            Plan Limit Reached
          </CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          {getErrorMessage(limitStatus.reason!, limitStatus.limit)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => window.open(limitStatus.upgrade_url, '_blank')}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          Upgrade Plan
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

function getErrorMessage(reason: string, limit?: number): string {
  switch (reason) {
    case 'site_limit_exceeded':
      return `You've reached your limit of ${limit} website(s). Upgrade your plan to add more websites.`
    case 'query_limit_exceeded':
      return `You've reached your monthly query limit of ${limit}. Upgrade your plan for more queries.`
    default:
      return 'Plan limit exceeded. Please upgrade your plan to continue.'
  }
}