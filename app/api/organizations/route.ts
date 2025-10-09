import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasTicketingFeature, getSeatLimits } from '@/lib/billing/plans'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organizations where user is owner or team member
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        *,
        team_members!inner(
          id,
          role,
          permissions,
          status
        )
      `)
      .eq('team_members.user_id', user.id)
      .eq('team_members.status', 'active')

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // Add computed fields
    const enrichedOrganizations = organizations?.map(org => ({
      ...org,
      hasTicketing: hasTicketingFeature(org.plan_name),
      seatLimits: getSeatLimits(org.plan_name),
      userRole: org.team_members[0]?.role,
      userPermissions: org.team_members[0]?.permissions
    })) || []

    return NextResponse.json({ organizations: enrichedOrganizations })

  } catch (error) {
    console.error('Organizations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, plan_name = 'enterprise' } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    // Validate plan supports organizations
    if (plan_name !== 'enterprise') {
      return NextResponse.json({
        error: 'Organizations are only available on Enterprise plans'
      }, { status: 400 })
    }

    const seatLimits = getSeatLimits(plan_name)

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        description,
        owner_id: user.id,
        plan_name,
        max_seats: seatLimits.maxSeats,
        seat_count: 1 // Will be set to 1 by trigger when owner is added as team member
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    return NextResponse.json({
      organization: {
        ...organization,
        hasTicketing: hasTicketingFeature(organization.plan_name),
        seatLimits,
        userRole: 'owner'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}