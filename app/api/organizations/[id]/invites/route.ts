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

    const orgId = params.id

    // Verify user has access to this organization
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('role, permissions')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!userMembership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only owners and admins can view invites
    const canViewInvites = userMembership.role === 'owner' ||
                          (userMembership.role === 'admin' && userMembership.permissions?.manage_team)

    if (!canViewInvites) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get pending invitations
    const { data: invites, error } = await supabase
      .from('organization_invites')
      .select(`
        id,
        email,
        role,
        permissions,
        status,
        expires_at,
        invited_at,
        message,
        invited_by,
        inviter:invited_by(email, id)
      `)
      .eq('organization_id', orgId)
      .order('invited_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invites: invites || [] })

  } catch (error) {
    console.error('Invitations fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}