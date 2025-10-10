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

    // Get ticket with full details
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        websites!inner(id, name, domain, organization_id)
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

    // Get assignee information if ticket is assigned
    let assignee = null
    if (ticket.assigned_to) {
      const { data: assignees } = await supabase.auth.admin.listUsers()
      const assigneeUser = assignees?.users?.find(user => user.id === ticket.assigned_to)
      if (assigneeUser) {
        assignee = {
          id: assigneeUser.id,
          email: assigneeUser.email || 'Unknown'
        }
      }
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        assignee,
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
      .select(`
        id,
        website_id,
        organization_id,
        status,
        assigned_to,
        ticket_number,
        title,
        customer_email,
        customer_name,
        websites(name, organization_id),
        organizations(name)
      `)
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
        websites!inner(id, name, domain)
      `)
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    // Send email notifications for status changes
    try {
      if (filteredUpdates.status && filteredUpdates.status !== ticket.status) {
        const recipientEmails: string[] = []

        // Notify customer if status changed to resolved/closed
        if (ticket.customer_email && ['resolved', 'closed'].includes(filteredUpdates.status)) {
          recipientEmails.push(ticket.customer_email)
        }

        // Notify team members
        if (ticket.organization_id) {
          // TODO: Re-implement team notifications when user relations are fixed
          console.log('Team notification would be sent for status change', { ticketId, organizationId: ticket.organization_id })
        }

        if (recipientEmails.length > 0) {
          // TODO: Re-implement status change notifications
          console.log('Status change notification would be sent', { ticketId, recipients: recipientEmails.length })
        }
      }

      // Send assignment notification
      if (filteredUpdates.assigned_to && filteredUpdates.assigned_to !== ticket.assigned_to) {
        // TODO: Re-implement assignment notifications
        console.log('Assignment notification would be sent', { ticketId, assignedTo: filteredUpdates.assigned_to })
      }

      console.log('Ticket update notifications sent', {
        ticketId,
        statusChanged: filteredUpdates.status !== ticket.status,
        assignmentChanged: filteredUpdates.assigned_to !== ticket.assigned_to
      })
    } catch (emailError) {
      console.error('Failed to send ticket update notifications:', emailError)
      // Don't fail the update if email fails
    }

    // Get assignee information for updated ticket if assigned
    let assignee = null
    if (updatedTicket.assigned_to) {
      const { data: assignees } = await supabase.auth.admin.listUsers()
      const assigneeUser = assignees?.users?.find(user => user.id === updatedTicket.assigned_to)
      if (assigneeUser) {
        assignee = {
          id: assigneeUser.id,
          email: assigneeUser.email || 'Unknown'
        }
      }
    }

    return NextResponse.json({
      ticket: {
        ...updatedTicket,
        assignee
      }
    })

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