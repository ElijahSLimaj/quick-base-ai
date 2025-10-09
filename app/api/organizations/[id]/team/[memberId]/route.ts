import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = params.id
    const memberId = params.memberId
    const updates = await request.json()

    // Verify user has permission to update team members
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

    // Get the target team member
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Permission checks
    const isOwner = userMembership.role === 'owner'
    const isAdmin = userMembership.role === 'admin' && userMembership.permissions?.manage_team
    const isSelfUpdate = targetMember.user_id === user.id

    // Only owners can update other owners/admins
    // Admins can update members
    // Users can update their own non-role fields
    const canUpdate = isOwner ||
                     (isAdmin && targetMember.role === 'member') ||
                     (isSelfUpdate && !updates.role)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Can't change owner role or demote yourself if you're the only owner
    if (updates.role) {
      if (targetMember.role === 'owner' && !isOwner) {
        return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 })
      }

      if (isSelfUpdate && userMembership.role === 'owner') {
        // Check if there are other owners
        const { data: ownerCount } = await supabase
          .from('team_members')
          .select('id')
          .eq('organization_id', orgId)
          .eq('role', 'owner')
          .eq('status', 'active')

        if (ownerCount && ownerCount.length <= 1) {
          return NextResponse.json({
            error: 'Cannot change role. Organization must have at least one owner.'
          }, { status: 400 })
        }
      }
    }

    // Filter allowed fields
    const allowedFields = ['role', 'permissions', 'status']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updatedMember, error } = await supabase
      .from('team_members')
      .update(filteredUpdates)
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .select(`
        id,
        user_id,
        role,
        permissions,
        status,
        joined_at,
        users:user_id(email, id)
      `)
      .single()

    if (error) {
      console.error('Error updating team member:', error)
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
    }

    return NextResponse.json({ teamMember: updatedMember })

  } catch (error) {
    console.error('Team member update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = params.id
    const memberId = params.memberId

    // Verify user has permission to remove team members
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

    // Get the target team member
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const isOwner = userMembership.role === 'owner'
    const isAdmin = userMembership.role === 'admin' && userMembership.permissions?.manage_team
    const isSelfRemoval = targetMember.user_id === user.id

    // Permission checks
    const canRemove = isOwner ||
                     (isAdmin && targetMember.role === 'member') ||
                     isSelfRemoval

    if (!canRemove) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Can't remove the last owner
    if (targetMember.role === 'owner') {
      const { data: ownerCount } = await supabase
        .from('team_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('role', 'owner')
        .eq('status', 'active')

      if (ownerCount && ownerCount.length <= 1) {
        return NextResponse.json({
          error: 'Cannot remove the last owner. Transfer ownership first.'
        }, { status: 400 })
      }
    }

    // Remove team member
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Team member removed successfully' })

  } catch (error) {
    console.error('Team member removal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}