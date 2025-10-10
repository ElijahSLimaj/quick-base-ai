import { createServiceClient } from '@/lib/supabase/service'

export interface AssignmentResult {
  assigneeId: string | null
  assignmentMethod: 'load_balancing' | 'round_robin' | 'manual' | 'none'
  openTicketsCount: number
  error?: string
}

export interface TeamMemberWorkload {
  userId: string
  email: string
  role: string
  openTicketsCount: number
  lastAssignedAt: string | null
  memberSince: string
}

/**
 * Auto-assigns a ticket to the most appropriate team member using load balancing + round-robin fallback
 */
export async function autoAssignTicket(
  organizationId: string,
  ticketId: string
): Promise<AssignmentResult> {
  try {
    console.log('=== AUTO ASSIGNMENT START ===')
    console.log('Organization ID:', organizationId)
    console.log('Ticket ID:', ticketId)
    console.log('Timestamp:', new Date().toISOString())

    const supabase = createServiceClient()

    // Check if auto-assignment is enabled for this organization
    const { data: trackingData } = await supabase
      .from('assignment_tracking')
      .select('is_auto_assignment_enabled')
      .eq('organization_id', organizationId)
      .single()

    if (!trackingData?.is_auto_assignment_enabled) {
      console.log('Auto-assignment disabled for organization')
      return {
        assigneeId: null,
        assignmentMethod: 'none',
        openTicketsCount: 0,
        error: 'Auto-assignment is disabled for this organization'
      }
    }

    // Get the next assignee using our database function
    const { data: assignmentData, error: assignmentError } = await supabase
      .rpc('get_next_assignee', { org_id: organizationId })

    if (assignmentError) {
      console.error('Error getting next assignee:', assignmentError)
      return {
        assigneeId: null,
        assignmentMethod: 'none',
        openTicketsCount: 0,
        error: 'Failed to determine next assignee'
      }
    }

    if (!assignmentData || assignmentData.length === 0) {
      console.log('No active team members found for assignment')
      return {
        assigneeId: null,
        assignmentMethod: 'none',
        openTicketsCount: 0,
        error: 'No active team members available for assignment'
      }
    }

    const assignee = assignmentData[0]
    console.log('=== ASSIGNMENT DECISION ===')
    console.log('Selected Assignee ID:', assignee.assignee_id)
    console.log('Assignment Method:', assignee.assignment_method)
    console.log('Open Tickets Count:', assignee.open_tickets_count)
    console.log('Last Assigned At:', assignee.last_assigned_at)
    console.log('Total Candidates:', assignmentData.length)

    // Update the ticket with the assignment
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        assigned_to: assignee.assignee_id,
        assigned_at: new Date().toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('Error updating ticket assignment:', updateError)
      return {
        assigneeId: null,
        assignmentMethod: 'none',
        openTicketsCount: 0,
        error: 'Failed to update ticket assignment'
      }
    }

    // Update assignment tracking
    const { error: trackingError } = await supabase.rpc('update_assignment_tracking', {
      org_id: organizationId,
      assigned_user_id: assignee.assignee_id,
      assignment_method: assignee.assignment_method
    })

    if (trackingError) {
      console.error('Warning: Failed to update assignment tracking:', trackingError.message)
      // Don't fail the assignment if tracking fails
    }

    console.log('=== AUTO ASSIGNMENT SUCCESS ===')
    console.log('Final Result:', {
      assigneeId: assignee.assignee_id,
      method: assignee.assignment_method,
      openTickets: assignee.open_tickets_count,
      trackingUpdated: !trackingError
    })
    
    return {
      assigneeId: assignee.assignee_id,
      assignmentMethod: assignee.assignment_method as 'load_balancing' | 'round_robin',
      openTicketsCount: assignee.open_tickets_count
    }

  } catch (error) {
    console.error('=== AUTO ASSIGNMENT ERROR ===')
    console.error('Auto-assignment error:', error)
    return {
      assigneeId: null,
      assignmentMethod: 'none',
      openTicketsCount: 0,
      error: `Auto-assignment failed: ${(error as any)?.message || 'Unknown error'}`
    }
  }
}

/**
 * Gets team member workload information for an organization
 */
export async function getTeamMemberWorkload(
  organizationId: string
): Promise<TeamMemberWorkload[]> {
  try {
    const supabase = createServiceClient()

    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        created_at,
        users:user_id(email),
        assignment_tracking!inner(last_assigned_at, last_assigned_user_id)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching team members:', error)
      throw error
    }

    // Get open tickets count for each team member
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('assigned_to')
      .eq('organization_id', organizationId)
      .in('status', ['open', 'in_progress', 'waiting_customer'])

    // Count tickets per team member
    const ticketCounts = (ticketsData || []).reduce((acc, ticket) => {
      if (ticket.assigned_to) {
        acc[ticket.assigned_to] = (acc[ticket.assigned_to] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return (teamMembers || []).map(member => ({
      userId: member.user_id,
      email: (member.users as any)?.email || 'Unknown',
      role: member.role,
      openTicketsCount: ticketCounts[member.user_id] || 0,
      lastAssignedAt: member.assignment_tracking?.last_assigned_at,
      memberSince: member.created_at
    }))

  } catch (error) {
    console.error('Error getting team member workload:', error)
    throw error
  }
}

/**
 * Gets assignment statistics for an organization
 */
export async function getAssignmentStats(organizationId: string) {
  try {
    const supabase = createServiceClient()

    const { data: trackingData, error } = await supabase
      .from('assignment_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching assignment stats:', error)
      throw error
    }

    return trackingData || {
      total_assignments: 0,
      load_balancing_assignments: 0,
      round_robin_fallback_assignments: 0,
      is_auto_assignment_enabled: true
    }

  } catch (error) {
    console.error('Error getting assignment stats:', error)
    throw error
  }
}

/**
 * Updates assignment configuration for an organization
 */
export async function updateAssignmentConfig(
  organizationId: string,
  config: {
    isAutoAssignmentEnabled?: boolean
    assignmentPreferences?: Record<string, any>
  }
) {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('assignment_tracking')
      .upsert({
        organization_id: organizationId,
        is_auto_assignment_enabled: config.isAutoAssignmentEnabled,
        assignment_preferences: config.assignmentPreferences,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error updating assignment config:', error)
      throw error
    }

    return { success: true }

  } catch (error) {
    console.error('Error updating assignment config:', error)
    throw error
  }
}
