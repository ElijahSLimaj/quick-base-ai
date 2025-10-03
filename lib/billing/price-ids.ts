import { type PlanKey } from './plans'

export type BillingPeriod = 'monthly' | 'yearly'

/**
 * Unified price ID mapping for all Stripe plans
 * Uses the correct environment variable names
 */
export function getPriceId(plan: PlanKey, billingPeriod: BillingPeriod = 'monthly'): string | null {
  // Trial and enterprise don't use Stripe price IDs
  if (plan === 'trial' || plan === 'expired_trial' || plan === 'enterprise') {
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
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID!]: { plan: 'pro', billingPeriod: 'yearly' }
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
    'STRIPE_PRO_YEARLY_PRICE_ID'
  ]

  const missing = required.filter(envVar => !process.env[envVar])
  
  return {
    valid: missing.length === 0,
    missing
  }
}
