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

    // Check if user belongs to an organization first
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('organization_id, organizations(plan_name, max_seats)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    let plan = 'trial'
    let siteCount = 0

    if (userMembership?.organization_id) {
      // User belongs to an organization - use organization plan
      plan = userMembership.organizations?.plan_name || 'trial'

      // Count websites in the organization
      const { data: orgWebsites } = await supabase
        .from('websites')
        .select('id')
        .eq('organization_id', userMembership.organization_id)

      siteCount = orgWebsites?.length || 0
    } else {
      // Individual user - use traditional subscription logic
      const { data: websites } = await supabase
        .from('websites')
        .select('id')
        .eq('owner_id', user.id)
        .is('organization_id', null)

      siteCount = websites?.length || 0
      const websiteIds = websites?.map(w => w.id) || []

      // Get user's subscription
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .in('website_id', websiteIds)

      const activeSub = subscriptions?.find(sub => sub.status === 'active')
      plan = activeSub?.plan || 'trial'
    }

    // Get current usage based on context
    let queryCount = 0

    if (userMembership?.organization_id) {
      // For organizations, count queries across all org websites
      const { data: orgWebsites } = await supabase
        .from('websites')
        .select('id')
        .eq('organization_id', userMembership.organization_id)

      if (orgWebsites && orgWebsites.length > 0) {
        const websiteIds = orgWebsites.map(w => w.id)
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('usage_count')
          .in('website_id', websiteIds)

        queryCount = subscriptions?.reduce((sum, sub) => sum + (sub.usage_count || 0), 0) || 0
      }

      // For enterprise plans, no trial expiration check needed
    } else {
      // Individual user logic
      const { data: websites } = await supabase
        .from('websites')
        .select('id')
        .eq('owner_id', user.id)
        .is('organization_id', null)

      const websiteIds = websites?.map(w => w.id) || []

      if (websiteIds.length > 0) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .in('website_id', websiteIds)

        const activeSub = subscriptions?.find(sub => sub.status === 'active')

        // Check if trial is expired for individual users
        if ((activeSub as any)?.plan_type === 'free' && (activeSub as any)?.trial_ends_at) {
          const trialEnd = new Date((activeSub as any).trial_ends_at)
          if (new Date() > trialEnd) {
            plan = 'expired_trial'
          }
        }

        queryCount = subscriptions?.reduce((sum, sub) => sum + (sub.usage_count || 0), 0) || 0
      }
    }

    const usage = { sites: siteCount, queries: queryCount }
    const limits = getPlanLimits(plan)

    // Check if trial is expired
    if (plan === 'expired_trial') {
      return NextResponse.json(
        {
          error: 'Trial expired',
          reason: 'trial_expired',
          upgrade_url: '/dashboard/billing',
          message: 'Your free trial has expired. Upgrade to continue using all features.'
        },
        { status: 402 }
      )
    }

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
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('usage_count')
          .eq('website_id', options.websiteId)
          .single()
        
        if (subscription) {
          await supabase
            .from('subscriptions')
            .update({
              usage_count: (subscription.usage_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('website_id', options.websiteId)
        }
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
    case 'trial_expired':
      return 'Your free trial has expired. Upgrade to continue using all features.'
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