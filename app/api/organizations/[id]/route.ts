import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasTicketingFeature, getSeatLimits } from '@/lib/billing/plans'

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

    const orgId = params.id

    // Get organization with user's team member info
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        *,
        team_members!inner(
          id,
          role,
          permissions,
          status,
          joined_at
        )
      `)
      .eq('id', orgId)
      .eq('team_members.user_id', user.id)
      .eq('team_members.status', 'active')
      .single()

    if (error || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get all team members (if user has permission)
    const userPermissions = organization.team_members[0]?.permissions
    const canViewTeam = userPermissions?.view_tickets || organization.team_members[0]?.role === 'owner'

    let allTeamMembers = null
    if (canViewTeam) {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          permissions,
          status,
          joined_at,
          user_id,
          users:user_id(email, id)
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active')

      allTeamMembers = teamMembers
    }

    // Get organization websites
    const { data: websites } = await supabase
      .from('websites')
      .select('id, name, domain, created_at')
      .eq('organization_id', orgId)

    return NextResponse.json({
      organization: {
        ...organization,
        hasTicketing: hasTicketingFeature(organization.plan_name),
        seatLimits: getSeatLimits(organization.plan_name),
        userRole: organization.team_members[0]?.role,
        userPermissions: organization.team_members[0]?.permissions,
        teamMembers: allTeamMembers,
        websites: websites || []
      }
    })

  } catch (error) {
    console.error('Organization fetch error:', error)
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

    const orgId = params.id
    const updates = await request.json()

    // Verify user has permission to update organization
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role, permissions')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only owners and admins with manage_team permission can update organization
    const canUpdate = teamMember.role === 'owner' ||
                     (teamMember.role === 'admin' && teamMember.permissions?.manage_team)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Filter allowed fields
    const allowedFields = ['name', 'description', 'settings']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(filteredUpdates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    return NextResponse.json({
      organization: {
        ...organization,
        hasTicketing: hasTicketingFeature(organization.plan_name),
        seatLimits: getSeatLimits(organization.plan_name)
      }
    })

  } catch (error) {
    console.error('Organization update error:', error)
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

    const orgId = params.id

    // Verify user is organization owner
    const { data: organization } = await supabase
      .from('organizations')
      .select('owner_id, name')
      .eq('id', orgId)
      .single()

    if (!organization || organization.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only organization owners can delete organizations' }, { status: 403 })
    }

    // Check if organization has any websites
    const { data: websites } = await supabase
      .from('websites')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)

    if (websites && websites.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete organization with existing websites. Please delete or transfer websites first.'
      }, { status: 400 })
    }

    // Delete organization (cascades to team_members, invites, etc.)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      console.error('Error deleting organization:', error)
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Organization deleted successfully' })

  } catch (error) {
    console.error('Organization deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}