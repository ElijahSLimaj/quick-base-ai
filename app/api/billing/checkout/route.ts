import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { type PlanKey } from '@/lib/billing/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan, websiteId } = await request.json()

    if (!plan || !websiteId) {
      return NextResponse.json(
        { error: 'Plan and website ID are required' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const { data: website } = await supabase
      .from('websites')
      .select('stripe_customer_id, owner_id')
      .eq('id', websiteId)
      .eq('owner_id', user.id)
      .single()

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      )
    }

    let customerId = website.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          website_id: websiteId
        }
      })

      customerId = customer.id

      // Update website with customer ID
      await supabase
        .from('websites')
        .update({ stripe_customer_id: customerId })
        .eq('id', websiteId)
    }

    // Get price ID for the plan
    const priceId = getPriceId(plan as PlanKey)

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
      metadata: {
        user_id: user.id,
        website_id: websiteId,
        plan
      }
    })

    return NextResponse.json({
      checkout_url: session.url
    })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

function getPriceId(plan: PlanKey): string | null {
  const priceIds = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
    enterprise: null // Enterprise uses custom pricing, not Stripe
  }

  return priceIds[plan] || null
}