import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    // Find and validate the invitation
    const { data: invite, error: findError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if invitation has expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Accept the invitation by creating team membership and updating invite
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
        permissions: invite.permissions,
        invited_by: invite.invited_by,
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error creating team membership:', memberError)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('organization_invites')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
    }

    // Get organization details for response
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, plan_name')
      .eq('id', invite.organization_id)
      .single()

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      organization,
      role: invite.role
    })

  } catch (error) {
    console.error('Invitation acceptance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}