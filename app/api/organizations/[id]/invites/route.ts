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
    const permissions = userMembership.permissions as { manage_team?: boolean } | null
    const canViewInvites = userMembership.role === 'owner' ||
                          (userMembership.role === 'admin' && permissions?.manage_team)

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

    const orgId = params.id
    const { email, role, message } = await request.json()

    // Validate input
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const validRoles = ['admin', 'member']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

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

    // Only owners and admins can invite
    const invitePermissions = userMembership.permissions as { manage_team?: boolean } | null
    const canInvite = userMembership.role === 'owner' ||
                     (userMembership.role === 'admin' && invitePermissions?.manage_team)

    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get organization details for invitation
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, seat_count, max_seats')
      .eq('id', orgId)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if there are available seats
    if ((organization.seat_count || 0) >= (organization.max_seats || 0)) {
      return NextResponse.json({
        error: 'No available seats. Upgrade your plan to add more team members.'
      }, { status: 403 })
    }

    // Check if user is already a member or has pending invitation
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', email)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
    }

    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
    }

    // Generate secure invitation token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Set default permissions based on role
    const permissions = {
      view_tickets: true,
      create_tickets: role === 'admin',
      manage_tickets: role === 'admin',
      view_analytics: role === 'admin',
      manage_team: role === 'admin',
      manage_billing: false // Only owners get billing access
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        email,
        role,
        permissions,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        message,
        status: 'pending'
      })
      .select(`
        id,
        email,
        role,
        permissions,
        status,
        expires_at,
        invited_at,
        message,
        token,
        invited_by,
        inviter:invited_by(email, id)
      `)
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Send invitation email
    try {
      const { data: inviterUser } = await supabase.auth.getUser()
      const inviterEmail = inviterUser.user?.email

      await emailService.sendTeamInvitation({
        organizationName: organization.name,
        inviterName: inviterEmail?.split('@')[0] || 'Team Admin',
        inviterEmail: inviterEmail || user.email || '',
        inviteToken: inviteToken,
        role: role,
        expiresAt: expiresAt.toISOString()
      }, email)

      console.log('Team invitation email sent', {
        organizationId: orgId,
        inviteeEmail: email,
        role: role
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the invitation creation if email fails
    }

    return NextResponse.json({
      invitation: {
        ...invitation,
        token: undefined // Don't send token back for security
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}