import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, isWithinLimits, type PlanKey } from './plans'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

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

export class SubscriptionService {
  async getSubscription(websiteId: string): Promise<SubscriptionData | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('website_id', websiteId)
      .single()

    if (error || !data) return null
    return data as SubscriptionData
  }

  async getUserSubscriptions(userId: string): Promise<SubscriptionData[]> {
    const supabase = await createClient()
    const { data: websites } = await supabase
      .from('websites')
      .select('id')
      .eq('owner_id', userId)

    if (!websites) return []

    const websiteIds = websites.map(w => w.id)

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('website_id', websiteIds)

    if (error || !data) return []
    return data as SubscriptionData[]
  }

  async getCurrentUsage(userId: string): Promise<UsageData> {
    const supabase = await createClient()
    const { data: websites } = await supabase
      .from('websites')
      .select('id')
      .eq('owner_id', userId)

    const siteCount = websites?.length || 0

    if (!websites) {
      return { sites: 0, queries: 0 }
    }

    const websiteIds = websites.map(w => w.id)

    const { data: subscriptions } = await supabase
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
          upgrade_url: await this.getUpgradeUrl(userId, plan)
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
          upgrade_url: await this.getUpgradeUrl(userId, plan)
        }
      }
    }

    return { allowed: true }
  }

  async incrementUsage(websiteId: string): Promise<void> {
    const supabase = await createClient()
    
    // First get the current usage count
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('usage_count')
      .eq('website_id', websiteId)
      .single()
    
    if (subscription) {
      // Increment the usage count
      await supabase
        .from('subscriptions')
        .update({ usage_count: (subscription.usage_count || 0) + 1 })
        .eq('website_id', websiteId)
    }
  }

  async createSubscription(data: {
    websiteId: string
    plan: PlanKey
    stripeSubscriptionId: string
    status: string
  }): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('subscriptions')
      .insert({
        website_id: data.websiteId,
        plan: data.plan,
        id: data.stripeSubscriptionId,
        status: data.status,
        usage_count: 0
      })
  }

  async updateSubscription(subscriptionId: string, updates: {
    plan?: PlanKey
    status?: string
  }): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
  }

  async resetMonthlyUsage(): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('subscriptions')
      .update({ usage_count: 0 })
      .neq('status', 'canceled')
  }

  private async getUpgradeUrl(userId: string, currentPlan: PlanKey): Promise<string> {
    const nextPlan = currentPlan === 'starter' ? 'pro' : 'enterprise'

    const supabase = await createClient()
    const { data: customer } = await supabase
      .from('websites')
      .select('stripe_customer_id')
      .eq('owner_id', userId)
      .single()

    if (!customer?.stripe_customer_id) {
      return '/dashboard/billing'
    }

    if (nextPlan === 'enterprise') {
      return '/contact'
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripe_customer_id,
      mode: 'subscription',
      line_items: [{
        price: process.env[`STRIPE_${nextPlan.toUpperCase()}_PRICE_ID`],
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    })

    return session.url || '/dashboard/billing'
  }
}

export const subscriptionService = new SubscriptionService()