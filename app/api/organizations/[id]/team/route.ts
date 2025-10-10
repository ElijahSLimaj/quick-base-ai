import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSeatLimits } from '@/lib/billing/plans'

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

    // Get all team members with user details
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        permissions,
        status,
        invited_by,
        invited_at,
        joined_at,
        created_at,
        users:user_id(email, id)
      `)
      .eq('organization_id', orgId)
      .order('created_at')

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get organization seat limits
    const { data: organization } = await supabase
      .from('organizations')
      .select('plan_name, seat_count, max_seats')
      .eq('id', orgId)
      .single()

    const seatLimits = getSeatLimits(organization?.plan_name || 'enterprise')

    return NextResponse.json({
      teamMembers: teamMembers || [],
      seatLimits,
      currentSeats: organization?.seat_count || 0,
      maxSeats: organization?.max_seats || seatLimits.maxSeats
    })

  } catch (error) {
    console.error('Team members fetch error:', error)
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
    const { email, role = 'member', permissions, message } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Verify user has permission to invite team members
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

    const teamPermissions = userMembership.permissions as { manage_team?: boolean } | null
    const canInvite = userMembership.role === 'owner' ||
                     (userMembership.role === 'admin' && teamPermissions?.manage_team)

    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions to invite team members' }, { status: 403 })
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvite) {
      return NextResponse.json({
        error: 'A pending invitation already exists for this email'
      }, { status: 409 })
    }

    // Check seat limits
    const { data: organization } = await supabase
      .from('organizations')
      .select('seat_count, max_seats, plan_name')
      .eq('id', orgId)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const seatLimits = getSeatLimits(organization.plan_name)
    const wouldExceedLimit = (organization.seat_count || 0) >= seatLimits.maxSeats

    if (wouldExceedLimit) {
      return NextResponse.json({
        error: `Cannot invite more members. Organization has reached its seat limit of ${seatLimits.maxSeats}.`,
        seatLimit: seatLimits.maxSeats,
        currentSeats: organization.seat_count
      }, { status: 400 })
    }

    // Generate invitation token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        email,
        role: role === 'owner' ? 'admin' : role, // Can't invite as owner
        permissions,
        invited_by: user.id,
        message,
        token: inviteToken,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // TODO: Send invitation email here
    // await sendInvitationEmail(invitation)

    return NextResponse.json({
      invitation,
      message: 'Invitation sent successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Team invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}