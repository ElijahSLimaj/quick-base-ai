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

    // Get ticket with full details
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        websites!inner(id, name, domain, organization_id),
        assigned_user:assigned_to(email, id)
      `)
      .eq('id', ticketId)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get ticket messages
    const { data: messages } = await supabase
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
        users:user_id(email, id)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at')

    // Get ticket attachments
    const { data: attachments } = await supabase
      .from('ticket_attachments')
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        uploaded_by,
        is_internal,
        created_at,
        users:uploaded_by(email, id)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at')

    return NextResponse.json({
      ticket: {
        ...ticket,
        messages: messages || [],
        attachments: attachments || []
      }
    })

  } catch (error) {
    console.error('Ticket fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const updates = await request.json()

    // Get current ticket to verify access
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, website_id, organization_id, status, assigned_to')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Verify user has permission to update this ticket
    // This will be enforced by RLS, but we can add explicit checks here if needed

    // Filter allowed fields for updates
    const allowedFields = [
      'status',
      'priority',
      'category',
      'assigned_to',
      'resolution',
      'customer_satisfaction_rating',
      'customer_satisfaction_feedback'
    ]

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Create system message for status changes
    if (filteredUpdates.status && filteredUpdates.status !== ticket.status) {
      const statusMessage = `Status changed from ${ticket.status} to ${filteredUpdates.status}`

      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          message: statusMessage,
          message_type: 'status_change',
          author_type: 'system'
        })
    }

    // Create system message for assignment changes
    if (filteredUpdates.assigned_to && filteredUpdates.assigned_to !== ticket.assigned_to) {
      let assignmentMessage = ''
      if (filteredUpdates.assigned_to) {
        assignmentMessage = 'Ticket assigned to team member'
      } else {
        assignmentMessage = 'Ticket unassigned'
      }

      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          message: assignmentMessage,
          message_type: 'assignment',
          author_type: 'system'
        })
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(filteredUpdates)
      .eq('id', ticketId)
      .select(`
        *,
        websites!inner(id, name, domain),
        assigned_user:assigned_to(email, id)
      `)
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    return NextResponse.json({ ticket: updatedTicket })

  } catch (error) {
    console.error('Ticket update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Verify ticket exists and user has permission (enforced by RLS)
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, ticket_number')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Delete ticket (cascades to messages and attachments)
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId)

    if (error) {
      console.error('Error deleting ticket:', error)
      return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Ticket ${ticket.ticket_number} deleted successfully`
    })

  } catch (error) {
    console.error('Ticket deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}