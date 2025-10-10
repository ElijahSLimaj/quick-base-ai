import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withPlanGuard } from '@/lib/middleware/plan-guard'
import { subscriptionService } from '@/lib/billing/subscription'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')

    let query = supabase
      .from('websites')
      .select(`
        *,
        content(count),
        queries(count)
      `)
      .order('created_at', { ascending: false })

    if (organizationId) {
      // Filter by organization and verify user has access
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      query = query.eq('organization_id', organizationId)
    } else {
      // Default: filter by owner (backwards compatibility)
      query = query.eq('owner_id', user.id)
    }

    const { data: websites, error } = await query

    if (error) {
      console.error('Error fetching websites:', error)
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
    }

    return NextResponse.json({ websites })

  } catch (error) {
    console.error('Websites GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPlanGuard(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { name, domain } = await request.json()

      if (!name || !domain) {
        return NextResponse.json({ error: 'Name and domain are required' }, { status: 400 })
      }

      // Check if user belongs to an organization
      const { data: userMembership } = await supabase
        .from('team_members')
        .select('organization_id, organizations(plan_name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      let websiteData: any = {
        name,
        domain,
        owner_id: user.id,
        settings: {}
      }

      // If user belongs to an organization, link the website to it
      if (userMembership?.organization_id) {
        websiteData.organization_id = userMembership.organization_id
        websiteData.plan_name = userMembership.organizations?.plan_name || 'trial'
      }

      const { data: website, error } = await supabase
        .from('websites')
        .insert(websiteData)
        .select()
        .single()

      if (error) {
        console.error('Error creating website:', error)
        return NextResponse.json({ error: 'Failed to create website' }, { status: 500 })
      }

      // Auto-start trial for new users (if they don't have a subscription)
      try {
        await subscriptionService.startTrialForUser(website.id)
      } catch (trialError) {
        console.error('Error starting trial:', trialError)
        // Don't fail the website creation if trial setup fails
      }

      return NextResponse.json({ website })

    } catch (error) {
      console.error('Websites POST error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { action: 'create_website' }
)

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { websiteId } = await request.json()

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 })
    }

    // Verify the website belongs to the user before deleting
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('owner_id', user.id)
      .single()

    if (fetchError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Delete associated content and queries first (if needed)
    // Note: If you have foreign key constraints with CASCADE, this might not be necessary
    await supabase.from('content').delete().eq('website_id', websiteId)
    await supabase.from('queries').delete().eq('website_id', websiteId)

    // Delete the website
    const { error: deleteError } = await supabase
      .from('websites')
      .delete()
      .eq('id', websiteId)
      .eq('owner_id', user.id)

    if (deleteError) {
      console.error('Error deleting website:', deleteError)
      return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Websites DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
