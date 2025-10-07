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
  const startTime = Date.now()
  let eventId = 'unknown'
  
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    console.log('=== STRIPE WEBHOOK RECEIVED ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Body length:', body.length)

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    eventId = event.id

    console.log('Event details:', {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode
    })

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

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    const processingTime = Date.now() - startTime
    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===')
    console.log('Event ID:', eventId)
    console.log('Processing time:', `${processingTime}ms`)
    
    return NextResponse.json({ 
      received: true, 
      eventId,
      processingTime: `${processingTime}ms`
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    
    console.error('=== STRIPE WEBHOOK ERROR ===')
    console.error('Event ID:', eventId)
    console.error('Processing time:', `${processingTime}ms`)
    console.error('Error details:', error)
    
    // Log specific error types for better debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Return appropriate status codes based on error type
    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json(
        { error: 'Invalid signature', eventId },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Webhook handler failed', eventId, processingTime: `${processingTime}ms` },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log('Handling subscription created:', subscription.id)
    
    const customerId = subscription.customer as string
    const priceId = subscription.items.data[0]?.price.id
    const planInfo = getPlanFromPriceId(priceId)
    
    if (!planInfo) {
      console.error('Unknown price ID in subscription:', priceId)
      throw new Error(`Unknown price ID: ${priceId}`)
    }

    const supabase = await createClient()

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (websiteError) {
      console.error('Database error finding website:', websiteError)
      throw new Error(`Database error: ${websiteError.message}`)
    }

    if (!website) {
      console.error('Website not found for customer:', customerId)
      throw new Error(`Website not found for customer: ${customerId}`)
    }

    await subscriptionService.createSubscription({
      websiteId: website.id,
      plan: planInfo.plan,
      stripeSubscriptionId: subscription.id,
      status: subscription.status
    })
    
    console.log('Subscription created successfully for website:', website.id)
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error)
    throw error // Re-throw to be caught by main handler
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Handling subscription updated:', subscription.id)
    
    const priceId = subscription.items.data[0]?.price.id
    const planInfo = getPlanFromPriceId(priceId)
    
    if (!planInfo) {
      console.error('Unknown price ID in subscription update:', priceId)
      throw new Error(`Unknown price ID in update: ${priceId}`)
    }

    await subscriptionService.updateSubscription(subscription.id, {
      plan: planInfo.plan,
      status: subscription.status
    })
    
    console.log('Subscription updated successfully:', subscription.id)
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('Handling subscription deleted:', subscription.id)
    
    await subscriptionService.updateSubscription(subscription.id, {
      status: 'canceled'
    })
    
    console.log('Subscription canceled successfully:', subscription.id)
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
    throw error
  }
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

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial will end for subscription:', subscription.id)
  
  // You can send email notifications here
  // or update user status to show trial ending soon
  const customerId = subscription.customer as string
  
  const supabase = await createClient()
  const { data: website } = await supabase
    .from('websites')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (website) {
    console.log(`Trial ending soon for website: ${website.name}`)
    // TODO: Send email notification to user
    // TODO: Update UI to show trial ending banner
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)
  
  if (session.mode === 'subscription' && session.subscription) {
    // The subscription will be handled by customer.subscription.created
    // This is just for logging and any additional checkout-specific logic
    console.log('Subscription checkout completed:', session.subscription)
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('New customer created:', customer.id)
  
  // You can store additional customer metadata here
  // or trigger welcome email sequences
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  console.log('Invoice created:', invoice.id)
  
  // You can add logic here to:
  // - Send invoice preview emails
  // - Update billing records
  // - Handle proration logic
}