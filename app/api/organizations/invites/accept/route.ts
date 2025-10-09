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

    // Use the database function to accept the invitation
    const { data, error } = await supabase.rpc('accept_organization_invite', {
      invite_token: token,
      accepting_user_id: user.id
    })

    if (error) {
      console.error('Error accepting invitation:', error)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    const result = data as { success: boolean; error?: string; organization?: any; role?: string }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      organization: result.organization,
      role: result.role
    })

  } catch (error) {
    console.error('Invitation acceptance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}