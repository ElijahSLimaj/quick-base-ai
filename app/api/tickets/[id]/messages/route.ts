import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/email/resend'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id

    // Verify user has access to this ticket (enforced by RLS)
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get messages (RLS will filter based on user permissions)
    const { data: messages, error } = await supabase
      .from('ticket_messages')
      .select(`
        id,
        message,
        message_type,
        user_id,
        customer_email,
        customer_name,
        author_type,
        is_internal,
        is_first_response,
        created_at,
        updated_at,
        users:user_id(email, id)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at')

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })

  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id
    const {
      message,
      message_type = 'reply',
      is_internal = false,
      customer_email,
      customer_name
    } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify user has access to this ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Determine if this is a team member or customer message
    let messageData: any = {
      ticket_id: ticketId,
      message,
      message_type,
      is_internal
    }

    if (customer_email && customer_name) {
      // Customer message
      messageData.customer_email = customer_email
      messageData.customer_name = customer_name
      messageData.author_type = 'customer'
      messageData.is_internal = false // Customers can't send internal messages
    } else {
      // Team member message
      messageData.user_id = user.id
      messageData.author_type = 'team'
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from('ticket_messages')
      .insert(messageData)
      .select(`
        id,
        message,
        message_type,
        user_id,
        customer_email,
        customer_name,
        author_type,
        is_internal,
        is_first_response,
        created_at,
        users:user_id(email, id)
      `)
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Send email notification
    try {
      // Get ticket details with organization info
      const { data: ticketDetails } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          title,
          customer_email,
          customer_name,
          websites(name, organization_id),
          organizations(name)
        `)
        .eq('id', ticketId)
        .single()

      if (ticketDetails) {
        const isTeamMessage = messageData.author_type === 'team'
        const isInternalMessage = messageData.is_internal

        // If it's a team message, notify the customer (unless it's internal)
        if (isTeamMessage && !isInternalMessage && ticketDetails.customer_email) {
          await emailService.sendTicketResponseNotification({
            ticketNumber: ticketDetails.ticket_number,
            title: ticketDetails.title,
            message: message,
            senderName: newMessage.users?.email?.split('@')[0] || 'Support Team',
            senderType: 'team',
            organizationName: ticketDetails.organizations?.name || 'QuickBase AI',
            ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/tickets/${ticketId}`,
            isInternal: false
          }, ticketDetails.customer_email)
        }

        // If it's a customer message, notify the team
        if (!isTeamMessage && ticketDetails.websites?.organization_id) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('users(email)')
            .eq('organization_id', ticketDetails.websites.organization_id)
            .eq('status', 'active')
            .in('role', ['owner', 'admin'])

          if (teamMembers && teamMembers.length > 0) {
            const teamEmails = teamMembers
              .map(member => member.users?.email)
              .filter(Boolean) as string[]

            if (teamEmails.length > 0) {
              await emailService.sendTicketResponseNotification({
                ticketNumber: ticketDetails.ticket_number,
                title: ticketDetails.title,
                message: message,
                senderName: messageData.customer_name || 'Customer',
                senderType: 'customer',
                organizationName: ticketDetails.organizations?.name || 'QuickBase AI',
                ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/tickets/${ticketId}`,
                isInternal: false
              }, teamEmails[0]) // Send to first team member, can be enhanced to send to assigned member
            }
          }
        }

        console.log('Message notification sent', {
          ticketId,
          messageType: messageData.author_type,
          isInternal: isInternalMessage
        })
      }
    } catch (emailError) {
      console.error('Failed to send message notification:', emailError)
      // Don't fail the message creation if email fails
    }

    return NextResponse.json({ message: newMessage }, { status: 201 })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}