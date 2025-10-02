// Subscription plan definitions
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 1900, // $19.00 in cents
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
    price: 4900, // $49.00 in cents
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

export type PlanKey = keyof typeof PLANS
export type Plan = typeof PLANS[PlanKey]

// Plan limits for enforcement
export const PLAN_LIMITS = {
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
  return PLAN_LIMITS[plan as PlanKey] || PLAN_LIMITS.starter
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
