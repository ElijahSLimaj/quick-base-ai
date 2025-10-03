import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: websites, error } = await supabase
      .from('websites')
      .select(`
        *,
        content(count),
        queries(count)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching websites:', error)
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
    }

    return NextResponse.json({ projects: websites })

  } catch (error) {
    console.error('Projects GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const { data: website, error } = await supabase
      .from('websites')
      .insert({
        name,
        domain,
        owner_id: user.id,
        settings: {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating website:', error)
      return NextResponse.json({ error: 'Failed to create website' }, { status: 500 })
    }

    return NextResponse.json({ project: website })

  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify the website belongs to the user before deleting
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (fetchError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Delete associated content and queries first (if needed)
    // Note: If you have foreign key constraints with CASCADE, this might not be necessary
    await supabase.from('content').delete().eq('website_id', projectId)
    await supabase.from('queries').delete().eq('website_id', projectId)

    // Delete the website
    const { error: deleteError } = await supabase
      .from('websites')
      .delete()
      .eq('id', projectId)
      .eq('owner_id', user.id)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Projects DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
