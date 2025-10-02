import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, isWithinLimits } from '@/lib/billing/plans'

export interface PlanGuardOptions {
  action: 'create_website' | 'query'
  websiteId?: string
}

export async function planGuard(
  request: NextRequest,
  options: PlanGuardOptions
): Promise<NextResponse | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's websites
    const { data: websites } = await supabase
      .from('websites')
      .select('id')
      .eq('owner_id', user.id)

    if (!websites) {
      return NextResponse.json(
        { error: 'No websites found' },
        { status: 404 }
      )
    }

    const siteCount = websites.length
    const websiteIds = websites.map(w => w.id)

    // Get user's subscription
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('plan, status, usage_count')
      .in('website_id', websiteIds)

    const activeSub = subscriptions?.find(sub => sub.status === 'active')
    const plan = activeSub?.plan || 'starter'

    // Get current usage
    const queryCount = subscriptions?.reduce((sum, sub) => sum + (sub.usage_count || 0), 0) || 0

    const usage = { sites: siteCount, queries: queryCount }
    const limits = getPlanLimits(plan)

    // Check limits based on action
    if (options.action === 'create_website') {
      if (limits.maxSites !== -1 && usage.sites >= limits.maxSites) {
        return NextResponse.json(
          {
            error: 'Plan limit exceeded',
            reason: 'site_limit_exceeded',
            limit: limits.maxSites,
            upgrade_url: '/dashboard/billing',
            message: `You've reached your limit of ${limits.maxSites} website(s). Upgrade your plan to add more websites.`
          },
          { status: 402 }
        )
      }
    }

    if (options.action === 'query') {
      const result = isWithinLimits(plan, usage)
      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Plan limit exceeded',
            reason: result.reason,
            limit: result.limit,
            upgrade_url: '/dashboard/billing',
            message: getErrorMessage(result.reason!, result.limit)
          },
          { status: 402 }
        )
      }

      // Increment usage if websiteId provided
      if (options.websiteId) {
        await supabase
          .from('subscriptions')
          .update({
            usage_count: supabase.sql`usage_count + 1`,
            updated_at: new Date().toISOString()
          })
          .eq('website_id', options.websiteId)
      }
    }

    return null
  } catch (error) {
    console.error('Plan guard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

export function withPlanGuard(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: PlanGuardOptions
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const guardResult = await planGuard(request, options)

    if (guardResult) {
      return guardResult
    }

    return handler(request, ...args)
  }
}