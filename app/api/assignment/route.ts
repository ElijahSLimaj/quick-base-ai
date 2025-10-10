import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { 
  getTeamMemberWorkload, 
  getAssignmentStats, 
  updateAssignmentConfig,
  autoAssignTicket 
} from '@/lib/assignment/assignment-engine'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const action = searchParams.get('action')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify user has access to this organization
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('role, permissions')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!userMembership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (action === 'workload') {
      // Get team member workload information
      const workload = await getTeamMemberWorkload(organizationId)
      return NextResponse.json({ workload })
    }

    if (action === 'stats') {
      // Get assignment statistics
      const stats = await getAssignmentStats(organizationId)
      return NextResponse.json({ stats })
    }

    if (action === 'config') {
      // Get assignment configuration
      const stats = await getAssignmentStats(organizationId)
      const config = {
        autoAssignmentEnabled: (stats as any)?.is_auto_assignment_enabled ?? true,
        primaryMethod: 'load_balancing' as const,
        fallbackMethod: 'round_robin' as const,
        considerAvailability: false,
        maxTicketsPerMember: null,
        assignmentTimeout: 5
      }
      return NextResponse.json({ config })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Assignment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, action, ticketId, config } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify user has admin/owner access to this organization
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('role, permissions')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (action === 'auto-assign' && ticketId) {
      // Manually trigger auto-assignment for a specific ticket
      const result = await autoAssignTicket(organizationId, ticketId)
      return NextResponse.json({ 
        success: !!result.assigneeId,
        assignment: result
      })
    }

    if (action === 'update-config') {
      // Update assignment configuration
      await updateAssignmentConfig(organizationId, {
        isAutoAssignmentEnabled: config.autoAssignmentEnabled,
        assignmentPreferences: {
          primaryMethod: config.primaryMethod,
          fallbackMethod: config.fallbackMethod,
          considerAvailability: config.considerAvailability,
          maxTicketsPerMember: config.maxTicketsPerMember,
          assignmentTimeout: config.assignmentTimeout
        }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'test-assignment') {
      // Create a test ticket and assign it
      const supabase = createServiceClient()
      
      // Get a website for this organization to use in test ticket
      const { data: website } = await supabase
        .from('websites')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1)
        .single()

      if (!website) {
        return NextResponse.json({ 
          success: false, 
          error: 'No website found for organization' 
        }, { status: 400 })
      }

      // Create a test ticket
      const { data: testTicket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          website_id: website.id,
          title: 'Test Assignment Ticket',
          description: 'This is a test ticket created to verify auto-assignment functionality.',
          priority: 'medium',
          status: 'open',
          customer_email: 'test@example.com',
          customer_name: 'Test Customer',
          ticket_number: `TEST-${Date.now()}`
        })
        .select('id')
        .single()

      if (ticketError || !testTicket) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create test ticket' 
        }, { status: 500 })
      }

      // Auto-assign the test ticket
      const assignmentResult = await autoAssignTicket(organizationId, testTicket.id)
      
      return NextResponse.json({ 
        success: !!assignmentResult.assigneeId,
        assignment: assignmentResult,
        testTicketId: testTicket.id
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Assignment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
