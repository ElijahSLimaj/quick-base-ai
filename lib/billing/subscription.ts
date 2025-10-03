import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, isWithinLimits, type PlanKey } from './plans'
import { getPriceId, type BillingPeriod } from './price-ids'
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
  trial_started_at?: string
  trial_ends_at?: string
  plan_type: string
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
    return {
      ...data,
      plan_type: (data as any).plan_type || 'paid'
    } as SubscriptionData
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
    return data.map(sub => ({
      ...sub,
      plan_type: (sub as any).plan_type || 'paid'
    })) as SubscriptionData[]
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
        upgrade_url: await this.getUpgradeUrl(userId, 'trial')
      }
    }

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
    stripeSubscriptionId?: string
    status: string
    isTrialStart?: boolean
  }): Promise<void> {
    const supabase = await createClient()

    const subscriptionData: any = {
      website_id: data.websiteId,
      plan: data.plan,
      status: data.status,
      usage_count: 0,
      plan_type: data.isTrialStart ? 'free' : 'paid'
    }

    if (data.stripeSubscriptionId) {
      subscriptionData.id = data.stripeSubscriptionId
      subscriptionData.stripe_subscription_id = data.stripeSubscriptionId
    }

    if (data.isTrialStart) {
      const now = new Date()
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      subscriptionData.trial_started_at = now.toISOString()
      subscriptionData.trial_ends_at = trialEnd.toISOString()
      subscriptionData.sites_limit = 1
      subscriptionData.answers_limit = 100
      subscriptionData.crawls_limit = 2
      subscriptionData.manual_recrawls_limit = 1
      subscriptionData.auto_crawl_enabled = false
    }

    await supabase
      .from('subscriptions')
      .insert(subscriptionData)
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

  async getTrialStatus(userId: string): Promise<{
    isOnTrial: boolean
    daysLeft: number
    trialEndsAt?: Date
  }> {
    const subscriptions = await this.getUserSubscriptions(userId)
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

  async startTrialForUser(websiteId: string): Promise<void> {
    // Check if user already has a subscription for this website
    const existingSub = await this.getSubscription(websiteId)
    if (existingSub) return

    await this.createSubscription({
      websiteId,
      plan: 'trial',
      status: 'active',
      isTrialStart: true
    })
  }

  private async getUpgradeUrl(userId: string, currentPlan: PlanKey, billingPeriod: BillingPeriod = 'monthly'): Promise<string> {
    const nextPlan = currentPlan === 'trial' || currentPlan === 'expired_trial'
      ? 'starter'
      : currentPlan === 'starter' ? 'pro' : 'enterprise'

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

    // Use unified price ID mapping
    const priceId = getPriceId(nextPlan, billingPeriod)

    if (!priceId) {
      console.error(`No price ID found for plan: ${nextPlan}, billing: ${billingPeriod}`)
      return '/dashboard/billing'
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripe_customer_id,
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    })

    return session.url || '/dashboard/billing'
  }
}

export const subscriptionService = new SubscriptionService()