import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { subscriptionService } from '@/lib/billing/subscription'
import { createClient } from '@/lib/supabase/server'
import { type PlanKey } from '@/lib/billing/plans'
import { getPlanFromPriceId } from '@/lib/billing/price-ids'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  const planInfo = getPlanFromPriceId(priceId)
  
  if (!planInfo) {
    console.error('Unknown price ID in subscription:', priceId)
    return
  }

  const supabase = await createClient()

  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!website) {
    console.error('Website not found for customer:', customerId)
    return
  }

  await subscriptionService.createSubscription({
    websiteId: website.id,
    plan: planInfo.plan,
    stripeSubscriptionId: subscription.id,
    status: subscription.status
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id
  const planInfo = getPlanFromPriceId(priceId)
  
  if (!planInfo) {
    console.error('Unknown price ID in subscription update:', priceId)
    return
  }

  await subscriptionService.updateSubscription(subscription.id, {
    plan: planInfo.plan,
    status: subscription.status
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await subscriptionService.updateSubscription(subscription.id, {
    status: 'canceled'
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Access subscription ID from invoice metadata or use type assertion
  const subscriptionId = (invoice as any).subscription as string
  if (subscriptionId) {
    await subscriptionService.updateSubscription(subscriptionId, {
      status: 'active'
    })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Access subscription ID from invoice metadata or use type assertion
  const subscriptionId = (invoice as any).subscription as string
  if (subscriptionId) {
    await subscriptionService.updateSubscription(subscriptionId, {
      status: 'past_due'
    })
  }
}

// Removed - now using unified getPlanFromPriceId from price-ids.ts