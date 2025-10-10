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
        updated_at
      `)
      .eq('ticket_id', ticketId)
      .order('created_at')

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get user information for team messages
    const teamMessages = messages?.filter(msg => msg.user_id) || []
    const userIds = [...new Set(teamMessages.map(msg => msg.user_id))]

    let userMap: Record<string, { id: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers()
      if (users?.users) {
        userMap = users.users
          .filter(authUser => userIds.includes(authUser.id))
          .reduce((acc, authUser) => {
            acc[authUser.id] = {
              id: authUser.id,
              email: authUser.email || 'Unknown'
            }
            return acc
          }, {} as Record<string, { id: string; email: string }>)
      }
    }

    // Enrich messages with user information
    const enrichedMessages = messages?.map((message: any) => ({
      ...message,
      users: message.user_id ? userMap[message.user_id] || null : null
    })) || []

    return NextResponse.json({ messages: enrichedMessages })

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
        created_at
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
          // TODO: Re-implement email notifications
          console.log('Customer notification would be sent', { ticketId, customerEmail: ticketDetails.customer_email })
        }

        // If it's a customer message, notify the team
        if (!isTeamMessage && ticketDetails.websites?.organization_id) {
          // TODO: Re-implement team notifications when user relations are fixed
          console.log('Team notification would be sent', { ticketId, organizationId: ticketDetails.websites.organization_id })
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

    // Enrich new message with user information if it's a team message
    let enrichedMessage: any = newMessage
    if (newMessage.user_id) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const messageUser = users?.users?.find(authUser => authUser.id === newMessage.user_id)
      if (messageUser) {
        enrichedMessage = {
          ...newMessage,
          users: {
            id: messageUser.id,
            email: messageUser.email || 'Unknown'
          }
        }
      }
    }

    return NextResponse.json({ message: enrichedMessage }, { status: 201 })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}