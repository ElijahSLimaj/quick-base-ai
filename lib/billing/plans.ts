// Subscription plan definitions
export const PLANS = {
  trial: {
    name: 'Free Trial',
    price: { monthly: 0, yearly: 0 },
    interval: 'month' as const,
    features: {
      sites: 1,
      queries: 100,
      analytics: 'basic' as const,
      support: 'email' as const
    }
  },
  starter: {
    name: 'Starter',
    price: { monthly: 1900, yearly: 15200 }, // $19/month, $152/year (20% off)
    interval: 'month' as const,
    features: {
      sites: 1,
      queries: 2000,
      analytics: 'basic' as const,
      support: 'email' as const
    }
  },
  pro: {
    name: 'Pro',
    price: { monthly: 4900, yearly: 39200 }, // $49/month, $392/year (20% off)
    interval: 'month' as const,
    features: {
      sites: 3,
      queries: 10000,
      analytics: 'advanced' as const,
      support: 'priority' as const
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    interval: 'month' as const,
    features: {
      sites: -1, // unlimited
      queries: -1, // unlimited
      analytics: 'enterprise' as const,
      support: 'dedicated' as const
    }
  }
} as const

export type PlanKey = keyof typeof PLANS | 'expired_trial'
export type Plan = typeof PLANS[keyof typeof PLANS]

// Plan limits for enforcement
export const PLAN_LIMITS = {
  trial: {
    maxSites: 1,
    maxQueriesPerMonth: 100,
    analyticsLevel: 'basic' as const
  },
  starter: {
    maxSites: 1,
    maxQueriesPerMonth: 2000,
    analyticsLevel: 'basic' as const
  },
  pro: {
    maxSites: 3,
    maxQueriesPerMonth: 10000,
    analyticsLevel: 'advanced' as const
  },
  enterprise: {
    maxSites: -1, // unlimited
    maxQueriesPerMonth: -1, // unlimited
    analyticsLevel: 'enterprise' as const
  }
} as const

export function getPlanLimits(plan: string) {
  if (plan === 'expired_trial') return PLAN_LIMITS.trial
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.trial
}

export function isWithinLimits(plan: string, currentUsage: { sites: number; queries: number }) {
  const limits = getPlanLimits(plan)
  
  // Check site limits
  if (limits.maxSites !== -1 && currentUsage.sites > limits.maxSites) {
    return { allowed: false, reason: 'site_limit_exceeded', limit: limits.maxSites }
  }
  
  // Check query limits
  if (limits.maxQueriesPerMonth !== -1 && currentUsage.queries > limits.maxQueriesPerMonth) {
    return { allowed: false, reason: 'query_limit_exceeded', limit: limits.maxQueriesPerMonth }
  }
  
  return { allowed: true }
}

export function getUpgradeMessage(plan: string, currentUsage: { sites: number; queries: number }) {
  const limits = getPlanLimits(plan)
  
  if (limits.maxSites !== -1 && currentUsage.sites > limits.maxSites) {
    return {
      title: 'Site Limit Reached',
      message: `You've reached the limit of ${limits.maxSites} site(s) for your current plan. Upgrade to add more sites.`,
      action: 'upgrade_sites'
    }
  }
  
  if (limits.maxQueriesPerMonth !== -1 && currentUsage.queries > limits.maxQueriesPerMonth) {
    return {
      title: 'Query Limit Reached', 
      message: `You've used ${currentUsage.queries} queries this month, but your plan allows ${limits.maxQueriesPerMonth}. Upgrade for more queries.`,
      action: 'upgrade_queries'
    }
  }
  
  return null
}
