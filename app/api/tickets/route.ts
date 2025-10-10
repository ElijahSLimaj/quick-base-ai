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
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assigned_to')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query with enhanced selection for dashboard
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
        websites!inner(id, name, domain, organization_id),
        ticket_messages(id, is_internal, created_at, user_id, customer_email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by organization if specified (for organization dashboard)
    if (organizationId) {
      // Verify user has access to this organization
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      query = query.eq('organization_id', organizationId)
    }

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

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`)
    }

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    // Get assignee information for tickets that have assigned_to
    const assignedTickets = tickets?.filter(ticket => ticket.assigned_to) || []
    const assigneeIds = [...new Set(assignedTickets.map(ticket => ticket.assigned_to))]

    let assigneeMap: Record<string, { id: string; email: string }> = {}

    if (assigneeIds.length > 0) {
      // Get assignee details from auth.users through a separate query
      const { data: assignees } = await supabase.auth.admin.listUsers()

      if (assignees?.users) {
        assigneeMap = assignees.users
          .filter(authUser => assigneeIds.includes(authUser.id))
          .reduce((acc, authUser) => {
            acc[authUser.id] = {
              id: authUser.id,
              email: authUser.email || 'Unknown'
            }
            return acc
          }, {} as Record<string, { id: string; email: string }>)
      }
    }

    // Transform tickets to include computed fields for dashboard
    const enrichedTickets = tickets?.map(ticket => ({
      ...ticket,
      message_count: ticket.ticket_messages?.length || 0,
      has_unread_messages: ticket.ticket_messages?.some(msg =>
        msg.user_id !== user.id &&
        new Date(msg.created_at || new Date()) > new Date(ticket.updated_at || ticket.created_at || new Date())
      ) || false,
      assignee: ticket.assigned_to ? assigneeMap[ticket.assigned_to] || null : null,
      website: ticket.websites ? {
        id: ticket.websites.id,
        name: ticket.websites.name
      } : null
    })) || []

    return NextResponse.json({
      tickets: enrichedTickets,
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
    if (!hasTicketingFeature(website.plan_name || 'trial')) {
      return NextResponse.json({
        error: 'Ticketing is only available on Enterprise plans',
        upgradeRequired: true,
        currentPlan: website.plan_name
      }, { status: 403 })
    }

    // Generate unique ticket number
    const ticketNumber = `T-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        website_id,
        organization_id: website.organization_id,
        ticket_number: ticketNumber,
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