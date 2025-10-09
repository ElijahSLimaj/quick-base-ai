import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // TODO: Send email notification here
    // await sendMessageNotification(newMessage, ticket)

    return NextResponse.json({ message: newMessage }, { status: 201 })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}