import { createClient } from '@/lib/supabase/client'
import { getPlanLimits, isWithinLimits, type PlanKey } from './plans'

export interface SubscriptionData {
  id: string
  plan: PlanKey
  status: string
  usage_count: number
  website_id: string
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
    return data as SubscriptionData
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
    return data as SubscriptionData[]
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

    if (subscriptions.length === 0) return 'starter'

    const activeSub = subscriptions.find(sub => sub.status === 'active')
    return (activeSub?.plan as PlanKey) || 'starter'
  }

  async canPerformAction(userId: string, action: 'create_website' | 'query'): Promise<{
    allowed: boolean
    reason?: string
    limit?: number
    upgrade_url?: string
  }> {
    const plan = await this.getUserPlan(userId)
    const usage = await this.getCurrentUsage(userId)

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
}

export const clientSubscriptionService = new ClientSubscriptionService()