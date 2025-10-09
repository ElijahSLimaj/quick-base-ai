import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasTicketingFeature } from '@/lib/billing/plans'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const websiteId = searchParams.get('website_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assigned_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('tickets')
      .select(`
        id,
        website_id,
        organization_id,
        ticket_number,
        title,
        description,
        status,
        priority,
        category,
        assigned_to,
        customer_email,
        customer_name,
        escalation_reason,
        ai_confidence,
        resolution_time_minutes,
        first_response_time_minutes,
        customer_satisfaction_rating,
        sla_breach,
        created_at,
        updated_at,
        resolved_at,
        closed_at,
        websites!inner(id, name, domain, organization_id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by website if specified
    if (websiteId) {
      query = query.eq('website_id', websiteId)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority)
    }

    // Filter by assigned user
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Tickets fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      website_id,
      title,
      description,
      priority = 'medium',
      category = 'general',
      customer_email,
      customer_name,
      original_query,
      ai_response,
      ai_confidence,
      escalation_reason
    } = await request.json()

    if (!website_id || !title || !description) {
      return NextResponse.json({
        error: 'Website ID, title, and description are required'
      }, { status: 400 })
    }

    // Verify user has access to this website and it supports ticketing
    const { data: website } = await supabase
      .from('websites')
      .select('id, name, organization_id, plan_name')
      .eq('id', website_id)
      .single()

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Check if website plan supports ticketing
    if (!hasTicketingFeature(website.plan_name)) {
      return NextResponse.json({
        error: 'Ticketing is only available on Enterprise plans',
        upgradeRequired: true,
        currentPlan: website.plan_name
      }, { status: 403 })
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        website_id,
        title,
        description,
        priority,
        category,
        customer_email,
        customer_name,
        customer_user_id: user.id, // If creating ticket as logged-in user
        original_query,
        ai_response,
        ai_confidence,
        escalation_reason
      })
      .select(`
        id,
        ticket_number,
        title,
        description,
        status,
        priority,
        category,
        customer_email,
        customer_name,
        escalation_reason,
        ai_confidence,
        created_at,
        websites!inner(id, name, domain)
      `)
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    return NextResponse.json({ ticket }, { status: 201 })

  } catch (error) {
    console.error('Ticket creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}