import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasTicketingFeature } from '@/lib/billing/plans'
import { emailService } from '@/lib/email/resend'
import { autoAssignTicket } from '@/lib/assignment/assignment-engine'

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

    // Generate unique ticket number
    const ticketNumber = `T-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        website_id: websiteId,
        organization_id: website.organization_id,
        ticket_number: ticketNumber,
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

    // Auto-assign ticket using load balancing + round-robin fallback
    let assignmentResult = null
    try {
      console.log('Escalation API: Attempting auto-assignment...')
      assignmentResult = await autoAssignTicket(website.organization_id, ticket.id)
      
      if (assignmentResult.assigneeId) {
        console.log('Escalation API: Auto-assignment successful', {
          assigneeId: assignmentResult.assigneeId,
          method: assignmentResult.assignmentMethod,
          openTickets: assignmentResult.openTicketsCount
        })
      } else {
        console.log('Escalation API: Auto-assignment failed or disabled', {
          error: assignmentResult.error
        })
      }
    } catch (assignmentError) {
      console.error('Escalation API: Auto-assignment error:', assignmentError)
      // Don't fail the entire escalation if assignment fails
    }

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

    // Send notification email to team
    try {
      // Get team members with ticket management permissions
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('organization_id', website.organization_id!)
        .eq('status', 'active')
        .in('role', ['owner', 'admin'])

      if (teamMembers && teamMembers.length > 0) {
        // Get user emails from auth schema
        const userIds = teamMembers.map(member => member.user_id)
        const { data: users } = await supabase.auth.admin.listUsers()

        if (users?.users) {
          const teamEmails = users.users
            .filter(user => userIds.includes(user.id))
            .map(user => user.email)
            .filter(Boolean) as string[]

          if (teamEmails.length > 0) {
            await emailService.sendNewTicketNotification({
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              description: ticketDescription,
              customerName: customerName,
              customerEmail: customerEmail,
              organizationName: website.name,
              status: ticket.status,
              priority: ticket.priority,
              createdAt: ticket.created_at || new Date().toISOString(),
              ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/tickets/${ticket.id}`
            }, teamEmails)

            console.log('Escalation API: Notification email sent to team', { teamEmails: teamEmails.length })
          }
        }
      }
    } catch (emailError) {
      console.error('Escalation API: Failed to send notification email:', emailError)
      // Don't fail the ticket creation if email fails
    }

    const response = NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        number: ticket.ticket_number,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at,
        assignedTo: assignmentResult?.assigneeId || null,
        assignmentMethod: assignmentResult?.assignmentMethod || 'none'
      },
      assignment: assignmentResult ? {
        assigned: !!assignmentResult.assigneeId,
        method: assignmentResult.assignmentMethod,
        openTicketsCount: assignmentResult.openTicketsCount,
        error: assignmentResult.error
      } : null,
      message: assignmentResult?.assigneeId 
        ? `Support ticket ${ticket.ticket_number} has been created and assigned to our team. You'll receive a response soon.`
        : `Support ticket ${ticket.ticket_number} has been created. Our team will respond soon.`
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