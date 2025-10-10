import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get ticket counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('tickets')
      .select('status')
      .eq('organization_id', organizationId)

    if (statusError) {
      console.error('Error fetching status counts:', statusError)
      return NextResponse.json({ error: 'Failed to fetch ticket stats' }, { status: 500 })
    }

    // Calculate stats
    const total = statusCounts?.length || 0
    const open = statusCounts?.filter(t => t.status === 'open').length || 0
    const in_progress = statusCounts?.filter(t => t.status === 'in_progress').length || 0
    const resolved = statusCounts?.filter(t => t.status === 'resolved').length || 0
    const closed = statusCounts?.filter(t => t.status === 'closed').length || 0

    // Get average response and resolution times
    const { data: responseTimes } = await supabase
      .from('tickets')
      .select('first_response_time_minutes, resolution_time_minutes')
      .eq('organization_id', organizationId)
      .not('first_response_time_minutes', 'is', null)

    const avgResponseTime = responseTimes && responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, t) => sum + (t.first_response_time_minutes || 0), 0) / responseTimes.length / 60) // Convert to hours
      : 0

    const resolvedTickets = responseTimes?.filter(t => t.resolution_time_minutes !== null) || []
    const avgResolutionTime = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((sum, t) => sum + (t.resolution_time_minutes || 0), 0) / resolvedTickets.length / 60) // Convert to hours
      : 0

    const stats = {
      total,
      open,
      in_progress,
      resolved,
      closed,
      avg_response_time: avgResponseTime,
      avg_resolution_time: avgResolutionTime
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Ticket stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}