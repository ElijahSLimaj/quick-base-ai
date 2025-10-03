import { createServiceClient } from '@/lib/supabase/service'
import { getPlanLimits, isWithinLimits } from './plans'

export interface UsageStats {
  sites: number
  queries: number
  queriesThisMonth: number
}

export async function getProjectUsage(websiteId: string): Promise<UsageStats> {
  const supabase = createServiceClient()
  
  // Get current month start date
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Count sites (websites with same owner)
  const { data: website } = await supabase
    .from('websites')
    .select('owner_id')
    .eq('id', websiteId)
    .single()
    
  if (!website) {
    throw new Error('Website not found')
  }
  
  const { count: sitesCount } = await supabase
    .from('websites')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', website.owner_id!)
  
  // Count queries this month
  const { count: queriesThisMonth } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('website_id', websiteId)
    .gte('created_at', monthStart.toISOString())
  
  // Count total queries for this website
  const { count: totalQueries } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('website_id', websiteId)
  
  return {
    sites: sitesCount || 0,
    queries: totalQueries || 0,
    queriesThisMonth: queriesThisMonth || 0
  }
}

export async function checkProjectLimits(websiteId: string): Promise<{
  allowed: boolean
  reason?: string
  limit?: number
  usage?: UsageStats
}> {
  const supabase = createServiceClient()
  
  // Get website subscription
  const { data: website } = await supabase
    .from('websites')
    .select('id, subscription_id')
    .eq('id', websiteId)
    .single()
    
  if (!website) {
    return { allowed: false, reason: 'website_not_found' }
  }
  
  // Get subscription details
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('website_id', websiteId)
    .single()
    
  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, reason: 'no_active_subscription' }
  }
  
  // Get current usage
  const usage = await getProjectUsage(websiteId)
  
  // Check limits
  const limitCheck = isWithinLimits(subscription.plan, usage)
  
  return {
    allowed: limitCheck.allowed,
    reason: limitCheck.reason,
    limit: limitCheck.limit,
    usage
  }
}

export async function incrementQueryUsage(websiteId: string): Promise<void> {
  const supabase = createServiceClient()
  
  // Increment usage count in subscription table
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('usage_count')
    .eq('website_id', websiteId)
    .single()
  
  if (subscription) {
    await supabase
      .from('subscriptions')
      .update({ 
        usage_count: (subscription.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('website_id', websiteId)
  }
}

export async function getUsageForBilling(websiteId: string): Promise<{
  currentUsage: UsageStats
  limits: ReturnType<typeof getPlanLimits>
  subscription: any
}> {
  const supabase = createServiceClient()
  
  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('website_id', websiteId)
    .single()
    
  if (!subscription) {
    throw new Error('No subscription found')
  }
  
  const currentUsage = await getProjectUsage(websiteId)
  const limits = getPlanLimits(subscription.plan)
  
  return {
    currentUsage,
    limits,
    subscription
  }
}
