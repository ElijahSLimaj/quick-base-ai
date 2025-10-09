import { type PlanKey } from './plans'

export type BillingPeriod = 'monthly' | 'yearly'

/**
 * Unified price ID mapping for all Stripe plans
 * Uses the correct environment variable names
 */
export function getPriceId(plan: PlanKey, billingPeriod: BillingPeriod = 'monthly'): string | null {
  // Trial doesn't use Stripe price IDs
  if (plan === 'trial' || plan === 'expired_trial') {
    return null
  }

  const priceIds = {
    starter: {
      monthly: process.env.STRIPE_STARTER_PRICE_ID,
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID
    },
    pro: {
      monthly: process.env.STRIPE_PRO_PRICE_ID,
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID
    },
    enterprise: {
      monthly: process.env.STRIPE_ENTERPRISE_PRICE_ID,
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID
    }
  } as const

  return priceIds[plan]?.[billingPeriod] || null
}

/**
 * Get plan and billing period from Stripe price ID
 * Used in webhook handlers to determine what plan was purchased
 */
export function getPlanFromPriceId(priceId?: string): { plan: PlanKey; billingPeriod: BillingPeriod } | null {
  const priceToPlan: Record<string, { plan: PlanKey; billingPeriod: BillingPeriod }> = {
    [process.env.STRIPE_STARTER_PRICE_ID!]: { plan: 'starter', billingPeriod: 'monthly' },
    [process.env.STRIPE_STARTER_YEARLY_PRICE_ID!]: { plan: 'starter', billingPeriod: 'yearly' },
    [process.env.STRIPE_PRO_PRICE_ID!]: { plan: 'pro', billingPeriod: 'monthly' },
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID!]: { plan: 'pro', billingPeriod: 'yearly' },
    [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: { plan: 'enterprise', billingPeriod: 'monthly' },
    [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!]: { plan: 'enterprise', billingPeriod: 'yearly' }
  }

  return priceToPlan[priceId || ''] || null
}

/**
 * Get all available price IDs for a plan
 */
export function getAllPriceIdsForPlan(plan: PlanKey): { monthly: string | null; yearly: string | null } {
  return {
    monthly: getPriceId(plan, 'monthly'),
    yearly: getPriceId(plan, 'yearly')
  }
}

/**
 * Validate that all required price IDs are configured
 */
export function validatePriceIds(): { valid: boolean; missing: string[] } {
  const required = [
    'STRIPE_STARTER_PRICE_ID',
    'STRIPE_STARTER_YEARLY_PRICE_ID',
    'STRIPE_PRO_PRICE_ID',
    'STRIPE_PRO_YEARLY_PRICE_ID',
    'STRIPE_ENTERPRISE_PRICE_ID',
    'STRIPE_ENTERPRISE_YEARLY_PRICE_ID'
  ]

  const missing = required.filter(envVar => !process.env[envVar])

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Get the additional seat price ID for enterprise plans
 * This is used for billing extra seats beyond the base 5
 */
export function getAdditionalSeatPriceId(billingPeriod: BillingPeriod = 'monthly'): string | null {
  const seatPriceIds = {
    monthly: process.env.STRIPE_ENTERPRISE_SEAT_PRICE_ID,
    yearly: process.env.STRIPE_ENTERPRISE_SEAT_YEARLY_PRICE_ID
  }

  return seatPriceIds[billingPeriod] || null
}

/**
 * Check if enterprise seat pricing is configured
 */
export function validateSeatPricing(): { valid: boolean; missing: string[] } {
  const required = [
    'STRIPE_ENTERPRISE_SEAT_PRICE_ID',
    'STRIPE_ENTERPRISE_SEAT_YEARLY_PRICE_ID'
  ]

  const missing = required.filter(envVar => !process.env[envVar])

  return {
    valid: missing.length === 0,
    missing
  }
}
