import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasTicketingFeature } from '@/lib/billing/plans'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')

  console.log('=== ESCALATION API START ===')
  console.log('Request origin:', origin)

  try {
    const body = await request.json()
    const {
      websiteId,
      originalQuery,
      aiResponse,
      aiConfidence,
      escalationReason = 'user_request',
      customerEmail,
      customerName,
      customerMessage
    } = body

    console.log('Escalation API: Received request', {
      websiteId,
      escalationReason,
      customerEmail: customerEmail ? 'provided' : 'not provided',
      aiConfidence
    })

    if (!websiteId || !originalQuery) {
      return NextResponse.json({
        error: 'Website ID and original query are required'
      }, { status: 400 })
    }

    // Use service client to bypass RLS for widget operations
    const supabase = createServiceClient()

    // Verify website exists and supports ticketing
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, name, plan_name, organization_id')
      .eq('id', websiteId)
      .single()

    if (websiteError || !website) {
      console.error('Escalation API: Website not found', { websiteId, error: websiteError })
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Check if website plan supports ticketing
    const websitePlan = website.plan_name || 'trial'
    if (!hasTicketingFeature(websitePlan)) {
      console.log('Escalation API: Plan does not support ticketing', { websitePlan })
      return NextResponse.json({
        error: 'Human escalation is only available on Enterprise plans',
        upgradeRequired: true,
        currentPlan: websitePlan,
        upgradeMessage: 'Upgrade to Enterprise for $99/month to get instant access to human experts when AI can\'t help.'
      }, { status: 403 })
    }

    // Generate ticket title from original query
    const ticketTitle = originalQuery.length > 100
      ? originalQuery.substring(0, 97) + '...'
      : originalQuery

    // Create comprehensive ticket description
    let ticketDescription = `**Customer Question:**\n${originalQuery}\n\n`

    if (aiResponse) {
      ticketDescription += `**AI Response:**\n${aiResponse}\n\n`
    }

    if (aiConfidence !== undefined) {
      ticketDescription += `**AI Confidence:** ${(aiConfidence * 100).toFixed(1)}%\n\n`
    }

    ticketDescription += `**Escalation Reason:** ${escalationReason}\n\n`

    if (customerMessage) {
      ticketDescription += `**Additional Message:**\n${customerMessage}\n\n`
    }

    // Determine priority based on confidence
    let priority = 'medium'
    if (aiConfidence !== undefined) {
      if (aiConfidence < 0.3) priority = 'high'
      else if (aiConfidence < 0.5) priority = 'medium'
      else priority = 'low'
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        website_id: websiteId,
        organization_id: website.organization_id,
        title: ticketTitle,
        description: ticketDescription,
        priority,
        category: 'general',
        customer_email: customerEmail,
        customer_name: customerName,
        original_query: originalQuery,
        ai_response: aiResponse,
        ai_confidence: aiConfidence,
        escalation_reason: escalationReason
      })
      .select('id, ticket_number, title, status, priority, created_at')
      .single()

    if (ticketError) {
      console.error('Escalation API: Error creating ticket:', ticketError)
      return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 })
    }

    console.log('Escalation API: Ticket created successfully', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number
    })

    // Create initial customer message if provided
    if (customerMessage) {
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          message: customerMessage,
          customer_email: customerEmail,
          customer_name: customerName,
          author_type: 'customer'
        })
    }

    // TODO: Send notification email to team
    // await sendTicketNotification(ticket, website)

    const response = NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        number: ticket.ticket_number,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at
      },
      message: `Support ticket ${ticket.ticket_number} has been created. Our team will respond soon.`
    }, { status: 201 })

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error) {
    console.error('=== ESCALATION API ERROR ===')
    console.error('Error:', error)

    const errorResponse = NextResponse.json({
      error: 'Internal server error',
      debug: {
        message: (error as any)?.message,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })

    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', origin || '*')
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return errorResponse
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}