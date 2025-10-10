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
    price: { monthly: 9900, yearly: 95040 }, // $99/month, $950.40/year (20% off)
    interval: 'month' as const,
    features: {
      sites: -1, // unlimited
      queries: -1, // unlimited
      analytics: 'enterprise' as const,
      support: 'dedicated' as const,
      ticketing: true, // Human escalation enabled
      seats: 5, // Base 5 seats included
      additionalSeatPrice: 499 // $4.99 per additional seat
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
    analyticsLevel: 'basic' as const,
    baseSeats: 1,
    maxSeats: 1
  },
  starter: {
    maxSites: 1,
    maxQueriesPerMonth: 2000,
    analyticsLevel: 'basic' as const,
    baseSeats: 1,
    maxSeats: 1
  },
  pro: {
    maxSites: 3,
    maxQueriesPerMonth: 10000,
    analyticsLevel: 'advanced' as const,
    baseSeats: 1,
    maxSeats: 1
  },
  enterprise: {
    maxSites: -1, // unlimited
    maxQueriesPerMonth: -1, // unlimited
    analyticsLevel: 'enterprise' as const,
    hasTicketing: true,
    baseSeats: 5,
    maxSeats: 100 // Reasonable upper limit
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

// Ticketing feature functions
export function hasTicketingFeature(plan: string): boolean {
  const limits = getPlanLimits(plan)
  return 'hasTicketing' in limits && limits.hasTicketing === true
}

export function canEscalateToHuman(plan: string): boolean {
  return hasTicketingFeature(plan)
}

export function getSeatLimits(plan: string) {
  const limits = getPlanLimits(plan)

  if (plan === 'enterprise') {
    return {
      baseSeats: limits.baseSeats || 5,
      maxSeats: limits.maxSeats || 100,
      additionalSeatPrice: PLANS.enterprise.features.additionalSeatPrice || 499
    }
  }

  return {
    baseSeats: 1,
    maxSeats: 1,
    additionalSeatPrice: 0
  }
}

export function calculateSeatCost(plan: string, totalSeats: number): number {
  if (plan !== 'enterprise') return 0

  const seatLimits = getSeatLimits(plan)
  const additionalSeats = Math.max(0, totalSeats - seatLimits.baseSeats)

  return additionalSeats * seatLimits.additionalSeatPrice
}

export function getTicketingUpgradeMessage(plan: string) {
  if (hasTicketingFeature(plan)) return null

  return {
    title: 'Upgrade for Human Support',
    message: 'Get instant access to human experts when AI can\'t help. Upgrade to Enterprise for $99/month.',
    action: 'upgrade_for_ticketing',
    targetPlan: 'enterprise'
  }
}
