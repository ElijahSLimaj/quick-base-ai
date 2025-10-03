import { createClient } from '@/lib/supabase/client'
import { getPlanLimits, isWithinLimits, type PlanKey } from './plans'

export interface SubscriptionData {
  id: string
  plan: PlanKey
  status: string
  usage_count: number
  website_id: string
  trial_started_at?: string
  trial_ends_at?: string
  plan_type: string
}

export interface UsageData {
  sites: number
  queries: number
}

export class ClientSubscriptionService {
  private supabase = createClient()

  async getSubscription(websiteId: string): Promise<SubscriptionData | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('website_id', websiteId)
      .single()

    if (error || !data) return null
    return {
      ...data,
      plan_type: (data as any).plan_type || 'paid'
    } as SubscriptionData
  }

  async getUserSubscriptions(userId: string): Promise<SubscriptionData[]> {
    const { data: websites } = await this.supabase
      .from('websites')
      .select('id')
      .eq('owner_id', userId)

    if (!websites) return []

    const websiteIds = websites.map(w => w.id)

    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .in('website_id', websiteIds)

    if (error || !data) return []
    return data.map(sub => ({
      ...sub,
      plan_type: (sub as any).plan_type || 'paid'
    })) as SubscriptionData[]
  }

  async getCurrentUsage(userId: string): Promise<UsageData> {
    const { data: websites } = await this.supabase
      .from('websites')
      .select('id')
      .eq('owner_id', userId)

    const siteCount = websites?.length || 0

    if (!websites) {
      return { sites: 0, queries: 0 }
    }

    const websiteIds = websites.map(w => w.id)

    const { data: subscriptions } = await this.supabase
      .from('subscriptions')
      .select('usage_count')
      .in('website_id', websiteIds)

    const queryCount = subscriptions?.reduce((sum, sub) => sum + (sub.usage_count || 0), 0) || 0

    return {
      sites: siteCount,
      queries: queryCount
    }
  }

  async getUserPlan(userId: string): Promise<PlanKey> {
    const subscriptions = await this.getUserSubscriptions(userId)

    if (subscriptions.length === 0) return 'trial'

    const activeSub = subscriptions.find(sub => sub.status === 'active')
    if (!activeSub) return 'trial'

    // Check if trial is expired
    if (activeSub.plan_type === 'free' && activeSub.trial_ends_at) {
      const trialEnd = new Date(activeSub.trial_ends_at)
      if (new Date() > trialEnd) {
        return 'expired_trial'
      }
    }

    return (activeSub?.plan as PlanKey) || 'trial'
  }

  async canPerformAction(userId: string, action: 'create_website' | 'query'): Promise<{
    allowed: boolean
    reason?: string
    limit?: number
    upgrade_url?: string
  }> {
    const plan = await this.getUserPlan(userId)
    const usage = await this.getCurrentUsage(userId)

    // Check if trial is expired
    if (plan === 'expired_trial') {
      return {
        allowed: false,
        reason: 'trial_expired',
        upgrade_url: '/dashboard/billing'
      }
    }

    if (action === 'create_website') {
      const limits = getPlanLimits(plan)
      if (limits.maxSites !== -1 && usage.sites >= limits.maxSites) {
        return {
          allowed: false,
          reason: 'site_limit_exceeded',
          limit: limits.maxSites,
          upgrade_url: '/dashboard/billing'
        }
      }
    }

    if (action === 'query') {
      const result = isWithinLimits(plan, usage)
      if (!result.allowed) {
        return {
          allowed: false,
          reason: result.reason,
          limit: result.limit,
          upgrade_url: '/dashboard/billing'
        }
      }
    }

    return { allowed: true }
  }

  async getTrialStatus(userId: string): Promise<{
    isOnTrial: boolean
    daysLeft: number
    trialEndsAt?: Date
    isNewUser?: boolean
  }> {
    const subscriptions = await this.getUserSubscriptions(userId)

    // If user has no subscriptions, they're a new user eligible for trial
    if (subscriptions.length === 0) {
      return {
        isOnTrial: true,
        daysLeft: 7,
        isNewUser: true
      }
    }

    const trialSub = subscriptions.find(sub =>
      sub.plan_type === 'free' && sub.trial_ends_at
    )

    if (!trialSub?.trial_ends_at) {
      return { isOnTrial: false, daysLeft: 0 }
    }

    const trialEnd = new Date(trialSub.trial_ends_at)
    const now = new Date()
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      isOnTrial: daysLeft > 0,
      daysLeft: Math.max(0, daysLeft),
      trialEndsAt: trialEnd
    }
  }
}

export const clientSubscriptionService = new ClientSubscriptionService()